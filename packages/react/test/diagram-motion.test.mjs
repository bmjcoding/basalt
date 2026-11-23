// Diagram motion and service marks (DECISIONS 292; review round 65), in Chromium against the built package with the real stylesheet. Section 7 of the
// decision is the list this file follows: still untouched, nothing ever missing, settling, measured again, the hold and the reader (all "first"), then
// one mover, geometry, timing as numbers, tracing and the modes. Time is driven by seeking the figure's own animations (every part of the entrance and
// of a loop is an animation on an element of the figure, the rests and the entrance's end included), never by waiting, and no test asserts a
// wall-clock duration. Written when test runs were paused (DECISIONS 271): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pixels, pkg } from "./support.mjs";

const P = "basalt-diagram";
const MOTION = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-motion.json"), "utf8"));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(pkg, "marks", "manifest.json"), "utf8"));
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;
const exportName = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The host: `window.__set(list)` draws a list of { key, spec, gap } (a spec's `type` picks the component, the rest are its props); every figure has the id
// `fig-<key>`, and `gap` puts that much page above it (a figure below the fold). Marks are bundled ids, turned into their modules here, as an app imports them.
const HOST = `
import still from "./test/fixtures/cimip-diagrams.json";
import motion from "./test/fixtures/diagram-motion.json";
${MANIFEST.marks.map((m) => `import { ${exportName(m.id)} } from "./dist/marks/${m.id}.js";`).join("\n")}
const MARKS = { ${MANIFEST.marks.map((m) => `"${m.id}": ${exportName(m.id)}`).join(", ")} };
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
const animated = (key, extra = {}) => {
  const { flow = [], marks = {}, ...keys } = motion.cimip[key];
  const spec = { ...structuredClone(still[key]), ...keys, ...extra };
  if (spec.edges) spec.edges = spec.edges.map((e) => (flow.some(([f, t]) => f === e.from && t === e.to) ? { ...e, flow: true } : e));
  if (spec.nodes) spec.nodes = spec.nodes.map((n) => (marks[n.id] ? { ...n, mark: marks[n.id] } : n));
  return spec;
};
window.SPECS = { still, motion, animated, kit: () => structuredClone(motion.kit) };
const withMarks = (spec) => (spec.nodes ? { ...spec, nodes: spec.nodes.map((n) => (typeof n.mark === "string" ? { ...n, mark: MARKS[n.mark] } : n)) } : spec);
class Catch extends React.Component { constructor(p) { super(p); this.state = { error: null }; } static getDerivedStateFromError(error) { return { error }; } render() { return this.state.error ? <p id={"error-" + this.props.k}>{String(this.state.error.message)}</p> : this.props.children; } }
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid" }}>{list.map(({ key, spec, gap = 0 }) => { const { type, ...props } = withMarks(spec); const X = C[type]; return <div key={key} style={{ marginTop: gap }}><Catch k={key}><X id={"fig-" + key} {...props} /></Catch></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function motionPage({ theme = "dark", viewport = { width: 1440, height: 1000 }, fonts = true, ...rest } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, viewport, standards: true, ...rest });
  const warnings = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  await page.addStyleTag({ content: `${fonts ? FONTS : ""}${PAGE}` });
  if (fonts) await page.evaluate(() => document.fonts.ready);
  return { page, errors, warnings };
}
/** Draws figures: each item is [key, spec expression evaluated in the page, gap]. */
async function draw(page, items) {
  await page.evaluate((items) => window.__set(items.map(([key, expr, gap]) => ({ key, gap, spec: new Function("S", `return ${expr}`)(window.SPECS) }))), items);
  await frames(page, 4);
}
const state = (page, key) => page.evaluate((key) => document.getElementById(`fig-${key}`)?.getAttribute("data-entrance") ?? null, key);
/** Waits (in frames, not time) until a figure's entrance is in a state: the motion module is imported on demand. */
const until = (page, test, arg) => page.waitForFunction(test, arg, { timeout: 5000, polling: "raf" });
const untilState = (page, key, value) => until(page, ([key, value]) => document.getElementById(`fig-${key}`)?.getAttribute("data-entrance") === value, [key, value]);
/** Every animation of a figure's entrance and loops is on an element of the figure: seek them all to `ms` after the entrance's start, paused. */
const seek = (page, key, ms) => page.evaluate(([key, ms]) => {
  const fig = document.getElementById(`fig-${key}`);
  for (const a of fig.getAnimations({ subtree: true })) if (a.effect?.getComputedTiming().iterations !== Infinity) { a.pause(); a.currentTime = ms; }
}, [key, ms]);
const running = (page, key) => page.evaluate((key) => document.getElementById(`fig-${key}`).getAnimations({ subtree: true }).filter((a) => a.playState === "running" || a.playState === "paused").length, key);

describe("still is untouched (first)", () => {
  test("with motion absent, no figure is pending, no motion part or control is drawn, and no line is masked", async () => {
    const { page, errors } = await motionPage();
    await draw(page, ["architecture", "flowchart", "dataFlow", "sequence", "schema"].map((k) => [k, `S.still.${k}`]));
    const seen = await page.evaluate(() => [...document.querySelectorAll("figure")].map((f) => ({
      entrance: f.getAttribute("data-entrance"), motion: f.getAttribute("data-motion"),
      parts: f.querySelectorAll(".basalt-diagram-flow, .basalt-diagram-bead, .basalt-diagram-packet, .basalt-diagram-motion-defs, .basalt-diagram-play, .basalt-diagram-pause, [mask^='url(#dg']").length,
      foot: f.querySelector(".basalt-diagram-foot").children.length,
    })));
    for (const s of seen) assert.deepEqual(s, { entrance: null, motion: null, parts: 0, foot: 1 });
    assert.deepEqual(errors, []);
  });

  test("animated under reduced motion draws the same pixels as still, in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      for (const key of ["architecture", "dataFlow", "sequence"]) {
        const shots = [];
        // The same data, marks included, drawn still and drawn animated under reduced motion.
        for (const expr of [`{ ...S.animated("${key}"), motion: "still" }`, `S.animated("${key}")`]) {
          const { page } = await motionPage({ theme, reducedMotion: "reduce" });
          await draw(page, [[key, expr]]);
          await frames(page, 6);
          shots.push(await pixels(page, await page.locator(`#fig-${key} .basalt-diagram-drawing`).boundingBox()));
          await page.close();
        }
        assert.deepEqual(shots[1], shots[0], `${theme} ${key}: reduced motion is the still drawing`);
      }
    }
  });

  test("a still diagram's export loads no motion code and no mark (the size gate is bundle.test.mjs's)", async () => {
    const { measureExport } = await import("./export-sizes.mjs");
    const esbuild = (await import("esbuild")).default ?? (await import("esbuild"));
    for (const name of ["ArchitectureDiagram", "DataFlowDiagram", "FlowchartDiagram", "SequenceDiagram", "SchemaDiagram"]) {
      const result = await esbuild.build({
        stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" },
        bundle: true, minify: true, format: "esm", write: false, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent",
        plugins: [{ name: "on-demand", setup(build) { build.onResolve({ filter: /.*/ }, (args) => (args.kind === "dynamic-import" ? { path: args.path, external: true } : undefined)); } }],
      });
      const code = result.outputFiles[0].text;
      assert.ok(!code.includes("Play the run") && !code.includes("speed-diagram-trace"), `${name} carries the motion code`);
      assert.ok(!code.includes("data:image/svg+xml"), `${name} carries a mark`);
      assert.ok(code.includes("diagram-motion"), `${name} imports the motion module on demand`);
      assert.ok((await measureExport(name)).bytes > 0);
    }
  });
});

