# Jantar Mantar 2.0: An Independent Citizen's Field Guide

By Stella John, published independently in her personal capacity. Not affiliated with any party, organiser or organisation listed.

Last fact check: **9 Oct 2026, 9:40 pm IST**. Things are changing by the hour. Re-check `research/source-ledger.md` before every re-publish.

## What's here

| Folder | Contents |
|---|---|
| `exports/instagram-carousel-en/` | 12 English slides, 1080 × 1350 PNG |
| `exports/instagram-carousel-hi/` | 12 Hindi slides, 1080 × 1350 PNG |
| `exports/standalone-cards/` | 7 self-contained information cards, 1080 × 1350 PNG |
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
npm run build          # renders all 40 images (about 30 s)
npm run sheets         # rebuilds the contact sheets
```

Render a single item: `node src/build.js --only=en-s06` (also `hi-s03`, `card-c`, `story-4`, `wa-3`, or a prefix such as `card-`).

The build prints a layout report. It flags any text that runs off the canvas or into the footer. Anything other than `no layout issues detected` needs fixing before you publish.

## Common edits

**A phone number changes.** Edit `content/data.json` → `contacts.<id>.display`. Every slide, card, story and WhatsApp image that shows that contact updates on rebuild.

**A restriction changes (metro, internet, permission).** Edit `content/data.json` → `status[]`, then update `meta.checked` with the new time. Slide 02, card G, story 5 and WhatsApp 1 all read from this.

**Add a confirmed volunteer.** Do this only after direct confirmation and written consent to publish. Copy `_volunteer_template.example_id` into `contacts` with `status: "confirmed"`. Add the id to a group in `slides.s11.groups` in `content/en.json` and `content/hi.json`, then rebuild. Record the confirmation in `research/contact-register.md`.

**Change a sentence.** Edit `content/en.json` or `content/hi.json`. The Hindi copy is written independently, not machine-translated. Keep the two in step by meaning, not word for word.

**Add a photograph.** Only use your own photographs, or ones with a licence you can document. Put them in `assets/images/` and record them in `documentation/licences.md`.
