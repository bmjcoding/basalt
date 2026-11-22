// Phosphor icons and the weights Basalt draws (DECISIONS 90, item E2).
//
// Every Phosphor icon ships six weights; Basalt draws Bold, and Fill on a selected `fillSafe` glyph. Basalt's own `dist` imports
// `@phosphor-icons/react`, so an app that also imports Phosphor shares one copy of each icon with Basalt. The trimming is an opt-in
// build plugin for the app (`@srasyndicate/basalt/phosphor`) that cuts the weights the app does not keep out of its whole graph. This
// file proves:
//   1. the default build is untouched, and an app that imports the icons Basalt draws itself ships none of them twice, with the
//      plugin and without it;
//   2. the plugin's transform: the kept weights draw exactly what Phosphor draws, the others draw nothing, nothing is built at load,
//      each weight is built once, and it fails loudly on what it does not know;
//   3. the bytes, with the plugin and without it, for Basalt alone and beside the app's own copies;
//   4. the licence is in an output once;
//   5. every icon's markup is byte-identical, with and without the plugin, in every component and state that draws one;
//   6. the plugin is in no runtime bundle.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";
import { PlayIcon } from "@phosphor-icons/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { launch, pkg } from "./support.mjs";

const dist = path.join(pkg, "dist");
const src = path.join(pkg, "src");
const root = path.join(pkg, "..", "..");
const phosphorDir = path.join(root, "node_modules", "@phosphor-icons", "react");
const tooling = await import(pathToFileURL(path.join(dist, "tooling", "phosphor.js")).href);
const { BASALT_PHOSPHOR_WEIGHTS, phosphorWeightsEsbuild, phosphorWeightsRollup, trimPhosphorWeights } = tooling;
const ALL = ["thin", "light", "regular", "bold", "fill", "duotone"];
const external = ["react", "react-dom", "react/jsx-runtime"];
const render = (type, props) => renderToStaticMarkup(createElement(type, props));
const inner = (html) => html.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const countOf = (text, needle) => text.split(needle).length - 1;
const MIT = fs.readFileSync(path.join(phosphorDir, "LICENSE"), "utf8").trim();

/** The Phosphor icons the components import by name ("Warning" for WarningIcon), read from the source. */
function usedIcons() {
  const names = new Set();
  for (const file of fs.readdirSync(src).filter((f) => /\.tsx?$/.test(f))) {
    // Each icon is imported from its own module (`@phosphor-icons/react/dist/csr/<Name>`), so Node loads one file per icon and not all of
    // Phosphor's barrel. It is the same module the barrel re-exports, so an app's own import of the icon still shares the one copy.
    for (const match of fs.readFileSync(path.join(src, file), "utf8").matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@phosphor-icons\/react\/dist\/csr\/(\w+)"/g)) {
      for (const part of match[1].split(",")) if (part.trim()) names.add(part.trim().split(/\s+as\s+/)[0].replace(/Icon$/, ""));
    }
  }
  return [...names].sort();
}
const used = usedIcons();

/** Phosphor's own definition table for one icon, every `d` of one weight in it, and its component. */
const defsFile = (name) => path.join(phosphorDir, "dist", "defs", `${name}.es.js`);
const original = async (name) => (await import(pathToFileURL(defsFile(name)).href)).default;
const pathData = (node) => (node && typeof node === "object" ? [...(node.props?.d ? [node.props.d] : []), ...[node.props?.children ?? []].flat().flatMap(pathData)] : []);
const original_d = async (name, weight) => pathData((await original(name)).get(weight));
const phosphorIcon = async (name) => (await import(pathToFileURL(path.join(phosphorDir, "dist", "csr", `${name}.es.js`)).href))[`${name}Icon`];
const IconBase = (await import(pathToFileURL(path.join(phosphorDir, "dist", "lib", "IconBase.es.js")).href)).default;

/** A trimmed definition file, run: its default export is the weights table. `react` is the real one unless it is given. */
async function evaluate(source, react) {
  const { code } = await esbuild.transform(source, { format: "cjs", loader: "js", legalComments: "none" });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)(() => react ?? { createElement, Fragment: Symbol.for("react.fragment") }, module, module.exports);
  return module.exports.default;
}

