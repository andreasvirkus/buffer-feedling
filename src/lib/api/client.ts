import { API_URL } from '../config';
import { OAuthError, tokenManager } from '../auth/tokens';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterSec?: number,
  ) {
    super(message);
  }
}

export async function graphql<T>(query: string, variables?: Record<string, unknown>, retried = false): Promise<T> {
  const token = await tokenManager.getAccessToken();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401 && !retried) {
    await tokenManager.forceRefresh();
    return graphql<T>(query, variables, true);
  }
  if (res.status === 429) {
    throw new ApiError('Rate limited', 429, Number(res.headers.get('Retry-After')) || undefined);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.errors?.length) {
    const e = json?.errors?.[0];
    throw new ApiError(e?.message ?? `HTTP ${res.status}`, res.status);
  }
  return json.data as T;
}

export { OAuthError };
