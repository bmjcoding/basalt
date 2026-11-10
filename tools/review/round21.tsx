// Round 21: figures and transcripts. The council voted (decision 94, a three-member round the owner ordered under decision 93,
// 2 of 3 deciding: opus, sol and grok; the vote is in .review/council/figures-vote/). This is that design built as decided: a description
// list, a meter, a stat that says where its figure came from, a terminal transcript, and CodeBlock's prompt. The design panel has not
// reviewed this implementation.
//
// "reduced-motion" and "forced-colours" are emulations that build.mjs sets before the page loads, so every step shows both. The
// screenshots are taken at 960 and 390 wide; the widths in the demos are the lists' own, so the stacked list shows at both.

import * as React from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CodeBlock,
  DescriptionItem,
  DescriptionList,
  Meter,
  Stat,
  Stats,
  Terminal,
} from "../../packages/react/src/index";
import type { TerminalLine, TerminalStatus } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24, alignItems: "stretch", width: "100%", maxWidth: 720 };
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// ---- 1. the description list

function Facts({ missing = true }: { missing?: boolean }) {
  return (
    <DescriptionList>
      <DescriptionItem term="ID" mono>sb_7f3a91c2e0</DescriptionItem>
      <DescriptionItem term="Region">Ashburn (us-east)</DescriptionItem>
      <DescriptionItem term="Image" mono>node:22-slim</DescriptionItem>
      <DescriptionItem term="Last successful verification of the egress policy">12 hosts, checked 3 times today</DescriptionItem>
      <DescriptionItem term="Allowed hosts" mono values={["api.example.test", "cdn.example.test", "auth.example.test"]} />
      {missing ? <DescriptionItem term="Last seen" missing /> : null}
    </DescriptionList>
  );
}

function ListDemo() {
  return (
    <div style={col}>
      <Caption>On the page, under its heading: a 160px label column, 40px rows, a divider between rows only</Caption>
      <div>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, lineHeight: "24px" }}>Run sb_7f3a91c2e0</h3>
        <Facts />
      </div>
      <Caption>In a card that is the object: the same list, its dividers inside the card's padding</Caption>
      <Card>
        <CardHeader><CardTitle>Proxy route</CardTitle></CardHeader>
        <CardContent>
          <DescriptionList>
            <DescriptionItem term="Host" mono>api.example.test</DescriptionItem>
            <DescriptionItem term="Upstream" mono>10.0.4.12:8080</DescriptionItem>
            <DescriptionItem term="TLS">Managed, renews Dec 2</DescriptionItem>
            <DescriptionItem term="Health check" missing />
          </DescriptionList>
        </CardContent>
      </Card>
      <Caption>In a 22rem card, narrower than 480px: it stacks on its own width, label over value 2px apart, whatever the viewport</Caption>
      <Card style={{ width: "22rem", maxWidth: "100%" }}>
        <CardContent>
          <Facts />
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 2. the meter

function ChangingMeter() {
  const [value, setValue] = React.useState(1240);
  return (
    <div style={{ ...col, maxWidth: 420 }}>
      <Meter label="Build minutes" value={value} max={2000} unit="min" spokenUnit="minutes" target={1400} targetLabel="Plan by today" />
      <div style={row}>
        {[0, 760, 1240, 2000, 2400].map((v) => (
          <Button key={v} size="sm" variant={v === value ? "primary" : "secondary"} onClick={() => setValue(v)}>{v.toLocaleString("en-US")}</Button>
        ))}
      </div>
      <Caption>Press a value: the fill glides over 200ms (it jumps under reduced motion), and nothing else moves.</Caption>
    </div>
  );
}

function MeterDemo() {
  return (
    <div style={{ ...col, maxWidth: 840 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 32, alignItems: "start" }}>
        <div style={col}>
          <Caption>On the page</Caption>
          <Meter label="Build minutes" value={1240} max={2000} unit="min" spokenUnit="minutes" target={1400} targetLabel="Plan by today" />
          <Meter label="Build minutes" value={1240} max={2000} unit="min" spokenUnit="minutes" />
          <Meter label="Build minutes" value={2000} max={2000} unit="min" spokenUnit="minutes" target={1400} targetLabel="Plan by today" />
          <Meter label="API requests" value={124000} max={100000} spokenUnit="requests" target={80000} targetLabel="Alert at" format={{ maximumFractionDigits: 0 }} />
          <Meter label="API requests" value={124000} max={100000} spokenUnit="requests" />
          <Meter label="Seats" value={0} max={20} />
        </div>
        <div style={col}>
          <Caption>In a card (the tick's cut is the card's own fill)</Caption>
          <Card>
            <CardContent>
              <div style={col}>
                <Meter label="Build minutes" value={1240} max={2000} unit="min" spokenUnit="minutes" target={1400} targetLabel="Plan by today" />
                <Meter label="API requests" value={124000} max={100000} spokenUnit="requests" target={80000} targetLabel="Alert at" />
              </div>
            </CardContent>
          </Card>
          <Caption>One changing value, with a target</Caption>
          <ChangingMeter />
        </div>
      </div>
    </div>
  );
}

