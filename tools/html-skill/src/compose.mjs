// Builds one standalone Basalt page from a body fragment.
//
//   node .agent/skills/basalt-html/compose.mjs <body.html> [--out <page.html>] [--no-fonts] [--lang <code>] [--all]
//   node .agent/skills/basalt-html/compose.mjs --usage [NAME ...]
//
// The body is the part of the page you write: HTML for inside <body>, which may also carry
//   <title>…</title>                          the page title (default: the first <h1>, else "Untitled page")
//   <style>…</style>                          your own CSS (moved into the head, after Basalt's)
//   <!-- basalt:use palette tabs -->          names of modules to add by hand (a class built only at run time)
//   <script type="application/json" data-palette>{ "groups": [...] }</script>   palette items with no code
//   <script>… Basalt.init({ palette: … }) …</script>   your own init call, for items that run code
// compose.mjs wraps it in the doctype, meta and theme bootstrap, adds Geist (inlined, unless --no-fonts), the core CSS and
// script and only the modules the body uses, the icons it names, and `Basalt.init()` unless the body already calls it.
// The output is the same for the same input. It reads only the files beside it (parts/ and SKILL.md) and writes only --out.
// --all adds every module and every icon (for a page that builds markup at run time, and for measuring). No dependencies.
// After the page, it prints the one-line warning of each module it added (the module's line in SKILL.md's index), to stdout; a module
// the body never uses itself, which is in only because another module's script builds it, says so instead.
// --usage core NAME ... prints each one's usage text, the usage of each module it requires (unless its script builds that module's markup
// itself: then one line says so), and for each the classes, attributes and tags that bring it in (read from the manifest, the same
// file detection reads); NAME is `core` or a module. --usage alone prints SKILL.md's index
// of modules; an unknown name prints it too and exits 1. --usage reads no body and writes no page.
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
 * Returns { html, modules, icons, built, bytes } (built: { module: the module whose script builds it } for a module the body never triggers). Throws an Error with a plain message for input it can't use.
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
  // A module the body never triggers, which is in only because another module's script builds its markup (the palette's rows and key chips).
  const bare = { ...manifest, modules: Object.fromEntries(Object.entries(manifest.modules).map(([n, m]) => [n, { ...m, requires: [] }])) };
  const direct = detect(content + "\n" + styles.join("\n"), bare, [], { all, use }).modules;
  const built = Object.fromEntries(chosen.modules.filter((n) => !direct.includes(n)).flatMap((n) => chosen.modules.filter((m) => (manifest.modules[m].builds ?? []).includes(n)).slice(0, 1).map((m) => [n, m])));

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
  return { html, modules: chosen.modules, icons: chosen.icons, built, bytes: Buffer.byteLength(html) };
}

