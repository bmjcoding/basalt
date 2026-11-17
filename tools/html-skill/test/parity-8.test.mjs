// The eighth parity PR (step 6 of batch 7, DECISIONS 108: tables and filters), in a browser: the still table (a fixed layout from a colgroup, the whole header cell as the sort button
// with its reserved seat, ascending then descending, aria-sort, the pinned name column at 390 with its divider, the empty row, the scroll hint, row headers and "Not observed",
// compact density) and the multi-select filter (chips with no track up to six values, a trigger and a checklist from seven or in a toolbar, Clear held mounted and aria-disabled
// after a count that reserves its widest form, the search band from ten values inside the 360px cap, the one debounced polite result line), held to what React gives them.
// parity.test.mjs compares each part's computed styles with React's; this file pins behaviour, above all the owner's rule: header positions, column widths and alignment never
// move (measured to the hundredth of a pixel). Both themes, 390 wide, touch, reduced motion, forced colours, axe. Anything timed runs on the shared animation clock.
// The data is synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { chromium } from "playwright";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, freezeAnimations, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let classic;
let reactBrowser;
before(async () => {
  browser = await launch();
  reactBrowser = await launchReact();
  // A classic scrollbar on every machine (a styled scrollbar is classic in Chromium whatever the system says), so the page's gutter is measured against a real bar.
  classic = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
});
after(async () => { await browser?.close(); await classic?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page, options = AXE) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), options);
};

// ---- A synthetic runs page: a still table of 24 rows, two filters and the result line ----
const STATUS = [["passed", "Passed"], ["failed", "Failed"], ["running", "Running"], ["queued", "Queued"], ["cancelled", "Cancelled"]];
const OWNERS = ["Alder", "Birch", "Cedar", "Dogwood", "Elm", "Fir", "Gingko", "Hazel", "Ironwood", "Juniper", "Katsura", "Larch"];
const labels = (list, checked = []) => list.map(([v, l]) => `<label><input type="checkbox" value="${v}"${checked.includes(v) ? " checked" : ""}> ${l}</label>`).join("");
const rowOf = (i, { long = false } = {}) => {
  const status = STATUS[(i * 7 + (i >> 2)) % 4];
  const owner = OWNERS[i % OWNERS.length];
  const seconds = 30 + ((i * 137) % 870);
  const name = long ? `build-${String(141 - i).padStart(4, "0")}-with-a-very-long-descriptive-name-that-must-be-cut-with-an-ellipsis-and-never-widen-its-column` : `build-${String(141 - i).padStart(4, "0")}`;
  const time = i === 5 ? `<td data-numeric data-not-observed>Not observed</td>` : `<td data-numeric data-value="${seconds}">${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s</td>`;
  return `<tr><th scope="row">${name}</th><td data-value="${status[0]}">${status[1]}</td>${time}<td data-value="${owner.toLowerCase()}">${long ? owner.repeat(8) : owner}</td><td data-value="2026-11-${String(9 - (i >> 3)).padStart(2, "0")}T${String(10 + (i % 9)).padStart(2, "0")}:00">Nov ${9 - (i >> 3)}, ${10 + (i % 9)}:00</td></tr>`;
};
const rows = (n, o) => Array.from({ length: n }, (_, i) => rowOf(i, o)).join("");
const COLS = `<colgroup><col style="width: 160px"><col style="width: 140px"><col style="width: 120px"><col style="width: 150px"><col></colgroup>`;
const HEAD = `<thead><tr><th data-sortable>Name</th><th data-sortable>Status</th><th data-sortable data-numeric>Duration</th><th data-sortable>Owner</th><th data-sortable data-first-sort="descending">Started</th></tr></thead>`;
const EMPTY = `<tr data-empty hidden><td colspan="5"><div class="table-empty"><span>No runs match.</span><button class="btn" type="button" id="clear-all">Clear filters</button></div></td></tr>`;
const PAGE = `<main class="page stack">
  <h1>Runs</h1>
  <div class="filter" id="f-status" data-label="Status" data-for="runs" data-column="2">${labels(STATUS)}</div>
  <div class="filter" id="f-owner" data-label="Owner" data-for="runs" data-column="4">${labels(OWNERS.slice(0, 8).map((n) => [n.toLowerCase(), n]))}</div>
  <p class="filter-result" id="result" data-for="runs" data-noun="runs">Showing 24 of 24 runs</p>
  <div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0" id="frame"><table id="runs" data-fixed style="min-width: 700px">${COLS}${HEAD}<tbody>${rows(24)}${EMPTY}</tbody></table></div>
  <p class="table-hint" hidden></p>
</main>`;
const FILTER = (n, extra = "") => `<main class="page"><div class="filter" id="f" data-label="Owner" ${extra}>${labels(OWNERS.slice(0, n).map((o) => [o.toLowerCase(), o]))}</div></main>`;
const html = (body = PAGE, head = "") => compose(`<title>Runs</title>${head}${body}`, { fonts: false }).html;
async function open({ scheme = "dark", width = 1440, touch = false, reducedMotion = "no-preference", forced = false, body, head, browserType = browser } = {}) {
  const opened = await openHtml(browserType, html(body, head), { scheme, width, touch, reducedMotion });
  if (forced) { await opened.page.emulateMedia({ forcedColors: "active" }); await settled(opened.page); }
  return opened;
}
const settled = (page) => page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
const css = (locator, ...props) => locator.evaluate((el, names) => { const s = getComputedStyle(el); return Object.fromEntries(names.map((n) => [n, s[n]])); }, props);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
/** A system colour (or any value) as the browser resolves it for a property, through a probe. */
const resolve = (page, value, prop = "color") => page.evaluate(([v, p]) => { const probe = document.createElement("div"); probe.style.setProperty(p, v); document.body.append(probe); const out = getComputedStyle(probe)[p === "color" ? "color" : "backgroundColor"]; probe.remove(); return out; }, [value, prop]);
/** Opens a filter's checklist and waits for the popup to be up and settled, with focus inside it (the popover module moves it on the toggle event, a task later). */
const openList = async (page, selector = "#f") => {
  await page.locator(`${selector} .filter-trigger`).click();
  await page.locator(`${selector} .filter-popup`).waitFor();
  await page.waitForFunction((sel) => document.activeElement && document.activeElement.closest(`${sel} .filter-popup`), selector);
  await settled(page);
};
/** A colour as RGB, through a canvas, so two spellings of one colour (rgb and oklab) compare as what they are. */
const rgb = (page, colour) => page.evaluate((c) => { const g = document.createElement("canvas").getContext("2d"); g.fillStyle = "#000"; g.fillStyle = c; g.fillRect(0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data]; }, colour);
const sameColour = async (page, a, b, message) => { const [x, y] = [await rgb(page, a), await rgb(page, b)]; assert.ok(x.every((v, i) => Math.abs(v - y[i]) <= 1), `${message}: ${a} is ${x}, ${b} is ${y}`); };
const names = (page) => page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([data-empty]):not([hidden]) th")].map((th) => th.textContent));
const hidden = (page) => page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([data-empty])")].filter((r) => r.hidden).length);

