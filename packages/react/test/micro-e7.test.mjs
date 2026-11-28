// micro-e7 (DECISIONS 405, audit row P2): the default MenuTrigger meets the shared target floor as hit area alone. With no `render` it is a bare
// button drawn at its text's height; its hit box is at least 24 by 24 at a fine pointer and 44 by 44 on touch and under 720, and the button, its
// words and a glyph inside it keep their size and place. A `render` Button keeps its own sizes and gets no extra box. Engineering that restores
// documented behaviour (foundations, Controls); no panel. Driven in Chromium against the built package with the real stylesheet. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (jsx, options = {}) => {
  const { page, errors } = await fixturePage(browser, render(jsx), options);
  await settle(page);
  return { page, errors };
};

const MENUS = `<div style={{ display: "flex", gap: 48, alignItems: "center", padding: 48 }}>
  <B.Menu modal={false}><B.MenuTrigger data-testid="bare">Sort</B.MenuTrigger><B.MenuContent><B.MenuItem>Name</B.MenuItem><B.MenuItem>Date</B.MenuItem></B.MenuContent></B.Menu>
  <B.Menu modal={false}><B.MenuTrigger data-testid="glyph">Shelf <B.Icon icon={B.ChevronDownGlyph} size={16} /></B.MenuTrigger><B.MenuContent><B.MenuItem>Pantry</B.MenuItem></B.MenuContent></B.Menu>
  <B.Menu modal={false}><B.MenuTrigger data-testid="styled" render={<B.Button size="sm">Move to</B.Button>} /><B.MenuContent><B.MenuItem>Archive</B.MenuItem></B.MenuContent></B.Menu>
</div>`;

/** The trigger's own box, and its hit box: the union of the element and its `::before`. */
const boxes = (page, id) => page.getByTestId(id).evaluate((el) => {
  const r = el.getBoundingClientRect();
  const before = getComputedStyle(el, "::before");
  const has = before.content !== "none" && before.position === "absolute";
  const w = has ? Math.max(r.width, parseFloat(before.width)) : r.width;
  const h = has ? Math.max(r.height, parseFloat(before.height)) : r.height;
  return { own: [r.width, r.height], hit: [w, h], bare: el.hasAttribute("data-bare"), position: getComputedStyle(el).position };
});
/** What `elementFromPoint` finds at a point `dy` px below or above the trigger's centre, as the trigger's test id or the tag found. */
const hitAt = (page, id, dx, dy) => page.getByTestId(id).evaluate((el, [dx, dy]) => {
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2 + dx, r.y + r.height / 2 + dy);
  return hit?.closest("[data-testid]")?.getAttribute("data-testid") ?? hit?.tagName ?? null;
}, [dx, dy]);

describe("the default MenuTrigger meets the target floor (P2)", () => {
  for (const [name, options, floor] of [
    ["a fine pointer at 1440", { viewport: { width: 1440, height: 900 } }, 24],
    ["touch at 390", { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, 44],
    ["a mouse under 720", { viewport: { width: 700, height: 900 } }, 44],
  ]) {
    test(`${name}: the bare trigger's hit box is at least ${floor} by ${floor}, its own box unchanged`, async () => {
      const { page, errors } = await open(MENUS, options);
      const bare = await boxes(page, "bare");
      assert.equal(bare.bare, true);
      assert.equal(bare.position, "relative");
      assert.ok(bare.own[1] < 24, `the bare button is drawn at its text's height (${bare.own[1]}), so the floor is hit area, not layout`);
      assert.ok(bare.hit[0] >= floor && bare.hit[1] >= floor, `hit box ${bare.hit} under ${floor}`);
      // A press just outside the drawn button, inside the floor, still lands on the trigger.
      const reach = (floor - bare.own[1]) / 2 - 1;
      assert.equal(await hitAt(page, "bare", 0, bare.own[1] / 2 + reach), "bare");
      assert.equal(await hitAt(page, "bare", 0, -(bare.own[1] / 2 + reach)), "bare");
      await page.mouse.click(...await page.getByTestId("bare").evaluate((el, reach) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.bottom + reach]; }, reach));
      await settle(page);
      assert.equal(await page.getByTestId("bare").getAttribute("aria-expanded"), "true");
      assert.deepEqual(errors, []);
    });

    test(`${name}: a glyph inside the bare trigger keeps its size`, async () => {
      const { page } = await open(MENUS, options);
      const glyph = await page.getByTestId("glyph").locator("svg").evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; });
      assert.deepEqual(glyph, [16, 16]);
      const box = await boxes(page, "glyph");
      assert.ok(box.hit[0] >= floor && box.hit[1] >= floor);
    });

    test(`${name}: a render Button keeps its own sizes and takes no extra box`, async () => {
      const { page } = await open(MENUS, options);
      const styled = await boxes(page, "styled");
      assert.equal(styled.bare, false);
      assert.ok(styled.own[1] >= floor, `the styled Button is ${styled.own[1]} tall`);
    });
  }
});
