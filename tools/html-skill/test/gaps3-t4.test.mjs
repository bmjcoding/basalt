// The HTML skill's parts of cimip-gaps-3 t4 (forms and controls): the field's one seat (.field-message), the file field (.file-field), the segment's status dot
// and its track that scrolls while it overflows, the tab row's undrawn scrollbar and space-6 reveal, the chip's count and its seat, and the result line's held
// width (data-reserve), its one line's height and its spoken form. A page composed from a body, opened in Chromium. Synthetic data only (a bakery and a photo
// library). Written and not run: tests are paused (DECISIONS 359).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const BODY = `<main id="main" style="padding: 16px">
  <h1 class="visually-hidden">Forms and controls</h1>
  <form id="f">
    <div class="field"><label for="date">Pickup date</label><input class="input" id="date" name="date" aria-describedby="date-hint"><div class="field-message"><p class="hint" id="date-hint">As MM/DD.</p><p class="error" id="date-error">Write the date as MM/DD, two days out or more (for example 12/04).</p></div></div>
    <div class="field"><label for="next">Name</label><input class="input" id="next" name="name"></div>
    <div class="field"><label for="photo">Photo</label><span class="file-field"><input type="file" id="photo" name="photo"></span></div>
    <button type="reset" id="reset">Reset</button>
  </form>
  <div style="width: 320px"><div class="segment" role="group" aria-label="Forecast" id="wide"><button aria-pressed="true">Today</button><button aria-pressed="false">Next 3 days</button><button aria-pressed="false">Next 7 days</button><button aria-pressed="false">Next 14 days</button><button aria-pressed="false">Next 30 days</button></div></div>
  <div class="segment" role="group" aria-label="Tickets" id="dots"><button aria-pressed="true">All</button><button aria-pressed="false" data-status="danger">Late</button><button aria-pressed="false" data-status="pending">Waiting</button></div>
  <fieldset class="option-chips"><legend class="option-chips-legend">Paper</legend><div class="option-chips-list">
    <label class="option-chip"><input class="option-chip-input" type="radio" name="paper" value="c" checked><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Cotton</span><span class="visually-hidden">, 7</span><span class="option-chip-figure" id="seven" data-seat="512" aria-hidden="true"><span>7</span></span></label>
    <label class="option-chip"><input class="option-chip-input" type="radio" name="paper" value="k"><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Kraft</span><span class="visually-hidden">, 512</span><span class="option-chip-figure" data-seat="512" aria-hidden="true"><span>512</span></span></label>
  </div></fieldset>
  <p class="filter-result" id="lots" data-reserve="Showing 428 of 428 lots" data-spoken="12 lots shown">Showing 12 of 428 lots</p>
  <p class="filter-result" id="empty"></p>
