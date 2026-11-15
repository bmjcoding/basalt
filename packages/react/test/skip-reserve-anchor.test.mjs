// The second engineering batch of the components stream (DECISIONS 133, 135): the skip link for React (X1), the reserved room that
// Terminal and Meter share (X3), and the anchor landing clear of a sticky bar, with the Tab claim measured (X5). Driven in
// Chromium against the built package with the real stylesheet. The fixtures load no web font, so text widths differ from a Mac's
// on CI's Linux runner: every measured margin here is wider than a fallback font's width, and a position is compared with itself.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const near = (actual, expected, message, tolerance = 0.6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;

const open = async (fixture, { width = 1440, height = 800, theme = "dark", ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, fixture, { theme, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (page, selector, n = 0) => page.locator(selector).nth(n).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (page, selector, property, n = 0) => page.locator(selector).nth(n).evaluate((el, p) => getComputedStyle(el)[p], property);
const resolve = (page, value, property = "backgroundColor") => page.evaluate(({ value, property }) => { const probe = document.createElement("div"); document.body.append(probe); probe.style[property] = value; const c = getComputedStyle(probe)[property]; probe.remove(); return c; }, { value, property });
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const options = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
    const result = await globalThis.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, options);
    return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  });
};
/** The WCAG contrast ratio of two `rgb()` or `rgba()` strings, the second taken as opaque. */
const ratio = (a, b) => {
  const lum = (c) => { const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { const s = Number(v) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ---- the bars ----
const LINKS = `[{href:"#alpha",label:"Alpha"},{href:"#beta",label:"Beta"},{href:"#gamma",label:"Gamma"}]`;
const SITE_HEADER = `<B.SiteHeader brand={<>${MARK}<span>Acme</span></>} brandLabel="Acme home" links={${LINKS}} themeToggle={<B.IconButton icon={B.SettingsGlyph} label="Switch theme" />} action={<B.Button variant="primary">Get started</B.Button>} />`;
// A page's own bar: the chrome surface the site header uses, sticky, marked so the page gets the same landing clearance.
const OWN_BAR = (style = "") => `<header className="basalt-chrome basalt-sticky-bar" style={{ height: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", boxSizing: "border-box"${style} }}><a href="#alpha">Alpha</a><B.Button size="sm">Search</B.Button><a href="#beta">Beta</a></header>`;
const PAGE = `<main id="main" tabIndex={-1} style={{ padding: 24, minHeight: 4200 }}><button id="before">Before</button><h2 id="alpha" style={{ marginTop: 1500 }}>Alpha</h2><p>Synthetic words.</p><h2 id="beta" style={{ marginTop: 800 }}>Beta</h2><p>More synthetic words.</p><h2 id="gamma" style={{ marginTop: 800 }}>Gamma</h2></main>`;
const site = (skip = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>${skip}${SITE_HEADER}${PAGE}</div>);`;
const own = (style = "", skip = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>${skip}${OWN_BAR(style)}${PAGE}</div>);`;
const NAV = `<B.Nav aria-label="Primary"><B.NavItem href="#alpha" icon={B.HomeGlyph}>Home</B.NavItem><B.NavItem href="#beta" icon={B.MessagesGlyph}>Messages</B.NavItem></B.Nav>`;
const app = (skip = "") => `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(
  <B.ToastProvider>${skip}<B.AppShell brand={<>${MARK}<span>Workbench</span></>} brandMark={${MARK}} brandLabel="Workbench home" sidebar={${NAV}}
    header={<B.AppHeader title="Home" actions={<><B.IconButton icon={B.SettingsGlyph} label="Switch theme" /><B.Button variant="primary">New entry</B.Button></>} />}
    tabBar={<B.TabBar><B.TabBarItem href="#alpha" icon={B.HomeGlyph}>Home</B.TabBarItem><B.TabBarItem href="#beta" icon={B.MessagesGlyph}>Messages</B.TabBarItem></B.TabBar>}
    mainProps={{ id: "main", tabIndex: -1 }}>
    <div style={{ minHeight: 4200 }}><button id="before">Before</button><h2 id="alpha" style={{ marginTop: 1500 }}>Alpha</h2><p>Synthetic words.</p><h2 id="beta" style={{ marginTop: 800 }}>Beta</h2></div>
  </B.AppShell></B.ToastProvider>);`;

describe("SkipLink", () => {
  const SKIP = `<B.SkipLink target="main" />`;
  const where = (page) => page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName));

  for (const theme of THEMES) {
    // DECISIONS 138 and 139 (B3): with a sticky bar the focused skip link hangs under the bar, space-2 below its line, on the brand's start edge,
    // floating with the rim, shadow-overlay and radius 8. It was at the page's top start, over the bar, with radius 6 and no rim or shadow.
    test(`the first tab stop: unseen at rest, then under the bar on the brand's start edge in the skill's own fill and ink (${theme})`, async () => {
      const page = await open(site(SKIP), { theme });
      const link = page.locator(".basalt-skip-link");
      // At rest it is clipped away: nothing of it is seen, and it is a link by name.
      assert.notEqual(await css(page, ".basalt-skip-link", "clipPath"), "none", "unseen: it is clipped until it has focus");
      assert.equal(await css(page, ".basalt-skip-link", "position"), "fixed", "out of the flow, fixed under the bar");
      assert.equal(await page.getByRole("link", { name: "Skip to content" }).count(), 1, "named, and found by its role");
      const mainTop = (await box(page, "#main")).y;
      await page.keyboard.press("Tab");
      assert.equal(await where(page), "basalt-skip-link", "the first Tab lands on it, before the bar's brand");
      const shown = await box(page, ".basalt-skip-link");
      const bar = await box(page, ".basalt-site-header");
      const brandMark = await box(page, ".basalt-site-brand-mark");
      near(shown.x, brandMark.x, "on the brand's start edge");
      near(shown.y, bar.bottom + 8, "space-2 below the bar's line");
      assert.equal(await css(page, ".basalt-skip-link", "transform"), "none");
      assert.equal(await css(page, ".basalt-skip-link", "backgroundColor"), await resolve(page, "var(--basalt-surface-3)"), "the fill is surface-3");
      assert.equal(await css(page, ".basalt-skip-link", "color"), await resolve(page, "var(--basalt-text-primary)", "color"), "the ink is primary");
      assert.equal(await css(page, ".basalt-skip-link", "borderTopLeftRadius"), await resolve(page, "var(--basalt-radius-md)", "borderTopLeftRadius"), "radius 8");
      assert.notEqual(await css(page, ".basalt-skip-link", "boxShadow"), "none", "shadow-overlay: it floats");
      assert.equal(await css(page, ".basalt-skip-link", "borderTopWidth"), "1px", "the rim");
      assert.equal(await css(page, ".basalt-skip-link", "zIndex"), (await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-layer-toast"))).trim(), "the layer of a toast, over the bar");
      assert.equal(await css(page, ".basalt-skip-link", "outlineStyle"), "solid", "keyboard focus draws the ring");
      assert.equal(await css(page, ".basalt-skip-link", "outlineWidth"), "2px");
      assert.equal(await css(page, ".basalt-skip-link", "outlineColor"), await resolve(page, "var(--basalt-border-focus)", "color"));
      near((await box(page, "#main")).y, mainTop, "showing it moves nothing", 0.01);
      await page.keyboard.press("Shift+Tab");
      await page.evaluate(() => document.activeElement?.blur());
      assert.notEqual(await css(page, ".basalt-skip-link", "clipPath"), "none", "unseen again when focus leaves");
      assert.deepEqual(page.errors, []);
      await page.close();
    });
  }

  test("following it moves focus to its target, past the bar, and the next Tab goes on from there", async () => {
    const page = await open(site(SKIP));
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    assert.equal(await where(page), "main", "a target that can take focus takes it");
    assert.equal(await page.evaluate(() => location.hash), "#main");
    await page.keyboard.press("Tab");
    assert.equal(await where(page), "before", "the next Tab is the page's first control, not the bar's brand");
    await page.close();
  });

  test("a target that cannot take focus starts the next Tab in it", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div><B.SkipLink target="#content" />${SITE_HEADER}<div id="content"><button id="inside">Inside</button></div></div>);`);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    assert.equal(await where(page), "inside", "a leading # on the target is allowed");
    assert.equal(await page.locator(".basalt-skip-link").getAttribute("href"), "#content");
    await page.close();
  });

  test("the words are the app's to replace, and anything an anchor takes passes through", async () => {
    const page = await open(`createRoot(document.getElementById("root")).render(<div><B.SkipLink target="main" className="mine" data-x="1" id="skip">Passer au contenu</B.SkipLink><main id="main" /></div>);`);
    assert.equal(await page.locator("#skip").textContent(), "Passer au contenu");
    assert.equal(await page.locator("#skip").getAttribute("class"), "basalt-skip-link mine");
    assert.equal(await page.locator("#skip").getAttribute("data-x"), "1");
    await page.close();
  });

  test("AppShell and SiteHeader render none: the app places it", async () => {
    for (const fixture of [site(), app(), own()]) {
      const page = await open(fixture);
      assert.equal(await page.locator(".basalt-skip-link").count(), 0);
      await page.close();
    }
  });

  test("an app shell takes it too, aimed at the main element it names", async () => {
    const page = await open(app(SKIP));
    await page.keyboard.press("Tab");
    assert.equal(await where(page), "basalt-skip-link", "first, before the sidebar's brand");
    await page.keyboard.press("Enter");
    assert.equal(await where(page), "main");
    await page.close();
  });

  test("44px tall on a coarse pointer, and shorter than that on a fine one", async () => {
    const touch = await open(site(SKIP), { width: 390, height: 844, hasTouch: true, isMobile: true });
    await touch.evaluate(() => document.querySelector(".basalt-skip-link").focus());
    near((await box(touch, ".basalt-skip-link")).h, 44, "a touch target", 0.01);
    assert.equal(await css(touch, ".basalt-skip-link", "boxSizing"), "border-box");
    await touch.close();
    const fine = await open(site(SKIP));
    await fine.evaluate(() => document.querySelector(".basalt-skip-link").focus());
    assert.ok((await box(fine, ".basalt-skip-link")).h < 44, "a fine pointer keeps the padding's height");
    await fine.close();
  });

  test("not drawn in print", async () => {
    const page = await open(site(SKIP));
    await page.emulateMedia({ media: "print" });
    assert.equal(await css(page, ".basalt-skip-link", "display"), "none");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`forced colours: shown in focus on the system pair, legible, with the ring (${theme})`, async () => {
      const page = await open(site(SKIP), { theme, forcedColors: "active" });
      await page.keyboard.press("Tab");
      const shown = await box(page, ".basalt-skip-link");
      near(shown.x, (await box(page, ".basalt-site-brand-mark")).x, "still on the brand's start edge");
      const fill = await css(page, ".basalt-skip-link", "backgroundColor");
      const ink = await css(page, ".basalt-skip-link", "color");
      assert.notEqual(fill, "rgba(0, 0, 0, 0)", "it keeps a fill, so the bar's words never run into it");
      assert.ok(ratio(ink, fill) >= 4.5, `the words hold 4.5:1 on the fill: ${ink} on ${fill}`);
      assert.equal(await css(page, ".basalt-skip-link", "outlineStyle"), "solid");
      assert.ok((await css(page, ".basalt-skip-link", "outlineWidth")) !== "0px");
      await page.close();
    });
  }

  test("reduced motion: it appears at once and nothing moves, because it never animated", async () => {
    const page = await open(site(SKIP), { reducedMotion: "reduce" });
    assert.equal(await css(page, ".basalt-skip-link", "transitionProperty"), "all", "no transition is declared (the default list)");
    assert.equal(await css(page, ".basalt-skip-link", "transitionDuration"), "0s");
    await page.close();
  });

  // In focus it hangs under the bar (DECISIONS 138 and 139, B3), so it covers nothing in the bar and axe's target-size rule (WCAG 2.5.8) has
  // nothing to report at 390: the page is checked in full at rest and in focus, and the link itself on a page with no bar.
  for (const [width, label] of [[1440, "1440"], [390, "390"]]) {
    for (const theme of THEMES) {
      test(`axe: clean at rest, and in focus (${theme}, ${label})`, async () => {
        const page = await open(site(SKIP), { theme, width, height: 800 });
        assert.deepEqual(await axe(page), []);
        await page.keyboard.press("Tab");
        assert.deepEqual(await axe(page), []);
        await page.close();
        const bare = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div>${SKIP}<main id="main" tabIndex={-1}><h1>Synthetic page</h1><p>Words.</p></main></div>);`, { theme, width, height: 800 });
        await bare.keyboard.press("Tab");
        assert.deepEqual(await axe(bare), []);
        await bare.close();
      });
    }
  }

  test("in focus at 390 it lies under the bar and overlaps nothing in it (it overlapped the brand link by 3,175px² before B3)", async () => {
    const page = await open(site(SKIP), { width: 390, height: 844 });
    await page.keyboard.press("Tab");
    const skip = await box(page, ".basalt-skip-link");
    const brand = await box(page, ".basalt-site-brand");
    assert.ok(!(skip.x < brand.right && skip.right > brand.x && skip.y < brand.bottom && skip.bottom > brand.y), "the boxes do not overlap");
    near(skip.x, 16, "on the brand's start edge, the 16px gutter at 390");
    await page.close();
  });
});

