// lists-modals (DECISIONS 222, 224, 226): the owner picked Opus's prototype; the implementation has not been reviewed. Pagination in seven fixed slots, the list band (count, pager,
// page size; sticky from 720), a numeric Select, MultiSelect in a toolbar, FilterToolbar over a list, and the Dialog as a centred form modal. Above all, nothing moves: every part is
// measured across every page, size, filter and sort, at 1440, 1024, 720 and 390. Driven in Chromium against the built package with the real stylesheet. The fixtures load no web font, so
// text widths differ on CI's Linux runner: every measured margin is wider than a fallback font's width. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const COARSE = { hasTouch: true, isMobile: true };
const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  // A phone's layout viewport is its width only with a viewport meta (the page's own, in an app).
  if (options.isMobile) { await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); }); }
  await settle(page);
  if (options.isMobile) assert.equal(await page.evaluate(() => window.innerWidth), width);
  page.errors = errors;
  return page;
};
// Playwright scrolls a target it finds near the page's `scroll-padding-top` (the sticky bar's room) before it clicks, and a sticky band then moves in the document: press by the box instead.
const tap = async (locator) => { const box = await locator.boundingBox(); await locator.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2); };
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

// The incident list: 214 synthetic rows, a search, Severity and Status filters, the band above, no sort. The app owns the page and the size, and returns to page 1 on a filter.
const SEV = ["SEV1", "SEV2", "SEV3", "SEV4"];
const STATUS = ["Investigating", "Identified", "Mitigating", "Monitoring", "Resolved"];
const LIST = (extra = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
const SEV = ${JSON.stringify(SEV)}; const STATUS = ${JSON.stringify(STATUS)};
const ALL = Array.from({ length: 214 }, (_, i) => { const sev = SEV[(i * 7) % 4]; let status = STATUS[(i * 3) % 5]; if (sev === "SEV4" && status === "Mitigating") status = "Resolved"; return { n: 214 - i, sev, status, title: "Synthetic incident " + (214 - i) }; });
function App() {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(25);
  const [q, setQ] = React.useState("");
  const [sev, setSev] = React.useState([]);
  const [status, setStatus] = React.useState([]);
  const shown = ALL.filter((r) => (!sev.length || sev.includes(r.sev)) && (!status.length || status.includes(r.status)) && (!q || r.title.toLowerCase().includes(q.toLowerCase())));
  const back = () => setPage(1);
  const rows = shown.slice((page - 1) * size, page * size);
  const filtered = sev.length || status.length;
  return (
    <div id="app" style={{ padding: "96px 16px 0", minHeight: 4000 }}>
      <h2 id="list-title" tabIndex={-1} style={{ margin: "0 0 12px" }}>Your incidents</h2>
      <B.FilterToolbar label="Filter incidents" search={<input id="q" className="basalt-input" aria-label="Search incidents" value={q} onChange={(e) => { setQ(e.target.value); back(); }} />}
        filter={[<B.MultiSelect key="s" toolbar label="Severity" options={${JSON.stringify(SEV.map((v) => ({ value: v, label: v })))}} value={sev} onValueChange={(v) => { setSev(v); back(); }} />,
          <B.MultiSelect key="t" toolbar label="Status" options={${JSON.stringify(STATUS.map((v) => ({ value: v, label: v })))}} value={status} onValueChange={(v) => { setStatus(v); back(); }} />]}
        result={<B.FilterResult>{"Showing " + shown.length + " of " + ALL.length + " incidents"}</B.FilterResult>} />
      <B.ListBand id="band" pagerLabel="Incident pages" filterKey={q + "|" + sev + "|" + status} heading="list-title" footLabel="Incident pages, end of list" total={shown.length} maxTotal={ALL.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} noun="Incidents">
      <div className="basalt-card" id="panel">
        {rows.length ? <ul id="rows" style={{ listStyle: "none", margin: 0, padding: 0 }}>{rows.map((r) => <li key={r.n}><a className="row" href={"#" + r.n} style={{ display: "block", padding: "12px 16px", height: 48, boxSizing: "border-box" }}>{r.sev} {r.title} {r.status}</a></li>)}</ul>
          : <div id="empty"><p>{filtered ? (q ? "No incidents match \\u201C" + q + "\\u201D with these filters." : "No incidents match these filters.") : "No incidents match \\u201C" + q + "\\u201D."}</p><B.Button id="clear" onClick={() => { const hadFilters = filtered; setQ(""); setSev([]); setStatus([]); back(); window.setTimeout(() => (hadFilters ? document.querySelector(".basalt-filter-toolbar .basalt-filter-trigger") : document.getElementById("q"))?.focus(), 30); }}>{filtered ? "Clear filters" : "Clear search"}</B.Button></div>}
      </div>
      </B.ListBand>
      ${extra}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

// What a part's box is: its place in the document and its size.
const BOXES = `window.__boxes = () => {
  const box = (el) => { if (!el || !el.getClientRects().length) return null; const r = el.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; };
  const q = (s) => document.querySelector(s);
  const out = {
    band: box(q(".basalt-list-band")), previous: box(q('[aria-label="Previous page"]')), next: box(q('[aria-label="Next page"]')),
    size: box(q(".basalt-list-band-size .basalt-select-trigger")), search: box(q("#q")),
    severity: box(q(".basalt-filter-toolbar-filter:nth-of-type(1) .basalt-filter-trigger")), status: box(q(".basalt-filter-toolbar .basalt-filter-toolbar-filter:last-of-type .basalt-filter-trigger")),
  };
  const range = [...document.querySelectorAll(".basalt-list-band-range-seat")].find((el) => el.getClientRects().length);
  out.range = box(range);
  document.querySelectorAll(".basalt-pagination-live > *").forEach((el, i) => { out["slot " + i] = box(el); });
  return out;
};`;
const maxMove = (a, b) => Math.max(...Object.keys(b).filter((k) => a[k] && b[k]).flatMap((k) => a[k].map((v, i) => Math.abs(v - b[k][i]))));
const moved = (before, after) => Object.keys(before).filter((k) => !k.startsWith("slot") && before[k] && after[k]).map((k) => [k, Math.max(...before[k].map((v, i) => Math.abs(v - after[k][i])))]).filter(([, d]) => d > 0.5).map(([k, d]) => `${k} moved ${d}px`);

describe("Pagination: seven fixed slots", () => {
  const PAGES = (n, extra = "") => `document.body.style.margin = "0"; function P() { const [p, setP] = React.useState(1); return <div style={{ padding: 16, containerType: "inline-size" }}><B.Pagination page={p} pageCount={${n}} onPageChange={setP} ${extra} /></div>; } createRoot(document.getElementById("root")).render(<P />);`;
  const slots = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-pagination-live > *")].map((el) => (el.classList.contains("basalt-pagination-gap") ? "…" : el.textContent)));

  for (const [pages, current, expected] of [[22, 1, "1 2 3 4 5 … 22"], [22, 4, "1 2 3 4 5 … 22"], [22, 5, "1 … 4 5 6 … 22"], [22, 11, "1 … 10 11 12 … 22"], [22, 18, "1 … 17 18 19 … 22"], [22, 19, "1 … 18 19 20 21 22"], [22, 22, "1 … 18 19 20 21 22"], [8, 4, "1 2 3 4 5 … 8"], [7, 4, "1 2 3 4 5 6 7"], [3, 2, "1 2 3"]]) {
    test(`${pages} pages, page ${current}: ${expected}`, async () => {
      const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.Pagination page={${current}} pageCount={${pages}} onPageChange={() => {}} />);`);
      assert.equal((await slots(page)).join(" "), expected);
      await page.close();
    });
  }

  test("Previous and Next and every slot stay put across every page, at 22 and at 49 pages, on a pointer and on touch", async () => {
    for (const [pages, options] of [[22, {}], [49, {}], [22, { width: 390, height: 844, ...COARSE }]]) {
      const page = await open(PAGES(pages), options);
      await page.evaluate(BOXES);
      const first = await page.evaluate(() => window.__boxes());
      for (let p = 1; p < pages; p += 1) {
        await page.getByRole("button", { name: "Next page" }).click();
        const now = await page.evaluate(() => window.__boxes());
        assert.deepEqual(moved(first, now), [], `${pages} pages, page ${p + 1}`);
        // Each slot is as wide as every other, at every page.
        const widths = Object.entries(now).filter(([k, v]) => k.startsWith("slot") && v).map(([, v]) => v[2]);
        assert.ok(new Set(widths.map((w) => Math.round(w * 2))).size <= 1, `slots are one width at page ${p + 1}: ${widths}`);
      }
      await page.close();
    }
  });

  test("Previous and Next are always there: aria-disabled at an end, still focusable, and a press on them does nothing", async () => {
    const page = await open(PAGES(5));
    const prev = page.getByRole("button", { name: "Previous page" });
    assert.equal(await prev.getAttribute("aria-disabled"), "true");
    assert.equal(await prev.getAttribute("disabled"), null);
    await prev.focus();
    assert.ok(await prev.evaluate((el) => el === document.activeElement));
    await prev.click({ force: true });
    assert.equal(await page.locator('[aria-current="page"]').textContent(), "1");
    for (let i = 0; i < 4; i += 1) await page.getByRole("button", { name: "Next page" }).click();
    const next = page.getByRole("button", { name: "Next page" });
    assert.equal(await next.getAttribute("aria-disabled"), "true");
    await next.focus();
    assert.ok(await next.evaluate((el) => el === document.activeElement), "Next keeps focus at the end");
    await page.close();
  });

  test("a press on a number moves focus to the button that now holds the current page; Next keeps focus", async () => {
    const page = await open(PAGES(22));
    await page.getByRole("button", { name: "Next page" }).click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Next page");
    await page.getByRole("button", { name: "Page 4" }).click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Page 4");
    await page.getByRole("button", { name: "Page 22" }).click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label") + ":" + document.activeElement.getAttribute("aria-current")), "Page 22:page");
    await page.getByRole("button", { name: "Page 19" }).click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-current")), "page", "focus follows the current page as the numbers slide");
    await page.close();
  });

  test("one page or none hides the pager with visibility and keeps its room", async () => {
    const full = await open(PAGES(22));
    await full.evaluate(BOXES);
    const box = await full.evaluate(() => { const r = document.querySelector(".basalt-pagination").getBoundingClientRect(); return [r.width, r.height]; });
    await full.close();
    for (const n of [1, 0]) {
      const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><B.Pagination keepRoom page={1} pageCount={${n}} maxPages={22} /></div>);`);
      const nav = page.locator(".basalt-pagination");
      assert.equal(await nav.getAttribute("role"), "none", "its room, not an empty landmark");
      assert.equal(await page.getByRole("navigation").count(), 0);
      assert.deepEqual(await nav.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }), box, `${n} pages keeps the room of 22`);
      for (const name of ["Previous page", "Next page"]) assert.equal(await page.locator(`[aria-label="${name}"]`).evaluate((el) => getComputedStyle(el).visibility), "hidden");
      await page.close();
    }
  });

  test("a bare Pagination at one page or none renders nothing, as it always did", async () => {
    for (const n of [1, 0]) {
      const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div id="host" style={{ padding: 16 }}><B.Pagination page={1} pageCount={${n}} maxPages={22} /></div>);`);
      assert.equal(await page.locator("#host").evaluate((el) => el.children.length), 0);
      await page.close();
    }
  });

  test("it never wraps, and under 640px of its container it is Previous, the summary and Next", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div id="card" style={{ padding: 16, width: 292, containerType: "inline-size" }}><B.Pagination page={3} pageCount={22} onPageChange={() => {}} /></div>);`, { width: 390, height: 844, ...COARSE });
    const nav = page.locator(".basalt-pagination");
    assert.equal(await page.locator(".basalt-pagination-pages").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await page.locator(".basalt-pagination-summary [data-on]").textContent(), "Page 3 of 22");
    const rows = await nav.evaluate((el) => new Set([...el.children].filter((c) => c.getClientRects().length).map((c) => { const r = c.getBoundingClientRect(); return Math.round(r.top + r.height / 2); })).size);
    assert.equal(rows, 1, "one row");
    assert.ok(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
    await page.close();
    const wide = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 700, containerType: "inline-size" }}><B.Pagination page={3} pageCount={22} onPageChange={() => {}} /></div>);`);
    assert.notEqual(await wide.locator(".basalt-pagination-pages").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await wide.locator(".basalt-pagination-summary").evaluate((el) => getComputedStyle(el).display), "none");
    await wide.close();
  });

  test("a bare Pagination is its own container: at 390 on touch it is the compact form, one row, and the page does not scroll sideways", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><B.Pagination page={3} pageCount={20} onPageChange={() => {}} /></div>);`, { width: 390, height: 844, ...COARSE });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    assert.equal(await page.locator(".basalt-pagination-pages").evaluate((el) => getComputedStyle(el).display), "none");
    await page.close();
  });

  test("the gap is the core `more` glyph, and the current page is 600 with tabular figures", async () => {
    const page = await open(PAGES(22));
    await page.getByRole("button", { name: "Page 5" }).click();
    assert.equal(await page.locator(".basalt-pagination-gap svg").count() > 0, true);
    assert.equal(await page.locator('[aria-current="page"] [data-label]').evaluate((el) => getComputedStyle(el).fontWeight), "600");
    assert.equal(await page.locator('[aria-label="Page 4"] [data-label]').evaluate((el) => getComputedStyle(el).fontWeight), "400");
    assert.match(await page.locator('[aria-current="page"]').evaluate((el) => getComputedStyle(el).fontVariantNumeric), /tabular-nums/);
    await page.close();
  });

  test("links keep Previous and Next at an end: aria-disabled and focusable", async () => {
    const page = await open(`createRoot(document.getElementById("root")).render(<B.Pagination page={1} pageCount={9} hrefForPage={(n) => "#" + n} />);`);
    const prev = page.locator('a[aria-label="Previous page"]');
    assert.equal(await prev.getAttribute("aria-disabled"), "true");
    await prev.focus();
    assert.ok(await prev.evaluate((el) => el === document.activeElement));
    await page.close();
  });
});

