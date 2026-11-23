// The public surface's vocabulary (cimip-gaps-2, batch AF; Sol's audit): Basalt is a design system for any app, so no app's nouns are in what an app
// imports or a page draws. It fails on the first app's nouns (incident, commander, severity, SEV and SEV1 to SEV4, war room, scribe, rolodex,
// ServiceNow) and on a person's name used as a default, anywhere in the code of the public surface: exported names, prop names, default strings, `aria`
// labels, errors, data attributes, CSS selectors and custom properties, and token names. It reads code, not comments (comments are docs, and docs pair
// two domains by hand), and matches whole words and the words inside an identifier (`incidentId`, `basalt-incident-row`), never a substring
// (`describedby` holds "scribe" and is not one).
//
// An example in the code itself (a fixture shipped for tests, say) is marked on the line before, with a reason, in any comment form:
//   // basalt-vocabulary-example -- the reason this one line is an example and not the API
// A marker without a reason, or one that excuses nothing, fails too, and so does one on a line that is the API: an `export`, a typed member (a prop),
// a default value, or an `aria-` or `data-` attribute. A marker excuses data, never a name or a default an app receives.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isMain } from "./is-main.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Where the public surface is: the React package's source and styles, the HTML skill's code (not its examples or usage notes), the token sources and the Swift package. */
export const SURFACE = [
  { dir: "packages/react/src", ext: [".ts", ".tsx", ".css"] },
  { dir: "tools/html-skill/src", ext: [".js", ".mjs", ".css", ".json"], skip: ["examples", "usage"] },
  { dir: "packages/tokens/tokens", ext: [".json"] },
  { dir: "Sources", ext: [".swift"] },
];

/** One app's nouns, as whole words (lower case). */
const NOUNS = new Set(["incident", "incidents", "commander", "commanders", "severity", "severities", "sev", "sev1", "sev2", "sev3", "sev4", "scribe", "scribes", "rolodex", "rolodexes", "servicenow", "warroom", "warrooms"]);
/**
 * A service mark's files (DECISIONS 297): a bundled mark is named for its owner's brand, and ServiceNow is a vendor's mark like GitHub's, not an
 * app's noun, so its name may stand in the generated mark modules and the skill's marks part. Every other noun is still refused there.
 */
const BRANDS = [{ under: "packages/react/src/marks/", words: ["servicenow"] }, { under: "tools/html-skill/src/marks.json", words: ["servicenow"] }];
const brandWords = (file) => BRANDS.filter((b) => file.split(path.sep).join("/").startsWith(b.under)).flatMap((b) => b.words);
/** Two words that are a noun together. */
const PAIRS = [["war", "room"], ["war", "rooms"]];
/**
 * A person's full name as a whole string: a common given name and a capitalised family name ("Dana Whitfield"), the way a fixture's default person is
 * written. Title-case words that are not a given name ("Account Settings", "Geist Mono") are not names.
 */
