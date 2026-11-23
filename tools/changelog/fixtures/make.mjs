// The fixtures (DECISIONS 320, 6.1): two made-up projects, "Slate" (a package) and "Harbor" (a product), built by running the real tool.
// Every fact in them is invented: the products, versions, dates, pull requests, tickets, people and commits. Nothing is Basalt's or CIMIP's.
//   node tools/changelog/fixtures/make.mjs
// It builds each project's history in a temporary git repository (each entry file committed as its own squashed pull request, the notes
// written, then `freeze` run, as a person cutting the release would) with fixed authors and dates, so the commits and every byte written are
// the same on every run. It then copies the config, the records, the pending files, CHANGELOG.md and the page's data (`releases.json`) here.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { freeze } from "../release.mjs";
import { loadConfig } from "../config.mjs";
import { pageReleases } from "../records.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------- Slate: a package, in 0.x ----------

export const SLATE = {
  name: "slate",
  config: {
    product: "Slate",
    repository: "https://github.com/example/slate",
    trackers: [
      { name: "Linear", pattern: "(?:SL|DS)-[1-9][0-9]*", url: "https://linear.app/example/issue/{id}" },
      { name: "Jira", pattern: "PRJ-[1-9][0-9]*", url: "https://example.atlassian.net/browse/{id}", show: "text" },
      { name: "GitHub", pattern: "slate#(?<n>[1-9][0-9]*)", url: "https://github.com/example/slate/issues/{n}", label: "issue #{n}" },
      { name: "Support", pattern: "SUP-[1-9][0-9]*", show: "none" },
    ],
    people: { sam: { name: "Sam Rivera" } },
  },
  steps: [
    { notes: { summary: "The first version in this changelog. Earlier work is in the repository's history." }, version: "0.1.0", date: "2026-11-02" },
    {
      entries: [
        { id: "pr41-1", pr: 41, type: "changed", area: "Grid", bump: "major", action: true, author: "sam", tickets: ["SL-112", "PRJ-88"], migration: "docs/migrating.md#grid-frame", text: "Changed the parent layout item for `Grid` to `.slate-grid-frame`, where existing sizing rules must move" },
        { id: "pr41-2", pr: 41, type: "changed", area: "storedCount", bump: "major", action: true, migration: "docs/migrating.md#stored-counts", text: "Changed stored counts to require an explicit store, so pass `() => localStorage` when reading, writing or clearing old counts" },
        { id: "pr42-1", pr: 42, type: "changed", area: "fillForm", bump: "major", action: true, text: "Changed `fillForm` to keep null fields empty, so omit unknown fields or pass `undefined`" },
        { id: "pr43-1", pr: 43, type: "changed", area: "TableHeader", bump: "major", action: true, text: "Changed fixed `TableHeader` cells to show a supplied `hint`, so remove that prop where a header should stay plain" },
        { id: "pr44-1", pr: 44, type: "deprecated", area: "Banner", text: "Deprecated `Banner` in favor of `Notice`, which takes the same props, removed in 1.0.0 no earlier than Mar 1, 2027" },
        { id: "pr45-1", pr: 45, type: "added", area: "Composer", author: "sam", tickets: ["SL-120"], text: "Added `Composer`, a message field that grows from 2 to 8 rows, with Send last and a status line under it" },
        { id: "pr45-2", pr: 45, type: "added", area: "Mention", text: "Added `Mention` to show a name after @ and mark a mention of the reader when `you` is set" },
        { id: "pr46-1", pr: 46, type: "added", area: "Tokens", tickets: ["DS-27", "DS-31", "PRJ-90", "slate#45", "SL-131", "SUP-7"], text: "Added `--slate-plate` for a highlighted row's solid fill on its current surface level" },
        { id: "pr47-1", pr: 47, type: "changed", area: "Toast", bump: "minor", text: "Changed toasts on phones to sit 8px below the top bar instead of above the bottom tabs" },
        { id: "pr48-1", pr: 48, type: "fixed", area: "Checkbox", tickets: ["slate#45"], text: "Fixed scrolling checkbox lists adding empty space below the page inside a sticky container" },
        { id: "pr49-1", pr: 49, type: "fixed", area: "SelectList", text: "Fixed keyboard focus leaving `SelectList` when the focused row was removed" },
        { id: "pr49-2", pr: 49, type: "fixed", area: "Sheet", text: "Fixed clipped focus rings at the top and bottom of a sheet's scrolling body" },
        { id: "pr50-1", pr: 50, type: "fixed", area: "Sidebar", text: "Fixed the brand mark sitting off center when the sidebar collapsed to its rail" },
        { id: "docs-contrast-note", type: "fixed", area: "Docs", text: "Fixed the contrast table listing secondary ink on the sunken band at 4.1:1, where it measures 4.6:1" },
      ],
      notes: { summary: "Slate 0.2.0 adds a composer with mentions and a plate token for highlighted rows. Check existing layout rules and stored data before upgrading." },
      version: "0.2.0",
      date: "2026-11-16",
    },
    { entries: [{ id: "pr52-1", pr: 52, type: "fixed", area: "Composer", text: "Fixed `Composer` losing its draft when the window lost focus" }], version: "0.2.1", date: "2026-11-16" },
    {
      entries: [
        { id: "pr53-1", pr: 53, type: "changed", area: "Chart", bump: "patch", text: "Changed production builds to leave out development checks, so the minified `Chart` module is 3,227 bytes smaller" },
        { id: "pr54-1", pr: 54, type: "fixed", area: "Chart", text: "Fixed blurry labels on 1px chart lines when a label fell between whole pixels" },
      ],
    },
  ],
};

