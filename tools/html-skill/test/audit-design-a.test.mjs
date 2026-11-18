// audit-design A, D and C10, C11 and E1 in the HTML skill (decisions 138 and 139; the council decided them and the owner approved them; the
// implementation has not been reviewed). The skill has the segmented control, the horizontal tabs, the pinned still table, the multi-select
// chip and the touch controls; it has no vertical tabs and no pagination. packages/react/test/audit-design-a.test.mjs proves the same for React,
// and parity.test.mjs compares the two. Every test here fails on origin/main.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>t</title>${body}`, { fonts: false }).html;
const open = (body, options) => openHtml(browser, html(body), options);
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(count); }), n);
const resolve = (page, value, prop = "background-color") => page.evaluate(([v, p]) => { const probe = document.createElement("div"); probe.style.setProperty(p, v); document.body.append(probe); const out = getComputedStyle(probe).getPropertyValue(p); probe.remove(); return out; }, [value, prop]);

const SEGMENT = '<div class="segment" role="group" aria-label="Range" id="g">' + ["Day", "Week", "Month", "Quarter", "Year"].map((l, i) => `<button type="button" aria-pressed="${i === 1}">${l}</button>`).join("") + "</div>";
const TABS = '<div data-tabs><div class="tabs" role="tablist" aria-label="Views">' + ["Overview", "Activity", "Settings"].map((l, i) => `<button class="tab" role="tab" id="t${i}" aria-controls="p${i}" aria-selected="${i === 0}">${l}</button>`).join("") + "</div>" + [0, 1, 2].map((i) => `<div class="tabpanel" id="p${i}" role="tabpanel" aria-labelledby="t${i}"${i ? " hidden" : ""}>Panel ${i}</div>`).join("") + "</div>";
const press = (page, index) => page.evaluate((i) => document.querySelectorAll("#g button").forEach((b, k) => b.setAttribute("aria-pressed", String(k === i))), index);
const pick = (page, index) => page.evaluate((i) => document.querySelectorAll(".tab")[i].click(), index);
const boxes = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }), selector);

for (const scheme of ["dark", "light"]) {
  describe(`A: chosen is the label at 600 against 400, each label reserving its 600 width (${scheme})`, () => {
    test("segment: the pressed button is 600 and the rest 400, the text carries a copy of itself, and choosing each moves every button 0px", async () => {
      const { page, context } = await open(SEGMENT, { scheme });
      await frames(page);
      const read = () => page.evaluate(() => [...document.querySelectorAll("#g button")].map((b) => ({ on: b.getAttribute("aria-pressed") === "true", weight: getComputedStyle(b.querySelector("[data-label]") ?? b).fontWeight, label: b.querySelector("[data-label]")?.getAttribute("data-label"), text: b.textContent })));
      for (const b of await read()) { assert.equal(b.weight, b.on ? "600" : "400"); assert.equal(b.label, b.text, "the label is in a span carrying its own copy"); }
      const before = await boxes(page, "#g button");
      for (let i = 0; i < 5; i += 1) {
        await press(page, i);
        await frames(page, 3);
        const after = await boxes(page, "#g button");
        before.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `choosing ${i} moved button ${k} by ${(after[k][m] - v).toFixed(3)}px`)));
      }
      // each label is as wide as its text at 600
      const widths = await page.evaluate(() => [...document.querySelectorAll("#g [data-label]")].map((el) => { const probe = document.createElement("span"); probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-weight:600"; probe.textContent = el.getAttribute("data-label"); el.parentElement.append(probe); const wide = probe.getBoundingClientRect().width; probe.remove(); return [el.getBoundingClientRect().width, wide]; }));
      for (const [box, wide] of widths) assert.ok(box >= wide - 0.05, `${box} against ${wide}`);
      await context.close();
    });

    test("tabs: the selected tab is 600 with its underline, the rest 400, and choosing each moves every tab 0px", async () => {
      const { page, context } = await open(TABS, { scheme });
      await frames(page);
      const weights = () => page.evaluate(() => [...document.querySelectorAll(".tab")].map((t) => [t.getAttribute("aria-selected") === "true", getComputedStyle(t.querySelector("[data-label]") ?? t).fontWeight, t.querySelector("[data-label]")?.getAttribute("data-label") === t.textContent]));
      for (const [on, weight, copy] of await weights()) { assert.equal(weight, on ? "600" : "400"); assert.ok(copy); }
      const before = await boxes(page, ".tab");
      for (let i = 0; i < 3; i += 1) {
        await pick(page, i);
        await frames(page, 2);
        const after = await boxes(page, ".tab");
        before.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `choosing ${i} moved tab ${k}`)));
      }
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tab[aria-selected="true"]'), "::after").height), "2px", "the underline stays");
      await context.close();
    });

    test("the chosen label is 4.5:1 or better on its fill, and the pill keeps its hairline with no drop shadow", async () => {
      const { page, context } = await open(SEGMENT, { scheme });
      await frames(page);
      const read = await page.evaluate(() => {
        const px = (css) => { const k = document.createElement("canvas"); k.width = k.height = 1; const x = k.getContext("2d", { willReadFrequently: true }); x.fillStyle = css; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
        const pill = px(getComputedStyle(document.querySelector("#g .pill")).backgroundColor);
        const track = px(getComputedStyle(document.querySelector("#g")).backgroundColor);
        const [on, off] = ["[aria-pressed=true]", "[aria-pressed=false]"].map((s) => px(getComputedStyle(document.querySelector(`#g button${s}`)).color));
        return { chosen: ratio(on, pill), rest: ratio(off, track), shadow: getComputedStyle(document.querySelector("#g .pill")).boxShadow, own: getComputedStyle(document.querySelector("#g button[aria-pressed=true]")).boxShadow };
      });
      assert.ok(read.chosen >= 4.5, `chosen ${read.chosen}`);
      assert.ok(read.rest >= 4.5, `resting ${read.rest}`);
      assert.equal(read.shadow, await resolve(page, "0 0 0 1px var(--basalt-border-hairline)", "box-shadow"), "a hairline and no drop");
      assert.equal(read.own, "none", "the pressed button paints none of its own while the shared pill is drawn");
      await context.close();
    });

    test("forced colours: the pressed segment is Highlight on HighlightText at 600 with no outline and no shadow; the tab keeps its Highlight underline", async () => {
      const { page, context } = await open(SEGMENT + TABS, { scheme });
      await page.emulateMedia({ forcedColors: "active" });
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      const seg = await page.locator("#g button[aria-pressed=true]").evaluate((el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.outlineStyle, c.boxShadow, getComputedStyle(el.querySelector("[data-label]") ?? el).fontWeight]; });
      assert.deepEqual(seg, [await resolve(page, "Highlight"), await resolve(page, "HighlightText", "color"), "none", "none", "600"]);
      const tab = await page.locator('.tab[aria-selected="true"]').evaluate((el) => [getComputedStyle(el, "::after").backgroundColor, getComputedStyle(el).outlineStyle, getComputedStyle(el.querySelector("[data-label]") ?? el).fontWeight]);
      assert.deepEqual(tab, [await resolve(page, "Highlight"), "none", "600"]);
      await context.close();
    });
  });
}

