// Reserved room in the HTML skill (DECISIONS 336), in a browser, beside packages/react/test/reserved-room.test.mjs: the heads the skill hangs by itself
// (the panel head, the code head, the terminal's compact copy, a card's row of 20px marks), the toast's targets along its row, the search dialog's held top
// while one open dialog's results change, and the selection column from a `width` attribute and from a stylesheet. The data is synthetic.
// WRITTEN, NOT RUN: browser tests are paused (DECISIONS 330).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { settle } from "../../../packages/react/test/support.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const DIRS = ["ltr", "rtl"];
const hit = `(el) => { const r = el.getBoundingClientRect(); const s = el.offsetWidth ? r.width / el.offsetWidth : 1; const b = getComputedStyle(el, "::before"); if (b.content === "none" || b.position !== "absolute") return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; const n = (v) => (v === "auto" ? 0 : parseFloat(v)) * s; const x = { left: r.left + n(b.left), top: r.top + n(b.top), right: r.right - n(b.right), bottom: r.bottom - n(b.bottom) }; return { ...x, width: x.right - x.left, height: x.bottom - x.top }; }`;
const page = async (body, { theme = "dark", dir = "ltr", width = 1440, touch = false } = {}) => {
  const { page: p, errors } = await openHtml(browser, compose(`<title>Reserved room</title>${body}`, { fonts: true }).html, { scheme: theme, width, touch });
  await p.evaluate(([theme, dir]) => { document.documentElement.setAttribute("data-theme", theme); document.documentElement.dir = dir; }, [theme, dir]);
  await p.addScriptTag({ content: `window.__hit = ${hit};` });
  await settle(p);
  p.errors = errors;
  assert.equal(await p.evaluate(() => innerWidth), width);
  return p;
};

