// Round 23: charts and layout tokens. The council voted (decision 101, finish-nov10 batch 4: a three-member round, 2 of 3 deciding; the
// votes are in .review/council/charts-vote/) and handed the build over. This is that design built as decided: a chart (lines and bars)
// with its plan, its missing data, its legend that is the readout, its table and its summary, and the layout tokens. The design panel has
// not reviewed this implementation. The data is made up (packages/react/test/fixtures/chart-data.ts).
//
// "reduced-motion" and "forced-colours" are emulations that build.mjs sets before the page loads. The "chart-*" states drive a real pointer,
// finger or keyboard on the chart marked `data-wt-chart`: chart-hover, chart-gap (a day with a missing series), chart-touch, chart-keys and
// chart-table. Every step is shot at 1440 and 390, at 1x and 2x, in both themes.

import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  TimeChart,
  ChartGroup,
  Prose,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "../../packages/react/src/index";
import { hm, hmSpoken, min, minSpoken, sleepData, trainingData } from "../../packages/react/test/fixtures/chart-data";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 1104 };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

const SLEEP_SUMMARY = "Ring averaged 7 h 21 m over 28 nights and was inside the plan on 20. Watch not observed 26 to 28 October, not worn, travel; nothing observed 3 November, no device synced.";
const TRAIN_SUMMARY = "Training averaged 54 min a day over 27 days and met or beat the plan on 15. Today so far: 34 min. Nothing observed 26 to 28 October, watch not worn, travel, and 3 November, no device synced.";

function Sleep({ count = 28, third = false, late = false, wt = false }: { count?: number; third?: boolean; late?: boolean; wt?: boolean }) {
  const data = React.useMemo(() => sleepData(count, { third, late }), [count, third, late]);
  const chart = (
    <TimeChart title="Sleep" source="06:12 · Ring and watch" kind="line" days={data.days} series={data.series} plan={data.plan} format={hm} spoken={hmSpoken}
      step={60} formatTick={(v) => String(v / 60)} unit="h" summary={SLEEP_SUMMARY} />
  );
  return wt ? <div data-wt-chart="" style={{ width: "100%" }}>{chart}</div> : chart;
}

function Training({ count = 28, wt = false, late = false }: { count?: number; wt?: boolean; late?: boolean }) {
  const data = React.useMemo(() => trainingData(count, { late }), [count, late]);
  const chart = (
    <TimeChart title="Training" source="Watch" kind="bar" days={data.days} series={data.series} plan={data.plan} partial={data.partial} format={min} spoken={minSpoken}
      unit="min" summary={TRAIN_SUMMARY} />
  );
  return wt ? <div data-wt-chart="" style={{ width: "100%" }}>{chart}</div> : chart;
}

// ---- 1. the line chart

function LineDemo() {
  return (
    <div style={col}>
      <Caption>Two series against a plan band, a one-series gap (the watch, 26 to 28 October) and an every-series gap (3 November). The reasons are in the lane above the plot.</Caption>
      <Card><CardContent><Sleep wt /></CardContent></Card>
      <Caption>The same chart on the page, with no card: the rings and cuts take the page's own colour.</Caption>
      <Sleep />
    </div>
  );
}

// ---- 2. the bar chart

function BarDemo() {
  const [late, setLate] = React.useState(false);
  return (
    <div style={col}>
      <Caption>Training minutes against a per-day plan: its stroke is in front of the bars and cut out of them. A whole slot is hatched where nothing was observed, and today's bar is hollow.</Caption>
      <Card><CardContent><Training wt late={late} /></CardContent></Card>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Button size="sm" variant={late ? "primary" : "secondary"} onClick={() => setLate((v) => !v)}>{late ? "Undo the late sync" : "Sync 3 November"}</Button>
        <span className="wt-caption" style={{ margin: 0 }}>The late ride arrives and widens the scale at once; its hatch fades on the same clock. Under reduced motion it just appears.</span>
      </div>
    </div>
  );
}

// ---- 3. three series with direct labels

function SeriesDemo() {
  return (
    <div style={col}>
      <Caption>Three observed series, told apart by dash, marker and name: solid with a disc, dashed 6 on 4 off with a square, a round dot every 6px with a diamond. Direct labels at the right, because the chart is 480px or wider.</Caption>
      <Card><CardContent><Sleep third wt /></CardContent></Card>
    </div>
  );
}

// ---- 4. the readout

function ReadoutDemo() {
  return (
    <div style={col}>
      <Caption>The legend is the readout. Hover a day (a pointer), tap one (a finger) or move focus to one (a key): the picked day is a full-height plate and its date lifts to primary, and the legend's values change in place with nothing moving. With focus inside, a pointer cannot replace the focused day.</Caption>
      <Card><CardContent><Sleep wt /></CardContent></Card>
    </div>
  );
}

