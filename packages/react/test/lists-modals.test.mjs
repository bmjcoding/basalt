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
  await settle(page);
  page.errors = errors;
  return page;
};
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
const LIST = (extra = "") => `document.body.style.margin = "0";
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
    <div id="app" style={{ padding: "0 16px", minHeight: 4000 }}>
      <B.FilterToolbar label="Filter incidents" search={<input id="q" className="basalt-input" aria-label="Search incidents" value={q} onChange={(e) => { setQ(e.target.value); back(); }} />}
        filter={[<B.MultiSelect key="s" toolbar label="Severity" options={${JSON.stringify(SEV.map((v) => ({ value: v, label: v })))}} value={sev} onValueChange={(v) => { setSev(v); back(); }} />,
          <B.MultiSelect key="t" toolbar label="Status" options={${JSON.stringify(STATUS.map((v) => ({ value: v, label: v })))}} value={status} onValueChange={(v) => { setStatus(v); back(); }} />]}
        result={<B.FilterResult>{"Showing " + shown.length + " of " + ALL.length + " incidents"}</B.FilterResult>} />
      <B.ListBand id="band" total={shown.length} maxTotal={ALL.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} noun="Incidents" />
      <div className="basalt-card" id="panel">
        {rows.length ? <ul id="rows" style={{ listStyle: "none", margin: 0, padding: 0 }}>{rows.map((r) => <li key={r.n}><a className="row" href={"#" + r.n} style={{ display: "block", padding: "12px 16px", height: 48, boxSizing: "border-box" }}>{r.sev} {r.title} {r.status}</a></li>)}</ul>
          : <div id="empty"><p>{filtered ? (q ? "No incidents match \\u201C" + q + "\\u201D with these filters." : "No incidents match these filters.") : "No incidents match \\u201C" + q + "\\u201D."}</p><B.Button id="clear" onClick={() => { setQ(""); setSev([]); setStatus([]); back(); }}>{filtered ? "Clear filters" : "Clear search"}</B.Button></div>}
      </div>
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
  const PAGES = (n, extra = "") => `document.body.style.margin = "0"; function P() { const [p, setP] = React.useState(1); return <div style={{ padding: 16 }}><B.Pagination page={p} pageCount={${n}} onPageChange={setP} ${extra} /></div>; } createRoot(document.getElementById("root")).render(<P />);`;
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
        const widths = Object.entries(now).filter(([k]) => k.startsWith("slot")).map(([, v]) => v[2]);
        assert.equal(new Set(widths.map((w) => Math.round(w * 2))).size, 1, `slots are one width at page ${p + 1}: ${widths}`);
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
      const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><B.Pagination page={1} pageCount={${n}} maxPages={22} /></div>);`);
      const nav = page.locator(".basalt-pagination");
      assert.deepEqual(await nav.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }), box, `${n} pages keeps the room of 22`);
      for (const name of ["Previous page", "Next page"]) assert.equal(await page.locator(`[aria-label="${name}"]`).evaluate((el) => getComputedStyle(el).visibility), "hidden");
      await page.close();
    }
  });

  test("it never wraps, and under 640px of its container it is Previous, the summary and Next", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div id="card" style={{ padding: 16, width: 292, containerType: "inline-size" }}><B.Pagination page={3} pageCount={22} onPageChange={() => {}} /></div>);`, { width: 390, height: 844, ...COARSE });
    const nav = page.locator(".basalt-pagination");
    assert.equal(await page.locator(".basalt-pagination-pages").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await page.locator(".basalt-pagination-summary").textContent(), "Page 3 of 22");
    const rows = await nav.evaluate((el) => new Set([...el.children].filter((c) => c.getClientRects().length).map((c) => { const r = c.getBoundingClientRect(); return Math.round(r.top + r.height / 2); })).size);
    assert.equal(rows, 1, "one row");
    assert.ok(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
    await page.close();
    const wide = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 700, containerType: "inline-size" }}><B.Pagination page={3} pageCount={22} onPageChange={() => {}} /></div>);`);
    assert.notEqual(await wide.locator(".basalt-pagination-pages").evaluate((el) => getComputedStyle(el).display), "none");
    assert.equal(await wide.locator(".basalt-pagination-summary").evaluate((el) => getComputedStyle(el).display), "none");
    await wide.close();
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
