// The version at the sidebar's foot (DECISIONS 320, 1.2): VersionLink, AppShell's `version`, More's last row and the site footer. Driven in
// Chromium against the built package with the real stylesheet. The product, its versions and dates are made up (Harbor).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { HARBOR, RUNNING_BUILD, harborShell } from "./release-fixture.mjs";
import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DATA = `const HARBOR = ${JSON.stringify(HARBOR)}; const RUNNING_BUILD = ${JSON.stringify(RUNNING_BUILD)};`;
const app = (jsx) => `${DATA} document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
function App() { ${jsx} }
createRoot(document.getElementById("root")).render(<App />);`;
const open = async (jsx, { theme = "light", width = 1440, height = 900, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, app(jsx), { theme, viewport: { width, height }, standards: true, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; });
/** How tall a control is to a tap: the run of points down its middle that land on it. */
const hitHeight = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const x = r.left + Math.min(r.width / 2, 20);
  const cy = r.top + r.height / 2;
  const mine = (y) => document.elementFromPoint(x, y)?.closest("a, button") === el;
  let top = cy;
  let bottom = cy;
  while (top > cy - 60 && mine(top - 1)) top--;
  while (bottom < cy + 60 && mine(bottom + 1)) bottom++;
  return Math.round(bottom - top) + 1;
});
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
/** The shell with the version at its foot. */
const FOOT = (version = "1.4.0") => harborShell({ running: version });
/** The words a link draws: its text less what is hidden, and the dot where both parts share a line (the dot is drawn, never text). */
const drawn = (locator) => locator.evaluate((el) => {
  const shown = (part) => {
    if (!part) return "";
    const out = [];
    const walk = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      let hidden = false;
      for (let up = n.parentElement; up && up !== el; up = up.parentElement) if (up.getBoundingClientRect().width <= 1) hidden = true;
      if (hidden) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      if ([...range.getClientRects()].some((r) => r.width > 1)) out.push(n.data);
    }
    return out.join("").replace(/\s+/g, " ").trim();
  };
  const words = shown(el.querySelector(".basalt-version-link-words"));
  const dateEl = el.querySelector(".basalt-version-link-date");
  const date = shown(dateEl);
  if (!date) return words;
  const sameLine = Math.abs(dateEl.getBoundingClientRect().top - el.querySelector(".basalt-version-link-words").getBoundingClientRect().top) < 2;
  return `${words}${sameLine ? " · " : " "}${date}`;
});