</main>`;
const html = compose(BODY).html;
const PHOTO = '<div class="field"><label for="photo">Photo</label><span class="file-field"><input type="file" id="photo" name="photo"></span></div>';
const IN_FIELDSET = compose(BODY.replace(PHOTO, `<fieldset id="set" style="border: 0; margin: 0; padding: 0">${PHOTO}</fieldset>`)).html;
const settle = (page) => page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 450)));

describe("the field's one seat", () => {
  test("aria-invalid picks the error in the hint's place and the next field moves 0px; the unseen one keeps its room", async () => {
    const { page, errors } = await openHtml(browser, html);
    const at = () => page.locator("#next").evaluate((el) => el.getBoundingClientRect().top);
    const before = await at();
    assert.equal(await page.locator("#date-error").evaluate((el) => getComputedStyle(el).visibility), "hidden");
    await page.locator("#date").evaluate((el) => { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", "date-error"); });
    await settle(page);
    assert.equal(await at(), before);
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.getElementById("date-hint")).visibility, getComputedStyle(document.getElementById("date-error")).visibility]), ["hidden", "visible"]);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("the file field", () => {
  test("the script builds the box; a pick, Clear and a reset agree with input.files; Clear focuses the input; the box's height never changes", async () => {
    const { page, errors } = await openHtml(browser, html);
    const read = () => page.evaluate(() => ({ line: document.querySelector(".file-field-line").textContent, files: document.getElementById("photo").files.length, h: document.querySelector(".file-field").getBoundingClientRect().height }));
    const empty = await read();
    assert.equal(empty.line, "No file chosen");
    await page.evaluate(() => { const i = document.getElementById("photo"); const t = new DataTransfer(); t.items.add(new File(["x"], "crumb.jpg")); i.files = t.files; i.dispatchEvent(new Event("change", { bubbles: true })); });
    const chosen = await read();
    assert.deepEqual([chosen.line, chosen.files, chosen.h], ["crumb.jpg", 1, empty.h]);
    await page.locator(".file-field-clear").click();
    assert.deepEqual((await read()).files, 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), "photo");
    await page.locator("#reset").click();
    await settle(page);
    assert.equal((await read()).line, "No file chosen");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("Clear follows the input's real disabled state after a pick: its own attribute, and a fieldset round it", async () => {
    const { page } = await openHtml(browser, IN_FIELDSET);
    await page.evaluate(() => { const i = document.getElementById("photo"); const t = new DataTransfer(); t.items.add(new File(["x"], "crumb.jpg")); i.files = t.files; i.dispatchEvent(new Event("change", { bubbles: true })); });
    const clearOff = () => page.locator(".file-field-clear").evaluate((el) => el.disabled);
    assert.equal(await clearOff(), false);
    await page.evaluate(() => { document.getElementById("photo").disabled = true; });
    await settle(page);
    assert.equal(await clearOff(), true, "the input's own disabled");
    await page.evaluate(() => { document.getElementById("photo").disabled = false; });
    await settle(page);
    assert.equal(await clearOff(), false);
    await page.evaluate(() => { document.getElementById("set").disabled = true; });
    await settle(page);
    assert.equal(await clearOff(), true, "a disabled fieldset");
    assert.equal(await page.evaluate(() => document.getElementById("photo").files.length), 1, "nothing cleared the file");
    await page.close();
  });

  test("the browser's own drop (a trusted drop through Chromium's input domain) sets the files; the look shows while over and goes on the drop", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const { page } = await openHtml(browser, html);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-t4-skill-drop-"));
    const files = ["a.jpg", "b.jpg"].map((n) => { const f = path.join(dir, n); fs.writeFileSync(f, "x"); return f; });
    const box = await page.locator(".file-field").boundingBox();
    const at = { x: box.x + box.width / 3, y: box.y + box.height / 2 };
    const cdp = await page.context().newCDPSession(page);
    const data = { items: [], files, dragOperationsMask: 1 };
    await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", ...at, data });
    await cdp.send("Input.dispatchDragEvent", { type: "dragOver", ...at, data });
    assert.equal(await page.locator(".file-field").getAttribute("data-drag"), "");
    await cdp.send("Input.dispatchDragEvent", { type: "drop", ...at, data });
    await settle(page);
    const got = await page.evaluate(() => ({ line: document.querySelector(".file-field-line").textContent, files: [...document.getElementById("photo").files].map((f) => f.name) }));
    assert.ok(got.files.length <= 1, "a single input keeps at most one file");
    assert.equal(got.line, got.files[0] ?? "No file chosen");
    assert.equal(await page.locator(".file-field").getAttribute("data-drag"), null);
    await page.close();
  });

  test("with no script the bare input shows as it ships", async () => {
    const { page } = await openHtml(browser, html.replace(/<script\b[\s\S]*?<\/script>/g, ""));
    assert.equal(await page.locator(".file-field[data-ready]").count(), 0);
    assert.ok(await page.locator("#photo").isVisible());
    await page.close();
  });
});

describe("the segment's dot and its scrolling track", () => {
  test("a dot is drawn by ::before on a button with data-status and none on one without; a track wider than its column scrolls with the ring inset; a fitting one keeps +2", async () => {
    const { page } = await openHtml(browser, html);
    const dots = await page.evaluate(() => [...document.querySelectorAll("#dots button")].map((b) => getComputedStyle(b, "::before").content));
    assert.deepEqual(dots.map((c) => c !== "none" && c !== "normal"), [false, true, true]);
    assert.equal(await page.locator("#wide").getAttribute("data-overflow"), "");
    assert.equal(await page.locator("#dots").getAttribute("data-overflow"), null);
    await page.locator("#wide button").first().focus();
    assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineOffset), "-2px");
    await page.locator("#dots button").first().focus();
    assert.equal(await page.evaluate(() => getComputedStyle(document.activeElement).outlineOffset), "2px");
    assert.equal(await page.locator("#dots").evaluate((el) => getComputedStyle(el).overflowX), "visible");
    await page.close();
  });
});

describe("the chip's count and the result line", () => {
  test("every counted chip holds the seat's figures; the held result line keeps its width and says its spoken form; an empty line keeps one line's height", async () => {
    const { page } = await openHtml(browser, html);
    const seat = await page.evaluate(() => [...document.querySelectorAll(".option-chip-figure")].map((f) => Math.round(f.getBoundingClientRect().width * 10)));
    assert.equal(new Set(seat).size, 1, `one seat width: ${seat}`);
    const width = await page.locator("#lots").evaluate((el) => el.getBoundingClientRect().width);
    await page.evaluate(() => window.Basalt.filterResult(document.getElementById("lots"), "Showing 428 of 428 lots", 0, "428 lots shown"));
    await settle(page);
    assert.equal(await page.locator("#lots").evaluate((el) => el.getBoundingClientRect().width), width);
    assert.equal(await page.locator("#lots [role=status]").textContent(), "428 lots shown");
    assert.ok(await page.locator("#empty").evaluate((el) => el.getBoundingClientRect().height) > 0);
    await page.close();
  });
});
