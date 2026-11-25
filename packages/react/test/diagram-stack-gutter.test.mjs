// Backlog four, item 1 (the council's decision of 25 Nov 2026, the owner's words for the line): a stacked line whose route would pass a card it does not
// end on is planned again as an end line in the end gutter, outside every card and group box, in the author's order; a stack that still cannot be drawn
// is bare, and one line where its key sits says so. In Node and in Chromium against the built package, in React and in the HTML skill. Written while
// tests are paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { inspectSource } from "./diagram-geometry.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const DATA = { ...JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-stack-gutter.json"), "utf8")), nestedOneLine: JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-layout.json"), "utf8")).figures.nestedOneLine };
const KEYS = ["nestedTrunk", "fiveLanes", "nestedOneLine"];
const core = () => import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;

describe("the plan: a moved line is an end line in the gutter, and nothing else changes", () => {
  test("nestedTrunk's A to B is a trunk until it is moved, then an end line down, with the gutter", async () => {
    const c = await core();
    const m = c.buildModel(DATA.nestedTrunk);
    const first = c.stackPlan(m);
    assert.deepEqual(first.routes, ["down", "trunk", "trunk"]);
    assert.equal(first.gutter, false);
    const moved = c.stackPlan(m, [2]);
    assert.deepEqual(moved.routes, ["down", "trunk", "end-down"], "only the moved line changes its route");
    assert.equal(moved.gutter, true, "a moved line runs in the gutter, outside every card and group box");
    assert.equal(moved.laneCount, 1);
    assert.equal(moved.third, false);
    assert.notEqual(c.stackPlan(m), moved, "the first plan is kept apart from the moved one");
    assert.deepEqual(m.nodes.map((n) => n.id), ["top", "a", "c", "b"], "the author's order is kept");
  });
  test("five overlapping end lines need a fifth lane: the plan says so", async () => {
    const c = await core();
    assert.equal(c.stackPlan(c.buildModel(DATA.fiveLanes)).third, true);
  });
});

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page, n = 6) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
const HOST = `
import gutter from "./test/fixtures/diagram-stack-gutter.json";
import layout from "./test/fixtures/diagram-layout.json";
const data = { ...gutter, nestedOneLine: layout.figures.nestedOneLine };
function Host() {
  return <div style={{ display: "grid", gap: 64 }}>{["nestedTrunk", "fiveLanes", "nestedOneLine"].map((key) => { const { type, ...props } = data[key]; return <B.ArchitectureDiagram key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
async function reactPage(theme) {
  const { page } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width: 390, height: 900 } });
  await page.addStyleTag({ content: `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box}` });
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
  return page;
}
async function skillPage(theme) {
  const body = `<title>Stack gutter</title><main style="padding:16px;display:grid;gap:64px">${KEYS.map((k) => `<figure class="diagram" id="fig-${k}"><script type="application/json" data-diagram>${JSON.stringify(DATA[k]).replace(/</g, "\\u003c")}</script></figure>`).join("")}</main>`;
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: theme });
  const page = await context.newPage();
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: compose(body).html }));
  await page.goto("https://basalt.test/");
  await page.evaluate(() => document.fonts.ready);
  await frames(page);
  return page;
}

for (const [name, open, P] of [["React", reactPage, "basalt-diagram"], ["the skill", skillPage, "diagram"]]) {
  describe(`${name} at 390`, () => {
    for (const theme of ["dark", "light"]) {
      test(`${theme}: the through-line is drawn in the gutter, and no line passes a card`, async () => {
        const page = await open(theme);
        const fig = await page.evaluate((P) => { const f = document.querySelector("#fig-nestedTrunk"); return { layout: f.dataset.layout, bare: f.hasAttribute("data-bare"), gutter: f.hasAttribute("data-gutter"), lines: f.querySelectorAll(`.${P}-edge`).length, order: [...f.querySelectorAll(`.${P}-node`)].map((e) => e.dataset.node) }; }, P);
        assert.equal(fig.layout, "stacked");
        assert.equal(fig.bare, false, "every line is drawn");
        assert.equal(fig.lines, 3);
        assert.equal(fig.gutter, true);
        assert.deepEqual(fig.order, ["top", "a", "c", "b"], "the cards keep the author's order");
        const got = await page.evaluate(`${inspectSource()}("${P}", "#fig-nestedTrunk")`);
        assert.deepEqual(got.problems.filter((p) => / passes through /.test(p)), [], "no line passes through a card");
        assert.deepEqual(got.problems, []);
        // The moved line runs past the end of every card and group box.
        const past = await page.evaluate((P) => {
          const f = document.querySelector("#fig-nestedTrunk");
          const line = [...f.querySelectorAll(`.${P}-edge`)].find((g) => g.dataset.from === "a" && g.dataset.to === "b");
          const box = line.getBoundingClientRect();
          const ends = [...f.querySelectorAll(`.${P}-node, .${P}-group`)].map((e) => e.getBoundingClientRect().right);
          return box.right - Math.max(...ends);
        }, P);
        assert.ok(past > 0, `the gutter lane is outside every card and group box (${past})`);
        // While lines are drawn the bare line is not shown and not read.
        assert.equal(await page.evaluate((P) => document.querySelector(`#fig-nestedTrunk .${P}-bare-note`).checkVisibility(), P), false);
        await page.context().close();
      });
      test(`${theme}: nestedOneLine (a linked focal card in a nested group) stacks with every line, no card on another and the linked card's words where every card's are`, async () => {
        const page = await open(theme);
        const fig = await page.evaluate((P) => {
          const f = document.querySelector("#fig-nestedOneLine");
          const svc = f.querySelector(`.${P}-node[data-node="svc"]`), alb = f.querySelector(`.${P}-node[data-node="alb"]`);
          const r = (e) => e.getBoundingClientRect();
          const start = (e) => r(e.querySelector(`.${P}-name`)).left - r(e).left;
          return { bare: f.hasAttribute("data-bare"), lines: f.querySelectorAll(`.${P}-edge`).length, gap: r(svc).top - r(alb).bottom, svcWords: start(svc), albWords: start(alb), order: [...f.querySelectorAll(`.${P}-node`)].map((e) => e.dataset.node).join(" ") };
        }, P);
        assert.ok(fig.gap > 0, `the linked card is below the card above it (${fig.gap})`);
        assert.ok(Math.abs(fig.svcWords - fig.albWords) < 0.5, "the linked card's words start where the card above's do");
        assert.equal(fig.bare, false, "every line is drawn");
        assert.equal(fig.lines, DATA.nestedOneLine.edges.length);
        assert.equal(fig.order, DATA.nestedOneLine.nodes.map((n) => n.id).join(" "), "the cards keep the author's order");
        const got = await page.evaluate(`${inspectSource()}("${P}", "#fig-nestedOneLine")`);
        assert.deepEqual(got.problems, []);
        await page.context().close();
      });
      test(`${theme}: a stack that needs a fifth lane is bare, and its one line is where the key sits, in the reading order`, async () => {
        const page = await open(theme);
        const { BARE_NOTE } = await core();
        const got = await page.evaluate((P) => {
          const f = document.querySelector("#fig-fiveLanes");
          const note = f.querySelector(`.${P}-bare-note`);
          const cs = getComputedStyle(note);
          const all = [...f.querySelectorAll("*")];
          return {
            bare: f.hasAttribute("data-bare"), lines: f.querySelectorAll(`.${P}-edge`).length, shown: note.checkVisibility(), text: note.textContent,
            inKey: note.parentElement.classList.contains(`${P}-key`) && note.parentElement.firstElementChild === note,
            afterDrawing: all.indexOf(note) > all.indexOf(f.querySelector(`.${P}-drawing`)), beforeList: all.indexOf(note) < all.indexOf(f.querySelector(`.${P}-list`)),
            listOpen: !f.querySelector(`.${P}-list`).hidden, size: cs.fontSize, ink: cs.color,
            secondary: (() => { const p = document.createElement("span"); p.style.color = "var(--basalt-text-secondary)"; f.append(p); const c = getComputedStyle(p).color; p.remove(); return c; })(),
            xs: (() => { const p = document.createElement("span"); p.style.fontSize = "var(--basalt-text-xs-size)"; f.append(p); const c = getComputedStyle(p).fontSize; p.remove(); return c; })(),
            notes: f.querySelectorAll(`.${P}-bare-note`).length,
          };
        }, P);
        assert.equal(got.bare, true);
        assert.equal(got.lines, 0);
        assert.equal(got.shown, true);
        assert.equal(got.text, BARE_NOTE, "the words come from the one constant");
        assert.equal(got.inKey, true, "first in the key, where the key sits");
        assert.equal(got.notes, 1, "one line, nowhere else");
        assert.ok(got.afterDrawing && got.beforeList, "read after the drawing and before the list");
        assert.equal(got.listOpen, true);
        assert.equal(got.ink, got.secondary);
        assert.equal(got.size, got.xs);
        await page.context().close();
      });
    }
  });
}
