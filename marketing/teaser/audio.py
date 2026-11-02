"""Original soundtrack for the SmartStylist teaser: warm music bed + synced SFX.
Writes audio.wav (44.1 kHz stereo, 60 s)."""
import sys, wave
import numpy as np

SR = 44100
DUR = 60.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    mix[i : i + len(sig), 0] += sig * gain * l
    mix[i : i + len(sig), 1] += sig * gain * r


def env(n, a=0.01, d=0.3, s=0.6, rel=0.3):
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(rel * SR)
    e[:na] = np.linspace(0, 1, na)
    e[na : na + nd] = np.linspace(1, s, nd)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, a=0.08):
    # one-pole low-pass (vectorised via cumulative filter approximation)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


midi = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------------- music ----------------
BPM = 96
beat = 60 / BPM
bar = 4 * beat
chords = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65]]  # Fmaj7 Am7 Dm7 G7
bass = [41, 45, 38, 43]

start_music, end_music = 0.0, 59.6
nbars = int((end_music - start_music) / bar) + 1
pad_len = int(bar * SR)
for b in range(nbars):
    t0 = start_music + b * bar
    ch = chords[b % 4]
    tt = np.arange(pad_len) / SR
    pad = sum(np.sin(2 * np.pi * midi(m) * tt + 0.3 * np.sin(2 * np.pi * 0.3 * tt)) for m in ch) / 4
    pad += 0.25 * sum(np.sin(2 * np.pi * midi(m + 12) * tt * 1.003) for m in ch) / 4
    add(pad * env(pad_len, 0.4, 0.5, 0.8, 0.6), t0, 0.10)
    # bass from the brand reveal
    if t0 >= 8.4:
        for k in range(2):
            n = int(beat * 2 * SR)
            tb = np.arange(n) / SR
            bs = np.sin(2 * np.pi * midi(bass[b % 4]) * tb) + 0.3 * np.sin(2 * np.pi * midi(bass[b % 4] + 12) * tb)
            add(bs * env(n, 0.01, 0.4, 0.5, 0.3), t0 + k * 2 * beat, 0.16)
    # pluck arpeggio from 'Sound familiar?'
    if t0 >= 4.4:
        pattern = [0, 2, 1, 3, 2, 1, 3, 2]
        for k, idx in enumerate(pattern):
            n = int(0.5 * SR)
            tp = np.arange(n) / SR
            f = midi(ch[idx] + 12)
            pl = (np.sin(2 * np.pi * f * tp) + 0.4 * np.sin(4 * np.pi * f * tp)) * np.exp(-tp * 7)
            add(pl, t0 + k * beat / 2, 0.07, pan=0.35 if k % 2 else -0.35)

# drums from the brand reveal
n = int(0.35 * SR); tk = np.arange(n) / SR
kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 9)
n = int(0.06 * SR)
hat = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 70)
hat = hat - lowpass(hat, 0.3)
n = int(0.2 * SR); ts = np.arange(n) / SR
snap = (rng.standard_normal(n) * 0.6 + np.sin(2 * np.pi * 190 * ts)) * np.exp(-ts * 22)
x = 9.0
while x < 57.0:
    bpos = round((x - 9.0) / beat) % 4
    if bpos in (0, 2):
        add(kick, x, 0.42)
    if bpos in (1, 3) and x > 12.0:
        add(snap, x, 0.10)
    if x > 12.0:
        add(hat, x + beat / 2, 0.05, pan=0.3)
    x += beat

# ---------------- sfx ----------------
def blip(f=1300, d=0.05, g=1.0):
    n = int(d * SR); tb = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tb) * np.exp(-tb * 60) * g


def whoosh(d=0.45, up=True):
    n = int(d * SR)
    noise = rng.standard_normal(n)
    sweep = np.linspace(0.02, 0.35, n) if up else np.linspace(0.35, 0.02, n)
    y = np.empty(n); acc = 0.0
    for i in range(n):
        acc += sweep[i] * (noise[i] - acc)
        y[i] = acc
    return y * np.sin(np.linspace(0, np.pi, n)) ** 2


def chime(f=1568, d=0.6):
    n = int(d * SR); tb = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tb) + 0.5 * np.sin(2 * np.pi * f * 1.5 * tb)) * np.exp(-tb * 6)


for at in [20.4, 21.7, 26.0, 38.5]:
    add(blip(1400), at, 0.35)
    add(blip(700, 0.08), at + 0.01, 0.25)
add(whoosh(0.5), 30.6, 0.55, pan=0.5)
for at in [34.65, 35.65, 36.65]:
    add(whoosh(0.45), at, 0.5, pan=-0.5)
add(whoosh(0.5, up=False), 37.1, 0.35)
add(whoosh(0.6), 12.2, 0.3)  # phone enters
for at in [15.4, 23.3, 31.5, 39.0, 43.8, 44.15, 44.5]:
    add(chime(1568), at, 0.10)
for i in range(5):
    add(chime(1175 + i * 120), 48.3 + i * 0.45, 0.08)
add(chime(1047, 1.4), 9.0, 0.16)   # logo reveal
add(chime(1319, 1.6), 53.4, 0.14)  # end card
# typing ticks: hook quote + stylist note
for i in range(24):
    add(blip(2400 + rng.integers(0, 600), 0.012), 1.0 + i * (1.6 / 24), 0.10)
for i in range(46):
    add(blip(2400 + rng.integers(0, 600), 0.010), 27.4 + i * (2.4 / 46), 0.06)

# ---------------- master ----------------
fade = np.ones(N)
fade[: int(0.8 * SR)] = np.linspace(0, 1, int(0.8 * SR))
fade[int(57.5 * SR) :] = np.linspace(1, 0, N - int(57.5 * SR))
mix *= fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)  # gentle limiter
peak = np.abs(mix).max()
mix = mix / peak * 0.89
out = sys.argv[1] if len(sys.argv) > 1 else "audio.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out, f"{DUR}s")