// ---- 5. the table

function TableDemo() {
  return (
    <div style={col}>
      <Caption>"View as table" discloses a still table in the same figure: the date is a pinned row header, newest first; "Not observed" is tertiary with no mark and the reason is in the note.</Caption>
      <Card><CardContent><Sleep wt /></CardContent></Card>
    </div>
  );
}

// ---- 6. narrow

function NarrowDemo() {
  return (
    <div style={col}>
      <Caption>At 390 the chart fits its width: labels thin by the 56px rule, markers drop to the kept days, direct labels drop and the lane takes two rows. The plot is 240px tall.</Caption>
      <Card><CardContent><Sleep wt /></CardContent></Card>
      <Caption>In a 22rem card at any viewport it is narrow too: the chart's own width decides, not the window's.</Caption>
      <Card style={{ width: "22rem", maxWidth: "100%" }}><CardContent><Training /></CardContent></Card>
      <Caption>A week and ninety days: a day is 16px or wider with the markers on, or under it with only the kept ones.</Caption>
      <Card><CardContent><div style={{ display: "flex", flexDirection: "column", gap: 32 }}><Sleep count={7} /><Sleep count={90} /></div></CardContent></Card>
    </div>
  );
}

// ---- 7. stacked

function StackDemo() {
  return (
    <div style={col}>
      <Caption>Charts stacked in one figure share a gutter, so their plots start and end at one x. Opus's two plots began about 20px apart.</Caption>
      <Card>
        <CardContent>
          <ChartGroup label="Sleep and training">
            <Sleep />
            <Training />
          </ChartGroup>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 8. layout

const PROSE = [
  "A prose page sets its text in one column, 34rem wide, on the start edge of the row. Its first letter lines up with the brand above it, and with every chart and table below it.",
  "The measure is in rem, so it follows the reader's text size: about 72 characters of Geist at 16/24.",
];

const outlined: React.CSSProperties = { outline: "1px dashed var(--basalt-border-input)", outlineOffset: -1 };

function LayoutDemo() {
  return (
    <div style={{ ...col, maxWidth: "none", gap: 40 }}>
      <Caption>A prose page: the row is size-page-width (72rem, max) inside --basalt-gutter (24, and 16 under 720); its column is size-prose-width (34rem) on the row's start edge. The dashed lines are the row and the column.</Caption>
      <div style={{ maxWidth: "var(--basalt-size-page-width)", paddingInline: "var(--basalt-gutter)", boxSizing: "border-box", ...outlined }}>
        <Prose style={outlined}>
          <h3 style={{ margin: "var(--basalt-space-6) 0 var(--basalt-space-3)", fontSize: 24, lineHeight: "32px" }}>Why sleep is two lines</h3>
          {PROSE.map((text) => <p key={text} style={{ margin: "0 0 var(--basalt-space-4)", fontSize: 16, lineHeight: "24px", color: "var(--basalt-text-secondary)" }}>{text}</p>)}
        </Prose>
      </div>
      <Caption>A data page fills the row: the same gutter, the full 72rem.</Caption>
      <div style={{ maxWidth: "var(--basalt-size-page-width)", paddingInline: "var(--basalt-gutter)", boxSizing: "border-box", ...outlined }}>
        <div style={{ paddingBlock: "var(--basalt-space-6)" }}>
          <TableContainer>
            <Table columns={[{ width: "10rem" }, { width: "8rem" }, { width: "8rem" }, {}]} minWidth="40rem" pinned={1}>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead numeric>Value</TableHead>
                  <TableHead numeric>Swift</TableHead>
                  <TableHead>What it is</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["size-header", "56px", "56", "The sticky bar, its hairline inside"],
                  ["size-sidebar-width", "256px", "256", "The app sidebar from 1024"],
                  ["size-page-width", "72rem", "1152", "The inner row, gutters inside"],
                  ["size-prose-width", "34rem", "544", "A prose page's column"],
                  ["size-breakpoint-md", "720px", "720", "Below it, the phone"],
                ].map(([name, value, swift, what]) => (
                  <TableRow key={name}>
                    <TableCell mono>{name}</TableCell>
                    <TableCell numeric>{value}</TableCell>
                    <TableCell numeric>{swift}</TableCell>
                    <TableCell>{what}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </div>
    </div>
  );
}

const CHART_STATES = ["chart-hover", "chart-gap", "chart-keys", "chart-touch@390", "reduced-motion", "forced-colours", "chart-hover-forced-colours@1440"];

export const ROUND_23: Round = {
  id: "23",
  title: "Charts and layout tokens",
  reviewed: false,
  summary:
    "The council voted (decision 101, a three-member round, 2 of 3 deciding; Muse was out, so its prototype was an option) and handed the build over. A chart for a series over time, as lines or bars, with a plan, missing data, a legend that is the readout, a table and a summary; and the layout tokens (header, tab bar, sidebar, rail, page and prose widths, the gutters and the three breakpoints), with the Swift emitter resolving a rem at 16. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "line-chart",
      name: "Line chart",
      intro: "A series over time: ink is the kind of value (primary observed, secondary planned, the hatch missing) and shape is which series.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0 (text, grid, the line, inks by meaning, missing data, the plan's language, the legend above, keyboard, motion, tokens). A line is 2px with round joins and caps, joined straight, with no area fill; markers are 8px, ringed 2px in the panel's colour; a line's scale needn't start at zero, so its 1px baseline is drawn only at zero (2 to 1; Grok: only when the quantity has a meaningful zero).",
        "Text is 12/16 everywhere in the chart (Opus's prototype computed its legend at 13px; the build follows the agreed size). 3 to 6 horizontal gridlines on round steps in border-divider, decorative: they drop in forced colours. The unit is written once on the top tick; the y gutter is the widest label plus space-2; x labels are at least 56px apart.",
        "The plan is a band here: two 1px secondary edges that step with no risers, with the hover wash between. The observed line is drawn over it and is never cut.",
        "A line breaks at a gap and never joins it; no zero is plotted. When one series of several is missing the hatch still marks the days, its words name the series, and the observed series draws over it, ringed. The reason is in a reserved lane above the plot (the full words, then \"Watch not observed\", then \"Not observed\"), and always in the summary, the readout and the table.",
        "Not copied from the prototypes: Opus's marker square (an 8px side is a larger area than the disc: the build gives the square and the diamond the disc's area, as the decision's words say); Muse's and Opus's readout, which let a pointer replace the focused day.",
        "Open: the three-series chart's dotted line is a 2px round dot every 6px (the decision's words); at 2px the dots are small beside the dashed line. A bigger dot would be a new token.",
      ],
      tryIt: ["Hover a day: its plate and its date lift, the legend's values change in place, nothing moves.", "Tab into the plot and use the arrow keys, Page Up, Page Down, Home and End: the focused day is named in full.", "Switch to light: the hatch on the plate is the tightest pair, 3.27:1."],
      states: CHART_STATES,
      demo: () => <LineDemo />,
    },
    {
      id: "bar-chart",
      name: "Bar chart",
      intro: "Bars start at zero, in observed ink, with the plan as a stroke in front of them.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: a bar is 60% of its day, from 2 to 24px, square at both ends; one series per bar chart (a second becomes a line over the bars, or a second chart).",
        "The plan is a 2px secondary stroke across each day's slot, equal neighbours joined, no risers, in front of the bar and cut 2px out of it in the panel's colour, the cut drawn only where it can't hide the bar's end (the meter's tick and its cut, one size-cut).",
        "A day that isn't final is the same mark, hollow (a 2px outline in observed ink), with \"Today so far\" in the legend and \"34 min so far\" as its value.",
        "In a bar chart the hatch fills the whole missing slot and no bar is drawn there (Muse's and Grok's; Opus hatched a bar's width).",
        "A value that changes in place glides with the scale over duration-slow on ease-out; a new peak widens the scale at once and it eases back when it shrinks. Under reduced motion values and the scale snap.",
      ],
      tryIt: ["Press \"Sync 3 November\": the late ride appears where it belongs, the scale widens at once, and its hatch fades.", "Look at the bars either side of the plan stroke: a bar a hair over the plan keeps its end clear of the cut."],
      states: ["chart-hover", "reduced-motion", "forced-colours"],
      demo: () => <BarDemo />,
    },
    {
      id: "series-chart",
      name: "Three series with direct labels",
      intro: "Series are told apart by dash, marker and name: never by colour, and never by a lighter ink.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: every observed series is primary ink (secondary is the plan's alone); series 2 is dashed 6 on 4 off with butt caps, series 3 a round dot every 6px; marker shapes are a disc, a square and a diamond of equal area; three observed series at most, past that small multiples on one scale.",
        "Direct labels: each line's name (and the plan's) at its last observed point, in a reserved right margin, 12/16 secondary, only when the chart is 480px or wider and has two or more series. At 390 they drop: the legend names every series.",
      ],
      tryIt: ["Compare the three lines with the labels hidden by your eye: each is still told apart by dash and marker."],
      states: ["forced-colours"],
      demo: () => <SeriesDemo />,
    },
    {
      id: "readout",
      name: "The readout",
      intro: "The legend above the plot is the readout: a date line, then each key with its value for the picked day.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: the legend is the readout, every value reserving its widest form so a new day moves nothing (the tests measure 0px on every element box); it returns to the latest day when the pointer leaves, but never while keyboard focus is inside the chart (the prototypes' defect).",
        "The picked day is a full-height state-selected plate behind the marks, its axis date lifting from tertiary to primary, with the control ring round the day at +2 for a key. Hover, a tap and a key pick a day; a tap holds until a tap outside; a sideways drag scrubs and `touch-action: pan-y` keeps vertical scrolling (Muse's chart used `touch-action: auto`, so a tap did not pick a day).",
        "There is no tooltip: a floating box would be a level-3 surface with a shadow over the data it describes.",
      ],
      tryIt: ["Tab into the plot, then move the pointer over other days: the readout stays on the focused one.", "On a phone: tap a day, then tap outside."],
      states: ["chart-hover@1440", "chart-gap", "chart-touch@390", "chart-keys", "chart-hover-reduced-motion@1440", "chart-keys-forced-colours@1440"],
      demo: () => <ReadoutDemo />,
    },
    {
      id: "chart-table",
      name: "The table view",
      intro: "The same numbers as a table, disclosed in the same figure.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 2 to 1 (opus wanted a \"Chart | Table\" segmented control): a \"View as table\" button with aria-expanded under the summary, Muse's control.",
        "The table is the still table: fixed layout from a colgroup, the date a pinned row header (opaque at its row's level in every state), newest first, numbers end-aligned, \"Not observed\" in tertiary with no mark and the reason in a Note column, and a scroll hint when it overflows.",
      ],
      tryIt: ["Open the table at 390 and scroll it sideways: the date stays."],
      states: ["chart-table", "chart-table-forced-colours@390"],
      demo: () => <TableDemo />,
    },
    {
      id: "chart-narrow",
      name: "Narrow, week and quarter",
      intro: "A chart is narrow by its own width, under 480px, whatever the viewport.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: labels thin by the 56px rule, markers drop to the kept days, direct labels drop, the lane takes two rows, nothing scrolls sideways, and the plot is 240px tall at every width. The chart draws in real CSS pixels at its measured width (never a scaled viewBox), so 12px text is 12px at 1440 and at 390.",
      ],
      tryIt: ["Compare the 22rem card at 1440 with the full-width chart at 390: both are narrow."],
      states: ["forced-colours"],
      demo: () => <NarrowDemo />,
    },
    {
      id: "chart-stack",
      name: "Charts stacked in one figure",
      intro: "ChartGroup: one gutter and one right margin, so every plot lines up.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided 3 to 0: the y gutter is as wide as the widest label plus space-2, shared by charts stacked in one figure so their plots line up (Opus's two plots began about 20px apart for want of this).",
      ],
      tryIt: ["Look down the two plots' left and right edges."],
      states: [],
      demo: () => <StackDemo />,
    },
    {
      id: "layout",
      name: "Layout tokens: a prose page and a data page",
      intro: "The header, tab bar, sidebar, rail, page and prose widths, the gutters and the breakpoints are tokens now.",
      widths: [1440, 390],
      scales: [1, 2],
      decisions: [
        "Decided: the names were counted one by one, because no whole set had two of three (a close call, flagged for you): size-header and size-tab-bar 3 to 0; size-sidebar-width and size-rail-width 2 to 1 (grok: size-sidebar, size-rail); size-page-width and size-prose-width 2 to 1 (grok: layout-row, layout-prose); size-gutter and size-gutter-narrow 3 to 0; size-breakpoint-md, -lg and -container 2 to 1 (opus: no size- prefix). The row stays 72rem (3 to 0); the prose measure is 34rem (2 to 1; grok: 46ch) and sits on the row's start edge, never centred (3 to 0).",
        "No offset tokens: the sticky offset (the bar plus the top safe area) and the bottom offset (the tab bar plus the bottom safe area under 720, in an app with one) are derived properties set by Basalt's layout CSS; scroll-padding-top adds space-4.",
        "Breakpoints in CSS are range syntax with the number written and a lint exception that names the token (a media query cannot read a custom property); a generated breakpoints.css of @custom-media rules is in the tokens package for apps with PostCSS; the JS tokens export the numbers. The HTML skill keeps its literals until batch 7.",
        "The Swift emitter resolves a rem token to points at 16 (72rem is 1152, 34rem is 544), with a doc comment that says so. One shared container breakpoint, 480px, for every component that answers its own width: the description list and the terminal now read it.",
      ],
      tryIt: ["Narrow the window under 720: the gutter steps from 24 to 16.", "Check the prose column's left edge against the data page's."],
      states: [],
      demo: () => <LayoutDemo />,
    },
  ],
};
