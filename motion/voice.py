"""Voice-over for "Entry One", synthesised locally with Kokoro (open weights, Apache 2.0).

    pip install kokoro-onnx soundfile
    # model files: github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
    python3 motion/voice.py path/to/kokoro-v1.0.onnx path/to/voices-v1.0.bin motion/vo

The narrator is an observing intelligence: voice bf_emma (British, the steadiest pitch of the
candidates, about 184 Hz ±28), slightly slowed. Each line is written to its own file so the film
can cut to it. Every line was checked by transcribing it back with Whisper (sherpa-onnx);
"valence" is only reliably heard in the sentence "They call it valence.", so it is said that way.
"""
import json
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    ("vo1", "Observation log, entry one.", 0.86),
    ("vo2", "You decided whether to keep watching this in less than a second.", 0.9),
    ("vo3", "Your kind does it to faces, to names, to everything you will ever be asked to trust.", 0.92),
    ("vo4", "Then you spend years proving that first second was right.", 0.88),
    ("vo5", "Your psychologists have a word for the pull that arrives before the reason. They call it valence.", 0.9),
    ("vo6", "We cannot compute it.", 0.86),
    ("vo7", "We have tried.", 0.84),
    ("vo8", "Some humans can.", 0.82),
]


def main(model, voices, out):
    k = Kokoro(model, voices)
    meta = {}
    for name, text, speed in LINES:
        s, sr = k.create(text, voice="bf_emma", speed=speed, lang="en-gb")
        e = np.abs(s) > 0.01
        i0 = max(0, np.argmax(e) - int(0.03 * sr))
        i1 = min(len(s), len(s) - np.argmax(e[::-1]) + int(0.08 * sr))
        s = s[i0:i1]
        sf.write(f"{out}/{name}.wav", s, sr)
        meta[name] = {"text": text, "dur": round(len(s) / sr, 3)}
    json.dump(meta, open(f"{out}/vo.json", "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:4])
