# VALENCE Journal

A publication site for VALENCE: interviews and essays on perception, reputation and the distance between who people are and how they are seen. One letter is published on every new moon.

**Specimen edition.** Interview subjects are deliberately unnamed, and the texts, dates and listings are placeholders written to show how the site reads. Replace them before launch. No client photographs are used anywhere.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: the WebGL "old light" hero, the latest letter, recent pieces, a question drawn from the dark, the three closing questions, essays, the letter sign-up |
| `interviews.html` | All interviews as catalogue rows, filterable by field |
| `essays.html` | All essays as posters |
| `catalogue.html` | The archive on the day side: a star chart of everything published, plus a searchable table with Julian Day numbers |
| `about.html` | The practice: valence in chemistry and psychology, the six systems, the founder's note, contact |
| `interview.html` | Long-form interview template (full specimen) |
| `essay.html` | Long-form essay template with margin notes (full specimen) |

## How it is built

Static HTML, CSS and JavaScript. No framework, no build dependencies.

- `src/pages/*.html` holds each page's content. `python3 tools/build.py` wraps it in the shared head, sky, ephemeris, header and footer, and writes the finished pages to the repository root. Edit the source, then rebuild.
- `assets/js/data.js` is the content index. Every piece is listed here once; listings, the star chart and "next" links all read from it. Wrap one word of a title in `{braces}` to set it in the script face.
- `assets/js/sky.js` holds the live sky (Julian Day, moon phase, true new moons computed with Meeus' algorithm), the starfield, the generative plates, and the page interactions.
- `assets/js/hero.js` is the WebGL hero, using three.js r149 (vendored, MIT).
- `assets/css/site.css` holds all styles. Night is the default; `data-side="day"` switches to the paper archive. Readers can switch a long read to the day side.

### Generative plates

Every catalogued piece gets its own celestial body (a planet, horizon, eclipse or binary), with orbits and grain, seeded from its catalogue number. A new piece gets a new plate automatically, so the site never needs stock imagery. To use a photograph instead, set `image` on the entry in `data.js`.

### Photographs

Page-level image slots fall back to plates until a photograph is set in `VALENCE.images` in `data.js`:
`essayHero`, `interviewHero`, `homeInterlude`, `homeLetter`, `essaysBanner`, `aboutHero`. The art direction and prompts for each are in `docs/image-prompts.md`.

## Type

All from Google Fonts:

- **Anybody** (variable width 50–150%): display. It stretches between condensed and extended, and the hover and entrance animations use that width axis.
- **Ballet**: the script word inside headlines.
- **Host Grotesk**: reading text and interface.
- **Martian Mono**: coordinates, catalogue numbers, labels.
- **La Belle Aurore**: pencil notes in the margins.

The VALENCE wordmark in the header is drawn as single strokes in SVG, following the spaced master-name lockup in the identity system.

## Before launch

- Replace specimen content in `data.js` and the two long-form templates.
- Connect the letter form to a newsletter service. It currently confirms on screen only. Ghost fits this publication well: posts, memberships and a newsletter in one, and this design can become its theme.
- For search and answer engines, render each piece as its own static page at build time. A CMS, or extending `tools/build.py` to read `data.js`, would do it.
