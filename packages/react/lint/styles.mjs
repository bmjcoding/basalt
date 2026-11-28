// The consumer lint over an app's stylesheets: Basalt's Stylelint policy (stylelint-policy.mjs) with `basalt/no-restyle`, run through the app's
// Stylelint, its messages given the token by role; and, from the same files, what each of the app's classes sets, so a `className` on a Basalt
// component can be classified in source.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { subjectClasses } from "./appearance.mjs";
import { resolvePackage } from "./resolve.mjs";
import { basaltStylelintConfig } from "./stylelint-policy.mjs";
import { rawValues } from "./values.mjs";
import { suggest } from "./vocabulary.mjs";

/** Stylelint's design-value rules, and the kind of raw value each refuses. */
const KIND = { "color-no-hex": "colour", "color-named": "colour", "function-disallowed-list": "colour", "unit-disallowed-list": "unit", "declaration-property-unit-disallowed-list": "unit", "basalt/container-length": "media" };
const DISABLE_REPORTS = new Set(["--report-needless-disables", "--report-descriptionless-disables", "--report-invalid-scope-disables"]);

/**
 * Lints stylesheets and reads what their classes set.
 * @param {string[]} files absolute paths
 * @param {{ stylelint: any, vocabulary: any, hooks: string[], cwd: string }} context
 */
export async function lintStyles(files, context) {
  const { stylelint, vocabulary, cwd } = context;
  const findings = new Map();
  const classes = new Map();
  const mentioned = new Set();
  if (!files.length) return { findings, classes, mentioned };
  const postcss = await loadPostcss();
  const roots = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const root = postcss.parse(text, { from: file });
    roots.set(file, root);
    const rel = path.relative(cwd, file);
    root.walkRules((rule) => {
      if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
      for (const m of rule.selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) mentioned.add(m[1]);
      const subjects = subjectClasses(rule.selector).flat().filter((c) => !c.startsWith("basalt-"));
      if (!subjects.length) return;
      for (const node of rule.nodes ?? []) {
        if (node.type !== "decl") continue;
        for (const name of new Set(subjects)) {
          if (!classes.has(name)) classes.set(name, []);
          classes.get(name).push({ property: node.prop, value: node.value, file: rel, line: node.source?.start?.line ?? rule.source?.start?.line ?? 0 });
        }
      }
    });
  }
  const config = basaltStylelintConfig(stylelint, { restyle: true, hooks: context.hooks, vocabulary, configurationComment: "basalt-lint" });
  const result = await stylelint.lint({ files, config, cwd, allowEmptyInput: true });
  for (const res of result.results) {
    const file = res.source;
    const list = [];
    for (const e of res.parseErrors ?? []) list.push({ rule: "parse", severity: "error", line: e.line ?? 1, column: e.column ?? 1, message: e.text });
    for (const w of res.warnings) {
      const rule = DISABLE_REPORTS.has(w.rule) ? "basalt/disable" : w.rule;
      let message = w.text.replace(new RegExp(`\\s*\\(${escape(w.rule)}\\)$`), "");
      if (rule === "basalt/disable") message = `${message} (a basalt-lint-disable-next-line comment needs \` -- <reason>\` and must excuse something)`;
      else if (KIND[rule]) message = `${message}: ${hint(roots.get(file), w, vocabulary)}. If it must stay, record why: /* basalt-lint-disable-next-line ${rule} -- <reason> */`;
      list.push({ rule, severity: w.severity === "warning" ? "warning" : "error", line: w.line, column: w.column, message });
    }
    if (list.length) findings.set(file, list);
  }
  return { findings, classes, mentioned };
}

/** The token by role for the value a Stylelint warning points at. */
function hint(root, warning, vocabulary) {
  const kind = KIND[warning.rule];
  if (!root) return "use a --basalt-* token";
  let found = null;
  const within = (node) => node.source?.start && node.source.start.line <= warning.line && (node.source.end?.line ?? node.source.start.line) >= warning.line;
  root.walk((node) => {
    if ((node.type === "decl" || node.type === "atrule") && within(node)) found = node;
  });
  if (!found) return "use a --basalt-* token";
  const property = found.type === "decl" ? found.prop.toLowerCase() : "";
  const value = found.type === "decl" ? found.value : found.params;
  const unit = /"([a-z]+)"/i.exec(warning.text)?.[1]?.toLowerCase();
  const raws = rawValues(value).filter((r) => (kind === "colour" ? r.kind === "colour" : r.kind !== "colour" && (!unit || r.unit === unit)));
  const raw = raws[0] ?? (kind === "media" ? rawValues(value).find((r) => r.kind === "length") : null);
  if (!raw) return "use a --basalt-* token";
  if (found.type === "atrule") return suggest(vocabulary.tokens, "", { ...raw, kind: "media" });
  return suggest(vocabulary.tokens, property, raw);
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** PostCSS, from beside the Stylelint that was found (it is Stylelint's own dependency). */
async function loadPostcss() {
  const from = resolvePackage("stylelint");
  const file = createRequire(from).resolve("postcss");
  const mod = await import(pathToFileURL(file).href);
  return mod.default ?? mod;
}
