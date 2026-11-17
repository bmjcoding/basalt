// audit-design-b: DECISIONS 138 parts B and C and glyph ownership (E2), approved in 139. A cut cell that can be read (B1), two touch targets
// (B2), the skip link under the bar (B3), copying a NumberTicker (C2), a required field (C3) and which set draws a glyph (E2). Every test
// below fails on origin/main. Driven in Chromium against the built package with the real stylesheet. The fixtures load no web font, so
// text widths differ from a Mac's on CI's Linux runner: every measured margin here is wider than a fallback font's width, and a position
// is compared with itself. Synthetic data only.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
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

// ---- B1: a cut cell that can be read ----

const ROWS = [
  ["build-0141", "Passed", "main", "Nov 14, 10:13 PM", "5m 12s", "Pin the toolchain to the version the release uses", "Owner one"],
  ["nightly-migration-backfill", "Failed", "release/2026.11", "Nov 14, 9:58 PM", "41m 07s", "Backfill the ledger in batches of five thousand rows so the replica keeps up", "Owner two, longer"],
  ["build-0140", "Running", "feature/stable-columns", "Nov 14, 9:41 PM", "2m 30s", "Hold the header still while rows load", "Owner seven"],
  ["lint-0388", "Passed", "main", "Nov 14, 8:02 PM", "48s", "Lint", "Owner ten"],
  ["deploy-preview-2291", "Cancelled", "fix/notification-touch-target", "Nov 13, 11:47 PM", "1m 03s", "Give a one-line notification entry a 44px target on touch", "Owner one"],
  ["e2e-0519", "Passed", "main", "Nov 13, 10:20 PM", "18m 55s", "Run the browser suite against the packed package", "Owner whose name is long."],
  ["build-0139", "Queued", "dependabot/npm_and_yarn/shiki-3.4.2", "Nov 13, 9:05 PM", "0s", "Bump shiki from 3.4.1 to 3.4.2", "dependabot"],
  ["bench-0042", "Passed", "perf/table-tick", "Nov 13, 7:31 PM", "6m 44s", "Memoise the row so ticking one box repaints one row", "Owner seven"],
];
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
// Seven columns, 63 cells with the header. A fixed-form column (Started) is sized for its longest form under 1.4.12 spacing (176).
const TABLE = (extra = "", { started = 176, label = "Runs" } = {}) => `document.body.style.margin = "0"; const ROWS = ${JSON.stringify(ROWS)};
${render(`<div style={{ padding: 16 }}${extra}><B.TableContainer label="${label}"><B.Table columns={[{ width: 170 }, { width: 120 }, { width: 190 }, { width: ${started} }, { width: 88 }, { width: 260 }, {}]} minWidth={1180}>
  <B.TableHeader><B.TableRow><B.TableHead>Run</B.TableHead><B.TableHead>Status</B.TableHead><B.TableHead>Branch</B.TableHead><B.TableHead>Started</B.TableHead><B.TableHead numeric>Duration</B.TableHead><B.TableHead>Message</B.TableHead><B.TableHead>Owner</B.TableHead></B.TableRow></B.TableHeader>
  <B.TableBody>{ROWS.map((r) => <B.TableRow key={r[0]}><B.TableRowHead>{r[0]}</B.TableRowHead><B.TableCell>{r[1]}</B.TableCell><B.TableCell mono>{r[2]}</B.TableCell><B.TableCell>{r[3]}</B.TableCell><B.TableCell numeric>{r[4]}</B.TableCell><B.TableCell>{r[5]}</B.TableCell><B.TableCell>{r[6]}</B.TableCell></B.TableRow>)}</B.TableBody>
</B.Table></B.TableContainer><button id="after">After</button></div>`)}`;
const SPACING = `*, *::before, *::after { letter-spacing: 0.12em !important; word-spacing: 0.16em !important; line-height: 1.5 !important; }`;

const cells = (page) => page.locator("table td, table th[scope=row], table thead th");
const peekState = (page) => page.evaluate(() => {
  const peek = document.querySelector(".basalt-cell-peek");
  if (!peek) return null;
  const r = peek.getBoundingClientRect();
  const s = getComputedStyle(peek);
  return { open: peek.hasAttribute("data-open"), focus: peek.hasAttribute("data-focus"), text: peek.textContent, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, ariaHidden: peek.getAttribute("aria-hidden"), level: peek.getAttribute("data-level"), radius: s.borderRadius, shadow: s.boxShadow, bg: s.backgroundColor, visibility: s.visibility, opacity: s.opacity, border: s.borderTopWidth, outline: s.outlineStyle, outlineWidth: s.outlineWidth, outlineOffset: s.outlineOffset };
});
const cutCells = (page) => page.evaluate(() => [...document.querySelectorAll("[data-cut]")].map((c) => c.textContent));

