// Round 75: cimip-gaps-3 topic T2, data parts and figures (the council's decision, DECISIONS 385). Every decided part in two unlike domains (a tide gauge and a
// bakery; a build server for the tones), both themes, 1440 and 390, with forced colours and reduced motion where they matter. The share bar and the sparkline
// change shipped pixels, so each shows today beside this build: today's share bar is this build with the batch's fit rule taken back (scoped to that side, as
// round 74 does), and today's sparkline is origin/main's own, frozen in round75-sparkline-today.tsx. Built by Opus; not reviewed; tests written, not run.

import * as React from "react";

import {
  CountNames, CoverageStrip, Countdown, DateAge, EventLine, EventLog, Heatmap, RunStage, RunStep, RunTimeline, ShareBar, Sparkline, StageBadge, StageList,
  StagePlace, StageRail, StaleNote, Stat, Stats, Terminal, TextButton,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";
import { SparklineToday } from "./round75-sparkline-today";

const NOW = Date.UTC(2026, 10, 25, 19, 25);
const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-8)", minWidth: 0 };
const PAIR = ".r75-pair { display: grid; gap: var(--basalt-space-8); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r75-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";
// Today's share bar: a part as wide as its words (min-width: auto) and the name wrapping between words, the inline form pinned.
const SHARE_TODAY = ".r75-today .basalt-share-part { min-width: auto !important; } .r75-today .basalt-share-item { min-width: auto !important; } .r75-today .basalt-share-name { white-space: normal !important; }";
// Today's sparkline drew its svg straight under the figure, with a foot row: the rules this build no longer ships, scoped to that side.
const SPARK_TODAY = ".r75-today .basalt-sparkline > svg { width: 100%; height: var(--basalt-space-16); color: var(--basalt-text-secondary); } .r75-today .basalt-sparkline-axis { display: flex; justify-content: space-between; gap: var(--basalt-space-2); color: var(--basalt-text-tertiary); font-size: var(--basalt-text-xs-size); font-variant-numeric: tabular-nums; }";

function Side({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ minWidth: 0 }}><p style={label}>{title}</p>{children}</div>;
}

// ---- 1. ShareBar
const PREP = [{ name: "Dough", value: 41 }, { name: "Proofing", value: 2 }, { name: "Ovens", value: 1 }];
const BUILDS = [
  { name: "Passed", value: 56, tone: "success" as const, href: "#passed" },
  { name: "Flaky", value: 9, tone: "warning" as const, href: "#flaky" },
  { name: "Failed", value: 4, tone: "danger" as const, href: "#failed" },
  { name: "Skipped", value: 2, href: "#skipped" },
];
function Share({ state }: { state: string }) {
  React.useEffect(() => {
    if (state === "focus") window.setTimeout(() => document.querySelector<HTMLElement>("#r75-builds .basalt-share-item[data-acts]")?.focus({ focusVisible: true } as FocusOptions), 300);
  }, [state]);
  return (
    <div style={stack}>
      <style>{`${PAIR} ${SHARE_TODAY}`}</style>
      <div className="r75-pair">
        <Side title="Today (main): each part as wide as its words, so two small parts read as one phrase">
          <div className="r75-today"><ShareBar form="inline" size="md" parts={PREP} aria-label="Prep time" /></div>
        </Side>
        <Side title="This build: parts as long as their share (a 12px floor); words that do not fit move to one legend">
          <ShareBar size="md" parts={PREP} aria-label="Prep time" />
        </Side>
      </div>
      <Side title="Tones from named status inks, and parts that are links (the whole part inline, the item in the legend)">
        <ShareBar id="r75-builds" size="md" parts={BUILDS} aria-label="Last 71 builds" />
      </Side>
      <Side title="A plan (sm), wide enough for every part's words: the inline form">
        <ShareBar parts={[{ name: "Sourdough", value: 50 }, { name: "Rye", value: 30 }, { name: "Seeded", value: 20 }]} aria-label="Tomorrow's bake" />
      </Side>
    </div>
  );
}

