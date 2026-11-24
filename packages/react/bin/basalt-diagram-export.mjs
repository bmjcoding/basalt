#!/usr/bin/env node
// basalt-diagram-export (DECISIONS 311, 314, 324, 327)
// Deterministically exports Basalt diagram JSON (or `<script type="application/json" data-diagram>` blocks in HTML)
// to draw.io (.drawio), Microsoft Visio (.vsdx), and Lucid Standard Import (.lucid / .lucid.json).
// By default, measures boxes and routes through headless Chromium + Basalt's real layout engine using the
// optional `playwright` peer dependency; when Playwright or Chromium is unavailable, falls back to Basalt's
// pure-JS headless layout and warns on stderr that geometry is approximate.
// Usage:
//   basalt-diagram-export <input.json|page.html> [--to drawio,vsdx,lucid] [--theme light|dark|adaptive] [--marks omit|embed] [--out <dir|file>] [--width <px>] [--browser|--headless]
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  diagramToDrawio,
  diagramToLucid,
  diagramToLucidJson,
  diagramToVsdx,
  exportMeasuredDiagram,
  isBundledMarkEmbeddable,
  placeAutoDiagram,
} from "../dist/diagram-interop.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const VALID_FORMATS = ["drawio", "vsdx", "lucid", "lucid-json"];
const VALID_THEMES = ["light", "dark", "adaptive"];
const VALID_MARKS = ["omit", "embed"];
const HEADLESS_ENGINE = "Basalt headless (approximate)";
const CHROMIUM_LAUNCH_OPTS = {
  headless: true,
  args: ["--blink-settings=forceAndroidOverlayScrollbar=true", "--disable-partial-raster"],
};

function usage() {
  return [
    "Usage: basalt-diagram-export <input.json|page.html> [options]",
    "",
    "Options:",
    "  --to <list>      Comma-separated formats: drawio,vsdx,lucid,lucid-json (default: drawio,vsdx,lucid)",
    "  --theme <name>   light, dark, or adaptive (default: light; adaptive applies to draw.io)",
    "  --marks <mode>   omit or embed (default: omit; embed includes only marks whose manifest terms allow diagram use)",
    "  --out <path>     Output directory (or exact file path for one diagram and one format)",
    "  --width <px>     Target drawing width in CSS pixels (default: 1104)",
    "  --browser        Require headless Chromium + Basalt's engine (fail if Playwright/Chromium is unavailable)",
    "  --headless       Use pure-JS approximate headless layout without launching Chromium",
    "  -h, --help       Show this help",
    "",
  ].join("\n");
}

function slug(s) {
  return String(s || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "diagram";
}

function extFor(format) {
  if (format === "drawio") return ".drawio";
  if (format === "vsdx") return ".vsdx";
  if (format === "lucid") return ".lucid";
  return ".lucid.json";
}

/** Extracts `<script ... data-diagram ...>JSON</script>` blocks from HTML, ignoring comments, textarea, code, pre, and template blocks. */
export function extractDiagramsFromHtml(html) {
  const masked = html
    .replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length))
    .replace(/<(textarea|pre|code|template)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => " ".repeat(m.length));

  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(masked)) !== null) {
    const attrs = match[1] ?? "";
    if (!/(?:^|\s)data-diagram(?:\s|=|$)/i.test(attrs)) continue;
    const raw = (match[2] ?? "").trim();
    if (!raw) continue;
    let spec;
    try {
      spec = JSON.parse(raw);
    } catch (err) {
      throw new Error(`basalt-diagram-export: invalid JSON in <script data-diagram>: ${err.message}`);
    }
    if (!spec || typeof spec !== "object" || typeof spec.type !== "string") {
      throw new Error("basalt-diagram-export: <script data-diagram> must hold a Basalt diagram object with a `type`");
    }
    const before = masked.slice(Math.max(0, match.index - 240), match.index);
    const figId = before.match(/<figure\b[^>]*\bid=["']([^"']+)["'][^>]*>\s*$/i)?.[1];
    out.push({
      name: slug(figId ? figId.replace(/^fig-/, "") : spec.title || `${spec.type}-${out.length + 1}`),
      spec,
    });
  }
  return out;
}

