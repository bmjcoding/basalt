// The entry files (DECISIONS 320, 3.3 and 3.4): `.changes/<id>.md`, one per change, added by the pull request that makes it. The head is
// `key: value` lines between two `---`, read here and nowhere else: a ticket id is read only from the `tickets` field of the entry's own file,
// never from a pull request's body, a commit's trailer, a branch name, a title or a sentence. It is not YAML, and no parser is added.
import fs from "node:fs";
import path from "node:path";

import { resolvePerson, resolveTicket } from "./config.mjs";
import { atLeast, BUMPS } from "./semver.mjs";

export const CHANGES_DIR = ".changes";
export const NOTES_FILE = "release.md";

/** The sections, in the order every output draws them (2.7). "Action needed" stands above them all and is not a type. */
export const TYPES = ["security", "deprecated", "removed", "added", "changed", "fixed"];

/** The least bump of each type; Changed has none and states its own (1.1). */
export const FLOOR = { removed: "major", added: "minor", deprecated: "minor", fixed: "patch", security: "patch", changed: null };

const KEYS = ["type", "area", "pr", "author", "tickets", "bump", "action", "migration"];
const ID = /^[a-z0-9][a-z0-9-]*$/;

/** Whether an id is reserved for a release's address: "unreleased", and anything that starts with a v and a digit (2.10). */
export const reservedId = (id) => id === "unreleased" || /^v[0-9]/.test(id);

/**
 * Whether an id is one the page itself uses: "main", the main landmark a skip link opens, and anything starting "bh-", the ids the HTML skill's
 * scripts make (a popover's title, a tooltip, a dialog's parts). An entry holding one would share its address with that element.
 */
export const pageId = (id) => id === "main" || id.startsWith("bh-");

/** The `key: value` lines between two `---` at the top of a file. Returns the head (with each key's line number) and the body's lines. */
export function readHead(source, file, keys) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0] !== "---") throw new Error(`${file}:1: the file starts with "---"`);
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new Error(`${file}: the head is not closed with "---"`);
  const head = {};
  const at = {};
  for (let index = 1; index < end; index++) {
    const line = lines[index];
    const match = /^([a-z]+): ?(.*)$/.exec(line);
    if (!match) throw new Error(`${file}:${index + 1}: not a "key: value" line: ${JSON.stringify(line)}`);
    const [, key, value] = match;
    if (!keys.includes(key)) throw new Error(`${file}:${index + 1}: unknown key "${key}" (the keys are ${keys.join(", ")})`);
    if (key in head) throw new Error(`${file}:${index + 1}: "${key}" is written twice`);
    head[key] = value.trim();
    at[key] = index + 1;
  }
  return { head, at, body: lines.slice(end + 1), bodyLine: end + 2 };
}

/** A list in square brackets: `[ENG-398, PROJ-88]`. Items are trimmed; an empty item, a space inside one or an item listed twice stops. */
export function readList(value, where, what) {
  const list = /^\[(.*)\]$/.exec(value);
  if (!list) throw new Error(`${where}: "${what}" is a list in square brackets, such as [ENG-398, PROJ-88]`);
  if (list[1].trim() === "") return [];
  const items = list[1].split(",").map((item) => item.trim());
  const seen = new Set();
  for (const item of items) {
    if (item === "") throw new Error(`${where}: "${what}" has an empty item (a comma with nothing after it)`);
    if (/\s/.test(item)) throw new Error(`${where}: "${item}" in "${what}" holds a space`);
    if (seen.has(item)) throw new Error(`${where}: "${item}" is listed twice in "${what}"`);
    seen.add(item);
  }
  return items;
}

/**
 * Read one entry file. `file` is its path as shown in messages; its base name, less `.md`, is the entry's id. Returns the entry as the
 * record keeps it, less its commit (the freeze resolves that).
 */
