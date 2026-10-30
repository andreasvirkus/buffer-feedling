export const OVERLAY_TAG = 'buffer-feedling';

export function mountOverlay(): { root: ShadowRoot; destroy: () => void } {
  const host = document.createElement(OVERLAY_TAG);
  const root = host.attachShadow({ mode: 'closed' });
  document.documentElement.append(host);

  // SPAs can rip out foreign nodes on navigation
  const observer = new MutationObserver(() => {
    if (!host.isConnected) document.documentElement.append(host);
  });
  observer.observe(document.documentElement, { childList: true });

  return {
    root,
    destroy() {
      observer.disconnect();
      host.remove();
    },
  };
}
