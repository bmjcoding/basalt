// The second audit's performance findings (A1, DECISIONS 133), engineering batch c11: each is a speed the code lost or never had, and each test below fails on the
// code before the fix. They count work (Ranges made, cells measured, style recalculations, formatters built, layouts forced), never milliseconds, so a busy machine
// cannot fail or pass them. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as React from "react";
import { renderToString } from "react-dom/server";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// ---- A1-18 and A1-19: the still table's cell peek
// Counts, in the page before it loads: Ranges made, cells pointed at (`selectNodeContents`, once for each cell that is measured by its text), and the order of
// reads and writes (`r` for a cell read, `w` for a `data-cut` or `tabindex` written).
const COUNTERS = `(() => {
  const c = window.__c = { ranges: 0, cells: 0, order: [] };
  const create = Document.prototype.createRange;
  Document.prototype.createRange = function () { c.ranges += 1; return create.call(this); };
  const select = Range.prototype.selectNodeContents;
  Range.prototype.selectNodeContents = function (node) { c.cells += 1; c.order.push("r"); return select.call(this, node); };
  const set = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) { if (name === "data-cut" || name === "tabindex") c.order.push("w"); return set.call(this, name, value); };
  window.__reset = () => { Object.assign(c, { cells: 0, order: [] }); };
})();`;

const ROWS = 300;
const TABLE = (rows) => `${COUNTERS}
const ROWS = Array.from({ length: ${rows} }, (_, i) => ({ id: i, name: "run-" + i, note: i % 3 === 0 ? "A long note that cannot fit in its column however wide the window, because it runs on and on, row " + i : "Fits", size: (i * 37) % 500 }));
function Runs() {
  const [dir, setDir] = React.useState("ascending");
  const [tick, setTick] = React.useState("0");
  window.sortRuns = () => setDir((d) => (d === "ascending" ? "descending" : "ascending"));
  window.tickRuns = setTick;
  const rows = [...ROWS].sort((a, b) => (dir === "ascending" ? a.size - b.size : b.size - a.size) || a.id - b.id);
  return <div style={{ padding: 16, width: 720 }}><B.TableContainer label="Runs"><B.Table columns={[{ width: 90 }, {}, { width: 80 }, { width: 80 }]} minWidth={560}>
    <B.TableHeader><B.TableRow><B.TableHead>Run</B.TableHead><B.TableHead>Note</B.TableHead><B.TableHead numeric sort={dir} onSortChange={window.sortRuns}>Size</B.TableHead><B.TableHead>Clock</B.TableHead></B.TableRow></B.TableHeader>
    <B.TableBody>{rows.map((r) => <B.TableRow key={r.id}><B.TableRowHead>{r.name}</B.TableRowHead><B.TableCell>{r.note}</B.TableCell><B.TableCell numeric>{r.size}</B.TableCell><B.TableCell>{r.id === 5 ? tick : "x"}</B.TableCell></B.TableRow>)}</B.TableBody>
  </B.Table></B.TableContainer></div>;
}
createRoot(document.getElementById("root")).render(<Runs />);`;

const open = (theme, viewport = { width: 1000, height: 800 }) => fixturePage(browser, TABLE(ROWS), { theme, viewport });
const frames = (page, n = 3) => page.evaluate(async (n) => { for (let i = 0; i < n; i += 1) await new Promise((r) => requestAnimationFrame(() => r())); }, n);
const counts = (page) => page.evaluate(() => ({ ranges: window.__c.ranges, cells: window.__c.cells, order: window.__c.order.join("") }));
const cutCells = (page) => page.evaluate(() => document.querySelectorAll("[data-cut]").length);

// The cells the peek can measure: the body's cells and the header cells that are not sort buttons.
const CELLS = ROWS * 4 + 3;

