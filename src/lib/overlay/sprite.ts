interface SheetMeta {
  frameSize: number;
  frames: { x: number; ms: number }[];
  blink?: { x: number; everyMs: number; ms: number };
}

interface Animation {
  meta: SheetMeta;
  sheet: HTMLImageElement;
}

const SCALE = 2; // integer only, anything else blurs
const NAMES = ['idle', 'hungry', 'sleepy', 'full', 'eating'];

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

async function loadAnimation(name: string): Promise<[string, Animation]> {
  const base = browser.runtime.getURL(`/sprites/sproutling-${name}` as never);
  const [meta, sheet] = await Promise.all([
    fetch(`${base}.json`).then((r) => r.json() as Promise<SheetMeta>),
    loadImage(`${base}-sheet.png`),
  ]);
  return [name, { meta, sheet }];
}

export async function createSprite(initial: string) {
  const anims = new Map(await Promise.all(NAMES.map(loadAnimation)));
  const size = anims.get('idle')!.meta.frameSize;

  const canvas = document.createElement('canvas');
  canvas.width = size * SCALE;
  canvas.height = size * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = anims.get(initial) ?? anims.get('idle')!;
  let currentName = anims.has(initial) ? initial : 'idle';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let nextBlinkAt = 0;

  const draw = (x: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(current.sheet, x, 0, size, size, 0, 0, canvas.width, canvas.height);
  };

  function tick() {
    const { meta } = current;
    const now = performance.now();
    if (meta.blink && now >= nextBlinkAt) {
      nextBlinkAt = now + meta.blink.everyMs;
      draw(meta.blink.x);
      timer = setTimeout(tick, meta.blink.ms);
      return;
    }
    const f = meta.frames[frame % meta.frames.length]!;
    draw(f.x);
    frame = (frame + 1) % meta.frames.length;
    timer = setTimeout(tick, f.ms);
  }

  function sync() {
    clearTimeout(timer);
    frame = 0;
    if (reduced.matches || document.hidden) {
      draw(current.meta.frames[0]!.x);
      return;
    }
    nextBlinkAt = performance.now() + (current.meta.blink?.everyMs ?? 0);
    tick();
  }

  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  sync();

  return {
    canvas,
    setAnimation(name: string) {
      const next = anims.get(name);
      if (!next || name === currentName) return;
      current = next;
      currentName = name;
      sync();
    },
    destroy() {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
    },
  };
}
