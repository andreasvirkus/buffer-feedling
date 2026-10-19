import { describe, expect, it } from 'vitest';
import { computePetState, displayMood, EATING_MS, SLEEPY_AFTER_MS, type PetInputs } from './state';

const NOW = Date.UTC(2026, 9, 20, 12);
const base: PetInputs = {
  now: NOW,
  goals: [],
  sentLast7d: 0,
  scheduledPosts: 0,
  draftsToday: 0,
  ideasToday: 0,
  lastActivityAt: NOW - 3600_000,
  connectedAt: NOW,
  services: [],
};
const run = (o: Partial<PetInputs>) => computePetState({ ...base, ...o });
const goal = (goal: number, sentCount: number, scheduledCount = 0) => ({ goal, sentCount, scheduledCount });

describe('fullness', () => {
  it('sums sent over goal across channels with a goal', () => {
    const s = run({ goals: [goal(2, 1), goal(3, 2)] });
    expect(s.fullness).toBeCloseTo(3 / 5);
    expect([s.sent, s.target]).toEqual([3, 5]);
  });
  it('ignores zero-goal entries', () => {
    expect(run({ goals: [goal(0, 5), goal(2, 1)] }).fullness).toBeCloseTo(0.5);
  });
  it('falls back to 7-day sends against a target of 3 when no goals exist', () => {
    const s = run({ sentLast7d: 1 });
    expect(s.fullness).toBeCloseTo(1 / 3);
    expect(s.target).toBe(3);
  });
  it('does not use the fallback when any goal exists', () => {
    expect(run({ goals: [goal(4, 0)], sentLast7d: 9 }).fullness).toBe(0);
  });
  it('clamps to 1', () => {
    expect(run({ goals: [goal(1, 5)] }).fullness).toBe(1);
  });
});

describe('snacks (drafts)', () => {
  it('add 0.05 each', () => {
    expect(run({ goals: [goal(10, 0)], draftsToday: 2 }).fullness).toBeCloseTo(0.1);
  });
  it('cap at +0.15', () => {
    expect(run({ goals: [goal(10, 0)], draftsToday: 9 }).fullness).toBeCloseTo(0.15);
  });
  it('are reported as snacksToday', () => {
    expect(run({ draftsToday: 4 }).snacksToday).toBe(4);
  });
});

describe('treats (ideas)', () => {
  it('are cosmetic: no fullness change', () => {
    const s = run({ goals: [goal(10, 0)], ideasToday: 7 });
    expect(s.fullness).toBe(0);
    expect(s.treats).toBe(7);
  });
});

describe('fridge', () => {
  it('sums scheduledCount over goals', () => {
    expect(run({ goals: [goal(5, 0, 2), goal(5, 0, 1)] }).fridge).toBe(3);
  });
  it('uses scheduled posts when there are no goals', () => {
    expect(run({ scheduledPosts: 4 }).fridge).toBe(4);
  });
  it('keeps the mood at content even when nothing was sent', () => {
    expect(run({ goals: [goal(5, 0, 1)] }).mood).toBe('content');
  });
  it('keeps a long-idle pet calm', () => {
    expect(run({ goals: [goal(5, 0, 1)], lastActivityAt: null }).mood).toBe('content');
  });
});

describe('mood', () => {
  it('full at fullness >= 1', () => {
    expect(run({ goals: [goal(2, 2)] }).mood).toBe('full');
  });
  it('content at fullness >= 0.4', () => {
    expect(run({ goals: [goal(5, 2)] }).mood).toBe('content');
  });
  it('hungry below 0.4 with recent activity and nothing scheduled', () => {
    expect(run({ goals: [goal(5, 1)] }).mood).toBe('hungry');
  });
  it('sleepy with no activity for 3+ days', () => {
    expect(run({ goals: [goal(5, 0)], lastActivityAt: NOW - SLEEPY_AFTER_MS }).mood).toBe('sleepy');
  });
  it('not sleepy just inside 3 days', () => {
    expect(run({ goals: [goal(5, 0)], lastActivityAt: NOW - SLEEPY_AFTER_MS + 1 }).mood).toBe('hungry');
  });
  it('sleepy when there has never been any activity', () => {
    expect(run({ lastActivityAt: null }).mood).toBe('sleepy');
  });
  it('full beats sleepy', () => {
    expect(run({ goals: [goal(1, 1)], lastActivityAt: null }).mood).toBe('full');
  });
  it('never stores eating as the base mood', () => {
    expect(run({ goals: [goal(1, 1)], lastFedAt: NOW - 1000 }).mood).toBe('full');
  });
});

describe('displayMood', () => {
  const fed = (ago: number) => run({ goals: [goal(5, 1)], lastFedAt: NOW - ago });
  it('shows eating for 5s after a feed, even over full', () => {
    expect(displayMood(fed(EATING_MS - 1), NOW)).toBe('eating');
    expect(displayMood(run({ goals: [goal(1, 1)], lastFedAt: NOW - 1000 }), NOW)).toBe('eating');
  });
  it('falls back to the stored mood once the window passes', () => {
    expect(displayMood(fed(EATING_MS), NOW)).toBe('hungry');
  });
  it('shows the stored mood when never fed', () => {
    expect(displayMood(run({ goals: [goal(5, 1)] }), NOW)).toBe('hungry');
  });
});

describe('metadata', () => {
  it('computes age in whole days', () => {
    expect(run({ connectedAt: NOW - 3.5 * 24 * 3600_000 }).age).toBe(3);
    expect(run({ connectedAt: null }).age).toBe(0);
  });
  it('dedupes services', () => {
    expect(run({ services: ['twitter', 'twitter', 'linkedin'] }).connectedServices).toEqual(['twitter', 'linkedin']);
  });
  it('stamps updatedAt and lastFedAt as ISO strings', () => {
    const s = run({ lastFedAt: NOW - 60_000 });
    expect(s.updatedAt).toBe(new Date(NOW).toISOString());
    expect(s.lastFedAt).toBe(new Date(NOW - 60_000).toISOString());
  });
});
