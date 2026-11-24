// An app pays only for what it imports: dist is one module per source file, and the package
// declares only its CSS as side effects. Guards the regression where Shiki's grammars (≈1 MB)
// landed in every bundle, even one importing just Button.
import assert from "node:assert/strict";
import nodeFs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

import { MARGIN, TABLE, measureExport, measurePackage, measureStyles, runtimeExports } from "./export-sizes.mjs";

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

/**
 * What an app fetches after its first paint for one import under splitting: every file reached only by a dynamic import (the glyph engine's file, and for
 * a CodeBlock the grammars), counted once, with the files it shares with the static graph left out. `names` is the import list.
 */
async function lazyGraph(names, extra = "") {
  const result = await esbuild.build({
    stdin: { contents: `import { ${names} } from "./dist/index.js"; console.log(${names}); ${extra}`, resolveDir: pkg, loader: "js" },
    bundle: true, minify: true, format: "esm", splitting: true, outdir: path.join(pkg, ".bundle-check"), write: false, metafile: true,
    external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
  });
  const outputs = result.metafile.outputs;
  const entry = Object.keys(outputs).find((file) => outputs[file].entryPoint === "<stdin>");
  const seen = new Set();
  const visit = (file) => { if (seen.has(file)) return; seen.add(file); for (const imported of outputs[file].imports) if (!imported.external && imported.kind !== "dynamic-import") visit(imported.path); };
  visit(entry);
  const lazy = new Set();
  const visitLazy = (file) => { if (seen.has(file) || lazy.has(file)) return; lazy.add(file); for (const imported of outputs[file].imports) if (!imported.external) visitLazy(imported.path); };
  for (const file of seen) for (const imported of outputs[file].imports) if (imported.kind === "dynamic-import" && !imported.external) visitLazy(imported.path);
  const engine = [...lazy].filter((file) => Object.keys(outputs[file].inputs).some((input) => /glyph-flight/.test(input)));
  return { bytes: engine.reduce((sum, file) => sum + outputs[file].bytes, 0), files: engine.length };
}

// DECISIONS 260 (busy controls, under DECISIONS 246: a raise a decided feature needs is allowed, and said with its numbers): every Button, IconButton and TextButton now waits for a
// promise from its handler, so the wait (wait.ts: the 300/400ms mark, the press guard, the form's wait and the joined ref, 1,119 bytes minified after a trim from 1,266) is in each one's static
// graph. Measured after the trim, each limit the measurement rounded up to the next 50: Button 17,379 (16,150 to 17,400), CopyButton 18,292 (to 18,300), DirectoryList 19,739 (to 19,750),
// Drawer 17,928 (to 17,950), NotificationCentre 147,283 (to 147,300), PeriodStepper 17,671 (to 17,700), Reveal 19,335 (to 19,350), TextButton 10,291 (9,200 to 10,300), the toolbar set
// 58,309 (to 58,350). Review fix (Astra): a handler on the element given as `render` is taken into the press (takeClick, about 250 bytes), so each rose again:
// Button 17,631 (to 17,650), CopyButton 18,545 (18,550), DirectoryList 19,991 (20,000), Drawer 18,180 (18,200), NotificationCentre 147,581 (147,600), PeriodStepper 17,923
// (17,950), Reveal 19,587 (19,600), TextButton 10,555 (10,600), the toolbar set 58,604 (58,650).
// DECISIONS 221 (the owner: "size limits can be raised yes"): Button 15,600 to 16,150 and Reveal 18,000 to 18,100 (here), the toolbar set 56,050 to 56,350, Terminal 26,600 to 27,000, Pagination
// 21,600 to 21,750 and NotificationCentre 141,850 to 142,150 with the plugin (below and icons.test.mjs): the controls now draw a core glyph through the morph, and the part every control carries
// (control-icon.tsx, about 780 bytes in Button) is in each one's static graph; the engine itself is lazy, with its own limit. Measured: Button 16,119, Reveal 18,076, the toolbar set 56,336,
// Terminal 26,956, Pagination 21,719, NotificationCentre 142,101; each limit is the measurement rounded up to the next 50.
// The whole static chunk graph, under splitting, for single imports. CommandMenu's lazy panel must not drag the
// keyboard machinery, the icons or anything else into an import that never mentions it.
// DECISIONS 326: a text toggle's seat holds its glyph and hands over to the check (button.tsx), about 185 bytes on every Button: Button 17,835 (17,650 to 17,850), Drawer 18,384 (18,200 to 18,400).
for (const [name, limit] of [["Spinner", 2_500], ["Sparkline", 6_000], ["Skeleton", 2_500], ["Badge", 3_000], ["NumberTicker", 7_000], ["Button", 17_850], ["Kbd", 11_000], ["AmbientMark", 1_500], ["LoopsToggle", 40_000], ["LoopsToggleIcon", 20_000], ["Reflow", 8_000], ["createTravellers", 1_000], ["entranceVerdict", 2_000], ["Listbox", 3_400], ["OpenList", 2_500], ["NoticeBar", 2_000], ["SearchTrigger", 5_500], ["SearchResult", 2_000], ["Drawer", 18_400]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
    if (!["Button", "Kbd", "LoopsToggle", "LoopsToggleIcon", "Drawer"].includes(name)) assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons/.test(f)), []);
  });
}

