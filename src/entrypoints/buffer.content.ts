import { send } from '@/lib/messages';
import { mountOverlay } from '@/lib/overlay/host';
import { createIdleSprite } from '@/lib/overlay/sprite';

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
    pet.setAttribute('aria-label', 'Buffer Feedling');
    root.append(style, pet);

    const hint = () => void send({ type: 'POLL_HINT' }).catch(() => {});
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && hint());
    hint();

    const { canvas } = await createIdleSprite();
    pet.append(canvas);
  },
});
