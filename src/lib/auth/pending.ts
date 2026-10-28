export interface PendingAuth {
  state: string;
  verifier: string;
  startedAt: number;
  windowId?: number;
}

export const PENDING_TTL_MS = 10 * 60_000;

/** The callback page proves it holds our state; anything stale or mismatched gets nothing */
export function matchPending(pending: PendingAuth | undefined, state: unknown, now: number): PendingAuth | null {
  if (!pending || typeof state !== 'string' || state !== pending.state) return null;
  return now - pending.startedAt > PENDING_TTL_MS ? null : pending;
}
