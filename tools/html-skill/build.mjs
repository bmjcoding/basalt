// Builds the Basalt HTML skill (.agent/skills/basalt-html/) from its sources in tools/html-skill/src/:
//
//   compose.mjs               src/compose.mjs, copied: the tool an agent runs to make a page from a body fragment
//   parts/manifest.json       src/modules.json: which module a page gets for which class, attribute or tag
//   parts/core.css            the generated Basalt tokens (both themes) + src/core.css, minified
//   parts/core.js             src/core.js, minified
//   parts/<module>.css|js     src/modules/<module>.css|js, minified; compose.mjs adds the ones a page uses
//   parts/accent.css          the accent module: packages/tokens/dist/css/accents.css (the generated accent classes), minified; a page gets
//                             it only when its markup sets data-accent. The one reader of --basalt-accent-ink is status.css.
//   parts/art.css             the chart, art, aspect and stage-headroom tokens, taken out of core.css; a page gets it only when its body names one of them
//   parts/icons.json          the Phosphor icons in src/icons.json (Bold paths: the skill draws Bold at every size) and Phosphor's MIT notice
//   parts/usage/<name>.md     src/usage/<name>.md, copied as prose: what `compose.mjs --usage <name>` prints. One for the core and one per
//                             module; a module without a usage file, or a usage file without a module, fails the build.
//   parts/geist.css           Geist and Geist Mono as data URIs; compose.mjs inlines it into a page
//   examples/*.body.html      src/examples/*.body.html, copied: two example bodies for compose.mjs
//
//   node tools/html-skill/build.mjs                  write the files (committed; a test fails if they drift)
//   node tools/html-skill/build.mjs --out <dir>      write somewhere else
//
// Run `npm run build` first: the tokens CSS comes from packages/tokens/dist. SKILL.md is written by hand (its index of modules is what
// `compose.mjs --usage` with no name prints).
// Minified with esbuild (a dev dependency, in the root package.json); legal comments (/*!) are kept.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { GLYPHS, NAMES, knockOf, loopsOf, slots } from "../../packages/react/glyphs/source.mjs";
import { iconData } from "./icons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const srcDir = path.join(here, "src");
const src = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");
export const skillDir = path.join(repo, ".agent", "skills", "basalt-html");
const require = createRequire(import.meta.url);

// Every in-flow panel shares one set of level rules. The selector is written once here.
const PANEL = ":is(.panel, .card, .callout, .code, .table-wrap)";

function tokensFile(name) {
  let file;
  try {
    file = require.resolve(`@srasyndicate/basalt-tokens/${name}`);
  } catch {
    throw new Error(`html-skill: can't find the tokens ${name}; run \`npm run build\` first`);
  }
  if (!fs.existsSync(file)) throw new Error("html-skill: packages/tokens/dist is missing; run `npm run build` first");
  return fs.readFileSync(file, "utf8").trim();
}
const tokensCss = () => tokensFile("tokens.css");

/**
 * The generated tokens declare every alias again in the dark `prefers-color-scheme` block, because a nested
 * `[data-theme="dark"]` scope must re-resolve them. That block only ever applies to the root element, which has
 * already declared the same alias in the light block, so a declaration the two blocks share word for word is dropped
 * from it. Nothing else in the tokens changes.
 */
function dedupeSystemDark(css) {
  const light = css.match(/:root, \[data-theme="light"\], \.light \{([^}]*)\}/)?.[1];
  if (!light) throw new Error("html-skill: the light token block moved; update dedupeSystemDark");
  const lines = new Set(light.split("\n").map((l) => l.trim()).filter(Boolean));
  return css.replace(/(@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\):not\(\.light\) \{)([^}]*)(\})/, (_, open, body, close) =>
    open + body.split("\n").filter((l) => !lines.has(l.trim())).join("\n") + close);
}

/**
 * The token groups only some pages name: the chart roles and lengths, the art colours and the stage's headroom, and the aspect ratios. They
 * are not in every page's core (the core is capped, DECISIONS 79); they are the `art` module, which a page gets when its body names one of
 * them (a `var(--basalt-art-tone-2)` in its own `<style>` is enough). The same declarations, in the same blocks, so a nested theme root still
 * resolves them.
 */
const MODULE_TOKEN = /^--basalt-(?:chart-|size-chart-|art-|aspect-|size-stage-headroom\b)/;

