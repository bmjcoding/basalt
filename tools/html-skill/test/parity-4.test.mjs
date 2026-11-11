// The fourth parity PR (the overlay layer of batch 7: DECISIONS 108), in a browser: the skill's Dialog and AlertDialog, Sheet on every side, Popover, Menu, Tooltip,
// toasts and the notification centre, held to what React's Base UI gives them: focus moves in and is trapped, Esc closes, focus returns, light dismiss, menu keys and
// typeahead, tooltip hover and focus, announcements, the centre's glide and ring. parity.test.mjs compares each part's computed styles with React's; this file pins the
// behaviour and the motion it can't read that way, in both themes, under reduced motion, in forced colours and on touch. Anything timed runs on the shared animation clock.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { freezeAnimations, settle } from "../../../packages/react/test/support.mjs";
import { chromium } from "playwright";

import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const AXE = { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] };
const axeViolations = async (page, options = AXE) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate((o) => axe.run(document, o).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)), options);
};

const BODY = `<main class="page stack">
  <h1>Overlays</h1>
  <div class="cluster">
    <button class="btn" id="open-dlg" data-dialog-open="#dlg">Rename</button>
    <button class="btn" id="open-alert" data-dialog-open="#alert">Delete</button>
    <button class="btn" id="open-r" data-dialog-open="#sheet-r">Right</button>
    <button class="btn" id="open-l" data-dialog-open="#sheet-l">Left</button>
    <button class="btn" id="open-b" data-dialog-open="#sheet-b">Bottom</button>
    <button class="btn" id="open-t" data-dialog-open="#sheet-t">Top</button>
    <button class="btn" id="open-pop" popovertarget="pop">Details</button>
    <button class="btn" id="open-menu" popovertarget="menu">Options</button>
    <button class="btn" id="tip" data-variant="ghost" data-icon-only aria-label="Copy" data-tooltip="Copy" data-tooltip-keys="⌘ C"><i data-icon="Copy"></i></button>
    <button class="btn" id="plain">Plain</button>
    <span id="bell"></span>
  </div>
  <div class="card" id="card"><button class="btn" id="open-card-pop" popovertarget="card-pop">In a card</button>
    <div class="panel float popover" popover id="card-pop"><h2 class="popover-title">Nested</h2><p class="popover-description">A level on.</p></div></div>

  <div class="panel float popover" popover id="pop"><h2 class="popover-title">Region</h2><p class="popover-description">Where it runs.</p><button class="btn" id="pop-btn">Go</button></div>

  <div class="panel float menu" popover id="menu">
    <button class="menu-item" role="menuitem" id="m-dup"><i data-icon="Copy"></i><span class="menu-item-label">Duplicate</span><span data-kbd="⌘ D"></span></button>
    <div class="menu-separator" role="separator"></div>
    <div role="group" aria-labelledby="g1">
      <div class="menu-group-label" id="g1">Sort by</div>
      <button class="menu-item" role="menuitemradio" aria-checked="true" id="m-name"><span class="menu-item-label">Name</span></button>
      <button class="menu-item" role="menuitemradio" aria-checked="false" id="m-date"><span class="menu-item-label">Date</span><span class="menu-item-description">Newest first</span></button>
    </div>
    <button class="menu-item" role="menuitemcheckbox" aria-checked="false" id="m-hidden"><span class="menu-item-label">Show hidden</span></button>
    <button class="menu-item" role="menuitem" data-danger id="m-del"><i data-icon="Trash"></i><span class="menu-item-label">Delete</span></button>
  </div>

  <dialog class="panel float modal dialog" id="dlg">
    <h2 class="dialog-title">Rename sandbox</h2><p class="dialog-description">The new name shows everywhere.</p>
    <div class="panel" id="inner" style="padding: 8px">inner</div>
    <div class="dialog-actions"><button class="btn" id="dlg-cancel" data-dialog-close>Cancel</button><button class="btn" id="dlg-save" data-variant="primary" data-dialog-close>Save</button></div>
  </dialog>
  <dialog class="panel float modal dialog" id="alert" role="alertdialog">
    <h2 class="dialog-title">Delete sandbox?</h2><p class="dialog-description">This cannot be undone.</p>
    <div class="dialog-actions"><button class="btn" id="al-del" data-variant="danger" data-dialog-close>Delete</button><button class="btn" id="al-cancel" data-dialog-close data-cancel>Cancel</button></div>
  </dialog>
  <dialog class="panel float modal sheet" id="sheet-r" data-side="right"><h2 class="dialog-title">Details</h2><p class="dialog-description">A side panel.</p><div class="dialog-actions"><button class="btn" data-dialog-close>Close</button></div></dialog>
  <dialog class="panel float modal sheet" id="sheet-l" data-side="left"><h2 class="dialog-title">Filters</h2><p class="dialog-description">A side panel.</p><div class="dialog-actions"><button class="btn" data-dialog-close>Close</button></div></dialog>
  <dialog class="panel float modal sheet" id="sheet-b" data-side="bottom"><h2 class="dialog-title">More</h2><p class="dialog-description">A bottom sheet.</p><div class="dialog-actions"><button class="btn" data-dialog-close>Close</button></div></dialog>
  <dialog class="panel float modal sheet" id="sheet-t" data-side="top" aria-label="Menu"><div class="sheet-band"><strong class="brand">Basalt</strong><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only aria-label="Close menu" data-dialog-close><span data-glyph="close"></span></button></div><div class="rows"><a class="row" href="#a"><span class="row-label">Docs</span></a></div></dialog>
</main>
<script>
Basalt.init();
window.entries = [
  { id: 'a', title: 'Deploy finished', description: 'api, production', time: '2m ago', status: 'success', unread: true },
  { id: 'b', title: 'Build failed', description: 'web, preview', time: '1h ago', status: 'danger', unread: true },
  { id: 'c', title: 'Invoice ready', time: 'Yesterday' }
];
window.picked = [];
window.centre = Basalt.notifications('#bell', { entries: window.entries, viewAllHref: '#all', onSelect: function (e) { window.picked.push(e.id); },
  onMarkAllRead: function () { window.entries = window.entries.map(function (e) { return Object.assign({}, e, { unread: false }); }); window.centre.setEntries(window.entries); } });
window.menuClicks = [];
document.getElementById('m-dup').addEventListener('click', function () { window.menuClicks.push('dup'); });
document.addEventListener('menuchange', function (e) { window.menuClicks.push('change:' + e.target.id); });
</script>`;

const html = compose(`<title>t</title>${BODY}<!-- basalt:use toast -->`, { fonts: false }).html;
const open = (options) => openHtml(browser, html, options);
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(count); }), n);
const resolve = (page, value, prop = "background-color") => page.evaluate(([v, p]) => {
  const probe = document.createElement("div"); probe.style.setProperty(p, v); document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(p); probe.remove(); return out;
}, [value, prop]);
const active = (page) => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
const isOpen = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return el.matches("dialog") ? el.open : el.matches(":popover-open"); }, sel);
const style = (page, sel, props, pseudo) => page.evaluate(([s, p, ps]) => { const c = getComputedStyle(document.querySelector(s), ps || undefined); return Object.fromEntries(p.map((n) => [n, c[n]])); }, [sel, props, pseudo]);
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }, sel);

