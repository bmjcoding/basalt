// cimip-gaps-3 E3 (engineering): the declarations name their siblings as Node's resolution needs ("./glyph-set.js", "./glyphs/check.js"), so an app
// type-checked under `moduleResolution: "node16"` or `"nodenext"` can follow `export * from` to the glyphs (an unresolved star re-export drops them all
// without a word, under skipLibCheck). Reads the built files: no browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { nodeSpecifier, rewriteSpecifiers } from "../declaration-specifiers.mjs";
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

test("the build's rule rewrites real module specifiers only: a comment's example, a string and a non-module file are left as written", () => {
  const source = [
    '/** An example: `import file from "./guide"` stays as it is. */',
    'import type { A } from "./a";',
    'import "./side";',
    'export * from "./set";',
    'export { B,',
    '  C } from "./b";',
    'export declare const d: typeof import("./d");',
    '// export * from "./not-code";',
    'export declare const e = "export * from \'./a string\'";',
    'export declare const f: string; /* import x from "./also-not" */',
    'import svg from "./mark.svg?raw";',
  ].join("\n");
  const seen = [];
  const out = rewriteSpecifiers(source, (name) => { seen.push(name); return name.includes("?") ? null : `${name}.js`; });
  assert.deepEqual(seen.sort(), ["./a", "./b", "./d", "./mark.svg?raw", "./set", "./side"]);
  assert.equal(out, [
    '/** An example: `import file from "./guide"` stays as it is. */',
    'import type { A } from "./a.js";',
    'import "./side.js";',
    'export * from "./set.js";',
    'export { B,',
    '  C } from "./b.js";',
    'export declare const d: typeof import("./d.js");',
    '// export * from "./not-code";',
    'export declare const e = "export * from \'./a string\'";',
    'export declare const f: string; /* import x from "./also-not" */',
    'import svg from "./mark.svg?raw";',
  ].join("\n"));
});

test("the build's resolver: a sibling's declaration, a folder's index, a file that is not a module, and a name that is nowhere fails", () => {
  const resolve = nodeSpecifier(fs, path, dist, "index.d.ts");
  assert.equal(resolve("./glyph-set"), "./glyph-set.js");
  assert.equal(resolve("./glyphs/check"), "./glyphs/check.js");
  assert.equal(resolve("../brand/blacksand/mark.svg?raw"), null);
  assert.throws(() => resolve("./no-such-module"), /no declaration in dist/);
});
