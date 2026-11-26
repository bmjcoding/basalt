// cimip-gaps-3, topic T2 (design, the council's decision): ShareBar's tones, floors, one-line fit and legend, and parts that act; Stat's link, missing value and
// hint; the stages' warning state, clock seat, StagePlace and own disclosure; DateAge precision, Countdown in words and formatUntil; Sparkline's side scale,
// times and marks, and NumberTicker's generated digits; CoverageStrip's events; EventLog's plain lines and newest-first feed; Heatmap; CountNames. Driven in
// Chromium against the built package and its stylesheet. Synthetic data in two unlike domains (a tide gauge and a bakery).
// Tests are paused (DECISIONS 359): written with the batch, not run.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, settle } from "./support.mjs";
// The pure exports are read in Node from the built package: the fixture page exposes no `window.B`.
import { heatBounds, heatKey, heatLevel } from "../dist/heatmap.js";
import { STAGE_WORDS } from "../dist/run-format.js";
import { formatUntil } from "../dist/time-format.js";

const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const DESKTOP = { viewport: { width: 1000, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };
const render = (jsx) => `createRoot(document.getElementById("root")).render(${jsx});`;
const open = async (body, options = DESKTOP, theme = "dark") => {
  const { page, errors } = await fixturePage(browser, body, { theme, ...options });
  await page.addStyleTag({ content: "body { background: var(--basalt-surface-page); color: var(--basalt-text-primary); margin: 0; padding: 24px; } button, input { font: inherit; }" });
  await settle(page);
  return { page, errors };
};
const rect = (page, selector) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null; }, selector);
const axe = async (page) => {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] })).violations.map((v) => v.id));
};

// ---- 1. ShareBar
describe("ShareBar", () => {
  const PARTS = `[{ name: "Working", value: 41 }, { name: "Queued", value: 2 }, { name: "Done", value: 1 }]`;

  test("at 390 the parts are proportional with the floor taken from the others; no segment is wider than its share allows", async () => {
    const { page } = await open(render(`<div style={{ width: 342 }}><B.ShareBar size="md" parts={${PARTS}} /></div>`), PHONE);
    const widths = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-bar")].map((el) => el.getBoundingClientRect().width));
    const room = 342 - 2 * 4;
    assert.ok(Math.abs(widths.reduce((a, b) => a + b, 0) - room) < 1, `the parts fill the bar: ${widths}`);
    assert.ok(widths[1] >= 12 - 0.5 && widths[2] >= 12 - 0.5, `the floor holds: ${widths}`);
    assert.ok(widths[1] < 14 && widths[2] < 14, `a small part is not widened to its words: ${widths}`);
    await page.close();
  });

  test("auto goes to the legend when a name outgrows its segment, and back when the bar is widened; all or none", async () => {
    const { page } = await open(render(`<div id="box" style={{ width: 300 }}><B.ShareBar parts={${PARTS}} /></div>`));
    assert.equal(await page.$eval(".basalt-share", (el) => el.dataset.form), "legend");
    await page.$eval("#box", (el) => { el.style.width = "2400px"; });
    await settle(page);
    assert.equal(await page.$eval(".basalt-share", (el) => el.dataset.form), "inline");
    await page.close();
  });

  test("inline, two neighbours' words are at least 8px apart; nothing breaks inside a word", async () => {
    const { page } = await open(render(`<div style={{ width: 900 }}><B.ShareBar parts={[{ name: "Flour", value: 5 }, { name: "Butter", value: 4 }, { name: "Sugar", value: 3 }]} /></div>`));
    assert.equal(await page.$eval(".basalt-share", (el) => el.dataset.form), "inline");
    const gaps = await page.evaluate(() => {
      const parts = [...document.querySelectorAll(".basalt-share-part")];
      return parts.slice(1).map((li, i) => {
        const before = parts[i].querySelector(".basalt-share-name").getBoundingClientRect();
        return li.querySelector(".basalt-share-name").getBoundingClientRect().left - before.right;
      });
    });
    for (const gap of gaps) assert.ok(gap >= 8 - 0.5, `the words are ${gap}px apart`);
    const lines = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-name")].map((el) => el.getClientRects().length));
    assert.deepEqual(lines, [1, 1, 1]);
    await page.close();
  });

  test("a part's link keeps focus across a change of form; one link or button a part; a coarse-pointer part under 44px forces the legend", async () => {
    const { page } = await open(render(`<div id="box" style={{ width: 2400 }}><B.ShareBar parts={[{ name: "Rising", value: 60, href: "#r" }, { name: "Falling", value: 39, onSelect: () => {} }, { name: "Slack", value: 1 }]} /></div>`), PHONE);
    assert.equal(await page.$eval(".basalt-share", (el) => el.dataset.form), "legend", "a 1% part that acts is under 44px on touch");
    const counts = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-part")].map((li) => li.querySelectorAll("a, button").length));
    assert.deepEqual(counts, [1, 1, 0]);
    await page.focus(".basalt-share-part a");
    const before = await page.evaluate(() => document.activeElement);
    await page.$eval("#box", (el) => { el.style.width = "200px"; });
    await settle(page);
    assert.ok(await page.evaluate((el) => el === document.activeElement && el.isConnected, before), "focus stays on the same link");
    const tall = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-item[data-acts]")].map((el) => el.getBoundingClientRect().height));
    for (const h of tall) assert.ok(h >= 44 - 0.5, `a legend item that acts is ${h}px on touch`);
    await page.close();
  });

  test("the caller's ref is the same ul across a change of form", async () => {
    const { page } = await open(`
function App() { const ref = React.useRef(null); window.bar = ref; return <div id="box" style={{ width: 2400 }}><B.ShareBar ref={ref} parts={${PARTS}} /></div>; }
${render("<App />")}`);
    const first = await page.evaluate(() => { window.firstBar = window.bar.current; return window.bar.current?.tagName; });
    assert.equal(first, "UL");
    assert.equal(await page.$eval(".basalt-share", (el) => el.dataset.form), "inline");
    await page.$eval("#box", (el) => { el.style.width = "200px"; });
    await settle(page);
    assert.equal(await page.$eval(".basalt-share", (el) => el.dataset.form), "legend");
    assert.ok(await page.evaluate(() => window.bar.current === window.firstBar && window.bar.current === document.querySelector(".basalt-share")));
    await page.close();
  });

  test("tone paints the segment and the swatch; in forced colours every segment is CanvasText", async () => {
    const { page } = await open(render(`<B.ShareBar form="legend" parts={[{ name: "Passed", value: 8, tone: "success" }, { name: "Late", value: 2, tone: "warning" }, { name: "Lost", value: 1, tone: "danger" }, { name: "Other", value: 1 }]} />`));
    const inks = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-bar")].map((el) => getComputedStyle(el).backgroundColor));
    assert.equal(new Set(inks).size, 4);
    await page.emulateMedia({ forcedColors: "active" });
    const forced = await page.evaluate(() => [...document.querySelectorAll(".basalt-share-bar")].map((el) => getComputedStyle(el).backgroundColor));
    assert.equal(new Set(forced).size, 1);
    await page.close();
  });
});

