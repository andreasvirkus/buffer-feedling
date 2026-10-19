import { connect, disconnect, getAccount } from '@/lib/auth/flow';
import { tokenManager } from '@/lib/auth/tokens';
import type { ConnectionStatus, Message, Reply } from '@/lib/messages';
import { POLL_ALARM, POLL_MINUTES, pollOnce } from '@/lib/poller';

async function status(): Promise<ConnectionStatus> {
  return (await tokenManager.isConnected())
    ? { connected: true, account: await getAccount() }
    : { connected: false };
}

async function handle(msg: Message): Promise<ConnectionStatus> {
  if (msg.type === 'CONNECT') {
    await connect();
    await pollOnce();
  }
  if (msg.type === 'DISCONNECT') await disconnect();
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

  browser.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
    // Only our own pages (popup) may drive auth, never content scripts
    if (sender.tab) return;
    handle(msg).then(
      (data): void => sendResponse({ ok: true, data } satisfies Reply),
      (e: Error): void => sendResponse({ ok: false, error: e.message } satisfies Reply),
    );
    return true;
  });
});