for (const theme of THEMES) {
  describe(`B1 a cut cell can be read (${theme})`, () => {
    test("only a cut cell is a focus stop, and the count of stops added is the count of cut cells", async () => {
      const page = await open(TABLE(), { theme });
      await frames(page);
      const stops = await page.evaluate(() => [...document.querySelectorAll("table td, table th")].filter((c) => c.tabIndex === 0).map((c) => ({ text: c.textContent, cut: c.hasAttribute("data-cut"), over: c.scrollWidth > c.clientWidth })));
      assert.ok(stops.length > 0, "something is cut at this width");
      assert.ok(stops.every((s) => s.cut && s.over), "every stop is a cut cell");
      const uncut = await page.evaluate(() => [...document.querySelectorAll("table td, table th")].filter((c) => !c.hasAttribute("data-cut")).every((c) => c.tabIndex === -1 && c.scrollWidth <= c.clientWidth + 1));
      assert.ok(uncut, "no cell that is whole is a stop");
      assert.ok(await page.evaluate(() => document.querySelectorAll(".basalt-cell-peek").length) <= 1, "one plate at most");
      // Reported by the round: the stops this adds to a 63-cell table at 1440.
      console.log(`B1 tab stops added at 1440 (${theme}): ${stops.length} of 63 cells`);
      await page.close();
    });

    test("the ellipsis and the row stay: a table with cut cells is the height and the columns it was", async () => {
      const page = await open(TABLE(), { theme });
      await frames(page);
      const before = await page.evaluate(() => ({ rows: [...document.querySelectorAll("tbody tr")].map((r) => r.getBoundingClientRect().height), cols: [...document.querySelectorAll("thead th")].map((c) => c.getBoundingClientRect().width), ellipsis: getComputedStyle(document.querySelector("tbody td")).textOverflow }));
      assert.deepEqual(before.rows, Array(8).fill(40), "40px rows");
      assert.equal(before.ellipsis, "ellipsis");
      // Open every cut cell in turn: nothing in the table moves.
      const n = (await cutCells(page)).length;
      for (let i = 0; i < n; i += 1) {
        await page.locator("[data-cut]").nth(i).focus();
        const during = await page.evaluate(() => ({ rows: [...document.querySelectorAll("tbody tr")].map((r) => r.getBoundingClientRect().height), cols: [...document.querySelectorAll("thead th")].map((c) => c.getBoundingClientRect().width) }));
        assert.deepEqual(during.rows, before.rows, `rows with cell ${i} open`);
        assert.deepEqual(during.cols, before.cols, `columns with cell ${i} open`);
      }
      await page.close();
    });

    test("focus opens the whole value in place on a level-3 plate: the text starts on the cell's pixel, the row is 40, and the ring is round the plate", async () => {
      const page = await open(TABLE(), { theme });
      await frames(page);
      const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" });
      await target.focus();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
      await settle(page);
      const cell = await target.evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { left: r.left, top: r.top, height: r.height, pad: parseFloat(s.paddingLeft) }; });
      const peek = await peekState(page);
      assert.equal(peek.text, "Backfill the ledger in batches of five thousand rows so the replica keeps up");
      assert.equal(peek.ariaHidden, "true", "aria-hidden: the cell already holds the value");
      assert.equal(peek.level, "3");
      assert.equal(peek.radius, "8px", "radius 8");
      assert.notEqual(peek.shadow, "none", "shadow-overlay");
      assert.equal(peek.visibility, "visible");
      near(peek.left, cell.left, "the plate starts where the cell does");
      near(peek.top, cell.top, "and at its top");
      near(peek.height, cell.height, "and is its height when the value fits on one line");
      // the text starts on exactly the cell's text pixel: the plate's border plus its padding is the cell's padding
      const textLeft = await page.evaluate(() => { const p = document.querySelector(".basalt-cell-peek"); const range = document.createRange(); range.selectNodeContents(p); return range.getBoundingClientRect().left; });
      near(textLeft, cell.left + cell.pad, "text starts on the cell's own text pixel");
      assert.equal(peek.focus, true, "opened by the keyboard, the plate carries the ring");
      assert.equal(peek.outline, "solid");
      assert.equal(peek.outlineWidth, "2px");
      assert.equal(peek.outlineOffset, "2px", "+2, outside the plate");
      await page.close();
    });

    test("Esc closes it without moving focus, and the cell then shows its own ring (the prototype's defect)", async () => {
      const page = await open(TABLE(), { theme });
      await frames(page);
      const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" });
      await page.keyboard.press("Tab"); // the container, if it overflows
      await target.focus();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".basalt-cell-peek").hasAttribute("data-open"));
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Backfill the ledger in batches of five thousand rows so the replica keeps up", "focus has not moved");
      const ring = await target.evaluate((el) => { const s = getComputedStyle(el); return { matches: el.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset }; });
      assert.deepEqual(ring, { matches: true, style: "solid", width: "2px", offset: "-2px" }, "the cell has a ring after Esc: the flush-field inset");
      // it stays closed until focus or hover leaves and comes back
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek").hasAttribute("data-open"));
      await page.close();
    });

    test("Esc inside a dialog closes the plate, not the dialog", async () => {
      const page = await open(`document.body.style.margin = "0"; const ROWS = ${JSON.stringify(ROWS)}; ${render(`<B.Dialog defaultOpen><B.DialogContent style={{ width: 640 }}><B.DialogTitle>Runs</B.DialogTitle><B.TableContainer label="Runs"><B.Table columns={[{ width: 120 }, {}]} minWidth={400}><B.TableBody>{ROWS.slice(0, 2).map((r) => <B.TableRow key={r[0]}><B.TableRowHead>{r[0]}</B.TableRowHead><B.TableCell>{r[5]}</B.TableCell></B.TableRow>)}</B.TableBody></B.Table></B.TableContainer></B.DialogContent></B.Dialog>`)}`, { theme, width: 700 });
      await frames(page);
      const cut = page.locator("[data-cut]").first();
      await cut.focus();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
      const zOk = await page.evaluate(() => { const p = document.querySelector(".basalt-cell-peek"); const d = document.querySelector(".basalt-dialog"); return Number(getComputedStyle(p).zIndex) > Number(getComputedStyle(d).zIndex); });
      assert.ok(zOk, "the plate floats above the dialog it sits in");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".basalt-cell-peek").hasAttribute("data-open"));
      assert.equal(await page.locator(".basalt-dialog").count(), 1, "the dialog is still open");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".basalt-dialog"));
      await page.close();
    });

    test("hover opens it after the tooltip's wait, the pointer can move onto the plate, and it stays until hover and focus have both left (1.4.13)", async () => {
      const page = await open(TABLE(), { theme, clock: false });
      await frames(page);
      const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" });
      const box = await target.boundingBox();
      // The tooltip's wait is read on the frozen clock: 150ms of the page's own time after the pointer arrives it is not open, on any machine at any load.
      const clock = await freezeAnimations(page);
      await page.mouse.move(box.x + 30, box.y + 20);
      await clock.advance(150);
      assert.equal((await peekState(page))?.open ?? false, false, "not at once: the tooltip's wait");
      await clock.thaw();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"), null, { timeout: 3000 });
      // onto the plate: still open, and open well after the leave delay
      await page.mouse.move(box.x + 60, box.y + 20);
      await page.waitForTimeout(400);
      assert.equal((await peekState(page)).open, true, "hoverable: the pointer on the plate keeps it");
      // off both: it goes
      await page.mouse.move(box.x + 60, box.y + 300);
      await page.waitForFunction(() => !document.querySelector(".basalt-cell-peek").hasAttribute("data-open"));
      // hover, then focus, then the pointer leaves: focus keeps it
      await target.focus();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek").hasAttribute("data-open"));
      await page.mouse.move(box.x + 60, box.y + 20);
      await page.mouse.move(box.x + 60, box.y + 300);
      await page.waitForTimeout(400);
      assert.equal((await peekState(page)).open, true, "focus keeps it open after the pointer has gone");
      await page.close();
    });

    test("a cell that is not cut is not a stop and opens nothing", async () => {
      const page = await open(TABLE(), { theme });
      await frames(page);
      const whole = page.locator("tbody tr").nth(3).locator("td").first(); // "Passed"
      assert.equal(await whole.getAttribute("tabindex"), null);
      await whole.hover();
      await page.waitForTimeout(900);
      assert.equal((await peekState(page))?.open ?? false, false);
      await page.close();
    });

    test("a plate is never past the viewport, at 390 either (the prototype opened two 97px off screen)", async () => {
      const page = await open(TABLE(), { theme, width: 390, height: 844 });
      await frames(page);
      const n = (await cutCells(page)).length;
      assert.ok(n > 5, `cut cells at 390: ${n}`);
      let worst = 0;
      for (let i = 0; i < n; i += 1) {
        await page.locator("[data-cut]").nth(i).focus();
        await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
        const p = await peekState(page);
        worst = Math.max(worst, -p.left, p.right - 390, -p.top, p.bottom - 844);
        assert.ok(p.left >= -0.5 && p.right <= 390.5, `cell ${i} (${p.text.slice(0, 20)}): ${p.left} to ${p.right}`);
      }
      console.log(`B1 plates at 390 (${theme}): ${n} cut cells, worst overhang ${Math.max(0, worst)}px`);
      await page.close();
    });

    test("under WCAG 1.4.12 spacing a fixed-form column is not cut, and a cut cell still opens and wraps inside the viewport", async () => {
      const page = await open(TABLE(), { theme });
      await frames(page);
      const started = () => page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((r) => r.children[3].hasAttribute("data-cut")));
      assert.deepEqual(await started(), Array(8).fill(false), "Started is sized for its longest form at rest");
      await page.addStyleTag({ content: SPACING });
      await page.waitForFunction(() => document.querySelectorAll("[data-cut]").length > 0);
      await frames(page);
      assert.deepEqual(await started(), Array(8).fill(false), "and under 1.4.12 spacing: no column of one fixed form is cut");
      const status = await page.evaluate(() => [...document.querySelectorAll("tbody tr")].map((r) => r.children[1].hasAttribute("data-cut")));
      assert.deepEqual(status, Array(8).fill(false), "nor is the status word");
      const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" });
      await target.focus();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
      const p = await peekState(page);
      assert.ok(p.right <= 1440 && p.bottom <= 900, "inside the viewport");
      console.log(`B1 under 1.4.12 (${theme}): ${(await cutCells(page)).length} cut cells, each readable on its plate`);
      await page.close();
    });

    test("it needs no change to a table with no `columns`: it lays out from its content and nothing is a stop", async () => {
      const page = await open(`document.body.style.margin = "0"; ${render(`<B.TableContainer><B.Table><B.TableBody><B.TableRow><B.TableCell>A long value that is not cut because the table sizes from content</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>`)}`, { theme });
      await frames(page);
      assert.equal(await page.evaluate(() => document.querySelectorAll("[data-cut], [tabindex]").length), 0);
      await page.close();
    });

    test("axe finds nothing with a plate open, at 1440 and 390", async () => {
      for (const width of [1440, 390]) {
        const page = await open(TABLE(), { theme, width });
        await frames(page);
        await page.locator("[data-cut]").first().focus();
        await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
        assert.deepEqual(await axe(page), [], `axe at ${width}`);
        await page.close();
      }
    });
  });
}

