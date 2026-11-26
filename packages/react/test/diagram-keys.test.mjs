// The spatial arrow keys (DECISIONS 306, 1.5; section 8's list for diagram-keys.test.mjs): drawn, the arrows go to the nearest card in that direction by
// the cards' columns and rows; stacked, and where some card could not be reached, they keep the author's order. In Chromium against the built package.
// The table is the decision's proof (proof/spatial-cells.json, copied to test/fixtures). The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const TABLE = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-spatial-cells.json"), "utf8"));
const NAMES = { architecture: "architecture", flowchart: "flowchart", dataFlow: "data flow", sequence: "sequence", schema: "schema" };
const P = "basalt-diagram";
const KEY = { right: "ArrowRight", left: "ArrowLeft", down: "ArrowDown", up: "ArrowUp" };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/cimip-diagrams.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() {
  const [list, setList] = React.useState(() => Object.entries(data).map(([key, d]) => { const { type, ...props } = d; return { key, type, props }; }));
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, type, props }) => { const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function keysPage({ theme = "dark", width = 1440, dir } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1000 } });
  if (dir) await page.evaluate((dir) => { document.documentElement.dir = dir; }, dir);
  await page.addStyleTag({ content: "body{margin:0;padding:16px} #root{max-width:1104px;margin:0 auto}" });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 4);
  return { page, errors };
}
/** Focuses a card by script (as the keyboard would reach it), presses a key, and names the card focused after it. */
async function press(page, key, id, k) {
  await page.locator(`#fig-${key} .${P}-node[data-node="${id}"]`).focus();
  await page.keyboard.press(k);
  return page.evaluate(() => document.activeElement?.getAttribute("data-node") ?? null);
}

