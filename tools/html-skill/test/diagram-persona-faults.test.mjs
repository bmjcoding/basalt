// The skill's share of two diagram faults from CIMIP's persona review (main 43c486ef), on the engine the skill shares with React:
// 1. An Esc that clears a trace is the figure's alone: in a dialog it cancels the browser's close and goes no further, so the dialog stays open with focus in
//    the figure, and the next Esc, with nothing traced, closes it.
// 2. A drawn sequence's messages read as the stacked ones do (the number, a space, the words, then the route), from words written beside the row, unseen.
// Composed pages. Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { pkg } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const P = "diagram";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const figure = (id, spec, style = "") => `<figure class="diagram" id="${id}"${style ? ` style="${style}"` : ""}><script type="application/json" data-diagram>${JSON.stringify(spec).replace(/</g, "\\u003c")}</script></figure>`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

describe("Esc on a traced figure in a dialog (fault 1)", () => {
  for (const kind of ["architecture", "sequence"]) {
    test(`${kind}: the first Esc clears the trace and the dialog stays open; the next closes it`, async () => {
      const html = compose(`<title>Esc</title><main style="padding:16px"><button class="btn" id="trigger" data-dialog-open="#d">Open</button></main>
<dialog class="panel float modal dialog" id="d" style="width:1040px;max-width:96vw"><h2 class="dialog-title">Document</h2>${figure("fig", DATA[kind])}<div class="dialog-actions"><button class="btn" data-dialog-close>Close</button></div></dialog>`).html;
      const { page, context, errors } = await openHtml(browser, html, { scheme: "dark" });
      await page.locator("#trigger").click();
      await page.waitForSelector("#fig[data-layout]");
      await frames(page, 3);
      const state = () => page.evaluate(() => ({ open: document.querySelector("#d").open, tracing: document.querySelector("#fig").hasAttribute("data-tracing"), inFigure: Boolean(document.activeElement?.closest("#fig")) }));
      await page.locator(`#fig .${P}-node[tabindex="0"]`).first().focus();
      await page.keyboard.press("ArrowRight");
      await frames(page, 2);
      assert.deepEqual(await state(), { open: true, tracing: true, inFigure: true }, "the keys trace a node");
      await page.keyboard.press("Escape");
      await frames(page, 2);
      assert.deepEqual(await state(), { open: true, tracing: false, inFigure: true }, "the first Esc is the figure's");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector("#d").open);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

describe("a drawn sequence's accessible words (fault 2)", () => {
  test("drawn, each message reads as it does stacked", async () => {
    const html = compose(`<title>Words</title><main style="max-width:1104px;margin:0 auto;padding:16px">${figure("drawn", DATA.sequence)}${figure("stacked", DATA.sequence, "width:480px")}</main>`).html;
    const { page, context, errors } = await openHtml(browser, html, { scheme: "dark" });
    await page.waitForSelector("#drawn[data-layout] ~ #stacked[data-layout]");
    await frames(page, 3);
    assert.deepEqual(await page.evaluate(() => [document.querySelector("#drawn").dataset.layout, document.querySelector("#stacked").dataset.layout]), ["drawn", "stacked"]);
    const messages = async (id) => (await page.locator(`#${id}`).ariaSnapshot()).split("\n").map((l) => l.trim()).filter((l) => /^- listitem: \d/.test(l)).map((l) => l.replace(/^- listitem: /, ""));
    const want = await messages("stacked");
    assert.ok(want.length > 3);
    assert.match(want[0], /^1 \S.* to .* · /);
    assert.deepEqual(await messages("drawn"), want);
    assert.deepEqual(errors, []);
    await context.close();
  });
});
