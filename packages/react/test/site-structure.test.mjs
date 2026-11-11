// Site structure (decisions 96): the site header, its narrow menu, the app shell and the phone tab bar. Driven in Chromium
// against the built package with the real stylesheet. The fixtures load no web font, so text widths differ from a Mac's on CI's
// Linux runner: every measured margin here is wider than a fallback font's width, and a position is compared with itself.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;
const LINKS = (current = "product") => `[${[["product", "Product"], ["docs", "Docs"], ["changelog", "Changelog"], ["pricing", "Pricing"], ["about", "About"]].map(([id, label]) => `{href:"#${id}",label:"${label}"${current === id ? ",current:true" : ""}}`).join(",")}]`;
const TOGGLE = `<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />`;

const header = ({ current = "product", solid = false, action = true } = {}) =>
  `<B.SiteHeader brand={<>${MARK}<span>Acme</span></>} brandLabel="Acme home" links={${LINKS(current)}} themeToggle={${TOGGLE}} ${action ? `action={<B.Button variant="primary">Get started</B.Button>}` : ""} ${solid ? "solid" : ""} />`;
const site = (options) => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>${header(options)}<main style={{ height: 2400, padding: 24 }}><p>Synthetic page.</p></main></div>);`;

const NAV = [["home", "Home", "HomeGlyph"], ["messages", "Messages", "MessagesGlyph"], ["trends", "Trends", "TrendsGlyph"], ["plan", "Plan", "PlanGlyph"], ["sources", "Sources", "SourcesGlyph"]];
const item = (id, label, glyph, current, extra = "") => `<B.NavItem href="#${id}" icon={B.${glyph}}${current === id ? " current" : ""}${extra}>${label}</B.NavItem>`;
const tab = (id, label, glyph, current, extra = "") => `<B.TabBarItem href="#${id}" icon={B.${glyph}}${current === id ? " current" : ""}${extra}>${label}</B.TabBarItem>`;
const shell = ({ current = "home", solid = false, more = false } = {}) => {
  const tabs = more
    ? `${tab("home", "Home", "HomeGlyph", current)}${tab("messages", "Messages", "MessagesGlyph", current, ' dot="New activity"')}${tab("trends", "Trends", "TrendsGlyph", current)}${tab("plan", "Plan", "PlanGlyph", current)}<B.TabBarMore current=${current === "sources" || current === "settings" ? `"${current === "sources" ? "Sources" : "Settings"}"` : "{undefined}"}>${item("sources", "Sources", "SourcesGlyph", current)}${item("settings", "Settings", "SettingsGlyph", current)}</B.TabBarMore>`
    : `${tab("home", "Home", "HomeGlyph", current)}${tab("messages", "Messages", "MessagesGlyph", current, ' dot="New activity"')}${tab("trends", "Trends", "TrendsGlyph", current)}${tab("plan", "Plan", "PlanGlyph", current)}`;
  return `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(
    <B.ToastProvider><B.AppShell brand={<>${MARK}<span>Workbench</span></>} brandMark={${MARK}} brandLabel="Workbench home"
      sidebar={<B.Nav aria-label="Primary">${NAV.map(([id, l, g]) => item(id, l, g, current)).join("")}</B.Nav>}
      account={<B.Nav aria-label="Account">${item("settings", "Settings", "SettingsGlyph", current)}${item("profile", "Profile", "ProfileGlyph", current)}</B.Nav>}
      header={<B.AppHeader title="Home" solid={${solid}} actions={<>${TOGGLE}<B.Button variant="primary">New entry</B.Button></>} />}
      tabBar={<B.TabBar>${tabs}</B.TabBar>}>
      <div style={{ height: 2400 }}><p>Synthetic page.</p></div>
    </B.AppShell></B.ToastProvider>);`;
};

const open = async (fixture, { width = 1440, height = 800, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
// The width of the area the page lays out in: the viewport less a classic scrollbar's gutter. On a Mac with overlay scrollbars it
// is the viewport's width; with classic scrollbars (a docked mouse, CI's Linux runner) `scrollbar-gutter: stable` reserves 15px
// of it. Compare a width with this, never with `innerWidth`.
const contentWidth = (page) => page.evaluate(() => document.documentElement.clientWidth);
const css = (page, selector, property, n = 0) => page.locator(selector).nth(n).evaluate((el, p) => getComputedStyle(el)[p], property);
const resolve = (page, value, property = "backgroundColor") => page.evaluate(({ value, property }) => { const probe = document.createElement("div"); document.body.append(probe); probe.style[property] = value; const c = getComputedStyle(probe)[property]; probe.remove(); return c; }, { value, property });
const filtered = (page) => page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => { const s = getComputedStyle(el); return (s.backdropFilter && s.backdropFilter !== "none") || (s.webkitBackdropFilter && s.webkitBackdropFilter !== "none"); }).length);
const axe = async (page, { contrast = true } = {}) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async (contrast) => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    if (!contrast) options.rules = { "color-contrast": { enabled: false } };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  }, contrast);
};

describe("the site header: the bar", () => {
  // The cause of the 15px every width test here has to allow for. Foundations ask for `scrollbar-gutter: stable` on a page with a
  // header, so a classic scrollbar (a docked mouse, CI's Linux runner) takes 15px from the layout viewport at once, and an overlay
  // scrollbar takes none. This holds either way, so it names the rule without depending on the kind of scrollbar.
  test("a page with a site header sets scrollbar-gutter: stable on the root, and the header runs to the root's clientWidth", async () => {
    const page = await open(site(), { width: 1100 });
    assert.equal(await css(page, "html", "scrollbarGutter"), "stable");
    const { right, client, inner } = await page.evaluate(() => ({ right: document.querySelector(".basalt-site-header").getBoundingClientRect().right, client: document.documentElement.clientWidth, inner: innerWidth }));
    near(right, client, "the header's right edge is the root's clientWidth", 0.05);
    assert.ok(client <= inner, `the layout viewport (${client}) is never wider than the window (${inner})`);
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`56px with its hairline inside, at ${width}, in ${theme}`, async () => {
        const page = await open(site(), { width, theme });
        const bar = await box(page, ".basalt-site-header");
        assert.equal(bar.h, 56);
        assert.equal(bar.y, 0);
        const style = await page.locator(".basalt-site-header").evaluate((el) => { const s = getComputedStyle(el); return { boxSizing: s.boxSizing, line: s.borderBottomWidth, sticky: s.position }; });
        assert.deepEqual(style, { boxSizing: "border-box", line: "1px", sticky: "sticky" });
        // what sits in the row is centred on the bar's whole height (a 44 target has 6 above and 6 below, counting the line)
        const brand = await box(page, ".basalt-site-brand");
        assert.equal(brand.h, 44);
        near(brand.y, 6, "6 above the 44px brand target");
        assert.deepEqual(page.errors, []);
        await page.close();
      });
    }
  }

  test("a brand with a mark and no word is still a target of at least 44 by 44, the mark at its start, and the ring is round the mark", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteHeader brand={${MARK}} brandLabel="Acme home" />);`);
    const link = await box(page, ".basalt-site-brand");
    const mark = await box(page, ".basalt-site-brand-mark");
    assert.deepEqual([link.w, link.h], [44, 44], "the target is 44 by 44");
    near(mark.x, link.x, "the mark sits at the start of the target");
    assert.equal(mark.h, 32, "the lockup is 32 tall");
    await page.keyboard.press("Tab");
    const ring = await page.locator(".basalt-site-brand-mark").evaluate((el) => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset }; });
    assert.deepEqual(ring, { style: "solid", width: "2px", offset: "2px" }, "the control ring is round the 32px mark, not the 44px target");
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("the order is the brand, the links beside it (start-aligned), a spacer, then the actions; the row is 72rem wide", async () => {
    const page = await open(site(), { width: 1600 });
    const brand = await box(page, ".basalt-site-brand");
    const links = await box(page, ".basalt-site-links");
    const actions = await box(page, ".basalt-bar-actions");
    const row = await box(page, ".basalt-site-bar");
    near(row.w, 1152, "72rem");
    near(links.x - brand.right, 16, "16 between the brand and the first link");
    assert.ok(actions.x - links.right > 200, "a spacer between the links and the actions: the links are not centred");
    near((row.x + row.w) - 24, actions.right, "the actions end at the gutter", 0.6);
    await page.close();
  });

  test("each link's hit area is 44 tall at every pointer, a 32px pill with 2px either side, and neighbours touch", async () => {
    for (const touch of [false, true]) {
      const page = await open(site(), { width: 1100, hasTouch: touch, isMobile: false });
      const count = await page.locator(".basalt-site-link").count();
      assert.equal(count, 5);
      let previous = null;
      for (let i = 0; i < count; i++) {
        const link = await box(page, ".basalt-site-link", i);
        const pill = await box(page, ".basalt-site-pill", i);
        assert.equal(link.h, 44, `link ${i} is 44 tall (touch ${touch})`);
        assert.equal(pill.h, 32);
        near(pill.x - link.x, 2, "2px before the pill");
        near(link.right - pill.right, 2, "2px after the pill");
        near(pill.y - link.y, 6, "6px above the pill");
        if (previous) { near(link.x, previous.right, "neighbouring hit areas touch", 0.05); }
        previous = link;
      }
      await page.close();
    }
  });

  for (const theme of ["dark", "light"]) {
    test(`links rest at 14/20, 400, secondary; the current page is primary at 600 with no background, and has aria-current (${theme})`, async () => {
      const page = await open(site({ current: "docs" }), { theme });
      const secondary = await resolve(page, "var(--basalt-text-secondary)", "color");
      const primary = await resolve(page, "var(--basalt-text-primary)", "color");
      const rest = await page.locator(".basalt-site-link").nth(0).evaluate((a) => { const l = a.querySelector(".basalt-site-label"); const s = getComputedStyle(l); return { color: getComputedStyle(a).color, size: s.fontSize, line: s.lineHeight, weight: s.fontWeight, bg: getComputedStyle(a.querySelector(".basalt-site-pill")).backgroundColor, radius: getComputedStyle(a.querySelector(".basalt-site-pill")).borderTopLeftRadius, pad: getComputedStyle(a.querySelector(".basalt-site-pill")).paddingLeft }; });
      assert.equal(rest.color, secondary);
      assert.deepEqual([rest.size, rest.line, rest.weight, rest.pad], ["14px", "20px", "400", "12px"]);
      assert.ok(Number.parseFloat(rest.radius) >= 16, "fully round");
      const now = await page.locator(".basalt-site-link").nth(1).evaluate((a) => ({ color: getComputedStyle(a).color, weight: getComputedStyle(a.querySelector(".basalt-site-label")).fontWeight, bg: getComputedStyle(a.querySelector(".basalt-site-pill")).backgroundColor, deco: getComputedStyle(a).textDecorationLine, current: a.getAttribute("aria-current"), after: getComputedStyle(a, "::after").content }));
      assert.equal(now.color, primary);
      assert.equal(now.weight, "600");
      assert.equal(now.bg, "rgba(0, 0, 0, 0)");
      assert.equal(now.deco, "none");
      assert.equal(now.current, "page");
      assert.equal(await page.locator('.basalt-site-link[aria-current="page"]').count(), 1);
      await page.close();
    });
  }

  test("becoming current moves nothing: every link keeps its box", async () => {
    const boxes = async (current) => {
      const page = await open(site({ current }), { width: 1100 });
      const out = [];
      for (let i = 0; i < 5; i++) out.push(await box(page, ".basalt-site-link", i));
      await page.close();
      return out;
    };
    const a = await boxes("product");
    for (const other of ["docs", "about", "none"]) {
      const b = await boxes(other);
      b.forEach((link, i) => { near(link.x, a[i].x, `link ${i} x`, 0.05); near(link.w, a[i].w, `link ${i} width`, 0.05); });
    }
  });

  test("hover is the pill at the selected wash with the ink to primary; focus is the control ring, 2 at +2, round the pill", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(site(), { theme, width: 1100 });
      const wash = await resolve(page, "var(--basalt-state-selected)");
      const pillBox = await box(page, ".basalt-site-pill", 2);
      await page.mouse.move(pillBox.x + pillBox.w / 2, pillBox.y + pillBox.h / 2);
      await page.waitForTimeout(400);
      const plate = await page.locator(".basalt-site-links > .basalt-plate").evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { x: r.x, y: r.y, w: r.width, h: r.height, bg: s.backgroundColor, display: s.display, opacity: s.opacity }; });
      assert.equal(plate.bg, wash);
      assert.equal(plate.opacity, "1");
      near(plate.x, pillBox.x, "the shared pill hugs the link's pill", 1); near(plate.w, pillBox.w, "width", 1); near(plate.h, 32, "32 tall", 1);
      assert.equal(await css(page, ".basalt-site-link", "color", 2), await resolve(page, "var(--basalt-text-primary)", "color"));
      await page.mouse.move(700, 500);
      await page.keyboard.press("Tab");
      for (let i = 0; i < 4 && !(await page.evaluate(() => document.activeElement?.classList.contains("basalt-site-link"))); i++) await page.keyboard.press("Tab");
      const ring = await page.evaluate(() => { const pill = document.activeElement.querySelector(".basalt-site-pill"); const s = getComputedStyle(pill); return { w: s.outlineWidth, offset: s.outlineOffset, style: s.outlineStyle, color: s.outlineColor }; });
      assert.deepEqual([ring.w, ring.offset, ring.style], ["2px", "2px", "solid"]);
      assert.equal(ring.color, await resolve(page, "var(--basalt-border-focus)", "color"));
      await page.close();
    }
  });

  test("one shared pill glides, as Nav's does: in place on entry, travelling after, hidden by the first key", async () => {
    const page = await open(site(), { width: 1100 });
    // Animation time is the test's: a transition is read 40ms into its move, which a loaded machine could run out in real time.
    const clock = await freezeAnimations(page);
    const at = async (n) => { const b = await box(page, ".basalt-site-pill", n); await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2); };
    const plate = () => page.locator(".basalt-site-links > .basalt-plate").evaluate((el) => ({ state: el.dataset.state, display: getComputedStyle(el).display, running: el.getAnimations().map((a) => a.transitionProperty) }));
    assert.equal(await page.locator(".basalt-site-links > .basalt-plate").count(), 1);
    await at(0);
    await clock.advance(60);
    let p = await plate();
    assert.deepEqual([p.state, p.display], ["on", "block"]);
    assert.ok(!p.running.includes("transform"), "it appears in place on entry");
    await at(3);
    await clock.advance(40);
    assert.ok((await plate()).running.includes("transform"), "it travels to the next link");
    await clock.advance(300);
    await page.keyboard.press("ArrowDown");
    await clock.advance(60);
    p = await plate();
    assert.equal(p.state, "off", "the first key hides it");
    assert.ok(await page.locator(".basalt-site-links").evaluate((el) => el.hasAttribute("data-keys")));
    await page.close();
  });

  for (const [name, options] of [["reduced motion", { reducedMotion: "reduce" }], ["touch", { hasTouch: true, isMobile: true }], ["forced colours", { forcedColors: "active" }]]) {
    test(`the shared pill is off under ${name}: each link paints its own`, async () => {
      const page = await open(site(), { width: options.isMobile ? 800 : 1100, ...options });
      const b = await box(page, ".basalt-site-pill", 1);
      if (!options.hasTouch) await page.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
      await page.waitForTimeout(300);
      assert.equal(await css(page, ".basalt-site-links > .basalt-plate", "display"), "none");
      if (options.forcedColors) {
        const hovered = await page.locator(".basalt-site-pill").nth(1).evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color }; });
        assert.equal(hovered.bg, await resolve(page, "Highlight"));
        assert.equal(hovered.color, await resolve(page, "HighlightText", "color"));
        assert.equal(await css(page, '.basalt-site-link[aria-current="page"] .basalt-site-label', "fontWeight"), "600", "the current page keeps its 600");
      } else if (!options.hasTouch) {
        assert.equal(await css(page, ".basalt-site-pill", "backgroundColor", 1), await resolve(page, "var(--basalt-state-selected)"), "the link's own pill shows the hover");
      }
      await page.close();
    });
  }

  test("one backdrop-filter per viewport, and none in the opaque form", async () => {
    let page = await open(site());
    assert.equal(await filtered(page), 1);
    await page.close();
    page = await open(site({ solid: true }));
    assert.equal(await filtered(page), 0);
    const bg = await css(page, ".basalt-site-header", "backgroundColor");
    assert.equal(bg, await resolve(page, "var(--basalt-surface-page)"));
    await page.close();
  });

  test("the bar keeps a safe-area gutter: the inline padding is the gutter, 24, and 16 under 720", async () => {
    for (const [width, gutter] of [[1440, 24], [390, 16]]) {
      const page = await open(site(), { width });
      const row = await page.locator(".basalt-site-bar").evaluate((el) => getComputedStyle(el).paddingLeft);
      assert.equal(row, `${gutter}px`);
      await page.close();
    }
  });
});

