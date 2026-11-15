// audit-design A, D and the rule sentences of E (decisions 138 and 139; the council decided them and the owner approved them; the
// implementation has not been reviewed). Driven in Chromium against the built package with the real stylesheet. Every test here
// fails on origin/main. Text widths use the fallback font (no web font loads), so measured margins are wide.
//
//   A  "chosen" is the label at 600 in primary ink against 400 in secondary, each label reserving its 600 width: a segment, a
//      vertical tab, a horizontal tab and the current page. Every label is 4.5:1 or better on its fill at every level, and every
//      item's box moves 0px when the choice changes. The fill ratio and the ink ratio are reported, and neither is the pass.
//   A  forced colours: Highlight and HighlightText on the chosen segment, vertical tab and current page; the horizontal tab keeps
//      its Highlight underline; no outline marks a state; focus is the ordinary +2 ring, on the chosen item too.
//   C1 the selected pill keeps its hairline and loses the drop shadow; shadow-pill is gone from the tokens.
//   D  more contrast: three aliases, in both themes and under a theme chosen with data-theme.
//   E1 radius follows the drawn box; the parts that ship radius-full still do.
//   C10 the chip's glyph swap crossfades over duration-fast with or without reduced motion.
//   C11 a wash over an opaque pinned cell is one colour, never a gradient, an image or a layer.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const LEVELS = [0, 1, 2, 3];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

// In-page helpers: a colour as pixels (a canvas resolves oklch and system colours), the colour an element is drawn on, and a ratio.
const HELPERS = `
window.__px = (css) => { const k = document.createElement("canvas"); k.width = k.height = 1; const x = k.getContext("2d", { willReadFrequently: true }); x.fillStyle = css; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data]; };
window.__lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
window.__ratio = (a, b) => { const [hi, lo] = [window.__lum(a), window.__lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
// Paint an element's fill the way a browser does: each ancestor's background from the fixture's frame down, then, for a chosen item,
// the shared pill (which paints under the item) and the item's own background.
window.__over = (top, under) => { const a = top[3] / 255; return [0, 1, 2].map((i) => Math.round(top[i] * a + under[i] * (1 - a))).concat(255); };
window.__fill = (el) => {
  const chain = []; for (let n = el; n; n = n.parentElement) { chain.unshift(n); if (n.hasAttribute("data-frame")) break; }
  let out = [0, 0, 0, 255];
  for (const n of chain) {
    if (n === el) { const pill = n.parentElement?.querySelector(":scope > .basalt-pill"); if (pill && getComputedStyle(pill).display !== "none" && (n.hasAttribute("data-pressed") || n.hasAttribute("data-active"))) out = window.__over(window.__px(getComputedStyle(pill).backgroundColor), out); }
    out = window.__over(window.__px(getComputedStyle(n).backgroundColor), out);
  }
  return out;
};
window.__ink = (el) => window.__over(window.__px(getComputedStyle(el).color), window.__fill(el));
// The 600 is on the label, not on the item (decision 149): the weight a reader sees is the label's.
window.__weight = (el) => getComputedStyle(el.querySelector("[data-label], .basalt-chosen-label > :first-child") ?? el).fontWeight;
window.__box = (el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
`;

const open = async (body, { theme = "light", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...DESKTOP, ...options });
  await page.evaluate(() => { document.title = "Audit design A"; document.documentElement.lang = "en"; });
  await page.addStyleTag({ content: "body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); } [data-frame] { padding: 16px; background: var(--_surface, var(--basalt-surface-page)); }" });
  await page.addScriptTag({ content: HELPERS });
  await settle(page);
  return { page, errors };
};

const FIVE = ["Day", "Week", "Month", "Quarter", "Year"];
const frame = (level, inner) => `<div data-frame ${level ? `data-level="${level}"` : ""} id="l${level}">${inner}</div>`;
const all = (inner) => `<>${LEVELS.map((l) => frame(l, inner)).join("")}</>`.replace(/<div data-frame/g, "<div data-frame");

// Each control, at every level: how to find its items, which one is chosen, and the markup.
const segmented = `<B.SegmentedControl aria-label="Range" defaultValue="week">${FIVE.map((l) => `<B.Segment value="${l.toLowerCase()}">${l}</B.Segment>`).join("")}</B.SegmentedControl>`;
const vertical = `<B.Tabs orientation="vertical" defaultValue="account"><B.TabsList aria-label="Sections">${["Account", "Billing", "Access keys", "Notifications"].map((l) => `<B.Tab value="${l.toLowerCase().replace(" ", "")}">${l}</B.Tab>`).join("")}</B.TabsList>${["account", "billing", "accesskeys", "notifications"].map((v) => `<B.TabsPanel value="${v}">${v}</B.TabsPanel>`).join("")}</B.Tabs>`;
const horizontal = `<B.Tabs defaultValue="overview"><B.TabsList aria-label="Views">${["Overview", "Activity", "Settings"].map((l) => `<B.Tab value="${l.toLowerCase()}">${l}</B.Tab>`).join("")}</B.TabsList>${["overview", "activity", "settings"].map((v) => `<B.TabsPanel value="${v}">${v}</B.TabsPanel>`).join("")}</B.Tabs>`;
const pagesButtons = `function Pages() { const [page, setPage] = React.useState(3); return <B.Pagination aria-label="Pages" page={page} pageCount={7} onPageChange={setPage} />; }`;
const pagesLinks = `function PageLinks() { const [page, setPage] = React.useState(3); return <div onClick={(e) => { const a = e.target.closest("a"); if (!a) return; e.preventDefault(); setPage(Number(a.getAttribute("aria-label").replace("Page ", ""))); }}><B.Pagination aria-label="Page links" page={page} pageCount={7} hrefForPage={(n) => "#" + n} /></div>; }`;

const CONTROLS = {
  "segmented control": { jsx: segmented, items: ".basalt-segment", chosen: "[data-pressed]", own: "button" },
  "vertical tabs": { jsx: vertical, items: ".basalt-tab", chosen: "[data-active]", own: "button" },
  "horizontal tabs": { jsx: horizontal, items: ".basalt-tab", chosen: "[data-active]", own: "button" },
  "pagination (buttons)": { jsx: "<Pages />", prelude: pagesButtons, items: ".basalt-pagination .basalt-button[aria-label^='Page ']", chosen: "[aria-current='page']", own: "button" },
  "pagination (links)": { jsx: "<PageLinks />", prelude: pagesLinks, items: ".basalt-page-link[aria-label^='Page ']", chosen: "[aria-current='page']", own: "a" },
};
const fixture = (spec) => `${spec.prelude ?? ""}\n${render(all(spec.jsx))}`;
const items = (page, spec, level) => page.locator(`#l${level} ${spec.items}`);

/** Every item's box, by index, in one frame. */
const boxes = (page, spec, level) => page.evaluate(({ items, level }) => [...document.querySelectorAll(`#l${level} ${items}`)].map(window.__box), { items: spec.items, level });

