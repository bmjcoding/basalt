// cimip-gaps-3, batch E1 (time, runs and stamps; engineering): `format` and `spoken` forwarded through RunStage and RunStep in every presentation with no
// extra timer; a rail at the minutes scale writes whole seconds; SourceStamp's `datetime` is an instant and `timeZoneName` writes the zone inside its
// `time`; PeriodStepper says nothing on arrival and speaks a change once; Sparkline's `format`. Chromium on Playwright's fake clock where a timer runs,
// built package, real stylesheet. The formatters are read from `dist` under Node.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { pathToFileURL } from "node:url";

import { fixturePage, launch, pkg, settle } from "./support.mjs";

const { formatStamp, stampInstant, zoneName } = await import(pathToFileURL(path.join(pkg, "dist", "time-format.js")).href);

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

const open = async (body, { clock = true, width = 1024, ...options } = {}) => {
  const { page, errors } = await fixturePage(browser, body, { theme: "dark", standards: true, clock, viewport: { width, height: 800 }, ...options });
  if (clock) await page.clock.runFor(50);
  else await settle(page);
  page.errors = errors;
  return page;
};
const render = (jsx) => `createRoot(document.getElementById("root")).render(<div style={{ padding: 24, width: 760 }}>${jsx}</div>);`;
const FORMATS = `
const short = (ms) => { const s = Math.floor(ms / 1000); return s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s"; };
const long = (ms) => { const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60; const u = (n, w) => n + " " + w + (n === 1 ? "" : "s"); return m ? u(m, "minute") + " " + u(r, "second") : u(r, "second"); };
`;
// Every timer on the page: the drawn figure, the spoken words, and whether the drawn figure is hidden from assistive technology.
const timers = (page) => page.evaluate(() => [...document.querySelectorAll("time.basalt-run-timer")].map((t) => ({
  drawn: t.querySelector(":scope > .basalt-reserve > [data-on]")?.textContent ?? null,
  said: t.querySelector(":scope > .basalt-visually-hidden")?.textContent ?? null,
  hidden: t.querySelector(":scope > .basalt-reserve").getAttribute("aria-hidden"),
  iso: t.getAttribute("datetime"),
})));

describe("format and spoken through RunStage and RunStep", () => {
  test("a StageList's stage draws the app's form and says the spoken one", async () => {
    const page = await open(FORMATS + render(`<B.StageList label="Shipment stages" timeScale="minutes">
      <B.RunStage name="Packed" state="success" start={0} end={184_000} format={short} spoken={long} />
      <B.RunStage name="Labelled" state="success" start={0} end={7_000} format={short} spoken={long} />
    </B.StageList>`));
    assert.deepEqual(await timers(page), [
      { drawn: "3m 4s", said: "3 minutes 4 seconds", hidden: "true", iso: "PT3M4S" },
      { drawn: "7s", said: "7 seconds", hidden: "true", iso: "PT7S" },
    ]);
  });

  test("a StageRail's node draws and says the same, one timer a node", async () => {
    const page = await open(FORMATS + render(`<B.StageRail label="Recipe stages" timeScale="minutes">
      <B.RunStage name="Proof" state="success" start={0} end={184_000} format={short} spoken={long} />
      <B.RunStage name="Bake" state="running" start={10_000 - 4_000} format={short} spoken={long} />
    </B.StageRail>`));
    const r = await timers(page);
    assert.equal(r.length, 2, "no extra timer");
    assert.deepEqual(r[0], { drawn: "3m 4s", said: "3 minutes 4 seconds", hidden: "true", iso: "PT3M4S" });
    assert.equal(r[1].drawn, "4s");
    assert.equal(r[1].said, "4 seconds");
    const tree = await page.getByRole("list", { name: "Recipe stages" }).ariaSnapshot();
    assert.equal((tree.match(/3 minutes 4 seconds/g) ?? []).length, 1, tree);
  });

  test("a RunTimeline's full step and tail row both take them", async () => {
    const steps = [1, 2, 3, 4].map((i) => `<B.RunStep key={${i}} state="success" start={0} end={${i} * 61_000} format={short} spoken={long}>Step ${i}</B.RunStep>`).join("");
    const page = await open(FORMATS + render(`<B.RunTimeline label="Import steps" keep={2} timeScale="minutes">${steps}</B.RunTimeline>`));
    const r = await timers(page);
    assert.equal(r.length, 4, "one timer a step, tail rows included");
    assert.deepEqual(r.map((x) => [x.drawn, x.said]), [["1m 1s", "1 minute 1 second"], ["2m 2s", "2 minutes 2 seconds"], ["3m 3s", "3 minutes 3 seconds"], ["4m 4s", "4 minutes 4 seconds"]]);
    assert.equal(await page.locator(".basalt-run-step[data-tail]").count(), 2, "two of them are tail rows");
  });

  test("left out, every presentation is today's: the drawn figure is read and nothing is hidden", async () => {
    const page = await open(render(`<>
      <B.StageList label="A"><B.RunStage name="One" state="success" start={0} end={1_200} /></B.StageList>
      <B.StageRail label="B"><B.RunStage name="One" state="success" start={0} end={1_200} /><B.RunStage name="Two" state="queued" /></B.StageRail>
      <B.RunTimeline label="C"><B.RunStep state="success" start={0} end={1_200}>One</B.RunStep></B.RunTimeline>
    </>`));
    for (const t of await timers(page)) assert.equal(t.said, null);
    for (const t of await timers(page)) assert.equal(t.hidden, null);
  });
});

