#!/usr/bin/env node
// basalt-diagram-export (DECISIONS 311, 314)
// Deterministically exports Basalt diagram JSON (or `<script type="application/json" data-diagram>` blocks in HTML)
// to draw.io (.drawio), Microsoft Visio (.vsdx), and Lucid Standard Import (.lucid / .lucid.json).
// Usage:
//   basalt-diagram-export <input.json|page.html> [--to drawio,vsdx,lucid] [--theme light|dark|adaptive] [--marks omit|embed] [--out <dir|file>] [--width <px>] [--browser]
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  diagramToDrawio,
  diagramToLucid,
  diagramToLucidJson,
  diagramToVsdx,
  exportMeasuredDiagram,
  isBundledMarkEmbeddable,
} from "../dist/diagram-interop.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const repoRoot = path.resolve(pkgRoot, "..", "..");
const VALID_FORMATS = ["drawio", "vsdx", "lucid", "lucid-json"];
const VALID_THEMES = ["light", "dark", "adaptive"];
const VALID_MARKS = ["omit", "embed"];
const ALLOW_OWNERS = new Set([
  "Amazon Web Services, Inc.",
  "Microsoft Corporation",
  "Google LLC",
  "The Linux Foundation",
]);

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
    "  --browser        Measure boxes through headless Chromium + Basalt's engine instead of pure headless JS",
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
  // Blank comments and non-live containers so examples inside comments/textarea/pre/code/template are ignored.
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
    // Check if an enclosing <figure ... id="..."> gives this diagram a stable name
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

/** Builds a manifest-checked mark resolver when `--marks embed` is requested. */
async function createMarkResolver() {
  const manifestPath = path.join(pkgRoot, "marks", "manifest.json");
  const skillMarksPath = path.join(repoRoot, "tools", "html-skill", "src", "marks.json");
  let allowedIds = null;
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    allowedIds = new Set(
      manifest.marks
        .filter((m) => !m.unofficial && ALLOW_OWNERS.has(m.owner))
        .map((m) => m.id),
    );
  }
  let skillMarks = null;
  if (fs.existsSync(skillMarksPath)) {
    skillMarks = JSON.parse(fs.readFileSync(skillMarksPath, "utf8")).marks ?? {};
  }
  const distMarksCache = new Map();
  // Preload any dist/marks/*.js module needed only on demand? Keep resolver sync by reading dist/marks synchronously if skillMarks is absent.
  return (id, theme) => {
    if (allowedIds ? !allowedIds.has(id) : !isBundledMarkEmbeddable(id)) return undefined;
    if (skillMarks && Object.hasOwn(skillMarks, id)) {
      const entry = skillMarks[id];
      return theme === "dark" ? (entry.onDark ?? entry.onLight) : entry.onLight;
    }
    if (!distMarksCache.has(id)) {
      const file = path.join(pkgRoot, "dist", "marks", `${id}.js`);
      if (!fs.existsSync(file)) { distMarksCache.set(id, null); return undefined; }
      const src = fs.readFileSync(file, "utf8");
      const onLight = src.match(/onLight:\s*"([^"]+)"/)?.[1];
      const onDark = src.match(/onDark:\s*"([^"]+)"/)?.[1];
      distMarksCache.set(id, onLight ? { onLight, onDark } : null);
    }
    const entry = distMarksCache.get(id);
    if (!entry) return undefined;
    return theme === "dark" ? (entry.onDark ?? entry.onLight) : entry.onLight;
  };
}

