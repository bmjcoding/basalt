// The panel's rulings (three rounds, then the owner): depth by level, the rim, kbd chips, the command menu's
// input band, popup entry, vertical tabs and the press. The menus round (plate, lift, forced colours) is in menus.test.mjs. Driven in Chromium against
// the built package with the real stylesheet, in both themes.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import fs from "node:fs";
import { createRequire } from "node:module";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;

/** The colour the browser resolves a token to, as getComputedStyle writes it, so two colours compare as strings. */
const resolve = (page, token, property = "backgroundColor") => page.evaluate(([token, property]) => {
  const probe = document.createElement("div");
  probe.style[property === "color" ? "color" : "backgroundColor"] = `var(--basalt-${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}, [token, property]);

/** A CSS colour in any serialisation (rgb, color(srgb ...), oklab ...) as the 8-bit [r, g, b] a canvas paints it. */
const rgb8 = (page, css) => page.evaluate((css) => {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
}, css);

const style = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);

for (const theme of ["dark", "light"]) {
  describe(`surfaces and rims (${theme})`, () => {
    test("an in-flow panel is one level above its parent, and level 3 is the cap", async () => {
      const { page } = await fixturePage(browser, render(`<B.Card data-n="1"><B.Card data-n="2"><B.Card data-n="3"><B.Card data-n="4"><B.CodeBlock code="x" /></B.Card></B.Card></B.Card></B.Card>`), { theme });
      const levels = await page.locator(".basalt-card").evaluateAll((els) => els.map((e) => e.dataset.level));
      assert.deepEqual(levels, ["1", "2", "3", "3"]);
      assert.equal(await page.locator(".basalt-code").getAttribute("data-level"), "3", "a code block in a level-3 panel stays at the cap");
      if (theme === "dark") {
        const fills = await page.locator(".basalt-card").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
        assert.deepEqual(fills, [await resolve(page, "surface-1"), await resolve(page, "surface-2"), await resolve(page, "surface-3"), await resolve(page, "surface-3")]);
      } else {
        const fills = new Set(await page.locator(".basalt-card").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor)));
        assert.equal(fills.size, 1, "in light, levels 1 to 3 are one white");
      }
      await page.close();
    });

    test("a code block is a well one level deeper in dark, and the same sunken grey in light; in a dialog it is level 2", async () => {
      const { page } = await fixturePage(browser, render(`<><B.CodeBlock code="a" className="on-page" /><B.Card><B.CodeBlock code="b" className="in-card" /></B.Card><B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>Dialog</B.DialogTitle><B.CodeBlock code="c" className="in-dialog" /></B.DialogContent></B.Dialog></>`), { theme });
      await settle(page);
      const fill = (cls) => style(page.locator(`.${cls}`), "backgroundColor").then((s) => s.backgroundColor);
      assert.deepEqual(await Promise.all(["on-page", "in-card", "in-dialog"].map((c) => page.locator(`.${c}`).getAttribute("data-level"))), ["1", "2", "2"], "a dialog is level 1, so what it holds starts at 2");
      if (theme === "dark") {
        assert.equal(await fill("on-page"), await resolve(page, "surface-1"));
        assert.equal(await fill("in-card"), await resolve(page, "surface-2"));
        assert.equal(await fill("in-dialog"), await resolve(page, "surface-2"), "#111111 in a dialog (level 2)");
      } else {
        const sunken = await resolve(page, "surface-sunken");
        for (const c of ["on-page", "in-card", "in-dialog"]) assert.equal(await fill(c), sunken);
      }
      await page.close();
    });

    test("popups are opener + 1 with a floor of 1 and a cap of 3, a modal resets to 1, and the level crosses portals", async () => {
      const fixture = `<>
        <B.Menu defaultOpen><B.MenuTrigger>Page menu</B.MenuTrigger><B.MenuContent data-name="from-page"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>
        <B.Card><B.Popover defaultOpen><B.PopoverTrigger>Card popover</B.PopoverTrigger><B.PopoverContent data-name="from-card">In a card</B.PopoverContent></B.Popover></B.Card>
        <B.Dialog defaultOpen><B.DialogContent data-name="dialog"><B.DialogTitle>Dialog</B.DialogTitle>
          <B.Card data-name="card-in-dialog">Card</B.Card>
          <B.Popover defaultOpen><B.PopoverTrigger>Dialog popover</B.PopoverTrigger><B.PopoverContent data-name="from-dialog">In a dialog</B.PopoverContent></B.Popover>
        </B.DialogContent></B.Dialog>
      </>`;
      const { page } = await fixturePage(browser, render(fixture), { theme });
      await settle(page);
      const level = (name) => page.locator(`[data-name="${name}"]`).getAttribute("data-level");
      assert.equal(await level("from-page"), "1", "a menu opened from the page takes the floor");
      assert.equal(await level("from-card"), "2", "a popover opened from a level-1 card");
      assert.equal(await level("dialog"), "1", "a modal resets to 1 above its scrim");
      assert.equal(await level("card-in-dialog"), "2", "a card in a dialog starts at 2");
      assert.equal(await level("from-dialog"), "2", "a popup opened from a dialog, across the portal");
      await page.close();
    });

    test("a modal inside a deep panel still resets to 1, a tooltip is 3, and a toast is 1 wherever it is shown from (owner, decision 83)", async () => {
      const fixture = `function Show(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Saved",timeout:0})},[t]);return null}
        createRoot(document.getElementById("root")).render(<B.ToastProvider><B.TooltipProvider><B.Card><B.Card><B.Card>
          <B.Dialog defaultOpen><B.DialogContent data-name="deep-dialog"><B.DialogTitle>Deep</B.DialogTitle></B.DialogContent></B.Dialog>
          <B.Tooltip defaultOpen content="Tip"><B.Button>Hover</B.Button></B.Tooltip><Show/>
        </B.Card></B.Card></B.Card></B.TooltipProvider></B.ToastProvider>);`;
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      assert.equal(await page.locator("[data-name=deep-dialog]").getAttribute("data-level"), "1");
      assert.equal(await page.locator(".basalt-tooltip").getAttribute("data-level"), "3");
      assert.equal(await page.locator(".basalt-toast").getAttribute("data-level"), "1", "a toast is portalled and fixed at level 1: it does not take its level from what it was shown inside");
      await page.close();
    });

    test("every panel has a real 1px border, lit on top in dark and uniform in light; controls have none", async () => {
      const fixture = `function Show(){const t=B.useToast();React.useEffect(()=>{t.show({title:"Saved",timeout:0})},[t]);return null}
        createRoot(document.getElementById("root")).render(<B.ToastProvider><B.TooltipProvider><>
          <B.Card /><B.TableContainer><B.Table><B.TableBody><B.TableRow><B.TableCell>x</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
          <B.CodeBlock code="x" /><B.Callout title="Note" /><B.LivePreview label="Name" saved="a" onSave={()=>{}} />
          <B.Menu defaultOpen><B.MenuTrigger>M</B.MenuTrigger><B.MenuContent><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>
          <B.Popover defaultOpen><B.PopoverTrigger>P</B.PopoverTrigger><B.PopoverContent>Body</B.PopoverContent></B.Popover>
          <B.Dialog defaultOpen><B.DialogContent><B.DialogTitle>D</B.DialogTitle></B.DialogContent></B.Dialog>
          <B.Tooltip defaultOpen content="Tip"><B.Button>T</B.Button></B.Tooltip>
          <B.Input aria-label="Field" /><B.Badge>alpha</B.Badge><B.Kbd>K</B.Kbd><Show/>
        </></B.TooltipProvider></B.ToastProvider>);`;
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      const rim = await resolve(page, "border-rim");
      const rimTop = await resolve(page, "border-rim-top");
      if (theme === "light") assert.equal(rimTop, rim, "light is uniform");
      else assert.notEqual(rimTop, rim, "dark's top edge is lit");
      const panels = [".basalt-card", ".basalt-table-container", ".basalt-code", ".basalt-callout", ".basalt-preview-card", ".basalt-menu", ".basalt-popover", ".basalt-dialog", ".basalt-tooltip", ".basalt-toast"];
      for (const selector of panels) {
        const s = await style(page.locator(selector).first(), "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopStyle", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "boxShadow");
        for (const side of ["Top", "Right", "Bottom", "Left"]) assert.equal(s[`border${side}Width`], "1px", `${selector} ${side}`);
        assert.equal(s.borderTopStyle, "solid", selector);
        assert.equal(s.borderTopColor, rimTop, `${selector} top edge`);
        for (const side of ["Right", "Bottom", "Left"]) assert.equal(s[`border${side}Color`], rim, `${selector} ${side}`);
        // no ring from a shadow: popups keep only their drop
        assert.ok(!/ 0px 0px 0px 1px/.test(s.boxShadow), `${selector} still draws a 1px ring: ${s.boxShadow}`);
      }
      for (const selector of [".basalt-button", ".basalt-input", ".basalt-badge", ".basalt-kbd-key"]) {
        assert.equal((await style(page.locator(selector).first(), "borderTopWidth")).borderTopWidth, "0px", `${selector} is a control or chip: no rim`);
      }
      await page.close();
    });

    test("in forced colours a panel keeps its rim as a real border", async () => {
      const { page } = await fixturePage(browser, render(`<><B.Card /><B.CodeBlock code="x" /></>`), { theme });
      await page.emulateMedia({ forcedColors: "active" });
      for (const selector of [".basalt-card", ".basalt-code"]) {
        const s = await style(page.locator(selector), "borderTopWidth", "borderTopStyle", "borderTopColor");
        assert.equal(s.borderTopWidth, "1px");
        assert.equal(s.borderTopStyle, "solid");
        assert.notEqual(s.borderTopColor, "rgba(0, 0, 0, 0)");
      }
      await page.close();
    });
  });
}

describe("kbd chips", () => {
  test("one chip per key: 20px, 2px apart, a fill with no border, Geist Mono 12/16", async () => {
    const { page } = await fixturePage(browser, render(`<><B.Kbd>⌘K</B.Kbd><B.Kbd>Esc</B.Kbd><B.Kbd>⇧⌘P</B.Kbd></>`), { theme: "dark" });
    const m = await page.locator(".basalt-kbd").evaluateAll((groups) => groups.map((group) => {
      const keys = [...group.querySelectorAll(".basalt-kbd-key")];
      const rects = keys.map((k) => k.getBoundingClientRect());
      const s = getComputedStyle(keys[0]);
      return { count: keys.length, heights: rects.map((r) => r.height), gaps: rects.slice(1).map((r, i) => r.left - rects[i].right), minWidth: s.minWidth, padding: [s.paddingLeft, s.paddingRight], radius: s.borderTopLeftRadius, border: s.borderTopWidth, shadow: s.boxShadow, fill: s.backgroundColor, font: s.fontFamily, size: s.fontSize, line: s.lineHeight, weight: s.fontWeight };
    }));
    assert.deepEqual(m.map((g) => g.count), [2, 1, 3]);
    for (const g of m) {
      assert.ok(g.heights.every((h) => h === 20), `chip heights ${g.heights}`);
      assert.ok(g.gaps.every((gap) => Math.abs(gap - 2) < 0.01), `chips are ${g.gaps}px apart`);
      assert.equal(g.minWidth, "20px");
      assert.deepEqual(g.padding, ["4px", "4px"]);
      assert.equal(g.radius, "4px");
      assert.equal(g.border, "0px");
      assert.equal(g.shadow, "none");
      assert.equal(g.fill, await resolve(page, "surface-kbd"));
      assert.match(g.font, /Geist Mono/);
      assert.deepEqual([g.size, g.line, g.weight], ["12px", "16px", "400"]);
    }
    await page.close();
  });

  test("⌘ ⌥ ⌃ are Phosphor icons at 12px in the text colour; other keys stay text", async () => {
    const { page } = await fixturePage(browser, render(`<><B.Kbd>⌘</B.Kbd><B.Kbd>⌥</B.Kbd><B.Kbd>⌃</B.Kbd><B.Kbd>⇧↵⌫⇥←</B.Kbd></>`), { theme: "light" });
    const kinds = await page.locator(".basalt-kbd").evaluateAll((groups) => groups.map((group) => [...group.querySelectorAll(".basalt-kbd-key")].map((k) => ({ icon: k.querySelector("svg") ? { w: k.querySelector("svg").getAttribute("width"), fill: getComputedStyle(k.querySelector("svg")).color, text: getComputedStyle(k).color } : null, text: k.textContent }))));
    for (const group of kinds.slice(0, 3)) {
      assert.equal(group.length, 1);
      assert.equal(group[0].icon?.w, "12");
      assert.equal(group[0].text, "", "the glyph is an icon, not text");
      assert.equal(group[0].icon.fill, group[0].icon.text, "the icon takes the text colour");
    }
    assert.deepEqual(kinds[3].map((k) => k.text), ["⇧", "↵", "⌫", "⇥", "←"]);
    assert.ok(kinds[3].every((k) => k.icon === null));
    await page.close();
  });

  test("a chip is hidden from assistive technology; the group reads in words, and a menu row carries the shortcut", async () => {
    const fixture = `<>
      <B.Kbd>⌘K</B.Kbd>
      <B.Menu defaultOpen><B.MenuTrigger>Actions</B.MenuTrigger><B.MenuContent><B.MenuItem shortcut="⌘D">Duplicate</B.MenuItem><B.MenuItem>Rename</B.MenuItem></B.MenuContent></B.Menu>
    </>`;
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await settle(page);
    assert.deepEqual(await page.locator(".basalt-kbd-key").evaluateAll((keys) => keys.map((k) => k.getAttribute("aria-hidden"))), ["true", "true", "true", "true"]);
    assert.equal(await page.locator("body > #root > .basalt-kbd > .basalt-visually-hidden").textContent(), "Command K");
    const row = page.getByRole("menuitem", { name: "Duplicate", exact: true });
    assert.equal(await row.getAttribute("aria-keyshortcuts"), "Meta+D");
    const spoken = await row.evaluate((el) => document.getElementById(el.getAttribute("aria-describedby")).textContent);
    assert.equal(spoken, "Command D");
    assert.equal(await row.locator(".basalt-kbd").getAttribute("aria-hidden"), "true", "the whole shortcut is decoration for the row");
    assert.equal(await page.getByRole("menuitem", { name: "Rename", exact: true }).getAttribute("aria-keyshortcuts"), null);
    await page.close();
  });

  test("a tooltip can show a real shortcut, and its trigger carries it", async () => {
    const { page } = await fixturePage(browser, render(`<B.TooltipProvider><B.Tooltip defaultOpen content="Open commands" shortcut="⌘K"><B.Button>Commands</B.Button></B.Tooltip></B.TooltipProvider>`), { theme: "dark" });
    await settle(page);
    assert.equal(await page.getByRole("button", { name: "Commands" }).getAttribute("aria-keyshortcuts"), "Meta+K");
    assert.equal(await page.locator(".basalt-tooltip .basalt-kbd-key").count(), 2);
    assert.match(await page.locator(".basalt-tooltip").textContent(), /Open commands.*\(Command K\)/);
    await page.close();
  });

  test("on a highlighted row the chip's text steps up to primary", async () => {
    const fixture = `<B.Menu defaultOpen><B.MenuTrigger>Actions</B.MenuTrigger><B.MenuContent><B.MenuItem shortcut="⌘D">Duplicate</B.MenuItem><B.MenuItem shortcut="⌘R">Rename</B.MenuItem></B.MenuContent></B.Menu>`;
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await settle(page);
    const rest = await style(page.locator(".basalt-menu-item").nth(1).locator(".basalt-kbd"), "color");
    assert.equal(rest.color, await resolve(page, "text-secondary", "color"));
    await page.locator(".basalt-menu-item").first().hover();
    await page.waitForSelector(".basalt-menu-item[data-highlighted]");
    const lit = await style(page.locator(".basalt-menu-item[data-highlighted] .basalt-kbd"), "color");
    assert.equal(lit.color, await resolve(page, "text-primary", "color"));
    await page.close();
  });
});

describe("CommandMenu", () => {
  const fixture = (extra = "") => `function App(){const[o,so]=React.useState(true);return <B.CommandMenu hints open={o} onOpenChange={so} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}},{id:'new',label:'New sandbox',onSelect:()=>{}}]}]}/>}
    window.closeIt=()=>{};${extra}
    createRoot(document.getElementById("root")).render(<App/>);`;

  for (const theme of ["dark", "light"]) {
    test(`the input row is a full-bleed level-2 band, 48px, with a divider below and no rim of its own (${theme})`, async () => {
      const { page } = await fixturePage(browser, fixture(), { theme });
      await page.getByRole("combobox").waitFor();
      await settle(page);
      assert.equal(await page.locator(".basalt-command").getAttribute("data-level"), "1", "the command menu resets to level 1");
      assert.equal(await page.locator(".basalt-command-search").getAttribute("data-level"), "2", "its band is one level above the panel");
      const band = await style(page.locator(".basalt-command-search"), "height", "backgroundColor", "borderBottomWidth", "borderBottomColor", "borderTopWidth", "borderLeftWidth", "borderTopLeftRadius", "boxShadow");
      assert.equal(band.height, "48px");
      assert.equal(band.backgroundColor, await resolve(page, "surface-2"), "level 2: #111111 in dark, white in light (no longer the hard-coded surface-3)");
      assert.deepEqual([band.borderBottomWidth, band.borderTopWidth, band.borderLeftWidth, band.borderTopLeftRadius, band.boxShadow], ["1px", "0px", "0px", "0px", "none"]);
      assert.equal(band.borderBottomColor, await resolve(page, "border-divider"));
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector(".basalt-command").getBoundingClientRect();
        const bar = document.querySelector(".basalt-command-search").getBoundingClientRect();
        const input = parseFloat(getComputedStyle(document.querySelector(".basalt-command-input")).fontSize);
        return { left: bar.left - panel.left, right: panel.right - bar.right, input };
      });
      assert.ok(geometry.left <= 1 && geometry.right <= 1, `the band is full-bleed (${JSON.stringify(geometry)}): inside the panel's 1px rim`);
      assert.equal(geometry.input, 16);
      await page.close();
    });
  }

  test("rows are Menu rows with a 40px plate and a 44px hit area, a shortcut as chips, and no bar", async () => {
    const { page } = await fixturePage(browser, fixture(), { theme: "dark" });
    await page.getByRole("combobox").waitFor();
    await settle(page);
    const m = await page.locator("[cmdk-item]").first().evaluate((row) => {
      const list = row.parentElement.closest(".basalt-command-list").getBoundingClientRect();
      const r = row.getBoundingClientRect();
      const plate = getComputedStyle(row, "::before");
      return { box: getComputedStyle(row).boxSizing, left: r.left - list.left, height: r.height, plateRadius: plate.borderTopLeftRadius, plateHeight: parseFloat(plate.height), plateWidth: parseFloat(plate.width), rowWidth: r.width, selected: row.getAttribute("data-selected"), keys: row.querySelectorAll(".basalt-kbd-key").length, shortcut: row.getAttribute("aria-keyshortcuts"), described: document.getElementById(row.getAttribute("aria-describedby"))?.textContent };
    });
    assert.equal(m.box, "border-box");
    assert.ok(Math.abs(m.left - 4) < 1.01, `inset ${m.left}`);
    assert.equal(m.height, 44, "the hit area");
    assert.equal(m.plateHeight, 40, "the plate (size-control-xl)");
    assert.equal(m.plateRadius, "8px");
    assert.ok(Math.abs(m.plateWidth - m.rowWidth) < 0.5, "the plate spans the row: it is a plate, not a bar");
    assert.equal(m.selected, "true");
    assert.equal(m.keys, 2);
    assert.equal(m.shortcut, "Meta+D");
    assert.equal(m.described, "Command D");
    // the footer's keys are chips too
    assert.equal(await page.locator(".basalt-command-footer .basalt-kbd-key").count(), 2, "↵ and Esc, one chip each");
    await page.close();
  });

  test("it opens and closes without animation, backdrop included", async () => {
    const { page } = await fixturePage(browser, fixture(), { theme: "dark" });
    await page.getByRole("combobox").waitFor();
    const motion = await page.evaluate(() => ({
      animations: document.getAnimations().length,
      panel: getComputedStyle(document.querySelector(".basalt-command")).transitionDuration,
      backdrop: getComputedStyle(document.querySelector(".basalt-command-backdrop")).transitionDuration,
      opacity: getComputedStyle(document.querySelector(".basalt-command")).opacity,
    }));
    assert.deepEqual(motion, { animations: 0, panel: "0s", backdrop: "0s", opacity: "1" });
    await page.keyboard.press("Escape");
    await page.locator(".basalt-command").waitFor({ state: "detached", timeout: 500 });
    await page.close();
  });
});