describe("B1 forced colours and reduced motion", () => {
  test("the plate is Canvas with a CanvasText border in forced colours; under reduced motion it only fades", async () => {
    const page = await open(TABLE(), { theme: "dark", colorScheme: "dark", forcedColors: "active", reducedMotion: "reduce" });
    await frames(page);
    await page.locator("[data-cut]").first().focus();
    await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
    await settle(page);
    const p = await page.evaluate(() => { const el = document.querySelector(".basalt-cell-peek"); const s = getComputedStyle(el); return { bg: s.backgroundColor, border: s.borderTopColor, transform: s.transform, prop: s.transitionProperty }; });
    const canvas = await page.evaluate(() => { const probe = document.createElement("div"); probe.style.cssText = "background: Canvas; border: 1px solid CanvasText"; document.body.append(probe); const s = getComputedStyle(probe); return { bg: s.backgroundColor, border: s.borderTopColor }; });
    assert.equal(p.bg, canvas.bg);
    assert.equal(p.border, canvas.border);
    assert.equal(p.transform, "none", "never a scale");
    assert.match(p.prop, /opacity/);
    assert.doesNotMatch(p.prop, /transform/);
    await page.close();
  });
});

// ---- B2: two touch targets ----

const COARSE = { hasTouch: true, isMobile: true };
const ENTRIES = `[{ id: "a", title: "Deploy finished", time: "2m ago", unread: true, status: "success" }, { id: "b", title: "Backup finished", description: "ledger-replica, nightly", time: "1h ago" }, { id: "c", title: "Review requested", time: "Yesterday", href: "#c" }]`;
const NOTES = `document.body.style.margin = "0"; ${render(`<B.NotificationCentre defaultOpen entries={${ENTRIES}} />`)}`;
const LINKS = (rows = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; ${render(`<div style={{ width: 360, padding: 24 }}><div id="own"><B.Link href="#guide">Read the deployment guide</B.Link></div><div id="gap" style={{ height: 40 }} /><div id="own2"><B.Link href="https://example.test/x" target="_blank">Open the status page</B.Link></div><p id="sentence">Read <B.Link href="#a">the first guide</B.Link> and then <B.Link href="#b">the second guide</B.Link> before you start, since the order matters here.</p><div id="after">After</div>${rows}</div>`)}`;
const boxOf = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right }; });

for (const theme of THEMES) {
  describe(`B2 touch targets (${theme})`, () => {
    test("on touch a one-line notification entry is 44 tall with its line centred; a two-line entry is 58; on a fine pointer it is 40", async () => {
      const coarse = await open(NOTES, { theme, width: 390, height: 844, ...COARSE });
      await frames(coarse);
      const heights = await coarse.evaluate(() => [...document.querySelectorAll(".basalt-notification")].map((e) => e.getBoundingClientRect().height));
      assert.deepEqual(heights, [44, 58, 44], "44, 58, 44 on touch");
      // the line is centred: 12 above and 12 below (20px line in 44)
      const centred = await coarse.evaluate(() => { const e = document.querySelector(".basalt-notification"); const t = e.querySelector(".basalt-notification-title").getBoundingClientRect(); const r = e.getBoundingClientRect(); return { above: t.top - r.top, below: r.bottom - t.bottom }; });
      near(centred.above, 12, "12 above the line");
      near(centred.below, 12, "12 below");
      const plate = await coarse.evaluate(() => { const e = document.querySelector(".basalt-notification"); const s = getComputedStyle(e, "::before"); return { top: s.top, bottom: s.bottom, height: s.height }; });
      assert.equal(plate.height, "40px", "its plate stays 40");
      await coarse.close();
      const fine = await open(NOTES, { theme, width: 1440 });
      await frames(fine);
      assert.deepEqual(await fine.evaluate(() => [...document.querySelectorAll(".basalt-notification")].map((e) => e.getBoundingClientRect().height)), [40, 58, 40], "40, 58, 40 with a mouse");
      await fine.close();
    });

    test("on touch a link on its own line has a 44px hit box and changes nothing: the layout, the underline and the look are the same", async () => {
      const coarse = await open(LINKS(), { theme, width: 390, height: 844, ...COARSE });
      const fine = await open(LINKS(), { theme, width: 390, height: 844 });
      await frames(coarse); await frames(fine);
      const own = await boxOf(coarse, "#own a");
      near(own.h, 44, "44px hit box");
      const own2 = await boxOf(coarse, "#own2 a");
      near(own2.h, 44, "a new-tab link too");
      // layout: every block after the links is exactly where it was with a mouse
      for (const id of ["#own", "#gap", "#own2", "#sentence", "#after"]) {
        const c = await boxOf(coarse, id); const f = await boxOf(fine, id);
        near(c.y, f.y, `${id} y`, 0.01); near(c.h, f.h, `${id} height`, 0.01);
      }
      // look: underline kept, no wash, same text position
      const look = (page) => page.locator("#own a").evaluate((el) => { const s = getComputedStyle(el); const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect(); return { line: s.textDecorationLine, color: s.textDecorationColor, bg: s.backgroundColor, shadow: s.boxShadow, text: [t.x, t.y, t.width, t.height] }; });
      assert.deepEqual(await look(coarse), await look(fine), "the same underline, no wash, the text where it was");
      assert.equal((await look(coarse)).line, "underline");
      const arrow = (page) => page.locator("#own2 a .basalt-external").evaluate((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
      const [cx, cy, cw, ch] = await arrow(coarse); const [fx, fy, fw, fh] = await arrow(fine);
      near(cx, fx, "the new-tab arrow x"); near(cy, fy, "the new-tab arrow y"); near(cw, fw, "arrow w"); near(ch, fh, "arrow h");
      await coarse.close(); await fine.close();
    });

    test("a link inside a sentence keeps its line", async () => {
      const coarse = await open(LINKS(), { theme, width: 390, height: 844, ...COARSE });
      await frames(coarse);
      const heights = await coarse.evaluate(() => [...document.querySelectorAll("#sentence a")].map((a) => ({ h: a.getBoundingClientRect().height, display: getComputedStyle(a).display })));
      for (const link of heights) { assert.ok(link.h < 30, `inline link is ${link.h}`); assert.equal(link.display, "inline"); }
      await coarse.close();
    });

    test("no two touch targets overlap: the notification entries, and the standalone links with the sentence's links", async () => {
      const overlaps = (page, selector) => page.evaluate((selector) => {
        const boxes = [...document.querySelectorAll(selector)].filter((e) => e.getClientRects().length).flatMap((e) => [...e.getClientRects()].map((r) => ({ name: e.textContent.trim().slice(0, 24), x: r.left, y: r.top, r: r.right, b: r.bottom })));
        const hits = [];
        for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i]; const b = boxes[j];
          const w = Math.min(a.r, b.r) - Math.max(a.x, b.x); const h = Math.min(a.b, b.b) - Math.max(a.y, b.y);
          if (w > 0.5 && h > 0.5) hits.push(`${a.name} / ${b.name}: ${w.toFixed(1)} x ${h.toFixed(1)}`);
        }
        return { count: boxes.length, hits };
      }, selector);
      const notes = await open(NOTES, { theme, width: 390, height: 844, ...COARSE });
      await frames(notes);
      const inList = await overlaps(notes, ".basalt-notifications a, .basalt-notifications button");
      assert.ok(inList.count >= 5, "entries, Mark all as read and View all");
      assert.deepEqual(inList.hits, [], "entries and the centre's buttons do not overlap");
      assert.deepEqual(await axe(notes), [], "axe (target-size) finds nothing at 390");
      await notes.close();
      const links = await open(LINKS(), { theme, width: 390, height: 844, ...COARSE });
      await frames(links);
      const onPage = await overlaps(links, "a[href]");
      assert.ok(onPage.count >= 4);
      assert.deepEqual(onPage.hits, [], "the standalone links and the sentence's links do not overlap");
      assert.deepEqual(await axe(links), [], "axe (target-size) finds nothing at 390");
      await links.close();
    });
  });
}

// ---- B3: the skip link ----

const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;
const HEADER = `<B.SiteHeader brand={<>${MARK}<span>Acme</span></>} brandLabel="Acme home" links={[{href:"#alpha",label:"Alpha"},{href:"#beta",label:"Beta"}]} themeToggle={<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />} action={<B.Button variant="primary">Get started</B.Button>} />`;
const SKIP = (scroll = 0) => `document.body.style.margin = "0"; ${render(`<div><B.SkipLink target="main" />${HEADER}<main id="main" tabIndex={-1} style={{ padding: 24, minHeight: 3000 }}><h2 id="alpha">Alpha</h2><p>Synthetic words.</p></main></div>`)} window.scrollTo(0, ${scroll});`;

for (const theme of THEMES) {
  describe(`B3 the skip link (${theme})`, () => {
    for (const width of [1440, 390]) {
      test(`focused it hangs under the bar, space-2 below its line, on the brand's start edge, with the rim, shadow-overlay and radius 8, at ${width}`, async () => {
        const page = await open(SKIP(), { theme, width, height: 800 });
        await frames(page);
        const unfocused = await page.locator(".basalt-skip-link").evaluate((el) => { const s = getComputedStyle(el); return { clip: s.clipPath, shadow: s.boxShadow }; });
        assert.notEqual(unfocused.clip, "none", "unseen until it has focus");
        const barBefore = await boxOf(page, ".basalt-site-header");
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-skip-link");
        const skip = await boxOf(page, ".basalt-skip-link");
        const bar = await boxOf(page, ".basalt-site-header");
        const brand = await boxOf(page, ".basalt-site-brand-mark");
        near(skip.y, bar.bottom + 8, "space-2 (8px) below the bar's line");
        near(skip.x, brand.x, "on the brand's start edge");
        assert.deepEqual(bar, barBefore, "the bar did not move");
        const style = await page.locator(".basalt-skip-link").evaluate((el) => { const s = getComputedStyle(el); return { radius: s.borderRadius, shadow: s.boxShadow, border: s.borderTopWidth, clip: s.clipPath, position: s.position, level: el.getAttribute("data-level") }; });
        assert.equal(style.radius, "8px");
        assert.notEqual(style.shadow, "none");
        assert.equal(style.border, "1px");
        assert.equal(style.clip, "none");
        assert.equal(style.level, "3");
        // it overlaps nothing in the bar, ring included
        const overlap = await page.evaluate(() => {
          const skip = document.querySelector(".basalt-skip-link").getBoundingClientRect();
          const ring = 4; // outline 2px at +2
          const inBar = [...document.querySelectorAll(".basalt-site-header a, .basalt-site-header button")].map((e) => e.getBoundingClientRect());
          return inBar.filter((r) => Math.min(r.right, skip.right + ring) - Math.max(r.left, skip.left - ring) > 0 && Math.min(r.bottom, skip.bottom + ring) - Math.max(r.top, skip.top - ring) > 0).length;
        });
        assert.equal(overlap, 0, "nothing in the bar is covered, its ring included");
        const ringTop = skip.y - 4;
        assert.ok(ringTop >= bar.bottom, `the ring does not cross the bar's line (${ringTop} vs ${bar.bottom})`);
        await page.close();
      });
    }

    test("scrolled down, a focused skip link is still under the bar (it is fixed to the viewport)", async () => {
      const page = await open(SKIP(1200), { theme, width: 1440, height: 800 });
      await frames(page);
      await page.locator(".basalt-skip-link").focus();
      await frames(page);
      const skip = await boxOf(page, ".basalt-skip-link");
      near(skip.y, 56 + 8, "64px from the viewport's top");
      await page.close();
    });

    test("with no bar it sits at the page's top start, as before, and still floats", async () => {
      const page = await open(`document.body.style.margin = "0"; ${render(`<div><B.SkipLink target="main" /><main id="main" tabIndex={-1} style={{ padding: 24 }}><h1>Plain page</h1></main></div>`)}`, { theme });
      await page.keyboard.press("Tab");
      const skip = await boxOf(page, ".basalt-skip-link");
      near(skip.x, 8, "space-2 from the start"); near(skip.y, 8, "and from the top");
      assert.equal(await page.locator(".basalt-skip-link").evaluate((el) => getComputedStyle(el).borderRadius), "8px");
      await page.close();
    });

    test("on touch it is 44 tall and still overlaps nothing in the bar", async () => {
      const page = await open(SKIP(), { theme, width: 390, height: 844, ...COARSE });
      await page.locator(".basalt-skip-link").focus();
      const skip = await boxOf(page, ".basalt-skip-link");
      assert.ok(skip.h >= 44);
      assert.ok(skip.y >= 56, "under the bar");
      await page.close();
    });

    test("axe finds nothing with the skip link focused, at 1440 and 390", async () => {
      for (const width of [1440, 390]) {
        const page = await open(SKIP(), { theme, width, height: 800 });
        await page.keyboard.press("Tab");
        assert.deepEqual(await axe(page), [], `axe at ${width}`);
        await page.close();
      }
    });
  });
}

