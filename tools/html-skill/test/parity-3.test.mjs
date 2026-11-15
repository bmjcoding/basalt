// The third parity PR (part A of batch 7: DECISIONS 106 and 107), in a browser: the status family in forced colours, on Canvas and on a lit row,
// beside React's Badge; the links module (the social row, the new-tab arrow, icon only and the long form); and the print bar. parity.test.mjs
// compares the status family's computed styles with React's in every status; this file pins what it can't read that way. Behaviour tests load
// no web font, so measured margins are wider than a fallback font's width.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { contrast, fixturePage, launch as launchReact, pixels, settle, visibleAgainst } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const STATUSES = ["neutral", "success", "warning", "danger", "accent", "pending"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const html = (body) => compose(`<title>t</title>${body}`, { fonts: false }).html;
const open = (body, options) => openHtml(browser, html(body), options);
const axeViolations = async (page, options = AXE) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), options);
};
const forcedAxe = (page) => axeViolations(page, { ...AXE, rules: { "color-contrast": { enabled: false } } });
const resolve = (page, value, prop = "color") => page.evaluate(([v, p]) => { const probe = document.createElement("div"); probe.style.setProperty(p, v); document.body.append(probe); const out = getComputedStyle(probe).getPropertyValue(p); probe.remove(); return out; }, [value, prop]);
const systemColours = (page) => page.evaluate(() => {
  const probe = document.createElement("div"); document.body.append(probe);
  const read = (v) => { probe.style.color = v; return getComputedStyle(probe).color; };
  const out = Object.fromEntries(["Highlight", "HighlightText", "Canvas", "CanvasText", "LinkText"].map((k) => [k, read(k)])); probe.remove(); return out;
});

// ---- The status family in forced colours, beside React ----

/** What a status mark is drawn as, from the element (React's dot) or the pseudo-element (the skill's ::before), and its word and edge. */
const marks = (page, { pseudo }) => page.evaluate((usePseudo) => {
  const out = {};
  for (const el of document.querySelectorAll("[data-case]")) {
    const dot = usePseudo ? getComputedStyle(el, "::before") : el.querySelector(".basalt-badge-dot") && getComputedStyle(el.querySelector(".basalt-badge-dot"));
    const own = getComputedStyle(el);
    out[el.dataset.case] = {
      word: own.color,
      edge: [own.borderTopWidth, own.borderTopStyle, own.borderTopColor, own.boxShadow],
      dot: dot && !(usePseudo && dot.content === "none") ? [dot.boxSizing, dot.borderTopWidth, dot.borderTopStyle, dot.borderTopColor, dot.backgroundColor, dot.width, dot.height, dot.borderTopLeftRadius] : null,
    };
  }
  return out;
}, pseudo);

const reactGrid = `
const { Badge, Spinner } = B;
createRoot(document.getElementById("root")).render(<div style={{ padding: 16, display: "grid", gap: 10, justifyItems: "start" }}>
  ${STATUSES.map((s) => `<Badge data-case="o-${s}" status="${s}">${s}</Badge>`).join("")}
  ${STATUSES.map((s) => `<Badge data-case="p-${s}" variant="plain" status="${s}">${s}</Badge>`).join("")}
  <Badge data-case="o-none">none</Badge><Badge data-case="p-none" variant="plain">none</Badge>
  <Badge data-case="p-running" variant="plain"><Spinner variant="braille" />running</Badge>
</div>);`;
const skillGrid = `<div style="padding:16px;display:grid;gap:10px;justify-items:start">
  ${STATUSES.map((s) => `<span class="badge" data-status="${s}" data-case="o-${s}">${s}</span>`).join("")}
  ${STATUSES.map((s) => `<span class="status" data-status="${s}" data-case="p-${s}">${s}</span>`).join("")}
  <span class="badge" data-case="o-none">none</span><span class="status" data-case="p-none">none</span>
  <span class="status" data-case="p-running"><braille-spinner></braille-spinner>running</span>
</div>`;

