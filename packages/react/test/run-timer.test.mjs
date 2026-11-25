// RunTimer and formatRunTime (DECISIONS 316, 1.9): the forms and their boundaries, one shared interval, the seat by scale, frozen at the end, carried
// across a retry, the hold both ways and `since`. Driven in Chromium on Playwright's fake clock, against the built package with the real stylesheet.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg } from "./support.mjs";

const { formatRunTime } = await import(pathToFileURL(path.join(pkg, "dist", "run-format.js")).href);

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("formatRunTime", () => {
  test("every boundary, with its ISO duration", () => {
    const cases = [
      [0, "0.0 s", "PT0.0S"],
      [12_345, "12.3 s", "PT12.3S"],
      [59_900, "59.9 s", "PT59.9S"],
      [59_999, "59.9 s", "PT59.9S"],
      [60_000, "1 min 0 s", "PT1M0S"],
      [754_000, "12 min 34 s", "PT12M34S"],
      [3_599_000, "59 min 59 s", "PT59M59S"],
      [3_600_000, "1 hr 0 min", "PT1H0M"],
      [45_240_000, "12 hr 34 min", "PT12H34M"],
      [86_399_000, "23 hr 59 min", "PT23H59M"],
      [86_400_000, "1 day", "P1D"],
      [3 * 86_400_000 + 5_000, "3 days", "P3D"],
    ];
    for (const [ms, text, dateTime] of cases) assert.deepEqual(formatRunTime(ms), { text, dateTime }, `${ms}ms`);
    assert.deepEqual(formatRunTime(-5), { text: "0.0 s", dateTime: "PT0.0S" }, "never negative");
    assert.deepEqual(formatRunTime(Number.NaN), { text: "0.0 s", dateTime: "PT0.0S" });
  });

  // cimip-gaps-3 T1: the minute grain, a running timer's under reduced motion. Node only.
  test("both grains at 0, 59.9 s, 60 s, 59 min 59 s, 60 min and 24 h: text, dateTime and spoken", () => {
    const cases = [
      [0, { text: "0.0 s", dateTime: "PT0.0S" }, { text: "<1 min", dateTime: "PT0M", spoken: "less than 1 minute" }],
      [59_900, { text: "59.9 s", dateTime: "PT59.9S" }, { text: "<1 min", dateTime: "PT0M", spoken: "less than 1 minute" }],
      [60_000, { text: "1 min 0 s", dateTime: "PT1M0S" }, { text: "1 min", dateTime: "PT1M" }],
      [3_599_000, { text: "59 min 59 s", dateTime: "PT59M59S" }, { text: "59 min", dateTime: "PT59M" }],
      [3_600_000, { text: "1 hr 0 min", dateTime: "PT1H0M" }, { text: "1 hr 0 min", dateTime: "PT1H0M" }],
      [86_400_000, { text: "1 day", dateTime: "P1D" }, { text: "1 day", dateTime: "P1D" }],
    ];
    for (const [ms, exact, minute] of cases) {
      assert.deepEqual(formatRunTime(ms), exact, `${ms}ms, the default grain`);
      assert.deepEqual(formatRunTime(ms, "exact"), exact, `${ms}ms, exact`);
      assert.deepEqual(formatRunTime(ms, "minute"), minute, `${ms}ms, minute`);
    }
    assert.deepEqual(formatRunTime(4 * 60_000 + 59_999, "minute"), { text: "4 min", dateTime: "PT4M" }, "floored, never rounded up");
    assert.deepEqual(formatRunTime(-5, "minute"), { text: "<1 min", dateTime: "PT0M", spoken: "less than 1 minute" }, "never negative");
  });
});

