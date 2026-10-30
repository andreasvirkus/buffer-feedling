import type { PollMeta } from '@/lib/poller';
import { spriteName, type Mood, type PetState } from '@/lib/pet/state';
import { send, type ConnectionStatus } from '@/lib/messages';
import { onboardingStep, type Onboarding } from '@/lib/onboarding';
import { factLines, targetNote } from '@/lib/pet/facts';
import { SITES, grantedServices, isVisitable, sitePatterns } from '@/lib/platforms/sites';

const app = document.querySelector<HTMLElement>('#app')!;

let status: ConnectionStatus = { connected: false };
let flash: string | undefined;

async function readStored() {
  const { petState, pollMeta, authError, nudgesEnabled, soundsEnabled, onboarding } = (await browser.storage.local.get([
    'petState',
    'pollMeta',
    'authError',
    'nudgesEnabled',
    'soundsEnabled',
    'onboarding',
  ])) as {
    petState?: PetState;
    pollMeta?: PollMeta;
    authError?: string;
    nudgesEnabled?: boolean;
    soundsEnabled?: boolean;
    onboarding?: Onboarding;
  };
  return { petState, pollMeta, authError, nudgesOn: nudgesEnabled !== false, soundsOn: soundsEnabled !== false, onboarding };
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
  substack: 'Substack',
};
const serviceLabel = (s: string) => SERVICE_LABEL[s] ?? s[0]!.toUpperCase() + s.slice(1);

function siteChip(service: string, on: boolean): Node {
  if (!isVisitable(service)) return document.createTextNode(serviceLabel(service));
  const b = h('button', { textContent: serviceLabel(service), attrs: { type: 'button', 'aria-pressed': String(on) } });
  // request() needs the click's user gesture, so no awaiting before it
  b.onclick = () => {
    const origins = sitePatterns(service);
    const done = on ? browser.permissions.remove({ origins }) : browser.permissions.request({ origins });
    void done.finally(render);
  };
  return b;
}

// Granted sites stay listed so they can always be switched off, even without a matching channel
async function sitesBlock(services: string[], label: string): Promise<Node[]> {
  const granted = grantedServices((await browser.permissions.getAll()).origins ?? []);
  const shown = [...new Set([...services, ...granted])];
  if (!shown.length) return [];
  const on = new Set(granted);
  const nodes: Node[] = [
    h('ul', { className: 'sites', attrs: { 'aria-label': label } }, ...shown.map((s) => h('li', {}, siteChip(s, on.has(s))))),
  ];
  if (shown.some(isVisitable)) {
    nodes.push(h('p', { className: 'hint', textContent: 'Tap a site to let Sproutling visit it. Tap again to stop.' }));
  }
  return nodes;
}

function switchRow(key: string, title: string, hint: string, on: boolean) {
  const input = h('input', { attrs: { type: 'checkbox', role: 'switch' } });
  input.checked = on;
  input.onchange = () => void browser.storage.local.set({ [key]: input.checked });
  return h('label', { className: 'toggle' }, h('span', {}, h('strong', { textContent: title }), h('small', { textContent: hint })), input);
}

const nudgeToggle = (on: boolean) =>
  switchRow('nudgesEnabled', 'Gentle nudges', 'A kind word now and then when you scroll for a long while.', on);

const sprite = (mood: Mood) =>
  h(
    'div',
    { className: 'sprite' },
    h('img', { attrs: { src: `/sprites/sproutling-${spriteName(mood)}.png`, alt: '', width: '32', height: '32' } }),
  );

const setOnboarding = (o: Onboarding) => browser.storage.local.set({ onboarding: o });

function welcomeView(): Node[] {
  return [
    h(
      'div',
      { className: 'hero' },
      sprite('content'),
      h('div', {}, h('h1', { textContent: "Hi, I'm Sproutling" }), h('p', { className: 'lede', textContent: 'I keep you company while you post and scroll.' })),
    ),
    h('p', { className: 'lede', textContent: "I'm fed by what you post on Buffer, and I have a kind word for you when the scrolling goes on a while." }),
    h(
      'div',
      { className: 'stack' },
      button(
        'Connect Buffer',
        async () => {
          await setOnboarding({});
          await act('CONNECT');
        },
        true,
      ),
      button('Skip Buffer for now', () => void setOnboarding({ skippedBuffer: true })),
    ),
    h('p', { className: 'hint', textContent: 'Read-only access. I never post anything for you.' }),
  ];
}

async function sitesView(petState: PetState | undefined, nudgesOn: boolean): Promise<Node[]> {
  const channels = status.connected ? (petState?.connectedServices ?? []) : [];
  const noChannels = status.connected && !!petState && !channels.length;
  const nodes: Node[] = [
    h(
      'div',
      { className: 'hero' },
      sprite('content'),
      h('div', {}, h('h1', { textContent: 'Where should I hang out?' }), h('p', { className: 'lede', textContent: 'I only show up where you say.' })),
    ),
    // Before Buffer has been checked, or with no channels, offer every site
    ...(await sitesBlock(channels.length ? channels : Object.keys(SITES), 'Sites')),
  ];
  if (noChannels) {
    nodes.push(h('p', { className: 'hint', textContent: "Your Buffer account has no channels yet. Add some there and I'll learn where you post." }));
  }
  nodes.push(
    nudgeToggle(nudgesOn),
    h('div', { className: 'stack' }, button('All set', () => void setOnboarding({ done: true }), true)),
    h('p', { className: 'hint', textContent: 'You can change all of this later from this popup.' }),
  );
  return nodes;
}