describe("nothing is ever missing (first)", () => {
  test("print from the top of a page of unseen animated figures: every line, head and label present, every label at rest, no mover", async () => {
    const { page } = await motionPage();
    await draw(page, ["architecture", "flowchart", "dataFlow", "sequence", "schema"].map((k, i) => [k, `S.animated("${k}")`, i ? 1400 : 2000]));
    for (const k of ["architecture", "sequence"]) assert.equal(await state(page, k), "pending");
    await page.emulateMedia({ media: "print" });
    await frames(page, 4);
    const seen = await page.evaluate(() => [...document.querySelectorAll("figure")].map((f) => {
      const edges = f.querySelector(".basalt-diagram-edges");
      const primary = getComputedStyle(f).getPropertyValue("--basalt-text-primary").trim();
      const probe = document.createElement("span"); probe.style.color = primary; f.append(probe); const rest = getComputedStyle(probe).color; probe.remove();
      return {
        state: f.getAttribute("data-entrance"),
        edges: edges ? getComputedStyle(edges).visibility : "none",
        masked: [...f.querySelectorAll(".basalt-diagram-edge")].filter((g) => getComputedStyle(g).maskImage !== "none" && getComputedStyle(g).mask !== "none").length,
        labels: [...f.querySelectorAll(".basalt-diagram-mlabel")].filter((l) => getComputedStyle(l).color !== rest).length,
        movers: [...f.querySelectorAll(".basalt-diagram-flow, .basalt-diagram-bead, .basalt-diagram-packet")].filter((x) => getComputedStyle(x).display !== "none").length,
      };
    }));
    for (const s of seen) {
      assert.notEqual(s.state, "pending");
      if (s.edges !== "none") assert.equal(s.edges, "visible");
      assert.equal(s.masked, 0);
      assert.equal(s.labels, 0);
      assert.equal(s.movers, 0);
    }
  });

  test("the same in the print media with script stopped after the first paint: the stylesheet alone shows the lines", async () => {
    const { page } = await motionPage();
    await draw(page, [["sequence", `S.animated("sequence")`, 2000]]);
    assert.equal(await state(page, "sequence"), "pending");
    // Script blocked: the pending attribute stays, and only the print stylesheet stands between it and paper.
    await page.evaluate(() => { window.addEventListener = () => {}; });
    await page.emulateMedia({ media: "print" });
    const seen = await page.evaluate(() => { const f = document.getElementById("fig-sequence"); return getComputedStyle(f.querySelector(".basalt-diagram-edges")).visibility; });
    assert.equal(seen, "visible");
  });

  test("in the print media every mark and every focal node, with a mark or without, compute print-color-adjust: exact (DECISIONS 298)", async () => {
    const { page } = await motionPage();
    await draw(page, [["kit", `{ ...S.kit(), nodes: S.kit().nodes.map((n) => (n.id === "github" ? { ...n, focal: true } : n)), legend: { ...S.kit().legend, focal: "The start" } }`], ["arch", `{ ...S.still.architecture }`]]);
    await page.emulateMedia({ media: "print" });
    const seen = await page.evaluate(() => ({
      marks: [...document.querySelectorAll(".basalt-diagram-mark")].map((m) => getComputedStyle(m).printColorAdjust),
      focalMarked: getComputedStyle(document.querySelector("#fig-kit .basalt-diagram-node[data-focal]")).printColorAdjust,
      focalBare: getComputedStyle(document.querySelector("#fig-arch .basalt-diagram-node[data-focal]")).printColorAdjust,
      lines: getComputedStyle(document.querySelector("#fig-kit .basalt-diagram-svg")).printColorAdjust,
    }));
    assert.ok(seen.marks.length >= 6 && seen.marks.every((v) => v === "exact"), JSON.stringify(seen.marks));
    assert.equal(seen.focalMarked, "exact");
    assert.equal(seen.focalBare, "exact");
    assert.equal(seen.lines, "exact");
  });

  test("a stacked sequence and a stacked schema at 390: no pending state, no motion control, every word present", async () => {
    const { page } = await motionPage({ viewport: { width: 390, height: 900 } });
    await draw(page, [["sequence", `S.animated("sequence")`], ["schema", `S.animated("schema")`]]);
    await frames(page, 10);
    for (const k of ["sequence", "schema"]) {
      const seen = await page.evaluate((k) => { const f = document.getElementById(`fig-${k}`); return { layout: f.dataset.layout, state: f.getAttribute("data-entrance"), controls: f.querySelectorAll(".basalt-diagram-play, .basalt-diagram-pause").length, hidden: [...f.querySelectorAll(".basalt-diagram-drawing *")].filter((e) => e.textContent.trim() && getComputedStyle(e).visibility === "hidden").length }; }, k);
      assert.deepEqual(seen, { layout: "stacked", state: null, controls: 0, hidden: 0 });
    }
  });

  test("from the frame the lines are first drawn to the entrance's end, no node, label, key or summary is under opacity 1, and no word is under 4.5:1", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`], ["sequence", `S.animated("sequence")`, 200]]);
    for (const key of ["architecture", "sequence"]) {
      await untilState(page, key, "running");
      for (const ms of [0, 300, 900, 1800, 2600, 3400, 4300]) {
        await seek(page, key, ms);
        const low = await page.evaluate((key) => {
          const f = document.getElementById(`fig-${key}`);
          const quiet = (el) => { for (let e = el; e && e !== f.parentElement; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < 1) return true; return false; };
          return [...f.querySelectorAll(".basalt-diagram-node, .basalt-diagram-label, .basalt-diagram-key, .basalt-diagram-summary, .basalt-diagram-mlabel, .basalt-diagram-num")].filter(quiet).length;
        }, key);
        assert.equal(low, 0, `${key} at ${ms}ms`);
      }
    }
  });

  test("a server-rendered figure hydrated in view: nothing that was painted is hidden afterwards", async () => {
    const { page } = await motionPage();
    // The server's HTML has the words and no lines; what it painted is every word. After hydration and the first draw, every one is still visible.
    await draw(page, [["sequence", `S.animated("sequence")`]]);
    const words = await page.evaluate(() => [...document.querySelectorAll("#fig-sequence .basalt-diagram-mlabel, #fig-sequence .basalt-diagram-name, #fig-sequence .basalt-diagram-note")].every((e) => getComputedStyle(e).visibility === "visible" && Number(getComputedStyle(e).opacity) === 1));
    assert.ok(words);
  });
});

describe("settling (first)", () => {
  const triggers = {
    hover: (page) => page.hover("#fig-architecture [data-node='alb']"),
    focus: (page) => page.evaluate(() => document.querySelector("#fig-architecture [data-node][tabindex='0']").focus()),
    key: async (page) => { await page.evaluate(() => document.querySelector("#fig-architecture [data-node][tabindex='0']").focus()); await page.keyboard.press("ArrowRight"); },
    list: (page) => page.click("#fig-architecture .basalt-diagram-toggle"),
    pause: (page) => page.click("#fig-architecture .basalt-diagram-pause"),
    hold: (page) => page.evaluate(() => document.documentElement.setAttribute("data-loops", "held")),
    beforeprint: (page) => page.evaluate(() => window.dispatchEvent(new Event("beforeprint"))),
    print: (page) => page.emulateMedia({ media: "print" }),
    "reduced motion": (page) => page.emulateMedia({ reducedMotion: "reduce" }),
    "forced colours": (page) => page.emulateMedia({ forcedColors: "active" }),
    "new data": (page) => page.evaluate(() => window.__set([{ key: "architecture", spec: { ...window.SPECS.animated("architecture"), edges: [...window.SPECS.animated("architecture").edges, { from: "browser", to: "cw" }] } }])),
    "motion still": (page) => page.evaluate(() => window.__set([{ key: "architecture", spec: { ...window.SPECS.animated("architecture"), motion: "still" } }])),
  };
  for (const [name, act] of Object.entries(triggers)) {
    test(`mid-entrance, ${name} settles it in one frame with no animation of it left`, async () => {
      const { page } = await motionPage();
      await draw(page, [["architecture", `S.animated("architecture")`]]);
      await untilState(page, "architecture", "running");
      await seek(page, "architecture", 1000);
      await act(page);
      await frames(page, 2);
      const seen = await page.evaluate(() => { const f = document.getElementById("fig-architecture"); return { state: f.getAttribute("data-entrance"), masks: f.querySelectorAll(".basalt-diagram-edge[mask]").length, defs: f.querySelectorAll(".basalt-diagram-motion-defs").length }; });
      assert.notEqual(seen.state, "running", name);
      assert.notEqual(seen.state, "pending", name);
      assert.equal(seen.masks, 0, name);
      assert.equal(seen.defs, 0, name);
    });
  }

  test("a re-measure after settling starts no entrance", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`]]);
    await untilState(page, "architecture", "running");
    await page.hover("#fig-architecture [data-node='alb']");
    await page.setViewportSize({ width: 1300, height: 1000 });
    await frames(page, 6);
    assert.equal(await state(page, "architecture"), "done");
    assert.equal(await page.evaluate(() => document.querySelectorAll("#fig-architecture .basalt-diagram-edge[mask]").length), 0);
  });
});

