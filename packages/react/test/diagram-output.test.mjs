// Print, right to left and export (DECISIONS 306, 1.7; section 8's list for diagram-output.test.mjs), on the extended CIMIP figures. In Chromium against
// the built package. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch } from "./support.mjs";

const P = "basalt-diagram";
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/cimip-diagrams-b.json";
import { diagramToSvg, diagramToPng } from "./dist/diagram-export.js";
window.__svg = (id, o) => diagramToSvg(document.getElementById(id), o).then((b) => b.text());
window.__png = (id, o) => diagramToPng(document.getElementById(id), o).then((b) => createImageBitmap(b)).then((i) => [i.width, i.height]);
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
createRoot(document.getElementById("root")).render(<div style={{ display: "grid", gap: 64 }}>{Object.entries(data).map(([key, d]) => { const { type, ...props } = d; const X = C[type]; return <X key={key} id={"fig-" + key} {...props} />; })}</div>);`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function outPage({ theme = "dark", width = 1440, dir } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1200 } });
  if (dir) await page.evaluate((d) => { document.documentElement.dir = d; }, dir);
  await page.addStyleTag({ content: "body{margin:0;padding:16px;background:var(--basalt-surface-page)} #root{max-width:1104px;margin:0 auto}" });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 6);
  return { page, errors };
}

describe("print", () => {
  test("from the dark theme with no beforeprint: the page's tokens compute to light, and a traced figure's lines to their resting ink; no hint or control prints", async () => {
    const { page } = await outPage({ theme: "dark" });
    await page.locator(`#fig-architecture .${P}-node[data-node="alb"]`).hover();
    await frames(page, 4);
    const lightPrimary = await page.evaluate(() => { document.documentElement.dataset.theme = "light"; const v = getComputedStyle(document.documentElement).getPropertyValue("--basalt-text-primary"); document.documentElement.dataset.theme = "dark"; return v.trim(); });
    await page.emulateMedia({ media: "print" });
    const got = await page.evaluate((P) => {
      const fig = document.querySelector("#fig-architecture");
      const lit = fig.querySelector(`.${P}-edge[data-lit] .${P}-line, .${P}-edge[data-dim] .${P}-line`);
      const rest = fig.querySelector(`.${P}-edge:not([data-lit]):not([data-dim]) .${P}-line[data-kind="plain"]`) ?? fig.querySelector(`.${P}-line[data-kind="plain"]`);
      return { primary: getComputedStyle(document.documentElement).getPropertyValue("--basalt-text-primary").trim(), scheme: getComputedStyle(document.documentElement).colorScheme,
        hint: getComputedStyle(fig.querySelector(`.${P}-hint`)).display, expand: getComputedStyle(fig.querySelector(`.${P}-expand`)).display,
        traced: lit ? [getComputedStyle(lit).stroke, lit.getAttribute("data-kind")] : null, plain: rest ? getComputedStyle(rest).stroke : null };
    }, P);
    assert.equal(got.primary, lightPrimary);
    assert.equal(got.scheme, "light");
    assert.equal(got.hint, "none");
    assert.equal(got.expand, "none");
    if (got.traced && got.traced[1] === "plain") assert.equal(got.traced[0], got.plain, "a traced line prints in its resting ink");
    await page.close();
  });
});

describe("right to left", () => {
  test("every CIMIP figure is drawn mirrored under dir=rtl, the first participant at the right; a Mono detail keeps the card's start edge", async () => {
    const { page, errors } = await outPage({ dir: "rtl" });
    for (const key of ["architecture", "flowchart", "dataFlow", "sequence", "schema"]) assert.equal(await page.locator(`#fig-${key}`).getAttribute("data-layout"), "drawn", key);
    const heads = await page.locator(`#fig-sequence .${P}-node`).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
    assert.ok(heads[0] > heads[heads.length - 1], "the first participant is at the right");
    const browserX = await page.locator(`#fig-architecture .${P}-node[data-node="browser"]`).evaluate((e) => e.getBoundingClientRect().left);
    const albX = await page.locator(`#fig-architecture .${P}-node[data-node="alb"]`).evaluate((e) => e.getBoundingClientRect().left);
    assert.ok(browserX > albX, "column 1 is at the right");
    const edge = await page.locator(`#fig-architecture .${P}-node[data-node="alb"]`).evaluate((card, P) => { const d = card.querySelector(`.${P}-detail`); return Math.abs(card.getBoundingClientRect().right - d.getBoundingClientRect().right); }, P);
    assert.ok(edge < 16, `the detail keeps the card's start (right) edge: ${edge}`);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("export", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: no foreignObject; a title and a desc; every node and label; no text under 12px; a traced figure exports at rest; the PNG is twice the SVG`, async () => {
    const { page } = await outPage({ theme });
    await page.locator(`#fig-architecture .${P}-node[data-node="svc"]`).hover();
    await frames(page, 3);
    const svg = await page.evaluate(() => window.__svg("fig-architecture"));
    assert.ok(!svg.includes("foreignObject"));
    assert.match(svg, /<title>How a request reaches the agent<\/title>/);
    assert.match(svg, /<desc>[^<]{20,}<\/desc>/);
    for (const word of ["Browser", "ALB", "Aurora", "CloudWatch", "HTTPS", "RunTask", "Request", "Data"]) assert.ok(svg.includes(`>${word}<`), `the file has "${word}"`);
    const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
    assert.ok(sizes.length > 50 && Math.min(...sizes) >= 12, `the smallest text is ${Math.min(...sizes)}px`);
    assert.ok(!/data-lit|data-dim/.test(svg));
    const [w, h] = [Number(/ width="(\d+)"/.exec(svg)[1]), Number(/ height="(\d+)"/.exec(svg)[1])];
    const [pw, ph] = await page.evaluate(() => window.__png("fig-architecture"));
    assert.deepEqual([pw, ph], [w * 2, h * 2]);
    const other = theme === "dark" ? "light" : "dark";
    const svgOther = await page.evaluate((t) => window.__svg("fig-architecture", { theme: t }), other);
    assert.notEqual(/<rect width="\d+" height="\d+" fill="([^"]+)"/.exec(svgOther)[1], /<rect width="\d+" height="\d+" fill="([^"]+)"/.exec(svg)[1], "the other theme's ground");
    await page.close();
  });
});
