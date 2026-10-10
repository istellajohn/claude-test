# first-project

Status: **awaiting footage.** Nothing has been edited, because nothing has been supplied.

## What to do

1. Edit `00_brief/brief.md` (or use the dashboard: `./tmd serve`, then Project Overview).
2. Put camera originals in `01_original_footage/`, photographs in `04_photographs/`, voice recordings in `02_audio/`. Dropping files onto the dashboard's Footage Library does the same.
3. `./tmd ingest first-project` analyses everything and writes `06_footage_analysis/inventory.json`, `shot_log.csv`, thumbnails and 540p proxies.
4. Optional: `./tmd transcribe first-project`, and `./tmd music first-project` for a licensed or guide track placed in `03_music_references/audio/`.
5. `./tmd rough-cut first-project` writes three draft timelines (A impact, B cinematic, C experimental editorial) to `08_edit_timelines/` for a director to react to.

Source folders are git-ignored. Decide on a private repository plus Git LFS before versioning any media (see `documentation/ASSET-STORAGE.md`).