describe("the link", () => {
  test("its name is the visible words in order, then where it goes; the date is a calendar date, never moved by a time zone", async () => {
    const page = await open(FOOT(), { timezoneId: "Pacific/Honolulu" });
    const link = page.getByRole("link", { name: "Version 1.4.0, Nov 23, 2026, release notes", exact: true });
    assert.equal(await link.count(), 1);
    assert.equal(await link.getAttribute("href"), "#v1.4.0");
    assert.equal(await drawn(link), "Version 1.4.0 · Nov 23, 2026");
    assert.equal(await page.locator(".basalt-app-sidebar time").getAttribute("datetime"), "2026-11-23");
    const style = await link.first().evaluate((el) => { const s = getComputedStyle(el); return { size: s.fontSize, line: s.lineHeight, family: s.fontFamily, numeric: s.fontVariantNumeric }; });
    assert.deepEqual([style.size, style.line, style.numeric], ["12px", "16px", "tabular-nums"]);
    assert.doesNotMatch(style.family, /mono/i, "Geist, not mono");
  });

  test("it fits the foot's 195px on one line; the room is the sidebar less its edge and the nav glyphs' inset each side", async () => {
    const page = await open(FOOT());
    const link = page.locator(".basalt-app-sidebar .basalt-version-link");
    const room = await page.locator(".basalt-app-version").evaluate((el) => el.getBoundingClientRect().width);
    assert.ok(room >= 194 && room <= 196, `room ${room}`);
    const words = await box(page.locator(".basalt-version-link-words"));
    const date = await box(page.locator(".basalt-version-link-date"));
    assert.equal(Math.round(words.y), Math.round(date.y), "one line");
    assert.equal(Math.round((await box(link)).x), Math.round((await box(page.locator(".basalt-app-version"))).x));
  });

  test("a canary that does not fit: the date goes under the number, with no leading dot, and nothing is wider than the foot", async () => {
    const page = await open(FOOT("1.5.0-canary.20261123.1"));
    const link = await box(page.locator(".basalt-app-sidebar .basalt-version-link"));
    const words = await box(page.locator(".basalt-app-sidebar .basalt-version-link-words"));
    const date = await box(page.locator(".basalt-app-sidebar .basalt-version-link-date"));
    assert.ok(date.y >= words.bottom - 1, "the date is on a line of its own, under the number");
    assert.equal(Math.round(date.x), Math.round(link.x), "it starts the line");
    // The dot stands in the gap before the date: left of the link's own box, which clips it.
    const dot = await page.locator(".basalt-app-sidebar .basalt-version-link-date").evaluate((el) => {
      const s = getComputedStyle(el, "::before");
      return { right: el.getBoundingClientRect().left, clip: getComputedStyle(el.closest("a")).overflowX, content: s.content };
    });
    assert.equal(dot.clip, "clip");
    assert.ok(dot.right <= link.x + 0.5, "the dot is outside the link's box");
    assert.ok(link.width <= 195.5, `the link is ${link.width} wide`);
    // On one line, the dot is drawn between the parts.
    const page2 = await open(FOOT());
    const one = await page2.locator(".basalt-app-sidebar .basalt-version-link-date").evaluate((el) => el.getBoundingClientRect().left - el.closest("a").getBoundingClientRect().left);
    assert.ok(one > 12, "the date follows the number, with the dot in the gap");
  });

  test("on the release notes it is the current page: aria-current, primary ink, the number at 600, and no change of width", async () => {
    const page = await open(`return <div style={{ display: "grid", justifyItems: "start", gap: 8, padding: 16 }}><B.VersionLink data-testid="rest" version="1.4.0" date="2026-11-23" href="#v1.4.0" /><B.VersionLink data-testid="current" current version="1.4.0" date="2026-11-23" href="#v1.4.0" /></div>;`);
    const rest = page.getByTestId("rest");
    const current = page.getByTestId("current");
    assert.equal(await current.getAttribute("aria-current"), "page");
    assert.equal(await rest.getAttribute("aria-current"), null);
    assert.equal((await box(rest)).width, (await box(current)).width);
    const weight = (locator) => locator.locator(".basalt-version-link-number").evaluate((el) => getComputedStyle(el).fontWeight);
    assert.equal(await weight(current), "600");
    assert.equal(await weight(rest), "400");
    const ink = (locator) => locator.evaluate((el) => getComputedStyle(el).color);
    const primary = await page.evaluate(() => { const i = document.createElement("i"); i.style.color = "var(--basalt-text-primary)"; document.body.append(i); const c = getComputedStyle(i).color; i.remove(); return c; });
    assert.equal(await ink(current), primary);
    assert.notEqual(await ink(rest), primary);
    await rest.hover();
    await settle(page);
    assert.equal(await ink(rest), primary, "hover lifts it to primary");
    assert.equal(await rest.locator(".basalt-version-link-words").evaluate((el) => getComputedStyle(el).textDecorationLine), "underline");
  });

  test("24 tall on a fine pointer, and a 44px hit box on touch that moves nothing", async () => {
    const fine = await open(FOOT());
    const at = (page) => page.locator(".basalt-app-sidebar .basalt-version-link");
    assert.equal((await box(at(fine))).height, 24);
    assert.equal(await hitHeight(at(fine)), 24);
    const touch = await open(FOOT(), { hasTouch: true });
    assert.equal((await box(at(touch))).height, 24);
    assert.ok(await hitHeight(at(touch)) >= 44);
  });
});