describe("the status family in forced colours: the skill draws what React draws, on Canvas", () => {
  for (const scheme of THEMES) {
    test(`${scheme} palette: every dot is a border disc, the ring a 1px border, the edge a real border; nothing names a system colour`, async () => {
      const react = await fixturePage(reactBrowser, reactGrid, { theme: scheme });
      await react.page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await settle(react.page);
      const skill = await open(skillGrid, { scheme });
      await skill.page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      const c = await systemColours(skill.page);
      const [fromReact, fromSkill] = [await marks(react.page, { pseudo: false }), await marks(skill.page, { pseudo: true })];
      for (const key of Object.keys(fromReact)) assert.deepEqual(fromSkill[key], fromReact[key], `${key}: the skill matches React`);
      for (const status of STATUSES) {
        const ring = status === "pending";
        const dot = [...fromSkill[`p-${status}`].dot];
        assert.match(dot[4], /, 0\)$/, `p-${status}: no fill`);
        dot[4] = null;
        assert.deepEqual(dot, ["border-box", ring ? "1px" : "3px", "solid", c.CanvasText, null, "6px", "6px", "9999px"], `p-${status}`);
        assert.equal(fromSkill[`o-${status}`].edge[2], c.CanvasText, `the badge's edge is the word's ink: ${status}`);
        assert.equal(fromSkill[`o-${status}`].edge[0], "1px");
      }
      assert.equal(fromSkill["o-none"].dot, null, "no status, no dot");
      assert.equal(fromSkill["p-running"].dot, null, "running draws no dot: braille takes its seat");
      // each mark shows on Canvas: the most contrast any pixel of it has against the page beside it
      for (const status of STATUSES) {
        const dot = await skill.page.evaluate((s) => { const el = document.querySelector(`[data-case="p-${s}"]`); const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + (r.height - 6) / 2 }; }, status);
        const own = await pixels(skill.page, { x: Math.floor(dot.x), y: Math.floor(dot.y), width: 6, height: 6 });
        const beside = (await pixels(skill.page, { x: 2, y: Math.floor(dot.y) + 3, width: 1, height: 1 }))[0];
        assert.ok(Math.max(...own.map((p) => contrast(p, beside))) >= 3, `the ${status} mark shows on Canvas`);
      }
      // braille is currentColor and left to the browser, as React's is
      const braille = await skill.page.locator('[data-case="p-running"] .braille-dot').evaluateAll((els) => els.map((el) => getComputedStyle(el).fill));
      assert.ok(braille.length === 6 && braille.every((f) => f === c.CanvasText), `braille follows the text colour: ${braille}`);
      assert.deepEqual(await forcedAxe(skill.page), []);
      await react.page.close();
      await skill.context.close();
    });
  }
});

const reactLit = `
const { Badge, Menu, MenuTrigger, MenuContent, MenuItem } = B;
createRoot(document.getElementById("root")).render(<Menu defaultOpen><MenuTrigger>Menu</MenuTrigger><MenuContent>
  ${STATUSES.map((s) => `<MenuItem key="${s}"><Badge variant="plain" status="${s}">${s}</Badge></MenuItem>`).join("")}<MenuItem><Badge status="success">edge</Badge></MenuItem></MenuContent></Menu>);`;
const skillLit = `<div class="panel float" style="width:320px"><div class="rows" role="listbox" aria-label="Rows">
  ${STATUSES.map((s) => `<div class="row" role="option" aria-selected="false"><span class="status" data-status="${s}">${s}</span></div>`).join("")}<div class="row" role="option" aria-selected="false"><span class="badge" data-status="success">edge</span></div></div></div>`;