// ---- 2. Stat
function StatDemo({ state }: { state: string }) {
  React.useEffect(() => {
    if (state === "hint-open") window.setTimeout(() => document.querySelector<HTMLButtonElement>(".basalt-stat-hint")?.click(), 300);
    if (state === "focus") window.setTimeout(() => document.querySelector<HTMLElement>(".basalt-stat-link")?.focus({ focusVisible: true } as FocusOptions), 300);
  }, [state]);
  return (
    <div style={stack}>
      <Stats>
        <Stat label="Tide height" value="2.4 m" note="Rising 0.3 m an hour" source="Gauge 4" time={Date.UTC(2026, 10, 25, 19, 6)} timeZone="UTC" now={NOW} href="#tides" hint="Height above chart datum, the lowest astronomical tide." />
        <Stat label="Water temperature" missing note="Sensor offline since 6 PM" source="Gauge 4" time={Date.UTC(2026, 10, 25, 18, 0)} timeZone="UTC" now={NOW} />
        <Stat label="Wave period" missing value="No reading yet" note="First reading at dawn" />
      </Stats>
      <Stats>
        <Stat label="Loaves sold" value="128" note="+14 on last Tuesday" href="https://example.com/sales" target="_blank" />
        <Stat label="Oven hours" value="9.5" note="Two ovens" hint="Hours either oven was at temperature." />
        <Stat label="Waste" value="3%" note="Under the 5% target" />
      </Stats>
    </div>
  );
}

// ---- 3. Stages
function Stages({ state }: { state: string }) {
  React.useEffect(() => {
    if (state === "rail-open") window.setTimeout(() => document.querySelector<HTMLButtonElement>("#r75-rail .basalt-run-stage[data-collapsible]:nth-child(3) .basalt-run-stage-node")?.click(), 300);
  }, [state]);
  const at = (h: number, m: number, day = 25) => Date.UTC(2026, 10, day, h, m);
  return (
    <div style={stack}>
      <Side title="A rail with a clock in each seat (time=&quot;clock&quot;), the ninth state warning, and nodes that open their detail in a popover">
        <div id="r75-rail"><StageRail label="Tide alert stages" time="clock" timeZone="UTC" now={NOW}>
          <RunStage name="Detected" state="success" start={at(19, 3)} end={at(19, 5)} />
          <RunStage name="Confirmed" state="success" start={at(19, 6)} end={at(19, 9)} collapsible detail={<p>Two gauges agreed within 4 cm.</p>} />
          <RunStage name="Notified" state="warning" word="Partial" start={at(19, 10)} end={at(19, 12)} collapsible detail={<p><strong>3 of 5 harbours</strong> acknowledged.</p>} />
          <RunStage name="Closed" state="queued" />
        </StageRail></div>
      </Side>
      <Side title="A list that folds: the warning ending opens its detail once by itself; every row keeps the chevron's seat">
        <StageList label="Bake stages" time="clock" timeZone="UTC" now={NOW}>
          <RunStage name="Mix" state="success" start={at(4, 0)} end={at(4, 20)} meta="12 kg" />
          <RunStage name="Proof" state="warning" word="Over-proofed" start={at(4, 21)} end={at(6, 5)} collapsible meta="1 hr 44 min" detail={<p>Proofed 24 minutes past the window. <small>The crumb will be open.</small></p>} />
          <RunStage name="Bake" state="running" start={at(6, 10)} collapsible detail={<p>Oven 2 at 230°C.</p>} />
          <RunStage name="Cool" state="queued" />
        </StageList>
      </Side>
      <Side title="Where a row is in its sequence: StagePlace, position only, the words always">
        <div style={{ display: "grid", gap: "var(--basalt-space-2)" }}>
          <span><StagePlace current={0} total={5} label="Not started" /></span>
          <span><StagePlace current={3} total={5} label="Proof" /></span>
          <span><StagePlace current={5} total={5} label="Cool" done /></span>
          <span><StagePlace current={9} total={14} label="Harbour 9" /></span>
          <span style={{ maxWidth: 220, display: "block" }}><StagePlace current={2} total={6} label="Notify the harbourmasters by phone" /></span>
        </div>
      </Side>
      <Side title="The warning state elsewhere: a badge, a timeline's full step and tail, a Terminal stage line">
        <div style={{ display: "grid", gap: "var(--basalt-space-4)" }}>
          <div style={{ display: "flex", gap: "var(--basalt-space-3)", flexWrap: "wrap" }}><StageBadge state="warning" words={{ warning: "Timed out" }} /><StageBadge state="failed" /><StageBadge state="success" /></div>
          <RunTimeline label="Proof steps" keep={2}>
            <RunStep key="1" state="success" start={0} end={4000}>Weighed the dough</RunStep>
            <RunStep key="2" state="warning" word="Timed out" start={0} end={9000}>Waited for the proofer</RunStep>
            <RunStep key="3" state="failed" start={0} end={2000}>Read the probe</RunStep>
            <RunStep key="4" state="success" start={0} end={5000}>Shaped twelve loaves</RunStep>
            <RunStep key="5" state="warning" start={0} end={7000}>Scored the tops, partly</RunStep>
          </RunTimeline>
          <Terminal title="Bake log" stages lines={[{ kind: "stage", state: "done", text: "mix", start: 0, end: 1200 }, { kind: "stage", state: "warning", text: "proof (past the window)", start: 0, end: 6200 }, { kind: "stage", state: "running", text: "bake", start: Date.now() - 4000 }]} />
        </div>
      </Side>
    </div>
  );
}

