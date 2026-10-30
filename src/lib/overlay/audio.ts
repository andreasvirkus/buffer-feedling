import { createBag } from '../pet/nudges';
import { CHIRPS, WALK_LOOP } from './sound-data';

const CHIRP_VOLUME = 0.5;
const WALK_VOLUME = 0.35;
const RAMP_S = 0.08; // fade the loop in and out so starting and stopping never click

function toBuffer(dataUrl: string): ArrayBuffer {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

/** Chirps and a walking loop through WebAudio: decoded in-process, so page CSP can't block it, and
 *  created lazily because browsers only let a page start audio after the user has interacted. */
export function createSounds() {
  let ctx: AudioContext | undefined;
  const decoded = new Map<string, Promise<AudioBuffer>>();
  const nextChirp = createBag(CHIRPS); // every chirp before any repeats, never the same twice in a row

  // One walking loop at most, however often start is called or whatever the direction does
  let wanted = false;
  let loop: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  async function ready() {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running' ? ctx : null; // no user activation yet: stay quiet
  }

  function buffer(url: string) {
    if (!decoded.has(url)) decoded.set(url, ctx!.decodeAudioData(toBuffer(url)));
    return decoded.get(url)!;
  }

  return {
    async chirp() {
      try {
        const c = await ready();
        if (!c) return;
        const buf = await buffer(nextChirp()!);
        const src = c.createBufferSource();
        const gain = c.createGain();
        src.buffer = buf;
        gain.gain.value = CHIRP_VOLUME;
        src.connect(gain).connect(c.destination);
        src.start();
      } catch {
        // audio is a nicety; never let it break the pet
      }
    },

    async startWalk() {
      wanted = true;
      if (loop) return;
      try {
        const c = await ready();
        if (!c) return;
        const buf = await buffer(WALK_LOOP);
        if (!wanted || loop) return; // stopped, or another start won, while decoding
        const src = c.createBufferSource();
        const gain = c.createGain();
        src.buffer = buf;
        src.loop = true;
        gain.gain.setValueAtTime(0, c.currentTime);
        gain.gain.linearRampToValueAtTime(WALK_VOLUME, c.currentTime + RAMP_S);
        src.connect(gain).connect(c.destination);
        src.start();
        loop = { src, gain };
      } catch {
        // see above
      }
    },

    stopWalk() {
      wanted = false;
      if (!loop || !ctx) return;
      const { src, gain } = loop;
      loop = null;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + RAMP_S);
      src.stop(ctx.currentTime + RAMP_S + 0.02);
    },
  };
}
