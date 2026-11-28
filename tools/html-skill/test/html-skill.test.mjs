// The Basalt HTML skill: the committed files match the build, the templates are clean (no console errors, no axe
// violations, no sideways scroll) in both themes at 1440 and 390, the interactive parts work from the keyboard,
// touch hides shortcut chips, and reduced motion holds still. Run with `npm run test:html-skill`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { chromium } from "playwright";

import { launchOptions } from "../../../scripts/chromium-launch.mjs";

import { build, moduleNames, skillDir } from "../build.mjs";
import { iconData } from "../icons.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";
import { EXAMPLES, examplePage } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const files = build();
const repoRoot = path.join(skillDir, "..", "..", "..");
const TEMPLATES = ["template-static.html", "template-interactive.html"];
// The two example bodies, composed the way an agent does it. `all` adds every module, for a test that needs a part the example doesn't use.
const exampleName = (file) => file.replace(/^template-|\.html$/g, "");
const composed = (file, options = {}) => examplePage(exampleName(file), options).html;
const pages = Object.fromEntries(TEMPLATES.map((name) => [name, composed(name)]));

let browser;
before(async () => { browser = await chromium.launch(launchOptions()); });
after(async () => { await browser?.close(); });

describe("the skill files", () => {
  for (const name of Object.keys(files)) {
    test(`${name} equals the build output (run \`npm run build\` if this fails)`, () => {
      const committed = path.join(skillDir, name);
      assert.ok(fs.existsSync(committed), `${name} is missing from .agent/skills/basalt-html`);
      assert.equal(fs.readFileSync(committed, "utf8"), files[name]);
    });
  }

  test("the skill folder holds exactly SKILL.md, compose.mjs, parts/ and examples/ (nothing stale)", () => {
    const listed = (dir) => fs.readdirSync(path.join(skillDir, dir), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => path.relative(skillDir, path.join(e.parentPath, e.name))).sort();
    const expected = ["SKILL.md", ...Object.keys(files)].sort();
    assert.deepEqual([...fs.readdirSync(skillDir).filter((f) => fs.statSync(path.join(skillDir, f)).isFile()), ...listed("parts"), ...listed("examples")].sort(), expected);
  });

  test("every part is the minified source: no comment but a legal one, and the module list is complete", () => {
    assert.deepEqual(moduleNames().sort(), Object.keys(JSON.parse(files["parts/manifest.json"]).modules).sort());
    for (const name of Object.keys(files).filter((f) => /^parts\/.*\.(css|js)$/.test(f) && !f.endsWith("geist.css"))) {
      const stripped = files[name].replace(/\/\*![\s\S]*?\*\//g, "");
      assert.doesNotMatch(stripped, /\/\*|^\s*\/\//m, `${name} carries a comment`);
      assert.ok(!/\n\s/.test(files[name].replace(/\/\*![\s\S]*?\*\//g, "")), `${name} is not minified`);
    }
  });

  test("a page carries Phosphor's whole MIT notice as a legal comment whenever it draws an icon", () => {
    const mit = fs.readFileSync(path.join(repoRoot, "node_modules", "@phosphor-icons", "react", "LICENSE"), "utf8").trim();
    for (const name of TEMPLATES) {
      assert.ok(pages[name].includes(mit), `${name} carries the licence text`);
      assert.match(pages[name], /\/\*! [^\n]*Phosphor/, `${name}: a /*! comment, which minifiers keep`);
    }
    assert.ok(JSON.parse(files["parts/icons.json"]).notice.includes(mit));
  });

  test("SKILL.md names the skill, and AGENTS.md points every agent at it", () => {
    const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
    assert.match(skill, /^---\nname: basalt-html\ndescription: .{40,}\n---/);
    const agents = fs.readFileSync(path.join(skillDir, "..", "..", "..", "AGENTS.md"), "utf8");
    assert.match(agents, /\.agent\/skills\/basalt-html\/SKILL\.md/);
  });

  test("the CSS uses tokens and the two themes: data-theme and prefers-color-scheme", () => {
    const css = files["parts/core.css"];
    assert.match(css, /\[data-theme="?dark"?\]/);
    assert.match(css, /prefers-color-scheme:\s*dark/);
    for (const name of Object.keys(files).filter((f) => /^parts\/.*\.css$/.test(f) && !f.endsWith("geist.css"))) {
      const primitives = name === "parts/core.css" ? css.slice(css.indexOf("@layer basalt{")) : files[name];
      // The cut-content fade's three mask layers (DECISIONS 395 to 399, cimip-gaps-3 t7) are gradients of alpha that paint no colour. In the fade module's
      // stylesheet alone, and only as those three declarations, a gradient is allowed: each is removed by name, and the rest of that file, like every
      // other file, is held to the whole rule.
      const checked = name === "parts/fade.css" ? primitives.replace(/--_(?:mask-x|mask-y|strip):linear-gradient\([^;}]*\)(?=[;}])/g, "") : primitives;
      if (name === "parts/fade.css") assert.equal(primitives.match(/--_(?:mask-x|mask-y|strip):linear-gradient\(/g)?.length, 3, "the fade's three approved mask layers, and no other");
      assert.doesNotMatch(checked, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|gradient\(/i, `${name}: no raw colour or gradient in the primitives`);
    }
  });

  test("the JS has no import-time work beyond defining window.Basalt (the core and every module)", () => {
    const calls = [];
    const events = [];
    const document = { addEventListener: (type) => events.push(type), querySelectorAll: () => { calls.push("query"); return []; }, documentElement: {} };
    const window = {};
    const all = ["core", ...moduleNames()].map((n) => files[`parts/${n}.js`]).filter(Boolean).join("\n");
    new Function("window", "document", "matchMedia", "localStorage", "sessionStorage", "navigator", "customElements", all)(window, document, () => ({ matches: false }), {}, {}, {}, undefined);
    assert.ok(window.Basalt && typeof window.Basalt.init === "function");
    assert.deepEqual([calls, events], [[], []]);
  });
});

async function open(file, { scheme = "light", width = 1440, touch = false, reducedMotion = "no-preference", permissions, transform = (html) => html, all = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion, isMobile: touch, hasTouch: touch, permissions,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
  // a real (fake-host) origin, so storage and the clipboard work, as they do from a hosted file
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: transform(all ? composed(file, { all: true }) : pages[file]) }));
  await page.goto("https://basalt.test/");
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, context, errors };
}

const axe = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));
};

for (const file of TEMPLATES) {
  for (const scheme of ["light", "dark"]) {
    for (const width of [1440, 390]) {
      test(`${file}: no console errors, no axe violations, no sideways scroll (${scheme}, ${width}px)`, async () => {
        const { page, context, errors } = await open(file, { scheme, width, touch: width === 390 });
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), scheme, "the head snippet follows the system theme");
        assert.deepEqual(await axe(page), []);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "the page scrolls sideways");
        if (file === "template-interactive.html") {
          await page.keyboard.press("Control+k");
          await page.locator(".palette input").waitFor();
          await settle(page);
          assert.deepEqual(await axe(page), [], "the open palette");
        }
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  }
}

describe("the interactive template, from the keyboard", () => {
  test("Cmd or Ctrl+K opens the palette with focus in the input; arrows and Enter run a command; Escape returns focus", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.locator("[data-open-palette]").focus();
    await page.keyboard.press("Control+k");
    const input = page.locator(".palette input");
    await input.waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.matches(".palette input")), true);
    assert.equal(await page.locator(".palette").getAttribute("role"), "dialog");
    assert.equal(await page.locator(".palette").getAttribute("aria-modal"), "true");
    assert.equal(await page.evaluate(() => document.querySelector("main").inert), true, "the page behind is inert");
    // no animation at all
    assert.equal(await page.locator(".palette").evaluate((el) => el.getAnimations().length), 0);
    const first = await input.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    assert.notEqual(await input.getAttribute("aria-activedescendant"), first);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.matches(".palette input")), true, "Tab stays in the dialog");
    await page.keyboard.type("json");
    assert.equal(await page.locator(".palette [role=option]").count(), 2, "Show JSON and Copy JSON");
    await page.keyboard.press("Enter");
    await page.locator(".palette").waitFor({ state: "detached" });
    assert.equal(await page.locator("#tab-json").getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#view-json").isVisible(), true);
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".palette").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-json", "focus returns to what had it");
    assert.equal(await page.evaluate(() => document.querySelector("main").inert), false);
    await context.close();
  });

  test("the trigger button opens the palette and Escape closes it", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.locator("[data-open-palette]").focus();
    await page.keyboard.press("Enter");
    await page.locator(".palette input").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".palette").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-open-palette")), true);
    await context.close();
  });

  test("tabs: arrows, Home and End move and select; only the selected tab is a tab stop", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.locator("#tab-summary").focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#tab-breakdown").getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#view-breakdown").isVisible(), true);
    assert.equal(await page.locator("#view-summary").isVisible(), false);
    assert.equal(await page.locator("#tab-summary").getAttribute("tabindex"), "-1");
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-json");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-summary", "wraps");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-json");
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => document.activeElement.id), "tab-summary");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "view-summary", "the panel is the next stop");
    await context.close();
  });

  test("disclosure: Enter and Space open and close it, and aria-expanded follows", async () => {
    const { page, context } = await open("template-interactive.html");
    const button = page.locator("[data-disclosure]");
    await button.focus();
    assert.equal(await button.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#assumptions").isVisible(), false);
    await page.keyboard.press("Enter");
    assert.equal(await button.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#assumptions").isVisible(), true);
    await page.keyboard.press("Space");
    assert.equal(await button.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#assumptions").isVisible(), false);
    await context.close();
  });

  test("copy: Enter on the copy button puts the code on the clipboard, says so, and restores the label", async () => {
    const { page, context } = await open("template-interactive.html", { permissions: ["clipboard-read", "clipboard-write"] });
    await page.locator("#tab-json").click();
    const button = page.locator("[data-copy]");
    await button.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("[data-copy]").textContent.includes("Copied"));
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator("#json").textContent());
    await page.waitForFunction(() => document.querySelector("#basalt-live")?.textContent === "Copied to clipboard");
    await page.waitForFunction(() => document.querySelector("[data-copy]").textContent.includes("Copy") && !document.querySelector("[data-copy]").textContent.includes("Copied"), null, { timeout: 4000 });
    await context.close();
  });

  test("the theme toggle switches and remembers the theme, and names what a press does", async () => {
    const { page, context } = await open("template-interactive.html", { scheme: "light" });
    const toggle = page.locator("[data-theme-toggle]");
    assert.equal(await toggle.getAttribute("aria-label"), "Switch to dark theme");
    await toggle.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
    assert.equal(await toggle.getAttribute("aria-label"), "Switch to light theme");
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-theme")), "dark");
    await context.close();
  });

  test("inputs update the figures and an invalid value is flagged in words", async () => {
    const { page, context } = await open("template-interactive.html");
    const before = await page.locator("#out-cost").textContent();
    await page.locator("#rps").fill("800");
    assert.notEqual(await page.locator("#out-cost").textContent(), before);
    await page.locator("#cache").fill("140");
    assert.equal(await page.locator("#cache").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#cache-error").isVisible(), true);
    await context.close();
  });
});

