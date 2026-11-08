// Tests for the logo set in brand/ (run: npm run test:brand).
//
// 1. Every mark, word and lockup SVG is one <path>: no text, font, mask or style.
// 2. Drawn at 256 px tall, each of them looks the same under nonzero and evenodd.
// 3. Served as packaged (a brand folder is the web root), the head tags resolve: Chromium reads
//    /icons/manifest-<scheme>.webmanifest without errors, and every icon they name returns 200.
// 4. Each PNG's pixel size matches its name, and the icons that fill the square have no transparent pixel.
// 5. The motion: with Basalt's tokens, a hero is at rest by 400 ms and leaves no animation running; under
//    reduced motion its first frame is already at rest.
//
// BRAND_ROOT points the tests at another copy of brand/ (used to prove that each test fails when its file breaks).

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.BRAND_ROOT ?? path.join(here, ".."));
const tokensCss = fs.readFileSync(path.join(here, "..", "..", "packages", "tokens", "dist", "css", "tokens.css"), "utf8");

const BRANDS = ["sra-syndicate", "blacksand", "n1"];
const SCHEMES = ["dark", "light"];
const TYPES = {
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
};

const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

/** Every mark, word and lockup SVG of a brand, relative to brand/. Favicons, icon sources and tiles are not these. */
function drawings(brand) {
  const top = fs
    .readdirSync(path.join(root, brand))
    .filter((f) => /^(mark|lockup|avatar-512|app-512)(-.*)?\.svg$/.test(f))
    .map((f) => path.join(brand, f));
  const word = fs.existsSync(path.join(root, brand, "word"))
    ? fs.readdirSync(path.join(root, brand, "word")).filter((f) => f.endsWith(".svg")).map((f) => path.join(brand, "word", f))
    : [];
  return [...top, ...word].sort();
}

let browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

/** Serve a directory, or a map of virtual paths over it, and return the base URL. */
function serve(dir, virtual = {}) {
  const misses = [];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (url in virtual) {
      res.writeHead(200, { "content-type": TYPES[path.extname(url)] ?? "text/html" });
      return res.end(virtual[url]);
    }
    const file = path.join(dir, url);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      misses.push(url);
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ base: `http://127.0.0.1:${server.address().port}`, misses, close: () => server.close() })),
  );
}

describe("1. the drawings are one path", () => {
  for (const brand of BRANDS) {
    test(`${brand}: every mark, word and lockup is a single <path>`, () => {
      const files = drawings(brand);
      assert.ok(files.length >= 6, `${brand}: found only ${files.length} drawings`);
      for (const file of files) {
        const svg = read(file);
        assert.equal(svg.match(/<path\b/g)?.length, 1, `${file} must hold exactly one <path>`);
        for (const banned of ["text", "tspan", "mask", "style", "font", "foreignObject", "image", "use", "defs", "clipPath"]) {
          assert.ok(!new RegExp(`<${banned}[\\s>/]`, "i").test(svg), `${file} must not contain <${banned}>`);
        }
        assert.ok(!/font-family|font-size|stroke=/.test(svg), `${file} must not carry fonts or strokes`);
      }
    });

    test(`${brand}: favicon.svg keeps only its one prefers-color-scheme style`, () => {
      const svg = read(brand, "favicon.svg");
      assert.equal(svg.match(/<path\b/g)?.length, 1);
      assert.equal(svg.match(/<style\b/g)?.length, 1);
      assert.match(svg.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1], /prefers-color-scheme/);
      assert.ok(!/<(text|mask|font)[\s>/]/i.test(svg));
    });
  }
});