// The overlays and search batch (DECISIONS 155). A sheet's head and the search dialog are Base UI's dialog plus a Button for the close, and nothing else:
// no cmdk (the command panel is the one lazy module), no Phosphor, and the listbox, the opening list, the notice bar and the trigger load no Base UI at all.
// cimip-gaps-2 B5 (DECISIONS 246: trim first, then the raise a feature needs): every modal lays itself out above an on-screen keyboard (the shared
// watcher, screen-keyboard.ts, trimmed to about 2.4 KB), so SearchDialog rose from about 87,300 to 88,162; merged with main (5ad5345a), whose own
// changes added about 490 bytes, it measures 88,683, so its limit is 88,700.
for (const [name, limit] of [["SheetHeader", 82_000], ["SearchDialog", 88_700]]) {
  test(`${name} alone, with splitting, loads Base UI's dialog and the close button and no command panel (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki|\/dist\/command/.test(f)), []);
  });
}

// DECISIONS 154, the controls port: each new export alone, with splitting. Measured: TextButton 8,570, SwitchRow 24,794, SwitchRowGroup 10,977,
// OptionChips 37,699 (Base UI's radio group), LinkTabs 140,720 (it carries the Select under 720, DECISIONS 154 A15: Base UI's select and its popup), LinkTab 649 (3,898 once its label takes ChosenLabel, the selected state a Tab's children take: join 2 in integration-nov15b, DECISIONS 138 A, 145, 149; the limit is the measured bytes rounded up to the next 50), TabsPanels 519, useConfirm 399, CONFIRM_MS 185; the limits sit just above.
// cimip-gaps-2 B6 (DECISIONS 246: trim first, then a raise the feature needs): LinkTabs carries the Select, and `Select toolbar` (the unseen labels that hold its width) adds 212 bytes
// after a 67-byte trim (no attribute, no class on the labels): measured 141,669, from main's 141,457, so the limit goes from 141,500 to 141,700.
for (const [name, limit, baseUi] of [["TextButton", 11_450, true], ["SwitchRow", 25_500, true], ["SwitchRowGroup", 11_600, true], ["OptionChips", 38_400, true], ["LinkTabs", 141_700, true], ["LinkTab", 3_900, false], ["TabsPanels", 900, false], ["useConfirm", 800, false], ["CONFIRM_MS", 400, false]]) {
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
    // The release notes' Sources popup and the rail's tooltip are lazy too, with Base UI inlined so they share no chunk (build.mjs): its module-level
    // tables are Base UI's own, and load only when a reader first reaches for a source line, or a rail shows a version.
    if (["release-sources.js", "rail-tooltip.js"].includes(path.basename(file))) continue;
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
// so its limit is 146,000; 147,700 since DECISIONS 268 kept popovers below their opener (an 18-byte default); 147,900 for Clear all (DECISIONS 269, 98 bytes).
// cimip-gaps-2, B7 (DECISIONS 265, the rise accepted under DECISIONS 246): the pending ring (Phosphor's Circle), a group's disclosure chevron (core
// chevron-right and chevron-down), the reveal's track, the lifted errors and the shared Clear all take NotificationCentre's static graph to 152,538
// (the limit 147,900 to 152,550).
// cimip-gaps-2 B5 (DECISIONS 246, 274): the stack stands above an on-screen keyboard (the shared watcher), closes toasts that echoed a page on a
// page change, and swipes upward under 720 where it hangs from the bar; ToastProvider measures 93,451, so its limit is 93,500.
// The full-run fix (DECISIONS 246): a control that is not disabled no longer writes aria-disabled="false" (a toolbar passes its own false through), 4
// bytes in Button and IconButton: NotificationCentre 152,550 measured, so its limit is 152,600.
// DECISIONS 326: a text toggle's seat holds its glyph and hands over to the check (button.tsx), about 185 bytes on every Button: NotificationCentre 152,753 (152,600 to 152,800).
for (const [name, limit] of [["ToastProvider", 93_500], ["useToast", 4_000], ["NotificationCentre", 152_800]]) {
  test(`${name} alone stays lean and loads no Shiki, cmdk or grammar`, async () => {
    // The static graph under splitting: what loads first. A control's glyph engine loads on demand and is not in it (and has a limit of its own, below).
    const { bytes, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /shiki|cmdk/.test(f)), []);
  });
}

// The toolbar (DECISIONS 135): Base UI's toolbar and its roving focus, the direction provider, and Basalt's own controls as items, so
// the whole set weighs what its Button, Input and Link do plus the toolbar. The root alone is 23,575 bytes; every part, 53,764. Combined in integration-nov15b: the controls batch's Button (DECISIONS 154) and the links batch's Link arrow (DECISIONS 152) both ride in the set, which measures 56,008, over the 56,000 each side kept, so the limit was 56,050 (the measured bytes rounded up to the next 50); DECISIONS 221 raised it to 56,350 for the glyph morphs' shell in Button and IconButton.
// DECISIONS 326: a text toggle's seat holds its glyph and hands over to the check (button.tsx), about 185 bytes on every Button: the toolbar parts 58,803 (58,650 to 58,850).
for (const [name, limit] of [["Toolbar", 25_000], ["Toolbar, ToolbarButton, ToolbarIconButton, ToolbarLink, ToolbarInput, ToolbarGroup, ToolbarSeparator", 58_850]]) {
  test(`${name.length > 10 ? "Every toolbar part" : name} stays small and loads no Shiki, cmdk or grammar (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await graph(name);
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

// The panels, art and parts (DECISIONS 162): the app tile, the captioned columns and the table call are plain markup, so they load no Base UI, no Phosphor and no Shiki;
// the period stepper is two IconButtons, a status line and the core chevrons, so it carries a Button and nothing else of Base UI.
for (const [name, limit, plain] of [["AppTile", 1_500, true], ["CaptionedColumns, CaptionedColumn", 1_000, true], ["TableCall", 800, true], ["PeriodStepper", 17_950, false]]) {
  test(`${name} alone is small and loads no Shiki or cmdk${plain ? ", no Base UI and no Phosphor" : ""} (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
    if (plain) assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons/.test(f)), []);
    else assert.ok(!inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|progress|meter)\//.test(f)), "an unrelated Base UI part is in a PeriodStepper-only bundle");
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
// CoverageStrip 1,379, MarksRow 683, RangeMeter 9,454, TimeChart 46,915, PhaseChart 49,465. The short bar plot (`compact`, DECISIONS 160) added 120 bytes to TimeChart (46,973 to 47,093); PhaseChart is 49,643.
for (const [name, limit] of [["trailingMean", 800], ["ShareBar", 1_500], ["CoverageStrip", 2_000], ["MarksRow", 1_200]]) {
  test(`${name} alone is small and loads no Base UI, no Phosphor and no Shiki (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await bundle(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|@phosphor-icons|cmdk|@radix-ui|shiki/.test(f)), []);
  });
}

// The allowance was 400 and rose to 600 in the wording audit's batch (W3: the hidden space in the headline and the legend, W8's `DateAge` separator): TimeChart measures 47,541, 568 over, rounded up to the next 50.
// It rose to 1,050 with one Mod key across platforms (DECISIONS 244, the owner's word on the size, 246): TimeChart's chips carry the platform rule, 48,001, 1,028 over, rounded up to the next 50.
test("the short bar plot's `compact` prop, the wording audit's word boundaries and the platform rule add under 1,050 bytes to TimeChart (it was 46,973 before the prop)", async () => {
  const { bytes } = await bundle("TimeChart");
  assert.ok(bytes < 46_973 + 1_050, `TimeChart bundle is ${bytes} bytes; the prop, the boundaries and the platform rule may add 1,050`);
});

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
  const { bytes, inputs } = await graph("Terminal");
  // Stages and runs (DECISIONS 316): stage lines, RunTimer and the Prohibit mark took it from about 32,300 to 40,670 (40,000 to 40,700); reported on the PR.
  // The review round of 316: the failed outcome and the command that never steps back, and RunTimer's print and redraw guards: 41,435 (to 41,450).
  // DECISIONS 326: the head's copy button and the glyph seat every Button carries: 41,627 (to 41,650).
  assert.ok(bytes < 41_650, `Terminal bundle is ${bytes} bytes`);
  assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki/.test(f)), []);
  assert.ok(!inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|tooltip)\//.test(f)));
});

