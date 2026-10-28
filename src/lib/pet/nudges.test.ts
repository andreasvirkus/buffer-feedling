import { describe, expect, it } from 'vitest';
import { MAX_STEP_PX, NUDGES, HUNGRY_NUDGES, SCROLL_MAX_PX, canNudge, createBag, createScrollMeter, thresholdFor } from './nudges';

describe('createBag', () => {
  it('serves every line before repeating', () => {
    const next = createBag(['a', 'b', 'c'], () => 0.3);
    expect([next(), next(), next()].sort()).toEqual(['a', 'b', 'c']);
  });
  it('never repeats a line back to back across refills', () => {
    for (const r of [0, 0.3, 0.99]) {
      const next = createBag(['a', 'b', 'c'], () => r);
      let prev = next();
      for (let i = 0; i < 30; i++) {
        const cur = next();
        expect(cur).not.toBe(prev);
        prev = cur;
      }
    }
  });
  it('copes with a single line and none', () => {
    expect(createBag(['only'])()).toBe('only');
    expect(createBag([])()).toBeUndefined();
  });
});

describe('thresholdFor', () => {
  it('starts low and grows each time', () => {
    expect(thresholdFor(0)).toBe(3000);
    expect(thresholdFor(1)).toBe(4500);
    expect(thresholdFor(2)).toBe(6750);
  });
  it('levels off', () => expect(thresholdFor(50)).toBe(SCROLL_MAX_PX));
});

describe('createScrollMeter', () => {
  it('fires once the distance adds up, then starts over', () => {
    const m = createScrollMeter(() => 1000);
    expect(m.add(400)).toBe(false);
    expect(m.add(-400)).toBe(false);
    expect(m.add(300)).toBe(true);
    expect(m.add(10)).toBe(false);
  });
  it('needs more scrolling after each shown nudge', () => {
    const m = createScrollMeter((n) => 1000 * (n + 1));
    expect(m.add(1000)).toBe(true);
    m.escalate();
    expect(m.add(1000)).toBe(false);
    expect(m.add(1000)).toBe(true);
  });
  it('stays at the same distance when a nudge was not shown', () => {
    const m = createScrollMeter((n) => 1000 * (n + 1));
    expect(m.add(1000)).toBe(true);
    expect(m.add(1000)).toBe(true);
  });
  it('caps a single jump', () => {
    const m = createScrollMeter(() => MAX_STEP_PX * 2);
    expect(m.add(100_000)).toBe(false);
    expect(m.add(100_000)).toBe(true);
  });
  it('reset clears progress', () => {
    const m = createScrollMeter(() => 1000);
    m.add(900);
    m.reset();
    expect(m.add(200)).toBe(false);
  });
});

describe('canNudge', () => {
  it('allows the first nudge', () => expect(canNudge(undefined, 0)).toBe(true));
  it('waits out the cooldown', () => {
    expect(canNudge(1_000, 1_000 + 29_999)).toBe(false);
    expect(canNudge(1_000, 1_000 + 30_000)).toBe(true);
  });
});

describe('copy', () => {
  it('has no empty or duplicate lines', () => {
    const all = [...NUDGES, ...HUNGRY_NUDGES];
    expect(all.every((l) => l.trim().length > 0)).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });
});
