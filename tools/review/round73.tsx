// Round 73: cimip-gaps-3 batch E3 (engineering, no panel). The parts of the batch that change a pixel: ShareBar's words no longer break inside a word,
// the stream's text column declares its start room so a ghost `Button edge="start"` hangs, and Textarea's opt-in `autosize`. Callout's `heading` is shown
// beside the plain title, to show that it draws the same. Built by Opus; not reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Each "today" side is this build with the batch's one rule taken back, scoped to that side, so the two differ only where the batch does.

import * as React from "react";

import { Button, Callout, ShareBar, Stream, StreamMessage, Textarea } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const PAIR = ".r71-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r71-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";

function Side({ today, children, what }: { today: boolean; children: React.ReactNode; what: [string, string] }) {
  return (
    <div className={today ? "r71-today" : undefined} style={{ minWidth: 0 }}>
      <p style={label}>{today ? what[0] : what[1]}</p>
      {children}
    </div>
  );
}

function Pair({ undo, what, children }: { undo: string; what: [string, string]; children: React.ReactNode }) {
  return (
    <div className="r71-pair">
      <style>{`${PAIR} ${undo}`}</style>
      <Side today what={what}>{children}</Side>
      <Side today={false} what={what}>{children}</Side>
    </div>
  );
}

// Two unlike domains: a build server's queue and a recipe box's week.
const QUEUE = [
  { name: "Waiting for a runner", value: 41 },
  { name: "Working", value: 2 },
  { name: "Queued", value: 1 },
];
const WEEK = [
  { name: "Weeknight dinners", value: 9 },
  { name: "Baking", value: 1 },
  { name: "Preserves", value: 1 },
];

function Shares() {
  return (
    <Pair undo=".r71-today .basalt-share-name { overflow-wrap: anywhere !important; } .r71-today .basalt-share-value { white-space: normal !important; }" what={["Today (main): a name may break anywhere", "This build: names break only between words"]}>
      <div style={{ display: "grid", gap: "var(--basalt-space-6)" }}>
        <ShareBar size="md" parts={QUEUE} />
        <ShareBar size="md" parts={WEEK} format={(share) => `${share} percent`} />
      </div>
    </Pair>
  );
}

function Edge({ state }: { state: string }) {
  const button = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (state === "focused") document.querySelector<HTMLButtonElement>(".r71-pair > :last-child .r71-edge")?.focus();
  }, [state]);
  return (
    <Pair undo=".r71-today .basalt-stream-body { --basalt-edge-room-start: initial; }" what={["Today (main): no room declared, the button does not hang", "This build: it hangs into the gutter's gap"]}>
      <Stream>
        <StreamMessage author="Build server" time="09:12">
          <p style={{ margin: 0 }}>Deploy of web #212 finished in 4 min 10 s.</p>
          <Button ref={button} className="r71-edge" variant="ghost" size="sm" edge="start">Open the log</Button>
        </StreamMessage>
        <StreamMessage author="Ines Moreau" time="18:40">
          <p style={{ margin: 0 }}>The plum jam set overnight; I wrote the times down.</p>
          <Button className="r71-edge" variant="ghost" size="sm" edge="start">Show the recipe</Button>
        </StreamMessage>
      </Stream>
    </Pair>
  );
}

const METHOD = "Halve the plums and take the stones out.\nWeigh them, then add half their weight in sugar.\nLeave overnight.\nBoil hard for 8 minutes.\nTest a spoonful on a cold plate.\nPot while hot.";

function Fields() {
  return (
    <div className="r71-pair">
      <style>{PAIR}</style>
      <div style={{ minWidth: 0, display: "grid", gap: "var(--basalt-space-3)" }}>
        <p style={label}>Textarea, rows 3, as today (no autosize)</p>
        <Textarea aria-label="Method" rows={3} defaultValue={METHOD} />
        <p style={label}>Callout, plain title</p>
        <Callout status="warning" title="The runner pool is full">New builds wait until one frees up.</Callout>
      </div>
      <div style={{ minWidth: 0, display: "grid", gap: "var(--basalt-space-3)" }}>
        <p style={label}>Textarea autosize, rows 2 to maxRows 5: one line, then six lines (capped, scrolls)</p>
        <Textarea aria-label="Note" autosize rows={2} maxRows={5} defaultValue="Use the big pan." />
        <Textarea aria-label="Method, grown" autosize rows={2} maxRows={5} defaultValue={METHOD} />
        <p style={label}>Callout heading={"{3}"}: the title is an h3, drawn the same</p>
        <Callout status="warning" heading={3} title="The runner pool is full">New builds wait until one frees up.</Callout>
      </div>
    </div>
  );
}

const NOT_REVIEWED = "Engineering batch E3 of cimip-gaps-3 (the owner's handoff, DECISIONS 385): no panel; built by Opus and not reviewed. The browser tests are written and not run (DECISIONS 359).";

export const ROUND_73: Round = {
  id: "73",
  title: "cimip-gaps-3 E3: the pixels the engineering batch moves",
  reviewed: false,
  summary:
    "Batch E3 is engineering (props, faults and restored behaviour). Three things in it change a pixel, shown here beside today's: ShareBar's names no longer break inside a word and its shares stay on one line; the stream's text column declares its start room, so a ghost Button edge=\"start\" in a message hangs into the gutter's gap; Textarea's opt-in autosize. Callout heading is shown to draw the same as the plain title. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "share-words",
      name: "ShareBar: a name breaks only between words",
      intro: "A part is as wide as its words at least; with a name allowed to break anywhere, that width fell to one letter. Today's above (on a phone) or on the left, this build's after it.",
      decisions: ["The name is overflow-wrap: normal and the share white-space: nowrap, set on the part so a page's own overflow-wrap does not reach in (the sort's A7).", "A word wider than the bar's room now widens its part (taken from the others); a name of several words still wraps between them.", NOT_REVIEWED],
      tryIt: ["Narrow the window: \"Working\" and \"Queued\" stay whole words; the long names wrap between words."],
      widths: [1440, 390],
      height: 520,
      demo: () => <Shares />,
    },
    {
      id: "stream-edge",
      name: "The stream's text column declares its edge room",
      intro: "A ghost Button edge=\"start\" puts its words on the text's line and hangs its box into the room its container declares. A message's text column now declares the gutter's gap (space-3).",
      decisions: ["--basalt-edge-room-start: space-3 on .basalt-stream-body; its end room is left to the stream's container (the message's end is the stream's).", "The hang is min(the button's inset, 12); the ring is +2 where 4 is left, else -2, by the edge rule.", NOT_REVIEWED],
      tryIt: ["Hover a button: its plate starts in the gap, never over the avatar.", "Tab to it: its ring."],
      states: ["focused"],
      widths: [1440, 390],
      height: 560,
      demo: ({ state }) => <Edge state={state} />,
    },
    {
      id: "fields",
      name: "Textarea autosize, and Callout heading",
      intro: "Textarea autosize grows with its text a line at a time from rows to maxRows, then scrolls, with no resize handle (Composer's field, the same rule and fallback). Callout heading draws its title as a heading of that level, looking the same.",
      decisions: ["Opt-in: a Textarea without autosize is unchanged (its rows and its resize handle).", "The bounds are rows and max(rows, maxRows) lines, default maxRows 8; a browser without field-sizing is measured, as Composer is.", NOT_REVIEWED],
      tryIt: ["Type into the autosized fields: they grow to five lines, then scroll."],
      widths: [1440, 390],
      height: 900,
      demo: () => <Fields />,
    },
  ],
};
