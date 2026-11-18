// Links and rows (DECISIONS 152; D5a link card and tile, D5b directory and big link rows, D5c arrow link and back link, D6 show all,
// X8 copy button with words). Driven in Chromium against the built package with the real stylesheet. The fixtures load no web font, so
// text widths differ from a Mac's on CI's Linux runner: every measured margin here is wider than a fallback font's width, and a position is
// compared with itself. Nothing here waits a wall-clock time inside a transition: a test waits for the state itself (`data-settled`, a
// finished transition), or runs a frozen clock.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, colorScheme: theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (page, selector, property, n = 0) => page.locator(selector).nth(n).evaluate((el, p) => getComputedStyle(el)[p], property);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.evaluate((source) => (0, eval)(source), axeSource); // a frozen clock stalls addScriptTag, which waits on the page
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
/** The translation's x, in px, of an element's transform. */
const travel = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const m = getComputedStyle(el).transform; return m === "none" ? 0 : new DOMMatrix(m).m41; });
/** A colour resolved to rgb by the browser, from any CSS colour. */
const resolve = (page, value) => page.evaluate((v) => { const probe = document.createElement("div"); document.body.append(probe); probe.style.color = v; const c = getComputedStyle(probe).color; probe.remove(); return c; }, value);

const ART = `<svg width="100%" height="100%" viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true"><rect width="10" height="10" fill="currentColor" opacity="0.2"/></svg>`;
const SHELL = (body, style = "") => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)"; createRoot(document.getElementById("root")).render(<main style={{ padding: 24, boxSizing: "border-box", ${style} }}>${body}</main>);`;
// The two reference glyphs, drawn by the package, to compare what a link draws with.
const REFS = `<span style={{ position: "absolute", left: -999 }}><span id="ref-right"><B.Icon icon={B.ArrowRightGlyph} size={16} /></span><span id="ref-left"><B.Icon icon={B.ArrowLeftGlyph} size={16} /></span><span id="ref-external"><B.Icon icon={B.ExternalGlyph} size={16} /></span></span>`;
const drawing = (page, selector) => page.locator(selector).first().evaluate((el) => el.querySelector("svg").innerHTML);

// ---- the link card (D5a)
const CARD = `<ul style={{ listStyle: "none", margin: 0, padding: 0, width: 640 }}>
  <li><B.LinkCard id="card" href="#alpha" title="Alpha works" media={${ART}} description="A short synthetic sentence about it." state="2026" style={{ "--_basalt-link-card-media-height": "160px" } as React.CSSProperties} /></li>
  <li style={{ marginTop: 48 }}><B.LinkCard id="card-new" href="https://example.invalid/beta" target="_blank" title="Beta works" description="Another synthetic sentence." state="2025" /></li>
</ul>${REFS}`;

