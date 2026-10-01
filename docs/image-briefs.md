# VALENCE · Photographic briefs

Eleven photographs for the practice pages and the Journal. Each has a placement on the site already: until the file exists, the page shows a labelled frame with the brief inside it. Save the image as `assets/img/stills/<id>.jpg`, run `python3 tools/build.py`, and the label is replaced by the photograph.

The briefs were written against the three reference boards (cinema and nature, cosmic and nature, cosmic and cinema) and the film-photography pins sent with them.

## How the photographs belong together

The references split into two kinds of picture. One kind is observed: 35mm film of a person alone at a diner window, on a train, in a doorway, lit by one lamp or one low sun. The other kind is dreamlike: a person very small under something very large, a moon or a planet, or a rectangle of light standing in a dark field. The site needs both, and the existing generated images (the eye, the profile smear, the star trails, the moonrise, the limb) all sit at the dreamlike end. So most of these eleven are observed pictures with the cosmic element placed inside the frame: stars in a reflection, a moon too large for the sky, a cinema screen in a field, a ring of light thrown by a glass of water, the first crescent after the new moon.

Six rules hold the set together.

1. **One light source per frame.** A lamp, sun broken by leaves, a marquee, a projector, the last sun, the moon. Each page has its own light.
2. **Mostly dark, never black.** At least half of every frame sits in shadow, and the shadow keeps its detail. Text never sits on these photographs. Long passages stay beside them, not over them.
3. **Human scale is a decision.** Close (hands, a page), near (a face) or very far (a figure under a twentieth of the frame). Nothing at the middle distance, which is where stock photography lives.
4. **Film, not digital.** Grain, a little halation around bright points, highlights that roll off before white, skin with pores and lines. No retouching beyond dust.
5. **India as it is lived, not decorated.** Monsoon on glass, a touring cinema, a single-screen theatre, a long-distance train, a glass of cutting chai. No marigolds, no sari in a mustard field, no monuments.
6. **What stays out.** Readable text and logos, pushed teal-and-orange grading, lens-flare filters, neon pink and violet gradients, astronauts, symmetry for its own sake, smiling at the camera, the waxy skin generators default to.

### Palette

| Role | Colour | Where it comes from |
| --- | --- | --- |
| Shadow floor | `#0d0f10` | Never pure black. The darkest point in a frame should still show texture. |
| Teal-ink shadow | `#13232a` | The diner and train pins, the red-portal forest |
| Blue hour | `#22384a` | The fjord, the lamp in the mountains, the rainy windows |
| Tungsten and last sun | `#c98046` | Window light, marquee bulbs, the beach flare |
| Cinema red, sparingly | `#b8392a` | The empty red seats, neon. One small area per frame at most. |
| Moss and sage | `#4f5a3c` / `#8f9a7a` | The green fields, the ferns, the sage chart |
| Paper and skin highlight | `#e9dcc6` | Never brighter than this outside a light source |

### Each page's temperature

| Page | Light | Why |
| --- | --- | --- |
| Home | night, then day, then blue hour | The page moves through a day: the 2am note, the afternoon portrait, the city at blue hour |
| Work | dusk | The close is about scale and what the work makes possible |
| Disciplines | night | One beam of light carrying an idea across a field |
| How we work | dusk | The hour when the day's material is spread out and looked at again |
| About | night, then dusk | Cinema following you out, then the person behind the practice |
| Contact | dusk | In transit, thinking |
| The Letter | night | The new moon |
| Conversations | late afternoon | Warmth and attention across a table |

## Making them in Midjourney

- Use the current model with `--style raw` so it follows the prompt rather than its own taste, and keep `--s` (stylize) between 50 and 150 as given.
- **Lock the grade with style references.** Upload four of your pins and add them to every prompt as `--sref <url1> <url2> <url3> <url4> --sw 120`. The four that carry the whole world between them: *Diner at 2AM* (night interiors), the figure on the beach with the sun flare (halation, dusk), the figure on the green field under the Earth horizon (scale) and the glowing doorway in the dark field (light as an object). Once one result feels right, use that image as the `--sref` for the rest.
- **Wide frames need a second, phone version.** The site crops 21:9 and 16:9 frames to 4:5 on phones. Cropping a wide image that hard usually loses the subject, so each wide brief has a phone line: swap it into the prompt, generate at `--ar 4:5`, and save as `<id>-m.jpg`. The build uses it automatically on screens under 560px.
- **Files.** sRGB JPEG, quality around 80. Long edge 2400px for wide frames, 1600px for 4:5.
- **Grade check before dropping one in.** The darkest point should not be pure black, nothing but a light source should clip, and saturation should sit a touch under natural. If a result comes out glossy, a light pass in Lightroom fixes most of it: Blacks +15, Highlights −30, Saturation −10, shadows split-toned toward teal (hue 200, saturation 10), grain 20 at size 15.