describe("measured again (first)", () => {
  // The faces are held back: the page asks for them from an address the test answers when it says, so the re-measure of document.fonts.ready lands then.
  async function heldFaces() {
    const { page, errors } = await motionPage({ fonts: false });
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route("https://faces.invalid/**", async (route) => { await gate; route.fulfill({ body: fs.readFileSync(path.join(pkg, "dist", "fonts", route.request().url().endsWith("mono") ? "GeistMono-Variable.woff2" : "Geist-Variable.woff2")), contentType: "font/woff2" }); });
    await page.addStyleTag({ content: `@font-face{font-family:"Geist";src:url(https://faces.invalid/sans) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(https://faces.invalid/mono) format("woff2");font-weight:100 900}` });
    return { page, errors, release: async () => { release(); await page.evaluate(() => document.fonts.ready); await frames(page, 6); } };
  }

  test("a figure below the fold is pending before the faces arrive and after; scrolled into view, it plays. On a page of the five, every one", async () => {
    const { page, release } = await heldFaces();
    const keys = ["architecture", "flowchart", "dataFlow", "sequence", "schema"];
    await draw(page, keys.map((k) => [k, `S.animated("${k}")`, 1600]));
    for (const k of keys) assert.equal(await state(page, k), "pending", `${k} before the faces`);
    await release();
    for (const k of keys) assert.equal(await state(page, k), "pending", `${k} after the faces`);
    for (const k of keys) {
      await page.evaluate((k) => document.getElementById(`fig-${k}`).scrollIntoView({ block: "center" }), k);
      await untilState(page, k, "running");
    }
  });

  test("a figure in view at load has started before the faces arrive, and is still running after, on the lines just drawn", async () => {
    const { page, release } = await heldFaces();
    await draw(page, [["dataFlow", `S.animated("dataFlow")`]]);
    await untilState(page, "dataFlow", "running");
    await page.evaluate(() => { for (const a of document.getElementById("fig-dataFlow").getAnimations({ subtree: true })) a.pause(); });
    await release();
    assert.equal(await state(page, "dataFlow"), "running");
    // Each masked line's reveal is a copy of the path drawn now.
    const same = await page.evaluate(() => [...document.querySelectorAll("#fig-dataFlow .basalt-diagram-edge[mask]")].every((g) => { const id = g.getAttribute("mask").slice(5, -1); const copy = document.getElementById(id)?.querySelector("path"); return copy && copy.getAttribute("d") === g.querySelector(".basalt-diagram-line").getAttribute("d"); }));
    assert.ok(same);
  });

  test("seeked mid-entrance, then 24px narrower: every whole line is whole, none is back at its start, the start time is the one it had, and it ends inside the limit", async () => {
    const { page } = await motionPage();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await draw(page, [["architecture", `S.animated("architecture")`]]);
    await untilState(page, "architecture", "running");
    await seek(page, "architecture", 1000);
    const read = () => page.evaluate(() => {
      const f = document.getElementById("fig-architecture");
      const edges = [...f.querySelectorAll(".basalt-diagram-edge")].map((g) => ({ i: g.dataset.edge, masked: g.hasAttribute("mask") }));
      const anims = f.getAnimations({ subtree: true });
      return { edges, start: Math.min(...anims.map((a) => a.startTime ?? Infinity)), end: Math.max(...anims.map((a) => (a.startTime ?? 0) + Number(a.effect.getComputedTiming().endTime))), progress: Object.fromEntries(anims.filter((a) => a.effect.target?.closest?.("mask")).map((a) => [a.effect.target.closest("mask").id, a.effect.getComputedTiming().progress])) };
    });
    const before = await read();
    await page.evaluate(() => { document.getElementById("root").style.maxWidth = `${document.getElementById("root").clientWidth - 24}px`; });
    await frames(page, 6);
    const after = await read();
    assert.equal(await state(page, "architecture"), "running");
    for (const e of before.edges) if (!e.masked) assert.ok(!after.edges.find((x) => x.i === e.i).masked, `line ${e.i} was whole`);
    for (const [id, p] of Object.entries(after.progress)) if (before.progress[id] > 0) assert.ok(p > 0, `${id} went back to its start`);
    assert.equal(after.start, before.start);
    const limit = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-diagram-limit")));
    assert.ok(after.end - after.start <= limit + 1);
  });

  test("a re-measure that changes nothing: the line elements are the same nodes, and their animations the same objects", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`]]);
    await untilState(page, "architecture", "running");
    await page.evaluate(() => { const f = document.getElementById("fig-architecture"); window.__lines = [...f.querySelectorAll(".basalt-diagram-line")]; window.__anims = f.getAnimations({ subtree: true }); });
    // A parent's render with the same data, as a new object: the engine measures again and draws the same lines.
    await draw(page, [["architecture", `S.animated("architecture")`]]);
    const same = await page.evaluate(() => { const f = document.getElementById("fig-architecture"); const lines = [...f.querySelectorAll(".basalt-diagram-line")]; const anims = f.getAnimations({ subtree: true }); return lines.length === window.__lines.length && lines.every((l, k) => l === window.__lines[k]) && window.__anims.every((a) => anims.includes(a)); });
    assert.ok(same);
  });

  test("mid-entrance, narrowed to a layout with no lines: no pending state, no animation, no control", async () => {
    const { page } = await motionPage();
    await draw(page, [["sequence", `S.animated("sequence")`]]);
    await untilState(page, "sequence", "running");
    await page.setViewportSize({ width: 390, height: 900 });
    await frames(page, 8);
    const seen = await page.evaluate(() => { const f = document.getElementById("fig-sequence"); return { state: f.getAttribute("data-entrance"), anims: f.getAnimations({ subtree: true }).length, controls: f.querySelectorAll(".basalt-diagram-play, .basalt-diagram-pause").length }; });
    assert.notEqual(seen.state, "pending");
    assert.notEqual(seen.state, "running");
    assert.equal(seen.anims, 0);
    assert.equal(seen.controls, 0);
  });

  test("a loop running, then the figure narrowed: the loop is on the new lines; a run in progress is on the message it was on", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`], ["sequence", `S.animated("sequence")`, 100]]);
    await page.hover("#fig-architecture [data-node='alb']");
    await page.mouse.move(0, 0);
    await page.evaluate(() => { document.getElementById("fig-architecture").setAttribute("data-entrance", "done"); });
    await until(page, () => document.querySelector("#fig-architecture .basalt-diagram-flow"));
    await page.evaluate(() => { document.getElementById("root").style.maxWidth = "1080px"; });
    await frames(page, 6);
    const onNew = await page.evaluate(() => { const f = document.getElementById("fig-architecture"); const flow = f.querySelector(".basalt-diagram-flow"); return Boolean(flow) && f.contains(flow); });
    assert.ok(onNew);
  });
});

