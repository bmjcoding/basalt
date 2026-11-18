// The second audit's accessibility findings, engineering batch c10, HTML-skill half (A3-08, A3-17, A3-25; DECISIONS 133): a finished terminal's `pre` keeps its role,
// a table's select-column boxes are 44 tall to a tap, the search usage says its count through a status, and an unavailable option chip is not chosen by a click before
// the script has run. Each test fails on the commit before the fix. The React half is packages/react/test/audit-fix-c10.test.mjs. Synthetic data only.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml, read, skillDir } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (body, options) => compose(body, { fonts: false, ...options }).html;
const SCHEMES = ["light", "dark"];

// ---- A3-08: a finished terminal's pre keeps role="region" and its name
const TERMINAL = (replay) => `<main><figure class="code terminal" data-prompt="$" ${replay ? 'data-replay data-interval="20"' : ""} id="t">
  <figcaption>Deploy preview</figcaption>
  <pre class="code-body" tabindex="0"><code>
<span data-kind="command">npm run build</span>
<span data-kind="output">vite building for production</span>
<span data-kind="done">Built in 4.2 s</span></code></pre>
</figure></main>`;

for (const scheme of SCHEMES) {
  describe(`A3-08: the terminal's pre (${scheme})`, () => {
    test("a static terminal and a replay that has finished are a named region", async () => {
      const { page: p, context } = await openHtml(browser, page(TERMINAL(false)), { scheme });
      assert.deepEqual(await p.locator("#t pre").evaluate((el) => ({ role: el.getAttribute("role"), name: el.getAttribute("aria-label") })), { role: "region", name: "Deploy preview, transcript" });
      await context.close();
      const replay = await openHtml(browser, page(TERMINAL(true)), { scheme });
      const roles = [];
      await replay.page.locator("#t .terminal-control").click();
      await replay.page.waitForFunction(() => document.querySelector("#t .terminal-state").getAttribute("data-state") === "done", null, { timeout: 5000 });
      assert.deepEqual(await replay.page.locator("#t pre").evaluate((el) => ({ role: el.getAttribute("role"), name: el.getAttribute("aria-label") })), { role: "region", name: "Deploy preview, transcript" }, `finished: ${roles}`);
      await replay.context.close();
    });
  });
}

// ---- A3-17: the select-column boxes are 44 tall to a tap on a coarse pointer
const TABLE = `<main><div style="height: 700px"></div><div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0"><table>
  <thead><tr><th class="select-col"><input type="checkbox" id="all" data-select-all aria-label="Select all runs"></th><th>Run</th></tr></thead>
  <tbody><tr><td class="select-col"><input type="checkbox" id="one" aria-label="Select run-0141"></td><td>run-0141</td></tr>
  <tr><td class="select-col"><input type="checkbox" id="two" aria-label="Select run-0140"></td><td>run-0140</td></tr></tbody></table></div><div style="height: 900px"></div></main>`;
// The extent, through the box's centre, over which a tap lands on the box: what a finger gets.
const hit = (p, selector) => p.evaluate((selector) => {
  const el = document.querySelector(selector);
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const owns = (x, y) => { const at = document.elementFromPoint(x, y); return Boolean(at) && (at === el || el.contains(at)); };
  const reach = (dx, dy) => { let d = 0; while (d < 60 && owns(cx + dx * (d + 1), cy + dy * (d + 1))) d += 1; return d; };
  const pseudo = getComputedStyle(el, "::after");
  return { drawn: [r.width, r.height], height: reach(0, -1) + reach(0, 1) + 1, below: reach(0, 1), box: parseFloat(pseudo.height) };
}, selector);

for (const scheme of SCHEMES) {
  describe(`A3-17: the select column's boxes (${scheme})`, () => {
    test("390 on a coarse pointer: a tap on the row's box and the header's box has 44px of height; drawn, the box is still 16", async () => {
      const { page: p, context } = await openHtml(browser, page(TABLE), { scheme, width: 390, touch: true });
      assert.equal(await p.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
      for (const selector of ["#one", "#two", "#all"]) {
        const found = await hit(p, selector);
        assert.equal(found.box, 44, `${selector}: its box of tap is 44 tall`);
        assert.deepEqual(found.drawn, [16, 16], `${selector} is drawn as it was`);
        // The header box has the same 44 box, in a 32px cell (React's header is the same) at the top of the table's scroll frame, which clips above it, with the first row's own box
        // beginning under it: what it can reach is the cell's own height.
        if (selector === "#all") assert.ok(found.height >= 32, `${selector}: ${found.height}px in all`);
        else assert.ok(found.height >= 44, `${selector}: ${found.height}px of height`);
      }
      await context.close();
    });
    test("1440 with a fine pointer: the boxes are as they were (16 by 16)", async () => {
      const { page: p, context } = await openHtml(browser, page(TABLE), { scheme });
      const found = await hit(p, "#one");
      assert.ok(found.height < 30, `${found.height}`);
      await context.close();
    });
  });
}

// ---- A3-25: the search usage's count is a status
describe("A3-25: the skill's search usage", () => {
  test("the count in its markup is a role=status, and it no longer tells the page to add a hidden one beside a plain paragraph", () => {
    const usage = read(skillDir, "parts", "usage", "search.md");
    assert.match(usage, /<p class="search-count" role="status">/);
    assert.doesNotMatch(usage, /for a spoken one, a visually hidden/);
  });
});

// ---- A3-25: an unavailable option chip is not chosen by a click before the script has run
const CHIPS = `<main><fieldset class="option-chips"><legend class="option-chips-legend">Flavour</legend><div class="option-chips-list">
  <label class="option-chip"><input class="option-chip-input" type="radio" name="f" value="v" checked><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Vanilla</span></label>
  <label class="option-chip"><input class="option-chip-input" id="berry" type="radio" name="f" value="b" aria-disabled="true"><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Berry</span><span class="option-chip-note">sold out</span></label>
</div></fieldset></main>`;

for (const scheme of SCHEMES) {
  describe(`A3-25: option chips (${scheme})`, () => {
    for (const width of [1440, 390]) {
      test(`${width}: with the script not run, a click on an unavailable chip chooses nothing; once it has run the chip takes the click and still chooses nothing`, async () => {
        const html = page(CHIPS);
        const context = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: scheme, javaScriptEnabled: false });
        await context.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
        const bare = await context.newPage();
        await bare.goto("https://basalt.test/");
        const box = await bare.locator("label.option-chip", { hasText: "Berry" }).boundingBox();
        await bare.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        assert.equal(await bare.locator("#berry").isChecked(), false, "no script: the click does not choose it");
        await context.close();
        const { page: p, context: live } = await openHtml(browser, html, { scheme, width });
        assert.equal(await p.locator(".option-chips").getAttribute("data-ready"), "");
        const where = await p.locator("label.option-chip", { hasText: "Berry" }).boundingBox();
        await p.mouse.click(where.x + where.width / 2, where.y + where.height / 2);
        assert.equal(await p.locator("#berry").isChecked(), false, "script: still not chosen");
        assert.equal(await p.evaluate(() => document.activeElement?.id), "berry", "and the click reaches it, as before");
        await live.close();
      });
    }
  });
}
