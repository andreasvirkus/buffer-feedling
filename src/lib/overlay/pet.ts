import { send } from '@/lib/messages';
import { displayMood, EATING_MS, petLabel, spriteName, type PetState } from '@/lib/pet/state';
import { canNudge, createBag, HUNGRY_NUDGES, NUDGES } from '../pet/nudges';
import { BUBBLE_CSS, createBubble } from './bubble';
import { mountOverlay } from './host';
import { watchScroll } from './scroll-nudges';
import { createSprite } from './sprite';

export async function mountPet({ nudges = false } = {}) {
  const root = mountOverlay();
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
    .pet { position: fixed; right: 16px; bottom: 16px; pointer-events: auto; line-height: 0; }
    canvas { image-rendering: pixelated; display: block; }
    ${BUBBLE_CSS}
  `;
  const pet = document.createElement('div');
  pet.className = 'pet';
  pet.setAttribute('role', 'img');
  root.append(style, pet);

  const hint = () => void send({ type: 'POLL_HINT' }).catch(() => {});
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && hint());
  hint();

  let state: PetState | undefined = ((await browser.storage.local.get('petState')).petState as PetState | undefined);
  const sprite = await createSprite(state ? spriteName(displayMood(state, Date.now())) : 'sleepy');
  pet.append(sprite.canvas);

  let eatTimer: ReturnType<typeof setTimeout> | undefined;
  function apply() {
    clearTimeout(eatTimer);
    const mood = state ? displayMood(state, Date.now()) : 'sleepy';
    sprite.setAnimation(spriteName(mood));
    pet.setAttribute('aria-label', petLabel(state, mood));
    if (mood === 'eating' && state?.lastFedAt) {
      eatTimer = setTimeout(apply, Date.parse(state.lastFedAt) + EATING_MS - Date.now() + 50);
    }
  }
  apply();

  let nudgesOn = true;
  if (nudges) {
    nudgesOn = (await browser.storage.local.get('nudgesEnabled')).nudgesEnabled !== false;
    const bubble = createBubble(root);
    const bag = createBag(NUDGES);
    const hungryBag = createBag(HUNGRY_NUDGES);

    watchScroll(async () => {
      if (!nudgesOn) return;
      // Shared across tabs so several open feeds don't each take a turn
      const { lastNudgeAt } = (await browser.storage.local.get('lastNudgeAt')) as { lastNudgeAt?: number };
      if (!canNudge(lastNudgeAt, Date.now())) return;
      await browser.storage.local.set({ lastNudgeAt: Date.now() });
      const hungry = state && displayMood(state, Date.now()) === 'hungry';
      const line = hungry && Math.random() < 0.3 ? hungryBag() : bag();
      if (line) bubble.show(line);
    });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('nudgesEnabled' in changes) nudgesOn = changes.nudgesEnabled!.newValue !== false;
    if ('petState' in changes) {
      state = changes.petState!.newValue as PetState | undefined;
      apply();
    }
  });
}