// ---- C2: copying a NumberTicker ----

const TICKERS = (extra = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; ${render(`<div style={{ padding: 16 }}><p id="lone" style={{ margin: 0, fontSize: 24 }}><B.NumberTicker value={42} /></p><p id="sentence" style={{ margin: "16px 0", fontSize: 20 }}>Orders today: <B.NumberTicker value={1284.5} /> of <B.NumberTicker value={1500} /> done</p><p id="glide" style={{ margin: 0, fontSize: 20 }}><B.NumberTicker value={7} glide /></p>${extra}</div>`)}`;
const selectAll = (page, selector) => page.evaluate((selector) => { const range = document.createRange(); range.selectNodeContents(document.querySelector(selector)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); return sel.toString(); }, selector);
const SENTENCE = "Orders today: 1,284.5 of 1,500 done";
const MODES = [["rest", {}], ["reduced motion", { reducedMotion: "reduce" }], ["forced colours", { forcedColors: "active" }]];

for (const theme of THEMES) {
  describe(`C2 copying a NumberTicker (${theme})`, () => {
    for (const [label, options] of MODES) {
      test(`a selected sentence copies as one line, exactly, with the number once: ${label}`, async () => {
        const page = await open(TICKERS(), { theme, ...options });
        await frames(page);
        assert.equal(await selectAll(page, "#sentence"), SENTENCE, "Selection.toString(): no line break, no strip, the number once");
        assert.equal((await selectAll(page, "#lone")), "42", "the audit's own repro");
        const copied = await page.evaluate(() => new Promise((resolve) => { const range = document.createRange(); range.selectNodeContents(document.querySelector("#sentence")); getSelection().removeAllRanges(); getSelection().addRange(range); document.addEventListener("copy", (e) => { e.preventDefault(); resolve(getSelection().toString()); }, { once: true }); document.execCommand("copy"); }));
        assert.equal(copied, SENTENCE, "and by the copy event");
        await page.close();
      });
    }

    test("at rest and under reduced motion a selection copies the same text (they were not equal)", async () => {
      const rest = await open(TICKERS(), { theme }); const reduced = await open(TICKERS(), { theme, reducedMotion: "reduce" });
      assert.equal(await selectAll(rest, "#sentence"), await selectAll(reduced, "#sentence"));
      await rest.close(); await reduced.close();
    });

    test("the strips are unselectable and the readable text is in the sentence's flow, first, transparent and selectable, in a box with no width", async () => {
      const page = await open(TICKERS(), { theme });
      const parts = await page.evaluate(() => {
        const ticker = document.querySelector(".basalt-ticker");
        const visual = ticker.querySelector(".basalt-ticker-visual"); const text = ticker.querySelector(".basalt-ticker-text");
        const order = [...ticker.children].map((c) => c.className.split(" ")[0]);
        const v = getComputedStyle(visual); const t = getComputedStyle(text);
        return { order, vSelect: v.userSelect, tSelect: t.userSelect, tColor: t.color, tPosition: t.position, tWidth: t.width, tDisplay: t.display, ariaHidden: visual.getAttribute("aria-hidden"), spoken: text.textContent, ticker: getComputedStyle(ticker).display };
      });
      assert.deepEqual(parts.order, ["basalt-ticker-text", "basalt-ticker-visual"], "the readable text comes first in the DOM");
      assert.equal(parts.vSelect, "none");
      assert.notEqual(parts.tSelect, "none");
      assert.equal(parts.tColor, "rgba(0, 0, 0, 0)", "transparent");
      assert.deepEqual([parts.tPosition, parts.tWidth, parts.tDisplay, parts.ticker], ["static", "0px", "inline-block", "inline"], "in the flow, in a box with no width: the ticker is an inline box, so it adds no line break");
      assert.equal(parts.ariaHidden, "true");
      assert.equal(parts.spoken, "42");
      // nothing in the strips is a block or a flex container: either adds a line break to a copy
      const blocks = await page.evaluate(() => [...document.querySelectorAll(".basalt-ticker-visual *")].filter((e) => /^(block|flex|grid|list-item|table)/.test(getComputedStyle(e).display)).length);
      assert.equal(blocks, 0);
      await page.close();
    });

    test("at rest the pixels are the strips alone: the readable text draws nothing", async () => {
      const page = await open(TICKERS(), { theme });
      await frames(page);
      const clip = await page.locator("#sentence").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
      const withText = await page.screenshot({ clip });
      await page.addStyleTag({ content: ".basalt-ticker-text { visibility: hidden !important; }" });
      const without = await page.screenshot({ clip });
      assert.ok(withText.equals(without), "identical pixels with and without the readable text");
      await page.close();
    });

    for (const [label, options] of MODES) {
      test(`a selected sentence is one band: the same height over a number as over the words, in one colour (${label})`, async () => {
        const page = await open(TICKERS(), { theme, ...options });
        await frames(page);
        await selectAll(page, "#sentence");
        const probe = await page.evaluate(() => {
          const vis = document.querySelector("#sentence .basalt-ticker-visual"); const t = (getComputedStyle(vis).display === "none" ? document.querySelector("#sentence .basalt-ticker-text") : vis).getBoundingClientRect();
          const p = document.querySelector("#sentence").getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(document.querySelector("#sentence"));
          return { t: { x: t.x, y: t.y, w: t.width, h: t.height, r: t.right }, p: { x: p.x, y: p.y, h: p.height }, right: range.getBoundingClientRect().right };
        });
        const y0 = Math.floor(probe.p.y) - 4; const h = Math.ceil(probe.p.h) + 8;
        const shot = await page.screenshot({ clip: { x: 0, y: y0, width: Math.ceil(probe.right) + 8, height: h } });
        const read = await page.evaluate(async ({ b64, cols, rows, y }) => {
          const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob(); const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d"); ctx.drawImage(bitmap, 0, 0);
          const px = (x, yy) => ctx.getImageData(x, yy, 1, 1).data.slice(0, 3).join(",");
          const bg = px(0, 0);
          // for each probe column: the first and last row that is not the page's colour (a column in a blank gap, so no ink: only the band)
          const extent = cols.map((x) => { let top = -1; let bottom = -1; for (let yy = 0; yy < bitmap.height; yy += 1) if (px(x, yy) !== bg) { if (top < 0) top = yy; bottom = yy; } return [top, bottom]; });
          const seen = new Set(); for (let x = cols[0]; x < cols[cols.length - 1]; x += 1) seen.add(px(x, rows));
          return { extent, seen: [...seen], bg };
        }, { b64: shot.toString("base64"), cols: [Math.round(probe.p.x + 1), Math.round(probe.t.x + 0.5), Math.round(probe.t.r - 0.5)], rows: Math.round(probe.p.y - y0 + 1) , y: y0 });
        const [words, left, right] = read.extent;
        assert.ok(words[0] >= 0, "a band is drawn over the words");
        // At rest, under reduced motion and in forced colours the number is in the sentence's own line (DECISIONS 147: under reduced motion and in forced colours it is plain
        // text with no 1em box and no clip), so its band is exactly the sentence's.
        const slack = 0;
        for (const [name, edge] of [["left", left], ["right", right]]) {
          assert.ok(Math.abs(edge[0] - words[0]) <= slack && Math.abs(edge[1] - words[1]) <= slack, `the band over the number's ${name} edge is the band over the words (${edge} against ${words})`);
        }
        await page.close();
      });
    }

    test("the digits still roll: not one unselected pixel changes mid-roll", async () => {
      const page = await open(`document.body.style.margin = "0"; function App() { const [v, setV] = React.useState(1284.5); window.setV = setV; return <div style={{ padding: 12, fontSize: 24 }}><p style={{ margin: 0 }}>Orders <B.NumberTicker value={v} /> of <B.NumberTicker value={v * 2} /> done</p></div>; } ${render("<App />")}`, { theme });
      await frames(page);
      await page.evaluate(() => window.setV(8531.7));
      await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 70; }));
      const mid = await page.evaluate(() => [...document.querySelectorAll(".basalt-ticker-strip")].map((e) => getComputedStyle(e).transform));
      assert.ok(mid.some((t) => t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)"), "strips are part-way through their roll");
      await page.close();
    });

    test("axe finds nothing, at 1440 and 390", async () => {
      for (const width of [1440, 390]) {
        const page = await open(TICKERS(), { theme, width });
        assert.deepEqual(await axe(page), [], `axe at ${width}`);
        await page.close();
      }
    });
  });
}