describe("the status family on a lit row in forced colours: the dot follows HighlightText", () => {
  for (const scheme of THEMES) {
    test(`${scheme} palette: the lit row's word, dot, ring and edge are HighlightText on the plate, in React and the skill`, async () => {
      const react = await fixturePage(reactBrowser, reactLit, { theme: scheme });
      await react.page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      await settle(react.page);
      const skill = await open(skillLit, { scheme });
      await skill.page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      const c = await systemColours(skill.page);
      const rows = STATUSES.length + 1;
      for (let n = 0; n < rows; n += 1) {
        await react.page.locator(".basalt-menu-item").nth(n).hover();
        await react.page.waitForFunction((i) => document.querySelectorAll(".basalt-menu-item")[i]?.hasAttribute("data-highlighted"), n);
        await settle(react.page);
        await skill.page.evaluate((i) => document.querySelectorAll(".row").forEach((row, k) => row.setAttribute("aria-selected", String(k === i))), n);
        const read = (page, selector, pseudo) => page.locator(".basalt-menu-item, .row").nth(n).locator(selector).evaluate((el, ps) => {
          const own = getComputedStyle(el); const dot = ps ? getComputedStyle(el, "::before") : getComputedStyle(el.querySelector(".basalt-badge-dot"));
          return { word: own.color, edge: [own.borderTopWidth, own.borderTopColor], dot: [dot.boxSizing, dot.borderTopWidth, dot.borderTopStyle, dot.borderTopColor, dot.backgroundColor] };
        }, pseudo);
        const [r, s] = [await read(react.page, ".basalt-badge", false), await read(skill.page, ".status, .badge", true)];
        assert.deepEqual(s, r, `row ${n}: the skill matches React`);
        assert.equal(s.word, c.HighlightText, `row ${n}: the word is HighlightText`);
        assert.equal(s.dot[3], c.HighlightText, `row ${n}: the dot is HighlightText, not a named CanvasText`);
        if (n === rows - 1) assert.equal(s.edge[1], c.HighlightText, "the badge's edge is HighlightText");
        // the mark shows on the lit plate
        const mark = await skill.page.evaluate((i) => { const el = document.querySelectorAll(".row")[i].querySelector(".status, .badge"); const b = el.getBoundingClientRect(); const pad = el.classList.contains("badge") ? 7 : 0; return { x: b.x + pad, y: b.y + (b.height - 6) / 2, plate: document.querySelectorAll(".row")[i].getBoundingClientRect().x + 3 }; }, n);
        const own = await pixels(skill.page, { x: Math.floor(mark.x), y: Math.floor(mark.y), width: 6, height: 6 });
        const plate = (await pixels(skill.page, { x: Math.floor(mark.plate), y: Math.floor(mark.y) + 3, width: 1, height: 1 }))[0];
        assert.ok(Math.max(...own.map((p) => contrast(p, plate))) >= 3, `row ${n}: the mark shows on the plate`);
      }
      await react.page.close();
      await skill.context.close();
    });
  }
});

describe("the status family out of forced colours, in the skill", () => {
  for (const scheme of THEMES) {
    test(`${scheme}: no status is the word alone, neutral draws the tertiary dot, running draws none, the badge edge is a border and the box is the size it was`, async () => {
      const { page, context, errors } = await open(skillGrid + '<span class="badge" id="edge" data-status="success">Ready</span><div class="status" data-status="neutral" data-size-probe></div>', { scheme });
      const content = (sel) => page.locator(sel).first().evaluate((el) => getComputedStyle(el, "::before").content);
      assert.equal(await content('[data-case="o-none"]'), "none", "a badge with no status has no dot");
      assert.equal(await content('[data-case="p-none"]'), "none", "a status with none is the word alone");
      assert.equal(await content('[data-case="p-running"]'), "none", "running: braille takes the dot's seat");
      assert.equal(await page.locator('[data-case="p-neutral"]').evaluate((el) => getComputedStyle(el, "::before").backgroundColor), await resolve(page, "var(--basalt-text-tertiary)", "background-color"), "neutral by name is the tertiary dot");
      assert.equal(await page.locator('[data-case="p-danger"]').evaluate((el) => getComputedStyle(el).color), await resolve(page, "var(--basalt-text-secondary)"), "a danger word keeps its ink; only the dot is red");
      const edge = await page.locator("#edge").evaluate((el) => {
        const s = getComputedStyle(el); const text = [...el.childNodes].find((n) => n.nodeType === 3); const range = document.createRange(); range.selectNodeContents(text);
        const dot = getComputedStyle(el, "::before");
        return { boxSizing: s.boxSizing, border: [s.borderTopWidth, s.borderTopStyle, s.borderTopColor], shadow: s.boxShadow, pad: s.paddingLeft, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height, text: range.getBoundingClientRect().width, dot: Number.parseFloat(dot.width), gap: Number.parseFloat(s.columnGap) };
      });
      assert.deepEqual([edge.boxSizing, edge.border, edge.shadow, edge.pad], ["border-box", ["1px", "solid", await resolve(page, "var(--basalt-border-hairline)")], "none", "7px"]);
      assert.equal(edge.h, Number.parseFloat(await resolve(page, "var(--basalt-size-badge)", "width")));
      assert.ok(Math.abs(edge.w - (16 + edge.dot + edge.gap + edge.text)) < 0.01, "the box is 2 x space-2 + the dot, the gap and the word: the border changed nothing");
      assert.deepEqual(errors, []);
      assert.deepEqual(await axeViolations(page), []);
      await context.close();
    });
  }
});

