// audit-fix-c9: the second audit's rule findings (A4-16 to A4-22, A4-25's last part, and the review page's blank week labels). Each makes a part do what its decided
// paragraph in docs/foundations.md already says, so none changes a pixel beyond what the documents say the part draws. Driven in Chromium against the built package with
// the real stylesheet, in both themes, at 1440 and at 390 on a coarse pointer wherever the part draws. Nothing waits on a wall clock: it waits for the state, or reads
// what is set.
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
const SHELL = (body) => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; createRoot(document.getElementById("root")).render(<main style={{ padding: 16, boxSizing: "border-box", maxWidth: 420 }}>${body}</main>);`;
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

// ---- A4-16: an inline-label row's whole row is the field's touch target
describe("A4-16: a one-line inline-label row is the field's touch target, whole", () => {
  const ROWS = SHELL(`<B.InlineFields id="rows"><B.InlineField label="To"><B.InlineInput id="to" /></B.InlineField><B.InlineField label="Notes" multiline><B.InlineTextarea id="notes" rows={3} /></B.InlineField></B.InlineFields>`);
  for (const [name, options] of [["1440", DESKTOP], ["390 on a coarse pointer", PHONE]]) {
    for (const theme of THEMES) {
      test(`${theme}, ${name}: a point 3px inside the row's top and bottom edges, over the control and over the label, lands on the field and its label, and the row stays 44`, async () => {
        const page = await open(ROWS, options, theme);
        const row = page.locator(".basalt-inline-field").first();
        const r = await box(row);
        assert.equal(r.height, 44, "the row is 44 tall, as it was");
        const control = await box(page.locator("#to"));
        const label = await box(page.locator(".basalt-inline-label").first());
        for (const [x, y, want] of [
          [control.x + control.width / 2, r.y + 3, "INPUT"],
          [control.x + control.width / 2, r.y + r.height - 4, "INPUT"],
          [label.x + 4, r.y + 3, "LABEL"],
          [label.x + 4, r.y + r.height - 4, "LABEL"],
        ]) {
          assert.equal(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.tagName, [x, y]), want, `at ${Math.round(x)},${Math.round(y)}`);
        }
        // a tap on the label's column focuses the field, as a label does
        await page.mouse.click(label.x + 4, r.y + 3);
        assert.equal(await page.evaluate(() => document.activeElement?.id), "to");
        await page.close();
      });
    }
  }

  test("a multi-line row keeps its label at the top and its textarea as tall as it is", async () => {
    const page = await open(ROWS, DESKTOP, "dark");
    const row = await box(page.locator(".basalt-inline-field").nth(1));
    const label = await box(page.locator(".basalt-inline-label").nth(1));
    assert.equal(await css(page.locator(".basalt-inline-field").nth(1), "alignItems"), "start");
    assert.ok(label.height < 30 && label.y - row.y < 12, `the label is its own line at the top: ${label.y - row.y} from the row's top`);
    await page.close();
  });
});

// ---- A4-17: the phase chart's end steps look and behave disabled
describe("A4-17: the phase chart's Previous and Next week, at the ends, are disabled buttons that stay focusable", () => {
  const PHASE = (week) => `import { weightData, calls, lb } from "./test/fixtures/figure-data.ts";
    const p = weightData(84);
    function Scene() {
      const [week, setWeek] = React.useState(${week});
      return <div style={{ width: 358, margin: "0 auto", padding: 16 }}><B.PhaseChart title="Weight over twelve weeks" name="Weight" days={p.days} values={p.values} reasons={p.reasons} calls={calls()} week={week} onWeekChange={setWeek} summary="Twelve weeks." now={Date.UTC(2026, 10, 10, 12)} format={lb} unit="lb" /></div>;
    }
    document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
    createRoot(document.getElementById("root")).render(<Scene />);`;
  for (const theme of THEMES) {
    test(`${theme}, 390: at the first week "Previous week" is the disabled look (disabled ink, no pointer, no press) and focusable; "Next week" is enabled; a press changes nothing`, async () => {
      const page = await open(PHASE(0), PHONE, theme);
      const previous = page.getByRole("button", { name: "Previous week" });
      const next = page.getByRole("button", { name: "Next week" });
      assert.equal(await previous.getAttribute("aria-disabled"), "true");
      assert.notEqual(await previous.getAttribute("data-disabled"), null, "the disabled rules key on data-disabled");
      assert.equal(await css(previous, "color"), await resolve(page, "var(--basalt-text-disabled)"), "disabled ink");
      assert.equal(await css(previous, "cursor"), "not-allowed");
      assert.equal(await next.getAttribute("aria-disabled"), null);
      assert.notEqual(await css(next, "color"), await resolve(page, "var(--basalt-text-disabled)"));
      const before = await page.locator(".basalt-phase-open > span[aria-hidden]:not(.basalt-chart-reserve)").textContent();
      await previous.click({ force: true });
      assert.equal(await page.locator(".basalt-phase-open > span[aria-hidden]:not(.basalt-chart-reserve)").textContent(), before, "a disabled press changes no week");
      await previous.focus();
      assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Previous week", "it stays focusable");
      await next.click();
      assert.notEqual(await page.locator(".basalt-phase-open > span[aria-hidden]:not(.basalt-chart-reserve)").textContent(), before, "the enabled one steps");
      assert.equal(await previous.getAttribute("aria-disabled"), null, "and the first button is enabled again");
      await page.close();
    });

    test(`${theme}, 390: at the last week "Next week" is the disabled look`, async () => {
      const page = await open(PHASE(11), PHONE, theme);
      const next = page.getByRole("button", { name: "Next week" });
      assert.equal(await next.getAttribute("aria-disabled"), "true");
      assert.equal(await css(next, "color"), await resolve(page, "var(--basalt-text-disabled)"));
      assert.equal(await css(page.getByRole("button", { name: "Previous week" }), "cursor"), "pointer");
      await page.close();
    });
  }
});

