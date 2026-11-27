#!/usr/bin/env python3
"""«Интернет бир жумага өчүп калса эмне болот?» — 60s 1080x1920 infographic short.

Timeline is driven by the real voiceover lengths (vo/vo1..7.mp3).
Captions are rendered separately (make_ass.py -> build/subs.ass).
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
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("ik_render", os.path.join(ROOT, "..", "issykkul", "render.py"))
R = importlib.util.module_from_spec(_spec)  # shared helpers (fonts, emoji, cards, headlines)
_spec.loader.exec_module(R)

OUT = os.path.join(ROOT, "build")
W, H, FPS, DUR = 1080, 1920, 30, 60.0
ease, back, font, emoji, text = R.ease, R.back, R.font, R.emoji, R.text
CYAN, YEL, RED, WHITE = R.CYAN, R.YEL, R.RED, R.WHITE
GREEN = (60, 230, 130)


# ------------------------------------------------------------ timeline from VO
def vo_dur(i):
    f = os.path.join(ROOT, "vo", f"vo{i}.mp3")
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)


def timeline():
    durs = [vo_dur(i) for i in range(1, 8)]
    lead = 0.35
    pad = (DUR - sum(durs) - lead * 7 - 2.2) / 6  # last scene keeps ~2.2 s extra for the CTA
    starts, t = [], 0.0
    for i, d in enumerate(durs):
        starts.append(t)
        t += d + lead + (pad if i < 6 else 0)
    return starts, durs, lead


STARTS, DURS, LEAD = timeline()
DAYS = ["", "1-КҮН", "2-КҮН", "3-КҮН", "4-КҮН", "5-КҮН", "7-КҮН"]

# ------------------------------------------------------------ world network map
LON0, LON1, LAT0, LAT1 = -128.0, 162.0, 74.0, -46.0
MX0, MY0 = 0, 790
SX = W / (LON1 - LON0)


def mproj(lon, lat):
    return (MX0 + (lon - LON0) * SX, MY0 + (LAT0 - lat) * SX)


mask = np.asarray(Image.open(os.path.join(ROOT, "geo", "land_mask.png")))  # 2 px/deg, lon -180.., lat 85..
DOTS = []
step = 11
for y in np.arange(MY0, MY0 + (LAT0 - LAT1) * SX, step):
    for x in np.arange(4, W, step):
        lon = LON0 + (x - MX0) / SX
        lat = LAT0 - (y - MY0) / SX
        mx, my = int((lon + 180) * 2), int((85 - lat) * 2)
        if 0 <= my < mask.shape[0] and 0 <= mx < mask.shape[1] and mask[my, mx] > 128:
            DOTS.append((x, y))
DOTS = np.array(DOTS)

CITIES = {
    "Бишкек": (74.6, 42.9), "Москва": (37.6, 55.8), "Лондон": (-0.1, 51.5), "Нью-Йорк": (-74, 40.7),
    "Пекин": (116.4, 39.9), "Токио": (139.7, 35.7), "Дубай": (55.3, 25.2), "Дели": (77.2, 28.6),
    "Сан-Паулу": (-46.6, -23.5), "Лагос": (3.4, 6.5), "Сидней": (151.2, -33.9), "Лос-Анжелес": (-118.2, 34.0),
    "Стамбул": (29.0, 41.0), "Сеул": (127.0, 37.5), "Каир": (31.2, 30.0), "Сингапур": (103.8, 1.35),
    "Алматы": (76.9, 43.2), "Берлин": (13.4, 52.5),
}
CP = {k: np.array(mproj(*v)) for k, v in CITIES.items()}
rng = random.Random(7)
names = list(CP)
LINKS = []
for a in names:
    for b in rng.sample(names, 3):
        if a != b and (b, a) not in LINKS:
            LINKS.append((a, b))
for b in ("Москва", "Пекин", "Стамбул", "Дубай", "Лондон", "Алматы"):
    LINKS.append(("Бишкек", b))


def arc(p, q, n=40):
    m = (p + q) / 2
    dist = np.linalg.norm(q - p)
    c = m + np.array([0, -0.28 * dist])
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * p + 2 * (1 - t) * t * c + t ** 2 * q


ARCS = [arc(CP[a], CP[b]) for a, b in LINKS]


def network(im, t, health, cut_t=None, origin="Бишкек"):
    """health 1 = all green/cyan, 0 = dead. cut_t: time since blackout started (ripple)."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for x, y in DOTS:
        d.ellipse([x - 2.6, y - 2.6, x + 2.6, y + 2.6], fill=(60, 110, 170, int(70 + 60 * health)))
    if cut_t is not None:  # red shock ripple
        r = cut_t * 900
        o = CP[origin]
        a = max(0, 1 - cut_t / 1.3)
        if a > 0:
            d.ellipse([o[0] - r, o[1] - r, o[0] + r, o[1] + r], outline=(255, 60, 60, int(220 * a)), width=8)
    for i, pts in enumerate(ARCS):
        if health > 0.02:
            col = (int(64 + (255 - 64) * (1 - health)), int(214 * health + 60 * (1 - health)), int(255 * health + 60 * (1 - health)))
            d.line([tuple(p) for p in pts], fill=col + (int(40 + 120 * health),), width=2)
            ph = (t * 0.45 + i * 0.137) % 1.0
            p = pts[int(ph * (len(pts) - 1))]
            d.ellipse([p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4], fill=(220, 250, 255, int(255 * health)))
        else:  # broken dashed red links
            for j in range(0, len(pts) - 1, 4):
                d.line([tuple(pts[j]), tuple(pts[j + 1])], fill=(255, 60, 60, 70), width=2)
    for k, p in CP.items():
        col = CYAN if health > 0.5 else RED
        rr = 6 if k != "Бишкек" else 9
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=col + (255,))
    im.alpha_composite(lay.filter(ImageFilter.GaussianBlur(5)))
    im.alpha_composite(lay)
    bp = CP["Бишкек"]
    R.label_tag(im, "БИШКЕК", (bp[0], bp[1] - 34), YEL, 1, 30)


