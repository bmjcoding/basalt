// The harness: the same checks on every page under sites/ and on the fixtures, so a later builder adds a page and gets them without
// writing them. Each page is built once, then driven in Chromium on a fake host. Behaviour tests load no web font beyond the Geist the
// page inlines, so text widths differ a little on CI's Linux runner: every measured margin here is wider than a fallback font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { allPages, axe, buildAll, HOST, inlinedText, launch, menuTrigger, openHtml, repoRoot, settled } from "./support.mjs";

const { checkHeadroom } = await import("@srasyndicate/basalt/testing");

let browser;
let pages = [];
before(async () => {
  browser = await launch();
  pages = buildAll();
});
after(async () => { await browser?.close(); });

/** Every page, under its own name, so a failure says which page. */
function eachPage(name, body) {
  const listed = allPages();
  assert.ok(listed.length > 0, "there is at least the fixture to run on");
  for (const listing of listed) test(`${listing.id}: ${name}`, async (t) => body(pages.find((p) => p.id === listing.id), t));
}

const rel = (file) => path.relative(repoRoot, file);

describe("a built page is one file with no network and no way back into the repo", () => {
  eachPage("it builds, and makes no network request", async (page) => {
    assert.ok(page.html.startsWith("<!doctype html>"));
    const { page: p, context, errors, requests } = await openHtml(browser, page.html);
    assert.deepEqual(requests, [], "a request that is not the page itself");
    assert.deepEqual(errors, []);
    await context.close();
  });

  eachPage("it has no reference into the repo", async (page) => {
    // A src, href, poster, srcset, action or url() that is not a fragment, a data: URL, a root-relative path or an absolute URL is a path
    // that only works from a folder of the repo; and no absolute path of this machine, and no way up out of the page.
    const values = [...page.html.matchAll(/\b(?:src|href|poster|action|data|srcset)\s*=\s*"([^"]*)"/g)].map((m) => m[1]).concat([...page.html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]));
    const relative = values.filter((v) => v && !/^(#|data:|\/(?!\/)|https?:|mailto:|tel:|javascript:)/i.test(v));
    assert.deepEqual(relative, [], "a relative path in a built page");
    for (const v of values) assert.ok(!/(^|\/)(brand|packages|sites|node_modules|tools)\//.test(v) || /^(data:|https?:)/i.test(v) || v.startsWith("/"), `${v} reaches into the repo`);
    assert.ok(!page.html.includes(repoRoot), "an absolute path of this machine");
    assert.ok(!/(?:src|href)\s*=\s*"\.\.\//.test(page.html), "a way up out of the page");
    assert.ok(!/@include|@data/.test(page.html.replace(/\/\* (?:end )?@include [^*]*\*\//g, "")), "an include left unresolved");
  });

  eachPage("every brand/ file it includes appears in the built page byte for byte", async (page) => {
    for (const include of page.includes.filter((i) => i.name.startsWith("brand/"))) {
      const bytes = fs.readFileSync(include.file);
      if (include.kind === "data") {
        const url = `base64,${bytes.toString("base64")}`;
        assert.ok(page.html.includes(url), `${include.name} is not in the page as a data URL, byte for byte`);
      } else {
        assert.ok(page.html.includes(inlinedText(include.name, bytes.toString("utf8"))), `${include.name} is not in the page byte for byte (a brand svg but for its root's three attributes and its title)`);
        assert.equal(Buffer.from(bytes.toString("utf8"), "utf8").equals(bytes), true, `${include.name} is not valid UTF-8, so it cannot be a text include`);
      }
    }
  });
});

describe("the theme", () => {
  eachPage("with nothing stored it takes the system theme, dark and light; the toggle switches it", async (page) => {
    for (const scheme of ["dark", "light"]) {
      const { page: p, context, errors } = await openHtml(browser, page.html, { scheme });
      assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), scheme, `the system's ${scheme}`);
      const toggle = p.locator("[data-theme-toggle]:visible").first();
      if (await toggle.count()) {
        await toggle.click();
        const other = scheme === "dark" ? "light" : "dark";
        assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), other, "the toggle switches it");
        assert.equal(await p.evaluate(() => localStorage.getItem("basalt-theme")), other, "and remembers it");
        await toggle.click();
        assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), scheme, "and back");
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  });

  eachPage("a stored choice wins over the system's", async (page) => {
    const { page: p, context } = await openHtml(browser, page.html, { scheme: "dark", storage: { "basalt-theme": "light" } });
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "light");
    await context.close();
  });
});

describe("console, accessibility and layout", () => {
  eachPage("no console error or warning, in either theme, with the menu opened and closed", async (page) => {
    for (const scheme of ["dark", "light"]) {
      for (const width of [1440, 390]) {
        const { page: p, context, errors } = await openHtml(browser, page.html, { scheme, width });
        const trigger = menuTrigger(p);
        if (width === 390 && (await trigger.count())) {
          await trigger.click();
          await settled(p);
          await p.keyboard.press("Escape");
          await settled(p);
        }
        assert.deepEqual(errors, [], `${scheme} at ${width}`);
        await context.close();
      }
    }
  });

  eachPage("axe finds nothing in either theme at 1440 and 390, and at 390 with the menu open", async (page) => {
    for (const scheme of ["dark", "light"]) {
      for (const width of [1440, 390]) {
        const { page: p, context } = await openHtml(browser, page.html, { scheme, width });
        assert.deepEqual(await axe(p), [], `${scheme} at ${width}`);
        if (width === 390 && (await menuTrigger(p).count())) {
          await menuTrigger(p).click();
          await settled(p);
          assert.deepEqual(await axe(p), [], `${scheme} at 390, the menu open`);
        }
        await context.close();
      }
    }
  });

  eachPage("no sideways scroll at 320, 390, 720 and 1440", async (page) => {
    for (const width of [320, 390, 720, 1440]) {
      const { page: p, context } = await openHtml(browser, page.html, { width });
      const wide = await p.evaluate(() => ({ document: document.documentElement.scrollWidth - window.innerWidth, body: document.body.scrollWidth - window.innerWidth }));
      assert.ok(wide.document <= 0 && wide.body <= 0, `${width}: the page is ${JSON.stringify(wide)} wider than the screen`);
      await context.close();
    }
  });

  eachPage("on a coarse pointer at 390 every link and button in the first screen is at least 44 by 44", async (page) => {
    const { page: p, context } = await openHtml(browser, page.html, { width: 390, touch: true });
    assert.equal(await p.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "the context is a touch device");
    const small = await p.evaluate(() => {
      // A link inside running text keeps its inline size (WCAG 2.5.8's inline exception, as the skill's own touch rule does); every
      // other link and button counts, wherever it sits, and so does one that is off the first screen by its top edge only.
      const inline = (el) => el.matches("a") && el.closest("p, .prose, .small, .hint, .error, .callout-body");
      return [...document.querySelectorAll("a[href], button, [role=button], input, select, textarea, summary")]
        .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[inert], [hidden]") && !inline(el))
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0)
        .filter(({ r }) => r.width < 43.99 || r.height < 43.99)
        .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).trim().split(/\s+/).join(".")}` : ""} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}" ${Math.round(r.width * 10) / 10}x${Math.round(r.height * 10) / 10}`);
    });
    assert.deepEqual(small, [], "smaller than 44 by 44");
    await context.close();
  });

  eachPage("it loads clean in forced colours and under reduced motion", async (page) => {
    for (const mode of [{ forcedColors: "active" }, { reducedMotion: "reduce" }, { forcedColors: "active", reducedMotion: "reduce", width: 390 }]) {
      const { page: p, context, errors, requests } = await openHtml(browser, page.html, mode);
      if (mode.forcedColors === "active") assert.equal(await p.evaluate(() => matchMedia("(forced-colors: active)").matches), true);
      const bar = p.locator("header.basalt-chrome");
      if (await bar.count()) {
        const style = await bar.evaluate((el) => { const s = getComputedStyle(el); return { filter: s.backdropFilter, background: s.backgroundColor, alpha: s.backgroundColor }; });
        if (mode.forcedColors === "active") assert.equal(style.filter, "none", "no blur in forced colours");
      }
      assert.deepEqual([errors, requests], [[], []], JSON.stringify(mode));
      await context.close();
    }
  });
});

