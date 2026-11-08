// Builds the Basalt HTML skill (.agent/skills/basalt-html/) from its sources in tools/html-skill/src/:
//
//   basalt-html.css       Basalt's generated token CSS (both themes) + the primitives in src/basalt-html.css
//   basalt-html.js        src/basalt-html.js with the icon data (src/icons.json, read from Phosphor) filled in
//   template-static.html  a report or document, the CSS and JS inlined
//   template-interactive.html  a small tool, the CSS and JS inlined
//   geist.css             Geist and Geist Mono as data URIs; inline-fonts.mjs (copied from src/) puts it into a finished file
//
//   node tools/html-skill/build.mjs                  write the files (committed; a test fails if they drift)
//   node tools/html-skill/build.mjs --out <dir>      write somewhere else
//
// Run `npm run build` first: the tokens CSS comes from packages/tokens/dist.

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { inlineScript } from "../inline-script.mjs";
import { iconData } from "./icons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const src = (name) => fs.readFileSync(path.join(here, "src", name), "utf8");
export const skillDir = path.join(repo, ".agent", "skills", "basalt-html");
const require = createRequire(import.meta.url);

// Every in-flow panel shares one set of level rules. The selector is written once here.
const PANEL = ":is(.panel, .card, .callout, .code, .table-wrap)";

// Sets the theme before first paint: the stored choice, else the system's; and a hardware key already seen this session.
const THEME_INIT = `(function(){var t;try{t=localStorage.getItem("basalt-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);try{if(sessionStorage.getItem("basalt-keyboard")==="hardware")document.documentElement.setAttribute("data-keyboard","hardware")}catch(e){}})();`;

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

// The built files are pasted into pages, so they carry no comments; the sources keep theirs.
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]+/gm, "").replace(/\n{2,}/g, "\n");
const stripJs = (code) => code.replace(/\/\*[\s\S]*?\*\//g, (m) => (m.startsWith("/*{{") ? m : "")).replace(/^[ \t]*\/\/.*\n/gm, "").replace(/^[ \t]+/gm, "").replace(/\n{2,}/g, "\n");

function page(template, { css, js }) {
  return template
    .replace("<!--{{css}}-->", () => css)
    .replace("<!--{{theme-init}}-->", () => THEME_INIT)
    .replace("<!--{{js}}-->", () => inlineScript(js));
}

/** The skill's files as { name: contents }. */
export function build() {
  const primitives = stripCss(src("basalt-html.css").replaceAll("%panel%", PANEL)).trim();
  const css = [
    "/* Basalt HTML: the generated Basalt tokens (both themes), then the primitives. Built by tools/html-skill/build.mjs; do not edit. */",
    stripCss(dedupeSystemDark(tokensCss())).trim(),
    primitives,
    "",
  ].join("\n");
  // The icon paths are Phosphor's (MIT), so the script carries Phosphor's whole notice, as a legal comment a minifier keeps.
  const phosphor = licenceComment(path.join(findPackage("@phosphor-icons/react"), "LICENSE"), "The icon paths below are from Phosphor Icons (@phosphor-icons/react):");
  const js = `/* Basalt HTML script (window.Basalt). Built by tools/html-skill/build.mjs; do not edit. */\n${phosphor}\n${stripJs(src("basalt-html.js").replace("/*{{icons}}*/{}", () => JSON.stringify(iconData(JSON.parse(src("icons.json"))))))}`;
  const templates = { "template-static.html": src("template-static.html"), "template-interactive.html": src("template-interactive.html") };
  const files = { "basalt-html.css": css, "basalt-html.js": js, "geist.css": `${geistFonts()}\n`, "inline-fonts.mjs": src("inline-fonts.mjs") };
  for (const [name, template] of Object.entries(templates)) files[name] = page(template, { css, js });
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = outIndex === -1 ? skillDir : path.resolve(args[outIndex + 1]);
  fs.mkdirSync(out, { recursive: true });
  const files = build();
  for (const [name, contents] of Object.entries(files)) fs.writeFileSync(path.join(out, name), contents);
  const size = (name) => `${(Buffer.byteLength(files[name]) / 1024).toFixed(1)} KB`;
  console.log(`basalt-html: css ${size("basalt-html.css")}, js ${size("basalt-html.js")} -> ${path.relative(repo, out) || "."}`);
}
