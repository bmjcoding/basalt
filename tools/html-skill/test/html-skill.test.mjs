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

import { build, skillDir } from "../build.mjs";
import { iconData } from "../icons.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const files = build();
// The inline budget: the built size of the skill with its 24 icons in Bold and Regular (79,055 bytes, which includes Phosphor's
// 1,071-byte MIT notice: the licence requires it with the icon paths) under the 78 KiB cap. The notices did not need a larger cap.
// History: 60 KiB, then 64 KiB for the review fixes; 78 KiB for the surfaces-and-fixes round (13 panel-agreed items, and
// Regular icons: 72.7 KB with 12 icons, 77.3 KB with 24; even fully minified the 12-icon build is 63.1 KB), which the owner
// approved. A new name in icons.json or a new primitive has to fit in what is left, or say why it should not.
const BUDGET = 78 * 1024;
const repoRoot = path.join(skillDir, "..", "..", "..");
const TEMPLATES = ["template-static.html", "template-interactive.html"];

let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

describe("the skill files", () => {
  for (const name of Object.keys(files)) {
    test(`${name} equals the build output (run \`npm run build\` if this fails)`, () => {
      const committed = path.join(skillDir, name);
      assert.ok(fs.existsSync(committed), `${name} is missing from .claude/skills/basalt-html`);
      assert.equal(fs.readFileSync(committed, "utf8"), files[name]);
    });
  }

  test("the CSS and JS stay small enough to paste inline (under 78 KiB together, unminified)", () => {
    const bytes = Buffer.byteLength(files["basalt-html.css"]) + Buffer.byteLength(files["basalt-html.js"]);
    assert.ok(bytes < BUDGET, `css + js is ${bytes} bytes of ${BUDGET}`);
  });

  test("the script carries Phosphor's whole MIT notice as a legal comment, and the templates that inline it do too", () => {
    const mit = fs.readFileSync(path.join(repoRoot, "node_modules", "@phosphor-icons", "react", "LICENSE"), "utf8").trim();
    for (const name of ["basalt-html.js", ...TEMPLATES]) {
      assert.ok(files[name].includes(mit), `${name} carries the licence text`);
      assert.match(files[name], /\/\*! [^\n]*Phosphor/, `${name}: a /*! comment, which minifiers keep`);
    }
  });

  test("SKILL.md names the skill, and AGENTS.md points every agent at it", () => {
    const skill = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
    assert.match(skill, /^---\nname: basalt-html\ndescription: .{40,}\n---/);
    const agents = fs.readFileSync(path.join(skillDir, "..", "..", "..", "AGENTS.md"), "utf8");
    assert.match(agents, /\.claude\/skills\/basalt-html\/SKILL\.md/);
  });

  test("the CSS uses tokens and the two themes: data-theme and prefers-color-scheme", () => {
    const css = files["basalt-html.css"];
    assert.match(css, /\[data-theme="dark"\]/);
    assert.match(css, /prefers-color-scheme: dark/);
    const primitives = css.slice(css.indexOf("@layer basalt-html"));
    assert.doesNotMatch(primitives, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|gradient\(/i, "no raw colour or gradient in the primitives");
  });

  test("the JS has no import-time work beyond defining window.Basalt", () => {
    const calls = [];
    const events = [];
    const document = { addEventListener: (type) => events.push(type), querySelectorAll: () => { calls.push("query"); return []; }, documentElement: {} };
    const window = {};
    new Function("window", "document", "matchMedia", "localStorage", "sessionStorage", "navigator", files["basalt-html.js"])(window, document, () => ({ matches: false }), {}, {}, {});
    assert.ok(window.Basalt && typeof window.Basalt.init === "function");
    assert.deepEqual([calls, events], [[], []]);
  });
});

async function open(file, { scheme = "light", width = 1440, touch = false, reducedMotion = "no-preference", permissions, transform = (html) => html } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion, isMobile: touch, hasTouch: touch, permissions,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
  // a real (fake-host) origin, so storage and the clipboard work, as they do from a hosted file
  await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: transform(files[file]) }));
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

  test("holds still: braille is a held frame, the ring and the busy button only fade, nothing moves", async () => {
    const { page, context } = await open("template-interactive.html", { reducedMotion: "reduce" });
    await page.locator("#recalc").click();
    await page.evaluate((html) => { document.querySelector("#status").insertAdjacentHTML("afterend", html); }, spinners);
    await page.waitForSelector("braille-spinner .braille-dot");
    const report = await page.evaluate(() => {
      const kinds = document.getAnimations().map((a) => ({ name: a.animationName ?? a.transitionProperty, properties: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)) }));
      const dot = getComputedStyle(document.querySelector(".braille-dot"));
      const held = [...document.querySelectorAll("braille-spinner .braille-dot")].map((d) => getComputedStyle(d).opacity);
      return { kinds, animationName: dot.animationName, held, busyRing: getComputedStyle(document.querySelector("#recalc"), "::after").animationName };
    });
    assert.equal(report.animationName, "none", "braille does not step");
    assert.equal(report.busyRing, "bh-fade", "the busy ring fades instead of turning");
    assert.deepEqual(report.held, ["1", "1", "0", "1", "0", "0", "0", "0"], "braille holds its first frame");
    for (const k of report.kinds) assert.ok(k.properties.every((p) => ["opacity", "backgroundColor", "color", "boxShadow"].includes(p)), `${k.name} animates ${k.properties.join(", ")}: only opacity and colour steps may run`);
    await context.close();
  });

  test("with motion allowed the braille spinner steps and the ring and the busy button turn", async () => {
    const { page, context } = await open("template-interactive.html");
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
    const { page, context } = await open("template-static.html");
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
    const { page, context, errors } = await open("template-interactive.html", { transform: (html) => html.replace('data-icon="MagnifyingGlass"', 'data-icon="Sparkles"').replace('data-icon="Copy"', 'data-icon="Sparkles"') });
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
    const { page, context, errors } = await open("template-static.html", { transform: (html) => html.replace("</main>", '<script type="application/json" data-palette>{ not json</script></main>') });
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /Basalt: .* failed/);
    await page.locator("[data-disclosure]").click();
    assert.equal(await page.locator("[data-disclosure]").getAttribute("aria-expanded"), "true");
    await context.close();
  });
});

