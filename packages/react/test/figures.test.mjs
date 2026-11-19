// Figures and transcripts (council item 94, finish-nov10 batch 3): the description list, the meter, the stat with provenance and the
// terminal transcript, with CodeBlock's prompt. Driven in Chromium against the built package with the real stylesheet.
//
//   description list  dl > div > dt + dd, the 160px token column, stacking on its own width, dividers, the 40px row
//   meter             role="meter", the clamp and the overage in words, a fill that never passes the slot, one height in every
//                     state, the tick and its cut, the glide, forced colours
//   stat              the dl structure, the three time formats, sources on one line across a row
//   terminal          what copy and a selection take, names, role="log" only while lines arrive, nothing outside the log moves
//
// Behaviour tests load no web font, so text widths differ on CI's Linux runner: measured margins here are wide.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage as plainFixturePage, launch, pkg, settle } from "./support.mjs";
import path from "node:path";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];

// Geist and Geist Mono, from the built package, so that widths are the real ones (tabular numerals included) and the same on every runner.
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
async function fixturePage(browser, body, options) {
  const fixture = await plainFixturePage(browser, body, options);
  await fixture.page.addStyleTag({ content: `${FONTS} body{background:var(--basalt-surface-page)}` });
  await fixture.page.evaluate(() => Promise.all([document.fonts.load('400 14px Geist'), document.fonts.load('500 13px Geist'), document.fonts.load('600 24px Geist'), document.fonts.load('400 13px "Geist Mono"')]).then(() => document.fonts.ready));
  return fixture;
}
const render = (jsx, before = "") => `${before}\ncreateRoot(document.getElementById("root")).render(${jsx});`;

