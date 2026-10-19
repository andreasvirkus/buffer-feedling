import { send, type ConnectionStatus } from '@/lib/messages';

const app = document.querySelector<HTMLElement>('#app')!;

function render(s: ConnectionStatus, error?: string) {
  app.replaceChildren();
  const add = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string) => {
    const el = document.createElement(tag);
    el.textContent = text;
    app.append(el);
    return el;
  };

  if (error) add('p', error).setAttribute('role', 'alert');

  if (!s.connected) {
    add('p', 'Connect Buffer to feed your feedling.');
    add('button', 'Connect Buffer').onclick = () => act('CONNECT');
    return;
  }
  add('p', `Connected as ${s.account?.name ?? 'your Buffer account'}`);
  add('button', 'Disconnect').onclick = () => act('DISCONNECT');
}

async function act(type: 'CONNECT' | 'DISCONNECT') {
  app.setAttribute('aria-busy', 'true');
  const res = await send({ type });
  app.removeAttribute('aria-busy');
  if (res.ok) return render(res.data);
  const cur = await send({ type: 'GET_STATUS' });
  render(cur.ok ? cur.data : { connected: false }, res.error);
}

send({ type: 'GET_STATUS' }).then((r) => render(r.ok ? r.data : { connected: false }, r.ok ? undefined : r.error));
