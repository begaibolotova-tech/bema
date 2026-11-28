#!/usr/bin/env python3
"""WOW cover: giant bloodshot eye with a clock for an iris, 1% battery, purple night."""
import os

from PIL import Image, ImageDraw, ImageFilter

import render as V

R = V.R
W, H = V.W, V.H
im = V.base_frame()

# red/violet glow behind the eye
g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(g)
gd.ellipse([-80, 640, W + 80, 1330], fill=(255, 40, 70, 110))
im.alpha_composite(g.filter(ImageFilter.GaussianBlur(150)))

e = V.eye(1060, 1.0, 1.0, (0, 0), clock_t=118)  # ~3:56 — late night
sh = Image.new("RGBA", e.size, (0, 0, 0, 0))
sh.putalpha(e.getchannel("A").filter(ImageFilter.GaussianBlur(25)).point(lambda v: int(v * 0.6)))
ex, ey = (W - e.width) // 2, 990 - e.height // 2
im.alpha_composite(sh, (ex, ey + 20))
im.alpha_composite(e, (ex, ey))

# badges
bat = V.battery(0.01, w=300, h=110)
R.pop_layer(im, bat, 250, 1360, 1)
R.pop_layer(im, R.emoji("😵", 120), 830, 1360, 1)

pl = V.pill("264 СААТ — РЕКОРД")
im.alpha_composite(pl, ((W - pl.width) // 2, 300))
R.headline(im, "БИР ЖУМА", 470, 150, V.VIOLET, (120, 60, 255))
R.headline(im, "УКТАБАСАҢ...", 610, 120, V.WHITE)
R.headline(im, "ЭМНЕ БОЛОТ?", 1530, 120, V.YEL, (255, 120, 0))

out = im.convert("RGB")
out.save(os.path.join(V.ROOT, "COVER_uiku_1080x1920.jpg"), quality=95)
out.crop((0, 285, 1080, 1635)).save(os.path.join(V.ROOT, "COVER_uiku_grid_1080x1350.jpg"), quality=95)
print("ok")
