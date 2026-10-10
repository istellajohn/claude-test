# Jantar Mantar, 10 October 2026

Status: **awaiting photographs.** Nothing has been edited, because no photographs have been supplied yet.

1. Put the photos you are licensed to use in `04_photographs/` (or drop them on the dashboard's Footage Library). Original files, not screenshots; keep EXIF.
2. `./tmd ingest jantar-mantar-2026-10-10`
3. `./tmd credits jantar-mantar-2026-10-10`, then fill in photographer and licence for each photo.
4. `./tmd score jantar-mantar-2026-10-10 --bpm 132 --seconds 30` (original score, exact beats)
5. `./tmd rough-cut jantar-mantar-2026-10-10 --music 03_music_references/analysis/score_grunge_132bpm_<N>s.analysis.json`
6. Review in `./tmd serve`, refine, then `./tmd export jantar-mantar-2026-10-10 photos-a-impact`.

See `00_brief/brief.md` for what may be stated as fact and what may not.
