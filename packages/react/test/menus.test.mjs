// The menus round (council item 48, owner item 49): every popup row is a plate and a lift, the depth rule has a floor of 1,
// a modal resets to 1, the 4px gap is drawn inside the rows, and the vertical bar is gone. Driven in Chromium against the
// built package with the real stylesheet, in both themes, in forced colours, at touch size and in compact density.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const ICON = `import { PlusIcon } from "@phosphor-icons/react"; `;
const render = (jsx) => `${ICON}createRoot(document.getElementById("root")).render(${jsx});`;
const style = (locator, ...props) => locator.evaluate((el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]])), props);
const pseudo = (locator, which, ...props) => locator.evaluate((el, [which, props]) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el, which)[p]])), [which, props]);

/** A CSS colour (any serialisation: rgb, rgba, color(srgb ...)) as [r, g, b, a] the way a canvas paints it. */
const rgba = (page, css) => page.evaluate((css) => {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}, css);

/** What the browser resolves a token to, as a canvas paints it. */
const token = async (page, name) => {
  const css = await page.evaluate((name) => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = `var(--basalt-${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, name);
  return rgba(page, css);
};

const hex = ([r, g, b]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

// --- fixtures: each opens one popup (or more) from inside the panel levels the test names ---
const menu = (items = `<B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem>`) => `<B.Menu defaultOpen><B.MenuTrigger>Menu</B.MenuTrigger><B.MenuContent>${items}</B.MenuContent></B.Menu>`;
const select = `<B.Select aria-label="Region" defaultOpen options={[{value:"a",label:"Alpha"},{value:"b",label:"Beta"}]} />`;
const combobox = `<B.Combobox aria-label="Zone" defaultOpen options={[{value:"x",label:"X-ray"},{value:"y",label:"Yankee"}]} />`;
const commands = `function App(){const[o,so]=React.useState(true);return <B.CommandMenu hints open={o} onOpenChange={so} groups={[{label:'Sandbox',commands:[{id:'dup',label:'Duplicate',shortcut:'⌘D',onSelect:()=>{}},{id:'new',label:'New sandbox',onSelect:()=>{}},{id:'del',label:'Delete',danger:true,onSelect:()=>{}}]}]}/>}
  createRoot(document.getElementById("root")).render(<App/>);`;

/**
 * The plate that lights a row, as the browser paints it: the popup's shared plate while the hover glide is live (data-glide on
 * its host), otherwise the row's own ::before. Same fill, radius and image either way: that is the point of the fallback.
 */
const litPlate = (row, ...props) => row.evaluate((row, props) => {
  const shared = row.closest("[data-glide]")?.querySelector(".basalt-plate");
  const own = shared && getComputedStyle(shared).display !== "none" ? shared : null;
  const painted = own ? getComputedStyle(own) : getComputedStyle(row, "::before");
  return Object.fromEntries(props.map((p) => [p, painted[p]]));
}, props);

/** Highlight the nth row of a popup with the pointer, and wait for it. */
async function light(page, popup, n = 0) {
  await popup.locator(".basalt-menu-item, [cmdk-item]").nth(n).hover();
  await page.waitForFunction(() => document.querySelector("[data-highlighted], [cmdk-item][data-selected='true']"));
  await settle(page);
}

describe("the depth floor and the modal reset", () => {
  for (const theme of ["dark", "light"]) {
    test(`a popup is its opener plus one, with a floor of 1 and a cap of 3 (${theme})`, async () => {
      const fixture = `<>
        <B.Menu defaultOpen><B.MenuTrigger>Page menu</B.MenuTrigger><B.MenuContent data-name="menu-page"><B.MenuItem>One</B.MenuItem>
          <B.MenuSubmenu defaultOpen><B.MenuSubmenuTrigger>More</B.MenuSubmenuTrigger><B.MenuContent data-name="submenu-page"><B.MenuItem>Deep</B.MenuItem></B.MenuContent></B.MenuSubmenu>
        </B.MenuContent></B.Menu>
        <B.Select aria-label="Region" defaultOpen options={[{value:"a",label:"Alpha"}]} />
        <B.Combobox aria-label="Zone" defaultOpen options={[{value:"x",label:"X-ray"}]} />
        <B.Card><B.Menu defaultOpen><B.MenuTrigger>Card menu</B.MenuTrigger><B.MenuContent data-name="menu-card"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>
          <B.Card><B.Menu defaultOpen><B.MenuTrigger>Nested menu</B.MenuTrigger><B.MenuContent data-name="menu-nested"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>
            <B.Card><B.Menu defaultOpen><B.MenuTrigger>Deep menu</B.MenuTrigger><B.MenuContent data-name="menu-deep"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu></B.Card>
          </B.Card>
        </B.Card>
      </>`;
      const { page } = await fixturePage(browser, render(fixture), { theme });
      await settle(page);
      const level = (name) => page.locator(`[data-name="${name}"]`).getAttribute("data-level");
      assert.equal(await level("menu-page"), "1", "a menu from the page takes the floor");
      assert.equal(await level("submenu-page"), "2", "a submenu is one deeper than its menu");
      assert.equal(await page.locator(".basalt-select-popup").getAttribute("data-level"), "1", "a select from the page");
      assert.equal(await page.locator(".basalt-combobox-popup").getAttribute("data-level"), "1", "a combobox from the page");
      assert.equal(await level("menu-card"), "2", "from a level-1 card");
      assert.equal(await level("menu-nested"), "3", "from a level-2 card");
      assert.equal(await level("menu-deep"), "3", "from a level-3 card: the cap");
      await page.close();
    });

    test(`a dialog, an alert dialog, a sheet and the command menu reset to 1, and what they hold starts at 2 (${theme})`, async () => {
      for (const [name, jsx] of [
        ["dialog", `<B.Dialog defaultOpen><B.DialogContent data-name="modal"><B.DialogTitle>D</B.DialogTitle><B.Card data-name="inner">Card</B.Card><B.Menu defaultOpen><B.MenuTrigger>M</B.MenuTrigger><B.MenuContent data-name="popup"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu></B.DialogContent></B.Dialog>`],
        ["alert dialog", `<B.AlertDialog defaultOpen><B.AlertDialogContent data-name="modal"><B.AlertDialogTitle>Delete?</B.AlertDialogTitle><B.Card data-name="inner">Card</B.Card><B.AlertDialogActions><B.AlertDialogCancel>Cancel</B.AlertDialogCancel></B.AlertDialogActions></B.AlertDialogContent></B.AlertDialog>`],
        ["sheet", `<B.Sheet defaultOpen><B.SheetContent data-name="modal"><B.SheetTitle>S</B.SheetTitle><B.Card data-name="inner">Card</B.Card><B.Menu defaultOpen><B.MenuTrigger>M</B.MenuTrigger><B.MenuContent data-name="popup"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu></B.SheetContent></B.Sheet>`],
      ]) {
        const { page, errors } = await fixturePage(browser, render(jsx), { theme });
        await settle(page);
        const level = (n) => page.locator(`[data-name="${n}"]`).getAttribute("data-level");
        assert.equal(await level("modal"), "1", `${name} resets to 1`);
        assert.equal(await level("inner"), "2", `a card in a ${name} starts at 2`);
        if (await page.locator('[data-name="popup"]').count()) assert.equal(await level("popup"), "2", `a menu opened inside a ${name} is level 2`);
        assert.deepEqual(errors, []);
        await page.close();
      }
      const { page } = await fixturePage(browser, commands, { theme });
      await page.getByRole("combobox").waitFor();
      assert.equal(await page.locator(".basalt-command").getAttribute("data-level"), "1", "the command menu resets to 1");
      await page.close();
    });
  }

  test("dark fills: a level-1 popup is #0a0a0a, level 2 #111111, level 3 #171717; a dialog is #0a0a0a", async () => {
    const fixture = `<><B.Menu defaultOpen><B.MenuTrigger>A</B.MenuTrigger><B.MenuContent data-name="l1"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>
      <B.Card><B.Menu defaultOpen><B.MenuTrigger>B</B.MenuTrigger><B.MenuContent data-name="l2"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu>
        <B.Card><B.Menu defaultOpen><B.MenuTrigger>C</B.MenuTrigger><B.MenuContent data-name="l3"><B.MenuItem>One</B.MenuItem></B.MenuContent></B.Menu></B.Card></B.Card>
      <B.Dialog defaultOpen><B.DialogContent data-name="dialog"><B.DialogTitle>D</B.DialogTitle></B.DialogContent></B.Dialog></>`;
    const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
    await settle(page);
    const fill = async (name) => hex(await rgba(page, (await style(page.locator(`[data-name="${name}"]`), "backgroundColor")).backgroundColor));
    assert.deepEqual([await fill("l1"), await fill("l2"), await fill("l3"), await fill("dialog")], ["#0a0a0a", "#111111", "#171717", "#0a0a0a"]);
    await page.close();
  });
});

describe("the plate: one solid fill per level, never a layered image", () => {
  /** [level, how to reach it, the dark plate, the dark panel] */
  const levels = [
    [1, (inner) => inner, "#262626", "#0a0a0a"],
    [2, (inner) => `<B.Card>${inner}</B.Card>`, "#2c2c2c", "#111111"],
    [3, (inner) => `<B.Card><B.Card>${inner}</B.Card></B.Card>`, "#2c2c2c", "#171717"],
  ];
  for (const [level, wrap, darkPlate, darkPanel] of levels) {
    test(`level ${level}: dark is ${darkPlate} on ${darkPanel} as one background-color, light is the 7% wash`, async () => {
      for (const theme of ["dark", "light"]) {
        const { page } = await fixturePage(browser, render(wrap(menu())), { theme });
        await settle(page);
        const popup = page.locator(".basalt-menu");
        assert.equal(await popup.getAttribute("data-level"), String(level));
        await light(page, popup);
        const plate = await litPlate(popup.locator("[data-highlighted]"), "backgroundColor", "backgroundImage");
        assert.equal(plate.backgroundImage, "none", "the plate is never a layered image (forced colours would turn it into a backplate)");
        const wash = await token(page, "state-selected");
        if (theme === "dark") {
          assert.equal(hex(await rgba(page, plate.backgroundColor)), darkPlate, `dark plate on level ${level}`);
          assert.equal(hex(await rgba(page, (await style(popup, "backgroundColor")).backgroundColor)), darkPanel);
          assert.equal(plate.backgroundColor.startsWith("rgba("), false, "dark's plate is opaque, not a wash over the panel");
        } else {
          assert.deepEqual(await rgba(page, plate.backgroundColor), wash, "light's plate is the selected wash");
          assert.equal(wash[3], Math.round(0.07 * 255));
        }
        await page.close();
      }
    });
  }

  test("dark's plate is the next level plus state-selected's own alpha: if the wash changes, so must the recipe", async () => {
    const { page } = await fixturePage(browser, render(`<B.Card>${menu()}</B.Card>`), { theme: "dark" });
    await settle(page);
    await light(page, page.locator(".basalt-menu"));
    const alpha = (await token(page, "state-selected"))[3] / 255;
    const next = await token(page, "surface-3");
    const expected = next.slice(0, 3).map((c) => Math.round(255 * alpha + c * (1 - alpha)));
    const plate = hex(await rgba(page, (await litPlate(page.locator("[data-highlighted]"), "backgroundColor")).backgroundColor));
    assert.equal(plate, hex(expected));
    await page.close();
  });

  test("the plate fills Menu, Select, Combobox and CommandMenu rows alike", async () => {
    for (const [name, fixture, popup] of [["Menu", menu(), ".basalt-menu"], ["Select", select, ".basalt-select-popup"], ["Combobox", combobox, ".basalt-combobox-popup"]]) {
      const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
      await settle(page);
      await light(page, page.locator(popup));
      const plate = await litPlate(page.locator(`${popup} [data-highlighted]`), "backgroundColor", "borderTopLeftRadius", "backgroundImage");
      assert.equal(hex(await rgba(page, plate.backgroundColor)), "#262626", name);
      assert.equal(plate.borderTopLeftRadius, "8px", name);
      assert.equal(plate.backgroundImage, "none", name);
      await page.close();
    }
    const { page } = await fixturePage(browser, commands, { theme: "dark" });
    await page.getByRole("combobox").waitFor();
    await settle(page);
    const plate = await litPlate(page.locator("[cmdk-item][data-selected='true']"), "backgroundColor", "borderTopLeftRadius", "backgroundImage");
    assert.equal(hex(await rgba(page, plate.backgroundColor)), "#262626", "CommandMenu is level 1");
    assert.equal(plate.borderTopLeftRadius, "8px");
    assert.equal(plate.backgroundImage, "none");
    await page.close();
  });
});

describe("the lift: rest rows are secondary, the active row goes to primary, with no weight change", () => {
  for (const theme of ["dark", "light"]) {
    test(`Menu (${theme})`, async () => {
      const fixture = render(menu(`<B.MenuItem icon={PlusIcon} shortcut="⌘D">Duplicate</B.MenuItem><B.MenuItem danger>Delete</B.MenuItem><B.MenuCheckboxItem defaultChecked>Archived</B.MenuCheckboxItem>`));
      const { page } = await fixturePage(browser, fixture, { theme });
      await settle(page);
      const popup = page.locator(".basalt-menu");
      const secondary = await token(page, "text-secondary");
      const primary = await token(page, "text-primary");
      const ink = async (locator) => rgba(page, (await style(locator, "color")).color);
      const first = popup.locator(".basalt-menu-item").nth(0);
      assert.deepEqual(await ink(first), secondary, "a rest label is secondary");
      assert.deepEqual(await ink(first.locator(".basalt-kbd")), secondary, "a rest shortcut chip is secondary");
      const restWeight = (await style(first, "fontWeight")).fontWeight;
      assert.equal(restWeight, "400");
      assert.equal((await style(first, "fontSize")).fontSize, "14px", "popup rows are 14/20");
      assert.equal((await style(first, "lineHeight")).lineHeight, "20px");
      assert.deepEqual(await ink(popup.locator(".basalt-menu-check")), primary, "a chosen value's check is primary, at rest");
      assert.equal(await popup.locator(".basalt-menu-check").evaluate((el) => getComputedStyle(el).fontWeight), "400", "and adds no weight");
      await light(page, popup, 0);
      assert.deepEqual(await ink(first), primary, "the lit label is primary");
      assert.deepEqual(await ink(first.locator(".basalt-kbd")), primary, "and so is its chip");
      assert.equal((await style(first, "fontWeight")).fontWeight, restWeight, "no weight change");
      assert.equal((await style(first, "outlineStyle")).outlineStyle, "none", "no outline");
      assert.deepEqual(await ink(popup.locator(".basalt-menu-item").nth(1)), await token(page, "status-danger"), "danger at rest");
      await light(page, popup, 1);
      assert.deepEqual(await ink(popup.locator(".basalt-menu-item").nth(1)), await token(page, "status-danger"), "danger keeps its colour on the plate");
      assert.deepEqual(await ink(first), secondary, "the row that lost the highlight steps back down");
      await page.close();
    });
  }

  test("a glyph is secondary at rest and primary when lit; a hint steps from tertiary to secondary on the plate", async () => {
    const fixture = render(menu(`<B.MenuItem label="Host">Host <B.Text as="span" size="sm" tone="tertiary">eu-west</B.Text></B.MenuItem>`));
    const { page } = await fixturePage(browser, fixture, { theme: "dark" });
    await settle(page);
    const row = page.locator(".basalt-menu-item").first();
    const hint = row.locator(".basalt-text");
    const color = async (l) => rgba(page, (await style(l, "color")).color);
    assert.deepEqual(await color(hint), await token(page, "text-tertiary"));
    await light(page, page.locator(".basalt-menu"));
    assert.deepEqual(await color(hint), await token(page, "text-secondary"));
    await page.close();
  });

  test("Select and Combobox: a chosen value is a check in primary ink; the lit row lifts", async () => {
    for (const [fixture, popup] of [[`<B.Select aria-label="Region" defaultOpen defaultValue="a" options={[{value:"a",label:"Alpha"},{value:"b",label:"Beta"}]} />`, ".basalt-select-popup"], [`<B.Combobox aria-label="Zone" defaultOpen defaultValue="x" options={[{value:"x",label:"X-ray"},{value:"y",label:"Yankee"}]} />`, ".basalt-combobox-popup"]]) {
      const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
      await settle(page);
      const check = page.locator(`${popup} .basalt-select-check`);
      assert.equal(await check.count(), 1, popup);
      assert.deepEqual(await rgba(page, (await style(check, "color")).color), await token(page, "text-primary"));
      assert.ok(await check.evaluate((el) => el.getBoundingClientRect().right <= el.closest(".basalt-menu-item").querySelector(".basalt-menu-item-label").getBoundingClientRect().left), `${popup}: the check is at the row's start, as drawn`);
      const labels = page.locator(`${popup} .basalt-menu-item-label`);
      assert.deepEqual(await rgba(page, (await style(labels.nth(1), "color")).color), await token(page, "text-secondary"), "a rest label is secondary");
      await light(page, page.locator(popup), 1);
      assert.deepEqual(await rgba(page, (await style(labels.nth(1), "color")).color), await token(page, "text-primary"), "the lit label is primary");
      await page.close();
    }
  });

  test("CommandMenu: rest rows are secondary, the selected row and its glyph go primary, danger keeps its colour, group labels are tertiary 12/16 at 500", async () => {
    const { page } = await fixturePage(browser, commands, { theme: "dark" });
    await page.getByRole("combobox").waitFor();
    await settle(page);
    const rows = page.locator("[cmdk-item]");
    const ink = async (l) => rgba(page, (await style(l, "color")).color);
    assert.deepEqual(await ink(rows.nth(0)), await token(page, "text-primary"), "the first row is selected");
    assert.deepEqual(await ink(rows.nth(1)), await token(page, "text-secondary"), "a rest row is secondary (it used to be primary)");
    assert.deepEqual(await ink(rows.nth(2)), await token(page, "status-danger"));
    await rows.nth(2).hover();
    assert.deepEqual(await ink(rows.nth(2)), await token(page, "status-danger"), "danger on the plate");
    const heading = await style(page.locator("[cmdk-group-heading]"), "color", "fontSize", "lineHeight", "fontWeight");
    assert.deepEqual([heading.fontSize, heading.lineHeight, heading.fontWeight], ["12px", "16px", "500"]);
    assert.deepEqual(await rgba(page, heading.color), await token(page, "text-tertiary"));
    await page.keyboard.press("Escape");
    await page.close();
  });

  test("a popup's group label is tertiary 12/16 at 500", async () => {
    const { page } = await fixturePage(browser, render(menu(`<B.MenuGroup><B.MenuGroupLabel>Group</B.MenuGroupLabel><B.MenuItem>One</B.MenuItem></B.MenuGroup>`)), { theme: "dark" });
    await settle(page);
    const label = await style(page.locator(".basalt-menu-group-label"), "color", "fontSize", "lineHeight", "fontWeight");
    assert.deepEqual([label.fontSize, label.lineHeight, label.fontWeight], ["12px", "16px", "500"]);
    assert.deepEqual(await rgba(page, label.color), await token(page, "text-tertiary"));
    await page.close();
  });
});

