import { describe, expect, it } from 'vitest';
import { detectFeed, pollVariables, toPetInputs, type PollData } from './poll';

const NOW = new Date(2026, 9, 20, 15).getTime();
const HOUR = 3600_000;
const iso = (t: number) => new Date(t).toISOString();

const empty = (): PollData => ({
  channels: [],
  sent: { edges: [] },
  recent: { edges: [] },
  scheduled: { edges: [] },
  lastSent: { edges: [] },
  ideas: { edges: [] },
});
const ctx = { now: NOW, connectedAt: null };

describe('toPetInputs', () => {
  it('ignores disconnected channels and startPage, keeps goals of live ones', () => {
    const d = empty();
    d.channels = [
      { service: 'twitter', isDisconnected: false, postingGoal: { goal: 2, sentCount: 1, scheduledCount: 0 } },
      { service: 'linkedin', isDisconnected: true, postingGoal: { goal: 9, sentCount: 0, scheduledCount: 0 } },
      { service: 'startPage', isDisconnected: false, postingGoal: null },
      { service: 'bluesky', isDisconnected: false, postingGoal: null },
    ];
    const i = toPetInputs(d, ctx);
    expect(i.goals).toEqual([{ goal: 2, sentCount: 1, scheduledCount: 0 }]);
    expect(i.services).toEqual(['twitter', 'bluesky']);
  });

  it('counts only drafts created since local midnight', () => {
    const d = empty();
    d.recent.edges = [
      { node: { status: 'draft', createdAt: iso(NOW - HOUR) } },
      { node: { status: 'draft', createdAt: iso(NOW - 30 * HOUR) } },
      { node: { status: 'scheduled', createdAt: iso(NOW - HOUR) } },
    ];
    expect(toPetInputs(d, ctx).draftsToday).toBe(1);
  });

  it('reads idea timestamps as unix seconds', () => {
    const d = empty();
    d.ideas.edges = [{ node: { createdAt: Math.floor((NOW - HOUR) / 1000) } }, { node: { createdAt: 1_700_000_000 } }];
    const i = toPetInputs(d, ctx);
    expect(i.ideasToday).toBe(1);
    expect(i.lastActivityAt).toBe(Math.floor((NOW - HOUR) / 1000) * 1000);
  });

  it('counts sent posts from the last 7 days and takes the latest activity', () => {
    const d = empty();
    d.sent.edges = [{ node: { sentAt: iso(NOW - 2 * HOUR) } }, { node: { sentAt: iso(NOW - 9 * 24 * HOUR) } }, { node: { sentAt: null } }];
    d.recent.edges = [{ node: { status: 'scheduled', createdAt: iso(NOW - 5 * HOUR) } }];
    const i = toPetInputs(d, ctx);
    expect(i.sentLast7d).toBe(1);
    expect(i.lastActivityAt).toBe(NOW - 2 * HOUR);
  });

  it('reports no activity for an empty account', () => {
    expect(toPetInputs(empty(), ctx).lastActivityAt).toBeNull();
  });

  it('counts scheduled posts for the fridge fallback', () => {
    const d = empty();
    d.scheduled.edges = [{ node: { id: 'a', dueAt: null } }, { node: { id: 'b', dueAt: null } }];
    expect(toPetInputs(d, ctx).scheduledPosts).toBe(2);
  });

  it('finds the soonest scheduled post', () => {
    const d = empty();
    d.scheduled.edges = [
      { node: { id: 'a', dueAt: new Date(NOW + 5 * HOUR).toISOString() } },
      { node: { id: 'b', dueAt: new Date(NOW + 2 * HOUR).toISOString() } },
    ];
    expect(toPetInputs(d, ctx).nextScheduledAt).toBe(NOW + 2 * HOUR);
  });

  it('has no next time when nothing is scheduled or the time is missing', () => {
    expect(toPetInputs(empty(), ctx).nextScheduledAt).toBeNull();
    const d = empty();
    d.scheduled.edges = [{ node: { id: 'a', dueAt: null } }];
    expect(toPetInputs(d, ctx).nextScheduledAt).toBeNull();
  });

  it('reads the last sent post even when it is older than the 7 day window', () => {
    const d = empty();
    d.lastSent.edges = [{ node: { sentAt: new Date(NOW - 20 * 24 * HOUR).toISOString() } }];
    const i = toPetInputs(d, ctx);
    expect(i.lastSentAt).toBe(NOW - 20 * 24 * HOUR);
    expect(i.sentLast7d).toBe(0);
  });

  it('has no last sent time for an account that never sent', () => expect(toPetInputs(empty(), ctx).lastSentAt).toBeNull());

  it('counts the ideas waiting', () => {
    const d = empty();
    d.ideas.edges = [{ node: { createdAt: 1 } }, { node: { createdAt: 2 } }, { node: { createdAt: 3 } }];
    expect(toPetInputs(d, ctx).ideasWaiting).toBe(3);
  });
});

describe('pollVariables', () => {
  it('looks back 7 days for sends and 3 for creations', () => {
    const v = pollVariables(NOW, 'org1');
    expect(v.org).toBe('org1');
    expect(Date.parse(v.sentSince)).toBe(NOW - 7 * 24 * HOUR);
    expect(Date.parse(v.createdSince)).toBe(NOW - 3 * 24 * HOUR);
  });
});

describe('detectFeed', () => {
  it('fires only when something newer than the last poll appears', () => {
    expect(detectFeed(100, 101)).toBe(true);
    expect(detectFeed(100, 100)).toBe(false);
    expect(detectFeed(100, 50)).toBe(false);
  });
  it('never fires on the first poll or with no activity', () => {
    expect(detectFeed(undefined, 101)).toBe(false);
    expect(detectFeed(100, null)).toBe(false);
  });
});