/** Reads one or more named diagram specs from a JSON or HTML file. */
export function readDiagramsFromFile(inputPath) {
  const raw = fs.readFileSync(inputPath, "utf8");
  const ext = path.extname(inputPath).toLowerCase();
  const stem = path.basename(inputPath).replace(/(\.body)?\.(html?|json)$/i, "");
  if (ext === ".html" || ext === ".htm") {
    const found = extractDiagramsFromHtml(raw);
    if (!found.length) throw new Error(`basalt-diagram-export: no <script data-diagram> found in ${inputPath}`);
    return deduplicateNames(found);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`basalt-diagram-export: could not parse JSON in ${inputPath}: ${err.message}`);
  }
  if (Array.isArray(parsed)) {
    const list = parsed.map((spec, idx) => ({ name: slug(spec?.title || `${stem}-${idx + 1}`), spec }));
    return deduplicateNames(list);
  }
  if (parsed && typeof parsed === "object" && typeof parsed.type === "string") {
    return [{ name: slug(stem), spec: parsed }];
  }
  if (parsed && typeof parsed === "object") {
    const entries = Object.entries(parsed)
      .filter(([, v]) => v && typeof v === "object" && typeof v.type === "string")
      .map(([k, spec]) => ({ name: slug(k), spec }));
    if (entries.length) return deduplicateNames(entries);
  }
  throw new Error(`basalt-diagram-export: ${inputPath} does not hold a Basalt diagram JSON object, array, or map`);
}

function deduplicateNames(items) {
  const seen = new Map();
  return items.map((item) => {
    const count = seen.get(item.name) ?? 0;
    seen.set(item.name, count + 1);
    return count === 0 ? item : { ...item, name: `${item.name}-${count + 1}` };
  });
}

/**
 * Builds a mark resolver when `--marks embed` is requested.
 * Bundled mark ids are gated by `isBundledMarkEmbeddable` (derived from marks/manifest.json terms at build time)
 * and read from the packaged `dist/marks/<id>.js` modules. Custom mark file paths (e.g. `{ onLight: "logo.svg" }`)
 * are resolved relative to the input file's directory; missing or non-SVG paths warn on stderr rather than vanishing silently.
 */
function createMarkResolver(inputDir) {
  const distMarksCache = new Map();
  const fileCache = new Map();
  const warned = new Set();

  const warnOnce = (msg) => {
    if (warned.has(msg)) return;
    warned.add(msg);
    process.stderr.write(`basalt-diagram-export: warning: ${msg}\n`);
  };

  return (idOrPath, theme) => {
    if (!idOrPath) return undefined;
    // Bundled mark id (lowercase slug like "aws-ecs-service" or "kubernetes")
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(idOrPath)) {
      if (!isBundledMarkEmbeddable(idOrPath)) return undefined;
      if (!distMarksCache.has(idOrPath)) {
        const file = path.join(pkgRoot, "dist", "marks", `${idOrPath}.js`);
        if (!fs.existsSync(file)) {
          distMarksCache.set(idOrPath, null);
          return undefined;
        }
        const src = fs.readFileSync(file, "utf8");
        const onLight = src.match(/onLight:\s*"([^"]+)"/)?.[1];
        const onDark = src.match(/onDark:\s*"([^"]+)"/)?.[1];
        distMarksCache.set(idOrPath, onLight ? { onLight, onDark } : null);
      }
      const entry = distMarksCache.get(idOrPath);
      if (!entry) return undefined;
      return theme === "dark" ? (entry.onDark ?? entry.onLight) : entry.onLight;
    }

    // Custom mark file path relative to the input file (e.g. "logo.svg" or "./marks/logo.svg")
    const trimmed = String(idOrPath).trim();
    if (trimmed.startsWith("<svg") || trimmed.startsWith("data:image/svg+xml")) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) {
      warnOnce(`skipping remote custom mark URL "${trimmed}" (only local SVG files and data URIs can be embedded offline)`);
      return undefined;
    }
    const resolved = path.resolve(inputDir, trimmed);
    if (!fileCache.has(resolved)) {
      if (!fs.existsSync(resolved)) {
        warnOnce(`custom mark file "${trimmed}" not found (looked at ${resolved})`);
        fileCache.set(resolved, null);
      } else {
        const content = fs.readFileSync(resolved, "utf8").trim();
        if (!content.startsWith("<svg")) {
          warnOnce(`custom mark file "${trimmed}" is not SVG markup (expected <svg ...>)`);
          fileCache.set(resolved, null);
        } else {
          fileCache.set(resolved, content);
        }
      }
    }
    return fileCache.get(resolved) ?? undefined;
  };
}

