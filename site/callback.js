// Finishes the OAuth code exchange from this origin, then hands the tokens to the extension.
// Buffer's token endpoint only accepts requests from the redirect URI's origin.
const EXTENSION_ID = 'ecmbcebdlcbhgggjgdnokhlllblbongm';

const title = document.querySelector('#title');
const detail = document.querySelector('#detail');
const say = (t, d) => {
  title.textContent = t;
  detail.textContent = d;
};

const ask = (message) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(EXTENSION_ID, message, (reply) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(reply);
    });
  });

async function main() {
  const params = new URLSearchParams(location.search);
  const { code, state, error } = Object.fromEntries(params);
  // Keep the one-time code out of history and the address bar
  history.replaceState(null, '', location.pathname);

  if (!globalThis.chrome?.runtime?.sendMessage) {
    return say('Open this in Chrome', 'This page connects the Sproutling extension, which needs a Chromium browser with the extension installed.');
  }
  if (!state) return say('Nothing to connect', 'Start from the extension: open it and press Connect Buffer.');

  if (error) {
    const reason = params.get('error_description') || error;
    await ask({ type: 'AUTH_ERROR', state, error: reason }).catch(() => {});
    return say('Buffer said no', reason);
  }
  if (!code) return say('Nothing to connect', 'No authorization code came back. Try again from the extension.');

  const begin = await ask({ type: 'AUTH_BEGIN', state });
  if (!begin?.ok) return say('Connection expired', 'Start again from the extension: open it and press Connect Buffer.');

  const res = await fetch(begin.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: begin.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: begin.redirectUri,
      code_verifier: begin.verifier,
    }),
  });
  const tokens = await res.json().catch(() => ({}));
  if (!res.ok || tokens.error) {
    const reason = tokens.error_description || tokens.error || `HTTP ${res.status}`;
    await ask({ type: 'AUTH_ERROR', state, error: reason }).catch(() => {});
    return say('Could not connect', reason);
  }

  const done = await ask({ type: 'AUTH_TOKENS', state, tokens });
  if (!done?.ok) return say('Could not connect', done?.error || 'The extension did not accept the tokens.');
  say('Connected', 'Sproutling is awake. You can close this window.');
  setTimeout(() => window.close(), 1200);
}

main().catch((e) => say('Something went wrong', e.message));