for (const scheme of ["dark", "light"]) {
  describe(`dialog and alert dialog (${scheme})`, () => {
    test("focus moves in, wraps inside, Esc closes, and focus returns to the opener; the title names it; the level, rim and shadow are a modal's", async () => {
      const { page, context, errors } = await open({ scheme });
      await page.click("#open-dlg");
      await frames(page);
      assert.equal(await isOpen(page, "#dlg"), true);
      assert.equal(await page.evaluate(() => document.getElementById("dlg").matches(":modal")), true, "a real modal: the rest of the page is inert");
      assert.equal(await active(page), "dlg-cancel", "focus moves to the first control");
      assert.equal(await page.evaluate(() => { const d = document.getElementById("dlg"); return document.getElementById(d.getAttribute("aria-labelledby")).textContent; }), "Rename sandbox", "the title names it");
      assert.ok(await page.evaluate(() => document.getElementById("dlg").getAttribute("aria-describedby")), "the description describes it");
      // Tab wraps: from the last control to the first, and Shift+Tab from the first to the last (a bare <dialog> would let Tab leave).
      await page.keyboard.press("Tab"); assert.equal(await active(page), "dlg-save");
      await page.keyboard.press("Tab"); assert.equal(await active(page), "dlg-cancel", "wrapped to the first");
      await page.keyboard.press("Shift+Tab"); assert.equal(await active(page), "dlg-save", "wrapped to the last");
      // Level 1 above its scrim, what it holds level 2, the modal shadow, the 12px rim.
      await settle(page);
      const facts = await style(page, "#dlg", ["backgroundColor", "boxShadow", "borderTopLeftRadius", "borderTopWidth", "paddingTop", "width", "position"]);
      assert.equal(facts.backgroundColor, await resolve(page, "var(--basalt-surface-1)"));
      assert.equal((await style(page, "#inner", ["backgroundColor"])).backgroundColor, await resolve(page, "var(--basalt-surface-2)"), "what it holds starts at level 2");
      assert.equal(facts.boxShadow, await resolve(page, "var(--basalt-shadow-modal)", "box-shadow"));
      assert.deepEqual([facts.borderTopLeftRadius, facts.borderTopWidth, facts.paddingTop, facts.width, facts.position], ["12px", "1px", "24px", "480px", "fixed"]);
      assert.equal((await style(page, "#dlg", ["backgroundColor"], "::backdrop")).backgroundColor, await resolve(page, "var(--basalt-scrim)"), "the scrim is the backdrop");
      await page.keyboard.press("Escape");
      await frames(page, 4);
      assert.equal(await isOpen(page, "#dlg"), false);
      assert.equal(await active(page), "open-dlg", "focus returns to the opener");
      assert.deepEqual(errors, []);
      await context.close();
    });

    test("a press on the scrim closes a dialog but not one inside it; an alert dialog starts on its safe choice, ignores the scrim, and still closes on Esc", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#open-dlg");
      await page.mouse.click(720, 450); // inside the dialog's padding
      assert.equal(await isOpen(page, "#dlg"), true, "a press inside keeps it open");
      await page.mouse.click(10, 10);
      await frames(page, 4);
      assert.equal(await isOpen(page, "#dlg"), false, "a press on the scrim closes it");
      assert.equal(await active(page), "open-dlg");
      await page.click("#open-alert");
      assert.equal(await active(page), "al-cancel", "an alert dialog starts on the safe choice, though the destructive action comes first");
      await page.mouse.click(10, 10);
      await frames(page, 3);
      assert.equal(await isOpen(page, "#alert"), true, "the scrim never closes an alert dialog");
      await page.keyboard.press("Escape");
      await frames(page, 4);
      assert.equal(await isOpen(page, "#alert"), false);
      assert.equal(await active(page), "open-alert");
      await context.close();
    });

    test("it enters from .98 over duration-slow on ease-out and leaves at 0.75 on ease-in, and under reduced motion it only fades", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => Basalt.openDialog("#dlg"));
      await clock.advance(0);
      const during = async () => page.evaluate(() => { const c = getComputedStyle(document.getElementById("dlg")); return { opacity: Number(c.opacity), transform: c.transform }; });
      const start = await during();
      assert.ok(start.opacity < 0.2, `starts nearly clear: ${start.opacity}`);
      assert.notEqual(start.transform, "none", "and a little small");
      await clock.advance(100);
      const mid = await during();
      assert.ok(mid.opacity > start.opacity && mid.opacity < 1, `part way: ${mid.opacity}`);
      await clock.advance(120);
      assert.deepEqual(await during(), { opacity: 1, transform: "none" });
      // Closed, its rule is the exit: 0.75 of duration-slow on ease-in; open, the entry.
      await page.evaluate(() => document.getElementById("dlg").close());
      const exit = await page.evaluate(() => { const c = getComputedStyle(document.getElementById("dlg")); const p = document.createElement("i"); p.style.transitionTimingFunction = "var(--basalt-ease-in)"; document.body.append(p); const ease = getComputedStyle(p).transitionTimingFunction; p.remove(); return [c.transitionDuration.split(",")[0].trim(), c.transitionTimingFunction.startsWith(ease)]; });
      assert.deepEqual(exit, ["0.15s", true]);
      await clock.thaw();
      await context.close();
      const reduced = await open({ scheme, reducedMotion: "reduce" });
      await reduced.page.evaluate(() => Basalt.openDialog("#dlg"));
      await settle(reduced.page);
      const closedTransform = await reduced.page.evaluate(() => { document.getElementById("dlg").close(); return getComputedStyle(document.getElementById("dlg")).transform; });
      assert.equal(closedTransform, "none", "reduced motion: opacity only, the dialog never scales");
      await reduced.context.close();
    });
  });

  describe(`sheets (${scheme})`, () => {
    for (const [side, id, opener] of [["right", "sheet-r", "open-r"], ["left", "sheet-l", "open-l"], ["bottom", "sheet-b", "open-b"], ["top", "sheet-t", "open-t"]]) {
      test(`the ${side} sheet is a modal at level 1 on its edge, with the rim only where it meets the page; Esc closes it and focus returns`, async () => {
        const { page, context } = await open({ scheme });
        await page.click(`#${opener}`);
        await settle(page);
        const r = await rect(page, `#${id}`);
        const c = await style(page, `#${id}`, ["backgroundColor", "boxShadow", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderBottomLeftRadius", "borderTopLeftRadius", "transform"]);
        assert.equal(c.backgroundColor, await resolve(page, "var(--basalt-surface-1)"));
        assert.equal(c.boxShadow, await resolve(page, "var(--basalt-shadow-modal)", "box-shadow"));
        assert.equal(c.transform, "none");
        const edge = { right: [r.right === 1440, r.top === 0 && r.bottom === 900, r.width === 440, ["0px", "0px", "0px", "1px"]], left: [r.left === 0, r.top === 0 && r.bottom === 900, r.width === 440, ["0px", "1px", "0px", "0px"]], bottom: [r.bottom === 900 && r.left === 0 && r.right === 1440, true, true, ["1px", "0px", "0px", "0px"]], top: [r.top === 0 && r.left === 0 && r.right === 1440, true, true, ["0px", "0px", "1px", "0px"]] }[side];
        assert.deepEqual(edge.slice(0, 3), [true, true, true], JSON.stringify(r));
        assert.deepEqual([c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth], edge[3], "the rim is the inner edge only");
        assert.equal(c.borderBottomLeftRadius, side === "top" ? "16px" : "0px");
        if (side === "bottom") assert.deepEqual([c.borderTopLeftRadius, r.height <= 810], ["16px", true], "16px top corners, at most 90dvh");
        await page.keyboard.press("Escape");
        await frames(page, 6);
        assert.equal(await isOpen(page, `#${id}`), false);
        assert.equal(await active(page), opener);
        await context.close();
      });
    }

    test("a sheet slides in over duration-slower on ease-out and its scrim fades; the top sheet unrolls from the bar's edge as a clip; reduced motion only fades", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => Basalt.openDialog("#sheet-r"));
      await clock.advance(0);
      const at = () => page.evaluate(() => { const r = document.getElementById("sheet-r").getBoundingClientRect(); return { left: r.left, opacity: Number(getComputedStyle(document.getElementById("sheet-r")).opacity), backdrop: Number(getComputedStyle(document.getElementById("sheet-r"), "::backdrop").opacity) }; });
      const first = await at();
      assert.ok(first.left > 1300, `starts off the edge: ${first.left}`);
      assert.equal(first.opacity, 1, "it slides, it does not fade");
      await clock.advance(150);
      const half = await at();
      assert.ok(half.left < first.left && half.left > 1000, `part way: ${half.left}`);
      assert.ok(half.backdrop > first.backdrop, "its scrim fades in");
      await clock.advance(200);
      assert.equal((await at()).left, 1000, "at rest: 440 from the edge");
      await page.evaluate(() => document.getElementById("sheet-r").close());
      const exit = await page.evaluate(() => getComputedStyle(document.getElementById("sheet-r")).transitionDuration.split(",")[0].trim());
      assert.equal(exit, "0.225s", "0.75 of duration-slower");
      await page.evaluate(() => Basalt.openDialog("#sheet-t"));
      await clock.advance(0);
      const top = await page.evaluate(() => getComputedStyle(document.getElementById("sheet-t")).clipPath);
      assert.match(top, /^inset\(/, "the top sheet unrolls as a clip");
      await clock.advance(400);
      await clock.thaw();
      await context.close();
      const reduced = await open({ scheme, reducedMotion: "reduce" });
      await reduced.page.evaluate(() => Basalt.openDialog("#sheet-t"));
      await settle(reduced.page);
      const o = await reduced.page.evaluate(() => { const open = getComputedStyle(document.getElementById("sheet-t")); document.getElementById("sheet-t").close(); return [open.clipPath, open.transform]; });
      await settle(reduced.page);
      const rm = await reduced.page.evaluate((o) => { const c = getComputedStyle(document.getElementById("sheet-t")); return [o, c.clipPath, c.transform, c.opacity]; }, o);
      assert.deepEqual(rm, [["none", "none"], "none", "none", "0"], "reduced motion: no clip, no slide, opacity only");
      await reduced.context.close();
    });
  });

  describe(`popover (${scheme})`, () => {
    test("it opens beside its opener, moves focus in, closes on Esc with focus back on the opener, and closes on an outside press or when focus leaves", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#open-pop");
      await settle(page);
      assert.equal(await isOpen(page, "#pop"), true);
      assert.equal(await active(page), "pop-btn", "focus moves in, to the first control");
      assert.equal(await page.evaluate(() => document.getElementById("open-pop").getAttribute("aria-expanded")), "true");
      const gap = await page.evaluate(() => document.getElementById("pop").getBoundingClientRect().top - document.getElementById("open-pop").getBoundingClientRect().bottom);
      assert.equal(gap, 6, "6px below the opener");
      assert.equal(await page.evaluate(() => document.getElementById("pop").getAttribute("aria-labelledby") === document.querySelector("#pop .popover-title").id), true, "a title names it");
      assert.equal((await style(page, "#pop", ["backgroundColor", "boxShadow"])).backgroundColor, await resolve(page, "var(--basalt-surface-1)"), "from the page: level 1");
      await page.keyboard.press("Escape");
      await frames(page, 4);
      assert.equal(await isOpen(page, "#pop"), false);
      assert.equal(await active(page), "open-pop", "focus returns to the opener");
      assert.equal(await page.evaluate(() => document.getElementById("open-pop").getAttribute("aria-expanded")), "false");
      await page.click("#open-pop");
      await page.mouse.click(5, 800);
      await frames(page, 3);
      assert.equal(await isOpen(page, "#pop"), false, "an outside press dismisses it");
      await page.click("#open-pop");
      await frames(page, 3);
      await page.evaluate(() => document.getElementById("plain").focus());
      await frames(page, 3);
      assert.equal(await isOpen(page, "#pop"), false, "focus leaving closes it");
      await context.close();
    });

    test("a popup keeps Base UI's default collision padding from the window's edge, 5px (React's popups don't override it), and takes the other alignment before it is pushed back", async () => {
      const { page, context } = await open({ scheme });
      await page.evaluate(() => { const b = document.getElementById("open-pop"); b.style.cssText = "position: fixed; right: 0; top: 200px"; });
      await page.click("#open-pop");
      await settle(page);
      const r = await rect(page, "#pop");
      assert.ok(Math.abs(1440 - r.right - 5) < 1, `5px from the right edge: ${1440 - r.right}`);
      await page.keyboard.press("Escape");
      await page.evaluate(() => { const b = document.getElementById("open-pop"); b.style.cssText = "position: fixed; left: 40px; top: 200px"; document.getElementById("pop").dataset.align = "end"; });
      await page.click("#open-pop");
      await settle(page);
      const flipped = await page.evaluate(() => document.getElementById("pop").getBoundingClientRect().left - document.getElementById("open-pop").getBoundingClientRect().left);
      assert.equal(flipped, 0, "end does not fit, so it takes start rather than being pushed");
      await context.close();
    });

    test("a popup is its opener's level plus one: from the page level 1, from inside a card level 2", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#open-card-pop");
      await settle(page);
      assert.equal((await style(page, "#card-pop", ["backgroundColor"])).backgroundColor, await resolve(page, "var(--basalt-surface-2)"));
      await context.close();
    });

    test("it grows from .98 over duration-base on ease-out and leaves at 0.75 on ease-in; reduced motion fades only", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => document.getElementById("pop").showPopover({ source: document.getElementById("open-pop") }));
      await clock.advance(0);
      const read = () => page.evaluate(() => { const c = getComputedStyle(document.getElementById("pop")); return { o: Number(c.opacity), t: c.transform }; });
      const a = await read();
      assert.ok(a.o < 0.2 && a.t !== "none", JSON.stringify(a));
      await clock.advance(200);
      assert.deepEqual(await read(), { o: 1, t: "none" });
      const exit = await page.evaluate(() => { document.getElementById("pop").hidePopover(); return getComputedStyle(document.getElementById("pop")).transitionDuration.split(",")[0].trim(); });
      assert.equal(exit, "0.1125s", "0.75 of duration-base");
      await clock.thaw();
      await context.close();
      const reduced = await open({ scheme, reducedMotion: "reduce" });
      const t = await reduced.page.evaluate(() => { const p = document.getElementById("pop"); p.hidePopover?.(); return getComputedStyle(p).transform; });
      assert.equal(t, "none");
      await reduced.context.close();
    });
  });

  describe(`menu (${scheme})`, () => {
    const lit = (page) => page.evaluate(() => document.querySelector("#menu [data-highlighted]")?.id ?? null);

    test("ArrowDown on the opener opens it on the first row, the arrow keys, Home and End move the lit row (focus on it), and the list loops", async () => {
      const { page, context } = await open({ scheme });
      await page.focus("#open-menu");
      await page.keyboard.press("ArrowDown");
      await frames(page, 3);
      assert.equal(await isOpen(page, "#menu"), true);
      assert.equal(await lit(page), "m-dup", "the first row is lit when a key opens it");
      assert.equal(await active(page), "m-dup", "and has focus");
      for (const [key, id] of [["ArrowDown", "m-name"], ["ArrowDown", "m-date"], ["ArrowDown", "m-hidden"], ["ArrowDown", "m-del"], ["ArrowDown", "m-dup"], ["ArrowUp", "m-del"], ["Home", "m-dup"], ["End", "m-del"]]) {
        await page.keyboard.press(key);
        assert.equal(await lit(page), id, key);
        assert.equal(await active(page), id);
      }
      assert.equal(await page.evaluate(() => document.querySelectorAll("#menu [data-highlighted]").length), 1, "one lit row at a time");
      await page.keyboard.press("Escape");
      await frames(page, 4);
      assert.equal(await isOpen(page, "#menu"), false);
      assert.equal(await active(page), "open-menu", "focus returns to the opener");
      await page.focus("#open-menu");
      await page.keyboard.press("ArrowUp");
      await frames(page, 3);
      assert.equal(await lit(page), "m-del", "ArrowUp opens it on the last row");
      await context.close();
    });

    test("typeahead lights the row that starts with what is typed, and typing a letter again steps through the rows that start with it", async () => {
      const { page, context } = await open({ scheme });
      await page.focus("#open-menu");
      await page.keyboard.press("ArrowDown");
      await frames(page, 3);
      const clock = await freezeAnimations(page);
      await page.keyboard.press("s");
      assert.equal(await lit(page), "m-hidden", "'s' finds Show hidden");
      await clock.advance(600);
      await page.keyboard.press("d");
      assert.equal(await lit(page), "m-del", "'d' steps to the next row starting with d");
      await page.keyboard.press("d");
      assert.equal(await lit(page), "m-dup", "and again, round the list");
      await page.keyboard.press("d");
      assert.equal(await lit(page), "m-date", "and again");
      await page.keyboard.press("e");
      assert.equal(await lit(page), "m-date", "letters typed together are one prefix: 'dde' matches nothing, so the lit row stays");
      await clock.advance(600);
      await page.keyboard.type("de");
      assert.equal(await lit(page), "m-del", "after the pause, 'de' narrows to Delete");
      await clock.thaw();
      await context.close();
    });

    test("a plain item closes the menu; a checkbox flips and a radio picks one, both leaving it open; Tab closes", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#open-menu");
      await page.click("#m-hidden");
      assert.equal(await page.getAttribute("#m-hidden", "aria-checked"), "true");
      assert.equal(await isOpen(page, "#menu"), true, "a checkbox leaves it open");
      await page.click("#m-hidden");
      assert.equal(await page.getAttribute("#m-hidden", "aria-checked"), "false");
      await page.click("#m-date");
      assert.deepEqual([await page.getAttribute("#m-name", "aria-checked"), await page.getAttribute("#m-date", "aria-checked")], ["false", "true"], "a radio picks one");
      assert.equal(await isOpen(page, "#menu"), true);
      assert.deepEqual(await page.evaluate(() => window.menuClicks), ["change:m-hidden", "change:m-hidden", "change:m-date"]);
      await page.click("#m-dup");
      await frames(page, 4);
      assert.equal(await isOpen(page, "#menu"), false, "an item closes it");
      assert.equal((await page.evaluate(() => window.menuClicks)).pop(), "dup", "and its own click ran");
      assert.equal(await active(page), "open-menu");
      await page.click("#open-menu");
      await frames(page, 3);
      await page.keyboard.press("Tab");
      await frames(page, 3);
      assert.equal(await isOpen(page, "#menu"), false, "Tab closes it");
      await context.close();
    });

    test("the rows: a 40px hit area with a 36px plate at radius 8, secondary ink lifting to primary on the lit row; a two-line row is 58; a checked radio has its dot; danger keeps its colour", async () => {
      const { page, context } = await open({ scheme, reducedMotion: "reduce" });
      await page.focus("#open-menu");
      await page.keyboard.press("ArrowDown");
      await frames(page, 3);
      await page.keyboard.press("ArrowDown");
      const row = (id) => page.evaluate((i) => { const e = document.getElementById(i); const c = getComputedStyle(e); const p = getComputedStyle(e, "::before"); return { h: e.getBoundingClientRect().height, color: c.color, weight: c.fontWeight, plate: [p.top, p.height, p.borderTopLeftRadius, p.backgroundColor] }; }, id);
      const litRow = await row("m-name");
      const rest = await row("m-hidden");
      assert.equal(rest.h, 40);
      assert.deepEqual(rest.plate, ["2px", "36px", "8px", "rgba(0, 0, 0, 0)"]);
      assert.equal(rest.color, await resolve(page, "var(--basalt-text-secondary)", "color"));
      assert.equal(litRow.color, await resolve(page, "var(--basalt-text-primary)", "color"));
      assert.equal(litRow.weight, rest.weight, "no weight change");
      const plate = scheme === "dark" ? "color-mix(in srgb, var(--basalt-neutral-100) 9%, var(--basalt-surface-2))" : "var(--basalt-state-selected)";
      assert.equal(litRow.plate[3], await resolve(page, plate), "one solid fill: the next level plus the wash in dark, the wash in light");
      assert.equal((await row("m-date")).h, 58, "a two-line row: the title line, the description line");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#m-date .menu-item-description")).color), await resolve(page, "var(--basalt-text-tertiary)", "color"), "the description is tertiary at rest");
      assert.equal(await page.evaluate(() => document.querySelector("#m-name .menu-check > *").getBoundingClientRect().width > 0), true, "a checked radio shows its dot");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#m-date .menu-check > *")).visibility), "hidden", "and an unchecked one does not");
      await page.keyboard.press("End");
      assert.equal((await row("m-del")).color, await resolve(page, "var(--basalt-status-danger)", "color"));
      await context.close();
    });

    test("one shared plate glides between rows where hover is real: a pointer travels it, a key moves it at once, and it matches the lit row's own plate", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#open-menu");
      await settle(page);
      const plate = () => page.evaluate(() => { const p = document.querySelector("#menu > .plate"); const c = getComputedStyle(p); const r = p.getBoundingClientRect(); return { display: c.display, state: p.dataset.state, top: r.top, height: r.height, width: r.width, glide: document.getElementById("menu").hasAttribute("data-glide") }; });
      assert.equal((await plate()).glide, true);
      await page.hover("#m-name");
      await frames(page, 3);
      await settle(page);
      const at = await plate();
      const own = await page.evaluate(() => { const r = document.getElementById("m-name").getBoundingClientRect(); return { top: r.top + 2, height: 36, width: r.width }; });
      assert.deepEqual([at.display, at.state], ["block", "on"]);
      assert.ok(Math.abs(at.top - own.top) < 0.5 && at.height === own.height && Math.abs(at.width - own.width) < 0.5, `${JSON.stringify(at)} vs ${JSON.stringify(own)}`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("m-name"), "::before").backgroundColor), "rgba(0, 0, 0, 0)", "the row's own plate steps aside while the shared one is live");
      const clock = await freezeAnimations(page);
      await page.hover("#m-hidden");
      await clock.advance(40);
      const mid = await plate();
      const to = await page.evaluate(() => document.getElementById("m-hidden").getBoundingClientRect().top + 2);
      assert.ok(mid.top < to - 1 && mid.top > at.top, `part way between rows: ${mid.top} (from ${at.top} to ${to})`);
      await clock.advance(200);
      assert.ok(Math.abs((await plate()).top - to) < 0.5);
      await page.keyboard.press("ArrowDown");
      await clock.advance(0);
      const next = await page.evaluate(() => document.querySelector("#menu [data-highlighted]").id);
      const key = await plate();
      const target = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + 2, next);
      assert.ok(Math.abs(key.top - target) < 0.5, "a key moves it at once");
      await clock.thaw();
      await context.close();
    });
  });

  describe(`tooltip (${scheme})`, () => {
    test("hover shows it after the wait, focus at once, and Esc, leaving or pressing dismisses it; the pointer can move onto it; it describes its trigger while it shows", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      const shown = () => page.evaluate(() => document.getElementById("bh-tooltip")?.matches(":popover-open") ?? false);
      await page.hover("#tip");
      await clock.advance(500);
      assert.equal(await shown(), false, "not yet");
      await clock.advance(120);
      assert.equal(await shown(), true, "after 600ms");
      const t = await page.evaluate(() => { const e = document.getElementById("bh-tooltip"); return { role: e.getAttribute("role"), text: e.firstChild.textContent + e.querySelector(".visually-hidden").textContent, by: document.getElementById("tip").getAttribute("aria-describedby"), keys: document.getElementById("tip").getAttribute("aria-keyshortcuts"), chips: e.querySelectorAll(".kbd").length }; });
      assert.deepEqual(t, { role: "tooltip", text: "Copy (Command C)", by: "bh-tooltip", keys: "Meta+C", chips: 2 });
      // Hoverable (WCAG 1.4.13): onto the tooltip and it stays.
      const box = await rect(page, "#bh-tooltip");
      await page.mouse.move(box.left + box.width / 2, box.top + box.height / 2);
      await clock.advance(100);
      assert.equal(await shown(), true, "it stays while the pointer is on it");
      await page.mouse.move(5, 600);
      await clock.advance(50);
      assert.equal(await shown(), false, "it goes when the pointer leaves both");
      assert.equal(await page.evaluate(() => document.getElementById("tip").hasAttribute("aria-describedby")), false, "and stops describing");
      // Keyboard: focus shows it at once, and Esc dismisses it without moving focus (WCAG 1.4.13).
      await page.focus("#plain");
      await page.keyboard.press("Shift+Tab");
      await clock.advance(10);
      assert.equal(await active(page), "tip");
      assert.equal(await shown(), true, "keyboard focus shows it at once");
      await page.keyboard.press("Escape");
      await clock.advance(10);
      assert.equal(await shown(), false, "Esc dismisses it");
      assert.equal(await active(page), "tip", "focus stays");
      await clock.thaw();
      await context.close();
    });

    test("it is level 3 with a 6px radius and the rim, grows from .98 over duration-base, and never shows on touch", async () => {
      const { page, context } = await open({ scheme });
      await page.focus("#plain");
      await page.keyboard.press("Shift+Tab");
      await settle(page);
      const c = await style(page, "#bh-tooltip", ["backgroundColor", "borderTopLeftRadius", "borderTopWidth", "paddingTop", "paddingLeft", "fontSize", "lineHeight", "maxWidth"]);
      assert.equal(c.backgroundColor, await resolve(page, "var(--basalt-surface-3)"), "always level 3");
      assert.deepEqual([c.borderTopLeftRadius, c.borderTopWidth, c.paddingTop, c.paddingLeft, c.fontSize, c.lineHeight, c.maxWidth], ["6px", "1px", "4px", "8px", "12px", "16px", "280px"]);
      await context.close();
      const touch = await open({ scheme, touch: true, width: 390 });
      const clock = await freezeAnimations(touch.page);
      await touch.page.tap("#tip");
      await clock.advance(1000);
      assert.equal(await touch.page.evaluate(() => document.getElementById("bh-tooltip")?.matches(":popover-open") ?? false), false, "no tooltip on touch");
      await clock.thaw();
      await touch.context.close();
    });
  });

  describe(`toasts (${scheme})`, () => {
    const texts = (page) => page.evaluate(() => [...document.querySelectorAll(".toast .toast-title")].map((t) => t.textContent));
    const live = (page) => page.evaluate(() => ({ polite: document.getElementById("basalt-live")?.textContent ?? "", alert: document.querySelector('[role="alert"]')?.textContent ?? "" }));

    test("a toast is announced once, danger assertively and the rest through the live region; the stack is a named region in the top layer, level 1 with the rim and the overlay shadow", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => { Basalt.toast({ title: "Saved", description: "to disk", status: "success", home: "page" }); });
      await clock.advance(100);
      assert.equal((await live(page)).polite, "Saved. to disk");
      await page.evaluate(() => { Basalt.toast({ title: "Build failed", status: "danger" }); });
      await clock.advance(100);
      assert.equal((await live(page)).alert, "Build failed", "danger is assertive");
      assert.equal((await live(page)).polite, "Saved. to disk", "and is not said twice politely");
      const facts = await page.evaluate(() => { const v = document.querySelector(".toast-viewport"); const t = document.querySelector(".toast"); const c = getComputedStyle(t); return { region: [v.getAttribute("role"), v.getAttribute("aria-label")], top: v.matches(":popover-open"), bg: c.backgroundColor, shadow: c.boxShadow, rim: c.borderTopWidth, live: v.getAttribute("aria-live"), tab: t.tabIndex }; });
      assert.deepEqual([facts.region, facts.top, facts.rim, facts.live, facts.tab], [["region", "Notifications"], true, "1px", "off", 0]);
      assert.equal(facts.shadow, await resolve(page, "var(--basalt-shadow-overlay)", "box-shadow"));
      await clock.advance(400);
      assert.equal((await style(page, ".toast:last-of-type", ["backgroundColor"])).backgroundColor, await resolve(page, "var(--basalt-surface-1)"));
      await clock.thaw();
      await context.close();
    });

    test("a toast with no home stays until dismissed; one with a home closes after 5000ms, and hover or focus holds its clock", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => { Basalt.toast({ title: "Only copy" }); Basalt.toast({ title: "Echo", home: "page" }); });
      await clock.advance(300);
      assert.deepEqual((await texts(page)).sort(), ["Echo", "Only copy"]);
      assert.equal(await page.evaluate(() => document.querySelectorAll(".toast .toast-drain").length), 1, "only a toast that may time out draws its clock");
      await clock.advance(4000);
      assert.equal((await texts(page)).length, 2, "not yet");
      // Hover holds every clock.
      const box = await rect(page, ".toast");
      await page.mouse.move(box.left + 40, box.top + 20);
      await clock.advance(3000);
      assert.equal((await texts(page)).length, 2, "held while hovered");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".toast-drain")).animationPlayState), "paused", "and the drain line stops with it");
      await page.mouse.move(5, 5);
      await clock.advance(1200);
      assert.deepEqual(await texts(page), ["Only copy"], "closed after the rest of its 5000ms");
      await page.click(".toast-close");
      await clock.advance(600);
      assert.deepEqual(await texts(page), [], "dismissed");
      await clock.thaw();
      await context.close();
    });

    test("three stack with the ones behind peeking and the stack expands on hover; a fourth that must stay waits for room; repeats of a group count; a danger toast never groups", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => { for (const t of ["One", "Two", "Three", "Four"]) Basalt.toast({ title: t }); });
      await clock.advance(600);
      assert.deepEqual((await texts(page)).sort(), ["One", "Three", "Two"], "three on screen");
      assert.equal(await page.evaluate(() => document.querySelectorAll(".toast").length), 3, "the fourth waits for room: none of the three may time out");
      const geometry = () => page.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => ({ title: t.querySelector(".toast-title").textContent, index: t.style.getPropertyValue("--toast-index"), behind: t.querySelector(".toast-content").hasAttribute("data-behind"), top: t.getBoundingClientRect().top })));
      const stack = await geometry();
      const byIndex = [...stack].sort((a, b) => Number(a.index) - Number(b.index));
      assert.deepEqual(byIndex.map((t) => t.title), ["Three", "Two", "One"], "newest in front");
      assert.deepEqual(byIndex.map((t) => t.behind), [false, true, true], "the content of those behind is hidden");
      assert.ok(byIndex[1].top < byIndex[0].top && byIndex[2].top < byIndex[1].top, "the ones behind peek above");
      const box = await rect(page, `.toast[style*="--toast-index: 0"]`);
      await page.mouse.move(box.left + 40, box.top + 20);
      await clock.advance(400);
      const open3 = await geometry();
      assert.ok(open3.every((t) => !t.behind), "hover expands the stack: every toast is readable");
      await page.mouse.move(5, 5);
      await page.click(`.toast[style*="--toast-index: 0"] .toast-close`);
      await clock.advance(800);
      assert.deepEqual((await texts(page)).sort(), ["Four", "One", "Two"], "room appeared: the fourth entered");
      await page.evaluate(() => { for (const t of [...document.querySelectorAll(".toast-close")]) t.click(); });
      await clock.advance(800);
      await page.evaluate(() => { Basalt.toast({ title: "Copied", group: "copy", home: "page" }); Basalt.toast({ title: "Copied", group: "copy", home: "page" }); Basalt.toast({ title: "Oops", status: "danger", group: "e" }); Basalt.toast({ title: "Oops", status: "danger", group: "e" }); });
      await clock.advance(400);
      assert.deepEqual((await texts(page)).map((t) => t.replace(/×\d/, "").replace(/, \d times/, "")).sort(), ["Copied", "Oops", "Oops"]);
      assert.equal(await page.evaluate(() => document.querySelectorAll(".toast").length), 3, "one grouped toast and two danger toasts: an error never groups");
      assert.ok(await page.evaluate(() => [...document.querySelectorAll(".toast-count")].some((c) => c.textContent === "×2")), "repeats count");
      await clock.thaw();
      await context.close();
    });

    test("running work shows braille in the mark seat and is not announced, and its result takes the seat; a promise is one toast from work to result", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      const id = await page.evaluate(() => Basalt.toast({ title: "Deploying", running: true }));
      await clock.advance(300);
      assert.equal(await page.evaluate(() => !!document.querySelector(".toast .toast-seat braille-spinner")), true);
      assert.equal((await live(page)).polite, "", "running work is not announced");
      assert.equal(await page.evaluate(() => document.querySelectorAll(".toast-drain").length), 0, "and has no clock");
      const before = await rect(page, ".toast-title");
      await page.evaluate((i) => Basalt.toast.update(i, { title: "Deployed", status: "success", home: "centre" }), id);
      await clock.advance(300);
      assert.equal((await live(page)).polite, "Deployed", "the result is announced");
      const afterRect = await rect(page, ".toast-title");
      assert.equal(afterRect.left, before.left, "the title never moves: the seat was kept for the result");
      assert.equal(await page.evaluate(() => !!document.querySelector(".toast .toast-seat svg")), true, "the mark replaces the spinner");
      await page.evaluate(() => { window.resolveIt = null; Basalt.toast.promise(new Promise((r) => { window.resolveIt = r; }), { running: "Saving", success: "Saved", error: "Failed" }); });
      await clock.advance(300);
      assert.deepEqual((await texts(page)).sort(), ["Deployed", "Saving"]);
      await page.evaluate(() => window.resolveIt());
      await clock.advance(300);
      assert.deepEqual((await texts(page)).sort(), ["Deployed", "Saved"], "one toast from work to result");
      await clock.thaw();
      await context.close();
    });

    test("swiping a toast to the right dismisses it past 60px and springs back before; a press on its buttons is not a swipe", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => Basalt.toast({ title: "Only copy" }));
      await clock.advance(300);
      const box = await rect(page, ".toast");
      await page.mouse.move(box.left + 40, box.top + 20);
      await page.mouse.down();
      await page.mouse.move(box.left + 70, box.top + 20);
      await clock.advance(50);
      assert.equal(await page.evaluate(() => document.querySelector(".toast").hasAttribute("data-swiping")), true);
      assert.equal(await page.evaluate(() => document.querySelector(".toast").style.getPropertyValue("--toast-swipe-movement-x")), "30px", "it follows the pointer");
      await page.mouse.up();
      await clock.advance(300);
      assert.equal(await page.evaluate(() => document.querySelectorAll(".toast").length), 1, "a short pull springs back");
      assert.equal(await page.evaluate(() => document.querySelector(".toast").style.getPropertyValue("--toast-swipe-movement-x")), "");
      await page.mouse.move(box.left + 40, box.top + 20);
      await page.mouse.down();
      await page.mouse.move(box.left + 160, box.top + 20);
      await page.mouse.up();
      assert.equal(await page.evaluate(() => document.querySelector(".toast").getAttribute("data-swipe-direction")), "right");
      await clock.advance(400);
      assert.equal(await page.evaluate(() => document.querySelectorAll(".toast").length), 0, "a long one dismisses it");
      await clock.thaw();
      await context.close();
    });

    test("it enters from below over duration-slow and leaves at 0.75 on ease-in; under reduced motion only its opacity moves", async () => {
      const { page, context } = await open({ scheme });
      const clock = await freezeAnimations(page);
      await page.evaluate(() => Basalt.toast({ title: "Hi" }));
      await clock.advance(0);
      const read = () => page.evaluate(() => { const c = getComputedStyle(document.querySelector(".toast")); const m = new DOMMatrixReadOnly(c.transform); return { o: Number(c.opacity), y: m.m42 }; });
      const a = await read();
      assert.ok(a.o < 0.2 && a.y > 20, JSON.stringify(a));
      await clock.advance(250);
      const z = await read();
      assert.equal(z.o, 1);
      assert.ok(Math.abs(z.y) < 1, `settled: ${z.y}`);
      const exit = await page.evaluate(() => { document.querySelector(".toast-close").click(); return getComputedStyle(document.querySelector(".toast")).transitionDuration.split(",")[0].trim(); });
      assert.equal(exit, "0.15s");
      await clock.advance(300);
      await clock.thaw();
      await context.close();
      const reduced = await open({ scheme, reducedMotion: "reduce" });
      await reduced.page.evaluate(() => Basalt.toast({ title: "Hi", home: "page" }));
      const rm = await reduced.page.evaluate(() => { const c = getComputedStyle(document.querySelector(".toast")); return [c.transitionProperty, document.querySelectorAll(".toast-drain").length ? getComputedStyle(document.querySelector(".toast-drain")).display : "none"]; });
      assert.deepEqual(rm, ["opacity", "none"], "opacity only, and the drain is not drawn");
      await reduced.context.close();
    });
  });

  describe(`notification centre (${scheme})`, () => {
    test("a bell with a dot while anything is unread, the count in its name and never drawn, and the same width either way; Mark all as read stays mounted and keeps focus", async () => {
      const { page, context } = await open({ scheme });
      assert.equal(await page.getAttribute("#bell > .btn", "aria-label"), "Notifications, 2 unread");
      const w = (await rect(page, "#bell > .btn")).width;
      assert.equal(w, 32);
      assert.equal(await page.evaluate(() => document.querySelector(".notifications-dot").hidden), false);
      await page.click("#bell > .btn");
      await settle(page);
      assert.equal(await isOpen(page, ".notifications"), true);
      assert.equal(await page.evaluate(() => document.querySelector(".notifications-count").textContent), "2 unread");
      await page.focus(".notifications-mark");
      await page.keyboard.press("Enter");
      await frames(page, 2);
      assert.equal(await page.getAttribute("#bell > .btn", "aria-label"), "Notifications");
      assert.equal(await page.evaluate(() => document.querySelector(".notifications-dot").hidden), true, "no unread: no dot");
      assert.equal((await rect(page, "#bell > .btn")).width, w, "the button never changes width");
      assert.equal(await page.getAttribute(".notifications-mark", "aria-disabled"), "true", "disabled in place");
      assert.equal(await page.evaluate(() => document.activeElement.className.includes("notifications-mark")), true, "and keeps focus");
      assert.equal(await page.evaluate(() => document.querySelectorAll(".notification[data-unread]").length), 0, "the rows changed ink");
      await context.close();
    });

    test("the four seats never move: reading a row changes ink and no geometry; an unread row is primary ink with a dot, a read one secondary with the dot's seat empty", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#bell > .btn");
      await settle(page);
      const geo = () => page.evaluate(() => [...document.querySelectorAll(".notification")].map((n) => [n.querySelector(".notification-title").getBoundingClientRect().left, n.querySelector(".notification-time").getBoundingClientRect().right, n.getBoundingClientRect().height]));
      const before = await geo();
      assert.deepEqual(before.map((g) => g[2]), [58, 58, 40], "58 with a line, 40 without");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".notification[data-unread] .notification-title")).color), await resolve(page, "var(--basalt-text-primary)", "color"));
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelectorAll(".notification")[2].querySelector(".notification-title")).color), await resolve(page, "var(--basalt-text-secondary)", "color"));
      await page.click(".notifications-mark");
      await frames(page, 2);
      assert.deepEqual(await geo(), before, "nothing moved");
      await context.close();
    });

    test("choosing an entry runs onSelect and closes the centre; Esc closes it and focus returns to the bell; an entry with an href is a link, one without a button", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#bell > .btn");
      await settle(page);
      assert.equal(await page.evaluate(() => document.querySelector(".notification").tagName), "BUTTON");
      assert.equal(await page.evaluate(() => document.querySelector(".notifications-foot a").getAttribute("href")), "#all");
      await page.click(".notification >> nth=1");
      await frames(page, 4);
      assert.deepEqual(await page.evaluate(() => window.picked), ["b"]);
      assert.equal(await isOpen(page, ".notifications"), false);
      await page.click("#bell > .btn");
      await page.keyboard.press("Escape");
      await frames(page, 4);
      assert.equal(await isOpen(page, ".notifications"), false);
      assert.equal(await page.evaluate(() => document.activeElement.parentElement.id), "bell", "focus returns to the bell");
      await context.close();
    });

    test("the glide: one plate follows the pointer between entries (40 or 58 tall), the first key hides it, and each entry's own plate is the fallback", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#bell > .btn");
      await settle(page);
      const plate = () => page.evaluate(() => { const p = document.querySelector(".notifications-scroll > .plate"); const r = p.getBoundingClientRect(); const s = document.querySelector(".notifications-scroll"); return { state: p.dataset.state, top: r.top, height: r.height, display: getComputedStyle(p).display, glide: s.hasAttribute("data-glide"), keys: s.hasAttribute("data-keys") }; });
      await page.hover(".notification >> nth=0");
      await settle(page);
      const first = await plate();
      assert.deepEqual([first.state, first.display, first.glide, first.height], ["on", "block", true, 54], "a 58px entry has a 54px plate");
      await page.hover(".notification >> nth=2");
      await settle(page);
      const third = await plate();
      assert.equal(third.height, 36, "and a 40px entry a 36px plate: it takes the entry's own shape");
      const own = await page.evaluate(() => { const r = document.querySelectorAll(".notification")[2].getBoundingClientRect(); return r.top + 2; });
      assert.ok(Math.abs(third.top - own) < 0.5);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelectorAll(".notification")[2], "::before").backgroundColor), "rgba(0, 0, 0, 0)", "its own plate steps aside");
      await page.keyboard.press("ArrowDown");
      await frames(page, 2);
      assert.equal((await plate()).keys, true, "the first key hides the resting hover");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelectorAll(".notification")[2], "::before").backgroundColor), "rgba(0, 0, 0, 0)");
      await context.close();
    });

    test("a focusable entry takes the control ring at +2, outside its plate, and the list keeps 6px from its clipping edge", async () => {
      const { page, context } = await open({ scheme });
      await page.click("#bell > .btn");
      await settle(page);
      await page.focus(".notifications-mark");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(() => { const n = document.activeElement; const c = getComputedStyle(n); const r = n.getBoundingClientRect(); const pb = getComputedStyle(n, "::before"); return { cls: n.className, width: c.outlineWidth, style: c.outlineStyle, offset: c.outlineOffset, color: c.outlineColor, plateInset: pb.top, room: [r.left - document.querySelector(".notifications-scroll").getBoundingClientRect().left, getComputedStyle(document.querySelector(".notifications-list")).paddingLeft] }; });
      assert.equal(ring.cls, "notification");
      assert.deepEqual([ring.width, ring.style, ring.offset], ["2px", "solid", "0px"], "+2 from the plate: the row's own box already holds the plate's 2px");
      assert.equal(ring.color, await resolve(page, "var(--basalt-border-focus)", "color"));
      assert.equal(ring.room[0], 6, "6px of room, so the ring is never cut");
      await context.close();
    });
  });
}