describe("print", () => {
  eachPage("printed for real the page is in the light theme and the bar is static and opaque", async (page) => {
    const { page: p, context, errors } = await openHtml(browser, page.html, { scheme: "dark" });
    // page.pdf fires beforeprint (print-media emulation alone does not), and that is what puts the page in the light theme. The bar is
    // read inside that event, under print media, after the page's own beforeprint handler has run.
    await p.emulateMedia({ media: "print" });
    await settled(p);
    await p.evaluate(() => {
      window.__print = [];
      // The page's own colour resolved to its alpha by a canvas, whatever form the browser computes it in (rgb, oklch with alpha, color()).
      const alphaOf = (css) => { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d"); x.clearRect(0, 0, 1, 1); x.fillStyle = css; x.fillRect(0, 0, 1, 1); return x.getImageData(0, 0, 1, 1).data[3]; };
      window.addEventListener("beforeprint", () => {
        const bar = document.querySelector("header.basalt-chrome");
        const s = bar && getComputedStyle(bar);
        window.__print.push({
          theme: document.documentElement.getAttribute("data-theme"),
          bar: bar ? { alpha: alphaOf(s.backgroundColor), line: alphaOf(s.borderBottomColor), filter: s.backdropFilter, animations: bar.getAnimations().length } : null,
        });
      });
    });
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark");
    const pdf = await p.pdf();
    assert.ok(pdf.length > 1000, "a pdf was made");
    const seen = await p.evaluate(() => window.__print);
    assert.equal(seen.length, 1, "beforeprint fired once");
    assert.equal(seen[0].theme, "light", "the page prints in the light theme");
    if (seen[0].bar) {
      assert.equal(seen[0].bar.filter, "none", "the bar has no blur in print");
      assert.equal(seen[0].bar.animations, 0, "the bar is static: nothing is animating on it");
      assert.equal(seen[0].bar.alpha, 255, "the bar's fill is opaque in print");
    }
    await p.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark", "and goes back after");
    assert.deepEqual(errors, []);
    await context.close();
  });
});

describe("a page with a stage", () => {
  eachPage("its headroom and quiet zones hold no pixel past art-quiet-limit (checkHeadroom)", async (page, t) => {
    const { page: probe, context } = await openHtml(browser, page.html);
    const declares = await probe.evaluate(() => !!document.querySelector(".basalt-stage[data-headroom]"));
    await context.close();
    if (!declares) return t.skip("the page declares no stage");
    const result = await checkHeadroom(browser, {
      load: async (p) => {
        await p.route("**/*", (route) => (route.request().url() === HOST ? route.fulfill({ contentType: "text/html", body: page.html }) : route.abort()));
        await p.goto(HOST);
        await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((img) => img.decode().catch(() => {}))); });
      },
    });
    assert.ok(result.ok, JSON.stringify(result.failures, null, 2));
    assert.ok(result.checked > 0, "pixels were read");
  });
});
