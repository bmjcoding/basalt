// A container query cannot read a custom property, so its breakpoint is written as a number (range syntax). Stylelint's unit rules do not look inside an
// at-rule's parameters, so this rule does: a length in an `@container` prelude is a raw length, and needs a lint exception that names the token it
// repeats, the same exception comment as any other raw length:
//   /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px); a query cannot read a custom property */
import stylelint from "stylelint";

const ruleName = "basalt/container-length";
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (value) => `Unexpected raw length "${value}" in @container (use a token, or disable this line with a reason that names the token it repeats)`,
});

// Every CSS length unit that a person could write: font-relative, viewport, container, absolute.
const LENGTH = /(?<![\w.#-])(?:\d+\.?\d*|\.\d+)(?:px|rem|em|rex|rch|rlh|ex|ch|cap|ic|lh|vw|vh|vi|vb|vmin|vmax|[sld]v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max)|cm|mm|q|in|pt|pc)\b/gi;

const ruleFunction = (primary) => (root, result) => {
  if (!stylelint.utils.validateOptions(result, ruleName, { actual: primary })) return;
  root.walkAtRules(/^container$/i, (atRule) => {
    for (const match of atRule.params.matchAll(LENGTH)) {
      stylelint.utils.report({ ruleName, result, message: messages.rejected(match[0]), node: atRule, word: match[0] });
    }
  });
};
ruleFunction.ruleName = ruleName;
ruleFunction.messages = messages;
ruleFunction.meta = { url: "https://github.com/bmjcoding/basalt/blob/main/scripts/stylelint-container-lengths.mjs" };

export default stylelint.createPlugin(ruleName, ruleFunction);
