// Round 49: the wording audit's Basalt design decisions (DECISIONS 200, and the owner's settling of two splits in DECISIONS 207). Each item that changes a pixel is shown before and
// after, in both themes at 1440 and 390: the phase chart's words (a phone form, where they show), a range of days, the empty table row's action and a clock a person reads. Q3
// (the foundations bullet) changes no pixel and has no step. The design panel has not reviewed this implementation; the decisions are the council's and the owner's.
//
// "Before" is the same Basalt part with what main wrote: the words main shipped as props, `locale="en-US-u-hc-h23"` for the 24-hour clock, the old range written by hand and the old
// action written by hand. Every word is synthetic.

import * as React from "react";

import {
  Button,
  Clock,
  CommandBlock,
  CoverageStrip,
  EventLine,
  EventLog,
  EventLogRule,
  EventText,
  EventTime,
  Listbox,
  ListboxOption,
  PhaseChart,
  SourceStamp,
  Stat,
  Stats,
  Table,
  TableBody,
  TableContainer,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "../../packages/react/src/index";
import { calls, lb, weightData } from "../../packages/react/test/fixtures/figure-data";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const w84 = weightData(84);
const NOW = Date.UTC(2026, 10, 17, 18, 42, 7);
const MORNING = Date.UTC(2026, 10, 7, 8, 2, 0);
const H23 = "en-US-u-hc-h23";

/** Two columns of the same parts: the left as main drew them, the right as this branch does. */
function Pair({ children }: { children: (which: "before" | "after") => React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
      {(["before", "after"] as const).map((which) => (
        <div key={which} data-look={which} style={{ ...col, flex: "1 1 320px", minWidth: 0, gap: 12 }}>
          <Text size="md" weight="medium">{which === "before" ? "Before (main)" : "After (this branch)"}</Text>
          {children(which)}
        </div>
      ))}
    </div>
  );
}

// ---- Q1: PhaseChart's words ----

function PhaseDemo({ which }: { which: "before" | "after" }) {
  const [week, setWeek] = React.useState(11);
  const list = React.useMemo(() => calls(), []);
  const words = which === "before"
    ? { laneLabel: "Choose a week", previousLabel: "Previous week", nextLabel: "Next week", callName: (i: number) => `Week ${i + 1}`, activateHint: "opens its week" }
    : { laneLabel: "Choose a check-in", previousLabel: "Previous check-in", nextLabel: "Next check-in", callName: (i: number) => `Check-in ${i + 20}`, activateHint: "opens its check-in" };
  return (
    <div style={{ width: 358 }}>
      <PhaseChart
        title="Weight over twelve weeks" name="Weight" days={w84.days} values={w84.values} reasons={w84.reasons} calls={list} week={week} onWeekChange={setWeek}
        {...words} statusLine={(i, c) => `${words.callName(i)} ${c.word}: ${c.text}`}
        format={lb} unit="lb" summary="Weight over twelve weeks, with each choice under it." now={Date.UTC(2026, 10, 10, 12)}
      />
    </div>
  );
}

// ---- Q2: a range of days ----

const DAYS = Array.from({ length: 28 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 9, 6 + i)).toISOString().slice(0, 10),
  recorded: !(i >= 14 && i <= 15) && i < 25,
  why: i >= 25 ? "no reading" : "watch not worn",
}));

function RangeDemo({ which }: { which: "before" | "after" }) {
  return (
    <div style={{ width: 358, containerType: "inline-size" }}>
      {which === "after" ? <CoverageStrip days={DAYS} /> : (
        // the same markup the strip draws, with the sentence main wrote
        <div className="basalt-coverage" data-form="strip">
          <div className="basalt-coverage-cells" aria-hidden="true" style={{ "--_n": DAYS.length } as React.CSSProperties}>
            {DAYS.map((day) => <i key={day.date} className="basalt-coverage-cell" data-missing={day.recorded ? undefined : ""} />)}
          </div>
          <p className="basalt-coverage-words">23 of 28 days recorded. Not recorded: Oct 20 to Oct 21 (watch not worn), Oct 31 to Nov 2 (no reading).</p>
        </div>
      )}
    </div>
  );
}

// ---- Q4: the empty row's action ----

const COLUMNS = [{}, { width: 120 }, { width: 140 }];

