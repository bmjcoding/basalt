// Micro-details m6, themes and native chrome (DECISIONS 420), in the skill. H2: compose writes the media-scoped theme-color pair right after the colour
// scheme (markup no script touches), the head snippet keeps a live tag first, and one core function (_.writeTheme) writes every theme and then syncs it
// (_.syncThemeColor): setThemeChoice, followSystem, storage, the deprecated toggle and a page's own data-theme write (the theme module's watch). Print
// passes quiet and leaves the live tag alone. The core watches the root itself, so a plain page with no theme module follows an author's own write too. A palette's pair on the live tag (data-light, data-dark) survives every later sync. H4: the switch window
// (data-theme-switching) zeroes every transition's duration and delay for the one write and touches nothing else. H6: selected text in the core, the
// primary button's inverse pair, the disabled button's page pair, the sparkline's number transparent under its strips, forced colours. Written while tests
// are paused (DECISIONS 359): not yet run. React's share is packages/react/test/theme-chrome.test.mjs and selection.test.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, read, repoRoot, skillDir } from "./support.mjs";

const tokens = JSON.parse(fs.readFileSync(path.join(repoRoot, "packages", "tokens", "dist", "json", "tokens.json"), "utf8"));
const LIGHT = tokens.light["surface-page"].hex;
const DARK = tokens.dark["surface-page"].hex;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page, n = 2) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

const CHOICE = `<div class="theme-choice"><span class="theme-choice-label" id="tl">Theme</span><div class="segment" role="radiogroup" aria-labelledby="tl">
  <button type="button" role="radio" data-value="system"><span data-label="System">System</span></button>
  <button type="button" role="radio" data-value="light"><span data-label="Light">Light</span></button>
  <button type="button" role="radio" data-value="dark"><span data-label="Dark">Dark</span></button></div></div>`;
const MENU = `<button class="btn" data-variant="ghost" data-icon-only data-theme-menu popovertarget="theme-menu" aria-label="Theme: System"></button>
<div class="panel float menu" popover id="theme-menu" aria-label="Theme"><div role="group" aria-label="Theme">
  <button class="menu-item" role="menuitemradio" aria-checked="true" data-value="system"><span class="menu-item-label">System</span></button>
  <button class="menu-item" role="menuitemradio" aria-checked="false" data-value="light"><span class="menu-item-label">Light</span></button>
  <button class="menu-item" role="menuitemradio" aria-checked="false" data-value="dark"><span class="menu-item-label">Dark</span></button>
</div></div>`;
const BODY = `<title>Chrome</title><main class="page">
  <p id="body">Tide tables for the week, <span class="muted" id="muted">printed at dawn</span>.</p>
  <button class="btn" data-variant="primary" id="primary">Publish</button>
  <button class="btn" data-variant="primary" id="disabled" disabled>Publish</button>
  <button type="button" data-theme-toggle id="toggle"></button>
  <span class="spinner" role="status" aria-label="Saving"></span>
  <braille-spinner label="Loading"></braille-spinner>
  <div id="mover" style="width: 40px; height: 40px; background: var(--basalt-surface-raised); transition: transform 1s linear"></div>
  ${CHOICE}
  ${MENU}
</main>`;
const page = () => compose(BODY, { fonts: false }).html;

/** Every theme-color tag in the head, in order, and the first whose media matches: the one the browser uses. */
const chrome = (p) => p.evaluate(() => {
  const all = [...document.head.querySelectorAll('meta[name="theme-color"]')];
  const first = all.find((m) => !m.media || matchMedia(m.media).matches);
  return { kinds: all.map((m) => m.getAttribute("data-basalt-theme-color") ?? "app"), first: first && first.content, live: document.head.querySelector('meta[data-basalt-theme-color="live"]')?.content ?? null };
});
const waitChrome = (p, content) => p.waitForFunction((c) => [...document.head.querySelectorAll('meta[name="theme-color"]')].find((m) => !m.media || matchMedia(m.media).matches)?.content === c, content);
const pair = (p) => p.evaluate(() => [...document.head.querySelectorAll('meta[data-basalt-theme-color=""]')].map((m) => [m.getAttribute("media"), m.getAttribute("content")]));
const PAIR = [["(prefers-color-scheme: light)", LIGHT], ["(prefers-color-scheme: dark)", DARK]];

