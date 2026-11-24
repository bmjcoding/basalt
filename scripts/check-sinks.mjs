// The sink check (the safe-sinks rule, AGENTS.md: "Data is drawn as text, and a destination is checked"). It reads the syntax tree of every source file
// in scope (oxc-parser) and finds the places a string becomes markup, a page is sent somewhere, or a message goes to any window:
//
//   html        innerHTML / outerHTML / srcdoc set from anything but a literal; insertAdjacentHTML, document.write and writeln, createContextualFragment and
//               setHTMLUnsafe; setAttribute("srcdoc"); dangerouslySetInnerHTML (JSX, an object key or an assignment); a JSX srcDoc.
//   navigation  location.assign / replace, location.href or location set, window.open, with a value that is not a literal and not checked by safeHref
//               (a call to safeHref in a condition that guards it, or the value is safeHref's own result).
//   message     postMessage(…, "*").
//
// Each one is an exception, recorded where a reviewer reads it:
//   - in tools/html-skill/src, where every module is a string builder, the file's count is in tools/html-skill/src/sinks.allowed.json with what the
//     file takes ("takes"), why it is safe ("safe") and whether it takes data ("data": a data-taking module is in the hostile-input probe);
//   - anywhere else, a comment in the block just above the line: `sink: <where the value comes from>; <why it is safe>; <the test that proves it>`
//     (tools/review, whose pages are synthetic, may leave out the test).
// A count that is off, an entry with no reason, a comment with no reason, and a `sink:` comment above no sink all fail. A file that does not parse fails:
// the check never passes what it could not read. The skill's sources hold build placeholders (%duration-confirm%); they are read as numbers in place.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseSync } from "oxc-parser";

import { isMain } from "./is-main.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = "tools/html-skill/src/sinks.allowed.json";
const LEDGER_DIR = "tools/html-skill/src";

/** Where the check reads. Tests, fixtures, docs and generated copies are out; tools/review is in (its frames and raw demos are reasoned there). */
export const SCOPE = [
  { dir: "packages/react/src", ext: [".ts", ".tsx"] },
  { dir: "tools/html-skill/src", ext: [".js", ".mjs"], skip: ["examples", "usage"] },
  { dir: "tools/html-skill", ext: [".mjs"], flat: true },
  { dir: "tools/review", ext: [".ts", ".tsx", ".mjs"] },
  { dir: "tools/artifact", ext: [".mjs"] },
  { dir: "sites", ext: [".js", ".mjs"], skip: ["test", "dist", "node_modules"] },
  { dir: "scripts", ext: [".mjs"] },
];

const HTML_PROPS = new Set(["innerHTML", "outerHTML", "srcdoc"]);
const HTML_CALLS = new Set(["insertAdjacentHTML", "createContextualFragment", "setHTMLUnsafe"]);

/** The name a member expression reads (`a.b` and `a["b"]`), or null. */
function memberName(node) {
  if (!node || (node.type !== "MemberExpression" && node.type !== "StaticMemberExpression" && node.type !== "ComputedMemberExpression")) return null;
  if (!node.computed && node.property?.type === "Identifier") return node.property.name;
  if (node.property?.type === "Literal" && typeof node.property.value === "string") return node.property.value;
  if (node.property?.type === "StringLiteral") return node.property.value;
  return node.property?.name ?? null;
}
const objectName = (node) => (node?.type === "Identifier" ? node.name : memberName(node));
const isLocation = (node) => objectName(node) === "location";

/** A value that is markup the source wrote itself: a string, a template with no holes, or literals joined. */
function literal(node) {
  if (!node) return true;
  if ((node.type === "Literal" && typeof node.value === "string") || node.type === "StringLiteral") return true;
  if (node.type === "TemplateLiteral") return node.expressions.length === 0;
  if (node.type === "BinaryExpression" && node.operator === "+") return literal(node.left) && literal(node.right);
  return false;
}
const isSafeHrefCall = (node) => node?.type === "CallExpression" && /(^|\.)safeHref$/.test(calleeName(node.callee) ?? "");
function calleeName(callee) {
  if (!callee) return null;
  if (callee.type === "Identifier") return callee.name;
  const name = memberName(callee);
  return name ? `${calleeName(callee.object) ?? ""}.${name}` : null;
}
/** Whether a node holds a call to safeHref anywhere inside it. */
function holdsSafeHref(node) {
  let found = false;
  walk(node, (n) => { if (isSafeHrefCall(n)) found = true; });
  return found;
}

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    if (Array.isArray(value)) for (const child of value) { if (child && typeof child.type === "string") walk(child, visit, node); }
    else if (value && typeof value.type === "string") walk(value, visit, node);
  }
}

/** A navigation value that is safe without an exception: a literal, safeHref's own result (directly, or a name declared once from it and never assigned
 *  again), or guarded by a condition that calls safeHref. */
