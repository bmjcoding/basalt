// DECISIONS 154, the controls batch, tabs: link tabs (D12) and panels that share one seat (X6), with the 48 and 56 sizes of Tabs. Driven in
// Chromium against the built package with the real stylesheet, in both themes, in forced colours, at 1440 and 390 and on a coarse pointer.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const THEMES = ["dark", "light"];
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const open = async (jsx, options = {}) => {
  const { page, errors } = await fixturePage(browser, render(jsx), options);
  if (options.isMobile) {
    await page.evaluate(() => { const m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width, initial-scale=1"; document.head.append(m); });
    await page.waitForFunction((w) => window.innerWidth === w, options.viewport.width);
  }
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); margin: 0; }" });
  await settle(page);
  return { page, errors };
};
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const css = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const axe = async (page) => {
  await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
  await page.addScriptTag({ content: axeSource });
  return (await page.evaluate((o) => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, o), AXE)).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
};

const LINKS = (size = "") => `<div style={{ boxSizing: "border-box", width: "100%", padding: "0 16px" }}><B.LinkTabs aria-label="What it is" ${size}>
  <B.LinkTab href="#a" current>Everything</B.LinkTab><B.LinkTab href="#b">Protein</B.LinkTab><B.LinkTab href="#c">Creatine</B.LinkTab><B.LinkTab href="#d">Pre-workout</B.LinkTab></B.LinkTabs></div>`;

describe("D12: link tabs", () => {
  test("a nav of links, not a tablist: every link a tab stop, the current one aria-current=page", async () => {
    const { page } = await open(LINKS(), DESKTOP);
    assert.equal(await page.getByRole("navigation", { name: "What it is" }).count(), 1);
    assert.equal(await page.getByRole("tablist").count(), 0);
    assert.equal(await page.getByRole("link").count(), 4);
    assert.equal(await page.locator("a[aria-current=page]").count(), 1);
    assert.equal(await page.locator("a[aria-current=page]").textContent(), "Everything");
    for (const link of await page.getByRole("link").all()) assert.equal(await link.evaluate((el) => el.tabIndex), 0);
  });

  test("heights 36, 48 and 56; 16px text from 48; 24px between two labels; the first has no start padding", async () => {
    for (const [size, h, font] of [["", 36, "13px"], ['size="3xl"', 48, "16px"], ['size="5xl"', 56, "16px"]]) {
      const { page } = await open(LINKS(size), DESKTOP);
      const links = page.getByRole("link");
      assert.equal((await box(links.nth(1))).height, h, size);
      assert.equal((await css(links.nth(1), "fontSize")).fontSize, font);
      assert.equal((await css(links.nth(0), "paddingLeft")).paddingLeft, "0px", "the first link's label is on the content edge");
      if (size) {
        const [a, b] = [await box(links.nth(1).locator(".basalt-link-tab-label")), await box(links.nth(2).locator(".basalt-link-tab-label"))];
        assert.equal(b.x - (a.x + a.width), 24, "24px between two labels");
        assert.equal((await css(links.nth(1), "borderTopLeftRadius")).borderTopLeftRadius, "8px");
      }
      await page.close();
    }
  });

  for (const theme of THEMES) {
    test(`the current link is primary with a real 2px underline element; the rest are secondary; hover lifts the ink (${theme})`, async () => {
      const { page } = await open(LINKS('size="3xl"'), { theme, ...DESKTOP });
      const ink = await page.evaluate(() => { const p = document.createElement("i"); document.body.append(p); const read = (v) => { p.style.color = v; return getComputedStyle(p).color; }; return { primary: read("var(--basalt-text-primary)"), secondary: read("var(--basalt-text-secondary)") }; });
      const [cur, other] = [page.getByRole("link").nth(0), page.getByRole("link").nth(1)];
      assert.equal((await css(cur, "color")).color, ink.primary);
      assert.equal((await css(other, "color")).color, ink.secondary);
      const line = cur.locator(".basalt-link-tab-line");
      assert.equal((await box(line)).height, 2);
      assert.equal((await css(line, "opacity")).opacity, "1");
      assert.equal((await css(other.locator(".basalt-link-tab-line"), "opacity")).opacity, "0");
      assert.equal((await css(line, "backgroundColor")).backgroundColor, ink.primary);
      await other.hover();
      await page.waitForFunction((p) => getComputedStyle(document.querySelectorAll("a")[1]).color === p, ink.primary);
      assert.deepEqual(await axe(page), []);
    });
  }

  test("the underline is static: no transition on it, and it sits on the row's bottom edge", async () => {
    const { page } = await open(LINKS('size="3xl"'), DESKTOP);
    const line = page.locator("a[aria-current] .basalt-link-tab-line");
    assert.equal((await css(line, "transitionDuration")).transitionDuration, "0s");
    const [l, ul] = [await box(line), await box(page.locator(".basalt-link-tabs > ul"))];
    assert.equal(l.y + l.height, ul.y + ul.height);
  });

  test("focus is the control ring at +2, outside the link, never an inset outline", async () => {
    const { page } = await open(LINKS('size="3xl"'), DESKTOP);
    await page.keyboard.press("Tab");
    const ring = await css(page.locator("a:focus"), "outlineWidth", "outlineStyle", "outlineOffset");
    assert.deepEqual([ring.outlineWidth, ring.outlineStyle, ring.outlineOffset], ["2px", "solid", "2px"]);
  });

  test("moving the current link moves no link: the row and every link keep their boxes (0px)", async () => {
    const { page } = await open(`(() => { const App = () => { const [c, setC] = React.useState(0); return <div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="k" size="3xl">{["Everything", "Protein", "Creatine"].map((n, i) => <B.LinkTab key={n} href="#" current={c === i} onClick={(e) => { e.preventDefault(); setC(i); }}>{n}</B.LinkTab>)}</B.LinkTabs></div>; }; return <App />; })()`, DESKTOP);
    const all = async () => { const o = []; for (const a of await page.getByRole("link").all()) o.push(await box(a)); o.push(await box(page.locator(".basalt-link-tabs"))); return o; };
    const before = await all();
    await page.getByRole("link").nth(2).click();
    assert.deepEqual(await all(), before);
    assert.equal(await page.locator("a[aria-current=page]").textContent(), "Creatine");
  });

  test("a router's link can draw the tab through render", async () => {
    const { page } = await open(`<B.LinkTabs aria-label="k"><B.LinkTab render={<a data-router="" href="/x" />} current>One</B.LinkTab></B.LinkTabs>`, DESKTOP);
    assert.equal(await page.locator("a[data-router].basalt-link-tab[aria-current=page]").count(), 1);
  });

  test("from 720 the row wraps and does not scroll, and a link on a coarse pointer is at least 44 tall", async () => {
    const { page } = await open(LINKS('size="3xl"'), { viewport: { width: 760, height: 844 }, hasTouch: true, isMobile: true });
    const ul = await page.evaluate(() => { const u = document.querySelector(".basalt-link-tabs > ul"); return { flexWrap: getComputedStyle(u).flexWrap, overflowX: getComputedStyle(u).overflowX, scrolls: u.scrollWidth > u.clientWidth }; });
    assert.deepEqual(ul, { flexWrap: "wrap", overflowX: "visible", scrolls: false });
    for (const a of await page.getByRole("link").all()) assert.ok((await box(a)).height >= 44);
    const small = await open(LINKS(), { viewport: { width: 760, height: 844 }, hasTouch: true, isMobile: true });
    assert.ok((await box(small.page.getByRole("link").first())).height >= 44, "the 36px size reaches 44 on touch");
  });

  test("in forced colours the current underline is Highlight and keeps its 2px", async () => {
    const { page } = await open(LINKS('size="3xl"'), DESKTOP);
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const hl = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); p.style.backgroundColor = "Highlight"; const c = getComputedStyle(p).backgroundColor; p.remove(); return c; });
    const line = page.locator("a[aria-current] .basalt-link-tab-line");
    assert.equal((await css(line, "backgroundColor")).backgroundColor, hl);
    assert.equal((await box(line)).height, 2);
  });

  for (const theme of THEMES) for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`axe: link tabs at ${name} (${theme}), the row at 1440 and the Select at 390`, async () => {
      const { page } = await open(LINKS('size="5xl"'), { theme, ...options });
      assert.deepEqual(await axe(page), []);
    });
  }
});

