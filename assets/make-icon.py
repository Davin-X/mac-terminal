#!/usr/bin/env python3
"""Generate the "Neon Glass Terminal" app icon.

Renders a 1024x1024 RGBA source (supersampled 4x, then LANCZOS-downscaled)
that is fed to `npx tauri icon` to produce every platform size.

Design:
  * Apple-style squircle tile (superellipse, n=5)
  * deep navy vertical gradient + faint terminal grid
  * accent glow bloom behind the prompt
  * neon gradient chevron  >  and cursor underscore  _
  * rim highlight + soft drop shadow

No third-party deps beyond Pillow.
"""

import math
from PIL import Image, ImageDraw, ImageFilter

OUT = "assets/icon-source.png"
SIZE = 1024          # final size
SS = 4               # supersample factor
W = SIZE * SS

# ---------- palette (Tokyo Night neon) ----------
BG_TOP = (32, 35, 58)
BG_BOT = (13, 14, 24)
CYAN = (125, 207, 255)
BLUE = (122, 162, 247)
VIOLET = (187, 154, 247)
GLOW = (76, 130, 240)


def squircle_points(size, n=5.0, steps=4096):
    """Parametric superellipse (Apple-like squircle) polygon points."""
    a = b = size / 2.0
    pts = []
    for i in range(steps):
        t = 2.0 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = a * math.copysign(abs(ct) ** (2.0 / n), ct)
        y = b * math.copysign(abs(st) ** (2.0 / n), st)
        pts.append((a + x, b + y))
    return pts


def vgrad(size, top, bot):
    """Vertical gradient image."""
    g = Image.new("RGB", (1, size))
    for y in range(size):
        f = y / max(1, size - 1)
        g.putpixel((0, y), tuple(round(top[i] + (bot[i] - top[i]) * f) for i in range(3)))
    return g.resize((size, size))


def hgrad(size, stops):
    """Horizontal multi-stop gradient image. stops = [(pos, (r,g,b)), ...]."""
    g = Image.new("RGB", (size, 1))
    for x in range(size):
        f = x / max(1, size - 1)
        # locate the surrounding stops
        lo = stops[0]
        hi = stops[-1]
        for i in range(len(stops) - 1):
            if stops[i][0] <= f <= stops[i + 1][0]:
                lo, hi = stops[i], stops[i + 1]
                break
        span = max(1e-6, hi[0] - lo[0])
        k = (f - lo[0]) / span
        g.putpixel((x, 0), tuple(round(lo[1][i] + (hi[1][i] - lo[1][i]) * k) for i in range(3)))
    return g.resize((size, size))


def radial_bloom(size, color, inner_alpha=210):
    """Soft radial glow, white->transparent alpha tinted with `color`."""
    m = Image.new("L", (size, size), 0)
    px = m.load()
    c = size / 2.0
    for y in range(size):
        dy = (y - c) / c
        for x in range(size):
            dx = (x - c) / c
            d = math.hypot(dx, dy)
            a = 0.0 if d >= 1.0 else (1.0 - d) ** 2.6
            px[x, y] = int(a * inner_alpha)
    m = m.filter(ImageFilter.GaussianBlur(size * 0.02))
    layer = Image.new("RGBA", (size, size), color + (0,))
    layer.putalpha(m)
    return layer


# ---------- build squircle mask ----------
mask = Image.new("L", (W, W), 0)
ImageDraw.Draw(mask).polygon(squircle_points(W), fill=255)

# ---------- tile: gradient + grid ----------
tile = vgrad(W, BG_TOP, BG_BOT).convert("RGBA")

grid = Image.new("RGBA", (W, W), (0, 0, 0, 0))
gd = ImageDraw.Draw(grid)
step = W // 16
for i in range(1, 16):
    gd.line([(i * step, 0), (i * step, W)], fill=CYAN + (10,), width=SS)
    gd.line([(0, i * step), (W, i * step)], fill=CYAN + (10,), width=SS)
