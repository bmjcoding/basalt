// What every runtime export costs an app, measured the way bundle.test.mjs measures a single import: `import { X } from "@srasyndicate/basalt"`
// bundled by esbuild, minified, React external. `test/export-sizes.json` records the numbers; bundle.test.mjs holds each export, the whole
// package and the style sheet to their recorded size plus 5%, and `npm run sizes -w packages/react` (this module's script, below) measures
// again, prints what moved, and rewrites the file, so a rise is seen in review and never silent.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

import * as esbuild from "esbuild";

export const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const TABLE = path.join(pkg, "test", "export-sizes.json");
/** How far above its recorded size anything may grow before the test fails. */
export const MARGIN = 0.05;

const external = ["react", "react-dom", "react/jsx-runtime"];
const gzip = (bytes) => zlib.gzipSync(bytes, { level: 9 }).length;

/** The runtime (value) exports of the package's entry, sorted. */
export async function runtimeExports() {
  return Object.keys(await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href)).sort();
}

/** What loads on demand is not up front: esbuild writes a dynamic `import()` into the one file when it can, and this leaves it as the call it is (as `measurePackage` does). */
const onDemand = {
  name: "on-demand",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => (args.kind === "dynamic-import" ? { path: args.path, external: true } : undefined));
  },
};

/** One export alone, as one file, minified: bytes and gzipped bytes. What it imports only when it is used (`CommandMenu`'s panel, `SiteHeader`'s narrow menu) is not in it. */
export async function measureExport(name) {
  const result = await esbuild.build({
    stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", write: false, external, plugins: [onDemand], logLevel: "silent",
  });
  const bytes = result.outputFiles[0].contents;
  return { bytes: bytes.length, gzip: gzip(bytes) };
}

/**
 * Everything an app that imports the whole package loads up front, with splitting: the entry and every chunk it imports statically, all the way
 * down (the lazy command panel and the language grammars load on demand and are not in it).
 */
export async function measurePackage() {
  const result = await esbuild.build({
    stdin: { contents: `import * as B from "./dist/index.js"; console.log(B);`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true, external, logLevel: "silent", absWorkingDir: pkg,
  });
  const outputs = result.metafile.outputs;
  const entry = Object.keys(outputs).find((file) => outputs[file].entryPoint === "<stdin>");
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const imported of outputs[file].imports) if (!imported.external && imported.kind !== "dynamic-import") visit(imported.path);
  };
  visit(entry);
  const files = result.outputFiles.filter((file) => seen.has(path.relative(pkg, file.path)));
  return { bytes: files.reduce((sum, file) => sum + file.contents.length, 0), gzip: files.reduce((sum, file) => sum + gzip(file.contents), 0) };
}

/** dist/styles.css as shipped: bytes and gzipped bytes. */
export function measureStyles() {
  const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"));
  return { bytes: css.length, gzip: gzip(css) };
}

/** Runs `work` over `items`, `width` at a time. */
async function pool(items, width, work) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: width }, async () => {
    for (let i = next++; i < items.length; i = next++) out[i] = await work(items[i]);
  }));
  return out;
}

/** Subpath entries measured separately from the root index (dynamic imports stay on demand). */
export async function measureSubpaths() {
  const entries = [["diagram-interop", "./dist/diagram-interop.js"]];
  const out = {};
  for (const [name, entry] of entries) {
    const result = await esbuild.build({
      stdin: { contents: `import * as S from "${entry}"; console.log(S);`, resolveDir: pkg, loader: "js" },
      bundle: true, minify: true, format: "esm", write: false, external, plugins: [onDemand], logLevel: "silent",
    });
    const bytes = result.outputFiles[0].contents;
    out[name] = { bytes: bytes.length, gzip: gzip(bytes) };
  }
  return out;
}

/** The whole table, measured now. */
export async function measureAll({ width = 4 } = {}) {
  const names = await runtimeExports();
  const sizes = await pool(names, width, measureExport);
  return {
    exports: Object.fromEntries(names.map((name, i) => [name, sizes[i].bytes])),
    subpaths: await measureSubpaths(),
    package: await measurePackage(),
    styles: measureStyles(),
  };
}

const KB = (bytes) => `${(bytes / 1000).toFixed(1)} KB`;

/** A readable account of what moved between two tables. */
export function diff(before, after) {
  const lines = [];
  const row = (label, a, b) => { if (a !== b) lines.push(`  ${label.padEnd(34)} ${a === undefined ? "new" : a.toLocaleString("en")} -> ${b === undefined ? "gone" : b.toLocaleString("en")} bytes${a && b ? ` (${b > a ? "+" : ""}${(((b - a) / a) * 100).toFixed(1)}%)` : ""}`); };
  for (const name of new Set([...Object.keys(before.exports ?? {}), ...Object.keys(after.exports)])) row(name, before.exports?.[name], after.exports[name]);
  for (const name of new Set([...Object.keys(before.subpaths ?? {}), ...Object.keys(after.subpaths ?? {})])) {
    for (const key of ["bytes", "gzip"]) {
      row(`subpath ${name}, ${key === "gzip" ? "gzipped" : "minified"}`, before.subpaths?.[name]?.[key], after.subpaths?.[name]?.[key]);
    }
  }
  for (const key of ["bytes", "gzip"]) {
    row(`whole package, up front, ${key === "gzip" ? "gzipped" : "minified"}`, before.package?.[key], after.package[key]);
    row(`styles.css, ${key === "gzip" ? "gzipped" : "minified as shipped"}`, before.styles?.[key], after.styles[key]);
  }
  return lines;
}

// `node test/export-sizes.mjs`: measure, print what moved, write the table.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const before = fs.existsSync(TABLE) ? JSON.parse(fs.readFileSync(TABLE, "utf8")) : {};
  const started = Date.now();
  const after = await measureAll();
  const moved = diff(before, after);
  console.log(moved.length ? `${moved.length} figures moved (whole package up front: ${KB(after.package.bytes)}, ${KB(after.package.gzip)} gzipped; styles.css ${KB(after.styles.bytes)}, ${KB(after.styles.gzip)} gzipped):\n${moved.join("\n")}` : "nothing moved");
  fs.writeFileSync(TABLE, `${JSON.stringify(after, null, 1)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), TABLE)}: ${Object.keys(after.exports).length} exports in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
