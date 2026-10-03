"""Score for the VALENCE introduction film, synthesised from the film's own cue list.

    python3 motion/score.py cues.json motion/score.wav

The cue list comes from film.js (ValenceMotion.cues), exported by `node motion/render.mjs cues`,
so every hit lands on the frame it belongs to. Key of D; the constellation is drawn in the
D major pentatonic, rising left to right as the name assembles. The tail fades to silence so
the film loops on social without a seam.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def env(n, a, d, curve=4.0):
    """Attack then exponential-ish decay envelope over n samples."""
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    nd = n - na
    if nd > 0:
        e[na:] = np.exp(-curve * np.linspace(0, 1, nd) * (n / SR) / max(d, 1e-3))
    return e


def lowpass(x, cut):
    """One-pole low-pass; cut may be an array (Hz per sample)."""
    cut = np.broadcast_to(np.asarray(cut, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):  # fine for the short bursts it is used on
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def place(buf, sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(sig), 0] += sig * l * 1.414
    buf[i : i + len(sig), 1] += sig * r * 1.414


def tone(f, dur, a=0.005, d=0.5, harm=((1, 1.0),), curve=4.0, f_end=None):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if f_end is not None:
        k = np.log(f_end / f) / dur
        phase = 2 * np.pi * f * (np.exp(k * t) - 1) / k
    else:
        phase = 2 * np.pi * f * t
    s = sum(g * np.sin(phase * h) for h, g in harm)
    return s * env(n, a, d, curve)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def kick(f0=130, f1=42, dur=0.6):
    return tone(f0, dur, a=0.001, d=0.35, f_end=f1, harm=((1, 1.0), (2, 0.12)))


def main(cues_path, out):
    meta = json.load(open(cues_path))
    c, dur = meta["cues"], meta["dur"]
    n = int(dur * SR)
    mix = np.zeros((n, 2))
    t = np.arange(n) / SR

    # ---- bed: a low D drone that follows the acts ----
    def curve(points):
        xs, ys = zip(*points)
        return np.interp(t, xs, ys)

    bed_amp = curve([(0, 0.0), (0.4, 0.05), (1.5, 0.06), (3.6, 0.16), (4.0, 0.02), (4.6, 0.09), (8.4, 0.1), (8.6, 0.05),
                     (13.5, 0.07), (14.1, 0.0), (14.4, 0.07), (19.4, 0.09), (19.6, 0.06), (24.0, 0.2), (24.2, 0.16),
                     (27.5, 0.12), (29.4, 0.0), (30, 0.0)])
    drift = 0.002 * np.sin(2 * np.pi * 0.07 * t)
    bed = (np.sin(2 * np.pi * 36.71 * t) * 0.9 + np.sin(2 * np.pi * 73.42 * (1 + drift) * t) * 0.6
           + np.sin(2 * np.pi * 110.0 * (1 - drift) * t) * 0.32 + np.sin(2 * np.pi * 146.83 * t) * 0.15
           * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t)))
    mix[:, 0] += bed * bed_amp
    mix[:, 1] += np.roll(bed, 240) * bed_amp

    # ---- I · the signal pulse ----
    for p in [0.0]:
        place(mix, tone(1174.7, 0.9, a=0.002, d=0.35, harm=((1, 1), (2.01, 0.2))), p, gain=0.16)
        place(mix, kick(90, 40, 0.5), p, gain=0.25)
    for tk in c["tick"]:
        place(mix, noise(0.006) * env(int(0.006 * SR), 0.0005, 0.003), tk, pan=rng.uniform(-0.3, 0.3), gain=0.12)

    # ---- II · noise: a rising wash and a crowd of voices, cut by the strike ----
    for a, b in c["swell"][:1]:
        L = b - a
        w = noise(L)
        cut = np.linspace(300, 7000, len(w)) ** 1.0
        w = lowpass(w, cut) * np.linspace(0, 1, len(w)) ** 2
        place(mix, w, a, gain=0.22)
        # chattering fragments: short pitched blips, many, random
        for k in range(70):
            tt = a + 0.1 + rng.uniform(0, L - 0.2)
            f = rng.choice([523.3, 587.3, 659.3, 783.99, 880, 987.8, 1046.5, 1318.5]) * rng.choice([1, 0.5, 2])
            place(mix, tone(f, 0.12, a=0.002, d=0.04, harm=((1, 1), (3, 0.3))), tt, pan=rng.uniform(-0.9, 0.9), gain=0.05)
    # the strike: one hard hit, everything stops
    for h in c["hit"][:1]:
        place(mix, noise(0.25) * env(int(0.25 * SR), 0.001, 0.06), h, gain=0.45)
        place(mix, kick(160, 38, 0.9), h, gain=0.6)

    # ---- whooshes ----
    for w0 in c["whoosh"]:
        L = 0.55
        w = noise(L)
        cut = np.concatenate([np.linspace(200, 5000, int(L * SR * 0.7)), np.linspace(5000, 600, int(L * SR) - int(L * SR * 0.7))])
        e = np.sin(np.linspace(0, np.pi, len(w))) ** 2
        w = lowpass(w, cut) * e
        place(mix, w, w0 - 0.15, pan=-0.4, gain=0.3)
        place(mix, np.roll(w, 900), w0 - 0.15, pan=0.4, gain=0.3)

    # ---- III · the line: each line lands with a low weight ----
    for h in c["hit"][1:]:
        place(mix, kick(110, 45, 0.7), h, gain=0.32)
        place(mix, tone(293.66, 1.6, a=0.004, d=0.6, harm=((1, 1), (2, 0.25), (3, 0.08))), h, gain=0.05)
    for a, b in c["shimmer"]:
        L = b - a
        for f, pan in [(1174.7, -0.5), (1480.0, 0.5), (1760.0, 0.0), (2349.3, -0.2)]:
            s = tone(f, L + 1.2, a=0.25, d=0.9, harm=((1, 1),))
            s *= 0.6 + 0.4 * np.sin(2 * np.pi * 7 * np.arange(len(s)) / SR)
            place(mix, s, a, pan=pan, gain=0.035)

    # ---- IV · worlds: eight beats, a kick, a snap and a note per graha ----
    notes = [146.83, 220.0, 293.66, 246.94, 329.63, 196.0, 261.63, 440.0]
    for i, b in enumerate(c["beat"]):
        place(mix, kick(150, 44, 0.55), b, gain=0.7)
        sn = noise(0.12) * env(int(0.12 * SR), 0.001, 0.04)
        place(mix, sn, b, pan=0.25 * (1 if i % 2 else -1), gain=0.22)
        place(mix, tone(notes[i], 0.6, a=0.004, d=0.22, harm=((1, 1), (2, 0.4), (3, 0.15))), b, pan=-0.3 if i % 2 else 0.3, gain=0.1)
        # off-beat hat
        place(mix, noise(0.03) * env(int(0.03 * SR), 0.0005, 0.01), b + 0.3125, pan=0.5, gain=0.08)
    # the sun: a reversed swell that is cut by the flash at 14.1
    L = 0.55
    sw = noise(L)
    sw = lowpass(sw, np.linspace(500, 9000, len(sw))) * np.linspace(0, 1, len(sw)) ** 3
    place(mix, sw, 14.1 - L, gain=0.4)
    place(mix, tone(587.33, 2.5, a=0.002, d=1.2, harm=((1, 1), (2, 0.3), (4.2, 0.1))), 14.1, gain=0.08)

    # ---- V · recognition: the name assembles in the pentatonic ----
    penta = [293.66, 329.63, 369.99, 440.0, 493.88]
    for i, ch in enumerate(c["chime"]):
        f = penta[i % 5] * (2 ** (i // 5 * 0.5 // 1)) * (1 if i < 15 else 2)
        place(mix, tone(f * 2, 1.4, a=0.002, d=0.55, harm=((1, 1), (2.76, 0.18), (5.4, 0.05))), ch, pan=-0.8 + 1.6 * i / 24, gain=0.1)
    for p in c["ping"]:
        for f in [587.33, 880.0, 1174.66, 1760.0]:
            place(mix, tone(f, 3.0, a=0.002, d=1.3, harm=((1, 1), (2.01, 0.2))), p, gain=0.05)
        place(mix, kick(100, 40, 0.8), p, gain=0.3)

    # ---- VI · weight: rise, disciplines, the slam ----
    for a, b in c["swell"][1:]:
        L = b - a
        s = sum(np.sin(2 * np.pi * f * np.arange(int(L * SR)) / SR) * g for f, g in [(73.42, 1), (110, 0.6), (146.83, 0.4), (220, 0.25), (277.18, 0.12)])
        s *= np.linspace(0, 1, len(s)) ** 2.2
        place(mix, s, a, gain=0.12)
        w = lowpass(noise(L), np.linspace(200, 4500, int(L * SR))) * np.linspace(0, 1, int(L * SR)) ** 3
        place(mix, w, a, gain=0.12)
    for d in c["disc"]:
        place(mix, tone(880, 0.25, a=0.001, d=0.06, harm=((1, 1), (2.4, 0.4))), d, gain=0.05)
        place(mix, noise(0.02) * env(int(0.02 * SR), 0.0005, 0.006), d, gain=0.1)
    for bm in c["boom"]:
        place(mix, tone(62, 4.0, a=0.002, d=1.6, f_end=30, harm=((1, 1), (2, 0.2))), bm, gain=0.9)
        place(mix, noise(0.6) * env(int(0.6 * SR), 0.001, 0.15), bm, gain=0.35)
        for f in [146.83, 220.0, 293.66, 369.99, 440.0]:
            place(mix, tone(f, 5.0, a=0.02, d=2.4, harm=((1, 1), (2, 0.15))), bm, gain=0.06)

    # ---- room: a simple convolution reverb ----
    ir_len = int(2.2 * SR)
    ir = rng.standard_normal((ir_len, 2)) * np.exp(-np.linspace(0, 6.5, ir_len))[:, None]
    ir[: int(0.012 * SR)] = 0
    size = 1 << int(np.ceil(np.log2(n + ir_len)))
    wet = np.zeros_like(mix)
    for ch in range(2):
        y = np.fft.irfft(np.fft.rfft(mix[:, ch], size) * np.fft.rfft(ir[:, ch], size), size)[:n]
        wet[:, ch] = y
    wet *= 0.25 / (np.abs(wet).max() + 1e-9) * np.abs(mix).max()
    out_sig = mix + wet

    # tail to silence for a seamless loop
    fade = np.clip((dur - t) / 0.6, 0, 1)[:, None]
    out_sig *= fade
    out_sig = np.tanh(out_sig * 1.3) / np.tanh(1.3)
    out_sig *= 0.89 / (np.abs(out_sig).max() + 1e-9)

    pcm = (out_sig * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
