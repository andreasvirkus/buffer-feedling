import { describe, expect, it } from 'vitest';
import { pixelRing, ringShadow } from './focus-ring';

describe('pixelRing', () => {
  const p = pixelRing(15, 4);

  it('is symmetric left to right and top to bottom', () => {
    const cells = new Set(p.ring.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of p.ring) {
      expect(cells.has(`${p.width - 1 - x},${y}`)).toBe(true);
      expect(cells.has(`${x},${p.height - 1 - y}`)).toBe(true);
    }
  });
  it('is hollow in the middle', () => {
    const cells = new Set(p.ring.map(([x, y]) => `${x},${y}`));
    expect(cells.has(`${(p.width - 1) / 2},${(p.height - 1) / 2}`)).toBe(false);
  });
  it('keeps the outline off the ring', () => {
    const ring = new Set(p.ring.map(([x, y]) => `${x},${y}`));
    expect(p.edge.every(([x, y]) => !ring.has(`${x},${y}`))).toBe(true);
  });
  it('stays inside its own box', () => {
    for (const [x, y] of [...p.ring, ...p.edge]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(p.width);
      expect(y).toBeLessThan(p.height);
    }
  });
  it('outlines both sides of the band', () => {
    const edge = new Set(p.edge.map(([x, y]) => `${x},${y}`));
    const mid = (p.height - 1) / 2;
    // the hole's inner edge and the outer edge on the left side both carry outline
    const leftEdges = [...edge].filter((k) => k.endsWith(`,${mid}`)).map((k) => Number(k.split(',')[0]));
    expect(leftEdges.filter((x) => x < p.width / 2).length).toBeGreaterThanOrEqual(2);
  });
});

describe('ringShadow', () => {
  it('turns cells into pixel-sized offsets', () => {
    const css = ringShadow({ width: 3, height: 3, ring: [[1, 1]], edge: [[0, 1]] }, 2, '#0f0', '#000');
    expect(css).toBe('2px 2px 0 #0f0,0px 2px 0 #000');
  });
});
