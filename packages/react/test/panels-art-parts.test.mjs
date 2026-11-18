// Panels, art and parts (DECISIONS 162, review round 45): the flat table and its two-line cell, the closing block, captioned columns, the app tile and
// the period stepper. Driven in Chromium against the built package with the real stylesheet.
//
//   flat table        no border, radius, fill, shadow or level of its own; the band keeps its fill; cells padded space-2; a call over what it changes
//   closing block     the stage's second form: no headroom marker, no pull-up, a section gap above and in; its art held still; forced colours and print
//   captioned columns a dl of items in two sizes, the approved values; the count is the app's
//   app tile          the picture clipped to a superellipse, its own clip, a hairline that follows it, the sizes, nothing drawn over it
//   period stepper    the chevrons, the focus at the ends, the whole-span view that moves nothing (0px), the label's seat, spoken once, the row under 640
//
// Behaviour tests load no web font, so text widths differ on CI's Linux runner: measured margins here are wide.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import path from "node:path";
import { pathToFileURL } from "node:url";

import { bundleFixture, fixturePage, launch, pkg } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const { checkHeadroom, measureHeadroom } = await import(pathToFileURL(path.join(pkg, "dist", "testing", "headroom.js")).href);
const THEMES = ["dark", "light"];
const render = (jsx, before = "") => `${before}\ndocument.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";\ncreateRoot(document.getElementById("root")).render(${jsx});`;
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const style = (locator, ...props) => locator.evaluate((el, props) => { const s = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, s[p]])); }, props);
/** A token or a CSS keyword, as the browser resolves it for `color`. */
const resolve = (page, value) => page.evaluate((value) => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, value);
const token = (page, name) => resolve(page, `var(--basalt-${name})`);

