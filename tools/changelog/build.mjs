// The outputs, from the records and the pending files alone (DECISIONS 320, 3.4):
//   node tools/changelog/build.mjs                    regenerate CHANGELOG.md
//   node tools/changelog/build.mjs --json <file>      the page's data, the ReleaseRecord[] that ReleaseNotes takes
//   node tools/changelog/build.mjs --github <version> a GitHub Release's body, on stdout
//   node tools/changelog/build.mjs --check            CHANGELOG.md is what the records give, and every tagged record matches its tag
// Option: --root <repository> (default the working directory).
// No network and no git, except --check reading the tags.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { loadConfig } from "./config.mjs";
import { changelogMarkdown, githubBody } from "./outputs.mjs";
import { pageReleases, readRecords, RECORDS_DIR } from "./records.mjs";
import { parse } from "./semver.mjs";

/** Every output for a repository, as strings, from its records and pending files. */
export function outputs(root) {
  const config = loadConfig(root);
  const records = readRecords(root);
  const releases = pageReleases(root, { config, records });
  return {
    config,
    releases,
    changelog: changelogMarkdown(releases, { product: config.product, form: config.form }),
    json: `${JSON.stringify(releases, null, 2)}\n`,
    github: (version) => {
      const release = releases.find((candidate) => candidate.version === version);
      if (!release) throw new Error(`${version} is not a drawn release`);
      // The comparison is the frozen record's repository, so a later config cannot re-point it.
      const record = records.find((candidate) => candidate.version === version);
      return githubBody(release, { repository: record?.repository ?? config.repository, form: config.form });
    },
  };
}

/**
 * A published version is never edited (S 3.2.10), and never deleted: every record whose tag exists must equal the tag's copy, byte for byte, and every
 * release tag this branch's history holds, and every record its history added, must still be there. A maintained line's tags are not in the default
 * branch's history, so its record is answered for on the default branch from the commit that added it there (the pull request that brought it).
 * Returns the differences, each a sentence.
 */
export function taggedDifferences(root) {
  const differences = [];
  const recordFile = (version) => `${RECORDS_DIR.split(path.sep).join("/")}/${version}.json`;
  const tagged = (tag, file) => {
    try {
      return execFileSync("git", ["show", `${tag}:${file}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      return null;
    }
  };
  const records = readRecords(root);
  const have = new Set(records.map((record) => record.version));
  for (const record of records) {
    const tag = `v${record.version}`;
    try {
      execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], { cwd: root, stdio: "ignore" });
    } catch {
      continue;
    }
    const file = recordFile(record.version);
    const copy = tagged(tag, file);
    if (copy === null) differences.push(`${file}: the tag ${tag} holds no record`);
    else if (copy !== fs.readFileSync(path.join(root, file), "utf8")) differences.push(`${file} differs from the copy tagged ${tag}; a published version is never edited`);
  }
  let merged = [];
  try {
    merged = execFileSync("git", ["tag", "--list", "v*", "--merged", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
  } catch {
    merged = [];
  }
  for (const tag of merged) {
    const version = tag.slice(1);
    if (have.has(version) || !parse(version)) continue;
    // A tag with a record in its own tree is a release; one with none (a tag from before the changelog) is not this tool's.
    if (tagged(tag, recordFile(version)) !== null) {
      differences.push(`${recordFile(version)} is gone, and ${tag} released it; a published version is never deleted`);
      have.add(version);
    }
  }
  // A record this branch's history added is published here, tagged here or not (a maintained line's release, added to the default branch by a
  // pull request, is tagged on its own branch): one that is gone was deleted.
  let added = [];
  try {
    added = execFileSync("git", ["log", "--diff-filter=A", "--name-only", "--format=", "HEAD", "--", recordFile("").replace(/\/\.json$/, "/")], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
  } catch {
    added = [];
  }
  for (const file of new Set(added)) {
    const version = path.posix.basename(file, ".json");
    if (have.has(version) || !parse(version) || file !== recordFile(version)) continue;
    differences.push(`${file} is gone, and this branch's history published it; a published version is never deleted`);
  }
  return differences;
}

function main(argv) {
  const args = [...argv];
  const take = (flag, hasValue = true) => {
    const at = args.indexOf(flag);
    if (at < 0) return undefined;
    return hasValue ? args.splice(at, 2)[1] : (args.splice(at, 1), true);
  };
  const root = path.resolve(take("--root") ?? process.cwd());
  const json = take("--json");
  const github = take("--github");
  const check = take("--check", false);
  const out = outputs(root);
  if (check) {
    const problems = taggedDifferences(root);
    const file = path.join(root, "CHANGELOG.md");
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== out.changelog) problems.push("CHANGELOG.md is not what the records give: run node tools/changelog/build.mjs");
    for (const problem of problems) process.stderr.write(`${problem}\n`);
    process.exit(problems.length ? 1 : 0);
  }
  if (github) {
    process.stdout.write(out.github(github));
    return;
  }
  if (json) {
    fs.writeFileSync(path.resolve(json), out.json);
    return;
  }
  fs.writeFileSync(path.join(root, "CHANGELOG.md"), out.changelog);
}

const { isMain } = await import("../../scripts/is-main.mjs");
if (isMain(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
