import { disconnect, getAccount, handleCallbackMessage, startConnect } from '@/lib/auth/flow';
import { tokenManager } from '@/lib/auth/manager';
import { SITE_ORIGIN } from '@/lib/config';
import type { CallbackMessage, CallbackReply, ConnectionStatus, Message, Reply } from '@/lib/messages';
import { syncPlatformScripts } from '@/lib/platforms/register';
import { POLL_ALARM, POLL_MINUTES, pollIfStale, pollOnce } from '@/lib/poller';

const HINT_MIN_INTERVAL_MS = 60_000;

async function status(): Promise<ConnectionStatus> {
  return (await tokenManager.isConnected())
    ? { connected: true, account: await getAccount() }
    : { connected: false };
}

async function handle(msg: Message): Promise<ConnectionStatus> {
  if (msg.type === 'CONNECT') await startConnect();
  if (msg.type === 'DISCONNECT') await disconnect();
  if (msg.type === 'POLL_HINT') await pollIfStale(HINT_MIN_INTERVAL_MS);
  if (msg.type === 'REFRESH_NOW') {
    // Manual refresh overrides a previous backoff or error
    await browser.storage.local.remove('pollMeta');
    await pollOnce();
  }
  return status();
}

export default defineBackground(() => {
  // Idempotent: re-creating by name replaces the alarm
  browser.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
  browser.alarms.onAlarm.addListener((a) => {
    if (a.name === POLL_ALARM) void pollOnce();
  });
  browser.runtime.onStartup.addListener(() => void pollOnce());
  browser.runtime.onInstalled.addListener(() => void pollOnce());

  const sync = () => void syncPlatformScripts().catch((e) => console.error('Feedling: registering site scripts failed', e));
  browser.runtime.onStartup.addListener(sync);
  browser.runtime.onInstalled.addListener(sync);
  browser.permissions.onAdded.addListener(sync);
  browser.permissions.onRemoved.addListener(sync);

  browser.runtime.onMessageExternal.addListener((msg: CallbackMessage, sender, sendResponse) => {
    if (sender.origin !== SITE_ORIGIN) return;
    handleCallbackMessage(msg)
      .then(async (reply) => {
        if (msg.type === 'AUTH_TOKENS' && reply.ok) await pollOnce();
        return reply;
      })
      .then(sendResponse, (e: Error): void => sendResponse({ ok: false, error: e.message } satisfies CallbackReply));
    return true;
  });

  browser.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
    // Content scripts may only nudge a poll, never drive auth
    if (sender.tab && msg.type !== 'POLL_HINT') return;
    handle(msg).then(
      (data): void => sendResponse({ ok: true, data } satisfies Reply),
      (e: Error): void => sendResponse({ ok: false, error: e.message } satisfies Reply),
    );
    return true;
  });
});
