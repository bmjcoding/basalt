// What the SRA Syndicate hero decided (hero-nov11, hero-srasyndicate; DECISIONS 113), on sites/srasyndicate/index.body.html. The shared
// checks in pages.test.mjs already run on this page (build, no network, axe, no sideways scroll, touch targets, forced colours, print,
// the byte-for-byte brand files); this file is only what the design decided: the mark's size and whole pixels, the line, the peek, the
// centred ink, the entrance, forced colours, print and no colour. Behaviour tests load no web font beyond the Geist the page inlines,
// so text widths differ a little on CI's Linux runner: the measured margins are wider than a fallback font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage, launch, openHtml, repoRoot, settled, sitesDir } from "./support.mjs";

let browser;
let html;
before(async () => {
  browser = await launch();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-sra-"));
  html = buildPage(path.join(sitesDir, "srasyndicate", "index.body.html"), { outFile: path.join(out, "index.html"), siteDir: path.join(sitesDir, "srasyndicate") }).html;
});
after(async () => { await browser?.close(); });

/** The path Datum ships with, as brand/sra-syndicate/hero.html draws it. */
const SHIPPED = /<path[^>]*\sd="([^"]+)"/.exec(fs.readFileSync(path.join(repoRoot, "brand", "sra-syndicate", "hero.html"), "utf8"))[1];
const SCREENS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 2560, height: 1440 }];
const whole = (v) => Math.abs(v - Math.round(v)) < 0.001;

/** Every number the design is measured by, in one read. */
const measure = (page) => page.evaluate(() => {
  const rect = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
  const lines = (selector) => { const el = document.querySelector(selector); return Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)); };
  const sentences = [...document.querySelectorAll(".hero-line > span")].map((el) => ({ lines: lines(`.hero-line > span:nth-child(${[...el.parentElement.children].indexOf(el) + 1})`), right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left }));
  return {
    viewport: { width: innerWidth, height: innerHeight },
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    bar: rect("header.basalt-site-header"),
    hero: rect(".hero"),
    mark: rect(".hero-mark"),
    line: rect(".hero-line"),
    what: rect(".hero-what"),
    rule: rect(".name-head"),
    label: rect(".name-head .eyebrow"),
    title: rect(".name-title"),
    lede: rect(".name-lede"),
    row: rect(".name .layout-row"),
    text: document.querySelector(".hero-line").textContent,
    sentences,
    whatLines: lines(".hero-what"),
    lineSize: getComputedStyle(document.querySelector(".hero-line")).fontSize,
  };
});

