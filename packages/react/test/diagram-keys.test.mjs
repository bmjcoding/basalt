// The spatial arrow keys (DECISIONS 306, 1.5; section 8's list for diagram-keys.test.mjs): drawn, the arrows go to the nearest card in that direction by
// the cards' columns and rows; stacked, and where some card could not be reached, they keep the author's order. In Chromium against the built package.
// The table is the decision's proof (proof/spatial-cells.json, copied to test/fixtures). The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const DATA = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams.json"), "utf8"));
const TABLE = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "diagram-spatial-cells.json"), "utf8"));
const NAMES = { architecture: "architecture", flowchart: "flowchart", dataFlow: "data flow", sequence: "sequence", schema: "schema" };
const P = "basalt-diagram";
const KEY = { right: "ArrowRight", left: "ArrowLeft", down: "ArrowDown", up: "ArrowUp" };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/cimip-diagrams.json";
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() {
  const [list, setList] = React.useState(() => Object.entries(data).map(([key, d]) => { const { type, ...props } = d; return { key, type, props }; }));
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, type, props }) => { const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

async function keysPage({ theme = "dark", width = 1440, dir } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1000 } });
  if (dir) await page.evaluate((dir) => { document.documentElement.dir = dir; }, dir);
  await page.addStyleTag({ content: "body{margin:0;padding:16px} #root{max-width:1104px;margin:0 auto}" });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 4);
  return { page, errors };
}
/** Focuses a card by script (as the keyboard would reach it), presses a key, and names the card focused after it. */
async function press(page, key, id, k) {
  await page.locator(`#fig-${key} .${P}-node[data-node="${id}"]`).focus();
  await page.keyboard.press(k);
  return page.evaluate(() => document.activeElement?.getAttribute("data-node") ?? null);
}

describe("drawn: the four-direction table", () => {
  for (const theme of ["dark", "light"]) for (const dir of ["ltr", "rtl"]) {
    test(`${theme}, ${dir}: each CIMIP figure's arrows equal the proof's table${dir === "rtl" ? ", left and right mirrored" : ""}`, async () => {
      const { page, errors } = await keysPage({ theme, dir });
      for (const [key, name] of Object.entries(NAMES)) {
        assert.equal(await page.locator(`#fig-${key}`).getAttribute("data-layout"), "drawn", key);
        const table = TABLE[name].table;
        for (const [id, ways] of Object.entries(table)) for (const [way, want] of Object.entries(ways)) {
          const k = dir === "rtl" && (way === "left" || way === "right") ? KEY[way === "left" ? "right" : "left"] : KEY[way];
          assert.equal(await press(page, key, id, k), want ?? id, `${key}: ${way} from ${id}`);
        }
      }
      assert.deepEqual(errors, []);
      await page.close();
    });
  }
  test("every card is reached from every card in the five figures; a figure built to strand a card keeps the author's order and warns", async () => {
    for (const name of Object.values(NAMES)) assert.equal(TABLE[name].everyCardFromEveryCard, true);
    const { page } = await keysPage();
    const warnings = [];
    page.on("console", (m) => { if (m.type() === "warning") warnings.push(m.text()); });
    // Five cards in an X: the middle one is reached from no corner by the rule (each corner's nearest card along an arrow is another corner), so the figure keeps
    // the author's order (Neon's B12: the earlier fixture stranded nothing, and the test accepted either answer).
    const X = [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]];
    const spec = { title: "Stranded", summary: "A card no arrow reaches.", nodes: X.map(([col, row], k) => ({ id: `n${k}`, name: `N${k}`, col, row })), edges: [] };
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const m = core.buildModel({ type: "architecture", ...spec });
    assert.equal(core.spatialTable(m), null, "the X strands a card");
    assert.ok(m.warnings.some((w) => /cannot be reached from another by the arrow keys/.test(w)), "and a development build says so");
    await page.evaluate((spec) => window.__set([{ key: "strand", type: "architecture", props: spec }]), spec);
    await frames(page, 4);
    assert.equal(await page.locator("#fig-strand").getAttribute("data-layout"), "drawn");
    // n0 is at column 1, row 1: spatially → would go to n3 (column 3, row 1); in the author's order it goes to n1.
    assert.equal(await press(page, "strand", "n0", "ArrowRight"), "n1");
    assert.equal(await press(page, "strand", "n1", "ArrowRight"), "n2");
    await page.close();
  });
});

describe("stacked and the hint", () => {
  test("stacked, the arrows are the author's order; the hint shows four arrows where the drawn figure has rows and columns, two otherwise", async () => {
    const { page } = await keysPage({ width: 600 });
    assert.equal(await page.locator("#fig-architecture").getAttribute("data-layout"), "stacked");
    const ids = DATA.architecture.nodes.map((n) => n.id);
    assert.equal(await press(page, "architecture", ids[0], "ArrowRight"), ids[1]);
    assert.equal(await press(page, "architecture", ids[1], "ArrowUp"), ids[0]);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await frames(page, 4);
    const arrows = (key) => page.locator(`#fig-${key} .${P}-hint > span:first-child kbd`).evaluateAll((ks) => ks.map((k) => k.textContent).filter((t) => /^[←↑↓→]$/.test(t)));
    assert.deepEqual(await arrows("architecture"), ["←", "↑", "↓", "→"]);
    assert.deepEqual(await arrows("sequence"), ["←", "→"]);
    const sentence = await page.locator(`#fig-architecture .${P}-drawing`).evaluate((d) => d.getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id)?.textContent).join(" "));
    assert.match(sentence, /the nearest part in that direction/);
    await page.close();
  });
});
