// Type and layout (DECISIONS 137, approved in 139): the display roles, the lead, the page row, the sections, the columns and the fallback face. Driven in
// Chromium against the built package with the real stylesheet. The fixtures load no web font unless a test says so, so text widths differ from a Mac's on
// CI's Linux runner: a measured margin here is wider than a fallback font's width, and a position is compared with itself. A test that needs Geist's real
// widths (the phone size, the fallback's fit) loads the Geist file Basalt ships into the page itself.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import * as esbuild from "esbuild";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const fontsCss = fs.readFileSync(path.join(pkg, "dist", "fonts.css"), "utf8");
const geistBase64 = fs.readFileSync(path.join(pkg, "dist", "fonts", "Geist-Variable.woff2")).toString("base64");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;

// Synthetic copy, never a real product's.
const HERO = "Every field note in one plain book.";
const LEAD = "Fieldbook keeps notes, tables and sketches side by side, so a reader finds each one where it was left.";
const KINDS = "Three kinds of page in one book";

const header = `<B.SiteHeader brand={<>${MARK}<span>Acme</span></>} brandLabel="Acme home" links={[{ href: "#a", label: "Guide" }, { href: "#b", label: "Pricing" }]} />`;
const cells = (n) => Array.from({ length: n }, (_, i) => `<div key={${i}} className="cell" style={{ height: 40 }}>Item ${i + 1}</div>`).join("");
/** A first screen with a hero, a lead and two buttons over three sections, as a site writes it, with a header above and a footer row below. */
const landing = ({ withHeader = true, kinds = KINDS, layout = "3" } = {}) => `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; createRoot(document.getElementById("root")).render(<div>
  ${withHeader ? header : ""}
  <B.PageSections id="main">
    <B.PageSection aria-labelledby="hero">
      <B.SectionIntro>
        <B.Heading id="hero" level={1} size="hero">${HERO}</B.Heading>
        <B.Lead>${LEAD}</B.Lead>
        <B.SectionActions><B.Button variant="primary" size="lg">Start a book</B.Button><B.Button size="lg">Read the guide</B.Button></B.SectionActions>
      </B.SectionIntro>
    </B.PageSection>
    <B.PageSection aria-labelledby="kinds">
      <B.SectionIntro><B.Heading id="kinds" level={2} size="display">${kinds}</B.Heading><B.Lead>A book holds notes, tables and sketches.</B.Lead></B.SectionIntro>
      <B.Columns layout="${layout}">${cells(3)}</B.Columns>
    </B.PageSection>
    <B.PageSection aria-labelledby="share">
      <B.SectionIntro><B.Heading id="share" level={2} size="display">Share one page or the whole book</B.Heading></B.SectionIntro>
      <B.Columns layout="7-5"><div className="cell" style={{ height: 80 }}>Text column</div><div className="cell" style={{ height: 80 }}>Object</div></B.Columns>
    </B.PageSection>
  </B.PageSections>
  <B.PageRow as="footer" id="foot"><B.Text size="sm" tone="secondary">Fieldbook. Synthetic page.</B.Text></B.PageRow>
</div>);`;

const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const withGeist = (page) => page.addStyleTag({ content: `@font-face { font-family: "Geist"; src: url(data:font/woff2;base64,${geistBase64}) format("woff2"); font-weight: 100 900; font-style: normal; }` })
  .then(() => page.evaluate(async () => { await document.fonts.load('600 16px Geist'); await document.fonts.load('400 16px Geist'); await document.fonts.ready; }));
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (page, selector, property, n = 0) => page.locator(selector).nth(n).evaluate((el, p) => getComputedStyle(el)[p], property);
const type = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const s = getComputedStyle(el); return { size: parseFloat(s.fontSize), line: parseFloat(s.lineHeight), tracking: parseFloat(s.letterSpacing) / parseFloat(s.fontSize), weight: s.fontWeight }; });
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
/** Every word in `selector`'s text that a line break splits in two (a Range over the word has one rect for each line it covers). `overflow-wrap` hides these from an overflow check. */
const brokenWords = (page, selector) => page.evaluate((sel) => {
  const broken = [];
  for (const el of document.querySelectorAll(sel)) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const match of node.data.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rows = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
        if (rows.size > 1) broken.push(match[0]);
      }
    }
  }
  return broken;
}, selector);
/** The widest thing past the window: a headline or lead that passes its row, or the page scrolling sideways. */
const overflow = (page) => page.evaluate(() => ({ scrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth, pastRow: [...document.querySelectorAll(".basalt-heading, .basalt-lead")].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((el) => el.textContent) }));
const lines = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));

