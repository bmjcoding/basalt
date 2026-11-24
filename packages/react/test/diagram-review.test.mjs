// The fix round for diagram batch B (DECISIONS 306, 313, 322 and 326): a test for each finding of Fable's pixel review and Neon's code review of 65fa32bd
// that this round fixed, and for the decider's spacing sweep (66-1 to 66-3), each written to fail when its feature breaks. In Chromium against the built
// package, both themes where a colour is read. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

import { inspectSource } from "./diagram-geometry.mjs";
import { fixturePage, launch, pkg } from "./support.mjs";

const B = JSON.parse(fs.readFileSync(path.join(pkg, "test", "fixtures", "cimip-diagrams-b.json"), "utf8"));
const P = "basalt-diagram";
const font = (file) => fs.readFileSync(path.join(pkg, "dist", "fonts", file)).toString("base64");
const FONTS = `@font-face{font-family:"Geist";src:url(data:font/woff2;base64,${font("Geist-Variable.woff2")}) format("woff2");font-weight:100 900}@font-face{font-family:"Geist Mono";src:url(data:font/woff2;base64,${font("GeistMono-Variable.woff2")}) format("woff2");font-weight:100 900}`;
const PAGE = `${FONTS} body{background:var(--basalt-surface-page);margin:0;padding:16px;box-sizing:border-box} #root{max-width:1104px;margin:0 auto}`;

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const HOST = `
import * as Export from "./dist/diagram-export.js";
window.__export = Export;
const C = { architecture: B.ArchitectureDiagram, flowchart: B.FlowchartDiagram, "data-flow": B.DataFlowDiagram, sequence: B.SequenceDiagram, schema: B.SchemaDiagram };
function Host() {
  const [list, setList] = React.useState([]);
  window.__set = (next) => flushSync(() => setList(next));
  return <div style={{ display: "grid", gap: 64 }}>{list.map(({ key, spec, dir }) => { const { type, ...props } = spec; const X = C[type]; return <div key={key} dir={dir}><X id={"fig-" + key} {...props} /></div>; })}</div>;
}
createRoot(document.getElementById("root")).render(<Host />);`;

const frames = (page, n = 3) => page.evaluate((n) => new Promise((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); }), n);
async function reviewPage({ theme = "dark", width = 1440, height = 900, touch = false, dev = false, media } = {}) {
  const { page, errors } = await fixturePage(browser, "", { theme, viewport: { width, height }, standards: true, hasTouch: touch, isMobile: touch });
  const built = await esbuild.build({
    stdin: { contents: `import * as React from "react"; import { createRoot } from "react-dom/client"; import { flushSync } from "react-dom"; import * as B from "./dist/index.js"; ${HOST}`, resolveDir: pkg, loader: "tsx" },
    bundle: true, format: "iife", write: false, jsx: "automatic", platform: "browser", logLevel: "silent", define: { "process.env.NODE_ENV": dev ? '"development"' : '"production"' },
  });
  const warnings = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") warnings.push(m.text()); });
  if (touch) await page.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.append(meta); });
  if (media) await page.emulateMedia(media);
  await page.addScriptTag({ content: built.outputFiles[0].text });
  await page.addStyleTag({ content: PAGE });
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, warnings };
}
const draw = async (page, items) => { await page.evaluate((items) => window.__set(items), items); await page.waitForFunction((n) => document.querySelectorAll(".basalt-diagram[data-layout]").length >= n, items.length); await frames(page, 5); };
const inspect = (page, key) => page.evaluate(`${inspectSource()}("${P}", "#fig-${key}")`);
async function openViewer(page, key, how = "click") {
  const button = page.locator(`#fig-${key} .${P}-expand`);
  await button.scrollIntoViewIfNeeded();
  if (how === "tap") await button.tap(); else await button.click();
  await page.waitForSelector(`dialog.${P}-viewer[open] .${P}[data-layout]`);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(300);
  await frames(page, 4);
}
const rect = (page, sel) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; });