describe("LinkCard (D5a)", () => {
  test("the whole card is one link holding a real heading, a sentence and a state; its arrow is the core right arrow, 24px and 20 under 720", async () => {
    const page = await open(SHELL(CARD));
    assert.equal(await page.locator("a#card").count(), 1);
    assert.equal(await page.locator("a#card h3").count(), 1, "the heading is a real heading inside the link");
    assert.equal(await page.locator("a#card .basalt-link-card-top > h3").evaluate((el) => el.tagName), "H3");
    assert.equal(await page.locator("#card .basalt-external").count(), 0, "a same-tab card never draws the new-tab arrow");
    assert.equal(await drawing(page, "#card .basalt-go-arrow"), await drawing(page, "#ref-right"), "the arrow is the core right arrow, not up-right");
    near((await box(page, "#card .basalt-go-arrow svg")).w, 24, "arrow at 1440");
    assert.match(await css(page, "#card .basalt-link-card-state", "fontVariantNumeric"), /tabular-nums/);
    assert.equal(await css(page, "#card", "borderTopWidth"), "0px", "no rim");
    assert.equal(await css(page, "#card", "boxShadow"), "none", "no level, no shadow");
    near((await box(page, "#card .basalt-link-card-media")).h, 160, "the window is the app's height");
    await page.setViewportSize({ width: 390, height: 900 });
    near((await box(page, "#card .basalt-go-arrow svg")).w, 20, "arrow under 720");
    // Under 720 the foot stacks: the state is under the sentence, not beside it.
    const what = await box(page, "#card .basalt-link-card-what"), state = await box(page, "#card .basalt-link-card-state");
    assert.ok(state.y >= what.bottom - 1, "the state stacks under the sentence on a phone");
    await page.close();
  });

  for (const theme of THEMES) test(`hover and focus lift the sentence and arrow to primary and the arrow travels 2px; nothing else moves (${theme})`, async () => {
    const page = await open(SHELL(CARD), { theme });
    const primary = await resolve(page, "var(--basalt-text-primary)"), secondary = await resolve(page, "var(--basalt-text-secondary)");
    const before = { card: await box(page, "#card"), title: await box(page, "#card h3"), what: await box(page, "#card .basalt-link-card-what"), state: await box(page, "#card .basalt-link-card-state") };
    assert.equal(await css(page, "#card .basalt-link-card-what", "color"), secondary);
    assert.equal(await css(page, "#card .basalt-go-arrow", "color"), secondary, "the arrow is secondary at rest");
    assert.equal(await travel(page, "#card .basalt-go-arrow"), 0);
    await page.locator("#card").hover();
    await settle(page);
    assert.equal(await css(page, "#card .basalt-link-card-what", "color"), primary);
    assert.equal(await css(page, "#card .basalt-go-arrow", "color"), primary);
    near(await travel(page, "#card .basalt-go-arrow"), 2, "the arrow travels 2px in its own direction");
    assert.equal(await css(page, "#card .basalt-link-card-state", "color"), secondary, "the state stays secondary");
    assert.equal(await css(page, "#card", "backgroundColor"), "rgba(0, 0, 0, 0)", "no wash");
    assert.equal(await css(page, "#card .basalt-link-card-media svg", "transform"), "none", "the picture does not lift");
    const after = { card: await box(page, "#card"), title: await box(page, "#card h3"), what: await box(page, "#card .basalt-link-card-what"), state: await box(page, "#card .basalt-link-card-state") };
    assert.deepEqual(after, before, "0px moves on hover");
    // The keyboard gets the same, with the control ring at +2.
    await page.mouse.move(0, 0);
    await settle(page);
    await page.keyboard.press("Tab");
    await settle(page);
    assert.equal(await css(page, "#card", "outlineWidth"), "2px");
    assert.equal(await css(page, "#card", "outlineOffset"), "2px");
    assert.equal(await css(page, "#card", "outlineColor"), await resolve(page, "var(--basalt-border-focus)"));
    near(await travel(page, "#card .basalt-go-arrow"), 2, "focus moves it as hover does");
    assert.equal(await css(page, "#card .basalt-link-card-what", "color"), primary);
    await page.close();
  });

  test("under reduced motion the arrow stays where it is and the ink still lifts", async () => {
    const page = await open(SHELL(CARD), { reducedMotion: "reduce" });
    await page.locator("#card").hover();
    await settle(page);
    assert.equal(await travel(page, "#card .basalt-go-arrow"), 0);
    assert.equal(await css(page, "#card .basalt-link-card-what", "color"), await resolve(page, "var(--basalt-text-primary)"));
    await page.close();
  });

  test("in a right-to-left page the arrow points the other way and travels the other way", async () => {
    const page = await open(`document.documentElement.dir = "rtl"; ${SHELL(CARD)}`);
    await page.locator("#card").hover();
    await settle(page);
    near(await travel(page, "#card .basalt-go-arrow"), -2, "toward the start");
    assert.match(await css(page, "#card .basalt-go-arrow svg", "transform"), /matrix\(-1/, "the glyph is turned");
    await page.close();
  });

  test("a card that opens a new tab draws the new-tab arrow instead, never both, and says so in its name", async () => {
    const page = await open(SHELL(CARD));
    assert.equal(await page.locator("#card-new .basalt-go-arrow").count(), 0);
    assert.equal(await drawing(page, "#card-new .basalt-external"), await drawing(page, "#ref-external"));
    assert.match(await page.locator("#card-new").getAttribute("rel"), /noopener/);
    assert.match(await page.getByRole("link", { name: /Beta works/ }).innerText(), /opens in a new tab/);
    await page.close();
  });

  for (const [width, theme] of [[1440, "dark"], [1440, "light"], [390, "dark"], [390, "light"]]) test(`no accessibility violations at ${width}px (${theme})`, async () => {
    const page = await open(SHELL(CARD), { width, theme });
    assert.deepEqual(await axe(page), []);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("forced colours: the arrow takes the link's own colour", async () => {
    const page = await open(SHELL(CARD), { forcedColors: "active" });
    assert.equal(await css(page, "#card .basalt-go-arrow", "color"), await css(page, "#card", "color"));
    await page.close();
  });
});

// ---- the tile (D5a)
const TILE = `<ul style={{ listStyle: "none", margin: 0, padding: 0, width: 320 }}>
  <li><B.LinkTile id="tile" href="#one" media={${ART}} brand="Synthetic maker" title="Synthetic product" details="500 g · 3 flavours" foot={<><span id="price">£12.00</span><B.Button id="add" size="lg">Add</B.Button></>} /></li>
  <li style={{ marginTop: 24 }}><B.LinkTile id="tile-bare" href="#two" media={${ART}} title="Another product" /></li>
</ul>`;

describe("LinkTile (D5a)", () => {
  test("a link round a picture, a brand, a heading and details, with the foot outside it; radius 6", async () => {
    const page = await open(SHELL(TILE));
    assert.equal(await page.locator("a#tile.basalt-link-tile-link").count(), 1);
    assert.equal(await page.locator("#tile #add").count(), 0, "a link cannot hold a button: the foot is outside it");
    assert.equal(await page.locator("#tile ~ .basalt-link-tile-foot #add").count(), 1);
    assert.equal(await page.locator("#tile h3").count(), 1, "the name is a heading, not a span");
    assert.equal(await css(page, "#tile", "borderTopLeftRadius"), "6px");
    assert.equal(await css(page, "#tile .basalt-link-tile-title", "fontWeight"), "500");
    assert.equal(await css(page, "#tile .basalt-link-tile-title", "fontSize"), "16px");
    assert.equal(await css(page, "#tile .basalt-link-tile-brand", "fontSize"), "13px");
    assert.equal(await css(page, "#tile .basalt-link-tile-brand", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    assert.equal(await css(page, "#tile .basalt-link-tile-details", "color"), await resolve(page, "var(--basalt-text-tertiary)"));
    // Picture to text is space-3 (12px); lines are space-0-5 (2px) apart; with no brand the name sits space-3 under the picture.
    const media = await box(page, "#tile .basalt-link-tile-media"), brand = await box(page, "#tile .basalt-link-tile-brand"), title = await box(page, "#tile h3"), details = await box(page, "#tile .basalt-link-tile-details");
    near(brand.y - media.bottom, 12, "picture to brand");
    near(title.y - brand.bottom, 2, "brand to name");
    near(details.y - title.bottom, 2, "name to details");
    const bare = { media: await box(page, "#tile-bare .basalt-link-tile-media"), title: await box(page, "#tile-bare h3") };
    near(bare.title.y - bare.media.bottom, 12, "no brand: picture to name");
    await page.close();
  });

  test("hover underlines the name (1px, offset 3px) and nothing moves: the picture does not lift", async () => {
    const page = await open(SHELL(TILE));
    const before = { tile: await box(page, ".basalt-link-tile"), title: await box(page, "#tile h3"), media: await box(page, "#tile .basalt-link-tile-media svg") };
    assert.equal(await css(page, "#tile h3", "textDecorationLine"), "none");
    await page.locator("#tile").hover();
    await settle(page);
    assert.match(await css(page, "#tile h3", "textDecorationLine"), /underline/);
    assert.equal(await css(page, "#tile h3", "textUnderlineOffset"), "3px");
    assert.equal(await css(page, "#tile h3", "textDecorationThickness"), "1px");
    assert.equal(await css(page, "#tile .basalt-link-tile-media svg", "transform"), "none");
    assert.deepEqual({ tile: await box(page, ".basalt-link-tile"), title: await box(page, "#tile h3"), media: await box(page, "#tile .basalt-link-tile-media svg") }, before, "0px moves");
    await page.keyboard.press("Tab");
    assert.equal(await css(page, "#tile", "outlineOffset"), "2px", "the ring is at +2, outside the link");
    await page.close();
  });

  for (const theme of THEMES) test(`no accessibility violations (${theme})`, async () => {
    const page = await open(SHELL(TILE), { theme });
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- consent row 7: Castle's colour steps are duration-fast; an arrow's travel is duration-base
describe("The arrow's transitions (DECISIONS 152, consent row 7)", () => {
  const transition = (page, selector) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction]; });
  test("the arrow link's and the big row's arrow step colour over 100ms and travel over 150ms, both on ease-out; the card's and the directory's keep 150ms for both", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<main style={{ padding: 24, width: 720 }}>
      <B.Link id="go" href="#a" arrow="end">All brands</B.Link>
      <B.BigLinkList aria-label="Shop"><B.BigLinkRow id="big" href="#b">Alpha goods</B.BigLinkRow></B.BigLinkList>
      <B.LinkCard id="card" href="#c" title="Alpha" description="A sentence." state="2026" />
      <B.DirectoryList title="Work"><B.DirectoryRow id="row" href="#d" name="Alpha" description="A sentence." state="2026" /></B.DirectoryList>
    </main>);`);
    const ease = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-ease-out").trim());
    for (const id of ["go", "big"]) {
      const [property, duration, timing] = await transition(page, `#${id} .basalt-go-arrow`);
      assert.equal(property, "color, transform", `${id}: what steps`);
      assert.equal(duration, "0.1s, 0.15s", `${id}: colour 100ms, travel 150ms`);
      assert.equal(timing, `${ease}, ${ease}`);
    }
    for (const id of ["card", "row"]) assert.equal((await transition(page, `#${id} .basalt-go-arrow`))[1], "0.15s, 0.15s", `${id}: both 150ms`);
    await page.close();
  });
});

// ---- the directory and show all (D5b, D6)
const ROWS = Array.from({ length: 12 }, (_, i) => `<B.DirectoryRow key={${i}} id="row${i}" href="#r${i}" name="Name ${i + 1}" description="A synthetic sentence about row ${i + 1}, long enough to be a line of words." state="${2015 + i}" />`).join("");
const DIR = (props = `shown={4}`) => `<div style={{ width: 960 }}><B.DirectoryList id="dir" title="Client work and other projects" ${props}>${ROWS}</B.DirectoryList><p id="after">Under the list.</p></div>${REFS}`;
const settled = (page) => page.waitForSelector("#dir[data-settled]");
const unsettled = (page) => page.waitForSelector("#dir:not([data-settled])", { state: "attached" });

describe("DirectoryList and DirectoryRow (D5b)", () => {
  test("one list with one name, its head; rows are one link of three fixed columns, 56px at least, ruled by hairlines", async () => {
    const page = await open(SHELL(DIR()));
    assert.equal(await page.locator("#dir ul").count(), 1, "one list, not two");
    assert.equal(await page.locator("#dir li").count(), 12, "every row is in it");
    assert.equal(await page.getByRole("list", { name: "Client work and other projects" }).count(), 1);
    assert.equal(await page.locator("#dir h3").count(), 1);
    assert.equal(await css(page, "#dir h3", "fontWeight"), "500");
    assert.equal(await css(page, "#dir h3", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    const cols = await page.locator("#row0").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").map(parseFloat));
    near(cols[0], 160, "name column"); near(cols[2], 160, "state column");
    assert.ok(cols[1] > 400, "the sentence takes the rest");
    const row = await box(page, "#row0");
    assert.ok(row.h >= 56 - 0.5, `row height ${row.h}`);
    near(row.h, 56, "a one-line row is the row size, 56");
    assert.equal(await css(page, "#row0", "paddingTop"), "16px");
    assert.equal(await css(page, "#row0 .basalt-directory-name", "fontWeight"), "600");
    assert.equal(await css(page, "#row0 .basalt-directory-name", "fontSize"), "16px");
    assert.match(await css(page, "#row0 .basalt-directory-state", "textAlign"), /^(right|end)$/);
    assert.match(await css(page, "#row0 .basalt-directory-state", "fontVariantNumeric"), /tabular-nums/);
    assert.equal(await css(page, "#row0 .basalt-directory-what", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    const rule = await page.locator("#dir li").first().evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopWidth, s.borderTopStyle, s.borderTopColor]; });
    assert.deepEqual(rule, ["1px", "solid", await resolve(page, "var(--basalt-border-divider)")], "the rule between rows is the divider");
    assert.equal(await drawing(page, "#row0 .basalt-go-arrow"), await drawing(page, "#ref-right"), "the core right arrow, not up-right");
    near((await box(page, "#row0 .basalt-go-arrow svg")).w, 16, "the row's arrow is 16");
    // The columns line up from row to row.
    const x = await page.locator("#dir a.basalt-directory-row").evaluateAll((rows) => rows.slice(0, 4).map((r) => [r.querySelector(".basalt-directory-name").getBoundingClientRect().x, r.querySelector(".basalt-directory-what").getBoundingClientRect().x, r.querySelector(".basalt-directory-state").getBoundingClientRect().x]));
    for (const columns of x) assert.deepEqual(columns, x[0], "header positions and column widths never move");
    await page.close();
  });

  test("under 720 a row is one column, its state starts, the row-gap is 2px and the padding 14px", async () => {
    const page = await open(SHELL(DIR()), { width: 390 });
    const cols = await page.locator("#row0").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    assert.equal(cols, 1);
    assert.equal(await css(page, "#row0", "rowGap"), "2px");
    assert.equal(await css(page, "#row0", "paddingTop"), "14px");
    assert.match(await css(page, "#row0 .basalt-directory-state", "textAlign"), /^(left|start)$/);
    const name = await box(page, "#row0 .basalt-directory-name"), state = await box(page, "#row0 .basalt-directory-state");
    near(name.x, state.x, "state starts at the name's edge");
    assert.ok(state.h > 0 && (await box(page, "#row0")).h >= 44, "a touch target of 44 at least");
    await page.close();
  });

  for (const theme of THEMES) test(`hover lifts the sentence and arrow to primary with no wash, the arrow travels 2px and nothing moves (${theme})`, async () => {
    const page = await open(SHELL(DIR()), { theme });
    const before = { row: await box(page, "#row1"), name: await box(page, "#row1 .basalt-directory-name"), what: await box(page, "#row1 .basalt-directory-what"), state: await box(page, "#row1 .basalt-directory-state"), after: await box(page, "#after") };
    await page.locator("#row1").hover();
    await settle(page);
    assert.equal(await css(page, "#row1 .basalt-directory-what", "color"), await resolve(page, "var(--basalt-text-primary)"));
    assert.equal(await css(page, "#row1 .basalt-go-arrow", "color"), await resolve(page, "var(--basalt-text-primary)"));
    near(await travel(page, "#row1 .basalt-go-arrow"), 2, "arrow travel");
    assert.equal(await css(page, "#row1", "backgroundColor"), "rgba(0, 0, 0, 0)", "a ruled list on the page takes no hover wash");
    assert.equal(await css(page, "#row1 .basalt-directory-state", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    assert.deepEqual({ row: await box(page, "#row1"), name: await box(page, "#row1 .basalt-directory-name"), what: await box(page, "#row1 .basalt-directory-what"), state: await box(page, "#row1 .basalt-directory-state"), after: await box(page, "#after") }, before, "0px moves");
    await page.close();
  });

  test("keyboard focus is the control ring at +2, outside the row", async () => {
    const page = await open(SHELL(DIR()));
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "row0");
    assert.equal(await css(page, "#row0", "outlineWidth"), "2px");
    assert.equal(await css(page, "#row0", "outlineOffset"), "2px");
    await page.close();
  });

  test("a row that opens a new tab swaps the arrow for the new-tab arrow and says so", async () => {
    const page = await open(SHELL(`<B.DirectoryList title="Elsewhere"><B.DirectoryRow id="out" href="https://example.invalid" target="_blank" name="Out" description="Opens elsewhere" state="2026" /></B.DirectoryList>${REFS}`));
    assert.equal(await page.locator("#out .basalt-go-arrow").count(), 0);
    assert.equal(await drawing(page, "#out .basalt-external"), await drawing(page, "#ref-external"));
    assert.match(await page.locator("#out").innerText(), /opens in a new tab/);
    await page.close();
  });

  for (const [width, theme] of [[1440, "dark"], [1440, "light"], [390, "dark"], [390, "light"]]) test(`no accessibility violations, closed and open, at ${width}px (${theme})`, async () => {
    const page = await open(SHELL(DIR()), { width, theme });
    assert.deepEqual(await axe(page), [], "closed");
    await page.getByRole("button", { name: "Show all 12" }).click();
    await settled(page);
    assert.deepEqual(await axe(page), [], "open");
    assert.deepEqual(page.errors, []);
    await page.close();
  });
});

describe("Show all (D6) in a directory and as Reveal", () => {
  const restBoxes = (page) => page.locator("#dir li[data-rest]").evaluateAll((items) => items.map((el) => el.getBoundingClientRect().height));

  test("closed: the button says Show all 12 and is aria-expanded and aria-controls the list; the rest is inert, hidden and no height", async () => {
    const page = await open(SHELL(DIR()));
    const button = page.getByRole("button", { name: "Show all 12" });
    assert.equal(await button.getAttribute("aria-expanded"), "false");
    assert.equal(await button.getAttribute("aria-controls"), await page.locator("#dir ul").getAttribute("id"));
    assert.equal(await css(page, "#dir .basalt-reveal-foot button", "borderRadius") !== "", true);
    assert.deepEqual(await restBoxes(page), Array(8).fill(0), "a closed row is no height at all, rule included");
    assert.equal(await page.locator("#dir li[data-rest] > [inert]").count(), 8);
    assert.equal(await page.locator("#row8").isVisible(), false, "unseen");
    // Tab goes past the hidden rows: four rows, then the button.
    for (let i = 0; i < 4; i += 1) await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON");
    // The rule above the button's row.
    assert.equal(await css(page, "#dir .basalt-reveal-foot", "borderTopWidth"), "1px");
    assert.equal(await css(page, "#dir .basalt-reveal-foot", "paddingTop"), "16px");
    await page.close();
  });

  test("no 'Show all' when every row shows", async () => {
    const page = await open(SHELL(DIR("shown={12}")));
    assert.equal(await page.locator("#dir button").count(), 0);
    await page.close();
  });

  test("a pointer open leaves focus on the button; the rows grow in place, only what is under the list moves, and Show fewer closes them", async () => {
    const page = await open(SHELL(DIR()));
    const head = await box(page, "#dir h3"), first = await box(page, "#row0"), cols = await box(page, "#row0 .basalt-directory-state"), after = await box(page, "#after");
    const button = page.getByRole("button", { name: "Show all 12" });
    await button.click();
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON", "focus stays on the button after a pointer open");
    await settled(page);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON", "and stays there once it has settled");
    assert.equal(await page.getByRole("button", { name: "Show fewer" }).getAttribute("aria-expanded"), "true");
    assert.deepEqual(await box(page, "#dir h3"), head, "the head does not move");
    assert.deepEqual(await box(page, "#row0"), first, "the first row does not move");
    assert.deepEqual(await box(page, "#row0 .basalt-directory-state"), cols, "a column does not move");
    for (const h of await restBoxes(page)) near(h, 57, "an opened row is the row size, 56, and its rule");
    assert.equal(await page.locator("#dir li[data-rest] > [inert]").count(), 0);
    assert.equal(await css(page, "#dir li[data-rest] > div", "overflow"), "visible", "once open nothing clips");
    assert.ok((await box(page, "#after")).y > after.y + 8 * 55, "what is under the list moves down: that is what the press asked for");
    assert.equal(await page.locator("#dir ul").count(), 1, "still one list");
    await page.getByRole("button", { name: "Show fewer" }).click();
    await unsettled(page);
    await page.waitForFunction(() => [...document.querySelectorAll("#dir li[data-rest]")].every((el) => el.getBoundingClientRect().height === 0));
    assert.equal(await page.locator("#dir li[data-rest] > [inert]").count(), 8);
    assert.deepEqual(await box(page, "#after"), after, "back where it was");
    await page.close();
  });

  test("a keyboard open puts focus on the first new row only once the clip has let go, so its ring is whole", async () => {
    const page = await open(SHELL(DIR()));
    await page.evaluate(() => {
      window.__landed = [];
      document.addEventListener("focusin", (event) => {
        const root = document.querySelector("#dir");
        const clip = event.target.closest?.("[data-reveal-clip]");
        window.__landed.push({ id: event.target.id, settled: root.hasAttribute("data-settled"), overflow: clip ? getComputedStyle(clip).overflow : null });
      });
    });
    await page.getByRole("button", { name: "Show all 12" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.id === "row4");
    const landed = await page.evaluate(() => window.__landed);
    const row = landed.find((entry) => entry.id === "row4");
    assert.equal(row.settled, true, "the clip had let go when focus landed");
    assert.equal(row.overflow, "visible", "so nothing cuts the ring");
    assert.equal(await css(page, "#row4", "outlineWidth"), "2px");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "row5", "a list that is open is just a list");
    await page.close();
  });

  test("under reduced motion there is no track to grow: it opens at once, and a keyboard open still lands on the first new row", async () => {
    const page = await open(SHELL(DIR()), { reducedMotion: "reduce" });
    assert.equal(await css(page, "#dir li[data-rest]", "transitionDuration", 0), "0s");
    await page.getByRole("button", { name: "Show all 12" }).focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.activeElement?.id === "row4");
    for (const h of await restBoxes(page)) near(h, 57, "opened at once, 56 and its rule");
    await page.close();
  });

  test("the track goes 0fr to 1fr over duration-slow on ease-out and back at 0.75x on ease-in", async () => {
    const page = await open(SHELL(DIR()));
    const track = () => page.locator("#row8").evaluate((el) => { const s = getComputedStyle(el.parentElement.parentElement); return [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction]; });
    const [property, closedDuration, closedEase] = await track();
    assert.match(property, /grid-template-rows/);
    near(parseFloat(closedDuration) * 1000, 150, "closing runs at 0.75 of 200ms");
    assert.equal(closedEase, await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-ease-in").trim()).then((v) => v));
    await page.getByRole("button", { name: "Show all 12" }).click();
    const [, openDuration, openEase] = await track();
    near(parseFloat(openDuration) * 1000, 200, "opening takes duration-slow");
    assert.equal(openEase, await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-ease-out").trim()));
    await page.close();
  });

  test("Reveal opens any content in place from a button under it, with the same states", async () => {
    const page = await open(SHELL(`<B.Reveal id="dir" rest={<p id="more" style={{ margin: 0 }}>The rest, synthetic words.</p>} showLabel="Show all 3" hideLabel="Show fewer"><p style={{ margin: 0 }}>The start.</p></B.Reveal><p id="after">After.</p>`));
    const button = page.getByRole("button", { name: "Show all 3" });
    assert.equal(await button.getAttribute("aria-controls") !== null, true);
    assert.equal(await page.locator("#more").isVisible(), false);
    assert.equal(await page.locator("#dir .basalt-reveal-panel[inert]").count(), 1);
    await button.click();
    await settled(page);
    assert.equal(await page.locator("#more").isVisible(), true);
    assert.equal(await page.getByRole("button", { name: "Show fewer" }).getAttribute("aria-expanded"), "true");
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- big link rows (D5b)
const BIG = `<div style={{ width: "100%" }}><B.BigLinkList id="big" aria-label="Shop by category">${["Alpha goods", "Beta goods", "Gamma goods", "Delta goods"].map((n, i) => `<B.BigLinkRow key={${i}} id="big${i}" href="#b${i}">${n}</B.BigLinkRow>`).join("")}</B.BigLinkList></div>${REFS}`;
const bigPage = (width, options = {}) => open(`document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; createRoot(document.getElementById("root")).render(<main style={{ padding: 24, boxSizing: "border-box" }}>${BIG}</main>);`, { width, ...options });

describe("BigLinkList and BigLinkRow (D5b)", () => {
  test("from 1024 one column: 600 at text-3xl 30/36, 56px high, a rule under each, the arrow after the words", async () => {
    const page = await bigPage(1440);
    assert.equal(await css(page, "#big0", "fontWeight"), "600");
    assert.equal(await css(page, "#big0", "fontSize"), "30px");
    assert.equal(await css(page, "#big0", "lineHeight"), "36px");
    assert.equal(await css(page, "#big0", "display"), "flex");
    assert.equal(await css(page, "#big0", "justifyContent"), "space-between");
    near((await box(page, "#big0")).h, 56, "row height");
    const a = await box(page, "#big0"), b = await box(page, "#big1");
    assert.equal(a.x, b.x, "one column");
    assert.equal(await css(page, "#big0", "outlineStyle"), "none");
    const rule = await page.locator("#big0").evaluate((el) => { const s = getComputedStyle(el.parentElement); return [s.borderBottomWidth, s.borderBottomColor, s.borderTopWidth]; });
    assert.deepEqual(rule, ["1px", await resolve(page, "var(--basalt-border-divider)"), "0px"]);
    assert.equal(await page.locator("#big").evaluate((el) => getComputedStyle(el).borderTopWidth), "1px");
    assert.equal(await drawing(page, "#big0 .basalt-go-arrow"), await drawing(page, "#ref-right"));
    const words = await box(page, "#big0 .basalt-big-link-words"), arrow = await box(page, "#big0 .basalt-go-arrow svg"), row = await box(page, "#big0");
    assert.ok(arrow.x > words.right, "the arrow comes after the words");
    near(row.right - arrow.right, 4, "space-1 to the row's end");
    await page.close();
  });

  test("steps 24/30 under 1024 and 30/36 from it (not a fluid size), and the band is 720 to 1023 in two columns", async () => {
    const wide = await bigPage(1024);
    assert.equal(await css(wide, "#big0", "fontSize"), "30px");
    assert.equal((await box(wide, "#big0")).x, (await box(wide, "#big1")).x, "one column at 1024");
    await wide.close();
    const page = await bigPage(1023);
    assert.equal(await css(page, "#big0", "fontSize"), "24px");
    assert.equal(await css(page, "#big0", "lineHeight"), "30px");
    const [a, b, c] = [await box(page, "#big0"), await box(page, "#big1"), await box(page, "#big2")];
    assert.ok(b.x > a.x + 100, "two columns");
    near(b.x - a.right - 0, 48, "column gap 48 (space-12)", 1.5);
    assert.equal(a.y, b.y, "the first two share a line");
    near(a.h, 64, "two-column rows are space-16 high");
    assert.equal(c.x, a.x);
    // The first two rows carry a rule above in this band; the list does not.
    assert.equal(await page.locator("#big0").evaluate((el) => getComputedStyle(el.parentElement).borderTopWidth), "1px");
    assert.equal(await page.locator("#big1").evaluate((el) => getComputedStyle(el.parentElement).borderTopWidth), "1px");
    assert.equal(await page.locator("#big2").evaluate((el) => getComputedStyle(el.parentElement).borderTopWidth), "0px");
    assert.equal(await page.locator("#big").evaluate((el) => getComputedStyle(el).borderTopWidth), "0px");
    await page.setViewportSize({ width: 719, height: 900 });
    assert.equal((await box(page, "#big0")).x, (await box(page, "#big1")).x, "one column under 720");
    near((await box(page, "#big0")).h, 56, "and 56 high");
    await page.close();
  });

  for (const theme of THEMES) test(`hover lifts the arrow to primary and moves it 2px, the ring is at +2, nothing else moves; no accessibility violations (${theme})`, async () => {
    const page = await bigPage(1440, { theme });
    const before = { row: await box(page, "#big1"), words: await box(page, "#big1 .basalt-big-link-words"), next: await box(page, "#big2") };
    assert.equal(await css(page, "#big1 .basalt-go-arrow", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    await page.locator("#big1").hover();
    await settle(page);
    assert.equal(await css(page, "#big1 .basalt-go-arrow", "color"), await resolve(page, "var(--basalt-text-primary)"));
    near(await travel(page, "#big1 .basalt-go-arrow"), 2, "arrow travel");
    assert.deepEqual({ row: await box(page, "#big1"), words: await box(page, "#big1 .basalt-big-link-words"), next: await box(page, "#big2") }, before, "0px moves");
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    assert.equal(await css(page, "#big0", "outlineOffset"), "2px");
    assert.equal(await css(page, "#big0", "borderTopLeftRadius"), "6px");
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- the arrow link and the back link (D5c)
const GO = `<div style={{ display: "grid", gap: 24, justifyItems: "start", width: 480 }}>
  <p style={{ margin: 0 }}><B.BackLink id="back" href="#brands">Brands</B.BackLink></p>
  <B.Link id="go" href="#all" arrow="end">All brands</B.Link>
  <B.Link id="go-back" href="#up" arrow="start">Up one</B.Link>
  <B.Link id="go-new" href="https://example.invalid" target="_blank" arrow="end">Elsewhere</B.Link>
  <B.Link id="plain" href="#x">A plain link</B.Link>
</div>${REFS}`;

describe("The arrow link and the back link (D5c)", () => {
  test("the arrow link: no underline, 500, a 44px target, the right arrow after the words 8px away; the left arrow before for a back arrow", async () => {
    const page = await open(SHELL(GO));
    assert.equal(await css(page, "#go", "textDecorationLine"), "none");
    assert.equal(await css(page, "#go", "fontWeight"), "500");
    assert.equal(await css(page, "#go", "fontSize"), "16px");
    assert.equal(await css(page, "#go", "whiteSpace"), "nowrap");
    assert.ok((await box(page, "#go")).h >= 44 - 0.5, "44px target");
    const words = await box(page, "#go .basalt-link-label"), arrow = await box(page, "#go .basalt-go-arrow svg");
    assert.ok(arrow.x > words.right); near(arrow.x - words.right, 8, "gap space-2");
    assert.equal(await drawing(page, "#go .basalt-go-arrow"), await drawing(page, "#ref-right"));
    assert.equal(await css(page, "#go .basalt-go-arrow", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    const w2 = await box(page, "#go-back .basalt-link-label"), a2 = await box(page, "#go-back .basalt-go-arrow svg");
    assert.ok(a2.right < w2.x, "the left arrow comes first");
    assert.equal(await drawing(page, "#go-back .basalt-go-arrow"), await drawing(page, "#ref-left"));
    // The plain link keeps its underline and 400: the arrow link is a variant, not a change to Link.
    assert.match(await css(page, "#plain", "textDecorationLine"), /underline/);
    assert.equal(await css(page, "#plain", "fontWeight"), "400");
    await page.close();
  });

  for (const theme of THEMES) test(`hover: the arrow lifts to primary and travels 2px in its own direction; no layout moves (${theme})`, async () => {
    const page = await open(SHELL(GO), { theme });
    const before = { link: await box(page, "#go"), words: await box(page, "#go .basalt-link-label"), back: await box(page, "#go-back .basalt-link-label") };
    await page.locator("#go").hover();
    await settle(page);
    near(await travel(page, "#go .basalt-go-arrow"), 2, "forward");
    assert.equal(await css(page, "#go .basalt-go-arrow", "color"), await resolve(page, "var(--basalt-text-primary)"));
    assert.equal(await css(page, "#go", "textDecorationLine"), "none", "no underline on hover either");
    await page.locator("#go-back").hover();
    await settle(page);
    near(await travel(page, "#go-back .basalt-go-arrow"), -2, "back");
    assert.deepEqual({ link: await box(page, "#go"), words: await box(page, "#go .basalt-link-label"), back: await box(page, "#go-back .basalt-link-label") }, before, "0px moves");
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "go");
    assert.equal(await css(page, "#go", "outlineOffset"), "2px");
    await page.close();
  });

  test("an arrow link that opens a new tab draws the new-tab arrow in the arrow's place, never both", async () => {
    const page = await open(SHELL(GO));
    assert.equal(await page.locator("#go-new .basalt-go-arrow").count(), 0);
    assert.equal(await drawing(page, "#go-new .basalt-external"), await drawing(page, "#ref-external"));
    assert.equal(await css(page, "#go-new", "textDecorationLine"), "none");
    assert.match(await page.locator("#go-new").innerText(), /opens in a new tab/);
    await page.close();
  });

  test("the back link: a nav with one link, 14/20, secondary lifting to primary on hover with no underline, 8px gap, a 44px target", async () => {
    const page = await open(SHELL(GO));
    assert.equal(await page.getByRole("navigation", { name: "Back" }).count(), 1);
    assert.equal(await page.locator("nav a#back").count(), 1);
    assert.equal(await css(page, "#back", "fontSize"), "14px");
    assert.equal(await css(page, "#back", "lineHeight"), "20px");
    assert.equal(await css(page, "#back", "textDecorationLine"), "none");
    assert.equal(await css(page, "#back", "color"), await resolve(page, "var(--basalt-text-secondary)"));
    assert.ok((await box(page, "#back")).h >= 44 - 0.5);
    assert.equal(await drawing(page, "#back .basalt-go-arrow"), await drawing(page, "#ref-left"));
    const arrow = await box(page, "#back .basalt-go-arrow svg"), words = await box(page, "#back span:last-child");
    near(words.x - arrow.right, 8, "gap space-2");
    await page.locator("#back").hover();
    await settle(page);
    assert.equal(await css(page, "#back", "color"), await resolve(page, "var(--basalt-text-primary)"));
    assert.equal(await css(page, "#back", "textDecorationLine"), "none", "the hover is the ink lift, never an underline");
    near(await travel(page, "#back .basalt-go-arrow"), -2, "the arrow travels back");
    await page.close();
  });

  test("on a touch screen the arrow link and the back link are 44px and nothing is left out", async () => {
    const page = await open(SHELL(GO), { width: 390, hasTouch: true, isMobile: true });
    assert.ok((await box(page, "#go")).h >= 44 - 0.5);
    assert.ok((await box(page, "#back")).h >= 44 - 0.5);
    assert.ok((await box(page, "#back")).w >= 44 - 0.5);
    await page.close();
  });

  for (const theme of THEMES) test(`no accessibility violations (${theme})`, async () => {
    const page = await open(SHELL(GO), { theme });
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});

// ---- the copy button with words (X8)
const COPY = `<div style={{ display: "flex", gap: 16, alignItems: "center" }}>
  <B.CopyButton id="copy" text="hello@example.invalid" variant="secondary" size="lg" statusLabel="Address copied">Copy address</B.CopyButton>
  <B.CopyButton id="copy2" text="ok" variant="primary">Copy</B.CopyButton>
</div>`;
const stubClipboard = (page, behaviour) => page.evaluate((b) => {
  window.__written = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { if (b === "refuse") throw new Error("refused"); window.__written.push(text); } } });
}, behaviour);
/** Lets the click's promise and React's scheduler (a message channel, not the page's clock) run. */
const flush = async (page) => { for (let i = 0; i < 3; i += 1) await page.evaluate(() => new Promise((resolve) => { const channel = new MessageChannel(); channel.port1.onmessage = () => resolve(); channel.port2.postMessage(0); })); };
// A frozen clock stops the polling Playwright's own click and waits use, so these press with the page's own `click()` and read with evaluate.
const press = async (page, selector) => { await page.evaluate((sel) => document.querySelector(sel).click(), selector); await flush(page); };
const words = (page, selector = "#copy") => page.locator(selector).evaluate((el) => el.querySelector(".basalt-reserve > [data-on]").textContent);
const status = (page) => page.locator("[role=status]").first().evaluate((el) => el.textContent);
const frozen = (theme = "dark") => fixturePage(browser, SHELL(COPY), { theme, colorScheme: theme, viewport: { width: 1440, height: 900 }, clock: true });

describe("CopyButton (X8)", () => {
  test("copies, says Copied, and the button's width never changes; the spoken status says what was copied", async () => {
    const { page } = await frozen();
    await stubClipboard(page, "allow");
    const before = await box(page, "#copy");
    assert.equal(await words(page), "Copy address");
    assert.equal(await page.getByRole("button", { name: "Copy address" }).count(), 1);
    assert.equal(await page.locator("#copy [aria-hidden='true']").count(), 1, "the unseen wording is out of the tree");
    assert.equal(await status(page), "");
    await press(page, "#copy");
    assert.deepEqual(await page.evaluate(() => window.__written), ["hello@example.invalid"]);
    assert.equal(await words(page), "Copied");
    // One voice (A3-25, batch c10): the status says it was copied and the button keeps its name, so a reader that announces a focused button's name changing does not say it twice.
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Copy address" }).count(), 1);
    assert.equal(await status(page), "Address copied");
    assert.deepEqual(await box(page, "#copy"), before, "0px: the width and the position do not change");
    await page.clock.runFor(1499);
    await flush(page);
    assert.equal(await words(page), "Copied", "still Copied just before 1500ms");
    await page.clock.runFor(1);
    await flush(page);
    assert.equal(await words(page), "Copy address");
    assert.equal(await status(page), "");
    assert.deepEqual(await box(page, "#copy"), before);
    await page.close();
  });

  test("a second press while it says Copied starts the 1500ms again", async () => {
    const { page } = await frozen();
    await stubClipboard(page, "allow");
    await press(page, "#copy");
    await page.clock.runFor(1000);
    await press(page, "#copy");
    await page.clock.runFor(1000);
    await flush(page);
    assert.equal(await words(page), "Copied", "1000ms after the second press it is still Copied");
    await page.clock.runFor(500);
    await flush(page);
    assert.equal(await words(page), "Copy address");
    await page.close();
  });

  test("a refused or missing clipboard leaves the button as it was: it never says Copied", async () => {
    const { page } = await frozen();
    await stubClipboard(page, "refuse");
    await press(page, "#copy");
    await page.clock.runFor(100);
    assert.equal(await words(page), "Copy address");
    assert.equal(await status(page), "");
    await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
    await press(page, "#copy");
    await page.clock.runFor(100);
    assert.equal(await words(page), "Copy address");
    await page.close();
  });

  test("it is a Button of any variant and size: the secondary large and the primary medium keep their own heights", async () => {
    const page = await open(SHELL(COPY));
    near((await box(page, "#copy")).h, 36, "lg is 36");
    near((await box(page, "#copy2")).h, 32, "md is 32");
    assert.equal(await page.locator("#copy2").getAttribute("data-variant"), "primary");
    await page.close();
  });

  // axe sets its own timers, which a frozen clock stops, so it runs at rest on a page whose clock runs. The Copied wording is the same
  // Button in the same colours, in the same cell.
  for (const theme of THEMES) test(`no accessibility violations (${theme})`, async () => {
    const page = await open(SHELL(COPY), { theme });
    assert.deepEqual(await axe(page), []);
    await page.close();
  });
});
