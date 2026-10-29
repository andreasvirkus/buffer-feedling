import { describe, expect, it } from 'vitest';
import { allSitePatterns, grantedServices, isVisitable, sitePatterns } from './sites';

describe('sites', () => {
  it('maps a service to its patterns', () => expect(sitePatterns('linkedin')).toEqual(['*://*.linkedin.com/*']));
  it('includes Substack', () => expect(sitePatterns('substack')).toEqual(['*://*.substack.com/*']));
  it('covers both X domains', () => expect(sitePatterns('twitter')).toHaveLength(2));
  it('returns nothing for services without a fixed domain', () => {
    expect(sitePatterns('mastodon')).toEqual([]);
    expect(isVisitable('mastodon')).toBe(false);
    expect(isVisitable('linkedin')).toBe(true);
  });
  it('has no duplicate patterns', () => {
    const all = allSitePatterns();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('grantedServices', () => {
  it('needs every pattern of a service', () => {
    expect(grantedServices(['*://*.x.com/*'])).toEqual([]);
    expect(grantedServices(['*://*.x.com/*', '*://*.twitter.com/*', '*://bsky.app/*'])).toEqual(['twitter', 'bluesky']);
  });
  it('ignores unrelated origins', () => expect(grantedServices(['https://api.buffer.com/*'])).toEqual([]));
});
