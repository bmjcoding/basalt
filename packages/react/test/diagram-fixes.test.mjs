// Batch A of the diagrams' backlog (DECISIONS 301): the leftovers of round 64's reviews, each restoring or proving decided behaviour (DECISIONS 281 and
// 282). Neon's findings 13 and 14 (slots on a side, the development checks in production) and Fable's polish P3 (a label on half pixels) and P4 (a
// decision taller than it is wide). Finding 12 (a one-column schema with a foreign key) is in diagrams.test.mjs, beside the test it replaced.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { inspectSource } from "./diagram-geometry.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
// The figure is the page's column, `--w` wide, with no padding round it: a test sets the figure's own width.
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0} #root{width:var(--w,1104px)}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, spec }) => { const { type, ...props } = spec; const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function figurePage({ dev = false, theme = "dark" } = {}) {
  let page, errors;
  if (dev) {
    // The same host as an app's development build: the fixtures are production builds, which drop the warnings.
    ({ page, errors } = await fixturePage(browser, "", { theme, viewport: { width: 1440, height: 1000 }, standards: true }));
    const built = await esbuild.build({
      stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; ${HOST}`, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"development"' },
    });
    await page.addScriptTag({ content: built.outputFiles[0].text });
  } else {
    ({ page, errors } = await fixturePage(browser, HOST, { theme, viewport: { width: 1440, height: 1000 }, standards: true }));
  }
  const warnings = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, warnings };
}
const draw = async (page, items) => { await page.evaluate((items) => window.__set(items), items); await frames(page, 4); };
const widthTo = async (page, w) => { await page.evaluate((w) => document.getElementById("root").style.setProperty("--w", `${w}px`), w); await frames(page, 4); };
const inspect = (page, key) => page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);
const node = (id, col, row) => ({ id, name: id.toUpperCase(), kind: "part", col, row });

describe("slots on a side (Neon's finding 13)", () => {
  test("beside a straight line, two lines toward one end share that half evenly, nested; no two lines leave one point", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const slots = (spec) => core.derivedPorts(core.buildModel({ type: "architecture", title: "t", ...spec }));
    // A to B runs straight; C and D are both below, so all three leave A's right side. C is nearer, so it is nearer the middle.
    const fan = slots({ nodes: [node("a", 1, 1), node("b", 2, 1), node("c", 2, 2), node("d", 2, 3)], edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }] });
    assert.deepEqual(fan.map((p) => [p.fromSide, Math.round(p.fromSlot * 1000) / 1000]), [["right", 0.5], ["right", 0.667], ["right", 0.833]]);
    // Two straight lines between A and B (one each way) take the quarter points; a line from A to C below takes the part below them.
    const pair = slots({ nodes: [node("a", 1, 1), node("b", 2, 1), node("c", 2, 2)], edges: [{ from: "a", to: "b" }, { from: "b", to: "a" }, { from: "a", to: "c" }] });
    assert.deepEqual(pair.map((p) => [p.fromSlot, p.toSlot]), [[0.25, 0.25], [0.75, 0.75], [0.875, 0.5]]);
    // The decided cases are unchanged: one beside a straight line takes the quarter nearer its far end, on either side of it.
    const one = slots({ nodes: [node("a", 1, 2), node("b", 2, 2), node("c", 2, 1), node("d", 2, 3)], edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }] });
    assert.deepEqual(one.map((p) => p.fromSlot), [0.5, 0.25, 0.75]);
    // No two ends on one side of one node share a point, in the fixtures above and in the five examples.
    for (const [name, list, m] of [["fan", fan], ["pair", pair], ["one", one], ...["architecture", "flowchart", "dataFlow"].map((k) => [k, core.derivedPorts(core.buildModel(DATA[k])), core.buildModel(DATA[k])])]) {
      const seen = new Map();
      for (const p of list) for (const [id, side, f] of [[p.from, p.fromSide, p.fromSlot], [p.to, p.toSide, p.toSlot]]) {
        if (m?.byId.get(id)?.shape === "decision") continue; // a decision's lines leave its four points
        const key = `${id}.${side}@${f}`;
        // Two lines to one port share it by design when they are the same pair (a bus): count ends of different lines to different far nodes.
        const far = id === p.from ? p.to : p.from;
        if (seen.has(key) && seen.get(key) !== far) assert.fail(`${name}: two lines leave ${key}`);
        seen.set(key, far);
      }
    }
  });

  test("the development warning for a fourth line on a side says \"has\" once", async () => {
    const { page, warnings } = await figurePage({ dev: true });
    await draw(page, [{ key: "four", spec: { type: "architecture", title: "Four", summary: "Four lines on one side.", nodes: [node("a", 1, 2), node("b", 2, 1), node("c", 2, 2), node("d", 2, 3), node("e", 2, 4)], edges: ["b", "c", "d", "e"].map((to) => ({ from: "a", to })) } }]);
    const said = warnings.filter((w) => /side has/.test(w));
    assert.ok(said.some((w) => w.includes("a's right side has 4 lines; more than three is an error")), JSON.stringify(warnings));
    for (const w of said) assert.doesNotMatch(w, /\bhas\b.*\bhas\b/);
    await page.close();
  });
});

describe("the development checks cost production nothing (Neon's finding 14)", () => {
  // Phrases only the checks write (a property name such as `crossings` is code, not a check's words).
  const WORDS = ["share the cell at column", "main lines are drawn but", "is not a kind of line", "more than three is an error", "would leave the drawing", "in the drawn layout",
    "third end lane", "stands for", "is used twice", "two columns apart", "closer than space-3"];
  const bundle = async (entry, mode) => (await esbuild.build({
    stdin: { contents: entry, resolveDir: pkg, loader: "js" }, bundle: true, minify: true, format: "esm", write: false, logLevel: "silent",
    external: ["react", "react-dom", "react/jsx-runtime"], define: { "process.env.NODE_ENV": JSON.stringify(mode) },
    plugins: [{ name: "on-demand", setup(build) { build.onResolve({ filter: /.*/ }, (args) => (args.kind === "dynamic-import" ? { path: args.path, external: true } : undefined)); } }],
  })).outputFiles[0].text;

  test("an app's production build of each diagram holds none of their words; its development build holds them all", async () => {
    for (const name of ["ArchitectureDiagram", "FlowchartDiagram", "DataFlowDiagram", "SequenceDiagram", "SchemaDiagram"]) {
      const entry = `import { ${name} } from "./dist/index.js"; console.log(${name});`;
      const [prod, dev] = [await bundle(entry, "production"), await bundle(entry, "development")];
      for (const w of WORDS) {
        assert.ok(!prod.includes(w), `${name}'s production build holds "${w}"`);
        assert.ok(dev.includes(w), `${name}'s development build lacks "${w}"`);
      }
      assert.ok(dev.length - prod.length > 2500, `${name}: production ${prod.length}, development ${dev.length}`);
    }
  });

  test("the motion module's production build holds none of its checks' words", async () => {
    const entry = `import { motionErrors } from "./dist/diagram-motion.js"; console.log(motionErrors);`;
    const [prod, dev] = [await bundle(entry, "production"), await bundle(entry, "development")];
    for (const w of ["names both a pulse and a packet", "flows but has no label", "is dashed and flows", "no line joins them in that direction"]) {
      assert.ok(!prod.includes(w), `production holds "${w}"`);
      assert.ok(dev.includes(w), `development lacks "${w}"`);
    }
  });
});

