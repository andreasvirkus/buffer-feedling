"""Brand images built from the Sproutling frames: extension icons, a 512px logo and a README banner.

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


def build_banner():
    W, H, K = 1280, 640, 6
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)

    OY = 36  # centres the block vertically
    d.text((W // 2, 105 + OY), "Buffer Feedling", font=font(TITLE_FONT, 92), fill=OUT, anchor="mm")
    d.text((W // 2, 185 + OY), "A pixel pet fed by your Buffer activity", font=font(BODY_FONT, 36), fill=MUTED, anchor="mm")

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


if __name__ == "__main__":
    build_icons()
    build_banner()
    print("ok")
