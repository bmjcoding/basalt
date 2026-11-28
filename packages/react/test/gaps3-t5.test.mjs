// cimip-gaps-3, topic T5 (design, the council's decision, `cimip-gaps-3/t5/decision.md`): the app page's rhythm and ladder, AppHeader's title on a phone,
// the short window, the rail at every width, the wide sheet, the account in a site header, the lockup and the footnote, MessagePage, StatusBar pinned, the
// stream's quiet actions and the time as a link (with the touch exception of DECISIONS 393), ConnectionBar, the tray's hold, names, first line and order,
// and Callout's meta. Driven in Chromium against the built package and its stylesheet. Synthetic data in two unlike domains (a tide gauge and a bakery).
// Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const WIDE = { viewport: { width: 1440, height: 900 } };
const DESKTOP = { viewport: { width: 1000, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const NARROW = { viewport: { width: 320, height: 700 }, hasTouch: true, isMobile: true };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, standards: true, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; } button, input { font: inherit; }" });
  await settle(page);
  return { page, errors };
};
const rect = (page, selector) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom, top: r.top, left: r.left } : null; }, selector);
const rects = (page, selector) => page.evaluate((s) => [...document.querySelectorAll(s)].map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; }), selector);
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
const axe = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] })).violations.map((v) => v.id));
};
/** The element a press at a point reaches (the hit test), as a selector check. */
const hits = (page, x, y, selector) => page.evaluate(([px, py, s]) => !!document.elementFromPoint(px, py)?.closest(s), [x, y, selector]);

const SHELL = (main, { header = `<B.AppHeader title="Harbour gauge" />`, extra = "" } = {}) => `
<B.AppShell brand={<span>Gauge</span>} brandLabel="Gauge home" sidebar={<B.Nav aria-label="Primary"><B.NavGroup><B.NavItem href="#a" icon={B.HomeGlyph} current>Readings</B.NavItem></B.NavGroup></B.Nav>} header={${header}} ${extra}>
  ${main}
</B.AppShell>`;

// ---- 1. Rhythm
describe("the app page's rhythm", () => {
  const PAGE = `
<B.AppSections id="sections">
  <B.AppSection id="s1"><B.AppSectionHead title="Tides" description="High and low water at the outer gauge." actions={<><B.Button size="sm">Export</B.Button><B.Button size="sm">Compare</B.Button><B.Button size="sm" variant="ghost" edge="end">Settings</B.Button></>} /><p id="body1"><a href="#x" id="first-control">First reading</a></p></B.AppSection>
  <B.AppSection id="s2"><B.AppSectionHead title="Sensors" />
    <B.AppSections id="nested"><B.AppSection id="n1"><B.AppSectionHead id="subhead" title="Probe A" /><p>Ok</p></B.AppSection><B.AppSection><B.AppSectionHead title="Probe B" level={5} /><p>Ok</p></B.AppSection></B.AppSections>
  </B.AppSection>
</B.AppSections>`;

  test("the gaps: 48 from 720, 32 under it, 40 in a tab panel, 32 nested", async () => {
    for (const [options, gap] of [[WIDE, 48], [PHONE, 32]]) {
      const { page } = await open(render(SHELL(PAGE)), options);
      assert.equal(await page.$eval("#sections", (el) => getComputedStyle(el).rowGap), `${gap}px`);
      assert.equal(await page.$eval("#nested", (el) => getComputedStyle(el).rowGap), "32px");
      await page.close();
    }
    const { page } = await open(render(SHELL(`<B.Tabs defaultValue="a"><B.TabsList><B.Tab value="a">Bread</B.Tab></B.TabsList><B.TabsPanel value="a"><B.AppSections id="inpanel"><B.AppSection><B.AppSectionHead title="Loaves" /></B.AppSection></B.AppSections></B.TabsPanel></B.Tabs>`)), WIDE);
    assert.equal(await page.$eval("#inpanel", (el) => getComputedStyle(el).rowGap), "40px");
    await page.close();
  });

  test("the head's size is its position: 16/24 at the top, 14/20 in a sub-section; level changes the tag only", async () => {
    const { page } = await open(render(SHELL(PAGE)), WIDE);
    const read = (s) => page.$eval(s, (el) => { const cs = getComputedStyle(el); return [el.tagName, cs.fontSize, cs.lineHeight, cs.fontWeight]; });
    assert.deepEqual(await read("#s1 .basalt-app-section-title"), ["H2", "16px", "24px", "600"]);
    assert.deepEqual(await read("#n1 .basalt-app-section-title"), ["H3", "14px", "20px", "600"]);
    const five = await page.evaluate(() => { const el = document.querySelectorAll("#nested .basalt-app-section-title")[1]; const cs = getComputedStyle(el); return [el.tagName, cs.fontSize]; });
    assert.deepEqual(five, ["H5", "14px"]);
    assert.equal(await page.$eval("#s1", (el) => el.getAttribute("aria-labelledby")), await page.$eval("#s1 .basalt-app-section-title", (el) => el.id));
    await page.close();
  });

  test("at 320 with three actions: no wider than the window, the actions under the title in the flow, the last action and the first body control hit at their centres", async () => {
    const { page } = await open(render(SHELL(PAGE)), NARROW);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "the document is no wider than the window");
    const title = await rect(page, "#s1 .basalt-app-section-title");
    const actions = await rect(page, "#s1 .basalt-app-head-actions");
    assert.ok(actions.y >= title.bottom - 0.5, "the actions are under the title");
    const buttons = await rects(page, "#s1 .basalt-app-head-actions .basalt-button");
    const last = buttons.at(-1);
    assert.ok(await hits(page, last.x + last.width / 2, last.y + last.height / 2, "#s1 .basalt-app-head-actions .basalt-button:last-child"));
    const link = await rect(page, "#first-control");
    assert.ok(await hits(page, link.x + link.width / 2, link.y + link.height / 2, "#first-control"));
    await page.close();
  });

  test("at 390 on touch no action's box overlaps the title, the description or the body (0px)", async () => {
    const { page } = await open(render(SHELL(PAGE)), PHONE);
    const buttons = await rects(page, "#s1 .basalt-app-head-actions .basalt-button");
    for (const other of [await rect(page, "#s1 .basalt-app-section-title"), await rect(page, "#s1 .basalt-app-section-description"), await rect(page, "#body1")]) {
      for (const button of buttons) assert.equal(overlap(button, other), 0);
    }
    await page.close();
  });

  test("from 720 on a fine pointer one row of sm actions adds 0px to the head and a second row adds its own height", async () => {
    const one = `<B.AppSectionHead id="h" title="Tides" actions={<B.Button size="sm">Export</B.Button>} />`;
    const bare = `<B.AppSectionHead id="h" title="Tides" />`;
    const heights = [];
    for (const head of [bare, one]) {
      const { page } = await open(render(`<div style={{ width: 800 }}><B.AppSection>${head}</B.AppSection></div>`), WIDE);
      heights.push((await rect(page, "#h")).height);
      await page.close();
    }
    assert.ok(Math.abs(heights[0] - heights[1]) < 0.5, `one row adds ${heights[1] - heights[0]}px`);
    const { page } = await open(render(`<div style={{ width: 600 }}><B.AppSection><B.AppSectionHead id="h" title="Tides" actions={<>${Array.from({ length: 6 }, (_, i) => `<B.Button size="sm">Action ${i}</B.Button>`).join("")}</>} /></B.AppSection></div>`), WIDE);
    const rows = await page.evaluate(() => new Set([...document.querySelectorAll("#h .basalt-button")].map((b) => Math.round(b.getBoundingClientRect().top))).size);
    assert.ok(rows >= 2, "the actions wrap");
    assert.ok((await rect(page, "#h")).height >= heights[0] + 28 + 8 - 4 - 0.5, "the second row takes its height");
    await page.close();
  });

  test("in a head of 480 or more on touch the title's first line and the control share a centre; under 480 of its own width the head stacks", async () => {
    const { page } = await open(render(`<><div id="wide" style={{ width: 520 }}><B.AppSection><B.AppSectionHead title="Tides" actions={<B.Button size="sm">Export</B.Button>} /></B.AppSection></div><div id="narrow" style={{ width: 420 }}><B.AppSection><B.AppSectionHead title="Tides" actions={<B.Button size="sm">Export</B.Button>} /></B.AppSection></div></>`), PHONE);
    const centre = await page.evaluate(() => {
      const title = document.querySelector("#wide .basalt-app-section-title");
      const style = getComputedStyle(title);
      const top = title.getBoundingClientRect().top + parseFloat(style.paddingTop);
      const button = document.querySelector("#wide .basalt-button").getBoundingClientRect();
      return [top + parseFloat(style.lineHeight) / 2, button.top + button.height / 2];
    });
    assert.ok(Math.abs(centre[0] - centre[1]) <= 0.5, `centres ${centre}`);
    // A head in a plain 520 wrapper (its own container) takes the 44 line: the row reads it, and the title is padded down to it (fix pass 1, item 4).
    assert.equal(await page.$eval("#wide .basalt-app-head-row", (el) => getComputedStyle(el).getPropertyValue("--_head-line").trim()), "44px");
    assert.ok(parseFloat(await page.$eval("#wide .basalt-app-section-title", (el) => getComputedStyle(el).paddingTop)) >= 10 - 0.5);
    assert.equal(await page.$eval("#narrow .basalt-app-head-row", (el) => getComputedStyle(el).flexDirection), "column");
    await page.close();
  });

  test("axe finds nothing in either theme", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await open(render(SHELL(PAGE)), WIDE, theme);
      assert.deepEqual(await axe(page), []);
      await page.close();
    }
  });
});