describe("the mark", () => {
  for (const { width, height } of [...SCREENS, { width: 720, height: 800 }, { width: 719, height: 800 }]) {
    test(`at ${width} by ${height} it is ${width >= 720 ? 288 : 192} wide`, async () => {
      const { page, context, errors } = await openHtml(browser, html, { width, height });
      const m = await measure(page);
      assert.equal(m.mark.width, width >= 720 ? 288 : 192);
      assert.equal(m.mark.height, m.mark.width, "it is square");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  for (const { width, height } of [...SCREENS, { width: 1441, height: 901 }, { width: 391, height: 845 }]) {
    test(`at ${width} by ${height} it sits on whole pixels`, async () => {
      const { page, context } = await openHtml(browser, html, { width, height });
      const { mark } = await measure(page);
      assert.ok(whole(mark.x) && whole(mark.y), `the mark is at ${mark.x}, ${mark.y}`);
      await context.close();
    });
  }

  test("it is the file in brand/, played by the brand's player, with no lockup in the hero", async () => {
    const { page, context } = await openHtml(browser, html);
    assert.equal(await page.locator(".hero svg").count(), 1, "one drawing in the hero: the mark");
    assert.equal(await page.locator(".hero-mark").getAttribute("aria-label"), "Datum, the SRA Syndicate mark");
    assert.equal(await page.locator(".hero-mark").getAttribute("data-motion"), "datum");
    assert.ok(html.indexOf("var LogoGeo") < html.indexOf("LogoMotion.arm("), "the player loads before the hero arms it");
    await context.close();
  });
});

describe("the line", () => {
  test("it is the h1, and reads with a space between its two sentences", async () => {
    const { page, context } = await openHtml(browser, html);
    assert.equal(await page.locator("h1").count(), 1, "one h1");
    assert.equal(await page.locator("h1").evaluate((el) => el.textContent), "Built to Adapt. Engineered to Endure.");
    assert.equal(await page.locator("h1").evaluate((el) => el.id === "hero-line" && el.closest("main") !== null), true);
    await context.close();
  });

  for (const { width, height } of [SCREENS[0], SCREENS[1]]) {
    test(`at ${width} each sentence is one line, at ${width >= 720 ? "text-5xl (56/60)" : "text-3xl (30/36)"}`, async () => {
      const { page, context } = await openHtml(browser, html, { width, height });
      const m = await measure(page);
      assert.equal(m.lineSize, width >= 720 ? "56px" : "30px");
      assert.deepEqual(m.sentences.map((s) => s.lines), [1, 1]);
      assert.equal(m.line.height, width >= 720 ? 120 : 72, "two lines, 60 or 36 each");
      // the longer sentence fits the row with room to spare, so a fallback font does not wrap it
      assert.ok(m.sentences[1].right - m.sentences[1].left < m.viewport.width - 2 * 16 - 24, "the longer sentence is narrower than the row");
      await context.close();
    });
  }

  for (const width of [320, 280]) {
    test(`at ${width} the line wraps, balanced, inside the row, and the page does not scroll sideways`, async () => {
      const { page, context } = await openHtml(browser, html, { width, height: 640 });
      const m = await measure(page);
      assert.ok(m.sentences[1].lines >= 2, "the longer sentence wraps");
      const gutter = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-gutter")));
      for (const s of m.sentences) assert.ok(s.left >= gutter - 0.5 && s.right <= m.viewport.width - gutter + 0.5, `a sentence ends at ${s.right}, past the row (${gutter} to ${m.viewport.width - gutter})`);
      assert.ok(m.scrollWidth <= m.viewport.width, `the page is ${m.scrollWidth} wide on a ${m.viewport.width} screen`);
      assert.equal(await page.locator(".hero-line").evaluate((el) => getComputedStyle(el).textWrap.includes("balance")), true, "balanced");
      await context.close();
    });
  }

  test("the sentence is text-lg in secondary ink, centred, balanced, at most the prose width", async () => {
    for (const { width, height } of [SCREENS[0], SCREENS[1]]) {
      const { page, context } = await openHtml(browser, html, { width, height });
      const style = await page.locator(".hero-what").evaluate((el) => {
        const s = getComputedStyle(el);
        const probe = document.createElement("span");
        probe.style.color = "var(--basalt-text-secondary)";
        document.body.append(probe);
        const secondary = getComputedStyle(probe).color;
        probe.remove();
        return { size: s.fontSize, line: s.lineHeight, color: s.color, secondary, align: getComputedStyle(el.parentElement).textAlign, wrap: s.textWrap, max: s.maxWidth, width: el.getBoundingClientRect().width, prose: getComputedStyle(document.documentElement).getPropertyValue("--basalt-size-prose-width").trim(), proseWidth: (() => { const ruler = document.createElement("div"); ruler.style.width = "var(--basalt-size-prose-width)"; document.body.append(ruler); const w = ruler.getBoundingClientRect().width; ruler.remove(); return w; })() };
      });
      assert.equal(style.size, "18px");
      assert.equal(style.line, "26px");
      assert.equal(style.color, style.secondary);
      assert.equal(style.align, "center");
      assert.ok(style.wrap.includes("balance"));
      assert.ok(style.width <= style.proseWidth + 0.5, `${style.width} is wider than ${style.prose}`);
      assert.equal(await page.locator(".hero-what").innerText(), "A vehicle for side projects, consulting, and building AI-native products.");
      await context.close();
    }
  });

  test("nothing else is in the first screen: no button, no link, no status", async () => {
    const { page, context } = await openHtml(browser, html);
    assert.equal(await page.locator(".hero a, .hero button, .hero input, .hero .status, .hero .badge").count(), 0);
    assert.deepEqual(await page.locator(".hero-group > *").evaluateAll((els) => els.map((el) => el.tagName.toLowerCase())), ["svg", "script", "h1", "p"]);
    await context.close();
  });
});

describe("the header", () => {
  test("the SRA Syndicate lockup, four links, the toggle, no primary button and no current page", async () => {
    const { page, context } = await openHtml(browser, html, { width: 1440 });
    const bar = page.locator("header.basalt-chrome");
    assert.equal(await bar.locator(".basalt-site-brand").getAttribute("aria-label"), "SRA Syndicate home");
    assert.deepEqual(await bar.locator("nav a").allInnerTexts(), ["Holding", "Blacksand", "N1", "Contact"]);
    assert.equal(await bar.locator("[aria-current]").count(), 0, "no link is current on this page");
    assert.equal(await bar.locator("[data-theme-toggle]").count(), 1);
    assert.equal(await bar.locator('.btn[data-variant="primary"]').count(), 0, "no primary Button");
    assert.equal(await bar.locator(".basalt-site-action").count(), 0);
    await context.close();
  });

  test("the lockups are the brand files as they are, and their title can't show as a tooltip", async () => {
    const { page, context } = await openHtml(browser, html, { width: 1440 });
    for (const file of ["lockup-header-1x.svg", "lockup-header-2x.svg"]) assert.ok(html.includes(fs.readFileSync(path.join(repoRoot, "brand", "sra-syndicate", file), "utf8")), `${file}, byte for byte`);
    assert.equal(await page.locator("header .basalt-site-brand svg title").count(), 2, "the file's title is kept");
    assert.equal(await page.locator("header .basalt-site-brand svg").evaluateAll((els) => els.every((svg) => svg.parentElement.getAttribute("aria-hidden") === "true" && getComputedStyle(svg.parentElement).pointerEvents === "none" && !svg.hasAttribute("class") && !svg.hasAttribute("aria-hidden"))), true, "a wrapper that is aria-hidden and takes no pointer; the root is untouched");
    const brand = await page.locator("header .basalt-site-brand").boundingBox();
    assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y).closest(".basalt-site-brand") !== null && !document.elementFromPoint(x, y).closest("svg"), { x: brand.x + brand.width / 2, y: brand.y + brand.height / 2 }), true, "the pointer lands on the link, not on the drawing");
    await context.close();
  });

  for (const [dpr, shown] of [[1, "1x"], [2, "2x"]]) {
    for (const forcedColors of ["none", "active"]) {
      test(`at ${dpr}x${forcedColors === "active" ? " in forced colours" : ""} the ${shown} lockup is the one shown`, async () => {
        const { page, context } = await openHtml(browser, html, { width: 1440, deviceScaleFactor: dpr, forcedColors });
        const visible = await page.locator("header .basalt-site-brand .sra-lockup").evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== "none").map((el) => el.getAttribute("data-density")));
        assert.deepEqual(visible, [shown]);
        await context.close();
      });
    }
  }
});

