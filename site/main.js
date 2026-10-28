const FRAME = 32;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const cache = new Map();

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function load(name) {
  if (!cache.has(name)) {
    const base = `sprites/sproutling-${name}`;
    cache.set(
      name,
      Promise.all([fetch(`${base}.json`).then((r) => r.json()), loadImage(`${base}-sheet.png`)]).then(([meta, sheet]) => ({
        meta,
        sheet,
      })),
    );
  }
  return cache.get(name);
}

// Whole-pixel frames at an integer scale, so nothing blurs
function player(canvas, scale) {
  canvas.width = FRAME * scale;
  canvas.height = FRAME * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let anim;
  let timer;
  let frame = 0;
  let nextBlinkAt = 0;

  const draw = (x) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(anim.sheet, x, 0, FRAME, FRAME, 0, 0, canvas.width, canvas.height);
  };

  function tick() {
    const { meta } = anim;
    const now = performance.now();
    if (meta.blink && now >= nextBlinkAt) {
      nextBlinkAt = now + meta.blink.everyMs;
      draw(meta.blink.x);
      timer = setTimeout(tick, meta.blink.ms);
      return;
    }
    const f = meta.frames[frame % meta.frames.length];
    draw(f.x);
    frame = (frame + 1) % meta.frames.length;
    timer = setTimeout(tick, f.ms);
  }

  function sync() {
    clearTimeout(timer);
    if (!anim) return;
    frame = 0;
    if (reduced.matches || document.hidden) return draw(anim.meta.frames[0].x);
    nextBlinkAt = performance.now() + (anim.meta.blink?.everyMs ?? 0);
    tick();
  }

  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);

  return {
    async set(name) {
      anim = await load(name);
      sync();
    },
  };
}

const hero = player(document.getElementById('hero-pet'), 8);
hero.set('idle');

const caption = document.getElementById('hero-caption');
const buttons = [...document.querySelectorAll('.switcher button')];
for (const b of buttons) {
  b.addEventListener('click', () => {
    for (const o of buttons) o.setAttribute('aria-pressed', String(o === b));
    hero.set(b.dataset.mood);
    caption.textContent = `Sproutling is ${b.textContent.toLowerCase()}.`;
  });
}

for (const canvas of document.querySelectorAll('canvas[data-pet]')) {
  player(canvas, 4).set(canvas.dataset.pet);
}

player(document.getElementById('nudge-pet'), 6).set('idle');

const NUDGES = [
  'Saw anything you’d want to share with others?',
  'Let’s pause and reflect on what we’ve consumed.',
  'Did that last stretch feed you, or just fill you?',
  'Shoulders down, jaw unclenched. Sip of water?',
  'Look at something far away for a moment. Your eyes will thank you.',
  'You’ve come a long way down the page. Want to come up for air?',
  'Is there something you’d rather make than scroll? I’d happily watch.',
  'How’s your brain feeling: full, or snacking on crumbs?',
];
const line = document.getElementById('nudge-line');
let nudge = 0;
document.getElementById('nudge-next').addEventListener('click', () => {
  nudge = (nudge + 1) % NUDGES.length;
  line.textContent = NUDGES[nudge];
});
