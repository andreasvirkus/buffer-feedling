// Buffer service → the sites its pet may visit. Mastodon has no fixed domain, so no entry.
export const SITES: Record<string, string[]> = {
  twitter: ['*://*.x.com/*', '*://*.twitter.com/*'],
  linkedin: ['*://*.linkedin.com/*'],
  facebook: ['*://*.facebook.com/*'],
  instagram: ['*://*.instagram.com/*'],
  threads: ['*://*.threads.com/*', '*://*.threads.net/*'],
  tiktok: ['*://*.tiktok.com/*'],
  youtube: ['*://*.youtube.com/*'],
  pinterest: ['*://*.pinterest.com/*'],
  bluesky: ['*://bsky.app/*'],
};

export const sitePatterns = (service: string): string[] => SITES[service] ?? [];

export const allSitePatterns = (): string[] => Object.values(SITES).flat();

export const isVisitable = (service: string) => service in SITES;

/** Services whose every pattern is in the granted origin list */
export function grantedServices(granted: readonly string[]): string[] {
  const have = new Set(granted);
  return Object.keys(SITES).filter((s) => SITES[s]!.every((p) => have.has(p)));
}
