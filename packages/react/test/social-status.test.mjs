// Site icons and status dots in forced colours (DECISIONS 106 and 107), driven in Chromium against the built package with the real
// stylesheet. The council decided these; the implementation has not been reviewed. Behaviour tests load no web font, so measured margins
// are wider than a fallback font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { contrast, fixturePage, launch, pixels, settle, visibleAgainst } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const STATUSES = ["neutral", "success", "warning", "danger", "accent", "pending"];

const open = async (body, options = {}) => {
  const { page, errors } = await fixturePage(browser, body, options);
  await page.evaluate(() => {
    document.title = "Social and status"; document.documentElement.lang = "en";
    // a phone's layout viewport is the device's width only with a viewport meta, as a real page has
    const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta);
  });
  await page.addStyleTag({ content: "body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font: 14px/20px var(--basalt-font-family-sans); }" });
  await settle(page);
  return { page, errors };
};
const axeViolations = async (page, options = AXE) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), options);
};
const forcedAxe = (page) => axeViolations(page, { ...AXE, rules: { "color-contrast": { enabled: false } } });
/** The colour a CSS expression resolves to, as the browser computes it, as `rgb(...)`. */
const colourOf = (page, css) => page.evaluate((value) => { const probe = document.createElement("i"); probe.style.cssText = `forced-color-adjust: none; color: ${value}`; document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; }, css);
const rect = (page, selector, nth = 0) => page.locator(selector).nth(nth).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
const style = (page, selector, ...props) => page.locator(selector).first().evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);

const systemColours = (page) => page.evaluate(() => {
  const probe = document.createElement("div"); document.body.append(probe);
  const read = (v) => { probe.style.color = v; return getComputedStyle(probe).color; };
  const out = Object.fromEntries(["Highlight", "HighlightText", "Canvas", "CanvasText", "LinkText"].map((k) => [k, read(k)])); probe.remove(); return out;
});

// ---- Badge: no status is the word alone; neutral, by name, draws the tertiary dot; running draws none ----

const BADGES = `
const { Badge, Spinner } = B;
${render(`<div style={{ padding: 16, display: "grid", gap: 8, justifyItems: "start" }}>
  <Badge id="none">3 open</Badge>
  <Badge id="neutral" status="neutral">Idle</Badge>
  <Badge id="plain-none" variant="plain">Count</Badge>
  <Badge id="plain-neutral" variant="plain" status="neutral">Idle</Badge>
  <Badge id="running" variant="plain"><Spinner variant="braille" />Running</Badge>
  <Badge id="running-neutral" variant="plain" status="neutral"><Spinner variant="braille" />Running</Badge>
  <Badge id="edge" status="success">Ready</Badge>
</div>`)}`;

