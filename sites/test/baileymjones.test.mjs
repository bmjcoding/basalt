// baileymjones.com's first screen: what the council decided for it (DECISIONS 112 and 115) and nothing the harness in pages.test.mjs
// already proves. Behaviour tests load no web font beyond the Geist the page inlines, so text widths differ a little on CI's Linux
// runner: no measured margin here depends on a fallback font's width, and no test depends on where a line wraps.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { buildPage, sitesDir } from "../build.mjs";
import { HOST, launch, openHtml, settled } from "./support.mjs";

let browser;
let built;
before(async () => {
  browser = await launch();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-sites-bmj-"));
  built = buildPage(path.join(sitesDir, "baileymjones", "index.body.html"), { outFile: path.join(out, "index.html") });
});
after(async () => { await browser?.close(); });

const open = (options) => openHtml(browser, built.html, options);

/** Computed colours are compared by resolving a token (or a system colour) on a probe in the same page, so no colour is written here. */
const resolve = (page, css) => page.evaluate((value) => {
  const probe = document.createElement("span");
  probe.style.color = value;
  document.body.append(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}, css);
const colorOf = (page, selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
const rectOf = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });
const style = (page, selector, props) => page.locator(selector).first().evaluate((el, names) => { const s = getComputedStyle(el); return Object.fromEntries(names.map((n) => [n, s[n]])); }, props);
const near = (actual, expected, message, tolerance = 0.51) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual}, expected ${expected}`);

describe("the name", () => {
  for (const [width, size, line] of [[1440, 56, 60], [720, 56, 60], [390, 40, 44]]) {
    test(`it is the page's h1 at ${size}/${line} and 600 at ${width}`, async () => {
      const { page, context } = await open({ width });
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("h1").innerText(), "Bailey M. Jones");
      const s = await style(page, "h1", ["fontSize", "lineHeight", "fontWeight"]);
      assert.deepEqual([s.fontSize, s.lineHeight, s.fontWeight], [`${size}px`, `${line}px`, "600"]);
      await context.close();
    });
  }

  for (const [width, below] of [[1440, 96], [390, 48]]) {
    test(`it is on one line, ${below}px under the bar, on the brand's start edge at ${width}`, async () => {
      const { page, context } = await open({ width });
      const h1 = await rectOf(page, "h1");
      const line = await page.locator("h1").evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
      near(h1.height, line, "one line: the h1's height is its line height");
      const bar = await rectOf(page, "header.basalt-site-header");
      near(h1.top - bar.bottom, below, "the gap under the bar");
      const brand = await rectOf(page, ".basalt-site-brand-mark");
      near(h1.left, brand.left, "the name starts on the brand's start edge");
      await context.close();
    });
  }
});

describe("the lead", () => {
  for (const [width, size, line] of [[1440, 20, 28], [390, 18, 26]]) {
    test(`the role is primary and the thesis secondary, both ${size}/${line} at 400, at ${width}`, async () => {
      const { page, context } = await open({ width });
      for (const selector of [".hero-role", ".hero-thesis"]) {
        const s = await style(page, selector, ["fontSize", "lineHeight", "fontWeight"]);
        assert.deepEqual([s.fontSize, s.lineHeight, s.fontWeight], [`${size}px`, `${line}px`, "400"], selector);
      }
      assert.equal(await colorOf(page, ".hero-role"), await resolve(page, "var(--basalt-text-primary)"));
      assert.equal(await colorOf(page, ".hero-thesis"), await resolve(page, "var(--basalt-text-secondary)"));
      await context.close();
    });
  }
});

