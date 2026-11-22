// agnostic (cimip-gaps-2, batch AF; Sol's audit, DECISIONS 266): Basalt is a design system for any app, not for its first one. The public surface's vocabulary
// lint; fixtures in two unlike domains (a shop's catalog and a build pipeline, an account and an order) with unrelated schemas and long labels, other page
// sizes, a total that changes by itself and a slow page, a list in a pane inside a scrolling page, a form grid in a 480 place on a wide window, a multi-select's
// entered state and the app's own `dirty`, and an explainer on a header that does not sort; and what the app owns: no storage or fetch of Basalt's own, known-
// empty and atomic stand-ins, and one Mod on Apple's and other systems. Driven in Chromium against the built package with the real stylesheet, and in Node for
// the plain modules. The fixtures load no web font, so every measured margin is wider than a fallback font's width. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { checkAll, checkSource, nounsIn, words } from "../../../scripts/check-vocabulary.mjs";
import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(path.join(pkg, "..", "..", "node_modules", "axe-core", "axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  if (options.isMobile) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  await settle(page);
  page.errors = errors;
  return page;
};
const tap = async (locator) => { const box = await locator.boundingBox(); await locator.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2); };
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

// ---- The public-surface vocabulary lint ----

describe("the public surface names no app's nouns (npm run lint)", () => {
  test("the repository's public surface passes", () => {
    assert.deepEqual(checkAll(), []);
  });

  test("it matches words and the words inside identifiers, never a substring", () => {
    assert.deepEqual(words("incidentId basalt-incident-row SEV1 aria-describedby"), ["incident", "id", "basalt", "incident", "row", "sev1", "aria", "describedby"]);
    assert.deepEqual(nounsIn("const incidentId = 1; // and subscribe(), aria-describedby, prescribed"), ["incident"]);
    assert.deepEqual(nounsIn('label="War room" severityLevel ServiceNow rolodexes'), ["war room", "severity", "servicenow", "rolodexes"]);
    assert.deepEqual(nounsIn("several seven severe"), []);
  });

  test("it reads exported names, props, default strings, aria labels, errors, data attributes, selectors and token names, and not comments", () => {
    const tsx = [
      "/** An incident row: the doc says so, and docs are not the surface. */",
      "export function IncidentRow({ commander = \"\" }) {",
      "  // the severity lives in the app",
      "  if (!commander) throw new Error(\"Pick a severity\");",
      "  return <div data-sev=\"1\" aria-label=\"Scribe\">{\"x\"}</div>;",
      "}",
    ].join("\n");
    assert.deepEqual(checkSource("x.tsx", tsx).map((p) => p.line), [2, 4, 5]);
    assert.deepEqual(checkSource("x.css", "/* a severity note */\n.basalt-incident-row { color: inherit; }\n.basalt-row { --basalt-severity-ink: red; }").map((p) => p.line), [2, 3]);
    assert.deepEqual(checkSource("x.tokens.json", '{ "color": { "incident": { "$value": "#000", "$description": "the incident colour" } } }').map((p) => p.line), [1]);
    assert.deepEqual(checkSource("x.tokens.json", '{ "color": { "ink": { "$value": "#000", "$description": "not for an incident" } } }'), []);
  });

  test("a person's name as a default fails; a marked example is excused, and a marker needs a reason and must excuse something", () => {
    assert.match(checkSource("x.ts", 'export const OWNER = "Dana Whitfield";')[0].message, /person's name/);
    assert.deepEqual(checkSource("x.ts", 'export const LABEL = "Not observed";'), []);
    assert.deepEqual(checkSource("x.ts", "// basalt-vocabulary-example -- a fixture's own data, shipped for tests\nexport const ROW = { title: \"An incident\" };"), []);
    assert.match(checkSource("x.ts", "// basalt-vocabulary-example\nexport const ROW = \"incident\";")[0].message, /needs a reason/);
    assert.match(checkSource("x.ts", "// basalt-vocabulary-example -- nothing here\nexport const ROW = \"order\";")[0].message, /excuses nothing/);
  });

  test("it runs in npm run lint", async () => {
    const { LINT } = await import(pathToFileURL(path.join(pkg, "..", "..", "scripts", "lint.mjs")).href);
    assert.ok(LINT.some((step) => step.command === "node scripts/check-vocabulary.mjs"));
  });
});

// ---- Two domains: unrelated schemas, long labels, other page sizes, a live total, a slow page ----

// A list the app owns: `rows` of any shape, its own noun and sizes, an optional delay before a page it is asked for arrives, and an optional live total.
const LIST = ({ noun, sizes, start, delay = 0, foot = "" }) => `document.body.style.margin = "0";
const ROWS = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, label: ${JSON.stringify(noun)} + " " + (i + 1) }));
function App() {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(${start});
  const [extra, setExtra] = React.useState(0);
  const [key, setKey] = React.useState("all");
  window.__fx = { setExtra, setKey, setPage };
  const total = 240 + extra;
  const ask = (n) => (${delay} ? window.setTimeout(() => setPage(n), ${delay}) : setPage(n));
  const rows = ROWS.slice(0, total).slice((page - 1) * size, page * size);
  return (
    <div style={{ padding: "96px 16px 0", minHeight: 6000 }}>
      <h2 id="title" tabIndex={-1}>The list</h2>
      <B.ListBand id="band" noun={${JSON.stringify(noun)}} pageSizes={${JSON.stringify(sizes)}} total={total} maxTotal={300} page={page} pageSize={size} filterKey={key} onPageChange={ask} onPageSizeChange={setSize} heading="title" footLabel=${JSON.stringify(foot || "Pages, end of list")}>
        <ul id="rows" style={{ margin: 0, padding: 0, listStyle: "none" }}>{rows.map((r) => <li key={r.id} style={{ height: 40 }}>{r.label}</li>)}</ul>
      </B.ListBand>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const said = (page) => page.evaluate(() => document.querySelector("#band [role=status]").textContent);

describe("two domains: the band takes the app's words, sizes and timing", () => {
  test("unrelated schemas and long labels: the noun names the select and is said, and a long one wraps without overflow at 390", async () => {
    for (const [noun, width] of [["Replacement parts and accessories for older models", 1440], ["Builds", 1440], ["Replacement parts and accessories for older models", 390]]) {
      const page = await open(LIST({ noun, sizes: [10, 25, 50, 100], start: 25 }), { width, height: 844 });
      assert.equal(await page.locator("#band [role=combobox]").getAttribute("aria-label"), `${noun} per page`);
      await tap(page.locator('#band [aria-label="Next page"]'));
      await page.waitForFunction(() => document.querySelector("#band [role=status]").textContent.startsWith("Page 2"));
      assert.equal(await said(page), `Page 2 of 10. ${noun} 26 to 50 of 240.`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${noun} at ${width}: no horizontal scroll`);
      assert.deepEqual(page.errors, []);
      await page.close();
    }
  });

  test("other page sizes: the app's sizes are the options, and a new size keeps the reader's first row (page 3 of 12 is page 2 of 24)", async () => {
    const page = await open(LIST({ noun: "Recipes", sizes: [12, 24, 48], start: 12 }));
    await page.evaluate(() => window.__fx.setPage(3));
    await frames(page);
    await page.locator("#band [role=combobox]").click();
    assert.deepEqual(await page.locator("[role=option]").allTextContents(), ["12", "24", "48"]);
    await page.locator("[role=option]", { hasText: "24" }).click();
    await page.waitForFunction(() => document.querySelector("#rows li")?.textContent === "Recipes 25");
    assert.equal(await page.locator("#rows li").first().textContent(), "Recipes 25", "the first row of page 3 at 12 is on page 2 at 24");
    await page.close();
  });

  // Under the fake clock (timers and frames move only when the test says) the page's own wait is 12s; the browser's IntersectionObserver still runs in real time.
  const slow = async (delay) => {
    const { page, errors } = await fixturePage(browser, LIST({ noun: "Invoices", sizes: [10, 25, 50, 100], start: 25, delay }), { theme: "dark", viewport: { width: 1440, height: 900 }, clock: true });
    page.errors = errors;
    await page.clock.runFor(100);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(150);
    await page.clock.runFor(100);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("#band").getAttribute("data-stuck"), "", "stuck");
    return page;
  };
  const restOf = (page) => page.evaluate(() => { const s = document.querySelector(".basalt-list-band-sentinel"); return Math.max(0, Math.round(s.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(s).scrollMarginTop))); });

  test("a slow page: the return to rest waits for the page asked for, past ten seconds, with no window of time", async () => {
    const page = await slow(12_000);
    await tap(page.locator('#band [aria-label="Next page"]'));
    await page.clock.runFor(6000);
    assert.equal(await page.evaluate(() => window.scrollY), 900, "nothing moves while the page is on its way");
    await page.clock.runFor(6500);
    assert.equal(await page.locator("#rows li").first().textContent(), "Invoices 26");
    assert.equal(await page.evaluate(() => window.scrollY), await restOf(page), "the page arrived: the window is at the band's rest");
    await page.clock.runFor(500);
    assert.match(await said(page), /^Page 2 of 10\./);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("a slow page that a filter overtakes is forgotten: the page the filter lands on does not move the window", async () => {
    const page = await slow(3000);
    await tap(page.locator('#band [aria-label="Next page"]'));
    await page.evaluate(() => { window.__fx.setKey("paid"); });
    await page.clock.runFor(3500);
    assert.equal(await page.locator("#rows li").first().textContent(), "Invoices 26", "the page did arrive");
    assert.equal(await page.evaluate(() => window.scrollY), 900, "the press was forgotten when the filter changed");
    await page.close();
  });

  test("a total that changes by itself: with a filterKey it neither clears the line nor swallows a page change; the filterKey's change clears it", async () => {
    const page = await open(LIST({ noun: "Messages", sizes: [10, 25, 50, 100], start: 25 }));
    await tap(page.locator('#band [aria-label="Next page"]'));
    await page.waitForFunction(() => document.querySelector("#band [role=status]").textContent.startsWith("Page 2"));
    // Rows arrive: the total goes up, the line stays.
    await page.evaluate(() => window.__fx.setExtra(30));
    await page.waitForTimeout(600);
    assert.equal(await said(page), "Page 2 of 10. Messages 26 to 50 of 240.", "a live total does not clear what was said");
    // A page change that lands with a live total is still said, with the new total.
    await page.evaluate(() => { window.__fx.setExtra(40); window.__fx.setPage(3); });
    await page.waitForFunction(() => document.querySelector("#band [role=status]").textContent.startsWith("Page 3"));
    assert.equal(await said(page), "Page 3 of 12. Messages 51 to 75 of 280.");
    // A filter (the app's key) clears it.
    await page.evaluate(() => { window.__fx.setKey("unread"); window.__fx.setPage(1); });
    await page.waitForTimeout(600);
    assert.equal(await said(page), "");
    await page.close();
  });
});

