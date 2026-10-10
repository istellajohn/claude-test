# Documentary integrity

For civic events, protests, police interactions and any real-world footage, set `documentary_mode` (project settings).

**Enforced by the engine**
- Originals are read, never written. Uploads refuse to overwrite an existing file.
- Speed ramps, freezes and optical-flow interpolation on `factual_incident` clips need an `integrity_note`; `mci` interpolation is refused outright.
- `rough-cut` keeps footage in source order in documentary mode.
- Every final export writes an EDL (CMX 3600) and `source_map.json` recording the source file and timecode of every shot.
- Shot logs use the file's own timecode and (when embedded) its start timecode.

**Not enforceable by software, so the editor's duty**
- Do not cut footage into an order that implies causation that did not exist, or change the sequence of an incident in a way that misleads.
- Do not fabricate dialogue, captions, incidents or generated footage; label any reconstruction as such.
- Attribute disputed claims in captions; do not present allegations as findings. `Stamp` and captions can carry the attribution.
- Consider the safety of identifiable people, minors and vulnerable individuals before publishing faces, names, places or timestamps.
- Never change someone's words to make a stronger caption. The caption engine only changes how a word is set (`emph`).
