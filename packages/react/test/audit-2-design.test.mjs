// audit-2-design: the council's decided items from the second audit's design questions (DECISIONS 167), the React side. Each test fails on the code before the
// change and passes after it. Driven in Chromium against the built package with the real stylesheet, in both themes, at 1440 and at 390 wherever the part draws.
// Q1.1, Q1.2, Q1.3, Q1.6 wrapping; Q4 the skeleton in forced colours; Q5 b and strong; Q7c the command menu's place; Q9a to Q9f; Q11a and Q11b.
// (Q9g is in packages/tokens/test/contrast.test.mjs; Q9j is in audit-fix-c6.test.mjs; Q6, Q7a and Q7b are the skill's, in tools/html-skill/test.)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const NARROW = { viewport: { width: 390, height: 844 }, hasTouch: true };
const SIZES = [["1440", DESKTOP], ["390", NARROW]];
const SHELL = (body) => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; createRoot(document.getElementById("root")).render(${body});`;
const open = async (body, options, theme, media = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, colorScheme: theme, ...options });
  if (media.contrast || media.forcedColors) await page.emulateMedia(media);
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const css = (locator, property, pseudo = null) => locator.evaluate((el, [p, ps]) => getComputedStyle(el, ps)[p], [property, pseudo]);
/** A colour resolved to rgb by the browser, from any CSS colour. */
const resolve = (page, value, property = "color") => page.evaluate(({ value, property }) => { const probe = document.createElement("i"); probe.style[property] = value; document.body.append(probe); const c = getComputedStyle(probe)[property]; probe.remove(); return c; }, { value, property });

// ---- Q1.1: the switch row's name and kind wrap, and the row grows with its own content ----------------------------------------------
describe("Q1.1: a switch row's name and kind wrap; the row keeps its minimum height and grows", () => {
  const ROWS = SHELL(`<div style={{ width: 320, padding: 16 }}><B.SwitchRowGroup aria-label="Sources" defaultValue={["a"]}><B.SwitchRow value="a" kind="A kind that is long enough to need a second and a third line at this width">A name that is long enough to need a second line at this width</B.SwitchRow><B.SwitchRow value="b" kind="Kind">Short</B.SwitchRow></B.SwitchRowGroup></div>`);
  for (const [name, options] of SIZES) {
    for (const theme of THEMES) {
      test(`${theme}, ${name}: nothing is cut, the long row is taller than the short one, the short one keeps its ${name === "1440" ? 52 : 48}px, and the seat stays at the end, centred`, async () => {
        const page = await open(ROWS, options, theme);
        const rows = page.getByRole("checkbox");
        const long = rows.nth(0);
        const short = rows.nth(1);
        for (const part of [".basalt-switch-row-name", ".basalt-switch-row-kind"]) {
          const text = long.locator(part);
          assert.equal(await css(text, "textOverflow"), "clip", `${part} has no ellipsis`);
          assert.equal(await css(text, "whiteSpace"), "normal", `${part} wraps`);
          assert.ok(await text.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1), `${part} is whole`);
        }
        const floor = name === "1440" ? 52 : 48;
        assert.equal(await css(long, "minHeight"), `${floor}px`, "min-height, not a fixed height");
        assert.equal((await box(short)).height, floor, "a short row is as tall as before");
        const l = await box(long);
        assert.ok(l.height > floor + 20, `the long row grew (${l.height}px)`);
        const seat = await box(long.locator(".basalt-switch-row-seat"));
        assert.ok(Math.abs(seat.y + seat.height / 2 - (l.y + l.height / 2)) <= 1, "the seat is centred on the row");
        assert.ok(l.right - seat.right >= 8 && l.right - seat.right <= 20, "the seat is at the row's end");
        await page.close();
      });
    }
  }
});

// ---- Q1.2: the link tabs' Select keeps its cut at rest (no change) ------------------------------------------------------------------
describe("Q1.2: the link tabs' Select keeps its cut at rest under 720", () => {
  const LINKS = SHELL(`<div style={{ boxSizing: "border-box", width: "100%", padding: "0 16px" }}><B.LinkTabs aria-label="What it is"><B.LinkTab href="#a" current>Everything about protein powders and their long names</B.LinkTab><B.LinkTab href="#b">Protein</B.LinkTab></B.LinkTabs></div>`);
  for (const theme of THEMES) {
    test(`${theme}, 390: the value is one line cut by an ellipsis`, async () => {
      const page = await open(LINKS, NARROW, theme);
      const value = page.locator(".basalt-select-lead > .basalt-select-value").first();
      assert.deepEqual([await css(value, "textOverflow"), await css(value, "whiteSpace"), await css(value, "overflow")], ["ellipsis", "nowrap", "hidden"]);
      await page.close();
    });
  }
});

// ---- Q1.3: a search result's title and detail wrap; the price stays put ----------------------------------------------------------------
describe("Q1.3: a search result's title and detail wrap and the price stays put", () => {
  const RESULTS = SHELL(`<div style={{ width: 300, padding: 16 }}><B.SearchResults><B.SearchResult href="#long" detail="A detail that is long enough to need a second line at this width" trailing="$39.99" media={<span style={{ display: "block", width: "100%", height: "100%", background: "gray" }} />}>A product title that is long enough to need a second line at this width</B.SearchResult><B.SearchResult href="#short" detail="2 lb" trailing="$39.99" media={<span style={{ display: "block", width: "100%", height: "100%", background: "gray" }} />}>Short</B.SearchResult></B.SearchResults></div>`);
  for (const [name, options] of SIZES) {
    for (const theme of THEMES) {
      test(`${theme}, ${name}: the title and the detail are whole on more than one line, and the price is one line at the end`, async () => {
        const page = await open(RESULTS, options, theme);
        const long = page.locator("a.basalt-search-result").nth(0);
        const short = page.locator("a.basalt-search-result").nth(1);
        for (const part of [".basalt-search-title", ".basalt-search-detail"]) {
          const text = long.locator(part);
          assert.equal(await css(text, "whiteSpace"), "normal", `${part} wraps`);
          assert.notEqual(await css(text, "textOverflow"), "ellipsis");
          assert.ok(await text.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1), `${part} is whole`);
        }
        assert.ok((await box(long.locator(".basalt-search-title"))).height > 24, "the title took a second line");
        assert.ok((await box(long)).height > (await box(short)).height, "the result grew");
        const price = await box(long.locator(".basalt-search-trailing"));
        const other = await box(short.locator(".basalt-search-trailing"));
        assert.equal(price.width, other.width, "the price is the same width on both");
        assert.equal(price.right, other.right, "the price is at the same end on both");
        assert.ok(price.height <= 24, "the price is one line");
        await page.close();
      });
    }
  }
});

// ---- Q1.6: an event line's detail wraps ---------------------------------------------------------------------------------------------------------
describe("Q1.6: an event line's detail wraps", () => {
  const LOG = SHELL(`<div style={{ width: 360 }}><B.EventLog label="Activity"><B.EventLine href="#one" verb="opened" object="the pricing page" detail="A detail that is long enough that it has to go on a second and a third line at this width" time="09:39:11" /><B.EventLine href="#two" verb="read" object="the notes" detail="Short" time="09:38:00" /></B.EventLog></div>`);
  for (const [name, options] of SIZES) {
    for (const theme of THEMES) {
      test(`${theme}, ${name}: the detail is whole on more than one line and the line grew`, async () => {
        const page = await open(LOG, options, theme);
        const detail = page.locator(".basalt-event-detail").first();
        assert.equal(await css(detail, "whiteSpace"), "normal");
        assert.notEqual(await css(detail, "textOverflow"), "ellipsis");
        assert.ok(await detail.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight + 1), "the detail is whole");
        assert.ok((await box(detail)).height > 20, "more than one line");
        const lines = page.locator(".basalt-event-line");
        assert.ok((await box(lines.nth(0))).height > (await box(lines.nth(1))).height);
        await page.close();
      });
    }
  }
});

// ---- Q4: a skeleton in forced colours is a 1px ButtonBorder edge, no fill -------------------------------------------------------------------------
describe("Q4: a skeleton in forced colours", () => {
  const SKELETON = SHELL(`<div style={{ width: 200, padding: 16, display: "grid", gap: 8 }}><B.Skeleton style={{ height: 16, width: 200 }} /><B.Skeleton data-shape="block" style={{ height: 48, width: 200 }} /></div>`);
  for (const theme of THEMES) {
    test(`${theme}: in forced colours each box has a 1px solid ButtonBorder edge and keeps its size; otherwise it has no edge`, async () => {
      const page = await open(SKELETON, DESKTOP, theme, { forcedColors: "active" });
      const skeletons = page.locator(".basalt-skeleton");
      const edge = await resolve(page, "ButtonBorder", "borderTopColor");
      for (let i = 0; i < 2; i++) {
        const one = skeletons.nth(i);
        assert.deepEqual(await one.evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopWidth, s.borderTopStyle, s.borderTopColor, s.borderBottomWidth, s.borderLeftWidth, s.borderRightWidth]; }), ["1px", "solid", edge, "1px", "1px", "1px"]);
      }
      assert.deepEqual([(await box(skeletons.nth(0))).width, (await box(skeletons.nth(0))).height], [200, 16], "the edge is inside the box's own size");
      await page.emulateMedia({ forcedColors: "none" });
      await settle(page);
      assert.equal(await css(skeletons.nth(0), "borderTopWidth"), "0px", "no edge outside forced colours");
      await page.close();
    });
  }
});

// ---- Q5: b and strong inside Basalt's parts are 600 -----------------------------------------------------------------------------------------------------
describe("Q5: b and strong inside a Basalt part are 600", () => {
  const BODY = SHELL(`<div><B.Text id="t">A <b>bold</b> and a <strong>strong</strong> phrase.</B.Text><B.Callout status="info" title="Note"><span id="c">A <strong>strong</strong> word</span></B.Callout><B.Prose id="p"><p>A <b>bold</b> word</p></B.Prose><p id="plain">Outside: <b>bold</b></p></div>`);
  for (const theme of THEMES) {
    test(`${theme}: 600 in Text, in a callout and in Prose, and the browser's own weight outside any part`, async () => {
      const page = await open(BODY, DESKTOP, theme);
      for (const selector of ["#t b", "#t strong", "#c strong", "#p b"]) assert.equal(await css(page.locator(selector), "fontWeight"), "600", selector);
      assert.equal(await css(page.locator("#plain b"), "fontWeight"), "700", "a tag outside Basalt's parts is the app's");
      await page.close();
    });
  }
});