describe("H2: compose writes the pair, the head snippet the live tag", () => {
  test("the pair comes right after the colour scheme, light then dark, the page ground of each, marked; the head snippet after them", () => {
    const html = page();
    const scheme = '<meta name="color-scheme" content="dark light">';
    const at = html.indexOf(scheme) + scheme.length;
    assert.equal(html.slice(at, at + 1), "\n");
    const lines = html.slice(at + 1).split("\n");
    assert.equal(lines[0], `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${LIGHT}" data-basalt-theme-color>`);
    assert.equal(lines[1], `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${DARK}" data-basalt-theme-color>`);
    assert.ok(html.indexOf("data-basalt-theme-color=live") > html.indexOf(lines[1]), "the head snippet runs after the pair is parsed");
  });

  test("the core's and the head snippet's literals are tokens.json's surface-page", () => {
    const core = read(skillDir, "parts", "core.js");
    assert.ok(core.includes(`"${DARK}"`) && core.includes(`"${LIGHT}"`));
    assert.ok(page().includes(`m.content=t==="dark"?"${DARK}":"${LIGHT}"`));
  });

  test("a body may not bring its own theme-color: headTag refuses it, so the skill never has an app's tag beside its pair", () => {
    assert.throws(() => compose(`<title>T</title><meta name="theme-color" content="#123456"><p>x</p>`, { fonts: false }), /not accepted/);
  });

  for (const scheme of ["light", "dark"]) {
    test(`system ${scheme}: the live tag is first, the pair untouched, the chrome the page ground; script off, the pair alone matches by media`, async () => {
      const { page: p, context } = await openHtml(browser, page(), { scheme });
      const state = await chrome(p);
      assert.deepEqual(state.kinds, ["live", "", ""]);
      assert.equal(state.first, scheme === "dark" ? DARK : LIGHT);
      assert.deepEqual(await pair(p), PAIR);
      await context.close();
      const off = await browser.newContext({ colorScheme: scheme, javaScriptEnabled: false });
      await off.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: page() }));
      const still = await off.newPage();
      await still.goto("https://basalt.test/");
      const bare = await chrome(still);
      assert.deepEqual(bare.kinds, ["", ""]);
      assert.equal(bare.first, scheme === "dark" ? DARK : LIGHT);
      await off.close();
    });
  }

  test("every theme write syncs it: setThemeChoice, followSystem, storage, the deprecated toggle, and a page's own data-theme write", async () => {
    const { page: p, context, errors } = await openHtml(browser, page(), { scheme: "light" });
    await p.evaluate(() => window.Basalt.setThemeChoice("dark"));
    await waitChrome(p, DARK);
    await p.evaluate(() => window.Basalt.setThemeChoice("system"));
    await waitChrome(p, LIGHT);
    await p.emulateMedia({ colorScheme: "dark" });
    await waitChrome(p, DARK);
    await p.evaluate(() => { localStorage.setItem("basalt-theme", "light"); window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: "light" })); });
    await waitChrome(p, LIGHT);
    await p.locator("#toggle").click();
    await waitChrome(p, DARK);
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await waitChrome(p, LIGHT);
    assert.deepEqual(await pair(p), PAIR, "no script wrote the pair");
    assert.deepEqual((await chrome(p)).kinds, ["live", "", ""]);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("a palette's pair on the live tag survives an OS flip, another tab, the toggle and a hand write; removed, Basalt's ground comes back", async () => {
    const ground = { light: "#f3efe6", dark: "#0b1520" };
    const { page: p, context } = await openHtml(browser, page(), { scheme: "light" });
    await p.evaluate((g) => { const m = document.head.querySelector('meta[data-basalt-theme-color="live"]'); m.setAttribute("data-light", g.light); m.setAttribute("data-dark", g.dark); }, ground);
    await p.emulateMedia({ colorScheme: "dark" });
    await waitChrome(p, ground.dark);
    await p.evaluate(() => { localStorage.setItem("basalt-theme", "light"); window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: "light" })); });
    await waitChrome(p, ground.light);
    await p.locator("#toggle").click();
    await waitChrome(p, ground.dark);
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await waitChrome(p, ground.light);
    await p.evaluate(() => { const m = document.head.querySelector('meta[data-basalt-theme-color="live"]'); m.removeAttribute("data-light"); m.removeAttribute("data-dark"); window.Basalt.setThemeChoice("dark"); });
    await waitChrome(p, DARK);
    await context.close();
  });

  test("a plain page (no theme control, so no theme module): the author's own data-theme write and a .dark root move the chrome through the core", async () => {
    const plain = compose(`<title>Plain</title><main class="page"><p>Tide tables for the week.</p></main>`, { fonts: false });
    assert.ok(!plain.modules.includes("theme"), "the page carries no theme module");
    const { page: p, context, errors } = await openHtml(browser, plain.html, { scheme: "light" });
    assert.equal((await chrome(p)).live, LIGHT);
    assert.equal(await p.evaluate(() => document.head.querySelector('meta[data-basalt-theme-color="live"]').getAttribute("property")), "basalt-live");
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await waitChrome(p, DARK);
    await p.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.classList.add("light"); });
    await waitChrome(p, LIGHT);
    await p.evaluate(() => window.Basalt.setTheme("dark"));
    await waitChrome(p, DARK);
    assert.deepEqual(await pair(p), PAIR);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("print takes the light theme quietly: the live tag is left as it was, and the theme comes back after", async () => {
    const { page: p, context } = await openHtml(browser, page(), { scheme: "dark" });
    assert.equal((await chrome(p)).live, DARK);
    const during = await p.evaluate(() => { window.dispatchEvent(new Event("beforeprint")); const r = [document.documentElement.getAttribute("data-theme"), document.head.querySelector('meta[data-basalt-theme-color="live"]').content]; window.dispatchEvent(new Event("afterprint")); return r; });
    assert.deepEqual(during, ["light", DARK]);
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark");
    assert.equal((await chrome(p)).live, DARK);
    await context.close();
  });
});

