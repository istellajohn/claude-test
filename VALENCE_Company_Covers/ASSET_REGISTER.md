# ASSET REGISTER

All external assets used in VALENCE_Company_Covers v01. Checked 2026-10-09.

## Fonts

### Font 01: Switzer
**Designer / foundry:** Indian Type Foundry
**Source:** https://www.fontshare.com/fonts/switzer (downloaded via https://api.fontshare.com/v2/fonts/download/switzer)
**Licence:** ITF Free Font License v2.0 (full text in `02_BRAND/fonts/Switzer/Switzer_Complete/License/FFL.txt`)
**Commercial use:** Yes. Personal or commercial, may create logos, graphics, images and vector files. May self-host and embed in documents.
**Restrictions:** No modifying or subsetting the font files, and no redistributing or serving them to third parties. For this reason the font files are excluded from git. Re-download from Fontshare to rebuild.
**Role:** Headlines and statements (Regular 400, Medium 500, Semibold 600). Stand-in for Neue Haas Grotesk / Sohne.
**Downloaded:** 2026-10-09
**Files used:** `Switzer-Regular.woff2`, `Switzer-Medium.woff2`, `Switzer-Semibold.woff2` (Medium is the working weight)

### Font 02: DM Mono
**Designer / foundry:** Colophon Foundry (for Google Fonts)
**Source:** https://github.com/google/fonts/tree/main/ofl/dmmono
**Licence:** SIL Open Font License 1.1 (`02_BRAND/fonts/DMMono/OFL.txt`)
**Commercial use:** Yes, including embedding and redistribution with the licence file.
**Role:** Tracked micro captions, tagline, node labels.
**Downloaded:** 2026-10-09
**Files used:** `DMMono-Regular.ttf` (`DMMono-Medium.ttf` downloaded, unused)

### Font 03: Instrument Serif (reserved, not used in v01 layouts)
**Designer:** Rodrigo Fuenzalida, Jordan Egstad
**Source:** https://github.com/google/fonts/tree/main/ofl/instrumentserif
**Licence:** SIL OFL 1.1 (`02_BRAND/fonts/InstrumentSerif/OFL.txt`)
**Downloaded:** 2026-10-09. Held as a candidate serif for editorial contrast.

### Font 04: Archivo (reserved, not used in v01 layouts)
**Designer:** Omnibus-Type
**Source:** https://github.com/google/fonts/tree/main/ofl/archivo
**Licence:** SIL OFL 1.1 (`02_BRAND/fonts/Archivo/OFL.txt`)
**Downloaded:** 2026-10-09. Variable width axis, candidate wide display face if the Sohne Breit role needs a typeface.

## Photography

### Asset 01: Van Gogh from Space (Gotland, Baltic Sea)
**Creator:** USGS / NASA, Landsat 7, acquired 2005-07-13
**Source:** NASA Image and Video Library, nasa_id `GSFC_20171208_Archive_e001928` (https://images.nasa.gov/details/GSFC_20171208_Archive_e001928)
**Original:** `03_ASSETS/photography/NASA_Landsat7_Gotland_orig.jpg` (7152 x 7116)
**Licence:** NASA content is generally not subject to copyright in the US (NASA Brand Center, images and media guidance). No third-party copyright mark in the record. Landsat data is a USGS public dataset.
**Commercial use:** Yes, with conditions: must not state or imply NASA endorsement, must not use the NASA insignia or logotype. Attribution not required; credited in the "Fig. 01" caption anyway.
**Used in:** Direction B (LinkedIn, Facebook, YouTube)
**Modified:** Cropped, luminance-mapped to Onyx/Forest/Sea/Bone ramp, partial green retention, softened 0.5 to 0.9 px, grain added, blurred focus pool behind the signature (CSS)
**Local files:** `03_ASSETS/photography/graded/Gotland_graded_sea.jpg` (regenerable), crops in `graded/crops/B_*.jpg`
**Script:** `04_WORKING/source_files/grade_images.py`

### Asset 02: Algerian Abstract (Erg Iguidi, Algeria and Mauritania)
**Creator:** USGS / NASA, Landsat 5, acquired 1985-04-08
**Source:** NASA Image and Video Library, nasa_id `GSFC_20171208_Archive_e001942` (https://images.nasa.gov/details/GSFC_20171208_Archive_e001942)
**Original:** `03_ASSETS/photography/NASA_Landsat5_ErgIguidi_orig.jpg` (7104 x 7128)
**Licence and conditions:** as Asset 01
**Used in:** Direction C (LinkedIn side panels, Facebook disc, YouTube side panels)
**Modified:** Cropped, converted to Onyx/Stone/Bone luminance with sand streaks isolated by hue and recoloured Gold, grain added
**Local files:** `graded/ErgIguidi_graded_stonegold.jpg` (regenerable), crops in `graded/crops/C_*.jpg`

## Brand assets (client supplied)
Stacked, wide and signature logos in black and white, supplied by Stella John on 2026-10-09. Stored in `02_BRAND/logos/`. Traced to SVG with `trace_logos.py` (render check: 0 pixels differ by more than 50% from the PNG on the two VLNC marks, 3 of 62,298 on the signature).

## Generated in-project
Film grain is generated in CSS/SVG (`feTurbulence`), no external file. Orbit rings, nodes and rules are drawn in HTML/SVG.
