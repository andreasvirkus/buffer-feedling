import type { PetInputs } from '../pet/state';

const DAY_MS = 24 * 3600_000;

export interface PollData {
  channels: {
    service: string;
    isDisconnected: boolean;
    postingGoal: { goal: number; sentCount: number; scheduledCount: number } | null;
  }[];
  sent: { edges: { node: { sentAt: string | null } }[] };
  recent: { edges: { node: { status: string; createdAt: string } }[] };
  scheduled: { edges: { node: { id: string } }[] };
  ideas: { edges: { node: { createdAt: number } }[] }; // unix seconds
}

export function pollVariables(now: number, org: string) {
  return {
    org,
    sentSince: new Date(now - 7 * DAY_MS).toISOString(),
    createdSince: new Date(now - 3 * DAY_MS).toISOString(),
  };
}

export const startOfLocalDay = (now: number) => new Date(now).setHours(0, 0, 0, 0);

export function toPetInputs(
  data: PollData,
  ctx: { now: number; connectedAt: number | null; lastFedAt?: number },
): PetInputs {
  const { now } = ctx;
  const today = startOfLocalDay(now);
  const live = data.channels.filter((c) => !c.isDisconnected);

  const sentTimes = data.sent.edges
    .map((e) => (e.node.sentAt ? Date.parse(e.node.sentAt) : NaN))
    .filter((t) => t >= now - 7 * DAY_MS);
  const recent = data.recent.edges.map((e) => ({ status: e.node.status, at: Date.parse(e.node.createdAt) }));
  const ideaTimes = data.ideas.edges.map((e) => e.node.createdAt * 1000);

  const activity = [...sentTimes, ...recent.map((p) => p.at), ...ideaTimes].filter((t) => Number.isFinite(t));

  return {
    now,
    goals: live.flatMap((c) => (c.postingGoal ? [c.postingGoal] : [])),
    sentLast7d: sentTimes.length,
    scheduledPosts: data.scheduled.edges.length,
    draftsToday: recent.filter((p) => p.status === 'draft' && p.at >= today).length,
    ideasToday: ideaTimes.filter((t) => t >= today).length,
    lastActivityAt: activity.length ? Math.max(...activity) : null,
    connectedAt: ctx.connectedAt,
    lastFedAt: ctx.lastFedAt,
    services: live.map((c) => c.service).filter((s) => s !== 'startPage'),
  };
}
