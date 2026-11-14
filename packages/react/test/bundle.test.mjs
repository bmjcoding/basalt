// An app pays only for what it imports: dist is one module per source file, and the package
// declares only its CSS as side effects. Guards the regression where Shiki's grammars (≈1 MB)
// landed in every bundle, even one importing just Button.
import assert from "node:assert/strict";
import nodeFs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, "..");

async function bundle(name) {
  const result = await esbuild.build({
    stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name.split(", ").join(", ")});`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", write: false, metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
  });
  // files that contribute bytes; the metafile also lists ones parsed then shaken away
  const used = Object.values(result.metafile.outputs)[0].inputs;
  return { bytes: result.outputFiles[0].contents.length, inputs: Object.keys(used).filter((f) => used[f].bytesInOutput > 0) };
}

/**
 * What an app that splits its bundle loads up front for one root import: the entry and every chunk it imports
 * statically, all the way down (dynamic imports excluded, and React). The entry file alone understates it, because
 * esbuild moves code shared with a lazy entry into chunks the entry imports.
 */
async function graph(name) {
  const result = await esbuild.build({
    stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
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
  const files = [...seen];
  const inputs = [...new Set(files.flatMap((file) => Object.entries(outputs[file].inputs).filter(([, input]) => input.bytesInOutput > 0).map(([input]) => input)))];
  return { bytes: files.reduce((sum, file) => sum + outputs[file].bytes, 0), chunks: files.length, inputs, entryBytes: outputs[entry].bytes };
}

// The whole static chunk graph, under splitting, for single imports. CommandMenu's lazy panel must not drag the
// keyboard machinery, the icons or anything else into an import that never mentions it.
for (const [name, limit] of [["Spinner", 2_500], ["Sparkline", 6_000], ["Skeleton", 2_500], ["Badge", 3_000], ["NumberTicker", 7_000], ["Button", 15_000], ["Kbd", 11_000]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
    if (!["Button", "Kbd"].includes(name)) assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons/.test(f)), []);
  });
}

test("Spinner and Sparkline, with splitting, pull neither the keyboard machinery nor any icon", async () => {
  for (const name of ["Spinner", "Sparkline"]) {
    const { inputs } = await graph(name);
    const own = inputs.filter((f) => /\/dist\/(keyboard|kbd|shortcut|icon)\.js$|@phosphor-icons|\/dist\/command/.test(f));
    assert.deepEqual(own, [], `${name} loads ${own.join(", ")}`);
  }
});

// The hold's state is opt-in: an app that never imports useLoops loads none of it, whatever else it imports.
test("the hold's hook adds nothing to a bundle that does not import it, and is small on its own", async () => {
  for (const name of ["Spinner", "Badge", "Button", "Skeleton", "Progress", "Sparkline", "CommandMenu", "ToastProvider"]) {
    const { inputs } = await graph(name);
    assert.deepEqual(inputs.filter((f) => /\/dist\/loops\.js$/.test(f)), [], `${name} loads the hold's state`);
  }
  const { bytes, inputs } = await graph("useLoops");
  assert.ok(bytes < 2_500, `useLoops alone: ${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|shiki|\/dist\/(keyboard|kbd|icon|spinner|display)\.js$/.test(f)), []);
});

// The theme's state is opt-in, like the hold's: an app that never imports useTheme loads none of it. Measured: useTheme 1,520 bytes,
// themeBootstrap 296, StatusLine 504, VisuallyHidden 258, useMediaQuery 260 (limits sit just above).
test("the theme's hook adds nothing to a bundle that does not import it, and is small on its own", async () => {
  for (const name of ["Spinner", "Badge", "Button", "Popover", "Menu", "FilterResult", "CommandMenu", "ToastProvider", "useLoops"]) {
    const { inputs } = await graph(name);
    assert.deepEqual(inputs.filter((f) => /\/dist\/theme\.js$/.test(f)), [], `${name} loads the theme's state`);
  }
  for (const [name, limit] of [["useTheme", 2_000], ["themeBootstrap", 600], ["StatusLine", 1_000], ["VisuallyHidden", 600], ["useMediaQuery", 600]]) {
    const { bytes, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name} alone: ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|shiki|\/dist\/(keyboard|kbd|icon|spinner|display)\.js$/.test(f)), [], `${name} loads more than it is`);
  }
});