// ---- 2. Stat
describe("Stat", () => {
  test("nine points of a linked cell reach the link, on a fine and a coarse pointer; the hint wins its own box", async () => {
    for (const options of [DESKTOP, PHONE]) {
      const { page } = await open(render(`<B.Stats><B.Stat label="Tide height" value="2.4 m" note="Rising" source="Gauge 4" time={Date.UTC(2026, 10, 25, 6, 0)} href="#tide" hint="Height above chart datum." /></B.Stats>`), options);
      const box = await rect(page, ".basalt-stat");
      for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.1, 0.5, 0.9]) {
        const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest(".basalt-stat-link, .basalt-stat-hint")?.className ?? null, [box.x + box.width * fx, box.y + box.height * fy]);
        assert.ok(hit, `(${fx}, ${fy}) reaches nothing`);
      }
      const hint = await rect(page, ".basalt-stat-hint");
      const top = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.className ?? "", [hint.x + hint.width / 2, hint.y + hint.height / 2]);
      assert.match(top, /basalt-stat-hint/);
      await page.close();
    }
  });

  test("names: a same-tab link is the label and the figure; a new-tab link ends with the new-tab words, with a note and without; the description is the note alone", async () => {
    const { page } = await open(render(`<B.Stats>
      <B.Stat id="a" label="Tide height" value="2.4 m" note="Rising" href="#t" />
      <B.Stat id="b" label="Loaves" value="128" href="https://example.com" target="_blank" note="Since 5 AM" />
      <B.Stat id="c" label="Loaves" value="128" href="https://example.com" target="_blank" />
    </B.Stats>`));
    const read = (id) => page.evaluate((i) => {
      const a = document.querySelector(`#${i} a`);
      const text = (ids) => (ids ?? "").split(/\s+/).filter(Boolean).map((x) => document.getElementById(x).textContent.trim()).join(" ");
      return { name: text(a.getAttribute("aria-labelledby")), described: text(a.getAttribute("aria-describedby")) };
    }, id);
    assert.deepEqual(await read("a"), { name: "Tide height 2.4 m", described: "Rising" });
    assert.deepEqual(await read("b"), { name: "Loaves 128 (opens in a new tab)", described: "Since 5 AM" });
    assert.deepEqual(await read("c"), { name: "Loaves 128 (opens in a new tab)", described: "" });
    await page.close();
  });

  test("Esc returns focus to the hint; the ring is at +2; missing words sit on the figure's baseline, notes level across a row", async () => {
    const { page } = await open(render(`<B.Stats><B.Stat label="Tide height" value="2.4 m" note="Rising" hint="Height above chart datum." /><B.Stat label="Water temperature" missing note="Sensor offline" /></B.Stats>`));
    await page.focus(".basalt-stat-hint");
    assert.equal(await page.$eval(".basalt-stat-hint", (el) => getComputedStyle(el).outlineOffset), "2px");
    await page.keyboard.press("Enter");
    await page.waitForSelector(".basalt-popover");
    await page.keyboard.press("Escape");
    await settle(page);
    assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("basalt-stat-hint")));
    const notes = await page.evaluate(() => [...document.querySelectorAll(".basalt-stat-note")].map((el) => el.getBoundingClientRect().top));
    assert.equal(notes[0], notes[1]);
    assert.equal(await page.$eval(".basalt-stat-missing", (el) => el.textContent), "Not observed");
    await page.close();
  });
});