describe("A: chosen is the label at 600 in primary ink against 400 in secondary, each label reserving its 600 width", () => {
  for (const [name, spec] of Object.entries(CONTROLS)) {
    for (const theme of THEMES) {
      test(`${name} (${theme}): the chosen label is 600 and the rest are 400, at every level`, async () => {
        const { page, errors } = await open(fixture(spec), { theme });
        for (const level of LEVELS) {
          const weights = await page.evaluate(({ items, chosen, level }) => [...document.querySelectorAll(`#l${level} ${items}`)].map((el) => ({ chosen: el.matches(chosen), weight: window.__weight(el), label: getComputedStyle(el.querySelector("[data-label]") ?? el).fontWeight })), { items: spec.items, chosen: spec.chosen, level });
          assert.equal(weights.filter((w) => w.chosen).length, 1, `${name} level ${level}: one chosen item`);
          for (const w of weights) {
            assert.equal(w.weight, w.chosen ? "600" : "400", `${name} level ${level}: ${JSON.stringify(w)}`);
            assert.equal(w.label, w.weight, "the label's own span draws the same weight");
          }
        }
        assert.deepEqual(errors, []);
        await page.close();
      });

      test(`${name} (${theme}): every label's box is as wide as its text at 600, chosen or not`, async () => {
        const { page } = await open(fixture(spec), { theme });
        const rows = await page.evaluate(({ items }) => [...document.querySelectorAll(`#l0 ${items}`)].map((el) => {
          const label = el.querySelector("[data-label]");
          const probe = document.createElement("span");
          probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-weight:600";
          probe.textContent = label.getAttribute("data-label");
          label.parentElement.append(probe);
          const wide = probe.getBoundingClientRect().width;
          probe.remove();
          return { text: label.getAttribute("data-label"), box: label.getBoundingClientRect().width, wide, copy: label.textContent };
        }), { items: spec.items });
        assert.ok(rows.length >= 3);
        for (const r of rows) {
          assert.ok(r.box >= r.wide - 0.05, `${r.text}: box ${r.box} is under its 600 width ${r.wide}`);
          assert.equal(r.copy, r.text, "the DOM holds the words once: the copy is an attribute, not text");
        }
        await page.close();
      });

      test(`${name} (${theme}): choosing each item in turn moves every item's box 0px`, async () => {
        const { page } = await open(fixture(spec), { theme });
        for (const level of [0, 1, 2]) {
          const before = await boxes(page, spec, level);
          const count = before.length;
          for (let i = 0; i < count; i += 1) {
            await items(page, spec, level).nth(i).click();
            await settle(page);
            const after = await boxes(page, spec, level);
            before.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `${name} level ${level}: choosing item ${i} moved item ${k} by ${(after[k][m] - v).toFixed(3)}px (${["x", "y", "width", "height"][m]})`)));
          }
        }
        await page.close();
      });

      test(`${name} (${theme}): the chosen label is 4.5:1 or better on its fill, and so is every other, at every level (the fill and ink steps are reported, not the pass)`, async (t) => {
        const { page } = await open(fixture(spec), { theme });
        for (const level of LEVELS) {
          const read = await page.evaluate(({ items, chosen, level }) => [...document.querySelectorAll(`#l${level} ${items}`)].map((el) => {
            const fill = window.__fill(el); const ink = window.__ink(el);
            return { chosen: el.matches(chosen), label: window.__ratio(ink, fill), fill, ink };
          }), { items: spec.items, chosen: spec.chosen, level });
          for (const r of read) assert.ok(r.label >= 4.5, `${name} level ${level}${r.chosen ? " chosen" : ""}: label is ${r.label.toFixed(2)}:1 on its fill`);
          const on = read.find((r) => r.chosen); const off = read.find((r) => !r.chosen);
          // Reported, never asserted as the pass: the chosen fill against what beside it holds, and primary ink against secondary.
          const beside = await page.evaluate(({ items, chosen, level }) => { const el = [...document.querySelectorAll(`#l${level} ${items}`)].find((e) => !e.matches(chosen)); return window.__fill(el); }, { items: spec.items, chosen: spec.chosen, level });
          const { ratio } = { ratio: await page.evaluate(([a, b]) => window.__ratio(a, b), [on.fill, beside]) };
          const ink = await page.evaluate(([a, b]) => window.__ratio(a, b), [on.ink, off.ink]);
          t.diagnostic(`${theme} level ${level}: fill ${ratio.toFixed(2)}:1 against beside, ink step ${ink.toFixed(2)}:1, label ${on.label.toFixed(2)}:1 chosen, ${off.label.toFixed(2)}:1 resting`);
        }
        await page.close();
      });
    }
  }

  test("five short labels at 390 fit their column, and choosing each moves nothing", async () => {
    const { page } = await open(`${render(`<div style={{ width: 358 }} data-frame id="l0">${segmented}</div>`)}`, { theme: "dark", ...PHONE });
    const wide = await page.evaluate(() => { const c = document.querySelector(".basalt-segmented").getBoundingClientRect(); return { width: c.width, column: document.querySelector("#l0").clientWidth - 32 }; });
    assert.ok(wide.width <= wide.column + 0.5, `the control is ${wide.width}px in a ${wide.column}px column`);
    const before = await page.evaluate(() => [...document.querySelectorAll(".basalt-segment")].map(window.__box));
    for (let i = 0; i < 5; i += 1) {
      await page.locator(".basalt-segment").nth(i).click();
      const after = await page.evaluate(() => [...document.querySelectorAll(".basalt-segment")].map(window.__box));
      before.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `item ${k} moved`)));
    }
    await page.close();
  });

  test("on touch every segment, tab and page keeps its 44px target", async () => {
    const { page } = await open(fixture(CONTROLS["segmented control"]) + "\n", { theme: "light", ...PHONE });
    const small = await page.evaluate(() => [...document.querySelectorAll(".basalt-segment")].filter((el) => el.getBoundingClientRect().height < 43.99 || el.getBoundingClientRect().width < 43.99).length);
    assert.equal(small, 0);
    await page.close();
    for (const spec of [CONTROLS["vertical tabs"], CONTROLS["horizontal tabs"], CONTROLS["pagination (buttons)"], CONTROLS["pagination (links)"]]) {
      const touch = await open(fixture(spec), { theme: "light", ...PHONE });
      const sizes = await touch.page.evaluate(({ items }) => [...document.querySelectorAll(items)].map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }), { items: spec.items });
      for (const [w, h] of sizes) assert.ok(w >= 43.99 && h >= 43.99, `${spec.items}: ${w} by ${h}`);
      await touch.page.close();
    }
  });

  // Decision 145, item 5: an icon takes its selected form whenever its item is chosen, with a label or without one. Each icon draws both forms
  // in one box (`.basalt-glyph-pair`) and the item's state shows one, so the box is the same either way.
  const shown = (page, selector) => page.evaluate((selector) => [...document.querySelectorAll(`${selector} .basalt-glyph-pair`)].filter((pair) => !pair.closest("[data-wide]")).map((pair) => {
    const [rest, chosen] = [...pair.children].map((svg) => svg.innerHTML.replace(/basalt-glyph-r\d+/g, "id"));
    const [first, last] = [...pair.children].map((svg) => getComputedStyle(svg).opacity);
    const box = pair.getBoundingClientRect();
    return { form: first === "1" && last === "0" ? "rest" : first === "0" && last === "1" ? "selected" : `${first}/${last}`, different: rest !== chosen, box: [box.width, box.height] };
  }), selector);
  for (const [name, jsx, items] of [
    ["a segment with a label", `<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a"><B.Icon icon={B.HomeGlyph} />Home</B.Segment><B.Segment value="b"><B.Icon icon={B.HomeGlyph} />Other</B.Segment></B.SegmentedControl>`, ".basalt-segment"],
    ["a segment with no label", `<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a" aria-label="Home"><B.Icon icon={B.HomeGlyph} /></B.Segment><B.Segment value="b" aria-label="Other"><B.Icon icon={B.HomeGlyph} /></B.Segment></B.SegmentedControl>`, ".basalt-segment"],
    ["a tab with a label", `<B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a"><B.Icon icon={B.HomeGlyph} />Home</B.Tab><B.Tab value="b"><B.Icon icon={B.HomeGlyph} />Other</B.Tab></B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel></B.Tabs>`, ".basalt-tab"],
    ["a tab whose label is in an element", `<B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a"><B.Icon icon={B.HomeGlyph} /><span>Home</span></B.Tab><B.Tab value="b"><B.Icon icon={B.HomeGlyph} /><span>Other</span></B.Tab></B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel></B.Tabs>`, ".basalt-tab"],
  ]) {
    test(`${name}: the icon draws its selected form while chosen and its rest form otherwise, and its box does not change`, async () => {
      const { page } = await open(render(jsx), { theme: "dark" });
      const before = await shown(page, items);
      assert.deepEqual(before.map((g) => g.form), ["selected", "rest"], "the chosen item's icon is closed and filled");
      assert.ok(before.every((g) => g.different), "the two forms differ");
      await page.locator(items).nth(1).click();
      await settle(page);
      const after = await shown(page, items);
      assert.deepEqual(after.map((g) => g.form), ["rest", "selected"]);
      assert.deepEqual(after.map((g) => g.box), before.map((g) => g.box), "the glyph's box is the same either way");
      await page.close();
    });
  }

  test("a segment's icon sits on its label's centre line, 6px before it, as a tab's does", async () => {
    const { page } = await open(render(`<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a"><B.Icon icon={B.HomeGlyph} />Home</B.Segment><B.Segment value="b"><B.Icon icon={B.HomeGlyph} />Other</B.Segment></B.SegmentedControl>`), { theme: "dark" });
    for (const which of [0, 1]) {
      const out = await page.locator(".basalt-segment").nth(which).evaluate((el) => {
        const icon = el.querySelector(".basalt-glyph-pair").getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(el.querySelector("[data-label]").firstChild);
        const text = [...range.getClientRects()].find((r) => r.width > 0);
        return { iconMid: icon.top + icon.height / 2, textMid: text.top + text.height / 2, gap: text.left - icon.right };
      });
      assert.ok(Math.abs(out.iconMid - out.textMid) <= 1.6, `centred: ${out.iconMid} vs ${out.textMid}`);
      assert.ok(Math.abs(out.gap - 6) <= 1.5, `gap ${out.gap}`);
    }
    await page.close();
  });

  test("an icon the app set `selected` on is left as it is", async () => {
    const { page } = await open(render(`<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a" aria-label="Home"><B.Icon icon={B.HomeGlyph} selected={false} /></B.Segment><B.Segment value="b" aria-label="Other">Other</B.Segment></B.SegmentedControl>`), { theme: "dark" });
    assert.equal(await page.locator(".basalt-glyph-pair").count(), 0);
    await page.close();
  });
});

