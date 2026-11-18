// The peek plate (DECISIONS 168 and 170): the whole text of a cut `Listbox` option, `OpenList` row and `StatusBar` message, shown on a level-3 plate. The list parts
// take the row itself raised, every shown word on its pixel; the status message's plate is lifted clear of the bar. Each test below fails on the code before the plate.
// Both themes, 1440 and 390 (the status bar 1440 and 720 and the width under it), forced colours, reduced motion, touch and right to left.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["light", "dark"];
const TOL = 0.75;

const BODY = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";`;
const render = (jsx, extra = "") => `${BODY} ${extra}
function Host() { return (${jsx}); }
createRoot(document.getElementById("root")).render(<Host />);`;

const LONG_NAME = "Quarterly planning notes and the meeting transcripts that go with them, kept for the whole year";
const LONG_DETAIL = "Read 4 minutes ago from the shared team folder: 1,284 files, 3 skipped as too large to read here";
const LISTBOX = (extra = "") => render(`<div style={{ width: 320, padding: 24 }}>
  <B.Listbox label="Sources" defaultValue="a">
    <B.ListboxGroup label="Work">
      <B.ListboxOption value="a" trailing="live" detail="${LONG_DETAIL}">${LONG_NAME}</B.ListboxOption>
      <B.ListboxOption value="b" trailing="soon">Inbox</B.ListboxOption>
      <B.ListboxOption value="c" trailing="live" detail="Read an hour ago">Signed contracts, statements of work and every amendment since 2019</B.ListboxOption>
      <B.ListboxOption value="d" trailing="web">Basalt</B.ListboxOption>
    </B.ListboxGroup>
    <B.ListboxGroup label="Code">
      <B.ListboxOption value="e" trailing="data" detail="Kept for 30 days">Build logs from the nightly integration run on the shared runner</B.ListboxOption>
      <B.ListboxOption value="f">Tests</B.ListboxOption>
    </B.ListboxGroup>
  </B.Listbox></div>`, extra);
const OPEN = (extra = "") => render(`<div style={{ maxWidth: 600, padding: 24, boxSizing: "border-box" }}>
  <B.OpenList label="Work"><B.OpenListGroup label="This week">
    <B.OpenListRow id="payroll" name="Payroll for November" part="finance" state="done" opens="record" onOpen={() => (window.opened = "payroll")} />
    <B.OpenListRow id="lease" name="Contract renewal for the north warehouse lease, its two amendments and the landlord's side letter on parking and loading hours" part="legal" state="waiting" opens="record" detail="Last changed by the facilities team on 12 November. Waiting on a signature from the landlord's agent, who asked for loading to start at 6 a.m." onOpen={() => (window.opened = "lease")} />
    <B.OpenListRow id="roadmap" name="Roadmap" part="product" state="draft" opens="page" onOpen={() => (window.opened = "roadmap")} />
    <B.OpenListRow id="audit" name="Access review for every shared drive and the two contractor accounts, with each owner's sign-off" part="security" state="open" opens="record" onOpen={() => (window.opened = "audit")} />
  </B.OpenListGroup></B.OpenList></div>`, extra);
const STATUS = (message = "Not a command: “deploy staging --force” is a typed line, not one of the commands this run allows. Type / to see them, or press Esc to clear this line.", extra = "") => render(`<div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
  <main style={{ flex: 1, padding: 24 }}>Page content above the bar.</main>
  <B.StatusBar start={<button>run 4f2a, 3 allowed, 1 denied</button>} sources={<button>1 of 2 sources</button>} message={window.__message} end={<button>Theme</button>} />
</div>`, `window.__message = ${JSON.stringify(message ? { text: message, id: 1 } : null)}; ${extra}`);

const open = (page) => page.waitForFunction(() => document.querySelector(".basalt-peek")?.hasAttribute("data-open"), null, { timeout: 4000 });
const closed = (page) => page.waitForFunction(() => !document.querySelector(".basalt-peek")?.hasAttribute("data-open"), null, { timeout: 4000 });
const isOpen = (page) => page.evaluate(() => document.querySelector(".basalt-peek")?.hasAttribute("data-open") ?? false);
const plateBox = (page) => page.evaluate(() => { const r = document.querySelector(".basalt-peek").getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; });

/** Where every word of a row is: the first line of the name (a Range over its text) and the cells' boxes. Read before the plate opens and again on it. */
async function wordsOnPixel(page, rowSel, parts) {
  // `parts`: [name selector, ...cell selectors]. The row's own, read before; the plate's, read after (cells are copies in the same order).
  return page.evaluate(({ rowSel, parts }) => {
    const row = document.querySelector(rowSel);
    const firstLine = (el) => { const range = document.createRange(); range.selectNodeContents(el); const r = range.getClientRects()[0]; return { left: r.left, right: r.right, top: r.top }; };
    const out = { name: firstLine(row.querySelector(parts[0])), cells: parts.slice(1).map((s) => { const r = row.querySelector(s).getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }) };
    return out;
  }, { rowSel, parts });
}
const onPlate = (page, parts) => page.evaluate((parts) => {
  const plate = document.querySelector(".basalt-peek");
  const firstLine = (el) => { const range = document.createRange(); range.selectNodeContents(el); const r = range.getClientRects()[0]; return { left: r.left, right: r.right, top: r.top }; };
  const pinned = [...plate.children].filter((c) => !c.classList.contains("basalt-peek-text"));
  return { name: firstLine(plate.querySelector(".basalt-peek-name")), cells: pinned.map((c) => { const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }), count: parts.length };
}, parts);
const near = (a, b, label) => assert.ok(Math.abs(a - b) <= TOL, `${label}: ${a} against ${b}`);