function browserUnavailableError(message) {
  const err = new Error(message);
  err.basaltBrowserUnavailable = true;
  return err;
}

/** Loads Playwright from the caller's project, this package's ancestors, or Node's global/ESM resolution. */
async function loadPlaywright() {
  const roots = [path.join(process.cwd(), "package.json"), path.join(pkgRoot, "package.json")];
  for (const anchor of roots) {
    try {
      const req = createRequire(anchor);
      const pw = req("playwright");
      if (pw?.chromium) return pw;
    } catch {
      // try next resolution anchor
    }
  }
  try {
    const pw = await import("playwright");
    if (pw?.chromium) return pw;
  } catch {
    // not installed
  }
  throw browserUnavailableError(
    "basalt-diagram-export: exact browser measurement requires Playwright (install with: npm install -D playwright && npx playwright install chromium)",
  );
}

/**
 * Packaged, self-contained headless Chromium measurement harness.
 * Uses only files shipped inside `@srasyndicate/basalt/dist` (styles.css, Geist WOFF2 fonts,
 * diagram-core.js, and diagram-interop.js) so browser measurement works identically from a packed
 * install outside the monorepo as well as inside the repo.
 * Each figure is measured alone at (0, 0) so multi-figure files match single-figure exports byte-for-byte.
 */
