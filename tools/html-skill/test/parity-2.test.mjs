// The second parity PR, in a browser: popup rows and levels (the palette at level 1 with its band at 2, #27's plate and lift, the glide of #31),
// the 2px bar and the inset outline gone from selection, the selected table row as a band, the segment's dark pill and its sliding pill with
// the fallbacks, and a tab's icon on its label's centre line. parity.test.mjs compares computed styles with React; this file pins the
// behaviour and the geometry it can't read that way, and the removals (nothing else in the suite would notice a bar coming back).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml, skillDir, read } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const html = (body) => compose(`<title>t</title>${body}`, { fonts: false }).html;
const open = (body, options) => openHtml(browser, html(body), options);
const frames = (page, n = 2) => page.evaluate((count) => new Promise((resolve) => { const step = (i) => (i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))); step(count); }), n);

/** What a value (a token, a colour-mix) computes to for a property, in the page's current theme. */
const resolve = (page, value, prop = "background-color") => page.evaluate(([v, p]) => {
  const probe = document.createElement("div");
  probe.style.setProperty(p, v);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(p);
  probe.remove();
  return out;
}, [value, prop]);

const PLATE = {
  dark: (next) => `color-mix(in srgb, var(--basalt-neutral-100) 9%, var(--basalt-surface-${next}))`,
  light: () => "var(--basalt-state-selected)",
};

const ITEMS = `{ groups: [{ label: "Group", items: [
  { label: "First", icon: "Copy", hint: "a hint", keys: ["⌘", "D"] }, { label: "Second", icon: "ArrowRight" }, { label: "Third" }, { label: "Danger", icon: "Trash", danger: true }] }] }`;

/** A page with a trigger; the palette is opened from the test. */
async function palette(options = {}) {
  const out = await open('<button class="btn" data-open-palette>Open</button>', options);
  await out.page.evaluate(`window.Basalt.openPalette(${ITEMS})`);
  await out.page.locator(".palette .row").first().waitFor();
  await frames(out.page);
  return out;
}

const rowFacts = (page, selector) => page.locator(selector).first().evaluate((row) => {
  const c = getComputedStyle(row), p = getComputedStyle(row, "::before");
  const box = row.getBoundingClientRect();
  return { height: box.height, width: box.width, color: c.color, weight: c.fontWeight, size: c.fontSize, line: c.lineHeight, bg: c.backgroundColor, radius: c.borderTopLeftRadius, outline: c.outlineStyle, plate: { bg: p.backgroundColor, top: p.top, left: p.left, height: p.height, width: p.width, radius: p.borderTopLeftRadius, content: p.content }, after: getComputedStyle(row, "::after").content };
});