describe("touch", () => {
  test("shortcut chips are hidden until a hardware key; a data-doc chip stays; fine pointers keep them", async () => {
    const display = (page, selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).display);
    const phone = await open("template-interactive.html", { touch: true, width: 390 });
    assert.equal(await display(phone.page, ".topbar .kbd-group"), "none");
    await phone.page.keyboard.press("Shift");
    assert.equal(await display(phone.page, ".topbar .kbd-group"), "none", "Shift alone does not reveal");
    await phone.page.keyboard.press("Tab");
    assert.notEqual(await display(phone.page, ".topbar .kbd-group"), "none");
    assert.equal(await phone.page.evaluate(() => sessionStorage.getItem("basalt-keyboard")), "hardware");
    await phone.context.close();

    const doc = await open("template-static.html", { touch: true, width: 390 });
    assert.notEqual(await display(doc.page, "kbd[data-doc]"), "none", "a key documented in running text stays");
    await doc.context.close();

    const desktop = await open("template-interactive.html");
    assert.notEqual(await display(desktop.page, ".topbar .kbd-group"), "none");
    await desktop.context.close();
  });

  for (const file of TEMPLATES) {
    test(`touch targets are at least 44px, links on their own included (${file})`, async () => {
      const { page, context } = await open(file, { touch: true, width: 390 });
      const small = await page.evaluate(() => [...document.querySelectorAll("button, input, select, [role=tab], a:not(.prose a)")].filter((el) => el.offsetParent).map((el) => [el.id || el.className || el.tagName, el.getBoundingClientRect()]).filter(([, r]) => r.height < 43.5 || r.width < 43.5).map(([n, r]) => `${n} ${Math.round(r.width)}x${Math.round(r.height)}`));
      assert.deepEqual(small, []);
      assert.ok(await page.evaluate(() => document.querySelector("a.brand").getBoundingClientRect().height >= 44), "the brand link is a tap target");
      await context.close();
    });
  }
});

describe("reduced motion", () => {
  const spinners = '<span class="spinner" id="ring"></span><braille-spinner></braille-spinner>';

  test("holds still: braille is a held frame, the ring and the busy button stand still (no loop runs, cimip-gaps-3 T1), nothing moves", async () => {
    const { page, context } = await open("template-interactive.html", { reducedMotion: "reduce", all: true });
    await page.locator("#recalc").click();
    await page.evaluate((html) => { document.querySelector("#status").insertAdjacentHTML("afterend", html); }, spinners);
    await page.waitForSelector("braille-spinner .braille-dot");
    const report = await page.evaluate(() => {
      const kinds = document.getAnimations().map((a) => ({ name: a.animationName ?? a.transitionProperty, properties: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)) }));
      const dot = getComputedStyle(document.querySelector(".braille-dot"));
      const held = [...document.querySelectorAll("braille-spinner .braille-dot")].map((d) => getComputedStyle(d).opacity);
      const busy = getComputedStyle(document.querySelector("#recalc"), "::after");
      const ring = getComputedStyle(document.querySelector("#ring"));
      return { kinds, animationName: dot.animationName, held, busyRing: busy.animationName, busyArc: busy.borderTopColor === busy.color, ring: ring.animationName, ringArc: ring.borderTopColor === ring.color, infinite: document.getAnimations().filter((a) => a.effect.getComputedTiming().iterations === Infinity).map((a) => a.animationName) };
    });
    assert.equal(report.animationName, "none", "braille does not step");
    assert.equal(report.busyRing, "none", "the busy ring stands still");
    assert.equal(report.busyArc, true, "its quarter arc stays in currentColor");
    assert.equal(report.ring, "none", "the ring stands still");
    assert.equal(report.ringArc, true, "the ring's quarter arc stays in currentColor");
    assert.deepEqual(report.infinite, [], "no loop runs");
    assert.deepEqual(report.held, ["1", "1", "0", "1", "0", "0"], "braille holds its first frame (⠋: dots 1, 2 and 4 of the six)");
    for (const k of report.kinds) assert.ok(k.properties.every((p) => ["opacity", "backgroundColor", "color", "boxShadow"].includes(p)), `${k.name} animates ${k.properties.join(", ")}: only opacity and colour steps may run`);
    await context.close();
  });

  test("with motion allowed the braille spinner steps and the ring and the busy button turn", async () => {
    const { page, context } = await open("template-interactive.html", { all: true });
    await page.locator("#recalc").click();
    await page.evaluate((html) => { document.querySelector("#status").insertAdjacentHTML("afterend", html); }, spinners);
    const names = await page.evaluate(() => document.getAnimations().map((a) => a.animationName));
    assert.ok(names.includes("bh-spin") && names.includes("bh-b1"), names.join(", "));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#recalc"), "::after").animationName), "bh-spin");
    await context.close();
  });
});

// ---- Review fixes: each of these failed before the fix ----


describe("the icon helper", () => {
  test("a size can never close the attribute: it is coerced to a finite positive number", async () => {
    const { page, context } = await open("template-static.html", { all: true });
    const out = await page.evaluate(() => {
      const evil = '16"></svg><img src=/missing onerror="window.__injected=1"><svg a="';
      const sizes = [evil, 0, -4, NaN, Infinity, null, undefined, "24", 20].map((size) => window.Basalt.icon("Info", { size }).match(/ width="([^"]*)"/)[1]);
      document.body.insertAdjacentHTML("beforeend", window.Basalt.icon("Info", { size: evil }));
      return { sizes, images: document.querySelectorAll("body > img, svg img").length, injected: window.__injected ?? false };
    });
    assert.deepEqual(out.sizes, ["16", "16", "16", "16", "16", "16", "16", "24", "20"]);
    assert.deepEqual([out.images, out.injected], [0, false]);
    await context.close();
  });

  test("an unknown icon name warns once, draws nothing, and never stops Basalt.init", async () => {
    const { page, context, errors } = await open("template-interactive.html", { transform: (html) => html.replace('data-glyph="search"', 'data-icon="Sparkles"').replace('data-glyph="copy"', 'data-icon="Sparkles"') });
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /unknown icon "Sparkles"/);
    assert.equal(await page.locator("[data-icon]").count(), 0, "the element is replaced by nothing");
    assert.ok(await page.locator("[data-theme-toggle]").getAttribute("aria-label"), "the theme toggle is wired and named");
    assert.equal(await page.locator("#tab-summary").getAttribute("tabindex"), "0", "tabs are wired");
    assert.ok(await page.locator(".topbar .kbd").count() > 0, "kbd chips are drawn");
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await context.close();
  });

  test("a wiring step that throws is isolated: the others still run", async () => {
    const { page, context, errors } = await open("template-static.html", { all: true, transform: (html) => html.replace("</main>", '<script type="application/json" data-palette>{ not json</script></main>') });
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /Basalt: .* failed/);
    await page.locator("[data-disclosure]").click();
    assert.equal(await page.locator("[data-disclosure]").getAttribute("aria-expanded"), "true");
    await context.close();
  });
});