describe("the peek and the centred ink", () => {
  for (const { width, height } of SCREENS) {
    test(`at ${width} by ${height} the next section starts 120px above the fold, and its rule, label and title are whole`, async () => {
      // 390 is a phone: no classic scrollbar, so no reserved gutter narrowing the row (on a desktop window 390 wide the title wraps)
      const { page, context } = await openHtml(browser, html, { width, height, touch: width < 720 });
      const m = await measure(page);
      assert.equal(m.bar.height, 56);
      assert.equal(m.hero.height, height - 56 - 120, "the first screen is the viewport less the bar less 120");
      assert.equal(m.rule.top, height - 120, "the rule is 120px above the fold");
      assert.ok(m.rule.bottom > m.rule.top && m.label.top >= m.rule.top && m.label.bottom <= height, "the label is whole");
      assert.ok(m.title.bottom <= height, `the title ends at ${m.title.bottom}, inside ${height}`);
      assert.ok(m.title.top > m.label.bottom - 1, "after the label");
      assert.ok(m.lede.bottom > height, "the sentence is below the fold");
      assert.ok(m.lede.top >= height - 4, "and starts at the fold");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".name-head")).borderTopWidth), "1px", "a 1px rule");
      await context.close();
    });

    test(`at ${width} by ${height} the ink above and below the group is balanced`, async () => {
      const { page, context } = await openHtml(browser, html, { width, height });
      const m = await measure(page);
      // Datum's ink starts 7/48 of its box down; the group is lifted by half of the padding's difference, so the ink is centred, not the box.
      const above = m.mark.top + (m.mark.height * 7) / 48 - m.bar.bottom;
      const below = m.hero.bottom - m.what.bottom;
      assert.ok(Math.abs(above - below) <= 30, `${above} of air above the ink, ${below} below: more than a sentence's line apart`);
      assert.ok(above > 100 && below > 100, "and it is air, not a squeeze");
      const box = (m.hero.top + m.hero.bottom) / 2;
      const group = (m.mark.top + m.what.bottom) / 2;
      assert.ok(group < box, "the box is lifted, because the mark's box is empty above its ink");
      await context.close();
    });
  }

  test("the first screen's height is a minimum: a short screen pushes the next section down, and a tall one has no cap", async () => {
    const { page, context } = await openHtml(browser, html, { width: 390, height: 480 });
    const m = await measure(page);
    assert.ok(m.hero.height > 480 - 56 - 120, "the content is taller than the minimum");
    assert.ok(m.rule.top > 480 - 120, "so the next section starts lower");
    assert.equal(await page.locator(".hero").evaluate((el) => getComputedStyle(el).maxHeight), "none", "no cap");
    await context.close();
  });
});