// ---- Q7c: the command menu takes the skill's top and height cap ------------------------------------------------------------------------------------------
describe("Q7c: the modal command menu's top is max(16px, 12vh) and its height is capped at 480px", () => {
  const MENU = SHELL(`<B.CommandMenu open onOpenChange={() => {}} groups={[{ label: "Go", commands: Array.from({ length: 30 }, (_, i) => ({ id: "c" + i, label: "Command " + i, onSelect: () => {} })) }]} />`);
  for (const theme of THEMES) {
    test(`${theme}: at 1440 by 900 the panel starts 108px down and is no taller than 480px; at 390 by 844 it starts at 12vh; on a short window it starts at 16px at the least and stays inside it`, async () => {
      for (const [viewport, top] of [[{ width: 1440, height: 900 }, 108], [{ width: 390, height: 844 }, 844 * 0.12], [{ width: 390, height: 100 }, 16]]) {
        const page = await open(MENU, { viewport }, theme);
        const panel = await box(page.locator(".basalt-dialog.basalt-command"));
        assert.ok(Math.abs(panel.y - top) <= 1, `${viewport.height} tall: the panel is at ${panel.y}, not ${top}`);
        assert.ok(panel.height <= 480 + 0.5, `${viewport.height} tall: the panel is ${panel.height}px`);
        assert.ok(panel.bottom <= viewport.height - 16 + 0.5, `${viewport.height} tall: the panel ends at ${panel.bottom}`);
        await page.close();
      }
    });
  }
});

