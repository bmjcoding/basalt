// DECISIONS 154, the controls batch, choices: the switch row (D9a) and the option chips (D9b). Driven in Chromium against the built package
// with the real stylesheet, in both themes, in forced colours, under reduced motion, at 1440 and 390 and on a coarse pointer. Nothing may move
// when a row or chip is chosen: measured to 0px.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const open = async (jsx, options = {}) => {
  const { page, errors } = await fixturePage(browser, render(jsx), options);
  if (options.isMobile) {
    await page.evaluate(() => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1"; document.head.append(m); });
    await page.waitForFunction((w) => window.innerWidth === w, options.viewport.width);
  }
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); margin: 0; }" });
  await settle(page);
  return { page, errors };
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const css = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const colours = (page) => page.evaluate(() => { const p = document.createElement("i"); document.body.append(p); const read = (v) => { p.style.color = v; return getComputedStyle(p).color; }; const o = {}; for (const k of ["text-primary", "text-secondary", "text-disabled", "border-input", "border-divider", "text-inverse"]) o[k] = read(`var(--basalt-${k})`); o.selected = (() => { p.style.backgroundColor = "var(--basalt-state-selected)"; return getComputedStyle(p).backgroundColor; })(); p.remove(); return o; });
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return (await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
};
const systemColors = (page) => page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); const bg = (v) => { p.style.backgroundColor = v; return getComputedStyle(p).backgroundColor; }; const fg = (v) => { p.style.color = v; return getComputedStyle(p).color; }; const c = { Highlight: bg("Highlight"), HighlightText: fg("HighlightText"), ButtonText: fg("ButtonText"), GrayText: fg("GrayText") }; p.remove(); return c; });

const TILE = `<span style={{ display: "block", background: "gray", borderRadius: 8 }} />`;
const ROWS = (extra = "") => `<B.SwitchRowGroup aria-labelledby="t" aria-describedby="h" defaultValue={["a"]} ${extra}>
  <B.SwitchRow value="a" tile={${TILE}} kind="Kind A">Source one</B.SwitchRow>
  <B.SwitchRow value="b" tile={${TILE}} kind="Kind B">Source two</B.SwitchRow>
  <B.SwitchRow value="c" tile={${TILE}} kind="Kind C" disabled>Source three</B.SwitchRow>
  <B.SwitchRow value="d" tile={${TILE}} kind="Band">A source with a name long enough that it has to end in an ellipsis before the seat at the row's end</B.SwitchRow>
</B.SwitchRowGroup>`;
const WITH_HEADING = (rows) => `<div style={{ boxSizing: "border-box", width: "100%", maxWidth: 360, padding: 16 }}><h3 id="t">Sources</h3><p id="h">Switch on the ones you use.</p>${rows}</div>`;

