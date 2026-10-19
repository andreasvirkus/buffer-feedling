import { graphql } from '../api/client';
import { ACCOUNT_QUERY } from '../api/queries';
import type { Account } from '../messages';
import { buildAuthorizeUrl, createPkcePair, createState } from './pkce';
import { exchangeCode, tokenManager } from './tokens';

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

  const { account } = await graphql<{ account: Account }>(ACCOUNT_QUERY);
  await browser.storage.local.set({ account });
  return account;
}

export async function disconnect() {
  await tokenManager.disconnect();
  await browser.storage.local.remove('account');
}

export async function getAccount(): Promise<Account | undefined> {
  return ((await browser.storage.local.get('account')).account as Account | undefined) ?? undefined;
}
