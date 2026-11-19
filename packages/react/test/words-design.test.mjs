// The wording audit's Basalt design decisions (DECISIONS 200 and 207), as one batch. Driven in Chromium against the built package with the real stylesheet, in both themes, at 1440
// and at 390 wherever a part draws; each test fails on the commit before the batch. Synthetic data only.
//
// Q1 (W2)  PhaseChart ships no word for the period: the lane's name, the two step buttons, the numbered name, the status line and the Enter hint are required props, each a whole string.
// Q2 (W4)  a range of days writes the month once when both ends share it, in the locale's order ("Oct 20 to 21", "20 to 21 Oct").
// Q3 (W6)  foundations' Principles carry the default-words bullet.
// Q4 (W7)  the empty state's action names what hid the rows (the behaviour is in table-filter.test.mjs; here the words the docs and the HTML skill give).
// Q5 (W9)  a clock a person reads follows the locale (12-hour in en-US, a numeric hour); a stamp to the second stays 24-hour; every part that writes a time takes `locale`.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, test } from "node:test";

import { fixturePage, launch, pkg } from "./support.mjs";

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const THEMES = ["dark", "light"];
const root = path.join(pkg, "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const dist = await import(pathToFileURL(path.join(pkg, "dist", "index.js")).href);
const NNBSP = "\u202f";

// ---- Q1: the period word is the product's ----

const PHASE = (width) => `import { weightData, calls, lb } from "./test/fixtures/figure-data.ts";
  const p = weightData(84);
  function Scene() {
    const [week, setWeek] = React.useState(11);
    return <div style={{ width: ${width}, margin: "0 auto", padding: 16 }}><B.PhaseChart title="Weight over twelve check-ins" name="Weight" days={p.days} values={p.values} reasons={p.reasons} calls={calls()} week={week} onWeekChange={setWeek}
      laneLabel="Choose a check-in" previousLabel="Previous check-in" nextLabel="Next check-in" callName={(i) => "Check-in " + (i + 20)} statusLine={(i, c) => "Check-in " + (i + 20) + " " + c.word + ": " + c.text} activateHint="opens its check-in"
      summary="Twelve check-ins." now={Date.UTC(2026, 10, 10, 12)} format={lb} unit="lb" /></div>;
  }
  document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
  createRoot(document.getElementById("root")).render(<Scene />);`;

describe("Q1 (W2): PhaseChart has no default words", () => {
  for (const theme of THEMES) {
    test(`${theme}, 390: the lane, the step buttons, the marks, the visible line and the status line say only what the product wrote`, async () => {
      const { page } = await fixturePage(browser, PHASE(340), { theme, viewport: { width: 390, height: 900 }, hasTouch: true });
      try {
        assert.equal(await page.locator("[role=radiogroup]").getAttribute("aria-label"), "Choose a check-in");
        assert.equal(await page.getByRole("button", { name: "Previous check-in" }).count(), 1);
        assert.equal(await page.getByRole("button", { name: "Next check-in" }).count(), 1);
        const names = await page.locator(".basalt-phase-calls input").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
        assert.equal(names.length, 12);
        assert.match(names[0], /^Check-in 20: /, "the numbered name is a function of the index");
        assert.match(names[11], /^Check-in 31: /);
        assert.equal(await page.locator(".basalt-phase-open [role=status]").evaluate((el) => el.textContent.trim().startsWith("Check-in 31 ")), true);
        assert.match(await page.locator(".basalt-phase-open > span[aria-hidden=true]").last().textContent(), /^Check-in 31 /, "the drawn line uses the same name");
        const body = await page.evaluate(() => document.body.textContent);
        assert.match(body, /Enter opens its check-in/, "the key hint is the product's whole string");
        assert.doesNotMatch(await page.locator(".basalt-phase-open, .basalt-phase-steps, [role=radiogroup]").evaluateAll((els) => els.map((el) => el.textContent + (el.getAttribute("aria-label") ?? "")).join(" ")), /Week \d|a week|its week/, "no Basalt-written week in the lane or the steps");
      } finally { await page.close(); }
    });
    test(`${theme}, 1440: the lane's name and the legend's Enter hint are the product's`, async () => {
      const { page } = await fixturePage(browser, PHASE(900), { theme, viewport: { width: 1440, height: 900 } });
      try {
        assert.equal(await page.locator("[role=radiogroup]").getAttribute("aria-label"), "Choose a check-in");
        assert.equal(await page.locator("input[type=radio]").first().getAttribute("aria-label").then((s) => s.startsWith("Check-in 20: ")), true);
        assert.match(await page.evaluate(() => document.body.textContent), /Enter opens its check-in/);
        assert.doesNotMatch(await page.evaluate(() => document.body.textContent), /opens its week|Choose a week/);
      } finally { await page.close(); }
    });
  }

  test("the names are required props (types), and the chart's source ships none of its own", () => {
    const source = read("packages", "react", "src", "phase-chart.tsx");
    for (const prop of ["laneLabel: string", "previousLabel: string", "nextLabel: string", "callName: (index: number) => string", "statusLine: (index: number, call: PhaseCall) => string", "activateHint: string"]) assert.ok(source.includes(prop), prop);
    assert.doesNotMatch(source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""), /Choose a week|Previous week|Next week|opens its week|`Week \$\{|<b>Week/);
  });
});

// ---- Q2: a range of days ----

describe("Q2 (W4): a range of days writes the month once in the same month", () => {
  const day = (date, why) => ({ date, recorded: false, why });
  const run = (...dates) => dates.map((date) => day(date, "no reading"));
  test("en-US: the month once in the same month, both months across months", () => {
    assert.equal(dist.coverageWords(run("2026-10-20", "2026-10-21")), "0 of 2 days recorded. Not recorded: Oct 20 to 21 (no reading).");
    assert.equal(dist.coverageWords(run("2026-10-31", "2026-11-01", "2026-11-02")), "0 of 3 days recorded. Not recorded: Oct 31 to Nov 2 (no reading).");
    assert.equal(dist.coverageWords([day("2026-11-01"), day("2026-11-02", null), day("2026-11-03", "x")]), "0 of 3 days recorded. Not recorded: Nov 1 to 2, Nov 3 (x).");
  });
  test("en-GB keeps its order and the word 'to' replaces the locale's separator", () => {
    assert.equal(dist.coverageWords(run("2026-10-20", "2026-10-21"), { locale: "en-GB" }), "0 of 2 days recorded. Not recorded: 20 to 21 Oct (no reading).");
    assert.equal(dist.coverageWords(run("2026-10-31", "2026-11-01", "2026-11-02"), { locale: "en-GB" }), "0 of 3 days recorded. Not recorded: 31 Oct to 2 Nov (no reading).");
  });
  test("a single day and a week form are as they were", () => {
    assert.equal(dist.coverageWords([day("2026-11-01")]), "0 of 1 day recorded. Not recorded: Nov 1.");
  });
  const STRIP = `const days = Array.from({ length: 28 }, (_, i) => { const date = new Date(Date.UTC(2026, 9, 6 + i)).toISOString().slice(0, 10); return { date, recorded: !(i >= 14 && i <= 15) && i < 25, why: i >= 25 ? "no reading" : "watch not worn" }; });
    document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)";
    createRoot(document.getElementById("root")).render(<div style={{ width: 358, padding: 16 }}><B.CoverageStrip days={days} /></div>);`;
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`${theme}, ${width}: the strip's sentence under it writes "Oct 20 to 21" and "Oct 31 to Nov 2"`, async () => {
      const { page } = await fixturePage(browser, STRIP, { theme, viewport: { width, height: 700 } });
      try {
        assert.equal((await page.locator(".basalt-coverage-words").innerText()).replace(/\s+/g, " "), "23 of 28 days recorded. Not recorded: Oct 20 to 21 (watch not worn), Oct 31 to Nov 2 (no reading).");
      } finally { await page.close(); }
    });
  }
});