for (const theme of ["light", "dark"]) {
  describe(`A1-18 and A1-19: the still table's cell peek (${theme})`, () => {
    test(`A1-18: a table of ${ROWS} rows measured at mount, on a resize, on a sheet and on a font makes at most one Range`, async () => {
      const { page, errors } = await open(theme);
      try {
        await page.locator("table").waitFor();
        await settle(page);
        await frames(page);
        assert.ok(await cutCells(page) > 50, "the long notes are cut");
        for (const width of [900, 700, 1000]) { await page.setViewportSize({ width, height: 800 }); await frames(page); }
        await page.evaluate(() => { const style = document.createElement("style"); style.textContent = "td { letter-spacing: 0.01em; }"; document.documentElement.append(style); });
        await frames(page);
        await page.evaluate(() => document.fonts.dispatchEvent(new Event("loadingdone")));
        await frames(page);
        const { ranges } = await counts(page);
        assert.ok(ranges <= 1, `Ranges made: ${ranges}`);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });

    test(`A1-19: one measuring at mount: every cell once`, async () => {
      const { page } = await open(theme);
      try {
        await page.locator("table").waitFor();
        await settle(page);
        await frames(page, 5);
        const { cells } = await counts(page);
        // A cell whose content overflows its box is found cut at once; every other cell is pointed at, and only once (it was three times).
        const overflowing = await page.evaluate(() => [...document.querySelectorAll("[data-cut]")].filter((c) => c.scrollWidth > c.clientWidth).length);
        assert.equal(cells, CELLS - overflowing, `cells pointed at at mount: ${cells}, of ${CELLS} less ${overflowing} that overflow`);
      } finally { await page.close(); }
    });

    test("A1-19: a sort measures nothing, and the cut cells stay as they were", async () => {
      const { page } = await open(theme);
      try {
        await page.locator("table").waitFor();
        await settle(page);
        await frames(page, 4);
        const before = await cutCells(page);
        await page.evaluate(() => window.__reset());
        await page.locator("th button").first().click();
        await frames(page, 4);
        await page.locator("th button").first().click();
        await frames(page, 4);
        assert.equal((await counts(page)).cells, 0, "cells measured by two sorts");
        assert.equal(await cutCells(page), before);
        assert.equal(await page.evaluate(() => document.querySelectorAll("tbody td[data-cut], tbody th[data-cut]").length), before);
      } finally { await page.close(); }
    });

    test("A1-19: a change to the page's title measures nothing", async () => {
      const { page } = await open(theme);
      try {
        await page.locator("table").waitFor();
        await settle(page);
        await frames(page, 4);
        await page.evaluate(() => window.__reset());
        await page.evaluate(() => { document.title = "One"; });
        await frames(page);
        await page.evaluate(() => { const el = document.createElement("title"); el.textContent = "Two"; document.head.append(el); });
        await frames(page);
        await page.evaluate(() => { document.title = "Three"; });
        await frames(page);
        assert.equal((await counts(page)).cells, 0);
      } finally { await page.close(); }
    });

    test("A1-19: a ticking cell measures its own row and no other, and becomes a stop when it is cut", async () => {
      const { page } = await open(theme);
      try {
        await page.locator("table").waitFor();
        await settle(page);
        await frames(page, 4);
        await page.evaluate(() => window.__reset());
        for (const text of ["1", "2", "3", "4", "5"]) { await page.evaluate((t) => window.tickRuns(t), text); await frames(page, 2); }
        const { cells } = await counts(page);
        assert.ok(cells <= 5 * 4, `cells pointed at by five ticks: ${cells}`);
                await page.evaluate(() => window.tickRuns("A clock that has grown far too long for its column"));
        await page.waitForFunction(() => [...document.querySelectorAll("tbody tr")].find((r) => r.firstElementChild.textContent === "run-5").lastElementChild.hasAttribute("data-cut"));
        await page.evaluate(() => window.tickRuns("0"));
        await page.waitForFunction(() => ![...document.querySelectorAll("tbody tr")].find((r) => r.firstElementChild.textContent === "run-5").lastElementChild.hasAttribute("data-cut"));
      } finally { await page.close(); }
    });

    test("A1-19: every cell is read before any is written: a measuring recalculates style a handful of times however many cells change", async () => {
      const { page } = await open(theme);
      try {
        await page.locator("table").waitFor();
        await settle(page);
        await frames(page, 4);
        const mount = (await counts(page)).order;
        assert.match(mount, /^r+w+$/, "the mount measuring reads, then writes");
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Performance.enable");
        const recalcs = async () => (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === "RecalcStyleCount").value;
        const was = await cutCells(page);
        await page.evaluate(() => window.__reset());
        const before = await recalcs();
        // Wide spacing cuts the cells that were whole: many cells change at once.
        await page.evaluate(() => { const style = document.createElement("style"); style.textContent = "td, th { letter-spacing: 0.4em; }"; document.documentElement.append(style); });
        await page.waitForFunction((was) => document.querySelectorAll("[data-cut]").length > was + 100, was);
        await frames(page, 2);
        const after = await recalcs();
        const { order } = await counts(page);
        assert.match(order, /^r+w+$/, "one measuring: every read, then every write");
        assert.ok(after - before <= 8, `style recalculations for one measuring of ${CELLS} cells, ${order.split("w").length - 1} of them written: ${after - before}`);
      } finally { await page.close(); }
    });
  });
}

// ---- A1-20: the date and time parts make each Intl formatter once
const load = (file) => import(pathToFileURL(path.join(pkg, "dist", file)).href);
const counting = async (work) => {
  const Real = Intl.DateTimeFormat;
  let made = 0;
  Intl.DateTimeFormat = new Proxy(Real, { construct(target, args, newTarget) { made += 1; return Reflect.construct(target, args, newTarget); } });
  try { await work(); } finally { Intl.DateTimeFormat = Real; }
  return made;
};

describe("A1-20: formatters are made once for a locale and its options", () => {
  const AT = Date.UTC(2026, 10, 17, 14, 49, 7);
  test("the formatters of the time module, called 400 times each, make a handful in all and none the second time round", async () => {
    const time = await load("time-format.js");
    const round = () => {
      for (let i = 0; i < 400; i += 1) {
        const at = AT + i * 60_000;
        time.formatStamp(at, { timeZone: "UTC" });
        time.formatClock(at, { timeZone: "UTC" });
        time.formatDay(at, { timeZone: "UTC", now: AT });
        time.formatStatTime(at, { timeZone: "UTC", now: AT });
      }
    };
    const first = await counting(round);
    assert.ok(first <= 12, `formatters made in the first round: ${first}`);
    assert.equal(await counting(round), 0, "formatters made in the second round");
  });

  test("a column of 200 DateAge, rendered twice, makes a handful of formatters, and writes the words it did", async () => {
    const { DateAge } = await load("time.js");
    const column = () => renderToString(React.createElement("div", null, Array.from({ length: 200 }, (_, i) => React.createElement(DateAge, { key: i, time: AT - i * 3_600_000, now: AT, timeZone: "UTC" }))));
    let html = "";
    const first = await counting(() => { html = column(); });
    assert.ok(first <= 6, `formatters made for 200 DateAge: ${first}`);
    assert.equal(await counting(column), 0, "formatters made for the same column again");
    assert.match(html, /60 minutes ago/);
    assert.match(html, /dateTime="2026-11-16" class="basalt-time">Nov 16</);
    assert.match(html, /3 days ago/);
  });

  test("each zone and locale has a formatter of its own, and writes what a new one would", async () => {
    const time = await load("time-format.js");
    const tokyo = time.formatClock(AT, { timeZone: "Asia/Tokyo" });
    const newYork = time.formatClock(AT, { timeZone: "America/New_York" });
    assert.equal(tokyo.text, new Intl.DateTimeFormat(undefined, { timeZone: "Asia/Tokyo", hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(AT));
    assert.equal(tokyo.dateTime, "2026-11-17T23:49");
    assert.equal(newYork.dateTime, "2026-11-17T09:49");
    assert.equal(time.formatDay(AT, { timeZone: "UTC", now: AT, locale: "en-GB" }).text, "17 Nov");
    assert.equal(time.formatDay(AT, { timeZone: "UTC", now: AT, locale: "en-US" }).text, "Nov 17");
    assert.equal(time.formatDay(AT, { timeZone: "UTC", now: AT, locale: "en-GB" }).text, "17 Nov", "and en-GB again after en-US");
  });
});

// ---- A1-22: Reflow lays the list out a handful of times, however many items leave
const REFLOW = (count) => `const ITEMS = Array.from({ length: ${count} }, (_, i) => "item-" + i);
function List() {
  const [order, setOrder] = React.useState(ITEMS);
  window.setOrder = setOrder;
  window.reports = [];
  return <B.Reflow order={order} as="ul" layout="list" onReflow={(report) => window.reports.push(report)} style={{ listStyle: "none", margin: 0, padding: 16 }}>
    {ITEMS.map((id) => <B.ReflowItem key={id} itemKey={id} as="li" style={{ height: 20, margin: "4px 0" }}>{id}</B.ReflowItem>)}
  </B.Reflow>;
}
createRoot(document.getElementById("root")).render(<List />);`;

for (const theme of ["light", "dark"]) {
  describe(`A1-22: Reflow's layouts (${theme})`, () => {
    for (const [count, keep, animates] of [[60, 20, true], [500, 100, false]]) {
      test(`${count} items filtered to ${keep}: a handful of layouts, not two for each of the ${count - keep} that leave${animates ? "" : " (and past 48 on screen the change lands at once)"}`, async () => {
        const { page, errors } = await fixturePage(browser, REFLOW(count), { theme, viewport: { width: 800, height: count * 28 + 200 } });
        try {
          await page.locator("li").first().waitFor();
          await settle(page);
          const cdp = await page.context().newCDPSession(page);
          await cdp.send("Performance.enable");
          const metric = async (name) => (await cdp.send("Performance.getMetrics")).metrics.find((m) => m.name === name).value;
          const [layouts, styles] = [await metric("LayoutCount"), await metric("RecalcStyleCount")];
          await page.evaluate((keep) => { window.setOrder(Array.from({ length: keep }, (_, i) => "item-" + i)); }, keep);
          await page.waitForFunction(() => window.reports.length === 1);
          const [layoutsAfter, stylesAfter] = [await metric("LayoutCount"), await metric("RecalcStyleCount")];
          assert.ok(layoutsAfter - layouts <= 8, `layouts for ${count - keep} leavers: ${layoutsAfter - layouts}`);
          assert.ok(stylesAfter - styles <= 12, `style recalculations for ${count - keep} leavers: ${stylesAfter - styles}`);
          const report = await page.evaluate(() => window.reports[0]);
          assert.equal(report.atOnce, !animates);
          if (!animates) assert.ok(report.onScreen > 48, `${report.onScreen} would move`);
          await page.waitForFunction((keep) => document.querySelectorAll("li:not([hidden])").length === keep, keep);
          assert.deepEqual(errors, []);
        } finally { await page.close(); }
      });
    }
  });
}

// ---- A1-23: no declaration writes out a return type
describe("A1-23: declarations stay small", () => {
  const dist = path.join(pkg, "dist");
  const declarations = fs.readdirSync(dist).filter((file) => file.endsWith(".d.ts")).flatMap((file) => fs.readFileSync(path.join(dist, file), "utf8")
    .split(/\n(?=(?:export )?(?:declare |interface |type |\/\*\*))/)
    .map((text) => ({ file, text, name: /^(?:export )?declare (?:function|const) (\w+)/.exec(text.replace(/^\/\*\*[\s\S]*?\*\/\s*/, ""))?.[1] }))
    .filter((declaration) => declaration.name));
  // The longest an exported function or constant's declaration may be, doc comment apart. A component that returns `React.createElement(...)` with no declared type
  // writes the whole element type out (283 lines, about 19 KB), and the next one is caught here. The longest there is is `useReveal`, at 467.
  const LIMIT = 600;
  test("there are declarations to read", () => { assert.ok(declarations.length > 300, `${declarations.length}`); });
  test(`no exported function or constant's declaration is longer than ${LIMIT} bytes`, () => {
    assert.deepEqual(declarations.filter((declaration) => declaration.text.replace(/^\/\*\*[\s\S]*?\*\/\s*/, "").length > LIMIT).map((declaration) => `${declaration.file}: ${declaration.name} ${declaration.text.length}`), []);
  });
  test("no file in dist writes out the element type of createElement", () => {
    const written = fs.readdirSync(dist).filter((file) => file.endsWith(".d.ts") && /DetailedReactHTMLElement<\{|DOMElement<\{/.test(fs.readFileSync(path.join(dist, file), "utf8")));
    assert.deepEqual(written, []);
  });
  test("the five that did are declared", () => {
    for (const [file, name] of [["composition", "VisuallyHidden"], ["display", "CardTitle"], ["page", "PageRow"], ["page", "PageSections"], ["reflow", "ReflowItem"]]) {
      assert.match(fs.readFileSync(path.join(dist, `${file}.d.ts`), "utf8"), new RegExp(`declare function ${name}\\([^)]*\\): React\\.JSX\\.Element;`), name);
    }
  });
});

// ---- A1-24: an unchecked Checkbox draws no check glyph
describe("A1-24: the check glyph is drawn when the box is checked", () => {
  test("on the server an unchecked box has no svg, a checked one has the check, a mixed one the minus, and a thousand rows of boxes are 45% smaller", async () => {
    const { Checkbox } = await load("choice.js");
    const html = (props) => renderToString(React.createElement(Checkbox, { "aria-label": "Select", ...props }));
    assert.equal(html({}).includes("<svg"), false);
    assert.match(html({ defaultChecked: true }), /<svg[^>]*data-glyph="check"/);
    assert.match(html({ indeterminate: true }), /<svg[^>]*data-glyph="minus"/);
    const column = renderToString(React.createElement("div", null, Array.from({ length: 1000 }, (_, i) => React.createElement(Checkbox, { key: i, "aria-label": `Select ${i}` }))));
    // 785,839 bytes with the glyph in each box, 431,839 without.
    assert.ok(column.length < 450_000, `1,000 unchecked boxes: ${column.length} bytes`);
  });

  for (const theme of ["light", "dark"]) {
    test(`in the browser the glyph comes with the check and goes with it, and a box ticked by a click is the box that starts ticked (${theme})`, async () => {
      const { page } = await fixturePage(browser, `function Boxes() {
        const [on, setOn] = React.useState(false);
        return <div style={{ padding: 20, display: "flex", gap: 24 }}><B.Checkbox aria-label="A" checked={on} onCheckedChange={setOn} /><B.Checkbox aria-label="B" defaultChecked /><B.Checkbox aria-label="C" /></div>;
      }
      createRoot(document.getElementById("root")).render(<Boxes />);`, { theme, viewport: { width: 300, height: 80 } });
      try {
        await page.locator('[aria-label="A"]').waitFor();
        await settle(page);
        const svgs = () => page.evaluate(() => ["A", "B", "C"].map((id) => document.querySelector(`[role="checkbox"][aria-label="${id}"]`).querySelectorAll("svg").length));
        assert.deepEqual(await svgs(), [0, 1, 0]);
        await page.locator('[role="checkbox"][aria-label="A"]').click();
        await settle(page);
        assert.deepEqual(await svgs(), [1, 1, 0]);
        const box = (id) => page.locator(`[role="checkbox"][aria-label="${id}"]`).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
        const shot = async (id) => (await page.screenshot({ clip: await box(id) })).toString("base64");
        assert.equal(await shot("A"), await shot("B"), "ticked by a click, it is the box that began ticked");
        assert.notEqual(await shot("A"), await shot("C"));
        await page.locator('[role="checkbox"][aria-label="A"]').click();
        await settle(page);
        assert.deepEqual(await svgs(), [0, 1, 0]);
        assert.equal(await shot("A"), await shot("C"), "and unticked, the box that never was");
      } finally { await page.close(); }
    });
  }
});