/** Where every header sits and where its words start and end, measured to the hundredth of a pixel, with the table's own box. */
const geometry = (page) => page.evaluate(() => {
  const r2 = (v) => Math.round(v * 100) / 100;
  const scroller = document.getElementById("frame");
  const frame = scroller.getBoundingClientRect();
  const into = (v) => r2(v - frame.left + scroller.scrollLeft);
  const ths = [...document.querySelectorAll("#runs thead th")];
  const cols = [...document.querySelectorAll("#runs colgroup col")].map((c) => r2(c.getBoundingClientRect().width));
  const heads = ths.map((th) => {
    const label = th.querySelector(".sort-label") || th;
    const range = document.createRange();
    range.selectNodeContents(label);
    const words = range.getBoundingClientRect();
    const b = th.getBoundingClientRect();
    const seat = th.querySelector(".sort-seat")?.getBoundingClientRect();
    return { left: into(b.left), width: r2(b.width), top: r2(b.top - frame.top), height: r2(b.height), wordsLeft: into(words.left), wordsRight: into(words.right), align: getComputedStyle(th).textAlign, seat: seat ? [into(seat.left), r2(seat.width)] : null };
  });
  const table = document.getElementById("runs").getBoundingClientRect();
  return { heads, cols, table: [into(table.left), r2(table.width)] };
});