describe("the profile row", () => {
  test("it holds Email, GitHub, LinkedIn and X in that order, each a glyph and its name; the email is a mailto link", async () => {
    const { page, context } = await open();
    const links = page.locator(".hero-profiles a");
    assert.deepEqual(await links.allInnerTexts(), ["Email", "GitHub", "LinkedIn", "X"]);
    assert.equal(await page.locator(".hero-profiles > li").count(), 4, "exactly four, so no Instagram and no Substack");
    for (let i = 0; i < 4; i++) assert.equal(await links.nth(i).locator("svg").count(), 1, `link ${i} has its glyph`);
    assert.match(await links.nth(0).getAttribute("href"), /^mailto:[^@\s]+@[^@\s]+$/);
    assert.equal(await links.nth(0).getAttribute("target"), null, "the email link opens nothing new");
    await context.close();
  });

  test("on a coarse pointer at 390 each is at least 44 tall and no two hit areas overlap", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    const boxes = await page.locator(".hero-profiles a").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height }; }));
    assert.equal(boxes.length, 4);
    for (const box of boxes) assert.ok(box.height >= 43.99, `a profile link is ${box.height} tall`);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
        assert.equal(overlap, false, `links ${i} and ${j} overlap`);
      }
    }
    await context.close();
  });
});

describe("the record", () => {
  test("it has Building, Consulting, Writing and Based, in that order, under a labelled \"Now\"", async () => {
    const { page, context } = await open();
    assert.equal(await page.locator("#now-title").innerText(), "Now");
    assert.equal(await page.locator("section.hero-now").getAttribute("aria-labelledby"), "now-title");
    assert.deepEqual(await page.locator(".dl dt").allInnerTexts(), ["Building", "Consulting", "Writing", "Based"]);
    await context.close();
  });

  for (const scheme of ["dark", "light"]) {
    test(`in each value the linked name is primary and the rest secondary (${scheme})`, async () => {
      const { page, context } = await open({ scheme });
      const primary = await resolve(page, "var(--basalt-text-primary)");
      const secondary = await resolve(page, "var(--basalt-text-secondary)");
      const rows = page.locator(".dl-item");
      for (let i = 0; i < 3; i++) {
        const row = rows.nth(i);
        assert.equal(await row.locator("a").count(), 1, `row ${i} links its name`);
        assert.equal(await row.locator("a").evaluate((el) => getComputedStyle(el).color), primary, `row ${i}: the link is primary`);
        assert.equal(await row.locator(".dl-rest").evaluate((el) => getComputedStyle(el).color), secondary, `row ${i}: the rest is secondary`);
      }
      const based = rows.nth(3);
      assert.equal(await based.locator("a").count(), 0);
      assert.equal(await based.locator(".dl-details").evaluate((el) => getComputedStyle(el).color), primary, "the place is primary");
      assert.equal(await based.locator(".dl-rest").evaluate((el) => getComputedStyle(el).color), secondary, "the time and its zone are secondary");
      assert.equal(await based.locator("time").evaluate((el) => getComputedStyle(el).color), secondary);
      await context.close();
    });
  }

  test("in forced colours the link is LinkText and the rest CanvasText", async () => {
    const { page, context } = await open({ forcedColors: "active" });
    assert.equal(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), true);
    const linkText = await resolve(page, "LinkText");
    const canvasText = await resolve(page, "CanvasText");
    assert.notEqual(linkText, canvasText, "the two are different system colours");
    const rows = page.locator(".dl-item");
    for (let i = 0; i < 3; i++) {
      assert.equal(await rows.nth(i).locator("a").evaluate((el) => getComputedStyle(el).color), linkText, `row ${i}: the link`);
      assert.equal(await rows.nth(i).locator(".dl-rest").evaluate((el) => getComputedStyle(el).color), canvasText, `row ${i}: the rest`);
    }
    await context.close();
  });

  test("its label column is 160px at 1440, and every row is 40px but the last", async () => {
    const { page, context } = await open({ width: 1440 });
    const columns = await page.locator(".dl-item").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ")[0]);
    assert.equal(columns, "160px");
    const heights = await page.locator(".dl-item").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    // One line each at 1440: 10 + 20 + 10, the first without the top 10 and the last without the bottom 10.
    assert.deepEqual(heights.map((h) => Math.round(h)), [30, 40, 40, 30]);
    await context.close();
  });

  test("it stacks at 390: each label is over its value", async () => {
    const { page, context } = await open({ width: 390 });
    const rows = await page.locator(".dl-item").evaluateAll((els) => els.map((el) => {
      const dt = el.querySelector("dt").getBoundingClientRect();
      const dd = el.querySelector("dd").getBoundingClientRect();
      return { dtBottom: dt.bottom, ddTop: dd.top, dtLeft: dt.left, ddLeft: dd.left };
    }));
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.ok(row.ddTop >= row.dtBottom - 0.5, "the value is under the label");
      near(row.ddLeft, row.dtLeft, "and on the same edge");
    }
    await context.close();
  });
});

