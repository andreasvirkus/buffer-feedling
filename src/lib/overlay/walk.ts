import type { Pos } from './position';

export type Dir = 'up' | 'down' | 'left' | 'right';
export type WalkState = 'idle' | 'walking' | 'bumping';

export const WALK_SPEED_PX_S = 150;
export const WALK_CYCLE_MS = 480; // one full loop of the 4-frame walk sheet
export const BUMP_CYCLES_MIN = 3;
export const BUMP_CYCLES_MAX = 5;

const ARROWS: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
// Physical positions, so WASD works on any keyboard layout
const WASD: Record<string, Dir> = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };

export const dirFromEvent = (e: { key: string; code: string }): Dir | null => ARROWS[e.key] ?? WASD[e.code] ?? null;

interface Box {
  w: number;
  h: number;
}

export interface WalkTick {
  pos: Pos;
  state: WalkState;
  facing: Dir | 'down';
}

/** Walks the pet around the viewport, bumping politely into the edges.
 *  Position is anchored bottom-right, so heading right or down shrinks the offsets. */
export function createWalker(random: () => number = Math.random) {
  let fr = 0;
  let fb = 0;
  let bump: { dir: Dir; remainingMs: number } | null = null;
  const suppressed = new Set<Dir>();

  const idle = (): WalkTick => ({ pos: { right: Math.round(fr), bottom: Math.round(fb) }, state: 'idle', facing: 'down' });

  return {
    start(pos: Pos) {
      fr = pos.right;
      fb = pos.bottom;
      bump = null;
    },

    /** held: directions currently pressed, oldest first */
    tick(held: readonly Dir[], dtMs: number, view: Box, size: Box): WalkTick {
      for (const d of [...suppressed]) if (!held.includes(d)) suppressed.delete(d);
      const active = held.filter((d) => !suppressed.has(d));

      if (bump) {
        if (!held.includes(bump.dir)) bump = null;
        else {
          bump.remainingMs -= dtMs;
          if (bump.remainingMs > 0) return { pos: idle().pos, state: 'bumping', facing: bump.dir };
          suppressed.add(bump.dir);
          bump = null;
          return idle();
        }
      }

      const vx = Number(active.includes('right')) - Number(active.includes('left'));
      const vy = Number(active.includes('down')) - Number(active.includes('up'));
      if (!vx && !vy) return idle();

      const dist = ((WALK_SPEED_PX_S * dtMs) / 1000) / (vx && vy ? Math.SQRT2 : 1);
      const maxR = Math.max(view.w - size.w, 0);
      const maxB = Math.max(view.h - size.h, 0);
      const nr = Math.min(Math.max(fr - vx * dist, 0), maxR);
      const nb = Math.min(Math.max(fb - vy * dist, 0), maxB);
      const moved = Math.abs(nr - fr) > 1e-6 || Math.abs(nb - fb) > 1e-6;
      fr = nr;
      fb = nb;

      const facing = active[active.length - 1]!;
      if (moved) return { pos: idle().pos, state: 'walking', facing };

      const cycles = BUMP_CYCLES_MIN + Math.floor(random() * (BUMP_CYCLES_MAX - BUMP_CYCLES_MIN + 1));
      bump = { dir: facing, remainingMs: cycles * WALK_CYCLE_MS };
      return { pos: idle().pos, state: 'bumping', facing };
    },
  };
}