describe("popup entry", () => {
  const fixture = `<><div class="basalt-menu" id="menu" data-starting-style /><div class="basalt-tooltip" id="tooltip" data-starting-style /><div class="basalt-popover" id="popover" data-starting-style />
    <div class="basalt-menu" id="menu-out" data-ending-style /><div class="basalt-tooltip" id="tooltip-out" data-ending-style /><div class="basalt-popover" id="popover-out" data-ending-style /></>`;

  test("it starts at opacity 0 and scale .98, from its origin, with no offset, on base ease-out; leaving is .75 ease-in", async () => {
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    const read = (id) => page.locator(`#${id}`).evaluate((el) => { const s = getComputedStyle(el); return { opacity: s.opacity, transform: s.transform, origin: s.transformOrigin !== "", duration: s.transitionDuration.split(",")[0].trim(), ease: s.transitionTimingFunction.split(", cubic-bezier").join("|cubic-bezier").split("|")[0] }; });
    const base = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-base").trim());
    assert.equal(base, "150ms");
    for (const id of ["menu", "tooltip", "popover"]) {
      const s = await read(id);
      assert.equal(s.opacity, "0", id);
      assert.equal(s.transform, "matrix(0.98, 0, 0, 0.98, 0, 0)", `${id} scales from .98 and does not move`);
      assert.equal(s.duration, "0.15s", id);
      assert.equal(s.ease, "cubic-bezier(0.16, 1, 0.3, 1)", id);
    }
    for (const id of ["menu-out", "tooltip-out", "popover-out"]) {
      const s = await read(id);
      assert.equal(s.duration, "0.1125s", `${id} leaves at 0.75 of its entry`);
      assert.equal(s.ease, "cubic-bezier(0.4, 0, 1, 1)", id);
    }
    await page.close();
  });

  test("reduced motion: the popup does not scale, it only fades", async () => {
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await settle(page); // the transform was transitioning to none; read it once it has arrived
    for (const id of ["menu", "tooltip", "popover"]) assert.equal((await style(page.locator(`#${id}`), "transform")).transform, "none", id);
    await page.close();
  });
});

