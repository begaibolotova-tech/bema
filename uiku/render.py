#!/usr/bin/env python3
"""«Бир жума уктабасаң эмне болот?» — 60s 1080x1920 infographic short (timeline from real VO)."""
import importlib.util
import json
import math
import os
import random
import subprocess
import sys
from functools import lru_cache
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("ik_render", os.path.join(ROOT, "..", "issykkul", "render.py"))
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)

OUT = os.path.join(ROOT, "build")
W, H, FPS, DUR = 1080, 1920, 30, 60.0
ease, back, font, emoji, text = R.ease, R.back, R.font, R.emoji, R.text
CYAN, YEL, RED, WHITE = R.CYAN, R.YEL, R.RED, R.WHITE
GREEN = (60, 230, 130)
VIOLET = (170, 120, 255)


def vo_dur(i):
    f = os.path.join(ROOT, "vo", f"vo{i}.mp3")
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)


DURS = [vo_dur(i) for i in range(1, 8)]
LEAD = 0.35
_pad = (DUR - sum(DURS) - LEAD * 7 - 2.0) / 6
STARTS, _t = [], 0.0
for _i, _d in enumerate(DURS):
    STARTS.append(_t)
    _t += _d + LEAD + (_pad if _i < 6 else 0)

# per scene: label, hours awake at end, battery level at end
SC = [
    ("", 0, 1.00),
    ("1-КҮН", 24, 0.72),
    ("2-КҮН", 48, 0.48),
    ("3-КҮН", 72, 0.28),
    ("5-КҮН", 120, 0.10),
    ("РЕКОРД", 264, 0.02),
    ("ЖЫЙЫНТЫК", 0, 1.00),
]


# ------------------------------------------------------------ drawings
def base_frame():
    g = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([22, 12, 48]), np.array([5, 4, 16])
    arr = (top * (1 - g) + bot * g)[:, None, :].repeat(W, 1)
    im = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
    st = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(st)
    r = random.Random(1)
    for _ in range(260):
        x, y, s = r.uniform(0, W), r.uniform(0, H), r.uniform(0.6, 2.2)
        d.ellipse([x - s, y - s, x + s, y + s], fill=(220, 210, 255, int(r.uniform(40, 160))))
    im.alpha_composite(st)
    gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(gl).ellipse([-100, 420, W + 100, 1250], fill=(90, 50, 200, 60))
    im.alpha_composite(gl.filter(ImageFilter.GaussianBlur(170)))
    return im