async function render() {
  const { petState, pollMeta, authError, nudgesOn, onboarding } = await readStored();
  const nodes: Node[] = [];

  if (authError && !status.connected) nodes.push(h('p', { className: 'banner', textContent: `Couldn't connect: ${authError}`, attrs: { role: 'alert' } }));
  if (flash) nodes.push(h('p', { className: 'banner', textContent: flash, attrs: { role: 'alert' } }));

  const hasUsed = !!petState || grantedServices((await browser.permissions.getAll()).origins ?? []).length > 0;
  const step = onboardingStep(onboarding, { connected: status.connected, hasUsed });
  if (step === 'welcome') return app.replaceChildren(...nodes, ...welcomeView());
  if (step === 'sites') return app.replaceChildren(...nodes, ...(await sitesView(petState, nudgesOn)));

  if (!status.connected) {
    nodes.push(
      h(
        'div',
        { className: 'hero' },
        sprite('sleepy'),
        h('div', {}, h('h1', { textContent: 'Sproutling' }), h('p', { className: 'lede', textContent: 'Connect Buffer to wake your pet up.' })),
      ),
      button('Connect Buffer', () => act('CONNECT'), true),
      h('h2', { className: 'section-title', textContent: 'No Buffer? Keep me company anyway' }),
      h('p', { className: 'hint', textContent: 'Pick the sites you scroll on and Sproutling will keep you company there, with a kind word when you scroll for a good while.' }),
      ...(await sitesBlock(Object.keys(SITES), 'Sites')),
      nudgeToggle(nudgesOn),
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
        h('div', {}, h('h1', { textContent: 'Sproutling' }), h('span', { className: 'chip', textContent: mood, attrs: { 'data-mood': mood } })),
      ),
      h(
        'div',
        { className: 'card' },
        h('div', { className: 'meter-head' }, h('span', { textContent: 'Fullness' }), h('span', { textContent: `${sent} of ${target} posts` })),
        h(
          'div',
          { className: 'meter', attrs: { role: 'meter', 'aria-label': 'Fullness', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(fullness * 100)) } },
          Object.assign(h('div'), { style: `width:${pct(fullness)}` }),
        ),
        h('p', { className: 'meter-note', textContent: targetNote(petState) }),
      ),
      h('ul', { className: 'card facts', attrs: { 'aria-label': 'Right now' } }, ...factLines(petState, Date.now()).map((line) => h('li', { textContent: line }))),
    );
    const sitesNodes = await sitesBlock(petState.connectedServices, 'Connected channels');
    nodes.push(
      ...(sitesNodes.length
        ? sitesNodes
        : [h('p', { className: 'hint', textContent: "Your Buffer account has no channels yet. Add some there and I'll learn where you post." })]),
    );
    nodes.push(nudgeToggle(nudgesOn));
    nodes.push(h('p', { className: 'foot', textContent: `Connected as ${status.account?.name ?? 'your Buffer account'} · updated ${ago(petState.updatedAt)}` }));
  } else {
    nodes.push(
      h(
        'div',
        { className: 'hero' },
        sprite('sleepy'),
        h('div', {}, h('h1', { textContent: 'Sproutling' }), h('p', { className: 'lede', textContent: 'Warming up…' })),
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

browser.permissions.onAdded.addListener(() => void render());
browser.permissions.onRemoved.addListener(() => void render());

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('soundsEnabled' in changes) void syncMute();
  if ('account' in changes || 'authError' in changes) {
    void send({ type: 'GET_STATUS' }).then((r) => {
      if (r.ok) status = r.data;
      return render();
    });
  } else if ('petState' in changes || 'pollMeta' in changes || 'onboarding' in changes) void render();
});

void browser.action.setBadgeText({ text: '' });

// The mute button sits outside the rendered views, so it is kept in sync on its own
const muteButton = document.querySelector<HTMLButtonElement>('#mute')!;

async function syncMute() {
  const { soundsEnabled } = await browser.storage.local.get('soundsEnabled');
  const muted = soundsEnabled === false;
  muteButton.setAttribute('aria-pressed', String(muted));
  muteButton.title = muted ? 'Unmute sounds' : 'Mute sounds';
  muteButton.setAttribute('aria-label', muteButton.title);
}

muteButton.onclick = async () => {
  const { soundsEnabled } = await browser.storage.local.get('soundsEnabled');
  await browser.storage.local.set({ soundsEnabled: soundsEnabled === false });
};
void syncMute();

send({ type: 'GET_STATUS' }).then((r) => {
  if (r.ok) status = r.data;
  else flash = r.error;
  return render();
});
