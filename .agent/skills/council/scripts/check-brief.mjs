#!/usr/bin/env node
// Checks a council brief before any delegate is started: every placeholder filled, MAIN replaced by the absolute path, and the
// council files it names really there. No dependencies; Node 18 or later.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `Usage: node scripts/check-brief.mjs <brief.md> [--json]
       node scripts/check-brief.mjs --self-test

Checks a filled-in council brief (research, prototype, vote, roadmap, build or review brief) before a delegate reads it.

Errors (exit 1):
  - any <…> left in the brief: in prose, in \`inline code\` or in a fenced code block
  - a <… that opens and doesn't close on the same line (a placeholder split across lines)
  - "MAIN/" or "/absolute/path" left unreplaced, anywhere
Let through:
  - <your slug>, which each member fills in itself
  - real HTML: a tag with attributes (<input type="date">), a closing tag (</main>), or a bare HTML element
    inside backticks or a code block (\`<select>\`). Put any HTML you mention in backticks.
  - HTML comments (<!-- … -->), which are the templates' own notes
Warnings (exit 0):
  - an absolute path under .review/council/ that doesn't exist, where no folder on its way exists either (a typo, or a file a
    delegate will create)

Options:
  --json        print {"file", "errors", "warnings"} to stdout instead of lines
  --self-test   check the checker against this skill's templates and known cases; exit 1 if it misjudges any
  --help        show this help

Exit codes: 0 passed (warnings allowed), 1 errors found, 2 bad usage or unreadable file.

Example:
  node scripts/check-brief.mjs /Users/me/basalt/.review/council/date-picker-vote-brief.md`;

// HTML element names a brief might mention. "base" and "option" are left out on purpose: the templates use <base> and <option> as
// placeholders, so a bare one is always treated as unfilled.
const ELEMENTS = new Set(("html head body main div span p a ul ol li section header footer nav article aside h1 h2 h3 h4 h5 h6 " +
  "button input select textarea label form fieldset legend table thead tbody tfoot tr td th caption colgroup col img svg path " +
  "script style link meta iframe template slot details summary dialog br hr code pre em strong b i u s small time figure " +
  "figcaption video audio canvas source picture blockquote kbd abbr mark output progress meter datalist menu").split(" "));

function isAllowed(token, inCode) {
  if (token === "<your slug>") return true;
  if (token.startsWith("<!")) return true;                                   // a doctype or comment fragment
  if (/^<[a-zA-Z][\w-]*\s+[\w:@.-]+(\s*=|\s|\/?>)/.test(token) && /=/.test(token)) return true; // a tag with attributes
  const closing = token.match(/^<\/([a-zA-Z][\w-]*)>$/);
  if (closing && ELEMENTS.has(closing[1].toLowerCase())) return true;       // a closing tag
  const bare = token.match(/^<([a-zA-Z][\w-]*)\s*\/?>$/);
  if (bare && inCode && ELEMENTS.has(bare[1].toLowerCase())) return true;   // a bare element, in code
  return false;
}

