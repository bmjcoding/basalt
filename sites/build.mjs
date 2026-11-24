// Builds the sites' pages: every sites/SITE/PAGE.body.html becomes one self-contained page, sites/dist/SITE/PAGE.html.
//
//   node sites/build.mjs            every page of every site
//   node sites/build.mjs SITE       one site's pages
//
// A page is a body file for the HTML skill (.agent/skills/basalt-html/SKILL.md) plus includes. This resolves the includes, then runs the
// skill's compose on the result, so a built page is what the skill makes of the body: one file, no network, both themes.
//
// The includes are HTML comments, replaced by text before compose sees the body:
//
//   <!-- @include FILE -->    the file, inlined by its type: .css as a <style>, .js as a <script>, .svg and .html as they are (a brand/ .svg goes through the skill's brandSvg: aria-hidden, no title)
//   <!-- @data FILE -->       the file as a data: URL, for an image (use it inside an attribute: <img src="<!-- @data ... -->">)
//
// FILE is looked up by its first part: `shared/…` is sites/shared (the stand-ins), `brand/…` is the repo's brand/ (used byte for byte, except that a brand .svg's root tag takes
// aria-hidden, focusable="false" and data-brand and its title build note is dropped, which brandSvg does and nothing else), and anything else is relative to the page's own folder and must stay inside
// its site. An include inside an included file is not resolved. The site header's short markup is finished at build time
// (header-markup.mjs): the built page carries the final bar, so nothing in it changes when the script runs. A file that is missing fails the build, naming the page and the include.
//
// Nothing runs when this file is imported: the tests call buildSites and buildPage.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { brandSvg, compose } from "../.agent/skills/basalt-html/compose.mjs";
import { finishHeaders } from "./header-markup.mjs";

export const sitesDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.dirname(sitesDir);
/** Folders under a root that are not sites. */
const NOT_SITES = new Set(["shared", "test", "dist", "node_modules"]);

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".avif": "image/avif" };
const DIRECTIVE = /<!--\s*@(include|data)\s+(\S+?)\s*-->/g;

const within = (parent, file) => { const rel = path.relative(parent, file); return rel !== "" && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };

/** The file an include names, or an Error that says which page and which include. */
function locate(name, { bodyFile, siteDir, sharedDir, brandDir }) {
  const fail = (why) => new Error(`${bodyFile}: the include "${name}" ${why}`);
  if (path.isAbsolute(name)) throw fail("is an absolute path; use shared/…, brand/… or a path inside the site");
  let file;
  let parent;
  if (name.startsWith("shared/")) { parent = sharedDir; file = path.join(sharedDir, name.slice("shared/".length)); }
  else if (name.startsWith("brand/")) { parent = brandDir; file = path.join(brandDir, name.slice("brand/".length)); }
  else { parent = siteDir; file = path.resolve(path.dirname(bodyFile), name); }
  if (!within(parent, file)) throw fail("reaches outside its folder");
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw fail(`is missing (looked for ${file})`);
  // The spelled path is inside; so must the file it reaches be, since reading follows a link (compose.mjs checks a diagram's mark the same way).
  if (!within(fs.realpathSync(parent), fs.realpathSync(file))) throw fail("links outside its folder; put the file itself there");
  return file;
}

/** The body with its includes replaced. Returns { body, includes: [{ kind, name, file }] }. */
export function resolveIncludes(body, context) {
  const includes = [];
  const out = body.replace(DIRECTIVE, (_, kind, name) => {
    const file = locate(name, context);
    includes.push({ kind, name, file });
    const ext = path.extname(file).toLowerCase();
    if (kind === "data") {
      const mime = MIME[ext];
      if (!mime) throw new Error(`${context.bodyFile}: the include "${name}" is not an image @data can inline (${Object.keys(MIME).join(" ")})`);
      return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    }
    const text = fs.readFileSync(file, "utf8");
    // compose trims the ends of a style; the two comments keep the file itself, to its last byte, between them.
    if (ext === ".css") return `<style>\n/* @include ${name} */\n${text}\n/* end @include ${name} */\n</style>`;
    if (ext === ".js" || ext === ".mjs") {
      if (/<\/script/i.test(text)) throw new Error(`${context.bodyFile}: the include "${name}" holds a closing script tag and cannot be inlined`);
      return `<script>\n/* @include ${name} */\n${text}\n</script>`;
    }
    // A brand svg goes in through the skill's one way (brandSvg): the drawing is hidden and unfocusable and its title build note is dropped, so the link round it carries the name. The
    // file in brand/ is not touched, and nothing else of the drawing changes.
    if (ext === ".svg") return name.startsWith("brand/") ? brandSvg(text) : text;
    if (ext === ".html") return text;
    throw new Error(`${context.bodyFile}: the include "${name}" is a ${ext || "file with no extension"}; @include inlines .css, .js, .svg and .html, and @data inlines an image`);
  });
  return { body: out, includes };
}

