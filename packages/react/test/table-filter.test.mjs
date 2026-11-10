// The still table (decisions 71, 82 and 84) and the multi-select filter (82 and 83), driven in Chromium against the built
// package with the real stylesheet. The headline test is the owner's rule measured: each header's x and width, and the left
// and right edges of its words, are identical through every sort, a filter down to one row and to empty, paging and
// loading, and the indicator arriving on hover, focus and touch, in both themes at 1440 and 390.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";
import { measureHeaders, runsFixture } from "./runs-fixture.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const opaque = (colour) => !/\/\s*[\d.]+%?\s*\)/.test(colour) && !/^rgba\(.*,\s*0?\.\d+\)$/.test(colour);
const SORTABLE = ["Name", "Status", "Region", "Duration", "Started", "Cost"];

const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const open = async (options = {}, fixture = runsFixture()) => {
  const { page, errors } = await fixturePage(browser, fixture, options);
  // A phone's layout viewport is 980px wide until the page says otherwise, as every real page does.
  if (options.isMobile) {
    await page.evaluate(() => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1"; document.head.append(m); });
    await page.waitForFunction((w) => window.innerWidth === w, options.viewport.width);
  }
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); }" });
  await settle(page);
  return { page, errors };
};
const head = (page, name) => page.locator("thead th").filter({ has: page.locator(".basalt-sort-label", { hasText: new RegExp(`^${name}$`) }) });
/** A press on the header cell's own edge, not on its label: the whole cell is the button. */
const pressCell = async (page, name, touch) => {
  const box = await head(page, name).boundingBox();
  const at = { x: box.x + 3, y: box.y + 3 };
  if (touch) await page.touchscreen.tap(at.x, at.y);
  else await page.mouse.click(at.x, at.y);
};
const sortOf = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll("thead th")].filter((th) => th.hasAttribute("aria-sort")).map((th) => [th.textContent.trim(), th.getAttribute("aria-sort")])));

describe("the still table: nothing moves", () => {
  for (const [size, options, touch] of [["1440", DESKTOP, false], ["390 on touch", PHONE, true]]) {
    for (const theme of THEMES) {
      test(`${size}, ${theme}: every header's x, width and word edges are identical through sort, filter, empty, paging, loading and the indicator`, async () => {
        const { page, errors } = await open({ theme, ...options });
        const base = await measureHeaders(page);
        assert.equal(base.heads.length, 7);
        let steps = 0;
        const same = async (what) => {
          steps += 1;
          assert.deepEqual(await measureHeaders(page), base, what);
        };
        // Every sortable header, three presses each: ascending or descending first, then the other, then back.
        for (const name of SORTABLE) {
          for (let i = 0; i < 3; i++) { await pressCell(page, name, touch); await same(`${name} press ${i + 1}`); }
        }
        // The indicator arriving on hover and on focus.
        if (!touch) for (const name of SORTABLE) { await head(page, name).hover(); await same(`hover ${name}`); }
        await page.locator("body").click({ position: { x: 5, y: 5 } });
        for (const name of SORTABLE) { await head(page, name).locator("button").focus(); await same(`focus ${name}`); }
        // A filter down to one row, to none, and back; paging; loading.
        await page.evaluate(() => window.runs.setQuery("report-builder-107")); await frames(page);
        assert.equal(await page.locator("tbody tr").count(), 1);
        await same("one row");
        await page.evaluate(() => window.runs.setQuery("zzz")); await frames(page);
        assert.equal(await page.locator("tbody tr[data-empty]").count(), 1);
        await same("empty");
        await page.evaluate(() => window.runs.setQuery("")); await frames(page);
        await same("filter cleared");
        for (const p of [1, 2, 0]) { await page.evaluate((n) => window.runs.setPage(n), p); await frames(page); await same(`page ${p}`); }
        await page.evaluate(() => window.runs.setLoading(true)); await frames(page);
        await same("loading");
        await page.evaluate(() => window.runs.setLoading(false)); await frames(page);
        await same("loaded");
        // The chips and the checklist change the rows, never the header.
        await page.getByRole("checkbox", { name: "Failed" }).click();
        await same("a status chip on");
        assert.deepEqual(errors, []);
        assert.ok(steps > 30);
      });
    }
  }

  test("the proof is not vacuous: an automatic-layout table does move when the longest row is filtered away", async () => {
    const jsx = `<B.TableContainer><B.Table><B.TableHeader><B.TableRow><B.TableHead>Name</B.TableHead><B.TableHead>Status</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell>a</B.TableCell><B.TableCell>ok</B.TableCell></B.TableRow><B.TableRow><B.TableCell>a very long name for a row that is about to go</B.TableCell><B.TableCell>ok</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>`;
    const { page } = await open({}, render(jsx));
    const x = () => page.evaluate(() => document.querySelectorAll("th")[1].getBoundingClientRect().left);
    const before = await x();
    await page.evaluate(() => document.querySelectorAll("tbody tr")[1].remove());
    assert.notEqual(await x(), before);
  });

  test("scrollbar-gutter: stable keeps the remainder column still when a filter removes the page's classic scrollbar", async () => {
    const classicBrowser = await (await import("playwright")).chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    try {
      const run = async (gutter) => {
        const { page } = await fixturePage(classicBrowser, runsFixture({ rows: 24 }), { ...DESKTOP, viewport: { width: 1440, height: 520 } });
        await page.addStyleTag({ content: `html { ${gutter ? "scrollbar-gutter: stable;" : ""} } .basalt-table-container { margin-bottom: 600px; }` });
        await settle(page);
        const before = await measureHeaders(page);
        const classic = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth > 0);
        await page.evaluate(() => { window.runs.setQuery("report-builder-107"); document.querySelector(".basalt-table-container").style.marginBottom = "0"; });
        await settle(page);
        const after = await measureHeaders(page);
        await page.close();
        return { before, after, classic };
      };
      const plain = await run(false);
      const stable = await run(true);
      assert.deepEqual(stable.after.heads, stable.before.heads, "with the gutter reserved nothing moves");
      assert.deepEqual(stable.after.table, stable.before.table);
      // Without the gutter the table widens when the scrollbar goes. Only a classic scrollbar can show that; a platform that
      // draws overlay scrollbars (macOS with a trackpad) has nothing to remove, so there the comparison has no premise.
      if (plain.classic) assert.notDeepEqual(plain.after.table, plain.before.table, "without it the table is wider once the scrollbar is gone: that is what the gutter prevents");
      else console.log("scrollbar-gutter: this platform draws overlay scrollbars, so the unreserved case cannot be shown here");
    } finally {
      await classicBrowser.close();
    }
  });
});