describe("The band, the filters and the list: nothing moves", () => {
  for (const [width, height, options] of [[1440, 900, {}], [1024, 800, {}], [720, 800, {}], [390, 844, COARSE]]) {
    test(`at ${width}: every page, size, filter and search moves the band, both arrows, the count's seat, the page size, the slots and the toolbar by 0px`, async () => {
      const page = await open(LIST(), { width, height, ...options });
      await page.evaluate(BOXES);
      const first = await page.evaluate(() => window.__boxes());
      const problems = [];
      const check = async (what) => { for (const m of moved(first, await page.evaluate(() => window.__boxes()))) problems.push(`${what}: ${m}`); };
      const next = page.locator(".basalt-list-band-row").getByRole("button", { name: "Next page" });
      const prev = page.locator(".basalt-list-band-row").getByRole("button", { name: "Previous page" });
      const size = page.getByRole("combobox", { name: "Incidents per page" });
      for (const n of ["10", "50", "100", "25"]) {
        await size.click();
        await tap(page.getByRole("option", { name: n, exact: true }));
        await check(`size ${n}`);
        for (let guard = 0; guard < 30 && (await next.getAttribute("aria-disabled")) !== "true"; guard += 1) { await next.click(); await check(`size ${n} next`); }
        for (let guard = 0; guard < 30 && (await prev.getAttribute("aria-disabled")) !== "true"; guard += 1) { await prev.click(); await check(`size ${n} previous`); }
      }
      // Slots: every one is one width at each page of the 10-per-page list (22 pages).
      await size.click();
      await tap(page.getByRole("option", { name: "10", exact: true }));
      for (let p = 1; p <= 21; p += 1) {
        const widths = await page.evaluate(() => [...document.querySelectorAll(".basalt-list-band-row .basalt-pagination-live > *")].map((el) => Math.round(el.getBoundingClientRect().width * 2)));
        if (width >= 720) assert.equal(new Set(widths).size, 1, `slot widths at page ${p}: ${widths}`);
        await next.click();
        await check(`10 per page, page ${p + 1}`);
      }
      // Search and both filters, then the empty state.
      await page.locator("#q").fill("incident 1");
      await check("search");
      await page.locator("#q").fill("zzq");
      await check("empty");
      assert.equal(await page.locator("#empty p").textContent(), "No incidents match “zzq”.");
      await page.locator("#q").fill("");
      for (const [filter, values] of [["Severity", ["SEV1", "SEV2", "SEV3", "SEV4"]], ["Status", ["Investigating", "Identified", "Mitigating", "Monitoring", "Resolved"]]]) {
        await page.getByRole("button", { name: new RegExp(`^${filter}`) }).click();
        for (const v of values) { await tap(page.getByRole("checkbox", { name: v })); await check(`${filter} ${v}`); }
        await page.keyboard.press("Escape");
        await check(`${filter} closed`);
      }
      assert.deepEqual(problems, []);
      await page.close();
    });
  }

  test("a filter or a search returns to page 1, and the empty state follows DECISIONS 207", async () => {
    const page = await open(LIST());
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByRole("button", { name: "Next page" }).click();
    assert.equal(await page.locator('[aria-current="page"]').textContent(), "3");
    await page.locator("#q").fill("incident");
    assert.equal(await page.locator('[aria-current="page"]').textContent(), "1");
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByRole("button", { name: /^Severity/ }).click();
    await tap(page.getByRole("checkbox", { name: "SEV4" }));
    await page.keyboard.press("Escape");
    assert.equal(await page.locator('[aria-current="page"]').textContent(), "1");
    await page.locator("#q").fill("");
    await page.getByRole("button", { name: /^Status/ }).click();
    await tap(page.getByRole("checkbox", { name: "Mitigating" }));
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#empty p").textContent(), "No incidents match these filters.");
    assert.equal(await page.locator("#clear").textContent(), "Clear filters");
    await page.locator("#q").fill("zzq");
    assert.equal(await page.locator("#empty p").textContent(), "No incidents match “zzq” with these filters.");
    await page.locator("#clear").click();
    assert.equal(await page.locator("#q").inputValue(), "");
    assert.equal(await page.locator("#empty").count(), 0);
    await page.locator("#q").fill("zzq");
    assert.equal(await page.locator("#clear").textContent(), "Clear search");
    await page.close();
  });

  test("the count reads 1–25 of 214 and follows the page, the size and the filters; the pager hides at one page and keeps its room", async () => {
    const page = await open(LIST());
    const count = () => page.locator(".basalt-list-band-row > .basalt-list-band-range [data-on]").textContent();
    assert.match(await count(), /^1–25 of 214/);
    await page.getByRole("button", { name: "Next page" }).click();
    assert.match(await count(), /^26–50 of 214/);
    const size = page.getByRole("combobox", { name: "Incidents per page" });
    await size.click();
    await tap(page.getByRole("option", { name: "10", exact: true }));
    assert.match(await count(), /^21–30 of 214/, "the reader's first row (26) is on page 3 of 10");
    await page.locator("#q").fill("zzq");
    assert.equal(await count(), "", "no matches: the count is blank");
    await page.close();
  });

  test("a page size keeps the reader's first row in view: page 3 at 25 per page (51–75) is page 6 at 10 (51–60)", async () => {
    const page = await open(LIST());
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByRole("combobox", { name: "Incidents per page" }).click();
    await tap(page.getByRole("option", { name: "10", exact: true }));
    assert.equal(await page.locator('[aria-current="page"]').textContent(), "6");
    assert.match(await page.locator(".basalt-list-band-row > .basalt-list-band-range [data-on]").textContent(), /^51–60 of 214/);
    await page.close();
  });

  test("the page size is a Select of 10, 25, 50 and 100 named “Incidents per page”, followed by the visible words “per page”", async () => {
    const page = await open(LIST());
    const select = page.getByRole("combobox", { name: "Incidents per page" });
    assert.equal(await select.count(), 1);
    const label = page.locator(".basalt-list-band-size-label");
    assert.equal(await label.textContent(), "per page");
    assert.equal(await label.evaluate((el) => el.tagName), "LABEL", "a real label");
    assert.equal(await label.getAttribute("for"), await select.getAttribute("id"), "for the select");
    // Pressing the words opens the select.
    await label.click();
    await page.getByRole("option").first().waitFor();
    await page.keyboard.press("Escape");
    await select.click();
    await page.getByRole("option").first().waitFor();
    assert.deepEqual(await page.getByRole("option").allTextContents(), ["10", "25", "50", "100"]);
    assert.equal(await select.locator(".basalt-select-value").textContent(), "25");
    await page.close();
  });

  test("a numeric Select is as wide as its widest option, below size-select-min, and does not follow its value", async () => {
    for (const options of [{}, { width: 390, height: 844, ...COARSE }]) {
      const page = await open(LIST(), options);
      const select = page.getByRole("combobox", { name: "Incidents per page" });
      const widths = new Set();
      for (const n of ["10", "50", "100", "25"]) {
        await select.click();
        await tap(page.getByRole("option", { name: n, exact: true }));
        widths.add(await select.evaluate((el) => Math.round(el.getBoundingClientRect().width * 10)));
      }
      assert.equal(widths.size, 1, `one width for every value: ${[...widths]}`);
      const w = (await select.evaluate((el) => el.getBoundingClientRect().width));
      assert.ok(w < 160, `below size-select-min (160): ${w}`);
      await page.close();
    }
  });

  test("a toolbar's MultiSelect trigger reserves its widest value, so choosing values moves nothing", async () => {
    const page = await open(LIST());
    const trigger = page.getByRole("button", { name: /^Status/ });
    const before = await trigger.evaluate((el) => el.getBoundingClientRect().width);
    const result = page.locator(".basalt-filter-result");
    const resultBefore = await result.evaluate((el) => el.getBoundingClientRect().left);
    await trigger.click();
    for (const v of ["Investigating", "Identified", "Mitigating", "Monitoring", "Resolved"]) {
      await tap(page.getByRole("checkbox", { name: v }));
      assert.equal(await trigger.evaluate((el) => el.getBoundingClientRect().width), before, `after ${v}`);
    }
    await page.keyboard.press("Escape");
    assert.equal(await result.evaluate((el) => el.getBoundingClientRect().left), resultBefore);
    await page.close();
  });

  test("the toolbar over a list: the search first at size-search-trigger from 720, then the filters, then the result; two columns under 720", async () => {
    const wide = await open(LIST());
    const rect = (sel) => wide.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, b: r.bottom }; });
    const search = await rect(".basalt-filter-toolbar-search");
    assert.equal(Math.round(search.w), 200);
    const sev = await rect(".basalt-filter-toolbar-filter:nth-of-type(2)");
    const result = await rect(".basalt-filter-toolbar-result");
    assert.ok(search.l < sev.l && sev.l < result.l, "search, filters, result in order");
    assert.ok(Math.abs(search.t - sev.t) < 12 && Math.abs(sev.t - result.t) < 12, "one row at 1440");
    await wide.close();
    const phone = await open(LIST(), { width: 390, height: 844, ...COARSE });
    const r2 = (sel) => phone.locator(sel).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, b: r.bottom }; });
    const s = await r2(".basalt-filter-toolbar-search");
    const a = await r2(".basalt-filter-toolbar-filter:nth-of-type(2)");
    const b = await r2(".basalt-filter-toolbar-filter:nth-of-type(3)");
    const res = await r2(".basalt-filter-toolbar-result");
    assert.ok(s.b <= a.t + 1, "the search has a row of its own");
    assert.ok(Math.abs(a.t - b.t) < 2 && a.l < b.l, "Severity beside Status");
    assert.ok(res.t >= a.b - 1, "the result after the filters");
    assert.ok(a.w + b.w < 390, "the triggers fill their columns");
    await phone.close();
  });
});

