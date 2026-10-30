import { timeAgo, timeUntil } from '../format';
import { DEFAULT_WEEKLY_TARGET, type PetState } from './state';

// The poll only asks for this many ideas, so this is where "N waiting" stops being exact
export const IDEAS_FETCHED = 20;

/** The few plain-language lines under the fullness bar. Lines with nothing to say are left out. */
export function factLines(s: PetState, now: number): string[] {
  const lines: string[] = [];

  lines.push(s.lastSentAt ? `Last post ${timeAgo(Date.parse(s.lastSentAt), now)}` : 'No posts sent yet');

  if (s.fridge > 0) {
    const next = s.nextDueAt ? ` · next ${timeUntil(Date.parse(s.nextDueAt), now)}` : '';
    lines.push(`${s.fridge} scheduled${next}`);
  } else {
    lines.push('Nothing scheduled');
  }

  if (s.ideasWaiting > 0) {
    const n = s.ideasWaiting >= IDEAS_FETCHED ? `${IDEAS_FETCHED}+` : String(s.ideasWaiting);
    lines.push(`${n} ${s.ideasWaiting === 1 ? 'idea' : 'ideas'} waiting`);
  }

  return lines;
}

/** Says where the "of N" comes from, and mentions drafts since they quietly add a little */
export function targetNote(s: PetState): string {
  const base = s.hasGoals ? 'Measured against your posting goals' : `No posting goal set, so I aim for ${DEFAULT_WEEKLY_TARGET} a week`;
  if (s.snacksToday <= 0) return base;
  return `${base}. ${s.snacksToday === 1 ? 'A draft' : `${s.snacksToday} drafts`} today count${s.snacksToday === 1 ? 's' : ''} a little too`;
}
