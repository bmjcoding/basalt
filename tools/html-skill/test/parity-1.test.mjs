// The first parity PR, in a browser: the number field, the textarea, the native chrome Basalt has a design for (range, search clear, file,
// details), braille (the six-dot cell), the ring, the accent reader, the council's rulings and the forced-colours borders. The parity test
// compares computed styles with React; this file pins the behaviour and the geometry it can't read that way.
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, read, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (body, options) => openHtml(browser, compose(`<title>t</title>${body}`, { fonts: false }).html, options);
const NUMBER = '<div class="field"><label for="n">Count</label><span class="number-field"><input class="input num" id="n" type="number" value="3" min="0" max="12" step="1"></span></div>';

describe("the number field", () => {
  test("is [-] value [+]: two stepper buttons that are not tab stops and are named, the input 6 digits wide", async () => {
    const { page: p, context, errors } = await page(NUMBER);
    const out = await p.evaluate(() => {
      const box = document.querySelector(".number-field");
      const [down, input, up] = box.children;
      return {
        tags: [...box.children].map((c) => c.tagName), tab: [down.tabIndex, up.tabIndex], names: [down.getAttribute("aria-label"), up.getAttribute("aria-label")],
        height: box.getBoundingClientRect().height, display: getComputedStyle(box).display, steppers: [down.getBoundingClientRect().width, up.getBoundingClientRect().width],
        spin: getComputedStyle(input).appearance, svgs: box.querySelectorAll("button svg").length,
      };
    });
    assert.deepEqual(out.tags, ["BUTTON", "INPUT", "BUTTON"]);
    assert.deepEqual([out.tab, out.names, out.height, out.display, out.steppers, out.spin, out.svgs], [[-1, -1], ["Decrease value", "Increase value"], 32, "flex", [32, 32], "textfield", 2]);
    assert.deepEqual(errors, []);
    await context.close();
  });

  test("the buttons step once a click, honour min and max, fire input and change, and disable at the ends", async () => {
    const { page: p, context } = await page(NUMBER);
    await p.evaluate(() => { window.__events = []; const i = document.getElementById("n"); i.addEventListener("input", () => window.__events.push("input")); i.addEventListener("change", () => window.__events.push("change")); });
    const up = p.getByRole("button", { name: "Increase value" });
    const down = p.getByRole("button", { name: "Decrease value" });
    await up.click();
    assert.equal(await p.inputValue("#n"), "4");
    assert.deepEqual(await p.evaluate(() => window.__events), ["input", "change"]);
    for (let i = 0; i < 12; i++) await up.click({ force: true });
    assert.equal(await p.inputValue("#n"), "12", "stops at max");
    assert.equal(await up.isDisabled(), true, "disabled at max");
    assert.equal(await down.isDisabled(), false);
    await p.fill("#n", "0");
    assert.equal(await down.isDisabled(), true, "disabled at min once the value is typed");
    assert.equal(await up.isDisabled(), false);
    await context.close();
  });

  test("keyboard: arrows step one (native), Shift or Page Up and Down step ten, and a press does not take focus from the field", async () => {
    const { page: p, context } = await page(NUMBER.replace('max="12"', 'max="100"'));
    await p.locator("#n").focus();
    await p.keyboard.press("ArrowUp");
    assert.equal(await p.inputValue("#n"), "4");
    await p.keyboard.press("Shift+ArrowUp");
    assert.equal(await p.inputValue("#n"), "14");
    await p.keyboard.press("PageDown");
    assert.equal(await p.inputValue("#n"), "4");
    await p.keyboard.press("ArrowDown");
    assert.equal(await p.inputValue("#n"), "3");
    await p.getByRole("button", { name: "Increase value" }).click();
    assert.equal(await p.evaluate(() => document.activeElement.id), "n", "the field keeps focus");
    await p.keyboard.press("Tab");
    assert.equal(await p.evaluate(() => document.activeElement.tagName), "BODY", "Tab skips the steppers");
    await context.close();
  });

  test("a stepper keeps its colour step and never scales while pressed", async () => {
    const { page: p, context } = await page(NUMBER + '<button class="btn" id="plain">Plain</button>');
    for (const [selector, scales] of [[".number-field button:last-child", false], ["#plain", true]]) {
      const box = await p.locator(selector).boundingBox();
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await p.mouse.down();
      const out = await p.evaluate((sel) => { const s = getComputedStyle(document.querySelector(sel)); return [s.transform, s.backgroundColor]; }, selector);
      await p.mouse.up();
      assert.equal(out[0] !== "none", scales, `${selector} transform ${out[0]}`);
      assert.notEqual(out[1], "rgba(0, 0, 0, 0)", `${selector} takes the pressed wash`);
    }
    await context.close();
  });

  test("on touch the input is 16px and the steppers are 44px", async () => {
    const { page: p, context } = await page(NUMBER, { width: 390, touch: true });
    const out = await p.evaluate(() => {
      const [down, input, up] = document.querySelector(".number-field").children;
      return [getComputedStyle(input).fontSize, ...[down, up].map((b) => { const r = b.getBoundingClientRect(); return [r.width, r.height]; })];
    });
    assert.deepEqual(out, ["16px", [44, 44], [44, 44]]);
    await context.close();
  });

  test("an invalid or disabled field draws its state on the group, and a bare number input has no browser steppers", async () => {
    const { page: p, context } = await page(`${NUMBER.replace('type="number"', 'type="number" aria-invalid="true"')}<input class="input" id="bare" type="number" value="1"><span class="number-field"><input class="input" id="off" type="number" disabled></span>`);
    const out = await p.evaluate(() => {
      const boxes = document.querySelectorAll(".number-field");
      return { invalid: getComputedStyle(boxes[0]).boxShadow, off: getComputedStyle(boxes[1]).backgroundColor, bare: getComputedStyle(document.getElementById("bare")).appearance, disabled: [...boxes[1].querySelectorAll("button")].map((b) => b.disabled) };
    });
    assert.match(out.invalid, /inset/);
    assert.notEqual(out.off, "rgba(0, 0, 0, 0)");
    assert.equal(out.bare, "textfield");
    assert.deepEqual(out.disabled, [true, true]);
    await context.close();
  });
});