// ---- A4-18: forced colours, a marks row's pills are CanvasText with no gradient, as the columns and the blocks are
describe("A4-18: in forced colours every kind of marks row draws CanvasText and no gradient", () => {
  const MARKS = `import { marksData, MARKS_CAP } from "./test/fixtures/figure-data.ts";
    document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
    createRoot(document.getElementById("root")).render(<div style={{ width: 600, display: "grid", gap: 24, padding: 16 }}>{["columns", "pills", "blocks"].map((k) => <B.MarksRow key={k} id={k} kind={k} values={marksData(k, 12)} cap={MARKS_CAP[k]} label={k + " row"} />)}</div>);`;
  for (const theme of THEMES) {
    test(`${theme}: the pills compute the same background as the columns and the blocks (CanvasText), with no image`, async () => {
      const page = await open(MARKS, DESKTOP, theme, { forcedColors: "active" });
      const canvasText = await resolve(page, "CanvasText", "backgroundColor");
      for (const kind of ["columns", "pills", "blocks"]) {
        const mark = page.locator(`#${kind} .basalt-marks-mark, [id="${kind}"] .basalt-marks-mark`).first();
        assert.equal(await css(mark, "backgroundColor"), canvasText, `${kind}: colour`);
        assert.equal(await css(mark, "backgroundImage"), "none", `${kind}: no gradient`);
      }
      await page.close();
    });
  }

  test("outside forced colours the pills keep their lit gradient", async () => {
    const page = await open(MARKS, DESKTOP, "dark");
    assert.match(await css(page.locator("#pills .basalt-marks-mark, [id='pills'] .basalt-marks-mark").first(), "backgroundImage"), /linear-gradient/);
    await page.close();
  });
});

// ---- A4-19: a table row's checkbox does not move when it is ticked
describe("A4-19: a checkbox in a table cell stays where it is when ticked and unticked", () => {
  const TABLE = `function Scene() {
      const [on, setOn] = React.useState(false);
      return <div style={{ width: 358, padding: 16 }}><B.TableContainer label="Runs"><B.Table columns={[{ width: 44 }, { width: 120 }, {}]} minWidth={400}><B.TableHeader><B.TableRow><B.TableHead>Pick</B.TableHead><B.TableHead>Run</B.TableHead><B.TableHead>Name</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run-1" checked={on} onCheckedChange={setOn} /></B.TableCell><B.TableRowHead>run-1</B.TableRowHead><B.TableCell>Alpha</B.TableCell></B.TableRow><B.TableRow><B.TableCell><B.Checkbox aria-label="Select run-2" /></B.TableCell><B.TableRowHead>run-2</B.TableRowHead><B.TableCell>Beta</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>;
    }
    document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
    createRoot(document.getElementById("root")).render(<Scene />);`;
  // The fixture page has no doctype, so it is in quirks mode, where a table cell's line box is laid out differently (the box sits at the row's centre and
  // never moves). An app's page is in standards mode, so this page is too.
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
      test(`${theme}, ${name}: the box, the row and the next row's box are at the same place ticked as empty`, async () => {
        const page = await openStandards(TABLE, options, theme);
        const read = async () => ({ box: await box(page.getByRole("checkbox", { name: "Select run-1" })), row: await box(page.locator("tbody tr").first()), next: await box(page.getByRole("checkbox", { name: "Select run-2" })) });
        const before = await read();
        await page.getByRole("checkbox", { name: "Select run-1" }).click();
        assert.equal(await page.getByRole("checkbox", { name: "Select run-1" }).getAttribute("aria-checked"), "true");
        await settle(page);
        const ticked = await read();
        assert.deepEqual(ticked, before, "ticked");
        await page.getByRole("checkbox", { name: "Select run-1" }).click();
        await settle(page);
        assert.deepEqual(await read(), before, "unticked");
        await page.close();
      });
    }
  }
});