describe("the still table: header positions, column widths and alignment never move (the owner's rule), measured", () => {
  for (const [width, touch] of [[1440, false], [390, true]]) {
    for (const theme of THEMES) {
      test(`through a sort in every column, a filter to one row and to none, a page of long text and a load, at ${width} (${theme})`, async () => {
        const { page, context, errors } = await open({ scheme: theme, width, touch });
        const at = async (label) => ({ label, ...(await geometry(page)) });
        const start = await at("start");
        assert.equal(start.heads.length, 5);
        for (const h of start.heads) assert.equal(h.seat[1], 16, "every sortable header reserves the 16px seat");
        const same = async (label) => {
          const now = await at(label);
          assert.deepEqual({ heads: now.heads, cols: now.cols, table: now.table }, { heads: start.heads, cols: start.cols, table: start.table }, `${label}: a header, a column or the table moved`);
        };
        // Sorting: every column, both ways; the sorted arrow arrives in the seat.
        for (const [i, name] of ["Name", "Status", "Duration", "Owner", "Started"].entries()) {
          const button = page.locator("#runs thead th").nth(i).locator(".sort");
          await button.click();
          await same(`${name} sorted first`);
          await button.click();
          await same(`${name} sorted again`);
        }
        // Hover and keyboard focus, which show the caret.
        if (!touch) {
          await page.locator("#runs thead th").nth(3).hover();
          await same("a header hovered");
        }
        await page.locator("#runs thead th").nth(0).locator(".sort").focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        await same("a header focused");
        // A filter to a few rows, to one, and to none (the empty row spans the table), then back.
        const chip = (value) => page.locator(`#f-status input[value="${value}"]`);
        await chip("failed").evaluate((el) => el.click());
        await same("filtered to a status");
        await chip("failed").evaluate((el) => el.click());
        await chip("cancelled").evaluate((el) => el.click());
        assert.equal(await page.locator("#runs tbody tr[data-empty]").isVisible(), true, "no run is cancelled, so the empty row shows");
        assert.deepEqual(await names(page), []);
        await same("filtered to none");
        const emptyBox = await box(page.locator("#runs tr[data-empty] > td"));
        const tableBox = await box(page.locator("#runs"));
        assert.ok(Math.abs(emptyBox.width - tableBox.width) < 0.5, "the empty cell spans every column");
        await chip("cancelled").evaluate((el) => el.click());
        await page.locator("#f-owner input[value=alder]").evaluate((el) => el.click());
        await page.locator("#f-status input[value=passed]").evaluate((el) => el.click());
        assert.ok((await names(page)).length <= 2, "two filters together narrow to a row or two");
        await same("filtered to one or two rows");
        await page.locator("#f-owner .filter-clear, #f-status .filter-clear").first().evaluate((el) => el.click());
        // A page of very long text (the cells cut with an ellipsis and never widen their column), and a load (the rows replaced under a busy table).
        await page.evaluate((body) => { document.querySelector("#runs tbody").innerHTML = body; window.Basalt.refreshFilter("runs"); }, rows(10, { long: true }) + EMPTY);
        await same("a page of long text");
        const cut = await page.evaluate(() => { const c = document.querySelector("#runs tbody th"); const s = getComputedStyle(c); return [s.textOverflow, s.whiteSpace, s.overflowX, c.scrollWidth > c.clientWidth]; });
        assert.deepEqual(cut, ["ellipsis", "nowrap", "hidden", true], "a cell truncates with an ellipsis, never a hard clip");
        await page.evaluate((body) => { const t = document.getElementById("runs"); t.setAttribute("aria-busy", "true"); t.querySelector("tbody").innerHTML = body; }, `<tr><td colspan="5">Loading…</td></tr>`);
        await same("loading");
        await page.evaluate((body) => { const t = document.getElementById("runs"); t.removeAttribute("aria-busy"); t.querySelector("tbody").innerHTML = body; window.Basalt.refreshFilter("runs"); }, rows(24) + EMPTY);
        await same("loaded again");
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  }

  test("a page with a still table sets scrollbar-gutter: stable, so a filter that shortens it cannot widen the remainder column by a classic scrollbar's width", async () => {
    // The page's table follows the window's width (the .page column is capped, which would hide the bar's width).
    const wide = PAGE.replace('<main class="page stack">', '<main style="padding: 16px">');
    const run = async (extra) => {
      const { page, context } = await open({ browserType: classic, head: extra, body: wide, width: 1440 });
      await page.setViewportSize({ width: 1440, height: 520 });
      const bar = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
      const before = await geometry(page);
      // Narrow to no run: the page is then shorter than the window and a classic scrollbar goes.
      await page.locator("#f-status input[value=cancelled]").evaluate((el) => el.click());
      const empty = await geometry(page);
      const gutter = await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter);
      await context.close();
      return { before, empty, gutter, bar };
    };
    const kept = await run("");
    assert.match(kept.gutter, /stable/, "the page sets scrollbar-gutter: stable");
    assert.deepEqual(kept.empty, kept.before, "the remainder column and every header held still as the page shortened");
    const lost = await run("<style>:root { scrollbar-gutter: auto !important; }</style>");
    // Only a classic scrollbar can show the defect (a platform that draws overlay scrollbars, macOS with a trackpad, has no bar to remove): where this machine has
    // one, the control shows the test can fail; where it does not, the rule itself is what is pinned, as the React suite does.
    if (lost.bar > 0) assert.notDeepEqual(lost.empty.cols, lost.before.cols, "the control: without the gutter the remainder column widens when the bar goes");
    else console.log("scrollbar-gutter: this platform draws overlay scrollbars, so the unreserved case cannot be shown here");
  });
});

describe("the sort control: the whole header cell is the button, ascending then descending, aria-sort", () => {
  for (const theme of THEMES) {
    test(`the cycle, aria-sort on the th, numbers and times first descending, no cleared state (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      const th = (i) => page.locator("#runs thead th").nth(i);
      const sorts = () => page.evaluate(() => [...document.querySelectorAll("#runs thead th")].map((t) => t.getAttribute("aria-sort")));
      assert.deepEqual(await sorts(), [null, null, null, null, null], "nothing is sorted until a press");
      await th(0).locator(".sort").click();
      assert.deepEqual(await sorts(), ["ascending", null, null, null, null]);
      assert.deepEqual((await names(page)).slice(0, 3), ["build-0118", "build-0119", "build-0120"], "ascending by the words");
      await th(0).locator(".sort").click();
      assert.deepEqual(await sorts(), ["descending", null, null, null, null]);
      assert.equal((await names(page))[0], "build-0141");
      await th(0).locator(".sort").click();
      assert.deepEqual(await sorts(), ["ascending", null, null, null, null], "after descending comes ascending: there is no third, cleared state");
      // A numeric column starts descending; one press elsewhere moves aria-sort to that column alone.
      await th(2).locator(".sort").click();
      assert.deepEqual(await sorts(), [null, null, "descending", null, null], "numbers start descending");
      const times = await page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([data-empty]) td:nth-child(3)")].map((c) => c.hasAttribute("data-not-observed") ? null : Number(c.dataset.value)));
      assert.ok(times.slice(0, -1).every((v, i) => v >= times[i + 1] || times[i + 1] === null), "descending by the data-value, numbers as numbers");
      assert.equal(times.at(-1), null, "a reading that was not observed sorts after every observed value");
      await th(2).locator(".sort").click();
      const up = await page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([data-empty]) td:nth-child(3)")].map((c) => c.hasAttribute("data-not-observed") ? null : Number(c.dataset.value)));
      assert.equal(up.at(-1), null, "and after them in ascending too");
      assert.ok(up[0] <= up[1], "ascending");
      // A time asks for descending first (data-first-sort).
      await th(4).locator(".sort").click();
      assert.deepEqual(await sorts(), [null, null, null, null, "descending"]);
      const started = await page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([data-empty]) td:nth-child(5)")].map((c) => c.dataset.value));
      assert.deepEqual(started, [...started].sort().reverse(), "newest first");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`a press anywhere in the cell sorts, Enter and Space do, a page that sorts itself cancels the event, and a plain header is no button (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const th = page.locator("#runs thead th").nth(1);
      const cell = await box(th);
      const button = await box(th.locator(".sort"));
      assert.deepEqual([button.x, button.y, button.width, button.height], [cell.x, cell.y, cell.width, cell.height], "the button is the whole cell");
      await page.mouse.click(cell.x + 2, cell.y + cell.height - 2);
      assert.equal(await th.getAttribute("aria-sort"), "ascending", "the cell's own corner sorts");
      await th.locator(".sort").focus();
      await page.keyboard.press("Enter");
      assert.equal(await th.getAttribute("aria-sort"), "descending");
      await page.keyboard.press("Space");
      assert.equal(await th.getAttribute("aria-sort"), "ascending");
      assert.equal(await th.locator(".sort").evaluate((el) => el.tagName), "BUTTON");
      assert.equal(await page.getByRole("button", { name: "Status" }).count(), 1, "named by the header's words");
      // sortchange is cancelable: the page sorts its own rows.
      await page.evaluate(() => document.addEventListener("sortchange", (e) => { window.__sort = e.detail; e.preventDefault(); }));
      const before = await names(page);
      await page.locator("#runs thead th").nth(3).locator(".sort").click();
      assert.deepEqual(await page.evaluate(() => window.__sort), { index: 3, direction: "ascending" });
      assert.deepEqual(await names(page), before, "a cancelled sortchange leaves the rows to the page");
      assert.equal(await page.locator("#runs thead th").nth(3).getAttribute("aria-sort"), "ascending", "aria-sort still says what was asked");
      await context.close();
    });

    test(`hover lifts the label and shows the caret, with no wash and no weight change; focus is the flush-field inset ring; a sorted header shows its arrow (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const th = page.locator("#runs thead th").nth(0);
      const sort = th.locator(".sort");
      const read = () => page.evaluate(() => {
        const t = document.querySelector("#runs thead th:nth-child(1)");
        const b = t.querySelector(".sort");
        const op = (c) => getComputedStyle(t.querySelector(c)).opacity;
        return { ink: getComputedStyle(b).color, weight: getComputedStyle(b).fontWeight, wash: getComputedStyle(b).backgroundColor, cell: getComputedStyle(t).backgroundColor, caret: op(".sort-caret"), up: op(".sort-up"), down: op(".sort-down"), seat: getComputedStyle(t.querySelector(".sort-seat")).color };
      });
      const rest = await read();
      assert.equal(rest.caret, "0", "the caret is hidden at rest");
      assert.equal(rest.wash, "rgba(0, 0, 0, 0)");
      await sort.hover();
      await settled(page);
      const hover = await read();
      assert.equal(hover.caret, "1", "the caret shows in its seat on hover");
      assert.notEqual(hover.ink, rest.ink, "the label lifts from secondary to primary");
      assert.deepEqual([hover.wash, hover.cell, hover.weight], [rest.wash, rest.cell, rest.weight], "no wash on the cell and no weight change");
      await page.mouse.move(0, 0);
      await sort.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await settled(page);
      const ring = await css(sort, "outlineStyle", "outlineWidth", "outlineOffset");
      assert.deepEqual([ring.outlineStyle, ring.outlineWidth, ring.outlineOffset], ["solid", "2px", "-2px"], "a band that is itself the button takes the -2 inset ring");
      assert.equal((await read()).caret, "1", "the caret shows on focus too");
      await sort.click();
      await page.mouse.move(0, 0);
      await settled(page);
      const sorted = await read();
      assert.deepEqual([sorted.up, sorted.down, sorted.caret], ["1", "0", "0"], "ascending: the up arrow replaces the caret");
      assert.deepEqual([sorted.weight], [rest.weight], "a sorted header does not change weight");
      assert.equal(sorted.ink, sorted.seat, "sorted, the label and the arrow are primary together");
      await sort.click();
      await settled(page);
      assert.deepEqual([(await read()).up, (await read()).down], ["0", "1"], "descending: the down arrow");
      await context.close();
    });
  }

  test("on touch the caret is always there, the header and rows are 44px, and the seat is still reserved", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    assert.equal(await page.locator("#runs thead th").nth(0).locator(".sort-caret").evaluate((el) => getComputedStyle(el).opacity), "1");
    assert.equal((await box(page.locator("#runs thead th").nth(0))).height, 44);
    assert.equal((await box(page.locator("#runs tbody tr").first())).height, 44);
    await context.close();
  });

  test("a header that is not sortable has no button and no seat, and a row header never sorts", async () => {
    const { page, context } = await open({ body: `<div class="panel table-wrap" role="region" aria-label="T" tabindex="0"><table data-fixed style="min-width: 300px"><colgroup><col style="width:120px"><col></colgroup><thead><tr><th scope="col">Name</th><th scope="col" data-numeric>Count</th></tr></thead><tbody><tr><th scope="row">alpha</th><td data-numeric>1</td></tr></tbody></table></div>` });
    assert.equal(await page.locator("button").count(), 0);
    assert.equal(await page.locator(".sort-seat").count(), 0);
    await context.close();
  });
});

describe("the table additions: row headers, Not observed, density and the scroll hint", () => {
  for (const theme of THEMES) {
    test(`a row header is 500 in primary on the row's own fill, "Not observed" is tertiary and lifts on a wash, and the hint shows only while the table overflows (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, width: 390, touch: true });
      const th = await css(page.locator("#runs tbody th").first(), "fontWeight", "backgroundColor", "color", "textAlign");
      assert.deepEqual([th.fontWeight, th.backgroundColor, th.textAlign], ["500", "rgba(0, 0, 0, 0)", "start"]);
      const none = page.locator("#runs td[data-not-observed]");
      const tertiary = await page.evaluate(() => { const p = document.createElement("i"); p.style.color = "var(--basalt-text-tertiary)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
      assert.equal((await css(none, "color")).color, tertiary);
      assert.equal(await none.textContent(), "Not observed");
      assert.equal(await page.locator(".table-hint").isVisible(), true, "the table is wider than 390, so the hint shows");
      assert.equal(await page.locator(".table-hint").textContent(), "Scroll sideways to see all 5 columns");
      assert.equal(await page.locator(".table-hint").getAttribute("aria-hidden"), "true");
      await page.evaluate(() => { document.getElementById("frame").scrollLeft = 80; });
      assert.equal(await page.locator(".table-hint").textContent(), "Scroll sideways to see all 5 columns", "it never changes while the table scrolls");
      await page.setViewportSize({ width: 1440, height: 900 });
      await settled(page);
      assert.equal(await page.locator(".table-hint").isHidden(), true, "wide enough, the hint goes");
      await context.close();
    });
  }

  test("a plain table keeps React's 16px cell padding at 390 as at 1440 (it no longer tightens), and a still table does too", async () => {
    const plain = `<div class="panel table-wrap" role="region" aria-label="Plain" tabindex="0"><table><thead><tr><th scope="col">Name</th><th scope="col" data-numeric>Count</th></tr></thead><tbody><tr><td>alpha</td><td data-numeric>1</td></tr></tbody></table></div>`;
    for (const [width, touch] of [[1440, false], [390, true]]) {
      const { page, context } = await open({ width, touch, body: plain + PAGE });
      const pad = (sel) => page.locator(sel).first().evaluate((el) => { const s = getComputedStyle(el); return [s.paddingLeft, s.paddingRight]; });
      assert.deepEqual(await pad("table:not([data-fixed]) th"), ["16px", "16px"], `a plain header at ${width}`);
      assert.deepEqual(await pad("table:not([data-fixed]) td:nth-child(2)"), ["16px", "16px"], `a plain cell at ${width}`);
      assert.deepEqual(await pad("#runs tbody td:nth-child(2)"), ["16px", "16px"], `a still table's cell at ${width}`);
      await context.close();
    }
  });

  test("density: compact rows are 32px, comfortable 44, and a touch row is 44 whatever the density", async () => {
    const table = (density) => `<div class="panel table-wrap" data-row-density="${density}" role="region" aria-label="${density}" tabindex="0"><table><thead><tr><th scope="col">Name</th></tr></thead><tbody><tr><th scope="row">alpha</th></tr><tr><td>beta</td></tr></tbody></table></div>`;
    const { page, context } = await open({ body: table("compact") + table("comfortable") });
    const heights = await page.evaluate(() => [...document.querySelectorAll("tbody th, tbody td")].map((c) => c.getBoundingClientRect().height));
    assert.deepEqual(heights, [32, 32, 44, 44]);
    await context.close();
    const touch = await open({ body: table("compact"), width: 390, touch: true });
    assert.deepEqual(await touch.page.evaluate(() => [...document.querySelectorAll("tbody th, tbody td")].map((c) => c.getBoundingClientRect().height)), [44, 44]);
    await touch.context.close();
  });
});

describe("pinned columns at 390: the name sticks (and the select column with it), opaque in every state, a divider only while scrolled, a focused header never covered", () => {
  const PINNED = `<main class="page"><div class="panel table-wrap" role="region" aria-label="Pinned runs" tabindex="0" id="frame"><table id="runs" data-fixed data-pinned="2" style="min-width: 640px"><colgroup><col style="width: 40px"><col style="width: 160px"><col style="width: 140px"><col style="width: 120px"><col></colgroup><thead><tr><th class="select-col"><input type="checkbox" data-select-all aria-label="Select all runs"></th><th data-sortable>Name</th><th data-sortable>Status</th><th data-numeric data-sortable>Duration</th><th data-sortable>Owner</th></tr></thead><tbody><tr><td class="select-col"><input type="checkbox" aria-label="Select build-0141"></td><th scope="row">build-0141</th><td>Passed</td><td data-numeric>312</td><td>Alder</td></tr><tr><td class="select-col"><input type="checkbox" aria-label="Select build-0140" checked></td><th scope="row">build-0140</th><td>Failed</td><td data-numeric>45</td><td>Birch</td></tr></tbody></table></div></main>`;
  for (const theme of THEMES) {
    test(`pinned cells keep their place and their opaque fill while the table scrolls, and the divider is drawn only then (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, width: 390, touch: true, body: PINNED });
      const pinnedLeft = () => page.evaluate(() => [1, 2, 3].map((n) => Math.round(document.querySelector(`#runs tbody tr:first-child > :nth-child(${n})`).getBoundingClientRect().left * 100) / 100));
      const rest = await pinnedLeft();
      const frame = page.locator("#frame");
      const divider = (n) => page.evaluate((i) => getComputedStyle(document.querySelector(`#runs tbody tr:first-child > :nth-child(${i})`), "::after").opacity, n);
      assert.equal(await divider(2), "0", "no divider at rest");
      await frame.evaluate((el) => { el.scrollLeft = 120; });
      await settled(page);
      assert.equal(await divider(2), "1", "the divider shows while the table is scrolled");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#runs tbody tr:first-child > :nth-child(1)"), "::after").content), "none", "only at the last pinned column's edge: the select column draws none");
      const scrolled = await pinnedLeft();
      assert.deepEqual(scrolled.slice(0, 2), rest.slice(0, 2), "the select column and the name stay where they were");
      assert.ok(scrolled[2] < rest[2], "the columns after them scroll away");
      // Opaque in every state: the cell's own background has no alpha, and the row's wash is mixed into it as one colour (decision 138, C11), never an image or a layer.
      const opaque = (state) => page.evaluate(() => [1, 2].map((n) => { const c = getComputedStyle(document.querySelector(`#runs tbody tr:first-child > :nth-child(${n})`)); return [c.backgroundColor, c.backgroundImage.startsWith("linear-gradient"), c.position, c.zIndex]; }));
      const alpha = (c) => (/^rgba?\(([^)]+)\)$/.test(c) ? (c.match(/[\d.]+/g)[3] ?? "1") : /\/\s*([\d.]+)\)/.test(c) ? c.match(/\/\s*([\d.]+)\)/)[1] : "1");
      const at = await opaque();
      for (const [bg, , position] of at) { assert.equal(alpha(bg), "1", `a pinned cell's fill is opaque (${bg})`); assert.equal(position, "sticky"); }
      await page.locator("#runs tbody tr:first-child td:nth-child(3)").hover({ force: true }).catch(() => {});
      await page.mouse.move(200, 300);
      const selectedRow = await page.evaluate(() => { const cell = document.querySelector("#runs tbody tr:nth-child(2) > :nth-child(2)"), rest = document.querySelector("#runs tbody tr:first-child > :nth-child(2)"); return [getComputedStyle(cell).backgroundColor, getComputedStyle(cell, "::before").content, getComputedStyle(cell).backgroundImage, getComputedStyle(rest).backgroundColor]; });
      assert.equal(alpha(selectedRow[0]), "1", "a selected row's pinned cell keeps an opaque fill");
      assert.ok(["none", "normal"].includes(selectedRow[1]) && selectedRow[2] === "none", "the selected wash is one colour mixed into the cell, with no ::before layer and no image (decision 138, C11)");
      assert.notEqual(selectedRow[0], selectedRow[3], "and the cell wears the selected wash");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`a focused header or action is never covered by the pinned columns, even when it is only half under them (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, width: 390, touch: true, body: PINNED });
      const reach = await page.evaluate(() => document.querySelector("#runs tbody tr:first-child > :nth-child(2)").getBoundingClientRect().right);
      assert.ok((await page.evaluate(() => parseFloat(document.getElementById("frame").style.scrollPaddingInlineStart))) >= 200 - 1, "the container's scroll-padding is the pinned columns' reach");
      // The Status column's header is half under the pinned columns once the table is scrolled by 100.
      await page.locator("#frame").evaluate((el) => { el.scrollLeft = 100; });
      await page.locator("#runs thead th:nth-child(3) .sort").focus();
      await settled(page);
      const left = await page.evaluate(() => document.querySelector("#runs thead th:nth-child(3) .sort").getBoundingClientRect().left);
      assert.ok(left >= reach - 0.5, `the focused header's left edge (${left}) clears the pinned columns' edge (${reach})`);
      // And the far side: a header that fits between the pinned columns and the far edge is scrolled into view, not left hanging.
      await page.locator("#frame").evaluate((el) => { el.scrollLeft = 0; });
      await page.locator("#runs thead th:nth-child(4) .sort").focus();
      await settled(page);
      const right = await page.evaluate(() => [document.querySelector("#runs thead th:nth-child(4) .sort").getBoundingClientRect().right, document.getElementById("frame").getBoundingClientRect().right]);
      assert.ok(right[0] <= right[1] + 0.5, "and it is not left hanging past the far edge");
      // A pinned header takes the inset ring, so a sticky column cannot cover it.
      await page.locator("#runs thead th:nth-child(2) .sort").focus();
      assert.equal((await css(page.locator("#runs thead th:nth-child(2) .sort"), "outlineOffset")).outlineOffset, "-2px");
      await context.close();
    });
  }

  for (const theme of THEMES) {
    test(`a pinned cell paints the same pixels as React's at rest, hovered and selected (${theme})`, async () => {
      const react = `const { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableRowHead, TableCell, Checkbox } = B; document.body.style.margin = "0"; flushSync(() => createRoot(document.getElementById("root")).render(<div style={{ width: 358, margin: 16 }}><TableContainer><Table columns={[{ width: 40 }, { width: 160 }, { width: 140 }, { width: 120 }, {}]} minWidth={640} pinned={2}><TableHeader><TableRow><TableHead><Checkbox aria-label="Select all" /></TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead numeric>Duration</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell><Checkbox aria-label="Select one" /></TableCell><TableRowHead>build-0141</TableRowHead><TableCell>Passed</TableCell><TableCell numeric>312</TableCell><TableCell>Alder</TableCell></TableRow><TableRow selected><TableCell><Checkbox aria-label="Select two" defaultChecked /></TableCell><TableRowHead>build-0140</TableRowHead><TableCell>Failed</TableCell><TableCell numeric>45</TableCell><TableCell>Birch</TableCell></TableRow></TableBody></Table></TableContainer></div>));`;
      const { page: reactPage } = await fixturePage(reactBrowser, react, { theme, viewport: { width: 390, height: 844 } });
      await reactPage.addStyleTag({ content: "body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); }" });
      const { page, context } = await open({ scheme: theme, width: 390, body: `<div style="width: 358px; margin: 16px">${PINNED.replace(/^<main class="page">|<\/main>$/g, "").replace('<div class="panel table-wrap"', '<div class="panel table-wrap"')}</div>`.replace('<th data-sortable>Name</th><th data-sortable>Status</th><th data-numeric data-sortable>Duration</th><th data-sortable>Owner</th>', '<th scope="col">Name</th><th scope="col">Status</th><th scope="col" data-numeric>Duration</th><th scope="col">Owner</th>').replace("<main", "<div").replace("</main>", "</div>") });
      for (const p of [reactPage, page]) { await p.evaluate(() => { document.querySelector(".basalt-table-container, .table-wrap").scrollLeft = 120; }); await settle(p); }
      // A solid patch of the pinned name cell, clear of the words, the edge divider and the cell's top line.
      // The pixel is read back in the browser: React lays the wash over the cell as a flat gradient image and the skill as a flat layer, which can differ by one level of 255
      // in rounding (never more), so a patch is the same if no channel is more than one level apart.
      const scratch = await reactBrowser.newPage();
      const pixel = (png) => scratch.evaluate(async (x) => { const img = new Image(); await new Promise((r) => { img.onload = r; img.src = `data:image/png;base64,${x}`; }); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, img.width, img.height).data; return [...d.slice(0, 4), ...d.slice(d.length - 4)]; }, png.toString("base64"));
      const patch = async (p, row, state) => {
        if (state === "hovered") await p.mouse.move(250, row === 1 ? 80 : 120);
        else await p.mouse.move(0, 0);
        await settle(p);
        const r = await p.evaluate((n) => { const c = document.querySelector(`tbody tr:nth-child(${n}) > :nth-child(2)`).getBoundingClientRect(); return { x: c.right - 40, y: c.top + 6, width: 20, height: 6 }; }, row);
        return pixel(await p.screenshot({ clip: r }));
      };
      const seen = {};
      for (const [row, state] of [[1, "at rest"], [1, "hovered"], [2, "selected"]]) {
        const [a, b] = [await patch(reactPage, row, state), await patch(page, row, state)];
        assert.ok(a.every((v, i) => Math.abs(v - b[i]) <= 1), `the pinned name cell, ${state}, paints React's pixels (React ${a}, skill ${b})`);
        seen[state] = b;
      }
      assert.notDeepEqual(seen.hovered, seen["at rest"], "the hover wash is really there");
      assert.notDeepEqual(seen.selected, seen["at rest"], "and so is the selected one");
      await scratch.close();
      await reactPage.close();
      await context.close();
    });
  }

  test("in forced colours a pinned cell is Canvas with no wash image, and the divider is CanvasText while scrolled", async () => {
    const { page, context } = await open({ width: 390, touch: true, body: PINNED, forced: true });
    await page.locator("#frame").evaluate((el) => { el.scrollLeft = 120; });
    await settled(page);
    const canvas = await resolve(page, "Canvas", "background-color");
    const text = await resolve(page, "CanvasText", "background-color");
    const cell = await page.evaluate(() => { const el = document.querySelector("#runs tbody tr:nth-child(2) > :nth-child(2)"); return [getComputedStyle(el).backgroundColor, getComputedStyle(el, "::before").content]; });
    assert.equal(cell[0], canvas, "and the wash drops: the selected row's cell is Canvas, with no layer of its own");
    assert.ok(["none", "normal"].includes(cell[1]), "no ::before layer to drop (decision 138, C11)");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#runs tbody tr:first-child > :nth-child(2)"), "::after").backgroundColor), text);
    assert.equal(await page.locator("#runs thead th:nth-child(3) .sort-seat").evaluate((el) => getComputedStyle(el).color), await resolve(page, "ButtonText"));
    await context.close();
  });
});

