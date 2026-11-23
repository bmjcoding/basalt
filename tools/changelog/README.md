# The changelog tool

Versions, changelogs and release notes for Basalt and for each of the owner's products (DECISIONS 320). One small file per change, written in
the pull request that makes it, frozen into a record when a release is cut, and generated into every output: `CHANGELOG.md`, the page's data
(the `ReleaseRecord[]` that `ReleaseNotes` takes), a GitHub Release's body and a page for the HTML skill. Node only, with no dependency.

The words follow `.agent/skills/release-words/SKILL.md`. The page's parts are `VersionLink`, `ReleaseNotes` and `ReleaseIndex` in
`@srasyndicate/basalt`, and the `release` module in the HTML skill.

Nothing here publishes a version of Basalt. Basalt's first release is the owner's to cut (DECISIONS 320, backlog 1); until then the repository
has no `changelog.config.json`, no `.changes` and no records. `fixtures/` holds two made-up projects, Slate (a package) and Harbor (a product).

## Versions

SemVer 2.0.0, shown with the ship date: `1.4.0 · Nov 23, 2026` on a page, `## 1.4.0 - 2026-11-23` in Markdown, `v1.4.0` as a tag and
`#v1.4.0` as a release's address. Build metadata (`1.4.0+9f3c1e2`) is never part of a release's version; the running build is the app's to
show (Build details).

| Bump | A package | A product |
|---|---|---|
| Major | Removing or renaming a token, component, prop, CSS variable or documented data attribute; changing a token's `$type` or a prop's type; making an optional prop required; raising the minimum React, Node or browser; changing a default that alters behavior | It takes away or reshapes something people rely on, or they must act for it to keep working |
| Minor | New tokens, components, props or variants; deprecations; a token's value changing while its role holds | Something a person can newly do; a dated notice that something will go |
| Patch | Fixes; accessibility fixes that restore documented behavior; docs and types that were wrong | Fixes and improvements to what exists |

**In 0.x the numbers move one place right:** a breaking change raises the minor, and everything else raises the patch. A caret range
(`^0.2.0`) then takes additions and fixes and never a break. Basalt stays in 0.x until its public API is written down; 1.0.0 is the owner's
call. The two packages share one version number.

**A line** is the versions that share their breaking number: the major, or in 0.x the minor. A new version must be higher than every release
in its line; one that opens a line must be higher than every release there is. A fix to a maintained older line (1.4.1 after 2.0.0) is frozen
on that line's branch (`release/1.x`) and its record is then added to the default branch by a pull request, because the page is built there.

**Pre-releases** are `-beta.N` and `-rc.N`, each frozen with its own record holding what no earlier pre-release of that version holds. Freezing
one removes nothing. The stable version takes every pending file, names the pre-releases it `replaces`, and from then they are drawn in no
output and their addresses open the stable release. A canary (`1.5.0-canary.20261123.1`) is a build from the default branch with no freeze
and no record.

## An entry

One file per change, `.changes/<id>.md`, added by the pull request that makes the change:

```md
---
type: changed
area: FormGrid
pr: 120
author: bailey
tickets: [ENG-398, PROJ-88]
bump: major
action: true
migration: docs/migrating.md#formgrid-frame
---
Changed the parent layout item for `FormGrid` to `.basalt-form-grid-frame`, where existing sizing rules must move
```

