"""Original generated score. The engine writes the audio itself, so there is nothing to license: it is ours
to embed in an export. Style: grunge / industrial. Built from a distorted kick, noise snare and hats, a
sub drone, risers and impact hits, with a deliberate silence before the drop. The beat grid is exact (constructed,
not detected), and the analysis file is written in the same shape the dashboard already reads.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

from engine.utilities.common import Project, now_iso, write_json

SR = 48000


def _env(n, decay):
    return np.exp(-np.arange(n) / SR * decay)


def _kick(dur=0.45):
    n = int(SR * dur); t = np.arange(n) / SR
    f = 42 + 140 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(2.4 * np.sin(ph) * _env(n, 7.5))


def _noise_band(n, lo, hi, rng):
    b, a = signal.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, rng.standard_normal(n))


def _snare(rng, dur=0.32):
    n = int(SR * dur)
    body = np.sin(2 * np.pi * 185 * np.arange(n) / SR) * _env(n, 24)
    nz = _noise_band(n, 1200, 9000, rng) * _env(n, 13)
    return np.tanh(1.8 * (0.5 * body + 0.9 * nz / (np.abs(nz).max() + 1e-9)))


def _hat(rng, dur=0.09):
    n = int(SR * dur)
    nz = _noise_band(n, 6500, 16000, rng) * _env(n, 55)
    return nz / (np.abs(nz).max() + 1e-9)


def _riser(seconds, rng):
    n = int(SR * seconds); t = np.linspace(0, 1, n)
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    for k in range(24):  # swept band-pass slices make a rising noise
        lo = 300 * (1 + 14 * ((k / 24) ** 2))
        out += _noise_band(n, lo, lo * 1.6, rng) * (t ** 2.2) * (1 / 6)
    return np.tanh(1.2 * out) * (t ** 1.4)


def _impact(rng, dur=2.2):
    n = int(SR * dur); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (34 + 60 * np.exp(-t * 9)) * t) * _env(n, 1.6)
    crash = _noise_band(n, 200, 7000, rng) * _env(n, 2.4) * 0.25
    return np.tanh(2.0 * (boom + crash))


def _reverb(x, rng, seconds=0.7, wet=0.18):
    n = int(SR * seconds)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.0)
    ir = signal.lfilter(*signal.butter(2, 4500 / (SR / 2)), ir)
    wetx = signal.fftconvolve(x, ir)[: len(x)]
    return x * (1 - wet) + wetx / (np.abs(wetx).max() + 1e-9) * np.abs(x).max() * wet * 2


def make_score(project: Project, bpm: float = 132.0, seconds: float = 30.0, name: str | None = None, seed: int = 7) -> dict:
    rng = np.random.default_rng(seed)
    beat = 60.0 / bpm
    bars = max(8, int(round(seconds / (beat * 4))))
    total = bars * beat * 4
    N = int(SR * total)
    L = np.zeros(N); R = np.zeros(N)
    kick, snare = _kick(), _snare(rng)
    hats = [_hat(rng) for _ in range(3)]

    def put(buf, x, t, g=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N:
            return
        x = x[: N - i] * g
        L[i:i + len(x)] += x * (1 - max(0, pan)); R[i:i + len(x)] += x * (1 + min(0, pan))

    # structure in bars: intro (drone + sparse hits), build (kick on every beat + riser), silence, drop, break, drop, final hit
    intro = 2; build = 3; drop1_end = bars - 4; brk = drop1_end + 1
    sections = [("intro", 0, intro), ("build", intro, intro + build), ("drop", intro + build, drop1_end), ("break", drop1_end, brk), ("drop", brk, bars - 1), ("outro", bars - 1, bars)]
    # sub drone, always present, breathing
    t = np.arange(N) / SR
    drone = (signal.sawtooth(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 27.5 * t)) * (0.55 + 0.35 * np.sin(2 * np.pi * t / (beat * 8)))
    drone = signal.lfilter(*signal.butter(2, 220 / (SR / 2)), drone) * 0.35
    L += drone; R += drone
    accents = []
    beats = [round(i * beat, 4) for i in range(int(total / beat))]
    for name_s, b0, b1 in sections:
        for bar in range(b0, b1):
            t0 = bar * beat * 4
            for q in range(4):
                tb = t0 + q * beat
                if name_s == "intro":
                    if q == 0 and bar % 2 == 1:
                        put(L, kick, tb, 0.5)
                    if q == 2:
                        put(L, hats[0], tb, 0.25)
                elif name_s == "build":
                    put(L, kick, tb, 0.8)
                    if q in (1, 3) and bar >= intro + 1:
                        put(L, snare, tb, 0.55)
                    for e in range(2):
                        put(L, hats[e % 3], tb + e * beat / 2, 0.2 + 0.1 * e, pan=0.3 * (-1) ** e)
                elif name_s in ("drop", "outro"):
                    put(L, kick, tb, 1.0)
                    if q in (1, 3):
                        put(L, snare, tb, 0.8)
                    for e in range(4):
                        put(L, hats[(q + e) % 3], tb + e * beat / 4, (0.35 if e % 2 == 0 else 0.18), pan=0.35 * (-1) ** (q + e))
                    if q == 3:
                        put(L, kick, tb + beat * 0.75, 0.6)  # syncopated pickup
                elif name_s == "break":
                    if q == 0:
                        put(L, kick, tb, 0.5)
                    if q == 3:
                        put(L, snare, tb + beat * 0.5, 0.5)
            if name_s == "outro" and bar == bars - 1:
                pass
    # risers and impacts: the silence is the cue
    rise_len = beat * 4 * 1
    drop_t = (intro + build) * beat * 4
    riser = _riser(rise_len * 1.0, rng)
    put(L, riser, drop_t - rise_len, 0.55)
    # the last half-beat before the drop is cut to silence so the impact lands hard
    gap0, gap1 = drop_t - beat * 0.5, drop_t
    for buf in (L, R):
        pass
    mute = np.ones(N)
    mute[int(gap0 * SR):int(gap1 * SR)] = np.linspace(1, 0, int((gap1 - gap0) * SR)) ** 4
    imp = _impact(rng)
    put(L, imp, drop_t, 0.9); put(L, imp, brk * beat * 4, 0.7); put(L, imp, (bars - 1) * beat * 4, 1.0)
    accents += [{"t": round(drop_t, 3), "kind": "impact (drop)", "db": 12.0}, {"t": round(brk * beat * 4, 3), "kind": "impact (second drop)", "db": 9.0}, {"t": round((bars - 1) * beat * 4, 3), "kind": "impact (final)", "db": 12.0}]
    mono = (L + R) / 2
    # stereo: L buffer holds centre material; R copy with slight haas widening of hats via small delay
    st_l = L * mute; st_r = np.roll(L, int(0.0009 * SR)) * mute
    st_l = _reverb(st_l, rng); st_r = _reverb(st_r, rng, 0.8)
    out = np.stack([st_l, st_r], axis=1)
    out = np.tanh(1.3 * out)  # glue / grit
    out *= 10 ** (-3 / 20) / (np.abs(out).max() + 1e-9)
    out[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
    fn = name or f"score_grunge_{int(round(bpm))}bpm_{int(round(total))}s"
    dst = project.music / "audio" / f"{fn}.wav"
    dst.parent.mkdir(parents=True, exist_ok=True)
    sf.write(dst, out.astype(np.float32), SR, subtype="PCM_24")
    # analysis in the dashboard's shape
    n_peaks = 1600
    peaks = [[round(float(s.min()), 3), round(float(s.max()), 3)] for s in np.array_split(out.mean(axis=1), n_peaks)]
    rms = 20 * np.log10(np.sqrt(np.mean(out.mean(axis=1)[: int(total) * SR].reshape(-1, SR) ** 2, axis=1)) + 1e-6)
    secs = []
    for nm, b0, b1 in sections:
        secs.append({"start": round(b0 * beat * 4, 3), "end": round(b1 * beat * 4, 3), "label": nm, "energy": {"intro": "low", "build": "mid", "drop": "high", "break": "low", "outro": "high"}[nm]})
    ana = {"file": dst.name, "analysed": now_iso(), "duration": round(total, 3), "tempo_bpm": bpm, "tempo_alternatives": [bpm / 2, bpm * 2], "tempo_note": "Constructed by the engine: tempo and beats are exact, not detected.",
           "beat_source": "constructed (exact)", "grid_fit": {}, "beats": beats, "downbeats_estimated": [round(i * beat * 4, 4) for i in range(bars)], "onsets": beats,
           "onset_density_per_s": round(len(beats) / total, 2), "sections": secs, "accent_candidates": accents, "silences": [{"start": round(gap0, 3), "end": round(gap1, 3)}],
           "energy_db_per_second": [round(float(x), 1) for x in rms], "waveform": peaks, "confidence": "exact (generated)",
           "origin": "Original score generated by THE MOTION DIRECTOR (engine/audio/synth.py). No third-party recording or sample is used."}
    write_json(project.music / "analysis" / f"{fn}.analysis.json", ana)
    return {"file": f"03_music_references/audio/{dst.name}", "analysis": f"03_music_references/analysis/{fn}.analysis.json", "duration": total, "bpm": bpm, "bars": bars, "drop_at": drop_t, "sections": secs}
