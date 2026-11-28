// A service mark and a final state's ring in their top end corner, in both directions (DECISIONS 292, 2.1 to 2.7; the decider's ruling on the mark's corner,
// 28 Nov 2026, which replaced #170's swap). Right to left the drawing is set left to right and what a card holds is set right to left again (DECISIONS 306,
// 1.7), its mark and its ring included, so each takes the top left, space-3 in, and the first line keeps space-6 on its end side. On every card that draws a
// mark (an architecture card, the focal card, a card whose first line is the count or the name, a deployment host with artifacts and without, a sequence's
// participant head) and on a final state, drawn and stacked: the mark or ring is in the end corner, the first line's ink is space-6 from its outer edge (so
// space-2 clear of it), and every line of the card starts on one edge. The stacked chip draws the mark before the name, on its right right to left.
// Chromium against the built package. Written while tests are paused (DECISIONS 359): not yet run.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const { deploymentType } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-deployment.js")).href);

// A kind long enough to reach the corner on any track, so a clearance on the wrong side shows as ink under the mark.
const LONG = "managed container orchestration service";
const nodes = (api) => [
  { id: "gw", kind: "gateway", name: "Gateway", col: 1, row: 1 },
  { id: "api", kind: LONG, name: "API", detail: "Handles requests", group: "compute", col: 2, row: 1, mark: "ecs", ...api },
  { id: "db", kind: "database", name: "Database", col: 3, row: 1 },
];
const arch = (api) => ({ type: "architecture", title: "t", summary: "s", legend: { main: "Request", ...(api.focal ? { focal: "The service" } : {}) }, groups: [{ id: "compute", label: "Compute" }], nodes: nodes(api), edges: [{ from: "gw", to: "api" }, { from: "api", to: "db" }] });
const deploy = (api) => { const { ext: _ext, ...d } = { ...arch(api), type: "deployment", ext: deploymentType(), environment: "Production", edges: [{ from: "gw", to: "api", label: "HTTPS" }, { from: "api", to: "db", label: "SQL" }] }; return d; };
const state = (done) => ({
  type: "state", title: "t", summary: "s", legend: { main: "The usual path", ...(done.focal ? { focal: "Where it ends" } : {}) },
  nodes: [{ id: "idle", name: "Idle", initial: true, col: 1, row: 1 }, { id: "work", name: "Working", col: 2, row: 1 }, { id: "api", name: "Succeeded and archived for the record", final: true, col: 3, row: 1, ...done }],
  edges: [{ from: "idle", to: "work", event: "start", kind: "main" }, { from: "work", to: "api", event: "finish", kind: "main" }],
});
const sequence = () => ({
  type: "sequence", title: "t", summary: "s", legend: { main: "Request" },
  participants: [{ id: "user", kind: "person", name: "Reader" }, { id: "api", kind: "ECS service", name: "cimip service", mark: "ecs" }],
  steps: [{ from: "user", to: "api", kind: "main", label: "asks" }],
});

/** Every card that draws a mark or a ring: [figure key, spec, what is in the corner]. Each card is `api`. */
const CARDS = [
  ["architecture", arch({}), "mark"],
  ["count-kind", arch({ replicas: 3 }), "mark"],
  ["focal", arch({ focal: true }), "mark"],
  ["count-only", arch({ kind: undefined, replicas: 120 }), "mark"],
  ["name-only", arch({ kind: undefined, name: "Orchestrated container service API" }), "mark"],
  ["host", deploy({}), "mark"],
  ["host-count", deploy({ replicas: 3 }), "mark"],
  ["host-rows", deploy({ replicas: 3, artifacts: [{ id: "jar", name: "api.jar", detail: "Java 21" }] }), "mark"],
  ["host-rows-focal", deploy({ focal: true, artifacts: [{ id: "jar", name: "api.jar" }] }), "mark"],
  ["final", state({}), "final"],
  ["final-kind", state({ kind: "terminal state" }), "final"],
  ["final-focal", state({ focal: true }), "final"],
  ["final-actions", state({ entry: "notify owner", exit: "release lock" }), "final"],
];

