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

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<'className' | 'textContent', string>> & { attrs?: Record<string, string> } = {},
  ...kids: (Node | string)[]
) {
  const el = document.createElement(tag);
  const { attrs, ...rest } = props;
  Object.assign(el, rest);
  for (const [k, v] of Object.entries(attrs ?? {})) el.setAttribute(k, v);
  el.append(...kids);
  return el;
}

const button = (label: string, onClick: () => void, primary = false) => {
  const b = h('button', { textContent: label, className: primary ? 'primary' : '', attrs: { type: 'button' } });
  b.onclick = onClick;
  return b;
};

const SERVICE_LABEL: Record<string, string> = {
  twitter: 'X',
  linkedin: 'LinkedIn',
  googlebusiness: 'Google Business',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};
const serviceLabel = (s: string) => SERVICE_LABEL[s] ?? s[0]!.toUpperCase() + s.slice(1);

// content/full/eating have no sprite of their own yet
const SPRITE: Record<string, string> = { hungry: 'hungry', sleepy: 'sleepy' };
const sprite = (mood: string) =>
  h(
    'div',
    { className: 'sprite' },
    h('img', { attrs: { src: `/sprites/sproutling-${SPRITE[mood] ?? 'idle'}.png`, alt: '', width: '32', height: '32' } }),
  );

async function render() {
  const { petState, pollMeta } = await readStored();
  const nodes: Node[] = [];

  if (flash) nodes.push(h('p', { className: 'banner', textContent: flash, attrs: { role: 'alert' } }));

  if (!status.connected) {
    nodes.push(
      h(
        'div',
        { className: 'hero' },
        sprite('sleepy'),
        h('div', {}, h('h1', { textContent: 'Feedling' }), h('p', { className: 'lede', textContent: 'Connect Buffer to wake your pet up.' })),
      ),
      button('Connect Buffer', () => act('CONNECT'), true),
    );
    return app.replaceChildren(...nodes);
  }

  if (pollMeta?.error) {
    const until = pollMeta.rateLimitedUntil;
    const wait = until && until > Date.now() ? ` Trying again in ${Math.ceil((until - Date.now()) / 1000)}s.` : '';
    nodes.push(h('p', { className: 'banner', textContent: `Couldn't reach Buffer: ${pollMeta.error}.${wait}`, attrs: { role: 'status' } }));
  }

  if (petState) {
    const { mood, fullness, sent, target } = petState;
    nodes.push(
      h(
        'div',
        { className: 'hero' },
        sprite(mood),
        h('div', {}, h('h1', { textContent: 'Feedling' }), h('span', { className: 'chip', textContent: mood, attrs: { 'data-mood': mood } })),
      ),
      h(
        'div',
        { className: 'card' },
        h('div', { className: 'meter-head' }, h('span', { textContent: 'Fullness' }), h('span', { textContent: `${sent} of ${target} posts · ${pct(fullness)}` })),
        h(
          'div',
          { className: 'meter', attrs: { role: 'meter', 'aria-label': 'Fullness', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(fullness * 100)) } },
          Object.assign(h('div'), { style: `width:${pct(fullness)}` }),
        ),
      ),
      h(
        'dl',
        { className: 'card stats' },
        ...(
          [
            ['Fridge', petState.fridge],
            ['Snacks', petState.snacksToday],
            ['Treats', petState.treats],
            ['Days', petState.age],
          ] as const
        ).map(([k, v]) => h('div', {}, h('dt', { textContent: k }), h('dd', { textContent: String(v) }))),
      ),
    );
    if (petState.connectedServices.length) {
      nodes.push(h('ul', { className: 'sites', attrs: { 'aria-label': 'Connected sites' } }, ...petState.connectedServices.map((s) => h('li', { textContent: serviceLabel(s) }))));
    }
    nodes.push(h('p', { className: 'foot', textContent: `Connected as ${status.account?.name ?? 'your Buffer account'} · updated ${ago(petState.updatedAt)}` }));
  } else {
    nodes.push(
      h(
        'div',
        { className: 'hero' },
        sprite('sleepy'),
        h('div', {}, h('h1', { textContent: 'Feedling' }), h('p', { className: 'lede', textContent: 'Warming up…' })),
      ),
      h('p', { className: 'foot', textContent: `Connected as ${status.account?.name ?? 'your Buffer account'}` }),
    );
  }

  nodes.push(h('div', { className: 'actions' }, button('Refresh', () => act('REFRESH_NOW')), button('Disconnect', () => act('DISCONNECT'))));
  app.replaceChildren(...nodes);
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