describe("labels on whole pixels (Fable's polish P3)", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: every label's box is on the page's whole pixels, at every drawn and stacked width tried, and the drawing has no problem`, async () => {
      const { page } = await figurePage({ theme });
      // An odd offset, so the drawing's own origin is not on a whole pixel either.
      await page.addStyleTag({ content: "#root{margin-left:0.5px;padding-top:0.25px}" });
      await draw(page, ["architecture", "flowchart", "dataFlow"].map((key) => ({ key, spec: DATA[key] })));
      const off = [];
      let labels = 0;
      for (const w of [358, 480, 784, 880, 936, 960, 1000, 1087, 1104]) {
        await widthTo(page, w);
        for (const key of ["architecture", "flowchart", "dataFlow"]) {
          const boxes = await page.evaluate((key) => [...document.querySelectorAll(`#fig-${key} .basalt-diagram-label`)].map((l) => { const r = l.getBoundingClientRect(); return [l.textContent, r.left, r.top]; }), key);
          labels += boxes.length;
          for (const [text, x, y] of boxes) if (Math.abs(x - Math.round(x)) > 0.01 || Math.abs(y - Math.round(y)) > 0.01) off.push(`${key} at ${w}: "${text}" at ${x}, ${y}`);
          assert.deepEqual((await inspect(page, key)).problems, [], `${key} at ${w}`);
        }
      }
      assert.ok(labels > 100, `${labels} labels read`);
      assert.deepEqual(off, []);
      await page.close();
    });
  }
});

