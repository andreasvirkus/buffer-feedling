import type { Pos } from './position';
import type { Dir } from './walk';

export const WANDER_IDLE_MS = 4000;
export const WANDER_HOME_PX = 16;
const EDGE_MARGIN_PX = 24;
const WALK_MS: [number, number] = [1500, 4500];
const PAUSE_MS: [number, number] = [1200, 3500];

interface Box {
  w: number;
  h: number;
}

/** Idle stroll along the bottom edge: a stretch, a pause, turn around before the walls.
 *  Feeds the same walker as the keys, so the gait is identical. */
export function createWanderer(random: () => number = Math.random) {
  let phase: 'walk' | 'pause' = 'pause';
  let heading: 'left' | 'right' = random() < 0.5 ? 'left' : 'right';
  let remaining = 0;

  const span = ([min, max]: [number, number]) => min + random() * (max - min);

  return {
    reset() {
      phase = 'pause';
      remaining = 0;
    },

    /** Directions to hold this frame. Position is anchored bottom-right: heading left grows `right`. */
    tick(dtMs: number, pos: Pos, view: Box, size: Box): Dir[] {
      if (pos.bottom > WANDER_HOME_PX) return ['down'];

      const maxRight = Math.max(view.w - size.w, 0);
      const atLeftWall = pos.right >= maxRight - EDGE_MARGIN_PX;
      const atRightWall = pos.right <= EDGE_MARGIN_PX;

      remaining -= dtMs;
      if (phase === 'walk' && ((heading === 'left' && atLeftWall) || (heading === 'right' && atRightWall))) {
        heading = heading === 'left' ? 'right' : 'left';
        phase = 'pause';
        remaining = span(PAUSE_MS);
      } else if (remaining <= 0) {
        phase = phase === 'walk' ? 'pause' : 'walk';
        remaining = span(phase === 'walk' ? WALK_MS : PAUSE_MS);
        if (phase === 'walk') {
          if (atLeftWall) heading = 'right';
          else if (atRightWall) heading = 'left';
          else if (random() < 0.4) heading = heading === 'left' ? 'right' : 'left';
        }
      }
      return phase === 'walk' ? [heading] : [];
    },
  };
}