/** As React's: what the control shows from the head's inner edge on its side, its box to that edge, its hang, and its focused ring. */
const line = (p, head, control, side) => p.evaluate(([head, control, side]) => {
  const visible = (root, sel) => [...root.querySelectorAll(sel)].find((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
  const h = visible(document, head);
  const c = visible(h, control);
  const hs = getComputedStyle(h); const hr = h.getBoundingClientRect(); const rtl = hs.direction === "rtl";
  const innerStart = rtl ? hr.right - parseFloat(hs.borderRightWidth) : hr.left + parseFloat(hs.borderLeftWidth);
  const innerEnd = rtl ? hr.left + parseFloat(hs.borderLeftWidth) : hr.right - parseFloat(hs.borderRightWidth);
  const glyph = c.querySelector("svg");
  const range = document.createRange(); range.selectNodeContents(c);
  const shownRect = glyph && !c.textContent.trim() ? glyph.getBoundingClientRect() : range.getBoundingClientRect();
  const cr = c.getBoundingClientRect();
  const at = (x) => (side === "end" ? Math.abs(innerEnd - x) : Math.abs(x - innerStart));
  const shown = side === "end" ? at(rtl ? shownRect.left : shownRect.right) : at(rtl ? shownRect.right : shownRect.left);
  const clear = side === "end" ? at(rtl ? cr.left : cr.right) : at(rtl ? cr.right : cr.left);
  const cs = getComputedStyle(c);
  const hang = -parseFloat(side === "end" ? cs.marginInlineEnd : cs.marginInlineStart);
  c.focus({ focusVisible: true });
  const fs = getComputedStyle(c);
  return { shown, clear, hang, focused: document.activeElement === c, ring: parseFloat(fs.outlineOffset), outline: [fs.outlineStyle, parseFloat(fs.outlineWidth)], box: [cr.left, cr.top, cr.right, cr.bottom], head: [hr.left, hr.top, hr.right, hr.bottom] };
}, [head, control, side]);
const ringIsWhole = (m, want) => {
  assert.ok(m.focused);
  assert.equal(m.ring, want);
  assert.deepEqual(m.outline, ["solid", 2]);
  const reach = m.ring + 2;
  assert.ok(m.box[0] - reach >= m.head[0] - 0.5 && m.box[2] + reach <= m.head[2] + 0.5 && m.box[1] - reach >= m.head[1] - 0.5 && m.box[3] + reach <= m.head[3] + 0.5, "the ring is inside the head");
};

const MARKS = `<ul class="links" data-icon-only data-size="20" aria-label="Elsewhere"><li><a class="btn" data-variant="ghost" data-icon-only href="#g" aria-label="GitHub"><i data-icon="GithubLogo"></i></a></li><li><a class="btn" data-variant="ghost" data-icon-only href="#x" aria-label="X"><i data-icon="XLogo"></i></a></li></ul>`;
// [name, body, head, control, side, widths: { width: [shown, ring, hang] }]
const SITES = [
  ["the core's panel head", `<main class="page"><div class="panel"><div class="panel-head"><span>A panel head</span><span class="spacer"></span><button class="btn" data-variant="ghost" data-size="sm">Edit</button></div><div class="panel-pad">Body.</div></div></main>`, ".panel-head", ".btn", "end", { 1440: [16, 2, 10] }],
  ["the code head's Copy", `<main class="page"><div class="code"><div class="code-head"><span>alerts.json</span><span class="spacer"></span><button class="btn" data-variant="ghost" data-size="sm" data-edge="end" data-copy="#c1"><span data-glyph="copy"></span><span>Copy</span></button></div><pre class="code-body" tabindex="0"><code id="c1">{ "alerts": 3 }</code></pre></div></main>`, ".code-head", ".btn", "end", { 1440: [16, 2, 10] }],
  ["the terminal's compact copy", `<main class="page"><figure class="code terminal"><figcaption>Deploy</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="command">npm ci</span></code></pre></figure></main>`, ".terminal figcaption, .terminal .code-head", ".btn[data-icon-only]", "end", { 390: [16, -2, 14] }],
  ["a card's row of 20px marks", `<main class="page"><div class="card" style="width: 280px"><p style="margin: 0 0 12px">Ada Byron</p>${MARKS}</div></main>`, ".card", ".links .btn", "start", { 1440: [16, 2, 6], 390: [16, 2, 12] }],
];

describe("The heads the skill hangs by itself", () => {
  for (const [name, body, head, control, side, widths] of SITES) {
    for (const [width, [shown, ring, hang]] of Object.entries(widths)) {
      for (const dir of DIRS) {
        for (const theme of THEMES) {
          test(`${name}, ${width}, ${dir}, ${theme}: on the head's line, hung ${hang}, its ring at ${ring} and whole`, async () => {
            const p = await page(body, { theme, dir, width: Number(width), touch: width === "390" });
            const m = await line(p, head, control, side);
            assert.ok(Math.abs(m.shown - shown) <= 0.5, `shown ${m.shown}, want ${shown}`);
            assert.ok(Math.abs(m.hang - hang) <= 0.5, `hang ${m.hang}, want ${hang}`);
            ringIsWhole(m, ring);
            assert.deepEqual(p.errors, []);
            await p.close();
          });
        }
      }
    }
  }
});

describe("The toast's targets", () => {
  for (const theme of THEMES) {
    test(`${theme}, 390 on touch: the action and Dismiss are at least 44, inside the toast and apart, and the row answers action, toast, Dismiss across their whole hit areas`, async () => {
      const p = await page(`<main class="page"><p>A toast.</p></main><script>addEventListener("load", function () { Basalt.toast({ title: "Draft moved", action: { label: "Go", onClick: function () {} }, timeout: 0 }); });</script>`, { theme, width: 390, touch: true });
      await p.waitForSelector(".toast-close");
      await settle(p);
      const t = await p.evaluate(() => {
        const toast = document.querySelector(".toast");
        return { toast: toast.getBoundingClientRect().toJSON(), action: window.__hit(toast.querySelector(".toast-action")), dismiss: window.__hit(toast.querySelector(".toast-close")) };
      });
      for (const box of [t.action, t.dismiss]) {
        assert.ok(box.width >= 44 - 0.5 && box.height >= 44 - 0.5, `${box.width} by ${box.height}`);
        assert.ok(box.left >= t.toast.left - 0.5 && box.right <= t.toast.right + 0.5 && box.top >= t.toast.top - 0.5 && box.bottom <= t.toast.bottom + 0.5, "inside the toast");
      }
      const y = (t.dismiss.top + t.dismiss.bottom) / 2;
      const owners = await p.evaluate(([from, to, y]) => { let out = ""; for (let x = Math.ceil(from); x < Math.floor(to); x += 1) { const el = document.elementFromPoint(x + 0.5, y); out += el?.closest(".toast-close") ? "d" : el?.closest(".toast-action") ? "a" : el?.closest(".toast") ? "t" : "-"; } return out; }, [t.action.left, t.dismiss.right, y]);
      const m = /^(a+)(t+)(d+)$/.exec(owners);
      assert.ok(m, owners);
      assert.ok(Math.abs(m[1].length - Math.floor(t.action.width)) <= 1 && Math.abs(m[3].length - Math.floor(t.dismiss.width)) <= 1, owners);
      await p.close();
    });
  }
});

describe("The search dialog's held top", () => {
  const SEARCH = `<button class="btn" data-dialog-open="#q">Search</button>
<dialog class="panel float modal dialog search" id="q" aria-label="Search the shop"><form class="search-form" role="search"><label class="search-field"><span data-glyph="search"></span><span class="visually-hidden">Search products</span><input class="search-input" type="search" value="whey"></label><button type="button" class="btn search-close" data-variant="ghost" data-icon-only data-edge="end" aria-label="Close search" data-dialog-close><span data-glyph="close"></span></button></form>
<p class="search-count">0 products</p><ul class="search-results"></ul></dialog>
<script>addEventListener("load", function () { document.getElementById("q").showModal(); });</script>`;
  // Rows are written with DOM calls, as a page's own search would.
  const rows = (p, n) => p.evaluate((n) => {
    const list = document.querySelector(".search-results");
    list.replaceChildren(...Array.from({ length: n }, (_, i) => { const li = document.createElement("li"); const a = document.createElement("a"); a.className = "search-result"; a.href = `#r${i}`; const name = document.createElement("span"); name.className = "search-name"; name.textContent = `Result ${i + 1}`; a.append(name); li.append(a); return li; }));
    document.querySelector(".search-count").textContent = `${n} products`;
  }, n);
  const read = (p) => p.evaluate(() => {
    const d = document.querySelector("dialog.search").getBoundingClientRect();
    const l = document.querySelector(".search-results").getBoundingClientRect();
    return { ys: [document.querySelector(".search-input").getBoundingClientRect().y, document.querySelector(".search-count").getBoundingClientRect().y], gap: d.bottom - l.bottom, list: l.height, height: d.height };
  });
  for (const [form, width, shorter] of [["1440", 1440, null], ["390 with the keyboard up", 390, 480]]) {
    test(`${form}: the field and count keep their y as one open dialog's results change, and the box ends under its results`, async () => {
      const p = await page(SEARCH, { width, touch: width === 390 });
      await p.waitForSelector("dialog.search[data-held]");
      if (shorter) { await p.setViewportSize({ width, height: shorter }); await settle(p); }
      const reads = [];
      for (const n of [0, 2, 8, 2, 0]) { await rows(p, n); await settle(p); reads.push(await read(p)); }
      for (const r of reads) { assert.deepEqual(r.ys, reads[0].ys, JSON.stringify(reads.map((x) => x.ys))); assert.ok(Math.abs(r.gap - reads[0].gap) <= 0.5, "the box ends under its results"); }
      assert.equal(reads[0].list, 0, "an empty list has no height");
      assert.ok(reads[2].height > reads[0].height, "the box grows with its results");
      await p.close();
    });
  }
  test("the top is placed again when the usable window changes", async () => {
    const p = await page(SEARCH, { width: 390, touch: true });
    await p.waitForSelector("dialog.search[data-held]");
    const top = () => p.evaluate(() => document.querySelector("dialog.search").style.getPropertyValue("--_top"));
    const tall = await top();
    await p.setViewportSize({ width: 390, height: 480 });
    await settle(p);
    assert.notEqual(await top(), tall, "a shorter window places it again");
    await p.close();
  });
});

describe("The selection column", () => {
  const TABLE = (col, style = "") => `<style>${style}</style><main class="page"><div class="panel table-wrap" role="region" aria-label="Runs" tabindex="0" style="max-width: 420px"><table data-fixed><colgroup>${col}<col style="width: 140px"><col></colgroup>
<thead><tr><th class="select-col"><input type="checkbox" data-select-all aria-label="Select all runs"></th><th data-sortable>Run</th><th>Status</th></tr></thead>
<tbody><tr><td class="select-col"><input type="checkbox" aria-label="Select run-0142"></td><td>run-0142</td><td>Ready</td></tr></tbody></table></div></main>`;
  for (const [given, col, style] of [["a width attribute", `<col width="40">`, ""], ["a stylesheet", `<col class="pick">`, ".pick { width: 40px; }"]]) {
    test(`the select column given 40 by ${given}: 40 on a fine pointer with the box centred, 44 on touch`, async () => {
      for (const [width, touch, want] of [[1440, false, 40], [390, true, 44]]) {
        const p = await page(TABLE(col, style), { width, touch });
        const m = await p.evaluate(() => { const cell = document.querySelector("tbody td.select-col").getBoundingClientRect(); const box = document.querySelector("tbody td.select-col input").getBoundingClientRect(); return { w: cell.width, gaps: [box.left - cell.left, cell.right - box.right] }; });
        assert.ok(Math.abs(m.w - want) <= 0.5, `${width}: ${m.w}`);
        assert.ok(Math.abs(m.gaps[0] - m.gaps[1]) <= 0.5, `centred: ${m.gaps}`);
        await p.close();
      }
    });
  }
});