describe("the entrance", () => {
  /** Watches the page from before its first script: layout shifts, the boxes of everything in the first screen and the head of the next
      section, and every change of the mark's path. */
  const watch = () => {
    window.__shifts = [];
    // A shift caused by the web font swapping in (the line's text takes its width, then its place) is not the entrance: shifts are counted
    // from two frames after the last font finished loading. (A metric-matched fallback for Geist is on Basalt's backlog.)
    window.__fontsDoneAt = 0;
    document.fonts.addEventListener("loadingdone", () => { window.__fontsDoneAt = performance.now(); });
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__shifts.push({ at: e.startTime, value: e.value }); }).observe({ type: "layout-shift", buffered: true });
    window.__frames = [];
    window.__boxes = [];
    // The mark's own box, exactly; for the rest, where each is (its centre across, its top and its height): the width of a line of text
    // changes once when the web font swaps in, which is not the entrance and moves nothing.
    const box = (selector, exact) => { const r = document.querySelector(selector).getBoundingClientRect(); return exact ? [r.x, r.y, r.width, r.height] : [r.x + r.width / 2, r.y, r.height]; };
    const sample = () => window.__boxes.push({ mark: box(".hero-mark", true), line: box(".hero-line"), what: box(".hero-what"), rule: box(".name-head"), title: box(".name-title") });
    document.addEventListener("DOMContentLoaded", () => {
      const path = document.querySelector(".hero-mark path");
      window.__firstPath = path.getAttribute("d");
      new MutationObserver(() => window.__frames.push(performance.now())).observe(path, { attributes: true, attributeFilter: ["d"] });
      sample();
      const tick = () => { sample(); if (performance.now() < 1500) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  };
  const read = (page) => page.evaluate(() => {
    // moved: any number of a box strays more than half a pixel across all the samples (a text's width settles by a hundredth when the font swaps)
    const moved = ["mark", "line", "what", "rule", "title"].filter((key) => window.__boxes[0][key].some((_, i) => { const values = window.__boxes.map((b) => b[key][i]); return Math.max(...values) - Math.min(...values) > 0.5; }));
    return { shift: window.__shifts.filter((s) => s.at > window.__fontsDoneAt + 40).reduce((a, s) => a + s.value, 0), moved, samples: window.__boxes.length, frames: window.__frames.length, firstPath: window.__firstPath, path: document.querySelector(".hero-mark path").getAttribute("d"), playing: window.LogoMotion ? window.LogoMotion.playing() : null };
  });

  for (const { width, height } of [SCREENS[0], SCREENS[1]]) {
    test(`at ${width} Datum plays and nothing else moves: no element below the mark, no layout shift`, async () => {
      const { page, context, errors } = await openHtml(browser, html, { width, height, init: watch });
      await page.waitForFunction(() => performance.now() > 1600);
      const r = await read(page);
      assert.ok(r.samples > 20, `the page was watched for the whole entrance (${r.samples} samples)`);
      assert.ok(r.frames >= 5, `the entrance played (${r.frames} path frames)`);
      assert.equal(r.playing, 0, "and is over");
      assert.equal(r.path, SHIPPED, "it ends on the shipped path");
      assert.deepEqual(r.moved, [], "no box moved");
      assert.equal(r.shift, 0, "no layout shift");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("under reduced motion the mark is the shipped path from the first frame, and nothing moves", async () => {
    const { page, context } = await openHtml(browser, html, { width: 1440, reducedMotion: "reduce", init: watch });
    await page.waitForFunction(() => performance.now() > 1600);
    const r = await read(page);
    assert.equal(r.firstPath, SHIPPED, "the path when the document was ready");
    assert.equal(r.path, SHIPPED);
    assert.equal(r.frames, 0, "the path is never redrawn");
    assert.deepEqual(r.moved, []);
    assert.equal(r.shift, 0);
    await context.close();
  });

  test("the line and the sentence are in the first frame: no animation or transition on them", async () => {
    const { page, context } = await openHtml(browser, html, { width: 1440, init: () => document.addEventListener("DOMContentLoaded", () => { window.__early = [".hero-line", ".hero-what", ".name-head"].map((s) => { const el = document.querySelector(s); return { s, opacity: getComputedStyle(el).opacity, animations: el.getAnimations().length }; }); }) });
    assert.deepEqual(await page.evaluate(() => window.__early), [".hero-line", ".hero-what", ".name-head"].map((s) => ({ s, opacity: "1", animations: 0 })));
    await context.close();
  });
});

describe("forced colours", () => {
  /** The colour of one pixel of the page, read back from a screenshot. */
  const pixel = async (page, x, y) => {
    const png = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } });
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3);
    }, png.toString("base64"));
  };
  const canvasText = (page) => page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "CanvasText";
    document.body.append(probe);
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const g = c.getContext("2d");
    g.fillStyle = getComputedStyle(probe).color;
    probe.remove();
    g.fillRect(0, 0, 1, 1);
    return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3);
  });

  for (const system of ["dark", "light"]) {
    for (const [name, stored] of [["the same as the system's", system], ["opposite to it", system === "dark" ? "light" : "dark"]]) {
      test(`the mark's ink is the h1's, with the system ${system} and the page's theme ${name}`, async () => {
        const { page, context } = await openHtml(browser, html, { scheme: system, forcedColors: "active", storage: { "basalt-theme": stored } });
        assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), stored);
        const ink = await page.evaluate(() => ({ line: getComputedStyle(document.querySelector(".hero-line")).color, mark: getComputedStyle(document.querySelector(".hero-mark")).color, fill: getComputedStyle(document.querySelector(".hero-mark path")).fill }));
        assert.equal(ink.mark, ink.line, "the mark's colour is the h1's");
        assert.equal(ink.fill, ink.line, "and so is what it fills with");
        const box = await page.locator(".hero-mark").boundingBox();
        // a point inside Datum's solid body (3 to 45 across, 20 to 40 down, on its 48 grid)
        const painted = await pixel(page, box.x + (box.width * 6) / 48, box.y + (box.height * 35) / 48);
        assert.deepEqual(painted, await canvasText(page), "and the pixels are the system's ink");
        await context.close();
      });
    }
  }

  test("the hand-over rule is a real CanvasText line", async () => {
    const { page, context } = await openHtml(browser, html, { forcedColors: "active", scheme: "dark" });
    assert.equal(await page.locator(".name-head").evaluate((el) => getComputedStyle(el).borderTopColor), await page.locator(".hero-line").evaluate((el) => getComputedStyle(el).color));
    await context.close();
  });
});

