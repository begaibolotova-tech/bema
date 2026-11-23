#!/usr/bin/env python3
"""Cover: «Океандын эң терең жерине түшсө эмне болот?» — depth-scale infographic, 1080x1920.
Key content kept inside the 4:5 grid-safe zone (y 285-1635)."""
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "issykkul"))
import render as R  # noqa: E402  (fonts, emoji, headline helpers)

W, H = 1080, 1920
ROOT = os.path.dirname(os.path.abspath(__file__))
SURF, BOTTOM, DEPTH = 760, 1590, 10935.0  # Challenger Deep ≈ 10 935 m


def y_of(depth):
    return SURF + (BOTTOM - SURF) * depth / DEPTH


# ---------- background: night sky above, ocean gradient below
yy = np.arange(H)[:, None].astype(np.float32)
sky = np.array([10, 24, 52]) * (1 - yy / SURF) + np.array([22, 70, 120]) * (yy / SURF)
k = np.clip((yy - SURF) / (BOTTOM - SURF), 0, 1)
k = k ** 0.55
sea = np.array([20, 140, 200]) * (1 - k) + np.array([1, 4, 12]) * k
arr = np.where(yy < SURF, sky, sea)[:, None, :].repeat(W, 1)
im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
d = ImageDraw.Draw(im)

# light rays from the surface
rays = Image.new("RGBA", (W, H), (0, 0, 0, 0))
rd = ImageDraw.Draw(rays)
rng = random.Random(2)
for _ in range(9):
    x = rng.uniform(80, 1000)
    w = rng.uniform(30, 90)
    rd.polygon([(x - w / 2, SURF), (x + w / 2, SURF), (x + w * 2.5 + 60, SURF + 520), (x - w * 1.5 + 60, SURF + 520)],
               fill=(180, 235, 255, 26))
im.alpha_composite(rays.filter(ImageFilter.GaussianBlur(14)))

# floating particles ("marine snow")
pl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
pd = ImageDraw.Draw(pl)
for _ in range(420):
    x, y = rng.uniform(0, W), rng.uniform(SURF + 40, BOTTOM + 200)
    s = rng.uniform(1, 3.2)
    pd.ellipse([x - s, y - s, x + s, y + s], fill=(200, 230, 255, int(rng.uniform(40, 150))))
im.alpha_composite(pl.filter(ImageFilter.GaussianBlur(0.6)))

# wavy surface line
wave = [(x, SURF + 8 * math.sin(x / 38)) for x in range(0, W + 10, 6)]
d.line(wave, fill=(200, 245, 255, 230), width=5)

# ---------- Everest silhouette standing on the trench floor (for scale)
peak_y = y_of(DEPTH - 8849)
mt = [(-40, BOTTOM + 40), (60, BOTTOM - 120), (150, BOTTOM - 330), (230, peak_y + 210), (300, peak_y + 70),
      (345, peak_y), (395, peak_y + 95), (470, peak_y + 150), (540, BOTTOM - 360), (640, BOTTOM - 150),
      (720, BOTTOM + 40)]
ml = Image.new("RGBA", (W, H), (0, 0, 0, 0))
md = ImageDraw.Draw(ml)
md.polygon(mt, fill=(26, 40, 60, 255))
md.line(mt, fill=(120, 170, 210, 200), width=3)
# snow cap
md.polygon([(300, peak_y + 70), (345, peak_y), (395, peak_y + 95), (360, peak_y + 80), (330, peak_y + 105)],
           fill=(225, 240, 255, 235))
im.alpha_composite(ml)
# trench floor
d.rectangle([0, BOTTOM + 30, W, H], fill=(2, 5, 10, 255))

# gap between Everest peak and the surface
gx = 345
d.line([(gx, SURF + 14), (gx, peak_y - 14)], fill=(255, 212, 0, 255), width=4)
for yv in (SURF + 14, peak_y - 14):
    d.line([(gx - 16, yv), (gx + 16, yv)], fill=(255, 212, 0, 255), width=4)
R.label_tag(im, "ЭВЕРЕСТ", (gx, peak_y + 180), R.WHITE, 1, 40)
R.label_tag(im, "8 849 м", (gx, peak_y + 228), (180, 215, 245), 1, 34)
R.label_tag(im, "+2 км", (gx + 105, (SURF + peak_y) / 2), R.YEL, 1, 40)

# ---------- depth ruler on the right
rx = 1000
d.line([(rx, SURF), (rx, BOTTOM)], fill=(200, 230, 255, 200), width=4)
marks = [(0, "0 м", None), (2000, "2 км", None), (4000, "4 км", None), (6000, "", None),
         (8000, "8 км", None), (10935, "", None)]
for dep, lbl, em in marks:
    y = y_of(dep)
    d.line([(rx - 22, y), (rx, y)], fill=(200, 230, 255, 230), width=4)
    if not lbl:
        continue
    R.text(d, (rx - 32, y), lbl, R.font(R.F_XB, 30), fill=(210, 232, 250), anchor="rm", stroke=4)
    if em:
        R.pop_layer(im, R.emoji(em, 84), rx - 230, y + 12, 1)
# diver at the surface heading down
R.pop_layer(im, R.emoji("🤿", 92), 840, SURF + 70, 1)
R.pop_layer(im, R.emoji("🐋", 100), 660, y_of(1500), 1)
R.pop_layer(im, R.emoji("🦑", 84), 860, y_of(9100), 1)

# bottom: glowing depth + question mark
R.headline(im, "≈11 КМ ТЕРЕҢДИК", BOTTOM - 40, 66, R.CYAN, (0, 140, 255))

# pressure badge
R.pop_layer(im, R.stat_card("1 000+ АТМ", "БАСЫМ", R.RED, w=480, h=160, icon="💥"), 720, y_of(6300), 1)

# ---------- title (above the surface)
pill = Image.new("RGBA", (560, 92), (0, 0, 0, 0))
pd2 = ImageDraw.Draw(pill)
pd2.rounded_rectangle([0, 0, 559, 91], radius=46, fill=(220, 20, 30, 240))
R.text(pd2, (280, 46), "МАРИАНА ОЙДУҢУ", R.font(R.F_BLACK, 46))
im.alpha_composite(pill, ((W - 560) // 2, 300))
R.headline(im, "ОКЕАНДЫН ЭҢ ТЕРЕҢ", 470, 84, R.WHITE)
R.headline(im, "ЖЕРИНЕ ТҮШСӨ", 565, 100, R.CYAN, (0, 140, 255))
R.headline(im, "ЭМНЕ БОЛОТ?", 675, 112, R.YEL, (255, 120, 0))

# vignette
v = np.asarray(im.convert("RGB"), np.float32)
Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
rr = np.sqrt(((X - W / 2) / (W / 2)) ** 2 + ((Y - H / 2) / (H / 2)) ** 2)
v *= np.clip(1 - 0.35 * np.clip(rr - 0.65, 0, None), 0.5, 1)[..., None]
out = Image.fromarray(np.clip(v, 0, 255).astype(np.uint8))
out.save(os.path.join(ROOT, "COVER_okean_1080x1920.jpg"), quality=95)
out.crop((0, 285, 1080, 1635)).save(os.path.join(ROOT, "COVER_okean_grid_1080x1350.jpg"), quality=95)
print("ok")
