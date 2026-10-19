import { mountOverlay } from '@/lib/overlay/host';

export default defineContentScript({
  matches: ['*://publish.buffer.com/*'],
  main() {
    const root = mountOverlay();
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
      .pet { position: fixed; right: 16px; bottom: 16px; width: 48px; height: 48px;
        background: #2c4bff; image-rendering: pixelated; pointer-events: auto; }
    `;
    const pet = document.createElement('div');
    pet.className = 'pet';
    root.append(style, pet);
  },
});
