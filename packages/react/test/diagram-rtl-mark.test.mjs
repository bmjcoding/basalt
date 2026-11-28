// A service mark over a card's first line, right to left (DECISIONS 292, 2.1 to 2.7; the decider's bug fix of 28 Nov 2026). The card and its mark are set
// left to right on the drawing and its lines right to left again (DECISIONS 306, 1.7), so the first line's space-6 clearance is on the mark's side in both
// directions: its end left to right, its start right to left. In both directions, drawn and stacked, on every card that draws a mark (an architecture card,
// the focal card, a card whose first line is the count or the name, a deployment host with artifacts and without), the first line's ink stays space-6 from
// the mark's outer edge, so space-2 clear of the mark itself. Chromium against the built package. Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const { deploymentType } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-deployment.js")).href);
const P = "basalt-diagram";

// A kind long enough to reach the mark on any track, so a clearance on the wrong side shows as ink under the mark.
const LONG = "managed container orchestration service";
const nodes = (api, db = {}) => [
  { id: "gw", kind: "gateway", name: "Gateway", col: 1, row: 1 },
  { id: "api", kind: LONG, name: "API", detail: "Handles requests", group: "compute", col: 2, row: 1, mark: "ecs", ...api },
  { id: "db", kind: "database", name: "Database", col: 3, row: 1, ...db },
];
const arch = (api, db) => ({ type: "architecture", title: "t", summary: "s", legend: { main: "Request", ...(api.focal ? { focal: "The service" } : {}) }, groups: [{ id: "compute", label: "Compute" }], nodes: nodes(api, db), edges: [{ from: "gw", to: "api" }, { from: "api", to: "db" }] });
const deploy = (api, db) => { const { ext: _ext, ...d } = { ...arch(api, db), type: "deployment", ext: deploymentType(), environment: "Production", edges: [{ from: "gw", to: "api", label: "HTTPS" }, { from: "api", to: "db", label: "SQL" }] }; return d; };

/** Every card that draws a mark: [figure key, spec, the card's id]. */
const CARDS = [
  ["architecture", arch({}), "api"],
  ["count-kind", arch({ replicas: 3 }), "api"],
  ["focal", arch({ focal: true }), "api"],
  ["count-only", arch({ kind: undefined, replicas: 120 }), "api"],
  ["name-only", arch({ kind: undefined, name: "Orchestrated container service API" }), "api"],
  ["host", deploy({}), "api"],
  ["host-count", deploy({ replicas: 3 }), "api"],
  ["host-rows", deploy({ replicas: 3, artifacts: [{ id: "jar", name: "api.jar", detail: "Java 21" }] }), "api"],
  ["host-rows-focal", deploy({ focal: true, artifacts: [{ id: "jar", name: "api.jar" }] }), "api"],
];

const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;
const HOST = `
import { awsEcsService } from "./dist/marks/aws-ecs-service.js";
const C = { architecture: B.ArchitectureDiagram, deployment: B.DeploymentDiagram };
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 48 }}>{list.map(({ key, spec, dir }) => { const { type, ...props } = spec; const X = C[type]; props.nodes = props.nodes.map((n) => (n.mark === "ecs" ? { ...n, mark: awsEcsService } : n)); return <div key={key} dir={dir}><X id={"fig-" + key} {...props} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function figures(dir, { theme = "dark", width = 1440, media } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1000 } });
  if (media) await page.emulateMedia(media);
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((list) => window.__set(list), CARDS.map(([key, spec]) => ({ key, spec, dir })));
  await page.waitForFunction((n) => document.querySelectorAll(".basalt-diagram[data-layout]").length >= n, CARDS.length);
  await frames(page, 4);
  return { page, errors };
}

/** The card's first line beside its mark: the mark's box, the ink of the line on the mark's row, which side the mark is on, and the clearances. */
const clearance = (page, key, id) => page.evaluate(([key, id]) => {
  const card = document.querySelector(`#fig-${key} .basalt-diagram-node[data-node="${id}"]`);
  const mark = card.querySelector(":scope > .basalt-diagram-mark");
  const next = mark.nextElementSibling;
  const line = next.classList.contains("basalt-diagram-host-head") ? next.firstElementChild : next;
  const m = mark.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(line);
  // The ink on the mark's row: every text box that shares any of the mark's height.
  const ink = [...range.getClientRects()].filter((r) => r.width > 0 && r.bottom > m.top && r.top < m.bottom);
  const right = m.left + m.width / 2 > c.left + c.width / 2;
  const space2 = parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-2")) || 8;
  const space6 = parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-6")) || 24;
  const cs = getComputedStyle(line);
  if (!ink.length) return { side: right ? "right" : "left", rows: 0, space2, space6, padStart: parseFloat(cs.paddingInlineStart), padEnd: parseFloat(cs.paddingInlineEnd), dir: cs.direction };
  // From the mark's outer edge (the card's content edge on its side) to the nearest ink, and from the mark itself to the nearest ink.
  const edge = right ? m.right - Math.max(...ink.map((r) => r.right)) : Math.min(...ink.map((r) => r.left)) - m.left;
  const gap = right ? m.left - Math.max(...ink.map((r) => r.right)) : Math.min(...ink.map((r) => r.left)) - m.right;
  return { side: right ? "right" : "left", rows: ink.length, edge, gap, space2, space6, padStart: parseFloat(cs.paddingInlineStart), padEnd: parseFloat(cs.paddingInlineEnd), dir: cs.direction };
}, [key, id]);

