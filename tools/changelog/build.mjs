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

/** Every output for a repository, as strings, from its records and pending files. */
export function outputs(root) {
  const config = loadConfig(root);
  const releases = pageReleases(root, { config });
  return {
    config,
    releases,
    changelog: changelogMarkdown(releases, { product: config.product }),
    json: `${JSON.stringify(releases, null, 2)}\n`,
    github: (version) => {
      const release = releases.find((candidate) => candidate.version === version);
      if (!release) throw new Error(`${version} is not a drawn release`);
      return githubBody(release, { repository: config.repository });
    },
  };
}

/**
 * A published version is never edited (S 3.2.10): every record whose tag exists must equal the tag's copy, byte for byte. Returns the
 * differences, each a sentence; empty when every tagged record matches.
 */
export function taggedDifferences(root) {
  const differences = [];
  for (const record of readRecords(root)) {
    const tag = `v${record.version}`;
    const file = `${RECORDS_DIR.split(path.sep).join("/")}/${record.version}.json`;
    let tagged;
    try {
      execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], { cwd: root, stdio: "ignore" });
    } catch {
      continue;
    }
    try {
      tagged = execFileSync("git", ["show", `${tag}:${file}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      differences.push(`${file}: the tag ${tag} holds no record`);
      continue;
    }
    if (tagged !== fs.readFileSync(path.join(root, file), "utf8")) differences.push(`${file} differs from the copy tagged ${tag}; a published version is never edited`);
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
