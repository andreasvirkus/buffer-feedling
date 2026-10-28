import { graphql } from '../api/client';
import { ACCOUNT_QUERY } from '../api/queries';
import type { Account } from '../messages';
import { CALLBACK_URL, CLIENT_ID, TOKEN_URL } from '../config';
import type { CallbackMessage, CallbackReply } from '../messages';
import { matchPending, type PendingAuth } from './pending';
import { buildAuthorizeUrl, createPkcePair, createState } from './pkce';
import { tokenManager, tokensFromResponse } from './tokens';

// Everything we persist besides tokens; wiped on disconnect
const DERIVED_KEYS = ['account', 'petState', 'pollMeta', 'connectedAt', 'lastFedAt', 'seenAt', 'authError'];

export async function fetchAccount(): Promise<Account> {
  const { account } = await graphql<{ account: { name: string | null; email: string; organizations: { id: string }[] } }>(
    ACCOUNT_QUERY,
  );
  const org = account.organizations[0];
  if (!org) throw new Error('No Buffer organization found on this account');
  return { name: account.name ?? account.email, email: account.email, organizationId: org.id };
}

const PENDING_KEY = 'pendingAuth';

async function getPending() {
  return ((await browser.storage.session.get(PENDING_KEY))[PENDING_KEY] as PendingAuth | undefined) ?? undefined;
}

// Opens consent in a popup; the callback page on our site finishes the exchange (see handleCallbackMessage)
export async function startConnect() {
  const { verifier, challenge } = await createPkcePair();
  const state = createState();
  const url = buildAuthorizeUrl({ redirectUri: CALLBACK_URL, state, challenge });
  await browser.storage.local.remove('authError');
  const win = await browser.windows.create({ url, type: 'popup', width: 520, height: 760 });
  await browser.storage.session.set({
    [PENDING_KEY]: { state, verifier, startedAt: Date.now(), windowId: win?.id } satisfies PendingAuth,
  });
}

// Token requests need an https origin Buffer accepts, so the page does the exchange and hands the tokens back
export async function handleCallbackMessage(msg: CallbackMessage): Promise<CallbackReply> {
  const pending = matchPending(await getPending(), msg?.state, Date.now());
  if (!pending) return { ok: false, error: 'No connection in progress' };

  if (msg.type === 'AUTH_BEGIN') {
    return { ok: true, verifier: pending.verifier, clientId: CLIENT_ID, redirectUri: CALLBACK_URL, tokenUrl: TOKEN_URL };
  }

  await browser.storage.session.remove(PENDING_KEY);
  if (msg.type === 'AUTH_ERROR') {
    await browser.storage.local.set({ authError: String(msg.error).slice(0, 300) });
    return { ok: true };
  }

  try {
    await tokenManager.save(tokensFromResponse(msg.tokens));
    const account = await fetchAccount();
    const { connectedAt } = await browser.storage.local.get('connectedAt');
    await browser.storage.local.set({ account, connectedAt: connectedAt ?? Date.now() });
  } catch (e) {
    await tokenManager.disconnect();
    await browser.storage.local.set({ authError: (e as Error).message });
    return { ok: false, error: (e as Error).message };
  }
  if (pending.windowId !== undefined) await browser.windows.remove(pending.windowId).catch(() => {});
  return { ok: true };
}

export async function disconnect() {
  await tokenManager.disconnect();
  await browser.storage.local.remove(DERIVED_KEYS);
}

export async function getAccount(): Promise<Account | undefined> {
  const { account } = await browser.storage.local.get('account');
  return (account as Account | undefined)?.organizationId ? (account as Account) : undefined;
}
