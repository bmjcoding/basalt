// The thirteenth parity PR (the site parts, DECISIONS 146 and review round 39): the site footer, the theme choice, the lockup by pixel density, a bar that arrives or leaves and
// returns, and drawn art's fit and anchor, rendered side by side in Chromium in both themes and compared. The skill carries each in a module it already had (topbar, theme, stage,
// framed-art), so SKILL.md gained no index line. Not compared by computed style, and recorded in words (see parity-differences.mjs): React's pill and the skill's `a::before` are
// different boxes with the same rectangle, so the pill's size and radius are read from each; the footer's disclosure chevron rotates over duration-slow in both, which a computed
// style cannot see; React builds the footer's groups from props and the skill from its markup and a script.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact } from "../../../packages/react/test/support.mjs";
import { launch, openHtml, read as readFile, skillDir } from "./support.mjs";

let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const GROUPS = [["Product", ["Docs", "Pricing", "Changelog"]], ["Company", ["About", "Careers", "Contact"]], ["Legal", ["Terms", "Privacy", "Security"]]];

const REACT = `
document.body.style.margin = "0";
const groups = ${JSON.stringify(GROUPS.map(([label, links]) => ({ label, links: links.map((l, i) => ({ href: "#" + l, label: l, current: l === "Pricing" })) })))};
createRoot(document.getElementById("root")).render(<B.SitePage><main><div style={{ height: 100 }}>x</div></main>
  <B.SiteFooter brand={<B.SiteBrand label="Sample home"><b>Sample</b></B.SiteBrand>} note="A plain sentence about the site." groups={groups} legal="Sample Ltd. All rights reserved." /></B.SitePage>);`;

const SKILL = `<!-- basalt:use glide --><div class="site-page"><main><div style="height: 100px">x</div></main>
<footer class="site-footer"><div class="site-footer-body"><div class="site-footer-top">
  <div class="site-footer-id"><a class="brand" href="/" aria-label="Sample home"><b>Sample</b></a><p class="site-footer-note">A plain sentence about the site.</p></div>
  <nav class="site-footer-links" aria-label="Footer"><div class="site-footer-groups">
  ${GROUPS.map(([label, links]) => `<div class="site-footer-group"><h2 class="site-footer-label">${label}</h2><ul>${links.map((l) => `<li><a href="#${l}"${l === "Pricing" ? ' aria-current="page"' : ""}>${l}</a></li>`).join("")}</ul></div>`).join("")}
  </div></nav></div>
  <div class="site-footer-base"><p class="site-footer-legal">Sample Ltd. All rights reserved.</p>
  <div class="theme-choice"><span class="theme-choice-label" id="tl">Theme</span><div class="segment" role="radiogroup" aria-labelledby="tl">
    <button type="button" role="radio" data-value="system"><span data-label="System">System</span></button>
    <button type="button" role="radio" data-value="light"><span data-label="Light">Light</span></button>
    <button type="button" role="radio" data-value="dark"><span data-label="Dark">Dark</span></button></div></div></div>
</div></footer></div>`;

const read = (page, selector, props, pseudo) => page.evaluate(({ selector, props, pseudo }) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const s = getComputedStyle(el, pseudo || null);
  const r = el.getBoundingClientRect();
  return Object.fromEntries(props.map((p) => [p, p === "w" ? Math.round(r.width * 100) / 100 : p === "h" ? Math.round(r.height * 100) / 100 : s[p]]));
}, { selector, props, pseudo });

async function same(react, skill, pairs, label) {
  for (const [r, s, props, pseudo] of pairs) {
    const a = await read(react, r, props);
    const b = await read(skill, s, props, pseudo);
    assert.ok(a && b, `${label}: ${r} / ${s} both exist`);
    assert.deepEqual(b, a, `${label}: ${r} against ${s}`);
  }
}