// ---- 2. The phone title
describe("AppHeader's title on a phone", () => {
  const PAGE = (wrap = false) => SHELL(`${wrap ? "<div id=\"route\">" : ""}<B.AppPageHead phoneOnly title="Outer harbour gauge, north breakwater" facts={["Gauge 14", "Updated 2 min ago"]} /><B.AppSections><B.AppSection><B.AppSectionHead title="Tides" /><p id="content">Readings</p></B.AppSection></B.AppSections>${wrap ? "</div>" : ""}`, { header: `<B.AppHeader title="Outer harbour gauge, north breakwater" phoneTitle="page" facts={["Gauge 14", "Updated 2 min ago"]} />`, extra: `mainProps={{ id: "main" }}` });

  test("exactly one h1 is exposed at 1440 and at 390, inside main and after the banner at 390, never cut", async () => {
    for (const options of [WIDE, PHONE]) {
      const { page } = await open(render(PAGE()), options);
      const shown = await page.evaluate(() => [...document.querySelectorAll("h1")].filter((h) => h.getClientRects().length > 0).map((h) => h.closest("main") ? "main" : "bar"));
      assert.deepEqual(shown, options === WIDE ? ["bar"] : ["main"]);
      if (options === PHONE) {
        const cut = await page.$eval("main h1", (el) => el.scrollWidth > el.clientWidth + 0.5);
        assert.equal(cut, false, "the page's title is never cut");
      }
      await page.close();
    }
  });

  test("bar to title 16 and the head to the page 24, also with the page wrapped in a router's element", async () => {
    for (const wrap of [false, true]) {
      const { page } = await open(render(PAGE(wrap)), PHONE);
      const bar = await rect(page, ".basalt-app-header");
      const head = await rect(page, ".basalt-app-page-head");
      const next = await rect(page, ".basalt-app-sections");
      assert.ok(Math.abs(head.y - bar.bottom - 16) <= 0.5, `bar to title ${head.y - bar.bottom}`);
      assert.ok(Math.abs(next.y - head.bottom - 24) <= 0.5, `head to page ${next.y - head.bottom}`);
      await page.close();
    }
  });

  test("the server markup and the hydrated page lay out the same", async () => {
    const { page } = await open(render(PAGE()), PHONE);
    const before = await rect(page, ".basalt-app-page-head");
    await settle(page);
    assert.deepEqual(await rect(page, ".basalt-app-page-head"), before);
    await page.close();
  });

  test("the echo is hidden while the page's title is below the bar's edge and shown once it has passed under it, with a top safe area", async () => {
    const { page } = await open(`${render(PAGE())} document.documentElement.style.setProperty("--_inset-top", "20px");`, PHONE);
    assert.equal(await page.$eval(".basalt-app-echo", (el) => getComputedStyle(el).opacity), "0");
    await page.evaluate(() => window.scrollTo(0, 400));
    await settle(page);
    await page.waitForFunction(() => document.querySelector(".basalt-app-echo")?.hasAttribute("data-shown"));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector(".basalt-app-echo")?.hasAttribute("data-shown"));
    await page.close();
  });

  test("a head that mounts after the bar, and one a page change replaced, is found", async () => {
    const { page } = await open(`
function App() { const [step, setStep] = React.useState(0); window.next = () => setStep((n) => n + 1);
  return ${SHELL(`{step === 0 ? null : <B.AppPageHead key={step} phoneOnly title={"Page " + step} />}<div style={{ height: 2000 }} />`, { header: `<B.AppHeader title={"Page " + step} phoneTitle="page" />` })}; }
${render("<App />")}`, PHONE);
    for (const step of [1, 2]) {
      await page.evaluate(() => window.next());
      await settle(page);
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForFunction(() => document.querySelector(".basalt-app-echo")?.hasAttribute("data-shown"));
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page);
    }
    await page.close();
  });

  test("shownHeading returns the shown heading at both widths, and focus follows across 720", async () => {
    const { page } = await open(`
function App() { const bar = React.useRef(null); const own = React.useRef(null); window.pick = B.shownHeading(bar, own);
  return ${SHELL(`<B.AppPageHead phoneOnly titleRef={own} title="Bakery orders" />`, { header: `<B.AppHeader titleRef={bar} title="Bakery orders" phoneTitle="page" />` })}; }
${render("<App />")}`, WIDE);
    assert.equal(await page.evaluate(() => !!window.pick()?.closest("header")), true);
    await page.evaluate(() => window.pick().focus());
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    assert.equal(await page.evaluate(() => !!window.pick()?.closest("main")), true);
    assert.equal(await page.evaluate(() => document.activeElement === window.pick()), true, "focus moved to the title now shown");
    await page.close();
  });

  test("after a page change replaced the phone head, focus on either title follows across 720 both ways (fix pass 1, item 2)", async () => {
    const { page } = await open(`
function App() { const [step, setStep] = React.useState(1); window.next = () => setStep((n) => n + 1); const bar = React.useRef(null); const own = React.useRef(null); window.pick = B.shownHeading(bar, own);
  return ${SHELL(`<B.AppPageHead key={step} phoneOnly titleRef={own} title={"Order " + step} />`, { header: `<B.AppHeader titleRef={bar} title={"Order " + step} phoneTitle="page" />` })}; }
${render("<App />")}`, WIDE);
    await page.evaluate(() => window.next());
    await settle(page);
    await page.evaluate(() => window.pick().focus());
    for (const width of [390, 1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement === window.pick()), true, `focus is on the shown title at ${width}`);
    }
    await page.close();
  });

  test("a development warning when no phone-only head is found; an AppHeader wrapped by the app works", async () => {
    const { page } = await open(`
const warnings = []; window.warnings = warnings; const warn = console.warn; console.warn = (...a) => { warnings.push(a.join(" ")); warn(...a); };
function MyHeader(props) { return <B.AppHeader {...props} />; }
${render(SHELL("<p>Nothing</p>", { header: `<MyHeader title="Bakery orders" phoneTitle="page" />` }))}`, PHONE);
    await settle(page);
    assert.ok((await page.evaluate(() => window.warnings)).some((w) => /phoneTitle="page"/.test(w)));
    await page.close();
  });
});

