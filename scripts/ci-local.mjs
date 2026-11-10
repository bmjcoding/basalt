// Runs both CI jobs (.github/workflows/ci.yml) on this machine: the web job's steps, then the macOS job's.
// GitHub Actions minutes can run out, and when CI can't run, this is the check a PR passes before it merges (AGENTS.md, Checks).
//
//   npm run ci:local              both jobs; the macOS job needs a Mac with Swift
//   npm run ci:local -- --web-only   the web job alone (say so on the PR: the Swift package went unchecked)
//
// It runs ci.yml's own commands in ci.yml's order and stops at the first failure, as CI does. It reads ci.yml first and refuses to
// run if the two have drifted apart, so a step added to CI can't be skipped here unnoticed.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webOnly = process.argv.includes("--web-only");

const WEB = [
  "npm run lint",
  "npm test",
  "npm run artifact",
  "npm run typecheck:review",
  "npm run test:packages",
  "git diff --exit-code -- Sources/BasaltTokens/Tokens.swift",
];
const APPLE = ["swift build", "swift test"];
// Steps that prepare a fresh runner rather than check anything. A working checkout already has them; after a dependency change,
// run `npm ci` first.
const SETUP = ["npm ci", "npx --workspace packages/react playwright install --with-deps chromium", "swift --version"];

function fail(message) {
  console.error(`\nci:local: ${message}`);
  process.exit(1);
}

// Stay in step with ci.yml. Its single-line run steps must be exactly the ones above. A `run: |` block is a report step (the SwiftUI
// renders printed into the log), not a check.
const workflow = fs.readFileSync(path.join(repo, ".github/workflows/ci.yml"), "utf8");
const inWorkflow = [...workflow.matchAll(/^\s*(?:- )?run: (?!\|)(.+)$/gm)].map((m) => m[1].trim());
const known = [...WEB, ...APPLE, ...SETUP];
const added = inWorkflow.filter((step) => !known.includes(step));
const removed = [...WEB, ...APPLE].filter((step) => !inWorkflow.includes(step));
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

const snapshots = webOnly ? null : fs.mkdtempSync(path.join(os.tmpdir(), "basalt-snapshots-"));
const jobs = [["web", WEB], ...(webOnly ? [] : [["macOS", APPLE]])];

console.log(`ci:local on ${head}${dirty ? ", with uncommitted changes: this result is for the working tree, not the commit" : ""}`);
const started = Date.now();
for (const [job, steps] of jobs) {
  for (const step of steps) {
    console.log(`\n── ${job}: ${step}`);
    const env = step === "swift test" ? { ...process.env, BASALT_SNAPSHOT_DIR: snapshots } : process.env;
    const t = Date.now();
    const { status } = spawnSync(step, { cwd: repo, env, shell: true, stdio: "inherit" });
    if (status !== 0) fail(`${job} job failed at \`${step}\` (exit ${status}) on ${head}.`);
    console.log(`── ${job}: ${step} passed in ${((Date.now() - t) / 1000).toFixed(0)}s`);
  }
}

const minutes = ((Date.now() - started) / 60000).toFixed(1);
console.log(`\nci:local passed on ${head}${dirty ? " (working tree)" : ""} in ${minutes} min: the web job${webOnly ? " only; the macOS job was not run" : " and the macOS job"}.`);
if (snapshots) console.log(`SwiftUI renders: ${snapshots}`);