describe("D12, A15: under 720 the row is a Select of the same links (3 to 1)", () => {
  const NAMES = ["Everything", "Protein", "Creatine", "Pre-workout"];
  const APP = (extra = "") => `(() => { const App = () => { const [c, setC] = React.useState(0); return <div style={{ boxSizing: "border-box", width: "100%", padding: "0 16px" }}><B.LinkTabs aria-label="What it is" size="3xl" ${extra} onNavigate={(href) => { window.__went = href; setC(${JSON.stringify(NAMES)}.findIndex((n) => "#" + n === href)); }}>{${JSON.stringify(NAMES)}.map((n, i) => <B.LinkTab key={n} href={"#" + n} current={c === i}>{n}</B.LinkTab>)}</B.LinkTabs><p id="under" style={{ margin: 0 }}>Under the tabs</p><button id="after">After</button></div>; }; return <App />; })()`;
  const view = (width) => ({ viewport: { width, height: 800 } });
  /** What the accessibility tree exposes of the navigation, and what Tab reaches in it: a snapshot of the nav, then Tab until focus leaves it. */
  const exposed = async (page) => {
    const snapshot = await page.getByRole("navigation", { name: "What it is" }).ariaSnapshot();
    await page.evaluate(() => { document.body.insertAdjacentHTML("afterbegin", '<button id="before">Before</button>'); document.getElementById("before").focus(); });
    const stops = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const at = await page.evaluate(() => document.activeElement && (document.activeElement.closest("nav") ? (document.activeElement.getAttribute("role") ?? document.activeElement.tagName.toLowerCase()) : document.activeElement.id));
      if (at === "after" || at === "") break;
      stops.push(at);
    }
    return { snapshot, stops };
  };

  for (const theme of THEMES) {
    test(`at 719 the Select is the one navigation exposed and at 720 the row is, by CSS alone (${theme})`, async () => {
      for (const [width, form] of [[719, "select"], [720, "row"]]) {
        const { page } = await open(APP(), { theme, ...view(width) });
        const display = await page.evaluate(() => ({ row: getComputedStyle(document.querySelector(".basalt-link-tabs > ul")).display, select: getComputedStyle(document.querySelector(".basalt-link-tabs-select")).display }));
        assert.deepEqual(display, form === "row" ? { row: "flex", select: "none" } : { row: "none", select: "block" }, `${width}`);
        const { snapshot, stops } = await exposed(page);
        if (form === "row") {
          assert.equal((snapshot.match(/- link /g) ?? []).length, 4, snapshot);
          assert.ok(!/combobox/.test(snapshot), "no Select in the tree at 720");
          assert.equal(stops.length, 4, `four link stops at 720: ${stops}`);
        } else {
          assert.ok(/combobox "Go to Everything"/.test(snapshot), `the Select's name is "Go to" and the current page's name: ${snapshot}`);
          assert.ok(!/- link /.test(snapshot), "no link in the tree at 719");
          assert.equal(stops.length, 1, `one stop at 719: ${stops}`);
        }
        await page.close();
      }
    });
  }

  // B5: every 44px target rule applies under 720 whatever the pointer, and the Select is only drawn under 720 (or in a container under 640), so the 36
  // row's Select is 44 at 390 with a mouse too.
  test("the Select is Castle's 44 for the 48 row, 44 for the 36 row under 720 (B5) and 48 for the 56 row, and a coarse pointer makes none less than 44", async () => {
    for (const [size, h] of [["lg", 44], ["3xl", 44], ["5xl", 48]]) {
      const { page } = await open(`<div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="What it is" size="${size}"><B.LinkTab href="#a" current>One</B.LinkTab><B.LinkTab href="#b">Two</B.LinkTab></B.LinkTabs></div>`, view(390));
      const trigger = page.locator(".basalt-select-trigger");
      assert.equal((await box(trigger)).height, h, `${size}`);
      assert.equal((await trigger.locator(".basalt-select-value").textContent()).trim(), "One");
      const touch = await open(`<div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="What it is" size="${size}"><B.LinkTab href="#a" current>One</B.LinkTab></B.LinkTabs></div>`, PHONE);
      assert.ok((await box(touch.page.locator(".basalt-select-trigger"))).height >= 44, `${size} on touch`);
    }
  });

  test("across 719 and 720 what is below the component moves by the row's height less the Select's: -8px at 36 (its Select is 44 under 720, B5), 4px at 48, 8px at 56, and 0 for a 56 row in a container under 640", async () => {
    for (const [size, wrap, move] of [["lg", "", -8], ["3xl", "", 4], ["5xl", "", 8], ["5xl", 'containerType: "inline-size", width: 600, ', 0]]) {
      const heights = {};
      for (const width of [719, 720]) {
        const { page } = await open(`<div style={{ ${wrap}padding: 0 }}><B.LinkTabs aria-label="k" size="${size}"><B.LinkTab href="#a" current>One</B.LinkTab><B.LinkTab href="#b">Two</B.LinkTab></B.LinkTabs><p id="under" style={{ margin: 0 }}>Under</p></div>`, view(width));
        heights[width] = (await box(page.locator("#under"))).y;
        await page.close();
      }
      assert.equal(heights[720] - heights[719], move, `${size}${wrap ? " in 600" : ""}: ${JSON.stringify(heights)}`);
    }
  });

  test("the Select says where choosing goes: a visible \"Go to\" before the current page's name, and the same words start its accessible name (WCAG 2.5.3)", async () => {
    const { page } = await open(APP(), view(390));
    const trigger = page.locator(".basalt-select-trigger");
    assert.equal((await page.locator(".basalt-select-prefix").textContent()).trim(), "Go to");
    const visible = (await trigger.innerText()).replace(/\s+/g, " ").trim();
    assert.equal(visible, "Go to Everything", "what is drawn");
    const snapshot = await page.getByRole("navigation", { name: "What it is" }).ariaSnapshot();
    assert.ok(/combobox "Go to Everything"/.test(snapshot), snapshot);
    assert.ok(snapshot.includes("Go to"), "the visible label is in the name");
    // one line: the label sits beside the value, on the trigger's own line
    const [a, b] = [await box(page.locator(".basalt-select-prefix")), await box(page.locator(".basalt-select-value"))];
    assert.ok(Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)) < 4 && b.x > a.x + a.width, "the label then the value, on one line");
    assert.equal((await box(trigger)).height, 44, "the height is the Select's own at this size");
  });

  test("the label is secondary ink and the value the trigger's own; the words are a prop; and the trigger is the same size and place as a Select without them", async () => {
    const { page } = await open(`<div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="Aller" size="3xl" goToLabel="Aller à"><B.LinkTab href="#a" current>Un</B.LinkTab><B.LinkTab href="#b">Deux</B.LinkTab></B.LinkTabs><B.Select aria-label="Plain" controlSize="2xl" value="a" options={[{ value: "a", label: "Un" }]} /></div>`, view(390));
    const ink = await page.evaluate(() => { const p = document.createElement("i"); document.body.append(p); const read = (v) => { p.style.color = v; return getComputedStyle(p).color; }; return { secondary: read("var(--basalt-text-secondary)"), primary: read("var(--basalt-text-primary)") }; });
    assert.equal((await css(page.locator(".basalt-select-prefix"), "color")).color, ink.secondary);
    assert.equal((await css(page.locator(".basalt-select-value").first(), "color")).color, ink.primary);
    assert.ok(/combobox "Aller à Un"/.test(await page.getByRole("navigation", { name: "Aller" }).ariaSnapshot()), "replaced words are in the name too");
    const [t, plain] = [await box(page.locator(".basalt-select-trigger").first()), await box(page.locator(".basalt-select-trigger").nth(1))];
    assert.deepEqual([t.height, t.width, t.x], [plain.height, plain.width, plain.x]);
  });

  test("the closed Select: a typed letter, ArrowDown, ArrowUp, Home, End and PageDown navigate nowhere and leave the value on the current page; the arrows open the list", async () => {
    for (const key of ["p", "c", "ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"]) {
      const { page } = await open(APP(), view(390));
      await page.evaluate(() => { window.__nav = []; });
      await page.evaluate(() => {});
      const trigger = page.locator(".basalt-select-trigger");
      await trigger.focus();
      await page.keyboard.press(key);
      await settle(page);
      assert.equal(await page.evaluate(() => window.__went ?? null), null, `${key}: navigations`);
      assert.equal((await trigger.locator(".basalt-select-value").textContent()).trim(), "Everything", `${key}: the value is still the current page`);
      assert.equal(await page.evaluate(() => location.hash), "", `${key}: the page did not move`);
      await page.close();
    }
  });

  for (const how of ["a click on an option", "Enter on the highlighted option"]) {
    test(`a choice from the open list navigates once: ${how}`, async () => {
      const { page } = await open(`(() => { window.__all = []; return <B.LinkTabs aria-label="What it is" size="3xl" onNavigate={(h) => window.__all.push(h)}>{["Everything", "Protein", "Creatine"].map((n, i) => <B.LinkTab key={n} href={"#" + n} current={i === 0}>{n}</B.LinkTab>)}</B.LinkTabs>; })()`, view(390));
      const trigger = page.locator(".basalt-select-trigger");
      if (how.startsWith("a click")) {
        await trigger.click();
        await page.getByRole("option", { name: "Creatine" }).click();
      } else {
        await trigger.focus();
        await page.keyboard.press("ArrowDown");
        await page.getByRole("option").first().waitFor();
        await page.keyboard.press("ArrowDown");
        // Enter acts on the highlighted option: wait for the highlight to move to the second option, not for a fixed time.
        await page.locator('[role="option"][data-highlighted]', { hasText: "Protein" }).waitFor();
        await page.keyboard.press("Enter");
      }
      await settle(page);
      assert.equal(await page.evaluate(() => window.__all.length), 1, "one navigation");
    });
  }

  test("no element of the page moves between the server's markup and after mount at 390 (0px), and the row is not drawn at all", async () => {
    const { page } = await fixturePage(browser, `import { renderToString } from "react-dom/server"; import { hydrateRoot } from "react-dom/client";
      const App = () => <div style={{ boxSizing: "border-box", width: "100%", padding: "0 16px" }}><h1 style={{ margin: 0 }}>Title</h1><B.LinkTabs aria-label="What it is" size="3xl"><B.LinkTab href="#a" current>Everything</B.LinkTab><B.LinkTab href="#b">Protein</B.LinkTab><B.LinkTab href="#c">Creatine</B.LinkTab></B.LinkTabs><p id="under" style={{ margin: 0 }}>Under the tabs</p><button id="after">After</button></div>;
      window.serverHtml = () => renderToString(<App />);
      window.hydrate = () => { window.__root = hydrateRoot(document.getElementById("root"), <App />); };`, view(390));
    await page.addStyleTag({ content: "body { margin: 0; background: var(--basalt-surface-page); color: var(--basalt-text-primary); font-family: var(--basalt-font-family-sans); }" });
    await page.evaluate(() => { document.getElementById("root").innerHTML = window.serverHtml(); });
    const read = () => page.evaluate(() => [...document.querySelectorAll("h1, nav, .basalt-link-tabs-select, .basalt-select-trigger, #under, #after")].map((e) => { const r = e.getBoundingClientRect(); return [e.className || e.id || e.tagName, r.x, r.y, r.width, r.height]; }));
    const before = await read();
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-link-tabs > ul")).display), "none", "the server's markup already shows the Select form at 390");
    assert.ok(before.some(([name, , , , h]) => /select-trigger/.test(name) && h === 44), `the trigger is in the server's markup: ${JSON.stringify(before)}`);
    await page.evaluate(() => window.hydrate());
    await page.waitForFunction(() => document.querySelector(".basalt-select-trigger[data-popup-open], .basalt-select-trigger"));
    await settle(page);
    assert.deepEqual(await read(), before, "every box is where the server put it");
  });

  test("the Select's value is the current link and follows it, and the nav keeps its own name", async () => {
    const { page } = await open(APP(), view(390));
    const trigger = page.locator(".basalt-select-trigger");
    assert.equal((await trigger.locator(".basalt-select-value").textContent()).trim(), "Everything");
    await trigger.click();
    await page.getByRole("option", { name: "Creatine" }).click();
    await page.waitForFunction(() => window.__went === "#Creatine");
    assert.equal((await trigger.locator(".basalt-select-value").textContent()).trim(), "Creatine", "the value follows the page the app moved to");
    assert.equal(await page.getByRole("navigation", { name: "What it is" }).count(), 1);
    await page.setViewportSize({ width: 900, height: 800 });
    assert.equal(await page.locator("a[aria-current=page]").textContent(), "Creatine", "the row's aria-current agrees with the Select's value");
  });

  test("choosing a value navigates, with the link's href and the app's callback, and focus is still on the Select", async () => {
    const { page } = await open(APP(), view(390));
    const trigger = page.locator(".basalt-select-trigger");
    await trigger.click();
    await page.getByRole("option", { name: "Protein" }).click();
    await page.waitForFunction(() => window.__went === "#Protein");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-select-trigger")), true, "focus did not move");
    // by keyboard: open, arrow, Enter
    await page.keyboard.press("Enter");
    await page.getByRole("option").first().waitFor();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.__went !== "#Protein");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-select-trigger")), true, "still on the Select after the keys");
  });

  test("with no callback the default navigates by the link's href, and focus stays", async () => {
    const { page } = await open(`<B.LinkTabs aria-label="What it is"><B.LinkTab href="#one" current>One</B.LinkTab><B.LinkTab href="#two">Two</B.LinkTab></B.LinkTabs>`, view(390));
    const trigger = page.locator(".basalt-select-trigger");
    await trigger.click();
    await page.getByRole("option", { name: "Two" }).click();
    await page.waitForFunction(() => location.hash === "#two");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains("basalt-select-trigger")), true);
    assert.equal((await trigger.locator(".basalt-select-value").textContent()).trim(), "One", "an app that does not move `current` keeps the Select agreeing with the row");
  });

  test("a router's link: a render element with `to` still gives the Select its value", async () => {
    const { page } = await open(`<B.LinkTabs aria-label="Routes" onNavigate={(h) => { window.__went = h; }}><B.LinkTab render={<a to="/a" />} current>One</B.LinkTab><B.LinkTab render={<a to="/b" />}>Two</B.LinkTab></B.LinkTabs>`, view(390));
    await page.locator(".basalt-select-trigger").click();
    await page.getByRole("option", { name: "Two" }).click();
    await page.waitForFunction(() => window.__went === "/b");
  });
});