describe("geometry: a 36px plate in a 40px hit area, and the gap drawn inside the row", () => {
  const measure = (page, popup) => page.evaluate((popupSelector) => {
    const panel = document.querySelector(popupSelector);
    const rows = [...panel.querySelectorAll(".basalt-menu-item, [cmdk-item]")].slice(0, 3);
    const ps = getComputedStyle(panel);
    const rects = rows.map((row) => row.getBoundingClientRect());
    const plates = rows.map((row, i) => {
      const s = getComputedStyle(row, "::before");
      return { top: rects[i].top + parseFloat(s.top), height: parseFloat(s.height), left: rects[i].left, width: parseFloat(s.width), radius: s.borderTopLeftRadius };
    });
    const row = getComputedStyle(rows[0]);
    return {
      panelPadding: [ps.paddingTop, ps.paddingRight, ps.paddingBottom, ps.paddingLeft], panelRadius: ps.borderTopLeftRadius,
      rowHeights: rects.map((r) => r.height), touching: rects.slice(1).map((r, i) => r.top - rects[i].bottom),
      plateHeights: plates.map((p) => p.height), plateGaps: plates.slice(1).map((p, i) => p.top - (plates[i].top + plates[i].height)),
      plateFromRim: plates[0].top - panel.getBoundingClientRect().top - parseFloat(ps.borderTopWidth), plateLeft: plates[0].left - panel.getBoundingClientRect().left - parseFloat(ps.borderLeftWidth),
      plateRadius: plates[0].radius, plateWidth: plates[0].width, rowWidth: rects[0].width, font: [row.fontSize, row.lineHeight], textStart: rows[0].firstElementChild.getBoundingClientRect().left - panel.getBoundingClientRect().left - parseFloat(ps.borderLeftWidth),
    };
  }, popup);

  test("Menu: rows 40, plates 36, 4px between plates with the hit areas touching, panel padding 4 and 2, radius 12 over 8", async () => {
    const { page } = await fixturePage(browser, render(menu(`<B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem><B.MenuItem>Three</B.MenuItem>`)), { theme: "dark" });
    await settle(page);
    const m = await measure(page, ".basalt-menu");
    assert.deepEqual(m.rowHeights, [40, 40, 40]);
    assert.deepEqual(m.touching, [0, 0], "neighbouring hit areas touch");
    assert.deepEqual(m.plateHeights, [36, 36, 36]);
    assert.deepEqual(m.plateGaps, [4, 4], "the gap is between plates, and drawn inside the rows");
    assert.deepEqual(m.panelPadding, ["2px", "4px", "2px", "4px"]);
    assert.equal(m.panelRadius, "12px");
    assert.equal(m.plateRadius, "8px");
    assert.equal(m.plateFromRim, 4, "a plate is 4px from the rim above");
    assert.equal(m.plateLeft, 4, "and 4px from the rim at its side");
    assert.equal(m.plateWidth, m.rowWidth, "the plate spans the row");
    assert.equal(m.textStart, 16, "text starts 16px from the rim");
    assert.deepEqual(m.font, ["14px", "20px"]);
    await page.close();
  });

  test("Select and Combobox rows are the same: 40 and 36", async () => {
    for (const [fixture, popup] of [[select, ".basalt-select-popup"], [combobox, ".basalt-combobox-popup"]]) {
      const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
      await settle(page);
      const m = await measure(page, popup);
      assert.deepEqual([m.rowHeights[0], m.plateHeights[0], m.plateRadius], [40, 36, "8px"], popup);
      await page.close();
    }
  });

  test("the command menu: rows 44, plates 40, the list padded 2 and 4", async () => {
    const { page } = await fixturePage(browser, commands, { theme: "dark" });
    await page.getByRole("combobox").waitFor();
    await settle(page);
    const m = await measure(page, ".basalt-command-list");
    assert.deepEqual(m.rowHeights, [44, 44, 44]);
    assert.deepEqual(m.plateHeights, [40, 40, 40]);
    assert.deepEqual(m.plateGaps, [4, 4]);
    assert.deepEqual(m.panelPadding, ["2px", "4px", "2px", "4px"]);
    assert.deepEqual(m.font, ["14px", "20px"]);
    const gap = await page.evaluate(() => { const r = document.querySelector("[cmdk-item]"); return parseFloat(getComputedStyle(r).columnGap); });
    assert.equal(gap, 12, "12px between the glyph and the label in the command menu");
    await page.close();
  });

  test("compact density: plates 32 and 36, type 13/18; the hit areas are 36 and 40", async () => {
    const compact = (jsx) => `document.documentElement.dataset.density = "compact"; ${render(jsx)}`;
    let page = (await fixturePage(browser, compact(menu(`<B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem>`)), { theme: "dark" })).page;
    await settle(page);
    let m = await measure(page, ".basalt-menu");
    assert.deepEqual([m.rowHeights[0], m.plateHeights[0], ...m.font], [36, 32, "13px", "18px"]);
    await page.close();
    page = (await fixturePage(browser, `document.documentElement.dataset.density = "compact"; ${commands}`, { theme: "dark" })).page;
    await page.getByRole("combobox").waitFor();
    await settle(page);
    m = await measure(page, ".basalt-command-list");
    assert.deepEqual([m.rowHeights[0], m.plateHeights[0]], [40, 36]);
    await page.close();
  });

  test("a pointer crossing the gap never leaves a row: every y between two plates is inside a row, and exactly one stays lit", async () => {
    const { page } = await fixturePage(browser, render(menu(`<B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem><B.MenuItem>Three</B.MenuItem>`)), { theme: "dark" });
    await settle(page);
    const rows = page.locator(".basalt-menu-item");
    const first = await rows.nth(0).boundingBox();
    const second = await rows.nth(1).boundingBox();
    await page.mouse.move(first.x + 20, first.y + first.height / 2);
    await page.waitForSelector("[data-highlighted]");
    const x = first.x + 20;
    for (let y = first.y + first.height / 2; y <= second.y + second.height / 2; y += 1) {
      await page.mouse.move(x, y);
      assert.equal(await page.locator("[data-highlighted]").count(), 1, `the plate blinked off with the pointer at y=${y}`);
    }
    assert.equal(await rows.nth(1).getAttribute("data-highlighted"), "", "ends on the second row");
    await page.close();
  });
});