describe("the multi-select filter: chips up to six values, a trigger and a checklist from seven or in a toolbar, by count and never by width", () => {
  for (const theme of THEMES) {
    test(`six values are chips, seven are a trigger and a checklist, a toolbar is always a trigger, and a resize never changes the form (${theme})`, async () => {
      const six = await open({ scheme: theme, body: FILTER(6) });
      assert.equal(await six.page.locator("#f .chip").count(), 6);
      assert.equal(await six.page.locator("#f .filter-trigger").count(), 0);
      await six.page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await six.page.locator("#f .chip").count(), 6, "narrower, still chips");
      await six.context.close();
      const seven = await open({ scheme: theme, body: FILTER(7), width: 390 });
      assert.equal(await seven.page.locator("#f .chip").count(), 0);
      assert.equal(await seven.page.locator("#f .filter-trigger").count(), 1);
      await seven.page.setViewportSize({ width: 1440, height: 900 });
      assert.equal(await seven.page.locator("#f .filter-trigger").count(), 1, "wider, still a trigger");
      await seven.context.close();
      const bar = await open({ scheme: theme, body: FILTER(3, "data-toolbar") });
      assert.equal(await bar.page.locator("#f .filter-trigger").count(), 1, "a toolbar is a trigger however few the values");
      await bar.context.close();
    });

    test(`the chips are checkboxes in a labelled group: Tab reaches each, Space toggles it, a disabled one is skipped, and the form carries the values (${theme})`, async () => {
      const body = `<main class="page"><form id="form" onsubmit="return false"><div class="filter" id="f" data-label="Status">${labels(STATUS.slice(0, 4))}</div></form></main>`;
      const { page, context, errors } = await open({ scheme: theme, body: body.replace('value="queued"', 'value="queued" disabled').replaceAll('<input type="checkbox"', '<input name="status" type="checkbox"') });
      const group = page.getByRole("group", { name: "Status" });
      assert.equal(await group.count(), 1);
      assert.equal(await page.locator("#f .filter-chips").getAttribute("aria-describedby"), await page.locator("#f .filter-count").getAttribute("id"), "the visible count is the group's description");
      assert.equal(await page.locator("#f .filter-count").getAttribute("aria-live"), null, "and it is not live");
      await page.getByRole("checkbox", { name: "Passed" }).focus();
      await page.keyboard.press("Space");
      assert.equal(await page.getByRole("checkbox", { name: "Passed" }).isChecked(), true);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.value), "failed");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.value), "running");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.closest(".filter-chips")), null, "Queued is disabled and skipped: focus left the group");
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.evaluate(() => document.activeElement.value), "running");
      assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById("form"))].map(([k, v]) => v)), ["passed"]);
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`a chip is a plus off and a check on in one seat, so turning it on moves nothing, and a shape changes, never colour alone (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, body: FILTER(4) });
      const chip = page.locator("#f .chip").first();
      const before = { box: await box(chip), seat: await box(chip.locator(".chip-seat")), label: await box(chip.locator(".chip-label")), plus: await css(chip.locator(".chip-plus"), "opacity"), check: await css(chip.locator(".chip-check"), "opacity") };
      assert.deepEqual([before.plus.opacity, before.check.opacity], ["1", "0"]);
      await chip.locator("input").evaluate((el) => el.click());
      await settled(page);
      const after = { box: await box(chip), seat: await box(chip.locator(".chip-seat")), label: await box(chip.locator(".chip-label")), plus: await css(chip.locator(".chip-plus"), "opacity"), check: await css(chip.locator(".chip-check"), "opacity") };
      assert.deepEqual([after.plus.opacity, after.check.opacity], ["0", "1"], "the plus gives way to the check");
      assert.deepEqual([after.box, after.seat, after.label], [before.box, before.seat, before.label], "turning a chip on moves nothing");
      const fade = await css(chip.locator(".chip-check"), "transitionDuration", "transitionProperty");
      assert.equal(fade.transitionDuration, "0.1s", "a 100ms crossfade");
      await context.close();
    });
  }

  test("Clear never moves: its x is the same from Any to N of N, it is aria-disabled at zero and keeps focus, and nothing speaks twice", async () => {
    const { page, context } = await open({ body: FILTER(5) });
    const clear = page.locator("#f .filter-clear");
    const count = page.locator("#f .filter-count");
    const x = [];
    const widths = [];
    const text = [];
    const inputs = page.locator("#f .chip input");
    for (let i = 0; i <= 5; i += 1) {
      if (i > 0) await inputs.nth(i - 1).evaluate((el) => el.click());
      x.push((await box(clear)).x);
      widths.push((await box(count)).width);
      text.push(await page.locator("#f .filter-count-value").textContent());
    }
    assert.deepEqual(text, ["Any", "1 of 5", "2 of 5", "3 of 5", "4 of 5", "5 of 5"]);
    assert.ok(x.every((v) => v === x[0]), `Clear's x never changes: ${x}`);
    assert.ok(widths.every((v) => v === widths[0]), `the count holds the width of its widest form: ${widths}`);
    assert.equal(await clear.getAttribute("aria-disabled"), null, "enabled with five chosen");
    await clear.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#f .filter-count-value").textContent(), "Any");
    assert.equal(await clear.getAttribute("aria-disabled"), "true", "aria-disabled at zero, not disabled");
    assert.equal(await clear.evaluate((el) => el.disabled), false);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Clear", "focus stayed on Clear");
    assert.equal(await clear.getAttribute("aria-disabled"), "true");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#f .filter-count-value").textContent(), "Any", "activation is suppressed at zero");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Clear");
    assert.equal((await box(clear)).x, x[0], "and it did not move");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#f .filter-count"), "::before").content), '"Any"');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#f .filter-count"), "::after").content), '"5 of 5"');
    await context.close();
  });

  test("the count's reserved widths are CSS content, not text: the group's description reads only the count", async () => {
    const { page, context } = await open({ body: FILTER(4) });
    assert.equal(await page.locator("#f .filter-count").evaluate((el) => el.textContent), "Any");
    await context.close();
  });

  test("a filter fires filterchange with its values in order, and with no data-for it filters nothing itself", async () => {
    const { page, context } = await open({ body: FILTER(4) });
    await page.evaluate(() => { window.__heard = []; document.addEventListener("filterchange", (e) => window.__heard.push(e.detail.values)); });
    await page.locator("#f .chip input").nth(2).evaluate((el) => el.click());
    await page.locator("#f .chip input").nth(0).evaluate((el) => el.click());
    assert.deepEqual(await page.evaluate(() => window.__heard), [["cedar"], ["alder", "cedar"]]);
    await context.close();
  });
});

