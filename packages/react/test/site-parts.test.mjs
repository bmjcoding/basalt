// Site parts (DECISIONS 146; review round 39): the site footer (A), the theme choice (B), the header's parts (C), a bar that arrives or leaves and returns (D), the smoke (E), the
// brand's lockup and drawn art (F). Driven in Chromium against the built package with the real stylesheet. Every item of DECISIONS 146 has a test here that fails if it is not
// built, and every defect the decision lists in the prototypes has one that fails if the build has it. No test reads a moment in a transition after a wall-clock wait: a state is
// waited for by its attribute, and a transition is read by its computed timing.
//
// The fixtures load no web font, so a label's width differs from a Mac's on CI's Linux runner: every measured margin is wider than a fallback font's width.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { checkHeadroom } from "../dist/testing/headroom.js";
import { bundleFixture, fixturePage, launch, pixels, pkg, settle } from "./support.mjs";
import fs from "node:fs";
import path from "node:path";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);

// A synthetic brand: a bar and a block drawn as one path, in the two fits (1x on a 24 by 32 grid, 2x with finer stems). Nothing from a brand folder.
const LOCKUP = `{ x1: { viewBox: "0 0 40 32", d: "M0 4h24v3H0zM0 25h24v3H0zM0 7h3v18H0zM9 13h6v6H9zM28 10h12v12H28z" }, x2: { viewBox: "0 0 42 32", d: "M0 4h24v2.5H0zM0 25.5h24V28H0zM0 6.5h2.5v19H0zM9.5 13.5h5v5h-5zM28 10.5h13v11H28z" } }`;
const LINKS = `[{ href: "#product", label: "Product", current: true }, { href: "#docs", label: "Docs" }, { href: "#pricing", label: "Pricing" }, { href: "#about", label: "About" }]`;
const groups = (count, current = -1) => `[${Array.from({ length: count }, (_, g) => `{ label: "Group ${g + 1}", links: [${Array.from({ length: 4 }, (_, l) => `{ href: "#g${g}l${l}", label: "Link ${g + 1}.${l + 1}"${g === current && l === 0 ? ", current: true" : ""} }`).join(", ")}] }`).join(", ")}]`;
const footer = ({ count = 3, current = -1, line = false, note = true, social = false } = {}) =>
  `<B.SiteFooter
    brand={<B.SiteBrand label="Sample home" lockup={${LOCKUP}} />}
    ${note ? `note="A plain sentence about the site."` : ""}
    ${social ? `social={<B.SocialLinks><B.SocialLink service="github" href="https://example.com/a" /></B.SocialLinks>}` : ""}
    ${line ? `links={[{ href: "#a", label: "About" }, { href: "#b", label: "Docs" }, { href: "#c", label: "Pricing" }, { href: "#d", label: "Status" }]}` : `groups={${groups(count, current)}}`}
    legal="Sample Ltd. All rights reserved."
  />`;
