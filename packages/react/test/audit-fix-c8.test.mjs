// audit-fix-c8 (engineering), the tooling's half: the scripts that run when started through a symlink (A5-23), `ci:local --fresh` removing its worktree when it is
// interrupted (A5-26), `pixel-proof compare` failing on no images (A5-27), and the dependency allowlist checking where a package comes from (A5-28). Each test
// fails on the commit before the fix. No browser but the one pixel-proof starts for its passing case.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { pkg } from "./support.mjs";

const repo = path.join(pkg, "..", "..");
const temp = (prefix) => fs.mkdtempSync(path.join(os.tmpdir(), `basalt-c8-${prefix}-`));

// ---- A5-23: the five scripts run through a symlinked path ----

test("isMain compares real paths, so a script started through a link is the main script", async () => {
  const { isMain } = await import(pathToFileURL(path.join(repo, "scripts", "is-main.mjs")).href);
  const dir = temp("link");
  try {
    const url = pathToFileURL(path.join(repo, "scripts", "lint.mjs")).href;
    fs.symlinkSync(path.join(repo, "scripts"), path.join(dir, "scripts"));
    assert.equal(isMain(url, path.join(repo, "scripts", "lint.mjs")), true);
    assert.equal(isMain(url, path.join(dir, "scripts", "lint.mjs")), true, "a path through a symlink is the same script");
    assert.equal(isMain(url, path.join(repo, "scripts", "check.mjs")), false);
    assert.equal(isMain(url, undefined), false);
    assert.equal(isMain(url, path.join(dir, "missing.mjs")), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** Starts `node <link>/scripts/<name>` and reports whether it began its first step (the runner prints "── step") before it ended. The step is stopped at once, with its group. */
async function startsThroughLink(name, args = []) {
  const dir = temp("start");
  try {
    const link = path.join(dir, "repo");
    fs.symlinkSync(repo, link);
    const child = spawn(process.execPath, [path.join(link, "scripts", name), ...args], { cwd: dir, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (out += chunk));
    const ended = new Promise((resolve) => child.on("close", (code) => resolve({ code, began: /^── /m.test(out) })));
    const began = new Promise((resolve) => {
      const poll = setInterval(() => { if (/^── /m.test(out)) { clearInterval(poll); resolve({ code: null, began: true }); } }, 50);
      ended.then((result) => { clearInterval(poll); resolve(result); });
      setTimeout(() => { clearInterval(poll); resolve({ code: null, began: false, timedOut: true }); }, 30_000);
    });
    const result = await began;
    try { process.kill(-child.pid, "SIGTERM"); } catch { /* it had already ended */ }
    await Promise.race([ended, new Promise((resolve) => setTimeout(resolve, 10_000))]);
    return { ...result, out };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

for (const [name, args] of [["lint.mjs", []], ["check.mjs", []], ["test-all.mjs", []], ["ci-local.mjs", ["--web-only"]]]) {
  test(`scripts/${name} runs its steps when started through a symlinked path`, async () => {
    const result = await startsThroughLink(name, args);
    assert.equal(result.began, true, `${name} did nothing (exit ${result.code}) through a symlink: ${result.out.slice(0, 200)}`);
  });
}

// ---- A5-26: --fresh removes its worktree on an interrupt, a termination and a hangup ----

test("runAtEnd runs its cleanup when the process exits, and on SIGINT, SIGTERM and SIGHUP, once", async () => {
  const dir = temp("signal");
  try {
    const script = path.join(dir, "child.mjs");
    const marker = path.join(dir, "marker");
    fs.writeFileSync(script, `import fs from "node:fs";
import { runAtEnd } from ${JSON.stringify(pathToFileURL(path.join(repo, "scripts", "ci-local.mjs")).href)};
runAtEnd(() => fs.appendFileSync(${JSON.stringify(marker)}, "cleaned\\n"));
console.log("ready");
if (process.argv[2] === "exit") process.exit(1);
setTimeout(() => {}, 60_000);
`);
    const run = (mode, signal) => new Promise((resolve) => {
      fs.rmSync(marker, { force: true });
      const child = spawn(process.execPath, [script, mode], { stdio: ["ignore", "pipe", "inherit"] });
      child.stdout.once("data", () => { if (signal) child.kill(signal); });
      child.on("close", (code, killedBy) => resolve({ code, killedBy, marker: fs.existsSync(marker) ? fs.readFileSync(marker, "utf8") : "" }));
    });
    assert.deepEqual(await run("exit"), { code: 1, killedBy: null, marker: "cleaned\n" });
    for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]]) assert.deepEqual(await run("wait", signal), { code, killedBy: null, marker: "cleaned\n" }, signal);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("ci-local.mjs hands the worktree's removal to runAtEnd, not to a bare exit listener", () => {
  const source = fs.readFileSync(path.join(repo, "scripts", "ci-local.mjs"), "utf8");
  assert.match(source, /runAtEnd\(\(\) => \{\s*spawnSync\("git", \["worktree", "remove", "--force", worktree\]/);
  assert.doesNotMatch(source, /however it ends/);
});

// ---- A5-27: pixel-proof compare fails when it compared nothing ----

test("pixel-proof compare exits 1, and says so, for two folders with no image; two identical images pass", () => {
  const dir = temp("pixel");
  try {
    for (const side of ["a", "b"]) fs.mkdirSync(path.join(dir, side));
    const script = path.join(repo, "tools", "review", "pixel-proof.mjs");
    const empty = spawnSync(process.execPath, [script, "compare", path.join(dir, "a"), path.join(dir, "b")], { encoding: "utf8" });
    assert.equal(empty.status, 1, `${empty.stdout}${empty.stderr}`);
    assert.match(empty.stderr, /compared no images/);
    assert.doesNotMatch(empty.stdout, /0 differing pixels/);
    // A folder of other files only is no better.
    fs.writeFileSync(path.join(dir, "a", "notes.txt"), "x");
    assert.equal(spawnSync(process.execPath, [script, "compare", path.join(dir, "a"), path.join(dir, "b")], { encoding: "utf8" }).status, 1);
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64");
    for (const side of ["a", "b"]) fs.writeFileSync(path.join(dir, side, "one.png"), png);
    const same = spawnSync(process.execPath, [script, "compare", path.join(dir, "a"), path.join(dir, "b")], { encoding: "utf8" });
    assert.equal(same.status, 0, `${same.stdout}${same.stderr}`);
    assert.match(same.stdout, /1 images: 1 identical \(0 differing pixels\), 0 not/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---- A5-28: the dependency allowlist ----

const { checkDependencies } = await import(pathToFileURL(path.join(repo, "scripts", "check-deps.mjs")).href);

/** A copy of what the check reads, with `edit` applied: { list, packages: { name: manifest }, swift }. */
function fixture(edit = () => {}) {
  const root = temp("deps");
  const read = (file) => fs.readFileSync(path.join(repo, file), "utf8");
  const state = { list: JSON.parse(read("dependencies.allowed.json")), packages: {}, swift: read("Package.swift") };
  for (const name of fs.readdirSync(path.join(repo, "packages"))) if (fs.existsSync(path.join(repo, "packages", name, "package.json"))) state.packages[name] = JSON.parse(read(path.join("packages", name, "package.json")));
  edit(state);
  fs.writeFileSync(path.join(root, "dependencies.allowed.json"), JSON.stringify(state.list));
  fs.writeFileSync(path.join(root, "Package.swift"), state.swift);
  for (const [name, manifest] of Object.entries(state.packages)) {
    fs.mkdirSync(path.join(root, "packages", name), { recursive: true });
    fs.writeFileSync(path.join(root, "packages", name, "package.json"), JSON.stringify(manifest));
  }
  try { return checkDependencies(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test("the repository's own dependencies pass, the two React peers being the listed ranges", () => {
  assert.deepEqual(fixture(), []);
  assert.deepEqual(checkDependencies(repo), []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(repo, "dependencies.allowed.json"), "utf8")).$ranges, { "packages/react": { react: ">=19", "react-dom": ">=19" } }, "the peers' ranges are listed");
});

test("an approved name pointed at another package is refused: an alias, a git URL, a tarball, a file path, a range, a tag", () => {
  for (const [version, what] of [["npm:left-pad@1.3.0", "alias"], ["github:someone/fork", "git"], ["https://example.test/shiki.tgz", "tarball"], ["file:../elsewhere", "file"], ["^4.6.0", "caret range"], ["~4.6.0", "tilde range"], ["latest", "tag"], ["4.6", "partial version"], ["*", "wildcard"]]) {
    const problems = fixture((state) => { state.packages.react.dependencies.shiki = version; });
    assert.equal(problems.length, 1, `${what}: ${problems.join(" | ")}`);
    assert.match(problems[0], new RegExp(`"shiki" is "${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}".*not an exact version`));
  }
  assert.deepEqual(fixture((state) => { state.packages.react.dependencies.shiki = "4.6.1-beta.2+build.5"; }), [], "an exact version with a pre-release and build is exact");
  assert.match(fixture((state) => { state.packages.react.optionalDependencies = { cmdk: "^1.0.0" }; }).join("\n"), /"cmdk" is "\^1\.0\.0" in optionalDependencies/);
});

test("a peer range passes only as the list holds it, and a stale entry in $ranges fails", () => {
  assert.match(fixture((state) => { state.packages.react.peerDependencies.react = ">=18"; }).join("\n"), /"react" is ">=18" in peerDependencies/);
  assert.match(fixture((state) => { state.list.$ranges["packages/react"].react = ">=18"; }).join("\n"), /\$ranges: packages\/react "react" is listed as ">=18" but is ">=19"/);
  assert.match(fixture((state) => { state.list.$ranges["packages/react"].lodash = "^4"; }).join("\n"), /\$ranges: packages\/react "lodash" is listed as "\^4" but is not a dependency/);
});

test("bundleDependencies and bundledDependencies fail", () => {
  assert.match(fixture((state) => { state.packages.react.bundleDependencies = ["left-pad"]; }).join("\n"), /"bundleDependencies" is set/);
  assert.match(fixture((state) => { state.packages.tokens.bundledDependencies = ["left-pad"]; }).join("\n"), /packages\/tokens: "bundledDependencies" is set/);
});

test("a new name still fails, and so does a Swift .package( that is not a listed url", () => {
  assert.match(fixture((state) => { state.packages.react.dependencies.lodash = "4.17.21"; }).join("\n"), /"lodash" is not approved/);
  const withSwift = (line) => fixture((state) => { state.swift = state.swift.replace("let package = Package(", `let extra = [${line}]\nlet package = Package(`); });
  assert.match(withSwift('.package(url: "https://github.com/example/x", from: "1.0.0")').join("\n"), /"https:\/\/github\.com\/example\/x" is not approved/);
  assert.match(withSwift('.package(path: "../local")').join("\n"), /`\.package\(path: "\.\.\/local"\)` is not a `\.package\(url:/);
  assert.match(withSwift('.package(id: "scope.name", from: "1.0.0")').join("\n"), /is not a `\.package\(url:/);
  assert.match(withSwift('.package(name: "X", path: "../x")').join("\n"), /is not a `\.package\(url:/);
  assert.deepEqual(fixture((state) => { state.swift = `// .package(path: "../in-a-comment")\n/* .package(id: "x") */\n${state.swift}`; }), [], "a comment is not a dependency");
  const listed = fixture((state) => { state.list["Package.swift"]["https://github.com/example/x"] = "a reason"; state.swift = state.swift.replace("let package = Package(", 'let extra = [.package(url: "https://github.com/example/x", from: "1.0.0")]\nlet package = Package('); });
  assert.deepEqual(listed, [], "a listed url with a reason is approved");
});