describe("C10: the chip's glyph swap crossfades over duration-fast with or without reduced motion", () => {
  const FILTER = '<div class="filter" data-label="Status"><label><input type="checkbox" value="a"> Alpha</label><label><input type="checkbox" value="b" checked> Beta</label></div>';
  for (const reducedMotion of ["no-preference", "reduce"]) {
    test(`opacity over 100ms (${reducedMotion})`, async () => {
      const { page, context } = await open(FILTER, { reducedMotion });
      await frames(page);
      const t = await page.locator(".chip-seat > svg").first().evaluate((el) => [getComputedStyle(el).transitionProperty, getComputedStyle(el).transitionDuration]);
      assert.deepEqual(t, ["opacity", "0.1s"]);
      await context.close();
    });
  }
});

describe("C11: a wash over a pinned cell is one colour from color-mix, never a layer", () => {
  const TABLE = '<div style="width: 358px; margin: 16px"><div class="panel table-wrap"><table data-fixed data-pinned="1" style="min-width: 640px"><colgroup><col style="width: 160px"><col style="width: 140px"><col></colgroup><thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Commit</th></tr></thead><tbody><tr id="r1"><th scope="row">build-0141</th><td>Passed</td><td>a1b2c3</td></tr><tr id="r2" aria-selected="true"><th scope="row">build-0140</th><td>Failed</td><td>d4e5f6</td></tr></tbody></table></div></div>';
  for (const scheme of ["dark", "light"]) {
    test(`hover and selected are the wash over the cell's fill as one background-color, with no ::before (${scheme})`, async () => {
      const { page, context } = await open(TABLE, { scheme });
      await frames(page);
      const read = (row) => page.locator(`#${row} th`).evaluate((el) => { const k = document.createElement("canvas"); k.width = k.height = 1; const x = k.getContext("2d", { willReadFrequently: true }); x.fillStyle = getComputedStyle(el).backgroundColor; x.fillRect(0, 0, 1, 1); return { bg: [...x.getImageData(0, 0, 1, 1).data], image: getComputedStyle(el).backgroundImage, before: getComputedStyle(el, "::before").content }; });
      await page.mouse.move(0, 0);
      const rest = await read("r1");
      const dark = scheme === "dark";
      const mix = (a) => rest.bg.slice(0, 3).map((v) => Math.round(v * (1 - a) + (dark ? 255 : 0) * a));
      const selected = await read("r2");
      assert.equal(selected.image, "none");
      assert.ok(["none", "normal"].includes(selected.before), `no ::before: ${selected.before}`);
      selected.bg.slice(0, 3).forEach((v, i) => assert.ok(Math.abs(v - mix(dark ? 0.09 : 0.07)[i]) <= 1, `selected ${selected.bg} vs ${mix(dark ? 0.09 : 0.07)}`));
      await page.locator("#r1").hover({ position: { x: 40, y: 10 } });
      await frames(page, 3);
      const hovered = await read("r1");
      assert.equal(hovered.image, "none");
      hovered.bg.slice(0, 3).forEach((v, i) => assert.ok(Math.abs(v - mix(dark ? 0.06 : 0.04)[i]) <= 1, `hover ${hovered.bg} vs ${mix(dark ? 0.06 : 0.04)}`));
      assert.equal(hovered.bg[3], 255, "opaque");
      await context.close();
    });
  }
});