describe("the display steps and the roles", () => {
  // item 137 A: two fixed steps and two roles stepped on the viewport at 720 and 1024, never fluid
  const roleAt = [
    [1440, { hero: [96, 96, -0.045], display: [72, 76, -0.04], lead: [20, 28, -0.015] }],
    [1024, { hero: [96, 96, -0.045], display: [72, 76, -0.04], lead: [20, 28, -0.015] }],
    [1023, { hero: [72, 76, -0.04], display: [56, 60, -0.035], lead: [20, 28, -0.015] }],
    [720, { hero: [72, 76, -0.04], display: [56, 60, -0.035], lead: [20, 28, -0.015] }],
    [719, { hero: [44, 48, -0.03], display: [36, 40, -0.025], lead: [18, 26, -0.01] }],
    [390, { hero: [44, 48, -0.03], display: [36, 40, -0.025], lead: [18, 26, -0.01] }],
    [320, { hero: [44, 48, -0.03], display: [36, 40, -0.025], lead: [18, 26, -0.01] }],
  ];
  for (const [width, want] of roleAt) {
    test(`at ${width} the hero is ${want.hero[0]}/${want.hero[1]}, display ${want.display[0]}/${want.display[1]} and the lead ${want.lead[0]}/${want.lead[1]}, all stepped and weight 600 (400 for the lead)`, async () => {
      const page = await open(landing(), { width });
      for (const [role, selector] of [["hero", "#hero"], ["display", "#kinds"], ["lead", ".basalt-lead"]]) {
        const got = await type(page, selector);
        assert.deepEqual([got.size, got.line], [want[role][0], want[role][1]], `${role} size and line at ${width}`);
        near(got.tracking, want[role][2], `${role} tracking at ${width}`, 0.0006);
        assert.equal(got.weight, role === "lead" ? "400" : "600", `${role} weight`);
      }
      assert.deepEqual(page.errors, []);
      await page.close();
    });
  }

  test("the roles never move with the window's width inside a band: 1024 to 1920 is one size, 720 to 1023 is one size, under 720 is one size", async () => {
    const page = await open(landing(), { width: 1440 });
    const sizes = {};
    for (const width of [320, 360, 390, 560, 719, 720, 768, 900, 1023, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      sizes[width] = [(await type(page, "#hero")).size, (await type(page, "#kinds")).size];
    }
    for (const width of [320, 360, 390, 560, 719]) assert.deepEqual(sizes[width], [44, 36], `${width}`);
    for (const width of [720, 768, 900, 1023]) assert.deepEqual(sizes[width], [72, 56], `${width}`);
    for (const width of [1024, 1280, 1440, 1920]) assert.deepEqual(sizes[width], [96, 72], `${width}`);
    await page.close();
  });

  test("no type rule is fluid: no clamp, no viewport or container unit in a size, and no breakpoint but 720 and 1024 in a rule about the roles", () => {
    const components = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
    const block = components.slice(components.indexOf("Display type, the lead and the page"), components.indexOf("@media (pointer: coarse) {\n    .basalt-page-link"));
    assert.ok(block.length > 3000, "found the section");
    assert.doesNotMatch(block, /clamp\(|\d(?:vw|vh|svh|dvh|cqw|cqi|vi)\b/);
    const widths = [...block.matchAll(/@media[^{]*/g)].map((m) => m[0]).join(" ");
    assert.deepEqual([...new Set([...widths.matchAll(/(\d+)px/g)].map((m) => m[1]))].sort(), ["1024", "720"]);
  });

  test("the fixed steps text-6xl and text-7xl are 72/76 and 96/96 at every width, and a Text takes them", async () => {
    for (const width of [1440, 390]) {
      const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div><B.Heading size="7xl" id="a">Plain</B.Heading><B.Heading size="6xl" id="b">Plain</B.Heading><B.Text as="div" size="6xl" id="c">Plain</B.Text><B.Text as="div" size="7xl" id="d">Plain</B.Text></div>);`, { width });
      assert.deepEqual([await type(page, "#a"), await type(page, "#b")].map((t) => [t.size, t.line, t.weight]), [[96, 96, "600"], [72, 76, "600"]]);
      near((await type(page, "#a")).tracking, -0.045, "7xl tracking", 0.0006);
      near((await type(page, "#b")).tracking, -0.04, "6xl tracking", 0.0006);
      assert.deepEqual([await type(page, "#c"), await type(page, "#d")].map((t) => [t.size, t.line]), [[72, 76], [96, 96]]);
      await page.close();
    }
  });

  // amended item B: display type is 600 through Text as through Heading and the skill's classes; a weight that is asked for still wins, and the other steps stay regular
  test("Text size 6xl and 7xl draw at weight 600 by default, as Heading and the skill's classes do; an explicit weight wins; the other steps stay 400", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div><B.Text as="div" size="6xl" id="a">Plain</B.Text><B.Text as="div" size="7xl" id="b">Plain</B.Text><B.Text as="div" size="7xl" weight="regular" id="c">Plain</B.Text><B.Text as="div" size="5xl" id="d">Plain</B.Text><B.Text as="div" size="md" id="e">Plain</B.Text><B.Text as="div" size="md" weight="medium" id="f">Plain</B.Text></div>);`);
    assert.deepEqual(await Promise.all(["a", "b", "c", "d", "e", "f"].map(async (id) => (await type(page, `#${id}`)).weight)), ["600", "600", "400", "400", "400", "500"]);
    await page.close();
  });

  test("the ten shipped steps do not change", async () => {
    const want = { xs: [12, 16], sm: [13, 18], base: [14, 20], md: [16, 24], lg: [18, 26], xl: [20, 28], "2xl": [24, 30], "3xl": [30, 36], "4xl": [40, 44], "5xl": [56, 60] };
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>${Object.keys(want).map((s) => `<B.Text as="div" size="${s}" id="s-${s}">Plain</B.Text>`).join("")}</div>);`);
    for (const [step, [size, line]] of Object.entries(want)) assert.deepEqual([(await type(page, `#s-${step}`)).size, (await type(page, `#s-${step}`)).line], [size, line], step);
    await page.close();
  });

  test("a headline's role is the viewport's band, not its container's: a hero in a 300px box is still 96 on a 1440 window", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ width: 300 }}><B.Heading size="hero" id="h" level={1}>Plain</B.Heading></div>);`);
    assert.equal((await type(page, "#h")).size, 96);
    await page.close();
  });
});

describe("how a display headline wraps", () => {
  // item 137 A: text-wrap balance; at most 13em; no hard break; overflow-wrap as a safety net only
  test("balanced, 13em at most, break-word as the net, and hyphens manual: for the roles and for both fixed steps", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>
      <B.Heading level={1} size="hero" id="a">${HERO}</B.Heading><B.Heading size="display" id="b">${KINDS}</B.Heading>
      <B.Heading size="6xl" id="c">${KINDS}</B.Heading><B.Heading size="7xl" id="d">${HERO}</B.Heading><B.Heading size="5xl" id="e">${KINDS}</B.Heading><B.Text as="div" size="6xl" id="f">${KINDS}</B.Text></div>);`);
    for (const id of ["a", "b", "c", "d", "f"]) {
      const s = await page.locator(`#${id}`).evaluate((el) => { const c = getComputedStyle(el); return { wrap: c.textWrapStyle, max: parseFloat(c.maxWidth), size: parseFloat(c.fontSize), overflowWrap: c.overflowWrap, hyphens: c.hyphens }; });
      assert.equal(s.wrap, "balance", `${id} wrap`);
      near(s.max, s.size * 13, `${id} is at most 13em`, 0.01);
      assert.equal(s.overflowWrap, "break-word", `${id} overflow-wrap`);
      assert.equal(s.hyphens, "manual");
    }
    // a step below display keeps the heading's own wrapping
    assert.deepEqual(await page.locator("#e").evaluate((el) => { const c = getComputedStyle(el); return [c.textWrapStyle, c.maxWidth, c.overflowWrap]; }), ["auto", "none", "anywhere"]);
    await page.close();
  });

  test("a display headline in the 1104px row sets as a block of two lines, not a strip across the row (the measure binds)", async () => {
    const page = await open(landing(), { width: 1440 });
    await withGeist(page);
    const h = await box(page, "#kinds");
    near(h.w, 72 * 13, "936px wide, the measure", 0.5);
    assert.ok(h.w < 1104 - 100, "narrower than the row");
    assert.equal(await lines(page, "#kinds"), 2, "two lines of Geist");
    await page.close();
  });

  test("two sentences meant as two lines are two block spans, each on its own line; there is no <br> to write", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.Heading level={1} size="display" id="h"><span className="basalt-text-line">A book of notes.</span><span className="basalt-text-line">A book of tables.</span></B.Heading>);`, { width: 1440 });
    const rows = await page.locator("#h > span").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.top, r.height, getComputedStyle(el).display]; }));
    assert.equal(rows[0][2], "block");
    assert.ok(rows[1][0] >= rows[0][0] + rows[0][1] - 0.5, "the second sentence starts below the first");
    await page.close();
  });

  test("the library renders no <br> of its own and its docs name none for a headline", () => {
    const foundations = fs.readFileSync(path.join(pkg, "..", "..", "docs", "foundations.md"), "utf8");
    assert.match(foundations, /never a `<br>`|no `<br>`/i);
    const code = (file) => fs.readFileSync(path.join(pkg, "src", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(code("composition.tsx") + code("page.tsx"), /<br\b|"br"/);
  });

  // item 137 A and the owner's rule: a first-screen headline on a phone is 44/48, and the phone size is a row width: most words fit a 288px row at 44px; a word that does not fit breaks
  test("at 44px and -0.03em in Geist most words fit the 288px row at 320: 'Responsibility' is under 288 and breaks nothing; a word of 20 letters does not fit and breaks, and the page does not scroll sideways", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>
      <B.Heading level={1} size="hero" id="a">Responsibility</B.Heading><B.Heading size="hero" id="b">Internationalization</B.Heading><B.Heading size="hero" id="c">${HERO}</B.Heading></div>);`, { width: 320, height: 640 });
    await withGeist(page);
    const row = 320 - 32;
    const widths = await page.locator("#a, #b").evaluateAll((els) => els.map((el) => { const range = document.createRange(); range.selectNodeContents(el); return Math.max(...[...range.getClientRects()].map((r) => r.width)); }));
    assert.ok(widths[0] <= row, `Responsibility is ${widths[0]}px on a ${row}px row`);
    assert.deepEqual(await brokenWords(page, "#a"), [], "it fits, so it does not break");
    assert.deepEqual(await brokenWords(page, "#b"), ["Internationalization"], "a word that does not fit breaks, and that is the safety net doing its job");
    assert.equal((await overflow(page)).scrollsSideways, false);
    assert.deepEqual(await brokenWords(page, "#c"), []);
    await page.close();
  });
});

