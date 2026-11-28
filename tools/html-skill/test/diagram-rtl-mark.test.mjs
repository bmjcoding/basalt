// The skill's share of the mark's corner (React's: packages/react/test/diagram-rtl-mark.test.mjs; the decider's ruling of 28 Nov 2026, which replaced #170's
// swap): the stylesheet is React's, so a mark and a final state's ring take the top end corner in both directions, the top left right to left, and the
// first line keeps space-6 on its end side. On every card that draws a mark or a ring, drawn and stacked, in both themes: the corner, the first line's ink
// space-6 from its outer edge (space-2 clear of it), every line on one start edge; and the stacked chip's mark before its name.
// Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { launch, openHtml } from "./support.mjs";

const P = "diagram";
const LONG = "managed container orchestration service";
const MARK = "aws-ecs-service";
const nodes = (api) => [
  { id: "gw", kind: "gateway", name: "Gateway", col: 1, row: 1 },
  { id: "api", kind: LONG, name: "API", detail: "Handles requests", group: "compute", col: 2, row: 1, mark: MARK, ...api },
  { id: "db", kind: "database", name: "Database", col: 3, row: 1 },
];
const arch = (api) => ({ type: "architecture", title: "t", summary: "s", legend: { main: "Request", ...(api.focal ? { focal: "The service" } : {}) }, groups: [{ id: "compute", label: "Compute" }], nodes: nodes(api), edges: [{ from: "gw", to: "api" }, { from: "api", to: "db" }] });
const deploy = (api) => ({ ...arch(api), type: "deployment", environment: "Production", edges: [{ from: "gw", to: "api", label: "HTTPS" }, { from: "api", to: "db", label: "SQL" }] });
const state = (done) => ({
  type: "state", title: "t", summary: "s", legend: { main: "The usual path", ...(done.focal ? { focal: "Where it ends" } : {}) },
  nodes: [{ id: "idle", name: "Idle", initial: true, col: 1, row: 1 }, { id: "work", name: "Working", col: 2, row: 1 }, { id: "api", name: "Succeeded and archived for the record", final: true, col: 3, row: 1, ...done }],
  edges: [{ from: "idle", to: "work", event: "start", kind: "main" }, { from: "work", to: "api", event: "finish", kind: "main" }],
});
const CARDS = {
  architecture: [arch({}), "mark"],
  "count-kind": [arch({ replicas: 3 }), "mark"],
  focal: [arch({ focal: true }), "mark"],
  "count-only": [arch({ kind: undefined, replicas: 120 }), "mark"],
  "name-only": [arch({ kind: undefined, name: "Orchestrated container service API" }), "mark"],
  host: [deploy({}), "mark"],
  "host-count": [deploy({ replicas: 3 }), "mark"],
  "host-rows": [deploy({ replicas: 3, artifacts: [{ id: "jar", name: "api.jar", detail: "Java 21" }] }), "mark"],
  "host-rows-focal": [deploy({ focal: true, artifacts: [{ id: "jar", name: "api.jar" }] }), "mark"],
  final: [state({}), "final"],
  "final-kind": [state({ kind: "terminal state" }), "final"],
  "final-focal": [state({ focal: true }), "final"],
  "final-actions": [state({ entry: "notify owner", exit: "release lock" }), "final"],
};
const SEQ = { type: "sequence", title: "t", summary: "s", legend: { main: "Request" }, participants: [{ id: "user", kind: "person", name: "Reader" }, { id: "api", kind: "ECS service", name: "cimip service", mark: MARK }], steps: [{ from: "user", to: "api", kind: "main", label: "asks" }] };

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const page = (dir) => compose(`<title>Corners</title><main dir="${dir}" style="max-width:1104px;margin:0 auto;padding:16px;display:grid;gap:48px">${[...Object.entries(CARDS).map(([key, [spec]]) => [key, spec]), ["seq", SEQ]].map(([key, spec]) => `<figure class="${P}" id="fig-${key}"><script type="application/json" data-diagram>${JSON.stringify(spec)}</script></figure>`).join("")}</main>`).html;
const frames = (p, n = 3) => p.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);