// The glyph engine (src/glyph-flight.tsx) is the one lazy module a control loads: its own file, which carries its own copy of the glyph drawing and the
// engine, so that no other module is re-split for it. What an app fetches for it, once, after its first paint: measured 7,568 bytes minified (3.4 KB gzipped); DECISIONS 221
// alone; the limit is that rounded up to the next 50. An app that also uses MorphIcon fetches the same file (the overlap is lazy bytes, never up front).
const ENGINE_LIMIT = 7_600;
for (const [label, names] of [["a toggle", "Button"], ["a done seat", "IconButton"], ["navigation", "NavItem, TabBarItem"], ["the copy buttons", "CodeBlock, Terminal"], ["an app that already uses MorphIcon", "Button, IconButton, CopyGlyph, CheckGlyph, MorphIcon"]]) {
  test(`the glyph engine is one lazy file of at most ${ENGINE_LIMIT} bytes that an eager control fetches: ${label}`, async () => {
    const { bytes, files } = await lazyGraph(names);
    assert.equal(files, 1, "one file, and no second engine");
    assert.ok(bytes > 6_000 && bytes <= ENGINE_LIMIT, `the engine is ${bytes} bytes (limit ${ENGINE_LIMIT})`);
  });
}

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
// cimip-gaps-2, B7: `useReveal` takes `focusFirst` (a group's entries follow its row, so a keyboard open keeps focus there), 6 and 8 bytes: Reveal
// 19,600 to 19,650 (19,606 measured) and DirectoryList 20,000 to 20,050 (20,008). The full-run fix (no aria-disabled="false" on a control that is
// not disabled, DECISIONS 246): CopyButton 18,551 measured, 18,550 to 18,600.
// DECISIONS 326: a text toggle's seat holds its glyph and hands over to the check (button.tsx), about 185 bytes on every Button: DirectoryList 20,212 (20,050 to 20,250), Reveal 19,810 (19,650 to 19,850), CopyButton 18,749 (18,600 to 18,800).
for (const [name, limit, base] of [["LinkCard", 6_500, false], ["LinkTile", 6_000, false], ["BackLink", 5_500, false], ["BigLinkList", 1_000, false], ["BigLinkRow", 6_000, false], ["DirectoryRow", 6_500, false], ["DirectoryList", 20_250, true], ["Reveal", 19_850, true], ["CopyButton", 18_800, true]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /cmdk|@radix-ui|shiki|@phosphor-icons/.test(f)), []);
    if (!base) assert.deepEqual(inputs.filter((f) => /@base-ui/.test(f)), [], `${name} loads a Base UI part it does not use`);
    assert.deepEqual(inputs.filter((f) => /@base-ui\/react\/(menu|dialog|select|popover|tooltip|accordion|tabs)\//.test(f)), []);
  });
}