// ---- 3. Stages
describe("Stages", () => {
  test("the rail's seat is one width across a clock, a word and an empty seat; another day comes from a fixed now", async () => {
    const now = "Date.UTC(2026, 10, 25, 20, 0)";
    const { page } = await open(render(`<B.StageRail label="Release" time="clock" timeZone="UTC" now={${now}}>
      <B.RunStage name="Identified" state="success" start={Date.UTC(2026, 10, 25, 19, 3)} end={Date.UTC(2026, 10, 25, 19, 10)} />
      <B.RunStage name="Mitigated" state="failed" start={Date.UTC(2026, 10, 24, 19, 3)} />
      <B.RunStage name="Resolved" state="queued" />
    </B.StageRail>`));
    const widths = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-stage-status > .basalt-reserve")].map((el) => el.getBoundingClientRect().width));
    assert.equal(new Set(widths.map((w) => w.toFixed(1))).size, 1, `${widths}`);
    assert.match(await page.$eval(".basalt-run-stage:nth-child(1) .basalt-run-clock time", (el) => el.textContent), /7:03/);
    await page.close();
  });

  test("warning: the mark, the badge, the list, the rail, the timeline full and tail, the Terminal stage line and the toggle's words", async () => {
    const { page } = await open(render(`<div>
      <B.StageBadge state="warning" />
      <B.StageList label="Bake"><B.RunStage name="Proof" state="warning" word="Over-proofed" start={0} end={1000} /></B.StageList>
      <B.StageRail label="Bake rail"><B.RunStage name="Proof" state="warning" start={0} end={1000} /><B.RunStage name="Bake" state="queued" /></B.StageRail>
      <B.RunTimeline label="Steps" keep={1}><B.RunStep key="a" state="warning" start={0} end={10}>Timed out</B.RunStep><B.RunStep key="b" state="failed" start={0} end={10}>Broke</B.RunStep><B.RunStep key="c" state="success" start={0} end={10}>Done</B.RunStep></B.RunTimeline>
      <B.Terminal title="Bake log" stages lines={[{ kind: "stage", state: "warning", text: "proof (partial)", start: 0, end: 900 }]} />
    </div>`));
    assert.match(await page.$eval(".basalt-run-badge", (el) => el.textContent), /Warning/);
    assert.equal(await page.$eval(".basalt-run-stages .basalt-run-stage-word", (el) => el.textContent), "Over-proofed");
    assert.equal(await page.$eval(".basalt-run-rail .basalt-run-stage-status [data-on] .basalt-run-stage-word", (el) => el.textContent), "Warning");
    assert.ok(await page.$eval(".basalt-run-rail .basalt-run-stage-link", (el) => !el.hasAttribute("data-filled")), "only a pass fills the link");
    assert.match(await page.$eval(".basalt-run-steps-toggle", (el) => el.textContent), /1 failed, 1 warning/);
    assert.equal(await page.$eval(".basalt-terminal-word", (el) => el.textContent.trim()), "Warning");
    const ink = await page.$eval(".basalt-run-stages .basalt-run-mark-face[data-state='warning']", (el) => getComputedStyle(el).color);
    const warning = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--basalt-status-warning").trim());
    assert.ok(ink && warning);
    await page.close();
  });

  test("the state set is exactly nine (t1's idle and T2's warning), and STAGE_WORDS has a word for each", () => {
    // On the combined tree (t1 merged): idle is the eighth state and warning the ninth. Every Record<StageState, …> is typed against this union, so the
    // typecheck holds the other records to the same nine keys.
    assert.deepEqual(Object.keys(STAGE_WORDS).sort(), ["canceled", "failed", "idle", "queued", "retrying", "running", "skipped", "success", "warning"]);
    assert.equal(STAGE_WORDS.warning, "Warning");
  });

  test("a StageBadge with no states keeps the seat it had before warning: not wider and not narrower, in both variants", async () => {
    // The previous seat: the seven words it held before cimip-gaps-3, in the same Badge, measured beside today's. "Warning" is narrower than "Canceled".
    const SEVEN = `{ queued: "Queued", running: "Running", success: "Passed", failed: "Failed", skipped: "Skipped", canceled: "Canceled", retrying: "Retrying" }`;
    const { page } = await open(render(`<div>
      <div id="now-outline"><B.StageBadge state="queued" /></div>
      <div id="was-outline"><B.Badge status="neutral"><B.Reserve show="" alternatives={${SEVEN}} /></B.Badge></div>
      <div id="now-plain"><B.StageBadge variant="plain" state="queued" /></div>
      <div id="was-plain"><B.Badge variant="plain" size={16} status="neutral"><B.Reserve show="" alternatives={${SEVEN}} /></B.Badge></div>
    </div>`));
    for (const variant of ["outline", "plain"]) {
      const now = await page.$eval(`#now-${variant} .basalt-run-badge-measure`, (el) => el.getBoundingClientRect().width);
      const was = await page.$eval(`#was-${variant} .basalt-badge`, (el) => el.getBoundingClientRect().width);
      assert.ok(now <= was + 0.5, `${variant}: the seat grew from ${was} to ${now}`);
      assert.ok(now >= was - 0.5, `${variant}: the seat shrank from ${was} to ${now}`);
    }
    await page.close();
  });

  test("StagePlace: one width for every current, for 0 and for done, the words at one x", async () => {
    const { page } = await open(render(`<div>${[0, 1, 3, 5].map((c) => `<div><B.StagePlace current={${c}} total={5} label="Proof" /></div>`).join("")}<div><B.StagePlace current={5} total={5} done label="Proof" /></div></div>`));
    const xs = await page.evaluate(() => [...document.querySelectorAll(".basalt-stage-place-label")].map((el) => el.getBoundingClientRect().left));
    assert.equal(new Set(xs.map((x) => x.toFixed(1))).size, 1, `${xs}`);
    const counts = await page.evaluate(() => [...document.querySelectorAll(".basalt-stage-place-count-text")].map((el) => el.textContent));
    assert.deepEqual(counts, ["0 of 5", "1 of 5", "3 of 5", "5 of 5", "5 of 5"]);
    await page.close();
  });

  test("StagePlace out of range draws the count alone, without the label or the marks", async () => {
    const { page } = await open(render(`<div><B.StagePlace id="one" current={1} total={1} label="Proof" /><B.StagePlace id="past" current={7} total={5} label="Proof" /></div>`));
    for (const id of ["one", "past"]) {
      assert.equal(await page.$$eval(`#${id} .basalt-stage-place-label, #${id} .basalt-stage-place-pills, #${id} .basalt-stage-place-track`, (els) => els.length), 0);
      assert.equal(await page.$$eval(`#${id} .basalt-stage-place-count`, (els) => els.length), 1);
    }
    await page.close();
  });

  test("a collapsible stage: aria-expanded, the seat kept on its siblings, open once on failure in a list; a rail's failed node opens no popover", async () => {
    const { page } = await open(`
function App() {
  const [state, setState] = React.useState("running");
  window.fail = () => setState("failed");
  return <div>
    <B.StageList label="Build"><B.RunStage name="Mix" state="success" start={0} end={10} /><B.RunStage name="Bake" collapsible state={state} detail={<p>Oven too cold</p>} start={0} /></B.StageList>
    <B.StageRail label="Rail"><B.RunStage name="Mix" state="success" /><B.RunStage name="Bake" collapsible state={state} detail={<p>Oven too cold</p>} /></B.StageRail>
  </div>;
}
${render("<App />")}`);
    const seats = await page.evaluate(() => [...document.querySelectorAll(".basalt-run-stages .basalt-run-stage-chevron")].length);
    assert.equal(seats, 2);
    assert.equal(await page.$eval(".basalt-run-stages button.basalt-run-stage-line", (el) => el.getAttribute("aria-expanded")), "false");
    await page.evaluate(() => window.fail());
    await settle(page);
    assert.equal(await page.$eval(".basalt-run-stages button.basalt-run-stage-line", (el) => el.getAttribute("aria-expanded")), "true");
    assert.equal(await page.$$eval(".basalt-popover", (els) => els.length), 0);
    await page.click(".basalt-run-stage-node:not([aria-expanded='false']), .basalt-run-rail .basalt-run-stage[data-collapsible] .basalt-run-stage-node");
    await page.waitForSelector(".basalt-run-stage-pop");
    await page.close();
  });

  test("across 480 the open state and focus are kept, and a detail that opened by itself closes on widening past it", async () => {
    const stages = Array.from({ length: 5 }, (_, i) => `<B.RunStage name="S${i}" collapsible state={${i === 2 ? `state` : `"success"`}} detail={<p>Why</p>} />`).join("");
    const { page } = await open(`
function App() { const [state, setState] = React.useState("running"); window.fail = () => setState("failed"); return <div id="box" style={{ width: 400 }}><B.StageRail label="Five">${stages}</B.StageRail></div>; }
${render("<App />")}`);
    await page.evaluate(() => window.fail());
    await settle(page);
    assert.equal(await page.$eval(".basalt-run-stage:nth-child(3) .basalt-run-stage-node", (el) => el.getAttribute("aria-expanded")), "true", "opens by itself in the list form");
    await page.$eval("#box", (el) => { el.style.width = "900px"; });
    await settle(page);
    assert.equal(await page.$eval(".basalt-run-stage:nth-child(3) .basalt-run-stage-node", (el) => el.getAttribute("aria-expanded")), "false", "closed on widening");
    await page.$eval("#box", (el) => { el.style.width = "400px"; });
    await settle(page);
    await page.click(".basalt-run-stage:nth-child(1) .basalt-run-stage-node");
    const node = await page.$(".basalt-run-stage:nth-child(1) .basalt-run-stage-node");
    await page.$eval("#box", (el) => { el.style.width = "900px"; });
    await settle(page);
    assert.equal(await node.evaluate((el) => el.getAttribute("aria-expanded")), "true", "a pressed open carries across");
    assert.ok(await node.evaluate((el) => el === document.activeElement || document.querySelector(".basalt-run-stage-pop")?.contains(document.activeElement)));
    await page.close();
  });
});