describe("the lead", () => {
  // item 137 B
  test("400 in secondary ink at size-prose-width (544), pretty, on the row's start edge; no tracking added to the scale's own", async () => {
    const page = await open(landing(), { width: 1440 });
    const s = await page.locator(".basalt-lead").first().evaluate((el) => { const c = getComputedStyle(el); return { weight: c.fontWeight, wrap: c.textWrapStyle, max: parseFloat(c.maxWidth), color: c.color }; });
    assert.equal(s.weight, "400");
    assert.equal(s.wrap, "pretty");
    near(s.max, 544, "34rem");
    const secondary = await page.evaluate(() => { const p = document.createElement("p"); p.style.color = "var(--basalt-text-secondary)"; document.body.append(p); return getComputedStyle(p).color; });
    assert.equal(s.color, secondary);
    const headline = await box(page, "#hero");
    const lead = await box(page, ".basalt-lead");
    near(lead.x, headline.x, "the lead and the headline start on one edge", 0.01);
    assert.ok(lead.w <= 544.01);
    await page.close();
  });

  test("the lead's space: space-6 under the headline and space-8 above the buttons from 720; space-4 and space-6 under 720", async () => {
    for (const [width, above, below] of [[1440, 24, 32], [720, 24, 32], [719, 16, 24]]) {
      const page = await open(landing(), { width });
      const h = await box(page, "#hero");
      const lead = await box(page, ".basalt-lead");
      const actions = await box(page, ".basalt-section-actions");
      near(lead.y - h.bottom, above, `the lead is ${above} under the headline at ${width}`, 0.01);
      near(actions.y - lead.bottom, below, `the buttons are ${below} under the lead at ${width}`, 0.01);
      await page.close();
    }
  });

  test("a Lead is a p, takes the props of one, and the Text's lg step is untouched", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div><B.Lead id="l" lang="en">Plain</B.Lead><B.Text size="lg" id="t">Plain</B.Text></div>);`);
    assert.equal(await page.locator("#l").evaluate((el) => el.tagName), "P");
    assert.deepEqual([(await type(page, "#t")).size, (await type(page, "#t")).line], [18, 26]);
    await page.close();
  });
});

describe("the page row and the sections", () => {
  // item 137 C
  for (const width of [1440, 1024, 390]) {
    test(`the page row is the site header's row at ${width}: the same left edge and width, the gutter inside, so a headline starts under the brand`, async () => {
      const page = await open(landing(), { width });
      const bar = await box(page, ".basalt-site-bar");
      const row = await box(page, "#foot");
      near(row.x, bar.x, "the footer's row starts where the bar's does", 0.01);
      near(row.w, bar.w, "and is as wide", 0.01);
      const gutter = width < 720 ? 16 : 24;
      const hero = await box(page, "#hero");
      const brand = await box(page, ".basalt-site-brand-mark");
      near(hero.x, row.x + gutter, "the hero's first letter is the gutter in", 0.01);
      near(hero.x, brand.x, "and lines up with the brand's mark", 0.5);
      assert.equal(await css(page, ".basalt-page-section", "maxWidth"), "1152px");
      await page.close();
    });
  }

  test("the row is the same row for a first screen: a hero section is as wide and starts at the same x as every other section", async () => {
    const page = await open(landing(), { width: 1440 });
    const xs = await page.locator(".basalt-page-section").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.width]; }));
    assert.deepEqual(new Set(xs.map(String)).size, 1);
    await page.close();
  });

  for (const [width, gap] of [[1440, 128], [1024, 128], [1023, 96], [720, 96], [719, 64], [390, 64], [320, 64]]) {
    test(`at ${width} sections are ${gap} apart, the first starts ${gap / 2} below the bar, a head is ${gap / 2} above its body and the page ends ${gap} above the footer`, async () => {
      const page = await open(landing(), { width });
      const sections = await page.locator(".basalt-page-section").evaluateAll((els) => els.map((el) => { const c = getComputedStyle(el); return { top: parseFloat(c.paddingTop), rect: el.getBoundingClientRect().toJSON() }; }));
      assert.deepEqual(sections.map((s) => s.top), [gap / 2, gap, gap], "the first section's top space is half a gap, the others a gap");
      // the empty band between one section's content and the next one's headline is one gap
      const firstEnd = await page.locator(".basalt-page-section").nth(0).evaluate((el) => el.querySelector(".basalt-section-intro").getBoundingClientRect().bottom);
      const secondHead = await box(page, "#kinds");
      near(secondHead.y - firstEnd, gap, "one gap between the first section's last line and the next headline", 0.01);
      const bar = await box(page, ".basalt-site-header");
      const hero = await box(page, "#hero");
      near(hero.y - bar.bottom, gap / 2, "the hero starts half a gap below the bar (the headline's own line box begins at the line)", 0.01);
      const head = await box(page, ".basalt-page-section:nth-child(2) .basalt-section-intro");
      const body = await box(page, ".basalt-page-section:nth-child(2) .basalt-columns");
      near(body.y - head.bottom, gap / 2, "half a gap from the head to the body", 0.01);
      const last = await box(page, ".basalt-page-section:last-child .basalt-columns");
      const foot = await box(page, "#foot");
      near(foot.y - last.bottom, gap, "a full gap above the footer", 0.01);
      await page.close();
    });
  }

  test("no section is given the window's height: the page is exactly as tall at 500, 900 and 1600 high (0px), and no rule sizes a section from vh or svh", async () => {
    const heights = [];
    for (const height of [500, 900, 1600]) {
      const page = await open(landing(), { width: 1440, height });
      // the page's own end (the footer's bottom), since the document is never shorter than the window
      heights.push(await page.evaluate(() => document.getElementById("foot").getBoundingClientRect().bottom + scrollY));
      await page.close();
    }
    assert.deepEqual([heights[0] - heights[1], heights[2] - heights[1]], [0, 0]);
    const components = fs.readFileSync(path.join(pkg, "dist", "components.css"), "utf8");
    const rules = [...components.matchAll(/\.basalt-page-(?:sections|section|row)[^{]*\{[^}]*\}|\.basalt-section-[a-z]+[^{]*\{[^}]*\}/g)].map((m) => m[0]).join("\n");
    assert.ok(rules.length > 300);
    assert.doesNotMatch(rules, /\d(?:vh|svh|dvh|lvh)\b|min-height|(?<![-\w])height\s*:/);
  });

  test("the widest empty band on the sample page is one section gap at every width, and the next section's headline shows on the first screen at 1440x900, 1280x720 and 390x844", async () => {
    for (const [width, height, gap] of [[1440, 900, 128], [1280, 720, 128], [390, 844, 64]]) {
      const page = await open(landing(), { width, height });
      const bands = await page.evaluate(() => {
        const sections = [...document.querySelectorAll(".basalt-page-section")];
        const out = [];
        for (let i = 1; i < sections.length; i++) out.push(sections[i].querySelector("h2").getBoundingClientRect().top - sections[i - 1].lastElementChild.getBoundingClientRect().bottom);
        return out;
      });
      for (const b of bands) assert.ok(b <= gap + 0.01 + (width === 1440 || width === 1280 ? 0 : 0), `a band of ${b} is no more than one gap (${gap})`);
      // the first line of the next section's headline is on the first screen
      const head = await box(page, "#kinds");
      assert.ok(head.y + parseFloat(await css(page, "#kinds", "lineHeight")) <= height, `the next headline's first line (${head.y}) is on a ${height} high window`);
      await page.close();
    }
  });

  test("PageSections is a main by default and a div when asked; PageRow takes footer, header and nav; a PageSection is a section", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>
      <B.PageSections id="a"><B.PageSection id="s">x</B.PageSection></B.PageSections><B.PageSections as="div" id="b">y</B.PageSections>
      <B.PageRow id="r1">x</B.PageRow><B.PageRow as="footer" id="r2">x</B.PageRow><B.PageRow as="header" id="r3">x</B.PageRow><B.PageRow as="nav" id="r4" aria-label="n">x</B.PageRow></div>);`);
    const tags = await page.evaluate(() => ["a", "s", "b", "r1", "r2", "r3", "r4"].map((id) => document.getElementById(id).tagName));
    assert.deepEqual(tags, ["MAIN", "SECTION", "DIV", "DIV", "FOOTER", "HEADER", "NAV"]);
    await page.close();
  });
});

describe("columns", () => {
  // item 137 C: twelve tracks, the gutter as the column gap, space-8 the row gap, seven layouts, an item's span, three bands
  const columns = (layout, n, extra = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns layout="${layout}" id="c">${cells(n)}${extra}</B.Columns></B.PageRow>);`;
  const spans = (page) => page.locator("#c > *").evaluateAll((els) => { const g = els[0].parentElement.getBoundingClientRect(); const row = []; for (const el of els) { const r = el.getBoundingClientRect(); row.push({ x: Math.round((r.x - g.x) * 100) / 100, y: Math.round(r.y * 100) / 100, w: Math.round(r.width * 100) / 100 }); } return row; });
  /** The widths in tracks for a grid of the given content width and gap: n tracks and n-1 gaps. */
  const wide = (content, gutter, n) => { const track = (content - 11 * gutter) / 12; return Math.round((track * n + gutter * (n - 1)) * 100) / 100; };

  test("twelve tracks on the row, the gutter between them and space-8 between rows", async () => {
    const page = await open(columns("3", 6), { width: 1440 });
    const s = await page.locator("#c").evaluate((el) => { const c = getComputedStyle(el); return { cols: c.gridTemplateColumns.split(" ").length, gap: c.columnGap, row: c.rowGap, width: el.getBoundingClientRect().width }; });
    assert.deepEqual([s.cols, s.gap, s.row, s.width], [12, "24px", "32px", 1104]);
    await page.setViewportSize({ width: 390, height: 900 });
    assert.equal(await css(page, "#c", "columnGap"), "16px", "the gutter is 16 under 720");
    await page.close();
  });

  for (const [width, content, gutter] of [[1440, 1104, 24], [1024, 976, 24]]) {
    test(`at ${width} (large) layouts 2, 3 and 4 are 6, 4 and 3 tracks each, and the uneven splits are 7+5, 5+7, 8+4 and 4+8`, async () => {
      const page = await open(columns("2", 2), { width });
      const expect = { "2": [6, 6], "3": [4, 4, 4], "4": [3, 3, 3, 3], "7-5": [7, 5], "5-7": [5, 7], "8-4": [8, 4], "4-8": [4, 8] };
      for (const [layout, tracks] of Object.entries(expect)) {
        await page.evaluate(({ layout, n }) => { const el = document.getElementById("c"); el.dataset.layout = layout; while (el.children.length > n) el.lastElementChild.remove(); while (el.children.length < n) { const d = document.createElement("div"); d.textContent = "x"; el.append(d); } }, { layout, n: tracks.length });
        const got = await spans(page);
        got.forEach((g, i) => near(g.w, wide(content, gutter, tracks[i]), `${layout} item ${i + 1} at ${width}`, 0.02));
        assert.equal(new Set(got.map((g) => g.y)).size, 1, `${layout} is one row at ${width}`);
      }
      await page.close();
    });
  }

  test("from 720 to 1023 layouts 2 and 3 hold, 4 becomes two rows of two, and the uneven splits stack: each one really, at 720, 800 and 1023", async () => {
    for (const width of [720, 800, 1023]) {
      const page = await open(columns("2", 2), { width });
      const content = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
      const set = async (layout, n) => { await page.evaluate(({ layout, n }) => { const el = document.getElementById("c"); el.dataset.layout = layout; while (el.children.length > n) el.lastElementChild.remove(); while (el.children.length < n) { const d = document.createElement("div"); d.textContent = "x"; el.append(d); } }, { layout, n }); return spans(page); };
      assert.equal(new Set((await set("2", 2)).map((g) => g.y)).size, 1, `2 holds at ${width}`);
      assert.equal(new Set((await set("3", 3)).map((g) => g.y)).size, 1, `3 holds at ${width}`);
      const four = await set("4", 4);
      assert.deepEqual([...new Set(four.map((g) => g.y))].length, 2, `4 is two rows at ${width}`);
      four.forEach((g, i) => near(g.w, wide(content, 24, 6), `4 item ${i + 1} is 6 tracks wide at ${width}`, 0.02));
      for (const layout of ["7-5", "5-7", "8-4", "4-8"]) {
        const split = await set(layout, 2);
        assert.equal(split[0].w, content, `${layout} item 1 takes the whole row at ${width}`);
        assert.equal(split[1].w, content, `${layout} item 2 takes the whole row at ${width}`);
        assert.ok(split[1].y > split[0].y, `${layout} stacks at ${width}`);
      }
      await page.close();
    }
  });

  test("under 720 every item takes the full row in source order, whatever the layout and whatever its own span", async () => {
    for (const layout of ["2", "3", "4", "7-5", "5-7", "8-4", "4-8"]) {
      const page = await open(columns(layout, 3, `<B.ColumnsItem span={7}>Own span</B.ColumnsItem>`), { width: 390 });
      const got = await spans(page);
      assert.equal(new Set(got.map((g) => g.w)).size, 1, `${layout}: one width`);
      assert.deepEqual(got.map((g) => g.y), [...got.map((g) => g.y)].sort((a, b) => a - b), `${layout}: source order`);
      assert.equal(got[0].w, 358);
      await page.close();
    }
  });

  // amended decision 2 (DECISIONS 144): an item's own span holds from 1024 only; from 720 to 1023 the layout decides; under 720 one column
  const own = (layout, items) => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns${layout ? ` layout="${layout}"` : ""} id="c">${items}</B.Columns></B.PageRow>);`;
  test("an item's own span holds from 1024: 7 + 5 share a row at 1024 and 1440, and an over-large span is clamped to 12", async () => {
    for (const [width, content] of [[1440, 1104], [1024, 976]]) {
      const page = await open(own("", `<B.ColumnsItem span={7}>a</B.ColumnsItem><B.ColumnsItem span={5}>b</B.ColumnsItem><B.ColumnsItem span={99}>c</B.ColumnsItem>`), { width });
      const got = await spans(page);
      [wide(content, 24, 7), wide(content, 24, 5), content].forEach((w, i) => near(got[i].w, w, `item ${i + 1} at ${width}`, 0.02));
      assert.equal(got[0].y, got[1].y, "7 and 5 share a row");
      await page.close();
    }
  });

  test("from 720 to 1023 an item's own span does not hold: an unnamed layout's items are full rows, and a layout's own rule decides (2 holds at 6 whatever the item says)", async () => {
    for (const width of [720, 800, 1023]) {
      const page = await open(own("", `<B.ColumnsItem span={7}>a</B.ColumnsItem><B.ColumnsItem span={5}>b</B.ColumnsItem>`), { width });
      const content = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
      const got = await spans(page);
      assert.deepEqual(got.map((g) => g.w), [content, content], `unnamed at ${width}`);
      assert.ok(got[1].y > got[0].y, `stacked at ${width}`);
      await page.close();
      const two = await open(own("2", `<B.ColumnsItem span={8}>a</B.ColumnsItem><B.ColumnsItem span={4}>b</B.ColumnsItem>`), { width });
      const held = await spans(two);
      held.forEach((g) => near(g.w, wide(content, 24, 6), `layout 2 item at ${width}`, 0.02));
      assert.equal(held[0].y, held[1].y);
      await two.close();
    }
  });

  test("under 720 an item's own span does not hold: one column", async () => {
    const page = await open(own("", `<B.ColumnsItem span={7}>a</B.ColumnsItem><B.ColumnsItem span={5}>b</B.ColumnsItem>`), { width: 390 });
    assert.deepEqual((await spans(page)).map((g) => g.w), [358, 358]);
    await page.close();
  });

  // amended defect A: --span and --_ls are custom properties and inherit, so a grid nested in an item must not read the outer grid's values
  test("a nested grid does not inherit the outer grid's span: a layout 3 inside a span of 8 is three across at 4 tracks each, at 1440", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns id="outer"><B.ColumnsItem span={8}><B.Columns layout="3" id="c">${cells(3)}</B.Columns></B.ColumnsItem></B.Columns></B.PageRow>);`, { width: 1440 });
    const got = await spans(page);
    const inner = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
    assert.equal(new Set(got.map((g) => g.y)).size, 1, "three across");
    got.forEach((g) => near(g.w, (inner - 11 * 24) / 12 * 4 + 24 * 3, "4 tracks of the inner grid", 0.02));
    await page.close();
  });

  test("a nested grid with no layout inside a layout-2 item gives its items full rows, at 1440 and at 800", async () => {
    for (const width of [1440, 800]) {
      const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns layout="2"><div><B.Columns id="c">${cells(2)}</B.Columns></div><div>b</div></B.Columns></B.PageRow>);`, { width });
      const inner = await page.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
      assert.deepEqual((await spans(page)).map((g) => g.w), [inner, inner], `${width}`);
      await page.close();
    }
  });

  test("a nested 7-5 inside a layout-2 item stacks at 800 (the layout decides there) and splits 7 + 5 at 1440", async () => {
    const fixture = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns layout="2"><div><B.Columns layout="7-5" id="c"><div style={{ height: 40 }}>a</div><div style={{ height: 40 }}>b</div></B.Columns></div><div>x</div></B.Columns></B.PageRow>);`;
    const narrow = await open(fixture, { width: 800 });
    const inner = await narrow.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
    const stacked = await spans(narrow);
    assert.deepEqual(stacked.map((g) => g.w), [inner, inner]);
    assert.ok(stacked[1].y > stacked[0].y);
    await narrow.close();
    const wideWindow = await open(fixture, { width: 1440 });
    const split = await spans(wideWindow);
    assert.equal(split[0].y, split[1].y);
    const innerWide = await wideWindow.locator("#c").evaluate((el) => el.getBoundingClientRect().width);
    near(split[0].w, wide(innerWide, 24, 7), "7 tracks of the inner grid", 0.02);
    near(split[1].w, wide(innerWide, 24, 5), "5 tracks of the inner grid", 0.02);
    await wideWindow.close();
  });

  // amended decision 1 (DECISIONS 144): a development warning, the heading drawn as written, nothing in a production bundle
  describe("a display heading in a span under 7", () => {
    const devPage = async (body, { width = 1440 } = {}) => {
      const result = await esbuild.build({ stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import * as B from "./dist/index.js"; ${body}`, resolveDir: pkg, loader: "tsx" }, bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"development"' } });
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const warnings = [];
      page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
      page.on("pageerror", (e) => warnings.push(`PAGE ERROR ${e.message}`));
      await page.setContent(`<html data-theme="dark"><head><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")}</style></head><body><div id="root"></div></body></html>`);
      await page.addScriptTag({ content: result.outputFiles[0].text });
      await settle(page);
      return { page, warnings };
    };
    const grid = (item) => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns>${item}</B.Columns></B.PageRow>);`;

    test("warns once in development, in one plain sentence that says what is wrong and what to do, and draws the heading as written (72 at 1440)", async () => {
      const { page, warnings } = await devPage(grid(`<B.ColumnsItem span={5}><B.Heading id="h" level={2} size="display">Responsibility</B.Heading></B.ColumnsItem><B.ColumnsItem span={5}><B.Heading size="display">Again</B.Heading></B.ColumnsItem>`));
      assert.deepEqual(warnings, ["Basalt ColumnsItem: a display heading in a span of 5 of 12 columns breaks words; give it a span of 7 or more, or set it at 5xl or smaller."]);
      assert.equal((await type(page, "#h")).size, 72, "drawn as written, not stepped down by its column");
      await page.close();
    });

    test("it sees a hero, a fixed 6xl or 7xl, and a heading one element down; and nothing else warns: span 7, 5xl, no span, plain text", async () => {
      const cases = [
        [`<B.ColumnsItem span={4}><B.Heading size="hero" level={1}>Plain</B.Heading></B.ColumnsItem>`, 1],
        [`<B.ColumnsItem span={4}><B.Heading size="7xl">Plain</B.Heading></B.ColumnsItem>`, 1],
        [`<B.ColumnsItem span={6}><div><B.Heading size="6xl">Plain</B.Heading></div></B.ColumnsItem>`, 1],
        [`<B.ColumnsItem span={7}><B.Heading size="display">Plain</B.Heading></B.ColumnsItem>`, 0],
        [`<B.ColumnsItem span={5}><B.Heading size="5xl">Plain</B.Heading></B.ColumnsItem>`, 0],
        [`<B.ColumnsItem><B.Heading size="display">Plain</B.Heading></B.ColumnsItem>`, 0],
        [`<B.ColumnsItem span={5}><B.Text>Plain</B.Text></B.ColumnsItem>`, 0],
      ];
      for (const [item, count] of cases) {
        const { page, warnings } = await devPage(grid(item));
        assert.equal(warnings.length, count, `${item}: ${warnings.join(" | ")}`);
        await page.close();
      }
    });

    test("it costs a production bundle nothing, for ColumnsItem and for Columns: no warning string, no console call, and fewer bytes than the development bundle", async () => {
      for (const name of ["ColumnsItem", "Columns"]) {
        const bundle = async (env) => (await esbuild.build({ stdin: { contents: `import { ${name} } from "./dist/index.js"; console.log(${name});`, resolveDir: pkg, loader: "js" }, bundle: true, minify: true, format: "esm", write: false, external: ["react", "react-dom", "react/jsx-runtime"], logLevel: "silent", define: { "process.env.NODE_ENV": JSON.stringify(env) } })).outputFiles[0].text;
        const dev = await bundle("development");
        const production = await bundle("production");
        assert.match(dev, /breaks words/, `${name}: the development bundle has the warning`);
        assert.doesNotMatch(production, /breaks words|warn|display|hero/, `${name}: the production bundle has no warning code or string`);
        assert.ok(production.length < dev.length - 300, `${name}: production ${production.length} bytes, development ${dev.length}`);
      }
    });

    // A named layout makes a narrow column from 1024 with no span written anywhere: Columns warns for the items that layout makes under 7 tracks
    const H = (n = 0) => `<div key={${n}}><B.Heading size="display" level={2}>Plain</B.Heading></div>`;
    const named = (layout, n) => grid(`__${layout}__${Array.from({ length: n }, (_, i) => H(i)).join("")}`).replace(`<B.Columns>__${layout}__`, `<B.Columns layout="${layout}">`);
    const sentence = (tracks) => `Basalt ColumnsItem: a display heading in a span of ${tracks} of 12 columns breaks words; give it a span of 7 or more, or set it at 5xl or smaller.`;

    test("each named layout warns, once for each track count, for the items it makes narrower than 7 tracks, in the same words", async () => {
      const expected = { "2": [6], "3": [4], "4": [3], "7-5": [5], "5-7": [5], "8-4": [4], "4-8": [4] };
      const items = { "2": 2, "3": 3, "4": 4, "7-5": 2, "5-7": 2, "8-4": 2, "4-8": 2 };
      for (const [layout, tracks] of Object.entries(expected)) {
        const { page, warnings } = await devPage(named(layout, items[layout]));
        assert.deepEqual(warnings, tracks.map(sentence), `layout ${layout}`);
        await page.close();
      }
    });

    test("the wide side of an uneven split does not warn: the 7 of 7-5, the 7 of 5-7, the 8 of 8-4 and of 4-8, nor does a layout holding plain text or 5xl", async () => {
      const wideOnly = (layout) => grid("").replace("<B.Columns>", `<B.Columns layout="${layout}">`).replace("</B.Columns>", `<div><B.Text>Plain</B.Text></div>${H(1)}</B.Columns>`);
      // the first item is plain text (narrow or not, it is not a heading), the second holds the display heading
      for (const layout of ["5-7", "4-8"]) {
        const { page, warnings } = await devPage(wideOnly(layout));
        assert.deepEqual(warnings, [], `${layout}: the heading is in the 7 or the 8`);
        await page.close();
      }
      const { page, warnings } = await devPage(grid("").replace("<B.Columns>", '<B.Columns layout="7-5">').replace("</B.Columns>", `${H(0)}<div><B.Text>Plain</B.Text></div></B.Columns>`));
      assert.deepEqual(warnings, [], "7-5: the heading is in the 7");
      await page.close();
      const eight = await devPage(grid("").replace("<B.Columns>", '<B.Columns layout="8-4">').replace("</B.Columns>", `${H(0)}<div><B.Text>Plain</B.Text></div></B.Columns>`));
      assert.deepEqual(eight.warnings, [], "8-4: the heading is in the 8");
      await eight.page.close();
      for (const body of [`<div><B.Text size="md">Plain</B.Text></div><div><B.Text>Plain</B.Text></div>`, `<div><B.Heading size="5xl">Plain</B.Heading></div><div><B.Heading size="5xl">Plain</B.Heading></div>`]) {
        const plain = await devPage(grid("").replace("<B.Columns>", '<B.Columns layout="2">').replace("</B.Columns>", `${body}</B.Columns>`));
        assert.deepEqual(plain.warnings, [], body);
        await plain.page.close();
      }
    });

    test("a layout with an own span: 7 or more where the layout lets it count (from 1024) does not warn; under 7 is the ColumnsItem's one warning, not a second from Columns; a fixed 6xl in a narrow item warns", async () => {
      const own = (span) => grid("").replace("<B.Columns>", '<B.Columns layout="2">').replace("</B.Columns>", `<B.ColumnsItem span={${span}}><B.Heading size="display">Plain</B.Heading></B.ColumnsItem><div><B.Text>Plain</B.Text></div></B.Columns>`);
      const seven = await devPage(own(8));
      assert.deepEqual(seven.warnings, []);
      await seven.page.close();
      const five = await devPage(own(5));
      assert.deepEqual(five.warnings, [sentence(5)], "one warning, from the item that wrote the span");
      await five.page.close();
      const fixed = await devPage(grid("").replace("<B.Columns>", '<B.Columns layout="3">').replace("</B.Columns>", `<div><B.Text as="div" size="6xl">Plain</B.Text></div>`.repeat(3) + "</B.Columns>"));
      assert.deepEqual(fixed.warnings, [sentence(4)]);
      await fixed.page.close();
    });

    test("a warned layout still draws the heading as written (72 at 1440) and it is warned of once however many items are narrow", async () => {
      const { page, warnings } = await devPage(grid("").replace("<B.Columns>", '<B.Columns layout="3">').replace("</B.Columns>", `<div><B.Heading id="h" size="display" level={2}>Plain</B.Heading></div><div><B.Heading size="display">Plain</B.Heading></div><div><B.Heading size="display">Plain</B.Heading></div></B.Columns>`));
      assert.equal(warnings.length, 1);
      assert.equal((await type(page, "#h")).size, 72);
      await page.close();
    });

    test("it is not a module-scope side effect: loading the built page module logs nothing and builds no Set", async () => {
      const source = fs.readFileSync(path.join(pkg, "dist", "page.js"), "utf8") + fs.readFileSync(path.join(pkg, "dist", fs.readdirSync(path.join(pkg, "dist")).find((f) => /^chunk-/.test(f) && fs.readFileSync(path.join(pkg, "dist", f), "utf8").includes("ColumnsItem"))), "utf8");
      assert.doesNotMatch(source, /^(?:var|let|const) \w+ = new (?:Set|Map)/m);
      assert.doesNotMatch(source, /^console\./m);
    });
  });

  test("items stacked in a split are one row gap (space-8, 32px) apart", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.PageRow><B.Columns layout="7-5" id="c"><div style={{ height: 50 }}>a</div><div style={{ height: 50 }}>b</div></B.Columns></B.PageRow>);`, { width: 800 });
    const got = await page.locator("#c > *").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    near(got[1].y - got[0].bottom, 32, "space-8 between stacked rows", 0.01);
    await page.close();
  });
});