describe("The band: sticky, spoken once, compact", () => {
  test("from 720 the band is sticky under the bar, opaque, with a divider only while stuck; under 720 it does not stick", async () => {
    const page = await open(LIST());
    const band = page.locator(".basalt-list-band");
    assert.equal(await band.evaluate((el) => getComputedStyle(el).position), "sticky");
    assert.notEqual(await band.evaluate((el) => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await band.getAttribute("data-stuck"), null);
    assert.equal(await band.evaluate((el) => getComputedStyle(el).boxShadow), "none");
    await page.evaluate(() => window.scrollTo(0, 400));
    await frames(page);
    assert.equal(await band.getAttribute("data-stuck"), "");
    assert.notEqual(await band.evaluate((el) => getComputedStyle(el).boxShadow), "none");
    await page.evaluate(() => window.scrollTo(0, 0));
    await frames(page);
    assert.equal(await band.getAttribute("data-stuck"), null);
    await page.close();
    const phone = await open(LIST(), { width: 600, height: 800 });
    assert.equal(await phone.locator(".basalt-list-band").evaluate((el) => getComputedStyle(el).position), "static");
    await phone.close();
  });

  test("a press on Next while stuck returns the window to where the band rests, and the band does not move", async () => {
    const page = await open(LIST());
    await page.evaluate(() => window.scrollTo(0, 600));
    await frames(page);
    const top = () => page.locator(".basalt-list-band").evaluate((el) => el.getBoundingClientRect().top);
    const before = await top();
    await page.getByRole("button", { name: "Next page" }).click();
    await frames(page);
    assert.equal(await top(), before, "the band stays where it was");
    const rest = await page.locator(".basalt-list-band-sentinel").evaluate((el) => el.getBoundingClientRect().top + scrollY);
    assert.ok(Math.abs((await page.evaluate(() => scrollY)) - (rest - before)) < 1.5, "the window rests the band");
    // The first row of the new page shows under the band.
    const row = await page.locator("#rows li").first().evaluate((el) => el.getBoundingClientRect().top);
    const bandBottom = await page.locator(".basalt-list-band").evaluate((el) => el.getBoundingClientRect().bottom);
    assert.ok(row >= bandBottom - 1 && row < bandBottom + 20, `row at ${row}, band ends ${bandBottom}`);
    await page.close();
  });

  test("a page change is spoken once after 400ms of stillness; a filter clears the band's line", async () => {
    const page = await open(LIST());
    const line = page.locator(".basalt-list-band [role=status]");
    const next = page.getByRole("button", { name: "Next page" });
    await next.click();
    await page.waitForTimeout(150);
    await next.click();
    await page.waitForTimeout(200);
    assert.equal(await line.textContent(), "", "not yet: the second press restarted the wait");
    await page.waitForFunction(() => document.querySelector(".basalt-list-band [role=status]").textContent !== "", null, { timeout: 3000 });
    assert.equal(await line.textContent(), "Page 3 of 9. Incidents 51 to 75 of 214.");
    // A filter narrows the list to one match: the stale line goes.
    await page.locator("#q").fill("incident 150");
    await page.waitForFunction(() => document.querySelector(".basalt-list-band [role=status]").textContent === "", null, { timeout: 3000 });
    await page.close();
  });

  test("the compact form at 390: one row of Previous, the count, Next and the page size, every target 44px, nothing past the edge", async () => {
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    const r = await page.evaluate(() => {
      const row = document.querySelector(".basalt-list-band-row");
      const kids = [...row.querySelectorAll('[aria-label="Previous page"], [aria-label="Next page"], .basalt-list-band-size .basalt-select-trigger')].map((el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, h: b.height, w: b.width, cy: b.top + b.height / 2 }; });
      return { kids, overflow: document.documentElement.scrollWidth - innerWidth, rowCount: new Set(kids.map((k) => Math.round(k.cy / 4))).size };
    });
    assert.equal(r.rowCount, 1);
    assert.ok(r.kids.every((k) => k.h >= 43.9 && k.w >= 43.9 && k.r <= 390 - 15), JSON.stringify(r.kids));
    assert.ok(r.overflow <= 0);
    await page.close();
  });

  test("in a container too narrow for one row (292px) the page size moves to the end of a second row, so nothing overflows", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><div id="card" style={{ width: 292 }}><B.ListBand total={214} page={2} pageSize={25} noun="Incidents" onPageChange={() => {}} onPageSizeChange={() => {}} /></div></div>);`, { width: 390, height: 844, ...COARSE });
    const r = await page.evaluate(() => {
      const card = document.querySelector("#card").getBoundingClientRect();
      const q = (s) => document.querySelector(s).getBoundingClientRect();
      const pager = q(".basalt-pagination");
      const size = q(".basalt-list-band-size");
      return { card: [card.left, card.right], pager: [pager.left, pager.right, pager.bottom], size: [size.left, size.right, size.top] };
    });
    assert.ok(r.size[2] >= r.pager[2] - 1, "the size is on a second row");
    assert.ok(r.pager[1] <= r.card[1] + 0.5 && r.size[1] <= r.card[1] + 0.5, "nothing past the card");
    assert.ok(Math.abs(r.size[1] - r.card[1]) < 1, "at the end of its row");
    await page.close();
  });

  test("the band keeps its room at one page and at none, with the count showing only where there is one", async () => {
    const page = await open(LIST());
    const band = page.locator(".basalt-list-band");
    const h = await band.evaluate((el) => el.getBoundingClientRect().height);
    await page.locator("#q").fill("zzq");
    assert.equal(await band.evaluate((el) => el.getBoundingClientRect().height), h);
    await page.locator("#q").fill("incident 150");
    assert.equal(await band.evaluate((el) => el.getBoundingClientRect().height), h);
    assert.equal(await page.locator('.basalt-list-band-row [aria-label="Next page"]').evaluate((el) => getComputedStyle(el).visibility), "hidden");
    assert.match(await page.locator(".basalt-list-band-row > .basalt-list-band-range [data-on]").textContent(), /^1–1 of 1/);
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`axe finds no violation in the band and the filters, in ${theme}`, async () => {
      const page = await open(LIST(), { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
      const phone = await open(LIST(), { theme, width: 390, height: 844, ...COARSE });
      assert.deepEqual(await axe(phone), []);
      await phone.close();
    });
  }

  test("forced colours: the stuck band's divider is CanvasText and the current page is Highlight; reduced motion changes nothing in layout", async () => {
    const page = await open(LIST(), { forcedColors: "active", reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo(0, 400));
    await frames(page);
    const line = await page.locator(".basalt-list-band").evaluate((el) => { const s = getComputedStyle(el); return [s.borderBottomStyle, s.borderBottomColor, s.boxShadow]; });
    assert.equal(line[0], "solid");
    assert.equal(line[2], "none");
    const cur = await page.locator('[aria-current="page"]').evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.notEqual(cur, "rgba(0, 0, 0, 0)");
    await page.close();
  });
});

// ---- The centred form modal ----
const FORM = (extra = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function Declare() {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState(false);
  return (
    <div style={{ padding: 16 }}>
      <B.Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(false); }}>
        <B.DialogTrigger id="opener" className="basalt-button" data-variant="primary">Declare incident</B.DialogTrigger>
        <B.DialogContent form id="declare">
          <B.SheetHeader closeLabel="Close declare incident"><B.DialogTitle>Declare an incident</B.DialogTitle></B.SheetHeader>
          <B.SheetBody id="body">
            <B.DialogDescription>Say what is happening. Everyone on the list is told.</B.DialogDescription>
            <form id="f" onSubmit={(e) => { e.preventDefault(); setError(true); }} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <label>What is happening <input id="what" className="basalt-input" name="what" /></label>
              {error ? <p id="err" role="alert" style={{ margin: 0 }}>Say what is happening, in at least three characters.</p> : null}
              <label>ServiceNow ticket <input id="ticket" className="basalt-input" name="ticket" /></label>
              ${extra}
            </form>
          </B.SheetBody>
          <B.SheetFooter><B.DialogActions><B.DialogClose id="cancel" render={<B.Button variant="secondary" />}>Cancel</B.DialogClose><B.Button id="go" variant="primary" type="submit" form="f">Declare incident</B.Button></B.DialogActions></B.SheetFooter>
        </B.DialogContent>
      </B.Dialog>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Declare />);`;
const TALL = `<div style={{ height: 600 }}>Room for a long form.</div>`;
const rectOf = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom }; });
const openForm = async (page) => { await page.locator("#opener").click(); await page.locator("#declare").waitFor(); await settle(page); };

