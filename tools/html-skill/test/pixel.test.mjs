// The two example pages, and a page with every component, composed from their bodies, render pixel for pixel as the pages recorded in
// fixtures/baseline-*.html did. Both themes, 1440 and 390 wide, at rest and with the palette open (and, on the every-component page, with a
// focus ring on a tab, a row, an input and a button).
//
// The baseline began as PR #26's two templates, byte for byte. A PR that changes a pixel on purpose re-records the fixtures from the new
// pages in the same commit (node tools/html-skill/test/record-baseline.mjs), so the diff shows what moved; it does not weaken this test.
// Re-recorded so far: the first parity PR (the number field, the textarea's height, native chrome, braille, the ring, code radius).
// The second parity PR (popup rows and levels, the glide, the bar's removal, the segment's pill): the palette (open), the kitchen sink's rows,
// segment and selected table row; the two example pages at rest did not move.
// The ninth parity PR (commands): the kitchen sink names the new module with a basalt:use comment (a list of its own is a new baseline below); every existing baseline's pixels are as they were.
// The eleventh parity PR (the rest of the overlays): the kitchen sink names the combobox and the sparkline with a basalt:use comment (a page of their own is a new baseline below); every existing baseline's pixels are as they were.
// The fifth parity PR (the figures): the kitchen sink gains a section of the description list, the meter, a stat's source line, the terminal and the chart, after its overlays;
// every region above it, and the two example pages, did not move (the two examples' recorded files are as they were).
// The audit-design-b PR (DECISIONS 138 and 139, E2): the modules that drew a Phosphor icon for check, close, a chevron, copy, plus, minus or search now write the core glyph, so the
// number field's steppers, the palette's and the filter's search, the filter's chevron and the menus' checks moved by a few pixels each (a region at a time, under 650 pixels a page);
// the baselines were re-recorded from the new pages in the same commit, and no other region moved.
// The audit-design-b amendment (DECISIONS 142): the skill's short standalone link takes a 44 by 44 hit box from a pseudo-element, so the link is positioned; on a coarse pointer (the 390 pages) the
// footer's "Top" link in the every-component page antialiases one grey level differently (27 pixels, 222 against 223), and the baselines were re-recorded in the same commit; nothing else moved.
// The site-parts PR (DECISIONS 146 E): the smoke's midpoint (dark 92.5%, light 96%, from 85% and 92%) moves the pixels under the bar by a few grey levels, so the baselines were re-recorded in the same
// commit from the new pages; the bar's own box, ink and line, and every region below it, did not move.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { examplePage, here, launch, openHtml, read, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

// The recorded page with Geist put back where the fixture has its placeholder.
const fonts = read(skillDir, "parts", "geist.css").trim();
const baseline = (name) => read(here, "fixtures", `baseline-${name}.html`).replace("<!-- basalt:fonts -->", () => `<style data-basalt-fonts>\n${fonts}\n</style>`);

/** The page as a PNG, the viewport sized to the document (a full-page capture on a phone context drops its touch media features). */
async function shot(page, width) {
  await page.setViewportSize({ width, height: await page.evaluate(() => document.documentElement.scrollHeight) });
  // A focus or hover step is a short transition: let each one finish, so two renders of the same page can't be caught at different moments.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {}))));
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

describe("composed pages match their recorded baselines, pixel for pixel", () => {
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

// Every component on one page, built with compose.mjs from the body and compared with the page recorded from it. The two example pages
// above don't use every part; this one does.
describe("a page with every component matches its recorded baseline, pixel for pixel", () => {
  const sink = read(here, "fixtures", "kitchen-sink.body.html");
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
        for (const [which, html] of Object.entries({ composed: compose(sink).html, baseline: baseline("kitchen-sink") })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          // Animations hold their first frame, so two renders of a spinner can be compared.
          await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
          pictures[which] = { rest: await shot(page, width) };
          for (const selector of ["#t1", "a.row[data-active]", "#f1", "main .btn[data-variant=primary]:not([disabled])"]) {
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

// The sixth parity PR (forms and selection): a page of the select, the checkbox, radio and switch, the choice card, the pressed toggle, a table's checkbox column
// (header box mixed, one row selected) and the loops hold's controls, at rest. (The kitchen sink names these modules with a basalt:use comment instead of drawing them:
// its focus steps read the page again and again, and the new marks' edges made some of those reads differ by a few pixels from one load to the next.)
describe("the forms and selection page matches its recorded baseline, pixel for pixel", () => {
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });
  const body = read(here, "fixtures", "forms.body.html");
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`${scheme}, ${width}px, at rest`, async () => {
        const pictures = {};
        for (const [which, html] of Object.entries({ composed: compose(body).html, baseline: baseline("forms") })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
          pictures[which] = await shot(page, width);
          await context.close();
        }
        const result = await differing(scratch, pictures.composed, pictures.baseline);
        assert.equal(result.count, 0, `${result.count} pixels differ (${result.size.join("x")})`);
      });
    }
  }
});

// The eighth parity PR (tables and filters): a still table (a select column, sorted and sortable headers, a "Not observed" cell, pinned columns) with the chips, a collapsed
// checklist and the result line above it, at rest. The existing baselines above did not move; these are new.
describe("the tables and filters page matches its recorded baseline, pixel for pixel", () => {
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });
  const body = read(here, "fixtures", "tables.body.html");
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`${scheme}, ${width}px, at rest`, async () => {
        const pictures = {};
        for (const [which, html] of Object.entries({ composed: compose(body).html, baseline: baseline("tables") })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
          pictures[which] = await shot(page, width);
          await context.close();
        }
        const result = await differing(scratch, pictures.composed, pictures.baseline);
        assert.equal(result.count, 0, `${result.count} pixels differ (${result.size.join("x")})`);
      });
    }
  }
});

