// DECISIONS 320, 1.1 and 3.4: the freeze. The bump in 0.x and from 1.0, the line, pre-releases, the commit that added each file, and what it
// refuses. Every repository here is a throwaway one with made-up entries.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { pageReleases, readRecords } from "../records.mjs";
import { freeze } from "../release.mjs";
import { readConfig } from "../config.mjs";
import { CONFIG, repository, stops, tempDir, writeRecord } from "./support.mjs";

const config = readConfig(CONFIG);
const released = (version, date, entries = []) => ({ version, date, entries });
const fixed = (pr, n = 1) => [`pr${pr}-${n}`, { type: "fixed", area: "List", pr }];

test("from 1.0: a patch is refused for an Added entry, and the message says the least version", () => {
  const repo = repository();
  writeRecord(repo.dir, released("1.4.0", "2026-11-20"));
  repo.commitAll("Release 1.4.0");
  repo.entry("pr10-1", { type: "added", area: "Stepper", pr: 10 }, "Added `Stepper` with queued and running states");
  assert.equal(stops(() => freeze({ root: repo.dir, version: "1.4.1", date: "2026-11-23" })), "1.4.1 understates the release: from 1.4.0 it needs a minor (pr10-1), so at least 1.5.0");
  assert.equal(freeze({ root: repo.dir, version: "1.5.0", date: "2026-11-23" }).record.previous, "1.4.0");
});

test("in 0.x the numbers move one place right: an addition rides a patch, and a breaking change needs the minor", () => {
  const repo = repository();
  writeRecord(repo.dir, released("0.2.0", "2026-11-20"));
  repo.commitAll("Release 0.2.0");
  repo.entry("pr11-1", { type: "added", area: "Stepper", pr: 11 }, "Added `Stepper` with queued and running states");
  assert.equal(freeze({ root: repo.dir, version: "0.2.1", date: "2026-11-21" }).record.entries[0].id, "pr11-1");
  repo.commitAll("Release 0.2.1");
  repo.entry("pr12-1", { type: "removed", area: "Banner", pr: 12, action: true }, "Removed `Banner`, so use `Notice` with the same props");
  assert.equal(stops(() => freeze({ root: repo.dir, version: "0.2.2", date: "2026-11-23" })), "0.2.2 understates the release: from 0.2.1 it needs a major (pr12-1), one place right in 0.x, so at least 0.3.0");
  assert.equal(freeze({ root: repo.dir, version: "0.3.0", date: "2026-11-23" }).record.previous, "0.2.1");
});

test("a minor is accepted for a deprecation marked action: action raises nothing", () => {
  const repo = repository();
  writeRecord(repo.dir, released("1.4.0", "2026-11-20"));
  repo.commitAll("Release 1.4.0");
  repo.entry("pr13-1", { type: "deprecated", area: "Banner", pr: 13, action: true }, "Deprecated `Banner` in favor of `Notice`, removed in 2.0.0 no earlier than Mar 1, 2027");
  const { record } = freeze({ root: repo.dir, version: "1.5.0", date: "2026-11-23" });
  assert.deepEqual(record.entries.map((entry) => [entry.id, entry.bump, entry.action]), [["pr13-1", "minor", true]]);
});

test("a Changed entry with no bump, a bump below its floor and a major entry without action are refused", () => {
  const cases = [
    [{ type: "changed", area: "Toast", pr: 14 }, /a changed entry states its bump/],
    [{ type: "added", area: "Toast", pr: 14, bump: "patch" }, /an? added entry needs at least a minor/],
    [{ type: "changed", area: "Toast", pr: 14, bump: "major" }, /a major entry is always "action: true"/],
  ];
  for (const [head, message] of cases) {
    const repo = repository();
    repo.entry("pr14-1", head, "Changed toasts to sit below the bar instead of above the tabs");
    assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" })), message);
    assert.deepEqual(fs.readdirSync(repo.dir).filter((name) => name === "changelog"), [], "nothing is written before every check passes");
  }
});

test("a version higher than the entries need is accepted: the version is the owner's to give", () => {
  const repo = repository();
  writeRecord(repo.dir, released("1.4.0", "2026-11-20"));
  repo.commitAll("Release 1.4.0");
  repo.entry(...fixed(15), "Fixed the list losing its place when a row was removed");
  assert.equal(freeze({ root: repo.dir, version: "2.0.0", date: "2026-11-23" }).record.previous, "1.4.0");
});

