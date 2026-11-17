// The engineering batch of the components stream (components-eng-1): APIs the five site prototypes needed and Basalt already had underneath, opened
// up, with no rendered pixel changed. A popover or menu placed by `anchor`, `alignOffset`, a `sideOffset` function and the collision options; one
// popover opened from three triggers with a payload; hidden text; the polite status line that says a repeated message again; the exported glide
// plate and media hook; and the theme's state for React, in step with the HTML skill's `initTheme`. Driven in Chromium against the built package.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { bundleFixture, fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const css = () => fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8");
const THEMES = ["dark", "light"];
const ORIGIN = "https://basalt.test";
const dist = (file) => import(pathToFileURL(path.join(pkg, "dist", file)).href);
const { themeBootstrap } = await dist("theme.js");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const frames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const axe = async (page) => {
  await page.evaluate(axeSource);
  await page.evaluate(() => { document.documentElement.lang = "en"; document.title = "Basalt"; });
  return page.evaluate(async () => (await window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`));
};
const box = (page, selector) => page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; });

// ---- Placement ----

describe("PopoverContent and MenuContent: placement props", () => {
  const stage = (popup, extra = "") => `
    const css = document.createElement("style");
    css.textContent = "body { margin: 0 } .anchor { position: absolute; left: 200px; top: 150px; width: 120px; height: 30px; background: var(--basalt-surface-level-1) } #t { position: absolute; left: 20px; top: 20px }";
    document.head.append(css);
    const anchorElement = document.createElement("div");
    anchorElement.id = "anchor"; anchorElement.className = "anchor"; anchorElement.textContent = "anchor";
    document.body.append(anchorElement);
    window.anchorRef = { current: anchorElement };
    ${extra}
    createRoot(document.getElementById("root")).render(<div>${popup}</div>);`;
  const open = async (popup, options = {}) => {
    const { page, errors } = await fixturePage(browser, stage(popup), { theme: "dark", viewport: { width: 800, height: 600 }, ...options });
    await page.locator(".basalt-positioner").waitFor();
    await settle(page);
    await frames(page);
    return { page, errors };
  };
  const popover = (props = "", trigger = `<B.PopoverTrigger id="t">Trigger</B.PopoverTrigger>`) => `<B.Popover defaultOpen>${trigger}<B.PopoverContent ${props} style={{ width: 160 }}>Placed</B.PopoverContent></B.Popover>`;

  test("left out, the popover sits under its trigger, 6px below and start-aligned, as it always has", async () => {
    const { page } = await open(popover());
    const trigger = await box(page, ".basalt-popover-trigger");
    const popup = await box(page, ".basalt-positioner");
    assert.equal(popup.top - trigger.bottom, 6);
    assert.equal(popup.left, trigger.left);
    await page.close();
  });

  test("`anchor` as an element, a ref, a virtual element and a function puts the popover against that, not the trigger", async () => {
    for (const [name, anchor] of [
      ["element", `{window.anchorRef.current}`],
      ["ref", `{window.anchorRef}`],
      ["virtual", `{{ getBoundingClientRect: () => document.getElementById("anchor").getBoundingClientRect() }}`],
      ["function", `{() => document.getElementById("anchor")}`],
    ]) {
      const { page } = await open(`<B.Popover defaultOpen><B.PopoverTrigger id="t">Trigger</B.PopoverTrigger><B.PopoverContent anchor=${anchor} style={{ width: 160 }}>Placed</B.PopoverContent></B.Popover>`);
      const target = await box(page, "#anchor");
      const popup = await box(page, ".basalt-positioner");
      assert.equal(Math.round(popup.top - target.bottom), 6, `${name}: 6px under the anchor`);
      assert.equal(Math.round(popup.left), Math.round(target.left), `${name}: start-aligned to the anchor`);
      await page.close();
    }
  });

  test("`alignOffset` moves it along the alignment axis, as a number and as a function of the placement", async () => {
    const plain = await open(popover(`anchor={window.anchorRef}`));
    const base = await box(plain.page, ".basalt-positioner");
    await plain.page.close();
    const number = await open(popover(`anchor={window.anchorRef} alignOffset={24}`));
    assert.equal(Math.round((await box(number.page, ".basalt-positioner")).left - base.left), 24);
    await number.page.close();
    const fn = await open(popover(`anchor={window.anchorRef} alignOffset={(data) => { window.__align = data; return data.anchor.width / 2; }}`));
    assert.equal(Math.round((await box(fn.page, ".basalt-positioner")).left - base.left), 60, "half of the anchor's 120px width");
    const seen = await fn.page.evaluate(() => window.__align);
    assert.deepEqual([seen.side, seen.align, seen.anchor.width, seen.anchor.height], ["bottom", "start", 120, 30]);
    assert.equal(seen.positioner.width, 160);
    await fn.page.close();
  });

  test("`sideOffset` as a function replaces the 6px, and still defaults to 6", async () => {
    const { page } = await open(popover(`anchor={window.anchorRef} sideOffset={(data) => data.anchor.height}`));
    const target = await box(page, "#anchor");
    assert.equal(Math.round((await box(page, ".basalt-positioner")).top - target.bottom), 30, "the anchor's own height");
    await page.close();
  });

  test("a Menu takes the same: an anchor, an align offset, a side offset function", async () => {
    const { page } = await open(`<B.Menu defaultOpen><B.MenuTrigger id="t">Menu</B.MenuTrigger><B.MenuContent anchor={window.anchorRef} alignOffset={16} sideOffset={() => 12}><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>`);
    const target = await box(page, "#anchor");
    const popup = await box(page, ".basalt-positioner");
    assert.equal(Math.round(popup.top - target.bottom), 12);
    assert.equal(Math.round(popup.left - target.left), 16);
    await page.close();
  });

  test("a Menu left alone sits 6px under its trigger; a submenu keeps Base UI's own align offset", async () => {
    const { page } = await open(`<B.Menu defaultOpen><B.MenuTrigger id="t">Menu</B.MenuTrigger><B.MenuContent><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>`);
    const trigger = await box(page, "#t");
    const popup = await box(page, ".basalt-positioner");
    assert.equal(Math.round(popup.top - trigger.bottom), 6);
    assert.equal(Math.round(popup.left), Math.round(trigger.left));
    await page.close();
  });

  describe("collision", () => {
    // A 400px page, a 200px popover, and an anchor to put it against.
    const near = (props, rect = "330, 100, 60, 30") => `<B.Popover defaultOpen><B.PopoverTrigger id="t">Trigger</B.PopoverTrigger><B.PopoverContent anchor={{ getBoundingClientRect: () => new DOMRect(${rect}) }} style={{ width: 200 }} ${props}>Placed</B.PopoverContent></B.Popover>`;
    const opened = (props, rect) => open(near(props, rect), { viewport: { width: 400, height: 600 } });
    const align = (page) => page.locator(".basalt-positioner").getAttribute("data-align");

    test("by default it flips its alignment to stay 5px inside the viewport", async () => {
      const { page } = await opened("");
      assert.equal(await align(page), "end");
      const popup = await box(page, ".basalt-positioner");
      assert.equal(Math.round(popup.right), 390, "its end meets the anchor's end");
      await page.close();
    });

    test("`collisionPadding` is the space kept from the edge, as a number and as sides", async () => {
      const number = await opened("collisionPadding={40}", "250, 100, 140, 30");
      assert.ok((await box(number.page, ".basalt-positioner")).right <= 360 + 0.5);
      assert.ok((await box(number.page, ".basalt-positioner")).right >= 359);
      await number.page.close();
      const sides = await opened("collisionPadding={{ right: 20, left: 5 }}", "250, 100, 140, 30");
      assert.ok((await box(sides.page, ".basalt-positioner")).right <= 380 + 0.5);
      assert.ok((await box(sides.page, ".basalt-positioner")).right >= 379);
      await sides.page.close();
      const unpadded = await opened("", "250, 100, 140, 30");
      assert.ok((await box(unpadded.page, ".basalt-positioner")).right >= 389, "Base UI's 5px when it is left out");
      await unpadded.page.close();
    });

    test("`collisionAvoidance` of none keeps the alignment it is asked for, where flip would have changed it", async () => {
      const { page } = await opened(`collisionAvoidance={{ side: "none", align: "none" }}`);
      assert.equal(await align(page), "start");
      assert.equal(Math.round((await box(page, ".basalt-positioner")).left), 330);
      await page.close();
    });

    test("`collisionBoundary` is the rectangle it is kept in", async () => {
      const loose = await opened("", "100, 100, 60, 30");
      assert.equal(Math.round((await box(loose.page, ".basalt-positioner")).right), 300, "the viewport lets it sit at the anchor");
      await loose.page.close();
      const bounded = await opened(`collisionBoundary={{ x: 0, y: 0, width: 250, height: 600 }} collisionPadding={0}`, "100, 100, 60, 30");
      assert.ok((await box(bounded.page, ".basalt-positioner")).right <= 250.5, "the boundary's edge, not the viewport's");
      await bounded.page.close();
    });

    test("`sticky` is passed to the positioner: the popover stays in view once its anchor has scrolled away", async () => {
      const run = async (props) => {
        const { page } = await fixturePage(browser, `
          const css = document.createElement("style");
          css.textContent = "body { margin: 0 } #scroller { height: 300px; overflow: auto } #tall { height: 2000px; position: relative } #anchor { position: absolute; top: 60px; left: 40px; width: 80px; height: 30px }";
          document.head.append(css);
          createRoot(document.getElementById("root")).render(<div id="scroller"><div id="tall"><div id="anchor" ref={window.anchorRef = React.createRef()}>anchor</div>
            <B.Popover defaultOpen><B.PopoverTrigger id="t">T</B.PopoverTrigger><B.PopoverContent anchor={window.anchorRef} style={{ width: 120 }} ${props}>Placed</B.PopoverContent></B.Popover></div></div>);`, { theme: "dark", viewport: { width: 600, height: 500 } });
        await page.locator(".basalt-positioner").waitFor();
        await settle(page);
        await page.locator("#scroller").evaluate((el) => { el.scrollTop = 800; });
        await frames(page);
        await frames(page);
        const result = await page.evaluate(() => ({ top: document.querySelector(".basalt-positioner").getBoundingClientRect().top, hidden: document.querySelector(".basalt-positioner").hasAttribute("data-anchor-hidden") }));
        await page.close();
        return result;
      };
      const loose = await run("");
      const sticky = await run("sticky");
      assert.ok(loose.top < 0, `unstuck, it leaves with its anchor (${JSON.stringify(loose)})`);
      assert.ok(sticky.top >= 0 && sticky.top < 300, `sticky, it stays in view (${JSON.stringify(sticky)})`);
    });
  });

  for (const theme of THEMES) {
    test(`a popover on a far anchor passes axe (${theme})`, async () => {
      const { page } = await open(popover(`anchor={window.anchorRef} alignOffset={12} aria-label="Placed"`), { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

// ---- One popover, many triggers ----

describe("a Popover with a handle: one popover for many triggers", () => {
  const fixture = `
    const handle = B.createPopoverHandle();
    window.opens = [];
    function App() {
      const [log, setLog] = React.useState([]);
      return (
        <div>
          <B.PopoverTrigger handle={handle} payload={{ name: "alpha", note: "First note" }} id="one">One</B.PopoverTrigger>
          <B.PopoverTrigger handle={handle} payload={{ name: "beta", note: "Second note" }} id="two">Two</B.PopoverTrigger>
          <B.PopoverTrigger handle={handle} payload={{ name: "gamma", note: "Third note" }} id="three">Three</B.PopoverTrigger>
          <B.Popover handle={handle} onOpenChange={(open) => window.opens.push(open)}>
            {({ payload }) => (
              <B.PopoverContent aria-label="Note" data-popup>
                <B.PopoverTitle>{payload ? payload.name : "none"}</B.PopoverTitle>
                <B.PopoverDescription>{payload ? payload.note : ""}</B.PopoverDescription>
              </B.PopoverContent>
            )}
          </B.Popover>
        </div>
      );
    }
    createRoot(document.getElementById("root")).render(<App />);`;

  test("opened from each of three triggers it shows that trigger's payload, in one popup, and closing returns focus to the trigger that opened it", async () => {
    const { page, errors } = await fixturePage(browser, fixture, { theme: "dark" });
    for (const [id, name, note] of [["one", "alpha", "First note"], ["three", "gamma", "Third note"], ["two", "beta", "Second note"]]) {
      await page.locator(`#${id}`).click();
      await page.locator("[data-popup]").waitFor();
      assert.equal(await page.locator(".basalt-popover-title").textContent(), name);
      assert.equal(await page.locator(".basalt-popover-description").textContent(), note);
      assert.equal(await page.locator("[data-popup]").count(), 1, "one popup, not one per trigger");
      assert.equal(await page.locator(`#${id}`).getAttribute("aria-expanded"), "true");
      await page.keyboard.press("Escape");
      await page.locator("[data-popup]").waitFor({ state: "detached" });
      assert.equal(await page.evaluate(() => document.activeElement?.id), id, "focus is back on the trigger that opened it");
    }
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("its content moves from the trigger it was open for to the next one's place", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await page.locator("#one").click();
    await page.locator("[data-popup]").waitFor();
    await settle(page);
    const first = await box(page, ".basalt-positioner");
    const triggerOne = await box(page, "#one");
    assert.equal(Math.round(first.left), Math.round(triggerOne.left));
    await page.locator("#three").click();
    await page.waitForFunction(() => document.querySelector(".basalt-popover-title")?.textContent === "gamma");
    await settle(page);
    await frames(page);
    assert.equal(Math.round((await box(page, ".basalt-positioner")).left), Math.round((await box(page, "#three")).left));
    await page.close();
  });

  test("`triggerId` and `defaultTriggerId` still pick the trigger of an ordinary popover", async () => {
    const { page } = await fixturePage(browser, `
      function App() {
        const [open, setOpen] = React.useState(true);
        return (
          <B.Popover open={open} onOpenChange={setOpen} triggerId="second">
            <B.PopoverTrigger id="first">First</B.PopoverTrigger>
            <B.PopoverTrigger id="second">Second</B.PopoverTrigger>
            <B.PopoverContent aria-label="Note">Hello</B.PopoverContent>
          </B.Popover>
        );
      }
      createRoot(document.getElementById("root")).render(<App />);`, { theme: "dark" });
    await page.locator(".basalt-positioner").waitFor();
    await settle(page);
    assert.equal(await page.locator("#second").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#first").getAttribute("aria-expanded"), "false");
    await page.close();
  });

  test("the handle opens and closes it from code, and reports it", async () => {
    const { page } = await fixturePage(browser, `${fixture}\nwindow.handle = handle;`, { theme: "dark" });
    await page.evaluate(() => window.handle.open("two"));
    await page.locator("[data-popup]").waitFor();
    assert.equal(await page.locator(".basalt-popover-title").textContent(), "beta");
    assert.equal(await page.evaluate(() => window.handle.isOpen), true);
    await page.evaluate(() => window.handle.close());
    await page.locator("[data-popup]").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.handle.isOpen), false);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`it passes axe, open (${theme})`, async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.locator("#two").click();
      await page.locator("[data-popup]").waitFor();
      await settle(page);
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

// ---- VisuallyHidden ----

describe("VisuallyHidden", () => {
  const fixture = `createRoot(document.getElementById("root")).render(<p id="line">Open <B.VisuallyHidden id="a">from</B.VisuallyHidden><span aria-hidden="true">–</span> 9 <B.VisuallyHidden as="div" id="b" className="extra">to</B.VisuallyHidden> 5</p>);`;

  test("it is a span in the class `basalt-visually-hidden`, with `as` for another element, and keeps the caller's class and props", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    assert.equal(await page.locator("#a").evaluate((el) => el.tagName + "." + el.className), "SPAN.basalt-visually-hidden");
    assert.equal(await page.locator("#b").evaluate((el) => el.tagName + "." + el.className), "DIV.basalt-visually-hidden extra");
    await page.close();
  });

  test("it is in the accessibility tree and takes no room on screen", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    const snapshot = await page.locator("#line").ariaSnapshot();
    assert.match(snapshot, /from/);
    assert.match(snapshot, /to/);
    assert.equal(await page.getByText("from", { exact: true }).count(), 1, "findable by its text");
    const size = await box(page, "#a");
    assert.equal(size.width, 1);
    assert.equal(size.height, 1);
    // The visible words run together as the layout has them: the hidden words add no width.
    await page.locator("#line").evaluate((el) => { el.style.display = "inline-block"; });
    const line = await page.locator("#line").evaluate((el) => el.getBoundingClientRect().width);
    const without = await page.evaluate(() => { const clone = document.getElementById("line").cloneNode(true); clone.querySelectorAll(".basalt-visually-hidden").forEach((n) => n.remove()); document.body.append(clone); clone.style.display = "inline-block"; const w = clone.getBoundingClientRect().width; clone.remove(); return w; });
    assert.ok(Math.abs(line - without) < 12, `the line is as wide with the hidden words (${line}) as without (${without}) but for the spaces around them`);
    // Nothing of it is painted: the clip is the zero rectangle the class has always had.
    assert.equal(await page.locator("#a").evaluate((el) => getComputedStyle(el).clip), "rect(0px, 0px, 0px, 0px)");
    await page.close();
  });

  for (const theme of THEMES) {
    test(`it passes axe (${theme})`, async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

// ---- StatusLine and FilterResult ----

describe("StatusLine: a polite status line that says a repeated message again", () => {
  test("FilterResult renders exactly the DOM it rendered before the status line was split from it", async () => {
    const { FilterResult } = await dist("filter-result.js");
    assert.equal(
      renderToString(createElement(FilterResult, null, "Showing 3 of 24 runs")),
      `<p class="basalt-filter-result"><span aria-hidden="true">Showing 3 of 24 runs</span><span role="status" aria-live="polite" aria-atomic="true" class="basalt-visually-hidden">Showing 3 of 24 runs</span></p>`,
    );
    assert.equal(
      renderToString(createElement(FilterResult, { id: "x", className: "mine" }, "Showing 1 of 24 runs")),
      `<p id="x" class="basalt-filter-result mine"><span aria-hidden="true">Showing 1 of 24 runs</span><span role="status" aria-live="polite" aria-atomic="true" class="basalt-visually-hidden">Showing 1 of 24 runs</span></p>`,
    );
  });

  test("a status line renders one visually hidden polite, atomic status region", async () => {
    const { StatusLine } = await dist("filter-result.js");
    assert.equal(renderToString(createElement(StatusLine, { id: "s" }, "Saved")), `<span id="s" role="status" aria-live="polite" aria-atomic="true" class="basalt-visually-hidden">Saved</span>`);
  });

  const fixture = `
    function App() {
      const [message, setMessage] = React.useState("");
      const [id, setId] = React.useState(0);
      const send = (text) => { setMessage(text); setId((n) => n + 1); };
      window.__sentSeen = [];
      return (
        <div>
          <button id="saved" onClick={() => send("Saved")}>Save</button>
          <button id="deleted" onClick={() => send("Deleted")}>Delete</button>
          <B.StatusLine id="line" delay={80} sendId={id}>{message}</B.StatusLine>
        </div>
      );
    }
    flushSync(() => createRoot(document.getElementById("root")).render(<App />));
    window.__log = [];
    new MutationObserver(() => window.__log.push(document.getElementById("line").textContent)).observe(document.getElementById("line"), { childList: true, characterData: true, subtree: true });`;

  test("it speaks its text once it has held still for the delay, and not before", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await page.locator("#saved").click();
    await page.waitForTimeout(20);
    assert.equal(await page.locator("#line").textContent(), "", "not yet");
    await page.waitForFunction(() => document.getElementById("line").textContent === "Saved");
    assert.deepEqual(await page.evaluate(() => window.__log), ["Saved"]);
    await page.close();
  });

  test("the same text sent again changes the DOM, so a screen reader says it again; a different text just replaces it", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await page.locator("#saved").click();
    await page.waitForFunction(() => document.getElementById("line").textContent === "Saved");
    await page.locator("#saved").click();
    await page.waitForFunction(() => window.__log.filter((text) => text === "Saved").length === 2);
    assert.deepEqual(await page.evaluate(() => window.__log), ["Saved", "", "Saved"], "emptied, then filled again");
    await page.locator("#deleted").click();
    await page.waitForFunction(() => document.getElementById("line").textContent === "Deleted");
    assert.equal(await page.locator("#line").textContent(), "Deleted");
    await page.close();
  });

  test("sends in a quick row are one announcement, the last", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await page.evaluate(() => { for (const id of ["saved", "deleted", "saved"]) document.getElementById(id).click(); });
    await page.waitForFunction(() => document.getElementById("line").textContent === "Saved");
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(() => window.__log.filter(Boolean)), ["Saved"]);
    await page.close();
  });

  test("it is heard and not seen: hidden text, a status role, no box on screen", async () => {
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await page.locator("#saved").click();
    await page.waitForFunction(() => document.getElementById("line").textContent === "Saved");
    assert.equal(await page.getByRole("status").textContent(), "Saved");
    const size = await box(page, "#line");
    assert.deepEqual([size.width, size.height], [1, 1]);
    await page.close();
  });

  for (const theme of THEMES) {
    test(`it passes axe (${theme})`, async () => {
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.locator("#saved").click();
      await page.waitForFunction(() => document.getElementById("line").textContent === "Saved");
      assert.deepEqual(await axe(page), []);
      await page.close();
    });
  }
});