/** Optional headless Chromium measurement via Playwright + Basalt's compiled HTML skill. */
async function measureInBrowser(items, width) {
  const composePath = path.join(repoRoot, ".agent", "skills", "basalt-html", "compose.mjs");
  const launchPath = path.join(repoRoot, "scripts", "chromium-launch.mjs");
  if (!fs.existsSync(composePath)) {
    throw new Error("basalt-diagram-export: --browser requires the built HTML skill (.agent/skills/basalt-html/compose.mjs)");
  }
  const req = createRequire(path.join(pkgRoot, "package.json"));
  let chromium;
  try {
    ({ chromium } = req("playwright"));
  } catch {
    throw new Error("basalt-diagram-export: --browser requires playwright to be installed");
  }
  const { compose } = await import(pathToFileURL(composePath).href);
  const body = `<title>Export</title><main style="max-width:${width}px;margin:0 auto;padding:16px;display:grid;gap:64px">` +
    items.map((it, idx) => `<figure class="diagram" id="exp-${idx}"><script type="application/json" data-diagram>${JSON.stringify(it.spec).replace(/</g, "\\u003c")}</script></figure>`).join("") +
    `</main>`;
  const { html } = compose(body);
  const launchOpts = fs.existsSync(launchPath) ? (await import(pathToFileURL(launchPath).href)).chromiumLaunchOptions() : {};
  const browser = await chromium.launch(launchOpts);
  try {
    const context = await browser.newContext({ viewport: { width: Math.max(width + 64, 1280), height: 1200 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));

    // Inspect each figure's exact rendered DOM boxes + paths
    const measured = await page.evaluate((count) => {
      const results = [];
      for (let idx = 0; idx < count; idx++) {
        const fig = document.getElementById(`exp-${idx}`);
        const drawing = fig.querySelector(".diagram-drawing");
        const o = drawing.getBoundingClientRect();
        const rectOf = (el) => {
          const r = el.getBoundingClientRect();
          return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top };
        };
        const nodes = [...drawing.querySelectorAll(".diagram-node")].map((el, i) => ({
          id: el.dataset.node,
          shape: el.dataset.shape,
          i,
          rect: rectOf(el),
        }));
        const lifelines = [...drawing.querySelectorAll(".diagram-life")].map((p) => {
          const m = (p.getAttribute("d") || "").match(/M(-?[\d.]+)\s+(-?[\d.]+)V(-?[\d.]+)/);
          return m ? { x: Number(m[1]), y1: Number(m[2]), y2: Number(m[3]) } : { x: 0, y1: 0, y2: 0 };
        });
        const lines = [...drawing.querySelectorAll(".diagram-edge")].map((g) => {
          const lineEl = g.querySelector(".diagram-line");
          const tipEl = g.querySelector(".diagram-tip");
          const d = lineEl.getAttribute("d") || "";
          const pts = [];
          for (const m of d.matchAll(/([MLQ])([^MLQ]*)/g)) {
            const nums = m[2].trim().split(/[ ,]+/).map(Number);
            if (m[1] === "Q") { pts.pop(); pts.push({ x: nums[0], y: nums[1] }); }
            else pts.push({ x: nums[0], y: nums[1] });
          }
          const tn = (tipEl.getAttribute("d") || "").match(/-?[\d.]+/g).map(Number);
          const open = tipEl.hasAttribute("data-open");
          const tip = open ? { x: tn[2], y: tn[3] } : { x: tn[0], y: tn[1] };
          pts[pts.length - 1] = tip;
          const a = pts[pts.length - 2] || pts[0], b = pts[pts.length - 1];
          const dir = Math.abs(a.x - b.x) < 0.01 ? (b.y > a.y ? "down" : "up") : (b.x > a.x ? "right" : "left");
          const kind = lineEl.getAttribute("data-kind") || "plain";
          return { i: Number(g.dataset.edge), from: g.dataset.from, to: g.dataset.to, kind, pts, tip, dir, width: kind === "main" ? 2 : 1 };
        });
        const labels = [...drawing.querySelectorAll(".diagram-label")].map((el) => ({
          i: Number(el.dataset.edge),
          text: el.textContent,
          box: rectOf(el),
          on: el.hasAttribute("data-on"),
        }));
        const groups = [...drawing.querySelectorAll(".diagram-gbox")].map((el) => ({
          id: el.getAttribute("data-group"),
          label: el.querySelector(".diagram-glabel")?.textContent || "",
          rect: rectOf(el),
        }));
        const lanes = [...drawing.querySelectorAll(".diagram-lane")].map((el, k) => ({
          id: `lane-${k}`,
          label: el.querySelector(".diagram-lane-name")?.textContent || "",
          rect: rectOf(el),
        }));
        const bands = [...drawing.querySelectorAll(".diagram-band")].map((el) => ({
          text: el.textContent || "",
          rect: rectOf(el),
        }));
        const tableRows = {};
        drawing.querySelectorAll('.diagram-node[data-shape="table"]').forEach((nodeEl) => {
          const ys = [...nodeEl.querySelectorAll(".diagram-row")].map((r) => {
            const rr = rectOf(r);
            return (rr.t + rr.b) / 2;
          });
          if (ys.length) tableRows[nodeEl.dataset.node] = ys;
        });
        results.push({
          geo: { w: drawing.clientWidth, h: drawing.clientHeight, nodes, lines, lifelines, labels, crossings: [], through: [], unseated: [], outside: [], ox: 0, oy: 0 },
          extras: { groups, lanes, bands, tableRows },
        });
      }
      return results;
    }, items.length);
    return measured;
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
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") { help = true; continue; }
    if (arg === "--browser") { browser = true; continue; }
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
  return { input, to, theme, marks, out, width, browser, help };
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

  const resolveMark = opts.marks === "embed" ? await createMarkResolver() : undefined;
  const measuredList = opts.browser ? await measureInBrowser(items, opts.width) : null;

  const singleFileOut =
    opts.out &&
    items.length === 1 &&
    opts.to.length === 1 &&
    /\.(drawio|vsdx|lucid|json)$/i.test(opts.out);

  const outDir = singleFileOut
    ? path.dirname(path.resolve(opts.out))
    : path.resolve(opts.out ?? path.dirname(inputPath));
  fs.mkdirSync(outDir, { recursive: true });

  const written = [];
  for (let idx = 0; idx < items.length; idx++) {
    const { name, spec } = items[idx];
    const measured = measuredList ? measuredList[idx] : null;
    const baseOpts = { theme: opts.theme, marks: opts.marks, resolveMark, width: opts.width, diagramId: name };

    for (const format of opts.to) {
      let data;
      if (measured) {
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}
