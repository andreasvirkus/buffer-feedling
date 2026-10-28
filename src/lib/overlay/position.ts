export interface Pos {
  right: number;
  bottom: number;
}

export const DEFAULT_POS: Pos = { right: 16, bottom: 16 };
export const DRAG_THRESHOLD_PX = 4;
export const KEY_STEP_PX = 16;

interface Box {
  w: number;
  h: number;
}

/** Keep the whole pet on screen */
export function clampPos(p: Pos, view: Box, size: Box): Pos {
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), Math.max(max, 0)));
  return { right: clamp(p.right, view.w - size.w), bottom: clamp(p.bottom, view.h - size.h) };
}

// Anchored to the bottom-right corner, so moving the pointer right shrinks `right`
export const dragPos = (start: Pos, dx: number, dy: number): Pos => ({ right: start.right - dx, bottom: start.bottom - dy });

export const isDrag = (dx: number, dy: number) => Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

export function keyPos(p: Pos, key: string, step = KEY_STEP_PX): Pos | null {
  const dir = ARROWS[key];
  return dir ? dragPos(p, dir[0] * step, dir[1] * step) : null;
}

/** Whether a popover fits above the pet; otherwise it opens below */
export const popoverSide = (p: Pos, view: Box, size: Box, needed = 200): 'above' | 'below' =>
  view.h - (p.bottom + size.h) >= needed ? 'above' : 'below';

export const isPos = (v: unknown): v is Pos =>
  !!v && typeof v === 'object' && Number.isFinite((v as Pos).right) && Number.isFinite((v as Pos).bottom);
