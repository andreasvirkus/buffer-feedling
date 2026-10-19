import { connect, disconnect, getAccount } from '@/lib/auth/flow';
import { tokenManager } from '@/lib/auth/tokens';
import type { ConnectionStatus, Message, Reply } from '@/lib/messages';

async function status(): Promise<ConnectionStatus> {
  return (await tokenManager.isConnected())
    ? { connected: true, account: await getAccount() }
    : { connected: false };
}

async function handle(msg: Message): Promise<ConnectionStatus> {
  if (msg.type === 'CONNECT') await connect();
  if (msg.type === 'DISCONNECT') await disconnect();
  return status();
}

export default defineBackground(() => {
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
