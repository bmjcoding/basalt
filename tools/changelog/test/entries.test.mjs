// DECISIONS 320, 3.3 and 3.4: an id is read from one place, the `tickets` field of the entry's own file. Every row of 3.3's table, by its input and
// its message; the head's grammar; the id against the file's name; the bump and the author.
import assert from "node:assert/strict";
import { test } from "node:test";

import { readConfig } from "../config.mjs";
import { readEntry, readNotes } from "../entries.mjs";
import { CONFIG, entryText, stops } from "./support.mjs";

const config = readConfig(CONFIG);
const FILE = ".changes/pr120-1.md";
const head = (tickets, more = {}) => ({ type: "changed", area: "FormGrid", pr: 120, bump: "major", action: true, ...(tickets === null ? {} : { tickets }), ...more });
const SENTENCE = "Changed the parent layout item for `FormGrid` to `.basalt-form-grid-frame`, where existing sizing rules must move";
const read = (source, file = FILE) => readEntry(source, file, config);
const ids = (source, file) => (read(source, file).tickets ?? []).map((ticket) => ticket.id);

test("the entry says ENG-398, the pull request's body PROJ-88 and a trailer DES-27: only the entry's field is read", () => {
  // The body and the trailer are not inputs at all: the reader takes the file and nothing else. Words that look like them are words.
  const source = entryText(head("[ENG-398]"), `${SENTENCE}\n\nTickets: PROJ-88\nRefs: DES-27`);
  assert.deepEqual(ids(source), ["ENG-398"]);
});

test("an empty list and an absent field are the same: no tickets, and nothing to fall back to", () => {
  assert.deepEqual(ids(entryText(head("[]"), SENTENCE)), []);
  assert.deepEqual(ids(entryText(head(null), SENTENCE)), []);
  assert.equal(read(entryText(head(null), SENTENCE)).tickets, undefined);
});

test("two entries in one pull request each keep their own list", () => {
  assert.deepEqual(ids(entryText(head("[ENG-398]"), SENTENCE), ".changes/pr120-1.md"), ["ENG-398"]);
  assert.deepEqual(ids(entryText(head(null), SENTENCE), ".changes/pr120-2.md"), []);
});

test("a quoted Tickets: example and a fenced template in the words are words: only the head is read", () => {
  const source = `${entryText(head("[PROJ-88]"), SENTENCE)}\nWrite \`Tickets: ENG-1\` in the body.\n\n\`\`\`\ntickets: [ENG-2]\n\`\`\`\n`;
  assert.deepEqual(ids(source), ["PROJ-88"]);
});

test("two tickets fields stop, naming the file and the line", () => {
  const source = `---\ntype: fixed\npr: 120\ntickets: [ENG-398]\ntickets: [PROJ-88]\n---\nFixed the list\n`;
  assert.equal(stops(() => read(source)), `${FILE}:5: "tickets" is written twice`);
});

test("eng-398, an en dash, #45 and other#45 match no tracker: the message names the file, the id and the trackers", () => {
  for (const id of ["eng-398", "ENG–398", "#45", "other#45"]) {
    assert.equal(stops(() => read(entryText(head(`[${id}]`), SENTENCE))), `${FILE}: ticket "${id}" matches no tracker (Linear, Jira, GitHub)`);
  }
});

test("a trailing comma is an empty item, and a duplicate is listed twice", () => {
  assert.match(stops(() => read(entryText(head("[ENG-398,]"), SENTENCE))), /^\.changes\/pr120-1\.md:\d+: "tickets" has an empty item/);
  assert.match(stops(() => read(entryText(head("[ENG-398, ENG-398]"), SENTENCE))), /"ENG-398" is listed twice in "tickets"/);
});

test("spaces around an id are trimmed; a space inside one stops", () => {
  assert.deepEqual(ids(entryText(head("[ ENG-398 ,  PROJ-88 ]"), SENTENCE)), ["ENG-398", "PROJ-88"]);
  assert.match(stops(() => read(entryText(head("[ENG 398]"), SENTENCE))), /"ENG 398" in "tickets" holds a space/);
});

test("ENG-0398 and ENG-0 stop under the documented number pattern", () => {
  for (const id of ["ENG-0398", "ENG-0"]) assert.match(stops(() => read(entryText(head(`[${id}]`), SENTENCE))), new RegExp(`ticket "${id}" matches no tracker`));
});