test("the line: 1.4.1 is accepted after 2.0.0, 1.3.9 is refused after 1.4.0, and a version opening a line must top them all", () => {
  const repo = repository();
  writeRecord(repo.dir, released("1.3.0", "2026-11-01"));
  writeRecord(repo.dir, released("1.4.0", "2026-11-10"));
  writeRecord(repo.dir, { ...released("2.0.0", "2026-11-20"), previous: "1.4.0" });
  repo.commitAll("Earlier releases");
  repo.entry(...fixed(16), "Fixed the list losing its place when a row was removed");
  assert.equal(stops(() => freeze({ root: repo.dir, version: "1.3.9", date: "2026-11-23" })), "1.3.9 is not higher than 1.4.0, released in its line (1.x.x)");
  assert.equal(stops(() => freeze({ root: repo.dir, version: "2.0.0", date: "2026-11-23" })), "2.0.0 is published, and a published version is never edited");
  const { record } = freeze({ root: repo.dir, version: "1.4.1", date: "2026-11-23" });
  assert.equal(record.previous, "1.4.0", "measured from the highest stable release below it in its own line");
  // 0.x lines are the minor: 0.3.0 opens a line and must be higher than every release there is.
  const other = repository();
  writeRecord(other.dir, released("1.0.0", "2026-11-01"));
  other.commitAll("Release 1.0.0");
  other.entry(...fixed(17), "Fixed the list losing its place when a row was removed");
  assert.equal(stops(() => freeze({ root: other.dir, version: "0.3.0", date: "2026-11-23" })), "0.3.0 opens a line, so it must be higher than every release; 1.0.0 is higher");
});

test("two releases of one day are ordered by precedence, never by date", () => {
  const repo = repository();
  writeRecord(repo.dir, released("1.4.0", "2026-11-23"));
  repo.commitAll("Release 1.4.0");
  repo.entry(...fixed(18), "Fixed the list losing its place when a row was removed");
  freeze({ root: repo.dir, version: "1.4.1", date: "2026-11-23" });
  // A backport the same day to an older line: it sits below by precedence, though it was frozen last.
  writeRecord(repo.dir, released("1.3.5", "2026-11-23"));
  assert.deepEqual(pageReleases(repo.dir, { config }).map((release) => release.version), ["1.4.1", "1.4.0", "1.3.5"]);
});

test("pre-releases: a candidate's freeze removes nothing, the next holds only what is new, the stable version holds all under the same ids", () => {
  const repo = repository();
  writeRecord(repo.dir, released("1.4.0", "2026-11-20"));
  repo.commitAll("Release 1.4.0");
  repo.entry("pr20-1", { type: "removed", area: "Sign-in", pr: 20, action: true }, "Removed sign-in with a shared code, so each person signs in with their own account");
  repo.entry("pr21-1", { type: "added", area: "Sign-in", pr: 21 }, "Added single sign-on through your company's identity provider");
  const rc1 = freeze({ root: repo.dir, version: "2.0.0-rc.1", date: "2026-12-01" });
  assert.deepEqual(rc1.removed, []);
  assert.deepEqual(repo.pending(), ["pr20-1.md", "pr21-1.md"], "every pending file stays");
  repo.commitAll("Release 2.0.0-rc.1");
  repo.entry("pr22-1", { type: "added", area: "Sign-in", pr: 22 }, "Added a sign-in page that names your identity provider");
  const rc2 = freeze({ root: repo.dir, version: "2.0.0-rc.2", date: "2026-12-03" });
  assert.deepEqual(rc2.record.entries.map((entry) => entry.id), ["pr22-1"]);
  repo.commitAll("Release 2.0.0-rc.2");
  // The Unreleased section is what no candidate holds: nothing, here.
  assert.equal(pageReleases(repo.dir, { config })[0].version, "2.0.0-rc.2");
  const stable = freeze({ root: repo.dir, version: "2.0.0", date: "2026-12-07" });
  assert.deepEqual(stable.record.entries.map((entry) => entry.id).sort(), ["pr20-1", "pr21-1", "pr22-1"]);
  assert.deepEqual(stable.record.replaces, ["2.0.0-rc.1", "2.0.0-rc.2"]);
  assert.equal(stable.record.previous, "1.4.0");
  // The same entry has the same commit in the candidate and in the stable release.
  assert.equal(stable.record.entries.find((entry) => entry.id === "pr20-1").commit.sha, repo.record("2.0.0-rc.1").entries.find((entry) => entry.id === "pr20-1").commit.sha);
  assert.deepEqual(repo.pending(), [], "the stable version takes every pending file");
  assert.deepEqual(pageReleases(repo.dir, { config }).map((release) => release.version), ["2.0.0", "1.4.0"], "a replaced candidate is not drawn");
});