---

## H-01 · 2am, monsoon on the glass
`home-rain` · Home, beside "Sometimes the clearest brief is the detail that keeps bothering you." · 4:5 on desktop and phone · night

**Why here.** The section is about the unease that comes before a brief: the photograph you cannot find yourself in, the sentence you would never say that way. The crossed-out line is that feeling made visible, and 2am is when it usually arrives.

**Keep.** The page in the lower third, sharp. Everything beyond the glass soft.

```
close photograph of a notebook lying open on a windowsill at 2am during the Mumbai monsoon, one handwritten sentence crossed out and rewritten beneath it, the handwriting too small to read, a small glass of cutting chai gone cold beside it, rain running down the window, beyond the glass the city dissolved into blue-grey rain with a few soft sodium and red lights, one small tungsten lamp lighting only the page, deep teal shadows that keep their detail, shot low at 50mm f/2, the page and the nearest raindrops sharp, 35mm film photograph, CineStill 800T, faint red halation around the lights, fine grain, unstaged --ar 4:5 --style raw --s 60 --no people, logo, watermark, candles, heart-shaped bokeh, oversaturated colour
```

## H-02 · Half in leaf shadow
`home-dapple` · Home, beside "The work should feel familiar to the person it is for." · 4:5 · day

**Why here.** The section is about writing in somebody else's voice. A face half in light and half in moving shade is how a person first arrives: partly legible. The work is learning the rest. It is also the only full daylight on the home page, so it sits between two night frames.

**Keep.** Eyes on the upper third. The shadow side of the face still has detail.

```
portrait of a South Asian man in his late forties standing beside an open window in late afternoon, sunlight broken by the leaves of a tree outside, leaf shadows falling across half his face and one shoulder, he looks just past the lens, thoughtful, not smiling, greying stubble, natural skin with visible pores and lines, plain cotton shirt in faded ink blue, the room behind him falling into deep shadow, warm sun on skin against cool shade, out-of-focus olive and moss greens at the edge of the frame, head and shoulders, eyes on the upper third, 85mm lens at f/2, 35mm film photograph, Kodak Portra 400, soft halation on the brightest highlights, fine grain, shadows keep their detail --ar 4:5 --style raw --s 50 --no retouched skin, glamour lighting, studio backdrop, smile, text
```

## H-03 · A city in the water
`home-reflection` · Home, the Journal, under "A question about a film can become a conversation about a city" · 21:9 desktop, 4:5 phone · night

**Why here.** The Journal paragraph describes a conversation widening: from a film, to a city, to the person someone was before. The reflection does the same thing in one picture. The city loosens in the water until it becomes sky.

```
wide photograph of a coastal city at blue hour reflected in perfectly still water, the skyline a thin dark band across the middle of the frame, in the reflection below the city lights stretch, scatter and loosen until they become a field of stars, a faint band of the Milky Way continuing down into the water, mist lying low on the surface, deep ink-blue sky turning teal near the horizon, a few warm sodium lights, no boats, no people, long exposure, medium format film photograph, fine grain, restrained contrast, shadow detail kept --ar 21:9 --style raw --s 120 --no fireworks, neon pink, lens flare, HDR, text
```

**Phone version** (`home-reflection-m.jpg`): replace the composition with *the skyline a thin dark band across the upper third, the reflection and its stars filling the lower two thirds*, and use `--ar 4:5`.

## W-01 · A figure under a very large moon
`work-field` · Work, above "Tell us what you would like to make possible." · 21:9 desktop, 4:5 phone · dusk

**Why here.** After a page of finished projects, the close asks what someone would like to make possible. The picture answers with scale: what a piece of work opens up is always larger than the person who asked for it, and the person is still standing in it.

