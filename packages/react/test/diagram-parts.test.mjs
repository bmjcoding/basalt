// Nested groups, link cards and two-line labels (DECISIONS 306, 1.3 and 1.4; part of section 8's list for diagram-parts.test.mjs), on the extended CIMIP
// architecture (test/fixtures/cimip-diagrams-b.json). In Chromium against the built package, both themes. End lanes and marks on steps are not built yet.
// The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

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
