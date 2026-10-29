import { describe, expect, it } from 'vitest';
import { BUMP_CYCLES_MAX, BUMP_CYCLES_MIN, WALK_CYCLE_MS, WALK_SPEED_PX_S, createWalker, dirFromEvent, type Dir } from './walk';

const view = { w: 1000, h: 800 };
const size = { w: 64, h: 64 };
const start = { right: 500, bottom: 400 };

const walker = (random = () => 0) => {
  const w = createWalker(random);
  w.start(start);
  return w;
};

describe('dirFromEvent', () => {
  it('reads arrows and WASD', () => {
    expect(dirFromEvent({ key: 'ArrowLeft', code: 'ArrowLeft' })).toBe('left');
    expect(dirFromEvent({ key: 'w', code: 'KeyW' })).toBe('up');
    expect(dirFromEvent({ key: 'D', code: 'KeyD' })).toBe('right');
  });
  it('uses the physical key, so other layouts still work', () => expect(dirFromEvent({ key: 'ä', code: 'KeyA' })).toBe('left'));
  it('ignores everything else', () => expect(dirFromEvent({ key: 'x', code: 'KeyX' })).toBeNull());
});

describe('walking', () => {
  it('heading right shrinks the right offset at the walking speed', () => {
    const t = walker().tick(['right'], 1000, view, size);
    expect(t).toMatchObject({ state: 'walking', facing: 'right' });
    expect(t.pos.right).toBe(500 - WALK_SPEED_PX_S);
    expect(t.pos.bottom).toBe(400);
  });
  it('heading up grows the bottom offset', () => expect(walker().tick(['up'], 1000, view, size).pos.bottom).toBe(400 + WALK_SPEED_PX_S));
  it('faces the most recently pressed key', () => expect(walker().tick(['right', 'up'], 16, view, size).facing).toBe('up'));
  it('slows each axis on diagonals', () => {
    const t = walker().tick(['left', 'up'], 1000, view, size);
    expect(t.pos.right).toBe(Math.round(500 + WALK_SPEED_PX_S / Math.SQRT2));
  });
  it('opposite keys cancel out', () => expect(walker().tick(['left', 'right'], 100, view, size).state).toBe('idle'));
  it('is idle and facing us with nothing held', () => expect(walker().tick([], 16, view, size)).toMatchObject({ state: 'idle', facing: 'down' }));
  it('keeps small frames from rounding to a standstill', () => {
    const w = walker();
    let t = w.tick(['right'], 4, view, size);
    for (let i = 0; i < 100; i++) t = w.tick(['right'], 4, view, size);
    expect(t.pos.right).toBeLessThan(start.right);
  });
});

describe('hitting a wall', () => {
  const atRightWall = () => {
    const w = createWalker(() => 0);
    w.start({ right: 0, bottom: 400 });
    return w;
  };

  it('walks in place instead of leaving the screen', () => {
    const t = atRightWall().tick(['right'], 16, view, size);
    expect(t).toMatchObject({ state: 'bumping', facing: 'right', pos: { right: 0, bottom: 400 } });
  });
  it('bumps for the chosen number of cycles, then stops facing us', () => {
    for (const [r, cycles] of [[0, BUMP_CYCLES_MIN], [0.99, BUMP_CYCLES_MAX]] as const) {
      const w = createWalker(() => r);
      w.start({ right: 0, bottom: 400 });
      w.tick(['right'], 16, view, size);
      expect(w.tick(['right'], cycles * WALK_CYCLE_MS - 20, view, size).state).toBe('bumping');
      expect(w.tick(['right'], 40, view, size)).toMatchObject({ state: 'idle', facing: 'down' });
    }
  });
  it('stays put while the key is still held after the bump', () => {
    const w = atRightWall();
    w.tick(['right'], 16, view, size);
    w.tick(['right'], BUMP_CYCLES_MAX * WALK_CYCLE_MS, view, size);
    expect(w.tick(['right'], 16, view, size).state).toBe('idle');
    expect(w.tick(['right'], 16, view, size).state).toBe('idle');
  });
  it('tries again after the key is released and pressed again', () => {
    const w = atRightWall();
    w.tick(['right'], 16, view, size);
    w.tick(['right'], BUMP_CYCLES_MAX * WALK_CYCLE_MS, view, size);
    w.tick([], 16, view, size);
    expect(w.tick(['right'], 16, view, size).state).toBe('bumping');
  });
  it('can walk away from the wall straight after', () => {
    const w = atRightWall();
    w.tick(['right'], 16, view, size);
    w.tick(['right'], BUMP_CYCLES_MAX * WALK_CYCLE_MS, view, size);
    // right is still held but spent; left takes over at once
    expect(w.tick(['right', 'left'], 100, view, size)).toMatchObject({ state: 'walking', facing: 'left' });
  });
  it('releasing the key cancels the bump', () => {
    const w = atRightWall();
    w.tick(['right'], 16, view, size);
    expect(w.tick([], 16, view, size).state).toBe('idle');
  });
  it('slides along a wall on diagonals without bumping', () => {
    const w = atRightWall();
    const t = w.tick(['right', 'up'], 1000, view, size);
    expect(t.state).toBe('walking');
    expect(t.pos.right).toBe(0);
    expect(t.pos.bottom).toBeGreaterThan(400);
  });
  it('bumps at every edge', () => {
    const edges: [Dir, { right: number; bottom: number }][] = [
      ['left', { right: view.w - size.w, bottom: 300 }],
      ['up', { right: 300, bottom: view.h - size.h }],
      ['down', { right: 300, bottom: 0 }],
    ];
    for (const [dir, pos] of edges) {
      const w = createWalker(() => 0);
      w.start(pos);
      expect(w.tick([dir], 16, view, size)).toMatchObject({ state: 'bumping', facing: dir });
    }
  });
});
