// A sequence's activations and frames (DECISIONS 306, 1.2; section 8's list for diagram-sequence.test.mjs), on the extended CIMIP sequence
// (test/fixtures/cimip-diagrams-b.json). In Chromium against the built package, both themes. The text variant is not built yet, so its tests are not here.
// The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg } from "./support.mjs";

const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const P = "basalt-diagram";
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import data from "./test/fixtures/cimip-diagrams-b.json";
function Host() {
  const [spec, setSpec] = React.useState(() => { const { type, ...props } = data.sequence; return props; });
  window.__set = (next) => flushSync(() => setSpec(next));
  return <B.SequenceDiagram id="seq" {...spec} />;
}
createRoot(document.getElementById("root")).render(<Host />);`;
const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function seqPage({ theme = "dark", width = 1440 } = {}) {
  const { page, errors } = await fixturePage(browser, HOST, { theme, standards: true, viewport: { width, height: 1200 } });
  await page.addStyleTag({ content: "body{margin:0;padding:16px} #root{max-width:1104px;margin:0 auto}" });
  await page.evaluate(() => document.fonts.ready);
  await frames(page, 4);
  return { page, errors };
}
const read = (page) => page.evaluate((P) => {
  const fig = document.querySelector("#seq");
  const d = fig.querySelector(`.${P}-drawing`).getBoundingClientRect();
  const rel = (r) => ({ l: r.left - d.left, r: r.right - d.left, t: r.top - d.top, b: r.bottom - d.top });
  return {
    layout: fig.getAttribute("data-layout"), w: d.width, h: d.height,
    bars: [...fig.querySelectorAll(`.${P}-svg .${P}-bar`)].map((b) => ({ ...rel(b.getBoundingClientRect()), fill: getComputedStyle(b).fill, stroke: getComputedStyle(b).stroke })),
    lives: [...fig.querySelectorAll(`.${P}-life`)].filter((l) => !l.closest(`.${P}-swatch`)).map((l) => rel(l.getBoundingClientRect()).l),
    lines: [...fig.querySelectorAll(`.${P}-edge`)].map((g) => ({ i: g.dataset.edge, d: g.querySelector(`.${P}-line`).getAttribute("d"), tip: g.querySelector(`.${P}-tip`)?.getAttribute("d") })),
    boxes: [...fig.querySelectorAll(`.${P}-fbox`)].map((b) => ({ ...rel(b.getBoundingClientRect()), depth: b.parentElement.dataset.depth, op: b.parentElement.dataset.op, border: getComputedStyle(b).borderTopWidth, style: getComputedStyle(b).borderTopStyle })),
    heads: [...fig.querySelectorAll(`.${P}-node`)].map((n) => rel(n.getBoundingClientRect())),
    nums: [...fig.querySelectorAll(`.${P}-drawing .${P}-num`)].map((n) => n.textContent),
    key: [...fig.querySelectorAll(`.${P}-entry`)].filter((e) => getComputedStyle(e).display !== "none").map((e) => e.textContent),
    list: [...fig.querySelectorAll(`.${P}-list .${P}-list-group`)].map((e) => e.textContent),
  };
}, P);

describe("activations", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: bars are 8 wide on their lifelines, in the head's fill and a structure edge; lines end on a bar's edge`, async () => {
    const { page, errors } = await seqPage({ theme });
    const g = await read(page);
    assert.equal(g.layout, "drawn");
    assert.equal(g.bars.length, 2, "the service's bar and the sandbox's");
    for (const bar of g.bars) {
      assert.ok(Math.abs(bar.r - bar.l - 8) <= 1, `width ${bar.r - bar.l}`);
      assert.ok(g.lives.some((x) => Math.abs((bar.l + bar.r) / 2 - x) <= 1), "centred on a lifeline");
      assert.notEqual(bar.fill, "none");
    }
    // Message 6 (POST /v1/runs) opens the sandbox's bar: its head's point is on the bar's start edge.
    const six = g.lines.find((l) => l.i === "6");
    const endX = Number(/^M([\d.]+) /.exec(six.tip)[1]);
    const agentBar = g.bars.sort((a, b) => b.l - a.l)[0];
    assert.ok(Math.abs(endX - agentBar.l) <= 1, `${endX} against ${agentBar.l}`);
    assert.deepEqual(errors, []);
    await page.close();
  });
});

describe("frames", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: every frame has four solid sides inside the drawing and spans its participants; a nested frame is 8px inside where they share a side; the key and the list say the operators`, async () => {
    const { page } = await seqPage({ theme });
    const g = await read(page);
    assert.equal(g.boxes.length, 3);
    for (const b of g.boxes) {
      assert.equal(b.border, "1px");
      assert.equal(b.style, "solid");
      assert.ok(b.l >= -0.01 && b.r <= g.w + 0.01 && b.t >= -0.01 && b.b <= g.h + 0.01, `${b.op} inside the drawing`);
    }
    const opt = g.boxes.find((b) => b.op === "opt"), loop = g.boxes.find((b) => b.op === "loop"), alt = g.boxes.find((b) => b.op === "alt");
    // opt spans the service to the sandbox: from the service head's start edge to the sandbox head's end edge.
    assert.ok(Math.abs(opt.l - g.heads[1].l) <= 1 && Math.abs(opt.r - g.heads[3].r) <= 1, "opt spans its participants");
    assert.ok(Math.abs(loop.l - opt.l - 8) <= 1, "the loop is 8 inside the opt at their shared start side");
    assert.ok(Math.abs(alt.l) <= 1 && Math.abs(alt.r - g.w) <= 1, "alt spans every participant");
    assert.deepEqual(g.nums, Array.from({ length: 13 }, (_, k) => String(k + 1)), "messages number straight through");
    for (const words of ["optOnly if", "loopRepeats", "altOne of these", "Working"]) assert.ok(g.key.some((k) => k.replace(/\s+/g, "") === words.replace(/\s+/g, "")), `the key says ${words}`);
    assert.deepEqual(g.list.filter((t) => /^(Only if|Repeats|One of these|Otherwise):/.test(t)), ["Only if: First run on an incident only", "Repeats: Until private IP", "One of these: Approved", "Otherwise: Rejected or timed out"]);
    await page.close();
  });
  test("stacked, the frames box their rows and messages keep their numbers", async () => {
    const { page } = await seqPage({ width: 390 });
    const g = await read(page);
    assert.equal(g.layout, "stacked");
    assert.equal(g.boxes.length, 3);
    assert.deepEqual(g.nums, Array.from({ length: 13 }, (_, k) => String(k + 1)));
    await page.close();
  });
  test("a header too long for its frame stacks the figure", async () => {
    const { page } = await seqPage();
    await page.evaluate((spec) => {
      const { type, ...props } = spec;
      props.steps = [{ frame: "opt", label: "A condition far longer than the two columns of one self-call can ever hold on its own line", steps: [{ from: "svc", to: "svc", label: "x" }] }];
      window.__set(props);
    }, B.sequence);
    await frames(page, 4);
    assert.equal((await read(page)).layout, "stacked");
    await page.close();
  });
});