describe("touch: a hit area is at least 44px, and a combobox's text entry stays 16px", () => {
  const touch = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

  test("Menu, Select, Combobox and CommandMenu rows are at least 44 tall, in default and compact density", async () => {
    for (const density of ["default", "compact"]) {
      const set = `document.documentElement.dataset.density = "${density}";`;
      for (const [name, body, rows] of [
        ["Menu", `${set} ${render(menu(`<B.MenuItem>One</B.MenuItem><B.MenuItem>Two</B.MenuItem>`))}`, ".basalt-menu .basalt-menu-item"],
        ["Select", `${set} ${render(select)}`, ".basalt-select-popup .basalt-menu-item"],
        ["Combobox", `${set} ${render(combobox)}`, ".basalt-combobox-popup .basalt-menu-item"],
        ["CommandMenu", `${set} ${commands}`, "[cmdk-item]"],
      ]) {
        const { page } = await fixturePage(browser, body, { theme: "dark", ...touch });
        await page.locator(rows).first().waitFor();
        await settle(page);
        assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
        const heights = await page.locator(rows).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
        assert.ok(heights.length > 0 && heights.every((h) => h >= 44), `${name} (${density}) rows: ${heights}`);
        await page.close();
      }
    }
  });

  test("the combobox's text entry and the command menu's input are 16px on touch", async () => {
    let { page } = await fixturePage(browser, render(combobox), { theme: "dark", ...touch });
    await page.getByRole("combobox", { name: "Zone" }).waitFor();
    assert.equal((await style(page.getByRole("combobox", { name: "Zone" }), "fontSize")).fontSize, "16px");
    await page.close();
    ({ page } = await fixturePage(browser, commands, { theme: "dark", ...touch }));
    await page.getByRole("combobox").waitFor();
    assert.equal((await style(page.locator(".basalt-command-input"), "fontSize")).fontSize, "16px");
    await page.close();
  });
});

