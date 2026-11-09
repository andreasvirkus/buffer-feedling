import { describe, expect, it } from 'vitest';
import { WANDER_HOME_PX, createWanderer } from './wander';

const view = { w: 1000, h: 800 };
const size = { w: 96, h: 96 };
const home = { right: 400, bottom: WANDER_HOME_PX };

describe('createWanderer', () => {
  it('only ever heads left or right along the bottom', () => {
    const w = createWanderer(() => 0.5);
    const seen = new Set<string>();
    for (let t = 0; t < 60_000; t += 16) for (const d of w.tick(16, home, view, size)) seen.add(d);
    expect(seen.size).toBeGreaterThan(0);
    expect([...seen].every((d) => d === 'left' || d === 'right')).toBe(true);
  });

  it('pauses between walks', () => {
    const w = createWanderer(() => 0.5);
    const frames = Array.from({ length: 2000 }, () => w.tick(16, home, view, size));
    expect(frames.some((f) => f.length === 0)).toBe(true);
    expect(frames.some((f) => f.length === 1)).toBe(true);
  });

  it('walks back down first when it was left up in the air', () => {
    const w = createWanderer(() => 0.5);
    expect(w.tick(16, { right: 400, bottom: 300 }, view, size)).toEqual(['down']);
  });

  it('turns around at the left wall instead of bumping', () => {
    const w = createWanderer(() => 0); // heading left, shortest spans
    w.tick(16, home, view, size);
    let dirs: string[] = [];
    for (let i = 0; i < 400 && dirs[0] !== 'left'; i++) dirs = w.tick(16, home, view, size);
    expect(dirs).toEqual(['left']);
    const wall = { right: view.w - size.w, bottom: WANDER_HOME_PX };
    expect(w.tick(16, wall, view, size)).toEqual([]);
    let next: string[] = [];
    for (let i = 0; i < 400 && !next.length; i++) next = w.tick(16, wall, view, size);
    expect(next).toEqual(['right']);
  });

  it('turns around at the right wall', () => {
    const w = createWanderer(() => 0.99); // heading right
    const wall = { right: 0, bottom: WANDER_HOME_PX };
    let next: string[] = [];
    for (let i = 0; i < 1000 && !next.length; i++) next = w.tick(16, wall, view, size);
    expect(next).toEqual(['left']);
  });
});