// ---- 3. the stat

function StatsDemo() {
  const now = new Date("2026-11-10T12:00:00Z");
  return (
    <div style={col}>
      <Caption>A row of three on the page: the middle one has no note, and the last was read on another day. The sources sit on one line.</Caption>
      <Stats min="11rem">
        <Stat label="Weight" value="81.4 kg" note="−0.6 kg this week" source="Scale" time={new Date("2026-11-10T04:41:00Z")} now={now} timeZone="UTC" locale="en-US" />
        <Stat label="Latency" value="96 ms" source="Edge probes" time={new Date("2026-11-10T04:40:00Z")} now={now} timeZone="UTC" locale="en-US" />
        <Stat label="Error rate" value="0.12%" note="Down from 0.31% last month, after the retry change shipped on Tuesday" source="Logs" time={new Date("2026-11-07T08:02:00Z")} now={now} timeZone="UTC" locale="en-US" />
      </Stats>
      <Caption>Another year, and a stat with no source (no slot)</Caption>
      <Stats min="11rem">
        <Stat label="Sessions" value="1,204" note="Peak at 09:00" source="Analytics" time={new Date("2025-11-07T08:02:00Z")} now={now} timeZone="UTC" locale="en-US" />
        <Stat label="Open issues" value="38" note="Four need a reply" />
      </Stats>
    </div>
  );
}

// ---- 4. the terminal, and CodeBlock's prompt

const TRANSCRIPT: TerminalLine[] = [
  { kind: "command", text: "basalt sandbox create --image node:22-slim --region us-east" },
  { kind: "output", text: "Creating sandbox sb_7f3a91c2e0" },
  { kind: "output", text: "Pulling node:22-slim (48.2 MB)" },
  { kind: "done", text: "Sandbox ready in 3.4 s" },
  { kind: "command", text: "basalt run sb_7f3a91c2e0 -- npm test" },
  { kind: "output", text: "meter.test.ts      6 passed      41 ms" },
  { kind: "warning", text: "2 tests skipped: no clock in this sandbox" },
  { kind: "output", text: "terminal.test.ts   4 passed, 1 failed   52 ms" },
  { kind: "error", text: "terminal.test.ts: expected 1 log region, found 2" },
  { kind: "error", text: "1 test failed. Exit code 1" },
];

function FrozenStream({ status, count, title }: { status: TerminalStatus; count: number; title: string }) {
  return <Terminal title={title} status={status} lines={TRANSCRIPT.slice(0, count)} exitCode={1} onPause={() => {}} onResume={() => {}} />;
}

function TerminalDemo() {
  return (
    <div style={col}>
      <Caption>Static: a record, not a live region. Every kind of line: a command, output, done, warning, error</Caption>
      <Terminal title="Deploy and test" lines={TRANSCRIPT} />
      <Caption>Live, frozen mid-run (a log only now): braille beside "Running", the fixed height scrolls inside</Caption>
      <FrozenStream title="Build on sb_7f3a91c2e0" status="running" count={7} />
      <Caption>Paused, and finished with a failure (neither is a log)</Caption>
      <FrozenStream title="Build on sb_7f3a91c2e0, paused" status="paused" count={4} />
      <FrozenStream title="Build on sb_7f3a91c2e0, finished" status="failed" count={10} />
      <Caption>A replay you can play, pause and replay: the lines arrive on their own</Caption>
      <Terminal title="Replay: build on sb_7f3a91c2e0" replay interval={700} exitCode={1} lines={TRANSCRIPT} />
      <Caption>A longer prompt: the gutter is one column, the prompt plus 1ch, so every line's text starts on one edge</Caption>
      <Terminal title="PowerShell" prompt="PS>" lines={TRANSCRIPT.slice(0, 4)} />
      <Caption>In a 22rem card the head is narrow, whatever the window: the copy button is the icon alone</Caption>
      <Card style={{ width: "22rem", maxWidth: "100%" }}>
        <CardContent>
          <Terminal title="Deploy and test" lines={TRANSCRIPT.slice(0, 4)} />
        </CardContent>
      </Card>
    </div>
  );
}