// The page counts intervals: a patched setInterval and clearInterval, before anything renders.
const COUNT = `
window.__intervals = { made: 0, cleared: 0, live: new Set() };
const made = window.setInterval.bind(window), cleared = window.clearInterval.bind(window);
window.setInterval = (fn, ms, ...a) => { const id = made(fn, ms, ...a); window.__intervals.made += 1; window.__intervals.live.add(id); return id; };
window.clearInterval = (id) => { if (window.__intervals.live.delete(id)) window.__intervals.cleared += 1; return cleared(id); };
window.__atImport = window.__intervals.made;
`;
const RUN = (jsx) => `${COUNT}
function App() {
  const [props, setProps] = React.useState({});
  const [shown, setShown] = React.useState(true);
  React.useEffect(() => { window.setProps = (p) => setProps((was) => ({ ...was, ...p })); window.setShown = setShown; }, []);
  return <div style={{ padding: 24, display: "grid", gap: 8, justifyItems: "start", fontSize: 13 }}>{shown ? ${jsx} : null}</div>;
}
createRoot(document.getElementById("root")).render(<App />);`;

const open = async (body, options = {}) => {
  const { page, errors } = await fixturePage(browser, body, { clock: true, viewport: { width: 800, height: 600 }, theme: "dark", ...options });
  page.errors = errors;
  await page.clock.runFor(50);
  return page;
};
// Locale clocks put a narrow no-break space before AM and PM; compare the words, whatever space stands between them.
const plain = (t) => t.replace(/[\u202f\u00a0 ]+/g, " ");
const text = (page, sel) => page.evaluate((s) => document.querySelector(`${s} [data-on]`).textContent, sel);
const width = (page, sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().width, sel);
const hold = (page, on) => page.evaluate((h) => { if (h) document.documentElement.setAttribute("data-loops", "held"); else document.documentElement.removeAttribute("data-loops"); }, on);

describe("the tick", () => {
  test("nothing at import; one shared interval for every timer, its scale's own steps, cleared with the last reader", async () => {
    // Three running timers, started at the fake clock's now (10 s).
    const page = await open(RUN(`<>
      <span id="a"><B.RunTimer start={10_000} /></span>
      <span id="b"><B.RunTimer start={10_000 - 59_000} scale="minutes" /></span>
      <span id="c"><B.RunTimer start={10_000 - 3_599_000} scale="hours" /></span>
    </>`));
    assert.equal(await page.evaluate(() => window.__atImport), 0, "nothing runs at import");
    assert.equal(await page.evaluate(() => window.__intervals.live.size), 1, "one interval for three timers");
    const t0 = [await text(page, "#a"), await text(page, "#b"), await text(page, "#c")];
    await page.clock.runFor(100);
    const t1 = [await text(page, "#a"), await text(page, "#b"), await text(page, "#c")];
    assert.notEqual(t1[0], t0[0], `under a minute it changes every 100ms (${t0[0]} to ${t1[0]})`);
    await page.clock.runFor(1000);
    assert.equal(await text(page, "#b"), "1 min 0 s", "a minute to an hour: by the second");
    assert.match(await text(page, "#c"), /^59 min 59 s$|^1 hr 0 min$/);
    await page.clock.runFor(1000);
    assert.equal(await text(page, "#c"), "1 hr 0 min", "an hour to a day: by the minute");
    await page.clock.runFor(30_000);
    assert.equal(await text(page, "#c"), "1 hr 0 min");
    await page.evaluate(() => window.setShown(false));
    await page.clock.runFor(200);
    assert.deepEqual(await page.evaluate(() => [window.__intervals.live.size, window.__intervals.made, window.__intervals.cleared]), [0, 1, 1], "cleared with its last reader");
  });

  test("frozen at end, with carried added; a hold set after mount stops the tick, and release writes the current figure", async () => {
    const page = await open(RUN(`<><span id="done"><B.RunTimer start={1_000} end={4_200} carried={1_500} /></span><span id="run"><B.RunTimer start={10_000} whenHeld="hidden" /></span></>`));
    assert.equal(await text(page, "#done"), "4.7 s");
    await page.clock.runFor(2_000);
    assert.equal(await text(page, "#done"), "4.7 s", "frozen");
    await hold(page, true);
    await page.clock.runFor(50);
    const held = await text(page, "#run");
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#run time")).visibility), "hidden", "hidden, its box kept");
    assert.equal(await page.evaluate(() => window.__intervals.live.size), 0, "nothing ticks while held");
    await page.clock.runFor(3_000);
    assert.equal(await text(page, "#run"), held);
    await hold(page, false);
    await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#run time")).visibility), "visible");
    assert.equal(await text(page, "#run"), "5.1 s", "the current figure, written on release");
  });
});

