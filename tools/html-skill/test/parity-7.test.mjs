// The seventh parity PR (navigation and layout of batch 7: DECISIONS 108, step 5), in a browser: the site header (the .topbar that became React's SiteHeader), its links, the
// shared pill and its glide, its narrow menu, Nav, the app shell with its sidebar and rail, the phone tab bar with its More sheet, the layout tokens in place of the skill's raw lengths,
// and the faults the hero stream logged (the brand's 44 by 44 target, the coarse-pointer link margin, h2 and the prose measure). parity.test.mjs compares each part's computed styles
// with React's; this file pins the behaviour and the motion it can't read that way, in both themes, under reduced motion, in forced colours and on touch. Anything timed runs on the
// shared animation clock.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";

import { EXAMPLES, launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
};
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(count); }), n);
const THEMES = ["dark", "light"];

const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;
const LINKS = [["docs", "Docs"], ["pricing", "Pricing"], ["changelog", "Changelog"]];
const SITE = (extra = "") => `<a class="skip-link" href="#main">Skip to content</a>
<header class="topbar"><div class="topbar-inner">
  <a class="brand" href="#top" aria-label="Orbit home">${MARK}<span>Orbit</span></a>
  <nav class="topbar-links" aria-label="Primary">${LINKS.map(([id, label]) => `<a href="#${id}"${id === "docs" ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
  <span class="spacer"></span>
  <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button>
  <a class="btn topbar-action" data-variant="primary" href="#start" id="start-link">Get started</a>
</div></header>
<main id="main" class="page"><h1 id="top">Orbit</h1>${LINKS.map(([id, label]) => `<section id="${id}" style="min-height: 500px"><h2>${label}</h2><p>Synthetic section.</p></section>`).join("")}<section id="start" style="min-height: 500px"><h2>Start</h2></section></main>${extra}`;

const APP = `<div class="app-shell" data-tabbar>
  <aside class="app-sidebar">
    <div class="app-brand"><a class="brand" href="#" aria-label="Workbench home"><span class="brand-full">${MARK}<span>Workbench</span></span><span class="brand-rail">${MARK}</span></a></div>
    <div class="app-nav"><nav class="nav" aria-label="Primary"><ul class="nav-list">
      <li><a class="nav-item" href="#home" aria-current="page"><span class="nav-pill"><span data-glyph="home" data-size="24"></span><span class="nav-label">Home</span></span></a></li>
      <li><a class="nav-item" href="#search"><span class="nav-pill"><span data-glyph="search" data-size="24"></span><span class="nav-label">Search</span></span></a></li>
      <li><a class="nav-item" href="#inbox"><span class="nav-pill"><span data-glyph="notifications" data-size="24"></span><span class="nav-label">Inbox</span><span class="nav-count"><span class="visually-hidden">, </span>12</span></span></a></li>
      <li><a class="nav-item" href="#messages"><span class="nav-pill"><span data-glyph="messages" data-size="24"></span><span class="nav-label">Messages</span></span></a></li>
    </ul></nav></div>
    <div class="app-account"><nav class="nav" aria-label="Account"><ul class="nav-list"><li><a class="nav-item" href="#settings"><span class="nav-pill"><span data-glyph="settings" data-size="24"></span><span class="nav-label">Settings</span></span></a></li></ul></nav></div>
  </aside>
  <div class="app-column">
    <header class="app-header"><div class="app-bar"><h1 class="app-title">Overview</h1><span class="spacer"></span><div class="app-actions"><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button><button class="btn" data-variant="primary">New entry</button></div></div></header>
    <main class="app-main" id="main"><div style="height: 1600px"><button class="btn" id="toast-btn">Toast</button></div></main>
  </div>
  <nav class="tab-bar" aria-label="Primary"><ul class="tab-bar-list">
    <li><a class="tab-bar-item" href="#home" aria-current="page"><span class="tab-bar-glyph"><span data-glyph="home" data-size="24"></span></span><span class="tab-bar-label">Home</span></a></li>
    <li><a class="tab-bar-item" href="#search"><span class="tab-bar-glyph"><span data-glyph="search" data-size="24"></span></span><span class="tab-bar-label">Search</span></a></li>
    <li><a class="tab-bar-item" href="#inbox"><span class="tab-bar-glyph"><span data-glyph="notifications" data-size="24"></span><span class="tab-bar-dot" aria-hidden="true"></span></span><span class="tab-bar-label">Inbox</span><span class="visually-hidden">, New activity</span></a></li>
    <li><button class="tab-bar-item" type="button" data-dialog-open="#more" aria-label="More"><span class="tab-bar-glyph"><span data-glyph="more-nav" data-size="24"></span></span><span class="tab-bar-label">More</span></button></li>
  </ul></nav>
</div>
<dialog class="panel float modal sheet" id="more" data-side="bottom"><div class="tab-bar-sheet-head"><h2 class="dialog-title">More</h2><button class="btn" data-variant="ghost" data-icon-only aria-label="Close more" data-dialog-close><span data-glyph="close"></span></button></div>
  <nav class="nav" aria-label="More"><ul class="nav-list"><li><a class="nav-item" href="#settings" id="more-settings"><span class="nav-pill"><span data-glyph="settings" data-size="24"></span><span class="nav-label">Settings</span></span></a></li></ul></nav></dialog>
<script>document.getElementById('toast-btn').addEventListener('click', function () { Basalt.toast({ title: 'Saved', status: 'success' }); });</script>`;

const page = (body, options) => compose(`<title>t</title>${body}`, { fonts: false, ...options }).html;
const open = (body, options = {}) => openHtml(browser, page(body, options.compose), options);
const box = (p, selector) => p.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (p, selector, prop, pseudo) => p.locator(selector).first().evaluate((el, [name, ps]) => getComputedStyle(el, ps || undefined)[name], [prop, pseudo]);
// A system colour as the page resolves it (Highlight, Canvas, LinkText...), read through a probe, so a forced-colours test compares with what the browser paints.
const system = (p, name) => p.evaluate((n) => { const probe = document.createElement("i"); probe.style.color = n; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, name);
const tokenColour = (p, token) => p.evaluate((t) => { const probe = document.createElement("i"); probe.style.backgroundColor = `var(${t})`; document.body.append(probe); const c = getComputedStyle(probe).backgroundColor; probe.remove(); return c; }, token);
const who = (p) => p.evaluate(() => { const el = document.activeElement; return el ? el.getAttribute("aria-label") || el.textContent.trim() || el.tagName.toLowerCase() : "none"; });
const active = (p) => p.evaluate(() => { const el = document.activeElement; return el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${el.getAttribute("aria-label") ? `[${el.getAttribute("aria-label")}]` : ""}` : "none"; });

