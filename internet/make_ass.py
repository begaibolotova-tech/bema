#!/usr/bin/env python3
"""Kyrgyz captions for the internet short, timed to the real voiceover (via render.timeline)."""
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
Y, C, G, Rr, R0 = r"{\c&H00D4FF&}", r"{\c&HFFD640&}", r"{\c&H82E63C&}", r"{\c&H4646FF&}", r"{\c&HFFFFFF&}"

# per scene: caption chunks (shown in order, timed proportionally to their length)
SCENES = [
    [None, f"СЕН {Y}ЭМНЕ КЫЛАСЫҢ?{R0}"],  # first chunk is the on-screen title
    [f"{Rr}1-КҮН.{R0}", f"WHATSAPP, TELEGRAM, INSTAGRAM —", f"БААРЫ {Rr}УНЧУКПАЙ КАЛАТ.{R0}",
     f"ДҮЙНӨДӨ {Y}ДЭЭРЛИК 6 МИЛЛИАРД{R0} АДАМ", f"БИР ЗАМАТТА {Rr}БАЙЛАНЫШСЫЗ{R0} КАЛАТ."],
    [f"{Rr}2-КҮН.{R0}", f"КАРТА МЕНЕН {Rr}ТӨЛӨЙ АЛБАЙСЫҢ,{R0}", f"ТАКСИ {Rr}ЧАКЫРА АЛБАЙСЫҢ.{R0}",
     "ДҮКӨНДӨРДӨ ЖАНА БАНКОМАТТАРДЫН АЛДЫНДА", f"{Y}УЗУН КЕЗЕК.{R0}"],
    [f"{Rr}3-КҮН.{R0} ЭСИҢДЕБИ,", f"{C}2021-ЖЫЛЫ{R0} FACEBOOK", f"БОЛГОНУ {C}6 СААТКА{R0} ӨЧКӨНДӨ,",
     f"{Y}3 МИЛЛИАРД{R0} АДАМ БАЙЛАНЫШСЫЗ КАЛГАН.", f"АЛ ЭМИ БУЛ — {Rr}БИР ЖУМА!{R0}"],
    [f"{Rr}4-КҮН.{R0} БИРОК {G}ЖАКШЫ ЖАГЫ{R0} ДА БАР:", f"ТАЕНЕҢЕ ЧАЛБАЙ ЭЛЕ, {G}ӨЗҮҢ БАРАСЫҢ.{R0}",
     f"ҮЙДӨ {G}ЧАЙ ДА, СҮЙЛӨШҮҮ ДА{R0} КӨБӨЙӨТ."],
    [f"{Rr}5-КҮН.{R0} ЖАҢЫЛЫКТЫ {Y}РАДИОДОН{R0} УГАСЫҢ,", "ЖОЛДУ КАРТАДАН ЭМЕС,", f"{Y}КОШУНАҢДАН{R0} СУРАЙСЫҢ."],
    [f"{G}7-КҮНҮ{R0} ИНТЕРНЕТ КАЙТЫП КЕЛЕТ...", f"ЖАНА САГА {G}3 000 БИЛДИРҮҮ{R0} КЕЛЕТ!",
     f"СЕН {Y}БИР ЖУМА{R0} ЧЫДАЙ АЛАСЫҢБЫ?", f"{Y}КОММЕНТАРИЙГЕ{R0} ЖАЗ!"],
]
HOOK_LEAD = "ЭГЕР ЭРТЕҢ ИНТЕРНЕТ БИР ЖУМАГА ТОЛУГУ МЕНЕН ӨЧҮП КАЛСА..."


def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                capture_output=True, text=True).stdout)


def ts(t):
    return f"0:{int(t // 60):02d}:{t % 60:05.2f}"


HEAD = r"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,72,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
POP = r"{\pos(540,1555)\fscx82\fscy82\t(0,110,\fscx106\fscy106)\t(110,190,\fscx100\fscy100)}"

if __name__ == "__main__":
    import json
    tl = json.load(open(os.path.join(ROOT, "build", "timeline.json")))
    plain = lambda x: re.sub(r"\{[^}]*\}", "", x)
    ev = []
    for si, chunks in enumerate(SCENES):
        start = tl["starts"][si] + tl["lead"]
        d = dur(os.path.join(ROOT, "vo", f"vo{si + 1}.mp3"))
        lens = [len(HOOK_LEAD) if c is None else len(plain(c)) for c in chunks]
        total = sum(lens)
        t = start
        for c, n in zip(chunks, lens):
            e = t + d * n / total
            if c is not None:
                end = e + (0.35 if c is chunks[-1] else 0)
                if si == 6 and c is chunks[-1]:
                    end = 59.9
                ev.append(f"Dialogue: 0,{ts(t)},{ts(end)},Cap,,0,0,0,,{POP}{c}")
            t = e
    with open(os.path.join(ROOT, "build", "subs.ass"), "w", encoding="utf-8") as f:
        f.write(HEAD + "\n".join(ev) + "\n")
    print(len(ev), "captions")