// ---- A4-20: under more contrast, the inline row's boundary and the option chip's seat are a field's boundary
describe("A4-20: under more contrast an inline-label row's edge and an option chip's seat are border-field", () => {
  const BODY = SHELL(`<B.InlineFields><B.InlineField label="To"><B.InlineInput /></B.InlineField></B.InlineFields><B.OptionChips legend="Flavour" options={[{ value: "v", label: "Vanilla" }, { value: "c", label: "Chocolate" }]} defaultValue="v" />`);
  for (const theme of THEMES) {
    test(`${theme}: in the mode both are the token's own colour (not the divider's), and outside it border-field equals border-input, so nothing else moves`, async () => {
      const page = await open(BODY, DESKTOP, theme, { contrast: "more" });
      const field = await resolve(page, "var(--basalt-border-field)");
      const input = await resolve(page, "var(--basalt-border-input)");
      assert.notEqual(field, input, "the mode steps border-field and not border-input (else this proves nothing)");
      assert.equal(await css(page.locator(".basalt-inline-fields"), "borderTopColor"), field, "the form's top rule");
      assert.equal(await css(page.locator(".basalt-inline-field"), "borderBottomColor"), field, "the row's rule");
      const seat = await css(page.locator(".basalt-option-chip-seat").nth(1), "boxShadow");
      assert.ok(seat.startsWith(field), `the chip's seat ring is ${field}: ${seat}`);
      await page.emulateMedia({ contrast: "no-preference" });
      await settle(page); // the seat's ring transitions (duration-fast)
      const normal = await resolve(page, "var(--basalt-border-input)");
      assert.equal(await resolve(page, "var(--basalt-border-field)"), normal, "outside the mode the two are one colour");
      assert.equal(await css(page.locator(".basalt-inline-field"), "borderBottomColor"), normal);
      assert.ok((await css(page.locator(".basalt-option-chip-seat").nth(1), "boxShadow")).startsWith(normal));
      await page.close();
    });
  }
});

// ---- A4-21: the event log's hover wash runs full bleed
describe("A4-21: the event log's hover wash runs to the list's own edge", () => {
  const LOG = SHELL(`<div style={{ width: 400 }}><B.EventLog id="log" label="Activity"><B.EventLine id="e1" href="#one" verb="opened" object="the pricing page" time="09:39:11" /><B.EventLine id="e2" href="#two" verb="read" object="the notes" time="09:38:00" /></B.EventLog></div>`);
  for (const theme of THEMES) {
    test(`${theme}, 1440: hovering a line washes a ::before as wide as the list (the line's width plus the list's 6px each side), square, and the line's own box is not filled`, async () => {
      const page = await open(LOG, DESKTOP, theme);
      await page.locator("#e1").hover();
      const list = await box(page.locator("#log"));
      const line = await box(page.locator("#e1"));
      assert.equal(list.width - line.width, 12, "the list is padded 6px each side");
      const wash = await resolve(page, "var(--basalt-state-hover)", "backgroundColor");
      assert.equal(await css(page.locator("#e1"), "backgroundColor", "::before"), wash, "the ::before carries the hover wash");
      assert.equal(await css(page.locator("#e1"), "backgroundColor"), "rgba(0, 0, 0, 0)", "the line's own box is not filled");
      assert.equal(await css(page.locator("#e1"), "width", "::before"), `${list.width}px`, "the wash is the list's whole width");
      assert.equal(await css(page.locator("#e1"), "height", "::before"), `${line.height}px`);
      assert.equal(await css(page.locator("#e1"), "borderTopLeftRadius", "::before"), "0px");
      // the other line is not washed
      assert.equal(await css(page.locator("#e2"), "backgroundColor", "::before"), "rgba(0, 0, 0, 0)");
      await page.close();
    });
  }
});

