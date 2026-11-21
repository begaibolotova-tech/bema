#!/usr/bin/env python3
"""Kyrgyz captions + on-screen graphics (title, timer, thermometer, CTA) as ASS."""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

YEL = r"{\c&H00D4FF&}"   # warm highlight (BGR)
ICE = r"{\c&HFFE37F&}"   # icy cyan highlight
WHT = r"{\c&HFFFFFF&}"


def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


HEADER = r"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,5,90,90,0,1
Style: Title,Inter Black,128,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,2,0,1,8,0,8,60,60,250,1
Style: Glow,Inter Black,128,&H0030A0FF,&H0030A0FF,&H0030A0FF,&H00000000,0,0,0,0,100,100,2,0,1,18,0,8,60,60,250,1
Style: Big,Inter Black,190,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,2,0,1,9,0,8,60,60,260,1
Style: Label,Inter ExtraBold,54,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,6,0,1,5,0,8,60,60,200,1
Style: Mono,JetBrains Mono,170,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,4,0,1,8,0,8,60,60,270,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

POP = r"{\pos(540,1190)\fscx82\fscy82\t(0,110,\fscx106\fscy106)\t(110,190,\fscx100\fscy100)}"

# (start, end, text) — text already upper-cased with highlight tags
CAPS = [
    (0.50, 2.95, f"ЭГЕР КҮН АЗЫР {YEL}ӨЧҮП КАЛСА...{WHT}"),
    (4.00, 5.55, f"СЕН МУНУ {YEL}8 МҮНӨТТӨН{WHT}"),
    (5.55, 7.30, "КИЙИН ГАНА БИЛЕСИҢ."),
    (7.70, 8.80, f"КҮНДҮН {YEL}ЖАРЫГЫ{WHT}"),
    (8.80, 11.35, f"ЖЕРГЕ {YEL}8 МҮНӨТ 20 СЕКУНДДА{WHT} ЖЕТЕТ."),
    (11.45, 13.00, "ОШОЛ УБАКЫТКА ЧЕЙИН"),
    (13.00, 14.80, f"БААРЫ {YEL}КАДИМКИДЕЙ{WHT} КӨРҮНӨТ."),
    (15.40, 16.40, "АНДАН КИЙИН —"),
    (16.40, 17.80, f"{ICE}КАПКАРАҢГЫ.{WHT}"),
    (18.30, 19.30, f"{ICE}АЙ ДА{WHT} ЖОГОЛОТ,"),
    (19.30, 20.75, "АНТКЕНИ АЛ КҮНДҮН ЖАРЫГЫН"),
    (20.75, 22.60, f"ГАНА {ICE}ЧАГЫЛДЫРАТ.{WHT}"),
    (23.30, 25.00, f"ЖЕР {ICE}ОРБИТАСЫНАН{WHT} ЧЫГЫП,"),
    (25.00, 27.40, f"КОСМОСКО {ICE}ТҮЗ СЫЗЫК{WHT} МЕНЕН УЧУП КЕТЕТ."),
    (28.30, 30.55, f"ӨСҮМДҮКТӨР {ICE}ФОТОСИНТЕЗДИ{WHT} ТОКТОТОТ."),
    (30.60, 32.85, f"{ICE}БИР ЖУМАНЫН{WHT} ИЧИНДЕ ОРТОЧО ТЕМПЕРАТУРА"),
    (32.85, 35.20, f"{ICE}-18°C{WHT} ГА ТҮШӨТ."),
    (36.80, 39.80, f"{ICE}БИР ЖЫЛДА -70°C{WHT} ДАН ТӨМӨН."),
    (40.55, 42.00, "БИРОК ОКЕАНДЫН ТҮБҮ"),
    (42.00, 43.70, f"ЖЕРДИН {YEL}ИЧКИ ЖЫЛУУЛУГУ{WHT} МЕНЕН"),
    (43.70, 46.30, f"МИҢДЕГЕН ЖЫЛДАР БОЮ {ICE}СУЮК{WHT} БОЙДОН КАЛАТ."),
    (50.00, 51.45, "БАКТЫГА ЖАРАША, КҮН ДАГЫ"),
    (51.45, 53.05, f"{YEL}5 МИЛЛИАРД ЖЫЛ{WHT} КҮЙӨТ."),
    (53.20, 54.40, f"КИЙИНКИ {YEL}«ЭМНЕ БОЛОТ?»{WHT} ТЕМАСЫН"),
    (54.40, 56.20, f"{YEL}КОММЕНТАРИЙГЕ{WHT} ЖАЗ!"),
]