describe("a decision no taller than it is wide (Fable's polish P4)", () => {
  test("a diamond taller than wide has its words' box widened, to the narrowest that fits it under the ceiling; only where none can does it stay taller", async () => {
    const { page } = await figurePage();
    await draw(page, [{ key: "flow", spec: DATA.flowchart }]);
    const widened = [], over = [];
    for (let w = 930; w <= 1104; w += 3) {
      await widthTo(page, w);
      if ((await page.getAttribute("#fig-flow", "data-layout")) !== "drawn") continue;
      const seen = await page.evaluate(() => [...document.querySelectorAll("#fig-flow .basalt-diagram-node[data-shape='decision']")].map((n) => {
        const r = n.getBoundingClientRect(), words = n.querySelector(".basalt-diagram-words");
        const own = n.style.getPropertyValue("--_ww");
        // What any words box from the decided 62% up to the track's whole inside would make: is there one under the ceiling?
        const height = (wr) => { const bw = wr.width + 20, bh = wr.height + 16, d = 1 - bw / r.width; return Math.max(64, Math.ceil(r.width / 5), Math.ceil(d > 0.05 ? bh / d : bh * 20)); };
        n.style.removeProperty("--_ww");
        const decided = height(words.getBoundingClientRect());
        let can = false, narrowest = null;
        for (let x = Math.ceil(words.getBoundingClientRect().width); x <= n.clientWidth - 20; x++) {
          n.style.setProperty("--_ww", `${x}px`);
          const h = height(words.getBoundingClientRect());
          if (h <= r.width) { can = true; narrowest ??= x; }
        }
        n.style.removeProperty("--_ww");
        if (own) n.style.setProperty("--_ww", own);
        return { id: n.dataset.node, w: r.width, h: r.height, own: own ? parseFloat(own) : null, decided, can, narrowest };
      }));
      for (const d of seen) {
        // The 5:1 floor stays, and so does the space-16 one.
        assert.ok(d.w / d.h <= 5.001 && d.h >= 64 - 0.5, `at ${w}: ${d.id} is ${d.w} by ${d.h}`);
        if (d.decided <= d.w) assert.equal(d.own, null, `at ${w}: ${d.id} fits at 62% and is not widened`);
        else if (d.can) {
          assert.ok(d.h <= d.w + 0.5, `at ${w}: ${d.id} is ${d.h} tall on ${d.w}`);
          assert.equal(d.own, d.narrowest, `at ${w}: ${d.id} takes the narrowest box under the ceiling`);
          widened.push(w);
        } else {
          assert.equal(d.own, null, `at ${w}: ${d.id} cannot fit, and keeps 62%`);
          assert.ok(Math.abs(d.h - d.decided) <= 0.5, `at ${w}: ${d.id} is as tall as 1.12 says`);
          over.push(`${w}: ${d.id} ${d.w}x${d.h}`);
        }
      }
      assert.deepEqual((await inspect(page, "flow")).problems, [], `at ${w}`);
    }
    // "Risk medium or lower?" on the CIMIP flowchart: widened over part of the band Fable measured, and taller than wide only where no box could help.
    assert.ok(widened.length > 0, "some width widens");
    console.log(`widened at ${widened.join(", ")}; taller than wide at ${over.join("; ") || "none"}`);
    await page.close();
  });
});