describe("the viewer (Fable B1 to B4, Neon B1 to B3)", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: a disabled control takes no hover, press or scale and does not match an enabled one's ink; "Clear highlight" with no trace is disabled the same way`, async () => {
    const { page } = await reviewPage({ theme });
    await draw(page, [{ key: "schema", spec: B.schema }]);
    await openViewer(page, "schema");
    const out = `dialog.${P}-viewer button[aria-label="Zoom out"]`, zin = `dialog.${P}-viewer button[aria-label="Zoom in"]`;
    const look = (sel) => page.locator(sel).evaluate((e) => { const s = getComputedStyle(e); return { color: s.color, bg: s.backgroundColor, transform: s.transform, cursor: s.cursor, disabled: e.hasAttribute("data-disabled"), aria: e.getAttribute("aria-disabled"), focusable: e.tabIndex >= 0 }; });
    const rest = await look(out), live = await look(zin);
    assert.equal(rest.aria, "true");
    assert.ok(rest.disabled && rest.focusable, "disabled, and still focusable");
    assert.notEqual(rest.color, live.color, "a disabled control loses its ink");
    await page.hover(out);
    await page.waitForTimeout(200);
    const hovered = await look(out);
    assert.equal(hovered.color, rest.color, "no hover lift");
    assert.equal(hovered.bg, rest.bg, "no hover wash");
    await page.mouse.down();
    await page.waitForTimeout(150);
    const pressed = await look(out);
    assert.equal(pressed.transform, "none", "no press scale");
    assert.equal(pressed.bg, rest.bg, "no press step");
    await page.mouse.up();
    await page.close();
    const touch = await reviewPage({ theme, width: 390, height: 844, touch: true });
    await touch.page.evaluate(() => document.getElementById("root").style.setProperty("max-width", "1104px"));
    await draw(touch.page, [{ key: "arch", spec: B.architecture }]);
    await touch.page.setViewportSize({ width: 1200, height: 900 });
    await touch.page.waitForTimeout(400);
    const clear = touch.page.locator(`#fig-arch .${P}-clear`);
    assert.equal(await clear.count(), 1, "Clear highlight is in the foot on touch");
    const c = await clear.evaluate((e) => ({ disabled: e.hasAttribute("data-disabled"), color: getComputedStyle(e).color }));
    const toggle = await touch.page.locator(`#fig-arch .${P}-toggle`).evaluate((e) => getComputedStyle(e).color);
    assert.ok(c.disabled, "Clear highlight is disabled with no trace");
    assert.notEqual(c.color, toggle, "and does not look like a live control");
    await touch.page.close();
  });

  test("a linked card in the viewer closes the viewer and is followed, by a click and by Enter; a new tab's link leaves it open", async () => {
    const { page } = await reviewPage();
    await draw(page, [{ key: "arch", spec: B.architecture }]);
    await openViewer(page, "arch");
    const link = page.locator(`dialog.${P}-viewer a.${P}-node[data-node="svc"]`);
    assert.equal(await link.getAttribute("href"), "#fig-sequence");
    await link.click();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => location.hash), "#fig-sequence");
    assert.equal(await page.locator(`dialog.${P}-viewer[open]`).count(), 0, "the viewer is closed");
    await page.evaluate(() => { location.hash = ""; });
    await openViewer(page, "arch");
    await page.locator(`dialog.${P}-viewer a.${P}-node[data-node="svc"]`).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    assert.equal(await page.locator(`dialog.${P}-viewer[open]`).count(), 0, "Enter closes it too");
    await page.close();
  });

  for (const [w, h] of [[1440, 900], [390, 844]]) test(`at ${w} by ${h}, a text sequence's viewer holds the art at its own width, never the transcript`, async () => {
    const { page } = await reviewPage({ width: w, height: h });
    await draw(page, [{ key: "text", spec: B.textSequence }]);
    await openViewer(page, "text");
    await page.waitForSelector(`dialog.${P}-viewer .${P}-text[data-art]`);
    const got = await page.evaluate((P) => {
      const pre = document.querySelector(`dialog.${P}-viewer .${P}-text`);
      return { art: pre.hasAttribute("data-art"), scrolls: pre.scrollWidth > pre.clientWidth + 1, tx: pre.querySelectorAll(`.${P}-tx-line`).length, width: pre.getBoundingClientRect().width };
    }, P);
    assert.ok(got.art && !got.scrolls && got.tx === 0, JSON.stringify(got));
    assert.ok(got.width > 480, "wider than the stack's 480");
    await page.close();
  });

  for (const theme of ["dark", "light"]) test(`${theme}: the viewer's dialog has the form dialog's rim, and right to left it is inside the window`, async () => {
    const { page } = await reviewPage({ theme });
    await draw(page, [{ key: "schema", spec: B.schema }]);
    await openViewer(page, "schema");
    const rim = await page.locator(`dialog.${P}-viewer`).evaluate((d) => { const s = getComputedStyle(d); return { w: s.borderTopWidth, style: s.borderTopStyle, top: s.borderTopColor, side: s.borderLeftColor }; });
    const panel = await page.evaluate(() => { const d = document.createElement("div"); d.className = "basalt-card"; document.body.append(d); const s = getComputedStyle(d); const out = { top: s.borderTopColor, side: s.borderLeftColor }; d.remove(); return out; });
    assert.deepEqual(rim, { w: "1px", style: "solid", top: panel.top, side: panel.side });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    await frames(page, 4);
    await openViewer(page, "schema");
    const r = await rect(page, `dialog.${P}-viewer`);
    assert.ok(r.l >= 15.5 && r.r <= 1440 - 15.5, `inside the window: ${JSON.stringify(r)}`);
    await page.close();
  });
});

