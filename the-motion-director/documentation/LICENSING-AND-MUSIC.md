# Licensing and music

- Spotify is a discovery and reference platform. The engine never downloads, records or extracts audio from it, and Spotify availability is not evidence of Instagram or sync licensing.
- A shortlist entry needs title, artist, Spotify link and the reasoning for the track. `instagram_status` and `licence_status` default to `NOT VERIFIED`.
- `AVAILABLE IN INSTAGRAM LIBRARY (verified)` requires the date, the region and the account type it was checked from.
- `LICENSED_EMBEDDABLE` requires a real file in `16_licences/` (licence, invoice, grant). Only then may a music layer (`kind: music_licensed`, linked by `track_id`) enter a final export.
- `music_guide` layers play in previews and never in finals. Each final export includes `MUSIC_NOTES.md`: where in the video the track begins, which section of the song to select, and the checks to make before using Instagram's native audio.
- Instagram's music permissions depend on account type (personal, creator, business), commercial or branded use, boosting, and country. They cannot be verified from here; they must be checked from the publishing account against the live library on the day of posting.
- Fonts are SIL OFL 1.1 (licences in `design-system/typography/`). Check the licence of any additional font before using it.