/** The module lines of SKILL.md's "## Modules" index: [{ name, trigger, warning }]. A line is `- **name** \`trigger\`: warning`. */
export function indexLines(skillText) {
  const section = skillText.match(/^## Modules\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";
  const lines = [];
  for (const line of section.split("\n")) {
    const m = line.match(/^- \*\*([\w-]+)\*\* (.*)$/);
    if (!m) continue;
    const at = m[2].indexOf("`: ");
    lines.push({ name: m[1], trigger: at === -1 ? "" : m[2].slice(0, at + 1), warning: at === -1 ? m[2] : m[2].slice(at + 3), line: line.slice(2) });
  }
  return lines;
}

/** What brings a module in, read from the manifest: its classes, attributes, tags and the script calls detection looks for. */
function triggers(manifest, name) {
  const m = name === "core" ? manifest.core : manifest.modules[name];
  const parts = [];
  if (m.classes?.length) parts.push(`classes ${m.classes.map((c) => `.${c}`).join(" ")}`);
  if (m.attrs?.length) parts.push(`attributes ${m.attrs.join(" ")}`);
  if (m.tags?.length) parts.push(`tags ${m.tags.map((t) => `<${t}>`).join(" ")}`);
  if (m.text?.length) parts.push(`the body has ${(m.textWords ?? m.text.map((t) => `a match for /${t}/`)).join("; or ")}`);
  return parts.join("; ");
}

/**
 * The usage text for `names` (`core` or modules): each one's usage file, then the usage of each module it requires (to a fixed point,
 * in the manifest's order), and under each the classes, attributes and tags that bring it in. Throws for a name that is not one.
 */
export function usageText(names, { parts = path.join(here, "parts") } = {}) {
  const manifest = JSON.parse(read(parts, "manifest.json"));
  const known = ["core", ...Object.keys(manifest.modules)];
  for (const name of names) if (!known.includes(name)) throw Object.assign(new Error(`"${name}" is not a module (core or: ${known.slice(1).join(", ")})`), { unknownName: name });
  const out = [];
  const done = new Set();
  const section = (name, by) => {
    if (done.has(name)) return;
    done.add(name);
    const brings = triggers(manifest, name);
    const lead = name === "core" ? "Always in." : by ? `Required by ${by}.` : "";
    out.push(`${read(parts, path.join("usage", `${name}.md`)).trim()}\n\n${[lead, brings ? (name === "core" ? `Core ${brings}.` : `Brought in by: ${brings}.`) : ""].filter(Boolean).join(" ")}\n`);
    const builds = manifest.modules[name]?.builds ?? [];
    if (builds.length) out.push(`Its script builds the markup of ${builds.join(" and ")}: nothing to add. If your page uses ${builds.length > 1 ? "one" : "it"} itself, print its usage by name.\n`);
    const needs = new Set((manifest.modules[name]?.requires ?? []).filter((n) => !builds.includes(n)));
    for (let grew = true; grew;) { grew = false; for (const n of [...needs]) for (const r of manifest.modules[n].requires ?? []) if (!needs.has(r)) { needs.add(r); grew = true; } }
    for (const n of Object.keys(manifest.modules)) if (needs.has(n)) section(n, name);
  };
  for (const name of names) section(name);
  return out.join("\n");
}

/** SKILL.md's index of modules as the text --usage prints, or null when SKILL.md is not beside compose.mjs. */
function indexText(skill) {
  if (!fs.existsSync(skill)) return null;
  const lines = indexLines(fs.readFileSync(skill, "utf8")).map((l) => `- ${l.line}`);
  return `Modules (node .agent/skills/basalt-html/compose.mjs --usage core NAME ... prints their usage; core is layout, type, panels and buttons):\n${lines.join("\n")}\n`;
}

function usage() {
  console.error("usage: node .agent/skills/basalt-html/compose.mjs <body.html> [--out <page.html>] [--no-fonts] [--lang <code>] [--all]\n       node .agent/skills/basalt-html/compose.mjs --usage [NAME ...]");
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const options = { fonts: true, lang: "en", all: false };
  let input = null;
  let out = null;
  let usageNames = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--usage") {
      usageNames = [];
      while (args[i + 1] !== undefined && !args[i + 1].startsWith("--")) usageNames.push(args[++i]);
    } else if (a === "--no-fonts") options.fonts = false;
    else if (a === "--all") options.all = true;
    else if (a === "--out" || a === "--lang") {
      if (args[i + 1] === undefined || args[i + 1].startsWith("--")) usage();
      if (a === "--out") out = args[++i]; else options.lang = args[++i];
    } else if (a.startsWith("--") || input) usage();
    else input = a;
  }
  const skill = path.join(here, "SKILL.md");
  if (usageNames) {
    // The usage of modules: no body is read and no page is written.
    if (input || out) usage();
    const index = indexText(skill);
    if (!usageNames.length) {
      if (index === null) { console.error("compose.mjs: SKILL.md is not beside compose.mjs, so there is no index to print"); process.exitCode = 1; } else console.log(index);
    } else {
      try {
        console.log(usageText(usageNames));
      } catch (e) {
        console.error(`compose.mjs: ${e.message}`);
        if (e.unknownName !== undefined && index !== null) console.error(`\n${index}`);
        process.exitCode = 1;
      }
    }
  } else {
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
      // One line of warning for each module added: the mistake an agent makes with it. The full text is `--usage NAME`.
      if (result.modules.length && fs.existsSync(skill)) {
        const lines = indexLines(fs.readFileSync(skill, "utf8"));
        const warnings = result.modules.map((n) => lines.find((l) => l.name === n)).filter(Boolean);
        const say = (l) => (l.name in result.built ? `  ${l.name}: built by the ${result.built[l.name]}; nothing to check.` : `  ${l.name}: ${l.warning}`);
        if (warnings.length) console.log(`Check before you hand it over (the full text of one: --usage NAME):\n${warnings.map(say).join("\n")}`);
      }
    } catch (e) {
      console.error(`compose.mjs: ${e.message}`);
      process.exit(1);
    }
  }
}
