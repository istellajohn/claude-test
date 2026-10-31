# Music Video Studio

This folder is Stella John's music video direction and production studio: original songs (Suno or other authorised sources) turned into finished films through Claude Code, Remotion, FFmpeg, Python, Blender and approved generation services.

It sits inside the VALENCE website repository but is a separate workspace. Nothing here should touch the website's `src/`, `tools/build.py` or root HTML pages, and the website's rules do not govern work here.

The full creative and technical direction is below. It is binding for every task in this folder.

@docs/MASTER_VIDEO_DIRECTION.md

## Operating rules that override convenience

- The approved audio master is never altered: no tempo, pitch, length, fade or loudness changes without explicit approval. The video adapts to the music.
- Report state precisely as PLANNED, GENERATED, RENDERED, VALIDATED or APPROVED. Never claim a render, a fix, a push or a connected API that has not been verified.
- No chargeable external generation beyond the authorised budget without explicit approval. Do not invent prices.
- No credentials in files or commits. No large masters or camera originals committed without Git LFS or external storage.
- Animatic before expensive final generation on any multi-scene project.

## Starting a session

1. Read this file and the master direction.
2. Open the current song's `projects/<SONG_ID>/BRIEF.md`.
3. Read that project's `CHANGELOG.md` and identify the approved version.
4. Check what actually exists in `assets/`, `previews/`, `renders/` and `exports/`.
5. Continue from that state. Do not silently restart a completed creative step.