// Defect A (decision 145): every label an app can write reserves its 600 width, and a custom render is no exception.
describe("A: a label that is not plain text reserves its 600 width too, so choosing moves every item 0px", () => {
  const panels = (values) => values.map((v) => `<B.TabsPanel value="${v}">${v}</B.TabsPanel>`).join("");
  const TABS = (tabs, orientation = "") => `<B.Tabs ${orientation} defaultValue="b"><B.TabsList aria-label="Views">${tabs}</B.TabsList>${panels(["a", "b", "c"])}</B.Tabs>`;
  const SPANS = {
    "segments whose labels are in spans": [`<B.SegmentedControl aria-label="Range" defaultValue="b"><B.Segment value="a"><span>Billing</span></B.Segment><B.Segment value="b"><span>Notifications</span></B.Segment><B.Segment value="c"><span>Access keys</span></B.Segment></B.SegmentedControl>`, ".basalt-segment"],
    "horizontal tabs whose labels are in spans": [TABS(`<B.Tab value="a"><span>Inbox</span></B.Tab><B.Tab value="b"><span>Drafts</span></B.Tab><B.Tab value="c"><span>Archived</span></B.Tab>`), ".basalt-tab"],
    "vertical tabs whose labels are in spans": [TABS(`<B.Tab value="a"><span>Account</span></B.Tab><B.Tab value="b"><span>Notifications</span></B.Tab><B.Tab value="c"><span>Access keys</span></B.Tab>`, 'orientation="vertical"'), ".basalt-tab"],
    "tabs drawn as links (render, not a native button)": [TABS(`<B.Tab value="a" nativeButton={false} render={<a href="#a" />}>Inbox</B.Tab><B.Tab value="b" nativeButton={false} render={<a href="#b" />}>Drafts</B.Tab><B.Tab value="c" nativeButton={false} render={<a href="#c" />}>Archived</B.Tab>`), ".basalt-tab"],
    "tabs drawn as links with their labels in spans": [TABS(`<B.Tab value="a" nativeButton={false} render={<a href="#a" />}><span>Inbox</span></B.Tab><B.Tab value="b" nativeButton={false} render={<a href="#b" />}><span>Drafts</span></B.Tab><B.Tab value="c" nativeButton={false} render={<a href="#c" />}><span>Archived</span></B.Tab>`), ".basalt-tab"],
    "an icon beside words in an element": [TABS(`<B.Tab value="a"><B.Icon icon={B.HomeGlyph} /><span>Inbox</span></B.Tab><B.Tab value="b"><B.Icon icon={B.HomeGlyph} /><span>Drafts</span></B.Tab><B.Tab value="c"><B.Icon icon={B.HomeGlyph} /><span>Archived</span></B.Tab>`), ".basalt-tab"],
    "an icon beside plain words": [`<B.SegmentedControl aria-label="Range" defaultValue="b"><B.Segment value="a"><B.Icon icon={B.HomeGlyph} />Billing</B.Segment><B.Segment value="b"><B.Icon icon={B.HomeGlyph} />Notifications</B.Segment><B.Segment value="c"><B.Icon icon={B.HomeGlyph} />Keys</B.Segment></B.SegmentedControl>`, ".basalt-segment"],
  };
  for (const [name, [jsx, items]] of Object.entries(SPANS)) {
    for (const [theme, where, options] of [["dark", "1440 with a fine pointer", DESKTOP], ["light", "1440 with a fine pointer", DESKTOP], ["dark", "390 with a coarse pointer", PHONE], ["light", "390 with a coarse pointer", PHONE]]) {
      test(`${name} (${theme}, ${where}): choosing each item in turn moves every item's box 0px, the chosen one is 600, and a hidden copy is out of the tree`, async () => {
        const { page } = await open(render(jsx), { theme, ...options });
        const read = () => page.evaluate((items) => [...document.querySelectorAll(items)].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }), items);
        const base = await read();
        for (let i = 0; i < base.length; i += 1) {
          await page.locator(items).nth(i).click();
          await settle(page);
          const after = await read();
          base.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `${name}: choosing ${i} moved item ${k} by ${(after[k][m] - v).toFixed(3)}px (${["x", "y", "width", "height"][m]})`)));
          const weights = await page.evaluate((items) => [...document.querySelectorAll(items)].map((el) => window.__weight(el)), items);
          assert.deepEqual(weights, weights.map((_, k) => (k === i ? "600" : "400")));
        }
        const hidden = await page.evaluate((items) => [...document.querySelectorAll(`${items} [data-wide]`)].map((el) => [el.getAttribute("aria-hidden"), el.hasAttribute("inert"), getComputedStyle(el).visibility]), items);
        for (const h of hidden) assert.deepEqual(h, ["true", true, "hidden"]);
        await page.close();
      });
    }
  }
});

describe("A: in forced colours the chosen item is Highlight with HighlightText, nothing draws an outline as a state, and focus is the ordinary ring", () => {
  const FORCED = async (spec, theme) => {
    const { page } = await open(fixture(spec), { theme });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    return page;
  };
  const system = (page, css) => page.evaluate((css) => { const probe = document.createElement("i"); probe.style.cssText = css; document.body.append(probe); const s = getComputedStyle(probe); const out = { bg: s.backgroundColor, color: s.color }; probe.remove(); return out; }, css);

  for (const theme of THEMES) {
    for (const name of ["segmented control", "vertical tabs", "pagination (buttons)", "pagination (links)"]) {
      test(`${name} (${theme}): the chosen item is Highlight on HighlightText at 600, with no outline and no shadow`, async () => {
        const spec = CONTROLS[name];
        const page = await FORCED(spec, theme);
        const want = await system(page, "background: Highlight; color: HighlightText");
        const read = await page.locator(`#l0 ${spec.items}${spec.chosen}`).evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color, outline: s.outlineStyle, outlineWidth: s.outlineWidth, shadow: s.boxShadow, weight: window.__weight(el), border: s.borderTopColor }; });
        assert.equal(read.bg, want.bg, "Highlight");
        assert.equal(read.color, want.color, "HighlightText");
        assert.equal(read.outline, "none", "no outline marks the state");
        assert.equal(read.shadow, "none", "no box shadow on the current page or the chosen item");
        assert.equal(read.weight, "600");
        await page.close();
      });

      test(`${name} (${theme}): focus on the chosen item is the ordinary 2px ring at +2, as on any other item`, async () => {
        const spec = CONTROLS[name];
        const page = await FORCED(spec, theme);
        const ring = (el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset }; };
        await page.locator(`#l0 ${spec.items}${spec.chosen}`).focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        const onChosen = await page.locator(`#l0 ${spec.items}${spec.chosen}`).evaluate(ring);
        assert.deepEqual(onChosen, { style: "solid", width: "2px", offset: "2px" }, "the chosen item shows the ring");
        const other = page.locator(`#l0 ${spec.items}:not(${spec.chosen})`).first();
        await other.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        const onOther = await other.evaluate(ring);
        // a segment is a roving group, so the keyboard reaches the other item with the arrow keys rather than Tab: either way, the ring is the same
        if (onOther.style !== "none") assert.deepEqual(onOther, onChosen);
        await page.close();
      });
    }

    test(`horizontal tabs (${theme}): the tab keeps its Highlight underline and its 600, and draws no outline`, async () => {
      const spec = CONTROLS["horizontal tabs"];
      const page = await FORCED(spec, theme);
      const want = await system(page, "background: Highlight");
      const read = await page.evaluate(() => { const i = document.querySelector("#l0 .basalt-tabs-indicator"); const t = document.querySelector("#l0 .basalt-tab[data-active]"); return { bg: getComputedStyle(i).backgroundColor, height: getComputedStyle(i).height, outline: getComputedStyle(t).outlineStyle, weight: window.__weight(t) }; });
      assert.equal(read.bg, want.bg);
      assert.equal(read.height, "2px");
      assert.equal(read.outline, "none");
      assert.equal(read.weight, "600");
      await page.close();
    });
  }
});

