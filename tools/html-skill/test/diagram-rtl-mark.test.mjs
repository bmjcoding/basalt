// The skill's share of the right-to-left mark fix (React's: packages/react/test/diagram-rtl-mark.test.mjs; the decider's bug fix of 28 Nov 2026): the
// stylesheet is React's, so the first line's space-6 clearance is on the mark's side in both directions. On every card that draws a mark (an architecture
// card, the focal card, a card whose first line is the count or the name, a deployment host with artifacts and without), drawn and stacked, the first
// line's ink stays space-6 from the mark's outer edge, so space-2 clear of the mark itself. Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

const P = "diagram";
const LONG = "managed container orchestration service";
const MARK = "aws-ecs-service";
const nodes = (api, db = {}) => [
  { id: "gw", kind: "gateway", name: "Gateway", col: 1, row: 1 },
  { id: "api", kind: LONG, name: "API", detail: "Handles requests", group: "compute", col: 2, row: 1, mark: MARK, ...api },
  { id: "db", kind: "database", name: "Database", col: 3, row: 1, ...db },
];
const arch = (api) => ({ type: "architecture", title: "t", summary: "s", legend: { main: "Request", ...(api.focal ? { focal: "The service" } : {}) }, groups: [{ id: "compute", label: "Compute" }], nodes: nodes(api), edges: [{ from: "gw", to: "api" }, { from: "api", to: "db" }] });
const deploy = (api) => ({ ...arch(api), type: "deployment", environment: "Production", edges: [{ from: "gw", to: "api", label: "HTTPS" }, { from: "api", to: "db", label: "SQL" }] });
const CARDS = {
  architecture: arch({}),
  "count-kind": arch({ replicas: 3 }),
  focal: arch({ focal: true }),
  "count-only": arch({ kind: undefined, replicas: 120 }),
  "name-only": arch({ kind: undefined, name: "Orchestrated container service API" }),
  host: deploy({}),
  "host-count": deploy({ replicas: 3 }),
  "host-rows": deploy({ replicas: 3, artifacts: [{ id: "jar", name: "api.jar", detail: "Java 21" }] }),
  "host-rows-focal": deploy({ focal: true, artifacts: [{ id: "jar", name: "api.jar" }] }),
};

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (dir) => compose(`<title>Marks</title><main dir="${dir}" style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:48px">${Object.entries(CARDS).map(([key, spec]) => `<figure class="${P}" id="fig-${key}"><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure>`).join("")}</main>`).html;
const frames = (p, n = 3) => p.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

/** The card's first line beside its mark: the ink on the mark's row, the side the mark is on, and the clearances (as React's test reads them). */
const clearance = (p, key) => p.evaluate(([P, key]) => {
  const card = document.querySelector(`#fig-${key} .${P}-node[data-node="api"]`);
  const mark = card.querySelector(`:scope > .${P}-mark`);
  const next = mark.nextElementSibling;
  const line = next.classList.contains(`${P}-host-head`) ? next.firstElementChild : next;
  const m = mark.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(line);
  const ink = [...range.getClientRects()].filter((r) => r.width > 0 && r.bottom > m.top && r.top < m.bottom);
  const right = m.left + m.width / 2 > c.left + c.width / 2;
  const space2 = parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-2")) || 8;
  const space6 = parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-6")) || 24;
  if (!ink.length) return { rows: 0, space2, space6 };
  const edge = right ? m.right - Math.max(...ink.map((r) => r.right)) : Math.min(...ink.map((r) => r.left)) - m.left;
  const gap = right ? m.left - Math.max(...ink.map((r) => r.right)) : Math.min(...ink.map((r) => r.left)) - m.right;
  return { rows: ink.length, edge, gap, space2, space6, side: right ? "right" : "left" };
}, [P, key]);

describe("the skill: the first line keeps space-6 from the mark", () => {
  for (const dir of ["ltr", "rtl"]) {
    for (const width of [1440, 390]) {
      for (const scheme of ["dark", "light"]) {
        test(`${dir}, ${width === 390 ? "stacked at 390" : "at 1440"}, ${scheme}: every card that draws a mark`, async () => {
          const { page: p, context, errors } = await openHtml(browser, page(dir), { scheme, width });
          await p.waitForFunction((n) => document.querySelectorAll("figure.diagram[data-layout]").length >= n, Object.keys(CARDS).length);
          await frames(p, 4);
          for (const key of Object.keys(CARDS)) {
            const s = await clearance(p, key);
            assert.ok(s.rows > 0, `${key}: the first line is on the mark's row`);
            assert.equal(s.side, "right", `${key}: the mark is in the card's top right corner`);
            assert.ok(s.edge >= s.space6 - 0.5, `${key}: ${s.edge.toFixed(1)}px from the mark's outer edge to the ink (space-6 is ${s.space6})`);
            assert.ok(s.gap >= s.space2 - 0.5, `${key}: ${s.gap.toFixed(1)}px between the mark and the ink`);
          }
          assert.deepEqual(errors, []);
          await context.close();
        });
      }
    }
  }
});
