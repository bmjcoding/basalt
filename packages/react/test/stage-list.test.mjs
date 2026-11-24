// StageList and RunStage (DECISIONS 316, 1.3 and 1.4): the words drawn and said for each state, the row and its seats, the meta by the list's own
// container, the still connector beside an open detail, the detail's clocks and inert, a failure moving only the rows under it (Chromium at 1440, 390
// and 360, WebKit at 390, touch too), Retry busy and sent once, focus never dropped, right-to-left, forced colours, axe, and the art's Stage beside it.
// Built package, real stylesheet.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { webkit } from "playwright";

import { fixturePage, freezeAnimations, launch, pkg, settle } from "./support.mjs";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
let browser;
let safari;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); await safari?.close(); });

const STATES = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];
const DRAWN = { queued: "Queued", running: "Running", failed: "Failed", skipped: "Skipped", canceled: "Canceled", retrying: "Retrying" };

const ALL = (dir = "ltr") => `
const STATES = ${JSON.stringify(STATES)};
createRoot(document.getElementById("root")).render(
  <div dir="${dir}" style={{ padding: 24, maxWidth: 640 }}>
    <B.StageList label="Every state" reserveDetail={false}>
      {STATES.map((s) => <B.RunStage key={s} name={"Stage " + s} state={s} meta="fact" start={0} end={s === "success" ? 1200 : undefined} />)}
    </B.StageList>
  </div>);`;