describe("the palette", () => {
  test("a link may be relative, http, https, mailto or tel (the safe-sinks rule); javascript:, data: and obfuscated schemes are refused, and the palette still closes", async () => {
    const { page, context, errors } = await open("template-static.html", { all: true });
    const hrefs = ["javascript:window.__executed=1;void 0", "  JavaScript:window.__executed=1", "java\tscript:window.__executed=1", "data:text/html,<script>parent.__executed=1</script>", "vbscript:x", "file:///etc/hosts"];
    for (const href of hrefs) {
      await page.evaluate((h) => window.Basalt.openPalette({ groups: [{ items: [{ label: "Untrusted", href: h }] }] }), href);
      await page.keyboard.press("Enter");
      await page.locator(".palette").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(() => window.__executed ?? false), false, href);
      assert.equal(await page.locator(".palette").count(), 0, "the palette closed");
      assert.equal(page.url(), "https://basalt.test/", href);
    }
    assert.equal(errors.length, hrefs.length);
    assert.ok(errors.every((e) => /palette link must be relative, http, https, mailto or tel/.test(e)), errors.join("\n"));
    await context.close();
    // Each allowed link gets its own page, and the test waits for the navigation that link starts. One shared page went
    // back with goto while a relative link's navigation could still be in flight, which a slow runner turned into an
    // interrupted goto (the old wait, waitForURL(() => true), matched the current URL and returned at once).
    for (const href of ["#changes", "?page=2", "/other", "https://basalt.test/abs", "http://basalt.test/plain", "mailto:hello@example.com"]) {
      const { page, context, errors } = await open("template-static.html", { all: true });
      const target = href.startsWith("mailto:") ? null : new URL(href, "https://basalt.test/").href;
      // A hash link stays in the document, so it changes the URL without a request; mailto leaves the page alone.
      const navigated = target === null ? null : href.startsWith("#") ? page.waitForURL(target) : page.waitForRequest(target);
      await page.evaluate((h) => window.Basalt.openPalette({ groups: [{ items: [{ label: "Go", href: h }] }] }), href);
      await page.keyboard.press("Enter");
      if (navigated) await navigated; // a refused link starts no navigation, so this wait would time out
      else await page.waitForTimeout(30);
      // only the refusal counts: an unserved http:// page can log its own load failure, which says nothing about the palette
      assert.deepEqual(errors.filter((e) => /palette link must be/.test(e)), [], `${href} is allowed`);
      await context.close();
    }
  });

  test("a palette that fails to render leaves the page usable: not inert, scrollable, no listener, and the next palette opens", async () => {
    const { page, context } = await open("template-interactive.html");
    const before = await page.evaluate(() => { let n = 0; const add = document.addEventListener; document.addEventListener = function (type, ...rest) { if (type === "keydown") n++; return add.call(this, type, ...rest); }; window.__keydownAdds = () => n; return n; });
    const failed = await page.evaluate(() => { try { window.Basalt.openPalette({ groups: [{ label: "Broken", items: [null] }] }); return null; } catch (e) { return e.message; } });
    assert.ok(failed, "the bad data is reported to the caller");
    const state = await page.evaluate(() => ({ inert: !!document.querySelector("[inert]"), overflow: document.documentElement.style.overflow, palette: !!document.querySelector(".palette"), added: window.__keydownAdds() }));
    assert.deepEqual(state, { inert: false, overflow: "", palette: false, added: before });
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await page.keyboard.press("Escape");
    await page.locator(".palette").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => !!document.querySelector("[inert]")), false);
    await context.close();
  });

  test("a failure after the page is locked rolls the lock back", async () => {
    const { page, context } = await open("template-interactive.html");
    const out = await page.evaluate(() => {
      const real = HTMLElement.prototype.focus;
      HTMLElement.prototype.focus = function () { if (this.matches?.(".palette input")) throw new Error("focus failed"); return real.apply(this, arguments); };
      let error;
      try { window.Basalt.openPalette({ groups: [{ items: [{ label: "Run" }] }] }); } catch (e) { error = e.message; }
      HTMLElement.prototype.focus = real;
      return { error, inert: !!document.querySelector("[inert]"), overflow: document.documentElement.style.overflow, palette: !!document.querySelector(".palette") };
    });
    assert.deepEqual(out, { error: "focus failed", inert: false, overflow: "", palette: false });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await context.close();
  });

  test("an IME composition never activates, moves or closes anything", async () => {
    const { page, context } = await open("template-static.html", { all: true });
    await page.evaluate(() => window.Basalt.openPalette({ groups: [{ items: [{ label: "Alpha", onSelect: () => { window.__ran = "alpha"; } }, { label: "Beta", onSelect: () => { window.__ran = "beta"; } }] }] }));
    const press = (init) => page.evaluate((i) => { document.querySelector(".palette input").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...i })); }, init);
    const active = () => page.locator(".palette input").getAttribute("aria-activedescendant");
    const first = await active();
    await press({ key: "Enter", isComposing: true });
    await press({ key: "Process", keyCode: 229 });
    await press({ key: "Enter", keyCode: 229 });
    await press({ key: "ArrowDown", isComposing: true });
    await press({ key: "Escape", isComposing: true });
    assert.equal(await page.evaluate(() => window.__ran ?? null), null);
    assert.equal(await page.locator(".palette").count(), 1, "still open");
    assert.equal(await active(), first, "the highlighted row did not move");
    await press({ key: "ArrowDown" });
    await press({ key: "Enter" });
    assert.equal(await page.evaluate(() => window.__ran), "beta", "a real Enter still runs the command");
    await context.close();
  });

  test("the global Ctrl+K ignores a composing keydown", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, isComposing: true, bubbles: true, cancelable: true })));
    assert.equal(await page.locator(".palette").count(), 0);
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, keyCode: 229, bubbles: true, cancelable: true })));
    assert.equal(await page.locator(".palette").count(), 0);
    await page.keyboard.press("Control+k");
    await page.locator(".palette").waitFor();
    await context.close();
  });

  test("the result count is spoken inside the dialog, once the typing pauses, and only when it changed", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.evaluate(() => { window.__spoken = []; new MutationObserver(() => window.__spoken.push(document.querySelector(".palette .command-count [role=status]")?.textContent)).observe(document.body, { subtree: true, childList: true, characterData: true }); });
    // The count is spoken once the typing pauses: the page's timers are on the shared clock from before the palette opens, so the pause is the test's to give, not the machine's.
    const clock = await freezeAnimations(page);
    await page.keyboard.press("Control+k");
    for (let tries = 0; tries < 100 && !(await page.evaluate(() => !!document.querySelector(".palette input"))); tries++) await clock.advance(16);
    assert.equal(await page.evaluate(() => !!document.querySelector(".palette [role=status]")), true, "the live region is inside the dialog");
    await page.keyboard.type("show json", { delay: 50 });
    await clock.advance(900);
    const spoken = (await page.evaluate(() => window.__spoken)).filter(Boolean);
    assert.ok(spoken.length <= 2, `spoken ${JSON.stringify(spoken)}`);
    // cimip-gaps-3 t6: the palette's foot counts as the command list's does ("2 of 9"), and its first text, on opening, is not spoken.
    assert.match(spoken.at(-1), /^\d+ of \d+$|^\d+ commands?$/);
    assert.equal(await page.evaluate(() => document.getElementById("basalt-live")?.textContent ?? ""), "", "the page-level region is not used");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("n", { delay: 10 });
    const after = await page.evaluate(() => window.__spoken.length);
    await clock.advance(700);
    assert.equal(await page.evaluate(() => window.__spoken.length), after, "the same count is not spoken again");
    await context.close();
  });

  test("the input is described by the hints footer only while its chips show", async () => {
    const described = (page) => page.evaluate(() => {
      const id = document.querySelector(".palette input").getAttribute("aria-describedby");
      const el = id && document.getElementById(id);
      return el ? { footer: el.classList.contains("command-hints") && !!el.closest(".command-foot"), words: ["Navigate", "Run", "Close"].filter((w) => el.textContent.includes(w)) } : null;
    });
    const desktop = await open("template-interactive.html");
    await desktop.page.keyboard.press("Control+k");
    await desktop.page.locator(".palette input").waitFor();
    assert.deepEqual(await described(desktop.page), { footer: true, words: ["Navigate", "Run", "Close"] });
    await desktop.context.close();

    const phone = await open("template-interactive.html", { touch: true, width: 390 });
    await phone.page.evaluate(() => window.Basalt.openPalette({ groups: [{ items: [{ label: "Run" }] }] }));
    assert.equal(await described(phone.page), null, "touch hides the chips, so nothing describes the input");
    await phone.page.keyboard.press("Tab");
    assert.deepEqual((await described(phone.page)).words, ["Navigate", "Run", "Close"], "a hardware key brings them back");
    await phone.context.close();
  });
});

describe("the copy button", () => {
  test("the fallback copy gives back the focus and the selection it borrowed", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.evaluate(() => { Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }); });
    await page.locator("#tab-json").click();
    // a document selection and a focused button
    await page.evaluate(() => { const p = document.querySelector(".lead"); const r = document.createRange(); r.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(r); window.__selected = getSelection().toString(); });
    await page.locator("[data-copy]").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("[data-copy]").textContent.includes("Copied"));
    const out = await page.evaluate(() => ({ active: document.activeElement.hasAttribute("data-copy"), selection: getSelection().toString() === window.__selected && window.__selected.length > 0 }));
    assert.deepEqual(out, { active: true, selection: true });
    // a focused field and its selection
    const field = await page.evaluate(async () => {
      document.querySelector("main").insertAdjacentHTML("beforeend", '<input id="txt" type="text" value="abcdef">');
      const input = document.querySelector("#txt");
      input.focus();
      input.setSelectionRange(1, 3);
      await window.Basalt.copyText("hello");
      return { active: document.activeElement.id, range: [input.selectionStart, input.selectionEnd] };
    });
    assert.deepEqual(field, { active: "txt", range: [1, 3] });
    await context.close();
  });

  test("pressing copy twice inside the feedback window still ends on the original label, icon-only included", async () => {
    const { page, context } = await open("template-interactive.html", { permissions: ["clipboard-read", "clipboard-write"] });
    await page.locator("#tab-json").click();
    await page.evaluate(() => {
      document.querySelector("main").insertAdjacentHTML("beforeend", '<button class="btn" id="icon-copy" data-icon-only data-copy-text="x" aria-label="Copy payload"><i data-icon="Download"></i></button>');
      window.Basalt.init();
    });
    const rest = await page.evaluate(() => [document.querySelector("[data-copy]").innerHTML, document.querySelector("#icon-copy").innerHTML]);
    for (const selector of ["[data-copy]", "#icon-copy"]) {
      await page.locator(selector).click();
      await page.waitForFunction((sel) => /Copied/.test(document.querySelector(sel).textContent) || document.querySelector(sel).getAttribute("aria-label") === "Copied", selector); // the feedback is showing: the second press is inside its window
      await page.locator(selector).click();
    }
    assert.match(await page.locator("[data-copy]").textContent(), /Copied/);
    assert.equal(await page.locator("#icon-copy").getAttribute("aria-label"), "Copied");
    // It ends on the original label once the feedback window has passed: wait for that state, not for a time.
    await page.waitForFunction((original) => document.querySelector("[data-copy]").innerHTML === original[0] && document.querySelector("#icon-copy").innerHTML === original[1], rest, { timeout: 10000 });
    assert.deepEqual(await page.evaluate(() => [document.querySelector("[data-copy]").innerHTML, document.querySelector("#icon-copy").innerHTML]), rest);
    assert.equal(await page.locator("#icon-copy").getAttribute("aria-label"), "Copy payload");
    await context.close();
  });
});

describe("the layers", () => {
  test("the CSS declares reset before basalt (the layer @basalt/react uses), once, in the core, and no module re-declares the order", () => {
    const css = files["parts/core.css"];
    assert.match(css, /@layer reset,\s*basalt;/);
    assert.ok(css.indexOf("@layer reset,basalt;") < css.indexOf("@layer basalt{"));
    for (const name of Object.keys(files).filter((f) => /^parts\/.*\.css$/.test(f) && !f.endsWith("geist.css"))) {
      assert.doesNotMatch(files[name], /@layer basalt-html/, "no second layer name");
      if (name !== "parts/core.css") assert.doesNotMatch(files[name], /@layer [\w-]+,/, `${name} leaves the layer order to the core`);
    }
  });

  test("element rules written into @layer reset never change a Basalt class", async () => {
    const { page, context } = await open("template-interactive.html");
    const read = () => page.evaluate(() => {
      document.body.insertAdjacentHTML("beforeend", '<a class="btn" id="probe-link" href="#top">Link</a><button id="probe-plain">Plain</button><a id="probe-text" href="#top">Text</a>');
      const get = (sel) => getComputedStyle(document.querySelector(sel));
      const btn = get(".btn[data-variant=ghost], .btn");
      return { btn: [btn.paddingLeft, btn.borderTopLeftRadius, btn.backgroundColor], link: get("#probe-link").textDecorationLine, plain: [get("#probe-plain").paddingLeft, get("#probe-plain").borderTopLeftRadius], text: get("#probe-text").textDecorationLine };
    });
    const before = await read();
    await page.addStyleTag({ content: "@layer reset { button { padding: 0; border-radius: 0; background: none } a { text-decoration: underline } }" });
    const after = await read();
    assert.deepEqual(after.btn, before.btn);
    assert.equal(after.link, "none", "a.btn keeps its own text-decoration");
    assert.deepEqual(after.plain, ["0px", "0px"], "the reset rule does apply to a plain button");
    assert.equal(after.text, "underline");
    await context.close();
  });
});

describe("code and focus", () => {
  test("code renders in Geist Mono, the block inherits it, and the page has no other monospace", async () => {
    for (const file of TEMPLATES) {
      const { page, context } = await open(file);
      const families = await page.evaluate(() => [...document.querySelectorAll("pre, code, kbd, samp")].map((el) => getComputedStyle(el).fontFamily));
      assert.ok(families.length > 0);
      for (const family of families) assert.match(family, /^"?Geist Mono"?/, family);
      await context.close();
    }
  });

  test("the focus ring shows on four sides for a tab and for the code body", async () => {
    for (const scheme of ["light", "dark"]) {
      const { page, context } = await open("template-interactive.html", { scheme });
      await page.keyboard.press("Tab"); // keyboard modality, so :focus-visible shows
      await page.locator("#tab-summary").focus();
      const tab = await page.evaluate(() => {
        const el = document.activeElement;
        const box = el.getBoundingClientRect();
        // The ring is +2 outside the tab (DECISIONS 358); the row's scrollport keeps its 4 clear on every side, so all four sides show.
        const clip = el.closest(".tabs-scroll").getBoundingClientRect();
        const room = 4;
        return { role: el.getAttribute("role"), offset: getComputedStyle(el).outlineOffset, inside: box.top - room >= clip.top && box.bottom + room <= clip.bottom && box.left - room >= clip.left && box.right + room <= clip.right };
      });
      assert.deepEqual([tab.role, tab.offset, tab.inside], ["tab", "2px", true]);
      await page.keyboard.press("End"); // the JSON tab, where the code is
      await page.locator(".code-body").focus();
      const code = await page.evaluate(() => {
        const el = document.activeElement;
        const wrap = el.closest(".code");
        const box = el.getBoundingClientRect();
        const outer = wrap.getBoundingClientRect();
        return { offset: getComputedStyle(el).outlineOffset, wrapOverflow: getComputedStyle(wrap).overflow, preOverflow: getComputedStyle(el).overflowX, inside: box.top >= outer.top && box.bottom <= outer.bottom && box.left >= outer.left && box.right <= outer.right };
      });
      assert.deepEqual(code, { offset: "-2px", wrapOverflow: "visible", preOverflow: "auto", inside: true });
      await context.close();
    }
  });
});

