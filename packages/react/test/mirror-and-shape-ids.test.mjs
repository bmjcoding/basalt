// Two faults the first app's browser suite found (2026-11-22). Synthetic data only.
// 1. A checkbox's hidden form input (the mirror) was absolute at its place in the flow, so in a scrolling list that is not itself positioned, under a
//    sticky or positioned ancestor, it escaped the list's clipping and stretched the page by the list's scrolled height. It now sits at the top start
//    of its containing block.
// 2. A LoadingShape draws the app's parts (twice with a prefill), so it held the app's ids twice: the app's getElementById found the inert copy. Ids
//    inside the shape move to data-shape-id.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("A checkbox's hidden input in a scrolling list", () => {
  for (const theme of ["dark", "light"]) {
    test(`does not stretch the page past the list's clipping (${theme})`, async () => {
      const rows = Array.from({ length: 40 }, (_, i) => `<li key={${i}} style={{ height: 44, display: "flex", alignItems: "center" }}><B.Checkbox aria-label="Reviewer ${i + 1}" /></li>`).join("");
      const { page } = await fixturePage(browser, `document.body.style.margin = "0"; createRoot(document.getElementById("root")).render(
        <div style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
          <ul style={{ flex: 1, minHeight: 0, overflow: "auto", margin: 0, padding: 0, listStyle: "none" }}>${rows}</ul>
          <footer style={{ height: 56 }}>Synthetic foot</footer>
        </div>);`, { theme, viewport: { width: 800, height: 600 } });
      await settle(page);
      const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, view: innerHeight, foot: document.querySelector("footer").getBoundingClientRect().bottom, mirrors: document.querySelectorAll("input[data-basalt-mirror]").length }));
      assert.equal(m.mirrors, 40, "every mirror is marked");
      assert.ok(m.scroll <= m.view, `the page is not stretched (${m.scroll} against ${m.view})`);
      assert.ok(m.foot <= m.view, `the foot stays on screen (${m.foot})`);
      await page.close();
    });
  }
});

describe("Ids inside a LoadingShape", () => {
  test("the drawing and its twin hold no id; each moves to data-shape-id, and the loaded content keeps its own", async () => {
    const { page } = await fixturePage(browser, `function Card({ name }) { return <section id="approval-1"><h3 id="approval-1-title">{name}</h3></section>; }
      function App() {
        const [ready, setReady] = React.useState(false);
        window.__load = () => setReady(true);
        return <B.LoadingShape loading={!ready} showAfter={0} prefill={() => <Card name="Synthetic approval" />}>{() => <Card name="Synthetic approval" />}</B.LoadingShape>;
      }
      createRoot(document.getElementById("root")).render(<App />);`, { theme: "dark", viewport: { width: 800, height: 600 } });
    await settle(page);
    await page.waitForTimeout(100);
    const loading = await page.evaluate(() => ({ ids: document.querySelectorAll("#approval-1, #approval-1-title").length, moved: document.querySelectorAll('[data-shape-id="approval-1"]').length }));
    assert.equal(loading.ids, 0, "no id inside the shape while it loads");
    assert.equal(loading.moved, 2, "the drawing and its twin each keep the id as data-shape-id");
    await page.evaluate(() => window.__load());
    await page.waitForTimeout(600);
    const loaded = await page.evaluate(() => ({ ids: document.querySelectorAll("#approval-1").length, inShape: !!document.getElementById("approval-1")?.closest(".basalt-bones") }));
    assert.equal(loaded.ids, 1, "the loaded card has its id, once");
    assert.equal(loaded.inShape, false);
    await page.close();
  });
});
