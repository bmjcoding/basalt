// A sequence's activations and frames (DECISIONS 306, 1.2; section 8's list for diagram-sequence.test.mjs), on the extended CIMIP sequence
// (test/fixtures/cimip-diagrams-b.json), and the text variant. In Chromium against the built package, both themes.
// The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

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

describe("the text variant (1.2; section 8)", () => {
  test("the art is byte-stable for fixed data, every frame has its four corners, and no lifeline glyph is inside a word", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const text = await import(pathToFileURL(path.join(pkg, "dist", "diagram-text.js")).href);
    const m = () => core.buildModel(B.textSequence);
    const a = text.textArt(m()).html, b = text.textArt(m()).html;
    assert.equal(a, b, "the same data writes the same art");
    const rows = a.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").split("\n");
    const count = (c) => rows.join("").split(c).length - 1;
    assert.equal(count("┌"), count("└"), "every frame that opens closes");
    assert.equal(count("┐"), count("┘"));
    // A word (a label) is never cut by a lifeline glyph: each label is found whole on one row.
    for (const st of B.textSequence.steps.flatMap(function flat(s) { return s.steps ? s.steps.flatMap(flat) : s.branches ? s.branches.flatMap((x) => x.steps.flatMap(flat)) : [s]; })) {
      if (st.label) assert.ok(rows.some((r) => r.includes(st.label)), `"${st.label}" is whole`);
    }
  });

  for (const width of [1440, 390, 360]) test(`at ${width} the block never scrolls sideways; the pre is aria-hidden; the key's swatches are glyphs`, async () => {
    const { page } = await fixturePage(browser, `
import data from "./test/fixtures/cimip-diagrams-b.json";
const { type, ...props } = data.textSequence;
createRoot(document.getElementById("root")).render(<B.SequenceDiagram id="text" {...props} />);`, { standards: true, viewport: { width, height: 1200 } });
    await page.addStyleTag({ content: "body{margin:0;padding:16px} #root{max-width:1104px;margin:0 auto}" });
    await page.evaluate(() => document.fonts.ready);
    await frames(page, 6);
    const got = await page.evaluate((P) => {
      const pre = document.querySelector(`#text .${P}-text`);
      const names = [...pre.querySelectorAll(`.${P}-tx-name`)].map((n) => n.getClientRects().length);
      return { scroll: pre.scrollWidth - pre.clientWidth, hidden: pre.getAttribute("aria-hidden"), art: pre.hasAttribute("data-art"), broken: names.filter((n) => n > 1).length, swatches: document.querySelectorAll(`#text .${P}-swatch`).length, glyphs: document.querySelectorAll(`#text .${P}-key-glyph`).length };
    }, P);
    assert.ok(got.scroll <= 1, JSON.stringify(got));
    assert.equal(got.hidden, "true");
    assert.equal(got.broken, 0, "no name breaks across lines");
    assert.equal(got.swatches, 0);
    assert.ok(got.glyphs > 0);
    if (width === 1440) assert.ok(got.art, "at 1440 the art fits");
    else assert.ok(!got.art, "on a phone, the transcript");
    await page.close();
  });

  test("the bars: a bar left open closes at its participant's last message; development errors (Model.errors, the figure's console.error) for a deactivate with no bar, a fourth bar and frames", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const seq = (steps) => core.buildModel({ type: "sequence", title: "t", summary: "s", participants: [{ id: "a", name: "A" }, { id: "b", name: "B" }], steps });
    const open = seq([{ from: "a", to: "b", label: "1", activate: true }, { from: "a", to: "b", label: "2" }, { from: "b", to: "a", label: "3" }]);
    assert.deepEqual(open.bars.map((x) => [x.who, x.from, x.to]), [["b", 1, 3]]);
    assert.ok(seq([{ from: "a", to: "b", label: "1", deactivate: true }]).errors.some((w) => /closes a bar on a, which has none open/.test(w)));
    assert.ok(seq([1, 2, 3, 4].map((n) => ({ from: "a", to: "b", label: String(n), activate: true }))).errors.some((w) => /fourth bar/.test(w)));
    assert.ok(seq([{ frame: "alt", branches: [{ label: "one", steps: [{ from: "a", to: "b", label: "x" }] }] }]).errors.some((w) => /alt frame has one branch/.test(w)));
    assert.ok(seq([{ frame: "opt", label: "o", steps: [{ frame: "opt", label: "p", steps: [{ frame: "opt", label: "q", steps: [{ from: "a", to: "b", label: "x" }] }] }] }]).errors.some((w) => /third level/.test(w)));
  });
});