/** Nothing on the page moved: every row's box, the list's box and the page's height. */
const layout = (page) => page.evaluate(() => ({
  boxes: [...document.querySelectorAll('[role="option"], [data-open-row], .basalt-listbox, .basalt-open-list, .basalt-status-bar, .basalt-status-bar-message, main')].map((el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }),
  height: document.documentElement.scrollHeight, scroll: [scrollX, scrollY],
}));

/** The plate's foot is never inside the letters of a line of the list (the next row's name, a group's label). */
const footCutsNoLine = (page, lineSel) => page.evaluate((lineSel) => {
  const plate = document.querySelector(".basalt-peek");
  const row = document.querySelector("[data-peeking]");
  const style = getComputedStyle(plate);
  const foot = plate.getBoundingClientRect().bottom;
  const ring = plate.hasAttribute("data-focus") ? parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth) : 0;
  const cut = [];
  for (const el of document.querySelectorAll(lineSel)) {
    if (row.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.height || r.top < row.getBoundingClientRect().top) continue;
    const leading = Math.max(0, (r.height - parseFloat(getComputedStyle(el).fontSize) * 1.2) / 2);
    if (foot < r.bottom - leading && foot + ring > r.top + leading) cut.push(el.textContent);
  }
  return cut;
}, lineSel);

const LISTBOX_LINES = ".basalt-listbox-heading, .basalt-listbox-name, .basalt-listbox-detail, .basalt-listbox-trailing";
const OPEN_LINES = ".basalt-open-list-label, .basalt-open-name, .basalt-open-detail, .basalt-open-part, .basalt-open-state";

