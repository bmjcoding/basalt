// A paint benchmark for a page of animated diagrams (DECISIONS 292's backlog; built in batch A, DECISIONS 301). Not a test and not a gate: it reports.
//
//   node packages/react/test/diagram-paint-bench.mjs [--seconds 10] [--height 900] [--json]
//
// It draws the five CIMIP examples, animated, and the marks kit on one React page (the built package, a production build, as an app ships it), waits for
// every entrance to end, then records for `--seconds` (10 by default) with every loop that may run running: the time between frames (from
// requestAnimationFrame), and what Chromium did (a timeline trace: paints, layouts, style recalculations, layer updates and raster tasks). Then it records the
// same page with every figure still, for the floor. By default the window is tall enough for every figure to be in view at once, so every loop runs (a
// loop out of view is frozen); `--height 900` measures a laptop's window, where only the first figures run.
//
// Chromium is launched as an app's reader has it (overlay scrollbars, and partial raster on: the full raster the stills use would charge every changed tile
// whole). Alone on the machine: it waits for no other test or browser run to end, so check first (AGENTS.md, "One heavy run per Mac") and say so if one was going.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";
import { chromium } from "playwright";

import { OVERLAY_SCROLLBARS } from "../../../scripts/chromium-launch.mjs";

const pkg = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => { const k = process.argv.indexOf(`--${name}`); return k > 0 ? process.argv[k + 1] : fallback; };
const SECONDS = Number(arg("seconds", 10));
const HEIGHT = arg("height", null);
const JSON_OUT = process.argv.includes("--json");

const MANIFEST = JSON.parse(fs.readFileSync(path.join(pkg, "marks", "manifest.json"), "utf8"));
const exportName = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

// The page: the five examples with their motion keys (fixtures/diagram-motion.json), then the kit, each mark id its module.
const HOST = `
import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
import still from "./test/fixtures/cimip-diagrams.json";
import motion from "./test/fixtures/diagram-motion.json";
${MANIFEST.marks.map((m) => `import { ${exportName(m.id)} } from "./dist/marks/${m.id}.js";`).join("\n")}
const MARKS = { ${MANIFEST.marks.map((m) => `"${m.id}": ${exportName(m.id)}`).join(", ")} };
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
const animated = (key) => {
  const { flow = [], marks = {}, ...keys } = motion.cimip[key];
  const spec = { ...structuredClone(still[key]), ...keys };
  if (spec.edges) spec.edges = spec.edges.map((e) => (flow.some(([f, t]) => f === e.from && t === e.to) ? { ...e, flow: true } : e));
  if (spec.nodes) spec.nodes = spec.nodes.map((n) => (marks[n.id] ? { ...n, mark: marks[n.id] } : n));
  return spec;
};
const STILL = new URLSearchParams(location.search).has("still");
const specs = [...["architecture", "flowchart", "dataFlow", "sequence", "schema"].map((k) => [k, animated(k)]), ["kit", structuredClone(motion.kit)]];
function Page() {
  return <main style={{ maxWidth: 1104, margin: "0 auto", padding: 16, display: "grid", gap: 48 }}>{specs.map(([key, spec]) => {
    const { type, ...props } = spec;
    if (props.nodes) props.nodes = props.nodes.map((n) => (typeof n.mark === "string" ? { ...n, mark: MARKS[n.mark] } : n));
    const X = C[type];
    return <X key={key} id={"fig-" + key} {...props} motion={STILL ? "still" : "animated"} />;
  })}</main>;
}
createRoot(document.getElementById("root")).render(<Page />);`;

const built = await esbuild.build({
  stdin: { contents: HOST, resolveDir: pkg, loader: "tsx" }, bundle: true, format: "esm", splitting: true, outdir: path.join(pkg, ".paint-bench"), write: false,
  jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' }, entryNames: "main", chunkNames: "[name]-[hash]", minify: true,
});
const files = new Map(built.outputFiles.map((f) => [`/${path.basename(f.path)}`, f.text]));
const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const html = `<!doctype html><html lang="en" data-theme="dark"><head><meta charset="utf-8"><style>${css}${FONTS} body{margin:0;background:var(--basalt-surface-page)}</style></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>`;

const browser = await chromium.launch({ args: [OVERLAY_SCROLLBARS] });

