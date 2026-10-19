import { CLIENT_ID, TOKEN_URL } from '../config';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
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

export async function requestTokens(params: Record<string, string>, now = Date.now()): Promise<Tokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new OAuthError(json.error_description || json.error || `HTTP ${res.status}`, json.error);
  }
  if (!json.refresh_token) throw new OAuthError('No refresh token returned; is offline_access enabled?');
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: expiresAtFrom(now, Number(json.expires_in) || 3600),
  };
}

export const exchangeCode = (p: { code: string; verifier: string; redirectUri: string }) =>
  requestTokens({
    grant_type: 'authorization_code',
    code: p.code,
    redirect_uri: p.redirectUri,
    code_verifier: p.verifier,
  });

export const refreshWith = (refreshToken: string) =>
  requestTokens({ grant_type: 'refresh_token', refresh_token: refreshToken });

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(t: Tokens): Promise<void>;
  clear(): Promise<void>;
}

export function createTokenManager(deps: {
  store: TokenStore;
  refresh?: (refreshToken: string) => Promise<Tokens>;
  now?: () => number;
}) {
  const { store, refresh = refreshWith, now = Date.now } = deps;
  let inflight: Promise<Tokens> | null = null;

  // Single-flight: refresh tokens rotate, a second concurrent use revokes the grant
  function refreshOnce(current: Tokens): Promise<Tokens> {
    inflight ??= (async () => {
      try {
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

export const tokenManager = createTokenManager({ store: chromeTokenStore });