ev = []


def add(layer, st, en, style, text):
    ev.append(f"Dialogue: {layer},{ts(st)},{ts(en)},{style},,0,0,0,,{text}")


for st, en, tx in CAPS:
    add(5, st, en, "Cap", POP + tx)

# ---- Hook title (0 - 7.5)
title = r"КҮН ӨЧСӨ\NЭМНЕ БОЛОТ?"
anim = r"{\fad(0,250)\fscx130\fscy130\t(0,220,\fscx100\fscy100)}"
add(1, 0.0, 7.5, "Glow", anim + r"{\blur14\alpha&H40&}" + title)
add(2, 0.0, 7.5, "Title", anim + title)

# ---- Light travel timer 00:00 -> 08:20 (7.6 - 15.0)
t0, t1, total = 7.6, 14.6, 500
add(3, t0, 15.0, "Label", r"{\fad(150,150)\c&H9FE6FF&}КҮНДӨН ЖЕРГЕ ЧЕЙИН")
step = 1 / 15
t = t0
while t < 15.0:
    k = min((t - t0) / (t1 - t0), 1.0)
    k = k * k * (3 - 2 * k)
    secs = int(round(total * k))
    txt = f"{secs // 60:02d}:{secs % 60:02d}"
    col = r"{\c&H40C8FF&}" if secs >= total else ""
    add(3, t, min(t + step, 15.0), "Mono", col + txt)
    t += step

# ---- Thermometer: +15 -> -18 (window shot 32.2 - 36.5)
def thermo(a, b, st, ramp_end, en, label):
    add(3, st, en, "Label", r"{\fad(150,150)\c&HFFE37F&}" + label)
    t = st
    while t < en:
        k = min((t - st) / (ramp_end - st), 1.0)
        k = k * k * (3 - 2 * k)
        v = int(round(a + (b - a) * k))
        sign = "+" if v > 0 else ("−" if v < 0 else "")
        col = r"{\c&HFFE37F&}" if v < 0 else ""
        add(3, t, min(t + step, en), "Big", col + f"{sign}{abs(v)}°C")
        t += step


thermo(15, -18, 32.2, 34.6, 36.5, "1 ЖУМАДАН КИЙИН")
thermo(-18, -70, 36.6, 38.9, 40.8, "1 ЖЫЛДАН КИЙИН")

# ---- CTA (53.2 - 60)
add(2, 55.6, 60.0, "Glow",
    r"{\pos(540,560)\an5\fad(200,0)\blur14\alpha&H40&\fscx120\fscy120\t(0,200,\fscx100\fscy100)}КИЙИНКИ ТЕМА?")
add(3, 55.6, 60.0, "Title",
    r"{\pos(540,560)\an5\fad(200,0)\fscx120\fscy120\t(0,200,\fscx100\fscy100)}КИЙИНКИ ТЕМА?")
add(3, 56.3, 60.0, "Cap", r"{\pos(540,1190)\fad(200,0)\c&H00D4FF&}КОММЕНТАРИЙГЕ ЖАЗ!")

with open(os.path.join(ROOT, "build", "subs.ass"), "w", encoding="utf-8") as f:
    f.write(HEADER + "\n".join(ev) + "\n")
print(len(ev), "events")
