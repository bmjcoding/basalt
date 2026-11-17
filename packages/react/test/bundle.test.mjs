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
for (const [name, limit] of [["Spinner", 2_500], ["Sparkline", 6_000], ["Skeleton", 2_500], ["Badge", 3_000], ["NumberTicker", 7_000], ["Button", 15_600], ["Kbd", 11_000], ["AmbientMark", 1_500], ["LoopsToggle", 40_000], ["LoopsToggleIcon", 20_000], ["Reflow", 8_000], ["createTravellers", 1_000], ["entranceVerdict", 2_000]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
    if (!["Button", "Kbd", "LoopsToggle", "LoopsToggleIcon"].includes(name)) assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons/.test(f)), []);
  });
}

// DECISIONS 154, the controls port: each new export alone, with splitting. Measured: TextButton 8,570, SwitchRow 24,794, SwitchRowGroup 10,977,
// OptionChips 37,699 (Base UI's radio group), LinkTabs 140,720 (it carries the Select under 720, DECISIONS 154 A15: Base UI's select and its popup), LinkTab 649, TabsPanels 519, useConfirm 399, CONFIRM_MS 185; the limits sit just above.
for (const [name, limit, baseUi] of [["TextButton", 9_200, true], ["SwitchRow", 25_500, true], ["SwitchRowGroup", 11_600, true], ["OptionChips", 38_400, true], ["LinkTabs", 141_500, true], ["LinkTab", 1_000, false], ["TabsPanels", 900, false], ["useConfirm", 800, false], ["CONFIRM_MS", 400, false]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
    if (!baseUi) assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons/.test(f)), [], `${name} loads more than it is`);
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

// The theme's state is opt-in, like the hold's: an app that never imports useTheme loads none of it. Measured:
// themeBootstrap 379, StatusLine 504, VisuallyHidden 258, useMediaQuery 260 (limits sit just above). useTheme was 1,520 bytes; knowing who wrote the root's theme (a theme the app set by hand survives
// a change of the system's scheme, DECISIONS 146 B) and writing data-theme-choice made it 1,889, with the head script in a module of its own so a bundle that imports only the hook does not carry it.
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

// The toolbar (DECISIONS 135): Base UI's toolbar and its roving focus, the direction provider, and Basalt's own controls as items, so
// the whole set weighs what its Button, Input and Link do plus the toolbar. The root alone is 23,575 bytes; every part, 53,764.
for (const [name, limit] of [["Toolbar", 25_000], ["Toolbar, ToolbarButton, ToolbarIconButton, ToolbarLink, ToolbarInput, ToolbarGroup, ToolbarSeparator", 56_000]]) {
  test(`${name.length > 10 ? "Every toolbar part" : name} stays small and loads no Shiki, cmdk or grammar (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /shiki|cmdk|@radix-ui/.test(f)), []);
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

// The charts port (DECISIONS 153): the trend helper is a few hundred bytes and does not pull the chart in; the share bar, coverage strip and marks row are plain elements and load no
// Base UI and no icon; the range meter carries Base UI's Meter and nothing else of it; the phase chart is the chart plus its lane. Measured (bytes): trailingMean 435, ShareBar 1,022,
// CoverageStrip 1,379, MarksRow 683, RangeMeter 9,454, TimeChart 46,915, PhaseChart 49,465.
for (const [name, limit] of [["trailingMean", 800], ["ShareBar", 1_500], ["CoverageStrip", 2_000], ["MarksRow", 1_200]]) {
  test(`${name} alone is small and loads no Base UI, no Phosphor and no Shiki (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
  });
}

test("RangeMeter carries Base UI's Meter and no other part, no Phosphor and no Shiki; TimeChart and PhaseChart load no Shiki or cmdk", async () => {
  const meter = await bundle("RangeMeter");
  assert.ok(meter.bytes < 12_000, `RangeMeter bundle is ${meter.bytes} bytes`);
  assert.ok(meter.inputs.some((f) => /@base-ui\/react\/(esm\/)?meter\//.test(f)), "Base UI's Meter is in");
  assert.ok(!meter.inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|progress)\//.test(f)));
  for (const [name, limit] of [["TimeChart", 50_000], ["PhaseChart", 52_000]]) {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), [], name); // the chart's key hint draws Kbd, which carries the shortcut icons: that was so before this port
  }
});