// ---- 4. Time
describe("Time words", () => {
  test("formatUntil at 12:41, 0:59, 0:00, 2:15:00 and 3 days, with an exact dateTime", () => {
    const got = [761, 59, 0, 8100, 259200].map((s) => formatUntil(s * 1000, 0));
    assert.deepEqual(got, [
      { text: "in 12 min", dateTime: "PT12M41S" },
      { text: "in under 1 min", dateTime: "PT59S" },
      null,
      { text: "in 2 hr 15 min", dateTime: "PT2H15M0S" },
      { text: "in 3 days", dateTime: "P3DT0H0M0S" },
    ]);
  });

  test("the words reach Now within a second; nothing changes under the hold", async () => {
    const { page } = await open(render(`<B.Countdown form="words" to={Date.now() + 1500} />`));
    await page.waitForFunction(() => document.querySelector(".basalt-countdown [data-on]")?.textContent === "Now", null, { timeout: 2600 });
    await page.close();
    const held = await open(`document.documentElement.setAttribute("data-loops", "held"); ${render(`<B.Countdown form="words" to={Date.now() + 61_500} />`)}`);
    const first = await held.page.$eval(".basalt-countdown [data-on]", (el) => el.textContent);
    await held.page.waitForTimeout(2200);
    assert.equal(await held.page.$eval(".basalt-countdown [data-on]", (el) => el.textContent), first);
    await held.page.close();
  });

  test("Countdown words: the time's duration is current to the second while the words hold; the hold freezes both", async () => {
    const { page } = await open(render(`<B.Countdown form="words" to={Date.now() + 12 * 60_000 + 41_500} />`));
    const read = () => page.$eval(".basalt-countdown", (el) => ({ words: el.querySelector("[data-on]").textContent, dateTime: el.getAttribute("datetime") }));
    const a = await read();
    await page.waitForTimeout(2100);
    const b = await read();
    assert.equal(b.words, a.words, "the words have not changed");
    assert.notEqual(b.dateTime, a.dateTime, "the duration moved on");
    assert.match(b.dateTime, /^PT12M3\dS$/);
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await page.waitForTimeout(100);
    const c = await read();
    await page.waitForTimeout(2100);
    assert.deepEqual(await read(), c, "nothing moves under the hold");
    await page.close();
  });

  test("DateAge precision=minute today, yesterday and another year", async () => {
    const now = "Date.UTC(2026, 10, 25, 19, 25)";
    const { page } = await open(render(`<div>
      <B.DateAge precision="minute" timeZone="UTC" now={${now}} time={Date.UTC(2026, 10, 25, 19, 6)} />
      <B.DateAge precision="minute" timeZone="UTC" now={${now}} time={Date.UTC(2026, 10, 24, 19, 6)} />
      <B.DateAge precision="minute" timeZone="UTC" now={${now}} time={Date.UTC(2025, 10, 24, 19, 6)} />
    </div>`));
    const texts = await page.evaluate(() => [...document.querySelectorAll(".basalt-date-age")].map((el) => el.textContent.replace(/\s+/g, " ")));
    assert.match(texts[0], /^7:06 PM ?· ?19 minutes ago$/);
    assert.match(texts[1], /^Nov 24, 7:06 PM ?· ?1 day ago$/);
    assert.match(texts[2], /^Nov 24, 2025, 7:06 PM/);
    await page.close();
  });
});