describe("the site footer, against the skill's", () => {
  for (const theme of THEMES) {
    for (const width of [1440, 900, 390]) {
      test(`the footer, its divider, labels, links and base match at ${width} in ${theme}`, async () => {
        const react = await fixturePage(reactBrowser, REACT, { theme, colorScheme: theme, viewport: { width, height: 900 } });
        const skill = await openHtml(browser, compose(`<title>Footer</title>${SKILL}`, { fonts: false }).html, { scheme: theme, width });
        if (width === 390) {
          // the disclosures are drawn once script has run: open every group in both so the links are measured
          for (const p of [react.page, skill.page]) await p.evaluate(() => document.querySelectorAll("[class*=footer-toggle][aria-expanded=false]").forEach((b) => b.click()));
        }
        await same(react.page, skill.page, [
          [".basalt-site-footer", ".site-footer", ["marginTop", "paddingBottom", "color", "fontSize", "lineHeight", "backgroundColor", "boxShadow"]],
          [".basalt-site-footer-body", ".site-footer-body", ["borderTopWidth", "borderTopColor", "borderTopStyle", "paddingTop", "w"]],
          [".basalt-site-footer-label", ".site-footer-label", ["fontSize", "fontWeight", "lineHeight", "color", "textTransform", "marginBottom"]],
          [".basalt-site-footer-note", ".site-footer-note", ["fontSize", "color", "maxWidth"]],
          [".basalt-site-footer-legal", ".site-footer-legal", ["fontSize", "lineHeight", "color", "maxWidth"]],
          [".basalt-site-footer-base", ".site-footer-base", ["marginTop", "display", "flexDirection"]],
          [".basalt-site-footer-groups", ".site-footer-groups", ["display", "columnGap", "rowGap", "gridTemplateColumns"]],
        ], "box");
        const hit = [".basalt-site-link", ".site-footer-links-host a"];
        await same(react.page, skill.page, [[hit[0], hit[1], ["h", "w", "fontSize", "lineHeight", "color"]]], "link");
        const pill = async (p, sel, pseudo) => p.evaluate(({ sel, pseudo }) => { const el = document.querySelector(sel); const s = getComputedStyle(pseudo ? el : el, pseudo || null); return pseudo ? { h: parseFloat(s.height), r: s.borderTopLeftRadius } : { h: el.getBoundingClientRect().height, r: s.borderTopLeftRadius }; }, { sel, pseudo });
        assert.deepEqual(await pill(skill.page, ".site-footer-links-host a", "::before"), await pill(react.page, ".basalt-site-pill"), "the pill's height and radius");
        const word = (p, sel) => p.evaluate((s) => { const r = document.createRange(); r.selectNodeContents(document.querySelector(s)); return Math.round(r.getBoundingClientRect().left * 10) / 10; }, sel);
        assert.equal(await word(skill.page, ".site-footer-links-host a"), await word(react.page, ".basalt-site-link .basalt-site-label"), "the first link's words are hung to the same edge");
        assert.deepEqual(react.errors, []);
        assert.deepEqual(skill.errors, []);
        await react.page.close();
        await skill.context.close();
      });
    }
  }

  test("under 720 a group is a disclosure in both: a 44px row, closed unless it holds the current page, and the same rows open", async () => {
    const react = await fixturePage(reactBrowser, REACT, { theme: "dark", colorScheme: "dark", viewport: { width: 390, height: 900 } });
    const skill = await openHtml(browser, compose(`<title>Footer</title>${SKILL}`, { fonts: false }).html, { scheme: "dark", width: 390 });
    const state = (p) => p.evaluate(() => [...document.querySelectorAll("[class*=footer-toggle]")].map((b) => [Math.round(b.getBoundingClientRect().height), b.getAttribute("aria-expanded")]));
    assert.deepEqual(await state(skill.page), await state(react.page));
    assert.deepEqual(await state(react.page), [[44, "false"], [44, "false"], [44, "false"]].map((x, i) => (i === 0 ? [44, "true"] : x)));
    await react.page.close();
    await skill.context.close();
  });
});