describe("scroll lock and toasts over a modal", () => {
  test("a modal pads the root's inline end by the measured scrollbar so nothing shifts on a classic scrollbar, and gives it back on close", async () => {
    const classic = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    try {
      const tall = compose(`<title>t</title>${BODY}<div style="height: 3000px"></div>`, { fonts: false }).html;
      const { page, context } = await openHtml(classic, tall, { scheme: "dark" });
      const bar = await page.evaluate(() => innerWidth - document.documentElement.clientWidth);
      assert.ok(bar > 0, `this browser draws a classic scrollbar (${bar}px)`);
      const left = () => page.evaluate(() => document.querySelector(".page").getBoundingClientRect().left);
      const before = await left();
      await page.evaluate(() => Basalt.openDialog("#dlg"));
      await settle(page);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).paddingInlineEnd), `${bar}px`, "the scrollbar's width, measured before it goes");
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflow), "hidden");
      assert.equal(await left(), before, "the page did not shift");
      await page.evaluate(() => Basalt.openDialog("#sheet-r"));
      await page.evaluate(() => document.getElementById("sheet-r").close());
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).paddingInlineEnd), `${bar}px`, "nested modals pad once, and the first still holds it");
      await page.keyboard.press("Escape");
      await settle(page);
      assert.equal(await page.evaluate(() => document.documentElement.style.paddingInlineEnd), "", "given back");
      assert.equal(await left(), before);
      await context.close();
    } finally { await classic.close(); }
  });

  test("a toast stays interactive over an open dialog, in the same place, and goes back to the page when the dialog closes", async () => {
    const { page, context } = await open({ scheme: "dark" });
    const clock = await freezeAnimations(page);
    await page.evaluate(() => Basalt.toast({ title: "Before" }));
    await clock.advance(400);
    const home = await rect(page, ".toast");
    await page.click("#open-dlg");
    await clock.advance(400);
    assert.equal(await page.evaluate(() => document.querySelector(".toast-viewport").parentNode.id), "dlg", "it lives in the open modal");
    assert.deepEqual(await rect(page, ".toast"), home, "level and place do not change");
    await page.evaluate(() => Basalt.toast({ title: "During", description: "over the dialog" }));
    await clock.advance(400);
    assert.equal(await page.evaluate(() => document.querySelector(".toast-viewport").matches(":popover-open")), true);
    const top = await page.evaluate(() => { const t = document.querySelector(".toast-close"); const r = t.getBoundingClientRect(); return t.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); });
    assert.equal(top, true, "it is on top, and the dialog's inertness does not reach it");
    await page.locator(".toast .toast-close").first().click({ timeout: 2000 });
    await clock.advance(400);
    assert.equal(await page.evaluate(() => document.querySelectorAll(".toast").length), 1, "its Dismiss works");
    await page.keyboard.press("Escape");
    await clock.advance(400);
    assert.equal(await page.evaluate(() => document.querySelector(".toast-viewport").parentNode === document.body), true, "back in the page");
    assert.equal(await page.evaluate(() => document.querySelectorAll(".toast").length), 1);
    assert.equal(await page.evaluate(() => document.querySelector(".toast-viewport").matches(":popover-open")), true);
    await clock.thaw();
    await context.close();
  });
});