describe("Badge: no status, neutral by name, running", () => {
  for (const theme of THEMES) {
    test(`${theme}: with no status the word is alone; neutral asked for draws the tertiary dot; a running badge draws none`, async () => {
      const { page, errors } = await open(BADGES, { theme, ...DESKTOP });
      const dots = (id) => page.locator(`#${id} .basalt-badge-dot`).evaluateAll((els) => els.map((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { display: s.display, w: r.width, h: r.height, bg: s.backgroundColor, aria: el.getAttribute("aria-hidden") }; }));
      assert.deepEqual(await dots("none"), [], "no status: no dot");
      assert.equal(await page.locator("#none").getAttribute("data-status"), null, "and no status is claimed");
      assert.deepEqual(await dots("plain-none"), []);
      const tertiary = await colourOf(page, "var(--basalt-text-tertiary)");
      for (const id of ["neutral", "plain-neutral"]) {
        const [dot] = await dots(id);
        assert.deepEqual([dot.w, dot.h, dot.aria], [6, 6, "true"], `${id}: a 6px, aria-hidden dot`);
        assert.equal(dot.bg, tertiary, `${id}: the tertiary dot`);
      }
      assert.deepEqual(await dots("running"), [], "running: braille takes the dot's seat");
      assert.deepEqual((await dots("running-neutral")).map((d) => d.display), ["none"], "even a neutral status draws no dot beside braille");
      assert.deepEqual(errors, []);
      await page.close();
    });

    test(`${theme}: the edge is a real 1px border and the box is the size it was (0px change)`, async () => {
      const { page } = await open(BADGES, { theme, ...DESKTOP });
      const s = await style(page, "#edge", "boxSizing", "borderTopWidth", "borderTopStyle", "borderTopColor", "boxShadow", "paddingLeft", "paddingRight", "height");
      assert.deepEqual([s.boxSizing, s.borderTopWidth, s.borderTopStyle, s.boxShadow], ["border-box", "1px", "solid", "none"]);
      assert.equal(s.borderTopColor, await colourOf(page, "var(--basalt-border-hairline)"), "the edge's colour is the hairline it was");
      assert.deepEqual([s.paddingLeft, s.paddingRight], ["7px", "7px"], "the padding is reduced by the hairline");
      // width is the old content-box arithmetic: 2 x space-2 (8) + dot + gap + the word; height is size-badge
      const dims = await page.locator("#edge").evaluate((el) => {
        const text = [...el.childNodes].find((n) => n.nodeType === 3);
        const range = document.createRange(); range.selectNodeContents(text);
        const dot = el.querySelector(".basalt-badge-dot").getBoundingClientRect();
        return { width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, text: range.getBoundingClientRect().width, dot: dot.width, gap: Number.parseFloat(getComputedStyle(el).columnGap) };
      });
      assert.equal(dims.height, Number.parseFloat(await page.evaluate(() => { const p = document.createElement("i"); p.style.width = "var(--basalt-size-badge)"; document.body.append(p); const w = getComputedStyle(p).width; p.remove(); return w; })), "the height is size-badge");
      assert.ok(Math.abs(dims.width - (16 + dims.dot + dims.gap + dims.text)) < 0.01, `${dims.width} is 16 + ${dims.dot} + ${dims.gap} + ${dims.text}`);
      // and the hairline's pixels are where the shadow drew them: the box's outermost ring
      const ring = await pixels(page, { x: Math.floor((await rect(page, "#edge")).x), y: Math.floor((await rect(page, "#edge")).y) + 10, width: 3, height: 1 });
      const page0 = await pixels(page, { x: 2, y: 2, width: 1, height: 1 });
      assert.ok(contrast(ring[0], page0[0]) > 1.05, "the outermost column is the edge, not the padding");
      assert.ok(contrast(ring[1], page0[0]) < 1.05, "and the pixel inside it is the badge's own surface");
      await page.close();
    });
  }
});

// ---- Forced colours: every dot, the ring and the edge, on Canvas and on a lit row ----

const ALL = (id, variant) => STATUSES.map((s) => `<Badge key="${s}" id="${id}-${s}" status="${s}"${variant ? ` variant="${variant}"` : ""}>${s}</Badge>`).join("");
const GRID = `
const { Badge, Spinner } = B;
${render(`<div style={{ padding: 16, display: "grid", gap: 10, justifyItems: "start" }}>
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>${ALL("o")}</div>
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>${ALL("p", "plain")}<Badge id="run" variant="plain"><Spinner variant="braille" />running</Badge></div>
</div>`)}`;

describe("forced colours on Canvas: no dot, ring or edge names a system colour, and every one shows", () => {
  for (const scheme of THEMES) {
    test(`${scheme} palette: every status dot is a disc in CanvasText, pending a 1px ring, the edge a 1px border; braille is unchanged`, async () => {
      const { page, errors } = await open(GRID, { theme: scheme, colorScheme: scheme, ...DESKTOP });
      await page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await settle(page);
      const c = await systemColours(page);
      for (const prefix of ["o", "p"]) {
        for (const status of STATUSES) {
          const id = `#${prefix}-${status}`;
          const dot = await style(page, `${id} .basalt-badge-dot`, "boxSizing", "borderTopWidth", "borderTopStyle", "borderTopColor", "backgroundColor", "backgroundImage", "forcedColorAdjust", "width");
          const ring = status === "pending";
          assert.deepEqual([dot.boxSizing, dot.borderTopWidth, dot.borderTopStyle, dot.width], ["border-box", ring ? "1px" : "3px", "solid", "6px"], `${id}: ${ring ? "the ring is a 1px border" : "a disc: a border of half its size"}`);
          assert.equal(dot.borderTopColor, c.CanvasText, `${id}: the system text colour, with no colour named`);
          assert.match(dot.backgroundColor, /, 0\)$|^rgba\(0, 0, 0, 0\)$/, `${id}: no fill`);
          assert.notEqual(dot.forcedColorAdjust, "none", `${id}: forced colours are left on`);
          assert.ok((await visibleAgainst(page, page.locator(`${id} .basalt-badge-dot`).first())) >= 3, `${id}: the mark shows on Canvas`);
        }
      }
      for (const status of STATUSES) {
        const edge = await style(page, `#o-${status}`, "borderTopWidth", "borderTopStyle", "borderTopColor");
        assert.deepEqual(edge, { borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: c.CanvasText }, `the edge of ${status}`);
      }
      // the whole disc is one solid colour, and is the 6px circle
      const centre = await rect(page, "#o-success .basalt-badge-dot");
      const mid = (await pixels(page, { x: Math.round(centre.x + 2), y: Math.round(centre.y + 2), width: 2, height: 2 }))[0];
      assert.ok(contrast(mid, [255, 255, 255]) < 1.5 || contrast(mid, [0, 0, 0]) < 1.5, "the middle of the disc is the system text colour");
      // braille is currentColor, left to the browser: it follows the word's colour and keeps its cells
      const braille = await page.locator("#run .basalt-spinner-dot").evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));
      assert.ok(braille.length === 6 && braille.every((f) => f === c.CanvasText), `braille's dots follow the text colour: ${braille}`);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
});