// ---- Q9a: the period stepper's narrow line is a divider ------------------------------------------------------------------------------------------------
describe("Q9a: the period stepper's narrow row has a border-divider line", () => {
  const BAR = SHELL(`<div style={{ width: 390, containerType: "inline-size" }}><div style={{ display: "flex", flexWrap: "wrap", minHeight: 56 }}><B.PeriodStepper data-testid="s" label="28 Sept to 4 Oct" previousLabel="The week before" nextLabel="The week after" /></div></div>`);
  for (const theme of THEMES) {
    test(`${theme}, 390: the line above the row is border-divider`, async () => {
      const page = await open(BAR, NARROW, theme);
      assert.equal(await css(page.locator("[data-testid=s]"), "borderTopColor"), await resolve(page, "var(--basalt-border-divider)"));
      if (theme === "dark") assert.notEqual(await resolve(page, "var(--basalt-border-divider)"), await resolve(page, "var(--basalt-border-hairline)"), "the two differ in dark (else this proves nothing); in light they are the same");
      await page.close();
    });
  }
});

// ---- Q9b: the status bar's open sources control has no look of its own ---------------------------------------------------------------------------------
describe("Q9b: the status bar's sources button looks the same open and closed", () => {
  const BAR = (open) => SHELL(`<B.StatusBar start={<a href="#run">run 4f2a</a>} sources={<B.Button variant="ghost" size="sm" aria-expanded={${open}} aria-controls="drawer">1 of 2 sources</B.Button>} end={<button>theme</button>} />`);
  for (const theme of THEMES) {
    test(`${theme}, 1440: aria-expanded changes neither the fill nor the ink`, async () => {
      const read = async (isOpen) => { const page = await open(BAR(isOpen), DESKTOP, theme); const look = await page.locator(".basalt-status-bar-sources .basalt-button").evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color, s.boxShadow]; }); await page.close(); return look; };
      assert.deepEqual(await read(true), await read(false));
    });
  }
});