// Defect B (decision 145): in forced colours the chosen item's focus ring is the system's, as an ordinary control's is, not the theme's grey.
describe("A: in forced colours the chosen item's focus ring is the ordinary ring's colour, with the theme and the palette disagreeing both ways", () => {
  for (const [theme, palette] of [["dark", "light"], ["light", "dark"], ["dark", "dark"], ["light", "light"]]) {
    for (const name of ["segmented control", "vertical tabs", "pagination (buttons)", "pagination (links)"]) {
      test(`${name}: the page theme is ${theme} and the palette is ${palette}`, async () => {
        const spec = CONTROLS[name];
        const { page } = await open(`${spec.prelude ?? ""}\n${render(`<div data-frame id="l0"><B.Button id="plain">Plain</B.Button>${spec.jsx.startsWith("<") ? spec.jsx : spec.jsx}</div>`)}`, { theme });
        await page.emulateMedia({ forcedColors: "active", colorScheme: palette });
        await settle(page);
        const ring = (selector) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, colour: s.outlineColor }; });
        const keyboard = async (selector) => { await page.locator(selector).first().focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab"); };
        await keyboard("#plain");
        const ordinary = await ring("#plain");
        await keyboard(`${spec.items}${spec.chosen}`);
        const chosen = await ring(`${spec.items}${spec.chosen}`);
        assert.deepEqual([chosen.style, chosen.width, chosen.offset], ["solid", "2px", "2px"]);
        assert.equal(chosen.colour, ordinary.colour, "the chosen item's ring is the colour an ordinary control's is");
        // and it is visible against the palette's Canvas: 3:1 (2.4.11, 1.4.11)
        const ratio = await page.evaluate((colour) => window.__ratio(window.__over(window.__px(colour), window.__px("Canvas")), window.__px("Canvas")), chosen.colour);
        assert.ok(ratio >= 3, `the ring is ${ratio.toFixed(2)}:1 on Canvas`);
        await page.close();
      });
    }
  }
});

describe("C1: the selected pill keeps its hairline and loses the drop shadow; shadow-pill is retired", () => {
  const hairlineOnly = (shadow, what) => {
    assert.notEqual(shadow, "none", `${what}: the hairline stays`);
    assert.equal((shadow.match(/-?\d+(\.\d+)?px/g) ?? []).join(" "), "0px 0px 0px 1px", `${what}: one ring, 1px, no offset and no blur (${shadow})`);
  };
  for (const theme of THEMES) {
    test(`the shared pill and each item's own pill are a 1px hairline and no drop (${theme})`, async () => {
      for (const name of ["segmented control", "vertical tabs"]) {
        const spec = CONTROLS[name];
        const { page } = await open(fixture(spec), { theme });
        hairlineOnly(await page.locator(`#l0 .basalt-pill`).evaluate((el) => getComputedStyle(el).boxShadow), `${name} pill`);
        // with the shared pill off (reduced motion) the chosen item paints its own
        await page.emulateMedia({ reducedMotion: "reduce" });
        await settle(page);
        hairlineOnly(await page.locator(`#l0 ${spec.items}${spec.chosen}`).evaluate((el) => getComputedStyle(el).boxShadow), `${name} chosen item`);
        const colour = await page.locator(`#l0 ${spec.items}${spec.chosen}`).evaluate((el) => getComputedStyle(el).boxShadow.match(/^(.*?\)) /)?.[1]);
        const hairline = await page.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-border-hairline)"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
        assert.equal(colour, hairline, "the ring is the hairline token");
        await page.close();
      }
    });
  }

  test("the tokens no longer carry shadow-pill, in the CSS, the JSON or Swift", () => {
    const tokens = path.join(pkg, "..", "tokens", "dist");
    for (const file of ["css/tokens.css", "json/tokens.json"]) assert.ok(!fs.readFileSync(path.join(tokens, file), "utf8").includes("shadow-pill") && !/"shadow-pill"|shadow\.pill/.test(fs.readFileSync(path.join(tokens, file), "utf8")), `${file} still has shadow-pill`);
    assert.ok(!fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8").includes("shadow-pill"), "the components' CSS still reads shadow-pill");
  });
});

describe("D: more contrast: lines, tertiary ink and a field's boundary step, in both themes and under a theme chosen with the toggle", () => {
  const probe = (page, selector) => page.evaluate((selector) => {
    const el = document.querySelector(selector);
    const read = (name) => getComputedStyle(el).getPropertyValue(name).trim();
    return Object.fromEntries(["border-hairline", "border-rim", "border-rim-top", "border-divider", "border-input", "border-field", "text-secondary", "text-tertiary", "shadow-hairline"].map((n) => [n, read(`--basalt-${n}`)]));
  }, selector);
  // Where each root's theme comes from: the page's attribute, the system preference with no attribute, a nested scope.
  const SCOPES = [
    { name: "light, chosen", html: "light", scheme: "light", target: "html" },
    { name: "dark, chosen", html: "dark", scheme: "light", target: "html" },
    { name: "dark, by the system", html: "", scheme: "dark", target: "html" },
    { name: "light, by the system", html: "", scheme: "light", target: "html" },
    { name: "a dark scope inside a light page", html: "light", scheme: "light", target: "#inner" },
    { name: "a light scope inside a dark page", html: "dark", scheme: "dark", target: "#inner" },
  ];
  const BODY = (scope) => render(`<div id="inner" data-theme="${scope.target === "#inner" ? (scope.html === "light" ? "dark" : "light") : scope.html || "none"}"><B.Card id="card">c</B.Card></div>`);

  for (const scope of SCOPES) {
    test(`${scope.name}: lines are the input boundary, tertiary ink is secondary and a field's boundary is secondary; without the mode they are not`, async () => {
      const { page } = await open(BODY(scope), { theme: scope.html, colorScheme: scope.scheme });
      await page.evaluate((v) => { if (!v) document.documentElement.removeAttribute("data-theme"); }, scope.html);
      await page.evaluate(() => { const i = document.getElementById("inner"); if (i.getAttribute("data-theme") === "none") i.removeAttribute("data-theme"); });
      const normal = await probe(page, scope.target);
      assert.notEqual(normal["border-divider"], normal["border-input"], "outside the mode a divider is not the input boundary");
      assert.notEqual(normal["text-tertiary"], normal["text-secondary"]);
      assert.equal(normal["border-field"], normal["border-input"]);
      await page.emulateMedia({ contrast: "more" });
      await settle(page);
      const more = await probe(page, scope.target);
      for (const line of ["border-hairline", "border-rim", "border-rim-top", "border-divider"]) assert.equal(more[line], more["border-input"], `${scope.name}: ${line} steps to border-input (${more[line]} vs ${more["border-input"]})`);
      assert.equal(more["text-tertiary"], more["text-secondary"], "tertiary ink steps to text-secondary");
      assert.equal(more["border-field"], more["text-secondary"], "a field's boundary steps to text-secondary");
      assert.equal(more["border-input"], normal["border-input"], "the input boundary itself does not move");
      assert.equal(more["text-secondary"], normal["text-secondary"], "secondary ink does not move");
      assert.ok(more["shadow-hairline"].includes(more["border-input"].replace(/\s+/g, " ")) || more["shadow-hairline"].includes("var(") || more["shadow-hairline"].length > 0, "the hairline shadow is redefined");
      await page.close();
    });
  }

  test("a real card's rim, a field's boundary and the pill's hairline step on the page, and nothing else changes", async () => {
    for (const theme of THEMES) {
      const jsx = `<><B.Card id="card">card</B.Card><B.Input id="field" aria-label="Field" /><B.Separator /><div id="seg">${segmented}</div></>`;
      const { page } = await open(`${render(jsx)}`, { theme });
      const read = () => page.evaluate(() => {
        const card = getComputedStyle(document.getElementById("card"));
        const field = getComputedStyle(document.getElementById("field"));
        const pill = getComputedStyle(document.querySelector("#seg .basalt-pill"));
        const sep = getComputedStyle(document.querySelector(".basalt-separator"));
        const probe = (css) => { const i = document.createElement("i"); i.style.cssText = css; document.body.append(i); const s = getComputedStyle(i); const out = { color: s.color, bg: s.backgroundColor }; i.remove(); return out; };
        return { rim: card.borderRightColor, rimTop: card.borderTopColor, field: field.boxShadow, pill: pill.boxShadow, divider: sep.backgroundColor, input: probe("color: var(--basalt-border-input); background: var(--basalt-border-input)").color, secondary: probe("color: var(--basalt-text-secondary)").color, surface: card.backgroundColor };
      });
      const normal = await read();
      await page.emulateMedia({ contrast: "more" });
      await settle(page);
      const more = await read();
      assert.equal(more.rim, more.input, `${theme}: the rim is the input boundary`);
      assert.equal(more.rimTop, more.input, `${theme}: the top rim too, on every side one colour`);
      assert.equal(more.divider, more.input, `${theme}: the divider`);
      assert.ok(more.field.startsWith(more.secondary), `${theme}: a field's boundary is secondary ink (${more.field})`);
      assert.ok(more.pill.startsWith(more.input), `${theme}: the pill's hairline is the input boundary (${more.pill})`);
      assert.notEqual(normal.rim, more.rim);
      assert.equal(normal.surface, more.surface, "surfaces do not move");
      await page.close();
    }
  });
});