describe("D12: Tabs at 48 and 56", () => {
  const TABS = (size, wrap = "") => `<div ${wrap} style={{ containerType: "inline-size" }}><B.Tabs defaultValue="a" size="${size}"><B.TabsList aria-label="Dashboard"><B.Tab value="a">Week</B.Tab><B.Tab value="b">Trends</B.Tab></B.TabsList><B.TabsPanel value="a">A</B.TabsPanel><B.TabsPanel value="b">B</B.TabsPanel></B.Tabs></div>`;
  test("a tab is 48 or 56 tall, 16px text, radius 8 above, 10px of padding and 24px between labels; the default is untouched", async () => {
    for (const [size, h] of [["3xl", 48], ["5xl", 56]]) {
      const { page } = await open(TABS(size), DESKTOP);
      const [a, b] = [page.getByRole("tab", { name: "Week" }), page.getByRole("tab", { name: "Trends" })];
      assert.equal((await box(a)).height, h);
      assert.deepEqual(Object.values(await css(a, "fontSize", "paddingLeft", "borderTopLeftRadius")), ["16px", "10px", "8px"]);
      const [la, lb] = [await box(a), await box(b)];
      assert.equal(lb.x - (la.x + la.width), 4);
      await page.close();
    }
    const { page } = await open(`<B.Tabs defaultValue="a"><B.TabsList aria-label="x"><B.Tab value="a">Week</B.Tab></B.TabsList></B.Tabs>`, DESKTOP);
    assert.equal((await box(page.getByRole("tab"))).height, 36);
  });
  test("the 56 bar is 48 in a container narrower than 640 and 56 at 640", async () => {
    for (const [w, h] of [[639, 48], [640, 56]]) {
      const { page } = await open(`<div style={{ containerType: "inline-size", width: ${w} }}><B.Tabs defaultValue="a" size="5xl"><B.TabsList aria-label="x"><B.Tab value="a">Week</B.Tab></B.TabsList></B.Tabs></div>`, DESKTOP);
      assert.equal((await box(page.getByRole("tab"))).height, h, `${w} wide`);
      await page.close();
    }
  });
  test("the underline is the same 2px element at the new sizes", async () => {
    const { page } = await open(TABS("3xl"), DESKTOP);
    assert.equal((await box(page.locator(".basalt-tabs-indicator"))).height, 2);
  });
});

