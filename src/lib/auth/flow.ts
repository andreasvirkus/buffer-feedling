import { graphql } from '../api/client';
import { ACCOUNT_QUERY } from '../api/queries';
import type { Account } from '../messages';
import { buildAuthorizeUrl, createPkcePair, createState } from './pkce';
import { exchangeCode, tokenManager } from './tokens';

// Everything we persist besides tokens; wiped on disconnect
const DERIVED_KEYS = ['account', 'petState', 'pollMeta', 'connectedAt', 'lastFedAt'];

export async function fetchAccount(): Promise<Account> {
  const { account } = await graphql<{ account: { name: string | null; email: string; organizations: { id: string }[] } }>(
    ACCOUNT_QUERY,
  );
  const org = account.organizations[0];
  if (!org) throw new Error('No Buffer organization found on this account');
  return { name: account.name ?? account.email, email: account.email, organizationId: org.id };
}

export async function connect(): Promise<Account> {
  const redirectUri = browser.identity.getRedirectURL();
  const { verifier, challenge } = await createPkcePair();
  const state = createState();

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url: buildAuthorizeUrl({ redirectUri, state, challenge }),
    interactive: true,
  });
  if (!responseUrl) throw new Error('Authorization cancelled');

  const params = new URL(responseUrl).searchParams;
  if (params.get('error')) throw new Error(params.get('error_description') || params.get('error')!);
  if (params.get('state') !== state) throw new Error('State mismatch');
  const code = params.get('code');
  if (!code) throw new Error('No authorization code returned');

  await tokenManager.save(await exchangeCode({ code, verifier, redirectUri }));

  const account = await fetchAccount();
  const { connectedAt } = await browser.storage.local.get('connectedAt');
  await browser.storage.local.set({ account, connectedAt: connectedAt ?? Date.now() });
  return account;
}

export async function disconnect() {
  await tokenManager.disconnect();
  await browser.storage.local.remove(DERIVED_KEYS);
}

export async function getAccount(): Promise<Account | undefined> {
  const { account } = await browser.storage.local.get('account');
  return (account as Account | undefined)?.organizationId ? (account as Account) : undefined;
}