describe("a page of these parts, in both themes and at both ends", () => {
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`axe finds nothing at ${width} in ${theme}, and nothing scrolls sideways or passes its row`, async () => {
        const page = await open(landing(), { width, theme });
        assert.deepEqual(await axe(page), []);
        const o = await overflow(page);
        assert.deepEqual([o.scrollsSideways, o.pastRow], [false, []]);
        assert.deepEqual(await brokenWords(page, ".basalt-heading, .basalt-lead"), [], "no word is broken across lines");
        assert.deepEqual(page.errors, []);
        await page.close();
      });
    }
  }

  test("the roles' ink is primary on the page and the lead's is secondary, so the pairs are the ones the contrast tests already prove", async () => {
    const page = await open(landing(), { width: 1440, theme: "light" });
    const ink = await page.evaluate(() => { const probe = (c) => { const p = document.createElement("p"); p.style.color = c; document.body.append(p); return getComputedStyle(p).color; }; return { primary: probe("var(--basalt-text-primary)"), secondary: probe("var(--basalt-text-secondary)") }; });
    assert.equal(await css(page, "#hero", "color"), ink.primary);
    assert.equal(await css(page, "#kinds", "color"), ink.primary);
    assert.equal(await css(page, ".basalt-lead", "color"), ink.secondary);
    await page.close();
  });

  test("forced colours: the headline and the lead are the system's text colour, and the page is the system's canvas", async () => {
    const page = await open(landing(), { width: 1440, colorScheme: "dark", forcedColors: "active" });
    const want = await page.evaluate(() => { const p = document.createElement("p"); p.style.color = "CanvasText"; document.body.append(p); return getComputedStyle(p).color; });
    for (const selector of ["#hero", "#kinds", ".basalt-lead", "h2"]) assert.equal(await css(page, selector, "color"), want, selector);
    assert.deepEqual(await axe(page), []);
    await page.close();
  });

  test("reduced motion: these parts have no transition and no animation to begin with, so the render is the same", async () => {
    for (const reduced of ["no-preference", "reduce"]) {
      const page = await open(landing(), { width: 1440, reducedMotion: reduced });
      const motion = await page.evaluate(() => [...document.querySelectorAll(".basalt-heading, .basalt-lead, .basalt-page-sections, .basalt-page-section, .basalt-section-intro, .basalt-section-actions, .basalt-columns, .basalt-page-row")].map((el) => { const s = getComputedStyle(el); return [s.transitionDuration, s.animationName]; }));
      for (const [transition, animation] of motion) assert.deepEqual([transition, animation], ["0s", "none"], reduced);
      await page.close();
    }
  });

  test("switching the theme moves nothing: the page is the same height and every headline in the same place (0px)", async () => {
    const page = await open(landing(), { width: 1440, theme: "dark" });
    const read = () => page.evaluate(() => [document.documentElement.scrollHeight, ...[...document.querySelectorAll("h1, h2, .basalt-lead, .basalt-columns")].map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height].join(); })]);
    const before = await read();
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    assert.deepEqual(await read(), before);
    await page.close();
  });

  test("with the root font size at 32px the rem lengths follow it and the px type steps do not move, and nothing passes its row, 1440 and 320 wide", async () => {
    for (const width of [1440, 320]) {
      const page = await open(landing(), { width, height: 800 });
      const before = [(await type(page, "#hero")).size, (await type(page, "#kinds")).size];
      const prose = await page.locator(".basalt-lead").first().evaluate((el) => parseFloat(getComputedStyle(el).maxWidth));
      await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
      assert.deepEqual([(await type(page, "#hero")).size, (await type(page, "#kinds")).size], before, "px steps do not move with the root");
      assert.equal(await page.locator(".basalt-lead").first().evaluate((el) => parseFloat(getComputedStyle(el).maxWidth)), prose * 2, "size-prose-width is rem and doubles");
      const o = await overflow(page);
      assert.deepEqual([o.scrollsSideways, o.pastRow], [false, []], `${width}`);
      await page.close();
    }
  });

  // Chromium has no command for the reader's text-size setting, so the page's text is enlarged the way the setting enlarges it: every element's computed font size,
  // line height and letter spacing doubled (the bar and the controls included), in Geist, with nothing else changed.
  const doubleText = (page) => page.evaluate(() => {
    const rules = [];
    document.querySelectorAll("body *").forEach((el, i) => {
      const s = getComputedStyle(el);
      el.setAttribute("data-z", String(i));
      const letter = s.letterSpacing === "normal" ? "normal" : `${parseFloat(s.letterSpacing) * 2}px`;
      rules.push(`[data-z="${i}"] { font-size: ${parseFloat(s.fontSize) * 2}px !important; line-height: ${s.lineHeight === "normal" ? "normal" : `${parseFloat(s.lineHeight) * 2}px`} !important; letter-spacing: ${letter} !important; }`);
    });
    const style = document.createElement("style");
    style.textContent = rules.join("\n");
    document.head.append(style);
  });

  test("at 200% text, the whole page in Geist (bar and controls included): no word is broken, nothing passes its row and nothing scrolls sideways, at 1440, 768 and 320", async () => {
    for (const width of [1440, 768, 320]) {
      const page = await open(landing(), { width, height: 800 });
      await withGeist(page);
      const hero = (await type(page, "#hero")).size;
      await doubleText(page);
      assert.equal((await type(page, "#hero")).size, hero * 2, "the text really is doubled");
      assert.equal((await type(page, ".basalt-button")).size, 28, "and so is a button's label (14px to 28px)");
      assert.deepEqual(await brokenWords(page, ".basalt-heading, .basalt-lead"), [], `${width}: a broken word`);
      const o = await overflow(page);
      assert.deepEqual([o.scrollsSideways, o.pastRow], [false, []], `${width}`);
      const bar = await page.evaluate(() => { const r = document.querySelector(".basalt-site-header").getBoundingClientRect(); return [r.right, document.documentElement.clientWidth, [...document.querySelectorAll(".basalt-site-header *")].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).length]; });
      assert.ok(bar[0] <= bar[1] + 0.5 && bar[2] === 0, `${width}: the bar and what is in it stay inside the window (${bar.join(", ")})`);
      await page.close();
    }
  });

  test("under WCAG 1.4.12 text spacing, in Geist, no role passes its row and no word is broken, at 1440, 390 and 320", async () => {
    for (const width of [1440, 390, 320]) {
      const page = await open(landing(), { width, height: 800 });
      await withGeist(page);
      await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
      const o = await overflow(page);
      assert.deepEqual([o.scrollsSideways, o.pastRow], [false, []], `${width}`);
      assert.deepEqual(await brokenWords(page, ".basalt-heading, .basalt-lead"), [], `${width}: a broken word`);
      await page.close();
    }
  });

  test("a broken-word counter sees a break that an overflow check cannot: 'Internationalization' at 44px in a 288px row is one", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ width: 288 }}><B.Heading level={1} size="hero">Internationalization</B.Heading></div>);`, { width: 320 });
    await withGeist(page);
    assert.deepEqual(await brokenWords(page, "h1"), ["Internationalization"]);
    assert.equal((await overflow(page)).scrollsSideways, false, "overflow-wrap hides it from an overflow check");
    await page.close();
  });
});

describe("Geist Fallback", () => {
  // item 137 A: one face per weight from local Arial, with size-adjust and metric overrides; font-display swap stays
  test("fonts.css keeps font-display: swap on Geist and Geist Mono and adds three Geist Fallback faces, one per weight, from local Arial (the 600 one from Arial Bold)", () => {
    assert.match(fontsCss, /font-family: "Geist"; src: url\("\.\/fonts\/Geist-Variable\.woff2"\) format\("woff2"\); font-weight: 100 900; font-style: normal; font-display: swap;/);
    assert.match(fontsCss, /font-family: "Geist Mono"; src: url\("\.\/fonts\/GeistMono-Variable\.woff2"\)[^}]*font-display: swap;/);
    const faces = [...fontsCss.matchAll(/@font-face \{ font-family: "Geist Fallback";([^}]*)\}/g)].map((m) => m[1]);
    assert.equal(faces.length, 3);
    const want = [
      [400, 'local("Arial"), local("ArialMT")', "102.4%", "98.1%", "28.8%"],
      [500, 'local("Arial"), local("ArialMT")', "104.7%", "96%", "28.2%"],
      [600, 'local("Arial Bold"), local("Arial-BoldMT")', "99.5%", "101%", "29.6%"],
    ];
    faces.forEach((face, i) => {
      const [weight, src, adjust, ascent, descent] = want[i];
      assert.ok(face.includes(`src: ${src};`), `${weight}: ${src}`);
      assert.ok(face.includes(`font-weight: ${weight};`), `${weight}`);
      assert.ok(face.includes(`size-adjust: ${adjust};`) && face.includes(`ascent-override: ${ascent};`) && face.includes(`descent-override: ${descent};`) && face.includes("line-gap-override: 0%;"), `${weight}: the overrides`);
      assert.ok(!face.includes("url("), "a local face only: nothing to download");
    });
  });

  test("the overrides are Geist's own ascent and descent divided by the face's size-adjust, so a baseline sits where Geist's will", async () => {
    const page = await browser.newPage();
    await page.setContent("<html></html>");
    const metrics = await page.evaluate(async (base64) => {
      const font = new FontFace("G", `url(data:font/woff2;base64,${base64})`, { weight: "100 900" });
      await font.load();
      document.fonts.add(font);
      const c = document.createElement("canvas").getContext("2d");
      c.font = "600 1000px G";
      const m = c.measureText("Hxg");
      return { ascent: m.fontBoundingBoxAscent / 1000, descent: m.fontBoundingBoxDescent / 1000 };
    }, geistBase64);
    near(metrics.ascent, 1.005, "Geist's ascent", 0.0005);
    near(metrics.descent, 0.295, "Geist's descent", 0.0005);
    for (const [adjust, ascent, descent] of [[1.024, 0.981, 0.288], [1.047, 0.96, 0.282], [0.995, 1.01, 0.296]]) {
      near(metrics.ascent / adjust, ascent, "ascent override", 0.0006);
      near(metrics.descent / adjust, descent, "descent override", 0.0006);
    }
    await page.close();
  });

  test("font-family-sans names Geist, then Geist Fallback, then the system chain", () => {
    const tokens = fs.readFileSync(path.join(pkg, "..", "tokens", "dist", "css", "tokens.css"), "utf8");
    assert.match(tokens, /--basalt-font-family-sans: Geist, "Geist Fallback", ui-sans-serif, system-ui, sans-serif;/);
  });

  // The widths, measured on the shipped Geist file against the fallback faces as fonts.css declares them. They need Arial, which a Linux runner usually has
  // not under that name (a local() face matches a font's own name, not fontconfig's alias for it), so the widths are asserted where Arial is installed and the
  // CSS above is asserted everywhere.
  test("each face keeps a line within 1.5% of Geist's width on 40 sentences, at 14, 16 and 96px, where Arial is installed", async (t) => {
    const page = await browser.newPage();
    await page.setContent("<html></html>");
    const result = await page.evaluate(async ({ base64, fonts }) => {
      const style = document.createElement("style");
      style.textContent = fonts.replace(/@font-face \{ font-family: "Geist(?: Mono)?"; src: url[^}]*\}/g, "");
      document.head.append(style);
      const font = new FontFace("GeistShip", `url(data:font/woff2;base64,${base64})`, { weight: "100 900" });
      await font.load();
      document.fonts.add(font);
      const loaded = await Promise.all([400, 500, 600].map((w) => document.fonts.load(`${w} 16px "Geist Fallback"`)));
      if (loaded.some((faces) => faces.length === 0)) return null;
      const words = "plain notes tables sketches book field page reader finds each one where left shared guide pricing settings quarterly figures revised review totals ledger harbour market library keyboard shortcuts command menu view listed".split(" ");
      const sentences = Array.from({ length: 40 }, (_, i) => Array.from({ length: 9 + (i % 5) }, (_, j) => words[(i * 7 + j * 11) % words.length]).join(" "));
      const c = document.createElement("canvas").getContext("2d");
      const width = (family, weight, size, text) => { c.font = `${weight} ${size}px ${family}`; return c.measureText(text).width; };
      const out = {};
      for (const weight of [400, 500, 600]) for (const size of [14, 16, 96]) {
        let g = 0, f = 0; for (const s of sentences) { g += width("GeistShip", weight, size, s); f += width('"Geist Fallback"', weight, size, s); }
        out[`${weight}/${size}`] = f / g;
      }
      return out;
    }, { base64: geistBase64, fonts: fontsCss });
    await page.close();
    if (result === null) { t.diagnostic("Arial is not installed here: the fallback's widths were not measured on this machine"); return; }
    for (const [key, ratio] of Object.entries(result)) assert.ok(Math.abs(ratio - 1) < 0.015, `${key}: the fallback is ${((ratio - 1) * 100).toFixed(2)}% off Geist`);
  });
});