describe("a .topbar written before this step still composes and renders as the site header's bar", () => {
  for (const name of ["static", "interactive"]) {
    test(`the ${name} example: the bar is 56px, its brand a 44px target, no links, no Menu button and none of the links' parts`, async () => {
      const result = compose(EXAMPLES[name], { fonts: false });
      assert.ok(result.modules.includes("topbar"));
      assert.ok(!result.modules.includes("topbar-nav") && !result.modules.includes("sheet") && !result.modules.includes("glyph"), `a bar with no links carries only the bar: ${result.modules.join(", ")}`);
      const { page: p, context } = await openHtml(browser, result.html, { scheme: "dark" });
      assert.equal((await box(p, ".topbar")).h, 56);
      assert.equal((await box(p, ".brand")).h, 44);
      assert.equal(await p.locator(".topbar-menu-trigger, dialog.topbar-menu").count(), 0, "no menu is built for a bar with no links or action");
      assert.equal(await css(p, ".topbar", "position"), "sticky");
      assert.notEqual(await css(p, ".topbar", "backdropFilter"), "none", "still the smoked surface");
      await context.close();
    });
  }
});

for (const scheme of THEMES) {
  describe(`the site header (${scheme})`, () => {
    test("56px with its line inside, sticky, the one smoked surface; the row is the page's width, the brand 44 tall and the links beside it", async () => {
      const { page: p, context, errors } = await open(SITE(), { scheme });
      const bar = await box(p, ".topbar");
      assert.deepEqual([bar.y, bar.h], [0, 56]);
      assert.deepEqual(await p.locator(".topbar").evaluate((el) => { const s = getComputedStyle(el); return [s.boxSizing, s.borderBottomWidth, s.position]; }), ["border-box", "1px", "sticky"]);
      assert.equal((await box(p, ".topbar-inner")).w, 1152, "72rem at 1440");
      const brand = await box(p, ".brand");
      assert.equal(brand.h, 44);
      assert.equal(brand.y, 6, "6 above the 44px target, the line counted");
      const links = await box(p, ".topbar-links");
      assert.ok(Math.abs(links.x - brand.right - 16) < 0.6, `16 between the brand and the first link: ${links.x - brand.right}`);
      assert.equal(await p.evaluate(() => [...document.querySelectorAll("*")].filter((el) => { const s = getComputedStyle(el); return s.backdropFilter !== "none" && s.backdropFilter !== ""; }).length), 1, "one smoked surface in the viewport");
      await p.evaluate(() => window.scrollTo(0, 900));
      assert.equal((await box(p, ".topbar")).y, 0, "it sticks");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test("a brand with a mark and no word is a target of at least 44 by 44, the mark at its start, and the ring is round the 32px lockup", async () => {
      const { page: p, context } = await open(`<header class="topbar"><div class="topbar-inner"><a class="brand" href="#" aria-label="Acme home">${MARK}</a><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>`, { scheme });
      const brand = await box(p, ".brand");
      const mark = await box(p, ".brand > svg");
      assert.deepEqual([brand.w, brand.h], [44, 44]);
      assert.equal(mark.x, brand.x, "the mark sits at the start");
      await p.keyboard.press("Tab");
      assert.equal(await active(p), "a[Acme home]");
      const ring = await p.locator(".brand").evaluate((el) => { const s = getComputedStyle(el, "::after"); const own = getComputedStyle(el); const r = el.getBoundingClientRect(); return { outline: [s.outlineStyle, s.outlineWidth, s.outlineOffset], height: s.height, top: s.top, own: own.outlineStyle, hit: [r.width, r.height] }; });
      assert.deepEqual([ring.outline, ring.height, ring.top, ring.own], [["solid", "2px", "2px"], "32px", "6px", "none"], "the control ring at +2 round the 32px lockup; the 44px link draws none of its own");
      await context.close();
    });

    test("aria-current marks the page: one link, primary ink at 600, and becoming current moves nothing (its 600 width is reserved)", async () => {
      const { page: p, context } = await open(SITE(), { scheme });
      assert.equal(await p.locator(".topbar-links [aria-current]").count(), 1);
      const widths = async () => p.locator(".topbar-links a").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      const before = await widths();
      const style = await p.locator(".topbar-links a[aria-current=page]").evaluate((el) => { const s = getComputedStyle(el); return [s.fontWeight, s.color]; });
      const rest = await p.locator(".topbar-links a:not([aria-current])").first().evaluate((el) => { const s = getComputedStyle(el); return [s.fontWeight, s.color]; });
      assert.equal(style[0], "600");
      assert.equal(rest[0], "400");
      assert.notEqual(style[1], rest[1], "primary against secondary ink");
      await p.evaluate(() => { document.querySelector(".topbar-links a[aria-current]").removeAttribute("aria-current"); document.querySelectorAll(".topbar-links a")[2].setAttribute("aria-current", "page"); });
      assert.deepEqual(await widths(), before, "no link changes its width when the current page moves");
      await context.close();
    });

    test("the links: 44 tall hit areas that touch, the pill 32 tall inside them, 2px either side (so pills are 4 apart)", async () => {
      const { page: p, context } = await open(SITE(), { scheme });
      const links = await p.locator(".topbar-links a").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el, "::before"); return { x: r.x, right: r.right, h: r.height, pillH: parseFloat(s.height), pillLeft: parseFloat(s.left), pillTop: parseFloat(s.top), pillW: parseFloat(s.width), w: r.width }; }));
      for (const l of links) assert.deepEqual([l.h, l.pillH, l.pillLeft, l.pillTop, Math.round((l.w - l.pillW) * 64) / 64], [44, 32, 2, 6, 4]);
      for (let i = 1; i < links.length; i++) assert.ok(Math.abs(links[i].x - links[i - 1].right) < 0.05, "neighbouring hit areas touch");
      await context.close();
    });

    test("hover is one shared pill that glides from link to link over duration-base, appears in place on entry and fades in place on leaving; the first key hides it", async () => {
      const { page: p, context } = await open(SITE(), { scheme });
      const plate = () => p.locator(".topbar-links > .plate").evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { display: s.display, opacity: Number(s.opacity), state: el.dataset.state, x: r.x, w: r.width, h: r.height, bg: s.backgroundColor, radius: s.borderTopLeftRadius }; });
      const pill = (i) => p.locator(".topbar-links a").nth(i).evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el, "::before"); return { x: r.x + parseFloat(s.left), w: parseFloat(s.width) }; });
      assert.equal((await plate()).display, "block", "the shared pill is live on a hand that can hover");
      assert.equal((await plate()).state, "off");
      const clock = await freezeAnimations(p);
      await p.hover(".topbar-links a:nth-child(2)");
      await clock.advance(0);
      let at = await plate();
      const first = await pill(0);
      assert.deepEqual([at.state, at.opacity, at.radius], ["on", 1, "9999px"]);
      assert.ok(Math.abs(at.x - first.x) < 0.7 && Math.abs(at.w - first.w) < 0.7 && at.h === 32, `on the first pill: ${JSON.stringify(at)} vs ${JSON.stringify(first)}`);
      assert.equal(await css(p, ".topbar-links a:nth-child(2)", "backgroundColor", "::before"), "rgba(0, 0, 0, 0)", "the link's own pill steps aside while the shared one is live");
      await p.hover(".topbar-links a:nth-child(4)");
      await clock.advance(60);
      const mid = await plate();
      const third = await pill(2);
      assert.ok(mid.x > first.x + 1 && mid.x < third.x - 1, `part way between pills: ${mid.x} (from ${first.x} to ${third.x})`);
      await clock.advance(200);
      at = await plate();
      assert.ok(Math.abs(at.x - third.x) < 0.7 && Math.abs(at.w - third.w) < 0.7, "it lands on the pill it was sent to");
      // the first key hides it and the ring shows; the pointer coming back shows it again
      await p.keyboard.press("ArrowDown");
      await clock.advance(0);
      assert.equal(await p.locator(".topbar-links").evaluate((el) => el.hasAttribute("data-keys")), true);
      const hidden = await plate();
      assert.ok(hidden.display === "none" || hidden.opacity === 0, "hidden by a key");
      await p.mouse.move(5, 300);
      await clock.advance(150);
      assert.equal((await plate()).opacity, 0, "and faded away when the pointer left");
      await clock.thaw();
      await context.close();
    });

    test("each link paints its own pill instead where nothing glides: on touch, under reduced motion and in forced colours the shared pill is not drawn; forced colours are Highlight on HighlightText", async () => {
      for (const [label, options, emulate] of [["touch", { scheme, width: 390, touch: true }], ["reduced motion", { scheme, reducedMotion: "reduce" }], ["forced colours", { scheme }, { forcedColors: "active" }]]) {
        const { page: p, context } = await open(SITE(), options);
        if (emulate) { await p.emulateMedia(emulate); await frames(p, 3); }
        assert.equal(await p.locator(".topbar-links").evaluate((el) => el.hasAttribute("data-glide")), false, `${label}: the list does not glide`);
        assert.equal(await css(p, ".topbar-links > .plate", "display"), "none", `${label}: the shared pill is not drawn`);
        if (label !== "touch") {
          await p.hover(".topbar-links a:nth-child(3)");
          await frames(p, 2);
          const pill = await css(p, ".topbar-links a:nth-child(3)", "backgroundColor", "::before");
          const ink = await css(p, ".topbar-links a:nth-child(3)", "color");
          if (label === "forced colours") assert.deepEqual([pill, ink], [await system(p, "Highlight"), await system(p, "HighlightText")], "Highlight on HighlightText");
          else assert.notEqual(pill, "rgba(0, 0, 0, 0)", `${label}: the hovered link's own pill is drawn`);
        }
        await context.close();
      }
    });
  });

  describe(`the narrow menu (${scheme})`, () => {
    const narrow = (extra) => open(SITE(extra), { scheme, width: 390, touch: true });

    test("under 720 the links and the action leave the bar; the brand, the toggle and a Menu button stay, 44 tall and wide, radius 8, on the page's gutter", async () => {
      const { page: p, context } = await narrow();
      assert.equal(await css(p, ".topbar-links", "display"), "none");
      assert.equal(await css(p, ".topbar-action", "display"), "none");
      for (const selector of [".topbar-menu-trigger", ".topbar-inner > [data-theme-toggle]"]) {
        const b = await box(p, selector);
        assert.deepEqual([b.w, b.h], [44, 44], `${selector} is 44 by 44`);
        assert.equal(await css(p, selector, "borderTopLeftRadius"), "8px");
      }
      const trigger = await box(p, ".topbar-menu-trigger");
      assert.equal(390 - trigger.right, 16, "on the narrow gutter");
      assert.equal(await p.locator(".topbar-menu-trigger").getAttribute("aria-label"), "Menu");
      assert.equal(await p.locator(".topbar-menu-trigger").getAttribute("aria-expanded"), "false");
      await context.close();
    });

    test("it opens as a modal top sheet whose first row redraws the bar in place, with Close on the Menu button's box and focus on it; the links unroll beneath, the action last", async () => {
      const { page: p, context } = await narrow();
      const menuButton = await box(p, ".topbar-menu-trigger");
      const brand = await box(p, ".topbar > .topbar-inner .brand");
      const toggle = await box(p, ".topbar-inner > [data-theme-toggle]");
      await p.click(".topbar-menu-trigger");
      await p.waitForSelector("dialog.topbar-menu[open]");
      await settle(p);
      assert.equal(await active(p), "button[Close menu]", "focus lands on Close");
      assert.equal(await p.locator("dialog.topbar-menu").evaluate((el) => el.matches(":modal")), true, "a modal");
      assert.equal(await p.locator(".topbar-menu-trigger").getAttribute("aria-expanded"), "true");
      for (const [name, was, now] of [["brand", brand, await box(p, ".topbar-menu .brand")], ["toggle", toggle, await box(p, ".topbar-menu [data-theme-toggle]")], ["Close, on the Menu button", menuButton, await box(p, ".topbar-menu [data-dialog-close]")]]) {
        assert.ok(Math.abs(was.x - now.x) < 0.5 && Math.abs(was.y - now.y) < 0.5 && Math.abs(was.w - now.w) < 0.5, `${name} is where it was: ${JSON.stringify(was)} vs ${JSON.stringify(now)}`);
      }
      const rows = await p.locator(".topbar-menu .nav-item").evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), current: el.getAttribute("aria-current"), h: el.getBoundingClientRect().height, y: el.getBoundingClientRect().y })));
      assert.deepEqual(rows.map((r) => [r.text, r.current, r.h]), [["Docs", "page", 52], ["Pricing", null, 52], ["Changelog", null, 52]], "Nav rows, the current page marked");
      const foot = await box(p, ".topbar-menu-foot .btn");
      assert.ok(foot.y > rows[2].y, "the action is below the links");
      assert.deepEqual([foot.h, foot.w], [44, 390 - 32], "full width, 44 tall");
      assert.equal(await p.locator(".topbar-menu [id]").count(), 0, "no id is repeated from the bar");
      assert.equal(await p.locator("html").evaluate((el) => getComputedStyle(el).overflow), "hidden", "the page behind does not scroll");
      await context.close();
    });

    test("Esc closes it and focus returns to the Menu button; so does Close; Tab is trapped inside and wraps both ways", async () => {
      const { page: p, context } = await narrow();
      for (const how of ["Escape", "Close"]) {
        await p.click(".topbar-menu-trigger");
        await p.waitForSelector("dialog.topbar-menu[open]");
        if (how === "Escape") await p.keyboard.press("Escape"); else await p.click(".topbar-menu [data-dialog-close]");
        await p.waitForSelector("dialog.topbar-menu[open]", { state: "detached" }).catch(() => {});
        await settle(p);
        assert.equal(await p.locator("dialog.topbar-menu").evaluate((el) => el.open), false, how);
        assert.equal(await active(p), "button[Menu]", `${how}: focus is back on the Menu button`);
        assert.equal(await p.locator(".topbar-menu-trigger").getAttribute("aria-expanded"), "false");
      }
      await p.click(".topbar-menu-trigger");
      await p.waitForSelector("dialog.topbar-menu[open]");
      const stops = [];
      for (let i = 0; i < 8; i++) { stops.push(await who(p)); await p.keyboard.press("Tab"); }
      assert.deepEqual(stops, ["Close menu", "Docs", "Pricing", "Changelog", "Get started", "Orbit home", scheme === "dark" ? "Switch to light theme" : "Switch to dark theme", "Close menu"], "the links, the action, then back round the brand, the toggle and Close: nothing leaves the menu");
      await p.keyboard.press("Shift+Tab");
      assert.equal(await p.locator("dialog.topbar-menu").evaluate((el) => el.contains(document.activeElement)), true, "backwards from Close stays inside");
      await context.close();
    });

    test("a link in the list closes the menu and goes to its section, the action does not; the toggle in the menu switches the theme", async () => {
      const { page: p, context } = await narrow();
      await p.click(".topbar-menu-trigger");
      await p.waitForSelector("dialog.topbar-menu[open]");
      const before = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
      await p.click(".topbar-menu [data-theme-toggle]");
      assert.notEqual(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), before, "the menu's own toggle works");
      await p.click(".topbar-menu .nav-item:nth-child(1) >> text=Pricing");
      await settle(p);
      assert.equal(await p.locator("dialog.topbar-menu").evaluate((el) => el.open), false, "the menu closes");
      assert.equal(await p.evaluate(() => location.hash), "#pricing");
      await p.click(".topbar-menu-trigger");
      await p.waitForSelector("dialog.topbar-menu[open]");
      await p.click(".topbar-menu-foot a");
      await settle(p);
      assert.equal(await p.locator("dialog.topbar-menu").evaluate((el) => el.open), true, "the action is the page's own: React's menu closes on a link in its list only");
      await context.close();
    });

    test("widening the window to 720 closes it, and focus goes to the current link in the bar", async () => {
      const { page: p, context } = await narrow();
      await p.click(".topbar-menu-trigger");
      await p.waitForSelector("dialog.topbar-menu[open]");
      await p.setViewportSize({ width: 720, height: 844 });
      await frames(p, 3);
      assert.equal(await p.locator("dialog.topbar-menu").evaluate((el) => el.open), false);
      assert.equal(await active(p), "a", "focus is on a link in the bar");
      assert.equal(await p.evaluate(() => document.activeElement.getAttribute("aria-current")), "page", "the current one");
      assert.equal(await css(p, ".topbar-links", "display"), "flex", "the links are back");
      assert.equal(await css(p, ".topbar-menu-trigger", "display"), "none", "and the Menu button is gone");
      await context.close();
    });

    test("under reduced motion it only fades, in forced colours its band's line is CanvasText, and axe finds nothing with it open", async () => {
      for (const [label, options, emulate] of [["reduced motion", { scheme, width: 390, touch: true, reducedMotion: "reduce" }], ["forced colours", { scheme, width: 390, touch: true }, { forcedColors: "active" }], ["default", { scheme, width: 390, touch: true }]]) {
        const { page: p, context } = await open(SITE(), options);
        if (emulate) await p.emulateMedia(emulate);
        await p.click(".topbar-menu-trigger");
        await p.waitForSelector("dialog.topbar-menu[open]");
        await settle(p);
        if (label === "reduced motion") assert.equal(await css(p, "dialog.topbar-menu", "clipPath"), "none", "no unrolling: opacity only");
        if (label === "forced colours") assert.equal(await css(p, ".topbar-menu .sheet-band", "borderBottomColor"), "rgb(255, 255, 255)".length ? await css(p, ".topbar-menu", "color") : "", "CanvasText");
        assert.deepEqual(await axeViolations(p), [], `axe: ${label}`);
        await context.close();
      }
    });
  });

  describe(`axe, the site header (${scheme})`, () => {
    test("the bar at 1440 and 390, with a link hovered and a key pressed, finds nothing, in forced colours too", async () => {
      for (const [width, touch] of [[1440, false], [390, true]]) {
        const { page: p, context } = await open(SITE(), { scheme, width, touch });
        assert.deepEqual(await axeViolations(p), [], `${width}`);
        await p.emulateMedia({ forcedColors: "active" });
        await settle(p);
        assert.deepEqual(await axeViolations(p), [], `${width}, forced colours`);
        await context.close();
      }
    });
  });
}

