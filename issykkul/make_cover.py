#!/usr/bin/env python3
"""Instagram cover for the Issyk-Kul short: half living lake / half salt desert."""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import render as R

R.BASE = R.build_base()
W, H = R.W, R.H
im = R.BASE.copy().convert("RGBA")

# full lake and dried lake, split by a jagged diagonal seam through the lake
full = R.lake_layer(1.0, 0.0, 1.0)
dry = R.lake_layer(0.0, 1.0, 0.0)
mask = Image.new("L", (W, H), 0)
md = ImageDraw.Draw(mask)
cx = R.LAKE_C[0]
seam = [(cx + 40 + (i % 2) * 30 - 15, y) for i, y in enumerate(range(int(R.LAKE.min(0)[1]) - 20, int(R.LAKE.max(0)[1]) + 40, 35))]
md.polygon([(0, 0), (seam[0][0], 0)] + seam + [(seam[-1][0], H), (0, H)], fill=255)
lay = Image.composite(full, dry, mask)
im.alpha_composite(lay)
# cracks on the salt side
cl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(cl)
rng = np.random.default_rng(4)
xmin, ymin = R.LAKE.min(0)
xmax, ymax = R.LAKE.max(0)
for _ in range(60):
    x, y = rng.uniform(cx + 30, xmax - 20), rng.uniform(ymin + 20, ymax - 20)
    pts = [(x, y)]
    for _ in range(4):
        x += rng.uniform(-28, 28); y += rng.uniform(-28, 28)
        pts.append((x, y))
    d.line(pts, fill=(150, 135, 110, 170), width=2)
cl.putalpha(Image.fromarray(np.minimum(np.asarray(cl.getchannel("A")), np.asarray(dry.getchannel("A")))))
im.alpha_composite(cl)
# glowing seam
sl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sl).line(seam, fill=(255, 220, 140, 255), width=5)
im.alpha_composite(sl.filter(ImageFilter.GaussianBlur(10)))
im.alpha_composite(sl)

R.headline(im, "ЫСЫК-КӨЛ", 380, 170, R.CYAN, (0, 140, 255))
R.headline(im, "СООЛУП КАЛСА", 555, 112, R.WHITE)
R.headline(im, "ЭМНЕ БОЛОТ?", 690, 112, R.YEL, (255, 120, 0))

# red hook pill
pill = Image.new("RGBA", (520, 96), (0, 0, 0, 0))
pd = ImageDraw.Draw(pill)
pd.rounded_rectangle([0, 0, 519, 95], radius=48, fill=(220, 20, 30, 240))
R.text(pd, (260, 48), "170 ЖЫЛДА −14 М", R.font(R.F_BLACK, 50))
im.alpha_composite(pill, ((W - 520) // 2, 205))

# stat badges under the lake
R.pop_layer(im, R.stat_card("≈10 МЛРД Т", "ТУЗ КАЛАТ", R.YEL, w=470, h=170, icon="🧂"), 285, 1390, 1)
R.pop_layer(im, R.stat_card("118 → 0", "КИРЕТ / ЧЫГАТ", R.CYAN, w=470, h=170, icon="🌊"), 795, 1390, 1)

out = Image.new("RGB", (W, H))
out.paste(im.convert("RGB"))
out.save(os.path.join(R.ROOT, "COVER_issykkul_1080x1920.jpg"), quality=95)
out.crop((0, 285, 1080, 1635)).save(os.path.join(R.ROOT, "COVER_issykkul_grid_1080x1350.jpg"), quality=95)
print("ok")
