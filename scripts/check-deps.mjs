// Every runtime dependency must be approved in dependencies.allowed.json, with a reason.
// Fails on an unlisted dependency (new and unapproved) and on a listed one that's gone (stale).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowed = JSON.parse(fs.readFileSync(path.join(repo, "dependencies.allowed.json"), "utf8"));
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

for (const dir of fs.readdirSync(path.join(repo, "packages"))) {
  const file = path.join(repo, "packages", dir, "package.json");
  if (!fs.existsSync(file)) continue;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  const names = [...new Set(["dependencies", "peerDependencies", "optionalDependencies"].flatMap((k) => Object.keys(pkg[k] ?? {})))];
  compare(`packages/${dir}`, names);
}

// SwiftPM: remote packages are declared with .package(url: ...).
const swift = fs.readFileSync(path.join(repo, "Package.swift"), "utf8");
compare("Package.swift", [...swift.matchAll(/\.package\(\s*(?:name:\s*"[^"]*",\s*)?url:\s*"([^"]+)"/g)].map((m) => m[1]));

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("dependencies: every runtime dependency is approved");