describe("the narrow menu", () => {
  test("under 720 the links and the action leave the bar and the buttons are 44, radius 8 whatever the pointer; from 720 up they are back", async () => {
    let page = await open(site(), { width: 719 });
    assert.equal(await css(page, ".basalt-site-links", "display"), "none");
    assert.equal(await css(page, ".basalt-site-action", "display"), "none");
    for (const [selector, n] of [[".basalt-site-menu-trigger", 0], [".basalt-bar-actions .basalt-button", 0], [".basalt-site-brand", 0]]) {
      const b = await box(page, selector, n);
      assert.equal(b.h, 44, `${selector} is 44 tall`);
      if (selector !== ".basalt-site-brand") { assert.equal(b.w, 44); }
    }
    assert.equal(await css(page, ".basalt-site-menu-trigger", "borderTopLeftRadius"), "8px");
    assert.equal((await box(page, ".basalt-site-menu-trigger")).bottom <= 56, true);
    await page.close();
    page = await open(site(), { width: 720 });
    assert.equal(await css(page, ".basalt-site-menu-trigger", "display"), "none");
    assert.notEqual(await css(page, ".basalt-site-links", "display"), "none");
    assert.equal((await box(page, ".basalt-bar-actions .basalt-button", 0)).h, 32, "from 720 the toggle is the 32px control");
    await page.close();
  });

  test("at 720 the links fit beside the brand and the actions with five links, never wrapping the bar", async () => {
    const page = await open(site(), { width: 720 });
    const row = await box(page, ".basalt-site-bar");
    const links = await box(page, ".basalt-site-links");
    const actions = await box(page, ".basalt-bar-actions");
    assert.ok(links.right <= actions.x, `links end at ${links.right}, the actions start at ${actions.x}`);
    assert.ok(actions.right <= row.right - 24 + 0.5);
    assert.equal((await box(page, ".basalt-site-header")).h, 56);
    await page.close();
  });

  test("the trigger is named Menu, with aria-expanded, aria-controls and aria-haspopup=dialog, and the menu is a real dialog", async () => {
    const page = await open(site(), { width: 390 });
    const trigger = page.locator(".basalt-site-menu-trigger");
    assert.equal(await trigger.getAttribute("aria-label"), "Menu");
    assert.equal(await trigger.getAttribute("aria-haspopup"), "dialog");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.click();
    await page.waitForTimeout(500);
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    const controls = await trigger.getAttribute("aria-controls");
    assert.ok(controls, "aria-controls names the dialog");
    assert.equal(await page.locator(`#${controls}`).getAttribute("role"), "dialog");
    assert.equal(await page.getByRole("dialog", { name: "Menu" }).count(), 1);
    await page.close();
  });

  test("opening puts focus on Close, on the Menu button's exact box; Tab stays inside; Escape returns focus to Menu", async () => {
    const page = await open(site(), { width: 390 });
    const trigger = await box(page, ".basalt-site-menu-trigger");
    await page.keyboard.press("Tab");
    for (let i = 0; i < 6 && !(await page.evaluate(() => document.activeElement?.classList.contains("basalt-site-menu-trigger"))); i++) await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("basalt-site-menu-close")), "focus is on Close");
    const close = await box(page, ".basalt-site-menu-close");
    near(close.x, trigger.x, "x", 0.5); near(close.y, trigger.y, "y", 0.5); near(close.w, trigger.w, "width", 0.5); near(close.h, trigger.h, "height", 0.5);
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(40); // the focus guards hand focus back a task later
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest(".basalt-site-menu")), `Tab ${i + 1} stays inside the menu`);
    }
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Shift+Tab");
      await page.waitForTimeout(40);
      assert.ok(await page.evaluate(() => !!document.activeElement?.closest(".basalt-site-menu")), `Shift+Tab ${i + 1} stays inside the menu`);
    }
    assert.equal(await page.evaluate(() => document.querySelector("main").closest("[inert], [aria-hidden='true']") !== null), true, "the page under the menu is inert or hidden");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".basalt-site-menu").count(), 0);
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("basalt-site-menu-trigger")), "focus is back on Menu");
    await page.close();
  });

  test("the scrim and a link close it; the page under it does not scroll while it is open", async () => {
    const page = await open(site(), { width: 390, height: 700 });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.scrollY), 0, "the page does not scroll");
    await page.mouse.click(200, 650);
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".basalt-site-menu").count(), 0, "the scrim closes it");
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(500);
    await page.locator(".basalt-site-menu .basalt-nav-item").nth(1).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".basalt-site-menu").count(), 0, "a link closes it");
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("basalt-site-menu-trigger")));
    await page.close();
  });

  test("the menu is level 1 with shadow-modal and bottom corners of 16; its rows are Nav rows without a glyph: a 48 pill at 20/28, the current one at 600, 6 from the edge", async () => {
    const page = await open(site({ current: "docs" }), { width: 390 });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(600);
    const sheet = await page.locator(".basalt-site-menu").evaluate((el) => { const s = getComputedStyle(el); return { level: el.dataset.level, radius: [s.borderBottomLeftRadius, s.borderBottomRightRadius, s.borderTopLeftRadius], shadow: s.boxShadow, bg: s.backgroundColor, over: s.overscrollBehaviorY, side: el.dataset.side }; });
    assert.equal(sheet.level, "1");
    assert.deepEqual(sheet.radius, ["16px", "16px", "0px"]);
    assert.equal(sheet.over, "contain");
    assert.equal(sheet.bg, await resolve(page, "var(--basalt-surface-1)"));
    assert.notEqual(sheet.shadow, "none", "the modal shadow");
    const row = await page.locator(".basalt-site-menu .basalt-nav-item").nth(1).evaluate((a) => { const pill = a.querySelector(".basalt-nav-pill"); const l = a.querySelector(".basalt-nav-label"); const p = pill.getBoundingClientRect(); return { h: p.height, x: p.x, font: getComputedStyle(l).fontSize, line: getComputedStyle(l).lineHeight, weight: getComputedStyle(l).fontWeight, color: getComputedStyle(l).color, current: a.getAttribute("aria-current"), glyphs: pill.querySelectorAll("svg").length }; });
    assert.equal(row.h, 48);
    assert.ok(row.x >= 6, `${row.x} from the sheet's edge, so a ring never clips`);
    assert.deepEqual([row.font, row.line, row.weight, row.glyphs], ["20px", "28px", "600", 0]);
    assert.equal(row.current, "page");
    assert.equal(row.color, await resolve(page, "var(--basalt-text-primary)", "color"));
    assert.equal(await page.locator(".basalt-site-menu .basalt-nav-item").nth(0).evaluate((a) => getComputedStyle(a.querySelector(".basalt-nav-label")).fontWeight), "400");
    const foot = await box(page, ".basalt-site-menu-foot .basalt-button");
    assert.equal(foot.h, 44);
    near(foot.w, (await contentWidth(page)) - 32, "the action is full width", 0.6);
    const band = await box(page, ".basalt-site-menu-band");
    assert.equal(band.h, 56);
    assert.equal(await css(page, ".basalt-site-menu-band", "borderBottomWidth"), "1px", "a divider under the band");
    await page.close();
  });

  test("the menu is as tall as its content, and scrolls inside at the viewport's height", async () => {
    let page = await open(site(), { width: 390, height: 900 });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(600);
    const tall = await box(page, ".basalt-site-menu");
    assert.ok(tall.h < 900 - 100, `${tall.h} tall at 900`);
    await page.close();
    page = await open(site(), { width: 390, height: 360 });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(600);
    const short = await page.locator(".basalt-site-menu").evaluate((el) => ({ h: el.getBoundingClientRect().height, scroll: el.scrollHeight, client: el.clientHeight, y: getComputedStyle(el).overflowY }));
    near(short.h, 360, "no taller than the viewport", 1);
    assert.ok(short.scroll > short.client && short.y === "auto", "it scrolls inside");
    await page.close();
  });

  test("widening past 720 closes it and focuses the current link in the bar", async () => {
    const page = await open(site({ current: "docs" }), { width: 390 });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(500);
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(700);
    assert.equal(await page.locator(".basalt-site-menu").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-current") + ":" + document.activeElement?.className), "page:basalt-site-link");
    await page.close();
  });

  test("it unrolls beneath the band as a clip over duration-slower on ease-out, and leaves at 0.75 on ease-in", async () => {
    const page = await open(site(), { width: 390 });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(40);
    const during = await page.locator(".basalt-site-menu").evaluate((el) => ({ clip: getComputedStyle(el).clipPath, running: el.getAnimations().map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration, e: a.effect.getTiming().easing })) }));
    const unroll = during.running.find((a) => a.p === "clip-path");
    assert.ok(unroll, `a clip-path transition runs: ${JSON.stringify(during)}`);
    assert.equal(unroll.d, 300);
    assert.equal(unroll.e, "cubic-bezier(0.16, 1, 0.3, 1)");
    assert.ok(!during.running.some((a) => a.p === "transform"), "it never slides");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(30);
    const leaving = await page.locator(".basalt-site-menu").evaluate((el) => el.getAnimations().map((a) => ({ p: a.transitionProperty, d: a.effect.getTiming().duration, e: a.effect.getTiming().easing })).find((a) => a.p === "clip-path"));
    near(leaving.d, 225, "0.75 of duration-slower", 0.01);
    assert.equal(leaving.e, "cubic-bezier(0.4, 0, 1, 1)");
    await page.close();
  });

  test("under reduced motion it is opacity only", async () => {
    const page = await open(site(), { width: 390, reducedMotion: "reduce" });
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(30);
    const running = await page.locator(".basalt-site-menu").evaluate((el) => ({ clip: getComputedStyle(el).clipPath, props: el.getAnimations().map((a) => a.transitionProperty), property: getComputedStyle(el).transitionProperty }));
    assert.equal(running.clip, "none");
    assert.equal(running.property, "opacity");
    assert.ok(running.props.every((p) => p === "opacity"), JSON.stringify(running));
    await page.close();
  });

  test("Menu morphs to Close over duration-slow: the trigger's glyph is the drawn pair", async () => {
    const page = await open(site(), { width: 390 });
    assert.equal(await page.locator(".basalt-site-menu-trigger svg").getAttribute("data-icon"), "menu");
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator(".basalt-site-menu-close svg").getAttribute("data-icon"), "close");
    assert.equal(await page.locator(".basalt-site-menu-close svg").evaluate((s) => s.getBoundingClientRect().width), 16, "IconButton's own 16");
    await page.close();
  });

  test("the menu's band is the bar again: the brand and the toggle sit where they were", async () => {
    const page = await open(site(), { width: 390 });
    const brand = await box(page, ".basalt-site-header .basalt-site-brand");
    const toggle = await box(page, ".basalt-site-header .basalt-bar-actions .basalt-button", 0);
    await page.locator(".basalt-site-menu-trigger").click();
    await page.waitForTimeout(600);
    const brand2 = await box(page, ".basalt-site-menu .basalt-site-brand");
    const toggle2 = await box(page, ".basalt-site-menu .basalt-bar-actions .basalt-button", 0);
    for (const [a, b, name] of [[brand, brand2, "brand"], [toggle, toggle2, "toggle"]]) { near(a.x, b.x, `${name} x`, 0.5); near(a.y, b.y, `${name} y`, 0.5); }
    await page.close();
  });
});

