// The HTML skill's lists-modals changes (DECISIONS 222 and 230): the numeric select, the toolbar filter trigger that holds its widest value, and the form dialog as a module of its
// own (`dialog-form`, `data-form`). A page composed from a body, opened in Chromium. The held top's re-measure and the scrim rule are React's alone. Fixtures load no web font, so
// every margin here is wider than a fallback font's width. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const BODY = `<main id="main" style="padding: 16px">
  <h1 class="visually-hidden">Lists</h1>
  <div class="filter" id="sev" data-toolbar data-label="Severity"><label><input type="checkbox" value="SEV1"> SEV1</label><label><input type="checkbox" value="SEV2"> SEV2</label><label><input type="checkbox" value="SEV3"> SEV3</label><label><input type="checkbox" value="SEV4"> SEV4</label></div>
  <div class="filter" id="status" data-toolbar data-label="Status"><label><input type="checkbox" value="Investigating"> Investigating</label><label><input type="checkbox" value="Identified"> Identified</label><label><input type="checkbox" value="Mitigating"> Mitigating</label><label><input type="checkbox" value="Monitoring"> Monitoring</label><label><input type="checkbox" value="Resolved"> Resolved</label></div>
  <span class="select" id="size-wrap"><select class="input" id="size" data-numeric aria-label="Incidents per page"><option>10</option><option selected>25</option><option>50</option><option>100</option></select></span>
  <button class="btn" id="opener" data-dialog-open="#d">Declare incident</button>
  <dialog class="panel float modal dialog" data-form id="d">
    <header class="sheet-head"><div class="sheet-head-text"><h2 class="dialog-title" tabindex="-1">Declare an incident</h2></div><button class="btn sheet-close" data-variant="ghost" data-icon-only data-edge="end" data-dialog-close aria-label="Close"><span data-glyph="close"></span></button></header>
    <div class="sheet-body"><p class="dialog-description">Say what is happening.</p><div class="field"><label for="what">What is happening</label><input class="input" id="what"></div><div id="grow" hidden style="height: 40px">An error</div><div id="fill" style="height: 100px"></div></div>
    <footer class="sheet-foot"><div class="dialog-actions"><button class="btn" id="cancel" data-dialog-close>Cancel</button><button class="btn" data-variant="primary" id="go">Declare</button></div></footer>
  </dialog>
</main>`;
const html = compose(BODY).html;
const settle = (page) => page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 450)));

describe("the numeric select and the toolbar filter trigger hold their width", () => {
  test("the page size is as wide as its widest option, under 160, whichever is chosen", async () => {
    const { page, context, errors } = await openHtml(browser, html);
    const widths = new Set();
    for (const v of ["10", "100", "50", "25"]) {
      await page.selectOption("#size", v);
      widths.add(await page.locator("#size").evaluate((el) => Math.round(el.getBoundingClientRect().width * 10)));
    }
    assert.equal(widths.size, 1, `one width: ${[...widths]}`);
    assert.ok([...widths][0] / 10 < 160);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("a toolbar trigger holds its widest value: choosing values moves nothing after it", async () => {
    const { page, context } = await openHtml(browser, html);
    const trigger = page.locator("#status .filter-trigger");
    const before = await trigger.evaluate((el) => el.getBoundingClientRect().width);
    const sev = await page.locator("#sev .filter-trigger").evaluate((el) => el.getBoundingClientRect().left);
    await trigger.click();
    for (const v of ["Investigating", "Identified", "Mitigating", "Monitoring", "Resolved"]) {
      await page.locator(`#status input[value="${v}"]`).evaluate((el) => el.click());
      // Within a hundredth of a pixel: the fallback font's digits are not all one width ("+2" against the reserved "+4").
      assert.ok(Math.abs((await trigger.evaluate((el) => el.getBoundingClientRect().width)) - before) < 0.5, `after ${v}`);
    }
    assert.equal(await page.locator("#sev .filter-trigger").evaluate((el) => el.getBoundingClientRect().left), sev);
    assert.equal(await page.locator("#status .filter-trigger-sizer").first().getAttribute("aria-hidden"), "true");
    await context.close();
  });
});

