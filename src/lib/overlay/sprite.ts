interface SheetMeta {
  frameSize: number;
  frames: { x: number; ms: number }[];
  blink: { x: number; everyMs: number; ms: number };
}

const SCALE = 2; // integer only, anything else blurs

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function createIdleSprite(): Promise<{ canvas: HTMLCanvasElement; destroy(): void }> {
  const base = browser.runtime.getURL('/sprites/sproutling-idle' as never);
  const [meta, sheet] = await Promise.all([
    fetch(`${base}.json`).then((r) => r.json() as Promise<SheetMeta>),
    loadImage(`${base}-sheet.png`),
  ]);

  const size = meta.frameSize;
  const canvas = document.createElement('canvas');
  canvas.width = size * SCALE;
  canvas.height = size * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const draw = (x: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sheet, x, 0, size, size, 0, 0, canvas.width, canvas.height);
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let nextBlinkAt = 0;

  function tick() {
    const now = performance.now();
    if (now >= nextBlinkAt) {
      nextBlinkAt = now + meta.blink.everyMs;
      draw(meta.blink.x);
      timer = setTimeout(tick, meta.blink.ms);
      return;
    }
    const f = meta.frames[frame]!;
    draw(f.x);
    frame = (frame + 1) % meta.frames.length;
    timer = setTimeout(tick, f.ms);
  }

  function sync() {
    clearTimeout(timer);
    if (reduced.matches || document.hidden) {
      draw(meta.frames[0]!.x);
      return;
    }
    nextBlinkAt = performance.now() + meta.blink.everyMs;
    tick();
  }

  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();

  return {
    canvas,
    destroy() {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
    },
  };
}
