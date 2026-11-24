# score (synthesised kalimba, glockenspiel, pad) + foley driven by events.json -> out/mix.wav (48k stereo)
import json, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ['LIB'])
from core.audio.sfx import SR, bp, lp, hp, add, limit
from scipy.signal import fftconvolve
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; N = int(DUR * SR); rng = np.random.default_rng(5)
def noise(n): return rng.standard_normal(n)
def pink(n):
    w = np.fft.rfft(noise(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def stereo(x, pan): return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * 1.414
IRn = int(1.8 * SR); IR = np.stack([lp(noise(IRn), 5000), lp(noise(IRn), 5000)], 1) * np.exp(-np.arange(IRn) / SR * 3.2)[:, None]
IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1)
    return x2 * (1 - wet) + y * wet
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def kal(m, v):
    d = 2.6; t = np.arange(int(d * SR)) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + .35 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 14) + .12 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 4)
    x += hp(noise(len(t)), 2000) * np.exp(-t * 300) * .15
    return x * np.minimum(1, t / .002) * v
def glock(m, v):
    d = 3.0; t = np.arange(int(d * SR)) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.4) + .25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + .1 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12)
    return x * np.minimum(1, t / .001) * v
def pad(ms, d, v, fi=1.2, fo=1.5):
    t = np.arange(int(d * SR)) / SR
    x = sum(np.sin(2 * np.pi * hz(m) * t * (1 + .002 * i) + i) + .25 * np.sin(4 * np.pi * hz(m) * t) for i, m in enumerate(ms))
    return lp(x, 1600) * np.minimum(1, t / fi) * np.minimum(1, (d - t) / fo) * v
B = 60 / 72
CH = {'D': [50, 62, 66, 69, 74], 'Bm': [47, 59, 62, 66, 71], 'G': [43, 55, 59, 62, 67], 'A': [45, 57, 61, 64, 69]}
def arp(t0, bars, prog, v=.4, eighths=False, hi=0):
    for b in range(bars):
        c = CH[prog[b % len(prog)]]; tb = t0 + b * 3 * B
        add(mus, kal(c[0], v * .8), tb, 1, 0)
        steps = [(0, 2), (1, 3), (2, 4), (2.5, 3)] if not eighths else [(0, 2), (.5, 3), (1, 4), (1.5, 3), (2, 4), (2.5, 3)]
        for k, (bt, i) in enumerate(steps): add(mus, kal(c[i] + hi, v * (.9 if k == 0 else .7)), tb + bt * B, 1, -.4 + .25 * k)
# 0–13: the plant paints itself (5 bars of 3/4 at 72 bpm = 12.5 s)
arp(.4, 5, ['D', 'Bm', 'G', 'A', 'D'], .42)
# 13.0–14.0 breath; 14: the gust — the score lifts and moves (eighths, higher)
add(mus, kal(74, .55), 14.0, 1, -.2); add(mus, kal(50, .45), 14.0, 1, 0)
for i, (dt, m) in enumerate([(.42, 78), (.83, 81), (1.25, 83), (1.67, 86), (2.08, 81), (2.5, 83)]): add(mus, glock(m, .26), 14 + dt, 1, -.5 + i * .18)
arp(16.5, 6, ['G', 'D', 'Bm', 'A', 'G', 'A'], .36, eighths=True, hi=12)
add(mus, pad([62, 66, 69], 15, .035), 16.5, 1, 0)
# 31.5–33.2 the descent: slow falling notes; the landing: one glock note
for i, m in enumerate([81, 78, 76, 74]): add(mus, kal(m, .4 - i * .05), 31.5 + i * .42, 1, .2)
add(mus, glock(74, .4), 33.2, 1, 0)
# 34.5–39 autumn: low kalimba, Bm pad; 39–42.6 winter: thin pad, then near-silence
add(mus, pad([47, 59, 62, 66], 5.5, .05), 34.5, 1, 0)
for i, m in enumerate([59, 62, 66, 64, 62, 59]): add(mus, kal(m, .32), 35.0 + i * B * 1.5, 1, -.2 + i * .08)
add(mus, pad([62, 69, 74], 4.0, .03, 1.5, 2.0), 39.0, 1, 0)
# 44.4 spring: first sound after the silence, then the opening theme returns
add(mus, glock(86, .35), 44.4, 1, .3); add(mus, kal(74, .5), 44.4, 1, -.1)
arp(45.2, 4, ['D', 'Bm', 'G', 'A'], .42)
add(mus, kal(74, .55), 54.0, 1, -.2)
for i, (dt, m) in enumerate([(.42, 78), (.83, 81), (1.25, 83), (1.67, 86), (2.08, 90), (2.5, 86)]): add(mus, glock(m, .26), 54 + dt, 1, -.5 + i * .18)
for m, v in [(50, .45), (62, .45), (66, .4), (69, .4), (74, .4), (78, .3)]: add(mus, kal(m, v), 57.5, 1, (m - 64) / 30)
add(mus, pad([62, 66, 69, 74], 5, .04), 55.5, 1, 0)
# ---- foley ----
def brush(d, g, p0, p1):
    n = int(d * SR); p = np.arange(n) / n
    x = bp(noise(n), 1500, 7000) * (.6 + .4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 9))) + bp(pink(n), 300, 1500) * .5
    y = norm(x * np.sin(np.pi * p) ** .8, .5) * g; pan = p0 + (p1 - p0) * p
    return np.stack([y * np.cos((pan + 1) * np.pi / 4), y * np.sin((pan + 1) * np.pi / 4)], 1) * 1.414