// The clock, on a controlled clock: Playwright's page.clock fakes Date and the timers, and holds time still between our steps.
const T0 = Date.parse("2026-11-11T15:59:30Z"); // 9:59 AM CST: the next minute is 10:00, a digit wider
async function openClock({ width = 1440, scheme = "dark" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: width <= 720 ? 844 : 900 }, colorScheme: scheme });
  const page = await context.newPage();
  await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
  await page.clock.install({ time: T0 });
  await page.goto(HOST);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.pauseAt(T0 + 5000);
  return { page, context };
}
const clockText = (page) => page.locator("time").innerText();
const boxesExceptClock = (page) => page.evaluate(() => [...document.querySelectorAll("body *")]
  .filter((el) => !el.closest(".dl-rest") && !el.closest("script, style"))
  .map((el) => { const r = el.getBoundingClientRect(); return `${el.tagName}.${el.className}|${r.left}|${r.top}|${r.width}|${r.height}`; }));

describe("the local time", () => {
  test("it reads to the minute, with no seconds, in Central time", async () => {
    const { page, context } = await openClock();
    assert.equal(await clockText(page), "9:59 AM CST");
    assert.equal(await page.locator("time").count(), 1);
    assert.equal(await page.locator(".dl-item").nth(3).innerText().then((t) => t.replace(/\s+/g, " ")), "Based Dallas–Fort Worth, Texas · 9:59 AM CST");
    await context.close();
  });

  test("it changes when the minute changes and not before", async () => {
    const { page, context } = await openClock();
    await page.clock.runFor(24000); // 9:59:59
    assert.equal(await clockText(page), "9:59 AM CST", "one second before the minute");
    await page.clock.runFor(1500); // 10:00:00.5
    assert.equal(await clockText(page), "10:00 AM CST", "after it");
    await page.clock.runFor(30000); // 10:00:30
    assert.equal(await clockText(page), "10:00 AM CST", "and not again inside the minute");
    await page.clock.runFor(31000); // 10:01:01
    assert.equal(await clockText(page), "10:01 AM CST");
    await context.close();
  });

  test("it is replaced when the tab becomes visible again", async () => {
    const { page, context } = await openClock();
    // Time passes while the page is hidden and its timer has not run: jump the clock, then say the tab is visible.
    await page.clock.setSystemTime(T0 + 5000 + 3 * 60000);
    assert.equal(await clockText(page), "9:59 AM CST", "nothing ran yet");
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); });
    assert.equal(await clockText(page), "10:02 AM CST");
    await context.close();
  });

  for (const width of [1440, 390]) {
    test(`it is not a live region, and nothing else on the page moves when it changes (${width})`, async () => {
      const { page, context } = await openClock({ width });
      const lives = await page.locator("time").evaluate((el) => {
        const found = [];
        for (let n = el; n; n = n.parentElement) {
          if (n.hasAttribute("aria-live") || n.hasAttribute("aria-atomic") || ["status", "alert", "log", "timer", "marquee"].includes(n.getAttribute("role"))) found.push(n.tagName);
        }
        return found;
      });
      assert.deepEqual(lives, [], "no live region on the clock or above it");
      const before = await boxesExceptClock(page);
      const widthBefore = (await rectOf(page, "time")).width;
      await page.clock.runFor(26000); // 10:00:01
      assert.equal(await clockText(page), "10:00 AM CST");
      assert.ok((await rectOf(page, "time")).width > widthBefore, "the text did change width, a digit's worth");
      assert.deepEqual(await boxesExceptClock(page), before, "no other box moved or changed size");
      await context.close();
    });
  }

  test("its datetime is a valid date, to the minute, and follows the text", async () => {
    const { page, context } = await openClock();
    const machine = () => page.locator("time").getAttribute("datetime");
    assert.match(await machine(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
    assert.equal(Date.parse(await machine()), Date.parse("2026-11-11T15:59:00Z"));
    await page.clock.runFor(26000);
    assert.equal(Date.parse(await machine()), Date.parse("2026-11-11T16:00:00Z"));
    await context.close();
  });

  test("it has no seconds, no animation and no transition", async () => {
    const { page, context } = await openClock();
    const s = await style(page, "time", ["transitionDuration", "animationName", "fontVariantNumeric"]);
    assert.equal(s.animationName, "none");
    assert.equal(s.transitionDuration, "0s");
    assert.match(s.fontVariantNumeric, /tabular-nums/);
    assert.equal(await page.locator("time").evaluate((el) => el.getAnimations().length), 0);
    await context.close();
  });

  test("with script off the row reads \"Central time\"", async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
    const page = await context.newPage();
    await page.goto(HOST);
    const text = (await page.locator(".dl-item").nth(3).innerText()).replace(/\s+/g, " ");
    assert.equal(text, "Based Dallas–Fort Worth, Texas · Central time");
    await context.close();
  });

  test("in a real print it reads \"Central time\", with the clock on screen", async () => {
    const { page, context } = await open({ scheme: "dark" });
    assert.match(await clockText(page), /^\d{1,2}:\d{2} [AP]M C[SD]T$/, "on screen it is the clock");
    await page.emulateMedia({ media: "print" });
    await settled(page);
    await page.evaluate(() => {
      window.__row = [];
      // page.pdf fires beforeprint; the row is read there, under print media, as the printed page has it.
      window.addEventListener("beforeprint", () => window.__row.push(document.querySelectorAll(".dl-item")[3].innerText.replace(/\s+/g, " ")));
    });
    const pdf = await page.pdf();
    assert.ok(pdf.length > 1000, "a pdf was made");
    assert.deepEqual(await page.evaluate(() => window.__row), ["Based Dallas–Fort Worth, Texas · Central time"]);
    await context.close();
  });
});

