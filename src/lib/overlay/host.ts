export const OVERLAY_TAG = 'buffer-feedling';

export function mountOverlay(): ShadowRoot {
  const host = document.createElement(OVERLAY_TAG);
  const root = host.attachShadow({ mode: 'closed' });
  document.documentElement.append(host);

  // SPAs can rip out foreign nodes on navigation
  new MutationObserver(() => {
    if (!host.isConnected) document.documentElement.append(host);
  }).observe(document.documentElement, { childList: true });

  return root;
}
