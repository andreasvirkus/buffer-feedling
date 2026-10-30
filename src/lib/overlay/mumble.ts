type Range = readonly [number, number];

// Walking sounds should read as the odd mumble, not a sound on every step
export const FIRST_DELAY_MS: Range = [250, 600]; // so a quick tap of a key stays silent
export const PAUSE_MS: Range = [900, 2600]; // silence between mumbles, after one has finished
export const RATE: Range = [0.85, 1]; // natural speed or a little lower, never faster
export const PHRASE_CHANCE = 0.25; // now and then the whole three-step phrase instead of a single step

const between = (random: () => number, [lo, hi]: Range) => lo + random() * (hi - lo);

export interface Mumble {
  kind: 'step' | 'phrase';
  rate: number;
  /** Silence to leave once this one has finished */
  pauseMs: number;
}

export function createMumbler(random: () => number = Math.random) {
  return {
    first: () => between(random, FIRST_DELAY_MS),
    next: (): Mumble => ({
      kind: random() < PHRASE_CHANCE ? 'phrase' : 'step',
      rate: between(random, RATE),
      pauseMs: between(random, PAUSE_MS),
    }),
  };
}
