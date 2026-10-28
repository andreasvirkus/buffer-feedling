import { describe, expect, it } from 'vitest';
import { clampPos, dragPos, isDrag, isPos, keyPos, popoverSide } from './position';

const view = { w: 1000, h: 800 };
const size = { w: 64, h: 64 };

describe('clampPos', () => {
  it('leaves an on-screen position alone', () => expect(clampPos({ right: 16, bottom: 16 }, view, size)).toEqual({ right: 16, bottom: 16 }));
  it('pulls it back inside every edge', () => {
    expect(clampPos({ right: -20, bottom: -5 }, view, size)).toEqual({ right: 0, bottom: 0 });
    expect(clampPos({ right: 5000, bottom: 5000 }, view, size)).toEqual({ right: 936, bottom: 736 });
  });
  it('survives a viewport smaller than the pet', () => expect(clampPos({ right: 10, bottom: 10 }, { w: 40, h: 40 }, size)).toEqual({ right: 0, bottom: 0 }));
});

describe('dragging', () => {
  it('moving right and down shrinks the offsets', () => expect(dragPos({ right: 100, bottom: 100 }, 30, 10)).toEqual({ right: 70, bottom: 90 }));
  it('treats tiny movement as a click', () => {
    expect(isDrag(1, 2)).toBe(false);
    expect(isDrag(3, 3)).toBe(true);
  });
});

describe('keyPos', () => {
  it('moves by arrow key', () => {
    expect(keyPos({ right: 50, bottom: 50 }, 'ArrowLeft')).toEqual({ right: 66, bottom: 50 });
    expect(keyPos({ right: 50, bottom: 50 }, 'ArrowUp')).toEqual({ right: 50, bottom: 66 });
  });
  it('ignores other keys', () => expect(keyPos({ right: 50, bottom: 50 }, 'a')).toBeNull());
});

describe('popoverSide', () => {
  it('opens above when there is room', () => expect(popoverSide({ right: 16, bottom: 16 }, view, size)).toBe('above'));
  it('opens below near the top', () => expect(popoverSide({ right: 16, bottom: 700 }, view, size)).toBe('below'));
});

describe('isPos', () => {
  it('validates stored data', () => {
    expect(isPos({ right: 1, bottom: 2 })).toBe(true);
    expect(isPos({ right: 'x', bottom: 2 })).toBe(false);
    expect(isPos(null)).toBe(false);
  });
});
