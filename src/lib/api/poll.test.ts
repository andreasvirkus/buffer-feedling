import { describe, expect, it } from 'vitest';
import { pollVariables, toPetInputs, type PollData } from './poll';

const NOW = new Date(2026, 9, 20, 15).getTime();
const HOUR = 3600_000;
const iso = (t: number) => new Date(t).toISOString();

const empty = (): PollData => ({
  channels: [],
  sent: { edges: [] },
  recent: { edges: [] },
  scheduled: { edges: [] },
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
    d.scheduled.edges = [{ node: { id: 'a' } }, { node: { id: 'b' } }];
    expect(toPetInputs(d, ctx).scheduledPosts).toBe(2);
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