describe("the palette", () => {
  test("a link may be relative, http, https or mailto; javascript:, data: and obfuscated schemes are refused, and the palette still closes", async () => {
    const { page, context, errors } = await open("template-static.html");
    const hrefs = ["javascript:window.__executed=1;void 0", "  JavaScript:window.__executed=1", "java\tscript:window.__executed=1", "data:text/html,<script>parent.__executed=1</script>", "vbscript:x", "file:///etc/hosts"];
    for (const href of hrefs) {
      await page.evaluate((h) => window.Basalt.openPalette({ groups: [{ items: [{ label: "Untrusted", href: h }] }] }), href);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(30);
      assert.equal(await page.evaluate(() => window.__executed ?? false), false, href);
      assert.equal(await page.locator(".palette").count(), 0, "the palette closed");
      assert.equal(page.url(), "https://basalt.test/", href);
    }
    assert.equal(errors.length, hrefs.length);
    assert.ok(errors.every((e) => /palette link must be relative, http, https or mailto/.test(e)), errors.join("\n"));
    await context.close();
    // Each allowed link gets its own page, and the test waits for the navigation that link starts. One shared page went
    // back with goto while a relative link's navigation could still be in flight, which a slow runner turned into an
    // interrupted goto (the old wait, waitForURL(() => true), matched the current URL and returned at once).
    for (const href of ["#changes", "?page=2", "/other", "https://basalt.test/abs", "http://basalt.test/plain", "mailto:hello@example.com"]) {
      const { page, context, errors } = await open("template-static.html");
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
    const { page, context } = await open("template-static.html");
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
    await page.evaluate(() => { window.__spoken = []; new MutationObserver(() => window.__spoken.push(document.querySelector(".palette [role=status]")?.textContent)).observe(document.body, { subtree: true, childList: true, characterData: true }); });
    await page.keyboard.press("Control+k");
    await page.locator(".palette input").waitFor();
    assert.equal(await page.evaluate(() => !!document.querySelector(".palette [role=status]")), true, "the live region is inside the dialog");
    await page.keyboard.type("show json", { delay: 50 });
    await page.waitForTimeout(900);
    const spoken = (await page.evaluate(() => window.__spoken)).filter(Boolean);
    assert.ok(spoken.length <= 2, `spoken ${JSON.stringify(spoken)}`);
    assert.match(spoken.at(-1), /^\d+ results?$/);
    assert.equal(await page.evaluate(() => document.getElementById("basalt-live")?.textContent ?? ""), "", "the page-level region is not used");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("n", { delay: 10 });
    const after = await page.evaluate(() => window.__spoken.length);
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window.__spoken.length), after, "the same count is not spoken again");
    await context.close();
  });

  test("the input is described by the hints footer only while its chips show", async () => {
    const described = (page) => page.evaluate(() => {
      const id = document.querySelector(".palette input").getAttribute("aria-describedby");
      const el = id && document.getElementById(id);
      return el ? { footer: el.classList.contains("palette-footer"), words: ["Navigate", "Run", "Close"].filter((w) => el.textContent.includes(w)) } : null;
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
      document.querySelector("main").insertAdjacentHTML("beforeend", '<button class="btn" id="icon-copy" data-icon-only data-copy-text="x" aria-label="Copy payload"><i data-icon="Copy"></i></button>');
      window.Basalt.init();
    });
    const rest = await page.evaluate(() => [document.querySelector("[data-copy]").innerHTML, document.querySelector("#icon-copy").innerHTML]);
    for (const selector of ["[data-copy]", "#icon-copy"]) {
      await page.locator(selector).click();
      await page.waitForTimeout(200);
      await page.locator(selector).click();
    }
    assert.match(await page.locator("[data-copy]").textContent(), /Copied/);
    assert.equal(await page.locator("#icon-copy").getAttribute("aria-label"), "Copied");
    await page.waitForTimeout(2200);
    assert.deepEqual(await page.evaluate(() => [document.querySelector("[data-copy]").innerHTML, document.querySelector("#icon-copy").innerHTML]), rest);
    assert.equal(await page.locator("#icon-copy").getAttribute("aria-label"), "Copy payload");
    await context.close();
  });
});