/** A bundle of `contents`, resolved from the package's dist or from `resolveDir`, with or without the plugin. */
async function bundle(contents, { plugin = false, resolveDir = pkg, weights = BASALT_PHOSPHOR_WEIGHTS, split = false } = {}) {
  const result = await esbuild.build({
    stdin: { contents, resolveDir, loader: "js" },
    bundle: true, minify: true, format: "esm", write: false, metafile: true, external, logLevel: "silent",
    plugins: plugin ? [phosphorWeightsEsbuild({ weights })] : [],
    // `split`: the static graph under splitting, which is what an app loads first. A dynamic import (a control's glyph engine) is not in it.
    ...(split ? { splitting: true, outdir: path.join(pkg, ".bundle-check") } : {}),
  });
  if (split) {
    const outputs = result.metafile.outputs;
    const entry = Object.keys(outputs).find((file) => outputs[file].entryPoint === "<stdin>");
    const seen = new Set();
    const visit = (file) => { if (seen.has(file)) return; seen.add(file); for (const imported of outputs[file].imports) if (!imported.external && imported.kind !== "dynamic-import") visit(imported.path); };
    visit(entry);
    const files = result.outputFiles.filter((file) => seen.has(path.relative(pkg, file.path)));
    const text = files.map((file) => file.text).join("\n");
    const inputs = [...new Set([...seen].flatMap((file) => Object.keys(outputs[file].inputs)))];
    return { bytes: files.reduce((sum, file) => sum + file.contents.length, 0), text, inputs, icons: [...text.matchAll(/displayName\s*=\s*"(\w+Icon)"/g)].map((m) => m[1]) };
  }
  const text = result.outputFiles[0].text;
  const inputs = Object.keys(Object.values(result.metafile.outputs)[0].inputs);
  return { bytes: result.outputFiles[0].contents.length, text, inputs, icons: [...text.matchAll(/displayName\s*=\s*"(\w+Icon)"/g)].map((m) => m[1]) };
}
const own = (name, icons) => `import { ${name} } from "./dist/index.js"; import { ${icons.map((i) => `${i}Icon`).join(", ")} } from "@phosphor-icons/react"; console.log(${name.split(", ").join(", ")}, ${icons.map((i) => `${i}Icon`).join(", ")});`;
const alone = (name) => `import { ${name} } from "./dist/index.js"; console.log(${name.split(", ").join(", ")});`;

// What each component draws from Phosphor, so that an app can hold its own copy of the same icons. Since DECISIONS 138 and 139 (E2) the core set
// draws check, close, the chevrons, copy, plus, minus and search, so Terminal, Pagination and ToastProvider no longer draw Phosphor's Check, Copy,
// Caret or X, and Breadcrumbs draws no Phosphor icon at all. Pagination's gap is the core `more` since DECISIONS 222 (engineering: a component never draws Phosphor's version
// of a core glyph), so Pagination draws none either.
const CASES = [
  ["Kbd", ["Command", "Control", "Option"]],
  ["Terminal", ["CheckCircle", "Warning", "XCircle"]],
  ["Callout", ["Info", "CheckCircle", "Warning", "XCircle"]],
  ["ToastProvider", ["CheckCircle", "Warning", "XCircle"]],
  ["NotificationCentre", ["CheckCircle", "Warning", "XCircle", "Circle"]],
  ["NotificationList", ["CheckCircle", "Warning", "XCircle", "Circle"]],
];

describe("the default build: Basalt's dist imports Phosphor as it did, and nothing ships twice", () => {
  test("dist holds no trimmed icon, and its components import the package's icons", () => {
    assert.deepEqual(fs.readdirSync(dist).filter((f) => /^phosphor-/.test(f)), []);
    const texts = fs.readdirSync(dist).filter((f) => f.endsWith(".js")).map((f) => fs.readFileSync(path.join(dist, f), "utf8"));
    assert.ok(texts.filter((t) => /from "@phosphor-icons\/react\/dist\/csr\/\w+"/.test(t)).length >= 10, "the package's icons are imported, not bundled");
    assert.equal(texts.filter((t) => /weight === "bold"/.test(t)).length, 0, "no trimmed table in dist");
  });

  test("a component's default bundle carries all six weights of each icon it draws (the package's own icons)", async () => {
    const { text } = await bundle(alone("Kbd"));
    for (const weight of ALL) for (const d of await original_d("Command", weight)) assert.ok(text.includes(d), `Command ${weight}`);
  });

  for (const plugin of [false, true]) {
    for (const [name, icons] of CASES) {
      test(`${name} beside the app's own ${icons.join(", ")}: no icon twice, and the app's copies cost nothing (${plugin ? "with" : "without"} the plugin)`, async () => {
        const solo = await bundle(alone(name), { plugin });
        const mixed = await bundle(own(name, icons), { plugin });
        assert.equal(mixed.icons.length, new Set(mixed.icons).size, `an icon twice: ${mixed.icons}`);
        for (const icon of icons) {
          assert.ok(mixed.icons.includes(`${icon}Icon`), `${icon} is in`);
          assert.equal(countOf(mixed.text, (await original_d(icon, "bold"))[0]), 1, `${icon}'s Bold drawing once`);
        }
        // the app's console.log of its own icons is all that the mixed bundle adds
        assert.ok(mixed.bytes - solo.bytes < 100, `the app's own copies add ${mixed.bytes - solo.bytes} bytes (${name})`);
        assert.deepEqual(new Set(mixed.icons), new Set(solo.icons), "the same icons, shared");
      });
    }
  }

  // The lazy command panel is built on its own (build.mjs: it shares no file with the package). It used to inline Phosphor's MagnifyingGlass, the
  // one icon that came twice; since DECISIONS 138 and 139 (E2) it draws the core set's `search`, so no Phosphor icon comes twice at all.
  test("CommandMenu: the lazy panel draws the core search glyph, and no Phosphor icon comes twice", async () => {
    const mixed = await bundle(own("CommandMenu", ["MagnifyingGlass"]));
    const twice = mixed.icons.filter((icon, i) => mixed.icons.indexOf(icon) !== i);
    assert.deepEqual(twice, []);
  });
});

