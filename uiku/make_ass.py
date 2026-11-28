#!/usr/bin/env python3
"""Kyrgyz captions for the sleep short, timed to the real voiceover (via render.timeline)."""
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
Y, C, G, Rr, R0 = r"{\c&H00D4FF&}", r"{\c&HFFD640&}", r"{\c&H82E63C&}", r"{\c&H4646FF&}", r"{\c&HFFFFFF&}"

# per scene: caption chunks (shown in order, timed proportionally to their length)
SCENES = [
    [None, f"БУЛ ВИДЕОДОН КИЙИН {Y}УЙКУНУ СҮЙҮП{R0} КАЛАСЫҢ."],
    [f"{Rr}1-КҮН.{R0}", f"{Y}17 СААТ{R0} УКТАБАГАН АДАМДЫН МЭЭСИ", f"{Y}ЖЕҢИЛ МАС{R0} АДАМДЫКЫНДАЙ ИШТЕЙТ.",
     f"КӨҢҮЛ БУРУУ ЖАНА ЭС ТУТУМ {Rr}НАЧАРЛАЙТ.{R0}"],
    [f"{Rr}2-КҮН.{R0} МЭЭ ӨЗҮ ЗОРДОП УКТАЙ БАШТАЙТ:", f"БИР НЕЧЕ СЕКУНДДУК {C}МИКРО-УЙКУЛАР.{R0}",
     f"РУЛДА ОТУРСАҢ, БУЛ {Rr}ӨТӨ КОРКУНУЧТУУ.{R0}"],
    [f"{Rr}3-КҮН.{R0} КӨЗ АЛДЫҢА", f"{C}ЖОК НЕРСЕЛЕР{R0} ЭЛЕСТЕЙ БАШТАЙТ,", f"ДУБАЛДАР {C}КЫЙМЫЛДАП{R0} ЖАТКАНДАЙ СЕЗИЛЕТ."],
    [f"{Rr}5-КҮН.{R0} {Rr}АЧУУЛАНУУ{R0} ЖАНА {C}КОРКУУ{R0} КҮЧӨЙТ.", f"{Y}ИММУНИТЕТ АЛСЫРАП,{R0}", "ООРУУГА ТЕЗ ЧАЛДЫГАСЫҢ."],
    [f"{C}1964-ЖЫЛЫ{R0} РЭНДИ ГАРДНЕР", f"{Y}11 КҮН{R0} УКТАБАГАН.", f"АНЫН ЭС ТУТУМУ НАЧАРЛАП,", f"МҮНӨЗҮ {Rr}БУЗУЛГАН.{R0}",
     f"АЗЫР {Y}ГИННЕС{R0} МЫНДАЙ РЕКОРДДУ КАТТАБАЙТ —", f"{Rr}ӨТӨ КОРКУНУЧТУУ.{R0}"],
    [f"ОШОНДУКТАН КҮНҮНӨ {G}ЖОК ДЕГЕНДЕ 7 СААТ{R0} УКТА.", f"СЕН ЭҢ КӨП {Y}КАНЧА СААТ{R0} УКТАБАЙ ЖҮРГӨНСҮҢ?",
     f"{Y}КОММЕНТАРИЙГЕ{R0} ЖАЗ!"],
]
HOOK_LEAD = "ЭГЕР БИР ЖУМА ТАКЫР УКТАБАСАҢ, ДЕНЕҢДЕ ЭМНЕ БОЛОТ?"


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
Style: Cap,Inter Black,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,5,80,80,0,1

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