// ---- C3: a required field ----

const FIELDS = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; ${render(`<form style={{ width: 640, padding: 16, display: "grid", gap: 16 }}><B.Field label="Sandbox name" required name="sandbox"><B.Input /></B.Field><B.Field label="Note" optional name="note"><B.Input /></B.Field><B.Field label="Region" name="region"><B.Input /></B.Field><B.Field label="Window" required requiredLabel="Obligatoire" name="window"><B.Input /></B.Field></form>`)}`;

for (const theme of THEMES) {
  describe(`C3 a required field (${theme})`, () => {
    test("Required shows directly after the label, Optional only where marked, and a field marked neither shows nothing", async () => {
      const page = await open(FIELDS, { theme });
      const fields = await page.evaluate(() => [...document.querySelectorAll(".basalt-field")].map((f) => { const l = f.querySelector(".basalt-field-label"); const n = l.querySelector(".basalt-field-necessity"); const range = document.createRange(); range.selectNodeContents(l.firstChild); const text = range.getBoundingClientRect(); const nr = n?.getBoundingClientRect(); const lr = l.getBoundingClientRect(); return { label: l.firstChild.textContent, word: n?.textContent ?? null, gap: nr ? nr.left - text.right : null, sameRow: nr ? Math.abs(nr.top + nr.height / 2 - (text.top + text.height / 2)) < 4 : null, labelHeight: lr.height, labelRight: lr.right, wordRight: nr?.right ?? null, fieldRight: f.getBoundingClientRect().right }; }));
      assert.deepEqual(fields.map((f) => f.word), ["Required", "Optional", null, "Obligatoire"]);
      for (const f of fields.filter((f) => f.word)) {
        assert.ok(f.gap >= 0 && f.gap <= 10, `${f.label}: the word is ${f.gap}px after the label's text, not at the far end of the row`);
        assert.ok(f.sameRow, "on the label's own line");
        assert.ok(f.fieldRight - f.wordRight > 400, "nowhere near the end of a 640px field");
      }
      near(fields[0].labelHeight, fields[2].labelHeight, "a marked label is as tall as an unmarked one: nothing else in the form moves", 0.01);
      await page.close();
    });

    test("the word is tertiary at text-xs and 400, hidden from assistive technology, and the input's own `required` says it; never an asterisk", async () => {
      const page = await open(FIELDS, { theme });
      const word = await page.locator(".basalt-field-necessity").first().evaluate((el) => { const s = getComputedStyle(el); return { size: s.fontSize, weight: s.fontWeight, color: s.color, hidden: el.getAttribute("aria-hidden"), lh: s.lineHeight }; });
      const tertiary = await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--basalt-text-tertiary)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
      assert.equal(word.size, "12px"); assert.equal(word.weight, "400"); assert.equal(word.color, tertiary); assert.equal(word.hidden, "true");
      const inputs = await page.evaluate(() => [...document.querySelectorAll("input")].map((i) => ({ required: i.required, ariaRequired: i.getAttribute("aria-required"), name: i.labels[0].firstChild.textContent })));
      assert.deepEqual(inputs.map((i) => i.required), [true, false, false, true], "a required Field's Input carries required");
      const snapshot = await page.accessibility?.snapshot?.().catch(() => null);
      void snapshot;
      const names = await page.evaluate(() => [...document.querySelectorAll("input")].map((i) => i.labels[0].textContent));
      assert.ok(names[0].includes("Required"), "the label element's text includes the word...");
      const role = await page.getByRole("textbox", { name: "Sandbox name", exact: true }).count();
      assert.equal(role, 1, "...but the accessible name is the label alone: the word is not said twice");
      assert.equal(await page.getByRole("textbox", { name: "Window", exact: true }).count(), 1);
      assert.doesNotMatch(await page.locator("form").textContent(), /\*/, "never an asterisk");
      await page.close();
    });

    test("the word's contrast is 4.5:1 or better on every surface level the field can sit on", async () => {
      const page = await open(`document.body.style.margin = "0"; ${render(`<div>{[0, 1, 2, 3].map((level) => <div key={level} data-level={level || undefined} style={{ padding: 16, background: level ? "var(--_surface)" : "var(--basalt-surface-page)" }}><B.Field label="Name" required><B.Input /></B.Field></div>)}</div>`)}`, { theme });
      const ratios = await page.evaluate(() => {
        const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
        const rgb = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
        const lum = (c) => { const [r, g, b] = rgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        return [...document.querySelectorAll(".basalt-field-necessity")].map((n) => { let bg = n; let color = "rgba(0, 0, 0, 0)"; while (bg && /rgba\(0, 0, 0, 0\)|transparent/.test(color)) { color = getComputedStyle(bg).backgroundColor; bg = bg.parentElement; } const [a, b] = [lum(getComputedStyle(n).color), lum(color)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); });
      });
      assert.equal(ratios.length, 4);
      for (const r of ratios) assert.ok(r >= 4.5, `ratio ${r}`);
      await page.close();
    });

    test("axe finds nothing, at 1440 and 390", async () => {
      for (const width of [1440, 390]) {
        const page = await open(FIELDS, { theme, width });
        assert.deepEqual(await axe(page), [], `axe at ${width}`);
        await page.close();
      }
    });
  });
}

