import { pixelRing, ringShadow } from '../lib/overlay/focus-ring';
import { KEY_STEP_PX, clampPos, keyPos, type Pos } from '../lib/overlay/position';
import { createSprite } from '../lib/overlay/sprite';
import { WANDER_IDLE_MS, WANDER_HOME_PX, createWanderer } from '../lib/overlay/wander';
import { createWalker, dirFromEvent, type Dir } from '../lib/overlay/walk';

const SCALE = 3;
const HINT_MS = 9000;
const ARROW_KEY: Record<Dir, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

const CSS = `
  .sp-dock { position: fixed; z-index: 40; line-height: 0; opacity: 0; transition: opacity 0.4s; }
  .sp-dock[data-ready] { opacity: 1; }
  .sp-pet { position: relative; z-index: 1; display: block; padding: 0; margin: 0; background: none; border: 0; border-radius: 8px; cursor: pointer; }
  .sp-pet:focus-visible { outline: none; }
  .sp-pet canvas { image-rendering: pixelated; display: block; }
  .sp-halo { display: none; position: absolute; z-index: 0; width: 2px; height: 2px; pointer-events: none; }
  .sp-dock:has(.sp-pet:focus-visible) .sp-halo { display: block; }
  .sp-hint { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); margin-bottom: 6px; padding: 6px 10px; border: 2px solid #1f1a24; border-radius: 8px; background: #fffdf7; color: #1f1a24; font: 600 13px/1.3 system-ui, sans-serif; white-space: nowrap; pointer-events: none; transition: opacity 0.3s; }
  .sp-hint[hidden] { display: none; }
  @media (forced-colors: active) {
    .sp-pet:focus-visible { outline: 3px solid Highlight; outline-offset: 2px; }
    .sp-halo { display: none !important; }
  }
`;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

async function mount() {
  if (document.documentElement.hasAttribute('data-sproutling-extension')) return;

  const sprite = await createSprite('idle', SCALE);
  const style = document.createElement('style');
  style.textContent = CSS;
  const dock = document.createElement('div');
  dock.className = 'sp-dock';
  const pet = document.createElement('button');
  pet.className = 'sp-pet';
  pet.type = 'button';
  pet.setAttribute('aria-label', 'Sproutling, a pixel pet. Press W, A, S or D to walk it around the page.');
  const halo = document.createElement('div');
  halo.className = 'sp-halo';
  halo.setAttribute('aria-hidden', 'true');
  const hint = document.createElement('div');
  hint.className = 'sp-hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'WASD to walk me · Esc to let me be';
  pet.append(sprite.canvas);
  dock.append(halo, hint, pet);
  document.head.append(style);
  document.body.append(dock);

  const ring = pixelRing(15, 5);
  const unit = SCALE;
  halo.style.boxShadow = ringShadow(ring, unit, '#6fd3a5', '#1f1a24');
  halo.style.left = `${(sprite.canvas.width - ring.width * unit) / 2}px`;
  halo.style.top = `${sprite.canvas.height - 9.5 * unit}px`;

  const size = { w: sprite.canvas.width, h: sprite.canvas.height };
  const view = () => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const walker = createWalker();
  const wanderer = createWanderer();
  const held: Dir[] = [];
  let pos: Pos = { right: 32, bottom: WANDER_HOME_PX };
  let anim = 'idle';
  let lastInput = performance.now();
  let lastFrame = 0;
  let raf = 0;
  let keysOn = true;

  const place = () => {
    pos = clampPos(pos, view(), size);
    dock.style.right = `${pos.right}px`;
    dock.style.bottom = `${pos.bottom}px`;
  };
  const show = (name: string) => {
    if (name === anim) return;
    anim = name;
    sprite.setAnimation(name);
  };
  const touched = () => {
    lastInput = performance.now();
    wanderer.reset();
    hint.hidden = true;
  };

  function frame(now: number) {
    const dt = Math.min(now - lastFrame, 64);
    lastFrame = now;
    const wandering = !held.length && !reduced.matches && now - lastInput >= WANDER_IDLE_MS;
    const input = held.length ? held : wandering ? wanderer.tick(dt, pos, view(), size) : [];
    const t = walker.tick(input, dt, view(), size);
    if (t.pos.right !== pos.right || t.pos.bottom !== pos.bottom) {
      pos = t.pos;
      place();
    }
    show(t.state === 'idle' ? 'idle' : `walk-${t.facing}`);
    raf = requestAnimationFrame(frame);
  }
  const start = () => {
    if (raf || document.hidden) return;
    walker.start(pos);
    lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    held.length = 0;
    show('idle');
  };

  place();
  requestAnimationFrame(() => (dock.dataset.ready = ''));
  if (matchMedia('(hover: hover)').matches) {
    hint.hidden = false;
    setTimeout(() => (hint.hidden = true), HINT_MS);
  } else hint.hidden = true;

  // WASD works anywhere on the page until Esc; arrows only while the pet itself has focus
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && keysOn) {
      keysOn = false;
      held.length = 0;
      hint.hidden = true;
      return;
    }
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
    const dir = dirFromEvent(e);
    if (!dir) return;
    const arrow = e.key.startsWith('Arrow');
    const focused = document.activeElement === pet;
    if (arrow ? !focused : !keysOn && !focused) return;
    e.preventDefault();
    touched();
    if (reduced.matches) {
      pos = keyPos(pos, ARROW_KEY[dir], KEY_STEP_PX)!;
      place();
      walker.start(pos);
      return;
    }
    if (e.repeat || held.includes(dir)) return;
    held.push(dir);
    start();
  });
  window.addEventListener('keyup', (e) => {
    const dir = dirFromEvent(e);
    const i = dir ? held.indexOf(dir) : -1;
    if (i >= 0) held.splice(i, 1);
    touched();
  });
  window.addEventListener('blur', () => (held.length = 0));
  pet.addEventListener('click', () => {
    keysOn = true;
    pet.focus();
    touched();
  });
  window.addEventListener('resize', () => {
    place();
    walker.start(pos);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  // Extension installed after all: its pet has the real mood, so ours leaves
  new MutationObserver(() => {
    if (!document.documentElement.hasAttribute('data-sproutling-extension')) return;
    stop();
    sprite.destroy();
    dock.remove();
    style.remove();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-sproutling-extension'] });

  start();
}

// Content scripts run around DOMContentLoaded, so wait a beat before deciding to show up
const go = () => setTimeout(() => void mount(), 300);
if (document.readyState === 'complete') go();
else window.addEventListener('load', go, { once: true });