/**
 * Builds one page. `bodyFile` is a SITE/PAGE.body.html path; the page is written to `outFile` (and returned). Options: `siteDir` (the
 * site's folder: default the body's folder), `sharedDir`, `brandDir`, and `fonts` (default true: Geist inlined; a test that sets a page beside
 * React's, which loads no font, turns it off).
 */
export function buildPage(bodyFile, { outFile, siteDir = path.dirname(bodyFile), sharedDir = path.join(sitesDir, "shared"), brandDir = path.join(repoRoot, "brand"), fonts = true } = {}) {
  const source = fs.readFileSync(bodyFile, "utf8");
  // The header is finished on the page's own text, before the includes go in, so nothing an include holds can be taken for it.
  const { body, includes } = resolveIncludes(finishHeaders(source, bodyFile), { bodyFile, siteDir, sharedDir, brandDir });
  let composed;
  try {
    // A diagram's own mark is read from beside the body, wherever the build was started.
    composed = compose(body, { fonts, baseDir: path.dirname(path.resolve(bodyFile)) });
  } catch (error) {
    throw new Error(`${bodyFile}: ${error.message}`);
  }
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, composed.html);
  }
  return { bodyFile, outFile, html: composed.html, includes, modules: composed.modules, icons: composed.icons, external: composed.external, bytes: composed.bytes };
}

/** Every SITE/PAGE.body.html under `root` (a site is a folder of root that is not shared/, test/ or dist/), as { site, page, bodyFile }. */
export function findPages(root = sitesDir, { site } = {}) {
  const sites = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && !NOT_SITES.has(e.name) && !e.name.startsWith(".")).map((e) => e.name).sort();
  if (site !== undefined && !sites.includes(site)) throw new Error(`no site "${site}" under ${root} (sites: ${sites.join(", ") || "none"})`);
  const pages = [];
  const walk = (dir, siteName, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory()) { if (entry.name !== "node_modules" && !entry.name.startsWith(".")) walk(path.join(dir, entry.name), siteName, `${prefix}${entry.name}/`); continue; }
      const match = entry.name.match(/^(.+)\.body\.html$/);
      if (match) pages.push({ site: siteName, page: `${prefix}${match[1]}`, bodyFile: path.join(dir, entry.name) });
    }
  };
  for (const name of sites) if (site === undefined || site === name) walk(path.join(root, name), name, "");
  return pages;
}

/** Builds every page of every site under `root` (or of one `site`) into `outDir` (default root/dist). Returns the built pages. */
export function buildSites({ root = sitesDir, site, outDir = path.join(root, "dist"), sharedDir, brandDir } = {}) {
  return findPages(root, { site }).map((page) => ({
    ...page,
    ...buildPage(page.bodyFile, { outFile: path.join(outDir, page.site, `${page.page}.html`), siteDir: path.join(root, page.site), sharedDir, brandDir }),
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args[0]?.startsWith("-")) { console.error("usage: node sites/build.mjs [SITE]"); process.exit(2); }
  try {
    const built = buildSites({ site: args[0] });
    for (const page of built) console.log(`${path.relative(repoRoot, page.outFile)}: ${(page.bytes / 1024).toFixed(1)} KB, core + ${page.modules.join(", ") || "no modules"}`);
    if (!built.length) console.log("no pages: a page is sites/SITE/PAGE.body.html");
  } catch (error) {
    console.error(`sites/build.mjs: ${error.message}`);
    process.exit(1);
  }
}