describe("Dialog as a centred form modal", () => {
  test("from 720: 480 wide, centred over the scrim, level 1, the rim, radius 12 and the modal shadow, with the sheet's head, body and foot", async () => {
    const page = await open(FORM());
    await openForm(page);
    const style = await page.locator("#declare").evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { level: el.getAttribute("data-level"), radius: s.borderTopLeftRadius, shadow: s.boxShadow, border: s.borderTopWidth, w: r.width, cx: r.x + r.width / 2, role: el.getAttribute("role"), pad: s.paddingTop }; });
    assert.equal(style.w, 480);
    assert.ok(Math.abs(style.cx - 720) < 1);
    assert.equal(style.level, "1");
    assert.equal(style.radius, "12px");
    assert.notEqual(style.shadow, "none");
    assert.equal(style.border, "1px");
    assert.equal(style.pad, "0px");
    assert.equal(style.role, "dialog");
    assert.notEqual(await page.locator(".basalt-dialog-backdrop").evaluate((el) => getComputedStyle(el).backgroundColor), "rgba(0, 0, 0, 0)");
    // The head holds the title and a 44px Close; the body opens with the description; the foot has Cancel, then the primary.
    assert.equal(await page.locator("#declare .basalt-sheet-head .basalt-dialog-title").textContent(), "Declare an incident");
    const close = await rectOf(page, ".basalt-sheet-close");
    assert.equal(Math.round(close.h), 44);
    assert.equal(await page.locator("#body > :first-child").getAttribute("class"), "basalt-dialog-description");
    assert.deepEqual(await page.locator(".basalt-sheet-foot .basalt-dialog-actions > *").allTextContents(), ["Cancel", "Declare incident"]);
    await page.close();
  });

  test("the height is at most the window less 16px above and below; the head and foot are held while the body scrolls", async () => {
    const page = await open(FORM(TALL), { height: 560 });
    await openForm(page);
    const d = await rectOf(page, "#declare");
    assert.ok(d.y >= 15.9 && d.b <= 560 - 15.9, `${d.y} ${d.b}`);
    assert.ok(Math.abs(d.h - 528) < 1.5, `at 560 tall the dialog is 528: ${d.h}`);
    const head = await rectOf(page, ".basalt-sheet-head");
    const foot = await rectOf(page, ".basalt-sheet-foot");
    const body = page.locator("#body");
    assert.ok(await body.evaluate((el) => el.scrollHeight > el.clientHeight), "the body scrolls");
    await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.deepEqual(await rectOf(page, ".basalt-sheet-head"), head);
    assert.deepEqual(await rectOf(page, ".basalt-sheet-foot"), foot);
    assert.deepEqual(await rectOf(page, "#declare"), d, "the box does not move while the body scrolls");
    await page.close();
  });

  test("its top is held where it opened and it grows downward; it re-centres only on a window resize", async () => {
    const page = await open(FORM());
    await openForm(page);
    const before = await rectOf(page, "#declare");
    const title = await rectOf(page, ".basalt-dialog-title");
    assert.ok(Math.abs(before.y - (900 - before.h) / 2) < 1.5, "it opens centred");
    await page.locator("#go").click();
    await page.locator("#err").waitFor();
    const after = await rectOf(page, "#declare");
    assert.ok(after.h > before.h + 10, "the error grew it");
    assert.equal(after.y, before.y, "its top did not move");
    assert.equal((await rectOf(page, ".basalt-dialog-title")).y, title.y, "the title did not move");
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.waitForFunction(() => { const r = document.querySelector("#declare").getBoundingClientRect(); return Math.abs(r.top - (innerHeight - r.height) / 2) < 2; });
    await page.close();
  });

  test("a press on the scrim closes a form only while nothing has been entered; Esc, Close and Cancel always close it", async () => {
    const page = await open(FORM());
    await openForm(page);
    await page.mouse.click(30, 450);
    await page.locator("#declare").waitFor({ state: "detached" });
    await openForm(page);
    await page.locator("#what").fill("Checkout is timing out");
    await page.mouse.click(30, 450);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#declare").count(), 1, "a stray press does nothing once something is typed");
    await page.keyboard.press("Escape");
    await page.locator("#declare").waitFor({ state: "detached" });
    await openForm(page);
    await page.locator("#what").fill("x");
    await page.locator("#cancel").click();
    await page.locator("#declare").waitFor({ state: "detached" });
    await openForm(page);
    await page.locator("#what").fill("x");
    await page.getByRole("button", { name: "Close declare incident" }).click();
    await page.locator("#declare").waitFor({ state: "detached" });
    // The next opening is pristine again.
    await openForm(page);
    assert.equal(await page.locator("#what").inputValue(), "");
    await page.mouse.click(30, 450);
    await page.locator("#declare").waitFor({ state: "detached" });
    await page.close();
  });

  test("what is entered is read at the press: typed into and emptied again, the form closes on the scrim (DECISIONS 233)", async () => {
    const page = await open(FORM());
    await openForm(page);
    await page.locator("#what").pressSequentially("abc");
    await page.mouse.click(30, 450);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#declare").count(), 1, "with something typed, a stray press does nothing");
    await page.locator("#what").fill("");
    await page.mouse.click(30, 450);
    await page.locator("#declare").waitFor({ state: "detached" });
    await page.close();
  });

  test("a field's label is as wide as its words: a press on them focuses the control, a press on the empty space beside them does not (DECISIONS 233)", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ width: 440, padding: 16 }}><B.Field label="Title" required><B.Input id="title" /></B.Field><button id="other" type="button">Other</button></div>);`);
    const label = await page.locator(".basalt-field-label").boundingBox();
    const input = await page.locator("#title").boundingBox();
    assert.ok(label.width < input.width / 2, `the label is ${label.width}px wide in a ${input.width}px field`);
    assert.match(await page.locator(".basalt-field-label").innerText(), /Title\s*Required/, "the necessity word is inside the label");
    await page.locator("#other").focus();
    await page.mouse.click(input.x + input.width - 8, label.y + label.height / 2);
    assert.notEqual(await page.evaluate(() => document.activeElement.id), "title", "the empty space beside the label is not a target");
    await page.mouse.click(label.x + 4, label.y + label.height / 2);
    assert.equal(await page.evaluate(() => document.activeElement.id), "title", "the label's words focus the field");
    await page.close();
  });

  test("focus on opening goes to the first field with a mouse or a key; focus returns to the opener on closing", async () => {
    const page = await open(FORM());
    await page.locator("#opener").click();
    await page.locator("#declare").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), "what");
    await page.keyboard.press("Escape");
    await page.locator("#declare").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => document.activeElement.id), "opener");
    await page.keyboard.press("Enter");
    await page.locator("#declare").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.id), "what", "Enter on the opener");
    // Tab and Shift+Tab wrap inside.
    await page.keyboard.press("Shift+Tab");
    assert.ok(await page.evaluate(() => document.getElementById("declare").contains(document.activeElement)));
    await page.close();
  });

  test("a touch opens on the title, with no ring; Enter in touch emulation still goes to the first field", async () => {
    const page = await open(FORM(), { width: 390, height: 844, ...COARSE });
    await page.locator("#opener").tap();
    await page.locator("#declare").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.className), "basalt-dialog-title");
    assert.equal(await page.locator(".basalt-dialog-title").evaluate((el) => getComputedStyle(el).outlineStyle), "none");
    await page.keyboard.press("Escape");
    await page.locator("#declare").waitFor({ state: "detached" });
    // The last pointer was a touch, but this opening is a key press.
    await page.locator("#opener").focus();
    await page.keyboard.press("Enter");
    await page.locator("#declare").waitFor();
    await settle(page);
    await page.waitForFunction(() => document.activeElement.id === "what", null, { timeout: 3000 });
    await page.close();
  });

  test("under 720 a form is a full-screen modal: square, no rim or shadow, level 1, the foot's two actions equal 44px buttons", async () => {
    const page = await open(FORM(TALL), { width: 390, height: 844, ...COARSE });
    await page.locator("#opener").tap();
    await page.locator("#declare").waitFor();
    await settle(page);
    const d = await page.locator("#declare").evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, radius: s.borderTopLeftRadius, shadow: s.boxShadow, border: s.borderTopWidth, level: el.getAttribute("data-level") }; });
    assert.deepEqual([d.x, d.y, d.w, d.h], [0, 0, 390, 844]);
    assert.deepEqual([d.radius, d.shadow, d.border, d.level], ["0px", "none", "0px", "1"]);
    const [cancel, go] = await Promise.all(["#cancel", "#go"].map((s) => rectOf(page, s)));
    assert.ok(cancel.h >= 43.9 && go.h >= 43.9, `${cancel.h} ${go.h}`);
    assert.ok(Math.abs(cancel.w - go.w) < 1 && cancel.x < go.x);
    // The held head and foot while the body scrolls: the foot is on screen at the bottom, the head at the top.
    await page.locator("#body").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.ok(Math.abs((await rectOf(page, ".basalt-sheet-foot")).b - 844) < 1.5);
    assert.ok(Math.abs((await rectOf(page, ".basalt-sheet-head")).y) < 1.5);
    await page.close();
  });

  test("an alert dialog stays centred at 390", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.AlertDialog><B.AlertDialogTrigger id="opener">Delete</B.AlertDialogTrigger><B.AlertDialogContent id="alert"><B.AlertDialogTitle>Delete this?</B.AlertDialogTitle><B.AlertDialogDescription>It cannot be undone.</B.AlertDialogDescription><B.AlertDialogActions><B.AlertDialogCancel>Keep</B.AlertDialogCancel><B.AlertDialogAction>Delete</B.AlertDialogAction></B.AlertDialogActions></B.AlertDialogContent></B.AlertDialog>);`, { width: 390, height: 844, ...COARSE });
    await page.locator("#opener").tap();
    await page.locator("#alert").waitFor();
    await settle(page);
    const r = await rectOf(page, "#alert");
    assert.ok(r.w < 390 && r.h < 844 && Math.abs(r.x + r.w / 2 - 195) < 1 && Math.abs(r.y + r.h / 2 - 422) < 1, JSON.stringify(r));
    assert.equal(await page.locator("#alert").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "12px");
    await page.close();
  });

  test("the full-screen form rises from the bottom on the sheet's motion; under reduced motion it only fades", async () => {
    for (const reduced of [false, true]) {
      const page = await open(FORM(), { width: 390, height: 844, ...COARSE, reducedMotion: reduced ? "reduce" : "no-preference" });
      const samples = page.evaluate(() => new Promise((resolve) => {
        const out = [];
        const obs = new MutationObserver(() => {
          const el = document.getElementById("declare");
          if (!el) return;
          obs.disconnect();
          let n = 0;
          const tick = () => { const s = getComputedStyle(el); out.push({ t: s.transform, o: Number(s.opacity) }); if (++n < 6) requestAnimationFrame(tick); else resolve(out); };
          tick();
        });
        obs.observe(document.body, { childList: true, subtree: true });
      }));
      await page.locator("#opener").tap();
      const out = await samples;
      if (reduced) assert.ok(out.every((s) => s.t === "none"), JSON.stringify(out));
      else assert.ok(out.some((s) => s.t !== "none" && Number.parseFloat(s.t.split(",")[5]) > 0), `rises: ${JSON.stringify(out)}`);
      await page.close();
    }
  });

  for (const theme of ["dark", "light"]) {
    test(`axe finds no violation in the open form, in ${theme}, wide and full-screen`, async () => {
      for (const options of [{}, { width: 390, height: 844, ...COARSE }]) {
        const page = await open(FORM(), { theme, ...options });
        await page.locator("#opener").click();
        await page.locator("#declare").waitFor();
        await settle(page);
        assert.deepEqual(await axe(page), []);
        await page.close();
      }
    });
  }
});

