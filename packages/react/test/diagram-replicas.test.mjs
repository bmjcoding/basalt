// A card for several of one kind (DECISIONS 405, G151): `replicas` on an architecture's card, read and drawn by the engine as a deployment's host's is (one
// implementation in core). The values, the words (the sentence, the list, the key), the seat (after the kind's last word, or alone on the name's edge),
// the measure in minimums(), the mark's clearance, forced colours, right to left, and the deployment's unchanged artifact rows. Node for the model and the
// words; Chromium against the built package for the rest. Written while tests are paused (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
const { deploymentType } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-deployment.js")).href);
const P = "basalt-diagram";
const OPTS = { prefix: P, base: "dg1", hasSource: false, hiddenClass: "basalt-visually-hidden" };
const html = (model) => core.toHtml(core.figureTree(model, {}, OPTS));

const nodes = (api) => [
  { id: "gw", kind: "gateway", name: "Gateway", col: 1, row: 1 },
  { id: "api", kind: "service", name: "API", detail: "Handles requests", group: "compute", col: 2, row: 1, ...api },
  { id: "db", kind: "database", name: "Database", col: 3, row: 1 },
];
const arch = (api, extra = {}) => ({ type: "architecture", title: "t", summary: "s", legend: { main: "Request" }, groups: [{ id: "compute", label: "Compute" }], nodes: nodes(api), edges: [{ from: "gw", to: "api" }, { from: "api", to: "db" }], ...extra });
const deploy = (api, extra = {}) => ({ ...arch(api, extra), type: "deployment", ext: deploymentType(), environment: "Production", edges: [{ from: "gw", to: "api", label: "HTTPS" }, { from: "api", to: "db", label: "SQL" }] });
const model = (spec) => core.buildModel(spec, { checks: true });
const api = (m) => m.byId.get("api");