// Decision 145, item 1: under more contrast a hovered edge is never fainter than the edge at rest.
describe("D: under more contrast a hovered secondary Button's edge is text-secondary, never fainter than at rest", () => {
  for (const theme of THEMES) {
    test(`${theme}: rest steps to the input boundary, hover to secondary ink, and the hover edge is the stronger`, async () => {
      const { page } = await open(render(`<><B.Button id="b">Save</B.Button><B.MultiSelect label="Pick" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} /></>`), { theme });
      await page.emulateMedia({ contrast: "more" });
      await settle(page);
      const edge = async (selector) => page.locator(selector).first().evaluate((el) => {
        const c = getComputedStyle(el).boxShadow.match(/^(.*?\))\s/)?.[1] ?? getComputedStyle(el).borderTopColor;
        const px = window.__px(c); const surface = window.__px(getComputedStyle(document.body).backgroundColor);
        return { colour: c, ratio: window.__ratio(window.__over(px, surface), surface) };
      });
      const probe = (css) => page.evaluate((css) => { const i = document.createElement("i"); i.style.cssText = css; document.body.append(i); const c = getComputedStyle(i).color; i.remove(); return c; }, css);
      await page.mouse.move(0, 0);
      await settle(page);
      const rest = await edge("#b");
      assert.equal(rest.colour, await probe("color: var(--basalt-border-input)"), "at rest the hairline is the input boundary");
      await page.locator("#b").hover();
      await settle(page);
      const hover = await edge("#b");
      assert.equal(hover.colour, await probe("color: var(--basalt-text-secondary)"), "hovered it is secondary ink");
      assert.ok(hover.ratio >= rest.ratio && hover.ratio >= 3, `hover ${hover.ratio.toFixed(2)}:1, rest ${rest.ratio.toFixed(2)}:1`);
      // the chip rests on the hairline and hovers on border-hover: the same rule
      await page.mouse.move(0, 0);
      await settle(page);
      const chipRest = await page.locator(".basalt-chip").first().evaluate((el) => getComputedStyle(el).borderTopColor);
      await page.locator(".basalt-chip").first().hover();
      await settle(page);
      const chipHover = await page.locator(".basalt-chip").first().evaluate((el) => getComputedStyle(el).borderTopColor);
      assert.equal(chipRest, await probe("color: var(--basalt-border-input)"));
      assert.equal(chipHover, await probe("color: var(--basalt-text-secondary)"));
      await page.close();
    });
  }
});

describe("E1: radius follows the drawn box, and the parts that ship radius-full still do", () => {
  const radii = (page, selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  const BODY = render(`<><B.Button size="sm" id="b-sm">Save</B.Button><B.Button id="b-md">Save</B.Button><B.Button size="lg" id="b-lg">Save</B.Button><B.Input id="i" aria-label="i" /><div id="n-md"><B.NumberField aria-label="n md" /></div><div id="n-lg"><B.NumberField controlSize="lg" aria-label="n lg" /></div><div id="n-xl"><B.NumberField controlSize="xl" aria-label="n xl" /></div><B.SegmentedControl aria-label="s" defaultValue="a"><B.Segment value="a">A</B.Segment><B.Segment value="b">B</B.Segment></B.SegmentedControl></>`);
  test("on a fine pointer a control keeps the radius of its size, and a NumberField group at 36 and 40 is 8", async () => {
    const { page } = await open(BODY, { theme: "dark" });
    assert.equal(await radii(page, "#b-sm"), "6px");
    assert.equal(await radii(page, "#b-md"), "6px");
    assert.equal(await radii(page, "#b-lg"), "8px");
    assert.equal(await radii(page, "#i"), "6px");
    assert.equal(await page.locator("#n-md").locator(".basalt-number-group").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "6px");
    assert.equal(await page.locator("#n-lg").locator(".basalt-number-group").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "8px");
    assert.equal(await page.locator("#n-xl").locator(".basalt-number-group").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "8px");
    await page.close();
  });
  test("a control drawn at 44 on touch is radius 8, a segment keeps its nested 6, and the group is 8", async () => {
    const { page } = await open(BODY, { theme: "dark", ...PHONE });
    for (const id of ["#b-sm", "#b-md", "#b-lg", "#i"]) {
      const box = await page.locator(id).first().evaluate((el) => el.getBoundingClientRect().height);
      assert.ok(box >= 43.99, `${id} is drawn at ${box}`);
      assert.equal(await radii(page, id), "8px", id);
    }
    assert.equal(await page.locator("#n-md .basalt-number-group").evaluate((el) => getComputedStyle(el).borderTopLeftRadius), "8px");
    assert.equal(await radii(page, ".basalt-segmented"), "8px");
    assert.equal(await radii(page, ".basalt-segment"), "6px", "nested: the track's 8 minus its 2px padding");
    await page.close();
  });
  test("the switch, the radio, the slider's track and thumb, progress and the meter are still radius-full", async () => {
    const jsx = `<><B.Switch aria-label="s" /><B.RadioGroup aria-label="r"><B.Radio value="a" aria-label="a" /></B.RadioGroup><B.Slider aria-label="v" defaultValue={30} /><B.Progress value={40} aria-label="p" /><B.Meter value={40} max={100} aria-label="m" /></>`;
    const { page } = await open(render(jsx), { theme: "dark" });
    for (const selector of [".basalt-switch", ".basalt-switch-thumb", ".basalt-radio", ".basalt-slider-track", ".basalt-slider-thumb", ".basalt-progress-track"]) {
      const r = await page.locator(selector).first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
      assert.equal(r, "9999px", `${selector}: ${r}`);
    }
    await page.close();
  });
});

describe("C10: a glyph swap crossfades over duration-fast, with or without reduced motion", () => {
  for (const reduced of [false, true]) {
    test(`the multi-select chip's plus and check fade by opacity over 100ms (${reduced ? "reduced motion" : "motion allowed"})`, async () => {
      const { page } = await open(render(`<B.MultiSelect label="Pick" options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }]} />`), { theme: "dark" });
      if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
      const t = await page.locator(".basalt-chip-seat > .basalt-icon").first().evaluate((el) => { const s = getComputedStyle(el); return { property: s.transitionProperty, duration: s.transitionDuration }; });
      assert.equal(t.property, "opacity");
      assert.equal(t.duration, "0.1s");
      await page.close();
    });
  }
});

describe("C11: a wash over an opaque pinned cell is one colour, never a gradient, an image or a layer", () => {
  const TABLE = (level) => `<div ${level ? `data-level="${level}"` : ""} style={{ width: 358, padding: 16, background: "var(--_surface, var(--basalt-surface-page))" }}><B.TableContainer id="frame"><B.Table columns={[{ width: 140 }, { width: 132 }, {}]} minWidth={560} pinned={1}><B.TableHeader><B.TableRow><B.TableHead>Region</B.TableHead><B.TableHead numeric>Latency</B.TableHead><B.TableHead>Note</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow id="r1"><B.TableRowHead>Frankfurt</B.TableRowHead><B.TableCell numeric>128</B.TableCell><B.TableCell>Steady</B.TableCell></B.TableRow><B.TableRow id="r2" selected><B.TableRowHead>Tokyo</B.TableRowHead><B.TableCell numeric>96</B.TableCell><B.TableCell>Steady</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>`;
  for (const theme of THEMES) {
    for (const level of [0, 1, 2]) {
      test(`${theme}, level ${level}: hover and selected paint the wash's colour over the cell's fill as one background-color`, async () => {
        const { page } = await open(render(TABLE(level)), { theme });
        const read = (row) => page.locator(`#${row} th`).evaluate((el) => { const s = getComputedStyle(el); return { bg: window.__px(s.backgroundColor), image: s.backgroundImage, before: getComputedStyle(el, "::before").content }; });
        // the cell's own fill: a row that is neither hovered nor selected is r1 with the pointer away
        await page.mouse.move(0, 0);
        await settle(page);
        const rest = await read("r1");
        assert.equal(rest.image, "none");
        const mix = (wash, over) => over.slice(0, 3).map((v, i) => Math.round(v * (1 - wash.a) + wash.c * 255 * wash.a)).concat(255);
        const dark = theme === "dark";
        const close = (a, b, what) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) <= 1, `${what}: ${a} vs ${b}`));
        // selected: r2 over the cell's fill (the same fill r1 rests on)
        const selected = await read("r2");
        assert.equal(selected.image, "none", "no gradient, no image");
        assert.ok(["none", "normal"].includes(selected.before), "no ::before layer");
        close(selected.bg, mix({ a: dark ? 0.09 : 0.07, c: dark ? 1 : 0 }, rest.bg), "selected");
        await page.locator("#r1").hover({ position: { x: 40, y: 10 } });
        await settle(page);
        const hovered = await read("r1");
        assert.equal(hovered.image, "none");
        close(hovered.bg, mix({ a: dark ? 0.06 : 0.04, c: dark ? 1 : 0 }, rest.bg), "hover");
        assert.equal(hovered.bg[3], 255, "opaque");
        await page.close();
      });
    }
  }

  test("in forced colours a pinned cell is Canvas in every state", async () => {
    const { page } = await open(render(TABLE(0)), { theme: "dark" });
    await page.emulateMedia({ forcedColors: "active" });
    await page.locator("#r1").hover({ position: { x: 40, y: 10 } });
    await settle(page);
    const canvas = await page.evaluate(() => { const i = document.createElement("i"); i.style.background = "Canvas"; document.body.append(i); const c = getComputedStyle(i).backgroundColor; i.remove(); return c; });
    for (const row of ["r1", "r2"]) assert.equal(await page.locator(`#${row} th`).evaluate((el) => getComputedStyle(el).backgroundColor), canvas, row);
    await page.close();
  });
});

