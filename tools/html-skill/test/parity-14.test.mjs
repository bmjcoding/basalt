// The thirteenth parity PR (the controls port, DECISIONS 154): the skill's option chips (D9b) and link tabs (D12) rendered beside React's OptionChips and
// LinkTabs in Chromium in both themes, and compared by computed style; then their behaviour (the arrow keys landing on an unavailable chip without choosing it,
// a click that cannot choose it, the chosen chip's box unmoved) and forced colours. The switch row, the buttons and the tabs' panels are React's alone.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
// The skill's page carries its own base (ink, 14/20 sans, border-box); React's fixture has none, so it is given the same.
const BASE = "*, ::before, ::after { box-sizing: border-box; } body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font: 400 14px / 20px var(--basalt-font-family-sans); }";
const reactPage = async (body, options) => { const r = await fixturePage(reactBrowser, body, options); await r.page.addStyleTag({ content: BASE }); return r; };
const BOX = ["width", "height", "paddingTop", "paddingRight", "paddingLeft", "borderTopLeftRadius", "borderTopColor", "borderTopWidth", "borderTopStyle", "backgroundColor", "color", "boxShadow", "fontSize", "fontWeight", "lineHeight", "opacity", "gap", "cursor"];
const OUTLINE = ["outlineStyle", "outlineWidth", "outlineColor", "outlineOffset"];

const measure = (page, selector, props, pseudo) => page.evaluate(({ selector, props, pseudo }) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const s = getComputedStyle(el, pseudo || null);
  const out = {};
  for (const p of props) out[p] = ["width", "height"].includes(p) ? `${Math.round(el.getBoundingClientRect()[p] * 100) / 100}px` : s[p];
  return out;
}, { selector, props, pseudo });
/** Finish every finite transition and animation: a colour read mid-fade is not the state's colour. */
const settleAnimations = (page) => page.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))); });
async function compare(react, skill, [r, s], props, label) {
  await settleAnimations(react);
  await settleAnimations(skill);
  const a = await measure(react, r, props);
  const b = await measure(skill, s, props);
  assert.ok(a && b, `${label}: both exist (${r} / ${s})`);
  assert.deepEqual(b, a, label);
}

const REACT_CHIPS = `createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 420 }}><B.OptionChips legend="Flavour" defaultValue="v" options={[{ value: "v", label: "Vanilla" }, { value: "c", label: "Chocolate" }, { value: "b", label: "Berry", unavailable: "sold out at the brand" }]} /></div>);`;
const SEAT = `<span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span>`;
const SKILL_CHIPS = `<div style="padding: 16px; width: 420px"><fieldset class="option-chips"><legend class="option-chips-legend">Flavour<span class="option-chips-count" aria-hidden="true">3</span></legend><div class="option-chips-list">
<label class="option-chip"><input class="option-chip-input" type="radio" name="f" value="v" checked>${SEAT}<span>Vanilla</span></label>
<label class="option-chip"><input class="option-chip-input" type="radio" name="f" value="c">${SEAT}<span>Chocolate</span></label>
<label class="option-chip"><input class="option-chip-input" type="radio" name="f" value="b" aria-disabled="true">${SEAT}<span>Berry</span><span class="option-chip-note"><span aria-hidden="true"> · </span><span class="visually-hidden">, </span>sold out at the brand</span></label>
</div></fieldset></div>`;
const REACT_LINKS = (size) => `createRoot(document.getElementById("root")).render(<div style={{ padding: "0 16px", width: 600 }}><B.LinkTabs aria-label="What it is"${size ? ` size="${size}"` : ""}><B.LinkTab href="#a" current>Everything</B.LinkTab><B.LinkTab href="#b">Protein</B.LinkTab><B.LinkTab href="#c">Creatine</B.LinkTab></B.LinkTabs></div>);`;
const SKILL_LINKS = (size) => `<div style="padding: 0 16px; width: 600px"><nav class="link-tabs" aria-label="What it is"${size ? ` data-size="${size}"` : ""}><ul>
<li><a class="link-tab" href="#a" aria-current="page"><span>Everything</span><span class="link-tab-line" aria-hidden="true"></span></a></li>
<li><a class="link-tab" href="#b"><span>Protein</span><span class="link-tab-line" aria-hidden="true"></span></a></li>
<li><a class="link-tab" href="#c"><span>Creatine</span><span class="link-tab-line" aria-hidden="true"></span></a></li></ul>
<div class="link-tabs-select"><span class="select"><span class="link-tabs-select-label" aria-hidden="true">Go to</span><select class="input" data-size="lg" aria-label="Go to Everything"><option value="#a" selected>Everything</option><option value="#b">Protein</option><option value="#c">Creatine</option></select></span></div></nav></div>`;
const page = (body) => compose(`<title>Parity</title>${body}`, { fonts: false }).html;

