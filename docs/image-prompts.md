# Image direction · VALENCE Journal

Six photographs complete the site. Until they exist, each slot shows a generative plate, so nothing is broken without them.

**The look.** Experimental analogue photography, not clean realism: intentional camera movement, long-exposure trails, double exposure, prism refraction, light leaks, grainy colour gradients. The grade is deep teal-black shadows with ember-orange highlights. Figures are small, turned away or smeared, and never identifiable. There is no text in frame.

**What to avoid.** Clean stock realism, symmetrical "AI fantasy" skies, glossy skin, lens-flare clichés, and visible faces of anyone who could be mistaken for a real person.

Drop each finished file into `assets/img/` and set its path in `VALENCE.images` in `assets/js/data.js`.

| Slot | Ratio | Prompt |
| --- | --- | --- |
| `essayHero` | 16:9 | Extreme macro of a human eye, underexposed, the iris catching a thin orange crescent of light like a solar eclipse. Shot through a glass prism so a soft rainbow refraction smears across half the frame. Expired 35mm film, heavy grain, deep cobalt and teal shadows, abstract, intimate, experimental. |
| `interviewHero` | 3:4 | Intentional camera movement photograph: a woman's profile in a dark studio, her face smeared sideways into streaks of warm light against deep cobalt blue, a ghosted double outline, one bright vertical light leak cutting through the frame. Expired film, heavy grain, abstract, unrecognisable, cinematic. |
| `homeInterlude` | 16:9 or 21:9 | Long exposure at night: concentric star trails circling over a black desert, a tiny figure far away holding a torch whose light draws a thin orange line across the ground, the horizon glowing faintly, vast empty negative space, grainy, cosmic, abstract, experimental. |
| `homeLetter` | 3:4 | A hand silhouette reaching up against a grainy gradient sky that fades from deep navy to burnt orange, a thin crescent moon above the fingertips, the hand blurred by movement. Minimal, lots of empty space, coarse analogue grain, spiritual, experimental. |
| `essaysBanner` | 21:9 | Grainy abstract photograph: the enormous curved horizon of a planet glowing ember orange against black space, soft blur, a tiny white moon high in the frame, minimal composition, heavy analogue noise, cinematic, experimental. |
| `aboutHero` | 21:9 | Faded vintage archival photograph of an old observatory telescope under circling star trails, double exposed with a faint hand-drawn orbit diagram, cream and sepia paper tones, dust, scratches, a warm light leak, grain, experimental. |

**Midjourney.** Append `--style raw --ar <ratio> --chaos 20` and add "shot on expired Kodak Portra 800, pushed two stops" to strengthen the film character. Generate four, upscale one, and keep the grain in the file rather than adding it in CSS.
