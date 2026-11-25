// cimip-gaps-3, batch E4 (engineering): Avatar's own initials (G31), a chart's days as a grid's cells (G18), a PanelList child that is not a PanelRow (G86), ListBand's
// seatTotal (G28), rangeTotal (G89) and keepFootRoom (G88), and SegmentedControl's radio semantics (G25), drawn with the same pixels. Driven in Chromium against the built
// package with the real stylesheet. Synthetic data, in two unlike domains (a shop's orders and a kitchen's recipes). Written while tests are paused (DECISIONS 359): not run yet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const open = async (body, { width = 900, height = 700, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const axe = async (page, rules) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (only) => {
    const options = only ? { runOnly: { type: "rule", values: only }, resultTypes: ["violations"] } : { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  }, rules);
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });

// ---- G31: Avatar's own initials ----

describe("Avatar initials (G31)", () => {
  test("the app's own initials replace the ones taken from the name's first and last words; the name stays what is said", async () => {
    const page = await open(`
createRoot(document.getElementById("root")).render(<div style={{ display: "flex", gap: 8, padding: 16 }}>
  <span id="taken"><B.Avatar name="Doe, Jane Q" /></span>
  <span id="own"><B.Avatar name="Doe, Jane Q" initials="jd" /></span>
  <span id="blank"><B.Avatar name="Ada Lovelace" initials="  " /></span>
  <span id="chef"><B.Avatar name="Okafor, Chidi" initials="CO" size={40} /></span>
  <span id="fallback"><B.Avatar name="Okafor, Chidi" initials="CO" fallback="?" /></span>
</div>);`);
    const read = (id) => page.evaluate((id) => { const root = document.querySelector(`#${id} .basalt-avatar`); return { role: root.getAttribute("role"), name: root.getAttribute("aria-label"), drawn: root.querySelector(".basalt-avatar-fallback")?.textContent }; }, id);
    assert.deepEqual(await read("taken"), { role: "img", name: "Doe, Jane Q", drawn: "DQ" }, "without the prop, as shipped");
    assert.deepEqual(await read("own"), { role: "img", name: "Doe, Jane Q", drawn: "JD" }, "the app's initials, upper-cased");
    assert.deepEqual(await read("blank"), { role: "img", name: "Ada Lovelace", drawn: "AL" }, "blank initials fall back to the name's");
    assert.deepEqual(await read("chef"), { role: "img", name: "Okafor, Chidi", drawn: "CO" });
    assert.equal((await read("fallback")).drawn, "?", "an explicit fallback still wins");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
});

// ---- G18: a chart's day is a grid's cell ----

const CHART = (activate) => `
const days = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 9, 20 + i)).toISOString().slice(0, 10));
const orders = days.map((_, i) => (i === 5 ? null : 20 + ((i * 7) % 11)));
const recipes = days.map((_, i) => 3 + ((i * 5) % 4));
createRoot(document.getElementById("root")).render(<div style={{ padding: 24, display: "grid", gap: 24 }}>
  <B.TimeChart id="orders" title="Orders" kind="bar" days={days} series={[{ id: "orders", name: "Orders", values: orders, reasons: days.map((_, i) => (i === 5 ? "store closed" : null)) }]} format={(v) => String(v)} now={Date.UTC(2026, 10, 2, 12)}
    summary="Orders averaged 25 a day; none were taken on the 25th, the store was closed." ${activate ? "onDayActivate={(i) => { window.opened = i; }} activateHint=\"opens the day\"" : ""} />
  <B.TimeChart id="recipes" title="Recipes tested" kind="line" days={days} series={[{ id: "recipes", name: "Recipes", values: recipes }]} format={(v) => String(v)} now={Date.UTC(2026, 10, 2, 12)}
    summary="Between three and six recipes were tested each day." />
  <button type="button" id="after">After</button>
</div>);`;

describe("TimeChart's days (G18)", () => {
  for (const theme of THEMES) {
    for (const activate of [false, true]) {
      test(`each day is a focusable gridcell in a grid's one row, so axe's focus-order-semantics passes, and each day's sentence (its name) is preserved (${theme}${activate ? ", activatable" : ""})`, async () => {
        const page = await open(CHART(activate), { theme });
        for (const id of ["orders", "recipes"]) {
          const grid = page.locator(`#${id} .basalt-chart-days`);
          assert.equal(await grid.getAttribute("role"), "grid");
          assert.equal(await grid.getAttribute("aria-roledescription"), "chart", "the plot is still said as a chart");
          assert.equal(await grid.locator(":scope > [role=row]").count(), 1);
          assert.equal(await grid.locator("[role=row] > [role=gridcell].basalt-chart-day").count(), 14);
          assert.equal(await grid.locator("[role=img]").count(), 0);
          assert.equal(await grid.locator("[tabindex='0']").count(), 1, "one tab stop");
          const row = await box(grid.locator("[role=row]"));
          assert.equal(row.height, 0, "the row has no box of its own");
          // The days are placed on the grid's own box: the first day starts at the plot's first slot, as before.
          const first = await box(grid.locator(".basalt-chart-day").first());
          const plot = await box(page.locator(`#${id} .basalt-chart-plot`));
          assert.ok(first.x >= plot.x && first.y >= plot.y && first.height > 40, JSON.stringify({ first, plot }));
        }
        assert.match(await page.locator("#orders .basalt-chart-day").nth(5).getAttribute("aria-label"), /not observed, store closed/, "the day's sentence is preserved as its name; what a screen reader adds for a grid's cell (its row and column) is not checked here");
        assert.deepEqual(await axe(page, ["focus-order-semantics", "aria-required-children", "aria-required-parent", "aria-allowed-role", "aria-allowed-attr"]), []);
        assert.deepEqual(await axe(page), []);
        // The keys still move a day, Tab leaves, and Enter still activates.
        await page.locator("#orders .basalt-chart-day[tabindex='0']").focus();
        await page.keyboard.press("Home");
        await page.keyboard.press("ArrowRight");
        assert.equal(await page.evaluate(() => document.activeElement.dataset.i), "1");
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute("role")), "gridcell");
        if (activate) { await page.keyboard.press("Enter"); assert.equal(await page.evaluate(() => window.opened), 1); }
        await page.keyboard.press("Tab");
        assert.notEqual(await page.evaluate(() => document.activeElement.getAttribute("role")), "gridcell", "Tab leaves the plot");
        assert.deepEqual(page.errors, []);
        await page.close();
      });
    }
  }
});

