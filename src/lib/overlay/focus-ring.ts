const key = (x: number, y: number) => `${x},${y}`;

export interface PixelRing {
  /** Edge-to-edge size in grid units, outline included */
  width: number;
  height: number;
  ring: [number, number][];
  edge: [number, number][];
}

/** A flat, stepped ellipse on a pixel grid with a one-pixel outline on both sides,
 *  so it reads against light and dark pages alike */
export function pixelRing(rx: number, ry: number, thickness = 2): PixelRing {
  const inside = (x: number, y: number, a: number, b: number) => (x / a) ** 2 + (y / b) ** 2 <= 1;
  const ring = new Set<string>();
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      // half a cell of slack flattens the single-cell spurs at the extremes
      if (inside(x, y, rx + 0.5, ry + 0.5) && !inside(x, y, rx - thickness + 0.5, ry - thickness + 0.5)) ring.add(key(x, y));
    }
  }
  const edge = new Set<string>();
  for (const k of ring) {
    const [x, y] = k.split(',').map(Number) as [number, number];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const n = key(x + dx, y + dy);
      if (!ring.has(n)) edge.add(n);
    }
  }
  // Shift into positive coordinates, leaving room for the outline
  const shift = (set: Set<string>) =>
    [...set].map((k) => {
      const [x, y] = k.split(',').map(Number) as [number, number];
      return [x + rx + 1, y + ry + 1] as [number, number];
    });
  return { width: 2 * rx + 3, height: 2 * ry + 3, ring: shift(ring), edge: shift(edge) };
}

/** box-shadow list drawing each grid cell as a `unit`-px square; the host element is one cell wide */
export function ringShadow(p: PixelRing, unit: number, ringColor: string, edgeColor: string): string {
  const cell = ([x, y]: [number, number], c: string) => `${x * unit}px ${y * unit}px 0 ${c}`;
  return [...p.ring.map((c) => cell(c, ringColor)), ...p.edge.map((c) => cell(c, edgeColor))].join(',');
}
