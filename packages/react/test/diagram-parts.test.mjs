// Nested groups, link cards and two-line labels (DECISIONS 306, 1.3 and 1.4; part of section 8's list for diagram-parts.test.mjs), on the extended CIMIP
// architecture (test/fixtures/cimip-diagrams-b.json), end lanes and several entries into one card, and marks on steps and participants. In Chromium against
// the built package, both themes.
// The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import path from "node:path";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const P = "basalt-diagram";
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/cimip-diagrams-b.json";
const C = { architecture: B.ArchitectureDiagram, schema: B.SchemaDiagram };
createRoot(document.getElementById("root")).render(<div style={{ display: "grid", gap: 64 }}>{["architecture", "schema"].map((key) => { const { type, ...props } = data[key]; const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>);`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function partsPage({ theme = "dark", width = 1440, touch = false } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1200 }, hasTouch: touch, isMobile: touch });
  if (touch) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  await page.addStyleTag({ content: "body{margin:0;padding:16px} #root{max-width:1104px;margin:0 auto}" });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 4);
  return { page, errors };
}

describe("nested groups", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: the inner boundary is 16 inside the outer at the end side and 32 below its top; radius 8 against 12; the sentence names the chain`, async () => {
    const { page, errors } = await partsPage({ theme });
    const g = await page.evaluate((P) => {
      const box = (id) => { const el = document.querySelector(`#fig-architecture .${P}-gbox[data-group="${id}"]`); const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, radius: getComputedStyle(el).borderTopLeftRadius }; };
      const cell = (id) => document.querySelector(`#fig-architecture .${P}-node[data-node="${id}"]`).getBoundingClientRect();
      return { aws: box("aws"), data: box("data"), aurora: cell("aurora"), sentence: document.querySelector(`#fig-architecture .${P}-node[data-node="aurora"]`).getAttribute("aria-label") };
    }, P);
    assert.equal(Math.round(g.aws.r - g.data.r), 16, "16 inside at the end side");
    assert.equal(Math.round(g.data.t - g.aws.t), 32, "32 below the outer's top");
    assert.equal(Math.round(g.aurora.top - g.data.t), 32, "the inner box is space-8 above its first card");
    assert.equal(g.aws.radius, "12px");
    assert.equal(g.data.radius, "8px");
    assert.match(g.sentence, /In Data & logs, in AWS · your account\./);
    assert.deepEqual(errors, []);
    await page.close();
  });
  test("stacked, a nested group is a wrapper inside its parent's, and the list nests", async () => {
    const { page } = await partsPage({ width: 390 });
    assert.equal(await page.locator(`#fig-architecture .${P}-group[data-group="aws"] .${P}-group[data-group="data"]`).count(), 1);
    const list = await page.locator(`#fig-architecture .${P}-list .${P}-list-group`).allTextContents();
    assert.deepEqual(list.filter((t) => /AWS|Data/.test(t)), ["AWS · your account", "Data & logs"]);
    await page.close();
  });
});