const page = (body, { main = 200 } = {}) => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SitePage><main><div style={{ height: ${main} }}>Synthetic page.</div></main>${body}</B.SitePage>);`;

const open = async (fixture, { width = 1440, height = 900, theme = "dark", ...options } = {}) => {
  const { page: p, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  await settle(p);
  p.errors = errors;
  return p;
};
const rect = (p, selector, n = 0) => p.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (p, selector, property, n = 0) => p.locator(selector).nth(n).evaluate((el, name) => getComputedStyle(el)[name], property);
const COARSE = { hasTouch: true, isMobile: true };

// A page on a fake-host origin, so localStorage works and a stored choice survives a reload (about:blank cannot hold one).
const ORIGIN = "https://basalt.test";
const open2 = async (fixture, { width = 1440, height = 900, theme = "dark", stored, head = "", ...options } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, ...options });
  const script = await bundleFixture(fixture);
  const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
  await context.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basalt</title><style>${css}</style><style>body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); }</style>${head}</head><body><div id="root"></div><script>${script}</script></body></html>` }));
  if (stored) await context.addInitScript((value) => { try { localStorage.setItem("basalt-theme", value); } catch { /* none */ } }, stored);
  const p = await context.newPage();
  p.setDefaultTimeout(5000);
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.goto(`${ORIGIN}/`);
  await settle(p);
  p.ctx = context;
  return p;
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("A. the site footer", () => {
  test("A1: it sits on the page at level 0: no fill, no rim, no shadow, and one divider, which is the top of its body", async () => {
    const p = await open(page(footer()));
    const style = await p.locator(".basalt-site-footer").evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, shadow: s.boxShadow, border: s.borderTopWidth + s.borderBottomWidth + s.borderLeftWidth + s.borderRightWidth, tag: el.tagName }; });
    assert.deepEqual(style, { bg: "rgba(0, 0, 0, 0)", shadow: "none", border: "0px0px0px0px", tag: "FOOTER" }, "no fill, rim or shadow of its own");
    const divider = await p.locator(".basalt-site-footer-body").evaluate((el) => { const s = getComputedStyle(el); return { top: s.borderTopWidth, style: s.borderTopStyle, color: s.borderTopColor, sides: s.borderLeftWidth + s.borderBottomWidth }; });
    assert.equal(divider.top, "1px");
    assert.equal(divider.style, "solid");
    assert.equal(divider.sides, "0px0px", "one divider, on the top only");
    const token = await p.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-border-divider)"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    assert.equal(divider.color, token, "the divider's colour is border-divider");
    assert.deepEqual(p.errors, []);
    await p.close();
  });

  test("A1: the divider is the width of the row, never full-bleed, with half a section gap above it (64 from 1024, 48 from 720, 32 under)", async () => {
    for (const [width, above] of [[1440, 64], [900, 48], [390, 32]]) {
      const p = await open(page(footer()), { width });
      const body = await rect(p, ".basalt-site-footer-body");
      const brand = await rect(p, ".basalt-site-brand");
      const gutter = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-gutter")));
      assert.ok(body.w < (await p.evaluate(() => document.documentElement.clientWidth)), `never full-bleed at ${width}`);
      near(body.x, brand.x, `the divider starts where the content does at ${width}`, 1);
      near(await p.locator(".basalt-site-footer").evaluate((el) => parseFloat(getComputedStyle(el).marginTop)), above, `half a section gap above at ${width}`, 0.01);
      assert.ok(body.x >= gutter - 0.5, "the gutter is outside the line");
      await p.close();
    }
  });

  test("A1: order is the brand, the sentence, the social links, the links, then the legal line and the theme choice; one nav named Footer; the footer is the contentinfo", async () => {
    const p = await open(page(footer({ count: 3, social: true })));
    const order = await p.evaluate(() => [...document.querySelector(".basalt-site-footer").querySelectorAll(".basalt-site-brand, .basalt-site-footer-note, .basalt-social-links, .basalt-site-footer-links, .basalt-site-footer-legal, .basalt-theme-choice")].map((el) => el.className.split(" ")[0]));
    assert.deepEqual(order, ["basalt-site-brand", "basalt-site-footer-note", "basalt-social-links", "basalt-site-footer-links", "basalt-site-footer-legal", "basalt-theme-choice"]);
    assert.equal(await p.locator("footer nav").count(), 1, "all the links are one nav");
    assert.equal(await p.locator("footer nav").getAttribute("aria-label"), "Footer");
    assert.equal(await p.getByRole("contentinfo").count(), 1);
    await p.close();
  });

  test("A1: eight groups are still one nav, not five to eight landmarks", async () => {
    const p = await open(page(footer({ count: 8 })));
    assert.equal(await p.getByRole("navigation").count(), 1);
    assert.equal(await p.locator("footer ul").count(), 8, "each group is a list");
    // each group's list is named by its own heading
    const names = await p.evaluate(() => [...document.querySelectorAll("footer ul")].map((ul) => document.getElementById(ul.getAttribute("aria-labelledby"))?.querySelector(".basalt-site-footer-label-wide")?.textContent));
    assert.deepEqual(names, Array.from({ length: 8 }, (_, i) => `Group ${i + 1}`));
    await p.close();
  });

  test("A1: a group label is an h2 at 13/18 and 500 in primary, in sentence case: never uppercase, never mono", async () => {
    const p = await open(page(footer()));
    assert.equal(await p.locator(".basalt-site-footer-label").first().evaluate((el) => el.tagName), "H2");
    const label = await p.locator(".basalt-site-footer-label").first().evaluate((el) => {
      const s = getComputedStyle(el);
      const probe = document.createElement("i");
      probe.style.color = "var(--basalt-text-primary)";
      document.body.append(probe);
      const primary = getComputedStyle(probe).color;
      probe.remove();
      return { size: s.fontSize, line: s.lineHeight, weight: s.fontWeight, transform: s.textTransform, family: s.fontFamily, spacing: s.letterSpacing, primary: s.color === primary };
    });
    assert.deepEqual([label.size, label.line, label.weight, label.transform, label.primary], ["13px", "18px", "500", "none", true]);
    assert.ok(!/mono/i.test(label.family), `not mono: ${label.family}`);
    await p.close();
  });

  test("A1: the link is the pill link at sm: a 28px pill in a 32px hit area at 13/18, hung so labels start on the group label's edge", async () => {
    const p = await open(page(footer()));
    const pill = await rect(p, ".basalt-site-footer .basalt-site-pill");
    const hit = await rect(p, ".basalt-site-footer .basalt-site-link");
    assert.equal(pill.h, 28);
    assert.equal(hit.h, 32);
    const font = await p.locator(".basalt-site-footer .basalt-site-label").first().evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.lineHeight, s.fontWeight]; });
    assert.deepEqual(font, ["13px", "18px", "400"]);
    const label = await p.locator(".basalt-site-footer .basalt-site-footer-label-wide").first().evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().left; });
    const word = await p.locator(".basalt-site-footer .basalt-site-label").first().evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().left; });
    near(word, label, "the first link's words start on the group label's edge", 0.6);
    // a column's hit areas touch
    const second = await rect(p, ".basalt-site-footer .basalt-site-link", 1);
    near(second.y, hit.bottom, "hit areas touch in a column", 0.1);
    await p.close();
  });

  test("A1 (defect: opus's links were 32px on a real coarse pointer): on touch each link is a 44px target, and neighbours do not overlap", async () => {
    const p = await open(page(footer()), { width: 390, height: 844, ...COARSE, deviceScaleFactor: 2 });
    assert.equal(await p.evaluate(() => matchMedia("(pointer: coarse)").matches), true, "a real coarse pointer");
    // open every group so the links are on screen
    await p.evaluate(() => document.querySelectorAll(".basalt-site-footer-toggle[aria-expanded=false]").forEach((b) => b.click()));
    await settle(p);
    const links = await p.locator(".basalt-site-footer .basalt-site-link").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { y: r.y, h: r.height }; }));
    assert.ok(links.length >= 12);
    for (const link of links) assert.ok(link.h >= 44, `a link is ${link.h}px tall on touch`);
    for (let i = 1; i < links.length; i += 1) assert.ok(links[i].y >= links[i - 1].y + links[i - 1].h - 0.01 || Math.abs(links[i].y - links[i - 1].y) > 40, "targets never overlap");
    await p.close();
  });

  test("A1: from 1024 the brand takes tracks 1 to 4 and the groups tracks 5 to 12, four a row", async () => {
    const p = await open(page(footer({ count: 8 })), { width: 1440 });
    const track = await p.evaluate(() => { const top = document.querySelector(".basalt-site-footer-top"); const s = getComputedStyle(top); const tracks = s.gridTemplateColumns.split(" ").map(parseFloat); return { count: tracks.length, gap: parseFloat(s.columnGap), left: top.getBoundingClientRect().left, tracks }; });
    assert.equal(track.count, 12);
    const trackStart = (n) => track.left + track.tracks.slice(0, n - 1).reduce((a, w) => a + w + track.gap, 0);
    near((await rect(p, ".basalt-site-footer-id")).x, trackStart(1), "the brand block starts at track 1", 0.6);
    near((await rect(p, ".basalt-site-footer-id")).right, trackStart(5) - track.gap, "and ends at track 4", 0.6);
    near((await rect(p, ".basalt-site-footer-groups")).x, trackStart(5), "the groups start at track 5", 0.6);
    const rows = await p.locator(".basalt-site-footer-group").evaluateAll((els) => { const ys = els.map((el) => Math.round(el.getBoundingClientRect().top)); return [...new Set(ys)].map((y) => ys.filter((v) => v === y).length); });
    assert.deepEqual(rows, [4, 4], "eight groups are four a row");
    await p.close();
  });

  test("A1: from 720 to 1023 the brand takes the row and the groups sit under it, four a row", async () => {
    const p = await open(page(footer({ count: 8 })), { width: 900 });
    const id = await rect(p, ".basalt-site-footer-id");
    const groupsBox = await rect(p, ".basalt-site-footer-groups");
    assert.ok(groupsBox.y >= id.bottom - 0.5, "the groups are under the brand");
    near(groupsBox.x, id.x, "and start on its edge", 0.6);
    const rows = await p.locator(".basalt-site-footer-group").evaluateAll((els) => { const ys = els.map((el) => Math.round(el.getBoundingClientRect().top)); return [...new Set(ys)].map((y) => ys.filter((v) => v === y).length); });
    assert.deepEqual(rows, [4, 4]);
    await p.close();
  });

  test("A1: under 720 a labelled group is a disclosure: a 44px row with the label and a chevron, a divider between, closed unless it holds the current page", async () => {
    const p = await open(page(footer({ count: 3, current: 1 })), { width: 390, height: 844 });
    const toggles = p.locator(".basalt-site-footer-toggle");
    assert.equal(await toggles.count(), 3);
    for (let i = 0; i < 3; i += 1) near((await rect(p, ".basalt-site-footer-toggle", i)).h, 44, "a 44px row", 0.01);
    assert.deepEqual(await toggles.evaluateAll((els) => els.map((el) => el.getAttribute("aria-expanded"))), ["false", "true", "false"], "closed unless the group holds the current page");
    assert.equal(await p.locator(".basalt-site-footer-toggle svg").count(), 3, "a chevron in each row");
    const dividers = await p.locator(".basalt-site-footer-group").evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopWidth));
    assert.deepEqual(dividers, ["0px", "1px", "1px"], "a divider between");
    assert.equal(await p.locator(".basalt-site-footer-group").nth(0).locator("a").first().isVisible(), false, "a closed group's links are not shown");
    assert.equal(await p.locator(".basalt-site-footer-group").nth(1).locator("a").first().isVisible(), true);
    // opening one: aria-expanded and the links
    await toggles.nth(0).click();
    assert.equal(await toggles.nth(0).getAttribute("aria-expanded"), "true");
    assert.equal(await p.locator(".basalt-site-footer-group").nth(0).locator("a").first().isVisible(), true);
    // from 720 up the same page shows the labels, not the disclosures
    await p.setViewportSize({ width: 900, height: 800 });
    assert.equal(await toggles.nth(0).isVisible(), false);
    assert.equal(await p.locator(".basalt-site-footer-label-wide").nth(0).isVisible(), true);
    await p.close();
  });

  test("A1: without script every group is open, two a row", async () => {
    const { page: p } = await fixturePage(browser, `import { renderToString } from "react-dom/server"; document.body.style.margin = "0"; document.getElementById("root").innerHTML = renderToString(<B.SitePage><main>x</main>${footer({ count: 4 })}</B.SitePage>);`, { theme: "dark", viewport: { width: 390, height: 844 } });
    // the server render has no script: no data-wired, so no disclosure shows
    assert.equal(await p.locator(".basalt-site-footer[data-wired]").count(), 0);
    assert.equal(await p.locator(".basalt-site-footer-toggle").first().isVisible(), false);
    const open = await p.locator(".basalt-site-footer-group a").evaluateAll((els) => els.every((el) => el.getBoundingClientRect().height > 0));
    assert.equal(open, true, "every group is open");
    const rows = await p.locator(".basalt-site-footer-group").evaluateAll((els) => { const ys = els.map((el) => Math.round(el.getBoundingClientRect().top)); return [...new Set(ys)].map((y) => ys.filter((v) => v === y).length); });
    assert.deepEqual(rows, [2, 2], "two a row");
    await p.close();
  });

  test("A1 (defect: eight groups took 1,747px at 390): eight groups on a phone fit one screen, closed", async () => {
    const p = await open(page(footer({ count: 8 })), { width: 390, height: 844, ...COARSE, deviceScaleFactor: 2 });
    const body = await rect(p, ".basalt-site-footer");
    const margin = await p.locator(".basalt-site-footer").evaluate((el) => parseFloat(getComputedStyle(el).marginTop));
    assert.ok(body.h + margin <= 844, `eight closed groups are ${body.h + margin}px with the space above, a phone screen is 844`);
    await p.close();
  });

  test("A1: the line form is one unlabelled line of links beside the brand, with no group labels", async () => {
    const p = await open(page(footer({ line: true })), { width: 1440 });
    assert.equal(await p.locator(".basalt-site-footer-label").count(), 0);
    assert.equal(await p.locator(".basalt-site-footer-links ul").count(), 1);
    assert.equal(await p.locator(".basalt-site-footer-links a").count(), 4);
    const id = await rect(p, ".basalt-site-footer-id");
    const links = await rect(p, ".basalt-site-footer-links");
    assert.ok(links.x >= id.right - 0.5, "beside the brand");
    assert.ok(Math.abs(links.y + links.h / 2 - (id.y + id.h / 2)) < 20, "on the brand's line");
    assert.equal(await p.locator("footer nav").count(), 1);
    await p.close();
  });

  test("A1: on a short page the footer sits at the window's foot; on a long page it ends the page", async () => {
    const short = await open(page(footer(), { main: 100 }), { width: 1440, height: 900 });
    const foot = await rect(short, ".basalt-site-footer");
    const padding = await short.locator(".basalt-site-footer").evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    near(foot.bottom, 900, "the footer's box ends at the window's foot", 0.6);
    assert.ok(padding >= 32, "with space-8 inside, at its end");
    assert.equal(await short.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, "a short page does not scroll");
    await short.close();
    const long = await open(page(footer(), { main: 3000 }), { width: 1440, height: 900 });
    const total = await long.evaluate(() => document.documentElement.scrollHeight);
    const end = await long.locator(".basalt-site-footer").evaluate((el) => el.getBoundingClientRect().bottom + scrollY);
    near(end, total, "on a long page the footer ends the page", 0.6);
    await long.close();
  });

  test("A1: the legal line and the theme choice are required: the footer draws them whatever else it has", async () => {
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteFooter legal="Sample Ltd." />);`);
    assert.equal(await p.locator(".basalt-site-footer-legal").textContent(), "Sample Ltd.");
    assert.equal(await p.getByRole("radiogroup", { name: "Theme" }).count(), 1);
    assert.equal(await p.locator(".basalt-site-footer-links").count(), 0, "no links, no nav");
    await p.close();
  });

  test("A1: the legal line is tertiary at 13/18 and at most the prose width", async () => {
    const p = await open(page(footer()));
    const legal = await p.locator(".basalt-site-footer-legal").evaluate((el) => {
      const s = getComputedStyle(el);
      const probe = document.createElement("i"); probe.style.color = "var(--basalt-text-tertiary)"; document.body.append(probe);
      const tertiary = getComputedStyle(probe).color; probe.remove();
      const width = document.createElement("div"); width.style.width = "var(--basalt-size-prose-width)"; document.body.append(width);
      const prose = width.getBoundingClientRect().width; width.remove();
      return { size: s.fontSize, line: s.lineHeight, tertiary: s.color === tertiary, atMost: el.getBoundingClientRect().width <= prose + 0.5 };
    });
    assert.deepEqual(legal, { size: "13px", line: "18px", tertiary: true, atMost: true });
    await p.close();
  });

  test("A1: hung links keep their pill space-1-5 from the window at 390 and 320 (the ring reached the edge in a prototype)", async () => {
    for (const width of [390, 320]) {
      const p = await open(page(footer({ current: 0 })), { width, height: 800 });
      await p.evaluate(() => document.querySelectorAll(".basalt-site-footer-toggle[aria-expanded=false]").forEach((b) => b.click()));
      await settle(p);
      const edge = await p.locator(".basalt-site-footer .basalt-site-pill").first().evaluate((el) => el.getBoundingClientRect().left);
      assert.ok(edge >= 6 - 0.01, `at ${width} the first pill starts ${edge}px from the window; the ring needs space-1-5 (6)`);
      await p.close();
    }
  });

  test("A1 (defect: overflow at 200% text): at 200% text and 320 wide, the footer and its theme choice do not overflow", async () => {
    const p = await open(page(footer({ count: 3, social: false })), { width: 320, height: 800 });
    await p.addStyleTag({ content: `:root { ${["xs", "sm", "base", "md", "lg"].map((k) => `--basalt-text-${k}-size: calc(var(--basalt-text-${k}-size) * 2); --basalt-text-${k}-line-height: calc(var(--basalt-text-${k}-line-height) * 2);`).join(" ")} }` });
    // custom properties cannot refer to themselves; set the doubled values outright instead
    await p.addStyleTag({ content: `:root { --basalt-text-xs-size: 24px; --basalt-text-xs-line-height: 32px; --basalt-text-sm-size: 26px; --basalt-text-sm-line-height: 36px; --basalt-text-base-size: 28px; --basalt-text-base-line-height: 40px; }` });
    await p.evaluate(() => document.querySelectorAll(".basalt-site-footer-toggle[aria-expanded=false]").forEach((b) => b.click()));
    await settle(p);
    const overflow = await p.evaluate(() => ({ page: document.documentElement.scrollWidth - document.documentElement.clientWidth, theme: (() => { const t = document.querySelector(".basalt-theme-choice").getBoundingClientRect(); return t.right - document.documentElement.clientWidth; })(), words: [...document.querySelectorAll(".basalt-segment")].every((el) => el.scrollWidth <= el.clientWidth + 1) }));
    assert.ok(overflow.page <= 0, `the page overflows by ${overflow.page}px`);
    assert.ok(overflow.theme <= 0, `the theme choice overflows by ${overflow.theme}px`);
    assert.equal(overflow.words, true, "each word fits its segment");
    await p.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("B. the theme choice", () => {
  const control = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><B.ThemeChoiceControl /></div>);`;
  const stored = (p) => p.evaluate(() => localStorage.getItem("basalt-theme"));
  const root = (p) => p.evaluate(() => ({ theme: document.documentElement.getAttribute("data-theme"), choice: document.documentElement.getAttribute("data-theme-choice") }));

  test("B1: three states, System, Light and Dark, labelled Theme, as radios in one radio group", async () => {
    const p = await open(control);
    const group = p.getByRole("radiogroup", { name: "Theme" });
    assert.equal(await group.count(), 1);
    assert.deepEqual(await group.getByRole("radio").evaluateAll((els) => els.map((el) => el.textContent)), ["System", "Light", "Dark"]);
    assert.equal(await p.getByRole("radio", { checked: true }).count(), 1);
    assert.equal(await p.getByRole("radio", { name: "System", checked: true }).count(), 1, "nothing stored is System");
    assert.equal(await p.locator(".basalt-theme-choice-label").textContent(), "Theme", "a visible label");
    await p.close();
  });

  test("B1: System is nothing stored: choosing it removes the key, and Light and Dark store theirs", async () => {
    const p = await open2(control);
    await p.getByRole("radio", { name: "Dark" }).click();
    assert.equal(await stored(p), "dark");
    assert.deepEqual(await root(p), { theme: "dark", choice: "dark" });
    await p.getByRole("radio", { name: "Light" }).click();
    assert.equal(await stored(p), "light");
    assert.deepEqual(await root(p), { theme: "light", choice: "light" });
    await p.getByRole("radio", { name: "System" }).click();
    assert.equal(await stored(p), null, "System stores nothing");
    assert.equal((await root(p)).choice, "system");
    await p.close();
  });

  test("B1: a radio group in the segmented control's drawing: one tab stop, arrows move and choose, Home and End go to the ends, and it wraps", async () => {
    const p = await open2(control);
    const stops = await p.locator("[role=radio]").evaluateAll((els) => els.map((el) => el.tabIndex));
    assert.deepEqual(stops, [0, -1, -1], "one tab stop, the chosen word");
    assert.equal(await p.locator(".basalt-theme-choice .basalt-segmented").count(), 1, "the segmented control's drawing");
    await p.getByRole("radio", { name: "System" }).focus();
    await p.keyboard.press("ArrowRight");
    assert.equal(await stored(p), "light", "the arrow moves and chooses");
    assert.equal(await p.evaluate(() => document.activeElement.textContent), "Light", "focus follows");
    await p.keyboard.press("ArrowDown");
    assert.equal(await stored(p), "dark");
    await p.keyboard.press("ArrowRight");
    assert.equal(await stored(p), null, "wraps to System");
    await p.keyboard.press("ArrowLeft");
    assert.equal(await stored(p), "dark", "and back");
    await p.keyboard.press("Home");
    assert.equal(await stored(p), null);
    await p.keyboard.press("End");
    assert.equal(await stored(p), "dark");
    assert.deepEqual(await p.locator("[role=radio]").evaluateAll((els) => els.map((el) => el.tabIndex)), [-1, -1, 0], "the tab stop moved with the choice");
    // Tab leaves the group in one press
    await p.keyboard.press("Tab");
    assert.equal(await p.evaluate(() => document.activeElement === document.body || !document.activeElement.closest("[role=radiogroup]")), true);
    await p.close();
  });

  test("B1: the chosen word is 600 in primary on the raised pill, and its 600 width is reserved so nothing moves", async () => {
    const p = await open(control);
    const widths = async () => p.locator("[role=radio]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
    const before = await widths();
    await p.getByRole("radio", { name: "Dark" }).click();
    const afterChoice = await widths();
    assert.deepEqual(afterChoice, before, "no word changes width when chosen");
    const weights = await p.locator("[role=radio]").evaluateAll((els) => els.map((el) => getComputedStyle(el).fontWeight));
    assert.deepEqual(weights, ["400", "400", "600"]);
    const ink = await p.locator("[role=radio]").evaluateAll((els) => els.map((el) => getComputedStyle(el).color));
    assert.notEqual(ink[2], ink[0], "the chosen word's ink steps up from secondary to primary");
    await p.close();
  });

  test("B1 (defect): the right word is chosen before any script runs, from data-theme-choice alone", async () => {
    // Server-rendered markup, the head script's attribute on the root, and no script at all.
    for (const choice of ["system", "light", "dark"]) {
      const { page: p } = await fixturePage(browser, `import { renderToString } from "react-dom/server"; document.documentElement.setAttribute("data-theme-choice", "${choice}"); document.getElementById("root").innerHTML = renderToString(<B.ThemeChoiceControl />);`, { theme: "dark", viewport: { width: 800, height: 400 } });
      const weights = await p.locator("[role=radio]").evaluateAll((els) => Object.fromEntries(els.map((el) => [el.dataset.value, getComputedStyle(el).fontWeight])));
      assert.deepEqual(weights, { system: "400", light: "400", dark: "400", [choice]: "600" }, `${choice} is the word drawn chosen`);
      const pills = await p.locator("[role=radio]").evaluateAll((els) => Object.fromEntries(els.map((el) => [el.dataset.value, getComputedStyle(el).boxShadow !== "none"])));
      assert.deepEqual(Object.values(pills).filter(Boolean).length, 1, "one word has the pill");
      assert.equal(pills[choice], true);
      await p.close();
    }
  });

  test("B1: with no attribute at all, System is the chosen word (nothing stored)", async () => {
    const { page: p } = await fixturePage(browser, `import { renderToString } from "react-dom/server"; document.getElementById("root").innerHTML = renderToString(<B.ThemeChoiceControl />);`, { theme: "dark", viewport: { width: 800, height: 400 } });
    await p.evaluate(() => document.documentElement.removeAttribute("data-theme-choice"));
    assert.equal(await p.locator("[data-value=system]").evaluate((el) => getComputedStyle(el).fontWeight), "600");
    await p.close();
  });

  test("B1: the head script writes data-theme-choice beside data-theme, from the stored value or the system", async () => {
    const { themeBootstrap } = await import("../dist/theme.js");
    const p = await open2(`document.body.innerHTML = "<p>x</p>";`);
    const run = async (value, scheme) => {
      await p.emulateMedia({ colorScheme: scheme });
      return p.evaluate(({ source, value }) => {
        if (value === null) localStorage.removeItem("basalt-theme"); else localStorage.setItem("basalt-theme", value);
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.removeAttribute("data-theme-choice");
        new Function(source)();
        return { theme: document.documentElement.getAttribute("data-theme"), choice: document.documentElement.getAttribute("data-theme-choice") };
      }, { source: themeBootstrap, value });
    };
    assert.deepEqual(await run(null, "dark"), { theme: "dark", choice: "system" });
    assert.deepEqual(await run(null, "light"), { theme: "light", choice: "system" });
    assert.deepEqual(await run("light", "dark"), { theme: "light", choice: "light" });
    assert.deepEqual(await run("dark", "light"), { theme: "dark", choice: "dark" });
    assert.deepEqual(await run("nonsense", "dark"), { theme: "dark", choice: "system" }, "anything else is System");
    await p.close();
  });

  test("B1: the site header has no theme control: a header with links and an action holds no theme radio group or theme button", async () => {
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteHeader brandLabel="Sample home" lockup={${LOCKUP}} links={${LINKS}} action={<B.Button variant="primary">Start</B.Button>} />);`);
    assert.equal(await p.locator(".basalt-site-header [role=radiogroup], .basalt-site-header [aria-label^=Theme], .basalt-site-header [data-theme-toggle]").count(), 0);
    await p.close();
  });

  test("B1: in an app with no footer the theme is a ghost icon button showing the theme in use, named for the choice, opening a menu of three radio rows", async () => {
    const p = await open2(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><B.ThemeMenu /></div>);`);
    const button = p.getByRole("button", { name: "Theme: System" });
    assert.equal(await button.count(), 1);
    assert.equal(await button.getAttribute("data-variant"), "ghost");
    assert.equal(await button.getAttribute("data-icon-only"), "");
    await button.click();
    const rows = p.getByRole("menuitemradio");
    await rows.first().waitFor();
    assert.deepEqual(await rows.evaluateAll((els) => els.map((el) => [el.textContent, el.getAttribute("aria-checked")])), [["System", "true"], ["Light", "false"], ["Dark", "false"]]);
    await rows.nth(2).click();
    await rows.first().waitFor({ state: "detached" });
    assert.equal(await stored(p), "dark");
    assert.equal(await p.getByRole("button", { name: "Theme: Dark" }).count(), 1, "the name follows the choice");
    // the icon shows the theme in use: a moon in dark, a sun in light
    const dark = await p.getByRole("button", { name: "Theme: Dark" }).innerHTML();
    await p.getByRole("button", { name: "Theme: Dark" }).click();
    await p.getByRole("menuitemradio", { name: "Light" }).click();
    await p.getByRole("menuitemradio").first().waitFor({ state: "detached" });
    const light = await p.getByRole("button", { name: "Theme: Light" }).innerHTML();
    assert.notEqual(dark, light, "the glyph changed with the theme in use");
    await p.getByRole("button", { name: "Theme: Light" }).click();
    await p.getByRole("menuitemradio", { name: "System" }).click();
    await p.getByRole("menuitemradio").first().waitFor({ state: "detached" });
    assert.equal(await stored(p), null);
    assert.equal(await p.getByRole("button", { name: "Theme: System" }).count(), 1);
    await p.close();
  });

  test("B1: in a settings row it is the same three-word control", async () => {
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><B.ThemeChoiceControl words={{ label: "Appearance" }} /></div>);`);
    assert.equal(await p.getByRole("radiogroup", { name: "Appearance" }).count(), 1);
    assert.deepEqual(await p.getByRole("radio").evaluateAll((els) => els.map((el) => el.textContent)), ["System", "Light", "Dark"]);
    await p.close();
  });

  test("B1: the pill slides to the chosen word; under reduced motion and in forced colours each word paints its own", async () => {
    const p = await open(control);
    await p.getByRole("radio", { name: "Light" }).click();
    await p.waitForFunction(() => document.querySelector(".basalt-theme-choice .basalt-segmented").hasAttribute("data-slide"));
    assert.equal(await p.locator(".basalt-theme-choice .basalt-pill").evaluate((el) => getComputedStyle(el).display), "block");
    assert.equal(await p.locator("[data-value=light]").evaluate((el) => getComputedStyle(el).boxShadow), "none", "the word paints no pill of its own while the shared one is drawn");
    await p.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(await p.locator(".basalt-theme-choice .basalt-pill").evaluate((el) => getComputedStyle(el).display), "none");
    assert.notEqual(await p.locator("[data-value=light]").evaluate((el) => getComputedStyle(el).boxShadow), "none", "under reduced motion each word paints its own");
    await p.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
    const forced = await p.locator("[data-value=light]").evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, color: s.color }; });
    assert.notEqual(forced.bg, "rgba(0, 0, 0, 0)", "in forced colours the chosen word is Highlight on HighlightText");
    await p.close();
  });

  test("B1: touch targets are 44px on a coarse pointer, and the control is 28px tall otherwise", async () => {
    const fine = await open(control);
    near((await rect(fine, "[role=radio]")).h, 28, "28px", 0.01);
    await fine.close();
    const touch = await open(control, { width: 390, height: 800, ...COARSE });
    for (let i = 0; i < 3; i += 1) assert.ok((await rect(touch, "[role=radio]", i)).h >= 44 && (await rect(touch, "[role=radio]", i)).w >= 44);
    await touch.close();
  });

  test("B1: the loops toggle is first in the bar's end cluster, before the tools and the primary Button", async () => {
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteHeader brandLabel="Sample home" lockup={${LOCKUP}} links={${LINKS}} loopsToggle={<B.LoopsToggleIcon />} tools={<><B.IconButton icon={B.SearchGlyph} label="Search" /><B.IconButton icon={B.PlusGlyph} label="Saved" /></>} action={<B.Button variant="primary">Start</B.Button>} />);`);
    const order = await p.locator(".basalt-site-bar > .basalt-bar-actions").evaluate((el) => [...el.querySelectorAll(":scope > button, :scope > span > button, :scope > span > a")].map((b) => b.getAttribute("title") || b.getAttribute("aria-label") || b.textContent.trim()));
    assert.deepEqual(order.slice(0, 4), ["Pause animations", "Search", "Saved", "Start"]);
    await p.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("C. parts for a site's own bar", () => {
  const bar = (props = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteHeader brandLabel="Sample home" lockup={${LOCKUP}} links={${LINKS}} ${props} />);`;
  const TOOLS = `tools={<><B.IconButton icon={B.SearchGlyph} label="Search" /><B.IconButton icon={B.PlusGlyph} label="Saved" /></>}`;

  test("C1: the brand link, the pill link list and the narrow menu are exported, with the phase hook", async () => {
    const p = await open(`document.body.innerHTML = JSON.stringify(Object.fromEntries(["SiteBrand", "SiteNav", "SiteNavList", "SiteNavLink", "SiteMenu", "SiteFooter", "SitePage", "SiteLockupDefs", "SitePhaseSlot", "ThemeChoiceControl", "ThemeMenu", "useSitePhase"].map((name) => [name, typeof B[name]])));`);
    const kinds = JSON.parse(await p.evaluate(() => document.body.textContent));
    for (const [name, kind] of Object.entries(kinds)) assert.equal(kind, "function", `${name} is exported`);
    await p.close();
  });

  test("C1: SiteHeader's slots are brand, links, tools and action, in that order, and it never centres", async () => {
    const p = await open(bar(`${TOOLS} action={<B.Button variant="primary">Start</B.Button>}`), { width: 1440 });
    const edge = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { brand: r(".basalt-site-brand"), links: r(".basalt-site-links"), tools: r(".basalt-bar-actions > button"), action: r(".basalt-site-action"), row: r(".basalt-site-bar"), pad: parseFloat(getComputedStyle(document.querySelector(".basalt-site-bar")).paddingLeft) }; });
    near(edge.brand.x, edge.row.x + edge.pad, "the brand starts the row", 0.6);
    near(edge.links.x, edge.brand.right + 16, "the links start beside the brand (space-4), never centred", 0.6);
    assert.ok(edge.brand.right < edge.links.x && edge.links.right < edge.tools.x && edge.tools.x < edge.action.x, "brand, links, tools, action");
    assert.ok(edge.links.x + edge.links.width / 2 < edge.row.x + edge.row.width / 2, `the links are not centred on the bar: ${JSON.stringify(edge.links)} in ${JSON.stringify(edge.row)}`);
    await p.close();
  });

  test("C1: tools stay in the bar at every width, and the links and the action leave under 720", async () => {
    const p = await open(bar(`${TOOLS} action={<B.Button variant="primary">Start</B.Button>}`), { width: 390 });
    assert.equal(await p.getByRole("button", { name: "Search" }).first().isVisible(), true);
    assert.equal(await p.getByRole("button", { name: "Saved" }).first().isVisible(), true);
    assert.equal(await p.locator(".basalt-site-bar .basalt-site-links").isVisible(), false);
    assert.equal(await p.locator(".basalt-site-action").isVisible(), false);
    await p.close();
  });

  test("C1: the narrow menu redraws the brand and the tools, then Close, in its first row, with no theme control", async () => {
    const p = await open(bar(`${TOOLS} loopsToggle={<B.LoopsToggleIcon />} action={<B.Button variant="primary">Start</B.Button>}`), { width: 390 });
    await p.getByRole("button", { name: "Menu" }).click();
    const band = p.locator(".basalt-site-menu-band");
    await band.waitFor();
    assert.equal(await band.locator(".basalt-site-brand").count(), 1);
    assert.equal(await band.getByRole("button", { name: "Search" }).count(), 1);
    assert.equal(await band.getByRole("button", { name: "Saved" }).count(), 1);
    assert.equal(await band.getByRole("button", { name: "Close menu" }).count(), 1);
    assert.equal(await band.locator("[role=radiogroup]").count(), 0);
    // DECISIONS 143 stands: the icon is in the bar, and the menu's first row after the band is the button form
    assert.equal(await band.getByRole("button", { name: "Pause animations" }).count(), 0, "the icon is not added to the band");
    assert.equal(await p.locator(".basalt-site-menu-loops").getByRole("button", { name: "Pause animations" }).count(), 1);
    assert.equal(await p.evaluate(() => document.activeElement.getAttribute("aria-label")), "Close menu", "focus lands on Close");
    await p.close();
  });

  test("C1: the narrow menu's trigger is an icon only: no word, an accessible name, the bar's 44px box", async () => {
    const p = await open(bar(), { width: 390 });
    const trigger = p.getByRole("button", { name: "Menu" });
    assert.equal((await trigger.textContent()).trim(), "");
    assert.equal(await trigger.locator("svg").count(), 1);
    const box = await trigger.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.width, r.height]; });
    assert.deepEqual(box, [44, 44]);
    assert.notEqual(await p.locator(".basalt-site-menu-trigger").evaluate((el) => getComputedStyle(el).display), "none");
    await p.setViewportSize({ width: 900, height: 800 });
    assert.equal(await p.locator(".basalt-site-menu-trigger").evaluate((el) => getComputedStyle(el).display), "none", "gone from 720");
    await p.close();
  });

  test("C1: themeToggle is deprecated and kept for one release: it still draws in the bar", async () => {
    const p = await open(bar(`themeToggle={<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />}`), { width: 1440 });
    assert.equal(await p.locator(".basalt-site-bar").getByRole("button", { name: "Switch theme" }).count(), 1);
    await p.close();
  });

  test("C1: a site's own bar built from the parts keeps the behaviour: the glide, the hit area, the current page, the narrow menu", async () => {
    const own = `document.body.style.margin = "0"; const links = ${LINKS};
      createRoot(document.getElementById("root")).render(<header className="basalt-chrome basalt-site-header">
        <div className="basalt-site-bar">
          <B.SiteBrand label="Sample home" lockup={${LOCKUP}} />
          <B.SiteNav aria-label="Main" links={links} />
          <span className="basalt-bar-spacer" />
          <div className="basalt-bar-actions"><B.SiteMenu brand={<B.SiteBrand label="Sample home" />} links={links} /></div>
        </div></header>);`;
    const wide = await open(own, { width: 1440 });
    assert.equal(await wide.locator(".basalt-site-links > .basalt-plate").count(), 1, "the shared glide plate");
    const hit = await rect(wide, ".basalt-site-link");
    assert.equal(hit.h, 44, "a 44px hit area");
    assert.equal((await rect(wide, ".basalt-site-pill")).h, 32, "on a 32px pill");
    assert.equal(await wide.locator('.basalt-site-link[aria-current="page"]').count(), 1);
    assert.equal(await wide.locator('.basalt-site-link[aria-current="page"] .basalt-site-label').evaluate((el) => getComputedStyle(el).fontWeight), "600");
    await wide.hover(".basalt-site-link >> nth=1");
    await wide.waitForFunction(() => document.querySelector(".basalt-site-links").hasAttribute("data-glide"));
    await wide.close();
    const narrow = await open(own, { width: 390 });
    assert.equal(await narrow.locator(".basalt-site-bar .basalt-site-links").isVisible(), false, "the links leave the bar under 720");
    await narrow.getByRole("button", { name: "Menu" }).click();
    await narrow.getByRole("link", { name: "Docs" }).waitFor();
    assert.equal(await narrow.evaluate(() => document.activeElement.getAttribute("aria-label")), "Close menu");
    await narrow.getByRole("link", { name: "Docs" }).click();
    await narrow.getByRole("link", { name: "Docs" }).waitFor({ state: "detached" });
    assert.equal(await narrow.evaluate(() => document.activeElement.getAttribute("aria-label")), "Menu", "focus goes back to Menu");
    await narrow.close();
  });

  test("C1: SiteNav is the same part in a footer: size sm, a column, hung", async () => {
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 40 }}><B.SiteNav aria-label="Footer links" size="sm" orientation="column" hang links={${LINKS}} /></div>);`);
    assert.equal(await p.locator("nav").getAttribute("data-size"), "sm");
    assert.equal((await rect(p, ".basalt-site-pill")).h, 28);
    const first = await p.locator(".basalt-site-label").first().evaluate((el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().left; });
    near(first, 40, "hung: the words are on the edge the list sits on", 0.6);
    await p.close();
  });

  test("C1 (defect: the end cluster pushed Menu off the screen by 45px at 320): loops, two tools and Menu stay on screen at 320", async () => {
    const p = await open(bar(`${TOOLS} loopsToggle={<B.LoopsToggleIcon />} action={<B.Button variant="primary">Start</B.Button>}`), { width: 320, height: 700 });
    const fit = await p.evaluate(() => { const menu = document.querySelector(".basalt-site-menu-trigger").getBoundingClientRect(); return { right: menu.right, client: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
    assert.ok(fit.right <= fit.client + 0.5, `Menu ends at ${fit.right}, the window at ${fit.client}`);
    assert.ok(fit.overflow <= 0, `the page overflows by ${fit.overflow}px`);
    await p.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("D. a bar that arrives, or leaves and returns", () => {
  const ORDINARY = 600;
  const phasePage = ({ before = 0, props = "" } = {}) => `
    document.body.style.margin = "0";
    function Page() {
      const hero = React.useRef(null);
      return (
        <B.SitePage>
          <B.SkipLink target="main" />
          <B.SiteHeader brandLabel="Sample home" lockup={${LOCKUP}} links={${LINKS}} action={<B.Button variant="primary">Start</B.Button>} phase={${props || "{ after: hero }"}} />
          <main id="main" tabIndex={-1}>
            ${before ? `<div style={{ height: ${before} }} />` : ""}
            <section ref={hero} id="hero" style={{ height: ${ORDINARY} }}><p>Hero</p><a href="#t1" id="hero-link">Hero link</a></section>
            <div style={{ height: 1800 }}>Content</div>
            <h2 id="t1" style={{ margin: 0 }}>Target one</h2>
            <div style={{ height: 3000 }}>More content</div>
            <h2 id="t2" style={{ margin: 0 }}>Target two</h2>
            <div style={{ height: 3000 }}>Yet more</div>
          </main>
        </B.SitePage>
      );
    }
    createRoot(document.getElementById("root")).render(<Page />);`;
  const head = (p, name) => p.evaluate((n) => document.querySelector(".basalt-site-header").getAttribute(n), name);
  const phase = (p) => head(p, "data-phase");
  const to = async (p, y, expected) => {
    await p.evaluate((top) => window.scrollTo(0, top), y);
    if (expected) await p.waitForFunction((e) => document.querySelector(".basalt-site-header").getAttribute("data-phase") === e, expected);
  };
  // The page is ready once the observer has reported and two frames have passed: until then a change is the opening state and switches at once.
  const opened = async (fixture, options = {}) => {
    const p = await open(fixture, { width: 1440, height: 800, ...options });
    await p.waitForFunction(() => document.querySelector(".basalt-site-header")?.hasAttribute("data-phase"));
    await p.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    return p;
  };

  test("D1: three phases from the page's position: rest, between and pinned, back the same way, and the root says which", async () => {
    const p = await opened(phasePage());
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").hasAttribute("data-phase"));
    assert.equal(await phase(p), "rest");
    await to(p, 300, "between");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-site-phase")), "between");
    await to(p, 700, "pinned");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-site-phase")), "pinned");
    await to(p, 300, "between");
    await to(p, 0, "rest");
    assert.deepEqual(p.errors, []);
    await p.close();
  });

  test("D1: where the page is decides, never the direction: scrolling up past the line while pinned does not pin, and a stop between does not show the bar", async () => {
    const p = await opened(phasePage());
    await to(p, 700, "pinned");
    await to(p, 650, "pinned");
    assert.equal(await head(p, "data-form"), "bar");
    await to(p, 300, "between");
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").getAttribute("data-form") === "row");
    await p.close();
  });

  test("D1: one header at every moment: one banner, one primary nav and one brand link, never two copies", async () => {
    const p = await opened(phasePage());
    for (const [y, expected] of [[0, "rest"], [300, "between"], [700, "pinned"]]) {
      await to(p, y, expected);
      const counts = await p.evaluate(() => ({ headers: document.querySelectorAll("header").length, navs: document.querySelectorAll("nav[aria-label=Primary]").length, brands: document.querySelectorAll(".basalt-site-brand").length, dialogs: document.querySelectorAll("[role=dialog]").length }));
      assert.deepEqual(counts, { headers: 1, navs: 1, brands: 1, dialogs: 0 }, `at ${expected}`);
    }
    await p.close();
  });

  test("D1: no scroll handler: the page and the hook add no scroll listener, whatever the scroll", async () => {
    const p = await opened(phasePage(), { });
    await p.addInitScript(() => { window.__scrolls = 0; const add = EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener = function (type, ...rest) { if (type === "scroll") window.__scrolls += 1; return add.call(this, type, ...rest); }; });
    await p.reload();
    await settle(p);
    for (const y of [0, 300, 700, 300, 0]) await to(p, y);
    assert.equal(await p.evaluate(() => window.__scrolls), 0);
    await p.close();
  });

  test("D1: one observer on two 1px sentinels: the hook adds two, and removes them with the header", async () => {
    const p = await opened(phasePage());
    const sizes = await p.locator("[data-basalt-phase-sentinel]").evaluateAll((els) => els.map((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height]));
    assert.deepEqual(sizes, [[1, 1], [1, 1]]);
    const used = await p.evaluate(() => { let made = 0; const Native = window.IntersectionObserver; window.IntersectionObserver = function (...args) { made += 1; return new Native(...args); }; return made; });
    assert.equal(used, 0);
    await p.close();
  });

  test("D1 (defect: opus's two observers missed it): a jump past a sentinel that starts below the fold still pins", async () => {
    // The hero starts 2,400px down, far below the fold of an 800px window; one assignment jumps past it and past both sentinels.
    const p = await opened(phasePage({ before: 2400 }));
    assert.equal(await phase(p), "rest");
    await to(p, 6000, "pinned");
    assert.equal(await head(p, "data-form"), "bar");
    // and back up by a jump to the top
    await to(p, 0, "rest");
    // a jump into the gap between the row and the hero
    await to(p, 1500, "between");
    await p.close();
  });

  test("D1: a page restored below the line opens pinned at once, with no travel", async () => {
    const p = await open2(phasePage(), { height: 800 });
    await to(p, 5000, "pinned");
    assert.equal(await head(p, "data-motion"), "none", "a jump past the line switches at once");
    await p.reload();
    await p.waitForFunction(() => document.querySelector(".basalt-site-header")?.getAttribute("data-phase") === "pinned");
    assert.equal(await head(p, "data-motion"), "none", "a restored scroll opens with no travel");
    assert.equal(await head(p, "data-form"), "bar");
    await p.ctx.close();
  });

  // The transition the bar is running at the frame after `data-motion` says in or out: its timing and its keyframes, read from the Animation object.
  const motion = (p, y, want, options = {}) => p.evaluate(async ({ y, want }) => {
    const header = document.querySelector(".basalt-site-header");
    const until = (match) => new Promise((resolve, reject) => { const stop = setTimeout(() => reject(new Error(`timed out waiting for ${want}`)), 4000); const t = setInterval(() => { if (match()) { clearInterval(t); clearTimeout(stop); resolve(); } }, 2); });
    window.scrollTo(0, y);
    await until(() => header.getAttribute("data-motion") === want);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const running = header.getAnimations().filter((a) => a.transitionProperty === "transform" || a.transitionProperty === "opacity");
    return running.map((a) => { const t = a.effect.getTiming(); return { property: a.transitionProperty, duration: t.duration, easing: t.easing, keyframes: a.effect.getKeyframes().map((k) => ({ transform: k.transform, opacity: k.opacity })) }; });
  }, { y, want });
  const easing = (p, token) => p.evaluate((t) => { const probe = document.createElement("i"); probe.style.transitionTimingFunction = t; document.body.append(probe); const v = getComputedStyle(probe).transitionTimingFunction; probe.remove(); return v; }, token);

  test("D1: it drops in from above its own top edge over duration-slower on ease-out", async () => {
    const p = await opened(phasePage());
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").hasAttribute("data-phase"));
    const [enter] = await motion(p, 630, "in");
    assert.equal(enter.property, "transform");
    assert.equal(enter.duration, 300, "duration-slower");
    assert.equal(enter.easing, await easing(p, "var(--basalt-ease-out)"));
    assert.match(enter.keyframes[0].transform, /translateY\(calc\(-100% - 1px\)\)/, "from above its own top edge (its height and its hairline)");
    assert.match(String(enter.keyframes[1].transform), /^(none|matrix\(1, 0, 0, 1, 0, 0\)|translateY\(0(px)?\))$/);
    await p.close();
  });

  test("D1: it leaves the same way at 0.75 of the time on ease-in", async () => {
    const p = await opened(phasePage());
    await to(p, 630, "pinned");
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").getAttribute("data-motion") === "in");
    await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    const [leave] = await motion(p, 300, "out");
    near(leave.duration, 225, "0.75 of 300ms", 0.01);
    assert.equal(leave.easing, await easing(p, "var(--basalt-ease-in)"));
    assert.match(leave.keyframes[1].transform, /translateY\(calc\(-100% - 1px\)\)/, "up and out the way it came");
    await p.close();
  });

  test("D1: under reduced motion it fades: opacity only, 100ms, no transform", async () => {
    const p = await opened(phasePage(), { reducedMotion: "reduce" });
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").hasAttribute("data-phase"));
    const running = await motion(p, 630, "in");
    assert.deepEqual(running.map((a) => a.property), ["opacity"], "opacity only");
    assert.equal(running[0].duration, 100);
    assert.deepEqual(running[0].keyframes.map((k) => k.opacity), ["0", "1"]);
    assert.equal(await css(p, ".basalt-site-header", "transform"), "none");
    await p.close();
  });

  test("D1: the row keeps its height in every phase, and nothing in the page moves: layout shift 0 over a full scroll down and up", async () => {
    const p = await opened(phasePage());
    await p.evaluate(() => { window.__shift = 0; window.__shiftLog = []; new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) { window.__shift += entry.value; window.__shiftLog.push(entry.sources.map((src) => src.node?.className + " " + JSON.stringify(src.previousRect) + " -> " + JSON.stringify(src.currentRect))); } }).observe({ type: "layout-shift" }); });
    const tops = [];
    for (const y of [0, 20, 100, 300, 560, 600, 700, 1000, 700, 300, 100, 0]) {
      await to(p, y);
      await p.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      tops.push(await p.evaluate(() => ({ slot: document.querySelector(".basalt-site-slot").getBoundingClientRect().height, main: document.querySelector("main").getBoundingClientRect().top + scrollY })));
    }
    for (const t of tops) assert.deepEqual(t, { slot: 56, main: 56 }, "the slot is the resting row's height and the page starts below it, in every phase");
    assert.equal(await p.evaluate(() => window.__shift), 0, `layout shift ${JSON.stringify(await p.evaluate(() => window.__shiftLog))}`);
    await p.close();
  });

  test("D1: pinned, the same element becomes fixed; at rest and between it sits in its slot and scrolls with the page", async () => {
    const p = await opened(phasePage());
    const position = () => p.locator(".basalt-site-header").evaluate((el) => ({ position: getComputedStyle(el).position, parent: el.parentElement.className }));
    assert.deepEqual(await position(), { position: "absolute", parent: "basalt-site-slot" });
    await to(p, 300, "between");
    assert.deepEqual(await position(), { position: "absolute", parent: "basalt-site-slot" });
    await to(p, 700, "pinned");
    assert.deepEqual(await position(), { position: "fixed", parent: "basalt-site-slot" }, "the same element, still in the slot in the tree");
    assert.equal((await rect(p, ".basalt-site-header")).y >= -1, true);
    await p.close();
  });

  test("D1: the site's own CSS restyles it by data-form: the attribute is row or bar", async () => {
    const p = await opened(phasePage());
    assert.equal(await head(p, "data-form"), "row");
    await to(p, 700, "pinned");
    assert.equal(await head(p, "data-form"), "bar");
    await p.close();
  });

  test("D1: focus inside the bar holds it while the page is between, and releasing it lets it go", async () => {
    const p = await opened(phasePage());
    await to(p, 300, "between");
    assert.equal(await head(p, "data-form"), "row");
    await p.locator(".basalt-site-link >> nth=1").evaluate((el) => el.focus({ preventScroll: true }));
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").getAttribute("data-form") === "bar");
    assert.equal(await phase(p), "between", "the phase is still between: the focus holds the bar, it does not change the phase");
    await settle(p);
    assert.equal((await rect(p, ".basalt-site-link", 1)).y >= 0, true, "the focused stop is on screen");
    await p.evaluate(() => document.activeElement.blur());
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").getAttribute("data-form") === "row");
    await p.close();
  });

  test("D1 (defect: grok's cluster dropped focus to the body): focus stays on the same element through every phase", async () => {
    const p = await opened(phasePage());
    await p.locator(".basalt-site-link >> nth=1").evaluate((el) => { el.focus({ preventScroll: true }); el.setAttribute("data-test-focus", ""); });
    for (const [y, expected] of [[300, "between"], [700, "pinned"], [300, "between"], [0, "rest"]]) {
      await to(p, y, expected);
      assert.equal(await p.evaluate(() => document.activeElement?.hasAttribute("data-test-focus")), true, `focus is still on the link at ${expected}`);
    }
    await p.close();
  });

  test("D1 (defect: five stops unseen): a real Tab through a header that moves: every stop is seen, from rest, between and pinned", async () => {
    const stops = async (p, key, count) => {
      const seen = [];
      for (let i = 0; i < count; i += 1) {
        await p.keyboard.press(key);
        await settle(p);
        seen.push(await p.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return { name: "body", seen: false };
          const r = el.getBoundingClientRect();
          const inside = r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
          const at = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
          return { name: el.getAttribute("aria-label") || el.textContent.trim().slice(0, 20), seen: inside && !!at && (el === at || el.contains(at) || at.contains(el)) };
        }));
      }
      return seen;
    };
    // from rest: skip link, brand, four links, Start, then the hero link
    const rest = await opened(phasePage());
    const fromRest = await stops(rest, "Tab", 8);
    assert.ok(fromRest.slice(1).every((s) => s.seen), `from rest: ${JSON.stringify(fromRest.filter((s) => !s.seen))}`);
    await rest.close();
    // from between: focus the hero link where it is, then Shift+Tab back through the bar's stops
    const between = await opened(phasePage());
    await to(between, 300, "between");
    await between.locator("#hero-link").evaluate((el) => el.focus({ preventScroll: true }));
    const back = await stops(between, "Shift+Tab", 6);
    assert.ok(back.every((s) => s.seen), `between, shift-tab: ${JSON.stringify(back.filter((s) => !s.seen))}`);
    await between.close();
    // from pinned: Tab from the hero link's neighbour forward and back
    const pinned = await opened(phasePage());
    await to(pinned, 700, "pinned");
    await pinned.locator("#hero-link").evaluate((el) => el.focus({ preventScroll: true }));
    const upward = await stops(pinned, "Shift+Tab", 6);
    assert.ok(upward.every((s) => s.seen), `pinned, shift-tab: ${JSON.stringify(upward.filter((s) => !s.seen))}`);
    await pinned.close();
  });

  test("D1: an anchor lands at the bar's line plus space-4 in every phase, from scroll-padding-top on the root", async () => {
    const p = await opened(phasePage());
    assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop), "72px");
    for (const [from, expected] of [[0, "rest"], [300, "between"], [700, "pinned"]]) {
      await to(p, from, expected);
      await p.evaluate(() => { history.replaceState(null, "", "#"); location.hash = "#t1"; });
      await p.waitForFunction(() => document.querySelector("#t1").getBoundingClientRect().top < 400);
      near((await rect(p, "#t1")).y, 72, `an anchor jumped to from ${expected} lands at 56 + 16`, 0.6);
      await to(p, 0, "rest");
    }
    await p.close();
  });

  test("D1: while the page is between the focused skip link is space-2 from the window's top; at rest and pinned it is space-2 under the bar", async () => {
    const p = await opened(phasePage());
    const skip = async () => { await p.locator(".basalt-skip-link").evaluate((el) => el.focus({ preventScroll: true })); return (await rect(p, ".basalt-skip-link")).y; };
    near(await skip(), 64, "at rest: 56 + space-2", 0.6);
    await p.evaluate(() => document.activeElement.blur());
    await to(p, 300, "between");
    near(await skip(), 8, "between: space-2 from the window's top", 0.6);
    await p.evaluate(() => document.activeElement.blur());
    await to(p, 700, "pinned");
    near(await skip(), 64, "pinned: 56 + space-2", 0.6);
    await p.close();
  });

  test("D1: a return to rest straight from pinned is at once, and a turn mid-exit travels back from where the bar has reached", async () => {
    const p = await opened(phasePage());
    await to(p, 630, "pinned");
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").getAttribute("data-motion") === "in");
    await to(p, 0, "rest");
    assert.equal(await head(p, "data-motion"), "none", "straight from pinned to rest: at once");
    assert.equal(await head(p, "data-form"), "row");
    await to(p, 630, "pinned");
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").getAttribute("data-motion") === "in");
    // leave to between, and turn back before the exit has finished
    const motions = await p.evaluate(async () => {
      const header = document.querySelector(".basalt-site-header");
      const log = [];
      new MutationObserver(() => log.push(header.getAttribute("data-motion") + ":" + header.getAttribute("data-form"))).observe(header, { attributes: true, attributeFilter: ["data-motion", "data-form"] });
      const until = (match) => new Promise((resolve, reject) => { const stop = setTimeout(() => reject(new Error("timed out")), 4000); const t = setInterval(() => { if (match()) { clearInterval(t); clearTimeout(stop); resolve(); } }, 2); });
      window.scrollTo(0, 300);
      await until(() => header.getAttribute("data-motion") === "out");
      window.scrollTo(0, 630);
      await until(() => header.getAttribute("data-phase") === "pinned");
      return log;
    });
    const out = motions.indexOf("out:bar");
    assert.ok(out >= 0, `the exit began: ${motions}`);
    assert.ok(!motions.slice(out).includes("from:bar"), `a turn mid-exit does not start again from above: ${motions}`);
    assert.ok(motions.slice(out).includes("in:bar"));
    await p.close();
  });

  test("D1: with no trigger the row is the trigger: the bar comes as soon as the row starts to leave, and there is no between", async () => {
    const p = await opened(phasePage({ props: "{}" }));
    await p.waitForFunction(() => document.querySelector(".basalt-site-header").hasAttribute("data-phase"));
    assert.equal(await phase(p), "rest");
    await to(p, 8, "pinned");
    await to(p, 0, "rest");
    await p.close();
  });

  test("D1: the bar prints as part of the page: static and in its slot, not fixed or moved", async () => {
    const p = await opened(phasePage());
    await to(p, 700, "pinned");
    await p.emulateMedia({ media: "print" });
    const style = await p.locator(".basalt-site-header").evaluate((el) => { const s = getComputedStyle(el); return { position: s.position, transform: s.transform, opacity: s.opacity }; });
    assert.notEqual(style.position, "fixed");
    assert.equal(style.transform, "none");
    assert.equal(style.opacity, "1");
    await p.close();
  });

  // Return 1: read from the browser's accessibility tree, not the DOM. Exactly one navigation landmark ("Primary") and one brand link ("Sample home") are exposed in every phase,
  // and a real Tab from the skip link reaches the brand once and each of the bar's links once.
  const exposed = async (p) => {
    const cdp = await p.context().newCDPSession(p);
    await cdp.send("Accessibility.enable");
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    await cdp.detach();
    const shown = nodes.filter((n) => !n.ignored);
    return {
      navigation: shown.filter((n) => n.role?.value === "navigation" && n.name?.value === "Primary").length,
      brand: shown.filter((n) => n.role?.value === "link" && n.name?.value === "Sample home").length,
      banner: shown.filter((n) => n.role?.value === "banner").length,
    };
  };
  for (const [y, expected] of [[0, "rest"], [300, "between"], [630, "pinned"]]) {
    test(`D1 (return 1): at ${expected} the accessibility tree exposes one navigation landmark and one brand link from the header, and Tab reaches each once`, async () => {
      const p = await opened(phasePage());
      await to(p, y, expected);
      await settle(p);
      assert.deepEqual(await exposed(p), { navigation: 1, brand: 1, banner: 1 }, `exposed at ${expected}`);
      // the DOM has no second copy either: the narrow menu's sheet is not rendered until it opens
      assert.deepEqual(await p.evaluate(() => ({ navs: document.querySelectorAll("nav[aria-label=Primary]").length, brands: document.querySelectorAll(".basalt-site-brand").length })), { navs: 1, brands: 1 });
      // a real Tab walk from the skip link
      await p.locator(".basalt-skip-link").evaluate((el) => el.focus({ preventScroll: true }));
      const walk = [];
      for (let i = 0; i < 8; i += 1) {
        await p.keyboard.press("Tab");
        await settle(p);
        walk.push(await p.evaluate(() => document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim() || document.activeElement?.tagName));
      }
      assert.equal(walk.filter((name) => name === "Sample home").length, 1, `the brand link is reached once: ${walk}`);
      for (const name of ["Product", "Docs", "Pricing", "About"]) assert.equal(walk.filter((n) => n === name).length, 1, `${name} is reached once: ${walk}`);
      await p.close();
    });
  }

  test("D1 (return 2): with phase, the caller's ref is set as well as the hook's, as an object and as a callback", async () => {
    const p = await opened(`document.body.style.margin = "0";
      function Page() {
        const mine = React.useRef(null);
        const hero = React.useRef(null);
        React.useEffect(() => { document.body.setAttribute("data-object-ref", mine.current ? mine.current.tagName : "none"); }, []);
        return (<div>
          <B.SiteHeader ref={mine} brandLabel="Sample home" brand={<b>Sample</b>} phase={{ after: hero }} />
          <B.SiteHeader ref={(node) => { if (node) document.body.setAttribute("data-callback-ref", node.tagName); }} brandLabel="Other" brand={<b>Other</b>} />
          <main><section ref={hero} style={{ height: 600 }}>Hero</section><div style={{ height: 3000 }} /></main></div>);
      }
      createRoot(document.getElementById("root")).render(<Page />);`);
    assert.equal(await p.evaluate(() => document.body.getAttribute("data-object-ref")), "HEADER", "the caller's object ref is set");
    assert.equal(await p.evaluate(() => document.body.getAttribute("data-callback-ref")), "HEADER", "a callback ref is set");
    assert.equal(await p.evaluate(() => document.querySelector("header").hasAttribute("data-phase")), true, "and the hook still drives the header that has a ref of its own");
    await p.close();
  });

  test("D1: the header is the smoked bar in every phase, with the bar's 56px, and axe finds nothing in any phase", async () => {
    const p = await opened(phasePage());
    for (const [y, expected] of [[0, "rest"], [300, "between"], [700, "pinned"]]) {
      await to(p, y, expected);
      assert.equal((await css(p, ".basalt-site-header", "height")), "56px");
    }
    await p.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("E. the smoke", () => {
  const smoked = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.SiteHeader brandLabel="Sample home" links={${LINKS}} brand={<b>Sample</b>} />);`;
  const alpha = (value) => Number(/(?:\/|,)\s*([\d.]+)\s*\)/.exec(value)?.[1] ?? "1");

  test("E1: surface-chrome is the page colour at 92.5% in dark and 96% in light, for every product", async () => {
    for (const [theme, expected] of [["dark", 0.925], ["light", 0.96]]) {
      const p = await open(smoked, { theme });
      const fill = await css(p, ".basalt-site-header", "backgroundColor");
      assert.ok(Math.abs(alpha(fill) - expected) < 0.002, `${theme}: the bar's fill is ${fill}`);
      await p.close();
    }
  });

  test("E1: the blur stays 12px, with no saturate", async () => {
    const p = await open(smoked);
    const filter = await css(p, ".basalt-site-header", "backdropFilter");
    assert.equal(filter, "blur(12px)");
    await p.close();
  });

  test("E1: the fallbacks are unchanged: opaque page colour under reduced transparency and in print, Canvas in forced colours", async () => {
    const p = await open(smoked, { theme: "dark" });
    const page = await p.evaluate(() => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-surface-page)"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
    const cdp = await p.context().newCDPSession(p);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    assert.ok(await p.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches), "the query is emulated");
    assert.equal(await css(p, ".basalt-site-header", "backgroundColor"), page);
    assert.equal(await css(p, ".basalt-site-header", "backdropFilter"), "none");
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "no-preference" }] });
    await p.emulateMedia({ media: "print" });
    assert.equal(await css(p, ".basalt-site-header", "backgroundColor"), page);
    await p.emulateMedia({ media: "screen", forcedColors: "active" });
    assert.equal(await css(p, ".basalt-site-header", "backdropFilter"), "none");
    await p.close();
  });

  test("E1: over a white backdrop the dark bar composites to #131313 and over a black one the light bar to #f0f0f0 (the council's figures)", async () => {
    for (const [theme, under, expected] of [["dark", "#fff", [19, 19, 19]], ["light", "#000", [240, 240, 240]]]) {
      const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ background: "${under}", height: 400 }}><B.SiteHeader brandLabel="Sample home" brand={<b />} solid={false} /></div>);`, { theme, width: 400, height: 300 });
      await p.addStyleTag({ content: ".basalt-site-header { border-bottom-color: transparent !important; }" });
      const [px] = await pixels(p, { x: 300, y: 20, width: 1, height: 1 });
      for (let i = 0; i < 3; i += 1) assert.ok(Math.abs(px[i] - expected[i]) <= 1, `${theme}: ${px} vs ${expected}`);
      await p.close();
    }
  });

  test("E1: AGENTS.md and foundations record the new values and not the old", async () => {
    const root = path.join(pkg, "..", "..");
    const foundations = fs.readFileSync(path.join(root, "docs", "foundations.md"), "utf8");
    assert.match(foundations, /`#000` at 92\.5% in dark, `#fafafa` at 96% in light/);
    assert.doesNotMatch(foundations, /`#000` at 85% in dark/);
    assert.match(foundations, /9\.60:1/); // was 7.19:1 before the dark inks were lifted (DECISIONS 166)
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("F. the brand and drawn art", () => {
  const header = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<><B.SiteHeader brandLabel="Sample home" lockup={${LOCKUP}} links={${LINKS}} /><B.SiteFooter brand={<B.SiteBrand label="Sample home" lockup={${LOCKUP}} />} legal="Sample Ltd." /></>);`;
  const shown = (p) => p.evaluate(() => [...document.querySelectorAll(".basalt-site-header .basalt-lockup")].filter((el) => getComputedStyle(el).display !== "none").map((el) => el.classList.contains("basalt-lockup-1x") ? "1x" : "2x"));

  test("F1: the lockup by pixel density is a prop on the brand link: the 1x drawing at 1x and 1.5x, the 2x drawing from 2dppx (2, 2.625, 3 and 4), only one rendered", async () => {
    for (const [scale, expected] of [[1, ["1x"]], [1.5, ["1x"]], [2, ["2x"]], [2.625, ["2x"]], [3, ["2x"]], [4, ["2x"]]]) {
      const p = await open(header, { width: 800, height: 400, deviceScaleFactor: scale });
      assert.deepEqual(await shown(p), expected, `at ${scale}x`);
      const box = await p.locator(".basalt-site-header .basalt-lockup").evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== "none").map((el) => [el.getBoundingClientRect().width, el.getBoundingClientRect().height]));
      assert.deepEqual(box, [expected[0] === "1x" ? [40, 32] : [42, 32]], `its own width, 32 tall, at ${scale}x`);
      await p.close();
    }
  });

  test("F1: each drawing is defined once as a symbol and drawn with use: no file and no id repeats, and no title", async () => {
    const p = await open(header, { width: 390, height: 600 });
    await p.getByRole("button", { name: "Menu" }).click();
    await p.locator(".basalt-site-menu-band .basalt-lockup").first().waitFor({ state: "attached" });
    const report = await p.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
      const header = document.querySelector(".basalt-site-header");
      const symbols = [...header.querySelectorAll("symbol")];
      const sheet = document.querySelector(".basalt-site-menu");
      const uses = [...document.querySelectorAll(".basalt-lockup use")].map((u) => u.getAttribute("href").slice(1));
      return { duplicate: ids.length - new Set(ids).size, symbolsInHeader: symbols.length, symbolsInMenu: sheet.querySelectorAll("symbol").length, resolved: uses.every((id) => document.getElementById(id)?.tagName === "symbol"), uses: uses.length, images: document.querySelectorAll("img").length, titles: document.querySelectorAll(".basalt-lockup title, symbol title").length, headerBrands: header.querySelectorAll(".basalt-site-brand").length, menuBrands: sheet.querySelectorAll(".basalt-site-brand").length };
    });
    assert.equal(report.duplicate, 0, "no id repeats");
    assert.equal(report.symbolsInHeader, 2, "two symbols, defined once for the bar and its menu");
    assert.equal(report.symbolsInMenu, 0, "the menu draws them and defines none");
    assert.equal(report.resolved, true);
    assert.equal(report.uses, 2 + 2 + 2, "the bar, the menu and the footer each draw both");
    assert.equal(report.images, 0, "no file is in the page");
    assert.equal(report.titles, 0, "no title, so no tooltip");
    await p.close();
  });

  test("F1 (defect: the lockup disappeared in forced colours): in forced colours the lockup is still drawn, in the system text colour", async () => {
    const p = await open(header, { width: 800, height: 400, forcedColors: "active", colorScheme: "dark" });
    const box = await p.locator(".basalt-site-header .basalt-lockup:not([style*=none])").evaluateAll((els) => els.filter((el) => getComputedStyle(el).display !== "none").map((el) => { const r = el.getBoundingClientRect(); return { x: Math.floor(r.x), y: Math.floor(r.y), width: Math.ceil(r.width), height: Math.ceil(r.height) }; })[0]);
    const inked = (await pixels(p, box)).filter((px) => px[0] !== px[2] || px[0] > 100 || px[0] < 100).length;
    const background = (await pixels(p, { x: 700, y: 4, width: 1, height: 1 }))[0];
    const different = (await pixels(p, box)).filter((px) => px.some((c, i) => Math.abs(c - background[i]) > 40)).length;
    assert.ok(different > 100, `${different} of ${inked} pixels differ from the bar's ground in forced colours`);
    await p.close();
  });

  test("F1: the brand link is a 44px target with the control ring at +2 round the 32px lockup, radius 6, and no wash", async () => {
    const p = await open(header, { width: 800, height: 400 });
    const link = await rect(p, ".basalt-site-header .basalt-site-brand");
    assert.equal(link.h, 44);
    await p.keyboard.press("Tab");
    const ring = await p.locator(".basalt-site-header .basalt-site-brand-mark").evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.borderRadius]; });
    assert.deepEqual(ring, ["solid", "2px", "2px", "6px"]);
    await p.close();
  });

  const stageFixture = (art, props = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 64 }}><div style={{ width: 400 }}><B.FramedArt aspect="screen" ${props} art={${art}} /></div></div>);`;
  const svg = `<svg viewBox="0 0 100 50"><rect width="100" height="50" fill="var(--basalt-art-tone-1)" /><path d="M0 40H100" stroke="var(--basalt-art-tone-4)" strokeWidth="1" fill="none" /></svg>`;

  test("F3: FramedArt takes art besides src, in the same frame: the rim, radius 12 and the aspect token reserving the box", async () => {
    const p = await open(stageFixture(svg));
    const frame = await p.locator(".basalt-framed-frame").evaluate((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { radius: s.borderTopLeftRadius, ratio: Math.round((r.width / r.height) * 100) / 100, drawn: el.hasAttribute("data-drawn") }; });
    assert.deepEqual(frame, { radius: "12px", ratio: 1.6, drawn: true });
    assert.equal(await p.locator(".basalt-framed-img").count(), 0, "no img when it is drawn");
    await p.close();
  });

  test("F3: fit defaults to slice (the proportions kept, the box filled) and meet shows all of it on art-field; anchor holds the crop", async () => {
    const par = async (props) => { const p = await open(stageFixture(svg, props)); const v = await p.locator(".basalt-framed-art svg").getAttribute("preserveAspectRatio"); await p.close(); return v; };
    assert.equal(await par(""), "xMidYMid slice");
    assert.equal(await par('fit="meet"'), "xMidYMid meet");
    assert.equal(await par('anchor="end floor"'), "xMaxYMax slice");
    assert.equal(await par('fit="meet" anchor="start top"'), "xMinYMin meet");
    const p = await open(stageFixture(`<canvas width="200" height="100" />`, 'anchor="end floor" fit="meet"'));
    const canvas = await p.locator(".basalt-framed-art canvas").evaluate((el) => { const s = getComputedStyle(el); return [s.objectFit, s.objectPosition]; });
    assert.deepEqual(canvas, ["contain", "100% 100%"]);
    await p.close();
  });

  test("F3: a one-drawing frame crops a different amount of width in different boxes but keeps its proportions (a 100x50 drawing in a 400x250 box)", async () => {
    const p = await open(stageFixture(svg));
    const inner = await p.evaluate(() => { const el = document.querySelector(".basalt-framed-art svg"); const box = el.getBoundingClientRect(); const m = el.getScreenCTM(); return { scale: Math.round(m.a * 100) / 100, box: [box.width, box.height] }; });
    near(inner.scale, 5, "slice scales by the larger ratio, so the 50-tall drawing fills the box", 0.1);
    await p.close();
  });

  test("F3: strokes do not scale: a 1px line stays 1px", async () => {
    const p = await open(stageFixture(svg));
    assert.equal(await p.locator(".basalt-framed-art path").evaluate((el) => getComputedStyle(el).vectorEffect), "non-scaling-stroke");
    await p.close();
  });

  test("F3: Stage takes the same two props and its art keeps its proportions and strokes", async () => {
    const stage = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.Stage fit="meet" anchor="end floor" art={${svg}}><div style={{ height: 300 }}>Hero</div></B.Stage>);`;
    const p = await open(stage);
    assert.equal(await p.locator(".basalt-stage-art svg").getAttribute("preserveAspectRatio"), "xMaxYMax meet");
    assert.equal(await p.locator(".basalt-stage-art path").evaluate((el) => getComputedStyle(el).vectorEffect), "non-scaling-stroke");
    await p.close();
  });

  test("F3 (return 2): Stage's fit defaults to slice, as FramedArt's; a drawing's own preserveAspectRatio stands unless a fit or an anchor is passed", async () => {
    const stage = (art, props = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.Stage ${props} art={${art}}><div style={{ height: 300 }}>Hero</div></B.Stage>);`;
    const read = async (art, props) => { const p = await open(stage(art, props)); const v = await p.locator(".basalt-stage-art svg").getAttribute("preserveAspectRatio"); await p.close(); return v; };
    assert.equal(await read(svg), "xMidYMid slice", "no fit, no anchor: slice");
    assert.equal(await read(svg, 'fit="meet"'), "xMidYMid meet");
    assert.equal(await read(svg, 'anchor="end floor"'), "xMaxYMax slice");
    assert.equal(await read(svg.replace("<svg ", '<svg preserveAspectRatio="none" ')), "none", "its own stands");
    assert.equal(await read(svg.replace("<svg ", '<svg preserveAspectRatio="none" '), 'fit="slice"'), "xMidYMid slice", "a prop overrides it");
    // the stage draws what slice draws: the 100x50 drawing fills a box taller than it is wide, cropped, with its proportions
    const p = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<B.Stage art={<svg viewBox="0 0 100 50" style={{ width: "100%", height: "100%" }}><rect width="100" height="50" fill="red" /></svg>}><div style={{ height: 400, width: 200 }}>Hero</div></B.Stage>);`, { width: 200, height: 600 });
    const scale = await p.evaluate(() => document.querySelector(".basalt-stage-art svg").getScreenCTM().a);
    const stageHeight = await p.evaluate(() => document.querySelector(".basalt-stage").getBoundingClientRect().height);
    near(scale * 50, stageHeight, "the drawing's height fills the stage (slice), where meet would have left it letterboxed", 1);
    await p.close();
  });

  test("F3: drawn art is named when it carries meaning, and hidden when decorative", async () => {
    const named = await open(stageFixture(svg, 'alt="A drawing of a field"'));
    assert.equal(await named.getByRole("img", { name: "A drawing of a field" }).count(), 1);
    await named.close();
    const plain = await open(stageFixture(svg));
    assert.equal(await plain.locator(".basalt-framed-art").getAttribute("aria-hidden"), "true");
    await plain.close();
  });

  // The headroom check reads each data-quiet box grown by space-1-5 (6px) on every side.
  const quietPage = (gap) => `<!doctype html><html lang="en" data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basalt</title><style>${fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8")} body { margin: 0; }</style></head><body><div id="root"></div></body></html>`;
  const quietLoad = (gap) => async (page) => {
    await page.setContent(quietPage(gap));
    await page.addScriptTag({ content: await bundleFixture(`createRoot(document.getElementById("root")).render(<B.Stage headroom art={<div id="spot" style={{ position: "absolute", left: 0, top: 0, width: 24, height: 24, background: "#ffffff" }} />}><div style={{ height: 400, paddingTop: 80 }}><div id="zone" data-quiet="title" style={{ width: 160, height: 40, marginLeft: 100 }} /></div></B.Stage>);`) });
    await page.evaluate(async (distance) => {
      const zone = document.getElementById("zone").getBoundingClientRect();
      const spot = document.getElementById("spot");
      const art = spot.parentElement.getBoundingClientRect();
      // a 24px white square whose right edge is `distance` px left of the zone, level with its middle
      spot.style.left = `${zone.left - art.left - distance - 24}px`;
      spot.style.top = `${zone.top - art.top + 8}px`;
    }, gap);
  };

  test("F2: the headroom check reads each data-quiet box grown by space-1-5: ink 5px outside a zone fails, ink 7px outside passes", async () => {
    const near5 = await checkHeadroom(browser, { load: quietLoad(5), themes: ["dark"], widths: [800], scales: [1] });
    assert.equal(near5.ok, false, "a pixel inside the 6px margin crosses the limit");
    assert.equal(near5.failures[0].zone, "title");
    const far7 = await checkHeadroom(browser, { load: quietLoad(7), themes: ["dark"], widths: [800], scales: [1] });
    assert.equal(far7.ok, true, JSON.stringify(far7.failures));
    // a zone's own box is still read: ink inside it fails too
    const inside = await checkHeadroom(browser, { load: quietLoad(-10), themes: ["dark"], widths: [800], scales: [1] });
    assert.equal(inside.ok, false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
describe("System follows the system, and a theme the app set itself survives (return 3), as the skill's does", () => {
  const control = `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24 }}><B.ThemeChoiceControl /></div>);`;
  const frames2 = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const system = async (p, scheme) => { await p.emulateMedia({ colorScheme: scheme }); await frames2(p); };
  const state = (p) => p.evaluate(() => [document.documentElement.getAttribute("data-theme"), document.documentElement.getAttribute("data-theme-choice")].join());

  test("nothing stored and nothing set by hand: System follows the system, live", async () => {
    const p = await open2(control, { theme: "dark", width: 600, height: 300 });
    assert.equal(await state(p), "dark,system");
    await system(p, "light"); assert.equal(await state(p), "light,system");
    await system(p, "dark"); assert.equal(await state(p), "dark,system");
    await p.ctx.close();
  });

  test("a stored Light or Dark does not move when the system's scheme changes", async () => {
    for (const stored of ["light", "dark"]) {
      const p = await open2(control, { theme: "dark", width: 600, height: 300 });
      await p.getByRole("radio", { name: stored === "light" ? "Light" : "Dark" }).click();
      await system(p, "light"); await system(p, "dark");
      assert.equal(await state(p), `${stored},${stored}`);
      await p.ctx.close();
    }
  });

  test("a data-theme the app set by hand, with nothing stored, survives the system's change; picking a choice hands it back", async () => {
    const p = await open2(control, { theme: "dark", width: 600, height: 300 });
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await system(p, "light"); await system(p, "dark");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "light", "the app's own light stands against the system's dark");
    await p.getByRole("radio", { name: "Dark" }).click();
    await p.getByRole("radio", { name: "System" }).click();
    assert.equal(await state(p), "dark,system");
    await system(p, "light");
    assert.equal(await state(p), "light,system", "System follows again");
    // a hand-set value equal to what the hook last wrote is still the app's
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await system(p, "dark");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "light");
    // and picking System again, with the same value on the root, hands it back too
    await p.getByRole("radio", { name: "Light" }).click();
    await p.getByRole("radio", { name: "System" }).click();
    await system(p, "light");
    assert.equal(await state(p), "light,system");
    await system(p, "dark");
    assert.equal(await state(p), "dark,system", "followed after the choice");
    // the app taking its attribute off lets it follow
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await p.evaluate(() => document.documentElement.removeAttribute("data-theme"));
    await system(p, "light"); await system(p, "dark");
    assert.equal(await state(p), "dark,system");
    await p.ctx.close();
  });

  test("a .dark or .light class root is the app's: the hook writes nothing over it when the system changes", async () => {
    const p = await open2(control, { theme: "dark", width: 600, height: 300 });
    await p.evaluate(() => document.documentElement.classList.add("dark"));
    await system(p, "light");
    assert.equal(await p.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark", "still what it was: the system's light was not written");
    await p.ctx.close();
  });
});