for (const scheme of ["dark", "light"]) {
  describe(`the palette's levels and rows (${scheme})`, () => {
    test("the dialog is level 1 and its input band level 2; the footer is a hairline and the hints; the list is padded 2 and 4", async () => {
      const { page, context } = await palette({ scheme });
      const out = await page.evaluate(() => {
        const bg = (s) => getComputedStyle(document.querySelector(s)).backgroundColor;
        const list = getComputedStyle(document.querySelector(".palette-list"));
        return { dialog: bg(".palette"), band: bg(".palette .input-row"), list: [list.paddingTop, list.paddingRight, list.paddingBottom, list.paddingLeft], position: getComputedStyle(document.querySelector(".palette-list")).position };
      });
      assert.equal(out.dialog, await resolve(page, "var(--basalt-surface-1)"));
      assert.equal(out.band, await resolve(page, "var(--basalt-surface-2)"));
      assert.deepEqual(out.list, ["2px", "4px", "2px", "4px"]);
      assert.equal(out.position, "relative", "the glide's plate is placed against the list");
      await context.close();
    });

    test("a row is a 44px hit area: a 40px plate at radius 8 with 2px above and below, 14/20 type in secondary ink at rest, lifting to primary on the lit row with no weight change", async () => {
      // The row's own plate is the fallback: look at it with the glide off (the shared plate hides it where it is drawn).
      const off = await palette({ scheme, reducedMotion: "reduce" });
      const rest = await rowFacts(off.page, ".palette .row:not([data-active])");
      const lit = await rowFacts(off.page, ".palette .row[data-active]");
      assert.deepEqual([rest.height, rest.size, rest.line, rest.weight, rest.radius, rest.bg], [44, "14px", "20px", "400", "0px", "rgba(0, 0, 0, 0)"]);
      assert.equal(rest.color, await resolve(off.page, "var(--basalt-text-secondary)", "color"));
      assert.equal(lit.color, await resolve(off.page, "var(--basalt-text-primary)", "color"));
      assert.equal(lit.weight, rest.weight, "no weight change");
      assert.deepEqual([lit.plate.top, lit.plate.left, lit.plate.height, lit.plate.radius], ["2px", "0px", "40px", "8px"]);
      assert.equal(lit.plate.bg, await resolve(off.page, PLATE[scheme]("2")), "one solid fill: the next level plus the selected wash in dark, the wash in light");
      assert.equal(rest.plate.bg, "rgba(0, 0, 0, 0)");
      assert.equal(lit.bg, "rgba(0, 0, 0, 0)", "the row itself paints nothing");
      assert.equal(lit.outline, "none");
      await off.context.close();
    });

    test("the hint is tertiary at rest and secondary on the plate, the group label is tertiary 12/16 at 500, and a lit danger row keeps its colour", async () => {
      const { page, context } = await palette({ scheme, reducedMotion: "reduce" });
      const out = await page.evaluate(() => {
        const c = (s) => getComputedStyle(document.querySelector(s));
        return { hint: c(".palette .row[data-active] .row-hint").color, group: [c(".row-group").color, c(".row-group").fontSize, c(".row-group").lineHeight, c(".row-group").fontWeight] };
      });
      assert.equal(out.hint, await resolve(page, "var(--basalt-text-secondary)", "color"), "lit: secondary");
      assert.deepEqual(out.group, [await resolve(page, "var(--basalt-text-tertiary)", "color"), "12px", "16px", "500"]);
      for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
      const danger = await rowFacts(page, ".palette .row[data-danger]");
      assert.equal(danger.color, await resolve(page, "var(--basalt-status-danger)", "color"));
      assert.equal(danger.plate.bg, await resolve(page, PLATE[scheme]("2")));
      await context.close();
    });

    test("no row has a bar: the lit row's ::before is the plate (it spans the row), its ::after draws nothing, and no part of the skill's CSS besides the tab underline reads the indicator size", async () => {
      const { page, context } = await palette({ scheme, reducedMotion: "reduce" });
      const lit = await rowFacts(page, ".palette .row[data-active]");
      assert.deepEqual([lit.plate.content, lit.plate.width, lit.after], ['""', `${lit.width}px`, "none"]);
      await context.close();
      for (const part of ["rows", "palette", "table", "segment", "kbd", "forms"]) {
        assert.ok(!read(skillDir, "parts", `${part}.css`).includes("--basalt-size-indicator"), `${part}.css has no 2px bar`);
      }
      assert.ok(read(skillDir, "parts", "tabs.css").includes("--basalt-size-indicator"), "a horizontal tab keeps its underline");
      const words = [read(skillDir, "SKILL.md"), ...fs.readdirSync(path.join(skillDir, "parts", "usage")).map((f) => read(skillDir, "parts", "usage", f))].join("\n");
      assert.ok(!/2px bar|vertical bar is/.test(words.replace(/No vertical bar/, "")), "SKILL.md and the usage texts no longer describe the bar");
    });
  });
}