// ---------- Harbor: a product, from 1.x, with a maintained older line ----------

export const HARBOR = {
  name: "harbor",
  config: {
    product: "Harbor",
    repository: "https://github.com/example/harbor",
    form: "notes",
    trackers: [{ name: "Linear", pattern: "OPS-[1-9][0-9]*", url: "https://linear.app/example/issue/{id}" }],
    people: { ada: { name: "Ada Okoye" } },
  },
  steps: [
    {
      entries: [
        { id: "pr126-1", pr: 126, type: "changed", area: "Updates", bump: "minor", action: true, text: "Changed published updates to require approval from a second commander, so name a second commander for each room before Dec 1, 2026" },
        { id: "pr126-2", pr: 126, type: "added", area: "Updates", text: "Added an approval request that a second commander can grant or return with a note" },
      ],
      notes: { title: "Updates need a second approval", audiences: [{ covers: ["pr126-1", "pr126-2"], text: "An update to people outside the room now needs a second commander's approval before it is published." }] },
      version: "1.3.0",
      date: "2026-11-20",
    },
    {
      entries: [
        { id: "pr129-1", pr: 129, type: "fixed", area: "Rooms", text: "Fixed the recap starting from the room's first message when you had been away for under a minute" },
        { id: "pr130-1", pr: 130, type: "fixed", area: "Directory", text: "Fixed a vendor's support line showing the previous vendor's number after you switched rows quickly" },
        { id: "pr135-1", pr: 135, type: "fixed", area: "Rooms", text: "Fixed the room timer showing 0:00 after a reload" },
        { id: "pr136-1", pr: 136, type: "fixed", area: "Sign-in", text: "Fixed the code field clearing when you pasted a code" },
      ],
      notes: { summary: "Fixes to the recap, the room timer, the directory and sign-in." },
      version: "1.3.1",
      date: "2026-11-23",
    },
    {
      entries: [
        { id: "pr131-1", pr: 131, type: "added", area: "Integrations", author: "ada", tickets: ["OPS-204"], text: "Added webhook declarations so a monitor can open an incident room when its alarm fires" },
        { id: "pr131-2", pr: 131, type: "added", area: "Home", author: "ada", text: "Added an \"Opened by a monitor\" mark to incidents that a webhook declared" },
        { id: "pr132-1", pr: 132, type: "changed", area: "Home", bump: "patch", text: "Improved the open incident list so your scroll position stays fixed when an incident arrives above it" },
        { id: "pr133-1", pr: 133, type: "fixed", area: "Lobby", text: "Fixed \"Waiting to be admitted\" staying on screen after the commander had admitted you, until you reloaded the page" },
        { id: "pr134-1", pr: 134, type: "fixed", area: "Past incidents", text: "Fixed search missing an update the commander had published in the last minute" },
      ],
      notes: {
        title: "A monitor can open an incident room",
        summary: "Monitors can open incident rooms through a webhook, and Home marks the incidents they open. The open incident list keeps its place, and two fixes cover the lobby and search.",
        audiences: [
          { covers: ["pr131-1"], text: "A monitor that can send a webhook can now open an incident room when its alarm fires." },
          { for: "For responders", covers: ["pr131-2"], text: "On Home, open an incident marked \"Opened by a monitor\"." },
          { for: "For admins", covers: ["pr131-1"], text: "In Settings, open Integrations and add a webhook. Paste its address into your monitor." },
        ],
      },
      version: "1.4.0",
      date: "2026-11-23",
    },
    { branch: "release/1.x", from: "1.4.0" },
    {
      entries: [
        { id: "pr140-1", pr: 140, type: "removed", area: "Sign-in", action: true, text: "Removed sign-in with a shared room code, so each responder signs in with their own account before Jan 15, 2027" },
        { id: "pr141-1", pr: 141, type: "added", area: "Sign-in", tickets: ["OPS-230"], text: "Added single sign-on through your company's identity provider" },
      ],
      notes: {
        title: "Responders sign in with their own account",
        audiences: [
          { covers: ["pr141-1"], text: "Each responder now signs in with their own account, through your company's identity provider." },
          { for: "For admins", covers: ["pr140-1", "pr141-1"], text: "In Settings, open Sign-in and connect your identity provider. Shared room codes stop working on Jan 15, 2027." },
        ],
      },
      version: "2.0.0-rc.1",
      date: "2026-12-01",
    },
    {
      entries: [{ id: "pr142-1", pr: 142, type: "added", area: "Sign-in", text: "Added a sign-in page that names your company's identity provider" }],
      notes: {
        title: "A sign-in page names your identity provider",
        audiences: [{ covers: ["pr142-1"], text: "The sign-in page now names your company's identity provider, so responders know which account to use." }],
      },
      version: "2.0.0-rc.2",
      date: "2026-12-03",
    },
    {
      entries: [{ id: "pr143-1", pr: 143, type: "fixed", area: "Rooms", text: "Fixed the room list scrolling to the top when a new room opened" }],
      notes: {
        title: "Responders sign in with their own account",
        summary: "Single sign-on replaces shared room codes, with a sign-in page for your company's identity provider.",
        audiences: [
          { covers: ["pr141-1", "pr142-1"], text: "Each responder now signs in with their own account, through your company's identity provider." },
          { for: "For admins", covers: ["pr140-1", "pr141-1"], text: "In Settings, open Sign-in and connect your identity provider. Shared room codes stop working on Jan 15, 2027." },
        ],
      },
      version: "2.0.0",
      date: "2026-12-07",
    },
    {
      branch: "release/1.x",
      entries: [{ id: "pr145-1", pr: 145, type: "fixed", area: "Rooms", text: "Fixed the room timer showing 0:00 after a reload in a second tab" }],
      version: "1.4.1",
      date: "2026-12-08",
      // A maintained line's record is added to the default branch by a pull request, because the page is built there.
      backTo: "main",
    },
  ],
};

