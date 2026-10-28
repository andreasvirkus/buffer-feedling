import { mountPet } from '@/lib/overlay/pet';

export default defineContentScript({
  matches: ['*://publish.buffer.com/*'],
  main: mountPet,
});