// What every export costs, held to a recorded table (A1-16). `test/export-sizes.json` has the minified size of each runtime export alone, of the
// whole package up front (the entry and every chunk it imports statically) and of `styles.css`, minified and gzipped, as `npm run sizes -w
// packages/react` measured them; each may grow by 5% and no more. A rise is a decision: run the script, read the diff it prints (what moved, in
// bytes and per cent), and commit the new table with the change that explains it. The limits above stay as they were: where one is tighter than
// the table's rule it still guards, and where it is looser the table does.
const recorded = () => JSON.parse(nodeFs.readFileSync(TABLE, "utf8"));
const ceiling = (bytes) => Math.ceil(bytes * (1 + MARGIN));
const ADVICE = "run `npm run sizes -w packages/react`, read the diff it prints, and commit the new table with the change that explains it";

test("the size table names every runtime export of the package, and nothing that is not one", async () => {
  const table = Object.keys(recorded().exports).sort();
  const exported = await runtimeExports();
  assert.deepEqual(exported.filter((name) => !table.includes(name)), [], `exports with no recorded size: ${ADVICE}`);
  assert.deepEqual(table.filter((name) => !exported.includes(name)), [], `recorded sizes for exports that are gone: ${ADVICE}`);
});

// One build per export, four at a time: 19 seconds alone, but past the runner's two-minute limit when every test file runs beside it (the first full run
// after the cimip-gaps-2 stream timed out at 120 s), so it has a limit of its own.
test("every runtime export alone stays within 5% of its recorded minified size", { timeout: 600_000 }, async () => {
  const { exports } = recorded();
  const names = Object.keys(exports);
  const over = [];
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let i = next++; i < names.length; i = next++) {
      const { bytes } = await measureExport(names[i]);
      if (bytes > ceiling(exports[names[i]])) over.push(`${names[i]}: ${bytes} bytes against ${exports[names[i]]} recorded (limit ${ceiling(exports[names[i]])})`);
    }
  }));
  assert.deepEqual(over.sort(), [], `an export grew past its recorded size: ${ADVICE}`);
});

