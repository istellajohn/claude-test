"""Music analysis (rhythm, structure, accents) for a LOCAL audio file, plus waveform peaks.

Beat tracking is an estimate. Tempo is reported with its half/double alternatives because
octave errors are common; beats and downbeats are marked 'detected', never 'verified'.
Only audio you are entitled to use should be analysed: a licensed file, a file you made, or a
guide track you were given. Spotify is a discovery source, not an audio source.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from engine.utilities.common import Project, TMDError, now_iso, write_json


def _refine_grid(oenv, sr, hop, dur, tempo, beats, lag=0.0):
    """Fit a constant-tempo grid (tempo and phase) to the onset envelope. Used only when the fit is
    clearly better than chance and consistent across the first and second half of the track
    (steady, quantised music). Otherwise the dynamic-programming beats are kept as they are."""
    times = np.arange(len(oenv)) * hop / sr
    base = float(np.mean(oenv)) + 1e-9

    def score(bpm, phase, lo=0.0, hi=dur):
        pts = np.arange(phase + np.ceil((lo - phase) * bpm / 60) * 60 / bpm, hi, 60 / bpm)
        return float(np.mean(np.interp(pts, times, oenv))) if len(pts) else 0.0

    best = (0.0, tempo, 0.0)
    for bpm in np.arange(tempo * 0.93, tempo * 1.07, 0.05):
        p = 60 / bpm
        for ph in np.arange(0, p, 0.01):
            sc = score(bpm, ph)
            if sc > best[0]:
                best = (sc, float(bpm), float(ph))
    sc, bpm, ph = best
    half = dur / 2
    s1, s2 = score(bpm, ph, 0, half), score(bpm, ph, half, dur)
    ratio = sc / base
    ok = ratio >= 2.0 and min(s1, s2) / base >= 1.6
    fit = {"score_vs_mean": round(ratio, 2), "first_half": round(s1 / base, 2), "second_half": round(s2 / base, 2), "bpm": round(bpm, 2), "phase_s": round(ph, 3)}
    if not ok:
        return beats, tempo, "tracked", fit
    fit["lag_compensation_s"] = round(lag, 3)
    return np.arange(max(0.0, ph - lag) % (60 / bpm), dur, 60 / bpm), bpm, "fitted_grid", fit


def analyse(path: Path, out_json: Path | None = None) -> dict:
    try:
        import librosa
    except ImportError as e:  # pragma: no cover
        raise TMDError("librosa is required for music analysis: pip install librosa") from e
    y, sr = librosa.load(str(path), sr=22050, mono=True)
    if y.size < sr:
        raise TMDError(f"Audio too short to analyse: {path}")
    dur = float(y.size / sr)
    hop = 512
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, tightness=100)
    tempo = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop)
    lag = hop / sr  # the onset envelope peaks about one hop after the true transient
    low_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, fmax=200, n_mels=16)
    full = _refine_grid(oenv, sr, hop, dur, tempo, beats, lag)
    low = _refine_grid(low_env, sr, hop, dur, full[1] if full[2] == "fitted_grid" else tempo, beats, lag)
    if low[2] == "fitted_grid" and low[3]["score_vs_mean"] >= 2.5:
        beats, tempo, beat_source, grid_fit = low[0], low[1], "fitted_grid (low band / kick pulse)", low[3]
    else:
        beats, tempo, beat_source, grid_fit = full
    if beat_source.startswith("fitted"):
        per = 60.0 / tempo
        grid_fit["offbeat_alternative"] = [round(float(b + per / 2), 3) for b in beats[:8]]
        grid_fit["offbeat_note"] = "If the detected pulse sounds like the off-beat, shift every beat by half a period (offbeat_alternative)."
    beat_frames = np.round(beats * sr / hop).astype(int)
    onsets = librosa.frames_to_time(librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, backtrack=False), sr=sr, hop_length=hop)
    # downbeat guess: the phase of the 4-beat cycle carrying most onset energy (assumes 4/4; flagged as estimate)
    downbeats = []
    if len(beats) >= 8:
        strengths = np.array([oenv[min(len(oenv) - 1, f)] for f in beat_frames])
        phase = int(np.argmax([strengths[k::4].mean() for k in range(4)]))
        downbeats = [float(b) for b in beats[phase::4]]
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    rdb = 20 * np.log10(rms + 1e-6)
    t_rms = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    # energy per second for charts
    sec = int(np.ceil(dur))
    energy = [float(np.mean(rdb[(t_rms >= i) & (t_rms < i + 1)])) if np.any((t_rms >= i) & (t_rms < i + 1)) else -80.0 for i in range(sec)]
    # structure: agglomerative segmentation on MFCC+chroma, snapped to beats
    sections = []
    try:
        k = int(np.clip(round(dur / 14), 3, 8))
        feat = np.vstack([librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=hop * 4),
                          librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop * 4)])
        feat = (feat - feat.mean(1, keepdims=True)) / (feat.std(1, keepdims=True) + 1e-6)
        bounds = librosa.segment.agglomerative(feat, k)
        bt = librosa.frames_to_time(bounds, sr=sr, hop_length=hop * 4)
        if len(beats):
            bt = np.array([beats[int(np.argmin(np.abs(beats - b)))] for b in bt])
        bt = sorted(set([0.0] + [float(b) for b in bt] + [dur]))
        for a, b in zip(bt[:-1], bt[1:]):
            if b - a < 1.0:
                continue
            m = (t_rms >= a) & (t_rms < b)
            sections.append({"start": round(a, 3), "end": round(b, 3), "mean_db": round(float(rdb[m].mean()), 1) if m.any() else None})
        if sections:
            lv = [s["mean_db"] for s in sections if s["mean_db"] is not None]
            lo, hi = min(lv), max(lv)
            for s in sections:
                s["energy"] = "low" if s["mean_db"] <= lo + (hi - lo) / 3 else ("high" if s["mean_db"] >= hi - (hi - lo) / 3 else "mid")
    except Exception as e:  # segmentation is best-effort
        sections = [{"note": f"segmentation unavailable: {e}"}]
    # accents: biggest upward energy jumps (drops, entries) and silences
    d_db = np.diff(rdb, prepend=rdb[0])
    smooth = np.convolve(rdb, np.ones(20) / 20, mode="same")
    jump = np.convolve(rdb, np.ones(6) / 6, mode="same") - np.roll(smooth, 40)
    accents, last = [], -9.0
    for i in np.argsort(-jump)[:200]:
        t = float(t_rms[i])
        if all(abs(t - a["t"]) > 1.5 for a in accents) and jump[i] > 5:
            accents.append({"t": round(t, 3), "kind": "energy_rise", "db": round(float(jump[i]), 1)})
        if len(accents) >= 12:
            break
    quiet = rdb < -50
    silences, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if t_rms[min(j, len(t_rms) - 1)] - t_rms[i] >= 0.3:
                silences.append({"start": round(float(t_rms[i]), 3), "end": round(float(t_rms[min(j, len(t_rms) - 1)]), 3)})
            i = j
        else:
            i += 1
    # waveform peaks for the dashboard
    n = 1600
    seg = np.array_split(y, n)
    peaks = [[round(float(s.min()), 3), round(float(s.max()), 3)] for s in seg if s.size]
    onset_density = float(len(onsets) / dur)
    res = {
        "file": str(path.name), "analysed": now_iso(), "duration": round(dur, 3),
        "tempo_bpm": round(tempo, 2), "beat_source": beat_source, "grid_fit": grid_fit, "tempo_alternatives": [round(tempo / 2, 1), round(tempo * 2, 1)],
        "tempo_note": "Estimated. Check against the half/double alternatives by ear before cutting to it.",
        "beats": [round(float(b), 3) for b in beats], "downbeats_estimated": [round(d, 3) for d in downbeats],
        "onsets": [round(float(o), 3) for o in onsets], "onset_density_per_s": round(onset_density, 2),
        "sections": sections, "accent_candidates": accents, "silences": silences,
        "energy_db_per_second": [round(e, 1) for e in energy], "waveform": peaks,
        "confidence": "detected (not verified)",
    }
    if out_json:
        write_json(out_json, res)
    return res


def analyse_project(project: Project, files: list[str] | None = None) -> list[str]:
    audio_dir = project.music / "audio"
    cands = [project.dir / f for f in files] if files else sorted(p for p in audio_dir.glob("*") if p.is_file() and not p.name.startswith("."))
    if not cands:
        raise TMDError("No music files to analyse. Put a licensed file or guide track in 03_music_references/audio/. "
                       "Spotify links are references only; the engine never downloads from Spotify.")
    outs = []
    for p in cands:
        o = project.music / "analysis" / f"{p.stem}.analysis.json"
        analyse(p, o)
        outs.append(str(o.relative_to(project.dir)))
    return outs
