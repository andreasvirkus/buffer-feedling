import { describe, expect, it } from 'vitest';
import { factLines, targetNote } from './facts';
import type { PetState } from './state';

const NOW = Date.UTC(2026, 9, 31, 12);
const HOUR = 3600_000;

const state = (o: Partial<PetState> = {}): PetState => ({
  mood: 'hungry',
  fullness: 0.33,
  fridge: 0,
  snacksToday: 0,
  treats: 0,
  sent: 1,
  target: 3,
  age: 1,
  hasGoals: false,
  ideasWaiting: 0,
  connectedServices: [],
  updatedAt: new Date(NOW).toISOString(),
  ...o,
});
const iso = (ms: number) => new Date(ms).toISOString();

describe('factLines', () => {
  it('says how long ago the last post was', () =>
    expect(factLines(state({ lastSentAt: iso(NOW - 2 * 24 * HOUR - HOUR) }), NOW)[0]).toBe('Last post 2 days ago'));
  it('says so when nothing has ever been sent', () => expect(factLines(state(), NOW)[0]).toBe('No posts sent yet'));
  it('shows the queue and when the next post goes out', () =>
    expect(factLines(state({ fridge: 2, nextDueAt: iso(NOW + 3 * HOUR) }), NOW)).toContain('2 scheduled · next in 3h'));
  it('still counts the queue without a next time', () => expect(factLines(state({ fridge: 1 }), NOW)).toContain('1 scheduled'));
  it('says plainly when nothing is scheduled', () => expect(factLines(state(), NOW)).toContain('Nothing scheduled'));
  it('mentions ideas only when there are some', () => {
    expect(factLines(state(), NOW).some((l) => l.includes('idea'))).toBe(false);
    expect(factLines(state({ ideasWaiting: 1 }), NOW)).toContain('1 idea waiting');
    expect(factLines(state({ ideasWaiting: 5 }), NOW)).toContain('5 ideas waiting');
  });
  it('does not claim an exact count once the fetch limit is reached', () =>
    expect(factLines(state({ ideasWaiting: 20 }), NOW)).toContain('20+ ideas waiting'));
  it('never shows more than three lines', () =>
    expect(factLines(state({ fridge: 3, ideasWaiting: 9, lastSentAt: iso(NOW) }), NOW)).toHaveLength(3));
});

describe('targetNote', () => {
  it('explains the default target', () => expect(targetNote(state())).toBe('No posting goal set, so I aim for 3 a week'));
  it('says when goals are in use', () => expect(targetNote(state({ hasGoals: true }))).toBe('Measured against your posting goals'));
  it('mentions drafts, singular and plural', () => {
    expect(targetNote(state({ snacksToday: 1 }))).toContain('A draft today counts a little too');
    expect(targetNote(state({ snacksToday: 2 }))).toContain('2 drafts today count a little too');
  });
});