describe("the first line keeps space-6 from the mark (Chromium)", () => {
  for (const dir of ["ltr", "rtl"]) {
    for (const width of [1440, 390]) {
      test(`${dir}, ${width === 390 ? "stacked at 390" : "at 1440"}: every card that draws a mark`, async () => {
        const { page, errors } = await figures(dir, { width });
        for (const [key, , id] of CARDS) {
          const s = await clearance(page, key, id);
          assert.ok(s.rows > 0, `${key}: the first line is on the mark's row`);
          assert.ok(s.edge >= s.space6 - 0.5, `${key}: ${s.edge.toFixed(1)}px from the mark's outer edge to the ink (space-6 is ${s.space6})`);
          assert.ok(s.gap >= s.space2 - 0.5, `${key}: ${s.gap.toFixed(1)}px between the mark and the ink`);
        }
        assert.deepEqual(errors, []);
        await page.close();
      });
    }
  }

  test("left to right nothing moved: the mark is in the top right corner and the line's end keeps space-6, its start none", async () => {
    const { page } = await figures("ltr");
    for (const [key, , id] of CARDS) {
      const s = await clearance(page, key, id);
      assert.equal(s.side, "right", key);
      assert.deepEqual([s.padStart, s.padEnd], [0, s.space6], key);
    }
    await page.close();
  });

  test("right to left the mark stays in the card's top right corner, and the clearance follows it: the line's start, its end none", async () => {
    for (const width of [1440, 390]) {
      const { page } = await figures("rtl", { width });
      for (const [key, , id] of CARDS) {
        const s = await clearance(page, key, id);
        assert.equal(s.side, "right", `${width} ${key}`);
        assert.equal(s.dir, "rtl", `${width} ${key}: the line is set right to left`);
        assert.deepEqual([s.padStart, s.padEnd], [s.space6, 0], `${width} ${key}`);
      }
      await page.close();
    }
  });

  test("forced colours: no mark is drawn, and the first line keeps no padding for one, in either direction", async () => {
    for (const dir of ["ltr", "rtl"]) {
      const { page } = await figures(dir, { media: { forcedColors: "active" } });
      for (const [key, , id] of CARDS) {
        const pad = await page.evaluate(([key, id]) => {
          const card = document.querySelector(`#fig-${key} .basalt-diagram-node[data-node="${id}"]`);
          const next = card.querySelector(":scope > .basalt-diagram-mark").nextElementSibling;
          const line = next.classList.contains("basalt-diagram-host-head") ? next.firstElementChild : next;
          const cs = getComputedStyle(line);
          return [parseFloat(cs.paddingInlineStart), parseFloat(cs.paddingInlineEnd)];
        }, [key, id]);
        assert.deepEqual(pad, [0, 0], `${dir} ${key}`);
      }
      await page.close();
    }
  });
});
