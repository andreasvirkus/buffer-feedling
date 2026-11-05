export const SCROLL_BASE_PX = 3000;
export const SCROLL_GROWTH = 1.5;
export const SCROLL_MAX_PX = 20_000;
// Only stops several tabs speaking at once; the growing distance does the pacing
export const NUDGE_COOLDOWN_MS = 30_000;
// A jump (Home, "back to top") shouldn't count as a long scroll
export const MAX_STEP_PX = 1500;

export const NUDGES = [
  'Saw anything you’d want to share with others?',
  'Let’s pause and reflect on what we’ve consumed.',
  'Did that last stretch feed you, or just fill you?',
  'Shoulders down, jaw unclenched. Sip of water?',
  'Look at something far away for a moment. Your eyes will thank you.',
  'Stretch break? I’ll be right here.',
  'That’s a fair bit of scrolling. No judgement, just a gentle hello.',
  'You’ve come a long way down the page. Want to come up for air?',
  'Is there something you’d rather make than scroll? I’d happily watch.',
  'What’s one thing you learned in the last few minutes? Say it out loud, it sticks.',
  'Anything here worth passing along? A good post starts as a small thought.',
  'How’s your brain feeling: full, or snacking on crumbs?',
  'Blink slowly, twice. There, eyes rewetted.',
  'Roll your shoulders back. Mine are tiny and they feel better already.',
  'One deep breath in, one slow one out. The page will wait.',
  'Remember why you opened this tab? If yes, lovely. If not, that’s allowed too.',
  'The feed never ends, which is exactly why you get to.',
  'Loosen your grip on the mouse a little. Wiggle your toes while you’re at it.',
  'Look out of a window if you’ve got one. Trees count double.',
  'Did anything in that stretch make you smile? Keep that one.',
  'Quick check: eyes, back, belly. Anyone asking for something?',
  'Sprouts grow best with a bit of daylight. So do people.',
  'Scrolling is a river. You’re allowed to step onto the bank.',
  'A sip of tea and the page will still be right here.',
  'Someone you like might enjoy a hello more than another scroll.',
  'What would you like to do next? Not what the feed suggests. You.',
];

export const HUNGRY_NUDGES = [
  'I’m a little peckish. Whenever you’ve got a post in you, no rush.',
  'If something here sparked an idea, jot it down. Ideas are snacks too.',
  'Somewhere in all that scrolling, a thought of yours is waiting. Feed me?',
];

/** Shuffle bag: every line once before any repeats, and never the same line twice in a row */
export function createBag(lines: readonly string[], random: () => number = Math.random) {
  let queue: string[] = [];
  let last: string | undefined;

  const refill = () => {
    queue = [...lines];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [queue[i], queue[j]] = [queue[j]!, queue[i]!];
    }
    if (queue.length > 1 && queue[queue.length - 1] === last) {
      [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1]!, queue[0]!];
    }
  };

  return (): string | undefined => {
    if (!lines.length) return undefined;
    if (!queue.length) refill();
    last = queue.pop();
    return last;
  };
}

/** Distance needed for the nth nudge: frequent at first, then easing off */
export const thresholdFor = (shown: number) => Math.min(SCROLL_BASE_PX * SCROLL_GROWTH ** shown, SCROLL_MAX_PX);

/** Sums scroll distance and reports when it crosses the current threshold, then starts over */
export function createScrollMeter(threshold: (shown: number) => number = thresholdFor) {
  let total = 0;
  let shown = 0;
  return {
    add(px: number): boolean {
      total += Math.min(Math.abs(px), MAX_STEP_PX);
      if (total < threshold(shown)) return false;
      total = 0;
      return true;
    },
    /** Call when a nudge was actually shown, so the next one needs more scrolling */
    escalate: () => void shown++,
    reset: () => void (total = 0),
  };
}

export const canNudge = (lastNudgeAt: number | undefined, now: number, cooldownMs = NUDGE_COOLDOWN_MS) =>
  lastNudgeAt === undefined || now - lastNudgeAt >= cooldownMs;