// ---- Q9c: the listbox's chosen option takes the core check; the open list keeps its cursor chevron ----------------------------------------------------
describe("Q9c: the listbox's chosen option is marked by the core check", () => {
  const BODY = SHELL(`<div style={{ width: 280, padding: 16, display: "grid", gap: 16 }}><B.Checkbox defaultChecked aria-label="Reference check" /><B.Listbox label="Items" defaultValue="a"><B.ListboxOption value="a">Alpha</B.ListboxOption><B.ListboxOption value="b">Beta</B.ListboxOption></B.Listbox></div>`);
  for (const theme of THEMES) {
    test(`${theme}: the chosen option's gutter draws exactly what a checked box draws (the core check), and only the chosen option has one`, async () => {
      const page = await open(BODY, DESKTOP, theme);
      const gutter = page.locator(".basalt-listbox-option[aria-selected=true] .basalt-listbox-gutter svg");
      assert.equal(await gutter.count(), 1);
      assert.equal(await page.locator(".basalt-listbox-option[aria-selected=false] .basalt-listbox-gutter svg").count(), 0);
      const reference = await page.locator(".basalt-checkbox-indicator svg").first().evaluate((svg) => svg.innerHTML);
      assert.ok(reference.length > 10, "the reference check is drawn");
      assert.equal(await gutter.evaluate((svg) => svg.innerHTML), reference);
      await page.close();
    });
  }
});

// ---- Q9d: a horizontal tab and a link tab are radius 8 from 36px ---------------------------------------------------------------------------------------
describe("Q9d: a tab and a link tab are radius 8 on their top corners from 36px", () => {
  const BODY = (density) => SHELL(`<div ${density ? `data-density="${density}"` : ""} style={{ padding: 16 }}><B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a">One</B.Tab><B.Tab value="b">Two</B.Tab></B.TabsList></B.Tabs><B.LinkTabs aria-label="Pages"><B.LinkTab href="#a" current>One</B.LinkTab><B.LinkTab href="#b">Two</B.LinkTab></B.LinkTabs></div>`);
  for (const theme of THEMES) {
    test(`${theme}, 1440: 36px tabs are 8 on top and 0 below; compact (32px) keeps 6`, async () => {
      const page = await open(BODY(""), DESKTOP, theme);
      for (const selector of [".basalt-tab", ".basalt-link-tab"]) {
        const radii = await page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.borderBottomRightRadius, s.height]; });
        assert.deepEqual(radii, ["8px", "8px", "0px", "0px", "36px"], selector);
      }
      await page.close();
      const compact = await open(BODY("compact"), DESKTOP, theme);
      for (const selector of [".basalt-tab", ".basalt-link-tab"]) assert.equal(await css(compact.locator(selector).first(), "borderTopLeftRadius"), "6px", `${selector} in compact`);
      await compact.close();
    });
  }
});