describe("popup levels", () => {
  test("a popup from the page is level 1 and inside a panel one level on; a modal resets to level 1 and holds level 2", async () => {
    const { page, context } = await open(`<main>
      <div class="panel float" id="a">A</div>
      <div class="panel" id="p"><div class="panel float" id="b">B</div></div>
      <div class="panel" id="q"><div class="panel float modal" id="c">C<div class="card" id="d">D</div></div></div></main>`, { scheme: "dark" });
    const bg = (id) => page.evaluate((x) => getComputedStyle(document.getElementById(x)).backgroundColor, id);
    const level = (n) => resolve(page, `var(--basalt-surface-${n})`);
    assert.equal(await bg("a"), await level(1), "from the page: level 1");
    assert.equal(await bg("b"), await level(2), "from a level-1 panel: level 2");
    assert.equal(await bg("c"), await level(1), "a modal: level 1 wherever it sits");
    assert.equal(await bg("d"), await level(2), "what a modal holds starts at 2");
    await context.close();
  });

  test("--panel-plate is the next level plus the wash in dark and the wash alone in light, at every level", async () => {
    for (const scheme of ["dark", "light"]) {
      const { page, context } = await open('<main><div class="panel" id="a">A<div class="card" id="b">B<div class="card" id="c">C</div></div></div></main>', { scheme });
      const plate = (id) => page.evaluate((x) => { const p = document.createElement("div"); p.style.backgroundColor = getComputedStyle(document.getElementById(x)).getPropertyValue("--panel-plate"); document.body.append(p); const v = getComputedStyle(p).backgroundColor; p.remove(); return v; }, id);
      for (const [id, next] of [["a", "2"], ["b", "3"], ["c", "3"]]) assert.equal(await plate(id), await resolve(page, PLATE[scheme](next)), `${scheme}, ${id}`);
      await context.close();
    }
  });
});

describe("a focusable row", () => {
  test("a link row takes the control ring outside it (2px at +2), with the list 6px from its edge, and hover lifts its ink without a plate", async () => {
    const { page, context } = await open('<div class="panel"><div class="rows"><a class="row" href="#x" id="r1"><span class="row-label">One</span></a><a class="row" href="#x" id="r2"><span class="row-label">Two</span></a></div></div>');
    await page.locator("#r1").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const ring = await page.locator("#r1").evaluate((el) => { const c = getComputedStyle(el); return [c.outlineStyle, c.outlineWidth, c.outlineOffset, getComputedStyle(el.parentElement).paddingLeft]; });
    assert.deepEqual(ring, ["solid", "2px", "2px", "6px"]);
    await page.locator("#r2").hover();
    await settle(page); // the ink lift is a transition: read it once it has ended, not after a fixed wait
    const hover = await page.locator("#r2").evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el, "::before").backgroundColor]);
    assert.deepEqual(hover, [await resolve(page, "var(--basalt-text-primary)", "color"), "rgba(0, 0, 0, 0)"]);
    await context.close();
  });
});

