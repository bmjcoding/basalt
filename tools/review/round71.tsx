// Round 71: time, runs and stamps (cimip-gaps-3, batch E1; engineering, the owner's handoff, DECISIONS 385). The only pixels that change by default are a
// fault's: a rail at the minutes scale wrote tenths of a second under a minute; it now draws whole seconds (its datetime keeps the tenth). The rest are opt-in props
// that draw nothing until an app gives them (`RunTimer`/`RunStage`/`RunStep` `spoken`, `RunStage`/`RunStep` `format`, `SourceStamp timeZoneName`,
// `Sparkline format`). Not reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Today's rail is drawn with the build's own `format` writing today's form (`formatRunTime` at the seconds scale), so the two sides differ only where the
// build does. Every time is finished (an `end`), so the shots are still. Synthetic data in two unlike domains: a bakery's order and a photo export.

import * as React from "react";

import { RunStage, RunTimer, SourceStamp, Sparkline, StageList, StageRail, formatRunTime } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const T0 = Date.UTC(2026, 10, 24, 15, 0);
const today = (ms: number) => formatRunTime(ms).text;
const short = (ms: number) => { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; };
const long = (ms: number) => {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60;
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return m ? `${unit(m, "minute")} ${unit(r, "second")}` : unit(r, "second");
};

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const pair: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-8)", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-8)" };

function Rail({ old }: { old: boolean }) {
  const f = old ? today : undefined;
  return (
    <div style={{ minWidth: 0 }}>
      <p style={label}>{old ? "Today (main): tenths at the minutes scale" : "This build: whole seconds"}</p>
      <StageRail label={old ? "Order stages, today" : "Order stages"} timeScale="minutes">
        <RunStage name="Mixed" state="success" start={T0} end={T0 + 4_900} format={f} />
        <RunStage name="Proofed" state="success" start={T0} end={T0 + 41_300} format={f} />
        <RunStage name="Baked" state="success" start={T0} end={T0 + 754_000} format={f} />
      </StageRail>
    </div>
  );
}

function Spoken() {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={label}>An app's own short form, with its spoken form for a screen reader (read "3 minutes 4 seconds"; nothing new is drawn)</p>
      <StageList label="Export stages" timeScale="minutes">
        <RunStage name="Resize" state="success" start={T0} end={T0 + 184_000} format={short} spoken={long} />
        <RunStage name="Upload" state="success" start={T0} end={T0 + 7_000} format={short} spoken={long} />
      </StageList>
      <p style={{ ...label, marginBlockStart: "var(--basalt-space-4)" }}>A run's time in a head: <RunTimer start={T0} end={T0 + 184_000} format={short} spoken={long} /></p>
    </div>
  );
}

function Stamps() {
  const at = Date.UTC(2026, 10, 24, 21, 55, 17);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--basalt-space-3)", minWidth: 0 }}>
      <p style={label}>SourceStamp: as today, then with timeZoneName="short", then "shortOffset" as a button (the zone is inside the time and the button's name)</p>
      <SourceStamp source="weather" state="answered" at={at} timeZone="America/Chicago" />
      <SourceStamp source="weather" state="answered" at={at} timeZone="America/Chicago" timeZoneName="short" />
      <SourceStamp source="exports" state="stale" at={at} timeZone="Europe/Berlin" timeZoneName="shortOffset" onOpen={() => {}} />
    </div>
  );
}

function Lines() {
  return (
    <div style={{ ...pair, alignItems: "start" }}>
      <Sparkline label="Error rate" data={[0.4, 1.25, 0.8, 2.75, 1.9]} format={(v) => `${v.toFixed(2)}%`} />
      <Sparkline label="Loaves sold" data={[120, 2440, 800, 1310]} />
    </div>
  );
}

const DECISIONS = [
  "A fault (cimip-gaps-3 sort A3): a StageRail given timeScale=\"minutes\" draws a time under a minute in whole seconds (\"41 s\"), by the second, its datetime still to the tenth (PT41.3S). Lists, timelines, standalone timers and a rail whose scale grew keep their tenths.",
  "RunTimer spoken: the drawn figure is hidden from assistive technology and the spoken words are read once in its place, never a live region; datetime stays the ISO duration; the held, hidden and started-at forms are unchanged; the seat follows format, never spoken.",
  "RunStage and RunStep forward format and spoken to their one timer, in a list, on a rail and in a timeline's full step and tail row.",
  "SourceStamp's datetime is the instant in UTC (\"2026-11-24T21:55:17.000Z\"), the drawn clock the zone's; timeZoneName writes the zone's name inside its time, after a no-break space, so it is in the stamp's accessible name.",
  "Sparkline format writes the latest value, both ends of the scale and the image's name. Left out, whole numbers as today.",
  "Not reviewed. Engineering inside the agreed design; the browser tests are written and not run (DECISIONS 359).",
];

export const ROUND_71: Round = {
  id: "71",
  title: "Time, runs and stamps (cimip-gaps-3, E1)",
  reviewed: false,
  summary:
    "Batch E1 of the third CIMIP gaps pass: a rail at the minutes scale writes whole seconds (today's on the left, this build's on the right), and four opt-in props that draw nothing by default: a run timer's spoken form, format and spoken through RunStage and RunStep, SourceStamp's zone, and Sparkline's format. Engineering; not reviewed; the browser tests are written and not run.",
  steps: [
    {
      id: "time",
      name: "Whole seconds at the minutes scale, and the spoken form",
      intro: "A three-stage rail at timeScale=\"minutes\", today's form beside this build's; then a list and a head timer with an app's own short form and its spoken form.",
      decisions: [...DECISIONS.slice(0, 3), ...DECISIONS.slice(5)],
      tryIt: ["Compare the rails' first two seats: \"4.9 s\" and \"41.3 s\" today, \"4 s\" and \"41 s\" now.", "Read the list with a screen reader: \"3 minutes 4 seconds\", once."],
      widths: [1440, 390],
      height: 720,
      demo: () => (
        <div style={stack}>
          <div style={pair}><Rail old /><Rail old={false} /></div>
          <Spoken />
        </div>
      ),
    },
    {
      id: "stamps",
      name: "The stamp's zone and the sparkline's format",
      intro: "SourceStamp as today and with its zone; a sparkline of fractions with its format beside one of whole numbers.",
      decisions: DECISIONS.slice(3),
      tryIt: ["Tab to the stale stamp: its name says the zone next to the time."],
      widths: [1440, 390],
      height: 560,
      demo: () => (
        <div style={stack}>
          <Stamps />
          <Lines />
        </div>
      ),
    },
  ],
};