describe("the app shell", () => {
  test("a 256px sidebar at 1024 and up, a 72px rail from 720 to 1023, and a tab bar under 720", async () => {
    for (const [width, sidebar, tabbar] of [[1440, 256, false], [1024, 256, false], [1023, 72, false], [900, 72, false], [720, 72, false], [719, 0, true], [390, 0, true]]) {
      const page = await open(shell(), { width });
      const shown = await css(page, ".basalt-app-sidebar", "display");
      if (sidebar) { near((await box(page, ".basalt-app-sidebar")).w, sidebar, `the sidebar at ${width}`, 0.05); assert.notEqual(shown, "none"); } else assert.equal(shown, "none", `no sidebar or rail at ${width}`);
      assert.equal((await css(page, ".basalt-tabbar", "display")) !== "none", tabbar, `the tab bar at ${width}`);
      assert.deepEqual(page.errors, []);
      await page.close();
    }
  });

  test("the sidebar is surface-page, edged by a 1px border-divider, sticky at 100dvh; its brand band is 56 and level with the header, and draws no line", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(shell(), { theme, height: 700 });
      const side = await page.locator(".basalt-app-sidebar").evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, edge: s.borderInlineEndWidth, edgeColor: s.borderInlineEndColor, pos: s.position, h: el.getBoundingClientRect().height }; });
      assert.equal(side.bg, await resolve(page, "var(--basalt-surface-page)"));
      assert.equal(side.edge, "1px");
      assert.equal(side.edgeColor, await resolve(page, "var(--basalt-border-divider)", "color"));
      assert.equal(side.pos, "sticky");
      assert.equal(side.h, 700);
      const band = await page.locator(".basalt-app-brand").evaluate((el) => { const s = getComputedStyle(el); return { h: el.getBoundingClientRect().height, line: s.borderBottomWidth, top: s.borderTopWidth }; });
      assert.deepEqual([band.h, band.line, band.top], [56, "0px", "0px"]);
      assert.equal((await box(page, ".basalt-app-header")).h, 56);
      await page.close();
    }
  });

  test("the header spans the content column only, never the sidebar; on a phone it spans the full width with the same geometry", async () => {
    let page = await open(shell(), { width: 1440 });
    const side = await box(page, ".basalt-app-sidebar");
    const head = await box(page, ".basalt-app-header");
    near(head.x, side.right, "the header starts at the sidebar's edge", 0.05);
    near(head.right, await contentWidth(page), "and runs to the right edge of the content area", 0.05);
    assert.equal(head.h, 56);
    const title = await page.locator(".basalt-app-title").evaluate((h) => { const s = getComputedStyle(h); return { size: s.fontSize, line: s.lineHeight, weight: s.fontWeight, tag: h.tagName }; });
    assert.deepEqual(title, { size: "18px", line: "26px", weight: "600", tag: "H1" });
    await page.close();
    page = await open(shell(), { width: 390 });
    const phone = await box(page, ".basalt-app-header");
    assert.deepEqual([phone.x, phone.w, phone.h], [0, await contentWidth(page), 56]);
    assert.equal(await css(page, ".basalt-app-header", "position"), "sticky");
    await page.close();
  });

  test("the document is the scroller: the sidebar stays put at 100dvh, the header sticks, and no pane inside scrolls", async () => {
    const page = await open(shell(), { width: 1440, height: 700 });
    await page.mouse.move(800, 400);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(200);
    const facts = await page.evaluate(() => ({
      y: window.scrollY,
      side: document.querySelector(".basalt-app-sidebar").getBoundingClientRect().top,
      head: document.querySelector(".basalt-app-header").getBoundingClientRect().top,
      scrollers: [...document.querySelectorAll("body *")].filter((el) => { const s = getComputedStyle(el); return /auto|scroll/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1; }).map((el) => el.className),
      gutter: getComputedStyle(document.documentElement).scrollbarGutter,
      padding: getComputedStyle(document.documentElement).scrollPaddingTop,
    }));
    assert.ok(facts.y > 500, `the document scrolled (${facts.y})`);
    assert.equal(facts.side, 0);
    assert.equal(facts.head, 0);
    assert.deepEqual(facts.scrollers, [], "no inner pane is a scroller");
    assert.equal(facts.gutter, "stable");
    near(Number.parseFloat(facts.padding), 56 + 16, "scroll-padding-top is the bar and a step", 0.05);
    await page.close();
  });

  test("the rail is Nav's collapsed form: a 48px circle with the label as its name, counts spoken; the sidebar's items hug", async () => {
    let page = await open(shell(), { width: 900 });
    assert.equal(await page.locator(".basalt-app-sidebar .basalt-nav[data-collapsed]").count(), 2);
    const pill = await box(page, ".basalt-app-sidebar .basalt-nav-pill", 0);
    near(pill.w, 48, "a 48 circle", 0.05);
    near(pill.x, 12, "12 from the edge", 1);
    assert.ok(await page.getByRole("link", { name: "Messages" }).count() > 0);
    assert.equal(await page.locator(".basalt-app-brand-rail").evaluate((el) => getComputedStyle(el).display !== "none"), true);
    await page.close();
    page = await open(shell(), { width: 1440 });
    assert.equal(await page.locator(".basalt-app-sidebar .basalt-nav[data-collapsed]").count(), 0);
    assert.equal(await page.locator(".basalt-app-brand-full").evaluate((el) => getComputedStyle(el).display !== "none"), true);
    await page.close();
  });

  test("main is capped at 72rem and start-aligned; under 720 the header's primary Button leaves the bar", async () => {
    let page = await open(shell(), { width: 1800 });
    const main = await box(page, ".basalt-app-main");
    near(main.w, 1152, "72rem", 0.05);
    near(main.x, 256, "start-aligned beside the sidebar", 0.05);
    assert.notEqual(await css(page, ".basalt-app-header .basalt-button[data-variant=primary]", "display"), "none");
    await page.close();
    page = await open(shell(), { width: 390 });
    assert.equal(await css(page, ".basalt-app-header .basalt-button[data-variant=primary]", "display"), "none");
    assert.equal(await page.locator(".basalt-app-header .basalt-button:visible").count(), 1, "the toggle stays");
    await page.close();
  });

  test("the opaque form is the same bar on surface-page with no filter; only one smoked surface per viewport", async () => {
    let page = await open(shell());
    assert.equal(await filtered(page), 1);
    await page.close();
    page = await open(shell({ solid: true }));
    assert.equal(await filtered(page), 0);
    assert.equal(await css(page, ".basalt-app-header", "backgroundColor"), await resolve(page, "var(--basalt-surface-page)"));
    assert.equal((await box(page, ".basalt-app-header")).h, 56);
    await page.close();
  });
});

