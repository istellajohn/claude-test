# DESIGN SYSTEM: Email signatures v01

| Token | Value | Use |
|---|---|---|
| Ink | `#0A0A0A` (Onyx) | name, contact text |
| Mute | `#6E6B66` | role, secondary links |
| Faint | `#A6A39E` (Stone) | labels, "(Nirmala)" |
| Verve | `#E35A2A` | the only accent: 24 x 2 rule (Ledger), `/` separators |
| Rule | `#DEDBD5` | vertical hairline (Lockup) |
| Gold | `#C8A24C` | signature, inside the band image only |

| Element | Spec |
|---|---|
| Name | 15px bold sans, line 20 (Ledger, Lockup); 20px Georgia, line 24, -0.2px (Editorial) |
| Role | 12px sans, line 17 (Ledger, Lockup); 9.5px uppercase, 1.5px tracking (Editorial) |
| Contact | 12px sans, line 19 |
| Labels (Ledger) | 9px uppercase, 1.6px tracking, column 74px |
| Images | tile 60x60, plate 84x26, band 340x52; all @3x, solid Onyx ground |
| Max width | 340px (fits a 375px phone with Gmail's margins) |

Options: 1 Ledger (text-led, editorial index), 2 Lockup (tile + hairline), 3 Editorial (serif name + gold signature band), 4 Reply (two lines, no images).

## v02 card system
Card 400 x 200 CSS px, exported @3x (1200 x 600). 3D field x 0 to 164, text column from x 164.

| Layer | Font | Size / tracking | Obsidian | Plaster | Gold Leaf |
|---|---|---|---|---|---|
| Autograph | Herr Von Muellerhoff | 40px | Bone `#F3F2EF` | Onyx `#0A0A0A` | Gold `#D9B565` |
| Typed name | General Sans Medium | 7.8px, 0.24em caps | `#8C8984` | `#7A766F` | `#8C8984` |
| Role | Cormorant Garamond Italic 500 | 14.5px / 17 | `#CFCBC4` | `#3A3835` | `#CFCBC4` |
| Rule | 1px, first 18px Verve `#E35A2A` | 206px | Bone 14% | Onyx 13% | Gold 22% |
| Contacts | General Sans Regular | 10.4px / 17 | `#E8E5DF` | `#1C1B1A` | `#E8E5DF` |

Materials: Obsidian clearcoat black under a gradient strip softbox and an orange side panel; Plaster roughness 0.92 relief under raking light; Gold metalness 1, roughness 0.2. Shadow-only ground (no floor glare), vignette and film grain on top.
