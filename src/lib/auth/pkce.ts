import { AUTH_URL, CLIENT_ID, SCOPES } from '../config';

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const randomString = (bytes: number) => b64url(crypto.getRandomValues(new Uint8Array(bytes)));

export async function createPkcePair() {
  const verifier = randomString(32);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: b64url(new Uint8Array(digest)) };
}

export const createState = () => randomString(16);

export function buildAuthorizeUrl(opts: { redirectUri: string; state: string; challenge: string }) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
  }).toString();
  return url.toString();
}