describe("option chips, against React's", () => {
  for (const theme of THEMES) {
    test(`the legend, the count, a resting chip, the chosen chip, an unavailable chip and their seats match in ${theme}`, async () => {
      const react = await reactPage(REACT_CHIPS, { theme, viewport: { width: 600, height: 400 } });
      const skill = await openHtml(browser, page(SKILL_CHIPS), { scheme: theme, width: 600 });
      await react.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const pairs = [
        ["legend", ".basalt-option-chips-legend", ".option-chips-legend"], ["count", ".basalt-option-chips-count", ".option-chips-count"],
        ["list", ".basalt-option-chips-list", ".option-chips-list"],
        ["chosen chip", ".basalt-option-chip[data-checked]", ".option-chip:first-child"],
        ["resting chip", ".basalt-option-chip:not([data-checked]):not([data-unavailable])", ".option-chip:nth-child(2)"],
        ["unavailable chip", ".basalt-option-chip[data-unavailable]", ".option-chip:nth-child(3)"],
        ["note", ".basalt-option-chip-note", ".option-chip-note"],
      ];
      for (const [label, r, s] of pairs) await compare(react.page, skill.page, [r, s], BOX, label);
      const seats = [["chosen seat", ".basalt-option-chip[data-checked] .basalt-option-chip-seat", ".option-chip:first-child .option-chip-seat"], ["resting seat", ".basalt-option-chip:not([data-checked]):not([data-unavailable]) .basalt-option-chip-seat", ".option-chip:nth-child(2) .option-chip-seat"], ["unavailable seat", ".basalt-option-chip[data-unavailable] .basalt-option-chip-seat", ".option-chip:nth-child(3) .option-chip-seat"]];
      for (const [label, r, s] of seats) await compare(react.page, skill.page, [r, s], ["width", "height", "borderTopLeftRadius", "backgroundColor", "boxShadow", "color"], label);
      await compare(react.page, skill.page, [".basalt-option-chip[data-checked] .basalt-option-chip-seat > svg", ".option-chip:first-child .option-chip-seat > svg"], ["width", "height", "opacity"], "chosen check");
      await compare(react.page, skill.page, [".basalt-option-chip:not([data-checked]):not([data-unavailable]) .basalt-option-chip-seat > svg", ".option-chip:nth-child(2) .option-chip-seat > svg"], ["opacity"], "resting check");
      assert.deepEqual(skill.errors, []);
    });
  }

  test("the focus ring is +2 outside, as React's", async () => {
    const react = await reactPage(REACT_CHIPS, { viewport: { width: 600, height: 400 } });
    const skill = await openHtml(browser, page(SKILL_CHIPS), { width: 600 });
    await react.page.keyboard.press("Tab");
    await skill.page.keyboard.press("Tab");
    const a = await measure(react.page, ".basalt-option-chip:focus", OUTLINE);
    const b = await measure(skill.page, ".option-chip:has(> :focus-visible)", OUTLINE);
    assert.deepEqual(b, a);
    assert.equal(b.outlineOffset, "2px");
  });

  test("choosing moves no chip (0px), an unavailable chip is reachable by the arrows and never chosen, and a click cannot choose it", async () => {
    const skill = await openHtml(browser, page(SKILL_CHIPS), { width: 600 });
    const p = skill.page;
    const boxes = () => p.evaluate(() => [...document.querySelectorAll(".option-chip")].map((c) => { const r = c.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    const before = await boxes();
    await p.locator(".option-chip:nth-child(2)").click();
    assert.equal(await p.locator("input[value=c]").isChecked(), true);
    assert.deepEqual(await boxes(), before);
    await p.locator(".option-chip:nth-child(3)").click({ force: true });
    assert.equal(await p.locator("input[value=b]").isChecked(), false, "a click cannot choose it");
    await p.locator("input[value=v]").focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator("input[value=c]").isChecked(), true);
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.evaluate(() => document.activeElement.value), "b", "the arrow lands on it");
    assert.equal(await p.locator("input[value=b]").isChecked(), false, "and does not choose it");
    assert.equal(await p.locator("input[value=c]").isChecked(), true, "the choice stays");
    await p.keyboard.press("Space");
    assert.equal(await p.locator("input[value=b]").isChecked(), false, "Space does not choose it");
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator("input[value=v]").isChecked(), true, "the next arrow wraps on and chooses");
  });

  test("forced colours: the chosen chip is Highlight with HighlightText and an unavailable one is GrayText", async () => {
    const skill = await openHtml(browser, page(SKILL_CHIPS), { width: 600 });
    await skill.page.emulateMedia({ forcedColors: "active" });
    await settleAnimations(skill.page);
    const c = await skill.page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); const bg = (v) => { p.style.backgroundColor = v; return getComputedStyle(p).backgroundColor; }; const fg = (v) => { p.style.color = v; return getComputedStyle(p).color; }; return { Highlight: bg("Highlight"), HighlightText: fg("HighlightText"), GrayText: fg("GrayText") }; });
    const on = await measure(skill.page, ".option-chip:first-child", ["backgroundColor", "color", "outlineStyle"]);
    assert.deepEqual(on, { backgroundColor: c.Highlight, color: c.HighlightText, outlineStyle: "none" });
    assert.equal((await measure(skill.page, ".option-chip:nth-child(3)", ["color"])).color, c.GrayText);
  });
});

