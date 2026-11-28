// The consumer lint over an app's source (JS, TS, JSX): it reads the syntax tree (oxc-parser), knows a Basalt component by its import binding (a
// named import, an alias, a namespace member), and reports:
//
//   basalt/no-restyle          a static `style` key that sets appearance on a Basalt component (`<Button style={{ padding: 12 }}>`), a `--basalt-*`
//                              token set in any `style`, and a `className` on a Basalt component whose rules in the checked CSS set appearance
//   basalt/raw-value           a raw colour, length or time in a statically known `style` value (React's numeric lengths included), and a raw colour
//                              in an SVG presentation attribute (`fill="#fff"`), with the token by role
//   basalt/class-on-component  (advisory) a `className` on a Basalt component the lint cannot classify: computed, or with no rule in the checked CSS
//   basalt/primitive           (advisory) a competing library's import, or a native element where Basalt has a proven part
//
// What it cannot decide statically it leaves alone: a spread (`{...props}`, `style={{ ...base }}`'s spread part), a value computed at run time (measured
// geometry stays allowed), a wrapper in another file that forwards `className` or `style`, and what the cascade does to a class at run time.
import path from "node:path";

import { classify, HOOKS, kebab } from "./appearance.mjs";
import { applyDisables, readDisables } from "./disables.mjs";
import { restyleHint, sizeProp } from "./hints.mjs";
import { competingImport, nativeElement } from "./primitives.mjs";
import { lookup, scopeOf } from "./scope.mjs";
import { rawNumber, rawValues, typeUnits } from "./values.mjs";
import { suggest, typeStep } from "./vocabulary.mjs";

export const SOURCE_RULES = ["basalt/no-restyle", "basalt/raw-value", "basalt/class-on-component", "basalt/primitive"];
const SEVERITY = { "basalt/no-restyle": "error", "basalt/raw-value": "error", "basalt/class-on-component": "warning", "basalt/primitive": "warning" };
/** SVG presentation attributes that take a colour, as JSX writes them and as SVG does. */
const SVG_COLOUR = new Set(["fill", "stroke", "color", "stopColor", "stop-color", "floodColor", "flood-color", "lightingColor", "lighting-color"]);
const EXCEPTION = "basalt-lint-disable-next-line basalt/no-restyle -- <reason>";
/** Basalt's own rows and cells: a native button inside one is the row's action, not an ordinary one. */
const ROW = /(Row|^TableRowHead|^TableCell|^TableHead|^SelectableItem)$/;

/**
 * Lints one source file.
 * @param {string} file
 * @param {string} text
 * @param {{ oxc: any, vocabulary: any, sources: Set<string>, classes: Map<string, { property: string, value: string, file: string, line: number }[]>, hooks?: Set<string> }} context
 * @returns {{ rule: string, severity: string, line: number, column: number, message: string }[]}
 */