// ---- 4. Time words
function Times() {
  return (
    <div style={stack}>
      <p style={{ margin: 0 }}>High water <DateAge precision="minute" timeZone="UTC" now={NOW} time={Date.UTC(2026, 10, 25, 19, 6)} />; the last low <DateAge precision="minute" timeZone="UTC" now={NOW} time={Date.UTC(2026, 10, 24, 13, 2)} />.</p>
      <p style={{ margin: 0 }}>Next bake <Countdown form="words" now={NOW} to={NOW + 12 * 60_000 + 41_000} />; the delivery <Countdown form="words" now={NOW} to={NOW + 2 * 3_600_000 + 15 * 60_000} />; the market <Countdown form="words" now={NOW} to={NOW + 3 * 86_400_000} />; the last minute <Countdown form="words" now={NOW} to={NOW + 40_000} />.</p>
      <div>
        <p style={{ margin: "0 0 var(--basalt-space-2)" }}>The surge is expected to peak near the river mouth at high water and fall away by midnight.</p>
        <StaleNote action={<TextButton quiet>Update summary</TextButton>}>Written before the <DateAge precision="minute" timeZone="UTC" now={NOW} time={Date.UTC(2026, 10, 25, 19, 6)} /> reading.</StaleNote>
      </div>
      <div style={{ maxWidth: 320 }}>
        <p style={{ margin: "0 0 var(--basalt-space-2)" }}>Rye is short this week; the seeded loaf takes its oven slot.</p>
        <StaleNote>Written before Tuesday's delivery.</StaleNote>
      </div>
    </div>
  );
}