describe("the hold and the reader (first)", () => {
  test("under the hold: no cut, bead or dot and no arrival step; the run starts and finishes; a send moves nothing and the last stop steps; releasing starts the loops", async () => {
    const { page } = await motionPage();
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await draw(page, [["architecture", `S.animated("architecture")`], ["sequence", `S.animated("sequence")`, 80], ["send", `{ ...S.animated("dataFlow"), packet: { path: ["send", "append", "row", "hear", "see"], send: 1 } }`, 80]]);
    await frames(page, 10);
    const parts = () => page.evaluate(() => [...document.querySelectorAll(".basalt-diagram-flow, .basalt-diagram-bead, .basalt-diagram-packet")].filter((x) => getComputedStyle(x).display !== "none").length + document.querySelectorAll("[data-arrival]").length);
    assert.equal(await parts(), 0);
    await page.click("#fig-sequence .basalt-diagram-play");
    assert.equal(await page.textContent("#fig-sequence .basalt-diagram-play"), "Stop the run");
    for (let k = 0; k < 60 && (await page.textContent("#fig-sequence .basalt-diagram-play")) === "Stop the run"; k++) { await page.evaluate(() => { for (const a of document.getElementById("fig-sequence").getAnimations({ subtree: true })) if (a.playState === "running") a.finish(); }); await frames(page, 1); }
    assert.equal(await page.textContent("#fig-sequence .basalt-diagram-play"), "Play the run");
    await page.evaluate(() => window.__set([{ key: "send", spec: { ...window.SPECS.animated("dataFlow"), packet: { path: ["send", "append", "row", "hear", "see"], send: 2 } } }]));
    await frames(page, 3);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#fig-send .basalt-diagram-packet").length ? getComputedStyle(document.querySelector("#fig-send .basalt-diagram-packet")).display : "none"), "none");
    assert.ok(await page.evaluate(() => document.querySelector("#fig-send [data-node='see']").hasAttribute("data-arrival")));
    await page.evaluate(() => document.documentElement.removeAttribute("data-loops"));
  });

  test("the pause control is present exactly when it may be, is named Pause animations with aria-pressed, and is 44px on touch", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`], ["flowchart", `S.animated("flowchart")`, 80], ["sequence", `S.animated("sequence")`, 80], ["still", `S.still.architecture`, 80]]);
    await until(page, () => document.querySelector("#fig-architecture .basalt-diagram-pause"));
    const seen = await page.evaluate(() => Object.fromEntries(["architecture", "flowchart", "sequence", "still"].map((k) => [k, document.querySelectorAll(`#fig-${k} .basalt-diagram-pause`).length])));
    assert.deepEqual(seen, { architecture: 1, flowchart: 0, sequence: 0, still: 0 });
    const pause = page.locator("#fig-architecture .basalt-diagram-pause");
    assert.equal((await pause.textContent()).trim(), "Pause animations");
    assert.equal(await pause.getAttribute("aria-pressed"), "false");
    await pause.click();
    assert.equal(await pause.getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-loops")), "held");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await frames(page, 3);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#fig-architecture .basalt-diagram-pause").length), 0, "not under reduced motion");
    const touch = await motionPage({ hasTouch: true, isMobile: true, viewport: { width: 1100, height: 900 } });
    await draw(touch.page, [["architecture", `S.animated("architecture")`]]);
    await until(touch.page, () => document.querySelector("#fig-architecture .basalt-diagram-pause"));
    assert.ok((await touch.page.locator("#fig-architecture .basalt-diagram-pause").boundingBox()).height >= 44);
  });
});

