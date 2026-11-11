// What the Blacksand hero decided (hero-nov11, DECISIONS 116 and 117), on the built page sites/blacksand/index.body.html. The shared checks in
// pages.test.mjs run on it as well (no network, axe, 44px targets, forced colours, print, the headroom check at 390 and 1440).
// Behaviour tests load no web font beyond the Geist the page inlines, so a text width can differ a little on CI's Linux runner: where a
// test measures the line it waits for the page's own Geist, and every margin is wider than a fallback font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { brinkPolyline, silhouette, VIEW } from "../blacksand/art/art.mjs";
import { artDir, artFiles, keyFor, measureZones, zonesPath } from "../blacksand/art/generate.mjs";
import { buildPage, HOST, launch, openHtml, repoRoot, settled, sitesDir } from "./support.mjs";

const { checkHeadroom } = await import("@srasyndicate/basalt/testing");

const siteDir = path.join(sitesDir, "blacksand");
let browser;
let built;
before(async () => {
  browser = await launch();
  built = buildPage(path.join(siteDir, "index.body.html"), { siteDir });
});
after(async () => { await browser?.close(); });

const open = (options) => openHtml(browser, built.html, options);

/** The first-screen sizes the art composes for. */
const SIZES = [[390, 844], [720, 900], [1024, 768], [1440, 900], [2560, 1440]];

/**
 * Reads the stage's art with every ink hidden (and, when `stars` is false, the stars too): screenshots `clip` (the stage's box by default,
 * in css pixels from the document's origin) at the page's device scale and runs `probe` on the pixels in the page. `probe` is a function
 * of { W, H, data, scale, grey, hex, box, arg, document } that returns something JSON can carry.
 */
async function readArt(page, probe, arg, { clip, stars = true } = {}) {
  await page.addStyleTag({ content: `.basalt-site-header, .basalt-stage-content, .next { visibility: hidden !important; } ${stars ? "" : ".stars { display: none !important; }"} *, *::before, *::after { transition: none !important; animation: none !important; }` });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const box = clip ?? await page.evaluate(() => { const r = document.querySelector(".basalt-stage").getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height }; });
  const png = await page.screenshot({ clip: box, fullPage: true, scale: "device", type: "png", animations: "disabled" });
  return page.evaluate(async ({ png, box, probe, arg }) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    canvas.width = bitmap.width; canvas.height = bitmap.height; ctx.drawImage(bitmap, 0, 0);
    const W = bitmap.width, H = bitmap.height, data = ctx.getImageData(0, 0, W, H).data;
    const scale = W / box.width;
    const grey = (x, y) => { const o = (y * W + x) * 4; return 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]; };
    const hex = (x, y) => { const o = (y * W + x) * 4; return "#" + [0, 1, 2].map((i) => data[o + i].toString(16).padStart(2, "0")).join(""); };
    return new Function("ctx", `return (${probe})(ctx);`)({ W, H, data, scale, grey, hex, box, arg, document });
  }, { png: png.toString("base64"), box, probe: probe.toString(), arg });
}

/** The words of an element grouped by the line they sit on. */
const linesOf = (page, selector) => page.evaluate((selector) => {
  const el = document.querySelector(selector);
  const words = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) for (const m of n.textContent.matchAll(/\S+/g)) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); words.push({ w: m[0], top: Math.round(r.getBoundingClientRect().top) }); }
  const lines = [];
  for (const w of words) { const last = lines[lines.length - 1]; if (last && Math.abs(last.top - w.top) < 4) last.words.push(w.w); else lines.push({ top: w.top, words: [w.w] }); }
  const cs = getComputedStyle(el);
  const doc = document.documentElement;
  return { lines: lines.map((l) => l.words.join(" ")), fontSize: cs.fontSize, lineHeight: cs.lineHeight, overflow: doc.scrollWidth - doc.clientWidth };
}, selector);

const THEMES = ["dark", "light"];