describe("2. nonzero and evenodd draw the same pixels", () => {
  test("every drawing, at 256 px tall", async () => {
    const page = await browser.newPage({ viewport: { width: 1600, height: 300 } });
    const shot = async (svg, rule) => {
      const sized = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} style="height:256px;width:auto;display:block">`);
      const filled = sized.replace(/<path\b/, `<path fill-rule="${rule}"`);
      await page.setContent(`<!doctype html><body style="margin:0;background:#fff;color:#000">${filled}</body>`);
      const box = await page.locator("svg").boundingBox();
      assert.ok(box.height === 256 && box.width > 0, "drawing renders at 256 px tall");
      return page.screenshot({ clip: { x: 0, y: 0, width: Math.ceil(box.width), height: 256 } });
    };
    try {
      for (const brand of BRANDS) {
        for (const file of drawings(brand)) {
          const svg = read(file);
          const a = await shot(svg, "nonzero");
          const b = await shot(svg, "evenodd");
          assert.ok(a.equals(b), `${file}: nonzero and evenodd differ`);
          assert.ok(a.length > 400, `${file}: renders nothing`);
        }
      }
    } finally {
      await page.close();
    }
  });
});

describe("3. head tags, served as packaged", () => {
  for (const brand of BRANDS) {
    for (const scheme of SCHEMES) {
      test(`${brand}, ${scheme}: manifest, apple-touch-icon and every icon resolve`, async () => {
        const dir = path.join(root, brand);
        const tags = read(brand, "icons", "head-tags.html");
        const site = await serve(dir, { "/__probe.html": `<!doctype html><html><head>${tags}</head><body>probe</body></html>` });
        const page = await browser.newPage({ colorScheme: scheme });
        try {
          await page.goto(`${site.base}/__probe.html`);
          const cdp = await page.context().newCDPSession(page);
          const { url, errors, data } = await cdp.send("Page.getAppManifest");
          assert.ok(url.endsWith(`/icons/manifest-${scheme}.webmanifest`), `Chromium read ${url}`);
          assert.deepEqual(errors, [], "manifest parse errors");
          const manifest = JSON.parse(data);
          assert.equal(manifest.icons.length, 3);

          const touch = await page.evaluate(() => document.querySelector('link[rel="apple-touch-icon"]').href);
          assert.ok(touch.endsWith(`/icons/apple-touch-icon-on-${scheme}.png`), `apple-touch-icon is ${touch}`);
          const icons = await page.evaluate(() => [...document.querySelectorAll('link[rel="icon"]')].map((l) => l.href));
          assert.ok(icons.length >= 3, "the tab icon links");

          for (const u of [touch, ...manifest.icons.map((i) => new URL(i.src, url).href), ...icons]) {
            assert.equal((await page.request.get(u)).status(), 200, `${new URL(u).pathname} must return 200`);
          }
          assert.deepEqual(site.misses.filter((m) => m !== "/favicon.ico"), [], "paths that returned 404");
        } finally {
          await page.close();
          site.close();
        }
      });
    }
  }
});

describe("4. icons", () => {
  const pngs = BRANDS.flatMap((b) => walk(path.join(root, b)).filter((f) => f.endsWith(".png")));

  /** The pixel size a PNG's name promises. */
  function promised(file) {
    const name = path.basename(file);
    if (name.startsWith("social-card")) return [1200, 630];
    if (name.startsWith("apple-touch-icon")) return [180, 180];
    const n = name.match(/-(\d+)(?:-on-|\.)/);
    return n ? [+n[1], +n[1]] : null;
  }

  test("each PNG's pixel size matches its name", () => {
    assert.ok(pngs.length >= 50, `found only ${pngs.length} PNGs`);
    for (const file of pngs) {
      const want = promised(file);
      assert.ok(want, `${path.relative(root, file)}: no size in its name`);
      const head = fs.readFileSync(file).subarray(0, 24);
      assert.equal(head.subarray(1, 4).toString(), "PNG");
      assert.equal(head.subarray(12, 16).toString(), "IHDR");
      assert.deepEqual([head.readUInt32BE(16), head.readUInt32BE(20)], want, path.relative(root, file));
    }
  });

  test("app-icon, apple-touch-icon and maskable files have no transparent pixel", async () => {
    const full = pngs.filter((f) => /^(app-icon|apple-touch-icon|maskable)-/.test(path.basename(f)));
    assert.ok(full.length >= 24, `found only ${full.length} full-bleed icons`);
    const page = await browser.newPage();
    try {
      for (const file of full) {
        const url = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
        const transparent = await page.evaluate(async (src) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const px = ctx.getImageData(0, 0, c.width, c.height).data;
          let n = 0;
          for (let i = 3; i < px.length; i += 4) if (px[i] !== 255) n++;
          return n;
        }, url);
        assert.equal(transparent, 0, `${path.relative(root, file)} has ${transparent} transparent pixels`);
      }
    } finally {
      await page.close();
    }
  });
});

describe("5. the entrance", () => {
  const SETTLE_MS = 400;

  /** A page with Basalt's tokens, the player and one brand's hero, as an app would assemble it. */
  function heroPage(brand) {
    const hero = read(brand, "hero.html");
    const css = brand === "blacksand" ? `<link rel="stylesheet" href="/one-bridge.css">` : "";
    // Records, from inside the page: when the load event fired, and the state of the mark at each point.
    const probe = `<script>
      window.__rest = null;
      window.__state = function () {
        var svg = document.querySelector('.hero-mark'), paths = [].slice.call(svg.querySelectorAll('path')), bridge = svg.classList.contains('m-bridge');
        var atRest = bridge
          ? paths.every(function (p) { var s = getComputedStyle(p); return s.opacity === '1' && (s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)'); })
          : paths.every(function (p) { return p.getAttribute('d') === p.getAttribute('data-rest'); });
        return { animations: document.getAnimations().length, playing: window.LogoMotion ? LogoMotion.playing() : 0, atRest: atRest };
      };
    </script>`;
    // Runs before the first paint: the state the very first frame will show.
    const beforePaint = `<script>window.__first = window.__state();</script>`;
    // From the load event on: the first frame at which nothing is moving and every path is at rest.
    const watch = `<script>
      window.__t0 = null; window.__trace = [];
      addEventListener('load', function () {
        window.__t0 = performance.now();
        (function tick(now) {
          var s = window.__state(), t = performance.now() - window.__t0;
          window.__trace.push({ t: t, atRest: s.atRest, animations: s.animations });
          if (window.__rest === null && s.atRest && s.animations === 0 && s.playing === 0) window.__rest = t;
          if (window.__rest === null && t < 2000) requestAnimationFrame(tick);
        })();
      });
    </script>`;
    return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><style>${tokensCss}</style>${css}
      <style>body{margin:0;background:#000;color:#fff} .hero-mark{display:block}</style>
      ${probe}<script src="/logo-motion.js"></script></head><body>${hero}${beforePaint}${watch}</body></html>`;
  }

  for (const brand of BRANDS) {
    const virtualFor = () => ({
      "/": heroPage(brand),
      "/logo-motion.js": read("motion", "logo-motion.js"),
      "/one-bridge.css": read("motion", "one-bridge.css"),
    });

    test(`${brand}: with motion on, it moves, then rests on the shipped mark within ${SETTLE_MS} ms with no animation left`, async () => {
      const site = await serve(root, virtualFor());
      const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 800, height: 600 } });
      try {
        await page.goto(`${site.base}/`);
        await page.waitForFunction(() => window.__rest !== null, null, { timeout: 5000 });
        const { rest, first, trace } = await page.evaluate(() => ({ rest: window.__rest, first: window.__first, trace: window.__trace }));
        // The entrance really starts away from rest (so a player that does nothing cannot pass)...
        assert.equal(first.atRest, false, "the first frame should be the start pose, not the resting mark");
        assert.ok(trace.some((s) => !s.atRest), "the mark was never seen moving");
        // ...and finishes inside the budget.
        assert.ok(rest <= SETTLE_MS, `at rest ${rest.toFixed(0)} ms after load; the budget is ${SETTLE_MS} ms`);
        assert.equal(await page.evaluate(() => document.getAnimations().length), 0, "document.getAnimations() is not empty");

        // Resting geometry: the hero, drawn at rest, is the shipped mark.svg, pixel for pixel.
        const shippedPath = read(brand, "mark.svg").match(/<path[^>]* d="([^"]+)"/)[1];
        assert.equal(await restingPath(page), shippedPath, "the resting paths differ from mark.svg");
        const same = await sameAsShippedMark(page, brand);
        assert.ok(same, `${brand}: the resting hero does not draw the shipped mark`);
      } finally {
        await page.close();
        site.close();
      }
    });

    test(`${brand}: under reduced motion, the first frame is already at rest, with no animation`, async () => {
      const site = await serve(root, virtualFor());
      const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 800, height: 600 } });
      try {
        await page.goto(`${site.base}/`);
        await page.waitForFunction(() => window.__rest !== null, null, { timeout: 5000 });
        const { first, trace } = await page.evaluate(() => ({ first: window.__first, trace: window.__trace }));
        assert.equal(first.atRest, true, "before the first paint the mark is not at rest");
        assert.equal(first.animations, 0, "an animation exists before the first paint");
        assert.ok(trace.every((s) => s.atRest && s.animations === 0), "the mark left rest, or an animation started");
        assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
        assert.equal(await restingPath(page), read(brand, "mark.svg").match(/<path[^>]* d="([^"]+)"/)[1], "the resting paths differ from mark.svg");
        assert.ok(await sameAsShippedMark(page, brand), `${brand}: the resting hero is not the shipped mark`);
      } finally {
        await page.close();
        site.close();
      }
    });
  }

  /** The hero's paths as they are on the page now, joined: One bridge draws mark.svg's one path as three. */
  const restingPath = (page) =>
    page.evaluate(() => [...document.querySelectorAll(".hero-mark path")].map((p) => p.getAttribute("d")).join(""));

  /**
   * Draw the hero mark and the shipped mark.svg at the same place and size and compare the pixels. One bridge's
   * three paths and mark.svg's one path put the same edges on the same coordinates, but Chromium rounds the
   * antialiasing of separate paths up to 1 of 255 apart, so the limit is 2; a moved edge differs by far more.
   */
  async function sameAsShippedMark(page, brand) {
    const shipped = read(brand, "mark.svg");
    await page.addStyleTag({
      content: ".hero-mark,.shipped{position:fixed!important;left:0!important;top:0!important;width:256px!important;height:256px!important;margin:0!important;max-width:none!important;color:#fff;background:#000}",
    });
    const clip = { x: 0, y: 0, width: 256, height: 256 };
    const a = await page.screenshot({ clip });
    await page.evaluate((svg) => {
      document.querySelector(".hero-mark").remove();
      const holder = document.createElement("div");
      holder.innerHTML = svg;
      holder.firstElementChild.classList.add("shipped");
      holder.firstElementChild.removeAttribute("width");
      holder.firstElementChild.removeAttribute("height");
      document.body.append(holder.firstElementChild);
    }, shipped);
    const b = await page.screenshot({ clip });
    const { ink, worst } = await page.evaluate(
      async ([x, y]) => {
        const read = async (b64) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, c.width, c.height).data;
        };
        const [p, q] = [await read(x), await read(y)];
        let ink = 0;
        let worst = 0;
        for (let i = 0; i < p.length; i += 4) {
          if (p[i] > 0) ink++;
          worst = Math.max(worst, Math.abs(p[i] - q[i]));
        }
        return { ink, worst };
      },
      [a.toString("base64"), b.toString("base64")],
    );
    assert.ok(ink > 4000, "the hero mark renders (almost) nothing");
    return worst <= 2;
  }
});