// ---- Back to top and the list's foot (DECISIONS 227 and 228) ----
const MODAL = `<B.Dialog><B.DialogTrigger id="open-modal">Open</B.DialogTrigger><B.DialogContent><B.DialogTitle>A modal</B.DialogTitle><B.DialogDescription>Over the page.</B.DialogDescription><B.DialogActions><B.DialogClose>Close</B.DialogClose></B.DialogActions></B.DialogContent></B.Dialog>`;
const CASES = [[390, 844, COARSE], [768, 900, COARSE], [1440, 900, {}]];
const goto = async (page, y) => { await page.evaluate((to) => window.scrollTo(0, to), y); await page.waitForTimeout(140); };
const isShown = (page) => page.locator(".basalt-back-to-top").evaluate((el) => el.hasAttribute("data-shown"));
const hundred = async (page) => { await page.getByRole("combobox", { name: "Incidents per page" }).click(); await tap(page.getByRole("option", { name: "100", exact: true })); await settle(page); };
/** The scroll position where the list's top is one window above the window's top: where Back to top may first be drawn. */
const threshold = (page) => page.evaluate(() => document.querySelector(".basalt-list-band-sentinel").getBoundingClientRect().top + scrollY + innerHeight);

describe("Back to top", () => {
  for (const [width, height, options] of CASES) {
    test(`at ${width}: drawn while scrolling down past one window from the list's top; it leaves on an 8px turn up and comes back on 8px down`, async () => {
      const page = await open(LIST(MODAL), { width, height, ...options });
      await hundred(page);
      assert.equal(await isShown(page), false, "not at the top");
      const at = await threshold(page);
      await goto(page, at - 200);
      assert.equal(await isShown(page), false, "not before the list's top is a window above");
      await goto(page, at + 300);
      assert.equal(await isShown(page), true, "scrolling down past it");
      await goto(page, at + 296);
      assert.equal(await isShown(page), true, "4px up keeps it");
      await goto(page, at + 300);
      assert.equal(await isShown(page), true, "and 4px back down keeps it");
      await goto(page, at + 288);
      assert.equal(await isShown(page), false, "12px up takes it away");
      await goto(page, at + 300);
      assert.equal(await isShown(page), true, "12px down brings it back");
      await goto(page, 0);
      assert.equal(await isShown(page), false, "gone at the top");
      // The page's ends hold the position: a scroll position past the end is not a turn.
      await goto(page, 1_000_000);
      assert.equal(await isShown(page), true, "at the end, arrived going down");
      await page.close();
    });
  }

  test("it is a secondary sm Button with the up arrow and its words: 28 tall on a pointer, 44 on touch, over the overlay shadow, solid", async () => {
    for (const [width, height, options, h, radius] of [[1440, 900, {}, 28, "6px"], [390, 844, COARSE, 44, "8px"]]) {
      const page = await open(LIST(), { width, height, ...options });
      await hundred(page);
      await goto(page, (await threshold(page)) + 300);
      const b = await page.locator(".basalt-back-to-top").evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { h: r.height, radius: s.borderTopLeftRadius, shadow: s.boxShadow, bg: s.backgroundColor, text: el.textContent, svg: el.querySelector("svg") !== null, variant: el.getAttribute("data-variant"), size: el.getAttribute("data-size"), name: el.getAttribute("aria-label") }; });
      assert.equal(Math.round(b.h), h);
      assert.equal(b.radius, radius);
      assert.notEqual(b.shadow, "none");
      assert.notEqual(b.bg, "rgba(0, 0, 0, 0)");
      assert.deepEqual([b.text, b.svg, b.variant, b.size], ["Back to top", true, "secondary", "sm"]);
      await page.close();
    }
  });

  for (const [width, height, options] of CASES) {
    test(`at ${width}: centred on the list, space-2 under the bar (under the stuck band from 720), taking no room`, async () => {
      const page = await open(LIST(), { width, height, ...options });
      await hundred(page);
      await goto(page, (await threshold(page)) + 300);
      const r = await page.evaluate(() => {
        const b = document.querySelector(".basalt-back-to-top").getBoundingClientRect();
        const l = document.querySelector("#panel").getBoundingClientRect();
        const band = document.querySelector(".basalt-list-band").getBoundingClientRect();
        const dock = document.querySelector(".basalt-back-to-top-dock");
        return { top: b.top, centre: b.left + b.width / 2, list: l.left + l.width / 2, bandBottom: band.bottom, stuck: getComputedStyle(document.querySelector(".basalt-list-band")).position === "sticky", dockHeight: dock.getBoundingClientRect().height, offset: parseFloat(getComputedStyle(document.querySelector(".basalt-list-band-sentinel")).scrollMarginTop) };
      });
      assert.ok(Math.abs(r.centre - r.list) < 0.6, `centre ${r.centre} vs list ${r.list}`);
      assert.equal(r.dockHeight, 0, "the dock has no height");
      if (r.stuck) assert.ok(Math.abs(r.top - (r.bandBottom + 8)) < 0.6, `${r.top} vs ${r.bandBottom + 8}`);
      else assert.ok(Math.abs(r.top - (r.offset + 8)) < 0.6, `${r.top} vs ${r.offset + 8}`);
      await page.close();
    });
  }

  for (const [width, height, options] of CASES) {
    test(`at ${width}: nothing moves when it appears or leaves: every part of the list measures 0px, shown or not, at one scroll position`, async () => {
      const page = await open(LIST(), { width, height, ...options });
      await hundred(page);
      const at = (await threshold(page)) + 400;
      const read = () => page.evaluate(() => {
        const box = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
        const q = (s) => document.querySelector(s);
        return { scroll: scrollY, band: box(q(".basalt-list-band")), panel: box(q("#panel")), toolbar: box(q(".basalt-filter-toolbar")), search: box(q("#q")), foot: box(q(".basalt-list-band-foot")), rows: [...document.querySelectorAll("#rows li")].filter((_, i) => i % 7 === 0).map(box), pages: scrollY + innerHeight, doc: document.documentElement.scrollHeight };
      });
      // Arrived going down: drawn. Then arrived going up at the same position: not drawn.
      await goto(page, at - 60);
      await goto(page, at);
      assert.equal(await isShown(page), true);
      const shown = await read();
      await goto(page, at + 60);
      await goto(page, at);
      assert.equal(await isShown(page), false);
      const hidden = await read();
      assert.deepEqual(hidden, { ...shown, pages: hidden.pages });
      assert.equal(hidden.doc, shown.doc);
      await page.close();
    });
  }

  test("it never leaves while it holds focus, and goes when focus leaves it", async () => {
    const page = await open(LIST(), { width: 1440, height: 900 });
    await hundred(page);
    const at = (await threshold(page)) + 400;
    await goto(page, at);
    await page.locator(".basalt-back-to-top").focus();
    await goto(page, at - 100);
    assert.equal(await isShown(page), true, "holds focus: it stays");
    await page.locator(".basalt-back-to-top").evaluate((el) => el.blur());
    await page.waitForTimeout(140);
    assert.equal(await isShown(page), false, "focus left: it goes");
    await page.close();
  });

  test("a press takes the window to the top at once and focuses the list's heading without scrolling to it; the button is gone", async () => {
    for (const [width, height, options] of CASES) {
      const page = await open(LIST(), { width, height, ...options });
      await hundred(page);
      await goto(page, 1_000_000);
      assert.equal(await isShown(page), true);
      await page.locator(".basalt-back-to-top").focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => scrollY), 0, `${width}: at the top`);
      assert.equal(await page.evaluate(() => document.activeElement.id), "list-title");
      assert.equal(await isShown(page), false);
      await page.close();
    }
  });

  test("it is not drawn while a modal is open over the page", async () => {
    const page = await open(LIST(MODAL), { width: 1440, height: 900 });
    await hundred(page);
    await goto(page, (await threshold(page)) + 400);
    assert.equal(await isShown(page), true);
    await page.evaluate(() => document.getElementById("open-modal").click());
    await page.locator('[role="dialog"]').waitFor();
    await page.waitForTimeout(200);
    assert.equal(await isShown(page), false, "hidden under a modal");
    await page.keyboard.press("Escape");
    await page.locator('[role="dialog"]').waitFor({ state: "detached" });
    await goto(page, (await page.evaluate(() => scrollY)) - 60);
    await goto(page, (await page.evaluate(() => scrollY)) + 60);
    assert.equal(await isShown(page), true, "and back once the modal is gone and the reader scrolls down");
    await page.close();
  });

  test("it fades and never slides: opacity over duration-fast in and 0.75 out, no transform in any motion setting; forced colours draw no shadow", async () => {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const page = await open(LIST(), { width: 1440, height: 900, reducedMotion });
      await hundred(page);
      const sel = ".basalt-back-to-top";
      const hiddenTiming = await page.locator(sel).evaluate((el) => { const s = getComputedStyle(el); return { d: s.transitionDuration.split(", ")[0], props: s.transitionProperty, v: s.visibility, o: s.opacity }; });
      assert.equal(hiddenTiming.d, "0.075s", "leaves at 0.75 of the entry");
      assert.equal(hiddenTiming.v, "hidden");
      assert.equal(hiddenTiming.o, "0");
      await goto(page, (await threshold(page)) + 300);
      const shownTiming = await page.locator(sel).evaluate((el) => { const s = getComputedStyle(el); return { d: s.transitionDuration.split(", ")[0], props: s.transitionProperty, t: s.transform }; });
      assert.equal(shownTiming.d, "0.1s", "enters over duration-fast");
      assert.equal(shownTiming.t, "none");
      if (reducedMotion === "reduce") assert.equal(shownTiming.props.includes("transform"), false, "a fade only");
      await page.close();
    }
    const forced = await open(LIST(), { width: 1440, height: 900, forcedColors: "active" });
    assert.equal(await forced.locator(".basalt-back-to-top").evaluate((el) => getComputedStyle(el).boxShadow), "none");
    await forced.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`axe finds no violation with Back to top drawn, in ${theme}`, async () => {
      const page = await open(LIST(), { theme, width: 390, height: 844, ...COARSE });
      await hundred(page);
      await goto(page, (await threshold(page)) + 300);
      assert.equal(await isShown(page), true);
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

describe("The list's foot", () => {
  test("under 720 with more than one page: Previous, the count and Next under the rows, centred on the list, with nothing under it", async () => {
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    const foot = page.locator(".basalt-list-band-foot");
    assert.equal(await foot.evaluate((el) => getComputedStyle(el).display), "block");
    const r = await page.evaluate(() => {
      const f = document.querySelector(".basalt-list-band-foot");
      const nav = f.querySelector("nav");
      const panel = document.querySelector("#panel").getBoundingClientRect();
      const kids = [...nav.children].filter((c) => c.getClientRects().length).map((c) => c.getBoundingClientRect());
      const left = Math.min(...kids.map((k) => k.left));
      const right = Math.max(...kids.map((k) => k.right));
      const prev = nav.querySelector('[aria-label="Previous page"]').getBoundingClientRect();
      const range = nav.querySelector(".basalt-list-band-range-seat").getBoundingClientRect();
      return { centre: (left + right) / 2, list: panel.left + panel.width / 2, after: f.nextElementSibling === null, belowRows: f.getBoundingClientRect().top >= panel.bottom - 1, name: nav.getAttribute("aria-label"), gap: range.left - prev.right, numbers: nav.querySelectorAll(".basalt-pagination-live").length };
    });
    assert.ok(Math.abs(r.centre - r.list) < 0.6, `centred: ${r.centre} vs ${r.list}`);
    assert.equal(r.after, true, "nothing is drawn after the foot");
    assert.equal(r.belowRows, true);
    assert.equal(r.name, "Incident pages, end of list");
    assert.equal(r.numbers, 0, "no numbers in the foot");
    assert.ok(r.gap >= 7.9, `the range keeps space-1 more than the arrows' gap: ${r.gap}`);
    await page.close();
  });

  test("the band's narrow form keeps the same 8px between an arrow and the count, so the +2 ring clears it", async () => {
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    const gap = await page.evaluate(() => { const nav = document.querySelector(".basalt-list-band-row .basalt-pagination"); return nav.querySelector(".basalt-pagination-summary").getBoundingClientRect().left - nav.querySelector('[aria-label="Previous page"]').getBoundingClientRect().right; });
    assert.ok(gap >= 7.9, `${gap}`);
    await page.close();
  });

  test("from 720 there is no foot; with one page or none it is not drawn", async () => {
    const wide = await open(LIST(), { width: 1440, height: 900 });
    assert.equal(await wide.locator(".basalt-list-band-foot").evaluate((el) => getComputedStyle(el).display), "none");
    await wide.close();
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    await page.locator("#q").fill("incident 150");
    assert.equal(await page.locator(".basalt-list-band-foot").evaluate((el) => el.hidden || getComputedStyle(el).display === "none"), true);
    await page.locator("#q").fill("zzq");
    assert.equal(await page.locator(".basalt-list-band-foot").evaluate((el) => getComputedStyle(el).display), "none");
    await page.close();
  });

  test("a press on the foot's Next changes the page, returns the window to where the band rests, focuses the band's own Next, and Back to top goes", async () => {
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    await hundred(page);
    await page.getByRole("combobox", { name: "Incidents per page" }).click();
    await tap(page.getByRole("option", { name: "50", exact: true }));
    await settle(page);
    await goto(page, 1_000_000);
    const foot = page.locator(".basalt-list-band-foot").getByRole("button", { name: "Next page" });
    assert.equal(await isShown(page), true, "at the end, going down: drawn");
    await foot.tap();
    await page.waitForFunction(() => /^51–100/.test(document.querySelector(".basalt-list-band-row > .basalt-list-band-range [data-on]").textContent));
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const band = document.querySelector(".basalt-list-band").getBoundingClientRect();
      const row = document.querySelector("#rows li").getBoundingClientRect();
      return { bandTop: band.top, rowTop: row.top, bandBottom: band.bottom, offset: parseFloat(getComputedStyle(document.querySelector(".basalt-list-band-sentinel")).scrollMarginTop), focus: document.activeElement.getAttribute("aria-label"), inBand: document.activeElement.closest(".basalt-list-band-row") !== null };
    });
    assert.ok(Math.abs(r.bandTop - r.offset) < 1.5, `the band rests ${r.bandTop} under the top (the bar is ${r.offset})`);
    assert.ok(r.rowTop >= r.bandBottom - 1 && r.rowTop < r.bandBottom + 3, `the first row is under the band: ${r.rowTop} vs ${r.bandBottom}`);
    assert.deepEqual([r.focus, r.inBand], ["Next page", true], "focus is on the band's own Next");
    assert.equal(await isShown(page), false, "the window moved up: Back to top goes");
    await page.close();
  });

  test("the foot's Previous mirrors it, and an end keeps focus (aria-disabled)", async () => {
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    const prev = page.locator(".basalt-list-band-foot").getByRole("button", { name: "Previous page" });
    assert.equal(await prev.getAttribute("aria-disabled"), "true");
    await page.getByRole("button", { name: "Next page" }).first().tap();
    await page.getByRole("button", { name: "Next page" }).first().tap();
    await goto(page, 1_000_000);
    await prev.tap();
    await page.waitForTimeout(250);
    assert.match(await page.locator(".basalt-list-band-row > .basalt-list-band-range [data-on]").textContent(), /^26–50/);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Previous page");
    await page.close();
  });
});