describe("the theme choice, against the skill's", () => {
  const CONTROL = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><B.ThemeChoiceControl /></div>);`;
  const SKILL_CONTROL = `<div style="padding: 24px">${SKILL.match(/<div class="theme-choice">[\s\S]*?<\/div><\/div>/)[0]}</div>`;
  for (const theme of THEMES) {
    for (const chosen of ["system", "dark"]) {
      test(`${chosen} chosen: the track, the words and the chosen pill match in ${theme}`, async () => {
        const react = await fixturePage(reactBrowser, CONTROL, { theme, colorScheme: theme, viewport: { width: 600, height: 300 } });
        const skill = await openHtml(browser, compose(`<title>Theme</title>${SKILL_CONTROL}`, { fonts: false }).html, { scheme: theme, width: 600 });
        if (chosen !== "system") { await react.page.getByRole("radio", { name: "Dark" }).click(); await skill.page.getByRole("radio", { name: "Dark" }).click(); }
        for (const p of [react.page, skill.page]) await p.waitForFunction(() => document.querySelector("[role=radiogroup]").hasAttribute("data-slide"));
        await react.page.mouse.move(580, 280); await skill.page.mouse.move(580, 280);
        for (const p of [react.page, skill.page]) await p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
        await react.page.getByRole("radio", { name: chosen === "dark" ? "Dark" : "System" }).evaluate((el) => el.focus());
        await same(react.page, skill.page, [
          [".basalt-theme-choice", ".theme-choice", ["h", "w", "display", "columnGap"]],
          [".basalt-theme-choice-label", ".theme-choice-label", ["fontSize", "lineHeight", "color"]],
          [".basalt-theme-choice .basalt-segmented", ".theme-choice .segment", ["h", "w", "paddingTop", "borderTopLeftRadius", "backgroundColor"]],
          [`.basalt-theme-choice [data-value=${chosen}]`, `.theme-choice [data-value=${chosen}]`, ["h", "w", "fontWeight", "color", "borderTopLeftRadius", "boxShadow"]],
          [".basalt-theme-choice [data-value=light]", ".theme-choice [data-value=light]", ["h", "w", "fontWeight", "color", "boxShadow"]],
        ], "choice");
        assert.deepEqual(react.errors, []);
        assert.deepEqual(skill.errors, []);
        await react.page.close();
        await skill.context.close();
      });
    }
  }

  test("the skill's choice is a radio group: one tab stop, arrows move and choose and store, System stores nothing", async () => {
    const skill = await openHtml(browser, compose(`<title>Theme</title>${SKILL_CONTROL}`, { fonts: false }).html, { scheme: "dark", width: 600 });
    const p = skill.page;
    const stored = () => p.evaluate(() => localStorage.getItem("basalt-theme"));
    assert.deepEqual(await p.locator("[role=radio]").evaluateAll((els) => els.map((e) => [e.getAttribute("aria-checked"), e.tabIndex])), [["true", 0], ["false", -1], ["false", -1]]);
    await p.locator("[data-value=system]").focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await stored(), "light");
    assert.equal(await p.evaluate(() => [document.documentElement.getAttribute("data-theme"), document.documentElement.getAttribute("data-theme-choice")].join()), "light,light");
    await p.keyboard.press("ArrowRight");
    assert.equal(await stored(), "dark");
    await p.keyboard.press("ArrowRight");
    assert.equal(await stored(), null, "wraps to System, which stores nothing");
    await p.keyboard.press("End");
    assert.equal(await stored(), "dark");
    await p.keyboard.press("Home");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme-choice")), "system");
    assert.equal(await p.evaluate(() => window.Basalt.themeChoice()), "system");
    await skill.context.close();
  });

  test("the right word is chosen before the script runs: the head's attribute alone draws it", async () => {
    const html = compose(`<title>Theme</title>${SKILL_CONTROL}`, { fonts: false }).html.replace(/<script>[\s\S]*?<\/script>/g, "");
    for (const choice of ["system", "light", "dark"]) {
      const { page, context } = await openHtml(browser, html.replace("<html ", `<html data-theme-choice="${choice}" data-theme="dark" `), { scheme: "dark", width: 600 });
      const weights = await page.locator("[role=radio]").evaluateAll((els) => Object.fromEntries(els.map((e) => [e.dataset.value, getComputedStyle(e).fontWeight])));
      assert.equal(weights[choice], "600", `${choice}: ${JSON.stringify(weights)}`);
      assert.equal(Object.values(weights).filter((w) => w === "600").length, 1);
      await context.close();
    }
  });
});

describe("the lockup by pixel density, against React's", () => {
  const D = { x1: { viewBox: "0 0 40 32", d: "M0 4h24v3H0zM28 10h12v12H28z" }, x2: { viewBox: "0 0 42 32", d: "M0 4h24v2.5H0zM28 10.5h13v11H28z" } };
  const SKILL_BAR = `<svg class="lockup-sprite" aria-hidden="true"><symbol id="x1" viewBox="${D.x1.viewBox}"><path fill="currentColor" d="${D.x1.d}"/></symbol><symbol id="x2" viewBox="${D.x2.viewBox}"><path fill="currentColor" d="${D.x2.d}"/></symbol></svg>
    <header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Sample home"><svg class="lockup lockup-1x" viewBox="${D.x1.viewBox}" width="40" height="32" aria-hidden="true"><use href="#x1"/></svg><svg class="lockup lockup-2x" viewBox="${D.x2.viewBox}" width="42" height="32" aria-hidden="true"><use href="#x2"/></svg></a></div></header>`;
  const REACT_BAR = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteHeader brandLabel="Sample home" lockup={${JSON.stringify(D)}} />);`;
  for (const scale of [1, 1.5, 2, 2.625, 3]) {
    test(`the same drawing shows at ${scale}x, one of two, at the same size`, async () => {
      const react = await fixturePage(reactBrowser, REACT_BAR, { theme: "dark", colorScheme: "dark", viewport: { width: 600, height: 300 }, deviceScaleFactor: scale });
      const skill = await openHtml(browser, compose(`<title>Brand</title>${SKILL_BAR}`, { fonts: false }).html, { scheme: "dark", width: 600, deviceScaleFactor: scale });
      const shown = (p) => p.evaluate(() => [...document.querySelectorAll(".lockup, .basalt-lockup")].filter((e) => getComputedStyle(e).display !== "none").map((e) => [e.getAttribute("class").includes("1x") ? "1x" : "2x", e.getBoundingClientRect().width, e.getBoundingClientRect().height]));
      assert.deepEqual(await shown(skill.page), await shown(react.page));
      assert.equal((await shown(react.page)).length, 1);
      assert.equal(await skill.page.locator("body img, svg title").count(), 0, "no file and no title");
      await react.page.close();
      await skill.context.close();
    });
  }
});

describe("a bar that arrives, against React's", () => {
  const REACT_PHASE = `document.body.style.margin = "0";
    function Page() { const hero = React.useRef(null); return (<div>
      <B.SiteHeader brandLabel="Sample home" brand={<b>Sample</b>} phase={{ after: hero }} />
      <main><section ref={hero} id="hero" style={{ height: 600 }}>Hero</section><div style={{ height: 3000 }}>More</div></main></div>); }
    createRoot(document.getElementById("root")).render(<Page />);`;
  const SKILL_PHASE = `<div class="site-slot"><header class="topbar" data-phase-after="#hero"><div class="topbar-inner"><a class="brand" href="/" aria-label="Sample home"><b>Sample</b></a></div></header></div>
    <main><section id="hero" style="height: 600px">Hero</section><div style="height: 3000px">More</div></main>`;
  const phase = (p) => p.evaluate(() => { const h = document.querySelector("header"); return [h.getAttribute("data-phase"), h.getAttribute("data-form")]; });
  const to = async (p, y, expected) => { await p.evaluate((top) => window.scrollTo(0, top), y); await p.waitForFunction((e) => document.querySelector("header").getAttribute("data-phase") === e, expected); };

  test("the same phases and forms at the same scrolls, jumps included, with no scroll listener", async () => {
    const react = await fixturePage(reactBrowser, REACT_PHASE, { theme: "dark", colorScheme: "dark", viewport: { width: 1000, height: 700 } });
    const skill = await openHtml(browser, compose(`<title>Phase</title>${SKILL_PHASE}`, { fonts: false }).html, { scheme: "dark", width: 1000 });
    for (const p of [react.page, skill.page]) {
      await p.waitForFunction(() => document.querySelector("header").hasAttribute("data-phase"));
      await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    }
    for (const [y, expected, form] of [[0, "rest", "row"], [300, "between", "row"], [630, "pinned", "bar"], [5000, "pinned", "bar"], [300, "between", "row"], [0, "rest", "row"]]) {
      await to(react.page, y, expected);
      await to(skill.page, y, expected);
      assert.deepEqual(await phase(skill.page), await phase(react.page), `at ${y}`);
      assert.equal((await phase(skill.page))[1] === form || y === 300, true);
    }
    const slot = (p) => p.evaluate(() => [document.querySelector(".basalt-site-slot, .site-slot").getBoundingClientRect().height, getComputedStyle(document.querySelector("header")).position]);
    assert.deepEqual(await slot(skill.page), await slot(react.page));
    await react.page.close();
    await skill.context.close();
  });
});

describe("drawn art's fit and anchor, against React's", () => {
  const ART = `<svg viewBox="0 0 100 50"><rect width="100" height="50" fill="var(--basalt-art-tone-1)"/><path d="M0 40H100" stroke="var(--basalt-art-tone-4)" fill="none"/></svg>`;
  for (const [fit, anchor] of [[undefined, undefined], ["meet", undefined], [undefined, "end floor"], ["meet", "start top"]]) {
    test(`the figure's svg takes ${fit ?? "slice"} ${anchor ?? "center center"} as its preserveAspectRatio, in both`, async () => {
      const react = await fixturePage(reactBrowser, `createRoot(document.getElementById("root")).render(<B.FramedArt aspect="screen" ${fit ? `fit="${fit}"` : ""} ${anchor ? `anchor="${anchor}"` : ""} art={${ART.replace("stroke=", "stroke=")}} />);`, { theme: "dark", viewport: { width: 600, height: 400 } });
      const skill = await openHtml(browser, compose(`<title>Art</title><figure class="framed" data-aspect="screen"${fit ? ` data-fit="${fit}"` : ""}${anchor ? ` data-anchor="${anchor}"` : ""}><div class="framed-frame">${ART}</div></figure>`, { fonts: false }).html, { scheme: "dark", width: 600 });
      const par = (p) => p.evaluate(() => [document.querySelector(".framed svg, .basalt-framed svg").getAttribute("preserveAspectRatio"), getComputedStyle(document.querySelector(".framed svg path, .basalt-framed svg path")).vectorEffect]);
      assert.deepEqual(await par(skill.page), await par(react.page));
      await react.page.close();
      await skill.context.close();
    });
  }
  test("a stage's art is slice by default, keeps its own preserveAspectRatio unless a fit or an anchor is named, and takes them in both", async () => {
    const react = await fixturePage(reactBrowser, `createRoot(document.getElementById("root")).render(<B.Stage fit="meet" anchor="end floor" art={${ART}}>x</B.Stage>);`, { theme: "dark", viewport: { width: 600, height: 400 } });
    const skill = await openHtml(browser, compose(`<title>Art</title><section class="stage" data-fit="meet" data-anchor="end floor"><div class="stage-art" aria-hidden="true">${ART}</div><div class="stage-content">x</div></section>`, { fonts: false }).html, { scheme: "dark", width: 600 });
    const par = (p) => p.evaluate(() => document.querySelector("svg").getAttribute("preserveAspectRatio"));
    assert.equal(await par(skill.page), await par(react.page));
    const plain = await openHtml(browser, compose(`<title>Art</title><section class="stage"><div class="stage-art" aria-hidden="true"><svg viewBox="0 0 10 10" preserveAspectRatio="none"></svg></div><div class="stage-content">x</div></section>`, { fonts: false }).html, { scheme: "dark", width: 600 });
    assert.equal(await plain.page.evaluate(() => document.querySelector("svg").getAttribute("preserveAspectRatio")), "none", "its own stands");
    const bare = await openHtml(browser, compose(`<title>Art</title><section class="stage"><div class="stage-art" aria-hidden="true">${ART}</div><div class="stage-content">x</div></section>`, { fonts: false }).html, { scheme: "dark", width: 600 });
    const reactBare = await fixturePage(reactBrowser, `createRoot(document.getElementById("root")).render(<B.Stage art={${ART}}>x</B.Stage>);`, { theme: "dark", viewport: { width: 600, height: 400 } });
    assert.equal(await bare.page.evaluate(() => document.querySelector("svg").getAttribute("preserveAspectRatio")), "xMidYMid slice", "slice by default");
    assert.equal(await bare.page.evaluate(() => document.querySelector("svg").getAttribute("preserveAspectRatio")), await reactBare.page.evaluate(() => document.querySelector("svg").getAttribute("preserveAspectRatio")));
    await bare.context.close();
    await reactBare.page.close();
    await react.page.close();
    await skill.context.close();
    await plain.context.close();
  });
});