// The ninth parity PR (commands): the command list in the page at rest (idle, the first row lit but not shown) and a list with a preview (side by side at 1440, the list alone at
// 390 where it pushes). The existing baselines above did not move; this one is new.
describe("the commands page matches its recorded baseline, pixel for pixel", () => {
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });
  const body = read(here, "fixtures", "commands.body.html");
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`${scheme}, ${width}px, at rest`, async () => {
        const pictures = {};
        for (const [which, html] of Object.entries({ composed: compose(body).html, baseline: baseline("commands") })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
          pictures[which] = await shot(page, width);
          await context.close();
        }
        const result = await differing(scratch, pictures.composed, pictures.baseline);
        assert.equal(result.count, 0, `${result.count} pixels differ (${result.size.join("x")})`);
      });
    }
  }
});

// The tenth parity PR (art): the stage under the site header with paired art, and framed art in every aspect, a card, and a failure, at rest. The existing baselines above did not move
// but for the status callouts: a success, warning or danger callout's rim is now the status colour at 45% (DECISIONS 82), so the pages that draw one were re-recorded (see the PR).
describe("the art page matches its recorded baseline, pixel for pixel", () => {
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });
  const body = read(here, "fixtures", "art.body.html");
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`${scheme}, ${width}px, at rest`, async () => {
        const pictures = {};
        for (const [which, html] of Object.entries({ composed: compose(body).html, baseline: baseline("art") })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          // Every frame has settled (loaded or failed), and its fade has run, before the page is read.
          await page.waitForFunction(() => [...document.querySelectorAll(".framed-frame")].every((f) => ["loaded", "failed"].includes(f.dataset.phase)));
          pictures[which] = await shot(page, width);
          await context.close();
        }
        const result = await differing(scratch, pictures.composed, pictures.baseline);
        assert.equal(result.count, 0, `${result.count} pixels differ (${result.size.join("x")})`);
      });
    }
  }
});

// The eleventh parity PR (the rest of the overlays): the combobox (empty, chosen, off) and the sparkline (data, a decimal, empty, loading) at rest. The existing baselines above did not
// move in a pixel; this one is new.
describe("the combobox and sparkline page matches its recorded baseline, pixel for pixel", () => {
  let scratch;
  before(async () => { scratch = await browser.newPage(); });
  after(async () => { await scratch?.close(); });
  const body = read(here, "fixtures", "rest.body.html");
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`${scheme}, ${width}px, at rest`, async () => {
        const pictures = {};
        for (const [which, html] of Object.entries({ composed: compose(body).html, baseline: baseline("rest") })) {
          const { page, context, errors } = await openHtml(browser, html, { scheme, width, touch: width === 390 });
          assert.deepEqual(errors, [], `${which} logged errors`);
          // The loading line breathes: both renders are held at its first frame.
          await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; }));
          pictures[which] = await shot(page, width);
          await context.close();
        }
        const result = await differing(scratch, pictures.composed, pictures.baseline);
        assert.equal(result.count, 0, `${result.count} pixels differ (${result.size.join("x")})`);
      });
    }
  }
});