describe("the layout tokens and the faults the hero stream logged", () => {
  const BODY = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#">Orbit</a><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>
    <main class="page"><h1>Title</h1><p class="lead">A lead that is long enough to wrap past the prose measure on a wide page, so the width shows. A lead that is long enough to wrap past the prose measure on a wide page, so the width shows.</p>
      <div class="prose" id="prose"><h2 id="h2">Section</h2><p>Text.</p></div></main><footer class="footer">Footer <a href="#top" id="foot-link">Top</a></footer>`;
  test("the row is size-page-width, the gutter is size-gutter and steps to size-gutter-narrow under 720, the prose column is size-prose-width on the row's start edge", async () => {
    const wide = await open(BODY, { scheme: "dark" });
    assert.equal((await box(wide.page, ".page")).w, 1152, "72rem");
    assert.equal(await css(wide.page, ".page", "paddingLeft"), "24px");
    assert.equal(await css(wide.page, ".lead", "maxWidth"), "544px", "34rem");
    const prose = await box(wide.page, "#prose");
    const page = await box(wide.page, ".page");
    assert.deepEqual([prose.w, prose.x - page.x - 24], [544, 0], "34rem, on the row's start edge, never centred");
    assert.equal(await css(wide.page, ".topbar-inner", "paddingLeft"), "24px");
    const footer = await box(wide.page, ".footer");
    // Against the page's row, not the window: with classic scrollbars (a Mac with a mouse, CI's Linux) the stable gutter takes 15px of it.
    assert.deepEqual([footer.x, footer.w], [page.x + 24, 1152 - 48], "outside the page the footer sits on the row's column by itself");
    await wide.context.close();
    const narrow = await open(BODY, { scheme: "dark", width: 390, touch: true });
    assert.equal(await css(narrow.page, ".page", "paddingLeft"), "16px");
    assert.equal(await css(narrow.page, ".topbar-inner", "paddingLeft"), "16px");
    const narrowFooter = await box(narrow.page, ".footer");
    const narrowPage = await box(narrow.page, ".page");
    assert.deepEqual([narrowFooter.x, narrowFooter.w], [16, narrowPage.w - 32]);
    await narrow.context.close();
    // a width on the seam: 719.5 is the phone, 720 is not (range syntax, no gap on a fractional viewport)
    const seam = await open(BODY, { scheme: "dark", width: 720 });
    await seam.page.setViewportSize({ width: 719, height: 900 });
    assert.equal(await css(seam.page, ".page", "paddingLeft"), "16px", "719");
    await seam.page.setViewportSize({ width: 720, height: 900 });
    assert.equal(await css(seam.page, ".page", "paddingLeft"), "24px", "720");
    await seam.context.close();
  });

  test("h2 is the Section step, 24/30, and a page with a bar scrolls anchors clear of it: the bar plus space-4", async () => {
    const { page: p, context } = await open(BODY, { scheme: "dark" });
    assert.deepEqual(await p.locator("#h2").evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.lineHeight, s.fontWeight]; }), ["24px", "30px", "600"]);
    assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "72px");
    assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter), "stable");
    await context.close();
  });

  test("the coarse-pointer link margin applies only to a link that isn't already 44px tall: bar links, nav rows and tabs keep their rows; a link on its own line still gets it", async () => {
    const { page: p, context } = await open(`${SITE()}${APP.replace(/<script>[\s\S]*$/, "")}<footer class="footer"><a href="#top" id="foot-link">Top</a></footer>`, { scheme: "dark", width: 390, touch: true });
    const margin = (selector) => p.locator(selector).first().evaluate((el) => getComputedStyle(el).marginTop);
    assert.equal(await margin("#foot-link"), "-12px", "a standalone link keeps its 44px hit box with no change to layout ((1lh - 44) / 2)");
    assert.equal(await margin(".brand"), "0px");
    assert.equal(await margin(".nav-item"), "0px", "a nav row is 52 tall as it is");
    assert.equal(await margin(".tab-bar-item"), "0px");
    await context.close();
    // The bar's links in a bar that shows them (720 and up on touch) keep 44.
    const wide = await open(SITE(), { scheme: "dark", width: 720, touch: true });
    assert.deepEqual(await wide.page.locator(".topbar-links a").evaluateAll((els) => els.map((el) => [el.getBoundingClientRect().height, getComputedStyle(el).marginTop])), LINKS.map(() => [44, "0px"]));
    await wide.context.close();
  });
});

for (const scheme of THEMES) {
  describe(`the app shell (${scheme})`, () => {
    test("1440: a 256 sidebar with its 1px divider, the header over the content column only, the document scrolls and the sidebar stays; one smoked surface", async () => {
      const { page: p, context, errors } = await open(APP, { scheme });
      const side = await box(p, ".app-sidebar");
      assert.deepEqual([side.x, side.w, side.h], [0, 256, 900], "256 wide at the viewport's height");
      assert.deepEqual(await p.locator(".app-sidebar").evaluate((el) => { const s = getComputedStyle(el); return [s.position, s.borderInlineEndWidth, s.top]; }), ["sticky", "1px", "0px"]);
      const header = await box(p, ".app-header");
      assert.deepEqual([header.x, header.y, header.h], [256, 0, 56], "over the content column");
      assert.equal((await box(p, ".app-brand")).h, 56, "the brand band is the header's height");
      assert.equal(await css(p, ".app-brand", "borderBottomWidth"), "0px", "and draws no line of its own");
      assert.equal(await p.evaluate(() => [...document.querySelectorAll("*")].filter((el) => { const s = getComputedStyle(el); return s.backdropFilter !== "none" && s.backdropFilter !== ""; }).length), 1, "one smoked surface");
      await p.evaluate(() => window.scrollTo(0, 800));
      await frames(p, 2);
      assert.equal(await p.evaluate(() => window.scrollY > 0), true, "the document is the scroller");
      assert.deepEqual([(await box(p, ".app-sidebar")).y, (await box(p, ".app-header")).y], [0, 0], "the sidebar and the header stay");
      assert.equal(await css(p, ".tab-bar", "display"), "none", "no tab bar from 720");
      assert.equal(await p.locator(".app-title").evaluate((el) => el.tagName), "H1", "the page's title is its h1");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test("1440: Nav's rows are 52 with a 48 pill that hugs its glyph and label; the current page is its selected glyph and a 600 label with no background", async () => {
      const { page: p, context } = await open(APP, { scheme });
      const row = await box(p, ".app-nav .nav-item:not([aria-current])");
      const pill = await box(p, ".app-nav .nav-item:not([aria-current]) .nav-pill");
      assert.deepEqual([row.h, pill.h, row.w > pill.w], [52, 48, true], "the row is the column, the pill hugs");
      assert.equal(await css(p, ".app-nav .nav-item[aria-current] .nav-pill", "backgroundColor"), "rgba(0, 0, 0, 0)", "the current page has no background");
      assert.equal(await css(p, ".app-nav .nav-item[aria-current] .nav-label", "fontWeight"), "600");
      assert.equal(await css(p, ".app-nav .nav-item:not([aria-current]) .nav-label", "fontWeight"), "400");
      const glyphs = await p.locator(".app-nav .nav-item").evaluateAll((els) => els.map((el) => ({ current: el.hasAttribute("aria-current"), fill: el.querySelectorAll("svg path[fill=currentColor]").length })));
      assert.deepEqual(glyphs.map((g) => g.current && g.fill > 0), [true, false, false, false], "only the current page's glyph is filled");
      assert.equal(await p.locator(".app-nav .nav-count").textContent(), ", 12", "a count is a number, spoken after the name");
      await context.close();
    });

    test("the rail from 720 to 1023 (72 wide): each Nav is a circle round its glyph, the label is its name and a tooltip on its right; 1024 is the sidebar again", async () => {
      const { page: p, context } = await open(APP, { scheme, width: 900 });
      assert.equal(await p.locator(".app-sidebar").evaluate((el) => el.getBoundingClientRect().width), 72);
      assert.equal(await p.locator(".app-nav .nav").evaluate((el) => el.hasAttribute("data-collapsed")), true);
      const pill = await box(p, ".app-nav .nav-item:not([aria-current]) .nav-pill");
      assert.deepEqual([pill.w, pill.h], [48, 48], "a circle");
      assert.equal(await p.locator(".app-nav .nav-item").nth(1).getAttribute("data-tooltip"), "Search");
      assert.equal(await p.locator(".app-nav .nav-item").nth(1).getAttribute("data-tooltip-side"), "right");
      assert.equal(await p.locator(".app-nav .nav-item").nth(1).evaluate((el) => el.getBoundingClientRect().width > 0 && !!el.textContent.match(/Search/)), true, "the label is still the item's name");
      assert.equal(await css(p, ".app-nav .nav-label", "width"), "1px", "hidden, not removed");
      assert.equal(await css(p, ".app-brand .brand-full", "display"), "none");
      assert.notEqual(await css(p, ".app-brand .brand-rail", "display"), "none");
      const clock = await freezeAnimations(p);
      await p.hover(".app-nav li:nth-child(2) .nav-item");
      await clock.advance(700);
      const tip = await p.evaluate(() => { const t = document.getElementById("bh-tooltip"); return t && t.matches(":popover-open") ? { text: t.textContent, side: t.getBoundingClientRect().left } : null; });
      assert.equal(tip?.text, "Search", "the tooltip shows the label");
      await clock.thaw();
      await p.setViewportSize({ width: 1024, height: 900 });
      await frames(p, 3);
      assert.equal(await p.locator(".app-sidebar").evaluate((el) => el.getBoundingClientRect().width), 256);
      assert.equal(await p.locator(".app-nav .nav").evaluate((el) => el.hasAttribute("data-collapsed")), false);
      assert.equal(await p.locator(".app-nav .nav-item").nth(1).evaluate((el) => el.hasAttribute("data-tooltip")), false, "the tooltips come off");
      await context.close();
    });

    test("one shared pill glides between Nav's items, hugging the pill and not the row; the first key hides it; touch and forced colours keep each item's own pill", async () => {
      const { page: p, context } = await open(APP, { scheme });
      const plate = () => p.locator(".app-nav .plate").evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { x: r.x, y: r.y, w: r.width, h: r.height, opacity: Number(s.opacity), radius: s.borderTopLeftRadius, bg: s.backgroundColor }; });
      const pillOf = (i) => p.locator(".app-nav .nav-pill").nth(i).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
      const clock = await freezeAnimations(p);
      await p.hover(".app-nav li:nth-child(2) .nav-item");
      await clock.advance(0);
      let at = await plate();
      let want = await pillOf(1);
      assert.ok(Math.abs(at.x - want.x) < 0.7 && Math.abs(at.y - want.y) < 0.7 && Math.abs(at.w - want.w) < 0.7 && at.h === 48 && at.opacity === 1 && at.radius === "9999px", `${JSON.stringify(at)} vs ${JSON.stringify(want)}`);
      assert.ok(at.w < 200, "it hugs the pill, never the column's width");
      await p.hover(".app-nav li:nth-child(4) .nav-item");
      await clock.advance(60);
      const mid = await plate();
      want = await pillOf(3);
      assert.ok(mid.y > at.y + 1 && mid.y < want.y - 1, `part way: ${mid.y} between ${at.y} and ${want.y}`);
      await clock.advance(200);
      at = await plate();
      assert.ok(Math.abs(at.y - want.y) < 0.7 && Math.abs(at.w - want.w) < 0.7);
      await p.keyboard.press("Tab");
      await clock.advance(0);
      assert.equal((await plate()).opacity, 0, "the first key hides it");
      await clock.thaw();
      await context.close();
      const touch = await open(APP, { scheme, width: 1440, touch: true });
      assert.equal(await css(touch.page, ".app-nav .plate", "display"), "none", "on touch");
      await touch.context.close();
      const forced = await open(APP, { scheme });
      await forced.page.emulateMedia({ forcedColors: "active" });
      assert.equal(await css(forced.page, ".app-nav .plate", "display"), "none", "in forced colours");
      await forced.page.hover(".app-nav li:nth-child(2) .nav-item");
      await frames(forced.page, 2);
      assert.deepEqual(await forced.page.locator(".app-nav li:nth-child(2) .nav-pill").evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.color]; }), [await system(forced.page, "Highlight"), await system(forced.page, "HighlightText")], "Highlight on HighlightText");
      await forced.context.close();
    });

    test("axe at 1440, 900 and 390, with the tab bar and the More sheet open, finds nothing, in forced colours too", async () => {
      for (const [width, touch] of [[1440, false], [900, false], [390, true]]) {
        const { page: p, context } = await open(APP, { scheme, width, touch });
        assert.deepEqual(await axeViolations(p), [], `${width}`);
        await p.emulateMedia({ forcedColors: "active" });
        await settle(p);
        assert.deepEqual(await axeViolations(p), [], `${width}, forced colours`);
        await context.close();
      }
      const { page: p, context } = await open(APP, { scheme, width: 390, touch: true });
      await p.click(".tab-bar-list > li:last-child .tab-bar-item");
      await p.waitForSelector("dialog#more[open]");
      await settle(p);
      assert.deepEqual(await axeViolations(p), [], "More open");
      await context.close();
    });
  });

  describe(`the phone tab bar (${scheme})`, () => {
    const phone = (options = {}) => open(APP, { scheme, width: 390, touch: true, ...options });

    test("under 720 it is fixed to the bottom, 56 with its hairline inside plus the bottom safe area, solid surface-page, and content pads past it; from 720 and in print it is gone", async () => {
      const { page: p, context } = await phone();
      await p.addStyleTag({ content: ":root { --bh-inset-bottom-sim: 34px; }" });
      const bar = await box(p, ".tab-bar");
      assert.deepEqual([bar.h, 844 - bar.bottom], [90, 0], "56 plus the 34px home indicator, at the bottom");
      assert.deepEqual(await p.locator(".tab-bar").evaluate((el) => { const s = getComputedStyle(el); return [s.position, s.borderTopWidth, s.backdropFilter, s.boxShadow, s.backgroundColor]; }), ["fixed", "1px", "none", "none", await tokenColour(p, "--basalt-surface-page")], "solid surface-page, a hairline, no blur and no shadow");
      assert.equal(await css(p, ".app-main", "paddingBottom"), "114px", "the bar, the inset and space-6");
      const list = await box(p, ".tab-bar-list");
      assert.equal(list.h, 55, "the hairline is inside the 56");
      await p.setViewportSize({ width: 720, height: 844 });
      assert.equal(await css(p, ".tab-bar", "display"), "none", "not from 720");
      await p.setViewportSize({ width: 390, height: 844 });
      await p.emulateMedia({ media: "print" });
      assert.equal(await css(p, ".tab-bar", "display"), "none", "not in print");
      await context.close();
    });

    test("every cell is at least 44 by 44, the glyph is 24 in a 32px circle over a 12/16 label, both primary ink; the current page is a selected glyph and a 600 label with no pill", async () => {
      const { page: p, context } = await phone();
      for (const cell of await p.locator(".tab-bar-item").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; }))) assert.ok(cell[0] >= 44 && cell[1] >= 44, cell.join("x"));
      assert.deepEqual(await p.locator(".tab-bar-item:not([aria-current]) .tab-bar-glyph").first().evaluate((el) => { const s = getComputedStyle(el); return [s.width, s.height, s.borderTopLeftRadius, s.backgroundColor]; }), ["32px", "32px", "9999px", "rgba(0, 0, 0, 0)"]);
      assert.deepEqual(await p.locator(".tab-bar-item:not([aria-current]) .tab-bar-label").first().evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.lineHeight, s.fontWeight]; }), ["12px", "16px", "400"]);
      assert.equal(await css(p, ".tab-bar-item[aria-current] .tab-bar-label", "fontWeight"), "600");
      assert.equal(await p.locator(".tab-bar-item[aria-current] .tab-bar-glyph svg path[fill=currentColor]").count() > 0, true, "its glyph is selected");
      assert.equal(await p.locator(".tab-bar-item:not([aria-current]) .tab-bar-glyph svg path[fill=currentColor]").count(), 0);
      // 600 is reserved, so the current page moves nothing
      const widths = () => p.locator(".tab-bar-label").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
      const was = await widths();
      await p.evaluate(() => { document.querySelector(".tab-bar-item[aria-current]").removeAttribute("aria-current"); document.querySelectorAll(".tab-bar-item")[1].setAttribute("aria-current", "page"); });
      assert.deepEqual(await widths(), was);
      assert.equal(await css(p, ".tab-bar-dot", "width"), "6px");
      await context.close();
    });

    test("More opens a bottom sheet of Nav rows with focus inside; Esc and Close return focus to More; a row closes it", async () => {
      const { page: p, context } = await phone();
      await p.click(".tab-bar-list > li:last-child .tab-bar-item");
      await p.waitForSelector("dialog#more[open]");
      await settle(p);
      assert.equal(await p.locator("dialog#more").evaluate((el) => el.contains(document.activeElement)), true, "focus is inside");
      assert.equal(await p.locator("dialog#more").evaluate((el) => el.matches(":modal")), true);
      const sheet = await box(p, "dialog#more");
      assert.equal(sheet.bottom, 844, "at the bottom");
      assert.equal(await css(p, "dialog#more", "borderTopLeftRadius"), "16px");
      await p.keyboard.press("Escape");
      await settle(p);
      assert.equal(await active(p), "button[More]", "Esc: focus back on More");
      await p.click(".tab-bar-list > li:last-child .tab-bar-item");
      await p.click("dialog#more [data-dialog-close]");
      await settle(p);
      assert.equal(await active(p), "button[More]", "Close: focus back on More");
      await p.click(".tab-bar-list > li:last-child .tab-bar-item");
      await p.click("#more-settings");
      await settle(p);
      assert.equal(await p.locator("dialog#more").evaluate((el) => el.open), false, "a row closes the sheet");
      assert.equal(await p.evaluate(() => location.hash), "#settings");
      await context.close();
    });

    test("only More's sheet and the narrow menu close on a row: a Nav in any other dialog stays open", async () => {
      const { page: p, context } = await open(`${APP}<button class="btn" id="other" data-dialog-open="#other-d">Other</button><dialog class="panel float modal sheet" id="other-d" data-side="right"><h2 class="dialog-title">Other</h2><nav class="nav" aria-label="Other"><ul class="nav-list"><li><a class="nav-item" href="#elsewhere" id="other-row"><span class="nav-pill"><span class="nav-label">Elsewhere</span></span></a></li></ul></nav></dialog>`, { scheme, width: 390, touch: true });
      await p.evaluate(() => Basalt.openDialog("#other-d"));
      await p.waitForSelector("dialog#other-d[open]");
      await p.click("#other-row");
      await settle(p);
      assert.equal(await p.locator("dialog#other-d").evaluate((el) => el.open), true);
      await context.close();
    });

    test("toasts sit above the bar; a press shows a cell's circle and the first key hides it, the ring being the control ring inset on the whole cell; forced colours draw Canvas, LinkText and a CanvasText dot", async () => {
      const { page: p, context } = await phone();
      await p.addStyleTag({ content: ":root { --bh-inset-bottom-sim: 34px; }" });
      await p.click("#toast-btn");
      await p.waitForSelector(".toast");
      assert.equal(await css(p, ".toast-viewport", "bottom"), "106px", "the bar (56), the inset (34) and space-4");
      await p.locator(".tab-bar-item:not([aria-current])").first().hover();
      await p.mouse.down();
      assert.notEqual(await css(p, ".tab-bar-item:not([aria-current]) .tab-bar-glyph", "backgroundColor"), "rgba(0, 0, 0, 0)", "a press shows the circle");
      await p.mouse.up();
      await p.keyboard.press("Tab");
      await p.locator(".tab-bar-item:not([aria-current])").first().focus();
      assert.equal(await p.locator(".tab-bar").evaluate((el) => el.hasAttribute("data-keys")), true, "the first key");
      await settle(p);
      assert.equal(await css(p, ".tab-bar-item:not([aria-current]) .tab-bar-glyph", "backgroundColor"), "rgba(0, 0, 0, 0)");
      assert.deepEqual(await p.locator(".tab-bar-item:not([aria-current])").first().evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; }), ["solid", "2px", "-2px"], "the control ring inset by its own width");
      await p.mouse.move(100, 300);
      assert.equal(await p.locator(".tab-bar").evaluate((el) => el.hasAttribute("data-keys")), false, "the pointer brings the circle back");
      await context.close();
      const forced = await phone();
      await forced.page.emulateMedia({ forcedColors: "active" });
      assert.equal(await css(forced.page, ".tab-bar", "backgroundColor"), await system(forced.page, "Canvas"));
      assert.equal(await css(forced.page, ".tab-bar-item:not([aria-current])", "color"), await system(forced.page, "LinkText"));
      assert.equal(await css(forced.page, ".tab-bar-dot", "backgroundColor"), await system(forced.page, "CanvasText"));
      await forced.context.close();
    });
  });
}

describe("the glyphs the navigation draws", () => {
  test("a glyph at rest has its opening and selected is closed and filled, with the inner strokes cut out; the stroke is 2.25 of 24 at every size; two on a page never share a mask", async () => {
    const { page: p, context } = await open(`<a href="#" aria-current="page"><span data-glyph="home" data-size="24"></span></a><a href="#"><span data-glyph="home" data-size="24"></span></a><a href="#" aria-current="page"><span data-glyph="home" data-size="16"></span></a><span data-glyph="menu"></span><span data-glyph="nope"></span>`, { scheme: "dark" });
    const info = await p.locator("svg.icon").evaluateAll((els) => els.map((el) => ({ w: el.getAttribute("width"), view: el.getAttribute("viewBox"), fills: el.querySelectorAll("path[fill=currentColor]").length, masks: [...el.querySelectorAll("mask")].map((m) => m.id), used: el.querySelector("[mask]")?.getAttribute("mask"), stroke: el.querySelector("g[stroke=currentColor]")?.getAttribute("stroke-width"), hidden: el.getAttribute("aria-hidden") })));
    assert.deepEqual(info.map((i) => [i.w, i.fills > 0, i.stroke, i.hidden]), [["24", true, "2.25", "true"], ["24", false, "2.25", "true"], ["16", true, "2.25", "true"], ["16", false, "2.25", "true"]]);
    assert.equal(new Set(info.flatMap((i) => i.masks)).size, 2, "each filled home has a mask of its own");
    for (const i of info.filter((x) => x.masks.length)) assert.equal(i.used, `url(#${i.masks[0]})`);
    assert.equal(await p.locator("[data-glyph=nope]").count(), 1, "an unknown name is left and warns");
    await context.close();
  });
});
