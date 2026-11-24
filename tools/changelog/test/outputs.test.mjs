// DECISIONS 320, 3.4: every output is generated from the records and nothing else. CHANGELOG.md, the page's data and a GitHub Release's body
// hold the same entries in the order of 2.7; a replaced pre-release is in none of them; Unreleased leaves out what a candidate holds; a rebuild
// needs no git and no network; a changed config does not change a frozen release. The fixtures are what the tool writes.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { outputs, taggedDifferences } from "../build.mjs";
import { loadConfig } from "../config.mjs";
import { readEntry } from "../entries.mjs";
import { buildRepository, copyOut, HARBOR, SLATE } from "../fixtures/make.mjs";
import { sectionsOf, SECTION_NAMES } from "../outputs.mjs";
import { pageReleases, readRecords } from "../records.mjs";
import { repository, tempDir, writeRecord } from "./support.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "..", "fixtures");
const BUILD = path.join(HERE, "..", "build.mjs");

/** The pull request numbers in a Markdown block, in order: the order the entries stand in. */
const prsIn = (markdown) => [...markdown.matchAll(/\[#([0-9]+)\]/g)].map((match) => Number(match[1]));
const section = (markdown, start, end) => markdown.slice(markdown.indexOf(start), end ? markdown.indexOf(end, markdown.indexOf(start) + start.length) : undefined);

test("CHANGELOG.md, the page's data and the GitHub body hold the same entries in the order of 2.7", () => {
  const slate = outputs(path.join(FIXTURES, "slate"));
  const release = slate.releases.find((candidate) => candidate.version === "0.2.0");
  const order = sectionsOf(release);
  assert.deepEqual(order.map((part) => part.key), ["action", "deprecated", "added", "changed", "fixed"]);
  const fromData = order.flatMap((part) => part.entries.map((entry) => entry.pr?.number)).filter(Boolean);
  const markdown = section(slate.changelog, "## 0.2.0 - 2026-11-16", "## 0.1.0");
  assert.deepEqual(prsIn(markdown), fromData);
  const headings = [...markdown.matchAll(/^### (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings, ["Action needed", "Deprecated", "Added", "Changed", "Fixed"]);
  const github = slate.github("0.2.0");
  assert.deepEqual(prsIn(github), fromData);
  assert.deepEqual([...github.matchAll(/^##+ (.+)$/gm)].map((match) => match[1]), ["Action needed", "Changes", "Deprecated", "Added", "Changed", "Fixed"]);
  assert.match(github, /^Before upgrading from 0\.1\.0, check these 4 changes\.$/m);
  assert.match(github, /Full diff: \[v0\.1\.0\.\.\.v0\.2\.0\]\(https:\/\/github\.com\/example\/slate\/compare\/v0\.1\.0\.\.\.v0\.2\.0\)/);
  // Every section name the outputs use is one of the page's fixed words.
  for (const heading of headings) assert.ok(Object.values(SECTION_NAMES).includes(heading));
});

test("a product's release: Action needed first with no upgrade line, then the headline over its paragraphs, then the fold over the summary and the list", () => {
  const harbor = outputs(path.join(FIXTURES, "harbor"));
  const markdown = section(harbor.changelog, "## 2.0.0 - 2026-12-07", "## 1.4.1");
  assert.doesNotMatch(markdown, /Before upgrading/);
  assert.deepEqual([...markdown.matchAll(/^(#{3,4}) (.+)$/gm)].map((match) => `${match[1]} ${match[2]}`), ["### Action needed", "### Responders sign in with their own account", "#### For admins", "### Other changes", "#### Added", "#### Fixed"]);
  // Every paragraph sits under a heading of its own: none follows a list.
  const blocks = markdown.split(/\n\n/).map((block) => block.trim()).filter(Boolean);
  blocks.forEach((block, index) => { if (!/^[#-]/.test(block) && index > 0) assert.match(blocks[index - 1], /^#/, `"${block.slice(0, 40)}" follows a heading`); });
  const github = harbor.github("2.0.0");
  assert.deepEqual([...github.matchAll(/^(#{2,3}) (.+)$/gm)].map((match) => `${match[1]} ${match[2]}`), ["## Action needed", "## Responders sign in with their own account", "### For admins", "## Other changes", "### Added", "### Fixed"]);
});

test("a product's patch with an action and no headline gets no package upgrade line: the form is the config's", async () => {
  const { changelogMarkdown } = await import("../outputs.mjs");
  const release = { version: "1.3.2", date: "2026-11-24", previous: "1.3.1", entries: [{ id: "pr9-1", type: "changed", bump: "patch", action: true, text: "Changed the room timer to stop at midnight, so restart long rooms each day" }] };
  assert.doesNotMatch(changelogMarkdown([release], { form: "notes" }), /Before upgrading/);
  assert.match(changelogMarkdown([release], { form: "reference" }), /Before upgrading from 1\.3\.1, check this change\./);
});

test("a product release whose every change needs action keeps its summary, after the paragraphs, in CHANGELOG.md and a GitHub Release (recheck 6)", async () => {
  const { changelogMarkdown, githubBody } = await import("../outputs.mjs");
  const release = {
    version: "1.4.1", previous: "1.4.0", date: "2026-11-22", title: "Recovery", summary: "The recovery screen changed.",
    audiences: [{ text: "Use a recovery code.", covers: ["login"] }, { for: "For admins", text: "Send each person a new code.", covers: ["login"] }],
    entries: [{ id: "login", type: "security", bump: "patch", action: true, text: "Use a new recovery code after resetting a password" }],
  };
  for (const [name, text] of [["CHANGELOG.md", changelogMarkdown([release], { form: "notes" })], ["GitHub", githubBody(release, { form: "notes" })]]) {
    const at = (words) => text.indexOf(words);
    assert.ok(at("The recovery screen changed.") > 0, `${name}: the summary is written`);
    assert.ok(at("Action needed") < at("Use a recovery code.") && at("Send each person a new code.") < at("The recovery screen changed."), `${name}: after the paragraphs, as on the page`);
    assert.doesNotMatch(text, /Other changes|All changes/, `${name}: no fold over nothing`);
  }
});

test("a replaced pre-release is in no output, and its entries are each in one place", () => {
  const harbor = outputs(path.join(FIXTURES, "harbor"));
  assert.deepEqual(harbor.releases.map((release) => release.version), ["2.0.0", "1.4.1", "1.4.0", "1.3.1", "1.3.0"]);
  assert.doesNotMatch(harbor.changelog, /rc\.[12]/);
  for (const pr of [140, 141, 142]) assert.equal(prsIn(harbor.changelog).filter((number) => number === pr).length, 1, `#${pr} once`);
  assert.throws(() => harbor.github("2.0.0-rc.1"), /not a drawn release/);
  assert.deepEqual(harbor.releases[0].replaces, ["2.0.0-rc.1", "2.0.0-rc.2"]);
  // Before the stable version shipped, its candidates were drawn as releases of their own, each with what it added.
  const records = readRecords(path.join(FIXTURES, "harbor")).filter((record) => record.version !== "2.0.0");
  const before = pageReleases(path.join(FIXTURES, "harbor"), { records, pending: [] });
  assert.deepEqual(before.slice(0, 2).map((release) => [release.version, release.entries.map((entry) => entry.id)]), [["2.0.0-rc.2", ["pr142-1"]], ["2.0.0-rc.1", ["pr140-1", "pr141-1"]]]);
});

test("Unreleased is the pending files that no pre-release record holds", () => {
  const root = path.join(FIXTURES, "harbor");
  const config = loadConfig(root);
  const records = readRecords(root).filter((record) => record.version !== "2.0.0");
  const pending = [
    readEntry("---\ntype: removed\narea: Sign-in\npr: 140\naction: true\n---\nRemoved sign-in with a shared room code\n", ".changes/pr140-1.md", config),
    readEntry("---\ntype: fixed\narea: Rooms\npr: 143\n---\nFixed the room list scrolling to the top when a new room opened\n", ".changes/pr143-1.md", config),
  ];
  const releases = pageReleases(root, { config, records, pending });
  assert.equal(releases[0].version, "Unreleased");
  assert.deepEqual(releases[0].entries.map((entry) => entry.id), ["pr143-1"]);
  assert.equal(releases[0].entries[0].commit, undefined, "an unreleased entry has no commit");
});

test("rebuilding with no git and no network gives the same bytes", () => {
  for (const name of ["slate", "harbor"]) {
    const copy = path.join(tempDir(), name);
    fs.cpSync(path.join(FIXTURES, name), copy, { recursive: true });
    fs.rmSync(path.join(copy, "CHANGELOG.md"));
    // No git on the PATH at all: the build reads files and nothing else.
    execFileSync(process.execPath, [BUILD, "--root", copy], { env: { PATH: "" } });
    execFileSync(process.execPath, [BUILD, "--root", copy, "--json", path.join(copy, "out.json")], { env: { PATH: "" } });
    assert.equal(fs.readFileSync(path.join(copy, "CHANGELOG.md"), "utf8"), fs.readFileSync(path.join(FIXTURES, name, "CHANGELOG.md"), "utf8"), name);
    assert.equal(fs.readFileSync(path.join(copy, "out.json"), "utf8"), fs.readFileSync(path.join(FIXTURES, name, "releases.json"), "utf8"), name);
  }
});

test("a changed config does not change a frozen release", () => {
  const copy = path.join(tempDir(), "slate");
  fs.cpSync(path.join(FIXTURES, "slate"), copy, { recursive: true });
  const before = outputs(copy).releases.filter((release) => !release.unreleased);
  const githubBefore = Object.fromEntries(["0.2.1", "0.1.0", "0.2.0"].map((version) => [version, outputs(copy).github(version)]));
  const config = JSON.parse(fs.readFileSync(path.join(copy, "changelog.config.json"), "utf8"));
  config.repository = "https://git.example/elsewhere/slate";
  config.trackers = config.trackers.map((tracker) => ({ ...tracker, url: tracker.url ? "https://tracker.example/{id}" : undefined, show: tracker.show === "none" ? "link" : tracker.show, ...(tracker.show === "none" ? { url: "https://tracker.example/{id}" } : {}) }));
  config.people = {};
  fs.writeFileSync(path.join(copy, "changelog.config.json"), JSON.stringify(config));
  const after = outputs(copy).releases.filter((release) => !release.unreleased);
  assert.deepEqual(after, before);
  // The GitHub body's comparison is the frozen record's repository, the empty release's too.
  for (const version of ["0.2.1", "0.1.0", "0.2.0"]) assert.equal(outputs(copy).github(version), githubBefore[version], version);
});

test("a hidden tracker's tickets are recorded and not published; a text tracker's are not linked", () => {
  const root = path.join(FIXTURES, "slate");
  const record = readRecords(root).find((candidate) => candidate.version === "0.2.0");
  const frozen = record.entries.find((entry) => entry.id === "pr46-1");
  assert.deepEqual(frozen.tickets.map((ticket) => ticket.id), ["DS-27", "DS-31", "PRJ-90", "slate#45", "SL-131", "SUP-7"]);
  const drawn = outputs(root).releases.find((release) => release.version === "0.2.0").entries.find((entry) => entry.id === "pr46-1");
  assert.deepEqual(drawn.tickets.map((ticket) => ticket.label), ["DS-27", "DS-31", "PRJ-90", "issue #45", "SL-131"]);
  assert.equal(drawn.tickets.find((ticket) => ticket.label === "PRJ-90").href, undefined);
  assert.doesNotMatch(outputs(root).changelog, /SUP-7/);
});

test("a record that differs from its tag's copy is found", () => {
  const repo = repository();
  writeRecord(repo.dir, { version: "1.0.0", date: "2026-11-20", entries: [] });
  repo.commitAll("Release 1.0.0");
  repo.git("tag", "v1.0.0");
  assert.deepEqual(taggedDifferences(repo.dir), []);
  writeRecord(repo.dir, { version: "1.0.0", date: "2026-11-21", entries: [] });
  assert.deepEqual(taggedDifferences(repo.dir), ["changelog/releases/1.0.0.json differs from the copy tagged v1.0.0; a published version is never edited"]);
});

test("the fixtures are what the tool writes, from their histories", () => {
  for (const project of [SLATE, HARBOR]) {
    const dir = buildRepository(project, tempDir(`changelog-${project.name}-`));
    const out = path.join(tempDir(), project.name);
    copyOut(project, dir, out);
    for (const file of ["CHANGELOG.md", "releases.json", ...(project.name === "harbor" ? ["releases-candidate.json"] : []), ...fs.readdirSync(path.join(out, "changelog", "releases")).map((name) => path.join("changelog", "releases", name))]) {
      assert.equal(fs.readFileSync(path.join(out, file), "utf8"), fs.readFileSync(path.join(FIXTURES, project.name, file), "utf8"), `${project.name}/${file}`);
    }
    assert.deepEqual(fs.readdirSync(path.join(out, "changelog", "releases")).sort(), fs.readdirSync(path.join(FIXTURES, project.name, "changelog", "releases")).sort());
  }
});

test("a tagged record that is deleted is found, as an edited one is", () => {
  const repo = repository();
  writeRecord(repo.dir, { version: "1.0.0", date: "2026-11-20", entries: [] });
  repo.commitAll("Release 1.0.0");
  repo.git("tag", "v1.0.0");
  fs.rmSync(path.join(repo.dir, "changelog", "releases", "1.0.0.json"));
  assert.deepEqual(taggedDifferences(repo.dir), ["changelog/releases/1.0.0.json is gone, and v1.0.0 released it; a published version is never deleted"]);
  // A maintained line's tag is not in the default branch's history, so the default branch does not answer for it.
  repo.git("checkout", "-q", "--", ".");
  repo.git("checkout", "-q", "-b", "release/0.x", "HEAD~1");
  writeRecord(repo.dir, { version: "0.9.1", date: "2026-11-21", entries: [] });
  repo.commitAll("Release 0.9.1");
  repo.git("tag", "v0.9.1");
  repo.git("checkout", "-q", "main");
  assert.deepEqual(taggedDifferences(repo.dir), []);
});

test("a maintained line's record, once a pull request has added it to the default branch, cannot be deleted there (recheck 3)", () => {
  const repo = repository();
  writeRecord(repo.dir, { version: "2.0.0", date: "2026-11-20", entries: [] });
  repo.commitAll("Release 2.0.0");
  repo.git("tag", "v2.0.0");
  repo.git("checkout", "-q", "-b", "release/1.x", "HEAD~1");
  writeRecord(repo.dir, { version: "1.4.1", date: "2026-11-22", entries: [] });
  repo.commitAll("Release 1.4.1");
  repo.git("tag", "v1.4.1");
  repo.git("checkout", "-q", "main");
  assert.deepEqual(taggedDifferences(repo.dir), [], "before it is brought over, the default branch does not answer for it");
  repo.git("checkout", "v1.4.1", "--", "changelog/releases/1.4.1.json");
  repo.commitAll("Add the 1.4.1 record (#77)");
  assert.deepEqual(taggedDifferences(repo.dir), []);
  fs.rmSync(path.join(repo.dir, "changelog", "releases", "1.4.1.json"));
  const gone = ["changelog/releases/1.4.1.json is gone, and this branch's history published it; a published version is never deleted"];
  assert.deepEqual(taggedDifferences(repo.dir), gone, "deleted in the working tree");
  repo.commitAll("Remove the 1.4.1 record");
  assert.deepEqual(taggedDifferences(repo.dir), gone, "and once the deletion is committed");
  // A record deleted from the default branch with its own tag merged is reported once, by its tag.
  fs.rmSync(path.join(repo.dir, "changelog", "releases", "2.0.0.json"));
  assert.deepEqual(taggedDifferences(repo.dir), ["changelog/releases/2.0.0.json is gone, and v2.0.0 released it; a published version is never deleted", ...gone]);
});

test("a pending file whose id a shipped release holds stops the build; a candidate's pending copy does not", () => {
  const copy = path.join(tempDir(), "slate");
  fs.cpSync(path.join(FIXTURES, "slate"), copy, { recursive: true });
  fs.writeFileSync(path.join(copy, ".changes", "pr52-1.md"), "---\ntype: fixed\narea: Composer\npr: 52\n---\nFixed `Composer` losing its draft when the window lost focus\n");
  assert.throws(() => outputs(copy), /\.changes\/pr52-1\.md: the id is held by 0\.2\.1, which has shipped/);
  // Harbor before 2.0.0: the candidates' entries are pending on purpose, and Unreleased leaves them out.
  const root = path.join(FIXTURES, "harbor");
  const config = loadConfig(root);
  const records = readRecords(root).filter((record) => record.version !== "2.0.0");
  const pending = [readEntry("---\ntype: added\narea: Sign-in\npr: 141\n---\nAdded single sign-on through your company's identity provider\n", ".changes/pr141-1.md", config)];
  assert.equal(pageReleases(root, { config, records, pending })[0].version, "2.0.0-rc.2");
});
