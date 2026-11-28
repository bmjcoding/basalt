#!/usr/bin/env node
// basalt-palette <file.mjs> [--out file.css]: verifies the palettes a module exports (its default export, one definition or a list) and writes
// their CSS (to the file, or to standard output). Exits 1 with every failing pair when one fails, and prints any status-distance advisory.
// cimip-gaps-3 T9, DECISIONS 403: paletteCss is the only emitter, and it verifies.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describePair, paletteCss, verifyPalette } from "../dist/js/palettes.js";

const args = process.argv.slice(2);
const at = args.indexOf("--out");
const out = at >= 0 ? args[at + 1] : undefined;
const file = args.find((a, i) => !a.startsWith("--") && i !== at + 1);
if (!file) {
  console.error("usage: basalt-palette <file.mjs> [--out file.css]");
  process.exit(2);
}
const loaded = (await import(pathToFileURL(path.resolve(file)).href)).default;
const defs = Array.isArray(loaded) ? loaded : [loaded];
let failed = false;
for (const def of defs) {
  let result;
  try {
    result = verifyPalette(def);
  } catch (error) {
    console.error(error.message);
    failed = true;
    continue;
  }
  for (const pair of result.failures) console.error(`${def.id}: ${describePair(pair)}`);
  for (const pair of result.advisories) console.error(`${def.id} (advisory): ${describePair(pair)}`);
  if (!result.ok) failed = true;
}
if (failed) process.exit(1);
const css = paletteCss(defs);
if (out) fs.writeFileSync(out, css);
else process.stdout.write(css);