// ---- E2: the core set draws check, close, the chevrons, copy, plus, minus and search ----

describe("E2 a component draws the core glyph where the core set has one", () => {
  test("no source file draws Phosphor's version of a core glyph (the audit's A4-05 list)", async () => {
    const dir = new URL("../src/", import.meta.url).pathname;
    const banned = ["CheckIcon", "XIcon", "CaretRightIcon", "CaretLeftIcon", "CaretDownIcon", "CaretUpIcon", "CopyIcon", "PlusIcon", "MinusIcon", "MagnifyingGlassIcon"];
    const hits = [];
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))) {
      const text = fs.readFileSync(`${dir}${file}`, "utf8");
      for (const name of banned) if (new RegExp(`\\b${name}\\b`).test(text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))) hits.push(`${file}: ${name}`);
    }
    assert.deepEqual(hits, []);
  });

  for (const theme of THEMES) {
    test(`the rendered controls draw core glyphs (${theme}): a core glyph is drawn with the core stroke, 2.25 on 24, and no Phosphor path`, async () => {
      const page = await open(`document.body.style.margin = "0"; ${render(`<B.ToastProvider><div style={{ padding: 16, width: 420, display: "grid", gap: 12 }}>
        <B.Checkbox defaultChecked>Checked</B.Checkbox>
        <B.Checkbox indeterminate>Mixed</B.Checkbox>
        <B.NumberField aria-label="Count" defaultValue={2} />
        <B.Breadcrumbs items={[{ label: "Home", href: "#" }, { label: "Runs", href: "#r" }, { label: "Run" }]} />
        <B.Pagination page={2} pageCount={5} onPageChange={() => {}} />
        <B.Accordion><B.AccordionItem value="a" title="Details">Body</B.AccordionItem></B.Accordion>
        <B.CodeBlock code="npm test" language="bash" />
      </div></B.ToastProvider>`)}`, { theme });
      await frames(page);
      const icons = await page.evaluate(() => [...document.querySelectorAll("svg.basalt-icon")].map((svg) => ({ viewBox: svg.getAttribute("viewBox"), where: svg.closest("[class]")?.className?.toString().split(" ")[0], })));
      assert.ok(icons.length >= 6, `icons drawn: ${icons.length}`);
      for (const icon of icons) {
        assert.equal(icon.viewBox, "0 0 24 24", `${icon.where} is drawn on the core 24 grid, not Phosphor's 256`);
      }
      await page.close();
    });
  }
});

// ---- B2: what the standalone-link rule leaves alone ----

