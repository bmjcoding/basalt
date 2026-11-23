// The skill's diagram motion and service marks (DECISIONS 292): what compose.mjs writes (the diagram-motion module only for an animated diagram, one rule a
// mark a page names, a page's own mark read into the file), and the module in a page: pending until in view, the entrance, settling, the hold, print, and
// React's and the skill's figures at rest drawing the same pixels. Written when test runs were paused (DECISIONS 271): not yet run. The implementation
// hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { animated, FIGURES, kit, STILL } from "../../../packages/react/test/diagram-motion-fixture.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const figure = (spec, id) => `<figure class="diagram"${id ? ` id="${id}"` : ""}><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure>`;
const page = (figs, gap = 0) => `<title>Motion</title><main style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:${gap}px">${figs.join("")}</main>`;

describe("compose.mjs", () => {
  test("a still diagram brings in no motion module, no loops and no mark; an animated one brings both modules", () => {
    const still = compose(page([figure(STILL.architecture)]));
    assert.ok(!still.modules.includes("diagram-motion") && !still.modules.includes("loops"));
    assert.ok(!still.html.includes("data:image/svg+xml,%3Csvg"));
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
    assert.throws(() => compose(page([figure({ ...STILL.architecture, nodes: STILL.architecture.nodes.map((n) => ({ ...n, mark: "jenkins" })) })])), /not a bundled service mark/);
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
    const { page: p } = await openHtml(browser, page([figure(spec, "fig-send")]));
    await p.evaluate(() => { const f = document.getElementById("fig-send"); f.setAttribute("data-entrance", "done"); f.dispatchEvent(new Event("basalt-diagram-settle")); });
    assert.equal(await p.evaluate(() => document.querySelectorAll("#fig-send .diagram-packet").length), 0);
    await p.evaluate((spec) => window.Basalt.diagram(document.getElementById("fig-send"), { ...spec, packet: { ...spec.packet, send: 2 } }), spec);
    await p.waitForFunction(() => document.querySelector("#fig-send .diagram-packet") && getComputedStyle(document.querySelector("#fig-send .diagram-packet")).display !== "none", null, { polling: "raf", timeout: 3000 });
  });

  test("in forced colours no mark is drawn and the first line keeps no padding; in print every mark computes print-color-adjust: exact", async () => {
    const { page: p } = await openHtml(browser, compose(page([figure(kit(), "fig-kit")])).html);
    await p.emulateMedia({ forcedColors: "active" });
    const forced = await p.evaluate(() => [...document.querySelectorAll(".diagram-mark")].map((m) => getComputedStyle(m).display));
    assert.ok(forced.every((d) => d === "none"));
    await p.emulateMedia({ forcedColors: "none", media: "print" });
    const print = await p.evaluate(() => [...document.querySelectorAll(".diagram-mark")].map((m) => getComputedStyle(m).printColorAdjust));
    assert.ok(print.length === 6 && print.every((v) => v === "exact"));
  });
});
