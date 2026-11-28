// Micro-details m6, H6 (DECISIONS 420): selected text is the selection wash with its ink lifted to primary, drawn by the opt-in page base. On an inverse fill
// (the primary Button, a focal diagram card) the pair is the inverse wash and the surface's own ink; a rule that takes the fill away (the disabled primary
// Button, the focal Gantt row) gives the parent's pair back. The ticker's number stays transparent while its strips are drawn. In forced colours it is the
// system's Highlight and HighlightText. Read with getComputedStyle(el, "::selection") in Chromium against the built package, both themes. Written while tests
// are paused (DECISIONS 359): not yet run. The static checks (base.css holds the rule, components.css and styles.css hold no bare ::selection) are in
// page-base.test.mjs, the contrast pairs in packages/tokens/test/contrast.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg } from "./support.mjs";

const base = fs.readFileSync(path.join(pkg, "dist", "base.css"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// Two unlike domains, synthetic: a bakery's order board (a focal card) and a garden plan (a focal task with a bar).
const BOARD = {
  title: "Orders for Saturday", summary: "Five orders, one of them the wedding cake.",
  columns: [{ id: "new", label: "New" }, { id: "baking", label: "Baking" }, { id: "ready", label: "Ready" }],
  cards: [
    { id: "o1", column: "new", kind: "Order 12", name: "Rye loaves" },
    { id: "o2", column: "baking", kind: "Order 9", name: "Wedding cake", focal: true },
    { id: "o3", column: "ready", kind: "Order 7", name: "Croissants" },
  ],
};
const PLAN = {
  title: "Spring beds", summary: "Three weeks from compost to planting.",
  tasks: [
    { id: "a", name: "Turn the compost", start: "2026-03-02", end: "2026-03-06" },
    { id: "b", name: "Plant the onions", start: "2026-03-09", end: "2026-03-16", after: ["a"], focal: true },
  ],
};
const FIXTURE = `
  createRoot(document.getElementById("root")).render(<main style={{ padding: 24, width: 900 }}>
    <p id="body">Tide tables for the week, <span id="secondary" style={{ color: "var(--basalt-text-secondary)" }}>printed at dawn</span> and <code id="code">tide --week</code>.</p>
    <B.Button variant="primary" id="primary">Publish</B.Button>
    <B.Button variant="primary" id="disabled" disabled>Publish</B.Button>
    <p id="ticker-line">Visitors: <B.NumberTicker value={1284} /></p>
    <B.KanbanDiagram id="board" {...${JSON.stringify(BOARD)}} />
    <B.GanttDiagram id="plan" {...${JSON.stringify(PLAN)}} />
  </main>);`;

async function open(theme, options = {}) {
  const { page, errors } = await fixturePage(browser, FIXTURE, { theme, standards: true, viewport: { width: 1000, height: 1400 }, ...options });
  await page.addStyleTag({ content: base });
  await page.waitForSelector(".basalt-diagram-kanban-card[data-focal]");
  await page.waitForSelector(".basalt-diagram-gantt-row[data-focal]");
  return { page, errors };
}

/** The selection's background and ink on an element (resolved on that element, as the browser paints it). */
const selection = (page, selector) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el, "::selection"); return { bg: s.backgroundColor, ink: s.color }; });
/** A token resolved under an element, for comparison: `--basalt-<name>` as a colour. */
const token = (page, selector, name) => page.locator(selector).first().evaluate((el, n) => { const d = document.createElement("span"); d.style.color = `var(--basalt-${n})`; el.append(d); const v = getComputedStyle(d).color; d.remove(); return v; }, name);
const system = (page, keyword) => page.evaluate((k) => { const d = document.createElement("span"); d.style.color = k; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; }, keyword);

for (const theme of ["dark", "light"]) {
  describe(`selected text (${theme})`, () => {
    test("body, secondary and code text: the selection wash with primary ink", async () => {
      const { page, errors } = await open(theme);
      const fill = await token(page, "#body", theme === "dark" ? "white-24" : "black-24");
      const ink = await token(page, "#body", "text-primary");
      for (const selector of ["#body", "#secondary", "#code"]) assert.deepEqual(await selection(page, selector), { bg: fill, ink }, selector);
      assert.equal(await token(page, "#body", "selection-fill"), fill);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test("a primary Button's label: the inverse wash and the button's own ink", async () => {
      const { page } = await open(theme);
      const fill = await token(page, "#body", theme === "dark" ? "black-24" : "white-24");
      assert.deepEqual(await selection(page, "#primary"), { bg: fill, ink: await token(page, "#body", "action-primary-text") });
      await page.close();
    });

    test("a disabled primary Button's label: the page pair, since the inverse fill is gone", async () => {
      const { page } = await open(theme);
      assert.deepEqual(await selection(page, "#disabled"), await selection(page, "#body"));
      await page.close();
    });

    test("a focal card's name: the inverse wash and the focal ink; the focal Gantt row's name: the page pair; its bar: the inverse pair", async () => {
      const { page } = await open(theme);
      const inverse = { bg: await token(page, "#body", theme === "dark" ? "black-24" : "white-24"), ink: await token(page, "#body", "diagram-focal-ink") };
      assert.deepEqual(await selection(page, ".basalt-diagram-kanban-card[data-focal] .basalt-diagram-name"), inverse);
      assert.deepEqual(await selection(page, ".basalt-diagram-gantt-row[data-focal] .basalt-diagram-name"), await selection(page, "#body"));
      assert.deepEqual(await selection(page, ".basalt-diagram-gantt-bar[data-focal]"), inverse);
      await page.close();
    });

    test("the ticker's number: transparent while the strips are drawn, the selection ink under reduced motion; the band is the page's", async () => {
      const { page } = await open(theme);
      const drawn = await selection(page, ".basalt-ticker-text");
      assert.equal(drawn.ink, "rgba(0, 0, 0, 0)");
      assert.equal(drawn.bg, (await selection(page, "#body")).bg);
      await page.close();
      const still = await open(theme, { reducedMotion: "reduce" });
      assert.deepEqual(await selection(still.page, ".basalt-ticker-text"), await selection(still.page, "#body"));
      await still.page.close();
    });

    test("forced colours: Highlight and HighlightText, the primary Button and the focal card included", async () => {
      const { page } = await open(theme, { forcedColors: "active" });
      const want = { bg: await system(page, "Highlight"), ink: await system(page, "HighlightText") };
      for (const selector of ["#body", "#secondary", "#primary", ".basalt-diagram-kanban-card[data-focal] .basalt-diagram-name", ".basalt-ticker-text"]) assert.deepEqual(await selection(page, selector), want, selector);
      await page.close();
    });
  });
}

test("without the page base, a component paints no selection of its own (the browser's default stays)", async () => {
  const { page } = await fixturePage(browser, FIXTURE, { theme: "dark", standards: true });
  await page.waitForSelector("#body");
  const bare = await page.evaluate(() => { const d = document.createElement("p"); d.textContent = "x"; document.body.append(d); const s = getComputedStyle(d, "::selection"); return { bg: s.backgroundColor, ink: s.color }; });
  assert.deepEqual(await selection(page, "#body"), bare);
  await page.close();
});