describe("no vertical bar, anywhere", () => {
  test("no indicator token is used outside the horizontal tab underline", () => {
    const css = fs.readFileSync(path.join(pkg, "dist", "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    // the token's own definition (:root) is not a use of it
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*size-indicator[^{}]*)\}/g)].map((m) => m[1].trim().replace(/\s+/g, " ")).filter((selector) => selector !== ":root");
    assert.deepEqual(rules, [".basalt-tabs-indicator"], `the indicator token draws something other than the horizontal underline: ${rules}`);
    assert.ok(!/inset\s+var\(--basalt-size-indicator\)\s+0/.test(css), "an inset side bar is back");
    assert.ok(!/border-inline-start:[^;]*size-indicator/.test(css), "a border-inline-start bar is back");
  });

  test("with every row component open, no pseudo-element is a 2px bar, and the lit row has no outline", async () => {
    const fixture = `<>
      ${menu(`<B.MenuItem>One</B.MenuItem><B.MenuCheckboxItem defaultChecked>Two</B.MenuCheckboxItem>`)}${select}${combobox}
      <B.TableContainer><B.Table><B.TableBody><B.TableRow selected><B.TableCell>Selected row</B.TableCell></B.TableRow></B.TableBody></B.Table></B.TableContainer>
      <B.Tabs orientation="vertical" defaultValue="a"><B.TabsList aria-label="S"><B.Tab value="a">A</B.Tab><B.Tab value="b">B</B.Tab></B.TabsList><B.TabsPanel value="a">A</B.TabsPanel></B.Tabs>
      <B.SegmentedControl aria-label="Range" defaultValue="a"><B.Segment value="a">A</B.Segment><B.Segment value="b">B</B.Segment></B.SegmentedControl>
    </>`;
    for (const theme of ["dark", "light"]) {
      const { page } = await fixturePage(browser, render(fixture), { theme });
      await settle(page);
      await light(page, page.locator(".basalt-menu"));
      const found = await page.evaluate(() => {
        const bars = [];
        for (const el of document.querySelectorAll("*")) {
          for (const which of ["::before", "::after"]) {
            const s = getComputedStyle(el, which);
            if (s.content === "none" || s.content === "normal") continue;
            const w = parseFloat(s.width), h = parseFloat(s.height);
            if ((w <= 2 && h > w) || (h <= 2 && w > h && el.closest(".basalt-menu, .basalt-table, .basalt-tabs-list[data-orientation=vertical]"))) bars.push(`${el.className}${which} ${w}x${h}`);
          }
        }
        const lit = document.querySelector("[data-highlighted]");
        return { bars, outline: getComputedStyle(lit).outlineStyle, selectedCell: getComputedStyle(document.querySelector("tr[data-selected] td")).boxShadow };
      });
      assert.deepEqual(found.bars, [], `a bar-shaped pseudo-element (${theme})`);
      assert.equal(found.outline, "none");
      assert.doesNotMatch(found.selectedCell, /\b2px 0px 0px 0px inset/);
      await page.close();
    }
  });
});

