// Builds the Basalt HTML skill (.agent/skills/basalt-html/) from its sources in tools/html-skill/src/:
//
//   compose.mjs               src/compose.mjs, copied: the tool an agent runs to make a page from a body fragment
//   parts/manifest.json       src/modules.json: which module a page gets for which class, attribute or tag
//   parts/core.css            the generated Basalt tokens (both themes) + src/core.css, minified
//   parts/core.js             src/core.js, minified
//   parts/<module>.css|js     src/modules/<module>.css|js, minified; compose.mjs adds the ones a page uses
//   parts/icons.json          the Phosphor icons in src/icons.json (Bold and Regular paths) and Phosphor's MIT notice
//   parts/geist.css           Geist and Geist Mono as data URIs; compose.mjs inlines it into a page
//   examples/*.body.html      src/examples/*.body.html, copied: two example bodies for compose.mjs
//
//   node tools/html-skill/build.mjs                  write the files (committed; a test fails if they drift)
//   node tools/html-skill/build.mjs --out <dir>      write somewhere else
//
// Run `npm run build` first: the tokens CSS comes from packages/tokens/dist. SKILL.md is written by hand.
// Minified with esbuild (a dev dependency, in the root package.json); legal comments (/*!) are kept.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { iconData } from "./icons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const srcDir = path.join(here, "src");
const src = (name) => fs.readFileSync(path.join(srcDir, name), "utf8");
export const skillDir = path.join(repo, ".agent", "skills", "basalt-html");
const require = createRequire(import.meta.url);

// Every in-flow panel shares one set of level rules. The selector is written once here.
const PANEL = ":is(.panel, .card, .callout, .code, .table-wrap)";

function tokensCss() {
  let file;
  try {
    file = require.resolve("@srasyndicate/basalt-tokens/tokens.css");
  } catch {
    throw new Error("html-skill: can't find the tokens CSS; run `npm run build` first");
  }
  if (!fs.existsSync(file)) throw new Error("html-skill: packages/tokens/dist is missing; run `npm run build` first");
  return fs.readFileSync(file, "utf8").trim();
}

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
const minifyCss = (css) => minify(css.replaceAll("%panel%", PANEL), "css");

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
  files["parts/core.css"] = minifyCss(`${dedupeSystemDark(tokensCss())}\n${src("core.css")}`);
  files["parts/core.js"] = minify(src("core.js"), "js");
  for (const name of Object.keys(manifest.modules)) {
    for (const ext of ["css", "js"]) {
      const file = path.join(srcDir, "modules", `${name}.${ext}`);
      if (fs.existsSync(file)) files[`parts/${name}.${ext}`] = ext === "css" ? minifyCss(fs.readFileSync(file, "utf8")) : minify(fs.readFileSync(file, "utf8"), "js");
    }
  }
  // The icon paths are Phosphor's (MIT), so a page that draws them carries Phosphor's whole notice, as a legal comment a minifier keeps.
  const notice = licenceComment(path.join(findPackage("@phosphor-icons/react"), "LICENSE"), "The icon paths below are from Phosphor Icons (@phosphor-icons/react):");
  files["parts/icons.json"] = `${JSON.stringify({ notice, icons: iconData(JSON.parse(src("icons.json"))) })}\n`;
  files["parts/geist.css"] = `${geistFonts()}\n`;
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
