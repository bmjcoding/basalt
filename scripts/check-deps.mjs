// Every runtime dependency must be approved in dependencies.allowed.json, with a reason, and must come from where the approval means.
// Fails on an unlisted dependency (new and unapproved), on a listed one that's gone (stale), on a version that is not an exact semver (a range, a tag, an
// alias such as `npm:left-pad@1`, a git or tarball or file URL: those point an approved name at another package), on `bundleDependencies`, and on a SwiftPM
// `.package(` that is not a `url:` the list names. The one exception is a version range the list itself holds, in `$ranges`: the two React peers, which are
// the host app's own React and cannot be pinned.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isMain } from "./is-main.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** Swift source without its comments: a `//` inside a string (a URL's) is not one, and a block comment nests. */
function withoutSwiftComments(source) {
  let out = "";
  for (let i = 0; i < source.length;) {
    if (source[i] === '"') {
      let j = i + 1;
      while (j < source.length && source[j] !== '"' && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      out += source.slice(i, j + 1);
      i = j + 1;
    } else if (source.startsWith("//", i)) {
      while (i < source.length && source[i] !== "\n") i++;
    } else if (source.startsWith("/*", i)) {
      let depth = 0;
      do {
        if (source.startsWith("/*", i)) { depth++; i += 2; } else if (source.startsWith("*/", i)) { depth--; i += 2; } else i++;
      } while (depth > 0 && i < source.length);
    } else out += source[i++];
  }
  return out;
}

/** The problems with the dependencies under `repo` (an empty list when every one is approved and exact). */
export function checkDependencies(repo = repoRoot) {
  const allowed = JSON.parse(fs.readFileSync(path.join(repo, "dependencies.allowed.json"), "utf8"));
  const ranges = allowed.$ranges ?? {};
  const problems = [];

  function compare(where, actual) {
    const approved = allowed[where] ?? {};
    for (const name of actual) {
      if (!(name in approved)) problems.push(`${where}: "${name}" is not approved. Add it to dependencies.allowed.json with a reason, and get the owner's approval in the PR (AGENTS.md).`);
      else if (!String(approved[name]).trim()) problems.push(`${where}: "${name}" has no reason in dependencies.allowed.json.`);
    }
    for (const name of Object.keys(approved)) {
      if (!actual.includes(name)) problems.push(`${where}: "${name}" is approved but no longer used; remove it from dependencies.allowed.json.`);
    }
  }

  for (const dir of fs.readdirSync(path.join(repo, "packages")).sort()) {
    const file = path.join(repo, "packages", dir, "package.json");
    if (!fs.existsSync(file)) continue;
    const where = `packages/${dir}`;
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    const kinds = ["dependencies", "peerDependencies", "optionalDependencies"];
    // An approved package whose file is copied into dist is a devDependency (it is not installed with the package), listed in $copied at the exact version
    // the copy was made from: it counts as used while that devDependency is there, at that version.
    const copied = allowed.$copied?.[where] ?? {};
    for (const [name, version] of Object.entries(copied)) {
      const dev = pkg.devDependencies?.[name];
      if (dev !== version) problems.push(`$copied: ${where} "${name}" is listed as "${version}" but is ${dev === undefined ? "not a devDependency" : `"${dev}" in devDependencies`}; the copy in dist and the list must agree.`);
    }
    compare(where, [...new Set([...kinds.flatMap((k) => Object.keys(pkg[k] ?? {})), ...Object.keys(copied).filter((name) => pkg.devDependencies?.[name] === copied[name])])]);
    for (const kind of kinds) for (const [name, version] of Object.entries(pkg[kind] ?? {})) {
      if (EXACT.test(version)) continue;
      if (ranges[where]?.[name] === version) continue;
      problems.push(`${where}: "${name}" is "${version}" in ${kind}, which is not an exact version (like "1.2.3"). A range, a tag, an alias or a URL can point an approved name at another package: pin it, or, for a peer that must stay a range, list it in dependencies.allowed.json under "$ranges".`);
    }
    for (const key of ["bundleDependencies", "bundledDependencies"]) {
      if (key in pkg) problems.push(`${where}: "${key}" is set: it ships packages inside this one that no list approves. Remove it.`);
    }
  }
  for (const [where, listed] of Object.entries(ranges)) {
    for (const [name, version] of Object.entries(listed)) {
      const file = path.join(repo, where, "package.json");
      const pkg = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
      const actual = ["dependencies", "peerDependencies", "optionalDependencies"].map((k) => pkg[k]?.[name]).find((v) => v !== undefined);
      if (actual !== version) problems.push(`$ranges: ${where} "${name}" is listed as "${version}" but is ${actual === undefined ? "not a dependency" : `"${actual}"`}; update dependencies.allowed.json.`);
    }
  }

  // SwiftPM: a remote package is declared with .package(url: ...), and only that form is allowed. A local `path:` or a registry `id:` has no URL for the list to name.
  const swift = withoutSwiftComments(fs.readFileSync(path.join(repo, "Package.swift"), "utf8"));
  const urls = [];
  for (const start of swift.matchAll(/\.package\s*\(/g)) {
    let depth = 1;
    let end = start.index + start[0].length;
    for (; end < swift.length && depth > 0; end++) depth += swift[end] === "(" ? 1 : swift[end] === ")" ? -1 : 0;
    const call = swift.slice(start.index, end);
    const url = call.match(/^\.package\s*\(\s*(?:name:\s*"[^"]*"\s*,\s*)?url:\s*"([^"]+)"/)?.[1];
    if (url === undefined) problems.push(`Package.swift: \`${call.replace(/\s+/g, " ").slice(0, 80)}\` is not a \`.package(url: "…", …)\`: a local path, a registry id or any other form has no URL for dependencies.allowed.json to approve.`);
    else urls.push(url);
  }
  compare("Package.swift", urls);
  return problems;
}

if (isMain(import.meta.url)) {
  const problems = checkDependencies();
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("dependencies: every runtime dependency is approved");
}
