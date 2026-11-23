// StageRail (DECISIONS 316, 1.5): the status seat's word or time for each state in one width; the link's fill, its clock and its logical origin,
// empty again on a retry and after a failure; each node's state with the fill taken away; no bead; five and six stages as the list under 480px of
// the rail's own width and as a rail above; the hour scale refused; 0px through a whole run. Chromium, built package, real stylesheet.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";

import { fixturePage, freezeAnimations, launch, pkg, settle } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const RUN = (width, dir = "ltr") => `
const NAMES = ["Build", "Checks", "Deploy", "Promote"];
function App() {
  const [states, setStates] = React.useState(["queued", "queued", "queued", "queued"]);
  const [t0] = React.useState(() => Date.now() - 500);
  React.useEffect(() => { window.set = (i, s) => setStates((all) => all.map((x, j) => (j === i ? s : x))); }, []);
  return <div dir="${dir}" style={{ padding: 24, width: ${width} }}>
    <B.StageRail label="Release v2.14.0 stages">
      {NAMES.map((n, i) => <B.RunStage key={n} name={n} state={states[i]} word={states[i] === "retrying" ? "Retrying" : undefined} start={states[i] === "queued" ? undefined : t0} end={states[i] === "running" || states[i] === "retrying" ? undefined : t0 + 2100} />)}
    </B.StageRail>
    <p id="after">After the rail</p>
  </div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async (body, { width = 1024, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme: "dark", standards: true, viewport: { width, height: 700 }, ...options });
  await settle(page);
  page.errors = errors;
  return page;
};
const seats = (page) => page.evaluate(() => [...document.querySelectorAll(".basalt-run-stage")].map((li) => {
  const seat = li.querySelector(".basalt-run-stage-status");
  const shown = seat.querySelector(":scope > .basalt-reserve > [data-on]");
  return { state: li.dataset.state, shown: (shown.querySelector("[data-on]") ?? shown).textContent, word: !!shown.querySelector(".basalt-run-stage-word") || shown.classList.contains("basalt-run-stage-word"), w: seat.getBoundingClientRect().width, h: seat.getBoundingClientRect().height, color: getComputedStyle(shown.firstElementChild ?? shown).color, weight: getComputedStyle(shown.firstElementChild ?? shown).fontWeight, said: li.querySelector(".basalt-run-stage-name").textContent };
}));

describe("the status seat", () => {
  test("a running or passed node's time, a failed, skipped, canceled or retrying node's word, in one seat that never changes size", async () => {
    const page = await open(RUN(800));
    const before = await seats(page);
    for (const [i, s] of [[0, "success"], [1, "failed"], [2, "skipped"], [3, "canceled"]]) await page.evaluate(([i, s]) => window.set(i, s), [i, s]);
    await settle(page);
    let r = await seats(page);
    assert.deepEqual(r.map((x) => [x.state, x.shown, x.word]), [["success", "2.1 s", false], ["failed", "Failed", true], ["skipped", "Skipped", true], ["canceled", "Canceled", true]]);
    for (let i = 0; i < 4; i += 1) assert.deepEqual([r[i].w, r[i].h], [before[i].w, before[i].h], `node ${i}'s seat holds`);
    assert.equal(r[1].weight, "500");
    for (const [i, s] of [[1, "retrying"], [2, "running"], [3, "queued"]]) await page.evaluate(([i, s]) => window.set(i, s), [i, s]);
    await settle(page);
    r = await seats(page);
    assert.equal(r[1].shown, "Retrying");
    assert.match(r[2].shown, /^\d+\.\d s$/);
    assert.equal(r[3].shown, " ", "a queued node holds its seat empty");
    assert.deepEqual(r.map((x) => x.said), ["Build Passed", "Checks", "Deploy Running", "Promote Queued"], "queued, running and passed are said after the name; a drawn word is not said twice");
  });
});

