"""Rough pixel-art mascot concepts for Feedling.

Each concept is built from ellipse "parts" on a 32x32 grid. Parts get a
4-tone ramp with top-left lighting plus a dithered shadow band, and the
whole silhouette gets a dark outline. Faces are drawn per state.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

N = 32
SCALE = 8
OUT = (31, 26, 36)          # outline / ink
WHITE = (255, 255, 255)
MOUTH = (107, 31, 46)
TONGUE = (242, 122, 138)
BLUSH = (245, 155, 176)

RAMPS = {
    "green":  [(63, 138, 60), (108, 192, 74), (166, 224, 122)],
    "spike":  [(40, 105, 52), (63, 150, 70), (108, 192, 74)],
    "cream":  [(217, 164, 65), (244, 211, 122), (251, 233, 176)],
    "shell":  [(170, 160, 190), (236, 232, 242), (255, 255, 255)],
    "mint":   [(58, 161, 126), (111, 211, 165), (180, 240, 208)],
    "leaf":   [(46, 128, 64), (92, 184, 80), (160, 222, 120)],
    "purple": [(106, 75, 181), (154, 122, 224), (200, 180, 255)],
    "lilac":  [(190, 160, 230), (226, 210, 250), (245, 238, 255)],
    "yellow": [(224, 160, 32), (255, 212, 71), (255, 240, 154)],
    "orange": [(208, 102, 30), (242, 140, 40), (255, 190, 110)],
}


class Sprite:
    def __init__(self):
        self.part = [[None] * N for _ in range(N)]   # (ramp, cx, cy, rx, ry, z)
        self.px = [[None] * N for _ in range(N)]

    def ellipse(self, cx, cy, rx, ry, ramp, clip=None):
        for y in range(N):
            for x in range(N):
                nx = (x + 0.5 - cx) / rx
                ny = (y + 0.5 - cy) / ry
                if nx * nx + ny * ny <= 1 and (clip is None or clip(x, y)):
                    self.part[y][x] = (ramp, nx, ny)

    def shade(self):
        for y in range(N):
            for x in range(N):
                p = self.part[y][x]
                if not p:
                    continue
                ramp, nx, ny = p
                dark, base, light = RAMPS[ramp]
                s = nx * 0.8 + ny
                if s > 0.85 or (s > 0.6 and (x + y) % 2 == 0):
                    c = dark
                elif s < -0.75 and nx * nx + ny * ny < 0.75:
                    c = light
                else:
                    c = base
                self.px[y][x] = c
        # outline around the silhouette
        filled = [[self.part[y][x] is not None for x in range(N)] for y in range(N)]
        for y in range(N):
            for x in range(N):
                if filled[y][x]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < N and 0 <= yy < N and filled[yy][xx]:
                        self.px[y][x] = OUT
                        break

    def dot(self, x, y, c):
        if 0 <= x < N and 0 <= y < N:
            self.px[y][x] = c

    def dots(self, pts, c):
        for x, y in pts:
            self.dot(x, y, c)

    # ---- face pieces ----
    def eye(self, x, y, size=2):
        for dy in range(size):
            for dx in range(size):
                self.dot(x + dx, y + dy, OUT)
        self.dot(x, y, WHITE)

    def eye_closed(self, x, y):
        self.dots([(x - 1, y + 1), (x, y + 2), (x + 1, y + 2), (x + 2, y + 1)], OUT)

    def eye_happy(self, x, y):
        self.dots([(x - 1, y + 1), (x, y), (x + 1, y), (x + 2, y + 1)], OUT)

    def smile(self, x, y, w=4):
        self.dot(x, y, OUT)
        for i in range(1, w - 1):
            self.dot(x + i, y + 1, OUT)
        self.dot(x + w - 1, y, OUT)

    def open_mouth(self, cx, cy, rx, ry):
        for y in range(N):
            for x in range(N):
                nx = (x + 0.5 - cx) / rx
                ny = (y + 0.5 - cy) / ry
                d = nx * nx + ny * ny
                if d <= 1:
                    edge = d > 0.55
                    self.dot(x, y, OUT if edge else (TONGUE if ny > 0.15 else MOUTH))

    def blush(self, pts):
        self.dots(pts, BLUSH)

    def zz(self, x, y):
        # small and big "z"
        for (ox, oy, s) in ((x, y + 3, 3), (x + 4, y, 4)):
            for i in range(s):
                self.dot(ox + i, oy, OUT)
                self.dot(ox + i, oy + s - 1, OUT)
                self.dot(ox + s - 1 - i, oy + i, OUT)

    def image(self):
        img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        for y in range(N):
            for x in range(N):
                if self.px[y][x]:
                    img.putpixel((x, y), self.px[y][x] + (255,))
        return img


# ---------------- concepts ----------------

def hatchling(state):
    s = Sprite()
    s.ellipse(6, 23, 5, 2.4, "green")                 # tail
    for cx, cy in ((10, 6), (8, 10), (7, 15)):         # back spikes
        s.ellipse(cx, cy, 1.8, 1.8, "spike")
    s.ellipse(16, 20, 8, 7.5, "green")                # body
    s.ellipse(16, 11, 8, 6.5, "green")                # head
    s.ellipse(22, 13, 4.5, 3.5, "green")              # snout
    s.ellipse(17, 20, 4, 4.5, "cream")                # belly
    zig = lambda x: 24 + (0, 1, 2, 1)[x % 4]
    s.ellipse(16, 26, 9.5, 4.6, "shell", clip=lambda x, y: y >= zig(x))
    s.shade()
    if state == "idle":
        s.eye(13, 9); s.eye(19, 9); s.smile(19, 14, 4)
        s.blush([(12, 13), (13, 13)])
    elif state == "hungry":
        s.eye_happy(13, 9); s.eye_happy(19, 9)
        s.open_mouth(21.5, 15, 3.5, 3)
    else:
        s.eye_closed(13, 8); s.eye_closed(19, 8); s.dots([(21, 15), (22, 15)], OUT)
        s.zz(22, 1)
    return s.image()


def sproutling(state, squash=0, leaf_dx=0, leaf_dy=0, droop=0, blink=False, mouth=1.0):
    """squash: +1 squash (1px shorter, 1px wider), -1 stretch; feet stay planted.
    Face and arms follow the body; leaves are offset independently (they lag).
    droop: left leaf sags this many px. mouth: open-mouth scale (hungry/eating), 0 = closed."""
    s = Sprite()
    fy = squash
    s.ellipse(12, 27, 2.6, 1.8, "mint")               # feet
    s.ellipse(20, 27, 2.6, 1.8, "mint")
    s.ellipse(16, 19 + squash * 0.5, 10 + squash * 0.5, 8.5 - squash * 0.5, "mint")   # body
    s.ellipse(6.5, 20 + fy, 2, 1.6, "mint")           # arm nubs
    s.ellipse(25.5, 20 + fy, 2, 1.6, "mint")
    s.ellipse(16 + leaf_dx, 10 + leaf_dy, 0.9, 1.8, "leaf")               # stem
    s.ellipse(12.5 + leaf_dx, 7.5 + leaf_dy + droop, 3.2, 1.7, "leaf")    # leaves
    s.ellipse(19.5 + leaf_dx, 6.5 + leaf_dy, 3.2, 1.7, "leaf")
    s.shade()
    if state == "idle":
        if blink:
            s.dots([(12, 18 + fy), (13, 18 + fy), (19, 18 + fy), (20, 18 + fy)], OUT)
        else:
            s.eye(12, 17 + fy); s.eye(19, 17 + fy)
        s.smile(14, 21 + fy, 4)
        s.blush([(10, 20 + fy), (11, 20 + fy), (21, 20 + fy), (22, 20 + fy)])
    elif state == "hungry":
        s.eye_happy(12, 16 + fy); s.eye_happy(19, 16 + fy)
        s.open_mouth(16, 22.5 + fy, 3.2 * mouth, 3 * mouth)
        s.blush([(9, 20 + fy), (10, 20 + fy), (22, 20 + fy), (23, 20 + fy)])
    elif state == "full":
        s.eye_happy(12, 16 + fy); s.eye_happy(19, 16 + fy)
        s.smile(13, 21 + fy, 6)
        s.blush([(9, 20 + fy), (10, 20 + fy), (11, 20 + fy), (21, 20 + fy), (22, 20 + fy), (23, 20 + fy)])
    elif state == "eating":
        s.eye_happy(12, 16 + fy); s.eye_happy(19, 16 + fy)
        if mouth > 0:
            s.open_mouth(16, 22.5 + fy, 3.2 * mouth, 3 * mouth)
        else:
            s.dots([(14, 22 + fy), (15, 22 + fy), (16, 22 + fy), (17, 22 + fy)], OUT)
        s.blush([(9, 20 + fy), (10, 20 + fy), (22, 20 + fy), (23, 20 + fy)])
    else:
        s.eye_closed(12, 16 + fy); s.eye_closed(19, 16 + fy); s.dots([(15, 22 + fy), (16, 22 + fy)], OUT)
        s.zz(22, 1)
    return s.image()


def walker(facing, phase):
    """One frame of the 4-phase walk cycle. facing: down (towards us), up, left, right.
    Phases: 0 contact, 1 first foot passing (body rises), 2 contact, 3 other foot passing."""
    s = Sprite()
    flip = facing == "left"
    cx = (lambda x: 32 - x) if flip else (lambda x: x)               # ellipse centres
    px = (lambda x, w=1: 31 - x - (w - 1)) if flip else (lambda x, w=1: x)  # pixel runs
    odd = phase % 2 == 1
    bob = -1 if odd else 0                                           # body rises mid-step
    side = facing in ("left", "right")

    if not side:
        s.ellipse(12, 25 if phase == 1 else 27, 2.6, 1.8, "mint")    # feet
        s.ellipse(20, 25 if phase == 3 else 27, 2.6, 1.8, "mint")
        s.ellipse(16, 19 + bob, 10, 8.5, "mint")                     # body
        s.ellipse(6.5, 20 + bob + (-1 if phase == 3 else 0), 2, 1.6, "mint")    # arms swing against the feet
        s.ellipse(25.5, 20 + bob + (-1 if phase == 1 else 0), 2, 1.6, "mint")
        sway = (0, 1, 0, -1)[phase]
        lx, ly = sway, 0
    else:
        feet = [((11, 27), (21, 27)), ((15, 25), (20, 27)), ((20, 27), (12, 27)), ((20, 27), (15, 25))][phase]
        for fx, fy in feet:
            s.ellipse(cx(fx), fy, 2.6, 1.8, "mint")
        s.ellipse(cx(15.5), 19 + bob, 9.5, 8.5, "mint")
        s.ellipse(cx((18, 16, 13, 16)[phase]), 20 + bob, 2, 1.6, "mint")   # one visible arm, swinging
        lx, ly = (-1 if flip else 1), (1 if odd else 0)

    s.ellipse(cx(16 + lx), 10 + ly, 0.9, 1.8, "leaf")                # stem
    s.ellipse(cx(12.5 + lx), 7.5 + ly, 3.2, 1.7, "leaf")             # leaves
    s.ellipse(cx(19.5 + lx), 6.5 + ly, 3.2, 1.7, "leaf")
    s.shade()

    if facing == "down":
        s.eye(12, 17 + bob); s.eye(19, 17 + bob)
        s.smile(14, 21 + bob, 4)
        s.blush([(10, 20 + bob), (11, 20 + bob), (21, 20 + bob), (22, 20 + bob)])
    elif side:
        s.eye(px(18, 2), 17 + bob); s.eye(px(22, 2), 17 + bob)
        s.dots([(px(20), 21 + bob), (px(21), 22 + bob), (px(22), 22 + bob), (px(23), 21 + bob)], OUT)
        s.blush([(px(17), 20 + bob), (px(24), 20 + bob)])
    return s.image()


def chomp(state):
    s = Sprite()
    s.ellipse(10, 13, 4, 4, "purple")                 # eye bumps
    s.ellipse(22, 13, 4, 4, "purple")
    s.ellipse(16, 21, 11.5, 7.5, "purple")            # body
    s.ellipse(16, 24, 6, 3.5, "lilac")                # belly
    s.ellipse(9, 28, 3, 1.6, "purple")                # feet
    s.ellipse(23, 28, 3, 1.6, "purple")
    s.shade()
    if state == "idle":
        s.eye(9, 11, 3); s.eye(21, 11, 3)
        s.dots([(10, 19), (11, 20), (12, 20), (13, 20), (14, 20), (15, 20),
                (16, 20), (17, 20), (18, 20), (19, 20), (20, 20), (21, 19)], OUT)
        s.blush([(7, 18), (8, 18), (23, 18), (24, 18)])
    elif state == "hungry":
        s.eye(9, 11, 3); s.eye(21, 11, 3)
        s.open_mouth(16, 21, 6.5, 4.2)
        s.dots([(12, 18), (19, 18)], WHITE)            # little teeth
    else:
        s.eye_closed(10, 11); s.eye_closed(22, 11)
        s.dots([(13, 20), (14, 21), (15, 21), (16, 21), (17, 21), (18, 20)], OUT)
        s.zz(22, 1)
    return s.image()


def chick(state):
    s = Sprite()
    s.ellipse(16, 8.5, 1, 2.2, "yellow")              # tuft
    s.ellipse(18, 8.8, 0.9, 1.6, "yellow")
    s.ellipse(16, 19, 9.5, 9, "yellow")               # body
    s.ellipse(7.5, 20, 2.6, 4, "yellow")              # wings
    s.ellipse(24.5, 20, 2.6, 4, "yellow")
    s.ellipse(12.5, 29, 2, 1.1, "orange")             # feet
    s.ellipse(19.5, 29, 2, 1.1, "orange")
    s.shade()
    beak = RAMPS["orange"]
    if state == "idle":
        s.eye(12, 16); s.eye(19, 16)
        s.dots([(15, 19), (16, 19), (17, 19)], beak[1]); s.dot(16, 20, beak[0])
        s.blush([(10, 19), (11, 19), (21, 19), (22, 19)])
    elif state == "hungry":
        s.eye_happy(12, 15); s.eye_happy(19, 15)
        s.dots([(14, 18), (15, 18), (16, 18), (17, 18), (18, 18)], beak[1])
        s.dots([(15, 19), (16, 19), (17, 19)], MOUTH)
        s.dots([(15, 20), (16, 20), (17, 20)], TONGUE)
        s.dots([(14, 21), (15, 21), (16, 21), (17, 21), (18, 21)], beak[0])
    else:
        s.eye_closed(12, 15); s.eye_closed(19, 15)
        s.dots([(15, 19), (16, 19), (17, 19)], beak[1]); s.dot(16, 20, beak[0])
        s.zz(22, 1)
    return s.image()


CONCEPTS = [
    ("A. Hatchling", "dino just out of its egg", hatchling),
    ("B. Sproutling", "seed blob that grows leaves", sproutling),
    ("C. Chomp", "wide-mouthed post muncher", chomp),
    ("D. Peep", "nestling chick, beak always open", chick),
]
STATES = ["idle", "hungry", "sleepy"]

def concept_sheet(out):
    out.mkdir(parents=True, exist_ok=True)
    cell = N * SCALE
    pad, label_h, left = 24, 34, 330
    W = left + len(STATES) * (cell + pad) + pad
    H = 70 + len(CONCEPTS) * (cell + label_h + pad)
    sheet = Image.new("RGB", (W, H), (236, 241, 228))
    d = ImageDraw.Draw(sheet)
    try:
        big = ImageFont.load_default(size=28)
        small = ImageFont.load_default(size=18)
    except TypeError:
        big = small = ImageFont.load_default()
    d.text((pad, 20), "Feedling - mascot concepts (32x32 px, shown at 8x)", fill=OUT, font=big)
    for r, (name, blurb, fn) in enumerate(CONCEPTS):
        y = 70 + r * (cell + label_h + pad)
        d.text((pad, y + cell // 2 - 24), name, fill=OUT, font=big)
        d.text((pad, y + cell // 2 + 12), blurb, fill=(90, 90, 100), font=small)
        for c, st in enumerate(STATES):
            x = left + pad + c * (cell + pad)
            d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(206, 226, 188))
            img = fn(st)
            img.save(out / f"{name.split('. ')[1].lower()}-{st}.png")
            sheet.paste(img.resize((cell, cell), Image.NEAREST), (x, y),
                        img.resize((cell, cell), Image.NEAREST))
            d.text((x + 4, y + cell + 6), st, fill=OUT, font=small)
    sheet.save(out / "feedling-concepts.png")
    print("ok", W, H)


# ---------------- sproutling idle animation ----------------

ROOT = Path(__file__).resolve().parents[2]
SPRITES = ROOT / "src" / "public" / "sprites"
SITE_SPRITES = ROOT / "site" / "sprites"
PREVIEW = Path(__file__).resolve().parent / "preview"
PREVIEW_BG = (206, 226, 188)

# name -> frames of (kwargs for sproutling, duration ms). Squash/stretch moves the body and
# face; leaves lag and sway by themselves. Feet never move. "idle" is the content pet.
ANIMATIONS = {
    "idle": dict(state="idle", frames=[
        (dict(), 300),                                                # rest
        (dict(squash=1), 150),                                        # squash, leaves stay up
        (dict(), 150),                                                # rest
        (dict(squash=-1, leaf_dy=-1, droop=1, leaf_dx=-1), 200),      # stretch, leaves droop
        (dict(leaf_dx=1), 300),                                       # sway other way
    ]),
    "hungry": dict(state="hungry", frames=[
        (dict(), 500),
        (dict(mouth=0.7, droop=1), 500),                              # mouth narrows, leaf sags
    ]),
    "sleepy": dict(state="sleepy", frames=[
        (dict(), 900),
        (dict(squash=1, droop=1), 900),                               # slow breathing
    ]),
    "full": dict(state="full", frames=[
        (dict(), 350),
        (dict(squash=-1, leaf_dy=-1), 180),                           # happy hop
        (dict(), 350),
        (dict(squash=1), 150),
    ]),
    "eating": dict(state="eating", frames=[
        (dict(), 150),
        (dict(mouth=0, squash=1), 120),                               # chomp
        (dict(), 150),
        (dict(mouth=0.7, squash=1), 120),
    ]),
}
WALK_FRAME_MS = 120
WALK_DIRS = ["down", "up", "left", "right"]
BLINK = dict(blink=True)
BLINK_EVERY_MS = 4000
BLINK_MS = 120
GIF_MIN_MS = 2000


def build_all():
    SPRITES.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)

    def on_bg(img):
        bg = Image.new("RGBA", img.size, PREVIEW_BG + (255,))
        bg.alpha_composite(img)
        return bg.convert("RGB").resize((N * SCALE, N * SCALE), Image.NEAREST)

    items = []
    for name, anim in ANIMATIONS.items():
        items.append((name, [sproutling(anim["state"], **kw) for kw, _ in anim["frames"]], [ms for _, ms in anim["frames"]], name == "idle", anim["state"]))
    for d in WALK_DIRS:
        items.append((f"walk-{d}", [walker(d, p) for p in range(4)], [WALK_FRAME_MS] * 4, False, None))

    for name, frames, durations, has_blink, state in items:
        spec = [(None, ms) for ms in durations]
        frames[0].save(SPRITES / f"sproutling-{name}.png")
        if has_blink:
            frames.append(sproutling(state, **BLINK))

        sheet = Image.new("RGBA", (N * len(frames), N), (0, 0, 0, 0))
        for i, f in enumerate(frames):
            sheet.paste(f, (i * N, 0))
        sheet.save(SPRITES / f"sproutling-{name}-sheet.png")

        meta = {"frameSize": N, "frames": [{"x": i * N, "ms": ms} for i, (_, ms) in enumerate(spec)]}
        if has_blink:
            meta["blink"] = {"x": (len(frames) - 1) * N, "everyMs": BLINK_EVERY_MS, "ms": BLINK_MS}
        (SPRITES / f"sproutling-{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
        # The landing page ships its own copy so it deploys standalone
        SITE_SPRITES.mkdir(parents=True, exist_ok=True)
        sheet.save(SITE_SPRITES / f"sproutling-{name}-sheet.png")
        (SITE_SPRITES / f"sproutling-{name}.json").write_text(json.dumps(meta, indent=2) + "\n")

        # Review GIF: idle runs to the blink interval then blinks; the rest loop to ~2s
        cycle_ms = sum(ms for _, ms in spec)
        base = [(frames[i], ms) for i, (_, ms) in enumerate(spec)]
        if has_blink:
            seq = base * (BLINK_EVERY_MS // cycle_ms) + [(frames[-1], BLINK_MS)]
        else:
            seq = base * max(1, -(-GIF_MIN_MS // cycle_ms))
        shots = [on_bg(f) for f, _ in seq]
        shots[0].save(PREVIEW / f"sproutling-{name}-preview.gif", save_all=True, append_images=shots[1:],
                      duration=[ms for _, ms in seq], loop=0)
        print(f"ok: {name}: {len(frames)} frames, cycle {cycle_ms}ms")


if __name__ == "__main__":
    if "--concepts" in sys.argv:
        concept_sheet(PREVIEW / "concepts")
    else:
        build_all()