const LIT = (items) => `
const { Badge, Menu, MenuTrigger, MenuContent, MenuItem } = B;
${render(`<Menu defaultOpen><MenuTrigger>Menu</MenuTrigger><MenuContent>${items}</MenuContent></Menu>`)}`;
const litRows = STATUSES.map((s) => `<MenuItem key="${s}"><Badge variant="plain" status="${s}">${s}</Badge></MenuItem>`).join("") + `<MenuItem><Badge status="success">edge</Badge></MenuItem>`;

describe("forced colours on a lit row: the dot follows HighlightText", () => {
  for (const scheme of THEMES) {
    test(`${scheme} palette: the lit Menu row's badge, dot, ring and edge are HighlightText on the plate`, async () => {
      const { page, errors } = await open(LIT(litRows), { theme: scheme, ...DESKTOP });
      await page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await settle(page);
      const c = await systemColours(page);
      const rows = page.locator(".basalt-menu-item");
      for (let n = 0; n < STATUSES.length + 1; n += 1) {
        await rows.nth(n).hover();
        await page.waitForFunction((i) => document.querySelectorAll(".basalt-menu-item")[i]?.hasAttribute("data-highlighted"), n);
        await settle(page);
        const row = rows.nth(n);
        const badge = n < STATUSES.length ? "variant=plain" : "edge";
        const word = await row.locator(".basalt-badge").evaluate((el) => getComputedStyle(el).color);
        assert.equal(word, c.HighlightText, `row ${n} (${badge}): the word`);
        const dot = await row.locator(".basalt-badge-dot").evaluate((el) => { const s = getComputedStyle(el); return { colour: s.borderTopColor, width: s.borderTopWidth }; });
        assert.equal(dot.colour, c.HighlightText, `row ${n}: the dot is HighlightText, not a named CanvasText`);
        assert.ok((await visibleAgainst(page, row.locator(".basalt-badge-dot"))) >= 3, `row ${n}: the dot shows on the lit plate`);
        if (n === STATUSES.length) {
          assert.equal((await row.locator(".basalt-badge").evaluate((el) => getComputedStyle(el).borderTopColor)), c.HighlightText, "the badge's edge is HighlightText");
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("out of forced colours nothing changes: the lit row's badge keeps its own ink and dot", async () => {
    const { page } = await open(LIT(litRows), { theme: "dark", ...DESKTOP });
    await page.locator(".basalt-menu-item").nth(1).hover();
    await settle(page);
    const dot = await page.locator(".basalt-menu-item").nth(1).locator(".basalt-badge-dot").evaluate((el) => { const s = getComputedStyle(el); return { backgroundColor: s.backgroundColor, borderTopWidth: s.borderTopWidth }; });
    assert.equal(dot.backgroundColor, await colourOf(page, "var(--basalt-status-success)"));
    assert.equal(dot.borderTopWidth, "0px");
    await page.close();
  });
});

// ---- The same defect outside status ----

const DOTS = `
const { Nav, NavItem, Menu, MenuTrigger, MenuContent, MenuRadioGroup, MenuRadioItem, HomeGlyph } = B;
${render(`<div style={{ padding: 16, display: "flex", gap: 24, alignItems: "start" }}>
  <Nav aria-label="Main" style={{ width: 220 }}><NavItem href="#a" icon={HomeGlyph} dot="New activity">Activity</NavItem><NavItem href="#b" icon={HomeGlyph}>Other</NavItem></Nav>
  <Menu defaultOpen><MenuTrigger>Sort</MenuTrigger><MenuContent><MenuRadioGroup defaultValue="b"><MenuRadioItem value="a">Name</MenuRadioItem><MenuRadioItem value="b">Date</MenuRadioItem></MenuRadioGroup></MenuContent></Menu>
</div>`)}`;

describe("the nav dot and the checked radio's dot", () => {
  for (const scheme of THEMES) {
    test(`${scheme}: in forced colours each is a border disc in the system colour of where it sits, unlit, and is a fill otherwise`, async () => {
      const { page } = await open(DOTS, { theme: scheme, ...DESKTOP });
      await page.locator(".basalt-menu-radio-dot").waitFor();
      // as authored: a fill
      for (const sel of [".basalt-nav-dot", ".basalt-menu-radio-dot"]) {
        const s = await style(page, sel, "backgroundColor", "borderTopWidth");
        assert.notEqual(s.backgroundColor, "rgba(0, 0, 0, 0)", sel);
        assert.equal(s.borderTopWidth, "0px", sel);
      }
      await page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await settle(page);
      const c = await systemColours(page);
      // each takes the system colour of where it sits: a nav item is a link (LinkText), a menu row is text on Canvas (CanvasText)
      for (const [sel, size, ink] of [[".basalt-nav-dot", 6, c.LinkText], [".basalt-menu-radio-dot", 6, c.CanvasText]]) {
        const s = await style(page, sel, "boxSizing", "borderTopWidth", "borderTopStyle", "borderTopColor", "backgroundColor", "width");
        assert.deepEqual([s.boxSizing, s.borderTopWidth, s.borderTopStyle, s.borderTopColor, s.width], ["border-box", `${size / 2}px`, "solid", ink, `${size}px`], sel);
        assert.match(s.backgroundColor, /, 0\)$/, `${sel}: no fill`);
        assert.ok((await visibleAgainst(page, page.locator(sel).first())) >= 3, `${sel} shows on Canvas`);
      }
      await page.close();
    });
  }
});

describe("the notification centre's unread dot", () => {
  test("in forced colours it is a border disc and follows a hovered entry's HighlightText with no override", async () => {
    const entries = `const entries = [{ id: "1", title: "Deploy finished", time: "2m ago", status: "success", unread: true }, { id: "2", title: "Build queued", time: "9m ago" }];`;
    const { page } = await open(`${entries} ${render(`<div style={{ padding: 24, display: "flex", justifyContent: "flex-end" }}><B.NotificationCentre entries={entries} defaultOpen /></div>`)}`, { theme: "dark", ...DESKTOP });
    await page.emulateMedia({ forcedColors: "active", colorScheme: "dark" });
    await page.waitForSelector(".basalt-notification");
    await settle(page);
    const c = await systemColours(page);
    const dot = async () => style(page, ".basalt-notification[data-unread] .basalt-notification-dot", "boxSizing", "borderTopWidth", "borderTopColor", "backgroundColor");
    const rest = await dot();
    assert.deepEqual([rest.boxSizing, rest.borderTopWidth, rest.borderTopColor], ["border-box", "3px", c.CanvasText]);
    assert.match(rest.backgroundColor, /, 0\)$/);
    assert.ok((await visibleAgainst(page, page.locator(".basalt-notification[data-unread] .basalt-notification-dot"))) >= 3, "shows on Canvas");
    await page.locator(".basalt-notification").first().hover();
    await settle(page);
    assert.equal((await dot()).borderTopColor, c.HighlightText, "a hovered entry is Highlight, and the dot follows with no override of its own");
    // The bell's dot is its ::before since #105 (a pressed Button's ::after is its hit-box extension).
    const trigger = await page.evaluate(() => { const t = document.querySelector(".basalt-notifications-trigger"); const s = getComputedStyle(t, "::before"); return [s.borderTopWidth, s.backgroundColor, s.boxSizing]; });
    assert.deepEqual([trigger[0], trigger[2]], ["3px", "border-box"], "the bell's dot is the same disc");
    await page.close();
  });
});

// ---- Social links ----

const SOCIAL = (size = 16, text = 13) => `
const { SocialLinks, SocialLink } = B;
${render(`<div style={{ padding: 16, fontSize: ${text}, lineHeight: "${text + 5}px", width: "var(--w, 800px)" }}>
  <SocialLinks id="row" aria-label="Elsewhere" size={${size}}>
    <SocialLink id="gh" service="github" href="https://example.test/gh">GitHub</SocialLink>
    <SocialLink id="x" service="x" href="https://example.test/x" target="_blank">X</SocialLink>
    <SocialLink id="li" service="linkedin" href="https://example.test/li">LinkedIn</SocialLink>
    <SocialLink id="ig" service="instagram" href="https://example.test/ig">Instagram</SocialLink>
    <SocialLink id="yt" service="youtube" href="https://example.test/yt">YouTube</SocialLink>
    <SocialLink id="mail" service="email" href="mailto:name@example.test">Email</SocialLink>
    <SocialLink id="sub" href="https://example.test/sub">Substack</SocialLink>
    <SocialLink id="sky" href="https://example.test/sky" target="_blank">Bluesky</SocialLink>
  </SocialLinks>
</div>`)}`;

describe("a social link: the glyph, the name, the ink and the underline", () => {
  for (const theme of THEMES) {
    test(`${theme}: glyph before the name, space-1-5 apart, 16 beside 13px text; links 16px apart; the name underlined in border-input, the glyph never`, async () => {
      const { page, errors } = await open(SOCIAL(16, 13), { theme, ...DESKTOP });
      const gh = await page.locator("#gh").evaluate((a) => {
        const svg = a.querySelector("svg").getBoundingClientRect(); const name = a.querySelector(".basalt-social-name"); const n = name.getBoundingClientRect();
        const s = getComputedStyle(a); const ns = getComputedStyle(name);
        return { svgW: svg.width, svgH: svg.height, gap: n.x - svg.right, display: s.display, aLine: s.textDecorationLine, nLine: ns.textDecorationLine, nColour: ns.textDecorationColor, nThick: ns.textDecorationThickness, offset: ns.textUnderlineOffset, svgDeco: getComputedStyle(a.querySelector("svg")).textDecorationLine, ink: s.color, svgInk: getComputedStyle(a.querySelector("svg")).color, nameInk: ns.color, radius: s.borderTopLeftRadius, weight: ns.fontWeight, transform: s.transform };
      });
      assert.deepEqual([gh.svgW, gh.svgH, gh.gap], [16, 16, 6], "the glyph is 16, space-1-5 before the name");
      assert.equal(gh.aLine, "none", "the link is not underlined as a whole");
      assert.deepEqual([gh.nLine, gh.nColour, gh.nThick, gh.offset], ["underline", await colourOf(page, "var(--basalt-border-input)"), "1px", "3px"], "the name is underlined in border-input");
      assert.equal(gh.svgDeco, "none", "the glyph is never underlined");
      const secondary = await colourOf(page, "var(--basalt-text-secondary)");
      assert.deepEqual([gh.ink, gh.svgInk, gh.nameInk], [secondary, secondary, secondary], "glyph and name are secondary at rest");
      assert.equal(gh.radius, "6px", "the ring follows radius-sm");
      // links sit space-4 apart
      const boxes = await page.locator("#row .basalt-social-link").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.right, r.y]; }));
      for (let i = 1; i < boxes.length; i += 1) assert.equal(Math.round((boxes[i][0] - boxes[i - 1][1]) * 100) / 100, 16, `link ${i} is 16px after link ${i - 1}`);
      assert.deepEqual(errors, []);
      await page.close();
    });

    test(`${theme}: hover and focus lift both to primary, brighten the underline on hover, show the control ring, and change no weight or scale`, async () => {
      const { page } = await open(SOCIAL(16, 13), { theme, ...DESKTOP });
      await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), true));
      const read = () => page.locator("#li").evaluate((a) => {
        const ns = getComputedStyle(a.querySelector(".basalt-social-name")); const s = getComputedStyle(a);
        return { ink: s.color, svgInk: getComputedStyle(a.querySelector("svg")).color, line: ns.textDecorationColor, weight: ns.fontWeight, transform: s.transform, outline: [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor], bg: s.backgroundColor, w: a.getBoundingClientRect().width };
      });
      const rest = await read();
      const primary = await colourOf(page, "var(--basalt-text-primary)");
      await page.locator("#li").hover();
      await settle(page);
      const hover = await read();
      assert.deepEqual([hover.ink, hover.svgInk], [primary, primary], "hover: glyph and name are primary");
      assert.equal(hover.line, primary, "the underline brightens to currentColor");
      assert.deepEqual([hover.weight, hover.bg, hover.w], [rest.weight, rest.bg, rest.w], "no weight change, no wash, no shift");
      await page.mouse.down();
      await settle(page);
      assert.equal((await read()).transform, "none", "no press scale on a link");
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await settle(page);
      await page.keyboard.press("Tab");
      await page.locator("#gh").focus();
      await page.keyboard.press("Tab");
      await page.waitForFunction(() => document.activeElement?.id === "x");
      await settle(page);
      const focused = await page.locator("#x").evaluate((a) => { const s = getComputedStyle(a); return { ink: s.color, svgInk: getComputedStyle(a.querySelector("svg")).color, outline: [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor] }; });
      assert.deepEqual([focused.ink, focused.svgInk], [primary, primary], "focus lifts the ink as well as showing the ring");
      assert.deepEqual(focused.outline, ["solid", "2px", "2px", await colourOf(page, "var(--basalt-border-focus)")], "the control ring at +2");
      await page.close();
    });

    test(`${theme}: the arrow only for target=_blank, none on mailto, the phrase in the name, same tab by default, a name alone for a service without a mark`, async () => {
      const { page } = await open(SOCIAL(16, 13), { theme, ...DESKTOP });
      const state = (id) => page.locator(id).evaluate((a) => ({ arrow: a.querySelectorAll(".basalt-external").length, svgs: a.querySelectorAll("svg").length, target: a.getAttribute("target"), rel: a.getAttribute("rel"), name: a.textContent.replace(/\u2060/g, "").trim(), left: a.getBoundingClientRect().x, nameLeft: a.querySelector(".basalt-social-name").getBoundingClientRect().x, arrowUnderline: a.querySelector(".basalt-external") ? getComputedStyle(a.querySelector(".basalt-external")).textDecorationLine : null }));
      const x = await state("#x");
      assert.deepEqual([x.arrow, x.svgs, x.target, x.rel], [1, 2, "_blank", "noopener noreferrer"], "the arrow, after the name");
      assert.equal(x.name, "X (opens in a new tab)", "the phrase is in the name");
      assert.equal(x.arrowUnderline, "none", "the arrow is never underlined");
      const gh = await state("#gh");
      assert.deepEqual([gh.arrow, gh.target, gh.name], [0, null, "GitHub"], "same tab by default; the visible name is the name");
      assert.equal((await state("#mail")).arrow, 0, "none on mailto:");
      assert.equal(await page.getByRole("link", { name: "GitHub" }).count(), 1);
      assert.equal(await page.getByRole("link", { name: "X (opens in a new tab)" }).count(), 1);
      // a service without a mark: the word alone, no glyph and no empty seat
      const sub = await state("#sub");
      assert.deepEqual([sub.svgs, sub.left === sub.nameLeft], [0, true], "Substack: no glyph, no seat");
      const sky = await state("#sky");
      assert.deepEqual([sky.svgs, sky.arrow, sky.left === sky.nameLeft], [1, 1, true], "Bluesky in a new tab: the arrow is the only glyph, and no seat before the name");
      await page.close();
    });
  }

  test("beside 18px text the glyph is 20, and the link takes its container's size", async () => {
    const { page } = await open(SOCIAL(20, 18), { theme: "light", ...DESKTOP });
    assert.deepEqual(await page.locator("#gh svg").evaluate((s) => [s.getBoundingClientRect().width, s.getBoundingClientRect().height]), [20, 20]);
    assert.equal(await page.locator("#gh").evaluate((a) => getComputedStyle(a).fontSize), "18px");
    assert.equal(await page.locator("#x .basalt-external svg").evaluate((s) => s.getBoundingClientRect().width), 16, "the new-tab arrow keeps its own rule");
    await page.close();
  });

  test("in forced colours every link is LinkText, glyph and arrow included", async () => {
    for (const scheme of THEMES) {
      const { page } = await open(SOCIAL(16, 13), { theme: scheme, ...DESKTOP });
      await page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await settle(page);
      const c = await systemColours(page);
      const inks = await page.locator("#x").evaluate((a) => ({ a: getComputedStyle(a).color, glyph: getComputedStyle(a.querySelector("svg")).color, name: getComputedStyle(a.querySelector(".basalt-social-name")).color, arrow: getComputedStyle(a.querySelector(".basalt-external")).color, arrowSvg: getComputedStyle(a.querySelector(".basalt-external svg")).color }));
      assert.deepEqual(Object.values(inks), Array(5).fill(c.LinkText), `${scheme}: ${JSON.stringify(inks)}`);
      assert.deepEqual(await forcedAxe(page), []);
      await page.close();
    }
  });

  test("axe is clean in both themes", async () => {
    for (const theme of THEMES) {
      const { page } = await open(SOCIAL(16, 13), { theme, ...DESKTOP });
      assert.deepEqual(await axeViolations(page), [], theme);
      await page.close();
    }
  });
});

