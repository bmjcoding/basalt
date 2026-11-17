// The eleventh parity PR (step 9 of batch 7, DECISIONS 90 and 108: the rest of the overlays, the combobox and the sparkline), in a browser. parity.test.mjs compares each part's
// computed styles with React's (the REST cases: the closed field, a chosen value, the open popup with its rows, the check, the two-line row, the lit row and the shared plate, the
// empty sentence, touch, and the sparkline with data, one sample, empty and loading). This file pins behaviour: the combobox's roles and what the script writes, its keys, filtering
// (label, description, case and accents), the chosen label showing every row, Esc's two steps, the value written back (the hidden input, the event, Basalt.combobox), focus staying in
// the input, the pointer, the shared plate on the shared animation clock, then the placeholder in forced colours (E1), reduced motion, forced colours, touch and axe; and the
// sparkline's name and words, its empty and loading states, a bad JSON body, a redraw, then the hold on every loop, reduced motion, forced colours and axe. The data is synthetic.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose, detect } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), AXE);
};

const OPTIONS = `<li data-value="eu" data-description="eu-central, lowest latency">Frankfurt</li><li data-value="us">Ashburn</li><li data-value="ap">Singapore</li><li data-value="gone" aria-disabled="true">Sydney</li><li data-value="sp" data-description="São Paulo region">Café</li>`;
const FIELD = ({ options = OPTIONS, attrs = "", chosen = "", empty = "" } = {}) => `<div style="padding: 16px; width: 352px"><form id="f"><div class="field"><label for="region">Region</label><div class="combobox"${empty}><input class="input" id="region" name="region" placeholder="Search regions…"${attrs}><ul>${chosen ? options.replace(`data-value="${chosen}"`, `data-value="${chosen}" aria-selected="true"`) : options}</ul></div></div></form><button class="btn" id="after">after</button><div style="height: 600px"></div></div>`;
const html = (body) => compose(`<title>Combobox</title>${body}`, { fonts: false }).html;
async function open({ scheme = "dark", width = 1440, touch = false, reducedMotion = "no-preference", forced = false, body = FIELD() } = {}) {
  const opened = await openHtml(browser, html(body), { scheme, width, touch, reducedMotion });
  if (forced) await opened.page.emulateMedia({ forcedColors: "active" });
  await settle(opened.page);
  return opened;
}
const INPUT = "#region";
const POPUP = ".combobox-popup";
const ROW = ".combobox-option";
/** What a person sees and a screen reader gets: the field, the lit row, the shown rows and the value a form would submit. */
const state = (page) => page.evaluate(() => {
  const input = document.querySelector("#region");
  const popup = document.querySelector(".combobox-popup");
  const rows = [...document.querySelectorAll(".combobox-option")].filter((r) => !r.hidden);
  const lit = document.querySelector(".combobox-option[data-highlighted]");
  return {
    text: input.value,
    open: popup.matches(":popover-open"),
    expanded: input.getAttribute("aria-expanded"),
    active: input.getAttribute("aria-activedescendant") ? document.getElementById(input.getAttribute("aria-activedescendant"))?.querySelector(".combobox-option-label").textContent : null,
    lit: lit ? lit.querySelector(".combobox-option-label").textContent : null,
    rows: rows.map((r) => r.querySelector(".combobox-option-label").textContent),
    checked: rows.filter((r) => r.getAttribute("aria-selected") === "true").map((r) => r.querySelector(".combobox-option-label").textContent),
    message: document.querySelector(".combobox-empty").textContent,
    value: new FormData(document.getElementById("f")).get("region"),
    focus: document.activeElement.id || document.activeElement.tagName,
  };
});
const press = async (page, ...keys) => { for (const key of keys) await page.keyboard.press(key); };
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (locator, ...props) => locator.evaluate((el, names) => { const s = getComputedStyle(el); return Object.fromEntries(names.map((n) => [n, s[n]])); }, props);
const ms = (value) => (value.trim().endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000);