describe("right to left, drawn (Fable B5, Neon B4)", () => {
  test("a frame's tab is in its frame's top start corner, the else rule inside its frame, a self-call's words beside its loop, and a Mono detail reads in order", async () => {
    const { page } = await reviewPage();
    await draw(page, [{ key: "seq", spec: B.sequence, dir: "rtl" }, { key: "arch", spec: B.architecture, dir: "rtl" }]);
    assert.equal(await page.locator("#fig-seq").getAttribute("data-layout"), "drawn");
    const frames2 = await page.evaluate((P) => [...document.querySelectorAll(`#fig-seq .${P}-frame`)].map((f) => {
      const box = f.querySelector(`:scope > .${P}-fbox`).getBoundingClientRect(), head = f.querySelector(`:scope > .${P}-fhead`).getBoundingClientRect();
      const rules = [...f.querySelectorAll(`:scope > .${P}-felse`)].map((e) => { const s = getComputedStyle(e, "::before"); const r = e.getBoundingClientRect(); return { l: r.left + parseFloat(s.left), w: parseFloat(s.width) }; });
      return { op: f.dataset.op, box: [box.left, box.right], head: [head.left, head.right], rules };
    }), P);
    for (const f of frames2) {
      assert.ok(f.head[0] >= f.box[0] - 0.5 && f.head[1] <= f.box[1] + 0.5, `${f.op}: the header is inside its frame ${JSON.stringify(f)}`);
      assert.ok(Math.abs(f.head[1] - (f.box[1] - 1)) <= 1, `${f.op}: at the frame's start (right) edge`);
      for (const r of f.rules) assert.ok(Math.abs(r.l - f.box[0]) <= 1 && Math.abs(r.w - (f.box[1] - f.box[0])) <= 1, `${f.op}: the else rule spans the frame`);
    }
    // Message 2 is the service's self-call: its loop goes to the left (the end side right to left), and its words are beside the loop, on the left.
    const self = await page.evaluate((P) => {
      const li = document.querySelector(`#fig-seq .${P}-msg[data-self]`);
      const said = li.querySelector(`.${P}-said`).getBoundingClientRect();
      const o = document.querySelector(`#fig-seq .${P}-drawing`).getBoundingClientRect();
      const line = [...document.querySelectorAll(`#fig-seq .${P}-edge`)].find((g) => g.dataset.from === li.dataset.from && g.dataset.to === li.dataset.to);
      const xs = line.querySelector(`.${P}-line`).getAttribute("d").match(/-?[\d.]+/g).map(Number).filter((_, k) => k % 2 === 0);
      return { side: li.dataset.self, said: [said.left - o.left, said.right - o.left], loop: [Math.min(...xs), Math.max(...xs)] };
    }, P);
    if (self.side === "start") assert.ok(self.said[1] <= self.loop[0] + 0.5, `the words are left of the loop ${JSON.stringify(self)}`);
    else assert.ok(self.said[0] >= self.loop[1] - 0.5, `the words are right of the loop ${JSON.stringify(self)}`);
    // "N tasks · stateless" reads in that order, left to right.
    const order = await page.evaluate((P) => [...document.querySelectorAll(`#fig-arch .${P}-node[data-node="svc"] .${P}-run`)].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left || a.getBoundingClientRect().top - b.getBoundingClientRect().top).map((r) => r.textContent).join(" "), P);
    assert.equal(order, "N tasks · stateless");
    await page.close();
  });
});

