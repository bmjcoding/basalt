// Builds @srasyndicate/basalt:
//   dist/*.js           the components, one ES module per source file (React, Base UI, Phosphor and Shiki stay external)
//   dist/*.d.ts         type declarations
//   dist/components.css the component styles, with the tokens package's accent classes, in @layer basalt
//   dist/styles.css     tokens + components: the one stylesheet most apps import
//   dist/fonts.css      Geist Sans and Mono @font-face rules, with the variable font files, and the Geist Fallback face (three, one per weight)
//   .demo/              a page with every component in both themes, for the browser tests

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { minifyCss } from "./minify-css.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");
const require = createRequire(import.meta.url);
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// Finds an installed package's directory. Some (geist) don't export their package.json, so look for the directory itself.
const packageDir = (name) => {
  for (let dir = here; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  }
  throw new Error(`can't find ${name}; run npm install`);
};

// The command panel is the one lazy module (CommandMenu loads it on first open), and it is built on its own: the
// siblings it needs and the four Phosphor icons it draws are inlined into command-panel.js, so it shares no file with
// the rest of the package. A bundler that finds its dynamic import must make command-panel.js an entry of its own, and
// every file that entry shares with an ordinary import (utils, icon, kbd, Phosphor's icon base) is merged into one chunk
// that the ordinary import then loads, whatever it needs: Spinner paid 12.7 KB for a 1 KB component, Skeleton 12 KB.
// The panel is loaded on demand, so a second copy of those few files costs nothing until a menu opens.
const external = ["react", "react/*", "react-dom", "react-dom/*", "@base-ui/react", "@base-ui/react/*", "@phosphor-icons/react", "@phosphor-icons/react/*", "cmdk", "shiki", "shiki/*", "elkjs", "elkjs/*"];
// The notice (without its comment marks) that the panel's banner carries and that the opt-in Phosphor plugin (src/tooling/phosphor.ts) puts
// in front of the icons it trims. It is one string, so the two comments are identical and a bundler that holds both keeps one copy.
const phosphorNotice = `Bundles four icons from @phosphor-icons/react.\n${fs.readFileSync(path.join(packageDir("@phosphor-icons/react"), "LICENSE"), "utf8").trim().replaceAll("*/", "* /")}`;
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/command-panel.tsx")],
  outdir: dist,
  external: external.filter((name) => !name.startsWith("@phosphor-icons")),
  // A published component boundary must retain this for React Server Component consumers.
  // The second comment is a legal comment (/*!): Phosphor's whole MIT notice, which its licence requires beside any copy of the
  // icons, and which a consumer's minifier keeps.
  banner: { js: `"use client";\n/*! ${phosphorNotice}\n*/` },
});