describe("link tabs, against React's", () => {
  for (const theme of THEMES) for (const size of ["", "3xl", "5xl"]) {
    test(`the row, the current link, a resting link and the underline match at ${size || "36"} in ${theme}`, async () => {
      const react = await reactPage(REACT_LINKS(size), { theme, viewport: { width: 760, height: 300 } });
      const skill = await openHtml(browser, page(SKILL_LINKS(size)), { scheme: theme, width: 760 });
      await react.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      for (const [label, r, s] of [
        ["row", ".basalt-link-tabs > ul", ".link-tabs > ul"], ["current", ".basalt-link-tab[aria-current]", ".link-tab[aria-current]"],
        ["resting", ".basalt-link-tab:not([aria-current])", ".link-tab:not([aria-current])"], ["underline", ".basalt-link-tab[aria-current] .basalt-link-tab-line", ".link-tab[aria-current] .link-tab-line"],
        ["resting underline", ".basalt-link-tab:not([aria-current]) .basalt-link-tab-line", ".link-tab:not([aria-current]) .link-tab-line"],
      ]) await compare(react.page, skill.page, [r, s], [...BOX, "display", "flexWrap", "position", "bottom", "textDecorationLine"], label);
      assert.deepEqual(skill.errors, []);
    });
  }

  test("focus is +2 outside, and the 56 row is 48 in a container under 640", async () => {
    const skill = await openHtml(browser, page(SKILL_LINKS("5xl")), { width: 760 });
    await skill.page.keyboard.press("Tab");
    assert.deepEqual(await measure(skill.page, ".link-tab:focus", ["outlineStyle", "outlineWidth", "outlineOffset"]), { outlineStyle: "solid", outlineWidth: "2px", outlineOffset: "2px" });
    const narrow = await openHtml(browser, page(`<div style="container-type: inline-size; width: 600px">${SKILL_LINKS("5xl")}</div>`), { width: 760 });
    assert.equal((await measure(narrow.page, ".link-tab", ["height"])).height, "48px");
    const wide = await openHtml(browser, page(`<div style="container-type: inline-size; width: 640px">${SKILL_LINKS("5xl")}</div>`), { width: 760 });
    assert.equal((await measure(wide.page, ".link-tab", ["height"])).height, "56px");
  });

  test("in forced colours the current underline is Highlight", async () => {
    const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 760 });
    await skill.page.emulateMedia({ forcedColors: "active" });
    await settleAnimations(skill.page);
    const hl = await skill.page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); p.style.backgroundColor = "Highlight"; return getComputedStyle(p).backgroundColor; });
    assert.equal((await measure(skill.page, ".link-tab[aria-current] .link-tab-line", ["backgroundColor", "height"])).backgroundColor, hl);
  });
});

