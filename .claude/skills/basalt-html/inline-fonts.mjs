// Puts Geist and Geist Mono into a finished HTML file, so it looks right on a machine that doesn't have them.
//
//   node .claude/skills/basalt-html/inline-fonts.mjs <file.html>
//
// Replaces the `<!-- basalt:fonts -->` marker the templates carry with a <style> holding geist.css (the two
// @font-face rules as data URIs, about 190 KB). Run it on a file a person will open; skip it for files that tools read.
// Safe to run twice: a file this helper has finished (it carries its `data-basalt-fonts` style) is left as it is. No dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "<!-- basalt:fonts -->";
// What this helper writes in the marker's place. Only a file carrying it counts as finished: text that merely names Geist does not.
const DONE = "<style data-basalt-fonts>";
const file = process.argv[2];
if (!file) {
  console.error("usage: node inline-fonts.mjs <file.html>");
  process.exit(2);
}
const html = fs.readFileSync(file, "utf8");
if (!html.includes(MARKER)) {
  if (html.includes(DONE)) {
    console.error(`${file}: fonts are already inlined`);
    process.exit(0);
  }
  console.error(`${file}: no ${MARKER} marker to replace; add it to the <head>`);
  process.exit(1);
}
const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "geist.css"), "utf8").trim();
fs.writeFileSync(file, html.replace(MARKER, () => `${DONE}\n${css}\n</style>`));
console.log(`${file}: Geist and Geist Mono inlined`);
