// The ninth parity PR (step 7 of batch 7, DECISIONS 103 and 108: commands), in a browser: the command list set in the page (a level-1 panel with a 48px band, 40px plates in 44px rows, the
// shared plate shown only while the list is in use, the foot with the count and the key legend, the empty state, the held height), list plus preview (side by side from 816px of its own
// width, the push below it with its Back band), two-line rows in the palette and `.rows`, ⌘K's one owner, and `size-list-width` in place of `.split`'s raw 20rem, held to what React gives them.
// parity.test.mjs compares each part's computed styles with React's (the COMMANDS cases and the palette's two-line row); this file pins behaviour: focus in the field (a combobox with
// aria-activedescendant), the keys, the plate, the held height (0px through a no-match query), the split at 816 and the push at 815, the push's focus and Back's return, the count spoken
// once after 400ms, ⌘K, then reduced motion, forced colours, touch and axe. Anything timed runs on the shared animation clock. The data is synthetic.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml, skillDir } from "./support.mjs";

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

// ---- Synthetic commands: two-line and one-line rows mixed, a chip, a danger row and a long description ----
const LONG = "A description that is far too long for one line of this list, so it has to be cut with an ellipsis and never wrap";
const GROUPS = [
  { label: "Sandbox", items: [
    { id: "new", label: "New sandbox", icon: "Plus", description: "Create a fresh environment", keys: ["⌘", "N"], href: "#ran-new" },
    { id: "dup", label: "Duplicate", icon: "Copy", description: "Copy the current one", href: "#ran-dup" },
    { id: "rename", label: "Rename", href: "#ran-rename" },
    { id: "del", label: "Delete sandbox", icon: "Trash", danger: true, description: "Remove it for good", href: "#ran-del" },
  ] },
  { label: "Account", items: [
    { id: "profile", label: "Profile", href: "#ran-profile" },
    { id: "keys", label: "API keys", description: LONG, keys: ["⌘", "J"], href: "#ran-keys" },
    { id: "billing", label: "Billing", description: "Plans and invoices", href: "#ran-billing" },
    { id: "team", label: "Team", href: "#ran-team" },
  ] },
];
const ALL = GROUPS.flatMap((g) => g.items);
const detailOf = (c) => `<template data-detail="${c.id}"><div><h3>${c.label}</h3><p>${c.description ?? "No description"}</p><div><button class="btn" id="primary" onclick="window.paneRan='${c.id}'">Run ${c.label}</button> <button class="btn" id="second">Other</button></div></div></template>`;
const listOf = ({ preview = false, groups = GROUPS, attrs = "" } = {}) => `<div class="command-list" data-label="Console" ${attrs}><script type="application/json" data-commands>${JSON.stringify({ groups })}</script>${preview ? ALL.map(detailOf).join("") : ""}</div>`;
const PAGE = ({ width = 640, preview = false, extra = "", groups, attrs } = {}) => `<div style="padding: 24px"><button class="btn" id="before">before</button><div id="box" style="width: ${width}px">${listOf({ preview, groups, attrs })}</div><button class="btn" id="after">after</button><p id="below" style="margin: 0">below the list</p>${extra}</div>`;
const html = (body) => compose(`<title>Commands</title>${body}`, { fonts: false }).html;
async function open({ scheme = "dark", width = 1440, touch = false, reducedMotion = "no-preference", forced = false, body = PAGE() } = {}) {
  const opened = await openHtml(browser, html(body), { scheme, width, touch, reducedMotion });
  if (forced) await opened.page.emulateMedia({ forcedColors: "active" });
  await settle(opened.page);
  return opened;
}
const box = (locator) => locator.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; });
const css = (locator, ...props) => locator.evaluate((el, names) => { const s = getComputedStyle(el); return Object.fromEntries(names.map((n) => [n, s[n]])); }, props);
const pseudo = (locator, which, ...props) => locator.evaluate((el, [w, names]) => { const s = getComputedStyle(el, w); return Object.fromEntries(names.map((n) => [n, s[n]])); }, [which, props]);
const rgba = (page, colour) => page.evaluate((c) => { const g = document.createElement("canvas").getContext("2d"); g.clearRect(0, 0, 1, 1); g.fillStyle = c; g.fillRect(0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data]; }, colour);
/** A system colour (or any value) as the browser resolves it, through a probe. */
const resolve = (page, value, prop = "color") => page.evaluate(([v, p]) => { const probe = document.createElement("div"); probe.style.setProperty(p, v); document.body.append(probe); const out = getComputedStyle(probe)[p === "color" ? "color" : "backgroundColor"]; probe.remove(); return out; }, [value, prop]);
const lit = (page) => page.evaluate(() => document.querySelector(".command-results .row[aria-selected='true']")?.querySelector(".row-label")?.textContent ?? null);
const focused = (page) => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.className || a.tagName) : null; });
const plateState = (page) => page.evaluate(() => { const p = document.querySelector(".command-results > .plate"); return { state: p.dataset.state, opacity: Number.parseFloat(getComputedStyle(p).opacity), display: getComputedStyle(p).display }; });
const plateAt = (page, opacity) => page.waitForFunction((o) => Number.parseFloat(getComputedStyle(document.querySelector(".command-results > .plate")).opacity) === o, opacity);
const FIELD = ".command-list .input-row > input";
/** A duration token in milliseconds (the generated tokens write seconds). */
const ms = (token) => (token.trim().endsWith("ms") ? Number.parseFloat(token) : Number.parseFloat(token) * 1000);
const ready = async (page) => { await page.waitForSelector(".command-results .row"); await settle(page); };
const probe = async (page) => ({ below: (await box(page.locator("#below"))).y, panel: (await box(page.locator(".command-page"))).h, body: (await box(page.locator(".command-body"))).h, band: (await box(page.locator(".input-row"))).h, foot: (await box(page.locator(".command-foot"))).h });

