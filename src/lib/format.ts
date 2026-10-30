const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 hours ago", "yesterday": roughly, not to the minute */
export function timeAgo(then: number, now: number): string {
  const d = Math.max(now - then, 0);
  if (d < MIN) return 'just now';
  if (d < HOUR) return `${Math.round(d / MIN)} min ago`;
  if (d < DAY) return `${plural(Math.round(d / HOUR), 'hour')} ago`;
  if (d < 2 * DAY) return 'yesterday';
  return `${Math.floor(d / DAY)} days ago`;
}

/** "in 25 min", "in 3h", "tomorrow" */
export function timeUntil(then: number, now: number): string {
  const d = then - now;
  if (d <= MIN) return 'any moment now';
  if (d < HOUR) return `in ${Math.round(d / MIN)} min`;
  if (d < DAY) return `in ${Math.round(d / HOUR)}h`;
  if (d < 2 * DAY) return 'tomorrow';
  return `in ${Math.floor(d / DAY)} days`;
}