describe("link tabs under 720: the select, against React's and in itself (DECISIONS 154, A15)", () => {
  for (const theme of THEMES) {
    test(`at 719 the select is shown and the row is not, at 720 the reverse, as React's (${theme})`, async () => {
      for (const [width, row, select] of [[719, "none", "block"], [720, "flex", "none"]]) {
        const react = await reactPage(REACT_LINKS("3xl"), { theme, viewport: { width, height: 400 } });
        const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { scheme: theme, width });
        const a = await measure(react.page, ".basalt-link-tabs > ul", ["display"]);
        const b = await measure(skill.page, ".link-tabs > ul", ["display"]);
        assert.deepEqual([a.display, b.display], [row, row], `row at ${width}`);
        assert.deepEqual([(await measure(react.page, ".basalt-link-tabs-select", ["display"])).display, (await measure(skill.page, ".link-tabs-select", ["display"])).display], [select, select], `select at ${width}`);
        await react.context?.close?.();
      }
    });
  }

  test("at 719 the trigger is 36 tall and as wide as the field, as React's; one navigation is exposed at each width, and Tab reaches one stop", async () => {
    const react = await reactPage(REACT_LINKS("3xl"), { viewport: { width: 719, height: 400 } });
    const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 719 });
    assert.equal((await measure(skill.page, ".link-tabs-select select", ["height"])).height, (await measure(react.page, ".basalt-select-trigger", ["height"])).height);
    for (const [width, links, boxes] of [[719, 0, 1], [720, 3, 0]]) {
      const s = await openHtml(browser, page(SKILL_LINKS("3xl")), { width });
      const snapshot = await s.page.getByRole("navigation", { name: "What it is" }).ariaSnapshot();
      assert.equal((snapshot.match(/- link /g) ?? []).length, links, snapshot);
      assert.equal((snapshot.match(/combobox/g) ?? []).length, boxes, snapshot);
      await s.page.evaluate(() => { document.body.insertAdjacentHTML("afterbegin", '<button id="before">Before</button>'); document.getElementById("before").focus(); });
      let stops = 0;
      for (let i = 0; i < 8; i += 1) { await s.page.keyboard.press("Tab"); if (!(await s.page.evaluate(() => !!document.activeElement.closest("nav")))) break; stops += 1; }
      assert.equal(stops, links || 1, `Tab stops at ${width}`);
    }
  });

  test("nothing moves between the markup and the script's wiring at 390 (0px), and the select starts on the current link", async () => {
    const html = page(SKILL_LINKS("3xl"));
    const bare = await openHtml(browser, html.replace(/<script[\s\S]*?<\/script>/g, ""), { width: 390 });
    const full = await openHtml(browser, html, { width: 390 });
    const boxes = (p) => p.page.evaluate(() => [...document.querySelectorAll(".link-tabs, .link-tabs-select, .link-tabs select")].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }));
    assert.deepEqual(await boxes(full), await boxes(bare));
    assert.equal(await full.page.locator(".link-tabs select").inputValue(), "#a");
  });

  test("choosing an option navigates to its href and leaves focus on the select; preventDefault on linktabsnavigate lets a router take over", async () => {
    const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 390 });
    await skill.page.evaluate(() => { window.__heard = []; document.querySelector(".link-tabs").addEventListener("linktabsnavigate", (e) => { window.__heard.push(e.detail.href); if (window.__hold) e.preventDefault(); }); });
    const select = skill.page.locator(".link-tabs select");
    await select.focus();
    await select.selectOption("#b");
    await skill.page.waitForFunction(() => location.hash === "#b");
    assert.equal(await skill.page.evaluate(() => document.activeElement.tagName), "SELECT", "focus did not move");
    await skill.page.evaluate(() => { window.__hold = true; location.hash = "#a"; });
    await select.selectOption("#c");
    assert.deepEqual(await skill.page.evaluate(() => window.__heard), ["#b", "#c"]);
    assert.notEqual(await skill.page.evaluate(() => location.hash), "#c", "a router that took over keeps the page");
    assert.equal(await select.inputValue(), "#a", "and the select goes back to the page you are on");
    assert.deepEqual(skill.errors, []);
  });

  test("a touch pointer makes the select at least 44 tall", async () => {
    const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 390, touch: true });
    assert.ok(parseFloat((await measure(skill.page, ".link-tabs select", ["height"])).height) >= 44);
  });
});