// ---- 3. The short window
describe("a short window", () => {
  const ALL = `
<B.AppShell brand={<span>Gauge</span>} brandLabel="Gauge home" sidebar={<B.Nav aria-label="Primary"><B.NavGroup><B.NavItem href="#a" icon={B.HomeGlyph} current>Readings</B.NavItem></B.NavGroup></B.Nav>}
  header={<B.AppHeader title="Harbour gauge" />} banner={<B.ConnectionBar status="offline" />} foot={<B.Input aria-label="Note" />}
  tabBar={<B.TabBar><B.TabBarItem href="#a" icon={B.HomeGlyph} current>Readings</B.TabBarItem><B.TabBarItem href="#b" icon={B.HomeGlyph}>Alerts</B.TabBarItem><B.TabBarItem href="#c" icon={B.HomeGlyph}>Settings</B.TabBarItem></B.TabBar>}>
  <p id="first">Readings</p><div style={{ height: 1200 }} />
  <B.StatusBar message={{ text: "Saved" }} />
</B.AppShell>`;

  for (const size of [{ width: 720, height: 450 }, { width: 320, height: 225 }]) {
    test(`at ${size.width} by ${size.height} nothing is sticky or fixed; the header keeps 56; the foot has no cap; the offsets are 0`, async () => {
      const { page } = await open(render(ALL), { viewport: size, hasTouch: true });
      const positions = await page.evaluate(() => [".basalt-app-header", ".basalt-connection-bar", ".basalt-app-foot", ".basalt-tabbar", ".basalt-status-bar"].map((s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).position : "none"; }));
      for (const position of positions) assert.ok(!["sticky", "fixed"].includes(position), `positions ${positions}`);
      assert.equal(Math.round((await rect(page, ".basalt-app-header")).height), 56);
      assert.equal(await page.$eval(".basalt-app-foot", (el) => getComputedStyle(el).maxHeight), "none");
      const root = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); return [cs.getPropertyValue("--basalt-bottom-offset").trim(), cs.getPropertyValue("--basalt-sticky-top").trim()]; });
      assert.ok(root.every((v) => /^0(px)?$/.test(v)), `the root's offsets ${root}`);
      const title = await rect(page, ".basalt-app-title");
      assert.ok(await hits(page, title.x + 4, title.y + title.height / 2, ".basalt-app-title"));
      await page.close();
    });
  }

  test("at 320 by 225 the tab bar is in the tab order after the page", async () => {
    const { page } = await open(render(ALL), { viewport: { width: 320, height: 225 }, hasTouch: true });
    const order = await page.evaluate(() => { const all = [...document.querySelectorAll("a[href], input, button")]; return [all.indexOf(document.querySelector(".basalt-app-foot input")), all.indexOf(document.querySelector(".basalt-tabbar a"))]; });
    assert.ok(order[1] > order[0]);
    await page.close();
  });

  test("at 720 by 500 everything is pinned as before", async () => {
    const { page } = await open(render(ALL), { viewport: { width: 720, height: 500 } });
    assert.equal(await page.$eval(".basalt-app-header", (el) => getComputedStyle(el).position), "sticky");
    assert.equal(await page.$eval(".basalt-app-foot", (el) => getComputedStyle(el).position), "sticky");
    await page.close();
  });
});

// ---- 4. The rail at every width
describe("AppShell rail", () => {
  for (const width of [1024, 1440]) {
    test(`at ${width} the first column is 72px; capped, the cap is 1224px; the skip link is 14px in`, async () => {
      const { page } = await open(render(`<><B.SkipLink target="main" />${SHELL("<p>Readings</p>", { extra: "rail capped mainProps={{ id: \"main\" }}" })}</>`), { viewport: { width: width === 1440 ? 1600 : width, height: 800 } });
      assert.equal(Math.round((await rect(page, ".basalt-app-sidebar")).width), 72);
      if (width === 1440) assert.equal(Math.round((await rect(page, ".basalt-app-shell")).width), 1224);
      await page.focus(".basalt-skip-link");
      const shell = await rect(page, ".basalt-app-shell");
      assert.equal(Math.round((await rect(page, ".basalt-skip-link")).x - shell.x), 14);
      assert.equal(await page.$eval(".basalt-nav", (el) => el.hasAttribute("data-collapsed")), true, "Nav is collapsed, its labels names and tooltips");
      await page.close();
    });
  }
});