# ------------------------------------------------------------ icons
def wifi(size, col, alpha=1.0, cross=0.0):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = size / 2, size * 0.78
    a = int(255 * alpha)
    for i, r in enumerate((0.62, 0.43, 0.24)):
        rr = size * r
        d.arc([cx - rr, cy - rr, cx + rr, cy + rr], 225, 315, fill=col + (a,), width=int(size * 0.075))
    d.ellipse([cx - size * 0.06, cy - size * 0.06, cx + size * 0.06, cy + size * 0.06], fill=col + (a,))
    if cross > 0:
        L = size * 0.42 * cross
        c = (size / 2, size * 0.52)
        for s in (1, -1):
            d.line([(c[0] - L, c[1] - L * s), (c[0] + L, c[1] + L * s)], fill=(255, 50, 50, 255), width=int(size * 0.09))
    g = Image.new("RGBA", im.size, col + (0,))
    g.putalpha(im.getchannel("A").filter(ImageFilter.GaussianBlur(size * 0.05)))
    return Image.alpha_composite(g, im)


@lru_cache(None)
def icon_card(ch, crossed=False, size=240, border=None):
    lay = Image.new("RGBA", (size + 20, size + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    bc = border or (RED if crossed else CYAN)
    d.rounded_rectangle([10, 10, 10 + size, 10 + size], radius=44, fill=(10, 22, 44, 235), outline=bc + (235,), width=5)
    e = emoji(ch, int(size * 0.58))
    lay.alpha_composite(e, (10 + (size - e.width) // 2, 10 + (size - e.height) // 2))
    if crossed:
        d.line([(30, 30), (size - 10, size - 10)], fill=(255, 50, 50, 240), width=12)
    return lay


def day_bar(im, day_idx, a):
    """7-day progress pill at the top."""
    if a <= 0:
        return
    lay = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    label = DAYS[day_idx]
    d.rounded_rectangle([W / 2 - 150, 20, W / 2 + 150, 112], radius=46, fill=(220, 20, 30, 245))
    text(d, (W / 2, 66), label, font(R.F_BLACK, 56))
    n_done = {1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 7}[day_idx]
    for i in range(7):
        x = W / 2 - 3 * 64 + i * 64
        col = (255, 70, 70, 255) if i < n_done else (90, 110, 140, 200)
        if day_idx == 6 and i == 6:
            col = GREEN + (255,)
        d.ellipse([x - 13, 150 - 13, x + 13, 150 + 13], fill=col)
    lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
    im.alpha_composite(lay, (0, 150))


def base_frame():
    g = np.linspace(0, 1, H)[:, None]
    top, bot = np.array([8, 12, 28]), np.array([2, 4, 12])
    arr = (top * (1 - g) + bot * g)[:, None, :].repeat(W, 1)
    im = Image.fromarray(arr.astype(np.uint8)).convert("RGBA")
    d = ImageDraw.Draw(im)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-200, 700, W + 200, 1400], fill=(20, 60, 120, 60))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(160)))
    return im


BASE = None