describe("D: more contrast in the skill's pages, in both themes and under a theme chosen with the toggle", () => {
  const BODY = '<div class="card" id="card">card</div><input class="input" id="field" aria-label="Field"><span id="tert" style="color: var(--basalt-text-tertiary)">tertiary</span>';
  const read = (page) => page.evaluate(() => {
    const px = (el, prop) => { const k = document.createElement("canvas"); k.width = k.height = 1; const x = k.getContext("2d", { willReadFrequently: true }); x.fillStyle = getComputedStyle(el)[prop]; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].join(); };
    const probe = (css, prop) => { const i = document.createElement("i"); i.style.cssText = css; document.body.append(i); const out = px(i, prop); i.remove(); return out; };
    const card = document.getElementById("card"); const field = document.getElementById("field");
    return {
      rim: px(card, "borderRightColor"), rimTop: px(card, "borderTopColor"), input: probe("background: var(--basalt-border-input)", "backgroundColor"), secondary: probe("color: var(--basalt-text-secondary)", "color"),
      tertiary: px(document.getElementById("tert"), "color"), field: getComputedStyle(field).boxShadow, divider: probe("background: var(--basalt-border-divider)", "backgroundColor"),
    };
  });
  for (const [name, scheme, toggle] of [["dark by the system", "dark", null], ["light by the system", "light", null], ["dark chosen with the toggle in a light system", "light", "dark"], ["light chosen with the toggle in a dark system", "dark", "light"]]) {
    test(`${name}: lines are the input boundary, tertiary ink is secondary and a field's boundary is secondary`, async () => {
      const { page, context } = await open(BODY, { scheme });
      if (toggle) await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), toggle);
      await frames(page);
      const normal = await read(page);
      assert.notEqual(normal.divider, normal.input);
      assert.notEqual(normal.tertiary, normal.secondary);
      await page.emulateMedia({ contrast: "more" });
      await frames(page);
      const more = await read(page);
      assert.equal(more.rim, more.input, "the rim");
      assert.equal(more.rimTop, more.input, "the rim's top edge: one colour on every side");
      assert.equal(more.divider, more.input, "the divider");
      assert.equal(more.tertiary, more.secondary, "tertiary ink");
      assert.ok(more.field.length > 0 && more.field !== normal.field, "a field's boundary steps");
      await context.close();
    });
  }
});

describe("E1: a control drawn at 44 on touch is radius 8", () => {
  test("a button, an input and a select are 8 on touch and 6 with a fine pointer; a number field's group is 8 on touch", async () => {
    const BODY = '<button class="btn" id="b">Save</button><input class="input" id="i" aria-label="i"><select class="input" id="s" aria-label="s"><option>One</option></select><span class="number-field" id="n"><input class="input num" type="number" aria-label="n"></span>';
    const radius = (page, id) => page.locator(id).evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    const fine = await open(BODY, { scheme: "dark" });
    assert.deepEqual([await radius(fine.page, "#b"), await radius(fine.page, "#i"), await radius(fine.page, "#n")], ["6px", "6px", "6px"]);
    await fine.context.close();
    const touch = await open(BODY, { scheme: "dark", touch: true, width: 390 });
    for (const id of ["#b", "#i", "#s", "#n"]) assert.equal(await radius(touch.page, id), "8px", id);
    await touch.context.close();
  });
});

// ---- Decision 145 ----

