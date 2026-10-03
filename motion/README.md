# VALENCE · Introduction film

A 30-second introduction film for social, built from the website's own system: the night sky, Anybody's width axis, the Ballet script word, Martian Mono coordinates, the Navagraha, and the eclipse over water from the home hero. The marks are the official VLNC and Valence logos from the identity system.

| File | What it is |
| --- | --- |
| `out/valence-intro-9x16.mp4` | 1080×1920, 30fps, with score. Reels, Shorts, Stories, TikTok. |
| `out/valence-intro-4x5.mp4` | 1080×1350, 30fps, with score. Instagram and LinkedIn feed. |
| `index.html` | The film played live from source. Space plays and pauses; F switches format. Serve the repository root (`npx serve .`) and open `/motion/`. |
| `film.js` | The film. Every frame is a pure function of time (`seek(t)`), so the live player, the MP4s and the design-system previews are identical. |
| `score.py` | The soundtrack, synthesised in numpy from the cue list the film exports (`cues.json`). Key of D. |
| `render.mjs` | Frame-by-frame renderer: headless Chromium (Playwright) into ffmpeg. |
| `assets/` | Trimmed copies of the official marks (white and black). |
| `fonts/` | Latin subsets of the five site faces (SIL Open Font License), so renders never depend on the network. |

## The idea

The identity deck names the core behaviour: find the signal, remove noise, build recognisable emotional weight. The film acts it out.

1. **Signal** (0 to 1.5s). One verve pulse. "The light you are seeing left its star years ago."
2. **Noise** (1.5 to 4.6s). A warp through the stars while the market's vocabulary floods in ("POST DAILY", "GO VIRAL", "10X YOUR BRAND"), is struck through and blurs away.
3. **The line** (4.6 to 8.6s). "You have been living with it *longer* than anyone knows."
4. **Worlds** (8.6 to 14.1s). Eight grahas on the beat at 96 BPM: founders, cinema, music, public figures, brands, architecture, capital, institutions.
5. **Recognition** (14.1 to 19.6s). "You can recognise it before you can *explain* it." Scattered stars drift into place and connect into the VALENCE master name; the last star is the signal.
6. **Weight** (19.6 to 28.4s). The eclipse rises over water, the disciplines pass on the water, VLNC lands, the signature writes itself in gold, then the kicker, the hand note and the call to action.
7. **Return** (28.4 to 30s). Back to the single pulse, so the film loops on social without a seam.

## Rebuilding

```sh
node motion/render.mjs cues 9x16 motion/cues.json      # export sound cues from the film
python3 motion/score.py motion/cues.json /tmp/raw.wav   # needs numpy
ffmpeg -i /tmp/raw.wav -af loudnorm=I=-15:TP=-1.5:LRA=14 -ar 48000 motion/score.wav
node motion/render.mjs check 9x16                       # seek every frame, report exceptions
node motion/render.mjs video 9x16 motion/out/valence-intro-9x16.mp4 motion/score.wav
node motion/render.mjs video 4x5  motion/out/valence-intro-4x5.mp4  motion/score.wav
```

Playwright resolves from a local or global install (`NODE_PATH=$(npm root -g)` if needed). A render takes about nine minutes per format.

## Before posting

- The descriptor on the end card follows the October 2026 site copy ("An independent creative practice · Mumbai, working globally"). The identity deck still says "Branding & marketing agency". Settle one before the film goes out.
- The call to action points to `buzz@vlnc.in`. Add the handle or URL the post should drive to if it differs.
- The score is synthesised and original. If a licensed track replaces it, keep the hits on the cue times in `cues.json`.