// ---- 5. Sparkline
const DRIFT = [0.01, 0.02, 0.018, 0.04, 0.03, 0.025];
const LATENCY = [120, 142, 131, 224, 160, 142];
const TIMES = [0, 3, 5, 14, 20, 30].map((m) => Date.UTC(2026, 10, 25, 14, m));
function Spark() {
  return (
    <div style={stack}>
      <style>{`${PAIR} ${SPARK_TODAY}`}</style>
      <div className="r75-pair">
        <Side title="Today (main): a foot row from 0, a floor of 1, so 0.01 to 0.04 lies flat against 1.00"><div className="r75-today"><SparklineToday label="Gauge drift" data={DRIFT} /></div></Side>
        <Side title="This build: the scale at the plot's start from the data's own range"><Sparkline label="Gauge drift" data={DRIFT} /></Side>
      </div>
      <div className="r75-pair">
        <Side title="With times (x by moment) and two marks: a diamond, then a square, and their key">
          <Sparkline label="Oven 2 temperature" data={[200, 214, 226, 231, 229, 230]} times={TIMES} timeZone="UTC" format={(v) => `${Math.round(v)}°C`} marks={[{ time: TIMES[1]!, label: "Door opened" }, { time: TIMES[3]!, label: "Loaded" }]} />
        </Side>
        <Side title="A whole-number series with times: whole labels from its own peak">
          <Sparkline label="Queue latency" data={LATENCY} times={TIMES} timeZone="UTC" format={(v) => `${Math.round(v)} ms`} />
        </Side>
      </div>
    </div>
  );
}

// ---- 6. CoverageStrip
const coverage = (n: number, f: (i: number) => { recorded: boolean; event?: boolean | string; why?: string }) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 2) + i * 86_400_000).toISOString().slice(0, 10), ...f(i) }));
function Coverage() {
  return (
    <div style={stack}>
      <CoverageStrip eventLabel="Markets" days={coverage(84, (i) => ({ recorded: !(i >= 56 && i <= 57), why: i >= 56 && i <= 57 ? "gauge serviced" : undefined, event: i === 1 || i === 56 ? true : i === 15 || i === 16 ? "harvest fair" : i === 60 ? true : undefined }))} />
      <CoverageStrip form="week" eventLabel="Deliveries" days={coverage(7, (i) => ({ recorded: i !== 3, event: i === 1 || i === 3 }))} />
    </div>
  );
}

// ---- 7. EventLog
function Feed({ state }: { state: string }) {
  const [lines, setLines] = React.useState([4, 3, 2, 1]);
  React.useEffect(() => {
    if (state !== "waiting") return;
    // Focus in the log holds the arrivals: the release control floats at the head and nothing on screen moves.
    window.setTimeout(() => { document.querySelector<HTMLElement>("#r75-feed [data-event-line]")?.focus({ focusVisible: true } as FocusOptions); setLines((was) => [6, 5, ...was]); }, 200);
  }, [state]);
  return (
    <div className="r75-pair">
      <style>{PAIR}</style>
      <Side title="A log of changes: plain lines, no tab stop; a Link in a line is its own stop">
        <EventLog label="Recipe changes">
          <EventLine verb="Changed" object="Rye: hydration 72%" time="Nov 25 6:02 AM" />
          <EventLine verb="Added" object={<a className="basalt-link" href="#seeded">Seeded loaf</a>} detail="By the morning baker" time="Nov 24 5:40 PM" />
          <EventLine verb="Removed" object="Spelt" time="Nov 24 9:15 AM" />
        </EventLog>
      </Side>
      <Side title="Newest first (order=&quot;newest&quot;): with focus in the log, two arrivals wait behind the control">
        <div id="r75-feed"><EventLog order="newest" label="Gauge readings">{lines.map((n) => <EventLine key={n} verb="Read" object={`Gauge ${n}: ${(1 + n / 10).toFixed(1)} m`} time={`Nov 25 ${6 + n}:00 PM`} href={`#g${n}`} />)}</EventLog></div>
      </Side>
    </div>
  );
}

// ---- 8. Heatmap
const heat = (n: number, value: (i: number) => number | null, why?: (i: number) => string | undefined) =>
  Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2025, 10, 27) + i * 86_400_000).toISOString().slice(0, 10), value: value(i), why: why?.(i) }));