describe("A: a label that is not plain text reserves its 600 width in the skill too, and an icon follows the choice", () => {
  const SEG = (inner) => `<div class="segment" role="group" aria-label="Range" id="g">${["Billing", "Notifications", "Access keys"].map((l, i) => `<button type="button" aria-pressed="${i === 1}">${inner(l)}</button>`).join("")}</div>`;
  const TABS_OF = (inner) => `<div data-tabs><div class="tabs" role="tablist" aria-label="Views">${["Inbox", "Drafts", "Archived"].map((l, i) => `<button class="tab" role="tab" id="t${i}" aria-controls="p${i}" aria-selected="${i === 1}">${inner(l)}</button>`).join("")}</div>${[0, 1, 2].map((i) => `<div class="tabpanel" id="p${i}" role="tabpanel" aria-labelledby="t${i}"${i !== 1 ? " hidden" : ""}>Panel ${i}</div>`).join("")}</div>`;
  const CASES = {
    "segments with labels in spans": [SEG((l) => `<span>${l}</span>`), "#g button", (page, i) => press(page, i)],
    "segments with an icon beside words in a span": [SEG((l) => `<i data-icon="Trash"></i><span>${l}</span>`), "#g button", (page, i) => press(page, i)],
    "tabs with labels in spans": [TABS_OF((l) => `<span>${l}</span>`), ".tab", (page, i) => pick(page, i)],
    "tabs with an icon beside words in a span": [TABS_OF((l) => `<i data-icon="Trash"></i><span>${l}</span>`), ".tab", (page, i) => pick(page, i)],
  };
  for (const scheme of ["dark", "light"]) {
    for (const [name, [body, items, choose]] of Object.entries(CASES)) {
      test(`${name} (${scheme}): choosing each moves every box 0px, and a hidden copy is out of the tree`, async () => {
        const { page, context } = await open(body, { scheme });
        await frames(page);
        const base = await boxes(page, items);
        for (let i = 0; i < base.length; i += 1) {
          await choose(page, i);
          await frames(page, 3);
          const after = await boxes(page, items);
          base.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `${name}: choosing ${i} moved item ${k} by ${(after[k][m] - v).toFixed(3)}px`)));
        }
        const hidden = await page.evaluate((items) => [...document.querySelectorAll(`${items} [data-wide]`)].map((el) => [el.getAttribute("aria-hidden"), el.hasAttribute("inert"), getComputedStyle(el).visibility, el.querySelectorAll("[id]:not(svg *)").length]), items);
        assert.equal(hidden.length, base.length);
        for (const h of hidden) assert.deepEqual(h, ["true", true, "hidden", 0]);
        await context.close();
      });
    }
  }

  for (const [name, body, choose, items] of [
    ["a segment", SEG((l) => `<span data-glyph="home"></span>${l}`), press, "#g button"],
    ["a tab", TABS_OF((l) => `<span data-glyph="home"></span>${l}`), pick, ".tab"],
  ]) {
    test(`${name}: a core glyph draws its selected form while chosen and its rest form otherwise, and its box does not change`, async () => {
      const { page, context } = await open(body, { scheme: "dark" });
      await frames(page);
      const read = () => page.evaluate((items) => [...document.querySelectorAll(items)].map((el) => { const pair = el.querySelector("[data-pair]"); const [a, b] = [...pair.children].map((s) => getComputedStyle(s).opacity); const box = pair.getBoundingClientRect(); return [a === "1" && b === "0" ? "rest" : a === "0" && b === "1" ? "selected" : `${a}/${b}`, box.width, box.height, pair.children[0].innerHTML !== pair.children[1].innerHTML]; }), items);
      const before = await read();
      assert.deepEqual(before.map((r) => r[0]), ["rest", "selected", "rest"]);
      assert.ok(before.every((r) => r[3]), "the two forms differ");
      await choose(page, 0);
      await frames(page, 30);
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      const after = await read();
      assert.deepEqual(after.map((r) => r[0]), ["selected", "rest", "rest"]);
      assert.deepEqual(after.map((r) => [r[1], r[2]]), before.map((r) => [r[1], r[2]]), "the glyph's box is the same either way");
      await context.close();
    });
  }
});

describe("A: a segment's icon sits on its label's centre line, 6px before it, as a tab's does", () => {
  test("a core glyph and a Phosphor icon, each beside words", async () => {
    const { page, context } = await open('<div class="segment" role="group" aria-label="V"><button type="button" aria-pressed="true"><span data-glyph="home"></span>Home</button><button type="button" aria-pressed="false"><i data-icon="Trash"></i>Copy</button></div>', { scheme: "dark" });
    await frames(page);
    for (const which of [0, 1]) {
      const out = await page.locator("#g, .segment button").nth(which).evaluate((el) => {
        const icon = el.querySelector("[data-pair], svg").getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(el.querySelector("[data-label]").firstChild);
        const text = [...range.getClientRects()].find((r) => r.width > 0);
        return { iconMid: icon.top + icon.height / 2, textMid: text.top + text.height / 2, gap: text.left - icon.right };
      });
      assert.ok(Math.abs(out.iconMid - out.textMid) <= 1.6, `centred: ${JSON.stringify(out)}`);
      assert.ok(Math.abs(out.gap - 6) <= 1.5, `gap ${JSON.stringify(out)}`);
    }
    await context.close();
  });
});

describe("B: in forced colours the chosen segment's focus ring is the ordinary ring's colour, with the theme and the palette disagreeing both ways", () => {
  for (const [theme, palette] of [["dark", "light"], ["light", "dark"], ["dark", "dark"], ["light", "light"]]) {
    test(`the page theme is ${theme} and the palette is ${palette}`, async () => {
      const { page, context } = await open(`<button class="btn" id="plain">Plain</button>${SEGMENT}`, { scheme: palette });
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      await page.emulateMedia({ forcedColors: "active", colorScheme: palette });
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      const ring = (selector) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor]; });
      const keyboard = async (selector) => { await page.locator(selector).first().focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab"); };
      await keyboard("#plain");
      const ordinary = await ring("#plain");
      await keyboard("#g button[aria-pressed=true]");
      const chosen = await ring("#g button[aria-pressed=true]");
      assert.deepEqual(chosen.slice(0, 3), ["solid", "2px", "2px"]);
      assert.equal(chosen[3], ordinary[3], "the ring's colour is an ordinary control's");
      await context.close();
    });
  }
});

describe("D: under more contrast a hovered edge is secondary ink in the skill", () => {
  for (const scheme of ["dark", "light"]) {
    test(`a secondary button: rest is the input boundary, hover is secondary ink (${scheme})`, async () => {
      const { page, context } = await open('<button class="btn" id="b">Save</button>', { scheme });
      await page.emulateMedia({ contrast: "more" });
      await frames(page);
      const colour = () => page.locator("#b").evaluate((el) => getComputedStyle(el).boxShadow.match(/^(.*?\))\s/)[1]);
      const probe = (css) => resolve(page, css, "color");
      await page.mouse.move(0, 0);
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      assert.equal(await colour(), await probe("var(--basalt-border-input)"));
      await page.locator("#b").hover();
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      assert.equal(await colour(), await probe("var(--basalt-text-secondary)"));
      await context.close();
    });
  }
});

// ---- Decision 149 ----