describe("forced colours, reduced motion and touch", () => {
  test("in forced colours the lit menu row is Highlight with HighlightText, a hovered entry is too, and the rims and the toast's mark are system colours", async () => {
    const { page, context } = await open({ scheme: "dark" });
    await page.emulateMedia({ forcedColors: "active" });
    const sys = await page.evaluate(() => { const probe = document.createElement("div"); document.body.append(probe); const read = (v) => { probe.style.color = v; return getComputedStyle(probe).color; }; const out = { Highlight: read("Highlight"), HighlightText: read("HighlightText"), CanvasText: read("CanvasText") }; probe.remove(); return out; });
    await page.focus("#open-menu");
    await page.keyboard.press("ArrowDown");
    await frames(page, 3);
    const row = await page.evaluate(() => { const r = document.getElementById("m-dup"); return { color: getComputedStyle(r).color, plate: getComputedStyle(r, "::before").backgroundColor, kbd: getComputedStyle(r.querySelector(".kbd")).color, chip: getComputedStyle(r.querySelector(".kbd")).backgroundColor, glide: getComputedStyle(document.querySelector("#menu > .plate")).display }; });
    assert.deepEqual([row.color, row.plate, row.kbd, row.chip, row.glide], [sys.HighlightText, sys.Highlight, sys.HighlightText, sys.Highlight, "none"], "each row paints its own: no shared plate");
    await page.keyboard.press("Escape");
    await page.click("#bell > .btn");
    await page.hover(".notification >> nth=0");
    const entry = await page.evaluate(() => { const n = document.querySelector(".notification"); const c = getComputedStyle(n); return [c.backgroundColor, c.color, getComputedStyle(n.querySelector(".notification-title")).color, getComputedStyle(document.querySelector(".notifications-dot")).borderTopWidth]; });
    assert.deepEqual(entry, [sys.Highlight, sys.HighlightText, sys.HighlightText, "3px"], "the dot is drawn as a border");
    await page.keyboard.press("Escape");
    await page.evaluate(() => Basalt.toast({ title: "Done", status: "success", home: "page" }));
    await frames(page, 3);
    const toast = await page.evaluate(() => { const t = document.querySelector(".toast"); return [getComputedStyle(t).borderTopColor, getComputedStyle(t.querySelector(".toast-seat")).color, !!t.querySelector(".toast-seat svg")]; });
    assert.deepEqual(toast, [sys.CanvasText, sys.CanvasText, true], "the mark keeps its shape and takes the system colour");
    await page.click("#open-dlg", { force: true }).catch(() => {});
    await page.evaluate(() => Basalt.openDialog("#dlg"));
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("dlg")).borderTopColor), sys.CanvasText, "a dialog's rim is a real border");
    await context.close();
  });

  test("on touch a menu row is at least 44px, and the shortcut chips wait for a hardware key", async () => {
    const { page, context } = await open({ scheme: "dark", width: 390, touch: true });
    await page.tap("#open-menu");
    await settle(page);
    const heights = await page.evaluate(() => [...document.querySelectorAll("#menu .menu-item")].map((r) => r.getBoundingClientRect().height));
    assert.ok(heights.every((h) => h >= 44), heights.join(", "));
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#menu .kbd-group")).display), "none");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#menu > .plate")).display), "none", "no shared plate on touch");
    await context.close();
  });

  test("at 390 a dialog fits with 16px to spare and a sheet is the screen's width, and the page does not scroll sideways behind them", async () => {
    const { page, context } = await open({ scheme: "dark", width: 390 });
    await page.evaluate(() => Basalt.openDialog("#dlg"));
    await settle(page);
    const d = await rect(page, "#dlg");
    assert.deepEqual([d.left, 390 - d.right, d.width], [16, 16, 358]);
    await page.keyboard.press("Escape");
    await page.evaluate(() => Basalt.openDialog("#sheet-r"));
    await settle(page);
    const s = await rect(page, "#sheet-r");
    assert.deepEqual([s.left, s.right, s.width], [0, 390, 390], "min(440, 100%)");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 390), true);
    await context.close();
  });
});