describe("the headroom and every quiet zone", () => {
  test("each zone is its ink's box plus space-1-5 (6px) on every side", async () => {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const { page, context } = await open({ width, height });
      const zones = await page.evaluate(() => [...document.querySelectorAll("[data-quiet]")].map((el) => { const cs = getComputedStyle(el); return { zone: el.dataset.quiet, pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft] }; }));
      assert.deepEqual(zones.map((z) => z.zone), ["mark", "line", "lead", "actions", "status"]);
      for (const z of zones) assert.deepEqual(z.pad, ["6px", "6px", "6px", "6px"], `${z.zone} at ${width}`);
      await context.close();
    }
  });

  test("0 pixels past art-quiet-limit, in both themes, at 390, 720, 1024, 1440 and 2560, at 1x and 2x", async () => {
    let checked = 0;
    for (const [width, height] of SIZES) {
      const result = await checkHeadroom(browser, {
        widths: [width], height, scales: [1, 2],
        load: async (p) => {
          await p.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
          await p.goto(HOST);
          await p.evaluate(async () => { await document.fonts.ready; });
        },
      });
      assert.ok(result.ok, `${width} by ${height}: ${JSON.stringify(result.failures, null, 2)}`);
      assert.equal(result.runs, 4, "two themes at two scales");
      checked += result.checked;
    }
    assert.ok(checked > 10_000_000, `${checked} device pixels were read`);
  });
});