describe("H4: a theme switch is instant, and touches nothing else", () => {
  const COLOUR = /color|background|border|fill|stroke|shadow|outline/;
  async function open(scheme = "light") {
    const opened = await openHtml(browser, page(), { scheme });
    await opened.page.evaluate(() => {
      window.__runs = [];
      document.addEventListener("transitionrun", (e) => window.__runs.push({ property: e.propertyName, cls: String(e.target.className?.baseVal ?? e.target.className ?? ""), choice: Boolean(e.target.closest?.(".theme-choice,.menu")) }), true);
      window.__loops = document.getAnimations().filter((a) => a instanceof CSSAnimation);
    });
    return opened;
  }
  const loops = (p) => p.evaluate(() => window.__loops.map((a) => ({ name: a.animationName, start: a.startTime, alive: document.getAnimations().includes(a) })));

  for (const how of ["choice", "os", "storage", "toggle"]) {
    test(`by ${how}: no colour transition runs, both directions; the ring and braille keep their Animation objects and start times; the window is closed`, async () => {
      const { page: p, context } = await open("light");
      if (how === "os") await p.evaluate(() => window.Basalt.setThemeChoice("system"));
      const before = await loops(p);
      assert.ok(before.length >= 2, "the ring and braille are running");
      for (const to of ["dark", "light"]) {
        await p.evaluate(() => { window.__runs.length = 0; });
        if (how === "choice") await p.evaluate((t) => window.Basalt.setThemeChoice(t), to);
        else if (how === "os") await p.emulateMedia({ colorScheme: to });
        else if (how === "storage") await p.evaluate((t) => { localStorage.setItem("basalt-theme", t); window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: t })); }, to);
        else await p.locator("#toggle").click();
        await p.waitForFunction((t) => document.documentElement.getAttribute("data-theme") === t, to);
        await frames(p);
        assert.deepEqual(await p.evaluate((re) => window.__runs.filter((r) => new RegExp(re).test(r.property) && !r.choice), COLOUR.source), [], `${how} to ${to}`);
        assert.equal(await p.evaluate(() => document.documentElement.hasAttribute("data-theme-switching")), false);
      }
      assert.deepEqual(await loops(p), before);
      await context.close();
    });
  }

  test("a 1s transform under way at about 120ms is still between its ends 50ms after the switch", async () => {
    const { page: p, context } = await open("light");
    await p.evaluate(() => { document.getElementById("mover").style.transform = "translateX(200px)"; });
    await p.waitForTimeout(120);
    await p.evaluate(() => window.Basalt.setThemeChoice("dark"));
    await p.waitForTimeout(50);
    const x = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById("mover")).transform).m41);
    assert.ok(x > 0 && x < 200, `mid-way (${x}px)`);
    await context.close();
  });

  test("the theme choice's pill slides after the switch, and the theme menu's close fade runs", async () => {
    const { page: p, context } = await open("light");
    await p.evaluate(() => { window.__runs.length = 0; });
    await p.getByRole("radio", { name: "Dark" }).click();
    await p.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "dark");
    await frames(p, 3);
    assert.ok((await p.evaluate(() => window.__runs.filter((r) => r.property === "transform" && r.choice))).length >= 1, "the pill's transform ran");
    await p.locator("[data-theme-menu]").click();
    await p.locator("#theme-menu").waitFor();
    await frames(p, 3);
    await p.evaluate(() => { window.__runs.length = 0; });
    await p.getByRole("menuitemradio", { name: "Light" }).click();
    await p.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "light");
    await frames(p, 3);
    assert.ok((await p.evaluate(() => window.__runs.filter((r) => r.property === "opacity" && r.choice))).length >= 1, "the menu's close fade ran");
    await context.close();
  });

  test("core.css holds the window: duration and delay zero with !important, and nothing else", () => {
    const css = read(skillDir, "parts", "core.css");
    const rule = css.match(/:root\[data-theme-switching\][^{]*\{([^}]*)\}/);
    assert.ok(rule);
    assert.deepEqual(rule[1].split(";").map((d) => d.trim()).filter(Boolean), ["transition-duration:var(--basalt-duration-instant)!important", "transition-delay:var(--basalt-duration-instant)!important"]);
  });
});

