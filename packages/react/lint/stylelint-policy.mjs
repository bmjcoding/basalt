// Basalt's stylesheet policy, in one place: Basalt's own lint (the repository's stylelint.config.mjs) and an app's (stylelint-config.mjs, and the
// `basalt-lint` command) are built from it, so the two never drift.
//
// Token-only CSS: colours, lengths and times come from --basalt-* tokens.
// A real exception is a disable comment on the line before, with a reason after "--":
//   /* stylelint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
// and, for a length inside an @container query (a query cannot read a custom property):
//   /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px) */
// A disable without a reason, or one that disables nothing, fails the lint.
//
// Units: px, the font-relative lengths (rem, em, ch, ex, cap, ic and their root forms; 1lh is allowed as the element's own line), the container units in type, the viewport units (vw, vh, vi, vb, vmin, vmax and their small, large and dynamic forms),
// the absolute units (cm, mm, q, in, pt, pc) and the time units (s, ms) are all raw. A colour function is raw in any case it is written in.
import { basaltRules } from "./stylelint-rules.mjs";
import { LENGTH_UNITS, TIME_UNITS } from "./values.mjs";
import { loadVocabulary } from "./vocabulary.mjs";

const CONTAINER = ["cqw", "cqh", "cqi", "cqb", "cqmin", "cqmax"];

/** The design-value rules: what Basalt's own CSS and an app's both follow. */
export const DESIGN_VALUE_RULES = {
  "color-no-hex": true,
  "color-named": "never",
  "function-disallowed-list": ["/^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/i"],
  // `1lh` stays allowed: it is the element's own line (a tap box centred on it), not a length of the design. The other font-relative units are raw.
  "unit-disallowed-list": [...LENGTH_UNITS, ...TIME_UNITS],
  // No type is set in a container unit (foundations, display type): art may be placed by its container, words are not sized by it.
  "declaration-property-unit-disallowed-list": { "/^(font|font-size|line-height|letter-spacing|word-spacing)$/": [...CONTAINER, "lh"] },
  "basalt/container-length": true,
};

/**
 * A Stylelint config object.
 * @param {any} stylelint the loaded `stylelint` module
 * @param {{ restyle?: boolean, hooks?: string[], vocabulary?: any, configurationComment?: string }} [options] `restyle`: add `basalt/no-restyle` (an app's
 *   CSS; never Basalt's own). `configurationComment`: the comment prefix (`basalt-lint` in the command, so one exception form covers JSX and CSS).
 */
export function basaltStylelintConfig(stylelint, options = {}) {
  const prefix = options.configurationComment ?? "stylelint";
  // The restyle rule reads the release's manifest (which classes are sized controls, and their props); Basalt's own lint has no restyle rule.
  const vocabulary = options.restyle ? options.vocabulary ?? loadVocabulary() : null;
  const rules = basaltRules(stylelint, { vocabulary, exception: `${prefix}-disable-next-line basalt/no-restyle -- <reason>` });
  return {
    reportDescriptionlessDisables: true,
    reportNeedlessDisables: true,
    reportInvalidScopeDisables: true,
    ...(options.configurationComment ? { configurationComment: options.configurationComment } : {}),
    plugins: options.restyle ? [rules.containerLength, rules.noRestyle] : [rules.containerLength],
    rules: { ...DESIGN_VALUE_RULES, ...(options.restyle ? { "basalt/no-restyle": options.hooks?.length ? [true, { hooks: options.hooks }] : true } : {}) },
  };
}
