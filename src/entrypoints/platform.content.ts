import { allSitePatterns } from '@/lib/platforms/sites';
import { mountPet } from '@/lib/overlay/pet';

// Registered at runtime for the sites the user has granted
export default defineContentScript({
  registration: 'runtime',
  matches: allSitePatterns(),
  main() {
    if (window.top === window) return mountPet();
  },
});