async function audit(page) {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run(
    { exclude: [["[data-base-ui-focus-guard]"]] },
    { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
  ));
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join("; ")})`);
}

// ---------------------------------------------------------------------------------------------------------------------
// The flat table (D18b)

const ROWS = [["Ana", "Hold the plan", "Nothing changes this week", "2 days"], ["Bo", "Lower Thursday's load by a third", "A long synthetic reason that must wrap inside its own column and not move any other", "5 days"], ["Cy", "Move the long run", "Saturday to Sunday", "1 day"]];
const QUEUE = (flat = true, rows = ROWS) => `
  <div style={{ width: 640 }}>
    <B.Card data-testid="card"><B.CardContent>
      <B.TableContainer flat={${flat}} label="Queue" data-testid="frame">
        <B.Table columns={[{ width: 88 }, {}, { width: 84 }]} minWidth={280}>
          <B.TableHeader><B.TableRow><B.TableHead>Athlete</B.TableHead><B.TableHead>Draft</B.TableHead><B.TableHead numeric>Waiting</B.TableHead></B.TableRow></B.TableHeader>
          <B.TableBody>{${JSON.stringify(rows)}.map(([who, call, what, wait]) => <B.TableRow key={who}><B.TableCell>{who}</B.TableCell><B.TableCell><B.TableCall call={call} detail={what} /></B.TableCell><B.TableCell numeric>{wait}</B.TableCell></B.TableRow>)}</B.TableBody>
        </B.Table>
      </B.TableContainer>
    </B.CardContent></B.Card>
  </div>`;

describe("the flat table (D18b)", () => {
  for (const theme of THEMES) {
    test(`its frame draws no border, radius, fill or shadow and sets no level; the card is the one box (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(QUEUE()), { theme });
      const frame = await style(page.locator("[data-testid=frame]"), "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopLeftRadius", "backgroundColor", "boxShadow");
      assert.deepEqual([frame.borderTopWidth, frame.borderRightWidth, frame.borderBottomWidth, frame.borderLeftWidth], ["0px", "0px", "0px", "0px"]);
      assert.equal(frame.borderTopLeftRadius, "0px");
      assert.equal(frame.backgroundColor, "rgba(0, 0, 0, 0)");
      assert.equal(frame.boxShadow, "none");
      assert.equal(await page.locator("[data-testid=frame]").getAttribute("data-level"), null, "the flat frame adds no level");
      assert.equal(await page.locator("[data-testid=card]").getAttribute("data-level"), "1");
      const card = await style(page.locator("[data-testid=card]"), "borderTopWidth", "borderTopLeftRadius");
      assert.deepEqual([card.borderTopWidth, card.borderTopLeftRadius], ["1px", "12px"], "the card keeps its one rim and radius");
      // The frame sits inside the card's own padding (space-4), flush with it.
      const c = await box(page.locator("[data-testid=card]"));
      const f = await box(page.locator("[data-testid=frame]"));
      assert.equal(f.x - c.x, 17, "16px padding and the card's 1px rim");
      await page.close();
    });

    test(`the unflat frame is the panel it was: rim, radius 12 and a level of its own (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(QUEUE(false)), { theme });
      const frame = await style(page.locator("[data-testid=frame]"), "borderTopWidth", "borderTopLeftRadius");
      assert.deepEqual([frame.borderTopWidth, frame.borderTopLeftRadius], ["1px", "12px"]);
      assert.equal(await page.locator("[data-testid=frame]").getAttribute("data-level"), "2");
      await page.close();
    });

    test(`the header band keeps its fill; the cells are padded space-2 above and below (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(QUEUE()), { theme });
      assert.equal((await style(page.locator("th").first(), "backgroundColor")).backgroundColor, await token(page, "surface-sunken-strong"));
      const cell = await style(page.locator("tbody td").first(), "paddingTop", "paddingBottom", "paddingLeft", "paddingRight");
      assert.deepEqual([cell.paddingTop, cell.paddingBottom, cell.paddingLeft, cell.paddingRight], ["8px", "8px", "16px", "16px"]);
      await page.close();
    });

    test(`a call is 500 in primary over what changes in 400 in secondary, 2px apart (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(QUEUE()), { theme });
      const call = page.locator(".basalt-table-call").first();
      const main = await style(call.locator(".basalt-table-call-main"), "color", "fontWeight");
      const detail = await style(call.locator(".basalt-table-call-detail"), "color", "fontWeight");
      assert.deepEqual([main.color, main.fontWeight], [await token(page, "text-primary"), "500"]);
      assert.deepEqual([detail.color, detail.fontWeight], [await token(page, "text-secondary"), "400"]);
      const a = await box(call.locator(".basalt-table-call-main"));
      const b = await box(call.locator(".basalt-table-call-detail"));
      assert.equal(b.y - a.bottom, 2);
      await page.close();
    });

    test(`axe finds nothing (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(QUEUE()), { theme });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }

  test("a long reason wraps in its own column: the column widths and the header band do not move (0px)", async () => {
    const short = ROWS.map(([a, b, , d]) => [a, b, "Short", d]);
    const read = async (rows) => {
      const { page } = await fixturePage(browser, render(QUEUE(true, rows)), { theme: "dark" });
      const heads = await page.locator("th").evaluateAll((ths) => ths.map((th) => { const r = th.getBoundingClientRect(); return [r.x, r.y, r.width]; }));
      const rowHeight = await box(page.locator("tbody tr").nth(1));
      await page.close();
      return { heads, rowHeight: rowHeight.height };
    };
    const a = await read(short);
    const b = await read(ROWS);
    assert.deepEqual(b.heads, a.heads, "header positions and widths are the same whatever the cells say");
    assert.ok(b.rowHeight > a.rowHeight, "the row grows to hold the lines; the column does not");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The closing block (D18d, vote 2)

const SKY = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="var(--basalt-art-field)" /><circle cx="50" cy="50" r="3" fill="var(--basalt-art-tone-3)" /></svg>`;
const MARK = (index) => `<B.AmbientMark index={${index}} style={{ left: 40 + ${index} * 20, top: 40 }} />`;
const WITH_CLOSING = `
  <div>
    <B.Stage headroom art={${SKY}} data-testid="top"><div style={{ height: 300, padding: "0 24px" }}><h1 data-quiet="line" style={{ margin: 0 }}>Top</h1></div></B.Stage>
    <main style={{ height: 200 }}><p>Sections</p></main>
    <B.Stage closing art={<>${SKY}</>} data-testid="closing" style={{ ["--basalt-stage-room"]: "40px" }}>
      <div style={{ padding: "0 24px", height: 120 }}><h2 data-quiet="line" style={{ margin: 0 }}>The way in</h2></div>
    </B.Stage>
  </div>`;

describe("the closing block (D18d, vote 2)", () => {
  for (const theme of THEMES) {
    test(`it has no headroom marker and no pull-up; a section gap above and in; art-field behind (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(WITH_CLOSING), { theme, viewport: { width: 1440, height: 900 } });
      const closing = page.locator("[data-testid=closing]");
      assert.equal(await closing.locator("[data-basalt-headroom]").count(), 0);
      assert.equal(await closing.getAttribute("data-headroom"), null, "a closing block is not a declared headroom, so the bar is not changed by it");
      assert.equal(await closing.getAttribute("data-closing"), "");
      const s = await style(closing, "marginTop", "paddingTop", "paddingBottom", "backgroundColor", "borderTopWidth", "borderTopLeftRadius", "boxShadow");
      assert.deepEqual([s.marginTop, s.paddingTop], ["128px", "128px"]);
      assert.equal(s.paddingBottom, "40px", "the bottom padding is the art's room, the app's");
      assert.equal(s.backgroundColor, await token(page, "art-field"));
      assert.deepEqual([s.borderTopWidth, s.borderTopLeftRadius, s.boxShadow], ["0px", "0px", "none"], "level 0: no rim, radius or shadow");
      const c = await box(closing);
      const main = await box(page.locator("main"));
      assert.equal(c.y - main.bottom, 128, "a section gap above, not pulled up under anything");
      assert.equal((await box(closing.locator(".basalt-stage-content"))).y - c.y, 128);
      await page.close();
    });
  }

  test("the section gap steps with the width, as the page's other sections do (96 at 800, 64 at 390)", async () => {
    for (const [width, gap] of [[1440, 128], [800, 96], [390, 64]]) {
      const { page } = await fixturePage(browser, render(WITH_CLOSING), { viewport: { width, height: 900 } });
      const s = await style(page.locator("[data-testid=closing]"), "marginTop", "paddingTop");
      assert.deepEqual([s.marginTop, s.paddingTop], [`${gap}px`, `${gap}px`]);
      await page.close();
    }
  });

  test("its art is behind its content, fills the block, ignores the pointer and is hidden from assistive technology", async () => {
    const { page } = await fixturePage(browser, render(WITH_CLOSING), { viewport: { width: 1440, height: 900 } });
    const closing = page.locator("[data-testid=closing]");
    const art = closing.locator(".basalt-stage-art");
    const a = await style(art, "position", "pointerEvents", "overflow", "zIndex");
    assert.deepEqual([a.position, a.pointerEvents, a.overflow, a.zIndex], ["absolute", "none", "hidden", "-1"]);
    assert.equal(await art.getAttribute("aria-hidden"), "true");
    const c = await box(closing);
    const r = await box(art);
    assert.deepEqual([r.x, r.y, r.width, r.height], [c.x, c.y, c.width, c.height]);
    await page.close();
  });

  test("a mark in its art is held still at full opacity, while the top stage's loops (the page's one loop)", async () => {
    const jsx = `<div>
      <B.Stage headroom art={<>${MARK(0)}</>} data-testid="top"><div style={{ height: 200 }} /></B.Stage>
      <B.Stage closing art={<>${MARK(1)}</>} data-testid="closing"><div style={{ height: 200 }} /></B.Stage>
    </div>`;
    const { page } = await fixturePage(browser, render(jsx), { viewport: { width: 1440, height: 900 } });
    const top = await style(page.locator("[data-testid=top] [data-ambient]"), "animationName", "animationIterationCount");
    const bottom = await style(page.locator("[data-testid=closing] [data-ambient]"), "animationName", "opacity");
    assert.equal(top.animationName, "basalt-ambient");
    assert.equal(top.animationIterationCount, "infinite");
    assert.equal(bottom.animationName, "none");
    assert.equal(bottom.opacity, "1");
    await page.close();
  });

  test("forced colours: the art is not drawn, the block is Canvas and the bottom padding is space-16", async () => {
    const { page } = await fixturePage(browser, render(WITH_CLOSING), { forcedColors: "active", viewport: { width: 1440, height: 900 } });
    const closing = page.locator("[data-testid=closing]");
    assert.equal((await style(closing.locator(".basalt-stage-art"), "display")).display, "none");
    assert.equal((await style(closing, "paddingBottom")).paddingBottom, "64px");
    await page.close();
  });

  test("print: the art is not drawn and the bottom padding is space-16; the block keeps its gaps", async () => {
    const { page } = await fixturePage(browser, render(WITH_CLOSING), { viewport: { width: 1440, height: 900 } });
    await page.emulateMedia({ media: "print" });
    const closing = page.locator("[data-testid=closing]");
    assert.equal((await style(closing.locator(".basalt-stage-art"), "display")).display, "none");
    const s = await style(closing, "paddingBottom", "marginTop", "paddingTop");
    assert.deepEqual([s.paddingBottom, s.marginTop, s.paddingTop], ["64px", "128px", "128px"]);
    await page.close();
  });

  test("a page with only a closing block leaves the site header as it was (smoked, not clear)", async () => {
    const jsx = `<div><B.SiteHeader brand="Acme" brandLabel="Acme home" links={[{ href: "#a", label: "A", current: true }]} /><main style={{ height: 100 }} /><B.Stage closing art={${SKY}} data-testid="closing"><div style={{ height: 100 }} /></B.Stage></div>`;
    const { page } = await fixturePage(browser, render(jsx), { viewport: { width: 1440, height: 900 } });
    assert.equal(await page.evaluate(() => document.querySelector("header.basalt-site-header").getAttribute("data-solid")), null);
    assert.equal(await page.evaluate(() => document.querySelectorAll(".basalt-stage[data-headroom]").length), 0);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds nothing (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(WITH_CLOSING), { theme, viewport: { width: 1440, height: 900 } });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }
});