async function run(still) {
  // The window is its final height from the first frame, so which figures start their entrance never depends on a resize (a tall one is trimmed to
  // the page below, which hides nothing).
  const page = await browser.newPage({ viewport: { width: 1440, height: HEIGHT ? Number(HEIGHT) : 8000 } });
  await page.route("http://bench.test/**", (route) => {
    const name = new URL(route.request().url()).pathname;
    if (name === "/") return route.fulfill({ contentType: "text/html", body: html });
    if (files.has(name)) return route.fulfill({ contentType: "text/javascript", body: files.get(name) });
    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`http://bench.test/${still ? "?still" : ""}`);
  await page.waitForFunction(() => document.querySelectorAll("figure[data-measured]").length === 6, null, { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  // Every figure in view at once (unless --height asks for a window), so every loop that may run runs.
  const height = HEIGHT ? Number(HEIGHT) : Math.min(8000, Math.ceil(await page.evaluate(() => document.querySelector("main").getBoundingClientRect().bottom + scrollY)));
  await page.setViewportSize({ width: 1440, height });
  // Every entrance in view to its end: the loops start when it settles. (A figure out of view stays pending: its entrance waits for the reader.)
  if (!still) await page.waitForFunction(() => [...document.querySelectorAll("figure[data-entrance]")].every((f) => { const r = f.getBoundingClientRect(); return r.bottom <= 0 || r.top >= innerHeight || f.getAttribute("data-entrance") === "done"; }), null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    figures: document.querySelectorAll("figure").length,
    inView: [...document.querySelectorAll("figure")].filter((f) => { const r = f.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }).length,
    pending: document.querySelectorAll("figure[data-entrance='pending']").length,
    // A figure is moving when anything of its loops is running or shown: flow cuts are endless animations, but a pulse's and a packet's legs are finite
    // animations run one after another, so endless ones alone undercount.
    moving: [...document.querySelectorAll("figure")].filter((f) => f.getAnimations({ subtree: true }).some((a) => a.playState === "running") || [...f.querySelectorAll(".basalt-diagram-flow, .basalt-diagram-bead, .basalt-diagram-packet")].some((x) => getComputedStyle(x).display !== "none")).length,
  }));
  await browser.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline"] });
  const frames = await page.evaluate((ms) => new Promise((resolve) => {
    const times = [];
    const end = performance.now() + ms;
    const step = (t) => { times.push(t); if (t < end) requestAnimationFrame(step); else resolve(times); };
    requestAnimationFrame(step);
  }), SECONDS * 1000);
  const trace = JSON.parse((await browser.stopTracing()).toString("utf8"));
  await page.close();
  const gaps = frames.slice(1).map((t, k) => t - frames[k]).sort((a, b) => a - b);
  const q = (p) => gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))];
  const events = (trace.traceEvents ?? trace).filter((e) => e.ph === "X" || e.ph === "B" || e.ph === "I" || e.ph === "i");
  // Complete events only: an instant event of the same name (UpdateLayer has both) would count one piece of work twice.
  const count = (name) => events.filter((e) => e.name === name && e.ph === "X").length;
  const busy = (name) => events.filter((e) => e.name === name && e.ph === "X").reduce((sum, e) => sum + (e.dur ?? 0), 0) / 1000;
  return {
    mode: still ? "still" : "animated",
    window: `1440 x ${height}`,
    ...state,
    seconds: SECONDS,
    frames: frames.length - 1,
    frameMs: { p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), p99: +q(0.99).toFixed(2), max: +gaps.at(-1).toFixed(2), over20: gaps.filter((g) => g > 20).length },
    paints: count("Paint"),
    paintMs: +busy("Paint").toFixed(1),
    layouts: count("Layout"),
    layoutMs: +busy("Layout").toFixed(1),
    styleRecalcs: count("UpdateLayoutTree"),
    styleMs: +busy("UpdateLayoutTree").toFixed(1),
    layerUpdates: count("UpdateLayer"),
    // PrePaint runs every frame that is drawn, the benchmark's own requestAnimationFrame loop included: the still page's count is that floor.
    prePaints: count("PrePaint"),
    rasterTasks: count("RasterTask"),
    rasterMs: +busy("RasterTask").toFixed(1),
  };
}

const results = [await run(false), await run(true)];
const version = browser.version();
await browser.close();
if (JSON_OUT) console.log(JSON.stringify(results, null, 1));
else {
  console.log(`Diagram paint benchmark: the five CIMIP examples animated and the kit, React production build, Chromium ${version}, ${SECONDS}s each.`);
  for (const r of results) {
    console.log(`\n${r.mode} (${r.window}, ${r.inView} of ${r.figures} figures in view, ${r.pending} pending, ${r.moving} moving)`);
    console.log(`  frames: ${r.frames} in ${r.seconds}s; between frames p50 ${r.frameMs.p50}ms, p95 ${r.frameMs.p95}ms, p99 ${r.frameMs.p99}ms, max ${r.frameMs.max}ms; ${r.frameMs.over20} over 20ms`);
    console.log(`  paints: ${r.paints} (${r.paintMs}ms); layouts: ${r.layouts} (${r.layoutMs}ms); style recalcs: ${r.styleRecalcs} (${r.styleMs}ms); raster tasks: ${r.rasterTasks} (${r.rasterMs}ms); layer updates: ${r.layerUpdates}; pre-paints: ${r.prePaints}`);
  }
}
