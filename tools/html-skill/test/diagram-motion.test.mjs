// The skill's diagram motion and service marks (DECISIONS 292): what compose.mjs writes (the diagram-motion module only for an animated diagram, one rule a
// mark a page names, a page's own mark read into the file), and the module in a page: pending until in view, the entrance, settling, the hold, print, and
// a one-form mark written once. Written when test runs were paused (DECISIONS 271); fixed and run when the owner lifted the skip for diagrams
// (DECISIONS 298). React's and the skill's figures at rest drawing the same pixels, and the skill's send queue, were added in batch A (DECISIONS 301).
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { animated, FIGURES, kit, STILL } from "../../../packages/react/test/diagram-motion-fixture.mjs";
import { fixturePage, launch as launchReact, pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const figure = (spec, id) => `<figure class="diagram"${id ? ` id="${id}"` : ""}><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure>`;
const page = (figs, gap = 0) => `<title>Motion</title><main style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:${gap}px">${figs.join("")}</main>`;

describe("compose.mjs", () => {
  test("a still diagram brings in no motion module, no loops and no mark; an animated one brings both modules", () => {
    const still = compose(page([figure(STILL.architecture)]));
    assert.ok(!still.modules.includes("diagram-motion") && !still.modules.includes("loops"));
    // No service mark's rule (a link card's cue is a core glyph's mask in the stylesheet, DECISIONS 306, 1.4, and is not a mark).
    assert.ok(!/\.diagram-node\[data-mark=/.test(still.html));
    const moving = compose(page([figure(animated("dataFlow"))]));
    assert.ok(moving.modules.includes("diagram-motion") && moving.modules.includes("loops"));
    assert.match(moving.html, /<figure[^>]*data-motion="animated"/);
  });

  test("a page with two cards on one mark holds its data once; a page with no mark holds none", () => {
    const spec = animated("architecture");
    const { html } = compose(page([figure(spec)]));
    const marks = JSON.parse(fs.readFileSync(new URL("../src/marks.json", import.meta.url), "utf8")).marks;
    const ecs = marks["aws-ecs-service"].onLight;
    const count = html.split(ecs.slice(0, 200)).length - 1;
    assert.equal(count, 1, "aws-ecs-service is on two cards and in the page once");
    assert.equal((html.match(/\.diagram-node\[data-mark="aws-ecs-service"\]/g) ?? []).length, 1);
    assert.ok(!html.includes(marks.temporal.onLight.slice(0, 200)), "a mark no card names is not in the page");
  });

  test("a page's own mark is read into the file, and its JSON carries an id, never the path", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-mark-"));
    fs.writeFileSync(path.join(dir, "acme.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#123456"/></svg>');
    const spec = { ...STILL.architecture, nodes: STILL.architecture.nodes.map((n) => (n.id === "alb" ? { ...n, mark: { onLight: "acme.svg" } } : n)) };
    const { html } = compose(page([figure(spec)]), { baseDir: dir });
    assert.ok(!html.includes("acme.svg"));
    assert.match(html, /\.diagram-node\[data-mark="page-1"\]>\.diagram-mark\{--_ml:url\("data:image\/svg\+xml,/);
    assert.match(html, /"mark":"page-1"/);
    assert.throws(() => compose(page([figure({ ...spec, nodes: spec.nodes.map((n) => (n.id === "alb" ? { ...n, mark: { onLight: "https://example.com/a.svg" } } : n)) })]), { baseDir: dir }), /leaves the file/);
  });

  test("a figure drawn from script names its marks in a comment; an unknown id is refused", () => {
    const { html } = compose(`<title>x</title><!-- basalt:marks temporal aws-s3-bucket --><figure class="diagram" id="late"></figure><script>Basalt.diagram(document.getElementById("late"), {})</script>`);
    assert.match(html, /data-mark="temporal"/);
    assert.match(html, /data-mark="aws-s3-bucket"/);
    assert.throws(() => compose(page([figure({ ...STILL.architecture, nodes: STILL.architecture.nodes.map((n) => ({ ...n, mark: "no-such-mark" })) })])), /not a bundled service mark/);
  });

  test("a card whose words do not say what its mark stands for is noted", () => {
    const spec = { ...STILL.architecture, nodes: STILL.architecture.nodes.map((n) => (n.id === "browser" ? { ...n, mark: "temporal" } : n)) };
    const { diagrams } = compose(page([figure(spec)]));
    assert.ok(diagrams.some((d) => /browser's mark \(temporal\) stands for Temporal/.test(d)));
  });
});

describe("the module in a page", () => {
  const all = () => compose(page([...FIGURES.map((k) => figure(animated(k), `fig-${k}`)), figure(kit(), "fig-kit")], 1600)).html;
  const entrance = (p, id) => p.evaluate((id) => document.getElementById(id).getAttribute("data-entrance"), id);

  test("every figure below the fold is pending after the faces; the first plays; scrolled to, each plays; nothing errs", async () => {
    const { page: p, errors } = await openHtml(browser, all());
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    assert.equal(await entrance(p, "fig-architecture"), "running");
    for (const k of ["flowchart", "dataFlow", "sequence", "schema"]) assert.equal(await entrance(p, `fig-${k}`), "pending", k);
    for (const k of ["flowchart", "dataFlow", "sequence", "schema", "kit"]) {
      await p.evaluate((k) => document.getElementById(`fig-${k}`).scrollIntoView({ block: "center" }), k);
      await p.waitForFunction((k) => document.getElementById(`fig-${k}`).getAttribute("data-entrance") !== "pending", k, { polling: "raf", timeout: 5000 });
    }
    assert.deepEqual(errors, []);
  });

  test("a hover settles; the hold clears the loops and the foot's button is the hold, pressed; print shows every line", async () => {
    const { page: p } = await openHtml(browser, all());
    await p.hover("#fig-architecture [data-node='alb']");
    assert.equal(await entrance(p, "fig-architecture"), "done");
    await p.mouse.move(0, 0);
    await p.click("#fig-architecture .diagram-pause");
    const held = await p.evaluate(() => ({ root: document.documentElement.getAttribute("data-loops"), pressed: document.querySelector("#fig-architecture .diagram-pause").getAttribute("aria-pressed"), shown: [...document.querySelectorAll("#fig-architecture :is(.diagram-flow, .diagram-bead, .diagram-packet)")].filter((x) => getComputedStyle(x).display !== "none").length }));
    assert.deepEqual(held, { root: "held", pressed: "true", shown: 0 });
    await p.emulateMedia({ media: "print" });
    const lines = await p.evaluate(() => [...document.querySelectorAll(".diagram-edges")].every((e) => getComputedStyle(e).visibility === "visible"));
    assert.ok(lines);
  });

  test("under reduced motion every figure is at rest and no pause control is shown; the run is", async () => {
    const { page: p } = await openHtml(browser, all(), { reducedMotion: "reduce" });
    const seen = await p.evaluate(() => [...document.querySelectorAll("figure.diagram")].map((f) => [f.getAttribute("data-entrance"), [...f.querySelectorAll(".diagram-foot button")].filter((b) => !b.hidden).map((b) => b.textContent.trim())]));
    for (const [state] of seen) assert.equal(state, "done");
    assert.ok(seen.every(([, buttons]) => !buttons.includes("Pause animations")));
    assert.ok(seen.some(([, buttons]) => buttons.includes("Play the run")));
  });

  test("Basalt.diagram with a new packet.send sends one message; the first draw sends none", async () => {
    const spec = { ...animated("dataFlow"), packet: { path: ["send", "append", "row", "hear", "see"], send: 1 } };
    // The page composed, as every other page here is: an uncomposed fragment has no Basalt runtime and no styles.
    const { page: p } = await openHtml(browser, compose(page([figure(spec, "fig-send")])).html);
    await p.evaluate(() => { const f = document.getElementById("fig-send"); f.setAttribute("data-entrance", "done"); f.dispatchEvent(new Event("basalt-diagram-settle")); });
    assert.equal(await p.evaluate(() => document.querySelectorAll("#fig-send .diagram-packet").length), 0);
    await p.evaluate((spec) => window.Basalt.diagram(document.getElementById("fig-send"), { ...spec, packet: { ...spec.packet, send: 2 } }), spec);
    await p.waitForFunction(() => document.querySelector("#fig-send .diagram-packet") && getComputedStyle(document.querySelector("#fig-send .diagram-packet")).display !== "none", null, { polling: "raf", timeout: 3000 });
  });

  test("a mark with one form is written once and drawn on every card, the focal card too, in both themes", async () => {
    // CodeRabbit has one form for both grounds; on the focal card it takes the other theme's form, which falls back to its one.
    const spec = { ...kit(), nodes: kit().nodes.map((n) => (n.id === "coderabbit" ? { ...n, focal: true } : n)), legend: { ...kit().legend, focal: "The review" } };
    const { html } = compose(page([figure(spec, "fig-kit")]));
    assert.doesNotMatch(html, /\[data-mark="coderabbit"\]>\.diagram-mark\{[^}]*--_md:/, "no second copy of a one-form mark");
    for (const scheme of ["dark", "light"]) {
      const { page: p } = await openHtml(browser, html, { scheme });
      const seen = await p.evaluate(() => [...document.querySelectorAll("#fig-kit .diagram-node[data-mark]")].map((n) => [n.dataset.node, getComputedStyle(n.querySelector(".diagram-mark")).backgroundImage.startsWith('url("data:image/svg+xml')]));
      assert.equal(seen.length, kit().nodes.filter((n) => n.mark).length);
      assert.deepEqual(seen.filter(([, drawn]) => !drawn), [], `${scheme}: every mark draws`);
    }
  });

  test("in forced colours no mark is drawn and the first line keeps no padding; in print every mark computes print-color-adjust: exact", async () => {
    const { page: p } = await openHtml(browser, compose(page([figure(kit(), "fig-kit")])).html);
    await p.emulateMedia({ forcedColors: "active" });
    const forced = await p.evaluate(() => [...document.querySelectorAll(".diagram-mark")].map((m) => getComputedStyle(m).display));
    assert.ok(forced.every((d) => d === "none"));
    await p.emulateMedia({ forcedColors: "none", media: "print" });
    const print = await p.evaluate(() => [...document.querySelectorAll(".diagram-mark")].map((m) => getComputedStyle(m).printColorAdjust));
    assert.ok(print.length === kit().nodes.filter((n) => n.mark).length && print.every((v) => v === "exact"), JSON.stringify(print));
  });
});

describe("batch A (DECISIONS 301)", () => {
  test("Basalt.diagram's sends: with a packet in flight one waits and a second is dropped, so two messages land", async () => {
    const spec = (send) => ({ ...animated("dataFlow"), packet: { path: ["send", "append", "row", "hear", "see"], send } });
    const { page: p, errors } = await openHtml(browser, compose(page([figure(spec(0), "fig-send")])).html);
    await p.evaluate(() => { const f = document.getElementById("fig-send"); f.setAttribute("data-entrance", "done"); f.dispatchEvent(new Event("basalt-diagram-settle")); });
    const send = (n) => p.evaluate((s) => window.Basalt.diagram(document.getElementById("fig-send"), s), spec(n));
    await send(1);
    await p.waitForFunction(() => { const d = document.querySelector("#fig-send .diagram-packet"); return d && getComputedStyle(d).display !== "none"; }, null, { polling: "raf", timeout: 3000 });
    await send(2);
    await send(3);
    let landed = 0, lit = false;
    for (let k = 0; k < 400; k++) {
      await p.evaluate(() => { for (const a of document.getElementById("fig-send").getAnimations({ subtree: true })) if (a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity) a.finish(); });
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      const now = await p.evaluate(() => document.querySelector("#fig-send [data-node='see']").hasAttribute("data-arrival"));
      if (now && !lit) landed++;
      lit = now;
    }
    assert.equal(landed, 2);
    assert.deepEqual(errors, []);
  });

  // React's host for one animated example: the fixture's data with its motion keys, and each mark id turned into its module, as an app imports them.
  const MANIFEST = JSON.parse(fs.readFileSync(path.join(pkg, "marks", "manifest.json"), "utf8"));
  const exportName = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const REACT = `
${MANIFEST.marks.map((m) => `import { ${exportName(m.id)} } from "./dist/marks/${m.id}.js";`).join("\n")}
const MARKS = { ${MANIFEST.marks.map((m) => `"${m.id}": ${exportName(m.id)}`).join(", ")} };
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() {
  const [spec, setSpec] = React.useState(null);
  window.__set = (next) => flushSync(() => setSpec(next));
  if (!spec) return null;
  const { type, ...props } = spec;
  if (props.nodes) props.nodes = props.nodes.map((n) => (typeof n.mark === "string" ? { ...n, mark: MARKS[n.mark] } : n));
  const X = C[type];
  return <main style={{ maxWidth: 1104, margin: "0 auto", padding: 16, display: "grid", gap: 0 }}><X id="fig-x" {...props} /></main>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
  const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
  const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
  const frames = (p, n) => p.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
  /** The drawing's pixels, read from a screenshot of it, with its size. */
  /** The drawing's screenshot and its place on the page (not in the window, which a tall figure scrolls). */
  const shot = async (p, prefix) => {
    const loc = p.locator(`#fig-x .${prefix}-drawing`);
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });
    return { box, png: await loc.screenshot({ type: "png" }) };
  };
  /** Two screenshots of one size, decoded in a page only when their files differ: how many pixels differ, and the first. */
  const pixelDiff = (p, a, b) => p.evaluate(async ([a, b]) => {
    const read = async (b64) => { const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0); return { w: img.width, d: ctx.getImageData(0, 0, img.width, img.height).data }; };
    const [x, y] = [await read(a), await read(b)];
    let n = 0, first = null;
    for (let k = 0; k < x.d.length; k += 4) if (x.d[k] !== y.d[k] || x.d[k + 1] !== y.d[k + 1] || x.d[k + 2] !== y.d[k + 2]) { n++; first ??= [(k / 4) % x.w, Math.floor(k / 4 / x.w)]; }
    return { n, first };
  }, [a.toString("base64"), b.toString("base64")]);
  /** At rest: the hold settles the entrance and clears the loops to rest, every line whole; then nothing finite is left running. */
  const atRest = async (p) => {
    await p.waitForFunction(() => { const f = document.getElementById("fig-x"); return f && f.hasAttribute("data-measured") && (!f.querySelector("[class$='-svg']") || f.getAttribute("data-entrance") === "done"); }, null, { polling: "raf", timeout: 5000 });
    await frames(p, 6);
    await p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
  };

  for (const theme of ["dark", "light"]) {
    test(`${theme}: React and the skill draw the same pixels for each animated example and the kit at rest (under the hold, settled)`, async () => {
      const diff = [];
      // React: one app page for every example (bundling it is most of the cost), as the still parity test gives it: border-box, the body's ink and type,
      // and the text rendering and language the skill's core sets, which a pixel comparison of words must share.
      const react = await fixturePage(reactBrowser, REACT, { theme, viewport: { width: 1440, height: 1000 }, standards: true });
      await react.page.addStyleTag({ content: `${FONTS} *, ::before, ::after { box-sizing: border-box; } html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; text-size-adjust: 100%; } body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); } #root{display:block}` });
      await react.page.evaluate(() => { document.documentElement.lang = "en"; document.documentElement.setAttribute("data-loops", "held"); });
      await react.page.evaluate(() => document.fonts.ready);
      for (const key of [...FIGURES, "kit"]) {
        const spec = key === "kit" ? kit() : animated(key);
        // The skill: the page composed, one figure, held.
        const skill = await openHtml(browser, compose(page([figure(spec, "fig-x")])).html, { scheme: theme, width: 1440 });
        await skill.page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
        await atRest(skill.page);
        // React: the figure drawn afresh on the one page.
        await react.page.evaluate(() => window.__set(null));
        await react.page.evaluate((s) => window.__set(s), spec);
        await atRest(react.page);
        const [a, b] = [await shot(skill.page, "diagram"), await shot(react.page, "basalt-diagram")];
        if (["x", "y", "w", "h"].some((k) => Math.abs(a.box[k] - b.box[k]) > 0.01)) diff.push(`${key}: the drawing is ${JSON.stringify(a.box)} in the skill and ${JSON.stringify(b.box)} in React`);
        else if (!a.png.equals(b.png)) {
          const { n, first } = await pixelDiff(skill.page, a.png, b.png);
          if (n) diff.push(`${key}: ${n} pixels differ, the first at ${first}`);
        }
        assert.deepEqual(skill.errors, []);
        await skill.context.close();
      }
      assert.deepEqual(react.errors, []);
      await react.page.close();
      assert.deepEqual(diff, []);
    });
  }
});