// ---- G86: a PanelList child that is not a PanelRow ----

const PANEL = `
const warnings = []; const warn = console.warn; console.warn = (...a) => { warnings.push(a.join(" ")); warn(...a); }; window.warnings = warnings;
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, display: "grid", gap: 24 }}>
  <B.PanelList id="faq" aria-label="Shipping questions">
    {["Where is my order?", "Can I change my address?", "How do returns work?", "Do you ship abroad?"].map((q) => <li key={q}><B.DisclosureRow title={q}>Synthetic answer to: {q}</B.DisclosureRow></li>)}
  </B.PanelList>
  <B.PanelList id="mixed" aria-label="Recipes">
    <B.PanelRow title="Sourdough" description="A two-day loaf" trailing="2 d" />
    <li><B.DisclosureRow title="Notes on the starter">Feed it at 1:1:1.</B.DisclosureRow></li>
    <B.PanelRow title="Focaccia" description="A sheet-pan bread" trailing="5 h" />
  </B.PanelList>
</div>);`;

describe("PanelList with other children (G86)", () => {
  for (const width of [900, 390]) {
    test(`a child that is not a PanelRow is laid across the full row, never one of the columns (${width})`, async () => {
      const page = await open(PANEL, { width });
      for (const id of ["faq", "mixed"]) {
        const list = page.locator(`#${id}`);
        const inner = await list.evaluate((el) => el.clientWidth);
        const widths = await list.evaluate((el) => [...el.children].map((child) => child.getBoundingClientRect().width));
        for (const w of widths) assert.ok(Math.abs(w - inner) < 0.51, `${id}: every child is the list's full width (${widths} of ${inner})`);
        const xs = await list.evaluate((el) => [...el.children].map((child) => child.getBoundingClientRect().left));
        assert.equal(new Set(xs.map((x) => Math.round(x))).size, 1, `${id}: every child starts at the list's start; none alternates columns`);
      }
      // A PanelRow's own columns are unchanged beside it: its title and its trailing value are on one line.
      const row = await box(page.locator("#mixed .basalt-panel-row").first());
      const end = await box(page.locator("#mixed .basalt-panel-row-end").first());
      assert.ok(end.x + end.width <= row.x + row.width && end.y < row.y + row.height / 2);
      assert.deepEqual(await page.evaluate(() => window.warnings), [], "an li of the app's own is a list's item: nothing is reported");
      await page.close();
    });
  }

  test("in development, a direct child that is not an li is reported once (a list holds only items)", async () => {
    // An app's development build: the fixtures are production builds, which drop the warning.
    const page = await open("");
    const built = await esbuild.build({
      stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js";
const warnings = []; console.warn = (...a) => warnings.push(a.join(" ")); window.warnings = warnings;
createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}>
  <B.PanelList aria-label="Orders"><B.DisclosureRow title="Order 1042">Two items.</B.DisclosureRow><B.DisclosureRow title="Order 1043">One item.</B.DisclosureRow></B.PanelList>
  <B.PanelList aria-label="Recipes"><B.DisclosureRow title="Sourdough">Two days.</B.DisclosureRow></B.PanelList>
</div>);`, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"development"' },
    });
    await page.addScriptTag({ content: built.outputFiles[0].text });
    await settle(page);
    const warnings = await page.evaluate(() => window.warnings);
    const ours = warnings.filter((w) => w.startsWith("Basalt PanelList"));
    assert.equal(ours.length, 1, warnings.join("\n"));
    assert.match(ours[0], /<div> is a direct child/);
    // and it is still laid across the full row
    const widths = await page.locator(".basalt-panel-list").first().evaluate((el) => [...el.children].map((c) => Math.round(c.getBoundingClientRect().width)));
    assert.equal(new Set(widths).size, 1);
    assert.ok(widths[0] > 300);
    await page.close();
  });

  test("PanelList's ref: a React 19 callback ref's cleanup runs on unmount and on a new ref, an object ref is filled and emptied, and a ref that returns nothing is called with null", async () => {
    const page = await open(`
const log = []; window.log = log;
const box = React.createRef(); window.box = box;
const first = (el) => { log.push(["first", el ? el.tagName : null]); return () => log.push(["first cleanup"]); };
const second = (el) => { log.push(["second", el ? el.tagName : null]); return () => log.push(["second cleanup"]); };
const plain = (el) => { log.push(["plain", el ? el.tagName : null]); };
function App() {
  const [which, setWhich] = React.useState("first");
  const [shown, setShown] = React.useState(true);
  window.use = (w) => flushSync(() => setWhich(w));
  window.hide = () => flushSync(() => setShown(false));
  const ref = { first, second, plain, object: box }[which];
  return shown ? <B.PanelList ref={ref} aria-label="Orders"><B.PanelRow title="Order 1042" /></B.PanelList> : null;
}
createRoot(document.getElementById("root")).render(<App />);`);
    const log = () => page.evaluate(() => window.log.splice(0));
    assert.deepEqual(await log(), [["first", "UL"]]);
    await page.evaluate(() => window.use("second"));
    assert.deepEqual(await log(), [["first cleanup"], ["second", "UL"]], "a new ref: the old one's cleanup, then the new one");
    await page.evaluate(() => window.use("plain"));
    assert.deepEqual(await log(), [["second cleanup"], ["plain", "UL"]]);
    await page.evaluate(() => window.use("object"));
    assert.deepEqual(await log(), [["plain", null]], "a ref that returned nothing is called with null");
    assert.equal(await page.evaluate(() => window.box.current?.tagName), "UL");
    await page.evaluate(() => window.hide());
    assert.equal(await page.evaluate(() => window.box.current), null, "unmounted: the object ref is emptied");
    await page.close();
  });
});

// ---- G28, G88 and G89: ListBand ----

const BAND = (props, { later = 0, rows = 0, step = 0 } = {}) => `
document.body.style.margin = "0";
function App() {
  const [total, setTotal] = React.useState(${rows});
  const [page, setPage] = React.useState(1);
  React.useEffect(() => { window.answer = (n) => setTotal(n); ${later ? `const t = setTimeout(() => setTotal(${later}), ${step}); return () => clearTimeout(t);` : ""} }, []);
  const shown = Array.from({ length: Math.min(10, Math.max(0, total - (page - 1) * 10)) }, (_, i) => (page - 1) * 10 + i + 1);
  return <div style={{ padding: "16px 16px 0" }}>
    <B.FilterResult>{"Showing " + total + " orders"}</B.FilterResult>
    <B.ListBand id="band" total={total} page={page} pageSize={10} onPageChange={setPage} noun="Orders" footLabel="Order pages, end of list" ${props}>
      <ul id="rows" style={{ listStyle: "none", margin: 0, padding: 0 }}>{shown.map((n) => <li key={n} style={{ height: 40 }}>Order {n}</li>)}</ul>
    </B.ListBand>
    <p id="under">Under the list</p>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;
const seatWidth = (page) => page.locator(".basalt-list-band-row .basalt-list-band-range-seat").evaluate((el) => el.getBoundingClientRect().width);
const slotWidth = (page) => page.locator(".basalt-list-band-row .basalt-pagination-reserve > *").first().evaluate((el) => el.getBoundingClientRect().width);

describe("ListBand seatTotal (G28)", () => {
  test("the count's seat and the pager's slots are drawn for seatTotal before the first answer, and do not grow on it", async () => {
    const page = await open(BAND(`seatTotal={9999}`), { width: 1200 });
    const before = { seat: await seatWidth(page), slot: await slotWidth(page) };
    const reference = await open(BAND(`maxTotal={9999}`, { rows: 704 }), { width: 1200 });
    assert.deepEqual(before, { seat: await seatWidth(reference), slot: await slotWidth(reference) }, "the seats at 0 rows with seatTotal are the seats of a known 9999");
    await page.evaluate(() => window.answer(704));
    await settle(page);
    assert.deepEqual({ seat: await seatWidth(page), slot: await slotWidth(page) }, before, "the first answer moves no seat");
    // Without it, the seats grow on the first answer (the fault): the reason for the prop.
    const plain = await open(BAND(""), { width: 1200 });
    const empty = await seatWidth(plain);
    await plain.evaluate(() => window.answer(704));
    await settle(plain);
    assert.ok((await seatWidth(plain)) > empty);
    // A count past seatTotal still grows them, once.
    await page.evaluate(() => window.answer(12000));
    await settle(page);
    assert.ok((await seatWidth(page)) > before.seat);
    for (const p of [page, reference, plain]) await p.close();
  });
});

describe("ListBand rangeTotal (G89)", () => {
  test("rangeTotal={false} drops \"of N\" from the band's count and the foot's, with a seat to match; the spoken page change still says the total", async () => {
    const page = await open(BAND(`rangeTotal={false} maxTotal={704}`, { rows: 704 }), { width: 390, height: 900 });
    const texts = await page.evaluate(() => [...document.querySelectorAll(".basalt-list-band-range-seat")].map((el) => el.querySelector(":scope > [data-on]")?.textContent));
    assert.equal(texts.length, 3, "the band's count, the narrow pager's and the foot's");
    for (const t of texts) { assert.equal(t, "1–10"); assert.doesNotMatch(t, /of/); }
    const shipped = await open(BAND(`maxTotal={704}`, { rows: 704 }), { width: 390, height: 900 });
    const full = await shipped.evaluate(() => [...document.querySelectorAll(".basalt-list-band-range-seat")].map((el) => el.querySelector(":scope > [data-on]")?.textContent));
    for (const t of full) assert.equal(t, "1–10 of 704", "the default is as shipped");
    await page.locator(".basalt-list-band-foot").getByRole("button", { name: "Next page" }).click();
    await page.waitForFunction(() => document.querySelector(".basalt-list-band [role=status], .basalt-list-band [aria-live]")?.textContent.includes("of 704"));
    assert.match(await page.locator(".basalt-list-band [aria-live]").first().textContent(), /Page 2 of 71\. Orders 11 to 20 of 704\./);
    await page.close();
    await shipped.close();
  });
});

describe("ListBand keepFootRoom (G88)", () => {
  for (const theme of THEMES) {
    test(`under 720 the held foot keeps its room from the first frame, so rows that arrive move nothing under the list's foot by the foot (${theme})`, async () => {
      // 0 rows at first, 3 then 40 after an answer: the foot's room is there throughout.
      const page = await open(BAND(`keepFootRoom seatTotal={9999}`), { width: 390, height: 900, theme });
      const foot = page.locator(".basalt-list-band-foot");
      assert.equal(await foot.evaluate((el) => el.hidden), false);
      const at0 = await box(foot);
      assert.ok(at0.height > 40, "the foot's room is held at no rows");
      assert.equal(await foot.locator("[aria-label='Previous page']").evaluate((el) => getComputedStyle(el).visibility), "hidden");
      assert.equal(await foot.locator("nav, [role=none]").first().getAttribute("role"), "none", "no empty landmark is read out");
      await page.evaluate(() => window.answer(3));
      await settle(page);
      const at3 = await box(foot);
      assert.equal(at3.height, at0.height, "one page: the same room");
      await page.evaluate(() => window.answer(40));
      await settle(page);
      assert.equal((await box(foot)).height, at0.height, "four pages: the same room, now drawn");
      assert.equal(await foot.locator("[aria-label='Next page']").evaluate((el) => getComputedStyle(el).visibility), "visible");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  // keepFootRoom is opt-in, pending the council's decision on the default (topic T3; DECISIONS 227 removed this empty room at the owner's objection).
  for (const [name, prop] of [["left out", ""], ["false", "keepFootRoom={false}"]]) {
    test(`opt-in: with the prop ${name}, the foot is as shipped: hidden at one page and at none, drawn from two`, async () => {
      const page = await open(BAND(prop, { rows: 3 }), { width: 390, height: 900 });
      const foot = page.locator(".basalt-list-band-foot");
      assert.equal(await foot.evaluate((el) => el.hidden), true, "one page: no foot");
      assert.equal(await foot.evaluate((el) => getComputedStyle(el).display), "none");
      await page.evaluate(() => window.answer(0));
      await settle(page);
      assert.equal(await foot.evaluate((el) => el.hidden), true, "no rows: no foot");
      await page.evaluate(() => window.answer(40));
      await settle(page);
      assert.equal(await foot.evaluate((el) => el.hidden), false, "four pages: the foot");
      assert.equal(await foot.locator("nav").getAttribute("aria-label"), "Order pages, end of list");
      await page.close();
    });
  }

  test("keepFootRoom={true} is the same as the bare prop, and from 720 the foot is never drawn either way", async () => {
    const page = await open(BAND("keepFootRoom={true}", { rows: 3 }), { width: 390, height: 900 });
    assert.equal(await page.locator(".basalt-list-band-foot").evaluate((el) => el.hidden), false);
    assert.ok((await box(page.locator(".basalt-list-band-foot"))).height > 40);
    const wide = await open(BAND("keepFootRoom", { rows: 3 }), { width: 1200 });
    assert.equal(await wide.locator(".basalt-list-band-foot").evaluate((el) => getComputedStyle(el).display), "none");
    await page.close();
    await wide.close();
  });
});

// ---- G25: SegmentedControl as a radiogroup ----

const SEGMENTS = `
function Pair({ radio, id, name, options, required, wrapped, disabled = [], start }) {
  const [value, setValue] = React.useState(start ?? options[0]);
  const segments = options.map((o) => <B.Segment key={o} value={o} disabled={disabled.includes(o)}>{o}</B.Segment>);
  return <div id={id} style={{ padding: 12 }}><B.SegmentedControl radio={radio} aria-label={name} value={value} onValueChange={setValue} required={required}>
    {wrapped ? <>{segments}</> : segments}
  </B.SegmentedControl></div>;
}
createRoot(document.getElementById("root")).render(<div style={{ display: "grid", gap: 8, background: "var(--basalt-surface-page)" }}>
  <button type="button" id="before">Before</button>
  <Pair id="pressed" name="Order view" options={["Open", "Shipped", "Returned"]} />
  <Pair id="radio" radio name="Order view" options={["Open", "Shipped", "Returned"]} />
  <Pair id="kitchen" radio required name="Recipe course" options={["Starter", "Main", "Dessert", "Drink"]} />
  <Pair id="skip" radio name="Delivery" options={["Standard", "Express", "Overnight", "Pickup"]} disabled={["Express"]} />
  <Pair id="wrapped" radio wrapped name="Recipe time" options={["Quick", "Weekday", "Weekend"]} start="Weekday" />
  <button type="button" id="after">After</button>
</div>);`;

describe("SegmentedControl radio (G25)", () => {
  for (const theme of THEMES) {
    test(`radio: a radiogroup of radios with aria-checked, drawn with exactly the pressed group's pixels (${theme})`, async () => {
      const page = await open(SEGMENTS, { theme });
      const group = page.locator("#radio .basalt-segmented");
      assert.equal(await group.getAttribute("role"), "radiogroup");
      const radios = group.locator(".basalt-segment");
      assert.equal(await radios.count(), 3);
      assert.deepEqual(await radios.evaluateAll((els) => els.map((e) => [e.getAttribute("role"), e.getAttribute("aria-checked"), e.hasAttribute("aria-pressed")])), [["radio", "true", false], ["radio", "false", false], ["radio", "false", false]]);
      // the pressed group is untouched
      assert.equal(await page.locator("#pressed .basalt-segmented").getAttribute("role"), "group");
      assert.deepEqual(await page.locator("#pressed .basalt-segment").evaluateAll((els) => els.map((e) => e.getAttribute("aria-pressed"))), ["true", "false", "false"]);
      // the same pixels: the two groups' shots are identical
      const a = await page.locator("#pressed .basalt-segmented").screenshot();
      const b = await page.locator("#radio .basalt-segmented").screenshot();
      assert.ok(a.equals(b), "the radio group draws the pressed group's pixels");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }

  test("Tab lands on the checked radio; the arrows (and Home and End) move focus and check; Space on the checked one keeps it", async () => {
    const page = await open(SEGMENTS);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    // the pressed group's stop, then the radio group's checked radio
    assert.equal(await page.evaluate(() => document.activeElement.closest("[id]").id), "radio");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Open");
    await page.keyboard.press("ArrowRight");
    const checked = () => page.locator("#radio .basalt-segment[aria-checked=true]").textContent();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Shipped");
    assert.equal(await checked(), "Shipped", "the arrow checks what it reaches");
    assert.equal(await page.locator("#radio .basalt-segment[data-pressed]").textContent(), "Shipped", "and the drawn choice follows");
    await page.keyboard.press("End");
    assert.equal(await checked(), "Returned");
    await page.keyboard.press("Home");
    assert.equal(await checked(), "Open");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await checked(), "Returned", "the arrows loop, as radios do");
    await page.keyboard.press("Space");
    assert.equal(await checked(), "Returned");
    // In the pressed group the arrows still only move focus.
    await page.locator("#pressed .basalt-segment[aria-pressed=true]").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#pressed .basalt-segment[aria-pressed=true]").textContent(), "Open");
    await page.close();
  });

  test("Up and Down move and check as Right and Left do, and every arrow skips a disabled segment", async () => {
    const page = await open(SEGMENTS);
    const checked = (id) => page.locator(`#${id} .basalt-segment[aria-checked=true]`).textContent();
    const focused = () => page.evaluate(() => document.activeElement.textContent);
    await page.locator("#radio .basalt-segment[aria-checked=true]").focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await focused(), "Shipped");
    assert.equal(await checked("radio"), "Shipped", "Down checks the next");
    await page.keyboard.press("ArrowUp");
    assert.equal(await focused(), "Open");
    assert.equal(await checked("radio"), "Open", "Up checks the one before");
    await page.keyboard.press("ArrowUp");
    assert.equal(await checked("radio"), "Returned", "Up loops from the first");
    // Delivery: Express is disabled. From Standard, Right and Down both pass it to Overnight; Left and Up from Overnight pass it back.
    await page.locator("#skip .basalt-segment[aria-checked=true]").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await focused(), "Overnight");
    assert.equal(await checked("skip"), "Overnight", "Right skips the disabled segment");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await checked("skip"), "Standard", "Left skips it back");
    await page.keyboard.press("ArrowDown");
    assert.equal(await checked("skip"), "Overnight", "Down skips it");
    await page.keyboard.press("ArrowUp");
    assert.equal(await checked("skip"), "Standard", "Up skips it");
    assert.equal(await page.locator("#skip .basalt-segment", { hasText: "Express" }).getAttribute("aria-checked"), "false");
    await page.close();
  });

  test("segments in a fragment: focus and the check stay together, and Tab comes back to the checked segment", async () => {
    const page = await open(SEGMENTS);
    const checked = () => page.locator("#wrapped .basalt-segment[aria-checked=true]").textContent();
    const focused = () => page.evaluate(() => document.activeElement.textContent);
    await page.locator("#after").focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await focused(), "Weekday", "Tab (back) lands on the checked segment, not the first");
    await page.keyboard.press("ArrowRight");
    assert.equal(await focused(), "Weekend");
    assert.equal(await checked(), "Weekend", "the reached segment's own value is checked");
    assert.equal(await page.locator("#wrapped .basalt-segment[data-pressed]").textContent(), "Weekend", "and the drawn choice follows");
    await page.keyboard.press("ArrowDown");
    assert.equal(await checked(), "Quick", "Down loops");
    // Leave and come back: the one stop is the checked segment.
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "after");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await focused(), "Quick");
    assert.deepEqual(await page.locator("#wrapped .basalt-segment").evaluateAll((els) => els.map((e) => e.tabIndex)), [0, -1, -1], "one tab stop, on the checked segment");
    await page.close();
  });

  test("a group of pressed buttons keeps Base UI's role=group, and a caller's own role is kept", async () => {
    const page = await open(`
createRoot(document.getElementById("root")).render(<div>
  <span id="plain"><B.SegmentedControl aria-label="Order view" defaultValue="a"><B.Segment value="a">Open</B.Segment><B.Segment value="b">Shipped</B.Segment></B.SegmentedControl></span>
  <span id="own"><B.SegmentedControl role="toolbar" aria-label="Recipe view" defaultValue="a"><B.Segment value="a">Grid</B.Segment><B.Segment value="b">List</B.Segment></B.SegmentedControl></span>
</div>);`);
    assert.equal(await page.locator("#plain .basalt-segmented").getAttribute("role"), "group");
    assert.equal(await page.locator("#own .basalt-segmented").getAttribute("role"), "toolbar");
    await page.close();
  });

  test("a required radiogroup takes aria-required, and its name keeps no added word", async () => {
    const page = await open(SEGMENTS);
    const group = page.locator("#kitchen .basalt-segmented");
    assert.equal(await group.getAttribute("aria-required"), "true");
    assert.equal(await group.getAttribute("aria-label"), "Recipe course");
    assert.equal(await page.getByRole("radiogroup", { name: "Recipe course" }).count(), 1);
    assert.equal(await page.getByRole("radio", { name: "Dessert" }).getAttribute("aria-checked"), "false");
    await page.close();
  });
});
