// The HTML skill's share of cimip-gaps-3 T2: `stats` (a stat that links, a value not observed, the hint), `runs` (the warning state, the static place mark),
// `terminal` (the warning stage line) and `sparkline` (the side scale from the data's own range, times and marks, generated digits), in both themes. A page
// composed from a body, opened in Chromium. Synthetic data (a tide gauge and a bakery). Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const BODY = `<main id="main" style="padding: 16px">
  <h1 class="visually-hidden">Gauge</h1>
  <div class="stats">
    <div class="stat" id="tide">
      <span class="stat-label"><span id="t-l">Tide height</span><button class="stat-hint" popovertarget="t-h" aria-label="About tide height"><i data-icon="Info"></i></button></span>
      <div class="panel float popover" popover id="t-h"><h2 class="popover-title">Tide height</h2><p class="popover-description">Above chart datum.</p></div>
      <span class="stat-value"><a class="stat-link" href="#tides" aria-labelledby="t-l t-f" aria-describedby="t-n"><span id="t-f">2.4 m</span></a></span>
      <span class="stat-note" id="t-n">Rising</span>
    </div>
    <div class="stat" id="loaves">
      <span class="stat-label"><span id="l-l">Loaves</span></span>
      <span class="stat-value"><a class="stat-link" href="https://example.com" target="_blank" aria-labelledby="l-l l-f"><span id="l-f">128</span></a></span>
    </div>
    <div class="stat" id="temp"><span class="stat-label">Water temperature</span><span class="stat-value" data-missing>Not observed</span><span class="stat-note">Sensor offline</span></div>
  </div>
  <ol class="run-stages" aria-label="Bake stages">
    <li class="run-stage" data-state="warning"><span class="run-mark" data-state="warning" aria-hidden="true"></span><span class="run-stage-name">Proof</span><span class="run-stage-word">Over-proofed</span><span class="run-stage-time">41 min</span></li>
  </ol>
  <p><span class="run-place"><span class="run-place-pills" aria-hidden="true"><i data-form="passed"></i><i data-form="current"></i><i data-form="empty"></i></span><span class="run-place-label">Proof</span> <span class="run-place-count" data-widest="3 of 3"><span>2 of 3</span></span></span></p>
  <p><span class="run-place"><span class="run-place-pills" aria-hidden="true"><i data-form="empty"></i><i data-form="empty"></i><i data-form="empty"></i></span><span class="run-place-label">Proof</span> <span class="run-place-count" data-widest="3 of 3"><span>0 of 3</span></span></span></p>
  <figure class="code terminal" data-stages><figcaption>Bake log</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="stage" data-state="warning" data-time="41 min">proof (partial)</span></code></pre></figure>
  <div class="sparkline" id="drift" style="width: 400px"><script type="application/json" data-sparkline>{ "label": "Drift", "data": [0.01, 0.02, 0.04, 0.03], "times": ["2026-11-25T14:00:00Z", "2026-11-25T14:05:00Z", "2026-11-25T14:20:00Z", "2026-11-25T14:30:00Z"], "marks": [{ "time": "2026-11-25T14:05:00Z", "label": "Calibration" }] }</script></div>
</main>`;
const html = compose(BODY).html;
const settle = (page) => page.evaluate(() => new Promise((r) => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 300)));

for (const theme of ["dark", "light"]) {
  describe(`the T2 skill parts, ${theme}`, () => {
    test("stats: the whole cell is the link, the new-tab words' id is last in its name, missing words are tertiary, the hint opens its popover", async () => {
      const { page, context, errors } = await openHtml(browser, html, { scheme: theme });
      await settle(page);
      const box = await page.locator("#tide").boundingBox();
      for (const [fx, fy] of [[0.1, 0.9], [0.5, 0.5], [0.9, 0.9]]) {
        const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest(".stat-link, .stat-hint")?.className ?? null, [box.x + box.width * fx, box.y + box.height * fy]);
        assert.ok(hit, `(${fx}, ${fy})`);
      }
      assert.equal(await page.locator("#tide .stat-cue").count(), 1);
      const name = await page.evaluate(() => { const a = document.querySelector("#loaves a"); return a.getAttribute("aria-labelledby").split(/\s+/).map((id) => document.getElementById(id).textContent.trim()).join(" "); });
      assert.equal(name, "Loaves 128 (opens in a new tab)");
      const [missing, tertiary] = await page.evaluate(() => { const s = document.createElement("span"); s.style.color = "var(--basalt-text-tertiary)"; document.body.append(s); return [getComputedStyle(document.querySelector("#temp .stat-value")).color, getComputedStyle(s).color]; });
      assert.equal(missing, tertiary);
      await page.click(".stat-hint");
      assert.ok(await page.locator("#t-h").evaluate((el) => el.matches(":popover-open")));
      assert.deepEqual(errors, []);
      await context.close();
    });

    test("runs and terminal: the warning mark is drawn, its word primary at 500; the place mark's words start at one x for 2 of 3 and 0 of 3", async () => {
      const { page, context } = await openHtml(browser, html, { scheme: theme });
      await settle(page);
      assert.equal(await page.locator(".run-mark[data-state='warning'] svg").count(), 1);
      assert.equal(await page.locator(".run-stage[data-state='warning'] .run-stage-word").evaluate((el) => getComputedStyle(el).fontWeight), "500");
      const xs = await page.locator(".run-place-label").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
      assert.equal(xs[0], xs[1]);
      assert.equal(await page.locator(".terminal-line[data-state='warning'] .terminal-word").evaluate((el) => el.textContent.trim()), "Warning");
      await context.close();
    });

    test("sparkline: 0.04 at the top of the scale, never 0; the mark on the line at its moment; the headline's characters are generated content; axe", async () => {
      const { page, context } = await openHtml(browser, html, { scheme: theme });
      await settle(page);
      assert.equal(await page.locator("#drift .sparkline-scale > span").first().textContent(), "0.04");
      assert.equal(await page.locator("#drift .sparkline-value").evaluate((el) => el.textContent), "0.03");
      assert.equal(await page.locator("#drift .sparkline-plot .sparkline-mark").count(), 1);
      assert.match(await page.locator("#drift svg[role='img']").getAttribute("aria-label"), /^Drift, 0\.03, .+ to .+, peak 0\.04, Calibration at /);
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map((v) => v.id));
      assert.deepEqual(violations, []);
      await context.close();
    });
  });
}