// ---- Decision 149: faults in the fixes ----

const PHONE_AND_DESKTOP = [["1440 with a fine pointer", DESKTOP], ["390 with a coarse pointer", PHONE]];
/** The icon's centre, the first visible words' centre and the gap between them, in the item's visible content (the hidden copy is skipped). */
const CENTRE_LINE = `(el) => {
  const pair = [...el.querySelectorAll(".basalt-glyph-pair")].find((p) => !p.closest("[data-wide]"));
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue.trim() && !n.parentElement.closest("[data-wide], svg")) { node = n; break; }
  const range = document.createRange(); range.selectNodeContents(node);
  const text = [...range.getClientRects()].find((r) => r.width > 0);
  const icon = pair.getBoundingClientRect(); const box = el.getBoundingClientRect();
  return { iconMid: icon.top + icon.height / 2, textMid: text.top + text.height / 2, itemMid: box.top + box.height / 2, gap: text.left - icon.right, height: box.height };
}`;

describe("A: an icon and its words share one centre line, 6px apart, whatever holds the words (item 6)", () => {
  const SEG = (inner) => `<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a">${inner("Home")}</B.Segment><B.Segment value="b">${inner("Other")}</B.Segment></B.SegmentedControl>`;
  const TAB = (inner) => `<B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a">${inner("Home")}</B.Tab><B.Tab value="b">${inner("Other")}</B.Tab></B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel></B.Tabs>`;
  const SHAPES = {
    "an icon beside plain words": (l) => `<B.Icon icon={B.HomeGlyph} />${l}`,
    "an icon beside words in a span": (l) => `<B.Icon icon={B.HomeGlyph} /><span>${l}</span>`,
    "an icon inside the span that holds the words": (l) => `<span><B.Icon icon={B.HomeGlyph} />${l}</span>`,
  };
  for (const [where, options] of PHONE_AND_DESKTOP) {
    for (const [control, make, item] of [["segment", SEG, ".basalt-segment"], ["tab", TAB, ".basalt-tab"]]) {
      for (const [shape, inner] of Object.entries(SHAPES)) {
        test(`${control}, ${shape}, ${where}: one centre line and a 6px gap, chosen and at rest`, async () => {
          const { page } = await open(render(make(inner)), { theme: "dark", ...options });
          await settle(page);
          for (const which of [0, 1]) {
            const out = await page.locator(item).nth(which).evaluate(new Function("return " + CENTRE_LINE)());
            assert.ok(Math.abs(out.iconMid - out.textMid) <= 1, `${shape}: the icon's centre is ${out.iconMid} and the words' ${out.textMid} (the item's ${out.itemMid}, ${out.height} tall)`);
            assert.ok(Math.abs(out.gap - 6) <= 1.5, `${shape}: the gap is ${out.gap}`);
            assert.ok(Math.abs(out.textMid - out.itemMid) <= 1.5, `${shape}: the words are ${out.textMid - out.itemMid}px off the item's centre`);
          }
          await page.close();
        });
      }
    }
  }
});

describe("A: an icon with a label names its item once (item 3)", () => {
  const CASES = {
    "an icon-only segment": [`<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a"><B.Icon icon={B.HomeGlyph} label="Home" /></B.Segment><B.Segment value="b"><B.Icon icon={B.HomeGlyph} label="Other" /></B.Segment></B.SegmentedControl>`, ".basalt-segment", ["Home", "Other"]],
    "an icon beside words in a segment": [`<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a"><B.Icon icon={B.SearchGlyph} label="Search" />Find</B.Segment><B.Segment value="b"><B.Icon icon={B.SearchGlyph} label="Filter" />Sort</B.Segment></B.SegmentedControl>`, ".basalt-segment", ["Search Find", "Filter Sort"]],
    "a tab with a labelled icon": [`<B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a"><B.Icon icon={B.HomeGlyph} label="Home" /></B.Tab><B.Tab value="b"><B.Icon icon={B.HomeGlyph} label="Other" /></B.Tab></B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel></B.Tabs>`, ".basalt-tab", ["Home", "Other"]],
    "a tab with a labelled icon and words in a span": [`<B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a"><B.Icon icon={B.SearchGlyph} label="Search" /><span>Find</span></B.Tab><B.Tab value="b"><B.Icon icon={B.SearchGlyph} label="Filter" /><span>Sort</span></B.Tab></B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel></B.Tabs>`, ".basalt-tab", ["Search Find", "Filter Sort"]],
  };
  for (const [name, [jsx, items, names]] of Object.entries(CASES)) {
    test(`${name}: Chromium's accessibility tree names each item once, chosen and at rest`, async () => {
      const { page } = await open(render(jsx), { theme: "dark" });
      const client = await page.context().newCDPSession(page);
      const read = async () => {
        const { nodes } = await client.send("Accessibility.getFullAXTree");
        return [...(await page.locator(items).evaluateAll((els) => els.map((el) => el.getAttribute("id") ?? "")))].map((_, i) => i).map(() => 0) && nodes
          .filter((n) => ["button", "tab"].includes(n.role?.value) && !n.ignored)
          .map((n) => n.name?.value);
      };
      assert.deepEqual(await read(), names, "chosen first");
      await page.locator(items).nth(1).click();
      await settle(page);
      assert.deepEqual(await read(), names, "and after choosing the other");
      // exactly one form of each icon carries the name; the other is hidden from assistive technology
      const forms = await page.evaluate(() => [...document.querySelectorAll(".basalt-glyph-pair")].filter((pair) => !pair.closest("[data-wide]")).map((pair) => [...pair.children].map((svg) => [svg.getAttribute("aria-label"), svg.getAttribute("aria-hidden")])));
      for (const [rest, chosen] of forms) {
        assert.ok(rest[0] && rest[1] === null, `the rest form keeps the name: ${rest}`);
        assert.deepEqual(chosen, [null, "true"], "the selected form is hidden and unnamed");
      }
      await page.close();
    });
  }
});