// ---- The links module ----

const FOOTER = `<footer class="footer small" style="padding:16px"><ul class="links" id="row" aria-label="Elsewhere">
  <li><a id="gh" href="https://example.test/gh"><i data-icon="GithubLogo"></i>GitHub</a></li>
  <li><a id="x" href="https://example.test/x" target="_blank"><i data-icon="XLogo"></i>X</a></li>
  <li><a id="li" href="https://example.test/li"><i data-icon="LinkedinLogo"></i>LinkedIn</a></li>
  <li><a id="ig" href="https://example.test/ig"><i data-icon="InstagramLogo"></i>Instagram</a></li>
  <li><a id="yt" href="https://example.test/yt"><i data-icon="YoutubeLogo"></i>YouTube</a></li>
  <li><a id="mail" href="mailto:name@example.test"><i data-icon="EnvelopeSimple"></i>Email</a></li>
  <li><a id="sub" href="https://example.test/sub">Substack</a></li>
  <li><a id="sky" href="https://example.test/sky" target="_blank">Bluesky</a></li>
</ul></footer>`;

describe("a social link in the skill", () => {
  for (const scheme of THEMES) {
    test(`${scheme}: glyph before the name, 16 and space-1-5 apart; links 16px apart; the name underlined in border-input, the glyph not; secondary at rest`, async () => {
      const { page, context, errors } = await open(FOOTER, { scheme });
      const gh = await page.locator("#gh").evaluate((a) => {
        const svg = a.querySelector("svg").getBoundingClientRect(); const s = getComputedStyle(a);
        const range = document.createRange(); range.selectNodeContents([...a.childNodes].find((n) => n.nodeType === 3));
        return { w: svg.width, h: svg.height, gap: range.getBoundingClientRect().x - svg.right, line: s.textDecorationLine, colour: s.textDecorationColor, ink: s.color, svgInk: getComputedStyle(a.querySelector("svg")).color, radius: s.borderTopLeftRadius, display: s.display, size: s.fontSize, weight: s.fontWeight };
      });
      assert.deepEqual([gh.w, gh.h, gh.gap, gh.display, gh.size], [16, 16, 6, "flex", "13px"], "the glyph is 16 and space-1-5 before the name, at the footer's 13px");
      assert.deepEqual([gh.line, gh.colour], ["underline", await resolve(page, "var(--basalt-border-input)")], "the name is underlined in border-input");
      const secondary = await resolve(page, "var(--basalt-text-secondary)");
      assert.deepEqual([gh.ink, gh.svgInk], [secondary, secondary], "secondary at rest");
      assert.equal(gh.radius, "6px");
      const boxes = await page.locator("#row a").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.right]; }));
      for (let i = 1; i < boxes.length; i += 1) assert.equal(Math.round((boxes[i][0] - boxes[i - 1][1]) * 100) / 100, 16, `link ${i} is 16px after link ${i - 1}`);
      // a glyph is never underlined: it is not text, and a decoration is drawn under text only. Under the glyph's own box, the pixels are the page's.
      const glyph = await page.locator("#gh svg").evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.floor(r.x), y: Math.floor(r.bottom) + 1, w: Math.ceil(r.width) }; });
      const below = await pixels(page, { x: glyph.x, y: glyph.y, width: glyph.w, height: 3 });
      const page0 = (await pixels(page, { x: 2, y: glyph.y, width: 1, height: 1 }))[0];
      assert.ok(below.every((p) => contrast(p, page0) < 1.2), "no underline under the glyph");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`${scheme}: hover and focus lift both to primary and brighten the underline on hover; the ring at +2; no weight change, wash or press scale`, async () => {
      const { page, context } = await open(FOOTER, { scheme });
      await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), true));
      const read = (id) => page.locator(id).evaluate((a) => { const s = getComputedStyle(a); return { ink: s.color, svgInk: getComputedStyle(a.querySelector("svg") ?? a).color, line: s.textDecorationColor, weight: s.fontWeight, transform: s.transform, bg: s.backgroundColor, w: a.getBoundingClientRect().width, outline: [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor] }; });
      const rest = await read("#li");
      const primary = await resolve(page, "var(--basalt-text-primary)");
      await page.locator("#li").hover();
      await settle(page);
      const hover = await read("#li");
      assert.deepEqual([hover.ink, hover.svgInk, hover.line], [primary, primary, primary], "hover: glyph and name primary, the underline brightens");
      assert.deepEqual([hover.weight, hover.bg, hover.w], [rest.weight, rest.bg, rest.w], "no weight change, wash or shift");
      await page.mouse.down();
      await settle(page);
      assert.equal((await read("#li")).transform, "none", "no press scale on a link");
      await page.mouse.up();
      await page.mouse.move(0, 0);
      await page.locator("#gh").focus();
      await page.keyboard.press("Tab");
      await page.waitForFunction(() => document.activeElement?.id === "x");
      await settle(page);
      const focused = await read("#x");
      assert.deepEqual([focused.ink, focused.svgInk], [primary, primary], "focus lifts the ink as well as showing the ring");
      assert.deepEqual(focused.outline, ["solid", "2px", "2px", await resolve(page, "var(--basalt-border-focus)")], "the control ring at +2");
      await context.close();
    });

    test(`${scheme}: the arrow and the words only for target=_blank; none on mailto; a logo-only link keeps the words; the label can be translated; the rel is safe`, async () => {
      const body = FOOTER + `<p style="padding:16px"><a id="logo" href="https://example.test" target="_blank" aria-label="Home"><i data-icon="GithubLogo"></i></a> <a id="fr" href="https://example.test" target="_blank" data-new-tab-label="(s'ouvre dans un nouvel onglet)">Documentation</a> <a id="same" href="https://example.test">Same tab</a></p>`;
      const { page, context, errors } = await open(body, { scheme });
      const state = (id) => page.locator(id).evaluate((a) => ({ arrows: a.querySelectorAll(".ext").length, hidden: a.querySelector(".ext")?.getAttribute("aria-hidden"), words: a.querySelector(".visually-hidden")?.textContent ?? null, label: a.getAttribute("aria-label"), rel: a.getAttribute("rel"), name: a.textContent.replace(/⁠/g, "").trim(), underline: a.querySelector(".ext") ? getComputedStyle(a.querySelector(".ext")).textDecorationLine : null, size: a.querySelector(".ext svg")?.getBoundingClientRect().width }));
      const x = await state("#x");
      assert.deepEqual([x.arrows, x.hidden, x.words, x.rel, x.size], [1, "true", " (opens in a new tab)", "noopener noreferrer", 16]);
      assert.equal(x.name, "X (opens in a new tab)");
      assert.equal(x.underline, "none", "the arrow is never underlined (an inline-block is not decorated)");
      assert.equal((await state("#gh")).arrows, 0);
      assert.equal((await state("#same")).arrows, 0, "a same-tab link to another site gets neither");
      assert.equal((await state("#mail")).arrows, 0, "none on mailto:");
      const logo = await state("#logo");
      assert.deepEqual([logo.arrows, logo.label], [0, "Home (opens in a new tab)"], "a link that holds only a glyph skips the arrow and keeps the phrase");
      assert.equal((await state("#fr")).words, " (s'ouvre dans un nouvel onglet)");
      assert.equal(await page.getByRole("link", { name: "X (opens in a new tab)" }).count(), 1);
      assert.equal(await page.getByRole("link", { name: "GitHub", exact: true }).count(), 1, "the visible name is the accessible name");
      // the arrow follows the name by the glyph's own bearing, not by the link's gap
      const gaps = await page.locator("#sky").evaluate((a) => { const name = document.createRange(); name.selectNodeContents([...a.childNodes].find((n) => n.nodeType === 3)); return a.querySelector(".ext svg").getBoundingClientRect().x - name.getBoundingClientRect().right; });
      assert.ok(gaps >= 0 && gaps < 4, `the arrow follows the name with no added gap (${gaps}px)`);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("the name alone for a service without a mark: no glyph, no empty seat", async () => {
    const { page, context } = await open(FOOTER, { scheme: "light" });
    const sub = await page.locator("#sub").evaluate((a) => ({ svgs: a.querySelectorAll("svg").length, pad: getComputedStyle(a).paddingLeft, gap: getComputedStyle(a).columnGap, left: a.getBoundingClientRect().x, text: (() => { const r = document.createRange(); r.selectNodeContents(a.firstChild); return r.getBoundingClientRect().x; })() }));
    assert.deepEqual([sub.svgs, sub.pad, sub.text === sub.left], [0, "0px", true]);
    await context.close();
  });

  test("beside 18px text the glyphs are 20 (data-size on the row), and the new-tab arrow keeps its own size", async () => {
    const { page, context } = await open('<ul class="links" data-size="20" style="font-size:18px;line-height:26px"><li><a id="a" href="https://example.test" target="_blank"><i data-icon="GithubLogo"></i>GitHub</a></li></ul>', { scheme: "dark" });
    assert.deepEqual(await page.locator("#a > svg").evaluate((s) => [s.getBoundingClientRect().width, s.getBoundingClientRect().height]), [20, 20]);
    assert.equal(await page.locator("#a .ext svg").evaluate((s) => s.getBoundingClientRect().width), 16);
    await context.close();
  });

  test("in forced colours every link is LinkText, glyph and arrow included; axe is clean in both themes", async () => {
    for (const scheme of THEMES) {
      const { page, context } = await open(FOOTER, { scheme });
      assert.deepEqual(await axeViolations(page), [], scheme);
      await page.emulateMedia({ forcedColors: "active", colorScheme: scheme });
      const c = await systemColours(page);
      const inks = await page.locator("#x").evaluate((a) => ({ a: getComputedStyle(a).color, glyph: getComputedStyle(a.querySelector("svg")).color, arrow: getComputedStyle(a.querySelector(".ext")).color, arrowSvg: getComputedStyle(a.querySelector(".ext svg")).color }));
      assert.deepEqual(Object.values(inks), Array(4).fill(c.LinkText), `${scheme}: ${JSON.stringify(inks)}`);
      assert.deepEqual(await forcedAxe(page), []);
      await context.close();
    }
  });
});

