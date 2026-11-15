// The fourth audit fix batch's React half (stream components-nov14, A1-09): the Stage puts its art after its content in the markup, so on a slow link the
// words arrive before the art and the stage is not painted short and grown; the art stays behind the content, and nothing settled moves. The HTML skill's half is
// tools/html-skill/test/audit-fixes-c2.test.mjs. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pixels, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const ART = `<svg viewBox="0 0 10 10" preserveAspectRatio="none" aria-hidden="true"><rect width="10" height="10" fill="#ff0000"/></svg>`;
const STAGE = `document.body.style.margin = "0";
  createRoot(document.getElementById("root")).render(<div>
    <B.SiteHeader brand={<span>Acme</span>} brandLabel="Acme home" links={[{ href: "#a", label: "A", current: true }]} themeToggle={<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />} />
    <B.Stage art={${ART}}><div id="block" style={{ height: 120, margin: "0 24px", background: "#00ff00" }} /><div style={{ height: 240 }} /></B.Stage>
    <main style={{ height: 800 }} />
  </div>);`;

for (const theme of THEMES) {
  describe(`A1-09 the stage's art comes after its content (${theme})`, () => {
    test("the art is the stage's last child, after the headroom probe and the content", async () => {
      const { page } = await fixturePage(browser, STAGE, { theme });
      await settle(page);
      assert.deepEqual(await page.evaluate(() => [...document.querySelector(".basalt-stage").children].map((el) => el.className)), ["basalt-stage-headroom", "basalt-stage-content", "basalt-stage-art"]);
      await page.close();
    });

    test("it is painted where it was: the content above the art, and the art above the page's field", async () => {
      const { page } = await fixturePage(browser, STAGE, { theme });
      await settle(page);
      const at = await page.evaluate(() => { const b = document.getElementById("block").getBoundingClientRect(), s = document.querySelector(".basalt-stage").getBoundingClientRect(); return { block: [Math.floor(b.left + 10), Math.floor(b.top + 10)], field: [Math.floor(s.left + 4), Math.floor(s.top + 70)] }; });
      const read = async ([x, y]) => (await pixels(page, { x, y, width: 1, height: 1 }))[0];
      assert.deepEqual(await read(at.block), [0, 255, 0], "the content's own box is on top of the art");
      assert.deepEqual(await read(at.field), [255, 0, 0], "the art is on top of the stage's field");
      const s = await page.evaluate(() => { const st = document.querySelector(".basalt-stage"); return { isolation: getComputedStyle(st).isolation, art: getComputedStyle(st.querySelector(".basalt-stage-art")).zIndex }; });
      assert.deepEqual(s, { isolation: "isolate", art: "-1" });
      await page.close();
    });

    test("focus order is the content's: the art has no stop, name or text", async () => {
      const { page } = await fixturePage(browser, STAGE.replace('<div id="block"', '<a id="link" href="#x" style={{ display: "block" }}>A link</a><div id="block"'), { theme });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.id), "link", "the brand, one link, the toggle, then the content's link");
      assert.deepEqual(await page.evaluate(() => { const a = document.querySelector(".basalt-stage-art"); return [getComputedStyle(a).pointerEvents, a.getAttribute("aria-hidden"), a.textContent.trim()]; }), ["none", "true", ""]);
      await page.close();
    });
  });
}