tile = Image.alpha_composite(tile, grid)

# accent bloom behind the prompt
bloom = radial_bloom(int(W * 0.92), GLOW, inner_alpha=150)
tile.alpha_composite(bloom, (int(W * 0.04), int(W * 0.08)))

tile.putalpha(mask)

# top inner rim highlight (glassy)
rim = Image.new("RGBA", (W, W), (0, 0, 0, 0))
ImageDraw.Draw(rim).polygon(squircle_points(W), outline=(255, 255, 255, 46), width=SS * 5)
rim.putalpha(Image.composite(rim.getchannel("A"), Image.new("L", (W, W), 0), mask))
tile = Image.alpha_composite(tile, rim)

# ---------- prompt glyph  >_  ----------
STROKE = int(W * 0.072)          # stroke width
r = STROKE / 2.0

chev = [(int(W * 0.330), int(W * 0.352)),
        (int(W * 0.548), int(W * 0.512)),
        (int(W * 0.330), int(W * 0.672))]
under = [(int(W * 0.598), int(W * 0.665)), (int(W * 0.744), int(W * 0.665))]

# scale down for breathing room, then centre the glyph bounding box on the tile
SCALE = 0.84
cx = (min(p[0] for p in chev + under) + max(p[0] for p in chev + under)) / 2
cy = (min(p[1] for p in chev + under) + max(p[1] for p in chev + under)) / 2
chev = [(cx + (x - cx) * SCALE, cy + (y - cy) * SCALE) for x, y in chev]
under = [(cx + (x - cx) * SCALE, cy + (y - cy) * SCALE) for x, y in under]
STROKE = int(STROKE * SCALE)
r = STROKE / 2.0

xs = [p[0] for p in chev + under]
ys = [p[1] for p in chev + under]
dx = W / 2 - (min(xs) - r + max(xs) + r) / 2
dy = W / 2 - (min(ys) - r + max(ys) + r) / 2
shift = lambda pts: [(x + dx, y + dy) for x, y in pts]
chev, under = shift(chev), shift(under)

glyph_mask = Image.new("L", (W, W), 0)
gm = ImageDraw.Draw(glyph_mask)
for pts in (chev, under):
    gm.line(pts, fill=255, width=STROKE, joint="curve")
    for p in (pts[0], pts[-1]):          # round caps
        gm.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)

glyph = hgrad(W, [(0.0, CYAN), (0.45, BLUE), (1.0, VIOLET)]).convert("RGBA")

# neon halo around the glyph
halo = Image.new("RGBA", (W, W), (0, 0, 0, 0))
halo.putalpha(glyph_mask.filter(ImageFilter.GaussianBlur(STROKE * 0.55)))
halo_col = Image.new("RGBA", (W, W), CYAN + (0,))
halo_col.putalpha(halo.getchannel("A").point(lambda a: int(a * 0.55)))
tile = Image.alpha_composite(tile, halo_col)

glyph.putalpha(glyph_mask)
tile = Image.alpha_composite(tile, glyph)

# ---------- drop shadow ----------
shadow = Image.new("L", (W, W), 0)
ImageDraw.Draw(shadow).polygon(squircle_points(W), fill=255)
shadow = shadow.filter(ImageFilter.GaussianBlur(W * 0.018))
shadow_layer = Image.new("RGBA", (W, W), (0, 0, 0, 0))
shadow_layer.putalpha(shadow.point(lambda a: int(a * 0.45)))

canvas = Image.new("RGBA", (W, W), (0, 0, 0, 0))
canvas.alpha_composite(shadow_layer, (0, int(W * 0.012)))
canvas.alpha_composite(tile)

# ---------- downscale ----------
icon = canvas.resize((SIZE, SIZE), Image.LANCZOS)
icon.save(OUT)
print(f"wrote {OUT} ({SIZE}x{SIZE})")