describe("stacked (Fable P2, P3, answer 1; the sweep's 66-1 to 66-3)", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: at 390 the else rule runs edge to edge of its frame, no row divider lies on a frame's edge, and no turn into a group's first card is under its label`, async () => {
    const { page } = await reviewPage({ theme, width: 390, height: 900 });
    await draw(page, [{ key: "seq", spec: B.sequence }, { key: "arch", spec: B.architecture }]);
    const got = await page.evaluate((P) => {
      const out = { rules: [], after: [] };
      for (const f of document.querySelectorAll(`#fig-seq .${P}-frame`)) {
        const box = f.getBoundingClientRect();
        for (const e of f.querySelectorAll(`:scope > .${P}-felse`)) { const s = getComputedStyle(e, "::before"); const r = e.getBoundingClientRect(); out.rules.push({ l: r.left + parseFloat(s.left), w: parseFloat(s.width), box: [box.left, box.width] }); }
        const next = f.nextElementSibling;
        if (next?.matches(`.${P}-msgs`)) out.after.push(getComputedStyle(next.firstElementChild).borderTopColor);
      }
      return out;
    }, P);
    assert.ok(got.rules.length > 0);
    for (const r of got.rules) assert.ok(Math.abs(r.l - r.box[0]) <= 1 && Math.abs(r.w - r.box[1]) <= 1, JSON.stringify(r));
    assert.ok(got.after.length > 0);
    for (const c of got.after) assert.match(c, /rgba\(0, 0, 0, 0\)|transparent/, "the row after a frame draws no divider");
    // Answer 1: the inner group "Data & logs" is entered by a turn: its label's plate and the turn do not meet.
    const g = await page.evaluate((P) => {
      const group = [...document.querySelectorAll(`#fig-arch .${P}-group`)].find((x) => x.hasAttribute("data-turn"));
      if (!group) return null;
      const label = group.querySelector(`:scope > .${P}-glabel`).getBoundingClientRect();
      const first = group.querySelector(`.${P}-node`);
      const o = document.querySelector(`#fig-arch .${P}-drawing`).getBoundingClientRect();
      const turns = [...document.querySelectorAll(`#fig-arch .${P}-edge`)].filter((e) => e.dataset.to === first.dataset.node).map((e) => {
        const n = e.querySelector(`.${P}-line`).getAttribute("d").match(/-?[\d.]+/g).map(Number);
        const pts = []; for (let k = 0; k + 1 < n.length; k += 2) pts.push({ x: n[k] + o.left, y: n[k + 1] + o.top });
        return pts;
      });
      return { pad: getComputedStyle(group).paddingTop, label: { t: label.top, b: label.bottom, l: label.left, r: label.right }, turns };
    }, P);
    assert.ok(g, "a group whose first card is entered by a turn is marked");
    assert.equal(g.pad, "48px");
    for (const pts of g.turns) for (const p of pts) assert.ok(!(p.y > g.label.t && p.y < g.label.b && p.x > g.label.l && p.x < g.label.r), `no turn point under the label ${JSON.stringify(p)}`);
    await page.close();
  });

  test("66-1: on touch a one-line end node's words are centred in its 44px box; 66-2: a wrapped route breaks before its arrow and keeps the 16px pitch", async () => {
    const { page } = await reviewPage({ width: 390, height: 900, touch: true });
    await draw(page, [{ key: "flow", spec: B.flowchart }, { key: "seq", spec: B.sequence }]);
    const node = await page.evaluate((P) => {
      const n = [...document.querySelectorAll(`#fig-flow .${P}-node`)].find((e) => e.textContent.includes("Told it was already decided"));
      const r = n.getBoundingClientRect(), w = n.querySelector(`.${P}-name`).getBoundingClientRect();
      return { h: r.height, above: w.top - r.top, below: r.bottom - w.bottom };
    }, P);
    assert.ok(node.h >= 44 - 0.5);
    assert.ok(Math.abs(node.above - node.below) <= 0.5, JSON.stringify(node));
    const routes = await page.evaluate((P) => [...document.querySelectorAll(`#fig-seq .${P}-route`)].map((r) => {
      const to = r.querySelector(`.${P}-to`), arrow = r.querySelector("svg");
      const lines = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
      return { to: Boolean(to), arrowWithName: to && to.contains(arrow), gap: getComputedStyle(r).rowGap, wrapped: to && to.getBoundingClientRect().top > r.getBoundingClientRect().top + 1, ok: !to || [...to.getClientRects()].length === 1 };
    }), P);
    for (const r of routes) { assert.ok(r.to && r.arrowWithName && r.ok); assert.equal(r.gap, "0px"); }
    await page.close();
  });

  test("66-3: right to left, a stacked group's label is on its start side (the right)", async () => {
    const { page } = await reviewPage({ width: 390, height: 900 });
    await draw(page, [{ key: "arch", spec: B.architecture, dir: "rtl" }]);
    const g = await page.evaluate((P) => [...document.querySelectorAll(`#fig-arch .${P}-group`)].map((x) => { const r = x.getBoundingClientRect(), l = x.querySelector(`:scope > .${P}-glabel`).getBoundingClientRect(); return { start: l.left - r.left, end: r.right - l.right }; }), P);
    assert.ok(g.length > 0);
    for (const x of g) assert.ok(x.end < x.start, JSON.stringify(x));
    await page.close();
  });
});