const PERSON = /^([A-Z][a-z]+) (?:[A-Z][a-z]+(?:[-' ][A-Z][a-z]+)?)$/;
const GIVEN = new Set([
  "aaron", "adam", "aditi", "ahmed", "aisha", "alex", "alice", "amara", "amir", "amy", "ana", "andrea", "anna", "arjun", "ava", "ben", "carlos", "chen", "chloe", "chris",
  "daniel", "dana", "david", "diego", "elena", "ella", "emily", "emma", "fatima", "grace", "hana", "hannah", "hiro", "ines", "isabel", "jack", "james", "jamal", "jane",
  "jo", "john", "jordan", "jose", "julia", "kai", "kate", "kenji", "laura", "lee", "leo", "liam", "lily", "lucas", "lucy", "maria", "marcus", "mark", "maya", "mei",
  "mia", "michael", "mohammed", "nadia", "nina", "noah", "noor", "olivia", "omar", "oscar", "paul", "priya", "rahul", "raj", "rosa", "ryan", "sam", "sara", "sarah",
  "sofia", "sophie", "tom", "wei", "yuki", "zara", "zoe",
]);
const isPerson = (text) => { const m = PERSON.exec(text); return Boolean(m && GIVEN.has(m[1].toLowerCase())); };
/** A line the marker may not excuse, because it is the API: an export, a typed member (a prop), a default value, an `aria-` or `data-` attribute. */
const API_LINE = [/^\s*export\b/, /^\s*(?:readonly\s+)?["'\w$-]+\??\s*:\s*(?!["'`\d-])[A-Za-z_$({[<|]/, /(?:^\s*|[({,]\s*)[\w$]+\s*=\s*["'`]/, /\b(?:aria|data)-[\w-]+\s*[=:]/];
const MARKER = /basalt-vocabulary-example\b(.*)$/;

/** The words of a run of code: split on anything that is not a letter or digit, then inside each identifier at its case changes. */
export function words(text) {
  return identifiers(text).flatMap(parts);
}
const identifiers = (text) => text.split(/[^A-Za-z0-9]+/).filter(Boolean);
const parts = (raw) => raw.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").split(" ").filter(Boolean).map((part) => part.toLowerCase());

/** The app nouns in a run of code, as written. */
export function nounsIn(text) {
  const found = [];
  const add = (noun) => { if (!found.includes(noun)) found.push(noun); };
  const list = [];
  for (const raw of identifiers(text)) {
    // Inside one identifier, any run of up to three of its words is a noun when joined ("ServiceNowClient" holds "servicenow", "warRoomPanel" "warroom").
    const words = parts(raw);
    for (let i = 0; i < words.length; i += 1) for (let j = i + 1; j <= Math.min(words.length, i + 3); j += 1) { const joined = words.slice(i, j).join(""); if (NOUNS.has(joined)) add(joined); }
    list.push(...words);
  }
  // Two words that are a noun together, across identifiers ("War room").
  list.forEach((word, i) => { for (const [a, b] of PAIRS) if (word === a && list[i + 1] === b) add(`${a} ${b}`); });
  return found;
}

/**
 * C-like source (TypeScript, JavaScript, Swift) with its comments blanked to spaces and its newlines kept, so line numbers hold, and the strings it holds.
 * A string, a template literal (with its `${}` parts) and a regular expression literal are kept as they are; `//` and `/* *\/` comments go.
 */
export function stripCode(source) {
  let out = "";
  const strings = [];
  const comments = [];
  let i = 0;
  // The last character that was code and not space, to tell a regular expression's slash from a division.
  let last = "";
  const blank = (text) => text.replace(/[^\n]/g, " ");
  // A JSX closing tag (`</a>`) and a self-closing one (`<br />`) are not regular expressions, so a `//` after them is a comment.
  const isRegexStart = (i) => source[i - 1] !== "<" && source[i + 1] !== ">" && (last === "" || "(,=:[!&|?{};+-*%~^".includes(last) || /\b(return|typeof|case|do|else|in|of|void|yield|await)$/.test(out.trimEnd()));
  while (i < source.length) {
    const c = source[i];
    if (c === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      comments.push({ text: source.slice(i, stop), at: i });
      out += blank(source.slice(i, stop));
      i = stop;
    } else if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      comments.push({ text: source.slice(i, stop), at: i });
      out += blank(source.slice(i, stop));
      i = stop;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== c && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      strings.push({ text: source.slice(i + 1, j), at: i });
      out += source.slice(i, j + 1);
      i = j + 1;
      last = c;
    } else if (c === "`") {
      let j = i + 1;
      let depth = 0;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (depth === 0 && source[j] === "`") break;
        if (source[j] === "$" && source[j + 1] === "{") { depth++; j += 2; continue; }
        if (depth > 0 && source[j] === "}") depth--;
        j++;
      }
      strings.push({ text: source.slice(i + 1, j), at: i });
      out += source.slice(i, j + 1);
      i = j + 1;
      last = "`";
    } else if (c === "/" && isRegexStart(i)) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== "\n") {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === "[") inClass = true;
        else if (source[j] === "]") inClass = false;
        else if (source[j] === "/" && !inClass) break;
        j++;
      }
      out += source.slice(i, j + 1);
      i = j + 1;
      last = "/";
    } else {
      out += c;
      if (!/\s/.test(c)) last = c;
      i++;
    }
  }
  return { code: out, strings, comments };
}