const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;
const HOST = `
import { awsEcsService } from "./dist/marks/aws-ecs-service.js";
const C = { architecture: B.ArchitectureDiagram, deployment: B.DeploymentDiagram, state: B.StateDiagram, sequence: B.SequenceDiagram };
const withMark = (n) => (n.mark === "ecs" ? { ...n, mark: awsEcsService } : n);
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 48 }}>{list.map(({ key, spec, dir }) => { const { type, ...props } = spec; const X = C[type]; if (props.nodes) props.nodes = props.nodes.map(withMark); if (props.participants) props.participants = props.participants.map(withMark); return <div key={key} dir={dir}><X id={"fig-" + key} {...props} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function figures(dir, list, { theme = "dark", width = 1440, media } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1000 } });
  if (media) await page.emulateMedia(media);
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((list) => window.__set(list), list.map(([key, spec]) => ({ key, spec, dir })));
  await page.waitForFunction((n) => document.querySelectorAll(".basalt-diagram[data-layout]").length >= n, list.length);
  await frames(page, 4);
  return { page, errors };
}

/**
 * The card's corner: where the mark or ring is (its side, its inset from that side, its top from the card's top), the first line's ink on its row measured
 * from its outer edge and from it, and the start edge of every line the card draws (the kind, the name, the detail, an action, an artifact row).
 */
const corner = (page, key, what) => page.evaluate(([key, what]) => {
  const P = "basalt-diagram";
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
  // Each line's start: its first line box's start edge (the right one right to left).
  const lines = [...card.querySelectorAll(`:scope > :is(.${P}-kind, .${P}-name, .${P}-detail), :scope > .${P}-host-head > *, :scope > .${P}-actions > *, .${P}-artifact`)];
  const starts = lines.map((el) => { const r = rects(el); if (!r.length) return null; const first = r.reduce((a, b) => (b.top < a.top - 1 ? b : a)); const row = r.filter((x) => Math.abs(x.top - first.top) < 2); return rtl ? Math.max(...row.map((x) => x.right)) : Math.min(...row.map((x) => x.left)); }).filter((v) => v !== null);
  const s = (n) => parseFloat(getComputedStyle(card).getPropertyValue(`--basalt-space-${n}`));
  return {
    rtl, side: right ? "right" : "left", inset: right ? c.right - m.right : m.left - c.left, top: m.top - c.top, rows: ink.length,
    edge: near == null ? null : right ? m.right - near : near - m.left, gap: near == null ? null : right ? m.left - near : near - m.right,
    spread: Math.max(...starts) - Math.min(...starts), lines: starts.length, space2: s(2) || 8, space3: s(3) || 12, space6: s(6) || 24,
  };
}, [key, what]);

describe("the mark and the ring in the top end corner (Chromium)", () => {
  for (const dir of ["ltr", "rtl"]) {
    for (const width of [1440, 390]) {
      test(`${dir}, ${width === 390 ? "stacked at 390" : "at 1440"}: every card that draws a mark or a ring`, async () => {
        const { page, errors } = await figures(dir, CARDS, { width });
        const end = dir === "rtl" ? "left" : "right";
        const tops = new Set();
        for (const [key, , what] of CARDS) {
          const s = await corner(page, key, what);
          assert.equal(s.side, end, `${key}: the ${what} is in the top end corner`);
          assert.ok(Math.abs(s.inset - s.space3) <= 1.5, `${key}: ${s.inset.toFixed(1)}px in from the end edge (space-3 and the rim)`);
          if (what === "mark") tops.add(Math.round(s.top));
          assert.ok(s.rows > 0, `${key}: the first line is on the ${what}'s row`);
          assert.ok(s.edge >= s.space6 - 0.5, `${key}: ${s.edge.toFixed(1)}px from the ${what}'s outer edge to the ink (space-6 is ${s.space6})`);
          assert.ok(s.gap >= s.space2 - 0.5, `${key}: ${s.gap.toFixed(1)}px between the ${what} and the ink`);
          assert.ok(s.lines >= 2 && s.spread <= 1, `${key}: its ${s.lines} lines start on one edge (${s.spread.toFixed(1)}px apart)`);
        }
        assert.ok(tops.size <= 2, `the mark's block inset is the same on every card (${[...tops].join(", ")}; a host's band adds none)`);
        assert.deepEqual(errors, []);
        await page.close();
      });
    }
  }

  test("left to right nothing moved: the first line's end keeps space-6, its start none", async () => {
    const { page } = await figures("ltr", CARDS);
    for (const [key, , what] of CARDS) {
      const pad = await page.evaluate(([key, what]) => {
        const card = document.querySelector(`#fig-${key} .basalt-diagram-node[data-node="api"]`);
        const line = (card.querySelector(":scope > .basalt-diagram-host-head") ?? card).querySelector(":scope > :is(.basalt-diagram-kind, .basalt-diagram-name)");
        const cs = getComputedStyle(line);
        return [cs.paddingLeft, cs.paddingRight, what];
      }, [key, what]);
      assert.deepEqual(pad.slice(0, 2), ["0px", "24px"], key);
    }
    await page.close();
  });

  test("a sequence's participant: drawn, the head's mark is in its top end corner; stacked, the chip draws it before the name", async () => {
    for (const dir of ["ltr", "rtl"]) {
      for (const width of [1440, 390]) {
        const { page } = await figures(dir, [["seq", sequence()]], { width });
        const s = await page.evaluate(() => {
          const card = document.querySelector('#fig-seq .basalt-diagram-node[data-node="api"]');
          const m = card.querySelector(":scope > .basalt-diagram-mark").getBoundingClientRect();
          const n = card.querySelector(":scope > .basalt-diagram-name").getBoundingClientRect();
          const c = card.getBoundingClientRect();
          return { layout: card.closest(".basalt-diagram").dataset.layout, m: m.toJSON(), n: n.toJSON(), c: c.toJSON(), s15: parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-1-5")) || 6 };
        });
        if (s.layout === "drawn") {
          const left = s.m.left + s.m.width / 2 < s.c.left + s.c.width / 2;
          assert.equal(left, dir === "rtl", `${dir} ${width}: the head's mark is in the top end corner`);
        } else {
          // Before the name: on its left left to right, on its right right to left, space-1-5 apart.
          const gap = dir === "rtl" ? s.m.left - s.n.right : s.n.left - s.m.right;
          assert.ok(Math.abs(gap - s.s15) <= 1, `${dir} ${width}: the mark is before the name, ${gap.toFixed(1)}px from it`);
        }
        await page.close();
      }
    }
  });

  test("forced colours: no mark is drawn, and the first line keeps no padding for one, in either direction", async () => {
    for (const dir of ["ltr", "rtl"]) {
      const marked = CARDS.filter(([, , what]) => what === "mark");
      const { page } = await figures(dir, marked, { media: { forcedColors: "active" } });
      for (const [key] of marked) {
        const pad = await page.evaluate((key) => {
          const card = document.querySelector(`#fig-${key} .basalt-diagram-node[data-node="api"]`);
          const line = (card.querySelector(":scope > .basalt-diagram-host-head") ?? card).querySelector(":scope > :is(.basalt-diagram-kind, .basalt-diagram-name)");
          const cs = getComputedStyle(line);
          return [parseFloat(cs.paddingInlineStart), parseFloat(cs.paddingInlineEnd)];
        }, key);
        assert.deepEqual(pad, [0, 0], `${dir} ${key}`);
      }
      await page.close();
    }
  });
});