const WEIGHT = '(el) => getComputedStyle(el.querySelector("[data-label], [data-reserve] > :first-child") ?? el).fontWeight';
const SKILL_CENTRE = `(el) => {
  const pair = [...el.querySelectorAll("[data-pair], svg")].find((p) => !p.closest("[data-wide]"));
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim() && !n.parentElement.closest("[data-wide], svg")) { node = n; break; }
  const range = document.createRange(); range.selectNodeContents(node);
  const text = [...range.getClientRects()].find((r) => r.width > 0);
  const icon = pair.getBoundingClientRect(); const box = el.getBoundingClientRect();
  return { iconMid: icon.top + icon.height / 2, textMid: text.top + text.height / 2, itemMid: box.top + box.height / 2, gap: text.left - icon.right };
}`;
const MODES = [["1440 with a fine pointer", { width: 1440 }], ["390 with a coarse pointer", { width: 390, touch: true }]];

describe("A: an icon and its words share one centre line, 6px apart, whatever holds the words, and a resting segment's words do not move (items 6 and 7)", () => {
  const SEG = (inner) => `<div class="segment" role="group" aria-label="V" id="g"><button type="button" aria-pressed="true">${inner("Home")}</button><button type="button" aria-pressed="false">${inner("Other")}</button></div>`;
  const TAB = (inner) => `<div data-tabs><div class="tabs" role="tablist" aria-label="V"><button class="tab" role="tab" id="t0" aria-controls="p0" aria-selected="true">${inner("Home")}</button><button class="tab" role="tab" id="t1" aria-controls="p1" aria-selected="false">${inner("Other")}</button></div><div class="tabpanel" id="p0" role="tabpanel" aria-labelledby="t0">a</div><div class="tabpanel" id="p1" role="tabpanel" aria-labelledby="t1" hidden>b</div></div>`;
  const SHAPES = {
    "a core glyph beside plain words": (l) => `<span data-glyph="home"></span>${l}`,
    "a Phosphor icon beside words in a span": (l) => `<i data-icon="Trash"></i><span>${l}</span>`,
    "an icon inside the span that holds the words": (l) => `<span><i data-icon="Trash"></i>${l}</span>`,
    "a core glyph beside words in a span": (l) => `<span data-glyph="home"></span><span>${l}</span>`,
  };
  for (const [where, options] of MODES) {
    for (const [control, make, item, choose] of [["segment", SEG, "#g button", press], ["tab", TAB, ".tab", pick]]) {
      for (const [shape, inner] of Object.entries(SHAPES)) {
        test(`${control}, ${shape}, ${where}: one centre line, a 6px gap, and no word moves when chosen`, async () => {
          const { page, context } = await open(make(inner), { scheme: "dark", ...options });
          await frames(page);
          const line = async () => {
            const out = [];
            for (const which of [0, 1]) out.push(await page.locator(item).nth(which).evaluate(new Function("return " + SKILL_CENTRE)()));
            return out;
          };
          const before = await line();
          for (const out of before) {
            assert.ok(Math.abs(out.iconMid - out.textMid) <= 1, `${shape}: icon ${out.iconMid}, words ${out.textMid}`);
            assert.ok(Math.abs(out.gap - 6) <= 1.5, `${shape}: gap ${out.gap}`);
            assert.ok(Math.abs(out.textMid - out.itemMid) <= 1.5, `${shape}: words ${out.textMid - out.itemMid}px off the item's centre`);
          }
          const boxesBefore = await boxes(page, item);
          await choose(page, 1);
          await frames(page, 3);
          const after = await line();
          // the words and the icon of each item sit where they sat: the box, the gap and the words' left edge
          assert.deepEqual((await boxes(page, item)).map((b) => b.map((v) => Math.round(v * 100) / 100)), boxesBefore.map((b) => b.map((v) => Math.round(v * 100) / 100)));
          after.forEach((out, k) => { assert.ok(Math.abs(out.gap - before[k].gap) < 0.01, `item ${k}: the gap moved from ${before[k].gap} to ${out.gap}`); });
          await context.close();
        });
      }
    }
  }

  test("a resting segment's gap is 6px and its words do not move when it is chosen (item 7)", async () => {
    const { page, context } = await open(SEG((l) => `<span data-glyph="home"></span>${l}`), { scheme: "dark" });
    await frames(page);
    const left = () => page.evaluate(() => [...document.querySelectorAll("#g button")].map((b) => { const r = document.createRange(); r.selectNodeContents(b.querySelector("[data-label]").firstChild); return r.getBoundingClientRect().left; }));
    const gaps = await page.evaluate(() => [...document.querySelectorAll("#g button")].map((b) => { const r = document.createRange(); r.selectNodeContents(b.querySelector("[data-label]").firstChild); return r.getBoundingClientRect().left - b.querySelector("[data-pair]").getBoundingClientRect().right; }));
    for (const g of gaps) assert.ok(Math.abs(g - 6) < 0.6, `the gap is ${g}`);
    const was = await left();
    await press(page, 1);
    await frames(page, 3);
    const now = await left();
    // button 1 is chosen now: its words start where its resting words did, and button 0's where its chosen ones did
    assert.ok(Math.abs(now[0] - was[0]) < 0.01 && Math.abs(now[1] - was[1]) < 0.01, `${was} then ${now}`);
    await context.close();
  });
});

