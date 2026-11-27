#!/usr/bin/env python3
"""WOW cover: dead red world network + tilted phone with cracked screen and crossed Wi-Fi."""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

import render as V

R = V.R
W, H = V.W, V.H
im = V.base_frame()

# red glow behind phone
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([90, 620, 990, 1450], fill=(255, 30, 40, 120))
im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(140)))
V.network(im, 0.0, 0.0)

# ---------- phone
PW, PH = 500, 900
ph = Image.new("RGBA", (PW + 80, PH + 80), (0, 0, 0, 0))
d = ImageDraw.Draw(ph)
ox, oy = 40, 40
d.rounded_rectangle([ox, oy, ox + PW, oy + PH], radius=70, fill=(28, 30, 38, 255), outline=(150, 155, 170, 255), width=6)
sx0, sy0, sx1, sy1 = ox + 22, oy + 22, ox + PW - 22, oy + PH - 22
d.rounded_rectangle([sx0, sy0, sx1, sy1], radius=52, fill=(6, 8, 14, 255))
# screen red vignette
scr = Image.new("RGBA", ph.size, (0, 0, 0, 0))
ImageDraw.Draw(scr).ellipse([sx0 + 40, sy0 + 200, sx1 - 40, sy1 - 260], fill=(255, 40, 50, 90))
ph.alpha_composite(scr.filter(ImageFilter.GaussianBlur(60)))
d = ImageDraw.Draw(ph)
d.rounded_rectangle([ox + PW / 2 - 70, sy0 + 14, ox + PW / 2 + 70, sy0 + 46], radius=16, fill=(0, 0, 0, 255))  # notch
# status bar: no signal
R.text(d, (sx0 + 60, sy0 + 30), "09:41", R.font(R.F_XB, 28), fill=(230, 230, 235))
for i in range(4):
    x = sx1 - 120 + i * 18
    d.rectangle([x, sy0 + 40 - 6 - i * 6, x + 10, sy0 + 40], outline=(120, 120, 130), width=2)
R.text(d, (sx1 - 30, sy0 + 30), "✕", R.font(R.F_BLACK, 26), fill=(255, 70, 70))
# crossed wifi
wf = V.wifi(300, V.RED, 1.0, 1.0)
ph.alpha_composite(wf, (int(ox + PW / 2 - 150), int(sy0 + 170)))
R.text(d, (ox + PW / 2, sy0 + 540), "ИНТЕРНЕТ", R.font(R.F_BLACK, 62), fill=(255, 255, 255))
R.text(d, (ox + PW / 2, sy0 + 610), "ЖОК", R.font(R.F_BLACK, 62), fill=(255, 70, 70))
R.text(d, (ox + PW / 2, sy0 + 690), "Байланыш үзүлдү", R.font(R.F_SB, 30), fill=(170, 175, 190))
# cracks radiating from an impact point
crack = Image.new("RGBA", ph.size, (0, 0, 0, 0))
cd = ImageDraw.Draw(crack)
rng = random.Random(21)
cx, cy = sx1 - 120, sy0 + 260
for k in range(14):
    ang = k / 14 * 2 * math.pi + rng.uniform(-0.2, 0.2)
    x, y = cx, cy
    pts = [(x, y)]
    for j in range(rng.randint(4, 8)):
        step = rng.uniform(40, 90)
        ang += rng.uniform(-0.35, 0.35)
        x += math.cos(ang) * step
        y += math.sin(ang) * step
        pts.append((x, y))
    cd.line(pts, fill=(235, 240, 255, 190), width=3)
for r in (40, 85):
    cd.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(235, 240, 255, 120), width=2)
m = Image.new("L", ph.size, 0)
ImageDraw.Draw(m).rounded_rectangle([sx0, sy0, sx1, sy1], radius=52, fill=255)
crack.putalpha(Image.fromarray(np.minimum(np.asarray(crack.getchannel("A")), np.asarray(m))))
ph.alpha_composite(crack)
# glossy reflection
gl = Image.new("RGBA", ph.size, (0, 0, 0, 0))
ImageDraw.Draw(gl).polygon([(sx0, sy0), (sx0 + 230, sy0), (sx0, sy0 + 420)], fill=(255, 255, 255, 22))
gl.putalpha(Image.fromarray(np.minimum(np.asarray(gl.getchannel("A")), np.asarray(m))))
ph.alpha_composite(gl)
# notification badge
badge = Image.new("RGBA", (230, 120), (0, 0, 0, 0))
bd = ImageDraw.Draw(badge)
bd.rounded_rectangle([0, 0, 229, 119], radius=60, fill=(255, 40, 50, 255), outline=(255, 255, 255, 255), width=5)
R.text(bd, (115, 60), "3000+", R.font(R.F_BLACK, 56))
ph.alpha_composite(badge, (PW - 150, 0))

ph = ph.rotate(-7, resample=Image.BICUBIC, expand=True)
shadow = Image.new("RGBA", ph.size, (0, 0, 0, 0))
shadow.putalpha(ph.getchannel("A").point(lambda v: int(v * 0.7)).filter(ImageFilter.GaussianBlur(30)))
px, py = int(W / 2 - ph.width / 2), 590
im.alpha_composite(shadow, (px + 25, py + 35))
im.alpha_composite(ph, (px, py))

# ---------- title with RGB-split glitch
def glitch_title(s, y, size, col):
    f = R.font(R.F_BLACK, size)
    lay = Image.new("RGBA", (W, size * 2), (0, 0, 0, 0))
    for dx, c in ((-7, (255, 0, 60, 200)), (7, (0, 220, 255, 200))):
        l2 = Image.new("RGBA", lay.size, (0, 0, 0, 0))
        R.text(ImageDraw.Draw(l2), (W / 2 + dx, size), s, f, fill=c)
        lay.alpha_composite(l2)
    R.text(ImageDraw.Draw(lay), (W / 2, size), s, f, fill=col, stroke=8, sfill=(0, 0, 0))
    # slice offsets
    a = np.asarray(lay).copy()
    r = random.Random(s)
    for _ in range(2):
        yy = r.randrange(int(size * 0.55), int(size * 1.35))
        hh = r.randrange(5, 10)
        a[yy:yy + hh] = np.roll(a[yy:yy + hh], r.choice([-9, 8, 11]), axis=1)
    lay = Image.fromarray(a)
    im.alpha_composite(lay, (0, int(y - size)))


pill = Image.new("RGBA", (620, 92), (0, 0, 0, 0))
pd = ImageDraw.Draw(pill)
pd.rounded_rectangle([0, 0, 619, 91], radius=46, fill=(220, 20, 30, 245))
R.text(pd, (310, 46), "6 МЛРД АДАМ ОФЛАЙН", R.font(R.F_BLACK, 46))
im.alpha_composite(pill, ((W - 620) // 2, 300))
glitch_title("ИНТЕРНЕТ", 470, 160, V.CYAN)
R.headline(im, "7 КҮНГӨ ӨЧСӨ...", 600, 96, V.WHITE)
R.headline(im, "ЭМНЕ БОЛОТ?", 1530, 120, V.YEL, (255, 120, 0))

out = im.convert("RGB")
out.save(os.path.join(V.ROOT, "COVER_internet_1080x1920.jpg"), quality=95)
out.crop((0, 285, 1080, 1635)).save(os.path.join(V.ROOT, "COVER_internet_grid_1080x1350.jpg"), quality=95)
print("ok")