describe("the seat", () => {
  for (const scale of ["seconds", "minutes", "hours"]) {
    test(`one width for a running, a finished and an empty timer at "${scale}" (0px), end-aligned, never empty`, async () => {
      const page = await open(RUN(`<>
        <span id="empty"><B.RunTimer scale="${scale}" whenHeld="hidden" /></span>
        <span id="short"><B.RunTimer scale="${scale}" start={0} end={1_000} whenHeld="hidden" /></span>
        <span id="run"><B.RunTimer scale="${scale}" start={10_000} whenHeld="hidden" /></span>
        <span id="long"><B.RunTimer scale="${scale}" start={0} end={${scale === "seconds" ? 59_900 : scale === "minutes" ? 3_599_000 : 86_340_000}} whenHeld="hidden" /></span>
      </>`));
      const widths = await Promise.all(["#empty time", "#short time", "#run time", "#long time"].map((s) => width(page, s)));
      assert.ok(widths.every((w) => w === widths[0]), `${scale}: ${widths.join(", ")}`);
      const heights = await page.evaluate(() => ["#empty", "#short"].map((s) => document.querySelector(`${s} time`).getBoundingClientRect().height));
      assert.equal(heights[0], heights[1], "an empty timer is a line as tall as one with a time");
      assert.equal(await text(page, "#empty"), "\u00a0", "a no-break space holds the line");
      const ends = await page.evaluate(() => ["#short", "#long"].map((s) => { const r = document.createRange(); r.selectNodeContents(document.querySelector(`${s} [data-on]`)); return r.getBoundingClientRect().right; }));
      assert.ok(Math.abs(ends[0] - ends[1]) < 0.5, "end-aligned");
    });
  }

  test("the held forms are reserved from the first frame: pressing the hold moves nothing, and the head says when the work started", async () => {
    // 10 s on the fake clock is 00:00:10 UTC on Jan 1 1970; the browser's zone is whatever the runner's is, so the expected words come from the page.
    const page = await open(RUN(`<span id="head" style={{ display: "inline-flex" }}><B.RunTimer start={4_000} /><i id="after">|</i></span>`));
    const at = await page.evaluate(() => document.querySelector("#after").getBoundingClientRect().left);
    await hold(page, true);
    await page.clock.runFor(50);
    const words = await page.evaluate(() => new Date(4_000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    assert.equal(plain(await text(page, "#head")), plain(`Started ${words}`));
    assert.equal(await page.evaluate(() => document.querySelector("#after").getBoundingClientRect().left), at, "0px");
    assert.match(await page.evaluate(() => document.querySelector("#head time").getAttribute("datetime")), /^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
  });
});

describe("since", () => {
  test("after a failure, a wait and a retry, the held form and its datetime show the first start, never the retry's, with the date for another day", async () => {
    // The work first started a day and an hour ago; the first attempt took 6.3 s and failed; the retry started 2 s ago.
    const page = await open(RUN(`<span id="head"><B.RunTimer {...props} /></span>`));
    await page.evaluate(() => window.setProps({ start: 10_000 - 90_000_000, end: 10_000 - 90_000_000 + 6_300 }));
    await page.clock.runFor(50);
    assert.equal(await text(page, "#head"), "6.3 s", "frozen while failed");
    await page.clock.runFor(5_000);
    assert.equal(await text(page, "#head"), "6.3 s", "still frozen through the wait");
    const now = await page.evaluate(() => Date.now());
    await page.evaluate(({ now }) => window.setProps({ start: now - 2_000, end: undefined, carried: 6_300, since: 10_000 - 90_000_000 }), { now });
    await page.clock.runFor(50);
    assert.equal(await text(page, "#head"), "8.3 s", "a retry counts on from the frozen figure, not over the wait");
    await hold(page, true);
    await page.clock.runFor(50);
    const expected = await page.evaluate(() => {
      const t = new Date(10_000 - 90_000_000);
      return `Started ${t.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    });
    assert.equal(plain(await text(page, "#head")), plain(expected));
    const iso = await page.evaluate(() => document.querySelector("#head time").getAttribute("datetime"));
    const first = await page.evaluate(() => { const t = new Date(10_000 - 90_000_000); const p = (n) => String(n).padStart(2, "0"); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`; });
    assert.equal(iso, first, "the datetime is the first start");
  });

  test("a warning when carried comes without since (development: the dist module under Node, where NODE_ENV is not production)", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { RunTimer } = await import(pathToFileURL(path.join(pkg, "dist", "run-timer.js")).href);
    const warn = console.warn;
    const said = [];
    console.warn = (m) => said.push(String(m));
    try {
      renderToString(React.createElement(RunTimer, { start: 0, end: 1_000, carried: 2_000 }));
      renderToString(React.createElement(RunTimer, { start: 0, end: 1_000, carried: 2_000, since: 0 }));
    } finally { console.warn = warn; }
    assert.equal(said.length, 1);
    assert.match(said[0], /^Basalt RunTimer: `carried` is given without `since`/);
  });
});

test("never a live region, and a time element with an ISO duration", async () => {
  const page = await open(RUN(`<span id="t"><B.RunTimer start={0} end={12_300} /></span>`));
  const r = await page.evaluate(() => { const t = document.querySelector("#t time"); return { tag: t.tagName, iso: t.getAttribute("datetime"), live: !!t.closest("[aria-live],[role=status],[role=log]") }; });
  assert.deepEqual(r, { tag: "TIME", iso: "PT12.3S", live: false });
});

test("a head's seat holds today's held form and not the dated one; a run started on another day widens it once when the hold is pressed (ruling 6)", async () => {
  const page = await open(RUN(`<span id="head" style={{ display: "inline-flex" }}><B.RunTimer {...props} /><i id="after">|</i></span>`));
  await page.evaluate(() => window.setProps({ start: 10_000 - 1_000, since: 10_000 - 400 * 86_400_000, carried: 0 }));
  await page.clock.runFor(50);
  const rest = await width(page, "#head time");
  const sample = await page.evaluate(() => { const s = document.createElement("span"); s.style.cssText = "font: 400 12px/16px var(--basalt-font-family-mono); white-space: nowrap"; s.textContent = "Started Dec 30, 12:59 PM"; document.body.append(s); return s.getBoundingClientRect().width; });
  assert.ok(rest < sample - 20, `the seat at rest (${rest}) is narrower than the dated form (${sample})`);
  await hold(page, true);
  await page.clock.runFor(50);
  assert.match(plain(await text(page, "#head")), /^Started [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d\d [AP]M$/, "a start in another year says its year");
});

// ---- cimip-gaps-3 E1: the spoken form beside `format`; whole seconds are a minutes-scale rail's alone (gaps3-e1.test.mjs)
describe("tenths stay outside a minutes-scale rail", () => {
  test("a standalone timer at the minutes scale, and a list whose scale grew, keep their tenths and their dateTime's", async () => {
    const page = await open(RUN(`<>
      <span id="alone"><B.RunTimer start={10_000 - 4_500} scale="minutes" /></span>
      <B.StageList label="Grown"><B.RunStage name="Short" state="success" start={0} end={1_500} /><B.RunStage name="Long" state="success" start={0} end={754_000} /></B.StageList>
    </>`));
    assert.equal(await text(page, "#alone"), "4.5 s");
    await page.clock.runFor(100);
    assert.equal(await text(page, "#alone"), "4.6 s", "by the tenth");
    const short = await page.evaluate(() => { const t = document.querySelector(".basalt-run-stage time"); return [t.querySelector("[data-on]").textContent, t.getAttribute("datetime")]; });
    assert.deepEqual(short, ["1.5 s", "PT1.5S"], "a sibling of a time that grew the list's scale is unchanged");
  });
});

const CIMIP_LIKE = `
const short = (ms) => { const s = Math.floor(ms / 1000); return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s"; };
const long = (ms) => { const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60; const u = (n, w) => n + " " + w + (n === 1 ? "" : "s"); return m ? u(m, "minute") + " " + u(r, "second") : u(r, "second"); };
`;

describe("spoken", () => {
  test("184,000 ms with a short format and a spoken one: draws \"3m 4s\", says \"3 minutes 4 seconds\" once, never live, the ISO duration kept", async () => {
    const page = await open(`${CIMIP_LIKE}${RUN(`<span id="t"><B.RunTimer start={0} end={184_000} scale="minutes" format={short} spoken={long} /></span>`)}`);
    assert.equal(await text(page, "#t"), "3m 4s");
    const r = await page.evaluate(() => {
      const t = document.querySelector("#t time");
      return { iso: t.getAttribute("datetime"), hidden: t.querySelector(".basalt-reserve").getAttribute("aria-hidden"), live: t.querySelectorAll("[aria-live],[role=status],[role=log]").length + (t.closest("[aria-live],[role=status],[role=log]") ? 1 : 0) };
    });
    assert.deepEqual(r, { iso: "PT3M4S", hidden: "true", live: 0 });
    const tree = await page.locator("#t").ariaSnapshot();
    assert.equal((tree.match(/3 minutes 4 seconds/g) ?? []).length, 1, tree);
    assert.doesNotMatch(tree, /3m 4s/, "the drawn form is not read beside it");
  });

  test("a second passes: the drawn figure holds, the spoken words follow, and nothing is announced", async () => {
    const page = await open(`${CIMIP_LIKE}
const minutes = (ms) => Math.floor(ms / 60_000) + "m";
${RUN(`<span id="t"><B.RunTimer start={10_000 - 184_000} scale="minutes" format={minutes} spoken={long} /></span>`)}`);
    const read = () => page.evaluate(() => { const t = document.querySelector("#t time"); return [t.querySelector("[data-on]").textContent, t.querySelector(":scope > .basalt-visually-hidden").textContent]; });
    assert.deepEqual(await read(), ["3m", "3 minutes 4 seconds"]);
    await page.clock.runFor(1_000);
    assert.deepEqual(await read(), ["3m", "3 minutes 5 seconds"], "the spoken words never go stale while the drawn figure holds");
    const live = await page.evaluate(() => { const t = document.querySelector("#t time"); return t.querySelectorAll("[aria-live],[role=status],[role=log],[role=alert]").length + (t.closest("[aria-live],[role=status],[role=log],[role=alert]") ? 1 : 0); });
    assert.equal(live, 0, "never a live region");
    assert.equal(((await page.locator("#t").ariaSnapshot()).match(/3 minutes 5 seconds/g) ?? []).length, 1);
  });

  test("the seat follows the drawn formatter, never the spoken one", async () => {
    const page = await open(`${CIMIP_LIKE}${RUN(`<>
      <span id="a"><B.RunTimer start={0} end={184_000} scale="minutes" format={short} /></span>
      <span id="b"><B.RunTimer start={0} end={184_000} scale="minutes" format={short} spoken={long} /></span>
    </>`)}`);
    assert.equal(await width(page, "#a time"), await width(page, "#b time"));
  });

  test("left out, today's timer: the drawn figure is what is read, and nothing is hidden", async () => {
    const page = await open(RUN(`<span id="t"><B.RunTimer start={0} end={184_000} /></span>`));
    assert.equal(await page.evaluate(() => document.querySelector("#t .basalt-reserve").hasAttribute("aria-hidden")), false);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#t time > .basalt-visually-hidden").length), 0);
    assert.match(await page.locator("#t").ariaSnapshot(), /3 min 4 s/);
  });

  test("the held, hidden and empty forms are unchanged: no spoken form stands for them", async () => {
    const page = await open(`${CIMIP_LIKE}${RUN(`<>
      <span id="started"><B.RunTimer start={4_000} format={short} spoken={long} /></span>
      <span id="hidden"><B.RunTimer start={4_000} format={short} spoken={long} whenHeld="hidden" /></span>
      <span id="empty"><B.RunTimer format={short} spoken={long} /></span>
    </>`)}`);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#empty time > .basalt-visually-hidden").length), 0, "no start, nothing said");
    await hold(page, true);
    await page.clock.runFor(50);
    assert.match(plain(await text(page, "#started")), /^Started /);
    assert.equal(await page.evaluate(() => document.querySelectorAll("#started time > .basalt-visually-hidden").length), 0, "the started-at form is read as drawn");
    assert.equal(await page.evaluate(() => document.querySelector("#started .basalt-reserve").hasAttribute("aria-hidden")), false);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#hidden time")).visibility), "hidden", "the hidden form hides the spoken words with it");
  });
});

// cimip-gaps-3 T1: under reduced motion a running timer counts whole minutes; exact again at its end; the hold still wins.
const REDUCED = { reducedMotion: "reduce" };
const observe = (page, sel) => page.evaluate((s) => { window.__changes = 0; new MutationObserver((m) => { window.__changes += m.length; }).observe(document.querySelector(s), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["datetime"] }); }, sel);
const said = (page, sel) => page.evaluate((s) => { const t = document.querySelector(`${s} time`); return { drawn: t.querySelector("[data-on]").textContent, hidden: t.querySelector(".basalt-reserve").getAttribute("aria-hidden"), words: t.querySelector(":scope > .basalt-visually-hidden")?.textContent ?? null, iso: t.getAttribute("datetime") }; }, sel);

describe("the minute grain under reduced motion", () => {
  for (const theme of ["dark", "light"]) {
    test(`${theme}: at 20 s it draws "<1 min", says "less than 1 minute" once, PT0M, and nothing changes for 1.5 s inside the minute`, async () => {
      const page = await open(RUN(`<span id="t"><B.RunTimer start={10_000 - 20_000} /></span>`), { ...REDUCED, theme });
      assert.deepEqual(await said(page, "#t"), { drawn: "<1 min", hidden: "true", words: "less than 1 minute", iso: "PT0M" });
      const tree = await page.locator("#t").ariaSnapshot();
      assert.equal((tree.match(/less than 1 minute/g) ?? []).length, 1, tree);
      assert.doesNotMatch(tree, /<1 min/, "the drawn form is not read beside it");
      assert.equal(await page.evaluate(() => document.querySelectorAll("#t [aria-live], #t [role=status], #t [role=log]").length), 0, "never a live region");
      await observe(page, "#t");
      await page.clock.runFor(1_500);
      assert.equal(await page.evaluate(() => window.__changes), 0, "no write between boundaries");
    });
  }

  test("one change across a minute's boundary: drawn, said and dateTime agree, then once a minute", async () => {
    const page = await open(RUN(`<span id="t"><B.RunTimer start={10_000 - 59_000} /></span>`), REDUCED);
    assert.equal((await said(page, "#t")).drawn, "<1 min");
    await observe(page, "#t");
    await page.clock.runFor(1_100);
    assert.deepEqual(await said(page, "#t"), { drawn: "1 min", hidden: null, words: null, iso: "PT1M" });
    const once = await page.evaluate(() => window.__changes);
    assert.ok(once > 0, "the boundary is written");
    await page.clock.runFor(58_000);
    assert.equal(await page.evaluate(() => window.__changes), once, "nothing more inside the minute");
    await page.clock.runFor(2_000);
    assert.deepEqual(await said(page, "#t"), { drawn: "2 min", hidden: null, words: null, iso: "PT2M" });
  });

  test("at 4 min it is \"4 min\"; at end the exact figure is written once; carried is added before the floor", async () => {
    const page = await open(RUN(`<><span id="run"><B.RunTimer start={10_000 - 240_000} /></span><span id="carried"><B.RunTimer start={10_000 - 20_000} carried={50_000} since={0} /></span><span id="done"><B.RunTimer start={0} end={2_850_000} /></span></>`), REDUCED);
    assert.equal((await said(page, "#run")).drawn, "4 min");
    assert.equal((await said(page, "#run")).iso, "PT4M");
    assert.equal((await said(page, "#carried")).drawn, "1 min", "20 s and 50 s carried is 70 s: a retry counts on");
    assert.deepEqual(await said(page, "#done"), { drawn: "47 min 30 s", hidden: null, words: null, iso: "PT47M30S" }, "a finished time is exact in every mode");
  });

  test("held, the held form wins: Started, and the hidden form hides", async () => {
    const page = await open(RUN(`<><span id="started"><B.RunTimer start={4_000} /></span><span id="hidden"><B.RunTimer start={4_000} whenHeld="hidden" /></span></>`), REDUCED);
    await hold(page, true);
    await page.clock.runFor(50);
    assert.match(plain(await text(page, "#started")), /^Started /);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("#hidden time")).visibility), "hidden");
  });

  for (const scale of ["seconds", "minutes", "hours"]) {
    test(`the seat at "${scale}" is one width before and after the grain changes, with the default words (0px)`, async () => {
      const body = RUN(`<span id="t"><B.RunTimer start={10_000 - 20_000} scale="${scale}" /></span>`);
      const full = await open(body);
      const reduced = await open(body, REDUCED);
      assert.equal(await width(reduced, "#t time"), await width(full, "#t time"), `${scale}: "<1 min" fits the seat`);
    });
  }

  test("a rail at the minutes scale shows \"<1 min\" under reduced motion, where it showed whole seconds", async () => {
    const page = await open(RUN(`<B.StageRail label="Build stages" timeScale="minutes"><B.RunStage name="Fetch" state="running" start={10_000 - 45_000} /><B.RunStage name="Pack" state="idle" /></B.StageRail>`), REDUCED);
    assert.equal(await page.evaluate(() => document.querySelector(".basalt-run-stage[data-state=running] time [data-on]").textContent), "<1 min");
  });

  test("an app's format and spoken receive the floored length and \"minute\" while running under reduced motion; the true length and \"exact\" otherwise and at end", async () => {
    const LOG = `window.__calls = []; const format = (ms, grain) => { window.__calls.push(["format", ms, grain]); return grain === "minute" ? (ms < 60_000 ? "under 1m" : Math.floor(ms / 60_000) + "m") : (ms / 1000).toFixed(1) + "s"; }; const spoken = (ms, grain) => { window.__calls.push(["spoken", ms, grain]); return grain + " " + ms; };`;
    const body = `${LOG}${RUN(`<><span id="run"><B.RunTimer start={10_000 - 184_500} scale="minutes" format={format} spoken={spoken} /></span><span id="done"><B.RunTimer start={0} end={184_500} scale="minutes" format={format} spoken={spoken} /></span></>`)}`;
    const reduced = await open(body, REDUCED);
    const calls = (page, grain) => page.evaluate((g) => window.__calls.filter(([, , gr]) => gr === g).map(([k, ms]) => [k, ms]), grain);
    assert.equal((await said(reduced, "#run")).drawn, "3m");
    assert.equal((await said(reduced, "#run")).words, "minute 180000", "floored before the app's formatter is called");
    assert.equal((await said(reduced, "#run")).iso, "PT3M", "the dateTime is floored with it");
    assert.ok((await calls(reduced, "minute")).every(([, ms]) => ms % 60_000 === 0), "every minute-grain call is a whole minute");
    assert.ok((await calls(reduced, "minute")).some(([k, ms]) => k === "format" && ms === 0), "the seat holds format(0, \"minute\")");
    assert.equal((await said(reduced, "#done")).drawn, "184.5s", "a finished time: the true length, exact");
    assert.equal((await said(reduced, "#done")).words, "exact 184500");
    const full = await open(body);
    assert.equal((await said(full, "#run")).drawn, "184.5s", "full motion: the true length, exact");
    assert.deepEqual(await calls(full, "minute"), [], "no minute-grain call without reduced motion");
  });

  test("a one-argument formatter writes the floored length in its own form and cannot keep ticking", async () => {
    const page = await open(`const short = (ms) => Math.floor(ms / 60_000) + "m " + Math.floor((ms % 60_000) / 1000) + "s";${RUN(`<span id="t"><B.RunTimer start={10_000 - 184_000} scale="minutes" format={short} /></span>`)}`, REDUCED);
    assert.equal((await said(page, "#t")).drawn, "3m 0s");
    await observe(page, "#t");
    await page.clock.runFor(5_000);
    assert.equal(await page.evaluate(() => window.__changes), 0);
  });
});
