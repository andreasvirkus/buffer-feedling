"""Brand images built from the Sproutling frames: extension icons, a 512px logo, a README banner and Chrome Web Store assets.

Fonts are macOS system fonts; elsewhere the banner falls back to Pillow's default.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from draw import OUT, ROOT, sproutling

CREAM = (253, 236, 184)
SHADOW = (234, 214, 156)
MUTED = (110, 98, 90)

ICONS = ROOT / "src" / "public" / "icons"
BRAND = ROOT / "docs" / "brand"
SITE = ROOT / "site"
STORE = ROOT / "docs" / "store"

MINT = (217, 241, 228)
ACCENT = (47, 143, 107)
PAPER = (255, 253, 247)
FEED_BG = (238, 240, 243)
LINE = (222, 224, 229)


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


TITLE_FONT = ["/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"]
BODY_FONT = ["/System/Library/Fonts/Avenir Next.ttc", "/System/Library/Fonts/Helvetica.ttc"]


def sprite_tight(state="idle"):
    img = sproutling(state)
    return img.crop(img.getchannel("A").getbbox())


def icon(size, k):
    """Sprite at integer scale k, centred on a cream square"""
    tile = Image.new("RGBA", (size, size), CREAM + (255,))
    s = sprite_tight()
    s = s.resize((s.width * k, s.height * k), Image.NEAREST)
    tile.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2))
    return tile


def build_icons():
    ICONS.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)
    big = icon(128, 4)
    big.save(ICONS / "128.png")
    icon(32, 1).save(ICONS / "32.png")  # native pixels stay crisp
    for size in (48, 16):
        big.resize((size, size), Image.LANCZOS).save(ICONS / f"{size}.png")
    icon(512, 15).save(BRAND / "icon-512.png")
    SITE.mkdir(exist_ok=True)
    icon(32, 1).save(SITE / "favicon.png")


def build_banner():
    W, H, K = 1280, 640, 6
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)

    OY = 36  # centres the block vertically
    d.text((W // 2, 105 + OY), "Sproutling", font=font(TITLE_FONT, 92), fill=OUT, anchor="mm")
    d.text((W // 2, 185 + OY), "Keep your streak. Come up for air.", font=font(BODY_FONT, 36), fill=MUTED, anchor="mm")

    moods = ["hungry", "idle", "full", "sleepy", "eating"]
    labels = ["hungry", "content", "full", "sleepy", "eating"]
    cell = 32 * K
    gap = 44
    x0 = (W - (len(moods) * cell + (len(moods) - 1) * gap)) // 2
    top = 250 + OY
    label_font = font(BODY_FONT, 28)
    for i, (m, label) in enumerate(zip(moods, labels)):
        x = x0 + i * (cell + gap)
        # soft ground shadow under the feet (feet sit at sprite row ~29)
        feet_y = top + 29 * K
        d.ellipse([x + cell * 0.2, feet_y - 4, x + cell * 0.8, feet_y + 14], fill=SHADOW)
        img.alpha_composite(sproutling(m).resize((cell, cell), Image.NEAREST), (x, top))
        d.text((x + cell // 2, top + cell + 48), label, font=label_font, fill=MUTED, anchor="mm")

    BRAND.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(BRAND / "banner.png")
    SITE.mkdir(exist_ok=True)
    img.convert("RGB").save(SITE / "og.png")


def sprite_at(mood, k):
    return sproutling(mood).resize((32 * k, 32 * k), Image.NEAREST)


def tile(size, fill, radius=28):
    t = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(t).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=fill)
    return t


def shadowed(img, d, x, y, k, mood="idle"):
    """Sprite with a soft ground shadow; feet sit at row ~29"""
    feet = y + 29 * k
    d.ellipse([x + 32 * k * 0.2, feet - k, x + 32 * k * 0.8, feet + 3 * k], fill=SHADOW)
    img.alpha_composite(sprite_at(mood, k), (x, y))


def pixel_card(d, box, fill=PAPER, border=OUT, offset=6):
    x0, y0, x1, y1 = box
    d.rounded_rectangle([x0 + offset, y0 + offset, x1 + offset, y1 + offset], radius=14, fill=border)
    d.rounded_rectangle(box, radius=14, fill=fill, outline=border, width=4)


def wrap(d, text, fnt, width):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if d.textlength(trial, font=fnt) <= width:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    return lines + [cur]


def heading(d, W, title, sub, y=70):
    d.text((W // 2, y), title, font=font(TITLE_FONT, 64), fill=OUT, anchor="mm")
    d.text((W // 2, y + 66), sub, font=font(BODY_FONT, 30), fill=MUTED, anchor="mm")


def canvas(W=1280, H=800, bg=CREAM):
    img = Image.new("RGBA", (W, H), bg + (255,))
    return img, ImageDraw.Draw(img)


def shot_meet():
    img, d = canvas()
    d.text((110, 270), "Meet Sproutling", font=font(TITLE_FONT, 84), fill=OUT, anchor="lm")
    body = font(BODY_FONT, 36)
    for i, line in enumerate(wrap(d, "A calm little pet that remembers your streak with you, and has a kind word when the scrolling goes on.", body, 560)):
        d.text((110, 370 + i * 52), line, font=body, fill=MUTED, anchor="lm")
    img.alpha_composite(tile((560, 560), MINT + (255,), 40), (660, 120))
    shadowed(img, d, 660 + 24, 120 + 24, 16)
    return img


def shot_moods():
    img, d = canvas()
    heading(d, 1280, "Five moods, one habit", "Post and it perks up. Skip a few days and it naps. It never dies.")
    moods = ["hungry", "idle", "full", "sleepy", "eating"]
    labels = ["Hungry", "Content", "Full", "Sleepy", "Eating"]
    notes = ["behind on goals", "on track", "goals hit", "three quiet days", "new post just in"]
    K, gap = 6, 44
    cell = 32 * K
    x0 = (1280 - (5 * cell + 4 * gap)) // 2
    for i, (m, lab, note) in enumerate(zip(moods, labels, notes)):
        x = x0 + i * (cell + gap)
        img.alpha_composite(tile((cell, cell), MINT + (255,), 24), (x, 340))
        shadowed(img, d, x, 340, K, m)
        d.text((x + cell // 2, 570), lab, font=font(TITLE_FONT, 34), fill=OUT, anchor="mm")
        d.text((x + cell // 2, 616), note, font=font(BODY_FONT, 24), fill=MUTED, anchor="mm")
    return img


def shot_nudge():
    img, d = canvas(bg=FEED_BG)
    d.rectangle([0, 0, 1280, 150], fill=CREAM)
    heading(d, 1280, "A kind word when the scrolling goes on", "Gentle nudges, never nagging. Switch them off whenever you like.", y=52)
    for i, y in enumerate((190, 450)):
        d.rounded_rectangle([300, y, 980, y + 220], radius=18, fill=(255, 255, 255), outline=LINE, width=2)
        d.ellipse([330, y + 28, 394, y + 92], fill=LINE)
        d.rounded_rectangle([414, y + 36, 640, y + 54], radius=9, fill=LINE)
        d.rounded_rectangle([414, y + 68, 540, y + 84], radius=8, fill=(232, 234, 238))
        for j, w in enumerate((620, 590, 380)):
            d.rounded_rectangle([330, y + 118 + j * 28, 330 + w, y + 132 + j * 28], radius=7, fill=(232, 234, 238))
    px, py, K = 1000, 560, 6
    shadowed(img, d, px, py, K)
    fnt = font(BODY_FONT, 30)
    lines = wrap(d, "Let\u2019s pause and reflect on what we\u2019ve consumed.", fnt, 330)
    bw, bh = 400, 40 + len(lines) * 42
    bx1, by1 = px + 32 * K - 10, py - 24
    pixel_card(d, [bx1 - bw, by1 - bh, bx1, by1], offset=6)
    for i, line in enumerate(lines):
        d.text((bx1 - bw + 28, by1 - bh + 38 + i * 42), line, font=fnt, fill=OUT, anchor="lm")
    tail_x = bx1 - 70
    d.polygon([(tail_x, by1 - 2), (tail_x + 26, by1 - 2), (tail_x + 26, by1 + 22)], fill=PAPER, outline=OUT)
    d.line([(tail_x, by1 - 2), (tail_x + 26, by1 - 2)], fill=PAPER, width=4)
    return img


def shot_sites():
    img, d = canvas()
    d.text((110, 250), "You choose", font=font(TITLE_FONT, 64), fill=OUT, anchor="lm")
    d.text((110, 326), "where it visits", font=font(TITLE_FONT, 64), fill=OUT, anchor="lm")
    body = font(BODY_FONT, 34)
    for i, line in enumerate(wrap(d, "Tap a connected channel and Sproutling joins you on that site. Tap again to take it back.", body, 520)):
        d.text((110, 440 + i * 50), line, font=body, fill=MUTED, anchor="lm")
    x0, y0, x1, y1 = 700, 110, 1180, 690
    pixel_card(d, [x0, y0, x1, y1], offset=8)
    img.alpha_composite(sprite_at("idle", 3), (x0 + 28, y0 + 26))
    d.text((x0 + 140, y0 + 64), "Sproutling", font=font(TITLE_FONT, 36), fill=OUT, anchor="lm")
    d.rounded_rectangle([x0 + 140, y0 + 96, x0 + 250, y0 + 128], radius=16, fill=MINT)
    d.text((x0 + 195, y0 + 112), "Content", font=font(BODY_FONT, 20), fill=ACCENT, anchor="mm")
    d.rounded_rectangle([x0 + 28, y0 + 168, x1 - 28, y0 + 268], radius=14, fill=(246, 249, 244), outline=LINE, width=2)
    d.text((x0 + 48, y0 + 198), "Fullness", font=font(BODY_FONT, 24), fill=OUT, anchor="lm")
    d.text((x1 - 48, y0 + 198), "1 of 3 posts", font=font(BODY_FONT, 22), fill=MUTED, anchor="rm")
    d.rounded_rectangle([x0 + 48, y0 + 230, x1 - 48, y0 + 248], radius=9, fill=(228, 236, 225))
    d.rounded_rectangle([x0 + 48, y0 + 230, x0 + 48 + 150, y0 + 248], radius=9, fill=ACCENT)
    d.text((x0 + 28, y0 + 318), "Connected channels", font=font(BODY_FONT, 22), fill=MUTED, anchor="lm")
    chips = [("LinkedIn", True), ("Instagram", True), ("X", False), ("Bluesky", False), ("YouTube", False)]
    cx, cy = x0 + 28, y0 + 352
    chip_font = font(BODY_FONT, 24)
    for label, on in chips:
        lead = 30 if on else 0  # room for the drawn tick
        w = int(d.textlength(label, font=chip_font)) + 36 + lead
        if cx + w > x1 - 28:
            cx, cy = x0 + 28, cy + 58
        d.rounded_rectangle([cx, cy, cx + w, cy + 44], radius=10, fill=MINT if on else (228, 236, 225), outline=ACCENT if on else None, width=2)
        d.text((cx + 18 + lead, cy + 22), label, font=chip_font, fill=ACCENT if on else OUT, anchor="lm")
        if on:
            d.line([(cx + 16, cy + 23), (cx + 23, cy + 30), (cx + 36, cy + 14)], fill=ACCENT, width=4, joint="curve")
        cx += w + 12
    d.text((x0 + 28, y0 + 500), "Tap a channel to let Sproutling visit its site.", font=font(BODY_FONT, 21), fill=MUTED, anchor="lm")
    return img


def promo_small():
    img, d = canvas(440, 280)
    img.alpha_composite(tile((200, 200), MINT + (255,), 22), (28, 40))
    shadowed(img, d, 28 + 20, 40 + 24, 5)
    d.text((248, 112), "Sproutling", font=font(TITLE_FONT, 40), fill=OUT, anchor="lm")
    for i, line in enumerate(("Keep your streak.", "Come up for air.")):
        d.text((248, 160 + i * 30), line, font=font(BODY_FONT, 24), fill=MUTED, anchor="lm")
    return img


def build_store():
    STORE.mkdir(parents=True, exist_ok=True)
    for i, make in enumerate((shot_meet, shot_moods, shot_nudge, shot_sites), 1):
        make().convert("RGB").save(STORE / f"screenshot-{i}.png")
    promo_small().convert("RGB").save(STORE / "promo-440x280.png")


if __name__ == "__main__":
    build_icons()
    build_banner()
    build_store()
    print("ok")
