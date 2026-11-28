// Basalt's own stylesheet lint: the policy in packages/react/lint/stylelint-policy.mjs (token-only colours, lengths and times, and
// basalt/container-length), the same one an app gets from `@srasyndicate/basalt/stylelint-config`, without the app's `basalt/no-restyle`
// (Basalt's own CSS is what draws its classes). A real exception is a disable comment on the line before, with a reason after "--":
//   /* stylelint-disable-next-line unit-disallowed-list -- the 1px clip of the visually-hidden pattern */
//   /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px) */
// A disable without a reason, or one that disables nothing, fails the lint.
import stylelint from "stylelint";

import { basaltStylelintConfig } from "./packages/react/lint/stylelint-policy.mjs";

export default basaltStylelintConfig(stylelint);