describe("the glide", () => {
  const plateOf = (page) => page.locator(".palette .plate").evaluate((el) => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return { display: s.display, state: el.dataset.state, opacity: s.opacity, x: r.left, y: r.top, w: r.width, h: r.height, running: el.getAnimations().filter((a) => a.playState === "running" && a.transitionProperty === "transform").length, hidden: el.getAttribute("aria-hidden"), events: s.pointerEvents };
  });
  const rowPlate = (page, n) => page.locator(".palette .row").nth(n).evaluate((row) => { const r = row.getBoundingClientRect(), p = getComputedStyle(row, "::before"); return { x: r.left + parseFloat(p.left), y: r.top + parseFloat(p.top), w: parseFloat(p.width), h: parseFloat(p.height) }; });
  const near = (a, b) => Math.abs(a - b) < 0.6;

  test("with a fine pointer one plate sits on the lit row, appears in place, and the row's own plate is hidden under it", async () => {
    const { page, context } = await palette();
    const plate = await plateOf(page);
    const want = await rowPlate(page, 0);
    assert.deepEqual([plate.display, plate.state, plate.opacity, plate.hidden, plate.events], ["block", "on", "1", "true", "none"]);
    assert.ok(near(plate.x, want.x) && near(plate.y, want.y) && near(plate.w, want.w) && near(plate.h, want.h), `at the first row: ${JSON.stringify([plate, want])}`);
    assert.equal(plate.running, 0, "it appeared in place: no flight from nowhere");
    assert.equal(await page.locator(".palette-list").getAttribute("data-glide"), "");
    assert.equal((await rowFacts(page, ".palette .row[data-active]")).plate.bg, "rgba(0, 0, 0, 0)", "the shared plate is the one drawn");
    await context.close();
  });

  test("a pointer moving to another row travels the plate on duration-base with ease-out; a key moves it at once", async () => {
    const { page, context } = await palette();
    const second = await page.locator(".palette .row").nth(2).boundingBox();
    await page.mouse.move(second.x + 40, second.y + 20);
    await page.mouse.move(second.x + 42, second.y + 22);
    const moving = await page.locator(".palette .plate").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty === "transform").map((a) => [a.effect.getTiming().duration, a.effect.getTiming().easing]));
    assert.deepEqual(moving, [[150, "cubic-bezier(0.16, 1, 0.3, 1)"]], "one transform transition on duration-base (150ms), ease-out");
    await page.locator(".palette .plate").evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const arrived = await plateOf(page);
    const want = await rowPlate(page, 2);
    assert.ok(near(arrived.y, want.y) && near(arrived.h, want.h), "it arrived on the third row");
    await page.keyboard.press("ArrowDown");
    await frames(page, 1);
    const key = await plateOf(page);
    const next = await rowPlate(page, 3);
    assert.equal(key.running, 0, "a key moves it at once");
    assert.ok(near(key.y, next.y), "and it is on the fourth row");
    await context.close();
  });

  test("when no row matches the plate fades in place over duration-fast on ease-in; it comes back in place, and closing removes the listeners", async () => {
    const { page, context } = await open('<button class="btn" data-open-palette>Open</button>');
    // Count the document's pointer and key listeners the palette adds and removes: closing must put every one back.
    await page.evaluate(() => {
      window.__live = 0;
      const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
      document.addEventListener = (t, f, o) => { if (/^(pointermove|pointerdown)$/.test(t)) window.__live++; return add(t, f, o); };
      document.removeEventListener = (t, f, o) => { if (/^(pointermove|pointerdown)$/.test(t)) window.__live--; return remove(t, f, o); };
    });
    await page.evaluate(`window.Basalt.openPalette(${ITEMS})`);
    await page.locator(".palette .row").first().waitFor();
    await frames(page);
    assert.ok(await page.evaluate(() => window.__live) > 0, "the glide listens to the pointer while open");
    await page.locator(".palette input").fill("zzz");
    await page.waitForTimeout(80);
    const gone = await plateOf(page);
    assert.equal(gone.state, "off");
    assert.equal(await page.locator(".palette .plate").evaluate((el) => getComputedStyle(el).transitionProperty), "opacity");
    assert.equal(await page.locator(".palette .plate").evaluate((el) => getComputedStyle(el).transitionTimingFunction), "cubic-bezier(0.4, 0, 1, 1)");
    await page.locator(".palette input").fill("");
    await frames(page);
    const back = await plateOf(page);
    assert.deepEqual([back.state, back.opacity, back.running], ["on", "1", 0], "it returns in place");
    await page.keyboard.press("Escape");
    await page.locator(".palette").waitFor({ state: "detached" });
    assert.equal(await page.evaluate(() => window.__live), 0, "every listener the glide added is removed");
    // opening again after a close starts clean
    await page.evaluate(`window.Basalt.openPalette(${ITEMS})`);
    await page.locator(".palette .row").first().waitFor();
    await frames(page);
    assert.equal((await plateOf(page)).state, "on");
    await context.close();
  });

  test("off on touch, under reduced motion and in forced colours: no shared plate, and each lit row paints its own", async () => {
    for (const [label, options, emulate] of [["touch", { touch: true, width: 390 }], ["reduced motion", { reducedMotion: "reduce" }], ["forced colours", {}, { forcedColors: "active" }]]) {
      const { page, context } = await open('<button class="btn" data-open-palette>Open</button>', options);
      if (emulate) await page.emulateMedia(emulate);
      await page.evaluate(`window.Basalt.openPalette(${ITEMS})`);
      await page.locator(".palette .row").first().waitFor();
      await frames(page);
      const plate = await plateOf(page);
      assert.equal(plate.display, "none", `${label}: no shared plate`);
      assert.equal(await page.locator(".palette-list").getAttribute("data-glide"), null, `${label}: not marked`);
      assert.notEqual((await rowFacts(page, ".palette .row[data-active]")).plate.bg, "rgba(0, 0, 0, 0)", `${label}: the row's own plate`);
      await context.close();
    }
  });

  test("at 390 on touch a row is still 44px", async () => {
    const { page, context } = await palette({ touch: true, width: 390 });
    assert.equal((await rowFacts(page, ".palette .row")).height, 44);
    await context.close();
  });
});