describe("forced colours: the lit row is Highlight with HighlightText, never a black box", () => {
  /** Chromium's forced-colours emulation paints Highlight translucent, so a pixel is compared with its neighbour on the same plate. */
  async function pixels(page, rect) {
    const png = (await page.screenshot({ clip: rect, type: "png" })).toString("base64");
    return page.evaluate(async (png) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, img.width, img.height);
      const at = (x, y) => [...data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 3)];
      return { w: img.width, h: img.height, all: Array.from({ length: img.width * img.height }, (_, i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]), corners: [at(1, 1), at(img.width - 2, 1), at(1, img.height - 2), at(img.width - 2, img.height - 2)] };
    }, png);
  }
  const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const near = (a, b, tolerance = 6) => a.every((c, i) => Math.abs(c - b[i]) <= tolerance);

  /** The lit row's label region, sampled from a screenshot: its corners match the plate beside it, and the text is lighter than the plate. */
  async function assertLabelOnPlate(page, row, name) {
    const label = row.locator(".basalt-menu-item-label").first();
    const rowBox = await row.boundingBox();
    const box = await label.boundingBox();
    const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
    const sampled = await pixels(page, clip);
    const beside = (await pixels(page, { x: Math.floor(rowBox.x) + 3, y: Math.floor(box.y + box.height / 2), width: 3, height: 3 })).all[4];
    for (const corner of sampled.corners) assert.ok(near(corner, beside), `${name}: a corner of the label box is ${corner}, the plate beside it is ${beside}: the label draws its own box`);
    const text = sampled.all.filter((p) => luma(p) > luma(beside) + 90);
    assert.ok(text.length > 8, `${name}: no HighlightText pixels in the label (${text.length}): it renders as a box, not text`);
    const dominant = sampled.all.filter((p) => near(p, beside)).length / sampled.all.length;
    assert.ok(dominant > 0.5, `${name}: the label box is not mostly plate (${dominant.toFixed(2)})`);
  }

  const forced = async (page) => { await page.emulateMedia({ forcedColors: "active" }); await settle(page); };
  const systemColors = (page) => page.evaluate(() => {
    const probe = document.createElement("div"); document.body.append(probe);
    const read = (v) => { probe.style.backgroundColor = v; probe.style.color = v; return getComputedStyle(probe).backgroundColor; };
    const out = Object.fromEntries(["Highlight", "HighlightText", "Canvas", "CanvasText"].map((k) => [k, read(k)])); probe.remove(); return out;
  });

  test("Menu: the plate is Highlight, every part is HighlightText, the panel is Canvas with a CanvasText border, and the label is on the plate", async () => {
    const { page } = await fixturePage(browser, render(menu(`<B.MenuItem shortcut="⌘D" icon={PlusIcon}>Duplicate</B.MenuItem><B.MenuItem danger shortcut="⌫">Delete</B.MenuItem>`)), { theme: "dark" });
    await forced(page);
    const c = await systemColors(page);
    await light(page, page.locator(".basalt-menu"), 0);
    const row = page.locator(".basalt-menu-item[data-highlighted]");
    assert.deepEqual(await style(row, "forcedColorAdjust", "color"), { forcedColorAdjust: "none", color: c.HighlightText });
    assert.equal((await pseudo(row, "::before", "backgroundColor", "backgroundImage")).backgroundColor, c.Highlight);
    assert.equal((await pseudo(row, "::before", "backgroundColor", "backgroundImage")).backgroundImage, "none");
    assert.equal((await style(row.locator(".basalt-menu-item-label"), "color")).color, c.HighlightText);
    const chip = await style(row.locator(".basalt-kbd-key").first(), "color", "borderTopColor", "backgroundColor");
    assert.deepEqual([chip.color, chip.borderTopColor, chip.backgroundColor], [c.HighlightText, c.HighlightText, c.Highlight]);
    const panel = await style(page.locator(".basalt-menu"), "borderTopColor", "borderTopWidth", "backgroundColor");
    assert.deepEqual(panel, { borderTopColor: c.CanvasText, borderTopWidth: "1px", backgroundColor: c.Canvas });
    await assertLabelOnPlate(page, row, "Menu");
    // a lit danger row takes the same pairing
    await light(page, page.locator(".basalt-menu"), 1);
    const danger = page.locator(".basalt-menu-item[data-highlighted]");
    assert.equal((await style(danger, "color")).color, c.HighlightText, "the danger override");
    await assertLabelOnPlate(page, danger, "Menu (danger)");
    await page.close();
  });

  test("Select and Combobox", async () => {
    for (const [name, fixture, popup] of [["Select", select, ".basalt-select-popup"], ["Combobox", combobox, ".basalt-combobox-popup"]]) {
      const { page } = await fixturePage(browser, render(fixture), { theme: "dark" });
      await forced(page);
      const c = await systemColors(page);
      await light(page, page.locator(popup), 1);
      const row = page.locator(`${popup} [data-highlighted]`);
      assert.deepEqual(await style(row, "forcedColorAdjust", "color"), { forcedColorAdjust: "none", color: c.HighlightText }, name);
      assert.equal((await pseudo(row, "::before", "backgroundColor")).backgroundColor, c.Highlight, name);
      await assertLabelOnPlate(page, row, name);
      await page.close();
    }
  });

  test("CommandMenu", async () => {
    const { page } = await fixturePage(browser, commands, { theme: "dark" });
    await page.getByRole("combobox").waitFor();
    await forced(page);
    const c = await systemColors(page);
    const row = page.locator("[cmdk-item][data-selected='true']");
    assert.deepEqual(await style(row, "forcedColorAdjust", "color"), { forcedColorAdjust: "none", color: c.HighlightText });
    assert.equal((await pseudo(row, "::before", "backgroundColor")).backgroundColor, c.Highlight);
    const kbd = await style(row.locator(".basalt-kbd-key").first(), "color", "borderTopColor", "backgroundColor");
    assert.deepEqual([kbd.color, kbd.borderTopColor, kbd.backgroundColor], [c.HighlightText, c.HighlightText, c.Highlight]);
    assert.deepEqual(await style(page.locator(".basalt-command"), "borderTopColor", "backgroundColor"), { borderTopColor: c.CanvasText, backgroundColor: c.Canvas });
    await assertLabelOnPlate(page, row, "CommandMenu");
    // moving the selection moves the plate: the old row is no longer Highlight
    await page.keyboard.press("ArrowDown");
    await settle(page);
    assert.notEqual((await pseudo(page.locator("[cmdk-item]").first(), "::before", "backgroundColor")).backgroundColor, c.Highlight);
    await assertLabelOnPlate(page, page.locator("[cmdk-item][data-selected='true']"), "CommandMenu (second row)");
    await page.close();
  });
});