describe("what only the skill builds from markup", () => {
  test("without script every group is open, two a row; with it, under 720, each is a disclosure closed unless it holds the current page", async () => {
    const html = compose(`<title>Footer</title>${SKILL}`, { fonts: false }).html;
    const bare = await openHtml(browser, html.replace(/<script>[\s\S]*?<\/script>/g, ""), { scheme: "dark", width: 390 });
    assert.equal(await bare.page.locator("[class*=footer-toggle]").count(), 0, "no script, no disclosure");
    assert.equal(await bare.page.evaluate(() => [...document.querySelectorAll(".site-footer-group a")].every((a) => a.getBoundingClientRect().height > 0)), true);
    const rows = await bare.page.locator(".site-footer-group").evaluateAll((els) => { const ys = els.map((el) => Math.round(el.getBoundingClientRect().top)); return [...new Set(ys)].map((y) => ys.filter((v) => v === y).length); });
    assert.deepEqual(rows, [2, 1], "two a row");
    await bare.context.close();
    const live = await openHtml(browser, html, { scheme: "dark", width: 390 });
    assert.deepEqual(await live.page.locator(".site-footer-toggle").evaluateAll((els) => els.map((el) => [Math.round(el.getBoundingClientRect().height), el.getAttribute("aria-expanded")])), [[44, "true"], [44, "false"], [44, "false"]], "Product holds the current page (Pricing)");
    await live.page.locator(".site-footer-toggle").nth(1).click();
    assert.equal(await live.page.locator(".site-footer-toggle").nth(1).getAttribute("aria-expanded"), "true");
    assert.equal(await live.page.locator("footer nav").count(), 1, "one nav");
    await live.context.close();
  });

  test("the narrow menu draws the bar's tools again, in its first row, before Close", async () => {
    const body = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Sample home"><b>Sample</b></a><nav class="topbar-links" aria-label="Primary"><a href="/a" aria-current="page">A</a></nav><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-tool aria-label="Search"><span data-glyph="plus"></span></button></div></header>`;
    const { page, context } = await openHtml(browser, compose(`<title>Bar</title>${body}`, { fonts: false }).html, { scheme: "dark", width: 390 });
    await page.getByRole("button", { name: "Menu" }).click();
    const band = await page.locator(".topbar-menu .sheet-band button").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    assert.deepEqual(band, ["Search", "Close menu"]);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label")), "Close menu");
    await context.close();
  });
});