// ---------- the build ----------

const entryFile = (entry) => {
  const head = ["---", `type: ${entry.type}`];
  if (entry.area) head.push(`area: ${entry.area}`);
  if (entry.pr) head.push(`pr: ${entry.pr}`);
  if (entry.author) head.push(`author: ${entry.author}`);
  if (entry.tickets) head.push(`tickets: [${entry.tickets.join(", ")}]`);
  if (entry.bump) head.push(`bump: ${entry.bump}`);
  if (entry.action) head.push("action: true");
  if (entry.migration) head.push(`migration: ${entry.migration}`);
  return `${head.join("\n")}\n---\n${entry.text}\n`;
};

const notesFile = (notes) => {
  const head = ["---"];
  if (notes.title) head.push(`title: ${notes.title}`);
  if (notes.summary) head.push(`summary: ${notes.summary}`);
  head.push("---");
  const blocks = (notes.audiences ?? []).map((audience) => `${audience.for ? `## ${audience.for}\n` : ""}covers: [${audience.covers.join(", ")}]\n${audience.text}\n`);
  return `${head.join("\n")}\n${blocks.join("\n")}`;
};

/** Build one project's history in a fresh repository and return its path. */
export function buildRepository(project, dir = fs.mkdtempSync(path.join(os.tmpdir(), `changelog-${project.name}-`))) {
  let clock = Date.UTC(2026, 9, 1, 12);
  const env = () => {
    clock += 60_000;
    const when = new Date(clock).toISOString();
    return { ...process.env, GIT_AUTHOR_NAME: "Example", GIT_AUTHOR_EMAIL: "example@example.com", GIT_COMMITTER_NAME: "Example", GIT_COMMITTER_EMAIL: "example@example.com", GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when };
  };
  const git = (...args) => execFileSync("git", args, { cwd: dir, env: env(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-q", "-b", "main");
  git("config", "commit.gpgsign", "false");
  fs.writeFileSync(path.join(dir, "changelog.config.json"), `${JSON.stringify(project.config, null, 2)}\n`);
  git("add", "-A");
  git("commit", "-q", "-m", "Start");
  for (const step of project.steps) {
    if (step.from) {
      git("branch", step.branch, `v${step.from}`);
      continue;
    }
    if (step.branch) git("checkout", "-q", step.branch);
    for (const entry of step.entries ?? []) {
      fs.mkdirSync(path.join(dir, ".changes"), { recursive: true });
      fs.writeFileSync(path.join(dir, ".changes", `${entry.id}.md`), entryFile(entry));
      git("add", "-A");
      git("commit", "-q", "-m", entry.pr ? `${entry.area}: ${entry.text.split(" ").slice(0, 6).join(" ")} (#${entry.pr})` : `${entry.area}: ${entry.text.split(" ").slice(0, 6).join(" ")}`);
    }
    if (!step.version) continue;
    const notes = path.join(dir, ".changes", "release.md");
    if (step.notes) {
      fs.mkdirSync(path.dirname(notes), { recursive: true });
      fs.writeFileSync(notes, notesFile(step.notes));
      git("add", "-A");
      git("commit", "-q", "-m", `Release notes for ${step.version}`);
    }
    freeze({ root: dir, version: step.version, date: step.date });
    git("add", "-A");
    git("commit", "-q", "-m", `Release ${step.version}`);
    git("tag", `v${step.version}`);
    if (step.backTo) {
      const record = fs.readFileSync(path.join(dir, "changelog", "releases", `${step.version}.json`), "utf8");
      git("checkout", "-q", step.backTo);
      fs.writeFileSync(path.join(dir, "changelog", "releases", `${step.version}.json`), record);
      // The default branch's CHANGELOG.md is regenerated with the record in it.
      const { changelogMarkdown } = OUTPUTS;
      const config = loadConfig(dir);
      fs.writeFileSync(path.join(dir, "CHANGELOG.md"), changelogMarkdown(pageReleases(dir, { config }), { product: config.product, form: config.form }));
      git("add", "-A");
      git("commit", "-q", "-m", `Add the ${step.version} record (#146)`);
    } else if (step.branch) {
      git("checkout", "-q", "main");
    }
  }
  return dir;
}

const OUTPUTS = await import("../outputs.mjs");

/** Copy what a project's repository holds into its fixture folder (or `out`). */
export function copyOut(project, dir, out = path.join(HERE, project.name)) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "changelog", "releases"), { recursive: true });
  fs.copyFileSync(path.join(dir, "changelog.config.json"), path.join(out, "changelog.config.json"));
  for (const name of fs.readdirSync(path.join(dir, "changelog", "releases"))) fs.copyFileSync(path.join(dir, "changelog", "releases", name), path.join(out, "changelog", "releases", name));
  const changes = path.join(dir, ".changes");
  if (fs.existsSync(changes) && fs.readdirSync(changes).length) {
    fs.mkdirSync(path.join(out, ".changes"));
    for (const name of fs.readdirSync(changes)) fs.copyFileSync(path.join(changes, name), path.join(out, ".changes", name));
  }
  // Entries merged since the last release are in CHANGELOG.md's Unreleased section, as `node tools/changelog/build.mjs` writes it.
  const config = loadConfig(out);
  const releases = pageReleases(out, { config });
  fs.writeFileSync(path.join(out, "CHANGELOG.md"), OUTPUTS.changelogMarkdown(releases, { product: config.product, form: config.form }));
  fs.writeFileSync(path.join(out, "releases.json"), `${JSON.stringify(releases, null, 2)}\n`);
}

const { isMain } = await import("../../../scripts/is-main.mjs");
if (isMain(import.meta.url)) {
  for (const project of [SLATE, HARBOR]) {
    const dir = buildRepository(project);
    copyOut(project, dir);
    fs.rmSync(dir, { recursive: true, force: true });
    process.stdout.write(`Wrote tools/changelog/fixtures/${project.name}\n`);
  }
}
