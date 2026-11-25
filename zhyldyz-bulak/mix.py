# «Жылдыз булак» — original score (synthesised: nylon guitar, recorder, music box, glockenspiel, clarinet, bassoon)
# + material foley (crayon on paper, page turns, wet brush) + ambience (birds, crickets, water, wind, clock) → out/mix.wav
# Usage: $LIB/.venv/bin/python mix.py
import sys, os, json, numpy as np, soundfile as sf
from scipy.ndimage import uniform_filter1d
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.join(HERE, '..', 'lemo-opuscar')
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, bp, lp, hp, add, brown, compress, limit

E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; EV = E['ev']; N = int(DUR * SR) + SR
rng = np.random.default_rng(7)
def nz(d): return rng.standard_normal(int(round(d * SR)))
def T(d): return np.arange(int(round(d * SR))) / SR
def fade(x, a=.01, b=.03):
    n = len(x); ia, ib = min(n, int(a * SR)), min(n, int(b * SR))
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def envelope(d, pts):
    k = np.array(pts, float); return np.interp(T(d), k[:, 0] * d, k[:, 1])
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

BPM = 84; BEAT = 60 / BPM; BAR = 3 * BEAT
music = np.zeros((N, 2)); fx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(buf, x, at, g=1.0, pan=0.0): add(buf, np.asarray(x, np.float64), max(0.0, at), g, pan)

# ———————————————————— instruments ————————————————————
def guitar(m, d=1.6, v=1.0):        # nylon pluck: decaying harmonics, brighter at the attack
    t = T(d); f = hz(m); x = np.zeros_like(t)
    for k in range(1, 9):
        if f * k > 9000: break
        x += np.sin(2 * np.pi * f * k * t + k) * (0.9 / k ** 1.25) * np.exp(-t * (1.6 + 1.1 * k))
    return fade(x * 0.22 * v, .002, .08)
def recorder(m, d, v=1.0):          # soft breathy flute voice with delayed vibrato
    t = T(d); f = hz(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.3, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    br = bp(nz(d), 1200, 5000) * 0.05 * np.exp(-t / 0.08)
    e = envelope(d, [(0, 0), (min(.06 / d, .3), 1), (.75, .85), (1, 0)])
    return fade((x * e + br) * 0.16 * v, .01, .06)
def musicbox(m, d=2.2, v=1.0):      # tines: fundamental + inharmonic partials, fast bright decay
    t = T(d); f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9) + 0.35 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t / 0.25) + 0.15 * np.sin(2 * np.pi * f * 5.43 * t) * np.exp(-t / 0.09)
    return fade(x * 0.13 * v, .001, .1)
def glock(m, d=2.0, v=1.0):
    t = T(d); f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.7) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.2) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.07)
    return fade(x * 0.12 * v, .001, .1)