describe("a tab with an icon", () => {
  for (const orientation of ["horizontal", "vertical"]) {
    test(`${orientation}: the icon is centred on the label's line, 6px before it, the way a button sets it`, async () => {
      const jsx = `<B.Tabs orientation="${orientation}" defaultValue="a"><B.TabsList aria-label="S"><B.Tab value="a">Overview</B.Tab><B.Tab value="b"><PlusIcon size={16} aria-hidden id="tab-icon" /> Settings</B.Tab></B.TabsList><B.TabsPanel value="a">A</B.TabsPanel></B.Tabs>`;
      const { page } = await fixturePage(browser, render(jsx), { theme: "dark" });
      const out = await page.evaluate(() => {
        const icon = document.getElementById("tab-icon");
        const tab = icon.closest(".basalt-tab");
        const range = document.createRange();
        const text = [...tab.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        range.selectNodeContents(text);
        const t = [...range.getClientRects()].find((r) => r.width > 0);
        const i = icon.getBoundingClientRect();
        return { iconMid: i.top + i.height / 2, textMid: t.top + t.height / 2, gap: t.left - i.right };
      });
      assert.ok(Math.abs(out.iconMid - out.textMid) <= 0.5, `the icon's centre is ${(out.iconMid - out.textMid).toFixed(2)}px off the label's`);
      assert.ok(Math.abs(out.gap - 6) <= 0.5, `the gap between icon and label is ${out.gap.toFixed(2)}px`);
      await page.close();
    });
  }
});