describe("the text sequence (Fable B6, P4, P7; Neon B6)", () => {
  test("the transcript: a message's label and note on lines of their own, each hanging under the sender inside its frame's indent; the key's focal swatch is the art's double box", async () => {
    const { page } = await reviewPage({ width: 390, height: 900 });
    await draw(page, [{ key: "text", spec: B.textSequence }]);
    const got = await page.evaluate((P) => {
      const lines = [...document.querySelectorAll(`#fig-text .${P}-tx-line[data-n]`)];
      const byN = new Map();
      for (const l of lines) { const n = l.dataset.n; if (!byN.has(n)) byN.set(n, []); byN.get(n).push(l); }
      return [...byN.values()].map((ls) => {
        const first = ls[0], sender = first.querySelector(`.${P}-tx-name`).getBoundingClientRect().left;
        return { n: first.dataset.n, lines: ls.length, label: ls[1]?.textContent, hang: ls.slice(1).map((l) => { const r = document.createRange(); r.selectNodeContents(l); return r.getClientRects()[0].left - sender; }), labelInLine1: first.textContent.includes(ls[1]?.textContent ?? "\u0000") };
      });
    }, P);
    assert.ok(got.length >= 10);
    for (const m of got) {
      assert.ok(m.lines >= 2 && m.label && !m.labelInLine1, JSON.stringify(m));
      for (const x of m.hang) assert.ok(Math.abs(x) <= 1, `message ${m.n} hangs under its sender (${x})`);
    }
    const focal = await page.locator(`#fig-text .${P}-entry[data-focal] .${P}-key-glyph`).textContent();
    assert.equal(focal, "╔═╗");
    await page.close();
  });

  test("textArt: a frame's header too long for its columns widens the frame, with both corners; a self-call on the last participant keeps its words off the next lifeline", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const text = await import(pathToFileURL(path.join(pkg, "dist", "diagram-text.js")).href);
    const m = core.buildModel({ type: "sequence", variant: "text", title: "t", summary: "s", participants: [{ id: "a", name: "A" }, { id: "b", name: "B" }],
      steps: [{ frame: "opt", label: "a very long condition header for it", steps: [{ from: "a", to: "b", label: "go" }, { from: "b", to: "b", label: "self", note: "a much longer note than the self label" }] }] });
    const rows = text.textArt(m).html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").split("\n");
    const top = rows.find((r) => r.includes("[opt]"));
    assert.match(top, /┌.*\[opt\].*a very long condition header for it.*┐/);
    const bottom = rows.filter((r) => r.trimStart().startsWith("└─") && r.includes("┘")).pop();
    assert.equal(top.indexOf("┌"), bottom.indexOf("└"));
    assert.equal(top.lastIndexOf("┐"), bottom.lastIndexOf("┘"));
    const noteRow = rows.find((r) => r.includes("a much longer note than the self label"));
    assert.ok(noteRow, "the note is whole");
    assert.equal(noteRow[top.indexOf("┌")], "│", "the frame's side is not written over");
  });

  test("animated: the build waits until the art is in view, then plays; run: true shows Play the run, and the run quiets the messages not yet reached", async () => {
    const { page } = await reviewPage({ width: 1440, height: 600 });
    const spec = { ...B.textSequence, motion: "animated", run: true };
    await page.evaluate((spec) => window.__set([{ key: "spacer", spec: { type: "schema", title: "Spacer", summary: "s", tables: Array.from({ length: 6 }, (_, k) => ({ name: `t${k}`, col: 1, row: k + 1, columns: [{ name: "id" }] })) } }, { key: "text", spec }]), spec);
    await page.waitForSelector(`#fig-text .${P}-text[data-art]`);
    await page.waitForTimeout(600);
    assert.equal(await page.locator("#fig-text").getAttribute("data-entrance"), "pending", "out of view, the build waits");
    await page.locator("#fig-text").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => ["running", "done"].includes(document.querySelector("#fig-text").getAttribute("data-entrance")));
    const play = page.locator(`#fig-text button`, { hasText: "Play the run" });
    assert.equal(await play.count(), 1, "Play the run");
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await play.click();
    await page.waitForTimeout(200);
    const ahead = await page.locator(`#fig-text .${P}-text [data-n][data-ahead]`).count();
    assert.ok(ahead > 0, "messages not yet reached are quiet");
    await page.close();
  });
});