describe("the plugin's transform", () => {
  test("it parses every definition file in Phosphor and keeps what it is asked to", () => {
    const dir = path.join(phosphorDir, "dist", "defs");
    const names = fs.readdirSync(dir).filter((f) => f.endsWith(".es.js")).map((f) => f.slice(0, -6));
    assert.ok(names.length > 1000, `${names.length} icons`);
    for (const name of names) {
      const trimmed = trimPhosphorWeights(fs.readFileSync(path.join(dir, `${name}.es.js`), "utf8"), BASALT_PHOSPHOR_WEIGHTS, name);
      assert.ok(!/new Map|"thin"|"duotone"/.test(trimmed), name);
    }
  });

  test("the kept weights draw exactly what Phosphor draws, at every size; every other weight draws nothing", async () => {
    for (const name of used.concat(["Play", "Gear"])) {
      const Theirs = await phosphorIcon(name);
      const table = await evaluate(trimPhosphorWeights(fs.readFileSync(defsFile(name), "utf8"), BASALT_PHOSPHOR_WEIGHTS, name));
      for (const size of [16, 20, 24]) {
        for (const weight of ALL) {
          const ours = render(IconBase, { weights: table, weight, size });
          if (BASALT_PHOSPHOR_WEIGHTS.includes(weight)) assert.equal(ours, render(Theirs, { weight, size }), `${name} ${weight} at ${size}`);
          else assert.equal(inner(ours), "", `${name} ${weight}: trimmed, so it draws nothing`);
        }
      }
    }
  });

  test("loading builds nothing; each weight's tree is built the first time it is asked for, and reused", async () => {
    const source = trimPhosphorWeights(fs.readFileSync(defsFile("Check"), "utf8"), ["bold", "fill"], "Check");
    assert.ok(!/new (Map|Set|WeakMap)/.test(source));
    let built = 0;
    const react = { Fragment: Symbol("fragment"), createElement: (type, props, ...children) => { built += 1; return { type, props: { ...props, children } }; } };
    const table = await evaluate(source, react);
    assert.equal(built, 0, "nothing at load");
    const bold = table.get("bold");
    const afterBold = built;
    assert.ok(afterBold > 0);
    assert.equal(table.get("bold"), bold, "the same tree again");
    assert.equal(built, afterBold, "and nothing built for it");
    assert.notEqual(table.get("fill"), bold);
    assert.equal(table.get("fill"), table.get("fill"));
    assert.equal(table.get("regular"), undefined);
    assert.equal(table.get("toString"), undefined, "an object's own names are not weights");
  });

  test("it fails loudly: no weights, an unknown weight, a weight the icon lacks, a layout it does not know", () => {
    const real = fs.readFileSync(defsFile("Check"), "utf8");
    assert.throws(() => trimPhosphorWeights(real, undefined, "Check"), /at least one weight/);
    assert.throws(() => trimPhosphorWeights(real, [], "Check"), /at least one weight/);
    assert.throws(() => trimPhosphorWeights(real, ["black"], "Check"), /unknown weight "black"/);
    assert.throws(() => trimPhosphorWeights(real.replace("new Map(", "new Set("), ["bold"], "Check"), /layout/);
    assert.throws(() => trimPhosphorWeights(real.replace('"thin"', '"hair"'), ["bold"], "Check"), /weights/);
    // Anything in the table the entries don't account for fails too: here a spread that would override Bold (Sol, round 2).
    assert.throws(() => trimPhosphorWeights(real.replace(/\n\]\);\nexport/, ',\n  ...[["bold", null]]\n]);\nexport'), ["bold"], "Check"), /layout/);
    assert.throws(() => phosphorWeightsEsbuild({}), /at least one weight/);
    assert.throws(() => phosphorWeightsRollup({ weights: [] }), /at least one weight/);
  });

  test("a weight that is trimmed and then drawn draws nothing", async () => {
    const { text } = await bundle(`import { CheckIcon } from "@phosphor-icons/react"; console.log(CheckIcon);`, { plugin: true, weights: ["bold"] });
    assert.ok(!(await original_d("Check", "regular")).some((d) => text.includes(d)));
    assert.ok(!(await original_d("Check", "fill")).some((d) => text.includes(d)));
    assert.ok((await original_d("Check", "bold")).every((d) => text.includes(d)));
  });

  test("an app adds its own weights to Basalt's", async () => {
    assert.deepEqual(BASALT_PHOSPHOR_WEIGHTS, ["bold", "fill"]);
    const { text } = await bundle(alone("Kbd"), { plugin: true, weights: [...BASALT_PHOSPHOR_WEIGHTS, "regular"] });
    for (const d of await original_d("Command", "regular")) assert.ok(text.includes(d));
    for (const d of await original_d("Command", "thin")) assert.ok(!text.includes(d));
  });

  test("the Rollup and Vite plugin is the same transform, on the definition files and nothing else", () => {
    const plugin = phosphorWeightsRollup({ weights: BASALT_PHOSPHOR_WEIGHTS });
    const real = fs.readFileSync(defsFile("Check"), "utf8");
    const id = "/app/node_modules/@phosphor-icons/react/dist/defs/Check.es.js?v=1";
    assert.equal(plugin.transform(real, id).code, trimPhosphorWeights(real, BASALT_PHOSPHOR_WEIGHTS, "Check"));
    assert.equal(plugin.transform("export const a = 1;", "/app/src/a.js"), null);
    assert.equal(plugin.transform(real, "/app/node_modules/@phosphor-icons/react/dist/csr/Check.es.js"), null);
  });
});

