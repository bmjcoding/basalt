// The peek module (cimip-gaps-3 T3, item 3, and its fix pass 1): cut text read whole on the plate, the plate mounted in the top-layer surface its text sits in (a
// modal <dialog>, where a plate on the body would be under the dialog and inert), and a still table's cell that starts to wrap leaving its cut state. Written
// while tests are paused (DECISIONS 359): not run yet.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const LONG = "The quarterly results for every region, with the returns and the refunds that came after the books had closed, read whole here.";

describe("peek: the plate's surface", () => {
  for (const scheme of ["light", "dark"]) {
    test(`a cut text in a modal dialog opens its plate inside the dialog, above it and not inert (${scheme})`, async () => {
      const html = compose(`<button class="btn" id="open" data-dialog-open="#d">Open</button>
<dialog class="panel float modal dialog" id="d" aria-labelledby="dt"><h2 id="dt">Recipe</h2><div style="width: 240px"><p id="cut" data-lines="1">${LONG}</p></div><button class="btn" data-dialog-close>Close</button></dialog>`, { fonts: false }).html;
      const { page, context, errors } = await openHtml(browser, html, { scheme });
      await page.locator("#open").click();
      await page.waitForTimeout(300);
      assert.equal(await page.locator("#cut").getAttribute("tabindex"), "0", "the cut text is a stop");
      await page.locator("#cut").focus();
      await page.waitForTimeout(100);
      const plate = page.locator(".cell-peek[data-open]");
      assert.equal(await plate.count(), 1, "keyboard focus opens it");
      assert.equal(await plate.evaluate((el) => el.closest("dialog")?.id), "d", "the plate is in the dialog");
      assert.equal(await plate.evaluate((el) => el.closest("[inert]") === null && !el.inert), true, "not inert");
      const box = await plate.boundingBox();
      assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.classList.contains("cell-peek"), [box.x + box.width / 2, box.y + box.height / 2]), true, "the plate is the topmost thing at its centre");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog#d").evaluate((el) => el.open), true, "Esc closes the plate, not the dialog");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

describe("still-table: a cell that starts to wrap", () => {
  test("a cut cell that gains data-wrap loses data-cut and tabindex, and a cell that loses it is measured again", async () => {
    const html = compose(`<div class="panel table-wrap" role="region" aria-label="Rules" tabindex="0"><table data-fixed style="min-width: 480px">
<colgroup><col style="width: 120px"><col></colgroup>
<thead><tr><th>Rule</th><th>What it does</th></tr></thead>
<tbody><tr><th scope="row">Gift wrap</th><td id="c">${LONG}</td></tr></tbody></table></div>`, { fonts: false }).html;
    const { page, context, errors } = await openHtml(browser, html, { width: 600 });
    await page.waitForTimeout(200);
    const cell = page.locator("#c");
    assert.deepEqual(await cell.evaluate((el) => [el.hasAttribute("data-cut"), el.getAttribute("tabindex")]), [true, "0"], "cut at first");
    await cell.evaluate((el) => el.setAttribute("data-wrap", ""));
    await page.waitForTimeout(100);
    assert.deepEqual(await cell.evaluate((el) => [el.hasAttribute("data-cut"), el.getAttribute("tabindex")]), [false, null], "wrapping, it is no stop");
    await cell.evaluate((el) => el.removeAttribute("data-wrap"));
    await page.waitForTimeout(100);
    assert.deepEqual(await cell.evaluate((el) => [el.hasAttribute("data-cut"), el.getAttribute("tabindex")]), [true, "0"], "cut again once it stops wrapping");
    assert.deepEqual(errors, []);
    await context.close();
  });
});
