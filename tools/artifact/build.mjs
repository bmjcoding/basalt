// Builds the Basalt reference (a Design System artifact) from this repository, so the
// reference always matches the code: tokens from packages/tokens/dist, components bundled
// from packages/react/src, fonts from the geist package.
//
//   npm run build            (tokens and components first)
//   node tools/artifact/build.mjs [out]      default out: .artifact
//
// Writes <out>/project/... : the files the artifact keeps (tokens.json, a first tokens.css,
// README.md, fonts, components/bundle.js|css, index.d.ts, lib/react*.js, and a README and
// live preview per component). Publishing is a separate step (see README.md here).

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { inlineScript } from "../inline-script.mjs";
import { README, COMPONENT_DOCS, PREVIEWS, COVER } from "./content.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const react = path.join(repo, "packages", "react");
const require = createRequire(path.join(react, "package.json"));
const esbuild = require("esbuild");

const out = path.resolve(process.argv[2] ?? path.join(repo, ".artifact"));
const project = path.join(out, "project");
fs.rmSync(out, { recursive: true, force: true });
const write = (rel, data) => {
  const file = path.join(project, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

const TITLE = "Basalt";
const NS = "Basalt";
const REACT_VERSION = JSON.parse(fs.readFileSync(require.resolve("react/package.json"), "utf8")).version;

// ---------------------------------------------------------------- tokens

const built = JSON.parse(fs.readFileSync(path.join(repo, "packages/tokens/dist/json/tokens.json"), "utf8"));
const source = (f) => JSON.parse(fs.readFileSync(path.join(repo, "packages/tokens/tokens", f), "utf8"));
const themeSrc = { dark: source("theme.dark.tokens.json"), light: source("theme.light.tokens.json") };
const primSrc = source("primitives.tokens.json");
const THEMES = ["dark", "light"]; // dark first: Basalt's primary theme

/** dotted DTCG path -> the published name (color.surface.page -> basalt-surface-page) */
const pub = (p) => `basalt-${(p[0] === "color" ? p.slice(1) : p).join("-")}`;

/** Walk a DTCG tree: [path, token] for every token. */
function* walk(node, at = []) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith("$") || typeof v !== "object" || v === null) continue;
    if ("$value" in v) yield [[...at, k], v];
    else yield* walk(v, [...at, k]);
  }
}
const describe = (tree, p) => {
  let node = tree;
  for (const k of p) node = node?.[k];
  return node?.$description;
};
const refOf = (v) => (typeof v === "string" && /^\{[^}]+\}$/.test(v) ? v.slice(1, -1).split(".") : null);

// Which semantic tokens use each primitive, per theme: the primitives' usage notes.
const usedBy = {};
for (const theme of THEMES) {
  for (const [p, tok] of walk(themeSrc[theme])) {
    const r = refOf(tok.$value);
    if (r) (usedBy[pub(r)] ??= new Set()).add(`${pub(p)} (${theme})`);
  }
}


const colorTokens = [];
const shadowTokens = [];
// primitives first (named, fixed in both themes), then semantic per theme
for (const [p, tok] of walk(primSrc)) {
  if (p[0] !== "color") continue;
  const name = pub(p);
  const entry = built.primitives[name.slice(7)];
  const users = [...(usedBy[name] ?? [])];
  const desc = tok.$description ?? describe(primSrc, p.slice(0, -1).concat("$description"));
  colorTokens.push({
    name,
    value: entry.oklch,
    usage: [desc && !/named by|Only the values/.test(desc) ? desc : null, users.length ? `Used by ${users.join(", ")}.` : "A palette value; reach it through a semantic token."].filter(Boolean).join(" "),
  });
}
for (const [p, tok] of walk(themeSrc.dark)) {
  // An accent class is not a custom property: accents.css carries it, in one light-dark() value (see bundle.css below).
  if (p[0] === "color" && p[1] === "accent") continue;
  const name = pub(p);
  const key = name.slice(7);
  const value = Object.fromEntries(THEMES.map((t) => {
    let node = themeSrc[t];
    for (const k of p) node = node[k];
    const r = refOf(node.$value);
    // a colour alias where the source is one; composite values resolved
    if (r && p[0] === "color") return [t, `{${pub(r)}}`];
    const b = built[t][key];
    return [t, b.oklch ?? b.css];
  }));
  // usage notes live in the token source, so CSS, Swift and this reference share them
  const usage = tok.$description;
  if (!usage) throw new Error(`no $description for ${key} in packages/tokens/tokens/theme.*.tokens.json`);
  (p[0] === "shadow" ? shadowTokens : colorTokens).push({ name, value, usage });
}