// ---- 5. The wide sheet
describe("SheetContent size=\"wide\"", () => {
  const SHEET = (size, form = false) => `<B.Sheet defaultOpen><B.SheetTrigger id="opener">Open</B.SheetTrigger><B.SheetContent size="${size}"><B.SheetHeader closeLabel="Close"><B.SheetTitle>Order 1042</B.SheetTitle></B.SheetHeader><B.SheetBody id="body"><p>Rye, two loaves</p></B.SheetBody></B.SheetContent></B.Sheet>${form ? `<B.Dialog defaultOpen><B.DialogContent form><B.SheetHeader><B.DialogTitle id="formtitle">New order</B.DialogTitle></B.SheetHeader></B.DialogContent></B.Dialog>` : ""}`;

  test("720 at 1440 with a 680 body; 100vw less 48 at 740; the window's width at 390", async () => {
    for (const [width, expected] of [[1440, 720], [740, 740 - 48], [390, 390]]) {
      const { page } = await open(render(SHEET("wide")), { viewport: { width, height: 800 } });
      assert.equal(Math.round((await rect(page, ".basalt-sheet")).width), expected);
      if (width === 1440) assert.equal(Math.round(await page.$eval("#body", (el) => el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) - parseFloat(getComputedStyle(el).paddingRight))), 680);
      await page.close();
    }
  });

  test("the title is 18/26 in a wide sheet and 20/28 in a standard sheet and a form dialog; first focus is the title; focus returns to the opener", async () => {
    const { page } = await open(render(SHEET("wide")), WIDE);
    assert.deepEqual(await page.$eval(".basalt-sheet .basalt-dialog-title", (el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]), ["18px", "26px"]);
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-dialog-title")), true);
    await page.keyboard.press("Escape");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "opener");
    await page.close();
    const standard = await open(render(SHEET("default", true)), WIDE);
    const sizes = await standard.page.evaluate(() => [...document.querySelectorAll(".basalt-dialog-title")].map((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight]));
    for (const size of sizes) assert.deepEqual(size, ["20px", "28px"]);
    await standard.page.close();
  });
});

// ---- 6. The account
describe("SiteHeader account", () => {
  const BAR = (links) => `<B.SiteHeader brand={<span>Bakery</span>} brandLabel="Bakery home" ${links ? `links={[{ href: "#a", label: "Orders", current: true }, { href: "#b", label: "Stock" }]}` : ""} account={<B.Menu><B.MenuTrigger render={<B.Button variant="ghost" edge="end" className="acct">Dana Okafor</B.Button>} /><B.MenuContent><B.MenuItem>Profile</B.MenuItem><B.MenuItem>Sign out</B.MenuItem></B.MenuContent></B.Menu>} />`;

  test("at 1440 last in the bar; at 390 and 320 with links in the menu's row and the bar does not overflow; with no links in the bar", async () => {
    let { page } = await open(render(BAR(true)), WIDE);
    assert.equal(await page.evaluate(() => { const shown = [...document.querySelectorAll(".basalt-site-bar .basalt-bar-actions > *")].filter((el) => el.getClientRects().length); return shown.at(-1)?.classList.contains("basalt-site-account"); }), true);
    await page.close();
    for (const options of [PHONE, NARROW]) {
      ({ page } = await open(render(BAR(true)), options));
      assert.equal(await page.$eval(".basalt-site-bar .basalt-site-account", (el) => el.getClientRects().length), 0);
      assert.ok(await page.evaluate(() => document.querySelector(".basalt-site-bar").scrollWidth <= document.querySelector(".basalt-site-bar").clientWidth));
      await page.click(".basalt-site-menu-trigger");
      await settle(page);
      assert.ok(await page.$(".basalt-site-menu-account .acct"));
      await page.click(".basalt-site-menu-account .acct");
      await settle(page);
      assert.ok(await page.$('[role="menu"]'), "the same control opens the same menu");
      await page.keyboard.press("Escape");
      await settle(page);
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("acct")), true, "the menu's return");
      await page.close();
    }
    ({ page } = await open(render(BAR(false)), PHONE));
    assert.ok((await page.$eval(".basalt-site-bar .basalt-site-account", (el) => el.getClientRects().length)) > 0);
    await page.close();
  });
});

// ---- 7. Brand and footnote
describe("AppBrand and AppFootnote", () => {
  test("an existing 32px lockup moves 0px; the lockup with a subtitle is 36 tall; the rail shows the mark alone", async () => {
    const { page } = await open(render(`<div><a id="old" className="basalt-site-brand" href="#"><span className="basalt-site-brand-mark"><svg width="96" height="32" /></span></a>${SHELL("<p>x</p>")}</div>`), WIDE);
    assert.equal((await rect(page, "#old .basalt-site-brand-mark")).height, 32);
    await page.close();
    const lock = await open(render(SHELL("<p>x</p>").replace("brand={<span>Gauge</span>}", `brand={<B.AppBrand mark={<svg width="36" height="36" />} title="Harbour gauge" subtitle="North breakwater" />}`)), WIDE);
    assert.equal(Math.round((await rect(lock.page, ".basalt-app-brand-full .basalt-app-lockup")).height), 36);
    await lock.page.setViewportSize({ width: 800, height: 800 });
    await settle(lock.page);
    assert.equal(await lock.page.$eval(".basalt-app-brand-rail .basalt-app-lockup-lines", (el) => getComputedStyle(el).display), "none");
    await lock.page.close();
  });

  test("the footnote is above the version in the sidebar, railTrigger in the rail, and a row in More under 720; a press in before leaves the sheet open, outside the nav", async () => {
    const shell = (width) => open(render(SHELL("<p>x</p>", { extra: `version={<a className="ver" href="#v">v1.4</a>} footnote={<B.AppFootnote detail="Since 06:00" action={<B.Button size="sm" variant="ghost" edge="end">Switch</B.Button>} railTrigger={<B.IconButton icon={B.HomeGlyph} label="Workspace" variant="ghost" className="rt" />}>Night shift</B.AppFootnote>} tabBar={<B.TabBar><B.TabBarItem href="#a" icon={B.HomeGlyph}>A</B.TabBarItem><B.TabBarItem href="#b" icon={B.HomeGlyph}>B</B.TabBarItem><B.TabBarItem href="#c" icon={B.HomeGlyph}>C</B.TabBarItem><B.TabBarItem href="#d" icon={B.HomeGlyph}>D</B.TabBarItem><B.TabBarMore before={<B.Button className="pause">Pause animations</B.Button>}><B.NavItem href="#e" icon={B.HomeGlyph}>E</B.NavItem></B.TabBarMore></B.TabBar>}` })), { viewport: { width, height: 800 }, hasTouch: width < 720 });
    let { page } = await shell(1440);
    assert.ok((await rect(page, ".basalt-app-sidebar .basalt-app-footnote")).bottom <= (await rect(page, ".basalt-app-sidebar .ver")).y);
    await page.close();
    ({ page } = await shell(800));
    assert.ok((await page.$eval(".basalt-app-sidebar .rt", (el) => el.getClientRects().length)) > 0);
    await page.close();
    ({ page } = await shell(390));
    await page.click(".basalt-tabbar-more");
    await settle(page);
    assert.ok(await page.$(".basalt-tabbar-footnote .basalt-app-footnote"));
    assert.equal(await page.$eval(".basalt-tabbar-before .pause", (el) => !!el.closest("nav")), false);
    await page.click(".basalt-tabbar-before .pause");
    await settle(page);
    assert.ok(await page.$(".basalt-tabbar-sheet"), "the sheet stays open");
    await page.close();
  });
});

