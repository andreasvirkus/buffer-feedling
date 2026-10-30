import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sound-data', () => ({
  CHIRPS: ['data:audio/mpeg;base64,AAAA', 'data:audio/mpeg;base64,BBBB'],
  STEPS: ['data:audio/mpeg;base64,CCCC', 'data:audio/mpeg;base64,DDDD', 'data:audio/mpeg;base64,EEEE'],
  WALK_PHRASE: 'data:audio/mpeg;base64,FFFF',
}));

interface FakeSource {
  started: boolean;
  stopped: boolean;
  rate: number;
  onended: (() => void) | null;
}

let sources: FakeSource[];
let state: 'running' | 'suspended';

class FakeContext {
  currentTime = 0;
  destination = {};
  get state() {
    return state;
  }
  resume = async () => {};
  decodeAudioData = async () => ({ duration: 0.5 });
  createGain = () => {
    const node = { gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect: () => node };
    return node;
  };
  createBufferSource = () => {
    const src = {
      buffer: null,
      started: false,
      stopped: false,
      onended: null as (() => void) | null,
      playbackRate: { value: 1 },
      get rate() {
        return src.playbackRate.value;
      },
      connect: (n: unknown) => n,
      start() {
        src.started = true;
      },
      stop() {
        src.stopped = true;
      },
    };
    sources.push(src);
    return src;
  };
}

// With Math.random fixed at 0.5: first mumble after 425 ms, a single step at rate 0.925,
// and 1750 ms of silence after each one finishes
const FIRST = 425;
const PAUSE = 1750;

beforeEach(() => {
  sources = [];
  state = 'running';
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.stubGlobal('AudioContext', FakeContext);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const load = async () => (await import('./audio')).createSounds();
const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe('walking mumbles', () => {
  it('stays silent for a quick tap of a key', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST - 100);
    s.stopWalk();
    await wait(10_000);
    expect(sources).toHaveLength(0);
  });

  it('mumbles once shortly after the walk starts, at natural speed or slower', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.started).toBe(true);
    expect(sources[0]!.rate).toBeLessThanOrEqual(1);
    expect(sources[0]!.rate).toBeGreaterThanOrEqual(0.85);
  });

  it('never starts another while one is still sounding', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    await wait(30_000);
    expect(sources).toHaveLength(1);
  });

  it('leaves a silence after each one before the next', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    sources[0]!.onended?.();
    await wait(PAUSE - 100);
    expect(sources).toHaveLength(1);
    await wait(200);
    expect(sources).toHaveLength(2);
  });

  it('is not started twice by repeated start calls (e.g. adding a second direction)', async () => {
    const s = await load();
    s.startWalk();
    s.startWalk();
    s.startWalk();
    await wait(FIRST + 50);
    expect(sources).toHaveLength(1);
  });

  it('stops the current one and cancels the next when the walk ends', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    s.stopWalk();
    expect(sources[0]!.stopped).toBe(true);
    await wait(30_000);
    expect(sources).toHaveLength(1);
  });

  it('can walk again after stopping', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    s.stopWalk();
    s.startWalk();
    await wait(FIRST + 50);
    expect(sources).toHaveLength(2);
  });

  it('stays silent until the page has had a user interaction, then tries again', async () => {
    state = 'suspended';
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    expect(sources).toHaveLength(0);
    state = 'running';
    await wait(1100);
    expect(sources).toHaveLength(1);
  });

  it('stopping with nothing playing is harmless', async () => {
    const s = await load();
    expect(() => s.stopWalk()).not.toThrow();
  });
});

describe('chirps', () => {
  it('plays a single one-shot', async () => {
    const s = await load();
    await s.chirp();
    expect(sources).toHaveLength(1);
    expect(sources[0]!.started).toBe(true);
  });

  it('can sound alongside a walking mumble without stopping it', async () => {
    const s = await load();
    s.startWalk();
    await wait(FIRST + 50);
    await s.chirp();
    expect(sources).toHaveLength(2);
    expect(sources[0]!.stopped).toBe(false);
  });

  it('stays silent before the page has had a user interaction', async () => {
    state = 'suspended';
    const s = await load();
    await s.chirp();
    expect(sources).toHaveLength(0);
  });
});