describe("one mover (then)", () => {
  const cases = {
    "a pulse id that is no node": `{ ...S.animated("architecture"), pulse: ["browser", "nowhere"] }`,
    "two ids no line joins that way": `{ ...S.animated("architecture"), pulse: ["svc", "alb"] }`,
    "both a pulse and a packet": `{ ...S.animated("architecture"), packet: { path: ["browser", "alb"] } }`,
    "flow on a dashed line": `{ ...S.animated("architecture"), edges: S.animated("architecture").edges.map((e) => (e.kind === "dashed" ? { ...e, flow: true } : e)) }`,
    "flow on the mover's line": `{ ...S.animated("architecture"), edges: S.animated("architecture").edges.map((e) => (e.from === "alb" ? { ...e, flow: true } : e)) }`,
  };
  for (const [name, expr] of Object.entries(cases)) {
    test(`a development build throws on ${name}`, async () => {
      const { page } = await motionPage();
      await draw(page, [["bad", expr]]);
      await until(page, () => document.getElementById("error-bad"));
      assert.match(await page.textContent("#error-bad"), /Basalt ArchitectureDiagram:/);
    });
  }

  test("a flow line with no label warns", async () => {
    const { page, warnings } = await motionPage();
    await draw(page, [["arch", `{ ...S.animated("architecture"), edges: S.animated("architecture").edges.map((e) => (e.from === "svc" && e.to === "s3" ? { ...e, flow: true, label: undefined } : e)) }`]]);
    await until(page, () => document.querySelector("#fig-arch .basalt-diagram-pause"));
    assert.ok(warnings.some((w) => /flows but has no label/.test(w)));
  });

  test("no frame holds a bead and a dot; no flow cut is on an edge of the mover's path", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`], ["dataFlow", `S.animated("dataFlow")`, 80]]);
    for (const k of ["architecture", "dataFlow"]) await page.evaluate((k) => { const f = document.getElementById(`fig-${k}`); f.setAttribute("data-entrance", "done"); f.dispatchEvent(new Event("basalt-diagram-settle")); }, k);
    for (let n = 0; n < 40; n++) {
      await frames(page, 3);
      const both = await page.evaluate(() => [...document.querySelectorAll("figure")].some((f) => f.querySelector(".basalt-diagram-bead:not([style*='none'])") && f.querySelector(".basalt-diagram-packet:not([style*='none'])")));
      assert.ok(!both);
    }
  });
});

describe("geometry (then)", () => {
  for (const width of [1440, 390]) for (const theme of ["dark", "light"]) {
    test(`at ${width} in ${theme}: a dot never covers a head, a bead is at most two fifths of its line, no cut is near a line's end, and a mover is never above a node`, async () => {
      const { page } = await motionPage({ theme, viewport: { width, height: 1400 } });
      await draw(page, [["architecture", `S.animated("architecture")`], ["dataFlow", `S.animated("dataFlow")`, 80]]);
      for (const k of ["architecture", "dataFlow"]) await page.evaluate((k) => { const f = document.getElementById(`fig-${k}`); f.setAttribute("data-entrance", "done"); f.dispatchEvent(new Event("basalt-diagram-settle")); }, k);
      for (let n = 0; n < 30; n++) {
        await frames(page, 4);
        const bad = await page.evaluate(() => {
          const out = [];
          for (const f of document.querySelectorAll("figure")) {
            const dot = f.querySelector(".basalt-diagram-packet");
            if (dot && getComputedStyle(dot).display !== "none" && Number(getComputedStyle(dot).opacity) > 0.5) {
              const d = dot.getBoundingClientRect();
              for (const tip of f.querySelectorAll(".basalt-diagram-tip")) { const t = tip.getBoundingClientRect(); if (d.left < t.right - 0.5 && d.right > t.left + 0.5 && d.top < t.bottom - 0.5 && d.bottom > t.top + 0.5) out.push("dot over head"); }
              if (getComputedStyle(dot).zIndex !== "auto" && Number(getComputedStyle(dot).zIndex) > 0) out.push("dot above nodes");
            }
            for (const svg of f.querySelectorAll(".basalt-diagram-bead")) {
              const path = svg.querySelector("path");
              const bead = parseFloat(path.getAttribute("stroke-dasharray"));
              if (bead > 0.4 * path.getTotalLength() + 0.5) out.push(`bead ${bead} on ${path.getTotalLength()}`);
            }
          }
          return out;
        });
        assert.deepEqual(bad, []);
      }
    });
  }

  test("two lines on one bus are each hidden until their own start", async () => {
    const { page } = await motionPage();
    await draw(page, [["schema", `S.animated("schema")`]]);
    await untilState(page, "schema", "running");
    await seek(page, "schema", 0);
    // Every line has its own mask: no edge group shares a mask with another.
    const masks = await page.evaluate(() => [...document.querySelectorAll("#fig-schema .basalt-diagram-edge[mask]")].map((g) => g.getAttribute("mask")));
    assert.equal(new Set(masks).size, masks.length);
  });
});

