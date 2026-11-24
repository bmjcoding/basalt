// Terminal's stage lines (DECISIONS 316, 1.7): each state's gutter mark and its name; a failed line is the error line; skipped and canceled draw their word,
// said once; a stage transcript declared at mount is never a log; the net for an undeclared one; `keep` and `time`; the durations' one column; the one
// step back and where it is not taken; no scrollbar on a live window, with classic scrollbars (launched without --hide-scrollbars) and the keys; an
// existing live Terminal still a log and still following its end. Chromium, built package, real stylesheet.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import fs from "node:fs";
import { createRequire } from "node:module";

import { chromium } from "playwright";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let classic;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); await classic?.close(); });

const LINES = `[
  { kind: "command", text: "basalt deploy --prod" },
  { kind: "stage", state: "done", text: "Cloned main@4f2a1c0", start: 0, end: 700 },
  { kind: "stage", state: "skipped", text: "cache restore (no cache)" },
  { kind: "stage", state: "done", text: "Installed 412 packages", start: 0, end: 1700 },
  { kind: "stage", state: "failed", text: "Build failed: 2 type errors", start: 0, end: 2300 },
  { kind: "output", text: "src/app.ts(4,7): error TS2322" },
  { kind: "stage", state: "canceled", text: "upload artifacts" },
  { kind: "stage", state: "running", text: "Promoting to production", start: Date.now() - 400 },
]`;

