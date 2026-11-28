// Micro-details m1 in the HTML skill (DECISIONS 405, 409): the pressable set's user-select, touch-action and tap highlight; hover paint only where a
// pointer hovers (the bare link first); one cursor convention; the press paint (the choice inputs, a tab, a segment, the select, the file field, the plain
// disclosure's chevron, which now rests at secondary ink); the touch mark data-pressing on a popup's rows from _.glide; the core's passive touchstart; a
// wrapped choice's mark on its first line; the small nav's start inset. Composed pages in Chromium, both themes. Synthetic data (a seed library and a
// ferry timetable).
// Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>m1</title>${body}`, { fonts: false }).html;
const style = (p, selector, props, pseudo = null) => p.evaluate(([s, k, ps]) => { const cs = getComputedStyle(document.querySelector(s), ps); return Object.fromEntries(k.map((n) => [n, cs.getPropertyValue(n)])); }, [selector, props, pseudo]);
const resolve = (p, css) => p.evaluate((c) => { const x = document.createElement("canvas").getContext("2d"); x.fillStyle = "#000"; x.fillStyle = c; return x.fillStyle; }, css);
const token = (p, name) => p.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const centre = (p, selector) => p.locator(selector).first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
async function pressed(p, selector, read) {
  const { x, y } = await centre(p, selector);
  await p.mouse.move(x, y); await p.mouse.down();
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  try { return await read(); } finally { await p.mouse.up(); }
}

const LONG = "Send me the spring sowing calendar, the frost dates for my district and a reminder when the seed potatoes ship";
const BODY = `<main class="page"><div class="stack" style="width: 520px">
  <button class="btn" id="btn">Order seeds</button>
  <div role="tablist" aria-label="Views"><button class="tab" role="tab" aria-selected="true">Packets</button><button class="tab" role="tab" aria-selected="false" id="tab-b">Bulk</button><button class="tab" role="tab" aria-selected="false" disabled id="tab-off">Archive</button></div>
  <div class="segment" role="group" aria-label="Crossing"><button aria-pressed="true">Morning</button><button aria-pressed="false" id="seg-pm">Evening</button><button aria-pressed="false" disabled id="seg-off">Night</button></div>
  <label class="choice" id="cb-label"><input type="checkbox" id="cb"> Heirloom only</label>
  <label class="choice"><input type="checkbox" id="cb-on" checked> Organic</label>
  <label class="choice" id="wrap" style="width: 300px"><input type="checkbox" id="cb-wrap"> ${LONG}</label>
  <label class="choice" style="width: 300px"><input type="checkbox" role="switch" id="sw-wrap"> ${LONG}</label>
  <div class="radio-group" role="radiogroup" aria-label="Sailing"><label class="choice"><input type="radio" name="s" id="ra" checked> 07:40</label></div>
  <div class="radio-group" role="radiogroup" aria-label="Return"><label class="choice"><input type="radio" name="r" id="rb"> 17:10</label><label class="choice"><input type="radio" name="r"> 18:40</label></div>
  <label id="bare"><input type="checkbox"> A bare label</label>
  <div class="field"><label for="pier">Pier</label><div class="select"><select class="input" id="pier"><option value="">Choose a pier</option><option value="n">North pier</option></select></div></div>
  <span class="file-field"><input type="file" id="file" aria-label="Photo"></span>
  <button class="disclosure" data-disclosure aria-expanded="false" aria-controls="more" id="disc">Timetable</button><div id="more" hidden>Fewer sailings in winter.</div>
  <button class="disclosure" data-prose data-disclosure aria-expanded="false" aria-controls="more2" id="prose">Why the 07:40 is late</button><div id="more2" hidden>Tides.</div>
  <p>Read the <a href="#guide" id="link">sowing guide</a> first.</p>
  <input class="input" id="field" aria-label="Notes">
</div></main>`;

