# Jantar Mantar 2.0: An Independent Citizen's Field Guide

By Stella John, published independently in her personal capacity. Not affiliated with any party, organiser or organisation listed.

Last fact check: **9 Oct 2026, 11:45 pm IST**. Things are changing by the hour. Re-check `research/source-ledger.md` before every re-publish.

## What's here

| Folder | Contents |
|---|---|
| `exports/instagram-carousel-en/` | 20 English slides, 1080 × 1350 PNG |
| `exports/instagram-carousel-hi/` | 20 Hindi slides, 1080 × 1350 PNG |
| `exports/standalone-cards/` | 9 self-contained information cards, 1080 × 1350 PNG |
| `exports/stories/` | 5 Instagram Stories, 1080 × 1920 PNG |
| `exports/whatsapp/` | 4 lightweight JPEGs for forwarding |
| `exports/contact-sheets/` | Overview sheets of every set |
| `content/` | All copy and data. **Edit here, not in the layout code.** |
| `src/` | Layout code (`build.js`), illustrations and icons (`illustrations.js`), contact-sheet tool |
| `assets/fonts/` | OFL fonts and their licence files |
| `research/` | Source ledger, contact verification register, fact-check report |
| `documentation/` | Design system, licences, captions, alt text |

## Regenerate

```bash
npm install            # once; installs Playwright
npm run build          # renders all 58 images (about 30 s)
npm run sheets         # rebuilds the contact sheets
```

Render a single item: `node src/build.js --only=en-06` (also `hi-13`, `card-c`, `story-4`, `wa-3`, or a prefix such as `card-`).

The build prints a layout report. It flags any text that runs off the canvas or into the footer. Anything other than `no layout issues detected` needs fixing before you publish.

## Common edits

**A phone number changes.** Edit `content/data.json` → `contacts.<id>.display`. Every slide, card, story and WhatsApp image that shows that contact updates on rebuild.

**A restriction changes (metro, internet, permission).** Edit `content/data.json` → `status[]`, then update `meta.checked` with the new time. Slide 02, card I, story 5 and WhatsApp 1 all read from this.

**Add a confirmed volunteer.** Do this only after direct confirmation and written consent to publish. Copy `_volunteer_template.example_id` into `contacts` with `status: "confirmed"`. Add the id to a group on the `numbers` slide in `content/en.json` and `content/hi.json`, then rebuild. Record the confirmation in `research/contact-register.md`.

**Change a sentence.** Edit `content/en.json` or `content/hi.json`. The Hindi copy is written independently, not machine-translated. Keep the two in step by meaning, not word for word.

**Add a photograph.** Only use your own photographs, or ones with a licence you can document. Put them in `assets/images/` and record them in `documentation/licences.md`.

## How headlines and spacing work

Write line breaks into headlines with `|`, for example `"Plan the way in.|Plan the way home."`. Break only at a sentence or phrase boundary. Each line is set on one line and the headline shrinks until every line fits, so the browser never inserts a break of its own.

Body text follows three rules, all applied automatically:

1. **A new sentence never starts at the end of a line.** Each sentence is set as its own unit. It sits beside the previous one only if it fits whole.
2. **Inside a sentence, lines break after a comma.** A clause only breaks internally if it is longer than a line.
3. **Short words stay with their neighbours.** "a", "the", "and", "your", "को", "के लिए" and the like never end a line. Names such as "Lady Hardinge" and "tear gas" never split. Add more to `NAMES` in `src/build.js`.

Spacing is set, never left over. Body text fills the slide down to a fixed gap above the footer: it grows slightly if there is room and shrinks if there isn't. Any space that remains is shared evenly between rows, then between blocks, so there is no dead area at the bottom of a slide. If the build reports `body-at-minimum-size`, the slide is full. Cut copy before adding anything.

Short labels (step titles, checklist items, contact names) take `|` breaks too, for example `"Women taken|away alone,|after dark"`.

Slides are a list in `content/en.json` and `content/hi.json`. Each has a `type` (`cover`, `status`, `expect`, `steps`, `checklist`, `buddy`, `record`, `numbers`, `closing`). Reorder, add or remove slides by editing the list. Page numbers update automatically.