// A primitive's own $description, e.g. "size-indicator" → size.indicator.$description.
const primDesc = (name) => {
  const [group, ...rest] = name.replace(/^basalt-/, "").split("-");
  const node = primSrc[group];
  if (!node) return undefined;
  const key = rest.join("-");
  if (node[key]?.$description) return node[key].$description;
  // nested groups such as size.control.xs
  const [sub, ...leaf] = rest;
  return node[sub]?.[leaf.join("-")]?.$description;
};
const dim = (prefix) => Object.entries(built.primitives).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [`basalt-${k}`, v.css]);
const SPACE_USE = { "0": "No gap.", "0-5": "Hairline gaps inside controls (segmented track padding); a menu popup's block padding and the inset above and below a row's plate.", "1": "Icon-to-text in tight spots; tooltip vertical padding; menu popup inline padding.", "1-5": "Icon-to-label gap in buttons.", "2": "Gaps between controls in a row; menu item padding.", "3": "Button padding at 32px; card footer vertical padding.", "4": "Card and table cell padding; field-to-field gaps.", "5": "Section gaps inside dense panels.", "6": "Dialog padding; gaps between page sections.", "8": "Gaps between major page regions.", "10": "Page side margins on desktop.", "12": "Section spacing on marketing pages.", "16": "Large vertical rhythm on marketing pages.", "24": "Hero spacing." };
const RADIUS_USE = { xs: "Badges, checkboxes, kbd.", sm: "Controls up to 32px tall.", md: "Controls 36px and up; segmented tracks; popup row plates (12 − 4 padding).", lg: "Cards, tables, menus, dialogs.", xl: "Sheets and marketing panels.", full: "Avatars and status dots only." };

const spacing = dim("space-").map(([name, value]) => ({ name, value, usage: SPACE_USE[name.slice(13)] ?? primDesc(name) ?? "Spacing step." }));
const radius = dim("radius-").map(([name, value]) => ({ name, value, usage: RADIUS_USE[name.slice(14)] }));
const SIZE_USE = { "control-xs": "24px controls, for dense toolbars.", "control-sm": "28px controls; segmented segments.", "control-md": "32px: the app default control height; table header; compact table rows.", "control-lg": "36px controls; tabs.", "control-xl": "40px controls, for marketing and touch-first forms.", "menu-row": "The plate of a Menu, Select or Combobox row (the row is 4px taller: a 40px hit area).", "menu-row-touch": "The least hit area of a row on touch.", "tap-min": "The smallest touch target; table rows on touch.", "icon-sm": "16px icons: Phosphor Bold, in controls and beside 13–14px text.", "icon-md": "20px icons: Phosphor Regular, in navigation and 40px controls.", "icon-lg": "24px icons: tab bars and empty states.", "focus-width": "The focus outline's width.", "focus-offset": "The gap between a control and its focus outline.", hairline: "Line width for borders and dividers." };
const size = dim("size-").map(([name, value]) => ({ name, value, usage: SIZE_USE[name.slice(12)] ?? primDesc(name) }));
const text = dim("text-").map(([name, value]) => {
  const [, step, part] = name.match(/^basalt-text-(\w+)-(size|line-height|tracking)$/);
  return { name, value, usage: `The ${step} step's ${part.replace("-", " ")}; see the type scale.` };
});
const weight = dim("font-weight-").map(([name, value]) => ({ name, value, usage: { regular: "Body text and descriptions.", medium: "Labels, buttons, tabs, table headers.", semibold: "Headings, titles and numbers that lead." }[name.slice(19)] }));
const DUR_USE = {
  instant: "Hover-in colour, selection.",
  press: "A button press: darken and scale.",
  fast: "Small colour changes.",
  tick: "The offset between the three dots.",
  spin: "One turn of the ring spinner.",
  fade: "The reduced-motion fade that replaces a moving spinner.",
  plate: "A larger surface settling.",
  pop: "Tooltip and menu entry.",
  frame: "One braille spinner cycle, stepped.",
  grid: "One cycle of the dot grid.",
  caret: "A text caret blink.",
  base: "Menus and other entries, when not using the pop duration.",
  slow: "Dialogs and a digit roll.",
  slower: "Sheets and drawers.",
};
const duration = dim("duration-").map(([name, value]) => ({ name, value, usage: `${DUR_USE[name.slice(16)]} Exits run at 0.75 of the entry.` }));
const easing = dim("ease-").map(([name, value]) => ({ name, value, usage: { out: "Legacy entry curve, kept so existing motion does not jump.", "in-out": "Sheets that slide.", in: "Legacy exit curve.", linear: "Spinner loops only.", standard: "Productive motion, including the press in.", decelerate: "Arrivals: tooltips and menus.", accelerate: "Departures.", settle: "A press releasing." }[name.slice(12)] }));
const layer = dim("layer-").map(([name, value]) => ({ name, value, usage: `Stacking order for ${name.slice(13)} layers.` }));

