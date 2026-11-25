// audit-2-design (DECISIONS 167), the HTML skill's half: Q6 the core set's check, minus and close where the skill drew Phosphor's, and an icon list that no longer
// offers Phosphor versions of core glyphs; Q7a the disclosure chevron is the core chevron at 16, turned 180 degrees when open; Q7b the reduced-motion ring fades to
// 0.55 on the token curve; and the skill's half of Q9a, Q9d and Q9f (the period stepper's line, a tab's radius and the option chip's edge), so the skill still draws what
// React draws. Each test fails on the commit before the change. Both themes; 1440 and 390 where the part draws.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, read, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const page = (body) => compose(`<title>T</title>${body}`, { fonts: false }).html;
const PHOSPHOR_ICON = /viewBox='0 0 256 256'/;
const CORE_DRAWING = /viewBox='0 0 24 24'[^"]*stroke-width='2\.25'/;
// The minified sheet drops the quotes in an attribute selector and writes :before: both sides are compared that way.
const plain = (text) => text.replaceAll('"', "").replaceAll("::before", ":before");
const rules = (css, selector) => css.split("}").filter((r) => plain(r).includes(plain(selector))).join("}");

describe("Q6: the skill draws the core set's check, minus and close", () => {
  test("the icon list stops offering Phosphor versions of the glyphs the core set has", () => {
    const icons = Object.keys(JSON.parse(read(skillDir, "parts", "icons.json")).icons);
    for (const name of ["Check", "X", "CaretDown", "CaretRight", "Copy", "Plus", "Minus", "MagnifyingGlass"]) assert.ok(!icons.includes(name), `${name} is not offered`);
    assert.ok(icons.includes("CaretUpDown") && icons.includes("Trash"), "the Phosphor icons the core set does not have stay");
    const carried = compose("<title>T</title><i data-icon=\"Copy\"></i><i data-icon=\"Trash\"></i>", { fonts: false }).icons;
    assert.ok(!carried.includes("Copy") && carried.includes("Trash"));
  });
  test("the checkbox, the indeterminate box, the choice card's box, the select option's check and the search clear mark are core drawings in the stylesheet", () => {
    for (const [part, selector] of [["choice", 'input[type="checkbox"]:not([role="switch"])::before'], ["choice", ":indeterminate::before"], ["choice-card", ".choice-card-box::before"], ["select", "::checkmark"], ["forms", "::-webkit-search-cancel-button"]]) {
      const text = rules(read(skillDir, "parts", `${part}.css`), selector);
      assert.ok(text.includes("mask"), `${part}: ${selector} is a mask`);
      assert.ok(!PHOSPHOR_ICON.test(text), `${part}: ${selector} is not a Phosphor drawing`);
      assert.ok(CORE_DRAWING.test(text), `${part}: ${selector} is the core set's drawing (24 grid, 2.25 stroke)`);
    }
  });
  for (const theme of THEMES) {
    test(`${theme}: a ticked box and a mixed box draw the core check and minus as their mask`, async () => {
      const { page: p, context } = await openHtml(browser, page('<input type="checkbox" id="a" checked aria-label="a"><input type="checkbox" id="b" aria-label="b">'), { scheme: theme });
      await p.evaluate(() => { document.getElementById("b").indeterminate = true; });
      const mask = (id) => p.evaluate((i) => getComputedStyle(document.getElementById(i), "::before").maskImage, id);
      for (const id of ["a", "b"]) {
        const value = await mask(id);
        assert.ok(value.includes("viewBox='0 0 24 24'") && value.includes("stroke-width='2.25'"), `${id}: ${value.slice(0, 120)}`);
      }
      assert.notEqual(await mask("a"), await mask("b"), "check and minus are different drawings");
      await context.close();
    });
  }
});

describe("Q7a: the disclosure chevron is the core chevron at 16, turned 180 degrees when open", () => {
  const BODY = '<button class="disclosure" data-disclosure aria-expanded="false" aria-controls="p1" id="d">Closed</button><div id="p1" hidden>Its content.</div><details id="n"><summary>Native</summary>More</details>';
  for (const theme of THEMES) {
    test(`${theme}: 16 by 16, a mask of the chevron, no turn when closed and a half turn when open, for the button and for details`, async () => {
      const { page: p, context } = await openHtml(browser, page(BODY), { scheme: theme });
      const read = (selector) => p.evaluate((s) => { const c = getComputedStyle(document.querySelector(s), "::after"); return { w: c.width, h: c.height, mask: c.maskImage, transform: c.transform }; }, selector);
      for (const selector of ["#d", "#n > summary"]) {
        const closed = await read(selector);
        assert.deepEqual([closed.w, closed.h], ["16px", "16px"], selector);
        assert.ok(closed.mask.includes("viewBox='0 0 24 24'") && closed.mask.includes("stroke-width='2.25'"), `${selector} draws a core glyph`);
        assert.equal(closed.transform, "none", `${selector} closed`);
      }
      await p.click("#d");
      await p.evaluate(() => { document.getElementById("n").open = true; });
      await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      for (const selector of ["#d", "#n > summary"]) assert.equal((await read(selector)).transform, "matrix(-1, 0, 0, -1, 0, 0)", `${selector} open`);
      await context.close();
    });
  }
});

// Q7b is superseded by cimip-gaps-3 T1: under reduced motion no loop runs, so the ring stands still at full opacity, its arc in currentColor, and
// bh-fade is gone with its readers.
describe("Q7b, as T1 rules it: under reduced motion the ring stands still", () => {
  for (const theme of THEMES) {
    test(`${theme}: a busy button's ring and the spinner run no animation, stand at full opacity with their quarter arc in currentColor, and bh-fade is gone`, async () => {
      const { page: p, context } = await openHtml(browser, page('<button class="btn" aria-busy="true" id="b">Saving</button><span class="spinner" id="s" role="status" aria-label="Loading"></span>'), { scheme: theme, reducedMotion: "reduce" });
      const ring = await p.evaluate(() => {
        const read = (selector, pseudo) => { const c = getComputedStyle(document.querySelector(selector), pseudo); return { name: c.animationName, opacity: c.opacity, arc: c.borderTopColor === c.color }; };
        const frames = [...document.styleSheets].flatMap((s) => [...s.cssRules].flatMap((r) => r.cssRules ? [...r.cssRules] : [r])).find((r) => r.type === CSSRule.KEYFRAMES_RULE && r.name === "bh-fade");
        return { button: read("#b", "::after"), spinner: read("#s", null), fade: !!frames };
      });
      assert.equal(ring.fade, false, "bh-fade has no reader left, so it is gone");
      for (const one of [ring.button, ring.spinner]) assert.deepEqual(one, { name: "none", opacity: "1", arc: true });
      await context.close();
    });
  }
});

describe("Q9a, Q9d, Q9f in the skill: the period stepper's line, a tab's radius and an option chip's edge match React's", () => {
  for (const theme of THEMES) {
    test(`${theme}, 390: the period stepper's narrow row has a border-divider line`, async () => {
      const body = '<div style="container-type:inline-size;width:100%"><div style="display:flex;flex-wrap:wrap"><div class="period" role="group" aria-label="Week"><button class="btn" type="button" data-variant="ghost" data-icon-only aria-label="Before"><span data-glyph="chevron-left"></span></button><p class="period-label">28 Sept to 4 Oct</p><button class="btn" type="button" data-variant="ghost" data-icon-only aria-label="After"><span data-glyph="chevron-right"></span></button></div></div></div>';
      const { page: p, context } = await openHtml(browser, page(body), { scheme: theme, width: 390 });
      const got = await p.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-border-divider)"; document.body.append(probe); const divider = getComputedStyle(probe).color; probe.remove(); return [getComputedStyle(document.querySelector(".period")).borderTopColor, divider]; });
      assert.equal(got[0], got[1]);
      await context.close();
    });
    test(`${theme}, 1440: a 36px tab and a link tab are radius 8 on top`, async () => {
      const body = '<div data-tabs><div class="tabs" role="tablist" aria-label="V"><button class="tab" role="tab" id="t1" aria-controls="p1" aria-selected="true">One</button></div><div class="tabpanel" id="p1" role="tabpanel" aria-labelledby="t1">x</div></div><nav class="link-tabs" aria-label="Pages"><ul><li><a class="link-tab" href="#a" aria-current="page"><span>One</span><span class="link-tab-line" aria-hidden="true"></span></a></li></ul></nav>';
      const { page: p, context } = await openHtml(browser, page(body), { scheme: theme });
      for (const selector of [".tab", ".link-tab"]) assert.deepEqual(await p.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomLeftRadius, s.height]; }), ["8px", "8px", "0px", "36px"], selector);
      await context.close();
    });
    test(`${theme}, 1440: under more contrast an option chip's edge is border-field`, async () => {
      const body = '<fieldset class="option-chips"><legend class="option-chips-legend">Flavour</legend><div class="option-chips-list"><label class="option-chip"><input class="option-chip-input" type="radio" name="f" value="v"><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Vanilla</span></label></div></fieldset>';
      const { page: p, context } = await openHtml(browser, page(body), { scheme: theme });
      await p.emulateMedia({ contrast: "more" });
      await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      const got = await p.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-border-field)"; document.body.append(probe); const field = getComputedStyle(probe).color; probe.style.color = "var(--basalt-border-input)"; const input = getComputedStyle(probe).color; probe.remove(); return [getComputedStyle(document.querySelector(".option-chip")).borderTopColor, field, input]; });
      assert.notEqual(got[1], got[2], "the mode steps border-field and not border-input");
      assert.equal(got[0], got[1]);
      await context.close();
    });
  }
});