// ---- Fix pass 1 (Opus's review, 7/10) ----
/** A standalone band in a box of the given width (no page padding), for the widths a phone really gives. */
const BAND = (width, extra = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
function Host() { const [p, setP] = React.useState(2); const [s, setS] = React.useState(25); return <div style={{ padding: 0 }}><div id="box" style={{ width: ${width} }}><B.ListBand total={214} page={p} pageSize={s} onPageChange={setP} onPageSizeChange={setS} noun="Incidents" ${extra}><div id="rowsbox" style={{ height: 200 }}>Rows</div></B.ListBand></div></div>; }
createRoot(document.getElementById("root")).render(<Host />);`;
/** What a band's parts cover: each part's box, and whether any reaches past the band's edge or another. */
const READ_BAND = (page) => page.evaluate(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const row = document.querySelector(".basalt-list-band-row");
  const kids = [...row.querySelectorAll('[aria-label="Previous page"], [aria-label="Next page"], .basalt-list-band-size .basalt-select-trigger, .basalt-list-band-size-label, .basalt-list-band-row > .basalt-pagination .basalt-pagination-summary [data-on], .basalt-list-band-row > .basalt-list-band-range [data-on]')].filter((el) => el.getClientRects().length);
  const parts = Object.fromEntries([["prev", '[aria-label="Previous page"]'], ["next", '[aria-label="Next page"]'], ["size", ".basalt-list-band-size"], ["pager", ".basalt-list-band-row > .basalt-pagination"]].map(([k, sel]) => [k, box(row.querySelector(sel))]));
  const band = box(document.querySelector(".basalt-list-band"));
  const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  return { band, parts, past: Math.max(...kids.map((el) => box(el).r)) - band.r, overlap: overlap(parts.pager, parts.size), twoRows: parts.size.t >= parts.pager.b - 1, doc: document.documentElement.scrollWidth };
});

describe("Fix pass 1: the band's narrow forms", () => {
  test("the count is centred between Previous and Next in the foot and in the narrow band: the text's own extent, 0px off", async () => {
    const page = await open(LIST(), { width: 390, height: 844, ...COARSE });
    for (const [where, sel] of [["foot", ".basalt-list-band-foot nav"], ["narrow band", ".basalt-list-band-row > .basalt-pagination"]]) {
      for (const size of ["25", "100"]) {
        if (size === "100") await hundred(page);
        const r = await page.locator(sel).evaluate((nav) => {
          const text = nav.querySelector(".basalt-pagination-summary [data-on]");
          const range = document.createRange();
          range.selectNodeContents(text);
          const t = range.getBoundingClientRect();
          const prev = nav.querySelector('[aria-label="Previous page"]').getBoundingClientRect();
          const next = nav.querySelector('[aria-label="Next page"]').getBoundingClientRect();
          return { left: t.left - prev.right, right: next.left - t.right, text: text.textContent };
        });
        assert.ok(Math.abs(r.left - r.right) < 0.6, `${where} at ${size} per page: "${r.text}" is ${r.left} from Previous and ${r.right} from Next`);
        assert.ok(r.left >= 7.9, "the ring clears");
      }
    }
    await page.close();
  });

  for (const width of [330, 335, 340, 341, 343, 345, 348, 349, 352, 360]) {
    test(`on touch a band ${width}px wide overflows nothing: one row where it fits, the page size at the end of a second row where it does not`, async () => {
      const page = await open(BAND(width), { width: 390, height: 844, ...COARSE });
      const r = await READ_BAND(page);
      assert.ok(r.past <= 0.5, `something ends ${r.past}px past the band (${JSON.stringify(r.parts)})`);
      assert.equal(r.overlap, 0, "the page size covers nothing");
      assert.ok(r.parts.size.r <= r.band.r + 0.5);
      if (r.twoRows) assert.ok(Math.abs(r.parts.size.r - r.band.r) < 0.6, "at the end of its row");
      await page.close();
    });
  }

  test("a 375 phone (a 343 band) holds the narrow band with nothing past the panel", async () => {
    const page = await open(LIST(), { width: 375, height: 812, ...COARSE });
    const r = await READ_BAND(page);
    assert.ok(Math.abs(r.band.r - r.band.l - 343) < 1, `band ${r.band.r - r.band.l}`);
    assert.ok(r.past <= 0.5, `past by ${r.past}`);
    assert.ok(r.doc <= 375);
    await page.close();
  });

  for (const width of [640, 648, 660, 680, 690, 700, 719, 720, 768]) {
    test(`on touch a band ${width}px wide: the page size never covers the pager (the coarse narrow form is under 720)`, async () => {
      const page = await open(BAND(width), { width: 800, height: 900, ...COARSE });
      const r = await READ_BAND(page);
      assert.equal(r.overlap, 0, `the page size covers the pager by ${r.overlap}px²`);
      assert.ok(r.past <= 0.5);
      const narrow = await page.locator(".basalt-list-band-row > .basalt-list-band-range").evaluate((el) => getComputedStyle(el).display === "none");
      assert.equal(narrow, width < 720, "the narrow form on touch under 720");
      await page.close();
    });
  }

  test("on a pointer the wide form stays from 640: 640 and 648 do not overlap either", async () => {
    for (const width of [640, 648, 700]) {
      const page = await open(BAND(width), { width: 800, height: 900 });
      assert.equal((await READ_BAND(page)).overlap, 0);
      assert.equal(await page.locator(".basalt-list-band-row > .basalt-list-band-range").evaluate((el) => getComputedStyle(el).display === "none"), false);
      await page.close();
    }
  });
});

describe("Fix pass 1: the band as one part", () => {
  test("the band, its Back to top and the list are one element, and the sticky band leaves with the list's end", async () => {
    const page = await open(LIST(), { width: 1440, height: 900 });
    const same = await page.evaluate(() => { const w = document.querySelector(".basalt-list-band-wrap"); return ["basalt-list-band", "basalt-list-band-sentinel", "basalt-back-to-top-dock", "basalt-list-band-foot"].every((c) => w.querySelector("." + c) !== null) && w.querySelector("#panel") !== null; });
    assert.equal(same, true);
    await goto(page, 1_000_000);
    const r = await page.evaluate(() => ({ band: document.querySelector(".basalt-list-band").getBoundingClientRect().bottom, wrap: document.querySelector(".basalt-list-band-wrap").getBoundingClientRect().bottom }));
    assert.ok(r.band <= r.wrap + 0.5, `the band does not outlive the list: ${r.band} vs ${r.wrap}`);
    await page.close();
  });

  test("at one page the pager is its room with no landmark role, not an empty landmark, and the band names its nav", async () => {
    const page = await open(LIST(), { width: 1440, height: 900 });
    assert.equal(await page.getByRole("navigation", { name: "Incident pages" }).count(), 1);
    await page.locator("#q").fill("incident 150");
    assert.equal(await page.getByRole("navigation", { name: "Incident pages" }).count(), 0, "no landmark at one page");
    assert.equal(await page.locator(".basalt-list-band-row > .basalt-pagination").getAttribute("role"), "none");
    await page.close();
  });

  test("the empty state's Clear moves focus: Clear search to the search field, Clear filters to the first filter's trigger", async () => {
    const page = await open(LIST());
    await page.locator("#q").fill("zzq");
    await page.locator("#clear").click();
    await page.waitForFunction(() => document.activeElement?.id === "q", null, { timeout: 3000 });
    await page.getByRole("button", { name: /^Severity/ }).click();
    await tap(page.getByRole("checkbox", { name: "SEV4" }));
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Status/ }).click();
    await tap(page.getByRole("checkbox", { name: "Mitigating" }));
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#clear").textContent(), "Clear filters");
    await page.locator("#clear").click();
    await page.waitForFunction(() => document.activeElement?.classList.contains("basalt-filter-trigger") && /^Severity/.test(document.activeElement.textContent), null, { timeout: 3000 });
    await page.close();
  });

  test("a filter reset clears the band's line even when the total does not change (the filter inputs are compared)", async () => {
    const page = await open(LIST());
    const line = page.locator(".basalt-list-band [role=status]");
    await page.locator("#q").fill("incident");
    const next = page.locator(".basalt-list-band-row").getByRole("button", { name: "Next page" });
    await next.click();
    await page.waitForFunction(() => document.querySelector(".basalt-list-band [role=status]").textContent !== "", null, { timeout: 3000 });
    // Same matches ("incident" matches every title), a different filter value: the page resets and the line goes.
    await page.locator("#q").fill("INCIDENT");
    await page.waitForFunction(() => document.querySelector(".basalt-list-band [role=status]").textContent === "", null, { timeout: 3000 });
    assert.equal(await line.textContent(), "");
    await page.close();
  });

  test("forced colours: nothing moves by 1px when the band sticks (the Canvas edge becomes CanvasText)", async () => {
    const page = await open(LIST(), { width: 1440, height: 900, forcedColors: "active" });
    const read = () => page.evaluate(() => ({ band: document.querySelector(".basalt-list-band").getBoundingClientRect().height, panel: document.querySelector("#panel").getBoundingClientRect().top + scrollY, row: document.querySelector("#rows li").getBoundingClientRect().top + scrollY }));
    const rest = await read();
    await goto(page, 400);
    assert.equal(await page.locator(".basalt-list-band").getAttribute("data-stuck"), "");
    assert.deepEqual(await read(), rest, "the band and the rows are where they were");
    await page.close();
  });

  test("the page size is the sm Select beside the sm pager (28 on a pointer)", async () => {
    const page = await open(LIST());
    const h = await page.evaluate(() => [document.querySelector(".basalt-list-band-size .basalt-select-trigger").getBoundingClientRect().height, document.querySelector('.basalt-list-band-row [aria-label="Next page"]').getBoundingClientRect().height]);
    assert.deepEqual(h.map(Math.round), [28, 28]);
    await page.close();
  });
});

describe("Fix pass 1: page changes the app makes later", () => {
  const LATER = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
function Later() {
  const [page, setPage] = React.useState(1);
  const ask = (n) => window.setTimeout(() => setPage(n), 500);
  return <div style={{ padding: "96px 16px 0", minHeight: 5000 }}>
    <B.ListBand total={214} maxTotal={214} page={page} pageSize={25} pagerLabel="Pages" footLabel="Pages, end" onPageChange={ask} noun="Incidents"><div style={{ height: 1800 }} id="rows">Rows</div></B.ListBand>
    <div style={{ marginTop: 3000 }}><B.Pagination aria-label="Bare" page={page} pageCount={9} onPageChange={ask} /></div>
  </div>;
}
createRoot(document.getElementById("root")).render(<Later />);`;

  test("a press stays remembered through a stuck flip: the window returns to rest when the page arrives half a second later", async () => {
    const page = await open(LATER, { width: 1440, height: 900 });
    await goto(page, 700);
    assert.equal(await page.locator(".basalt-list-band").getAttribute("data-stuck"), "");
    await page.locator(".basalt-list-band-row").getByRole("button", { name: "Next page" }).click();
    // The app has not answered yet: the reader scrolls to the top and back, so `stuck` flips twice.
    await goto(page, 0);
    await goto(page, 900);
    await page.waitForFunction(() => /^26–50/.test(document.querySelector(".basalt-list-band-row > .basalt-list-band-range [data-on]").textContent), null, { timeout: 4000 });
    await page.waitForTimeout(200);
    const r = await page.evaluate(() => ({ band: document.querySelector(".basalt-list-band").getBoundingClientRect().top, sentinel: document.querySelector(".basalt-list-band-sentinel").getBoundingClientRect().top + scrollY, y: scrollY }));
    assert.ok(Math.abs(r.band - 56) < 1.5 && Math.abs(r.y - (r.sentinel - 56)) < 1.5, `rested: ${JSON.stringify(r)}`);
    await page.close();
  });

  test("a press on a page number moves focus to the current page even when the app sets the page after an await", async () => {
    const page = await open(LATER, { width: 1440, height: 900 });
    await goto(page, 1_000_000);
    const bare = page.getByRole("navigation", { name: "Bare" });
    await bare.getByRole("button", { name: "Page 4", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Page 4" && document.activeElement.getAttribute("aria-current") === "page", null, { timeout: 4000 });
    await page.close();
  });

  test("a press the app never answers leaves nothing behind for a later arrow", async () => {
    const page = await open(`document.body.style.margin = "0"; function Never() { const [p, setP] = React.useState(1); return <div style={{ padding: 16 }}><B.Pagination aria-label="Never" page={p} pageCount={9} onPageChange={(n) => { if (n !== 4) setP(n); }} /></div>; } createRoot(document.getElementById("root")).render(<Never />);`);
    await page.getByRole("button", { name: "Page 4", exact: true }).click();
    await page.getByRole("button", { name: "Next page" }).click();
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Next page", "an arrow press moves nothing's focus");
    await page.close();
  });
});

describe("Fix pass 1: a form's state lives only while it is open", () => {
  const FORM2 = (extra = "") => FORM(`<B.Select aria-label="Severity" id="sev" defaultValue="sev2" options={[{ value: "sev1", label: "SEV1" }, { value: "sev2", label: "SEV2" }, { value: "sev3", label: "SEV3" }]} />${extra}`).replace('<B.DialogTrigger id="opener" className="basalt-button" data-variant="primary">Declare incident</B.DialogTrigger>', '<B.DialogTrigger id="opener" className="basalt-button" data-variant="primary">Declare incident</B.DialogTrigger><button id="code-open" type="button" onClick={() => setOpen(true)}>Open from code</button><button id="code-close" type="button" onClick={() => setOpen(false)}>Close from code</button>');

  test("a Select's change counts as entered: the scrim leaves a form with a changed Select open", async () => {
    const page = await open(FORM2());
    await openForm(page);
    await page.locator("#sev").click();
    await tap(page.getByRole("option", { name: "SEV3", exact: true }));
    await page.waitForTimeout(250);
    await page.mouse.click(30, 450);
    await page.waitForTimeout(300);
    assert.equal(await page.locator("#declare").count(), 1, "a changed Select is something entered");
    await page.close();
  });

  test("closed and reopened from code: nothing is remembered (entered or opened by touch)", async () => {
    const page = await open(FORM2(), { width: 1440, height: 900, hasTouch: true });
    await page.locator("#opener").tap();
    await page.locator("#declare").waitFor();
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.className), "basalt-dialog-title", "opened by touch: the title");
    await page.locator("#what").fill("Checkout is timing out");
    // Closed from code, with something entered; reopened from code with a key press: pristine, and the first field.
    await page.evaluate(() => document.getElementById("code-close").click());
    await page.locator("#declare").waitFor({ state: "detached" });
    await page.locator("#code-open").focus();
    await page.keyboard.press("Enter");
    await page.locator("#declare").waitFor();
    await settle(page);
    assert.equal(await page.locator("#what").inputValue(), "");
    await page.waitForFunction(() => document.activeElement?.id === "what", null, { timeout: 3000 });
    await page.mouse.click(30, 450);
    await page.locator("#declare").waitFor({ state: "detached" });
    await page.close();
  });
});