for (const scheme of ["dark", "light"]) {
  describe(`the skill (${scheme})`, () => {
    test("the pressable set: no selection, touch-action manipulation, a transparent tap highlight; a bare label gets none; a field gets no touch-action", async () => {
      for (const touch of [false, true]) {
        const { page: p, context } = await openHtml(browser, html(BODY), { scheme, touch, width: touch ? 390 : 1440 });
        for (const sel of ["#btn", "#tab-b", "#seg-pm", "#cb-label", "#disc", "select#pier", ".file-field"]) {
          const s = await style(p, sel, ["user-select", "-webkit-user-select", "touch-action", "-webkit-tap-highlight-color"]);
          assert.equal(s["user-select"], "none", sel);
          assert.equal(s["-webkit-user-select"], "none", sel);
          assert.equal(s["touch-action"], "manipulation", sel);
          assert.equal(s["-webkit-tap-highlight-color"], "rgba(0, 0, 0, 0)", sel);
        }
        assert.notEqual((await style(p, "#bare", ["user-select"]))["user-select"], "none", "a bare label is not a control");
        assert.equal((await style(p, "#bare", ["touch-action"]))["touch-action"], "auto");
        assert.equal((await style(p, "#field", ["touch-action"]))["touch-action"], "auto");
        assert.equal((await style(p, "#link", ["-webkit-tap-highlight-color"]))["-webkit-tap-highlight-color"], "rgba(0, 0, 0, 0)");
        await context.close();
      }
    });

    test("cursors: a disabled tab, segment and disclosure are not-allowed", async () => {
      const { page: p, context } = await openHtml(browser, html(BODY), { scheme });
      for (const sel of ["#tab-off", "#seg-off"]) assert.equal((await style(p, sel, ["cursor"])).cursor, "not-allowed", sel);
      await p.evaluate(() => { document.getElementById("disc").disabled = true; });
      assert.equal((await style(p, "#disc", ["cursor"])).cursor, "not-allowed");
      await context.close();
    });

    test("the bare link's underline does not brighten where nothing hovers, and does on a press", async () => {
      const { page: p, context } = await openHtml(browser, html(BODY), { scheme, touch: true, width: 390 });
      const cdp = await context.newCDPSession(p);
      await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
      const { root } = await cdp.send("DOM.getDocument");
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#link" });
      const rest = await style(p, "#link", ["text-decoration-color"]);
      await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["hover"] });
      assert.deepEqual(await style(p, "#link", ["text-decoration-color"]), rest, "hover: none paints nothing");
      await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
      const press = await style(p, "#link", ["text-decoration-color", "color"]);
      assert.equal(press["text-decoration-color"], press.color);
      await context.close();
    });

    test("presses: an unchecked box to the selected wash with a secondary edge, a checked one to action-primary-press, a checked radio unchanged; tab and segment to primary ink with no wash", async () => {
      const { page: p, context } = await openHtml(browser, html(BODY), { scheme });
      const selected = await resolve(p, await token(p, "--basalt-state-selected"));
      const press = await resolve(p, await token(p, "--basalt-action-primary-press"));
      const primary = await resolve(p, await token(p, "--basalt-text-primary"));
      assert.equal(await resolve(p, (await pressed(p, "#cb-label", () => style(p, "#cb", ["background-color"])))["background-color"]), selected);
      assert.equal(await resolve(p, (await pressed(p, "#cb-on", () => style(p, "#cb-on", ["background-color"])))["background-color"]), press);
      // A group with no radio checked: every radio in it matches :indeterminate, and still presses as unchecked.
      assert.equal(await p.evaluate(() => document.getElementById("rb").matches(":indeterminate")), true);
      assert.equal(await resolve(p, (await pressed(p, "#rb", () => style(p, "#rb", ["background-color"])))["background-color"]), selected);
      const radioRest = await style(p, "#ra", ["background-color", "box-shadow"]);
      assert.deepEqual(await pressed(p, "#ra", () => style(p, "#ra", ["background-color", "box-shadow"])), radioRest);
      for (const sel of ["#tab-b", "#seg-pm"]) {
        const s = await pressed(p, sel, () => style(p, sel, ["color", "background-color"]));
        assert.equal(await resolve(p, s.color), primary, sel);
        assert.equal(await resolve(p, s["background-color"]), await resolve(p, "transparent"), sel);
      }
      const sel = await pressed(p, "select#pier", () => style(p, "select#pier", ["background-color", "color"]));
      assert.match(sel["background-color"], /^rgb\(/, "one opaque colour");
      assert.equal(await resolve(p, sel.color), await resolve(p, await token(p, "--basalt-text-secondary")), "the empty choice's words lift to secondary");
      await context.close();
    });

    test("the plain disclosure's chevron rests at secondary ink and lifts to primary on a press; the prose form is unchanged; in forced colours it is CanvasText", async () => {
      const { page: p, context } = await openHtml(browser, html(BODY), { scheme });
      const secondary = await resolve(p, await token(p, "--basalt-text-secondary"));
      const primary = await resolve(p, await token(p, "--basalt-text-primary"));
      assert.equal(await resolve(p, (await style(p, "#disc", ["background-color"], "::after"))["background-color"]), secondary);
      assert.equal(await resolve(p, (await pressed(p, "#disc", () => style(p, "#disc", ["background-color"], "::after")))["background-color"]), primary);
      assert.equal(await resolve(p, (await style(p, "#prose", ["background-color"], "::after"))["background-color"]), secondary, "the prose form rests as before");
      await p.emulateMedia({ forcedColors: "active" });
      const canvasText = await p.evaluate(() => { const d = document.createElement("div"); d.style.color = "CanvasText"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
      assert.equal((await style(p, "#disc", ["background-color"], "::after"))["background-color"], canvasText);
      assert.equal((await pressed(p, "#disc", () => style(p, "#disc", ["background-color"], "::after")))["background-color"], canvasText);
      await context.close();
    });

    test("a wrapped choice keeps its box and switch on the first line, also at 32px and 1.5 line spacing; a one-line choice is centred", async () => {
      for (const extra of ["", ".choice { line-height: 32px !important; }", "* { line-height: 1.5 !important; }"]) {
        const { page: p, context } = await openHtml(browser, html(BODY), { scheme });
        if (extra) await p.addStyleTag({ content: extra });
        for (const id of ["cb-wrap", "sw-wrap", "cb"]) {
          const m = await p.evaluate((i) => {
            const input = document.getElementById(i); const label = input.closest(".choice");
            const text = [...label.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
            const range = document.createRange(); range.selectNodeContents(text); const first = range.getClientRects()[0];
            const r = input.getBoundingClientRect();
            return r.top + r.height / 2 - (first.top + first.height / 2);
          }, id);
          assert.ok(Math.abs(m) <= 0.5, `${id}: ${m}px off its first line (${extra || "own line"})`);
        }
        await context.close();
      }
    });
  });
}

describe("a still touch on a skill menu row", () => {
  const MENU = `<main class="page"><button class="btn" popovertarget="m" id="open">Seeds</button>
  <div class="panel float menu" popover id="m">
    <button class="menu-item" role="menuitem"><span class="menu-item-label">Order a packet</span><span class="menu-item-description">Ships in a paper envelope</span></button>
    <button class="menu-item" role="menuitem"><span class="menu-item-label">Rename</span></button>
    <button class="menu-item" role="menuitem" aria-disabled="true"><span class="menu-item-label">Archived</span></button>
  </div></main>`;
  test("a 180ms still touch marks the row and shows its plate before release; cleared after release, cancel and 8px; never on a disabled row or by a mouse", async () => {
    const { page: p, context } = await openHtml(browser, html(MENU), { touch: true, width: 390 });
    await p.locator("#open").tap();
    await p.waitForSelector("#m:popover-open");
    const cdp = await context.newCDPSession(p);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y }] });
    const row = await centre(p, ".menu-item");
    await touch("touchStart", row.x, row.y);
    await p.waitForTimeout(180);
    assert.equal(await p.locator(".menu-item").first().getAttribute("data-pressing"), "");
    assert.notEqual(await resolve(p, (await style(p, ".menu-item", ["background-color"], "::before"))["background-color"]), await resolve(p, "transparent"));
    assert.equal(await resolve(p, (await style(p, ".menu-item-description", ["color"])).color), await resolve(p, await token(p, "--basalt-text-secondary")));
    await touch("touchEnd");
    assert.equal(await p.locator("[data-pressing]").count(), 0);
    await touch("touchStart", row.x, row.y); await touch("touchCancel");
    assert.equal(await p.locator("[data-pressing]").count(), 0);
    await touch("touchStart", row.x, row.y); await touch("touchMove", row.x, row.y + 9);
    assert.equal(await p.locator("[data-pressing]").count(), 0);
    await touch("touchEnd");
    const off = await p.locator(".menu-item").nth(2).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await touch("touchStart", off.x, off.y);
    assert.equal(await p.locator("[data-pressing]").count(), 0, "a disabled row never takes the mark");
    await touch("touchEnd");
    await context.close();
  });
  test("a finger moving over the menu lights and focuses no row (the menu's and the filter's pointermove ignore touch)", async () => {
    const { page: p, context } = await openHtml(browser, html(MENU), { touch: true, width: 390 });
    await p.locator("#open").tap();
    await p.waitForSelector("#m:popover-open");
    const cdp = await context.newCDPSession(p);
    const a = await centre(p, ".menu-item");
    const b = await p.locator(".menu-item").nth(1).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const focused = await p.evaluate(() => document.activeElement?.textContent ?? "");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a.x, y: a.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: b.x, y: b.y }] });
    assert.equal(await p.locator(".menu-item").nth(1).getAttribute("data-highlighted"), null, "the row under the moving finger is not lit");
    assert.equal(await p.evaluate(() => document.activeElement?.textContent ?? ""), focused, "focus does not follow the finger");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await context.close();
  });
  test("the core adds one passive touchstart listener on the document", async () => {
    const { page: p, context } = await openHtml(browser, html("<main class=\"page\"><p>Ferry</p></main>"));
    const cdp = await context.newCDPSession(p);
    const { result } = await cdp.send("Runtime.evaluate", { expression: "document" });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
    const touch = listeners.filter((l) => l.type === "touchstart");
    assert.equal(touch.length, 1);
    assert.equal(touch[0].passive, true);
    await context.close();
  });
});

describe("the small nav's start inset", () => {
  for (const [touch, start] of [[false, 8], [true, 14]]) {
    test(`${touch ? "touch" : "default"}: the glyph's box is centred on the cap (start ${start}); the glyphless item keeps 12`, async () => {
      const { page: p, context } = await openHtml(browser, html(`<main class="page"><nav class="nav" data-size="sm" aria-label="Saved"><ul class="nav-list">
        <li><a class="nav-item" href="#a"><span class="nav-pill"><span data-glyph="home" data-size="16"></span><span class="nav-label">Ferry timetable</span></span></a></li>
        <li><a class="nav-item" href="#b"><span class="nav-pill"><span class="nav-label">Words only</span></span></a></li></ul></nav></main>`), { touch, width: touch ? 390 : 1440 });
      const pills = p.locator(".nav-pill");
      assert.equal(await pills.first().evaluate((el) => parseFloat(getComputedStyle(el).paddingInlineStart)), start);
      assert.equal(await pills.nth(1).evaluate((el) => parseFloat(getComputedStyle(el).paddingInlineStart)), 12);
      await context.close();
    });
  }
});
