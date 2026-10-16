# VALENCE Email Signatures

Google Workspace (Gmail) signatures for Stella John, Pallavi Shinde and Ronaldo Gomes.

## v03 (current): banner signatures, after the client's references
Five layouts at 600 x 200 (3:1, the reference format), each for all three people:
1 **Signal Pattern** (bone card, autograph name, VLNC tile pattern band), 2 **Onyx Block** (black card, Verve bar, big name, role tag, photo panel, Instagram pill),
3 **Horizon** (Onyx-to-Verve header with the brand line, overlapping circles), 4 **Editorial** (Forest green, serif capitals, labelled columns),
5 **Monogram** (giant Verve VLNC, arched portrait, vlnc.in tab).

| Path | What |
|---|---|
| `05_EXPORTS/boards/VALENCE_signature_v03_*.png` | mockup boards |
| `05_EXPORTS/gmail_html/<person>/VALENCE_signature_<person>_v03_<layout>.html` | ready to copy into Gmail |
| `05_EXPORTS/images/v03/` | slices to host at **https://www.vlnc.in/email/v03/** (17 to 27 per signature, 75 to 135 KB) |
| `05_EXPORTS/images/v03_cards/` | full card masters, 1800 x 600 |
| `00_BRIEF/headshots/` | drop `stella.jpg`, `pallavi.jpg`, `ronaldo.jpg` here and rebuild; until then photo slots show the VLNC mark |

Every contact detail is its own linked slice (tel:, mailto:, website, Instagram); alt text carries the plain detail. Reassembled slices were checked against the master at 1:1 (no seams).
Rebuild: `python3 -I 04_WORKING/source_files/build_signatures_v03.py`

## v02 (superseded): rendered 3D cards
Three finishes: **Obsidian** (gloss black stone, orange rim), **Plaster** (matte bone relief), **Gold Leaf** (polished gold metal). Each is a real 3D render of the VLNC mark (three.js, from the brand vectors) with a signed-letter type system: autograph in Herr Von Muellerhoff, typed name in General Sans, role in Cormorant Garamond Italic, contacts in General Sans.

| Path | What |
|---|---|
| `05_EXPORTS/boards/VALENCE_signature_v02_*.png` | review boards |
| `05_EXPORTS/gmail_html/<person>/VALENCE_signature_<person>_v02_<finish>.html` | ready to copy into Gmail |
| `05_EXPORTS/images/v02/` | 117 slices (13 per signature, about 100 KB per signature) |
| `05_EXPORTS/images/card-<finish>-<person>.png` | full card masters, 1200 x 600 |

**Why sliced:** Gmail cannot show custom fonts, so the card is an image. It is cut into 13 pieces so the phone, email, website and Instagram are each their own link (tel:, mailto:, https). If images are blocked, the alt text shows the plain details.

**Hosting:** upload everything in `05_EXPORTS/images/v02/` to **https://www.vlnc.in/email/v02/**, keeping filenames. Then install as described below. The v01 Reply signature (plain text) remains the reply/forward default.

**Rebuild:** `python3 -I 04_WORKING/source_files/build_signatures_3d.py` (Chromium with WebGL via SwiftShader; renders through a local HTTP server because browsers block module scripts from file://).

## v01 (superseded): typographic HTML signatures

## Deliverables
| Path | What |
|---|---|
| `05_EXPORTS/boards/VALENCE_signature_option_*.png` | review boards, one per option |
| `05_EXPORTS/gmail_html/<person>/VALENCE_signature_<person>_<option>.html` | the signature on its own, ready to copy into Gmail |
| `05_EXPORTS/images/` | `vlnc-tile.png` (60x60), `vlnc-plate.png` (84x26), `valence-band.png` (340x52), all @3x |
| `05_EXPORTS/preview_html/` | review pages with local images |

### v01 hosting
Gmail cannot use local images in a pasted signature. Upload the three PNGs in `05_EXPORTS/images/` to **https://www.vlnc.in/email/** (exact filenames). If they live somewhere else, change `BASE_URL` in `04_WORKING/source_files/build_signatures.py` and rebuild. Option 4 (Reply) has no images and works immediately.

## Installing in Gmail (each person, in their own account)
1. Open that person's file from `05_EXPORTS/gmail_html/` in Chrome. Check the images load.
2. Press Ctrl/Cmd + A, then Ctrl/Cmd + C.
3. Gmail > gear > **See all settings** > **General** > **Signature** > **Create new**, name it (e.g. "VALENCE"), click in the box and paste.
4. Do the same with the **Reply** file, named "VALENCE reply".
5. Under **Signature defaults**: "For new emails use" = VALENCE, "On reply/forward use" = VALENCE reply.
6. Scroll down and **Save Changes**. Send a test to a Gmail and an Outlook address, and check on a phone.

## Technical notes
- Tables and inline styles only; Gmail strips `<style>` blocks and web fonts.
- Live text uses system fonts: `'Helvetica Neue', Helvetica, Arial` (Mac shows Helvetica Neue, Windows shows Arial) and Georgia for the Editorial name. Brand fonts appear only inside the images.
- All images sit on solid Onyx so they survive Gmail dark mode, which recolours text but not images.
- Each signature is under 3,000 characters (Gmail limit 10,000).
- Previews use Inter for Helvetica Neue and Gelasio (metric-compatible) for Georgia, because this build machine has neither. Real rendering uses the recipient's fonts.

## Rebuild
`python3 -I 04_WORKING/source_files/build_signatures.py` (needs the covers project alongside for logo SVGs and fonts).