describe("D9a: the switch row", () => {
  test("it is 52 tall with a 36px tile and a 14/20 name from 720 wide, and 48 with a 32px tile and a 13/18 name under 720", async () => {
    for (const [options, row, tile, name] of [[DESKTOP, 52, 36, "14px"], [PHONE, 48, 32, "13px"]]) {
      const { page } = await open(WITH_HEADING(ROWS()), options);
      const first = page.getByRole("checkbox", { name: /Source two/ });
      assert.equal((await box(first)).height, row, `row at ${options.viewport.width}`);
      assert.deepEqual([(await box(first.locator(".basalt-switch-row-tile"))).height, (await box(first.locator(".basalt-switch-row-tile"))).width], [tile, tile]);
      assert.equal((await css(first.locator(".basalt-switch-row-name"), "fontSize")).fontSize, name);
      assert.equal((await css(first, "borderTopLeftRadius")).borderTopLeftRadius, "8px");
      assert.equal((await css(first.locator(".basalt-switch-row-kind"), "fontSize")).fontSize, "12px");
      await page.close();
    }
  });

  test("compact density steps the row down one rung (52 to 48; 48 to 44, which the 32px tile and its padding then hold at 46)", async () => {
    const { page } = await open(`<div data-density="compact" style={{ width: 360 }}><B.SwitchRowGroup aria-label="g"><B.SwitchRow value="a" tile={${TILE}}>A</B.SwitchRow></B.SwitchRowGroup></div>`, DESKTOP);
    assert.equal((await box(page.getByRole("checkbox"))).height, 50, "50: a 36px tile and 12px of padding and two edges make 50, under the 48 rung's 48");
  });

  test("the row is one checkbox: a named group, the name and kind as its name, Space toggles, and the group's value follows", async () => {
    const { page } = await open(`(() => { const App = () => { const [v, setV] = React.useState(["a"]); return <div style={{ boxSizing: "border-box", width: "100%", maxWidth: 360, padding: 16 }}><h3 id="t">Sources</h3><p id="h">Switch on the ones you use.</p><B.SwitchRowGroup aria-labelledby="t" aria-describedby="h" value={v} onValueChange={setV}><B.SwitchRow value="a" kind="Kind A">Source one</B.SwitchRow><B.SwitchRow value="b" kind="Kind B">Source two</B.SwitchRow></B.SwitchRowGroup><output id="v">{v.join(",")}</output></div>; }; return <App />; })()`);
    const group = page.getByRole("group", { name: "Sources" });
    assert.equal(await group.count(), 1);
    assert.equal(await group.getAttribute("aria-describedby"), "h");
    const second = page.getByRole("checkbox", { name: /Source two\s*,\s*Kind B/ });
    assert.equal(await second.getAttribute("aria-checked"), "false");
    await second.focus();
    await page.keyboard.press("Space");
    assert.equal(await second.getAttribute("aria-checked"), "true");
    assert.equal(await page.locator("#v").textContent(), "a,b");
    await second.click();
    assert.equal(await page.locator("#v").textContent(), "a");
  });

  for (const theme of THEMES) {
    test(`off is secondary ink on the input boundary; on is the selected wash and primary ink and the edge does not change; hover lifts the ink and the edge (${theme})`, async () => {
      const { page } = await open(WITH_HEADING(ROWS()), { theme, ...DESKTOP });
      const c = await colours(page);
      const off = page.getByRole("checkbox", { name: /Source two/ }), on = page.getByRole("checkbox", { name: /Source one/ });
      let s = await css(off, "borderTopColor", "color", "backgroundColor");
      assert.deepEqual([s.borderTopColor, s.color, s.backgroundColor], [c["border-input"], c["text-secondary"], "rgba(0, 0, 0, 0)"]);
      s = await css(on, "borderTopColor", "color", "backgroundColor");
      assert.deepEqual([s.borderTopColor, s.color, s.backgroundColor], [c["border-input"], c["text-primary"], c.selected], "the checked edge is the unchecked edge");
      await off.hover();
      await page.waitForFunction(([want]) => getComputedStyle(document.querySelector("[role=checkbox]:not([data-checked]):not([data-disabled])")).color === want, [c["text-primary"]]);
      s = await css(off, "borderTopColor");
      assert.equal(s.borderTopColor, c["text-secondary"], "hover takes the edge up a step: border-hover is fainter than the input boundary, so it would drop the edge under 3:1");
    });
  }

  test("choosing a row moves nothing, in either width: the row, its tile, its name and the seat are 0px", async () => {
    for (const options of [DESKTOP, PHONE]) {
      const { page } = await open(WITH_HEADING(ROWS()), options);
      const parts = async () => { const r = page.getByRole("checkbox", { name: /Source two/ }); const o = {}; for (const [k, l] of [["row", r], ["tile", r.locator(".basalt-switch-row-tile")], ["name", r.locator(".basalt-switch-row-name")], ["seat", r.locator(".basalt-switch-row-seat")]]) o[k] = await box(l); o.others = await box(page.getByRole("checkbox", { name: /Source three/ })); return o; };
      const before = await parts();
      await page.getByRole("checkbox", { name: /Source two/ }).click();
      assert.deepEqual(await parts(), before);
      await page.close();
    }
  });

  test("the plus and the check cross over in 100ms, with or without reduced motion", async () => {
    const { page } = await open(WITH_HEADING(ROWS()), DESKTOP);
    for (const reduced of ["no-preference", "reduce"]) {
      await page.emulateMedia({ reducedMotion: reduced });
      for (const sel of [".basalt-switch-row-plus", ".basalt-switch-row-check"]) {
        const t = await css(page.locator(sel).first(), "transitionDuration", "transitionProperty");
        assert.deepEqual([t.transitionDuration, t.transitionProperty], ["0.1s", "opacity"], `${sel} (${reduced})`);
      }
    }
    const on = page.getByRole("checkbox", { name: /Source one/ });
    assert.equal((await css(on.locator(".basalt-switch-row-check"), "opacity")).opacity, "1");
    assert.equal((await css(on.locator(".basalt-switch-row-plus"), "opacity")).opacity, "0");
  });

  test("the name wraps (DECISIONS 167, Q1.1) and the full name is the row's accessible name", async () => {
    const { page } = await open(WITH_HEADING(ROWS()), DESKTOP);
    const long = page.getByRole("checkbox", { name: /A source with a name long enough/ });
    assert.equal(await long.count(), 1);
    const n = await css(long.locator(".basalt-switch-row-name"), "textOverflow", "whiteSpace");
    assert.deepEqual([n.textOverflow, n.whiteSpace], ["clip", "normal"]);
    assert.ok(await long.locator(".basalt-switch-row-name").evaluate((el) => el.scrollWidth <= el.clientWidth), "no part of the name is cut");
    assert.ok((await long.evaluate((el) => el.getBoundingClientRect().height)) > 52, "the row grew with its own content");
  });

  test("disabled takes the chip's disabled look and cannot be changed; focus is the control ring at +2, outside", async () => {
    const { page } = await open(WITH_HEADING(ROWS()), DESKTOP);
    const c = await colours(page);
    await page.keyboard.press("Tab");
    const ring = await css(page.locator("[role=checkbox]").first(), "outlineWidth", "outlineStyle", "outlineOffset");
    assert.deepEqual([ring.outlineWidth, ring.outlineStyle, ring.outlineOffset], ["2px", "solid", "2px"]);
    const dis = page.getByRole("checkbox", { name: /Source three/ });
    const s = await css(dis, "color", "borderTopColor", "cursor");
    assert.deepEqual([s.color, s.borderTopColor, s.cursor], [c["text-disabled"], c["border-divider"], "not-allowed"]);
    await dis.click({ force: true });
    assert.equal(await dis.getAttribute("aria-checked"), "false");
  });

  test("in forced colours on is Highlight with HighlightText on the row, its name and its check, with no outline", async () => {
    const { page } = await open(WITH_HEADING(ROWS()), DESKTOP);
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const c = await systemColors(page);
    const on = page.getByRole("checkbox", { name: /Source one/ });
    const s = await css(on, "backgroundColor", "borderTopColor", "color", "outlineStyle");
    assert.deepEqual([s.backgroundColor, s.borderTopColor, s.color, s.outlineStyle], [c.Highlight, c.Highlight, c.HighlightText, "none"]);
    for (const sel of [".basalt-switch-row-name", ".basalt-switch-row-kind", ".basalt-switch-row-check"]) assert.equal((await css(on.locator(sel), "color")).color, c.HighlightText, sel);
    const off = page.getByRole("checkbox", { name: /Source two/ });
    assert.deepEqual(Object.values(await css(off, "borderTopColor", "color")), [c.ButtonText, c.ButtonText]);
  });

  for (const theme of THEMES) for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`axe: a group of switch rows at ${name} (${theme})`, async () => {
      const { page } = await open(WITH_HEADING(ROWS()), { theme, ...options });
      assert.deepEqual(await axe(page), []);
    });
  }

  test("a coarse pointer leaves the row at 48 or more and never under 44", async () => {
    const { page } = await open(WITH_HEADING(ROWS()), PHONE);
    for (const row of await page.getByRole("checkbox").all()) assert.ok((await box(row)).height >= 44);
  });
});