describe("B2 the standalone-link rule leaves a page number, a breadcrumb and a table cell's link to their own rules", () => {
  test("on touch a Pagination of links and Breadcrumbs keep their own 44px boxes, with no negative margin of the standalone rule", async () => {
    const page = await open(`document.body.style.margin = "0"; ${render(`<div style={{ padding: 16, width: 358 }}><B.Pagination page={2} pageCount={5} hrefForPage={(n) => "#p" + n} /><B.Breadcrumbs items={[{ label: "Home", href: "#" }, { label: "Runs", href: "#r" }, { label: "Run" }]} /></div>`)}`, { theme: "dark", width: 390, height: 844, ...COARSE });
    await frames(page);
    const read = await page.evaluate(() => [...document.querySelectorAll(".basalt-pagination a, .basalt-breadcrumbs a")].map((a) => { const s = getComputedStyle(a); const r = a.getBoundingClientRect(); return { margin: s.marginTop, h: r.height }; }));
    assert.ok(read.length >= 5);
    for (const link of read) { assert.equal(link.margin, "0px", "no standalone margin"); near(link.h, 44, "a 44px box"); }
    const nav = await page.locator(".basalt-pagination").evaluate((el) => el.getBoundingClientRect().height);
    near(nav, 44, "the pagination row is 44 tall, not 20");
    await page.close();
  });
});

// ---- Amendment 1 (DECISIONS 142) ----

// 4. The skip link reads the bar's real bottom edge: a 40px notice above a real SiteHeader, before and after a 200px scroll.
const NOTICE = (bar) => `document.body.style.margin = "0"; ${render(`<div><B.SkipLink target="main" /><div id="notice" style={{ height: 40, background: "var(--basalt-surface-3)" }}>A notice above the bar</div>${bar}<main id="main" tabIndex={-1} style={{ padding: 24, minHeight: 3000 }}><h2>Alpha</h2><p>Synthetic words.</p></main></div>`)}`;
const OWN_BAR = `<header className="basalt-chrome basalt-sticky-bar" style={{ position: "sticky", top: 0, zIndex: 10, height: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", boxSizing: "border-box" }}><a id="brand" href="#alpha">Alpha</a><B.Button size="sm">Search</B.Button></header>`;
const underBar = (page, barSelector) => page.evaluate((barSelector) => {
  const link = document.querySelector(".basalt-skip-link").getBoundingClientRect();
  const bar = document.querySelector(barSelector).getBoundingClientRect();
  const overlap = Math.max(0, Math.min(link.right, bar.right) - Math.max(link.left, bar.left)) * Math.max(0, Math.min(link.bottom, bar.bottom) - Math.max(link.top, bar.top));
  return { gap: link.top - bar.bottom, overlap, barTop: bar.top };
}, barSelector);
const NOTICE_MODES = [["", {}], [" (forced colours)", { forcedColors: "active" }], [" (reduced motion)", { reducedMotion: "reduce" }]];

for (const theme of THEMES) {
  for (const width of [1440, 390]) {
    for (const [mode, options] of NOTICE_MODES) {
      test(`4. a skip link under a bar with a notice above it sits space-2 under the bar's real edge, before and after the scroll: ${theme}, ${width}${mode}`, async () => {
        const page = await open(NOTICE(HEADER), { theme, width, height: 800, ...options });
        await frames(page);
        const content = () => page.evaluate(() => [...document.querySelectorAll("#notice, main, .basalt-site-header")].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
        const before = await content();
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.className), "basalt-skip-link");
        const top = await underBar(page, ".basalt-site-header");
        near(top.barTop, 40, "the bar is 40px down, under the notice");
        near(top.gap, 8, "space-2 under the bar's line, not under where a bar at the top would be");
        assert.equal(top.overlap, 0, "it covers nothing in the bar");
        assert.deepEqual(await content(), before, "nothing in the page moved when the link took focus (0px)");
        // the notice scrolls away and the bar sticks at the top: the link follows it while it holds focus
        await page.evaluate(() => window.scrollTo(0, 200));
        await frames(page);
        const stuck = await underBar(page, ".basalt-site-header");
        near(stuck.barTop, 0, "the bar has stuck at the top");
        near(stuck.gap, 8, "and the link is space-2 under it now");
        assert.equal(stuck.overlap, 0);
        // a resize while it holds focus reads the edge again
        await page.setViewportSize({ width: width === 1440 ? 1300 : 380, height: 800 });
        await frames(page);
        near((await underBar(page, ".basalt-site-header")).gap, 8, "after a resize");
        // leaving it clears what it wrote: the stylesheet places it again
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(".basalt-skip-link").evaluate((el) => el.style.top), "", "no inline place is left behind");
        await page.close();
      });
    }
  }

  test(`4. it works with an app's own bar (.basalt-sticky-bar) and falls back to the stylesheet's place with no bar (${theme})`, async () => {
    const own = await open(NOTICE(OWN_BAR), { theme, width: 1440, height: 800 });
    await frames(own);
    await own.keyboard.press("Tab");
    const top = await underBar(own, ".basalt-sticky-bar");
    near(top.gap, 8, "under the own bar's real edge"); assert.equal(top.overlap, 0);
    await own.close();
    const none = await open(`document.body.style.margin = "0"; ${render(`<div><B.SkipLink target="main" /><main id="main" tabIndex={-1} style={{ padding: 24 }}><h1>Plain page</h1></main></div>`)}`, { theme });
    await none.keyboard.press("Tab");
    const box0 = await boxOf(none, ".basalt-skip-link");
    near(box0.x, 8, "space-2 from the start"); near(box0.y, 8, "and from the top");
    assert.equal(await none.locator(".basalt-skip-link").evaluate((el) => el.style.top), "");
    await none.close();
  });
}

// A. A column wider than the viewport: the plate may be narrower than its cell and never passes the viewport; the column never changes.
const WIDE = `document.body.style.margin = "0"; const ROWS = ${JSON.stringify(ROWS)}; ${render(`<div style={{ padding: 16 }}><B.TableContainer label="Runs"><B.Table columns={[{ width: 170 }, { width: 420 }, {}]} minWidth={1600}><B.TableHeader><B.TableRow><B.TableHead>Run</B.TableHead><B.TableHead>Message</B.TableHead><B.TableHead>Owner</B.TableHead></B.TableRow></B.TableHeader><B.TableBody>{ROWS.slice(0, 3).map((r) => <B.TableRow key={r[0]}><B.TableRowHead>{r[0]}</B.TableRowHead><B.TableCell>{r[5] + " " + r[5]}</B.TableCell><B.TableCell>{r[6]}</B.TableCell></B.TableRow>)}</B.TableBody></B.Table></B.TableContainer></div>`)}`;
for (const theme of THEMES) {
  for (const [mode, options] of NOTICE_MODES) {
    test(`A. a 420px column's plate never passes a 390px viewport, and the column does not change: ${theme}${mode}`, async () => {
      const page = await open(WIDE, { theme, width: 390, height: 700, ...options });
      await frames(page);
      const cols = () => page.evaluate(() => [...document.querySelectorAll("thead th")].map((c) => Math.round(c.getBoundingClientRect().width * 100) / 100));
      const before = await cols();
      near(before[1], 420, "the column is 420 wide");
      const target = page.locator("[data-cut]", { hasText: "Backfill the ledger" }).first();
      await target.focus();
      await page.waitForFunction(() => document.querySelector(".basalt-cell-peek")?.hasAttribute("data-open"));
      const p = await peekState(page);
      assert.ok(p.left >= -0.5 && p.right <= 390.5, `the plate is inside the viewport: ${p.left} to ${p.right}`);
      assert.ok(p.width < 420, `and narrower than its cell: ${p.width}`);
      assert.deepEqual(await cols(), before, "no column changed");
      await page.close();
    });
  }
}