describe("the phone tab bar", () => {
  const phone = (extra = {}) => open(shell(extra.shell), { width: 390, height: 700, ...extra.options });

  test("56px with its hairline inside, plus the bottom inset; content pads past it by the bar, the inset and 24; toasts sit above it", async () => {
    const page = await phone();
    let bar = await box(page, ".basalt-tabbar");
    assert.deepEqual([bar.h, bar.bottom, bar.w], [56, 700, await contentWidth(page)]);
    assert.equal(await css(page, ".basalt-tabbar", "borderTopWidth"), "1px");
    await page.evaluate(() => document.documentElement.style.setProperty("--_inset-bottom-sim", "34px"));
    bar = await box(page, ".basalt-tabbar");
    assert.equal(bar.h, 90, "56 plus a 34px inset");
    assert.equal(bar.bottom, 700);
    near(Number.parseFloat(await css(page, ".basalt-app-main", "paddingBottom")), 56 + 34 + 24, "content pads past the bar", 0.05);
    const list = await box(page, ".basalt-tabbar-list");
    assert.equal(list.h, 55, "the cells are 55 under the 1px line");
    await page.evaluate(() => document.dispatchEvent(new CustomEvent("noop")));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-tabbar")).boxShadow), "none");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-tabbar")).backdropFilter), "none");
    await page.close();
  });

  test("toasts sit above the tab bar at phone widths", async () => {
    const page = await open(`${shell()}\n`.replace("<p>Synthetic page.</p>", "<p>Synthetic page.</p><ToastButton />").replace("document.body.style.margin", "const ToastButton = () => { const t = B.useToast(); return <button id=\"t\" onClick={() => t.show({ title: \"Saved\", home: \"page\", timeout: 600000 })}>toast</button>; }; document.body.style.margin"), { width: 390, height: 700 });
    await page.click("#t");
    await page.waitForTimeout(600);
    const toast = await box(page, ".basalt-toast");
    const bar = await box(page, ".basalt-tabbar");
    assert.ok(toast.bottom <= bar.y - 15, `the toast ends at ${toast.bottom}, the bar starts at ${bar.y}`);
    await page.close();
  });

  test("three to five equal cells, each a link with aria-current on the current one; a nav named Primary, not a tablist", async () => {
    const page = await phone({ shell: { current: "trends" } });
    assert.equal(await page.getByRole("navigation", { name: "Primary" }).locator(".basalt-tabbar-item").count(), 4);
    assert.equal(await page.locator(".basalt-tabbar [role=tablist], .basalt-tabbar [role=tab]").count(), 0);
    const widths = [];
    for (let i = 0; i < 4; i++) widths.push((await box(page, ".basalt-tabbar-item", i)).w);
    const cells = (await contentWidth(page)) / 4;
    widths.forEach((w) => near(w, cells, "equal cells", 0.05));
    assert.equal(await page.locator('.basalt-tabbar [aria-current="page"]').count(), 1);
    assert.equal(await page.locator('.basalt-tabbar [aria-current="page"]').innerText(), "Trends");
    await page.close();
  });

  for (const theme of ["dark", "light"]) {
    test(`a 24 glyph over a 12/16 label, always both, primary at rest and the label at 400; current is the selected glyph and a 600 label with no wash (${theme})`, async () => {
      const page = await open(shell({ current: "trends" }), { width: 390, theme });
      const primary = await resolve(page, "var(--basalt-text-primary)", "color");
      const rest = await page.locator(".basalt-tabbar-item").nth(0).evaluate((a) => { const g = a.querySelector("svg").getBoundingClientRect(); const l = a.querySelector(".basalt-tabbar-label"); const ls = getComputedStyle(l); return { g: [g.width, g.height], size: ls.fontSize, line: ls.lineHeight, weight: ls.fontWeight, color: ls.color, glyph: getComputedStyle(a.querySelector("svg")).color, circle: a.querySelector(".basalt-tabbar-glyph").getBoundingClientRect().width, bg: getComputedStyle(a.querySelector(".basalt-tabbar-glyph")).backgroundColor, selected: a.querySelector("svg").dataset.selected, above: g.bottom <= l.getBoundingClientRect().top }; });
      assert.deepEqual(rest.g, [24, 24]);
      assert.deepEqual([rest.size, rest.line, rest.weight, rest.circle, rest.above], ["12px", "16px", "400", 32, true]);
      assert.equal(rest.color, primary);
      assert.equal(rest.glyph, primary);
      assert.equal(rest.bg, "rgba(0, 0, 0, 0)");
      const current = await page.locator(".basalt-tabbar-item").nth(2).evaluate((a) => ({ weight: getComputedStyle(a.querySelector(".basalt-tabbar-label")).fontWeight, bg: getComputedStyle(a).backgroundColor, circle: getComputedStyle(a.querySelector(".basalt-tabbar-glyph")).backgroundColor, paths: a.querySelector("svg").innerHTML.length }));
      assert.equal(current.weight, "600");
      assert.equal(current.bg, "rgba(0, 0, 0, 0)");
      assert.equal(current.circle, "rgba(0, 0, 0, 0)", "no wash, no pill");
      const restPaths = await page.locator(".basalt-tabbar-item").nth(0).evaluate((a) => a.querySelector("svg").innerHTML.length);
      assert.notEqual(current.paths, restPaths, "the selected glyph is another drawing");
      await page.close();
    });
  }

  test("a cell is top-aligned: its 32px circle sits 2px below the cell's top", async () => {
    const page = await phone();
    const gap = await page.locator(".basalt-tabbar-item").nth(0).evaluate((a) => a.querySelector(".basalt-tabbar-glyph").getBoundingClientRect().top - a.getBoundingClientRect().top);
    assert.equal(gap, 2);
    await page.close();
  });

  test("becoming current moves nothing in the cell", async () => {
    const at = async (current) => { const page = await open(shell({ current }), { width: 390 }); const out = []; for (let i = 0; i < 4; i++) out.push(await page.locator(".basalt-tabbar-item").nth(i).evaluate((a) => { const g = a.querySelector("svg").getBoundingClientRect(); const l = a.querySelector(".basalt-tabbar-label").getBoundingClientRect(); return [g.x, g.y, l.x, l.y, l.width]; })); await page.close(); return out; };
    const a = await at("home"); const b = await at("plan");
    a.forEach((row, i) => row.forEach((v, j) => near(v, b[i][j], `cell ${i} value ${j}`, 0.05)));
  });

  test("press and hover are a 32px circle at the selected wash behind the glyph; the first key hides it; focus is the control ring inset by its own width on the full cell", async () => {
    const page = await phone();
    const wash = await resolve(page, "var(--basalt-state-selected)");
    const cell = await box(page, ".basalt-tabbar-item", 1);
    await page.mouse.move(cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.waitForTimeout(250);
    const circle = () => page.locator(".basalt-tabbar-glyph").nth(1).evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { bg: s.backgroundColor, w: r.width, h: r.height, radius: s.borderTopLeftRadius }; });
    let c = await circle();
    assert.deepEqual([c.bg, c.w, c.h], [wash, 32, 32]);
    assert.ok(Number.parseFloat(c.radius) >= 16);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(250);
    assert.ok(await page.locator(".basalt-tabbar").evaluate((el) => el.hasAttribute("data-keys")), "the first key marks the bar");
    c = await circle();
    assert.equal(c.bg, "rgba(0, 0, 0, 0)", "hidden by the first key");
    await page.mouse.move(5, 5);
    await page.mouse.move(cell.x + cell.w / 2, cell.y + cell.h / 2);
    await page.waitForTimeout(250);
    assert.equal((await circle()).bg, wash, "the next pointer move brings it back");
    await page.mouse.move(5, 5);
    await page.keyboard.press("Tab");
    for (let i = 0; i < 40 && !(await page.evaluate(() => document.activeElement?.classList.contains("basalt-tabbar-item"))); i++) await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => { const a = document.activeElement; const s = getComputedStyle(a); return { w: s.outlineWidth, offset: s.outlineOffset, style: s.outlineStyle, color: s.outlineColor, box: a.getBoundingClientRect().height }; });
    assert.deepEqual([ring.w, ring.offset, ring.style], ["2px", "-2px", "solid"]);
    assert.equal(ring.color, await resolve(page, "var(--basalt-border-focus)", "color"));
    assert.equal(ring.box, 55, "on the full cell");
    await page.close();
  });

  test("a new-activity mark is a 6px dot in the label's ink at the glyph's top end, its words in the link's name; counts are not drawn", async () => {
    const page = await phone();
    const dot = await page.locator(".basalt-tabbar-item").nth(1).evaluate((a) => { const d = a.querySelector(".basalt-tabbar-dot"); const g = a.querySelector("svg").getBoundingClientRect(); const r = d.getBoundingClientRect(); return { w: r.width, h: r.height, bg: getComputedStyle(d).backgroundColor, ink: getComputedStyle(a.querySelector(".basalt-tabbar-label")).color, top: r.top - g.top, end: g.right - r.right, hidden: d.getAttribute("aria-hidden") }; });
    assert.deepEqual([dot.w, dot.h, dot.hidden], [6, 6, "true"]);
    assert.equal(dot.bg, dot.ink);
    assert.ok(dot.top <= 8 && dot.end <= 8, `at the glyph's top end: ${dot.top}, ${dot.end}`);
    assert.equal(await page.getByRole("link", { name: /^Messages\s*,\s*New activity$/ }).count(), 1);
    await page.close();
  });

  test("more than five destinations: four, then More, a button that opens the bottom Sheet with the rest as Nav rows", async () => {
    const page = await open(shell({ more: true }), { width: 390, height: 700 });
    const more = page.getByRole("button", { name: "More" });
    assert.equal(await more.count(), 1);
    assert.equal(await page.locator(".basalt-tabbar-item").count(), 5);
    await more.click();
    await page.waitForTimeout(600);
    const sheet = page.getByRole("dialog", { name: "More" });
    assert.equal(await sheet.getAttribute("data-side"), "bottom");
    assert.equal(await sheet.locator(".basalt-nav-item").count(), 2);
    assert.equal(await sheet.locator(".basalt-nav-pill").first().evaluate((p) => p.getBoundingClientRect().height), 48);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("basalt-tabbar-more")), "focus returns to More");
    await page.close();
  });

  test("More takes the current look while one of its pages is current, and its name says which", async () => {
    const page = await open(shell({ more: true, current: "settings" }), { width: 390, height: 700 });
    const more = page.locator(".basalt-tabbar-more");
    assert.equal(await more.getAttribute("aria-label"), "More, Settings, current page");
    assert.equal(await more.locator(".basalt-tabbar-label").evaluate((l) => getComputedStyle(l).fontWeight), "600");
    assert.equal(await page.locator(".basalt-tabbar-item").nth(0).locator(".basalt-tabbar-label").evaluate((l) => getComputedStyle(l).fontWeight), "400");
    const rest = await open(shell({ more: true, current: "home" }), { width: 390, height: 700 });
    assert.equal(await rest.locator(".basalt-tabbar-more").getAttribute("aria-label"), "More");
    assert.equal(await rest.locator(".basalt-tabbar-more .basalt-tabbar-label").evaluate((l) => getComputedStyle(l).fontWeight), "400");
    await rest.close();
    await page.close();
  });

  test("forced colours: Canvas with a CanvasText line; solid and unblurred; not shown in print", async () => {
    const page = await open(shell(), { width: 390, forcedColors: "active" });
    const facts = await page.locator(".basalt-tabbar").evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, line: s.borderTopColor }; });
    assert.equal(facts.bg, await resolve(page, "Canvas"));
    assert.equal(facts.line, await resolve(page, "CanvasText", "color"));
    await page.emulateMedia({ media: "print" });
    assert.equal(await css(page, ".basalt-tabbar", "display"), "none");
    await page.close();
  });

  test("the tab bar's surface is solid surface-page in both themes", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(shell(), { width: 390, theme });
      assert.equal(await css(page, ".basalt-tabbar", "backgroundColor"), await resolve(page, "var(--basalt-surface-page)"));
      await page.close();
    }
  });
});

