import { describe, expect, it } from 'vitest';
import { FIRST_DELAY_MS, PAUSE_MS, PHRASE_CHANCE, RATE, createMumbler } from './mumble';

const fixed = (n: number) => () => n;

describe('createMumbler', () => {
  it('waits a moment before the first mumble, so a quick tap stays silent', () => {
    expect(createMumbler(fixed(0)).first()).toBe(FIRST_DELAY_MS[0]);
    expect(createMumbler(fixed(0.999)).first()).toBeLessThan(FIRST_DELAY_MS[1]);
    expect(FIRST_DELAY_MS[0]).toBeGreaterThan(0);
  });

  it('leaves real silence between mumbles', () => {
    expect(createMumbler(fixed(0)).next().pauseMs).toBe(PAUSE_MS[0]);
    expect(PAUSE_MS[0]).toBeGreaterThanOrEqual(900);
    expect(createMumbler(fixed(0.999)).next().pauseMs).toBeLessThanOrEqual(PAUSE_MS[1]);
  });

  it('never plays faster than natural speed', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const { rate } = createMumbler(fixed(r)).next();
      expect(rate).toBeGreaterThanOrEqual(RATE[0]);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });

  it('mostly single steps, sometimes the whole phrase', () => {
    expect(createMumbler(fixed(PHRASE_CHANCE - 0.01)).next().kind).toBe('phrase');
    expect(createMumbler(fixed(PHRASE_CHANCE + 0.01)).next().kind).toBe('step');
  });

  it('is varied, not a metronome', () => {
    let n = 0;
    const m = createMumbler(() => ((n += 0.37) % 1));
    const pauses = new Set(Array.from({ length: 6 }, () => Math.round(m.next().pauseMs)));
    expect(pauses.size).toBeGreaterThan(3);
  });
});