/** CSS with its comments blanked, newlines kept. */
export function stripCss(source) {
  const comments = [];
  const code = source.replace(/\/\*[\s\S]*?\*\//g, (m, at) => { comments.push({ text: m, at }); return m.replace(/[^\n]/g, " "); });
  return { code, strings: [], comments };
}

/** A token or module file: its keys and its string values, never a `$description` (the token's docs). Each line is code as written; descriptions are blanked. */
export function stripJson(source) {
  const code = source.replace(/("\$description"\s*:\s*)"(?:[^"\\]|\\.)*"/g, (m, key) => key + '""');
  return { code, strings: [], comments: [] };
}

const lineOf = (text, at) => text.slice(0, at).split("\n").length;

/** Every problem in one file's source: `{ line, message }`. */
export function checkSource(file, source) {
  const ext = path.extname(file);
  const { code, strings, comments } = ext === ".css" ? stripCss(source) : ext === ".json" ? stripJson(source) : stripCode(source);
  const problems = [];
  // Lines excused by a marker on the line before, and markers without a reason.
  const excused = new Map();
  const markerSources = ext === ".json" ? [] : comments;
  for (const comment of markerSources) {
    const match = MARKER.exec(comment.text);
    if (!match) continue;
    const line = lineOf(source, comment.at) + comment.text.split("\n").length;
    const reason = match[1].replace(/\*\/\s*$/, "").trim();
    if (!/^--\s*\S/.test(reason)) problems.push({ line: line - 1, message: "a basalt-vocabulary-example marker needs a reason after `--`" });
    excused.set(line, { used: false, at: line - 1 });
  }
  const sourceLines = source.split("\n");
  // A marker on an API line is refused: the noun on it is still a problem.
  const excuses = (line) => {
    const excuse = excused.get(line);
    if (!excuse) return false;
    if (API_LINE.some((pattern) => pattern.test(sourceLines[line - 1] ?? ""))) {
      if (!excuse.refused) problems.push({ line: excuse.at, message: "a basalt-vocabulary-example marker cannot excuse an export, a prop, a default or an aria or data attribute" });
      excuse.refused = true;
      excuse.used = true;
      return false;
    }
    excuse.used = true;
    return true;
  };
  code.split("\n").forEach((text, index) => {
    const line = index + 1;
    const brands = brandWords(file);
    const found = nounsIn(text).filter((noun) => !brands.includes(noun));
    if (!found.length) return;
    if (excuses(line)) return;
    problems.push({ line, message: `an app's noun in the public surface: ${[...new Set(found)].join(", ")} (name it for what it is, or take the word from the app as a prop)` });
  });
  for (const s of strings) {
    if (!isPerson(s.text.trim())) continue;
    const line = lineOf(source, s.at);
    if (excuses(line)) continue;
    problems.push({ line, message: `a person's name as a default: "${s.text}" (an app's people are its data; Basalt takes them as props)` });
  }
  for (const excuse of excused.values()) if (!excuse.used) problems.push({ line: excuse.at, message: "a basalt-vocabulary-example marker that excuses nothing" });
  return problems.map((p) => ({ file, ...p }));
}

function walk(dir, ext, skip = []) {
  const abs = path.join(repoRoot, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, ext));
    else if (ext.includes(path.extname(entry.name))) out.push(rel);
  }
  return out;
}

export function checkAll() {
  const problems = [];
  for (const { dir, ext, skip } of SURFACE) for (const file of walk(dir, ext, skip)) problems.push(...checkSource(file, fs.readFileSync(path.join(repoRoot, file), "utf8")));
  return problems;
}

if (isMain(import.meta.url)) {
  const problems = checkAll();
  for (const p of problems) console.error(`${p.file}:${p.line}: ${p.message}`);
  if (problems.length) {
    console.error(`\n${problems.length} vocabulary problem${problems.length === 1 ? "" : "s"} in the public surface.`);
    process.exit(1);
  }
  console.log("vocabulary: the public surface names no app's nouns");
}