export function lintSource(file, text, context) {
  const lang = /\.tsx$/.test(file) ? "tsx" : /\.[mc]?ts$/.test(file) ? "ts" : "jsx";
  const parsed = context.oxc.parseSync(file, text, { lang, sourceType: "module" });
  if (parsed.errors.length) throw new Error(`${file}: does not parse (${parsed.errors[0].message}); basalt-lint never passes a file it cannot read`);
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  const position = (offset) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; }
    return { line: lo + 1, column: offset - starts[lo] + 1 };
  };
  const { vocabulary } = context;
  const hooks = context.hooks ?? HOOKS;
  const has = (name) => vocabulary.has(name);
  const findings = [];
  const report = (rule, node, message) => findings.push({ rule, severity: SEVERITY[rule], ...position(node.start), message });
  const add = report;

  // Import identity: a module-scope name or namespace bound to a Basalt export. Each use resolves through the scopes at its site (scope.mjs).
  const imports = new Map();
  for (const statement of parsed.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    const source = statement.source.value;
    const basalt = context.sources.has(source) || isSourceFile(file, source, context);
    for (const s of statement.specifiers) {
      const imported = s.type === "ImportSpecifier" ? s.imported.name ?? s.imported.value : null;
      // Only a value the installed Basalt exports: an app's barrel (`sources`) may export its own components beside Basalt's.
      if (basalt && statement.importKind !== "type" && s.importKind !== "type" && imported && has(imported)) imports.set(s.local.name, { kind: "import", basalt: imported });
      else if (basalt && statement.importKind !== "type" && s.type === "ImportNamespaceSpecifier") imports.set(s.local.name, { kind: "import", namespace: true });
      else imports.set(s.local.name, { kind: "import" });
    }
    if (basalt || statement.importKind === "type") continue;
    const names = statement.specifiers.filter((s) => s.importKind !== "type").map((s) => (s.type === "ImportSpecifier" ? s.imported.name ?? s.imported.value : s.type === "ImportNamespaceSpecifier" ? "*" : "default"));
    const advice = competingImport(source, names, has);
    if (advice) add("basalt/primitive", statement, advice);
  }

  /** The object a `style` value is: written in place, or the nearest binding of its name when that is a `const` holding an object. */
  const objectOf = (expr, scope) => {
    if (expr?.type === "ObjectExpression") return expr;
    if (expr?.type === "TSAsExpression" || expr?.type === "TSSatisfiesExpression" || expr?.type === "ParenthesizedExpression") return objectOf(expr.expression, scope);
    if (expr?.type === "Identifier") {
      const binding = lookup(scope, expr.name);
      if (binding?.kind === "const" && binding.init) return objectOf(binding.init, null);
    }
    return null;
  };

  /** The Basalt export a JSX name is at its use site, or null. */
  const componentOf = (name, scope) => {
    if (name.type === "JSXIdentifier") return lookup(scope, name.name)?.basalt ?? null;
    if (name.type === "JSXMemberExpression" && name.object.type === "JSXIdentifier" && lookup(scope, name.object.name)?.namespace && has(name.property.name)) return name.property.name;
    return null;
  };

  /** `at`: where to report when the object is a binding's (the use site, where its exception goes), else each property where it is written. */
  const checkStyle = (styleObject, component, at = null) => {
    const add = (rule, node, message) => report(rule, at ?? node, at ? `${message} (the style object is declared on line ${position(styleObject.start).line})` : message);
    const info = component ? vocabulary.components.get(component) : null;
    const sized = Boolean(sizeProp(info));
    for (const p of styleObject.properties) {
      if (p.type !== "Property" || p.computed) continue;
      const key = p.key.type === "Identifier" ? p.key.name : typeof p.key.value === "string" ? p.key.value : null;
      if (!key) continue;
      const property = kebab(key);
      const statics = staticParts(p.value);
      if (property.startsWith("--basalt-") && !hooks.has(property)) {
        add("basalt/no-restyle", p, `style sets ${property}: ${restyleHint(vocabulary, null, property, { className: "basalt-*" })}`);
      } else if (component && classify(property, statics.find((s) => typeof s === "string"), { sized, hooks }) === "appearance") {
        add("basalt/no-restyle", p, `style.${key} on \`${component}\`: ${restyleHint(vocabulary, component, property)}`);
      }
      for (const part of statics) {
        const raws = typeof part === "number" ? [rawNumber(property, part)].filter(Boolean) : rawValues(part);
        for (const raw of raws) add("basalt/raw-value", p.value, `style.${key} is the raw ${raw.kind} ${raw.numeric ? `${raw.number} (React writes ${raw.number}px)` : `"${raw.text}"`}: ${suggest(vocabulary.tokens, property, raw)}`);
        if (typeof part === "string") {
          for (const t of typeUnits(property, part)) add("basalt/raw-value", p.value, `style.${key} sets type in ${t.unit} ("${t.text}"): type is never sized by its container or set in lh (foundations: display type); ${typeStep(vocabulary.tokens, property)}`);
        }
      }
    }
  };

  const checkClassName = (attr, component) => {
    const value = attr.value;
    const expr = value?.type === "JSXExpressionContainer" ? value.expression : value;
    const { strings, dynamic } = classStrings(expr);
    const classes = strings.flatMap((s) => s.split(/\s+/)).filter(Boolean);
    const info = vocabulary.components.get(component);
    const sized = Boolean(sizeProp(info));
    const unknown = [];
    for (const name of classes) {
      if (name.startsWith("basalt-")) continue;
      const rules = context.classes.get(name);
      // A class the CSS names only as context (`.work-steps > li`) puts no declaration on this element.
      if (!rules) { if (!context.mentioned?.has(name)) unknown.push(name); continue; }
      const appearance = rules.filter((r) => classify(r.property, r.value, { sized, hooks }) === "appearance");
      if (!appearance.length) continue;
      const first = appearance[0];
      const where = [...new Set(appearance.map((r) => `${r.property} (${r.file}:${r.line})`))].slice(0, 3).join(", ");
      add("basalt/no-restyle", attr, `className "${name}" on \`${component}\` sets ${where}: ${restyleHint(vocabulary, component, first.property, { exception: EXCEPTION })}`);
    }
    if (dynamic || unknown.length) {
      const what = dynamic ? "a computed className" : `className ${unknown.map((n) => `"${n}"`).join(", ")} (no rule in the checked CSS)`;
      add("basalt/class-on-component", attr, `${what} on \`${component}\`: check that it sets layout only (margin, placement, width); its look comes from its props. Run the CSS that defines it through basalt-lint to have it classified`);
    }
  };

  // The walk, with what each element sits in: a `render` prop's element, and a list or table row.
  const visit = (node, ctx) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "JSXElement") {
      const opening = node.openingElement;
      const component = componentOf(opening.name, ctx.scope);
      const tag = opening.name.type === "JSXIdentifier" && /^[a-z]/.test(opening.name.name) ? opening.name.name : null;
      const attrs = new Map();
      let hasSpread = false;
      for (const attr of opening.attributes) {
        if (attr.type === "JSXSpreadAttribute") { hasSpread = true; continue; }
        const name = attr.name.type === "JSXNamespacedName" ? `${attr.name.namespace.name}:${attr.name.name.name}` : attr.name.name;
        const v = attr.value;
        attrs.set(name, v == null ? true : v.type === "Literal" ? v.value : v.type === "JSXExpressionContainer" ? staticString(v.expression) : undefined);
        if (name === "style" && v?.type === "JSXExpressionContainer") { const o = objectOf(v.expression, ctx.scope); if (o) checkStyle(o, component, o === v.expression ? null : attr); }
        if (name === "className" && component) checkClassName(attr, component);
        if (tag && SVG_COLOUR.has(name)) {
          const s = v?.type === "Literal" ? v.value : v?.type === "JSXExpressionContainer" ? staticString(v.expression) : undefined;
          if (typeof s === "string") for (const raw of rawValues(s).filter((r) => r.kind === "colour")) add("basalt/raw-value", attr, `${name}="${s}" on <${tag}> is a raw colour: write ${name}="currentColor" and give the drawing its colour from a role token in CSS or style (an attribute cannot read a token); ${suggest(vocabulary.tokens, kebab(name), raw)}`);
        }
      }
      if (tag) {
        const children = node.children.filter((c) => c.type === "JSXElement").map((c) => (c.openingElement.name.type === "JSXIdentifier" ? c.openingElement.name.name : "Member"));
        const text = node.children.some((c) => (c.type === "JSXText" && c.value.trim()) || (c.type === "JSXExpressionContainer" && c.expression.type !== "JSXEmptyExpression"));
        const advice = nativeElement(tag, attrs, { inRender: ctx.inRender, inRow: ctx.inRow, hasSpread, children, text }, has);
        if (advice) add("basalt/primitive", opening, `<${tag}>: ${advice}`);
      }
      // A row: a list item or table row, or one of Basalt's own rows (`TableRow`, `PanelRow`, `TableCell` and the rest).
      const row = tag === "li" || tag === "tr" || tag === "td" || tag === "th" || (component !== null && ROW.test(component));
      const inner = { scope: ctx.scope, inRender: false, inRow: ctx.inRow || row };
      for (const attr of opening.attributes) {
        if (attr.type === "JSXAttribute" && attr.value) visit(attr.value, { ...inner, inRender: attr.name.name === "render" || ctx.inRender });
        else if (attr.type === "JSXSpreadAttribute") visit(attr.argument, inner);
      }
      for (const child of node.children) visit(child, inner);
      return;
    }
    const opened = scopeOf(node, imports);
    const here = opened ? { ...ctx, scope: { names: opened, parent: ctx.scope } } : ctx;
    for (const key of Object.keys(node)) {
      if (key === "parent") continue;
      const value = node[key];
      if (Array.isArray(value)) for (const child of value) visit(child, here);
      else if (value && typeof value.type === "string") visit(value, here);
    }
  };
  visit(parsed.program, { scope: null, inRender: false, inRow: false });

  const disables = readDisables(parsed.comments, (offset) => position(offset).line);
  return applyDisables(findings, disables, new Set([...SOURCE_RULES, "basalt/disable"]));
}