describe("the sort control: the whole header cell is the button", () => {
  for (const theme of THEMES) {
    test(`ascending then descending, numbers and times first descending, aria-sort on the th only, no third state (${theme})`, async () => {
      const { page } = await open({ theme, ...DESKTOP });
      assert.deepEqual(await sortOf(page), { Started: "descending" }, "the table's default order is a sort on a named column");
      await pressCell(page, "Name");
      assert.deepEqual(await sortOf(page), { Name: "ascending" });
      await pressCell(page, "Name");
      assert.deepEqual(await sortOf(page), { Name: "descending" });
      await pressCell(page, "Name");
      assert.deepEqual(await sortOf(page), { Name: "ascending" }, "there is no cleared state");
      await pressCell(page, "Duration");
      assert.deepEqual(await sortOf(page), { Duration: "descending" }, "a number starts descending");
      await pressCell(page, "Duration");
      assert.deepEqual(await sortOf(page), { Duration: "ascending" });
      await pressCell(page, "Cost");
      assert.deepEqual(await sortOf(page), { Cost: "descending" });
      await pressCell(page, "Started");
      assert.deepEqual(await sortOf(page), { Started: "descending" }, "a time starts descending too");
      await pressCell(page, "Status");
      assert.deepEqual(await sortOf(page), { Status: "ascending" }, "text starts ascending");
      // The rows really sorted.
      const statuses = await page.locator("tbody tr td:nth-child(3)").allTextContents();
      assert.deepEqual(statuses, [...statuses].sort());
      assert.equal(await page.locator("button.basalt-sort[aria-sort], thead button[aria-sort]").count(), 0, "aria-sort belongs on the th");
    });

    test(`the whole cell takes the click: its corners, its end and its seat all sort (${theme})`, async () => {
      const { page } = await open({ theme, ...DESKTOP });
      for (const [name, where] of [["Region", (b) => ({ x: b.x + 1, y: b.y + 1 })], ["Region", (b) => ({ x: b.x + b.width - 2, y: b.y + b.height - 2 })], ["Duration", (b) => ({ x: b.x + b.width - 3, y: b.y + b.height / 2 })]]) {
        const before = await sortOf(page);
        const b = await head(page, name).boundingBox();
        const p = where(b);
        await page.mouse.click(p.x, p.y);
        assert.notDeepEqual(await sortOf(page), before, `${name} at ${JSON.stringify(p)}`);
      }
      // The button is the cell.
      const geometry = await page.evaluate(() => [...document.querySelectorAll("thead th[data-sortable]")].map((th) => { const a = th.getBoundingClientRect(); const b = th.querySelector("button").getBoundingClientRect(); return [a.left - b.left, a.top - b.top, a.right - b.right, a.bottom - b.bottom].map(Math.abs).reduce((x, y) => x + y, 0); }));
      assert.ok(geometry.every((d) => d < 0.5), `the button fills each cell: ${geometry}`);
    });

    test(`hover lifts the label to primary and shows the caret in the seat, with no wash on the cell; sorted shows the arrow; no weight change (${theme})`, async () => {
      const { page } = await open({ theme, ...DESKTOP });
      const read = (name) => head(page, name).evaluate((th) => {
        const b = th.querySelector("button");
        const label = th.querySelector(".basalt-sort-label");
        const op = (sel) => Number(getComputedStyle(th.querySelector(sel)).opacity);
        return { ink: getComputedStyle(label).color, weight: getComputedStyle(label).fontWeight, bg: getComputedStyle(b).backgroundColor, thBg: getComputedStyle(th).backgroundColor, caret: op(".basalt-sort-caret"), up: op(".basalt-sort-up"), down: op(".basalt-sort-down"), seat: th.querySelector(".basalt-sort-seat").getBoundingClientRect().width };
      });
      const probe = (token) => page.evaluate((t) => { const d = document.createElement("div"); d.style.color = `var(--basalt-${t})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, token);
      const [secondary, primary] = [await probe("text-secondary"), await probe("text-primary")];
      const rest = await read("Region");
      assert.equal(rest.ink, secondary);
      assert.equal(rest.caret, 0, "nothing at rest on a fine pointer");
      await head(page, "Region").hover();
      await page.waitForTimeout(250);
      const hover = await read("Region");
      assert.equal(hover.ink, primary, "hover lifts the ink");
      assert.equal(hover.caret, 1, "and shows the caret");
      assert.equal(hover.bg, "rgba(0, 0, 0, 0)", "no wash on the button");
      assert.equal(hover.thBg, rest.thBg, "none on the cell");
      assert.equal(hover.weight, rest.weight);
      assert.equal(hover.seat, 16);
      await page.mouse.move(2, 2);
      await pressCell(page, "Region");
      await page.mouse.move(2, 2);
      await page.waitForTimeout(250);
      const sorted = await read("Region");
      assert.equal(sorted.ink, primary);
      assert.equal(sorted.up, 1);
      assert.equal(sorted.down, 0);
      assert.equal(sorted.caret, 0, "the arrow replaces the caret");
      assert.equal(sorted.weight, rest.weight, "no weight change on the sorted header");
      await pressCell(page, "Region");
      assert.equal((await read("Region")).down, 1);
    });

    test(`keyboard focus: the flush-field -2 inset ring on the cell, the caret shows, Enter and Space sort (${theme})`, async () => {
      const { page } = await open({ theme, ...DESKTOP });
      await head(page, "Status").locator("button").focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      const ring = await head(page, "Status").evaluate((th) => {
        const b = th.querySelector("button");
        const cs = getComputedStyle(b);
        return { visible: b.matches(":focus-visible"), style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, caret: Number(getComputedStyle(th.querySelector(".basalt-sort-caret")).opacity) };
      });
      assert.equal(ring.visible, true);
      assert.equal(ring.style, "solid");
      assert.equal(ring.width, "2px");
      assert.equal(ring.offset, "-2px", "a band that is itself the button takes the inset ring");
      assert.equal(ring.caret, 1);
      await page.keyboard.press("Enter");
      assert.deepEqual(await sortOf(page), { Status: "ascending" });
      await page.keyboard.press("Space");
      assert.deepEqual(await sortOf(page), { Status: "descending" });
    });
  }

  test("touch: the caret is always there on an unsorted header, and the header band is 44px", async () => {
    const { page } = await open({ ...PHONE });
    const state = await page.evaluate(() => [...document.querySelectorAll("thead th[data-sortable]")].map((th) => ({ caret: Number(getComputedStyle(th.querySelector(".basalt-sort-caret")).opacity), sorted: th.hasAttribute("aria-sort"), h: th.getBoundingClientRect().height })));
    assert.ok(state.every((s) => s.h === 44), JSON.stringify(state));
    assert.ok(state.filter((s) => !s.sorted).every((s) => s.caret === 1), "touch has no hover to discover it with");
    const desktop = await open({ ...DESKTOP });
    assert.equal(await desktop.page.locator("thead th").first().evaluate((th) => th.getBoundingClientRect().height), 32);
  });

  test("the seat is on the start side of a numeric header, so the label's edge is the numbers' edge; the label is the header's text edge otherwise", async () => {
    const { page } = await open({ ...DESKTOP });
    const edges = await page.evaluate(() => {
      const table = document.querySelector(".basalt-table");
      const col = (n) => {
        const th = table.querySelectorAll("thead th")[n];
        const td = table.querySelector(`tbody tr:first-child td:nth-child(${n + 1})`);
        const edge = (node, side) => { const r = document.createRange(); r.selectNodeContents(node); const b = r.getBoundingClientRect(); return b[side]; };
        const label = th.querySelector(".basalt-sort-label");
        const seat = th.querySelector(".basalt-sort-seat").getBoundingClientRect();
        return { labelL: edge(label, "left"), labelR: edge(label, "right"), cellL: edge(td, "left"), cellR: edge(td, "right"), seatR: seat.right, seatL: seat.left, labelBox: label.getBoundingClientRect() };
      };
      return { cost: col(6), region: col(3) };
    });
    assert.ok(Math.abs(edges.cost.labelR - edges.cost.cellR) < 0.6, `Cost: label ${edges.cost.labelR} numbers ${edges.cost.cellR}`);
    assert.ok(edges.cost.seatR <= edges.cost.labelBox.left + 0.1, "the seat is before the label on a numeric column");
    assert.ok(Math.abs(edges.region.labelL - edges.region.cellL) < 0.6, "the label starts where the cells' text starts");
  });

  test("a truncating header ends in an ellipsis, not a hard clip", async () => {
    const { page } = await open({ ...DESKTOP }, render(`<B.TableContainer><B.Table columns={[{ width: 80 }, {}]}><B.TableHeader><B.TableRow><B.TableHead sort="ascending" onSortChange={() => {}}>A very long header</B.TableHead><B.TableHead>Other</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell>A name that is much longer than its column</B.TableCell><B.TableCell>x</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>`));
    const s = await page.evaluate(() => [".basalt-sort-label", "tbody td"].map((sel) => { const el = document.querySelector(sel); const cs = getComputedStyle(el); return { clipped: el.scrollWidth > el.clientWidth, overflow: cs.overflowX, ellipsis: cs.textOverflow }; }));
    for (const x of s) { assert.equal(x.clipped, true); assert.equal(x.overflow, "hidden"); assert.equal(x.ellipsis, "ellipsis"); }
  });

  test("a link in a cell truncates with an ellipsis too (its box is the one that overflows)", async () => {
    const { page } = await open({ ...DESKTOP });
    const link = await page.evaluate(() => { const a = document.querySelector("tbody td a"); const cs = getComputedStyle(a); return { display: cs.display, ellipsis: cs.textOverflow, overflow: cs.overflowX }; });
    assert.deepEqual(link, { display: "block", ellipsis: "ellipsis", overflow: "hidden" });
  });
});

describe("the empty row", () => {
  test("one row spans every column under the unchanged header, with a sentence and a Clear action; it is outside the sticky rules", async () => {
    const { page } = await open({ ...PHONE });
    await page.evaluate(() => window.runs.setQuery("zzz")); await frames(page);
    const e = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("tbody tr")];
      const td = rows[0].querySelector("td");
      const table = document.querySelector(".basalt-table");
      return { rows: rows.length, span: td.colSpan, width: td.getBoundingClientRect().width, tableW: table.getBoundingClientRect().width, position: getComputedStyle(td).position, text: td.textContent, button: !!td.querySelector("button"), headRows: document.querySelectorAll("thead th").length };
    });
    assert.equal(e.rows, 1);
    assert.equal(e.span, 7);
    assert.ok(Math.abs(e.width - e.tableW) < 1.5);
    assert.equal(e.position, "static", "the spanning cell is not pinned");
    assert.match(e.text, /No runs match these filters\.\s*Clear filters/);
    assert.equal(e.headRows, 7);
    await page.getByRole("button", { name: "Clear filters" }).tap();
    assert.equal(await page.locator("tbody tr[data-empty]").count(), 0);
  });
});

describe("pinned columns at 390", () => {
  for (const theme of THEMES) {
    test(`the select column and the name stick; pinned cells are opaque at rest, on hover and selected; the divider shows only while scrolled (${theme})`, async () => {
      const { page } = await open({ theme, ...PHONE });
      const frame = page.locator(".basalt-table-container");
      const state = () => page.evaluate(() => {
        const f = document.querySelector(".basalt-table-container");
        const fb = f.getBoundingClientRect();
        const cells = [...document.querySelectorAll("tbody tr:nth-child(2) > *")].slice(0, 3);
        return {
          scrolled: f.hasAttribute("data-scrolled"),
          cells: cells.map((c) => { const r = c.getBoundingClientRect(); const cs = getComputedStyle(c); const after = getComputedStyle(c, "::after"); const alpha = (v) => (/\/\s*[\d.]+%?\s*\)/.test(v) || /^rgba\(.*,\s*0?\.\d+\)$/.test(v) ? 0.5 : 1); return { left: +(r.left - fb.left).toFixed(1), position: cs.position, alpha: alpha(cs.backgroundColor), hasAfter: after.content !== "none" && after.content !== "normal", divider: after.content !== "none" && after.content !== "normal" ? Number(after.opacity) : 0 }; }),
        };
      });
      const rest = await state();
      assert.equal(rest.scrolled, false);
      assert.ok(rest.cells.slice(0, 2).every((c) => c.position === "sticky" && c.alpha === 1), JSON.stringify(rest.cells));
      assert.equal(rest.cells[2].position, "static");
      assert.ok(rest.cells.slice(0, 2).every((c) => c.divider === 0 || !c.hasAfter), "no divider before it is scrolled");
      await frame.evaluate((f) => { f.scrollLeft = 200; });
      await page.waitForTimeout(100);
      const scrolled = await state();
      assert.equal(scrolled.scrolled, true);
      // Pinned: the select cell stays at the start edge and the name right after it.
      assert.equal(scrolled.cells[0].left, rest.cells[0].left);
      assert.equal(scrolled.cells[1].left, rest.cells[1].left);
      assert.equal(scrolled.cells[2].position, "static", "the third column scrolls away");
      // The divider is on the last pinned cell only.
      assert.equal(scrolled.cells[1].divider, 1);
      assert.equal(scrolled.cells[0].divider, 0);
      await frame.evaluate((f) => { f.scrollLeft = 0; });
      await page.waitForTimeout(100);
      assert.equal((await state()).cells[1].divider, 0, "and goes with the scroll");
      // Selected: opaque, with the wash over the panel's fill as one cell background.
      await frame.evaluate((f) => { f.scrollLeft = 200; });
      await page.getByRole("checkbox", { name: /^Select edge-router-101$/ }).tap();
      const sel = await page.evaluate(() => { const td = document.querySelector("tbody tr[data-selected] > td:nth-child(2)"); const cs = getComputedStyle(td); return { alpha: cs.backgroundColor, image: cs.backgroundImage }; });
      assert.ok(opaque(sel.alpha), "an opaque fill");
      assert.match(sel.image, /gradient/, "with the selected wash over it, as one cell background");
    });

    test(`under a pointer, a hovered pinned cell stays opaque and wears the row's wash (${theme})`, async () => {
      const { page } = await open({ theme, viewport: { width: 700, height: 800 } });
      await page.locator(".basalt-table-container").evaluate((f) => { f.scrollLeft = 100; });
      await page.locator("tbody tr:nth-child(2)").hover({ position: { x: 300, y: 10 } });
      const cell = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector("tbody tr:nth-child(2) > td:nth-child(2)")); return { color: cs.backgroundColor, image: cs.backgroundImage }; });
      assert.ok(opaque(cell.color), "opaque under the pointer");
      assert.match(cell.image, /gradient/);
    });
  }

  test("a focused header is never covered by the pinned columns", async () => {
    const { page } = await open({ ...DESKTOP, viewport: { width: 390, height: 844 }, hasTouch: false });
    const frame = page.locator(".basalt-table-container");
    const covered = async (name) => {
      return page.evaluate((n) => {
        const th = [...document.querySelectorAll("thead th")].find((t) => t.textContent.trim() === n);
        const b = th.querySelector("button").getBoundingClientRect();
        const f = document.querySelector(".basalt-table-container").getBoundingClientRect();
        const pinnedRight = document.querySelectorAll("thead th")[1].getBoundingClientRect().right;
        const pinned = n === "Name";
        return { left: b.left, pinnedRight, right: b.right, frameRight: f.right, ok: pinned || (b.left >= pinnedRight - 0.5 && b.right <= f.right + 0.5) };
      }, name);
    };
    for (const name of ["Cost", "Started", "Region", "Duration", "Status", "Name"]) {
      await frame.evaluate((f) => { f.scrollLeft = f.scrollLeft; });
      await head(page, name).locator("button").focus();
      await page.waitForTimeout(80);
      const c = await covered(name);
      assert.ok(c.ok, `${name} is under the pinned columns: ${JSON.stringify(c)}`);
    }
    // From a scrolled-away position, the other direction.
    await frame.evaluate((f) => { f.scrollLeft = f.scrollWidth; });
    await head(page, "Status").locator("button").focus();
    await page.waitForTimeout(80);
    assert.ok((await covered("Status")).ok);
    // And by keyboard, Tab by Tab.
    await frame.evaluate((f) => { f.scrollLeft = 0; });
    await head(page, "Name").locator("button").focus();
    for (const name of ["Status", "Region", "Duration", "Started", "Cost"]) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(80);
      assert.ok((await covered(name)).ok, `Tab to ${name}: ${JSON.stringify(await covered(name))}`);
    }
  });

  test("forced colours: pinned cells are Canvas, the divider is a system colour, and the sort control keeps its shape", async () => {
    for (const scheme of THEMES) {
      const { page } = await open({ theme: scheme, colorScheme: scheme, forcedColors: "active", ...PHONE });
      await page.locator(".basalt-table-container").evaluate((f) => { f.scrollLeft = 200; });
      await page.waitForTimeout(100);
      const r = await page.evaluate(() => {
        const probe = (c) => { const d = document.createElement("div"); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; };
        const td = document.querySelector("tbody tr > td:nth-child(2)");
        const after = getComputedStyle(td, "::after");
        return { bg: getComputedStyle(td).backgroundColor, image: getComputedStyle(td).backgroundImage, canvas: probe("Canvas"), divider: after.backgroundColor, text: probe("CanvasText"), dividerOpacity: after.opacity };
      });
      assert.equal(r.bg, r.canvas);
      assert.equal(r.image, "none");
      assert.equal(r.divider, r.text);
      assert.equal(r.dividerOpacity, "1");
    }
  });
});

