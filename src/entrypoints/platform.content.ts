import { mountPet } from '@/lib/overlay/pet';

// Registered at runtime for the sites the user grants. No matches here: WXT would copy them
// into host_permissions, turning every opt-in site into an install-time permission.
export default defineContentScript({
  registration: 'runtime',
  matches: [],
  main() {
    if (window.top === window) return mountPet({ nudges: true });
  },
});