test("the whole package up front and styles.css, minified and gzipped, stay within 5% of their recorded sizes", async () => {
  const table = recorded();
  const whole = await measurePackage();
  const styles = measureStyles();
  for (const [label, now, was] of [["the whole package, minified", whole.bytes, table.package.bytes], ["the whole package, gzipped", whole.gzip, table.package.gzip], ["styles.css as shipped", styles.bytes, table.styles.bytes], ["styles.css, gzipped", styles.gzip, table.styles.gzip]]) {
    assert.ok(now <= ceiling(was), `${label}: ${now} bytes against ${was} recorded (limit ${ceiling(was)}); ${ADVICE}`);
  }
  // The style sheets ship minified: no comment is left in them (a /*! legal comment would be the one kept).
  assert.ok(!/\/\*(?!!)/.test(nodeFs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")), "styles.css still holds a comment");
  assert.ok(!/\/\*(?!!)/.test(nodeFs.readFileSync(path.join(pkg, "dist", "components.css"), "utf8")), "components.css still holds a comment");
});

// Loading a module does nothing, for every file in dist (the lazy command panel apart: it loads on first open, and the Maps it builds are Phosphor's icon
// tables, bundled in; and the two head scripts, dist/head/theme.js and dist/head/loops.js, by name, which are not modules: each is a classic script that runs in a document's head, and reads the page's
// storage as it loads, which is what it is for; test/content-policy.test.mjs runs them in a page). Each file is imported in turn in one process, chunks first, with React loaded beforehand; a Set, Map, WeakMap, WeakSet or Intl
// formatter that the file itself allocates while it loads (the frame that called `new` is in this package's dist) is counted against it, and so is any throw.
test("importing every file in dist allocates no registry or formatter, reads no browser global, and throws nothing", async () => {
  const { execFileSync } = await import("node:child_process");
  const dist = path.join(pkg, "dist");
  const files = nodeFs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".js") && !["command-panel.js", "release-sources.js", "rail-tooltip.js"].includes(path.basename(f)) && !["head/theme.js", "head/loops.js"].includes(f.split(path.sep).join("/"))).sort((a, b) => Number(path.basename(b).startsWith("chunk-")) - Number(path.basename(a).startsWith("chunk-")) || a.localeCompare(b));
  assert.ok(files.length > 200, `${files.length} files in dist`);
  const script = `
    import { pathToFileURL } from "node:url";
    await import("react"); await import("react/jsx-runtime");
    let current = "";
    const offenders = [];
    const count = (key, Base) => class extends Base { constructor(...args) { super(...args); if ((new Error().stack.split("\\n")[2] ?? "").includes(dist + "/")) offenders.push(current + ": new " + key); } };
    for (const key of ["Set", "Map", "WeakMap", "WeakSet"]) globalThis[key] = count(key, globalThis[key]);
    for (const key of ["NumberFormat", "DateTimeFormat"]) Intl[key] = count("Intl." + key, Intl[key]);
    const [dist, ...files] = process.argv.slice(1);
    for (const file of files) {
      current = file;
      try { await import(pathToFileURL(dist + "/" + file).href); } catch (error) { offenders.push(file + ": threw " + error.message); }
    }
    console.log(JSON.stringify(offenders));
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script, dist, ...files], { encoding: "utf8", cwd: pkg, maxBuffer: 1 << 24 });
  assert.deepEqual(JSON.parse(out.trim().split("\n").at(-1)), []);
});

// First-load chunking (DECISIONS 265, batch B0). An app that splits its bundle draws its shell up front and its forms and popups in a route it loads later, and
// imports everything from the root. esbuild places a module by which entries reach it before tree shaking, and every `export … from` in the root is a path, so
// without the imports plugin the route's modules ride in a chunk the first screen loads (measured: 341 KB up front, Base UI's combobox, select and menu in it).
// With the plugin the first screen loads exactly what it would if each import named its own module. The limit is the measurement (160,341 bytes) rounded up to the next 1,000.
async function firstScreen({ plugin, entry = "shell.jsx" } = {}) {
  const { basaltImportsEsbuild } = await import(path.join(pkg, "dist", "tooling", "imports.js"));
  const result = await esbuild.build({
    absWorkingDir: path.join(here, "fixtures", "split-app"), entryPoints: [entry],
    outdir: path.join(pkg, ".bundle-check"), bundle: true, minify: true, format: "esm", splitting: true, write: false, metafile: true, jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' }, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
    plugins: plugin ? [basaltImportsEsbuild()] : [],
  });
  const outputs = result.metafile.outputs;
  const start = Object.keys(outputs).find((file) => outputs[file].entryPoint === entry);
  const seen = new Set();
  const visit = (file) => { if (seen.has(file)) return; seen.add(file); for (const imported of outputs[file].imports) if (!imported.external && imported.kind !== "dynamic-import") visit(imported.path); };
  visit(start);
  // What contributes bytes, from the package and its dependencies (the app's own file and the plugin's small barrels left out).
  const inputs = [...new Set([...seen].flatMap((file) => Object.entries(outputs[file].inputs).filter(([input, { bytesInOutput }]) => bytesInOutput > 0 && /\/dist\/|node_modules/.test(input)).map(([input]) => input)))].sort();
  const later = [...new Set(Object.keys(outputs).filter((file) => !seen.has(file)).flatMap((file) => Object.keys(outputs[file].inputs)))];
  return { bytes: [...seen].reduce((sum, file) => sum + outputs[file].bytes, 0), inputs, later };
}

test("a split app's first screen, through the imports plugin, loads what it would if each import named its own module, and none of a later route's", async () => {
  const through = await firstScreen({ plugin: true });
  const direct = await firstScreen({ entry: "shell-direct.jsx" });
  assert.deepEqual(through.inputs, direct.inputs, "the same files up front as imports that name each module");
  const route = through.inputs.filter((f) => /@base-ui\/react\/(esm\/)?(combobox|select|menu|dialog|field|input)\//.test(f));
  assert.deepEqual(route, [], "none of the route's popups and fields are up front");
  assert.ok(through.inputs.some((f) => /@base-ui\/react\/(esm\/)?tooltip\//.test(f)), "the rail's tooltip, which Nav draws, is");
  // After the cimip-gaps-2 stream (DECISIONS 246): the shell now draws B5's phone layout (the on-screen keyboard's watcher, screen-keyboard.ts, 2,441
  // bytes, and what is pinned, pinned-edges.ts, 2,107) and B4's facts under the title (DotLine, 532) and capped shell (app-shell.js 1,340 to 1,812), with
  // Nav's sm size (135). Measured 166,056 bytes through the plugin (160,165 to 165,860 for the same files named directly); the limit is that rounded
  // up to the next 1,000, from 161,000.
  assert.ok(through.bytes < 167_000, `first screen ${through.bytes} bytes (limit 167,000)`);
});

test("the imports plugin changes where code lands, not what the route gets: the route still loads every part it draws", async () => {
  const { later } = await firstScreen({ plugin: true });
  for (const part of ["combobox", "select", "menu", "dialog", "field"]) assert.ok(later.some((f) => new RegExp(`@base-ui/react/(esm/)?${part}/`).test(f)), `Base UI's ${part} loads with the route`);
});