def eye(size, openness=1.0, red=0.0, look=(0, 0), clock_t=None):
    """Vector eye: almond sclera, red veins (red 0..1), iris+pupil, optional clock in the iris."""
    ss = 2
    S = size * ss
    im = Image.new("RGBA", (S, int(S * 0.62)), (0, 0, 0, 0))
    w, h = im.size
    cx, cy = w / 2, h / 2
    half = h * 0.46 * max(openness, 0.04)
    top = [(cx - w * 0.47 + i * (w * 0.94) / 40, cy - half * math.sin(math.pi * i / 40)) for i in range(41)]
    bot = [(cx + w * 0.47 - i * (w * 0.94) / 40, cy + half * math.sin(math.pi * i / 40)) for i in range(41)]
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).polygon(top + bot, fill=255)
    sc = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(sc)
    sd.rectangle([0, 0, w, h], fill=(250, 240, 240, 255))
    # pink rim
    rim = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(rim).polygon(top + bot, outline=(230, 120, 130, int(140 + 110 * red)), width=int(S * 0.03))
    sc.alpha_composite(rim.filter(ImageFilter.GaussianBlur(S * 0.02)))
    # veins
    r = random.Random(5)
    vd = ImageDraw.Draw(sc)
    for k in range(int(30 * red)):
        side = (-1, 1)[k % 2]
        x, y = cx + side * w * r.uniform(0.38, 0.47), cy + r.uniform(-half, half) * 0.7
        pts = [(x, y)]
        for _ in range(r.randint(3, 6)):
            x -= side * r.uniform(S * 0.02, S * 0.05)
            y += r.uniform(-S * 0.03, S * 0.03)
            pts.append((x, y))
        vd.line(pts, fill=(205, 30, 40, int(150 + 100 * red)), width=max(2, int(S * r.uniform(0.004, 0.009))))
    # iris
    ir = h * 0.36
    ix, iy = cx + look[0] * w * 0.12, cy + look[1] * h * 0.1
    irs = Image.new("RGBA", im.size, (0, 0, 0, 0))
    idr = ImageDraw.Draw(irs)
    for k in range(30, 0, -1):
        f = k / 30
        col = (int(30 + 60 * f), int(90 + 90 * f), int(120 + 80 * f), 255)
        idr.ellipse([ix - ir * f, iy - ir * f, ix + ir * f, iy + ir * f], fill=col)
    if clock_t is None:
        pr = ir * (0.42 + 0.1 * red)
        idr.ellipse([ix - pr, iy - pr, ix + pr, iy + pr], fill=(8, 8, 12, 255))
    else:  # clock face in the iris
        cr = ir * 0.78
        idr.ellipse([ix - cr, iy - cr, ix + cr, iy + cr], fill=(12, 14, 26, 255), outline=(240, 240, 255, 255), width=int(S * 0.008))
        for k in range(12):
            a = k / 12 * 2 * math.pi
            idr.line([(ix + math.sin(a) * cr * 0.8, iy - math.cos(a) * cr * 0.8), (ix + math.sin(a) * cr * 0.92, iy - math.cos(a) * cr * 0.92)],
                     fill=(240, 240, 255, 255), width=int(S * 0.006))
        for ang, ln, wd in ((clock_t * 0.5, 0.5, 0.012), (clock_t * 6, 0.75, 0.007)):
            a = math.radians(ang)
            idr.line([(ix, iy), (ix + math.sin(a) * cr * ln, iy - math.cos(a) * cr * ln)], fill=(255, 80, 80, 255), width=int(S * wd))
    idr.ellipse([ix - ir * 0.55 + ir * 0.6, iy - ir * 0.62, ix - ir * 0.55 + ir * 0.85, iy - ir * 0.37], fill=(255, 255, 255, 220))
    sc.alpha_composite(irs)
    sc.putalpha(mask)
    im.alpha_composite(sc)
    lid = ImageDraw.Draw(im)
    lid.line(top, fill=(40, 20, 50, 255), width=int(S * 0.018))
    lid.line(bot, fill=(90, 50, 80, 200), width=int(S * 0.008))
    return im.resize((size, int(size * 0.62)), Image.LANCZOS)