for (const theme of THEMES) {
  for (const width of [1440, 390]) {
    // On a phone the listbox's options wrap (it has no hover): only the width is changed in this loop, so a part that is not cut at 390 is not asked to open.
    describe(`the listbox option's plate (${theme}, ${width})`, () => {
      const viewport = { width, height: 900 };
      // At 390 the card is the same 320px wide, so the option is cut there too (it is a fixed-width pane; the viewport only moves the page).
      test("hover opens it after the tooltip's wait, over the whole option, and it closes when the pointer leaves", async () => {
        const { page, errors } = await fixturePage(browser, LISTBOX(), { theme, viewport });
        try {
          await page.locator('[data-value="c"]').waitFor();
          await settle(page);
          const before = await layout(page);
          const started = Date.now();
          await page.locator('[data-value="c"]').hover();
          assert.equal(await isOpen(page), false, "not before the wait");
          await open(page);
          assert.ok(Date.now() - started >= 500, `opened after the tooltip's wait (${Date.now() - started}ms)`);
          const row = await page.locator('[data-value="c"]').boundingBox();
          const plate = await plateBox(page);
          near(plate.left, row.x, "the plate starts at the option's start edge");
          near(plate.width, row.width, "the plate is the option's width");
          assert.ok(plate.height >= row.height - TOL, "the plate is at least the option's height");
          assert.equal(await page.evaluate(() => document.querySelector(".basalt-peek").getAttribute("aria-hidden")), "true");
          assert.equal(await page.evaluate(() => document.querySelector(".basalt-peek").getAttribute("data-level")), "3");
          assert.deepEqual(await layout(page), before, "nothing on the page moved");
          await page.mouse.move(2, 2);
          await closed(page);
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      });

      test("every word that shows stays on its pixel, and the foot never ends inside a line of text", async () => {
        const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport });
        try {
          await page.locator('[data-value="c"]').waitFor();
          await settle(page);
          const parts = [".basalt-listbox-name", ".basalt-listbox-gutter", ".basalt-listbox-trailing"];
          const was = await wordsOnPixel(page, '[data-value="c"]', parts);
          await page.locator('[data-value="c"]').hover();
          await open(page);
          const now = await onPlate(page, parts);
          near(now.name.left, was.name.left, "the name's first line starts where it did");
          near(now.name.top, was.name.top, "the name's first line is on the line it was on");
          for (const [i, cell] of was.cells.entries()) {
            const pinned = now.cells[i];
            near(pinned.left, cell.left, `cell ${i} left`); near(pinned.top, cell.top, `cell ${i} top`);
          }
          assert.deepEqual(await footCutsNoLine(page, LISTBOX_LINES), [], "no line is cut through at the foot");
          // The cut text carries on: the detail is shown whole.
          assert.ok((await page.locator(".basalt-peek .basalt-peek-detail").textContent()).includes("Read an hour ago"));
        } finally { await page.close(); }
      });

      test("keyboard focus opens it on the chosen option at once, and it follows the arrow keys; an option that is whole opens nothing", async () => {
        const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport });
        try {
          await page.locator('[data-value="a"]').waitFor();
          await page.keyboard.press("Tab");
          await open(page);
          assert.equal(await page.evaluate(() => document.querySelector(".basalt-peek").hasAttribute("data-chosen")), true, "the chosen option keeps its chosen fill");
          assert.ok((await page.locator(".basalt-peek").textContent()).includes("Quarterly planning notes"));
          await page.keyboard.press("ArrowDown"); // Inbox: whole
          await closed(page);
          await page.keyboard.press("ArrowDown"); // Signed contracts: cut
          await open(page);
          assert.ok((await page.locator(".basalt-peek").textContent()).includes("Signed contracts"));
          assert.equal(await page.evaluate(() => document.querySelector(".basalt-peek").hasAttribute("data-focus")), false, "the ring stays on the list");
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute("role")), "listbox", "still one tab stop");
          await page.keyboard.press("ArrowDown"); // Basalt: whole
          await closed(page);
        } finally { await page.close(); }
      });

      test("Esc closes it and moves neither the pointer nor focus; it opens again after focus leaves and comes back", async () => {
        const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport });
        try {
          await page.locator('[data-value="a"]').waitFor();
          await page.keyboard.press("Tab");
          await open(page);
          await page.keyboard.press("Escape");
          await closed(page);
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute("role")), "listbox", "focus did not move");
          await page.waitForTimeout(300);
          assert.equal(await isOpen(page), false, "it stays closed while focus stays");
          await page.keyboard.press("Shift+Tab");
          await page.keyboard.press("Tab");
          await open(page);
        } finally { await page.close(); }
      });

      test("it stays while the pointer is on it, and a press on it chooses the option without the keyboard ring", async () => {
        const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport });
        try {
          await page.locator('[data-value="c"]').waitFor();
          await page.locator('[data-value="c"]').hover();
          await open(page);
          const plate = await plateBox(page);
          await page.mouse.move(plate.left + plate.width / 2, plate.top + plate.height - 3);
          await page.waitForTimeout(400);
          assert.equal(await isOpen(page), true, "the pointer on the plate keeps it (1.4.13)");
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForFunction(() => document.querySelector('[data-value="c"]').getAttribute("aria-selected") === "true");
          const state = await page.evaluate(() => ({ role: document.activeElement.getAttribute("role"), visible: document.activeElement.matches(":focus-visible"), outline: getComputedStyle(document.activeElement).outlineStyle }));
          assert.equal(state.role, "listbox", "the list took focus");
          assert.equal(state.outline, "none", "and no keyboard ring");
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute("data-pointer-focus")), "", "held off after the press");
          await page.keyboard.press("ArrowDown");
          assert.equal(await page.evaluate(() => document.activeElement.getAttribute("data-pointer-focus")), null, "a key lets the keyboard have its ring");
        } finally { await page.close(); }
      });

      test("an option that is whole opens nothing, and a plate is made at most once and measured with one Range", async () => {
        const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport });
        try {
          await page.locator('[data-value="b"]').waitFor();
          await page.evaluate(() => { window.__ranges = 0; const make = document.createRange.bind(document); document.createRange = () => { window.__ranges += 1; return make(); }; });
          await page.locator('[data-value="b"]').hover();
          await page.waitForTimeout(900);
          assert.equal(await isOpen(page), false);
          assert.equal(await page.locator('[data-value="d"] .basalt-listbox-name').evaluate((el) => el.scrollWidth <= el.clientWidth), true);
          for (const v of ["a", "c", "e", "a", "c"]) { await page.locator(`[data-value="${v}"]`).hover(); await page.waitForTimeout(150); }
          await open(page);
          assert.ok(await page.evaluate(() => document.querySelectorAll(".basalt-peek").length) === 1, "one plate");
          assert.ok(await page.evaluate(() => window.__ranges) <= 1, `at most one Range (${await page.evaluate(() => window.__ranges)})`);
        } finally { await page.close(); }
      });
    });
  }

  describe(`the listbox option's plate (${theme}): forced colours, reduced motion, right to left`, () => {
    test("forced colours: Canvas and CanvasText, no shadow", async () => {
      const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.emulateMedia({ forcedColors: "active", colorScheme: theme });
        await page.locator('[data-value="c"]').hover();
        await open(page);
        const read = await page.evaluate(() => {
          const probe = document.createElement("div"); probe.style.cssText = "color: CanvasText; background: Canvas;"; document.body.append(probe);
          const p = getComputedStyle(probe); const plate = getComputedStyle(document.querySelector(".basalt-peek"));
          return { canvas: p.backgroundColor, text: p.color, bg: plate.backgroundColor, border: plate.borderTopColor, shadow: plate.boxShadow };
        });
        assert.equal(read.bg, read.canvas); assert.equal(read.border, read.text); assert.equal(read.shadow, "none");
      } finally { await page.close(); }
    });
    test("reduced motion: only the opacity changes, and nothing scales", async () => {
      const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      try {
        await page.locator('[data-value="c"]').hover();
        await open(page);
        const read = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".basalt-peek")); return { property: s.transitionProperty, transform: s.transform, scale: s.scale }; });
        assert.ok(read.property.split(",").every((p) => ["opacity", "visibility"].includes(p.trim())), read.property);
        assert.equal(read.transform, "none"); assert.ok(read.scale === "none" || read.scale === "1");
      } finally { await page.close(); }
    });
    test("right to left: the plate keeps the option's edges and the words their pixels, mirrored", async () => {
      const { page } = await fixturePage(browser, LISTBOX(), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.evaluate(() => { document.documentElement.dir = "rtl"; });
        await settle(page);
        const parts = [".basalt-listbox-name", ".basalt-listbox-gutter", ".basalt-listbox-trailing"];
        const was = await wordsOnPixel(page, '[data-value="c"]', parts);
        const row = await page.locator('[data-value="c"]').boundingBox();
        await page.locator('[data-value="c"]').hover();
        await open(page);
        const plate = await plateBox(page);
        near(plate.left, row.x, "start edge"); near(plate.width, row.width, "width");
        const now = await onPlate(page, parts);
        near(now.name.right, was.name.right, "the name's first line starts on the right edge it did");
        near(now.name.top, was.name.top, "on the line it was on");
        for (const [i, cell] of was.cells.entries()) { near(now.cells[i].left, cell.left, `cell ${i}`); near(now.cells[i].top, cell.top, `cell ${i} top`); }
      } finally { await page.close(); }
    });
  });
}