describe("axe, in both themes and in forced colours", () => {
  const SHOW = {
    dialog: () => Basalt.openDialog("#dlg"),
    "alert dialog": () => Basalt.openDialog("#alert"),
    "right sheet": () => Basalt.openDialog("#sheet-r"),
    "bottom sheet": () => Basalt.openDialog("#sheet-b"),
    "top sheet": () => Basalt.openDialog("#sheet-t"),
    popover: () => document.getElementById("pop").showPopover({ source: document.getElementById("open-pop") }),
    menu: () => { document.getElementById("menu").showPopover({ source: document.getElementById("open-menu") }); },
    tooltip: () => document.getElementById("tip").focus(),
    toast: () => Basalt.toast({ title: "Saved", description: "to disk", status: "success", home: "page", action: { label: "Undo", onClick() {} } }),
    "notification centre": () => window.centre.open(),
  };
  for (const scheme of ["dark", "light"]) {
    for (const [name, show] of Object.entries(SHOW)) {
      test(`${name} (${scheme}) has no violations`, async () => {
        const { page, context } = await open({ scheme });
        if (name === "tooltip") await page.keyboard.press("Tab").then(() => page.focus("#plain")).then(() => page.keyboard.press("Shift+Tab"));
        else await page.evaluate(show);
        await settle(page);
        assert.deepEqual(await axeViolations(page), []);
        await context.close();
      });
    }
  }
  for (const [name, show] of Object.entries(SHOW)) {
    test(`${name} in forced colours has no violations (colour contrast is the system's there)`, async () => {
      const { page, context } = await open({ scheme: "dark" });
      await page.emulateMedia({ forcedColors: "active" });
      if (name === "tooltip") await page.focus("#plain").then(() => page.keyboard.press("Shift+Tab"));
      else await page.evaluate(show);
      await settle(page);
      assert.deepEqual(await axeViolations(page, { ...AXE, rules: { "color-contrast": { enabled: false } } }), []);
      await context.close();
    });
  }
});