const TYPE = [
  ["Display", [["display", "5xl", 600], ["hero", "4xl", 600], ["page-title", "3xl", 600], ["section", "2xl", 600], ["card-title", "xl", 600], ["lead", "lg", 500]]],
  ["Text", [["body-docs", "md", 400], ["body", "base", 400], ["small", "sm", 400], ["label", "xs", 500]]],
];
const SAMPLE = { display: "Basalt", hero: "Run agents on ground you trust", "page-title": "Sandboxes", section: "Recent runs", "card-title": "blacksand-api", lead: "Every run starts in a fresh sandbox.", "body-docs": "The proxy logs every request, including the ones it refuses.", body: "Three sandboxes on a single k3s node.", small: "Menus, tables and sidebars.", label: "Lowercase, 3 to 32 characters." };
const STYLE_USE = { display: "Marketing display only.", hero: "Page heroes.", "page-title": "The title of an app page.", section: "Section headings.", "card-title": "Card and panel titles.", lead: "The sentence under a heading.", "body-docs": "Body in docs and marketing.", body: "Body and controls in apps.", small: "Menus, tables and sidebars.", label: "Labels and captions." };
const px = (k) => built.primitives[k].css;
const typeGroups = TYPE.map(([group, styles]) => ({
  name: group,
  family: "sans",
  styles: styles.map(([name, step, w]) => ({
    name,
    fontSize: px(`text-${step}-size`),
    lineHeight: px(`text-${step}-line-height`),
    fontWeight: w,
    letterSpacing: px(`text-${step}-tracking`),
    sample: SAMPLE[name],
    usage: STYLE_USE[name],
  })),
}));
typeGroups.push({ name: "Mono", family: "mono", styles: [{ name: "code", fontSize: px("text-xs-size"), lineHeight: px("text-xs-line-height"), fontWeight: 400, sample: "a81f3c2 · run-0142 · ⌘K", usage: "Identifiers, hashes, keys and code." }] });