describe("link cards", () => {
  test("a link card is an <a>, the figure is one tab stop, the arrows reach the link and Enter follows it; its name begins with the visible name", async () => {
    const { page } = await partsPage();
    const svc = page.locator(`#fig-architecture .${P}-node[data-node="svc"]`);
    assert.equal(await svc.evaluate((e) => e.tagName), "A");
    assert.equal(await svc.getAttribute("href"), "#fig-sequence");
    assert.match(await svc.getAttribute("aria-label"), /^cimip service/);
    // One tab stop: the figure's roving stop is the first card; the arrows reach the link.
    const stops = await page.locator(`#fig-architecture .${P}-node[tabindex="0"]`).count();
    assert.equal(stops, 1);
    await page.locator(`#fig-architecture .${P}-node[data-node="alb"]`).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-node")), "svc");
    await page.keyboard.press("Enter");
    await frames(page);
    assert.equal(await page.evaluate(() => location.hash), "#fig-sequence");
    await page.close();
  });
  test("the cue: secondary at rest, primary and travelling on hover, never alone on a line; no scale on press; 44px on touch", async () => {
    const { page } = await partsPage();
    const cue = (sel) => page.locator(sel).evaluate((e) => { const s = getComputedStyle(e, "::after"); return { bg: `${s.backgroundColor} ${s.opacity}`, transform: s.transform, w: s.width }; });
    const end = `#fig-architecture .${P}-node[data-node="svc"] .${P}-name-end`;
    const rest = await cue(end);
    assert.equal(rest.w, "16px");
    await page.locator(`#fig-architecture .${P}-node[data-node="svc"]`).hover();
    await page.waitForTimeout(250);
    const hover = await cue(end);
    assert.notEqual(hover.bg, rest.bg, "the focal card's cue lifts from its quiet ink");
    assert.notEqual(hover.transform, "none");
    assert.match(await page.locator(`#fig-architecture .${P}-node[data-node="svc"] .${P}-name`).evaluate((e) => getComputedStyle(e).textDecorationLine), /underline/);
    assert.equal(await page.locator(end).evaluate((e) => getComputedStyle(e).whiteSpace), "nowrap", "the arrow holds the last word");
    await page.mouse.down();
    assert.equal(await page.locator(`#fig-architecture .${P}-node[data-node="svc"]`).evaluate((e) => getComputedStyle(e).transform), "none");
    await page.mouse.up();
    await page.close();
    const phone = await partsPage({ width: 390, touch: true });
    const h = await phone.page.locator(`#fig-architecture .${P}-node[data-node="svc"]`).evaluate((e) => e.getBoundingClientRect().height);
    assert.ok(h >= 44);
    await phone.page.close();
  });
});

describe("two-line labels", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: both lines in one ink on one plate, 32 tall; the list joins them with a space`, async () => {
    const { page } = await partsPage({ theme });
    const two = await page.locator(`#fig-architecture .${P}-label[data-lines="2"]`).evaluateAll((els) => els.map((e) => ({ h: e.getBoundingClientRect().height, text: e.innerText, colors: [...new Set([getComputedStyle(e).color])] })));
    assert.equal(two.length, 2);
    for (const l of two) { assert.equal(Math.round(l.h), 32); assert.equal(l.text.split("\n").length, 2); assert.equal(l.colors.length, 1); }
    const list = await page.locator(`#fig-architecture .${P}-list`).evaluate((e) => e.textContent);
    assert.match(list, /SQL · NOTIFY one transaction/);
    await page.close();
  });
});

// A stacked spine of eight cards with end lines out of the first: n lines that overlap need n lanes (DECISIONS 306, 1.3).
const SPINE = (lines) => ({ title: "Lanes", summary: "End lines.", legend: { plain: "Call" }, nodes: Array.from({ length: 8 }, (_, k) => ({ id: `n${k}`, name: `N${k}`, col: 1, row: k + 1 })), edges: lines.map(([a, b]) => ({ from: `n${a}`, to: `n${b}` })) });
const SET_HOST = `
function Host() {
  const [spec, setSpec] = React.useState(null);
  window.__set = (next) => flushSync(() => setSpec(next));
  return spec ? <B.ArchitectureDiagram id="fig-lanes" {...spec} /> : null;
}
createRoot(document.getElementById("root")).render(<Host />);`;

