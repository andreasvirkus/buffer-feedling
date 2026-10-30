import { createBag } from '../pet/nudges';
import { createMumbler } from './mumble';
import { CHIRPS, STEPS, WALK_PHRASE } from './sound-data';

const MASTER = 0.85; // one knob for every clip
const CHIRP_VOLUME = 0.5 * MASTER;
const WALK_VOLUME = 0.35 * MASTER;
const FADE_S = 0.08; // stopping a mumble mid-way never clicks
const RETRY_MS = 1000; // while the page hasn't been interacted with yet

function toBuffer(dataUrl: string): ArrayBuffer {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

/** Chirps, and an occasional walking mumble, through WebAudio: decoded in-process, so page CSP can't
 *  block it, and created lazily because browsers only let a page start audio after the user has
 *  interacted. */
export function createSounds() {
  let ctx: AudioContext | undefined;
  const decoded = new Map<string, Promise<AudioBuffer>>();
  const nextChirp = createBag(CHIRPS); // every chirp before any repeats, never the same twice in a row
  const nextStep = createBag(STEPS);
  const mumbler = createMumbler();

  // While walking, mumbles come one at a time with a silence after each: the next is only
  // scheduled once the current one has finished, so they can never overlap or pile up.
  let wanted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let current: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  async function ready() {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running' ? ctx : null; // no user activation yet: stay quiet
  }

  function buffer(url: string) {
    if (!decoded.has(url)) decoded.set(url, ctx!.decodeAudioData(toBuffer(url)));
    return decoded.get(url)!;
  }

  function schedule(ms: number) {
    clearTimeout(timer);
    timer = setTimeout(() => void mumble(), ms);
  }

  async function mumble() {
    if (!wanted) return;
    try {
      const c = await ready();
      if (!c) return schedule(RETRY_MS);
      const m = mumbler.next();
      const buf = await buffer(m.kind === 'phrase' ? WALK_PHRASE : nextStep()!);
      if (!wanted || current) return; // stopped, or something else is already sounding
      const src = c.createBufferSource();
      const gain = c.createGain();
      src.buffer = buf;
      src.playbackRate.value = m.rate;
      gain.gain.value = WALK_VOLUME;
      src.connect(gain).connect(c.destination);
      src.onended = () => {
        if (current?.src !== src) return;
        current = null;
        if (wanted) schedule(m.pauseMs);
      };
      current = { src, gain };
      src.start();
    } catch {
      // audio is a nicety; never let it break the pet
    }
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
        // see above
      }
    },

    startWalk() {
      if (wanted) return;
      wanted = true;
      schedule(mumbler.first());
    },

    stopWalk() {
      wanted = false;
      clearTimeout(timer);
      if (!current || !ctx) return;
      const { src, gain } = current;
      current = null;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE_S);
      src.stop(ctx.currentTime + FADE_S + 0.02);
    },
  };
}