// ---- 5. Sparkline and NumberTicker
describe("Sparkline", () => {
  test("0.01 to 0.04 fills the plot's height, and with no format its top label reads 0.04, never 0", async () => {
    const { page } = await open(render(`<div style={{ width: 400 }}><B.Sparkline label="Drift" data={[0.01, 0.02, 0.04, 0.03]} /></div>`));
    assert.equal(await page.$eval(".basalt-sparkline-scale-top", (el) => el.textContent), "0.04");
    const ys = await page.$eval(".basalt-sparkline-line", (el) => el.getAttribute("points").split(" ").map((p) => Number(p.split(",")[1])));
    assert.ok(Math.max(...ys) - Math.min(...ys) > 40, `the line spans ${Math.max(...ys) - Math.min(...ys)}px of 64`);
    await page.close();
  });

  test("an all-zero series draws on the floor with 0 alone; a mark's x equals its sample's x for uneven times; the name follows new data", async () => {
    const { page } = await open(`
function App() { const [data, setData] = React.useState([0, 0, 0]); window.more = () => setData([3, 9, 4]); return <div style={{ width: 400 }}><B.Sparkline label="Loaves" data={data} times={[Date.UTC(2026,10,25,6), Date.UTC(2026,10,25,7), Date.UTC(2026,10,25,10)]} marks={[{ time: Date.UTC(2026,10,25,7), label: "Oven on" }]} timeZone="UTC" /></div>; }
${render("<App />")}`);
    assert.equal(await page.$eval(".basalt-sparkline-scale-top", (el) => el.textContent), "");
    assert.equal(await page.$eval(".basalt-sparkline-scale-bottom", (el) => el.textContent), "0");
    await page.evaluate(() => window.more());
    await settle(page);
    const xs = await page.$eval(".basalt-sparkline-line", (el) => el.getAttribute("points").split(" ").map((p) => Number(p.split(",")[0])));
    const mark = await page.$eval(".basalt-sparkline-plot .basalt-sparkline-mark", (el) => Number(el.getAttribute("points").split(" ")[0].split(",")[0]));
    assert.ok(Math.abs(mark - xs[1]) < 0.5, `${mark} vs ${xs[1]}`);
    assert.match(await page.$eval(".basalt-sparkline-plot svg", (el) => el.getAttribute("aria-label")), /^Loaves, 4, 6:00\sAM to 10:00\sAM, peak 9, Oven on at 7:00\sAM$/);
    await page.close();
  });

  test("a ticker's textContent is the value once with its space; a selection and the clipboard hold it once; the visible 142 ms keeps its space", async () => {
    const { page } = await open(render(`<p id="s">Latency <B.NumberTicker value={142} format={(v) => \`\${Math.round(v)} ms\`} /> now</p>`));
    assert.equal(await page.$eval(".basalt-ticker", (el) => el.textContent), "142 ms");
    const selected = await page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById("s")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return s.toString(); });
    assert.equal(selected.replace(/\s+/g, " ").trim(), "Latency 142 ms now");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\s+/g, " ").trim(), "Latency 142 ms now");
    const space = await page.$eval(".basalt-ticker-char[data-ch=' ']", (el) => el.getBoundingClientRect().width);
    assert.ok(space > 2, `the space is ${space}px wide`);
    await page.close();
  });
});

