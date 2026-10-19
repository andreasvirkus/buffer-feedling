import { ApiError, graphql } from './api/client';
import { pollVariables, toPetInputs, type PollData } from './api/poll';
import { POLL_QUERY } from './api/queries';
import { fetchAccount, getAccount } from './auth/flow';
import { tokenManager } from './auth/tokens';
import { computePetState, type PetState } from './pet/state';

export interface PollMeta {
  lastPollAt?: number;
  error?: string;
  rateLimitedUntil?: number;
}

export const POLL_ALARM = 'poll';
export const POLL_MINUTES = 15;
const DEFAULT_BACKOFF_SEC = 60;

const getMeta = async () => ((await browser.storage.local.get('pollMeta')).pollMeta ?? {}) as PollMeta;
const setMeta = (pollMeta: PollMeta) => browser.storage.local.set({ pollMeta });

let inflight: Promise<void> | null = null;

/** Single-flight: alarm, startup and manual refresh can all land together */
export function pollOnce(): Promise<void> {
  inflight ??= run().finally(() => (inflight = null));
  return inflight;
}

async function run() {
  if (!(await tokenManager.isConnected())) return;

  const meta = await getMeta();
  const now = Date.now();
  if (meta.rateLimitedUntil && now < meta.rateLimitedUntil) return;

  try {
    let account = await getAccount();
    if (!account) {
      account = await fetchAccount();
      await browser.storage.local.set({ account });
    }
    const data = await graphql<PollData>(POLL_QUERY, pollVariables(now, account.organizationId));
    const stored = (await browser.storage.local.get(['connectedAt', 'lastFedAt'])) as {
      connectedAt?: number;
      lastFedAt?: number;
    };
    const petState: PetState = computePetState(
      toPetInputs(data, { now, connectedAt: stored.connectedAt ?? null, lastFedAt: stored.lastFedAt }),
    );
    await browser.storage.local.set({ petState, pollMeta: { lastPollAt: now } satisfies PollMeta });
  } catch (err) {
    // A disconnect mid-poll leaves nothing to report
    if (!(await tokenManager.isConnected())) return;
    const message = err instanceof Error ? err.message : String(err);
    const rateLimitedUntil =
      err instanceof ApiError && err.status === 429
        ? Date.now() + (err.retryAfterSec ?? DEFAULT_BACKOFF_SEC) * 1000
        : undefined;
    await setMeta({ ...meta, error: message, rateLimitedUntil });
  }
}