describe("StageRail at the minutes scale", () => {
  test("a node under a minute writes whole seconds, by the second, never tenths (A11Y-W3)", async () => {
    const page = await open(render(`<B.StageRail label="Approval stages" timeScale="minutes">
      <B.RunStage name="Asked" state="success" start={0} end={1_500} />
      <B.RunStage name="Approval" state="running" start={10_000 - 4_900} />
    </B.StageRail>`));
    let r = await timers(page);
    assert.deepEqual(r.map((x) => [x.drawn, x.iso]), [["1 s", "PT1S"], ["4 s", "PT4S"]]);
    await page.clock.runFor(300);
    r = await timers(page);
    assert.equal(r[1].drawn, "5 s");
    await page.clock.runFor(500);
    assert.equal((await timers(page))[1].drawn, "5 s", "no change inside the second");
  });

  test("at the seconds scale a rail keeps its tenths", async () => {
    const page = await open(render(`<B.StageRail label="Build stages"><B.RunStage name="Build" state="success" start={0} end={1_500} /><B.RunStage name="Ship" state="queued" /></B.StageRail>`));
    assert.equal((await timers(page))[0].drawn, "1.5 s");
  });
});

describe("SourceStamp", () => {
  test("stampInstant: the wall clock with its offset (Z at UTC), one moment in every zone; zoneName in the style asked; formatStamp unchanged", () => {
    const at = Date.UTC(2026, 10, 24, 21, 55, 17, 600);
    assert.deepEqual(formatStamp(at, { timeZone: "America/Chicago" }), { text: "15:55:17", dateTime: "2026-11-24T15:55:17" }, "the wall clock, as before");
    assert.equal(stampInstant(at, { timeZone: "America/Chicago" }), "2026-11-24T15:55:17-06:00");
    assert.equal(stampInstant(at, { timeZone: "UTC" }), "2026-11-24T21:55:17Z");
    assert.equal(stampInstant(at, { timeZone: "Asia/Kolkata" }), "2026-11-25T03:25:17+05:30");
    assert.equal(stampInstant(Date.UTC(2026, 6, 1, 12), { timeZone: "America/Chicago" }), "2026-07-01T07:00:00-05:00", "summer time");
    for (const zone of ["America/Chicago", "UTC", "Asia/Kolkata", "America/St_Johns"]) assert.equal(Date.parse(stampInstant(at, { timeZone: zone })), Math.floor(at / 1000) * 1000, `${zone}: one moment`);
    assert.equal(zoneName(at, "short", { timeZone: "America/Chicago" }), "CST");
    assert.equal(zoneName(Date.UTC(2026, 6, 1, 12), "short", { timeZone: "America/Chicago" }), "CDT");
    assert.equal(zoneName(at, "shortOffset", { timeZone: "Europe/Berlin" }), "GMT+1");
  });

  test("the stamp's datetime is an instant, and timeZoneName writes the zone inside its time and in its accessible name", async () => {
    const at = Date.UTC(2026, 10, 24, 21, 55, 17);
    const page = await open(render(`<>
      <span id="plain"><B.SourceStamp source="weather" state="answered" at={${at}} timeZone="America/Chicago" /></span>
      <span id="zoned"><B.SourceStamp source="weather" state="answered" at={${at}} timeZone="America/Chicago" timeZoneName="short" onOpen={() => {}} /></span>
    </>`), { clock: false });
    const r = await page.evaluate(() => ["#plain", "#zoned"].map((s) => { const t = document.querySelector(`${s} time`); return [t.getAttribute("datetime"), t.textContent.replace(/\u00a0/g, "_")]; }));
    assert.deepEqual(r, [["2026-11-24T15:55:17-06:00", "15:55:17"], ["2026-11-24T15:55:17-06:00", "15:55:17 CST"]]);
    assert.equal(await page.locator("#zoned button").evaluate((b) => b.textContent.replace(/\u00a0/g, " ")), "Source: weather 15:55:17 CST. Open the request.");
  });
});