describe("a row of social links on touch", () => {
  for (const theme of THEMES) {
    test(`${theme}: each link is at least 44 by 44 as real layout, the 16px gap is 8px of hit area either side, and wrapped lines touch without overlapping`, async () => {
      const { page } = await open(SOCIAL(16, 13).replace('"var(--w, 800px)"', '300'), { theme, ...PHONE });
      const boxes = await page.locator("#row .basalt-social-link").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height, margin: s.marginBlockStart + " " + s.marginBlockEnd, pad: s.paddingInlineStart, glyph: el.querySelector("svg")?.getBoundingClientRect().x }; }));
      assert.ok(boxes.every((b) => b.w >= 44 && b.h >= 44), `every link is at least 44 by 44: ${boxes.map((b) => `${b.w}x${b.h}`)}`);
      assert.ok(boxes.every((b) => b.margin === "0px 0px"), "the page's coarse-pointer negative margin is cancelled");
      const rows = new Set(boxes.map((b) => b.y));
      assert.ok(rows.size > 1, "the row wraps at 300px");
      for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]; const b = boxes[j];
        const overlap = a.x < b.right - 0.01 && b.x < a.right - 0.01 && a.y < b.bottom - 0.01 && b.y < a.bottom - 0.01;
        assert.equal(overlap, false, `links ${i} and ${j} overlap`);
      }
      const first = boxes[0];
      assert.equal(first.pad, "8px");
      assert.equal(first.glyph, 16, "the first glyph stays on the content edge (the page's 16px padding)");
      // neighbours on one row touch
      const sameRow = boxes.filter((b) => b.y === boxes[0].y);
      for (let i = 1; i < sameRow.length; i += 1) assert.ok(Math.abs(sameRow[i].x - sameRow[i - 1].right) < 0.01, "neighbours touch");
      // lines stack with no gap
      const lines = [...rows].sort((a, b) => a - b);
      for (let i = 1; i < lines.length; i += 1) assert.ok(lines[i] - lines[i - 1] >= 44 - 0.01 && lines[i] - lines[i - 1] < 45, `line ${i} follows line ${i - 1} at 44px`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 390), true, "nothing scrolls sideways");
      await page.close();
    });
  }
});