for (const theme of THEMES) {
  for (const width of [1440, 390]) {
    describe(`the open-list row's plate (${theme}, ${width})`, () => {
      const viewport = { width, height: 900 };
      test("it keeps its ellipsis at rest; hover opens the plate after the wait, over the whole row, and moves nothing", async () => {
        const { page } = await fixturePage(browser, OPEN(), { theme, viewport });
        try {
          await page.locator('[data-open-row="lease"]').waitFor();
          await settle(page);
          assert.equal(await page.locator('[data-open-row="lease"] .basalt-open-button').evaluate((el) => getComputedStyle(el).textOverflow), "ellipsis");
          const before = await layout(page);
          const started = Date.now();
          await page.locator('[data-open-row="lease"]').hover();
          assert.equal(await isOpen(page), false, "not before the wait");
          await open(page);
          assert.ok(Date.now() - started >= 500);
          const row = await page.locator('[data-open-row="lease"]').boundingBox();
          const plate = await plateBox(page);
          near(plate.left, row.x, "row's start edge"); near(plate.width, row.width, "row's width");
          assert.deepEqual(await layout(page), before, "nothing moved");
          await page.mouse.move(2, 2);
          await closed(page);
        } finally { await page.close(); }
      });
      test("every shown word stays on its pixel: the chevron, the name's first line, the cells and the word it opens into; the foot cuts no line", async () => {
        const { page } = await fixturePage(browser, OPEN(), { theme, viewport });
        try {
          await page.locator('[data-open-row="lease"]').waitFor();
          await settle(page);
          const parts = [".basalt-open-button", ".basalt-open-gutter", ".basalt-open-part", ".basalt-open-state", ".basalt-open-into"];
          const was = await wordsOnPixel(page, '[data-open-row="lease"]', parts);
          await page.locator('[data-open-row="lease"]').hover();
          await open(page);
          const now = await onPlate(page, parts);
          near(now.name.left, was.name.left, "name left"); near(now.name.top, was.name.top, "name top");
          for (const [i, cell] of was.cells.entries()) { near(now.cells[i].left, cell.left, `cell ${i} left`); near(now.cells[i].top, cell.top, `cell ${i} top`); }
          assert.deepEqual(await footCutsNoLine(page, OPEN_LINES), []);
          const text = await page.locator(".basalt-peek").textContent();
          assert.ok(text.includes("loading hours") && text.includes("6 a.m."), "the name and the detail are whole");
          assert.ok(!text.includes("opens its"), "the button's hidden words are not drawn");
        } finally { await page.close(); }
      });
      test("keyboard focus opens it at once with the control ring round the plate and the row's own ring gone; Esc closes it and the row's ring returns", async () => {
        const { page } = await fixturePage(browser, OPEN(), { theme, viewport });
        try {
          await page.locator('[data-open-row="lease"]').waitFor();
          await page.keyboard.press("Tab"); // the cursor row: payroll, whole
          if (width >= 720) assert.equal(await isOpen(page), false, "a row that is whole opens nothing");
          await page.keyboard.press("ArrowDown");
          await page.waitForFunction(() => document.querySelector(".basalt-peek[data-open]")?.textContent.includes("Contract renewal"));
          const ring = await page.evaluate(() => { const p = getComputedStyle(document.querySelector(".basalt-peek")); const r = getComputedStyle(document.querySelector('[data-open-row="lease"]')); return { plate: p.outlineStyle, offset: p.outlineOffset, width: p.outlineWidth, row: r.outlineColor }; });
          assert.equal(ring.plate, "solid"); assert.equal(ring.offset, "2px"); assert.equal(ring.width, "2px");
          assert.match(ring.row, /rgba\(0, 0, 0, 0\)|transparent/, "the row's ring gives way to the plate's");
          await page.keyboard.press("Escape");
          await closed(page);
          assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-open-button")), true, "focus did not move");
          assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-open-row="lease"]')).outlineStyle), "solid", "the row shows its own ring after Esc");
        } finally { await page.close(); }
      });
      test("the pointer can move onto the plate and it stays; a press on it opens the row", async () => {
        const { page } = await fixturePage(browser, OPEN(), { theme, viewport });
        try {
          await page.locator('[data-open-row="lease"]').waitFor();
          await page.locator('[data-open-row="lease"]').hover();
          await open(page);
          const plate = await plateBox(page);
          await page.mouse.move(plate.left + plate.width / 2, plate.top + plate.height - 3);
          await page.waitForTimeout(400);
          assert.equal(await isOpen(page), true);
          await page.mouse.down(); await page.mouse.up();
          await page.waitForFunction(() => window.opened === "lease");
        } finally { await page.close(); }
      });
      test("a row that is whole opens nothing, and the cursor row's chosen fill carries onto its plate", async () => {
        const { page } = await fixturePage(browser, OPEN(), { theme, viewport });
        try {
          await page.locator('[data-open-row="roadmap"]').waitFor();
          await page.locator('[data-open-row="roadmap"]').hover();
          await page.waitForTimeout(900);
          assert.equal(await isOpen(page), false);
          if (width >= 720) {
            await page.keyboard.press("Tab");
            await page.keyboard.press("ArrowDown");
            await open(page);
            assert.equal(await page.evaluate(() => document.querySelector(".basalt-peek").hasAttribute("data-chosen")), true);
          }
        } finally { await page.close(); }
      });
    });
  }

  describe(`the open-list row's plate (${theme}): touch, forced colours, reduced motion, right to left`, () => {
    test("touch: a long press (500ms) opens the plate, the release opens nothing, and a touch elsewhere closes it; a tap still opens the row", async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const page = await context.newPage();
      try {
        await page.setContent(`<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>`);
        const { bundleFixture } = await import("./support.mjs");
        const fs = await import("node:fs"); const path = await import("node:path"); const { pkg } = await import("./support.mjs");
        await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8") });
        await page.addScriptTag({ content: await bundleFixture(OPEN()) });
        await page.locator('[data-open-row="lease"]').waitFor();
        const cdp = await context.newCDPSession(page);
        const at = await page.locator('[data-open-row="lease"]').boundingBox();
        const point = { x: at.x + 60, y: at.y + 12 };
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
        await page.waitForTimeout(250);
        assert.equal(await isOpen(page), false, "not before the hold");
        await page.waitForTimeout(450);
        assert.equal(await isOpen(page), true, "open after the hold");
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(500);
        assert.equal(await isOpen(page), true, "the release does not close it");
        assert.equal(await page.evaluate(() => window.opened ?? null), null, "and opens nothing");
        await page.touchscreen.tap(5, 5);
        await closed(page);
        // The swallowed release does not swallow the next press.
        await page.waitForTimeout(500);
        await page.locator('[data-open-row="payroll"]').tap();
        await page.waitForFunction(() => window.opened === "payroll");
      } finally { await context.close(); }
    });
    test("forced colours and reduced motion", async () => {
      const { page } = await fixturePage(browser, OPEN(), { theme, viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      try {
        await page.emulateMedia({ forcedColors: "active", colorScheme: theme, reducedMotion: "reduce" });
        await page.locator('[data-open-row="lease"]').hover();
        await open(page);
        const read = await page.evaluate(() => {
          const probe = document.createElement("div"); probe.style.cssText = "color: CanvasText; background: Canvas;"; document.body.append(probe);
          const p = getComputedStyle(probe); const s = getComputedStyle(document.querySelector(".basalt-peek"));
          return { canvas: p.backgroundColor, text: p.color, bg: s.backgroundColor, border: s.borderTopColor, property: s.transitionProperty, transform: s.transform };
        });
        assert.equal(read.bg, read.canvas); assert.equal(read.border, read.text);
        assert.ok(read.property.split(",").every((x) => ["opacity", "visibility"].includes(x.trim()))); assert.equal(read.transform, "none");
      } finally { await page.close(); }
    });
    test("right to left: the words keep their pixels, mirrored", async () => {
      const { page } = await fixturePage(browser, OPEN(), { theme, viewport: { width: 1440, height: 900 } });
      try {
        await page.evaluate(() => { document.documentElement.dir = "rtl"; });
        await settle(page);
        const parts = [".basalt-open-button", ".basalt-open-gutter", ".basalt-open-part", ".basalt-open-state", ".basalt-open-into"];
        const was = await wordsOnPixel(page, '[data-open-row="lease"]', parts);
        await page.locator('[data-open-row="lease"]').hover();
        await open(page);
        const now = await onPlate(page, parts);
        near(now.name.right, was.name.right, "name's first line starts on the right edge"); near(now.name.top, was.name.top, "top");
        for (const [i, cell] of was.cells.entries()) near(now.cells[i].left, cell.left, `cell ${i}`);
      } finally { await page.close(); }
    });
  });

  describe(`the listbox on touch (${theme}): it wraps at rest and has no plate to open`, () => {
    test("390 on a coarse pointer: the name and the detail are whole at rest, the options hold their 44px, and a tap chooses", async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const page = await context.newPage();
      try {
        const fs = await import("node:fs"); const path = await import("node:path"); const { pkg, bundleFixture } = await import("./support.mjs");
        await page.setContent(`<html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>`);
        await page.addStyleTag({ content: fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8") });
        await page.addScriptTag({ content: await bundleFixture(LISTBOX()) });
        await page.locator('[data-value="a"]').waitFor();
        const read = await page.evaluate(() => {
          const name = document.querySelector('[data-value="a"] .basalt-listbox-name'); const detail = document.querySelector('[data-value="a"] .basalt-listbox-detail');
          const lines = (el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
          return { nameWraps: lines(name) > 1, detailWraps: lines(detail) > 1, nameCut: name.scrollWidth > name.clientWidth, detailCut: detail.scrollWidth > detail.clientWidth, short: document.querySelector('[data-value="b"]').getBoundingClientRect().height };
        });
        assert.deepEqual([read.nameWraps, read.detailWraps, read.nameCut, read.detailCut], [true, true, false, false]);
        assert.ok(read.short >= 44 - 0.5, `a one-line option keeps 44 (${read.short})`);
        await page.locator('[data-value="c"]').tap();
        await page.waitForFunction(() => document.querySelector('[data-value="c"]').getAttribute("aria-selected") === "true");
        await page.waitForTimeout(900);
        assert.equal(await page.evaluate(() => document.querySelectorAll(".basalt-peek[data-open]").length), 0, "no plate");
      } finally { await context.close(); }
    });
  });
}

for (const theme of THEMES) {
  for (const width of [1440, 720]) {
    describe(`the status bar's message plate (${theme}, ${width})`, () => {
      const viewport = { width, height: 700 };
      test("a cut message is one focus stop, named by its words; the bar keeps its line and its height", async () => {
        const { page } = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await page.locator(".basalt-status-bar-message").waitFor();
          await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          const read = await page.evaluate(() => {
            const m = document.querySelector(".basalt-status-bar-message"); const t = m.querySelector(".basalt-status-bar-text");
            return { tab: m.getAttribute("tabindex"), role: m.getAttribute("role"), label: m.getAttribute("aria-label"), hidden: m.getAttribute("aria-hidden"), textHidden: t.getAttribute("aria-hidden"), text: t.textContent, ellipsis: getComputedStyle(t).textOverflow, bar: document.querySelector(".basalt-status-bar").getBoundingClientRect().height };
          });
          assert.equal(read.tab, "0"); assert.equal(read.role, "note"); assert.equal(read.label, read.text); assert.equal(read.hidden, null); assert.equal(read.textHidden, "true");
          assert.equal(read.ellipsis, "ellipsis"); assert.equal(read.bar, 44);
        } finally { await page.close(); }
      });
      test("hover opens it after the wait: the slot's width, its foot space-2 above the bar's top border, inside the viewport, covering no control; nothing moves", async () => {
        const { page } = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await settle(page);
          const before = await layout(page);
          const started = Date.now();
          await page.locator(".basalt-status-bar-message").hover();
          assert.equal(await isOpen(page), false, "not before the wait");
          await open(page);
          assert.ok(Date.now() - started >= 500);
          const slot = await page.locator(".basalt-status-bar-message").boundingBox();
          const bar = await page.locator(".basalt-status-bar").boundingBox();
          const plate = await plateBox(page);
          near(plate.left, slot.x, "the slot's start edge"); near(plate.width, slot.width, "the slot's width");
          near(plate.bottom, bar.y - 8, "its foot is space-2 above the bar's top border");
          assert.ok(plate.left >= 0 && plate.right <= width && plate.top >= 0, "inside the viewport");
          const covered = await page.evaluate(() => { const p = document.querySelector(".basalt-peek").getBoundingClientRect(); return [...document.querySelectorAll(".basalt-status-bar button")].filter((b) => { const r = b.getBoundingClientRect(); return r.left < p.right && r.right > p.left && r.top < p.bottom && r.bottom > p.top; }).length; });
          assert.equal(covered, 0, "covers no control in the bar");
          assert.deepEqual(await layout(page), before, "nothing moved");
          assert.equal((await page.locator(".basalt-peek").textContent()).trim().startsWith("Not a command"), true);
          await page.mouse.move(2, 2);
          await closed(page);
        } finally { await page.close(); }
      });
      test("keyboard focus opens it at once with the ring round the plate; Esc closes it and the message stays", async () => {
        const { page } = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await page.locator(".basalt-status-bar button").first().focus();
          await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
          assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-status-bar-message")), true, "the message is a stop between the sources and the theme");
          await open(page);
          const ring = await page.evaluate(() => { const p = getComputedStyle(document.querySelector(".basalt-peek")); const m = getComputedStyle(document.querySelector(".basalt-status-bar-message")); return { plate: [p.outlineStyle, p.outlineWidth, p.outlineOffset], message: m.outlineColor }; });
          assert.deepEqual(ring.plate, ["solid", "2px", "2px"]); assert.match(ring.message, /rgba\(0, 0, 0, 0\)|transparent/, "one ring, on the plate");
          await page.keyboard.press("Escape");
          await closed(page);
          assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-status-bar-message")), true, "focus did not move");
          assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-status-bar-message")).outlineStyle), "solid", "the message shows its own ring");
          assert.equal(await page.locator(".basalt-status-bar-text").count(), 1, "the message is still there after the first Esc");
        } finally { await page.close(); }
      });
      test("the pointer can move onto the plate and it stays", async () => {
        const { page } = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await page.locator(".basalt-status-bar-message").hover();
          await open(page);
          const plate = await plateBox(page);
          await page.mouse.move(plate.left + plate.width / 2, plate.top + plate.height / 2);
          await page.waitForTimeout(400);
          assert.equal(await isOpen(page), true);
        } finally { await page.close(); }
      });
      test("a message that is whole opens nothing and is no stop; the cut one gives up the words in the live regions once they are said, so they are read in one place", async () => {
        const { page } = await fixturePage(browser, STATUS("Saved"), { theme, viewport });
        try {
          await page.locator(".basalt-status-bar-message").waitFor();
          await settle(page);
          const read = await page.evaluate(() => { const m = document.querySelector(".basalt-status-bar-message"); return { tab: m.getAttribute("tabindex"), hidden: m.getAttribute("aria-hidden"), cut: m.hasAttribute("data-cut") }; });
          assert.deepEqual(read, { tab: null, hidden: "true", cut: false });
          await page.locator(".basalt-status-bar-message").hover();
          await page.waitForTimeout(900);
          assert.equal(await isOpen(page), false);
          assert.equal(await page.locator('.basalt-status-bar [role="status"]').textContent(), "Saved", "a whole message stays in the polite region");
        } finally { await page.close(); }
        const cut = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await cut.page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await cut.page.waitForFunction(() => document.querySelector('.basalt-status-bar [role="status"]').textContent.includes("Not a command"), null, { timeout: 3000 });
          await cut.page.waitForFunction(() => document.querySelector('.basalt-status-bar [role="status"]').textContent === "", null, { timeout: 6000 });
          const words = await cut.page.evaluate(() => [...document.querySelectorAll(".basalt-status-bar [aria-label], .basalt-status-bar [role=status]")].filter((el) => el.getAttribute("aria-label")?.includes("Not a command") || el.textContent.includes("Not a command")).length);
          assert.equal(words, 1, "the words are in one place for a screen reader");
        } finally { await cut.page.close(); }
      });
      test("an error's XCircle is on the plate before the words, in the danger ink", async () => {
        const err = await fixturePage(browser, render(`<div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}><main style={{ flex: 1 }} />
          <B.StatusBar start={<button>run</button>} sources={<button>1 of 2 sources</button>} message={{ text: "Could not reach github, so nothing was saved, and the run stays queued until the connection comes back; try again later, or open the run's log from the run button to see which step stopped and why it stopped there.", status: "error", id: 2 }} end={<button>Theme</button>} /></div>`), { theme, viewport });
        try {
          await err.page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await err.page.locator(".basalt-status-bar-message").hover();
          await open(err.page);
          const read = await err.page.evaluate(() => {
            const plate = document.querySelector(".basalt-peek"); const seat = plate.querySelector(".basalt-status-bar-seat"); const words = plate.querySelector(".basalt-peek-name");
            const barSeat = getComputedStyle(document.querySelector(".basalt-status-bar-message .basalt-status-bar-seat")).color;
            return { seat: Boolean(seat?.querySelector("svg")), before: seat && words ? seat.getBoundingClientRect().right <= words.getBoundingClientRect().left + 1 : false, ink: seat ? getComputedStyle(seat).color : null, barSeat, words: getComputedStyle(words).color };
          });
          assert.equal(read.seat, true); assert.equal(read.before, true); assert.equal(read.ink, read.barSeat); assert.equal(read.words, read.barSeat);
        } finally { await err.page.close(); }
      });
      test("forced colours, reduced motion and right to left", async () => {
        const { page } = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await page.emulateMedia({ forcedColors: "active", colorScheme: theme, reducedMotion: "reduce" });
          await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await page.locator(".basalt-status-bar-message").hover();
          await open(page);
          const read = await page.evaluate(() => {
            const probe = document.createElement("div"); probe.style.cssText = "color: CanvasText; background: Canvas;"; document.body.append(probe);
            const p = getComputedStyle(probe); const s = getComputedStyle(document.querySelector(".basalt-peek"));
            return { canvas: p.backgroundColor, text: p.color, bg: s.backgroundColor, border: s.borderTopColor, property: s.transitionProperty, transform: s.transform };
          });
          assert.equal(read.bg, read.canvas); assert.equal(read.border, read.text);
          assert.ok(read.property.split(",").every((x) => ["opacity", "visibility"].includes(x.trim()))); assert.equal(read.transform, "none");
        } finally { await page.close(); }
        const rtl = await fixturePage(browser, STATUS(), { theme, viewport });
        try {
          await rtl.page.evaluate(() => { document.documentElement.dir = "rtl"; });
          await rtl.page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
          await rtl.page.locator(".basalt-status-bar-message").hover();
          await open(rtl.page);
          const slot = await rtl.page.locator(".basalt-status-bar-message").boundingBox();
          const plate = await plateBox(rtl.page);
          near(plate.left, slot.x, "the slot's edge"); near(plate.width, slot.width, "the slot's width");
          assert.equal(await rtl.page.evaluate(() => getComputedStyle(document.querySelector(".basalt-peek")).direction), "rtl");
        } finally { await rtl.page.close(); }
      });
    });
  }

  describe(`the status bar's Esc (${theme})`, () => {
    test("the first Esc closes the plate and does not clear the message; the second, with the plate shut, clears it", async () => {
      const body = render(`<div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}><main style={{ flex: 1 }} />
        <B.StatusBar start={<button>run</button>} message={{ text: ${JSON.stringify("Not a command: a typed line far longer than the room the bar leaves for its message, kept whole so it can be read, and longer again so that it is cut at any width.".repeat(2))}, id: 1 }} onMessageClear={() => (window.cleared = (window.cleared ?? 0) + 1)} end={<button>Theme</button>} /></div>`);
      const { page } = await fixturePage(browser, body, { theme, viewport: { width: 1440, height: 700 } });
      try {
        await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
        await page.locator(".basalt-status-bar-message").focus();
        await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
        await open(page);
        await page.keyboard.press("Escape");
        await closed(page);
        assert.equal(await page.evaluate(() => window.cleared ?? 0), 0, "the first Esc only closed the plate");
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => window.cleared === 1);
      } finally { await page.close(); }
    });
  });

  describe(`the status bar's plate in a narrow slot (${theme})`, () => {
    test("720, long buttons and a very long message: the plate keeps its foot above the bar and its top inside the viewport, and scrolls inside itself", async () => {
      const long = "A message far longer than the slot, kept whole so that it can be read in full by anyone who rests on it. ".repeat(12);
      const body = render(`<div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}><main style={{ flex: 1 }} />
        <B.StatusBar start={<button>run 4f2a, 3 allowed, 1 denied, 2 waiting</button>} sources={<button>1 of 2 sources, session 04:12</button>} message={{ text: ${JSON.stringify(long)}, id: 1 }} end={<button>Theme</button>} /></div>`);
      const { page } = await fixturePage(browser, body, { theme, viewport: { width: 720, height: 500 } });
      try {
        await page.waitForFunction(() => document.querySelector(".basalt-status-bar-message")?.hasAttribute("data-cut"));
        await page.locator(".basalt-status-bar-message").hover();
        await open(page);
        const bar = await page.locator(".basalt-status-bar").boundingBox();
        const plate = await plateBox(page);
        assert.ok(plate.top >= 0, `the top is inside the viewport (${plate.top})`);
        near(plate.bottom, bar.y - 8, "the foot");
        assert.equal(await page.evaluate(() => { const p = document.querySelector(".basalt-peek"); return p.scrollHeight > p.clientHeight; }), true, "what does not fit scrolls inside the plate");
      } finally { await page.close(); }
    });
  });

  describe(`the status bar's message under 720 (${theme}): the shipped band wraps, so nothing is cut and no plate opens`, () => {
    test("390: no stop, no plate", async () => {
      const { page } = await fixturePage(browser, STATUS(), { theme, viewport: { width: 390, height: 800 } });
      try {
        await page.locator(".basalt-status-bar-message").waitFor();
        await settle(page);
        await page.locator(".basalt-status-bar-message").hover();
        await page.waitForTimeout(900);
        const read = await page.evaluate(() => { const m = document.querySelector(".basalt-status-bar-message"); return { cut: m.hasAttribute("data-cut"), tab: m.getAttribute("tabindex"), plates: document.querySelectorAll(".basalt-peek[data-open]").length }; });
        assert.deepEqual(read, { cut: false, tab: null, plates: 0 });
      } finally { await page.close(); }
    });
  });
}
