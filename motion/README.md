# VALENCE · Entry One

A 35-second introduction film for social, narrated by an observing intelligence. It studies how humans judge in a fraction of a second, admits it cannot compute the feeling that decides, and hands the frame to a human hand: the Valence signature, then VLNC.

| File | What it is |
| --- | --- |
| `out/valence-entry-one-9x16.mp4` | 1080×1920, 30fps, motion-blurred, with voice and score. Reels, Shorts, Stories, TikTok. |
| `out/valence-entry-one-4x5.mp4` | 1080×1350, the same film for the Instagram and LinkedIn feed. |
| `index.html` | The film played live from source, with sound. Serve the repository root (`npx serve .`) and open `/motion/`. Space plays and pauses; F switches format. |
| `film.js` | The film. Every frame is a pure function of time (`seek(t)`). |
| `render.mjs` | Renderer: headless Chromium into ffmpeg. Six sub-frames per frame across a 180° shutter, averaged, for real motion blur; four browsers in parallel. |
| `voice.py`, `vo/` | The narrator: eight lines synthesised with Kokoro (open weights), voice `bf_emma`, each verified by transcribing it back with Whisper. Files in `vo/` are resampled to 48 kHz. |
| `score.py`, `mix.wav` | Score, voice treatment and mix, built from the film's cue list; normalised to -14 LUFS, -1.5 dBTP. |
| `assets/`, `fonts/` | Trimmed official marks; latin subsets of the site faces (SIL OFL). Photography comes from `../assets/img/`. |

## Script

Voice (on screen as a word-by-word transcript, so the film works with the sound off):

1. *Observation log, entry one.* The eye from the site, whole, then pushed in to the pupil; a reticle locks on.
2. *You decided whether to keep watching this in less than a second.* **YOU'VE ALREADY DECIDED.**
3. *Your kind does it to faces, to names, to everything you will ever be asked to trust.* Fourteen of the site's photographs, each judged in a fraction of a second: SEEN IT, TRUST, LATER, EXPENSIVE, WHO IS THIS?, TRYING TOO HARD, YES, SKIP, INTERESTING, TOO SAFE, OVERDONE, MAYBE, CHEAP, NOT FOR ME. The cuts accelerate.
4. *Then you spend years proving that first second was right.* NOT FOR ME repeats into a tunnel of years, 2026 to 2043, that the camera tears through.
5. *Your psychologists have a word for the pull that arrives before the reason. They call it valence.* Particles are pulled into orbit around a dark body; **VALENCE**, with its definition: the pull toward, or push away from, something, felt before a reason arrives.
6. *We cannot compute it. We have tried.* A model tries: data, a confidence readout falling to 0.00, a glitch, then half a second of silence that breathes in.
7. *Some humans can.* The only line in a human typeface. Dawn, the gold signature writes itself, VLNC lands. *For work that deserves a better first second.* buzz@vlnc.in.

## Why it works

- **It catches the viewer in the act.** The first line describes what the viewer is doing at that moment, which is the strongest available pattern interrupt on a feed and invites a reply ("I didn't decide"). Research on first impressions supports the premise: people form trait judgements of a face after a 100 ms exposure (Willis and Todorov, *Psychological Science*, 2006).
- **The stakes are confirmation, not attention.** The turn is not that people judge quickly, which everyone knows, but that they then spend years defending the judgement. That is the problem a branding practice exists to solve.
- **The name is earned, not announced.** Valence is a real term in psychology for the attractiveness or aversiveness of something; the film arrives at it as the answer to a question, so the brand name lands as an insight.
- **The machine/human turn positions the practice.** In a feed full of generated content, a cold intelligence admitting it cannot compute the feeling, and a human signature answering, makes the case for human judgement without saying "human" in a slogan. It also enacts the identity deck's own pairing: VLNC for recall, the signature for authorship.

## Rebuilding

```sh
python3 motion/voice.py kokoro-v1.0.onnx voices-v1.0.bin /tmp/vo   # then resample to 48 kHz into motion/vo
node motion/render.mjs cues 9x16 /tmp/cues.json
python3 motion/score.py /tmp/cues.json motion/vo /tmp/mix.wav      # needs numpy
ffmpeg -i /tmp/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 motion/mix.wav
node motion/render.mjs check 9x16
SUB=6 WORKERS=4 node motion/render.mjs video 9x16 motion/out/valence-entry-one-9x16.mp4 motion/mix.wav
SUB=6 WORKERS=4 node motion/render.mjs video 4x5  motion/out/valence-entry-one-4x5.mp4  motion/mix.wav
```

A render takes about seven minutes per format on four cores. `SUB=1` renders without motion blur, six times faster.

## Before posting

- The voice is a synthetic placeholder of good quality. A human actor, or a licensed voice treated the same way, will lift it further; keep the line timings in `film.js` (`VO`) and re-run `score.py`.
- The call to action points to buzz@vlnc.in. Add the handle or URL the post should drive to if it differs.