test("a canary has no freeze, and a pre-release is -beta.N or -rc.N", () => {
  const repo = repository();
  repo.entry(...fixed(23), "Fixed the list losing its place when a row was removed");
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0-canary.20261123.1", date: "2026-11-23" })), /a canary is a build from the default branch, with no freeze/);
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0-alpha.1", date: "2026-11-23" })), /-beta\.N or -rc\.N/);
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0+9f3c1e2", date: "2026-11-23" })), /holds build metadata/);
  assert.match(stops(() => freeze({ root: repo.dir, version: "2026.11.23.1", date: "2026-11-23" })), /not a SemVer version/);
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-31" })), /a calendar date/);
});

test("the commit is the first-parent commit that added the file: a merge, a squash and a rebase", () => {
  const repo = repository();
  // A merge: the entry is committed on a branch and merged with a merge commit. The merge is the commit that put it on main.
  repo.git("checkout", "-q", "-b", "feature");
  repo.entry("pr30-1", { type: "fixed", area: "List", pr: 30 }, "Fixed the list losing its place when a row was removed", "Fix the list");
  repo.git("checkout", "-q", "main");
  repo.git("merge", "-q", "--no-ff", "feature", "-m", "Merge pull request #30 from example/feature");
  const merge = repo.git("rev-parse", "HEAD");
  // A squash: one commit on main, its subject ending with the pull request.
  const squash = repo.entry("pr31-1", { type: "fixed", area: "Sheet", pr: 31 }, "Fixed clipped focus rings at the top of a sheet's body", "Fix the sheet's rings (#31)");
  // A rebase: the branch's own commit, replayed onto main, with no number in its subject.
  repo.git("checkout", "-q", "-b", "rebased");
  repo.entry("pr32-1", { type: "fixed", area: "Toast", pr: 32 }, "Fixed toasts stacking under the tab bar on phones", "Fix toasts under the tab bar");
  repo.git("checkout", "-q", "main");
  repo.git("rebase", "-q", "rebased");
  const rebased = repo.git("rev-parse", "HEAD");
  const { record } = freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" });
  const sha = (id) => record.entries.find((entry) => entry.id === id).commit.sha;
  assert.equal(sha("pr30-1"), merge);
  assert.equal(sha("pr31-1"), squash);
  assert.equal(sha("pr32-1"), rebased);
  assert.equal(record.entries.find((entry) => entry.id === "pr31-1").commit.href, `https://github.com/example/repo/commit/${squash}`);
});

