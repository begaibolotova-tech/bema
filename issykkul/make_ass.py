#!/usr/bin/env python3
"""Kyrgyz captions for the Issyk-Kul short (timed to the planned voiceover)."""
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
Y, C, R = r"{\c&H00D4FF&}", r"{\c&HFFD640&}", r"{\c&HFFFFFF&}"  # yellow, cyan, reset (BGR)

# scene voiceover lines (text sent to ElevenLabs) and their start times
VO = [
    (0.4, "Ысык-Көл толугу менен соолуп калса эмне болот? Жооп сени таң калтырат."),
    (6.3, "Аянты алты миң эки жүз отуз алты чарчы километр, тереңдиги алты жүз алтымыш сегиз метр. Анда миң жети жүз отуз сегиз куб километр суу бар."),
    (15.3, "Көлгө жүз он сегиз дарыя-суу агат, бирок бирөө да агып чыкпайт. Суу бууланып гана кетет."),
    (23.3, "Жүз жетимиш жылда көлдүн деңгээли дээрлик он төрт метрге түштү. Тоолордогу мөңгүлөрдүн отуз пайыздан ашыгы эрип кетти."),
    (33.3, "Көл соолуса, түбүндө он миллиард тоннага жакын туз калат. Шамал аны Арал деңизиндегидей туздуу бороонго айлантат."),
    (43.3, "Ысык-Көл — табигый жылыткыч. Ансыз кыш суугураак, жай ысыгыраак болот. Балыктар жана кыштаган куштар жоголот."),
    (52.3, "Бирок азырынча кеч эмес: сууну үнөмдөсөк, көлдү сактап калабыз. Кийинки теманы комментарийге жаз!"),
]

CAPS = [
    (3.4, 5.8, f"ЖООП СЕНИ {Y}ТАҢ КАЛТЫРАТ.{R}"),
    (6.3, 8.2, f"АЯНТЫ — {C}6 236 КМ²,{R}"),
    (8.2, 10.3, f"ТЕРЕҢДИГИ — {C}668 МЕТР.{R}"),
    (10.4, 12.7, f"АНДА {C}1 738 КМ³{R} СУУ БАР."),
    (15.3, 17.4, f"КӨЛГӨ {C}118 ДАРЫЯ-СУУ{R} АГАТ,"),
    (17.4, 19.5, f"БИРОК {Y}БИРӨӨ ДА{R} АГЫП ЧЫКПАЙТ."),
    (19.6, 22.8, f"СУУ {C}БУУЛАНЫП{R} ГАНА КЕТЕТ."),
    (23.3, 25.2, "170 ЖЫЛДА КӨЛДҮН ДЕҢГЭЭЛИ"),
    (25.2, 27.5, f"ДЭЭРЛИК {Y}14 МЕТРГЕ{R} ТҮШТҮ."),
    (27.7, 29.4, f"ТООЛОРДОГУ {C}МӨҢГҮЛӨРДҮН{R}"),
    (29.4, 32.8, f"{Y}30%ДАН АШЫГЫ{R} ЭРИП КЕТТИ."),
    (33.3, 35.0, "КӨЛ СООЛУСА, ТҮБҮНДӨ"),
    (35.0, 37.7, f"{Y}≈10 МИЛЛИАРД ТОННА{R} ТУЗ КАЛАТ."),
    (37.8, 40.2, f"ШАМАЛ АНЫ {Y}ТУЗДУУ БОРООНГО{R} АЙЛАНТАТ —"),
    (40.2, 42.8, f"{Y}АРАЛ ДЕҢИЗИНДЕГИДЕЙ.{R}"),
    (43.3, 45.6, f"ЫСЫК-КӨЛ — {Y}ТАБИГЫЙ ЖЫЛЫТКЫЧ.{R}"),
    (45.6, 48.4, f"АНСЫЗ КЫШ {C}СУУГУРААК,{R} ЖАЙ {Y}ЫСЫГЫРААК.{R}"),
    (48.4, 51.8, f"{C}БАЛЫКТАР{R} ЖАНА КЫШТАГАН {C}КУШТАР{R} ЖОГОЛОТ."),
    (52.3, 54.0, f"БИРОК АЗЫРЫНЧА {Y}КЕЧ ЭМЕС:{R}"),
    (54.0, 56.6, f"{C}СУУНУ ҮНӨМДӨСӨК,{R} КӨЛДҮ САКТАП КАЛАБЫЗ."),
    (56.6, 59.8, f"КИЙИНКИ ТЕМАНЫ {Y}КОММЕНТАРИЙГЕ{R} ЖАЗ!"),
]


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
Style: Cap,Inter Black,74,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,7,4,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
POP = r"{\pos(540,1505)\fscx82\fscy82\t(0,110,\fscx106\fscy106)\t(110,190,\fscx100\fscy100)}"

def retime(caps):
    """Snap captions to the real voiceover: chunks inside each scene get times proportional to their length."""
    import re, subprocess
    starts = [v[0] for v in VO] + [60.0]
    out = []
    for si in range(len(VO)):
        f = os.path.join(ROOT, "vo", f"vo{si + 1}.mp3")
        if not os.path.exists(f):
            return caps
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                   capture_output=True, text=True).stdout)
        chunks = [c for c in caps if starts[si] - 0.5 <= c[0] < starts[si + 1] - 0.5]
        plain = lambda x: re.sub(r"\{[^}]*\}", "", x)
        lens = [len(plain(c[2])) for c in chunks]
        lead = 0
        if si == 0:  # hook question is shown as the big title, captions start with its 2nd sentence
            lead = len("ЫСЫК-КӨЛ ТОЛУГУ МЕНЕН СООЛУП КАЛСА ЭМНЕ БОЛОТ? ")
        total = lead + sum(lens)
        t = starts[si] + dur * lead / total
        for c, n in zip(chunks, lens):
            e = t + dur * n / total
            out.append((round(t, 2), round(e + 0.25 if c is chunks[-1] else e, 2), c[2]))
            t = e
    return out


if __name__ == "__main__":
    CAPS = retime(CAPS)
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    with open(os.path.join(ROOT, "build", "subs.ass"), "w", encoding="utf-8") as f:
        f.write(HEAD + "\n".join(f"Dialogue: 0,{ts(a)},{ts(b)},Cap,,0,0,0,,{POP}{x}" for a, b, x in CAPS) + "\n")
    with open(os.path.join(ROOT, "vo_script.json"), "w", encoding="utf-8") as f:
        json.dump([{"start": s, "text": t} for s, t in VO], f, ensure_ascii=False, indent=1)
    print(len(CAPS), "captions;", sum(len(t) for _, t in VO), "VO characters")
