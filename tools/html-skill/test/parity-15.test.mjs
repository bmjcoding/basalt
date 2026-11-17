// The links-and-rows port (DECISIONS 152): the directory, the big link rows, show all and the copy button with words, in the skill beside React's, in both
// themes and at 1440 and 390, compared by computed style; then the skill's own behaviour (the same states, 0px moves, focus landing once the clip has let go,
// reduced motion, forced colours, touch, axe). Nothing waits a wall-clock time inside a transition: it waits for the state (`data-settled`), or runs a frozen clock.
// The skill draws the directory's go arrow as a CSS mask on the name's ::after (React draws a glyph in a span), so the arrow is compared by its box and ink, not its markup.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let reactBrowser;
before(async () => { browser = await launch(); reactBrowser = await launchReact(); });
after(async () => { await browser?.close(); await reactBrowser?.close(); });

const THEMES = ["dark", "light"];
const TYPE = ["fontSize", "fontWeight", "lineHeight", "letterSpacing"];
const ROW = ["width", "height", "paddingTop", "paddingBottom", "gridTemplateColumns", "columnGap", "rowGap", "color", "backgroundColor", "outlineStyle"];
const near = (a, b, message, tolerance = 0.6) => assert.ok(Math.abs(a - b) <= tolerance, `${message}: ${a} vs ${b}`);