describe("press", () => {
  const fixture = `<><B.Button variant="primary" data-t="primary">Deploy</B.Button><B.Button data-t="secondary">Cancel</B.Button><B.Button variant="ghost" data-t="ghost">Skip</B.Button><B.Button variant="danger" data-t="danger">Delete</B.Button><B.IconButton icon={B.CopyIcon ?? (()=>null)} label="Copy" data-t="icon" /></>`;

  for (const theme of ["dark", "light"]) {
    test(`a press is a colour step and a .98 scale, on every variant (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(`<><B.Button variant="primary" data-t="primary">Deploy</B.Button><B.Button data-t="secondary">Cancel</B.Button><B.Button variant="ghost" data-t="ghost">Skip</B.Button><B.Button variant="danger" data-t="danger">Delete</B.Button></>`), { theme });
      const down = async (t) => {
        const el = page.locator(`[data-t=${t}]`);
        const box = await el.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await settle(page);
        const s = await style(el, "transform", "backgroundColor", "transitionProperty");
        await page.mouse.up();
        return s;
      };
      const press = await down("primary");
      assert.equal(press.transform, "matrix(0.98, 0, 0, 0.98, 0, 0)");
      assert.equal(press.backgroundColor, await resolve(page, "action-primary-press"), "primary steps to action-primary-press");
      assert.ok(/transform/.test(press.transitionProperty), "the scale is part of the button's own transition");
      for (const t of ["secondary", "ghost", "danger"]) {
        const s = await down(t);
        assert.equal(s.transform, "matrix(0.98, 0, 0, 0.98, 0, 0)", t);
        assert.equal(s.backgroundColor, await resolve(page, "state-selected"), `${t} keeps the selected wash`);
      }
      await page.close();
    });
  }

  test("there is no .basalt-press utility, and the button is the only thing that scales on :active", async () => {
    const { page } = await fixturePage(browser, render(`<B.Button>Go</B.Button>`), { theme: "dark" });
    const css = await page.evaluate(() => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).map((rule) => rule.cssText).join("\n"));
    assert.ok(!css.includes(".basalt-press"), ".basalt-press is back");
    const scaling = [...css.matchAll(/([^{}]*:active[^{}]*)\{[^}]*scale\(/g)].map((m) => m[1].trim().replace(/\s+/g, " "));
    assert.ok(scaling.length > 0 && scaling.every((selector) => selector.split(",").every((part) => part.trim().startsWith(".basalt-button:active"))), `something other than a button scales on :active: ${scaling}`);
    assert.ok(!/--basalt-(?:duration-press|ease-settle)/.test(css));
    await page.close();
  });

  test("a menu row does not scale when pressed", async () => {
    const { page } = await fixturePage(browser, render(`<B.Menu defaultOpen><B.MenuTrigger>M</B.MenuTrigger><B.MenuContent><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>`), { theme: "dark" });
    await settle(page);
    const row = page.locator(".basalt-menu-item");
    const box = await row.boundingBox();
    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    assert.equal((await style(row, "transform")).transform, "none");
    await page.mouse.up();
    await page.close();
  });
});

describe("vertical tabs", () => {
  const fixture = `<B.Tabs orientation="vertical" defaultValue="a" style={{ width: 400 }}>
    <B.TabsList aria-label="Sections"><B.Tab value="a">Account</B.Tab><B.Tab value="b">Billing</B.Tab><B.Tab value="c">Keys</B.Tab></B.TabsList>
    <B.TabsPanel value="a">Account panel</B.TabsPanel><B.TabsPanel value="b">Billing panel</B.TabsPanel><B.TabsPanel value="c">Keys panel</B.TabsPanel>
  </B.Tabs>`;

  for (const theme of ["dark", "light"]) {
    test(`it is a column of 36px radius-8 pills in a track (padding 4, radius 12), with no divider and no indicator (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(fixture), { theme });
      await settle(page);
      const m = await page.evaluate(() => {
        const list = document.querySelector(".basalt-tabs-list");
        const tabs = [...document.querySelectorAll(".basalt-tab")];
        const panel = document.querySelector(".basalt-tabs-panel:not([hidden])");
        const ls = getComputedStyle(list);
        const l = list.getBoundingClientRect();
        const t0 = tabs[0].getBoundingClientRect();
        const t1 = tabs[1].getBoundingClientRect();
        const ts = getComputedStyle(tabs[0]);
        return {
          direction: ls.flexDirection, gap: t1.top - t0.bottom, track: [ls.paddingTop, ls.paddingLeft, ls.borderTopLeftRadius, ls.backgroundColor, ls.borderRightWidth, ls.borderLeftWidth, ls.boxShadow],
          panelGap: panel.getBoundingClientRect().left - l.right, tabHeight: t0.height, tabRadius: ts.borderTopLeftRadius, indicators: document.querySelectorAll(".basalt-tabs-indicator").length,
          insetLeft: t0.left - l.left,
        };
      });
      assert.equal(m.direction, "column");
      assert.equal(m.gap, 2);
      assert.deepEqual(m.track.slice(0, 3), ["4px", "4px", "12px"], "track padding 4, radius 12");
      assert.equal(m.track[3], await resolve(page, "surface-sunken-strong"));
      assert.deepEqual([m.track[4], m.track[5], m.track[6]], ["0px", "0px", "none"], "no divider on either side");
      assert.equal(m.insetLeft, 4);
      assert.equal(m.tabHeight, 36);
      assert.equal(m.tabRadius, "8px");
      assert.equal(m.indicators, 0, "no sliding indicator in a vertical list");
      assert.equal(m.panelGap, 16, "the panel sits 16px from the list");
      await page.close();
    });

    test(`the chosen tab is the raised pill, with the selected wash over surface-top in dark (${theme})`, async () => {
      const { page } = await fixturePage(browser, render(fixture), { theme });
      await settle(page);
      // The pill is the shared one while it is live (the control is data-slide); otherwise the chosen tab paints its own.
      const active = await page.locator(".basalt-tab[data-active]").evaluate((tab) => {
        const shared = tab.closest("[data-slide]")?.querySelector(":scope > .basalt-pill");
        const pill = shared && getComputedStyle(shared).display !== "none" ? getComputedStyle(shared) : getComputedStyle(tab);
        return { backgroundColor: pill.backgroundColor, boxShadow: pill.boxShadow, color: getComputedStyle(tab).color };
      });
      const rest = await style(page.locator(".basalt-tab:not([data-active])").first(), "backgroundColor", "color");
      assert.equal(rest.backgroundColor, "rgba(0, 0, 0, 0)");
      assert.equal(rest.color, await resolve(page, "text-secondary", "color"));
      assert.equal(active.color, await resolve(page, "text-primary", "color"));
      assert.notEqual(active.boxShadow, "none", "the pill keeps its hairline");
      assert.deepEqual(await rgb8(page, active.backgroundColor), theme === "dark" ? [44, 44, 44] : await rgb8(page, await resolve(page, "surface-top")), "dark: #2c2c2c (surface-top plus the wash, one solid fill); light: surface-top");
      await page.close();
    });
  }

  test("arrows move focus between tabs, Enter chooses, and the pill follows the chosen tab", async () => {
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await settle(page);
    await page.getByRole("tab", { name: "Account" }).focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Billing");
    await page.keyboard.press("Enter");
    assert.equal(await page.getByRole("tab", { name: "Billing" }).getAttribute("aria-selected"), "true");
    await page.getByText("Billing panel").waitFor();
    await settle(page);
    assert.equal(await page.locator(".basalt-tab[data-active]").textContent(), "Billing");
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Account");
    assert.equal(await page.getByRole("tablist").getAttribute("aria-orientation"), "vertical");
    await page.close();
  });

  test("horizontal tabs keep their underline: it is horizontal, and it slides", async () => {
    const horizontal = `<B.Tabs defaultValue="a"><B.TabsList aria-label="S"><B.Tab value="a">A</B.Tab><B.Tab value="b">B</B.Tab></B.TabsList><B.TabsPanel value="a">Panel A</B.TabsPanel><B.TabsPanel value="b">Panel B</B.TabsPanel></B.Tabs>`;
    const { page } = await fixturePage(browser, render(horizontal), { theme: "dark" });
    await settle(page);
    const bar = await style(page.locator(".basalt-tabs-indicator"), "height", "backgroundColor", "transitionProperty", "transitionDuration");
    assert.equal(bar.height, "2px");
    assert.equal(bar.backgroundColor, await resolve(page, "text-primary"));
    assert.equal(bar.transitionProperty, "left, width");
    assert.equal(bar.transitionDuration, "0.2s");
    await page.emulateMedia({ forcedColors: "active" });
    const highlight = await page.evaluate(() => { const p = document.createElement("div"); document.body.append(p); p.style.backgroundColor = "Highlight"; const c = getComputedStyle(p).backgroundColor; p.remove(); return c; });
    assert.equal((await style(page.locator(".basalt-tabs-indicator"), "backgroundColor")).backgroundColor, highlight, "forced colours: the underline is Highlight");
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" });
    assert.equal((await style(page.locator(".basalt-tabs-indicator"), "transitionDuration")).transitionDuration, "0s", "reduced motion: it does not move");
    await page.close();
  });

  test("forced colours: the chosen vertical tab is Highlight with HighlightText, opted out of colour adjustment", async () => {
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page);
    const colors = await page.evaluate(() => {
      const probe = document.createElement("div"); document.body.append(probe);
      const read = (v) => { probe.style.backgroundColor = v; return getComputedStyle(probe).backgroundColor; };
      const out = { Highlight: read("Highlight"), HighlightText: read("HighlightText") }; probe.remove(); return out;
    });
    const tab = await style(page.locator(".basalt-tab[data-active]"), "backgroundColor", "color", "forcedColorAdjust", "boxShadow");
    assert.deepEqual(tab, { backgroundColor: colors.Highlight, color: colors.HighlightText, forcedColorAdjust: "none", boxShadow: "none" });
    await page.close();
  });

  test("a tab change moves the panel 8px and fades it in at the indicator's timing, without remounting; under reduced motion it is a 100ms crossfade", async () => {
    const horizontal = `<B.Tabs defaultValue="a"><B.TabsList aria-label="S"><B.Tab value="a">A</B.Tab><B.Tab value="b">B</B.Tab></B.TabsList><B.TabsPanel value="a">Panel A</B.TabsPanel><B.TabsPanel value="b" keepMounted><input aria-label="draft" /></B.TabsPanel></B.Tabs>`;
    const { page } = await fixturePage(browser, render(horizontal), { theme: "dark" });
    await settle(page);
    await page.getByRole("tab", { name: "B" }).click();
    const input = page.getByRole("textbox", { name: "draft" });
    await input.fill("kept");
    const during = await page.evaluate(() => {
      const panel = document.querySelector(".basalt-tabs-panel:not([hidden])");
      const [a] = panel.getAnimations();
      return { name: a?.animationName, duration: a && a.effect.getComputedTiming().duration, ease: a && a.effect.getKeyframes()[0].easing };
    });
    assert.equal(during.name, "basalt-slide-forward");
    assert.equal(during.duration, 200);
    assert.equal(during.ease, "cubic-bezier(0.16, 1, 0.3, 1)");
    const distance = await page.evaluate(() => {
      const rule = [...document.styleSheets].flatMap((s) => [...s.cssRules]).flatMap((r) => (r.cssRules ? [...r.cssRules] : [r])).find((r) => r.name === "basalt-slide-forward");
      return rule.cssText;
    });
    assert.match(distance, /translateX\(var\(--basalt-space-2\)\)/, "8px, from the token");
    await page.getByRole("tab", { name: "A" }).click();
    await page.getByRole("tab", { name: "B" }).click();
    assert.equal(await input.inputValue(), "kept", "the panel is the same node");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("tab", { name: "A" }).click();
    const reduced = await page.evaluate(() => {
      const [a] = document.querySelector(".basalt-tabs-panel:not([hidden])").getAnimations();
      return { name: a?.animationName, duration: a?.effect.getComputedTiming().duration };
    });
    assert.deepEqual(reduced, { name: "basalt-fade-in", duration: 100 });
    await page.close();
  });
});