describe("A: the second copy of a label holds nothing an id, a name or a reference can resolve to (item 4)", () => {
  const PROBE = `<span id="dup-span">Alpha</span><svg width="12" height="12" aria-hidden="true"><defs><mask id="dup-mask"><rect width="12" height="12" fill="white" /></mask></defs><rect width="12" height="12" mask="url(#dup-mask)" /></svg><input type="hidden" name="probe" value="kept" /><label htmlFor="dup-input">x</label>`;
  test("each id once in the document, FormData holds the value once, and the copy holds no id, name or reference", async () => {
    const jsx = `<form id="f"><input id="dup-input" name="own" defaultValue="mine" /><B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a">${PROBE}</B.Segment><B.Segment value="b"><span>Other</span></B.Segment></B.SegmentedControl></form>`;
    const { page } = await open(render(jsx), { theme: "dark" });
    const read = await page.evaluate(() => ({
      ids: ["dup-span", "dup-mask", "dup-input"].map((id) => document.querySelectorAll(`[id="${id}"]`).length),
      probe: new FormData(document.getElementById("f")).getAll("probe"),
      controls: document.getElementById("f").querySelectorAll("input").length,
      inCopy: [...document.querySelectorAll("[data-wide] *")].filter((n) => n.hasAttribute("id") || n.hasAttribute("name") || n.hasAttribute("for") || [...n.attributes].some((a) => a.value.includes("url(#"))).length,
      hiddenInCopy: document.querySelectorAll("[data-wide] input").length,
      copies: document.querySelectorAll("[data-wide]").length,
    }));
    assert.deepEqual(read.ids, [1, 1, 1]);
    assert.deepEqual(read.probe, ["kept"]);
    assert.equal(read.controls, 2, "the form's inputs: the app's own and the hidden one, and nothing from the copy");
    assert.equal(read.inCopy, 0);
    assert.equal(read.hiddenInCopy, 0);
    assert.ok(read.copies >= 2, "both segments still reserve");
    await page.close();
  });

  test("a label that holds a frame is not copied and does not change weight when chosen; one that holds a component is reserved", async () => {
    const jsx = `function Word({ children }) { return <b>{children}</b>; }\n${render(`<B.SegmentedControl aria-label="View" defaultValue="a"><B.Segment value="a"><span>Alpha</span><iframe title="x" /></B.Segment><B.Segment value="b"><Word>Beta words</Word></B.Segment><B.Segment value="c">Plain</B.Segment></B.SegmentedControl>`)}`;
    const { page } = await open(jsx, { theme: "dark" });
    // A component is reserved since return 3 (decision 138, A); the label that holds a frame is not copied.
    assert.equal(await page.locator(".basalt-segment").first().locator("[data-wide]").count(), 0, "nothing is copied for the label that holds a frame");
    assert.equal(await page.locator(".basalt-segment").nth(1).locator("[data-wide]").count(), 1, "the component's label is reserved");
    const read = () => page.evaluate(() => [...document.querySelectorAll(".basalt-segment")].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const base = await read();
    for (const i of [1, 2, 0]) {
      await page.locator(".basalt-segment").nth(i).click();
      await settle(page);
      // only the items Basalt reserves move: the plain one reserves its width, the other two keep their weight
      const after = await read();
      base.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `choosing ${i} moved item ${k} by ${(after[k][m] - v).toFixed(3)}px`)));
    }
    assert.equal(await page.locator(".basalt-segment").first().evaluate((el) => getComputedStyle(el).fontWeight), "400");
    await page.close();
  });
});

describe("A: words Basalt cannot see keep their weight, move nothing, and the item still reads as chosen (item 5)", () => {
  const TABS3 = (tabs, orientation = "") => `<B.Tabs ${orientation} defaultValue="b"><B.TabsList aria-label="Views">${tabs}</B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel><B.TabsPanel value="c">c</B.TabsPanel></B.Tabs>`;
  const OWN = {
    "a tab whose render callback supplies its own span": [TABS3(["Inbox", "Notifications", "Archived"].map((l, i) => `<B.Tab value="${"abc"[i]}" nativeButton={false} render={(props) => <a {...props} href="#${l}"><span>${l}</span></a>} />`).join("")), ".basalt-tab"],
    "a tab whose render element carries its own words": [TABS3(["Inbox", "Notifications", "Archived"].map((l, i) => `<B.Tab value="${"abc"[i]}" nativeButton={false} render={<a href="#${l}">${l}</a>} />`).join("")), ".basalt-tab"],
    "a vertical tab whose render callback supplies its own span": [TABS3(["Account", "Notifications", "Access keys"].map((l, i) => `<B.Tab value="${"abc"[i]}" nativeButton={false} render={(props) => <a {...props} href="#${l}"><span>${l}</span></a>} />`).join(""), 'orientation="vertical"'), ".basalt-tab"],
    "a segment whose render callback supplies its own span": [`<B.SegmentedControl aria-label="Range" defaultValue="b">${["Billing", "Notifications", "Access keys"].map((l, i) => `<B.Segment value="${"abc"[i]}" render={(props) => <button {...props}><span>${l}</span></button>} />`).join("")}</B.SegmentedControl>`, ".basalt-segment"],
  };
  for (const [where, options] of PHONE_AND_DESKTOP) {
    for (const [name, [jsx, items]] of Object.entries(OWN)) {
      test(`${name}, ${where}: choosing each item moves every box 0px, its words stay 400 and its ink is primary`, async () => {
        const { page } = await open(render(jsx), { theme: "dark", ...options });
        const read = () => page.evaluate((items) => [...document.querySelectorAll(items)].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }), items);
        const base = await read();
        for (let i = 0; i < base.length; i += 1) {
          await page.locator(items).nth(i).click();
          await settle(page);
          const after = await read();
          base.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `${name}: choosing ${i} moved item ${k} by ${(after[k][m] - v).toFixed(3)}px`)));
          const state = await page.locator(items).nth(i).evaluate((el) => ({ weight: getComputedStyle(el.querySelector("span") ?? el).fontWeight, ink: getComputedStyle(el).color, chosen: el.hasAttribute("data-active") || el.hasAttribute("data-pressed") }));
          assert.equal(state.weight, "400", "words Basalt cannot reserve keep their weight");
          assert.ok(state.chosen, "the item is the chosen one");
          const primary = await page.evaluate(() => { const i = document.createElement("i"); i.style.color = "var(--basalt-text-primary)"; document.body.append(i); const c = getComputedStyle(i).color; i.remove(); return c; });
          assert.equal(state.ink, primary, "and still reads as chosen by its ink, with its pill or underline");
        }
        await page.close();
      });
    }
  }
});

// ---- Return 3: a label that holds a component is reserved and bold (decision 138, A), and never duplicated ----