describe("the command list in the page", () => {
  for (const theme of THEMES) {
    test(`focus lives in the field: a combobox on a listbox of options in labelled groups; no autofocus; arrows wrap and snap; ↵ runs; Tab leaves (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      await ready(page);
      assert.equal(await focused(page), "BODY", "nothing is focused on load");
      const roles = await page.evaluate(() => {
        const input = document.querySelector(".command-list input");
        const results = document.querySelector(".command-results");
        const page = document.querySelector(".command-page");
        return {
          role: input.getAttribute("role"), expanded: input.getAttribute("aria-expanded"), controls: input.getAttribute("aria-controls") === results.id, name: input.getAttribute("aria-label"),
          list: results.getAttribute("role"), listName: results.getAttribute("aria-label"), tab: results.getAttribute("tabindex"),
          options: [...results.querySelectorAll(".row")].every((o) => o.getAttribute("role") === "option"),
          groups: [...results.querySelectorAll("[role=group]")].map((g) => g.getAttribute("role") + ":" + document.getElementById(g.getAttribute("aria-labelledby")).textContent),
          region: page.getAttribute("role") + ":" + page.getAttribute("aria-label"),
          active: input.getAttribute("aria-activedescendant") === results.querySelector(".row[aria-selected='true']").id,
        };
      });
      assert.deepEqual(roles, { role: "combobox", expanded: "true", controls: true, name: "Search commands", list: "listbox", listName: "Console", tab: "-1", options: true, groups: ["group:Sandbox", "group:Account"], region: "region:Console", active: true });
      await page.focus(FIELD);
      assert.equal(await lit(page), "New sandbox");
      await page.keyboard.press("ArrowUp");
      assert.equal(await lit(page), "Team", "up from the first wraps to the last");
      await page.keyboard.press("ArrowDown");
      assert.equal(await lit(page), "New sandbox", "down from the last wraps to the first");
      assert.equal(await focused(page), "INPUT", "focus stays in the field");
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), true);
      assert.equal(await page.evaluate(() => document.querySelector(".command-list input").getAttribute("aria-activedescendant") === document.querySelector(".row[aria-selected='true']").id), true, "the field names the lit row");
      // a key snaps the plate: it is on the row at once, with no transition running
      await page.keyboard.press("ArrowDown");
      const snapped = await page.evaluate(() => {
        const plate = document.querySelector(".command-results > .plate");
        const row = document.querySelector(".row[aria-selected='true']");
        const p = plate.getBoundingClientRect();
        const r = row.getBoundingClientRect();
        return { dy: p.top - (r.top + 2), dh: p.height - (r.height - 4), running: plate.getAnimations().length };
      });
      assert.ok(Math.abs(snapped.dy) < 0.6 && Math.abs(snapped.dh) < 0.6 && snapped.running === 0, `the plate is on the row at once ${JSON.stringify(snapped)}`);
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => location.hash), "#ran-dup", "↵ runs the row");
      await page.keyboard.press("Tab");
      assert.equal(await focused(page), "after", "Tab leaves the list to the next stop");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`Esc clears the query and does nothing (it is not even prevented) once it is empty (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await ready(page);
      await page.focus(FIELD);
      await page.evaluate(() => { window.escapes = []; document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.escapes.push(e.defaultPrevented); }); });
      await page.keyboard.type("dup");
      assert.equal(await page.inputValue(FIELD), "dup");
      assert.equal(await page.locator(".command-results .row:not([hidden])").count(), 1);
      await page.keyboard.press("Escape");
      assert.equal(await page.inputValue(FIELD), "", "the first Esc clears");
      assert.equal(await page.locator(".command-results .row:not([hidden])").count(), 8, "and every row is back");
      assert.deepEqual(await page.evaluate(() => window.escapes), [], "the first Esc was handled and stopped, so it never reached the page");
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), true, "it never blurs");
      assert.deepEqual(await page.evaluate(() => window.escapes), [false], "an empty field's Esc is left alone, not even prevented");
      await context.close();
    });

    test(`the plate shows only while the field has focus or the pointer is over the list, and stays on pointer leave while the field has focus (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await ready(page);
      const idle = () => page.locator(".command-results").getAttribute("data-idle");
      assert.notEqual(await idle(), null, "at rest the list is idle");
      assert.equal((await plateState(page)).opacity, 0, "and shows no plate");
      assert.equal(await page.locator(".row[aria-selected='true']").count(), 1, "a row is still the lit one (↵ will run it once the field has focus)");
      await page.focus(FIELD);
      await settle(page);
      assert.equal(await idle(), null);
      assert.equal((await plateState(page)).opacity, 1, "focus in the field lights the plate");
      const row = await box(page.locator(".command-results .row").nth(1));
      await page.mouse.move(row.x + 40, row.y + 20);
      await settle(page);
      await page.mouse.move(1300, 800);
      await settle(page);
      assert.equal((await plateState(page)).opacity, 1, "the plate stays when the pointer leaves while the field has focus");
      await page.focus("#after");
      await plateAt(page, 0);
      assert.notEqual(await idle(), null);
      await page.mouse.move(row.x + 40, row.y + 20);
      await settle(page);
      assert.equal(await idle(), null);
      assert.equal((await plateState(page)).opacity, 1, "the pointer over the list lights the plate");
      await page.mouse.move(1300, 800);
      await plateAt(page, 0);
      assert.equal((await plateState(page)).opacity, 0, "and leaving puts it out again");
      await context.close();
    });

    test(`the list holds its unfiltered height up to the popup cap, scrolls inside, and filtering moves nothing below it (0px) (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await ready(page);
      const rest = await probe(page);
      assert.ok(rest.body <= 360 + 0.5 && rest.body >= 359, `the body is held to the cap (${rest.body})`);
      assert.equal(await page.evaluate(() => { const l = document.querySelector(".command-results"); return l.scrollHeight > l.clientHeight; }), true, "and scrolls inside");
      await page.focus(FIELD);
      for (const query of ["dup", "zzz", "a", "", "bill", "zz", ""]) {
        await page.fill(FIELD, query);
        await settle(page);
        assert.deepEqual(await probe(page), rest, `nothing moved for "${query}" (0px)`);
      }
      // a short list holds its own height, and measures it again when it changes
      const short = await open({ scheme: theme, body: PAGE({ groups: [GROUPS[0]] }) });
      await ready(short.page);
      const few = await probe(short.page);
      assert.ok(few.body < 360, `four rows are held at their own height (${few.body})`);
      await short.page.focus(FIELD);
      for (const query of ["rename", "zzz", ""]) { await short.page.fill(FIELD, query); await settle(short.page); assert.deepEqual(await probe(short.page), few, `a short list holds too, for "${query}"`); }
      await short.context.close();
      await context.close();
    });

    test(`no match is one sentence and a ghost Clear search in the held area, outside the listbox, and Clear brings the rows back to the field (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await ready(page);
      await page.focus(FIELD);
      await page.fill(FIELD, "  zzq ");
      await settle(page);
      const none = page.locator(".command-none");
      assert.equal(await none.isVisible(), true);
      assert.equal(await none.locator("p").textContent(), "Nothing matches “zzq”.", "the sentence says what was typed, trimmed");
      assert.equal(await page.evaluate(() => !!document.querySelector("[role=listbox] .command-none"), true), false, "it sits outside the listbox, so the button is valid there");
      assert.equal(await page.locator(".command-results .row:not([hidden])").count(), 0);
      assert.equal(await page.locator(".command-count > span[aria-hidden]").textContent(), "0 of 8");
      assert.equal(await page.evaluate(() => document.querySelector(".command-list input").hasAttribute("aria-activedescendant")), false, "no lit row, no active descendant");
      const [body, centre] = [await box(page.locator(".command-body")), await box(none)];
      assert.ok(Math.abs(centre.x - body.x) < 0.5 && Math.abs(centre.w - body.w) < 0.5 && Math.abs(centre.h - body.h) < 0.5, "it fills the held area");
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.locator(".command-results .row[aria-selected='true']").count(), 0, "an arrow with nothing to move to does nothing");
      await none.locator("button").click();
      assert.equal(await page.inputValue(FIELD), "");
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), true, "Clear search returns focus to the field");
      assert.equal(await page.locator(".command-results .row:not([hidden])").count(), 8);
      assert.equal(await lit(page), "New sandbox");
      await context.close();
    });

    test(`the count is shown at once and spoken once, 400ms after the last change, on the shared clock (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme });
      await ready(page);
      const shown = () => page.locator(".command-count > span[aria-hidden]").textContent();
      const spoken = () => page.locator(".command-count > span[role=status]").textContent();
      assert.equal(await page.locator(".command-count > span[role=status]").getAttribute("aria-live"), "polite");
      assert.equal(await page.locator(".command-count > span[role=status]").getAttribute("aria-atomic"), "true");
      assert.equal(await shown(), "8 commands");
      assert.equal(await spoken(), "8 commands", "nothing is announced on load");
      const clock = await freezeAnimations(page);
      await page.focus(FIELD);
      await page.fill(FIELD, "a");
      const first = await shown();
      assert.match(first, /^\d+ of 8$/);
      assert.equal(await spoken(), "8 commands", "the visible count updates at once, but nothing is spoken yet");
      await clock.advance(300);
      await page.fill(FIELD, "ac");
      await clock.advance(300);
      await page.fill(FIELD, "acc");
      const last = await shown();
      await clock.advance(399);
      assert.equal(await spoken(), "8 commands", "399ms of stillness is not enough");
      await clock.advance(1);
      assert.equal(await spoken(), last, "spoken once, with the last count, after 400ms of stillness");
      await page.fill(FIELD, "");
      assert.equal(await shown(), "8 commands");
      await clock.advance(400);
      assert.equal(await spoken(), "8 commands");
      await clock.thaw();
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`the foot counts "9 commands" in the noun it is given, the key legend is hidden from assistive technology, and Run becomes Open beside a preview (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, body: PAGE({ groups: [{ label: "One", items: [GROUPS[0].items[2]] }], attrs: `data-noun="action"` }) });
      await ready(page);
      assert.equal(await page.locator(".command-count > span[aria-hidden]").textContent(), "1 action");
      assert.equal(await page.locator(".command-hints").getAttribute("aria-hidden"), "true");
      assert.equal(await page.locator(".command-hints").getAttribute("data-kbd-hint"), "");
      assert.equal(await page.locator(".command-hints > span").count(), 3);
      assert.equal(await page.locator(".command-hints > span").nth(1).evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()), "Run");
      await context.close();
      const preview = await open({ scheme: theme, body: PAGE({ width: 900, preview: true }) });
      await ready(preview.page);
      assert.equal(await preview.page.locator(".command-hints > span").count(), 2, "Esc is left to be found beside a preview");
      assert.equal(await preview.page.locator(".command-hints > span").nth(1).evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()), "Open");
      await preview.context.close();
    });

    test(`a row runs its own code and its link, and a list built from script runs onSelect; a description is searched (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, body: PAGE({ extra: `<div id="made" style="width: 640px"></div>` }) });
      await ready(page);
      await page.focus(FIELD);
      await page.fill(FIELD, "fresh environment");
      assert.equal(await page.locator(".command-results .row:not([hidden])").count(), 1, "the description is matched");
      await page.locator(".command-results .row:not([hidden])").click();
      assert.equal(await page.evaluate(() => location.hash), "#ran-new", "a press runs it (here a link)");
      await page.evaluate(() => {
        window.picked = [];
        window.Basalt.commandList(document.getElementById("made"), { label: "Made", groups: [{ label: "G", items: [{ id: "x", label: "Run it", onSelect: (item) => window.picked.push("item:" + item.id) }] }], onSelect: (item) => window.picked.push("list:" + item.id) });
      });
      await page.locator("#made .row").click();
      assert.deepEqual(await page.evaluate(() => window.picked), ["item:x", "list:x"], "the item's own onSelect runs, then the list's");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