// ---- 6. CoverageStrip
describe("CoverageStrip", () => {
  const DAYS = (n, f) => `Array.from({ length: ${n} }, (_, i) => { const d = new Date(Date.UTC(2026, 8, 2) + i * 86400000).toISOString().slice(0, 10); return ${f}; })`;
  test("a missing day with an event keeps its hatch and its mark; the count ignores events; the sentence's ranges", async () => {
    const { page } = await open(render(`<B.CoverageStrip eventLabel="Markets" days={${DAYS(10, `({ date: d, recorded: i !== 3, event: i === 3 || i === 6 || i === 7 ? (i > 5 ? "harvest fair" : true) : undefined })`)}} />`));
    assert.ok(await page.$eval(".basalt-coverage-cell:nth-child(4)", (el) => el.hasAttribute("data-missing")));
    assert.ok(await page.$eval(".basalt-coverage-event:nth-child(4)", (el) => el.hasAttribute("data-on")));
    const words = await page.$eval(".basalt-coverage-words", (el) => el.textContent);
    assert.match(words, /^9 of 10 days recorded\. Not recorded: Sep 5\. Markets: Sep 5, Sep 8 to 9 \(harvest fair\)\.$/);
    await page.close();
  });

  test("marks do not overlap at 390 with 84 days; no event, no change", async () => {
    const { page } = await open(render(`<div><B.CoverageStrip id="ev" days={${DAYS(84, `({ date: d, recorded: true, event: i % 2 === 0 })`)}} /><B.CoverageStrip id="none" days={${DAYS(84, `({ date: d, recorded: true })`)}} /></div>`), PHONE);
    const boxes = await page.evaluate(() => [...document.querySelectorAll("#ev .basalt-coverage-event")].map((el) => el.getBoundingClientRect()).map((r) => [r.left, r.right]));
    for (let i = 1; i < boxes.length; i++) assert.ok(boxes[i][0] >= boxes[i - 1][1] - 0.01, `marks ${i - 1} and ${i} overlap`);
    assert.equal(await page.$$eval("#none .basalt-coverage-events", (els) => els.length), 0);
    await page.close();
  });
});

// ---- 7. EventLog
describe("EventLog", () => {
  test("arrows skip plain lines; a plain log has no tab stop; an inline link in a plain line is reached by Tab", async () => {
    const { page } = await open(render(`<div>
      <B.EventLog id="mixed" label="Changes"><B.EventLine verb="Set" object="Oven 1" time="06:00" href="#a" /><B.EventLine verb="Noted" object="Flour low" time="06:10" /><B.EventLine verb="Set" object="Oven 2" time="06:20" onClick={() => {}} /></B.EventLog>
      <B.EventLog id="plain" label="Plain"><B.EventLine verb="Rose" object={<B.Link href="#t">Tide 2.4 m</B.Link>} time="06:00" /><B.EventLine verb="Fell" object="Tide 1.1 m" time="12:00" /></B.EventLog>
    </div>`));
    await page.focus("#mixed [data-event-line]");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "BUTTON");
    assert.equal(await page.$$eval("#plain [tabindex='0']", (els) => els.length), 0);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Tide 2.4 m");
    await page.close();
  });

  const FEED = `
function App() {
  const [lines, setLines] = React.useState([3, 2, 1]);
  window.add = () => setLines((was) => [was[0] + 1, ...was]);
  return <div style={{ height: 1400 }}><B.EventLog order="newest" label="Loaves">{lines.map((n) => <B.EventLine key={n} verb="Baked" object={"Batch " + n} time={"0" + n + ":00"} href={"#b" + n} />)}</B.EventLog></div>;
}
`;
  const feed = () => FEED + render("<App />");

  test("a waiting arrival leaves document.activeElement and every row node identical; the press focuses the first new line", async () => {
    const { page } = await open(feed());
    await page.focus(".basalt-event-line");
    const before = await page.evaluate(() => ({ active: document.activeElement, rows: [...document.querySelectorAll(".basalt-event-item")] }));
    await page.evaluate(() => window.add());
    await settle(page);
    assert.ok(await page.evaluate(({ active, rows }) => active === document.activeElement && rows.every((r, i) => r === document.querySelectorAll(".basalt-event-item")[i]), before));
    assert.equal(await page.$$eval(".basalt-event-item", (els) => els.length), 3, "the arrival waits out of the DOM");
    await page.keyboard.press("Shift+Tab");
    await page.click(".basalt-event-feed-dock .basalt-back-to-top");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement.textContent.includes("Batch 4")), true);
    await page.close();
  });

  test("nothing arrives under the hold, during hover or focus, or mid-scroll; the pointer or Tab onto the control leaves it mounted and the lines waiting", async () => {
    const { page } = await open(feed());
    await page.hover(".basalt-event-line");
    await page.evaluate(() => window.add());
    await settle(page);
    assert.equal(await page.$$eval(".basalt-event-item", (els) => els.length), 3);
    await page.hover(".basalt-event-feed-dock .basalt-back-to-top");
    await settle(page);
    assert.equal(await page.$$eval(".basalt-event-item", (els) => els.length), 3, "still waiting with the pointer on the control");
    await page.mouse.move(900, 780);
    await settle(page);
    assert.equal(await page.$$eval(".basalt-event-item", (els) => els.length), 4, "lands when the pointer leaves the log");
    await page.evaluate(() => document.documentElement.setAttribute("data-loops", "held"));
    await page.evaluate(() => window.add());
    await settle(page);
    assert.equal(await page.$$eval(".basalt-event-item", (els) => els.length), 4, "the hold makes it wait");
    await page.close();
  });

  test("one announcement a burst", async () => {
    const { page } = await open(feed());
    await page.evaluate(() => { window.add(); window.add(); window.add(); });
    await page.waitForTimeout(600);
    assert.equal(await page.$eval(".basalt-event-feed [role='status']", (el) => el.textContent), "3 new events");
    await page.close();
  });

  // Fix pass 1 (Astra): only lines prepended above the newest held one are news; a repeat burst is said again; a released rule is passed over for focus.
  const SPOKEN = `
function App() {
  const [lines, setLines] = React.useState([{ k: "e3", n: 3 }, { k: "e2", n: 2 }, { k: "e1", n: 1 }]);
  window.add = () => setLines((was) => [{ k: "e" + (was.length + 10), n: was.length + 10 }, ...was]);
  window.older = () => setLines((was) => [...was, { k: "old" + was.length, n: 0 }]);
  window.replace = () => setLines([{ k: "x1", n: 101 }, { k: "x2", n: 102 }]);
  window.ruled = () => setLines((was) => [{ k: "r" + was.length, rule: true }, { k: "e" + (was.length + 20), n: was.length + 20 }, ...was]);
  return <div style={{ height: 1400 }}><B.EventLog order="newest" label="Loaves">{lines.map((line) => line.rule ? <B.EventLogRule key={line.k}>Today</B.EventLogRule> : <B.EventLine key={line.k} verb="Baked" object={"Batch " + line.n} time="06:00" href={"#" + line.k} />)}</B.EventLog></div>;
}
`;
  const spoken = (page) => page.$eval(".basalt-event-feed [role='status']", (el) => el.textContent);

  test("an older line appended below, or a whole replaced list, is not news: nothing is said", async () => {
    const { page } = await open(SPOKEN + render("<App />"));
    await page.evaluate(() => window.older());
    await page.waitForTimeout(700);
    assert.equal(await spoken(page), "");
    await page.evaluate(() => window.replace());
    await page.waitForTimeout(700);
    assert.equal(await spoken(page), "");
    await page.close();
  });

  test("two equal one-line bursts separated by the quiet interval are both said, each as a new node", async () => {
    const { page } = await open(SPOKEN + render("<App />"));
    await page.evaluate(() => window.add());
    await page.waitForTimeout(700);
    assert.equal(await spoken(page), "1 new event");
    const first = await page.$(".basalt-event-feed [role='status'] > span");
    await page.waitForTimeout(10_200);
    await page.evaluate(() => window.add());
    await page.waitForTimeout(700);
    assert.equal(await spoken(page), "1 new event");
    assert.equal(await first.evaluate((el) => el.isConnected), false, "the second saying is a new node, so it is spoken");
    await page.close();
  });

  test("a release whose first row is a rule focuses the first released event line", async () => {
    const { page } = await open(SPOKEN + render("<App />"));
    await page.focus(".basalt-event-line");
    await page.evaluate(() => window.ruled());
    await settle(page);
    await page.click(".basalt-event-feed-dock .basalt-back-to-top");
    await settle(page);
    assert.equal(await page.evaluate(() => document.activeElement?.closest(".basalt-event-item") === document.querySelector(".basalt-event-log > li:nth-child(2)")), true);
    assert.match(await page.evaluate(() => document.activeElement?.textContent ?? ""), /Batch 23/);
    await page.close();
  });
});

