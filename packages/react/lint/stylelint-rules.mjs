// Basalt's own Stylelint rules, made from the Stylelint the caller loaded (so the rules and the linter are one copy, whoever installed it):
//
//   basalt/container-length  a length in an `@container` prelude. A container query cannot read a custom property, so its breakpoint is written as a
//                            number, and Stylelint's unit rules do not look inside an at-rule's parameters. The exception names the token it repeats:
//                            /* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px); a query cannot read a custom property */
//   basalt/no-restyle        an app's stylesheet setting appearance on Basalt's classes (`.basalt-*` as the subject of a selector), or setting a
//                            `--basalt-*` token. Layout (margin, placement, width, `display: none`) is allowed; so are the documented hooks. Only in an
//                            app's stylesheet: Basalt's own CSS draws these classes and does not use it.
//   basalt/hover-gate        a selector with `:hover` outside an `@media` whose query includes `(hover: hover)`. Hover paint is for a pointer that
//                            hovers (foundations, "Pointer and touch"): on a touch screen an ungated `:hover` stays painted after the finger lifts.
//                            Only in Basalt's own CSS (stylelint.config.mjs), not an app's. A rule that only removes or pins paint carries the exception:
//                            /* stylelint-disable-next-line basalt/hover-gate -- removes the hover wash while the keys are in use */
import { classify, effectiveSelectors, HOOKS, subjectClasses } from "./appearance.mjs";
import { restyleHint, sizeProp } from "./hints.mjs";
import { componentOfClass } from "./vocabulary.mjs";

/** Every CSS length unit that a person could write: font-relative, viewport, container, absolute. */
const LENGTH = /(?<![\w.#-])(?:\d+\.?\d*|\.\d+)(?:px|rem|em|rex|rch|rlh|ex|ch|cap|ic|lh|vw|vh|vi|vb|vmin|vmax|[sld]v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max)|cm|mm|q|in|pt|pc)\b/gi;

/**
 * The two rules, as Stylelint plugins.
 * @param {any} stylelint the loaded `stylelint` module
 * @param {{ vocabulary?: any, exception?: string }} [context] the installed Basalt (names the component and its props in messages), and the exception
 *   form the caller's comments use
 */
export function basaltRules(stylelint, context = {}) {
  const { utils } = stylelint;

  const containerName = "basalt/container-length";
  const containerMessages = utils.ruleMessages(containerName, {
    rejected: (value) => `Unexpected raw length "${value}" in @container (use a token, or disable this line with a reason that names the token it repeats)`,
  });
  const container = (primary) => (root, result) => {
    if (!utils.validateOptions(result, containerName, { actual: primary })) return;
    root.walkAtRules(/^container$/i, (atRule) => {
      for (const match of atRule.params.matchAll(LENGTH)) utils.report({ ruleName: containerName, result, message: containerMessages.rejected(match[0]), node: atRule, word: match[0] });
    });
  };
  container.ruleName = containerName;
  container.messages = containerMessages;
  container.meta = { url: "https://github.com/bmjcoding/basalt/blob/main/packages/react/lint/stylelint-rules.mjs" };

  const restyleName = "basalt/no-restyle";
  const restyleMessages = utils.ruleMessages(restyleName, {
    rejected: (selector, property, hint) => `"${selector}" sets ${property} on Basalt's part: ${hint}`,
    token: (property, hint) => `sets ${property}: ${hint}`,
  });
  const restyle = (primary, secondary) => (root, result) => {
    if (!utils.validateOptions(result, restyleName, { actual: primary }, { actual: secondary, possible: { hooks: [(v) => typeof v === "string"] }, optional: true })) return;
    // The release's manifest, read without a parser: the same sizes and names whoever runs the rule (stylelint-policy.mjs loads it).
    const vocabulary = context.vocabulary;
    if (!vocabulary) throw new Error("basalt/no-restyle needs the release's manifest: build it through basaltStylelintConfig (stylelint-policy.mjs)");
    const hooks = new Set([...HOOKS, ...(secondary?.hooks ?? [])]);
    const exception = context.exception ?? "stylelint-disable-next-line basalt/no-restyle -- <reason>";
    root.walkDecls((decl) => {
      const property = decl.prop;
      // A token set anywhere (`:root { --basalt-space-4: 18px }`, or on one box) changes Basalt's design for what it covers.
      if (property.startsWith("--basalt-") && !hooks.has(property)) {
        utils.report({ ruleName: restyleName, result, node: decl, word: property, message: restyleMessages.token(property, restyleHint(vocabulary, null, property, { className: "basalt-*", exception })) });
        return;
      }
      if (property.startsWith("--")) return;
      const selectors = effectiveSelectors(decl);
      for (const selector of selectors) {
        const basalt = subjectClasses(selector)[0].find((c) => c.startsWith("basalt-"));
        if (!basalt) continue;
        const component = componentOfClass(vocabulary, basalt);
        const sized = Boolean(component && sizeProp(vocabulary.components.get(component)));
        if (classify(property, decl.value, { sized, hooks }) !== "appearance") continue;
        const hint = restyleHint(vocabulary, component, property, { className: basalt, exception });
        utils.report({ ruleName: restyleName, result, node: decl, word: property, message: restyleMessages.rejected(selector, property, hint) });
        break;
      }
    });
  };
  restyle.ruleName = restyleName;
  restyle.messages = restyleMessages;
  restyle.meta = { url: "https://github.com/bmjcoding/basalt/blob/main/docs/consumer-lint.md" };

  const gateName = "basalt/hover-gate";
  const gateMessages = utils.ruleMessages(gateName, {
    rejected: (selector) => `"${selector}" paints on :hover outside @media (hover: hover) (gate it, split it from its focus or press half, or disable this line with a reason)`,
  });
  const HOVERS = /\(\s*hover\s*:\s*hover\s*\)/i;
  const gated = (node) => {
    for (let parent = node.parent; parent; parent = parent.parent) if (parent.type === "atrule" && /^media$/i.test(parent.name) && HOVERS.test(parent.params)) return true;
    return false;
  };
  const gate = (primary) => (root, result) => {
    if (!utils.validateOptions(result, gateName, { actual: primary })) return;
    root.walkRules((rule) => {
      // A keyframe's step is not a selector.
      if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
      if (!/:hover\b/i.test(rule.selector) || gated(rule)) return;
      utils.report({ ruleName: gateName, result, message: gateMessages.rejected(rule.selector.replace(/\s+/g, " ").slice(0, 120)), node: rule });
    });
  };
  gate.ruleName = gateName;
  gate.messages = gateMessages;
  gate.meta = { url: "https://github.com/bmjcoding/basalt/blob/main/docs/foundations.md" };

  return {
    containerLength: stylelint.createPlugin(containerName, container),
    noRestyle: stylelint.createPlugin(restyleName, restyle),
    hoverGate: stylelint.createPlugin(gateName, gate),
  };
}