describe("the skill's link-tabs select follows aria-current when it is needed (return 3)", () => {
  const route = (when) => async (p) => {
    // A page that routes itself: it cancels the navigation and moves aria-current, in the handler or a moment after it.
    await p.evaluate((when) => {
      document.querySelector(".link-tabs").addEventListener("linktabsnavigate", (e) => {
        e.preventDefault();
        const move = () => { document.querySelector("a[aria-current]").removeAttribute("aria-current"); document.querySelector(`a[href="${e.detail.href}"]`).setAttribute("aria-current", "page"); };
        if (when === "in") move(); else setTimeout(move, 20);
      });
    }, when);
  };
  for (const when of ["in", "after"]) {
    test(`a router that cancels the navigation and moves aria-current ${when === "in" ? "in the handler" : "a moment later"} keeps the select on the new page`, async () => {
      const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 390 });
      await route(when)(skill.page);
      const select = skill.page.locator(".link-tabs select");
      await select.selectOption("#b");
      await skill.page.waitForFunction(() => document.querySelector("a[aria-current]").getAttribute("href") === "#b");
      await skill.page.waitForFunction(() => document.querySelector(".link-tabs select").value === "#b");
      assert.equal(await select.inputValue(), "#b", "the new page, not the one it was wired on");
      await select.selectOption("#c");
      await skill.page.waitForFunction(() => document.querySelector("a[aria-current]").getAttribute("href") === "#c");
      await skill.page.waitForFunction(() => document.querySelector(".link-tabs select").value === "#c");
      assert.notEqual(await skill.page.evaluate(() => location.hash), "#c", "it never navigated by itself");
    });
  }
  // At 390 the 36 row's select is 44, as React's: every 44px target rule applies under 720 whatever the pointer (B5).
  test("the select is 44 for the 48 row, 44 for the 36 row under 720 (B5) and 48 for the 56 row, as React's", async () => {
    for (const [size, h] of [["", "44px"], ["3xl", "44px"], ["5xl", "48px"]]) {
      const skill = await openHtml(browser, page(SKILL_LINKS(size)), { width: 390 });
      assert.equal((await measure(skill.page, ".link-tabs select", ["height"])).height, h, size || "36");
      const react = await reactPage(REACT_LINKS(size), { viewport: { width: 390, height: 300 } });
      assert.equal((await measure(react.page, ".basalt-select-trigger", ["height", "borderTopLeftRadius", "fontSize"])).height, h);
      await compare(react.page, skill.page, [".basalt-select-trigger", ".link-tabs select"], ["height", "borderTopLeftRadius", "fontSize"], `select at ${size || "36"}`);
    }
  });
});

