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

- **No decorative image shows a face.** This covers the generated artwork and the original assets. Client material is kept only where it meets the same rule: Odisha and Spying Stars show face-free crops of the real campaign and poster (`case-*-type.jpg`). Entrust (Rajmohan Krishnan) and Band SANAM use typographic cards until face-free project material is chosen. Retired images are kept, unpublished, in `masters/retired/`.
- **Artwork (V3)** is generated photographic artwork, with no people. The full-resolution PNG masters are in `masters/v3/`; the web exports are `assets/img/stills/v3-*.jpg`. The eclipse is the agency hero. The others are placed through the still registry: `tools/stills.json`, written into pages as `<!--STILL:id-->`, with a `file` field naming the artwork. Wide frames keep their own shape on phones and are not cropped to portrait. A placed artwork shows its title as a small caption. Until a file exists, the page shows a labelled frame carrying the brief. The founder portrait (`about-stella`) waits for Stella's own photograph.
- **The Journal's cosmic world is unchanged:** the planetary opening, the generative plates on every card and poster, the star-chart Catalogue, the grahas and the new-moon rhythm. The eye and profile covers now use the moon-through-glass and orbital-afterimage artwork (`VALENCE.images` in `data.js`). Nebula plates draw their dust as streaks rather than round holes, so no plate suggests a face.
- The live starfield and its hairline axes appear on Journal pages only. Practice pages sit on quiet ink, graphite and petrol surfaces. No grain is laid over text or controls, and no extra grade is laid over the artwork.

The earlier photographic briefs and Midjourney prompts remain in `docs/image-briefs.md` for reference.

## Type

All from Google Fonts:

- **Host Grotesk**: headings at Regular or Medium, reading text and interface.
- **Anybody** (variable width 50–150%): kept for brief emphasis only, such as the Journal mastheads.
- **Ballet**: complete annotations only (the masthead lines). Headlines carry no script words; a `{braced}` word in a title now renders in the heading's own face.
- **Martian Mono**: coordinates, catalogue numbers, labels.
- **La Belle Aurore**: pencil notes in the margins.

The VALENCE wordmark in the header is drawn as single strokes in SVG, following the spaced master-name lockup in the identity system.

## Before launch

- Replace specimen content in `data.js` and the two long-form templates.
- Connect the letter form to a newsletter service. It currently confirms on screen only. Ghost fits this publication well: posts, memberships and a newsletter in one, and this design can become its theme.
- For search and answer engines, render each piece as its own static page at build time. A CMS, or extending `tools/build.py` to read `data.js`, would do it.

## Forms

The letter and enquiry forms send nothing until an endpoint is set in `assets/js/data.js` as `VALENCE.forms = { letter: "https://...", enquiry: "https://..." }` (a JSON POST; the response can return `status: "exists"` or `"confirm"`). Until then the letter form asks people to write in, and the enquiry form opens a pre-filled email to buzz@vlnc.in. Shared blocks live in `src/partials/` and are included with `<!--NAME-->`.