describe("A: the second copy of a label holds nothing an id, a name or a reference can resolve to (item 4)", () => {
  const PROBE = '<span id="dup-span">Alpha</span><svg width="12" height="12" aria-hidden="true"><defs><mask id="dup-mask"><rect width="12" height="12" fill="white"/></mask></defs><rect width="12" height="12" mask="url(#dup-mask)"/></svg><input type="hidden" name="probe" value="kept">';
  const FORM = `<form id="f"><input id="own" name="own" value="mine"><div class="segment" role="group" aria-label="V" id="g"><button type="button" aria-pressed="true">${PROBE}</button><button type="button" aria-pressed="false"><span>Other</span></button></div></form>`;
  test("each id once, FormData holds the value once, and the copy holds no id, name, reference or hidden input", async () => {
    const { page, context } = await open(FORM, { scheme: "dark" });
    await frames(page);
    const read = await page.evaluate(() => ({
      ids: ["dup-span", "dup-mask", "own"].map((id) => document.querySelectorAll(`[id="${id}"]`).length),
      probe: new FormData(document.getElementById("f")).getAll("probe"),
      inputs: document.getElementById("f").querySelectorAll("input").length,
      inCopy: [...document.querySelectorAll("[data-wide] *")].filter((n) => n.hasAttribute("id") || n.hasAttribute("name") || n.hasAttribute("for") || [...n.attributes].some((a) => a.value.includes("url(#"))).length,
      copies: document.querySelectorAll("[data-wide]").length,
    }));
    assert.deepEqual(read.ids, [1, 1, 1]);
    assert.deepEqual(read.probe, ["kept"]);
    assert.equal(read.inputs, 2);
    assert.equal(read.inCopy, 0);
    assert.equal(read.copies, 1, "the control label declines; the plain element label reserves");
    await context.close();
  });

  test("a button that holds a frame or media is not copied, and its weight does not change when chosen", async () => {
    const { page, context } = await open('<div class="segment" role="group" aria-label="V" id="g"><button type="button" aria-pressed="true"><span>Alpha</span><video></video></button><button type="button" aria-pressed="false">Plain</button></div>', { scheme: "dark" });
    await frames(page);
    assert.equal(await page.locator("#g button").first().evaluate((el) => el.querySelectorAll("[data-wide], [data-reserve]").length), 0);
    const base = await boxes(page, "#g button");
    await press(page, 1);
    await frames(page, 3);
    assert.deepEqual(await boxes(page, "#g button"), base, "the plain one reserves its width and the other keeps its weight: nothing moves");
    assert.equal(await page.locator("#g button").first().evaluate((el) => getComputedStyle(el).fontWeight), "400");
    await context.close();
  });
});

describe("A: the segment's usage no longer asks for data-selected on a glyph (item 8)", () => {
  test("usage/segment.md says a glyph follows the choice by itself", () => {
    const text = fs.readFileSync(path.join(skillDir, "parts", "usage", "segment.md"), "utf8");
    assert.ok(!text.includes("data-selected"), "the line that made a glyph static is gone");
    assert.match(text, /follows the choice by itself/);
  });
});

describe("C: a hovered or selected row's wash is on every cell of the row, pinned or not, in one colour (decision 149)", () => {
  const TABLE = (wrap) => `${wrap[0]}<table data-fixed data-pinned="1" style="min-width: 640px"><colgroup><col style="width: 160px"><col style="width: 140px"><col></colgroup><thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Commit</th></tr></thead><tbody><tr id="r1"><th scope="row">build-0141</th><td>Passed</td><td>a1b2c3</td></tr><tr id="r2" aria-selected="true"><th scope="row">build-0140</th><td>Failed</td><td>d4e5f6</td></tr><tr id="r3"><th scope="row">build-0139</th><td>Passed</td><td>0f0f0f</td></tr></tbody></table>${wrap[1]}`;
  const SHAPES = { "in a panel": ['<div style="width: 358px; margin: 16px"><div class="panel table-wrap">', "</div></div>"], "on the page": ['<div style="width: 358px; margin: 16px"><div class="table-wrap">', "</div></div>"] };
  for (const [where, wrap] of Object.entries(SHAPES)) {
    for (const scheme of ["dark", "light"]) {
      test(`${where}, ${scheme}: every cell of a hovered row and of a selected row is the one mixed colour; a pinned cell is opaque; nothing moves`, async () => {
        const { page, context } = await open(TABLE(wrap), { scheme });
        await frames(page);
        const read = (selector) => page.locator(selector).evaluate((el) => {
          const k = document.createElement("canvas"); k.width = k.height = 1; const x = k.getContext("2d", { willReadFrequently: true });
          x.fillStyle = getComputedStyle(el).backgroundColor; x.fillRect(0, 0, 1, 1);
          return { bg: [...x.getImageData(0, 0, 1, 1).data], image: getComputedStyle(el).backgroundImage, before: getComputedStyle(el, "::before").content };
        });
        const geometry = () => page.evaluate(() => [...document.querySelectorAll("th, td, tr")].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); }));
        await page.mouse.move(0, 0);
        await frames(page, 3);
        const still = await geometry();
        const rest = { name: await read("#r3 th"), status: await read("#r3 td:nth-child(2)"), commit: await read("#r3 td:nth-child(3)") };
        for (const c of Object.values(rest)) assert.equal(c.bg[3], 255, "a cell is opaque at rest");
        const dark = scheme === "dark";
        const mix = (base, a) => base.slice(0, 3).map((v) => Math.round(v * (1 - a) + (dark ? 255 : 0) * a));
        const close = (got, want, what) => want.forEach((v, i) => assert.ok(Math.abs(got.bg[i] - v) <= 1, `${what}: ${got.bg} vs ${want}`));
        // selected: all three cells are the selected mix, and the pinned one is opaque
        for (const [cell, selector] of [["name", "#r2 th"], ["status", "#r2 td:nth-child(2)"], ["commit", "#r2 td:nth-child(3)"]]) {
          const got = await read(selector);
          assert.equal(got.image, "none", `${cell}: no gradient or image`);
          assert.ok(["none", "normal"].includes(got.before), `${cell}: no ::before layer`);
          assert.equal(got.bg[3], 255, `${cell}: opaque`);
          close(got, mix(rest[cell].bg, dark ? 0.09 : 0.07), `selected ${cell}`);
        }
        // hovered: all three cells are the hover mix
        await page.locator("#r1").hover({ position: { x: 40, y: 10 } });
        await frames(page, 3);
        for (const [cell, selector] of [["name", "#r1 th"], ["status", "#r1 td:nth-child(2)"], ["commit", "#r1 td:nth-child(3)"]]) {
          const got = await read(selector);
          assert.equal(got.image, "none", `${cell}: no gradient or image`);
          assert.equal(got.bg[3], 255);
          close(got, mix(rest[cell].bg, dark ? 0.06 : 0.04), `hovered ${cell}`);
        }
        assert.deepEqual(await geometry(), still, "no column, header or row moved");
        await context.close();
      });
    }
  }
});