```
wide photograph of an open field of tall dry grass at dusk, a single person standing waist-deep in the grass seen from behind, very small in the frame, left of centre, an enormous full moon rising on the horizon, many times its natural size, filling a third of the sky, its surface soft in the haze, last amber light catching the tips of the grass, the sky above already blue, wind moving the grass with slight motion blur while the figure stays still, shot from low in the grass with a long lens, 35mm film photograph, fine grain, gentle halation at the edge of the moon, shadow detail kept --ar 21:9 --style raw --s 150 --no fantasy costume, castle, wolf, star overlay, text
```

**Phone version** (`work-field-m.jpg`): *the moon filling the upper half, the figure small in the lower third, slightly left*, `--ar 4:5`.

## D-01 · A screen in a field
`disc-screen` · Disciplines, under "An idea changes as it moves between an image and a story." · 16:9 desktop, 4:5 phone · night

**Why here.** The page is about an idea moving between forms. A projector beam is literally that: light crossing the air and becoming a story for the people in front of it. The touring cinema (tent talkies at village fairs) is a real Indian memory, so the most dreamlike image on the practice pages is also a documentary one. It answers the glowing doorways and portals on the cosmic-cinema board without borrowing them.

```
night photograph of a touring cinema in a rural field in Maharashtra, India, a large white cloth screen stretched between two bamboo poles glowing with blank white light, a projector beam crossing low ground mist from a small tent at the left edge of the frame, a handful of people sitting on the ground watching, small dark shapes seen from behind, the screen's light falling across the grass and lighting the mist, dark open sky with faint stars, the screen is the only light source, teal-black shadows, warm white light, long exposure with slight blur on anyone moving, 35mm film photograph, CineStill 800T, halation around the edges of the screen, fine grain --ar 16:9 --style raw --s 120 --no image on the screen, text, logo, city lights, fireworks
```

**Phone version** (`disc-screen-m.jpg`): *the screen in the upper middle of the frame, the beam rising from the lower left, the viewers along the bottom edge*, `--ar 4:5`.

## M-01 · Dusk reaches the worktable
`how-dusk` · How we work, under "We begin with the things that rarely make it into a brief." · 16:9 desktop, 4:5 phone · dusk

**Why here.** The lede names the image you keep returning to and the line you always change. Both are on the table: one frame circled on the contact sheet, one line rewritten in the notes. Dusk entering a workspace is the hour the day's material gets looked at again.

```
photograph of a worktable in a small studio at dusk, the last low sun entering through a window and lying across the table in a single long amber band, contact sheets with one frame circled in red grease pencil, a loupe resting on them, a pencil, handwritten notes with one line rewritten, a pressed leaf, dust visible in the beam, the rest of the room already gone blue, a chair pushed back as if someone has just stood up, shot from standing height at a slight angle, 35mm lens at f/2.8, focus on the loupe and the circled frame, Kodak Portra 400, fine grain, highlights rolled off, shadows keep their detail --ar 16:9 --style raw --s 60 --no people, laptop, phone, potted plant, legible text
```

**Phone version** (`how-dusk-m.jpg`): *tighter on the loupe and the circled frame, the amber band crossing the frame diagonally*, `--ar 4:5`.

## A-01 · Out of the cinema, after rain
`about-cinema` · About, directly under "Cinema has a way of following you out of the room." · 21:9 desktop, 4:5 phone · night

**Why here.** The opening paragraph describes leaving with an image that changes how the street looks. This is that moment, one step past the door. The single-screen theatre keeps it in Mumbai without saying so.

```
night street photograph outside an old single-screen cinema in Mumbai just after rain, a woman stepping out through the doors onto the wet pavement, caught mid-step, still half inside the lobby light, she is small in the frame, right of centre, looking up at the street as if still inside the film, marquee bulbs and one red neon sign reflected in long streaks across the wet ground toward the camera, the street beyond in teal darkness, a few passers-by blurred, 35mm film photograph, CineStill 800T, red halation around the neon, slight motion blur, fine grain, shadows keep their detail --ar 21:9 --style raw --s 80 --no readable signage, film posters, logos, crowd, umbrella
```

**Phone version** (`about-cinema-m.jpg`): *she stands on the right third, the reflections leading up toward her from the bottom of the frame*, `--ar 4:5`.

## A-02 · Stella John, at dusk
`about-stella` · About, beside the founder's note · 4:5 · dusk · **to be photographed, not generated**

