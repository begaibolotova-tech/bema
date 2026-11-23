#!/usr/bin/env python3
"""Instagram Reels cover (1080x1920). Key text kept inside the 4:5 grid-safe zone (y 285-1635)."""
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "img")
W, H = 1080, 1920
BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"


def cover_crop(im, cx, cy, scale):
    """crop a 9:16 window of height src_h/scale centred at (cx, cy) and resize to WxH"""
    h = im.height / scale
    w = h * W / H
    box = (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
    return im.resize((W, H), Image.LANCZOS, box=box)


# ---------- background: sun, left half alive / right half dead & frozen
sun = Image.open(os.path.join(IMG, "s1_sun.png")).convert("RGB")
bg = cover_crop(sun, 1024, 576, 1.0)
a = np.asarray(bg, np.float32) / 255
lum = a.mean(axis=2, keepdims=True)
dead = np.concatenate([lum * 0.35, lum * 0.6, lum * 0.95], axis=2) * 0.55 + 0.02

# jagged seam
rng = random.Random(3)
ky = np.arange(0, H + 60, 55)
kx = W / 2 + np.array([rng.uniform(-38, 38) for _ in ky])
xs = np.interp(np.arange(H), ky, kx)
xx = np.arange(W)[None, :]
mask = (xx > xs[:, None]).astype(np.float32)[..., None]
mix = a * 1.08 * np.array([1.05, 1.0, 0.85]) * (1 - mask) + dead * mask
img = Image.fromarray((np.clip(mix, 0, 1) * 255).astype(np.uint8))

# ice cracks on the dead side
cr = Image.new("L", (W, H), 0)
cd = ImageDraw.Draw(cr)
crng = random.Random(11)
for _ in range(9):
    y = crng.uniform(0, H * 0.75)
    x = float(np.interp(y, np.arange(H), xs)) + 4
    pts = [(x, y)]
    for _ in range(crng.randint(5, 10)):
        x += crng.uniform(25, 70); y += crng.uniform(-45, 45)
        pts.append((x, y))
    cd.line(pts, fill=crng.randint(70, 140), width=crng.choice([2, 3, 4]))
cr = np.asarray(cr.filter(ImageFilter.GaussianBlur(1.2)), np.float32)[..., None] / 255
arr = np.asarray(img, np.float32) / 255
arr = arr * (1 - cr) + np.array([0.8, 0.93, 1.0]) * cr
img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))

# glowing seam
seam = Image.new("L", (W, H), 0)
sd = ImageDraw.Draw(seam)
sd.line([(xs[y], y) for y in range(0, H, 2)], fill=255, width=7)
glow = seam.filter(ImageFilter.GaussianBlur(18))
core = seam.filter(ImageFilter.GaussianBlur(2))
img = ImageChops.screen(img, Image.merge("RGB", [glow.point(lambda p: p), glow.point(lambda p: int(p * .55)), glow.point(lambda p: int(p * .15))]))
img = ImageChops.screen(img, Image.merge("RGB", [core, core, core.point(lambda p: int(p * .8))]))

# ---------- bottom: frozen Earth fading in
fe = cover_crop(Image.open(os.path.join(IMG, "s7a_frozen.png")).convert("RGB"), 880, 500, 1.3)
fade = np.clip((np.arange(H) - 1180) / 380, 0, 1)[:, None, None]
arr = np.asarray(img, np.float32) * (1 - fade) + np.asarray(fe, np.float32) * fade
img = Image.fromarray(arr.astype(np.uint8))

# darken top & bottom for text legibility + vignette
yy = np.arange(H)[:, None, None] / H
shade = 1 - 0.55 * np.clip((0.42 - yy) / 0.42, 0, 1) ** 1.3 - 0.35 * np.clip((yy - 0.8) / 0.2, 0, 1)
arr = np.asarray(img, np.float32) * shade
img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")


# ---------- typography
def text_layer(txt, font, fill, stroke=0, stroke_fill="black"):
    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    l, t, r, b = d.textbbox((0, 0), txt, font=font, stroke_width=stroke)
    lay = Image.new("RGBA", (r - l + 160, b - t + 160), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((80 - l, 80 - t), txt, font=font, fill=fill,
                             stroke_width=stroke, stroke_fill=stroke_fill)
    return lay


def gradient_text(txt, font, top, bottom, stroke=10):
    base = text_layer(txt, font, (255, 255, 255, 255))
    g = Image.new("RGBA", base.size)
    gd = ImageDraw.Draw(g)
    for y in range(base.height):
        k = y / base.height
        gd.line([(0, y), (base.width, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * k) for i in range(3)) + (255,))
    g.putalpha(base.getchannel("A"))
    out = text_layer(txt, font, (0, 0, 0, 255), stroke, "black")
    out.alpha_composite(g)
    return out


def place(layer, cy, glow_col=None, glow_r=28):
    x = (W - layer.width) // 2
    y = int(cy - layer.height / 2)
    if glow_col:
        gl = Image.new("RGBA", layer.size, glow_col + (0,))
        gl.putalpha(layer.getchannel("A").filter(ImageFilter.GaussianBlur(glow_r)))
        for _ in range(2):
            img.alpha_composite(gl, (x, y))
    img.alpha_composite(layer, (x, y))


# small hook pill
f_pill = ImageFont.truetype(XB, 46)
pill_txt = "8 МҮНӨТТӨН КИЙИН..."
pw = int(ImageDraw.Draw(img).textlength(pill_txt, font=f_pill)) + 80
pill = Image.new("RGBA", (pw, 92), (0, 0, 0, 0))
pdraw = ImageDraw.Draw(pill)
pdraw.rounded_rectangle([0, 0, pw - 1, 91], radius=46, fill=(220, 20, 30, 235))
pdraw.text((pw / 2, 46), pill_txt, font=f_pill, fill="white", anchor="mm")
img.alpha_composite(pill, ((W - pw) // 2, 345))

f_big = ImageFont.truetype(BLACK, 250)
place(gradient_text("КҮН", f_big, (255, 236, 120), (255, 120, 10), 12), 590, (255, 120, 0), 30)
place(gradient_text("ӨЧСӨ", f_big, (225, 248, 255), (90, 180, 255), 12), 820, (60, 160, 255), 30)

f_q = ImageFont.truetype(BLACK, 118)
place(text_layer("ЭМНЕ БОЛОТ?", f_q, (255, 255, 255, 255), 10), 1010, (0, 0, 0), 20)

# temperature badge bottom-right of safe zone
f_t = ImageFont.truetype(BLACK, 104)
temp = gradient_text("−70°C", f_t, (230, 250, 255), (110, 200, 255), 9)
tx, ty = W - temp.width + 30, 1400
gl = Image.new("RGBA", temp.size, (60, 170, 255, 0))
gl.putalpha(temp.getchannel("A").filter(ImageFilter.GaussianBlur(22)))
img.alpha_composite(gl, (tx, ty))
img.alpha_composite(temp, (tx, ty))

out = os.path.join(ROOT, "COVER_instagram_1080x1920.jpg")
img.convert("RGB").save(out, quality=95)
# grid preview (4:5 centre crop) for checking
img.convert("RGB").crop((0, 285, 1080, 1635)).save(os.path.join(ROOT, "build", "cover_grid_preview.jpg"), quality=90)
print(out)