function Heat() {
  return (
    <div style={stack}>
      <Heatmap title="Batches a day" source="Bakery log" summary="Batches baked each day this year: weekends are the busiest, and the ovens were serviced in March." format={(v) => `${v} ${v === 1 ? "batch" : "batches"}`}
        days={heat(364, (i) => (i >= 110 && i <= 113 ? null : Math.round(((i % 7) + 1) * 3 + (i % 5))), (i) => (i >= 110 && i <= 113 ? "ovens serviced" : undefined))} />
      <Heatmap title="High-water alerts" weekStart={1} summary="Alerts a day at the river mouth over twelve weeks: most days had none." format={(v) => `${v} ${v === 1 ? "alert" : "alerts"}`}
        days={heat(84, (i) => (i % 11 === 0 ? 3 : i % 6 === 0 ? 1 : i % 9 === 0 ? 2 : 0))} />
    </div>
  );
}

// ---- 9. CountNames
const OVENS = Array.from({ length: 14 }, (_, i) => ({ name: `Oven ${i + 1}`, detail: i % 4 === 0 ? "Deck" : undefined, href: i < 2 ? `#oven-${i + 1}` : undefined }));
function Count({ state }: { state: string }) {
  React.useEffect(() => {
    if (state === "open") window.setTimeout(() => document.querySelector<HTMLButtonElement>("#r75-count .basalt-count-names-trigger")?.click(), 300);
  }, [state]);
  return (
    <div style={stack}>
      <p id="r75-count" style={{ margin: 0 }}>Tonight's bake runs on <CountNames names={OVENS} count={20} singular="oven" plural="ovens" footer={<a className="basalt-link" href="#all">All ovens</a>} /> across both sites.</p>
      <p style={{ margin: 0 }}>Gauges reporting: <CountNames names={["North pier", "River mouth", "Lock gate"]} singular="gauge" plural="gauges" />; offline: <CountNames names={[]} singular="gauge" plural="gauges" />; on watch: <CountNames names={["Harbourmaster"]} singular="person" plural="people" />.</p>
    </div>
  );
}

const NOT_REVIEWED = "Topic T2 of cimip-gaps-3 (DECISIONS 385; Fable decided after Muse's and Neon's drafts and Astra's check). Built by Opus; the build is not reviewed. The browser tests are written and not run (DECISIONS 359).";