async function measureInBrowser(items, width) {
  const distDir = path.join(pkgRoot, "dist");
  const stylesPath = path.join(distDir, "styles.css");
  const sansFontPath = path.join(distDir, "fonts", "Geist-Variable.woff2");
  const monoFontPath = path.join(distDir, "fonts", "GeistMono-Variable.woff2");
  const corePath = path.join(distDir, "diagram-core.js");
  if (!fs.existsSync(stylesPath) || !fs.existsSync(corePath)) {
    throw new Error("basalt-diagram-export: browser measurement requires built dist assets (styles.css and diagram-core.js)");
  }

  const { chromium } = await loadPlaywright();

  let browser;
  try {
    browser = await chromium.launch(CHROMIUM_LAUNCH_OPTS);
  } catch (err) {
    throw browserUnavailableError(
      `basalt-diagram-export: could not launch Chromium (${err.message}). If browsers are not installed, run: npx playwright install chromium`,
    );
  }

  try {
    const measuredBy = `Chromium ${browser.version()}`;
    const stylesCss = fs.readFileSync(stylesPath, "utf8");
    const fontCss = fs.existsSync(sansFontPath) && fs.existsSync(monoFontPath)
      ? `@font-face{font-family:"Geist";src:url("data:font/woff2;base64,${fs.readFileSync(sansFontPath).toString("base64")}") format("woff2");font-weight:100 900;font-style:normal}` +
        `@font-face{font-family:"Geist Mono";src:url("data:font/woff2;base64,${fs.readFileSync(monoFontPath).toString("base64")}") format("woff2");font-weight:100 900;font-style:normal}`
      : "";

    const entriesJson = JSON.stringify(
      items.map((it) => ({ spec: it.spec, placements: it.placements ?? null })),
    ).replace(/</g, "\\u003c");
    const harnessHtml =
      `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8">` +
      `<style>${fontCss}\n${stylesCss}\nhtml,body{margin:0;padding:0;background:var(--basalt-surface-page);color:var(--basalt-text-primary);font-family:var(--basalt-font-family-sans)}</style>` +
      `<script>window.process={env:{NODE_ENV:"production"}};</script>` +
      `</head><body><main id="host" style="margin:0;padding:0;width:${width}px"></main>` +
      `<script type="module">\n` +
      `import { buildModel, figureTree, measureFigure, syncAttributes, toHtml } from "https://basalt.local/diagram-core.js";\n` +
      `import { readMeasuredExtras } from "https://basalt.local/diagram-interop.js";\n` +
      `const entries = ${entriesJson};\n` +
      `const targetWidth = ${width};\n` +
      `const host = document.getElementById("host");\n` +
      `window.__measureAll = async () => {\n` +
      `  await document.fonts.ready;\n` +
      `  const out = [];\n` +
      `  for (let idx = 0; idx < entries.length; idx++) {\n` +
      `    const { spec, placements } = entries[idx];\n` +
      `    const base = "exp-" + idx;\n` +
      `    const opts = { prefix: "basalt-diagram", base, hasSource: Boolean(spec.source), hiddenClass: "basalt-visually-hidden" };\n` +
      `    const candidates = spec.layout === "auto" && Array.isArray(placements) && placements.length ? placements : [undefined];\n` +
      `    const tryMeasure = async (placement, allowWiden) => {\n` +
      `      const model = buildModel(spec, { checks: false, placement });\n` +
      `      if (model.unplaced) return null;\n` +
      `      host.replaceChildren();\n` +
      `      host.style.width = targetWidth + "px";\n` +
      `      const wrap = document.createElement("div");\n` +
      `      wrap.innerHTML = toHtml(figureTree(model, {}, opts), { summary: spec.summary || "", source: spec.source || "" });\n` +
      `      const fig = wrap.firstElementChild;\n` +
      `      fig.id = base;\n` +
      `      host.appendChild(fig);\n` +
      `      await new Promise((r) => requestAnimationFrame(r));\n` +
      `      const sizeTo = allowWiden ? (least) => { if (least > targetWidth) host.style.width = Math.ceil(least) + "px"; } : undefined;\n` +
      `      const res = measureFigure(fig, model, "basalt-diagram", base, { layout: "drawn" }, (d) => syncAttributes(fig, figureTree(model, d, opts)), undefined, sizeTo);\n` +
      `      return { res, extras: readMeasuredExtras(fig, "basalt-diagram"), placement };\n` +
      `    };\n` +
      `    let chosen = null;\n` +
      `    for (const placement of candidates) {\n` +
      `      const attempt = await tryMeasure(placement, false);\n` +
      `      if (attempt?.res?.dyn?.layout === "drawn" && attempt.res.geo) { chosen = attempt; break; }\n` +
      `    }\n` +
      `    if (!chosen) {\n` +
      `      for (const placement of candidates) {\n` +
      `        const attempt = await tryMeasure(placement, true);\n` +
      `        if (attempt?.res?.dyn?.layout === "drawn" && attempt.res.geo) { chosen = attempt; break; }\n` +
      `      }\n` +
      `    }\n` +
      `    out.push(chosen ? { geo: chosen.res.geo, extras: chosen.extras, placement: chosen.placement } : { geo: null, extras: {}, placement: candidates[0] });\n` +
      `  }\n` +
      `  return out;\n` +
      `};\n` +
      `window.__ready = true;\n` +
      `</script></body></html>`;

    const context = await browser.newContext({ viewport: { width: Math.max(width + 128, 1280), height: 1200 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.route("https://basalt.local/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/" || url.pathname === "/index.html") {
        await route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: harnessHtml });
        return;
      }
      const rel = url.pathname.replace(/^\/+/, "");
      const candidate = path.resolve(distDir, rel);
      if (!candidate.startsWith(distDir + path.sep) || !fs.existsSync(candidate)) {
        await route.fulfill({ status: 404, body: "not found" });
        return;
      }
      const body = fs.readFileSync(candidate);
      const ct = candidate.endsWith(".js")
        ? "application/javascript; charset=utf-8"
        : candidate.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "application/octet-stream";
      await route.fulfill({ status: 200, contentType: ct, body });
    });

    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto("https://basalt.local/index.html", { waitUntil: "load" });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    const results = await page.evaluate(() => window.__measureAll());
    if (pageErrors.length) {
      throw new Error(`basalt-diagram-export: browser page error: ${pageErrors.join("; ")}`);
    }
    return { measuredBy, results };
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  let input = null;
  let to = ["drawio", "vsdx", "lucid"];
  let theme = "light";
  let marks = "omit";
  let out = null;
  let width = 1104;
  let browser = false;
  let headless = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { help = true; continue; }
    if (arg === "--browser") { browser = true; continue; }
    if (arg === "--headless") { headless = true; continue; }
    if (arg === "--to") {
      const val = argv[++i];
      if (!val) throw new Error("basalt-diagram-export: --to expects a comma-separated list of formats");
      to = val.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      for (const f of to) if (!VALID_FORMATS.includes(f)) throw new Error(`basalt-diagram-export: unknown format "${f}" (expected ${VALID_FORMATS.join(", ")})`);
      continue;
    }
    if (arg === "--theme") {
      theme = (argv[++i] ?? "").trim().toLowerCase();
      if (!VALID_THEMES.includes(theme)) throw new Error(`basalt-diagram-export: unknown theme "${theme}" (expected ${VALID_THEMES.join(", ")})`);
      continue;
    }
    if (arg === "--marks") {
      marks = (argv[++i] ?? "").trim().toLowerCase();
      if (!VALID_MARKS.includes(marks)) throw new Error(`basalt-diagram-export: unknown --marks mode "${marks}" (expected omit or embed)`);
      continue;
    }
    if (arg === "--out") {
      out = argv[++i];
      if (!out) throw new Error("basalt-diagram-export: --out expects a directory or file path");
      continue;
    }
    if (arg === "--width") {
      width = Number(argv[++i]);
      if (!Number.isFinite(width) || width < 320) throw new Error("basalt-diagram-export: --width must be a number >= 320");
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`basalt-diagram-export: unknown option "${arg}"`);
    if (!input) input = arg;
    else throw new Error(`basalt-diagram-export: unexpected argument "${arg}"`);
  }
  if (browser && headless) {
    throw new Error("basalt-diagram-export: --browser and --headless cannot be used together");
  }
  const mode = browser ? "browser" : headless ? "headless" : "auto";
  return { input, to, theme, marks, out, width, mode, help };
}