function EmptyDemo({ which }: { which: "before" | "after" }) {
  const row = (filters: boolean) => (
    <div style={col}>
      <Text size="sm" tone="secondary">{filters ? "A status is chosen (Failed), and a search term (zzq)" : "Only a search term is set (zzq)"}</Text>
      <TableContainer>
        <Table columns={COLUMNS} minWidth={420} aria-label={`Runs ${which} ${filters ? "filtered" : "search"}`}>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Started</TableHead></TableRow></TableHeader>
          <TableBody>
            {filters || which === "before"
              ? <TableEmpty colSpan={3} action={<Button size="sm" variant="secondary">Clear filters</Button>}>No runs match these filters.</TableEmpty>
              : <TableEmpty colSpan={3} action={<Button size="sm" variant="secondary">Clear search</Button>}>No runs match “zzq”.</TableEmpty>}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
  return <div style={col}>{row(false)}{row(true)}</div>;
}

// ---- Q5: clock times ----

function ClockDemo({ which }: { which: "before" | "after" }) {
  const locale = which === "before" ? H23 : "en-US";
  const day = which === "before" ? "Nov 17 09:39" : "Nov 17 9:39 AM";
  const earlier = which === "before" ? "Nov 17 09:38" : "Nov 17 9:38 AM";
  return (
    <div style={{ ...col, width: 358 }}>
      <Text size="sm" tone="secondary">A clock a person reads, a stat's time and the activity list follow the locale; stamps to the second stay 24-hour.</Text>
      <span>Clock <Clock timeZone="UTC" now={NOW} locale={locale} /></span>
      <Stats>
        <Stat label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={MORNING} now={MORNING} timeZone="UTC" locale={locale} />
        <Stat label="Error rate" value="0.12%" source="Logs" time={MORNING} now={NOW} timeZone="UTC" locale={locale} />
      </Stats>
      <EventLog label={`Activity ${which}`} locale={locale}>
        <EventLogRule>New since you left</EventLogRule>
        <EventLine href="#a" verb="opened" object="the pricing page" detail="from the site map" time={day} unread />
        <EventLine href="#b" verb="read" object="the notes" time={earlier} />
      </EventLog>
      <Listbox label={`Session ${which}`} defaultValue="a">
        <ListboxOption value="a" leading={<EventTime>09:39:04</EventTime>}><EventText verb="opened" object="the page" /></ListboxOption>
        <ListboxOption value="b" leading={<EventTime>13:05:22</EventTime>}><EventText verb="read" object="the notes" /></ListboxOption>
      </Listbox>
      <SourceStamp source="github" state="answered" at={NOW} timeZone="UTC" />
      <SourceStamp source="calendar" state="stale" at={NOW + 7000 * 3} timeZone="UTC" />
      <CommandBlock command="get a.example" status="allowed" exit={0} at={NOW} timeZone="UTC" />
    </div>
  );
}

const COMMON = { widths: [1440, 390], scales: [2], height: 1100 };

export const ROUND_49: Round = {
  id: "49",
  title: "The wording audit's Basalt design decisions: the period word, a range of days, the empty row's action and clock times (DECISIONS 200 and 207)",
  reviewed: false,
  summary:
    "The council voted the wording audit's five Basalt design questions (DECISIONS 200) and the owner settled the two it split on (DECISIONS 207: the empty row's action (b) and clock times (c)). This round shows each item that changes a pixel, before and after. Q3, the foundations bullet on default words, changes no pixel. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "phase-words", name: "PhaseChart ships no words (Q1)", intro: "The lane's name, the two step buttons, the numbered name, the status line and the Enter hint are required props, each a whole string. The phone form, where the words show, with an example product's words.", ...COMMON,
      decisions: ["DECISIONS 200, Q1 (c), 3 of 4 (muse, opus, grok; sol kept the defaults): no default. The numbered name is a function of the index (\"Check-in 31\" or \"Nov 3 check-in\"), and every string is whole. The lane is still seven days a choice; lanes of other lengths are in the backlog."],
      tryIt: ["Look at the words under the lane at 390: before, Basalt's \"Week 12\"; after, the product's own (\"Check-in 31\")."],
      demo: () => <Pair>{(which) => <PhaseDemo which={which} />}</Pair>,
    },
    {
      id: "day-range", name: "A range of days writes the month once (Q2)", intro: "In the same month the second end is the day alone; across months both months stay.", ...COMMON,
      decisions: ["DECISIONS 200, Q2 (b), 4 to 0: \"Oct 20 to 21\", and \"Oct 31 to Nov 2\" across months. Built from the locale's own range parts, so a day-first locale reads \"20 to 21 Oct\"."],
      tryIt: ["Read the sentence under the strip: the same words, the month once."],
      demo: () => <Pair>{(which) => <RangeDemo which={which} />}</Pair>,
    },
    {
      id: "empty-action", name: "The empty row's action names what hid the rows (Q4)", intro: "A search alone gets a sentence that names the term and \"Clear search\"; a chosen filter gets \"Clear filters\", which in the mixed case clears the search too.", ...COMMON,
      decisions: ["DECISIONS 207, Q4 (b), the owner's choice after a 2 to 2 split. The header and the columns do not move."],
      tryIt: ["Compare the first table in each column: before, \"Clear filters\" for a search nobody filtered; after, \"Clear search\"."],
      demo: () => <Pair>{(which) => <EmptyDemo which={which} />}</Pair>,
    },
    {
      id: "clock-times", name: "A clock a person reads follows the locale (Q5)", intro: "12-hour in en-US with a numeric hour for the clock, a stat's time and the activity list; a stamp to the second stays 24-hour.", ...COMMON,
      decisions: ["DECISIONS 207, Q5 (c), the owner's choice after a 2 to 2 split. Every formatter and part that writes a time takes `locale`, default en-US, so a server's render and the browser's agree. The activity list's reserved stamp is \"Mmm 00 00:00 PM\"; the session log's stays \"00:00:00\". `dateTime` stays ISO."],
      tryIt: ["Compare Clock, the stat's time and the activity list in each column; the session log, the source stamps and the command's time are the same in both."],
      demo: () => <Pair>{(which) => <ClockDemo which={which} />}</Pair>,
    },
  ],
};
