"""A GIF that walks Sproutling through its sprites: face us, walk, nap, walk elsewhere, eat."""
from PIL import Image, ImageDraw

from brand import BODY_FONT, CREAM, MUTED, SHADOW, font
from draw import ANIMATIONS, OUT, ROOT, WALK_FRAME_MS, sproutling, walker  # noqa: F401

K = 8
W, H = 32 * K + 64, 32 * K + 108
OUTFILE = ROOT / "docs" / "brand" / "sproutling-tour.gif"


def anim(name):
    spec = ANIMATIONS[name]
    return [(sproutling(spec["state"], **kw), ms) for kw, ms in spec["frames"]]


def walk(direction):
    return [(walker(direction, p), WALK_FRAME_MS) for p in range(4)]


# (label, frames, times to loop)
TOUR = [
    ("Hello!", anim("idle"), 2),
    ("walking", walk("right"), 3),
    ("napping", anim("sleepy"), 1),
    ("walking", walk("left"), 3),
    ("walking", walk("up"), 3),
    ("snack time", anim("eating"), 3),
]


def compose(frame, label):
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)
    x, y = (W - 32 * K) // 2, 28
    feet = y + 29 * K
    d.ellipse([x + 32 * K * 0.2, feet - K // 2, x + 32 * K * 0.8, feet + 3 * K], fill=SHADOW)
    img.alpha_composite(frame.resize((32 * K, 32 * K), Image.NEAREST), (x, y))
    d.text((W // 2, H - 40), label, font=font(BODY_FONT, 30), fill=MUTED, anchor="mm")
    return img.convert("RGB")


def build():
    shots, durations = [], []
    for label, frames, loops in TOUR:
        for _ in range(loops):
            for f, ms in frames:
                shots.append(compose(f, label))
                durations.append(ms)
    shots[0].save(OUTFILE, save_all=True, append_images=shots[1:], duration=durations, loop=0, optimize=False)
    print(f"ok: {OUTFILE.relative_to(ROOT)} {len(shots)} frames, {sum(durations) / 1000:.1f}s")


if __name__ == "__main__":
    build()
