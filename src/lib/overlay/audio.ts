import { createBag } from '../pet/nudges';
import { CHIRPS, STEPS } from './sound-data';
import { stepRate } from './walk';

const VOLUME = { chirp: 0.5, step: 0.4 };

function toBuffer(dataUrl: string): ArrayBuffer {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

/** Chirps and footsteps through WebAudio: decoded in-process, so page CSP can't block it, and
 *  created lazily because browsers only let a page start audio after the user has interacted. */
export function createSounds() {
  let ctx: AudioContext | undefined;
  const decoded = new Map<string, Promise<AudioBuffer>>();
  // Shuffle bags: every clip before any repeats, never the same twice in a row
  const bags = { chirp: createBag(CHIRPS), step: createBag(STEPS) };

  async function buffer(url: string) {
    if (!decoded.has(url)) decoded.set(url, ctx!.decodeAudioData(toBuffer(url)));
    return decoded.get(url)!;
  }

  return {
    async play(kind: 'chirp' | 'step') {
      try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        if (ctx.state !== 'running') return; // no user activation yet: stay quiet
        const url = bags[kind]()!;
        const buf = await buffer(url);
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        gain.gain.value = VOLUME[kind];
        if (kind === 'step') src.playbackRate.value = stepRate(buf.duration);
        src.connect(gain).connect(ctx.destination);
        src.start();
      } catch {
        // audio is a nicety; never let it break the pet
      }
    },
  };
}