describe("A: a label that holds a component is 600 when chosen and moves nothing, with no duplicate id, name or control", () => {
  const PRELUDE = `import { PlusIcon } from "@phosphor-icons/react";
function Word({ id, children }) { return <span id={id}>{children}</span>; }
function Own({ children }) { const id = React.useId(); return <span><span id={id}>{children}</span><label htmlFor={id} hidden>x</label></span>; }
function Hidden({ children }) { return <span>{children}<input type="hidden" name="probe" value="kept" /></span>; }
function Masked({ children }) { const m = React.useId().replace(/:/g, ""); return <span>{children}<svg width="8" height="8" aria-hidden="true"><defs><mask id={m}><rect width="8" height="8" fill="white" /></mask></defs><rect width="8" height="8" mask={"url(#" + m + ")"} /></svg></span>; }
`;
  const SEG = (inner) => `<form id="f"><input name="own" defaultValue="mine" /><B.SegmentedControl aria-label="Range" defaultValue="b">${["Billing", "Notifications", "Keys"].map((l, i) => `<B.Segment value="${"abc"[i]}">${inner(l, i)}</B.Segment>`).join("")}</B.SegmentedControl></form>`;
  const TAB = (inner) => `<form id="f"><input name="own" defaultValue="mine" /><B.Tabs defaultValue="b"><B.TabsList aria-label="Views">${["Inbox", "Drafts", "Archived"].map((l, i) => `<B.Tab value="${"abc"[i]}">${inner(l, i)}</B.Tab>`).join("")}</B.TabsList><B.TabsPanel value="a">a</B.TabsPanel><B.TabsPanel value="b">b</B.TabsPanel><B.TabsPanel value="c">c</B.TabsPanel></B.Tabs></form>`;
  const SHAPES = {
    "a Phosphor icon beside words": (l) => `<PlusIcon size={16} aria-hidden="true" /> ${l}`,
    "an app's own component that renders a span with an id": (l, i) => `<Word id={"word-" + ${i}}>${l}</Word>`,
    "a component that makes its own id": (l) => `<Own>${l}</Own>`,
    "a component that draws an svg with a mask": (l) => `<Masked>${l}</Masked>`,
  };
  const READ = (items) => page_read(items);
  const page_read = (items) => (page) => page.evaluate((items) => [...document.querySelectorAll(items)].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }), items);

  for (const [where, options] of PHONE_AND_DESKTOP) {
    for (const [control, make, items] of [["segment", SEG, ".basalt-segment"], ["tab", TAB, ".basalt-tab"]]) {
      for (const [shape, inner] of Object.entries(SHAPES)) {
        test(`${control}, ${shape}, ${where}: 600 when chosen, 0px moved, every id once, FormData unchanged, after mount and after an update`, async () => {
          const { page } = await open(`${PRELUDE}${render(make(inner))}`, { theme: "dark", ...options });
          const read = READ(items);
          const base = await read(page);
          const check = async (what) => {
            const found = await page.evaluate(() => {
              const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
              const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
              const inCopy = [...document.querySelectorAll("[data-wide] *")].filter((n) => n.hasAttribute("id") || n.hasAttribute("name") || n.hasAttribute("for") || [...n.attributes].some((a) => a.value.includes("url(#"))).length;
              return { duplicates, inCopy, form: [...new FormData(document.getElementById("f")).entries()].map(([k, v]) => `${k}=${v}`), copies: document.querySelectorAll("[data-wide]").length };
            });
            assert.deepEqual(found.duplicates, [], `${what}: duplicate ids`);
            assert.equal(found.inCopy, 0, `${what}: the copy holds an id, name or reference`);
            assert.deepEqual(found.form, ["own=mine"], `${what}: FormData`);
            assert.equal(found.copies, 3, `${what}: every item reserves`);
          };
          await check("after mount");
          for (let i = 0; i < base.length; i += 1) {
            await page.locator(items).nth(i).click();
            await settle(page);
            const after = await read(page);
            base.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `choosing ${i} moved item ${k} by ${(after[k][m] - v).toFixed(3)}px`)));
            const weights = await page.evaluate((items) => [...document.querySelectorAll(items)].map((el) => window.__weight(el)), items);
            assert.deepEqual(weights, weights.map((_, k) => (k === i ? "600" : "400")), "the chosen label is 600");
          }
          await check("after an update");
          await page.close();
        });
      }
    }
  }

  test("an id a component sets on its own after mount is removed from the copy too", async () => {
    const jsx = `${PRELUDE}function Late({ children }) { const [id, setId] = React.useState(undefined); React.useEffect(() => { (window.lates ??= []).push(() => setId("late-id")); }, []); return <span id={id}>{children}</span>; }
${render(`<B.SegmentedControl aria-label="Range" defaultValue="a"><B.Segment value="a"><Late>Alpha</Late></B.Segment><B.Segment value="b">Beta</B.Segment></B.SegmentedControl>`)}`;
    const { page } = await open(jsx, { theme: "dark" });
    await page.evaluate(() => window.lates.forEach((set) => set()));
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelectorAll('[id="late-id"]').length), 1, "the id is on the visible label only, once the component re-rendered by itself");
    await page.close();
  });

  test("a component that renders a hidden input is not reserved, stays 400 when chosen and moves nothing; FormData holds the value once", async () => {
    const jsx = `${PRELUDE}${render(`<form id="f"><B.SegmentedControl aria-label="Range" defaultValue="a"><B.Segment value="a"><Hidden>Alpha</Hidden></B.Segment><B.Segment value="b">Beta</B.Segment></B.SegmentedControl></form>`)}`;
    for (const [where, options] of PHONE_AND_DESKTOP) {
      const { page } = await open(jsx, { theme: "dark", ...options });
      assert.equal(await page.locator(".basalt-segment").first().locator("[data-wide]").count(), 0, `${where}: no copy of the label that holds a control`);
      assert.deepEqual(await page.evaluate(() => new FormData(document.getElementById("f")).getAll("probe")), ["kept"], `${where}: submitted once`);
      const read = () => page.evaluate(() => [...document.querySelectorAll(".basalt-segment")].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
      const base = await read();
      for (const i of [1, 0]) {
        await page.locator(".basalt-segment").nth(i).click();
        await settle(page);
        const after = await read();
        // the second segment reserves its width; the first keeps its weight: nothing moves
        base.forEach((b, k) => b.forEach((v, m) => assert.ok(Math.abs(v - after[k][m]) < 0.01, `${where}: choosing ${i} moved item ${k}`)));
      }
      assert.equal(await page.locator(".basalt-segment").first().evaluate((el) => getComputedStyle(el.querySelector("span")).fontWeight), "400");
      await page.close();
    }
  });
});

describe("C: React's hovered or selected row's wash is on every cell of the row, pinned or not, in one colour (decision 149)", () => {
  const TABLE = (level) => `<div ${level ? `data-level="${level}"` : ""} style={{ width: 358, padding: 16, background: "var(--_surface, var(--basalt-surface-page))" }}><B.TableContainer id="frame"><B.Table columns={[{ width: 140 }, { width: 132 }, {}]} minWidth={560} pinned={1}><B.TableHeader><B.TableRow><B.TableHead>Region</B.TableHead><B.TableHead>Status</B.TableHead><B.TableHead>Note</B.TableHead></B.TableRow></B.TableHeader><B.TableBody><B.TableRow id="r1"><B.TableRowHead>Frankfurt</B.TableRowHead><B.TableCell>Ready</B.TableCell><B.TableCell>Steady</B.TableCell></B.TableRow><B.TableRow id="r2" selected><B.TableRowHead>Tokyo</B.TableRowHead><B.TableCell>Error</B.TableCell><B.TableCell>Steady</B.TableCell></B.TableRow><B.TableRow id="r3"><B.TableRowHead>Sydney</B.TableRowHead><B.TableCell>Ready</B.TableCell><B.TableCell>Steady</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer></div>`;
  for (const theme of THEMES) {
    for (const level of [0, 1]) {
      test(`${theme}, level ${level}: every cell of a hovered row and of a selected row is the one mixed colour; the pinned cell is opaque; nothing moves`, async () => {
        const { page } = await open(render(TABLE(level)), { theme });
        const read = (selector) => page.locator(selector).evaluate((el) => { const s = getComputedStyle(el); return { bg: window.__px(s.backgroundColor), image: s.backgroundImage, before: getComputedStyle(el, "::before").content }; });
        const geometry = () => page.evaluate(() => [...document.querySelectorAll("th, td, tr")].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); }));
        await page.mouse.move(0, 0);
        await settle(page);
        const still = await geometry();
        const cells = { name: "th", status: "td:nth-child(2)", note: "td:nth-child(3)" };
        const rest = {};
        for (const [cell, sel] of Object.entries(cells)) rest[cell] = await read(`#r3 ${sel}`);
        const dark = theme === "dark";
        const mix = (base, a) => base.slice(0, 3).map((v) => Math.round(v * (1 - a) + (dark ? 255 : 0) * a));
        for (const [row, alpha] of [["r2", dark ? 0.09 : 0.07]]) {
          for (const [cell, sel] of Object.entries(cells)) {
            const got = await read(`#${row} ${sel}`);
            assert.equal(got.image, "none", `${row} ${cell}: no gradient or image`);
            assert.ok(["none", "normal"].includes(got.before), `${row} ${cell}: no ::before layer`);
            assert.equal(got.bg[3], 255, `${row} ${cell}: opaque`);
            mix(rest[cell].bg, alpha).forEach((v, i) => assert.ok(Math.abs(got.bg[i] - v) <= 1, `selected ${cell}: ${got.bg} vs ${mix(rest[cell].bg, alpha)}`));
          }
        }
        await page.locator("#r1").hover({ position: { x: 40, y: 10 } });
        await settle(page);
        for (const [cell, sel] of Object.entries(cells)) {
          const got = await read(`#r1 ${sel}`);
          assert.equal(got.image, "none", `hovered ${cell}: no gradient or image`);
          assert.equal(got.bg[3], 255, `hovered ${cell}: opaque`);
          mix(rest[cell].bg, dark ? 0.06 : 0.04).forEach((v, i) => assert.ok(Math.abs(got.bg[i] - v) <= 1, `hovered ${cell}: ${got.bg} vs ${mix(rest[cell].bg, dark ? 0.06 : 0.04)}`));
        }
        assert.deepEqual(await geometry(), still, "no column, header or row moved");
        await page.close();
      });
    }
  }
});

describe("axe finds no WCAG 2.2 AA violation in the four controls on four surfaces, in both themes at 1440 and at 390, in forced colours and under reduced motion", () => {
  const BODY = render(`<main>${all(`<div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>${segmented}${vertical}${horizontal}<Pages /><PageLinks /></div>`)}</main>`);
  const prelude = `${pagesButtons}\n${pagesLinks}\n`;
  for (const theme of THEMES) {
    for (const [name, options, media] of [["1440", DESKTOP, {}], ["390", PHONE, {}], ["1440, forced colours", DESKTOP, { forcedColors: "active" }], ["1440, reduced motion", DESKTOP, { reducedMotion: "reduce" }], ["1440, more contrast", DESKTOP, { contrast: "more" }]]) {
      test(`${theme}, ${name}`, async () => {
        const { page } = await open(prelude + BODY, { theme, ...options });
        // Forced colours take the system palette of the theme under test (a dark page is shot with the dark forced palette), as the review build does.
        if (Object.keys(media).length) { await page.emulateMedia({ ...media, ...(media.forcedColors ? { colorScheme: theme } : {}) }); await settle(page); }
        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
        assert.deepEqual(violations, []);
        await page.close();
      });
    }
  }
});