// ---- Return 3: the chosen item is 600 before the script has run, and the script changes nothing it can see ----

describe("A: a chosen segment and tab are 600 with the script off, and the script changes neither weight nor width (decision 138, A)", () => {
  const SEG = '<div class="segment" role="group" aria-label="Range" id="g"><button type="button" aria-pressed="false">Day</button><button type="button" aria-pressed="true">Week</button><button type="button" aria-pressed="false">Month</button></div>';
  const TAB = '<div data-tabs><div class="tabs" role="tablist" aria-label="Views"><button class="tab" role="tab" id="t0" aria-controls="p0" aria-selected="false">Inbox</button><button class="tab" role="tab" id="t1" aria-controls="p1" aria-selected="true">Drafts</button></div><div class="tabpanel" id="p0" role="tabpanel" aria-labelledby="t0" hidden>a</div><div class="tabpanel" id="p1" role="tabpanel" aria-labelledby="t1">b</div></div>';
  const open = async (body, scheme, scripts) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, javaScriptEnabled: scripts });
    const page = await context.newPage();
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html(body) }));
    await page.goto("https://basalt.test/");
    if (scripts) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return { page, context };
  };
  const chosen = (page, selector) => page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { item: getComputedStyle(el).fontWeight, label: getComputedStyle(el.querySelector("[data-label]") ?? el).fontWeight, size: [r.width, r.height], reserved: el.hasAttribute("data-reserved") }; });
  for (const scheme of ["dark", "light"]) {
    for (const [name, body, selector] of [["segment", SEG, '#g button[aria-pressed="true"]'], ["tab", TAB, '.tab[aria-selected="true"]']]) {
      test(`${name} (${scheme}): 600 with the script off; with it, the item's own box is the same and its label is 600`, async () => {
        const off = await open(body, scheme, false);
        const before = await chosen(off.page, selector);
        assert.equal(before.item, "600", "a chosen item is 600 with no script");
        assert.equal(before.reserved, false);
        await off.context.close();
        const on = await open(body, scheme, true);
        const after = await chosen(on.page, selector);
        assert.equal(after.reserved, true, "the script has reserved it");
        assert.equal(after.label, "600", "its label is 600");
        assert.equal(after.item, "400", "the 600 now sits on the label");
        assert.ok(Math.abs(after.size[0] - before.size[0]) < 0.01 && Math.abs(after.size[1] - before.size[1]) < 0.01, `its box ${before.size} became ${after.size}`);
        await on.context.close();
      });
    }
  }

  test("a button the script declines to copy is marked and stays 400 when chosen, and moves nothing", async () => {
    const { page, context } = await open('<div class="segment" role="group" aria-label="V" id="g"><button type="button" aria-pressed="true"><span>Alpha</span><video></video></button><button type="button" aria-pressed="false">Plain</button></div>', "dark", true);
    assert.equal(await page.locator("#g button").first().getAttribute("data-bare"), "");
    assert.equal(await page.locator("#g button").first().evaluate((el) => getComputedStyle(el).fontWeight), "400");
    const base = await boxes(page, "#g button");
    await press(page, 1);
    await frames(page, 3);
    assert.deepEqual(await boxes(page, "#g button"), base);
    await context.close();
  });
});