async function prepareItems(items) {
  const prepared = [];
  for (const item of items) {
    const { spec } = item;
    if (spec.layout === "auto") {
      const placed = spec.placement ? spec : await placeAutoDiagram(spec);
      const placements = placed.placement
        ? (Array.isArray(placed.placement) ? placed.placement : [placed.placement])
        : undefined;
      prepared.push({ ...item, spec: placed, placements });
    } else {
      prepared.push({ ...item, placements: undefined });
    }
  }
  return prepared;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
  if (opts.help || !opts.input) {
    process.stdout.write(usage());
    process.exit(opts.help ? 0 : 1);
  }

  const inputPath = path.resolve(opts.input);
  if (!fs.existsSync(inputPath)) {
    process.stderr.write(`basalt-diagram-export: input not found: ${opts.input}\n`);
    process.exit(1);
  }

  let items;
  try {
    items = readDiagramsFromFile(inputPath);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }

  const looksLikeFileOut = Boolean(opts.out && /\.(drawio|vsdx|lucid|json)$/i.test(opts.out));
  if (looksLikeFileOut) {
    if (items.length !== 1 || opts.to.length !== 1) {
      process.stderr.write(
        `basalt-diagram-export: --out "${opts.out}" looks like a file path, which requires one diagram and one format (pass a directory for multiple outputs)\n`,
      );
      process.exit(1);
    }
    const expectedExt = extFor(opts.to[0]);
    if (!opts.out.toLowerCase().endsWith(expectedExt)) {
      process.stderr.write(
        `basalt-diagram-export: --out "${opts.out}" extension does not match format "${opts.to[0]}" (expected "${expectedExt}")\n`,
      );
      process.exit(1);
    }
  }
  const singleFileOut = looksLikeFileOut;

  items = await prepareItems(items);

  const resolveMark = opts.marks === "embed" ? createMarkResolver(path.dirname(inputPath)) : undefined;
  let measuredList = null;
  let measuredBy = HEADLESS_ENGINE;
  if (opts.mode === "headless") {
    process.stderr.write("basalt-diagram-export: using approximate headless geometry (--headless)\n");
  } else {
    try {
      const m = await measureInBrowser(items, opts.width);
      measuredList = m.results;
      measuredBy = m.measuredBy;
    } catch (err) {
      if (opts.mode === "browser" || !err?.basaltBrowserUnavailable) throw err;
      process.stderr.write(
        `basalt-diagram-export: warning: ${err.message}; falling back to approximate headless geometry\n`,
      );
    }
  }

  const outDir = singleFileOut
    ? path.dirname(path.resolve(opts.out))
    : path.resolve(opts.out ?? path.dirname(inputPath));
  fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  for (let idx = 0; idx < items.length; idx++) {
    const { name, spec, placements } = items[idx];
    const measured = measuredList ? measuredList[idx] : null;
    const useMeasured = Boolean(measured?.geo);
    const engineLabel = useMeasured ? measuredBy : HEADLESS_ENGINE;
    if (measuredList && !useMeasured) {
      process.stderr.write(
        `basalt-diagram-export: warning: "${name}" did not fit drawn in Chromium; falling back to approximate headless geometry\n`,
      );
    }
    const baseOpts = {
      theme: opts.theme,
      marks: opts.marks,
      resolveMark,
      width: opts.width,
      diagramId: name,
      placement: measured?.placement ?? placements,
      measuredBy: engineLabel,
    };

    for (const format of opts.to) {
      let data;
      if (useMeasured) {
        const res = exportMeasuredDiagram(spec, measured.geo, format, { ...baseOpts, extras: measured.extras });
        data = format === "lucid-json" ? `${JSON.stringify(res, null, 2)}\n` : res;
      } else if (format === "drawio") {
        data = diagramToDrawio(spec, baseOpts);
      } else if (format === "vsdx") {
        data = diagramToVsdx(spec, baseOpts);
      } else if (format === "lucid") {
        data = diagramToLucid(spec, baseOpts);
      } else {
        data = `${JSON.stringify(diagramToLucidJson(spec, baseOpts), null, 2)}\n`;
      }
      const outPath = singleFileOut ? path.resolve(opts.out) : path.join(outDir, `${name}${extFor(format)}`);
      fs.writeFileSync(outPath, data);
      written.push({ path: outPath, bytes: typeof data === "string" ? Buffer.byteLength(data) : data.byteLength });
    }
  }

  for (const w of written) {
    process.stdout.write(`${path.relative(process.cwd(), w.path) || w.path} (${w.bytes} bytes)\n`);
  }
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}
