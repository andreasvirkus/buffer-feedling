export interface Account {
  name: string;
  email: string;
  organizationId: string;
}

export interface ConnectionStatus {
  connected: boolean;
  account?: Account;
}

export type Message = { type: 'CONNECT' } | { type: 'DISCONNECT' } | { type: 'GET_STATUS' } | { type: 'REFRESH_NOW' };

export type Reply<T = ConnectionStatus> = { ok: true; data: T } | { ok: false; error: string };

export const send = <T = ConnectionStatus>(m: Message): Promise<Reply<T>> => browser.runtime.sendMessage(m);
