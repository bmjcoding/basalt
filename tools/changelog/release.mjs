// Freezing a release (DECISIONS 320, 3.4): node tools/changelog/release.mjs <version> --date <YYYY-MM-DD>
// Run on the branch the release is cut from: the default branch, or a maintained line's own (release/1.x). It reads the config and every pending
// file, checks the version against the entries and the releases in its line, resolves each entry's commit, writes the record once and, for a
// stable version, removes the pending files and regenerates CHANGELOG.md. The version is the owner's to give; the tool refuses one that
// understates the release.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "./config.mjs";
import { CHANGES_DIR, NOTES_FILE, readPending, readPendingNotes } from "./entries.mjs";
import { changelogMarkdown } from "./outputs.mjs";
import { byImpact, isDate, pageReleases, readRecords, recordEntry, RECORDS_DIR } from "./records.mjs";
import { atLeast, carries, compare, higher, least, line, must } from "./semver.mjs";

const RANK_WORD = { major: "a major", minor: "a minor", patch: "a patch" };

/** git in the repository, its output trimmed. */
function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * The commit that put an entry on this branch: the first-parent commit that added its file. A merge counts as the commit that added it (its
 * diff against its first parent), a squash or a rebased commit as itself. If that commit's subject names a different pull request, stop.
 */
export function entryCommit(root, entry) {
  const file = `${CHANGES_DIR}/${entry.id}.md`;
  const log = git(root, ["log", "--first-parent", "--full-history", "--diff-merges=first-parent", "--diff-filter=A", "--format=%H%x09%s", "--", file]);
  const [first] = log.split("\n").filter(Boolean);
  if (!first) throw new Error(`${file}: no commit on this branch added it; commit it first`);
  const [sha, subject = ""] = first.split("\t");
  const named = /^Merge pull request #([0-9]+)\b/.exec(subject) ?? /\(#([0-9]+)\)\s*$/.exec(subject);
  if (named && entry.pr && Number(named[1]) !== entry.pr) {
    throw new Error(`${file}: says pull request ${entry.pr}, and the commit that added it (${sha.slice(0, 8)}) is "${subject}"`);
  }
  return sha;
}

/** Check the version against the records and the entries (1.1). Returns the base it is measured from, or null for the first release. */
export function checkVersion(version, records, entries) {
  const next = must(version, "the version");
  if (next.pre.length) {
    const kind = next.pre[0];
    if (kind === "canary") throw new Error(`${version}: a canary is a build from the default branch, with no freeze and no record`);
    if (!(["beta", "rc"].includes(kind) && next.pre.length === 2 && /^[1-9][0-9]*$/.test(next.pre[1]))) {
      throw new Error(`${version}: a frozen pre-release is -beta.N or -rc.N`);
    }
  }
  if (records.some((record) => compare(record.version, version) === 0)) throw new Error(`${version} is published, and a published version is never edited`);
  const ownLine = line(next);
  const inLine = records.filter((record) => line(record.version) === ownLine);
  const against = inLine.length ? inLine : records;
  const above = against.filter((record) => compare(record.version, version) > 0).sort((a, b) => compare(b.version, a.version));
  if (above.length) {
    throw new Error(inLine.length
      ? `${version} is not higher than ${above[0].version}, released in its line (${ownLine}${ownLine.includes(".") ? ".x" : ".x.x"})`
      : `${version} opens a line, so it must be higher than every release; ${above[0].version} is higher`);
  }
  const core = must(next.core);
  const stableBelow = (list) => list.filter((record) => !must(record.version).pre.length && compare(record.version, core) < 0).sort((a, b) => compare(b.version, a.version))[0];
  const base = stableBelow(inLine) ?? stableBelow(records) ?? null;
  if (!base) return null;
  const needed = entries.reduce((most, entry) => higher(most, entry.bump), "patch");
  const carried = carries(base.version, core);
  if (!entries.length) {
    if (!carried) throw new Error(`${version} is not higher than ${base.version}`);
    return base;
  }
  if (!carried || !atLeast(carried, needed)) {
    const why = entries.filter((entry) => entry.bump === needed).map((entry) => entry.id).slice(0, 3).join(", ");
    throw new Error(`${version} understates the release: from ${base.version} it needs ${RANK_WORD[needed]} (${why})${core.major === 0 ? ", one place right in 0.x" : ""}, so at least ${least(base.version, needed)}`);
  }
  return base;
}

