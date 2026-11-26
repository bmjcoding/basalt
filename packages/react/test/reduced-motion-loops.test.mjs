// Under reduced motion no Basalt loop runs (cimip-gaps-3 T1): the ring stands still at full opacity (standalone, in a busy Button and IconButton, in a
// running StageMark), a busy TextButton's underline is dashed and still, and the indeterminate Progress bar is its track only. Each is the held look,
// pixel for pixel. At full motion each is unchanged. Chromium, built package, real stylesheet, both themes.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const LOOPS = `createRoot(document.getElementById("root")).render(<div style={{ padding: 24, display: "grid", gap: 16, justifyItems: "start", width: 360 }}>
  <span id="ring"><B.Spinner label="Fetching the tide table" /></span>
  <span id="button"><B.Button loading>Save the recipe</B.Button></span>
  <span id="icon"><B.IconButton icon={B.SettingsGlyph} label="Settings" loading /></span>
  <span id="mark"><B.StageMark state="running" /></span>
  <span id="retry"><B.StageMark state="retrying" /></span>
  <span id="text"><B.TextButton loading>Write it again</B.TextButton></span>
  <div id="bar" style={{ width: 320 }}><B.Progress label="Indexing the photo library" value={null} /></div>
</div>);`;
const PARTS = ["#ring", "#button", "#icon", "#mark", "#retry", "#text", "#bar"];

const read = (page) => page.evaluate((parts) => parts.map((s) => {
  const el = document.querySelector(s);
  const infinite = el.getAnimations({ subtree: true }).filter((a) => a.effect?.getComputedTiming().iterations === Infinity).map((a) => a.animationName);
  const ring = el.querySelector(".basalt-spinner[data-variant='ring'] svg");
  const indicator = el.querySelector(".basalt-progress-indicator[data-indeterminate]");
  const label = el.querySelector(".basalt-text-button-label");
  return {
    part: s,
    infinite,
    ringOpacity: ring ? getComputedStyle(ring).opacity : null,
    indicator: indicator ? getComputedStyle(indicator).visibility : null,
    valuenow: el.querySelector("[role=progressbar]")?.getAttribute("aria-valuenow") ?? null,
    underline: label ? [getComputedStyle(label).textDecorationStyle, getComputedStyle(label).animationName] : null,
  };
}), PARTS);

for (const theme of ["dark", "light"]) {
  describe(`loops under reduced motion (${theme})`, () => {
    test("no infinite animation on any of them; the ring at opacity 1; the bar's indicator hidden with no aria-valuenow; the underline dashed and still", async () => {
      const { page, errors } = await fixturePage(browser, LOOPS, { theme, viewport: { width: 600, height: 500 }, reducedMotion: "reduce" });
      await settle(page);
      for (const r of await read(page)) {
        assert.deepEqual(r.infinite, [], `${r.part}: nothing loops`);
        if (r.ringOpacity !== null) assert.equal(r.ringOpacity, "1", `${r.part}: the ring at full opacity`);
        if (r.indicator !== null) { assert.equal(r.indicator, "hidden", "the track only"); assert.equal(r.valuenow, null, "still indeterminate"); }
        if (r.underline !== null) assert.deepEqual(r.underline, ["dashed", "none"]);
      }
      assert.deepEqual(errors, []);
    });

    test("at full motion each loop still runs", async () => {
      const { page } = await fixturePage(browser, LOOPS, { theme, viewport: { width: 600, height: 500 } });
      await settle(page);
      const r = Object.fromEntries((await read(page)).map((x) => [x.part, x]));
      for (const s of ["#ring", "#button", "#icon", "#mark", "#retry"]) assert.ok(r[s].infinite.includes("basalt-spin"), `${s} turns`);
      assert.ok(r["#text"].infinite.includes("basalt-underline-breathe"), "the underline breathes");
      assert.ok(r["#bar"].infinite.includes("basalt-indeterminate"), "the bar travels");
      assert.equal(r["#bar"].indicator, "visible");
    });

    test("under the hold the pixels equal the reduced-motion ones", async () => {
      const shot = async (options, held) => {
        const { page } = await fixturePage(browser, LOOPS, { theme, viewport: { width: 600, height: 500 }, ...options });
        if (held) await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
        await settle(page);
        // The ring's still drawing is where it stands at rest: both looks stop it at its first frame.
        const png = await page.locator("#root > div").screenshot({ animations: "disabled" });
        await page.close();
        return png;
      };
      const reduced = await shot({ reducedMotion: "reduce" }, false);
      const held = await shot({}, true);
      assert.ok(reduced.equals(held), "held and reduced motion draw the same pixels");
    });
  });
}

test("the stylesheet keeps no basalt-pulse: the ring's reduced-motion fade is gone with its readers", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { pkg } = await import("./support.mjs");
  const css = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
  assert.doesNotMatch(css, /basalt-pulse/);
});
