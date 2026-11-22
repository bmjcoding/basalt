// The app shell's gaps (cimip-gaps-2, batch B4): the capped, centred shell; a page with a pane; Nav's second size; the header's
// primary under 720; and facts under the header's title. Driven in Chromium against the built package with the real stylesheet.
// The fixtures load no web font, so every text measure here is a box the stylesheet sets, never a word's width. Two unlike domains
// stand in: a support inbox and a build pipeline (synthetic data only).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;

const PANE_LINES = (n) => Array.from({ length: n }, (_, i) => `<p key="${i}" style={{ margin: "0 0 12px" }}>Step ${i + 1} finished in ${(i % 7) + 2}s.</p>`).join("");

const shell = ({ capped = false, facts = null, title = "Inbox", primary = "New reply", pane = 0, secondary = false, root = "", page = 2400, density = "" } = {}) => `
  document.body.style.margin = "0";
  document.body.style.background = "var(--basalt-surface-page)";
  document.body.style.color = "var(--basalt-text-primary)";
  ${root ? `document.documentElement.style.cssText = ${JSON.stringify(root)};` : ""}
  ${density ? `document.documentElement.dataset.density = ${JSON.stringify(density)};` : ""}
  const Page = () => <div style={{ height: ${page} }}><p>Synthetic page.</p></div>;
  const Owner = () => { const owner = B.usePaneScroller(); return <span id="owner" data-owner={owner ? owner.className : "window"} />; };
  createRoot(document.getElementById("root")).render(
    <B.ToastProvider><B.SkipLink target="main" /><B.AppShell ${capped ? "capped" : ""} brand={<>${MARK}<span>Helpdesk</span></>} brandMark={${MARK}} brandLabel="Helpdesk home"
      mainProps={{ id: "main", tabIndex: -1 }}
      sidebar={<><B.Nav aria-label="Primary"><B.NavItem href="#inbox" icon={B.HomeGlyph} current>Inbox</B.NavItem><B.NavItem href="#messages" icon={B.MessagesGlyph} count={4}>Messages</B.NavItem></B.Nav>
        ${secondary ? `<B.Nav aria-label="Saved views" size="sm"><B.NavGroup label="Saved views"><B.NavItem href="#open" icon={B.SourcesGlyph} current>Open and waiting</B.NavItem><B.NavItem href="#mine" icon={B.ProfileGlyph} count={12}>Assigned to me</B.NavItem><B.NavItem href="#late" icon={B.PlanGlyph} dot="New activity">Overdue</B.NavItem></B.NavGroup></B.Nav>` : ""}</>}
      header={<B.AppHeader title=${JSON.stringify(title)} ${facts ? `facts={${facts}}` : ""} actions={<><B.IconButton icon={B.SettingsGlyph} label="Settings" />${primary ? `<B.Button variant="primary">${primary}</B.Button>` : ""}</>} />}
      tabBar={<B.TabBar><B.TabBarItem href="#inbox" icon={B.HomeGlyph} current>Inbox</B.TabBarItem><B.TabBarItem href="#messages" icon={B.MessagesGlyph}>Messages</B.TabBarItem><B.TabBarItem href="#settings" icon={B.SettingsGlyph}>Settings</B.TabBarItem></B.TabBar>}>
      ${pane ? `<B.PaneLayout paneLabel="Run details" pane={<div><Owner /><h2 style={{ margin: "0 0 12px" }}>Run 1284</h2><B.Link href="#log">Open the log</B.Link>${PANE_LINES(pane)}</div>}><Page /></B.PaneLayout>` : "<Page />"}
    </B.AppShell></B.ToastProvider>);`;

const open = async (fixture, { width = 1440, height = 800, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const contentWidth = (page) => page.evaluate(() => document.documentElement.clientWidth);
const css = (page, selector, property, n = 0) => page.locator(selector).nth(n).evaluate((el, p) => getComputedStyle(el)[p], property);
const resolve = (page, value, property = "color") => page.evaluate(({ value, property }) => { const probe = document.createElement("div"); document.body.append(probe); probe.style[property] = value; const c = getComputedStyle(probe)[property]; probe.remove(); return c; }, { value, property });
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }, resultTypes: ["violations"] });
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};