def clarinet(m, d, v=1.0):          # odd harmonics, slow swell
    t = T(d); f = hz(m) * (1 + 0.003 * np.sin(2 * np.pi * 4.6 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.45 * np.sin(3 * ph) + 0.18 * np.sin(5 * ph) + 0.08 * np.sin(7 * ph)
    return fade(lp(x, 2400) * envelope(d, [(0, 0), (.25, 1), (.75, .9), (1, 0)]) * 0.1 * v, .05, .2)
def bassoon(m, d=0.35, v=1.0):      # comic blip
    t = T(d); f = hz(m) * (1 - 0.05 * t / d); ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    return fade(lp(saw, 900) * envelope(d, [(0, 0), (.1, 1), (.6, .7), (1, 0)]) * 0.2 * v, .005, .05)
def shaker(v=1.0):
    t = T(0.09); return fade(bp(nz(0.09), 4000, 11000) * np.exp(-t / 0.025) * 0.06 * v, .002, .02)

# ———————————————————— the theme (D major, 3/4) ————————————————————
D4 = 62
# melody: (bar, beat, midi, beats)
THEME = [(0, 0, 78, 2), (0, 2, 76, 1), (1, 0, 74, 2), (1, 2, 69, 1), (2, 0, 71, 1), (2, 1, 74, 1), (2, 2, 78, 1), (3, 0, 76, 3),
         (4, 0, 78, 2), (4, 2, 79, 1), (5, 0, 81, 2), (5, 2, 78, 1), (6, 0, 76, 1), (6, 1, 74, 1), (6, 2, 76, 1), (7, 0, 74, 3)]
CHORDS = [(50, [62, 66, 69]), (47, [62, 66, 71]), (43, [62, 67, 71]), (45, [61, 64, 69]), (50, [62, 66, 69]), (43, [62, 67, 71]), (45, [61, 64, 67]), (50, [62, 66, 69])]

def bars_in(a, b):
    k = int(np.ceil(a / BAR - 1e-6)); out = []
    while (k + 1) * BAR <= b + 1e-6: out.append(k); k += 1
    return out
def melody(inst, a, b, v=1.0, oct=0, half=False, pan=0.0, d_mul=1.0, buf=None):
    for i, k in enumerate(bars_in(a, b)):
        bi = i % 8
        if half and i >= 4: break
        for (bar, beat, m, dur) in THEME:
            if bar != bi: continue
            t0 = k * BAR + beat * BEAT
            x = inst(m + oct, dur * BEAT * d_mul + 0.3, v) if inst in (recorder, clarinet) else inst(m + oct, 2.2, v)
            put(music if buf is None else buf, x, t0, 1.0, pan)
def accomp(a, b, v=1.0, sparse=False, pulse=False):
    for i, k in enumerate(bars_in(a, b)):
        root, ch = CHORDS[i % 8]; t0 = k * BAR
        put(music, guitar(root, 2.0, v * 1.1), t0, 1.0, -0.25)
        if pulse: put(music, guitar(root, 1.0, v * 0.6), t0 + BEAT, 1.0, -0.25); put(music, guitar(root, 1.0, v * 0.6), t0 + 2 * BEAT, 1.0, -0.25); continue
        if sparse: put(music, guitar(ch[1], 1.6, v * 0.6), t0 + BEAT, 1.0, 0.2); continue
        for j in (1, 2): put(music, guitar(ch[0], 1.4, v * 0.55), t0 + j * BEAT, 1.0, 0.25); put(music, guitar(ch[2], 1.4, v * 0.5), t0 + j * BEAT + 0.012, 1.0, 0.3)
def longnotes(inst, a, b, v=1.0):
    for i, k in enumerate(bars_in(a, b)):
        root, ch = CHORDS[i % 8]
        if i % 2 == 0: put(music, inst(root + 12, BAR * 2 + 0.4, v), k * BAR, 1.0, -0.1)

cues = [(e['t'], e['id']) for e in EV if e['type'] == 'cue']
cues.sort(); cues.append((DUR, 'END'))
span = {cid: (t, cues[i + 1][0]) for i, (t, cid) in enumerate(cues[:-1])}
def S(cid): return span.get(cid, (0, 0))

a, b = S('title'); melody(lambda m, d, v: lp(musicbox(m, d, v), 2500), a + 0.6, b + 0.2, 0.9, oct=0, half=True)
a, b = S('village'); accomp(a, b, 0.9); melody(recorder, a + BAR, b, 0.9)
a, b = S('dusk'); accomp(a, b, 0.7, sparse=True); melody(musicbox, a + 2 * BAR, b, 0.6, half=True)
a, b = S('decide'); accomp(a, b, 0.75, sparse=True); longnotes(clarinet, a, b, 0.8)
a, b = S('granny'); accomp(a, b, 0.8); melody(musicbox, a + BAR, b, 0.7)
a, b = S('forest'); accomp(a, b, 1.0); melody(recorder, a + BAR, b, 1.0)
for k in bars_in(a, b):
    for j in range(3): put(music, shaker(0.9 if j == 0 else 0.6), k * BAR + j * BEAT, 1.0, 0.4)
a, b = S('river'); accomp(a, b, 0.8, pulse=True)
a, b = S('path'); accomp(a, b, 0.55, sparse=True); longnotes(clarinet, a, b, 0.9)
# fog: music falls away (wind only); the song: the recorder alone sings the theme once, guitar joins at the relight
a, b = S('fog'); longnotes(clarinet, a, min(b, a + 4 * BAR), 0.6)
a, b = S('song'); melody(recorder, a, b, 1.05); relight = [e['t'] for e in EV if e['type'] == 'relight'][0]; accomp(relight + BAR, b, 0.8)
# the spring: the one full statement (music box + recorder + guitar + glock)
a, b = S('spring'); accomp(a + BAR, b, 0.9); melody(recorder, a + BAR, b, 1.0); melody(musicbox, a + BAR, b, 0.55, oct=12)
a, b = S('farewell'); accomp(a, b, 0.6, sparse=True); melody(musicbox, a + BAR, b, 0.75, d_mul=1.0)
a, b = S('home'); accomp(a, b, 0.9); melody(recorder, a + BAR, b, 0.9)
a, b = S('end'); accomp(a, b - 6, 0.7, sparse=True); melody(musicbox, a + BAR, b - 2, 0.75)
# the music box winds down: a slight pitch droop and slowing on the last phrase is suggested by the final low D
put(music, musicbox(62, 4.0, 0.9), DUR - 4.6, 1.0, 0.0); put(music, guitar(38, 4.0, 0.8), DUR - 4.6, 1.0, -0.2)

# silences: the music is cut to nothing around these beats
for e in EV:
    if e['type'] == 'silence':
        s0, s1 = int(e['t'] * SR), int((e['t'] + e['dur']) * SR)
        r = int(0.4 * SR); g = np.ones(N); g[max(0, s0 - r):s0] = np.linspace(1, 0, s0 - max(0, s0 - r)); g[s0:s1] = 0; g[s1:s1 + r] = np.linspace(0, 1, len(g[s1:s1 + r]))
        music *= g[:, None]

# ———————————————————— foley ————————————————————
def crayon(d, speed=1.0, v=1.0):
    n = nz(d); rate = int(SR / (70 + 90 * speed))
    grain = uniform_filter1d((rng.random(len(n) // rate + 2) ** 3).repeat(rate)[:len(n)], rate // 3 + 1)
    x = bp(n, 1400 + 600 * speed, 6500, 2) * (0.35 + grain * 1.6) + bp(n, 300, 900, 1) * 0.15
    return fade(x * envelope(d, [(0, 0), (.08, 1), (.85, .9), (1, 0)]) * v * 0.22, .01, .04)
def scribble(d, rate=6.5, v=1.0):
    out = np.zeros(int(d * SR) + 1); t = 0.0
    while t < d - 0.08:
        L = 1 / rate * (0.8 + 0.4 * rng.random()); s = crayon(min(L, d - t), 1.3, v * (0.7 + 0.3 * rng.random()))
        i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L
    return out
def write(d, v=1.0):
    out = np.zeros(int(d * SR) + 1); t = 0.0
    while t < d - 0.1:
        L = 0.07 + 0.1 * rng.random(); s = crayon(L, 0.8, v); i = int(t * SR); out[i:i + len(s)] += s[:len(out) - i]; t += L + 0.03 * rng.random()
    return out
def page_turn(d=1.4, v=1.0):
    out = np.zeros(int((d + 0.4) * SR))
    lift = hp(nz(0.35), 700) * envelope(0.35, [(0, 0), (.5, .6), (1, .2)]) * 0.18
    wh = bp(nz(0.6), 300, 4000) * np.sin(np.linspace(0, np.pi, int(0.6 * SR))) ** 1.5 * 0.35
    ft = T(0.25); flap = lp(nz(0.25), 1500) * np.exp(-ft / 0.03) * 0.6 + np.sin(2 * np.pi * 90 * ft) * np.exp(-ft / 0.05) * 0.3
    for x, at in [(lift, 0.0), (wh, 0.3), (flap, d - 0.15)]:
        i = int(at * SR); out[i:i + len(x)] += x[:len(out) - i]
    return out * v
def brush(d, v=1.0):
    n = nz(d); wet = lp(n, 1800) * 0.5 + bp(n, 1800, 5000) * 0.18
    grain = uniform_filter1d(np.abs(rng.standard_normal(len(n))), 400) * 0.6 + 0.7
    return fade(wet * grain * envelope(d, [(0, 0), (.06, .9), (.3, 1), (.8, .85), (1, 0)]) * 0.22 * v, .03, .1)
def felt(v=1.0):
    t = T(0.22); return fade((np.sin(2 * np.pi * 105 * t) * np.exp(-t / 0.05) * 0.7 + lp(nz(0.22), 600) * np.exp(-t / 0.03) * 0.5) * v * 0.45)
def stone_tap(v=1.0):
    t = T(0.1); return fade((bp(nz(0.1), 700, 2500) * np.exp(-t / 0.015) + np.sin(2 * np.pi * 320 * t) * np.exp(-t / 0.03) * 0.4) * 0.35 * v, .001, .02)
def plip(v=1.0):
    t = T(0.25); x = np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.05)
    return fade(x * 0.2 * v)
def chirp(v=1.0):
    d = 0.12 + 0.08 * rng.random(); t = T(d); f0 = 3000 + 1500 * rng.random()
    f = f0 + 1200 * np.sin(2 * np.pi * (8 + 6 * rng.random()) * t); x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return fade(x * np.sin(np.pi * t / d) ** 2 * 0.05 * v)
def cricket(d=1.2, v=1.0):
    out = np.zeros(int(d * SR) + 1); t = 0
    while t < d - 0.1:
        for k in range(3):
            tc = T(0.018); c = np.sin(2 * np.pi * 4700 * tc) * np.sin(np.pi * tc / 0.018); i = int((t + k * 0.026) * SR); out[i:i + len(c)] += c[:len(out) - i]
        t += 0.32 + 0.1 * rng.random()
    return out * 0.05 * v
def tick(v=1.0, hi=True):
    t = T(0.04); return fade(bp(nz(0.04), 2500 if hi else 1800, 7000) * np.exp(-t / 0.006) * 0.12 * v, .0005, .01)
def bed(d, lo, hi, v, mod=0.0, fi=1.0, fo=1.0):
    x = bp(nz(d), lo, hi) * v
    if mod: x *= 0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(0.08 + 0.12 * uniform_filter1d(rng.random(len(x)), 48000)) / SR)
    return fade(x, fi, fo)

for e in EV:
    t, ty, pan = e['t'], e['type'], e.get('pan', 0.0)
    if ty == 'scratch': put(fx, crayon(e['dur'], 1.1), t, 1.0, pan)
    elif ty == 'scribble': put(fx, scribble(e['dur']), t, 0.75, pan)
    elif ty == 'write': put(fx, write(e['dur'], 0.8), t, 0.75, 0.0)
    elif ty == 'paper': put(fx, hp(nz(0.8), 900) * envelope(0.8, [(0, 0), (.2, 1), (1, 0)]) * 0.05, t)
    elif ty == 'page': put(fx, page_turn(e['dur']), t, 0.45, -0.1)
    elif ty == 'climb': put(fx, bp(nz(e['dur']), 200, 1800) * np.sin(np.linspace(0, np.pi, int(round(e['dur'] * SR)))) ** 2 * 0.05, t, 1.0)
    elif ty == 'glint': put(music, glock(86 + int(rng.integers(0, 3)) * 2, 2.0, 0.8), t, 1.0, pan)
    elif ty == 'hop': put(fx, felt(0.7), t + BAR * 0.5, 1.0, 0.2); put(music, glock(81, 1.5, 0.5), t + BAR * 0.5, 1.0, 0.3)
    elif ty == 'tumble': put(fx, felt(1.2), t, 1.0, 0.1); put(music, bassoon(43, 0.3), t, 1.0, -0.1); put(music, bassoon(40, 0.4), t + 0.3, 1.0, -0.1)
    elif ty == 'plink': put(music, glock(74 + [0, 2, 4, 7, 9][e['i']], 2.0, 1.0), t, 1.0, pan); put(fx, plip(0.8), t + 0.05, 1.0, pan)
    elif ty == 'step': put(fx, stone_tap(0.9), t, 1.0, pan)
    elif ty == 'relight':
        for k, m in enumerate([74, 78, 81, 86, 90]): put(music, glock(m, 2.4, 0.9), t + k * 0.12, 1.0, -0.4 + k * 0.2)
    elif ty == 'brush':
        d = e['dur'] + 0.25; x = brush(d); L = len(x); s = int(t * SR); dr = e.get('dir', 1)
        pn = np.linspace(-0.8 * dr, 0.8 * dr, L); l, r = np.cos((pn + 1) * np.pi / 4) * 1.414, np.sin((pn + 1) * np.pi / 4) * 1.414
        e2 = min(N, s + L); fx[s:e2, 0] += (x * l)[:e2 - s]; fx[s:e2, 1] += (x * r)[:e2 - s]
    elif ty == 'pour': put(fx, bed(e['dur'], 1500, 6000, 0.03, fi=0.3, fo=0.5) * (0.6 + 0.4 * np.abs(np.sin(np.linspace(0, 40, int(round(e['dur'] * SR)))))), t, 1.0, -0.2)
    elif ty == 'pull': put(fx, page_turn(1.0, 0.6), t, 0.5, 0.0); put(amb, lp(brown(e['dur'] + 4), 400) * 0.02, t, 1.0)
    # ambience beds
    elif ty == 'birds':
        tc = t + 0.4
        while tc < t + e['dur'] - 0.5:
            for k in range(1 + int(rng.integers(0, 3))): put(amb, chirp(0.9), tc + k * 0.16, 1.0, float(rng.uniform(-0.8, 0.8)))
            tc += 1.2 + 2.0 * rng.random()
    elif ty == 'crickets':
        tc = t
        while tc < t + e['dur'] - 1.2: put(amb, cricket(1.2, 0.5), tc, 1.0, float(rng.uniform(-0.6, 0.6))); tc += 1.6
    elif ty == 'clock':
        tc = t + 0.3; k = 0
        while tc < t + e['dur'] - 0.2: put(amb, tick(0.8, k % 2 == 0), tc, 1.0, 0.5); tc += 1.0; k += 1
    elif ty == 'water': put(amb, bed(e['dur'], 300, 3500, 0.05, mod=1, fi=1.2, fo=1.5), t, 1.0, 0.0)
    elif ty == 'wind': put(amb, bed(e['dur'], 150, 900, 0.06 * e.get('v', 1), mod=1, fi=1.5, fo=1.5), t, 1.0, 0.0)

# paper room tone under everything
air = hp(nz(DUR + 1), 3000) * 0.002
amb[:len(air), 0] += air; amb[:len(air), 1] += np.roll(air, 2000)

# ——— mix ———
from scipy.signal import fftconvolve
def reverb(x, sec=1.6, wet=0.12):
    ir_t = T(sec); ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / (sec / 5)); ir = lp(ir, 5000); ir /= np.sqrt((ir ** 2).sum())
    return np.stack([fftconvolve(x[:, c], ir)[:len(x)] for c in (0, 1)], 1) * wet
music = music + reverb(music, 1.8, 0.14)
mix = music * 1.0 + fx * 0.9 + amb * 0.9
mix = np.stack([compress(mix[:, c], thr=.35, ratio=2.5) for c in (0, 1)], 1)
mix = mix[:int(DUR * SR)]
mix *= 0.8 / max(1e-9, np.abs(mix).max())
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
print('mix', mix.shape, 'dur', DUR)