function PromptDemo() {
  return (
    <div style={col}>
      <Caption>CodeBlock with a prompt: every line in the gutter, a continuation after a trailing backslash gets an empty one</Caption>
      <CodeBlock title="Install" language="sh" prompt="$" code={"npm install @srasyndicate/basalt\nnpx basalt init --theme system \\\n  --density default\n"} />
      <CodeBlock title="Install, PowerShell" language="sh" prompt="PS>" code={"npm install @srasyndicate/basalt\nnpx basalt init --theme system\n"} />
      <Caption>Without a prompt it is exactly what it was</Caption>
      <CodeBlock title="Install" language="sh" code={"npm install @srasyndicate/basalt\nnpx basalt init --theme system \\\n  --density default\n"} />
      <Caption>Copy takes the code as given, with no prompt; select all, and a selection holds none either</Caption>
    </div>
  );
}

export const ROUND_21: Round = {
  id: "21",
  title: "Figures and transcripts",
  reviewed: false,
  summary:
    "The council voted (decision 94: opus, sol and grok, 2 of 3 deciding, as the owner ordered in decision 93) and the owner handed the batch over for building. A description list, a meter, a stat that says where its figure came from, a terminal transcript beside CodeBlock, and CodeBlock's prompt. This is the decided design built; the design panel has not reviewed this implementation. Every demo is the real component, and the examples are synthetic.",
  steps: [
    {
      id: "description-list",
      name: "Description list",
      intro: "Facts about one thing: a label, then its value, row after row. A dl of div rows on the page, with no rim and no level of its own.",
      decisions: [
        "Decided 3 to 0 (decision 94): a fixed 160px label column (a new token, size-description-label), stacking on its own width in a container query below 480px, a 13/18 secondary label on the value's baseline, rows with space-2-5 padding (a one-line row is 40px, the table's rhythm), and a missing value taking batch 2's \"Not observed\".",
        "The label is 13/18 at 400 in secondary ink; the value is 14/20 at 400 in primary ink with tabular numerals, start-aligned. Mono is for identifiers only (a `mono` option), at 13px on the 20px line, so a mono row is still 40px.",
        "A divider between rows and never above the first or below the last; the first and last rows lose their outer padding. Several values in one row stack space-1 apart. A long label wraps inside its column and never moves a value.",
        "It goes inside a card only when the card is the object; the dividers then stay inside the card's padding. It never brings a panel of its own.",
        "A missing value uses the words \"Not observed\" in tertiary ink with no mark, as batch 2 does for a table cell. The two are built at the same time; where they should share one component is in the pull request.",
        "Open: the gap between the label column and the value is space-4 (16px), as Opus drew it; Muse drew space-6, and the vote did not say. It is a one-line change.",
      ],
      tryIt: ["Compare the page, the card and the 22rem card: the last stacks because the list itself is narrow, not the window.", "Resize the window narrower than 480px: the first list stacks too."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <ListDemo />,
    },
    {
      id: "meter",
      name: "Meter",
      intro: "How much of a cap is used: a standing reading with units, a cap, what is left and, optionally, a target. Not Progress: a meter is never indeterminate and never counts toward a finish.",
      decisions: [
        "Decided: the head's reading with the cap's width reserved, and a foot row that is always there (3 to 0); an outlined 8px slot, 2 to 1 (grok: a filled 6px track); the fill gliding over duration-slow on ease-out, 2 to 1 (sol: it snaps), none under reduced motion; the target tick 2px in secondary ink, 4px past each side, with a 2px cut, 2 to 1 (sol: 2px primary, 2px past, a 1px knockout); the overage in words in primary ink with no status colour, 2 to 1 (opus: warning, or danger when the cap stopped something); aria-valuenow clamped to the cap with the true value and the overage in aria-valuetext, 3 to 0; the fill CanvasText in forced colours, 2 to 1 (opus: Highlight).",
        "The slot is transparent inside with a 1px border-input edge; the fill is text-primary from the start edge, inside the border, and stops at the slot's end over the cap. No red fill, no hatch, no zones, no indeterminate state.",
        "The foot is always one 16px line, so a state change never adds a line: what is left (\"760 min left\") or the overage in words (\"24,000 over\") at the start, the target's words with a 2px legend line at the end. The meter is the same height under the cap, at it, over it, and with or without a target (a test measures it).",
        "The target tick is the first vertical mark besides the pinned column's edge. Foundations now names it as a labelled scale tick: structure, never a selection, sort, active or status mark. The tick's cut is a border in the colour of the level it sits on, not a shadow, so forced colours keep it.",
        "role=\"meter\" named by its label, built on Base UI's Meter; not focusable and not live. The words are in the foot and in aria-valuetext, so the tick (aria-hidden) never carries meaning alone.",
        "Open: when the value is far over the cap (more digits than the cap) the reading is wider than the width it reserved, and the label can shift. The decision reserves the cap's width only.",
      ],
      tryIt: ["Press the values under the changing meter: only the fill moves.", "Compare the meter at 2,000 and 2,400 of 2,000: both are full, and the words differ.", "Switch to light: the slot and the tick keep their contrast."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <MeterDemo />,
    },
    {
      id: "stat",
      name: "Stat with provenance",
      intro: "The skill's figure, unchanged, with one more line under it: when it was read and where it came from.",
      decisions: [
        "Decided: the source line is sans 12/16 at 400 in tertiary ink with tabular numerals, pinned to the foot of the stat's cell, with the time written absolute (the clock for today, the date for another day, the year only when it differs), all 3 to 0; a row of stats is one dl, 2 to 1 (grok: plain elements).",
        "A row is one dl; each stat is a div whose label is the dt and whose figure, note and source are dds. The skill's look is unchanged: label 13/18 at 500, figure 24/30 at 600, note 12/16, space-1 between, never boxed.",
        "The time is a time element with a datetime. The middle dot is aria-hidden with a visually hidden comma, so it reads \"04:41, Scale\". With no source the slot is left out.",
        "Sources sit at one line across the row even when one stat has no note (a test measures it).",
      ],
      tryIt: ["Look at the three sources: they share a line although the middle stat has no note.", "Switch the theme: the source line is tertiary, the least read and most needed line."],
      states: ["forced-colours"],
      demo: () => <StatsDemo />,
    },
    {
      id: "terminal",
      name: "Terminal transcript",
      intro: "A sibling of CodeBlock on the same frame: commands behind a prompt, output, and results with the callout's marks. Static by default; live only while lines arrive.",
      decisions: [
        "Decided 3 to 0: result lines carry the callout's marks in the gutter (CheckCircle, Warning, XCircle, each named), with only an error's text in danger ink; no syntax colour in a transcript; the copy button is \"Copy commands\" and copies the commands only; a live transcript is a fixed height that scrolls inside, following new lines only while the reader is at the end, with a pause control for a replay.",
        "The gutter is 16px plus space-2, the prompt a real span, aria-hidden and user-select none, 2 to 1 (grok: 24px, the prompt generated from data-prompt). A generated prompt is read aloud as \"$\" in Chromium, so a selection and a screen reader take neither the prompt nor a mark.",
        "role=\"log\" is on only while lines arrive: never idle, paused or finished (Opus's and Muse's prototypes both got this wrong). The log has a fixed height of nine lines, so arriving lines never move the page. Every word that changes in place in the head reserves its widest form.",
        "Decided in a second round (decision 98, 2 to 1 on the finished head, 3 to 0 on the narrow head and the long prompt): a finished run's head keeps the callout's marks in the 16px seat (CheckCircle, and XCircle with \"Failed, exit 1\" in danger ink) with \"Done\" in secondary ink; under 30rem of the terminal's own width the copy button is the icon alone and keeps its name; an idle replay shows \"Press Play to start\" in tertiary ink and Play and Replay make the region a log first and show the first line one frame later; the gutter is one column, the prompt's width plus 1ch and at least 24px, for every line.",
        "Fixed in that round: an idle replay copies every command (it used to copy an empty string and say \"Copied\"), and the title row's hairline is a real CanvasText border in forced colours, for CodeBlock too.",
      ],
      tryIt: ["Press Play on the replay, then Pause: nothing arrives while it is paused. Scroll up while it runs: it stops following you.", "Select all in a transcript and copy: no $ and no mark in it. Press Copy commands: only the commands.", "Compare the paused and failed ones: neither is a log region."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <TerminalDemo />,
    },
    {
      id: "prompt",
      name: "CodeBlock with a prompt",
      intro: "An optional prompt for CodeBlock, in the same gutter the terminal uses.",
      decisions: [
        "Decided 3 to 0 (the shared gutter): an optional prompt (for example \"$\") puts every line in the gutter, and a continuation line after a trailing backslash gets an empty one. Copy still takes the code exactly as given.",
        "Without a prompt the block is exactly what it was: one run of text, no gutter.",
      ],
      tryIt: ["Press Copy and paste: the code has no $.", "Select all inside the block: the selection has no $ either."],
      states: ["forced-colours"],
      demo: () => <PromptDemo />,
    },
  ],
};
