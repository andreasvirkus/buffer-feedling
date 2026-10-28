import { SITE_ORIGIN } from '@/lib/config';

const REFRESH_TIMEOUT_MS = 20_000;
const frame = document.querySelector<HTMLIFrameElement>('#site')!;

// Listen before loading so the page's ready ping can't be missed
const ready = new Promise<void>((resolve) => {
  const onReady = (e: MessageEvent) => {
    if (e.origin !== SITE_ORIGIN || e.data?.type !== 'ready') return;
    removeEventListener('message', onReady);
    resolve();
  };
  addEventListener('message', onReady);
});
frame.src = `${SITE_ORIGIN}/refresh`;

function relay(refreshToken: string, clientId: string) {
  return new Promise<unknown>((resolve) => {
    const timer = setTimeout(() => done({ ok: false, error: 'Refresh timed out' }), REFRESH_TIMEOUT_MS);
    const onResult = (e: MessageEvent) => {
      if (e.origin !== SITE_ORIGIN || e.source !== frame.contentWindow || e.data?.type !== 'result') return;
      done(e.data);
    };
    const done = (reply: unknown) => {
      clearTimeout(timer);
      removeEventListener('message', onResult);
      resolve(reply);
    };
    addEventListener('message', onResult);
    ready.then(() => frame.contentWindow!.postMessage({ type: 'refresh', refreshToken, clientId }, SITE_ORIGIN));
  });
}

browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen' || msg.type !== 'REFRESH') return;
  void relay(msg.refreshToken, msg.clientId).then(sendResponse);
  return true;
});