// ---- The surfaces-and-fixes round: each of these needs the change it names ----

/** The computed value of a CSS value (a token, say), read the way the page will see it. */
const resolve = (page, prop, value) => page.evaluate(([p, v]) => { const el = document.createElement("i"); el.style[p] = v; document.body.append(el); const out = getComputedStyle(el)[p]; el.remove(); return out; }, [prop, value]);
const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
/** A usage text (`compose.mjs --usage NAME` prints it): where a rule that belongs to one module now lives. */
const usageOf = (name) => fs.readFileSync(path.join(skillDir, "parts", "usage", `${name}.md`), "utf8");

describe("tables at 390", () => {
  for (const scheme of ["dark", "light"]) {
    test(`Service and Status fit on screen; only the numbers scroll, and no column is hidden (${scheme}, touch)`, async () => {
      const { page, context } = await open("template-static.html", { scheme, width: 390, touch: true });
      const out = await page.evaluate(() => {
        const wrap = document.querySelector("#services .table-wrap");
        const box = wrap.getBoundingClientRect();
        const heads = [...wrap.querySelectorAll("th")];
        return {
          order: heads.map((th) => th.textContent),
          shown: heads.every((th) => getComputedStyle(th).display !== "none" && th.offsetWidth > 0),
          fitting: heads.slice(0, 2).map((th) => Math.round(th.getBoundingClientRect().right - box.right)),
          scrolls: wrap.scrollWidth > wrap.clientWidth,
          padding: [getComputedStyle(heads[1]).paddingInlineStart, getComputedStyle(heads[0]).paddingInlineStart],
        };
      });
      assert.deepEqual(out.order, ["Service", "Status", "Uptime", "p95 latency", "Incidents"]);
      assert.ok(out.shown, "every column is there");
      assert.ok(out.fitting.every((overhang) => overhang <= 0), `Service and Status end inside the table's edge: ${out.fitting}`);
      assert.ok(out.scrolls, "the numbers scroll");
      // A plain table keeps React's 16px cell padding at 390 as at 1440 (it tightened to 12px before the tables and filters PR, DECISIONS 108).
      assert.deepEqual(out.padding, ["16px", "16px"]);
      await context.close();
    });
  }
});