describe("export (Neon B5)", () => {
  test("a flowchart's diamonds keep their size and stroke; a running entrance and a quiet run export at rest; the else rule is drawn; the lines are under the cards", async () => {
    const { page } = await reviewPage();
    await draw(page, [{ key: "flow", spec: B.flowchart }, { key: "seq", spec: { ...B.sequence, motion: "animated", run: true } }]);
    const svg = await page.evaluate(async () => await (await window.__export.diagramToSvg(document.querySelector("#fig-flow"), { fonts: "name" })).text());
    const diamonds = [...svg.matchAll(/<svg viewBox="0 0 100 100"[^>]*>/g)].map((m) => m[0]);
    assert.ok(diamonds.length > 0);
    for (const d of diamonds) assert.match(d, /width="[\d.]+" height="[\d.]+"/);
    assert.match(svg, /vector-effect="non-scaling-stroke"/);
    const ink = svg.indexOf('<svg width=');
    assert.ok(ink >= 0 && ink < svg.indexOf("<rect x="), "the drawing's lines come before the cards' boxes");
    // The sequence mid-entrance and mid-run.
    await page.locator("#fig-seq").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const mid = await page.evaluate(async () => await (await window.__export.diagramToSvg(document.querySelector("#fig-seq"), { fonts: "name" })).text());
    assert.doesNotMatch(mid, /-reveal-/);
    assert.match(mid, /stroke-dasharray="4 4"/, "the else rule is in the file");
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.locator(`#fig-seq button`, { hasText: "Play the run" }).click();
    await page.waitForTimeout(300);
    assert.ok(await page.locator(`#fig-seq [data-ahead]`).count() > 0);
    const run = await page.evaluate(async () => await (await window.__export.diagramToSvg(document.querySelector("#fig-seq"), { fonts: "name" })).text());
    const secondary = await page.evaluate(() => getComputedStyle(document.querySelector("#fig-seq")).getPropertyValue("--basalt-text-secondary").trim());
    const labels = await page.evaluate((P) => [...document.querySelectorAll(`#fig-seq .${P}-mlabel`)].map((e) => e.textContent), P);
    assert.ok(await page.locator(`#fig-seq [data-ahead]`).count() > 0, "the run is put back after the read");
    const last = labels[labels.length - 1].split(" ")[0];
    const fill = new RegExp(`fill="([^"]+)"[^>]*>${last.replace(/[{}/]/g, (c) => `\\${c}`)}<`).exec(run)?.[1];
    assert.ok(fill && fill !== secondary, `an unreached message exports in its resting ink (${fill})`);
    await page.close();
  });
});

describe("automatic layout and the schema (Neon B8, B9, P1 to P3)", () => {
  test("a placement with two cards in one cell is not used: the figure stacks and a development build names the cards", async () => {
    const { page, warnings } = await reviewPage({ dev: true });
    await draw(page, [{ key: "bad", spec: { type: "architecture", layout: "auto", title: "Two in one", summary: "s", nodes: [{ id: "a", name: "A" }, { id: "b", name: "B" }], edges: [{ from: "a", to: "b" }], placement: { direction: "right", cells: { a: { col: 1, row: 1 }, b: { col: 1, row: 1 } } } } }]);
    assert.equal(await page.locator("#fig-bad").getAttribute("data-layout"), "stacked");
    assert.ok(warnings.some((w) => /puts a and b in one cell/.test(w)), JSON.stringify(warnings));
    await page.close();
  });

  test("a one-column marked schema: turn-backs that state different things at one key take lanes of their own and draw", async () => {
    const { page } = await reviewPage();
    await draw(page, [{ key: "one", spec: { type: "schema", title: "One column", summary: "s", tables: [
      { name: "users", col: 1, row: 1, columns: [{ name: "id", key: "PK" }] },
      { name: "a", col: 1, row: 2, columns: [{ name: "x", key: "FK", references: "users.id", cardinality: { from: "zero-or-many", to: "one" } }] },
      { name: "b", col: 1, row: 3, columns: [{ name: "y", key: "FK", references: "users.id", cardinality: { from: "zero-or-many", to: "zero-or-one" } }] },
    ] } }]);
    const g = await inspect(page, "one");
    assert.equal(g.layout, "drawn");
    assert.equal(g.lines.length, 2);
    assert.deepEqual(g.problems, []);
    await page.close();
  });

  test("placeDiagram: an empty figure and a cycle of groups answer; right to left a way-only column stays", async () => {
    const { placeDiagram } = await import(pathToFileURL(path.join(pkg, "dist", "diagram-layout.js")).href);
    const empty = await placeDiagram({ type: "architecture", nodes: [], edges: [] }, "right");
    assert.deepEqual([empty.cols, empty.rows], [1, 1]);
    const cyc = await Promise.race([placeDiagram({ type: "architecture", groups: [{ id: "g", label: "G", parent: "h" }, { id: "h", label: "H", parent: "g" }], nodes: [{ id: "a", group: "g" }, { id: "b", group: "h" }], edges: [{ from: "a", to: "b", kind: "main" }] }, "down"), new Promise((r) => setTimeout(() => r("hung"), 5000))]);
    assert.notEqual(cyc, "hung");
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const placement = { direction: "down", cols: 2, rows: 2, cells: { a: { col: 2, row: 1 }, b: { col: 2, row: 2 } } };
    const spec = { type: "architecture", layout: "auto", title: "t", summary: "s", nodes: [{ id: "a", name: "A" }, { id: "b", name: "B" }], edges: [{ from: "a", to: "b", kind: "main" }] };
    assert.equal(core.buildModel(spec, { placement }).cols, 2);
    assert.equal(core.buildModel(spec, { placement, rtl: true }).cols, 2);
  });

  test("a straight line and two others on one half grow a card to 48, not 49 (Neon P1)", async () => {
    const core = await import(pathToFileURL(path.join(pkg, "dist", "diagram-core.js")).href);
    const n = (id, col, row) => ({ id, name: id, kind: "part", col, row });
    const m = core.buildModel({ type: "architecture", title: "t", summary: "s", nodes: [n("a", 1, 1), n("b", 2, 1), n("c", 2, 2), n("d", 2, 3)], edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }] }, { checks: false });
    assert.equal(core.portFloors(m).a, 48);
  });
});

