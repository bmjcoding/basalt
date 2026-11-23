// DECISIONS 320, 4: the audit runs the lines the skill marks (m). It flags and a person decides. The check's false positives must not flag; its
// true ones must.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { audit, auditEntry, auditRecord } from "../audit.mjs";
import { readConfig } from "../config.mjs";
import { CONFIG, repository, tempDir, writeRecord } from "./support.mjs";

const config = readConfig(CONFIG);
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const rules = (text, more = {}) => auditEntry({ id: "x", type: "fixed", bump: "patch", text, ...more }, config).map((flag) => flag.rule);

test("the check's false positives do not flag", () => {
  // R6 accepts old and new in any wording: "which before" is not a flag.
  assert.deepEqual(rules("Changed the default gap to 12px, which before was 8px", { type: "changed", bump: "minor" }), []);
  // An entry with nothing that has an identifier needs no code formatting.
  assert.deepEqual(rules("Fixed the brand mark sitting off center when the sidebar collapsed to its rail"), []);
  // Under 12 words is a prompt to look, not a failure.
  assert.deepEqual(rules("Fixed `/hooks` losing your place when going back"), []);
  // A spelling inside code is the identifier as exported.
  assert.deepEqual(rules("Added `NotificationCenter` as the US spelling of `NotificationCentre`", { type: "added", bump: "minor" }), []);
  // A dated removal may use the future tense.
  assert.deepEqual(rules("Deprecated `Banner` in favor of `Notice`, which will be removed in 2.0.0 no earlier than Mar 1, 2027", { type: "deprecated", bump: "minor" }), []);
  // A product's quoted label and a GitHub issue written as repo#45 in a sentence are not pull request numbers.
  assert.deepEqual(rules("Fixed \"Waiting to be admitted\" staying on screen after the commander had admitted you"), []);
});

test("the check's true positives flag, each with its rule", () => {
  assert.deepEqual(rules("Bug fixes and performance improvements"), ["R1", "R9", "R9"]);
  assert.deepEqual(rules("Fixed the list losing its place when a row was removed (ENG-398)"), ["R14"]);
  assert.deepEqual(rules("Fixed the list losing its place when a row was removed."), ["R3"]);
  const thirtyOne = `Fixed ${Array.from({ length: 30 }, (_, index) => `word${index}`).join(" ")}`;
  assert.deepEqual(rules(thirtyOne), ["R3"]);
  const thirty = `Fixed ${Array.from({ length: 29 }, (_, index) => `word${index}`).join(" ")}`;
  assert.deepEqual(rules(thirty), []);
});

test("the other marked lines: banned words, punctuation, emoji, British spelling, future tense, numbers and names in the words", () => {
  assert.deepEqual(rules("Added a seamless, powerful composer", { type: "added", bump: "minor" }), ["R10", "R10"]);
  assert.deepEqual(rules("Fixed the composer!"), ["R10"]);
  assert.deepEqual(rules("Fixed the composer — it lost drafts"), ["R15"]);
  assert.deepEqual(rules("Fixed the composer; it lost drafts"), ["R15"]);
  assert.deepEqual(rules("Fixed the composer losing drafts 🎉"), ["R15"]);
  assert.deepEqual(rules("Fixed the colour of a cancelled run"), ["R15"]);
  assert.deepEqual(rules("Fixed the list, which will now keep its place"), ["R11"]);
  assert.deepEqual(rules("Fixed the list losing its place, from #120"), ["R14"]);
  assert.deepEqual(rules("Fixed the list losing its place, reported in PR 120"), ["R14"]);
  assert.deepEqual(rules("Fixed the list losing its place, reported by Sam Rivera"), ["R14"]);
  assert.deepEqual(rules("Fixed the list losing its place, see repo#45"), ["R14"]);
  assert.deepEqual(rules("The list now keeps its place"), ["R1"]);
});