export function check(text) {
  const errors = [];
  const warnings = [];
  let inFence = false;
  let inComment = false;
  text.split("\n").forEach((raw, i) => {
    const n = i + 1;
    if (/MAIN\//.test(raw) || /\/absolute\/path/.test(raw)) errors.push(`line ${n}: "MAIN/" or "/absolute/path" not replaced with the main checkout's absolute path`);
    if (/^\s*```/.test(raw)) { inFence = !inFence; return; }
    // strip HTML comments, which may span lines
    let line = "";
    let rest = raw;
    while (rest.length) {
      if (inComment) {
        const end = rest.indexOf("-->");
        if (end < 0) { rest = ""; break; }
        inComment = false; rest = rest.slice(end + 3);
      } else {
        const start = rest.indexOf("<!--");
        if (start < 0) { line += rest; rest = ""; }
        else { line += rest.slice(0, start); rest = rest.slice(start + 4); inComment = true; }
      }
    }
    // split the line into code and prose, so a bare element counts as HTML only inside code
    const pieces = inFence ? [{ text: line, code: true }] : line.split(/(`[^`]*`)/).map((p) => ({ text: p.replace(/^`|`$/g, ""), code: p.startsWith("`") }));
    for (const piece of pieces) {
      for (const m of piece.text.matchAll(/<[^<>\n]{1,200}>/g)) {
        if (!isAllowed(m[0], piece.code)) errors.push(`line ${n}: placeholder ${m[0]} not filled in`);
      }
      if (!piece.code) {
        const open = piece.text.replace(/<[^<>\n]{1,200}>/g, "").match(/<[a-zA-Z][^>]*$/);
        if (open) errors.push(`line ${n}: "${open[0].slice(0, 40)}…" opens a <…> that doesn't close on this line (a placeholder split across lines?)`);
      }
    }
    for (const m of line.matchAll(/\/[^\s`'"()<>]*\/\.review\/council\/[^\s`'"()<>,;]*/g)) {
      const p = m[0].replace(/[.:]$/, "");
      if (/[{*]/.test(p) || fs.existsSync(p)) continue;
      let dir = path.dirname(p);
      while (!fs.existsSync(dir) && dir.includes("/.review/council")) dir = path.dirname(dir);
      if (dir.endsWith("/.review/council") || !dir.includes("/.review/council")) warnings.push(`line ${n}: ${p} doesn't exist (fine if a delegate will create it; otherwise a typo)`);
    }
  });
  return { errors, warnings };
}

function selfTest() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const assets = path.join(here, "..", "assets");
  const failures = [];
  // every template, with only MAIN replaced, must still report every placeholder it holds
  for (const f of fs.readdirSync(assets).filter((f) => f.endsWith(".md"))) {
    const text = fs.readFileSync(path.join(assets, f), "utf8").replaceAll("</absolute/path/to/MAIN>", "/tmp/main").replaceAll("</absolute/path>", "/tmp/main");
    if (check(text).errors.length === 0) failures.push(`${f}: an unfilled template passed`);
  }
  const cases = [
    ["a placeholder in a command", "Run `git fetch origin && git switch -c claude/<topic> <base>`.", false],
    ["a placeholder in a path", "Read `/tmp/main/.review/council/<topic>/compare/`.", false],
    ["a placeholder in a fenced block", "```\nnpm run review -- <number>\n```", false],
    ["a placeholder in prose", "The questions: <question>.", false],
    ["a placeholder split across lines", "where `<base>` is origin/main <or the branch this\ndepends on>.", false],
    ["a long placeholder", `Edit <${"x".repeat(150)}>.`, false],
    ["<option> in prose", "- (a) <option> (<designer>);", false],
    ["the member's own slug", "Write `<topic-x>-vote/<your slug>.md`.".replace("<topic-x>", "date-picker"), true],
    ["HTML with attributes in prose", "the native <input type=\"date\"> field", true],
    ["HTML with attributes in code", "the native `<input type=\"date\">` field", true],
    ["a closing tag", "after `</main>`", true],
    ["a bare element in code", "a native `<select>` or `<dialog>`", true],
    ["a bare element in a fence", "```html\n<main>\n</main>\n```", true],
    ["a comment", "<!-- replace every <…> -->", true],
    ["MAIN left in", "Read MAIN/docs/foundations.md.", false],
  ];
  for (const [name, text, shouldPass] of cases) {
    const passed = check(text).errors.length === 0;
    if (passed !== shouldPass) failures.push(`${name}: expected ${shouldPass ? "pass" : "fail"}, got ${passed ? "pass" : "fail"}`);
  }
  if (failures.length) { console.log(failures.map((f) => `self-test failed: ${f}`).join("\n")); process.exit(1); }
  console.log(`self-test passed: ${fs.readdirSync(assets).filter((f) => f.endsWith(".md")).length} templates and ${cases.length} cases`);
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) { console.log(HELP); process.exit(0); }
  if (args.includes("--self-test")) selfTest();
  const json = args.includes("--json");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) { console.error("Error: give the brief's path.\n\n" + HELP); process.exit(2); }
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { console.error(`Error: can't read ${file}: ${e.message}`); process.exit(2); }
  const { errors, warnings } = check(text);
  if (json) console.log(JSON.stringify({ file, errors, warnings }, null, 1));
  else {
    for (const e of errors) console.log(`error: ${e}`);
    for (const w of warnings) console.log(`warning: ${w}`);
    console.log(errors.length ? `${errors.length} error(s): fix them, then run this again.` : `passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}: ${file}`);
  }
  process.exit(errors.length ? 1 : 0);
}