describe("print", () => {
  test("in a real print no profile link and no record link has generated content after it, and the profile row reads names only", async () => {
    const { page, context } = await open({ scheme: "dark" });
    await page.emulateMedia({ media: "print" });
    await settled(page);
    await page.evaluate(() => {
      window.__print = [];
      // page.pdf fires beforeprint; the links are read there, under print media, as the printed page has them.
      window.addEventListener("beforeprint", () => {
        const links = [...document.querySelectorAll(".hero-profiles a, .dl-link")];
        window.__print.push({
          count: links.length,
          after: links.map((a) => `${getComputedStyle(a, "::after").content}|${getComputedStyle(a, "::before").content}`),
          row: document.querySelector(".hero-profiles").innerText.replace(/\s+/g, " ").trim(),
        });
      });
    });
    const pdf = await page.pdf();
    assert.ok(pdf.length > 1000, "a pdf was made");
    const [seen] = await page.evaluate(() => window.__print);
    assert.equal(seen.count, 7, "four profile links and three record links");
    for (const content of seen.after) assert.equal(content, "none|none", "generated content on a link in print");
    assert.equal(seen.row, "Email GitHub LinkedIn X");
    await context.close();
  });
});

describe("the entrance", () => {
  test("nothing animates at rest and the layout does not shift once the font has loaded", async () => {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width <= 720 ? 844 : 900 } });
      const page = await context.newPage();
      await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
      await page.goto(HOST);
      await page.evaluate(() => document.fonts.ready);
      // The page is drawn at rest: two frames after the font, there is no animation or transition running or pending.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.deepEqual(await page.evaluate(() => document.getAnimations().map((a) => `${a.transitionProperty || a.animationName}`)), [], `${width}: an animation at rest`);
      // From here on, watch for a layout shift for a second and a half.
      const shift = await page.evaluate(() => new Promise((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value; }).observe({ type: "layout-shift" });
        setTimeout(() => resolve(total), 1500);
      }));
      assert.equal(shift, 0, `${width}: a layout shift after the font loaded`);
      await context.close();
    }
  });
});

