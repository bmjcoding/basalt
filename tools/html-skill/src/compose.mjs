// Builds one standalone Basalt page from a body fragment.
//
//   node .agent/skills/basalt-html/compose.mjs <body.html> [--out <page.html>] [--no-fonts] [--lang <code>] [--all]
//
// The body is the part of the page you write: HTML for inside <body>, which may also carry
//   <title>…</title>                          the page title (default: the first <h1>, else "Untitled page")
//   <style>…</style>                          your own CSS (moved into the head, after Basalt's)
//   <!-- basalt:use palette tabs -->          names of modules to add by hand (a class built only at run time)
//   <script type="application/json" data-palette>{ "groups": [...] }</script>   palette items with no code
//   <script>… Basalt.init({ palette: … }) …</script>   your own init call, for items that run code
// compose.mjs wraps it in the doctype, meta and theme bootstrap, adds Geist (inlined, unless --no-fonts), the core CSS and
// script and only the modules the body uses, the icons it names, and `Basalt.init()` unless the body already calls it.
// The output is the same for the same input. It reads only the files beside it (parts/) and writes only --out.
// --all adds every module and every icon (for a page that builds markup at run time, and for measuring). No dependencies.
//
// Source: tools/html-skill/src/compose.mjs (do not edit the copy in the skill folder).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Sets the theme before first paint: the stored choice, else the system's; and a hardware key already seen this session.
const THEME_INIT = `(function(){var t;try{t=localStorage.getItem("basalt-theme")}catch(e){}if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);try{if(sessionStorage.getItem("basalt-keyboard")==="hardware")document.documentElement.setAttribute("data-keyboard","hardware")}catch(e){}})();`;

const read = (dir, name) => fs.readFileSync(path.join(dir, name), "utf8");
const exists = (dir, name) => fs.existsSync(path.join(dir, name));
// A script inside a page can't contain a closing tag or a comment opener.
const inlineScript = (code) => code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3c!--");
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces each match with a placeholder so a later pass can't see into it; restore() puts them back. */
function protect(text, patterns) {
  const saved = [];
  let out = text;
  for (const pattern of patterns) out = out.replace(pattern, (m) => `\u0000${saved.push(m) - 1}\u0000`);
  const restore = (s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => saved[Number(i)]);
  return { text: out, restore };
}

