// Finishes the OAuth code exchange from this origin, then hands the tokens to the extension.
// Buffer's token endpoint only accepts requests from the redirect URI's origin.
// Chrome Web Store build first, then the local build with the pinned key
const EXTENSION_IDS = ['dndkfdgjaokpffieimgaoheogiohinmn', 'ecmbcebdlcbhgggjgdnokhlllblbongm'];

const title = document.querySelector('#title');
const detail = document.querySelector('#detail');
const say = (t, d) => {
  title.textContent = t;
  detail.textContent = d;
};

const ask = (id, message) =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(id, message, (reply) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(reply);
    });
  });

// Only the extension that started this sign-in knows the state, so the others just say no
async function findExtension(message) {
  for (const id of EXTENSION_IDS) {
    const reply = await ask(id, message).catch(() => null);
    if (reply?.ok) return { id, reply };
  }
  return null;
}

const tellAll = (message) => Promise.all(EXTENSION_IDS.map((id) => ask(id, message).catch(() => {})));

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
    await tellAll({ type: 'AUTH_ERROR', state, error: reason });
    return say('Buffer said no', reason);
  }
  if (!code) return say('Nothing to connect', 'No authorization code came back. Try again from the extension.');

  const found = await findExtension({ type: 'AUTH_BEGIN', state });
  if (!found) return say('Connection expired', 'Start again from the extension: open it and press Connect Buffer.');
  const { id: extensionId, reply: begin } = found;

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
    await ask(extensionId, { type: 'AUTH_ERROR', state, error: reason }).catch(() => {});
    return say('Could not connect', reason);
  }

  const done = await ask(extensionId, { type: 'AUTH_TOKENS', state, tokens }).catch((e) => ({ ok: false, error: e.message }));
  if (!done?.ok) return say('Could not connect', done?.error || 'The extension did not accept the tokens.');
  say('Connected', 'Sproutling is awake. You can close this window.');
  setTimeout(() => window.close(), 1200);
}

main().catch((e) => say('Something went wrong', e.message));
