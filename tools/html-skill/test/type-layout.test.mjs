// The skill's type-layout module (DECISIONS 137, approved in 139): what brings it in, that the tokens it needs are its own and not the core's, and the behaviour the React parts have, in
// the skill: the roles at the two breakpoints, the lead, the row, the sections, the columns (the uneven splits really stack from 720 to 1023), a word that breaks, axe in both
// themes at 1440 and 390, forced colours and reduced motion. parity.test.mjs compares the computed styles of each part with React's. The copy is synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml, read, skillDir } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const manifest = JSON.parse(read(skillDir, "parts", "manifest.json"));
const used = (body) => compose(`<title>t</title>${body}`, { fonts: false }).modules;
const cells = (n) => Array.from({ length: n }, (_, i) => `<div style="height: 40px">Item ${i + 1}</div>`).join("");
const PAGE = (layout = "3") => `<main class="page-sections"><section class="page-section" aria-labelledby="h"><div class="section-intro"><h1 class="text-hero" id="h">Every field note in one plain book.</h1><p class="text-lead">Fieldbook keeps notes, tables and sketches side by side, so a reader finds each one where it was left.</p><div class="section-actions"><a class="btn" data-variant="primary" data-size="lg" href="#a">Start a book</a><a class="btn" data-size="lg" href="#b">Read the guide</a></div></div></section><section class="page-section" aria-labelledby="k"><div class="section-intro"><h2 class="text-display" id="k">Three kinds of page in one book</h2></div><div class="columns" data-layout="${layout}" id="c">${cells(3)}</div></section><section class="page-section" aria-labelledby="s"><div class="section-intro"><h2 class="text-display" id="s">Share one page or the whole book</h2></div><div class="columns" data-layout="7-5"><div style="height: 80px">Text</div><div style="height: 80px">Object</div></div></section></main><footer class="page-row" id="foot">Synthetic page.</footer>`;
const open = async (body, options = {}) => {
  const opened = await openHtml(browser, compose(`<title>Type and layout</title>${body}`, { fonts: false }).html, options);
  if (options.forced) await opened.page.emulateMedia({ forcedColors: "active" });
  await settle(opened.page);
  return opened;
};
const type = (page, selector) => page.locator(selector).first().evaluate((el) => { const s = getComputedStyle(el); return { size: parseFloat(s.fontSize), line: parseFloat(s.lineHeight), tracking: parseFloat(s.letterSpacing) / parseFloat(s.fontSize), weight: s.fontWeight }; });
const axe = (page) => page.addScriptTag({ content: axeSource }).then(() => page.evaluate(() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`))));

describe("what brings the module, and what is in the core", () => {
  test("each class brings type-layout and nothing else, and so does a var() that names one of its tokens in the page's own style", () => {
    for (const cls of manifest.modules["type-layout"].classes) assert.deepEqual(used(`<div class="${cls}">x</div>`), ["type-layout"], cls);
    for (const token of ["--basalt-text-6xl-size", "--basalt-text-7xl-line-height", "--basalt-text-hero-narrow-size", "--basalt-text-display-narrow-tracking", "--basalt-space-32", "--basalt-size-section-gap-md", "--basalt-size-display-measure", "--basalt-hero-size", "--basalt-section-gap"]) {
      assert.deepEqual(used(`<style>.x { margin: var(${token}); }</style><div class="x"></div>`), ["type-layout"], token);
    }
    assert.deepEqual(used("<h1>Plain</h1><p class=\"lead\">A report's lead.</p><p class=\"text-5xl\">x</p>"), [], "the core's .lead and .text-5xl are not the module's");
  });

  test("the new tokens are in the module and not in the core, so a page that never uses them pays for none", () => {
    const core = read(skillDir, "parts", "core.css");
    const part = read(skillDir, "parts", "type-layout.css");
    for (const name of ["--basalt-text-6xl-size", "--basalt-text-7xl-size", "--basalt-text-hero-narrow-size", "--basalt-text-display-narrow-size", "--basalt-space-32", "--basalt-size-section-gap", "--basalt-size-display-measure"]) {
      assert.ok(!core.includes(`${name}:`), `${name} is not in the core`);
      assert.ok(part.includes(`${name}:`), `${name} is in the module`);
    }
    assert.ok(core.includes('font-family-sans: Geist, "Geist Fallback", ui-sans-serif'), "the core's sans family names the fallback face");
  });

  test("the module is within its budget, the core stays within its own, and the core usage and the module's usage each say which lead is which", () => {
    const size = (ext) => Buffer.byteLength(read(skillDir, "parts", `type-layout.${ext}`));
    assert.ok(size("css") <= manifest.modules["type-layout"].budget, `${size("css")} bytes`);
    assert.ok(Buffer.byteLength(read(skillDir, "parts", "core.css")) + Buffer.byteLength(read(skillDir, "parts", "core.js")) <= manifest.budgets.core);
    const coreUsage = read(skillDir, "parts", "usage", "core.md");
    const usage = read(skillDir, "parts", "usage", "type-layout.md");
    assert.match(coreUsage, /`\.lead` \(16\/24, under a report's `h1`\)/);
    assert.match(coreUsage, /`\.text-lead`/);
    assert.match(usage, /It is not the core's `\.lead` \(16\/24, under a report's `h1`\)/);
  });

  test("the core's .lead is unchanged at 16/24 and the module's .text-lead is 20/28 from 720", async () => {
    const { page, context } = await open(`<main class="page"><p class="lead" id="a">A report's lead.</p><p class="text-lead" id="b">A page's lead.</p></main>`);
    assert.deepEqual([(await type(page, "#a")).size, (await type(page, "#a")).line], [16, 24]);
    assert.deepEqual([(await type(page, "#b")).size, (await type(page, "#b")).line], [20, 28]);
    await context.close();
  });
});

describe("the roles, the lead and the sections in the skill", () => {
  for (const [width, hero, display, lead, gap] of [[1440, [96, 96], [72, 76], [20, 28], 128], [1024, [96, 96], [72, 76], [20, 28], 128], [1023, [72, 76], [56, 60], [20, 28], 96], [720, [72, 76], [56, 60], [20, 28], 96], [719, [44, 48], [36, 40], [18, 26], 64], [320, [44, 48], [36, 40], [18, 26], 64]]) {
    test(`at ${width}: hero ${hero.join("/")}, display ${display.join("/")}, lead ${lead.join("/")}, a section gap of ${gap}, the first half of it`, async () => {
      const { page, context, errors } = await open(PAGE(), { width });
      const h = await type(page, "#h");
      const k = await type(page, "#k");
      const l = await type(page, ".text-lead");
      assert.deepEqual([[h.size, h.line], [k.size, k.line], [l.size, l.line]], [hero, display, lead]);
      assert.deepEqual([h.weight, k.weight, l.weight], ["600", "600", "400"]);
      const tops = await page.locator(".page-section").evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).paddingTop)));
      assert.deepEqual(tops, [gap / 2, gap, gap]);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("display type wraps balanced at 13em at most with break-word as the net; nothing is fluid", async () => {
    const { page, context } = await open(PAGE());
    const s = await page.locator("#k").evaluate((el) => { const c = getComputedStyle(el); return { wrap: c.textWrapStyle, max: parseFloat(c.maxWidth), size: parseFloat(c.fontSize), overflowWrap: c.overflowWrap }; });
    assert.deepEqual([s.wrap, s.max, s.overflowWrap], ["balance", s.size * 13, "break-word"]);
    const part = read(skillDir, "parts", "type-layout.css");
    assert.doesNotMatch(part, /clamp\(|\d(?:vw|vh|svh|dvh|cqw|cqi)\b|min-height/);
    await context.close();
  });

  test("the row is the site header's row, the page ends a gap above its footer, and the page is as tall at 500, 900 and 1600 high (0px)", async () => {
    const ends = [];
    for (const height of [500, 900, 1600]) {
      const { page, context } = await open(PAGE(), { width: 1440 });
      await page.setViewportSize({ width: 1440, height });
      ends.push(await page.evaluate(() => document.getElementById("foot").getBoundingClientRect().bottom + scrollY));
      const row = await page.locator("#foot").evaluate((el) => { const r = el.getBoundingClientRect(); return [r.x, r.width, getComputedStyle(el).paddingLeft]; });
      assert.deepEqual(row, [144, 1152, "24px"]);
      await context.close();
    }
    assert.deepEqual([ends[0] - ends[1], ends[2] - ends[1]], [0, 0]);
  });

  test("the first line of the next section's headline is on the first screen at 1440x900, 1280x720 and 390x844", async () => {
    for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
      const { page, context } = await open(PAGE(), { width });
      await page.setViewportSize({ width, height });
      const first = await page.locator("#k").evaluate((el) => el.getBoundingClientRect().top + parseFloat(getComputedStyle(el).lineHeight));
      assert.ok(first <= height, `${width}x${height}: ${first}`);
      await context.close();
    }
  });
});

describe("columns in the skill", () => {
  const widths = (page, selector) => page.locator(`${selector} > *`).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x * 100) / 100, y: Math.round(r.y * 100) / 100, w: Math.round(r.width * 100) / 100 }; }));
  const body = (layout, n, extra = "") => `<div class="page-row"><div class="columns" data-layout="${layout}" id="c">${cells(n)}${extra}</div></div>`;

  test("the uneven splits are 7+5, 5+7, 8+4 and 4+8 from 1024, and 2, 3 and 4 are 6, 4 and 3 tracks each", async () => {
    const expect = { "2": [6, 6], "3": [4, 4, 4], "4": [3, 3, 3, 3], "7-5": [7, 5], "5-7": [5, 7], "8-4": [8, 4], "4-8": [4, 8] };
    for (const [layout, tracks] of Object.entries(expect)) {
      const { page, context } = await open(body(layout, tracks.length), { width: 1440 });
      const got = await widths(page, "#c");
      tracks.forEach((n, i) => assert.ok(Math.abs(got[i].w - (((1104 - 11 * 24) / 12) * n + 24 * (n - 1))) < 0.05, `${layout} item ${i + 1}`));
      assert.equal(new Set(got.map((g) => g.y)).size, 1);
      await context.close();
    }
  });

  test("from 720 to 1023 the uneven splits really stack (the specificity defect of the prototype), 4 is two rows of two, 2 and 3 hold; under 720 one column", async () => {
    for (const width of [720, 800, 1023]) {
      for (const layout of ["7-5", "5-7", "8-4", "4-8"]) {
        const { page, context } = await open(body(layout, 2), { width });
        const got = await widths(page, "#c");
        const row = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
        assert.deepEqual(got.map((g) => g.w), [row, row], `${layout} at ${width}`);
        assert.ok(got[1].y > got[0].y);
        await context.close();
      }
      const four = await open(body("4", 4), { width });
      assert.equal(new Set((await widths(four.page, "#c")).map((g) => g.y)).size, 2, `4 at ${width}`);
      await four.context.close();
      for (const [layout, n] of [["2", 2], ["3", 3]]) {
        const held = await open(body(layout, n), { width });
        assert.equal(new Set((await widths(held.page, "#c")).map((g) => g.y)).size, 1, `${layout} at ${width}`);
        await held.context.close();
      }
    }
    for (const layout of ["2", "3", "4", "7-5", "5-7", "8-4", "4-8"]) {
      const { page, context } = await open(body(layout, 3, '<div style="--span: 7">Own</div>'), { width: 390 });
      const got = await widths(page, "#c");
      assert.equal(new Set(got.map((g) => g.w)).size, 1, layout);
      assert.equal(got[0].w, 358);
      await context.close();
    }
  });

  // amended decision 2 (DECISIONS 144): an item's own span holds from 1024 only; from 720 to 1023 the layout decides; under 720 one column
  test("an item's own --span holds from 1024: 7 + 5 share a row at 1440 and 1024", async () => {
    for (const width of [1440, 1024]) {
      const { page, context } = await open(`<div class="page-row"><div class="columns" id="c"><div style="--span: 7">a</div><div style="--span: 5">b</div></div></div>`, { width });
      const got = await widths(page, "#c");
      assert.equal(got[0].y, got[1].y);
      assert.ok(got[0].w > got[1].w);
      await context.close();
    }
  });

  test("from 720 to 1023 an item's own --span does not hold: an unnamed layout's items are full rows, and layout 2 holds at 6 whatever the item says; under 720 one column", async () => {
    for (const width of [720, 800, 1023, 390]) {
      const { page, context } = await open(`<div class="page-row"><div class="columns" id="c"><div style="--span: 7">a</div><div style="--span: 5">b</div></div></div>`, { width });
      const got = await widths(page, "#c");
      assert.equal(got[0].w, got[1].w, `unnamed at ${width}`);
      assert.ok(got[1].y > got[0].y, `stacked at ${width}`);
      await context.close();
      if (width === 390) continue;
      const two = await open(`<div class="page-row"><div class="columns" data-layout="2" id="c"><div style="--span: 8">a</div><div style="--span: 4">b</div></div></div>`, { width });
      const held = await widths(two.page, "#c");
      assert.equal(held[0].y, held[1].y);
      assert.equal(held[0].w, held[1].w, `layout 2 at ${width} ignores --span`);
      await two.context.close();
    }
  });

  // amended defect A: --span and --_ls are custom properties and inherit; a grid nested in an item must not read the outer grid's values
  test("a nested grid does not inherit the outer grid's span: a layout 3 inside a span of 8 is three across at 4 tracks each, at 1440", async () => {
    const { page, context } = await open(`<div class="page-row"><div class="columns"><div style="--span: 8"><div class="columns" data-layout="3" id="c">${cells(3)}</div></div></div></div>`, { width: 1440 });
    const got = await widths(page, "#c");
    const inner = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
    assert.equal(new Set(got.map((g) => g.y)).size, 1, "three across");
    got.forEach((g) => assert.ok(Math.abs(g.w - ((inner - 11 * 24) / 12 * 4 + 24 * 3)) < 0.05));
    await context.close();
  });

  test("a nested grid with no layout inside a layout-2 item gives its items full rows, at 1440 and at 800", async () => {
    for (const width of [1440, 800]) {
      const { page, context } = await open(`<div class="page-row"><div class="columns" data-layout="2"><div><div class="columns" id="c">${cells(2)}</div></div><div>b</div></div></div>`, { width });
      const inner = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
      assert.deepEqual((await widths(page, "#c")).map((g) => g.w), [inner, inner], `${width}`);
      await context.close();
    }
  });

  test("a nested 7-5 inside a layout-2 item stacks at 800 and splits 7 + 5 at 1440", async () => {
    const body = `<div class="page-row"><div class="columns" data-layout="2"><div><div class="columns" data-layout="7-5" id="c"><div style="height: 40px">a</div><div style="height: 40px">b</div></div></div><div>x</div></div></div>`;
    const narrow = await open(body, { width: 800 });
    const inner = await narrow.page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
    const stacked = await widths(narrow.page, "#c");
    assert.deepEqual(stacked.map((g) => g.w), [inner, inner]);
    assert.ok(stacked[1].y > stacked[0].y);
    await narrow.context.close();
    const wideWindow = await open(body, { width: 1440 });
    const innerWide = await wideWindow.page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
    const split = await widths(wideWindow.page, "#c");
    assert.equal(split[0].y, split[1].y);
    assert.ok(Math.abs(split[0].w - (((innerWide - 11 * 24) / 12) * 7 + 24 * 6)) < 0.05);
    await wideWindow.context.close();
  });
});

describe("a page of the module's parts: axe, forced colours, reduced motion", () => {
  for (const scheme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`axe finds nothing at ${width} in ${scheme}, and nothing scrolls sideways`, async () => {
        const { page, context, errors } = await open(PAGE(), { scheme, width });
        assert.deepEqual(await axe(page), []);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  }

  test("forced colours: headings and the lead are the system's text colour", async () => {
    const { page, context } = await open(PAGE(), { forced: true });
    const want = await page.evaluate(() => { const p = document.createElement("p"); p.style.color = "CanvasText"; document.body.append(p); return getComputedStyle(p).color; });
    for (const selector of ["#h", "#k", ".text-lead"]) assert.equal(await page.locator(selector).first().evaluate((el) => getComputedStyle(el).color), want, selector);
    assert.deepEqual(await axe(page), []);
    await context.close();
  });

  test("reduced motion and not: no transition and no animation on any of the parts", async () => {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const { page, context } = await open(PAGE(), { reducedMotion });
      const motion = await page.evaluate(() => [...document.querySelectorAll(".text-hero, .text-display, .text-lead, .page-sections, .page-section, .section-intro, .section-actions, .columns, .page-row")].map((el) => { const s = getComputedStyle(el); return [s.transitionDuration, s.animationName]; }));
      for (const m of motion) assert.deepEqual(m, ["0s", "none"], reducedMotion);
      await context.close();
    }
  });

  test("a word longer than the row breaks instead of scrolling the page sideways, and a counter sees it", async () => {
    const { page, context } = await open(`<main class="page-sections"><section class="page-section"><h1 class="text-hero" id="w">Internationalization</h1></section></main>`, { width: 320 });
    const broken = await page.evaluate(() => { const el = document.getElementById("w"); const range = document.createRange(); range.selectNodeContents(el); const rows = new Set([...range.getClientRects()].map((r) => Math.round(r.top))); return rows.size > 1 || el.getBoundingClientRect().height > 48; });
    assert.equal(broken, true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await context.close();
  });
});