describe("fonts", () => {
  test("geist.css is the two @font-face rules as data URIs with the licence; compose.mjs inlines it by default and --no-fonts leaves it out", async () => {
    const geist = files["parts/geist.css"];
    assert.match(geist, /SIL Open Font License/);
    const ofl = fs.readFileSync(path.join(repoRoot, "node_modules", "geist", "LICENSE.txt"), "utf8").trim();
    assert.ok(geist.includes(ofl), "the whole OFL 1.1 text, with its permission and conditions, is in geist.css");
    assert.match(geist, /PERMISSION AND CONDITIONS/);
    assert.equal((geist.match(/@font-face/g) ?? []).length, 2);
    assert.doesNotMatch(geist, /url\((?!"data:font\/woff2;base64,)/, "no font is fetched");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-fonts-"));
    try {
      for (const name of ["static", "interactive"]) {
        const body = path.join(dir, `${name}.body.html`);
        fs.writeFileSync(body, EXAMPLES[name]);
        const out = path.join(dir, `${name}.html`);
        execFileSync(process.execPath, [path.join(skillDir, "compose.mjs"), body, "--out", out]);
        const html = fs.readFileSync(out, "utf8");
        assert.ok(html.includes('<style data-basalt-fonts>') && html.includes(ofl), "a page carries the whole OFL text beside the fonts");
        assert.equal(html.split("<style data-basalt-fonts>").length, 2, "the fonts are inlined once");
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(`file://${out}`);
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(async () => {
          await Promise.all([document.fonts.load('600 32px "Geist"'), document.fonts.load('400 13px "Geist Mono"')]);
          return {
            loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', "")).sort(),
            h1: getComputedStyle(document.querySelector("h1")).fontFamily,
            code: getComputedStyle(document.querySelector("pre code, .code code") ?? document.querySelector("code")).fontFamily,
          };
        });
        assert.deepEqual(result.loaded, ["Geist", "Geist Mono"]);
        assert.match(result.h1, /^"?Geist"?/);
        assert.match(result.code, /^"?Geist Mono"?/);
        await context.close();
        const lean = fs.readFileSync(execFileSync(process.execPath, [path.join(skillDir, "compose.mjs"), body, "--out", path.join(dir, "lean.html"), "--no-fonts"]) && path.join(dir, "lean.html"), "utf8");
        assert.ok(!lean.includes("@font-face") && lean.length < html.length - 150_000, "--no-fonts leaves the fonts out");
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("no fonts variants are committed, and SKILL.md says compose.mjs inlines Geist", () => {
    assert.deepEqual(fs.readdirSync(skillDir).filter((f) => f.includes(".fonts.")), []);
    assert.match(skill, /Geist/);
    assert.match(skill, /--no-fonts/);
  });
});

describe("figures, not stat tiles", () => {
  for (const file of TEMPLATES) {
    test(`${file}: at most three panels, and no figure is boxed`, async () => {
      const { page, context } = await open(file);
      const out = await page.evaluate(() => ({
        panels: document.querySelectorAll(".panel, .card, .callout, .code, .table-wrap").length,
        stats: [...document.querySelectorAll(".stat")].map((el) => { const cs = getComputedStyle(el); return { rim: cs.borderTopWidth + "|" + cs.boxShadow + "|" + cs.backgroundColor, padding: cs.padding, panelAncestor: !!el.closest(".panel, .card, .callout") }; }),
      }));
      assert.ok(out.panels <= 3, `${out.panels} panels`);
      assert.ok(out.stats.length > 0);
      for (const stat of out.stats) assert.deepEqual([stat.rim, stat.padding, stat.panelAncestor], ["0px|none|rgba(0, 0, 0, 0)", "0px", false]);
      await context.close();
    });
  }

  test("the static summary is three figures, the incidents are a bare list", async () => {
    const { page, context } = await open("template-static.html");
    const out = await page.evaluate(() => ({
      figures: [...document.querySelectorAll(".stats > .stat .stat-label")].map((el) => el.textContent),
      columns: getComputedStyle(document.querySelector(".stats")).gridTemplateColumns.split(" ").filter((track) => track !== "0px").length,
      incidents: document.querySelector("#incidents .panel"),
      list: !!document.querySelector("#incidents ul.divide-y"),
      padding: getComputedStyle(document.querySelector("#incidents li")).paddingBlockStart,
      scope: document.querySelector("#summary .section-head p.muted.small")?.textContent.startsWith("Scope."),
    }));
    assert.deepEqual(out.figures, ["Availability", "p95 latency", "Error budget left"]);
    assert.equal(out.columns, 3);
    assert.deepEqual([out.incidents, out.list, out.padding, out.scope], [null, true, "12px", true]);
    await context.close();
  });

  test("the interactive page answers one number, above the form, and it is in view at 390 while the first field is focused", async () => {
    const { page, context } = await open("template-interactive.html", { width: 390, touch: true });
    const order = await page.evaluate(() => {
      const out = document.querySelector("output#out-cost");
      return { before: !!(out.compareDocumentPosition(document.querySelector("form")) & Node.DOCUMENT_POSITION_FOLLOWING), forIds: out.htmlFor.value, size: getComputedStyle(out).fontSize, bottom: Math.round(out.getBoundingClientRect().bottom) };
    });
    assert.equal(order.before, true, "before the form in the DOM");
    assert.equal(order.forIds, "region rps payload cache");
    assert.equal(order.size, "24px", "the existing 2xl");
    assert.ok(order.bottom < 844, `the headline ends at ${order.bottom}`);
    await page.locator("#rps").focus();
    // Focus scrolls the field into view smoothly: read where it ends up, not 100ms into the scroll.
    await page.evaluate(() => new Promise((resolve) => { let last = -1; let still = 0; const tick = () => { const y = scrollY; still = y === last ? still + 1 : 0; last = y; if (still >= 3) resolve(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }));
    const view = await page.evaluate(() => { const r = document.querySelector("#out-cost").getBoundingClientRect(); const bar = document.querySelector(".topbar").getBoundingClientRect(); return { top: r.top >= bar.bottom, bottom: r.bottom <= window.innerHeight }; });
    assert.deepEqual(view, { top: true, bottom: true });
    await page.locator("#rps").fill("800");
    assert.notEqual(await page.locator("#out-cost").textContent(), "$0");
    await context.close();
  });

  test("at 1440 the interactive page keeps two columns, the secondary figures are a small dl, and the tip is a muted line", async () => {
    const { page, context } = await open("template-interactive.html");
    const out = await page.evaluate(() => {
      const split = document.querySelector(".split.aside");
      const form = document.querySelector("form").getBoundingClientRect();
      const tabs = document.querySelector("[data-tabs]").getBoundingClientRect();
      const dl = document.querySelector("#view-summary dl");
      return { columns: getComputedStyle(split).gridTemplateColumns.split(" ").length, side: tabs.left > form.right, dl: dl.classList.contains("small") && dl.classList.contains("num") && dl.querySelectorAll("dt").length === 2, dd: getComputedStyle(dl.querySelector("dd")).marginInlineStart, tip: document.querySelector("#advice").className };
    });
    assert.deepEqual(out, { columns: 2, side: true, dl: true, dd: "0px", tip: "muted small" });
    await context.close();
  });
});

describe("primitives", () => {
  test("accent-color, heading weights and the blockquote", async () => {
    const { page, context } = await open("template-static.html");
    await page.evaluate(() => document.querySelector(".prose").insertAdjacentHTML("beforeend", "<h5>Five</h5><h6>Six</h6><blockquote>Quoted</blockquote>"));
    const out = await page.evaluate(() => {
      const cs = (sel) => getComputedStyle(document.querySelector(sel));
      return { accent: cs(":root").accentColor, h: [cs(".prose h5").fontWeight, cs(".prose h6").fontWeight], quote: [cs(".prose blockquote").paddingInlineStart, cs(".prose blockquote").color, cs(".prose blockquote").borderInlineStartWidth] };
    });
    assert.equal(out.accent, await resolve(page, "color", "var(--basalt-action-primary)"));
    assert.deepEqual(out.h, ["600", "600"]);
    assert.deepEqual(out.quote, ["16px", await resolve(page, "color", "var(--basalt-text-secondary)"), "0px"], "an indent and text-secondary, no bar");
    await context.close();
  });

  for (const scheme of ["dark", "light"]) {
    test(`.segment and .badge look as React's do (${scheme})`, async () => {
      const { page, context } = await open("template-static.html", { scheme, all: true });
      await page.evaluate(() => document.querySelector("#top").insertAdjacentHTML("afterend", '<div id="probe"><div class="segment" role="group" aria-label="Range"><button type="button" aria-pressed="true">Day</button><button type="button" aria-pressed="false">Week</button></div> <span class="badge" data-status="success">Healthy</span> <span class="badge">3 open</span></div>'));
      const out = await page.evaluate(() => {
        const cs = (el, pseudo) => getComputedStyle(el, pseudo);
        const group = document.querySelector(".segment"), [on, off] = group.querySelectorAll("button");
        const [status, plain] = document.querySelectorAll(".badge");
        return {
          group: [cs(group).backgroundColor, cs(group).borderRadius, cs(group).paddingTop],
          on: [cs(on).backgroundColor, cs(on).boxShadow, cs(on).color, cs(on).height, cs(on).borderRadius, cs(on.querySelector("[data-label]") ?? on).fontWeight], // the 600 is on the label, not on the button (decision 149)
          off: [cs(off).backgroundColor, cs(off).boxShadow, cs(off).color],
          badge: [cs(plain).fontSize, cs(plain).fontWeight, cs(plain).color, cs(plain).borderRadius, cs(plain).height, cs(plain).boxShadow, cs(plain).borderTopWidth, cs(plain).borderTopColor, cs(plain).boxSizing],
          dot: [cs(status, "::before").width, cs(status, "::before").content, cs(plain, "::before").content],
          dotColor: cs(status, "::before").backgroundColor,
        };
      });
      const px = (v) => resolve(page, "width", v);
      assert.deepEqual(out.group, [await resolve(page, "backgroundColor", "var(--basalt-surface-sunken-strong)"), await px("var(--basalt-radius-md)"), await px("var(--basalt-space-0-5)")]);
      assert.deepEqual(out.on.slice(0, 3), [await resolve(page, "backgroundColor", scheme === "dark" ? "color-mix(in srgb, var(--basalt-neutral-100) 9%, var(--basalt-surface-top))" : "var(--basalt-surface-top)"), await resolve(page, "boxShadow", "0 0 0 1px var(--basalt-border-hairline)"), await resolve(page, "color", "var(--basalt-text-primary)")], "pressed is a raised pill with a hairline");
      assert.deepEqual(out.on.slice(3), [await px("var(--basalt-size-control-sm)"), await px("var(--basalt-radius-sm)"), "600"]); // this page has not run the script: the chosen button is 600 itself, as on origin/main (decision 138, A); with the script the 600 sits on the label (audit-design-a.test.mjs)
      assert.deepEqual(out.off, ["rgba(0, 0, 0, 0)", "none", await resolve(page, "color", "var(--basalt-text-secondary)")]);
      assert.deepEqual(out.badge, [await px("var(--basalt-text-xs-size)"), "500", await resolve(page, "color", "var(--basalt-text-secondary)"), await px("var(--basalt-radius-xs)"), await px("var(--basalt-size-badge)"), "none", await px("var(--basalt-size-hairline)"), await resolve(page, "color", "var(--basalt-border-hairline)"), "border-box"], "the edge is a real 1px border, not an inset shadow");
      assert.deepEqual([out.dot[0], out.dot[1] !== "none", out.dot[2]], [await px("var(--basalt-size-dot)"), true, "none"], "a status badge draws its dot, a count does not");
      assert.equal(out.dotColor, await resolve(page, "backgroundColor", "var(--basalt-status-success)"));
      assert.deepEqual(await axe(page), []);
      await context.close();
    });
  }
});

describe("print", () => {
  test("the page prints light without touching the stored choice, and comes back", async () => {
    const { page, context } = await open("template-interactive.html", { scheme: "dark" });
    await page.evaluate(() => localStorage.setItem("basalt-theme", "dark"));
    const states = [];
    const theme = () => page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem("basalt-theme")]);
    states.push(await theme());
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    states.push(await theme());
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    states.push(await theme());
    assert.deepEqual(states, [["dark", "dark"], ["light", "dark"], ["dark", "dark"]]);
    // a second beforeprint in one session must not take the temporary light theme for the page's own
    await page.evaluate(() => window.Basalt.setTheme("dark"));
    await page.evaluate(() => { for (const type of ["beforeprint", "beforeprint", "afterprint"]) window.dispatchEvent(new Event(type)); });
    assert.deepEqual(await theme(), ["dark", "dark"], "back to dark after a repeated beforeprint");
    await page.evaluate(() => { for (const type of ["beforeprint", "afterprint", "beforeprint", "afterprint"]) window.dispatchEvent(new Event(type)); });
    assert.deepEqual(await theme(), ["dark", "dark"], "and each session starts afresh");
    // a page already light stays light, and afterprint does not flip it
    await page.evaluate(() => { window.Basalt.setTheme("light"); window.dispatchEvent(new Event("beforeprint")); window.dispatchEvent(new Event("afterprint")); });
    assert.deepEqual(await theme(), ["light", "light"]);
    await context.close();
  });

  for (const file of TEMPLATES) {
    test(`${file}: the bar prints (static, no filter), but no skip link, theme toggle or copy buttons; colour held on dots and progress; panels whole; code wraps`, async () => {
      const { page, context } = await open(file);
      await page.emulateMedia({ media: "print" });
      const out = await page.evaluate(() => {
        const cs = (sel, pseudo) => getComputedStyle(document.querySelector(sel), pseudo);
        const adjust = (c) => c.getPropertyValue("print-color-adjust") || c.getPropertyValue("-webkit-print-color-adjust");
        const panel = document.querySelector(".panel, .code, .table-wrap");
        return {
          bar: [cs(".topbar").display, cs(".topbar").position, cs(".topbar").backdropFilter],
          hidden: [".skip-link", "[data-theme-toggle]"].concat(document.querySelector("[data-copy]") ? ["[data-copy]"] : []).map((sel) => cs(sel).display),
          adjust: [document.querySelector(".status") ? adjust(cs(".status", "::before")) : "exact", document.querySelector(".progress") ? adjust(cs(".progress > span")) : "exact"],
          inside: getComputedStyle(panel).breakInside,
          wrap: getComputedStyle(document.querySelector(".code-body")).whiteSpace,
        };
      });
      assert.ok(out.hidden.every((d) => d === "none"), out.hidden.join());
      assert.deepEqual([out.bar[0] !== "none", out.bar[1], out.bar[2]], [true, "static", "none"], "the site bar prints, static and opaque (DECISIONS 104)");
      assert.deepEqual(out.adjust, ["exact", "exact"]);
      assert.equal(out.inside, "avoid");
      assert.equal(out.wrap, "pre-wrap");
      await context.close();
    });
  }
});

describe("palette keys", () => {
  const palette = `window.__ran = []; window.Basalt.init({ palette: { groups: [{ label: "Page", items: [
    { label: "Save", keys: ["⌘", "S"], onSelect: () => __ran.push("save") },
    { label: "Jump", keys: ["⌥", "J"], onSelect: () => __ran.push("jump") },
    { label: "Bare", keys: ["G"], onSelect: () => __ran.push("bare") },
    { label: "Shift only", keys: ["⇧", "P"], onSelect: () => __ran.push("shift") },
    { label: "Plain" }
  ] }] } });`;
  const ran = (page) => page.evaluate(() => window.__ran.splice(0));

  test("an item's keys run it from anywhere; a key with no ⌘, ⌃ or ⌥ warns once and gets no chip and no binding", async () => {
    const { page, context, errors } = await open("template-static.html", { all: true });
    await page.evaluate(palette);
    await page.keyboard.press("Control+s");
    await page.keyboard.press("Meta+s");
    await page.keyboard.press("Alt+j");
    await page.keyboard.press("g");
    await page.keyboard.press("Shift+p");
    await page.keyboard.press("Control+Shift+s");
    assert.deepEqual(await ran(page), ["save", "save", "jump"], "only the real bindings, and not with extra modifiers");
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    const rows = await page.evaluate(() => [...document.querySelectorAll(".palette [role=option]")].map((row) => [row.querySelector(".row-label").textContent, row.querySelectorAll(".kbd").length, row.getAttribute("aria-keyshortcuts")]));
    assert.deepEqual(rows, [["Save", 2, "Meta+S"], ["Jump", 2, "Alt+J"], ["Bare", 0, null], ["Shift only", 0, null], ["Plain", 0, null]]);
    await page.keyboard.type("sav");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Escape");
    assert.equal(errors.filter((e) => /cannot be bound/.test(e)).length, 2, `warned once each: ${errors.join(" | ")}`);
    assert.match(errors.join("\n"), /"Bare" has keys \[G\]/);
    await context.close();
  });

  test("a bound item runs with the palette open and closes it; ⌥ alone does not fire while typing in a field", async () => {
    const { page, context } = await open("template-static.html", { all: true });
    await page.evaluate(palette);
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await page.keyboard.press("Control+s");
    assert.deepEqual(await ran(page), ["save"]);
    assert.equal(await page.locator(".palette").count(), 0, "the palette closed");
    await page.evaluate(() => { document.querySelector("main").insertAdjacentHTML("beforeend", '<input id="field" type="text">'); document.querySelector("#field").focus(); });
    await page.keyboard.press("Alt+j");
    assert.deepEqual(await ran(page), [], "⌥ J types a character in a field");
    await page.keyboard.press("Control+s");
    assert.deepEqual(await ran(page), ["save"], "⌘ and ⌃ combinations still run");
    await context.close();
  });

  test("one keypress runs one command: a modified Enter is the page's shortcut, not the highlighted row, and a handled key is not handled twice", async () => {
    const { page, context } = await open("template-static.html", { all: true });
    await page.evaluate(() => {
      window.__ran = [];
      // a listener ahead of Basalt's, which handles Control+J itself
      document.addEventListener("keydown", (e) => { if (e.ctrlKey && e.key === "j") { e.preventDefault(); window.__ran.push("page"); } });
      window.Basalt.init({ palette: { groups: [{ items: [
        { label: "Selected", onSelect: () => __ran.push("selected") },
        { label: "Bound", keys: ["⌃", "↵"], onSelect: () => __ran.push("bound") },
        { label: "Taken", keys: ["⌃", "J"], onSelect: () => __ran.push("taken") },
      ] }] } });
    });
    await page.keyboard.press("Control+Enter");
    assert.deepEqual(await ran(page), ["bound"], "palette closed");
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await page.keyboard.press("Control+Enter");
    assert.deepEqual(await ran(page), ["bound"], "palette open: the bound row, not the highlighted one, and once");
    assert.equal(await page.locator(".palette").count(), 0);
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    await page.keyboard.press("Shift+Enter");
    assert.deepEqual(await ran(page), [], "Shift+Enter runs nothing");
    await page.keyboard.press("Enter");
    assert.deepEqual(await ran(page), ["selected"], "a bare Enter still runs the highlighted row");
    await page.keyboard.press("Control+j");
    assert.deepEqual(await ran(page), ["page"], "a key another listener handled is not run again");
    await context.close();
  });

  test("⌥ alone does not fire from a field inside a shadow root, an input or contenteditable", async () => {
    const { page, context } = await open("template-static.html", { all: true });
    await page.evaluate(() => {
      window.__ran = [];
      window.Basalt.init({ palette: { groups: [{ items: [{ label: "Jump", keys: ["⌥", "J"], onSelect: () => __ran.push("jump") }] }] } });
      const host = document.createElement("div");
      host.id = "shadow";
      document.querySelector("main").append(host);
      host.attachShadow({ mode: "open" }).innerHTML = '<input id="inner"><div id="edit" contenteditable="true" tabindex="0">x</div>';
    });
    for (const selector of ["#inner", "#edit"]) {
      await page.evaluate((sel) => document.querySelector("#shadow").shadowRoot.querySelector(sel).focus(), selector);
      await page.keyboard.press("Alt+j");
      assert.deepEqual(await ran(page), [], `${selector}: ⌥ J types a character`);
    }
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Alt+j");
    assert.deepEqual(await ran(page), ["jump"], "and runs from the page");
    await context.close();
  });

  test("⌘K and ⌃K belong to the palette: an item with those keys warns, gets no chip and no binding", async () => {
    const { page, context, errors } = await open("template-static.html", { all: true });
    await page.evaluate(() => {
      window.__ran = [];
      window.Basalt.init({ palette: { groups: [{ items: [
        { label: "Reserved", keys: ["⌘", "K"], onSelect: () => __ran.push("reserved") },
        { label: "Reserved ctrl", keys: ["⌃", "K"], onSelect: () => __ran.push("ctrl") },
        { label: "Kept", keys: ["⌘", "⇧", "K"], onSelect: () => __ran.push("kept") },
      ] }] } });
    });
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    assert.deepEqual(await ran(page), [], "Control+K only opens the palette");
    const rows = await page.evaluate(() => [...document.querySelectorAll(".palette [role=option]")].map((row) => [row.querySelector(".row-label").textContent, row.querySelectorAll(".kbd").length, row.getAttribute("aria-keyshortcuts")]));
    assert.deepEqual(rows, [["Reserved", 0, null], ["Reserved ctrl", 0, null], ["Kept", 3, "Meta+Shift+K"]]);
    assert.equal(errors.filter((e) => /open the palette/.test(e)).length, 2, `warned once each: ${errors.join(" | ")}`);
    await page.keyboard.press("Control+Shift+k");
    assert.equal(await page.locator(".palette").count(), 0, "a shifted K is still the item's");
    assert.deepEqual(await ran(page), ["kept"]);
    await context.close();
  });

  test("keys that are not an array (a string like \"⌘ S\") warn once, draw no chip and bind nothing, and the palette still opens", async () => {
    const { page, context, errors } = await open("template-static.html", { all: true });
    await page.evaluate(() => {
      window.__ran = [];
      window.Basalt.init({ palette: { groups: [{ items: [
        { label: "String keys", keys: "⌘ S", onSelect: () => __ran.push("string") },
        { label: "Number keys", keys: 7, onSelect: () => __ran.push("number") },
        { label: "Array keys", keys: ["⌘", "J"], onSelect: () => __ran.push("array") },
      ] }] } });
    });
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    const rows = await page.evaluate(() => [...document.querySelectorAll(".palette [role=option]")].map((row) => [row.querySelector(".row-label").textContent, row.querySelectorAll(".kbd").length, row.getAttribute("aria-keyshortcuts")]));
    assert.deepEqual(rows, [["String keys", 0, null], ["Number keys", 0, null], ["Array keys", 2, "Meta+J"]]);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+s");
    await page.keyboard.press("Control+j");
    assert.deepEqual(await ran(page), ["array"], "a string binds nothing");
    assert.equal(errors.filter((e) => /not an array/.test(e)).length, 2, `warned once each: ${errors.join(" | ")}`);
    assert.equal(errors.filter((e) => /filter is not a function/.test(e)).length, 0, errors.join(" | "));
    assert.match(errors.join("\n"), /"String keys" has keys that are not an array/);
    await context.close();
  });

  test("the foot's legend says Run, and with nothing shown the empty block says what was typed and offers Clear search (cimip-gaps-3 t6)", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("qqqq");
    assert.equal(await page.locator(".palette .command-none p").textContent(), "Nothing matches “qqqq”.");
    assert.equal(await page.locator(".palette .command-none").isVisible(), true);
    assert.equal(await page.locator(".palette .command-none button").textContent(), "Clear search");
    assert.deepEqual(await page.locator(".palette .command-hints > span").evaluateAll((spans) => spans.map((span) => span.lastChild.textContent.trim())), ["Navigate", "Run", "Close"]);
    await context.close();
  });
});

describe("the busy button", () => {
  test("aria-busy hides the label and lays a ring over the middle; the width holds; no braille in a button", async () => {
    const { page, context } = await open("template-interactive.html");
    const idle = await page.locator("#recalc").boundingBox();
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#recalc")).position), "relative");
    await page.locator("#recalc").click();
    assert.equal(await page.locator("#recalc").getAttribute("aria-busy"), "true");
    const out = await page.evaluate(() => {
      const button = document.querySelector("#recalc");
      const ring = getComputedStyle(button, "::after");
      return { label: getComputedStyle(button.querySelector("span")).opacity, size: [ring.width, ring.height], position: ring.position, animation: ring.animationName, braille: button.querySelectorAll("braille-spinner").length };
    });
    assert.equal(out.label, "0");
    assert.deepEqual([out.size, out.position, out.animation, out.braille], [["16px", "16px"], "absolute", "bh-spin", 0]);
    assert.deepEqual(await page.locator("#recalc").boundingBox(), idle, "the width holds");
    assert.deepEqual(await axe(page), [], "busy is accessible");
    await page.waitForFunction(() => !document.querySelector("#recalc").hasAttribute("aria-busy"));
    assert.equal(await page.locator("#status").textContent(), "Recalculated.");
    await context.close();
  });

  test("the page claims no fetch it doesn't make", () => {
    assert.doesNotMatch(pages["template-interactive.html"], /Refresh prices|Prices as of today|refreshed just now/i);
    assert.match(pages["template-interactive.html"], /Recalculate/);
  });
});

describe("icons", () => {
  const names = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "src", "icons.json"), "utf8"));

  test("Bold at every size, generated from Phosphor, with no Regular weight in the build; every listed name is in the SKILL", async () => {
    const data = iconData(names);
    const { page, context } = await open("template-static.html", { all: true });
    for (const name of names) {
      assert.ok(data[name].every((d) => typeof d === "string"), `${name}: one weight, a list of paths`);
      const drawn = await page.evaluate((n) => [16, 19.9, 20, 24, 32].map((size) => [...new DOMParser().parseFromString(window.Basalt.icon(n, { size }), "image/svg+xml").querySelectorAll("path")].map((p) => p.getAttribute("d"))), name);
      assert.deepEqual(drawn, Array(5).fill(data[name]), `${name} is the same Bold drawing at every size`);
      assert.ok(skill.includes(name), `${name} is listed in SKILL.md`);
    }
    await context.close();
    const built = JSON.parse(fs.readFileSync(path.join(skillDir, "parts", "icons.json"), "utf8")).icons;
    assert.deepEqual(Object.keys(built), names);
    assert.deepEqual(built, data, "the built file is the Bold paths and nothing else");
  });

  test("the set has the social marks, the envelope and the terminal, and no ArrowUpRight (the new-tab arrow is the core glyph)", () => {
    for (const name of ["GithubLogo", "XLogo", "LinkedinLogo", "InstagramLogo", "YoutubeLogo", "EnvelopeSimple", "TerminalWindow"]) assert.ok(names.includes(name), name);
    for (const name of ["ArrowUpRight", "Newspaper", "ChatCircle", "Envelope", "ThreadsLogo", "TiktokLogo", "MediumLogo", "RssSimple"]) assert.ok(!names.includes(name), `${name} stays out`);
  });

  test("the build fails for a name Phosphor does not have", () => {
    assert.throws(() => iconData(["Info", "NotAPhosphorIcon"]), /"NotAPhosphorIcon" in icons\.json is not a Phosphor icon/);
    assert.throws(() => iconData(["../Info"]), /not a Phosphor icon name/);
  });
});

describe("touch and anchors", () => {
  test("the tap highlight is off on links, buttons, summaries, tabs, rows, disclosures and segments", async () => {
    const { page, context } = await open("template-static.html");
    const out = await page.evaluate(() => {
      document.body.insertAdjacentHTML("beforeend", '<div id="taps"><a href="#top">a</a><button>b</button><details><summary>s</summary></details><button role="tab">t</button><div class="row">r</div><button class="disclosure">d</button><div class="segment"><button>g</button></div></div>');
      return [...document.querySelectorAll("#taps a, #taps button, #taps summary, #taps .row")].map((el) => getComputedStyle(el).webkitTapHighlightColor);
    });
    assert.equal(out.length, 7);
    assert.ok(out.every((c) => c === "rgba(0, 0, 0, 0)"), out.join());
    await context.close();
  });

  test("an anchor lands below the sticky top bar", async () => {
    const { page, context } = await open("template-static.html");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "72px", "the bar (56) plus space-4, as React's page has it");
    await page.evaluate(() => document.querySelector("#services").scrollIntoView());
    const gap = await page.evaluate(() => document.querySelector("#services").getBoundingClientRect().top - document.querySelector(".topbar").getBoundingClientRect().bottom);
    assert.ok(gap >= 0, `the section starts ${gap}px below the bar`);
    await context.close();
  });
});

