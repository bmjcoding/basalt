// `@srasyndicate/basalt/stylelint-config`: Basalt's stylesheet policy as a shareable Stylelint config, for an app that runs Stylelint itself.
//
//   // stylelint.config.mjs
//   export default { extends: ["@srasyndicate/basalt/stylelint-config"] };
//
// It is the policy Basalt's own CSS follows (token-only colours, lengths and times; `basalt/container-length`) plus `basalt/no-restyle` (an app's CSS
// setting appearance on Basalt's classes or setting a `--basalt-*` token). The app needs `stylelint` as a dev dependency and nothing else: what it
// knows of the components (their names, props and sizes) is the release's own dist/lint-manifest.json, the same contract `basalt-lint` reads.
// Exceptions use Stylelint's own comment, with a reason:
//   /* stylelint-disable-next-line basalt/no-restyle -- the reason */
import { loadModule } from "./resolve.mjs";
import { basaltStylelintConfig } from "./stylelint-policy.mjs";

export default basaltStylelintConfig(await loadModule("stylelint"), { restyle: true });
