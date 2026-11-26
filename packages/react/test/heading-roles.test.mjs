// Headings on the page's ladder (cimip-gaps-3 T1, as DECISIONS 386): a part's level prop never sets its size. EmptyState's title is text-base at 500 at
// every level, with titleSize md and lg; LinkCard keeps the display card by default and gains the compact titleSize md and base, with a 16px arrow,
// the foot a step down and a 44px hit area on touch with no change to layout. Chromium, built package, real stylesheet, both themes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const px = (page, expr) => page.evaluate((e) => { const d = document.createElement("div"); d.style.width = e; document.body.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w; }, expr);

// A valid outline for axe: h1, h2, h3, then h4 and h5 headings of the page's own so the level-6 title skips none.
const EMPTY = `createRoot(document.getElementById("root")).render(<main style={{ display: "grid", gap: 16, width: 600, padding: 24 }}>
  <B.EmptyState id="l1" headingLevel={1} title="No saved recipes" description="Recipes you save appear here." />
  <B.EmptyState id="l2" headingLevel={2} title="No saved recipes" description="Recipes you save appear here." />
  <B.EmptyState id="l3" headingLevel={3} title="No saved recipes" description="Recipes you save appear here." />
  <B.Heading level={4} size="sm">Pantry</B.Heading>
  <B.Heading level={5} size="sm">Spices</B.Heading>
  <B.EmptyState id="l6" headingLevel={6} title="No saved recipes" description="Recipes you save appear here." />
  <B.EmptyState id="md" titleSize="md" title="No field notes yet" description="Notes from a survey walk appear here." />
  <B.EmptyState id="lg" titleSize="lg" title="No field notes yet" description="Notes from a survey walk appear here." />
</main>);`;

describe("EmptyState's title", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: 14/20 at 500 at levels 1, 2, 3 and 6; 16/24 and 18/26 by titleSize; the description stays 14/20 at 400`, async () => {
      const { page, errors } = await fixturePage(browser, EMPTY, { theme, viewport: { width: 800, height: 1400 } });
      await settle(page);
      const font = (sel) => page.evaluate((s) => { const t = getComputedStyle(document.querySelector(s)); return [t.fontSize, t.lineHeight, t.fontWeight, t.letterSpacing]; }, sel);
      for (const l of [1, 2, 3, 6]) {
        assert.equal(await page.evaluate((n) => document.querySelector(`#l${n} .basalt-empty-state-title`).tagName, l), `H${l}`);
        assert.deepEqual((await font(`#l${l} .basalt-empty-state-title`)).slice(0, 3), ["14px", "20px", "500"], `level ${l} sets no size`);
      }
      assert.deepEqual((await font("#md .basalt-empty-state-title")).slice(0, 3), ["16px", "24px", "500"]);
      assert.deepEqual((await font("#lg .basalt-empty-state-title")).slice(0, 3), ["18px", "26px", "500"]);
      assert.deepEqual((await font("#l2 .basalt-empty-state-description")).slice(0, 3), ["14px", "20px", "400"]);
      assert.deepEqual(await axe(page), []);
      assert.deepEqual(errors, []);
    });
  }
});

const MEDIA = `<svg viewBox="0 0 320 160" aria-hidden="true" style={{ display: "block", width: "100%" }}><rect width="320" height="160" fill="var(--basalt-surface-sunken)" /></svg>`;
// A valid outline for axe: the page's h1 and a section's h2 above the cards' h3 titles.
const CARDS = `createRoot(document.getElementById("root")).render(<main style={{ display: "grid", gap: 24, width: "min(560px, 100%)", padding: 16, boxSizing: "border-box" }}>
  <B.Heading level={1} size="lg">Studio</B.Heading>
  <B.Heading level={2} size="md">Shortcuts</B.Heading>
  <B.LinkCard id="plain" href="#a" title="Tide atlas" description="Charts for every harbour." state="2026" />
  <B.LinkCard id="display" titleSize="display" href="#a" title="Tide atlas" description="Charts for every harbour." state="2026" />
  <B.LinkCard id="md" titleSize="md" href="#b" title="Field notes" description="The survey's walks." state="12" />
  <B.LinkCard id="base" titleSize="base" href="#c" title="Recipes" description="Saved this week." state="4" />
  <B.LinkCard id="md-media" titleSize="md" media={${MEDIA}} href="#d" title="Field notes" description="The survey's walks." />
  <B.LinkCard id="base-media" titleSize="base" media={${MEDIA}} href="#e" title="Recipes" description="Saved this week." />
  <div id="stack" style={{ display: "grid", gap: 4 }}><B.LinkCard id="s1" titleSize="base" href="#s1" title="Birds" /><B.LinkCard id="s2" titleSize="base" href="#s2" title="Moths" /></div>
</main>);`;

const card = (page, sel) => page.evaluate((s) => {
  const c = document.querySelector(s);
  const title = c.querySelector(".basalt-link-card-title");
  const top = c.querySelector(".basalt-link-card-top");
  const arrow = c.querySelector(".basalt-link-card-top > :is(.basalt-go-arrow, .basalt-external)");
  const icon = arrow.querySelector(".basalt-icon").getBoundingClientRect();
  const foot = c.querySelector(".basalt-link-card-foot");
  const t = getComputedStyle(title);
  const f = foot ? getComputedStyle(foot) : null;
  const tr = title.getBoundingClientRect();
  return {
    size: t.fontSize, line: t.lineHeight, weight: t.fontWeight, tracking: t.letterSpacing,
    above: getComputedStyle(top).paddingTop, gap: getComputedStyle(top).columnGap, arrow: icon.width,
    arrowCentre: icon.top + icon.height / 2 - (tr.top + parseFloat(t.lineHeight) / 2),
    footAbove: f?.paddingTop ?? null, footSize: f ? [f.fontSize, f.lineHeight] : null, footGap: f?.columnGap ?? null,
    attr: c.getAttribute("data-title-size"),
  };
}, sel);