// The closing block's quiet zones (return 1): at 390 the round's stars were drawn on its headline, because the marks were placed by a percentage of the block's height and the
// words wrap taller on a phone. `checkHeadroom` could not read a closing block at all (it wanted a headroom marker), and the round never ran it. It reads one now, with
// `stage: ".basalt-stage[data-closing]"`: every `data-quiet` zone, grown by space-1-5, and no pixel of art past `art-quiet-limit` in it.
// The marks below are the round's (tools/review/round45.tsx): pixels from the block's top, inside the top padding. The old placement, a percentage of the height, is the control.
const STARS = "[[12, 20], [30, 36], [47, 24], [63, 40], [81, 28], [90, 44]]";
const CLOSING_PAGE = (marks, unit) => `
  const stars = ${marks};
  const sky = (<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="100" fill="var(--basalt-art-field)" /><path d="M0 78 C25 66 45 84 70 72 S92 70 100 76 V100 H0Z" fill="var(--basalt-art-tone-1)" /><path d="M0 90 C20 82 50 94 75 86 S95 84 100 88 V100 H0Z" fill="var(--basalt-art-tone-2)" /></svg>);
  document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
  createRoot(document.getElementById("root")).render(<div><main style={{ height: 80 }} />
    <B.Stage closing art={<>{sky}{stars.map(([x, y], i) => <B.AmbientMark key={i} index={i} style={{ left: x + "%", top: y + "${unit}" }} />)}</>} style={{ ["--basalt-stage-room"]: "48px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16, paddingInline: "var(--basalt-gutter)" }}>
        <h2 data-quiet="line" style={{ margin: 0, font: "var(--basalt-font-weight-semibold) var(--basalt-text-4xl-size) / var(--basalt-text-4xl-line-height) var(--basalt-font-family-sans)" }}>Words in a quiet zone.</h2>
        <p data-quiet="lead" style={{ margin: 0, maxWidth: "var(--basalt-size-prose-width)", color: "var(--basalt-text-secondary)" }}>The closing block is the stage's second form: level 0 on art-field, no headroom and no pull-up. Its art is behind the words and held still.</p>
        <div data-quiet="actions"><B.Button variant="primary">Start</B.Button></div>
      </div>
    </B.Stage></div>);`;