def pencil(d, g):
    n = int(d * SR); t = np.arange(n) / SR
    return norm(bp(noise(n), 2500, 8000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 6.5 * t)) ** 3) * np.sin(np.pi * t / d) ** .5, .35) * g
def gust(d):
    n = int(d * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / .35) ** 1.5 * np.exp(-np.maximum(0, t - .5) * .8)
    a = bp(pink(n), 250, 2500) * e; b = np.roll(a, 700) * .8
    pan = np.clip(-.8 + 1.6 * t / 2.5, -.8, .8)
    return np.stack([norm(a, .6) * np.cos((pan + 1) * np.pi / 4), norm(b, .6) * np.sin((pan + 1) * np.pi / 4)], 1) * 1.3
def bed(d, lo, hi, g, fi=1.5, fo=2.0, mod=.21):
    n = int(d * SR); t = np.arange(n) / SR
    m = .6 + .4 * np.sin(2 * np.pi * mod * t + 1) * np.sin(2 * np.pi * .09 * t)
    a = bp(pink(n), lo, hi) * m; b = np.roll(a, 900)
    e = np.minimum(1, t / fi) * np.minimum(1, (d - t) / fo)
    return np.stack([norm(a, .5) * e, norm(b, .5) * e], 1) * g
def river(d, g):
    n = int(d * SR); t = np.arange(n) / SR
    imp = (rng.random(n) < 60 / SR) * rng.uniform(.2, 1, n)
    x = bp(np.convolve(imp, np.exp(-np.arange(400) / 60), 'same'), 600, 3000) + bp(pink(n), 800, 4000) * .3
    e = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 2.0); return np.stack([norm(x, .5) * e, norm(np.roll(x, 500), .5) * e], 1) * g
def tick(): n = int(.03 * SR); t = np.arange(n) / SR; return hp(noise(n), 4000) * np.exp(-t * 250) * .25
def dab(g): n = int(.25 * SR); t = np.arange(n) / SR; return lp(noise(n), 1200) * np.exp(-t * 30) * g
def leaves(d):
    out = np.zeros((int(d * SR), 2))
    for _ in range(40):
        tt = rng.uniform(0, d - .5); n = int(.35 * SR); t = np.arange(n) / SR
        x = bp(noise(n), 2000, 7000) * np.exp(-t * 10) * (np.abs(np.sin(2 * np.pi * 14 * t)) ** 2) * rng.uniform(.05, .12)
        add(out, x, tt, 1, rng.uniform(-.2, .9))
    return out
for e in ev['ev']:
    ty, t0 = e['type'], e['t']
    if ty == 'brush': x = brush(e['d'], e['g'], e['p0'], e['p1'])
    elif ty == 'pencil': x = stereo(pencil(e['d'], e['g']), e['p'])
    elif ty == 'dab': x = stereo(dab(e['g']), 0)
    elif ty == 'gust': x = gust(e['d']) * .55
    elif ty == 'seed': x = stereo(tick() * rng.uniform(.3, 1) * e.get('g', 1), e['p'])
    elif ty == 'wind': x = bed(e['d'], 250, 1800, .22)
    elif ty == 'river': x = river(e['d'], .2)
    elif ty == 'land': x = stereo(np.pad(tick() * .6, (0, int(.25 * SR) - int(.03 * SR))) + dab(.25), -.1)
    elif ty == 'leaves': x = leaves(e['d']) + bed(e['d'], 300, 2000, .12)
    elif ty == 'snow': x = bed(e['d'], 3000, 9000, .05, 2.0, 2.0, .05)
    else: continue
    i = int(t0 * SR); j = min(N, i + len(x)); sfx[i:j] += x[:j - i]
# room tone (dips during the winter hush), birds in summer and spring
t = np.arange(N) / SR
room = lp(pink(N), 400) * .0006 * (1 - .6 * np.clip((t - 40) / 1, 0, 1) * np.clip((44 - t) / .5, 0, 1))
sfx += np.stack([room, np.roll(room, 300)], 1)
def bird(v):
    n = int(.12 * SR); tt = np.arange(n) / SR; f = rng.uniform(3300, 4300) * (1 + .3 * np.sin(2 * np.pi * 30 * tt))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2 * v
for tb in [1.2, 1.7, 3.6, 4.1, 9.8, 10.3, 22.4, 22.9, 27.5, 44.7, 45.1, 46.9, 49.6, 50.0, 52.8]: add(sfx, bird(rng.uniform(.02, .035)), tb, 1, rng.uniform(-.6, .7))
mus = verb(mus, .3); sfx = verb(sfx, .12)
mus[int(59.0 * SR):] *= np.linspace(1, 0, N - int(59.0 * SR))[:, None] ** 1.5
mix = mus * .9 + sfx
mix = np.stack([limit(mix[:, 0], .9), limit(mix[:, 1], .9)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), (mix / np.abs(mix).max() * .89).astype(np.float32), SR, subtype='FLOAT')
print('mix ok', DUR, 's')
