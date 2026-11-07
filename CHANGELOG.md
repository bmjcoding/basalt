# Changelog

## Unreleased

The mineral redesign. Visual, and breaking where a token name or a resolved colour changed.
Component props are additive: existing variants, sizes and behaviour stay.

### Breaking

- The achromatic neutral ramp is gone. Removed `--basalt-neutral-0`, `4`, `7`, `9`, `30`,
  `36`, `52`, `63`, `64` and `96`. New steps are named by OKLCH lightness × 100
  (`neutral-13` through `neutral-100`). Hue is 95. See [docs/brands.md](docs/brands.md).
- `--basalt-white-38` is `--basalt-white-46` (alpha 0.46). `--basalt-black-45` is
  `--basalt-black-50` (alpha 0.50). Input boundaries needed the extra ink on the new surfaces.
- `border-focus` follows `accent-text` instead of secondary text.
- Danger, warning and success moved off ember. Danger is rose (hue 8). Warning is yellow.
  Success stays green at a slightly different lightness. Light syntax colours are a step
  darker so they still clear 4.5:1 on the deeper paper wells.
- `surface-page` is no longer `#000` / `#fafafa`. Raised, overlay and top are no longer the
  same colour in light, and sunken is no longer raised in the dark.
- Swift `Basalt.Colors` gained the accent, chart and pressed-primary colours, and dropped the
  removed neutral primitives (primitives were not emitted as Swift colours). `Basalt.Brands`,
  `Basalt.N1` and `Basalt.Tracking` are new. `TypeScale.label` is new.

### Added

- Accent roles and `data-brand`: `basalt` (default), `sra`, `blacksand`, `n1`, `portfolio`.
- N1: `--basalt-accent-h` at fixed lightness and chroma. Swift: `Basalt.N1.color`.
- `Button` variant `accent`. Pressed colours for primary and accent. Press is 80ms.
- `Spinner` variants `ring` (default), `dots` and `braille`.
- `NumberTicker`, `Eyebrow`, `BrandSurface`, `ChartGrammar`. `Text` prop `tabular`.
- Chart tokens and the week-of-load grammar.
- Motion: `duration-press` 80ms, `duration-tick` 70ms, `duration-spin` 640ms, `duration-fade` 1200ms, `ease-linear`.
- Display specimens: Instrument Serif, Newsreader, Fraunces. Not the default.
- Review round 8, with a brand switch and a light/dark toggle on every round.

### Unchanged on purpose

- The type scale was not collapsed. 12 and 13 serve captions and compact controls. 18 and 20
  are adjacent; a view should not use both. Removing a step would break `Text` sizes for a
  gain the density system still needs.
- Field labels stay sentence-case Geist. The uppercase mono label is `Eyebrow`, for the
  instrument column, not for every input.
- Primary stays the neutral action. Accent does not replace it.
- shadcn's `--accent` still maps to the hover wash, not Basalt's product accent. The product
  accent is `--basalt-accent`.