describe("the brink", () => {
  // The brink's edge: for each device row it crosses, the column of the strongest horizontal step near where the drawing puts it, then
  // the longest run of rows on one column; and, as the wider check, the longest vertical run of a horizontal step of 3 grey levels or more
  // anywhere in the art (a straight vertical edge of any kind would show here). The designer's own method (measure.mjs).
  const probe = ({ W, H, scale, grey, arg, document }) => {
    const svg = document.querySelector(".dunes").getBoundingClientRect(), stage = document.querySelector(".basalt-stage").getBoundingClientRect();
    const k = svg.width / arg.view.w;
    const pts = arg.poly.map(([u, v]) => [(svg.left - stage.left + u * k) * scale, (svg.top - stage.top + v * k) * scale]);
    const xAt = (y) => { for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if ((y0 - y) * (y1 - y) <= 0 && y0 !== y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0); } return null; };
    const top = Math.max(0, Math.ceil(Math.min(...pts.map((p) => p[1])))), bottom = Math.min(H - 1, Math.floor(Math.max(...pts.map((p) => p[1]))));
    const win = Math.ceil(4 * scale);
    let run = 0, best = 0, lastX = null, rows = 0;
    for (let y = top; y <= bottom; y++) {
      const xe = xAt(y + 0.5);
      if (xe == null || xe < 1 || xe > W - 3) { run = 0; lastX = null; continue; }
      let bx = null, bs = 0;
      for (let x = Math.max(0, Math.round(xe) - win); x <= Math.min(W - 2, Math.round(xe) + win); x++) { const st = Math.abs(grey(x + 1, y) - grey(x, y)); if (st > bs) { bs = st; bx = x; } }
      if (bs < 2) { run = 0; lastX = null; continue; }
      rows++;
      run = bx === lastX ? run + 1 : 1; lastX = bx;
      if (run > best) best = run;
    }
    let anyBest = 0, anyAt = null;
    for (let x = 0; x < W - 1; x++) {
      let r = 0;
      for (let y = 0; y < H; y++) {
        if (Math.abs(grey(x + 1, y) - grey(x, y)) >= 3) { r++; if (r > anyBest) { anyBest = r; anyAt = { x: Math.round(x / scale), y: Math.round(y / scale) }; } } else r = 0;
      }
    }
    return { rows, brinkRun: best, anyRun: anyBest, anyAt };
  };

  test("in the art alone no vertical edge runs more than 6 device rows in one pixel column, in both themes, at 1024 to 2560, at 1x and 2x", async () => {
    const poly = brinkPolyline();
    const heights = { 1024: 768, 1280: 800, 1366: 768, 1440: 900, 1920: 1080, 2560: 1440 };
    for (const scheme of THEMES) for (const width of Object.keys(heights).map(Number)) for (const deviceScaleFactor of [1, 2]) {
      const { page, context } = await open({ scheme, width, height: heights[width], deviceScaleFactor });
      const read = await readArt(page, probe, { poly, view: VIEW });
      const where = `${scheme} ${width} by ${heights[width]} at ${deviceScaleFactor}x`;
      assert.ok(read.rows > 100, `${where}: the brink was read over ${read.rows} rows`);
      assert.ok(read.brinkRun <= 6, `${where}: the brink's longest run is ${read.brinkRun} rows`);
      assert.ok(read.anyRun <= 6, `${where}: a vertical edge of ${read.anyRun} rows at ${JSON.stringify(read.anyAt)}`);
      await context.close();
    }
  });

  test("in dark at 1440 the slip face differs from the sky where the brink leaves the skyline", async () => {
    // Just right of the shoulder the silhouette is the slip face's top edge: the sky is above it and the shade just under it. The points
    // are worked out here, in the drawing's units, and read on the page; the stars are hidden so no dot lands on a sample.
    const shoulder = brinkPolyline()[0][0];
    const points = [60, 90, 120].map((du) => ({ u: shoulder + du, v: silhouette(shoulder + du) }));
    const probe = ({ hex, scale, arg, document }) => {
      const svg = document.querySelector(".dunes").getBoundingClientRect(), stage = document.querySelector(".basalt-stage").getBoundingClientRect();
      const k = svg.width / arg.view.w;
      return arg.points.map(({ u, v }) => {
        const x = Math.round((svg.left - stage.left + u * k) * scale), y = Math.round((svg.top - stage.top + v * k) * scale), d = Math.round(4 * scale);
        return { sky: hex(x, y - d), slip: hex(x, y + d) };
      });
    };
    const { page, context } = await open({ scheme: "dark", width: 1440, height: 900, deviceScaleFactor: 2 });
    const reads = await readArt(page, probe, { view: VIEW, points }, { stars: false });
    await context.close();
    const level = (hex) => parseInt(hex.slice(1, 3), 16);
    for (const read of reads) {
      assert.ok(level(read.sky) <= 2, `the sky here is ${read.sky}`);
      assert.ok(level(read.slip) - level(read.sky) >= 6, `the slip face ${read.slip} is within 5 levels of the sky ${read.sky}`);
    }
  });
});