describe("end lanes and several entries into one card (1.3; Neon's B12)", () => {
  test("three and four lanes at a space-3-5 pitch, the gutter its lanes and space-3; a fifth draws no lines and opens the list; several entries into one card turn space-5 apart, outermost lowest", async () => {
    const { page } = await fixturePage(browser, SET_HOST, { standards: true, viewport: { width: 390, height: 1400 } });
    await page.evaluate(() => document.fonts.ready);
    const lanes = async (lines) => {
      await page.evaluate((spec) => window.__set(spec), SPINE(lines));
      await frames(page, 5);
      return page.evaluate(() => {
        const fig = document.querySelector("#fig-lanes");
        const d = fig.querySelector(".basalt-diagram-drawing").getBoundingClientRect();
        const cardsR = Math.max(...[...fig.querySelectorAll(".basalt-diagram-node")].map((n) => n.getBoundingClientRect().right)) - d.left;
        const xs = [...new Set([...fig.querySelectorAll(".basalt-diagram-svg .basalt-diagram-line")].map((p) => Math.max(...p.getAttribute("d").match(/-?[\d.]+/g).map(Number).filter((_, k) => k % 2 === 0))))].map((x) => Math.round((x - cardsR) * 2) / 2).sort((a, b) => a - b);
        return { bare: fig.hasAttribute("data-bare"), open: !fig.querySelector(".basalt-diagram-list").hidden, gutter: d.right - d.left - cardsR, xs };
      });
    };
    // Lines that all pass n1..n2 overlap: three of them, then four.
    const three = await lanes([[0, 3], [0, 4], [0, 5]]);
    assert.ok(!three.bare && Math.abs(three.gutter - 54) <= 0.5, JSON.stringify(three));
    assert.deepEqual(three.xs.map((x, k) => (k ? x - three.xs[k - 1] : 0)).slice(1), [14, 14]);
    const four = await lanes([[0, 3], [0, 4], [0, 5], [0, 6]]);
    assert.ok(!four.bare && Math.abs(four.gutter - 68) <= 0.5, JSON.stringify(four));
    const five = await lanes([[0, 3], [0, 4], [0, 5], [0, 6], [0, 7]]);
    assert.ok(five.bare && five.open, JSON.stringify(five));
    // Two end lines into one card (n5, from n0 and n1): the outer line turns lowest, the inner space-5 higher.
    await page.evaluate((spec) => window.__set(spec), SPINE([[0, 5], [1, 5]]));
    await frames(page, 5);
    const turns = await page.evaluate(() => [...document.querySelectorAll("#fig-lanes .basalt-diagram-edge")].filter((g) => g.dataset.to === "n5").map((g) => { const n = g.querySelector(".basalt-diagram-line").getAttribute("d").match(/-?[\d.]+/g).map(Number); const pts = []; for (let k = 0; k + 1 < n.length; k += 2) pts.push([n[k], n[k + 1]]); let turn = null; for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k][1] - pts[k - 1][1]) < 0.01 && Math.abs(pts[k][0] - pts[k - 1][0]) > 2) turn = pts[k][1]; return { lane: Math.max(...pts.map((p) => p[0])), turn }; }).sort((a, b) => b.lane - a.lane));
    assert.equal(turns.length, 2);
    assert.ok(turns[0].turn > turns[1].turn, `the outermost lane turns lowest ${JSON.stringify(turns)}`);
    assert.ok(Math.abs(turns[0].turn - turns[1].turn - 20) <= 1, `space-5 apart ${JSON.stringify(turns)}`);
    await page.close();
  });
});

describe("marks on steps and participants (1.6; Neon's B10 and B12)", () => {
  test("a data flow step's mark counts its lane's label as its words; a participant may carry a mark and a person never needs one", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const flow = (lane) => core.buildModel({ type: "data-flow", title: "t", summary: "s", lanes: [{ id: "s3", label: lane }], nodes: [{ id: "seg", lane: "s3", col: 1, name: "Sealed segment", mark: { onLight: "a.svg", says: ["S3"] } }], edges: [] });
    assert.deepEqual(flow("S3").warnings, [], "the lane's label says S3");
    assert.ok(flow("Storage").warnings.some((w) => /stands for S3/.test(w)), "and without it the mark carries a fact alone");
    const seq = core.buildModel({ type: "sequence", title: "t", summary: "s", participants: [{ id: "a", name: "Amazon S3", mark: { onLight: "a.svg", says: ["S3"] } }, { id: "p", name: "Marcus" }], steps: [{ from: "p", to: "a", label: "put" }] });
    assert.deepEqual(seq.warnings, []);
    assert.ok(seq.nodes[0].mark && !seq.nodes[1].mark);
  });
});
