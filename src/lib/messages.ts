export interface Account {
  name: string;
  email: string;
  organizationId: string;
}

export interface ConnectionStatus {
  connected: boolean;
  account?: Account;
}

export type Message = { type: 'CONNECT' } | { type: 'DISCONNECT' } | { type: 'GET_STATUS' } | { type: 'REFRESH_NOW' }
  | { type: 'POLL_HINT' };

export type Reply<T = ConnectionStatus> = { ok: true; data: T } | { ok: false; error: string };

export const send = <T = ConnectionStatus>(m: Message): Promise<Reply<T>> => browser.runtime.sendMessage(m);

// Sent by the callback page on our site (externally_connectable)
export type CallbackMessage =
  | { type: 'AUTH_BEGIN'; state: string }
  | { type: 'AUTH_ERROR'; state: string; error: string }
  | { type: 'AUTH_TOKENS'; state: string; tokens: Record<string, unknown> };

export type CallbackReply =
  | { ok: true; verifier?: string; clientId?: string; redirectUri?: string; tokenUrl?: string }
  | { ok: false; error: string };