describe("the textarea", () => {
  test("is two lines plus 16px (56px) at its smallest, as React's", async () => {
    const { page: p, context } = await page('<textarea class="input" aria-label="Notes">Some text</textarea><textarea class="input" aria-label="Short" rows="1"></textarea>');
    assert.deepEqual(await p.evaluate(() => [...document.querySelectorAll("textarea")].map((t) => [getComputedStyle(t).minHeight, t.getBoundingClientRect().height])), [["56px", 56], ["56px", 56]]);
    await context.close();
  });
});

/** Counts the pixels in one column of an element's screenshot that differ from the colour at its top-left: what is drawn on that line. */
async function drawn(p, selector, x) {
  const png = await p.locator(selector).screenshot();
  return p.evaluate(async ([b64, col]) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = `data:image/png;base64,${b64}`; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const bg = g.getImageData(0, 0, 1, 1).data;
    const out = [];
    for (let y = 0; y < img.height; y++) { const d = g.getImageData(col, y, 1, 1).data; if (Math.abs(d[0] - bg[0]) + Math.abs(d[1] - bg[1]) + Math.abs(d[2] - bg[2]) > 30) out.push(y); }
    return out;
  }, [png.toString("base64"), x]);
}

describe("the range", () => {
  const RANGE = '<input type="range" id="r" aria-label="Volume" value="40" style="width: 240px">';
  test("is a 4px track and a 16px thumb, filled up to the thumb, in both themes", async () => {
    for (const scheme of ["dark", "light"]) {
      const { page: p, context } = await page(RANGE, { scheme });
      // value 40: the thumb centre is 8 + 224 * .4 = 97.6px in; a column well past it shows the track, a column at the thumb shows it
      assert.equal((await drawn(p, "#r", 200)).length, 4, `${scheme}: the track is 4px`);
      assert.equal((await drawn(p, "#r", 98)).length, 16, `${scheme}: the thumb is 16px`);
      const fill = await p.evaluate(() => getComputedStyle(document.getElementById("r")).getPropertyValue("--_x"));
      assert.equal(parseFloat(fill).toFixed(1), "97.6", `${scheme}: the fill ends at the thumb's centre`);
      await p.locator("#r").focus();
      await p.keyboard.press("End");
      assert.equal(parseFloat(await p.evaluate(() => getComputedStyle(document.getElementById("r")).getPropertyValue("--_x"))), 232, `${scheme}: the fill follows the value`);
      await context.close();
    }
  });

  test("the fill and the thumb are the primary colour and the rest of the track the input boundary", async () => {
    for (const scheme of ["dark", "light"]) {
      const { page: p, context } = await page(RANGE, { scheme });
      const png = (await p.locator("#r").screenshot()).toString("base64");
      const out = await p.evaluate(async (b64) => {
        const probe = (v) => { const d = document.createElement("i"); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
        const img = new Image(); await new Promise((r) => { img.onload = r; img.src = `data:image/png;base64,${b64}`; });
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
        const at = (x, y) => [...g.getImageData(x, y, 1, 1).data.slice(0, 3)];
        const colour = (v) => { g.fillStyle = probe("var(--basalt-surface-0)"); g.fillRect(0, 0, 1, 1); g.fillStyle = v; g.fillRect(0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)]; };
        const y = Math.round(img.height / 2), want = { on: colour(probe("var(--basalt-action-primary)")), off: colour(probe("var(--basalt-border-input)")) };
        return { fill: at(40, y), thumb: at(98, y), rest: at(200, y), want };
      }, png);
      assert.deepEqual(out.fill, out.want.on, `${scheme}: the fill`);
      assert.deepEqual(out.thumb, out.want.on, `${scheme}: the thumb`);
      assert.deepEqual(out.rest, out.want.off, `${scheme}: the rest of the track`);
      await context.close();
    }
  });

  test("is 44px tall on touch and shows the focus ring on its thumb alone", async () => {
    const { page: p, context } = await page(RANGE, { width: 390, touch: true });
    assert.equal(await p.evaluate(() => document.getElementById("r").getBoundingClientRect().height), 44);
    await context.close();
    const { page: q, context: c2 } = await page(RANGE);
    await q.locator("#r").focus();
    await q.keyboard.press("Tab");
    await q.keyboard.press("Shift+Tab");
    assert.equal(await q.evaluate(() => getComputedStyle(document.getElementById("r")).outlineStyle), "none", "no ring on the whole input");
    await c2.close();
  });
});