describe("the stage's end", () => {
  // The device row that holds the stage's foot, read across the stage's width with every ink hidden. A stage's height can be fractional, so
  // the row is taken two ways (the last row the stage paints when its edge is snapped, and the one holding the exact foot), and both must be
  // art-field in every pixel.
  const probe = ({ W, data, hex, scale, arg, document }) => {
    const c = document.createElement("canvas"); c.width = 1; c.height = 1; const x2 = c.getContext("2d");
    x2.fillStyle = getComputedStyle(document.querySelector(".basalt-stage")).getPropertyValue("--basalt-art-field").trim(); x2.fillRect(0, 0, 1, 1);
    const f = [...x2.getImageData(0, 0, 1, 1).data].slice(0, 3);
    const rows = {};
    for (const [name, row] of Object.entries(arg.rows)) {
      let differing = 0, worst = null;
      for (let x = 0; x < W; x++) { const o = (row * W + x) * 4; if (data[o] !== f[0] || data[o + 1] !== f[1] || data[o + 2] !== f[2]) { differing++; worst ??= { x, color: hex(x, row) }; } }
      rows[name] = { row, differing, worst };
    }
    return { field: f, W, scale, rows };
  };

  async function readFoot(scheme, width, height, deviceScaleFactor) {
    const { page, context } = await open({ scheme, width, height, deviceScaleFactor });
    const foot = await page.evaluate(() => { const r = document.querySelector(".basalt-stage").getBoundingClientRect(); return { left: r.left + scrollX, width: r.width, bottom: r.bottom + scrollY }; });
    const y0 = Math.floor(foot.bottom) - 4;
    const scale = deviceScaleFactor;
    const rows = { snapped: Math.round(foot.bottom * scale) - 1 - y0 * scale, exact: Math.ceil(foot.bottom * scale - 1e-6) - 1 - y0 * scale };
    const read = await readArt(page, probe, { rows }, { clip: { x: foot.left, y: y0, width: foot.width, height: 6 } });
    await context.close();
    return read;
  }

  test("it ends on art-field across its width, in both themes, at every width from 1024 to 1060 and at 390, 430, 720, 1440 and 2560", async () => {
    const sizes = [...Array.from({ length: 37 }, (_, i) => [1024 + i, 768, 1]), [390, 844, 1], [430, 932, 1], [720, 900, 1], [1440, 900, 1], [2560, 1440, 1], [390, 844, 2], [720, 900, 2], [1440, 900, 2], [2560, 1440, 2]];
    for (const scheme of THEMES) for (const [width, height, scale] of sizes) {
      const read = await readFoot(scheme, width, height, scale);
      for (const [name, r] of Object.entries(read.rows)) assert.equal(r.differing, 0, `${scheme} ${width} by ${height} at ${scale}x: ${r.differing} pixels of the ${name} foot row (${r.row}) are not art-field, the first ${JSON.stringify(r.worst)}`);
    }
  });
});

