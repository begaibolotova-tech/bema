# score (synthesised kalimba + glockenspiel) + foley from events.json -> out/mix.wav (48k stereo)
import json, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.environ['LIB'])
from core.audio.sfx import SR, bp, lp, hp, add, limit
from scipy.signal import fftconvolve
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; N = int(DUR * SR); rng = np.random.default_rng(5)
def noise(n): return rng.standard_normal(n)
def pink(n):
    w = np.fft.rfft(noise(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n)
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
IRn = int(1.6 * SR); IR = np.stack([lp(noise(IRn), 5000), lp(noise(IRn), 5000)], 1) * np.exp(-np.arange(IRn) / SR * 3.6)[:, None]
IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1)
    return x2 * (1 - wet) + y * wet
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def kalimba(m, v):
    d = 2.6; t = np.arange(int(d * SR)) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + .35 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 14) + .12 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 4)
    x += hp(noise(len(t)), 2000) * np.exp(-t * 300) * .15
    return x * np.minimum(1, t / .002) * v
def glock(m, v):
    d = 3.0; t = np.arange(int(d * SR)) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.4) + .25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + .1 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12)
    return x * np.minimum(1, t / .001) * v
def pad(ms, t0, d, v):
    t = np.arange(int(d * SR)) / SR; x = sum(np.sin(2 * np.pi * hz(m) * t + i) + .2 * np.sin(4 * np.pi * hz(m) * t) for i, m in enumerate(ms))
    e = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.5); return lp(x, 1800) * e * v
B = 60 / 72; b0 = .4
# section A: D major pentatonic arpeggio on the beat grid (0.4 + k*0.833)
A = [(0, 62, .5), (1, 66, .45), (1.5, 69, .35), (2, 74, .5), (3, 71, .45), (3.5, 69, .35), (4, 66, .45), (5, 69, .4)]
for k, m, v in A: add(mus, kalimba(m, v), b0 + k * B, 1, -.3 + .15 * (m % 5))
add(mus, kalimba(50, .35), b0, 1, 0); add(mus, kalimba(57, .3), b0 + 2 * B, 1, 0)
# 4.7–5.6: silence. 5.6: release, higher register, glock sparkles following the seeds (pan left -> right)
g0 = 5.6
add(mus, kalimba(74, .55), g0, 1, -.2); add(mus, kalimba(50, .4), g0, 1, 0)
for i, (dt, m) in enumerate([(.42, 78), (.83, 81), (1.25, 83), (1.67, 86), (2.08, 81), (2.5, 83), (2.92, 78)]):
    add(mus, glock(m, .28), g0 + dt, 1, -.4 + i * .13); add(mus, kalimba(m - 12, .3), g0 + dt, 1, .3 - i * .08)
add(mus, pad([62, 66, 69], g0 + .2, 4.2, .05), g0 + .2, 1, 0)
for m, v in [(50, .4), (62, .45), (69, .4), (74, .4), (78, .3)]: add(mus, kalimba(m, v), g0 + 3.33, 1, (m - 64) / 30)
# foley
def brush(d, g, p0, p1):
    n = int(d * SR); p = np.arange(n) / n
    x = bp(noise(n), 1500, 7000) * (.6 + .4 * np.abs(np.sin(np.arange(n) / SR * 2 * np.pi * 9))) + bp(pink(n) * 20, 300, 1500) * .5
    y = norm(x * np.sin(np.pi * p) ** .8, .5) * g; pan = p0 + (p1 - p0) * p
    return np.stack([y * np.cos((pan + 1) * np.pi / 4), y * np.sin((pan + 1) * np.pi / 4)], 1) * 1.414
def pencil(d, g):
    n = int(d * SR); t = np.arange(n) / SR
    x = bp(noise(n), 2500, 8000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 6.5 * t)) ** 3) * np.sin(np.pi * t / d) ** .5
    return norm(x, .35) * g
def gust(d):
    n = int(d * SR); t = np.arange(n) / SR
    e = np.minimum(1, t / .35) ** 1.5 * np.exp(-np.maximum(0, t - .5) * .9)
    a = bp(pink(n) * 20, 250, 2500) * e; b = np.roll(a, 700) * .8 + bp(noise(n), 1500, 5000) * e * .05
    pan = np.clip(-.8 + 1.6 * t / 2.5, -.8, .8)
    return np.stack([norm(a, .6) * np.cos((pan + 1) * np.pi / 4), norm(b, .6) * np.sin((pan + 1) * np.pi / 4)], 1) * 1.3
def tick():
    n = int(.03 * SR); t = np.arange(n) / SR; return hp(noise(n), 4000) * np.exp(-t * 250) * .25
def stereo(x, pan): return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * 1.414
for e in ev['ev']:
    i = int(e['t'] * SR)
    if e['type'] == 'brush': x = brush(e['d'], e['g'], e['p0'], e['p1'])
    elif e['type'] == 'pencil': x = stereo(pencil(e['d'], e['g']), e['p'])
    elif e['type'] == 'gust': x = gust(e['d']) * .55
    elif e['type'] == 'seed': x = stereo(tick() * rng.uniform(.3, 1), e['p'])
    j = min(N, i + len(x)); sfx[i:j] += x[:j - i]
# ambience: soft room + faint birds; breath of silence 4.7–5.6 leaves only the room
t = np.arange(N) / SR
room = lp(pink(N) * 20, 400) * .012; sfx += np.stack([room, np.roll(room, 300)], 1)
for tb in [0.9, 1.4, 2.6, 3.1, 7.9, 8.4]:
    n = int(.12 * SR); tt = np.arange(n) / SR; f = 3800 * (1 + .3 * np.sin(2 * np.pi * 30 * tt))
    add(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2 * .03, tb, 1, .6)
mus = verb(mus, .3); sfx = verb(sfx, .12)
mus[int(9.3 * SR):] *= np.linspace(1, .0, N - int(9.3 * SR))[:, None] ** 1.5
mix = mus * .9 + sfx
mix = limit(mix, .9) if mix.ndim == 1 else np.stack([limit(mix[:, 0], .9), limit(mix[:, 1], .9)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), (mix / np.abs(mix).max() * .89).astype(np.float32), SR, subtype='FLOAT')
print('mix ok', DUR, 's')