describe("native chrome", () => {
  test("the search clear button is Basalt's X in secondary ink: a mask of the Phosphor glyph, 24px (44px on touch)", async () => {
    const css = read(skillDir, "parts", "forms.css");
    assert.match(css, /::-webkit-search-cancel-button\{[^}]*mask:url\("data:image\/svg\+xml,%3Csvg[^"]*M208\.49,191\.51/, "the mask is the glyph from the icon data");
    const { page: p, context } = await page('<input class="input" id="s" type="search" value="query" style="width: 200px">');
    assert.match(css, /::-webkit-search-cancel-button\{appearance:none;width:var\(--basalt-size-control-xs\);height:var\(--basalt-size-control-xs\)/);
    assert.match(css, /@media\(pointer:coarse\)\{\.input\[type=search\]::-webkit-search-cancel-button\{width:var\(--basalt-size-tap-min\)/);
    await p.locator("#s").hover();
    const png = (await p.locator("#s").screenshot()).toString("base64");
    // the glyph is drawn at the right end: its ink box is 10 or 11px (Phosphor's X is 161 of 256 units at 16px) and it is not the browser's own
    const box = await p.evaluate(async (b64) => {
      const img = new Image(); await new Promise((r) => { img.onload = r; img.src = `data:image/png;base64,${b64}`; });
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const bg = g.getImageData(img.width - 30, 6, 1, 1).data; let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 4; y < img.height - 4; y++) for (let x = img.width - 36; x < img.width - 4; x++) { const d = g.getImageData(x, y, 1, 1).data; if (Math.abs(d[0] - bg[0]) > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      return [x1 - x0 + 1, y1 - y0 + 1];
    }, png);
    assert.ok(box[0] >= 9 && box[0] <= 12 && box[1] >= 9 && box[1] <= 12, `the X is drawn ${box.join("x")}`);
    await context.close();
  });

  test("a file input is a secondary button and its file name in secondary ink", async () => {
    const { page: p, context } = await page('<input type="file" id="f" aria-label="Upload">');
    const out = await p.evaluate(() => {
      const f = document.getElementById("f");
      const b = getComputedStyle(f, "::file-selector-button");
      return { height: b.height, radius: b.borderTopLeftRadius, weight: b.fontWeight, text: getComputedStyle(f).color, button: b.color, edge: [b.borderTopWidth, b.borderTopStyle] };
    });
    const probe = await p.evaluate(() => { const d = document.createElement("i"); d.style.color = "var(--basalt-text-secondary)"; document.body.append(d); return getComputedStyle(d).color; });
    assert.deepEqual([out.height, out.radius, out.weight, out.text], ["32px", "6px", "500", probe]);
    assert.deepEqual(out.edge, ["1px", "solid"], "a hairline edge (a border, not a shadow: forced colours keep it, and it rasterises the same every time)");
    await context.close();
  });

  test("<details> is drawn as the disclosure: no browser marker, a chevron that turns when it opens", async () => {
    const { page: p, context } = await page('<details id="d"><summary>Native</summary><p>Body</p></details><button class="disclosure" data-disclosure aria-expanded="false" aria-controls="b">Own</button><div id="b" hidden>x</div>');
    const read = () => p.evaluate(() => {
      const s = document.querySelector("summary"), b = document.querySelector("button.disclosure");
      const pick = (el) => { const c = getComputedStyle(el), a = getComputedStyle(el, "::after"); return [c.display, c.listStyleType, c.minHeight, c.fontWeight, c.color, a.width, a.transform]; };
      return { summary: pick(s), button: pick(b) };
    });
    const closed = await read();
    assert.deepEqual([closed.summary[0], ...closed.summary.slice(2, 6)], [closed.button[0], ...closed.button.slice(2, 6)], "the summary has the button's box, type and chevron");
    assert.equal(closed.summary[1], "none");
    await p.locator("summary").click();
    await p.waitForTimeout(300);
    const open = await read();
    assert.notEqual(open.summary[6], closed.summary[6], "the chevron turns");
    await p.locator("button.disclosure").click();
    await p.waitForTimeout(300);
    assert.equal((await read()).button[6], open.summary[6], "to the same place as the button's");
    await context.close();
  });
});

describe("braille", () => {
  const STATUS = '<p><span class="status" id="s"><braille-spinner></braille-spinner>Running</span></p>';
  test("is the six-dot cell: 6 by 10, six 2px dots on whole pixels, none drawn for the unlit bottom row", async () => {
    const { page: p, context } = await page(STATUS);
    const out = await p.evaluate(() => {
      const cell = document.querySelector("braille-spinner").getBoundingClientRect();
      const dots = [...document.querySelectorAll("braille-spinner circle")];
      return { cell: [cell.width, cell.height], viewBox: document.querySelector("braille-spinner svg").getAttribute("viewBox"), dots: dots.map((d) => [d.getAttribute("cx"), d.getAttribute("cy"), d.getAttribute("r")]), sizes: dots.map((d) => { const r = d.getBoundingClientRect(); return [r.width, r.height]; }) };
    });
    assert.deepEqual(out.cell, [6, 10]);
    assert.equal(out.viewBox, "0 0 6 10");
    assert.deepEqual(out.dots, [["1", "1", "1"], ["1", "5", "1"], ["1", "9", "1"], ["5", "1", "1"], ["5", "5", "1"], ["5", "9", "1"]]);
    assert.ok(out.sizes.every(([w, h]) => w === 2 && h === 2), "2px dots");
    await context.close();
  });

  test("steps over 800ms with step-end in the word's colour, and takes the status dot's seat and gap", async () => {
    const { page: p, context } = await page(STATUS);
    const out = await p.evaluate(() => {
      const dot = getComputedStyle(document.querySelector(".braille-dot"));
      const status = document.getElementById("s"), cell = document.querySelector("braille-spinner").getBoundingClientRect();
      const word = status.childNodes[1], range = document.createRange(); range.selectNodeContents(word);
      return { duration: dot.animationDuration, timing: dot.animationTimingFunction, fill: dot.fill, color: getComputedStyle(status).color, dotDrawn: getComputedStyle(status, "::before").content, gap: range.getBoundingClientRect().left - cell.right, left: cell.left - status.getBoundingClientRect().left };
    });
    assert.equal(out.duration, "0.8s");
    assert.match(out.timing, /steps\(1(, end)?\)|step-end/);
    assert.equal(out.fill, out.color, "the word's colour");
    assert.equal(out.dotDrawn, "none", "the status dot is not drawn beside it");
    assert.deepEqual([out.gap, out.left], [6, 0]);
    await context.close();
  });

  test("spinners share one clock: one mounted later ticks in phase", async () => {
    const { page: p, context } = await page(STATUS);
    await p.waitForTimeout(300);
    await p.evaluate(() => document.body.insertAdjacentHTML("beforeend", "<braille-spinner id='late'></braille-spinner>"));
    const times = await p.evaluate(() => { const a = document.querySelector("braille-spinner .braille-dot").getAnimations()[0], b = document.querySelector("#late .braille-dot").getAnimations()[0]; return [a.startTime, b.startTime]; });
    assert.deepEqual(times, [0, 0]);
    await context.close();
  });
});

describe("the ring spinner", () => {
  test("is a fixed 16px in secondary ink, and takes the ink around it only inside a button", async () => {
    const { page: p, context } = await page('<p style="font-size: 20px; color: var(--basalt-text-primary)"><span class="spinner" id="r" role="status" aria-label="x"></span></p><button class="btn" style="color: var(--basalt-status-danger)"><span class="spinner" id="b" role="status" aria-label="y"></span></button>');
    const out = await p.evaluate(() => {
      const ink = (v) => { const d = document.createElement("i"); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const r = getComputedStyle(document.getElementById("r")), b = getComputedStyle(document.getElementById("b"));
      return { size: [r.width, r.height], ring: r.color, inButton: b.color, secondary: ink("var(--basalt-text-secondary)"), danger: ink("var(--basalt-status-danger)") };
    });
    assert.deepEqual(out.size, ["16px", "16px"]);
    assert.equal(out.ring, out.secondary);
    assert.equal(out.inButton, out.danger);
    await context.close();
  });
});

describe("the accent reader", () => {
  const ACCENT = '<div data-accent="cobalt"><span class="status" data-status="accent" id="a">Needs you</span> <span class="badge" data-status="accent" id="b">Needs you</span></div><span class="status" data-status="accent" id="plain">Needs you</span><div data-accent="none"><span class="status" data-status="accent" id="none">x</span></div><div data-accent="violet"><span class="status" data-status="accent" id="unknown">x</span></div>';
  const dots = (p) => p.evaluate(() => {
    const dot = (id) => getComputedStyle(document.getElementById(id), "::before").backgroundColor;
    const probe = (v) => { const d = document.createElement("i"); d.style.color = v; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
    return { a: dot("a"), b: dot("b"), plain: dot("plain"), none: dot("none"), unknown: dot("unknown"), ink: probe("var(--basalt-text-primary)"), word: getComputedStyle(document.getElementById("a")).color };
  });

  for (const scheme of ["dark", "light"]) {
    test(`a status or badge dot reads cobalt under data-accent="cobalt", and is ink for no class, none and an unknown name (${scheme})`, async () => {
      const { page: p, context } = await page(ACCENT, { scheme });
      const d = await dots(p);
      const cobalt = scheme === "dark" ? "oklch(0.72 0.14 264)" : "oklch(0.47 0.17 264)";
      const expected = await p.evaluate((c) => { const x = document.createElement("i"); x.style.color = c; document.body.append(x); return getComputedStyle(x).color; }, cobalt);
      assert.equal(d.a, expected);
      assert.equal(d.b, expected);
      for (const id of ["plain", "none", "unknown"]) assert.equal(d[id], d.ink, `${id} is the ink dot`);
      assert.equal(d.word, d.ink, "the word stays ink");
      await context.close();
    });
  }

  test("without data-accent the page carries no accent sheet, and with it the sheet is only the classes", () => {
    const without = compose(ACCENT.replace(/data-accent="[a-z]+"/g, ""), { fonts: false }).html;
    // The accent sheet is the one that declares [data-accent=cobalt]. (It used to be told apart by light-dark(), which the lit-row plate and the
    // segment's pill now use too, so the test looks for the sheet's own selector, which is what "no accent sheet" means.)
    assert.ok(!without.includes("[data-accent=cobalt]"), "no accent sheet");
    assert.ok(without.includes("--basalt-accent-ink,"), "the reader (with its ink fallback) is in the status module");
    assert.ok(compose(ACCENT, { fonts: false }).html.includes('[data-accent=cobalt]'));
  });

  test("in forced colours the dot is a real fill in the system text colour", async () => {
    const context = await browser.newContext({ forcedColors: "active" });
    const p = await context.newPage();
    await p.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: compose(`<title>t</title>${ACCENT}`, { fonts: false }).html }));
    await p.goto("https://basalt.test/");
    const out = await p.evaluate(() => [getComputedStyle(document.getElementById("a"), "::before").backgroundColor, getComputedStyle(document.getElementById("a")).color, getComputedStyle(document.getElementById("a"), "::before").forcedColorAdjust]);
    assert.equal(out[0], out[1], "the dot is the text colour");
    assert.equal(out[2], "none");
    await context.close();
  });
});

describe("forced colours: real borders on fields and badges", () => {
  test(".input, a number group and .badge draw a ButtonText border instead of a box-shadow", async () => {
    const context = await browser.newContext({ forcedColors: "active" });
    const p = await context.newPage();
    await p.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: compose(`<title>t</title><input class="input" id="i" aria-label="x"><input class="input" id="d" disabled aria-label="y"><span class="badge" id="b">Plain</span>${NUMBER}`, { fonts: false }).html }));
    await p.goto("https://basalt.test/");
    const out = await p.evaluate(() => {
      const s = (el) => { const c = getComputedStyle(el); return [c.borderTopWidth, c.borderTopStyle, c.borderTopColor, c.boxShadow]; };
      return { input: s(document.getElementById("i")), disabled: s(document.getElementById("d")), badge: s(document.getElementById("b")), group: s(document.querySelector(".number-field")), inner: getComputedStyle(document.querySelector(".number-field input")).borderTopWidth };
    });
    for (const k of ["input", "badge", "group"]) { assert.deepEqual([out[k][0], out[k][1], out[k][3]], ["1px", "solid", "none"], k); }
    assert.notEqual(out.disabled[2], out.input[2], "a disabled field takes GrayText");
    assert.equal(out.inner, "0px", "the value inside the group has no border of its own");
    await context.close();
  });
});

describe("the council's parity rulings", () => {
  test("the tab panel adds no space above its content, and a code block's radius is 8", async () => {
    const { page: p, context } = await page('<div data-tabs><div class="tabs" role="tablist" aria-label="v"><button class="tab" role="tab" id="t1" aria-controls="p1" aria-selected="true">One</button></div><div class="tabpanel" id="p1" role="tabpanel" aria-labelledby="t1">Panel</div></div><div class="code"><pre class="code-body"><code>x</code></pre></div>');
    assert.deepEqual(await p.evaluate(() => [getComputedStyle(document.getElementById("p1")).paddingTop, getComputedStyle(document.querySelector(".code")).borderTopLeftRadius]), ["0px", "8px"]);
    await context.close();
  });
});
