# music bed + sonified marks + pencil foley + ElevenLabs voice -> out/mix.wav (48k stereo)
import json, os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.environ['LIB'])
from core.audio.sfx import SR, bp, lp, hp, add, limit
from scipy.signal import fftconvolve, resample_poly
ev = json.load(open(os.path.join(HERE, 'events.json'))); DUR = ev['dur']; N = int(DUR * SR); rng = np.random.default_rng(3)
def noise(n): return rng.standard_normal(n)
def pink(n): w = np.fft.rfft(noise(n)); f = np.arange(len(w)); f[0] = 1; return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def st(x, pan=0): return np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], 1) * 1.414
IRn = int(1.2 * SR); IR = np.stack([lp(noise(IRn), 6000), lp(noise(IRn), 6000)], 1) * np.exp(-np.arange(IRn) / SR * 5)[:, None]; IR /= np.sqrt((IR ** 2).sum(0))
def verb(x, wet): return x * (1 - wet) + np.stack([fftconvolve(x[:, c], IR[:, c])[:len(x)] for c in (0, 1)], 1) * wet
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2)); vo = np.zeros((N, 2)); duck = np.zeros(N)
SIL = (30.45, 31.2)                       # true silence before the ×10¹³ reveal
# ---- bed: 96 bpm, soft kick + shaker + detuned pad, Am – F – C – G ----
B = 60 / 96
def kick(v): d = .35; t = np.arange(int(d * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(50 + 70 * np.exp(-t * 30)) / SR) * np.exp(-t * 9) * v
def shaker(v): d = .08; t = np.arange(int(d * SR)) / SR; return hp(noise(len(t)), 5000) * np.exp(-t * 60) * v
def pad(ms, d, v):
    t = np.arange(int(d * SR)) / SR
    x = sum(sum(np.sign(np.sin(2 * np.pi * hz(m) * (1 + dt) * t + i)) * .3 for dt in (-.004, .004)) for i, m in enumerate(ms))
    return lp(x, 1400) * np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4) * v
CH = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
def section(t0, t1, kv=.5, sv=.12, pv=.05, dark=False):
    bar = 4 * B; i = 0; t = t0
    while t < t1 - .05:
        c = CH[i % 4] if not dark else [[57, 60, 64], [56, 60, 63]][i % 2]
        add(mus, pad(c, min(bar, t1 - t), pv), t, 1, 0); add(mus, pad([c[0] - 24], min(bar, t1 - t), pv * 1.2), t, 1, 0)
        for b in range(4):
            tb = t + b * B
            if tb < t1 - .05: add(mus, kick(kv), tb, 1, 0)
            for h in (.5,):
                if tb + h * B < t1 - .05 and sv: add(mus, shaker(sv), tb + h * B, 1, .3)
        t += bar; i += 1