describe("drawn: the four-direction table", () => {
  for (const theme of ["dark", "light"]) for (const dir of ["ltr", "rtl"]) {
    test(`${theme}, ${dir}: each CIMIP figure's arrows equal the proof's table${dir === "rtl" ? ", left and right mirrored" : ""}`, async () => {
      const { page, errors } = await keysPage({ theme, dir });
      for (const [key, name] of Object.entries(NAMES)) {
        assert.equal(await page.locator(`#fig-${key}`).getAttribute("data-layout"), "drawn", key);
        const table = TABLE[name].table;
        for (const [id, ways] of Object.entries(table)) for (const [way, want] of Object.entries(ways)) {
          const k = dir === "rtl" && (way === "left" || way === "right") ? KEY[way === "left" ? "right" : "left"] : KEY[way];
          assert.equal(await press(page, key, id, k), want ?? id, `${key}: ${way} from ${id}`);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
  test("every card is reached from every card in the five figures; a figure built to strand a card keeps the author's order and warns", async () => {
    for (const name of Object.values(NAMES)) assert.equal(TABLE[name].everyCardFromEveryCard, true);
    const { page } = await keysPage();
    const warnings = [];
    page.on("console", (m) => { if (m.type() === "warning") warnings.push(m.text()); });
    // Five cards in an X: the middle one is reached from no corner by the rule (each corner's nearest card along an arrow is another corner), so the figure keeps
    // the author's order (Neon's B12: the earlier fixture stranded nothing, and the test accepted either answer).
    const X = [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]];
    const spec = { title: "Stranded", summary: "A card no arrow reaches.", nodes: X.map(([col, row], k) => ({ id: `n${k}`, name: `N${k}`, col, row })), edges: [] };
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const m = core.buildModel({ type: "architecture", ...spec });
    assert.equal(core.spatialTable(m), null, "the X strands a card");
    assert.ok(m.warnings.some((w) => /cannot be reached from another by the arrow keys/.test(w)), "and a development build says so");
    await page.evaluate((spec) => window.__set([{ key: "strand", type: "architecture", props: spec }]), spec);
    await frames(page, 4);
    assert.equal(await page.locator("#fig-strand").getAttribute("data-layout"), "drawn");
    // n0 is at column 1, row 1: spatially → would go to n3 (column 3, row 1); in the author's order it goes to n1.
    assert.equal(await press(page, "strand", "n0", "ArrowRight"), "n1");
    assert.equal(await press(page, "strand", "n1", "ArrowRight"), "n2");
    await page.close();
  });
});

describe("stacked and the hint", () => {
  test("stacked, the arrows are the author's order; the hint shows four arrows where the drawn figure has rows and columns, two otherwise", async () => {
    const { page } = await keysPage({ width: 600 });
    assert.equal(await page.locator("#fig-architecture").getAttribute("data-layout"), "stacked");
    const ids = DATA.architecture.nodes.map((n) => n.id);
    assert.equal(await press(page, "architecture", ids[0], "ArrowRight"), ids[1]);
    assert.equal(await press(page, "architecture", ids[1], "ArrowUp"), ids[0]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await frames(page, 4);
    const arrows = (key) => page.locator(`#fig-${key} .${P}-hint > span:first-child kbd`).evaluateAll((ks) => ks.map((k) => k.textContent).filter((t) => /^[←↑↓→]$/.test(t)));
    assert.deepEqual(await arrows("architecture"), ["←", "↑", "↓", "→"]);
    assert.deepEqual(await arrows("sequence"), ["←", "→"]);
    // The keys sentence describes the entry card, the one holding the tab stop (cimip-gaps-3, G17). The arrows above moved the stop, which leaves it off
    // the card they reach until focus leaves the figure: Tab out of the cards, and Shift+Tab back to the stop, first.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await frames(page, 2);
    assert.equal(await page.evaluate((P) => document.activeElement?.matches(`#fig-architecture .${P}-node[tabindex="0"]`), P), true, "back on the stop");
    const keys = await page.locator(`#fig-architecture .${P}-node[tabindex="0"]`).getAttribute("aria-describedby");
    assert.ok(keys, "the entry card is described again");
    assert.match(await page.locator(`[id="${keys}"]`).textContent(), /the nearest part in that direction/);
    await page.close();
  });
});

// The trace on touch (1.5; Neon's B12 of the code review, still missing at the re-check): a tap on the ground, a scroll, a linked card, the foot, a
// touchscreen laptop's first tap, and the stacked schema and sequence. Written while browser tests are paused (DECISIONS 330): not run in the round that
// wrote it.
const BX = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
async function touchPage({ width = 1440, mobile = true, items } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme: "dark", standards: true, viewport: { width, height: 1000 }, hasTouch: true, isMobile: mobile });
  await page.addStyleTag({ content: "body{margin:0;padding:16px} #root{max-width:1104px;margin:0 auto}" });
  await page.evaluate(() => document.fonts.ready);
  if (items) await page.evaluate((items) => window.__set(items), items);
  await frames(page, 6);
  return { page, errors };
}
const lit = (page, key) => page.locator(`#fig-${key} .${P}-edge[data-lit]`).count();
const clearState = (page, key) => page.locator(`#fig-${key} .${P}-clear`).evaluateAll((b) => b.map((x) => x.getAttribute("aria-disabled")));

describe("the trace on touch", () => {
  test("a tap on the ground clears a trace; with none up it changes nothing", async () => {
    const { page, errors } = await touchPage();
    const ground = async () => { const box = await page.locator(`#fig-architecture .${P}-drawing`).boundingBox(); await page.touchscreen.tap(box.x + 4, box.y + box.height - 4); await page.waitForTimeout(150); };
    await ground();
    assert.equal(await lit(page, "architecture"), 0);
    assert.deepEqual(await clearState(page, "architecture"), ["true"], "Clear highlight stays disabled");
    await page.tap(`#fig-architecture .${P}-node[data-node="svc"]`);
    await page.waitForTimeout(150);
    assert.ok((await lit(page, "architecture")) > 0, "the card is traced");
    await ground();
    assert.equal(await lit(page, "architecture"), 0, "the ground clears it");
    assert.deepEqual(await clearState(page, "architecture"), ["true"]);
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("a scroll that starts on a card traces nothing", async () => {
    const { page } = await touchPage({ width: 390 });
    const card = await page.locator(`#fig-flowchart .${P}-node`).first().boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const at = (dy) => [{ x: card.x + card.width / 2, y: card.y + card.height / 2 + dy, id: 1 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(0) });
    for (let k = 1; k <= 10; k++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(-12 * k) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(200);
    for (const key of Object.keys(NAMES)) assert.equal(await lit(page, key), 0, `${key}: no trace`);
    await page.close();
  });

  test("a linked card follows its link and is never traced", async () => {
    const { page } = await touchPage({ items: [{ key: "arch", type: "architecture", props: (({ type, ...p }) => p)(BX.architecture) }, { key: "sequence", type: "sequence", props: (({ type, ...p }) => p)(BX.sequence) }] });
    await page.tap(`#fig-arch a.${P}-node[data-node="svc"]`);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => location.hash), "#fig-sequence", "the link is followed");
    assert.equal(await lit(page, "arch"), 0, "and nothing is traced");
    assert.deepEqual(await clearState(page, "arch"), ["true"]);
    await page.close();
  });

  test("the foot does not move when Clear highlight is enabled, and Clear highlight is last in it", async () => {
    const { page } = await touchPage();
    const foot = () => page.locator(`#fig-architecture .${P}-foot > *`).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [e.className, Math.round(r.left * 2) / 2, Math.round(r.top * 2) / 2, Math.round(r.width * 2) / 2, Math.round(r.height * 2) / 2]; }));
    const before = await foot();
    assert.match(before.at(-1)[0], /-clear\b/, "last in the foot");
    await page.tap(`#fig-architecture .${P}-node[data-node="svc"]`);
    await page.waitForTimeout(200);
    assert.deepEqual(await clearState(page, "architecture"), [null]);
    assert.deepEqual(await foot(), before, "every control in its place and size");
    await page.close();
  });

  test("a touchscreen laptop: the first tap traces and mounts Clear highlight, last in the foot, after an animated figure's controls", async () => {
    const motion = { key: "flow", type: "data-flow", props: { ...(({ type, ...p }) => p)(BX.dataFlow), motion: "animated" } };
    const { page } = await touchPage({ mobile: false, items: [motion] });
    const onTouch = await page.evaluate(() => matchMedia("(hover: none), (pointer: coarse)").matches);
    // A laptop's media says hover and a fine pointer: no Clear highlight until a finger is used. (Where the emulated media says touch, it is there from the start.)
    if (!onTouch) assert.equal(await page.locator(`#fig-flow .${P}-clear`).count(), 0, "not mounted before a tap");
    const card = page.locator(`#fig-flow .${P}-node:not([href])`).first();
    await card.tap();
    await page.waitForTimeout(200);
    assert.ok((await lit(page, "flow")) > 0, "the first tap traces");
    const order = await page.locator(`#fig-flow .${P}-foot > *`).evaluateAll((els) => els.map((e) => e.className));
    assert.match(order.at(-1), /-clear\b/, `last in the foot ${JSON.stringify(order)}`);
    await page.close();
  });

  test("a text sequence, as art at 1440 and as the transcript at 390, has no Clear highlight: a tap traces nothing in it", async () => {
    for (const width of [1440, 390]) {
      const { page } = await touchPage({ width, items: [{ key: "text", type: "sequence", props: (({ type, ...p }) => p)(BX.textSequence) }] });
      await page.waitForSelector(`#fig-text .${P}-text .${P}-text-ink`);
      await page.locator(`#fig-text .${P}-text`).tap();
      await page.waitForTimeout(200);
      assert.equal(await page.locator(`#fig-text .${P}-clear`).count(), 0, `${width}: no Clear highlight`);
      await page.close();
    }
  });

  test("at 390 the stacked schema and sequence, which draw no lines, show no tap hint and no Clear highlight", async () => {
    const { page } = await touchPage({ width: 390 });
    for (const key of ["schema", "sequence"]) {
      assert.equal(await page.locator(`#fig-${key}`).getAttribute("data-layout"), "stacked", key);
      assert.equal(await page.locator(`#fig-${key} .${P}-clear`).count(), 0, `${key}: no Clear highlight`);
      assert.equal(await page.locator(`#fig-${key} .${P}-hint`).evaluateAll((els) => els.filter((e) => e.checkVisibility() && e.textContent.trim()).length), 0, `${key}: no hint`);
    }
    await page.close();
  });
});
