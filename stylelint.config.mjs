// Token-only component CSS: colours and lengths come from --basalt-* tokens.
// A real exception is a disable comment on the line before, with a reason after "--":
//   /* stylelint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
// A disable without a reason, or one that disables nothing, fails the lint.
export default {
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
    "unit-disallowed-list": ["px"],
  },
};
