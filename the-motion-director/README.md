# THE MOTION DIRECTOR

A code-driven editing, sound and motion studio. It takes real footage, photographs and recordings, analyses them, helps assemble and refine an edit, and renders finished, quality-checked videos, with a local dashboard for review. Default target: Instagram Reels (1080×1920, 30 fps, H.264 / AAC 48 kHz, SDR Rec.709).

It does not invent footage. With nothing in `01_original_footage/`, there is nothing to edit, and the studio says so.

## Start

```bash
pip install -r requirements.txt          # Python 3.11+, FFmpeg on PATH
(cd engine/motion && npm install)        # Remotion (motion graphics)
./tmd doctor                             # what is installed, what is missing
./tmd selftest                           # end-to-end proof on synthetic fixtures (~2 min)
./tmd serve                              # dashboard at http://127.0.0.1:8765
./tmd new my-film --documentary          # a new, independent project folder
```

## The pipeline

| Stage | Command | What actually happens |
| --- | --- | --- |
| Ingest | `./tmd ingest <project>` | ffprobe facts; PySceneDetect shots; per-frame sharpness, exposure, optical-flow camera and subject motion, shake, flicker, faces (OpenCV); audio loudness, clipping, silence, transient events; 540p proxies; scored, tagged, searchable shot log with source timecodes |
| Transcribe | `./tmd transcribe <project>` | faster-whisper, word-level timing. Machine transcript: verify against the audio |
| Music analysis | `./tmd music <project>` | librosa tempo (with half/double alternatives), fitted beat grid, estimated downbeats, sections, accents, silences, waveform |
| Rough cut | `./tmd rough-cut <project>` | three **draft** timelines from the inventory and beat grid. A starting point to react to, never the finished edit |
| Refine | dashboard Storyboard / Timeline JSON | clip in/out, speed, zoom/pan, focus, grade, J/L sound bridges, overlays, audio layers |
| Render | `./tmd render <project> <timeline>` | frame-exact cached segments → concat → separate audio mix (ducking, two-pass loudness) → Remotion overlays → libass captions → H.264/AAC |
| Export + QC | `./tmd export <project> <timeline> [--all]` | variants and aspect ratios, QC report, poster frame, contact sheet, EDL, source map, SRT, music notes |

Timeline format, transition vocabulary and caption styles are documented in `engine/rendering/timeline.py`, `design-system/transitions/transitions.json` and `design-system/components/caption-styles.json`.

## Rules the engine enforces

- **Music.** Spotify is for discovery, never an audio source: nothing is downloaded or ripped from it. Soundtrack records start `NOT VERIFIED`. A track is embedded in an export only when it is marked `LICENSED_EMBEDDABLE` with a licence file on record. Guide tracks play in previews only; finals get a `MUSIC_NOTES.md` with timings for adding the track through Instagram's own library. See `documentation/LICENSING-AND-MUSIC.md`.
- **Documentary integrity.** In documentary mode, speed changes and freezes on factual footage need an integrity note, optical-flow interpolation is refused, every export carries an EDL and a source map of source timecodes, and originals are never written to. See `documentation/DOCUMENTARY-INTEGRITY.md`.
- **Quality control.** A finished render is checked for spec, frame count, black frames, frozen picture, loudness, true peak, clipping, accidental silence, caption safe area and heavy crops. QC states plainly what it cannot judge.

## Layout

```
engine/            Python engine (video, audio, rendering, subtitles, colour, analysis, utilities) + motion/ (Remotion)
design-system/     vendored OFL fonts, palette, caption styles, transition vocabulary
dashboard/         local review studio (stdlib server + dependency-free front end)
projects/<name>/   one independent folder per production (00_brief … 16_licences, project.json)
documentation/     architecture, workflow, licensing, integrity, storage, known limits
```

Read `documentation/KNOWN-LIMITS.md` before trusting any heuristic.