describe("the multi-select: chips", () => {
  const group = (page) => page.getByRole("group", { name: "Status" });
  for (const theme of THEMES) {
    test(`off is a tertiary plus, on is the check in the same seat; the swap is a 100ms crossfade and the chip never moves (${theme})`, async () => {
      const { page } = await open({ theme, ...DESKTOP });
      const chip = page.getByRole("checkbox", { name: "Failed" });
      const read = () => chip.evaluate((el) => {
        const op = (s) => Number(getComputedStyle(el.querySelector(s)).opacity);
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { plus: op(".basalt-chip-plus"), check: op(".basalt-chip-check"), w: r.width, h: r.height, x: r.x, radius: cs.borderTopLeftRadius, font: cs.fontWeight, seat: el.querySelector(".basalt-chip-seat").getBoundingClientRect().width, transition: getComputedStyle(el.querySelector(".basalt-chip-seat > svg")).transitionDuration, checked: el.getAttribute("aria-checked"), seatInk: getComputedStyle(el.querySelector(".basalt-chip-seat")).color };
      });
      const off = await read();
      assert.deepEqual([off.plus, off.check, off.checked], [1, 0, "false"]);
      assert.equal(off.h, 32);
      assert.equal(off.radius, "6px");
      assert.equal(off.seat, 16);
      assert.equal(off.font, "500");
      assert.equal(off.transition, "0.1s", "duration-fast");
      await chip.click();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(200);
      const on = await read();
      assert.deepEqual([on.plus, on.check, on.checked], [0, 1, "true"], "the glyph's shape changes: never colour alone");
      assert.deepEqual([on.w, on.h, on.x], [off.w, off.h, off.x], "turning it on moves nothing");
      assert.notEqual(on.seatInk, off.seatInk);
    });
  }

  test("geometry: 32 on a fine pointer; on touch 36 (radius 8) inside a 44px target", async () => {
    const { page } = await open({ ...PHONE });
    const g = await page.getByRole("checkbox", { name: "Failed" }).evaluate((el) => { const cs = getComputedStyle(el); const before = getComputedStyle(el, "::before"); return { h: el.getBoundingClientRect().height, radius: cs.borderTopLeftRadius, target: parseFloat(before.height) || undefined, top: before.top, font: cs.fontSize, content: before.content }; });
    assert.equal(g.h, 36);
    assert.equal(g.radius, "8px");
    assert.equal(g.font, "14px");
    assert.equal(g.content, '""');
    // The 44px hit area: a tap 3px above the 36px chip still toggles it.
    const box = await page.getByRole("checkbox", { name: "Failed" }).boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y - 3);
    assert.equal(await page.getByRole("checkbox", { name: "Failed" }).getAttribute("aria-checked"), "true");
    const wide = await open({ ...DESKTOP });
    assert.equal(await wide.page.getByRole("checkbox", { name: "Failed" }).evaluate((el) => el.getBoundingClientRect().height), 32);
  });

  test("a chip is a checkbox in a labelled group whose description is the count (not live); Tab reaches each and Space toggles it", async () => {
    const { page } = await open({ ...DESKTOP });
    const g = group(page);
    assert.equal(await g.count(), 1);
    const names = await g.getByRole("checkbox").allTextContents();
    assert.deepEqual(names, ["Succeeded", "Failed", "Running", "Queued"]);
    const info = await g.evaluate((el) => ({ describedby: document.getElementById(el.getAttribute("aria-describedby")).textContent, live: !!el.closest("[aria-live]") || !!document.getElementById(el.getAttribute("aria-describedby")).closest("[aria-live]"), labelledby: document.getElementById(el.getAttribute("aria-labelledby")).textContent }));
    assert.deepEqual(info, { describedby: "Any", live: false, labelledby: "Status" });
    await g.getByRole("checkbox").first().focus();
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
    }
    assert.equal(await g.getByRole("checkbox", { checked: true }).count(), 3);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Queued", "Tab reaches each chip in turn");
    assert.equal(await g.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby")).textContent), "3 of 4");
  });

  test("the form depends on the count and the toolbar, never the viewport: six values are chips, seven or a toolbar are a trigger and a checklist", async () => {
    const forms = async (options) => {
      const jsx = (n, toolbar) => `<B.MultiSelect label="Pick" ${toolbar ? "toolbar" : ""} options={Array.from({ length: ${n} }, (_, i) => ({ value: "v" + i, label: "Value " + i }))} />`;
      const out = {};
      for (const [name, n, toolbar] of [["six", 6, false], ["seven", 7, false], ["toolbar", 3, true]]) {
        const { page } = await open(options, render(jsx(n, toolbar)));
        out[name] = { chips: await page.locator(".basalt-chip").count(), trigger: await page.locator(".basalt-filter-trigger").count() };
        await page.close();
      }
      return out;
    };
    const expected = { six: { chips: 6, trigger: 0 }, seven: { chips: 0, trigger: 1 }, toolbar: { chips: 0, trigger: 1 } };
    assert.deepEqual(await forms(DESKTOP), expected);
    assert.deepEqual(await forms(PHONE), expected, "the same on a phone");
  });

  test("Clear is always mounted, in place, with a constant label: at zero it is aria-disabled, not disabled, and keyboard focus stays on it", async () => {
    const { page } = await open({ ...DESKTOP });
    const clear = page.locator("#toolbar .basalt-filter").first().getByRole("button", { name: "Clear" });
    const read = () => clear.evaluate((el) => { const r = el.getBoundingClientRect(); return { text: el.textContent, ariaDisabled: el.getAttribute("aria-disabled"), disabled: el.disabled, x: r.x, y: r.y, w: r.width, focused: document.activeElement === el, visible: getComputedStyle(el).visibility }; });
    const zero = await read();
    assert.equal(zero.text, "Clear");
    assert.equal(zero.ariaDisabled, "true");
    assert.equal(zero.disabled, false, "not disabled: a disabled button drops keyboard focus");
    assert.equal(zero.visible, "visible");
    // It can hold focus at zero, and activating it does nothing.
    await clear.focus();
    assert.equal((await read()).focused, true);
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    assert.equal((await read()).focused, true);
    // With a chip on it is live, in the same place, with the same label, and clearing keeps focus on it.
    await page.getByRole("checkbox", { name: "Failed" }).click();
    const live = await read();
    assert.equal(live.ariaDisabled, null);
    assert.deepEqual([live.x, live.y, live.w, live.text], [zero.x, zero.y, zero.w, zero.text], "it never moves or changes its label");
    await clear.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.getByRole("checkbox", { checked: true }).count(), 0);
    const after = await read();
    assert.equal(after.focused, true, "clearing never moves focus");
    assert.deepEqual([after.x, after.y, after.w, after.ariaDisabled], [zero.x, zero.y, zero.w, "true"]);
  });

  test("the result line is one polite, atomic announcement, spoken once after the toggling settles; the visible copy is not live", async () => {
    const { page } = await open({ ...DESKTOP });
    const live = page.locator("[role=status]");
    assert.equal(await live.getAttribute("aria-live"), "polite");
    assert.equal(await live.getAttribute("aria-atomic"), "true");
    assert.equal(await live.evaluate((el) => !!el.closest(".basalt-filter")), false, "outside the filter");
    assert.equal(await page.locator("[role=status]").count(), 1, "one live region");
    await page.evaluate(() => { window.__says = []; new MutationObserver(() => window.__says.push(document.querySelector("[role=status]").textContent)).observe(document.querySelector("[role=status]"), { childList: true, characterData: true, subtree: true }); });
    const chips = page.getByRole("checkbox", { name: /^(Succeeded|Failed|Running)$/ });
    for (let i = 0; i < 3; i++) await chips.nth(i).click();
    const visible = await page.locator(".basalt-filter-result > span[aria-hidden]").textContent();
    assert.match(visible, /^Showing 18 of 24 runs$/, "the visible text is current at once");
    assert.equal(await live.textContent(), "Showing 24 of 24 runs", "the spoken copy waits");
    await page.waitForTimeout(700);
    assert.equal(await live.textContent(), "Showing 18 of 24 runs");
    assert.deepEqual(await page.evaluate(() => window.__says), ["Showing 18 of 24 runs"], "one announcement for three toggles");
  });

  test("forced colours: an on chip is Highlight with HighlightText on every part, its check shows, hover keeps it, and off keeps ButtonText", async () => {
    for (const scheme of THEMES) {
      const { page } = await open({ theme: scheme, colorScheme: scheme, forcedColors: "active", ...DESKTOP });
      const chip = page.getByRole("checkbox", { name: "Failed" });
      await chip.click();
      await page.getByRole("checkbox", { name: "Running" }).hover();
      await chip.hover();
      await page.waitForTimeout(250);
      const r = await chip.evaluate((el) => {
        const probe = (c) => { const d = document.createElement("div"); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; };
        const label = getComputedStyle(el.querySelector(".basalt-chip-label")).color;
        const check = el.querySelector(".basalt-chip-check");
        const off = document.querySelector('[role=checkbox][aria-checked=false].basalt-chip');
        return { bg: getComputedStyle(el).backgroundColor, highlight: probe("Highlight"), highlightText: probe("HighlightText"), label, checkInk: getComputedStyle(check).color, checkOpacity: getComputedStyle(check).opacity, border: getComputedStyle(el).borderTopColor, borderWidth: getComputedStyle(el).borderTopWidth, offBorder: getComputedStyle(off).borderTopColor, buttonText: probe("ButtonText"), offLabel: getComputedStyle(off.querySelector(".basalt-chip-label")).color, plus: getComputedStyle(off.querySelector(".basalt-chip-plus")).opacity };
      });
      assert.equal(r.bg, r.highlight);
      assert.equal(r.label, r.highlightText, "a chip's label never keeps its own ink on Highlight");
      assert.equal(r.checkInk, r.highlightText);
      assert.equal(r.checkOpacity, "1");
      assert.equal(r.borderWidth, "1px");
      assert.equal(r.offBorder, r.buttonText);
      assert.equal(r.offLabel, r.buttonText);
      assert.equal(r.plus, "1");
      await page.close();
    }
  });

  test("reduced motion: the plus and the check change at once", async () => {
    const { page } = await open({ reducedMotion: "reduce", ...DESKTOP });
    const d = await page.getByRole("checkbox", { name: "Failed" }).evaluate((el) => getComputedStyle(el.querySelector(".basalt-chip-seat > svg")).transitionDuration);
    assert.equal(d, "0s");
  });

  test("hover brightens the label and the line a step; a press is a colour step with no scale", async () => {
    const { page } = await open({ ...DESKTOP });
    const chip = page.getByRole("checkbox", { name: "Failed" });
    const s = () => chip.evaluate((el) => { const cs = getComputedStyle(el); return { ink: cs.color, border: cs.borderTopColor, bg: cs.backgroundColor, transform: cs.transform }; });
    const rest = await s();
    await chip.hover();
    await page.waitForTimeout(100);
    const hover = await s();
    assert.notEqual(hover.ink, rest.ink);
    assert.notEqual(hover.border, rest.border);
    await page.mouse.down();
    await page.waitForTimeout(250);
    const pressed = await s();
    await page.mouse.up();
    assert.notEqual(pressed.bg, hover.bg, "a press is a colour step");
    assert.equal(pressed.transform, "none", "no scale on a chip");
  });
});

