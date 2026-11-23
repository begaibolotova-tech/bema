#!/usr/bin/env python3
"""«Ысык-Көл соолуп калса эмне болот?» — 60s 1080x1920 infographic short.

Real lake outline / rivers / relief from GSHHS + shaded-relief (geo/issykkul.json, geo/relief.png).
All infographics are drawn here frame by frame. Captions are added later (subs.ass).
"""
import json
import math
import os
import random
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)
W, H, FPS, DUR = 1080, 1920, 30, 60.0

F_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
F_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
F_SB = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

CYAN = (64, 214, 255)
DEEP = (10, 90, 160)
SALT = (236, 228, 210)
YEL = (255, 212, 0)
RED = (255, 70, 70)
WHITE = (255, 255, 255)

geo = json.load(open(os.path.join(ROOT, "geo", "issykkul.json")))
LON0, LAT0 = 77.25, 42.45
S = 611.0          # px per degree latitude
COSL = math.cos(math.radians(LAT0))
MAPC = (540, 1010)  # screen position of LON0/LAT0


def proj(lon, lat):
    return (MAPC[0] + (lon - LON0) * COSL * S, MAPC[1] - (lat - LAT0) * S)


LAKE = np.array([proj(*p) for p in geo["lake"]])
LAKE_C = LAKE.mean(axis=0)
# deepest part sits a little east/south of the centroid
SINK = LAKE_C + np.array([30, 10])
RIVERS = [np.array([proj(*p) for p in r]) for r in geo["rivers"]]
BORDERS = [np.array([proj(*p) for p in b]) for b in geo["borders"]]


def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def back(x):  # ease-out-back for pops
    x = min(max(x, 0.0), 1.0)
    c = 1.70158
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


@lru_cache(None)
def font(path, size):
    return ImageFont.truetype(path, size)


@lru_cache(None)
def emoji(ch, size):
    f = ImageFont.truetype(EMOJI, 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10, 10), ch, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    k = size / max(im.width, im.height)
    return im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)