describe("icon only: a row made entirely of marks", () => {
  const ICONS = `
const { SocialLinks, SocialLink } = B;
${render(`<div style={{ padding: 16 }}><SocialLinks id="marks" iconOnly aria-label="Elsewhere">
  <SocialLink id="m-gh" service="github" href="https://example.test/gh">GitHub</SocialLink>
  <SocialLink id="m-x" service="x" href="https://example.test/x" target="_blank">X</SocialLink>
  <SocialLink id="m-li" service="linkedin" href="https://example.test/li">LinkedIn</SocialLink>
</SocialLinks></div>`)}`;

  test("ghost IconButtons rendered as links, 32px, space-1 apart, each named for its service, keeping the .98 press; a new-tab mark skips the arrow and keeps the phrase", async () => {
    const { page, errors } = await open(ICONS, { theme: "dark", ...DESKTOP });
    await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), true));
    const links = await page.locator("#marks a").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, variant: el.dataset.variant, w: r.width, h: r.height, x: r.x, right: r.right, label: el.getAttribute("aria-label"), href: el.getAttribute("href"), arrows: el.querySelectorAll(".basalt-external").length }; }));
    assert.deepEqual(links.map((l) => [l.tag, l.variant, l.w, l.h]), [["A", "ghost", 32, 32], ["A", "ghost", 32, 32], ["A", "ghost", 32, 32]]);
    assert.deepEqual(links.map((l) => l.label), ["GitHub", "X (opens in a new tab)", "LinkedIn"]);
    assert.deepEqual(links.map((l) => l.arrows), [0, 0, 0], "no arrow on an icon");
    assert.equal(Math.round((links[1].x - links[0].right) * 100) / 100, 4, "space-1 apart");
    assert.ok(links.every((l) => l.href), "real links");
    const target = page.locator("#marks a").first();
    const b = await target.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await settle(page);
    const press = await target.evaluate((el) => getComputedStyle(el).transform);
    assert.equal(press, "matrix(0.98, 0, 0, 0.98, 0, 0)", "IconButton's .98 press");
    await page.mouse.up();
    assert.deepEqual(errors, []);
    assert.deepEqual(await axeViolations(page), []);
    await page.close();
  });

  test("on touch each mark is 44 by 44", async () => {
    const { page } = await open(ICONS, { theme: "light", ...PHONE });
    const sizes = await page.locator("#marks a").evaluateAll((els) => els.map((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height]));
    assert.deepEqual(sizes, Array(3).fill([44, 44]));
    await page.close();
  });
});