/** The tokens CSS with each block's declarations kept where `keep(name)` is true; a block left with none is dropped, and so is a media rule left empty. */
function filterTokens(css, keep) {
  const kept = css.replace(/\{([^{}]*)\}/g, (_, body) => {
    const lines = body.split("\n").filter((line) => { const name = line.trim().match(/^(--[\w-]+):/)?.[1]; return name ? keep(name) : keep.keepsOther; });
    return lines.some((line) => line.trim()) ? `{${lines.join("\n")}}` : "{}";
  });
  return kept.replace(/[^{}]*\{\}/g, "").replace(/@media[^{}]*\{\s*\}/g, "").replace(/\n{3,}/g, "\n\n");
}
const inCore = Object.assign((name) => !MODULE_TOKEN.test(name), { keepsOther: true });
const inArt = Object.assign((name) => MODULE_TOKEN.test(name), { keepsOther: false });

function findPackage(name) {
  for (let dir = here; dir !== path.dirname(dir); dir = path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) return candidate;
  }
  throw new Error(`html-skill: can't find ${name}; run npm install`);
}

/** A package's licence file as a legal comment (/*!, which a minifier keeps): a line saying what it covers, then the package's own text, whole. */
const licenceComment = (file, covers) => `/*! ${covers}\n${fs.readFileSync(file, "utf8").trim().replaceAll("*/", "* /")}\n*/`;

/** The two @font-face rules as data URIs, with the SIL OFL 1.1 text in full. The skill's geist.css. */
function geistFonts() {
  const dir = path.join(findPackage("geist"), "dist", "fonts");
  const uri = (sub, file) => `data:font/woff2;base64,${fs.readFileSync(path.join(dir, sub, file)).toString("base64")}`;
  return [
    "/* Geist Sans and Geist Mono, variable fonts, inlined as data URIs. Built by tools/html-skill/build.mjs; do not edit. */",
    licenceComment(path.join(findPackage("geist"), "LICENSE.txt"), "Geist Sans and Geist Mono:"),
    `@font-face { font-family: "Geist"; src: url("${uri("geist-sans", "Geist-Variable.woff2")}") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }`,
    `@font-face { font-family: "Geist Mono"; src: url("${uri("geist-mono", "GeistMono-Variable.woff2")}") format("woff2"); font-weight: 100 900; font-style: normal; font-display: swap; }`,
  ].join("\n");
}

/** esbuild's minifier: whitespace, comments and redundant syntax go; a /*! comment stays. The sources keep their comments. */
const minify = (code, loader) => esbuild.transformSync(code, { loader, minify: true, legalComments: "inline", charset: "utf8", logLevel: "silent" }).code;
/** `%icon:Name%` in a source stylesheet is a data URI of that Phosphor Bold glyph (for a mask), so a glyph is never copied into the CSS by hand. */
const iconUri = (name) => {
  const bold = iconData([name])[name];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>${bold.map((d) => `<path d='${d}'/>`).join("")}</svg>`;
  return `data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E")}`;
};
/**
 * `%bp-md%`, `%bp-lg%` and `%bp-container%` in a source stylesheet are the layout tokens' breakpoints (size-breakpoint-md, -lg, -container, DECISIONS 101), read
 * from the generated tokens package and written as range syntax in a media query (`@media (width < %bp-md%)`), so no source carries the number (foundations, "Layout").
 */
async function breakpoints() {
  tokensFile("breakpoints"); // fails with the plain message when the tokens are not built
  const { breakpoint } = await import(pathToFileURL(require.resolve("@srasyndicate/basalt-tokens/breakpoints")).href);
  return { md: `${breakpoint.md}px`, lg: `${breakpoint.lg}px`, container: `${breakpoint.container}px` };
}
const BREAKPOINTS = await breakpoints();
const minifyCss = (css) => minify(css.replaceAll("%panel%", PANEL).replace(/%bp-(md|lg|container)%/g, (_, name) => BREAKPOINTS[name]).replace(/%icon:(\w+)%/g, (_, name) => iconUri(name)).replace(/%glyph-mask:([\w-]+)%/g, (_, name) => glyphMaskUri(name)), "css");

/**
 * `%glyph:name%` in a module's source is the path of a core glyph (packages/react/glyphs/source.mjs, the drawn set), read from the set and never copied
 * by hand: the lines of a line glyph as one path on the 24 grid, drawn with a 2.25 round stroke. The core `external` glyph is the new-tab arrow.
 */