describe("the values (Node)", () => {
  const cases = [
    ["absent", undefined, undefined, false],
    ["null", null, undefined, false],
    ["1", 1, 1, false],
    ["3", 3, 3, false],
    ["1200", 1200, 1200, false],
    ["1.5", 1.5, undefined, true],
    ["0", 0, undefined, true],
    ["-2", -2, undefined, true],
    ['"3"', "3", undefined, true],
    ["2 ** 53", 2 ** 53, undefined, true],
  ];
  for (const make of [arch, deploy]) for (const [what, value, read, errs] of cases) test(`${make === arch ? "architecture" : "deployment"}: replicas ${what}`, () => {
    const m = model(make(value === undefined ? {} : { replicas: value }));
    assert.equal(api(m).replicas, read);
    assert.equal(m.errors.some((e) => /api's replicas is .*not a whole number/.test(e)), errs, m.errors.join("; "));
  });

  test("a state never takes it", () => {
    const m = core.buildModel({ type: "state", title: "t", summary: "s", nodes: [{ id: "a", name: "A", col: 1, row: 1, replicas: 3 }], edges: [] });
    assert.equal(m.byId.get("a").replicas, undefined);
  });

  test("drawn with en-US grouping from 2; nothing for 1", () => {
    assert.equal(core.copiesOf(api(model(arch({ replicas: 1200 })))), "1,200");
    assert.equal(core.copiesOf(api(model(arch({ replicas: 1 })))), undefined);
    assert.match(html(model(arch({ replicas: 1200 }))), /<span class="basalt-diagram-replicas"><bdi dir="ltr">× 1,200<\/bdi><\/span>/);
    assert.doesNotMatch(html(model(arch({ replicas: 1 }))), /basalt-diagram-replicas/);
  });
});

describe("the words (Node)", () => {
  test("the sentence: name and kind, detail, copies, group, then the lines", () => {
    assert.equal(core.nodeSentence(model(arch({ replicas: 3 })), api(model(arch({ replicas: 3 })))), "API, service. Handles requests. 3 copies. In Compute. From: Gateway. To: Database.");
  });

  test("the list: \" 3 copies.\" after the part, for an architecture and a deployment alike", () => {
    for (const make of [arch, deploy]) {
      const list = core.toHtml({ t: "div", a: {}, c: core.figureList(P, model(make({ replicas: 3 }))) });
      assert.match(list, /<strong><bdi>API<\/bdi><\/strong>, <bdi>service<\/bdi>\. <bdi>Handles requests<\/bdi>\. 3 copies\./);
    }
  });

  test("the key: one entry, × 3 and \"How many copies run\", whenever any card draws a count, and none otherwise", () => {
    const key = (spec) => core.toHtml(core.figureKey(P, model(spec)) ?? { t: "div", a: {}, c: [] });
    for (const make of [arch, deploy]) {
      const with3 = key(make({ replicas: 3 }));
      assert.equal(with3.split("How many copies run").length - 1, 1);
      assert.match(with3, /data-replicas="" aria-hidden="true"><bdi dir="ltr">× 3<\/bdi><\/span><span>How many copies run<\/span>/);
      assert.doesNotMatch(key(make({ replicas: 1 })), /How many copies run/);
    }
  });

  test("a deployment draws the same card as an architecture, and keeps its artifact rows", () => {
    const card = (h, id) => h.match(new RegExp(`<div class="basalt-diagram-node" data-node="${id}"[^>]*>(.*?)</div>`))?.[1];
    assert.equal(card(html(model(deploy({ replicas: 3 }))), "api"), card(html(model(arch({ replicas: 3 }))), "api"));
    const rows = html(model(deploy({ replicas: 3, artifacts: [{ id: "jar", name: "api.jar", detail: "v2" }] })));
    assert.match(rows, /basalt-diagram-host-head"><span class="basalt-diagram-kind"><bdi>service<\/bdi><span class="basalt-diagram-replicas"><bdi dir="ltr">× 3<\/bdi><\/span><\/span>/);
    assert.match(rows, /data-artifact="jar"/);
  });

  test("with no kind the count is the kind line alone, first in the card", () => {
    const h = html(model(arch({ kind: undefined, replicas: 3 })));
    assert.match(h, /data-node="api"[^>]*><span class="basalt-diagram-kind"><span class="basalt-diagram-replicas"><bdi dir="ltr">× 3<\/bdi><\/span><\/span><span class="basalt-diagram-name">/);
  });
});

// ---- In Chromium ----

const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;
const HOST = `
import { awsEcsService } from "./dist/marks/aws-ecs-service.js";
window.MARK = awsEcsService;
const C = { architecture: B.ArchitectureDiagram, deployment: B.DeploymentDiagram };
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 48 }}>{list.map(({ key, spec, dir }) => { const { type, ...props } = spec; const X = C[type]; if (props.nodes) props.nodes = props.nodes.map((n) => (n.mark === "ecs" ? { ...n, mark: window.MARK } : n)); return <div key={key} dir={dir}><X id={"fig-" + key} {...props} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function cards(list, { theme = "dark", width = 1440, media } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1000 } });
  if (media) await page.emulateMedia(media);
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((list) => window.__set(list), list);
  await frames(page, 4);
  return { page, errors };
}
const plain = (api, extra) => { const { ext: _ext, ...s } = extra?.type === "deployment" ? deploy(api) : arch(api); return { ...s, ...extra }; };
/** The count, its kind line and the name, as boxes, of the card `id` in figure `key`. */
const seat = (page, key, id = "api") => page.evaluate(([key, id]) => {
  const card = document.querySelector(`#fig-${key} .basalt-diagram-node[data-node="${id}"]`);
  const box = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
  const count = card.querySelector(".basalt-diagram-replicas");
  const kindText = card.querySelector(".basalt-diagram-kind > bdi");
  const range = kindText ? document.createRange() : null;
  if (range) range.selectNodeContents(kindText);
  const lastWord = range ? [...range.getClientRects()].at(-1)?.toJSON() : null;
  const cs = count ? getComputedStyle(count) : null;
  return { count: box(count), kind: box(card.querySelector(".basalt-diagram-kind")), name: box(card.querySelector(".basalt-diagram-name")), lastWord, card: box(card), margin: cs ? parseFloat(cs.marginInlineStart) : null, color: cs?.color, opacity: cs ? Number(getComputedStyle(card.querySelector(".basalt-diagram-kind")).opacity) : null, kindColor: getComputedStyle(card.querySelector(".basalt-diagram-kind") ?? card).color, padEnd: parseFloat(getComputedStyle(card.querySelector(".basalt-diagram-kind") ?? card).paddingInlineEnd), namePad: parseFloat(getComputedStyle(card.querySelector(".basalt-diagram-name")).paddingInlineEnd), space2: parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-2")) || 8, space6: parseFloat(getComputedStyle(card).getPropertyValue("--basalt-space-6")) || 24 };
}, [key, id]);

describe("the seat (Chromium)", () => {
  test("with a kind: space-2 after the kind's last word, on its line, never broken from it; with no kind: on the name's edge with no margin", async () => {
    const { page, errors } = await cards([
      { key: "kind", spec: plain({ replicas: 3 }) },
      { key: "none", spec: plain({ kind: undefined, replicas: 3 }) },
      { key: "long", spec: plain({ kind: "managed container service", replicas: 120 }) },
    ]);
    for (const key of ["kind", "long"]) {
      const s = await seat(page, key);
      assert.ok(Math.abs(s.count.left - s.lastWord.right - s.space2) <= 1, `${key}: ${s.count.left - s.lastWord.right}px after the last word`);
      assert.ok(Math.abs(s.count.top - s.lastWord.top) <= 2, `${key}: on the last word's line`);
    }
    const none = await seat(page, "none");
    assert.equal(none.margin, 0);
    assert.ok(Math.abs(none.count.left - none.name.left) <= 0.5, "starts on the name's edge");
    assert.ok(none.kind.bottom <= none.name.top + 0.5, "the kind line is first");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test("minimums() measures the count: a long kind with a three-digit count fits its track, the count on the last word's line", async () => {
    const { page } = await cards([{ key: "long", spec: plain({ kind: "orchestrator", replicas: 120 }) }, { key: "plain", spec: plain({ kind: "orchestrator" }) }]);
    const long = await seat(page, "long");
    assert.ok(long.count.right <= long.card.right - 12 + 0.5, "the count is inside the card's padding");
    assert.ok(Math.abs(long.count.top - long.lastWord.top) <= 2, "it did not wrap from its word");
    const track = (key) => page.evaluate((key) => parseFloat(getComputedStyle(document.getElementById(`fig-${key}`)).getPropertyValue("--_track")) || document.querySelector(`#fig-${key} .basalt-diagram-node`).getBoundingClientRect().width, key);
    assert.ok((await track("long")) >= (await track("plain")), "the track is at least as wide with the count");
    await page.close();
  });

  test("the mark: the kind line is first and keeps space-6 clear of it, with a kind or a count alone; the name is never charged", async () => {
    const { page } = await cards([
      { key: "kind", spec: plain({ replicas: 3, mark: "ecs" }) },
      { key: "count", spec: plain({ kind: undefined, replicas: 3, mark: "ecs" }) },
      { key: "rows", spec: { ...plain({ replicas: 3, mark: "ecs", artifacts: [{ id: "jar", name: "api.jar" }] }, { type: "deployment", environment: "Production" }) } },
    ]);
    for (const key of ["kind", "count", "rows"]) {
      const s = await seat(page, key);
      assert.equal(s.padEnd, s.space6, `${key}: the kind line keeps space-6`);
      assert.equal(s.namePad, 0, `${key}: the name is not charged`);
    }
    await page.close();
  });

  test("an architecture and a deployment draw one card: the same boxes for the same data", async () => {
    const { page } = await cards([{ key: "a", spec: plain({ replicas: 3 }) }, { key: "d", spec: plain({ replicas: 3 }, { type: "deployment", environment: "Production" }) }]);
    const a = await seat(page, "a"), d = await seat(page, "d");
    for (const k of ["count", "kind", "name"]) assert.deepEqual([a[k].width, a[k].height], [d[k].width, d[k].height], k);
    await page.close();
  });
});

describe("forced colours, right to left (Chromium)", () => {
  test("the count takes its kind line's ink and opacity: CanvasText on a card, Canvas on the focal card, in a light and a dark palette", async () => {
    for (const theme of ["light", "dark"]) {
      const { page } = await cards([{ key: "f", spec: plain({ replicas: 3 }, { nodes: nodes({ replicas: 3, focal: true }).map((n) => (n.id === "db" ? { ...n, replicas: 2 } : n)), legend: { main: "Request", focal: "The service" } }) }], { theme, media: { forcedColors: "active", colorScheme: theme } });
      const focal = await seat(page, "f", "api");
      const card = await seat(page, "f", "db");
      assert.equal(focal.color, focal.kindColor, `${theme}: the focal count is its kind line's Canvas`);
      assert.equal(card.color, card.kindColor, `${theme}: a card's count is its kind line's CanvasText`);
      assert.notEqual(focal.color, card.color);
      assert.equal(focal.opacity, 1);
      await page.close();
    }
  });

  test("right to left: the count sits at the kind line's end and keeps its own order; drawn and stacked", async () => {
    for (const width of [1440, 390]) {
      const { page } = await cards([{ key: "r", spec: plain({ replicas: 3 }), dir: "rtl" }], { width });
      const s = await seat(page, "r");
      assert.ok(s.count.right <= s.lastWord.left + 0.5, `${width}: at the line's end (to the left of the kind)`);
      assert.ok(Math.abs(s.lastWord.left - s.count.right - s.space2) <= 1, `${width}: space-2 apart`);
      const order = await page.evaluate(() => { const c = document.querySelector("#fig-r .basalt-diagram-replicas"); const t = c.firstChild.firstChild; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 1); return r.getBoundingClientRect().left < c.getBoundingClientRect().left + c.getBoundingClientRect().width / 2; });
      assert.ok(order, `${width}: "×" is drawn first, left to right`);
      await page.close();
    }
  });

  test("at 390 the stacked card draws the same count, and the list says it with the list open", async () => {
    const { page } = await cards([{ key: "s", spec: plain({ replicas: 3 }) }], { width: 390 });
    await page.click(`#fig-s .${P}-toggle`);
    assert.match(await page.locator(`#fig-s .${P}-list`).textContent(), /API, service\. Handles requests\. 3 copies\./);
    assert.equal(await page.locator(`#fig-s .${P}-node[data-node="api"] .${P}-replicas`).textContent(), "× 3");
    await page.close();
  });
});
