import { mountPet } from '@/lib/overlay/pet';

const SITE_HOST = 'sproutling.pet';

// The Buffer app, plus our own site as a live demo (without the sign-in and refresh pages)
export default defineContentScript({
  matches: ['*://publish.buffer.com/*', `*://${SITE_HOST}/*`],
  excludeMatches: [`*://${SITE_HOST}/callback*`, `*://${SITE_HOST}/refresh*`],
  main() {
    return mountPet({ nudges: location.hostname === SITE_HOST });
  },
});
