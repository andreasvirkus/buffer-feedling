import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./sound-data', () => ({
  CHIRPS: ['data:audio/mpeg;base64,AAAA', 'data:audio/mpeg;base64,BBBB'],
  WALK_LOOP: 'data:audio/mpeg;base64,CCCC',
}));

interface FakeSource {
  loop: boolean;
  started: boolean;
  stopped: boolean;
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
      loop: false,
      started: false,
      stopped: false,
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

beforeEach(() => {
  sources = [];
  state = 'running';
  vi.stubGlobal('AudioContext', FakeContext);
});

const load = async () => (await import('./audio')).createSounds();

describe('walking loop', () => {
  it('plays one looping source, however many times it is started', async () => {
    const s = await load();
    await Promise.all([s.startWalk(), s.startWalk(), s.startWalk()]);
    await s.startWalk();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ loop: true, started: true, stopped: false });
  });

  it('stops when the walk ends, and starts a fresh loop next time', async () => {
    const s = await load();
    await s.startWalk();
    s.stopWalk();
    expect(sources[0]!.stopped).toBe(true);
    await s.startWalk();
    expect(sources).toHaveLength(2);
    expect(sources[1]!.stopped).toBe(false);
  });

  it('does not start if the walk ended while the clip was still decoding', async () => {
    const s = await load();
    const starting = s.startWalk();
    s.stopWalk();
    await starting;
    expect(sources).toHaveLength(0);
  });

  it('stays silent until the page has had a user interaction', async () => {
    state = 'suspended';
    const s = await load();
    await s.startWalk();
    await s.chirp();
    expect(sources).toHaveLength(0);
  });

  it('stopping with nothing playing is harmless', async () => {
    const s = await load();
    expect(() => s.stopWalk()).not.toThrow();
  });
});

describe('chirps', () => {
  it('plays a single one-shot, not a loop', async () => {
    const s = await load();
    await s.chirp();
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({ loop: false, started: true });
  });

  it('can overlap a walking loop', async () => {
    const s = await load();
    await s.startWalk();
    await s.chirp();
    expect(sources).toHaveLength(2);
    expect(sources[0]!.stopped).toBe(false);
  });
});