describe("a row of social links on touch, in the skill", () => {
  for (const scheme of THEMES) {
    test(`${scheme}: each link is at least 44 by 44 as real layout, the gap is 8px of hit area either side, wrapped lines touch and never overlap`, async () => {
      const { page, context } = await open(FOOTER.replace('id="row"', 'id="row" style="max-width:300px"'), { scheme, width: 390, touch: true });
      const boxes = await page.locator("#row a").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, w: r.width, h: r.height, margin: `${s.marginTop} ${s.marginBottom}`, glyph: el.querySelector("svg")?.getBoundingClientRect().x }; }));
      assert.ok(boxes.every((b) => b.w >= 44 && b.h >= 44), `every link is at least 44 by 44: ${boxes.map((b) => `${b.w}x${b.h}`)}`);
      assert.ok(boxes.every((b) => b.margin === "0px 0px"), "the page's coarse-pointer negative margin on a standalone link is cancelled");
      const lines = [...new Set(boxes.map((b) => b.y))].sort((a, b) => a - b);
      assert.ok(lines.length > 1, "the row wraps at 300px");
      for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]; const b = boxes[j];
        assert.equal(a.x < b.right - 0.01 && b.x < a.right - 0.01 && a.y < b.bottom - 0.01 && b.y < a.bottom - 0.01, false, `links ${i} and ${j} overlap`);
      }
      for (let i = 1; i < lines.length; i += 1) assert.ok(lines[i] - lines[i - 1] >= 43.99 && lines[i] - lines[i - 1] < 45, `line ${i} follows line ${i - 1} at 44px`);
      const edge = await page.locator("footer").evaluate((el) => el.getBoundingClientRect().x + Number.parseFloat(getComputedStyle(el).paddingLeft));
      assert.equal(boxes[0].glyph, edge, "the first glyph stays on the content edge");
      const first = boxes.filter((b) => b.y === boxes[0].y);
      for (let i = 1; i < first.length; i += 1) assert.ok(Math.abs(first[i].x - first[i - 1].right) < 0.01, "neighbours touch");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 390), true, "nothing scrolls sideways");
      await context.close();
    });
  }
});