const tokens = {
  name: TITLE,
  version: 1,
  color: { themes: [{ id: "dark", name: "Dark" }, { id: "light", name: "Light" }], tokens: colorTokens },
  type: {
    fonts: [
      { family: "Geist", file: "fonts/Geist-Variable.woff2", weight: "100 900", style: "normal" },
      { family: "Geist Mono", file: "fonts/GeistMono-Variable.woff2", weight: "100 900", style: "normal" },
    ],
    families: { sans: 'Geist, ui-sans-serif, system-ui, sans-serif', mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
    groups: typeGroups,
  },
  spacing: { tokens: spacing },
  radius: { tokens: radius },
  shadow: { tokens: shadowTokens },
  size: { note: "Control heights, icon sizes and focus geometry.", tokens: size },
  text: { note: "The type scale as custom properties, for components.", tokens: text },
  weight: { note: "Geist's three weights. In-between weights render differently on native, so Basalt uses whole steps.", tokens: weight },
  duration: { tokens: duration },
  easing: { tokens: easing },
  layer: { tokens: layer },
  meta: { source: "github", repo: "bmjcoding/basalt", package: "packages/tokens, packages/react", synced: new Date().toISOString().slice(0, 10) },
};
for (const fam of Object.values(tokens)) for (const t of fam?.tokens ?? []) if (!t.usage) throw new Error(`no usage note for ${t.name}`);
write("tokens.json", JSON.stringify(tokens, null, 2) + "\n");

// A first tokens.css, laid out as the page compiles it, so previews have tokens before the
// first save.
const cssVal = (v) => (typeof v === "string" && /^\{[^}]+\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v);
const themed = (t) => [...colorTokens, ...shadowTokens].map((tok) => `  --${tok.name}: ${cssVal(typeof tok.value === "string" ? tok.value : tok.value[t] ?? tok.value.dark)};`);
const others = [...spacing, ...radius, ...size, ...text, ...weight, ...duration, ...easing, ...layer].map((t) => `  --${t.name}: ${t.value};`);
const styleClasses = typeGroups.flatMap((g) => g.styles.map((s) => `.${s.name} { font-family: var(--font-${g.family}); font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${s.letterSpacing ? ` letter-spacing: ${s.letterSpacing};` : ""} }`));
const tokensCss = [
  `/* ${TITLE} — generated from tokens.json */`,
  `:root, [data-theme="dark"] {`, ...themed("dark"), `}`,
  `[data-theme="light"] {`, ...themed("light"), `}`,
  `:root {`, ...others, `  --font-sans: ${tokens.type.families.sans};`, `  --font-mono: ${tokens.type.families.mono};`, `}`,
  ...styleClasses,
  ...tokens.type.fonts.map((f) => `@font-face { font-family: "${f.family}"; src: url("${f.file}") format("woff2"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`),
  "",
].join("\n");
write("tokens.css", tokensCss);

// ---------------------------------------------------------------- fonts

const geistDir = (() => {
  for (let dir = react; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const c = path.join(dir, "node_modules", "geist");
    if (fs.existsSync(path.join(c, "package.json"))) return c;
  }
  throw new Error("geist not installed; run npm install");
})();
write("fonts/Geist-Variable.woff2", fs.readFileSync(path.join(geistDir, "dist/fonts/geist-sans/Geist-Variable.woff2")));
write("fonts/GeistMono-Variable.woff2", fs.readFileSync(path.join(geistDir, "dist/fonts/geist-mono/GeistMono-Variable.woff2")));
write("fonts/OFL.txt", fs.readFileSync(path.join(geistDir, "LICENSE.txt")));

// ---------------------------------------------------------------- libraries and bundle

// React 19 publishes no browser builds, so bundle each as a classic script on a global.
const globals = {
  name: "globals",
  setup(b) {
    const map = { react: "React", "react-dom": "ReactDOM", "react-dom/client": "ReactDOM" };
    b.onResolve({ filter: /^(react|react-dom|react-dom\/client|react\/jsx-runtime)$/ }, (a) => ({ path: a.path, namespace: "global" }));
    b.onLoad({ filter: /.*/, namespace: "global" }, (a) => {
      if (a.path === "react/jsx-runtime") {
        return { contents: "var R=window.React;function j(t,p,k){return k===undefined?R.createElement(t,p):R.createElement(t,Object.assign({},p,{key:k}))}module.exports={jsx:j,jsxs:j,Fragment:R.Fragment};", loader: "js" };
      }
      return { contents: `module.exports=window.${map[a.path]};`, loader: "js" };
    });
  },
};
const prod = { "process.env.NODE_ENV": '"production"' };
const classic = (code, name) => {
  const safe = inlineScript(code);
  if (/<\/script|<!--/i.test(safe)) throw new Error(`${name} contains </script or <!--`);
  return safe;
};

const reactLib = await esbuild.build({ stdin: { contents: "import * as R from 'react'; window.React = R;", resolveDir: react }, bundle: true, format: "iife", minify: true, define: prod, write: false, legalComments: "inline" });
write("components/lib/react.js", classic(reactLib.outputFiles[0].text, "react.js"));
const domLib = await esbuild.build({
  stdin: { contents: "import * as D from 'react-dom'; import * as C from 'react-dom/client'; window.ReactDOM = Object.assign({}, D, C);", resolveDir: react },
  bundle: true, format: "iife", minify: true, define: prod, write: false, legalComments: "inline",
  plugins: [{ name: "react-global", setup(b) { b.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "g" })); b.onLoad({ filter: /.*/, namespace: "g" }, () => ({ contents: "module.exports=window.React;", loader: "js" })); } }],
});
write("components/lib/react-dom.js", classic(domLib.outputFiles[0].text, "react-dom.js"));

