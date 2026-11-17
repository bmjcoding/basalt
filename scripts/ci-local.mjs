// Runs both CI jobs (.github/workflows/ci.yml) on this machine: the web job's steps, then the macOS job's.
// GitHub Actions minutes can run out, and when CI can't run, this is the check a PR passes before it merges (AGENTS.md, Checks).
//
//   npm run ci:local              both jobs; the macOS job needs a Mac with Swift
//   npm run ci:local -- --web-only   the web job alone (say so on the PR: the Swift package went unchecked)
//   npm run ci:local -- --fresh      the same steps from a new `git worktree` of HEAD with `npm ci`, so a stale node_modules, a built folder
//                                    or any ignored file in this checkout cannot decide the result. The worktree is removed afterwards.
//                                    It checks the commit, not uncommitted changes. Combine it with --web-only.
//
// It runs ci.yml's own commands in ci.yml's order and stops at the first failure, as CI does. It reads ci.yml first and refuses to
// run if the two have drifted apart, so a step added to CI can't be skipped here unnoticed. It also prints the Node version it runs on
// beside the one ci.yml pins, and warns when their major versions differ: a result on another major is not CI's result.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const WEB = [
  "npm run lint",
  "npm test",
  "npm run artifact",
  "npm run typecheck:review",
  "npm run test:packages",
  "git diff --exit-code -- Sources/BasaltTokens/Tokens.swift",
];
export const APPLE = ["swift build", "swift test"];
// Steps that prepare a fresh runner rather than check anything. A working checkout already has them; after a dependency change,
// run `npm ci` first (`--fresh` does).
export const SETUP = ["npm ci", "npx --workspace packages/react playwright install --with-deps chromium", "swift --version"];

/** ci.yml's single-line `run:` steps that this script neither runs nor knows as setup, and the steps it runs that ci.yml has dropped. A `run: |` block is a report step, not a check. */
export function drift(workflow) {
  const inWorkflow = [...workflow.matchAll(/^\s*(?:- )?run: (?!\|)(.+)$/gm)].map((m) => m[1].trim());
  const known = [...WEB, ...APPLE, ...SETUP];
  return {
    added: inWorkflow.filter((step) => !known.includes(step)),
    removed: [...WEB, ...APPLE].filter((step) => !inWorkflow.includes(step)),
  };
}

/** The major version of Node that ci.yml's setup-node pins, or null if it names none. */
export function pinnedNodeMajor(workflow) {
  const match = /^\s*node-version:\s*["']?v?(\d+)/m.exec(workflow);
  return match ? Number(match[1]) : null;
}

/** What to print about the Node this runs on beside the one CI pins, and whether it is a warning. */
export function nodeReport(running, pinned) {
  const major = Number(String(running).replace(/^v/, "").split(".")[0]);
  if (pinned === null) return { warn: true, text: `Node ${running} here; ci.yml pins no Node version this script can read, so this may not be CI's Node.` };
  if (major !== pinned) return { warn: true, text: `Node ${running} here, Node ${pinned} in ci.yml: the major versions differ, so a pass or a fail here may not be CI's. Run it on Node ${pinned} before you rely on it.` };
  return { warn: false, text: `Node ${running} here, Node ${pinned} in ci.yml.` };
}

function fail(message) {
  console.error(`\nci:local: ${message}`);
  process.exit(1);
}

function main() {
  const webOnly = process.argv.includes("--web-only");
  const fresh = process.argv.includes("--fresh");
  const workflow = fs.readFileSync(path.join(repo, ".github/workflows/ci.yml"), "utf8");

  // Stay in step with ci.yml.
  const { added, removed } = drift(workflow);
  if (added.length || removed.length) {
    fail(
      "ci.yml and this script disagree; update scripts/ci-local.mjs to match.\n" +
        added.map((s) => `  in ci.yml, not run here: ${s}`).concat(removed.map((s) => `  run here, gone from ci.yml: ${s}`)).join("\n"),
    );
  }

  const git = (...args) => spawnSync("git", args, { cwd: repo, encoding: "utf8" }).stdout.trim();
  const head = git("rev-parse", "--short", "HEAD");
  const dirty = git("status", "--porcelain") !== "";

  const hasSwift = process.platform === "darwin" && spawnSync("swift", ["--version"], { stdio: "ignore" }).status === 0;
  if (!webOnly && !hasSwift) {
    fail("the macOS job needs Swift on a Mac (Xcode or the Swift toolchain). Run with --web-only to check the web job alone, and say on the PR that the Swift package went unchecked.");
  }

  const node = nodeReport(process.version, pinnedNodeMajor(workflow));
  console.log(`${node.warn ? "WARNING: " : ""}${node.text}`);

  // --fresh: a new worktree of HEAD, removed again when this process ends, however it ends.
  let cwd = repo;
  let worktree = null;
  if (fresh) {
    worktree = fs.mkdtempSync(path.join(os.tmpdir(), `basalt-fresh-${head}-`));
    const added = spawnSync("git", ["worktree", "add", "--detach", worktree, "HEAD"], { cwd: repo, stdio: "inherit" });
    if (added.status !== 0) fail("could not create a worktree of HEAD.");
    cwd = worktree;
    process.on("exit", () => {
      spawnSync("git", ["worktree", "remove", "--force", worktree], { cwd: repo, stdio: "ignore" });
      fs.rmSync(worktree, { recursive: true, force: true });
    });
    console.log(`\n── fresh: ${worktree} (HEAD ${head}, no uncommitted changes)\n── fresh: npm ci`);
    const t = Date.now();
    if (spawnSync("npm ci", { cwd, shell: true, stdio: "inherit" }).status !== 0) fail("`npm ci` failed in the fresh worktree.");
    console.log(`── fresh: npm ci passed in ${((Date.now() - t) / 1000).toFixed(0)}s`);
  }

  const snapshots = webOnly ? null : fs.mkdtempSync(path.join(os.tmpdir(), "basalt-snapshots-"));
  const jobs = [["web", WEB], ...(webOnly ? [] : [["macOS", APPLE]])];

  console.log(`ci:local on ${head}${fresh ? ", from a fresh worktree" : dirty ? ", with uncommitted changes: this result is for the working tree, not the commit" : ""}`);
  if (fresh && dirty) console.log("WARNING: this checkout has uncommitted changes, and --fresh does not include them: commit them first to check them.");
  const started = Date.now();
  for (const [job, steps] of jobs) {
    for (const step of steps) {
      console.log(`\n── ${job}: ${step}`);
      const env = step === "swift test" ? { ...process.env, BASALT_SNAPSHOT_DIR: snapshots } : process.env;
      const t = Date.now();
      const { status } = spawnSync(step, { cwd, env, shell: true, stdio: "inherit" });
      if (status !== 0) fail(`${job} job failed at \`${step}\` (exit ${status}) on ${head}${fresh ? " (fresh worktree)" : ""}.`);
      console.log(`── ${job}: ${step} passed in ${((Date.now() - t) / 1000).toFixed(0)}s`);
    }
  }

  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nci:local passed on ${head}${fresh ? " (fresh worktree)" : dirty ? " (working tree)" : ""} in ${minutes} min: the web job${webOnly ? " only; the macOS job was not run" : " and the macOS job"}.${node.warn ? `\nWARNING: ${node.text}` : ""}`);
  if (snapshots) console.log(`SwiftUI renders: ${snapshots}`);
}

// Importable for its tests; run only as a script.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