// A deploy whose Test stage fails, opens its reason and Retry, and passes on a retry. The app owns every change; Retry's promise is the app's. The list is
// on the open page (DECISIONS 326: reserveDetail is never inside a card or panel), and holds the room for one detail unless reserve is false.
const DEPLOY = (width = 640, reserve = true) => `
function App() {
  const [test, setTest] = React.useState("running");
  const [sends, setSends] = React.useState(0);
  const resolver = React.useRef(null);
  React.useEffect(() => {
    window.fail = () => setTest("failed");
    window.retried = () => { setTest("retrying"); resolver.current?.(); };
    window.reason = (lines) => setReason(lines);
  }, []);
  const [reason, setReason] = React.useState(1);
  const retry = () => { setSends((n) => n + 1); return new Promise((resolve) => { resolver.current = resolve; }); };
  const failed = test === "failed";
  return <div style={{ padding: 24, maxWidth: ${width} }}>
    <div style={{ padding: 16 }}>
      <B.StageList label="Deploy 812 stages"${reserve ? " reserveDetail" : ""}>
        <B.RunStage name="Clone" state="success" meta="main@4f2a1c0" start={0} end={800} />
        <B.RunStage name="Install" state="success" meta="412 packages" start={0} end={1600} />
        <B.RunStage name="Test" state={test} meta="unit and e2e" start={0} end={failed ? 1400 : undefined}
          detail={failed ? <>{Array.from({ length: reason }, (_, i) => <p key={i}><strong>3 tests failed</strong> in <code>session.test.ts</code></p>)}<small>Exit 1 · attempt 1 of 2</small></> : undefined}
          action={failed ? <B.Button size="sm" variant="secondary" onClick={retry}>Retry</B.Button> : undefined} />
        <B.RunStage name="Deploy" state={failed ? "skipped" : "queued"} word={failed ? "Blocked by Test" : undefined} meta="production" />
        <B.RunStage name="Promote" state={failed ? "skipped" : "queued"} word={failed ? "Blocked by Test" : undefined} meta="basalt-sra.example" />
      </B.StageList>
    </div>
    <p id="after">After the list</p>
    <output id="sends">{sends}</output>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async (body, { b = browser, width = 1024, height = 900, ...options } = {}) => {
  const { page, errors } = await fixturePage(b, body, { theme: "dark", standards: true, viewport: { width, height }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);

describe("words and rows", () => {
  test("every state's word is drawn but passed, which is said; each row's accessible text is the name then the word, once", async () => {
    const page = await open(ALL());
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-stage")].map((li) => ({
      state: li.dataset.state,
      drawn: li.querySelector(".basalt-run-stage-word")?.textContent ?? null,
      hidden: li.querySelector(".basalt-run-stage-name .basalt-visually-hidden")?.textContent ?? null,
      markHidden: li.querySelector(".basalt-run-mark").getAttribute("aria-hidden"),
    })));
    for (const row of r) {
      if (row.state === "success") assert.deepEqual([row.drawn, row.hidden], [null, "Passed"], "passed is said and not drawn");
      else assert.deepEqual([row.drawn, row.hidden], [DRAWN[row.state], null], `${row.state} is drawn`);
      assert.equal(row.markHidden, "true");
    }
    const tree = await page.locator(".basalt-run-stages").ariaSnapshot();
    assert.match(tree, /listitem:\s*- text: Stage failed Failed fact/);
    assert.match(tree, /listitem:\s*- text: Stage success Passed fact/);
  });

  test("a row is 34px; the mark's seat, the name's line and the time's seat are one size in every state", async () => {
    const page = await open(ALL());
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-stage-line")].map((line) => {
      const b = (s) => { const x = line.querySelector(s).getBoundingClientRect(); return [x.width, x.height]; };
      return { h: line.getBoundingClientRect().height, mark: b(".basalt-run-mark"), time: b(".basalt-run-timer"), timeEnd: line.querySelector(".basalt-run-timer").getBoundingClientRect().right };
    }));
    for (const row of r) {
      assert.equal(row.h, 34);
      assert.deepEqual(row.mark, [16, 16]);
      assert.deepEqual(row.time, r[0].time);
      assert.equal(row.timeEnd, r[0].timeEnd);
    }
  });

  test("the meta hides under 480px of the list's own width, not the viewport's", async () => {
    const body = `createRoot(document.getElementById("root")).render(<div style={{ display: "grid", gap: 24, padding: 24 }}>
      <div id="narrow" style={{ width: 400 }}><B.StageList label="Narrow" reserveDetail={false}><B.RunStage name="Clone" state="success" meta="main@4f2a1c0" start={0} end={800} /></B.StageList></div>
      <div id="wide" style={{ width: 600 }}><B.StageList label="Wide" reserveDetail={false}><B.RunStage name="Clone" state="success" meta="main@4f2a1c0" start={0} end={800} /></B.StageList></div>
    </div>);`;
    const page = await open(body, { width: 1440 });
    const shown = await page.evaluate(() => ["#narrow", "#wide"].map((s) => getComputedStyle(document.querySelector(`${s} .basalt-run-stage-meta`)).display));
    assert.equal(shown[0], "none");
    assert.notEqual(shown[1], "none");
    const timeEnds = await page.evaluate(() => ["#narrow", "#wide"].map((s) => document.querySelector(`${s} .basalt-run-stage-line`).getBoundingClientRect().right - document.querySelector(`${s} .basalt-run-timer`).getBoundingClientRect().right));
    assert.deepEqual(timeEnds, [0, 0], "the time ends on the row's edge with or without the meta");
  });
});

describe("the connector", () => {
  test("one still line between every two marks, the same in every state, beside an open detail too; none after the last", async () => {
    const page = await open(DEPLOY());
    await page.evaluate(() => window.fail());
    await settle(page);
    const r = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-stages > .basalt-run-stage")].map((li) => {
      const a = getComputedStyle(li, "::after");
      const mark = li.querySelector(".basalt-run-mark").getBoundingClientRect();
      const next = li.nextElementSibling?.querySelector(".basalt-run-mark").getBoundingClientRect();
      const top = li.getBoundingClientRect().top + parseFloat(a.top);
      const bottom = li.getBoundingClientRect().bottom - parseFloat(a.bottom);
      return { content: a.content, color: a.borderInlineStartColor, width: a.borderInlineStartWidth, gapAbove: next ? top - mark.bottom : null, gapBelow: next ? next.top - bottom : null, transition: a.transitionProperty, animation: a.animationName };
    }));
    const lines = r.slice(0, -1);
    assert.equal(r.at(-1).content, "none", "no connector after the last stage");
    for (const line of lines) {
      assert.equal(line.color, lines[0].color);
      assert.equal(line.width, "1px");
      assert.equal(line.gapAbove, 4, "space-1 under the mark");
      assert.equal(line.gapBelow, 4, "space-1 above the next");
      assert.equal(line.animation, "none");
    }
    const input = await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--basalt-border-input)"; document.body.append(p); return getComputedStyle(p).color; });
    assert.equal(lines[0].color, input, "border-input");
    // The failed stage's line runs beside its open detail, unbroken.
    const failed = await page.evaluate(() => { const li = [...document.querySelectorAll(".basalt-run-stage")][2]; const d = li.querySelector(".basalt-run-stage-detail").getBoundingClientRect(); const a = getComputedStyle(li, "::after"); return { lineBottom: li.getBoundingClientRect().bottom - parseFloat(a.bottom), detailBottom: d.bottom, content: a.content }; });
    assert.notEqual(failed.content, "none");
    assert.ok(failed.lineBottom > failed.detailBottom, "the line runs past the detail to the next mark");
  });
});

describe("the detail", () => {
  test("opens over duration-slow on ease-out and closes at 0.75 on ease-in, inert while closed; code is the row's size", async () => {
    const page = await open(DEPLOY());
    const detail = () => page.evaluate(() => { const d = document.querySelectorAll(".basalt-run-stage-detail")[2]; const s = getComputedStyle(d); return { inert: d.inert, duration: s.transitionDuration, easing: s.transitionTimingFunction, h: d.getBoundingClientRect().height, opacity: Number(s.opacity), running: d.getAnimations().length }; });
    const closed = await detail();
    assert.deepEqual([closed.inert, closed.h, closed.opacity], [true, 0, 0], "closed, inert and empty until a stage has a detail");
    await page.evaluate(() => window.fail());
    const opened = await detail();
    assert.equal(opened.inert, false);
    assert.ok(opened.running > 0 && opened.opacity < 1 && opened.h < 82, `the first opening runs from closed (${JSON.stringify(opened)})`);
    assert.match(opened.duration, /^0\.2s/);
    assert.match(opened.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
    await settle(page);
    assert.equal((await detail()).h, 82, "the standard form: 18 + 16 + space-2 + 28 + space-3");
    const code = await page.evaluate(() => [getComputedStyle(document.querySelector(".basalt-run-stage-detail code")).fontSize, getComputedStyle(document.querySelector(".basalt-run-stage-detail p")).fontSize]);
    assert.equal(code[0], code[1], "code at 1em of its row, never a ratio");
    await page.evaluate(() => window.retried());
    const closing = await detail();
    assert.equal(closing.inert, true);
    assert.match(closing.duration, /^0\.15s/);
    assert.match(closing.easing, /cubic-bezier\(0\.4, 0, 1, 1\)/);
  });

  for (const [label, launcher, width, touch] of [
    ["Chromium at 1440", () => browser, 1440, false], ["Chromium at 390", () => browser, 390, false], ["Chromium at 360", () => browser, 360, false],
    ["Chromium at 390 on touch", () => browser, 390, true], ["WebKit at 390", async () => (safari ??= await webkit.launch()), 390, false],
  ]) {
    test(`a failure moves only the rows under it, and the sibling after the list 0px, through the whole run (${label})`, async () => {
      const b = await launcher();
      const page = await open(DEPLOY(width - 48), { b, width, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
      const watch = () => page.evaluate(() => ({ after: document.querySelector("#after").getBoundingClientRect().top, list: document.querySelector(".basalt-run-stages").getBoundingClientRect().height, rows: [...document.querySelectorAll(".basalt-run-stage-line")].map((l) => l.getBoundingClientRect().top) }));
      const start = await watch();
      await page.evaluate(() => window.fail());
      await settle(page);
      const failed = await watch();
      assert.equal(failed.after, start.after, "the sibling after the list did not move");
      assert.deepEqual(failed.rows.slice(0, 3), start.rows.slice(0, 3), "rows above and the failed row stay");
      assert.ok(failed.rows[3] > start.rows[3], "the rows under it make room");
      await page.evaluate(() => window.retried());
      await settle(page);
      const back = await watch();
      assert.equal(back.after, start.after);
      assert.deepEqual(back.rows, start.rows, "closing gives the room back");
    });
  }

  test("reserveDetail is off unless asked for (DECISIONS 326, 67-3): no room is held, a failure opens its detail under its stage and moves the rows under it and what follows, and closing gives it back", async () => {
    const page = await open(DEPLOY(640, false));
    const watch = () => page.evaluate(() => ({ reserve: document.querySelector(".basalt-run-stages").hasAttribute("data-reserve"), after: document.querySelector("#after").getBoundingClientRect().top, rows: [...document.querySelectorAll(".basalt-run-stage-line")].map((l) => l.getBoundingClientRect().top), list: document.querySelector(".basalt-run-stages").getBoundingClientRect().height }));
    const start = await watch();
    assert.equal(start.reserve, false, "no data-reserve by default");
    assert.equal(start.list, 5 * 34, "five 34px rows and no held room");
    await page.evaluate(() => window.fail());
    await settle(page);
    const failed = await watch();
    const grew = failed.list - start.list;
    assert.ok(grew > 0, "the detail opens");
    assert.deepEqual(failed.rows.slice(0, 3), start.rows.slice(0, 3), "rows above and the failed row stay");
    assert.equal(failed.after - start.after, grew, "what follows moves by the detail's height");
    await page.evaluate(() => window.retried());
    await settle(page);
    const back = await watch();
    assert.deepEqual([back.after, back.rows], [start.after, start.rows], "closing gives the room back");
  });

  test("a reason longer than the room grows the list by its extra line, once", async () => {
    const page = await open(DEPLOY());
    const after = () => page.evaluate(() => document.querySelector("#after").getBoundingClientRect().top);
    const start = await after();
    await page.evaluate(() => { window.reason(2); window.fail(); });
    await settle(page);
    assert.equal(await after(), start + 18, "one extra reason line: 18px, once");
  });
});

describe("Retry and focus", () => {
  test("Retry is busy until the app's promise settles, and a second press sends nothing", async () => {
    const page = await open(DEPLOY());
    await page.evaluate(() => window.fail());
    await settle(page);
    const retry = page.getByRole("button", { name: "Retry" });
    await retry.click();
    assert.equal(await retry.getAttribute("aria-busy"), "true");
    await retry.click({ force: true });
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#sends").textContent(), "1");
  });

  for (const how of ["a press", "a keyboard press", "an outside resolve"]) {
    test(`focus goes to the stage's name after ${how}, never to the body`, async () => {
      const page = await open(DEPLOY());
      await page.evaluate(() => window.fail());
      await settle(page);
      const retry = page.getByRole("button", { name: "Retry" });
      if (how === "a press") await retry.click();
      else if (how === "a keyboard press") { await retry.focus(); await page.keyboard.press("Enter"); }
      else await retry.focus();
      await page.evaluate(() => window.retried());
      await settle(page);
      const focused = await page.evaluate(() => ({ tag: document.activeElement.tagName, cls: document.activeElement.className, text: document.activeElement.textContent }));
      assert.equal(focused.cls, "basalt-run-stage-name");
      assert.match(focused.text, /^Test/);
    });
  }

  test("the name shows the control ring at +2 when focused from the keyboard", async () => {
    const page = await open(DEPLOY());
    await page.evaluate(() => window.fail());
    await settle(page);
    await page.getByRole("button", { name: "Retry" }).focus();
    await page.keyboard.press("Enter");
    await page.evaluate(() => window.retried());
    await settle(page);
    const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.outlineWidth, s.outlineOffset]; });
    assert.deepEqual(ring, ["solid", "2px", "2px"]);
  });
});