describe("the bytes, with the plugin and without it", () => {
  // [component, the most the bundle may be with the plugin, the least the plugin must save]. First measured (default → plugin): Kbd 9,169 → 6,700,
  // Terminal 31,742 → 26,236, Callout 11,776 → 6,702, Pagination 21,747 → 20,641, ToastProvider 89,556 → 84,701, NotificationCentre
  // 144,041 → 140,253. The limits sit just above what is measured; the Phosphor notice (about 1.1 KB, once) is in them.
  // E2 (DECISIONS 138 and 139) moved check, close, the chevrons and copy to the core set, so Terminal, Pagination and ToastProvider hold fewer Phosphor
  // icons for the plugin to trim, and the core glyph code now rides with Toast. Measured now (default → plugin): Terminal 28,779 → 25,060, Pagination
  // 19,284 → 19,619 (the plugin's notice is bigger than what its one icon saved), ToastProvider 90,503 → 86,723.
  // Terminal and NotificationCentre were raised by 50 and 150 bytes in audit-fix-c1 (A1-05), and only because of the batched spinner. Measured
  // with the plugin: Terminal 26,423 and NotificationCentre 140,498 with the spinner as it was, 26,506 and 140,581 with the batched one (83 bytes
  // each; both pull in Button and so the Spinner). Importing each icon from its own module (also audit-fix-c1, A1-07) changes neither number.
  // Combined in integration-nov15: the limits are E2's, plus audit-fix-c1's raises for the batched spinner (Terminal 25,300 to 25,350, NotificationCentre
  // 140,500 to 140,650); the combined tree fits under them.
  // DECISIONS 154: Button grew about 650 bytes (the outline, amount, count, two-line, full-width and done forms, and Reserve), so Terminal, Pagination and NotificationCentre, which carry it, rose by as much: 25,350 to 26,100, 20,000 to 20,700 and 140,650 to 141,850.
  // Links and rows (DECISIONS 152): Link's arrow form (`arrow`) draws the core right and left arrows, so Pagination, which holds Link, carries them: 19,619 → 20,453 with
  // the plugin (the two glyphs, the arrow's span and the branch, 834 bytes). Raised from 20,000 to 20,500 for that and for nothing else.
  // Combined in integration-nov15b: Pagination holds both Button (DECISIONS 154, 20,700) and Link's arrows (DECISIONS 152, 20,500), and measures 21,560 with the plugin, over both limits, so its limit is 21,600 (the measured bytes rounded up to the next 50).
  // DECISIONS 221 (the owner raised the limits for the glyph morphs: the part every control carries, control-icon.tsx, is in Button and so in these): Terminal 26,600 to 27,000, Pagination 21,600 to 21,750,
  // NotificationCentre 141,850 to 142,150. Measured as the static graph under splitting (the engine is lazy): 26,956, 21,719 and 142,101; each limit is that rounded up to the next 50.
  // Logs, status and forms (DECISIONS 162, B3): Terminal's `fields` form draws a line's loud fields through LogFields (414 bytes), so Terminal rose from 26,100 to 26,600.
  // DECISIONS 260 (busy controls, under DECISIONS 246): Button, IconButton and TextButton wait for a promise from their handler, and the wait (wait.ts, with the
  // rendered element's handler taken into the press) rides with Button into what carries it. Measured with the plugin, each limit rounded up to the next 50: Terminal 28,643
  // (27,000 to 28,650), NotificationCentre 143,793 (142,150 to 143,800), and Pagination alone 21,812 (20,300 to 21,850, below).
  // Kbd is not one of them: its static graph (keyboard.ts, shortcut.ts, platform.ts, utils.ts and the three Phosphor keys) holds no Button and no wait, and measures
  // 7,291 on main at 4778c200 as on this branch, over the 6,950 set in 1eaff4c9: the rise is DECISIONS 244's one Mod key across platforms (b361621c, platform.ts and
  // the Mod handling in keyboard.ts). Its limit is that measurement rounded up to the next 50, 7,300.
  // cimip-gaps-2, B7 (DECISIONS 265): the center draws the pending ring (Phosphor's Circle), a group's core chevron and the reveal's track, so with the
  // plugin it rose from 143,793 to 147,187, and DECISIONS 268's popover default (18 bytes) brings it to 147,224 (143,800 to 147,250, rounded up to
  // the next 50).
  for (const [name, limit, saving] of [["Kbd", 7_300, 2_000], ["Terminal", 28_650, 3_000], ["Callout", 6_950, 4_500], ["ToastProvider", 87_000, 3_000], ["NotificationCentre", 147_250, 3_500]]) {
    test(`${name} with the plugin is under ${limit} bytes and at least ${saving} smaller than without, alone and beside the app's own icons`, async () => {
      const icons = CASES.find(([n]) => n === name)[1];
      // the static graph under splitting: a control's glyph engine loads on demand, so it is not part of what an app loads first
      const plain = await bundle(alone(name), { split: true });
      const trimmed = await bundle(alone(name), { plugin: true, split: true });
      assert.ok(trimmed.bytes < limit, `${name}: ${trimmed.bytes} bytes (limit ${limit})`);
      assert.ok(plain.bytes - trimmed.bytes >= saving, `${name}: ${plain.bytes} → ${trimmed.bytes}`);
      const mixed = await bundle(own(name, icons), { plugin: true, split: true });
      assert.ok(mixed.bytes < limit + 100, `${name} beside the app's own icons: ${mixed.bytes} bytes`);
    });
  }

  // An icon only the app draws is trimmed too, which is the point of putting the plugin on the app's whole graph.
  test("an app's own icons are trimmed with Basalt's", async () => {
    const app = `import { PlayIcon, GearIcon, ArrowRightIcon } from "@phosphor-icons/react"; console.log(PlayIcon, GearIcon, ArrowRightIcon);`;
    const plain = await bundle(app);
    const trimmed = await bundle(app, { plugin: true });
    assert.ok(plain.bytes - trimmed.bytes > 3_000, `${plain.bytes} → ${trimmed.bytes}`);
  });

  // Pagination draws no Phosphor icon since DECISIONS 222: its gap is the core `more` glyph, so the plugin has nothing to trim and costs it nothing.
  test("Pagination draws no Phosphor icon, so the plugin changes nothing about it", async () => {
    const plain = await bundle(alone("Pagination"));
    const trimmed = await bundle(alone("Pagination"), { plugin: true });
    assert.equal(plain.text.includes("@phosphor-icons"), false);
    assert.equal(trimmed.bytes, plain.bytes, `${plain.bytes} → ${trimmed.bytes}`);
    assert.equal(fs.readFileSync(path.join(dist, "navigation.js"), "utf8").includes("@phosphor-icons"), false);
  });

  // Pagination's absolute limit (it had 21,750 while it drew DotsThree; DECISIONS 222 took the Phosphor icon out and the list band's pieces in): the static graph under splitting, measured 20,2xx, rounded up to the next 50.
  test("Pagination alone stays under its absolute limit (21,850 bytes, the static graph under splitting)", async () => {
    const plain = await bundle(alone("Pagination"), { split: true });
    assert.ok(plain.bytes < 21_850, `Pagination: ${plain.bytes} bytes (limit 21850)`);
  });
});