test("the imports plugin's map holds every name the root exports at run time, each from a module that exports it", async () => {
  const { rootMap } = await import(path.join(pkg, "dist", "tooling", "imports.js"));
  const map = rootMap();
  const exported = await runtimeExports();
  assert.deepEqual([...map.keys()].sort(), exported);
  const modules = new Map();
  for (const [name, { module, local }] of map) {
    modules.set(module, modules.get(module) ?? await import(path.join(pkg, "dist", module)));
    assert.ok(local in modules.get(module), `${name}: ${module} exports ${local}`);
  }
});

test("the plugin reads a file's imports from the root by esbuild's parser, and takes the whole root for a form it cannot place", async () => {
  const { readRootImports } = await import(path.join(pkg, "dist", "tooling", "imports.js"));
  const cases = [
    ["semicolon-free.ts", 'export type Local = { id: string }\nimport { Button } from "@srasyndicate/basalt"\nexport const x: Local = { id: String(Button) }\n', ["Button"]],
    ["comment.js", '// import { Menu } from "@srasyndicate/basalt";\n/* import { Dialog } from "@srasyndicate/basalt" */\nimport { Button } from "@srasyndicate/basalt";\nconsole.log(Button);\n', ["Button"]],
    ["default.js", 'import Default, { A } from "@srasyndicate/basalt";\nconsole.log(Default, A);\n', null],
    ["typed.ts", 'import { type A, B } from "@srasyndicate/basalt";\nexport const y: A = B;\n', ["B"]],
    ["reexport.js", 'export { A as B } from "@srasyndicate/basalt";\n', ["A"]],
    ["multi-line.tsx", "import {\n  Button,\n  // a comment\n  Menu as M,\n} from '@srasyndicate/basalt'\nexport const C = () => <M><Button>Don't</Button></M>\n", ["Button", "Menu"]],
    ["type-only.ts", 'import type { MenuProps } from "@srasyndicate/basalt";\nimport { Spinner } from "@srasyndicate/basalt/other";\nexport const p: MenuProps | null = null; console.log(Spinner);\n', []],
    ["template.js", 'import { Button } from "@srasyndicate/basalt";\nconst s = `import { Menu } from "@srasyndicate/basalt"`;\nconsole.log(Button, s);\n', null],
    ["dynamic.js", 'import { Button } from "@srasyndicate/basalt";\nconst later = () => import("@srasyndicate/basalt");\nconsole.log(Button, later);\n', ["Button"]],
    ["namespace.js", 'import * as B from "@srasyndicate/basalt";\nconsole.log(B);\n', null],
    ["star.js", 'export * from "@srasyndicate/basalt";\n', null],
    ["jsx-in-plain.js", 'import { Button } from "@srasyndicate/basalt";\nexport const C = () => <Button />;\n', null],
  ];
  for (const [file, source, expected] of cases) assert.deepEqual(await readRootImports(source, file, esbuild.transform), expected, file);
  // The build's own loader for an extension is the one used: JSX in a .js file is read when the build says so.
  assert.deepEqual(await readRootImports(cases.at(-1)[1], "jsx-in-plain.js", esbuild.transform, { ".js": "jsx" }), ["Button"]);
});