describe("one navigation landmark and one brand link are exposed in every phase (return 1)", () => {
  // The skill builds the narrow menu from the bar's markup: a closed <dialog> holding a second brand link and a second nav. It is in the DOM (the round's readout counts the DOM, so it said
  // "2 nav, 2 brand"), and not rendered, so it is out of the accessibility tree and out of the tab order until the menu opens.
  const LINKS = `<nav class="topbar-links" aria-label="Primary"><a href="#hero" aria-current="page">Start</a><a href="#t1">Guides</a><a href="#t2">Notes</a></nav>`;
  const PAGE = `<div class="site-slot"><header class="topbar" data-phase-after="#hero"><div class="topbar-inner"><a class="brand" href="/" aria-label="Sample home"><b>Sample</b></a>${LINKS}</div></header></div>
    <main><section id="hero" style="height: 600px"><a id="hero-link" href="#t1">Hero link</a></section><div style="height: 3000px">More</div></main>`;
  const exposed = async (page) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Accessibility.enable");
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    await cdp.detach();
    const shown = nodes.filter((n) => !n.ignored);
    return {
      navigation: shown.filter((n) => n.role?.value === "navigation" && n.name?.value === "Primary").length,
      brand: shown.filter((n) => n.role?.value === "link" && n.name?.value === "Sample home").length,
    };
  };
  for (const [y, expected] of [[0, "rest"], [300, "between"], [630, "pinned"]]) {
    test(`at ${expected}: one navigation and one brand link in the accessibility tree, the closed menu's copies out of it and out of the tab order`, async () => {
      const { page, context } = await openHtml(browser, compose(`<title>Phase</title>${PAGE}`, { fonts: false }).html, { scheme: "dark", width: 1440 });
      await page.waitForFunction(() => document.querySelector("header").hasAttribute("data-phase"));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForFunction((e) => document.querySelector("header").getAttribute("data-phase") === e, expected);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      // what the DOM holds: the bar's, and the closed menu's
      const dom = await page.evaluate(() => ({ navs: document.querySelectorAll("nav[aria-label=Primary]").length, brands: document.querySelectorAll(".brand").length, dialog: (() => { const d = document.querySelector("dialog.topbar-menu"); return d ? { open: d.open, display: getComputedStyle(d).display } : null; })() }));
      assert.deepEqual(dom, { navs: 2, brands: 2, dialog: { open: false, display: "none" } }, "the DOM counts two of each: the second is the closed dialog's");
      assert.deepEqual(await exposed(page), { navigation: 1, brand: 1 }, `exposed at ${expected}`);
      // the tab order: from the top, the brand once and each link once, and nothing inside the dialog
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.locator(".brand").first().evaluate((el) => el.focus({ preventScroll: true }));
      const walk = [await page.evaluate(() => document.activeElement.getAttribute("aria-label"))];
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press("Tab");
        walk.push(await page.evaluate(() => (document.activeElement.closest("dialog") ? "IN DIALOG: " : "") + (document.activeElement.getAttribute("aria-label") || document.activeElement.textContent.trim())));
      }
      assert.deepEqual(walk, ["Sample home", "Start", "Guides", "Notes"]);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.closest("dialog") === null), true, "the next stop is not in the dialog");
      // the check is not blind: draw the dialog's copies and the tree says two
      await page.evaluate(() => { const d = document.querySelector("dialog.topbar-menu"); d.style.display = "block"; });
      assert.deepEqual(await exposed(page), { navigation: 2, brand: 2 }, "a rendered copy would be exposed");
      await context.close();
    });
  }
});