// A transcript the app drives: it mounts empty and running, gets a command, then a stage line, then more.
const DRIVEN = ({ stages = true, keep, time = false, width = 640 } = {}) => `
const ALL = ${LINES};
function App() {
  const [n, setN] = React.useState(0);
  const [lines, setLines] = React.useState(null);
  React.useEffect(() => { window.next = () => setN((x) => x + 1); window.to = (k) => setN(k); window.replace = (l) => setLines(l); }, []);
  return <div style={{ padding: 24, width: ${width} }}>
    <B.Terminal title="Deploy · basalt-sra" status="running" lines={lines ?? ALL.slice(0, n)} ${stages ? "stages" : ""} ${keep ? `keep={${keep}}` : ""} ${time ? "time={{ start: Date.now() - 1000 }}" : ""} />
    <p id="after">After</p>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async (body, { b = browser, ...options } = {}) => {
  const { page, errors } = await fixturePage(b, body, { theme: "dark", standards: true, viewport: { width: 1024, height: 800 }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
// Every live element in the transcript that holds any of its lines (the copy button's own empty status, which says "Copied", holds none).
const live = (page) => page.evaluate(() => [...document.querySelectorAll("[role=log], [role=status], [role=alert], [aria-live]")]
  .filter((el) => el.closest(".basalt-terminal") && (el.querySelector(".basalt-code-line") || el.closest("pre") || /basalt deploy|Cloned|Installed|Promoting/.test(el.textContent)))
  .map((el) => ({ role: el.getAttribute("role"), text: el.textContent })));

describe("stage lines", () => {
  test("each state's gutter mark and its name: braille, check, XCircle, minus, Prohibit; a failed line is the error line", async () => {
    const page = await open(DRIVEN());
    await page.evaluate(() => window.to(8));
    await settle(page);
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-code-line[data-kind=stage]")].map((line) => {
      const gutter = line.querySelector(".basalt-code-gutter");
      const img = gutter.querySelector("[role=img]");
      return { state: line.dataset.state, img: img?.getAttribute("aria-label") ?? null, hidden: gutter.querySelector("svg.basalt-icon")?.getAttribute("aria-hidden") ?? null, braille: !!gutter.querySelector(".basalt-spinner[data-variant=braille]"), text: getComputedStyle(line.querySelector(".basalt-code-text")).color, mark: gutter.querySelector(".basalt-icon") ? getComputedStyle(gutter.querySelector(".basalt-icon")).color : null };
    }));
    const ink = (name) => page.evaluate((n) => { const p = document.createElement("span"); p.style.color = `var(${n})`; document.body.append(p); return getComputedStyle(p).color; }, name);
    const by = Object.fromEntries(r.map((x) => [x.state, x]));
    assert.equal(by.done.img, "Done");
    assert.equal(by.done.mark, await ink("--basalt-text-secondary"));
    assert.equal(by.failed.img, "Failed");
    assert.equal(by.failed.mark, await ink("--basalt-status-danger"));
    assert.equal(by.failed.text, await ink("--basalt-status-danger"), "the error line's text is danger ink");
    assert.equal(by.skipped.img, null);
    assert.equal(by.skipped.hidden, "true", "a drawn word's mark is aria-hidden");
    assert.equal(by.skipped.mark, await ink("--basalt-text-tertiary"));
    assert.equal(by.canceled.hidden, "true");
    assert.equal(by.running.img, "Running");
    assert.ok(by.running.braille);
    // Check and minus are the core set's, never Phosphor's.
    const core = await page.evaluate(() => ["done", "skipped"].map((s) => document.querySelector(`.basalt-code-line[data-state=${s}] svg`).getAttribute("data-glyph") ?? document.querySelector(`.basalt-code-line[data-state=${s}] svg`).outerHTML.slice(0, 80)));
    assert.ok(core.every((g) => !/phosphor/i.test(g)), core.join(" | "));
  });

  test("skipped and canceled draw their word first and are said once", async () => {
    const page = await open(DRIVEN());
    await page.evaluate(() => window.to(8));
    await settle(page);
    const tree = await page.locator("pre").ariaSnapshot();
    assert.equal((tree.match(/Skipped/g) ?? []).length, 1, tree);
    assert.match(tree, /Skipped cache restore \(no cache\)/);
    assert.match(tree, /Canceled upload artifacts/);
  });

  test("the durations are one column at the log's end, and a long line arriving moves none of them", async () => {
    const page = await open(DRIVEN());
    await page.evaluate(() => window.to(5));
    await settle(page);
    const ends = () => page.evaluate(() => [...document.querySelectorAll(".basalt-terminal-duration")].map((d) => d.getBoundingClientRect().right));
    const before = await ends();
    assert.ok(before.every((e) => e === before[0]), `one column: ${before}`);
    await page.evaluate(`window.replace([...${LINES}.slice(0, 5), { kind: "output", text: "x".repeat(400) }])`);
    await settle(page);
    assert.deepEqual((await ends()).slice(0, before.length), before);
  });
});

describe("a stage transcript is never a log", () => {
  test("declared at mount: empty and running it is a group, then a region; no live role ever holds the command or a line", async () => {
    const page = await open(DRIVEN());
    const role = () => page.evaluate(() => document.querySelector(".basalt-terminal pre").getAttribute("role"));
    assert.equal(await role(), "group");
    assert.deepEqual(await live(page), []);
    for (let k = 1; k <= 8; k += 1) {
      await page.evaluate(() => window.next());
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      assert.equal(await role(), "region", `after line ${k}`);
      assert.deepEqual(await live(page), [], `after line ${k}`);
    }
  });

  test("no text in the region changes more than once a stage while a line's time ticks", async () => {
    const page = await open(DRIVEN());
    await page.evaluate(() => window.to(8));
    await settle(page);
    const said = () => page.locator("pre").ariaSnapshot();
    const first = await said();
    await page.waitForTimeout(700);
    assert.equal(await said(), first, "the running line's time ticks unread");
    const shown = await page.evaluate(() => document.querySelector(".basalt-code-line[data-state=running] .basalt-terminal-duration [data-on]").textContent);
    assert.match(shown, /^\d+\.\d s$/, "and it is drawn");
  });

  test("a Terminal without stages is still a log while lines arrive", async () => {
    const page = await open(DRIVEN({ stages: false }));
    await page.evaluate(() => window.to(1));
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-terminal pre").getAttribute("role")), "log");
  });

  test("the net: a stage line in a transcript that did not declare it is drawn and makes the window silent from then on", async () => {
    const page = await open(DRIVEN({ stages: false }));
    await page.evaluate(() => window.to(2));
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-terminal pre").getAttribute("role")), "region");
    assert.equal(await page.locator(".basalt-code-line[data-kind=stage]").count(), 1);
    await page.evaluate(() => window.replace([{ kind: "output", text: "plain again" }]));
    await settle(page);
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-terminal pre").getAttribute("role")), "region", "silent from then on");
  });

  test("development: a stage line without stages warns; keep or time without stages warns and changes nothing", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { Terminal } = await import(path.join(pkg, "dist", "terminal.js"));
    const warn = console.warn;
    const said = [];
    console.warn = (m) => said.push(String(m));
    let plain;
    let withKeep;
    try {
      renderToString(React.createElement(Terminal, { title: "A", status: "running", lines: [{ kind: "stage", state: "done", text: "Cloned" }] }));
      plain = renderToString(React.createElement(Terminal, { title: "B", lines: [{ kind: "output", text: "ok" }] }));
      withKeep = renderToString(React.createElement(Terminal, { title: "B", lines: [{ kind: "output", text: "ok" }], keep: 1, time: { start: 0 } }));
    } finally { console.warn = warn; }
    assert.ok(said.some((m) => /a stage line arrived in a transcript that did not declare `stages`/.test(m)));
    assert.ok(said.some((m) => /`keep` and `time` belong to a stage transcript/.test(m)));
    assert.equal(withKeep.replace(/_R_[\w]+_|«[^»]+»|:[a-z0-9]+:/g, ""), plain.replace(/_R_[\w]+_|«[^»]+»|:[a-z0-9]+:/g, ""), "nothing changes");
  });
});

describe("keep and time", () => {
  test("keep: lines older than the newest keep stage lines, with their output, step back once to tertiary (a failed one danger at 0.88), over duration-fast", async () => {
    const page = await open(DRIVEN({ keep: 3 }));
    await page.evaluate(() => window.to(8));
    await settle(page);
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-code-line")].map((l) => ({ kind: l.dataset.kind, state: l.dataset.state, receded: l.hasAttribute("data-receded"), color: getComputedStyle(l.querySelector(".basalt-code-text")).color, transition: getComputedStyle(l).transitionDuration })));
    // 6 stage lines: the newest 3 (failed, canceled, running) stay; every stage line before the failed one steps back, and the command never does.
    assert.deepEqual(r.map((x) => x.receded), [false, true, true, true, false, false, false, false]);
    const tertiary = await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--basalt-text-tertiary)"; document.body.append(p); return getComputedStyle(p).color; });
    assert.ok(r.slice(1, 4).every((x) => x.color === tertiary), JSON.stringify(r.slice(1, 4)));
    assert.notEqual(r[0].color, tertiary, "the command keeps its ink");
    assert.equal(r[1].transition, "0.1s");
    await page.evaluate(`window.replace(${LINES}.map((l) => (l.state === "skipped" ? { ...l, state: "failed", text: "cache failed" } : l)))`);
    await settle(page);
    const failed = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-code-line[data-receded][data-state=failed] .basalt-code-text")).color);
    assert.match(failed, /color\(srgb [\d.]+ [\d.]+ [\d.]+ \/ 0\.88\)|rgba\(\d+, \d+, \d+, 0\.88\)/, `danger at 0.88: ${failed}`);
  });

  for (const [mode, options] of [["more contrast", { contrast: "more" }], ["forced colours", { forcedColors: "active" }]]) {
    test(`keep: no line steps back under ${mode}`, async () => {
      const page = await open(DRIVEN({ keep: 3 }), options);
      await page.evaluate(() => window.to(8));
      await settle(page);
      const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-code-line")].slice(1, 4).map((l) => [l.hasAttribute("data-receded"), getComputedStyle(l.querySelector(".basalt-code-text")).color]));
      const fresh = await page.evaluate(() => getComputedStyle(document.querySelectorAll(".basalt-code-line")[6].querySelector(".basalt-code-text")).color);
      const done = await page.evaluate(() => { const l = document.createElement("span"); l.style.color = "var(--basalt-text-secondary)"; document.querySelector(".basalt-terminal").append(l); return getComputedStyle(l).color; });
      assert.ok(r.every(([receded]) => receded), "marked");
      assert.equal(r[0][1], mode === "more contrast" ? done : fresh, `${mode}: the done line keeps its own ink`);
    });
  }

  test("time: the run's time in the head, after the state word, in the head's secondary ink, in a reserved seat", async () => {
    const page = await open(DRIVEN({ time: true }));
    await page.evaluate(() => window.to(2));
    await settle(page);
    const r = await page.evaluate(() => { const t = document.querySelector(".basalt-terminal-head .basalt-run-timer"); const state = document.querySelector(".basalt-terminal-state").getBoundingClientRect(); return { after: t.getBoundingClientRect().left >= state.right, color: getComputedStyle(t).color, secondary: (() => { const p = document.createElement("span"); p.style.color = "var(--basalt-text-secondary)"; document.body.append(p); return getComputedStyle(p).color; })(), text: t.querySelector("[data-on]").textContent }; });
    assert.ok(r.after);
    assert.equal(r.color, r.secondary);
    assert.match(r.text, /^\d+\.\d s$/);
  });
});

describe("no scrollbar on a live window", () => {
  test("with classic scrollbars no bar takes room on either axis, and Home, End and the arrows scroll it", async () => {
    classic ??= await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    const page = await open(DRIVEN({ width: 342 }), { b: classic, viewport: { width: 390, height: 800 } });
    await page.evaluate(`window.replace([...${LINES}, ...Array.from({ length: 12 }, (_, i) => ({ kind: "output", text: "Generated static page " + i + " of 38 at /docs/a-long-route-name-" + i }))])`);
    await settle(page);
    const pre = page.locator(".basalt-terminal pre");
    const r = await pre.evaluate((el) => ({ outer: [el.offsetWidth, el.offsetHeight], inner: [el.clientWidth, el.clientHeight], over: [el.scrollWidth > el.clientWidth, el.scrollHeight > el.clientHeight], bars: getComputedStyle(el).scrollbarWidth }));
    assert.deepEqual(r.over, [true, true], "it overflows on both axes");
    assert.equal(r.outer[0] - r.inner[0], 0, "no vertical bar takes room");
    assert.equal(r.outer[1] - r.inner[1], 0, "no horizontal bar takes room");
    assert.equal(r.bars, "none");
    await pre.focus();
    await page.keyboard.press("Home");
    await page.waitForTimeout(200);
    assert.equal(await pre.evaluate((el) => el.scrollTop), 0);
    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    assert.ok(await pre.evaluate((el) => el.scrollTop > 0));
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    assert.ok(await pre.evaluate((el) => el.scrollLeft > 0));
    assert.equal(await pre.getAttribute("tabindex"), "0");
  });

  test("a static Terminal keeps the system's bars", async () => {
    classic ??= await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
    const body = `createRoot(document.getElementById("root")).render(<div style={{ width: 300 }}><B.Terminal title="Static" lines={[{ kind: "output", text: "x".repeat(200) }]} /></div>);`;
    const page = await open(body, { b: classic });
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-terminal pre")).scrollbarWidth), "auto");
  });

  test("an existing live Terminal follows its end as before", async () => {
    const page = await open(DRIVEN({ stages: false }));
    await page.evaluate(() => window.replace(Array.from({ length: 30 }, (_, i) => ({ kind: "output", text: "line " + i }))));
    await settle(page);
    const atEnd = await page.evaluate(() => { const el = document.querySelector(".basalt-terminal pre"); return el.scrollHeight - el.scrollTop - el.clientHeight; });
    assert.ok(atEnd < 2, `${atEnd}px from the end`);
  });
});

describe("axe", () => {
  for (const theme of ["light", "dark"]) {
    test(`no WCAG 2.2 AA violations in a stage transcript, running and stepped back (${theme})`, async () => {
      const page = await open(DRIVEN({ keep: 3, time: true }), { theme });
      await page.evaluate(() => window.to(8));
      await settle(page);
      await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).join(" | ")}`));
      assert.deepEqual(v, []);
    });
  }
});

