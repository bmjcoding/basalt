// Fetches the SwiftUI renders from a commit's macOS CI job into a review round's assets. The
// job prints each PNG into its log (base64, between markers), so this needs only `gh` and log
// access, not artifact storage.
//
//   node tools/review/fetch-swiftui-renders.mjs <commit-sha> <round>
//   → tools/review/assets/round-<round>/swiftui-sample-{light,dark}.png

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [sha, round] = process.argv.slice(2);
if (!/^[0-9a-f]{7,40}$/.test(sha ?? "") || !/^\d+$/.test(round ?? "")) {
  console.error("usage: node tools/review/fetch-swiftui-renders.mjs <commit-sha> <round>");
  process.exit(2);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const gh = (...args) => execFileSync("gh", ["api", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const runs = JSON.parse(gh(`repos/bmjcoding/basalt/commits/${sha}/check-runs`)).check_runs;
const job = runs.find((r) => r.name === "Swift package (macOS)");
if (!job) throw new Error(`no macOS job for ${sha}`);
if (job.status !== "completed") throw new Error(`the macOS job is ${job.status}; try again when it's done`);

const log = gh(`repos/bmjcoding/basalt/actions/jobs/${job.id}/logs`)
  .split("\n")
  // each line starts with a timestamp: 2026-11-04T02:16:32.2619490Z
  .map((l) => l.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /, "").replace(/\r$/, ""));

const out = path.join(here, "assets", `round-${round}`);
fs.mkdirSync(out, { recursive: true });
let name = null;
let chunks = [];
let found = 0;
for (const line of log) {
  const begin = line.match(/^BASALT-SNAPSHOT-BEGIN (\S+\.png)$/);
  if (begin) {
    name = begin[1];
    chunks = [];
  } else if (line === "BASALT-SNAPSHOT-END" && name) {
    const png = Buffer.from(chunks.join(""), "base64");
    if (png.subarray(1, 4).toString() !== "PNG") throw new Error(`${name} didn't decode to a PNG`);
    fs.writeFileSync(path.join(out, name), png);
    console.log(`${path.relative(process.cwd(), path.join(out, name))}  ${png.length} bytes`);
    found++;
    name = null;
  } else if (name && /^[A-Za-z0-9+/=]+$/.test(line)) {
    chunks.push(line);
  }
}
if (!found) throw new Error("no renders in the log");