describe("the capped shell", () => {
  test("on a wide window the whole shell is size-sidebar-width + size-page-width and centred; the page is exactly its own 72rem", async () => {
    const page = await open(shell({ capped: true }), { width: 1920 });
    const cw = await contentWidth(page);
    const s = await box(page, ".basalt-app-shell");
    near(s.w, 256 + 1152, "the cap is the sidebar plus the page's own cap", 0.05);
    near(s.x, (cw - s.w) / 2, "centred", 0.5);
    const side = await box(page, ".basalt-app-sidebar");
    near(side.x, s.x, "the sidebar starts the shell", 0.05);
    const main = await box(page, ".basalt-app-main");
    near(main.w, 1152, "the page is its own cap at the shell's", 0.05);
    near(main.x, side.right, "beside the sidebar", 0.05);
    const head = await box(page, ".basalt-app-header");
    near(head.x, side.right, "the header starts at the sidebar's edge", 0.05);
    near(head.right, s.right, "and ends at the shell's end", 0.05);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  for (const width of [1408, 1300, 1024, 900, 390]) {
    test(`at ${width} the capped shell draws what the uncapped one does`, async () => {
      const read = async (capped) => {
        const page = await open(shell({ capped }), { width });
        const out = await page.evaluate(() => [".basalt-app-shell", ".basalt-app-sidebar", ".basalt-app-header", ".basalt-app-main", ".basalt-app-title"].map((sel) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); return [sel, getComputedStyle(el).display === "none" ? "none" : [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 100) / 100).join(",")]; }));
        await page.close();
        return out;
      };
      assert.deepEqual(await read(true), await read(false));
    });
  }

  test("an app sets --basalt-shell-width on the root for another cap, and the page fills its column", async () => {
    const page = await open(shell({ capped: true, root: "--basalt-shell-width: 100rem" }), { width: 1920 });
    near((await box(page, ".basalt-app-shell")).w, 1600, "the app's cap", 0.05);
    near((await box(page, ".basalt-app-main")).w, 1600 - 256, "the page fills the column", 0.05);
    await page.close();
  });

  test("the uncapped shell is unchanged: it fills the window and the page is capped at 72rem, start-aligned", async () => {
    const page = await open(shell(), { width: 1920 });
    const s = await box(page, ".basalt-app-shell");
    assert.equal(s.x, 0);
    near(s.w, await contentWidth(page), "the window", 0.05);
    near((await box(page, ".basalt-app-main")).w, 1152, "72rem", 0.05);
    assert.equal(await page.locator(".basalt-app-shell").getAttribute("data-capped"), null);
    await page.close();
  });

  test("the skip link moves in with the capped shell: on the brand's start edge, under the bar", async () => {
    const page = await open(shell({ capped: true }), { width: 1920 });
    await page.keyboard.press("Tab");
    const link = await box(page, ".basalt-skip-link");
    const s = await box(page, ".basalt-app-shell");
    near(link.x, s.x + 24, "the shell's start plus the gutter", 1);
    assert.ok(link.y >= 56, `under the bar (${link.y})`);
    await page.close();
  });
});