def battery(level, w=560, h=200, charging=False):
    lay = Image.new("RGBA", (w + 80, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([10, 10, 10 + w, 10 + h], radius=34, outline=(235, 235, 255, 255), width=10)
    d.rounded_rectangle([w + 14, h / 2 - 30, w + 44, h / 2 + 50], radius=10, fill=(235, 235, 255, 255))
    col = GREEN if level > 0.5 else (YEL if level > 0.2 else RED)
    if charging:
        col = GREEN
    fw = (w - 40) * max(level, 0.015)
    d.rounded_rectangle([30, 30, 30 + fw, h - 10], radius=20, fill=col + (255,))
    text(d, (10 + w / 2, 10 + h / 2), f"{int(round(level * 100))}%", font(R.F_BLACK, 84), stroke=6)
    g = Image.new("RGBA", lay.size, col + (0,))
    g.putalpha(lay.getchannel("A").filter(ImageFilter.GaussianBlur(14)).point(lambda v: v // 2))
    return Image.alpha_composite(g, lay)


def pill(label, col=(220, 20, 30)):
    f = font(R.F_BLACK, 54)
    tw = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength(label, font=f)
    lay = Image.new("RGBA", (int(tw) + 100, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([0, 0, lay.width - 1, 95], radius=48, fill=col + (245,))
    text(d, (lay.width / 2, 48), label, f)
    return lay


def hours_counter(im, hrs, y, a=1.0):
    d = ImageDraw.Draw(im)
    text(d, (W / 2, y), f"{int(hrs)}", font(R.F_BLACK, 150), fill=WHITE + (int(255 * a),), stroke=8, sfill=(0, 0, 0, int(255 * a)))
    text(d, (W / 2, y + 95), "СААТ УКТАБАЙ", font(R.F_XB, 40), fill=(200, 190, 240, int(255 * a)))


def warp(im, amt, t):
    if amt <= 0:
        return im
    a = np.asarray(im)
    out = np.empty_like(a)
    ys = np.arange(H)
    shifts = (np.sin(ys / 38 + t * 5) * 14 * amt).astype(int)
    for y in range(0, H, 2):
        out[y:y + 2] = np.roll(a[y:y + 2], shifts[y], axis=1)
    return Image.fromarray(out)


# ------------------------------------------------------------ scenes
def scene(t):
    im = BASE.copy()
    s = max(i for i in range(7) if STARTS[i] <= t)
    u = t - STARTS[s]
    sd = STARTS[s + 1] - STARTS[s] if s < 6 else DUR - STARTS[s]
    d = ImageDraw.Draw(im)
    label, hrs_end, bat_end = SC[s]
    hrs_prev = SC[s - 1][1] if s > 0 else 0
    bat_prev = SC[s - 1][2] if s > 0 else 1.0
    k = ease(u / max(sd - 0.5, 1))

    if s == 0:  # HOOK: big bloodshot eye that won't close
        R.headline(im, "БИР ЖУМА", 330, 140, VIOLET, (120, 60, 255), ease(t / 0.35))
        R.headline(im, "УКТАБАСАҢ", 470, 130, WHITE, None, ease((t - 0.2) / 0.35))
        R.headline(im, "ЭМНЕ БОЛОТ?", 610, 112, YEL, (255, 120, 0), ease((t - 0.4) / 0.35))
        blink = 1.0
        for bt in (1.6, 3.4):  # tries to blink but snaps open
            if bt < t < bt + 0.45:
                blink = 0.15 + 0.85 * abs(math.cos((t - bt) / 0.45 * math.pi))
        e = eye(900, blink, ease(t / 4.5), (0.25 * math.sin(t * 9) * ease((t - 2) / 2), 0))
        R.pop_layer(im, e, W / 2, 1050, ease(t / 0.5))
        hours_counter(im, 0, 1340, ease((t - 0.8) / 0.4))
        return im

    # common header: day pill + battery + hours counter
    pc = (120, 70, 230) if s >= 5 else (220, 20, 30)
    if s == 6:
        pc = (30, 160, 90)
    R.pop_layer(im, pill(label, pc), W / 2, 205, ease(u / 0.3))
    if s < 6:
        lvl = bat_prev + (bat_end - bat_prev) * k
        hrs = hrs_prev + (hrs_end - hrs_prev) * k
    else:
        lvl = 0.02 + 0.98 * ease((u - 0.3) / 2.2)
        hrs = None
    R.pop_layer(im, battery(lvl, charging=(s == 6)), W / 2, 380, 1)
    if hrs is not None:
        hours_counter(im, hrs, 600)

    if s == 1:  # 17 h ≈ tipsy
        a = ease((u - 0.8) / 0.4)
        R.card(im, (60, 820, 1020, 1120), a, YEL)
        text(d, (540, 870), "17 СААТ УКТАБАСАҢ", font(R.F_BLACK, 50), fill=WHITE + (int(255 * a),))
        for i, (ch, x) in enumerate((("😵", 290), ("🍺", 790))):
            R.pop_layer(im, emoji(ch, 130), x, 1010, ease((u - 1.2 - i * 0.4) / 0.35))
        text(d, (540, 1010), "≈", font(R.F_BLACK, 130), fill=YEL + (int(255 * ease((u - 1.5) / 0.3)),))
        a2 = ease((u - 3.4) / 0.4)
        if a2 > 0:
            R.card(im, (60, 1160, 1020, 1400), a2, RED)
            for i, (lbl, frac) in enumerate((("КӨҢҮЛ", 1 - 0.35 * ease((u - 3.8) / 1.5)), ("ЭС ТУТУМ", 1 - 0.3 * ease((u - 4.1) / 1.5)))):
                y = 1210 + i * 95
                text(d, (100, y + 25), lbl, font(R.F_XB, 38), fill=(230, 220, 250, int(255 * a2)), anchor="lm")
                d.rounded_rectangle([340, y, 340 + 620, y + 50], radius=25, fill=(60, 50, 90, int(255 * a2)))
                d.rounded_rectangle([340, y, 340 + 620 * frac, y + 50], radius=25, fill=RED + (int(255 * a2),))
        R.source(im, "Булак: Williamson ж.б., 2000 (17–19 саат ≈ 0,05% алкоголь)")
    elif s == 2:  # microsleeps
        a = ease((u - 0.6) / 0.4)
        R.card(im, (60, 820, 1020, 1160), a, CYAN)
        text(d, (540, 868), "МЭЭНИН АКТИВДҮҮЛҮГҮ", font(R.F_BLACK, 44), fill=WHITE + (int(255 * a),))
        g = ease((u - 0.9) / 3.0)
        pts = []
        r = random.Random(9)
        for i in range(int(400 * g)):
            x = 100 + i * 2.2
            flat = 330 <= i < 380 or 240 <= i < 262 and False
            amp = 6 if (130 <= i < 165 or 300 <= i < 350) else 45
            y = 1020 + (math.sin(i * 0.55) * 0.6 + r.uniform(-1, 1) * 0.6) * amp
            pts.append((x, y))
        if len(pts) > 1:
            d.line(pts, fill=CYAN + (int(255 * a),), width=4)
        for x0, x1 in ((100 + 130 * 2.2, 100 + 165 * 2.2), (100 + 300 * 2.2, 100 + 350 * 2.2)):
            if pts and pts[-1][0] > x0:
                d.rounded_rectangle([x0, 940, x1, 1100], radius=14, outline=RED + (230,), width=4)
                text(d, ((x0 + x1) / 2, 1125), "ZZZ", font(R.F_BLACK, 30), fill=RED + (255,))
        a2 = ease((u - 3.6) / 0.4)
        if a2 > 0:
            R.pop_layer(im, R.stat_card("МИКРО-УЙКУ", "БИР НЕЧЕ СЕКУНДДУК УЙКУ", RED, icon="🚗"), W / 2, 1300, a2)
    elif s == 3:  # hallucinations
        e = eye(620, 1.0, 0.75, (0.3 * math.sin(u * 2), 0.2 * math.cos(u * 1.6)))
        R.pop_layer(im, e, W / 2, 1000, ease((u - 0.3) / 0.4))
        r = random.Random(4)
        for i in range(7):
            ph = (u * 0.25 + i / 7) % 1.0
            x = r.uniform(120, 960) + 40 * math.sin(u * 1.5 + i)
            y = r.uniform(820, 1380) - ph * 120
            ch = r.choice(["👻", "🕷️", "👁️", "🌀"])
            e2 = emoji(ch, 90).copy()
            e2.putalpha(e2.getchannel("A").point(lambda v: int(v * math.sin(ph * math.pi) * 0.9 * ease((u - 1.0) / 0.6))))
            im.alpha_composite(e2, (int(x - 45), int(y - 45)))
        a2 = ease((u - 2.6) / 0.4)
        if a2 > 0:
            R.pop_layer(im, R.stat_card("ЭЛЕСТӨӨЛӨР", "ЖОК НЕРСЕЛЕР КӨРҮНӨТ", VIOLET, icon="🌀"), W / 2, 1330, a2)
        return warp(im, 0.6 + 0.4 * math.sin(u * 2), u)
    elif s == 4:  # anger, fear, immunity
        items = [("😡", "АЧУУ", RED, 0.4), ("😨", "КОРКУУ", VIOLET, 1.2), ("🦠", "ИММУНИТЕТ ↓", YEL, 2.4)]
        for i, (ch, lbl, col, st) in enumerate(items):
            p = ease((u - st) / 0.4)
            lay = Image.new("RGBA", (330, 330), (0, 0, 0, 0))
            ld = ImageDraw.Draw(lay)
            ld.rounded_rectangle([10, 10, 320, 320], radius=40, fill=(20, 14, 40, 235), outline=col + (235,), width=5)
            e = emoji(ch, 150)
            lay.alpha_composite(e, (165 - e.width // 2, 50))
            text(ld, (165, 262), lbl, font(R.F_BLACK, 34 if len(lbl) > 8 else 42), fill=col)
            R.pop_layer(im, lay, 190 + i * 350, 1010, p)
        if u > 3.2:
            sh = 6 * math.sin(u * 60) * (1 - ease((u - 3.2) / 1.2))  # angry shake
            im = im.transform(im.size, Image.AFFINE, (1, 0, sh, 0, 1, 0))
    elif s == 5:  # Randy Gardner record
        a = ease((u - 0.4) / 0.4)
        R.card(im, (60, 800, 1020, 1210), a, VIOLET)
        R.pop_layer(im, emoji("🏆", 120), 170, 900, a)
        text(d, (250, 870), "1964 • РЭНДИ ГАРДНЕР", font(R.F_BLACK, 46), fill=WHITE + (int(255 * a),), anchor="lm")
        text(d, (250, 930), "17 жаштагы окуучу, АКШ", font(R.F_XB, 34), fill=(200, 190, 240, int(255 * a)), anchor="lm")
        days = int(11 * ease((u - 1.0) / 2.0))
        for i in range(11):
            x = 120 + i * 78
            col = VIOLET if i < days else (60, 50, 90)
            d.rounded_rectangle([x, 1010, x + 62, 1090], radius=12, fill=col + (int(255 * a),))
            text(d, (x + 31, 1050), str(i + 1), font(R.F_BLACK, 32), fill=WHITE + (int(255 * a),))
        text(d, (540, 1150), "11 КҮН = 264 СААТ", font(R.F_BLACK, 52), fill=YEL + (int(255 * ease((u - 3.0) / 0.4)),))
        a2 = ease((u - 6.2) / 0.4)
        if a2 > 0:
            R.pop_layer(im, R.stat_card("GUINNESS", "РЕКОРДДУ ЭМИ КАТТАБАЙТ", RED, icon="⛔"), W / 2, 1330, a2)
        R.source(im, "Булак: NPR (2024); Wikipedia")
    elif s == 6:  # sleep 7+ hours + CTA
        R.pop_layer(im, emoji("😴", 200), W / 2, 760, ease((u - 0.3) / 0.4))
        for i in range(3):
            ph = (u * 0.5 + i / 3) % 1.0
            z = emoji("💤", 70).copy()
            z.putalpha(z.getchannel("A").point(lambda v: int(v * (1 - ph))))
            im.alpha_composite(z, (int(640 + ph * 120), int(680 - ph * 160)))
        R.pop_layer(im, R.stat_card("7+ СААТ", "КҮН САЙЫН ЖЕТИШТҮҮ УКТА", GREEN, icon="🛏️"), W / 2, 1010,
                    ease((u - 1.0) / 0.45))
        if u > 3.6:
            R.headline(im, "СЕН КАНЧА СААТ", 1220, 72, YEL, (255, 120, 0), ease((u - 3.6) / 0.35))
            R.headline(im, "УКТАБАЙ ЖҮРГӨНСҮҢ? 👇".replace(" 👇", ""), 1310, 72, YEL, (255, 120, 0), ease((u - 3.8) / 0.35))
            R.pop_layer(im, emoji("👇", 90), W / 2, 1410 + 14 * abs(math.sin(u * 5)), ease((u - 4.0) / 0.3))
        R.source(im, "Чоңдорго сунуш: күнүнө 7 сааттан кем эмес (CDC)")
    return im


BASE = None


def render_chunk(args):
    i0, i1, idx = args
    global BASE
    BASE = base_frame()
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
        a += rng.normal(0, 2.0, (H // 4, W // 4, 1)).astype(np.float32).repeat(4, 0).repeat(4, 1)
        p.stdin.write(np.clip(a, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close()
    p.wait()
    return path


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    json.dump({"starts": STARTS, "durs": DURS, "lead": LEAD}, open(os.path.join(OUT, "timeline.json"), "w"))
    if len(sys.argv) > 1 and sys.argv[1] == "still":
        BASE = base_frame()
        for tt in map(float, sys.argv[2:]):
            scene(tt).convert("RGB").save(os.path.join(OUT, f"still_{tt:05.1f}.jpg"), quality=85)
        print("starts", [round(x, 2) for x in STARTS])
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