// ---- A4-22: radius by the drawn box, at 44 on touch
describe("A4-22: a horizontal Tab, a SourceStamp button and an event line drawn at 44 on touch are radius 8; at their own sizes they keep their 6", () => {
  const PARTS = SHELL(`<B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a">One</B.Tab><B.Tab value="b">Two</B.Tab></B.TabsList></B.Tabs><B.SourceStamp id="stamp" source="github" state="answered" at={Date.UTC(2026, 10, 17, 18, 52, 7)} timeZone="UTC" onOpen={() => {}} /><B.EventLog id="log" label="Activity"><B.EventLine id="e1" href="#one" verb="opened" object="the page" time="09:39:11" /></B.EventLog>`);
  for (const theme of THEMES) {
    test(`${theme}, 390 on a coarse pointer: each is drawn 44 tall and its corners are 8`, async () => {
      const page = await open(PARTS, PHONE, theme);
      const tab = page.getByRole("tab", { name: "One" });
      assert.ok((await box(tab)).height >= 44);
      assert.equal(await css(tab, "borderTopLeftRadius"), "8px", "tab, top corners");
      assert.equal(await css(tab, "borderBottomLeftRadius"), "0px", "tab, bottom corners stay square (the underline)");
      const stamp = page.locator("button#stamp");
      assert.ok((await box(stamp)).height >= 44);
      assert.equal(await css(stamp, "borderTopLeftRadius"), "8px", "source stamp");
      const line = page.locator("#e1");
      assert.ok((await box(line)).height >= 44);
      assert.equal(await css(line, "borderTopLeftRadius"), "8px", "event line");
      await page.close();
    });

    test(`${theme}, 1440: the 36px tab's top corners are 8 (DECISIONS 167, Q9d) and the 24px lines keep their 6`, async () => {
      const page = await open(PARTS, DESKTOP, theme);
      const tab = page.getByRole("tab", { name: "One" });
      assert.equal((await box(tab)).height, 36);
      assert.equal(await css(tab, "borderTopLeftRadius"), "8px");
      assert.equal(await css(page.locator("button#stamp"), "borderTopLeftRadius"), "6px");
      assert.equal(await css(page.locator("#e1"), "borderTopLeftRadius"), "6px");
      await page.close();
    });
  }
});

// ---- A4-25: the shared element reads its timing from the tokens
describe("A4-25: SharedElement's move runs on the stylesheet's duration-slow and ease-out", () => {
  const SHARED = `import * as S from "./dist/shared-element.js";
    function Scene() {
      const [moved, setMoved] = React.useState(false);
      window.move = () => setMoved(true);
      return <div style={{ display: "flex", gap: 200 }}><div>{!moved && <S.SharedElement layoutId="same"><b>Item</b></S.SharedElement>}</div><div>{moved && <S.SharedElement layoutId="same"><b>Item</b></S.SharedElement>}</div></div>;
    }
    createRoot(document.getElementById("root")).render(<Scene />);`;
  test("a token set to 480ms is the move's duration, and the curve is the token's", async () => {
    const page = await open(SHARED, DESKTOP, "dark");
    await page.evaluate(() => { document.documentElement.style.setProperty("--basalt-duration-slow", "480ms"); document.documentElement.style.setProperty("--basalt-ease-out", "cubic-bezier(0.2, 0.4, 0.6, 0.8)"); });
    await page.evaluate(() => { window.move(); });
    await page.waitForFunction(() => document.getAnimations().some((a) => a.effect?.getKeyframes?.().some((k) => k.transform && k.transform !== "none")));
    const timing = await page.evaluate(() => { const a = document.getAnimations().find((a) => a.effect?.getKeyframes?.().some((k) => k.transform && k.transform !== "none")); const t = a.effect.getTiming(); return { duration: t.duration, easing: t.easing }; });
    assert.equal(timing.duration, 480);
    assert.equal(timing.easing, "cubic-bezier(0.2, 0.4, 0.6, 0.8)");
    await page.close();
  });
});

// ---- the review page: round 45's period stepper has a label for every week it can reach
describe("the review page: every week of round 45's period stepper has a label", () => {
  test("labels[1] to labels[12] are all words, so pressing 'The week before' never blanks the label", () => {
    const source = fs.readFileSync(path.join(pkg, "..", "..", "tools", "review", "round45.tsx"), "utf8");
    const labels = JSON.parse(/const labels = (\[[^\]]*\]);/.exec(source)?.[1] ?? "null");
    assert.ok(Array.isArray(labels), "the stepper demo's labels are written as an array");
    assert.equal(labels.length, 13, "a label for weeks 1 to 12 (index 0 is no week)");
    for (let week = 1; week <= 12; week++) assert.match(labels[week], /\S/, `week ${week} has a label`);
    assert.equal(new Set(labels.slice(1)).size, 12, "each week's label is its own");
  });
});