// ---- Nested scrolling: a list in a pane, in a page that scrolls too ----

const PANE = (domain) => `document.body.style.margin = "0";
const ROWS = Array.from({ length: 180 }, (_, i) => ${domain === "catalog" ? '"Product " + (i + 1)' : '"Build #" + (5000 - i)'});
function App() {
  const pane = React.useRef(null);
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(${domain === "catalog" ? 50 : 30});
  const rows = ROWS.slice((page - 1) * size, page * size);
  return (
    <div style={{ minHeight: 3000 }}>
      <div style={{ height: 200 }}>A page above the pane</div>
      <div id="pane" ref={pane} style={{ height: 600, overflow: "auto", border: "1px solid", margin: "0 16px" }}>
        <div style={{ height: 120 }}>The pane's own top</div>
        <h2 id="title" tabIndex={-1}>${domain === "catalog" ? "Catalog" : "Builds"}</h2>
        <B.ListBand id="band" scroller={pane} heading="title" noun=${JSON.stringify(domain === "catalog" ? "Products" : "Builds")} total={ROWS.length} page={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} footLabel="Pages, end of list">
          <ul id="rows" style={{ margin: 0, padding: 0, listStyle: "none" }}>{rows.map((r) => <li key={r} style={{ height: 40 }}>{r}</li>)}</ul>
        </B.ListBand>
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const paneState = (page) => page.evaluate(() => {
  const pane = document.getElementById("pane");
  const band = document.getElementById("band");
  const top = pane.getBoundingClientRect().top + pane.clientTop;
  const back = document.querySelector(".basalt-back-to-top");
  return { scroll: pane.scrollTop, windowY: window.scrollY, bandTop: band.getBoundingClientRect().top - top, stuck: band.hasAttribute("data-stuck"), back: back.hasAttribute("data-shown"), backTop: back.getBoundingClientRect().top - top, bandBottom: band.getBoundingClientRect().bottom - top };
});

describe("nested scrolling: ListBand and BackToTop follow the pane they are given", () => {
  for (const domain of ["catalog", "builds"]) {
    test(`${domain}: the band sticks to the pane's top, not the window's, and the window never moves`, async () => {
      const page = await open(PANE(domain));
      await page.evaluate(() => { document.getElementById("pane").scrollTop = 900; });
      await frames(page); await frames(page);
      const s = await paneState(page);
      assert.equal(s.stuck, true, "stuck in the pane");
      assert.ok(Math.abs(s.bandTop) < 0.5, `the band rests at the pane's top edge: ${s.bandTop}`);
      assert.equal(s.windowY, 0);
      assert.deepEqual(page.errors, []);
      await page.close();
    });
  }

  test("paging while stuck returns the pane to the band's rest, and the window stays where it was", async () => {
    const page = await open(PANE("catalog"));
    await page.evaluate(() => { window.scrollTo(0, 100); document.getElementById("pane").scrollTop = 1400; });
    await frames(page); await frames(page);
    await tap(page.locator('#band [aria-label="Next page"]'));
    await page.waitForFunction(() => document.querySelector("#rows li")?.textContent === "Product 51");
    await frames(page);
    const s = await paneState(page);
    const rest = await page.evaluate(() => { const pane = document.getElementById("pane"); const sentinel = document.querySelector(".basalt-list-band-sentinel"); return Math.round(sentinel.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientTop + pane.scrollTop); });
    assert.equal(Math.round(s.scroll), rest, "the pane is at the band's rest");
    assert.equal(s.windowY, 100, "the window did not move");
    const first = await page.evaluate(() => { const pane = document.getElementById("pane"); return Math.round(document.querySelector("#rows li").getBoundingClientRect().top - pane.getBoundingClientRect().top); });
    assert.ok(first >= Math.round(s.bandBottom) - 1, "the new page's first row shows under the band");
    await page.close();
  });

  test("Back to top watches the pane: drawn past one pane-height, gone on a turn up, and a press takes the pane to its top and focuses the heading", async () => {
    const page = await open(PANE("catalog"));
    const pane = page.locator("#pane");
    for (const y of [300, 900, 1600]) { await pane.evaluate((el, to) => { el.scrollTop = to; }, y); await frames(page); }
    let s = await paneState(page);
    assert.equal(s.back, true, "drawn while scrolling down the pane");
    assert.ok(s.backTop > s.bandBottom - 0.5, "under the stuck band, inside the pane");
    // A window scroll is not the pane's: it changes nothing.
    await page.evaluate(() => window.scrollTo(0, 150)); await frames(page);
    assert.equal((await paneState(page)).back, true);
    await pane.evaluate((el) => { el.scrollTop -= 40; }); await frames(page); await frames(page);
    assert.equal((await paneState(page)).back, false, "gone on a turn up in the pane");
    await pane.evaluate((el) => { el.scrollTop += 200; }); await frames(page); await frames(page);
    assert.equal((await paneState(page)).back, true);
    await page.waitForTimeout(200);
    await tap(page.locator(".basalt-back-to-top"));
    await frames(page);
    s = await paneState(page);
    assert.equal(s.scroll, 0, "the pane is at its top");
    assert.equal(s.windowY, 150, "the window is not moved");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "title");
    await page.close();
  });

  test("under 720 the foot's Next returns the pane to the band's rest and focuses the band's own Next", async () => {
    const page = await open(PANE("builds"), { width: 390, height: 844, hasTouch: true, isMobile: true });
    await page.locator("#pane").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await frames(page);
    await tap(page.locator('.basalt-list-band-foot [aria-label="Next page"]'));
    await page.waitForFunction(() => document.querySelector("#rows li")?.textContent === "Build #4970");
    await frames(page);
    const rest = await page.evaluate(() => { const pane = document.getElementById("pane"); const sentinel = document.querySelector(".basalt-list-band-sentinel"); return Math.round(sentinel.getBoundingClientRect().top - pane.getBoundingClientRect().top - pane.clientTop + pane.scrollTop); });
    assert.equal(Math.round((await paneState(page)).scroll), rest);
    assert.equal(await page.evaluate(() => document.activeElement?.closest("#band") !== null && document.activeElement.getAttribute("aria-label")), "Next page");
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- A form grid answers its own width ----

const FIELDS = (pre) => `<B.Field label="Display name" column={1} row={1}><B.Input id="${pre}-a" /></B.Field><B.Field label="Email address for receipts and notices" column={2} row={1}><B.Input id="${pre}-b" /></B.Field><B.Field label="Postcode" column={1} row={2}><B.Input id="${pre}-c" /></B.Field><B.Field label="Country" column={2} row={2}><B.Input id="${pre}-d" /></B.Field>`;
const PLACES = `document.body.style.margin = "0";
function App() {
  return (
    <div style={{ padding: 16, display: "grid", gap: 24 }}>
      <div id="wide" style={{ width: 992 }}><B.FormGrid id="g-wide">${FIELDS("w")}</B.FormGrid></div>
      <div id="form480" style={{ width: 480 }}><B.FormGrid id="g-480">${FIELDS("f")}</B.FormGrid></div>
      <div id="pane" style={{ width: 360 }}><B.FormGrid id="g-pane">${FIELDS("p")}</B.FormGrid></div>
      <B.Dialog defaultOpen><B.DialogContent form size="wide" id="dialog"><B.SheetHeader closeLabel="Close"><B.DialogTitle>Account</B.DialogTitle></B.SheetHeader><B.SheetBody><B.FormGrid id="g-dialog">${FIELDS("d")}</B.FormGrid></B.SheetBody></B.DialogContent></B.Dialog>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const columnsOf = (page, id) => page.evaluate((grid) => [...document.querySelectorAll(`#${grid} > .basalt-field`)].map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }), id);

describe("FormGrid answers the width it is given, at one desktop window", () => {
  test("at 1440 a 992 place and the wide dialog are two columns; a 480 place and a 360 pane are one, in the markup's order", async () => {
    const page = await open(PLACES);
    for (const id of ["g-wide", "g-dialog"]) {
      const [a, b, c, d] = await columnsOf(page, id);
      assert.equal(a[1], b[1], `${id}: row 1 shares a line`);
      assert.ok(b[0] > a[0], `${id}: two columns`);
      assert.equal(a[0], c[0], `${id}: column 1 lines up`);
      assert.ok(c[1] > a[1] && d[1] === c[1], `${id}: row 2 under row 1`);
    }
    for (const id of ["g-480", "g-pane"]) {
      const cells = await columnsOf(page, id);
      for (let i = 1; i < cells.length; i += 1) {
        assert.equal(cells[i][0], cells[0][0], `${id}: one column`);
        assert.ok(cells[i][1] > cells[i - 1][1], `${id}: the markup's order`);
      }
    }
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("the phone stack is kept: under 720 even a wide place is one column", async () => {
    const page = await open(PLACES.replace('style={{ width: 992 }}', 'style={{ width: 700 }}'), { width: 716, height: 900 });
    const cells = await columnsOf(page, "g-wide");
    for (const cell of cells.slice(1)) assert.equal(cell[0], cells[0][0]);
    await page.close();
  });
});

// ---- The form dialog: what is entered, by structure, and the app's own answer ----

const FORM = (dirty) => `document.body.style.margin = "0";
function App() {
  const [open, setOpen] = React.useState(false);
  window.__open = () => open;
  return (
    <div style={{ padding: 16 }}>
      <B.Dialog open={open} onOpenChange={setOpen}>
        <B.DialogTrigger id="opener" className="basalt-button">Edit</B.DialogTrigger>
        <B.DialogContent form id="dialog"${dirty === undefined ? "" : ` dirty={${dirty}}`}>
          <B.SheetHeader closeLabel="Close"><B.DialogTitle>Preferences</B.DialogTitle></B.SheetHeader>
          <B.SheetBody>
            <label htmlFor="tags">Tags</label>
            <select id="tags" multiple defaultValue={["red"]}><option value="red">Red</option><option value="green">Green</option><option value="blue">Blue</option></select>
            <B.MultiSelect label="Topics" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} defaultValue={["a"]} />
            <label htmlFor="file">Attachment</label><input id="file" type="file" />
          </B.SheetBody>
        </B.DialogContent>
      </B.Dialog>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;
const scrim = async (page) => { await page.mouse.click(8, 8); await page.waitForTimeout(350); return page.evaluate(() => window.__open()); };
const openForm = async (page) => { await page.locator("#opener").click(); await page.locator("#dialog").waitFor(); await settle(page); };

describe("the form dialog's entered check reads structure, and the app's dirty wins", () => {
  test("a multi-select's second option: .value is unchanged, but the selection is not, so the scrim keeps the form; put back, it closes", async () => {
    const page = await open(FORM());
    await openForm(page);
    await page.evaluate(() => { const s = document.getElementById("tags"); s.options[2].selected = true; });
    assert.equal(await page.evaluate(() => document.getElementById("tags").value), "red", "the first selected option is the same");
    assert.equal(await scrim(page), true, "kept open");
    await page.evaluate(() => { document.getElementById("tags").options[2].selected = false; });
    assert.equal(await scrim(page), false, "nothing entered: the scrim closes it");
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("Basalt's MultiSelect and a file input count as entered", async () => {
    const page = await open(FORM());
    await openForm(page);
    await page.locator("#dialog [role=checkbox]", { hasText: "Beta" }).click();
    assert.equal(await scrim(page), true, "a ticked topic keeps it open");
    await page.locator("#dialog [role=checkbox]", { hasText: "Beta" }).click();
    assert.equal(await scrim(page), false);
    await openForm(page);
    await page.setInputFiles("#file", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("synthetic") });
    assert.equal(await scrim(page), true, "a chosen file keeps it open");
    await page.close();
  });

  test("the app's dirty wins: true keeps a form with nothing changed, false lets the scrim close a changed one; Esc closes either", async () => {
    let page = await open(FORM(true));
    await openForm(page);
    assert.equal(await scrim(page), true, "dirty={true}");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => window.__open()), false, "Esc closes it");
    await page.close();
    page = await open(FORM(false));
    await openForm(page);
    await page.evaluate(() => { document.getElementById("tags").options[1].selected = true; });
    assert.equal(await scrim(page), false, "dirty={false}");
    await page.close();
  });
});

// ---- An explainer on a header that does not sort ----

const FIXED = `document.body.style.margin = "0";
function App() {
  const [shown, setShown] = React.useState(true);
  window.__hide = () => setShown(false);
  return (
    <div style={{ padding: "160px 16px 16px" }}>
      <button id="before">Before</button>
      <B.TableContainer label="Plans">
        <B.Table columns={[{}, { width: 160 }, { width: 120 }]} minWidth={480}>
          <B.TableHeader><B.TableRow><B.TableHead>Plan</B.TableHead>
            <B.TableHead id="fair" explainer={shown ? <B.TableHeadExplainer title="Fair use"><p>What a plan allows before we ask you to move up.</p></B.TableHeadExplainer> : undefined}>Fair use</B.TableHead>
            <B.TableHead numeric>Per month</B.TableHead></B.TableRow></B.TableHeader>
          <B.TableBody><B.TableRow><B.TableRowHead>Starter</B.TableRowHead><B.TableCell>20 GB</B.TableCell><B.TableCell numeric>$12</B.TableCell></B.TableRow></B.TableBody>
        </B.Table>
      </B.TableContainer>
      <button id="after">After</button>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`;

describe("an explainer on a header that does not sort", () => {
  test("the header is a focus stop described by the card; keyboard focus opens it, Esc closes it and the inset ring stays; axe passes", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(FIXED, { theme });
      const th = page.locator("#fair");
      assert.equal(await th.getAttribute("tabindex"), "0");
      assert.equal(await th.evaluate((el) => el.querySelector("button")), null, "no button is added");
      const body = await page.locator(".basalt-explainer-body").getAttribute("id");
      assert.equal(await th.getAttribute("aria-describedby"), body);
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "fair", "Tab reaches the header");
      await page.locator(".basalt-explainer[data-open]").waitFor();
      const ring = await th.evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
      assert.deepEqual(ring, ["solid", "2px", "-2px"], "the still table's inset ring");
      assert.deepEqual(await axe(page), [], theme);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".basalt-explainer[data-open]"));
      assert.equal(await page.evaluate(() => document.activeElement?.id), "fair", "focus stays on the header");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "after");
      await page.close();
    }
  });

  test("hover after the wait opens it, a press does nothing else, and a long press opens it on touch", async () => {
    let page = await open(FIXED);
    await page.locator("#fair").hover();
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".basalt-explainer[data-open]").count(), 0, "not before the wait");
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".basalt-explainer[data-open]").count(), 1, "open after 600ms");
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(100);
    assert.equal(await page.locator(".basalt-explainer[data-open]").count(), 1, "a press on a header that does not sort leaves it open");
    await page.close();
    page = await open(FIXED, { width: 390, height: 844, hasTouch: true, isMobile: true });
    const box = await page.locator("#fair").boundingBox();
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
    await page.waitForTimeout(700);
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.locator(".basalt-explainer[data-open]").waitFor();
    await page.close();
  });

  test("without its explainer the header is a plain header again", async () => {
    const page = await open(FIXED);
    await page.evaluate(() => window.__hide());
    await frames(page);
    assert.equal(await page.locator("#fair").getAttribute("tabindex"), null);
    assert.equal(await page.locator("#fair").getAttribute("aria-describedby"), null);
    await page.close();
  });
});

// ---- What the app owns ----

const shapeData = () => import(pathToFileURL(path.join(pkg, "dist", "shape-data.js")).href);

describe("ownership: stand-ins, counts and storage", () => {
  test("known-null and atomic values: null is known-empty, a Date, an array and a class instance are taken whole, undefined is stood in", async () => {
    const { fillIn } = await shapeData();
    const when = new Date(5);
    const list = [1];
    const map = new Map([["a", 1]]);
    const out = fillIn({ note: null, when, list, map, count: 0, word: "", nested: { a: 1 }, unknown: undefined }, { note: "x", when: new Date(0), list: [2, 3], map: new Map(), count: 5, word: "w", nested: { a: 0, b: 2 }, unknown: "kept" });
    assert.equal(out.note, null, "null stays: known to be empty");
    assert.equal(out.when, when, "a Date is taken as given");
    assert.equal(out.list, list, "an array is taken whole");
    assert.equal(out.map, map, "an object with a prototype of its own is taken whole");
    assert.equal(out.count, 0);
    assert.equal(out.word, "");
    assert.deepEqual(out.nested, { a: 1, b: 2 }, "a plain record is merged");
    assert.equal(out.unknown, "kept", "undefined is unknown: the stand-in's value");
    assert.deepEqual(fillIn(null, { a: 1 }), { a: 1 }, "nothing known");
    assert.deepEqual(fillIn(Object.assign(Object.create(null), { a: 2 }), { a: 1, b: 1 }), { a: 2, b: 1 }, "a record with no prototype is plain");
    const record = { a: 1 };
    assert.equal(fillIn(record, new Date(0)), record, "a record over a Date is taken as given");
  });

  test("a count is kept where the app says, or for the page's life; nothing reaches storage the app did not pass", async () => {
    const { rememberCount, rememberedCount, forgetCount } = await shapeData();
    assert.equal(typeof globalThis.localStorage, "undefined", "no storage in Node");
    rememberCount("orders", 12);
    assert.equal(rememberedCount("orders"), 12, "the page's own memory");
    forgetCount("orders");
    assert.equal(rememberedCount("orders"), null);
    const kept = new Map();
    const store = { getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => kept.set(k, v), removeItem: (k) => kept.delete(k) };
    rememberCount("builds", 7, store);
    rememberCount("builds-bad", 1.5, store);
    assert.deepEqual([...kept], [["basalt-shape:builds", "7"]]);
    assert.equal(rememberedCount("builds", store), 7);
    assert.equal(rememberedCount("builds"), null, "the page's memory is not the store");
    const blocked = () => { throw new Error("SecurityError"); };
    assert.doesNotThrow(() => rememberCount("x", 1, blocked));
    assert.equal(rememberedCount("x", blocked), null, "blocked storage reads as none");
  });

  test("importing the presentation utilities with storage unavailable, and rendering the audited parts, throws nothing, persists nothing and fetches nothing", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    // Storage that throws when touched, and a record of every write, fetch, beacon and request.
    await context.addInitScript(() => {
      window.__touched = [];
      for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, { configurable: true, get() { window.__touched.push(name); throw new DOMException("blocked", "SecurityError"); } });
      const fetch = window.fetch; window.fetch = (...a) => { window.__touched.push("fetch"); return fetch(...a); };
      const send = navigator.sendBeacon?.bind(navigator); navigator.sendBeacon = (...a) => { window.__touched.push("beacon"); return send?.(...a); };
      const xhr = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (...a) { window.__touched.push("xhr"); return xhr.apply(this, a); };
    });
    const requests = [];
    const script = await bundleFixture(`
function App() {
  const [page, setPage] = React.useState(1);
  const [count] = React.useState(() => B.rememberedCount("orders") ?? 3);
  React.useEffect(() => { B.rememberCount("orders", 4); }, []);
  return (
    <div style={{ padding: 16, minHeight: 3000 }}>
      <B.ListBand noun="Orders" total={120} page={page} pageSize={25} onPageChange={setPage}><ul>{Array.from({ length: 25 }, (_, i) => <li key={i}>Order {i}</li>)}</ul></B.ListBand>
      <B.FormGrid><B.Field label="Name" column={1} row={1}><B.Input writing value="" /></B.Field><B.Field label="Note" column={2} row={1}><B.Textarea writing writingEmpty="clear" value="" /></B.Field></B.FormGrid>
      <B.LoadingShape loading label="Loading orders" prefill={(v) => <p>{B.fillIn({ id: "A-1" }, { id: B.standIn(1, 6, v), when: new Date(0) }).id}</p>}>{() => null}</B.LoadingShape>
      <p id="count">{count}</p>
      <B.TableContainer label="Plans"><B.Table><B.TableHeader><B.TableRow><B.TableHead explainer={<B.TableHeadExplainer title="Seats"><p>People on the plan.</p></B.TableHeadExplainer>}>Seats</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell>3</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
      <B.Dialog defaultOpen><B.DialogContent form><B.SheetHeader closeLabel="Close"><B.DialogTitle>Order</B.DialogTitle></B.SheetHeader><B.SheetBody><B.Input /></B.SheetBody></B.DialogContent></B.Dialog>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);`);
    await context.route("https://basalt.test/**", (route) => {
      requests.push(route.request().url());
      if (new URL(route.request().url()).pathname !== "/") return route.abort();
      return route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en" data-theme="dark"><head><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")}</style></head><body><div id="root"></div><script>${script.replaceAll("</script", "<\\/script")}</script></body></html>` });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("https://basalt.test/");
    await page.locator("#count").waitFor();
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await tap(page.locator('[aria-label="Next page"]').first());
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(300);
    assert.deepEqual(errors, []);
    assert.equal(await page.locator("#count").textContent(), "3", "no stored count: the app's own default");
    assert.deepEqual(await page.evaluate(() => window.__touched), [], "no storage, fetch, beacon or request was touched");
    assert.deepEqual(requests, ["https://basalt.test/"], "the page asked for nothing more");
    await context.close();
  });
});

// ---- One Mod: what is shown, what is announced and what activates agree ----

const PLATFORMS = [
  { name: "macOS", apple: true, data: { platform: "macOS" }, platform: "MacIntel", ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
  { name: "iPadOS", apple: true, data: undefined, platform: "iPad", ua: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" },
  { name: "Windows", apple: false, data: { platform: "Windows" }, platform: "Win32", ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  { name: "Linux", apple: false, data: { platform: "Linux" }, platform: "Linux x86_64", ua: "Mozilla/5.0 (X11; Linux x86_64)" },
];

describe("Mod: the chips, aria-keyshortcuts and the key that activates agree", () => {
  for (const p of PLATFORMS) {
    test(`${p.name}: ${p.apple ? "⌘↵, Meta+Enter and Command" : "Ctrl Enter, Control+Enter and Control"} send the form; the other modifier does not`, async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context.addInitScript(`Object.defineProperty(navigator, "userAgentData", { value: ${JSON.stringify(p.data)}, configurable: true });
        Object.defineProperty(navigator, "platform", { value: ${JSON.stringify(p.platform)}, configurable: true });
        Object.defineProperty(navigator, "userAgent", { value: ${JSON.stringify(p.ua)}, configurable: true });`);
      const script = await bundleFixture(`
function App() {
  const [sent, setSent] = React.useState(0);
  window.__sent = () => sent;
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Enter" && B.isModKey(e)) setSent((n) => n + 1); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return <B.ActionShortcut id="send" shortcut="Mod+Enter"><button id="go" onClick={() => setSent((n) => n + 1)}>Send</button></B.ActionShortcut>;
}
createRoot(document.getElementById("root")).render(<App />);`);
      await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en" data-theme="light"><head><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")}</style></head><body><div id="root"></div><script>${script.replaceAll("</script", "<\\/script")}</script></body></html>` }));
      const page = await context.newPage();
      await page.goto("https://basalt.test/");
      await page.locator("#go").waitFor();
      const chips = await page.locator("#send .basalt-kbd-key").evaluateAll((keys) => keys.map((k) => (k.querySelector("svg") ? "icon" : k.textContent.trim())));
      assert.deepEqual(chips, p.apple ? ["icon", "↵"] : ["Ctrl", "Enter"], "what is shown");
      assert.equal(await page.locator("#go").getAttribute("aria-keyshortcuts"), p.apple ? "Meta+Enter" : "Control+Enter", "what is announced");
      await page.keyboard.press(p.apple ? "Meta+Enter" : "Control+Enter");
      assert.equal(await page.evaluate(() => window.__sent()), 1, "the announced chord activates");
      await page.keyboard.press(p.apple ? "Control+Enter" : "Meta+Enter");
      assert.equal(await page.evaluate(() => window.__sent()), 1, "the other modifier does not");
      await context.close();
    });
  }
});