test("the version lines: a bump below the floor, a Changed entry with none, a major entry that is not action", () => {
  assert.deepEqual(rules("Changed the toast's place", { type: "changed", bump: undefined }), ["Version"]);
  assert.deepEqual(rules("Added `Stepper`", { type: "added", bump: "patch" }), ["Version"]);
  assert.deepEqual(rules("Changed the default gap to 12px instead of 8px", { type: "changed", bump: "major" }), ["Version"]);
});

test("a release: the bump it carries, the pre-release's form and a stable release holding its candidates' entries", () => {
  const entry = (id, bump) => ({ id, type: bump === "minor" ? "added" : "fixed", bump, text: "Fixed it" });
  assert.deepEqual(auditRecord({ version: "1.4.1", date: "2026-11-23", previous: "1.4.0", entries: [entry("a", "minor")] }, []).map((flag) => flag.message), ["1.4.1 from 1.4.0 does not carry the minor its entries need"]);
  assert.deepEqual(auditRecord({ version: "0.2.1", date: "2026-11-23", previous: "0.2.0", entries: [entry("a", "minor")] }, []), []);
  assert.deepEqual(auditRecord({ version: "2.0.0-alpha.1", date: "2026-11-23", entries: [] }, []).map((flag) => flag.rule), ["Version"]);
  const rc = { version: "2.0.0-rc.1", date: "2026-12-01", entries: [entry("a", "patch"), entry("b", "patch")] };
  const stable = { version: "2.0.0", date: "2026-12-07", previous: "1.4.0", replaces: ["2.0.0-rc.1"], entries: [entry("a", "patch")] };
  assert.deepEqual(auditRecord(stable, [rc, stable]).map((flag) => flag.message), ['2.0.0-rc.1 held "b", which 2.0.0 does not: was it taken out on purpose?']);
});

test("the fixtures pass the audit, and a repository's flags name where they are", () => {
  assert.deepEqual(audit(path.join(FIXTURES, "slate")), []);
  assert.deepEqual(audit(path.join(FIXTURES, "harbor")), []);
  const copy = path.join(tempDir(), "slate");
  fs.cpSync(path.join(FIXTURES, "slate"), copy, { recursive: true });
  fs.writeFileSync(path.join(copy, ".changes", "pr55-1.md"), "---\ntype: fixed\narea: Chart\npr: 55\n---\nFixed the chart.\n");
  fs.writeFileSync(path.join(copy, ".changes", "pr56-1.md"), "---\ntype: fixed\npr: 56\ntickets: [XX-1]\n---\nFixed the chart\n");
  const flags = audit(copy);
  assert.deepEqual(flags.map((flag) => [flag.where, flag.rule]), [
    [".changes/pr56-1.md", "Each entry"],
    [".changes/pr55-1.md", "R3"],
    ["CHANGELOG.md", "Structure"],
  ]);
  assert.match(flags[0].message, /ticket "XX-1" matches no tracker/);
});

test("an area on every entry when any has one, and a tagged record that changed", () => {
  const repo = repository();
  writeRecord(repo.dir, { version: "1.0.0", date: "2026-11-20", entries: [{ id: "a", type: "fixed", bump: "patch", area: "List", text: "Fixed the list losing its place" }, { id: "b", type: "fixed", bump: "patch", text: "Fixed the sheet losing its place" }] });
  repo.commitAll("Release 1.0.0");
  repo.git("tag", "v1.0.0");
  writeRecord(repo.dir, { version: "1.0.0", date: "2026-11-21", entries: [{ id: "a", type: "fixed", bump: "patch", area: "List", text: "Fixed the list losing its place" }, { id: "b", type: "fixed", bump: "patch", text: "Fixed the sheet losing its place" }] });
  const flags = audit(repo.dir);
  assert.deepEqual(flags.map((flag) => [flag.where, flag.rule]), [["1.0.0 b", "Structure"], ["records", "Version"]]);
});
