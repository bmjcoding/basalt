// The second audit fix batch, the HTML skill's half: A3-02 (a page with the phone tab bar scrolls focus clear of it) and A5-01 (the
// selected fills paint in a browser without light-dark()). The React half is packages/react/test/audit-fixes-b.test.mjs. Synthetic data.
// The page pads past the bar as foundations says (the bar, the inset and space-6, as the shell does): with the bar alone, a standalone link's 44px
// box at the page's end, drawn under 720 whatever the pointer since cimip-gaps-2 B5, reached 10px under the bar.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["light", "dark"];
const html = (body) => compose(`<title>Fixes</title>${body}`, { fonts: false }).html;

const LINKS = Array.from({ length: 40 }, (_, i) => `<a href="#l${i}" style="display:block;padding:10px 0">Filler link ${i + 1}</a>`).join("");
const TAB_BAR = `<main style="padding-bottom: calc(var(--basalt-bottom-offset) + var(--basalt-space-6))">${LINKS}</main><nav class="tab-bar" aria-label="Primary"><ul class="tab-bar-list"><li><a class="tab-bar-item" href="#home" aria-current="page"><span class="tab-bar-glyph"><span data-glyph="home" data-size="24"></span></span><span class="tab-bar-label">Home</span></a></li><li><a class="tab-bar-item" href="#inbox"><span class="tab-bar-glyph"><span data-glyph="notifications" data-size="24"></span></span><span class="tab-bar-label">Inbox</span></a></li><li><a class="tab-bar-item" href="#plan"><span class="tab-bar-glyph"><span data-glyph="home" data-size="24"></span></span><span class="tab-bar-label">Plan</span></a></li></ul></nav>`;

for (const scheme of THEMES) {
  test(`A3-02 the skill's page scrolls focus clear of its tab bar (${scheme})`, async () => {
    const { page } = await openHtml(browser, html(TAB_BAR), { scheme, width: 390 });
    await page.setViewportSize({ width: 390, height: 700 });
    const covered = [];
    const walk = async (key) => {
      for (let i = 0; i < 46; i += 1) {
        await page.keyboard.press(key);
        await page.evaluate(() => new Promise((resolve) => { let last = -1; let still = 0; const tick = () => { const y = scrollY; still = y === last ? still + 1 : 0; last = y; if (still >= 3) resolve(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })); // the page scrolls smoothly
        const hit = await page.evaluate(() => {
          const el = document.activeElement; const bar = document.querySelector(".tab-bar");
          if (!el || bar.contains(el) || el === document.body) return null;
          const a = el.getBoundingClientRect(); const b = bar.getBoundingClientRect();
          return a.bottom > b.top + 0.5 && a.top < b.bottom ? { text: el.textContent, bottom: a.bottom, barTop: b.top } : false;
        });
        if (hit) covered.push(hit);
      }
    };
    await page.keyboard.press("Tab");
    await walk("Tab");
    await walk("Shift+Tab");
    assert.deepEqual(covered, [], "no focused link ever sits under the bar");
    assert.ok((await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom))) >= 56, "scroll-padding-bottom is at least the bar's 56px");
    await page.close();
  });
}

const FILLS = `<div class="panel panel-pad" id="panel" style="width: 420px">
  <div class="segment" role="group" aria-label="Range"><button aria-pressed="true">Day</button><button aria-pressed="false">Week</button></div>
  <div class="choice-card-group" role="radiogroup" aria-label="Plan"><label class="panel choice-card"><input class="choice-card-input" type="radio" name="plan" value="pro" checked aria-labelledby="pro-t"><span class="choice-card-head"><span class="choice-card-title" id="pro-t">Pro</span><span class="choice-card-box" aria-hidden="true"></span></span></label></div>
  <button class="btn" id="toggle" aria-pressed="true"><span class="btn-check" aria-hidden="true"></span>Pause animations</button>
  <div class="field"><label for="region">Region</label><span class="select"><select class="input" id="region"><option value="eu">Frankfurt</option></select></span></div>
</div>`;

const fills = (page) => page.evaluate(() => {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1; const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
  const read = (el, variable) => { const before = el.style.backgroundColor; el.style.backgroundColor = `var(${variable})`; const out = getComputedStyle(el).backgroundColor; el.style.backgroundColor = before; return out; };
  const panel = document.getElementById("panel");
  return {
    "lit row plate (--panel-plate)": rgba(read(panel, "--panel-plate")),
    "segment pill (--pill-fill)": rgba(read(document.querySelector(".segment"), "--pill-fill")),
    "selected choice card": rgba(getComputedStyle(document.querySelector(".choice-card")).backgroundColor),
    "pressed toggle": rgba(getComputedStyle(document.getElementById("toggle")).backgroundColor),
    "select's lit option plate": rgba(read(document.getElementById("region"), "--_pop-plate")),
  };
});

describe("A5-01 the selected fills without light-dark()", () => {
  for (const scheme of THEMES) {
    test(`with the function name made unknown, the skill still paints the fills, and a browser that has it paints the same (${scheme})`, async () => {
      const page1 = await openHtml(browser, html(FILLS), { scheme });
      await settle(page1.page);
      const modern = await fills(page1.page);
      await page1.context.close();
      const legacy = html(FILLS);
      assert.ok(legacy.includes("light-dark("), "the composed page uses light-dark()");
      const page2 = await openHtml(browser, legacy.replaceAll("light-dark(", "light-dark-unknown("), { scheme });
      await settle(page2.page);
      const without = await fills(page2.page);
      await page2.context.close();
      for (const [name, value] of Object.entries(without)) {
        assert.ok(value[3] > 0, `${name}: painted (${value})`);
        const was = modern[name];
        const worst = Math.max(...value.slice(0, 3).map((c, i) => Math.abs(c - was[i])), Math.abs(value[3] - was[3]));
        assert.ok(worst <= 2, `${name}: ${value} against ${was} with light-dark()`);
      }
    });
  }
});
