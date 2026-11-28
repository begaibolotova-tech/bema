"""Score + foley for «ЖИ менен 5 пайдалуу иш» (60 s, 120 BPM), picture-locked to events.json.
Run from the library root: LIB=/path/to/lemo-opuscar python mix.py  → out/mix.wav (48 kHz stereo).
Optional: out/voice.wav (narration, added later) is mixed on top and the music ducks under it."""
import json, os, sys
import numpy as np
LIB = os.environ.get('LIB', '/home/user/lemomo-ai/lemo-opuscar')
sys.path.insert(0, os.path.join(LIB, 'core', 'audio'))
import sfx as S
from sfx import SR
import pluck as P
from scipy.signal import butter, sosfilt
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(os.path.join(HERE, 'events.json')))
DUR = ev['dur']; EV = ev['ev']
N = int((DUR + 1.5) * SR)
BEAT = 0.5; BAR = 2.0
rng = np.random.default_rng(5)

music = np.zeros((N, 2)); fx = np.zeros((N, 2))
def put(buf, x, t, g=1.0, pan=0.0):
    i = int(round(t * SR)); x = np.asarray(x, float)
    if i >= N: return
    x = x[: N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * g * l * 1.414; buf[i:i + len(x), 1] += x * g * r * 1.414
def t_(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)

# ── instruments ──
def kick(v=1.0):
    t = t_(0.45); f = 48 + 110 * np.exp(-t / 0.035)
    return v * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
def clap(v=1.0):
    n = S.noise(0.22); e = np.zeros_like(n); t = t_(0.22)
    for k, d in enumerate([0, 0.011, 0.022]): e += (t >= d) * np.exp(-(t - d).clip(0) / (0.006 if k < 2 else 0.07))
    return v * S.bp(n, 900, 2600) * e * 0.9
def hat(v=1.0, open_=False):
    d = 0.22 if open_ else 0.05; return v * S.hp(S.noise(d), 7000) * S.env_exp(d, 0.06 if open_ else 0.014)
def saw(f, d, det=0.0):
    t = t_(d); ph = (t * f * (1 + det)) % 1.0; return 2 * ph - 1
def pad(notes, d, v=0.2):
    x = sum(saw(hz(m), d, dt) for m in notes for dt in (-0.004, 0.004)) / (2 * len(notes))
    a = np.minimum(1, t_(d) / 0.35) * np.minimum(1, (d - t_(d)) / 0.3); return v * lp(x, 1400) * a
def bass(m, d, v=0.5):
    t = t_(d); x = np.sin(2 * np.pi * hz(m) * t) + 0.35 * np.tanh(3 * np.sin(2 * np.pi * hz(m) * t))
    return v * x * np.minimum(1, t / 0.005) * np.exp(-t / 0.35) * np.minimum(1, (d - t) / 0.02)
def pl(m, d=0.6, v=0.5): return v * P.pluck('koto', int(m), d, vel=0.7)
def bell(m, d=1.2, v=0.4): return v * P.pluck('music_box', int(m), d, vel=0.7)

# chords per bar: Am  F  C  G (root, chord tones)
PROG = [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (55, [55, 59, 62, 67])]
ARP = [0, 2, 1, 3, 2, 1, 3, 2]      # eighth-note pattern into the chord tones (+12)

# where the music is muted (EV 'silence') and the sections
sil = [(e['t'], e['t'] + e['d']) for e in EV if e['type'] == 'silence']
def muted(t): return any(a <= t < b for a, b in sil)
nbars = int(DUR / BAR)
for b in range(nbars):
    t0 = b * BAR; root, ch = PROG[b % 4]
    intro = t0 < 2.0; ending = t0 >= 58.0; breath = 46.0 <= t0 < 49.0
    if not ending: put(music, pad(ch, BAR + 0.05, 0.16 if not intro else 0.1), t0)
    for k in range(4):                                          # beats
        tb = t0 + k * BEAT
        if muted(tb) or intro or ending: continue
        put(music, kick(0.95), tb)
        if k in (1, 3) and not breath: put(music, clap(0.5), tb, pan=0.05)
        put(music, bass(root - 12 + (7 if k == 3 and b % 2 else 0), 0.45, 0.42), tb)
    for k in range(8):                                          # eighths
        te = t0 + k * BEAT / 2
        if muted(te) or ending: continue
        if not intro: put(music, hat(0.22 if k % 2 else 0.12, open_=(k == 7 and b % 2 == 1)), te, pan=0.3)
        if t0 >= 6.0 or intro: put(music, pl(ch[ARP[k]] + 12, 0.5, 0.17 if not intro else 0.12), te, pan=-0.25 + 0.5 * (k % 2))
# ending: the last bars thin out to one chord ringing under the end card
put(music, pad([57, 60, 64, 69], 2.6, 0.18), 58.0)
for k, m in enumerate([69, 72, 76, 81]): put(music, bell(m, 2.0, 0.35), 58.0 + k * 0.25, pan=-0.3 + 0.2 * k)
put(music, kick(0.9), 59.0); put(music, bass(45, 1.2, 0.5), 59.0)

# ── foley, from the edit's events ──
CARD_NOTE = {'hook': 69, 'item': 72, 'wall': 76, 'check': 64, 'end': 69}
for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'whoosh': put(fx, S.whoosh(0.32, 0.5), t, pan=0.2)
    elif ty == 'cut': put(fx, S.thump(0.55, 60), t); put(fx, bell(CARD_NOTE.get(e.get('kind'), 72) + 12, 0.9, 0.18), t, pan=0.2)
    elif ty == 'open': put(fx, S.whoosh(0.6, 0.35), t); put(fx, bell(81, 1.5, 0.25), t + 0.05)
    elif ty == 'slam': put(fx, S.thump(0.7, 52), t); put(fx, S.clack(1.0, 0.35), t)
    elif ty == 'tick': put(fx, S.click(1.6 + 0.02 * (e.get('k', 0) % 8), 0.22), t, pan=0.15)
    elif ty == 'boom': put(fx, S.thump(1.0, 42), t); put(fx, 0.35 * S.crash(0.8), t)
    elif ty == 'key': put(fx, S.click(1.9 + 0.3 * rng.random(), 0.12 + 0.05 * rng.random()), t, pan=0.1)
    elif ty == 'enter': put(fx, S.clack(1.3, 0.25), t)
    elif ty == 'scribble': n = S.bp(S.noise(0.38), 2500, 6000) * np.sin(np.pi * t_(0.38) / 0.38) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 22 * t_(0.38))); put(fx, 0.12 * n, t, pan=-0.1)
    elif ty == 'flap': put(fx, S.clack(0.7, 0.4), t)
    elif ty == 'pop': put(fx, S.pop(0.45), t, pan=-0.3 + 0.15 * e.get('k', 2)); put(fx, bell(76 + 2 * e.get('k', 0), 0.6, 0.12), t)
    elif ty == 'ding': put(fx, S.ding(0.35), t)
    elif ty == 'flip': put(fx, S.click(1.2, 0.3), t); put(fx, S.whoosh(0.18, 0.25), t - 0.08)
    elif ty == 'zap': z = S.hp(S.noise(0.25), 3000) * np.sign(np.sin(2 * np.pi * 120 * t_(0.25))) * S.env_exp(0.25, 0.05); put(fx, 0.15 * z, t)
    elif ty == 'sweep': put(fx, S.whoosh(0.8, 0.4), t)
    elif ty == 'alert':
        for k, f in enumerate([880, 660]): tt = t_(0.14); put(fx, 0.18 * np.sin(2 * np.pi * f * tt) * np.minimum(1, (0.14 - tt) / 0.02) * np.minimum(1, tt / 0.005), t + k * 0.16)
    elif ty == 'stamp': put(fx, S.thump(0.8, 58), t); put(fx, S.clack(0.8, 0.3), t)

# ── master ──
music = np.stack([S.compress(music[:, c], thr=.3, ratio=2.5) for c in range(2)], 1)
mix = music * 0.85 + fx * 0.9
vo = os.path.join(HERE, 'out', 'voice.wav')
if os.path.exists(vo):                                          # narration later: music ducks ~8 dB under it
    v, vsr = sf.read(vo, always_2d=True); v = v.mean(1)
    if vsr != SR: raise SystemExit(f'voice.wav must be {SR} Hz')
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    envv = np.convolve(np.abs(v), np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same'); duck = 1 - 0.6 * np.clip(envv / (envv.max() * 0.25 + 1e-9), 0, 1)
    mix = mix * duck[:, None] + np.stack([v, v], 1) * 1.6
mix = np.stack([S.limit(mix[:, c] / (np.abs(mix).max() + 1e-9) * 0.95, ceil=.89) for c in range(2)], 1)
mix = mix[: int(DUR * SR)]
fade = int(0.4 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', mix.shape[0] / SR, 's  rms dB', 20 * np.log10(np.sqrt((mix ** 2).mean()) + 1e-12))