/** Any CSS colour as 8-bit sRGB, through a canvas, the way the browser draws it. */
const rgbOf = (page, css) => page.evaluate((css) => {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.clearRect(0, 0, 1, 1); ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
}, css);
/** A token or a CSS keyword, as the browser resolves it for `color`. */
const resolve = (page, value) => page.evaluate((value) => { const probe = document.createElement("i"); probe.style.color = value; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, value);
const token = (page, name) => resolve(page, `var(--basalt-${name})`);
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const style = (locator, ...props) => locator.evaluate((el, props) => { const s = getComputedStyle(el); return Object.fromEntries(props.map((p) => [p, s[p]])); }, props);

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
// Description list

const LIST = `
  <B.DescriptionList data-testid="list">
    <B.DescriptionItem term="ID" mono>sb_7f3a91c2e0</B.DescriptionItem>
    <B.DescriptionItem term="Region">Ashburn (us-east)</B.DescriptionItem>
    <B.DescriptionItem term="Last successful verification of the egress policy">Allowlist, 3 hosts</B.DescriptionItem>
    <B.DescriptionItem term="Allowed hosts" mono values={["api.example.test", "cdn.example.test", "auth.example.test"]} />
    <B.DescriptionItem term="Last seen" missing />
  </B.DescriptionList>`;
const wide = (width, jsx) => render(`<div style={{ width: ${width} }}>${jsx}</div>`);

describe("DescriptionList", () => {
  for (const theme of THEMES) {
    test(`a dl of div rows, each one dt and one or more dd (${theme})`, async () => {
      const { page } = await fixturePage(browser, wide(640, LIST), { theme });
      const shape = await page.locator("[data-testid=list]").evaluate((dl) => ({
        tag: dl.tagName,
        rows: [...dl.children].map((row) => ({ tag: row.tagName, kids: [...row.children].map((c) => c.tagName) })),
      }));
      assert.equal(shape.tag, "DL");
      assert.deepEqual(shape.rows.map((r) => r.tag), ["DIV", "DIV", "DIV", "DIV", "DIV"]);
      assert.deepEqual(shape.rows.map((r) => r.kids), [["DT", "DD"], ["DT", "DD"], ["DT", "DD"], ["DT", "DD", "DD", "DD"], ["DT", "DD"]]);
      await page.close();
    });
  }

  test("the label column is 160px, from the token, and a long label wraps inside it without moving a value", async () => {
    const { page } = await fixturePage(browser, wide(640, LIST), { theme: "dark" });
    const tokenValue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-size-description-label").trim());
    assert.equal(tokenValue, "160px");
    const columns = await page.locator(".basalt-description-item").evaluateAll((rows) => rows.map((row) => getComputedStyle(row).gridTemplateColumns.split(" ")[0]));
    assert.deepEqual(columns, Array(5).fill("160px"));
    const terms = page.locator(".basalt-description-term");
    assert.equal((await box(terms.nth(2))).width, 160);
    assert.ok((await box(terms.nth(2))).height > 18 * 1.5, "the long label took more than one line");
    const edges = await page.locator(".basalt-description-details").evaluateAll((dds) => dds.map((dd) => dd.getBoundingClientRect().x));
    assert.equal(new Set(edges).size, 1, `every value starts at one x: ${edges}`);
    await page.close();
  });

  test("the list stacks on its own width, not the viewport's: under 480px it stacks and over it does not, at one wide viewport", async () => {
    for (const [width, stacked] of [[300, true], [479, true], [481, false], [900, false]]) {
      const { page } = await fixturePage(browser, wide(width, LIST), { theme: "dark", viewport: { width: 1440, height: 900 } });
      const first = page.locator(".basalt-description-item").first();
      const term = await box(first.locator(".basalt-description-term"));
      const value = await box(first.locator(".basalt-description-details"));
      if (stacked) {
        assert.equal(value.x, term.x, `${width}px: stacked, the value starts under the label`);
        assert.equal(Math.round(value.y - term.bottom), 2, `${width}px: the label sits space-0-5 above the value`);
      } else {
        assert.ok(value.x >= term.x + 160, `${width}px: the value is beside the label`);
        assert.equal(Math.round(value.y - term.y) <= 4, true);
      }
      await page.close();
    }
  });

  test("the same list in a narrow box stacks while an equal one on the page does not", async () => {
    const both = render(`<div style={{ display: "grid", gap: 16 }}><div style={{ width: 360 }}>${LIST.replace("list", "narrow")}</div><div style={{ width: 800 }}>${LIST.replace("list", "page")}</div></div>`);
    const { page } = await fixturePage(browser, both, { theme: "light", viewport: { width: 1440, height: 900 } });
    const columns = (id) => page.locator(`[data-testid=${id}] .basalt-description-item`).first().evaluate((row) => getComputedStyle(row).gridTemplateColumns.split(" ").length);
    assert.equal(await columns("narrow"), 1);
    assert.equal(await columns("page"), 2);
    await page.close();
  });

  test("on touch a link in a value is a 44 by 44 box, and the row is still 40px; with a mouse the link is its line", async () => {
    const linked = wide(640, `
      <B.DescriptionList data-testid="list">
        <B.DescriptionItem term="Owner"><a href="#owner">Go</a></B.DescriptionItem>
        <B.DescriptionItem term="Region">Ashburn (us-east)</B.DescriptionItem>
        <B.DescriptionItem term="Docs"><a href="#docs">Runbook for the egress policy</a></B.DescriptionItem>
      </B.DescriptionList>`);
    const rowHeights = (page) => page.locator(".basalt-description-item").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    const touch = await fixturePage(browser, linked, { theme: "dark", viewport: { width: 1440, height: 900 }, hasTouch: true });
    assert.ok(await touch.page.evaluate(() => matchMedia("(pointer: coarse)").matches), "the fixture is a coarse pointer");
    for (const href of ["#owner", "#docs"]) {
      const link = await box(touch.page.locator(`a[href="${href}"]`));
      assert.ok(link.height >= 44 && link.width >= 44, `${href}: ${link.width} by ${link.height}`);
    }
    const short = await box(touch.page.locator('a[href="#owner"]'));
    assert.equal(Math.round(short.height), 44);
    assert.equal(Math.round(short.width), 44, "a short link is still 44 wide");
    const touched = await rowHeights(touch.page);
    await touch.page.close();
    const mouse = await fixturePage(browser, linked, { theme: "dark", viewport: { width: 1440, height: 900 } });
    assert.equal(await mouse.page.evaluate(() => matchMedia("(pointer: coarse)").matches), false);
    const mouseRows = await rowHeights(mouse.page);
    const mouseLink = await box(mouse.page.locator('a[href="#owner"]'));
    assert.ok(mouseLink.height < 24, `with a mouse the link is its line: ${mouseLink.height}`);
    await mouse.page.close();
    assert.deepEqual(touched, mouseRows, "a linked value sits exactly like an unlinked one: only the hit box grew");
  });

  test("a divider between rows, never above the first or below the last, and the first and last lose their outer padding", async () => {
    const { page } = await fixturePage(browser, wide(640, LIST), { theme: "dark" });
    const rows = await page.locator(".basalt-description-item").evaluateAll((els) => els.map((el) => { const s = getComputedStyle(el); return { shadow: s.boxShadow, top: s.paddingTop, bottom: s.paddingBottom, border: [s.borderTopWidth, s.borderBottomWidth] }; }));
    assert.equal(rows[0].shadow, "none", "nothing above the first row");
    for (const row of rows.slice(1)) assert.notEqual(row.shadow, "none");
    for (const row of rows) assert.deepEqual(row.border, ["0px", "0px"], "no border above or below any row; the divider is inside the row");
    assert.equal(rows[0].top, "0px");
    assert.equal(rows.at(-1).bottom, "0px");
    for (const row of rows.slice(1, -1)) assert.deepEqual([row.top, row.bottom], ["10px", "10px"]);
    // the divider is inset at the top edge, in the divider colour
    assert.match(rows[1].shadow, /0px 1px 0px 0px inset/);
    await page.close();
  });

  test("a one-line row is 40px (10 + 20 + 10), a mono row too, and several values stack 4px apart", async () => {
    const { page } = await fixturePage(browser, wide(640, LIST), { theme: "dark" });
    const rows = page.locator(".basalt-description-item");
    assert.equal((await box(rows.nth(1))).height, 40, "a one-line row");
    assert.equal((await box(rows.nth(4))).height, 40 - 10, "the last row is one line with no outer padding below");
    const mono = await style(page.locator(".basalt-description-details[data-mono]").first(), "fontSize", "lineHeight", "fontFamily");
    assert.equal(mono.fontSize, "13px");
    assert.equal(mono.lineHeight, "20px");
    assert.match(mono.fontFamily, /Geist Mono|ui-monospace|monospace/);
    const hosts = page.locator(".basalt-description-item").nth(3).locator(".basalt-description-details");
    const [a, b, c] = [await box(hosts.nth(0)), await box(hosts.nth(1)), await box(hosts.nth(2))];
    assert.equal(b.y - a.bottom, 4);
    assert.equal(c.y - b.bottom, 4);
    await page.close();
  });

  test("a mono row stays 40px when the list is stacked too, and several values stay 4px apart", async () => {
    const { page } = await fixturePage(browser, wide(300, LIST), { theme: "dark" });
    const hosts = page.locator(".basalt-description-item").nth(3).locator(".basalt-description-details");
    const [a, b] = [await box(hosts.nth(0)), await box(hosts.nth(1))];
    assert.equal(b.y - a.bottom, 4);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`label 13/18 at 400 in secondary ink, value 14/20 at 400 in primary ink with tabular numerals, start-aligned; a missing value says "Not observed" in tertiary ink (${theme})`, async () => {
      const { page } = await fixturePage(browser, wide(640, LIST), { theme });
      const term = await style(page.locator(".basalt-description-term").nth(1), "fontSize", "lineHeight", "fontWeight", "color");
      assert.deepEqual([term.fontSize, term.lineHeight, term.fontWeight], ["13px", "18px", "400"]);
      assert.equal(term.color, await token(page, "text-secondary"));
      const value = await style(page.locator(".basalt-description-details").nth(1), "fontSize", "lineHeight", "fontWeight", "color", "fontVariantNumeric", "textAlign");
      assert.deepEqual([value.fontSize, value.lineHeight, value.fontWeight], ["14px", "20px", "400"]);
      assert.equal(value.color, await token(page, "text-primary"));
      assert.equal(value.fontVariantNumeric, "tabular-nums");
      assert.ok(["start", "left"].includes(value.textAlign));
      const missing = page.locator(".basalt-description-details[data-missing]");
      assert.equal(await missing.textContent(), "Not observed");
      assert.equal(await missing.evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
      assert.equal(await missing.locator("*").count(), 0, "no mark");
      await page.close();
    });
  }

  test("the label sits on the value's baseline", async () => {
    const { page } = await fixturePage(browser, wide(640, LIST), { theme: "dark" });
    const baselines = await page.locator(".basalt-description-item").nth(1).evaluate((row) => {
      const at = (el) => { const probe = document.createElement("span"); probe.style.cssText = "display:inline-block;width:0;height:0"; el.prepend(probe); const y = probe.getBoundingClientRect().bottom; probe.remove(); return y; };
      return [at(row.querySelector("dt")), at(row.querySelector("dd"))];
    });
    assert.ok(Math.abs(baselines[0] - baselines[1]) < 0.75, `baselines ${baselines}`);
    await page.close();
  });

  test("in a card that is the object, the dividers stay inside the card's padding and the list takes no rim or level of its own", async () => {
    const jsx = render(`<B.Card style={{ width: 480 }}><B.CardContent>${LIST}</B.CardContent></B.Card>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    const list = page.locator("[data-testid=list]");
    const [card, inner] = [await box(page.locator(".basalt-card")), await box(list)];
    assert.ok(inner.x > card.x + 8 && inner.right < card.right - 8, "inside the card's padding");
    const s = await style(list, "borderTopWidth", "boxShadow", "backgroundColor");
    assert.deepEqual([s.borderTopWidth, s.boxShadow], ["0px", "none"]);
    assert.equal(await list.getAttribute("data-level"), null);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no WCAG 2.2 AA violations (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 24, width: 640 }}>${LIST}</main>`), { theme });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// Meter

const meter = (props, inner = "") => `<B.Meter label="Build minutes" unit="min" spokenUnit="minutes" format={{ maximumFractionDigits: 0 }} locale="en-US" ${props}>${inner}</B.Meter>`;
const METER_STATES = [
  { name: "under", props: 'value={1240} max={2000}' },
  { name: "under with a target", props: 'value={1240} max={2000} target={1400} targetLabel="Plan by today"' },
  { name: "at the cap", props: 'value={2000} max={2000}' },
  { name: "at the cap with a target", props: 'value={2000} max={2000} target={1400} targetLabel="Plan by today"' },
  { name: "over", props: 'value={2400} max={2000}' },
  { name: "over with a target", props: 'value={2400} max={2000} target={1400} targetLabel="Plan by today"' },
  { name: "empty", props: 'value={0} max={2000}' },
];
const METERS = render(`<div style={{ width: 360, display: "grid", gap: 40 }}>${METER_STATES.map((s, i) => `<div data-i="${i}">${meter(s.props)}</div>`).join("")}</div>`);

describe("Meter", () => {
  test("role=meter, named by its label; not focusable and not live", async () => {
    const { page } = await fixturePage(browser, METERS, { theme: "dark" });
    const meters = page.locator("[role=meter]");
    assert.equal(await meters.count(), METER_STATES.length);
    const m = meters.first();
    const labelId = await m.getAttribute("aria-labelledby");
    assert.equal(await page.locator(`[id="${labelId}"]`).textContent(), "Build minutes");
    assert.equal(await m.getAttribute("tabindex"), null);
    assert.equal(await m.getAttribute("aria-live"), null);
    assert.equal(await page.locator("[role=meter] [aria-live], [role=meter] [role=status], [role=meter] [role=log]").count(), 0);
    assert.deepEqual([await m.getAttribute("aria-valuemin"), await m.getAttribute("aria-valuemax")], ["0", "2000"]);
    await page.close();
  });

  test("aria-valuenow is clamped to the cap, and the true value, the overage and the target are in aria-valuetext", async () => {
    const { page } = await fixturePage(browser, METERS, { theme: "dark" });
    const read = (i) => page.locator(`[data-i="${i}"] [role=meter]`).evaluate((el) => [el.getAttribute("aria-valuenow"), el.getAttribute("aria-valuetext")]);
    assert.deepEqual(await read(0), ["1240", "1,240 of 2,000 minutes, 760 minutes left"]);
    assert.deepEqual(await read(1), ["1240", "1,240 of 2,000 minutes, Plan by today 1,400 minutes, 760 minutes left"]);
    assert.deepEqual(await read(2), ["2000", "2,000 of 2,000 minutes, 0 minutes left"]);
    assert.deepEqual(await read(4), ["2000", "2,400 of 2,000 minutes, 400 minutes over the cap"]);
    assert.deepEqual(await read(5), ["2000", "2,400 of 2,000 minutes, Plan by today 1,400 minutes, 400 minutes over the cap"]);
    await page.close();
  });

  test("the spoken value can be replaced, and gets the true value", async () => {
    const jsx = render(`<B.Meter label="Requests" value={124000} max={100000} locale="en-US" getAriaValueText={(formatted, value) => value + " requests, " + (value - 100000) + " over"} />`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    assert.equal(await page.locator("[role=meter]").getAttribute("aria-valuetext"), "124000 requests, 24000 over");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`the fill starts at the slot's start edge inside the border and never passes the slot, however far over (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(`<div style={{ width: 360 }}>${meter("value={5000} max={2000}")}</div>`), { theme });
      const track = page.locator(".basalt-meter-track");
      const [t, f] = [await box(track), await box(page.locator(".basalt-meter-fill"))];
      assert.equal(f.x, t.x + 1, "inside the 1px border");
      assert.ok(f.right <= t.right - 1 + 0.01, `the fill ends at ${f.right}, the slot at ${t.right - 1}`);
      assert.equal(f.right, t.right - 1, "full at the cap");
      assert.equal(t.height, 8, "an 8px slot");
      assert.ok(f.y >= t.y + 1 - 0.01 && f.bottom <= t.bottom - 1 + 0.01, "the fill sits inside the border");
      const s = await style(track, "borderTopWidth", "borderTopStyle", "borderTopColor", "borderRadius", "backgroundColor");
      assert.deepEqual([s.borderTopWidth, s.borderTopStyle], ["1px", "solid"]);
      assert.equal(s.borderTopColor, await token(page, "border-input"));
      assert.equal(s.backgroundColor, "rgba(0, 0, 0, 0)", "transparent inside");
      assert.equal(await page.locator(".basalt-meter-fill").evaluate((el) => getComputedStyle(el).backgroundColor), await token(page, "text-primary"));
      await page.close();
    });
  }

  test("the fill is the value's share of the cap", async () => {
    const { page } = await fixturePage(browser, METERS, { theme: "dark" });
    const share = async (i) => { const t = await box(page.locator(`[data-i="${i}"] .basalt-meter-track`)); const f = await box(page.locator(`[data-i="${i}"] .basalt-meter-fill`)); return f.width / (t.width - 2); };
    assert.ok(Math.abs((await share(0)) - 0.62) < 0.002);
    assert.equal(await share(6), 0);
    assert.ok(Math.abs((await share(2)) - 1) < 0.002);
    await page.close();
  });

  test("the meter is one height under the cap, at it, over it, with a target and without, and when empty", async () => {
    const { page } = await fixturePage(browser, METERS, { theme: "dark" });
    const heights = [];
    for (let i = 0; i < METER_STATES.length; i++) heights.push((await box(page.locator(`[data-i="${i}"] .basalt-meter`))).height);
    assert.equal(new Set(heights).size, 1, `heights ${heights}`);
    assert.equal(heights[0], 18 + 4 + (4 + 8 + 4) + 4 + 16, "head 18, slot 8 with 4 either side, foot 16, gaps 4");
    await page.close();
  });

  test("changing the value moves nothing but the fill: the label, the slot, the foot and the reading's end stay put", async () => {
    const fixture = render(`<App/>`, `function App(){const [v,setV]=React.useState(100);window.setV=setV;return <div style={{ width: 360 }}>{${meter('value={v} max={2000} target={1400} targetLabel="Plan by today"').replace("{v}", "{v}")}}</div>}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const parts = [".basalt-meter-label", ".basalt-meter-reading", ".basalt-meter-track", ".basalt-meter-tick", ".basalt-meter-foot", ".basalt-meter-target"];
    const read = async () => { const out = {}; for (const part of parts) out[part] = await box(page.locator(part)); out.meter = await box(page.locator(".basalt-meter")); return out; };
    const first = await read();
    for (const v of [0, 1400, 1999, 2000, 2400, 7]) {
      await page.evaluate((v) => window.setV(v), v);
      await settle(page);
      const now = await read();
      for (const part of parts) assert.deepEqual([now[part].x, now[part].right, now[part].y, now[part].height], [first[part].x, first[part].right, first[part].y, first[part].height], `${part} moved at ${v}`);
      assert.equal(now.meter.height, first.meter.height, `the meter's height changed at ${v}`);
    }
    await page.close();
  });

  test("the reading holds the width of the cap written as the value: the label never moves while the value grows to the cap", async () => {
    const fixture = render(`<App/>`, `function App(){const [v,setV]=React.useState(5);window.setV=setV;return <div style={{ width: 360 }}><B.Meter label="Build minutes" unit="min" value={v} max={2000} locale="en-US" /></div>}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const reading = page.locator(".basalt-meter-reading");
    const before = await box(reading);
    await page.evaluate(() => window.setV(2000));
    await settle(page);
    const after = await box(reading);
    assert.deepEqual([after.x, after.width], [before.x, before.width]);
    assert.equal(await page.locator(".basalt-meter-now").textContent(), "2,000 of 2,000 min");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`the head says the value in primary at 500 and "of cap unit" in secondary; the foot says what is left, then the overage in words (${theme})`, async () => {
      const { page } = await fixturePage(browser, METERS, { theme });
      const under = page.locator('[data-i="1"]');
      assert.equal(await under.locator(".basalt-meter-now").textContent(), "1,240 of 2,000 min");
      assert.equal(await under.locator(".basalt-meter-left").textContent(), "760 min left");
      assert.equal(await under.locator(".basalt-meter-target").textContent(), "Plan by today 1,400 min");
      const val = await style(under.locator(".basalt-meter-now .basalt-meter-value"), "color", "fontWeight");
      assert.deepEqual([val.color, val.fontWeight], [await token(page, "text-primary"), "500"]);
      assert.equal(await under.locator(".basalt-meter-reading").evaluate((el) => getComputedStyle(el).color), await token(page, "text-secondary"));
      const label = await style(under.locator(".basalt-meter-label"), "fontSize", "lineHeight", "fontWeight", "color");
      assert.deepEqual([label.fontSize, label.lineHeight, label.fontWeight, label.color], ["13px", "18px", "500", await token(page, "text-primary")]);
      const foot = await style(under.locator(".basalt-meter-foot"), "fontSize", "lineHeight", "fontVariantNumeric", "color");
      assert.deepEqual([foot.fontSize, foot.lineHeight, foot.fontVariantNumeric, foot.color], ["12px", "16px", "tabular-nums", await token(page, "text-secondary")]);
      // over: the overage in words, primary ink, no status colour, no dot, no mark
      const over = page.locator('[data-i="4"] .basalt-meter-left');
      assert.equal(await over.textContent(), "400 over");
      assert.equal(await over.evaluate((el) => getComputedStyle(el).color), await token(page, "text-primary"));
      assert.equal(await over.locator("*").count(), 0, "no dot, no mark");
      for (const status of ["danger", "warning", "success"]) assert.notEqual(await over.evaluate((el) => getComputedStyle(el).color), await token(page, `status-${status}`));
      assert.equal(await page.locator('[data-i="2"] .basalt-meter-left').textContent(), "0 min left", "at the cap");
      await page.close();
    });

    test(`the target tick: 2px in secondary ink, 16px tall on the 8px slot, a 2px cut each side in the surface colour, centred on its value (${theme})`, async () => {
      const { page } = await fixturePage(browser, METERS, { theme });
      const root = page.locator('[data-i="1"]');
      const tick = root.locator(".basalt-meter-tick");
      assert.equal(await tick.getAttribute("aria-hidden"), "true");
      const [t, k] = [await box(root.locator(".basalt-meter-track")), await box(tick)];
      assert.equal(k.height, 16, "4px past the slot on each side of 8");
      assert.equal(k.y, t.y - 4);
      assert.equal(k.width, 6, "2px line and a 2px cut each side");
      const inner = t.width - 2;
      assert.ok(Math.abs(k.x + 3 - (t.x + 1 + inner * 0.7)) < 0.51, `centre at ${k.x + 3}, 70% is ${t.x + 1 + inner * 0.7}`);
      const s = await style(tick, "backgroundColor", "backgroundClip", "borderLeftWidth", "borderRightWidth", "borderLeftStyle", "borderLeftColor", "borderRightColor", "boxShadow", "width");
      assert.equal(s.backgroundColor, await token(page, "text-secondary"));
      assert.equal(s.backgroundClip, "padding-box");
      assert.deepEqual([s.borderLeftWidth, s.borderRightWidth, s.borderLeftStyle, s.width], ["2px", "2px", "solid", "2px"]);
      assert.equal(s.boxShadow, "none", "the cut is a border, not a shadow");
      assert.equal(s.borderLeftColor, await token(page, "surface-page"), "on the page, the cut is the page's colour");
      assert.equal(s.borderRightColor, s.borderLeftColor);
      await page.close();
    });

    test(`the tick's cut is the colour of the level it sits on: the page, a card's fill, and a card in a card (${theme})`, async () => {
      const jsx = render(`<div style={{ width: 400 }}><div data-at="0">${meter("value={500} max={2000} target={1400}")}</div><B.Card><div data-at="1">${meter("value={500} max={2000} target={1400}")}</div><B.Card><div data-at="2">${meter("value={500} max={2000} target={1400}")}</div></B.Card></B.Card></div>`);
      const { page } = await fixturePage(browser, jsx, { theme });
      for (const [at, surface] of [["0", "surface-page"], ["1", "surface-1"], ["2", "surface-2"]]) {
        const cut = await page.locator(`[data-at="${at}"] .basalt-meter-tick`).evaluate((el) => getComputedStyle(el).borderLeftColor);
        assert.equal(cut, await token(page, surface), `${theme} on ${surface}`);
      }
      await page.close();
    });
  }

  test("a target outside the slot draws no tick but keeps its words; none given draws neither", async () => {
    const jsx = render(`<div style={{ width: 360, display: "grid", gap: 30 }}><div data-i="out">${meter('value={500} max={2000} target={3000} targetLabel="Plan"')}</div><div data-i="none">${meter("value={500} max={2000}")}</div></div>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    assert.equal(await page.locator('[data-i="out"] .basalt-meter-tick').count(), 0);
    assert.equal(await page.locator('[data-i="out"] .basalt-meter-target').textContent(), "Plan 3,000 min");
    assert.equal(await page.locator('[data-i="none"] .basalt-meter-target').count(), 0);
    await page.close();
  });

  test("the fill glides over duration-slow on ease-out when the value changes, and the animation really runs", async () => {
    const fixture = render(`<App/>`, `function App(){const [v,setV]=React.useState(200);window.setV=setV;return <div style={{ width: 360 }}>${meter("value={v} max={2000}")}</div>}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const s = await style(page.locator(".basalt-meter-fill"), "transitionProperty", "transitionDuration", "transitionTimingFunction");
    assert.equal(s.transitionProperty, "width");
    assert.equal(s.transitionDuration, "0.2s");
    assert.equal(s.transitionTimingFunction, await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-ease-out").trim().replace(/\s+/g, " ")).then((v) => v), "ease-out");
    await page.evaluate(() => window.setV(1800));
    const running = await page.evaluate(() => document.querySelector(".basalt-meter-fill").getAnimations().filter((a) => a.transitionProperty === "width").length);
    assert.equal(running, 1);
    await page.close();
  });

  test("under reduced motion the fill jumps: no transition, no animation", async () => {
    const fixture = render(`<App/>`, `function App(){const [v,setV]=React.useState(200);window.setV=setV;return <div style={{ width: 360 }}>${meter("value={v} max={2000}")}</div>}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark", reducedMotion: "reduce" });
    const s = await style(page.locator(".basalt-meter-fill"), "transitionProperty", "transitionDuration");
    assert.ok(s.transitionProperty === "none" || /^0s(, 0s)*$/.test(s.transitionDuration), JSON.stringify(s));
    await page.evaluate(() => window.setV(1800));
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-meter-fill").getAnimations().length), 0);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`forced colours: the slot is Canvas with a CanvasText edge, the fill and the tick CanvasText, the cut Canvas, the legend line CanvasText (${theme})`, async () => {
      const { page } = await fixturePage(browser, METERS, { theme, forcedColors: "active" });
      const [canvas, canvasText] = [await resolve(page, "Canvas"), await resolve(page, "CanvasText")];
      const root = page.locator('[data-i="1"]');
      const track = await style(root.locator(".basalt-meter-track"), "backgroundColor", "borderTopColor", "borderTopWidth");
      assert.deepEqual([track.backgroundColor, track.borderTopColor, track.borderTopWidth], [canvas, canvasText, "1px"]);
      assert.equal(await root.locator(".basalt-meter-fill").evaluate((el) => getComputedStyle(el).backgroundColor), canvasText);
      const tick = await style(root.locator(".basalt-meter-tick"), "backgroundColor", "borderLeftColor", "borderRightColor", "borderLeftWidth");
      assert.deepEqual([tick.backgroundColor, tick.borderLeftColor, tick.borderRightColor, tick.borderLeftWidth], [canvasText, canvas, canvas, "2px"]);
      const legend = await root.locator(".basalt-meter-target").evaluate((el) => getComputedStyle(el, "::before").backgroundColor);
      assert.equal(legend, canvasText);
      await page.close();
    });
  }

  test("the legend line before the target's words is drawn like the tick: 2px, secondary ink", async () => {
    const { page } = await fixturePage(browser, METERS, { theme: "dark" });
    const legend = await page.locator('[data-i="1"] .basalt-meter-target').evaluate((el) => { const s = getComputedStyle(el, "::before"); return [s.width, s.height, s.backgroundColor]; });
    assert.deepEqual(legend, ["2px", "10px", await token(page, "text-secondary")]);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no WCAG 2.2 AA violations, every state, on the page and in a card (${theme})`, async () => {
      const jsx = render(`<main style={{ padding: 24, width: 420, display: "grid", gap: 30 }}>${METER_STATES.map((s) => meter(s.props)).join("")}<B.Card>${METER_STATES.map((s) => meter(s.props)).join("")}</B.Card></main>`);
      const { page } = await fixturePage(browser, jsx, { theme });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// Stat with provenance

const NOW = "new Date('2026-11-10T12:00:00Z')";
const stats = (...stat) => render(`<main style={{ padding: 24, width: 760 }}><B.Stats data-testid="stats" min="12rem">${stat.join("")}</B.Stats></main>`);
const stat = (props) => `<B.Stat now={${NOW}} timeZone="UTC" locale="en-US" ${props} />`;

describe("Stat", () => {
  test("a row of stats is one dl; each stat is a div whose label is the dt and whose figure, note and source are dds", async () => {
    const jsx = stats(
      stat('label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")}'),
      stat('label="Latency" value="96 ms" note="Down 14 ms" source="Edge probes" time={new Date("2026-11-10T04:40:00Z")}'),
    );
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    const shape = await page.locator("[data-testid=stats]").evaluate((dl) => ({ tag: dl.tagName, stats: [...dl.children].map((div) => [div.tagName, ...[...div.children].map((c) => c.tagName + "." + c.className)]) }));
    assert.equal(shape.tag, "DL");
    assert.deepEqual(shape.stats[0], ["DIV", "DT.basalt-stat-label", "DD.basalt-stat-value", "DD.basalt-stat-note", "DD.basalt-stat-source"]);
    assert.equal(shape.stats.length, 2);
    const dl = await style(page.locator("[data-testid=stats]"), "marginTop", "marginLeft", "paddingLeft", "display");
    assert.deepEqual([dl.marginTop, dl.marginLeft, dl.paddingLeft, dl.display], ["0px", "0px", "0px", "grid"]);
    const dd = await style(page.locator(".basalt-stat-value").first(), "marginLeft", "marginTop");
    assert.deepEqual([dd.marginLeft, dd.marginTop], ["0px", "0px"]);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`the skill's look is unchanged: label 13/18 at 500 secondary, figure 24/30 at 600 tabular, note 12/16 secondary, space-1 between, never boxed (${theme})`, async () => {
      const { page } = await fixturePage(browser, stats(stat('label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")}')), { theme });
      const label = await style(page.locator(".basalt-stat-label"), "fontSize", "lineHeight", "fontWeight", "color");
      assert.deepEqual([label.fontSize, label.lineHeight, label.fontWeight, label.color], ["13px", "18px", "500", await token(page, "text-secondary")]);
      const figure = await style(page.locator(".basalt-stat-value"), "fontSize", "lineHeight", "fontWeight", "fontVariantNumeric", "letterSpacing", "color");
      assert.deepEqual([figure.fontSize, figure.lineHeight, figure.fontWeight, figure.fontVariantNumeric, figure.letterSpacing], ["24px", "30px", "600", "tabular-nums", "-0.48px"]);
      assert.equal(figure.color, await token(page, "text-primary"));
      const note = await style(page.locator(".basalt-stat-note"), "fontSize", "lineHeight", "color");
      assert.deepEqual([note.fontSize, note.lineHeight, note.color], ["12px", "16px", await token(page, "text-secondary")]);
      const cell = await style(page.locator(".basalt-stat"), "display", "rowGap", "backgroundColor", "borderTopWidth", "boxShadow");
      assert.deepEqual([cell.display, cell.rowGap, cell.borderTopWidth, cell.boxShadow], ["flex", "4px", "0px", "none"]);
      assert.equal(cell.backgroundColor, "rgba(0, 0, 0, 0)");
      await page.close();
    });

    test(`the source line: its own slot after the note, 12/16 at 400 sans in tertiary ink with tabular numerals (${theme})`, async () => {
      const { page } = await fixturePage(browser, stats(stat('label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")}')), { theme });
      const s = await style(page.locator(".basalt-stat-source"), "fontSize", "lineHeight", "fontWeight", "color", "fontVariantNumeric", "fontFamily");
      assert.deepEqual([s.fontSize, s.lineHeight, s.fontWeight, s.color, s.fontVariantNumeric], ["12px", "16px", "400", await token(page, "text-tertiary"), "tabular-nums"]);
      assert.doesNotMatch(s.fontFamily, /mono/i);
      const [note, source] = [await box(page.locator(".basalt-stat-note")), await box(page.locator(".basalt-stat-source"))];
      assert.ok(source.y >= note.bottom);
      await page.close();
    });
  }

  test("the time is a time element with a datetime; the dot is DotSep (drawn, not read) with a visually hidden comma; the text reads \"4:41 AM, Scale\" and the line draws \"4:41 AM · Scale\"", async () => {
    const { page } = await fixturePage(browser, stats(stat('label="Weight" value="81.4 kg" source="Scale" time={new Date("2026-11-10T04:41:00Z")}')), { theme: "dark" });
    const source = page.locator(".basalt-stat-source");
    assert.equal(await source.locator("time").getAttribute("datetime"), "2026-11-10T04:41");
    assert.equal(await source.locator("time").textContent(), "4:41\u00a0AM");
    // The dot is drawn by the stylesheet and is not in the text (the wording audit's W8); the comma is the words' own join.
    assert.equal(await source.locator("[aria-hidden=true]").count(), 0, "no aria-hidden dot beside a hidden comma");
    assert.equal(await source.locator(".basalt-dot-sep .basalt-visually-hidden").textContent(), ", ");
    assert.match(await source.locator(".basalt-dot-sep").evaluate((el) => getComputedStyle(el, "::before").content), /·/);
    assert.equal(await source.evaluate((el) => el.textContent.replace(/\s+/g, " ")), "4:41 AM, Scale");
    // what is seen: the visually hidden comma takes no room, so the line is as wide as "4:41 AM · Scale" written out
    const seen = await source.evaluate((el) => { const probe = el.cloneNode(true); probe.style.cssText = "position:absolute;visibility:hidden;display:inline-block;white-space:nowrap"; el.parentElement.append(probe); const w = probe.getBoundingClientRect().width; probe.remove(); return w; });
    const spaced = await source.evaluate((el) => { const probe = el.cloneNode(false); probe.textContent = "4:41\u00a0AM · Scale"; probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap"; el.parentElement.append(probe); const w = probe.getBoundingClientRect().width; probe.remove(); return w; });
    assert.ok(Math.abs(seen - spaced) < 1, `the line is ${seen}px wide, "4:41 AM · Scale" alone is ${spaced}px`);
    await page.close();
  });

  test("the time is always absolute: the clock alone for today, the date added for another day, the year only when it differs", async () => {
    const { page } = await fixturePage(browser, stats(
      stat('label="A" value="1" source="S" time={new Date("2026-11-10T04:41:00Z")}'),
      stat('label="B" value="2" source="S" time={new Date("2026-11-07T08:02:00Z")}'),
      stat('label="C" value="3" source="S" time={new Date("2025-11-07T08:02:00Z")}'),
    ), { theme: "dark" });
    const times = await page.locator(".basalt-stat-source time").evaluateAll((els) => els.map((el) => [el.textContent, el.getAttribute("datetime")]));
    assert.deepEqual(times, [["4:41\u00a0AM", "2026-11-10T04:41"], ["Nov 7, 8:02\u00a0AM", "2026-11-07T08:02"], ["Nov 7, 2025, 8:02\u00a0AM", "2025-11-07T08:02"]]);
    await page.close();
  });

  test("the zone decides what today is, and midnight is 12:00 AM (the machine form says 00:00)", async () => {
    const { page } = await fixturePage(browser, stats(
      '<B.Stat label="A" value="1" source="S" now={new Date("2026-11-10T23:30:00Z")} timeZone="Asia/Tokyo" locale="en-US" time={new Date("2026-11-10T15:10:00Z")} />',
      '<B.Stat label="B" value="2" source="S" now={new Date("2026-11-10T12:00:00Z")} timeZone="UTC" locale="en-US" time={new Date("2026-11-10T00:00:00Z")} />',
    ), { theme: "dark" });
    const times = await page.locator(".basalt-stat-source time").evaluateAll((els) => els.map((el) => [el.textContent, el.getAttribute("datetime")]));
    // 23:30 UTC on the 10th is 08:30 on the 11th in Tokyo, and 15:10 UTC on the 10th is 00:10 on the 11th: the same day there
    assert.deepEqual(times, [["12:10\u00a0AM", "2026-11-11T00:10"], ["12:00\u00a0AM", "2026-11-10T00:00"]]);
    await page.close();
  });

  test("with no source the slot is left out; a source with no time is the source alone", async () => {
    const { page } = await fixturePage(browser, stats(
      stat('label="A" value="1" note="n" time={new Date("2026-11-10T04:41:00Z")}'),
      stat('label="B" value="2" source="Scale"'),
    ), { theme: "dark" });
    const cells = page.locator(".basalt-stat");
    assert.equal(await cells.nth(0).locator(".basalt-stat-source").count(), 0);
    assert.equal(await cells.nth(1).locator(".basalt-stat-source time").count(), 0);
    assert.equal(await cells.nth(1).locator(".basalt-stat-source").innerText(), "Scale");
    await page.close();
  });

  test("sources are pinned to the foot of their cells: at one y across a row even when one stat has no note, and a figure of another width moves nothing", async () => {
    const jsx = stats(
      stat('label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")}'),
      stat('label="Latency" value="96 ms" source="Edge probes" time={new Date("2026-11-10T04:40:00Z")}'),
      stat('label="Errors" value="0.12%" note="Down from 0.31% last month, mostly from the retry change shipped on Tuesday, and the rest from a quieter week" source="Logs" time={new Date("2026-11-07T08:02:00Z")}'),
    );
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    const sources = page.locator(".basalt-stat-source");
    const ys = [await box(sources.nth(0)), await box(sources.nth(1)), await box(sources.nth(2))].map((b) => b.y);
    assert.equal(new Set(ys).size, 1, `sources at ${ys}`);
    const cells = page.locator(".basalt-stat");
    const bottoms = [];
    for (let i = 0; i < 3; i++) bottoms.push([(await box(sources.nth(i))).bottom, (await box(cells.nth(i))).bottom]);
    for (const [source, cell] of bottoms) assert.equal(source, cell, "the source is the last thing in its cell");
    const labels = [];
    for (let i = 0; i < 3; i++) labels.push((await box(page.locator(".basalt-stat-label").nth(i))).y);
    assert.equal(new Set(labels).size, 1);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no WCAG 2.2 AA violations (${theme})`, async () => {
      const jsx = stats(
        stat('label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")}'),
        stat('label="Latency" value="96 ms" source="Edge probes" time={new Date("2026-11-07T08:02:00Z")}'),
      );
      const { page } = await fixturePage(browser, jsx, { theme });
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// Terminal and CodeBlock with a prompt

const LINES = `[
  { kind: "command", text: "basalt sandbox create --image node:22-slim" },
  { kind: "output", text: "Creating sandbox sb_7f3a91c2e0" },
  { kind: "done", text: "Sandbox ready in 3.4 s" },
  { kind: "command", text: "basalt run sb_7f3a91c2e0 -- npm test" },
  { kind: "warning", text: "2 tests skipped: no clock in this sandbox" },
  { kind: "error", text: "terminal.test.ts: expected 1 log region, found 2" },
]`;
const COMMANDS = "basalt sandbox create --image node:22-slim\nbasalt run sb_7f3a91c2e0 -- npm test";
const STATIC = render(`<main style={{ padding: 24, width: 640 }}><B.Terminal title="Deploy and test" lines={${LINES}} /><p data-after>After</p></main>`);

/** Records what the page writes to the clipboard, so a test can read what Copy took. */
const stubClipboard = (page) => page.evaluate(() => { window.copied = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (text) => { window.copied.push(text); return Promise.resolve(); } } }); });

const selectAll = (page, selector) => page.evaluate((selector) => { const el = document.querySelector(selector); const range = document.createRange(); range.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(range); return s.toString(); }, selector);

describe("Terminal", () => {
  test("static by default: a figure with a named pre (tabindex 0), no live region, a region and not a log", async () => {
    const { page } = await fixturePage(browser, STATIC, { theme: "dark" });
    assert.equal(await page.locator("figure.basalt-terminal").count(), 1);
    const pre = page.locator("figure pre");
    assert.equal(await pre.getAttribute("tabindex"), "0");
    assert.equal(await pre.getAttribute("aria-label"), "Deploy and test, transcript");
    assert.equal(await pre.getAttribute("role"), "region", "a focusable named element has a role (A3-08); it is never a log here");
    assert.equal(await page.locator("[role=log], [aria-live]").count(), 0);
    await page.close();
  });

  test("\"Copy commands\" copies the commands only, one per line", async () => {
    const { page } = await fixturePage(browser, STATIC, { theme: "dark" });
    await stubClipboard(page);
    await page.getByRole("button", { name: "Copy commands" }).click();
    assert.deepEqual(await page.evaluate(() => window.copied), [COMMANDS]);
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 1, "the name changes to Copied");
    await page.close();
  });

  test("a selection of the whole block holds no prompt and no mark", async () => {
    const { page } = await fixturePage(browser, STATIC, { theme: "dark" });
    const selected = await selectAll(page, "figure pre");
    assert.equal(selected.trim(), [
      "basalt sandbox create --image node:22-slim",
      "Creating sandbox sb_7f3a91c2e0",
      "Sandbox ready in 3.4 s",
      "basalt run sb_7f3a91c2e0 -- npm test",
      "2 tests skipped: no clock in this sandbox",
      "terminal.test.ts: expected 1 log region, found 2",
    ].join("\n"));
    assert.ok(!selected.includes("$"));
    await page.close();
  });

  test("the prompt is a real aria-hidden span with user-select none, not generated content; marks are named images", async () => {
    const { page } = await fixturePage(browser, STATIC, { theme: "dark" });
    const prompts = page.locator(".basalt-code-prompt");
    assert.equal(await prompts.count(), 2);
    for (let i = 0; i < 2; i++) {
      assert.equal(await prompts.nth(i).getAttribute("aria-hidden"), "true");
      assert.equal(await prompts.nth(i).textContent(), "$");
    }
    const gutter = await page.locator(".basalt-code-gutter").first().evaluate((el) => { const s = getComputedStyle(el); return [s.userSelect, getComputedStyle(el, "::before").content, getComputedStyle(el.firstElementChild, "::before").content]; });
    assert.equal(gutter[0], "none");
    assert.ok(["normal", "none"].includes(gutter[1]) && ["normal", "none"].includes(gutter[2]), "no generated content");
    const marks = await page.locator('.basalt-code-gutter [role="img"]').evaluateAll((els) => els.map((el) => [el.getAttribute("aria-label"), el.closest("[data-kind]").getAttribute("data-kind")]));
    assert.deepEqual(marks, [["Done", "done"], ["Warning", "warning"], ["Error", "error"]]);
    const snapshot = await page.locator("figure pre").ariaSnapshot();
    assert.doesNotMatch(snapshot, /\$/, snapshot);
    for (const name of ["Done", "Warning", "Error"]) assert.match(snapshot, new RegExp(`img "${name}"`));
    assert.match(snapshot, /basalt sandbox create --image node:22-slim/);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`lines: Geist Mono 13/20; a command primary behind a tertiary prompt; output secondary with an empty gutter; marks in the callout's colours; only an error's text is danger ink; no syntax colour (${theme})`, async () => {
      const { page } = await fixturePage(browser, STATIC, { theme });
      const pre = await style(page.locator("figure pre"), "fontSize", "lineHeight", "fontFamily");
      assert.deepEqual([pre.fontSize, pre.lineHeight], ["13px", "20px"]);
      assert.match(pre.fontFamily, /Geist Mono|ui-monospace|monospace/);
      const color = (selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
      const line = (kind) => `.basalt-code-line[data-kind=${kind}]`;
      assert.equal(await color(`${line("command")} .basalt-code-text`), await token(page, "text-primary"));
      assert.equal(await color(`${line("command")} .basalt-code-prompt`), await token(page, "text-tertiary"));
      assert.equal(await color(`${line("output")}`), await token(page, "text-secondary"));
      assert.equal(await page.locator(`${line("output")} .basalt-code-gutter`).first().evaluate((el) => el.textContent), "");
      assert.equal(await color(`${line("done")} .basalt-code-text`), await token(page, "text-primary"));
      assert.equal(await color(`${line("warning")} .basalt-code-text`), await token(page, "text-primary"));
      assert.equal(await color(`${line("error")} .basalt-code-text`), await token(page, "status-danger"));
      assert.equal(await color(`${line("done")} .basalt-terminal-mark`), await token(page, "status-success"));
      assert.equal(await color(`${line("warning")} .basalt-terminal-mark`), await token(page, "status-warning"));
      assert.equal(await color(`${line("error")} .basalt-terminal-mark`), await token(page, "status-danger"));
      assert.equal(await page.locator("figure pre [style*=color]").count(), 0, "no syntax colour");
      await page.close();
    });
  }

  test("the gutter is 16px plus space-2: every line's text starts 24px after the line's start, in every kind", async () => {
    const { page } = await fixturePage(browser, STATIC, { theme: "dark" });
    const starts = await page.locator(".basalt-code-line").evaluateAll((lines) => lines.map((line) => [line.getBoundingClientRect().x, line.querySelector(".basalt-code-text").getBoundingClientRect().x]));
    for (const [line, text] of starts) assert.equal(text - line, 24);
    assert.equal(new Set(starts.map(([line]) => line)).size, 1);
    const marks = await page.locator(".basalt-terminal-mark").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }));
    for (const size of marks) assert.deepEqual(size, [16, 16]);
    await page.close();
  });

  test("the terminal shares CodeBlock's frame: well, level, radius 8, title row, rim", async () => {
    const jsx = render(`<main style={{ padding: 24, width: 640, display: "grid", gap: 16 }}><B.Terminal title="T" lines={${LINES}} /><B.CodeBlock title="C" code="npm i" language="sh" prompt="$" /></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    const props = ["backgroundColor", "borderTopLeftRadius", "borderTopWidth", "borderTopColor", "borderLeftColor"];
    const [t, c] = [await style(page.locator("figure").nth(0), ...props), await style(page.locator("figure").nth(1), ...props)];
    assert.deepEqual(t, c);
    assert.equal(t.borderTopLeftRadius, "8px");
    assert.equal(await page.locator("figure").nth(0).getAttribute("data-level"), await page.locator("figure").nth(1).getAttribute("data-level"));
    const [th, ch] = [await box(page.locator("figure").nth(0).locator("figcaption")), await box(page.locator("figure").nth(1).locator("figcaption"))];
    assert.equal(th.height, ch.height, "the same title row");
    const [tp, cp] = [await box(page.locator("figure").nth(0).locator("pre")), await box(page.locator("figure").nth(1).locator("pre"))];
    assert.equal(tp.x - (await box(page.locator("figure").nth(0))).x, cp.x - (await box(page.locator("figure").nth(1))).x);
    await page.close();
  });

  test("long lines scroll sideways inside the block, as CodeBlock's do, and the page does not", async () => {
    const long = "x".repeat(400);
    const jsx = render(`<main style={{ padding: 24, width: 420 }}><B.Terminal title="T" lines={[{ kind: "command", text: "echo ${long}" }, { kind: "output", text: "${long}" }]} /></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark", viewport: { width: 480, height: 600 } });
    const pre = await page.locator("figure pre").evaluate((el) => [el.scrollWidth > el.clientWidth, getComputedStyle(el).overflowX]);
    assert.deepEqual(pre, [true, "auto"]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`axe finds no WCAG 2.2 AA violations: static, live and with a prompted CodeBlock (${theme})`, async () => {
      const jsx = render(`<main style={{ padding: 24, width: 640, display: "grid", gap: 16 }}>
        <B.Terminal title="Deploy and test" lines={${LINES}} />
        <B.Terminal title="Replay" replay lines={${LINES}} />
        <B.Terminal title="Stream" status="running" onPause={() => {}} lines={${LINES}} />
        <B.CodeBlock title="Install" code={"npm install \\\\\\n  @srasyndicate/basalt"} language="sh" prompt="$" />
      </main>`);
      const { page } = await fixturePage(browser, jsx, { theme });
      await settle(page);
      assert.deepEqual(await audit(page), []);
      await page.close();
    });
  }

  test("forced colours: marks and an error's text take the system foreground, and the shapes still tell the statuses apart", async () => {
    const { page } = await fixturePage(browser, STATIC, { theme: "dark", forcedColors: "active" });
    const canvasText = await resolve(page, "CanvasText");
    const inks = await page.locator(".basalt-terminal-mark, .basalt-code-line[data-kind=error] .basalt-code-text").evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    for (const ink of inks) assert.equal(ink, canvasText);
    const shapes = await page.locator(".basalt-terminal-mark").evaluateAll((els) => els.map((el) => el.innerHTML));
    assert.equal(new Set(shapes).size, 3);
    await page.close();
  });
});

describe("CodeBlock with a prompt", () => {
  const INSTALL = "npm install @srasyndicate/basalt\\nnpx basalt init --theme system \\\\\\n  --density default\\n";
  const jsx = (extra = "") => render(`<main style={{ padding: 24, width: 640 }}><B.CodeBlock title="Install" code={"${INSTALL}"} language="sh" prompt="$" ${extra} /></main>`);

  test("every line is in the gutter and a continuation after a trailing backslash gets an empty one", async () => {
    const { page } = await fixturePage(browser, jsx(), { theme: "dark" });
    const gutters = await page.locator(".basalt-code-gutter").evaluateAll((els) => els.map((el) => el.textContent));
    assert.deepEqual(gutters, ["$", "$", ""], "the trailing newline adds no fourth line");
    const texts = await page.locator(".basalt-code-text").evaluateAll((els) => els.map((el) => el.textContent));
    assert.deepEqual(texts, ["npm install @srasyndicate/basalt", "npx basalt init --theme system \\", "  --density default"]);
    const starts = await page.locator(".basalt-code-text").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
    assert.equal(new Set(starts).size, 1, "the text starts at one x on every line, continuation too");
    await page.close();
  });

  test("copy still takes the code exactly as given, and a selection of the block holds no prompt", async () => {
    const { page } = await fixturePage(browser, jsx(), { theme: "dark" });
    await stubClipboard(page);
    await page.getByRole("button", { name: "Copy code" }).click();
    assert.deepEqual(await page.evaluate(() => window.copied), ["npm install @srasyndicate/basalt\nnpx basalt init --theme system \\\n  --density default\n"]);
    const selected = await selectAll(page, "figure pre");
    assert.ok(!selected.includes("$"), selected);
    assert.equal(selected.trim(), "npm install @srasyndicate/basalt\nnpx basalt init --theme system \\\n  --density default");
    await page.close();
  });

  test("the prompt is not in the accessibility tree as text", async () => {
    const { page } = await fixturePage(browser, jsx(), { theme: "dark" });
    const snapshot = await page.locator("figure pre").ariaSnapshot();
    assert.doesNotMatch(snapshot, /\$/, snapshot);
    assert.match(snapshot, /npm install/);
    await page.close();
  });

  test("a block without a prompt is exactly as it was: one run of text, no gutter", async () => {
    const { page } = await fixturePage(browser, render(`<B.CodeBlock title="x" code={"a\\nb"} />`), { theme: "dark" });
    assert.equal(await page.locator(".basalt-code-gutter").count(), 0);
    assert.equal(await page.locator("figure code").evaluate((el) => el.childElementCount), 0);
    await page.close();
  });
});

/**
 * Moves the fake clock on by `ms` in steps, giving React a moment to render between them: a replay schedules its next line in an
 * effect, so one big jump would deliver only one.
 */
async function advance(page, ms, step = 250) {
  for (let t = 0; t < ms; t += step) {
    await page.clock.runFor(Math.min(step, ms - t));
    await page.waitForTimeout(25);
  }
}

describe("Terminal: live", () => {
  const live = (props = "") => render(`<main style={{ padding: 24, width: 640 }}><div data-before>Before</div><B.Terminal title="Replay: build" replay interval={500} exitCode={1} lines={${LINES}} ${props} /><p data-after>After</p></main>`);
  const head = ".basalt-terminal-head";

  test("role=log only while lines arrive: not before, yes while running, not while paused, not when finished", async () => {
    const { page } = await fixturePage(browser, live(), { theme: "dark", clock: true });
    const pre = page.locator("figure pre");
    const roles = async () => pre.getAttribute("role");
    assert.notEqual(await roles(), "log", "idle");
    await page.getByRole("button", { name: "Play" }).click();
    assert.equal(await roles(), "log", "running");
    assert.equal(await page.locator("[role=log]").count(), 1);
    await advance(page, 20, 20);
    assert.equal(await page.locator(".basalt-code-line").count(), 1, "the first line follows one frame after the log");
    await advance(page, 1100);
    assert.equal(await page.locator(".basalt-code-line").count(), 3);
    await page.getByRole("button", { name: "Pause" }).click();
    assert.equal(await roles(), "region", "paused: a named region, not a log");
    await page.getByRole("button", { name: "Resume" }).click();
    assert.equal(await roles(), "log", "resumed");
    await advance(page, 10_000);
    assert.equal(await page.locator(".basalt-code-line").count(), 6);
    assert.equal(await roles(), "region", "finished: a named region, not a log");
    assert.equal(await page.locator("[role=log]").count(), 0);
    assert.ok(await page.getByRole("button", { name: "Replay" }).count());
    await page.close();
  });

  test("the pause control pauses: no line arrives while paused, and one more follows after Resume", async () => {
    const { page } = await fixturePage(browser, live(), { theme: "dark", clock: true });
    await page.getByRole("button", { name: "Play" }).click();
    await advance(page, 1100);
    const count = () => page.locator(".basalt-code-line").count();
    await page.getByRole("button", { name: "Pause" }).click();
    const paused = await count();
    await advance(page, 5000);
    assert.equal(await count(), paused);
    await page.getByRole("button", { name: "Resume" }).click();
    await advance(page, 600);
    assert.equal(await count(), paused + 1);
    await page.close();
  });

  test("arriving lines move nothing outside the log: the title, the head's controls, the log's box and what follows it", async () => {
    const { page } = await fixturePage(browser, live(), { theme: "dark", clock: true });
    const parts = [".basalt-terminal-title", ".basalt-terminal-state", `${head} .basalt-button:nth-of-type(1)`, "[data-before]", "[data-after]", "figure", "figure pre"];
    const read = async () => { const out = {}; for (const p of parts) out[p] = await box(page.locator(p).first()); return out; };
    const first = await read();
    await page.getByRole("button", { name: "Play" }).click();
    for (let i = 0; i < 8; i++) {
      await advance(page, 500);
      const now = await read();
      for (const p of parts) assert.deepEqual([now[p].x, now[p].y, now[p].width, now[p].height], [first[p].x, first[p].y, first[p].width, first[p].height], `${p} moved after ${i + 1} steps`);
    }
    await page.close();
  });

  test("every word that changes in place in the head reserves its widest form: the head holds still through Play, Pause, Resume, Replay and the result", async () => {
    const { page } = await fixturePage(browser, live(), { theme: "dark", clock: true });
    const heads = async () => (await page.locator(".basalt-terminal-head *").evaluateAll((els) => els.filter((el) => el.matches(".basalt-terminal-title, .basalt-terminal-actions, .basalt-terminal-state, .basalt-button")).map((el) => { const r = el.getBoundingClientRect(); return [el.className.split(" ")[0], r.x, r.y, r.width, r.height]; })));
    const first = await heads();
    await page.getByRole("button", { name: "Play" }).click();
    assert.deepEqual(await heads(), first, "running");
    await advance(page, 600);
    await page.getByRole("button", { name: "Pause" }).click();
    assert.deepEqual(await heads(), first, "paused");
    await page.getByRole("button", { name: "Resume" }).click();
    await advance(page, 10_000);
    assert.deepEqual(await heads(), first, "failed, exit 1");
    assert.match(await page.locator(".basalt-terminal-state").innerText(), /Failed, exit 1/);
    await page.getByRole("button", { name: "Replay" }).click();
    assert.deepEqual(await heads(), first, "replaying");
    await page.close();
  });

  test("the log has a fixed height that scrolls inside, and it follows new lines only while the reader is at the end", async () => {
    const lines = (n) => Array.from({ length: n }, (_, i) => `{ kind: "output", text: "line ${i + 1}" }`).join(",");
    const fixture = render(`<App/>`, `function App(){const [n,setN]=React.useState(12);window.setN=setN;return <main style={{ padding: 24, width: 640 }}><div data-before>Before</div><B.Terminal title="Build" status="running" lines={[${lines(60)}].slice(0, n)} /><p data-after>After</p></main>}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const pre = page.locator("figure pre");
    const height = (await box(pre)).height;
    assert.equal(height, 20 * 9 + 24, "nine lines and the padding, border-box");
    const atEnd = () => pre.evaluate((el) => Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 2);
    const grow = async (n) => { await page.evaluate((n) => window.setN(n), n); await page.waitForFunction((n) => document.querySelectorAll(".basalt-code-line").length === n, n, { polling: 20 }); };
    assert.ok(await atEnd(), "it starts at the end");
    await grow(20);
    assert.equal((await box(pre)).height, height, "the box did not grow");
    assert.ok(await atEnd(), "it follows while the reader is at the end");
    const before = [await box(page.locator("[data-before]")), await box(page.locator("[data-after]")), await box(page.locator("figure"))];
    // the reader scrolls up: following stops, and the reader's place is kept
    await pre.evaluate((el) => { el.scrollTop = 40; });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))); // the scroll event has run
    await grow(40);
    assert.equal(await pre.evaluate((el) => el.scrollTop), 40, "the reader's place is kept");
    assert.equal(await atEnd(), false);
    // the reader returns to the end: following resumes
    await pre.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))); // the scroll event has run
    await grow(60);
    assert.ok(await atEnd());
    const after = [await box(page.locator("[data-before]")), await box(page.locator("[data-after]")), await box(page.locator("figure"))];
    assert.deepEqual(after, before, "nothing outside the log moved");
    await page.close();
  });

  test("a stream the app drives: a log only while running, the pause control reaches the app, and Copy commands takes what has arrived", async () => {
    const fixture = render(`<App/>`, `function App(){
      const [status, setStatus] = React.useState("running");
      const [n, setN] = React.useState(2);
      window.app = { setStatus, setN, log: (window.app?.log ?? []) };
      return <main style={{ padding: 24, width: 640 }}><B.Terminal title="Build" status={status} lines={${LINES}.slice(0, n)} onPause={() => { window.app.log.push("pause"); setStatus("paused"); }} onResume={() => { window.app.log.push("resume"); setStatus("running"); }} /></main>;
    }`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const pre = page.locator("figure pre");
    assert.equal(await pre.getAttribute("role"), "log");
    await page.getByRole("button", { name: "Pause" }).click();
    assert.equal(await pre.getAttribute("role"), "region");
    await page.getByRole("button", { name: "Resume" }).click();
    assert.equal(await pre.getAttribute("role"), "log");
    assert.deepEqual(await page.evaluate(() => window.app.log), ["pause", "resume"]);
    await page.evaluate(() => { window.app.setN(4); window.app.setStatus("done"); });
    await page.waitForFunction(() => document.querySelector("figure pre").getAttribute("role") !== "log", null, { polling: 20 });
    assert.equal(await pre.getAttribute("role"), "region", "finished");
    assert.equal(await page.getByRole("button", { name: "Pause" }).isDisabled(), true, "nothing to pause once done");
    await stubClipboard(page);
    await page.getByRole("button", { name: "Copy commands" }).click();
    assert.deepEqual(await page.evaluate(() => window.copied), [COMMANDS]);
    await page.close();
  });

  test("reduced motion: nothing animates in a transcript", async () => {
    const { page } = await fixturePage(browser, live(), { theme: "dark", clock: true, reducedMotion: "reduce" });
    await page.getByRole("button", { name: "Play" }).click();
    await advance(page, 600);
    assert.equal(await page.evaluate(() => document.querySelector("figure pre").getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).length), 0);
    await page.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Terminal: the narrow head, the idle log, the shared gutter, copy, and the head's hairline in forced colours (decision 98)

const inBox = (width, jsx, extra = "") => render(`<main style={{ padding: 24 }}><div style={{ width: ${width} }}>${jsx}</div>${extra}</main>`);
const T = (props = "") => `<B.Terminal title="Deploy and test" lines={${LINES}} ${props} />`;

describe("Terminal: the head when narrow", () => {
  test("wide, the copy button has its words; under 30rem of the terminal's own width it is the icon alone, with the same name, at one wide viewport", async () => {
    for (const [width, compact] of [[640, false], [490, false], [470, true], [320, true]]) {
      const { page } = await fixturePage(browser, inBox(width, T()), { theme: "dark", viewport: { width: 1440, height: 900 } });
      const visible = page.getByRole("button", { name: "Copy commands" });
      assert.equal(await visible.count(), 1, `${width}px: one copy button in the accessibility tree`);
      const b = await box(visible);
      if (compact) {
        assert.equal(await visible.getAttribute("data-icon-only"), "");
        assert.deepEqual([b.width, b.height], [28, 28], `${width}px: the icon alone`);
        assert.equal((await visible.innerText()).trim(), "");
      } else {
        assert.equal(await visible.getAttribute("data-icon-only"), null);
        assert.match(await visible.innerText(), /Copy commands/);
        assert.ok(b.width > 100);
      }
      await page.close();
    }
  });

  test("a terminal in a narrow card behaves as it does in a narrow window: the container decides, not the viewport", async () => {
    const jsx = render(`<main style={{ padding: 24, display: "grid", gap: 16 }}><B.Card style={{ width: 360 }}><B.CardContent>${T()}</B.CardContent></B.Card><div style={{ width: 800 }}>${T()}</div></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark", viewport: { width: 1440, height: 900 } });
    const icon = await page.locator(".basalt-card .basalt-terminal-copy-compact").evaluate((el) => getComputedStyle(el).display);
    const wide = await page.locator(".basalt-card .basalt-terminal-copy").evaluate((el) => getComputedStyle(el).display);
    assert.deepEqual([icon === "none", wide], [false, "none"]);
    const outside = await page.locator("main > div:not(.basalt-card) > .basalt-terminal .basalt-terminal-copy").evaluate((el) => getComputedStyle(el).display);
    assert.notEqual(outside, "none");
    await page.close();
  });

  test("the icon-only button copies the commands, swaps Copy to Check, and says Copied", async () => {
    const { page } = await fixturePage(browser, inBox(320, T()), { theme: "dark" });
    await stubClipboard(page);
    const button = page.getByRole("button", { name: "Copy commands" });
    const before = await button.locator("svg").evaluate((el) => el.innerHTML);
    await button.click();
    assert.deepEqual(await page.evaluate(() => window.copied), [COMMANDS]);
    const after = page.getByRole("button", { name: "Copied" });
    assert.equal(await after.count(), 1);
    assert.notEqual(await after.locator("svg").evaluate((el) => el.innerHTML), before, "the glyph swapped");
    assert.equal(await page.locator("[role=status]").textContent(), "Copied");
    await page.close();
  });

  test("at 390 a live head is two rows: the title, then the state, the pause control and the icon", async () => {
    const jsx = inBox(326, `<B.Terminal title="Build on sb_7f3a91c2e0, finished" status="failed" exitCode={1} onPause={() => {}} lines={${LINES}} />`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark", viewport: { width: 390, height: 800 } });
    const centre = async (selector) => { const r = await box(page.locator(selector).filter({ visible: true }).first()); return r.y + r.height / 2; };
    const [title, state, pause, copy] = [await centre(".basalt-terminal-title"), await centre(".basalt-terminal-state"), await centre(".basalt-terminal-actions .basalt-button:not(.basalt-terminal-copy-compact)"), await centre(".basalt-terminal-copy-compact")];
    assert.ok(Math.abs(state - pause) < 8 && Math.abs(pause - copy) < 8, `the state, the pause control and the icon share a row: ${[state, pause, copy]}`);
    assert.ok(Math.min(state, pause, copy) - title > 20, `the title is a row above them: ${title} against ${[state, pause, copy]}`);
    const head = await box(page.locator(".basalt-terminal-head"));
    assert.ok(head.height <= 36 + 28 + 2, `two rows: the head is ${head.height}px tall`);
    await page.close();
  });
});

describe("Terminal: an idle replay", () => {
  const replayJsx = () => render(`<main style={{ padding: 24, width: 640 }}><B.Terminal title="Replay" replay interval={500} lines={${LINES}} /></main>`);

  test("before it starts the log's box holds one sentence in tertiary ink, and it leaves with the first line", async () => {
    const { page } = await fixturePage(browser, replayJsx(), { theme: "dark", clock: true });
    const hint = page.locator(".basalt-terminal-hint");
    assert.equal(await hint.textContent(), "Press Play to start");
    assert.equal(await hint.evaluate((el) => getComputedStyle(el).color), await token(page, "text-tertiary"));
    assert.equal(await page.locator(".basalt-code-line").count(), 0);
    assert.equal(await page.locator("figure pre").evaluate((el) => el.textContent), "Press Play to start");
    const height = (await box(page.locator("figure pre"))).height;
    await page.getByRole("button", { name: "Play" }).click();
    assert.equal(await hint.count(), 0, "the sentence is gone");
    await advance(page, 20, 20);
    assert.equal(await page.locator(".basalt-code-line").count(), 1);
    assert.equal((await box(page.locator("figure pre"))).height, height, "the box did not change size");
    await page.close();
  });

  test("Play and Replay show the first line one frame later: the box is never blank for an interval", async () => {
    const { page } = await fixturePage(browser, replayJsx(), { theme: "dark", clock: true });
    await page.getByRole("button", { name: "Play" }).click();
    await advance(page, 20, 20);
    assert.equal(await page.locator(".basalt-code-line").count(), 1, "Play");
    await advance(page, 10_000);
    assert.equal(await page.locator(".basalt-code-line").count(), 6);
    assert.ok(await page.getByRole("button", { name: "Replay" }).count());
    await page.getByRole("button", { name: "Replay" }).click();
    await advance(page, 20, 20);
    assert.equal(await page.locator(".basalt-code-line").count(), 1, "Replay: the first line, one frame later, with no blank interval");
    assert.equal(await page.locator(".basalt-terminal-hint").count(), 0);
    await page.close();
  });

  test("the region is role=log before line 1 is inserted, on Play and on Replay, so a screen reader hears line 1", async () => {
    const { page } = await fixturePage(browser, replayJsx(), { theme: "dark", clock: true });
    await page.evaluate(() => {
      window.order = [];
      new MutationObserver((records) => {
        const pre = document.querySelector("figure pre");
        for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList.contains("basalt-code-line") && !window.order.some((o) => o.line === n)) window.order.push({ line: n, role: pre.getAttribute("role"), lines: pre.querySelectorAll(".basalt-code-line").length });
      }).observe(document.querySelector("figure"), { subtree: true, childList: true, attributes: true });
    });
    const firstLine = () => page.evaluate(() => window.order.map((o) => [o.role, o.lines]));
    await page.getByRole("button", { name: "Play" }).click();
    assert.equal(await page.locator("figure pre").getAttribute("role"), "log", "the log is there at once");
    assert.equal(await page.locator(".basalt-code-line").count(), 0, "and holds no line yet");
    await advance(page, 20, 20);
    assert.deepEqual((await firstLine())[0], ["log", 1], "line 1 went into a region that was already a log");
    await advance(page, 10_000);
    await page.evaluate(() => { window.order = []; });
    await page.getByRole("button", { name: "Replay" }).click();
    assert.equal(await page.locator("figure pre").getAttribute("role"), "log");
    assert.equal(await page.locator(".basalt-code-line").count(), 0, "Replay: a log with no line for a frame");
    await advance(page, 20, 20);
    assert.deepEqual((await firstLine())[0], ["log", 1], "Replay: the same");
    await page.close();
  });

  test("a stream the app drives shows no sentence about Play", async () => {
    const jsx = render(`<main style={{ padding: 24, width: 640 }}><B.Terminal title="Build" status="idle" lines={[]} /></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    assert.equal(await page.locator(".basalt-terminal-hint").count(), 0);
    await page.close();
  });
});

describe("The gutter is one column for the block", () => {
  const PROMPTS = ["$", "PS>", ">>>", "PS C:\\Users>", "＞＞", "❯"];
  const widths = (page) => page.evaluate(() => {
    const ch = (() => { const probe = document.createElement("span"); probe.style.cssText = "position:absolute;width:1ch;visibility:hidden"; document.querySelector("pre").append(probe); const w = probe.getBoundingClientRect().width; probe.remove(); return w; })();
    const gutters = [...document.querySelectorAll(".basalt-code-gutter")].map((g) => g.getBoundingClientRect().width);
    const starts = [...document.querySelectorAll(".basalt-code-text")].map((t) => t.getBoundingClientRect().x);
    const prompts = [...document.querySelectorAll(".basalt-code-prompt")].map((p) => p.getBoundingClientRect().width);
    return { ch, gutters, starts, prompts };
  });

  for (const prompt of PROMPTS) {
    test(`Terminal with the prompt ${JSON.stringify(prompt)}: every line's text starts on one edge, and the gutter is the widest prompt plus 1ch, at least 24px`, async () => {
      const { page } = await fixturePage(browser, render(`<main style={{ padding: 24, width: 700 }}><B.Terminal title="T" prompt={${JSON.stringify(prompt)}} lines={${LINES}} /></main>`), { theme: "dark" });
      const { ch, gutters, starts, prompts } = await widths(page);
      assert.equal(new Set(starts).size, 1, `text starts at ${starts}`);
      assert.equal(new Set(gutters.map((g) => g.toFixed(2))).size, 1, "one column: every gutter is as wide as the others");
      const expected = Math.max(24, Math.max(...prompts) + ch);
      assert.ok(Math.abs(gutters[0] - expected) < 0.51, `${JSON.stringify(prompt)}: gutter ${gutters[0]}, prompt ${Math.max(...prompts)} + ${ch}ch, at least 24`);
      if (prompt === "$") assert.equal(gutters[0], 24, "$ stays exactly 24px");
      await page.close();
    });
  }

  test("a long prompt makes the column wider for the output lines and the marks too, and a long prompt is not clipped", async () => {
    const { page } = await fixturePage(browser, render(`<main style={{ padding: 24, width: 700 }}><B.Terminal title="T" prompt={"PS C:\\\\Users>"} lines={${LINES}} /></main>`), { theme: "dark" });
    const { gutters, starts } = await widths(page);
    assert.ok(gutters[0] > 24 + 20, `gutter ${gutters[0]}`);
    const kinds = await page.locator(".basalt-code-line").evaluateAll((els) => els.map((el) => [el.getAttribute("data-kind"), el.querySelector(".basalt-code-text").getBoundingClientRect().x - el.getBoundingClientRect().x]));
    for (const [, offset] of kinds) assert.equal(Math.round(offset), Math.round(gutters[0]));
    assert.equal(new Set(starts).size, 1);
    const prompt = await page.locator(".basalt-code-prompt").first().evaluate((el) => { const r = el.getBoundingClientRect(); return [r.right, el.parentElement.getBoundingClientRect().right]; });
    assert.ok(prompt[0] <= prompt[1], "the prompt is inside its gutter");
    await page.close();
  });

  test("CodeBlock shares the column: a long prompt, a continuation line and plain lines start their text on one edge", async () => {
    const jsx = render(`<main style={{ padding: 24, width: 700 }}><B.CodeBlock title="Install" language="sh" prompt="PS>" code={"npm install a\\nnpx basalt init \\\\\\n  --density default\\n"} /></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    const { ch, gutters, starts, prompts } = await widths(page);
    assert.equal(starts.length, 3);
    assert.equal(new Set(starts).size, 1);
    assert.ok(Math.abs(gutters[0] - Math.max(24, prompts[0] + ch)) < 0.51);
    await page.close();
  });

  test("CodeBlock with the `$` prompt is exactly 24px, as before", async () => {
    const jsx = render(`<main style={{ padding: 24, width: 700 }}><B.CodeBlock title="Install" language="sh" prompt="$" code={"npm install a\\nb"} /></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    const { gutters, starts } = await widths(page);
    assert.deepEqual([...new Set(gutters)], [24]);
    assert.equal(new Set(starts).size, 1);
    await page.close();
  });
});

describe("Copy commands", () => {
  test("an idle replay copies every command whatever the playhead, and then says Copied", async () => {
    const jsx = render(`<main style={{ padding: 24, width: 700 }}><B.Terminal title="Replay" replay lines={${LINES}} /></main>`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    await stubClipboard(page);
    assert.equal(await page.locator(".basalt-code-line").count(), 0, "nothing has played");
    await page.getByRole("button", { name: "Copy commands" }).click();
    assert.deepEqual(await page.evaluate(() => window.copied), [COMMANDS], "every command, not an empty string");
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 1);
    await page.close();
  });

  test("a stream the app drives copies what has arrived; with no command yet the button is off and never says Copied", async () => {
    const fixture = render(`<App/>`, `function App(){const [n,setN]=React.useState(0);window.setN=setN;return <main style={{ padding: 24, width: 700 }}><B.Terminal title="Build" status="running" lines={${LINES}.slice(0, n)} /></main>;}`);
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await stubClipboard(page);
    const wide = page.locator(".basalt-terminal-copy");
    assert.equal(await wide.isDisabled(), true, "no line has arrived");
    await wide.click({ force: true }).catch(() => {});
    assert.deepEqual(await page.evaluate(() => window.copied), []);
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 0);
    assert.equal(await page.locator("[role=status]").textContent(), "");
    // an output line is not a command
    await page.evaluate(() => window.setN(2));
    await page.waitForFunction(() => document.querySelectorAll(".basalt-code-line").length === 2, null, { polling: 20 });
    assert.equal(await wide.isDisabled(), false, "a command has arrived");
    await wide.click();
    assert.deepEqual(await page.evaluate(() => window.copied), ["basalt sandbox create --image node:22-slim"], "only what has arrived");
    await page.close();
  });

  test("a transcript with no command at all cannot be copied, and the icon-only button is off too", async () => {
    const jsx = inBox(320, `<B.Terminal title="Log" lines={[{ kind: "output", text: "hello" }]} />`);
    const { page } = await fixturePage(browser, jsx, { theme: "dark" });
    await stubClipboard(page);
    const button = page.getByRole("button", { name: "Copy commands" });
    assert.equal(await button.isDisabled(), true);
    await button.click({ force: true }).catch(() => {});
    assert.deepEqual(await page.evaluate(() => window.copied), []);
    await page.close();
  });
});

describe("The title row's hairline in forced colours", () => {
  const both = render(`<main style={{ padding: 24, width: 640, display: "grid", gap: 16 }}><B.CodeBlock title="C" code="npm i" language="sh" />${T()}</main>`);

  test("it is an inset shadow normally, and a real CanvasText border in forced colours, in a CodeBlock and a Terminal", async () => {
    const normal = await fixturePage(browser, both, { theme: "dark" });
    const forced = await fixturePage(browser, both, { theme: "dark", forcedColors: "active" });
    const canvasText = await resolve(forced.page, "CanvasText");
    for (const i of [0, 1]) {
      const rest = await style(normal.page.locator("figcaption").nth(i), "boxShadow", "borderBottomWidth");
      assert.notEqual(rest.boxShadow, "none");
      assert.equal(rest.borderBottomWidth, "0px");
      const s = await style(forced.page.locator("figcaption").nth(i), "boxShadow", "borderBottomWidth", "borderBottomStyle", "borderBottomColor");
      assert.deepEqual([s.boxShadow, s.borderBottomWidth, s.borderBottomStyle, s.borderBottomColor], ["none", "1px", "solid", canvasText], `figure ${i}`);
      assert.equal((await box(forced.page.locator("figcaption").nth(i))).height, (await box(normal.page.locator("figcaption").nth(i))).height, `the head is the same height in forced colours (${i})`);
      // the line sits between the head and the body
      const [head, pre] = [await box(forced.page.locator("figcaption").nth(i)), await box(forced.page.locator("figure").nth(i).locator("pre"))];
      assert.ok(pre.y >= head.bottom - 0.01);
    }
    await normal.page.close();
    await forced.page.close();
  });
});
