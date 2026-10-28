import { send } from '@/lib/messages';
import { displayMood, EATING_MS, spriteName, type Mood, type PetState } from '@/lib/pet/state';
import { canNudge, createBag, HUNGRY_NUDGES, NUDGES } from '../pet/nudges';
import { BUBBLE_CSS, createBubble } from './bubble';
import { OVERLAY_TAG, mountOverlay } from './host';
import { PANEL_CSS, createPanel } from './panel';
import { DEFAULT_POS, clampPos, dragPos, isDrag, isPos, keyPos, popoverSide, type Pos } from './position';
import { watchScroll } from './scroll-nudges';
import { createSprite } from './sprite';

const CSS = `
  :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
  .dock { position: fixed; pointer-events: auto; line-height: 0; }
  .pet { display: block; padding: 0; margin: 0; background: none; border: 0; border-radius: 8px; cursor: grab; touch-action: none; }
  .pet:active { cursor: grabbing; }
  .pet:focus-visible { outline: 2px solid #2f8f6b; outline-offset: 2px; }
  canvas { image-rendering: pixelated; display: block; }
  ${BUBBLE_CSS}
  ${PANEL_CSS}
`;

export async function mountPet({ nudges = false } = {}) {
  const root = mountOverlay();
  const style = document.createElement('style');
  style.textContent = CSS;
  const dock = document.createElement('div');
  dock.className = 'dock';
  const pet = document.createElement('button');
  pet.className = 'pet';
  pet.type = 'button';
  pet.setAttribute('aria-haspopup', 'true');
  pet.setAttribute('aria-expanded', 'false');
  pet.setAttribute('aria-controls', 'panel');
  dock.append(pet);
  root.append(style, dock);

  const hint = () => void send({ type: 'POLL_HINT' }).catch(() => {});
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && hint());
  hint();

  const stored = await browser.storage.local.get(['petState', 'napping', 'petPositions', 'nudgesEnabled']);
  let state = stored.petState as PetState | undefined;
  let napping = stored.napping === true;
  let nudgesOn = stored.nudgesEnabled !== false;
  const saved = (stored.petPositions as Record<string, unknown> | undefined)?.[location.hostname];
  let pos: Pos = isPos(saved) ? saved : DEFAULT_POS;

  const currentMood = (): Mood => (napping ? 'sleepy' : state ? displayMood(state, Date.now()) : 'sleepy');
  const sprite = await createSprite(spriteName(currentMood()));
  pet.append(sprite.canvas);
  const size = () => ({ w: sprite.canvas.width, h: sprite.canvas.height });
  const view = () => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight });

  function place() {
    pos = clampPos(pos, view(), size());
    dock.style.right = `${pos.right}px`;
    dock.style.bottom = `${pos.bottom}px`;
    dock.dataset.side = popoverSide(pos, view(), size());
  }
  place();
  window.addEventListener('resize', place);

  async function savePos() {
    const { petPositions } = (await browser.storage.local.get('petPositions')) as { petPositions?: Record<string, Pos> };
    await browser.storage.local.set({ petPositions: { ...petPositions, [location.hostname]: pos } });
  }

  const bubble = createBubble(dock);
  const panel = createPanel(dock, {
    id: 'panel',
    onNap: (next) => void browser.storage.local.set({ napping: next }),
    onClose: () => {
      closePanel();
      pet.focus();
    },
  });

  function closePanel() {
    panel.hide();
    pet.setAttribute('aria-expanded', 'false');
  }
  function togglePanel() {
    if (panel.isOpen) return closePanel();
    bubble.hide();
    panel.update(state, currentMood(), napping);
    panel.show();
    pet.setAttribute('aria-expanded', 'true');
  }

  // Closed shadow root: clicks inside show up retargeted to the host element
  document.addEventListener('pointerdown', (e) => {
    if (panel.isOpen && (e.target as Element)?.localName !== OVERLAY_TAG) closePanel();
  });

  let drag: { x: number; y: number; from: Pos } | undefined;
  let moved = false;
  pet.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, from: pos };
    moved = false;
    pet.setPointerCapture(e.pointerId);
  });
  pet.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!moved && !isDrag(dx, dy)) return;
    if (!moved) {
      moved = true;
      closePanel();
    }
    pos = dragPos(drag.from, dx, dy);
    place();
  });
  const endDrag = () => {
    if (drag && moved) void savePos();
    drag = undefined;
  };
  pet.addEventListener('pointerup', endDrag);
  pet.addEventListener('pointercancel', endDrag);
  // A drag ends in a click on the same element; only a real click opens the panel
  pet.addEventListener('click', () => {
    if (moved) moved = false;
    else togglePanel();
  });
  pet.addEventListener('keydown', (e) => {
    const next = keyPos(pos, e.key);
    if (!next) return;
    e.preventDefault();
    pos = next;
    place();
    void savePos();
  });

  let eatTimer: ReturnType<typeof setTimeout> | undefined;
  function apply() {
    clearTimeout(eatTimer);
    const mood = currentMood();
    sprite.setAnimation(spriteName(mood));
    pet.setAttribute(
      'aria-label',
      napping ? 'Sproutling is napping' : state ? `Sproutling is ${mood}: ${state.sent} of ${state.target} posts this week` : 'Sproutling is waiting to be connected',
    );
    if (panel.isOpen) panel.update(state, mood, napping);
    if (!napping && mood === 'eating' && state?.lastFedAt) {
      eatTimer = setTimeout(apply, Date.parse(state.lastFedAt) + EATING_MS - Date.now() + 50);
    }
  }
  apply();

  if (nudges) {
    const bag = createBag(NUDGES);
    const hungryBag = createBag(HUNGRY_NUDGES);

    watchScroll(async () => {
      if (!nudgesOn || napping) return false;
      // Shared across tabs so several open feeds don't each take a turn
      const { lastNudgeAt } = (await browser.storage.local.get('lastNudgeAt')) as { lastNudgeAt?: number };
      if (!canNudge(lastNudgeAt, Date.now())) return false;
      await browser.storage.local.set({ lastNudgeAt: Date.now() });
      const hungry = state && displayMood(state, Date.now()) === 'hungry';
      const line = hungry && Math.random() < 0.3 ? hungryBag() : bag();
      if (!line || panel.isOpen) return false;
      bubble.show(line);
      return true;
    });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('nudgesEnabled' in changes) nudgesOn = changes.nudgesEnabled!.newValue !== false;
    if ('napping' in changes) {
      napping = changes.napping!.newValue === true;
      if (napping) bubble.hide();
    }
    if ('petState' in changes) state = changes.petState!.newValue as PetState | undefined;
    if ('petState' in changes || 'napping' in changes) apply();
  });
}