describe("its places", () => {
  test("at the sidebar's foot: under the account items, space-2 below them, the words on the nav glyphs' start edge", async () => {
    const page = await open(harborShell());
    const link = page.locator(".basalt-app-sidebar .basalt-version-link");
    const glyph = await box(page.locator(".basalt-app-account .basalt-nav-item .basalt-icon").first());
    const account = await box(page.locator(".basalt-app-account .basalt-nav"));
    const own = await box(link);
    assert.equal(Math.round(own.x), Math.round(glyph.x), "on the glyphs' start edge");
    assert.equal(Math.round(own.y - account.bottom), 8, "space-2 under the account items");
    assert.equal(await link.getAttribute("aria-current"), "page");
    // There is no "What's new" item, and nothing marks a release as new.
    assert.equal(await page.getByText(/what's new/i).count(), 0);
    assert.equal(await page.locator(".basalt-nav-dot, .basalt-tabbar-dot").count(), 0);
  });

  test("in the rail: the number alone, centred, the label and the date in its name and its tooltip", async () => {
    const page = await open(harborShell(), { width: 820 });
    const link = page.locator(".basalt-app-sidebar .basalt-version-link");
    assert.equal(await drawn(link), "1.4.0");
    assert.equal(await page.getByRole("link", { name: "Version 1.4.0, Nov 23, 2026, release notes" }).count(), 1);
    const rail = await box(page.locator(".basalt-app-sidebar"));
    const number = await box(link.locator(".basalt-version-link-number"));
    assert.ok(Math.abs((number.x + number.width / 2) - (rail.x + rail.width / 2)) <= 1.5, "centred in the rail");
    await link.hover();
    const tip = page.getByRole("tooltip");
    await tip.waitFor();
    // The tooltip says the whole line: the dot is DotSep's, drawn as a dot and read as a comma.
    assert.equal(await tip.evaluate((el) => [...el.childNodes].map((n) => (n.nodeType === 3 ? n.data : n.classList?.contains("basalt-dot-sep") ? " · " : n.textContent)).join("").replace(/\s+/g, " ").trim()), "Version 1.4.0 · Nov 23, 2026");
  });

  test("in the rail a release candidate breaks before its hyphen, and nothing is wider than the rail", async () => {
    const page = await open(harborShell({ running: "2.0.0-rc.2", date: "2026-12-03" }), { width: 820 });
    const link = page.locator(".basalt-app-sidebar .basalt-version-link");
    const lines = await link.locator(".basalt-version-link-number > span").evaluate((el) => [...el.getClientRects()].length > 1 || el.getBoundingClientRect().height > 20);
    assert.ok(lines, "two lines");
    const pre = await box(link.locator(".basalt-version-link-pre"));
    const rail = await box(page.locator(".basalt-app-sidebar"));
    assert.ok(pre.right <= rail.right, "inside the rail");
    assert.equal(await link.locator(".basalt-version-link-pre").evaluate((el) => el.textContent), "-rc.2");
  });

  test("on a phone: the last row of More's sheet, under a divider, 44 tall, at 13/18, on the nav glyphs' edge", async () => {
    const page = await open(harborShell(), { width: 390, height: 844 });
    await page.getByRole("button", { name: "More, Release notes, current page" }).click();
    await settle(page);
    const row = page.locator(".basalt-tabbar-version");
    await row.waitFor();
    const link = row.locator(".basalt-version-link");
    assert.equal(await drawn(link), "Version 1.4.0 · Nov 23, 2026");
    const style = await row.evaluate((el) => ({ height: el.getBoundingClientRect().height, border: getComputedStyle(el).borderTopWidth, last: el === el.parentElement.lastElementChild || !el.nextElementSibling }));
    assert.ok(style.height >= 44);
    assert.equal(style.border, "1px");
    assert.ok(style.last, "the last row");
    assert.deepEqual(await link.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]), ["13px", "18px"]);
    const glyph = await box(page.locator(".basalt-tabbar-sheet .basalt-nav-item .basalt-icon").first());
    assert.equal(Math.round((await box(link)).x), Math.round(glyph.x));
  });

  test("in a site's footer: after the legal line, on its row, at its 13/18, labelled with the product", async () => {
    const page = await open(`return <B.SitePage><main style={{ height: 200 }} /><B.SiteFooter legal="© 2026 Example" version={<B.VersionLink label="Slate" version="0.2.1" date="2026-11-16" href="/changelog#v0.2.1" />} /></B.SitePage>;`);
    const link = page.getByRole("link", { name: "Slate 0.2.1, Nov 16, 2026, release notes" });
    assert.equal(await link.count(), 1);
    const legal = await box(page.locator(".basalt-site-footer-legal"));
    const own = await box(link);
    assert.ok(own.x > legal.right, "after the legal line");
    assert.ok(Math.abs(own.y + own.height / 2 - (legal.y + legal.height / 2)) < 6, "on its row");
    assert.deepEqual(await link.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]), ["13px", "18px"]);
  });

  for (const theme of ["light", "dark"]) {
    test(`axe finds nothing at the foot, in the rail and in More (${theme})`, async () => {
      for (const width of [1440, 820]) {
        const page = await open(harborShell(), { theme, width });
        assert.deepEqual(await axe(page), [], `${width}`);
        assert.deepEqual(page.errors, []);
      }
      const phone = await open(harborShell(), { theme, width: 390, height: 844 });
      await phone.getByRole("button", { name: /^More/ }).click();
      await settle(phone);
      assert.deepEqual(await axe(phone), []);
    });
  }
});