**Why here.** A founder's note needs the founder's face, and the face should belong to the same world as everything around it. A generated likeness would undo the note.

Brief for the photographer:

- **Where.** Stella's studio or home, by a west-facing window.
- **When.** The twenty minutes after the sun drops behind the buildings.
- **Light.** The window only. No fill, or a very weak bounce. Let the far side of the face fall into shadow that keeps its detail.
- **Frame.** 4:5 vertical, three-quarter length or closer, eyes on the upper third, room around her.
- **Hands.** A camera (a film body if she has one) or a notebook, held rather than presented.
- **Expression.** Mid-thought, or about to speak. Looking away from the lens, or at it for one frame only.
- **Lens.** 50mm or 85mm at f/2 to f/2.8. Portra 400 or 800 on film; on digital, grade to the palette above.
- **Wardrobe.** One colour from the palette (ink, moss or rust), no pattern.
- **Retouching.** Dust only.

## C-01 · A train window at dusk
`contact-train` · Contact, under "Tell us what has taken up room in your head." · 4:5 · dusk

**Why here.** The thing taking up room in your head is usually layered over whatever you happen to be looking at. In a train window at dusk, the reflection and the fields outside occupy the same glass. It sits beside the form, so it has to be calm.

```
photograph inside an Indian long-distance train at dusk, a woman in her thirties in profile beside the window, a closed notebook on her lap, thinking, her reflection and the passing fields layered in the glass, fields and electric poles streaking past with motion blur, the last orange light outside, the carriage in cool blue-green shadow, her face lit softly by the window, her face on the left third, shot from the seat opposite with a 50mm lens at f/1.8, focus on her eye, 35mm film photograph, Kodak Portra 800, halation in the window highlights, fine grain, natural skin --ar 4:5 --style raw --s 60 --no smartphone, headphones, smiling, glamour makeup, text
```

## L-01 · A letter and the first crescent
`letter-sill` · The Letter, beside "When the moon begins again, we send a letter." · 4:5 · night

**Why here.** The letter goes out at the new moon, which cannot be seen. The thin crescent a day later is the first visible sign that the month has begun again. It is accurate astronomy and it is the page's whole idea.

```
still life photograph of a folded handwritten letter resting on a wooden windowsill at night, beyond the glass a deep blue sky with the thin crescent moon of the first evening after the new moon, low in the window, a lamp out of frame warming the paper, a little condensation at the bottom of the glass, the room dark, the fold of the paper in focus in the lower half, the moon soft but clearly a crescent, 50mm lens at f/2, 35mm film photograph, fine grain, shadow detail kept --ar 4:5 --style raw --s 70 --no candle, roses, wax seal, full moon, legible text
```

## J-01 · Between two people
`conv-table` · Conversations, above the list, after "People become interesting in the particulars." · 21:8 desktop, 4:5 phone · late afternoon

**Why here.** The Journal's conversations are about the habit a person cannot account for and the example they reach for mid-sentence. Those are often in the hands. The recorder says what kind of conversation this is without a caption. The ring of light thrown by the water glass is the cosmic element: a real caustic that echoes the orbit lines drawn across the site.

```
photograph of two people across a small café table in late afternoon, seen only from the shoulders down, one person's hand caught mid-gesture explaining something, the other person's hands resting around a cup, a small audio recorder and an open notebook between them, low sun through the window crossing the table, a glass of water throwing a bright ring of refracted light onto the tabletop, warm natural skin, muted moss green and terracotta in the soft background, shot at table height with a 35mm lens at f/2, Kodak Portra 400, fine grain, unposed --ar 21:8 --style raw --s 60 --no faces, laptop, phone, latte art, legible text
```

**Phone version** (`conv-table-m.jpg`): *tighter on the gesturing hand, the recorder and the ring of light*, `--ar 4:5`.

---

## When a photograph lands

1. Save it as `assets/img/stills/<id>.jpg` (and `<id>-m.jpg` for the phone version of a wide frame).
2. Run `python3 tools/build.py`.
3. Look at it on a desktop, on a phone and on the Day side. If the subject drifts out of the phone crop, adjust `focus_m` for that id in `tools/stills.json` (an `object-position`, for example `40% 55%`) and rebuild.
4. Write the alt text from the photograph you actually got, not the brief. Edit `alt` in `tools/stills.json`.