test("Button alone stays small and pulls in neither Shiki nor other Base UI parts", async () => {
  const { bytes, inputs } = await bundle("Button");
  assert.ok(bytes < 30_000, `Button bundle is ${bytes} bytes`);
  assert.ok(!inputs.some((f) => f.includes("shiki")), "Shiki is in a Button-only bundle");
  assert.ok(!inputs.some((f) => /@base-ui\/react\/esm\/(menu|dialog|select)\//.test(f)), "unrelated Base UI parts are in a Button-only bundle");
});

// Navigation is a module of its own so that Link, Breadcrumbs and Pagination never pay for its tooltip. Nav draws the rail's
// tooltip and so carries Base UI's Tooltip (a Tooltip alone is 108 KB, the three parts together 114 KB), and nothing else of
// Base UI, no cmdk or Shiki.
test("Nav, NavGroup and NavItem carry the shared pill and the rail's tooltip, and no popup they do not draw", async () => {
  const { bytes, inputs } = await bundle("Nav, NavGroup, NavItem");
  assert.ok(inputs.some((f) => /@base-ui\/react\/tooltip\//.test(f)), "the rail's tooltip is in");
  assert.ok(bytes < 125_000, `Nav bundle is ${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
  assert.ok(!inputs.some((f) => /@base-ui\/react\/(menu|dialog|select|popover|combobox)\//.test(f)), "an unrelated Base UI part is in a Nav-only bundle");
});

test("Breadcrumbs, Link and Pagination do not pull in the navigation, its pill or the tooltip", async () => {
  for (const name of ["Breadcrumbs", "Link", "Pagination"]) {
    const { inputs } = await bundle(name);
    assert.deepEqual(inputs.filter((f) => /\/dist\/(nav|plate|display)\.js$|@base-ui\/react\/tooltip\//.test(f)), [], `${name} loads the navigation`);
  }
});

test("Menu does not pull in Shiki", async () => {
  const { inputs } = await bundle("Menu");
  assert.ok(!inputs.some((f) => f.includes("shiki")));
});

// MorphIcon is 6,713 bytes: the morph engine (the allow-list and flight identity) and the drawing, and no glyph. It takes every glyph
// by reference (`glyph={CloseGlyph}`), so an app pays only for the glyphs it imports. When it took the 21 actions by name it carried
// all of them (9,706 bytes, limit 10,500); the limit is back at 8,000.
// Representative single imports. Each of these once dragged in a neighbouring component's
// primitives (a Popover or Tooltip from a module-scope alias, Base UI from NumberTicker's module).
for (const [name, limit] of [["Spinner", 4_000], ["Skeleton", 2_000], ["Badge", 2_000], ["Text", 4_000], ["Icon", 2_000], ["NumberTicker", 6_000], ["MorphIcon", 8_000], ["TextMorph", 8_000], ["Sparkline", 8_000]]) {
  test(`${name} alone is small and loads no Base UI`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
  });
}

// The core glyphs are modules of their own: an app that imports one bundles that glyph and the small drawing code, and
// no other glyph, no Base UI and no Phosphor. Measured: Home 2,947, Search 3,183, Close 2,838 (the drawing code is ~2.5 KB of each,
// the glyph's own numbers 0.1 to 0.6 KB); the limits sit just above.
for (const [name, limit] of [["HomeGlyph", 3_000], ["SearchGlyph", 3_250], ["CloseGlyph", 2_900]]) {
  test(`${name} alone is small, and bundles no other glyph`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
    const glyphs = inputs.filter((f) => /\/glyphs\/[^/]+\.js$|chunk-/.test(f) && !/glyph\.js$/.test(f));
    assert.ok(glyphs.length <= 2, `${name} pulls ${glyphs.join(", ")}`);
  });
}

test("MorphIcon alone carries the engine and no glyph; Stepper carries the three it draws, and Button's new-tab arrow", async () => {
  // which glyphs' drawings a bundle holds: each glyph module declares `name: "…"` once (a chunk may hold a glyph module, so read the text)
  const glyphsIn = async (name) => {
    const out = await esbuild.build({
      stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
      bundle: true, minify: false, format: "esm", write: false, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
    });
    return [...out.outputFiles[0].text.matchAll(/^\s+name: "([a-z-]+)",$/gm)].map((m) => m[1]).sort();
  };
  assert.deepEqual(await glyphsIn("MorphIcon"), [], "MorphIcon carries a glyph of its own");
  // Stepper wraps Button, and Button draws the new-tab arrow (`external`) for a link that opens one (DECISIONS 95), so it comes with it.
  assert.deepEqual(await glyphsIn("Stepper"), ["check", "chevron-left", "chevron-right", "external"]);
});

test("an imported glyph that is never used costs nothing", async () => {
  const result = await esbuild.build({
    stdin: { contents: `import { HomeGlyph, SearchGlyph } from "./dist/index.js"; console.log(1);`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", write: false, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
  });
  assert.ok(result.outputFiles[0].contents.length < 100, `${result.outputFiles[0].contents.length} bytes for glyphs nobody draws`);
});

test("one glyph's bundle holds that glyph's drawing and not another's", async () => {
  const out = await esbuild.build({
    stdin: { contents: `import { HomeGlyph } from "./dist/index.js"; console.log(HomeGlyph);`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: false, format: "esm", write: false, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
  });
  const text = out.outputFiles[0].text;
  assert.match(text, /name: "home"/);
  for (const other of ["search", "notifications", "calendar", "sandboxes"]) assert.ok(!text.includes(`name: "${other}"`), `${other} is in a Home-only bundle`);
});

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
  // not only the entry file: every chunk it imports up front
  const initial = await graph("CommandMenu");
  assert.deepEqual(initial.inputs.filter((f) => /node_modules\/(cmdk|@radix-ui)\//.test(f)), [], "cmdk or Radix code is in the initial static graph");
  assert.ok(initial.bytes < 100_000, `initial static graph is ${initial.bytes} bytes in ${initial.chunks} chunks`);
  const lazy = outputs.filter((o) => o.third.some((f) => f.includes("cmdk")));
  assert.equal(lazy.length, 1, "cmdk arrives in one chunk of its own");
  assert.ok(lazy[0].file.includes("command-panel"), `loaded with ${lazy[0].file}`);
});

// dist is one module per source file, so loading one must do nothing: no registry, set or cache
// built at module scope, and no `var X = Primitive.Part;` alias that a bundler has to keep.
test("no module in dist builds a registry or reads a primitive's part when it loads", async () => {
  const fs = await import("node:fs");
  const dist = path.join(pkg, "dist");
  const files = fs.readdirSync(dist).filter((f) => f.endsWith(".js")).map((f) => path.join(dist, f));
  assert.ok(files.length > 20);
  const offenders = [];
  for (const file of files) {
    // command-panel.js is the lazy module: it loads on first open, and its Maps are Phosphor's icon tables, bundled in
    if (path.basename(file) === "command-panel.js") continue;
    const source = fs.readFileSync(file, "utf8");
    // `var x = /* @__PURE__ */ new Set()` is still an allocation at load
    for (const match of source.matchAll(/^(?:var|let|const) \w+ = (?:\/\*.*?\*\/ )?(?:new (?:Map|Set|WeakMap|WeakSet|Intl\.\w+|RegExp)\(|Base\w+\.\w+;)/gm)) offenders.push(`${path.relative(dist, file)}: ${match[0]}`);
  }
  assert.deepEqual(offenders, []);
});

// The regex above is a net; this is the behaviour. Loading a module allocates no Set, Map, WeakMap, WeakSet or Intl
// formatter. React is loaded first, so only our own modules are counted.
test("importing the keyboard, motion, sparkline and ticker modules allocates no registry or formatter", async () => {
  const { execFileSync } = await import("node:child_process");
  const script = `
    import { pathToFileURL } from "node:url";
    await import("react"); await import("react/jsx-runtime");
    const counts = {};
    const count = (key, Base) => class extends Base { constructor(...args) { super(...args); counts[key] = (counts[key] ?? 0) + 1; } };
    for (const key of ["Set", "Map", "WeakMap", "WeakSet"]) globalThis[key] = count(key, globalThis[key]);
    for (const key of ["NumberFormat", "DateTimeFormat"]) Intl[key] = count("Intl." + key, Intl[key]);
    const dist = process.argv[1];
    const modules = ["keyboard", "shortcut", "motion", "number-ticker", "sparkline", "spinner", "loops", "status-size", "utils"];
    for (const name of modules) await import(pathToFileURL(dist + "/" + name + ".js"));
    console.log(JSON.stringify(counts));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script, path.join(pkg, "dist")], { encoding: "utf8", cwd: pkg });
  assert.deepEqual(JSON.parse(out.trim().split("\n").at(-1)), {});
});

// A relative specifier that points nowhere is the quietest way to ship a broken package: the module loads, and the lazy
// import 404s on first use. Every relative import in dist, static or dynamic, names a file that exists.
test("every relative import in dist resolves to a file in dist", async () => {
  const fs = await import("node:fs");
  const dist = path.join(pkg, "dist");
  const missing = [];
  for (const name of fs.readdirSync(dist).filter((f) => f.endsWith(".js"))) {
    const source = fs.readFileSync(path.join(dist, name), "utf8");
    for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|^import\s*)"(\.\.?\/[^"]+)"/gm)) {
      if (!fs.existsSync(path.resolve(dist, match[1]))) missing.push(`${name}: ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
  assert.ok(fs.readdirSync(dist).some((f) => /^command-panel\.js$/.test(f)));
});

// Phosphor's MIT licence requires its copyright and permission notice with every copy. command-panel.js inlines four of its
// icons, so it carries the whole notice as a legal comment (/*!), which a consumer's minifier keeps.
test("command-panel.js keeps Phosphor's full MIT notice as a preserved legal comment, even through a minifier", async () => {
  const mit = nodeFs.readFileSync(path.join(pkg, "..", "..", "node_modules", "@phosphor-icons", "react", "LICENSE"), "utf8").trim();
  const source = nodeFs.readFileSync(path.join(pkg, "dist", "command-panel.js"), "utf8");
  assert.ok(source.includes(mit), "the whole licence text is in the file");
  assert.match(source, /\/\*! Bundles four icons from @phosphor-icons\/react/);
  const minified = await esbuild.transform(source, { minify: true, format: "esm", loader: "js", legalComments: "inline" });
  assert.ok(minified.code.includes(mit), "and survives minification");
});

// Toast is in the default bundle (an app mounts the provider once, near its root), so it is kept lean. Base UI's toast is 77,043 bytes
// by itself with the old Toast around it; the marks (three Phosphor icons), braille, the controller (queue, grouping, timers, the
// announcer) and the running state bring it to about 91,000. The limits sit just above what is measured. NotificationCentre was 140,000
// before DECISIONS 103 (F2) gave it the hover glide: the plate's script (plate.tsx, shared with Menu and navigation) is about 2,500 bytes,
// so its limit is 146,000.
for (const [name, limit] of [["ToastProvider", 93_000], ["useToast", 4_000], ["NotificationCentre", 146_000]]) {
  test(`${name} alone stays lean and loads no Shiki, cmdk or grammar`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /shiki|cmdk/.test(f)), []);
  });
}

// The figures (decision 94): the description list and the stat are plain markup; the meter carries Base UI's Meter and nothing
// else of it; the terminal carries a Button, an Icon and the braille spinner, and never Shiki or cmdk.
for (const [name, limit] of [["DescriptionList, DescriptionItem", 1_500], ["Stats, Stat", 3_500]]) {
  test(`${name} alone is small and loads no Base UI, no Phosphor and no Shiki`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
  });
}

test("Meter carries Base UI's Meter and no other part, no Phosphor and no Shiki", async () => {
  const { bytes, inputs } = await bundle("Meter");
  assert.ok(bytes < 14_000, `Meter bundle is ${bytes} bytes`);
  assert.ok(inputs.some((f) => /@base-ui\/react\/(esm\/)?meter\//.test(f)), "Base UI's Meter is in");
  assert.deepEqual(inputs.filter((f) => /@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
  assert.ok(!inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|progress)\//.test(f)), "an unrelated Base UI part is in a Meter-only bundle");
});

test("Terminal does not pull in Shiki, cmdk or an unrelated Base UI part", async () => {
  const { bytes, inputs } = await bundle("Terminal");
  assert.ok(bytes < 40_000, `Terminal bundle is ${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
  assert.ok(!inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|tooltip)\//.test(f)));
});