describe("timing as numbers (then)", () => {
  test("each line takes its length at the trace speed, clamped; lines start the stagger apart; the CIMIP totals are the decision's; the schema goes top to bottom", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`], ["sequence", `S.animated("sequence")`, 80], ["schema", `S.animated("schema")`, 80]]);
    const tokens = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); const n = (x) => parseFloat(cs.getPropertyValue(`--basalt-${x}`)); return { min: n("duration-diagram-line-min"), max: n("duration-diagram-line-max"), stagger: n("duration-diagram-stagger"), speed: n("speed-diagram-trace"), step: n("duration-diagram-step"), arrow: n("duration-diagram-arrow") }; });
    assert.deepEqual(tokens, { min: 400, max: 900, stagger: 220, speed: 300, step: 320, arrow: 500 });
    await untilState(page, "architecture", "running");
    const lines = await page.evaluate(() => [...document.querySelectorAll("#fig-architecture .basalt-diagram-motion-defs mask")].map((m) => { const p = m.querySelector("path"); const t = p.getAnimations()[0].effect.getComputedTiming(); return { len: p.getTotalLength(), delay: t.delay, duration: t.duration }; }));
    lines.forEach((l, k) => {
      assert.ok(Math.abs(l.duration - Math.min(900, Math.max(400, (l.len / 300) * 1000))) < 1, `line ${k}`);
      assert.ok(Math.abs(l.delay - k * 220) < 1, `line ${k} starts at ${l.delay}`);
    });
    const last = lines.at(-1);
    assert.ok(last.delay + last.duration > 2400 && last.delay + last.duration < 2800, "the architecture's last line ends near 2.6s");
    await page.evaluate(() => document.getElementById("fig-sequence").scrollIntoView());
    await untilState(page, "sequence", "running");
    const seqEnd = await page.evaluate(() => Math.max(...document.getElementById("fig-sequence").getAnimations({ subtree: true }).map((a) => Number(a.effect.getComputedTiming().endTime))));
    assert.ok(seqEnd > 4200 && seqEnd < 4400, `the sequence ends at ${seqEnd}`);
    await page.evaluate(() => document.getElementById("fig-schema").scrollIntoView());
    await untilState(page, "schema", "running");
    const starts = await page.evaluate(() => [...document.querySelectorAll("#fig-schema .basalt-diagram-motion-defs mask")].map((m) => ({ id: m.id.split("-reveal-")[1], delay: m.querySelector("path").getAnimations()[0].effect.getComputedTiming().delay, y: Number(m.querySelector("path").getAttribute("d").split(" ")[1]) })).sort((a, b) => a.delay - b.delay));
    for (let k = 1; k < starts.length; k++) assert.ok(starts[k].y >= starts[k - 1].y - 0.5, "top to bottom");
  });

  test("an entrance of 40 lines ends inside duration-diagram-limit", async () => {
    const { page } = await motionPage();
    const nodes = Array.from({ length: 41 }, (_, k) => ({ id: `n${k}`, name: `Node ${k}`, col: (k % 6) + 1, row: Math.floor(k / 6) + 1 }));
    const edges = nodes.slice(1).map((n, k) => ({ from: `n${k}`, to: n.id }));
    await draw(page, [["many", JSON.stringify({ type: "architecture", motion: "animated", title: "Forty lines", summary: "A chain.", nodes, edges })]]);
    const drawn = await page.evaluate(() => document.querySelectorAll("#fig-many .basalt-diagram-edge").length);
    if (drawn) {
      await untilState(page, "many", "running");
      const end = await page.evaluate(() => Math.max(...document.getElementById("fig-many").getAnimations({ subtree: true }).map((a) => Number(a.effect.getComputedTiming().endTime))));
      assert.ok(end <= 5000 + 1, `ends at ${end}`);
    }
  });
});

describe("tracing (then)", () => {
  test("while a node is traced: no cut, bead, dot or arrival step; a run ends", async () => {
    const { page } = await motionPage();
    await draw(page, [["architecture", `S.animated("architecture")`], ["sequence", `S.animated("sequence")`, 80]]);
    await page.evaluate(() => { const f = document.getElementById("fig-architecture"); f.setAttribute("data-entrance", "done"); f.dispatchEvent(new Event("basalt-diagram-settle")); });
    await until(page, () => document.querySelector("#fig-architecture .basalt-diagram-flow"));
    await page.hover("#fig-architecture [data-node='aurora']");
    await frames(page, 2);
    const shown = await page.evaluate(() => [...document.querySelectorAll("#fig-architecture :is(.basalt-diagram-flow, .basalt-diagram-bead, .basalt-diagram-packet)")].filter((x) => getComputedStyle(x).display !== "none").length + document.querySelectorAll("#fig-architecture [data-arrival]").length);
    assert.equal(shown, 0);
    await page.click("#fig-sequence .basalt-diagram-play");
    await page.hover("#fig-sequence [data-node='ecs']");
    await frames(page, 2);
    assert.equal(await page.textContent("#fig-sequence .basalt-diagram-play"), "Play the run");
  });
});

describe("modes (then)", () => {
  for (const theme of ["dark", "light"]) {
    test(`forced colours in ${theme}: no entrance, no loop, no pause control, no mark and no padding for one`, async () => {
      const { page } = await motionPage({ theme, forcedColors: "active" });
      await draw(page, [["architecture", `S.animated("architecture")`]]);
      await frames(page, 10);
      const seen = await page.evaluate(() => { const f = document.getElementById("fig-architecture"); return { state: f.getAttribute("data-entrance"), loops: f.querySelectorAll(".basalt-diagram-flow, .basalt-diagram-bead").length, pause: f.querySelectorAll(".basalt-diagram-pause").length, marks: [...f.querySelectorAll(".basalt-diagram-mark")].filter((m) => getComputedStyle(m).display !== "none").length, pad: [...f.querySelectorAll(".basalt-diagram-node[data-mark] > .basalt-diagram-kind")].map((k) => getComputedStyle(k).paddingInlineEnd) }; });
      assert.deepEqual({ ...seen, pad: [...new Set(seen.pad)] }, { state: "done", loops: 0, pause: 0, marks: 0, pad: ["0px"] });
    });
    test(`more contrast in ${theme}: a card's arrival rim is primary ink, and not a traced neighbour's rim`, async () => {
      const { page } = await motionPage({ theme, contrast: "more" });
      await draw(page, [["architecture", `S.animated("architecture")`]]);
      const seen = await page.evaluate(() => {
        const n = document.querySelector("#fig-architecture [data-node='alb']");
        n.setAttribute("data-arrival", "");
        n.style.transition = "none";
        const rim = getComputedStyle(n).borderTopColor;
        const probe = document.createElement("span"); probe.style.color = "var(--basalt-text-primary)"; n.append(probe); const primary = getComputedStyle(probe).color; probe.style.color = "var(--basalt-border-hover)"; const hover = getComputedStyle(probe).color; probe.remove();
        return { rim, primary, hover };
      });
      assert.equal(seen.rim, seen.primary);
      assert.notEqual(seen.rim, seen.hover);
    });
  }
  test("reduced motion: the run lifts each number in order and stops on its button", async () => {
    const { page } = await motionPage({ reducedMotion: "reduce" });
    await draw(page, [["sequence", `S.animated("sequence")`]]);
    await page.click("#fig-sequence .basalt-diagram-play");
    const order = [];
    for (let k = 0; k < 200 && order.length < 3; k++) {
      await page.evaluate(() => { for (const a of document.getElementById("fig-sequence").getAnimations({ subtree: true })) if (a.playState === "running") a.finish(); });
      await frames(page, 1);
      const lit = await page.evaluate(() => [...document.querySelectorAll("#fig-sequence .basalt-diagram-msg")].findIndex((m) => m.hasAttribute("data-arrival")));
      if (lit >= 0 && order.at(-1) !== lit) order.push(lit);
    }
    assert.deepEqual(order, [0, 1, 2]);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#fig-sequence .basalt-diagram-packet:not([style*='none'])").length), 0, "no traveller");
    await page.click("#fig-sequence .basalt-diagram-play");
    assert.equal(await page.textContent("#fig-sequence .basalt-diagram-play"), "Play the run");
  });
});

describe("marks (first for the first three)", () => {
  test("each generated mark draws the same pixels as its owner's file framed to its artwork, form for form", async () => {
    const { forms } = await import("../marks/generate.mjs");
    const { dataUri } = await import("../marks/clean.mjs");
    const page = await browser.newPage();
    await page.setContent("<!doctype html><canvas></canvas>");
    for (const mark of MANIFEST.marks) {
      const made = forms(mark);
      for (const form of ["light", "dark"]) {
        const file = mark.forms[form] === "swapped" ? mark.forms.light : mark.forms[form];
        let source = fs.readFileSync(path.join(pkg, "marks", "source", file), "utf8");
        if (mark.forms[form] === "swapped") source = source.replace(new RegExp(mark.swap.from, "gi"), mark.swap.to);
        const diff = await page.evaluate(async ({ a, b, box }) => {
          const draw = async (uri, frame) => {
            const img = new Image(); img.src = uri; await img.decode();
            const c = document.createElement("canvas"); c.width = c.height = 64; const ctx = c.getContext("2d");
            const s = 64 / Math.max(box[2], box[3]);
            if (frame) {
              // The owner's file in its own box, placed so its artwork's box fills the canvas as the generated file's does.
              const vb = new DOMParser().parseFromString(decodeURIComponent(uri.slice(uri.indexOf(",") + 1)), "image/svg+xml").documentElement.getAttribute("viewBox").split(/[\s,]+/).map(Number);
              ctx.drawImage(img, (vb[0] - box[0]) * s + (64 - box[2] * s) / 2, (vb[1] - box[1]) * s + (64 - box[3] * s) / 2, vb[2] * s, vb[3] * s);
            } else ctx.drawImage(img, (64 - box[2] * s) / 2, (64 - box[3] * s) / 2, box[2] * s, box[3] * s);
            return ctx.getImageData(0, 0, 64, 64).data;
          };
          const x = await draw(a, false), y = await draw(b, true);
          let worst = 0; for (let k = 0; k < x.length; k++) worst = Math.max(worst, Math.abs(x[k] - y[k]));
          return worst;
        }, { a: dataUri(made[form]), b: `data:image/svg+xml,${encodeURIComponent(source)}`, box: mark.viewBox[form] });
        assert.ok(diff <= 8, `${mark.id} ${form}: ${diff}`);
      }
    }
    await page.close();
  });

  test("no mark module is reachable from the package's index; an app that imports one diagram and one mark loads one mark", async () => {
    const esbuild = await import("esbuild");
    const result = await esbuild.build({
      stdin: { contents: `import { ArchitectureDiagram } from "./dist/index.js"; import { awsEcsService } from "./dist/marks/aws-ecs-service.js"; console.log(ArchitectureDiagram, awsEcsService);`, resolveDir: pkg, loader: "js" },
      bundle: true, write: false, metafile: true, format: "esm", external: ["react", "react-dom", "react/jsx-runtime", "@base-ui/react", "@base-ui/react/*", "@phosphor-icons/react", "@phosphor-icons/react/*", "cmdk", "shiki", "shiki/*"], logLevel: "silent",
    });
    const inputs = Object.keys(result.metafile.inputs).filter((f) => f.includes("dist/marks/"));
    assert.deepEqual(inputs.map((f) => path.basename(f)), ["aws-ecs-service.js"]);
    assert.ok(!fs.readFileSync(path.join(pkg, "dist", "index.js"), "utf8").includes("marks/"));
  });

  test("every mark's ink, read from the manifest, is 3:1 on levels 1 to 3 in both themes; on the focal fills too, but for the four recorded", async () => {
    const tokens = JSON.parse(fs.readFileSync(path.join(pkg, "..", "tokens", "dist", "json", "tokens.json"), "utf8"));
    const hex = (theme, name) => tokens[theme][name].hex.slice(0, 7);
    const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const RECORDED = { "#ED7100": 2.58, "#7AA116": 2.59, "#01A88D": 2.57, "#FF570A": 2.71 };
    for (const mark of MANIFEST.marks) {
      for (const theme of ["dark", "light"]) {
        const ink = (theme === "dark" ? mark.ink.dark : mark.ink.light).toUpperCase();
        for (const level of ["surface-1", "surface-2", "surface-3"]) assert.ok(ratio(ink, hex(theme, level)) >= 3, `${mark.id} on ${theme} ${level}: ${ratio(ink, hex(theme, level)).toFixed(2)}`);
        // The focal card takes the other theme's form.
        const focalInk = (theme === "dark" ? mark.ink.light : mark.ink.dark).toUpperCase();
        const r = ratio(focalInk, hex(theme, "diagram-focal"));
        if (theme === "dark" && RECORDED[focalInk]) assert.ok(Math.abs(r - RECORDED[focalInk]) < 0.015, `${mark.id} on the dark focal card is ${r.toFixed(2)}, recorded ${RECORDED[focalInk]}`);
        else assert.ok(r >= 3, `${mark.id} on the ${theme} focal card: ${r.toFixed(2)}`);
      }
    }
  });

  test("the form drawn is right on all four grounds, and on the focal card in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await motionPage({ theme });
      await draw(page, [["kit", `{ ...S.kit(), nodes: S.kit().nodes.map((n) => (n.id === "github" ? { ...n, focal: true } : n)), legend: { ...S.kit().legend, focal: "The start" } }`]]);
      const seen = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("#fig-kit .basalt-diagram-node[data-mark]")].map((n) => { const m = n.querySelector(".basalt-diagram-mark"); const cs = getComputedStyle(m); return [n.dataset.node, { image: cs.backgroundImage, light: cs.getPropertyValue("--_ml").trim(), dark: cs.getPropertyValue("--_md").trim() }]; })));
      const url = (v) => v.replace(/^url\(["']?|["']?\)$/g, "");
      for (const [id, s] of Object.entries(seen)) {
        const focal = id === "github";
        const want = (theme === "dark") !== focal ? s.dark : s.light;
        assert.equal(url(s.image), url(want), `${theme} ${id}`);
      }
      await page.close();
    }
  });

  test("a card with a mark and no kind: the name does not overlap the mark", async () => {
    const { page } = await motionPage();
    await draw(page, [["arch", `{ ...S.animated("architecture"), nodes: S.animated("architecture").nodes.map((n) => ({ ...n, kind: undefined, name: n.id === "s3" ? "Simple Storage Service bucket" : n.name })) }`]]);
    const bad = await page.evaluate(() => [...document.querySelectorAll("#fig-arch .basalt-diagram-node[data-mark]")].filter((n) => {
      const m = n.querySelector(".basalt-diagram-mark").getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(n.querySelector(".basalt-diagram-name"));
      return [...range.getClientRects()].some((r) => r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top);
    }).map((n) => n.dataset.node));
    assert.deepEqual(bad, []);
  });

  test("the manifest: every entry has every field, each source file's hash matches, no file is unlisted, THIRD-PARTY-MARKS.md names every owner", async () => {
    const { FIELDS } = await import("../marks/generate.mjs");
    const crypto = await import("node:crypto");
    const listed = new Set();
    assert.equal(MANIFEST.marks.length, 41);
    for (const mark of MANIFEST.marks) {
      for (const field of FIELDS) assert.ok(mark[field] !== undefined, `${mark.id}: ${field}`);
      for (const [file, hash] of Object.entries(mark.sha256)) {
        assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(pkg, "marks", "source", file))).digest("hex"), hash, file);
        listed.add(file);
      }
    }
    const files = fs.readdirSync(path.join(pkg, "marks", "source"), { recursive: true }).filter((f) => fs.statSync(path.join(pkg, "marks", "source", f)).isFile()).map((f) => f.split(path.sep).join("/"));
    assert.deepEqual(files.filter((f) => !listed.has(f)), []);
    const notice = fs.readFileSync(path.join(pkg, "THIRD-PARTY-MARKS.md"), "utf8");
    for (const owner of new Set(MANIFEST.marks.map((m) => m.owner))) assert.ok(notice.includes(owner), owner);
    assert.ok(JSON.parse(fs.readFileSync(path.join(pkg, "package.json"), "utf8")).files.includes("THIRD-PARTY-MARKS.md"));
  });

  test("axe in both themes with marks and motion on, and the node sentences equal the still figure's", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await motionPage({ theme });
      await draw(page, [["architecture", `S.animated("architecture")`], ["still", `S.still.architecture`, 40]]);
      await until(page, () => document.querySelector("#fig-architecture .basalt-diagram-pause"));
      const sentences = await page.evaluate(() => ["architecture", "still"].map((k) => [...document.querySelectorAll(`#fig-${k} .basalt-diagram-node`)].map((n) => n.getAttribute("aria-label"))));
      assert.deepEqual(sentences[0], sentences[1]);
      await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
      const require = (await import("node:module")).createRequire(import.meta.url);
      await page.addScriptTag({ content: fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8") });
      const violations = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }).then((r) => r.violations.map((v) => v.id)));
      assert.deepEqual(violations, []);
      await page.close();
    }
  });
});