// ---- Q9e: the table checkbox is centred in its row, and still does not move when ticked -----------------------------------------------------------------
describe("Q9e: a checkbox in a table cell is centred in its row", () => {
  const TABLE = `function Scene() {
      const [on, setOn] = React.useState(false);
      return <div style={{ width: 358, padding: 16 }}><B.TableContainer label="Runs"><B.Table columns={[{ width: 44 }, { width: 120 }, {}]} minWidth={400}><B.TableHeader><B.TableRow><B.TableHead>Pick</B.TableHead><B.TableHead>Run</B.TableHead><B.TableHead>Name</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run-1" checked={on} onCheckedChange={setOn} /></B.TableCell><B.TableRowHead>run-1</B.TableRowHead><B.TableCell>Alpha</B.TableCell></B.TableRow><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run-2" /></B.TableCell><B.TableRowHead>run-2</B.TableRowHead><B.TableCell>Beta</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>;
    }
    document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
    createRoot(document.getElementById("root")).render(<Scene />);`;
  // A standards-mode page: the fixture page has no doctype, and a table cell's line box is laid out differently in quirks mode.
  const openStandards = async (body, options, theme) => {
    const page = await browser.newPage({ colorScheme: theme, ...options });
    page.setDefaultTimeout(5000);
    await page.setContent(`<!doctype html><html data-theme="${theme}"><head><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")}</style></head><body><div id="root"></div></body></html>`);
    await page.addScriptTag({ content: await bundleFixture(body) });
    await settle(page);
    return page;
  };
  for (const [name, options] of [["1440", DESKTOP], ["390 on a coarse pointer", PHONE]]) {
    for (const theme of THEMES) {
      test(`${theme}, ${name}: the box's centre is the row's centre, ticked or not`, async () => {
        const page = await openStandards(TABLE, options, theme);
        const centres = async () => {
          const check = await box(page.getByRole("checkbox", { name: "Select run-1" }));
          const row = await box(page.locator("tbody tr").first());
          return { box: check.y + check.height / 2, row: row.y + row.height / 2, y: check.y };
        };
        const before = await centres();
        assert.ok(Math.abs(before.box - before.row) <= 0.5, `the box is ${before.box - before.row}px from the row's centre`);
        await page.getByRole("checkbox", { name: "Select run-1" }).click();
        await settle(page);
        assert.deepEqual(await centres(), before, "ticked, it has not moved");
        await page.close();
      });
    }
  }
});

// ---- Q9f: under more contrast the chip's edge, the switch row's edge and the search trigger take border-field --------------------------------------------------
describe("Q9f: under more contrast an option chip, a switch row and the search trigger draw border-field", () => {
  const BODY = SHELL(`<div style={{ width: 360, padding: 16, display: "grid", gap: 16 }}><B.OptionChips legend="Flavour" options={[{ value: "v", label: "Vanilla" }, { value: "c", label: "Chocolate" }]} defaultValue="v" /><B.SwitchRowGroup aria-label="Sources"><B.SwitchRow value="a" kind="Kind">Source</B.SwitchRow></B.SwitchRowGroup><B.SearchTrigger /></div>`);
  for (const theme of THEMES) {
    test(`${theme}, 1440: in the mode the three edges are the field colour and not the divider's; outside it they are as before`, async () => {
      const page = await open(BODY, DESKTOP, theme, { contrast: "more" });
      const field = await resolve(page, "var(--basalt-border-field)");
      const input = await resolve(page, "var(--basalt-border-input)");
      assert.notEqual(field, input, "the mode steps border-field and not border-input (else this proves nothing)");
      const edges = () => page.evaluate(() => ["#root .basalt-option-chip:not([data-checked])", "#root .basalt-switch-row", "#root .basalt-search-trigger"].map((sel) => getComputedStyle(document.querySelector(sel)).borderTopColor));
      assert.deepEqual(await edges(), [field, field, field]);
      await page.emulateMedia({ contrast: "no-preference" });
      await settle(page);
      const normal = await resolve(page, "var(--basalt-border-input)");
      assert.deepEqual(await edges(), [normal, normal, normal], "outside the mode nothing moves");
      await page.close();
    });
  }
});