const closingLoader = (body) => async (page, run) => {
  await page.setContent(`<html data-theme="${run.theme}"><head><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")}</style></head><body><div id="root"></div></body></html>`);
  await page.addScriptTag({ content: await bundleFixture(body) });
  await page.evaluate(() => document.fonts.ready);
};

describe("the closing block keeps its art out of its quiet zones (return 1)", () => {
  test("the round's marks are the ones tested", () => {
    assert.ok(fs.readFileSync(new URL("../../../tools/review/round45.tsx", import.meta.url), "utf8").includes(`const dots = ${STARS};`));
  });

  test("checkHeadroom reads a closing block: the three words' zones, at 390, 720 and 1440, in both themes, at 1x and 2x, and no mark is in one", async () => {
    const result = await checkHeadroom(browser, { load: closingLoader(CLOSING_PAGE(STARS, "px")), stage: ".basalt-stage[data-closing]", widths: [390, 720, 1440] });
    assert.equal(result.runs, 12);
    assert.ok(result.checked > 0);
    assert.ok(result.ok, JSON.stringify(result.failures.slice(0, 3), null, 2));
  });

  test("it reads the block's three zones and no headroom zone", async () => {
    const { page } = await fixturePage(browser, CLOSING_PAGE(STARS, "px"), { theme: "dark", viewport: { width: 390, height: 900 } });
    const zones = await measureHeadroom(page, "dark", { stage: ".basalt-stage[data-closing]" });
    assert.deepEqual(zones.map((z) => z.zone), ["line", "lead", "actions"]);
    await page.close();
  });

  test("the control fails: marks placed by a percentage of the block's height land on the words at 390 (what the round drew)", async () => {
    const body = CLOSING_PAGE("[[12, 18], [30, 10], [47, 22], [63, 12], [81, 20], [90, 38]]", "%");
    const result = await checkHeadroom(browser, { load: closingLoader(body), stage: ".basalt-stage[data-closing]", widths: [390], themes: ["dark", "light"], scales: [1] });
    assert.equal(result.ok, false, "the check sees stars inside a quiet zone");
    assert.ok(result.failures.every((f) => ["line", "lead", "actions"].includes(f.zone)));
  });

  test("a closing block with no quiet zone is refused (nothing would be read)", async () => {
    const bare = `createRoot(document.getElementById("root")).render(<B.Stage closing art={null}><p>No zone.</p></B.Stage>);`;
    await assert.rejects(checkHeadroom(browser, { load: closingLoader(bare), stage: ".basalt-stage[data-closing]", widths: [390], themes: ["dark"], scales: [1] }), /no data-quiet zone/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Captioned columns (D18d, vote 4)

const COLUMNS = (props) => `<div style={{ width: 960 }}><B.CaptionedColumns data-testid="list" ${props}>
  <B.CaptionedColumn head="First">A synthetic sentence that says what follows from the first claim.</B.CaptionedColumn>
  <B.CaptionedColumn head="Second">A second synthetic sentence.</B.CaptionedColumn>
  <B.CaptionedColumn head="Third">A third synthetic sentence that is a little longer than the others are.</B.CaptionedColumn>
  <B.CaptionedColumn head="Fourth">A fourth one.</B.CaptionedColumn>
</B.CaptionedColumns></div>`;

describe("captioned columns (D18d, vote 4)", () => {
  test("a description list: one dt and one dd in each item", async () => {
    const { page } = await fixturePage(browser, render(COLUMNS('size="large" columns={3}')));
    const shape = await page.locator("[data-testid=list]").evaluate((dl) => ({ tag: dl.tagName, items: [...dl.children].map((i) => [i.tagName, ...[...i.children].map((c) => c.tagName)]) }));
    assert.equal(shape.tag, "DL");
    assert.deepEqual(shape.items, Array(4).fill(["DIV", "DT", "DD"]));
    await page.close();
  });

  for (const theme of THEMES) {
    test(`large: a divider on top of each item, space-6 above and below, text-xl 600 over text-md 400, space-3 apart (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(COLUMNS('size="large" columns={3}')), { theme });
      const item = page.locator(".basalt-captioned-item").first();
      const i = await style(item, "paddingTop", "paddingBottom", "borderTopWidth", "borderTopColor");
      assert.deepEqual([i.paddingTop, i.paddingBottom, i.borderTopWidth], ["24px", "24px", "1px"]);
      assert.equal(i.borderTopColor, await resolve(page, "var(--basalt-border-divider)"));
      const head = await style(item.locator("dt"), "fontSize", "fontWeight", "color", "lineHeight", "letterSpacing");
      assert.deepEqual([head.fontSize, head.fontWeight, head.color, head.lineHeight], ["20px", "600", await token(page, "text-primary"), "28px"]);
      const body = await style(item.locator("dd"), "fontSize", "fontWeight", "color", "lineHeight");
      assert.deepEqual([body.fontSize, body.fontWeight, body.color, body.lineHeight], ["16px", "400", await token(page, "text-secondary"), "24px"]);
      const a = await box(item.locator("dt"));
      const b = await box(item.locator("dd"));
      assert.equal(b.y - a.bottom, 12);
      assert.equal((await style(page.locator("[data-testid=list]"), "borderTopWidth")).borderTopWidth, "0px", "the large list has no rule of its own");
      await page.close();
    });

    test(`small: one rule over the list, space-5 under it, space-6 between rows, text-base 500 over text-base 400, space-1 apart (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(COLUMNS('size="small" columns={2}')), { theme });
      const list = await style(page.locator("[data-testid=list]"), "borderTopWidth", "paddingTop", "rowGap", "columnGap", "borderTopColor");
      assert.deepEqual([list.borderTopWidth, list.paddingTop, list.rowGap, list.columnGap], ["1px", "20px", "24px", "24px"]);
      assert.equal(list.borderTopColor, await resolve(page, "var(--basalt-border-divider)"));
      const item = page.locator(".basalt-captioned-item").first();
      assert.equal((await style(item, "borderTopWidth", "paddingTop")).borderTopWidth, "0px", "an item has no rule of its own");
      const head = await style(item.locator("dt"), "fontSize", "fontWeight", "color", "lineHeight");
      assert.deepEqual([head.fontSize, head.fontWeight, head.color, head.lineHeight], ["14px", "500", await token(page, "text-primary"), "20px"]);
      const body = await style(item.locator("dd"), "fontSize", "fontWeight", "color", "lineHeight");
      assert.deepEqual([body.fontSize, body.fontWeight, body.color, body.lineHeight], ["14px", "400", await token(page, "text-secondary"), "20px"]);
      const a = await box(item.locator("dt"));
      const b = await box(item.locator("dd"));
      assert.equal(b.y - a.bottom, 4);
      await page.close();
    });

    test(`axe finds nothing (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(COLUMNS('size="large" columns={2}')), { theme });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }

  test("the app's count sets the columns, equal, a size-gutter (24px) apart: 1, 2, 3 and 4", async () => {
    for (const columns of [1, 2, 3, 4]) {
      const { page } = await fixturePage(browser, render(COLUMNS(`size="large" columns={${columns}}`)));
      const lefts = await page.locator(".basalt-captioned-item").evaluateAll((items) => items.map((i) => { const r = i.getBoundingClientRect(); return [Math.round(r.x * 100) / 100, Math.round(r.width * 100) / 100]; }));
      assert.equal(new Set(lefts.map(([x]) => x)).size, columns, `${columns} columns: ${JSON.stringify(lefts)}`);
      const width = (960 - 24 * (columns - 1)) / columns;
      assert.ok(Math.abs(lefts[0][1] - width) < 0.02, `each column is ${width}px, not ${lefts[0][1]}`);
      if (columns > 1) assert.ok(Math.abs(lefts[1][0] - lefts[0][0] - width - 24) < 0.02, "the gutter is 24px");
      await page.close();
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The app tile (D19a, votes 5 and 6)

// A plain synthetic picture: a flat colour, so the clip shows as where the colour stops.
const SQUARE = (color) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${color}"/></svg>`)}`;
const TILES = [20, 32, 36, 40, 44, 48, 52];

describe("the app tile (D19a)", () => {
  for (const theme of THEMES) {
    test(`it is hidden from assistive technology, a square of each size, with no shadow and no radius (${theme})`, async () => {
      const jsx = `<div style={{ display: "flex", gap: 12 }}>{${JSON.stringify(TILES)}.map((s) => <B.AppTile key={s} size={s} src={${JSON.stringify(SQUARE("#c33"))}} data-testid={"t" + s} />)}</div>`;
      const { page } = await fixturePage(browser, render(jsx), { theme });
      for (const size of TILES) {
        const t = page.locator(`[data-testid=t${size}]`);
        const b = await box(t);
        assert.deepEqual([b.width, b.height], [size, size], `${size}px tile`);
        const s = await style(t, "boxShadow", "borderTopLeftRadius", "userSelect");
        assert.deepEqual([s.boxShadow, s.borderTopLeftRadius, s.userSelect], ["none", "0px", "none"]);
        assert.equal(await t.getAttribute("aria-hidden"), "true");
        const img = t.locator("img");
        assert.equal(await img.getAttribute("alt"), "");
        assert.equal(await img.getAttribute("draggable"), "false");
      }
      await page.close();
    });

    test(`the picture is clipped to a superellipse and the hairline follows it, half a pixel outside (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ padding: 20 }}><B.AppTile size={52} src={${JSON.stringify(SQUARE("#c33"))}} data-testid="t" /></div>`), { theme });
      await page.waitForFunction(() => document.querySelector("[data-testid=t] img").complete);
      const t = page.locator("[data-testid=t]");
      const rim = await t.locator(".basalt-app-tile-rim").evaluate((svg) => { const r = svg.getBoundingClientRect(); const tile = svg.parentElement.getBoundingClientRect(); const s = getComputedStyle(svg.querySelector("path")); return { dx: tile.x - r.x, dw: r.width - tile.width, stroke: s.stroke, width: s.strokeWidth, fill: s.fill, effect: s.vectorEffect, points: (svg.querySelector("path").getAttribute("d").match(/L/g) ?? []).length + 1 }; });
      assert.deepEqual([rim.dx, rim.dw, rim.width, rim.fill, rim.effect, rim.points], [0.5, 1, "1px", "none", "non-scaling-stroke", 120]);
      assert.equal(rim.stroke, await token(page, "border-hairline"));
      // The clip: the corner is outside the shape and the middle of each edge is inside it (|x|^5 + |y|^5 < 1).
      const shot = await t.screenshot();
      const lit = await page.evaluate(async (data) => {
        const img = new Image();
        img.src = data;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const at = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
        return { corner: at(2, 2), edge: at(26, 3), centre: at(26, 26), nearCorner: at(7, 7) };
      }, `data:image/png;base64,${shot.toString("base64")}`);
      const isPicture = (p) => p[0] > 150 && p[1] < 90 && p[2] < 90;
      assert.equal(isPicture(lit.centre), true, "the picture shows in the middle");
      assert.equal(isPicture(lit.edge), true, "and at the middle of an edge, where a superellipse is nearly flat");
      assert.equal(isPicture(lit.corner), false, "the corner is clipped away");
      assert.equal(isPicture(lit.nearCorner), true, "the shape's corner is continuous: a point inside |x|^5 + |y|^5 = 1 near it is picture");
      await page.close();
    });
  }

  test("every tile carries its own clip: two tiles have two ids, and no page-level definitions are needed", async () => {
    const jsx = `<div><B.AppTile size={40} src={${JSON.stringify(SQUARE("#c33"))}} /><B.AppTile size={40} src={${JSON.stringify(SQUARE("#33c"))}} /></div>`;
    const { page } = await fixturePage(browser, render(jsx));
    const ids = await page.evaluate(() => [...document.querySelectorAll(".basalt-app-tile")].map((tile) => ({ clip: tile.querySelector("clipPath").id, ref: tile.querySelector("img").style.clipPath })));
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0].clip, ids[1].clip);
    for (const { clip, ref } of ids) assert.equal(ref, `url("#${clip}")`);
    assert.equal(await page.evaluate(() => document.querySelectorAll(".tile-defs, #tile-clip").length), 0);
    await page.close();
  });

  test("with no size it is as wide as its box and square; the parent sets it", async () => {
    const { page } = await fixturePage(browser, render(`<div style={{ width: 44 }}><B.AppTile src={${JSON.stringify(SQUARE("#c33"))}} data-testid="t" /></div>`));
    const b = await box(page.locator("[data-testid=t]"));
    assert.deepEqual([b.width, b.height], [44, 44]);
    await page.close();
  });

  test("its box is reserved before the picture arrives and does not move when it fails (0px)", async () => {
    const jsx = `<div style={{ display: "flex", gap: 8, alignItems: "center" }}><B.AppTile size={48} src="data:image/png;base64,AAAA" data-testid="t" /><span data-testid="name">Synthetic company</span></div>`;
    const { page } = await fixturePage(browser, render(jsx));
    const before = [await box(page.locator("[data-testid=t]")), await box(page.locator("[data-testid=name]"))];
    await page.waitForFunction(() => document.querySelector("[data-testid=t] img").complete);
    const after = [await box(page.locator("[data-testid=t]")), await box(page.locator("[data-testid=name]"))];
    assert.deepEqual(after, before);
    assert.equal(before[0].width, 48);
    await page.close();
  });

  test("forced colours: it is not drawn; the name beside it carries the meaning", async () => {
    const { page } = await fixturePage(browser, render(`<div><B.AppTile size={40} src={${JSON.stringify(SQUARE("#c33"))}} data-testid="t" /><span>Synthetic company</span></div>`), { forcedColors: "active" });
    assert.equal((await style(page.locator("[data-testid=t]"), "display")).display, "none");
    await page.close();
  });

  test("the rest of the page's pixels are unchanged by it: a tile draws nothing outside its box but the hairline's half pixel", async () => {
    const { page } = await fixturePage(browser, render(`<div style={{ padding: 20 }}><B.AppTile size={40} src={${JSON.stringify(SQUARE("#c33"))}} data-testid="t" /></div>`));
    const b = await box(page.locator("[data-testid=t]"));
    const outside = await page.evaluate(([x, y, w, h]) => {
      const clip = [];
      for (const el of document.querySelectorAll("[data-testid=t] img, [data-testid=t] .basalt-app-tile-rim")) { const r = el.getBoundingClientRect(); clip.push([r.x - x, r.y - y, r.right - (x + w), r.bottom - (y + h)]); }
      return clip;
    }, [b.x, b.y, b.width, b.height]);
    for (const [l, t, r, bo] of outside) assert.ok(l >= -0.5 && t >= -0.5 && r <= 0.5 && bo <= 0.5, `an element reaches ${[l, t, r, bo]}`);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds nothing, beside the company's name (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ display: "flex", gap: 8, alignItems: "center" }}><B.AppTile size={32} src={${JSON.stringify(SQUARE("#888"))}} /><span>Synthetic company</span></div>`), { theme });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// The period stepper (D19b)

const STEPPER = (props = "") => `<B.PeriodStepper data-testid="s" label="28 Sept to 4 Oct" spokenPrefix="Week 8, build, " previousLabel="The week before" nextLabel="The week after" ${props} />`;
const BAR = (width, props = "") => `<div style={{ width: ${width}, containerType: "inline-size" }}><div data-testid="bar" style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", justifyContent: "space-between", minHeight: 56 }}><div data-testid="tabs" style={{ alignSelf: "center" }}>Tabs</div>${STEPPER(props)}</div></div>`;

describe("the period stepper (D19b)", () => {
  for (const theme of THEMES) {
    test(`two named ghost icon buttons round a label: the core chevrons, 32px, space-1 apart (${theme})`, async () => {
      const jsx = `<div><div id="a">${STEPPER()}</div><div id="b"><B.Pagination page={3} pageCount={9} onPageChange={() => {}} /></div></div>`;
      const { page } = await fixturePage(browser, render(jsx), { theme });
      const buttons = page.locator("[data-testid=s] button");
      assert.deepEqual(await buttons.evaluateAll((all) => all.map((b) => b.getAttribute("aria-label"))), ["The week before", "The week after"]);
      assert.equal(await page.locator("[data-testid=s]").getAttribute("role"), "group");
      const b0 = await box(buttons.nth(0));
      const b1 = await box(buttons.nth(1));
      assert.deepEqual([b0.width, b0.height, b1.width, b1.height], [32, 32, 32, 32]);
      const label = await box(page.locator(".basalt-period-label"));
      assert.equal(label.x - b0.right, 4);
      assert.equal(b1.x - label.right, 4);
      // The glyphs are the ones Pagination draws for previous and next.
      const paths = await page.evaluate(() => {
        const d = (root, name) => root.querySelector(`[aria-label="${name}"] svg`)?.innerHTML;
        return { left: d(document.getElementById("a"), "The week before"), right: d(document.getElementById("a"), "The week after"), pageLeft: d(document.getElementById("b"), "Previous page"), pageRight: d(document.getElementById("b"), "Next page") };
      });
      assert.equal(paths.left, paths.pageLeft);
      assert.equal(paths.right, paths.pageRight);
      await page.close();
    });

    test(`the label is 500 at text-base in primary, tabular, on one line, centred, in a seat of at least 128px (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(STEPPER()), { theme });
      const label = page.locator(".basalt-period-label");
      const s = await style(label, "fontSize", "fontWeight", "lineHeight", "color", "textAlign", "whiteSpace", "fontVariantNumeric", "minWidth");
      assert.deepEqual([s.fontSize, s.fontWeight, s.lineHeight, s.color, s.textAlign, s.whiteSpace, s.minWidth], ["14px", "500", "20px", await token(page, "text-primary"), "center", "nowrap", "128px"]);
      assert.match(s.fontVariantNumeric, /tabular-nums/);
      assert.ok((await box(label)).width >= 128);
      await page.close();
    });

    test(`axe finds nothing, with the buttons stopped and with the whole span (${theme})`, async () => {
      for (const props of ["", "atStart", "atEnd", "whole"]) {
        const { page } = await fixturePage(browser, render(STEPPER(props)), { theme });
        assert.deepEqual(await audit(page), [], props);
        await page.close();
      }
    });
  }

  test("at the first or last period the button stops but keeps focus, with aria-disabled and no click", async () => {
    const jsx = `(() => { function App() { const [n, setN] = React.useState(0); const [at, setAt] = React.useState(false); return <div><B.PeriodStepper data-testid="s" label={"Week " + n} previousLabel="The week before" nextLabel="The week after" atEnd={at} onNext={() => { setN((v) => v + 1); setAt(true); }} /><output data-testid="n">{n}</output></div>; } return <App />; })()`;
    const { page } = await fixturePage(browser, render(jsx));
    const next = page.getByRole("button", { name: "The week after" });
    await next.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("[data-testid=n]").textContent(), "1");
    assert.equal(await next.getAttribute("aria-disabled"), "true");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "The week after", "focus is not dropped at the last period");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("[data-testid=n]").textContent(), "1", "a stopped button does not act");
    await page.close();
  });

  test("the whole-span view hides both buttons and keeps their room: nothing moves, 0px", async () => {
    const read = async (props, label) => {
      const { page } = await fixturePage(browser, render(`<B.PeriodStepper data-testid="s" label="${label}" previousLabel="The week before" nextLabel="The week after" ${props} />`));
      const boxes = await page.locator("[data-testid=s] button, .basalt-period-label").evaluateAll((all) => all.map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
      const visibility = await page.locator("[data-testid=s] button").evaluateAll((all) => all.map((b) => getComputedStyle(b).visibility));
      const focusable = await page.evaluate(() => { const b = document.querySelector("[data-testid=s] button"); b.focus(); return document.activeElement === b; });
      await page.close();
      return { boxes, visibility, focusable };
    };
    const week = await read("", "28 Sept to 4 Oct");
    const whole = await read("whole", "17 Aug to 8 Nov");
    assert.deepEqual(whole.visibility, ["hidden", "hidden"]);
    assert.deepEqual(week.visibility, ["visible", "visible"]);
    assert.equal(whole.focusable, false, "hidden buttons are not in the tab order");
    assert.deepEqual(whole.boxes, week.boxes, "the buttons and the label's seat are where they were");
  });

  test("it is spoken once, after the period settles: six presses in a second say the last, once", async () => {
    const jsx = `(() => { function App() { const [n, setN] = React.useState(1); return <div><B.PeriodStepper data-testid="s" label={"Week " + n} spokenPrefix="Spoken: " previousLabel="The week before" nextLabel="The week after" onNext={() => setN((v) => v + 1)} /></div>; } return <App />; })()`;
    const { page } = await fixturePage(browser, render(jsx), { clock: true });
    const status = page.locator("[data-testid=s] [role=status]");
    assert.equal(await status.getAttribute("aria-live"), "polite");
    assert.equal(await status.getAttribute("aria-atomic"), "true");
    await page.evaluate(() => { window.__said = []; new MutationObserver(() => window.__said.push(document.querySelector("[data-testid=s] [role=status]").textContent)).observe(document.querySelector("[data-testid=s] [role=status]"), { childList: true, characterData: true, subtree: true }); });
    await page.clock.runFor(500);
    for (let i = 0; i < 5; i += 1) { await page.getByRole("button", { name: "The week after" }).click(); await page.clock.runFor(100); }
    assert.deepEqual(await page.evaluate(() => window.__said), [], "nothing is said while the label is still changing");
    await page.clock.runFor(500);
    assert.deepEqual(await page.evaluate(() => window.__said), ["Spoken: Week 6"], "the last period, once, with its prefix");
    assert.equal(await page.locator("[data-testid=s] .basalt-period-label > span[aria-hidden]").textContent(), "Week 6", "the prefix is spoken and never drawn");
    await page.close();
  });

  test("narrower than 640px of the app's container it takes its own row: full width, buttons at the ends, 52px, a divider line above, buttons 44 by 44", async () => {
    for (const theme of THEMES) {
      const { page } = await fixturePage(browser, render(BAR(390)), { theme, viewport: { width: 390, height: 800 } });
      const s = page.locator("[data-testid=s]");
      const bar = await box(page.locator("[data-testid=bar]"));
      const b = await box(s);
      assert.equal(b.width, bar.width, "full width");
      assert.ok(b.height >= 52 && b.height < 53, `52px tall, not ${b.height}`);
      const tabs = await box(page.locator("[data-testid=tabs]"));
      assert.ok(b.y >= tabs.bottom, "under the tabs, on its own row");
      const st = await style(s, "justifyContent", "borderTopWidth", "borderTopColor", "paddingLeft");
      assert.deepEqual([st.justifyContent, st.borderTopWidth, st.paddingLeft], ["space-between", "1px", "8px"]);
      assert.equal(st.borderTopColor, await token(page, "border-divider"), "the narrow row's line is a divider (DECISIONS 167, Q9a)");
      const first = await box(s.locator("button").first());
      const last = await box(s.locator("button").last());
      assert.ok(first.width >= 44 && first.height >= 44 && last.width >= 44 && last.height >= 44);
      assert.equal(first.x - b.x, 8, "the first button is a padding from the start");
      assert.equal(b.right - last.right, 8);
      await page.close();
    }
  });

  test("from 640px it is inline beside the tabs: no rule, no extra width; the form changes at 639 and 640", async () => {
    for (const [width, row] of [[639, true], [640, false], [700, false]]) {
      const { page } = await fixturePage(browser, render(BAR(width)), { viewport: { width: 1000, height: 800 } });
      const s = page.locator("[data-testid=s]");
      const st = await style(s, "borderTopWidth", "flexGrow");
      assert.equal(st.borderTopWidth === "1px", row, `${width}px`);
      if (!row) assert.ok((await box(s)).width < 260, "inline: the width of its content");
      await page.close();
    }
  });

  test("on a touch screen the buttons are at least 44 by 44 in both forms", async () => {
    for (const width of [390, 800]) {
      const { page } = await fixturePage(browser, render(BAR(width)), { hasTouch: true, isMobile: true, viewport: { width: Math.max(width, 500), height: 800 } });
      for (const button of await page.locator("[data-testid=s] button").all()) {
        const b = await box(button);
        assert.ok(b.width >= 44 && b.height >= 44, `${width}: ${b.width} by ${b.height}`);
      }
      await page.close();
    }
  });
});