describe("accessibility, both themes", () => {
  for (const theme of ["dark", "light"]) {
    for (const [name, fixture, options, then] of [
      ["the site header at 1440", site(), { width: 1440 }],
      ["the site header at 390", site(), { width: 390 }],
      ["the narrow menu open", site({ current: "docs" }), { width: 390 }, async (page) => { await page.locator(".basalt-site-menu-trigger").click(); await page.waitForTimeout(600); }],
      ["the opaque site header", site({ solid: true }), { width: 1440 }],
      ["the app shell at 1440", shell(), { width: 1440 }],
      ["the rail at 900", shell(), { width: 900 }],
      ["the tab bar at 390", shell({ more: true, current: "settings" }), { width: 390 }],
      ["More open", shell({ more: true }), { width: 390 }, async (page) => { await page.getByRole("button", { name: "More" }).click(); await page.waitForTimeout(600); }],
    ]) {
      test(`axe: ${name} (${theme})`, async () => {
        const page = await open(fixture, { ...options, theme });
        if (then) await then(page);
        assert.deepEqual(await axe(page), []);
        assert.deepEqual(page.errors, []);
        await page.close();
      });
    }
  }
  for (const [name, options] of [["forced colours", { forcedColors: "active" }], ["reduced motion", { reducedMotion: "reduce" }]]) {
    test(`axe under ${name}: the header, the menu and the shell`, async () => {
      for (const [fixture, width, then] of [[site(), 1440], [site(), 390, async (page) => { await page.locator(".basalt-site-menu-trigger").click(); await page.waitForTimeout(400); }], [shell(), 390]]) {
        const page = await open(fixture, { width, ...options });
        if (then) await then(page);
        // The system's colours are the reader's, and axe cannot measure them: forced colours is proved by the computed-style tests above.
        assert.deepEqual(await axe(page, { contrast: !options.forcedColors }), []);
        await page.close();
      }
    });
  }
});