// C. A short standalone link is a 44 by 44 target: its hit box is widened, not the link.
const GO = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; ${render(`<div style={{ width: 360, padding: 24 }}><div id="own"><B.Link href="#go">Go</B.Link></div><div style={{ height: 40 }} /><p id="after">After</p></div>`)}`;
for (const theme of THEMES) {
  test(`C. on a coarse pointer a short link ("Go") has a 44 by 44 hit box and its width, line and look do not change (${theme})`, async () => {
    const coarse = await open(GO, { theme, width: 390, height: 844, ...COARSE });
    const fine = await open(GO, { theme, width: 390, height: 844 });
    await frames(coarse); await frames(fine);
    const link = await boxOf(coarse, "#own a");
    assert.ok(link.w < 30, `the link itself is still short: ${link.w}`);
    near(link.h, 44, "44 tall");
    const cx = link.x + link.w / 2; const cy = link.y + link.h / 2;
    const hit = (dx, dy) => coarse.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("a")?.id !== undefined && document.elementFromPoint(x, y)?.closest("a") !== null, [cx + dx, cy + dy]);
    for (const [dx, dy, expected] of [[0, 0, true], [-21, 0, true], [21, 0, true], [-21, -21, true], [21, 21, true], [-24, 0, false], [24, 0, false]]) assert.equal(await hit(dx, dy), expected, `a tap ${dx}px across and ${dy}px down from its centre ${expected ? "lands" : "misses"}`);
    for (const id of ["#own", "#after"]) { const c = await boxOf(coarse, id); const f = await boxOf(fine, id); near(c.y, f.y, `${id} y`, 0.01); near(c.h, f.h, `${id} height`, 0.01); }
    const look = (page) => page.locator("#own a").evaluate((el) => { const s = getComputedStyle(el); const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect(); return { line: s.textDecorationLine, bg: s.backgroundColor, text: [t.x, t.y, t.width, t.height], w: el.getBoundingClientRect().width }; });
    assert.deepEqual(await look(coarse), await look(fine), "the same underline, no wash, the text and the link's width where they were");
    await coarse.close(); await fine.close();
  });
}

// ---- Amendment 2 (DECISIONS 147) ----

// 1. A selected ticker in forced colours: the strips are hidden and the number is its own text; the system paints one band and its selected-text colour on the digits.
const TICK_VALUE = `document.body.style.margin = "0"; function App() { const [v, setV] = React.useState(1284.5); window.setV = setV; return <div style={{ padding: 16 }}><p id="sentence" style={{ margin: 0, fontSize: 20 }}>Orders today: <B.NumberTicker value={v} /> of <B.NumberTicker value={1500} glide /> done</p></div>; } ${render("<App />")}`;
for (const scheme of ["dark", "light"]) {
  for (const theme of ["dark", "light"]) {
    test(`1. in forced colours (${scheme} palette, ${theme} page) a selected sentence is one band, its digits take the selected-text colour, the strips are not drawn and the number is where it was`, async () => {
      const rest = await open(TICK_VALUE, { theme, colorScheme: scheme });
      await frames(rest);
      const at = await rest.evaluate(() => { const r = document.querySelector("#sentence .basalt-ticker-visual").getBoundingClientRect(); return [r.x, r.width]; });
      await rest.close();
      const page = await open(TICK_VALUE, { theme, colorScheme: scheme, forcedColors: "active" });
      await frames(page);
      const geometry = await page.evaluate(() => { const v = document.querySelector("#sentence .basalt-ticker-visual"); const t = document.querySelector("#sentence .basalt-ticker-text"); const r = t.getBoundingClientRect(); return { visual: getComputedStyle(v).display, display: getComputedStyle(t).display, overflow: getComputedStyle(t).overflow, x: r.x, width: r.width, adjust: getComputedStyle(t).forcedColorAdjust }; });
      assert.equal(geometry.visual, "none", "the strips are not drawn");
      assert.equal(geometry.display, "inline"); assert.equal(geometry.overflow, "visible"); assert.equal(geometry.adjust, "auto", "the system's");
      near(geometry.x, at[0], "the number starts where it did"); near(geometry.width, at[1], "and is as wide (68.05 against 68.06 in the council's measure)", 0.2);
      assert.equal(await selectAll(page, "#sentence"), SENTENCE, "the copied text is exact");
      const colours = await page.evaluate(() => { const p = document.createElement("span"); p.style.cssText = "color: HighlightText; background: Highlight"; document.body.append(p); const s = getComputedStyle(p); const c = { band: s.backgroundColor, ink: s.color }; p.remove(); return c; });
      const probe = await page.evaluate(() => { const t = document.querySelector("#sentence .basalt-ticker-text").getBoundingClientRect(); const p = document.querySelector("#sentence").getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(document.querySelector("#sentence")); return { t: { x: t.x, y: t.y, w: t.width, h: t.height }, p: { x: p.x, y: p.y, h: p.height }, right: range.getBoundingClientRect().right }; });
      const y0 = Math.floor(probe.p.y) - 2; const shot = await page.screenshot({ clip: { x: 0, y: y0, width: Math.ceil(probe.right) + 4, height: Math.ceil(probe.p.h) + 4 } });
      const read = await page.evaluate(async ({ b64, row, x0, x1, ty0, ty1, left, right }) => {
        const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob(); const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d"); ctx.drawImage(bitmap, 0, 0);
        const rgb = (x, y) => `rgb(${[...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)].join(", ")})`;
        const band = new Set(); for (let x = left + 1; x < right - 1; x += 1) band.add(rgb(x, row));
        const ink = new Set(); for (let y = ty0; y < ty1; y += 1) for (let x = x0; x < x1; x += 1) ink.add(rgb(x, y));
        return { band: [...band], ink: [...ink] };
      }, { b64: shot.toString("base64"), row: 2, x0: Math.round(probe.t.x), x1: Math.round(probe.t.x + probe.t.w), ty0: Math.round(probe.t.y - y0), ty1: Math.round(probe.t.y - y0 + probe.t.h), left: Math.round(probe.p.x), right: Math.round(probe.right) });
      // (each page pixel row 2 of the clip is inside the sentence's band, above the glyphs' ink)
      assert.equal(read.band.length, 1, `the band is one colour from end to end: ${read.band}`);
      assert.notEqual(read.band[0], "rgb(0, 0, 0)", "and it is a band, not the page");
      assert.ok(read.ink.includes(colours.ink), "the digits are the system's selected-text colour");
      await page.evaluate(() => window.setV(8531.7));
      await frames(page);
      assert.equal(await page.locator("#sentence .basalt-ticker-text").first().textContent(), "8,531.7", "a new value shows at once, in place");
      await page.close();
    });
  }
}

// 2. Under reduced motion the band is exact (the number in the sentence's own line), and the sparkline head's digits do not move.
test("2. under reduced motion the sparkline head keeps its 1em box, and a ticker in a sentence has none", async () => {
  const page = await open(`document.body.style.margin = "0"; ${render(`<div style={{ padding: 16, width: 360, fontSize: 20 }}><p id="sentence" style={{ margin: 0 }}>Orders <B.NumberTicker value={1284.5} /> done</p><B.Sparkline label="Runs" data={[3, 5, 12]} /></div>`)}`, { theme: "dark", reducedMotion: "reduce" });
  await frames(page);
  const read = await page.evaluate(() => ["#sentence .basalt-ticker-text", ".basalt-sparkline-head .basalt-ticker-text"].map((s) => { const c = getComputedStyle(document.querySelector(s)); return [c.display, c.height === "0px" ? "0" : c.overflow, c.lineHeight]; }));
  assert.equal(read[0][0], "inline"); assert.equal(read[0][1], "visible");
  assert.deepEqual([read[1][0], read[1][1]], ["block", "clip"], "a flex item: blockified, and still clipped to its 1em box");
  await page.close();
});