describe("the app form of the theme choice, against React's ThemeMenu (return 2, B4)", () => {
  const REACT_MENU = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><B.ThemeMenu /></div>);`;
  const SKILL_MENU = `<div style="padding: 24px"><button class="btn" data-variant="ghost" data-icon-only data-theme-menu popovertarget="theme-menu" aria-label="Theme: System"></button>
    <div class="panel float menu" popover id="theme-menu" aria-label="Theme"><div role="group" aria-label="Theme">
      <button class="menu-item" role="menuitemradio" aria-checked="true" data-value="system"><span class="menu-item-label">System</span></button>
      <button class="menu-item" role="menuitemradio" aria-checked="false" data-value="light"><span class="menu-item-label">Light</span></button>
      <button class="menu-item" role="menuitemradio" aria-checked="false" data-value="dark"><span class="menu-item-label">Dark</span></button>
    </div></div></div>`;
  const open2 = async (theme) => {
    const react = await fixturePage(reactBrowser, REACT_MENU, { theme, colorScheme: theme, viewport: { width: 600, height: 400 } });
    const skill = await openHtml(browser, compose(`<title>Theme</title>${SKILL_MENU}`, { fonts: false }).html, { scheme: theme, width: 600 });
    return { react, skill };
  };
  const trigger = (p) => p.evaluate(() => {
    const b = document.querySelector("button[data-icon-only]");
    const s = getComputedStyle(b);
    return { name: b.getAttribute("aria-label"), glyph: [...b.querySelectorAll("path")].map((x) => x.getAttribute("d")).join("|"), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height, color: s.color, radius: s.borderTopLeftRadius };
  });
  const rows = (p) => p.evaluate(() => [...document.querySelectorAll("[role=menuitemradio]")].map((r) => [r.textContent, r.getAttribute("aria-checked"), Math.round(r.getBoundingClientRect().height), getComputedStyle(r).fontSize]));
  const closed = (p) => p.evaluate(() => document.querySelectorAll("[role=menuitemradio]").length === 0 || !document.querySelector("[role=menuitemradio]").closest(".menu, .basalt-menu")?.matches?.(":popover-open, [data-open]") && ![...document.querySelectorAll("[role=menuitemradio]")].some((r) => r.getBoundingClientRect().height > 0));

  for (const theme of THEMES) {
    test(`the trigger's name and glyph in each state, the open menu, the keys and the close on choosing match in ${theme}`, async () => {
      const { react, skill } = await open2(theme);
      assert.deepEqual(await trigger(skill.page), await trigger(react.page), "System, theme in use");
      assert.equal((await trigger(skill.page)).name, "Theme: System");
      for (const p of [react.page, skill.page]) await p.locator("button[data-icon-only]").click();
      for (const p of [react.page, skill.page]) await p.locator("[role=menuitemradio]").first().waitFor({ state: "visible" });
      for (const p of [react.page, skill.page]) await p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))));
      assert.deepEqual(await rows(skill.page), await rows(react.page));
      assert.deepEqual((await rows(react.page)).map((r) => [r[0], r[1]]), [["System", "true"], ["Light", "false"], ["Dark", "false"]], "the chosen one is marked");
      // keys: Down three times lights Dark, Enter chooses it and closes the menu
      for (const p of [react.page, skill.page]) { for (let i = 0; i < 3; i += 1) await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); }
      for (const p of [react.page, skill.page]) await p.waitForFunction(() => ![...document.querySelectorAll("[role=menuitemradio]")].some((r) => r.getBoundingClientRect().height > 0));
      assert.equal(await closed(react.page), true);
      assert.equal(await closed(skill.page), true);
      await react.page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
      const dark = await trigger(skill.page);
      assert.deepEqual(dark, await trigger(react.page), "Dark chosen");
      assert.equal(dark.name, "Theme: Dark");
      assert.equal(await skill.page.evaluate(() => localStorage.getItem("basalt-theme")), "dark");
      // choosing with a click closes it too, and Escape closes it with focus back on the trigger
      for (const p of [react.page, skill.page]) { await p.locator("button[data-icon-only]").click(); await p.locator("[role=menuitemradio]").first().waitFor({ state: "visible" }); }
      assert.deepEqual((await rows(skill.page)).map((r) => r[1]), ["false", "false", "true"]);
      for (const p of [react.page, skill.page]) { await p.keyboard.press("Escape"); await p.waitForFunction(() => ![...document.querySelectorAll("[role=menuitemradio]")].some((r) => r.getBoundingClientRect().height > 0)); }
      for (const p of [react.page, skill.page]) assert.equal(await p.evaluate(() => document.activeElement.hasAttribute("data-icon-only")), true, "focus is back on the trigger");
      for (const p of [react.page, skill.page]) { await p.locator("button[data-icon-only]").click(); await p.locator("[role=menuitemradio]").first().waitFor({ state: "visible" }); await p.getByRole("menuitemradio", { name: "System" }).click(); }
      for (const p of [react.page, skill.page]) await p.waitForFunction(() => ![...document.querySelectorAll("[role=menuitemradio]")].some((r) => r.getBoundingClientRect().height > 0));
      assert.equal(await skill.page.evaluate(() => localStorage.getItem("basalt-theme")), null, "System stores nothing");
      assert.equal((await trigger(skill.page)).name, "Theme: System");
      assert.deepEqual(react.errors, []);
      assert.deepEqual(skill.errors, []);
      await react.page.close();
      await skill.context.close();
    });
  }
});