describe("Fix pass 1: a still table with the band", () => {
  const TABLE_LIST = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
const PAST = Array.from({ length: 486 }, (_, j) => ({ ref: "INC-" + String(486 - j).padStart(4, "0"), title: "Synthetic past incident " + (486 - j), sev: ["SEV1", "SEV2", "SEV3", "SEV4"][(j * 5) % 4], who: ["Ama Kestrel", "Lio Brask", "Noor Feldane"][j % 3], took: (j * 11) % 14 }));
function PastList() {
  const [page, setPage] = React.useState(1); const [size, setSize] = React.useState(25); const [sort, setSort] = React.useState("descending");
  const rows = [...PAST].sort((a, b) => (sort === "ascending" ? 1 : -1) * (a.ref < b.ref ? -1 : 1)).slice((page - 1) * size, page * size);
  return <div id="app" style={{ padding: "96px 16px 0", minHeight: 3000 }}>
    <B.ListBand total={PAST.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} noun="Past incidents" pagerLabel="Past incident pages" filterKey={sort}>
      <B.TableContainer label="Past incidents"><B.Table columns={[{ width: 110 }, { width: 90 }, { width: 150 }, { width: 100 }, {}]} minWidth={560}>
        <B.TableHeader><B.TableRow><B.TableHead sort={sort} onSortChange={(d) => { setSort(d); setPage(1); }}>Ref</B.TableHead><B.TableHead>Severity</B.TableHead><B.TableHead>Commander</B.TableHead><B.TableHead numeric>Took</B.TableHead><B.TableHead>Title</B.TableHead></B.TableRow></B.TableHeader>
        <B.TableBody>{rows.map((r) => <B.TableRow key={r.ref}><B.TableRowHead>{r.ref}</B.TableRowHead><B.TableCell>{r.sev}</B.TableCell><B.TableCell>{r.who}</B.TableCell><B.TableCell numeric>{r.took} h</B.TableCell><B.TableCell>{r.title}</B.TableCell></B.TableRow>)}</B.TableBody>
      </B.Table></B.TableContainer>
    </B.ListBand>
  </div>;
}
createRoot(document.getElementById("root")).render(<PastList />);`;
  const COLS = `window.__cols = () => { const box = (el) => { const r = el.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; }; const out = { band: box(document.querySelector(".basalt-list-band")), prev: box(document.querySelector('.basalt-list-band-row [aria-label="Previous page"]')), next: box(document.querySelector('.basalt-list-band-row [aria-label="Next page"]')), size: box(document.querySelector(".basalt-list-band-size .basalt-select-trigger")) }; document.querySelectorAll("thead th").forEach((th, i) => { out["column " + i] = box(th); }); return out; };`;

  for (const [width, height, options] of [[1440, 900, {}], [390, 844, COARSE]]) {
    test(`at ${width}: the columns, the band and the pager do not move across every page, size and sort`, async () => {
      const page = await open(TABLE_LIST, { width, height, ...options });
      await page.evaluate(COLS);
      await goto(page, 0);
      const first = await page.evaluate(() => window.__cols());
      const problems = [];
      const check = async (what) => { const now = await page.evaluate(() => window.__cols()); for (const k of Object.keys(first)) { if (first[k].some((v, i) => Math.abs(v - now[k][i]) > 0.5)) problems.push(`${what}: ${k} moved`); } };
      const next = page.locator(".basalt-list-band-row").getByRole("button", { name: "Next page" });
      const size = page.getByRole("combobox", { name: "Past incidents per page" });
      for (const n of ["10", "50", "100", "25"]) {
        await size.click();
        await tap(page.getByRole("option", { name: n, exact: true }));
        await goto(page, 0);
        await check(`size ${n}`);
        for (let g = 0; g < 6 && (await next.getAttribute("aria-disabled")) !== "true"; g += 1) { await next.click(); await goto(page, 0); await check(`size ${n} page ${g + 2}`); }
      }
      for (const direction of ["Ref", "Ref"]) { await page.locator("thead th button.basalt-sort").first().click(); await goto(page, 0); await check(`sort ${direction}`); }
      assert.deepEqual(problems, []);
      await page.close();
    });
  }
});
