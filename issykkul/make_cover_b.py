#!/usr/bin/env python3
"""Cover variant B: before/after — the living lake (БҮГҮН) above the salt desert (ЭРТЕҢ?)."""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import render as R

R.BASE = R.build_base()
W, H = R.W, R.H
base = R.BASE.copy().convert("RGBA")
full = R.lake_layer(1.0, 0.0, 1.0)
dry = R.lake_layer(0.0, 1.0, 0.0)
cy = R.LAKE_C[1]


def place(layer, dy, scale=0.92):
    """move the lake layer so its centre sits at cy+dy, slightly smaller"""
    s = 1 / scale
    data = (s, 0, W / 2 - W / 2 * s, 0, s, cy - (cy + dy) * s)
    return layer.transform((W, H), Image.AFFINE, data, resample=Image.BICUBIC)


im = base.copy()
top = place(full, -300, 0.85)
bot = place(dry, 190, 0.82)
# cracks on the salt lake, clipped to it
cl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(cl)
rng = np.random.default_rng(9)
a = np.asarray(bot.getchannel("A"))
ys, xs = np.nonzero(a > 200)
for _ in range(110):
    j = rng.integers(len(xs))
    x, y = float(xs[j]), float(ys[j])
    pts = [(x, y)]
    for _ in range(4):
        x += rng.uniform(-26, 26); y += rng.uniform(-26, 26)
        pts.append((x, y))
    d.line(pts, fill=(140, 125, 100, 190), width=2)
cl.putalpha(Image.fromarray(np.minimum(np.asarray(cl.getchannel("A")), a)))
im.alpha_composite(top)
im.alpha_composite(bot)
im.alpha_composite(cl)

# divider arrow between states
dd = ImageDraw.Draw(im)
dd.line([(140, cy - 70), (W - 140, cy - 70)], fill=(255, 255, 255, 60), width=2)
R.pop_layer(im, R.emoji("⬇️", 96), W / 2, cy - 70, 1)

R.label_tag(im, "БҮГҮН", (W / 2, cy - 490), R.CYAN, 1, 64)
R.label_tag(im, "ЭРТЕҢ?", (W / 2, cy + 5), R.RED, 1, 64)

R.headline(im, "ЫСЫК-КӨЛ", 385, 140, R.CYAN, (0, 140, 255))
R.headline(im, "СООЛУП КАЛСА...", 1405, 96, R.WHITE)
R.headline(im, "ЭМНЕ БОЛОТ?", 1525, 100, R.YEL, (255, 120, 0))

out = im.convert("RGB")
out.save(os.path.join(R.ROOT, "COVER_B_issykkul_1080x1920.jpg"), quality=95)
out.crop((0, 285, 1080, 1635)).save(os.path.join(R.ROOT, "COVER_B_issykkul_grid_1080x1350.jpg"), quality=95)
print("ok")