describe("combobox: what the script writes", () => {
  test("a .combobox brings the combobox, forms, popover and glide modules, and not the menu", () => {
    const { modules } = detect(FIELD(), JSON.parse(fs.readFileSync(new URL("../../../.agent/skills/basalt-html/parts/manifest.json", import.meta.url), "utf8")), [], {});
    for (const need of ["combobox", "forms", "popover", "glide"]) assert.ok(modules.includes(need), `${need} comes with a combobox`);
    for (const never of ["menu", "rows", "select"]) assert.ok(!modules.includes(never), `${never} does not`);
  });

  for (const theme of THEMES) {
    test(`the input is a combobox on a listbox of options, the name moves to a hidden input, and the list is the popup (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, body: FIELD({ chosen: "us" }) });
      const wired = await page.evaluate(() => {
        const input = document.querySelector("#region");
        const root = document.querySelector(".combobox");
        const attr = (el, n) => el.getAttribute(n);
        return {
          input: ["role", "aria-autocomplete", "aria-haspopup", "aria-expanded", "autocomplete", "spellcheck", "name", "aria-controls", "aria-activedescendant"].map((n) => [n, attr(input, n)]),
          hidden: [...root.querySelectorAll('input[type="hidden"]')].map((h) => [h.name, h.value]),
          list: root.querySelector("ul, ol, li") === null,
          group: attr(root, "role"),
          trigger: (({ tagName, type, tabIndex, ariaLabel, expanded, haspopup, ofVariant, iconOnly }) => ({ tagName, type, tabIndex, ariaLabel, expanded, haspopup, ofVariant, iconOnly }))({ tagName: root.querySelector(".combobox-trigger").tagName, type: root.querySelector(".combobox-trigger").type, tabIndex: root.querySelector(".combobox-trigger").tabIndex, ariaLabel: attr(root.querySelector(".combobox-trigger"), "aria-label"), expanded: attr(root.querySelector(".combobox-trigger"), "aria-expanded"), haspopup: attr(root.querySelector(".combobox-trigger"), "aria-haspopup"), ofVariant: attr(root.querySelector(".combobox-trigger"), "data-variant"), iconOnly: root.querySelector(".combobox-trigger").hasAttribute("data-icon-only") }),
          popup: ["popover", "role"].map((n) => attr(root.querySelector(".combobox-popup"), n)),
          listbox: root.querySelector("[role=listbox]") && [attr(root.querySelector("[role=listbox]"), "aria-label"), root.querySelector("[role=listbox]").children.length],
          options: [...root.querySelectorAll("[role=option]")].map((o) => [o.querySelector(".combobox-option-label").textContent, attr(o, "aria-selected"), attr(o, "aria-disabled"), o.hasAttribute("data-described"), o.querySelector(".combobox-option-description")?.textContent ?? null, o.querySelector(".combobox-check svg") ? "check" : "seat"]),
          status: ["role", "aria-live", "aria-atomic"].map((n) => attr(root.querySelector(".combobox-empty"), n)),
          uls: document.querySelectorAll("ul").length,
        };
      });
      assert.deepEqual(wired.input, [["role", "combobox"], ["aria-autocomplete", "list"], ["aria-haspopup", "listbox"], ["aria-expanded", "false"], ["autocomplete", "off"], ["spellcheck", "false"], ["name", null], ["aria-controls", null], ["aria-activedescendant", null]]);
      assert.deepEqual(wired.hidden, [["region", "us"]], "the name and the chosen value are on a hidden input");
      assert.equal(wired.list, true, "the author's list is gone");
      assert.equal(wired.group, "group");
      assert.deepEqual(wired.trigger, { tagName: "BUTTON", type: "button", tabIndex: -1, ariaLabel: "Show options", expanded: "false", haspopup: "listbox", ofVariant: "ghost", iconOnly: true });
      assert.deepEqual(wired.popup, ["manual", "presentation"]);
      assert.deepEqual(wired.listbox, ["Region", 5], "the listbox is named by the field's label");
      assert.deepEqual(wired.options, [["Frankfurt", "false", null, true, "eu-central, lowest latency", "seat"], ["Ashburn", "true", null, false, null, "check"], ["Singapore", "false", null, false, null, "seat"], ["Sydney", "false", "true", false, null, "seat"], ["Café", "false", null, true, "São Paulo region", "seat"]]);
      assert.deepEqual(wired.status, ["status", "polite", "true"]);
      assert.equal((await state(page)).text, "Ashburn", "the chosen label is in the field");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("a field with no name has no hidden input, a disabled one is off, and data-empty is the sentence", async () => {
    const body = FIELD({ empty: ' data-empty="No regions match."' }).replace(' name="region"', "");
    const { page, context } = await open({ body });
    assert.equal(await page.locator('.combobox input[type="hidden"]').count(), 0);
    await page.focus(INPUT);
    await page.keyboard.type("zzz");
    assert.equal((await state(page)).message, "No regions match.");
    await context.close();
    const off = await open({ body: FIELD({ attrs: " disabled" }) });
    assert.equal(await off.page.locator(".combobox-trigger").isDisabled(), true);
    await off.page.locator(".combobox-trigger").click({ force: true });
    assert.equal((await state(off.page)).open, false);
    await off.context.close();
  });
});

describe("combobox: keys, typing and the value", () => {
  for (const theme of THEMES) {
    test(`down opens on the first row, down and up go through none at each end, enter chooses, and the value is written back (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      const events = await page.evaluate(() => { window.changes = []; document.querySelector(".combobox").addEventListener("comboboxchange", (e) => window.changes.push(e.detail)); });
      void events;
      await page.focus(INPUT);
      assert.equal((await state(page)).open, false, "focus alone opens nothing");
      await press(page, "ArrowDown");
      let now = await state(page);
      assert.deepEqual([now.open, now.expanded, now.lit, now.active, now.text, now.focus], [true, "true", "Frankfurt", "Frankfurt", "", "region"], "down opens on the first row, and focus stays in the field");
      assert.equal(await page.locator(INPUT).getAttribute("aria-controls"), await page.locator("[role=listbox]").getAttribute("id"));
      await press(page, "ArrowDown", "ArrowDown");
      assert.equal((await state(page)).lit, "Singapore");
      await press(page, "ArrowDown");
      assert.equal((await state(page)).lit, "Sydney", "a disabled row can be lit, as React's");
      await press(page, "ArrowDown");
      assert.equal((await state(page)).lit, "Café");
      await press(page, "ArrowDown");
      assert.deepEqual([(await state(page)).lit, (await state(page)).active], [null, null], "down from the last row lights none");
      await press(page, "ArrowDown");
      assert.equal((await state(page)).lit, "Frankfurt", "and down from none lights the first");
      await press(page, "ArrowUp");
      assert.equal((await state(page)).lit, null, "up from the first lights none");
      await press(page, "ArrowUp");
      assert.equal((await state(page)).lit, "Café", "and up from none lights the last");
      await press(page, "ArrowUp", "ArrowUp");
      assert.equal((await state(page)).lit, "Singapore");
      await press(page, "Enter", "ArrowDown");
      now = await state(page);
      assert.deepEqual([now.text, now.value, now.open, now.checked, now.lit], ["Singapore", "ap", true, ["Singapore"], "Singapore"], "enter chose Singapore and closed; down opens on the chosen row, with every row shown");
      assert.deepEqual(now.rows.length, 5);
      assert.deepEqual(await page.evaluate(() => window.changes), [{ value: "ap", label: "Singapore" }], "one event, with the value and the label");
      await press(page, "Escape");
      assert.equal((await state(page)).open, false);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("up opens on the last row that can be chosen, and enter on a lit disabled row, or on none, does what React's does", async () => {
    const { page, context } = await open();
    await page.focus(INPUT);
    await press(page, "ArrowUp");
    assert.equal((await state(page)).lit, "Café");
    await press(page, "Escape");
    await press(page, "ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown");
    assert.equal((await state(page)).lit, "Sydney");
    await press(page, "Enter");
    let now = await state(page);
    assert.deepEqual([now.open, now.value, now.text], [true, "", ""], "enter on a disabled row chooses nothing and leaves the list open");
    await press(page, "ArrowDown", "ArrowDown");
    assert.equal((await state(page)).lit, null);
    await page.keyboard.type("sing");
    await press(page, "Enter");
    now = await state(page);
    assert.deepEqual([now.open, now.value, now.text], [false, "", ""], "enter with none lit closes the list and puts back the (empty) chosen label");
    await context.close();
  });

  test("typing opens the list and filters it by label (case and accents ignored) and by description, with none lit", async () => {
    const { page, context } = await open();
    await page.focus(INPUT);
    await page.keyboard.type("A");
    let now = await state(page);
    assert.deepEqual([now.open, now.lit, now.focus], [true, null, "region"], "typing opens the list with no row lit");
    assert.deepEqual(now.rows, ["Frankfurt", "Ashburn", "Singapore", "Café"], "a letter in the label, or in a description");
    await page.keyboard.type("sh");
    assert.deepEqual((await state(page)).rows, ["Ashburn"]);
    await page.locator(INPUT).fill("cafe");
    assert.deepEqual((await state(page)).rows, ["Café"], "accents are ignored");
    await page.locator(INPUT).fill("SAO");
    assert.deepEqual((await state(page)).rows, ["Café"], "and the second line is searched, ignoring case and accents");
    await page.locator(INPUT).fill("central");
    assert.deepEqual((await state(page)).rows, ["Frankfurt"]);
    await page.locator(INPUT).fill("zzz");
    now = await state(page);
    assert.deepEqual([now.rows, now.message, now.open], [[], "No options match.", true], "no match says so, in the status region, and the list stays up");
    await page.locator(INPUT).fill("");
    now = await state(page);
    assert.deepEqual([now.rows.length, now.message], [5, ""], "an emptied field shows every row");
    await context.close();
  });

  test("the text that is the chosen label shows every row, and typing on from it filters again; emptying the field clears the choice", async () => {
    const { page, context } = await open({ body: FIELD({ chosen: "us" }) });
    const events = await page.evaluate(() => { window.changes = []; document.querySelector(".combobox").addEventListener("comboboxchange", (e) => window.changes.push(e.detail)); });
    void events;
    await page.locator(INPUT).click();
    let now = await state(page);
    assert.deepEqual([now.open, now.rows.length, now.lit, now.text], [true, 5, "Ashburn", "Ashburn"], "a click opens it on the chosen row, with every row shown");
    await page.keyboard.type("x");
    now = await state(page);
    assert.deepEqual([now.rows, now.message, now.value], [[], "No options match.", "us"], "typing past the label filters, and the choice stays until the field is emptied");
    await page.locator(INPUT).fill("");
    now = await state(page);
    assert.deepEqual([now.value, now.checked, now.rows.length], ["", [], 5], "emptying the field clears the choice");
    assert.deepEqual(await page.evaluate(() => window.changes), [{ value: "", label: "" }]);
    await context.close();
  });

  test("esc closes and puts the chosen label back; esc again on the closed field clears the text and the choice", async () => {
    const { page, context } = await open({ body: FIELD({ chosen: "us" }) });
    const events = await page.evaluate(() => { window.changes = []; document.querySelector(".combobox").addEventListener("comboboxchange", (e) => window.changes.push(e.detail)); });
    void events;
    await page.focus(INPUT);
    await page.keyboard.type("x");
    assert.equal((await state(page)).open, true);
    await press(page, "Escape");
    let now = await state(page);
    assert.deepEqual([now.open, now.text, now.value], [false, "Ashburn", "us"], "the first Esc closes and puts the label back");
    await press(page, "Escape");
    now = await state(page);
    assert.deepEqual([now.open, now.text, now.value, now.checked, now.focus], [false, "", "", [], "region"], "the second clears the field and the choice, and focus stays");
    assert.deepEqual(await page.evaluate(() => window.changes), [{ value: "", label: "" }]);
    await press(page, "Escape");
    assert.equal((await state(page)).text, "", "and a third has nothing left to do");
    await context.close();
  });

  test("esc is swallowed when it acts, so a dialog around the field is not closed by it", async () => {
    const body = `<button class="btn" data-dialog-open="d">Open</button><dialog id="d" aria-labelledby="t"><h2 class="dialog-title" id="t">Pick</h2>${FIELD().replace("</form>", "</form>")}</dialog>`;
    const { page, context } = await open({ body });
    await page.locator("[data-dialog-open]").click();
    await page.focus(INPUT);
    await page.keyboard.type("a");
    await press(page, "Escape");
    assert.equal(await page.evaluate(() => document.getElementById("d").open), true, "the dialog stays: Esc only closed the list");
    await context.close();
  });

  test("the value is also read with Basalt.combobox, and set from script", async () => {
    const { page, context } = await open({ body: FIELD({ chosen: "eu" }) });
    assert.equal(await page.evaluate(() => Basalt.combobox(document.querySelector(".combobox")).value()), "eu");
    await page.evaluate(() => Basalt.combobox(document.querySelector(".combobox")).set("ap"));
    const now = await state(page);
    assert.deepEqual([now.text, now.value, now.checked], ["Singapore", "ap", ["Singapore"]]);
    await context.close();
  });
});

describe("combobox: focus, the pointer and the popup", () => {
  for (const theme of THEMES) {
    test(`a click opens, a row chooses and focus stays in the input, the caret toggles, a click away or Tab closes and puts the label back (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      await page.locator(INPUT).click();
      assert.equal((await state(page)).open, true, "a click on the field opens it");
      assert.equal((await state(page)).lit, null, "with no row lit when none is chosen");
      await page.locator(ROW).nth(1).hover();
      assert.equal((await state(page)).lit, "Ashburn", "the pointer lights the row under it");
      await page.mouse.move(700, 700);
      assert.equal((await state(page)).lit, null, "and leaving the row clears it");
      await page.locator(ROW).nth(2).click();
      let now = await state(page);
      assert.deepEqual([now.open, now.text, now.value, now.focus], [false, "Singapore", "ap", "region"], "a click on a row chooses it, closes the list, and focus stays in the field");
      await page.locator(".combobox-trigger").click();
      now = await state(page);
      assert.deepEqual([now.open, now.focus, now.lit], [true, "region", "Singapore"], "the caret opens it on the chosen row, focus in the field");
      assert.equal(await page.locator(".combobox-trigger").getAttribute("aria-expanded"), "true");
      await page.locator(".combobox-trigger").click();
      assert.deepEqual([(await state(page)).open, await page.locator(".combobox-trigger").getAttribute("aria-expanded")], [false, "false"], "and closes it again");
      await page.keyboard.type("zz");
      assert.equal((await state(page)).open, true);
      await page.mouse.click(700, 500);
      now = await state(page);
      assert.deepEqual([now.open, now.text, now.value], [false, "Singapore", "ap"], "a click away closes it and puts the chosen label back");
      await page.focus(INPUT);
      await page.keyboard.type("q");
      await press(page, "Tab");
      now = await state(page);
      assert.deepEqual([now.open, now.text, now.value, now.focus], [false, "Singapore", "ap", "after"], "Tab closes it, chooses nothing, and moves on (the caret is not a tab stop)");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("a click on a disabled row chooses nothing and the list stays open", async () => {
    const { page, context } = await open();
    await page.locator(".combobox-trigger").click();
    await page.locator(ROW).nth(3).click({ force: true });
    const now = await state(page);
    assert.deepEqual([now.open, now.value, now.focus], [true, "", "region"]);
    await context.close();
  });

  test("the popup sits 6px under the field, at least as wide, flips above when it has no room, and stays in the window at 390", async () => {
    const { page, context } = await open();
    await page.locator(".combobox-trigger").click();
    await settle(page);
    const field = await box(page.locator(".combobox"));
    const popup = await box(page.locator(POPUP));
    assert.equal(Math.round((popup.y - field.bottom) * 100) / 100, 6, "6px under the field");
    assert.ok(popup.w >= field.w - 0.01, `at least as wide as the field (${popup.w} of ${field.w})`);
    assert.ok(popup.x >= 0 && popup.right <= 1440);
    const described = await page.evaluate(() => getComputedStyle(document.querySelector(".combobox-popup")).width);
    assert.ok(Number.parseFloat(described) >= field.w, "a described row sizes the popup to its content");
    await page.keyboard.type("ashb");
    const small = await box(page.locator(POPUP));
    assert.ok(small.w >= field.w - 0.01 && small.w <= field.w + 0.5, `without a described row it is the field's width (${small.w})`);
    await context.close();
    const low = await open({ body: `<div style="height: 780px"></div>${FIELD()}` });
    await low.page.evaluate(() => document.querySelector(".combobox").scrollIntoView({ block: "end" }));
    await low.page.locator(INPUT).click();
    await settle(low.page);
    const flipped = await box(low.page.locator(POPUP));
    const lowField = await box(low.page.locator(".combobox"));
    assert.ok(flipped.bottom <= lowField.y, "with no room below it opens above");
    await low.context.close();
    const narrow = await open({ width: 390, touch: true });
    await narrow.page.locator(".combobox-trigger").tap();
    await settle(narrow.page);
    const phone = await box(narrow.page.locator(POPUP));
    assert.ok(phone.x >= 0 && phone.right <= 390, `inside the window at 390 (${phone.x} to ${phone.right})`);
    await narrow.context.close();
  });

  test("a long list scrolls inside the popup and the lit row is kept in view", async () => {
    const many = Array.from({ length: 40 }, (_, i) => `<li data-value="v${i}">Option ${i + 1}</li>`).join("");
    const { page, context } = await open({ body: FIELD({ options: many }) });
    await page.focus(INPUT);
    await press(page, "ArrowDown");
    for (let i = 0; i < 20; i++) await press(page, "ArrowDown");
    const lit = await box(page.locator("[data-highlighted]"));
    const popup = await box(page.locator(POPUP));
    assert.ok(lit.y >= popup.y && lit.bottom <= popup.bottom, "the lit row is inside the popup");
    assert.ok(await page.evaluate(() => document.querySelector(".combobox-popup").scrollTop > 0), "which scrolled");
    await context.close();
  });
});

describe("combobox: the shared plate", () => {
  for (const theme of THEMES) {
    test(`one plate glides between the rows over duration-base on ease-out, appears in place, and a key moves it at once (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await page.focus(INPUT);
      await press(page, "ArrowDown");
      await settle(page);
      assert.equal(await page.evaluate(() => document.querySelector(".combobox-popup").hasAttribute("data-glide")), true, "the popup is a glide host where hover is real");
      const plateOf = (n) => page.evaluate((i) => { const p = document.querySelector(".combobox-popup > .plate"); const row = document.querySelectorAll(".combobox-option")[i]; const s = getComputedStyle(row, "::before"); const pr = p.getBoundingClientRect(); const rr = row.getBoundingClientRect(); return { top: pr.top, rowTop: rr.top + Number.parseFloat(s.top), h: pr.height, rowH: Number.parseFloat(s.height), state: p.dataset.state }; }, n);
      let plate = await plateOf(0);
      assert.deepEqual([plate.state, plate.top, plate.h], ["on", plate.rowTop, plate.rowH], "the plate is on the lit row's plate");
      assert.equal(plate.h, 54, "the described row's plate is 54, in a 58px row");
      await press(page, "ArrowDown");
      await settle(page);
      assert.equal((await plateOf(1)).h, 36, "a key moved it to the one-line row's 36");
      const clock = await freezeAnimations(page);
      const target = await box(page.locator(ROW).nth(2));
      await page.mouse.move(target.x + 60, target.y + 20);
      assert.equal((await state(page)).lit, "Singapore");
      const base = ms(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-base")));
      const read = () => page.evaluate(() => { const p = document.querySelector(".combobox-popup > .plate"); const s = getComputedStyle(p); return { y: p.getBoundingClientRect().top, props: s.transitionProperty, duration: s.transitionDuration, easing: s.transitionTimingFunction }; });
      const start = await read();
      assert.equal(start.props, "transform, width, height");
      assert.equal(start.duration, `${base / 1000}s`);
      const end = (await plateOf(2)).rowTop;
      await clock.advance(base / 2);
      const mid = (await read()).y;
      assert.ok(mid > start.y && mid < end, `half way the plate is part-way down (${start.y} < ${mid} < ${end})`);
      await clock.advance(base);
      assert.equal((await read()).y, end, "and it arrives on the row");
      await clock.thaw();
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".combobox-option[data-highlighted]"), "::before").backgroundColor), "rgba(0, 0, 0, 0)", "the lit row's own plate steps aside while the shared one is live");
      await context.close();
    });
  }

  test("under reduced motion there is no shared plate, the lit row paints its own, and the popup only fades", async () => {
    const { page, context } = await open({ reducedMotion: "reduce" });
    await page.focus(INPUT);
    await press(page, "ArrowDown");
    await settle(page);
    const out = await page.evaluate(() => {
      const plate = getComputedStyle(document.querySelector(".combobox-popup > .plate")).display;
      const lit = document.querySelector(".combobox-option[data-highlighted]");
      return { plate, own: getComputedStyle(lit, "::before").backgroundColor, transform: getComputedStyle(document.querySelector(".combobox-popup")).transform, host: document.querySelector(".combobox-popup").hasAttribute("data-glide") };
    });
    assert.equal(out.plate, "none");
    assert.notEqual(out.own, "rgba(0, 0, 0, 0)", "the row's own plate is the fill");
    assert.equal(out.transform, "none", "opacity only");
    assert.equal(out.host, false);
    await context.close();
  });
});

describe("combobox: forced colours, touch and axe", () => {
  for (const theme of THEMES) {
    test(`the placeholder is the input's own GrayText, as React's is (E1), and a chosen value is not (${theme})`, async () => {
      const body = `<div style="padding: 16px; width: 352px"><input class="input" id="plain" aria-label="Name" placeholder="Name"><div class="combobox"><input class="input" id="region" aria-label="Region" placeholder="Search regions…"><ul><li data-value="eu">Frankfurt</li></ul></div><div class="combobox"><input class="input" id="chosen" aria-label="Chosen"><ul><li data-value="eu" aria-selected="true">Frankfurt</li></ul></div></div>`;
      const { page, context } = await open({ scheme: theme, forced: true, body });
      const read = (selector, pseudoElement) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s), p).color, [selector, pseudoElement]);
      const grayText = await page.evaluate(() => { const probe = document.createElement("div"); probe.style.color = "GrayText"; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; });
      assert.equal(await read("#region", "::placeholder"), await read("#plain", "::placeholder"), "the combobox's placeholder is Input's");
      assert.equal(await read("#region", "::placeholder"), grayText, "which is the browser's GrayText");
      assert.notEqual(await read("#chosen"), grayText, "a chosen value keeps its system foreground");
      await context.close();
    });

    test(`the lit row is a Highlight plate with HighlightText, a disabled row is GrayText, and the field has a real border (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, forced: true, body: FIELD({ chosen: "us" }) });
      await page.focus(INPUT);
      await press(page, "ArrowDown", "ArrowDown", "ArrowDown");
      assert.equal((await state(page)).lit, "Sydney");
      await press(page, "ArrowUp");
      await settle(page);
      const colour = (c) => page.evaluate((v) => { const p = document.createElement("div"); p.style.color = v; document.body.append(p); const r = getComputedStyle(p).color; p.remove(); return r; }, c);
      const lit = await page.evaluate(() => { const row = document.querySelector(".combobox-option[data-highlighted]"); return { ink: getComputedStyle(row).color, label: getComputedStyle(row.querySelector(".combobox-option-label")).color, plate: getComputedStyle(row, "::before").backgroundColor, adjust: getComputedStyle(row).forcedColorAdjust }; });
      assert.deepEqual([lit.ink, lit.label, lit.plate, lit.adjust], [await colour("HighlightText"), await colour("HighlightText"), await colour("Highlight"), "none"]);
      const disabled = await css(page.locator(ROW).nth(3), "color");
      assert.equal(disabled.color, await colour("GrayText"));
      const border = await css(page.locator(INPUT), "borderTopWidth", "borderTopStyle", "boxShadow");
      assert.deepEqual([border.borderTopWidth, border.borderTopStyle], ["1px", "solid"]);
      await context.close();
    });

    test(`on touch the input is 16px, a row is at least 44px, and a described row 58 (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, width: 390, touch: true });
      assert.equal((await css(page.locator(INPUT), "fontSize")).fontSize, "16px");
      assert.ok((await box(page.locator(INPUT))).h >= 44);
      await page.locator(".combobox-trigger").tap();
      await settle(page);
      const rows = await page.evaluate(() => [...document.querySelectorAll(".combobox-option")].map((r) => [r.hasAttribute("data-described"), r.getBoundingClientRect().height]));
      assert.deepEqual(rows, [[true, 58], [false, 44], [false, 44], [false, 44], [true, 58]]);
      const trigger = await box(page.locator(".combobox-trigger"));
      assert.ok(trigger.w >= 44 && trigger.h >= 44, `the caret's target is ${trigger.w} by ${trigger.h}`);
      const pad = await css(page.locator(INPUT), "paddingRight");
      assert.equal(pad.paddingRight, "44px", "the field's end padding is the caret's 44 on touch, so text never runs under it");
      const room = await page.evaluate(() => document.querySelector("#region").getBoundingClientRect().right - document.querySelector(".combobox-trigger").getBoundingClientRect().left);
      assert.ok(Number.parseFloat(pad.paddingRight) >= room - 1, `text stops at or before the caret (padding ${pad.paddingRight}, caret ${room}px wide)`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "no sideways scroll at 390");
      await context.close();
    });

    test(`axe is clean closed, open, with no match, and in forced colours (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, body: FIELD({ chosen: "us" }) });
      assert.deepEqual(await axeViolations(page), [], "closed");
      await page.focus(INPUT);
      await press(page, "ArrowDown", "ArrowDown");
      await settle(page);
      assert.deepEqual(await axeViolations(page), [], "open with a row lit");
      await page.keyboard.type("zzz");
      await settle(page);
      assert.deepEqual(await axeViolations(page), [], "with no match");
      await context.close();
      const forced = await open({ scheme: theme, forced: true, body: FIELD({ chosen: "us" }) });
      await forced.page.focus(INPUT);
      await press(forced.page, "ArrowDown", "ArrowDown");
      await settle(forced.page);
      assert.deepEqual(await axeViolations(forced.page), [], "forced colours");
      await forced.context.close();
    });
  }
});

// ---- The sparkline ----
const SPARK = (options, extra = "") => `<div style="padding: 16px; width: 272px"><div class="sparkline"${extra}><script type="application/json" data-sparkline>${JSON.stringify(options)}</script></div></div>`;
const words = (page) => page.evaluate(() => ({
  label: document.querySelector(".sparkline-label")?.textContent ?? null,
  value: document.querySelector(".sparkline-value > .sparkline-text")?.textContent ?? null,
  seen: [...document.querySelectorAll(".sparkline-value [aria-hidden] > span")].map((s) => s.textContent).join(""),
  name: document.querySelector(".sparkline svg")?.getAttribute("aria-label") ?? null,
  role: document.querySelector(".sparkline svg")?.getAttribute("role") ?? null,
  axis: [...document.querySelectorAll(".sparkline-axis > span")].map((s) => s.textContent),
  empty: document.querySelector(".sparkline-empty")?.textContent ?? null,
  points: document.querySelector(".sparkline-line")?.getAttribute("points") ?? null,
  loading: document.querySelector(".sparkline").hasAttribute("data-loading"),
  quiet: document.querySelector(".sparkline").hasAttribute("data-empty"),
  script: document.querySelector(".sparkline script") !== null,
}));

describe("sparkline: its name, its words and its states", () => {
  for (const theme of THEMES) {
    test(`it draws the label, the latest value, the line and an axis from 0 to the peak, and the image is named "label, latest" (${theme})`, async () => {
      const { page, context, errors } = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Requests", data: [12, 18, 9, 30, 24] })}`, { fonts: false }).html, { scheme: theme });
      const w = await words(page);
      assert.deepEqual([w.label, w.value, w.seen, w.name, w.role, w.axis, w.script], ["Requests", "24", "24", "Requests, 24", "img", ["0", "30"], false]);
      // the same line React draws: x in 0 to 100, y = 34 - value / peak * 32, two decimals
      const expected = [12, 18, 9, 30, 24].map((v, i) => `${(i * 25).toFixed(2)},${(34 - (v / 30) * 32).toFixed(2)}`).join(" ");
      assert.equal(w.points, expected);
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("a decimal keeps its decimals and groups its thousands, the axis is whole numbers, one sample sits in the middle, and a peak under 1 scales as 1", async () => {
    const one = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Load", data: [1234.5] })}`, { fonts: false }).html);
    let w = await words(one.page);
    assert.deepEqual([w.value, w.axis, w.points, w.name], ["1,234.5", ["0", "1,235"], "50.00,2.00", "Load, 1234.5"]);
    await one.context.close();
    const small = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Ratio", data: [0.25, 0.5] })}`, { fonts: false }).html);
    w = await words(small.page);
    assert.deepEqual([w.value, w.axis, w.points], ["0.5", ["0", "1"], "0.00,26.00 100.00,18.00"]);
    await small.context.close();
  });

  test("nothing yet is the quiet sentence (the author's, else \"No data yet\"), and loading with nothing is a flat line with no value or axis", async () => {
    const quiet = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Requests", data: [] })}`, { fonts: false }).html);
    let w = await words(quiet.page);
    assert.deepEqual([w.empty, w.name, w.axis, w.value, w.quiet, w.loading], ["No data yet", null, [], null, true, false]);
    await quiet.context.close();
    const own = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Requests", data: [], empty: "Nothing recorded" })}`, { fonts: false }).html);
    assert.equal((await words(own.page)).empty, "Nothing recorded");
    await own.context.close();
    const waiting = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Requests", data: [], loading: true })}`, { fonts: false }).html);
    w = await words(waiting.page);
    assert.deepEqual([w.loading, w.points, w.name, w.axis, w.value, w.empty], [true, "0.00,34.00 100.00,34.00", "Requests, 0", [], null, null]);
    await waiting.context.close();
    const flat = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Requests", data: [12, 18, 9], loading: true })}`, { fonts: false }).html);
    w = await words(flat.page);
    assert.deepEqual([w.loading, w.points.split(" ").every((p) => p.endsWith(",34.00")), w.name, w.axis], [true, true, "Requests, 9", ["0", "18"]], "loading keeps the data's name and axis but draws the line flat");
    await flat.context.close();
  });

  test("the label is text, not markup; bad JSON warns and draws nothing; and Basalt.sparkline draws again with new options", async () => {
    const hostile = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: '<img src=x onerror="window.pwned=1"> & "q"', data: [1, 2] })}`, { fonts: false }).html);
    const w = await words(hostile.page);
    assert.equal(w.label, '<img src=x onerror="window.pwned=1"> & "q"');
    assert.equal(w.name, '<img src=x onerror="window.pwned=1"> & "q", 2');
    assert.equal(await hostile.page.evaluate(() => window.pwned), undefined);
    assert.equal(await hostile.page.locator(".sparkline img").count(), 0);
    await hostile.context.close();
    const bad = await openHtml(browser, compose(`<title>S</title><div class="sparkline"><script type="application/json" data-sparkline>{ nope }</script></div>`, { fonts: false }).html);
    assert.equal(bad.errors.length, 1);
    assert.match(bad.errors[0], /a sparkline's data is not valid JSON/);
    await bad.context.close();
    const again = await openHtml(browser, compose(`<title>S</title>${SPARK({ label: "Requests", data: [1, 2] })}`, { fonts: false }).html);
    await again.page.evaluate(() => Basalt.sparkline(document.querySelector(".sparkline"), { label: "Errors", data: [5, 3, 8] }));
    const next = await words(again.page);
    assert.deepEqual([next.label, next.value, next.axis, next.name], ["Errors", "8", ["0", "8"], "Errors, 8"]);
    assert.equal(await again.page.locator(".sparkline-head").count(), 1, "it replaced the drawing");
    await again.context.close();
  });
});

describe("sparkline: loops, reduced motion, forced colours and axe", () => {
  const loading = { label: "Requests", data: [12, 18, 9, 30, 24], loading: true };
  const animation = (page) => page.evaluate(() => { const s = getComputedStyle(document.querySelector(".sparkline-line")); return { name: s.animationName, duration: s.animationDuration, iterations: s.animationIterationCount, direction: s.animationDirection, easing: s.animationTimingFunction }; });

  test("the loading line breathes on the loop-fade duration, the hold stills it, and reduced motion fades it in once", async () => {
    const { page, context } = await openHtml(browser, compose(`<title>S</title><button class="btn" data-loops-toggle>Hold loops</button>${SPARK(loading)}`, { fonts: false }).html);
    const fade = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-loop-fade").trim());
    const running = await animation(page);
    assert.deepEqual([running.name, running.iterations, running.direction, running.duration], ["bh-breathe", "infinite", "alternate", `${ms(fade) / 1000}s`]);
    await page.locator("[data-loops-toggle]").click();
    assert.equal((await animation(page)).name, "none", "held: no loop");
    await page.locator("[data-loops-toggle]").click();
    assert.equal((await animation(page)).name, "bh-breathe", "and released");
    await context.close();
    const calm = await openHtml(browser, compose(`<title>S</title><button class="btn" data-loops-toggle>Hold loops</button>${SPARK(loading)}`, { fonts: false }).html, { reducedMotion: "reduce" });
    const once = await animation(calm.page);
    assert.deepEqual([once.name, once.iterations], ["bh-sparkline-in", "1"], "reduced motion fades it in once and does not loop");
    await calm.page.locator("[data-loops-toggle]").click();
    assert.equal((await animation(calm.page)).name, "none", "and the hold still wins");
    await calm.context.close();
  });

  for (const theme of THEMES) {
    test(`the line is secondary ink and the axis tertiary (primary-safe on the bar), and axe is clean with data, empty and loading, also in forced colours (${theme})`, async () => {
      const bodies = [SPARK({ label: "Requests", data: [12, 18, 9, 30, 24] }), SPARK({ label: "Requests", data: [] }), SPARK(loading)];
      const ink = async (page, selector, prop) => page.evaluate(([s, p]) => { const probe = document.createElement("div"); probe.style.color = getComputedStyle(document.querySelector(s))[p]; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, [selector, prop]);
      const first = await openHtml(browser, compose(`<title>S</title>${bodies[0]}`, { fonts: false }).html, { scheme: theme });
      const token = (n) => first.page.evaluate((name) => { const p = document.createElement("div"); p.style.color = `var(--basalt-${name})`; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; }, n);
      assert.equal(await ink(first.page, ".sparkline-line", "stroke"), await token("text-secondary"));
      assert.equal(await ink(first.page, ".sparkline-axis", "color"), await token("text-tertiary"));
      assert.deepEqual(await first.page.evaluate(() => { const s = getComputedStyle(document.querySelector(".sparkline-line")); return [s.fill, s.strokeWidth, s.strokeLinecap, s.strokeLinejoin]; }), ["none", "1px", "round", "round"], "a hairline, no fill");
      await first.context.close();
      for (const body of bodies) {
        const { page, context } = await openHtml(browser, compose(`<title>S</title>${body}`, { fonts: false }).html, { scheme: theme });
        assert.deepEqual(await axeViolations(page), []);
        await page.emulateMedia({ forcedColors: "active" });
        await settle(page);
        assert.deepEqual(await axeViolations(page), [], "forced colours");
        if (await page.locator(".sparkline-line").count()) {
          const forced = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".sparkline-line")); const probe = document.createElement("div"); probe.style.color = s.stroke; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return [s.stroke !== "none", c !== "rgba(0, 0, 0, 0)"]; });
          assert.deepEqual(forced, [true, true], "the line is still drawn in forced colours");
        }
        await context.close();
      }
    });
  }

  test("on the smoked bar the axis is promoted to secondary ink", async () => {
    const body = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#">Orbit</a><span class="spacer"></span></div></header>${SPARK({ label: "Requests", data: [1, 2] })}<div class="topbar" id="inside"><div class="sparkline"><script type="application/json" data-sparkline>{"label":"In bar","data":[1,2]}</script></div></div>`;
    const { page, context } = await openHtml(browser, compose(`<title>S</title>${body}`, { fonts: false }).html);
    const [outside, inside] = await page.evaluate(() => [...document.querySelectorAll(".sparkline-axis")].map((a) => getComputedStyle(a).color));
    assert.notEqual(outside, inside);
    await context.close();
  });
});
