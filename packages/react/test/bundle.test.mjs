// An app pays only for what it imports: dist is one module per source file, and the package
// declares only its CSS as side effects. Guards the regression where Shiki's grammars (≈1 MB)
// landed in every bundle, even one importing just Button.
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, "..");

async function bundle(name) {
  const result = await esbuild.build({
    stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", write: false, metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
  });
  // files that contribute bytes; the metafile also lists ones parsed then shaken away
  const used = Object.values(result.metafile.outputs)[0].inputs;
  return { bytes: result.outputFiles[0].contents.length, inputs: Object.keys(used).filter((f) => used[f].bytesInOutput > 0) };
}

test("Button alone stays small and pulls in neither Shiki nor other Base UI parts", async () => {
  const { bytes, inputs } = await bundle("Button");
  assert.ok(bytes < 30_000, `Button bundle is ${bytes} bytes`);
  assert.ok(!inputs.some((f) => f.includes("shiki")), "Shiki is in a Button-only bundle");
  assert.ok(!inputs.some((f) => /@base-ui\/react\/esm\/(menu|dialog|select)\//.test(f)), "unrelated Base UI parts are in a Button-only bundle");
});

test("Menu does not pull in Shiki", async () => {
  const { inputs } = await bundle("Menu");
  assert.ok(!inputs.some((f) => f.includes("shiki")));
});

// Representative single imports. Each of these once dragged in a neighbouring component's
// primitives (a Popover or Tooltip from a module-scope alias, Base UI from NumberTicker's module).
for (const [name, limit] of [["Spinner", 4_000], ["Skeleton", 2_000], ["Badge", 2_000], ["Text", 4_000], ["Icon", 2_000], ["NumberTicker", 6_000], ["MorphIcon", 8_000], ["TextMorph", 8_000], ["Sparkline", 8_000]]) {
  test(`${name} alone is small and loads no Base UI`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
  });
}

// Kbd draws ⌘ ⌥ ⌃ as Phosphor's Command, Option and Control, so those three icons come with it. Nothing else:
// not the rest of Phosphor, and no Base UI.
test("Kbd alone is small and carries only the three modifier icons", async () => {
  const { bytes, inputs } = await bundle("Kbd");
  assert.ok(bytes < 10_000, `Kbd bundle is ${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /@base-ui|cmdk|@radix-ui|shiki/.test(f)), []);
  const icons = inputs.filter((f) => /@phosphor-icons\/react\/dist\/csr\//.test(f)).map((f) => path.basename(f)).sort();
  assert.deepEqual(icons, ["Command.es.js", "Control.es.js", "Option.es.js"]);
});

test("a Tooltip does not pull in Popover, and a Popover does not pull in Tooltip", async () => {
  const tooltip = await bundle("Tooltip");
  assert.ok(!tooltip.inputs.some((f) => /@base-ui\/react\/esm\/popover\//.test(f)), "Popover is in a Tooltip-only bundle");
  const popover = await bundle("Popover");
  assert.ok(!popover.inputs.some((f) => /@base-ui\/react\/esm\/tooltip\//.test(f)), "Tooltip is in a Popover-only bundle");
});

test("CommandMenu loads cmdk and Radix on first open, not with the import", async () => {
  const result = await esbuild.build({
    stdin: { contents: `import { CommandMenu } from "./dist/index.js"; console.log(CommandMenu);`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
  });
  const outputs = Object.entries(result.metafile.outputs).map(([file, output]) => ({
    file,
    third: Object.keys(output.inputs).filter((f) => output.inputs[f].bytesInOutput > 0 && /node_modules\/(cmdk|@radix-ui)\//.test(f)),
    bytes: output.bytes,
  }));
  const entry = outputs.find((o) => o.file.endsWith("stdin.js"));
  assert.deepEqual(entry.third, [], "cmdk or Radix code is in the initial bundle");
  assert.ok(entry.bytes < 100_000, `initial bundle is ${entry.bytes} bytes`);
  const lazy = outputs.filter((o) => o.third.some((f) => f.includes("cmdk")));
  assert.equal(lazy.length, 1, "cmdk arrives in one chunk of its own");
  assert.ok(lazy[0].file.includes("command-panel"), `loaded with ${lazy[0].file}`);
});

// dist is one module per source file, so loading one must do nothing: no registry, set or cache
// built at module scope, and no `var X = Primitive.Part;` alias that a bundler has to keep.
test("no module in dist builds a registry or reads a primitive's part when it loads", async () => {
  const fs = await import("node:fs");
  const dist = path.join(pkg, "dist");
  const files = [...fs.readdirSync(dist).filter((f) => f.endsWith(".js")).map((f) => path.join(dist, f)), ...fs.readdirSync(path.join(dist, "chunks")).map((f) => path.join(dist, "chunks", f))];
  assert.ok(files.length > 20);
  const offenders = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^(?:var|let|const) \w+ = (?:new (?:Map|Set|WeakMap|WeakSet)\(|Base\w+\.\w+;)/gm)) offenders.push(`${path.relative(dist, file)}: ${match[0]}`);
  }
  assert.deepEqual(offenders, []);
});