function guarded(value, ancestors, checked = new Set()) {
  if (literal(value) || isSafeHrefCall(value)) return true;
  if (value?.type === "Identifier" && checked.has(value.name)) return true;
  // safeHref(x) ?? "/home": every value it can be is checked or written by the source.
  if (value?.type === "LogicalExpression" && (value.operator === "??" || value.operator === "||")) return guarded(value.left, [], checked) && guarded(value.right, [], checked);
  if (value?.type === "ConditionalExpression") return guarded(value.consequent, [], checked) && guarded(value.alternate, [], checked);
  for (const a of ancestors) {
    if ((a.type === "IfStatement" || a.type === "ConditionalExpression") && holdsSafeHref(a.test)) return true;
    if (a.type === "LogicalExpression" && holdsSafeHref(a.left)) return true;
  }
  return false;
}

/** The sinks in one file's text: [{ kind, line, what }]. Throws when the file does not parse. */
export function sinksIn(file, text) {
  // Build placeholders (%duration-confirm%, %glyph:check%) become a number of the same length, so offsets and lines stay where they were.
  const source = /\.(m?js)$/.test(file) ? text.replace(/%[a-z][\w:.-]*%/gi, (m) => `0${" ".repeat(m.length - 1)}`) : text;
  const lang = file.endsWith(".tsx") ? "tsx" : file.endsWith(".ts") ? "ts" : file.endsWith(".jsx") ? "jsx" : "js";
  const parsed = parseSync(file, source, { lang, sourceType: "module" });
  if (parsed.errors.length) throw new Error(`${file}: does not parse (${parsed.errors[0].message}); the sink check reads no file it cannot parse`);
  const starts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === "\n") starts.push(i + 1);
  const lineOf = (offset) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; } return lo + 1; };
  const found = [];
  const add = (kind, node, what) => found.push({ kind, line: lineOf(node.start), what });
  // Names declared from safeHref's result and never assigned again: the value that reaches a sink is the checked one.
  const checked = new Set();
  const reassigned = new Set();
  walk(parsed.program, (n) => {
    if (n.type === "VariableDeclarator" && n.id?.type === "Identifier" && isSafeHrefCall(n.init)) checked.add(n.id.name);
    if (n.type === "AssignmentExpression" && n.left?.type === "Identifier") reassigned.add(n.left.name);
    if (n.type === "UpdateExpression" && n.argument?.type === "Identifier") reassigned.add(n.argument.name);
  });
  for (const name of reassigned) checked.delete(name);
  const isGuarded = (value) => guarded(value, stack, checked);
  const stack = [];
  const visit = (node) => {
    // Assignments: el.innerHTML = …, el.srcdoc = …, x.dangerouslySetInnerHTML = …, location.href = …, location = …
    if (node.type === "AssignmentExpression") {
      const name = memberName(node.left);
      if (name && HTML_PROPS.has(name) && !literal(node.right)) add("html", node, name);
      else if (name === "dangerouslySetInnerHTML") add("html", node, name);
      else if (name === "href" && isLocation(node.left.object) && !isGuarded(node.right)) add("navigation", node, "location.href");
      else if ((node.left.type === "Identifier" && node.left.name === "location") || (name === "location" && ["window", "document", "self", "top"].includes(objectName(node.left.object)))) {
        if (!isGuarded(node.right)) add("navigation", node, "location");
      }
    }
    if (node.type === "CallExpression") {
      const name = memberName(node.callee);
      const args = node.arguments ?? [];
      if (name && HTML_CALLS.has(name)) add("html", node, name);
      else if ((name === "write" || name === "writeln") && objectName(node.callee.object) === "document") add("html", node, `document.${name}`);
      else if (name === "setAttribute" && literal(args[0]) && /^srcdoc$/i.test(args[0].value ?? "")) add("html", node, "setAttribute(srcdoc)");
      else if ((name === "assign" || name === "replace") && isLocation(node.callee.object) && !isGuarded(args[0])) add("navigation", node, `location.${name}`);
      else if (name === "open" && objectName(node.callee.object) === "window" && !isGuarded(args[0])) add("navigation", node, "window.open");
      else if (name === "postMessage" && args[1] && ((args[1].type === "Literal" && args[1].value === "*") || args[1].type === "StringLiteral" && args[1].value === "*")) add("message", node, 'postMessage(…, "*")');
    }
    // Object keys and JSX: { dangerouslySetInnerHTML: … }, <div dangerouslySetInnerHTML={…} />, <iframe srcDoc={…} />
    if ((node.type === "Property" || node.type === "ObjectProperty") && !node.computed && (node.key?.name ?? node.key?.value) === "dangerouslySetInnerHTML") add("html", node, "dangerouslySetInnerHTML");
    if (node.type === "JSXAttribute") {
      const name = node.name?.name;
      if (name === "dangerouslySetInnerHTML") add("html", node, name);
      else if (name === "srcDoc" && !(node.value && literal(node.value.type === "JSXExpressionContainer" ? node.value.expression : node.value))) add("html", node, "srcDoc");
    }
  };
  const descend = (node) => {
    if (!node || typeof node.type !== "string") return;
    visit(node);
    stack.unshift(node);
    for (const key of Object.keys(node)) {
      if (key === "parent") continue;
      const value = node[key];
      if (Array.isArray(value)) for (const child of value) descend(child);
      else if (value && typeof value.type === "string") descend(value);
    }
    stack.shift();
  };
  descend(parsed.program);
  return { found, comments: parsed.comments.map((c) => ({ text: c.value, line: lineOf(c.start), end: lineOf(c.end) })) };
}

