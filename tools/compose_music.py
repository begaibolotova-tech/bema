"""Procedural warm autumn lo-fi piece, 20 s, 8 bars at 96 BPM. Writes stereo 16-bit WAV."""
import sys, wave
import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N); R = np.zeros(N)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x); s = 0.0
    for k in range(len(x)):
        s = (1 - a) * x[k] + a * s
        y[k] = s
    return y

def piano(note, length=2.2, vel=1.0):
    t = np.arange(int(length * SR)) / SR
    f = midi(note)
    s = (np.sin(2*np.pi*f*t) + 0.45*np.sin(2*np.pi*2*f*t)*np.exp(-t*3)
         + 0.2*np.sin(2*np.pi*3*f*t)*np.exp(-t*5) + 0.08*np.sin(2*np.pi*4.01*f*t)*np.exp(-t*7))
    env = np.exp(-t * 1.6) * np.minimum(1, t / 0.004)
    return s * env * vel

def pad(notes, length):
    t = np.arange(int(length * SR)) / SR
    s = np.zeros_like(t)
    for n in notes:
        f = midi(n)
        for d in (-0.12, 0.0, 0.12):  # detune in semitones/10 -> chorus
            ff = f * 2 ** (d / 12)
            s += np.sin(2*np.pi*ff*t + 0.3*np.sin(2*np.pi*0.25*t))
            s += 0.25 * np.sin(2*np.pi*2*ff*t)
    att, rel = 0.8, 0.9
    env = np.minimum(1, t / att) * np.minimum(1, (length - t) / rel).clip(0)
    return s * env / (len(notes) * 3)

def bass(note, length):
    t = np.arange(int(length * SR)) / SR
    f = midi(note)
    s = np.sin(2*np.pi*f*t) + 0.15*np.sin(2*np.pi*2*f*t)
    return s * np.exp(-t * 1.2) * np.minimum(1, t / 0.01)

def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 50 + 70 * np.exp(-t * 30)
    ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.exp(-t * 9)

def snare():
    t = np.arange(int(0.25 * SR)) / SR
    n = lowpass(rng.standard_normal(len(t)), 3500)
    return (n * 0.9 + 0.3*np.sin(2*np.pi*190*t)) * np.exp(-t * 18)

def hat():
    t = np.arange(int(0.06 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = n - lowpass(n, 6000)
    return n * np.exp(-t * 60)

# Am - F - C - G | Am - F - G - C   (A minor / C major, nostalgic)
chords = [
    (57, [57, 60, 64, 67], 45),  # Am7
    (53, [53, 57, 60, 64], 41),  # Fmaj7
    (48, [48, 52, 55, 59], 36),  # Cmaj7
    (55, [55, 59, 62, 65], 43),  # G7 -> soft
    (57, [57, 60, 64, 67], 45),
    (53, [53, 57, 60, 64], 41),
    (55, [55, 59, 62, 67], 43),  # G
    (48, [48, 52, 55, 60], 36),  # C
]
melody = [  # (bar, beat offset, midi)  gentle top line
    (1, 0, 76), (1, 1.5, 74), (1, 2, 72), (1, 3, 71),
    (2, 0, 72), (2, 1.5, 74), (2, 2, 76), (2, 3, 79),
    (3, 0, 79), (3, 1, 77), (3, 2, 76), (3, 3, 74),
    (4, 0, 76), (4, 2, 72),
    (5, 0, 77), (5, 1.5, 76), (5, 2, 74), (5, 3, 72),
    (6, 0, 74), (6, 1.5, 71), (6, 2, 74), (6, 3, 79),
    (7, 0, 76), (7, 2, 72),
]

for b, (root, notes, bnote) in enumerate(chords):
    t0 = b * BAR
    add(pad(notes, BAR + 0.9), t0, 0.0, 0.32)
    if b >= 1:
        add(bass(bnote - 12 + 12, BAR / 2), t0, 0.0, 0.42)
        add(bass(bnote - 12 + 12, BAR / 2), t0 + BAR / 2, 0.0, 0.3)
    # arpeggio in eighths
    arp = [notes[0], notes[2], notes[1] + 12, notes[3], notes[2] + 12, notes[3], notes[1] + 12, notes[2]]
    for k, n in enumerate(arp):
        swing = 0.035 if k % 2 else 0.0
        vel = 0.55 if k % 2 == 0 else 0.4
        add(piano(n, 1.8, vel), t0 + k * BEAT / 2 + swing, (-0.35 if k % 2 else 0.25), 0.22)
    # drums from bar 2, drop out on last bar for the ending
    if 1 <= b <= 6:
        for beat in range(4):
            tb = t0 + beat * BEAT
            if beat in (0, 2): add(kick(), tb, 0, 0.55)
            if beat == 2 and b % 2: add(kick(), tb + BEAT * 0.75, 0, 0.3)
            if beat in (1, 3): add(snare(), tb + 0.01, 0.1, 0.18)
            add(hat(), tb, 0.3, 0.12); add(hat(), tb + BEAT / 2 + 0.04, 0.3, 0.07)

for bar, beat, n in melody:
    add(piano(n, 2.4, 0.9), bar * BAR + beat * BEAT, 0.0, 0.3)
# final ringing chord
add(piano(72, 4.0, 0.8), 7 * BAR + 2 * BEAT, 0, 0.3)

# vinyl crackle
crack = np.zeros(N)
idx = rng.integers(0, N, 260)
crack[idx] = rng.uniform(-1, 1, 260)
hiss = lowpass(rng.standard_normal(N), 4000) * 0.004
L += crack * 0.05 + hiss; R += np.roll(crack, 37) * 0.05 + hiss

# simple reverb: convolve with decaying noise IR via FFT
def reverb(x, seed):
    r = np.random.default_rng(seed)
    t = np.arange(int(1.8 * SR)) / SR
    ir = r.standard_normal(len(t)) * np.exp(-t * 3.2)
    ir = lowpass(ir, 5000); ir /= np.sqrt(np.sum(ir ** 2))
    n = len(x) + len(ir)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    return y
L = L * 0.8 + reverb(L, 1) * 0.35
R = R * 0.8 + reverb(R, 2) * 0.35

# warm tone + tape-ish saturation, fades
L = lowpass(L, 7000); R = lowpass(R, 7000)
t = np.arange(N) / SR
fade = np.minimum(1, t / 0.6) * np.minimum(1, (DUR - t) / 2.5)
mx = max(np.abs(L).max(), np.abs(R).max())
L = np.tanh(L / mx * 1.2) * fade; R = np.tanh(R / mx * 1.2) * fade
out = np.stack([L, R], 1)
out = (out / np.abs(out).max() * 0.9 * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(out.tobytes())
print("ok")