describe("the layers", () => {
  test("the CSS declares reset before basalt-html, and both templates ship an empty reset block to write into", () => {
    assert.match(files["basalt-html.css"], /^@layer reset, basalt-html;/m);
    assert.ok(files["basalt-html.css"].indexOf("@layer reset, basalt-html;") < files["basalt-html.css"].indexOf("@layer basalt-html {"));
    for (const name of TEMPLATES) assert.ok(files[name].includes("<style>@layer reset { }</style>"), name);
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
        const clip = el.closest(".tabs").getBoundingClientRect();
        return { role: el.getAttribute("role"), offset: getComputedStyle(el).outlineOffset, inside: box.top >= clip.top && box.bottom <= clip.bottom && box.left >= clip.left && box.right <= clip.right };
      });
      assert.deepEqual([tab.role, tab.offset, tab.inside], ["tab", "-2px", true]);
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
      assert.deepEqual(out.padding, ["12px", "16px"]);
      await context.close();
    });
  }
});

describe("fonts", () => {
  test("geist.css is the two @font-face rules as data URIs with the licence, and inline-fonts.mjs puts it in a copy of a template", async () => {
    const geist = fs.readFileSync(path.join(skillDir, "geist.css"), "utf8");
    assert.match(geist, /SIL Open Font License/);
    const ofl = fs.readFileSync(path.join(repoRoot, "node_modules", "geist", "LICENSE.txt"), "utf8").trim();
    assert.ok(geist.includes(ofl), "the whole OFL 1.1 text, with its permission and conditions, is in geist.css");
    assert.match(geist, /PERMISSION AND CONDITIONS/);
    assert.equal((geist.match(/@font-face/g) ?? []).length, 2);
    assert.doesNotMatch(geist, /url\((?!"data:font\/woff2;base64,)/, "no font is fetched");
    for (const name of TEMPLATES) assert.equal(files[name].split("<!-- basalt:fonts -->").length, 2, `${name} carries the marker once`);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-fonts-"));
    try {
      for (const name of TEMPLATES) {
        const copy = path.join(dir, name);
        fs.copyFileSync(path.join(skillDir, name), copy);
        execFileSync(process.execPath, [path.join(skillDir, "inline-fonts.mjs"), copy]);
        const inlined = fs.readFileSync(copy, "utf8");
        assert.ok(!inlined.includes("<!-- basalt:fonts -->") && inlined.includes('font-family: "Geist Mono"'));
        assert.ok(inlined.includes(ofl), "a finished file carries the whole OFL text beside the fonts");
        execFileSync(process.execPath, [path.join(skillDir, "inline-fonts.mjs"), copy]);
        assert.equal(fs.readFileSync(copy, "utf8"), inlined, "a second run changes nothing");
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(`file://${copy}`);
        await page.evaluate(() => document.fonts.ready);
        const out = await page.evaluate(async () => {
          await Promise.all([document.fonts.load('600 32px "Geist"'), document.fonts.load('400 13px "Geist Mono"')]);
          return {
            loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', "")).sort(),
            h1: getComputedStyle(document.querySelector("h1")).fontFamily,
            code: getComputedStyle(document.querySelector("pre code, .code code") ?? document.querySelector("code")).fontFamily,
          };
        });
        assert.deepEqual(out.loaded, ["Geist", "Geist Mono"]);
        assert.match(out.h1, /^"?Geist"?/);
        assert.match(out.code, /^"?Geist Mono"?/);
        await context.close();
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a file with no marker is refused with a message, and no fonts variants are committed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "basalt-fonts-"));
    try {
      // text that only names Geist is not a finished file: it is refused, and left as it was
      const named = path.join(dir, "named.html");
      const body = '<!doctype html><head><style>body { font-family: "Geist" }</style></head>';
      fs.writeFileSync(named, body);
      assert.throws(() => execFileSync(process.execPath, [path.join(skillDir, "inline-fonts.mjs"), named], { stdio: "pipe" }), /Command failed/);
      assert.equal(fs.readFileSync(named, "utf8"), body);
      const bare = path.join(dir, "bare.html");
      fs.writeFileSync(bare, "<!doctype html><title>x</title>");
      assert.throws(() => execFileSync(process.execPath, [path.join(skillDir, "inline-fonts.mjs"), bare], { stdio: "pipe" }), /Command failed/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    assert.deepEqual(fs.readdirSync(skillDir).filter((f) => f.includes(".fonts.")), []);
    assert.match(skill, /inline-fonts\.mjs <file>/);
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
    await page.waitForTimeout(100);
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
      const { page, context } = await open("template-static.html", { scheme });
      await page.evaluate(() => document.querySelector("#top").insertAdjacentHTML("afterend", '<div id="probe"><div class="segment" role="group" aria-label="Range"><button type="button" aria-pressed="true">Day</button><button type="button" aria-pressed="false">Week</button></div> <span class="badge" data-status="success">Healthy</span> <span class="badge">3 open</span></div>'));
      const out = await page.evaluate(() => {
        const cs = (el, pseudo) => getComputedStyle(el, pseudo);
        const group = document.querySelector(".segment"), [on, off] = group.querySelectorAll("button");
        const [status, plain] = document.querySelectorAll(".badge");
        return {
          group: [cs(group).backgroundColor, cs(group).borderRadius, cs(group).paddingTop],
          on: [cs(on).backgroundColor, cs(on).boxShadow, cs(on).color, cs(on).height, cs(on).borderRadius, cs(on).fontWeight],
          off: [cs(off).backgroundColor, cs(off).boxShadow, cs(off).color],
          badge: [cs(plain).fontSize, cs(plain).fontWeight, cs(plain).color, cs(plain).borderRadius, cs(plain).height, cs(plain).boxShadow],
          dot: [cs(status, "::before").width, cs(status, "::before").content, cs(plain, "::before").content],
          dotColor: cs(status, "::before").backgroundColor,
        };
      });
      const px = (v) => resolve(page, "width", v);
      assert.deepEqual(out.group, [await resolve(page, "backgroundColor", "var(--basalt-surface-sunken-strong)"), await px("var(--basalt-radius-md)"), await px("var(--basalt-space-0-5)")]);
      assert.deepEqual(out.on.slice(0, 3), [await resolve(page, "backgroundColor", "var(--basalt-surface-top)"), await resolve(page, "boxShadow", "var(--basalt-shadow-pill)"), await resolve(page, "color", "var(--basalt-text-primary)")], "pressed is a raised pill with a hairline");
      assert.deepEqual(out.on.slice(3), [await px("var(--basalt-size-control-sm)"), await px("var(--basalt-radius-sm)"), "500"]);
      assert.deepEqual(out.off, ["rgba(0, 0, 0, 0)", "none", await resolve(page, "color", "var(--basalt-text-secondary)")]);
      assert.deepEqual(out.badge, [await px("var(--basalt-text-xs-size)"), "500", await resolve(page, "color", "var(--basalt-text-secondary)"), await px("var(--basalt-radius-xs)"), await px("var(--basalt-size-badge)"), await resolve(page, "boxShadow", "inset 0 0 0 var(--basalt-size-hairline) var(--basalt-border-hairline)")]);
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
    test(`${file}: no top bar, skip link, theme toggle or copy buttons in print; colour held on dots and progress; panels whole; code wraps`, async () => {
      const { page, context } = await open(file);
      await page.emulateMedia({ media: "print" });
      const out = await page.evaluate(() => {
        const cs = (sel, pseudo) => getComputedStyle(document.querySelector(sel), pseudo);
        const adjust = (c) => c.getPropertyValue("print-color-adjust") || c.getPropertyValue("-webkit-print-color-adjust");
        const panel = document.querySelector(".panel, .code, .table-wrap");
        return {
          hidden: [".topbar", ".skip-link", "[data-theme-toggle]"].concat(document.querySelector("[data-copy]") ? ["[data-copy]"] : []).map((sel) => cs(sel).display),
          adjust: [document.querySelector(".status") ? adjust(cs(".status", "::before")) : "exact", document.querySelector(".progress") ? adjust(cs(".progress > span")) : "exact"],
          inside: getComputedStyle(panel).breakInside,
          wrap: getComputedStyle(document.querySelector(".code-body")).whiteSpace,
        };
      });
      assert.ok(out.hidden.every((d) => d === "none"), out.hidden.join());
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
    const { page, context, errors } = await open("template-static.html");
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
    const { page, context } = await open("template-static.html");
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
    const { page, context } = await open("template-static.html");
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
    const { page, context } = await open("template-static.html");
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
    const { page, context, errors } = await open("template-static.html");
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

  test("the footer says Run and the empty state says No commands match.", async () => {
    const { page, context } = await open("template-interactive.html");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("qqqq");
    assert.equal(await page.locator(".palette-empty").textContent(), "No commands match.");
    assert.equal(await page.locator(".palette-empty").isVisible(), true);
    assert.deepEqual(await page.locator(".palette-footer > span").evaluateAll((spans) => spans.map((span) => span.lastChild.textContent)), ["Navigate", "Run", "Close"]);
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
    assert.doesNotMatch(files["template-interactive.html"], /Refresh prices|Prices as of today|refreshed just now/i);
    assert.match(files["template-interactive.html"], /Recalculate/);
  });
});

describe("icons", () => {
  const names = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "src", "icons.json"), "utf8"));

  test("Bold under 20px, Regular from 20px, generated from Phosphor; every listed name is in the SKILL", async () => {
    const data = iconData(names);
    const { page, context } = await open("template-static.html");
    for (const name of names) {
      const drawn = await page.evaluate((n) => [16, 19.9, 20, 24].map((size) => [...new DOMParser().parseFromString(window.Basalt.icon(n, { size }), "image/svg+xml").querySelectorAll("path")].map((p) => p.getAttribute("d"))), name);
      assert.deepEqual(drawn, [data[name][0], data[name][0], data[name][1], data[name][1]], name);
      assert.notDeepEqual(data[name][0], data[name][1], `${name} has two different weights`);
      assert.ok(skill.includes(name), `${name} is listed in SKILL.md`);
    }
    await context.close();
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
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "68px");
    await page.evaluate(() => document.querySelector("#services").scrollIntoView());
    const gap = await page.evaluate(() => document.querySelector("#services").getBoundingClientRect().top - document.querySelector(".topbar").getBoundingClientRect().bottom);
    assert.ok(gap >= 0, `the section starts ${gap}px below the bar`);
    await context.close();
  });
});

describe("the SKILL's rules", () => {
  test("the new rules are written down", () => {
    for (const rule of [
      /For any file a person will open, run `node \.claude\/skills\/basalt-html\/inline-fonts\.mjs <file>` after writing it\. Never paste font data\. Skip it only for files that tools read\./,
      /At 390 a table's name column and any status column come first and fit on screen; only numbers may scroll\. Don't hide a column to make it fit\./,
      /No row of stat tiles\.\*\* `\.stats` > `\.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number/,
      /A badge\*\* labels one object's status or count, always with a word; never decoration\./,
      /Need another icon\? Add its name to tools\/html-skill\/src\/icons\.json and rebuild\. Never draw one, never use an emoji\./,
      /the 2px bar is only for selection/i,
      /No single-character shortcuts on the page \(WCAG 2\.1\.4\)/,
      /standalone links too/,
      /Braille only while work runs on a mono or terminal line, never in a button/,
      /never on the primary fill/,
      /Tabs don't slide their indicator in static files/,
    ]) assert.match(skill, rule);
  });
});
