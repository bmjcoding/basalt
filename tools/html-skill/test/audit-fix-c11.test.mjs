// The second audit's performance findings, engineering batch c11, HTML-skill half (A1-18): the still table's cell peek makes one Range for the table, not one for every cell
// each time it measures. Chrome keeps every live Range and adjusts it on each insertion and removal on the page, so a Range for each of a table's cells slowed every row move of a
// sort 7 times at 1,000 rows. The test counts the Ranges made, never milliseconds, and fails on the code before the fix. The React half is packages/react/test/audit-fix-c11.test.mjs.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const ROWS = 300;
const WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet"];
const BODY = `<main><h1>Runs</h1>
<div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0">
<table id="runs" data-fixed style="min-width: 560px">
  <colgroup><col style="width: 110px"><col><col style="width: 90px"><col style="width: 90px"></colgroup>
  <thead><tr><th data-sortable>Run</th><th>Note</th><th data-sortable data-numeric>Size</th><th>Status</th></tr></thead>
  <tbody>
${Array.from({ length: ROWS }, (_, i) => `    <tr><th scope="row">run-${i}</th><td>${WORDS[i % 10]} ${i % 3 === 0 ? "a long note that cannot fit in its column however wide the window, because it runs on and on, and on, and on, and on, and on, and on, and on, and on, and on, and on, and on, and on" : "fits"}</td><td data-numeric data-value="${(i * 37) % 500}">${(i * 37) % 500}</td><td>Ready</td></tr>`).join("\n")}
    <tr data-empty hidden><td colspan="4"><div class="table-empty"><span>No runs match.</span></div></td></tr>
  </tbody>
</table></div></main>`;

const COUNT = `(() => {
  const c = window.__c = { ranges: 0 };
  const create = Document.prototype.createRange;
  Document.prototype.createRange = function () { c.ranges += 1; return create.call(this); };
})();`;

for (const scheme of ["light", "dark"]) {
  describe(`A1-18 (skill): the still table's cell peek (${scheme})`, () => {
    test(`a table of ${ROWS} rows, measured at mount, on resizes, on a sort and on a style sheet, makes at most one Range, and still marks its cut cells`, async () => {
      const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: scheme });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await context.addInitScript(COUNT);
      await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: compose(BODY, { fonts: false }).html }));
      await page.goto("https://basalt.test/");
      await page.evaluate(() => document.fonts.ready);
      const frames = (n = 3) => page.evaluate(async (n) => { for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve())); }, n);
      await frames(4);
      const cut = () => page.evaluate(() => document.querySelectorAll("#runs [data-cut]").length);
      assert.ok(await cut() > 50, "the long notes are cut and are focus stops");
      for (const width of [1000, 800, 1200]) { await page.setViewportSize({ width, height: 900 }); await frames(); }
      await page.locator("#runs th[data-sortable]").first().click();
      await frames(4);
      await page.locator("#runs th[data-sortable]").nth(1).click();
      await frames(4);
      await page.evaluate(() => { const style = document.createElement("style"); style.textContent = "td { letter-spacing: 0.01em; }"; document.head.append(style); });
      await frames(4);
      assert.ok(await cut() > 50, "still marked after a sort and a resize");
      const { ranges } = await page.evaluate(() => window.__c);
      assert.ok(ranges <= 1, `Ranges made: ${ranges}`);
      assert.deepEqual(errors, []);
      await context.close();
    });
  });
}