describe("a selected table row", () => {
  test("is the wash as a band with no bar, and selecting it moves no header and no column", async () => {
    const body = `<div class="panel table-wrap" role="region" aria-label="T" tabindex="0"><table><thead><tr><th scope="col">Name</th><th scope="col">Id</th><th scope="col" data-numeric>Count</th></tr></thead>
      <tbody><tr><td>First row with a longer name</td><td data-mono>a1</td><td data-numeric>12</td></tr><tr id="s"><td>Second</td><td data-mono>b2</td><td data-numeric>345</td></tr></tbody></table></div>`;
    for (const scheme of ["dark", "light"]) {
      const { page, context } = await open(body, { scheme });
      const measure = () => page.evaluate(() => ({ heads: [...document.querySelectorAll("th")].map((th) => { const r = th.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }), cells: [...document.querySelectorAll("tbody td")].map((td) => td.getBoundingClientRect().width) }));
      const before = await measure();
      await page.evaluate(() => document.getElementById("s").setAttribute("aria-selected", "true"));
      await frames(page);
      const after = await measure();
      assert.deepEqual(after, before, "nothing moved: not a header, not a column");
      const out = await page.evaluate(() => { const tr = document.getElementById("s"), c = (el) => getComputedStyle(el); return { row: c(tr).backgroundColor, first: c(tr.firstElementChild).boxShadow, other: c(tr.lastElementChild).boxShadow, width: tr.firstElementChild.getBoundingClientRect().width }; });
      assert.equal(out.row, await resolve(page, "var(--basalt-state-selected)"), "the wash");
      assert.equal(out.first, out.other, "the first cell has the same edge as the others: only the divider, no bar");
      assert.ok(!/inset \dpx 0px 0px 0px/.test(out.first), out.first);
      await context.close();
    }
  });
});

describe("the segment's pill", () => {
  const SEG = '<div class="segment" role="group" aria-label="Range" id="g"><button type="button" aria-pressed="true" id="b1">Day</button><button type="button" aria-pressed="false" id="b2">Week</button><button type="button" aria-pressed="false" id="b3">Month</button></div>';
  const press = (page, id) => page.evaluate((x) => document.querySelectorAll("#g button").forEach((b) => b.setAttribute("aria-pressed", String(b.id === x))), id);
  const pillOf = (page) => page.locator("#g .pill").evaluate((el) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return { display: s.display, x: r.left, y: r.top, w: r.width, h: r.height, bg: s.backgroundColor, shadow: s.boxShadow, radius: s.borderTopLeftRadius, running: el.getAnimations().filter((a) => a.transitionProperty === "transform").length, hidden: el.getAttribute("aria-hidden") }; });
  const near = (a, b) => Math.abs(a - b) < 0.6;

  for (const scheme of ["dark", "light"]) {
    test(`one shared pill sits on the pressed button, in #27's fill (${scheme}), placed without a move at first`, async () => {
      const { page, context } = await open(SEG, { scheme });
      await frames(page);
      const pill = await pillOf(page);
      const at = await page.locator("#b1").boundingBox();
      assert.deepEqual([pill.display, pill.hidden, pill.radius, pill.running], ["block", "true", "6px", 0]);
      assert.ok(near(pill.x, at.x) && near(pill.y, at.y) && near(pill.w, at.width) && near(pill.h, at.height), JSON.stringify([pill, at]));
      assert.equal(pill.bg, await resolve(page, scheme === "dark" ? "color-mix(in srgb, var(--basalt-neutral-100) 9%, var(--basalt-surface-top))" : "var(--basalt-surface-top)"));
      assert.equal(pill.shadow, await resolve(page, "0 0 0 1px var(--basalt-border-hairline)", "box-shadow"));
      const own = await page.locator("#b1").evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).boxShadow]);
      assert.deepEqual(own, ["rgba(0, 0, 0, 0)", "none"], "the pressed button paints no pill of its own while the shared one is drawn");
      assert.equal(await page.locator("#g > :first-child").evaluate((el) => el.className), "pill");
      await context.close();
    });
  }

  test("a new choice travels the pill on duration-slow with ease-out and it lands on the new button; the ink changes at the press", async () => {
    const { page, context } = await open(SEG);
    await frames(page);
    await press(page, "b3");
    await frames(page, 1);
    const timing = await page.locator("#g .pill").evaluate((el) => el.getAnimations().filter((a) => a.transitionProperty === "transform").map((a) => [a.effect.getTiming().duration, a.effect.getTiming().easing]));
    assert.deepEqual(timing, [[200, "cubic-bezier(0.16, 1, 0.3, 1)"]]);
    await page.locator("#g .pill").evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const pill = await pillOf(page);
    const at = await page.locator("#b3").boundingBox();
    assert.ok(near(pill.x, at.x) && near(pill.w, at.width), "on the third button");
    await context.close();
  });

  test("under reduced motion and in forced colours the pill is not drawn and the pressed button paints its own (Highlight and HighlightText in forced colours)", async () => {
    const reduced = await open(SEG, { reducedMotion: "reduce", scheme: "dark" });
    await frames(reduced.page);
    assert.equal((await pillOf(reduced.page)).display, "none");
    const own = await reduced.page.locator("#b1").evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).boxShadow]);
    assert.deepEqual(own, [await resolve(reduced.page, "color-mix(in srgb, var(--basalt-neutral-100) 9%, var(--basalt-surface-top))"), await resolve(reduced.page, "0 0 0 1px var(--basalt-border-hairline)", "box-shadow")]);
    await reduced.context.close();

    const { page, context } = await open(SEG);
    await page.emulateMedia({ forcedColors: "active" });
    await settle(page); // the pressed button's fill and ink are colour transitions: let them finish
    assert.equal((await pillOf(page)).display, "none");
    const forced = await page.locator("#b1").evaluate((el) => { const c = getComputedStyle(el); return [c.backgroundColor, c.color, c.forcedColorAdjust, c.boxShadow, c.outlineStyle]; });
    assert.deepEqual(forced, [await resolve(page, "Highlight"), await resolve(page, "HighlightText", "color"), "none", "none", "none"], "a fill, no inset outline");
    await context.close();
  });

  test("a segment built after the page is wired has no pill and still shows the pressed button's own", async () => {
    const { page, context } = await open('<main id="m"></main><button class="btn" data-open-palette>x</button>');
    await page.evaluate((markup) => document.getElementById("m").insertAdjacentHTML("beforeend", markup), SEG);
    assert.equal(await page.locator("#g .pill").count(), 0);
    const own = await page.locator("#b1").evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.notEqual(own, "rgba(0, 0, 0, 0)");
    await context.close();
  });
});