describe("the checklist: popup rows, keys between band and rows, the search band from ten values inside the 360px cap", () => {
  const LIST = FILTER;
  for (const theme of THEMES) {
    test(`it opens under its trigger as a labelled group of checkbox rows with a foot, and the trigger says Any, a name, then a name and a count (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, body: LIST(8) });
      const trigger = page.locator("#f .filter-trigger");
      assert.equal((await trigger.textContent()).replace(/\s+/g, " ").trim(), "Owner Any");
      await openList(page);
      const popup = page.locator("#f .filter-popup");
      assert.equal(await popup.getAttribute("role"), "dialog");
      assert.equal(await page.getByRole("group", { name: "Owner" }).count(), 1);
      assert.equal(await page.locator("#f .filter-band").count(), 0, "eight rows need no search");
      const rows = page.locator("#f .filter-row");
      assert.equal(await rows.count(), 8);
      assert.equal(await page.locator("#f .filter-foot .filter-count").textContent(), "Any");
      await rows.nth(2).locator("input").click();
      assert.equal((await trigger.textContent()).replace(/\s+/g, " ").trim(), "Owner Cedar");
      assert.equal(await trigger.getAttribute("data-active"), "");
      await rows.nth(4).locator("input").click();
      assert.equal((await trigger.textContent()).replace(/\s+/g, " ").trim(), "Owner Cedar +1");
      assert.equal(await page.locator("#f .filter-foot .filter-count").textContent(), "2 of 8");
      const t = await box(trigger);
      const p = await box(popup);
      assert.ok(Math.abs(p.x - t.x) < 1 && Math.abs(p.y - (t.y + t.height) - 6) < 1.5, "below the trigger at its start, 6px away");
      await page.keyboard.press("Escape");
      await popup.waitFor({ state: "hidden" });
      assert.equal(await page.evaluate(() => document.activeElement.className.includes("filter-trigger")), true, "focus returns to the trigger");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`the arrows, Home and End move between rows, one tab stop for each, and Space toggles (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, body: LIST(8) });
      await openList(page);
      const rows = page.locator("#f .filter-row input");
      const at = () => page.evaluate(() => document.activeElement.value);
      assert.equal(await at(), "alder", "the first row takes focus on opening");
      await page.keyboard.press("ArrowDown");
      assert.equal(await at(), "birch");
      await page.keyboard.press("End");
      assert.equal(await at(), "hazel");
      await page.keyboard.press("Home");
      assert.equal(await at(), "alder");
      await page.keyboard.press("ArrowUp");
      assert.equal(await at(), "alder", "up from the first row stays (no band under eight)");
      await page.keyboard.press("Space");
      assert.equal(await rows.first().isChecked(), true);
      assert.equal(await page.locator("#f .filter-row").first().getAttribute("data-highlighted"), "", "the focused row is the lit one");
      await context.close();
    });

    test(`from ten values a search band sits above the rows: nine rows show whole inside 360px and the tenth scrolls, the band and foot stay outside (${theme})`, async () => {
      for (const [n, scrolls] of [[9, false], [10, true], [12, true]]) {
        const { page, context } = await open({ scheme: theme, body: LIST(n) });
        await openList(page);
        assert.equal(await page.locator("#f .filter-band").count(), n >= 10 ? 1 : 0, `${n} values`);
        const rows = await page.locator("#f .filter-rows").evaluate((el) => [el.clientHeight, el.scrollHeight]);
        assert.equal(rows[1] > rows[0], scrolls, `${n} rows: scrolls ${scrolls} (${rows})`);
        assert.ok(rows[0] <= 360, "the rows are capped at 360");
        if (n >= 10) {
          const band = await box(page.locator("#f .filter-band"));
          const list = await box(page.locator("#f .filter-rows"));
          const foot = await box(page.locator("#f .filter-foot"));
          assert.equal(band.height, 40, "the band is 40px");
          assert.ok(band.y + band.height <= list.y + 0.5 && list.y + list.height <= foot.y + 0.5, "band, rows, foot in order, the band and foot outside the scroll");
          const input = await css(page.locator("#f .filter-band-input"), "fontSize", "lineHeight");
          assert.deepEqual([input.fontSize, input.lineHeight], ["14px", "20px"]);
          assert.equal(await page.locator("#f .filter-band-input").evaluate((el) => el === document.activeElement), true, "the band takes focus on opening");
        }
        await context.close();
      }
    });

    test(`the keys between the band and the rows: down from the band, up from the first row, typing on a row, narrowing, no match, and Esc clears the text before it closes (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, body: LIST(12) });
      await openList(page);
      const at = () => page.evaluate(() => (document.activeElement.getAttribute("role") === "searchbox" ? "searchbox" : document.activeElement.value));
      assert.equal(await at(), "searchbox");
      await page.keyboard.press("ArrowDown");
      assert.equal(await at(), "alder", "down from the band goes to the first row");
      await page.keyboard.press("ArrowUp");
      assert.equal(await at(), "searchbox", "up from the first row goes back to the band");
      await page.keyboard.type("i");
      assert.deepEqual(await page.locator("#f .filter-row:not([hidden]) .filter-row-label").allTextContents(), ["Birch", "Fir", "Gingko", "Ironwood", "Juniper", "Katsura"].filter((x) => x.toLowerCase().includes("i")), "narrowed to the labels with the text");
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.evaluate(() => document.activeElement.value), "birch");
      await page.keyboard.type("z");
      assert.equal(await at(), "searchbox", "typing on a row goes to the band");
      assert.equal(await page.locator("#f .filter-band-input").inputValue(), "iz", "and the key is typed there");
      await page.locator("#f .filter-band-input").fill("zzz");
      assert.equal(await page.locator("#f .filter-none").isVisible(), true);
      assert.equal(await page.locator("#f .filter-none").textContent(), "No owner matches.");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#f .filter-band-input").inputValue(), "", "the first Esc clears the text");
      assert.equal(await page.locator("#f .filter-popup").evaluate((el) => el.matches(":popover-open")), true, "and does not close");
      assert.equal(await page.locator("#f .filter-row:not([hidden])").count(), 12);
      await page.keyboard.press("Escape");
      await page.locator("#f .filter-popup").waitFor({ state: "hidden" });
      await context.close();
    });
  }

  test("on touch the checklist opens without focusing the band, rows and the band's text are the touch sizes, and the target is 44px", async () => {
    const { page, context } = await open({ width: 390, touch: true, body: LIST(12) });
    await page.locator("#f .filter-trigger").tap();
    await page.locator("#f .filter-popup").waitFor();
    await page.waitForFunction(() => document.activeElement === document.querySelector("#f .filter-popup"));
    await settled(page);
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("#f .filter-band-input")), false, "the band would raise the keyboard over the list");
    assert.equal((await css(page.locator("#f .filter-band-input"), "fontSize")).fontSize, "16px", "16px on touch, so a phone does not zoom");
    assert.equal((await box(page.locator("#f .filter-row").first())).height, 44);
    await context.close();
    const chips = await open({ width: 390, touch: true, body: FILTER(4, "") });
    assert.equal((await box(chips.page.locator("#f .chip").first())).height, 36);
    // The hit area is the chip's ::before: 44px tall, 4px beyond the 36px chip above and below, found by the pointer and not beyond (foundations: touch targets of at least 44px).
    const reach = await chips.page.locator("#f .chip").first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el, "::before");
      const top = r.top + parseFloat(getComputedStyle(el).borderTopWidth) + parseFloat(s.top);
      const height = parseFloat(s.height);
      const at = (y) => document.elementFromPoint(r.left + r.width / 2, y) === el;
      return { chip: r.height, height, above: r.top - top, below: top + height - r.bottom, hitAbove: at(r.top - 3), hitBelow: at(r.bottom + 3), missAbove: at(r.top - 5.5), missBelow: at(r.bottom + 5.5) };
    });
    assert.deepEqual([reach.chip, reach.height, reach.above, reach.below], [36, 44, 4, 4], "a 44px target around the 36px chip");
    assert.deepEqual([reach.hitAbove, reach.hitBelow, reach.missAbove, reach.missBelow], [true, true, false, false], "and the pointer finds the chip inside it and not outside");
    await chips.context.close();
  });
});

describe("the result line: shown at once, spoken once after 400ms of stillness, and the filter's table", () => {
  for (const theme of THEMES) {
    test(`toggling chips in a row is one announcement, 400ms after the last, on the shared clock (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      const shown = () => page.evaluate(() => document.querySelector("#result > span[aria-hidden]").textContent);
      const spoken = () => page.evaluate(() => document.querySelector("#result > span[role=status]").textContent);
      assert.equal(await page.locator("#result > span[role=status]").getAttribute("aria-live"), "polite");
      assert.equal(await page.locator("#result > span[role=status]").getAttribute("aria-atomic"), "true");
      assert.equal(await spoken(), "Showing 24 of 24 runs", "nothing is announced on load");
      const clock = await freezeAnimations(page);
      const click = (value) => page.evaluate((v) => document.querySelector(`#f-status input[value="${v}"]`).click(), value);
      await click("failed");
      const first = await shown();
      assert.match(first, /^Showing \d+ of 24 runs$/);
      assert.notEqual(first, "Showing 24 of 24 runs", "the visible line updates at once");
      assert.equal(await spoken(), "Showing 24 of 24 runs", "but nothing is spoken yet");
      await clock.advance(300);
      await click("passed");
      await clock.advance(300);
      await click("running");
      const last = await shown();
      await clock.advance(399);
      assert.equal(await spoken(), "Showing 24 of 24 runs", "399ms of stillness is not enough");
      await clock.advance(1);
      assert.equal(await spoken(), last, "spoken once, with the last text, after 400ms of stillness");
      assert.equal(await page.evaluate(() => { const live = document.querySelector("#result > span[role=status]"); return live.textContent; }), last);
      await clock.thaw();
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`a filter hides the rows that match no chosen value, counts them in words, shows the empty row at none, and Clear brings every row back (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      const total = (await names(page)).length;
      assert.equal(total, 24);
      await page.locator("#f-status input[value=failed]").evaluate((el) => el.click());
      const some = await names(page);
      assert.ok(some.length > 0 && some.length < 24);
      assert.equal(await page.locator("#result > span[aria-hidden]").textContent(), `Showing ${some.length} of 24 runs`);
      assert.equal(await hidden(page), 24 - some.length);
      const statuses = await page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([hidden]):not([data-empty]) td:nth-child(2)")].map((c) => c.dataset.value));
      assert.ok(statuses.every((s) => s === "failed"));
      // Any of many: a second value adds rows; a second filter narrows them.
      await page.locator("#f-status input[value=passed]").evaluate((el) => el.click());
      assert.ok((await names(page)).length > some.length);
      await page.locator("#f-owner input[value=alder]").evaluate((el) => el.click());
      const both = await page.evaluate(() => [...document.querySelectorAll("#runs tbody tr:not([hidden]):not([data-empty])")].map((r) => [r.children[1].dataset.value, r.children[3].dataset.value]));
      assert.ok(both.every(([s, o]) => ["failed", "passed"].includes(s) && o === "alder"));
      // Sorting keeps the filter; the hidden rows stay hidden.
      await page.locator("#runs thead th").nth(0).locator(".sort").click();
      assert.equal((await names(page)).length, both.length);
      await page.locator("#f-status .filter-clear").evaluate((el) => el.click());
      await page.locator("#f-status input[value=cancelled]").evaluate((el) => el.click());
      assert.equal(await page.locator("#result > span[aria-hidden]").textContent(), "Showing 0 of 24 runs");
      assert.equal(await page.locator("#runs tr[data-empty]").isVisible(), true);
      await page.locator("#clear-all").evaluate((el) => { document.querySelectorAll(".filter-clear").forEach((c) => c.click()); });
      assert.equal(await page.locator("#result > span[aria-hidden]").textContent(), "Showing 24 of 24 runs");
      assert.equal(await page.locator("#runs tr[data-empty]").isHidden(), true);
      assert.equal((await names(page)).length, 24);
      await context.close();
    });
  }

  test("a result line set by hand is shown at once and spoken once, and a line with a table's id is kept in step by refreshFilter", async () => {
    const { page, context } = await open({ body: `<main class="page"><p class="filter-result" id="r" data-delay="250">Showing 1 of 1 runs</p></main>` });
    const clock = await freezeAnimations(page);
    await page.evaluate(() => window.Basalt.filterResult(document.getElementById("r"), "Showing 3 of 24 runs"));
    assert.equal(await page.evaluate(() => document.querySelector("#r > span[aria-hidden]").textContent), "Showing 3 of 24 runs");
    assert.equal(await page.evaluate(() => document.querySelector("#r > span[role=status]").textContent), "Showing 1 of 1 runs");
    await clock.advance(250);
    assert.equal(await page.evaluate(() => document.querySelector("#r > span[role=status]").textContent), "Showing 3 of 24 runs", "data-delay sets the stillness");
    await clock.thaw();
    await context.close();
  });
});

describe("reduced motion, forced colours, touch and axe", () => {
  test("under reduced motion the chips' glyphs still crossfade over duration-fast (decision 138, C10)", async () => {
    const { page, context } = await open({ reducedMotion: "reduce", body: FILTER(4) });
    assert.equal((await css(page.locator("#f .chip-seat > svg").first(), "transitionProperty")).transitionProperty, "opacity");
    assert.equal((await css(page.locator("#f .chip-seat > svg").first(), "transitionDuration")).transitionDuration, "0.1s");
    await context.close();
  });

  for (const theme of THEMES) {
    test(`in forced colours a chip's line is ButtonText, an on chip is Highlight with every part HighlightText and its check shown, a disabled one is GrayText (${theme})`, async () => {
      const body = `<main class="page"><div class="filter" id="f" data-label="Status">${labels(STATUS.slice(0, 4), ["failed"]).replace('value="queued"', 'value="queued" disabled')}</div><div class="filter" id="g" data-label="Owner">${labels(OWNERS.slice(0, 8).map((o) => [o.toLowerCase(), o]), ["cedar"])}</div></main>`;
      const { page, context } = await open({ scheme: theme, body, forced: true });
      const c = Object.fromEntries(await Promise.all(["Highlight", "HighlightText", "ButtonText", "GrayText", "CanvasText"].map(async (k) => [k, await resolve(page, k)])));
      const off = page.locator("#f .chip").first();
      const on = page.locator("#f .chip:has(input:checked)");
      const disabled = page.locator("#f .chip:has(input:disabled)");
      const offStyle = await css(off, "color", "borderTopColor");
      await sameColour(page, offStyle.color, c.ButtonText, "an off chip's label");
      await sameColour(page, offStyle.borderTopColor, c.ButtonText, "an off chip's line");
      const onStyle = await css(on, "color", "backgroundColor", "borderTopColor");
      await sameColour(page, onStyle.color, c.HighlightText, "an on chip's ink");
      await sameColour(page, onStyle.backgroundColor, c.Highlight, "an on chip's fill");
      await sameColour(page, onStyle.borderTopColor, c.Highlight, "an on chip's line");
      for (const part of [".chip-label", ".chip-seat", ".chip-check"]) await sameColour(page, (await css(on.locator(part), "color")).color, c.HighlightText, `${part} on Highlight`);
      assert.equal((await css(on.locator(".chip-check"), "opacity")).opacity, "1", "its check shows");
      await sameColour(page, (await css(disabled, "color")).color, c.GrayText, "a disabled chip");
      await sameColour(page, (await css(page.locator("#f .filter-count"), "color")).color, c.CanvasText, "the count");
      await openList(page, "#g");
      await page.locator("#g .filter-row input").nth(1).focus();
      await settled(page);
      const lit = page.locator("#g .filter-row[data-highlighted]");
      await sameColour(page, (await css(lit, "color")).color, c.HighlightText, "the lit row's label");
      await sameColour(page, await lit.evaluate((el) => getComputedStyle(el, "::before").backgroundColor), c.Highlight, "the lit row's plate");
      await context.close();
    });

    test(`no accessibility violations: the page with the table and the filters, and the open checklist, in ${theme} and in forced colours`, async () => {
      for (const forced of [false, true]) {
        const { page, context } = await open({ scheme: theme, forced, body: `${PAGE.replace("</main>", "")}<div class="filter" id="g" data-label="Tree">${labels(OWNERS.map((o) => [o.toLowerCase(), o]))}</div></main>` });
        const options = forced ? { ...AXE, rules: { "color-contrast": { enabled: false } } } : AXE;
        assert.deepEqual(await axeViolations(page, options), [], "at rest");
        await openList(page, "#g");
        assert.deepEqual(await axeViolations(page, options), [], "with the checklist open");
        await context.close();
      }
    });
  }

  test("a page with none of this carries none of it: a plain table brings the table module only, a fixed or sortable one the still table, a filter the filter", async () => {
    const used = (body) => compose(`<title>t</title>${body}`, { fonts: false }).modules;
    assert.deepEqual(used(`<table><tr><td>x</td></tr></table>`), ["table"]);
    assert.ok(used(`<table data-fixed><tr><td>x</td></tr></table>`).includes("still-table"));
    assert.ok(used(`<table><thead><tr><th data-sortable>x</th></tr></thead></table>`).includes("still-table"));
    const filter = used(`<div class="filter"></div>`);
    for (const need of ["filter", "popover", "glide", "glyph", "choice"]) assert.ok(filter.includes(need), `a filter needs ${need}`);
    assert.ok(!used(`<table><tr><td>x</td></tr></table>`).includes("filter"));
  });
});
