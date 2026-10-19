import { send } from '@/lib/messages';
import { mountOverlay } from '@/lib/overlay/host';
import { createSprite } from '@/lib/overlay/sprite';
import { displayMood, EATING_MS, petLabel, spriteName, type PetState } from '@/lib/pet/state';

export default defineContentScript({
  matches: ['*://publish.buffer.com/*'],
  async main() {
    const root = mountOverlay();
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
      .pet { position: fixed; right: 16px; bottom: 16px; pointer-events: auto; line-height: 0; }
      canvas { image-rendering: pixelated; display: block; }
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

    browser.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !('petState' in changes)) return;
      state = changes.petState!.newValue as PetState | undefined;
      apply();
    });
  },
});
