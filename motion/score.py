"""Sound for "Entry One": the score, the treated voice-over and the mix, built from the film's cues.

    node motion/render.mjs cues 9x16 /tmp/cues.json
    python3 motion/score.py /tmp/cues.json motion/vo /tmp/mix.wav
    ffmpeg -i /tmp/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 motion/mix.wav

The sound follows the film's argument. Everything the machine owns is cold: a low D drone, space
wind, telemetry ticks, a narrator with a faint metallic edge. At 26.05s all of it stops, reverb
tails included. What answers is warm: a D major chord with an added ninth, a slow swell, gold.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(11)


def read_wav(path):
    w = wave.open(path)
    x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
    if w.getnchannels() == 2:
        x = x.reshape(-1, 2).mean(1)
    assert w.getframerate() == SR, f"{path} must be {SR} Hz"
    return x


def env(n, a, d):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if n > na:
        e[na:] = np.exp(-np.linspace(0, 1, n - na) * (n / SR) / max(d, 1e-3) * 4)
    return e


def onepole(x, cut):
    cut = np.broadcast_to(np.asarray(cut, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def lowpass_fft(x, cut):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cut) ** 4)
    return np.fft.irfft(X, len(x))


def highpass_fft(x, cut):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (f / cut) ** 2 / (1 + (f / cut) ** 2)
    return np.fft.irfft(X, len(x))


def tone(f, dur, a=0.005, d=0.5, harm=((1, 1.0),), f_end=None, vib=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if f_end is not None:
        k = np.log(f_end / f) / dur
        ph = 2 * np.pi * f * (np.exp(k * t) - 1) / k
    else:
        ph = 2 * np.pi * f * t + (vib * np.sin(2 * np.pi * 5.2 * t) if vib else 0)
    return sum(g * np.sin(ph * h) for h, g in harm) * env(n, a, d)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.music = np.zeros((self.n, 2))
        self.voice = np.zeros((self.n, 2))
        self.t = np.arange(self.n) / SR

    def add(self, sig, at, pan=0.0, gain=1.0, bus="music"):
        b = self.music if bus == "music" else self.voice
        i = int(at * SR)
        if i >= self.n or i + len(sig) <= 0:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: self.n - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        b[i : i + len(sig), 0] += sig * l
        b[i : i + len(sig), 1] += sig * r


def reverb(x, seconds, decay, seed):
    r = np.random.default_rng(seed)
    n = len(x)
    ir_len = int(seconds * SR)
    ir = r.standard_normal((ir_len, 2)) * np.exp(-np.linspace(0, decay, ir_len))[:, None]
    ir[: int(0.015 * SR)] = 0
    size = 1 << int(np.ceil(np.log2(n + ir_len)))
    out = np.zeros((n, 2))
    for c in range(2):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], size) * np.fft.rfft(ir[:, c], size), size)[:n]
    peak = np.abs(out).max() + 1e-9
    return out / peak * (np.abs(x).max() + 1e-9)


def main(cues_path, vo_dir, out):
    meta = json.load(open(cues_path))
    c = meta["cues"]
    dur = c["dur"]
    M = Mix(dur)
    t = M.t

    def curve(points):
        xs, ys = zip(*points)
        return np.interp(t, xs, ys)

    cut = c["silence"][0][0]

    # ---- the machine's world: drone and space wind ----
    cold = curve([(0, 0), (0.4, 0.08), (3.5, 0.1), (6.7, 0.12), (12.2, 0.14), (16.0, 0.2), (16.3, 0.1), (20.9, 0.16), (22.1, 0.12), (cut - 0.1, 0.22), (cut, 0.22), (cut + 0.001, 0), (dur, 0)])
    drift = 0.003 * np.sin(2 * np.pi * 0.05 * t)
    drone = (np.sin(2 * np.pi * 36.71 * t) + 0.7 * np.sin(2 * np.pi * 55.0 * (1 + drift) * t) + 0.35 * np.sin(2 * np.pi * 73.42 * (1 - drift) * t)
             + 0.12 * np.sin(2 * np.pi * 87.31 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * t)))
    wind = lowpass_fft(rng.standard_normal(M.n), 380) * 6 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t + 1))
    M.music[:, 0] += (drone * 0.8 + wind) * cold
    M.music[:, 1] += (np.roll(drone, 300) * 0.8 + np.roll(wind, 4000)) * cold

    # ---- 1 · the eye: a slow pulse under the observation ----
    for k in np.arange(0.5, 6.2, 1.15):
        M.add(tone(58, 0.35, a=0.002, d=0.12, f_end=42), k, gain=0.35)
        M.add(tone(55, 0.3, a=0.002, d=0.1, f_end=40), k + 0.24, gain=0.22)
    for k in c["lock"]:
        M.add(tone(1760, 0.07, a=0.001, d=0.03), k, pan=0.2, gain=0.12)
    for k in c["decided"]:
        M.add(tone(70, 1.8, a=0.002, d=0.7, f_end=32, harm=((1, 1), (2, 0.15))), k, gain=0.8)
        M.add(lowpass_fft(noise(0.5), 3000) * env(int(0.5 * SR), 0.001, 0.12), k, gain=0.6)
    for k in c["blink"]:
        w = onepole(noise(0.3), np.linspace(4000, 300, int(0.3 * SR))) * np.sin(np.linspace(0, np.pi, int(0.3 * SR)))
        M.add(w, k, gain=0.35)
        M.add(tone(48, 0.5, a=0.001, d=0.2, f_end=36), k + 0.25, gain=0.5)

    # ---- 2 · verdicts: a whip on every cut, a tick on every verdict ----
    for i, k in enumerate(c["cuts"]):
        L = 0.16
        w = onepole(noise(L), np.linspace(800, 7000, int(L * SR))) * np.linspace(0, 1, int(L * SR)) ** 2
        M.add(w, k - L, pan=(-0.5 if i % 2 else 0.5), gain=0.4)
        M.add(tone(90, 0.25, a=0.001, d=0.08, f_end=45), k, gain=0.45)
    for i, k in enumerate(c["tags"]):
        f = [2349, 2637, 2093, 3136, 2794][i % 5]
        M.add(tone(f, 0.05, a=0.001, d=0.02, harm=((1, 1), (2, 0.2))), k, pan=rng.uniform(-0.6, 0.6), gain=0.09)
        M.add(tone(f * 1.5, 0.04, a=0.001, d=0.015), k + 0.045, pan=rng.uniform(-0.6, 0.6), gain=0.05)

    # ---- 3 · years: a riser that tears through to the stars ----
    for a, b in c["riser"]:
        L = b - a
        n = int(L * SR)
        ramp = np.linspace(0, 1, n)
        w = onepole(noise(L), 300 + 9000 * ramp ** 2) * ramp ** 2.5
        M.add(w, a, gain=0.5)
        for f0, pan in [(110, -0.4), (165, 0.4), (220, 0)]:
            M.add(tone(f0, L, a=0.5, d=99, f_end=f0 * 4) * ramp ** 2, a, pan=pan, gain=0.07)
    for k in c["warp"]:
        M.add(tone(64, 3.5, a=0.002, d=1.5, f_end=28, harm=((1, 1), (2, 0.25))), k, gain=0.9)
        M.add(lowpass_fft(noise(1.2), 2500) * env(int(1.2 * SR), 0.001, 0.4), k, gain=0.5)

    # ---- 4 · the pull: a cold cluster, grains like dust falling inward ----
    pull0, pull1 = c["warp"][0] + 0.2, c["compute"][0][0]
    for f, g in [(73.42, 1), (87.31, 0.7), (110.0, 0.6), (130.81, 0.45), (164.81, 0.35)]:
        L = pull1 - pull0 + 0.6
        s = tone(f, L, a=1.8, d=99, harm=((1, 1), (2, 0.2)), vib=0.0015) * np.minimum(1, np.linspace(1.6, 0, int(L * SR)) * 3)
        M.add(s, pull0, pan=rng.uniform(-0.5, 0.5), gain=0.06 * g)
    for k in range(160):
        at = pull0 + 0.3 + rng.uniform(0, pull1 - pull0 - 0.3)
        f = rng.choice([1174.7, 1396.9, 1760.0, 2093.0, 2637.0, 3136.0])
        M.add(tone(f, 0.25, a=0.002, d=0.08), at, pan=rng.uniform(-0.9, 0.9), gain=0.025)
    for k in c["valence"]:
        M.add(tone(55, 4.0, a=0.002, d=1.8, f_end=30, harm=((1, 1), (2, 0.2))), k, gain=0.9)
        for f in [146.83, 220.0, 293.66, 349.23, 440.0]:
            M.add(tone(f, 3.0, a=0.15, d=1.4, harm=((1, 1), (2, 0.12)), vib=0.003), k, pan=rng.uniform(-0.6, 0.6), gain=0.05)

    # ---- 5 · compute: telemetry accelerating, then the glitch ----
    a, b = c["compute"][0]
    k = a + 0.2
    while k < b - 0.05:
        rate = 0.11 - 0.085 * (k - a) / (b - a)
        M.add(tone(rng.choice([1567.98, 2093.0, 2637.0, 3520.0, 4186.0]), 0.03, a=0.001, d=0.012), k, pan=rng.uniform(-0.9, 0.9), gain=0.06)
        k += rate * rng.uniform(0.6, 1.4)
    for i, k in enumerate(np.arange(a + 0.3, b, 0.1875)):
        M.add(tone(55 if i % 4 else 73.42, 0.16, a=0.002, d=0.05, harm=((1, 1), (3, 0.3))), k, gain=0.18 + 0.2 * (k - a) / (b - a))
    ga, gb = c["glitch"][0]
    for k in np.arange(ga, gb, 0.045):
        if rng.random() < 0.65:
            L = rng.uniform(0.01, 0.04)
            s = np.round(noise(L) * 3) / 3 * env(int(L * SR), 0.001, L)
            M.add(s, k, pan=rng.uniform(-1, 1), gain=0.25)

    # ---- 6 · human: silence, then warmth ----
    for k in c["dawn"]:
        chord = [146.83, 185.0, 220.0, 293.66, 329.63]
        for i, f in enumerate(chord):
            M.add(tone(f, 7.0, a=1.6, d=4.5, harm=((1, 1), (2, 0.18), (3, 0.05)), vib=0.002), k + i * 0.08, pan=-0.5 + i * 0.25, gain=0.07)
        for i, f in enumerate([587.33, 739.99, 880.0, 1174.66]):
            M.add(tone(f, 3.0, a=0.003, d=1.4, harm=((1, 1), (2, 0.25), (3, 0.08))), k + 0.45 + i * 0.32, pan=-0.3 + i * 0.2, gain=0.045)
    for k in c["slam"]:
        M.add(tone(58, 4.5, a=0.002, d=2.0, f_end=30, harm=((1, 1), (2, 0.25))), k, gain=1.0)
        M.add(lowpass_fft(noise(0.8), 5000) * env(int(0.8 * SR), 0.001, 0.2), k, gain=0.45)
        for f in [73.42, 110.0, 146.83, 185.0, 220.0]:
            s = tone(f, 5.0, a=0.02, d=2.6, harm=((1, 1), (2, 0.5), (3, 0.33), (4, 0.25), (5, 0.2)))
            M.add(lowpass_fft(s, 1200), k, pan=rng.uniform(-0.4, 0.4), gain=0.06)
        for f in [2349.3, 2959.96, 3520.0]:
            M.add(tone(f, 2.5, a=0.01, d=1.1), k + 0.05, pan=rng.uniform(-0.7, 0.7), gain=0.03)
    for k in c["tagline"]:
        M.add(tone(1174.66, 2.4, a=0.003, d=1.2, harm=((1, 1), (2.76, 0.12))), k, gain=0.05)

    # ---- the narrator ----
    meta_vo = json.load(open(f"{vo_dir}/vo.json"))
    duck = np.zeros(M.n)
    for vid, at in c["vo"]:
        x = read_wav(f"{vo_dir}/{vid}.wav")
        x = highpass_fft(x, 110)
        human = vid == "vo8"
        ring = x * np.sin(2 * np.pi * 43 * np.arange(len(x)) / SR)
        comb = np.concatenate([np.zeros(int(0.009 * SR)), x])[: len(x)]
        y = x + (0.08 if human else 0.14) * ring + 0.22 * comb
        y = np.tanh(y * 1.6) / np.tanh(1.6)
        M.add(y, at, pan=0, gain=0.9, bus="voice")
        i0, i1 = int(at * SR), min(M.n, int((at + meta_vo[vid]["dur"]) * SR))
        duck[i0:i1] = 1
    k = np.ones(int(0.25 * SR)) / int(0.25 * SR)
    duck = np.convolve(duck, k, mode="same")

    music = M.music * (1 - 0.45 * duck)[:, None]
    music = music + 0.35 * reverb(music, 2.6, 5.0, 3)
    voice = M.voice + 0.28 * reverb(M.voice, 3.2, 4.2, 4)
    mix = music * 0.9 + voice * 1.15

    # the cut: nothing survives it, not even the reverb
    silence = np.ones(M.n)
    s0, s1 = c["silence"][0]
    silence[int(s0 * SR) : int(s1 * SR)] = 0
    ramp = int(0.004 * SR)
    silence[int(s0 * SR) - ramp : int(s0 * SR)] = np.linspace(1, 0, ramp)
    mix *= silence[:, None]
    # the breath: a reversed swell through the silence, pulling into the human line
    for a, b in c.get("breath", []):
        L = b - a
        n = int(L * SR)
        sw = np.zeros((n, 2))
        for i, f in enumerate([146.83, 220.0, 293.66, 369.99, 440.0, 587.33]):
            tt = np.arange(n) / SR
            sw[:, i % 2] += np.sin(2 * np.pi * f * tt + i) * (0.6 if i < 3 else 0.35)
        air = lowpass_fft(rng.standard_normal(n), 2500) * 4
        sw[:, 0] += air; sw[:, 1] += np.roll(air, 900)
        sw *= (np.linspace(0, 1, n) ** 3)[:, None]
        i0 = int(a * SR)
        mix[i0:i0 + n] += sw[: M.n - i0] * 0.05
    # tail to nothing for the loop
    mix *= np.clip((dur - 0.5 - t) / 1.2, 0, 1)[:, None]
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix *= 0.9 / (np.abs(mix).max() + 1e-9)
    pcm = (mix * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("wrote", out)


if __name__ == "__main__":
    main(*sys.argv[1:4])
