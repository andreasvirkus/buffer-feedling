const SHOW_MS = 9_000;

export const BUBBLE_CSS = `
  .bubble { position: fixed; right: 16px; bottom: 90px; max-width: min(240px, calc(100vw - 32px)); box-sizing: border-box;
    display: flex; gap: 6px; align-items: flex-start; padding: 8px 8px 8px 12px;
    font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f1a24; background: #fffdf7;
    border: 2px solid #1f1a24; border-radius: 6px; box-shadow: 3px 3px 0 #1f1a24;
    opacity: 0; transform: translateY(4px); pointer-events: none; transition: opacity .15s ease, transform .15s ease; }
  .bubble::after { content: ''; position: absolute; right: 22px; bottom: -9px; width: 10px; height: 10px; box-sizing: border-box;
    background: #fffdf7; border: solid #1f1a24; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .bubble[data-open] { opacity: 1; transform: none; pointer-events: auto; }
  .bubble p { margin: 0; flex: 1; text-align: left; }
  .bubble button { flex: none; width: 28px; height: 28px; margin: -4px -2px 0 0; padding: 0; font: inherit; font-size: 18px; line-height: 1;
    color: inherit; background: none; border: 0; border-radius: 4px; cursor: pointer; }
  .bubble button:hover { background: #f1ead6; }
  .bubble button:focus-visible { outline: 2px solid #2f8f6b; outline-offset: 1px; }
  @media (prefers-reduced-motion: reduce) { .bubble { transition: none; transform: none; } }
`;

export function createBubble(root: ShadowRoot) {
  const el = document.createElement('div');
  el.className = 'bubble';
  el.setAttribute('role', 'status'); // stays in the tree so text changes get announced
  const text = document.createElement('p');
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Dismiss');
  el.append(text, close);
  root.append(el);

  let timer: ReturnType<typeof setTimeout> | undefined;
  let hovering = false;

  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide();
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(hide, SHOW_MS);
  };

  function hide() {
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    el.removeAttribute('data-open');
    text.textContent = '';
  }

  function show(message: string) {
    text.textContent = message;
    el.setAttribute('data-open', '');
    document.addEventListener('keydown', onKey);
    arm();
  }

  close.addEventListener('click', hide);
  // Don't pull the bubble away while it's being read
  el.addEventListener('pointerenter', () => ((hovering = true), clearTimeout(timer)));
  el.addEventListener('pointerleave', () => ((hovering = false), el.hasAttribute('data-open') && arm()));
  el.addEventListener('focusin', () => clearTimeout(timer));
  el.addEventListener('focusout', () => !hovering && el.hasAttribute('data-open') && arm());

  return { show, hide };
}