describe("X6: panels that share one seat", () => {
  const PANELS = (stacked, width = "") => `<div ${width} style={{ width: ${width ? 800 : '"100%"'} }}><B.Tabs defaultValue="a"><B.TabsList aria-label="Views"><B.Tab value="a">Week</B.Tab><B.Tab value="b">Trends</B.Tab><B.Tab value="c">Plan</B.Tab></B.TabsList>
    <B.TabsPanels ${stacked ? "stacked" : ""}><B.TabsPanel value="a" keepMounted><div data-testid="pa" style={{ height: 120 }}>Week view</div></B.TabsPanel><B.TabsPanel value="b" keepMounted><div style={{ height: 300 }}>Trends view <button>Inside trends</button></div></B.TabsPanel><B.TabsPanel value="c" keepMounted><div style={{ height: 60 }}>Plan view</div></B.TabsPanel></B.TabsPanels></B.Tabs><p id="under">Under the tabs</p></div>`;

  test("the view is as tall as its tallest panel and a change of tab moves nothing under it (0px)", async () => {
    const { page } = await open(PANELS(true), DESKTOP);
    const under = async () => (await box(page.locator("#under"))).y;
    const wrapper = async () => (await box(page.locator(".basalt-tabs-panels"))).height;
    const before = [await under(), await wrapper()];
    assert.ok(before[1] >= 300, "the seat holds the tallest panel (300)");
    for (const name of ["Trends", "Plan", "Week"]) {
      await page.getByRole("tab", { name }).click();
      await settle(page);
      assert.deepEqual([await under(), await wrapper()], before, `after ${name}`);
    }
  });

  test("the panels that are not shown keep their room but leave the accessibility tree, focus and find: hidden and inert", async () => {
    const { page } = await open(PANELS(true), DESKTOP);
    const hidden = page.locator(".basalt-tabs-panel[hidden]");
    assert.equal(await hidden.count(), 2);
    for (const el of await hidden.all()) {
      const s = await css(el, "visibility", "display");
      assert.deepEqual([s.visibility, s.display], ["hidden", "block"]);
      assert.equal(await el.evaluate((e) => e.inert), true);
    }
    assert.equal(await page.getByRole("button", { name: "Inside trends" }).count(), 0, "not in the accessibility tree");
    await page.getByRole("tab", { name: "Trends" }).click();
    assert.equal(await page.getByRole("button", { name: "Inside trends" }).count(), 1);
  });

  test("it is off by default: tabs without it draw a hidden panel as display: none and the panels one under another", async () => {
    const { page } = await open(PANELS(false), DESKTOP);
    assert.equal((await css(page.locator(".basalt-tabs-panel[hidden]").first(), "display")).display, "none");
    assert.equal((await css(page.locator(".basalt-tabs-panels"), "display")).display, "block");
  });

  test("in a container narrower than 640 the panels stop sharing a seat and each takes its own height", async () => {
    for (const [w, shared] of [[639, false], [640, true]]) {
      const { page } = await open(`<div style={{ width: ${w} }}><B.Tabs defaultValue="a"><B.TabsList aria-label="V"><B.Tab value="a">Week</B.Tab><B.Tab value="b">Trends</B.Tab></B.TabsList><B.TabsPanels stacked><B.TabsPanel value="a"><div style={{ height: 100 }}>a</div></B.TabsPanel><B.TabsPanel value="b"><div style={{ height: 300 }}>b</div></B.TabsPanel></B.TabsPanels></B.Tabs></div>`, DESKTOP);
      const h = (await box(page.locator(".basalt-tabs-panels"))).height;
      assert.equal(h >= 300, shared, `${w} wide: ${h}`);
      await page.close();
    }
  });

  test("the incoming panel's slide still plays on stacked panels without moving the seat", async () => {
    const { page } = await open(PANELS(true), DESKTOP);
    await page.getByRole("tab", { name: "Trends" }).click();
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-tabs-panel:not([hidden])")).animationName);
    assert.match(anim, /slide/);
    await settle(page);
  });

  for (const theme of THEMES) for (const [name, options] of [["1440", DESKTOP], ["390", PHONE]]) {
    test(`axe: stacked panels at ${name} (${theme})`, async () => {
      const { page } = await open(PANELS(true), { theme, ...options });
      assert.deepEqual(await axe(page), []);
    });
  }
});

