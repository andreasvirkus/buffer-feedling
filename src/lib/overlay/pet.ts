import { send } from '@/lib/messages';
import { displayMood, EATING_MS, spriteName, type Mood, type PetState } from '@/lib/pet/state';
import { canNudge, createBag, HUNGRY_NUDGES, NUDGES } from '../pet/nudges';
import { createSounds } from './audio';
import { soundsAllowed } from './sound-gate';
import { BUBBLE_CSS, createBubble } from './bubble';
import { pixelRing, ringShadow } from './focus-ring';
import { OVERLAY_TAG, mountOverlay } from './host';
import { PANEL_CSS, createPanel } from './panel';
import { DEFAULT_POS, clampPos, dragPos, isDrag, isPos, keyPos, popoverSide, type Pos } from './position';
import { watchScroll } from './scroll-nudges';
import { createSprite } from './sprite';
import { createWalker, dirFromEvent, type Dir, type WalkTick } from './walk';

const CSS = `
  :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
  .dock { position: fixed; pointer-events: auto; line-height: 0; }
  .pet { position: relative; z-index: 1; display: block; padding: 0; margin: 0; background: none; border: 0; border-radius: 8px; cursor: grab; touch-action: none; }
  .pet:active { cursor: grabbing; }
  .pet:focus-visible { outline: none; }
  .halo { display: none; position: absolute; z-index: 0; width: 2px; height: 2px; pointer-events: none; }
  .dock:has(.pet:focus-visible) .halo { display: block; }
  @media (forced-colors: active) {
    .pet:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
    .halo { display: none !important; }
  }
  canvas { image-rendering: pixelated; display: block; }
  ${BUBBLE_CSS}
  ${PANEL_CSS}
`;

// WXT's content script context: tells us when the extension has been reloaded or updated underneath us
interface Context {
  onInvalidated(cb: () => void): unknown;
}

