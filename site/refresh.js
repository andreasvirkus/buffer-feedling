// Runs inside the extension's offscreen document. Buffer's token endpoint only accepts this origin,
// so the extension hands over its refresh token, we call /token, and the result goes straight back.
const EXTENSION_ORIGIN = 'chrome-extension://ecmbcebdlcbhgggjgdnokhlllblbongm';
const TOKEN_URL = 'https://auth.buffer.com/token';

addEventListener('message', async (e) => {
  if (e.origin !== EXTENSION_ORIGIN || e.source !== parent || e.data?.type !== 'refresh') return;
  const { refreshToken, clientId } = e.data;
  const reply = (body) => parent.postMessage({ type: 'result', ...body }, EXTENSION_ORIGIN);

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) {
      reply({ ok: false, error: json.error_description || json.error || `HTTP ${res.status}`, code: json.error });
    } else {
      reply({ ok: true, tokens: json });
    }
  } catch (err) {
    reply({ ok: false, error: err.message });
  }
});

parent.postMessage({ type: 'ready' }, EXTENSION_ORIGIN);