describe("the council's review", () => {
  test("a declared replay that ends on a failed stage finishes Failed, and a drawn word hides the mark from assistive technology (Astra 8)", async () => {
    const body = `createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 640 }}><B.Terminal title="Deploy" stages replay interval={50} lines={[{ kind: "command", text: "basalt deploy" }, { kind: "stage", state: "failed", word: "Failed", text: "Tests", start: 0, end: 900 }]} /></div>);`;
    const page = await open(body);
    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForFunction(() => document.querySelector(".basalt-terminal-state")?.dataset.state === "failed", null, { timeout: 4000 });
    const tree = await page.locator("pre").ariaSnapshot();
    assert.equal((tree.match(/Failed/g) ?? []).length, 1, tree);
  });

  test("an older output line's loud field steps back with its line", async () => {
    const page = await open(DRIVEN({ keep: 1 }));
    await page.evaluate(() => window.replace([{ kind: "command", text: "basalt deploy" }, { kind: "stage", state: "done", text: "Built", start: 0, end: 900 }, { kind: "output", text: "route /docs", fields: [{ text: "route", loud: true }, " /docs"] }, { kind: "stage", state: "done", text: "Uploaded", start: 0, end: 300 }]));
    await settle(page);
    const r = await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--basalt-text-tertiary)"; document.body.append(p); return [getComputedStyle(document.querySelector(".basalt-code-line[data-receded] .basalt-log-field")).color, getComputedStyle(p).color]; });
    assert.equal(r[0], r[1]);
  });
});