/** Whether a relative import reaches one of the app's own modules listed in `sources` (`./ui/basalt.ts`), with or without its extension or `/index`. */
function isSourceFile(file, specifier, context) {
  if (!context.sourceFiles?.size || !/^\.{1,2}\//.test(specifier)) return false;
  const target = path.resolve(context.cwd ?? process.cwd(), path.dirname(file), specifier);
  const bare = (p) => p.replace(/\.[mc]?[jt]sx?$/, "").replace(/\/index$/, "");
  return context.sourceFiles.has(bare(target));
}


/** A string the source wrote whole, or undefined. */
function staticString(expr) {
  if (!expr) return undefined;
  if (expr.type === "Literal" && typeof expr.value === "string") return expr.value;
  if (expr.type === "TemplateLiteral" && expr.expressions.length === 0) return expr.quasis[0].value.cooked;
  return undefined;
}

/**
 * The parts of a style value the source wrote itself: whole strings and numbers, both sides of a condition, and a template's literal text (a unit
 * after a `${}` hole belongs to a computed number, measured geometry, and is not read).
 */
function staticParts(expr) {
  if (!expr) return [];
  if (expr.type === "Literal" && (typeof expr.value === "string" || typeof expr.value === "number")) return [expr.value];
  if (expr.type === "UnaryExpression" && expr.operator === "-" && expr.argument.type === "Literal" && typeof expr.argument.value === "number") return [-expr.argument.value];
  if (expr.type === "TemplateLiteral") return expr.quasis.map((q) => q.value.cooked ?? "").filter((s) => s.trim());
  if (expr.type === "ConditionalExpression") return [...staticParts(expr.consequent), ...staticParts(expr.alternate)];
  if (expr.type === "LogicalExpression") return [...(expr.operator === "&&" ? [] : staticParts(expr.left)), ...staticParts(expr.right)];
  if (expr.type === "TSAsExpression" || expr.type === "TSSatisfiesExpression" || expr.type === "ParenthesizedExpression") return staticParts(expr.expression);
  return [];
}

/** The class names a className expression writes, and whether some of it is computed (a name, a call's non-literal argument, a template hole). */
function classStrings(expr) {
  const strings = [];
  let dynamic = false;
  const go = (e) => {
    if (!e) return;
    if (e.type === "Literal") { if (typeof e.value === "string") strings.push(e.value); return; }
    if (e.type === "TemplateLiteral") { strings.push(...e.quasis.map((q) => q.value.cooked ?? "")); if (e.expressions.length) e.expressions.forEach(go); return; }
    if (e.type === "ConditionalExpression") { go(e.consequent); go(e.alternate); return; }
    if (e.type === "LogicalExpression") { if (e.operator !== "&&") go(e.left); go(e.right); return; }
    if (e.type === "BinaryExpression" && e.operator === "+") { go(e.left); go(e.right); return; }
    if (e.type === "CallExpression") {
      // `[a, on && "b"].filter(Boolean).join(" ")` writes what its array holds; `clsx("a", { b: on })` and the like write their arguments.
      const method = e.callee?.type === "MemberExpression" && !e.callee.computed ? e.callee.property.name : null;
      if (method && ["join", "filter", "trim", "concat"].includes(method)) { go(e.callee.object); if (method === "concat") e.arguments.forEach(go); return; }
      e.arguments.forEach(go);
      return;
    }
    if (e.type === "ArrayExpression") { e.elements.forEach(go); if (e.elements.length) return; }
    if (e.type === "ObjectExpression") { for (const p of e.properties) if (p.type === "Property" && !p.computed) strings.push(p.key.name ?? p.key.value); else dynamic = true; return; }
    if (e.type === "MemberExpression" && e.object?.type === "ArrayExpression") { go(e.object); return; }
    if (e.type === "TSAsExpression" || e.type === "ParenthesizedExpression") { go(e.expression); return; }
    dynamic = true;
  };
  go(expr);
  return { strings, dynamic };
}