/** As React's test reads it: the corner, the first line's ink beside it, and every line's start edge. */
const corner = (p, key, what) => p.evaluate(([P, key, what]) => {
  const card = document.querySelector(`#fig-${key} .${P}-node[data-node="api"]`);
  const it = card.querySelector(`:scope > .${P}-${what}`);
  const head = card.querySelector(`:scope > .${P}-host-head`);
  const line = (head ?? card).querySelector(`:scope > :is(.${P}-kind, .${P}-name)`);
  const m = it.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const rtl = getComputedStyle(line).direction === "rtl";
  const rects = (el) => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].filter((x) => x.width > 0); };
  const ink = rects(line).filter((r) => r.bottom > m.top && r.top < m.bottom);
  const right = m.left + m.width / 2 > c.left + c.width / 2;
  const near = ink.length ? (right ? Math.max(...ink.map((r) => r.right)) : Math.min(...ink.map((r) => r.left))) : null;
  const lines = [...card.querySelectorAll(`:scope > :is(.${P}-kind, .${P}-name, .${P}-detail), :scope > .${P}-host-head > *, :scope > .${P}-actions > *, .${P}-artifact`)];
  const starts = lines.map((el) => { const r = rects(el); if (!r.length) return null; const first = r.reduce((a, b) => (b.top < a.top - 1 ? b : a)); const row = r.filter((x) => Math.abs(x.top - first.top) < 2); return rtl ? Math.max(...row.map((x) => x.right)) : Math.min(...row.map((x) => x.left)); }).filter((v) => v !== null);
  const s = (n) => parseFloat(getComputedStyle(card).getPropertyValue(`--basalt-space-${n}`));
  return {
    side: right ? "right" : "left", inset: right ? c.right - m.right : m.left - c.left, rows: ink.length,
    edge: near == null ? null : right ? m.right - near : near - m.left, gap: near == null ? null : right ? m.left - near : near - m.right,
    spread: Math.max(...starts) - Math.min(...starts), lines: starts.length, space2: s(2) || 8, space3: s(3) || 12, space6: s(6) || 24,
  };
}, [P, key, what]);

describe("the skill: the mark and the ring in the top end corner", () => {
  for (const dir of ["ltr", "rtl"]) {
    for (const width of [1440, 390]) {
      for (const scheme of ["dark", "light"]) {
        test(`${dir}, ${width === 390 ? "stacked at 390" : "at 1440"}, ${scheme}`, async () => {
          const { page: p, context, errors } = await openHtml(browser, page(dir), { scheme, width });
          await p.waitForFunction((n) => document.querySelectorAll("figure.diagram[data-layout]").length >= n, Object.keys(CARDS).length + 1);
          await frames(p, 4);
          const end = dir === "rtl" ? "left" : "right";
          for (const [key, [, what]] of Object.entries(CARDS)) {
            const s = await corner(p, key, what);
            assert.equal(s.side, end, `${key}: the ${what} is in the top end corner`);
            assert.ok(Math.abs(s.inset - s.space3) <= 1.5, `${key}: ${s.inset.toFixed(1)}px in from the end edge`);
            assert.ok(s.rows > 0, `${key}: the first line is on the ${what}'s row`);
            assert.ok(s.edge >= s.space6 - 0.5, `${key}: ${s.edge.toFixed(1)}px from the ${what}'s outer edge to the ink`);
            assert.ok(s.gap >= s.space2 - 0.5, `${key}: ${s.gap.toFixed(1)}px between the ${what} and the ink`);
            assert.ok(s.lines >= 2 && s.spread <= 1, `${key}: its ${s.lines} lines start on one edge (${s.spread.toFixed(1)}px apart)`);
          }
          const q = await p.evaluate((P) => {
            const card = document.querySelector(`#fig-seq .${P}-node[data-node="api"]`);
            const box = (el) => el.getBoundingClientRect().toJSON();
            return { layout: card.closest(`.${P}`).dataset.layout, m: box(card.querySelector(`:scope > .${P}-mark`)), n: box(card.querySelector(`:scope > .${P}-name`)), c: box(card) };
          }, P);
          if (q.layout === "drawn") assert.equal(q.m.left + q.m.width / 2 < q.c.left + q.c.width / 2, dir === "rtl", "the head's mark is in the top end corner");
          else assert.ok(dir === "rtl" ? q.m.left >= q.n.right : q.m.right <= q.n.left, "the chip draws the mark before the name");
          assert.deepEqual(errors, []);
          await context.close();
        });
      }
    }
  }
});
