// Micro-details m2 in the HTML skill (DECISIONS 419): tabular figures on time, .badge and .status; the clamp keeps its wrap inside a pretty parent; balanced
// titles and pretty bodies in the dialog, popover and callout; smoothing by theme in the core, with optimizeLegibility kept; translate="no" from the code,
// terminal and kbd scripts; and the date-and-age markup. Composed pages in Chromium, both themes. Synthetic data (a tide gauge and a bakery).
// Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (body, root = "") => compose(`<title>m2</title>${body}`, { fonts: false }).html.replace("<html", `<html${root}`);
const style = (p, selector, prop) => p.evaluate(([s, k]) => getComputedStyle(document.querySelector(s))[k], [selector, prop]);

const BODY = `<main class="page">
  <p id="sentence">High tide at <time id="time" datetime="2026-11-04T06:42">6:42&nbsp;AM</time>, 1.8&nbsp;m.</p>
  <span class="badge" data-status="success" id="badge">11 loaves</span> <span class="status" data-status="pending" id="status">Proofing 3 of 12</span>
  <div class="prose" style="width: 320px">
    <p data-lines="1" id="one">Tide tables for the outer harbour and the north breakwater gauge, read every six minutes and kept for a year</p>
    <p data-lines="2" id="two">Tide tables for the outer harbour and the north breakwater gauge, read every six minutes and kept for a year, and the same again</p>
    <blockquote id="quote"><p>“The rye proves overnight in the cold room.”</p></blockquote>
  </div>
  <p><time datetime="2026-11-01">Nov&nbsp;1</time><span class="dot-sep" data-spaced><span class="visually-hidden">, </span></span><span class="date-age-age" id="age">11&nbsp;days ago</span></p>
  <div class="callout" data-status="warning"><div><div class="callout-title" id="callout-title">The north gauge reads low after a storm surge</div><div class="callout-body" id="callout-body">Readings from the north breakwater are held back until a person checks them against the south gauge.</div></div></div>
  <div class="panel float popover" popover id="pop"><h2 class="popover-title" id="pop-title">Station</h2><p class="popover-description" id="pop-desc">Where the gauge reads from.</p></div>
  <dialog class="panel float modal dialog" id="d"><h2 class="dialog-title" id="dialog-title">Rename the gauge</h2></dialog>
  <div class="code"><pre class="code-body" tabindex="0" id="code"><code>bake --loaves 12</code></pre></div>
  <div class="code"><pre class="code-body" tabindex="0" id="code-yes" translate="yes"><code>bake --loaves 12</code></pre></div>
  <figure class="code terminal" data-stages><figcaption>Bake</figcaption><pre class="code-body" tabindex="0" id="term"><code><span data-kind="command">oven set 220</span>
<span data-kind="stage" data-state="done" data-word="Passed" data-time="0.7 s">Preheated</span></code></pre></figure>
  <p>Search: <span data-kbd="Mod K"></span></p>
</main>`;

for (const scheme of ["dark", "light"]) {
  describe(`the skill (${scheme})`, () => {
    test("tabular figures on time, .badge, .status and the age; a sentence keeps proportional figures", async () => {
      const { page: p, context } = await openHtml(browser, page(BODY), { scheme });
      for (const s of ["#time", "#badge", "#status", "#age"]) assert.equal(await style(p, s, "fontVariantNumeric"), "tabular-nums", s);
      assert.equal(await style(p, "#sentence", "fontVariantNumeric"), "normal");
      assert.equal(await style(p, "#age", "color"), await p.evaluate(() => { const d = document.createElement("i"); d.style.color = "var(--basalt-text-tertiary)"; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }));
      await context.close();
    });
    test("a one-line cut in a pretty parent keeps nowrap and one line; a two-line clamp is wrap; titles balance and bodies are pretty", async () => {
      const { page: p, context } = await openHtml(browser, page(BODY), { scheme });
      assert.match(await style(p, "#one", "textWrap"), /^nowrap/);
      assert.equal(await p.evaluate(() => { const el = document.getElementById("one"); return Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)); }), 1);
      assert.equal(await style(p, "#two", "textWrap"), "wrap");
      for (const s of ["#callout-title", "#pop-title", "#dialog-title"]) assert.equal(await style(p, s, "textWrap"), "balance", s);
      for (const s of ["#callout-body", "#pop-desc"]) assert.equal(await style(p, s, "textWrap"), "pretty", s);
      await context.close();
    });
    test("code has no ligatures; the code, terminal and kbd scripts set translate=\"no\" (a page's own value kept), and the stage words still translate", async () => {
      const { page: p, context } = await openHtml(browser, page(BODY), { scheme });
      for (const s of ["#code", "#term", ".kbd"]) assert.equal(await style(p, s, "fontVariantLigatures"), "none", s);
      const attr = (s) => p.evaluate((sel) => document.querySelector(sel)?.getAttribute("translate") ?? null, s);
      assert.equal(await attr("#code"), "no");
      assert.equal(await attr("#code-yes"), "yes");
      assert.equal(await attr("#term"), "no");
      assert.equal(await attr("#term .terminal-word"), "yes");
      assert.deepEqual([...new Set(await p.evaluate(() => [...document.querySelectorAll(".kbd")].map((k) => k.getAttribute("translate"))))], ["no"]);
      await context.close();
    });
  });
}

describe("smoothing by theme in the core (m2 T6)", () => {
  const NESTED = `<p id="top">Tide tables.</p><section data-theme="light"><p id="in-light">Light inside.</p><section data-theme="dark"><p id="in-dark">Dark inside.</p></section></section><button class="btn" id="btn">Save</button>`;
  // The core's head snippet writes the root's data-theme from the stored choice or the system before first paint, so the root follows the system here and a
  // nested section follows its own theme.
  const cases = [
    { name: "a dark system", root: "", scheme: "dark", top: "antialiased" },
    { name: "a light system", root: "", scheme: "light", top: "auto" },
  ];
  for (const c of cases) {
    test(`${c.name}: ${c.top}; a nested light is auto and a nested dark antialiased; a button follows its page`, async () => {
      const { page: p, context } = await openHtml(browser, page(NESTED, c.root), { scheme: c.scheme });
      const r = await p.evaluate(() => Object.fromEntries(["top", "in-light", "in-dark", "btn"].map((id) => [id, getComputedStyle(document.getElementById(id)).webkitFontSmoothing])));
      assert.deepEqual(r, { top: c.top, "in-light": "auto", "in-dark": "antialiased", btn: c.top });
      assert.equal(await p.evaluate(() => getComputedStyle(document.body).textRendering), "optimizelegibility");
      await context.close();
    });
  }
});