- **The id** is the file's name, set once and never changed or reused: `pr120-1` (the pull request and the entry's number in it), or any
  `a-z0-9-` slug for a change with no pull request. `pr120-1.md` must say `pr: 120`, and an entry that says `pr: 120` is named `pr120-N.md`.
  `unreleased` and anything starting `v` and a digit are reserved. A backport is its own pull request and its own entry. A pending file whose id a
  shipped release holds stops the build (a candidate's pending files are kept on purpose until its stable version ships). The parts' own
  element ids end `__words`, `__heading` and the like, outside the ids' alphabet, so an entry named `fix-words` never meets one.
- **The head** is `key: value` lines between two `---`. It is not YAML. An unknown key, a key written twice or a line that is not `key: value`
  stops the tool, naming the file and the line.

| Key | Value |
|---|---|
| `type` | `security`, `deprecated`, `removed`, `added`, `changed` or `fixed`. Required |
| `area` | The component, `Tokens`, or a product's page (`Home`), drawn before the sentence. On every entry when a project has more than one surface |
| `pr` | The pull request's number |
| `author` | A key of the config's `people`: the person who wrote the entry's words, or who has said they take authorship of them. Optional. Never who asked for the change, approved it or merged it |
| `tickets` | A list in square brackets, in the order written. **The only place a ticket id is read from**: never a pull request's body, a commit's trailer, a branch name, a title or a sentence |
| `bump` | `major`, `minor` or `patch`. Required for `changed`; otherwise only to raise the type's floor, never to lower it |
| `action` | `true` when a reader must do something: it stands under "Action needed". It raises no number. A `major` entry is always `action` |
| `migration` | The migration note: a file in the repository (opened at the release's tag), a path from the site's root, or an `https` address. Drawn as "How to migrate" |

Each type's least bump: Removed is major; Added and Deprecated are minor; Fixed and Security are patch; Changed states its own.

**Release notes** are one more file, `.changes/release.md`, when a release has them: a head with `title` and `summary`, then a paragraph for
everyone with no heading and a `## For admins` heading for each audience, each paragraph opening with a `covers:` line naming the entries it
is about. A paragraph that covers none, names an entry the release does not hold, holds a second `covers` line or runs to a second paragraph
stops the tool, naming the line.

```md
---
title: A monitor can open an incident room
summary: Monitors can open incident rooms through a webhook, and Home marks the incidents they open.
---
covers: [pr131-1]
A monitor that can send a webhook can now open an incident room when its alarm fires.

## For admins
covers: [pr131-1]
In Settings, open Integrations and add a webhook. Paste its address into your monitor.
```

A release with no entries must have a summary, and so must one of more than three changes, unless paragraphs lead it.

## The config

`changelog.config.json`, at the repository's root:

```json
{
  "product": "Basalt",
  "repository": "https://github.com/example/basalt",
  "trackers": [
    { "name": "Linear", "pattern": "(?:ENG|DES)-[1-9][0-9]*", "url": "https://linear.app/example/issue/{id}" },
    { "name": "Jira", "pattern": "PROJ-[1-9][0-9]*", "url": "https://example.atlassian.net/browse/{id}", "show": "text" },
    { "name": "GitHub", "pattern": "basalt#(?<n>[1-9][0-9]*)", "url": "https://github.com/example/basalt/issues/{n}", "label": "issue #{n}" }
  ],
  "people": { "bailey": { "name": "Bailey Jones" } }
}
```

`form` is optional: `"reference"` (the default, a package's changelog) or `"notes"` (a product's release notes). It decides how `CHANGELOG.md` and a
GitHub Release are written: a package's opens Action needed with "Before upgrading from 0.1.0, check these 4 changes." and groups a GitHub Release's
sections under "Changes"; a product's puts Action needed first with no upgrade line, then its headline as a heading over its paragraphs, then the
fold's heading ("All changes", or "Other changes") over the summary and the sections, so every paragraph sits under a heading of its own.

- `name` is the word shown, and is unique. `pattern` is matched against the whole id: write it without `^` and `$`, name team keys and never
  a catch-all, and write a number as `[1-9][0-9]*`.
- `url` and `label` may use `{id}` and the pattern's named groups; any other variable is refused, and so is an id whose match leaves a used group
  unset (a pattern with alternatives). Each value is percent-encoded into the URL,
  which must be `https` with no variable in its host.
- `show` is `link` (the default), `text` (shown, not linked) or `none` (recorded, never published).
- A GitHub issue is written `repo#45`, never `#45`, which is a pull request.
- Whether a ticket exists in its tracker is not checked here; a project may check it in CI.

## Commands

| Command | What it does |
|---|---|
| `node tools/changelog/release.mjs <version> --date <YYYY-MM-DD>` | Freezes a release on the branch it is cut from. Checks every pending file, the version against its line and the highest bump among the entries, and each entry's commit (the first-parent commit that added its file; a shallow clone is refused). Builds every output in memory, then writes `changelog/releases/<version>.json` once (with the repository, so a later config cannot re-point its comparison) and `CHANGELOG.md`, and only then, for a stable version, removes the pending files and `release.md`. A freeze that stops consumes nothing; one interrupted after its record was written is finished by running it again |
| `node tools/changelog/build.mjs` | Regenerates `CHANGELOG.md` from the records and the pending files (the Unreleased section is what no pre-release holds) |
| `node tools/changelog/build.mjs --json <file>` | Writes the page's data |
| `node tools/changelog/build.mjs --github <version>` | Prints a GitHub Release's body |
| `node tools/changelog/build.mjs --check` | Fails when `CHANGELOG.md` is not what the records give, a tagged record differs from its tag's copy, or a release tag in this branch's history has lost its record |
| `node tools/changelog/audit.mjs` | Runs the lines of the release-words audit marked (m). It flags and a person decides. For R18 it flags a sentence of a headline, summary or paragraph when most of what it names is in none of the entries it covers (an instruction, "In Settings, open …", is not a claim) |
| `node tools/changelog/fixtures/make.mjs` | Rebuilds the two made-up fixtures by running the tool over their histories |
| `node tools/changelog/skill-body.mjs --form <reference\|notes>` | Writes a body for the HTML skill's `release` module from the records |

Every option takes `--root <repository>`; the default is the working directory. Every output is generated from the records and the pending
files and nothing else: a rebuild needs no git and no network, and a later config change cannot re-point a frozen release.

## Why not changesets

The owner's standard names changesets (S 4.1). The idea it wants from them is kept: one small file per change, written in the pull request,
generated into every output. The format is not. A changeset's head maps package names to a bump (`"@scope/pkg": minor`); its generated
`CHANGELOG.md` is headed by bump (`### Major Changes`, `### Minor Changes`, `### Patch Changes`), not by type. The GitHub changelog formatter
(`@changesets/changelog-github`) accepts overrides for `pr`, `commit` and `author` under a `_:` key, but there is no field for a type, tickets,
`action` or a permanent id, and an author there is a GitHub login. Checked against `docs/guide/writing-changesets.md` and
`packages/apply-release-plan/src/get-changelog-entry.ts` in `changesets/changesets` on Nov 23, 2026.