/** Every class name the text gives an element: class="a b", className = "a", classList.add("a", "b"). */
function classesIn(text) {
  const found = new Set();
  const add = (list) => list.split(/\s+/).forEach((c) => c && found.add(c));
  for (const m of text.matchAll(/\bclass(?:Name)?\s*[=:]\s*\\?(["'`])([^"'`]*?)\\?\1/g)) add(m[2]);
  for (const m of text.matchAll(/classList\s*\.\s*(?:add|remove|toggle|replace)\s*\(([^)]*)\)/g)) for (const s of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) add(s[1]);
  return found;
}

/**
 * Which modules and icons a body needs. `manifest` is parts/manifest.json, `icons` the names parts/icons.json has.
 * Returns { modules: [names, in the manifest's order], icons: [names, in icons.json's order] }.
 */
export function detect(text, manifest, iconNames, { all = false, use = [] } = {}) {
  const classes = classesIn(text);
  const tags = new Set([...text.matchAll(/<([a-zA-Z][\w-]*)[\s/>]/g)].map((m) => m[1].toLowerCase()));
  const wanted = new Set(use);
  for (const [name, m] of Object.entries(manifest.modules)) {
    if (all) wanted.add(name);
    else if (
      (m.classes ?? []).some((c) => classes.has(c)) ||
      (m.tags ?? []).some((t) => tags.has(t)) ||
      (m.attrs ?? []).some((a) => new RegExp(`(?<![\\w-])${escapeRegExp(a)}(?![\\w-])`).test(text)) ||
      (m.text ?? []).some((re) => new RegExp(re).test(text))
    ) wanted.add(name);
  }
  // A module's requirements come with it, to a fixed point.
  for (let grew = true; grew;) {
    grew = false;
    for (const name of [...wanted]) for (const need of manifest.modules[name].requires ?? []) if (!wanted.has(need)) { wanted.add(need); grew = true; }
  }
  const modules = Object.keys(manifest.modules).filter((n) => wanted.has(n));
  // An icon is in when its name sits in quotes in the body (data-icon="Copy", icon: 'Trash') or a module in use draws it.
  const named = new Set();
  for (const name of iconNames) if (all || new RegExp(`["'\`]${name}["'\`]`).test(text)) named.add(name);
  for (const m of modules) for (const name of manifest.modules[m].icons ?? []) named.add(name);
  return { modules, icons: iconNames.filter((n) => named.has(n)) };
}

/**
 * The page for a body fragment. Options: fonts (default true), lang ("en"), all (every module), parts (the folder of parts).
 * Returns { html, modules, icons, bytes }. Throws an Error with a plain message for input it can't use.
 */
export function compose(body, { fonts = true, lang = "en", all = false, parts = path.join(here, "parts") } = {}) {
  if (/<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(body)) throw new Error("the input is a whole page; give compose.mjs the body fragment only (the HTML that goes inside <body>)");
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang)) throw new Error(`"${lang}" is not a language code`);
  const manifest = JSON.parse(read(parts, "manifest.json"));
  const iconFile = JSON.parse(read(parts, "icons.json"));

  // Comments and scripts are looked at for what they are, never for markup inside them.
  const shield = protect(body, [/<!--[\s\S]*?-->/g, /<script\b[\s\S]*?<\/script\s*>/gi]);
  let markup = shield.text;
  const use = [];
  markup = markup.replace(/\u0000(\d+)\u0000/g, (all$, i) => {
    const original = shield.restore(all$);
    const directive = original.match(/^<!--\s*basalt:use\s+([\s\S]*?)-->$/);
    if (!directive) return all$;
    use.push(...directive[1].split(/[\s,]+/).filter(Boolean));
    return "";
  });
  for (const name of use) if (!(name in manifest.modules)) throw new Error(`basalt:use names "${name}", which is not a module (modules: ${Object.keys(manifest.modules).join(", ")})`);

  let title = null;
  markup = markup.replace(/<title>([\s\S]*?)<\/title>\s*/i, (_, t) => { title ??= t.trim(); return ""; });
  const styles = [];
  markup = markup.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>\s*/gi, (_, css) => { styles.push(css.trim()); return ""; });
  const content = shield.restore(markup).replace(/^\s+/, "");
  title ??= content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]*>/g, "").trim() || "Untitled page";

  const chosen = detect(content + "\n" + styles.join("\n"), manifest, Object.keys(iconFile.icons), { all, use });

  const css = [read(parts, "core.css"), ...chosen.modules.filter((n) => exists(parts, `${n}.css`)).map((n) => read(parts, `${n}.css`))].join("");
  const icons = Object.fromEntries(chosen.icons.map((n) => [n, iconFile.icons[n]]));
  const script = [
    read(parts, "core.js"),
    chosen.icons.length ? `${iconFile.notice}\nBasalt._.addIcons(${JSON.stringify(icons)});\n` : "",
    ...chosen.modules.filter((n) => exists(parts, `${n}.js`)).map((n) => read(parts, `${n}.js`)),
  ].join("");
  // The body may make the init call itself (to pass palette items that run code); otherwise it is made at the end.
  const callsInit = /\bBasalt\s*\.\s*init\s*\(/.test(content.replace(/<!--[\s\S]*?-->/g, "").replace(/<script\b[^>]*type\s*=\s*["']?application\/json[\s\S]*?<\/script\s*>/gi, ""));

  const html = [
    "<!doctype html>",
    `<html lang="${lang}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="dark light">',
    `<title>${title}</title>`,
    `<script>${THEME_INIT}</script>`,
    ...(fonts ? ["<style data-basalt-fonts>", read(parts, "geist.css").trim(), "</style>"] : []),
    `<style>${css}</style>`,
    ...styles.map((s) => `<style>${s}</style>`),
    `<script>${inlineScript(script)}</script>`,
    "</head>",
    "<body>",
    content.trimEnd(),
    ...(callsInit ? [] : ["<script>Basalt.init();</script>"]),
    "</body>",
    "</html>",
    "",
  ].join("\n");
  return { html, modules: chosen.modules, icons: chosen.icons, bytes: Buffer.byteLength(html) };
}

function usage() {
  console.error("usage: node compose.mjs <body.html> [--out <page.html>] [--no-fonts] [--lang <code>] [--all]");
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const options = { fonts: true, lang: "en", all: false };
  let input = null;
  let out = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--no-fonts") options.fonts = false;
    else if (a === "--all") options.all = true;
    else if (a === "--out" || a === "--lang") {
      if (args[i + 1] === undefined || args[i + 1].startsWith("--")) usage();
      if (a === "--out") out = args[++i]; else options.lang = args[++i];
    } else if (a.startsWith("--") || input) usage();
    else input = a;
  }
  if (!input) usage();
  try {
    if (!out) {
      out = path.join(path.dirname(input), path.basename(input).replace(/\.body\.html?$/i, "").replace(/\.html?$/i, "") + ".html");
      if (path.resolve(out) === path.resolve(input)) throw new Error(`${input} would be overwritten; name the page with --out`);
    }
    if (path.resolve(out) === path.resolve(input)) throw new Error("--out is the input file; name another file");
    const result = compose(fs.readFileSync(input, "utf8"), options);
    fs.writeFileSync(out, result.html);
    console.log(`${out}: ${(result.bytes / 1024).toFixed(1)} KB, core + ${result.modules.join(", ") || "no modules"}; icons: ${result.icons.join(", ") || "none"}`);
  } catch (e) {
    console.error(`compose.mjs: ${e.message}`);
    process.exit(1);
  }
}