describe("the link", () => {
  test("fills from the inline start over duration-slower on ease-out when its stage passes; empty again at once on a retry; a failed stage's stays empty", async () => {
    const page = await open(RUN(800));
    const fill = (i) => page.evaluate((i) => { const f = document.querySelectorAll(".basalt-run-stage-fill")[i]; const s = getComputedStyle(f); return { transform: s.transform, origin: s.transformOrigin, duration: s.transitionDuration, easing: s.transitionTimingFunction }; }, i);
    await page.evaluate(() => window.set(0, "success"));
    const filling = await fill(0);
    assert.equal(filling.duration, "0.3s");
    assert.match(filling.easing, /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
    assert.match(filling.origin, /^0px /, "from the start edge (left, in left-to-right)");
    await settle(page);
    assert.equal((await fill(0)).transform, "matrix(1, 0, 0, 1, 0, 0)");
    await page.evaluate(() => window.set(0, "retrying"));
    const emptied = await fill(0);
    assert.equal(emptied.duration, "0s", "empties at once");
    assert.match(emptied.transform, /^matrix\(0, /);
    await page.evaluate(() => window.set(1, "failed"));
    await settle(page);
    assert.match((await fill(1)).transform, /^matrix\(0, /, "a failed stage's link stays empty");
  });

  test("right-to-left: the fill grows from the right", async () => {
    const page = await open(RUN(800, "rtl"));
    const origin = await page.evaluate(() => getComputedStyle(document.querySelector(".basalt-run-stage-fill")).transformOrigin);
    const width = await page.evaluate(() => document.querySelector(".basalt-run-stage-fill").offsetWidth);
    assert.equal(origin.split(" ")[0], `${width}px`);
  });

  test("each node's state is in the accessibility tree and drawn with the fill taken away: the fill is never the only sign", async () => {
    const page = await open(RUN(800));
    await page.evaluate(() => { window.set(0, "success"); window.set(1, "failed"); });
    await settle(page);
    await page.addStyleTag({ content: ".basalt-run-stage-fill { display: none !important; }" });
    const tree = await page.locator(".basalt-run-rail").ariaSnapshot();
    for (const words of ["Build Passed", "Checks Failed", "Deploy Queued", "Promote Queued"]) assert.ok(tree.replace(/\s+/g, " ").includes(words), `${words}: ${tree}`);
    const marks = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-mark")].map((m) => m.dataset.state));
    assert.deepEqual(marks, ["success", "failed", "queued", "queued"]);
  });

  test("no bead: the running ring is the rail's only moving thing", async () => {
    const page = await open(RUN(800));
    await page.evaluate(() => window.set(1, "running"));
    await settle(page);
    const moving = await page.evaluate(() => document.querySelector(".basalt-run-rail").getAnimations({ subtree: true }).filter((a) => a.effect.getComputedTiming().iterations === Infinity).map((a) => a.effect.target.closest(".basalt-spinner") ? "ring" : a.animationName));
    // The queued marks breathe (their own loop, not the rail's motion); the running ring is the only mark of motion along the rail.
    assert.deepEqual([...new Set(moving)].sort(), ["basalt-run-breath", "ring"]);
    assert.equal(await page.locator("[class*=bead]").count(), 0);
  });
});

describe("five and six stages", () => {
  const SIX = (n, width) => `createRoot(document.getElementById("root")).render(<div style={{ padding: 0, width: ${width} }}>
    <B.StageRail label="Many">{["Clone", "Install", "Build", "Test", "Deploy", "Promote"].slice(0, ${n}).map((s, i) => <B.RunStage key={s} name={s} state={i === 0 ? "success" : "queued"} start={0} end={900} />)}</B.StageRail></div>);`;
  for (const n of [5, 6]) {
    test(`${n} stages: the list under 480px of the rail's own width, a rail from it`, async () => {
      const narrow = await open(SIX(n, 470), { width: 1440 });
      const nr = await narrow.evaluate(() => { const li = [...document.querySelectorAll(".basalt-run-stage")]; return { tops: li.map((x) => x.getBoundingClientRect().top), link: getComputedStyle(document.querySelector(".basalt-run-stage-link")).display, after: getComputedStyle(li[0], "::after").content }; });
      assert.ok(nr.tops.every((t, i) => i === 0 || t > nr.tops[i - 1]), "rows, top to bottom");
      assert.equal(nr.link, "none");
      assert.notEqual(nr.after, "none", "with the list's connector");
      const wide = await open(SIX(n, 480), { width: 390 });
      const wr = await wide.evaluate(() => [...document.querySelectorAll(".basalt-run-stage")].map((x) => x.getBoundingClientRect().top));
      assert.ok(wr.every((t) => t === wr[0]), "one line from 480 of its own width, whatever the viewport");
    });
  }

  test("two to four stages are a rail at any width from 320", async () => {
    const page = await open(RUN(320), { width: 360 });
    const tops = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-stage")].map((x) => x.getBoundingClientRect().top));
    assert.ok(tops.every((t) => t === tops[0]));
  });
});

test("the hour scale is refused: it warns and the seats hold minutes (development)", async () => {
  const React = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { StageRail } = await import(path.join(pkg, "dist", "stage-rail.js"));
  const { RunStage } = await import(path.join(pkg, "dist", "run-stage.js"));
  const warn = console.warn;
  const said = [];
  console.warn = (m) => said.push(String(m));
  let html;
  try {
    html = renderToString(React.createElement(StageRail, { label: "Long", timeScale: "hours" }, React.createElement(RunStage, { name: "A", state: "success", start: 0, end: 9e6 }), React.createElement(RunStage, { name: "B", state: "queued" })));
  } finally { console.warn = warn; }
  assert.ok(said.some((m) => /a rail takes "seconds" or "minutes"/.test(m)));
  assert.ok(html.includes("00 min 00 s") && !html.includes("00 hr 00 min"), "the seat is the minutes form");
});

test("0px through a whole run: the rail's nodes, seats and the sibling after it never move", async () => {
  const page = await open(RUN(800));
  const watch = () => page.evaluate(() => ({ after: document.querySelector("#after").getBoundingClientRect().top, nodes: [...document.querySelectorAll(".basalt-run-stage :is(.basalt-run-mark, .basalt-run-stage-name, .basalt-run-stage-status)")].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }) }));
  const start = await watch();
  const clock = await freezeAnimations(page);
  for (const [i, s] of [[0, "running"], [0, "success"], [1, "running"], [1, "failed"], [1, "retrying"], [1, "success"], [2, "running"], [2, "success"], [3, "running"], [3, "success"]]) {
    await page.evaluate(([i, s]) => window.set(i, s), [i, s]);
    for (let t = 0; t <= 300; t += 50) {
      await clock.advance(50);
      const now = await watch();
      assert.equal(now.after, start.after, `the sibling, ${s} at ${i}, ${t}ms`);
      now.nodes.forEach((n, k) => assert.deepEqual(n, start.nodes[k], `box ${k}, ${s} at ${i}, ${t}ms`));
    }
  }
  await clock.thaw();
});

test("Progress's value takes tabular figures and the room of \"100%\", end-aligned: 0%, 25% and 100% stand in one box", async () => {
  const body = `function App() { const [v, setV] = React.useState(0); React.useEffect(() => { window.v = setV; }, []); return <div style={{ padding: 24, width: 400 }}><B.Progress label="Checks running" value={v} max={4} /></div>; }
  createRoot(document.getElementById("root")).render(<App />);`;
  const page = await open(body);
  const read = () => page.evaluate(() => { const el = document.querySelector(".basalt-progress-value"); const b = el.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(el); return { box: [b.x, b.width], end: range.getBoundingClientRect().right, label: document.querySelector(".basalt-progress-label").getBoundingClientRect().width, nums: getComputedStyle(el).fontVariantNumeric }; });
  const zero = await read();
  for (const v of [1, 4]) {
    await page.evaluate((v) => window.v(v), v);
    await settle(page);
    const now = await read();
    assert.deepEqual(now.box, zero.box, `${v}: the value's box`);
    assert.ok(Math.abs(now.end - zero.end) < 0.5, "end-aligned");
  }
  assert.equal(zero.nums, "tabular-nums");
  const tree = await page.locator(".basalt-progress").ariaSnapshot();
  assert.ok(!tree.includes("100%"), "the room is unseen and unsaid");
});