describe("modes and the page", () => {
  test("right-to-left: the mark leads on the right and the time ends on the left edge", async () => {
    const page = await open(ALL("rtl"));
    const r = await page.evaluate(() => { const line = document.querySelector(".basalt-run-stage-line").getBoundingClientRect(); return { mark: document.querySelector(".basalt-run-mark").getBoundingClientRect().right - line.right, time: document.querySelector(".basalt-run-timer").getBoundingClientRect().left - line.left }; });
    assert.deepEqual(r, { mark: 0, time: 0 });
  });

  test("forced colours: the connector is a real border, the marks follow their row, and the failed word keeps its words", async () => {
    const page = await open(DEPLOY(), { forcedColors: "active" });
    await page.evaluate(() => window.fail());
    await settle(page);
    const r = await page.evaluate(() => { const li = document.querySelector(".basalt-run-stage"); const a = getComputedStyle(li, "::after"); return { style: a.borderInlineStartStyle, width: a.borderInlineStartWidth, word: document.querySelectorAll(".basalt-run-stage-word")[0].textContent }; });
    assert.deepEqual(r, { style: "solid", width: "1px", word: "Failed" });
  });

  for (const theme of ["light", "dark"]) {
    test(`axe: no WCAG 2.2 AA violations, mid-failure (${theme})`, async () => {
      const page = await open(DEPLOY(), { theme });
      await page.evaluate(() => window.fail());
      await settle(page);
      await page.evaluate(() => { document.title = "Basalt"; document.documentElement.lang = "en"; });
      await page.addScriptTag({ content: axeSource });
      const v = await page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).join(" | ")}`));
      assert.deepEqual(v, []);
    });
  }

  test("the two stages on one page: an art Stage holding a StageList keeps its box, the rows keep their own margin, padding and ground, and a StageList alone never clears the header", async () => {
    const body = `createRoot(document.getElementById("root")).render(<div>
      <B.Stage art={<svg viewBox="0 0 10 10"><rect width="10" height="10" /></svg>} id="art"><div id="inside"><B.StageList label="Inside the art" reserveDetail={false}><B.RunStage name="Build" state="success" start={0} end={900} /></B.StageList></div></B.Stage>
      <B.Stage art={<svg viewBox="0 0 10 10"><rect width="10" height="10" /></svg>} id="bare" />
      <div id="alone"><B.StageList label="Alone" reserveDetail={false}><B.RunStage name="Build" state="success" start={0} end={900} /></B.StageList></div>
    </div>);`;
    const page = await open(body, { width: 1024 });
    const r = await page.evaluate(() => {
      const li = document.querySelector("#inside .basalt-run-stage");
      const s = getComputedStyle(li);
      const alone = getComputedStyle(document.querySelector("#alone .basalt-run-stage"));
      return {
        same: ["marginTop", "marginBottom", "paddingTop", "paddingBottom", "backgroundColor"].every((k) => s[k] === alone[k]),
        rowGround: s.backgroundColor,
        aloneMarginTop: getComputedStyle(document.querySelector("#alone .basalt-run-stages-box")).marginTop,
        aloneHeadroom: !!document.querySelector("#alone [data-headroom], #alone .basalt-stage, #alone [data-basalt-headroom]"),
        artPadding: [getComputedStyle(document.querySelector("#art")).paddingTop, getComputedStyle(document.querySelector("#bare")).paddingTop],
      };
    });
    assert.ok(r.same, "a row's margin, padding and ground are its own inside the art");
    assert.equal(r.rowGround, "rgba(0, 0, 0, 0)");
    assert.equal(r.aloneMarginTop, "0px", "no pull-up");
    assert.equal(r.aloneHeadroom, false, "no headroom");
    assert.equal(r.artPadding[0], r.artPadding[1], "the art's box is unchanged by what it holds");
  });

  test("no class in the run rules begins basalt-stage, and a child that is not a RunStage warns (development)", async () => {
    const css = fs.readFileSync(path.join(pkg, "src", "styles", "components.css"), "utf8");
    const block = css.slice(css.indexOf("/* ---- Stages and runs (DECISIONS 316)"), css.indexOf("/* A prose page's column"));
    assert.ok(block.length > 1000);
    assert.deepEqual([...block.matchAll(/\.basalt-stage[\w-]*/g)].map((m) => m[0]), []);
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { StageList } = await import(path.join(pkg, "dist", "stage-list.js"));
    const { RunStage } = await import(path.join(pkg, "dist", "run-stage.js"));
    const warn = console.warn;
    const said = [];
    console.warn = (m) => said.push(String(m));
    try {
      renderToString(React.createElement(StageList, { label: "Fine" }, React.createElement(RunStage, { name: "A", state: "queued" })));
      renderToString(React.createElement(StageList, { label: "Not fine" }, React.createElement("li", null, "A")));
    } finally { console.warn = warn; }
    assert.equal(said.length, 1);
    assert.match(said[0], /^Basalt StageList: a child is not a RunStage/);
  });
});

test("an action removed as JSX leaves it (false or null) sends focus to the stage's name and leaves nothing open (Astra 5)", async () => {
  for (const gone of ["false", "null"]) {
    const body = `function App() { const [on, setOn] = React.useState(true); React.useEffect(() => { window.off = () => setOn(false); }, []);
      return <div style={{ padding: 24, width: 640 }}><B.StageList label="Stages"><B.RunStage name="Test" state="failed" detail={on ? <p>3 tests failed</p> : ${gone}} action={on && <B.Button size="sm">Retry</B.Button>} /></B.StageList></div>; }
      createRoot(document.getElementById("root")).render(<App />);`;
    const page = await open(body);
    await page.getByRole("button", { name: "Retry" }).focus();
    await page.evaluate(() => window.off());
    await settle(page);
    const r = await page.evaluate(() => { const d = document.querySelector(".basalt-run-stage-detail"); return { focused: document.activeElement.className, inert: d.inert, h: d.getBoundingClientRect().height }; });
    assert.deepEqual(r, { focused: "basalt-run-stage-name", inert: true, h: 0 }, gone);
  }
});