section(3.4, 13.4, .35, .08, .045); section(14.5, SIL[0], .45, .1, .045)
section(SIL[1], 47.0, .5, .12, .05)
section(47.0, 58.4, .35, .08, .045, dark=True)
section(59.0, 63.0, .4, .1, .05)
# ---- sonification: plonk, pitch = height (pentatonic), wood -> metal with height ----
PENT = [0, 2, 4, 7, 9]
def plonk(h, v=.5, blue=False):
    m = 45 + int(h / 9000 * 30); m = 12 * (m // 12) + min(PENT, key=lambda p: abs(p - m % 12)); f = hz(m); d = 1.4; t = np.arange(int(d * SR)) / SR
    idx = .5 + 3 * h / 9000; x = np.sin(2 * np.pi * f * t + idx * np.exp(-t * 6) * np.sin(2 * np.pi * f * (2.0 if not blue else 3.0) * t))
    return lp(x * np.exp(-t * 3.5), 2600) * v
# ---- foley ----
def scratch(d, g=.18):
    n = int(d * SR); t = np.arange(n) / SR
    return norm(bp(noise(n), 2500, 8000) * (.4 + .6 * np.abs(np.sin(2 * np.pi * 7 * t)) ** 3) * np.sin(np.pi * t / d) ** .5, .35) * g
def ruler(d): n = int(d * SR); t = np.arange(n) / SR; return norm(bp(noise(n), 1200, 6000) * np.sin(np.pi * t / d), .3) * .22
def ratchet(d):
    out = np.zeros(int(d * SR))
    for k in range(9): i = int(k / 9 * d * SR); c = hp(noise(int(.02 * SR)), 2000) * np.exp(-np.arange(int(.02 * SR)) / SR * 300) * .3; out[i:i + len(c)] += c[:len(out) - i]
    return out
def whoosh(): n = int(1.4 * SR); t = np.arange(n) / SR; return norm(bp(pink(n), 300, 3000) * np.minimum(1, t / .6) ** 2 * np.exp(-np.maximum(0, t - .7) * 4), .5)
def fallwind(d):
    n = int(d * SR); t = np.arange(n) / SR; ramp = np.minimum(1, t / 3.0) * (1 - .25 * np.clip((t - d + 2) / 2, 0, 1))
    a = bp(pink(n), 200, 2500) * ramp + hp(noise(n), 3000) * .03 * ramp * (t / d)
    return np.stack([norm(a, .5), norm(np.roll(a, 600), .5)], 1) * .35 * np.minimum(1, (d - t) / .1)[:, None]
def hit(): n = int(1.2 * SR); t = np.arange(n) / SR; return (np.sin(2 * np.pi * 48 * t) * np.exp(-t * 5) + lp(noise(n), 500) * np.exp(-t * 18) * .5) * .7
def tap(): n = int(.06 * SR); t = np.arange(n) / SR; return (hp(noise(n), 1500) * np.exp(-t * 120) + np.sin(2 * np.pi * 900 * t) * np.exp(-t * 80) * .4) * .3
for e in ev['ev']:
    ty, t0 = e['type'], e['t']
    if ty == 'vo':
        x, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'));
        if x.ndim > 1: x = x.mean(1)
        x = hp(resample_poly(x, SR, sr) if sr != SR else x, 90); add(vo, x, t0, 1, 0)
        a = max(0, int((t0 - .25) * SR)); b = min(N, int((t0 + len(x) / SR + .4) * SR)); duck[a:b] = 1; continue
    if ty == 'plonk': add(mus, plonk(e['h'], .28 if e.get('soft') else .5, e.get('blue', False)), t0, 1, -.3 + .6 * e['h'] / 9000)
    elif ty == 'scratch': add(sfx, scratch(e['d']), t0, 1, .2)
    elif ty == 'ruler': add(sfx, ruler(e['d']), t0, 1, -.2)
    elif ty == 'ratchet': add(sfx, ratchet(e['d']), t0, 1, 0)
    elif ty == 'whoosh': add(sfx, whoosh() * .5, t0 - .3, 1, 0)
    elif ty == 'fallwind': i = int(t0 * SR); w = fallwind(e['d']); j = min(N, i + len(w)); sfx[i:j] += w[:j - i]
    elif ty == 'hit': add(sfx, hit(), t0, 1, 0)
    elif ty == 'tap': add(sfx, tap(), t0, 1, 0)
    elif ty == 'sweep': n = int(e['d'] * SR); x = bp(pink(n), 400, 4000) * np.sin(np.pi * np.arange(n) / n); add(sfx, norm(x, .25), t0, 1, 0)
    elif ty == 'boing':
        for r in range(1):
            tb = t0 + .36; d = 2.05; n = int(d * SR); tt = np.arange(n) / SR      # chart: 1 s of jump drawn over 3 s
            add(sfx, np.sin(2 * np.pi * np.cumsum(220 + 260 * np.sin(np.pi * tt / d)) / SR) * np.sin(np.pi * tt / d) * .18, tb, 1, 0)
            add(sfx, hit() * .35, tb + d, 1, 0)
    elif ty == 'thud': pass
mus = verb(mus, .18); sfx = verb(sfx, .08)
# level the voice: compress, then sit it ~10 dB over the music; duck music ~11 dB under it
from scipy.ndimage import maximum_filter1d
v = vo[:, 0]; pk = maximum_filter1d(np.abs(v), int(.005 * SR)); act = duck > .5
vr = np.sqrt(np.mean(v[np.abs(v) > .02 * np.abs(v).max()] ** 2)); g = np.minimum(1, vr * 3.5 / (pk + 1e-9)); v = v * lp(g, 200)
dl = lp(np.convolve(duck, np.ones(int(.25 * SR)) / int(.25 * SR), 'same'), 5)
mr = np.sqrt(np.mean(mus[~act] ** 2)) + 1e-9; v *= mr * 10 ** (10 / 20) / (np.sqrt(np.mean(v[act] ** 2)) + 1e-9)
mus *= (1 - .72 * dl)[:, None]
mix = mus + sfx + np.stack([v, v], 1)
i0, i1 = int(SIL[0] * SR), int(SIL[1] * SR); mix[i0:i1] = 0          # true digital silence
mix[int(62.8 * SR):] *= np.linspace(1, 0, N - int(62.8 * SR))[:, None]
mix = np.stack([limit(mix[:, c], .9) for c in (0, 1)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), (mix / np.abs(mix).max() * .89).astype(np.float32), SR, subtype='FLOAT'); print('mix ok')
