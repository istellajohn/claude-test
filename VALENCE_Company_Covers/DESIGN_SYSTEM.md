# DESIGN SYSTEM: Company covers v01

## Concept
The covers do not decorate the logo. Each direction makes one idea visible.
- **A, Cropped Authority:** the mark as architecture. A tonal giant VLNC, cropped by the canvas, sits behind a precise lockup. One orange signal.
- **B, The Invisible Layer:** the deck's "invisible layer" made literal: ocean currents (phytoplankton, Landsat 7) graded to Sea, the gold signature in a pool of shallow focus.
- **C, Four Charges:** the name's meaning drawn as an orbit (Attraction, Trust, Memory, Conviction), with the ring acting as the deck's "brackets" and a gold gesture of Saharan sand as a lens.

## Colour (from the brand deck, p11)
| Token | HEX | Role in covers |
|---|---|---|
| Onyx | `#0A0A0A` | Ground for A and B, text and mark on C |
| Bone | `#F3F2EF` | Mark and text on dark, ground for C |
| Stone | `#A6A39E` | Captions, hairlines on dark |
| Verve | `#E35A2A` | Signal only: one bar, the slash separators, the Conviction node |
| Gold | `#C8A24C` | Signature wordmark only, and sand streaks in C imagery |
| Forest `#223D2E`, Sea `#0B5962` | | Trust and Memory nodes; Sea is the B photographic ramp |
Tonal giant mark on A uses `#1A1A19` and `#171716` on Onyx (about 1.1:1, deliberately sub-legible texture, never carries information).

## Typography
| Role | Face | Weight | Size (1920 base LI / FB, 1280 base YT) | Notes |
|---|---|---|---|---|
| Statement | Switzer | 500 | LI 28 to 32, FB 52 to 60, YT 22 to 26 | line-height 1.14 to 1.16, tracking -0.015em |
| Captions, tagline, labels | DM Mono | 400 | LI 13 to 15, FB 17, YT 10 to 12 | uppercase, tracking 0.18em, orange `/` separators |
Deck faces (Sohne Breit, Neue Haas Grotesk, Canela) are paid. Switzer and DM Mono are free-licence stand-ins. Swap in `04_WORKING/layouts/shared/base.css`.

## Grid and spacing
- Base unit 8 px at each canvas base. Margins: LI 590 optical (centred group), FB 240 left / 200 right inside the 2.7:1 band, YT centred inside the 773 x 211.5 safe strip.
- Hairlines 1 px at 10 to 22% of Bone or Onyx. Orange bar 3 px (LI, YT) or 6 px (FB) tall, 40 to 96 px long.
- Logo heights: wide VLNC 72 (LI), 96 to 118 (FB), 44 to 48 (YT). Clear space: at least the V stem height (deck p10).

## Safe zones
| Platform | Canvas (CSS px) | Export | Safe content area |
|---|---|---|---|
| LinkedIn | 1920 x 325 | 3840 x 650 (@2x) | centre group; avoid lower-left (avatar) and lower-right |
| Facebook | 1920 x 1080 | 3840 x 2160 (@2x) | y 184 to 896 (2.7:1), lower-left 500 x 200 clear of text |
| YouTube | 1280 x 720 | 2560 x 1440 (@2x), 3840 x 2160 (@3x) | 773 x 211.5 centred (= 1546 x 423 at 2K); desktop band full width at that height |

## Imagery and texture
Graded to the palette by luminance ramp, never left in raw satellite colour. Grain on everything (overlay on dark, multiply on bone). Texture carries meaning: water is the invisible layer, sand is the signal.

## Recurring devices
Axis hairlines with `+` coordinates (A), orange slash tagline (all), orbit ring and nodes (C), cropped giant mark (A), shallow focus pool (B).

## Export
`python3 -I 04_WORKING/source_files/build_covers.py final` then `make_boards_and_uploads.py`. Upload JPEGs are sRGB, under 3 MB (LinkedIn) and 6 MB (YouTube).
