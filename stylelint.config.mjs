// Token-only component CSS: colours, lengths and times come from --basalt-* tokens.
// A real exception is a disable comment on the line before, with a reason after "--":
//   /* stylelint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
// and, for a length inside an @container query (a query cannot read a custom property):
//   /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px) */
// A disable without a reason, or one that disables nothing, fails the lint.
//
// Units: px, the font-relative lengths (rem, em, ch, ex, cap, ic and their root forms; 1lh is allowed as the element's own line), the container units in type, the viewport units (vw, vh, vi, vb, vmin, vmax and their small, large and dynamic forms),
// the absolute units (cm, mm, q, in, pt, pc) and the time units (s, ms) are all raw. A colour function is raw in any case it is written in.
const VIEWPORT = ["vw", "vh", "vi", "vb", "vmin", "vmax"].flatMap((unit) => [unit, `s${unit}`, `l${unit}`, `d${unit}`]);
const CONTAINER = ["cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax"];

export default {
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  plugins: ["./scripts/stylelint-container-lengths.mjs"],
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/i"],
    // `1lh` stays allowed: it is the element's own line (a tap box centred on it), not a length of the design. The other font-relative units are raw.
    "unit-disallowed-list": ["px", "rem", "em", "ch", "rlh", "ex", "rex", "cap", "rcap", "ic", "ric", "rch", ...VIEWPORT, "cm", "mm", "q", "in", "pt", "pc", "s", "ms"],
    // No type is set in a container unit (foundations, display type): art may be placed by its container, words are not sized by it.
    "declaration-property-unit-disallowed-list": { "/^(font|font-size|line-height|letter-spacing|word-spacing)$/": [...CONTAINER, "lh"] },
    "basalt/container-length": true,
  },
};