// DECISIONS 150: the pair and the live ink must hold, not just the button's reserved box.
const R4_READ = (el) => {
  const box = (n) => { const r = n.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
  const pair = [...el.querySelectorAll('[data-pair]')].find((n) => !n.closest('[data-wide]'));
  const icon = [...el.querySelectorAll('svg')].find((n) => !n.closest('[data-wide]') && getComputedStyle(n).opacity === '1');
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let word;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim() && !n.parentElement.closest('[data-wide], svg')) { const r = document.createRange(); r.selectNodeContents(n); word = r.getBoundingClientRect().left; break; }
  return { item: box(el), pair: pair && box(pair), icon: icon && box(icon), word };
};
const R4_CONTROL = (kind, content) => kind === 'segment'
  ? `<div class="segment" role="group" aria-label="r4"><button type="button" aria-pressed="true">${content}</button><button type="button" aria-pressed="false">Other</button></div>`
  : `<div data-tabs><div class="tabs" role="tablist" aria-label="r4"><button class="tab" role="tab" id="r4a" aria-controls="r4pa" aria-selected="true">${content}</button><button class="tab" role="tab" id="r4b" aria-controls="r4pb" aria-selected="false">Other</button></div><div role="tabpanel" id="r4pa" aria-labelledby="r4a">a</div><div role="tabpanel" id="r4pb" aria-labelledby="r4b" hidden>b</div></div>`;
const R4_SHAPES = {
  plain: 'Notifications', element: '<span>Notifications</span>',
  beside: '<span data-glyph="home"></span><span>Notifications</span>',
  inside: '<span><span data-glyph="home"></span>Notifications</span>',
};
const r4Pick = async (page, selector, index) => {
  await page.locator(selector).nth(index).evaluate((el) => {
    if (el.matches('.tab')) el.click();
    else [...el.parentElement.querySelectorAll('button')].forEach((n) => n.setAttribute('aria-pressed', String(n === el)));
  });
  await page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
};
for (const scheme of ['dark', 'light']) for (const [where, options] of MODES) for (const kind of ['segment', 'tab']) {
  const selector = kind === 'segment' ? '.segment button' : '.tab';
  test(`r4 regression: ${kind} glyph pair is 16 by 16 and the visible form moves 0px (${scheme}, ${where})`, async () => {
    const { page, context } = await open(R4_CONTROL(kind, '<span data-glyph="home"></span>Notifications'), { scheme, ...options });
    try {
      const read = () => page.locator(selector).first().evaluate(R4_READ);
      const chosen = await read(); await r4Pick(page, selector, 1); const rest = await read();
      assert.deepEqual(chosen.pair.slice(2), [16, 16]);
      assert.deepEqual(rest.pair.slice(2), [16, 16]);
      assert.deepEqual(rest.icon, chosen.icon, 'the visible rest and selected forms occupy the same box');
    } finally { await context.close(); }
  });
  test(`r4 regression: ${kind} live word and icon start edges hold in every label shape (${scheme}, ${where})`, async () => {
    for (const [shape, content] of Object.entries(R4_SHAPES)) {
      const { page, context } = await open(R4_CONTROL(kind, content), { scheme, ...options });
      try {
        const read = () => page.locator(selector).first().evaluate(R4_READ);
        const chosen = await read(); await r4Pick(page, selector, 1); const rest = await read();
        assert.deepEqual(rest.item, chosen.item, `${shape}: the item holds`);
        assert.equal(rest.word, chosen.word, `${shape}: the word's start edge holds`);
        assert.equal(rest.icon?.[0], chosen.icon?.[0], `${shape}: the icon's start edge holds`);
        assert.equal(rest.item[3], options.touch ? 44 : kind === 'segment' ? 28 : 36);
      } finally { await context.close(); }
    }
  });
}
test('r4 regression: reserve decline lists are twins and include every unsafe tag', () => {
  const react = fs.readFileSync('packages/react/src/chosen.tsx', 'utf8').match(/const UNSAFE = "([^"]+)"/)[1].split(/\s*,\s*/).sort();
  const skill = fs.readFileSync('tools/html-skill/src/core.js', 'utf8').match(/var no = '([^']+)'/)[1].split(/\s*,\s*/).sort();
  assert.deepEqual(skill, react);
  for (const tag of ['input', 'select', 'textarea', 'button', 'form', 'iframe', 'object', 'embed', 'script', 'style', 'video', 'audio', 'canvas', 'dialog', 'template', 'slot']) assert.ok(react.includes(tag), tag);
});
for (const kind of ['segment', 'tab']) test(`r4 regression: ${kind} declines form controls and canvas at 400 with no second control`, async () => {
  for (const content of ['<input type="hidden" name="probe" value="kept">', '<input name="probe" value="kept">', '<select name="probe"><option>kept</option></select>', '<textarea name="probe">kept</textarea>', '<canvas></canvas>']) {
    const selector = kind === 'segment' ? '.segment button' : '.tab';
    const { page, context } = await open(`<form id="r4form">${R4_CONTROL(kind, '<span>Notifications</span>' + content)}</form>`);
    try {
      const target = page.locator(selector).first();
      assert.equal(await target.getAttribute('data-bare'), '');
      assert.equal(await target.locator('[data-wide], [data-reserve]').count(), 0);
      assert.equal(await target.evaluate((el) => getComputedStyle(el).fontWeight), '400');
      assert.deepEqual(await page.evaluate(() => new FormData(document.getElementById('r4form')).getAll('probe')), content.includes('canvas') ? [] : ['kept']);
      const chosen = await target.evaluate(R4_READ); await r4Pick(page, selector, 1);
      assert.deepEqual(await target.evaluate(R4_READ), chosen);
    } finally { await context.close(); }
  }
});