const measure = (page, selector, props) => page.evaluate(({ selector, props }) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const s = getComputedStyle(el);
  const out = {};
  for (const p of props) out[p] = ["width", "height"].includes(p) ? `${Math.round(el.getBoundingClientRect()[p] * 100) / 100}px` : s[p];
  return out;
}, { selector, props });
const compare = async (react, skill, rs, ss, props, label) => {
  const a = await measure(react, rs, props), b = await measure(skill, ss, props);
  assert.ok(a && b, `${label}: both exist (${rs} / ${ss})`);
  assert.deepEqual(b, a, label);
};
const box = (page, selector) => page.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const css = (page, selector, property) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el)[p], property);
const axe = async (page) => {
  await page.evaluate((source) => (0, eval)(source), axeSource);
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
const travel = (page, selector, pseudo) => page.locator(selector).first().evaluate((el, p) => { const m = getComputedStyle(el, p).transform; return m === "none" ? 0 : new DOMMatrix(m).m41; }, pseudo ?? null);

const ROWS = Array.from({ length: 8 }, (_, i) => ({ name: `Name ${i + 1}`, what: `A synthetic sentence about row ${i + 1}, long enough to be a line of words.`, state: String(2015 + i) }));
const REACT_DIR = (shown) => `<div style={{ width: 960, margin: 16 }}><B.DirectoryList id="dir" title="Client work and other projects"${shown ? ` shown={${shown}}` : ""}>${ROWS.map((r, i) => `<B.DirectoryRow key={${i}} href="#r${i}" name="${r.name}" description="${r.what}" state="${r.state}" />`).join("")}</B.DirectoryList></div>`;
const SKILL_DIR = (shown) => {
  const row = (r, i) => `<a class="dir-row" href="#r${i}"><span class="dir-name">${r.name}</span><span class="dir-what">${r.what}</span><span class="dir-state">${r.state}</span></a>`;
  const first = ROWS.slice(0, shown || ROWS.length).map((r, i) => `<li>${row(r, i)}</li>`).join("");
  const rest = shown ? ROWS.slice(shown).map((r, i) => `<li class="reveal"><div class="reveal-clip">${row(r, i + shown)}</div></li>`).join("") : "";
  const foot = shown ? `<div class="reveal-foot"><button class="btn" data-variant="secondary" data-size="lg" data-disclosure data-reveal aria-expanded="false" aria-controls="dir" data-open-label="Show fewer">Show all ${ROWS.length}</button></div>` : "";
  return `<div class="dir" id="dir" style="width: 960px; margin: 16px"><h3 class="dir-head" id="dir-head">Client work and other projects</h3><ul class="dir-list" aria-labelledby="dir-head">${first}${rest}</ul>${foot}</div>`;
};
const REACT_BIG = `<div style={{ margin: 16 }}><B.BigLinkList aria-label="Shop"><B.BigLinkRow href="#a">Alpha goods</B.BigLinkRow><B.BigLinkRow href="#b">Beta goods</B.BigLinkRow><B.BigLinkRow href="#c">Gamma goods</B.BigLinkRow></B.BigLinkList></div>`;
const SKILL_BIG = `<div style="margin: 16px"><ul class="big-links" aria-label="Shop"><li><a class="big-link" href="#a">Alpha goods</a></li><li><a class="big-link" href="#b">Beta goods</a></li><li><a class="big-link" href="#c">Gamma goods</a></li></ul></div>`;
const react = (body, theme, width = 1440) => fixturePage(reactBrowser, `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; createRoot(document.getElementById("root")).render(<>${body}</>);`, { theme, colorScheme: theme, viewport: { width, height: 900 } });
const skill = (body, theme, width = 1440, options = {}) => openHtml(browser, compose(`<title>Rows</title>${body}`, { fonts: false }).html, { scheme: theme, width, ...options });

describe("the directory and the big link rows: the skill's, against React's", () => {
  for (const theme of THEMES) for (const width of [1440, 390]) test(`directory rows, in ${theme} at ${width}`, async () => {
    const r = await react(REACT_DIR(), theme, width), s = await skill(SKILL_DIR(), theme, width);
    await settle(r.page);
    for (const [label, rs, ss, props] of [
      ["the head", ".basalt-directory-head", ".dir-head", [...TYPE, "color", "paddingBottom", "width", "height"]],
      ["the list", ".basalt-directory-list", ".dir-list", ["width", "height", "listStyleType", "paddingLeft"]],
      ["a row", ".basalt-directory-row", ".dir-row", [...ROW, ...TYPE, "minHeight", "alignItems"]],
      ["the rule above a row", ".basalt-directory-item", ".dir-list > li", ["borderTopWidth", "borderTopColor", "borderTopStyle"]],
      ["its name", ".basalt-directory-name", ".dir-name", [...TYPE, "color", "width", "height"]],
      ["its sentence", ".basalt-directory-what", ".dir-what", [...TYPE, "color", "width", "height"]],
      ["its state", ".basalt-directory-state", ".dir-state", [...TYPE, "color", "textAlign", "fontVariantNumeric", "width"]],
    ]) await compare(r.page, s.page, rs, ss, props, label);
    await r.page.close(); await s.context.close();
  });

  for (const theme of THEMES) for (const width of [1440, 1023, 719]) test(`big link rows, in ${theme} at ${width}`, async () => {
    const r = await react(REACT_BIG, theme, width), s = await skill(SKILL_BIG, theme, width);
    for (const [label, rs, ss, props] of [
      ["the list", ".basalt-big-links", ".big-links", ["width", "height", "gridTemplateColumns", "columnGap", "borderTopWidth", ...(width === 1023 ? [] : ["borderTopColor"])]],
      ["an item", ".basalt-big-link-item", ".big-links > li", ["width", "height", "borderBottomWidth", "borderBottomColor", "borderTopWidth"]],
      ["a row", ".basalt-big-link", ".big-link", [...TYPE, "color", "minHeight", "height", "width", "gap", "justifyContent"]],
    ]) await compare(r.page, s.page, rs, ss, props, label);
    await r.page.close(); await s.context.close();
  });

  for (const theme of THEMES) test(`show all, closed and the foot, in ${theme}`, async () => {
    const r = await react(REACT_DIR(4), theme), s = await skill(SKILL_DIR(4), theme);
    await settle(r.page);
    await compare(r.page, s.page, ".basalt-reveal-foot", ".reveal-foot", ["width", "height", "paddingTop", "borderTopWidth", "borderTopColor", "display"], "the foot");
    await compare(r.page, s.page, ".basalt-reveal-foot .basalt-button", ".reveal-foot .btn", ["width", "height", "paddingLeft", "borderTopLeftRadius", ...TYPE, "color", "backgroundColor"], "the button");
    for (const page of [r.page, s.page]) {
      const heights = await page.locator("#dir li").evaluateAll((items) => items.map((el) => Math.round(el.getBoundingClientRect().height * 100) / 100));
      assert.deepEqual(heights.slice(4), [0, 0, 0, 0], "closed rows are no height at all");
      assert.deepEqual(heights.slice(0, 4), [57, 57, 57, 57], "an open row is 56 and its rule");
    }
    await r.page.close(); await s.context.close();
  });
});

describe("the arrow's transitions, consent row 7 (DECISIONS 152)", () => {
  const transition = (page, selector, pseudo) => page.locator(selector).first().evaluate((el, p) => { const s = getComputedStyle(el, p); return [s.transitionProperty, s.transitionDuration]; }, pseudo ?? null);
  test("a big row's arrow steps colour over 100ms and travels over 150ms, as React's does; the directory's keeps 150ms for both", async () => {
    const r = await react(REACT_BIG, "dark"), s = await skill(SKILL_BIG, "dark");
    const reactBig = await transition(r.page, ".basalt-big-link .basalt-go-arrow");
    assert.deepEqual(reactBig, ["color, transform", "0.1s, 0.15s"]);
    assert.deepEqual(await transition(s.page, ".big-link", "::after"), ["background-color, transform", reactBig[1]], "the skill's big row");
    await r.page.close(); await s.context.close();
    const d = await react(REACT_DIR(), "dark"), e = await skill(SKILL_DIR(), "dark");
    assert.equal((await transition(d.page, ".basalt-directory-row .basalt-go-arrow"))[1], "0.15s, 0.15s");
    assert.equal((await transition(e.page, ".dir-name", "::after"))[1], "0.15s, 0.15s");
    await d.page.close(); await e.context.close();
  });
});

describe("the skill's directory and show all", () => {
  test("the usage text's own markup opens by a key and lands focus on the first new row: inert is the script's, on the clip, never on the li", async () => {
    const usage = fs.readFileSync(new URL("../src/usage/link-rows.md", import.meta.url), "utf8");
    assert.ok(!/reveal\[inert\]/.test(usage) && /li\.reveal` holding `div\.reveal-clip`/.test(usage), "the usage names li.reveal holding div.reveal-clip, with no inert on the li");
    const { page, context } = await skill(SKILL_DIR(4), "dark");
    assert.equal(await page.locator("li.reveal[inert]").count(), 0, "written from the usage, no li is inert");
    await page.getByRole("button", { name: "Show all 8" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.getAttribute("href") === "#r4");
    assert.equal(await page.locator("#dir[data-settled]").count(), 1);
    await context.close();
  });

  test("hover lifts the sentence and arrow to primary, with no wash; the arrow travels 2px and nothing moves", async () => {
    const { page, context } = await skill(SKILL_DIR(), "dark");
    const before = { row: await box(page, ".dir-row"), what: await box(page, ".dir-what"), state: await box(page, ".dir-state") };
    assert.equal(await css(page, ".dir-what", "color"), await page.evaluate(() => { const p = document.createElement("i"); p.style.color = "var(--basalt-text-secondary)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }));
    await page.locator(".dir-row").first().hover();
    await settle(page);
    assert.equal(await css(page, ".dir-row", "backgroundColor"), "rgba(0, 0, 0, 0)", "no wash");
    near(await travel(page, ".dir-name", "::after"), 2, "the arrow travels 2px");
    assert.deepEqual({ row: await box(page, ".dir-row"), what: await box(page, ".dir-what"), state: await box(page, ".dir-state") }, before, "0px moves");
    await page.keyboard.press("Tab");
    assert.equal(await css(page, ".dir-row", "outlineOffset"), "2px");
    await context.close();
  });

  test("a pointer open leaves focus on the button; the rows grow, then the clip lets go; Show fewer closes them", async () => {
    const { page, context } = await skill(SKILL_DIR(4), "dark");
    const button = page.getByRole("button", { name: "Show all 8" });
    assert.equal(await button.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator(".reveal-clip[inert]").count(), 4, "closed rows are inert");
    const head = await box(page, ".dir-head"), first = await box(page, ".dir-row");
    await button.click();
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON", "a pointer open leaves focus on the button");
    await page.waitForSelector("#dir[data-settled]");
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON");
    assert.equal(await page.getByRole("button", { name: "Show fewer" }).getAttribute("aria-expanded"), "true");
    assert.deepEqual(await box(page, ".dir-head"), head, "the head does not move");
    assert.deepEqual(await box(page, ".dir-row"), first, "the first row does not move");
    assert.equal(await page.locator(".reveal-clip[inert]").count(), 0);
    assert.equal(await css(page, ".reveal-clip", "overflow"), "visible", "once open nothing clips");
    assert.equal(await page.locator("#dir ul").count(), 1, "one list");
    await page.getByRole("button", { name: "Show fewer" }).click();
    await page.waitForFunction(() => [...document.querySelectorAll("#dir li.reveal")].every((el) => el.getBoundingClientRect().height === 0));
    assert.equal(await page.locator(".reveal-clip[inert]").count(), 4);
    await context.close();
  });

  test("a keyboard open puts focus on the first new row only once the clip has let go", async () => {
    const { page, context } = await skill(SKILL_DIR(4), "dark");
    await page.evaluate(() => {
      window.__landed = [];
      document.addEventListener("focusin", (event) => {
        const clip = event.target.closest?.(".reveal-clip");
        window.__landed.push({ href: event.target.getAttribute?.("href"), settled: document.querySelector("#dir").hasAttribute("data-settled"), overflow: clip ? getComputedStyle(clip).overflow : null });
      });
    });
    await page.getByRole("button", { name: "Show all 8" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.activeElement?.getAttribute("href") === "#r4");
    const row = (await page.evaluate(() => window.__landed)).find((entry) => entry.href === "#r4");
    assert.equal(row.settled, true);
    assert.equal(row.overflow, "visible");
    await context.close();
  });

  test("under reduced motion it opens at once and a keyboard open still lands on the first new row", async () => {
    const { page, context } = await skill(SKILL_DIR(4), "dark", 1440, { reducedMotion: "reduce" });
    assert.equal(await css(page, "#dir li.reveal", "transitionDuration"), "0s");
    await page.getByRole("button", { name: "Show all 8" }).focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.activeElement?.getAttribute("href") === "#r4");
    await context.close();
  });

  for (const theme of THEMES) for (const width of [1440, 390]) test(`no accessibility violations, closed and open, in ${theme} at ${width}`, async () => {
    const { page, context, errors } = await skill(SKILL_DIR(4), theme, width);
    assert.deepEqual(await axe(page), []);
    await page.getByRole("button", { name: "Show all 8" }).click();
    await page.waitForSelector("#dir[data-settled]");
    assert.deepEqual(await axe(page), []);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("forced colours: the arrow is the link's own colour", async () => {
    const { page, context } = await skill(SKILL_DIR(), "dark");
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page); // the arrow's colour is a transition: read it once it has ended
    assert.notEqual(await css(page, ".dir-row", "color"), "");
    assert.equal(await page.locator(".dir-name").first().evaluate((el) => getComputedStyle(el, "::after").backgroundColor), await page.evaluate(() => { const a = document.createElement("a"); a.href = "#"; document.body.append(a); const c = getComputedStyle(a).color; a.remove(); return c; }));
    await context.close();
  });
});

describe("the copy button with words, in the skill", () => {
  const COPY = `<div style="display: flex; gap: 16px; align-items: center; padding: 16px"><button class="btn" id="copy" data-variant="secondary" data-size="lg" data-copy-text="hello@example.invalid" data-copy-status="Address copied" data-copy-words="Copied"><span>Copy address</span></button></div>`;
  const REACT_COPY = `<div style={{ display: "flex", gap: 16, alignItems: "center", padding: 16 }}><B.CopyButton id="copy" text="hello@example.invalid" variant="secondary" size="lg" statusLabel="Address copied">Copy address</B.CopyButton></div>`;
  const stub = (page, mode) => page.evaluate((m) => { window.__written = []; Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { if (m === "refuse") throw new Error("refused"); window.__written.push(t); } } }); }, mode);
  const words = (page) => page.locator("#copy").evaluate((el) => el.querySelector("[data-on]").textContent);

  for (const theme of THEMES) test(`it draws as React's does (${theme})`, async () => {
    const r = await react(REACT_COPY, theme), s = await skill(COPY, theme);
    await compare(r.page, s.page, ".basalt-copy-button", "#copy", ["width", "height", "paddingLeft", "borderTopLeftRadius", ...TYPE, "color", "backgroundColor", "borderTopColor"], "the button");
    await compare(r.page, s.page, ".basalt-copy-words", ".copy-words", ["width", "height", "display", "justifyItems"], "the cell");
    await r.page.close(); await s.context.close();
  });

  test("copies and says Copied for 1500ms, the width never changes, a refused clipboard leaves it as it was", async () => {
    const { page, context } = await skill(COPY, "dark", 1440, { permissions: [] });
    await stub(page, "allow");
    const before = await box(page, "#copy");
    assert.equal(await words(page), "Copy address");
    await page.locator("#copy").click();
    await page.waitForFunction(() => document.querySelector("#copy [data-on]").textContent === "Copied");
    assert.deepEqual(await page.evaluate(() => window.__written), ["hello@example.invalid"]);
    assert.deepEqual(await box(page, "#copy"), before, "0px: the width does not change");
    assert.equal(await page.getByRole("button", { name: "Copied" }).count(), 1);
    await page.waitForFunction(() => document.querySelector("#copy [data-on]").textContent === "Copy address", undefined, { timeout: 4000 });
    assert.deepEqual(await box(page, "#copy"), before);
    // Both ways to copy fail: the clipboard refuses, and so does the textarea fallback this module already has.
    await stub(page, "refuse");
    await page.evaluate(() => { document.execCommand = () => false; });
    await page.locator("#copy").click();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    assert.equal(await words(page), "Copy address", "it never says Copied after a refusal");
    await context.close();
  });

  test("no accessibility violations", async () => {
    const { page, context } = await skill(COPY, "dark");
    assert.deepEqual(await axe(page), []);
    await context.close();
  });
});