describe("the head under 480px of the Terminal's own width (ruling 12)", () => {
  for (const width of [390, 320]) {
    for (const theme of ["light", "dark"]) {
      test(`a head with a run's time is two rows, 70px, its words 15 from its edges: the title and the copy glyph on the padding line, then the state and its time from the title's edge (${width}, ${theme})`, async () => {
        const body = `createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><B.Card style={{ padding: 16 }}><B.Terminal title="Deploy · basalt-sra" stages keep={3} status="running" time={{ start: Date.now() - 6300 }} lines={[{ kind: "command", text: "basalt deploy --prod" }, { kind: "stage", state: "running", text: "Cloning main@4f2a1c0", start: Date.now() - 300 }]} /></B.Card></div>);`;
        const page = await open(body, { theme, viewport: { width, height: 500 } });
        await page.evaluate(() => document.fonts.ready);
        const r = await page.evaluate(() => {
          const h = document.querySelector(".basalt-terminal-head");
          const hr = h.getBoundingClientRect();
          const pad = hr.right - parseFloat(getComputedStyle(h).paddingRight);
          const range = document.createRange();
          range.selectNodeContents(document.querySelector(".basalt-terminal-title"));
          const title = range.getBoundingClientRect();
          const state = document.querySelector(".basalt-terminal-state [data-on]").getBoundingClientRect();
          const time = document.querySelector(".basalt-terminal-time").getBoundingClientRect();
          const button = document.querySelector(".basalt-terminal-copy-compact").getBoundingClientRect();
          const glyph = document.querySelector(".basalt-terminal-copy-compact svg").getBoundingClientRect();
          // The copy button's target hangs into the padding (DECISIONS 326, 67-6); what is drawn, its glyph included, stays inside it.
          const drawn = [...h.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility === "visible" && !e.closest(".basalt-visually-hidden") && !e.matches(".basalt-terminal-copy-compact"));
          // The title's line box (text-xs's 16px line) is read from the row it is centred on, not from the fallback face's glyphs, which a fixture without Geist draws.
          const line = parseFloat(getComputedStyle(document.querySelector(".basalt-terminal-title")).lineHeight);
          const centre = (button.top + button.bottom) / 2;
          const stateLine = document.querySelector(".basalt-terminal-state").getBoundingClientRect();
          return { head: hr.height, titleTop: centre - line / 2 - hr.top, stateFromTitle: state.left - title.left, between: stateLine.top + (stateLine.height - line) / 2 - (centre + line / 2), under: hr.bottom - (stateLine.top + (stateLine.height + line) / 2), buttonEnd: Math.round(pad - button.right), glyphEnd: Math.round((pad - glyph.right) * 100) / 100, buttonRow: Math.abs((button.top + button.bottom) / 2 - (title.top + title.bottom) / 2) < 1, timeAfterState: time.left > state.left && Math.abs(time.top - state.top) < 4, past: Math.max(...drawn.map((e) => e.getBoundingClientRect().right)) - pad };
        });
        assert.equal(r.head, 70);
        assert.equal(r.titleTop, 15, "the title's line is centred on the button's row, 15 under the head's top (67-6)");
        assert.equal(r.stateFromTitle, 0, "the state starts on the title's edge");
        assert.equal(r.between, 8, "space-2 between the two lines");
        assert.equal(r.under, 15, "15 under the status, as above the title (67-6)");
        assert.equal(r.glyphEnd, 0, "the copy glyph on the head's end padding line, where the title starts on the other side (0px)");
        assert.equal(r.buttonEnd, -14, "its 44px target hangs 14px into the padding");
        assert.ok(r.buttonRow && r.timeAfterState, JSON.stringify(r));
        assert.ok(r.past <= 0.01, `${r.past}px past the head's padding`);
      });
    }
  }

  test("from 480px of its own width the head is one row, as built", async () => {
    const body = `createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 700 }}><B.Terminal title="Deploy · basalt-sra" stages status="running" time={{ start: Date.now() - 6300 }} lines={[{ kind: "command", text: "basalt deploy --prod" }]} /></div>);`;
    const page = await open(body, { viewport: { width: 1024, height: 400 } });
    const tops = await page.evaluate(() => [".basalt-terminal-title", ".basalt-terminal-state", ".basalt-terminal-time"].map((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + document.querySelector(s).getBoundingClientRect().height / 2)));
    assert.ok(tops.every((t) => Math.abs(t - tops[0]) <= 1), tops.join(", "));
  });

  for (const status of ["running", "done", "failed"]) {
    test(`from 480px the head reads title, state … time, Copy: the state space-3 after the title, the time's figures space-3 before Copy, at the end of its seat (DECISIONS 326, 67-5; ${status})`, async () => {
      const end = status === "running" ? "" : ", end: Date.now() - 300";
      const body = `createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 700 }}><B.Terminal title="Deploy · basalt-sra" stages status="${status}" time={{ start: Date.now() - 6900${end} }} lines={[{ kind: "command", text: "basalt deploy --prod" }]} /></div>);`;
      const page = await open(body, { viewport: { width: 1024, height: 400 } });
      await page.evaluate(() => document.fonts.ready);
      const r = await page.evaluate(() => {
        const words = (el) => { const range = document.createRange(); range.selectNodeContents(el); return range.getBoundingClientRect(); };
        const title = words(document.querySelector(".basalt-terminal-title"));
        const state = words(document.querySelector(".basalt-terminal-state [data-on]"));
        const figure = words(document.querySelector(".basalt-terminal-time .basalt-run-timer [data-on]"));
        const seat = document.querySelector(".basalt-terminal-time").getBoundingClientRect();
        const copy = document.querySelector(".basalt-terminal-copy").getBoundingClientRect();
        return { afterTitle: state.left - title.right, beforeCopy: copy.left - seat.right, seatEnd: seat.right - figure.right, order: state.left < seat.left && seat.right <= copy.left };
      });
      assert.equal(r.afterTitle, 12, "space-3 after the title");
      assert.equal(r.beforeCopy, 12, "space-3 before Copy");
      assert.ok(Math.abs(r.seatEnd) <= 0.5, `the figures end their seat (${r.seatEnd})`);
      assert.ok(r.order, JSON.stringify(r));
    });
  }
});
