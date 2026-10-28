export interface Tokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

export class OAuthError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

const EXPIRY_SKEW_MS = 60_000;

export const expiresAtFrom = (now: number, expiresInSec: number) => now + expiresInSec * 1000 - EXPIRY_SKEW_MS;
export const isExpired = (t: Tokens, now: number) => now >= t.expiresAt;

export function tokensFromResponse(json: Record<string, unknown>, now = Date.now()): Tokens {
  if (typeof json.access_token !== 'string') throw new OAuthError('Token response had no access_token');
  return {
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : null,
    expiresAt: expiresAtFrom(now, Number(json.expires_in) || 3600),
  };
}

/** A refresh response that doesn't rotate the token must not wipe the one we hold */
export const keepRefreshToken = (next: Tokens, previous: string): Tokens => ({
  ...next,
  refreshToken: next.refreshToken ?? previous,
});

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(t: Tokens): Promise<void>;
  clear(): Promise<void>;
}

export function createTokenManager(deps: {
  store: TokenStore;
  refresh: (refreshToken: string) => Promise<Tokens>;
  now?: () => number;
}) {
  const { store, refresh, now = Date.now } = deps;
  let inflight: Promise<Tokens> | null = null;

  // Single-flight: refresh tokens rotate, a second concurrent use revokes the grant
  function refreshOnce(current: Tokens): Promise<Tokens> {
    inflight ??= (async () => {
      try {
        // Without offline_access there is nothing to refresh with; the session just ends
        if (!current.refreshToken) throw new OAuthError('Session expired, connect again', 'invalid_grant');
        const next = await refresh(current.refreshToken);
        await store.set(next); // persist the rotated token before anyone uses it
        return next;
      } catch (err) {
        // Rejected grant is unrecoverable; network errors are retryable
        if (err instanceof OAuthError && err.code === 'invalid_grant') await store.clear();
        throw err;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  return {
    async getAccessToken(): Promise<string> {
      const tokens = await store.get();
      if (!tokens) throw new OAuthError('Not connected', 'not_connected');
      if (!isExpired(tokens, now())) return tokens.accessToken;
      return (await refreshOnce(tokens)).accessToken;
    },
    /** Force a rotation, e.g. after a 401 */
    async forceRefresh(): Promise<string> {
      const tokens = await store.get();
      if (!tokens) throw new OAuthError('Not connected', 'not_connected');
      return (await refreshOnce(tokens)).accessToken;
    },
    save: (t: Tokens) => store.set(t),
    disconnect: () => store.clear(),
    isConnected: async () => (await store.get()) !== null,
  };
}

const KEY = 'auth';

export const chromeTokenStore: TokenStore = {
  async get() {
    return ((await browser.storage.local.get(KEY))[KEY] as Tokens | undefined) ?? null;
  },
  set: (t) => browser.storage.local.set({ [KEY]: t }),
  clear: () => browser.storage.local.remove(KEY),
};