// ---- The long form ----

const PROFILE = (second) => `
const { ProfileLinks, ProfileLink } = B;
${render(`<div style={{ padding: 16, width: 420 }}><ProfileLinks id="list" aria-label="Profiles">
  <ProfileLink id="p-gh" service="github" handle="@placeholder" href="https://example.test/gh">GitHub</ProfileLink>
  <ProfileLink id="p-x" service="x" handle="@placeholder" href="https://example.test/x" target="_blank">X</ProfileLink>
  <ProfileLink id="p-mail" service="email" handle="name@example.test" href="mailto:name@example.test">Email</ProfileLink>
  ${second}
</ProfileLinks></div>`)}`;
const WITHOUT = `<ProfileLink id="p-sub" handle="placeholder.substack.com" href="https://example.test/sub">Substack</ProfileLink><ProfileLink id="p-sky" handle="@placeholder.bsky.social" href="https://example.test/sky">Bluesky</ProfileLink>`;

describe("the long form: a profile list", () => {
  for (const theme of THEMES) {
    test(`${theme}: the glyph in the row's seat and the handle as the hint; a service without a mark keeps an empty seat, so every name is at one x`, async () => {
      const { page, errors } = await open(PROFILE(WITHOUT), { theme, ...DESKTOP });
      const names = await page.locator(".basalt-profile-name").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
      assert.equal(new Set(names).size, 1, `every name starts at one x: ${names}`);
      const list = await rect(page, "#list");
      assert.equal(names[0] - list.x, 6 + 12 + 16 + 12, "the list's padding, the row's padding, the 16px seat and the row's gap");
      // the seat is empty: nothing in the row before the name for the two without a mark
      assert.deepEqual(await page.locator("#p-sub, #p-sky").evaluateAll((els) => els.map((a) => [a.querySelectorAll("svg").length, a.children.length])), [[0, 2], [0, 2]], "only the name and the hint: the seat is padding, never an element");
      // a row's glyph is in the seat: 16, and the gap to the name is space-3
      const gh = await page.locator("#p-gh").evaluate((a) => { const g = a.querySelector("svg").getBoundingClientRect(); const n = a.querySelector(".basalt-profile-name").getBoundingClientRect(); return { w: g.width, gap: n.x - g.right, h: a.getBoundingClientRect().height }; });
      assert.deepEqual([gh.w, gh.gap, gh.h], [16, 12, 44]);
      // the handle is the hint: tertiary, 12px, after the name
      const hint = await style(page, "#p-gh .basalt-profile-handle", "color", "fontSize");
      assert.deepEqual(hint, { color: await colourOf(page, "var(--basalt-text-tertiary)"), fontSize: "12px" });
      // a row is a link: secondary at rest, primary on hover, the control ring at +2 on focus
      const ink = (sel) => page.locator(sel).evaluate((a) => getComputedStyle(a).color);
      assert.equal(await ink("#p-gh"), await colourOf(page, "var(--basalt-text-secondary)"));
      await page.locator("#p-gh").hover();
      await settle(page);
      assert.equal(await ink("#p-gh"), await colourOf(page, "var(--basalt-text-primary)"));
      await page.locator("#p-x").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const ring = await page.locator("#p-x").evaluate((a) => { const s = getComputedStyle(a); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
      assert.deepEqual(ring, ["solid", "2px", "2px"]);
      // the arrow goes after the name inside the label, only for the new tab
      assert.deepEqual(await page.locator("#p-gh, #p-x, #p-mail").evaluateAll((els) => els.map((a) => a.querySelectorAll(".basalt-external").length)), [0, 1, 0]);
      assert.deepEqual(errors, []);
      assert.deepEqual(await axeViolations(page), []);
      await page.close();
    });

    test(`${theme}: with no glyph in the list there is no seat, and in RTL the seat is on the start side`, async () => {
      const none = PROFILE("").replace(/ service="[a-z]+"/g, "");
      const { page } = await open(none, { theme, ...DESKTOP });
      const x = await page.locator(".basalt-profile-name").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
      const list = await rect(page, "#list");
      assert.deepEqual([...new Set(x)], [list.x + 6 + 12], "no glyph anywhere: the seat is not there");
      await page.close();
      const rtl = await open(PROFILE(WITHOUT), { theme, ...DESKTOP });
      await rtl.page.evaluate(() => { document.documentElement.dir = "rtl"; });
      await settle(rtl.page);
      const right = await rtl.page.locator(".basalt-profile-name").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().right * 100) / 100));
      assert.equal(new Set(right).size, 1, `in RTL every name ends at one x: ${right}`);
      await rtl.page.close();
    });
  }
});
