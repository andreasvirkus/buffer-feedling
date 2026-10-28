import { CLIENT_ID } from '../config';
import { OAuthError, keepRefreshToken, tokensFromResponse, type Tokens } from './tokens';

type RefreshReply = { ok: true; tokens: Record<string, unknown> } | { ok: false; error: string; code?: string };

async function ensureOffscreen() {
  const open = await browser.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as never] });
  if (open.length) return;
  await browser.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['IFRAME_SCRIPTING' as never],
    justification: 'Refresh the Buffer session from our own web origin, the only one its token endpoint accepts',
  });
}

// Buffer's token endpoint rejects the extension's own origin, so a page on our site makes the call
export async function refreshViaSite(refreshToken: string): Promise<Tokens> {
  await ensureOffscreen();
  try {
    const reply = (await browser.runtime.sendMessage({
      target: 'offscreen',
      type: 'REFRESH',
      refreshToken,
      clientId: CLIENT_ID,
    })) as RefreshReply | undefined;
    if (!reply?.ok) throw new OAuthError(reply?.error ?? 'Refresh failed', reply?.code);
    return keepRefreshToken(tokensFromResponse(reply.tokens), refreshToken);
  } finally {
    await browser.offscreen.closeDocument().catch(() => {});
  }
}