describe("the site header has no theme control in the skill, and a toggle already in a bar still works (return 2, B1)", () => {
  test("the header's usage text teaches no theme toggle, and the loops toggle is first in the end cluster", () => {
    const usage = (name) => readFile(skillDir, "parts", "usage", `${name}.md`);
    for (const name of ["topbar", "topbar-nav"]) {
      const text = usage(name);
      const left = text.replace(/A `data-theme-toggle` left in a bar is drawn again too, for one release \(deprecated\)\./, "");
      assert.doesNotMatch(left, /data-theme-toggle|theme toggle/, `${name}'s text teaches no theme toggle`);
    }
    assert.match(usage("topbar-nav"), /deprecated/);
    assert.match(usage("loops"), /first in the end cluster, before any tools and the action/);
    assert.doesNotMatch(usage("loops"), /before the theme toggle/);
    assert.doesNotMatch(usage("app-shell"), /data-theme-toggle/);
    assert.match(usage("app-shell"), /data-theme-menu/);
    assert.match(usage("theme"), /deprecated/);
  });

  test("a bar written with data-theme-toggle keeps working: it toggles, is named for what a press does, and the narrow menu draws it again", async () => {
    const body = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Sample home"><b>Sample</b></a><nav class="topbar-links" aria-label="Primary"><a href="/a">A</a></nav><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>`;
    const { page, context } = await openHtml(browser, compose(`<title>Bar</title>${body}`, { fonts: false }).html, { scheme: "dark", width: 390 });
    assert.equal(await page.locator(".topbar-inner > [data-theme-toggle]").getAttribute("aria-label"), "Switch to light theme");
    await page.locator(".topbar-inner > [data-theme-toggle]").click();
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "light");
    assert.equal(await page.locator(".topbar-inner > [data-theme-toggle]").getAttribute("aria-label"), "Switch to dark theme");
    await page.getByRole("button", { name: "Menu" }).click();
    assert.equal(await page.locator(".topbar-menu [data-theme-toggle]").count(), 1, "the narrow menu draws it again");
    await context.close();
  });
});