// ---- 8. MessagePage
describe("MessagePage", () => {
  test("one main; centred at 1440 by 900; at 320 by 225 its top is never above the window's and the page scrolls", async () => {
    const PAGE = `<B.MessagePage title="This link has expired" description="Ask the bakery for a new one." actions={<B.Button>Back to orders</B.Button>}><B.Callout title="Links last a day" /></B.MessagePage>`;
    let { page } = await open(render(PAGE), WIDE);
    assert.equal(await page.evaluate(() => document.querySelectorAll("main").length), 1);
    const body = await rect(page, ".basalt-message-page-body");
    assert.ok(Math.abs(body.x + body.width / 2 - 720) <= 1 && Math.abs(body.y + body.height / 2 - 450) <= 1, "centred both ways");
    await page.close();
    ({ page } = await open(render(PAGE), { viewport: { width: 320, height: 225 } }));
    assert.ok((await rect(page, ".basalt-message-page-body")).y >= 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight));
    await page.close();
  });
});

// ---- 9. StatusBar pinned
describe("StatusBar pinned", () => {
  test("in a column of a short page its bottom is the column's bottom; flush and counted once in a foot; unchanged at 390", async () => {
    const PAGE = `<div className="basalt-site-page" id="col"><main><p>Short</p></main><B.StatusBar pinned message={{ text: "Saved" }} /></div>`;
    let { page } = await open(render(PAGE), WIDE);
    assert.ok(Math.abs((await rect(page, ".basalt-status-bar")).bottom - (await rect(page, "#col")).bottom) <= 0.5);
    assert.equal(await page.$eval(".basalt-status-bar", (el) => getComputedStyle(el).position), "sticky");
    await page.close();
    ({ page } = await open(render(SHELL("<p>x</p>", { extra: `foot={<B.StatusBar message={{ text: "Saved" }} />}` })), WIDE));
    assert.equal(await page.$eval(".basalt-app-foot", (el) => getComputedStyle(el).borderTopWidth), "0px");
    await page.waitForFunction(() => document.documentElement.hasAttribute("data-pinned-measured"));
    const pinned = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-pinned-bottom")));
    assert.ok(Math.abs(pinned - (await rect(page, ".basalt-app-foot")).height) <= 1, "counted once");
    await page.close();
    ({ page } = await open(render(PAGE), PHONE));
    assert.equal(await page.$eval(".basalt-status-bar", (el) => getComputedStyle(el).position), "fixed");
    await page.close();
  });

  test("an inner scroller gets the scroll padding, not the root", async () => {
    const { page } = await open(render(`<div id="pane" style={{ height: 400, overflow: "auto", display: "flex", flexDirection: "column" }}><div style={{ flex: "1 0 auto", minHeight: 900 }} /><B.StatusBar pinned /></div>`), WIDE);
    await page.waitForFunction(() => document.getElementById("pane").hasAttribute("data-pinned-measured"));
    assert.ok(parseFloat(await page.$eval("#pane", (el) => el.style.getPropertyValue("--basalt-pinned-bottom"))) >= 44);
    assert.equal(await page.evaluate(() => document.documentElement.style.getPropertyValue("--basalt-pinned-bottom")), "0px");
    await page.close();
  });
});