describe("the SKILL's rules", () => {
  test("the new rules are written down: the ones every page needs in SKILL.md, a module's own in its usage text", () => {
    for (const rule of [
      /`--no-fonts` skips Geist \(for a file only a tool reads\)/,
      /node \.agent\/skills\/basalt-html\/compose\.mjs report\.body\.html/,
      /Need another icon\? Add its name to tools\/html-skill\/src\/icons\.json and rebuild\. Never draw one, never use an emoji\./,
      /\*\*Selected\*\* is a shape or weight, never a wash alone: a segment or tab label at 600 \(400 at rest\) on its pill or underline, a row's filled background, a checked box\. No vertical bar; an outline never marks a state\./,
      /standalone links too/,
      /\*\*Keys\.\*\* No single-character shortcuts on the page \(WCAG 2\.1\.4\)/,
    ]) assert.match(skill, rule);
    for (const [name, rule] of [
      ["table", /At 390 a table's name column and any status column come first and fit on screen; only numbers may scroll\. Don't hide a column to make it fit\./],
      ["stats", /No row of stat tiles\.\*\* `\.stats` > `\.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number/],
      ["status", /A badge labels one object's status or count, always with a word; never decoration\./],
      ["braille", /\*\*Braille\*\* is for a status: beside a word that names running work, never in a button and never without its word\. The ring \(see the spinner\) is for a wait\./],
      ["braille", /<span class="status"><braille-spinner><\/braille-spinner>Running<\/span>/],
      ["forms", /Date and time pickers stay native: Basalt has no design for them/],
      ["kbd", /never on the primary fill/],
      ["tabs", /Tabs don't slide their indicator in static files/],
      ["core", /\*\*Busy\*\* is `aria-busy="true"` on the button \(label in a `<span>`\): the label hides and a ring sits over it, so the width holds\./],
      ["core", /the script prints in the light theme and goes back after; the skip link, theme toggle and copy buttons are not printed \(the top bar is: static and opaque\)/],
      ["topbar", /The page's one blurred \(smoked\) surface; it falls back to opaque on its own\./],
      ["topbar", /- Once per page\./],
      ["topbar", /Don't restyle it, and don't put a second blurred layer on the page\./],
    ]) assert.match(usageOf(name), rule, `${name}: ${rule}`);
    assert.match(skill, /\bpalette\b/, "the palette is in the index");
  });
});

// ---- Brought into line with approved Basalt behaviour (foundations: Chrome, Motion, touch targets, forced colours) ----

/** What a token (or any CSS value) computes to for a property: the page's own resolution, in its current theme. */
const resolveCss = (page, value, prop = "color") => page.evaluate(([v, p]) => {
  const probe = document.createElement("div");
  probe.style.setProperty(p, v);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(p);
  probe.remove();
  return out;
}, [value, prop]);
const token = (page, name, prop = "color") => resolveCss(page, `var(--basalt-${name})`, prop);

describe("the smoked header (.topbar)", () => {
  for (const scheme of ["dark", "light"]) {
    const read = (page, ...props) => page.evaluate((p) => { const s = getComputedStyle(document.querySelector(".topbar")); return Object.fromEntries(p.map((k) => [k, s[k]])); }, props);

    test(`surface-chrome over a 12px blur with no saturate, a hairline below, primary ink, sticky (${scheme})`, async () => {
      const { page, context } = await open("template-static.html", { scheme });
      const s = await read(page, "backgroundColor", "backdropFilter", "borderBottomColor", "borderBottomStyle", "borderBottomWidth", "color", "position", "top");
      assert.equal(s.backgroundColor, await token(page, "surface-chrome", "background-color"));
      assert.match(s.backgroundColor, scheme === "dark" ? /\/ 0\.925\)$|, 0\.925\)$/ : /\/ 0\.96\)$|, 0\.96\)$/, "the page colour with alpha: 92.5% in dark, 96% in light (DECISIONS 146 E)");
      assert.equal(s.backdropFilter, "blur(12px)", "blur-chrome and nothing else: no saturate, no brightness");
      assert.equal(s.borderBottomWidth, "1px");
      assert.equal(s.borderBottomStyle, "solid");
      assert.equal(s.borderBottomColor, await token(page, "border-hairline", "border-bottom-color"), "the hairline, not the divider");
      if (scheme === "dark") assert.notEqual(s.borderBottomColor, await token(page, "border-divider", "border-bottom-color"), "in dark the hairline is brighter than a divider");
      assert.equal(s.color, await token(page, "text-primary"));
      assert.deepEqual([s.position, s.top], ["sticky", "0px"]);
      assert.ok(files["parts/topbar.css"].includes("-webkit-backdrop-filter:blur(var(--basalt-blur-chrome))"), "the -webkit- prefix is written");
      await context.close();
    });

    test(`tertiary text on the bar is promoted to secondary, and only there (${scheme})`, async () => {
      const { page, context } = await open("template-static.html", { scheme });
      const ink = await page.evaluate(() => {
        document.querySelector(".topbar-inner").insertAdjacentHTML("beforeend", '<span class="faint" id="in-bar">in</span>');
        document.querySelector("main").insertAdjacentHTML("beforeend", '<span class="faint" id="out-bar">out</span>');
        return [getComputedStyle(document.querySelector("#in-bar")).color, getComputedStyle(document.querySelector("#out-bar")).color];
      });
      assert.equal(ink[0], await token(page, "text-secondary"));
      assert.equal(ink[1], await token(page, "text-tertiary"), "unchanged outside the bar");
      await context.close();
    });

    test(`a pressed ghost button on the bar takes primary ink; at rest, and anywhere else, a ghost keeps secondary (${scheme})`, async () => {
      // On touch, where a press is the only state: a fine pointer's hover would brighten the ghost's ink on its own.
      const { page, context } = await open("template-static.html", { scheme, touch: true, width: 390 });
      await page.evaluate(() => document.querySelector("main").insertAdjacentHTML("afterbegin", '<button class="btn" data-variant="ghost" id="ghost-out">Elsewhere</button>'));
      const ink = (sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).color);
      const secondary = await token(page, "text-secondary");
      const primary = await token(page, "text-primary");
      assert.equal(await ink("[data-theme-toggle]"), secondary, "at rest");
      const press = async (sel) => { const box = await page.locator(sel).boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await settle(page); };
      await press("[data-theme-toggle]");
      assert.equal(await ink("[data-theme-toggle]"), primary, "pressed on the bar");
      await page.mouse.move(5, 5); // release off the button, so it doesn't click and flip the theme
      await page.mouse.up();
      await page.locator("#ghost-out").scrollIntoViewIfNeeded();
      await press("#ghost-out");
      assert.equal(await ink("#ghost-out"), secondary, "a pressed ghost elsewhere keeps its ink");
      await page.mouse.up();
      await context.close();
    });
  }

  test("reduced transparency: opaque surface-page and no filter", async () => {
    const { page, context } = await open("template-static.html", { scheme: "dark" });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    assert.ok(await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches), "the query is emulated");
    const s = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".topbar")); return [c.backgroundColor, c.backdropFilter]; });
    assert.equal(s[0], await token(page, "surface-page", "background-color"));
    assert.equal(s[1], "none");
    await context.close();
  });

  test("without backdrop-filter (@supports not): opaque surface-page", async () => {
    // Make the @supports test fail the way it does in a browser without the property, by renaming the property it probes.
    const probe = /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/;
    assert.ok(probe.test(files["parts/topbar.css"]), "the fallback is in the stylesheet");
    const { page, context } = await open("template-static.html", { scheme: "dark", transform: (html) => html.replace(probe, "@supports not ((x-backdrop-filter: blur(1px)) or (-webkit-x-backdrop-filter: blur(1px)))") });
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".topbar")).backgroundColor), await token(page, "surface-page", "background-color"));
    await context.close();
  });

  test("forced colours: Canvas and CanvasText, a real border, no filter", async () => {
    const { page, context } = await open("template-static.html");
    await page.emulateMedia({ forcedColors: "active" });
    const s = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".topbar")); return [c.backgroundColor, c.color, c.backdropFilter, c.borderBottomStyle, c.borderBottomWidth, c.borderBottomColor]; });
    const canvas = await resolveCss(page, "Canvas", "background-color");
    const text = await resolveCss(page, "CanvasText");
    assert.deepEqual(s, [canvas, text, "none", "solid", "1px", text]);
    await context.close();
  });

  test("print: the bar prints, as React's does (DECISIONS 104): static, opaque, with no filter", async () => {
    const { page, context } = await open("template-static.html", { scheme: "dark" });
    await page.emulateMedia({ media: "print" });
    const s = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".topbar")); return [c.display, c.position, c.backgroundColor, c.backdropFilter]; });
    assert.notEqual(s[0], "none", "the bar is drawn in print");
    assert.equal(s[1], "static");
    assert.equal(s[2], await token(page, "surface-page", "background-color"));
    assert.equal(s[3], "none");
    await context.close();
  });
});

describe("the press scale", () => {
  const press = async (page, selector) => {
    const box = await page.locator(selector).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await settle(page); // the press is a 100ms transition: read it once it has ended, not after a fixed wait
  };
  const transform = (page, selector) => page.locator(selector).evaluate((el) => getComputedStyle(el).transform);
  const probes = '<div id="press" style="display:flex;gap:16px;padding:16px"><button class="btn" id="b-ok">Save</button><button class="btn" id="b-aria" aria-disabled="true">Off</button><button class="btn" id="b-busy" aria-busy="true"><span>Busy</span></button><button class="btn" data-variant="primary" id="b-primary">Primary</button><div class="row" id="r" style="width:120px">Row</div><button class="tab" role="tab" id="t">Tab</button><button class="disclosure" id="d" style="width:120px">More</button></div>';
  const setup = (page) => page.evaluate((html) => document.querySelector("main").insertAdjacentHTML("afterbegin", html), probes);

  test("a pressed button scales to .98 over 100ms on ease-out, and goes back on release", async () => {
    const { page, context } = await open("template-static.html");
    await setup(page);
    assert.equal(await transform(page, "#b-ok"), "none");
    await press(page, "#b-ok");
    assert.equal(await transform(page, "#b-ok"), "matrix(0.98, 0, 0, 0.98, 0, 0)");
    await page.mouse.up();
    await settle(page);
    assert.equal(await transform(page, "#b-ok"), "none");
    await press(page, "#b-primary");
    assert.equal(await transform(page, "#b-primary"), "matrix(0.98, 0, 0, 0.98, 0, 0)", "every variant");
    await page.mouse.up();
    const t = await page.locator("#b-ok").evaluate((el) => { const s = getComputedStyle(el); return [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction]; });
    assert.deepEqual(t, ["background-color, color, box-shadow, transform", "0.1s", await resolveCss(page, "var(--basalt-ease-out)", "transition-timing-function")]);
    await context.close();
  });

  test("never on a disabled or busy button, and on nothing else (a row, a tab, a disclosure)", async () => {
    const { page, context } = await open("template-static.html");
    await setup(page);
    for (const sel of ["#b-aria", "#b-busy", "#r", "#t", "#d"]) {
      await press(page, sel);
      assert.equal(await transform(page, sel), "none", sel);
      await page.mouse.up();
    }
    await context.close();
  });

  test("the pressed hit box is extended so the scale can't lose the click at the edge", async () => {
    const { page, context } = await open("template-static.html");
    await setup(page);
    await press(page, "#b-ok");
    assert.deepEqual(await page.locator("#b-ok").evaluate((el) => { const s = getComputedStyle(el, "::after"); return [s.content, s.position]; }), ['""', "absolute"]);
    await page.mouse.up();
    await context.close();
  });

  test("reduced motion: a press keeps its colour step and its scale is 1, and transform leaves the transition list", async () => {
    const { page, context } = await open("template-static.html", { reducedMotion: "reduce" });
    await setup(page);
    const rest = await page.locator("#b-primary").evaluate((el) => getComputedStyle(el).backgroundColor);
    await press(page, "#b-primary");
    assert.equal(await transform(page, "#b-primary"), "none");
    const s = await page.locator("#b-primary").evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).transitionProperty]);
    assert.notEqual(s[0], rest, "the colour step stays");
    assert.equal(s[1], "background-color, color, box-shadow");
    await page.mouse.up();
    await context.close();
  });

  test("the Rules no longer ban press-shrink, and say what the press is", () => {
    assert.doesNotMatch(skill, /press-shrink/);
    assert.match(usageOf("core"), /`\.btn` also scales to \.98 \(100ms, ease-out\) while pressed, never when disabled or busy and never under reduced motion/);
    assert.doesNotMatch(usageOf("core"), /press-shrink/);
    assert.match(skill, /A press is a colour step; only `\.btn` scales/);
  });
});

describe("standalone links on touch", () => {
  const html = '<div id="probes"><div id="own" style="line-height:20px"><a href="#top" id="l-own">On its own</a></div><nav><ul><li><a href="#top" id="l-nav">Nav link</a></li></ul></nav><p id="para">Some words <a href="#top" id="l-inline">an inline link</a> in running text.</p><div id="tapped" style="line-height:20px"><a href="#top" class="tap" id="l-tap">Opted in</a></div><div class="prose"><p><a href="#top" id="l-prose">prose</a></p></div></div>';
  const measure = (page) => page.evaluate((h) => {
    document.querySelector("main").insertAdjacentHTML("afterbegin", h);
    const box = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [Math.round(r.height * 10) / 10, Math.round(r.width * 10) / 10]; };
    return { own: box("#l-own"), nav: box("#l-nav"), inline: box("#l-inline"), tap: box("#l-tap"), prose: box("#l-prose"), ownRow: box("#own")[0], navRow: box("nav")[0], para: box("#para")[0], tapRow: box("#tapped")[0] };
  }, html);

  test("a link on its own is 44px tall and a link in running text is not; none of them moves the layout", async () => {
    const touch = await open("template-static.html", { touch: true, width: 390 });
    const fine = await open("template-static.html", { width: 390 });
    const [t, f] = [await measure(touch.page), await measure(fine.page)];
    for (const k of ["own", "nav", "tap"]) assert.ok(t[k][0] >= 43.5, `${k} is ${t[k][0]}px tall`);
    assert.ok(t.inline[0] < 30, `an inline link stays inline (${t.inline[0]}px)`);
    assert.ok(t.prose[0] < 30, `and so does a link in .prose (${t.prose[0]}px)`);
    for (const k of ["ownRow", "navRow", "para", "tapRow"]) assert.ok(Math.abs(t[k] - f[k]) <= 1, `${k}: ${t[k]}px on touch, ${f[k]}px on a fine pointer`);
    assert.ok(await touch.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await touch.context.close();
    await fine.context.close();
  });

  test("on a fine pointer a link is untouched", async () => {
    const { page, context } = await open("template-static.html");
    const m = await measure(page);
    assert.ok(m.own[0] < 30, `${m.own[0]}px`);
    await context.close();
  });
});

describe("the display size", () => {
  test(".text-5xl is the text-5xl token: 56/60, -0.035em, semibold; no new token", async () => {
    const { page, context } = await open("template-static.html");
    const s = await page.evaluate(() => { document.querySelector("main").insertAdjacentHTML("afterbegin", '<p class="text-5xl" id="d5">Display</p>'); const c = getComputedStyle(document.querySelector("#d5")); return [c.fontSize, c.lineHeight, c.letterSpacing, c.fontWeight]; });
    assert.deepEqual(s, ["56px", "60px", `-1.96px`, "600"]);
    assert.doesNotMatch(files["parts/core.css"].slice(files["parts/core.css"].indexOf("@layer basalt{")), /--basalt-text-6xl|--bh-5xl/);
    await context.close();
  });
});

describe("the active row in forced colours", () => {
  test("the lit row's plate is Highlight and every part is HighlightText, with no backplate and no bar; a lit danger row takes the same pairing", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.emulateMedia({ forcedColors: "active" });
    await page.evaluate(() => window.Basalt.openPalette({ groups: [{ label: "G", items: [
      { label: "Copy", icon: "Download", hint: "a hint", keys: ["⌘", "C"] }, { label: "Danger", icon: "Download", danger: true, hint: "bad" }, { label: "Plain" }] }] }));
    await page.locator(".palette input").waitFor();
    const highlight = await resolveCss(page, "Highlight", "background-color");
    const text = await resolveCss(page, "HighlightText", "color");
    assert.notEqual(highlight, text);
    const read = (selector) => page.locator(selector).first().evaluate((row) => {
      const c = (el, pseudo) => getComputedStyle(el, pseudo);
      return {
        row: [c(row).backgroundColor, c(row).color, c(row).forcedColorAdjust], plate: [c(row, "::before").backgroundColor, c(row, "::before").content, c(row, "::before").width],
        parts: ["svg", ".row-label", ".row-hint", ".kbd"].map((q) => (row.querySelector(q) ? c(row.querySelector(q)).color : null)),
        chip: row.querySelector(".kbd") ? [c(row.querySelector(".kbd")).backgroundColor, c(row.querySelector(".kbd")).borderTopColor] : null,
      };
    });
    const lit = await read(".palette [data-active]");
    assert.deepEqual(lit.row, ["rgba(0, 0, 0, 0)", text, "none"], "the row paints no backplate of its own: the plate is its ::before");
    assert.deepEqual(lit.plate[0], highlight);
    assert.deepEqual(lit.parts, [text, text, text, text]);
    assert.deepEqual(lit.chip, [highlight, text]);
    assert.equal(await page.locator(".palette .plate").evaluate((el) => getComputedStyle(el).display), "none", "no shared plate in forced colours: each row lights on its own");
    // the danger row, lit
    await page.keyboard.press("ArrowDown");
    const danger = await read(".palette [data-active]");
    assert.deepEqual([danger.row[1], danger.plate[0], danger.parts.slice(0, 3)], [text, highlight, [text, text, text]]);
    // an unlit row is not Highlight, and its plate is not drawn
    const other = await read(".palette [role=option]:not([data-active])");
    assert.notEqual(other.plate[0], highlight);
    assert.notEqual(other.row[1], text);
    await context.close();
  });
});

describe("layout fixes", () => {
  test(".panel-head wraps at 390 instead of running off the panel", async () => {
    const { page, context } = await open("template-static.html", { touch: true, width: 390 });
    const out = await page.evaluate(() => {
      document.querySelector("main").insertAdjacentHTML("afterbegin", '<div class="panel" id="ph"><div class="panel-head"><span>A deploy history with a long title</span><span class="badge">Production</span><span class="spacer"></span><button class="btn" data-size="sm">Compare</button><button class="btn" data-size="sm">Roll back</button></div></div>');
      const panel = document.querySelector("#ph"); const head = panel.firstElementChild;
      return { wrap: getComputedStyle(head).flexWrap, over: head.scrollWidth - head.clientWidth, page: document.documentElement.scrollWidth <= window.innerWidth, tall: head.getBoundingClientRect().height };
    });
    assert.equal(out.wrap, "wrap");
    assert.ok(out.over <= 0, `overflows by ${out.over}px`);
    assert.ok(out.page, "no sideways scroll");
    assert.ok(out.tall > 60, "it took a second line");
    await context.close();
  });

  test(".stats.small keeps its columns inside a flex row", async () => {
    const { page, context } = await open("template-interactive.html");
    const out = await page.evaluate(() => {
      document.querySelector("main").insertAdjacentHTML("afterbegin", '<div id="fx" style="display:flex;gap:24px;width:900px"><div style="width:200px">Left</div><dl class="stats small num" id="fs" style="--min: 8rem"><div class="stat"><dt class="stat-label">A</dt><dd class="stat-value">1</dd></div><div class="stat"><dt class="stat-label">B</dt><dd class="stat-value">2</dd></div><div class="stat"><dt class="stat-label">C</dt><dd class="stat-value">3</dd></div></dl></div>');
      const s = document.querySelector("#fs");
      return { width: s.getBoundingClientRect().width, tracks: getComputedStyle(s).gridTemplateColumns.split(" ").filter((t) => parseFloat(t) > 0).length };
    });
    assert.equal(out.tracks, 3, "three columns");
    assert.ok(out.width >= 3 * 128, `${out.width}px wide`);
    await context.close();
  });

  for (const width of [1440, 390]) {
    test(`.footer works outside .page: no doubled margin, on the page's own column (${width}px)`, async () => {
      const { page, context } = await open("template-static.html", { width, touch: width === 390 });
      const out = await page.evaluate(() => {
        const inside = document.querySelector("main .footer");
        const page = document.querySelector("main.page");
        const pr = page.getBoundingClientRect(); const cs = getComputedStyle(page);
        const column = [pr.left + parseFloat(cs.paddingLeft), pr.right - parseFloat(cs.paddingRight)].map((n) => Math.round(n * 10) / 10);
        const innerMargin = getComputedStyle(inside).marginTop;
        const innerBox = [inside.getBoundingClientRect().left, inside.getBoundingClientRect().right].map((n) => Math.round(n * 10) / 10);
        const outside = document.createElement("footer"); outside.className = "footer"; outside.id = "outside"; outside.textContent = "Outside";
        page.after(outside);
        const o = outside.getBoundingClientRect();
        return { innerMargin, innerBox, column, outsideMargin: getComputedStyle(outside).marginTop, outside: [Math.round(o.left * 10) / 10, Math.round(o.right * 10) / 10], scroll: document.documentElement.scrollWidth <= window.innerWidth };
      });
      assert.equal(out.innerMargin, "64px", "inside .page it keeps its space");
      assert.equal(out.outsideMargin, "0px", "outside .page the page's own bottom padding is the space");
      assert.deepEqual(out.innerBox, out.column);
      assert.deepEqual(out.outside, out.column, "the same column as the page's content");
      assert.ok(out.scroll);
      await context.close();
    });
  }
});

describe("palette rows say their shortcut in words", () => {
  test("a row with keys carries aria-describedby beside aria-keyshortcuts, and its name stays the label", async () => {
    const { page, context } = await open("template-static.html", { all: true });
    await page.evaluate(`window.Basalt.init({ palette: { groups: [{ label: "Page", items: [
      { label: "Save", keys: ["⌘", "S"] }, { label: "Jump", keys: ["⌥", "J"] }, { label: "Open", keys: ["⌃", "⇧", "O"] }, { label: "Plain" }
    ] }] } });`);
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    const rows = await page.evaluate(() => [...document.querySelectorAll(".palette [role=option]")].map((row) => {
      const id = row.getAttribute("aria-describedby");
      return [row.querySelector(".row-label").textContent, row.getAttribute("aria-keyshortcuts"), id && document.getElementById(id)?.textContent, id && !!row.querySelector(`#${id}`)];
    }));
    assert.deepEqual(rows, [["Save", "Meta+S", "Command S", false], ["Jump", "Alt+J", "Option J", false], ["Open", "Control+Shift+O", "Control Shift O", false], ["Plain", null, null, null]]);
    assert.equal(await page.getByRole("option", { name: "Save", exact: true }).count(), 1, "the name stays Save, not Save Command S");
    await page.keyboard.type("jump");
    assert.equal(await page.locator(".palette [role=option]").count(), 1);
    assert.equal(await page.locator(".palette [role=option]").getAttribute("aria-describedby") !== null, true, "kept after a filter re-renders");
    await settle(page);
    assert.deepEqual(await axe(page), []);
    await context.close();
  });
});

describe("the accessibility notes are in the SKILL and the usage texts", () => {
  test("a spinner beside a word is aria-hidden; a section and its table region don't share a name", () => {
    assert.match(usageOf("spinner"), /A spinner beside a visible word is decoration: put `aria-hidden="true"` on it/);
    assert.match(usageOf("table"), /Don't give a section and an inner `\.table-wrap` region the same accessible name \(axe `landmark-unique`\)/);
  });

  test("the layer is `basalt`, and the SKILL says an unlayered rule wins", () => {
    assert.match(skill, /`@layer basalt`[^.]*any unlayered rule of yours wins/);
  });
});
