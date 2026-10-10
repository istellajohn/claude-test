"""Optional speech transcription with faster-whisper (downloads a model on first use)."""
from __future__ import annotations

from pathlib import Path

from engine.utilities.common import Project, TMDError, log, now_iso, write_json, VIDEO_EXT, AUDIO_EXT, progress


def _srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{(ms // 60000) % 60:02d}:{(ms // 1000) % 60:02d},{ms % 1000:03d}"


def transcribe_file(path: Path, model_size: str = "small", language: str | None = None) -> dict:
    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        raise TMDError("faster-whisper is not installed: pip install faster-whisper") from e
    try:
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
    except Exception as e:
        raise TMDError(f"Could not load Whisper model '{model_size}' (first use downloads it; check network): {e}") from e
    # decode with ffmpeg ourselves: faster-whisper's own decoder (PyAV) breaks across PyAV versions
    from engine.analysis.media_audio import decode_mono
    audio = decode_mono(path, 16000)
    if audio.size < 1600:
        return {"file": path.name, "model": model_size, "language": None, "generated": now_iso(), "segments": [], "note": "no decodable audio"}
    segs, info = model.transcribe(audio, language=language, word_timestamps=True, vad_filter=True)
    out = []
    for s in segs:
        out.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(),
                    "avg_logprob": round(s.avg_logprob, 3), "no_speech_prob": round(s.no_speech_prob, 3),
                    "words": [{"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)} for w in (s.words or [])]})
    return {"file": path.name, "model": model_size, "language": info.language, "language_probability": round(info.language_probability, 3),
            "generated": now_iso(), "note": "Machine transcript. Verify every line against the audio before captioning; low avg_logprob means low confidence. Never alter meaning.",
            "segments": out}


def transcribe_project(project: Project, model_size: str = "small", language: str | None = None) -> list[str]:
    files = project.files("01_original_footage", VIDEO_EXT) + project.files("02_audio", AUDIO_EXT)
    if not files:
        raise TMDError("Nothing to transcribe: no footage or audio in the project.")
    outs = []
    for i, f in enumerate(files):
        progress(i / len(files), f"transcribing {f.name}")
        log(f"[transcribe] {f.name}")
        res = transcribe_file(f, model_size, language)
        project.transcripts.mkdir(exist_ok=True)
        write_json(project.transcripts / f"{f.stem}.json", res)
        srt = []
        for n, s in enumerate(res["segments"], 1):
            srt.append(f"{n}\n{_srt_time(s['start'])} --> {_srt_time(s['end'])}\n{s['text']}\n")
        (project.transcripts / f"{f.stem}.srt").write_text("\n".join(srt), encoding="utf-8")
        outs.append(f.stem)
    return outs