// A dependency with its own nested copy of the package keeps it: the plugin rewrites only an import that resolves to the root beside it.
test("the imports plugin never rewrites a file that resolves another copy of Basalt", async () => {
  const { basaltImportsEsbuild } = await import(path.join(pkg, "dist", "tooling", "imports.js"));
  const root = path.join(pkg, ".bundle-check", "nested-copy");
  nodeFs.rmSync(root, { recursive: true, force: true });
  const write = (file, text) => { nodeFs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); nodeFs.writeFileSync(path.join(root, file), text); };
  write("app.js", 'import { Button } from "@srasyndicate/basalt";\nimport { fromDependency } from "dep";\nconsole.log(Button, fromDependency);\n');
  write("node_modules/dep/package.json", JSON.stringify({ name: "dep", version: "1.0.0", type: "module", main: "index.js" }));
  write("node_modules/dep/index.js", 'import { Button } from "@srasyndicate/basalt";\nexport const fromDependency = Button;\n');
  write("node_modules/dep/node_modules/@srasyndicate/basalt/package.json", JSON.stringify({ name: "@srasyndicate/basalt", version: "0.0.1", type: "module", exports: { ".": "./index.js" }, sideEffects: false }));
  write("node_modules/dep/node_modules/@srasyndicate/basalt/index.js", 'export const Button = "the nested copy";\n');
  try {
    const result = await esbuild.build({
      absWorkingDir: root, entryPoints: ["app.js"], bundle: true, format: "esm", write: false, metafile: true,
      external: ["react", "react-dom", "react/jsx-runtime", "@base-ui/react", "@base-ui/react/*", "@phosphor-icons/react", "@phosphor-icons/react/*", "cmdk", "shiki", "shiki/*"],
      logLevel: "silent", plugins: [basaltImportsEsbuild()],
    });
    const inputs = Object.keys(result.metafile.inputs);
    assert.ok(result.outputFiles[0].text.includes("the nested copy"), "the dependency's own copy is what it gets");
    assert.ok(inputs.some((f) => /node_modules\/dep\/node_modules\/@srasyndicate\/basalt\/index\.js$/.test(f)), "the nested copy is resolved as esbuild would resolve it");
    assert.ok(inputs.some((f) => f.startsWith("basalt-imports:") && f.endsWith(`${path.sep}app.js`)), "the app's own import is still rewritten");
    assert.ok(!inputs.some((f) => f.startsWith("basalt-imports:") && f.includes(`${path.sep}dep${path.sep}`)), "the dependency's import is not");
  } finally {
    nodeFs.rmSync(root, { recursive: true, force: true });
  }
});