describe("the form dialog (dialog-form)", () => {
  test("it is a module of its own: pulled in by data-form, and a plain dialog does not carry it", () => {
    assert.ok(compose(BODY).modules.includes("dialog-form"));
    assert.equal(compose('<dialog class="panel float modal dialog" id="x"><h2 class="dialog-title">T</h2></dialog><button class="btn" data-dialog-open="#x">Open</button>').modules.includes("dialog-form"), false);
  });

  test("from 720: 480 wide, centred, level 1 with the rim, radius 12; the head and foot held while the body scrolls; at most the window less 16px", async () => {
    const { page, context } = await openHtml(browser, html, { width: 1440 });
    await page.setViewportSize({ width: 1440, height: 560 });
    await page.evaluate(() => { document.getElementById("fill").style.height = "600px"; });
    await page.click("#opener");
    await settle(page);
    const r = await page.locator("#d").evaluate((el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return { w: b.width, cx: b.x + b.width / 2, y: b.y, bottom: b.bottom, radius: s.borderTopLeftRadius, shadow: s.boxShadow, pad: s.paddingTop }; });
    assert.equal(r.w, 480);
    assert.ok(Math.abs(r.cx - 720) < 1);
    assert.ok(r.y >= 15.9 && r.bottom <= 560 - 15.9, `${r.y} ${r.bottom}`);
    assert.deepEqual([r.radius, r.pad], ["12px", "0px"]);
    assert.notEqual(r.shadow, "none");
    const head = await page.locator("#d .sheet-head").boundingBox();
    const foot = await page.locator("#d .sheet-foot").boundingBox();
    await page.locator("#d .sheet-body").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.deepEqual(await page.locator("#d .sheet-head").boundingBox(), head);
    assert.deepEqual(await page.locator("#d .sheet-foot").boundingBox(), foot);
    await context.close();
  });

  test("its top is held where it opened: what grows inside grows downward", async () => {
    const { page, context } = await openHtml(browser, html, { width: 1440 });
    await page.click("#opener");
    await settle(page);
    assert.equal(await page.locator("#d").getAttribute("data-held"), "");
    const before = await page.locator("#d").boundingBox();
    await page.evaluate(() => { document.getElementById("grow").hidden = false; });
    const after = await page.locator("#d").boundingBox();
    assert.ok(after.height > before.height + 10);
    assert.equal(after.y, before.y, "the top did not move");
    await context.close();
  });

  test("first focus goes to the first field for a key or a mouse, and to the title for a touch (no ring)", async () => {
    const mouse = await openHtml(browser, html, { width: 1440 });
    await mouse.page.click("#opener");
    await settle(mouse.page);
    assert.equal(await mouse.page.evaluate(() => document.activeElement.id), "what");
    await mouse.context.close();
    const touch = await openHtml(browser, html, { width: 390, touch: true });
    await touch.page.tap("#opener");
    await settle(touch.page);
    assert.equal(await touch.page.evaluate(() => document.activeElement.className), "dialog-title");
    assert.equal(await touch.page.locator(".dialog-title").evaluate((el) => getComputedStyle(el).outlineStyle), "none");
    // Enter on the opener in touch emulation is a key press: the first field.
    await touch.page.keyboard.press("Escape");
    await touch.page.locator("#opener").focus();
    await touch.page.keyboard.press("Enter");
    await settle(touch.page);
    assert.equal(await touch.page.evaluate(() => document.activeElement.id), "what");
    await touch.context.close();
  });

  test("under 720 it is a full-screen modal: square, no rim or shadow, the foot's two actions equal 44px buttons", async () => {
    const { page, context } = await openHtml(browser, html, { width: 390, touch: true });
    await page.tap("#opener");
    await settle(page);
    const r = await page.locator("#d").evaluate((el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return { box: [b.x, b.y, b.width, b.height], radius: s.borderTopLeftRadius, shadow: s.boxShadow, border: s.borderTopWidth }; });
    assert.deepEqual(r.box, [0, 0, 390, 844]);
    assert.deepEqual([r.radius, r.shadow, r.border], ["0px", "none", "0px"]);
    const [a, b] = await Promise.all(["#cancel", "#go"].map((s) => page.locator(s).boundingBox()));
    assert.ok(a.height >= 43.9 && Math.abs(a.width - b.width) < 1 && a.x < b.x);
    await context.close();
  });

  for (const scheme of ["dark", "light"]) {
    test(`axe finds no violation in the open form, in ${scheme}`, async () => {
      const { page, context } = await openHtml(browser, html, { scheme });
      await page.click("#opener");
      await settle(page);
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => (await globalThis.axe.run({ rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false } } })).violations.map((v) => v.id));
      assert.deepEqual(violations, []);
      await context.close();
    });
  }
});
