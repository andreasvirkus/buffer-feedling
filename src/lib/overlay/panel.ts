import type { Mood, PetState } from '../pet/state';

export const PANEL_CSS = `
  .panel { position: absolute; right: 0; bottom: calc(100% + 10px); width: 244px; box-sizing: border-box; padding: 12px;
    display: grid; gap: 8px; text-align: left; font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #1f1a24; background: #fffdf7; border: 2px solid #1f1a24; border-radius: 6px; box-shadow: 3px 3px 0 #1f1a24; }
  .panel[hidden] { display: none; }
  .panel h2 { margin: 0; font-size: 14px; }
  .panel p { margin: 0; }
  .panel .tip { color: #6a6572; font-size: 12px; }
  .panel .row { display: flex; gap: 6px; }
  .panel .btn { flex: 1; min-height: 32px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center;
    font: inherit; font-weight: 600; white-space: nowrap; text-decoration: none; color: #1f1a24; background: #fffdf7; border: 2px solid #1f1a24;
    border-radius: 6px; cursor: pointer; box-sizing: border-box; }
  .panel .btn:hover { background: #f1ead6; }
  .panel .btn.primary { color: #fff; background: #2f8f6b; border-color: #1f1a24; }
  .panel .btn:focus-visible { outline: 2px solid #2f8f6b; outline-offset: 2px; }
`;

const FEELING: Record<Mood, string> = {
  hungry: 'a little hungry',
  content: 'content',
  full: 'nicely full',
  sleepy: 'sleepy',
  eating: 'munching away',
};

const BUFFER_URL = 'https://publish.buffer.com/';

export function createPanel(parent: ParentNode, opts: { id: string; onNap: (napping: boolean) => void; onClose: () => void }) {
  const el = document.createElement('section');
  el.id = opts.id;
  el.className = 'panel';
  el.hidden = true;
  el.setAttribute('aria-label', 'Sproutling');

  const title = Object.assign(document.createElement('h2'), { textContent: 'Sproutling' });
  const status = document.createElement('p');
  const open = Object.assign(document.createElement('a'), {
    className: 'btn primary',
    href: BUFFER_URL,
    target: '_blank',
    rel: 'noopener noreferrer',
    textContent: 'Open Buffer',
  });
  const nap = Object.assign(document.createElement('button'), { className: 'btn', type: 'button' });
  const row = document.createElement('div');
  row.className = 'row';
  row.append(open, nap);
  const tip = Object.assign(document.createElement('p'), {
    className: 'tip',
    textContent: 'Drag me anywhere, or focus me and walk me around with the arrow keys or WASD.',
  });
  el.append(title, status, row, tip);
  parent.append(el);

  let napping = false;
  nap.addEventListener('click', () => opts.onNap(!napping));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') opts.onClose();
  });

  return {
    el,
    get isOpen() {
      return !el.hidden;
    },
    show: () => void (el.hidden = false),
    hide: () => void (el.hidden = true),
    update(state: PetState | undefined, mood: Mood, isNapping: boolean, connected: boolean) {
      napping = isNapping;
      status.textContent = isNapping
        ? 'Napping. Sweet dreams.'
        : !connected
          ? 'Keeping you company. Connect Buffer from the toolbar icon and I\u2019ll watch your streak too.'
          : state
          ? `Feeling ${FEELING[mood]}. ${state.sent} of ${state.target} posts.`
          : 'Waiting to be connected.';
      nap.textContent = isNapping ? 'Wake me up' : 'Let me nap';
    },
  };
}