// ---- Q11a: the headline chart shows a "Not observed" key whenever it has a gap -------------------------------------------------------------------------------
describe("Q11a: the headline chart's Not observed key", () => {
  const CHART = (values) => `import { weightData, lb } from "./test/fixtures/figure-data.ts";
    const w = weightData(28);
    const values = ${values};
    createRoot(document.getElementById("root")).render(<div style={{ width: 900, padding: 16 }}><B.TimeChart title="Weight" kind="line" headline days={w.days} series={[{ id: "w", name: "Weight", values, reasons: w.reasons }]} unit="lb" format={lb} summary="Weight over 28 days." now={Date.UTC(2026, 10, 10, 12)} /></div>);`;
  for (const [name, options] of SIZES) {
    for (const theme of THEMES) {
      test(`${theme}, ${name}: with a gap the key, the hatch and the words, sits above the plot; with none there is no key`, async () => {
        const page = await open(CHART("w.values"), options, theme);
        const key = page.locator(".basalt-chart-key[data-gap-key] .basalt-chart-legend");
        assert.equal(await key.count(), 1);
        assert.equal((await key.innerText()).trim(), "Not observed");
        assert.equal(await key.locator("svg").count(), 1, "the swatch is drawn");
        const plot = await box(page.locator(".basalt-chart svg").last());
        assert.ok((await box(key)).bottom <= plot.y, "the key is above the plot");
        assert.equal(await key.getAttribute("aria-label"), "Key");
        await page.close();
        const whole = await open(CHART("w.values.map((v) => v ?? 80)"), options, theme);
        assert.equal(await whole.locator("[data-gap-key]").count(), 0, "no gap, no key");
        await whole.close();
      });
    }
  }
});

// ---- Q11b: a share-bar part that rounds to 100 beside a non-empty part reads >99% ------------------------------------------------------------------------------
describe("Q11b: a share that rounds to 100 beside another part reads >99%", () => {
  const BAR = (parts) => SHELL(`<div style={{ width: 360, padding: 16 }}><B.ShareBar aria-label="Plan" parts={${parts}} /></div>`);
  for (const theme of THEMES) {
    test(`${theme}: 99.6 and 0.4 read ">99%" (spoken "more than 99 percent") and "<1%"; one part alone is still 100%`, async () => {
      const page = await open(BAR(`[{ name: "Protein", value: 996 }, { name: "Carbs", value: 4 }]`), DESKTOP, theme);
      const values = page.locator(".basalt-share-value");
      assert.equal(await values.nth(0).locator("[aria-hidden=true]").innerText(), ">99%");
      assert.equal((await values.nth(0).locator(".basalt-visually-hidden").textContent()).trim(), "more than 99 percent");
      assert.equal(await values.nth(1).locator("[aria-hidden=true]").innerText(), "<1%");
      await page.close();
      const alone = await open(BAR(`[{ name: "Protein", value: 5 }]`), DESKTOP, theme);
      assert.equal((await alone.locator(".basalt-share-value").innerText()).trim(), "100%");
      await alone.close();
      const split = await open(BAR(`[{ name: "Protein", value: 60 }, { name: "Carbs", value: 40 }]`), DESKTOP, theme);
      assert.deepEqual(await split.locator(".basalt-share-value").allInnerTexts(), ["60%", "40%"]);
      await split.close();
    });
  }
});

// ---- Q9j: the checklist's rows take the mirror mark, and the marked inputs do not make the popup scroll ---------------------------------------------------------
describe("Q9j: the open checklist's rows are marked and its popup does not scroll", () => {
  const LIST = SHELL(`<div style={{ padding: 16 }}><B.MultiSelect label="Tree" options={Array.from({ length: 12 }, (_, i) => ({ value: "v" + i, label: "Option " + i }))} /></div>`);
  for (const theme of THEMES) {
    test(`${theme}, 1440: every row's input carries the mark; hovering a row leaves the popup unscrolled, the band at the popup's top`, async () => {
      const page = await open(LIST, DESKTOP, theme);
      await page.locator(".basalt-filter-trigger").click();
      await page.locator(".basalt-filter-popup").waitFor();
      await page.locator(".basalt-filter-row").first().hover();
      await settle(page);
      assert.equal(await page.locator(".basalt-filter-popup input[type=checkbox]:not([data-basalt-mirror])").count(), 0, "no row input is unmarked");
      assert.ok(await page.locator(".basalt-filter-popup input[data-basalt-mirror]").count() >= 12);
      const read = await page.evaluate(() => { const popup = document.querySelector(".basalt-filter-popup"); return { top: popup.scrollTop, over: popup.scrollHeight - popup.clientHeight, band: document.querySelector(".basalt-filter-band").getBoundingClientRect().top - popup.getBoundingClientRect().top }; });
      assert.equal(read.top, 0, "the popup has not scrolled");
      assert.ok(read.over <= 1, `the popup has nothing to scroll (${read.over}px over)`);
      assert.ok(read.band <= 2, `the band sits at the popup's top (${read.band}px)`);
      await page.close();
    });
  }
});