describe("the multi-select: the checklist", () => {
  test("a trigger opens a non-modal popup holding the same checkbox group in popup rows; Space toggles, arrows move, Esc returns focus", async () => {
    const { page } = await open({ ...DESKTOP });
    const trigger = page.locator(".basalt-filter-trigger");
    assert.equal(await trigger.evaluate((el) => el.getBoundingClientRect().height), 32);
    await trigger.click();
    const popup = page.locator(".basalt-filter-popup");
    await popup.waitFor();
    assert.equal(await popup.evaluate((el) => el.matches(".basalt-menu[data-level='1']")), true, "the opener plus one, from the page: level 1");
    const rows = popup.getByRole("checkbox");
    assert.equal(await rows.count(), 8);
    assert.equal(await popup.evaluate((el) => getComputedStyle(el).borderTopWidth), "1px", "a popup keeps the rim");
    await rows.first().focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    assert.equal(await rows.nth(0).getAttribute("aria-checked"), "true");
    assert.equal(await rows.nth(1).getAttribute("aria-checked"), "true");
    assert.match(await trigger.textContent(), /us-east \+1/);
    assert.equal(await page.locator("tbody tr").count() <= 10, true);
    assert.match(await page.locator(".basalt-filter-result > span[aria-hidden]").textContent(), /^Showing \d+ of 24 runs$/);
    // The lit row is the plate plus the lift.
    await rows.nth(2).hover();
    assert.equal(await rows.nth(2).getAttribute("data-highlighted"), "");
    await page.keyboard.press("Escape");
    await popup.waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-filter-trigger")), true);
  });
});

describe("shared: axe, in both themes", () => {
  for (const theme of THEMES) {
    for (const [name, options] of [["1440", DESKTOP], ["390 on touch", PHONE]]) {
      test(`the runs table, the chips and an open checklist have no axe violations at ${name} (${theme})`, async () => {
        const { page } = await open({ theme, ...options });
        await page.getByRole("checkbox", { name: "Failed" }).click();
        await page.locator(".basalt-filter-trigger").click();
        await page.locator(".basalt-filter-popup").waitFor();
        await settle(page);
        await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE);
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`), []);
      });
    }
  }

  test("the empty table and the sorted table pass axe too", async () => {
    const { page } = await open({ ...DESKTOP });
    await pressCell(page, "Cost");
    await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
    await page.addScriptTag({ content: axeSource });
    assert.deepEqual((await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE)).violations.map((v) => v.id), []);
    await page.evaluate(() => window.runs.setQuery("zzz")); await frames(page);
    assert.deepEqual((await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE)).violations.map((v) => v.id), []);
  });
});