describe("Reserve", () => {
  // Three wordings of different lengths, with a neighbour on each side. Words are synthetic; each is unique so a search can tell them apart.
  const WORDS = { short: "Aa", medium: "Bb Bb Bb Bb", long: "Cc Cc Cc Cc Cc Cc Cc Cc Cc Cc" };
  const fixture = (align = "start") => `
    function App() {
      const [show, setShow] = React.useState("short");
      window.setShow = setShow;
      return (
        <div style={{ padding: 24, width: 600 }}>
          <div id="line" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span id="left">left</span>
            <B.Reserve id="cell" show={show} style={{ justifyItems: "${align === "end" ? "end" : "start"}" }} alternatives={{ short: ${JSON.stringify(WORDS.short)}, medium: ${JSON.stringify(WORDS.medium)}, long: <span>${WORDS.long}<button id="inner">Inner</button></span> }} />
            <span id="right">right</span>
          </div>
          <div id="probes" style={{ position: "absolute", visibility: "hidden", whiteSpace: "nowrap" }}>
            <span id="p-short">${WORDS.short}</span><br /><span id="p-medium">${WORDS.medium}</span><br /><span id="p-long">${WORDS.long}<button>Inner</button></span>
          </div>
          <button id="after">After</button>
        </div>
      );
    }
    createRoot(document.getElementById("root")).render(<App />);`;
  const measure = (page) => page.evaluate(() => {
    const r = (s) => { const b = document.querySelector(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
    return { cell: r("#cell"), left: r("#left"), right: r("#right") };
  });

  for (const theme of THEMES) {
    test(`the cell holds its size through every wording, and the neighbours do not move: 0px (${theme})`, async () => {
      const page = await open(fixture(), { theme });
      const largest = await page.evaluate(() => Math.max(...["short", "medium", "long"].map((k) => document.getElementById(`p-${k}`).getBoundingClientRect().width)));
      const seen = [];
      for (const key of ["short", "medium", "long", "short"]) {
        await page.evaluate((k) => window.setShow(k), key);
        await settle(page);
        seen.push(await measure(page));
        assert.equal(await page.locator("#cell > [data-on]").count(), 1, "one wording is on");
      }
      for (const m of seen) assert.deepEqual(m, seen[0], "the cell, and both neighbours, are where they were: 0px");
      near(seen[0].cell[2], largest, "the cell is as wide as its widest wording", 1);
      await page.close();
    });
  }

  test("justify-items on the cell places a narrower wording against its start or its end", async () => {
    for (const [align, side] of [["start", "left"], ["end", "right"]]) {
      const page = await open(fixture(align));
      const cell = (await measure(page)).cell;
      const shown = await page.locator("#cell > [data-on]").evaluate((el) => { const b = el.getBoundingClientRect(); return { x: b.x, right: b.right }; });
      if (side === "left") near(shown.x, cell[0], "starts at the cell's start");
      else near(shown.right, cell[0] + cell[2], "ends at the cell's end");
      await page.close();
    }
  });

  test("the unseen wordings are out of the accessibility tree, not focusable, not selectable and not found", async () => {
    const page = await open(fixture());
    // Show the short one; the medium and the long (which holds a button) are unseen.
    const unseen = page.locator("#cell > :not([data-on])");
    assert.equal(await unseen.count(), 2);
    for (let n = 0; n < 2; n++) {
      const el = unseen.nth(n);
      assert.equal(await el.getAttribute("aria-hidden"), "true");
      assert.notEqual(await el.getAttribute("inert"), null);
      assert.equal(await el.evaluate((node) => getComputedStyle(node).visibility), "hidden");
    }
    // The accessibility tree: the line names the seen words, and none of the others.
    const tree = await page.locator("#line").ariaSnapshot();
    assert.match(tree, /Aa/);
    assert.doesNotMatch(tree, /Bb/);
    assert.doesNotMatch(tree, /Cc/);
    assert.doesNotMatch(tree, /Inner/);
    // Focus: the button inside the unseen wording is never a tab stop.
    const stops = [];
    await page.locator("#left").evaluate(() => document.getElementById("after").focus());
    for (let i = 0; i < 3; i++) { await page.keyboard.press("Shift+Tab"); stops.push(await page.evaluate(() => document.activeElement.id)); }
    assert.ok(!stops.includes("inner"), `the unseen button took a stop: ${stops}`);
    // Selection: select the whole page; the copied text has the seen words only.
    const selected = await page.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.getElementById("line")); const s = getSelection(); s.removeAllRanges(); s.addRange(range); return s.toString(); });
    assert.match(selected, /Aa/);
    assert.doesNotMatch(selected, /Bb|Cc/);
    // Find in page: Chromium's own find, which reads the rendered text.
    const found = await page.evaluate(() => { getSelection().removeAllRanges(); return [window.find("Aa"), window.find("Bb Bb"), window.find("Cc Cc")]; });
    assert.deepEqual(found, [true, false, false]);
    // Show the long one: its button is a stop, and the short one is unseen in its turn.
    await page.evaluate(() => window.setShow("long"));
    await settle(page);
    await page.evaluate(() => document.getElementById("after").focus());
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "inner", "when it is shown it is reachable");
    await page.close();
  });

  test("a key that is not listed shows none and keeps the room", async () => {
    const page = await open(fixture());
    const before = await measure(page);
    await page.evaluate(() => window.setShow("none"));
    await settle(page);
    assert.deepEqual(await measure(page), before);
    assert.equal(await page.locator("#cell > [data-on]").count(), 0);
    await page.close();
  });

  test("Terminal and Meter draw their room with it", async () => {
    const page = await open(`document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 480 }}>
      <B.Terminal title="Demo" lines={[{ kind: "command", text: "build" }, { kind: "done", text: "ok" }]} status="running" onPause={() => {}} />
      <B.Meter label="Build minutes" unit="min" value={12} max={2000} locale="en-US" /></div>);`);
    assert.ok(await page.locator(".basalt-terminal-state .basalt-reserve.basalt-terminal-swap").count() >= 1, "the state words");
    assert.ok(await page.locator(".basalt-terminal-actions .basalt-button .basalt-reserve").count() >= 1, "the button words");
    assert.equal(await page.locator(".basalt-meter-reading.basalt-reserve").count(), 1, "the meter's reading");
    assert.equal(await page.locator(".basalt-meter-reading > .basalt-meter-reserve[aria-hidden=true]").count(), 1);
    assert.equal(await page.locator(".basalt-meter-reading > .basalt-meter-now:not([aria-hidden])").count(), 1);
    await page.close();
  });
});