describe("LinkCard's title sizes", () => {
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 900, 390]) {
      test(`${theme} at ${width}: display is today's card, to the pixel; md and base match the table`, async () => {
        const { page, errors } = await fixturePage(browser, CARDS, { theme, viewport: { width, height: 1800 } });
        await settle(page);
        // Display: the default and the named form draw the same card, and it is today's (the display role, space-10, 24 or 20, the foot text-md, space-5, space-8).
        const [plain, display] = [await card(page, "#plain"), await card(page, "#display")];
        assert.deepEqual(display, plain);
        assert.equal(plain.attr, null, "data-title-size is written only for md and base");
        assert.equal(plain.size, `${await px(page, "var(--basalt-display-size)")}px`);
        assert.equal(plain.above, `${await px(page, "var(--basalt-space-10)")}px`);
        assert.equal(plain.gap, `${await px(page, "var(--basalt-space-6)")}px`);
        assert.equal(plain.arrow, width < 720 ? 20 : 24);
        assert.deepEqual(plain.footSize, ["16px", "24px"]);
        assert.equal(plain.footAbove, `${await px(page, "var(--basalt-space-5)")}px`);
        const shots = await Promise.all(["#plain", "#display"].map((s) => page.locator(s).screenshot({ animations: "disabled" })));
        assert.ok(shots[0].equals(shots[1]), "display draws the default card's pixels");
        // The compact cards.
        const space = async (n) => `${await px(page, `var(--basalt-space-${n})`)}px`;
        const md = await card(page, "#md");
        assert.deepEqual([md.size, md.line, md.weight, md.tracking], ["16px", "24px", "600", "-0.08px"]);
        assert.equal(md.above, "0px", "no space above with no media");
        assert.equal(md.gap, await space(4));
        assert.equal(md.arrow, 16, "16 at every width");
        assert.ok(Math.abs(md.arrowCentre) < 0.5, "the arrow centred on the title's first line");
        assert.equal(md.footAbove, await space(2));
        assert.deepEqual(md.footSize, ["14px", "20px"]);
        if (width >= 720) assert.equal(md.footGap, await space(4));
        const base = await card(page, "#base");
        assert.deepEqual([base.size, base.line, base.weight], ["14px", "20px", "600"]);
        assert.equal(base.above, "0px");
        assert.equal(base.gap, await space(4));
        assert.equal(base.arrow, 16);
        assert.ok(Math.abs(base.arrowCentre) < 0.5);
        assert.equal(base.footAbove, await space(1));
        assert.deepEqual(base.footSize, ["13px", "18px"]);
        assert.equal((await card(page, "#md-media")).above, await space(4), "space-4 under media");
        assert.equal((await card(page, "#base-media")).above, await space(3), "space-3 under media");
        assert.deepEqual(await axe(page), []);
        assert.deepEqual(errors, []);
        await page.close();
      });
    }
  }

  for (const [label, options] of [["under 720", { viewport: { width: 390, height: 1800 } }], ["on a coarse pointer", { viewport: { width: 1024, height: 1800 }, hasTouch: true, isMobile: true }]]) {
    // Two cards 4px apart (the decided rule for stacked links, foundations' "Links stacked one per line": each card's words are a label painted over every
    // neighbour's box, so a box takes only room no words are in, and a tap on a card's own words is always that card's).
    test(`${label}: a compact card is laid out at its line; across each card's words a tap is that card's, and anywhere in its 44px box it is a link`, async () => {
      const { page } = await fixturePage(browser, CARDS, { theme: "dark", ...options });
      await settle(page);
      const r = await page.evaluate(() => {
        const at = (x, y) => document.elementFromPoint(x, y)?.closest(".basalt-link-card")?.id ?? null;
        const cards = ["s1", "s2"].map((id) => { const card = document.getElementById(id); return { id, box: card.getBoundingClientRect(), words: card.querySelector(".basalt-link-card-title").getBoundingClientRect() }; });
        const gap = cards[1].box.top - cards[0].box.bottom;
        const wrong = [];
        const dead = [];
        for (const [i, c] of cards.entries()) {
          const other = cards[1 - i];
          // Across the words: every column and row of the title's own box, 1px inside its edges.
          for (let x = c.words.left + 1; x < c.words.right - 1; x += 6) for (const y of [c.words.top + 1, c.words.top + c.words.height / 2, c.words.bottom - 1]) if (at(x, y) !== c.id) wrong.push([c.id, Math.round(x), Math.round(y), at(x, y)]);
          // The card's own 44px box, centred on it: wherever it is outside the other card's words, a tap lands on a link.
          const mid = c.box.top + c.box.height / 2;
          for (let y = mid - 21; y <= mid + 21; y += 3) for (const x of [c.words.left + 2, c.box.left + c.box.width / 2, c.box.right - 2]) {
            const inOther = x >= other.words.left && x <= other.words.right && y >= other.words.top && y <= other.words.bottom;
            if (!inOther && !at(x, y)) dead.push([c.id, Math.round(x), Math.round(y)]);
          }
        }
        return { heights: cards.map((c) => c.box.height), gap, wrong, dead };
      });
      assert.deepEqual(r.heights, [20, 20], "the layout is the title's line: no change to layout");
      assert.equal(r.gap, 4, "the two cards are 4px apart");
      assert.deepEqual(r.wrong, [], "a tap on a card's words is always that card's");
      assert.deepEqual(r.dead, [], "no dead tap inside a card's 44px box");
      await page.close();
    });
  }
});
