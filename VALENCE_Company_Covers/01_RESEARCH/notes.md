# Research notes

## Platform specifications (checked 2026-10-09)

| Platform | Official figure | Source | What we built |
|---|---|---|---|
| LinkedIn Page cover | 1512 x 256 px (min and recommended), PNG or JPEG, max 3 MB, JPEG preferred. Keep key details central and away from edges, especially the lower-right corner. | LinkedIn Help, "Image specifications for your LinkedIn Pages and Career Pages" (https://www.linkedin.com/help/linkedin/answer/a563309) | 1920 x 325 CSS px at 2x = **3840 x 650** (5.91:1, same ratio as 1512 x 256) |
| Facebook Page cover | Computer 16:9, mobile 2.4:1, min 400 x 150. Fastest load: sRGB JPG 851 x 315 under 100 KB. Profile picture covers part of the left, overlap about 40 px on mobile. | Facebook Help, "Page profile picture and cover photo dimensions" (https://www.facebook.com/help/125379114252045) | 16:9 master **3840 x 2160**. All key content inside the centred 2.7:1 band (y 184 to 896 at 1920 x 1080) so it survives the 2.4:1 mobile crop and the legacy 851 x 315 crop. Lower-left kept clear for the profile picture. |
| YouTube channel art | Recommended 2560 x 1440, min 2048 x 1152, max 6 MB. Safe area for text and logos 1235 x 338 at the minimum size. | YouTube Help, "Manage your channel branding" (https://support.google.com/youtube/answer/10456525) | **2560 x 1440 (2K)** and **3840 x 2160 (4K)**. Safe area scaled to 1546 x 423 at 2560 x 1440 (1235/2048 = 1546/2560). Desktop shows the full-width 423 px band, tablet 1855 px, mobile 1546 px, TV the whole canvas. |

### Discrepancies found
- LinkedIn: many guides still quote 1128 x 191 (old) and one search snippet quoted 4200 x 700. The live help page says 1512 x 256. We follow the live page. All three share a ratio of about 5.9 to 6:1, so a 3840 x 650 file crops cleanly under any of them.
- YouTube: guides quote safe area as 1546 x 423, 1546 x 338 or 1235 x 338. These are the same area at different canvas sizes, once scaled.
- Facebook: the help page is dated and describes a desktop display of 16:9 while most guides still say 820 x 312. We designed to pass all three crops. Re-test in Meta Business Suite preview before publishing.
- LinkedIn and Facebook both overlay the profile picture on the cover. The approximate zones drawn in QC are estimates, not official figures.

## Imagery
Searched NASA Image and Video Library (images.nasa.gov) for elemental, abstract aerial imagery that fits the deck's "elemental texture / blurred motion" direction without stock clichés. Shortlisted eight Landsat and MODIS images; chose two at 7000+ px so they hold at 4K. Contact sheet: `visual_research/nasa_candidates_sheet.jpg`.

Rejected: Bahamas sand (750 px, too small), orange dune field (right colour for Verve but only 2048 px, would need upscaling), phytoplankton swirl off South Africa (1200 px, would only work blurred).

## Open questions
- Direction choice (A, B or C), or a hybrid.
- Whether the "Fig. 01" Landsat caption in B stays. It is a factual credit, not required.
- Profile avatar for each platform (suggest stacked VLNC on Onyx).