describe("option chips need no :has() (return 3)", () => {
  // A browser without :has() drops every selector that holds one. Renaming the pseudo-class to one that does not exist makes this browser do exactly that.
  const without = (html) => html.replaceAll(":has(", ":no-such-has(");
  const read = (p) => p.evaluate(() => [...document.querySelectorAll(".option-chip")].map((c) => { const s = getComputedStyle(c), seat = getComputedStyle(c.querySelector(".option-chip-seat")), check = getComputedStyle(c.querySelector(".option-chip-seat > svg")); return [s.backgroundColor, s.color, s.borderTopColor, s.outlineStyle, s.cursor, seat.backgroundColor, check.opacity]; }));
  for (const theme of THEMES) {
    test(`the chosen, resting and unavailable chips draw the same without :has() as with it, and a choice, the focus ring and the arrow keys follow (${theme})`, async () => {
      const html = page(SKILL_CHIPS);
      const withHas = await openHtml(browser, html, { scheme: theme, width: 600 });
      const bare = await openHtml(browser, without(html), { scheme: theme, width: 600 });
      assert.deepEqual(await bare.page.evaluate(() => CSS.supports("selector(:has(*))")), true, "Chromium supports it: the test removes it from the stylesheet instead");
      assert.equal(await bare.page.evaluate(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).flatMap((r) => [r, ...(r.cssRules ?? [])]).some((r) => r.selectorText?.includes(":has("))), false, "no :has() rule is left in the page");
      await settle(withHas.page); await settle(bare.page);
      assert.deepEqual(await read(bare.page), await read(withHas.page), "at rest");
      const on = await read(bare.page);
      assert.notEqual(on[0][0], "rgba(0, 0, 0, 0)", "the chosen chip is filled");
      assert.equal(on[0][6], "1", "its check shows");
      assert.equal(on[1][6], "0");
      // a choice moves the look to the other chip, and a keyboard focus draws the ring
      await bare.page.locator(".option-chip:nth-child(2)").click();
      await withHas.page.locator(".option-chip:nth-child(2)").click();
      await settle(withHas.page); await settle(bare.page);
      assert.deepEqual(await read(bare.page), await read(withHas.page), "after choosing the second");
      assert.equal((await read(bare.page))[0][6], "0", "the first chip is unchosen");
      for (const p of [bare.page, withHas.page]) { await p.locator("input[value=c]").focus(); await p.keyboard.press("ArrowLeft"); }
      await settle(withHas.page); await settle(bare.page);
      const ring = (p) => p.evaluate(() => { const c = document.querySelector(".option-chip[data-focus], .option-chip:focus-within"); const s = getComputedStyle(c); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
      assert.deepEqual(await ring(bare.page), ["solid", "2px", "2px"]);
      assert.deepEqual(await ring(bare.page), await ring(withHas.page));
      await bare.page.keyboard.press("ArrowRight");
      await bare.page.keyboard.press("ArrowRight");
      assert.equal(await bare.page.evaluate(() => document.activeElement.value), "b", "the arrow lands on the unavailable chip");
      assert.equal(await bare.page.evaluate(() => document.querySelector(".option-chip[data-focus]")?.querySelector("input").value), "b", "and the ring follows it");
      assert.deepEqual(bare.errors, []);
    });
  }
});

describe("the skill's select says where choosing goes, and only a real choice navigates (DECISIONS 158, Q2)", () => {
  test("a visible \"Go to\" in secondary ink sits before the value on the select's one line and starts its accessible name; the height is the select's own", async () => {
    const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 390 });
    const p = skill.page;
    const ink = await p.evaluate(() => { const e = document.createElement("i"); document.body.append(e); e.style.color = "var(--basalt-text-secondary)"; return getComputedStyle(e).color; });
    const label = p.locator(".link-tabs-select-label");
    assert.equal((await label.textContent()).trim(), "Go to");
    assert.equal((await measure(p, ".link-tabs-select-label", ["color"])).color, ink);
    const [l, s] = [await label.boundingBox(), await p.locator(".link-tabs select").boundingBox()];
    assert.equal(s.height, 44, "the height is the select's own at this size");
    assert.ok(l.y >= s.y && l.y + l.height <= s.y + s.height, "on the select's line");
    // the value's text starts after the label: the select's start padding clears the label's measured width
    const pad = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".link-tabs select")).paddingInlineStart));
    assert.ok(pad >= l.width + (l.x - s.x), `the padding ${pad} clears the label (${l.x - s.x} + ${l.width})`);
    const snapshot = await p.getByRole("navigation", { name: "What it is" }).ariaSnapshot();
    assert.ok(/combobox "Go to Everything"/.test(snapshot), snapshot);
    await p.locator(".link-tabs select").selectOption("#b");
    assert.equal(await p.locator(".link-tabs select").getAttribute("aria-label"), "Go to Protein", "the name follows the chosen page");
  });

  test("nothing moves between the markup and the script's wiring at 390, with the label (0px)", async () => {
    const html = page(SKILL_LINKS("3xl"));
    const bare = await openHtml(browser, html.replace(/<script[\s\S]*?<\/script>/g, ""), { width: 390 });
    const full = await openHtml(browser, html, { width: 390 });
    const boxes = (p) => p.page.evaluate(() => [...document.querySelectorAll(".link-tabs, .link-tabs-select, .link-tabs select, .link-tabs-select-label")].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.height]; }));
    assert.deepEqual(await boxes(full), await boxes(bare));
  });

  test("the closed select: a typed letter, ArrowDown, ArrowUp, Home, End and PageDown navigate nowhere and the value stays the current page's", async () => {
    for (const key of ["p", "c", "ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"]) {
      const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 390 });
      const p = skill.page;
      await p.evaluate(() => { window.__heard = []; document.querySelector(".link-tabs").addEventListener("linktabsnavigate", (e) => { window.__heard.push(e.detail.href); e.preventDefault(); }); });
      await p.locator(".link-tabs select").focus();
      await p.keyboard.press(key);
      await p.waitForTimeout(50);
      assert.deepEqual(await p.evaluate(() => window.__heard), [], `${key}: navigations`);
      assert.equal(await p.locator(".link-tabs select").inputValue(), "#a", `${key}: the value is still the current page`);
      assert.equal(await p.evaluate(() => location.hash), "", `${key}: the page did not move`);
      await skill.context.close();
    }
  });

  test("a choice made from the open list navigates once, by a click and after Enter: a choice reaches the page as a change with no letter or arrow on the closed select", async () => {
    // Playwright cannot drive the browser's own popup: selectOption is its choice from the list (a change with no key), and Enter is not a held key.
    for (const prelude of [null, "Enter"]) {
      const skill = await openHtml(browser, page(SKILL_LINKS("3xl")), { width: 390 });
      const p = skill.page;
      await p.evaluate(() => { window.__heard = []; document.querySelector(".link-tabs").addEventListener("linktabsnavigate", (e) => { window.__heard.push(e.detail.href); e.preventDefault(); }); });
      const select = p.locator(".link-tabs select");
      await select.focus();
      if (prelude) await p.keyboard.press(prelude);
      await select.selectOption("#c");
      assert.deepEqual(await p.evaluate(() => window.__heard), ["#c"], `${prelude ?? "click"}: one navigation`);
    }
  });

  test("a replaced label is in the name too, and a page that routes itself keeps focus on the select", async () => {
    const html = page(SKILL_LINKS("3xl").replace(">Go to<", ">Aller à<").replace('aria-label="Go to Everything"', 'aria-label="Aller à Everything"'));
    const skill = await openHtml(browser, html, { width: 390 });
    assert.ok(/combobox "Aller à Everything"/.test(await skill.page.getByRole("navigation", { name: "What it is" }).ariaSnapshot()));
    await skill.page.evaluate(() => document.querySelector(".link-tabs").addEventListener("linktabsnavigate", (e) => e.preventDefault()));
    await skill.page.locator(".link-tabs select").focus();
    await skill.page.locator(".link-tabs select").selectOption("#b");
    assert.equal(await skill.page.evaluate(() => document.activeElement.tagName), "SELECT");
  });
});