describe("the sequence's fit and order (Neon B7, P8)", () => {
  test("a self-call's words that would lie on a frame's side stack the figure; the lifelines are under the frames, the bars and lines over them", async () => {
    const { page } = await reviewPage();
    const spec = { type: "sequence", title: "t", summary: "s", participants: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }],
      steps: [{ frame: "opt", label: "only", steps: [{ from: "a", to: "b", label: "go" }, { from: "b", to: "b", label: "a self-call whose words are long" }] }, { from: "b", to: "c", label: "on" }] };
    await draw(page, [{ key: "fit", spec }, { key: "seq", spec: B.sequence }]);
    const fit = await page.evaluate((P) => {
      const said = document.querySelector(`#fig-fit .${P}-msg[data-self] .${P}-said`);
      const box = document.querySelector(`#fig-fit .${P}-fbox`);
      if (!said || !box) return { layout: document.querySelector("#fig-fit").dataset.layout };
      const s = said.getBoundingClientRect(), b = box.getBoundingClientRect();
      return { layout: document.querySelector("#fig-fit").dataset.layout, crosses: s.left < b.right && s.right > b.right };
    }, P);
    assert.ok(fit.layout === "stacked" || !fit.crosses, JSON.stringify(fit));
    const z = await page.evaluate((P) => {
      const fig = document.querySelector("#fig-seq");
      const zi = (sel) => getComputedStyle(fig.querySelector(sel)).zIndex;
      return { lifes: zi(`.${P}-lifes`), frame: zi(`.${P}-fbox`), lines: zi(`.${P}-ink > .${P}-svg`), said: zi(`.${P}-msg .${P}-said`), steps: zi(`.${P}-steps`), ink: zi(`.${P}-ink`) };
    }, P);
    assert.deepEqual(z, { lifes: "0", frame: "1", lines: "2", said: "3", steps: "auto", ink: "auto" });
    await page.close();
  });

  test("forced colours: a quiet run's head goes with its line", async () => {
    const { page } = await reviewPage({ media: { forcedColors: "active" } });
    await draw(page, [{ key: "seq", spec: { ...B.sequence, motion: "animated", run: true } }]);
    await page.evaluate(() => { const g = document.querySelector("#fig-seq .basalt-diagram-edge"); g.setAttribute("data-ahead", ""); });
    const c = await page.evaluate((P) => { const g = document.querySelector(`#fig-seq .${P}-edge[data-ahead]`); return { line: getComputedStyle(g.querySelector(`.${P}-line`)).stroke, tip: getComputedStyle(g.querySelector(`.${P}-tip`)).fill }; }, P);
    assert.ok(c.line === c.tip || (c.tip === "none"), JSON.stringify(c));
    await page.close();
  });
});

