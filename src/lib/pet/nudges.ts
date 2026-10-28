export const SCROLL_THRESHOLD_PX = 5000;
export const NUDGE_COOLDOWN_MS = 10 * 60_000;
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
];

export const HUNGRY_NUDGES = [
  'I’m a little peckish. Whenever you’ve got a post in you, no rush.',
  'If something here sparked an idea, jot it down. Ideas are snacks too.',
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

/** Sums scroll distance and reports when it crosses the threshold, then starts over */
export function createScrollMeter(thresholdPx = SCROLL_THRESHOLD_PX) {
  let total = 0;
  return {
    add(px: number): boolean {
      total += Math.min(Math.abs(px), MAX_STEP_PX);
      if (total < thresholdPx) return false;
      total = 0;
      return true;
    },
    reset: () => void (total = 0),
  };
}

export const canNudge = (lastNudgeAt: number | undefined, now: number, cooldownMs = NUDGE_COOLDOWN_MS) =>
  lastNudgeAt === undefined || now - lastNudgeAt >= cooldownMs;
