#!/usr/bin/env python3
"""Generate the Mac Terminal app icon at a resolution suitable for the Dock."""

from PIL import Image, ImageDraw, ImageFilter

OUT = "assets/icon-source.png"
SIZE = 1024
SCALE = 3
W = SIZE * SCALE


def vertical_gradient(size, top, bottom):
    strip = Image.new("RGB", (1, size))
    for y in range(size):
        amount = y / (size - 1)
        strip.putpixel(
            (0, y),
            tuple(round(a + (b - a) * amount) for a, b in zip(top, bottom)),
        )
    return strip.resize((size, size)).convert("RGBA")


canvas = vertical_gradient(W, (42, 55, 101), (12, 17, 38))

# Soft, restrained light behind the terminal window adds depth without relying
# on a fine grid or a halo that disappears into noise at Dock icon sizes.
glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
glow_draw.ellipse(
    (W * 0.08, W * 0.05, W * 0.92, W * 0.95),
    fill=(52, 153, 238, 72),
)
glow = glow.filter(ImageFilter.GaussianBlur(W * 0.19))
canvas = Image.alpha_composite(canvas, glow)

# A clear terminal-window silhouette remains recognizable when the icon is
# small, unlike the original full-bleed grid and comparatively small prompt.
panel = Image.new("RGBA", (W, W), (0, 0, 0, 0))
draw = ImageDraw.Draw(panel)
panel_box = (W * 0.13, W * 0.17, W * 0.87, W * 0.83)
draw.rounded_rectangle(
    panel_box,
    radius=W * 0.105,
    fill=(13, 20, 43, 238),
    outline=(179, 214, 255, 100),
    width=W // 180,
)
header_y = W * 0.33
draw.line(
    (W * 0.15, header_y, W * 0.85, header_y),
    fill=(151, 184, 230, 62),
    width=W // 300,
)

for x, color in (
    (0.235, (255, 111, 117, 230)),
    (0.285, (255, 197, 91, 230)),
    (0.335, (93, 211, 146, 230)),
):
    radius = W * 0.012
    cx, cy = W * x, W * 0.25
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)

canvas = Image.alpha_composite(canvas, panel)

# Draw a bold, round-capped prompt and cursor. Their larger scale and
# high-contrast cyan/blue palette keep the mark legible at 32px.
glyph_mask = Image.new("L", (W, W), 0)
glyph_draw = ImageDraw.Draw(glyph_mask)
stroke = W // 22
points = (
    (W * 0.30, W * 0.43),
    (W * 0.47, W * 0.53),
    (W * 0.30, W * 0.63),
)
glyph_draw.line(points, fill=255, width=stroke, joint="curve")
glyph_draw.line((W * 0.56, W * 0.63, W * 0.74, W * 0.63), fill=255, width=stroke)
radius = stroke / 2
for x, y in (points[0], points[-1], (W * 0.56, W * 0.63), (W * 0.74, W * 0.63)):
    glyph_draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)

halo = Image.new("RGBA", (W, W), (72, 192, 255, 0))
halo.putalpha(glyph_mask.filter(ImageFilter.GaussianBlur(stroke * 0.65)).point(lambda a: a // 3))
canvas = Image.alpha_composite(canvas, halo)

glyph = vertical_gradient(W, (79, 211, 255), (132, 157, 255))
glyph.putalpha(glyph_mask)
canvas = Image.alpha_composite(canvas, glyph)

canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(OUT)
print(f"wrote {OUT} ({SIZE}x{SIZE})")
