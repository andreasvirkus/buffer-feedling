import { describe, expect, it } from 'vitest';
import { timeAgo, timeUntil } from './format';

const NOW = Date.UTC(2026, 9, 31, 12);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  it('is "just now" within a minute', () => expect(timeAgo(NOW - 30_000, NOW)).toBe('just now'));
  it('counts minutes', () => expect(timeAgo(NOW - 12 * MIN, NOW)).toBe('12 min ago'));
  it('counts hours, singular and plural', () => {
    expect(timeAgo(NOW - HOUR, NOW)).toBe('1 hour ago');
    expect(timeAgo(NOW - 5 * HOUR, NOW)).toBe('5 hours ago');
  });
  it('says yesterday for the day before', () => expect(timeAgo(NOW - 30 * HOUR, NOW)).toBe('yesterday'));
  it('counts whole days after that', () => expect(timeAgo(NOW - 4 * DAY - 2 * HOUR, NOW)).toBe('4 days ago'));
  it('never goes negative for a clock that is a little off', () => expect(timeAgo(NOW + 5 * MIN, NOW)).toBe('just now'));
});

describe('timeUntil', () => {
  it('says any moment now when it is due or overdue', () => {
    expect(timeUntil(NOW + 30_000, NOW)).toBe('any moment now');
    expect(timeUntil(NOW - HOUR, NOW)).toBe('any moment now');
  });
  it('counts minutes', () => expect(timeUntil(NOW + 25 * MIN, NOW)).toBe('in 25 min'));
  it('counts hours', () => expect(timeUntil(NOW + 3 * HOUR, NOW)).toBe('in 3h'));
  it('says tomorrow within two days', () => expect(timeUntil(NOW + 30 * HOUR, NOW)).toBe('tomorrow'));
  it('counts whole days after that', () => expect(timeUntil(NOW + 3 * DAY + 5 * HOUR, NOW)).toBe('in 3 days'));
});
