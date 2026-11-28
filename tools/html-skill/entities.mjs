// Writes src/entities.json: HTML's named character references, from the WHATWG HTML Standard's own list (https://html.spec.whatwg.org/entities.json),
// which compose.mjs reads to decode a figure's id the way a browser decodes an attribute (G146). Run by hand when the list changes (`node
// tools/html-skill/entities.mjs`); the build copies the file into the skill as parts/entities.json. It holds `named` (each name that ends in `;`, written
// without it, and its characters) and `legacy` (the names a browser also reads without the `;`). The Standard is © WHATWG (Apple, Google, Mozilla,
// Microsoft), under CC BY 4.0: the notice travels in the file.
import fs from "node:fs";
import path from "node:path";

const SOURCE = "https://html.spec.whatwg.org/entities.json";
const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE}: ${response.status}`);
const list = await response.json();
const named = {};
const legacy = [];
for (const [key, value] of Object.entries(list)) {
  const name = key.slice(1);
  if (name.endsWith(";")) named[name.slice(0, -1)] = value.characters;
  else legacy.push(name);
}
for (const name of legacy) if (named[name] !== list[`&${name}`].characters) throw new Error(`${name}: its legacy form differs`);
const out = {
  $source: SOURCE,
  $notice: "HTML Living Standard, the named character references. Copyright © WHATWG (Apple, Google, Mozilla, Microsoft). Licensed under a Creative Commons Attribution 4.0 International License: https://creativecommons.org/licenses/by/4.0/",
  named,
  legacy: legacy.sort(),
};
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "src", "entities.json"), `${JSON.stringify(out)}\n`);
console.log(`entities: ${Object.keys(named).length} names, ${legacy.length} legacy`);