// ---- 10. The stream
describe("the stream's quiet actions and time link", () => {
  const QUIET = `<B.IconButton size="xs" variant="ghost" icon={B.CopyGlyph} label="Copy link" className="q" />`;
  const STREAM = `<B.Stream label="Shift notes">
  <B.StreamMessage id="m1" author="Dana Okafor" time="06:10" timeHref="#m1" quietActions={${QUIET}}><p>High water at <a id="w1" href="#tide">6.1 m</a> on the outer gauge, as forecast.</p></B.StreamMessage>
  <B.StreamMessage id="m2" joined author="Dana Okafor" time="06:11" timeHref="#m2" quietActions={${QUIET}}><p>Probe B reads <a id="w2" href="#b">0.2 m low</a> again, which is a long sentence that wraps past the seat at the end of the first line.</p></B.StreamMessage>
  <B.StreamMessage id="m3" joined author="Dana Okafor" time="06:12" timeHref="#m3" quietActions={${QUIET}}><p>Logged.</p></B.StreamMessage>
</B.Stream>`;

  test("quiet actions add 0px to a head and to a joined entry; revealed on hover and focus; a hidden one takes no press", async () => {
    const plain = await open(render(STREAM.replaceAll(/ timeHref="#m\d" quietActions=\{[^}]*\/>\}/g, "")), WIDE);
    const before = await rects(plain.page, ".basalt-stream-message");
    await plain.page.close();
    const { page } = await open(render(STREAM), WIDE);
    const now = await rects(page, ".basalt-stream-message");
    now.forEach((r, i) => assert.ok(Math.abs(r.height - before[i].height) <= 0.5, `message ${i} is ${r.height - before[i].height}px taller`));
    assert.equal(await page.$eval("#m1 .basalt-stream-quiet", (el) => getComputedStyle(el).opacity), "0");
    assert.equal(await page.$eval("#m1 .basalt-stream-quiet", (el) => getComputedStyle(el).pointerEvents), "none");
    await page.hover("#m1 p");
    await settle(page);
    assert.equal(await page.$eval("#m1 .basalt-stream-quiet", (el) => getComputedStyle(el).opacity), "1");
    await page.mouse.move(0, 0);
    await page.focus("#m2 .q");
    await settle(page);
    assert.equal(await page.$eval("#m2 .basalt-stream-seat", (el) => getComputedStyle(el).opacity), "1");
    await page.close();
  });

  test("a link under a neighbour's hidden control is hit; two joined one-line entries' controls overlap 0px; drawn in forced colours", async () => {
    const { page } = await open(render(STREAM), WIDE);
    const controls = await rects(page, ".basalt-stream-seat .q");
    assert.equal(overlap(controls[0], controls[1]), 0);
    const words = await rect(page, "#m3 p");
    assert.ok(await hits(page, words.x + 2, words.y + words.height / 2, "#m3 p"));
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await page.$eval("#m1 .basalt-stream-quiet", (el) => getComputedStyle(el).opacity), "1");
    await page.close();
  });

  test("a joined entry's first line ends before its seat, and a link at the line's end is hit", async () => {
    const { page } = await open(render(STREAM), WIDE);
    const seat = await rect(page, "#m2 .basalt-stream-seat");
    const first = await page.$eval("#m2 p", (p) => { const range = document.createRange(); range.selectNodeContents(p); const line = range.getClientRects()[0]; return { right: line.right, y: line.y, height: line.height }; });
    assert.ok(first.right <= seat.x + 0.5);
    const link = await page.$eval("#w2", (a) => { const r = a.getClientRects()[0]; return { x: r.right - 2, y: r.y + r.height / 2 }; });
    assert.ok(await hits(page, link.x, link.y, "#w2"));
    await page.close();
  });

  test("a joined entry that begins with a StreamQuote keeps the quote's width and starts it under the seat, with a development warning", async () => {
    const { page } = await open(`
const warnings = []; window.warnings = warnings; const warn = console.warn; console.warn = (...a) => { warnings.push(a.join(" ")); warn(...a); };
${render(`<B.Stream><B.StreamMessage author="Ana" time="08:00"><p>Order in.</p></B.StreamMessage><B.StreamMessage id="j" joined author="Ana" time="08:01" quietActions={${QUIET}}><B.StreamQuote cite="Front desk asked">Two rye?</B.StreamQuote></B.StreamMessage></B.Stream>`)}`, WIDE);
    const quote = await rect(page, "#j .basalt-stream-quote");
    const text = await rect(page, "#j .basalt-stream-text");
    const seat = await rect(page, "#j .basalt-stream-seat");
    assert.ok(Math.abs(quote.width - text.width) <= 0.5, "the quote keeps the full width");
    assert.ok(quote.y >= seat.bottom - 0.5, "it starts under the seat");
    assert.ok((await page.evaluate(() => window.warnings)).some((w) => /begins with a block/.test(w)));
    await page.close();
  });

  test("a joined message that has arrived uses its head, not the seat", async () => {
    const { page } = await open(render(`<B.Stream><B.StreamMessage author="Ana" time="08:00"><p>Order in.</p></B.StreamMessage><B.StreamMessage id="j" joined arrived author="Ana" time="08:01" timeHref="#j" quietActions={${QUIET}}><p>Two rye.</p></B.StreamMessage></B.Stream>`), WIDE);
    assert.equal(await page.$("#j .basalt-stream-seat"), null);
    assert.ok(await page.$("#j .basalt-stream-head .basalt-stream-time-link"));
    await page.close();
  });

  test("at 390 with touch: More on a headed and a joined message completes the same action, closes, and returns focus; the targets; links in the first line", async () => {
    const { page } = await open(`window.done = []; ${render(STREAM.replaceAll(`className="q" />`, `className="q" onClick={(e) => window.done.push(e.currentTarget.closest("li")?.id ?? "popup")} />`))}`, PHONE);
    assert.equal(await page.$eval("#m1 .basalt-stream-quiet", (el) => getComputedStyle(el).display), "none");
    for (const id of ["m1", "m2"]) {
      await page.tap(`#${id} .basalt-stream-more`);
      await page.waitForSelector(".basalt-stream-more-popup .q");
      await page.tap(".basalt-stream-more-popup .q");
      await settle(page);
      assert.equal(await page.$(".basalt-stream-more-popup"), null, "the popover closes on the press");
      assert.equal(await page.evaluate((m) => document.activeElement?.closest("li")?.id === m && document.activeElement.classList.contains("basalt-stream-more"), id), true, "focus returns to More");
    }
    assert.equal((await page.evaluate(() => window.done)).length, 2);
    const box = (s) => page.evaluate((sel) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const b = getComputedStyle(el, "::before"); return { x: r.x + parseFloat(b.left), width: r.width - parseFloat(b.left) - parseFloat(b.right), y: r.y + parseFloat(b.top), height: r.height - parseFloat(b.top) - parseFloat(b.bottom) }; }, s);
    const head = await box("#m1 .basalt-stream-more");
    const seat = await box("#m2 .basalt-stream-more");
    assert.ok(head.width >= 44 - 0.5 && Math.abs(head.height - 32) <= 0.5, `More in a head is ${head.width} by ${head.height}`);
    assert.ok(seat.width >= 44 - 0.5 && Math.abs(seat.height - 24) <= 0.5, `More in a seat is ${seat.width} by ${seat.height}`);
    const time = await box("#m1 .basalt-stream-time-link");
    assert.ok(time.width >= 44 - 0.5 && Math.abs(time.height - 32) <= 1, `the time link in a head is ${time.width} by ${time.height}`);
    for (const [a, b] of [[head, time], [seat, await box("#m2 .basalt-stream-time-link")]]) assert.equal(overlap({ ...a, right: a.x + a.width, bottom: a.y + a.height }, { ...b, right: b.x + b.width, bottom: b.y + b.height }), 0);
    const line = await rect(page, "#m2 .basalt-stream-seat");
    assert.ok(seat.y + seat.height <= line.bottom + 0.5, "never below its line");
    for (const id of ["w1", "w2"]) {
      const link = await page.$eval(`#${id}`, (a) => { const r = a.getClientRects()[0]; return [{ x: r.x + 2, y: r.y + r.height / 2 }, { x: r.right - 2, y: r.y + r.height / 2 }]; });
      for (const point of link) assert.ok(await hits(page, point.x, point.y, `#${id}`), `a tap at ${point.x} reaches ${id}`);
    }
    await page.close();
  });

  test("at 700 with a fine pointer the touch form is drawn; the time link's name", async () => {
    const { page } = await open(render(STREAM), { viewport: { width: 700, height: 800 } });
    assert.notEqual(await page.$eval("#m1 .basalt-stream-more", (el) => getComputedStyle(el).display), "none");
    assert.equal(await page.$eval("#m1 .basalt-stream-time-link", (el) => el.getAttribute("aria-label")), "Message from Dana Okafor, 06:10");
    assert.equal(await page.$eval("#m2 .basalt-stream-body > .basalt-visually-hidden", (el) => el.textContent), "Dana Okafor: ");
    await page.close();
  });
});