// ---- Q3: the principle ----

describe("Q3 (W6): foundations' Principles carry the default-words bullet", () => {
  test("one bullet after the ornament bullet, with the rhythm-word sentence and 'such as'", () => {
    const text = read("docs", "foundations.md").replace(/\n {2}/g, " ");
    const ornament = text.indexOf('- **No ornament that signals "generated":**');
    const bullet = text.indexOf("- **Default words follow the owner's rules for words.**");
    assert.ok(ornament > 0 && bullet > ornament, "the bullet follows the ornament bullet");
    assert.ok(bullet < text.indexOf("- **One smoked surface.**"), "and is in the Principles");
    const body = text.slice(bullet, text.indexOf("\n- ", bullet + 3));
    assert.match(body, /US English, in sentence case, as a plain fact with no slogan, and a status names the step it is in/);
    assert.match(body, /\.agent\/skills\/site-words\/SKILL\.md/);
    assert.match(body, /belongs to one product's rhythm or subject \(such as a week, a check-in or a run\) is not a default: the product sets it/);
    assert.equal(text.split("- **Default words follow the owner's rules for words.**").length, 2, "exactly one");
  });
});

// ---- Q4: the empty state's action, in the words the docs give ----

describe("Q4 (W7): the docs, the doc comment and the HTML skill name what hid the rows", () => {
  test("TableEmpty's doc comment, the README, foundations and the HTML skill's still-table usage", () => {
    for (const [name, text] of [
      ["display.tsx", read("packages", "react", "src", "display.tsx")],
      ["README", read("packages", "react", "README.md")],
      ["foundations", read("docs", "foundations.md").replace(/\n +/g, " ")],
      ["still-table usage", read("tools", "html-skill", "src", "usage", "still-table.md")],
    ]) {
      assert.match(text, /Clear search/, `${name} names "Clear search"`);
      assert.match(text, /Clear filters/, `${name} names "Clear filters"`);
      assert.match(text, /No runs match “zzq”/, `${name} writes the sentence that names the term`);
    }
    for (const [name, text] of [["display.tsx", read("packages", "react", "src", "display.tsx")], ["README", read("packages", "react", "README.md")], ["foundations", read("docs", "foundations.md").replace(/\n +/g, " ")]]) {
      assert.match(text, /clears the search too|clears the search as well/, `${name} says that in the mixed case "Clear filters" clears the search too`);
    }
  });
});

// ---- Q5: clock times ----

const AT = Date.UTC(2026, 10, 17, 18, 42, 7);
const MORNING = Date.UTC(2026, 10, 7, 8, 2, 0);

describe("Q5 (W9): a clock a person reads follows the locale; a stamp to the second stays 24-hour", () => {
  test("the formatters: en-US by default, a numeric hour, ISO dateTime; formatStamp is 24-hour in every locale", () => {
    assert.deepEqual(dist.formatClock(AT, { timeZone: "UTC" }), { text: `6:42${NNBSP}PM`, dateTime: "2026-11-17T18:42" });
    assert.equal(dist.formatClock(Date.UTC(2026, 10, 17, 6, 42), { timeZone: "UTC" }).text, `6:42${NNBSP}AM`, "a numeric hour, not 06");
    assert.equal(dist.formatClock(Date.UTC(2026, 10, 17, 0, 5), { timeZone: "UTC" }).text, `12:05${NNBSP}AM`);
    assert.equal(dist.formatClock(AT, { timeZone: "UTC", locale: "en-GB" }).text, "18:42");
    assert.equal(dist.formatClock(Date.UTC(2026, 10, 17, 9, 5), { timeZone: "UTC", locale: "en-GB" }).text, "09:05");
    assert.equal(dist.formatClock(AT, { timeZone: "UTC", locale: "en-US-u-hc-h23" }).text, "18:42", "a product can ask for 24-hour");
    assert.deepEqual(dist.formatStamp(AT, { timeZone: "UTC" }), { text: "18:42:07", dateTime: "2026-11-17T18:42:07" });
    assert.equal(dist.formatStamp(AT, { timeZone: "UTC", locale: "en-US" }).text, "18:42:07");
    assert.equal(dist.formatStamp(AT, { timeZone: "UTC", locale: "en-GB" }).text, "18:42:07");
    assert.deepEqual(dist.formatStatTime(MORNING, { now: MORNING, timeZone: "UTC" }), { text: `8:02${NNBSP}AM`, dateTime: "2026-11-07T08:02" });
    assert.deepEqual(dist.formatStatTime(MORNING, { now: AT, timeZone: "UTC" }), { text: `Nov 7, 8:02${NNBSP}AM`, dateTime: "2026-11-07T08:02" });
    assert.equal(dist.formatStatTime(MORNING, { now: AT, timeZone: "UTC", locale: "en-GB" }).text, "7 Nov, 08:02");
  });

  const PARTS = `document.body.style.margin = "0"; document.body.style.background = "var(--basalt-surface-page)"; document.body.style.color = "var(--basalt-text-primary)";
    createRoot(document.getElementById("root")).render(<main style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, width: 340 }}>
      <span id="clock-us"><B.Clock timeZone="UTC" now={${AT}} /></span>
      <span id="clock-gb"><B.Clock timeZone="UTC" locale="en-GB" now={${AT}} /></span>
      <B.Stats><B.Stat label="Weight" value="81.4 kg" source="Scale" time={${MORNING}} now={${AT}} timeZone="UTC" /></B.Stats>
      <span id="source"><B.SourceStamp source="github" state="answered" at={${AT}} timeZone="UTC" /></span>
      <span id="retry"><B.SourceStateWords what="the weather" state="unreachable" tried={${AT}} timeZone="UTC" why="timed out" onRetry={() => {}} /></span>
      <B.CommandBlock command="get a.example" status="allowed" exit={0} at={${AT}} timeZone="UTC" />
      <B.EventLog label="Activity"><B.EventLine id="line" href="#a" verb="opened" object="the page" time="Nov 17 9:39 AM" /></B.EventLog>
      <B.EventLog label="Activity 24" locale="en-GB"><B.EventLine id="line-gb" href="#b" verb="opened" object="the page" time="17 Nov 09:39" /></B.EventLog>
      <B.Listbox label="Session"><B.ListboxOption value="a" leading={<B.EventTime>18:42:07</B.EventTime>}><B.EventText verb="opened" object="the page" /></B.ListboxOption></B.Listbox>
    </main>);`;
  for (const theme of THEMES) for (const width of [1440, 390]) {
    test(`${theme}, ${width}: Clock, Stat and the activity list read 12-hour in en-US; SourceStamp, CommandBlock and the session log keep 24-hour; dateTime stays ISO`, async () => {
      const { page } = await fixturePage(browser, PARTS, { theme, viewport: { width, height: 1100 } });
      try {
        const time = (selector) => page.locator(selector).evaluate((el) => [el.textContent, el.getAttribute("datetime")]);
        assert.deepEqual(await time("#clock-us time"), [`6:42${NNBSP}PM`, "2026-11-17T18:42"]);
        assert.deepEqual(await time("#clock-gb time"), ["18:42", "2026-11-17T18:42"]);
        assert.deepEqual(await time(".basalt-stat-source time"), [`Nov 7, 8:02${NNBSP}AM`, "2026-11-07T08:02"]);
        assert.deepEqual(await time("#source time"), ["18:42:07", "2026-11-17T18:42:07"]);
        assert.deepEqual(await time("#retry time"), ["18:42:07", "2026-11-17T18:42:07"]);
        assert.deepEqual(await time(".basalt-command-block-time"), ["18:42:07", "2026-11-17T18:42:07"]);
        // the reserved widest stamp follows what the column holds
        const reserved = (selector) => page.locator(`${selector} .basalt-event-time .basalt-reserve > span`).evaluateAll((els) => els.map((el) => el.textContent));
        assert.deepEqual(await reserved("#line"), ["Nov 17 9:39 AM", "Mmm 00 00:00 PM"], "a day and a clock in en-US reserves the PM");
        assert.deepEqual(await reserved("#line-gb"), ["17 Nov 09:39", "Mmm 00 00:00"], "a 24-hour locale reserves none");
        assert.deepEqual(await page.locator(".basalt-listbox .basalt-event-time .basalt-reserve > span").evaluateAll((els) => els.map((el) => el.textContent)), ["18:42:07", "00:00:00"], "a to-the-second column keeps 00:00:00");
        // the stamp does not break: "6:42 PM" stays on one line
        assert.equal(await page.locator("#clock-us time").evaluate((el) => el.getClientRects().length), 1);
      } finally { await page.close(); }
    });
  }
});
