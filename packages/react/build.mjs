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
import { fileURLToPath } from "node:url";

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
const external = ["react", "react/*", "react-dom", "react-dom/*", "@base-ui/react", "@base-ui/react/*", "@phosphor-icons/react", "@phosphor-icons/react/*", "cmdk", "shiki", "shiki/*"];
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

await esbuild.build({
  // One module per source file: with "sideEffects" limited to CSS, an app's bundler drops
  // every module it doesn't import (an app using Button never loads Menu, Base UI's menu or Shiki).
  // The core glyphs are modules of their own (src/glyphs), so an app that imports HomeGlyph bundles only HomeGlyph.
  entryPoints: [
    ...fs.readdirSync(path.join(here, "src")).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".d.ts") && f !== "command-panel.tsx").map((f) => path.join(here, "src", f)),
    ...fs.readdirSync(path.join(here, "src", "glyphs")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "glyphs", f)),
    // Development tooling (the headroom check): its own entry under dist/testing, imported by no component and not exported from the root.
    ...fs.readdirSync(path.join(here, "src", "testing")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "testing", f)),
    // Build tooling (the opt-in Phosphor weights plugin): its own entry under dist/tooling, at @srasyndicate/basalt/phosphor.
    ...fs.readdirSync(path.join(here, "src", "tooling")).filter((f) => /\.ts$/.test(f)).map((f) => path.join(here, "src", "tooling", f)),
  ],
  define: { __PHOSPHOR_NOTICE__: JSON.stringify(phosphorNotice) },
  plugins: [{ name: "lazy-panel", setup(build) { build.onResolve({ filter: /^\.\/command-panel$/ }, (args) => (args.kind === "dynamic-import" ? { path: "./command-panel.js", external: true } : undefined)); } }],
  outdir: dist,
  bundle: true,
  splitting: true,
  // Beside the entries, not in a folder: the lazy panel is imported as "./command-panel.js" from wherever its importer lands.
  chunkNames: "[name]-[hash]",
  format: "esm",
  platform: "neutral",
  target: "es2022",
  // A published component boundary must retain this for React Server Component consumers.
  banner: { js: '"use client";' },
  jsx: "automatic",
  external,
  logLevel: "warning",
});

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
  // The one chunk nothing imports by name is a source file with no runtime code (types only): it holds just the directive, and goes.
  if (fs.readFileSync(path.join(dist, chunk), "utf8").replace(/"use client";|\/\/.*|\s/g, "") !== "") throw new Error(`${chunk} holds code and is imported by no file once its bare imports are gone`);
  fs.rmSync(path.join(dist, chunk));
}

execFileSync(path.join(path.dirname(require.resolve("typescript/package.json")), "bin", "tsc"), ["-p", here], { stdio: "inherit" });

// The accent classes are generated with the tokens and ship with the components, whose Badge is the one reader of them.
const accents = fs.readFileSync(require.resolve("@srasyndicate/basalt-tokens/accents.css"), "utf8");
const components = `${fs.readFileSync(path.join(here, "src/styles/components.css"), "utf8")}\n${accents}`;

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