# ------------------------------------------------------------ static base map
def build_base():
    base = Image.new("RGB", (W, H))
    # vertical navy gradient
    g = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([6, 14, 30]), np.array([3, 8, 18])
    arr = (top * (1 - g) + bot * g)[:, None, :].repeat(W, 1)
    base = Image.fromarray(arr.astype(np.uint8))
    # relief texture, tinted blue
    rel = Image.open(os.path.join(ROOT, "geo", "relief.png")).convert("L")
    x0, y1 = proj(75.0, 41.2)
    x1, y0 = proj(79.6, 43.6)
    rel = rel.resize((int(x1 - x0), int(y1 - y0)), Image.BICUBIC).filter(ImageFilter.GaussianBlur(9))
    r = np.asarray(rel, np.float32) / 255
    r = (r - r.mean()) * 1.1 + 0.45
    tint = np.stack([r * 28, r * 52, r * 88], -1)
    relief = Image.fromarray(np.clip(tint, 0, 255).astype(np.uint8))
    mask = Image.new("L", relief.size, 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([60, 60, relief.width - 60, relief.height - 60], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(70))
    base.paste(relief, (int(x0), int(y0)), mask)
    d = ImageDraw.Draw(base, "RGBA")
    # faint lat/lon grid
    for lon in np.arange(75.5, 79.6, 0.5):
        x = proj(lon, 42)[0]
        d.line([(x, 0), (x, H)], fill=(80, 140, 200, 22), width=1)
    for lat in np.arange(41.5, 43.6, 0.5):
        y = proj(77, lat)[1]
        d.line([(0, y), (W, y)], fill=(80, 140, 200, 22), width=1)
    for b in BORDERS:
        d.line([tuple(p) for p in b], fill=(255, 255, 255, 40), width=2)
    for rv in RIVERS:
        d.line([tuple(p) for p in rv], fill=(60, 160, 220, 60), width=2)
    return base


BASE = None

# procedural inflow streams (118 total incl. real ones) from mountains to shore
rng = random.Random(118)
STREAMS = []
n_pts = len(LAKE)
for i in range(118):
    k = rng.randrange(n_pts)
    shore = LAKE[k]
    v = shore - LAKE_C
    v = v / np.linalg.norm(v)
    length = rng.uniform(90, 260)
    start = shore + v * length + np.array([rng.uniform(-40, 40), rng.uniform(-40, 40)])
    pts = []
    for j in range(13):
        u = j / 12
        p = start * (1 - u) + shore * u
        p = p + np.array([-v[1], v[0]]) * math.sin(u * math.pi * rng.uniform(1, 3)) * rng.uniform(4, 14) * (1 - u)
        pts.append(p)
    STREAMS.append((np.array(pts), rng.uniform(0, 1.2)))


# ------------------------------------------------------------ drawing helpers
def lake_layer(k_water, salt_alpha, glow=1.0, water_col=CYAN):
    """RGBA full frame layer: salt flat (original outline) + shrinking water."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ss = 2
    xmin, ymin = LAKE.min(0) - 60
    xmax, ymax = LAKE.max(0) + 60
    bw, bh = int(xmax - xmin), int(ymax - ymin)
    off = np.array([xmin, ymin])
    if salt_alpha > 0:
        m = Image.new("L", (bw * ss, bh * ss), 0)
        ImageDraw.Draw(m).polygon([tuple((p - off) * ss) for p in LAKE], fill=int(255 * salt_alpha))
        m = m.resize((bw, bh), Image.LANCZOS)
        salt = Image.new("RGBA", (bw, bh), SALT + (0,))
        noise = Image.effect_noise((bw, bh), 40).point(lambda p: int(p * 0.5))
        salt = Image.merge("RGBA", [*Image.new("RGB", (bw, bh), SALT).split(), ImageChops.multiply(m, Image.eval(noise, lambda p: 200 + p // 4))])
        lay.alpha_composite(salt, (int(xmin), int(ymin)))
    if k_water > 0.003:
        poly = SINK + (LAKE - SINK) * k_water
        m = Image.new("L", (bw * ss, bh * ss), 0)
        ImageDraw.Draw(m).polygon([tuple((p - off) * ss) for p in poly], fill=255)
        m = m.resize((bw, bh), Image.LANCZOS)
        if glow > 0:
            gl = m.filter(ImageFilter.GaussianBlur(22)).point(lambda p: int(p * 0.9 * glow))
            lay.alpha_composite(Image.merge("RGBA", [*Image.new("RGB", (bw, bh), water_col).split(), gl]), (int(xmin), int(ymin)))
        # water gradient fill
        grad = np.zeros((bh, bw, 3), np.float32)
        yy = np.linspace(0, 1, bh)[:, None]
        grad[...] = (np.array(DEEP) * yy + np.array(water_col) * (1 - yy))[:, None, :][:, 0:1, :]
        water = Image.fromarray(grad.astype(np.uint8))
        water.putalpha(m)
        lay.alpha_composite(water, (int(xmin), int(ymin)))
        edge = Image.new("L", (bw * ss, bh * ss), 0)
        ImageDraw.Draw(edge).line([tuple((p - off) * ss) for p in np.vstack([poly, poly[:1]])], fill=255, width=4 * ss)
        edge = edge.resize((bw, bh), Image.LANCZOS)
        lay.alpha_composite(Image.merge("RGBA", [*Image.new("RGB", (bw, bh), (190, 245, 255)).split(), edge]), (int(xmin), int(ymin)))
    return lay


@lru_cache(None)
def lake_cached(k, salt, glow):
    return lake_layer(k, salt, glow)


def text(d, xy, s, f, fill=WHITE, anchor="mm", stroke=0, sfill=(0, 0, 0)):
    d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=sfill)


def card(im, box, alpha=1.0, border=CYAN):
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle(box, radius=34, fill=(8, 20, 40, int(215 * alpha)), outline=border + (int(200 * alpha),), width=3)
    im.alpha_composite(lay)


def pop_layer(im, layer, cx, cy, p, alpha=1.0):
    """composite `layer` centred at cx,cy with pop scale p (0..1)"""
    if p <= 0:
        return
    s = 0.6 + 0.4 * back(p)
    l = layer.resize((max(1, int(layer.width * s)), max(1, int(layer.height * s))), Image.BICUBIC)
    if alpha < 1 or p < 1:
        a = min(1.0, p * 3) * alpha
        l.putalpha(l.getchannel("A").point(lambda v: int(v * a)))
    im.alpha_composite(l, (int(cx - l.width / 2), int(cy - l.height / 2)))


def stat_card(value, label, col=CYAN, w=900, h=190, icon=None):
    lay = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([20, 20, 20 + w, 20 + h], radius=36, fill=(8, 22, 44, 225), outline=col + (230,), width=4)
    x = 70
    if icon:
        e = emoji(icon, 104)
        lay.alpha_composite(e, (60, 20 + (h - e.height) // 2))
        x = 200
    fs = 96
    while fs > 40 and d.textlength(value, font=font(F_BLACK, fs)) > w - x - 10:
        fs -= 4
    text(d, (x, 20 + h * 0.40), value, font(F_BLACK, fs), fill=col, anchor="lm")
    text(d, (x + 4, 20 + h * 0.80), label, font(F_XB, 38), fill=(205, 225, 245), anchor="lm")
    return lay


def headline(im, s, y, size=92, col=WHITE, glow_col=None, p=1.0):
    f = font(F_BLACK, size)
    lay = Image.new("RGBA", (W, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    text(d, (W / 2, size), s, f, fill=col, stroke=8, sfill=(0, 0, 0))
    if glow_col:
        g = Image.new("RGBA", lay.size, glow_col + (0,))
        g.putalpha(lay.getchannel("A").filter(ImageFilter.GaussianBlur(20)))
        lay = Image.alpha_composite(g, lay)
    pop_layer(im, lay, W / 2, y, p)


def source(im, s, a=1.0):
    d = ImageDraw.Draw(im)
    text(d, (W / 2, 1660), s, font(F_SB, 27), fill=(150, 175, 205, int(220 * a)))


def label_tag(im, s, xy, col=YEL, a=1.0, size=44):
    d = ImageDraw.Draw(im)
    text(d, xy, s, font(F_BLACK, size), fill=col + (int(255 * a),), stroke=6, sfill=(0, 0, 0, int(255 * a)))


# ------------------------------------------------------------ scenes
def camera(img, z, dx=0, dy=0):
    if abs(z - 1) < 1e-4 and dx == 0 and dy == 0:
        return img
    s = 1 / z
    data = (s, 0, W / 2 - W / 2 * s + dx, 0, s, H / 2 - H / 2 * s + dy)
    return img.transform((W, H), Image.AFFINE, data, resample=Image.BICUBIC)


def scene(t):
    im = BASE.copy().convert("RGBA")
    d = ImageDraw.Draw(im)

    # ---------------- S1 HOOK 0-6
    if t < 6:
        pulse = 0.75 + 0.25 * math.sin(t * 4)
        k = 1 - ease((t - 2.2) / 3.0) * 0.97
        salt = ease((t - 2.4) / 2.0)
        im.alpha_composite(lake_layer(k, salt, pulse))
        headline(im, "ЫСЫК-КӨЛ", 330, 150, CYAN, (0, 140, 255), ease(t / 0.35))
        headline(im, "СООЛУП КАЛСА", 480, 108, WHITE, None, ease((t - 0.25) / 0.35))
        headline(im, "ЭМНЕ БОЛОТ?", 610, 108, YEL, (255, 120, 0), ease((t - 0.5) / 0.35))
        z = 1 + 0.05 * ease(t / 6)
        return camera(im, z)

    # ---------------- S2 SIZE 6-15
    if t < 15:
        u = t - 6
        im.alpha_composite(lake_cached(1.0, 0.0, 1.0))
        # dimension arrow (182 km)
        a = ease((u - 0.3) / 0.6)
        if a > 0:
            y = LAKE.max(0)[1] + 70
            x0, x1 = LAKE.min(0)[0], LAKE.max(0)[0]
            xm = (x0 + x1) / 2
            hw = (x1 - x0) / 2 * a
            d.line([(xm - hw, y), (xm + hw, y)], fill=YEL + (255,), width=5)
            for xx in (xm - hw, xm + hw):
                d.line([(xx, y - 18), (xx, y + 18)], fill=YEL + (255,), width=5)
            label_tag(im, "182 км", (xm, y + 50), YEL, a, 48)
            xr = x1 + 0
            ys0, ys1 = LAKE.min(0)[1], LAKE.max(0)[1]
        stats = [
            (0.2, "6 236 км²", "АЯНТЫ", "🗺️"),
            (2.0, "668 м", "ЭҢ ТЕРЕҢ ЖЕРИ", "🌊"),
            (4.1, "1 738 км³", "СУУНУН КӨЛӨМҮ", "💧"),
        ]
        for i, (st, val, lab, ic) in enumerate(stats):
            p = ease((u - st) / 0.45)
            if p <= 0:
                continue
            # number count-up
            num = val.split(" ")
            target = float(val.replace(" ", "").replace("км²", "").replace("км³", "").replace("м", ""))
            cur = int(target * ease((u - st) / 1.0))
            sval = f"{cur:,}".replace(",", " ") + " " + val.split(" ")[-1]
            pop_layer(im, stat_card(sval, lab, CYAN, icon=ic), W / 2, 250 + i * 225, p)
        if u > 6.6:
            headline(im, "ДҮЙНӨДӨГҮ ЭҢ ТЕРЕҢ 10 КӨЛДҮН БИРИ", 1250, 46, YEL, None, ease((u - 6.6) / 0.4))
        source(im, "Булак: Wikipedia; HESS (2018)", ease((u - 0.5)))
        return camera(im, 1 + 0.04 * ease(u / 9))

    # ---------------- S3 RIVERS 15-23
    if t < 23:
        u = t - 15
        im.alpha_composite(lake_cached(1.0, 0.0, 1.0))
        lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        grow = ease(u / 2.2)
        for pts, delay in STREAMS:
            g = ease((u - delay * 0.8) / 1.6)
            if g <= 0:
                continue
            n = max(2, int(len(pts) * g))
            ld.line([tuple(p) for p in pts[:n]], fill=(90, 220, 255, 170), width=3)
            # flowing droplet
            ph = ((u * 0.6 + delay) % 1.0)
            idx = ph * (len(pts) - 1)
            i0 = int(idx)
            if i0 < n - 1:
                p = pts[i0] + (pts[i0 + 1] - pts[i0]) * (idx - i0)
                ld.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], fill=(220, 250, 255, 230))
        gl = lay.filter(ImageFilter.GaussianBlur(6))
        im.alpha_composite(gl)
        im.alpha_composite(lay)
        cnt = int(118 * ease(u / 2.0))
        pop_layer(im, stat_card(f"{cnt}", "ДАРЫЯ-СУУ КӨЛГӨ АГАТ", CYAN, icon="⬇️"), W / 2, 300, ease(u / 0.4))
        if u > 2.2:
            pop_layer(im, stat_card("0", "АГЫП ЧЫККАН ДАРЫЯ ЖОК", RED, icon="🚫"), W / 2, 530, ease((u - 2.2) / 0.4))
        if u > 4.4:  # evaporation
            a = ease((u - 4.4) / 0.6)
            ev = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ed = ImageDraw.Draw(ev)
            for j in range(9):
                x = LAKE.min(0)[0] + 80 + j * (LAKE.max(0)[0] - LAKE.min(0)[0] - 160) / 8
                ph = (u * 0.7 + j * 0.37) % 1.0
                y0 = LAKE_C[1] - 30 - ph * 260
                pts = [(x + 14 * math.sin((y0 - k * 12) / 18 + j), y0 - k * 12) for k in range(10)]
                ed.line(pts, fill=(230, 245, 255, int(200 * a * (1 - ph))), width=5)
            im.alpha_composite(ev)
            e = emoji("☁️", 120)
            for j, x in enumerate((300, 560, 800)):
                pop_layer(im, e, x, 760 + 18 * math.sin(u * 2 + j), a)
            headline(im, "СУУ БУУЛАНЫП ГАНА КЕТЕТ", 1250, 52, WHITE, None, a)
        source(im, "Булак: HESS (2018) — бассейнде 118 дарыя-суу")
        return camera(im, 1 + 0.04 * ease(u / 8))

    # ---------------- S4 LEVEL & GLACIERS 23-33
    if t < 33:
        u = t - 23
        k = 1 - 0.06 * ease(u / 8)
        im.alpha_composite(lake_layer(k, 0.5 * ease(u / 4), 0.9))
        # chart card
        bx = (70, 170, 1010, 780)
        card(im, bx, ease(u / 0.4))
        if u > 0.2:
            cx0, cy0, cx1, cy1 = 170, 290, 950, 690
            a = ease((u - 0.2) / 0.4)
            text(d, (540, 225), "КӨЛДҮН ДЕҢГЭЭЛИ", font(F_BLACK, 50), fill=WHITE + (int(255 * a),))
            d.line([(cx0, cy0), (cx0, cy1), (cx1, cy1)], fill=(160, 190, 220, int(200 * a)), width=3)
            for v, lbl in ((0, "0 м"), (-7, "−7"), (-14, "−14 м")):
                y = cy0 + (-v / 14) * (cy1 - cy0 - 40)
                d.line([(cx0, y), (cx1, y)], fill=(160, 190, 220, int(50 * a)), width=1)
                text(d, (cx0 - 15, y), lbl, font(F_XB, 30), fill=(190, 210, 235, int(255 * a)), anchor="rm")
            for x, yr in ((cx0, "1850"), ((cx0 + cx1) / 2, "1940"), (cx1, "2025")):
                text(d, (x, cy1 + 32), yr, font(F_XB, 30), fill=(190, 210, 235, int(255 * a)))
            # schematic curve
            g = ease((u - 0.6) / 2.6)
            n = 120
            pts = []
            for i in range(int(n * g) + 1):
                q = i / n
                v = -14 * (0.15 * q + 0.85 * q ** 1.35) + 0.5 * math.sin(q * 23) * (1 - q)
                pts.append((cx0 + q * (cx1 - cx0), cy0 + (-v / 14) * (cy1 - cy0 - 40)))
            if len(pts) > 1:
                d.line(pts, fill=RED + (255,), width=8, joint="curve")
                px, py = pts[-1]
                d.ellipse([px - 12, py - 12, px + 12, py + 12], fill=RED + (255,))
            if u > 3.3:
                label_tag(im, "≈ −14 М", (cx1 - 120, cy1 - 110), RED, ease((u - 3.3) / 0.4), 64)
        # glacier bar
        if u > 4.6:
            a = ease((u - 4.6) / 0.4)
            card(im, (70, 1180, 1010, 1380), a, (150, 220, 255))
            e = emoji("🏔️", 96)
            pop_layer(im, e, 160, 1280, a)
            text(d, (250, 1225), "ТООЛОРДОГУ МӨҢГҮЛӨР", font(F_BLACK, 40), fill=WHITE + (int(255 * a),), anchor="lm")
            frac = 1 - 0.3 * ease((u - 5.0) / 2.0)
            d.rounded_rectangle([250, 1270, 250 + 640, 1330], radius=30, fill=(40, 60, 90, int(255 * a)))
            d.rounded_rectangle([250, 1270, 250 + 640 * frac, 1330], radius=30, fill=(200, 240, 255, int(255 * a)))
            if u > 6.5:
                label_tag(im, "−30%+", (250 + 640 * 0.85, 1300), RED, ease((u - 6.5) / 0.3), 46)
        source(im, "Булак: Кабар / КР Президенти (2024); RFE/RL — график схемалык")
        return camera(im, 1.0)

    # ---------------- S5 SALT & ARAL 33-43
    if t < 43:
        u = t - 33
        k = 0.94 * (1 - ease(u / 3.0)) + 0.0
        salt = 0.5 + 0.5 * ease(u / 2.0)
        im.alpha_composite(lake_layer(k, salt, 0.6))
        # salt dust storm particles
        if u > 1.5:
            a = ease((u - 1.5) / 1.0)
            dust = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            dd = ImageDraw.Draw(dust)
            r = random.Random(5)
            for j in range(260):
                x0 = r.uniform(LAKE.min(0)[0], LAKE.max(0)[0])
                y0 = r.uniform(LAKE.min(0)[1], LAKE.max(0)[1])
                sp = r.uniform(80, 260)
                x = (x0 + (u - 1.5) * sp) % (W + 200) - 100
                y = y0 - (u - 1.5) * r.uniform(10, 60) + 20 * math.sin(u * 2 + j)
                s = r.uniform(2, 6)
                dd.ellipse([x - s, y - s, x + s, y + s], fill=(245, 238, 222, int(r.uniform(60, 170) * a)))
            im.alpha_composite(dust.filter(ImageFilter.GaussianBlur(1.5)))
        pop_layer(im, stat_card("≈10 МЛРД Т", "ТУЗ КӨЛДҮН ТҮБҮНДӨ КАЛАТ", YEL, icon="🧂"), W / 2, 290, ease((u - 0.8) / 0.45))
        if u > 4.6:  # Aral comparison
            a = ease((u - 4.6) / 0.4)
            card(im, (70, 1150, 1010, 1420), a, (255, 180, 80))
            text(d, (540, 1195), "АРАЛ ДЕҢИЗИ", font(F_BLACK, 50), fill=WHITE + (int(255 * a),))
            g = ease((u - 5.0) / 1.5)
            for i, (yr, frac, col) in enumerate((("1960", 1.0, CYAN), ("2007", 0.1, RED))):
                y = 1240 + i * 82
                text(d, (130, y + 28), yr, font(F_XB, 40), fill=(210, 225, 240, int(255 * a)), anchor="lm")
                ww = 640 * (frac if i == 0 else 1 - (1 - frac) * g)
                d.rounded_rectangle([260, y, 260 + ww, y + 56], radius=28, fill=col + (int(255 * a),))
            if u > 6.6:
                label_tag(im, "−90%", (820, 1350), RED, ease((u - 6.6) / 0.3), 56)
        source(im, "Туз: 1 738 км³ × ~6 г/л (өз эсеп); Арал: Wikipedia")
        return camera(im, 1 + 0.03 * ease(u / 10))

    # ---------------- S6 CONSEQUENCES 43-52
    if t < 52:
        u = t - 43
        im.alpha_composite(lake_cached(0.0, 1.0, 0.0))
        items = [
            (0.2, "🌡️", "КЫШ СУУГУРААК,", "ЖАЙ ЫСЫГЫРААК", RED),
            (2.6, "🐟", "БАЛЫКТАР", "ЖОГОЛОТ", CYAN),
            (4.0, "🦢", "КЫШТАГАН КУШТАР", "КЕТЕТ", CYAN),
            (5.4, "🏖️", "ЖЭЭКТЕГИ ТУРИЗМ", "ТОКТОЙТ", YEL),
        ]
        for i, (st, ic, l1, l2, col) in enumerate(items):
            p = ease((u - st) / 0.45)
            if p <= 0:
                continue
            cw, ch = 470, 300
            lay = Image.new("RGBA", (cw + 20, ch + 20), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ld.rounded_rectangle([10, 10, 10 + cw, 10 + ch], radius=34, fill=(8, 22, 44, 230), outline=col + (230,), width=4)
            e = emoji(ic, 110)
            lay.alpha_composite(e, (10 + (cw - e.width) // 2, 34))
            text(ld, (10 + cw / 2, 205), l1, font(F_BLACK, 38), fill=WHITE)
            text(ld, (10 + cw / 2, 255), l2, font(F_BLACK, 38), fill=col)
            cx = 290 + (i % 2) * 500
            cy = 330 + (i // 2) * 340
            pop_layer(im, lay, cx, cy, p)
        headline(im, "ТАБИГЫЙ ЖЫЛЫТКЫЧ ЖОГОЛОТ", 1250, 50, YEL, None, ease((u - 0.8) / 0.4))
        return camera(im, 1.0)

    # ---------------- S7 HOPE + CTA 52-60
    u = t - 52
    k = ease(u / 3.2)
    im.alpha_composite(lake_layer(k, 1 - k, 0.6 + 0.4 * k))
    pop_layer(im, stat_card("СУУНУ ҮНӨМДӨ", "КӨЛДҮ САКТАП КАЛАБЫЗ", CYAN, icon="💧"), W / 2, 300, ease((u - 0.5) / 0.45))
    if u > 3.6:
        headline(im, "КИЙИНКИ ТЕМА?", 560, 104, WHITE, (0, 140, 255), ease((u - 3.6) / 0.35))
        pop_layer(im, emoji("👇", 130), W / 2, 720 + 20 * abs(math.sin((u - 3.6) * 5)), ease((u - 3.8) / 0.3))
    return camera(im, 1 + 0.03 * ease(u / 8))


def render_chunk(args):
    i0, i1, idx = args
    global BASE
    BASE = build_base()
    path = os.path.join(OUT, f"chunk_{idx:02d}.mp4")
    rng = np.random.default_rng(idx)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = np.clip(1 - 0.35 * np.clip(np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) - 0.6, 0, None), 0.5, 1)[..., None]
    for i in range(i0, i1):
        fr = scene(i / FPS).convert("RGB")
        a = np.asarray(fr, np.float32) * vig
        a += rng.normal(0, 2.5, (H // 4, W // 4, 1)).astype(np.float32).repeat(4, 0).repeat(4, 1)
        p.stdin.write(np.clip(a, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close()
    p.wait()
    return path


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "still":
        BASE = build_base()
        for tt in map(float, sys.argv[2:]):
            scene(tt).convert("RGB").save(os.path.join(OUT, f"still_{tt:05.1f}.jpg"), quality=85)
        sys.exit()
    n = int(DUR * FPS)
    parts = 8
    jobs = [(n * k // parts, n * (k + 1) // parts, k) for k in range(parts)]
    with Pool(4) as pool:
        for r in pool.imap_unordered(render_chunk, jobs):
            print("done", r, flush=True)
    with open(os.path.join(OUT, "concat.txt"), "w") as f:
        for k in range(parts):
            f.write(f"file 'chunk_{k:02d}.mp4'\n")