describe("a tab's icon", () => {
  test("sits on the label's centre line, 6px before it, and the underline stays horizontal", async () => {
    const { page, context } = await open(`<div data-tabs><div class="tabs" role="tablist" aria-label="V"><button class="tab" role="tab" id="t1" aria-controls="p1" aria-selected="true"><i data-icon="Copy"></i>With icon</button><button class="tab" role="tab" id="t2" aria-controls="p2" aria-selected="false">Plain</button></div>
      <div class="tabpanel" id="p1">A</div><div class="tabpanel" id="p2" hidden>B</div></div>`);
    const out = await page.locator("#t1").evaluate((tab) => {
      const c = getComputedStyle(tab), svg = tab.querySelector("svg").getBoundingClientRect(), box = tab.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents([...(tab.querySelector("[data-label]") ?? tab).childNodes].find((n) => n.nodeType === 3)); // the label's text sits in a span that carries its own copy (decision 138)
      const text = range.getBoundingClientRect();
      const after = getComputedStyle(tab, "::after");
      return { display: c.display, gap: c.columnGap, centre: [svg.top + svg.height / 2, box.top + box.height / 2, text.top + text.height / 2], gapPx: text.left - svg.right, under: [after.height, after.width, box.width] };
    });
    assert.deepEqual([out.display, out.gap], ["flex", "6px"], "a flex item of the bar, so its computed display is flex");
    assert.ok(Math.abs(out.centre[0] - out.centre[1]) < 0.6 && Math.abs(out.centre[2] - out.centre[1]) < 1.6, `centred: ${out.centre}`);
    assert.ok(Math.abs(out.gapPx - 6) < 0.6, `6px before the label: ${out.gapPx}`);
    assert.ok(out.under[0] === "2px" && Math.abs(parseFloat(out.under[1]) - out.under[2]) < 0.6, `a 2px underline across the tab: ${out.under}`);
    await context.close();
  });
});