test("Terminal does not pull in Shiki, cmdk or an unrelated Base UI part", async () => {
  const { bytes, inputs } = await bundle("Terminal");
  assert.ok(bytes < 40_000, `Terminal bundle is ${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
  assert.ok(!inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|tooltip)\//.test(f)));
});

// The page's parts (DECISIONS 137) are plain elements and class names: each one alone is a few hundred bytes and loads no Base UI, no icon, no keyboard
// machinery. Measured with splitting, the whole static graph (bytes, before this change in brackets): Lead 347, PageRow 374, PageSections 380, PageSection 361,
// SectionIntro 358, SectionActions 360, Columns 399 and ColumnsItem 391 in a production build (1,146 and 849 in development, which carry the warning); Heading 933 (805) and Text 1,056 (904), which gained the two display roles and two steps.
test("Lead, PageRow, PageSections, PageSection, SectionIntro, SectionActions, Columns and ColumnsItem are each under 600 bytes alone and load nothing else; Heading and Text grew by under 200", async () => {
  for (const name of ["Lead", "PageRow", "PageSections", "PageSection", "SectionIntro", "SectionActions", "Columns", "ColumnsItem"]) {
    const { bytes, inputs } = await graph(name);
    assert.ok(bytes < 600, `${name} alone: ${bytes} bytes`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|shiki|\/dist\/(keyboard|kbd|icon|display|composition)\.js$/.test(f)), [], `${name} loads more than it is`);
  }
  for (const [name, before] of [["Heading", 805], ["Text", 904]]) {
    const { bytes } = await graph(name);
    assert.ok(bytes < before + 200, `${name} alone: ${bytes} bytes, was ${before}`);
  }
});

// The icon form of LoopsToggle is what a site's header draws on every page: it must not load the settings row's Switch (DECISIONS 143, defect F).
test("LoopsToggleIcon alone loads the icon button and the hold, and not Switch", async () => {
  const { bytes, inputs } = await graph("LoopsToggleIcon");
  assert.ok(bytes < 20_000, `${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /@base-ui\/react\/switch\//.test(f)), [], "Base UI's switch");
  const all = await graph("LoopsToggle");
  assert.ok(all.inputs.some((f) => /@base-ui\/react\/switch\//.test(f)), "LoopsToggle, which draws every form, does load Base UI's switch");
  assert.ok(all.bytes - bytes > 5_000, `the icon form is ${all.bytes - bytes} bytes lighter than the whole control`);
});

// Links and rows (DECISIONS 152). The cards, the rows and the back link are plain markup and the core arrow glyphs: no Base UI part, no Phosphor
// and no Shiki. The three that carry a button (Reveal, DirectoryList's show all, CopyButton) carry Base UI's Button and nothing else.
// Measured: LinkCard 5,174 bytes, LinkTile 4,597, BackLink 4,004, BigLinkList 391, DirectoryList 16,729, Reveal 16,328, CopyButton 15,495.
for (const [name, limit, base] of [["LinkCard", 6_500, false], ["LinkTile", 6_000, false], ["BackLink", 5_500, false], ["BigLinkList", 1_000, false], ["BigLinkRow", 6_000, false], ["DirectoryRow", 6_500, false], ["DirectoryList", 19_000, true], ["Reveal", 18_000, true], ["CopyButton", 17_500, true]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki|@phosphor-icons/.test(f)), []);
    if (!base) assert.deepEqual(inputs.filter((f) => /@base-ui/.test(f)), [], `${name} loads a Base UI part it does not use`);
    assert.deepEqual(inputs.filter((f) => /@base-ui\/react\/(menu|dialog|select|popover|tooltip|accordion|tabs)\//.test(f)), []);
  });
}