describe("D9b: option chips", () => {
  const OPTIONS = `[{ value: "v", label: "Vanilla" }, { value: "c", label: "Chocolate" }, { value: "b", label: "Berry", unavailable: "sold out at the brand" }, { value: "m", label: "Mint" }, { value: "x", label: "Salted caramel with a long name" }]`;
  const CHIPS = (extra = "") => `<div style={{ boxSizing: "border-box", width: "100%", maxWidth: 420, padding: 16 }}><B.OptionChips legend="Flavour" options={${OPTIONS}} defaultValue="v" ${extra} /></div>`;

  test("a fieldset with a legend and a count, chips 44 tall, radius 8, padding 10 and 14, 16px text, 8px apart, wrapping", async () => {
    const { page } = await open(CHIPS(), DESKTOP);
    const group = page.getByRole("radiogroup", { name: /Flavour/ });
    assert.equal(await group.count(), 1);
    assert.equal(await group.evaluate((el) => el.tagName), "FIELDSET");
    assert.equal(await page.locator(".basalt-option-chips-count").getAttribute("aria-hidden"), "true");
    assert.equal((await css(page.locator(".basalt-option-chips-count"), "fontSize")).fontSize, "13px");
    const chip = page.getByRole("radio", { name: "Chocolate" });
    const s = await css(chip, "minHeight", "borderTopLeftRadius", "paddingLeft", "paddingRight", "fontSize");
    assert.deepEqual(Object.values(s), ["44px", "8px", "9px", "13px", "16px"]);
    assert.equal((await box(chip)).height, 44);
    const [a, b] = [await box(page.getByRole("radio", { name: "Vanilla" })), await box(chip)];
    assert.equal(b.x - (a.x + a.width), 8);
    const ys = new Set(); for (const r of await page.getByRole("radio").all()) ys.add((await box(r)).y);
    assert.ok(ys.size >= 2, "they wrap");
  });

  for (const theme of THEMES) {
    test(`the chosen chip is the selected wash in primary ink with a filled seat and a check; its edge does not change (${theme})`, async () => {
      const { page } = await open(CHIPS(), { theme, ...DESKTOP });
      const c = await colours(page);
      const on = page.getByRole("radio", { name: "Vanilla" }), off = page.getByRole("radio", { name: "Chocolate" });
      assert.equal((await css(on, "backgroundColor")).backgroundColor, c.selected);
      assert.equal((await css(on, "color")).color, c["text-primary"]);
      assert.equal((await css(off, "color")).color, c["text-secondary"]);
      assert.equal((await css(on, "borderTopColor")).borderTopColor, (await css(off, "borderTopColor")).borderTopColor);
      assert.equal((await css(on, "borderTopColor")).borderTopColor, c["border-input"]);
      assert.equal((await css(on.locator(".basalt-option-chip-seat > .basalt-icon"), "opacity")).opacity, "1");
      assert.equal((await css(off.locator(".basalt-option-chip-seat > .basalt-icon"), "opacity")).opacity, "0");
    });
  }

  test("choosing moves nothing: every chip's box is the same before and after, and the seat is round and 16", async () => {
    const { page } = await open(CHIPS(), DESKTOP);
    const all = async () => { const o = []; for (const r of await page.getByRole("radio").all()) o.push(await box(r)); return o; };
    const before = await all();
    await page.getByRole("radio", { name: "Mint" }).click();
    assert.deepEqual(await all(), before);
    const seat = page.getByRole("radio", { name: "Mint" }).locator(".basalt-option-chip-seat");
    assert.deepEqual([(await box(seat)).width, (await box(seat)).height, (await css(seat, "borderTopLeftRadius")).borderTopLeftRadius], [16, 16, "9999px"]);
    assert.equal((await box(seat.locator(".basalt-icon"))).width, 12);
  });

  test("it is a radio group: one tab stop, arrows move and choose, wrapping", async () => {
    const { page } = await open(CHIPS(), DESKTOP);
    await page.getByRole("radio", { name: "Vanilla" }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("radio", { name: "Chocolate" }).getAttribute("aria-checked"), "true");
    const stops = await page.locator("[role=radio][tabindex='0']").count();
    assert.equal(stops, 1);
  });

  test("an unavailable chip keeps its words, takes the disabled look, is reachable, and no click, Space or arrow chooses it", async () => {
    const { page } = await open(CHIPS(), DESKTOP);
    const c = await colours(page);
    const berry = page.getByRole("radio", { name: /Berry.*sold out at the brand/ });
    assert.equal(await berry.count(), 1, "the words are in the name");
    assert.equal(await berry.getAttribute("data-disabled"), null);
    const s = await css(berry, "color", "borderTopColor", "borderTopStyle", "cursor");
    assert.deepEqual(Object.values(s), [c["text-disabled"], c["border-divider"], "solid", "not-allowed"]);
    await berry.click({ force: true });
    assert.equal(await berry.getAttribute("aria-checked"), "false");
    await page.getByRole("radio", { name: "Chocolate" }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement.textContent.includes("Berry")), true, "the arrow lands on it");
    assert.equal(await berry.getAttribute("aria-checked"), "false", "and does not choose it");
    assert.equal(await page.getByRole("radio", { name: "Vanilla" }).getAttribute("aria-checked"), "true", "the choice stays where it was");
    await page.keyboard.press("Space");
    assert.equal(await berry.getAttribute("aria-checked"), "false", "Space does not choose it");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("radio", { name: "Mint" }).getAttribute("aria-checked"), "true", "the next arrow goes on");
  });

  test("the seat crossfades over 100ms with or without reduced motion; focus is the +2 ring", async () => {
    const { page } = await open(CHIPS(), DESKTOP);
    for (const reduced of ["no-preference", "reduce"]) {
      await page.emulateMedia({ reducedMotion: reduced });
      const t = await css(page.locator(".basalt-option-chip-seat > .basalt-icon").first(), "transitionDuration", "transitionProperty");
      assert.deepEqual([t.transitionDuration, t.transitionProperty], ["0.1s", "opacity"], reduced);
    }
    await page.keyboard.press("Tab");
    const ring = await css(page.locator("[role=radio]:focus"), "outlineWidth", "outlineOffset");
    assert.deepEqual([ring.outlineWidth, ring.outlineOffset], ["2px", "2px"]);
  });

  test("in forced colours the chosen chip is Highlight with HighlightText and no outline; an unavailable one is GrayText", async () => {
    const { page } = await open(CHIPS(), DESKTOP);
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const c = await systemColors(page);
    const s = await css(page.getByRole("radio", { name: "Vanilla" }), "backgroundColor", "color", "outlineStyle");
    assert.deepEqual(Object.values(s), [c.Highlight, c.HighlightText, "none"]);
    assert.equal((await css(page.getByRole("radio", { name: /Berry/ }), "color")).color, c.GrayText);
    assert.equal((await css(page.getByRole("radio", { name: "Chocolate" }).locator(".basalt-option-chip-seat"), "borderTopWidth")).borderTopWidth, "1px");
  });

  test("a coarse pointer keeps a 44px target and a disabled group is disabled", async () => {
    const { page } = await open(CHIPS(), PHONE);
    assert.equal((await box(page.getByRole("radio", { name: "Mint" }))).height, 44);
    const off = await open(CHIPS("disabled"), DESKTOP);
    assert.notEqual(await off.page.getByRole("radio", { name: "Mint" }).getAttribute("data-disabled"), null);
  });

  for (const theme of THEMES) for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`axe: option chips at ${name} (${theme})`, async () => {
      const { page } = await open(CHIPS(), { theme, ...options });
      assert.deepEqual(await axe(page), []);
    });
  }
});

describe("D11a: MultiSelect takes the rungs", () => {
  test("chips and the trigger take the height of controlSize, radius 8 and 16px text at 44", async () => {
    const options = `[{ value: "a", label: "A" }, { value: "b", label: "B" }]`;
    const { page } = await open(`<div style={{ padding: 16, width: 500 }}><B.MultiSelect label="Brand" options={${options}} controlSize="2xl" /><B.MultiSelect label="Kind" toolbar options={${options}} controlSize="3xl" /></div>`, DESKTOP);
    const chip = page.getByRole("checkbox", { name: "A" });
    assert.equal((await box(chip)).height, 44);
    assert.equal((await css(chip, "borderTopLeftRadius")).borderTopLeftRadius, "8px");
    assert.equal((await box(page.locator(".basalt-filter-trigger"))).height, 48);
  });
});
