import { describe, expect, it } from 'vitest';
import { PENDING_TTL_MS, matchPending, type PendingAuth } from './pending';

const pending: PendingAuth = { state: 's1', verifier: 'v', startedAt: 1_000 };

describe('matchPending', () => {
  it('matches the right state while fresh', () => expect(matchPending(pending, 's1', 2_000)).toBe(pending));
  it('rejects a different state', () => expect(matchPending(pending, 's2', 2_000)).toBeNull());
  it('rejects non-string state', () => expect(matchPending(pending, undefined, 2_000)).toBeNull());
  it('rejects when nothing is pending', () => expect(matchPending(undefined, 's1', 2_000)).toBeNull());
  it('rejects after the TTL', () => {
    expect(matchPending(pending, 's1', 1_000 + PENDING_TTL_MS)).toBe(pending);
    expect(matchPending(pending, 's1', 1_000 + PENDING_TTL_MS + 1)).toBeNull();
  });
});
