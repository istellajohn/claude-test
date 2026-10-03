# VALENCE

The website of VALENCE, an independent creative practice founded by Stella John in Mumbai, working globally across creative direction, film, photography, writing, branding and digital strategy. The VALENCE Journal of written conversations and essays sits inside it and publishes one letter each new moon. Copy follows `VALENCE Website Replacement Copy` (October 2026).

**Specimen edition (journal only).** Interview subjects are deliberately unnamed, and the texts, dates and listings are placeholders written to show how the site reads. Replace them before launch. Client photographs appear only in the case studies (home and Work) (`assets/img/case-*.jpg`, taken from the credentials deck with approval).

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Practice home: hero, opening statement, the people and worlds we work with (with their grahas), what guides the work, ways a brief can begin, the disciplines, working in another person's voice, selected work, the Journal, closing invitation |
| `work.html` | Selected projects with filters and case labels |
| `disciplines.html` | The six disciplines and three ways to engage |
| `how-we-work.html` | Four movements of a project |
| `contact.html` | Enquiry form and questions before getting in touch |
| `journal.html` | Journal front page: latest letter, recent stories, a question for the way home, the three recurring questions, essays, the letter |
| `letter.html` | The Letter subscription page |
| `404.html` | Missing page |
| `interviews.html` | Conversations, searchable |
| `essays.html` | Essays, searchable |
| `catalogue.html` | The archive on the day side: a star chart of everything published, plus a searchable table with Julian Day numbers |
| `about.html` | The name (valence in chemistry and psychology), why the agency keeps a journal, the founder's note, contact |
| `interview.html` | Long-form interview template (full specimen) |
| `essay.html` | Long-form essay template with margin notes (full specimen) |

## Introduction film

`motion/` holds *Entry One*, the 36-second introduction film for social (9:16 and 4:5, motion-blurred, with voice-over and an original score), built from this site's photography, type and colour and the official marks. See `motion/README.md`.

## How it is built

Static HTML, CSS and JavaScript. No framework, no build dependencies.

- `src/pages/*.html` holds each page's content. `python3 tools/build.py` wraps it in the shared head, sky, ephemeris, header and footer, and writes the finished pages to the repository root. Edit the source, then rebuild.
- `assets/js/data.js` is the content index. Every piece is listed here once; listings, the star chart and "next" links all read from it. Wrap one word of a title in `{braces}` to set it in the script face.
- `assets/js/sky.js` holds the live sky (Julian Day, moon phase, true new moons computed with Meeus' algorithm), the starfield, the generative plates, and the page interactions.
- `assets/js/hero.js` is the WebGL hero, using three.js r149 (vendored, MIT).
- `assets/css/site.css` holds all styles. Night is the default. The header on every page has two remembered switches: Night/Day (`data-side`, a paper "day side"; cinematic sections stay dark) and Reading (`data-reading`: still motion, no grain, larger higher-contrast text).
- The eight rooms on the home page are marked by their Vedic graha (Mars, Rahu, Moon, Venus, Mercury, Jupiter, Saturn, Sun), drawn in `sky.js` (`drawGraha`).

### Generative plates

Every catalogued piece gets its own celestial body (a planet, horizon, eclipse or binary), with orbits and grain, seeded from its catalogue number. A new piece gets a new plate automatically, so the site never needs stock imagery. To use a photograph instead, set `image` on the entry in `data.js`.

### Photographs

Two systems sit side by side.

- **Stills** (V2 photographs, generated in ChatGPT; full-resolution PNG masters in `masters/v2/`, compressed web exports in `assets/img/stills/`) are the photographic layer of the practice pages and the Journal: eleven placements registered in `tools/stills.json` and written into pages as `<!--STILL:id-->`. When `assets/img/stills/<id>.jpg` exists the build places it (with `<id>-m.jpg` as an art-directed phone crop, if present); until then the page shows a labelled frame carrying the brief: subject, composition, light and why it sits there. Each still has a desktop and phone ratio, a focus point for each, and a light family (night, dusk, day) that tints its frame. The Journal's planets, plates, star chart and new-moon rhythm stay as they were; the Journal photographs have their own placements (beside the three questions, after the essay list, between the Catalogue chart and table, and inside the two reading templates). The home hero layers a photograph per side (`hero-night`, `hero-day`) under the WebGL horizon. The planetary-limb study (`study-limb`) is registered but not yet placed. The founder portrait (`about-stella`) waits for Stella's own photograph. The original briefs and Midjourney prompts are in `docs/image-briefs.md`.
- **Image slots** are set in `VALENCE.images` in `data.js` (generated photographs in `assets/img/`: eye, profile, star-trails, moonrise, limb; the home page also uses profile-beam and trails-torch); any slot left empty falls back to a plate: `essayHero`, `interviewHero`, `homeInterlude`, `homeLetter`, `essaysBanner`. Their prompts are in `docs/image-prompts.md`.

Every photograph on the site shares one grade in `site.css` (contrast held, saturation just under natural, fine grain and a soft vignette), so generated, client and commissioned images read as one set.

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

## Forms

The letter and enquiry forms send nothing until an endpoint is set in `assets/js/data.js` as `VALENCE.forms = { letter: "https://...", enquiry: "https://..." }` (a JSON POST; the response can return `status: "exists"` or `"confirm"`). Until then the letter form asks people to write in, and the enquiry form opens a pre-filled email to buzz@vlnc.in. Shared blocks live in `src/partials/` and are included with `<!--NAME-->`.
