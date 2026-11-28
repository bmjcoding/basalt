// Lexical scope for the source check: a name at its use site is the binding of the nearest scope that declares it, so a parameter or a local that
// shadows an import of `Button` is not Basalt's `Button`, and `style={styles}` reads `styles` only when the nearest `styles` is a `const`.
// Scopes follow the language: a module, a function (its parameters, its own name for an expression, and every `var` in it), a block (its `let`,
// `const`, `class` and function declarations), a `for` head, a `catch` clause and a `switch`'s cases.

const FUNCTION = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

/** Every name a binding pattern declares (`a`, `{ b, c: d, ...e }`, `[f = 1]`). */
export function patternNames(pattern, out = []) {
  if (!pattern) return out;
  switch (pattern.type) {
    case "Identifier": out.push(pattern.name); break;
    case "ObjectPattern": for (const p of pattern.properties) patternNames(p.type === "RestElement" ? p.argument : p.value, out); break;
    case "ArrayPattern": for (const e of pattern.elements) patternNames(e, out); break;
    case "AssignmentPattern": patternNames(pattern.left, out); break;
    case "RestElement": patternNames(pattern.argument, out); break;
    case "TSParameterProperty": patternNames(pattern.parameter, out); break;
    default: break;
  }
  return out;
}

/** The declarations a list of statements makes in its own scope (not `var`, which belongs to the function). */
function lexical(statements, names) {
  for (let s of statements ?? []) {
    if ((s.type === "ExportNamedDeclaration" || s.type === "ExportDefaultDeclaration") && s.declaration) s = s.declaration;
    if (s.type === "VariableDeclaration" && s.kind !== "var") {
      for (const d of s.declarations) for (const n of patternNames(d.id)) names.set(n, { kind: s.kind, init: d.id.type === "Identifier" ? d.init : null });
    } else if ((s.type === "FunctionDeclaration" || s.type === "ClassDeclaration" || s.type === "TSEnumDeclaration") && s.id) {
      names.set(s.id.name, { kind: "local" });
    }
  }
}

/** Every `var` in a function's body, not crossing into a nested function. */
function hoisted(node, names) {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "VariableDeclaration" && node.kind === "var") for (const d of node.declarations) for (const n of patternNames(d.id)) names.set(n, { kind: "var" });
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child.type === "string" && !FUNCTION.has(child.type)) hoisted(child, names);
    }
  }
}

/**
 * The scope a node opens, as a Map of name → { kind, init?, basalt?, namespace? }, or null when it opens none. A module's imports are given by the
 * caller (`imports`), which knows which ones are Basalt's.
 */
export function scopeOf(node, imports) {
  const names = new Map();
  switch (node.type) {
    case "Program":
      for (const [name, binding] of imports) names.set(name, binding);
      lexical(node.body, names);
      hoisted({ type: "Block", body: node.body }, names);
      return names;
    case "FunctionDeclaration":
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      if (node.type === "FunctionExpression" && node.id) names.set(node.id.name, { kind: "local" });
      for (const p of node.params ?? []) for (const n of patternNames(p)) names.set(n, { kind: "param" });
      if (node.body?.type === "BlockStatement") hoisted(node.body, names);
      return names;
    case "BlockStatement":
    case "StaticBlock":
      lexical(node.body, names);
      return names;
    case "ForStatement":
      if (node.init?.type === "VariableDeclaration") lexical([node.init], names);
      return names;
    case "ForInStatement":
    case "ForOfStatement":
      if (node.left?.type === "VariableDeclaration") lexical([node.left], names);
      return names;
    case "CatchClause":
      for (const n of patternNames(node.param)) names.set(n, { kind: "param" });
      return names;
    case "SwitchStatement":
      lexical(node.cases.flatMap((c) => c.consequent), names);
      return names;
    case "ClassExpression":
      if (node.id) names.set(node.id.name, { kind: "local" });
      return names;
    default:
      return null;
  }
}

/** The binding a name has in a scope chain ({ names, parent }), or null for a global. */
export function lookup(chain, name) {
  for (let s = chain; s; s = s.parent) if (s.names.has(name)) return s.names.get(name);
  return null;
}
