export type Mood = 'hungry' | 'content' | 'full' | 'sleepy' | 'eating';

export interface PetState {
  mood: Mood;
  fullness: number; // 0..1
  fridge: number; // scheduled posts coming up
  snacksToday: number; // drafts created today
  treats: number; // ideas created today, cosmetic only
  sent: number; // posts counted toward fullness
  target: number; // what `sent` is measured against
  age: number; // days since first connect
  lastFedAt?: string;
  connectedServices: string[];
  updatedAt: string;
}

export interface GoalInput {
  goal: number;
  sentCount: number;
  scheduledCount: number;
}

export interface PetInputs {
  now: number;
  goals: GoalInput[];
  sentLast7d: number;
  scheduledPosts: number; // fridge fallback when no goals
  draftsToday: number;
  ideasToday: number;
  lastActivityAt: number | null;
  connectedAt: number | null;
  lastFedAt?: number;
  services: string[];
}

export const DEFAULT_WEEKLY_TARGET = 3;
export const SNACK_VALUE = 0.05;
export const SNACK_CAP = 0.15;
export const SLEEPY_AFTER_MS = 3 * 24 * 3600_000;
export const EATING_MS = 5000;
const DAY_MS = 24 * 3600_000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function computePetState(i: PetInputs): PetState {
  const goals = i.goals.filter((g) => g.goal > 0);
  const hasGoals = goals.length > 0;

  const sent = hasGoals ? goals.reduce((n, g) => n + g.sentCount, 0) : i.sentLast7d;
  const target = hasGoals ? goals.reduce((n, g) => n + g.goal, 0) : DEFAULT_WEEKLY_TARGET;
  const fridge = hasGoals ? goals.reduce((n, g) => n + g.scheduledCount, 0) : i.scheduledPosts;

  const snackBonus = Math.min(i.draftsToday * SNACK_VALUE, SNACK_CAP);
  const fullness = clamp01(sent / target + snackBonus);

  const idle = i.lastActivityAt === null || i.now - i.lastActivityAt >= SLEEPY_AFTER_MS;
  const eating = i.lastFedAt !== undefined && i.now - i.lastFedAt < EATING_MS;

  let mood: Mood;
  if (eating) mood = 'eating';
  else if (fullness >= 1) mood = 'full';
  else if (fullness >= 0.4 || fridge > 0) mood = 'content';
  else if (idle) mood = 'sleepy';
  else mood = 'hungry';

  return {
    mood,
    fullness,
    fridge,
    snacksToday: i.draftsToday,
    treats: i.ideasToday,
    sent,
    target,
    age: i.connectedAt === null ? 0 : Math.max(0, Math.floor((i.now - i.connectedAt) / DAY_MS)),
    lastFedAt: i.lastFedAt === undefined ? undefined : new Date(i.lastFedAt).toISOString(),
    connectedServices: [...new Set(i.services)],
    updatedAt: new Date(i.now).toISOString(),
  };
}