describe("a page with a pane", () => {
  test("beside the page from 920px of its own width: 256 wide at the end, the gutter between, sticky under the bar", async () => {
    const page = await open(shell({ pane: 4 }), { width: 1440, height: 700 });
    const grid = await box(page, ".basalt-pane-grid");
    const pane = await box(page, ".basalt-pane");
    const body = await box(page, ".basalt-pane-page");
    near(pane.w, 256 + 12, "256 and space-1-5 either side", 0.05);
    near(pane.right, grid.right + 6, "at the end, reaching space-1-5 past it", 0.05);
    near(pane.x + 6 - body.right, 24, "the gutter between", 0.05);
    near(pane.y + 6, 56 + 24, "its content starts with the page's", 0.05);
    assert.equal(await page.locator(".basalt-pane").getAttribute("role"), null);
    assert.equal(await page.getByRole("region", { name: "Run details" }).count(), 1, "a region named by paneLabel");
    await page.mouse.move(500, 400);
    await page.mouse.wheel(0, 900);
    await settle(page);
    assert.ok(await page.evaluate(() => scrollY) > 500, "the document scrolled");
    near((await box(page, ".basalt-pane")).y + 6, 56 + 24, "the pane stays in view, space-6 under the bar", 0.05);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  test("a pane taller than the window has a height of its own, scrolls inside, and is a tab stop while it overflows", async () => {
    const page = await open(shell({ pane: 60 }), { width: 1440, height: 700 });
    const pane = await box(page, ".basalt-pane");
    near(pane.h, 700 - 56 - (24 - 6) - (64 - 6), "the window less the bar, space-6 above the content and space-16 below it", 0.5);
    // Read to the end of the page, the pane still sits under the bar: it never slides up behind it.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await settle(page);
    assert.ok((await box(page, ".basalt-pane")).y + 6 >= 56 + 24 - 0.5, "at the page's end the pane is still under the bar");
    const facts = await page.locator(".basalt-pane").evaluate((el) => ({ over: el.scrollHeight > el.clientHeight, y: getComputedStyle(el).overflowY, contain: getComputedStyle(el).overscrollBehaviorY, tab: el.getAttribute("tabindex") }));
    assert.deepEqual(facts, { over: true, y: "auto", contain: "contain", tab: "0" });
    const before = await page.evaluate(() => scrollY);
    await page.locator(".basalt-pane").focus();
    await page.keyboard.press("PageDown");
    await settle(page);
    assert.ok(await page.locator(".basalt-pane").evaluate((el) => el.scrollTop) > 0, "the keys scroll the pane");
    assert.equal(await page.evaluate(() => scrollY), before, "and not the document");
    const ring = await page.locator(".basalt-pane").evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
    assert.deepEqual(ring, ["solid", "2px", "2px"]);
    await page.close();
  });

  test("what scrolls a part inside the pane: the pane beside the page, the window under it", async () => {
    let page = await open(shell({ pane: 60 }), { width: 1440, height: 700 });
    assert.equal(await page.locator("#owner").getAttribute("data-owner"), "basalt-pane");
    assert.equal(await page.locator(".basalt-pane").getAttribute("data-scroller"), "");
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.waitForFunction(() => document.querySelector("#owner").dataset.owner === "window");
    assert.equal(await page.locator(".basalt-pane").getAttribute("data-scroller"), null);
    await page.close();
    page = await open(shell({ pane: 60 }), { width: 390, height: 700 });
    assert.equal(await page.locator("#owner").getAttribute("data-owner"), "window");
    await page.close();
  });

  test("a pane that fits is no tab stop", async () => {
    const page = await open(shell({ pane: 3 }), { width: 1440, height: 800 });
    assert.equal(await page.locator(".basalt-pane").getAttribute("tabindex"), null);
    await page.close();
  });

  for (const [width, why] of [[1100, "the sidebar's page under 920"], [900, "the rail"], [390, "a phone"]]) {
    test(`at ${width} (${why}) the pane follows the page in the flow, with no height of its own`, async () => {
      const page = await open(shell({ pane: 60 }), { width, height: 700 });
      const body = await box(page, ".basalt-pane-page");
      const pane = await box(page, ".basalt-pane");
      near(pane.x, body.x, "under the page, on its start edge", 0.05);
      assert.ok(pane.y >= body.bottom, "after the page");
      assert.equal(await css(page, ".basalt-pane", "position"), "static");
      assert.equal(await css(page, ".basalt-pane", "maxHeight"), "none");
      assert.equal(await page.locator(".basalt-pane").getAttribute("tabindex"), null);
      await page.close();
    });
  }

  test("in print the pane is in the flow", async () => {
    const page = await open(shell({ pane: 60 }), { width: 1440, height: 700 });
    await page.emulateMedia({ media: "print" });
    assert.equal(await css(page, ".basalt-pane", "position"), "static");
    assert.equal(await css(page, ".basalt-pane", "overflowY"), "visible");
    await page.close();
  });
});

describe("Nav at its second size", () => {
  test("size=\"sm\": a 32px hugging pill at 13/18, the glyph at 16, 2px above and below; current is the selected glyph and 600", async () => {
    for (const theme of ["dark", "light"]) {
      const page = await open(shell({ secondary: true }), { width: 1440, theme });
      const sm = ".basalt-nav[data-size=sm]";
      const pill = await box(page, `${sm} .basalt-nav-pill`);
      assert.equal(pill.h, 32);
      assert.equal((await box(page, `${sm} .basalt-nav-item`)).h, 36);
      const label = await page.locator(`${sm} .basalt-nav-label`).first().evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.lineHeight, s.fontWeight]; });
      assert.deepEqual(label, ["13px", "18px", "600"], "the current item is 600");
      assert.equal(await css(page, `${sm} .basalt-nav-label`, "fontWeight", 1), "400");
      assert.equal((await box(page, `${sm} .basalt-icon`)).w, 16);
      assert.equal(await css(page, `${sm} .basalt-nav-pill`, "borderTopLeftRadius"), "9999px");
      assert.equal(await css(page, `${sm} .basalt-nav-count`, "fontSize"), "12px");
      assert.equal(await css(page, `${sm} .basalt-nav-count`, "color"), await resolve(page, "var(--basalt-text-secondary)"));
      assert.equal(await page.locator(`${sm} [aria-current=page]`).count(), 1);
      // the main list is untouched
      assert.equal((await box(page, ".basalt-nav:not([data-size]) .basalt-nav-pill")).h, 48);
      assert.equal(await css(page, ".basalt-nav[data-size=sm]", "marginTop"), "16px", "a group label's step below the main list");
      assert.deepEqual(page.errors, []);
      await page.close();
    }
  });

  test("hover is the pill at the selected wash; focus is the control ring at +2 round the pill", async () => {
    const page = await open(shell({ secondary: true }), { width: 1440 });
    const item = page.locator(".basalt-nav[data-size=sm] .basalt-nav-item").nth(1);
    await page.locator(".basalt-nav[data-size=sm] .basalt-nav-item").nth(1).evaluate((el) => el.closest(".basalt-nav").removeAttribute("data-glide"));
    await item.hover();
    await settle(page);
    const plate = await page.locator(".basalt-nav[data-size=sm] > .basalt-plate").evaluate((el) => { const r = el.getBoundingClientRect(); return { h: r.height, o: getComputedStyle(el).opacity }; });
    assert.equal(plate.h, 32, "the shared pill takes the small pill's height");
    await item.focus({ focusVisible: true });
    await page.keyboard.press("Shift");
    const ring = await page.locator(".basalt-nav[data-size=sm] .basalt-nav-pill").nth(1).evaluate((el) => { const s = getComputedStyle(el); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
    assert.deepEqual(ring, ["solid", "2px", "2px"]);
    await page.close();
  });

  test("compact steps it to 28, touch keeps it at 44, and in the rail it is a 32 circle", async () => {
    let page = await open(shell({ secondary: true, density: "compact" }), { width: 1440 });
    assert.equal((await box(page, ".basalt-nav[data-size=sm] .basalt-nav-pill")).h, 28);
    await page.close();
    page = await open(shell({ secondary: true }), { width: 1440, hasTouch: true, isMobile: true });
    assert.equal((await box(page, ".basalt-nav[data-size=sm] .basalt-nav-pill")).h, 44);
    await page.close();
    page = await open(shell({ secondary: true }), { width: 900 });
    const pill = await box(page, ".basalt-nav[data-size=sm] .basalt-nav-pill");
    assert.deepEqual([pill.w, pill.h], [32, 32]);
    near(pill.x + 16, 36, "on the rail's centre line", 0.5);
    assert.ok(await page.getByRole("link", { name: /Assigned to me/ }).count() > 0, "the label is the name");
    await page.close();
  });
});

describe("the header's facts", () => {
  const FACTS = `[<B.InlineCode key="r">PR-412</B.InlineCode>, <B.Badge key="s" variant="plain" status="warning">Needs review</B.Badge>, <span key="t">Updated 12 min ago</span>]`;

  for (const width of [1440, 390]) {
    for (const theme of ["dark", "light"]) {
      test(`a line under the title at 13/18 in secondary ink; the two are 44 together, centred in the bar (${width}, ${theme})`, async () => {
        const page = await open(shell({ title: "Build 1284", facts: FACTS }), { width, theme });
        const bar = await box(page, ".basalt-app-header");
        assert.equal(bar.h, 56, "the bar keeps its 56");
        const title = await box(page, ".basalt-app-title");
        const facts = await box(page, ".basalt-app-facts");
        assert.equal(title.h, 26);
        assert.equal(facts.h, 18);
        near(facts.y, title.bottom, "directly under the title", 0.05);
        near(title.y - bar.y, 6.5, "centred: 6.5 above (counting the bar's 1px line at its foot)", 0.6);
        const style = await page.locator(".basalt-app-facts").evaluate((el) => { const s = getComputedStyle(el); return [s.fontSize, s.lineHeight, s.color, s.whiteSpace, s.textOverflow, el.tagName]; });
        assert.deepEqual(style, ["13px", "18px", await resolve(page, "var(--basalt-text-secondary)"), "nowrap", "ellipsis", "P"]);
        assert.equal(await page.locator(".basalt-app-facts .basalt-dot-sep").count(), 2, "joined by two dots");
        // drawn with dots, read and copied with commas (DotLine)
        assert.equal((await page.locator(".basalt-app-facts").textContent()).replace(/\s+/g, " ").trim(), "PR-412, Needs review, Updated 12 min ago");
        assert.equal(await page.locator("h1").count(), 1);
        assert.equal(await page.locator("h1").innerText(), "Build 1284", "the facts are not in the heading");
        assert.deepEqual(page.errors, []);
        await page.close();
      });
    }
  }

  test("an empty fact is left out with its dot, and with no facts the bar is the title alone, as before", async () => {
    let page = await open(shell({ facts: `[null, <span key="a">Waiting on the customer</span>, false, ""]` }));
    assert.equal(await page.locator(".basalt-app-facts .basalt-dot-sep").count(), 0);
    assert.equal(await page.locator(".basalt-app-facts").innerText(), "Waiting on the customer");
    await page.close();
    page = await open(shell({ facts: "[]" }));
    assert.equal(await page.locator(".basalt-app-heading").count(), 0);
    assert.equal(await page.locator(".basalt-app-bar > h1.basalt-app-title").count(), 1);
    await page.close();
  });

  test("a long line is cut with an ellipsis and never pushes the actions", async () => {
    const long = `[<span key="a">${"Waiting on a reply from the customer about the refund ".repeat(4)}</span>]`;
    const page = await open(shell({ facts: long }), { width: 390 });
    const facts = await page.locator(".basalt-app-facts").evaluate((el) => ({ cut: el.scrollWidth > el.clientWidth }));
    assert.ok(facts.cut);
    const actions = await box(page, ".basalt-bar-actions");
    near(actions.right, (await contentWidth(page)) - 16, "the actions end on the gutter", 0.05);
    await page.close();
  });
});

describe("the header's primary under 720", () => {
  for (const theme of ["dark", "light"]) {
    test(`it stays in the bar with its words, 44 tall like the bar's other buttons, and the title gives way (${theme})`, async () => {
      const page = await open(shell({ title: "A long title for a shared document that will not fit", primary: "New reply" }), { width: 390, theme });
      const primary = page.locator(".basalt-app-header .basalt-button[data-variant=primary]");
      assert.equal(await primary.isVisible(), true);
      const b = await box(page, ".basalt-app-header .basalt-button[data-variant=primary]");
      assert.equal(b.h, 44);
      near(b.right, (await contentWidth(page)) - 16, "at the bar's end, on the gutter", 0.05);
      assert.equal(await primary.innerText(), "New reply", "its words stay");
      const title = await page.locator(".basalt-app-title").evaluate((el) => ({ cut: el.scrollWidth > el.clientWidth, right: el.getBoundingClientRect().right }));
      assert.ok(title.cut, "the title is what is cut");
      assert.ok(title.right <= (await box(page, ".basalt-bar-actions")).x, "and it never runs under the actions");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, "nothing overflows the page");
      await page.close();
    });
  }

  test("at 320 the bar still holds the title, a tool and the primary", async () => {
    const page = await open(shell({ title: "Inbox", primary: "New" }), { width: 320 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    const b = await box(page, ".basalt-app-header .basalt-button[data-variant=primary]");
    assert.ok(b.right <= 320 - 16 + 0.05);
    await page.close();
  });
});

describe("accessibility", () => {
  for (const theme of ["dark", "light"]) {
    for (const width of [1440, 390]) {
      test(`axe finds nothing on a capped shell with a pane, a small Nav and facts (${theme}, ${width})`, async () => {
        const page = await open(shell({ capped: true, pane: 60, secondary: true, facts: `[<span key="a">Ticket 2291</span>, <B.Badge key="b" variant="plain" status="success">Solved</B.Badge>]` }), { width, theme, height: 700 });
        assert.deepEqual(await axe(page), []);
        assert.deepEqual(page.errors, []);
        await page.close();
      });
    }
  }
});