describe("the package's public surface", () => {
  test("Sparkline is exported, Chart is not, and SharedElement is withdrawn", async () => {
    const { page } = await fixturePage(browser, `window.names = Object.keys(B);`, { theme: "dark" });
    const names = await page.evaluate(() => window.names);
    assert.ok(names.includes("Sparkline"));
    assert.ok(!names.includes("Chart"), "Chart was renamed Sparkline");
    assert.ok(!names.includes("SharedElement"), "SharedElement is not public");
    for (const gone of ["press", "Press"]) assert.ok(!names.includes(gone));
    await page.close();
  });
});

// axe in both themes over the new surfaces: nested panels, rims, kbd chips, the active plate, vertical tabs,
// the command menu's input row and a tooltip with a shortcut. Overlays are audited one at a time: two
// open at once overlap, and axe cannot resolve the colour behind a menu that a dialog's scrim covers.
const axeViolations = async (page) => {
  // the fixture page is bare: give it the page surface an app would have
  await page.evaluate(() => { document.title = "Surfaces"; document.documentElement.lang = "en"; document.body.style.background = "var(--basalt-surface-page)"; });
  await settle(page);
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run(
    { exclude: [["[data-base-ui-focus-guard]"]] },
    { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] },
  ));
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => `${n.target.join(" ")} ${n.any.map((c) => c.message).join(" ")}`).slice(0, 3).join("; ")})`);
};

for (const theme of ["dark", "light"]) {
  describe(`axe on the new surfaces (${theme})`, () => {
    const panels = `<B.TooltipProvider><main>
      <h1>Surfaces</h1>
      <B.Card><B.CardHeader><B.CardTitle>Deploy</B.CardTitle></B.CardHeader><B.CardContent>
        <B.CodeBlock code="basalt deploy --prod" language="bash" title="terminal" />
        <B.Callout title="Heads up" status="warning">Check the route first.</B.Callout>
      </B.CardContent></B.Card>
      <B.Tooltip defaultOpen content="Open commands" shortcut="⌘K"><B.Button>Shortcut tip</B.Button></B.Tooltip>
      <B.Tabs orientation="vertical" defaultValue="a"><B.TabsList aria-label="Sections"><B.Tab value="a">Account</B.Tab><B.Tab value="b">Billing</B.Tab></B.TabsList><B.TabsPanel value="a">Account panel</B.TabsPanel><B.TabsPanel value="b">Billing panel</B.TabsPanel></B.Tabs>
    </main></B.TooltipProvider>`;

    test("nested panels, a tooltip with a shortcut and vertical tabs", async () => {
      const { page } = await fixturePage(browser, render(panels), { theme });
      assert.deepEqual(await axeViolations(page), []);
      await page.close();
    });

    test("a menu with shortcuts and a highlighted row", async () => {
      const fixture = render(`<main><h1>Menu</h1><B.Menu defaultOpen><B.MenuTrigger>Row menu</B.MenuTrigger><B.MenuContent><B.MenuItem shortcut="⌘D">Duplicate</B.MenuItem><B.MenuItem shortcut="⌥⌫">Archive</B.MenuItem><B.MenuItem>Rename</B.MenuItem></B.MenuContent></B.Menu></main>`);
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      await page.keyboard.press("ArrowDown");
      await page.waitForSelector(".basalt-menu-item[data-highlighted]");
      assert.deepEqual(await axeViolations(page), []);
      await page.close();
    });

    test("the command menu, with its input row, a selected row and its footer", async () => {
      const fixture = `function App(){const [cmd,setCmd]=React.useState(true);return <main><h1>Commands</h1><B.CommandMenu hints open={cmd} onOpenChange={setCmd} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}},{id:'new',label:'New sandbox',onSelect:()=>{}}]}]}/></main>}
        createRoot(document.getElementById("root")).render(<App/>);`;
      const { page } = await fixturePage(browser, fixture, { theme });
      await page.getByRole("combobox").waitFor();
      assert.deepEqual(await axeViolations(page), []);
      await page.close();
    });
  });
}

for (const theme of ["dark", "light"]) {
  test(`level is position, not importance: every in-flow panel is flat, with no shadow, at any depth (${theme})`, async () => {
    const fixture = `<main>
      <B.Card className="p-card"><B.Card className="p-nested">Nested</B.Card></B.Card>
      <B.TableContainer className="p-table"><B.Table><B.TableBody><B.TableRow><B.TableCell>Cell</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
      <B.CodeBlock className="p-code" code="const a = 1" />
      <B.Callout className="p-callout" status="info" title="Heads up">Body</B.Callout>
      <B.LivePreview label="Name" saved="Basalt" onSave={() => {}} />
    </main>`;
    const { page } = await fixturePage(browser, render(fixture), { theme });
    await settle(page);
    const panels = await page.evaluate(() => [".p-card", ".p-nested", ".p-table", ".p-code", ".p-callout", ".basalt-preview-card"].map((selector) => {
      const el = document.querySelector(selector);
      return { selector, found: Boolean(el), level: el?.dataset.level ?? null, shadow: el && getComputedStyle(el).boxShadow, position: el && getComputedStyle(el).position };
    }));
    for (const panel of panels) {
      assert.ok(panel.found, `${panel.selector} rendered`);
      assert.ok(panel.level, `${panel.selector} is a levelled panel`);
      assert.equal(panel.shadow, "none", `${panel.selector} (level ${panel.level}) is in the flow, so it has no shadow`);
      assert.ok(["static", "relative"].includes(panel.position), `${panel.selector} is in the flow (${panel.position})`);
    }
    await page.close();
  });
}
