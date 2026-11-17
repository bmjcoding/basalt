// Token-only component CSS: colours, lengths and times come from --basalt-* tokens.
// A real exception is a disable comment on the line before, with a reason after "--":
//   /* stylelint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
// and, for a length inside an @container query (a query cannot read a custom property):
//   /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px) */
// A disable without a reason, or one that disables nothing, fails the lint.
//
// Units: px, the font-relative lengths (rem, em, ch), the viewport units (vw, vh, vi, vb, vmin, vmax and their small, large and dynamic forms),
// the absolute units (cm, mm, q, in, pt, pc) and the time units (s, ms) are all raw. A colour function is raw in any case it is written in.
const VIEWPORT = ["vw", "vh", "vi", "vb", "vmin", "vmax"].flatMap((unit) => [unit, `s${unit}`, `l${unit}`, `d${unit}`]);

export default {
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  plugins: ["./scripts/stylelint-container-lengths.mjs"],
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/i"],
    "unit-disallowed-list": ["px", "rem", "em", "ch", ...VIEWPORT, "cm", "mm", "q", "in", "pt", "pc", "s", "ms"],
    "basalt/container-length": true,
  },
};
