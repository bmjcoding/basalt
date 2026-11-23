// The HTML skill's menu module draws DECISIONS 275 (the owner's option B) as React does: a menu stays at most 320 wide, a described row's description wraps and the row
// grows, the label stays one line, and the row's plate and the glide's plate cover the whole taller row. Fixtures load no web font, so every margin is wider than a fallback
// font's width. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const BODY = `<main style="padding: 16px">
  <h1 class="visually-hidden">Access</h1>
  <button class="btn" id="opener" popovertarget="m">Access</button>
  <div class="panel float menu" popover id="m">
    <div role="group" aria-label="Access">
      <button class="menu-item" role="menuitemradio" aria-checked="false" id="view"><span class="menu-item-label">Can view</span><span class="menu-item-description">Reads the document and its comments, and cannot change anything at all in it</span></button>
      <button class="menu-item" role="menuitemradio" aria-checked="true" id="edit"><span class="menu-item-label">Can edit</span><span class="menu-item-description">Changes the text</span></button>
    </div>
    <button class="menu-item" role="menuitem" id="copy"><span class="menu-item-label">Copy link</span></button>
  </div>
</main>`;
const html = compose(BODY).html;
const settle = (page) => page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 450)));

describe("a described menu row wraps (DECISIONS 275)", () => {
  for (const width of [1440, 390]) {
    test(`at ${width}: at most 320 wide, the description wraps and the row grows, the label is one line, the plate covers the row`, async () => {
      const { page, context, errors } = await openHtml(browser, html, { width });
      await page.click("#opener");
      await settle(page);
      const info = await page.evaluate(() => {
        const box = (el) => el.getBoundingClientRect();
        const view = document.getElementById("view");
        const edit = document.getElementById("edit");
        return {
          menu: box(document.getElementById("m")).width,
          viewH: box(view).height, editH: box(edit).height,
          label: box(view.querySelector(".menu-item-label")).height,
          desc: box(view.querySelector(".menu-item-description")).height,
          white: getComputedStyle(view.querySelector(".menu-item-description")).whiteSpace,
          plate: parseFloat(getComputedStyle(view, "::before").height),
          inset: parseFloat(getComputedStyle(view, "::before").top),
        };
      });
      assert.ok(info.menu <= 320, `menu ${info.menu}`);
      assert.equal(info.white, "normal");
      assert.ok(info.desc >= 36, `the long description takes two lines or more: ${info.desc}`);
      assert.equal(Math.round(info.label), 20, "the label is one line");
      assert.ok(info.viewH >= info.editH + 18, `the row grows by the description's lines: ${info.viewH} against ${info.editH}`);
      assert.equal(Math.round(info.plate + 2 * info.inset), Math.round(info.viewH), "the row's plate covers the whole row");
      // The glide's plate takes the lit row's own height: a tall row, then a one-line row.
      await page.hover("#view");
      await settle(page);
      const tall = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#m .plate")).height));
      await page.hover("#copy");
      await settle(page);
      const short = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#m .plate")).height));
      assert.equal(Math.round(tall), Math.round(info.plate));
      assert.ok(short < tall - 18, `the plate changes height between rows: ${tall} then ${short}`);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});