// ---- GlidePlate and useMediaQuery ----

describe("GlidePlate and useMediaQuery are exported", () => {
  test("the plate is decoration: a hidden span in a host that is not drawn on until it is used", async () => {
    const { GlidePlate } = await dist("plate.js");
    assert.equal(renderToString(createElement(GlidePlate)), `<span aria-hidden="true" class="basalt-plate" data-state="off"></span>`);
    const root = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
    assert.equal(root.GlidePlate, GlidePlate);
    assert.equal(typeof root.useMediaQuery, "function");
  });

  test("a plate in a `.basalt-menu` list follows the highlighted row", async () => {
    const { page } = await fixturePage(browser, `
      createRoot(document.getElementById("root")).render(
        <div className="basalt-menu" style={{ position: "static", width: 200 }}>
          <B.GlidePlate />
          <div className="basalt-menu-item" id="a">One</div>
          <div className="basalt-menu-item" id="b" data-highlighted="">Two</div>
        </div>);`, { theme: "dark", viewport: { width: 600, height: 400 } });
    await frames(page);
    await page.waitForFunction(() => document.querySelector(".basalt-menu").hasAttribute("data-glide"));
    assert.equal(await page.locator(".basalt-menu").getAttribute("data-glide"), "");
    await page.close();
  });

  test("useMediaQuery is false on the server, then the real answer, and follows the viewport", async () => {
    const { useMediaQuery } = await dist("use-media.js");
    const Probe = () => createElement("span", null, String(useMediaQuery("(min-width: 600px)")));
    assert.equal(renderToString(createElement(Probe)), "<span>false</span>");
    const { page } = await fixturePage(browser, `
      function Probe() { return <span id="p">{String(B.useMediaQuery("(min-width: 600px)"))}</span>; }
      createRoot(document.getElementById("root")).render(<Probe />);`, { theme: "dark", viewport: { width: 800, height: 400 } });
    await frames(page);
    assert.equal(await page.locator("#p").textContent(), "true");
    await page.setViewportSize({ width: 500, height: 400 });
    await page.waitForFunction(() => document.getElementById("p").textContent === "false");
    await page.close();
  });
});

