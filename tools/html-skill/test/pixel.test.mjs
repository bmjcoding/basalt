// The two example pages, composed from their short bodies, render pixel for pixel as the two templates did when the skill
// shipped them whole (PR #26): the baseline pages in fixtures/ are those templates, byte for byte. Both themes, 1440 and 390
// wide, at rest and with the palette open. The rebuild changed how a page is assembled, not how it looks.
//
// This pins the pages to #26. The first PR that changes a pixel on purpose (the audit's S1 to S9) re-records the baseline
// from the new pages in the same commit, so the diff shows what moved; it does not weaken this test.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { examplePage, here, launch, openHtml, read, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// What a person gets from the old flow: the template with inline-fonts.mjs run on it.
const fonts = read(skillDir, "parts", "geist.css").trim();
const baseline = (name) => read(here, "fixtures", `baseline-${name}.html`).replace("<!-- basalt:fonts -->", () => `<style data-basalt-fonts>\n${fonts}\n</style>`);

/** The page as a PNG, the viewport sized to the document (a full-page capture on a phone context drops its touch media features). */
async function shot(page, width) {
  await page.setViewportSize({ width, height: await page.evaluate(() => document.documentElement.scrollHeight) });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return page.screenshot();
}

/** How many pixels differ between two PNGs, counted in the browser (no image library). */
async function differing(page, a, b) {
  return page.evaluate(async ([x, y]) => {
    const load = (b64) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = `data:image/png;base64,${b64}`; });
    const [i, j] = await Promise.all([load(x), load(y)]);
    if (i.width !== j.width || i.height !== j.height) return { size: [i.width, i.height, j.width, j.height], count: -1 };
    const data = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
    const p = data(i), q = data(j);
    let count = 0;
    for (let k = 0; k < p.length; k += 4) if (p[k] !== q[k] || p[k + 1] !== q[k + 1] || p[k + 2] !== q[k + 2] || p[k + 3] !== q[k + 3]) count++;
    return { size: [i.width, i.height], count };
  }, [a.toString("base64"), b.toString("base64")]);
}

describe("composed pages match the #26 templates, pixel for pixel", () => {
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });

  for (const name of ["static", "interactive"]) {
    for (const scheme of ["dark", "light"]) {
      for (const width of [1440, 390]) {
        test(`${name}, ${scheme}, ${width}px${name === "interactive" ? ", and with the palette open" : ""}`, async () => {
          const html = { composed: examplePage(name).html, baseline: baseline(name) };
          const pictures = {};
          for (const [which, page] of Object.entries(html)) {
            const { page: p, context } = await openHtml(browser, page, { scheme, width, touch: width === 390 });
            pictures[which] = { rest: await shot(p, width) };
            if (name === "interactive") {
              await p.setViewportSize({ width, height: width === 390 ? 844 : 900 });
              await p.keyboard.press("Control+k");
              await p.locator(".palette input").waitFor();
              await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
              pictures[which].palette = await p.screenshot();
            }
            await context.close();
          }
          for (const state of Object.keys(pictures.composed)) {
            const result = await differing(scratch, pictures.composed[state], pictures.baseline[state]);
            assert.deepEqual(result.count, 0, `${state}: ${result.count} pixels differ (${result.size.join("x")})`);
          }
        });
      }
    }
  }
});

// Every component on one page, built twice: with the #26 stylesheet and script (taken from the baseline template, whole) and with
// compose.mjs from the same body. The two example pages above don't use every part; this one does.
describe("a page with every component matches the #26 stylesheet, pixel for pixel", () => {
  const sink = read(here, "fixtures", "kitchen-sink.body.html");
  const oldPage = () => {
    const old = baseline("interactive");
    const head = old.slice(0, old.indexOf("</head>")).replace(/<title>[^<]*<\/title>/, "<title>Basalt kitchen sink</title>");
    const library = old.match(/<script>\n\/\* Basalt HTML script[\s\S]*?<\/script>/)[0];
    return `${head}</head>\n<body>\n${sink.replace(/<title>[^<]*<\/title>\s*/, "")}\n${library}\n<script>Basalt.init();</script>\n</body>\n</html>\n`;
  };
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });

  test("compose.mjs picks every module for it", () => {
    const { modules } = compose(sink);
    const all = compose(sink, { all: true }).modules;
    assert.deepEqual(modules, all, "the markup alone pulls in every module");
  });

  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`${scheme}, ${width}px: at rest, with a focus ring on a tab, a row, an input and a button, and with the palette open`, async () => {
        const pictures = {};
        for (const [which, html] of Object.entries({ composed: compose(sink).html, baseline: oldPage() })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          // Animations hold their first frame, so two renders of a spinner can be compared.
          await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
          pictures[which] = { rest: await shot(page, width) };
          for (const selector of ["#t1", "a.row[data-active]", "#f1", ".btn[data-variant=primary]:not([disabled])"]) {
            await page.locator(selector).focus();
            pictures[which][selector] = await shot(page, width);
          }
          await page.evaluate(() => document.activeElement.blur());
          await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
          await page.keyboard.press("Control+k");
          await page.locator(".palette input").waitFor();
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          pictures[which].palette = await page.screenshot();
          await context.close();
        }
        for (const state of Object.keys(pictures.composed)) {
          const result = await differing(scratch, pictures.composed[state], pictures.baseline[state]);
          assert.equal(result.count, 0, `${state}: ${result.count} pixels differ (${result.size.join("x")})`);
        }
      });
    }
  }
});