describe("PeriodStepper", () => {
  const STEPPER = `
function App() {
  const [week, setWeek] = React.useState(6);
  return <B.PeriodStepper label={"Week " + week} spokenPrefix="Sprint, " previousLabel="The week before" nextLabel="The week after" onPrevious={() => setWeek((w) => w - 1)} onNext={() => setWeek((w) => w + 1)} />;
}
createRoot(document.getElementById("root")).render(<App />);`;
  const lines = (page) => page.evaluate(() => {
    const p = document.querySelector(".basalt-period-label");
    return { live: p.querySelector("[role=status]").textContent, plain: p.querySelector(":scope > .basalt-visually-hidden:not([role])").textContent };
  });

  test("the period a page arrives on is read in place and never in the live line; a change after mount is spoken once", async () => {
    const page = await open(STEPPER);
    await page.clock.runFor(1_000);
    assert.deepEqual(await lines(page), { live: "", plain: "Sprint, Week 6" }, "nothing live from the first paint, after the delay too");
    assert.match(await page.getByRole("group", { name: "Period" }).ariaSnapshot(), /Sprint, Week 6/);
    await page.getByRole("button", { name: "The week after" }).click();
    await page.clock.runFor(100);
    assert.deepEqual(await lines(page), { live: "", plain: "" }, "held still for the delay first");
    await page.clock.runFor(400);
    assert.deepEqual(await lines(page), { live: "Sprint, Week 7", plain: "" }, "spoken once, and not read twice");
  });
});

describe("Sparkline format", () => {
  test("the latest value, the scale and the image's name are written by format; left out, whole numbers", async () => {
    const page = await open(render(`<>
      <div id="rate"><B.Sparkline label="Error rate" data={[0.5, 1.25, 2.75]} format={(v) => v.toFixed(2) + "%"} /></div>
      <div id="count"><B.Sparkline label="Visits" data={[120, 2440, 800]} /></div>
    </>`), { clock: false });
    const read = (id) => page.evaluate((id) => {
      const root = document.querySelector(`#${id}`);
      const axis = [...root.querySelectorAll(".basalt-sparkline-axis > span")];
      return { name: root.querySelector("svg").getAttribute("aria-label"), low: axis[0].textContent, peak: axis[1].querySelector(".basalt-visually-hidden").textContent };
    }, id);
    assert.deepEqual(await read("rate"), { name: "Error rate, 2.75%", low: "0.00%", peak: "2.75%" });
    assert.deepEqual(await read("count"), { name: "Visits, 800", low: "0", peak: "2,440" });
    assert.match(await page.locator("#rate .basalt-sparkline-head").innerText(), /2\.75%/);
  });
});
