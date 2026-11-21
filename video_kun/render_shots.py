#!/usr/bin/env python3
"""Render the visual shots of the 'Күн өчсө эмне болот?' short (1080x1920, 30fps).

Each shot = a still AI image animated with sub-pixel camera moves (PIL affine),
colour grade (warm before the Sun dies, cold blue after), vignette, grain and
per-shot effects (flicker, moon fade, frost, white flash ...).
"""
import math
import os
import random
import subprocess
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(ROOT, "img")
OUT = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)

W, H, FPS = 1080, 1920, 30
SRC_W, SRC_H = 2048, 1152

# ---------------------------------------------------------------- helpers

def ease(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def lerp(a, b, t):
    return a + (b - a) * t


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
_r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
VIGNETTE = np.clip(1.0 - 0.38 * np.clip(_r - 0.55, 0, None) ** 1.6, 0.45, 1.0)[..., None]
del yy, xx, _r


def camera(src, cx, cy, z):
    """Sub-pixel crop: centre (cx,cy) in source px, zoom z (1 = full height)."""
    s = (SRC_H / H) / z
    half_w, half_h = W / 2 * s, H / 2 * s
    cx = min(max(cx, half_w), SRC_W - half_w)
    cy = min(max(cy, half_h), SRC_H - half_h)
    data = (s, 0, cx - W / 2 * s, 0, s, cy - H / 2 * s)
    return src.transform((W, H), Image.AFFINE, data, resample=Image.BICUBIC)


def grade(a, mode, amount=1.0):
    """a: float32 HxWx3 0..1"""
    if mode == "warm":
        m = np.array([1.06, 1.0, 0.90], np.float32)
        a = a * lerp(np.ones(3, np.float32), m, amount)
    elif mode == "cold":
        lum = a.mean(axis=2, keepdims=True)
        a = lerp(a, lum, 0.25 * amount)  # desaturate a bit
        m = np.array([0.82, 0.95, 1.12], np.float32)
        a = a * lerp(np.ones(3, np.float32), m, amount)
    # gentle S-curve contrast
    a = np.clip(a, 0, 1)
    a = a + 0.10 * (a - 0.5) * (1 - np.abs(2 * a - 1))
    return a


def finish(a, rng):
    a = a * VIGNETTE
    a = a + rng.normal(0, 0.012, (H // 4, W // 4, 1)).astype(np.float32).repeat(4, 0).repeat(4, 1)
    return np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)


def load(name):
    return Image.open(os.path.join(IMG, name)).convert("RGB")


def make_moon(r=78):
    size = r * 6
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    c = size // 2
    # glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([c - r * 1.9, c - r * 1.9, c + r * 1.9, c + r * 1.9], fill=(170, 200, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(r * 0.6))
    im.alpha_composite(glow)
    disc = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    dd = ImageDraw.Draw(disc)
    dd.ellipse([c - r, c - r, c + r, c + r], fill=(222, 226, 232, 255))
    rng = random.Random(7)
    for _ in range(26):  # maria and craters
        rr = rng.uniform(r * 0.06, r * 0.32)
        ang, dist = rng.uniform(0, 2 * math.pi), rng.uniform(0, r * 0.75)
        x, y = c + math.cos(ang) * dist, c + math.sin(ang) * dist
        tone = rng.randint(150, 195)
        dd.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(tone, tone + 3, tone + 8, 255))
    disc = disc.filter(ImageFilter.GaussianBlur(1.6))
    im.alpha_composite(disc)
    return im


# ---------------------------------------------------------------- shots
# (name, image, duration, fn(t, u) -> (cx, cy, z)), effects keyed by name
SHOTS = [
    ("01_sun", "s1_sun.png", 3.0),
    ("02_black", None, 4.5),
    ("03_beam", "s2a_beam.png", 3.8),
    ("04_street", "s2b_street.png", 3.7),
    ("05_dark", "s3_dark.png", 8.0),
    ("06_earth", "s4_earth.png", 5.0),
    ("07_forest", "s5a_forest.png", 4.2),
    ("08_window", "s5b_window.png", 4.3),
    ("09_ice", "s6a_ice.png", 4.3),
    ("10_vents", "s6b_vents.png", 6.7),
    ("11_frozen", "s7a_frozen.png", 2.8),
    ("12_sunrise", "s7b_sunrise.png", 9.7),
]


def render(shot):
    name, img, dur = shot
    n = int(round(dur * FPS))
    path = os.path.join(OUT, name + ".mp4")
    rng = np.random.default_rng(abs(hash(name)) % 2**32)
    prng = random.Random(name)
    src = load(img) if img else None
    stars = None
    if name == "02_black":
        st = camera(load("s7a_frozen.png"), 1500, 576, 1.0)
        stars = np.asarray(st, np.float32) / 255.0
    moon = make_moon() if name == "05_dark" else None

    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
         "-preset", "medium", "-crf", "15", "-pix_fmt", "yuv420p", path],
        stdin=subprocess.PIPE)

    for i in range(n):
        t = i / FPS
        u = i / max(n - 1, 1)
        e = ease(u)
        if name == "01_sun":
            fr = camera(src, 1024, 576, lerp(1.0, 1.18, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "warm", 1.0)
            # pulsing heat
            a = a * (1.0 + 0.04 * math.sin(t * 7))
            if t > 2.25:  # flicker and die
                k = (t - 2.25) / 0.75
                f = prng.choice([0.05, 0.25, 0.6, 1.0, 0.1]) * (1 - k) ** 1.5
                a = a * f
        elif name == "02_black":
            k = ease((t - 1.2) / 2.5) * 0.22
            a = stars * k
            a = grade(a, "cold", 1.0)
        elif name == "03_beam":
            fr = camera(src, 1024, lerp(470, 690, e), 1.22)
            a = grade(np.asarray(fr, np.float32) / 255.0, "warm", 1.0)
            a = a * (1.0 + 0.06 * math.sin(t * 11))  # beam shimmer
        elif name == "04_street":
            fr = camera(src, lerp(900, 980, e), 576, lerp(1.05, 1.16, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "warm", 1.0)
        elif name == "05_dark":
            fr = camera(src, 1024, lerp(560, 600, e), lerp(1.0, 1.14, e)).convert("RGBA")
            # moon fades out (reflects only sunlight)
            alpha = 1.0 - ease((t - 3.0) / 1.6)
            if alpha > 0.01:
                m = moon.copy()
                m.putalpha(m.getchannel("A").point(lambda p: int(p * alpha)))
                fr.alpha_composite(m, (W - 400, 170))
            a = grade(np.asarray(fr.convert("RGB"), np.float32) / 255.0, "cold", 1.0)
            if t < 0.12:  # hard blackout frame
                a = a * 0.0
            else:
                a = a * min(1.0, 0.35 + (t - 0.12) * 1.4)
        elif name == "06_earth":
            fr = camera(src, lerp(1180, 870, e), lerp(640, 610, e), lerp(1.55, 1.0, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "cold", 1.0)
        elif name == "07_forest":
            fr = camera(src, lerp(1000, 1080, e), 576, lerp(1.0, 1.15, e))
            a = np.asarray(fr, np.float32) / 255.0
            a = grade(a, "cold", 0.6 + 0.6 * e)
            a = a * (1.0 - 0.18 * e)
        elif name == "08_window":
            fr = camera(src, 830, 576, lerp(1.08, 1.22, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "cold", 0.9)
        elif name == "09_ice":
            fr = camera(src, 1065, lerp(560, 700, e), lerp(1.0, 1.3, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "cold", 0.8)
        elif name == "10_vents":
            fr = camera(src, 990, lerp(660, 520, e), lerp(1.08, 1.25, e))
            a = np.asarray(fr, np.float32) / 255.0
            a = grade(a, "cold", 0.35)  # keep warm glow of vents
            a = a * (1.0 + 0.05 * math.sin(t * 5.3))
        elif name == "11_frozen":
            fr = camera(src, 880, 720, lerp(1.6, 1.15, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "cold", 1.0)
        elif name == "12_sunrise":
            fr = camera(src, 1024, lerp(560, 600, e), lerp(1.0, 1.2, e))
            a = grade(np.asarray(fr, np.float32) / 255.0, "warm", 1.0)
            a = a * lerp(0.75, 1.05, ease(t / 2.0))
            wf = 1.0 - ease(t / 0.7)  # reignition white flash
            a = a * (1 - wf) + wf
        a = finish(a, rng)
        proc.stdin.write(a.tobytes())
    proc.stdin.close()
    proc.wait()
    return path


if __name__ == "__main__":
    only = sys.argv[1:]
    shots = [s for s in SHOTS if not only or s[0] in only]
    with Pool(4) as p:
        for r in p.imap_unordered(render, shots):
            print("done", r, flush=True)
    with open(os.path.join(OUT, "concat.txt"), "w") as f:
        for s in SHOTS:
            f.write(f"file '{s[0]}.mp4'\n")
    print("total", sum(s[2] for s in SHOTS))
