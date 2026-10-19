const TAG = 'buffer-feedling';

export function mountOverlay(): ShadowRoot {
  const host = document.createElement(TAG);
  const root = host.attachShadow({ mode: 'closed' });
  document.documentElement.append(host);

  // SPAs can rip out foreign nodes on navigation
  new MutationObserver(() => {
    if (!host.isConnected) document.documentElement.append(host);
  }).observe(document.documentElement, { childList: true });

  return root;
}