test("a commit whose subject names another pull request stops, showing both; an uncommitted entry stops", () => {
  const repo = repository();
  repo.entry("pr33-1", { type: "fixed", area: "List", pr: 33 }, "Fixed the list losing its place when a row was removed", "Fix the list (#34)");
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" })), /\.changes\/pr33-1\.md: says pull request 33, and the commit that added it \([0-9a-f]{8}\) is "Fix the list \(#34\)"/);
  const fresh = repository();
  fresh.write("pr35-1", { type: "fixed", area: "List", pr: 35 }, "Fixed the list losing its place when a row was removed");
  assert.match(stops(() => freeze({ root: fresh.dir, version: "1.0.0", date: "2026-11-23" })), /no commit on this branch added it/);
});

test("a shallow clone is refused", () => {
  const repo = repository();
  repo.entry(...fixed(36), "Fixed the list losing its place when a row was removed");
  repo.entry(...fixed(37), "Fixed the list losing its place when a row was added");
  const clone = path.join(tempDir(), "clone");
  execFileSync("git", ["clone", "-q", "--depth", "1", `file://${repo.dir}`, clone]);
  assert.match(stops(() => freeze({ root: clone, version: "1.0.0", date: "2026-11-23" })), /this clone is shallow/);
});

test("a record is never overwritten, and a published version is never frozen again", () => {
  const repo = repository();
  repo.entry(...fixed(38), "Fixed the list losing its place when a row was removed");
  freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" });
  const before = fs.readFileSync(path.join(repo.dir, "changelog", "releases", "1.0.0.json"), "utf8");
  assert.equal(stops(() => freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-24" })), "1.0.0 is published, and a published version is never edited");
  assert.equal(fs.readFileSync(path.join(repo.dir, "changelog", "releases", "1.0.0.json"), "utf8"), before);
});

test("covers is enforced: a paragraph naming no entry, or one this release does not hold, stops", () => {
  const repo = repository();
  repo.entry("pr40-1", { type: "added", area: "Integrations", pr: 40 }, "Added webhook declarations so a monitor can open a room");
  repo.notes("---\ntitle: A monitor can open a room\n---\ncovers: [pr41-1]\nA monitor can open a room.\n");
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" })), /covers "pr41-1", which is no entry/);
  repo.notes("---\ntitle: A monitor can open a room\n---\ncovers: [pr40-1]\nA monitor can open a room.\n");
  const { record } = freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" });
  assert.deepEqual(record.audiences, [{ text: "A monitor can open a room.", covers: ["pr40-1"] }]);
  assert.equal(record.title, "A monitor can open a room");
});

test("a release with no entries needs a summary; one of more than three needs a summary or paragraphs", () => {
  const empty = repository();
  assert.match(stops(() => freeze({ root: empty.dir, version: "0.1.0", date: "2026-11-02" })), /has no entries, so it needs a summary/);
  empty.notes("---\nsummary: The first version in this changelog. Earlier work is in the repository's history.\n---\n");
  assert.equal(freeze({ root: empty.dir, version: "0.1.0", date: "2026-11-02" }).record.entries.length, 0);
  const many = repository();
  for (let pr = 50; pr < 54; pr++) many.entry(...fixed(pr), `Fixed the list losing its place in case ${pr}`);
  assert.match(stops(() => freeze({ root: many.dir, version: "1.0.0", date: "2026-11-23" })), /has 4 changes, so it needs a summary/);
});

test("an unknown author is refused; an entry with no author is accepted and has no authors", () => {
  const repo = repository();
  repo.entry("pr60-1", { type: "fixed", area: "List", pr: 60, author: "octocat" }, "Fixed the list losing its place when a row was removed");
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" })), /author "octocat" is not a key/);
  const ok = repository();
  ok.entry("pr61-1", { type: "fixed", area: "List", pr: 61, author: "sam" }, "Fixed the list losing its place when a row was removed");
  ok.entry("pr62-1", { type: "fixed", area: "List", pr: 62 }, "Fixed the list losing its place when a row was added");
  const { record } = freeze({ root: ok.dir, version: "1.0.0", date: "2026-11-23" });
  assert.deepEqual(record.entries.find((entry) => entry.id === "pr61-1").authors, ["Sam Rivera"]);
  assert.equal("authors" in record.entries.find((entry) => entry.id === "pr62-1"), false);
});

test("an id held by two records that do not replace one another stops", () => {
  const repo = repository();
  writeRecord(repo.dir, { ...released("1.4.0", "2026-11-20"), entries: [{ id: "pr70-1", type: "fixed", bump: "patch", text: "Fixed the list" }] });
  repo.commitAll("Release 1.4.0");
  // A backport that reuses the id instead of writing its own entry.
  repo.entry("pr70-1", { type: "fixed", area: "List", pr: 70 }, "Fixed the list losing its place when a row was removed");
  assert.match(stops(() => freeze({ root: repo.dir, version: "1.4.1", date: "2026-11-23" })), /pr70-1\.md: the id is already held by 1\.4\.0; a backport writes its own entry/);
  // Two records holding one id, neither replacing the other: reading them stops.
  writeRecord(repo.dir, { ...released("2.0.0", "2026-11-21"), entries: [{ id: "pr70-1", type: "fixed", bump: "patch", text: "Fixed the list" }] });
  assert.match(stops(() => readRecords(repo.dir)), /the entry id "pr70-1" is held by 1\.4\.0 and 2\.0\.0/);
  // A stable release and the candidate it replaces may share it.
  fs.rmSync(path.join(repo.dir, "changelog", "releases", "2.0.0.json"));
  writeRecord(repo.dir, { ...released("2.0.0-rc.1", "2026-11-21"), entries: [{ id: "pr71-1", type: "fixed", bump: "patch", text: "Fixed the list" }] });
  writeRecord(repo.dir, { ...released("2.0.0", "2026-11-22"), replaces: ["2.0.0-rc.1"], entries: [{ id: "pr71-1", type: "fixed", bump: "patch", text: "Fixed the list" }] });
  assert.equal(readRecords(repo.dir).length, 3);
});

test("a stable version removes the pending files and release.md, and regenerates CHANGELOG.md", () => {
  const repo = repository();
  repo.entry("pr80-1", { type: "added", area: "Stepper", pr: 80, tickets: "[ENG-12, PROJ-4]" }, "Added `Stepper` with queued and running states");
  repo.notes("---\nsummary: Slate adds a stepper.\n---\n");
  const result = freeze({ root: repo.dir, version: "1.0.0", date: "2026-11-23" });
  assert.deepEqual(result.removed, [".changes/pr80-1.md", ".changes/release.md"]);
  const changelog = fs.readFileSync(path.join(repo.dir, "CHANGELOG.md"), "utf8");
  assert.match(changelog, /^## 1\.0\.0 - 2026-11-23$/m);
  assert.match(changelog, /^- Stepper: Added `Stepper` with queued and running states \(\[#80\]\(https:\/\/github\.com\/example\/repo\/pull\/80\), Linear \[ENG-12\]\(https:\/\/linear\.app\/example\/issue\/ENG-12\), Jira PROJ-4\)$/m);
  assert.deepEqual(result.record.entries[0].tickets.map((ticket) => ticket.id), ["ENG-12", "PROJ-4"]);
});