describe("the art is the generator's", () => {
  test("regenerating from zones.json gives the files the page includes, byte for byte", () => {
    const zones = JSON.parse(fs.readFileSync(zonesPath, "utf8"));
    const files = artFiles(zones);
    assert.deepEqual(Object.keys(files).sort(), ["dunes.svg", "fills.css", "stars-below.svg", "stars-side.svg"]);
    for (const [name, text] of Object.entries(files)) {
      assert.equal(fs.readFileSync(path.join(artDir, name), "utf8"), text, `${name} is not what art.mjs generates`);
      assert.ok(built.html.includes(text), `${name} is not in the built page byte for byte`);
      assert.ok(built.includes.some((i) => i.name === `art/${name}`), `the page does not include art/${name}`);
    }
  });

  test("the zones the stars were placed round are this page's own: re-read at 1440 and 390 they match zones.json", async () => {
    const committed = JSON.parse(fs.readFileSync(zonesPath, "utf8"));
    const read = await measureZones(browser, built.html, [1440, 390]);
    for (const width of [1440, 390]) {
      const was = committed[keyFor(width, false)];
      assert.deepEqual(read[width].map((z) => z.zone), was.map((z) => z.zone));
      read[width].forEach((z, i) => { for (const k of ["x", "y", "w", "h"]) assert.ok(Math.abs(z[k] - was[i][k]) <= 3, `${width}: the ${z.zone} zone's ${k} is ${z[k]}, zones.json has ${was[i][k]}; run node sites/blacksand/art/generate.mjs`); });
    }
  });

  test("no stars in light, none in the headroom in dark, and nothing in the art animates", async () => {
    const stars = built.html.match(/<svg class="stars[^>]*>.*?<\/svg>/gs) ?? [];
    assert.equal(stars.length, 2, "two star fields");
    for (const svg of stars) {
      const ys = [...svg.matchAll(/M-?\d+ (-?\d+)h0/g)].map((m) => Number(m[1]));
      assert.ok(ys.length > 100, "a field of stars");
      assert.ok(Math.min(...ys) - 1.1 >= 80, `a star is in the 80px headroom (y ${Math.min(...ys)})`);
    }
    for (const [scheme, shown] of [["light", "none"], ["dark", "block"]]) {
      const { page, context } = await open({ scheme });
      const display = await page.evaluate(() => [...document.querySelectorAll(".stars")].map((el) => getComputedStyle(el).display));
      // At 1440 the narrow field is not shown whatever the theme.
      assert.deepEqual(display, shown === "none" ? ["none", "none"] : ["block", "none"], `${scheme} at 1440`);
      const moving = await page.evaluate(() => {
        const art = document.querySelector(".basalt-stage-art");
        const names = [art, ...art.querySelectorAll("*")].filter((el) => { const cs = getComputedStyle(el); return cs.animationName !== "none" || parseFloat(cs.transitionDuration) > 0; }).length;
        return { names, running: document.getAnimations().filter((a) => a.effect?.target && art.contains(a.effect.target)).length };
      });
      assert.deepEqual(moving, { names: 0, running: 0 }, `${scheme}: something in the art animates`);
      await context.close();
    }
  });
});

describe("the line", () => {
  const LINE = ".hero-line";
  const TWO = ["The secure ground", "your AI agents run on."];
  const THREE = ["The secure ground", "your AI agents", "run on."];

  test("two lines at 56px at 1440 and at 720", async () => {
    for (const width of [1440, 720]) {
      const { page, context } = await open({ width });
      const read = await linesOf(page, LINE);
      assert.deepEqual([read.lines, read.fontSize, read.lineHeight], [TWO, "56px", "60px"], `${width}`);
      await context.close();
    }
  });

  test("two lines at 40px at 719 and on a 430 phone; on a 390 phone three lines at 40px with \"run on.\" together", async () => {
    for (const [width, touch, lines] of [[719, false, TWO], [430, true, TWO], [390, true, THREE]]) {
      const { page, context } = await open({ width, touch, height: 844 });
      const read = await linesOf(page, LINE);
      assert.deepEqual([read.lines, read.fontSize, read.lineHeight], [lines, "40px", "44px"], `${width}${touch ? " phone" : ""}`);
      await context.close();
    }
  });

  test("at 320 three lines at 30px, and the page doesn't scroll sideways from 320 up", async () => {
    const { page, context } = await open({ width: 320, touch: true, height: 640 });
    const read = await linesOf(page, LINE);
    assert.deepEqual([read.lines, read.fontSize, read.lineHeight], [THREE, "30px", "36px"]);
    await context.close();
    for (const touch of [true, false]) for (const width of [320, 340, 360, 375, 390, 430, 560, 719]) {
      const { page: p, context: c } = await open({ width, touch, height: 844 });
      const r = await linesOf(p, LINE);
      assert.ok(r.overflow <= 0, `${width}${touch ? " phone" : ""}: the page is ${r.overflow}px wider than the window`);
      const first = r.lines[0];
      assert.equal(first, "The secure ground", `${width}${touch ? " phone" : ""}: the first phrase stays whole, on its own line`);
      await c.close();
    }
  });

  test("the first phrase at text-4xl in Geist 600 fits a 336px column (the container query's threshold)", async () => {
    const { page, context } = await open({ width: 1440 });
    const measured = await page.evaluate(async () => {
      await document.fonts.load("600 40px Geist");
      const root = getComputedStyle(document.documentElement);
      const span = document.createElement("span");
      span.textContent = "The secure ground";
      span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:600 ${root.getPropertyValue("--basalt-text-4xl-size")} / 1 ${root.getPropertyValue("--basalt-font-family-sans")};letter-spacing:${root.getPropertyValue("--basalt-text-4xl-tracking")}`;
      document.body.append(span);
      const out = { width: span.getBoundingClientRect().width, geist: document.fonts.check("600 40px Geist"), size: getComputedStyle(span).fontSize };
      span.remove();
      return out;
    });
    await context.close();
    assert.equal(measured.geist, true, "Geist 600 is loaded");
    assert.equal(measured.size, "40px");
    assert.ok(measured.width <= 336, `"The secure ground" is ${measured.width}px at 40px, wider than the 336px the line's container query steps down at (index.css); raise it, or the copy or the font changed`);
    assert.ok(measured.width >= 320, `"The secure ground" is only ${measured.width}px at 40px: the 336px threshold in index.css no longer fits it closely`);
  });
});

describe("the supporting sentence, the actions and the status line", () => {
  test("the sentence is 18/26 at 720 and above and 16/24 below", async () => {
    for (const [width, size, line] of [[1440, "18px", "26px"], [720, "18px", "26px"], [719, "16px", "24px"], [390, "16px", "24px"]]) {
      const { page, context } = await open({ width, touch: width < 500, height: 844 });
      const read = await linesOf(page, ".hero-lead");
      assert.deepEqual([read.fontSize, read.lineHeight], [size, line], `${width}`);
      await context.close();
    }
  });

  test("exactly Quick start and Threat model, 40px at a fine pointer and at least 44px on touch; the badge has no dot", async () => {
    for (const [touch, width, min] of [[false, 1440, 40], [true, 390, 44]]) {
      const { page, context } = await open({ width, touch, height: width < 500 ? 844 : 900 });
      const actions = await page.evaluate(() => [...document.querySelectorAll(".hero-actions .btn")].map((el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return { text: el.textContent.trim(), variant: el.dataset.variant ?? null, height: r.height, radius: cs.borderTopLeftRadius, font: cs.fontSize }; }));
      assert.deepEqual(actions.map((a) => [a.text, a.variant]), [["Quick start", "primary"], ["Threat model", null]]);
      for (const a of actions) {
        assert.ok(touch ? a.height >= min : a.height === min, `${a.text} is ${a.height}px tall${touch ? " on touch" : ""}`);
        assert.equal(a.radius, "8px");
        assert.equal(a.font, "16px");
      }
      await context.close();
    }
    const { page, context } = await open({ width: 1440 });
    const badge = await page.evaluate(() => {
      const el = document.querySelector(".hero-status .badge");
      const cs = getComputedStyle(el, "::before");
      return { text: el.textContent.trim(), status: el.getAttribute("data-status"), before: cs.content, paragraph: document.querySelector(".hero-status").textContent.replace(/\s+/g, " ").trim(), color: getComputedStyle(el).color === getComputedStyle(el.parentElement).color };
    });
    await context.close();
    assert.equal(badge.text, "Alpha");
    assert.equal(badge.status, null, "a plain badge has no status, so no status colour");
    assert.ok(["none", "normal"].includes(badge.before), `the badge draws ${badge.before} before its word: a dot`);
    assert.equal(badge.paragraph, "Alpha An open-source product from SRA Syndicate. MIT licensed.");
  });

  test("the header has Docs, Security and GitHub and no primary Button", async () => {
    const { page, context } = await open({ width: 1440 });
    const header = await page.evaluate(() => ({ links: [...document.querySelectorAll(".basalt-site-links a")].map((a) => a.textContent.trim()), primary: document.querySelectorAll("header [data-variant=primary], header .basalt-site-action").length }));
    await context.close();
    assert.deepEqual(header.links, ["Docs", "Security", "GitHub"]);
    assert.equal(header.primary, 0);
  });
});

describe("the mark and the brand", () => {
  test("the mark's wall, the line's first letter and the header brand share one x at 1440 and at 390, and the brand files are in the page byte for byte", async () => {
    for (const [width, touch] of [[1440, false], [390, true]]) {
      const { page, context } = await open({ width, touch, height: width < 500 ? 844 : 900 });
      const x = await page.evaluate(() => {
        const brand = [...document.querySelectorAll(".basalt-site-bar .basalt-site-brand svg")].find((s) => s.getClientRects().length).getBoundingClientRect().left;
        const mark = document.querySelector(".hero-mark");
        const wall = mark.getBoundingClientRect().left + (7 / 48) * mark.getBoundingClientRect().width;
        const h1 = document.querySelector(".hero-line").firstChild.firstChild;
        const range = document.createRange(); range.setStart(h1, 0); range.setEnd(h1, 1);
        return { brand, wall, letter: range.getBoundingClientRect().left, size: mark.getBoundingClientRect().width };
      });
      await context.close();
      assert.equal(x.size, 192, `the mark is 192px at ${width}`);
      assert.ok(Math.abs(x.wall - x.brand) <= 0.5, `${width}: the mark's wall is at ${x.wall}, the brand at ${x.brand}`);
      // The letter's own side bearing puts its ink a pixel or two in from its box.
      assert.ok(Math.abs(x.letter - x.brand) <= 2.5, `${width}: the line's first letter is at ${x.letter}, the brand at ${x.brand}`);
    }
    for (const file of ["blacksand/hero.html", "blacksand/lockup-header-1x.svg", "blacksand/lockup-header-2x.svg", "motion/one-bridge.css"]) {
      assert.ok(built.html.includes(fs.readFileSync(path.join(repoRoot, "brand", file), "utf8")), `brand/${file} is not in the page byte for byte`);
    }
  });

  test("a lockup's own title does not show as a tooltip: the drawing takes no pointer", async () => {
    const { page, context } = await open({ width: 1440 });
    const events = await page.evaluate(() => [...document.querySelectorAll(".basalt-site-brand svg")].map((s) => getComputedStyle(s).pointerEvents));
    await context.close();
    assert.ok(events.length >= 2 && events.every((e) => e === "none"), JSON.stringify(events));
  });
});

describe("the bar and the shape", () => {
  const alphaOf = (page, selector) => page.evaluate((selector) => {
    const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d");
    x.clearRect(0, 0, 1, 1); x.fillStyle = getComputedStyle(document.querySelector(selector)).backgroundColor; x.fillRect(0, 0, 1, 1);
    return x.getImageData(0, 0, 1, 1).data[3];
  }, selector);

  test("the bar is clear at the top, smoked after 2px of scroll, and clear again at the top", async () => {
    const { page, context } = await open({ width: 1440 });
    const state = async () => { await page.waitForTimeout(700); return { top: await page.evaluate(() => document.querySelector("header").hasAttribute("data-top")), alpha: await alphaOf(page, "header.basalt-chrome") }; };
    assert.deepEqual(await state(), { top: true, alpha: 0 });
    await page.evaluate(() => window.scrollTo(0, 2));
    const smoked = await state();
    assert.equal(smoked.top, false);
    assert.ok(smoked.alpha > 100, `the bar's fill is alpha ${smoked.alpha} after 2px`);
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.deepEqual(await state(), { top: true, alpha: 0 });
    await context.close();
  });

  test("the stage is the viewport less 96px at 1440 by 900, and the next head is whole in the first screen there and at 2560 by 1440", async () => {
    for (const [width, height] of [[1440, 900], [2560, 1440]]) {
      const { page, context } = await open({ width, height });
      const m = await page.evaluate(() => { const s = document.querySelector(".basalt-stage").getBoundingClientRect(), t = document.querySelector(".next-title").getBoundingClientRect(); return { stage: s.height, top: t.top, bottom: t.bottom, inner: innerHeight, stageTop: s.top }; });
      await context.close();
      assert.equal(m.stageTop, 0 - 0, "the stage starts at the top of the page");
      assert.equal(m.stage, height - 96, `${width} by ${height}: the stage is ${m.stage}px`);
      assert.ok(m.top >= m.stage && m.bottom <= m.inner, `${width} by ${height}: the next head is ${m.top} to ${m.bottom} in a ${m.inner}px screen`);
    }
  });

  test("there is no line, fade or rim between the stage and the page: the section below starts on the field", async () => {
    const { page, context } = await open({ width: 1440 });
    const ends = await page.evaluate(() => { const next = getComputedStyle(document.querySelector(".next")), stage = getComputedStyle(document.querySelector(".basalt-stage")); return { border: next.borderTopWidth, shadow: next.boxShadow, stageBorder: stage.borderBottomWidth, stageShadow: stage.boxShadow }; });
    await context.close();
    assert.deepEqual(ends, { border: "0px", shadow: "none", stageBorder: "0px", stageShadow: "none" });
  });
});

describe("the entrance", () => {
  // The header is finished at build time (sites/header-markup.mjs), so nothing in it animates on load either: these read every animation on the page.

  test("across the entrance nothing below the mark moves and the layout shift is 0", async () => {
    // Measured from the moment Geist is ready, which is within the first frames of the entrance (it runs 300ms from load). The skill's
    // inlined Geist is `font-display: swap`, so on a load where the first paint comes before the font the line reflows once, a few
    // pixels, in the first ~40ms: that is the skill's, not the entrance's, and it is logged for Basalt's backlog (see the report).
    for (const [width, height, touch] of [[1440, 900, false], [390, 844, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: "dark", reducedMotion: "no-preference", hasTouch: touch, isMobile: touch });
      await context.addInitScript(() => {
        window.__shifts = [];
        new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__shifts.push({ t: e.startTime, v: e.value }); }).observe({ type: "layout-shift", buffered: true });
        window.__boxes = () => [".hero-line", ".hero-lead", ".hero-actions", ".hero-status", ".next-title"].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [s, r.left, r.top, r.width, r.height]; });
      });
      await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
      const page = await context.newPage();
      await page.goto(HOST);
      await page.evaluate(async () => { await document.fonts.ready; window.__t0 = performance.now(); window.__first = window.__boxes(); });
      await page.waitForTimeout(800);
      const res = await page.evaluate(() => {
        const last = window.__boxes();
        return { cls: window.__shifts.filter((s) => s.t >= window.__t0).reduce((a, s) => a + s.v, 0), moved: Math.max(...window.__first.map((b, i) => Math.max(...b.slice(1).map((v, j) => Math.abs(v - last[i][j + 1]))))) };
      });
      await context.close();
      assert.deepEqual(res, { cls: 0, moved: 0 }, `${width}`);
    }
  });

  test("with motion on, only One bridge's own parts animate; under reduced motion nothing animates and the mark is at rest from the first frame", async () => {
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "no-preference" });
      await context.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => { window.__anims = document.getAnimations().map((a) => ({ target: a.effect.target.getAttribute("class"), inMark: !!a.effect.target.closest(".hero-mark"), inLinks: !!a.effect.target.closest(".basalt-site-links") })); }); });
      await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
      const page = await context.newPage();
      await page.goto(HOST);
      const anims = await page.evaluate(() => window.__anims);
      await context.close();
      assert.deepEqual(anims.map((a) => a.target).sort(), ["p-agent", "p-bar"], "One bridge's agent and bar");
      assert.ok(anims.every((a) => a.inMark));
    }
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
      await context.addInitScript(() => { document.addEventListener("DOMContentLoaded", () => { window.__first = { anims: document.getAnimations().map((a) => ({ inLinks: !!a.effect.target.closest(".basalt-site-links") })), marks: [...document.querySelectorAll(".hero-mark path")].map((p) => { const cs = getComputedStyle(p); return [cs.opacity, cs.transform, cs.animationName]; }) }; }); });
      await context.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: built.html }) : route.abort()));
      const page = await context.newPage();
      await page.goto(HOST);
      await page.waitForTimeout(300);
      const first = await page.evaluate(() => window.__first);
      const later = await page.evaluate(() => document.getAnimations().map((a) => ({ inLinks: !!a.effect.target?.closest?.(".basalt-site-links") })));
      await context.close();
      assert.deepEqual(first.anims, [], "nothing animates in the first frame");
      assert.deepEqual(later, [], "nothing animates after it");
      for (const [opacity, transform, name] of first.marks) assert.deepEqual([opacity, transform, name], ["1", "none", "none"], "the mark is at rest");
    }
  });
});
