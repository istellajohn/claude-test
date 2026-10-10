# Design system

Data, not decoration. Everything here is read by the engine at render time.

- `typography/`: vendored open-licence fonts (SIL OFL 1.1, licence files alongside). Instrument Serif (editorial display), Hanken Grotesk (text and impact), DM Mono (timecodes, stamps).
- `colour/palette.json`: default tokens. Each project overrides them in `09_motion_graphics/visual_system.json`.
- `components/caption-styles.json`: the four caption treatments.
- `transitions/transitions.json`: the transition vocabulary the engine actually implements. If it is not listed there, it does not exist.
- `motion-presets/type-presets.json`: Remotion typography presets.

Nothing in the design system is applied automatically to a new project's creative decisions. A protest documentary should not inherit a perfume film's palette.