// Title matches rank above keyword and description matches (DECISIONS 103), as cmdk ranks them: each tier keeps its order, and a group sits by its best row.
const RANKED = [
  { label: "Files", items: [{ id: "backup", label: "Back up", description: "Copy everything to the archive" }, { id: "paste", label: "Paste", keywords: ["copy"] }, { id: "copyfile", label: "Copy file" }] },
  { label: "Text", items: [{ id: "other", label: "Other", description: "Does not match" }, { id: "dupe", label: "Duplicate", description: "Copy the current one" }, { id: "copytext", label: "Copy text" }] },
  { label: "Tools", items: [{ id: "tool", label: "Tool", description: "Make a copy of a tool" }] },
];
describe("a title match ranks above a description or keyword match, in the list and in the palette", () => {
  for (const theme of THEMES) {
    test(`the list: a query that hits one row by its title and others by their description or keywords puts the title first, each tier in its order, and an empty query restores the order given (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, body: PAGE({ groups: RANKED }) });
      await ready(page);
      const shown = () => page.evaluate(() => [...document.querySelectorAll(".command-results .row:not([hidden])")].map((r) => r.querySelector(".row-label").textContent));
      const headings = () => page.evaluate(() => [...document.querySelectorAll(".command-results .row-group")].filter((h) => !h.parentElement.hidden).map((h) => h.textContent));
      const given = await shown();
      assert.deepEqual(given, ["Back up", "Paste", "Copy file", "Other", "Duplicate", "Copy text", "Tool"]);
      await page.focus(FIELD);
      await page.fill(FIELD, "copy");
      assert.deepEqual(await shown(), ["Copy file", "Back up", "Paste", "Copy text", "Duplicate", "Tool"], "titles first (each group's own, by its best row), then description and keyword matches in their order");
      assert.deepEqual(await headings(), ["Files", "Text", "Tools"]);
      assert.equal(await lit(page), "Copy file", "the first row in the new order is lit");
      await page.keyboard.press("ArrowDown");
      assert.equal(await lit(page), "Back up", "the arrows follow the order shown");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      assert.equal(await lit(page), "Tool", "and wrap through it");
      // a title in a later group lifts that group over an earlier one that matches only by description or keyword
      await page.fill(FIELD, "copy t");
      assert.deepEqual(await shown(), ["Copy text", "Duplicate", "Back up", "Paste", "Tool"]);
      assert.deepEqual(await headings(), ["Text", "Files", "Tools"]);
      await page.fill(FIELD, "archive");
      assert.deepEqual(await shown(), ["Back up"]);
      await page.fill(FIELD, "");
      assert.deepEqual(await shown(), given, "an empty query restores the order given");
      assert.equal(await page.evaluate(() => document.querySelector("input").getAttribute("aria-activedescendant") === document.querySelector(".row[aria-selected='true']").id), true);
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`the palette ranks the same way (${theme})`, async () => {
      const palette = { groups: RANKED.map((g) => ({ label: g.label, items: g.items })) };
      const { page, context, errors } = await open({ scheme: theme, body: `<button class="btn" data-open-palette>Open</button><script type="application/json" data-palette>${JSON.stringify(palette)}</script>` });
      await page.locator("button[data-open-palette]").click();
      await page.locator(".palette .row").first().waitFor();
      const shown = () => page.evaluate(() => [...document.querySelectorAll(".palette .row")].map((r) => r.querySelector(".row-label").textContent));
      await page.keyboard.type("copy");
      assert.deepEqual(await shown(), ["Copy file", "Back up", "Paste", "Copy text", "Duplicate", "Tool"]);
      assert.equal(await page.evaluate(() => document.querySelector(".palette .row[aria-selected='true'] .row-label").textContent), "Copy file");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }
});

describe("⌘K has one owner per page", () => {
  test("on a page with no palette ⌘K and Ctrl K focus the list's field, select its text and scroll it into view", async () => {
    const { page, context } = await open({ body: PAGE({ extra: `<div style="height: 2400px"></div>` }) });
    await ready(page);
    await page.focus(FIELD);
    await page.fill(FIELD, "dup");
    await page.focus("#after");
    for (const chord of ["Meta+k", "Control+k"]) {
      await page.evaluate(() => { document.querySelector("#after").focus(); window.scrollTo(0, 2000); });
      await page.keyboard.press(chord);
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), true, `${chord} focuses the field`);
      assert.deepEqual(await page.evaluate(() => { const i = document.querySelector(".command-list input"); return [i.selectionStart, i.selectionEnd, i.value.length]; }), [0, 3, 3], "and selects what is in it");
      assert.equal(await page.evaluate(() => { const r = document.querySelector(".command-list input").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), true, "and scrolls it into view");
    }
    await context.close();
  });

  test("on a page with a palette ⌘K is the palette's: it opens, and the list's field is left alone", async () => {
    const palette = `<button class="btn" data-open-palette>Open</button><script type="application/json" data-palette>${JSON.stringify({ groups: [{ label: "Go", items: [{ label: "Home", href: "#home" }] }] })}</script>`;
    const { page, context } = await open({ body: PAGE({ extra: palette }) });
    await ready(page);
    await page.focus("#after");
    await page.keyboard.press("Control+k");
    assert.equal(await page.locator(".palette").count(), 1, "the palette opens");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".palette input")), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".palette").count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), false, "the list never took ⌘K");
    await context.close();
  });

  test("a page with two lists gives ⌘K to the first", async () => {
    const second = `<div id="second" style="width: 640px">${listOf({ groups: [GROUPS[1]] }).replace('data-label="Console"', 'data-label="Other"')}</div>`;
    const { page, context } = await open({ body: PAGE({ extra: second }) });
    await ready(page);
    await page.keyboard.press("Control+k");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("#box .command-list input")), true);
    await context.close();
  });
});

describe("list plus preview: the split from 816px of the list's own width, the push below it", () => {
  test("it is side by side at 816px and a push at 815px, by the list's own width and not the viewport's, and a pushed detail returns to the list when it grows", async () => {
    const { page, context } = await open({ body: PAGE({ width: 816, preview: true }) });
    await ready(page);
    const mode = () => page.locator(".command-split").getAttribute("data-mode");
    assert.equal(await mode(), "split", "816px is the split");
    const [list, pane] = [await box(page.locator(".command-page")), await box(page.locator(".command-pane"))];
    assert.equal(list.w, 320, "the list is size-list-width");
    assert.ok(Math.abs(pane.x - list.right - 16) < 0.01, "the panels are space-4 apart");
    assert.ok(Math.abs(pane.w - 480) < 0.01, `the pane is the rest, 480 (${pane.w})`);
    assert.ok(Math.abs(list.h - pane.h) < 0.01, "and they are equal in height");
    await page.evaluate(() => { document.getElementById("box").style.width = "815px"; });
    await settle(page);
    assert.equal(await mode(), "push", "815px is a push");
    assert.equal(await page.locator(".command-pane").isVisible(), false, "the pane is out until a row is pressed");
    assert.equal(await page.locator(".row-chevron").first().isVisible(), true, "and each row shows the push's arrow");
    await page.evaluate(() => { document.getElementById("box").style.width = "500px"; window.innerWidth; });
    await page.locator(".row").nth(1).click();
    assert.equal(await page.locator(".command-split").getAttribute("data-view"), "detail");
    await page.evaluate(() => { document.getElementById("box").style.width = "900px"; });
    await settle(page);
    assert.equal(await mode(), "split");
    assert.equal(await page.locator(".command-split").getAttribute("data-view"), "list", "a pushed detail goes back to the list when there is room for both");
    assert.equal(await page.locator(".command-pane").isVisible(), true);
    // the viewport does not decide: a narrow list in a wide window is still a push
    await page.evaluate(() => { document.getElementById("box").style.width = "700px"; });
    await settle(page);
    assert.equal(await mode(), "push");
    await context.close();
  });

  for (const theme of THEMES) {
    test(`in a split the pane shows the lit row's detail, the plate moves only by ↑ ↓ or a press, hover lifts ink only, and ↵ runs the pane's first button (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, body: PAGE({ width: 900, preview: true }) });
      await ready(page);
      const heading = () => page.locator(".command-pane-body h3").textContent();
      assert.equal(await heading(), "New sandbox", "the first command is shown at once");
      assert.equal(await page.locator(".command-pane").getAttribute("aria-labelledby"), await page.locator(".command-pane-body h3").getAttribute("id"), "the pane is a region named by its heading");
      assert.equal(await page.locator(".command-pane").getAttribute("role"), "region");
      assert.equal(await page.locator(".command-results").getAttribute("data-idle"), null, "a split has no idle state: the plate marks what the pane shows");
      assert.equal((await plateState(page)).opacity, 1);
      // hover: ink lifts, the plate and the pane stay
      const dup = page.locator(".command-results .row").nth(1);
      const rest = await css(dup, "color");
      await dup.hover();
      await settle(page);
      assert.notEqual((await css(dup, "color")).color, rest.color, "hover lifts the row's ink");
      assert.equal(await lit(page), "New sandbox", "but the plate stays");
      assert.equal(await heading(), "New sandbox", "and so does the pane");
      // keys move it
      await page.focus(FIELD);
      await page.keyboard.press("ArrowDown");
      assert.equal(await heading(), "Duplicate");
      // a press moves it
      await page.locator(".command-results .row").nth(2).click();
      assert.equal(await heading(), "Rename");
      assert.equal(await lit(page), "Rename");
      // ↵ in the field runs the pane's first button, not the row
      await page.focus(FIELD);
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => window.paneRan), "rename", "↵ runs the pane's primary action");
      assert.equal(await page.evaluate(() => location.hash), "", "and not the row's own link");
      // a search that leaves one row shows it; none says so
      await page.fill(FIELD, "bill");
      assert.equal(await heading(), "Billing");
      await page.fill(FIELD, "zzz");
      assert.equal(await page.locator(".command-pane-empty").textContent(), "Nothing to show.");
      await page.fill(FIELD, "");
      assert.equal(await heading(), "New sandbox", "an empty query lights the first row again");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`below the split a row pushes the detail: focus goes to its heading, Back keeps the query, the scroll and the lit row, and returns focus to the field (${theme})`, async () => {
      const { page, context, errors } = await open({ scheme: theme, width: 1440, body: PAGE({ width: 500, preview: true }) });
      await ready(page);
      assert.equal(await page.locator(".command-split").getAttribute("data-mode"), "push");
      assert.equal(await page.locator(".command-split").getAttribute("data-view"), "list");
      assert.equal(await page.locator(".command-back").isVisible(), false, "the Back band is not drawn while the list shows");
      // scroll the list, search, and press a row in the middle
      await page.evaluate(() => { document.querySelector(".command-results").scrollTop = 120; });
      await page.focus(FIELD);
      await page.keyboard.type("a");
      await settle(page);
      const kept = { query: await page.inputValue(FIELD), lit: await lit(page) };
      await page.evaluate(() => { document.querySelector(".command-results").scrollTop = 40; });
      const scrolled = await page.evaluate(() => document.querySelector(".command-results").scrollTop);
      await page.keyboard.press("ArrowDown");
      const target = await lit(page);
      await page.keyboard.press("Enter");
      assert.equal(await page.locator(".command-split").getAttribute("data-view"), "detail");
      assert.equal(await page.locator(".command-page").isVisible(), false, "the list is out");
      assert.equal(await page.locator(".command-back").isVisible(), true, "the Back band is in");
      assert.equal(await focused(page), await page.locator(".command-pane-body h3").getAttribute("id"), "focus is on the detail's heading");
      assert.equal(await page.locator(".command-pane-body h3").textContent(), target);
      assert.equal(await page.locator(".command-back button").getAttribute("aria-label"), "Back to Console");
      assert.equal(await page.locator(".command-back button").textContent(), "Console");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".command-pane-body h3")).outlineStyle), "none", "the heading shows no ring: nothing operates it");
      await page.locator(".command-back button").click();
      assert.equal(await page.locator(".command-split").getAttribute("data-view"), "list");
      assert.equal(await page.inputValue(FIELD), kept.query, "Back keeps the query");
      assert.equal(await lit(page), target, "and the lit row");
      assert.equal(await page.evaluate(() => document.querySelector(".command-results").scrollTop), scrolled, "and the scroll");
      assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), true, "and returns focus to the field with a pointer or a key");
      assert.ok(kept.lit);
      assert.deepEqual(errors, []);
      await context.close();
    });

    test(`the detail enters 8px along the reading direction with a fade over duration-slow on ease-out, and the list returns the other way (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme, body: PAGE({ width: 500, preview: true }) });
      await ready(page);
      const clock = await freezeAnimations(page);
      await page.locator(".command-results .row").nth(1).click();
      const entering = await page.evaluate(() => {
        const pane = document.querySelector(".command-pane");
        const s = getComputedStyle(pane);
        const slow = getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-slow").trim();
        return { name: s.animationName, duration: s.animationDuration, slow, timing: s.animationTimingFunction, at0: s.opacity, transform: s.transform, enter: document.querySelector(".command-split").getAttribute("data-enter") };
      });
      assert.equal(entering.name, "push-in");
      assert.equal(entering.duration, `${ms(entering.slow) / 1000}s`, "the duration is duration-slow");
      assert.equal(entering.timing, await page.evaluate(() => { const probe = document.createElement("i"); probe.style.transitionTimingFunction = "var(--basalt-ease-out)"; document.body.append(probe); const out = getComputedStyle(probe).transitionTimingFunction; probe.remove(); return out; }), "on ease-out");
      assert.equal(entering.enter, "next");
      assert.equal(Number(entering.at0), 0, "it starts transparent");
      assert.equal(entering.transform, "matrix(1, 0, 0, 1, 8, 0)", "and 8px along the reading direction");
      await clock.advance(ms(entering.slow));
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".command-pane")).opacity), "1");
      await clock.thaw();
      await page.waitForFunction(() => !document.querySelector(".command-split").hasAttribute("data-enter"));
      await page.locator(".command-back button").click();
      const leaving = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".command-page")); return { name: s.animationName, x: new DOMMatrixReadOnly(s.transform).m41, enter: document.querySelector(".command-split").getAttribute("data-enter") }; });
      assert.equal(leaving.name, "push-out");
      assert.ok(leaving.x <= 0 && leaving.x >= -8, `the list returns from the other way (${leaving.x})`);
      assert.equal(leaving.enter === "prev" || leaving.enter === null, true);
      await context.close();
    });
  }

  test("under reduced motion the push is a fade alone", async () => {
    const { page, context } = await open({ reducedMotion: "reduce", body: PAGE({ width: 500, preview: true }) });
    await ready(page);
    await page.locator(".command-results .row").nth(1).click();
    const entering = await page.evaluate(() => { const s = getComputedStyle(document.querySelector(".command-pane")); return { name: s.animationName, transform: s.transform }; });
    assert.equal(entering.name, "push-fade");
    assert.equal(entering.transform, "none");
    await context.close();
  });

  test("on touch a tap pushes the detail and Back returns focus to the list's region, not the field, so a keyboard doesn't spring up; with a hardware key it is the field", async () => {
    const { page, context } = await open({ width: 390, touch: true, body: PAGE({ width: 342, preview: true }) });
    await ready(page);
    assert.equal(await page.locator(".command-split").getAttribute("data-mode"), "push");
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), false, "no autofocus on touch");
    await page.locator(".command-results .row").nth(1).tap();
    assert.equal(await page.locator(".command-split").getAttribute("data-view"), "detail");
    assert.equal(await focused(page), await page.locator(".command-pane-body h3").getAttribute("id"));
    const back = await box(page.locator(".command-back button"));
    assert.ok(back.h >= 44, `Back is a 44px target on touch (${back.h})`);
    await page.locator(".command-back button").tap();
    assert.equal(await focused(page), "panel command-page", "a tap returns focus to the list's region (the panel)");
    await page.evaluate(() => document.documentElement.setAttribute("data-keyboard", "hardware"));
    await page.locator(".command-results .row").nth(1).tap();
    await page.locator(".command-back button").tap();
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector(".command-list input")), true, "with a hardware keyboard it is the field");
    await context.close();
  });
});

describe("rows: two lines, the plate between them, and the palette's description", () => {
  for (const theme of THEMES) {
    test(`a described row is 62px (a 58px plate) and a one-line row 44px (a 40px plate); the plate glides between them over duration-base, and a key snaps it (${theme})`, async () => {
      const { page, context } = await open({ scheme: theme });
      await ready(page);
      const heights = await page.evaluate(() => [...document.querySelectorAll(".command-results .row")].map((r) => [r.querySelector(".row-label").textContent, r.getBoundingClientRect().height, r.hasAttribute("data-described")]));
      assert.deepEqual(heights, [["New sandbox", 62, true], ["Duplicate", 62, true], ["Rename", 44, false], ["Delete sandbox", 62, true], ["Profile", 44, false], ["API keys", 62, true], ["Billing", 62, true], ["Team", 44, false]]);
      const plateOf = (label) => page.evaluate((l) => { const row = [...document.querySelectorAll(".command-results .row")].find((r) => r.querySelector(".row-label").textContent === l); const s = getComputedStyle(row, "::before"); return { h: Number.parseFloat(s.height), top: Number.parseFloat(s.top) }; }, label);
      assert.deepEqual(await plateOf("New sandbox"), { h: 58, top: 2 });
      assert.deepEqual(await plateOf("Rename"), { h: 40, top: 2 });
      // the line boxes touch: title 20 over description 18
      const lines = await page.evaluate(() => { const row = document.querySelector(".command-results .row"); const [a, b] = [row.querySelector(".row-label").getBoundingClientRect(), row.querySelector(".row-description").getBoundingClientRect()]; return { title: a.height, description: b.height, gap: b.top - a.bottom, textStart: Math.abs(a.left - b.left) < 0.01 }; });
      assert.deepEqual(lines, { title: 20, description: 18, gap: 0, textStart: true });
      // the glide: the pointer moves the plate from the one-line row to a described row over duration-base
      await page.focus(FIELD);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      assert.equal(await lit(page), "Rename");
      await settle(page);
      assert.equal(await page.evaluate(() => document.querySelector(".command-results > .plate").getBoundingClientRect().height), 40, "the plate is the one-line row's");
      const clock = await freezeAnimations(page);
      const del = await box(page.locator(".command-results .row").nth(3));
      await page.mouse.move(del.x + 100, del.y + 30);
      const slow = ms(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-duration-base")));
      const read = () => page.evaluate(() => { const p = document.querySelector(".command-results > .plate"); const r = p.getBoundingClientRect(); return { h: r.height, y: r.top, props: getComputedStyle(p).transitionProperty, duration: getComputedStyle(p).transitionDuration }; });
      assert.equal(await lit(page), "Delete sandbox");
      const start = await read();
      assert.equal(start.props, "transform, width, height");
      assert.equal(start.duration, `${slow / 1000}s`, "transform, width and height run on duration-base");
      await clock.advance(slow / 2);
      const mid = await read();
      assert.ok(mid.h > 40 && mid.h < 58, `half way the plate is part-way between 40 and 58 (${mid.h})`);
      await clock.advance(slow);
      assert.equal((await read()).h, 58, "and it arrives as the described row's plate");
      await clock.thaw();
      await context.close();
    });

    test(`a described palette row is two lines with its description searched, and a hint is still the inline one (${theme})`, async () => {
      const palette = { groups: [{ label: "Go", items: [{ label: "Save", icon: "Check", keys: ["⌘", "S"], description: "Writes the draft" }, { label: "Plain", hint: "inline" }, { label: "Bare" }] }] };
      const { page, context, errors } = await open({ scheme: theme, body: `<button class="btn" data-open-palette>Open</button><script type="application/json" data-palette>${JSON.stringify(palette)}</script>` });
      await page.locator("button[data-open-palette]").click();
      await page.locator(".palette .row").first().waitFor();
      await settle(page);
      const rows = await page.evaluate(() => [...document.querySelectorAll(".palette .row")].map((r) => ({ label: r.querySelector(".row-label").textContent, h: r.getBoundingClientRect().height, described: r.hasAttribute("data-described"), description: r.querySelector(".row-description")?.textContent ?? null, hint: r.querySelector(".row-hint")?.textContent ?? null })));
      assert.deepEqual(rows, [{ label: "Save", h: 62, described: true, description: "Writes the draft", hint: null }, { label: "Plain", h: 44, described: false, description: null, hint: "inline" }, { label: "Bare", h: 44, described: false, description: null, hint: null }]);
      await page.keyboard.type("draft");
      assert.equal(await page.locator(".palette .row").count(), 1, "the description is searched");
      assert.deepEqual(errors, []);
      await context.close();
    });
  }

  test("a standalone .rows list takes data-described and .row-description, in the core's own stack", async () => {
    const body = `<div class="panel" style="width: 420px"><div class="rows"><div class="row" data-described><span class="row-label">Alpha</span><span class="row-description">A second line</span></div><div class="row"><span class="row-label">Beta</span></div></div></div>`;
    const { page, context } = await open({ body });
    const heights = await page.evaluate(() => [...document.querySelectorAll(".row")].map((r) => r.getBoundingClientRect().height));
    assert.deepEqual(heights, [62, 44]);
    assert.equal((await css(page.locator(".row-description"), "color")).color, await resolve(page, "var(--basalt-text-tertiary)"));
    await context.close();
  });
});

describe("size-list-width replaces .split's raw 20rem", () => {
  test(".split.aside's first column is 320px (the token's own length) at 1440, and the source names the token", async () => {
    const body = `<div class="page"><div class="split aside" id="s"><div id="a">Aside</div><div>Main</div></div></div>`;
    const { page, context } = await open({ body });
    assert.equal((await box(page.locator("#a"))).w, 320);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-size-list-width").trim()), "320px");
    await context.close();
    const css = fs.readFileSync(`${skillDir}/parts/core.css`, "utf8");
    assert.match(css, /\.split\.aside\{grid-template-columns:minmax\(0,var\(--basalt-size-list-width\)\)/, "the core names the token");
    assert.ok(!/20rem/.test(css), "and no raw 20rem is left in it");
  });
});

describe("reduced motion, forced colours, touch and axe", () => {
  test("under reduced motion there is no shared plate: the lit row paints its own, and only while the list is in use", async () => {
    const { page, context } = await open({ reducedMotion: "reduce" });
    await ready(page);
    assert.equal((await plateState(page)).display, "none", "no shared plate is drawn");
    const row = page.locator(".command-results .row[aria-selected='true']");
    assert.equal((await pseudo(row, "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "idle: no plate");
    await page.focus(FIELD);
    await settle(page);
    const own = (await pseudo(row, "::before", "backgroundColor")).backgroundColor;
    assert.notEqual(own, "rgba(0, 0, 0, 0)", "in use: the row's own plate");
    const fill = await page.evaluate(() => { const probe = document.createElement("i"); probe.style.backgroundColor = "var(--panel-plate)"; document.querySelector(".command-page").append(probe); const out = getComputedStyle(probe).backgroundColor; probe.remove(); return out; });
    assert.equal(own, fill, "it is the panel's plate fill");
    await context.close();
  });

  test("in forced colours the lit row is Highlight with HighlightText, an idle list has none, and the panel's rim is CanvasText", async () => {
    const { page, context } = await open({ forced: true });
    await ready(page);
    const row = page.locator(".command-results .row[aria-selected='true']");
    assert.equal((await plateState(page)).display, "none");
    assert.equal((await pseudo(row, "::before", "backgroundColor")).backgroundColor, "rgba(0, 0, 0, 0)", "idle: no plate");
    assert.equal((await css(row, "color")).color, await resolve(page, "CanvasText"), "idle: rest ink");
    assert.equal((await css(page.locator(".command-page"), "borderTopColor")).borderTopColor, await resolve(page, "CanvasText"));
    await page.focus(FIELD);
    await settle(page);
    assert.equal((await pseudo(row, "::before", "backgroundColor")).backgroundColor, await resolve(page, "Highlight", "background-color"));
    for (const part of [row, row.locator(".row-label"), row.locator(".row-description"), row.locator("svg").first()]) assert.equal((await css(part, "color")).color, await resolve(page, "HighlightText"));
    assert.equal((await css(row.locator(".kbd").first(), "color")).color, await resolve(page, "HighlightText"), "the chip too");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    assert.equal(await lit(page), "Delete sandbox");
    assert.equal((await css(page.locator(".command-results .row[aria-selected='true']"), "color")).color, await resolve(page, "HighlightText"), "a lit danger row too");
    await context.close();
  });

  test("on touch a row is at least 44px, the key legend and chips are not drawn, no shared plate is drawn, and the field is 16px", async () => {
    const { page, context } = await open({ width: 390, touch: true, body: PAGE({ width: 342 }) });
    await ready(page);
    const heights = await page.evaluate(() => [...document.querySelectorAll(".command-results .row")].map((r) => r.getBoundingClientRect().height));
    assert.ok(heights.every((h) => h >= 44), `every row is a 44px target ${heights}`);
    assert.equal((await css(page.locator(".command-hints"), "display")).display, "none", "the legend waits for a hardware key");
    assert.equal(await page.locator(".row .kbd").first().isVisible(), false, "and so do the chips");
    assert.equal((await plateState(page)).display, "none");
    assert.equal((await css(page.locator(FIELD), "fontSize")).fontSize, "16px");
    await page.evaluate(() => document.documentElement.setAttribute("data-keyboard", "hardware"));
    assert.equal(await page.locator(".command-hints").isVisible(), true, "a hardware key brings them back");
    await context.close();
  });

  test("390 wide has no sideways scroll, in a list and in a preview, with the longest description cut by an ellipsis", async () => {
    for (const preview of [false, true]) {
      const { page, context } = await open({ width: 390, touch: true, body: PAGE({ width: 342, preview }) });
      await ready(page);
      const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - innerWidth, desc: (() => { const d = [...document.querySelectorAll(".row-description")].find((x) => x.textContent.startsWith("A description that")); return d.scrollWidth > d.clientWidth && getComputedStyle(d).textOverflow === "ellipsis"; })() }));
      assert.deepEqual(over, { doc: 0, desc: true });
      await context.close();
    }
  });

  for (const theme of THEMES) {
    test(`axe: the list at rest, in use, with no match, in a split and pushed, and in forced colours (${theme})`, async () => {
      const states = [];
      const { page, context } = await open({ scheme: theme });
      await ready(page);
      states.push(["at rest", await axeViolations(page)]);
      await page.focus(FIELD);
      await page.keyboard.press("ArrowDown");
      await settle(page);
      states.push(["in use", await axeViolations(page)]);
      await page.fill(FIELD, "zzz");
      await settle(page);
      states.push(["no match", await axeViolations(page)]);
      await context.close();
      const split = await open({ scheme: theme, body: PAGE({ width: 900, preview: true }) });
      await ready(split.page);
      states.push(["a split", await axeViolations(split.page)]);
      await split.context.close();
      const push = await open({ scheme: theme, width: 390, touch: true, body: PAGE({ width: 342, preview: true }) });
      await ready(push.page);
      states.push(["a push, the list", await axeViolations(push.page)]);
      await push.page.locator(".command-results .row").nth(1).tap();
      await settle(push.page);
      states.push(["a push, the detail", await axeViolations(push.page)]);
      await push.context.close();
      const forced = await open({ scheme: theme, forced: true });
      await ready(forced.page);
      await forced.page.focus(FIELD);
      await settle(forced.page);
      states.push(["forced colours", await axeViolations(forced.page)]);
      await forced.context.close();
      assert.deepEqual(states.filter(([, v]) => v.length), [], "no violations in any state");
    });
  }
});

describe("compose: what brings the command list, and what --usage prints for it", () => {
  const used = (body) => compose(`<title>T</title>${body}`, { fonts: false }).modules;
  test("the class, the data attribute and a call to Basalt.commandList each bring it, with the palette, rows, kbd and glide it extends", () => {
    for (const body of [`<div class="command-list"></div>`, `<script type="application/json" data-commands>{}</script>`, `<script>Basalt.commandList('#x', { groups: [] });</script>`]) {
      const modules = used(body);
      for (const name of ["command-list", "palette", "rows", "kbd", "glide"]) assert.ok(modules.includes(name), `${name} is in for ${body}`);
    }
    assert.ok(!used(`<div class="rows"></div>`).includes("command-list"), "a plain .rows list does not bring it");
    assert.ok(!used(`<button class="btn" data-open-palette>Open</button>`).includes("command-list"), "a palette alone does not bring it");
  });

  test("--usage command-list prints its usage whole and a line for what its script builds", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-parity-9-usage-"));
    try {
      const r = spawnSync(process.execPath, [path.join(skillDir, "compose.mjs"), "--usage", "core", "command-list"], { cwd: dir, encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^# command-list\b/m);
      assert.match(r.stdout, /Its script builds the markup of palette, rows, kbd and glide: nothing to add\./);
      assert.match(r.stdout, /<div class="command-list" data-label="Console" data-noun="command">/);
      assert.match(r.stdout, /Basalt\.commandList/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test("the page's own palette and list never both bind ⌘K: compose adds the list's step after the palette's", () => {
    const { html } = compose(`<title>T</title><div class="command-list"></div>`, { fonts: false });
    assert.ok(html.indexOf("wirePalette") < html.indexOf("wireCommandLists"), "the palette wires first, so the list can see it");
  });
});
