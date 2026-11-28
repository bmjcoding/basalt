// cimip-gaps-3, topic t8 (a search field whose value fills the box; the council's decision, cimip-gaps-3/t8/decision.md, DECISIONS 407). The form is the host
// (height, radius, fill, boundary, ring, each state's paint) and the input a bare port inside a label: words start 34px in, in every state; the clear seat is
// held only while the × shows, and the host's width never depends on it (a content-sized field beside a button, a fixed width, min-content and max-content
// tracks); words wider than the field fade at each side that hides more while it is not focused and are plain while it is; the touch × keeps its 24 with a
// 44 × 44 hit area (a hairline more in forced colours) and never scales; the states map to the host or the port; the modes; the search dialog's field; axe.
// Synthetic data in two unlike domains (a seed catalogue and a ferry timetable). Driven in Chromium against the built package and its stylesheet.
// Written and not run: tests are paused (DECISIONS 359).
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 };
const FORMS = [["1440", DESKTOP], ["390 with touch", PHONE]];
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; padding: 24px; } .fixed { width: 240px; }" });
  await settle(page);
  return { page, errors };
};
const frame = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
const resolve = (page, token) => page.evaluate((token) => {
  const probe = document.createElement("div");
  probe.style.color = `var(--basalt-${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}, token);
/** A system colour as this page computes it (forced colours). */
const system = (page, name) => page.evaluate((name) => {
  const probe = document.createElement("span");
  probe.style.color = name;
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}, name);

const SEEDS = "Heirloom tomato, Cherokee Purple, open-pollinated, 25 seeds, sown indoors in March";
const FERRY = "Ferry from Harbour Quay to North Island, weekday sailings after six";

/**
 * One field in a state the test drives: `window.setQ` sets its words from outside (an app restoring a query), the field has the given width (a number, or
 * null for no width at all), direction and extra props. `id` names the input's form for the selectors.
 */
const FIELD = ({ value = "", width = 200, dir = "ltr", props = "", placeholder = "Search the seed catalogue", label = "Search the seed catalogue" } = {}) => `
function App() {
  const [q, set] = React.useState(${JSON.stringify(value)});
  window.setQ = set;
  return <div dir="${dir}" style={${width === null ? "{}" : `{ width: ${width} }`}}><B.SearchField label=${JSON.stringify(label)} placeholder=${JSON.stringify(placeholder)} value={q} onValueChange={set} ${props} /></div>;
}
${render("<App />")}`;

/** The host, the label, the port, the glyph and Clear, as rects, and the port's text area (its client width). */
const parts = (page) => page.evaluate(() => {
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const host = document.querySelector("form.basalt-search-box");
  const input = host.querySelector(".basalt-search-box-input");
  return {
    host: rect(host), label: rect(host.querySelector(".basalt-search-box-field")), input: rect(input), glyph: rect(host.querySelector(".basalt-search-box-glyph")),
    clear: rect(host.querySelector(".basalt-search-box-clear")), text: input.clientWidth, rtl: getComputedStyle(host).direction === "rtl",
  };
});
/** Where the words start, from the host's start edge, in reading order. */
const origin = (p) => Math.round(p.rtl ? p.host.right - p.input.right : p.input.left - p.host.left);
/** The fade's state on the port: its attribute, its four bands, and its computed mask. */
const fade = (page, selector = ".basalt-search-box-input") => page.evaluate((s) => {
  const el = document.querySelector(s);
  const read = (name) => parseFloat(el.style.getPropertyValue(name)) || 0;
  return { mode: el.getAttribute("data-fade"), l: read("--_fade-l"), r: read("--_fade-r"), mask: getComputedStyle(el).maskImage, quarter: el.clientWidth / 4 };
}, selector);
const scrollPort = async (page, to) => {
  await page.evaluate((to) => {
    const el = document.querySelector(".basalt-search-box-input");
    const max = el.scrollWidth - el.clientWidth;
    const rtl = getComputedStyle(el).direction === "rtl";
    const at = to === "start" ? 0 : to === "end" ? max : Math.round(max / 2);
    el.scrollLeft = rtl ? -at : at;
  }, to);
  await frame(page);
};

for (const theme of ["dark", "light"]) {
  describe(`the origin and the seat (${theme})`, () => {
    for (const [form, options] of FORMS) {
      test(`${form}: a 200px field has a 156 text area empty and ${form === "1440" ? 134 : 122} filled; the words start 34px in before and after the first key and after clearing`, async () => {
        const { page } = await open(FIELD(), options, theme);
        const empty = await parts(page);
        assert.equal(empty.host.width, 200);
        assert.equal(empty.text, 156, "no words: the end is space-2-5, as the start");
        assert.equal(empty.clear, null, "no words, no ×");
        assert.equal(origin(empty), 34);
        await page.locator(".basalt-search-box-input").focus();
        await page.keyboard.type("b");
        const one = await parts(page);
        assert.equal(one.text, form === "1440" ? 134 : 122, "the seat (32, or 44 on touch) is held while the × shows");
        assert.equal(origin(one), 34, "the first key moves no word's start");
        assert.deepEqual(one.host, empty.host, "nor the host");
        assert.deepEqual(one.glyph, empty.glyph, "nor the glyph");
        await page.keyboard.type("e");
        const two = await parts(page);
        assert.deepEqual([two.host, two.input, two.glyph, two.clear], [one.host, one.input, one.glyph, one.clear], "a second character moves nothing but the caret");
        await page.getByRole("button", { name: "Clear search" }).click();
        const cleared = await parts(page);
        assert.equal(cleared.text, 156);
        assert.equal(origin(cleared), 34);
        assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-search-box-input")), true, "focus stays in the input");
        await page.close();
      });

      test(`${form}: right to left, the words start 34px in from the right, before and after the first key and after Esc`, async () => {
        const { page } = await open(FIELD({ dir: "rtl" }), options, theme);
        assert.equal(origin(await parts(page)), 34);
        await page.locator(".basalt-search-box-input").focus();
        await page.keyboard.type("ב");
        const one = await parts(page);
        assert.equal(origin(one), 34);
        assert.ok(one.clear.left >= one.host.left && one.clear.right < one.input.left, "the × is at the start of the line in right to left: the left");
        await page.keyboard.press("Escape");
        assert.equal(origin(await parts(page)), 34);
        await page.close();
      });
    }
  });

  describe(`the host's width never depends on the × (${theme})`, () => {
    for (const [form, options] of FORMS) {
      const ROW = (wrap) => `
function App() {
  const [q, set] = React.useState("");
  return ${wrap(`<B.SearchField label="Search the timetable" placeholder="Search sailings" value={q} onValueChange={set} />`)};
}
${render("<App />")}`;
      const read = (page) => page.evaluate(() => {
        const host = document.querySelector("form.basalt-search-box").getBoundingClientRect();
        const other = document.querySelector("#other").getBoundingClientRect();
        return { width: host.width, x: other.left };
      });
      const drive = async (page) => {
        const reads = [await read(page)];
        await page.locator(".basalt-search-box-input").focus();
        await page.keyboard.type("q");
        reads.push(await read(page));
        await page.getByRole("button", { name: "Clear search" }).click();
        reads.push(await read(page));
        await page.keyboard.type("q");
        await page.keyboard.press("Escape");
        reads.push(await read(page));
        return reads;
      };
      for (const [name, wrap] of [
        ["a flex row beside a Button, with no width set", (field) => `<div style={{ display: "flex", gap: 8, alignItems: "center" }}>${field}<B.Button id="other">Find</B.Button></div>`],
        ["a fixed-width host", (field) => `<div style={{ display: "flex", gap: 8 }}>${field.replace("<B.SearchField", '<B.SearchField className="fixed"')}<B.Button id="other">Find</B.Button></div>`],
        ["a min-content grid track", (field) => `<div style={{ display: "grid", gridTemplateColumns: "min-content auto", gap: 8, justifyContent: "start" }}>${field}<span id="other">Sailings</span></div>`],
        ["a max-content grid track", (field) => `<div style={{ display: "grid", gridTemplateColumns: "max-content auto", gap: 8, justifyContent: "start" }}>${field}<span id="other">Sailings</span></div>`],
      ]) {
        test(`${form}: in ${name}, the host's width and the neighbour's x are the same empty, after one character, after Clear and after Esc`, async () => {
          const { page } = await open(ROW(wrap), options, theme);
          const reads = await drive(page);
          for (const r of reads) assert.deepEqual(r, reads[0], JSON.stringify(reads));
          if (name === "a fixed-width host") assert.equal(reads[0].width, 240);
          await page.close();
        });
      }
    }

    test("forced colours at 390 with touch: the content-sized row holds still too", async () => {
      const { page } = await open(`
function App() { const [q, set] = React.useState(""); return <div style={{ display: "flex", gap: 8 }}><B.SearchField label="Search the timetable" value={q} onValueChange={set} /><B.Button id="other">Find</B.Button></div>; }
${render("<App />")}`, PHONE, theme);
      await page.emulateMedia({ forcedColors: "active" });
      const x = () => page.evaluate(() => [document.querySelector("form.basalt-search-box").getBoundingClientRect().width, document.querySelector("#other").getBoundingClientRect().left]);
      const before = await x();
      await page.locator(".basalt-search-box-input").focus();
      await page.keyboard.type("q");
      assert.deepEqual(await x(), before);
      await page.close();
    });
  });

  describe(`the fade on the words (${theme})`, () => {
    test("no data-fade while empty (a placeholder is never masked) or while the words fit", async () => {
      const { page } = await open(FIELD({ placeholder: "Search the seed catalogue by variety, colour, sowing month or supplier" }), DESKTOP, theme);
      assert.equal((await fade(page)).mode, null, "empty, with a placeholder wider than the box");
      await page.evaluate(() => window.setQ("Basil"));
      await frame(page);
      assert.equal((await fade(page)).mode, null, "words that fit");
      await page.close();
    });

    test("a long value at rest: 0 / 20 at the start, 20 / 20 in the middle, 20 / 0 at the end; the engine's scroll is read, never reset", async () => {
      const { page } = await open(FIELD(), DESKTOP, theme);
      await page.evaluate((v) => window.setQ(v), SEEDS);
      await frame(page);
      const start = await fade(page);
      assert.deepEqual([start.mode, start.l, start.r], ["inline", 0, 20]);
      assert.notEqual(start.mask, "none");
      await scrollPort(page, "middle");
      const middle = await fade(page);
      assert.deepEqual([middle.l, middle.r], [20, 20]);
      await scrollPort(page, "end");
      const end = await fade(page);
      assert.deepEqual([end.l, end.r], [20, 0]);
      assert.ok(await page.evaluate(() => { const el = document.querySelector(".basalt-search-box-input"); return el.scrollLeft > 0; }), "Basalt never moves the scroll back");
      await page.close();
    });

    test("in a narrow field the band is a quarter of the text area", async () => {
      const { page } = await open(FIELD({ width: 110, value: FERRY }), DESKTOP, theme);
      await frame(page);
      const f = await fade(page);
      assert.equal(f.r, Math.round(Math.min(20, f.quarter)));
      assert.ok(f.r < 20, `a 44px text area takes a band under the token (${f.r})`);
      await page.close();
    });

    test("right to left mirrors the bands", async () => {
      const { page } = await open(FIELD({ dir: "rtl", value: FERRY }), DESKTOP, theme);
      await frame(page);
      const start = await fade(page);
      assert.deepEqual([start.l, start.r], [20, 0], "the words start at the right; what is hidden is at the left");
      await scrollPort(page, "end");
      const end = await fade(page);
      assert.deepEqual([end.l, end.r], [0, 20]);
      await page.close();
    });

    test("focused, there is no mask and nothing moves; on blur the mask returns", async () => {
      const { page } = await open(FIELD({ value: SEEDS }), DESKTOP, theme);
      await frame(page);
      const rest = await parts(page);
      assert.notEqual((await fade(page)).mask, "none");
      await page.locator(".basalt-search-box-input").focus();
      assert.equal((await fade(page)).mask, "none", ":focus outranks the fade's mask");
      const focused = await parts(page);
      assert.deepEqual([focused.host, focused.clear, focused.input], [rest.host, rest.clear, rest.input], "turning the mask off moves no pixel of layout");
      // A pointer focus is :focus without :focus-visible: still plain.
      await page.locator("body").click({ position: { x: 5, y: 600 } });
      await page.locator(".basalt-search-box-input").click();
      assert.equal((await fade(page)).mask, "none");
      await page.locator("body").click({ position: { x: 5, y: 600 } });
      await frame(page);
      assert.notEqual((await fade(page)).mask, "none", "at rest again, it fades");
      await page.close();
    });

    test("readOnly and focused: no mask; disabled and overflowing: masked", async () => {
      const { page } = await open(FIELD({ value: SEEDS, props: "readOnly" }), DESKTOP, theme);
      await frame(page);
      await page.locator(".basalt-search-box-input").focus();
      assert.equal((await fade(page)).mask, "none");
      await page.close();
      const off = await open(FIELD({ value: SEEDS, props: "disabled" }), DESKTOP, theme);
      await frame(off.page);
      const f = await fade(off.page);
      assert.equal(f.mode, "inline");
      assert.notEqual(f.mask, "none");
      await off.page.close();
    });

    test("emptying the field stops the watcher and clears what it wrote", async () => {
      const { page } = await open(FIELD({ value: SEEDS }), DESKTOP, theme);
      await frame(page);
      assert.equal((await fade(page)).mode, "inline");
      await page.evaluate(() => window.setQ(""));
      await frame(page);
      const cleared = await page.evaluate(() => { const el = document.querySelector(".basalt-search-box-input"); return { mode: el.getAttribute("data-fade"), style: el.getAttribute("style") ?? "" }; });
      assert.equal(cleared.mode, null);
      assert.doesNotMatch(cleared.style, /--_fade/);
      await page.close();
    });

    test("the mask never sits on the host, the label, the glyph or Clear, and the port draws no fill, boundary or outline", async () => {
      const { page } = await open(FIELD({ value: SEEDS }), DESKTOP, theme);
      await frame(page);
      const read = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const masks = [".basalt-search-box", ".basalt-search-box-field", ".basalt-search-box-glyph", ".basalt-search-box-clear"].map((s) => getComputedStyle(q(s)).maskImage);
        const port = getComputedStyle(q(".basalt-search-box-input"));
        return { masks, port: [port.backgroundColor, port.boxShadow, port.outlineStyle, port.borderTopWidth] };
      });
      assert.deepEqual(read.masks, ["none", "none", "none", "none"]);
      assert.deepEqual(read.port, ["rgba(0, 0, 0, 0)", "none", "none", "0px"]);
      // The ring is the host's, at +2.
      await page.locator(".basalt-search-box-input").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const ring = await page.evaluate(() => { const cs = getComputedStyle(document.querySelector("form.basalt-search-box")); return [cs.outlineStyle, cs.outlineWidth, cs.outlineOffset, cs.maskImage]; });
      assert.deepEqual(ring, ["solid", "2px", "2px", "none"]);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-search-box-input")).outlineStyle), "none", "the ring is drawn once");
      await page.close();
    });
  });

  describe(`the states, each painted where it paints (${theme})`, () => {
    const port = (page) => page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector(".basalt-search-box-input"));
      return { background: cs.backgroundColor, shadow: cs.boxShadow, outline: cs.outlineStyle, animation: cs.animationName, border: cs.borderTopWidth, color: cs.color, cursor: cs.cursor };
    });
    const host = (page) => page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector("form.basalt-search-box"));
      return { background: cs.backgroundColor, shadow: cs.boxShadow, outline: cs.outlineStyle, animation: cs.animationName, cursor: cs.cursor, glyph: getComputedStyle(document.querySelector(".basalt-search-box-glyph")).color };
    });
    const BARE = { background: "rgba(0, 0, 0, 0)", shadow: "none", outline: "none", animation: "none", border: "0px" };
    const bare = (p) => ({ background: p.background, shadow: p.shadow, outline: p.outline, animation: p.animation, border: p.border });

    test("data-invalid: the host's boundary is the danger colour; the port stays bare in primary ink", async () => {
      const { page } = await open(FIELD({ value: "Basil", props: `inputProps={{ "data-invalid": "" }}` }), DESKTOP, theme);
      const h = await host(page);
      assert.ok(h.shadow.includes(await resolve(page, "status-danger")), h.shadow);
      const p = await port(page);
      assert.deepEqual(bare(p), BARE);
      assert.equal(p.color, await resolve(page, "text-primary"));
      await page.close();
    });

    test("disabled: the host is sunken, the port and the glyph in disabled ink (the restored fault), the port bare", async () => {
      const { page } = await open(FIELD({ value: "Basil", props: "disabled" }), DESKTOP, theme);
      const h = await host(page);
      assert.equal(h.background, await resolve(page, "surface-sunken"));
      assert.equal(h.cursor, "not-allowed");
      assert.equal(h.glyph, await resolve(page, "text-disabled"));
      const p = await port(page);
      assert.deepEqual(bare(p), BARE);
      assert.equal(p.color, await resolve(page, "text-disabled"));
      await page.emulateMedia({ forcedColors: "active" });
      const gray = await system(page, "GrayText");
      assert.equal((await host(page)).glyph, gray, "GrayText in forced colours");
      assert.equal((await port(page)).color, gray);
      assert.equal((await port(page)).border, "0px", "the port's forced border is reset");
      await page.close();
    });

    test("aria-busy: cursor progress on the host, the label and the port", async () => {
      const { page } = await open(FIELD({ value: "Basil", props: `inputProps={{ "aria-busy": true }}` }), DESKTOP, theme);
      assert.equal((await host(page)).cursor, "progress");
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-search-box-field")).cursor), "progress");
      assert.equal((await port(page)).cursor, "progress");
      await page.close();
    });

    test("data-writing: the host pulses with a dashed outline (solid under the ring when focused); the port is bare in secondary ink, its placeholder transparent; the pulse stops under reduced motion and the hold", async () => {
      const { page } = await open(FIELD({ props: `readOnly inputProps={{ "data-writing": "", "aria-busy": true }}` }), DESKTOP, theme);
      const h = await host(page);
      assert.equal(h.animation, "basalt-writing");
      assert.equal(h.outline, "dashed");
      assert.equal(h.shadow, "none");
      const p = await port(page);
      assert.deepEqual(bare(p), BARE, "the writing fill, pulse and outline are the host's, never the port's");
      assert.equal(p.color, await resolve(page, "text-secondary"));
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-search-box-input"), "::placeholder").color), "rgba(0, 0, 0, 0)");
      await page.locator(".basalt-search-box-input").focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      assert.equal((await host(page)).outline, "solid", "the ring replaces the dashed outline");
      assert.deepEqual(bare(await port(page)), BARE, "focused and writing, still bare");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal((await host(page)).animation, "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
      assert.equal((await host(page)).animation, "none");
      await page.close();
    });

    test("compact density: 13px words for md and lg; a coarse pointer: 16px", async () => {
      const SIZES = `<div style={{ display: "grid", gap: 8, width: 240 }}><B.SearchField label="Md" value="" onValueChange={() => {}} /><B.SearchField label="Lg" controlSize="lg" value="" onValueChange={() => {}} /><B.SearchField label="Sm" controlSize="sm" value="" onValueChange={() => {}} /></div>`;
      const sizes = (page) => page.locator(".basalt-search-box-input").evaluateAll((els) => els.map((el) => getComputedStyle(el).fontSize));
      const { page } = await open(render(SIZES), DESKTOP, theme);
      await page.evaluate(() => { document.documentElement.dataset.density = "compact"; });
      const [md, lg, sm] = await sizes(page);
      assert.deepEqual([md, lg, sm], ["13px", "13px", "13px"]);
      await page.close();
      const touch = await open(render(SIZES), PHONE, theme);
      assert.deepEqual(await sizes(touch.page), ["16px", "16px", "16px"]);
      await touch.page.close();
    });

    test("390 with touch, in forced colours: the port lies inside the label and the label inside the host's content box", async () => {
      const { page } = await open(FIELD({ value: "Basil" }), PHONE, theme);
      await page.emulateMedia({ forcedColors: "active" });
      const r = await page.evaluate(() => {
        const host = document.querySelector("form.basalt-search-box");
        const cs = getComputedStyle(host);
        const hb = host.getBoundingClientRect();
        const content = { top: hb.top + parseFloat(cs.borderTopWidth), bottom: hb.bottom - parseFloat(cs.borderBottomWidth), left: hb.left + parseFloat(cs.borderLeftWidth), right: hb.right - parseFloat(cs.borderRightWidth) };
        const label = document.querySelector(".basalt-search-box-field").getBoundingClientRect();
        const input = document.querySelector(".basalt-search-box-input").getBoundingClientRect();
        return { content, label: { top: label.top, bottom: label.bottom, left: label.left, right: label.right }, input: { top: input.top, bottom: input.bottom }, border: cs.borderTopWidth, height: hb.height };
      });
      assert.equal(r.border, "1px");
      assert.equal(r.height, 44);
      assert.ok(r.input.top >= r.label.top && r.input.bottom <= r.label.bottom, `the port is inside the label (${JSON.stringify(r)})`);
      for (const side of ["top", "bottom"]) assert.ok(side === "top" ? r.label.top >= r.content.top : r.label.bottom <= r.content.bottom, `the label is inside the host's content box (${side})`);
      assert.ok(r.label.left >= r.content.left && r.label.right <= r.content.right);
      await page.close();
    });
  });

  describe(`Clear on touch (${theme})`, () => {
    /** Clear's painted box and its target (its ::before over the padding box, or the box itself without one), the host and the port. */
    const target = (page) => page.evaluate(() => {
      const clear = document.querySelector(".basalt-search-box-clear");
      const cs = getComputedStyle(clear);
      const b = getComputedStyle(clear, "::before");
      const r = clear.getBoundingClientRect();
      const pad = { left: r.left + parseFloat(cs.borderLeftWidth), top: r.top + parseFloat(cs.borderTopWidth), right: r.right - parseFloat(cs.borderRightWidth), bottom: r.bottom - parseFloat(cs.borderBottomWidth) };
      const hit = b.content === "none" ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
        : { left: pad.left + parseFloat(b.left), top: pad.top + parseFloat(b.top), right: pad.right - parseFloat(b.right), bottom: pad.bottom - parseFloat(b.bottom) };
      const host = document.querySelector("form.basalt-search-box").getBoundingClientRect();
      const input = document.querySelector(".basalt-search-box-input").getBoundingClientRect();
      // What a press at each edge of the target, just inside it, lands on.
      const at = (x, y) => document.elementFromPoint(x, y)?.closest(".basalt-search-box-clear") === clear;
      const mid = (hit.top + hit.bottom) / 2;
      const centre = (hit.left + hit.right) / 2;
      return {
        painted: [r.width, r.height], hit, size: [hit.right - hit.left, hit.bottom - hit.top], host: { left: host.left, top: host.top, right: host.right, bottom: host.bottom }, input: { left: input.left, right: input.right },
        lands: [at(hit.left + 0.5, mid), at(hit.right - 0.5, mid), at(centre, hit.top + 0.5), at(centre, hit.bottom - 0.5)], outside: at(hit.left - 1, mid),
        radius: cs.borderTopLeftRadius,
      };
    });
    for (const forced of [false, true]) {
      test(`390 with touch${forced ? ", in forced colours" : ""}: Clear is painted 24 × 24 with a 44 × 44 target inside the host, clear of the input`, async () => {
        const { page } = await open(FIELD({ value: "Basil" }), PHONE, theme);
        if (forced) await page.emulateMedia({ forcedColors: "active" });
        const t = await target(page);
        assert.deepEqual(t.painted, [24, 24]);
        assert.deepEqual(t.size, [44, 44], JSON.stringify(t.hit));
        assert.ok(t.hit.left >= t.host.left - 0.01 && t.hit.right <= t.host.right + 0.01 && t.hit.top >= t.host.top - 0.01 && t.hit.bottom <= t.host.bottom + 0.01, `all four edges inside the host (${JSON.stringify(t)})`);
        assert.ok(t.hit.left >= t.input.right - 0.01, "no overlap with the input");
        assert.deepEqual(t.lands, [true, true, true, true], "a press just inside each edge is Clear's");
        assert.equal(t.outside, false, "a press just past its start is the field's");
        assert.equal(t.radius, "6px", "drawn at 24, so radius 6");
        await page.close();
      });
    }

    test(":active has no transform (a part of a field never scales), and the target never shrinks under a held finger", async () => {
      for (const options of [DESKTOP, PHONE]) {
        const { page } = await open(FIELD({ value: "Basil" }), options, theme);
        const clear = page.locator(".basalt-search-box-clear");
        const box = await clear.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        const pressed = await clear.evaluate((el) => ({ active: el.matches(":active"), transform: getComputedStyle(el).transform, after: getComputedStyle(el, "::after").content }));
        assert.deepEqual(pressed, { active: true, transform: "none", after: "none" });
        await page.mouse.up();
        await page.close();
      }
    });
  });

  describe(`the native hit area (${theme})`, () => {
    for (const [form, options] of FORMS) {
      test(`${form}: a press on the glyph, the start seat or the empty end focuses the input, with no preventDefault; a secondary press does nothing special`, async () => {
        const { page } = await open(`${FIELD()}
document.addEventListener("mousedown", (e) => { (window.downs ??= []).push([e.button, e.defaultPrevented]); });`, options, theme);
        const p = await parts(page);
        const y = (p.host.top + p.host.bottom) / 2;
        for (const x of [(p.glyph.left + p.glyph.right) / 2, p.host.left + 4, p.host.right - 4]) {
          await page.locator("body").click({ position: { x: 5, y: 600 } });
          assert.equal(await page.evaluate(() => document.activeElement?.tagName), "BODY");
          await page.mouse.click(x, y);
          assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("basalt-search-box-input")), true, `a press at ${x - p.host.left}px focuses the input`);
        }
        await page.locator("body").click({ position: { x: 5, y: 600 } });
        await page.mouse.click((p.glyph.left + p.glyph.right) / 2, y, { button: "right" });
        const downs = await page.evaluate(() => window.downs);
        assert.ok(downs.every(([, prevented]) => prevented === false), `no press is prevented (${JSON.stringify(downs)})`);
        assert.ok(downs.some(([button]) => button === 2), "the secondary press reached the page as itself");
        await page.close();
      });
    }
  });

  describe(`the modes (${theme})`, () => {
    for (const [name, media] of [["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }], ["print", { media: "print" }]]) {
      test(`under ${name} the mask is off`, async () => {
        const { page } = await open(FIELD({ value: SEEDS }), DESKTOP, theme);
        await frame(page);
        await page.emulateMedia(media);
        assert.equal((await fade(page)).mask, "none");
        await page.close();
      });
    }
    test("under reduced transparency and with data-fades=\"off\" the mask is off; reduced motion and the hold keep it", async () => {
      const { page } = await open(FIELD({ value: SEEDS }), DESKTOP, theme);
      await frame(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.notEqual((await fade(page)).mask, "none");
      await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
      assert.notEqual((await fade(page)).mask, "none");
      await page.evaluate(() => document.documentElement.setAttribute("data-fades", "off"));
      assert.equal((await fade(page)).mask, "none");
      await page.evaluate(() => document.documentElement.removeAttribute("data-fades"));
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
      assert.equal((await fade(page)).mask, "none");
      await page.close();
    });
    test("more contrast: the host's boundary and the glyph step to secondary ink", async () => {
      const { page } = await open(FIELD({ value: "Basil" }), DESKTOP, theme);
      await page.emulateMedia({ contrast: "more" });
      const secondary = await resolve(page, "text-secondary");
      const read = await page.evaluate(() => ({ shadow: getComputedStyle(document.querySelector("form.basalt-search-box")).boxShadow, glyph: getComputedStyle(document.querySelector(".basalt-search-box-glyph")).color }));
      assert.ok(read.shadow.includes(secondary), read.shadow);
      assert.equal(read.glyph, secondary);
      await page.close();
    });
  });

  describe(`the search dialog's field and the placeholder (${theme})`, () => {
    const DIALOG = (query) => `
function App() {
  const [open, setOpen] = React.useState(true);
  const [q, set] = React.useState(${JSON.stringify(query)});
  window.setQ = set;
  return <B.SearchDialog open={open} onOpenChange={setOpen} title="Search the timetable" label="Search sailings and piers" placeholder="Sailings, piers, islands, operators and the days they run" query={q} onQueryChange={set} count="2 sailings"><B.SearchResults /></B.SearchDialog>;
}
${render("<App />")}`;
    test("the dialog's query fades at rest and is plain while focused", async () => {
      const { page } = await open(DIALOG(`${FERRY}, ${FERRY}`), { viewport: { width: 1440, height: 900 } }, theme);
      await frame(page);
      // The dialog gives the field focus as it opens: plain.
      await page.locator(".basalt-search-input").focus();
      assert.equal((await fade(page, ".basalt-search-input")).mask, "none");
      await page.getByRole("button", { name: "Close search" }).focus();
      await frame(page);
      const rest = await fade(page, ".basalt-search-input");
      assert.equal(rest.mode, "inline");
      assert.notEqual(rest.mask, "none");
      await page.evaluate(() => window.setQ(""));
      await frame(page);
      assert.equal((await fade(page, ".basalt-search-input")).mode, null, "no words, no watcher");
      await page.close();
    });

    test("a placeholder wider than its room ends in an ellipsis, in the field and in the dialog; words keep their clip", async () => {
      const { page } = await open(DIALOG(""), { viewport: { width: 1440, height: 900 } }, theme);
      assert.equal(await page.locator(".basalt-search-input").evaluate((el) => getComputedStyle(el).textOverflow), "ellipsis");
      await page.close();
      const field = await open(FIELD({ placeholder: "Search the seed catalogue by variety, colour, sowing month or supplier" }), DESKTOP, theme);
      const input = field.page.locator(".basalt-search-box-input");
      assert.equal(await input.evaluate((el) => getComputedStyle(el).textOverflow), "ellipsis");
      await field.page.evaluate((v) => window.setQ(v), SEEDS);
      assert.equal(await input.evaluate((el) => getComputedStyle(el).textOverflow), "clip", "the words fade, they are never an ellipsis");
      await field.page.close();
    });
  });

  describe(`accessibility (${theme})`, () => {
    for (const [form, options] of FORMS) {
      test(`${form}: axe finds nothing; the wrapping label leaves the input's name its aria-label`, async () => {
        const { page } = await open(`
function App() { const [a, setA] = React.useState(""); const [b, setB] = React.useState(${JSON.stringify(SEEDS)});
  return <div style={{ display: "grid", gap: 12, width: 260 }}><B.SearchField label="Search the seed catalogue" placeholder="Variety or supplier" value={a} onValueChange={setA} /><B.SearchField label="Search the timetable" value={b} onValueChange={setB} /><B.SearchField label="Search the archive" value="1998" onValueChange={() => {}} disabled /></div>; }
${render("<App />")}`, options, theme);
        assert.equal(await page.getByRole("searchbox", { name: "Search the seed catalogue", exact: true }).count(), 1);
        assert.equal(await page.getByRole("searchbox", { name: "Search the timetable", exact: true }).count(), 1);
        assert.equal(await page.locator(".basalt-search-box-glyph").first().getAttribute("aria-hidden"), "true");
        await page.evaluate(() => { document.title = "Search fields"; document.documentElement.lang = "en"; });
        await page.addScriptTag({ content: axeSource });
        const result = await page.evaluate(() => window.axe.run({ exclude: [["[data-base-ui-focus-guard]"]] }, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }));
        assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join("; ")}`), []);
        await page.close();
      });
    }
  });
}