describe("the package's lazy parts (Neon B12)", () => {
  test("the index and every diagram component reach diagram-layout, its graph, elkjs, export, the viewer, motion and the text art only by a dynamic import", () => {
    const dist = path.join(pkg, "dist");
    const statics = (file) => [...fs.readFileSync(path.join(dist, file), "utf8").matchAll(/(?:^|[;\n])\s*(?:import|export)\s[^;]*?from\s*"(\.\/[^"]+)"|(?:^|[;\n])\s*import\s*"(\.\/[^"]+)"/g)].map((m) => path.normalize(path.join(path.dirname(file), m[1] ?? m[2])));
    const lazy = ["diagram-layout.js", "diagram-layout-graph.js", "diagram-elk.js", "diagram-export.js", "diagram-viewer.js", "diagram-motion.js", "diagram-text.js"];
    for (const entry of ["index.js", "architecture-diagram.js", "flowchart-diagram.js", "data-flow-diagram.js", "sequence-diagram.js", "schema-diagram.js"]) {
      const seen = new Set([entry]);
      const todo = [entry];
      while (todo.length) for (const next of statics(todo.pop())) if (!seen.has(next) && fs.existsSync(path.join(dist, next))) { seen.add(next); todo.push(next); }
      for (const name of lazy) assert.ok(!seen.has(name), `${entry} reaches ${name} statically`);
      for (const file of seen) assert.doesNotMatch(fs.readFileSync(path.join(dist, file), "utf8"), /Eclipse Layout Kernel/, `${entry} reaches elkjs through ${file}`);
    }
  });
});

describe("motion (Neon B12: the quiet run and the first visit)", () => {
  test("a drawn run quiets every message after the current one and restores them all when stopped", async () => {
    const { page } = await reviewPage();
    await draw(page, [{ key: "seq", spec: { ...B.sequence, motion: "animated", run: true } }]);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.locator(`#fig-seq button`, { hasText: "Play the run" }).click();
    await page.waitForTimeout(250);
    const during = await page.evaluate((P) => { const msgs = [...document.querySelectorAll(`#fig-seq .${P}-msg`)]; const k = msgs.findIndex((m) => m.hasAttribute("data-ahead")); return { first: k, after: msgs.slice(k).every((m) => m.hasAttribute("data-ahead")), label: k >= 0 ? getComputedStyle(msgs[k].querySelector(`.${P}-mlabel`)).color : null, rest: getComputedStyle(msgs[0].querySelector(`.${P}-mlabel`)).color }; }, P);
    assert.ok(during.first > 0 && during.after, JSON.stringify(during));
    assert.notEqual(during.label, during.rest, "a quiet label is in another ink");
    await page.locator(`#fig-seq button`, { hasText: "Stop the run" }).click();
    await frames(page, 3);
    assert.equal(await page.locator(`#fig-seq [data-ahead]`).count(), 0);
    await page.close();
  });

  test("entrance: first-visit stores a mark when the entrance finishes, and the next visit is at rest", async () => {
    const { page } = await reviewPage();
    // On a real (fake-host) origin, so localStorage works: the fixture's own page, served there.
    const html = await page.evaluate(() => { document.getElementById("root").replaceChildren(); return `<!doctype html>${document.documentElement.outerHTML}`; });
    await page.route("https://basalt.test/**", (route) => route.fulfill({ contentType: "text/html", body: html }));
    await page.goto("https://basalt.test/");
    await page.evaluate(() => document.fonts.ready);
    const spec = { ...B.architecture, motion: "animated", entrance: "first-visit" };
    await draw(page, [{ key: "arch", spec }]);
    await page.waitForFunction(() => document.querySelector("#fig-arch").getAttribute("data-entrance") === "running");
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await page.waitForFunction(() => document.querySelector("#fig-arch").getAttribute("data-entrance") === "done");
    const key = await page.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith("basalt-diagram-entrance:")));
    assert.ok(key && key.endsWith("#fig-arch"), String(key));
    await page.evaluate(() => window.__set([]));
    await frames(page, 2);
    await draw(page, [{ key: "arch", spec }]);
    assert.equal(await page.locator("#fig-arch").getAttribute("data-entrance"), "done", "the second visit is at rest from its first frame");
    await page.close();
  });
});

describe("right to left, every figure (Neon B12)", () => {
  for (const theme of ["dark", "light"]) test(`${theme}: the five extended figures drawn right to left pass the merged geometry suite at 1104`, async () => {
    const { page } = await reviewPage({ theme });
    const keys = ["architecture", "flowchart", "dataFlow", "sequence", "schema"];
    await draw(page, keys.map((k) => ({ key: k, spec: B[k], dir: "rtl" })));
    for (const k of keys) {
      const g = await inspect(page, k);
      assert.equal(g.layout, "drawn", k);
      assert.deepEqual(g.problems, [], `${k}: ${JSON.stringify(g.problems)}`);
    }
    await page.close();
  });
});
