// The audit's marked lines (DECISIONS 320, 4; `.agent/skills/release-words/SKILL.md`, "The audit"): node tools/changelog/audit.mjs [--root <repository>]
// It flags, and a person decides: the check showed that neither accepting nor dismissing every flag is right. Each flag is a rule id, the
// quoted line and what is wrong. The lines the skill does not mark are read by a person.
import fs from "node:fs";
import path from "node:path";

import { taggedDifferences } from "./build.mjs";
import { loadConfig } from "./config.mjs";
import { CHANGES_DIR, FLOOR, NOTES_FILE, readEntry, readNotes, TYPES } from "./entries.mjs";
import { changelogMarkdown } from "./outputs.mjs";
import { pageReleases, readRecords } from "./records.mjs";
import { atLeast, carries, higher, must } from "./semver.mjs";

export const VERBS = ["Added", "Changed", "Improved", "Deprecated", "Removed", "Fixed", "Reverted"];
export const MAX_WORDS = 30;

// R9: stock phrases that say nothing a reader can check.
const STOCK = [/\bbug fixes\b/i, /\bperformance improvements\b/i, /\bvarious (?:fixes|improvements)\b/i, /\bminor (?:fixes|improvements)\b/i, /\bgeneral improvements\b/i, /\bstability improvements\b/i];
// R10: marketing words.
const BANNED = ["seamless", "seamlessly", "powerful", "robust", "effortless", "effortlessly", "blazing", "revolutionary", "game-changing", "cutting-edge", "best-in-class", "world-class", "delightful", "beautiful", "stunning", "magical", "supercharge", "supercharged"];
// R15: British spellings, in prose (an identifier is spelled as it is exported).
const BRITISH = /\b(?:(?:multi-?)?colour(?:s|ed|ing|ful)?|centre(?:s|d)?|behaviour(?:s|al)?|cancell(?:ed|ing)|favour(?:s|ed|ite|ites)?|honour(?:s|ed)?|neighbour(?:s|ing)?|labour|organis(?:e|ed|es|ing|ation)|recognis(?:e|ed|es|ing)|optimis(?:e|ed|es|ing|ation)|customis(?:e|ed|es|ing|ation)|initialis(?:e|ed|es|ing|ation)|normalis(?:e|ed|es|ing|ation)|serialis(?:e|ed|es|ing|ation)|summaris(?:e|ed|es|ing)|licence|catalogue|dialogue|analys(?:e|ed|es|ing)|grey|programme|travell(?:ed|ing)|modell(?:ed|ing)|labell(?:ed|ing)|fulfil)\b/i;
const FUTURE = /\b(?:will|shall|going to|won't)\b/i;

/** The sentence's prose: code spans taken out, since an identifier is written as it is exported. */
const prose = (text) => text.replace(/`[^`]*`/g, "`code`");

/**
 * Flags for one entry's words and fields. `config` gives the trackers and the people, so an id or a name in the words is caught.
 * Each flag is `{ rule, message }`.
 */
export function auditEntry(entry, config) {
  const flags = [];
  const flag = (rule, message) => flags.push({ rule, message });
  const text = entry.text;
  const words = prose(text);

  const [first] = text.split(/\s+/);
  if (!VERBS.includes(first)) flag("R1", `starts with "${first}", not a verb of R1 (${VERBS.join(", ")})`);
  const count = text.trim().split(/\s+/).length;
  if (count > MAX_WORDS) flag("R3", `${count} words; at most ${MAX_WORDS}`);
  if (/[.]$/.test(text.trim())) flag("R3", "ends with a period");
  for (const pattern of STOCK) if (pattern.test(words)) flag("R9", `a stock phrase ("${words.match(pattern)[0]}")`);
  for (const word of BANNED) if (new RegExp(`\\b${word}\\b`, "i").test(words)) flag("R10", `a marketing word ("${word}")`);
  if (words.includes("!")) flag("R10", "an exclamation mark");
  if (words.includes("—")) flag("R15", "an em dash");
  if (words.includes(";")) flag("R15", "a semicolon");
  if (/\p{Extended_Pictographic}/u.test(words)) flag("R15", "an emoji");
  const british = words.match(BRITISH);
  if (british) flag("R15", `a British spelling ("${british[0]}")`);
  // A dated removal is the one place for the future tense: a deprecation or removal that names a year.
  const datedRemoval = ["deprecated", "removed"].includes(entry.type) && /\b20[0-9]{2}\b/.test(text);
  if (FUTURE.test(words) && !datedRemoval) flag("R11", `the future tense ("${words.match(FUTURE)[0]}") outside a dated removal`);
  if (/(?:^|[^\w`])#[0-9]+\b/.test(text) || /\b(?:PR|pull request)\s*#?[0-9]+\b/i.test(text)) flag("R14", "a pull request number in the words");
  for (const tracker of config?.trackers ?? []) {
    const anywhere = new RegExp(`(?<![\\w#-])(?:${tracker.pattern})(?![\\w-])`, "u");
    const hit = text.match(anywhere);
    if (hit) flag("R14", `a ${tracker.name} ticket id ("${hit[0]}") in the words`);
  }
  for (const person of Object.values(config?.people ?? {})) {
    if (new RegExp(`\\b${person.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(words)) flag("R14", `a person's name ("${person.name}") in the words`);
  }
  // Version: the bump a type needs, and the one link from the bump to action.
  const floor = FLOOR[entry.type];
  if (!entry.bump) flag("Version", "a changed entry states its bump");
  else if (floor && !atLeast(entry.bump, floor)) flag("Version", `a ${entry.type} entry needs at least a ${floor}`);
  if (entry.bump === "major" && !entry.action) flag("Version", "a major entry is action");
  return flags;
}

// R18: nothing in a headline, a summary or a paragraph that the list does not hold. Whether a sentence's claim is in an entry is a reader's call, so
// the audit flags a sentence for a person when most of what it names appears in none of the entries it covers (their words and areas). An
// instruction ("In Settings, open Integrations", "Paste its address") tells a reader where to find what an entry says, and is not a claim.
const STOP = new Set("about above across after again already also another because been before being below between both cannot could does doing down during each every from have having here into itself just more most much must never only other over same should since some such than that their them then there these they this those through under until upon very were what when where which while will with within without would your yours first".split(" "));
const INSTRUCTION = /^(?:(?:in|on|from|under)\s+[^,]+,\s*)?(?:open|add|paste|choose|select|press|go|click|tap|type|name|set|turn|run|check|use|find|connect|read|copy|see|remove|move|pass|replace)\b/i;
/** A word's plain forms, so "codes", "coded" and "coding" meet "code", and "fixes" meets "fixed". */
const forms = (word) => {
  const bare = word.replace(/'s?$/, "");
  const out = new Set([bare]);
  for (const end of ["ing", "ed", "es", "s", "d"]) if (bare.endsWith(end) && bare.length - end.length >= 3) { const root = bare.slice(0, -end.length); out.add(root); out.add(`${root}e`); }
  return [...out];
};
const words = (text) => text.toLowerCase().replace(/`[^`]*`/g, " ").split(/[^a-z']+/).filter((word) => word.length >= 4 && !STOP.has(word));

/** Sentences of a headline, summary or paragraph that name mostly what the entries they cover do not. Each is `{ sentence, unknown }`. */
export function unsupported(text, entries, { product } = {}) {
  if (!entries.length) return [];
  const known = new Set([...entries.flatMap((entry) => words(`${entry.area ?? ""} ${entry.text}`)), ...words(product ?? "")].flatMap(forms));
  const out = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean)) {
    if (INSTRUCTION.test(sentence)) continue;
    const named = words(sentence);
    const unknown = [...new Set(named.filter((word) => !forms(word).some((form) => known.has(form))))];
    if (unknown.length >= 2 && unknown.length * 2 >= new Set(named).size) out.push({ sentence, unknown });
  }
  return out;
}

/** R18 flags for a release's words: its headline and summary against every entry, each paragraph against the entries it covers. */
export function auditNotes(release, { product } = {}) {
  const flags = [];
  const byId = new Map(release.entries.map((entry) => [entry.id, entry]));
  const check = (text, entries, what) => {
    for (const { sentence, unknown } of unsupported(text, entries, { product })) flags.push({ rule: "R18", line: sentence, message: `${what}: ${unknown.join(", ")} ${unknown.length === 1 ? "is" : "are"} in no entry it covers; give it an entry or take it out` });
  };
  if (release.title) check(release.title, release.entries, "the headline");
  if (release.summary) check(release.summary, release.entries, "the summary");
  for (const audience of release.audiences ?? []) check(audience.text, audience.covers.map((id) => byId.get(id)).filter(Boolean), audience.for ? `"${audience.for}"` : "the paragraph for everyone");
  return flags;
}

/** Flags for one frozen release against the others. */
export function auditRecord(record, records) {
  const flags = [];
  const flag = (rule, message) => flags.push({ rule, message });
  const version = must(record.version);
  if (version.pre.length && !["canary", "beta", "rc"].includes(version.pre[0])) flag("Version", `the pre-release "${record.version}" is not -canary, -beta or -rc`);
  if (record.previous) {
    const needed = record.entries.reduce((most, entry) => higher(most, entry.bump ?? "patch"), "patch");
    const carried = carries(record.previous, version.core);
    if (record.entries.length && (!carried || !atLeast(carried, needed))) flag("Version", `${record.version} from ${record.previous} does not carry the ${needed} its entries need`);
  }
  for (const replaced of record.replaces ?? []) {
    const candidate = records.find((other) => other.version === replaced);
    if (!candidate) {
      flag("Version", `replaces ${replaced}, which has no record`);
      continue;
    }
    const ids = new Set(record.entries.map((entry) => entry.id));
    for (const entry of candidate.entries) if (!ids.has(entry.id)) flag("Version", `${replaced} held "${entry.id}", which ${record.version} does not: was it taken out on purpose?`);
  }
  for (const audience of record.audiences ?? []) if (!audience.covers?.length) flag("R18", `a paragraph covers no entry: "${audience.text}"`);
  return flags;
}

/** Every flag in a repository: the pending files, the records, CHANGELOG.md and the tags. Each is `{ where, rule, line, message }`. */
export function audit(root) {
  const flags = [];
  const config = loadConfig(root);
  const records = readRecords(root);
  const pending = [];
  const dir = path.join(root, CHANGES_DIR);
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".md") && name !== NOTES_FILE && name !== "README.md").sort() : [];
  for (const name of names) {
    const file = path.join(CHANGES_DIR, name);
    try {
      pending.push({ file, entry: readEntry(fs.readFileSync(path.join(root, file), "utf8"), file, config) });
    } catch (error) {
      flags.push({ where: file, rule: "Each entry", line: "", message: error.message });
    }
  }
  const notesFile = path.join(dir, NOTES_FILE);
  if (fs.existsSync(notesFile)) {
    try {
      const notes = readNotes(fs.readFileSync(notesFile, "utf8"), path.join(CHANGES_DIR, NOTES_FILE), new Set(pending.map(({ entry }) => entry.id)));
      for (const found of auditNotes({ ...notes, entries: pending.map(({ entry }) => entry) }, { product: config.product })) flags.push({ where: path.join(CHANGES_DIR, NOTES_FILE), ...found });
    } catch (error) {
      flags.push({ where: path.join(CHANGES_DIR, NOTES_FILE), rule: "R18", line: "", message: error.message });
    }
  }
  const all = [...pending.map(({ file, entry }) => ({ where: file, entry })), ...records.flatMap((record) => record.entries.map((entry) => ({ where: `${record.version} ${entry.id}`, entry })))];
  for (const { where, entry } of all) for (const found of auditEntry(entry, config)) flags.push({ where, line: entry.text, ...found });
  // An area on every entry when the package or product has more than one surface: when any entry has one, every entry does.
  if (all.some(({ entry }) => entry.area)) for (const { where, entry } of all) if (!entry.area) flags.push({ where, rule: "Structure", line: entry.text, message: "no area, where other entries have one" });
  for (const record of records) for (const found of auditRecord(record, records)) flags.push({ where: record.version, line: "", ...found });
  for (const record of records) for (const found of auditNotes(record, { product: config.product })) flags.push({ where: record.version, ...found });
  for (const entry of all) if (!TYPES.includes(entry.entry.type)) flags.push({ where: entry.where, rule: "Structure", line: entry.entry.text, message: `type "${entry.entry.type}"` });
  const changelog = path.join(root, "CHANGELOG.md");
  if (fs.existsSync(changelog) && records.length) {
    const expected = changelogMarkdown(pageReleases(root, { config, records, pending: pending.map(({ entry }) => entry) }), { product: config.product, form: config.form });
    if (fs.readFileSync(changelog, "utf8") !== expected) flags.push({ where: "CHANGELOG.md", rule: "Structure", line: "", message: "is not what the records give: run node tools/changelog/build.mjs" });
  }
  for (const difference of taggedDifferences(root)) flags.push({ where: "records", rule: "Version", line: "", message: difference });
  return flags;
}

/** A flag as the skill logs it: rule id, quoted line, what to look at. */
export const formatFlag = (flag) => `${flag.rule}, ${flag.where}${flag.line ? `, "${flag.line}"` : ""}: ${flag.message}`;

const { isMain } = await import("../../scripts/is-main.mjs");
if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--root");
  const root = path.resolve(at >= 0 ? args[at + 1] : process.cwd());
  try {
    const flags = audit(root);
    for (const flag of flags) process.stdout.write(`${formatFlag(flag)}\n`);
    process.stdout.write(flags.length ? `${flags.length} ${flags.length === 1 ? "flag" : "flags"}: a person decides each.\n` : "No flags.\n");
    process.exit(flags.length ? 1 : 0);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
