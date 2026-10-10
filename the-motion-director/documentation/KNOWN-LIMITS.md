# Known limits

**Verified here** (`./tmd selftest`, 17 checks, plus a headless-browser pass of the dashboard): ingest, shot detection, transient detection, beat grid, the licensing gate, documentary guardrails, frame-exact preview and finals, guide music excluded from finals, QC, EDL/SRT/poster output, Remotion overlays with alpha, all four caption styles through libass, four aspect ratios, and transcription of real speech (faster-whisper, tiny model).

**Not yet tested on real camera footage.** All of the above ran on synthetic fixtures. The analysis thresholds (soft focus, exposure, shake, flicker) are reasoned starting values and will need tuning on real material. Shake is measured from 12 fps sampling and under-reads fast jitter. Face detection is a classical Haar cascade: it misses profiles, small and occluded faces, so the "human" tag and auto focus point are suggestions.

**Not implemented**
- Cross-dissolves (use cuts, dips, or sound bridges). No stabilisation, motion tracking, masking, or subject-aware reframing beyond focus points.
- HDR to SDR tone-mapping: HDR sources are detected and warned about, not converted.
- Music research, Instagram availability checks and licence verification cannot be automated; they are recorded by a person with evidence.
- A live, in-browser timeline editor: the dashboard previews the last rendered preview and edits clips through forms and JSON.

**Performance.** A final render of an 8 s, 1080p edit takes roughly 30–45 s per variant on 4 cores (segments are cached; QC adds several analysis passes). `--all` renders seven variants.

**Dashboard playback.** Previews are H.264/AAC, which Chrome, Edge and Safari play. The headless Chromium used for testing here has no H.264 decoder, so playback behaviour was tested with a VP9 stand-in of the same file; the dashboard code is identical.

**Beat tracking** reports estimates. On steady music a fitted grid is used (and the half-beat alternative is exposed); on drifting music the tracked beats are kept. Always check against the audio by ear.