describe("ConnectionBar", () => {
  const APP = `
function App() { const [status, setStatus] = React.useState("connected"); window.set = setStatus;
  return <><B.AppShell brand={<span>Gauge</span>} brandLabel="Gauge home" sidebar={<B.Nav aria-label="Primary"><B.NavGroup><B.NavItem href="#a" icon={B.HomeGlyph} current>Readings</B.NavItem></B.NavGroup></B.Nav>} header={<B.AppHeader title="Harbour gauge" />} banner={<B.ConnectionBar status={status} />}>
    <B.ListBand range={{ start: 1, end: 25, total: 200 }} page={1} pageCount={8} onPageChange={() => {}} /><div style={{ height: 3000 }} />
  </B.AppShell></>; }
${render("<App />")}`;

  /** A page on the fake clock: open() waits two frames, which a paused clock never draws, so this one advances the clock itself. */
  const openOnClock = async (body) => {
    const { page, errors } = await fixturePage(browser, body, { theme: "dark", standards: true, ...WIDE, clock: true });
    await page.addStyleTag({ content: "body { margin: 0; }" });
    await page.clock.runFor(50);
    // Every change of the two live regions, in order, so each drawn state can be shown to be said once.
    await page.evaluate(() => {
      window.said = [];
      const record = () => document.querySelectorAll('[aria-live]').forEach((region) => {
        if (region.__watched) return;
        region.__watched = true;
        new MutationObserver(() => { if (region.textContent) window.said.push(region.textContent); }).observe(region, { childList: true, characterData: true, subtree: true });
      });
      record();
      new MutationObserver(record).observe(document.body, { childList: true, subtree: true });
    });
    return { page, errors };
  };

  test("nothing for a 900ms outage; Reconnecting at 1000ms; disconnected at once and assertive; Back online for 5000ms, held on hover; a newer status cancels an older timer", async () => {
    const { page } = await openOnClock(APP);
    await page.evaluate(() => window.set("reconnecting"));
    await page.clock.runFor(900);
    await page.evaluate(() => window.set("connected"));
    await page.clock.runFor(6000);
    assert.equal(await page.$(".basalt-connection-bar"), null, "an outage under a second draws nothing");
    await page.evaluate(() => window.set("reconnecting"));
    await page.clock.runFor(999);
    assert.equal(await page.$(".basalt-connection-bar"), null);
    await page.clock.runFor(2);
    assert.equal(await page.$eval(".basalt-connection-bar-word", (el) => el.textContent), "Reconnecting");
    await page.evaluate(() => window.set("disconnected"));
    await page.clock.runFor(60);
    assert.equal(await page.$eval('[role="alert"][aria-live="assertive"]', (el) => el.textContent), "Disconnected");
    await page.evaluate(() => window.set("connected"));
    await page.clock.runFor(10);
    assert.equal(await page.$eval(".basalt-connection-bar-word", (el) => el.textContent), "Back online");
    // A pointer moved by coordinates: an actionability wait for a stable box needs frames a paused clock does not draw.
    await page.mouse.move(...(await page.$eval(".basalt-connection-bar", (el) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })));
    await page.clock.runFor(6000);
    assert.ok(await page.$(".basalt-connection-bar"), "held while the pointer is on it");
    await page.mouse.move(0, 800);
    await page.clock.runFor(200);
    assert.equal(await page.$(".basalt-connection-bar"), null);
    await page.evaluate(() => window.set("offline"));
    await page.clock.runFor(10);
    await page.evaluate(() => window.set("connected"));
    await page.clock.runFor(10);
    await page.evaluate(() => window.set("reconnecting"));
    await page.clock.runFor(5100);
    assert.equal(await page.$eval(".basalt-connection-bar-word", (el) => el.textContent), "Reconnecting", "the stale Back online timer did not end the bar");
    // Each drawn state said once, in the order drawn (the outage under a second said nothing).
    assert.deepEqual(await page.evaluate(() => window.said), ["Reconnecting", "Disconnected", "Back online", "Offline", "Back online", "Reconnecting"]);
    await page.close();
  });

  test("Back online stays while focus is inside it, past 5000ms and after the pointer leaves (fix pass 1, item 6)", async () => {
    // The band takes focus from script here (the app passes tabIndex), as a screen reader's or a keyboard's focus on its words would hold it.
    const { page } = await openOnClock(APP.replace("<B.ConnectionBar status={status} />", "<B.ConnectionBar status={status} tabIndex={-1} />"));
    await page.evaluate(() => window.set("offline"));
    await page.clock.runFor(10);
    await page.evaluate(() => window.set("connected"));
    await page.clock.runFor(10);
    // A pointer moved by coordinates: an actionability wait for a stable box needs frames a paused clock does not draw.
    await page.mouse.move(...(await page.$eval(".basalt-connection-bar", (el) => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })));
    await page.evaluate(() => document.querySelector(".basalt-connection-bar").focus());
    await page.clock.runFor(6000);
    await page.mouse.move(0, 800);
    await page.clock.runFor(500);
    assert.ok(await page.$(".basalt-connection-bar"), "held while focus is inside, after the pointer left");
    await page.evaluate(() => document.activeElement?.blur());
    await page.clock.runFor(500);
    assert.equal(await page.$(".basalt-connection-bar"), null, "it leaves once neither holds it");
    await page.close();
  });

  test("a stuck ListBand sits under the bar (0px overlap), and the root's scroll padding includes it", async () => {
    const { page } = await open(APP, WIDE);
    await page.evaluate(() => window.set("offline"));
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 1500));
    await settle(page);
    const bar = await rect(page, ".basalt-connection-bar");
    const band = await rect(page, ".basalt-list-band");
    assert.ok(band.y >= bar.bottom - 0.5, "the band is under the connection bar");
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
    assert.ok(padding >= 56 + bar.height + 16 - 0.5, `the scroll padding is ${padding}`);
    await page.close();
  });
});