// A link tab's selected state (join 2 of integration-nov15b; DECISIONS 138 A, 145, 149 and the ballot's D12 row): the current link's label is 600 in primary, a resting one 400 in
// secondary, every label reserves its 600 width, so choosing a page moves no link and no word. React's LinkTab takes ChosenLabel; the skill's link tabs take reserve(), with the
// label (the span before the underline) drawn by the script.
describe("a link tab's selected state, the skill's against React's", () => {
  // Castle's own nine labels are not in the repository, so these nine stand in.
  const NINE = ["Everything", "Protein", "Creatine", "Pre-workout", "Vitamins & minerals", "Sleep", "Bars", "Mass gainers", "Accessories"];
  const reactRow = (labels, extra = "") => `(() => { const names = ${JSON.stringify(labels)}; createRoot(document.getElementById("root")).render(<div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="k" size="3xl">{names.map((n, i) => <B.LinkTab key={n} href={"#" + i} current={i === 0}>${extra}{n}</B.LinkTab>)}</B.LinkTabs></div>); })()`;
  const skillRow = (labels, label = (n) => `<span>${n}</span>`) => `<div style="padding: 0 16px"><nav class="link-tabs" aria-label="k" data-size="3xl"><ul>${labels.map((n, i) => `<li><a class="link-tab" href="#${i}"${i === 0 ? ' aria-current="page"' : ""}>${label(n)}<span class="link-tab-line" aria-hidden="true"></span></a></li>`).join("")}</ul><div class="link-tabs-select"><span class="select"><span class="link-tabs-select-label" aria-hidden="true">Go to</span><select class="input" data-size="lg" aria-label="Go to ${labels[0]}">${labels.map((n, i) => `<option value="#${i}"${i === 0 ? " selected" : ""}>${n}</option>`).join("")}</select></span></div></nav></div>`;
  // Every link's box, its label's box and the x where its words start, in either implementation.
  const geometry = (page, link, labelOf) => page.evaluate(({ link, labelOf }) => [...document.querySelectorAll(link)].map((a) => {
    const r = a.getBoundingClientRect(); const label = labelOf === "react" ? a.querySelector(".basalt-link-tab-label") : a.querySelector(":scope > :not(.link-tab-line)"); const l = label.getBoundingClientRect();
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest("[data-wide]") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const range = document.createRange(); range.selectNodeContents(walker.nextNode()); const t = range.getBoundingClientRect();
    return [r.x, r.width, r.height, l.x, l.width, t.x].map((n) => Math.round(n * 100) / 100);
  }), { link, labelOf });
  const weights = (page, link) => page.evaluate((link) => [...document.querySelectorAll(link)].map((a) => { const w = a.querySelector("[data-label], [data-reserve] > :first-child"); return [getComputedStyle(w).fontWeight, getComputedStyle(a).color]; }), link);

  for (const theme of THEMES) {
    test(`the weights and ink, every link's width and every word's start edge match React's for nine labels at 1440 in ${theme}`, async () => {
      const react = await reactPage(reactRow(NINE), { theme, viewport: { width: 1440, height: 400 } });
      const skill = await openHtml(browser, page(skillRow(NINE)), { scheme: theme, width: 1440 });
      await react.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const [rw, sw] = [await weights(react.page, ".basalt-link-tab"), await weights(skill.page, ".link-tab")];
      assert.deepEqual(sw, rw);
      assert.deepEqual(sw.map(([w]) => w), ["600", ...Array(8).fill("400")]);
      assert.notEqual(sw[0][1], sw[1][1], "the current link is primary and the rest secondary");
      const [rg, sg] = [await geometry(react.page, ".basalt-link-tab", "react"), await geometry(skill.page, ".link-tab", "skill")];
      // The skill's links carry the label in an unclassed span, so the label box is the same as React's; the row is one line in both.
      for (let i = 0; i < NINE.length; i++) for (const [k, name] of [[1, "width"], [2, "height"], [4, "label width"], [5, "word start"]]) assert.ok(Math.abs(sg[i][k] - rg[i][k]) <= 0.6, `${NINE[i]} ${name}: ${sg[i][k]} vs ${rg[i][k]}`);
      assert.deepEqual(skill.errors, []);
    });

    test(`moving aria-current moves no link and no word (0px), for nine labels and for a short and a long label, in ${theme}`, async () => {
      for (const labels of [NINE, ["Hi", "Everything for the serious lifter", "Go", "A fairly long second kind of label"]]) {
        const skill = await openHtml(browser, page(skillRow(labels)), { scheme: theme, width: 1440 });
        const before = await geometry(skill.page, ".link-tab", "skill");
        for (const i of [labels.length - 1, 1, 0, 2]) {
          await skill.page.evaluate((i) => { const links = [...document.querySelectorAll(".link-tab")]; links.forEach((a) => a.removeAttribute("aria-current")); links[i].setAttribute("aria-current", "page"); }, i);
          assert.deepEqual(await geometry(skill.page, ".link-tab", "skill"), before, `current ${labels[i]}`);
          const w = (await weights(skill.page, ".link-tab")).map(([x]) => x);
          assert.deepEqual(w, labels.map((_, n) => (n === i ? "600" : "400")));
        }
      }
    });
  }

  test("a label in an element, and a label with an icon, are reserved and move nothing when they become current", async () => {
    const element = await openHtml(browser, page(skillRow(["One", "Two", "Three"], (n) => `<span><b>${n}</b> things</span>`)), { width: 1440 });
    assert.equal(await element.page.locator(".link-tab [data-reserve]").count(), 3, "each is drawn twice in one box");
    const before = await geometry(element.page, ".link-tab", "skill");
    await element.page.evaluate(() => { const links = [...document.querySelectorAll(".link-tab")]; links.forEach((a) => a.removeAttribute("aria-current")); links[2].setAttribute("aria-current", "page"); });
    assert.deepEqual(await geometry(element.page, ".link-tab", "skill"), before);
    assert.deepEqual((await weights(element.page, ".link-tab")).map(([w]) => w), ["400", "400", "600"]);
    const icon = await openHtml(browser, page(skillRow(["Home", "Docs", "Shop"], (n) => `<span><span data-glyph="home"></span>${n}</span>`)), { width: 1440 });
    assert.equal(await icon.page.locator(".link-tab [data-pair]").count(), 2, "a resting link's icon is drawn in both forms (the current one in its selected form)");
    const beforeIcon = await geometry(icon.page, ".link-tab", "skill");
    await icon.page.evaluate(() => { const links = [...document.querySelectorAll(".link-tab")]; links.forEach((a) => a.removeAttribute("aria-current")); links[1].setAttribute("aria-current", "page"); });
    await settleAnimations(icon.page);
    assert.deepEqual(await geometry(icon.page, ".link-tab", "skill"), beforeIcon);
    assert.equal(await icon.page.locator(".link-tab[aria-current] [data-pair] > :last-child").evaluate((el) => getComputedStyle(el).opacity), "1");
  });

  test("with the script off the current link is 600 itself, and a label that holds a control is left alone", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const offPage = await context.newPage();
    await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: page(skillRow(NINE)) }));
    await offPage.goto("https://basalt.test/");
    assert.deepEqual((await offPage.evaluate(() => [...document.querySelectorAll(".link-tab")].map((a) => getComputedStyle(a.firstElementChild).fontWeight))).slice(0, 2), ["600", "400"]);
    await context.close();
    const held = await openHtml(browser, page(skillRow(["Kept", "Other"], (n) => `<span><input type="hidden" value="x">${n}</span>`)), { width: 1440 });
    assert.equal(await held.page.locator(".link-tab [data-wide]").count(), 0, "no second copy of a label that holds a control");
    assert.deepEqual(await held.page.locator(".link-tab > span:not(.link-tab-line)").first().evaluate((el) => [el.hasAttribute("data-bare"), getComputedStyle(el).fontWeight]), [true, "400"]);
  });

  test("in forced colours the weights and the boxes hold and the current underline is Highlight", async () => {
    const skill = await openHtml(browser, page(skillRow(NINE)), { width: 1440 });
    await skill.page.emulateMedia({ forcedColors: "active" });
    await settleAnimations(skill.page);
    const before = await geometry(skill.page, ".link-tab", "skill");
    await skill.page.evaluate(() => { const links = [...document.querySelectorAll(".link-tab")]; links.forEach((a) => a.removeAttribute("aria-current")); links[5].setAttribute("aria-current", "page"); });
    assert.deepEqual(await geometry(skill.page, ".link-tab", "skill"), before);
    assert.deepEqual((await weights(skill.page, ".link-tab")).map(([w]) => w).slice(4, 7), ["400", "600", "400"]);
    const hl = await skill.page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); p.style.backgroundColor = "Highlight"; return getComputedStyle(p).backgroundColor; });
    assert.equal((await measure(skill.page, ".link-tab[aria-current] .link-tab-line", ["backgroundColor"])).backgroundColor, hl);
  });
});