/**
 * Freeze `version`, shipped on `date`. `root` is the repository. Returns what it wrote.
 *
 * It is one step that either happens or does not: every check runs and every output is built in memory first; the record and CHANGELOG.md are
 * written beside their places and then moved in (the record with a hard link, which fails if another freeze wrote it first), and only then are
 * the pending files consumed. A freeze that stops before that leaves the inputs as they were. One that was interrupted after its record was
 * written (the record is there, and is exactly what this freeze would write) is finished by running it again.
 */
export function freeze({ root, version, date }) {
  if (!isDate(date)) throw new Error(`--date "${date}" is a calendar date, YYYY-MM-DD`);
  const file = path.join(root, RECORDS_DIR, `${version}.json`);
  if (!fs.existsSync(file)) return commit({ root, version, date });
  // The record is there: this freeze finishes an interrupted one, or the version is published. Anything that stops it says the second.
  try {
    return commit({ root, version, date });
  } catch (error) {
    if (error.finishing) throw error;
    throw new Error(`${version} is published, and a published version is never edited`);
  }
}

function commit({ root, version, date }) {
  const config = loadConfig(root);
  const file = path.join(root, RECORDS_DIR, `${version}.json`);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  // A record already there is measured against what this freeze would write: equal, and the freeze finishes; different, and it is published.
  const allRecords = readRecords(root);
  const records = existing === null ? allRecords : allRecords.filter((record) => record.version !== version);
  if (existing !== null && records.length === allRecords.length) throw new Error(`${path.join(RECORDS_DIR, `${version}.json`)} exists and is not a record of ${version}`);
  const pending = readPending(root, config);
  const ids = new Set(pending.map((entry) => entry.id));
  const notes = readPendingNotes(root, ids);
  const next = must(version, "the version");
  const pre = next.pre.length > 0;

  // A pre-release takes what no earlier pre-release of its version holds; a stable version takes every pending file and replaces them.
  const candidates = records.filter((record) => { const v = must(record.version); return v.pre.length && v.core === next.core; });
  const heldByCandidates = new Set(candidates.flatMap((record) => record.entries.map((entry) => entry.id)));
  const taken = pre ? pending.filter((entry) => !heldByCandidates.has(entry.id)) : pending;

  const base = checkVersion(version, records, pending);

  // An id is never used twice: only a candidate that this stable release replaces may hold one of its entries.
  const takenIds = new Set(taken.map((entry) => entry.id));
  for (const record of records) {
    if (!pre && candidates.includes(record)) continue;
    const clash = record.entries.find((entry) => takenIds.has(entry.id));
    if (clash) throw new Error(`${CHANGES_DIR}/${clash.id}.md: the id is already held by ${record.version}; a backport writes its own entry`);
  }

  if (!taken.length && !notes?.summary) throw new Error(`${version} has no entries, so it needs a summary in ${CHANGES_DIR}/${NOTES_FILE} (no release is a heading over nothing)`);
  if (taken.length > 3 && !notes?.summary && !notes?.audiences?.length) throw new Error(`${version} has ${taken.length} changes, so it needs a summary in ${CHANGES_DIR}/${NOTES_FILE}`);

  if (git(root, ["rev-parse", "--is-shallow-repository"]) === "true") throw new Error("this clone is shallow: fetch the whole history (git fetch --unshallow) so each entry's commit can be found");
  const entries = taken.map((entry) => recordEntry(entry, config, { version, commit: entryCommit(root, entry) })).sort(byImpact);

  const record = { version, date };
  if (base) record.previous = base.version;
  if (!pre && candidates.length) record.replaces = candidates.map((candidate) => candidate.version).sort(compare);
  // The repository is frozen with the release, so a later config cannot re-point its comparison ("Full diff").
  record.repository = config.repository;
  if (notes?.title) record.title = notes.title;
  if (notes?.summary) record.summary = notes.summary;
  if (notes?.audiences) {
    // A paragraph covers only what this release's own list holds (R18): a candidate is drawn with what it added, until its stable version ships.
    const own = new Set(taken.map((entry) => entry.id));
    for (const audience of notes.audiences) for (const id of audience.covers) if (!own.has(id)) throw new Error(`${CHANGES_DIR}/${NOTES_FILE}: covers "${id}", which ${version} does not hold`);
    record.audiences = notes.audiences;
  }
  record.entries = entries;
  const recordText = `${JSON.stringify(record, null, 2)}\n`;
  if (existing !== null && existing !== recordText) throw new Error(`${version} is published, and a published version is never edited`);

  // Every output, in memory: the records with this one, and the pending files this freeze leaves.
  const consumed = pre ? [] : pending;
  const left = pre ? pending : [];
  const changelog = changelogMarkdown(pageReleases(root, { config, records: [...records, record], pending: left }), { product: config.product, form: config.form });

  // Stage, then move in. Nothing is consumed until both are in place.
  const changelogFile = path.join(root, "CHANGELOG.md");
  const stage = `.freeze-${process.pid}-${Date.now()}`;
  const recordTemp = `${file}${stage}`;
  const changelogTemp = `${changelogFile}${stage}`;
  let wroteRecord = false;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(changelogTemp, changelog);
    if (existing === null) {
      fs.writeFileSync(recordTemp, recordText, { flag: "wx" });
      try {
        fs.linkSync(recordTemp, file);
      } catch (error) {
        if (error.code === "EEXIST") throw new Error(`${path.join(RECORDS_DIR, `${version}.json`)} was written by another freeze; run this one again to finish or to see what differs`);
        throw error;
      }
      wroteRecord = true;
    }
    fs.renameSync(changelogTemp, changelogFile);
  } catch (error) {
    if (wroteRecord) fs.rmSync(file, { force: true });
    error.finishing = true;
    throw error;
  } finally {
    fs.rmSync(recordTemp, { force: true });
    fs.rmSync(changelogTemp, { force: true });
  }

  const removed = [];
  for (const entry of consumed) {
    fs.rmSync(path.join(root, CHANGES_DIR, `${entry.id}.md`), { force: true });
    removed.push(`${CHANGES_DIR}/${entry.id}.md`);
  }
  if (!pre && notes) {
    fs.rmSync(path.join(root, CHANGES_DIR, NOTES_FILE), { force: true });
    removed.push(`${CHANGES_DIR}/${NOTES_FILE}`);
  }
  return { record, file, removed, finished: existing !== null };
}

function main(argv) {
  const args = [...argv];
  const at = args.indexOf("--date");
  const date = at >= 0 ? args.splice(at, 2)[1] : undefined;
  const rootAt = args.indexOf("--root");
  const root = rootAt >= 0 ? path.resolve(args.splice(rootAt, 2)[1]) : process.cwd();
  const [version] = args;
  if (!version || !date) {
    process.stderr.write("usage: node tools/changelog/release.mjs <version> --date <YYYY-MM-DD> [--root <repository>]\n");
    process.exit(2);
  }
  try {
    const { record, removed } = freeze({ root, version, date });
    process.stdout.write(`Wrote ${RECORDS_DIR}/${version}.json: ${record.entries.length} ${record.entries.length === 1 ? "entry" : "entries"}${record.previous ? `, from ${record.previous}` : ""}${record.replaces ? `, replacing ${record.replaces.join(", ")}` : ""}.\n`);
    if (removed.length) process.stdout.write(`Removed ${removed.length} pending ${removed.length === 1 ? "file" : "files"} and regenerated CHANGELOG.md.\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

const { isMain } = await import("../../scripts/is-main.mjs");
if (isMain(import.meta.url)) main(process.argv.slice(2));