export async function mountPet({ nudges = false, ctx }: { nudges?: boolean; ctx?: Context } = {}) {
  const overlay = mountOverlay();
  const root = overlay.root;
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
  const halo = document.createElement('div');
  halo.className = 'halo';
  halo.setAttribute('aria-hidden', 'true');
  dock.append(halo, pet);
  root.append(style, dock);

  const stored = await browser.storage.local.get(['petState', 'account', 'napping', 'petPositions', 'nudgesEnabled', 'soundsEnabled']);
  let state = stored.petState as PetState | undefined;
  // Works without Buffer too: just the company and the nudges
  let connected = !!stored.account;

  const hint = () => connected && void send({ type: 'POLL_HINT' }).catch(() => {});
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && hint());
  hint();
  let napping = stored.napping === true;
  let nudgesOn = stored.nudgesEnabled !== false;
  let soundsOn = stored.soundsEnabled !== false;
  const sounds = createSounds();
  const readSettings = () => browser.storage.local.get(['soundsEnabled', 'napping']) as Promise<{ soundsEnabled?: boolean; napping?: boolean }>;
  const chirp = () => {
    if (!soundsOn || napping) return;
    void soundsAllowed(readSettings).then((ok) => {
      if (ok) void sounds.chirp();
    });
  };
  let walking = false; // true for as long as it walks, whichever way it faces
  const setWalkSound = (on: boolean) => {
    if (on === walking) return;
    walking = on;
    if (!on) return sounds.stopWalk();
    if (!soundsOn || napping) return;
    void soundsAllowed(readSettings).then((ok) => {
      if (ok && walking) sounds.startWalk();
    });
  };
  const saved = (stored.petPositions as Record<string, unknown> | undefined)?.[location.hostname];
  let pos: Pos = isPos(saved) ? saved : DEFAULT_POS;

  const currentMood = (): Mood => (napping ? 'sleepy' : !connected ? 'content' : state ? displayMood(state, Date.now()) : 'sleepy');
  const sprite = await createSprite(spriteName(currentMood()));
  pet.append(sprite.canvas);
  // A ring on the ground under the pet, in sprite pixels, outlined so it shows on any background
  const ring = pixelRing(15, 5);
  const unit = 2;
  halo.style.boxShadow = ringShadow(ring, unit, '#6fd3a5', '#1f1a24');
  halo.style.left = `${(sprite.canvas.width - ring.width * unit) / 2}px`;
  halo.style.top = `${sprite.canvas.height - 19}px`;
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
    panel.update(state, currentMood(), napping, connected);
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
    else {
      chirp();
      togglePanel();
    }
  });
  // Walking: arrows or WASD while the pet has focus. Bumping into an edge walks in place for a few
  // cycles, then it turns to face you.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ARROW_KEY: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  const walker = createWalker();
  const held: Dir[] = [];
  let walkAnim: string | null = null;
  let raf = 0;
  let lastFrame = 0;

  function showWalk(t: WalkTick) {
    const anim = t.state === 'idle' ? null : `walk-${t.facing}`;
    if (anim === walkAnim) return;
    walkAnim = anim;
    apply();
  }

  function frame(now: number) {
    const t = walker.tick(held, Math.min(now - lastFrame, 64), view(), size());
    lastFrame = now;
    pos = t.pos;
    place();
    showWalk(t);
    setWalkSound(t.state !== 'idle');
    if (held.length || t.state !== 'idle') raf = requestAnimationFrame(frame);
    else {
      raf = 0;
      setWalkSound(false);
      void savePos();
    }
  }

  pet.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.isOpen) {
      e.stopPropagation();
      closePanel();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = dirFromEvent(e);
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    if (reducedMotion.matches) {
      // No walking animation: hop a step at a time
      pos = keyPos(pos, ARROW_KEY[dir])!;
      place();
      void savePos();
      return;
    }
    if (e.repeat || held.includes(dir)) return;
    held.push(dir);
    if (!raf) {
      closePanel();
      bubble.hide();
      walker.start(pos);
      lastFrame = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  pet.addEventListener('keyup', (e) => {
    const dir = dirFromEvent(e);
    if (!dir) return;
    e.stopPropagation();
    const i = held.indexOf(dir);
    if (i >= 0) held.splice(i, 1);
  });
  pet.addEventListener('blur', () => (held.length = 0));

  let eatTimer: ReturnType<typeof setTimeout> | undefined;
  function apply() {
    clearTimeout(eatTimer);
    const mood = currentMood();
    sprite.setAnimation(walkAnim ?? spriteName(mood));
    pet.setAttribute(
      'aria-label',
      napping
        ? 'Sproutling is napping'
        : !connected
          ? 'Sproutling is keeping you company'
          : state
            ? `Sproutling is ${mood}: ${state.sent} of ${state.target} posts this week`
            : 'Sproutling is waking up',
    );
    if (panel.isOpen) panel.update(state, mood, napping, connected);
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
      chirp();
      return true;
    });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('nudgesEnabled' in changes) nudgesOn = changes.nudgesEnabled!.newValue !== false;
    if ('soundsEnabled' in changes) {
      soundsOn = changes.soundsEnabled!.newValue !== false;
      if (!soundsOn) sounds.stopWalk();
    }
    if ('napping' in changes) {
      napping = changes.napping!.newValue === true;
      if (napping) {
        bubble.hide();
        sounds.stopWalk();
      }
    }
    if ('petState' in changes) state = changes.petState!.newValue as PetState | undefined;
    if ('account' in changes) connected = !!changes.account!.newValue;
    if ('petState' in changes || 'napping' in changes || 'account' in changes) apply();
  });

  // After a reload or update this copy can no longer hear the extension, so it leaves quietly
  // instead of lingering with stale settings. A fresh copy arrives with the next page load.
  ctx?.onInvalidated(() => {
    sounds.stopWalk();
    cancelAnimationFrame(raf);
    sprite.destroy();
    overlay.destroy();
  });
}