export function readEntry(source, file, config) {
  const id = path.basename(file).replace(/\.md$/, "");
  if (!file.endsWith(".md")) throw new Error(`${file}: an entry is a .md file`);
  if (!ID.test(id)) throw new Error(`${file}: the id "${id}" is lowercase letters, digits and hyphens`);
  if (reservedId(id)) throw new Error(`${file}: the id "${id}" is reserved for a release's address`);
  if (pageId(id)) throw new Error(`${file}: the id "${id}" is the page's own ("main", or the "bh-" ids the HTML skill makes)`);
  const { head, at, body } = readHead(source, file, KEYS);
  const line = (key) => `${file}:${at[key]}`;

  if (!("type" in head)) throw new Error(`${file}: "type" is required (${TYPES.join(", ")})`);
  const type = head.type;
  if (!TYPES.includes(type)) throw new Error(`${line("type")}: type "${type}" is one of ${TYPES.join(", ")}`);

  let pr;
  if ("pr" in head) {
    if (!/^[1-9][0-9]*$/.test(head.pr)) throw new Error(`${line("pr")}: "pr" is the pull request's number, such as 120`);
    pr = Number(head.pr);
  }
  const fromPr = /^pr([1-9][0-9]*)-[1-9][0-9]*$/.exec(id);
  if (fromPr && pr !== Number(fromPr[1])) throw new Error(`${file}: the file is named for pull request ${fromPr[1]}, so it says "pr: ${fromPr[1]}"${pr ? `, not ${pr}` : ""}`);
  // Both ways: an entry from a pull request is named for it; a free slug is for a change with no pull request.
  if (pr && !fromPr) throw new Error(`${file}: an entry from pull request ${pr} is named pr${pr}-1.md (pr${pr}-2.md for its second); a free name is for a change with no pull request`);

  let action = false;
  if ("action" in head) {
    if (head.action !== "true" && head.action !== "false") throw new Error(`${line("action")}: "action" is true or false`);
    action = head.action === "true";
  }

  const floor = FLOOR[type];
  let bump = floor;
  if ("bump" in head) {
    if (!BUMPS.includes(head.bump)) throw new Error(`${line("bump")}: "bump" is major, minor or patch`);
    if (floor && !atLeast(head.bump, floor)) throw new Error(`${line("bump")}: a ${type} entry needs at least a ${floor}; "bump" may raise it and never lower it`);
    bump = head.bump;
  }
  if (!bump) throw new Error(`${file}: a changed entry states its bump ("bump: major", "minor" or "patch"): a default that alters behavior is major, a token's value minor, an improvement patch`);
  if (bump === "major" && !action) throw new Error(`${file}: a major entry is always "action: true": what breaks is what a reader checks before upgrading`);

  let area;
  if ("area" in head) {
    if (!head.area) throw new Error(`${line("area")}: "area" is empty`);
    area = head.area;
  }

  let tickets = [];
  if ("tickets" in head) tickets = readList(head.tickets, line("tickets"), "tickets").map((ticket) => resolveTicket(ticket, config, file));

  let authors;
  if ("author" in head) {
    if (!head.author) throw new Error(`${line("author")}: "author" is empty; leave the key out when nobody has claimed the words`);
    authors = [resolvePerson(head.author, config, line("author"))];
  }

  let migration;
  if ("migration" in head) {
    if (!head.migration) throw new Error(`${line("migration")}: "migration" is empty`);
    migration = head.migration;
  }

  const text = body.join("\n").trim().replace(/\s*\n\s*/g, " ");
  if (!text) throw new Error(`${file}: the entry's sentence is missing under the head`);

  const entry = { id, type, bump, text };
  if (area) entry.area = area;
  if (action) entry.action = true;
  if (migration) entry.migration = migration;
  if (pr) entry.pr = pr;
  if (tickets.length) entry.tickets = tickets;
  if (authors) entry.authors = authors;
  return entry;
}

const NOTES_KEYS = ["title", "summary"];

/**
 * `.changes/release.md`: a release's notes. A head with `title` and `summary`; then a paragraph for everyone (no heading) and a `## For admins`
 * heading for each audience, each block opening with a `covers: [ids]` line. `ids` is every entry id the paragraph may name.
 */
export function readNotes(source, file, ids) {
  const { head, body, bodyLine } = readHead(source, file, NOTES_KEYS);
  const notes = {};
  if (head.title) notes.title = head.title;
  if (head.summary) notes.summary = head.summary;
  const blocks = [];
  let block = { for: undefined, line: bodyLine, lines: [] };
  body.forEach((text, index) => {
    const heading = /^## (.+)$/.exec(text);
    if (heading) {
      blocks.push(block);
      block = { for: heading[1].trim(), line: bodyLine + index, lines: [] };
    } else {
      block.lines.push({ text, line: bodyLine + index });
    }
  });
  blocks.push(block);
  const audiences = [];
  for (const { for: group, line, lines } of blocks) {
    const filled = lines.filter((entry) => entry.text.trim() !== "");
    if (!filled.length) {
      if (group) throw new Error(`${file}:${line}: "${group}" has no paragraph`);
      continue;
    }
    const [first, ...rest] = filled;
    // One paragraph a block: a second "covers" line, or words after a blank line, would publish unchecked words (start the next with a ## heading).
    const stray = rest.find((entry) => /^covers:/.test(entry.text.trim()));
    if (stray) throw new Error(`${file}:${stray.line}: a second "covers" line in one block; each paragraph is its own block under its own "## " heading`);
    const start = lines.indexOf(first);
    const gap = lines.findIndex((entry, index) => index > start && entry.text.trim() === "" && lines.slice(index + 1).some((after) => after.text.trim() !== ""));
    if (gap >= 0) throw new Error(`${file}:${lines[gap].line + 1}: ${group ? `"${group}"` : "the paragraph for everyone"} holds two paragraphs; it is one paragraph of one to three sentences`);
    const covers = /^covers: ?(.*)$/.exec(first.text.trim());
    if (!covers) throw new Error(`${file}:${first.line}: a paragraph opens with a "covers: [ids]" line naming the entries it is about`);
    const list = readList(covers[1].trim(), `${file}:${first.line}`, "covers");
    if (!list.length) throw new Error(`${file}:${first.line}: the paragraph covers no entry: a claim with no entry gets an entry or goes (R18)`);
    for (const id of list) if (!ids.has(id)) throw new Error(`${file}:${first.line}: covers "${id}", which is no entry of this release`);
    const text = rest.map((entry) => entry.text.trim()).join(" ").trim();
    if (!text) throw new Error(`${file}:${first.line}: the paragraph is missing under its "covers" line`);
    const audience = { text, covers: list };
    if (group) audience.for = group;
    audiences.push(audience);
  }
  if (audiences.length) notes.audiences = audiences;
  return notes;
}

/** Every pending entry file in a repository's `.changes`, read and checked, sorted by id. */
export function readPending(root, config) {
  const dir = path.join(root, CHANGES_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md") && name !== NOTES_FILE && name !== "README.md")
    .sort()
    .map((name) => readEntry(fs.readFileSync(path.join(dir, name), "utf8"), path.join(CHANGES_DIR, name), config));
}

/** The pending release notes, or null. */
export function readPendingNotes(root, ids) {
  const file = path.join(root, CHANGES_DIR, NOTES_FILE);
  if (!fs.existsSync(file)) return null;
  return readNotes(fs.readFileSync(file, "utf8"), path.join(CHANGES_DIR, NOTES_FILE), ids);
}