describe("icon only, in the skill: a row made entirely of marks", () => {
  const MARKS = `<ul class="links" data-icon-only aria-label="Elsewhere" style="padding:16px">
    <li><a class="btn" data-variant="ghost" data-icon-only id="m1" href="https://example.test/gh" aria-label="GitHub"><i data-icon="GithubLogo"></i></a></li>
    <li><a class="btn" data-variant="ghost" data-icon-only id="m2" href="https://example.test/x" target="_blank" aria-label="X"><i data-icon="XLogo"></i></a></li>
    <li><a class="btn" data-variant="ghost" data-icon-only id="m3" href="https://example.test/li" aria-label="LinkedIn"><i data-icon="LinkedinLogo"></i></a></li></ul>`;

  test("32px ghost buttons rendered as links, space-1 apart, each named for its service, with the .98 press; a new-tab mark has no arrow and keeps the phrase", async () => {
    const { page, context, errors } = await open(MARKS, { scheme: "dark" });
    await page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault(), true));
    const links = await page.locator("#m1, #m2, #m3").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.x, right: r.right, label: el.getAttribute("aria-label"), arrows: el.querySelectorAll(".ext").length }; }));
    assert.deepEqual(links.map((l) => [l.w, l.h]), Array(3).fill([32, 32]));
    assert.deepEqual(links.map((l) => l.label), ["GitHub", "X (opens in a new tab)", "LinkedIn"]);
    assert.deepEqual(links.map((l) => l.arrows), [0, 0, 0]);
    assert.equal(Math.round((links[1].x - links[0].right) * 100) / 100, 4);
    const b = await page.locator("#m1").boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await settle(page);
    assert.equal(await page.locator("#m1").evaluate((el) => getComputedStyle(el).transform), "matrix(0.98, 0, 0, 0.98, 0, 0)", "the button's .98 press");
    await page.mouse.up();
    await settle(page);
    assert.deepEqual(errors, []);
    assert.deepEqual(await axeViolations(page), []);
    await context.close();
  });

  test("on touch each mark is 44 by 44", async () => {
    const { page, context } = await open(MARKS, { scheme: "light", width: 390, touch: true });
    assert.deepEqual(await page.locator("#m1, #m2, #m3").evaluateAll((els) => els.map((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height])), Array(3).fill([44, 44]));
    await context.close();
  });
});

