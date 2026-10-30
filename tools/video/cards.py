"""Title and end cards for the demo video, rendered to MP4 with ffmpeg.

Run with the sprite tooling's venv:  tools/sprites/.venv/bin/python tools/video/cards.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "sprites"))

from PIL import Image, ImageDraw  # noqa: E402

from brand import ACCENT, BODY_FONT, CREAM, MINT, MUTED, SHADOW, TITLE_FONT, fit, font, tile  # noqa: E402
from draw import ANIMATIONS, OUT, sproutling  # noqa: E402

W, H, FPS = 1920, 1080, 30
OUTDIR = ROOT / "docs" / "video"


def frames_of(name):
    spec = ANIMATIONS[name]
    return [(sproutling(spec["state"], **kw), ms) for kw, ms in spec["frames"]]


def frame_at(frames, t_ms):
    total = sum(ms for _, ms in frames)
    t = t_ms % total
    for img, ms in frames:
        if t < ms:
            return img
        t -= ms
    return frames[-1][0]


def draw_pet(img, d, pet, x, y, k):
    feet = y + 29 * k
    d.ellipse([x + 32 * k * 0.2, feet - k, x + 32 * k * 0.8, feet + 3 * k], fill=SHADOW)
    img.alpha_composite(pet.resize((32 * k, 32 * k), Image.NEAREST), (x, y))


def title_frame(t_ms, pet_frames):
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)
    d.text((160, 400), "Sproutling", font=fit(d, "Sproutling", TITLE_FONT, 190, 900), fill=OUT, anchor="lm")
    d.text((166, 560), "Post a little. Pause a little.", font=fit(d, "Post a little. Pause a little.", TITLE_FONT, 64, 900), fill=ACCENT, anchor="lm")
    sub = "A pixel pet for your posting habit, built on the Buffer API"
    d.text((166, 660), sub, font=fit(d, sub, BODY_FONT, 38, 880), fill=MUTED, anchor="lm")
    img.alpha_composite(tile((620, 620), MINT + (255,), 56), (1100, 230))
    draw_pet(img, d, frame_at(pet_frames, t_ms), 1100 + 46, 230 + 36, 17)
    return img.convert("RGB")


def end_frame(t_ms, pet_frames):
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)
    d.text((160, 270), "Give it a try", font=fit(d, "Give it a try", TITLE_FONT, 120, 900), fill=OUT, anchor="lm")
    d.text((160, 440), "sproutling.pet", font=fit(d, "sproutling.pet", TITLE_FONT, 140, 900), fill=ACCENT, anchor="lm")
    for i, line in enumerate(("Free on the Chrome Web Store", "Read-only, no server, open source", "github.com/andreasvirkus/buffer-feedling")):
        d.text((166, 590 + i * 62), line, font=font(BODY_FONT, 42), fill=MUTED, anchor="lm")
    d.text((166, 900), "Made for Buffer Commit by Andreas Virkus", font=font(BODY_FONT, 34), fill=MUTED, anchor="lm")
    img.alpha_composite(tile((620, 620), MINT + (255,), 56), (1100, 230))
    draw_pet(img, d, frame_at(pet_frames, t_ms), 1100 + 46, 230 + 36, 17)
    return img.convert("RGB")


def render(name, seconds, make, pet):
    OUTDIR.mkdir(parents=True, exist_ok=True)
    out = OUTDIR / f"{name}.mp4"
    fade = 0.5
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-vf", f"fade=t=in:st=0:d={fade},fade=t=out:st={seconds - fade}:d={fade}",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart", str(out)],
        stdin=subprocess.PIPE,
    )
    frames = frames_of(pet)
    for i in range(int(seconds * FPS)):
        ff.stdin.write(make(i * 1000 / FPS, frames).tobytes())
    ff.stdin.close()
    ff.wait()
    print(f"ok: {out.relative_to(ROOT)} ({seconds}s)")


if __name__ == "__main__":
    render("title", 4, title_frame, "idle")
    render("end", 7, end_frame, "full")
    broll = OUTDIR / "tour-broll.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(ROOT / "docs" / "brand" / "sproutling-tour.gif"),
         "-vf", "scale=iw*3:ih*3:flags=neighbor,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-movflags", "+faststart", str(broll)],
        check=True,
    )
    print(f"ok: {broll.relative_to(ROOT)}")
