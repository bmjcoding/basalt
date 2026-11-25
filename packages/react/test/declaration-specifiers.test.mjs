// cimip-gaps-3 E3 (engineering): the declarations name their siblings as Node's resolution needs ("./glyph-set.js", "./glyphs/check.js"), so an app
// type-checked under `moduleResolution: "node16"` or `"nodenext"` can follow `export * from` to the glyphs (an unresolved star re-export drops them all
// without a word, under skipLibCheck). Reads the built files: no browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { pkg } from "./support.mjs";

const dist = path.join(pkg, "dist");
const declarations = fs.readdirSync(dist, { recursive: true }).filter((file) => file.endsWith(".d.ts"));
// What a declaration imports or re-exports from: `from "…"`, `import("…")` and a bare `import "…"`, comments left out.
const specifiers = (source) => [...source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)["']([^"']+)["']/gm)].map((match) => match[1]);

test("every relative specifier in dist's declarations names a .js file that has a declaration beside it", () => {
  assert.ok(declarations.length > 100, "the declarations were built");
  const wrong = [];
  for (const file of declarations) {
    const at = path.dirname(path.join(dist, file));
    for (const name of specifiers(fs.readFileSync(path.join(dist, file), "utf8")).filter((s) => s.startsWith("./") || s.startsWith("../"))) {
      if (!name.endsWith(".js") || !fs.existsSync(path.resolve(at, name.replace(/\.js$/, ".d.ts")))) wrong.push(`${file}: ${name}`);
    }
  }
  assert.deepEqual(wrong, []);
});

test("the index re-exports the core glyphs by a specifier Node resolves", () => {
  const index = fs.readFileSync(path.join(dist, "index.d.ts"), "utf8");
  assert.match(index, /export \* from "\.\/glyph-set\.js";/);
  const set = fs.readFileSync(path.join(dist, "glyph-set.d.ts"), "utf8");
  assert.match(set, /export \{ CheckGlyph \} from "\.\/glyphs\/check\.js";/);
});