// A link tab's selected state (DECISIONS 138 A, 145, 149, and the ballot's D12 row "chosen label 600 reserving width"): the current link's label is 600 in primary ink,
// a resting one 400 in secondary, every label reserves its 600 width and starts where it did, so choosing a page moves nothing. Joined in integration-nov15b.
describe("D12: a link tab takes the selected state (400 in secondary at rest, 600 in primary when current, its 600 width reserved)", () => {
  // Castle's own nine labels are not in the repository, so these nine stand in: short and long words, a hyphen, a two-word label and an ampersand.
  const NINE = ["Everything", "Protein", "Creatine", "Pre-workout", "Vitamins & minerals", "Sleep", "Bars", "Mass gainers", "Accessories"];
  const APP = (names, size = "3xl", wrap = "") => `(() => { const names = ${JSON.stringify(names)}; const App = () => { const [c, setC] = React.useState(0); return <div style={{ boxSizing: "border-box", width: "100%", padding: "0 16px"${wrap} }}><B.LinkTabs aria-label="k" size="${size}">{names.map((n, i) => <B.LinkTab key={n} href="#" current={c === i} onClick={(e) => { e.preventDefault(); setC(i); }}>{n}</B.LinkTab>)}</B.LinkTabs></div>; }; return <App />; })()`;
  // Every link's box, its label's box, and the x where its words start (a range over the first text), so a word that slid inside a box that did not move shows too.
  const geometry = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-link-tab")].map((a) => {
    const r = a.getBoundingClientRect(); const l = a.querySelector(".basalt-link-tab-label").getBoundingClientRect();
    const walker = document.createTreeWalker(a.querySelector(".basalt-link-tab-label"), NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() && !n.parentElement.closest("[data-wide]") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    const range = document.createRange(); range.selectNodeContents(walker.nextNode()); const t = range.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height, l.x, l.width, t.x];
  }));

  for (const theme of THEMES) {
    test(`a resting link is 400 in secondary ink and the current one 600 in primary (${theme})`, async () => {
      const { page } = await open(LINKS('size="3xl"'), { theme, ...DESKTOP });
      const ink = await page.evaluate(() => { const p = document.createElement("i"); document.body.append(p); const read = (v) => { p.style.color = v; return getComputedStyle(p).color; }; return { primary: read("var(--basalt-text-primary)"), secondary: read("var(--basalt-text-secondary)") }; });
      const weight = (n) => page.getByRole("link").nth(n).locator("[data-label]").evaluate((el) => getComputedStyle(el).fontWeight);
      assert.equal(await weight(0), "600");
      assert.equal((await css(page.getByRole("link").nth(0), "color")).color, ink.primary);
      for (const n of [1, 2, 3]) {
        assert.equal(await weight(n), "400", `link ${n} at rest`);
        assert.equal((await css(page.getByRole("link").nth(n), "color")).color, ink.secondary);
      }
      assert.equal((await css(page.getByRole("link").nth(1), "fontWeight")).fontWeight, "400", "a resting link is not 500 any more");
    });

    test(`choosing a page moves no link's box and no word's start edge, for nine labels at 1440 (${theme}) (0px)`, async () => {
      const { page } = await open(APP(NINE), { theme, ...DESKTOP });
      const before = await geometry(page);
      for (const i of [3, 8, 4, 0, 6]) {
        await page.getByRole("link").nth(i).click();
        assert.equal(await page.locator("a[aria-current=page]").textContent(), NINE[i]);
        assert.deepEqual(await geometry(page), before, `choosing ${NINE[i]}`);
      }
    });

    test(`a short label and a long label keep their boxes and their start edges when chosen (${theme}) (0px)`, async () => {
      const names = ["Hi", "Everything for the serious lifter", "Go", "A fairly long second kind of label"];
      const { page } = await open(APP(names, "lg"), { theme, ...DESKTOP });
      const before = await geometry(page);
      for (const i of [1, 3, 0, 2]) {
        await page.getByRole("link").nth(i).click();
        assert.deepEqual(await geometry(page), before, `choosing ${names[i]}`);
      }
    });
  }

  test("every label reserves its 600 width: a link is as wide as its label at 600, whether or not it is current", async () => {
    const { page } = await open(APP(NINE), DESKTOP);
    const widths = await page.evaluate(() => [...document.querySelectorAll(".basalt-link-tab-label")].map((l) => { const d = l.querySelector("[data-label]"); const range = document.createRange(); range.selectNodeContents(d.firstChild); const live = range.getBoundingClientRect().width; return [l.getBoundingClientRect().width, live]; }));
    for (const [reserved, live] of widths) assert.ok(reserved >= live, "the label's box is at least its words");
    assert.ok(widths.some(([reserved, live]) => reserved > live + 0.5), "a resting label's box is wider than its 400 words: the 600 width is held");
  });

  test("the nine links at 1440 sit in one row, and the row's width is known", async () => {
    const { page } = await open(APP(NINE), DESKTOP);
    const row = await page.evaluate(() => { const links = [...document.querySelectorAll(".basalt-link-tab")]; const boxes = links.map((a) => a.getBoundingClientRect()); return { rows: new Set(boxes.map((b) => Math.round(b.y))).size, extent: boxes[boxes.length - 1].right - boxes[0].left, sum: boxes.reduce((s, b) => s + b.width, 0) }; });
    assert.equal(row.rows, 1, "one row at 1440");
    // the links' own widths plus eight gaps of 4px (space-1): nothing else is in the row
    assert.ok(Math.abs(row.extent - (row.sum + 8 * 4)) <= 0.6, `the row's extent ${row.extent} is the links ${row.sum} and eight gaps of 4`);
    assert.ok(row.extent < 1440 - 32, "and it fits the content width with room to spare");
  });

  test("a link whose label is in an element is reserved too, and choosing it moves nothing", async () => {
    const jsx = `(() => { const App = () => { const [c, setC] = React.useState(0); return <div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="k" size="3xl">{["One", "Two", "Three"].map((n, i) => <B.LinkTab key={n} href="#" current={c === i} onClick={(e) => { e.preventDefault(); setC(i); }}><span>{n} things</span></B.LinkTab>)}</B.LinkTabs></div>; }; return <App />; })()`;
    const { page } = await open(jsx, DESKTOP);
    assert.equal(await page.locator(".basalt-link-tab .basalt-chosen-label").count(), 3, "each label is drawn twice in one box");
    const weights = () => page.evaluate(() => [...document.querySelectorAll(".basalt-link-tab")].map((a) => getComputedStyle(a.querySelector(".basalt-chosen-label > :first-child")).fontWeight));
    assert.deepEqual(await weights(), ["600", "400", "400"]);
    const before = await geometry(page);
    await page.getByRole("link").nth(2).click();
    assert.deepEqual(await weights(), ["400", "400", "600"]);
    assert.deepEqual(await geometry(page), before);
    assert.equal(await page.locator("[data-wide]").evaluateAll((els) => els.every((e) => e.getAttribute("aria-hidden") === "true" && e.hasAttribute("inert"))), true, "the second copy is unseen and inert");
  });

  test("a link with an icon beside its words takes the icon's selected form when current, and nothing moves", async () => {
    const jsx = `(() => { const App = () => { const [c, setC] = React.useState(0); return <div style={{ padding: "0 16px" }}><B.LinkTabs aria-label="k" size="3xl">{["Home", "Docs", "Shop"].map((n, i) => <B.LinkTab key={n} href="#" current={c === i} onClick={(e) => { e.preventDefault(); setC(i); }}><B.Icon icon={B.HomeGlyph} />{n}</B.LinkTab>)}</B.LinkTabs></div>; }; return <App />; })()`;
    const { page } = await open(jsx, DESKTOP);
    assert.equal(await page.locator(".basalt-link-tab .basalt-glyph-pair").count(), 3);
    const shown = () => page.evaluate(() => [...document.querySelectorAll(".basalt-link-tab")].map((a) => [...a.querySelector(".basalt-glyph-pair").children].map((c) => Math.round(Number(getComputedStyle(c).opacity))).join("/")));
    assert.deepEqual(await shown(), ["0/1", "1/0", "1/0"]);
    const before = await geometry(page);
    await page.getByRole("link").nth(1).click();
    await page.waitForFunction(() => document.getAnimations().length === 0 && getComputedStyle(document.querySelectorAll(".basalt-link-tab")[1].querySelector(".basalt-glyph-pair").lastElementChild).opacity === "1");
    assert.deepEqual(await shown(), ["1/0", "0/1", "1/0"]);
    assert.deepEqual(await geometry(page), before);
  });

  test("a label that holds a control is declined and keeps its weight, as a tab's is", async () => {
    const jsx = `<B.LinkTabs aria-label="k" size="3xl"><B.LinkTab href="#a" current><input type="hidden" value="x" />Kept</B.LinkTab><B.LinkTab href="#b">Other</B.LinkTab></B.LinkTabs>`;
    const { page } = await open(jsx, DESKTOP);
    assert.equal(await page.locator(".basalt-link-tab [data-wide]").count(), 0, "no second copy of a label that holds a control");
    assert.equal((await css(page.getByRole("link").nth(0).locator(".basalt-link-tab-label"), "fontWeight")).fontWeight, "400", "it keeps 400 and is not reserved");
  });

  test("in forced colours the weights and the boxes hold, and the current underline is still Highlight", async () => {
    const { page } = await open(APP(NINE), DESKTOP);
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const before = await geometry(page);
    assert.equal(await page.getByRole("link").nth(0).locator("[data-label]").evaluate((el) => getComputedStyle(el).fontWeight), "600");
    assert.equal(await page.getByRole("link").nth(1).locator("[data-label]").evaluate((el) => getComputedStyle(el).fontWeight), "400");
    await page.getByRole("link").nth(5).click();
    assert.deepEqual(await geometry(page), before);
    const hl = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); p.style.backgroundColor = "Highlight"; const c = getComputedStyle(p).backgroundColor; p.remove(); return c; });
    assert.equal((await css(page.locator("a[aria-current] .basalt-link-tab-line"), "backgroundColor")).backgroundColor, hl);
  });
});