test("a second tracker that also claims ENG- ids stops, naming both", () => {
  const two = readConfig({ ...CONFIG, trackers: [CONFIG.trackers[0], { name: "Tracker 2", pattern: "ENG-[0-9]+", url: "https://t2.example/{id}" }] });
  assert.equal(stops(() => readEntry(entryText(head("[ENG-398]"), SENTENCE), FILE, two)), `${FILE}: ticket "ENG-398" matches 2 trackers (Linear, Tracker 2)`);
});

test("tickets keep the order written, each resolved to its tracker, label and address", () => {
  const entry = read(entryText(head("[PROJ-88, repo#45, ENG-398]"), SENTENCE));
  assert.deepEqual(entry.tickets, [
    { tracker: "Jira", id: "PROJ-88", label: "PROJ-88", show: "text" },
    { tracker: "GitHub", id: "repo#45", label: "issue #45", show: "link", href: "https://github.com/example/repo/issues/45" },
    { tracker: "Linear", id: "ENG-398", label: "ENG-398", show: "link", href: "https://linear.app/example/issue/ENG-398" },
  ]);
});

test("the head's grammar: --- first, closed, key: value lines, known keys only, a list in brackets", () => {
  assert.equal(stops(() => read("type: fixed\n---\nFixed it\n")), `${FILE}:1: the file starts with "---"`);
  assert.equal(stops(() => read("---\ntype: fixed\nFixed it\n")), `${FILE}: the head is not closed with "---"`);
  assert.match(stops(() => read("---\ntype fixed\n---\nFixed it\n")), /pr120-1\.md:2: not a "key: value" line/);
  assert.match(stops(() => read("---\ntype: fixed\npr: 120\nTickets: [ENG-1]\n---\nFixed it\n")), /:4: not a "key: value" line/);
  assert.match(stops(() => read("---\ntype: fixed\npr: 120\nreviewer: sam\n---\nFixed it\n")), /:4: unknown key "reviewer"/);
  assert.match(stops(() => read(entryText(head("ENG-398"), SENTENCE))), /"tickets" is a list in square brackets/);
  assert.match(stops(() => read("---\ntype: fixed\npr: 120\n---\n\n")), /the entry's sentence is missing/);
  assert.match(stops(() => read("---\ntype: improved\npr: 120\n---\nImproved it\n")), /type "improved" is one of security, deprecated, removed, added, changed, fixed/);
});

test("an id the page itself uses is refused: main (the skip link's landmark) and the HTML skill's bh- ids (recheck 4)", () => {
  for (const name of ["main", "bh-pop-1", "bh-tooltip", "bh-"]) {
    assert.equal(stops(() => read(entryText({ type: "fixed" }), `.changes/${name}.md`)), `.changes/${name}.md: the id "${name}" is the page's own ("main", or the "bh-" ids the HTML skill makes)`);
  }
  for (const name of ["mainline", "main-menu", "bh", "fix-words", "fix-sources"]) assert.equal(read(entryText({ type: "fixed" }), `.changes/${name}.md`).id, name);
});

test("the id is the file's name: pr120-1.md says pr: 120; a slug is lowercase; unreleased and v-digit ids are reserved", () => {
  assert.equal(stops(() => read(entryText({ type: "fixed", pr: 121 }), FILE)), `${FILE}: the file is named for pull request 120, so it says "pr: 120", not 121`);
  assert.match(stops(() => read(entryText({ type: "fixed" }), FILE)), /so it says "pr: 120"$/);
  assert.equal(read(entryText({ type: "fixed" }), ".changes/docs-contrast-note.md").id, "docs-contrast-note");
  assert.match(stops(() => read(entryText({ type: "fixed" }), ".changes/Docs_Note.md")), /lowercase letters, digits and hyphens/);
  assert.match(stops(() => read(entryText({ type: "fixed" }), ".changes/unreleased.md")), /reserved/);
  assert.match(stops(() => read(entryText({ type: "fixed" }), ".changes/v1-fix.md")), /reserved/);
  assert.match(stops(() => read(entryText({ type: "fixed", pr: "12a" }), ".changes/fix-12.md")), /"pr" is the pull request's number/);
});

test("the bump: each type's floor, a Changed entry states its own, and a major entry is action", () => {
  assert.equal(read(entryText({ type: "added", pr: 120 })).bump, "minor");
  assert.equal(read(entryText({ type: "deprecated", pr: 120 })).bump, "minor");
  assert.equal(read(entryText({ type: "fixed", pr: 120 })).bump, "patch");
  assert.equal(read(entryText({ type: "security", pr: 120 })).bump, "patch");
  assert.equal(read(entryText({ type: "removed", pr: 120, action: true })).bump, "major");
  assert.equal(read(entryText({ type: "fixed", pr: 120, bump: "minor" })).bump, "minor");
  assert.match(stops(() => read(entryText({ type: "changed", pr: 120 }))), /a changed entry states its bump/);
  assert.match(stops(() => read(entryText({ type: "added", pr: 120, bump: "patch" }))), /an? added entry needs at least a minor/);
  assert.match(stops(() => read(entryText({ type: "removed", pr: 120 }))), /a major entry is always "action: true"/);
  assert.match(stops(() => read(entryText({ type: "changed", pr: 120, bump: "major" }))), /a major entry is always "action: true"/);
  assert.match(stops(() => read(entryText({ type: "fixed", pr: 120, action: "yes" }))), /"action" is true or false/);
  // A deprecation marked action is a minor: action raises nothing.
  const deprecation = read(entryText({ type: "deprecated", pr: 120, action: true }));
  assert.equal(deprecation.bump, "minor");
  assert.equal(deprecation.action, true);
});

test("the author is a key of the config's people, optional; an unknown key stops", () => {
  assert.deepEqual(read(entryText({ type: "fixed", pr: 120, author: "sam" })).authors, ["Sam Rivera"]);
  assert.equal(read(entryText({ type: "fixed", pr: 120 })).authors, undefined);
  assert.match(stops(() => read(entryText({ type: "fixed", pr: 120, author: "octocat" }))), /author "octocat" is not a key of the config's "people" \(sam\)/);
});

test("the release notes: each paragraph opens with covers, names entries that exist, and covers at least one", () => {
  const entries = new Set(["pr131-1", "pr131-2"]);
  const notes = readNotes("---\ntitle: A monitor can open an incident room\n---\ncovers: [pr131-1]\nA monitor can open a room.\n\n## For admins\ncovers: [pr131-1, pr131-2]\nIn Settings, open Integrations.\n", ".changes/release.md", entries);
  assert.deepEqual(notes, { title: "A monitor can open an incident room", audiences: [
    { text: "A monitor can open a room.", covers: ["pr131-1"] },
    { for: "For admins", text: "In Settings, open Integrations.", covers: ["pr131-1", "pr131-2"] },
  ] });
  assert.match(stops(() => readNotes("---\n---\ncovers: []\nA claim.\n", ".changes/release.md", entries)), /covers no entry/);
  assert.match(stops(() => readNotes("---\n---\ncovers: [pr999-1]\nA claim.\n", ".changes/release.md", entries)), /covers "pr999-1", which is no entry/);
  assert.match(stops(() => readNotes("---\n---\nA claim with no covers line.\n", ".changes/release.md", entries)), /opens with a "covers: \[ids\]" line/);
  assert.match(stops(() => readNotes("---\n---\n## For admins\n\n", ".changes/release.md", entries)), /"For admins" has no paragraph/);
});

test("an entry from a pull request is named for it, and a free name is for a change with none", () => {
  assert.match(stops(() => read(entryText({ type: "fixed", pr: 123 }), ".changes/editor.md")), /an entry from pull request 123 is named pr123-1\.md/);
  assert.equal(read(entryText({ type: "fixed" }), ".changes/editor.md").id, "editor");
});

test("the author is an own key of the config's people: constructor and the like are refused", () => {
  const empty = readConfig({ ...CONFIG, people: {} });
  for (const key of ["constructor", "toString", "__proto__"]) {
    assert.match(stops(() => readEntry(entryText({ type: "fixed", pr: 120, author: key }), FILE, empty)), /is not a key of the config's "people"/);
  }
});

test("a paragraph is one block: a second covers line, or a second paragraph, stops with its line", () => {
  const entries = new Set(["pr131-1"]);
  assert.match(stops(() => readNotes("---\n---\ncovers: [pr131-1]\nFirst paragraph.\n\ncovers: [missing]\nSecond paragraph.\n", ".changes/release.md", entries)), /release\.md:6: a second "covers" line in one block/);
  assert.match(stops(() => readNotes("---\n---\ncovers: [pr131-1]\nFirst paragraph.\n\nSecond paragraph.\n", ".changes/release.md", entries)), /release\.md:\d+: the paragraph for everyone holds two paragraphs/);
});
