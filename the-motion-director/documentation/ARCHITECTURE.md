# Architecture

**Picture and sound are built separately.** Picture: each clip is rendered to its own intermediate with an exact frame count (`engine/rendering/render.py`, cached by a hash of every parameter and the source file's size and mtime), then joined with a stream-copy concat, so a cut cannot drift by a frame. Sound: every natural-sound piece and music layer becomes a 48 kHz stereo stem placed at an exact time, which is what makes J-cuts and L-cuts (`audio.lead`, `audio.tail`) exact. Buses (natural, dialogue, designed, music) are mixed with sidechain ducking, limited, and loudness-normalised in two passes. A single final ffmpeg pass composites Remotion overlays and libass captions and encodes.

**Why Remotion is only the typography layer.** Remotion renders `TypeCard` and `Stamp` to ProRes 4444 with alpha at the edit's canvas size; ffmpeg overlays them. Footage never passes through the browser.

**Reframing** is a scale-to-cover plus crop around a per-clip focus point, optionally animated (`zoom`, `focus_to`). The focus point defaults to detected faces, then to the centre of detail. Other aspect ratios reuse it unless `focus_by_aspect` overrides it.

**Colour** is Rec.709/SDR end to end. `auto: true` on a clip applies a conservative correction proposed from measured luma and colour cast; looks are optional and per project.

**The dashboard** (`dashboard/`) is a stdlib HTTP server and a dependency-free ES-module front end. It reads and writes the same project files the CLI does and runs the CLI as jobs. Mutating requests need an `X-TMD` header; it binds to 127.0.0.1; media routes cannot leave the project folder.

| Folder | Role |
| --- | --- |
| `engine/analysis` | ingest, shot metrics, audio facts |
| `engine/audio` | music analysis, transcription, licensing gate |
| `engine/rendering` | timeline schema/validation/compile, renderer, QC, exports |
| `engine/subtitles` | captions (ASS/SRT) and safe-area layout |
| `engine/colour` | corrections and looks |
| `engine/video` | probe, rough-cut, storyboard |
| `engine/motion` | Remotion compositions and renderer |