describe("an anchor lands clear of a sticky bar", () => {
  const BARS = [
    ["SiteHeader", site(), ".basalt-site-header"],
    ["AppHeader", app(), ".basalt-app-header"],
    ["a page's own bar", own(), ".basalt-sticky-bar"],
  ];
  const landing = async (page, id) => {
    await page.evaluate((target) => { location.hash = ""; scrollTo(0, 0); location.hash = target; }, id);
    await settle(page);
    return page.evaluate((target) => document.getElementById(target).getBoundingClientRect().top, id);
  };

  for (const theme of THEMES) {
    for (const [name, fixture, selector] of BARS) {
      test(`${name}: an anchor lands at the bar plus space-4, 72px with no inset (${theme})`, async () => {
        const page = await open(fixture, { theme });
        assert.equal(await css(page, "html", "scrollPaddingTop"), "72px");
        assert.equal(await css(page, "html", "scrollbarGutter"), "stable");
        near(await landing(page, "alpha"), 72, "the heading's top");
        near(await landing(page, "beta"), 72, "and the next");
        // The bar is where the padding says: its own bottom is the offset, and the heading is a step below it.
        near((await box(page, selector)).bottom, 56, "the bar's bottom edge", 0.6);
        await page.close();
      });
    }
  }

  test("the distance is one source: --basalt-sticky-offset plus space-4, and the same under the three bars", async () => {
    const tops = [];
    for (const [, fixture] of BARS) {
      const page = await open(fixture, { width: 390, height: 844 });
      tops.push(await landing(page, "alpha"));
      await page.close();
    }
    for (const top of tops) near(top, tops[0], "the landing is the same under every bar", 0.01);
    near(tops[0], 72, "and is the documented distance");
  });

  test("a bar of another height sets the one property on the root, and the landing follows it with the same step", async () => {
    const page = await open(own(`, height: 80`));
    await page.addStyleTag({ content: `:root { --basalt-sticky-offset: 80px; }` });
    assert.equal(await css(page, "html", "scrollPaddingTop"), "96px", "80 plus space-4");
    near(await landing(page, "alpha"), 96, "the heading lands below the 80px bar by a step");
    await page.close();
  });

  test("a page with no bar keeps no padding and no stable gutter", async () => {
    const page = await open(`createRoot(document.getElementById("root")).render(<main style={{ minHeight: 3000 }}><h2 id="alpha" style={{ marginTop: 1500 }}>Alpha</h2></main>);`);
    assert.equal(await css(page, "html", "scrollPaddingTop"), "auto");
    assert.notEqual(await css(page, "html", "scrollbarGutter"), "stable");
    await page.close();
  });
});