// ---- 11. The tray
describe("Tray", () => {
  const TRAY = (where) => `
function App() { const [rows, setRows] = React.useState(["a", "b", "c"]); window.set = setRows;
  const tray = <B.Tray label={({ waiting, reporting }) => (waiting ? "Waiting on you" : reporting ? "Under way" : "Clear")} sheetLabel="Orders waiting" summary={(n) => n + " waiting"}>
    {rows.map((k) => <B.TrayRow key={k} actions={<B.Button size="sm" className={"act-" + k}>Approve</B.Button>}>Order {k} needs a second proof</B.TrayRow>)}
  </B.Tray>;
  return ${where === "foot" ? `<B.AppShell brand={<span>Bakery</span>} brandLabel="Bakery home" sidebar={<span />} header={<B.AppHeader title="Orders" />} foot={tray}><div style={{ height: 1200 }} /></B.AppShell>` : `<div style={{ padding: 24 }}>{tray}<div style={{ height: 1200 }} /></div>`}; }
${render("<App />")}`;

  for (const where of ["head", "foot"]) {
    test(`in a tray at the page's ${where}, with the pointer on a row's button, an arrival and a departure each move that button 0px, and the same node stays`, async () => {
      const { page } = await open(TRAY(where), WIDE);
      const box = await rect(page, ".act-b");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const node = await page.$(".act-b");
      await page.evaluate(() => window.set(["z", "a", "b", "c"]));
      await settle(page);
      assert.deepEqual(await rect(page, ".act-b"), box, "an arrival moved nothing");
      await page.evaluate(() => window.set(["z", "b", "c"]));
      await settle(page);
      assert.deepEqual(await rect(page, ".act-b"), box, "a departure moved nothing");
      assert.ok(await page.evaluate((el) => el === document.querySelector(".act-b"), node), "never remounted");
      await page.mouse.move(0, 0);
      await settle(page);
      assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll(".basalt-tray-row[data-tray-key]")].map((r) => r.getAttribute("data-tray-key"))), ["z", "b", "c"], "rows take their order on pointer leave");
      await page.close();
    });
  }

  test("a row that wrapped after a resize leaves under the pointer in a foot at its cap: the button under the pointer moves 0px (fix pass 1, item 1)", async () => {
    const { page } = await open(TRAY("foot"), { viewport: { width: 1440, height: 420 } });
    await page.evaluate(() => window.set(["a", "b", "c", "d", "e", "f"]));
    await settle(page);
    // The first row wraps to more lines after its last measure: the window narrows, and its words grow.
    await page.setViewportSize({ width: 900, height: 420 });
    await page.evaluate(() => { document.querySelector('[data-tray-key="a"] .basalt-tray-words').textContent += " and a long note that wraps onto more lines at this width"; });
    const box = await rect(page, ".act-b");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(() => window.set(["b", "c", "d", "e", "f"]));
    await settle(page);
    assert.deepEqual(await rect(page, ".act-b"), box, "a departure alone moved nothing");
    await page.close();
  });

  test("focus is never on body after a row leaves, with and without a held seat; an arrival is drawn at once under keyboard focus", async () => {
    for (const held of [false, true]) {
      const { page } = await open(TRAY("head"), WIDE);
      if (held) { const box = await rect(page, ".act-c"); await page.mouse.move(box.x + 2, box.y + 2); }
      await page.focus(".act-b");
      await page.evaluate(() => window.set(["a", "c"]));
      await settle(page);
      assert.notEqual(await page.evaluate(() => document.activeElement?.tagName), "BODY");
      await page.close();
    }
    const { page } = await open(TRAY("head"), WIDE);
    await page.focus(".act-a");
    await page.evaluate(() => window.set(["a", "b", "c", "d"]));
    await settle(page);
    assert.ok(await page.$(".act-d"), "drawn at once");
    await page.close();
  });

  test("label as a function and sheetLabel; reports above the band at 390", async () => {
    const { page } = await open(render(`<B.Tray label={({ waiting }) => (waiting ? "Waiting on you" : "Under way")} sheetLabel="Orders waiting" summary={(n) => n + " waiting"}><B.TrayRow key="w">Proof 2</B.TrayRow><B.TrayRow key="s" stay>Oven 3 heating</B.TrayRow></B.Tray>`), PHONE);
    assert.equal(await page.$eval(".basalt-tray", (el) => el.getAttribute("aria-label")), "Waiting on you");
    assert.ok((await rect(page, ".basalt-tray-row[data-stay]")).bottom <= (await rect(page, ".basalt-tray-band")).y + 0.5);
    await page.click(".basalt-tray-band");
    await settle(page);
    assert.equal(await page.$eval(".basalt-tray-sheet .basalt-dialog-title", (el) => el.textContent), "Orders waiting");
    await page.close();
  });

  test("a 16 glyph, a 24 avatar, the words and a button share a centre within 0.5px; a wrapped row with a mark is as tall as the same row without it", async () => {
    const ROW = (mark) => `<div style={{ width: 360 }}><B.Tray label="Waiting" summary={(n) => n + ""}><B.TrayRow ${mark} actions={<B.Button size="sm">Open</B.Button>}>Proof for order 1042 is ready to check before the morning bake begins</B.TrayRow></B.Tray></div>`;
    const { page } = await open(render(ROW(`mark={<B.Avatar name="Ana" size={24} />}`)), WIDE);
    const centres = await page.evaluate(() => {
      const c = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      const words = document.querySelector(".basalt-tray-words");
      const top = words.getBoundingClientRect().top + parseFloat(getComputedStyle(words).paddingTop);
      return [c(document.querySelector(".basalt-tray-mark > *")), top + 9, c(document.querySelector(".basalt-tray-actions .basalt-button"))];
    });
    for (const value of centres) assert.ok(Math.abs(value - centres[1]) <= 0.5, `centres ${centres}`);
    const withMark = (await rect(page, ".basalt-tray-row")).height;
    await page.close();
    const bare = await open(render(ROW("")), WIDE);
    assert.ok(Math.abs((await rect(bare.page, ".basalt-tray-row")).height - withMark) <= 0.5);
    await bare.page.close();
  });

  // Against origin/main: words alone and words with actions at one, two and three lines, fine and touch, are the heights main draws (worked out from
  // its stylesheet in the decision and to be confirmed against a main build when tests resume).
  test("rows of words alone and with actions keep main's heights at one, two and three lines, fine and touch", async () => {
    const expected = { fine: { words: [40, 48, 66], actions: [40, 53, 71] }, touch: { words: [44, 48, 66], actions: [56, 61, 79] } };
    const TEXT = ["Proof 1042", "Proof for order 1042 is ready for a check by the head baker", "Proof for order 1042 is ready for a check by the head baker before the ovens are lit for the morning run of rye"];
    for (const [kind, options] of [["fine", WIDE], ["touch", PHONE]]) {
      for (const [form, actions] of [["words", ""], ["actions", `actions={<B.Button size="sm">Open</B.Button>}`]]) {
        for (let lines = 0; lines < 3; lines += 1) {
          const { page } = await open(render(`<div style={{ width: 300 }}><B.Tray label="Waiting" summary={(n) => n + ""}><B.TrayRow stay ${actions}>${TEXT[lines]}</B.TrayRow></B.Tray></div>`), options);
          const height = (await rect(page, ".basalt-tray-row")).height;
          assert.ok(Math.abs(height - expected[kind][form][lines]) <= 1, `${kind} ${form} ${lines + 1} lines: ${height}`);
          await page.close();
        }
      }
    }
  });
});

// ---- 12. Callout meta
describe("Callout meta", () => {
  test("meta on the title's baseline; whole on its own line at 320; wider than the callout it wraps inside; the heading's name is the title; the icon for every status", async () => {
    let { page } = await open(render(`<div style={{ width: 600 }}><B.Callout heading={3} status="warning" title="Gauge offline" meta={<B.Presence status="away" since={Date.now() - 600000} />}>Readings resume when the link is back.</B.Callout></div>`), WIDE);
    const base = await page.evaluate(() => { const t = document.querySelector(".basalt-callout-title").getBoundingClientRect(); const m = document.querySelector(".basalt-callout-meta").getBoundingClientRect(); return [t.top, m.top, t.right, m.left]; });
    assert.ok(base[3] >= base[2], "after the title");
    assert.equal(await page.$eval("h3", (el) => el.textContent), "Gauge offline");
    await page.close();
    ({ page } = await open(render(`<div style={{ width: 288 }}><B.Callout title="The proofing cabinet is above its set point" meta={<span>Since 05:40</span>}>Check the door seal.</B.Callout></div>`), NARROW));
    const t = await rect(page, ".basalt-callout-title");
    const m = await rect(page, ".basalt-callout-meta");
    assert.ok(m.y >= t.bottom - 0.5, "the meta moved whole to its own line");
    assert.equal(await page.$eval(".basalt-callout-meta", (el) => el.getClientRects().length), 1);
    await page.close();
    ({ page } = await open(render(`<div style={{ width: 288 }}><B.Callout title="Proof" meta={<span>a meta far wider than the callout itself at this width, which wraps inside it</span>} /></div>`), NARROW));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.close();
    for (const status of ["info", "success", "warning", "danger"]) {
      ({ page } = await open(render(`<B.Callout status="${status}" title="Proof" meta={<span>05:40</span>} />`), WIDE));
      assert.ok(await page.$(".basalt-callout-icon"));
      await page.emulateMedia({ forcedColors: "active" });
      assert.ok(await page.$eval(".basalt-callout-icon", (el) => el.getClientRects().length > 0));
      await page.close();
    }
  });
});