def glitch(im, amount, seed):
    if amount <= 0:
        return im
    r = random.Random(seed)
    a = np.asarray(im).copy()
    for _ in range(int(6 * amount) + 1):
        y = r.randrange(0, H - 40)
        h = r.randrange(8, 60)
        s = int(r.uniform(-60, 60) * amount)
        a[y:y + h] = np.roll(a[y:y + h], s, axis=1)
    out = Image.fromarray(a)
    rch, gch, bch, al = out.split()
    rch = rch.transform(out.size, Image.AFFINE, (1, 0, -8 * amount, 0, 1, 0))
    return Image.merge("RGBA", (rch, gch, bch, al))


# ------------------------------------------------------------ scenes
def scene(t):
    im = BASE.copy()
    s = max(i for i in range(7) if STARTS[i] <= t)
    u = t - STARTS[s]
    d = ImageDraw.Draw(im)

    if s == 0:  # HOOK
        cut = 2.6
        health = 1.0 if t < cut else max(0.0, 1 - (t - cut) / 0.5)
        network(im, t, health, (t - cut) if t >= cut else None)
        R.headline(im, "ИНТЕРНЕТ", 340, 150, CYAN, (0, 140, 255), ease(t / 0.35))
        R.headline(im, "7 КҮНГӨ ӨЧСӨ", 495, 112, WHITE, None, ease((t - 0.2) / 0.35))
        R.headline(im, "ЭМНЕ БОЛОТ?", 625, 112, YEL, (255, 120, 0), ease((t - 0.4) / 0.35))
        col = CYAN if t < cut else RED
        wf = wifi(300, col, 1.0, ease((t - cut) / 0.35))
        R.pop_layer(im, wf, W / 2, 1360, ease(t / 0.5))
        g = 0.0
        if 2.0 < t < cut + 0.6:
            g = 0.6 + 0.4 * math.sin(t * 40)
        return glitch(im, g, int(t * 30))

    day_bar(im, s, ease(u / 0.3))
    health = 1.0 if s == 6 and u > 0.6 else 0.0
    network(im, t, health if s == 6 else 0.0)

    if s == 1:  # messengers dead, ~6 bn offline
        for i, ch in enumerate(("💬", "✈️", "📷")):
            p = ease((u - 0.3 - i * 0.35) / 0.4)
            R.pop_layer(im, icon_card(ch, True), 210 + i * 330, 520, p)
        cnt = 5.8 * ease((u - 1.8) / 1.8)
        R.pop_layer(im, R.stat_card(f"≈{cnt:.1f} МЛРД".replace(".", ","), "АДАМ ОФЛАЙН КАЛАТ", RED, icon="🌍"),
                    W / 2, 1330, ease((u - 1.6) / 0.45))
        R.source(im, "Булак: ITU, 2024 (5,8 млрд интернет колдонуучу)")
    elif s == 2:  # money / taxi / queues
        for i, ch in enumerate(("💳", "🚕", "🏧")):
            p = ease((u - 0.2 - i * 0.35) / 0.4)
            R.pop_layer(im, icon_card(ch, True), 210 + i * 330, 520, p)
        # growing queue
        n = int(1 + 11 * ease((u - 2.2) / 3.0))
        if u > 2.0:
            card_a = ease((u - 2.0) / 0.4)
            R.card(im, (60, 1230, 1020, 1430), card_a, YEL)
            text(d, (540, 1270), "КЕЗЕК", font(R.F_BLACK, 40), fill=YEL + (int(255 * card_a),))
            for k in range(n):
                e = emoji("🧍", 70)
                im.alpha_composite(e, (int(940 - k * 75 - e.width / 2), 1310))
            im.alpha_composite(emoji("🏧", 80), (950, 1300))
    elif s == 3:  # Facebook 2021: 6 hours vs 168 hours
        a = ease(u / 0.4)
        R.card(im, (60, 330, 1020, 700), a, CYAN)
        text(d, (540, 385), "2021: FACEBOOK ӨЧКӨН", font(R.F_BLACK, 50), fill=WHITE + (int(255 * a),))
        text(d, (540, 445), "≈3 МЛРД АДАМ БАЙЛАНЫШСЫЗ", font(R.F_XB, 36), fill=(190, 215, 240, int(255 * a)))
        g1 = ease((u - 0.8) / 0.8)
        g2 = ease((u - 2.2) / 2.6)
        y1, y2 = 520, 610
        text(d, (100, y1 + 25), "6 саат", font(R.F_XB, 36), fill=(210, 230, 250, int(255 * a)), anchor="lm")
        d.rounded_rectangle([270, y1, 270 + 700 * (6 / 168) * g1 + 8, y1 + 50], radius=25, fill=CYAN + (int(255 * a),))
        text(d, (100, y2 + 25), "7 күн", font(R.F_XB, 36), fill=(210, 230, 250, int(255 * a)), anchor="lm")
        d.rounded_rectangle([270, y2, 270 + 700 * g2 + 8, y2 + 50], radius=25, fill=RED + (int(255 * a),))
        if u > 4.6:
            R.pop_layer(im, R.stat_card("28 ЭСЕ УЗУН", "168 СААТ ИНТЕРНЕТСИЗ", RED, icon="⏳"), W / 2, 1330,
                        ease((u - 4.6) / 0.45))
        R.source(im, "Булак: Al Jazeera, Fortune (4-октябрь 2021)")
    elif s == 4:  # funny good side
        R.headline(im, "ЖАКШЫ ЖАГЫ ДА БАР 😄".replace(" 😄", ""), 380, 70, GREEN, None, ease(u / 0.4))
        items = [("👵", 0.5), ("🫖", 1.6), ("🍞", 2.3), ("🗣️", 3.2)]
        for i, (ch, st) in enumerate(items):
            p = ease((u - st) / 0.4)
            R.pop_layer(im, icon_card(ch, False, 215, GREEN), 150 + i * 260, 590, p)
        if u > 3.6:
            R.pop_layer(im, R.stat_card("ЧАЙ ×3", "ҮЙДӨ СҮЙЛӨШҮҮ КӨБӨЙӨТ", GREEN, icon="☕"), W / 2, 1330,
                        ease((u - 3.6) / 0.45))
        # floating hearts
        for k in range(8):
            ph = (u * 0.35 + k * 0.13) % 1.0
            x = 120 + k * 120 + 20 * math.sin(u * 2 + k)
            y = 1180 - ph * 380
            e = emoji("❤️", 44)
            e2 = e.copy()
            e2.putalpha(e.getchannel("A").point(lambda v: int(v * (1 - ph) * ease(u / 1.0))))
            im.alpha_composite(e2, (int(x), int(y)))
    elif s == 5:  # radio / paper map / ask neighbour
        for i, (ch, st) in enumerate((("📻", 0.3), ("🗺️", 1.6), ("📰", 2.2))):
            p = ease((u - st) / 0.4)
            R.pop_layer(im, icon_card(ch, False, 250, YEL), 210 + i * 330, 520, p)
        if u > 2.6:
            R.pop_layer(im, R.stat_card("КОШУНАҢДАН СУРА", "ЖОЛ, ЖАҢЫЛЫК, КАБАР", YEL, icon="🏘️"), W / 2, 1330,
                        ease((u - 2.6) / 0.45))
    elif s == 6:  # internet is back + 3000 notifications + CTA
        col = GREEN if u > 0.6 else RED
        R.pop_layer(im, wifi(260, col, 1.0, 0.0), W / 2, 470, ease(u / 0.4))
        if u > 1.4:
            cnt = int(3000 * ease((u - 1.4) / 2.0))
            R.pop_layer(im, R.stat_card(f"{cnt:,}".replace(",", " ") + "+", "ЖАҢЫ БИЛДИРҮҮ", GREEN, icon="📩"),
                        W / 2, 1330, ease((u - 1.4) / 0.4))
            # notification bubbles flying in
            r = random.Random(3)
            for k in range(14):
                st = 1.4 + k * 0.15
                if u < st:
                    continue
                q = ease((u - st) / 0.5)
                x0, y0 = r.uniform(80, 1000), r.uniform(700, 1150)
                bub = emoji(r.choice(["💬", "📩", "🔔", "❤️"]), 64)
                im.alpha_composite(bub, (int(x0 - 32), int(y0 + (1 - q) * 120 - 32)))
        if u > 4.4:
            R.headline(im, "СЕН ЧЫДАЙ АЛАСЫҢБЫ?", 680, 74, YEL, (255, 120, 0), ease((u - 4.4) / 0.35))
    return im


def render_chunk(args):
    i0, i1, idx = args
    global BASE
    BASE = base_frame()
    path = os.path.join(OUT, f"chunk_{idx:02d}.mp4")
    rng_ = np.random.default_rng(idx)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
                          "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    vig = np.clip(1 - 0.35 * np.clip(np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) - 0.6, 0, None), 0.5, 1)[..., None]
    for i in range(i0, i1):
        fr = scene(i / FPS).convert("RGB")
        a = np.asarray(fr, np.float32) * vig
        a += rng_.normal(0, 2.0, (H // 4, W // 4, 1)).astype(np.float32).repeat(4, 0).repeat(4, 1)
        p.stdin.write(np.clip(a, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close()
    p.wait()
    return path


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
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
    json.dump({"starts": STARTS, "durs": DURS, "lead": LEAD}, open(os.path.join(OUT, "timeline.json"), "w"))