describe("H6: selected text", () => {
  const sel = (p, s) => p.locator(s).first().evaluate((el) => { const c = getComputedStyle(el, "::selection"); return { bg: c.backgroundColor, ink: c.color }; });
  const tok = (p, n) => p.evaluate((n) => { const d = document.createElement("span"); d.style.color = `var(--basalt-${n})`; document.body.append(d); const v = getComputedStyle(d).color; d.remove(); return v; }, n);
  const SPARK = `<title>Spark</title><p id="body">Visitors <span class="sparkline-value" id="spark"><span class="sparkline-text">1284</span><span aria-hidden="true"><span data-d><span>1</span></span></span></span></p>`;

  for (const scheme of ["dark", "light"]) {
    test(`${scheme}: the wash and primary ink on body and muted text, the inverse pair on a primary button, the page pair on a disabled one`, async () => {
      const { page: p, context } = await openHtml(browser, page(), { scheme });
      const pagePair = { bg: await tok(p, scheme === "dark" ? "white-24" : "black-24"), ink: await tok(p, "text-primary") };
      assert.deepEqual(await sel(p, "#body"), pagePair);
      assert.deepEqual(await sel(p, "#muted"), pagePair);
      assert.deepEqual(await sel(p, "#primary"), { bg: await tok(p, scheme === "dark" ? "black-24" : "white-24"), ink: await tok(p, "action-primary-text") });
      assert.deepEqual(await sel(p, "#disabled"), pagePair);
      await context.close();
    });

    test(`${scheme}: the sparkline's number stays transparent when selected; forced colours are Highlight and HighlightText`, async () => {
      const { page: p, context } = await openHtml(browser, compose(SPARK, { fonts: false }).html, { scheme });
      assert.equal((await sel(p, ".sparkline-text")).ink, "rgba(0, 0, 0, 0)");
      await p.emulateMedia({ forcedColors: "active" });
      const want = await p.evaluate(() => { const d = document.createElement("span"); document.body.append(d); d.style.color = "Highlight"; const bg = getComputedStyle(d).color; d.style.color = "HighlightText"; const ink = getComputedStyle(d).color; d.remove(); return { bg, ink }; });
      assert.deepEqual(await sel(p, "#body"), want);
      await context.close();
    });
  }
});