// The glyph engine is the other lazy module (a control's glyph change loads it on first need, control-icon.tsx), built the same way and for the same reason:
// every file it shares with an ordinary import would otherwise become a chunk of its own that the ordinary import then loads, and a core glyph's module
// (HomeGlyph, 3 KB) would pay for the split. The few files it needs (the glyph's drawing, the engine's timing) are inlined, so it shares nothing with the
// rest of the package and costs a second copy of them only when a glyph first changes. (It overlaps with `MorphIcon`'s static copy of the engine in an app that
// uses both: lazy bytes after the first paint, and the trade for leaving every glyph module as it is.)
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/glyph-flight.tsx")],
  outdir: dist,
  external: external.filter((name) => !name.startsWith("@phosphor-icons")),
  plugins: [{ name: "lazy-flight", setup(build) { build.onResolve({ filter: /^\.\/glyph-flight$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./glyph-flight.js", external: true } : undefined)); } }],
  banner: { js: `"use client";` },
});

// The diagrams' motion is the third (an animated figure loads it the first time it is drawn, diagram-figure.tsx), built the same way and for the same reason: it
// draws the foot's two buttons with Button and the hold's state (useLoops), and in the main build those would become chunks that every ordinary import then loads
// (Spinner paid 16 KB for them). Inlined here, it shares no file with the rest of the package: even importing ./loops.js from it put loops.ts in every
// import's static graph (an app's bundler assigns the shared chunk before it shakes). Its copy of the hold's state keeps in step with the page's through the
// root's data-loops attribute, which every copy watches (loops.ts). A glyph change in its buttons still loads the one glyph engine (./glyph-flight.js).
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/diagram-motion.tsx")],
  outdir: dist,
  external: external.filter((name) => !name.startsWith("@phosphor-icons")),
  plugins: [{ name: "lazy-flight", setup(build) { build.onResolve({ filter: /^\.\/glyph-flight$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./glyph-flight.js", external: true } : undefined)); } }],
  banner: { js: `"use client";` },
});

// Diagram interop (DECISIONS 311, 314): a subpath outside the index (@srasyndicate/basalt/diagram-interop) built as one
// standalone ESM module so it shares no chunk with still diagrams or any root export (0 bytes added to every root import).
// Embeddable marks and attributions are derived directly from marks/manifest.json's terms at build time, and NODE_ENV is
// defined to "production" so native browser ESM (without a bundler) never hits `process is not defined`.
const marksManifest = JSON.parse(fs.readFileSync(path.join(here, "marks", "manifest.json"), "utf8"));
const embeddableMarks = marksManifest.marks
  .filter((m) => !m.unofficial && (m.terms?.quotes ?? []).some((q) => /architectur\w* diagrams?|for your diagrams|Apache-2\.0/i.test(q)))
  .map((m) => m.id);
const markAttributions = Object.fromEntries(
  marksManifest.marks
    .filter((m) => embeddableMarks.includes(m.id) && m.attribution)
    .map((m) => [m.id, m.attribution]),
);
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/diagram-interop.ts")],
  outdir: dist,
  external,
  plugins: [{ name: "lazy-diagram-layout", setup(build) { build.onResolve({ filter: /^\.\/diagram-layout$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./diagram-layout.js", external: true } : undefined)); } }],
  define: {
    "process.env.NODE_ENV": '"production"',
    __BASALT_EMBEDDABLE_MARKS__: JSON.stringify(JSON.stringify(embeddableMarks)),
    __BASALT_MARK_ATTRIBUTIONS__: JSON.stringify(JSON.stringify(markAttributions)),
  },
});

// elkjs as an ES module of its own (DECISIONS 306, 1.8): elkjs's own file, verbatim and unmodified, inside a wrapper that gives it a module and no global
// require, written to dist/diagram-elk.js with its notice. Imported only by diagram-layout, on demand: bundled as CommonJS by an app, elkjs put the
// bundler's CommonJS helpers in the chunk every component's bundle shares.
fs.mkdirSync(dist, { recursive: true });
{
  const elk = fs.readFileSync(path.join(packageDir("elkjs"), "lib", "elk.bundled.js"), "utf8");
  fs.writeFileSync(path.join(dist, "diagram-elk.js"), `/*! elkjs 0.12.1 (https://github.com/kieler/elkjs), the Eclipse Layout Kernel: EPL-2.0 OR GPL-3.0-or-later, used under EPL-2.0, unmodified. */
const elkModule = { exports: {} };
(function (module, exports, require, define) {
${elk}
}).call(globalThis, elkModule, elkModule.exports, undefined, undefined);
export default elkModule.exports;
`);
  // Its licence goes with the copy (Neon's B11 of the code review): the package redistributes the file, so it carries the text it is distributed under.
  fs.mkdirSync(path.join(dist, "elkjs"), { recursive: true });
  fs.copyFileSync(path.join(packageDir("elkjs"), "LICENSE.md"), path.join(dist, "elkjs", "LICENSE.md"));
}

// The diagram viewer is the fourth (DECISIONS 310, 9.13): "Expand" loads it at its first hover, focus or touch, and it brings the form dialog's box (on a native
// <dialog>, no Base UI dialog), the sheet's parts and the buttons with it, inlined for the same reason as the motion's. It imports the figure and the engine only as types: the figure hands them over when it opens
// the viewer (ViewerKit), so this chunk never holds a second copy of the engine.
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/diagram-viewer.tsx")],
  outdir: dist,
  external: external.filter((name) => !name.startsWith("@phosphor-icons")),
  plugins: [{ name: "lazy-flight", setup(build) { build.onResolve({ filter: /^\.\/glyph-flight$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./glyph-flight.js", external: true } : undefined)); } }],
  banner: { js: `"use client";` },
});

// A diagram's actions (an app's own buttons in the foot, diagram-actions.tsx) are one more lazy module, loaded by the figure only when `actions` has an entry, and built
// the same way and for the same reason: built in the main build, the file imported Button's dist chunk, and an app's bundler, which makes every dynamic
// import an entry and assigns shared chunks before it shakes, put Button, Spinner and Base UI's button in a chunk that every root import then loaded
// (formatRunTime went from 649 bytes to 19,114, Spinner from 1,643 to 18,635; cimip-gaps-3 E5). Inlined here, it shares no file with the rest of the
// package and costs a second copy of Button only when a figure with actions draws its foot. That copy has its own WaitContext, as the viewer's has: a
// form's wait outside the figure does not reach the foot's buttons, which wait on their own handlers as before.
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/diagram-actions.tsx")],
  outdir: dist,
  external: external.filter((name) => !name.startsWith("@phosphor-icons")),
  plugins: [{ name: "lazy-flight", setup(build) { build.onResolve({ filter: /^\.\/glyph-flight$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./glyph-flight.js", external: true } : undefined)); } }],
  banner: { js: `"use client";` },
});

// The root's map for the imports plugin (src/tooling/imports.ts): every name the root exports at run time, and the module that holds it, read from the barrel's source.
// `export * from "./glyph-set"` is the one star, and glyph-set is itself a list of `export { X } from "./glyphs/x"`: each glyph maps to its own module. Every
// `export` statement in the barrel must be one of the three forms below (`export { … } from "./x";`, `export type { … } from "./x";`, `export * from "./x";`, double
// quotes, a relative path); any other fails the build here, naming its line, so the plugin never misses a name (test/bundle.test.mjs holds the map to the root's exports).
const rootMap = {};
const BARREL_FORM = /export\s+(type\s+)?(\*|\{[^{}]*\})\s*from\s*"(\.\/[^"]+)"\s*;/y;
const readBarrel = (file, dir) => {
  // Comments become spaces of the same length, so a position still names its line.
  const source = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (comment) => comment.replace(/[^\n]/g, " "));
  for (const start of source.matchAll(/(?<![\w$.])export\b/g)) {
    BARREL_FORM.lastIndex = start.index;
    const statement = BARREL_FORM.exec(source);
    if (!statement) {
      const line = source.slice(0, start.index).split("\n").length;
      throw new Error(`the imports map: ${path.relative(here, file)}:${line} is an export the map cannot read: ${source.split("\n")[line - 1].trim()}`);
    }
    const [, type, clause, from] = statement;
    if (type) continue;
    const target = path.join(dir, from);
    if (clause === "*") {
      if (!fs.existsSync(`${target}.ts`)) throw new Error(`the imports map: ${from} is a star export with no .ts source`);
      readBarrel(`${target}.ts`, path.dirname(target));
      continue;
    }
    for (const raw of clause.slice(1, -1).split(",")) {
      const item = raw.trim();
      if (!item || item.startsWith("type ")) continue;
      const [local, exported = local] = item.split(/\s+as\s+/);
      rootMap[exported] = [`./${path.relative(path.join(here, "src"), target).split(path.sep).join("/")}.js`, local];
    }
  }
};
readBarrel(path.join(here, "src", "index.ts"), path.join(here, "src"));

// The release notes' Sources popup is the fourth (a source line loads it on first use, release-notes.tsx), built the same way and for the same reason: a
// page of releases draws no popup until a reader asks for one, so the popup, its positioning and Floating UI are not in ReleaseNotes' first load. It
// imports nothing of Basalt's (the page draws what it holds and hands it in), and Base UI's popover is inlined too: left external, an app's bundler
// finds Base UI's popover in both this lazy file and the static Popover (feedback.tsx) and makes it a shared chunk that every import of that module
// then loads (ReleaseIndex went from 31 KB to 144 KB for an accordion), because it assigns chunks before it shakes. Only React stays external.
const reactOnly = ["react", "react/*", "react-dom", "react-dom/*"];
// Base UI reads use-sync-external-store, which is CommonJS that requires React: an ES module cannot inline it (its require would fail in a browser), and
// left external it would be one more module shared with the static graph. Basalt needs React 19, which has useSyncExternalStore itself, and Base UI's
// selector path (with-selector) runs only before React 19, so the two are answered from React here.
const storeFromReact = {
  name: "store-from-react",
  setup(build) {
    build.onResolve({ filter: /^use-sync-external-store\/shim(\/with-selector)?(\.js)?$/ }, (args) => ({ path: args.path, namespace: "store-from-react" }));
    build.onLoad({ filter: /.*/, namespace: "store-from-react" }, (args) => ({
      contents: /with-selector/.test(args.path)
        ? 'import { useSyncExternalStore } from "react"; export function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector) { return useSyncExternalStore(subscribe, () => selector(getSnapshot()), getServerSnapshot ? () => selector(getServerSnapshot()) : undefined); }'
        : 'export { useSyncExternalStore } from "react";',
      loader: "js",
    }));
  },
};
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/release-sources.tsx")],
  outdir: dist,
  external: reactOnly,
  plugins: [storeFromReact],
  banner: { js: `"use client";` },
});

// The rail's tooltip for the version at the foot is the fifth (AppShell loads it when the rail shows a version), built the same way and, like the Sources
// popup, with Base UI's tooltip inlined, so the shell's own import is what it was. Its one cost: the shell's TooltipProvider does not reach this copy, so
// the version's tooltip keeps its own open delay rather than the rail's shared one.
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/rail-tooltip.tsx")],
  outdir: dist,
  external: reactOnly,
  plugins: [storeFromReact, { name: "lazy-flight", setup(build) { build.onResolve({ filter: /^\.\/glyph-flight$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./glyph-flight.js", external: true } : undefined)); } }],
  banner: { js: `"use client";` },
});

// The anchored popover is the sixth (cimip-gaps-3 T2: Stat's hint and a rail stage's detail load it the first time one opens, lazy-popover.ts), built the
// same way and for the same reason as the Sources popup: Base UI's popover is inlined and nothing of Basalt's is imported (the level and layer are handed in),
// so a Stat or a StageRail that never opens one is what it was.
await esbuild.build({
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  jsx: "automatic",
  logLevel: "warning",
  entryPoints: [path.join(here, "src/anchored-popover.tsx")],
  outdir: dist,
  external: reactOnly,
  plugins: [storeFromReact],
  banner: { js: `"use client";` },
});

await esbuild.build({
  // One module per source file: with "sideEffects" limited to CSS, an app's bundler drops
  // every module it doesn't import (an app using Button never loads Menu, Base UI's menu or Shiki).
  // The core glyphs are modules of their own (src/glyphs), so an app that imports HomeGlyph bundles only HomeGlyph.
  entryPoints: [
    // index.ts is not bundled: it is a barrel of `export { … } from "./module"` and is written as one, below, so each export comes from the module that holds it.
    ...fs.readdirSync(path.join(here, "src")).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts") && !["command-panel.tsx", "glyph-flight.tsx", "diagram-motion.tsx", "diagram-motion-core.ts", "diagram-interop.ts", "diagram-viewer.tsx", "diagram-actions.tsx", "diagram-zoom-core.ts", "diagram-elk.ts", "release-sources.tsx", "rail-tooltip.tsx", "anchored-popover.tsx", "index.ts"].includes(f)).map((f) => path.join(here, "src", f)),
    ...fs.readdirSync(path.join(here, "src", "glyphs")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "glyphs", f)),
    // The service marks (DECISIONS 292, 2.6): one module a mark under dist/marks, at @srasyndicate/basalt/marks/<id>, never imported by the index, so an
    // app pays for the marks it imports and no others. Generated by marks/generate.mjs.
    ...fs.readdirSync(path.join(here, "src", "marks")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "marks", f)),
    // Development tooling (the headroom check): its own entry under dist/testing, imported by no component and not exported from the root.
    ...fs.readdirSync(path.join(here, "src", "testing")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "testing", f)),
    // Build tooling (the opt-in Phosphor weights plugin): its own entry under dist/tooling, at @srasyndicate/basalt/phosphor.
    ...fs.readdirSync(path.join(here, "src", "tooling")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "tooling", f)),
  ],
  define: { __PHOSPHOR_NOTICE__: JSON.stringify(phosphorNotice), __BASALT_ROOT_MAP__: JSON.stringify(JSON.stringify(rootMap)) },
  plugins: [{ name: "lazy-modules", setup(build) { build.onResolve({ filter: /^\.\/(command-panel|glyph-flight|diagram-motion|diagram-viewer|diagram-layout|diagram-text|diagram-actions|diagram-elk|release-sources|rail-tooltip|anchored-popover)$/ }, (args) => (args.kind === "dynamic-import" ? { path: `${args.path}.js`, external: true } : undefined)); } }],
  outdir: dist,
  bundle: true,
  splitting: true,
  // Beside the entries, not in a folder: the lazy panel is imported as "./command-panel.js" from wherever its importer lands.
  chunkNames: "[name]-[hash]",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  // The "use client" directive is added after the build, to the modules that need it (below).
  jsx: "automatic",
  external,
  logLevel: "warning",
});

// The package entry is a barrel with no directive of its own, so a React Server Component can import a function or a constant from it: each export is
// re-exported from the module that holds it, and that module is a client module (it has the directive) only if it draws or holds state. Bundled, the
// entry would hold every component's code and have to be one client module whole. Written as it is in src/index.ts, with the extensions Node and bundlers need.
const barrel = await esbuild.transform(fs.readFileSync(path.join(here, "src", "index.ts"), "utf8"), { loader: "ts", format: "esm", target: "es2022" });
fs.writeFileSync(path.join(dist, "index.js"), barrel.code.replace(/\bfrom "(\.\/[^"]+)"/g, 'from "$1.js"'));

// With code splitting, esbuild leaves a bare `import "./chunk-….js";` in a file whose chunk it imported and then used nothing from (a
// component's helper that only another entry draws). The package declares its JavaScript free of side effects, so an app's bundler drops
// each of them, and esbuild says so with an `ignored-bare-import` warning on every build (16 of them for an app that imports Button).
// Nothing a module needs is lost: every chunk that holds code is still imported by name from some file, which is checked here.
const chunkImport = /^import "\.\/(chunk-[A-Z0-9]+\.js)";\n/gm;
const built = fs.readdirSync(dist).filter((f) => f.endsWith(".js"));
for (const file of built) {
  const source = fs.readFileSync(path.join(dist, file), "utf8");
  const stripped = source.replace(chunkImport, "");
  if (stripped !== source) fs.writeFileSync(path.join(dist, file), stripped);
}
const imported = built.map((file) => fs.readFileSync(path.join(dist, file), "utf8")).join("\n");
for (const chunk of built.filter((f) => f.startsWith("chunk-"))) {
  if (imported.includes(`"./${chunk}"`)) continue;
  // The one chunk nothing imports by name is a source file with no runtime code (types only): it holds nothing but comments, and goes.
  if (fs.readFileSync(path.join(dist, chunk), "utf8").replace(/\/\/.*|\s/g, "") !== "") throw new Error(`${chunk} holds code and is imported by no file once its bare imports are gone`);
  fs.rmSync(path.join(dist, chunk));
}

// A React Server Component can use what a module exports only if the module is not a client module: a function or a constant imported from one is a
// reference there (`formatStamp()` throws, `CONFIRM_MS / 1000` is NaN). So `"use client"` goes on the modules that draw or hold state, and only on them: a module
// whose own code, and the shared chunks it imports, import none of React, Base UI, Phosphor or cmdk holds no component and no hook, and carries none. A chunk
// never carries it (an app reaches a chunk only through a module). Another module a file imports decides for itself. The package's "index" is a barrel that
// imports React nowhere, so it has none: every component it re-exports comes from a module that has it. Which modules those are is checked by the packed
// consumer (scripts/verify-packages.mjs) and by test/server-modules.test.mjs.
const clientImport = /^(react|react-dom|@base-ui|@phosphor-icons|cmdk)(\/|$)/;
const staticImports = (source) => [...source.matchAll(/(?:\bfrom|^import)\s*"([^"]+)"/gm)].map((match) => match[1]);
const needsClient = (file, seen = new Set()) => {
  if (seen.has(file)) return false;
  seen.add(file);
  return staticImports(fs.readFileSync(path.join(dist, file), "utf8")).some((specifier) => clientImport.test(specifier) || (/^\.\/chunk-/.test(specifier) && needsClient(specifier.slice(2), seen)));
};
for (const file of fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".js") && !path.basename(f).startsWith("chunk-") && !["command-panel.js", "glyph-flight.js", "diagram-motion.js", "diagram-interop.js", "diagram-viewer.js", "diagram-actions.js", "diagram-elk.js", "release-sources.js", "rail-tooltip.js", "anchored-popover.js"].includes(f))) {
  const code = fs.readFileSync(path.join(dist, file), "utf8");
  if (needsClient(file)) fs.writeFileSync(path.join(dist, file), `"use client";\n${code}`);
}

// A lazy module (one a sibling reaches by `import("./x.js")`) is an entry of its own in an app's bundle, and an app's bundler assigns shared chunks before
// it shakes, so whatever the lazy module reaches through a dist chunk lands in a chunk that every root import loads (cimip-gaps-3 E5: diagram-actions.js
// built here reached Button's chunk, and formatRunTime went from 649 bytes to 19,114). So a chunk a lazy module reaches may import React and nothing else:
// no other chunk, no Base UI, Phosphor, cmdk or Shiki. A lazy module that needs more is built on its own above, with what it needs inlined.
{
  const topImports = (source) => [...source.matchAll(/^import\s[^;"]*?"([^"]+)"/gm)].map((match) => match[1]);
  const reactOnlyImport = /^(react|react-dom)(\/|$)/;
  const files = fs.readdirSync(dist).filter((f) => f.endsWith(".js"));
  const lazy = new Set(files.flatMap((file) => [...fs.readFileSync(path.join(dist, file), "utf8").matchAll(/\bimport\(\s*"\.\/([^"/]+\.js)"\s*\)/g)].map((match) => match[1])));
  for (const file of lazy) {
    for (const chunk of topImports(fs.readFileSync(path.join(dist, file), "utf8")).filter((specifier) => /^\.\/chunk-/.test(specifier))) {
      const beyond = topImports(fs.readFileSync(path.join(dist, chunk), "utf8")).filter((specifier) => !reactOnlyImport.test(specifier));
      if (beyond.length) throw new Error(`the lazy ${file} imports ${chunk.slice(2)}, which imports ${beyond.join(", ")}: an app's bundler would put that in a chunk every root import loads. Build ${file} on its own (as diagram-actions is) or keep what it shares to React-only code`);
    }
  }
}

execFileSync(path.join(path.dirname(require.resolve("typescript/package.json")), "bin", "tsc"), ["-p", here], { stdio: "inherit" });

// The declarations name their siblings as Node's resolution needs ("./glyph-set.js"), so an app type-checked under node16 or nodenext can name a glyph.
// The rule, and why, is declaration-specifiers.mjs (its test runs the same code): only real module specifiers, never a comment. A specifier that names
// nothing in dist fails the build, as a declaration that points nowhere would fail an app.
{
  const { nodeSpecifier, rewriteSpecifiers } = await import(pathToFileURL(path.join(here, "declaration-specifiers.mjs")).href);
  for (const file of fs.readdirSync(dist, { recursive: true }).filter((f) => f.endsWith(".d.ts"))) {
    const source = fs.readFileSync(path.join(dist, file), "utf8");
    const written = rewriteSpecifiers(source, nodeSpecifier(fs, path, path.dirname(path.join(dist, file)), file));
    if (written !== source) fs.writeFileSync(path.join(dist, file), written);
  }
}

// The two head scripts as files (dist/head/theme.js and dist/head/loops.js), for an app whose content policy forbids an inline script (`script-src 'self'`): it
// serves the file from its own origin and loads it with a plain `<script src>` in `<head>` (no `async`, `defer` or `type="module"`, which would run it after the
// first frame). Each file is the exported string itself, character for character (test/content-policy.test.mjs), so the two forms never drift.
const { themeBootstrap } = await import(pathToFileURL(path.join(dist, "theme-bootstrap.js")).href);
const { loopsBootstrap } = await import(pathToFileURL(path.join(dist, "loops-bootstrap.js")).href);
fs.mkdirSync(path.join(dist, "head"), { recursive: true });
fs.writeFileSync(path.join(dist, "head", "theme.js"), themeBootstrap);
fs.writeFileSync(path.join(dist, "head", "loops.js"), loopsBootstrap);

// The accent classes are generated with the tokens and ship with the components, whose Badge is the one reader of them.
const accents = fs.readFileSync(require.resolve("@srasyndicate/basalt-tokens/accents.css"), "utf8");
// `%glyph-mask:name%` in the stylesheet is a core glyph's drawing as a mask (glyph-mask.mjs).
const { withGlyphMasks } = await import(pathToFileURL(path.join(here, "glyph-mask.mjs")).href);
const components = `${withGlyphMasks(fs.readFileSync(path.join(here, "src/styles/components.css"), "utf8"))}\n${accents}`;

// Geist Sans and Mono, variable (SIL OFL 1.1, licence shipped beside the files).
const geist = path.join(packageDir("geist"), "dist", "fonts");
fs.mkdirSync(path.join(dist, "fonts"), { recursive: true });
for (const [dir, file] of [["geist-sans", "Geist-Variable.woff2"], ["geist-mono", "GeistMono-Variable.woff2"]]) {
  fs.copyFileSync(path.join(geist, dir, file), path.join(dist, "fonts", file));
}
fs.copyFileSync(path.join(packageDir("geist"), "LICENSE.txt"), path.join(dist, "fonts", "OFL.txt"));
const fonts = [
  "/* Geist Sans and Geist Mono, variable fonts. SIL Open Font License 1.1: see fonts/OFL.txt. */",
  '@font-face { font-family: "Geist"; src: url("./fonts/Geist-Variable.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }',
  '@font-face { font-family: "Geist Mono"; src: url("./fonts/GeistMono-Variable.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }',
  "/* Geist Fallback: a local face that stands in for Geist until it arrives, so the swap moves a page as little as it can (DECISIONS 137). One face",
  "   per Basalt weight, because Arial has a regular and a bold and Geist's three weights differ in width: size-adjust is Geist's width over",
  "   Arial's, measured on the Geist file above (400: 102.4%, 500: 104.7%, 600 against Arial Bold: 99.5%, on 3,100 characters of English), and",
  "   the overrides are Geist's own ascent (1.005em) and descent (0.295em) divided by that size-adjust, so a baseline sits where Geist's will. It",
  "   reduces the shift and does not promise the same wrap at every width: a line within a percent of Geist's width can still break elsewhere. Where",
  "   Arial is not installed the next family in font-family-sans answers. */",
  '@font-face { font-family: "Geist Fallback"; src: local("Arial"), local("ArialMT"); font-weight: 400; font-style: normal; size-adjust: 102.4%; ascent-override: 98.1%; descent-override: 28.8%; line-gap-override: 0%; }',
  '@font-face { font-family: "Geist Fallback"; src: local("Arial"), local("ArialMT"); font-weight: 500; font-style: normal; size-adjust: 104.7%; ascent-override: 96%; descent-override: 28.2%; line-gap-override: 0%; }',
  '@font-face { font-family: "Geist Fallback"; src: local("Arial Bold"), local("Arial-BoldMT"); font-weight: 600; font-style: normal; size-adjust: 99.5%; ascent-override: 101%; descent-override: 29.6%; line-gap-override: 0%; }',
  "",
].join("\n");
fs.writeFileSync(path.join(dist, "fonts.css"), fonts);
const tokens = fs.readFileSync(require.resolve("@srasyndicate/basalt-tokens/tokens.css"), "utf8");
// The two style sheets ship without their comments and whitespace (minify-css.mjs); the commented source stays in the repository and in the demo page below.
fs.writeFileSync(path.join(dist, "components.css"), minifyCss(components));
fs.writeFileSync(path.join(dist, "styles.css"), minifyCss(`${tokens}\n${components}`));

// The demo page: every component, both themes, bundled with React for the browser tests.
const demo = path.join(here, ".demo");
fs.mkdirSync(demo, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(here, "test/demo.tsx")],
  outfile: path.join(demo, "demo.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
fs.cpSync(path.join(dist, "fonts"), path.join(demo, "fonts"), { recursive: true });
// The demo draws with the sheet as it ships (styles.css, comments and whitespace out), so the pixel proof of a build compares what an app gets.
fs.writeFileSync(path.join(demo, "styles.css"), `${fonts}\n${fs.readFileSync(path.join(dist, "styles.css"), "utf8")}`);
fs.writeFileSync(
  path.join(demo, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basalt components</title>
<link rel="stylesheet" href="styles.css"><style>
body{margin:0;background:var(--basalt-surface-page);font-family:var(--basalt-font-family-sans)}
.themes{display:grid;grid-template-columns:1fr 1fr}
.theme{background:var(--basalt-surface-page);color:var(--basalt-text-primary);padding:32px;display:flex;flex-direction:column;gap:24px;min-width:0}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.h{margin:0;font:var(--basalt-font-weight-semibold) var(--basalt-text-sm-size)/var(--basalt-text-sm-line-height) var(--basalt-font-family-sans);color:var(--basalt-text-secondary)}
@media (max-width:900px){.themes{grid-template-columns:1fr}.theme{padding:16px}}
</style></head><body><div id="root"></div><script type="module" src="demo.js"></script></body></html>\n`,
);
console.log("basalt components built");