// The Tab claim. blacksand3 wrote that Basalt's `scroll-padding-top` makes the first Tab into the bar scroll the page, and replaced
// the padding with a scroll margin on every heading and focusable thing. Measured here: the claim is true. A thing in the bar sits
// inside the scroll padding's band, so focusing it from a scrolled page scrolls the page until it clears the band. The fix is a
// scroll margin on what is in the bar (components.css), which holds the page still and leaves the landing distance as it was.
describe("Tab into a bar does not scroll the page", () => {
  const bars = [
    ["SiteHeader", site(), ".basalt-site-header", 1440],
    ["SiteHeader, narrow", site(), ".basalt-site-header", 390],
    ["AppHeader", app(), ".basalt-app-header", 1440],
    ["AppHeader, narrow", app(), ".basalt-app-header", 390],
    ["a page's own bar", own(), ".basalt-sticky-bar", 1440],
  ];
  const stopsIn = (page, selector) => page.evaluate((s) => [...document.querySelector(s).querySelectorAll("a[href], button")].filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden").map((el) => el.textContent.trim() || el.getAttribute("aria-label") || "?"), selector);
  const here = (page) => page.evaluate(() => scrollY);

  for (const [name, fixture, selector, width] of bars) {
    test(`${name}, ${width}: every stop in the bar, by Tab from the top and from a scrolled page, leaves the scroll where it was`, async () => {
      const page = await open(fixture, { width, height: 800 });
      const stops = await stopsIn(page, selector);
      assert.ok(stops.length >= 1, `the bar has stops to visit: ${stops}`);
      // From the top of a long page: Tab until the focus has been through the bar. It never scrolls.
      assert.equal(await here(page), 0);
      for (let i = 0; i < stops.length + 2; i++) {
        await page.keyboard.press("Tab");
        if (await page.evaluate((s) => document.activeElement?.closest(s) !== null, selector)) assert.equal(await here(page), 0, `the top: stop ${i + 1}`);
      }
      // From a scrolled position (the page restored there, nothing focused): every stop in the bar, by programmatic focus, and by Shift+Tab from the content.
      for (const y of [600, 1800]) {
        await page.evaluate((to) => { document.activeElement?.blur(); scrollTo(0, to); }, y);
        const at = await here(page);
        await page.evaluate((s) => { for (const el of document.querySelectorAll(`${s} a[href], ${s} button`)) if (el.getClientRects().length > 0) { el.focus(); window.__stops = (window.__stops ?? []).concat(scrollY); } }, selector);
        const after = await page.evaluate(() => window.__stops);
        await page.evaluate(() => { window.__stops = []; });
        for (const scrolled of after) assert.equal(scrolled, at, `programmatic focus into the bar from ${y} moved the page`);
        await page.evaluate((to) => { scrollTo(0, to); document.getElementById("before")?.focus({ preventScroll: true }); }, y);
        for (let i = 0; i < stops.length + 1; i++) {
          await page.keyboard.press("Shift+Tab");
          if (await page.evaluate((s) => document.activeElement?.closest(s) !== null, selector)) assert.equal(await here(page), at, `Shift+Tab into the bar from ${y}, stop ${i + 1}`);
        }
      }
      await page.close();
    });
  }

  test("the check is not vacuous: without the scroll margin the same Tab does scroll the page (the claim is true)", async () => {
    const page = await open(site());
    // Put back what the padding does on its own: an unlayered rule outranks the layer's, so the bar's contents have no margin.
    await page.addStyleTag({ content: `.basalt-site-header * { scroll-margin-top: 0 !important; }` });
    await page.evaluate(() => scrollTo(0, 1800));
    await page.evaluate(() => document.querySelector(".basalt-site-header a[href]").focus());
    assert.ok((await here(page)) < 1800, "with only the padding, focusing the brand scrolled the page up");
    await page.close();
  });

  test("and the margin does not move an anchor: the landing is still the padding's", async () => {
    const page = await open(site());
    await page.evaluate(() => document.querySelector(".basalt-site-header a[href]").focus());
    await page.evaluate(() => { location.hash = "alpha"; });
    await settle(page);
    near(await page.evaluate(() => document.getElementById("alpha").getBoundingClientRect().top), 72, "the heading");
    await page.close();
  });

  for (const theme of THEMES) {
    for (const width of [1440, 390]) {
      test(`axe: a page with its own bar and its skip link is clean (${theme}, ${width})`, async () => {
        const page = await open(own("", `<B.SkipLink target="main" />`), { theme, width });
        assert.deepEqual(await axe(page), []);
        await page.close();
      });
    }
  }
});
