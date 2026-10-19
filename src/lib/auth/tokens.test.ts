import { describe, expect, it, vi } from 'vitest';
import { OAuthError, createTokenManager, expiresAtFrom, isExpired, type TokenStore, type Tokens } from './tokens';

const memoryStore = (initial: Tokens | null): TokenStore & { value: Tokens | null } => {
  const s = {
    value: initial,
    get: async () => s.value,
    set: async (t: Tokens) => void (s.value = t),
    clear: async () => void (s.value = null),
  };
  return s;
};

const tok = (n: string, expiresAt: number): Tokens => ({ accessToken: `a${n}`, refreshToken: `r${n}`, expiresAt });

describe('expiry math', () => {
  it('subtracts a 60s skew', () => expect(expiresAtFrom(1_000, 3600)).toBe(1_000 + 3_540_000));
  it('flags expiry at the boundary', () => {
    expect(isExpired(tok('1', 100), 100)).toBe(true);
    expect(isExpired(tok('1', 100), 99)).toBe(false);
  });
});

describe('token manager', () => {
  it('returns the cached token while fresh', async () => {
    const refresh = vi.fn();
    const m = createTokenManager({ store: memoryStore(tok('1', 500)), refresh, now: () => 0 });
    expect(await m.getAccessToken()).toBe('a1');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('shares one refresh across concurrent callers and persists the rotation', async () => {
    const store = memoryStore(tok('1', 0));
    const refresh = vi.fn(async () => tok('2', 9_999));
    const m = createTokenManager({ store, refresh, now: () => 10 });
    const out = await Promise.all([m.getAccessToken(), m.getAccessToken(), m.getAccessToken()]);
    expect(out).toEqual(['a2', 'a2', 'a2']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith('r1');
    expect(store.value?.refreshToken).toBe('r2');
  });

  it('clears the grant on invalid_grant', async () => {
    const store = memoryStore(tok('1', 0));
    const m = createTokenManager({
      store,
      refresh: async () => {
        throw new OAuthError('revoked', 'invalid_grant');
      },
      now: () => 10,
    });
    await expect(m.getAccessToken()).rejects.toThrow('revoked');
    expect(store.value).toBeNull();
  });

  it('keeps tokens on transient failures and allows a retry', async () => {
    const store = memoryStore(tok('1', 0));
    const refresh = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(tok('2', 9_999));
    const m = createTokenManager({ store, refresh, now: () => 10 });
    await expect(m.getAccessToken()).rejects.toThrow('offline');
    expect(store.value?.refreshToken).toBe('r1');
    expect(await m.getAccessToken()).toBe('a2');
  });

  it('ends the session when expired and no refresh token was issued', async () => {
    const store = memoryStore({ accessToken: 'a1', refreshToken: null, expiresAt: 0 });
    const refresh = vi.fn();
    const m = createTokenManager({ store, refresh, now: () => 10 });
    await expect(m.getAccessToken()).rejects.toThrow('connect again');
    expect(refresh).not.toHaveBeenCalled();
    expect(store.value).toBeNull();
  });

  it('forceRefresh rotates even when fresh', async () => {
    const store = memoryStore(tok('1', 9_999));
    const m = createTokenManager({ store, refresh: async () => tok('2', 9_999), now: () => 0 });
    expect(await m.forceRefresh()).toBe('a2');
  });

  it('disconnect clears everything', async () => {
    const store = memoryStore(tok('1', 9_999));
    const m = createTokenManager({ store });
    await m.disconnect();
    expect(await m.isConnected()).toBe(false);
  });
});