// ---- 8. Heatmap
describe("Heatmap", () => {
  const days = (n, f) => `Array.from({ length: ${n} }, (_, i) => ({ date: new Date(Date.UTC(2025, 10, 27) + i * 86400000).toISOString().slice(0, 10), value: ${f} }))`;
  const map = (n, f, extra = "") => render(`<B.Heatmap title="Batches a day" summary="Batches baked each day." format={(v) => \`\${v} batches\`} days={${days(n, f)}} ${extra} />`);

  test("axe in both themes (the month row is not a child of the grid)", async () => {
    for (const theme of ["dark", "light"]) {
      const { page } = await open(map(84, "i % 7 === 3 ? null : i % 9"), DESKTOP, theme);
      assert.deepEqual(await axe(page), []);
      assert.equal(await page.$eval(".basalt-heatmap-months", (el) => Boolean(el.closest("[role='grid']"))), false);
      await page.close();
    }
  });

  test("the arrows across a week's edge; a drag updates the readout; the readout's seats do not move", async () => {
    const { page } = await open(map(84, "i % 9"), PHONE);
    await page.focus(".basalt-heatmap-cell[tabindex='0']");
    const from = await page.evaluate(() => Number(document.activeElement.dataset.i));
    await page.keyboard.press("ArrowUp");
    assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.i)), from - 1);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(() => Number(document.activeElement.dataset.i)), from - 8);
    const seats = await page.evaluate(() => [...document.querySelectorAll(".basalt-heatmap-seat")].map((el) => el.getBoundingClientRect().left));
    await page.keyboard.press("PageUp");
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll(".basalt-heatmap-seat")].map((el) => el.getBoundingClientRect().left)), seats);
    await page.close();
  });

  test("a touch drag across several days moves the readout with focus already in the grid", async () => {
    const { page } = await open(map(84, "i"), PHONE);
    await page.focus(".basalt-heatmap-cell[tabindex='0']");
    const readout = () => page.$eval(".basalt-heatmap-readout", (el) => [...el.querySelectorAll(".basalt-reserve > [data-on]")].map((s) => s.textContent).join(" | "));
    const before = await readout();
    // A sideways drag along the Monday row, from the second week to the fifth, as a finger (CDP touch events).
    const row = await page.$$eval(".basalt-heatmap-row:nth-child(2) .basalt-heatmap-cell", (cells) => cells.map((c) => { const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, i: Number(c.dataset.i) }; }));
    const [from, to] = [row[1], row[4]];
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y }] });
    for (let k = 1; k <= 6; k += 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + ((to.x - from.x) * k) / 6, y: from.y }] });
    const during = await readout();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notEqual(during, before);
    const date = new Date(Date.UTC(2025, 10, 27) + to.i * 86_400_000);
    const written = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
    assert.equal(during, `${written} | ${to.i} batches`);
    await page.close();
  });

  test("the cut at 390 with 53 weeks and its note, cutNote given written dates", async () => {
    const { page } = await open(map(371, "i % 5", `cutNote={(a, b) => \`\${a}|\${b}\`}`), PHONE);
    const note = await page.$eval(".basalt-heatmap-cut", (el) => el.textContent);
    assert.match(note, /^[A-Z][a-z]{2} \d{1,2}, 2026\|Dec 2, 2026$|^[A-Z][a-z]{2} \d{1,2}\|Dec 2$/);
    const frame = await rect(page, ".basalt-heatmap-frame");
    assert.ok(frame.right <= 390, "nothing scrolls sideways");
    await page.close();
  });

  test("peaks of 0, 1, 2, 3 and 5 with no thresholds, and 0.8: no key item repeats, none is empty, the peak is level 4", () => {
    const got = [0, 1, 2, 3, 5, 0.8].map((peak) => heatKey([{ date: "2026-11-01", value: 0 }, { date: "2026-11-02", value: peak }]).map((k) => k.words));
    assert.deepEqual(got[0], ["0"]);
    assert.deepEqual(got[1], ["0", "1 and over"]);
    assert.deepEqual(got[2], ["0", "1", "2 and over"]);
    assert.deepEqual(got[3], ["0", "1", "2", "3 and over"]);
    assert.deepEqual(got[4], ["0", "1", "2", "3", "4 and over"]);
    assert.deepEqual(got[5], ["0", "Under 0.2", "0.2 to under 0.4", "0.4 to under 0.6", "0.6 and over"]);
    for (const list of got) assert.equal(new Set(list).size, list.length);
    const levels = [1, 2, 3, 5, 0.8].map((peak) => heatLevel(peak, heatBounds([0, peak]).bounds));
    assert.deepEqual(levels, [4, 4, 4, 4, 4]);
  });

  test("the table is fixed layout with a pinned date and holds every day; forced-colour shapes", async () => {
    const { page } = await open(map(371, "i % 5"), PHONE);
    await page.click(".basalt-chart-toggle");
    assert.equal(await page.$eval(".basalt-heatmap .basalt-table", (el) => getComputedStyle(el).tableLayout), "fixed");
    assert.equal(await page.$$eval(".basalt-heatmap tbody tr", (els) => els.length), 371);
    await page.emulateMedia({ forcedColors: "active" });
    const shapes = await page.evaluate(() => [1, 2, 3, 4].map((l) => { const el = document.querySelector(`.basalt-heatmap-cell[data-level="${l}"]`); return el ? getComputedStyle(el, "::before").content : null; }));
    assert.notEqual(shapes[0], "none");
    await page.close();
  });
});