const glyphPath = (name) => {
  const glyph = GLYPHS[name];
  // A glyph with its own drawing (`s`), or one the set derives by turning another (close is plus turned 45 degrees): its slots, read from the set.
  if (!glyph || !(glyph.s || glyph.of)) throw new Error(`html-skill: "${name}" is not a core glyph with a drawing`);
  const drawing = glyph.s ?? slots(name);
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  return drawing.filter((slot) => slot[8]).map(([x0, y0, x1, y1, x2, y2, x3, y3]) => {
    const straight = near(x1, x0 + (x3 - x0) / 3) && near(y1, y0 + (y3 - y0) / 3) && near(x2, x0 + (2 * (x3 - x0)) / 3) && near(y2, y0 + (2 * (y3 - y0)) / 3);
    return straight ? `M${x0} ${y0}L${x3} ${y3}` : `M${x0} ${y0}C${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
  }).join("");
};
/** `%glyph-mask:name%` in a source stylesheet is a data URI of that core glyph, drawn with the set's 2.25 round stroke on the 24 grid, for a mask (a pressed toggle's check). */
const glyphMaskUri = (name) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='${glyphPath(name)}' fill='none' stroke='black' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  return `data:image/svg+xml,${svg.replace(/</g, "%3C").replace(/>/g, "%3E")}`;
};

/**
 * The core set drawn for the page (`parts/glyphs.json`): each glyph's inner SVG markup at rest and selected, worked out here from the drawn set the way
 * packages/react/src/glyph.tsx works it out at run time (the settled drawing: eight slots, the loops filled, the knocked strokes cut out as a mask, a
 * point drawn heavier). A page carries only the glyphs it names (`data-glyph="home"`), as it carries only the icons it names. `@` in a mask's id is
 * replaced with a number for each drawing, by the glyph module. A glyph with no loops is drawn the same selected, so it has one drawing.
 */
const STROKE = 2.25;
const r3 = (n) => Math.round(n * 1000) / 1000;
const reachOf = (s) => Math.hypot(s[6] - s[0], s[7] - s[1]) + Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[6], s[5] - s[7]);
const widthOfReach = (l) => (l >= STROKE ? STROKE : STROKE * (1 + 0.5 * (1 - l / STROKE)));
const slotPath = (s, l, move = true) => `${move ? `M${r3(s[0])} ${r3(s[1])}` : ""}${l < 1e-3 ? `L${r3(s[6])} ${r3(s[7])}` : `C${r3(s[2])} ${r3(s[3])} ${r3(s[4])} ${r3(s[5])} ${r3(s[6])} ${r3(s[7])}`}`;
function glyphMarkup(name, selected) {
  const sl = slots(name, selected);
  const loops = loopsOf(name);
  const knock = knockOf(name);
  const base = GLYPHS[name].of ? GLYPHS[GLYPHS[name].of] : GLYPHS[name];
  const f = selected && loops.length ? 1 : 0;
  const reach = sl.map(reachOf);
  const strokes = `<g fill="none" stroke="currentColor" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${sl.map((s, i) => {
    const opacity = s[8] * (knock.includes(i) ? 1 - f : 1);
    if (opacity < 0.002) return "";
    const w = widthOfReach(reach[i]);
    return `<path d="${slotPath(s, reach[i])}"${Math.abs(w - STROKE) > 1e-6 ? ` stroke-width="${r3(w)}"` : ""}${opacity < 0.999 ? ` stroke-opacity="${r3(opacity)}"` : ""}/>`;
  }).join("")}</g>`;
  if (f <= 0.001 || !loops.length) return strokes;
  const holes = knock.filter((i) => (sl[i]?.[8] ?? 0) > 0.001);
  const fill = loops.map((loop) => `${loop.map((i, k) => slotPath(sl[i], reach[i], k === 0)).join("")}Z`).join("");
  const mask = holes.length
    ? `<mask id="@" maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="#fff"/><g fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round">${holes.map((i) => `<path d="${slotPath(sl[i], reach[i])}" stroke-width="${r3(widthOfReach(reach[i]))}"${sl[i][8] < 0.999 ? ` stroke-opacity="${r3(sl[i][8])}"` : ""}/>`).join("")}</g></mask>`
    : "";
  return `${mask}<g${holes.length ? ' mask="url(#@)"' : ""}><path d="${fill}" fill="currentColor"${base.evenodd ? ' fill-rule="evenodd"' : ""}/>${base.cutKnock ? strokes : ""}</g>${base.cutKnock ? "" : strokes}`;
}
/** { name: [rest, selected] } for every core glyph that is not a board drawing; selected is left out when it is the same drawing. */
function glyphData() {
  const out = {};
  for (const name of NAMES) {
    if (GLYPHS[name].board) continue;
    const rest = glyphMarkup(name, false);
    const selected = glyphMarkup(name, true);
    out[name] = selected === rest ? [rest] : [rest, selected];
  }
  return out;
}
/**
 * `%glyph-svg:name%` in a module's script is the whole SVG of a core glyph at rest, 16px: exactly what the glyph module's `Basalt._.glyph(name)` returns, written in at
 * build time from the drawn set. A module that draws a core glyph itself (the menu's check, the copy button's copy) uses it, so the page carries that one drawing and not the glyph module.
 */
const glyphSvg = (name) => {
  if (!GLYPHS[name] || GLYPHS[name].board) throw new Error(`html-skill: "${name}" is not a core glyph the page can draw`);
  return `<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" focusable="false">${glyphMarkup(name, false)}</svg>`;
};
const minifyJs = (code) => minify(code.replace(/%glyph-svg:([\w-]+)%/g, (_, name) => glyphSvg(name)).replace(/%glyph:([\w-]+)%/g, (_, name) => glyphPath(name)).replace(/%bp-(md|lg|container)%/g, (_, name) => BREAKPOINTS[name]), "js");

/** The module names in src/modules.json, in the order they are added to a page. */
export function moduleNames() {
  return Object.keys(JSON.parse(src("modules.json")).modules);
}

/** The skill's files as { relative path: contents }. SKILL.md is not among them (it is written by hand). */
export function build() {
  const manifest = JSON.parse(src("modules.json"));
  const files = {};
  files["compose.mjs"] = src("compose.mjs");
  files["parts/manifest.json"] = `${JSON.stringify(manifest, null, 2)}\n`;
  files["parts/core.css"] = minifyCss(`${dedupeSystemDark(filterTokens(tokensCss(), inCore))}\n${src("core.css")}`);
  files["parts/core.js"] = minifyJs(src("core.js"));
  for (const name of Object.keys(manifest.modules)) {
    // The accent module has no source file of its own: it is the tokens package's generated accents.css.
    if (name === "accent") files["parts/accent.css"] = minifyCss(tokensFile("accents.css"));
    // The art module is the token groups taken out of the core (see MODULE_TOKEN); it has no source file either.
    if (name === "art") files["parts/art.css"] = minifyCss(dedupeSystemDark(filterTokens(tokensCss(), inArt)));
    for (const ext of ["css", "js"]) {
      const file = path.join(srcDir, "modules", `${name}.${ext}`);
      if (fs.existsSync(file)) files[`parts/${name}.${ext}`] = ext === "css" ? minifyCss(fs.readFileSync(file, "utf8")) : minifyJs(fs.readFileSync(file, "utf8"));
    }
  }
  // The icon paths are Phosphor's (MIT), so a page that draws them carries Phosphor's whole notice, as a legal comment a minifier keeps.
  const notice = licenceComment(path.join(findPackage("@phosphor-icons/react"), "LICENSE"), "The icon paths below are from Phosphor Icons (@phosphor-icons/react):");
  files["parts/icons.json"] = `${JSON.stringify({ notice, icons: iconData(JSON.parse(src("icons.json"))) })}\n`;
  files["parts/glyphs.json"] = `${JSON.stringify(glyphData())}\n`;
  files["parts/geist.css"] = `${geistFonts()}\n`;
  // The usage text is prose, so it is copied as it is: one file for the core and one for each module.
  const usageDir = path.join(srcDir, "usage");
  const usageNames = ["core", ...Object.keys(manifest.modules)];
  const usageFiles = fs.readdirSync(usageDir).filter((f) => !f.startsWith(".")).sort();
  for (const name of usageNames) if (!usageFiles.includes(`${name}.md`)) throw new Error(`html-skill: ${name} has no usage text; write src/usage/${name}.md`);
  for (const file of usageFiles) if (!usageNames.includes(file.replace(/\.md$/, "")) || !file.endsWith(".md")) throw new Error(`html-skill: src/usage/${file} is not the usage of the core or a module in modules.json`);
  for (const name of usageNames) files[`parts/usage/${name}.md`] = src(`usage/${name}.md`);
  for (const name of fs.readdirSync(path.join(srcDir, "examples")).sort()) files[`examples/${name}`] = src(`examples/${name}`);
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = outIndex === -1 ? skillDir : path.resolve(args[outIndex + 1]);
  const files = build();
  // The folders are rebuilt whole, so a part that was renamed or dropped does not linger.
  for (const dir of ["parts", "examples"]) fs.rmSync(path.join(out, dir), { recursive: true, force: true });
  for (const [name, contents] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true });
    fs.writeFileSync(path.join(out, name), contents);
  }
  const bytes = (name) => Buffer.byteLength(files[name] ?? "");
  const core = bytes("parts/core.css") + bytes("parts/core.js");
  console.log(`basalt-html: core ${(core / 1024).toFixed(1)} KB (${bytes("parts/core.css")} css + ${bytes("parts/core.js")} js), ${moduleNames().length} modules -> ${path.relative(repo, out) || "."}`);
}