describe("print", () => {
  test("printed for real, the mark is its narrow 192 and the first screen has no screen height", async () => {
    const { page, context, errors } = await openHtml(browser, html, { scheme: "dark", width: 1440, height: 900 });
    await page.emulateMedia({ media: "print" });
    await settled(page);
    await page.evaluate(() => {
      window.__print = [];
      window.addEventListener("beforeprint", () => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        const hero = document.querySelector(".hero");
        window.__print.push({
          theme: document.documentElement.getAttribute("data-theme"),
          mark: r(".hero-mark").width,
          minHeight: getComputedStyle(hero).minHeight,
          heroHeight: hero.getBoundingClientRect().height,
          order: ["header.basalt-site-header", ".hero-mark", ".hero-line", ".hero-what", ".name-head"].map((s) => Math.round(r(s).top)),
          align: getComputedStyle(document.querySelector(".hero-group")).textAlign,
          bar: getComputedStyle(document.querySelector("header.basalt-site-header")).backdropFilter,
        });
      });
    });
    const pdf = await page.pdf();
    assert.ok(pdf.length > 1000, "a pdf was made");
    const [seen, ...rest] = await page.evaluate(() => window.__print);
    assert.deepEqual(rest, [], "one print");
    assert.equal(seen.theme, "light", "in the light theme");
    assert.equal(seen.mark, 192, "the mark at its narrow size");
    assert.equal(seen.minHeight, "0px", "the screen height is dropped");
    assert.ok(seen.heroHeight < 900 - 56 - 120, `the first screen is as tall as its content (${seen.heroHeight})`);
    assert.equal(seen.align, "center", "a centred title block");
    assert.deepEqual(seen.order, [...seen.order].sort((a, b) => a - b), "the bar, the mark, the line, the sentence, the section, in that order");
    assert.equal(seen.bar, "none", "the bar prints as the shared stand-in prints it");
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("no colour", () => {
  for (const scheme of ["dark", "light"]) {
    test(`no cobalt and no accent anywhere on the page (${scheme})`, async () => {
      assert.ok(!/cobalt/i.test(html), "the built page names no cobalt");
      assert.ok(!/--basalt-accent/.test(html.replace(/\/\*[\s\S]*?\*\//g, "")), "and uses no accent token");
      for (const width of [1440, 390]) {
        const { page, context } = await openHtml(browser, html, { scheme, width });
        assert.equal(await page.evaluate(() => document.querySelector("[data-accent]") === null && document.documentElement.getAttribute("data-accent")), null, "no data-accent");
        const coloured = await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const g = canvas.getContext("2d", { willReadFrequently: true });
          const rgb = (css) => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = css; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
          const bad = [];
          for (const el of document.querySelectorAll("body *")) {
            if (el.closest("script, style")) continue;
            const s = getComputedStyle(el);
            for (const prop of ["color", "backgroundColor", "borderTopColor", "borderBottomColor", "outlineColor", "fill", "stroke"]) {
              const value = s[prop];
              if (!value || value === "none" || value === "currentcolor") continue;
              const c = rgb(value);
              if (c[3] > 0 && Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 8) bad.push(`${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className)} ${prop} ${value}`);
            }
          }
          return bad;
        });
        assert.deepEqual(coloured, [], `a coloured element at ${width}`);
        await context.close();
      }
    });
  }
});