describe("the hand-over", () => {
  test("a full-row divider, then \"Work\" at 24/30 and 600 with one line under it in secondary", async () => {
    const { page, context } = await open({ width: 1440 });
    const head = await style(page, ".next-head", ["borderTopWidth", "borderTopStyle", "borderTopColor"]);
    assert.deepEqual([head.borderTopWidth, head.borderTopStyle], ["1px", "solid"]);
    assert.equal(head.borderTopColor, await resolve(page, "var(--basalt-border-divider)"));
    const rule = await rectOf(page, ".next-head");
    const record = await rectOf(page, ".dl");
    near(rule.left, record.left, "the rule starts on the row's start edge");
    near(rule.right, record.right, "and ends on its end edge");
    assert.equal(await page.locator("h2.next-title").innerText(), "Work");
    const s = await style(page, ".next-title", ["fontSize", "lineHeight", "fontWeight"]);
    assert.deepEqual([s.fontSize, s.lineHeight, s.fontWeight], ["24px", "30px", "600"]);
    assert.equal(await colorOf(page, ".next-lead"), await resolve(page, "var(--basalt-text-secondary)"));
    const lead = await page.locator(".next-lead").evaluate((el) => ({ size: getComputedStyle(el).fontSize, line: getComputedStyle(el).lineHeight, height: el.getBoundingClientRect().height }));
    assert.equal(lead.size, "16px");
    near(lead.height, parseFloat(lead.line), "one line");
    await context.close();
  });
});

describe("what the page does not have", () => {
  test("no mark: nothing drawn inside the brand link, in the bar or in the menu, and no icon link in the head", async () => {
    const { page, context } = await open({ width: 390, touch: true });
    assert.equal(await page.locator(".basalt-site-brand img, .basalt-site-brand svg").count(), 0, "in the bar");
    await page.locator(".basalt-site-menu-trigger").click();
    await settled(page);
    assert.equal(await page.locator(".basalt-site-menu .basalt-site-brand").count(), 1, "the menu redraws the brand");
    assert.equal(await page.locator(".basalt-site-brand img, .basalt-site-brand svg").count(), 0, "in the menu");
    assert.equal(await page.locator(".basalt-site-brand").first().innerText(), "Bailey Jones");
    assert.equal(await page.locator("head link[rel*='icon']").count(), 0, "no favicon or touch icon");
    assert.equal(await page.locator("head link[rel='manifest']").count(), 0);
    await context.close();
  });

  test("the header's links are Work, Writing, About and Contact; none is current; there is no primary button", async () => {
    const { page, context } = await open({ width: 1440 });
    assert.deepEqual(await page.locator(".basalt-site-links a").allInnerTexts(), ["Work", "Writing", "About", "Contact"]);
    assert.equal(await page.locator("header [aria-current]").count(), 0);
    assert.equal(await page.locator("header .btn[data-variant='primary']").count(), 0);
    await context.close();
  });

  for (const scheme of ["dark", "light"]) {
    test(`no cobalt and no accent anywhere: no accent attribute, no accent module, and every colour a neutral (${scheme})`, async () => {
      assert.ok(!built.modules.includes("accent"), "the accent module is not in the page");
      assert.ok(!/cobalt/i.test(built.html.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "")), "the word cobalt is not in the page's code");
      const { page, context } = await open({ scheme });
      assert.equal(await page.locator("[data-accent]").count(), 0);
      const chromatic = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const rgba = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
        const found = new Set();
        for (const el of document.body.querySelectorAll("*")) {
          const s = getComputedStyle(el);
          for (const prop of ["color", "backgroundColor", "borderTopColor", "borderBottomColor", "outlineColor", "fill", "stroke"]) {
            const value = s[prop];
            if (!value || value === "none" || value === "rgba(0, 0, 0, 0)") continue;
            const [r, g, b, a] = rgba(value);
            if (a > 0 && Math.max(r, g, b) - Math.min(r, g, b) > 4) found.add(`${el.tagName}.${el.className} ${prop} ${value}`);
          }
        }
        return [...found];
      });
      assert.deepEqual(chromatic, [], "a coloured value");
      await context.close();
    });
  }
});