describe("the long form in the skill: a profile list", () => {
  const LONG = (extra = "") => `<div class="panel" style="width:420px;margin:16px"><div class="rows profile-links" id="list" role="group" aria-label="Profiles">
    <a class="row" id="r-gh" href="https://example.test/gh"><i data-icon="GithubLogo"></i><span class="row-label">GitHub</span><span class="row-hint">@placeholder</span></a>
    <a class="row" id="r-x" href="https://example.test/x" target="_blank"><i data-icon="XLogo"></i><span class="row-label">X</span><span class="row-hint">@placeholder</span></a>
    <a class="row" id="r-mail" href="mailto:name@example.test"><i data-icon="EnvelopeSimple"></i><span class="row-label">Email</span><span class="row-hint">name@example.test</span></a>${extra}</div></div>`;
  const WITHOUT = `<a class="row" id="r-sub" href="https://example.test/sub"><span class="row-label">Substack</span><span class="row-hint">placeholder.substack.com</span></a><a class="row" id="r-sky" href="https://example.test/sky"><span class="row-label">Bluesky</span><span class="row-hint">@placeholder.bsky.social</span></a>`;

  for (const scheme of THEMES) {
    test(`${scheme}: a service without a mark keeps an empty seat, so every name starts at one x; the seat is padding, never an element`, async () => {
      const { page, context, errors } = await open(LONG(WITHOUT), { scheme });
      const names = await page.locator(".row-label").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
      assert.equal(new Set(names).size, 1, `every name starts at one x: ${names}`);
      const list = await page.locator("#list").evaluate((el) => el.getBoundingClientRect().x);
      assert.equal(names[0] - list, 6 + 12 + 16 + 12, "the list's padding, the row's padding, the 16px seat and the row's gap");
      assert.deepEqual(await page.locator("#r-sub, #r-sky").evaluateAll((els) => els.map((a) => [a.querySelectorAll("svg").length, a.children.length])), [[0, 2], [0, 2]], "only the name and the hint");
      assert.equal(await page.locator("#r-x .row-label .ext").count(), 1);
      assert.equal(await page.locator("#r-gh .ext, #r-mail .ext").count(), 0);
      assert.deepEqual(errors, []);
      assert.deepEqual(await axeViolations(page), []);
      await context.close();
    });
  }

  test("with no glyph in the list there is no seat, and no other list is re-indented (a menu row without an icon stays where it was)", async () => {
    const none = LONG("").replace(/<i data-icon="[A-Za-z]+"><\/i>/g, "");
    const { page, context } = await open(none + '<div class="panel" style="width:420px;margin:16px"><div class="rows" id="menu"><a class="row" href="#a"><svg class="icon" width="16" height="16"></svg><span class="row-label">With</span></a><a class="row" href="#b"><span class="row-label" id="bare">Without</span></a></div></div>', { scheme: "dark" });
    const x = await page.locator("#list .row-label").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().x));
    const list = await page.locator("#list").evaluate((el) => el.getBoundingClientRect().x);
    assert.deepEqual([...new Set(x)], [list + 6 + 12], "no glyph anywhere in the profile list: no seat");
    const menu = await page.locator("#menu").evaluate((el) => el.getBoundingClientRect().x);
    assert.equal(await page.locator("#bare").evaluate((el) => el.getBoundingClientRect().x), menu + 6 + 12, "a plain rows list keeps its rows as they were");
    await context.close();
  });

  test("in RTL the seat is on the start side", async () => {
    const { page, context } = await open(LONG(WITHOUT), { scheme: "light" });
    await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    const right = await page.locator(".row-label").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().right * 100) / 100));
    assert.equal(new Set(right).size, 1, `every name ends at one x: ${right}`);
    await context.close();
  });
});

describe("the site bar in print", () => {
  for (const scheme of THEMES) {
    test(`${scheme}: it prints, static and opaque, as React's does (DECISIONS 104), whatever the page's own display rule`, async () => {
      const { page, context } = await open('<header class="topbar"><div class="topbar-inner"><a class="brand" href="#">Product</a></div></header><main class="page"><h1>Report</h1></main>', { scheme });
      await page.addStyleTag({ content: ".topbar { display: flex }" });
      await page.emulateMedia({ media: "print" });
      const s = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".topbar")); return [c.display, c.position, c.backgroundColor, c.backdropFilter, c.webkitBackdropFilter]; });
      assert.equal(s[0], "flex", "drawn");
      assert.deepEqual([s[1], s[3]], ["static", "none"]);
      assert.equal(s[2], await resolve(page, "var(--basalt-surface-page)", "background-color"));
      await context.close();
    });
  }
});
