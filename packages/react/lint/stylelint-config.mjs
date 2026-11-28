// `@srasyndicate/basalt/stylelint-config`: Basalt's stylesheet policy as a shareable Stylelint config, for an app that runs Stylelint itself.
//
//   // stylelint.config.mjs
//   export default { extends: ["@srasyndicate/basalt/stylelint-config"] };
//
// It is the policy Basalt's own CSS follows (token-only colours, lengths and times; `basalt/container-length`) plus `basalt/no-restyle` (an app's CSS
// setting appearance on Basalt's classes or setting a `--basalt-*` token). The app needs `stylelint` as a dev dependency; `oxc-parser`, when the app
// has it, lets the messages name the component and its props. Exceptions use Stylelint's own comment, with a reason:
//   /* stylelint-disable-next-line basalt/no-restyle -- the reason */
import { loadModule } from "./resolve.mjs";
import { basaltStylelintConfig } from "./stylelint-policy.mjs";
import { loadVocabulary } from "./vocabulary.mjs";

const stylelint = await loadModule("stylelint");
let vocabulary = null;
try {
  vocabulary = loadVocabulary(await loadModule("oxc-parser"));
} catch {
  // Without the parser or a built package, the messages name the class and not the component; the rules are the same.
}

export default basaltStylelintConfig(stylelint, { restyle: true, vocabulary });