// DECISIONS 320, 2.15: the version link, the release notes and the versions are each a module of their own, so an app that shows only the foot's link
// loads only that (VersionLink takes the rail's tooltip from AppShell, which loads it on demand). The Sources popup loads on a reader's first reach for a
// source line (release-sources.js, built on its own with Base UI's popover inlined, so it makes no shared chunk), and AppShell's rail tooltip for the
// version the same way (rail-tooltip.js). Measured with splitting: VersionLink 2,107, ReleaseIndex 31,035 (Base UI's accordion), ReleaseNotes 67,232
// (the accordion, the callout, the copy and text buttons; 173,798 with the popup up front); each limit is the measurement rounded up to the next 50.
// ReleaseNotes measured 67,535 once #127 was merged in (DECISIONS 328's Button and TextButton changes, which its copy and text buttons carry).
for (const [name, limit] of [["VersionLink", 2_150], ["ReleaseIndex", 31_050], ["ReleaseNotes", 67_550]]) {
  test(`${name} alone, with splitting, loads only its own static graph (${limit} bytes at most)`, async () => {
    const { bytes, chunks } = await graph(name);
    assert.ok(bytes < limit, `${name}: ${bytes} bytes in ${chunks} chunks (limit ${limit})`);
  });
}

test("VersionLink loads none of the release notes, the versions or the tooltip", async () => {
  const { inputs } = await graph("VersionLink");
  assert.deepEqual(inputs.filter((input) => /release-notes|release-index|display\.js|@base-ui/.test(input)), []);
});

test("ReleaseNotes loads no popup up front: no popover, no positioning, no Floating UI until a source line is pressed", async () => {
  const { inputs } = await graph("ReleaseNotes");
  assert.deepEqual(inputs.filter((input) => /@floating-ui\/(dom|core|react-dom)|floating-ui-react|@base-ui\/react\/popover|release-sources|useAnchorPositioning/.test(input)), []);
});

// AppShell measured alone (the size table): 103,887 before the version, 115,101 with the rail's tooltip up front, 104,373 with it on demand; with
// splitting its static graph measures 104,964, so the limit is 105,000.
test("AppShell loads the rail's tooltip for the version on demand", async () => {
  const { inputs, bytes } = await graph("AppShell");
  assert.deepEqual(inputs.filter((input) => /rail-tooltip/.test(input)), []);
  assert.ok(bytes < 105_000, `AppShell: ${bytes} bytes (limit 105,000)`);
});

// DECISIONS 316, ruling 3: TextButton draws its end icon through ControlIcon, so a chevron that opens something in place morphs; measured 11,412 (10,600 to 11,450).
// Stages and runs (DECISIONS 316): each new part has its own limit, the measured static graph rounded up to the next 50. StageMark carries Phosphor's five
// circled marks (one file each, as Terminal imports its marks) and the ring; StageBadge, RunTimer, RunAnnouncer and formatRunTime load no Phosphor, and none
// of them loads Base UI.
for (const [name, limit, phosphor] of [["StageMark", 14_500, true], ["StageBadge", 5_450, false], ["RunTimer", 5_800, false], ["RunAnnouncer", 600, false], ["formatRunTime", 750, false], ["RunStage", 21_850, true], ["StageList, RunStage", 22_600, true], ["StageRail, RunStage", 22_550, true]]) {
  test(`${name} alone loads no Base UI${phosphor ? "" : " and no Phosphor"} (${limit} bytes at most)`, async () => {
    const { bytes, inputs } = await graph(name);
    assert.ok(bytes < limit, `${name} bundle is ${bytes} bytes (limit ${limit})`);
    assert.deepEqual(inputs.filter((f) => /@base-ui|cmdk|shiki/.test(f)), [], `${name} loads Base UI, cmdk or Shiki`);
    assert.deepEqual(inputs.filter((f) => /run-timeline/.test(f)), [], `${name} pays for RunTimeline's counter`);
    const marks = inputs.filter((f) => /@phosphor-icons/.test(f)).map((f) => path.basename(f).replace(/\.es\.js$|\.mjs$|\.js$/, ""));
    if (phosphor) assert.deepEqual([...new Set(marks)].filter((m) => !/^(IconBase|context|SSRBase)$/.test(m)).sort(), ["CheckCircle", "Circle", "MinusCircle", "Prohibit", "XCircle"]);
    else assert.deepEqual(marks, []);
  });
}

// RunTimeline carries its toggle (TextButton, and so Base UI's button and the press wait) and the shared stage parts; StageList does not carry it (above).
test("RunTimeline with RunStep loads Base UI's button and nothing else of Base UI (41,750 bytes at most)", async () => {
  const { bytes, inputs } = await graph("RunTimeline, RunStep");
  assert.ok(bytes < 41_750, `RunTimeline bundle is ${bytes} bytes (limit 41,750)`);
  assert.deepEqual(inputs.filter((f) => /cmdk|shiki/.test(f)), []);
  assert.ok(!inputs.some((f) => /@base-ui\/react\/(esm\/)?(menu|dialog|select|popover|progress|meter|tooltip)\//.test(f)), "an unrelated Base UI part");
});