// ---- 9. CountNames
describe("CountNames", () => {
  const NAMES = (n) => `Array.from({ length: ${n} }, (_, i) => ({ name: \`Oven \${i + 1}\`, detail: i === 0 ? "Hot" : undefined, href: i === 0 ? "#o1" : undefined }))`;
  test("zero is not a button; the list is inside the popover; the filter from 10; Esc twice; the partial foot; valid inside a p", async () => {
    const { page } = await open(render(`<div><p id="zero">Ovens: <B.CountNames names={[]} singular="oven" plural="ovens" /></p><p id="many">Ovens: <B.CountNames names={${NAMES(12)}} count={40} singular="oven" plural="ovens" /></p></div>`));
    assert.equal(await page.$$eval("#zero button", (els) => els.length), 0);
    assert.equal(await page.$eval("#zero", (el) => el.textContent), "Ovens: 0 ovens");
    await page.click("#many button");
    await page.waitForSelector(".basalt-count-names-panel");
    assert.equal(await page.$$eval(".basalt-count-names-panel .basalt-count-names-item", (els) => els.length), 12);
    assert.equal(await page.$$eval("#many .basalt-count-names-item", (els) => els.length), 0, "the list is portalled, never parsed into the p");
    assert.equal(await page.$eval(".basalt-count-names-foot", (el) => el.textContent), "Showing 12 of 40");
    await page.fill(".basalt-count-names-band input", "Oven 1");
    await page.keyboard.press("Escape");
    assert.equal(await page.$eval(".basalt-count-names-band input", (el) => el.value), "");
    await page.keyboard.press("Escape");
    await settle(page);
    assert.equal(await page.$$eval(".basalt-count-names-panel", (els) => els.length), 0);
    assert.ok(await page.evaluate(() => document.activeElement?.closest("#many")));
    await page.close();
  });

  test("a linked row's detail is secondary on the hover wash", async () => {
    const { page } = await open(render(`<B.CountNames names={${NAMES(3)}} singular="oven" plural="ovens" />`));
    await page.click(".basalt-count-names-trigger");
    await page.waitForSelector(".basalt-count-names-row");
    const rest = await page.$eval(".basalt-count-names-row .basalt-count-names-detail", (el) => getComputedStyle(el).color);
    await page.hover(".basalt-count-names-row");
    await settle(page);
    const hovered = await page.$eval(".basalt-count-names-row .basalt-count-names-detail", (el) => getComputedStyle(el).color);
    const secondary = await page.evaluate(() => { const s = document.createElement("span"); s.style.color = "var(--basalt-text-secondary)"; document.body.append(s); return getComputedStyle(s).color; });
    assert.notEqual(rest, hovered);
    assert.equal(hovered, secondary);
    await page.close();
  });
});
