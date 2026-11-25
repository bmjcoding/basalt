// The skill's share of the foot decision (diagrams-cimip, 1.7, 2.2, 3.1, 3.2): the viewer's end group wraps and a wrapped group starts on the start edge,
// "Download SVG" with the list open writes the same drawing, and the foot does not print. A figure with "export": true, composed. Written while tests are
// paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const P = "diagram";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (spec) => compose(`<title>Diagram foot</title><main style="max-width:1104px;margin:0 auto;padding:16px"><figure class="diagram" id="fig-a"><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure></main>`).html;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function openViewer(page, { tap = false } = {}) {
  const button = page.locator(`#fig-a .${P}-expand`);
  await button.scrollIntoViewIfNeeded();
  if (tap) await button.tap(); else await button.click();
  await page.waitForSelector(`dialog.${P}-viewer[open] figure.${P}[data-layout]`);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await frames(page, 3);
}

describe("the viewer's end group (3.1)", () => {
  for (const width of [390, 360]) for (const dir of ["ltr", "rtl"]) {
    test(`"export": true at ${width} on touch, ${dir}: View as list and the two downloads stay inside the dialog, and a wrapped group starts on the start edge`, async () => {
      const { page, context } = await openHtml(browser, html({ ...DATA.architecture, export: true }), { scheme: "dark", width, touch: true });
      if (dir === "rtl") await page.evaluate(() => { document.documentElement.dir = "rtl"; });
      await frames(page, 3);
      await openViewer(page, { tap: true });
      const got = await page.evaluate((P) => {
        const d = document.querySelector(`dialog.${P}-viewer`);
        const box = (el) => el.getBoundingClientRect();
        const row = box(d.querySelector(`.${P}-viewer-row`)), zoom = box(d.querySelector(`.${P}-zoom`));
        const end = [...d.querySelectorAll(`.${P}-viewer-end button`)].map((b) => { const r = box(b); return { words: b.textContent.trim(), left: r.left, right: r.right, top: r.top }; });
        return { dialog: [box(d).left, box(d).right], row: [row.left, row.right], zoomTop: zoom.top, end, overflow: d.scrollWidth - d.clientWidth };
      }, P);
      assert.deepEqual(got.end.map((b) => b.words), ["View as list", "Download SVG", "Download PNG"]);
      assert.equal(got.overflow, 0);
      for (const b of got.end) assert.ok(b.left >= got.dialog[0] - 0.5 && b.right <= got.dialog[1] + 0.5, `${b.words} stays inside the dialog`);
      const first = got.end[0];
      if (Math.abs(first.top - got.zoomTop) >= 8) {
        const start = dir === "rtl" ? got.row[1] : got.row[0];
        assert.ok(Math.abs((dir === "rtl" ? first.right : first.left) - start) <= 1, "a wrapped group starts on the row's start edge");
      }
      await context.close();
    });
  }
});

describe("Download SVG with the list open (2.2)", () => {
  test("the viewer's Download SVG writes the same viewBox with the list open as closed, and the sizer is hidden again", async () => {
    const { page, context, errors } = await openHtml(browser, html({ ...DATA.architecture, export: true }), { scheme: "dark", width: 1440 });
    // The saves, read where the module hands them to an anchor.
    await page.evaluate(() => { window.__blobs = []; const make = URL.createObjectURL; URL.createObjectURL = (b) => { window.__blobs.push(b); return make.call(URL, b); }; });
    await openViewer(page);
    const save = async () => {
      const n = await page.evaluate(() => window.__blobs.length);
      await page.locator(`dialog.${P}-viewer .${P}-viewer-end button`, { hasText: "Download SVG" }).click();
      await page.waitForFunction((n) => window.__blobs.length > n, n);
      return page.evaluate(() => window.__blobs.at(-1).text());
    };
    const closed = await save();
    await page.locator(`dialog.${P}-viewer .${P}-viewer-end button`, { hasText: "View as list" }).click();
    await frames(page, 2);
    const opened = await save();
    const viewBox = (svg) => /viewBox="([^"]+)"/.exec(svg)?.[1];
    assert.match(viewBox(closed), /^0 0 \d+ \d+$/);
    assert.equal(viewBox(opened), viewBox(closed));
    assert.equal(await page.locator(`dialog.${P}-viewer .${P}-sizer`).evaluate((el) => el.hidden), true);
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("print (3.2)", () => {
  for (const exportOn of [false, true]) {
    test(`no control of a figure prints${exportOn ? ', with "export": true' : ""}`, async () => {
      const { page, context } = await openHtml(browser, html({ ...DATA.architecture, export: exportOn }), { scheme: "dark", width: 1440 });
      await page.emulateMedia({ media: "print" });
      await frames(page, 2);
      const shown = await page.locator(`#fig-a button`).evaluateAll((els) => els.filter((b) => b.getClientRects().length).map((b) => b.textContent.trim()));
      assert.deepEqual(shown, []);
      assert.equal(await page.locator(`#fig-a .${P}-foot`).evaluate((el) => getComputedStyle(el).display), "none");
      await context.close();
    });
  }
});