const REASON = /\bsink:\s*([^;]*?)\s*;\s*([^;]*?)\s*(?:;\s*(.*?))?\s*(?:\*\/)?$/;

/** What is wrong with one file outside the ledger's folder: every sink needs a reasoned `sink:` comment just above it, and every such comment a sink. */
export function checkSource(file, text) {
  const { found, comments } = sinksIn(file, text);
  const lines = text.split("\n");
  const problems = [];
  // A reason is a comment that starts with `sink:` (after its own `*` or `{/*`), not one that mentions the word.
  const sinkComments = comments.filter((c) => /^[\s*]*sink:/.test(c.text));
  const used = new Set();
  const review = file.startsWith("tools/review/");
  for (const sink of found) {
    // The comment block just above the line: contiguous comment lines, the nearest first.
    let reason = null;
    for (let l = sink.line - 1; l >= 1; l--) {
      const t = lines[l - 1].trim();
      if (!/^(\/\/|\/\*|\*|\{\/\*)/.test(t)) break;
      const c = sinkComments.find((s) => s.line <= l && s.end >= l);
      if (c) { reason = c; break; }
    }
    // A JSX attribute sits inside its element: the comment may be above the element's first line, so the line itself is searched too.
    if (!reason) reason = sinkComments.find((c) => c.line === sink.line || c.end === sink.line - 1) ?? null;
    if (!reason) { problems.push(`${file}:${sink.line}: ${sink.kind} sink (${sink.what}) with no \`sink:\` reason in the comment just above it`); continue; }
    used.add(reason);
    const m = REASON.exec(reason.text.replace(/\s+/g, " ").trim());
    if (!m || !m[1] || !m[2] || (!review && !m[3])) problems.push(`${file}:${sink.line}: the \`sink:\` comment needs \`sink: <where the value comes from>; <why it is safe>${review ? "" : "; <the test that proves it>"}\``);
  }
  for (const c of sinkComments) if (!used.has(c)) problems.push(`${file}:${c.line}: a \`sink:\` comment above no sink (remove it)`);
  return problems;
}

/** What is wrong with the ledger's folder: each file's count must be the ledger's, with what it takes and why it is safe. */
export function checkLedger(counts, ledger) {
  const problems = [];
  for (const [file, n] of Object.entries(counts)) {
    const entry = ledger[file];
    if (!entry) { problems.push(`${LEDGER_DIR}/${file}: ${n} sink${n === 1 ? "" : "s"} and no entry in ${LEDGER}`); continue; }
    if (entry.count !== n) problems.push(`${LEDGER_DIR}/${file}: ${n} sink${n === 1 ? "" : "s"} against ${entry.count} in ${LEDGER} (${n > entry.count ? "a new sink needs its reason reviewed" : "lower the count"})`);
    for (const key of ["takes", "safe"]) if (typeof entry[key] !== "string" || !entry[key].trim()) problems.push(`${LEDGER}: ${file} has no "${key}"`);
    if (typeof entry.data !== "boolean") problems.push(`${LEDGER}: ${file} says nothing about "data" (true when it writes values a page passes in)`);
  }
  for (const file of Object.keys(ledger)) if (!file.startsWith("$") && !(file in counts)) problems.push(`${LEDGER}: ${file} has no sink any more (remove its entry)`);
  return problems;
}

function filesIn({ dir, ext, skip = [], flat = false }) {
  const root = path.join(repoRoot, dir);
  if (!fs.existsSync(root)) return [];
  const out = [];
  const visit = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) { if (!flat && !skip.includes(entry.name) && entry.name !== "node_modules" && !entry.name.startsWith(".")) visit(full); continue; }
      if (ext.includes(path.extname(entry.name)) && !/\.test\./.test(entry.name)) out.push(path.relative(repoRoot, full));
    }
  };
  visit(root);
  return out;
}

/** Every problem in scope: [] when each sink has its reason. */
export function checkAll() {
  const ledger = JSON.parse(fs.readFileSync(path.join(repoRoot, LEDGER), "utf8"));
  const problems = [];
  const counts = {};
  const seen = new Set();
  for (const scope of SCOPE) for (const file of filesIn(scope)) {
    if (seen.has(file)) continue;
    seen.add(file);
    const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
    try {
      if (file.startsWith(`${LEDGER_DIR}/`)) {
        const n = sinksIn(file, text).found.length;
        if (n) counts[path.relative(LEDGER_DIR, file)] = n;
      } else problems.push(...checkSource(file, text));
    } catch (error) { problems.push(error.message); }
  }
  problems.push(...checkLedger(counts, ledger));
  return problems;
}

if (isMain(import.meta.url)) {
  const problems = checkAll();
  if (problems.length) {
    console.error(`sinks: ${problems.length} problem${problems.length === 1 ? "" : "s"} (AGENTS.md, "Data is drawn as text, and a destination is checked"):\n${problems.map((p) => `  ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("sinks: every sink has its reason");
}
