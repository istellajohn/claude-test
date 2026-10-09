# Design system

## Direction chosen

Three directions were considered:

1. **Field-guide editorial (chosen).** Warm paper, a serious serif voice, strong information rows, original illustration. It reads as a publication someone cared about, and it holds up when screenshotted out of context.
2. **Protest-poster linocut.** Rejected for this brief. It is louder and more partisan in feel, and the brief asks for a guide people of any view could trust.
3. **Swiss information-only.** Rejected. It is very clear, but too cold for a letter from one citizen to another, and it is less likely to be shared.

## Typography (all SIL Open Font License)

| Role | English | Hindi |
|---|---|---|
| Display / headlines | **Fraunces**, wght 640, SOFT 100, opsz 144; italic 500 for emphasis | **Rozha One** |
| Body | **Bricolage Grotesque** | **Anek Devanagari** |
| Phone numbers | Bricolage Grotesque 800 at 75% width (poster numerals, very legible) | same |
| Labels, timestamps | IBM Plex Mono 500, tracked +0.12em | Anek Devanagari 700 (Plex Mono has no Devanagari) |
| Handwriting (paper slip, signature) | Caveat | Kalam |

Fraunces' soft axis gives warmth without decoration. The condensed Bricolage numerals let an 11-digit landline fit at 46 to 66 px.

## Colour

| Token | Hex | Use |
|---|---|---|
| paper | `#F0EEE8` | Ground |
| paper2 | `#E6E3DA` | Panels, icon discs |
| carbon | `#1B1C1A` | Text, dark slides 03 and 09 |
| wine | `#712E36` | Emphasis, warnings, the closing slide. Used sparingly. |
| blush | `#E7C9CD` | Emphasis on dark grounds |
| terracotta | `#A5554A` | Jantar Mantar illustration only (the monument's real plaster colour) |
| grey | `#B9B6AE` | Dashed "unverified" boxes, rules |

Status never relies on colour alone. Every contact carries a text label with a shape mark: ● official, ○ public contact with availability unconfirmed, ◆ confirmed for 10 Oct.

## Grid and spacing

- Canvas 1080 × 1350. Side margins 88 px; top margin 80 px.
- Footer is fixed at 42 px from the bottom. It holds the credit or independence statement on the left and the "Checked" timestamp or page number on the right.
- Stories (1080 × 1920): nothing vital above 250 px or below 1600 px, to stay clear of Instagram's interface.
- Rhythm: rules of 1 px at 20% carbon between rows; 1.5 px solid under the top bar.

## Type scale (English, px)

Cover headline 124 · slide headline 68 to 82 · contact number 46 to 104 · strong row text 25 to 30 · body 26 to 29 · small 20 to 24 · labels 15 to 19 · footer 18.
The minimum body size is 20 px, about 7.3 pt on a 390 pt-wide phone. Every slide was checked at that size.

## Illustration

All illustrations are original vectors in `src/illustrations.js`:

- **Samrat Yantra.** Jantar Mantar's great sundial, drawn as a side elevation with stairs, a quadrant arc and arches. It appears by day on the cover and story 1, and at dusk on the closing slide. It identifies the place without anyone's photograph.
- **Crowd band.** Strangers, two of whom (in wine) share a water bottle. Used on slide 05 and story 4.
- **Phone with no data, paper slip with handwritten numbers, two unreachable phones with a meeting point, phone recording.** Each sits on the slide whose advice it illustrates.
- **Icon set.** 34 icons on a 48 px grid with a 2.6 px round stroke.

No illustration depicts a specific incident, police conduct or violence.

## Slide rhythm

Cover (illustration) → bulletin → dark connectivity slide → checklist → human slide with crowd → contact directory → legal table → independent directory → dark documentation slide → decision path → quiet list → wine closing with dusk illustration.

## Export settings

PNG at 1×, 1080 px wide, rendered in headless Chromium after `document.fonts.ready`. WhatsApp images are JPEG at quality 84 (about 150 to 250 KB each).
