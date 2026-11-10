#!/usr/bin/env node
// Checks a council brief before any delegate is started: every placeholder filled, MAIN replaced by the absolute path, and the
// council files it names really there. No dependencies; Node 18 or later.
import fs from "node:fs";
import path from "node:path";

const HELP = `Usage: node scripts/check-brief.mjs <brief.md> [--json]

Checks a filled-in council brief (prototype, vote, build, research or review brief) before a delegate reads it.

Errors (exit 1):
  - a placeholder left in the text, like <topic> or <quote> (<your slug> is allowed: each member fills it in)
  - "MAIN/" or "/absolute/path" left unreplaced
Warnings (exit 0):
  - an absolute path under .review/council/ that doesn't exist and isn't in a folder that exists (likely a typo)

Ignored: HTML comments, and anything inside \`code\` or fenced code blocks (except MAIN/, which is checked everywhere).

Options:
  --json   print {"errors": [...], "warnings": [...]} to stdout instead of lines
  --help   show this help

Exit codes: 0 passed (warnings allowed), 1 errors found, 2 bad usage or unreadable file.

Example:
  node scripts/check-brief.mjs /Users/me/basalt/.review/council/date-picker-vote-brief.md`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { console.log(HELP); process.exit(0); }
const json = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));
if (!file) { console.error("Error: give the brief's path.\n\n" + HELP); process.exit(2); }

let text;
try { text = fs.readFileSync(file, "utf8"); } catch (e) { console.error(`Error: can't read ${file}: ${e.message}`); process.exit(2); }

const errors = [];
const warnings = [];
const lines = text.split("\n");
let inFence = false;
let inComment = false;
const ALLOWED = new Set(["<your slug>"]);

lines.forEach((raw, i) => {
  const n = i + 1;
  if (/MAIN\//.test(raw) || /\/absolute\/path/.test(raw)) errors.push(`line ${n}: "MAIN/" or "/absolute/path" not replaced with the main checkout's absolute path`);
  if (/^\s*```/.test(raw)) { inFence = !inFence; return; }
  if (inFence) return;
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
  const prose = line.replace(/`[^`]*`/g, "");
  for (const m of prose.matchAll(/<[^<>\n]{1,80}>/g)) {
    if (!ALLOWED.has(m[0])) errors.push(`line ${n}: placeholder ${m[0]} not filled in`);
  }
  for (const m of line.matchAll(/\/[^\s`'"()<>]*\/\.review\/council\/[^\s`'"()<>,;]*/g)) {
    const p = m[0].replace(/[.:]$/, "");
    if (/[{*]/.test(p)) continue; // a pattern such as {opus,muse,sol,grok}
    if (fs.existsSync(p)) continue;
    let dir = path.dirname(p);
    while (!fs.existsSync(dir) && dir.includes("/.review/council")) dir = path.dirname(dir);
    if (dir.endsWith("/.review/council") || !dir.includes("/.review/council")) warnings.push(`line ${n}: ${p} doesn't exist (fine if a delegate will create it; otherwise a typo)`);
  }
});

if (json) console.log(JSON.stringify({ file, errors, warnings }, null, 1));
else {
  for (const e of errors) console.log(`error: ${e}`);
  for (const w of warnings) console.log(`warning: ${w}`);
  console.log(errors.length ? `${errors.length} error(s): fix them, then run this again.` : `passed${warnings.length ? ` with ${warnings.length} warning(s)` : ""}: ${file}`);
}
process.exit(errors.length ? 1 : 0);