// ---- Theme ----

describe("the theme's state: useTheme and themeBootstrap", () => {
  const probe = `
    function Probe() {
      const state = B.useTheme();
      (window.__renders ??= []).push([state.theme, state.choice, state.ready].join("/"));
      window.__theme = state;
      return <span id="p">{[state.theme, state.choice, String(state.ready)].join("/")}</span>;
    }`;
  const mount = `${probe}\ncreateRoot(document.getElementById("root")).render(<Probe />);`;

  /** A page on a real (fake-host) origin, so localStorage works and is shared with a second page of the same context. */
  async function open(body, { context, scheme = "light", stored, head = "", attribute = "", blockStorage = false } = {}) {
    context ??= await browser.newContext({ viewport: { width: 600, height: 400 }, colorScheme: scheme });
    const script = await bundleFixture(body);
    await context.route(`${ORIGIN}/**`, (route) => route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"${attribute}><head><title>Basalt</title><style>${css()}</style>${head}</head><body><div id="root"></div><script>${script}</script></body></html>`,
    }));
    if (stored !== undefined) await context.addInitScript((value) => { try { localStorage.setItem("basalt-theme", value); } catch { /* none */ } }, stored);
    if (blockStorage) await context.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${ORIGIN}/`);
    await frames(page);
    return { page, errors, context };
  }
  const root = (page) => page.evaluate(() => [document.documentElement.getAttribute("data-theme"), localStorage.getItem("basalt-theme")]);

  test("nothing runs at import: no store, no listener", async () => {
    const OriginalSet = globalThis.Set;
    let created = 0;
    try {
      globalThis.Set = class extends OriginalSet { constructor(...args) { super(...args); created += 1; } };
      await import(`${pathToFileURL(path.join(pkg, "dist", "theme.js")).href}?again`);
    } finally {
      globalThis.Set = OriginalSet;
    }
    assert.equal(created, 0);
    assert.equal(typeof themeBootstrap, "string");
  });

  test("hydrating server HTML: the server says light, system, not ready; the first client render says the same, then it reads the page", async () => {
    const { useTheme } = await dist("theme.js");
    const Probe = () => { const state = useTheme(); return createElement("span", { id: "p" }, `${state.theme}/${state.choice}/${state.ready}`); };
    const markup = renderToString(createElement(Probe));
    assert.equal(markup, `<span id="p">light/system/false</span>`);
    const context = await browser.newContext({ viewport: { width: 600, height: 400 }, colorScheme: "dark" });
    const script = await esbuildHydrate();
    await context.route(`${ORIGIN}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en"><head><title>Basalt</title><style>${css()}</style><script>${themeBootstrap}</script></head><body><div id="root">${markup}</div><script>${script}</script></body></html>` }));
    await context.addInitScript(() => localStorage.setItem("basalt-theme", "dark"));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => document.getElementById("p")?.textContent === "dark/dark/true");
    assert.deepEqual(await page.evaluate(() => window.__renders), ["light/system/false", "dark/dark/true"]);
    assert.deepEqual(errors, [], "no hydration mismatch");
    await context.close();
  });

  async function esbuildHydrate() {
    const result = await esbuild.build({
      stdin: { contents: `import * as React from "react"; import { hydrateRoot } from "react-dom/client"; import * as B from "./dist/index.js"; ${probe}\nhydrateRoot(document.getElementById("root"), <Probe />);`, resolveDir: pkg, loader: "tsx" },
      bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": '"production"' },
    });
    return result.outputFiles[0].text;
  }

  for (const [stored, scheme, choice, theme] of [
    ["dark", "light", "dark", "dark"],
    ["light", "dark", "light", "light"],
    [undefined, "dark", "system", "dark"],
    [undefined, "light", "system", "light"],
    ["system", "dark", "system", "dark"],
    ["nonsense", "light", "system", "light"],
    ["", "dark", "system", "dark"],
  ]) {
    test(`stored ${JSON.stringify(stored)}, system ${scheme}: the choice is ${choice}, the theme ${theme}, and data-theme says so`, async () => {
      const { page, errors } = await open(mount, { scheme, stored });
      assert.equal(await page.locator("#p").textContent(), `${theme}/${choice}/true`);
      assert.equal((await root(page))[0], theme);
      assert.deepEqual(errors, []);
      await page.close();
    });
  }

  test("a choice is written to storage and to the root; `system` removes it and follows the device", async () => {
    const { page } = await open(mount, { scheme: "dark" });
    await page.evaluate(() => window.__theme.setChoice("light"));
    await page.waitForFunction(() => document.getElementById("p").textContent === "light/light/true");
    assert.deepEqual(await root(page), ["light", "light"]);
    await page.evaluate(() => window.__theme.setChoice("dark"));
    await page.waitForFunction(() => document.getElementById("p").textContent === "dark/dark/true");
    assert.deepEqual(await root(page), ["dark", "dark"]);
    await page.evaluate(() => window.__theme.setChoice("system"));
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForFunction(() => document.getElementById("p").textContent === "light/system/true");
    assert.deepEqual(await root(page), ["light", null], "no stored value");
    await page.evaluate(() => window.__theme.setChoice("sepia"));
    assert.equal(await page.locator("#p").textContent(), "light/system/true", "an unknown choice changes nothing");
    await page.close();
  });

  test("while the choice is `system` it follows the device's scheme; a stored choice does not", async () => {
    const system = await open(mount, { scheme: "light" });
    assert.equal(await system.page.locator("#p").textContent(), "light/system/true");
    await system.page.emulateMedia({ colorScheme: "dark" });
    await system.page.waitForFunction(() => document.getElementById("p").textContent === "dark/system/true");
    assert.equal((await root(system.page))[0], "dark");
    await system.page.emulateMedia({ colorScheme: "light" });
    await system.page.waitForFunction(() => document.getElementById("p").textContent === "light/system/true");
    assert.equal((await root(system.page))[0], "light");
    await system.page.close();
    const chosen = await open(mount, { scheme: "light", stored: "light" });
    await chosen.page.emulateMedia({ colorScheme: "dark" });
    await frames(chosen.page);
    assert.equal(await chosen.page.locator("#p").textContent(), "light/light/true");
    assert.equal((await root(chosen.page))[0], "light");
    await chosen.page.close();
  });

  test("a change in another tab arrives by the storage event, and so does clearing storage", async () => {
    const first = await open(mount, { scheme: "light" });
    const second = await open(mount, { scheme: "light", context: first.context });
    await second.page.evaluate(() => window.__theme.setChoice("dark"));
    await first.page.waitForFunction(() => document.getElementById("p").textContent === "dark/dark/true");
    assert.equal((await root(first.page))[0], "dark");
    await second.page.evaluate(() => window.__theme.setChoice("system"));
    await first.page.waitForFunction(() => document.getElementById("p").textContent === "light/system/true");
    assert.equal((await root(first.page))[0], "light");
    await second.page.evaluate(() => window.__theme.setChoice("dark"));
    await first.page.waitForFunction(() => document.getElementById("p").textContent === "dark/dark/true");
    await second.page.evaluate(() => localStorage.clear());
    await first.page.waitForFunction(() => document.getElementById("p").textContent === "light/system/true");
    await first.context.close();
  });

  test("with storage blocked the choice lasts for the page", async () => {
    const { page, errors } = await open(mount, { scheme: "light", blockStorage: true });
    assert.equal(await page.locator("#p").textContent(), "light/system/true");
    await page.evaluate(() => window.__theme.setChoice("dark"));
    await page.waitForFunction(() => document.getElementById("p").textContent === "dark/dark/true");
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme")), "dark");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("the head script applies the stored choice, or the system's, before any script of the page runs", async () => {
    const head = `<script>${themeBootstrap}</script><script>window.__early = document.documentElement.getAttribute("data-theme");</script>`;
    for (const [stored, scheme, expected] of [["dark", "light", "dark"], ["light", "dark", "light"], [undefined, "dark", "dark"], [undefined, "light", "light"]]) {
      const { page } = await open(mount, { scheme, stored, head });
      assert.equal(await page.evaluate(() => window.__early), expected);
      await page.close();
    }
  });

  test("the head script is the skill's head snippet: the same theme part, character for character", async () => {
    const skill = compose(`<title>T</title><p>x</p>`, { fonts: false }).html;
    const snippet = skill.match(/<script>(\(function\(\)\{var t,c,r=document\.documentElement;try\{t=localStorage\.getItem\("basalt-theme"\).*?)<\/script>/)?.[1];
    assert.ok(snippet, "the skill's head snippet is found");
    // The skill's snippet goes on to set the keyboard attribute; the theme part is everything before that.
    assert.equal(snippet.slice(0, snippet.indexOf(`try{if(sessionStorage`)), themeBootstrap.slice(0, -"})();".length));
  });

  // The same result as the skill's own `initTheme` for every stored value and every system scheme.
  describe("agrees with the skill's initTheme", () => {
    const html = compose(`<title>T</title><p>x</p>`, { fonts: false }).html;
    for (const scheme of ["light", "dark"]) {
      test(`system ${scheme}: stored light, dark, system, nonsense, empty and nothing`, async () => {
        const context = await browser.newContext({ colorScheme: scheme });
        await context.route(`${ORIGIN}/skill`, (route) => route.fulfill({ contentType: "text/html", body: html }));
        const skill = await context.newPage();
        await skill.goto(`${ORIGIN}/skill`);
        for (const stored of ["light", "dark", "system", "nonsense", "", null]) {
          const fromSkill = await skill.evaluate((value) => {
            if (value === null) localStorage.removeItem("basalt-theme"); else localStorage.setItem("basalt-theme", value);
            document.documentElement.removeAttribute("data-theme");
            window.Basalt.init();
            return document.documentElement.getAttribute("data-theme");
          }, stored);
          const fromScript = await skill.evaluate((script) => { document.documentElement.removeAttribute("data-theme"); new Function(script)(); return document.documentElement.getAttribute("data-theme"); }, themeBootstrap);
          const hook = await open(mount, { scheme, context: await browser.newContext({ colorScheme: scheme }), stored: stored ?? undefined });
          const fromHook = await hook.page.evaluate(() => [document.documentElement.getAttribute("data-theme"), window.__theme.theme]);
          assert.equal(fromScript, fromSkill, `stored ${JSON.stringify(stored)}: the head script and initTheme agree`);
          assert.deepEqual(fromHook, [fromSkill, fromSkill], `stored ${JSON.stringify(stored)}: the hook and initTheme agree`);
          await hook.context.close();
        }
        await context.close();
      });
    }
  });

  test("the page and the skill share one key: what the hook stores, the skill reads, and the other way round", async () => {
    const { page, context } = await open(mount, { scheme: "light" });
    await page.evaluate(() => window.__theme.setChoice("dark"));
    assert.equal(await page.evaluate(() => localStorage.getItem("basalt-theme")), "dark", "the key and the value are the skill's");
    await page.evaluate(() => localStorage.setItem("basalt-theme", "light"));
    await page.evaluate(() => window.dispatchEvent(new StorageEvent("storage", { key: "basalt-theme", newValue: "light" })));
    await page.waitForFunction(() => document.getElementById("p").textContent === "light/light/true");
    await context.close();
  });

  for (const theme of THEMES) {
    test(`a specimen of the page passes axe in ${theme} through the hook`, async () => {
      const { page, context } = await open(`${probe}\ncreateRoot(document.getElementById("root")).render(<main><h1>Theme</h1><B.Button onClick={() => window.__theme.setChoice("dark")}>Dark</B.Button><Probe /></main>);`, { scheme: theme, stored: theme });
      assert.deepEqual(await axe(page), []);
      await context.close();
    });
  }
});