const COMPONENTS = [...fs.readFileSync(path.join(react, "src/index.ts"), "utf8").matchAll(/export \{([^}]+)\} from/g)].flatMap((match) => match[1].split(",").map((name) => name.trim()).filter(Boolean));
const FAMILIES = Object.keys(COMPONENT_DOCS);
if (FAMILIES.some((name) => !PREVIEWS[name]) || Object.keys(PREVIEWS).some((name) => !COMPONENT_DOCS[name])) throw new Error("Every component family needs a guide and a preview");
const ICONS = ["CaretDownIcon", "CopyIcon", "DotsThreeIcon", "GearIcon", "MagnifyingGlassIcon", "PencilSimpleIcon", "PlayIcon", "PlusIcon", "TrashIcon", "CubeIcon", "TerminalIcon", "HouseIcon"];
const entry = `export * from ${JSON.stringify(path.join(react, "src/index.ts"))};\nexport * as Examples from ${JSON.stringify(path.join(react, "examples/completion.tsx"))};\nexport { ${ICONS.join(", ")} } from "@phosphor-icons/react";\n`;
const bundle = await esbuild.build({
  stdin: { contents: entry, resolveDir: react, loader: "ts" },
  bundle: true, format: "iife", globalName: NS, minify: true, define: prod, write: false, jsx: "automatic", target: "es2020",
  banner: { js: `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: NS, components: FAMILIES.map((name) => ({ name })) })} */` },
  plugins: [globals],
});
const bundleJs = classic(bundle.outputFiles[0].text, "bundle.js");
for (const c of [...COMPONENTS, ...ICONS]) if (!new RegExp(`\\b${c}\\b`).test(bundleJs)) throw new Error(`bundle is missing ${c}`);
write("components/bundle.js", bundleJs);
write("components/api.json", JSON.stringify({ exports: COMPONENTS, families: FAMILIES }, null, 2));

const componentsCss = [
  fs.readFileSync(path.join(react, "src/styles/components.css"), "utf8"),
  // The accent classes are generated with the tokens and read by Badge's accent tone.
  fs.readFileSync(path.join(repo, "packages/tokens/dist/css/accents.css"), "utf8"),
].join("\n");
write(
  "components/bundle.css",
  [
    "/* Basalt components. Token values live in tokens.json (tokens.css); this sheet only uses them. */",
    ":root {",
    "  /* the type families, under the names the components use */",
    "  --basalt-font-family-sans: var(--font-sans);",
    "  --basalt-font-family-mono: var(--font-mono);",
    "}",
    "/* Reduced motion: nothing moves; state changes become short fades. */",
    "@media (prefers-reduced-motion: reduce) {",
    "  :root { --basalt-duration-base: 100ms; --basalt-duration-slow: 100ms; --basalt-duration-slower: 100ms; }",
    "}",
    componentsCss,
  ].join("\n"),
);

// Preserve each declaration's imports and relative module links. Flattening and stripping
// imports loses Base UI's generic types and can create duplicate type identifiers.
for (const file of fs.readdirSync(path.join(react, "dist")).filter((f) => f.endsWith(".d.ts"))) write(`components/${file}`, fs.readFileSync(path.join(react, "dist", file), "utf8"));

// ---------------------------------------------------------------- docs, previews, cover

write("README.md", README);
for (const [name, doc] of Object.entries(COMPONENT_DOCS)) write(`components/${name}/README.md`, doc);
for (const [name, html] of Object.entries(PREVIEWS)) write(`components/${name}/preview.html`, html);
write("components/Cover/preview.html", COVER);

// the index: written by the publish step, which merges it with what the artifact holds
fs.writeFileSync(
  path.join(out, "index.json"),
  JSON.stringify({ title: TITLE, namespace: NS, libraries: [{ name: "react", version: REACT_VERSION, global: "React", file: "components/lib/react.js" }, { name: "react-dom", version: REACT_VERSION, global: "ReactDOM", file: "components/lib/react-dom.js" }] }, null, 2) + "\n",
);

const files = [];
const list = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) f.isDirectory() ? list(path.join(dir, f.name)) : files.push(path.relative(out, path.join(dir, f.name))); };
list(project);
console.log(`basalt reference: ${files.length} files in ${path.relative(repo, out)}/project (${colorTokens.length} colours, ${shadowTokens.length} shadows)`);
