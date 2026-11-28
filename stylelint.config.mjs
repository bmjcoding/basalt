// Basalt's own stylesheet lint: the policy in packages/react/lint/stylelint-policy.mjs (token-only colours, lengths and times, and
// basalt/container-length), the same one an app gets from `@srasyndicate/basalt/stylelint-config`, without the app's `basalt/no-restyle`
// (Basalt's own CSS is what draws its classes). A real exception is a disable comment on the line before, with a reason after "--":
//   /* stylelint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
//   /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px) */
// A disable without a reason, or one that disables nothing, fails the lint.
import stylelint from "stylelint";

import { basaltStylelintConfig } from "./packages/react/lint/stylelint-policy.mjs";
import { basaltRules } from "./packages/react/lint/stylelint-rules.mjs";

// basalt/hover-gate is Basalt's own (not in an app's config): hover paint in React's and the skill's sheets sits under @media (hover: hover)
// (foundations, "Pointer and touch"). The sites' sheets are their own and are not swept this round.
const policy = basaltStylelintConfig(stylelint);
export default {
  ...policy,
  plugins: [...policy.plugins, basaltRules(stylelint).hoverGate],
  overrides: [{ files: ["packages/react/src/styles/**/*.css", "tools/html-skill/src/**/*.css"], rules: { "basalt/hover-gate": true } }],
};
