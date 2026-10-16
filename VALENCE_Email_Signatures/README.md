# VALENCE Email Signatures v01

Google Workspace (Gmail) signatures for Stella John, Pallavi Shinde and Ronaldo Gomes. Three designed options plus a reply version.

## Deliverables
| Path | What |
|---|---|
| `05_EXPORTS/boards/VALENCE_signature_option_*.png` | review boards, one per option |
| `05_EXPORTS/gmail_html/<person>/VALENCE_signature_<person>_<option>.html` | the signature on its own, ready to copy into Gmail |
| `05_EXPORTS/images/` | `vlnc-tile.png` (60x60), `vlnc-plate.png` (84x26), `valence-band.png` (340x52), all @3x |
| `05_EXPORTS/preview_html/` | review pages with local images |

## Before installing: host the three images
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
