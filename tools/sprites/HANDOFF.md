# Task: animate Sproutling's idle state

Sproutling is the mascot for **Feedling** (see `PLAN.md`, milestone M3). It's a mint seed blob with two leaves on top, drawn at 32×32 px.

Files in this folder:
- `draw.py` — Pillow script that generates the sprites procedurally. `sproutling(state)` defines the shapes; `Sprite` handles shading, outline and faces.
- `sproutling-idle.png`, `sproutling-hungry.png`, `sproutling-sleepy.png` — current static frames (32×32, transparent).

## Goal

A looping idle animation that feels alive but calm, because it will sit in the corner of other websites all day.

Make it a gentle **bob with squash and stretch**, not a big dance:

| Frame | Body | Leaves | Duration |
|---|---|---|---|
| 0 | rest pose (current sprite) | rest | 300 ms |
| 1 | squash: body 1 px shorter, 1 px wider; face and leaves move down 1 px | lag behind (stay up) | 150 ms |
| 2 | rest | rest | 150 ms |
| 3 | stretch: body 1 px taller, 1 px narrower; face and leaves move up 1 px; feet stay planted | tilt/droop 1 px (lagging) | 200 ms |
| 4 | rest | sway the other way 1 px | 300 ms |

Plus a **blink**: a separate frame (rest pose, eyes as a 2-px horizontal line) inserted roughly every 4 seconds.

## Rules

- Generate frames in `draw.py`. Add parameters to `sproutling()` (e.g. `squash: int`, `leaf_dx: int`, `blink: bool`) rather than editing PNGs by hand, so the shading and outline stay consistent.
- Animate in whole pixels only. No CSS transforms, rotation or sub-pixel scaling at runtime: those blur pixel art.
- Feet never move. That's what sells the squash.
- Keep it within the 32×32 canvas, including the outline.
- Keep the change small: don't refactor the other concepts (hatchling, chomp, peep). Leave them as they are or delete them.

## Outputs

1. `sproutling-idle-sheet.png` — horizontal strip, frames 32×32 each, in order, plus the blink frame last.
2. `sproutling-idle.json` — frame list with durations, e.g. `{"frameSize": 32, "frames": [{"x": 0, "ms": 300}, …], "blink": {"x": 160, "everyMs": 4000, "ms": 120}}`.
3. `sproutling-idle-preview.gif` — the loop at 8× scale (nearest neighbour) so a human can review it.
4. A tiny `preview.html` that draws the sheet on a `<canvas>` at 4× with `image-rendering: pixelated`, using the JSON timings. This becomes the starting point for `overlay/sprite.ts`. It pauses on `document.hidden` and shows only frame 0 under `prefers-reduced-motion: reduce`.

## Done when

- The GIF loops without a visible jump between the last and first frame.
- Frame 0 is pixel-identical to the current `sproutling-idle.png`.
- `preview.html` runs by opening it from a local server (`npx serve .`).
