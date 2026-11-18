// audit-fix-c7, A2-16: the option chips follow a form's reset. The browser's reset checks the native radio again without a change event, so the script reads
// each chip again once it has run; the drawn chip is the native one, and one chip is chosen.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>Chips</title>${body}`, { fonts: false }).html;
const SEAT = `<span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span>`;
const BODY = `<main class="page"><form id="form"><fieldset class="option-chips"><legend class="option-chips-legend">Flavour</legend><div class="option-chips-list">
<label class="option-chip"><input class="option-chip-input" type="radio" name="flavour" value="v" checked>${SEAT}<span>Vanilla</span></label>
<label class="option-chip"><input class="option-chip-input" type="radio" name="flavour" value="b">${SEAT}<span>Berry</span></label>
<label class="option-chip"><input class="option-chip-input" type="radio" name="flavour" value="c" aria-disabled="true">${SEAT}<span>Mint</span></label>
</div></fieldset><button type="reset" class="btn">Reset</button></form></main>`;

describe("A2-16: a form's reset", () => {
  for (const scheme of ["dark", "light"]) for (const width of [390, 1440]) {
    test(`${scheme}, ${width}: after Reset one chip is drawn chosen, the native one, with the chosen look`, async () => {
      const { page, context } = await openHtml(browser, html(BODY), { scheme, width });
      try {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), scheme);
        const read = () => page.locator(".option-chip").evaluateAll((chips) => chips.map((chip) => ({ native: chip.querySelector("input").checked, drawn: chip.hasAttribute("data-checked"), fill: getComputedStyle(chip).backgroundColor, seat: getComputedStyle(chip.querySelector(".option-chip-seat")).backgroundColor })));
        await page.waitForFunction(() => document.getAnimations().length === 0);
        const before = await read();
        await page.locator(".option-chip").nth(1).click();
        const chosen = await read();
        assert.deepEqual(chosen.map((c) => [c.native, c.drawn]), [[false, false], [true, true], [false, false]]);
        await page.getByRole("button", { name: "Reset", exact: true }).click();
        await page.waitForFunction(() => document.getAnimations().length === 0); // the 100ms fill crossfade has finished
        const after = await read();
        assert.deepEqual(after.map((c) => [c.native, c.drawn]), [[true, true], [false, false], [false, false]], JSON.stringify(after));
        assert.deepEqual(after, before, "the same fills as at the start, so exactly one chip looks chosen");
        assert.notDeepEqual(after[0].fill, after[1].fill);
      } finally { await context.close(); }
    });
  }

  test("a reset another listener cancels changes nothing, and the chips still agree with their radios", async () => {
    const { page, context } = await openHtml(browser, html(BODY), { width: 600 });
    try {
      await page.evaluate(() => document.getElementById("form").addEventListener("reset", (e) => e.preventDefault()));
      await page.locator(".option-chip").nth(1).click();
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await page.evaluate(() => new Promise((r) => setTimeout(r, 50)));
      assert.deepEqual(await page.locator(".option-chip").evaluateAll((chips) => chips.map((c) => [c.querySelector("input").checked, c.hasAttribute("data-checked")])), [[false, false], [true, true], [false, false]]);
    } finally { await context.close(); }
  });
});