export const ROUND_75: Round = {
  id: "75",
  title: "cimip-gaps-3 T2: data parts and figures",
  reviewed: false,
  summary:
    "The council's T2 decision built: ShareBar's tones, floors, one-line fit and legend, and parts that act; Stat as a link, a value not observed and a hint; the warning stage state, a clock in a stage's seat, StagePlace and a stage's own disclosure; DateAge to the minute, Countdown in words and StaleNote; Sparkline's side scale, times and marks; CoverageStrip's events; EventLog's plain lines and newest-first feed; Heatmap; CountNames. Not reviewed; tests written, not run.",
  steps: [
    { id: "share", name: "ShareBar: tones, the one-line fit and the legend, parts that act", intro: "A part is as long as its share with a floor taken from the others; its words show under it only when every part's fit on one line, else all go to one legend.", decisions: ["Item 13 is option (c): small parts' words go to the legend, never some under the bar and some in a legend.", "Tone is neutral or a status ink, never a lighter grey or the accent. No pressed state.", NOT_REVIEWED], tryIt: ["Narrow the window: the bar changes form once, all or none.", "Hover a legend item: a 2px line shows under its segment."], states: ["focus", "forced-colours"], widths: [1440, 390], height: 760, touch: true, demo: ({ state }) => <Share state={state} /> },
    { id: "stat", name: "Stat: a link, a value not observed, a hint", intro: "The whole cell is the link, with the core arrow after the figure; a reading that was not taken says so in tertiary; the label's hint opens a popover.", decisions: ["The new-tab words are the last id in the link's name: \"Loaves sold 128 (opens in a new tab)\".", "The hint icon is secondary at rest, in a 20px seat, 44 by 44 on touch.", NOT_REVIEWED], tryIt: ["Hover anywhere on Tide height: the label and the arrow lift.", "Press the hint, then Esc: focus is back on it."], states: ["focus", "hint-open"], widths: [1440, 390], height: 520, touch: true, demo: ({ state }) => <StatDemo state={state} /> },
    { id: "stages", name: "Stages: warning, the clock seat, StagePlace, a stage's own disclosure", intro: "Warning is an ending that is not a pass (the triangle in status-warning, its word in primary at 500). A seat can show when a stage started. A row can say where it is in its sequence. A stage can fold.", decisions: ["Warning is the ninth state, after t1's idle; it is finished, so it rolls and freezes.", "Only a detail that opens in place opens by itself; a rail's popover never does.", NOT_REVIEWED], tryIt: ["Press Notified on the rail: its detail opens in a popover.", "Press Bake in the list: its detail opens in place."], states: ["rail-open", "reduced-motion", "forced-colours"], widths: [1440, 390], height: 1500, touch: true, demo: ({ state }) => <Stages state={state} /> },
    { id: "time", name: "Time words: DateAge to the minute, Countdown in words, StaleNote", intro: "The absolute reading first and its age beside it; a countdown in words rounded down; a line that says what a block of text predates.", decisions: ["\"in under 1 min\" covers the last minute, so it never reads \"in 0 min\".", "StaleNote is prose on the page: no fill, rim or level, and no default words.", NOT_REVIEWED], tryIt: [], widths: [1440, 390], height: 420, demo: () => <Times /> },
    { id: "sparkline", name: "Sparkline: the side scale, times and marks", intro: "Today beside this build. The scale is a gutter at the plot's start, from the data's own range; with times a sample sits where it happened; two marks at most, with a key.", decisions: ["Item 12: no floor of 1. Without format, 0.04 reads \"0.04\".", "A mark draws no line through the plot.", NOT_REVIEWED], tryIt: [], states: ["forced-colours"], widths: [1440, 390], height: 560, demo: () => <Spark /> },
    { id: "coverage", name: "CoverageStrip: a day with an event", intro: "An event is independent of recorded: a dot under the cell, and a sentence after the missing one, its label after the same dot.", decisions: ["Where a cell is narrower than the dot (84 days at 390) the mark is as wide as its cell.", NOT_REVIEWED], tryIt: [], states: ["forced-colours"], widths: [1440, 390], height: 360, demo: () => <Coverage /> },
    { id: "event-log", name: "EventLog: plain lines and the newest-first feed", intro: "A line with neither href nor onClick is plain. A newest-first log shows arrivals at once only while the reader is at its head and not engaged; otherwise they wait behind Back to top's control.", decisions: ["Nothing on screen moves while lines wait, and focus stays where it was.", "One polite line says the count once a burst settles.", NOT_REVIEWED], tryIt: ["Focus a line: new readings wait; press \"2 new events\"."], states: ["waiting"], widths: [1440, 390], height: 460, touch: true, demo: ({ state }) => <Feed state={state} /> },
    { id: "heatmap", name: "Heatmap: a value a day", intro: "Weeks across and weekdays down, squares 12 to 20px; nothing scrolls sideways (the newest weeks that fit, and a note). The key says the ranges; the readout is the picked day.", decisions: ["Four neutral fills, chart-heat-1 to -4; neighbouring levels are an order, not a measure (a written exception).", "In forced colours a level is a shape.", NOT_REVIEWED], tryIt: ["Tab into a grid; the arrows move a week or a day."], states: ["forced-colours"], widths: [1440, 390], height: 760, touch: true, demo: () => <Heat /> },
    { id: "count-names", name: "CountNames: a count and the names it counts", intro: "A count in running text opens the names; zero is plain text, one is still the trigger.", decisions: ["The root is a span and the panel is portalled, so it is valid in a paragraph.", NOT_REVIEWED], tryIt: ["Open the ovens, type \"1\"; Esc clears, Esc again closes."], states: ["open"], widths: [1440, 390], height: 560, touch: true, demo: ({ state }) => <Count state={state} /> },
  ],
};
