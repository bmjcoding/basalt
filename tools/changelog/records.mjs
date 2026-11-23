// The frozen records (DECISIONS 320, 3.4): `changelog/releases/<version>.json`, one per release, written once by the freeze and never edited.
// Every output (CHANGELOG.md, the page's data, a GitHub Release's body) is generated from these and the pending files, and nothing else.
import fs from "node:fs";
import path from "node:path";

import { commitHref, pullHref } from "./config.mjs";
import { FLOOR, readPending, TYPES } from "./entries.mjs";
import { atLeast, descending, must } from "./semver.mjs";

export const RECORDS_DIR = path.join("changelog", "releases");
export const HOW_TO_MIGRATE = "How to migrate";

const RANK = { major: 0, minor: 1, patch: 2 };

/** Inside a section, entries stand by impact (the bump), then by area, then by id (S 4.4). */
export function byImpact(a, b) {
  return RANK[a.bump] - RANK[b.bump] || (a.area ?? "").localeCompare(b.area ?? "", "en") || a.id.localeCompare(b.id, "en");
}

/** Whether a string is a real calendar date written `YYYY-MM-DD`. */
export function isDate(value) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(value));
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  return day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d;
}

/**
 * Where an entry's migration note opens. An https address stays; a path from the site's root ("/docs/…") stays; any other is a file in the
 * repository, opened at the release's tag (or the default branch's head while unreleased).
 */
export function migrationHref(migration, config, version) {
  if (/^https:\/\//.test(migration) || migration.startsWith("/") || migration.startsWith("#")) return migration;
  if (/^[a-z][a-z0-9+.-]*:/i.test(migration)) throw new Error(`migration "${migration}" is an https address, a path from the site's root, or a file in the repository`);
  return `${config.repository}/blob/${version ? `v${version}` : "HEAD"}/${migration}`;
}

/** An entry as a record holds it: the file's fields, with every address resolved, so the record alone rebuilds it. */
export function recordEntry(entry, config, { version, commit } = {}) {
  const out = { id: entry.id, type: entry.type, bump: entry.bump };
  if (entry.area) out.area = entry.area;
  out.text = entry.text;
  if (entry.action) out.action = true;
  if (entry.migration) out.link = { label: HOW_TO_MIGRATE, href: migrationHref(entry.migration, config, version) };
  if (entry.pr) out.pr = { number: entry.pr, href: pullHref(config, entry.pr) };
  if (commit) out.commit = { sha: commit, href: commitHref(config, commit) };
  if (entry.tickets?.length) out.tickets = entry.tickets.map((ticket) => ({ ...ticket }));
  if (entry.authors?.length) out.authors = [...entry.authors];
  return out;
}

function checkRecord(record, file) {
  const fail = (message) => { throw new Error(`${file}: ${message}`); };
  must(record.version, file);
  if (path.basename(file) !== `${record.version}.json`) fail(`the file is named for its version, ${record.version}.json`);
  if (!isDate(record.date)) fail(`"date" is a calendar date, YYYY-MM-DD`);
  if (!Array.isArray(record.entries)) fail(`"entries" is a list`);
  const ids = new Set();
  for (const entry of record.entries) {
    if (ids.has(entry.id)) fail(`the entry id "${entry.id}" is used twice`);
    ids.add(entry.id);
    if (!TYPES.includes(entry.type)) fail(`entry "${entry.id}": type "${entry.type}"`);
    const floor = FLOOR[entry.type];
    if (!entry.bump || (floor && !atLeast(entry.bump, floor))) fail(`entry "${entry.id}": the bump "${entry.bump}" is below its type's floor`);
  }
  for (const audience of record.audiences ?? []) {
    if (!audience.covers?.length) fail(`a paragraph covers no entry`);
    for (const id of audience.covers) if (!ids.has(id)) fail(`a paragraph covers "${id}", which is no entry of this release`);
  }
  return record;
}

/** Every record in a repository, read and checked. */
export function readRecords(root) {
  const dir = path.join(root, RECORDS_DIR);
  if (!fs.existsSync(dir)) return [];
  const records = fs.readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const file = path.join(RECORDS_DIR, name);
      let record;
      try {
        record = JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
      } catch (error) {
        throw new Error(`${file}: not JSON: ${error.message}`);
      }
      return checkRecord(record, file);
    });
  checkIds(records);
  return records.sort((a, b) => descending(a.version, b.version));
}

/** Stop on an entry id held by two records, unless one of them replaces the other (a candidate and its stable release). */
export function checkIds(records) {
  const holder = new Map();
  for (const record of records) {
    for (const entry of record.entries) {
      const other = holder.get(entry.id);
      if (other) {
        const related = (other.replaces ?? []).includes(record.version) || (record.replaces ?? []).includes(other.version);
        if (!related) throw new Error(`the entry id "${entry.id}" is held by ${other.version} and ${record.version}; an id is never used twice (a backport writes its own entry)`);
      }
      holder.set(entry.id, record);
    }
  }
}

/** The versions a drawn release stands in for: the pre-releases its record replaces. */
export function replacedVersions(records) {
  return new Set(records.flatMap((record) => record.replaces ?? []));
}

/** A ticket as the page shows it: a hidden tracker's tickets are recorded and never published, and a text tracker's are not linked. */
function pageTickets(tickets) {
  const shown = (tickets ?? []).filter((ticket) => ticket.show !== "none");
  return shown.length ? shown.map((ticket) => (ticket.show === "link" && ticket.href ? { tracker: ticket.tracker, label: ticket.label, href: ticket.href } : { tracker: ticket.tracker, label: ticket.label })) : undefined;
}

function pageEntry(entry) {
  const out = { ...entry };
  const tickets = pageTickets(entry.tickets);
  if (tickets) out.tickets = tickets;
  else delete out.tickets;
  return out;
}

/**
 * The page's data: the `ReleaseRecord[]` that `ReleaseNotes` takes, highest first, with the Unreleased section (the pending files that no
 * pre-release record holds) on top when there is one. A pre-release whose stable version has shipped is not drawn: its address opens the
 * stable release (`replaces`). `config` is read only for the pending files; a frozen release is drawn from its record alone.
 */
export function pageReleases(root, { config, records = readRecords(root), pending } = {}) {
  const replaced = replacedVersions(records);
  const drawn = records.filter((record) => !replaced.has(record.version));
  const out = [];
  const held = new Set(records.filter((record) => must(record.version).pre.length).flatMap((record) => record.entries.map((entry) => entry.id)));
  const waiting = (pending ?? (config ? readPending(root, config) : [])).filter((entry) => !held.has(entry.id));
  if (waiting.length) {
    out.push({ version: "Unreleased", unreleased: true, entries: waiting.map((entry) => pageEntry(recordEntry(entry, config))).sort(byImpact) });
  }
  for (const record of drawn) {
    const release = { version: record.version, date: record.date };
    if (record.previous) release.previous = record.previous;
    if (record.replaces?.length) release.replaces = [...record.replaces];
    if (record.title) release.title = record.title;
    if (record.summary) release.summary = record.summary;
    if (record.audiences?.length) release.audiences = record.audiences.map((audience) => ({ ...audience, covers: [...audience.covers] }));
    release.entries = record.entries.map(pageEntry);
    out.push(release);
  }
  return out;
}
