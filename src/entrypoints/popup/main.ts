import type { PollMeta } from '@/lib/poller';
import type { PetState } from '@/lib/pet/state';
import { send, type ConnectionStatus } from '@/lib/messages';

const app = document.querySelector<HTMLElement>('#app')!;

let status: ConnectionStatus = { connected: false };
let flash: string | undefined;

async function readStored() {
  const { petState, pollMeta } = (await browser.storage.local.get(['petState', 'pollMeta'])) as {
    petState?: PetState;
    pollMeta?: PollMeta;
  };
  return { petState, pollMeta };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ago = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  return min < 1 ? 'just now' : `${min} min ago`;
};

async function render() {
  const { petState, pollMeta } = await readStored();
  app.replaceChildren();

  const add = <K extends keyof HTMLElementTagNameMap>(tag: K, text: string, parent: HTMLElement = app) => {
    const el = document.createElement(tag);
    el.textContent = text;
    parent.append(el);
    return el;
  };

  if (flash) add('p', flash).setAttribute('role', 'alert');

  if (!status.connected) {
    add('p', 'Connect Buffer to feed your feedling.');
    add('button', 'Connect Buffer').onclick = () => act('CONNECT');
    return;
  }

  add('p', `Connected as ${status.account?.name ?? 'your Buffer account'}`);

  if (pollMeta?.error) {
    const until = pollMeta.rateLimitedUntil;
    const wait = until && until > Date.now() ? ` Trying again in ${Math.ceil((until - Date.now()) / 1000)}s.` : '';
    add('p', `Couldn't reach Buffer: ${pollMeta.error}.${wait}`).setAttribute('role', 'status');
  }

  if (petState) {
    const rows: [string, string][] = [
      ['Mood', petState.mood],
      ['Fullness', `${pct(petState.fullness)} (${petState.sent} of ${petState.target} posts)`],
      ['Fridge', `${petState.fridge} scheduled`],
      ['Snacks today', `${petState.snacksToday} drafts`],
      ['Treats today', `${petState.treats} ideas`],
      ['Age', `${petState.age} days`],
      ['Sites', petState.connectedServices.join(', ') || 'none'],
      ['Updated', ago(petState.updatedAt)],
    ];
    const dl = document.createElement('dl');
    for (const [k, v] of rows) {
      add('dt', k, dl);
      add('dd', v, dl);
    }
    app.append(dl);
  } else {
    add('p', 'Your feedling is warming up…');
  }

  add('button', 'Refresh now').onclick = () => act('REFRESH_NOW');
  add('button', 'Disconnect').onclick = () => act('DISCONNECT');
}

async function act(type: 'CONNECT' | 'DISCONNECT' | 'REFRESH_NOW') {
  app.setAttribute('aria-busy', 'true');
  const res = await send({ type });
  app.removeAttribute('aria-busy');
  if (res.ok) {
    flash = undefined;
    status = res.data;
  } else {
    flash = res.error;
    const cur = await send({ type: 'GET_STATUS' });
    status = cur.ok ? cur.data : { connected: false };
  }
  await render();
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ('petState' in changes || 'pollMeta' in changes)) void render();
});

send({ type: 'GET_STATUS' }).then((r) => {
  if (r.ok) status = r.data;
  else flash = r.error;
  return render();
});