describe("System follows the system, and a theme the page set itself survives (return 3)", () => {
  const CONTROL = `<div style="padding: 24px">${SKILL.match(/<div class="theme-choice">[\s\S]*?<\/div><\/div>/)[0]}</div>`;
  const frames2 = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const system = async (p, scheme) => { await p.emulateMedia({ colorScheme: scheme }); await frames2(p); };
  const theme = (p) => p.evaluate(() => [document.documentElement.getAttribute("data-theme"), document.documentElement.getAttribute("data-theme-choice")].join());
  const html = compose(`<title>Theme</title>${CONTROL}`, { fonts: false }).html;

  test("nothing stored and nothing set by hand: System follows the system, live", async () => {
    const { page, context } = await openHtml(browser, html, { scheme: "dark", width: 600 });
    assert.equal(await theme(page), "dark,system");
    await system(page, "light"); assert.equal(await theme(page), "light,system");
    await system(page, "dark"); assert.equal(await theme(page), "dark,system");
    await context.close();
  });

  test("a stored Light or Dark does not move when the system's scheme changes", async () => {
    for (const stored of ["light", "dark"]) {
      const { page, context } = await openHtml(browser, html, { scheme: "dark", width: 600 });
      await page.locator(`[data-value=${stored}]`).click();
      await system(page, "light"); await system(page, "dark");
      assert.equal(await theme(page), `${stored},${stored}`);
      await context.close();
    }
  });

  test("a data-theme the page set by hand, with nothing stored, survives the system's change; picking a choice hands it back", async () => {
    const { page, context } = await openHtml(browser, html, { scheme: "dark", width: 600 });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await system(page, "light"); await system(page, "dark");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "light", "the page's own light stands against the system's dark");
    // the reader picks System: the script writes again, and follows
    await page.locator("[data-value=dark]").click();
    await page.locator("[data-value=system]").click();
    assert.equal(await theme(page), "dark,system");
    await system(page, "light");
    assert.equal(await theme(page), "light,system", "System follows again");
    // a hand-set value equal to what the script last wrote is still the page's
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await system(page, "dark");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "light");
    // and the page taking its attribute off lets the script follow
    await page.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    await system(page, "light"); await system(page, "dark");
    assert.equal(await theme(page), "dark,system");
    await context.close();
  });

  test("a .dark or .light class root is the page's: the script writes nothing over it when the system changes", async () => {
    const second = await openHtml(browser, html, { scheme: "dark", width: 600 });
    await second.page.evaluate(() => document.documentElement.classList.add("dark"));
    await system(second.page, "light");
    assert.equal(await second.page.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark", "a .dark root: the script writes nothing over it");
    await second.context.close();
  });
});