describe("the licence is in an output once", () => {
  // A real install: Basalt is a package in the app's node_modules, so its files and Phosphor's are both third-party to the bundler.
  const consumer = path.join(root, "node_modules", ".cache", "basalt-consumer");
  before(() => {
    const target = path.join(consumer, "node_modules", "@srasyndicate", "basalt");
    fs.rmSync(consumer, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(dist, path.join(target, "dist"), { recursive: true });
    fs.copyFileSync(path.join(pkg, "package.json"), path.join(target, "package.json"));
  });
  after(() => fs.rmSync(consumer, { recursive: true, force: true }));

  for (const plugin of [false, true]) {
    for (const [label, contents] of [
      ["a single-output bundle of CommandMenu", `import { CommandMenu } from "@srasyndicate/basalt"; console.log(CommandMenu);`],
      ["CommandMenu beside the app's own icons", `import { CommandMenu } from "@srasyndicate/basalt"; import { MagnifyingGlassIcon, CheckIcon } from "@phosphor-icons/react"; console.log(CommandMenu, MagnifyingGlassIcon, CheckIcon);`],
      ["Kbd and Terminal beside the app's own icons", `import { Kbd, Terminal } from "@srasyndicate/basalt"; import { CommandIcon, PlayIcon, CopyIcon } from "@phosphor-icons/react"; console.log(Kbd, Terminal, CommandIcon, PlayIcon, CopyIcon);`],
    ]) {
      test(`${label} holds Phosphor's notice once (${plugin ? "with" : "without"} the plugin)`, async () => {
        const { text } = await bundle(contents, { plugin, resolveDir: consumer });
        // Without the plugin the only notice is the command panel's banner, so a bundle without CommandMenu has none: Basalt's default
        // output is what it was. With it, every icon it trims comes with the notice, and the panel's is the same text.
        const expected = plugin || /CommandMenu/.test(contents) ? 1 : 0;
        assert.equal(countOf(text, "Permission is hereby granted"), expected, "the notice");
        if (expected) assert.match(text, /Copyright \(c\) 2020 Phosphor Icons/);
      });
    }
  }

  test("the notice is the same text in the plugin and in the command panel", () => {
    const panel = fs.readFileSync(path.join(dist, "command-panel.js"), "utf8").match(/\/\*!([\s\S]*?)\*\//)[1];
    const trimmed = trimPhosphorWeights(fs.readFileSync(defsFile("Check"), "utf8"), ["bold"], "Check").match(/\/\*!([\s\S]*?)\*\//)[1];
    assert.equal(trimmed, panel);
    assert.ok(trimmed.includes(MIT));
  });
});

// --- the markup, before and after: a real browser, built from the same source ---
const REFERENCE = process.env.BASALT_ICON_REFERENCE ?? path.join(src, "index.ts");
const FIXTURE = `
import { PlusIcon, PlayIcon, SunIcon, MoonIcon } from "@phosphor-icons/react";
const Site = ({ name, children }) => <div data-site={name}>{children}</div>;
function Toasts() {
  const t = B.useToast();
  React.useEffect(() => { for (const status of ["neutral", "success", "warning", "danger"]) t.show({ title: status, status, timeout: 0 }); }, [t]);
  return null;
}
const LINES = [
  { kind: "command", text: "basalt deploy" }, { kind: "output", text: "Building" }, { kind: "done", text: "Built" },
  { kind: "warning", text: "Slow" }, { kind: "error", text: "Failed" },
];
const ENTRIES = [
  { id: "1", title: "Deploy finished", time: "2m", status: "success", unread: true },
  { id: "2", title: "Disk nearly full", time: "1h", status: "warning" },
  { id: "3", title: "Build failed", time: "2h", status: "danger" },
  { id: "4", title: "Queued", time: "3h" },
  { id: "5", title: "In review", time: "4h", status: "pending" },
];
const options = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }];
const many = Array.from({ length: 8 }, (_, i) => ({ value: "v" + i, label: "Value " + i }));
function App() {
  const [commands, setCommands] = React.useState(true);
  return (
    <B.TooltipProvider><B.ToastProvider><Toasts />
      <Site name="callouts">{["info", "success", "warning", "danger"].map((s) => <B.Callout key={s} status={s} title={s}>Body</B.Callout>)}</Site>
      <Site name="accordion"><B.Accordion defaultValue={["x"]}><B.AccordionItem value="x" title="Open">Body</B.AccordionItem><B.AccordionItem value="y" title="Closed">Body</B.AccordionItem></B.Accordion></Site>
      <Site name="checkbox"><B.Checkbox defaultChecked>On</B.Checkbox><B.Checkbox indeterminate>Mixed</B.Checkbox><B.Checkbox>Off</B.Checkbox></Site>
      <Site name="select-closed"><B.Select aria-label="Region" options={options} defaultValue="a" /></Site>
      <Site name="number-field"><B.NumberField aria-label="Count" defaultValue={3} decrementLabel="Fewer" incrementLabel="More" /></Site>
      <Site name="pagination"><B.Pagination page={5} pageCount={12} onPageChange={() => {}} /><B.Pagination page={1} pageCount={3} onPageChange={() => {}} /></Site>
      <Site name="breadcrumbs"><B.Breadcrumbs items={[{ label: "Home", href: "#" }, { label: "Runs", href: "#" }, { label: "Run 1" }]} /></Site>
      <Site name="kbd"><B.Kbd>⌘K</B.Kbd><B.Kbd>⌥⌃⇧↵</B.Kbd></Site>
      <Site name="terminal"><B.Terminal title="Deploy" lines={LINES} /><B.Terminal title="Done" lines={LINES} status="done" /><B.Terminal title="Failed" lines={LINES} status="failed" /></Site>
      <Site name="code-block"><B.CodeBlock title="x" code="npm i" language="sh" /></Site>
      <Site name="social"><B.SocialLinks>{["github", "x", "linkedin", "instagram", "youtube", "email"].map((s) => <B.SocialLink key={s} service={s} href="#">{s}</B.SocialLink>)}</B.SocialLinks><B.ProfileLinks><B.ProfileLink service="github" handle="basalt" href="#">GitHub</B.ProfileLink></B.ProfileLinks></Site>
      <Site name="table-sort"><B.Table><B.TableHeader><tr><B.TableHead sort="ascending" onSortChange={() => {}}>Name</B.TableHead><B.TableHead numeric sort="descending" onSortChange={() => {}}>Cost</B.TableHead></tr></B.TableHeader><B.TableBody><tr><td>a</td><td>1</td></tr></B.TableBody></B.Table></Site>
      <Site name="multi-select-chips"><B.MultiSelect label="Status" options={options} defaultValue={["a"]} /></Site>
      <Site name="multi-select-list"><B.MultiSelect label="Region" options={many} defaultValue={["v1"]} /></Site>
      <Site name="app-icons">
        <B.Button icon={PlusIcon}>Add</B.Button><B.Button icon={PlayIcon} pressed fillSafe>Run</B.Button><B.Button icon={PlayIcon} pressed>Run</B.Button>
        <B.IconButton icon={PlayIcon} label="Play" pressed fillSafe /><B.IconButton icon={PlayIcon} label="Play" pressed />
        <B.Nav aria-label="Primary"><B.NavItem href="#a" icon={PlayIcon} current>A</B.NavItem><B.NavItem href="#b" icon={B.HomeGlyph}>B</B.NavItem></B.Nav>
        <B.Icon icon={PlayIcon} size={20} selected fillSafe /><B.Icon icon={PlayIcon} size={24} selected /><B.Icon icon={PlayIcon} size={16} />
      </Site>
      <Site name="theme-menu"><B.ThemeMenu /><B.Icon icon={SunIcon} /><B.Icon icon={MoonIcon} /></Site>
      <Site name="notifications"><B.NotificationCentre entries={ENTRIES} defaultOpen /></Site>
      <Site name="select-open"><B.Select aria-label="Open" options={options} defaultValue="a" defaultOpen /></Site>
      <Site name="combobox-open"><B.Combobox aria-label="Zone" options={options} defaultValue="a" defaultOpen /></Site>
      <Site name="menu-open"><B.Menu defaultOpen><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent>
        <B.MenuItem icon={PlusIcon}>Add</B.MenuItem><B.MenuCheckboxItem defaultChecked>Pinned</B.MenuCheckboxItem>
        <B.MenuSubmenu defaultOpen><B.MenuSubmenuTrigger>More</B.MenuSubmenuTrigger><B.MenuContent><B.MenuItem>Deep</B.MenuItem></B.MenuContent></B.MenuSubmenu>
      </B.MenuContent></B.Menu></Site>
      <Site name="command-menu"><B.CommandMenu open={commands} onOpenChange={setCommands} groups={[{ label: "Sandbox", commands: [{ id: "dup", label: "Duplicate", shortcut: "⌘D", onSelect: () => {} }] }]} /></Site>
    </B.ToastProvider></B.TooltipProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
`;

/** The fixture bundled against `entry`, with or without the plugin, run in the browser: every svg it draws, and its text. */
async function drawn(browser, entry, plugin = false) {
  const script = (await esbuild.build({
    stdin: {
      contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from ${JSON.stringify(entry)}; ${FIXTURE}`,
      resolveDir: pkg, loader: "tsx",
    },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: plugin ? [phosphorWeightsEsbuild({ weights: BASALT_PHOSPHOR_WEIGHTS })] : [],
  })).outputFiles[0].text;
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent(`<html data-theme="dark"><head><style>${fs.readFileSync(path.join(dist, "styles.css"), "utf8")}</style></head><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: script });
  await page.waitForSelector('[data-site="app-icons"]');
  // the lazy panel, the toasts and the popups arrive after the first paint
  await page.waitForFunction(() => document.querySelectorAll("svg.basalt-icon").length > 60, null, { timeout: 15_000 });
  const icons = await page.evaluate(() => [...document.querySelectorAll("svg")].map((svg) => [svg.closest("[data-site]")?.getAttribute("data-site") ?? "portal", svg.outerHTML]));
  const text = await page.evaluate(() => document.body.innerText);
  await page.close();
  assert.deepEqual(errors, []);
  return { icons, text, bytes: script.length };
}

describe("every icon's markup is byte-identical to before, in every component and state that draws one", () => {
  let browser;
  let reference;
  const built = {};
  before(async () => {
    browser = await launch();
    // "Before": the same source drawing the package's untrimmed icons.
    reference = await drawn(browser, REFERENCE);
    built.default = await drawn(browser, path.join(dist, "index.js"));
    built.plugin = await drawn(browser, path.join(dist, "index.js"), true);
  });
  after(async () => { await browser?.close(); });

  for (const variant of ["default", "plugin"]) {
    test(`${variant === "plugin" ? "with the plugin" : "by default"}: the same icons, in the same places, with the same bytes`, () => {
      const got = built[variant];
      assert.equal(got.icons.length, reference.icons.length);
      for (let i = 0; i < reference.icons.length; i += 1) assert.deepEqual(got.icons[i], reference.icons[i], `icon ${i} (${reference.icons[i][0]})`);
      assert.equal(got.text, reference.text);
      assert.ok(reference.icons.length > 60, `${reference.icons.length} icons drawn`);
    });
  }

  test("the fixture draws every Phosphor icon Basalt imports, and the places that draw one", async () => {
    const markup = reference.icons.map(([, html]) => html).join("\n");
    for (const name of used) {
      const [d] = await original_d(name, "bold");
      assert.ok(markup.includes(d), `${name} is drawn in the fixture`);
    }
    const sites = new Set(reference.icons.map(([site]) => site));
    for (const site of ["callouts", "accordion", "checkbox", "select-closed", "number-field", "pagination", "breadcrumbs", "kbd", "terminal", "code-block", "social", "table-sort", "multi-select-chips", "multi-select-list", "app-icons", "theme-menu", "notifications", "portal"]) {
      assert.ok(sites.has(site), `${site} draws an icon`);
    }
    // the toasts, the open Menu, its submenu, the open Select and Combobox and the command menu are portalled, outside any site
    assert.ok(reference.icons.filter(([site]) => site === "portal").length >= 12, "the popups and toasts draw icons");
  });

  test("with the plugin, no icon is empty", () => {
    for (const [site, html] of built.plugin.icons) assert.match(html, /<(path|circle|rect|line|polyline|g)\b/, `${site}: ${html.slice(0, 120)}`);
  });

  test("an app's own Phosphor icon passed to a Basalt component draws as it did, Fill included, with the plugin too", () => {
    const bold = inner(render(PlayIcon, { size: 16, weight: "bold" }));
    const fill = inner(render(PlayIcon, { size: 16, weight: "fill" }));
    for (const variant of ["default", "plugin"]) {
      const app = built[variant].icons.filter(([site]) => site === "app-icons").map(([, html]) => inner(html));
      assert.ok(app.includes(fill), `${variant}: selected and fillSafe is Phosphor's Fill`);
      assert.ok(app.includes(bold), `${variant}: otherwise Bold`);
    }
  });

  test("the plugin shrinks the page's bundle", () => {
    assert.ok(built.plugin.bytes < built.default.bytes - 10_000, `${built.default.bytes} → ${built.plugin.bytes}`);
  });
});

describe("the plugin is build tooling and is in no runtime bundle", () => {
  test("it is its own entry at @srasyndicate/basalt/phosphor, and nothing in dist imports it", () => {
    assert.ok(fs.existsSync(path.join(dist, "tooling", "phosphor.js")));
    assert.ok(fs.existsSync(path.join(dist, "tooling", "phosphor.d.ts")));
    const manifest = JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8"));
    assert.deepEqual(manifest.exports["./phosphor"], { types: "./dist/tooling/phosphor.d.ts", default: "./dist/tooling/phosphor.js" });
    for (const file of fs.readdirSync(dist).filter((f) => f.endsWith(".js"))) {
      assert.doesNotMatch(fs.readFileSync(path.join(dist, file), "utf8"), /tooling\/phosphor|basalt-phosphor-weights|BASALT_PHOSPHOR_WEIGHTS|trimPhosphorWeights/, `${file} reaches the plugin`);
    }
    assert.doesNotMatch(fs.readFileSync(path.join(dist, "tooling", "phosphor.js"), "utf8"), /^(import|export \* from)/m, "the plugin imports nothing when it loads");
  });

  test("an app's bundle of every export carries no plugin code, with or without the plugin", async () => {
    const names = Object.keys(await import(pathToFileURL(path.join(dist, "index.js")).href));
    assert.ok(names.length > 100);
    for (const plugin of [false, true]) {
      const { text, inputs } = await bundle(`import * as B from "./dist/index.js"; console.log(B);`, { plugin });
      assert.deepEqual(inputs.filter((f) => /tooling|phosphor\.js$/.test(f)), [], "no tooling input");
      assert.doesNotMatch(text, /basalt-phosphor-weights|BASALT_PHOSPHOR_WEIGHTS|trimPhosphorWeights|phosphorWeightsEsbuild/);
    }
  });
});
