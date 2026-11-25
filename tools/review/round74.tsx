// Round 74: cimip-gaps-3 batch E2 (focus, keys and live regions; engineering, no panel). Most of the batch is behaviour and speech, which draws nothing. Three
// things in it move a pixel, in states only: a dot-separated line that wraps keeps its dot at the end of the line and starts the next with a word (beside a
// badge too); after F6 focus is on the newest toast's action (its own control ring) and not the stack's region; and AppHeader's title, now a place focus can
// land, draws no ring when it holds focus. Built by Opus; not reviewed; the browser tests are written and not run (DECISIONS 359).
//
// The "today" side of the dots is this build with the batch's two wrapping rules taken back, scoped to that side, so the two differ only where the batch does.

import * as React from "react";

import { AppHeader, Badge, Button, DotLine, ToastProvider, useToast } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const PAIR = ".r74-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r74-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }";
const UNDO = ".r74-today .basalt-dot-sep[data-spaced]::before { white-space: normal !important; } .r74-today .basalt-dot-keep { white-space: normal !important; }";

// Two unlike domains: a bakery's orders and a photo library's exports. Each line is drawn in columns of a few widths, so some wrap at a dot.
const LINES: React.ReactNode[][] = [
  [<Badge key="s" status="success">Ready</Badge>, "Order 4127", "Pickup at 9:30"],
  ["Sourdough, two loaves", "Rye", "Seeded"],
  [<Badge key="s" status="warning">Paused</Badge>, "34 photos", "Album: Lisbon trip"],
  ["Exported to the shared drive", "12 MB", "JPEG"],
];

function Lines({ today }: { today: boolean }) {
  return (
    <div className={today ? "r74-today" : undefined} style={{ minWidth: 0 }}>
      <p style={label}>{today ? "Today (main): a wrapped line may start with the dot" : "This build: the dot stays with the fact before it"}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--basalt-space-4)" }}>
        {["8.5rem", "10rem", "11.5rem"].map((width) => (
          <div key={width} style={{ width, display: "grid", gap: "var(--basalt-space-3)", fontSize: "var(--basalt-text-sm-size)", lineHeight: "var(--basalt-text-sm-line-height)", color: "var(--basalt-text-secondary)", boxShadow: "inset 0 0 0 var(--basalt-size-hairline) var(--basalt-border-divider)" }}>
            {LINES.map((line, index) => <p key={index} style={{ margin: 0 }}><DotLine>{line}</DotLine></p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <div className="r74-pair">
      <style>{`${PAIR} ${UNDO}`}</style>
      <Lines today />
      <Lines today={false} />
    </div>
  );
}

function Toasts({ state }: { state: string }) {
  const toast = useToast();
  React.useEffect(() => {
    toast.show({ title: "Order 4127 canceled", action: { label: "Undo", onClick: () => {} } });
    toast.show({ title: "34 photos exported" });
    // The shot after F6: the key itself cannot be pressed from here, so focus goes where F6 now takes it.
    if (state === "after-f6") window.setTimeout(() => document.querySelector<HTMLElement>(".basalt-toast-action")?.focus({ focusVisible: true } as FocusOptions), 400);
  }, [state, toast]);
  return <p style={label}>Two toasts, the newer without an action. F6 lands on Undo, the newest action.</p>;
}

function Title({ state }: { state: string }) {
  const title = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    if (state === "landed") title.current?.focus();
  }, [state]);
  return <AppHeader solid title="Orders" titleRef={title} facts={[<Badge key="s" status="success">Open</Badge>, "Today"]} actions={<Button variant="ghost" size="sm">Export</Button>} />;
}

const NOT_REVIEWED = "Engineering batch E2 of cimip-gaps-3 (the owner's handoff, DECISIONS 385): no panel; built by Opus and not reviewed. The browser tests are written and not run (DECISIONS 359).";

export const ROUND_74: Round = {
  id: "74",
  title: "cimip-gaps-3 E2: focus, keys and live regions",
  reviewed: false,
  summary:
    "Batch E2 is engineering: a toast is a group and not a dialog, F6 reaches its action, the composer speaks \"is typing\" only to the person writing, dot-separated text reads \"A, B\", route focus wins over a closing dialog, and new props for route focus, SkipLink, NotificationCenter, the focus net, the shortcuts and SearchField. What draws differently is in states: a wrapped dot line, focus after F6, and the app title holding focus. Not reviewed; tests written, not run.",
  steps: [
    {
      id: "dots",
      name: "A wrapped line never starts with the dot",
      intro: "The same lines in columns of three widths: today's (on a phone, above) and this build's. Where a line wraps at a dot, the dot ends the line and the next starts with a word, beside a badge too.",
      decisions: [
        "A spaced dot's own spaces do not wrap, so it keeps to the word before it; where it starts a box (a flex item) its leading space is still dropped.",
        "DotLine holds an element fact (a badge, drawn as an inline block, after which a browser may always break) and its dot in one span that does not wrap; the fact itself wraps as the line does. A line that never wraps sets --basalt-dot-line-wrap: nowrap (AppHeader's facts).",
        "The read \", \" is inline text drawn at no size (basalt-said), so the text reads \"Ready, Order 4127, Pickup at 9:30\" with no space before a comma; nothing about it is drawn.",
        NOT_REVIEWED,
      ],
      tryIt: ["Narrow the window: no line in this build's columns starts with \"·\"."],
      widths: [1440, 390],
      height: 620,
      demo: () => <Dots />,
    },
    {
      id: "toast-f6",
      name: "F6 lands on the newest toast's action",
      intro: "The spoken hint says \"Undo is available. Press F6 to reach it.\" F6 used to stop on the stack's region; it now goes on to the newest action, which draws its own control ring.",
      decisions: [
        "With no toast that has an action, F6 lands on the region as before, and the region's ring on the front toast (DECISIONS 156) is unchanged.",
        "The toast's root is a named group, not a dialog: it never counts as an open dialog (isOverlayOpen), so single keys and the focus net carry on while a toast shows.",
        NOT_REVIEWED,
      ],
      tryIt: ["Show the toasts, press F6: focus is on Undo. Tab and Shift+Tab move as before."],
      states: ["after-f6"],
      widths: [1440, 390],
      height: 520,
      demo: ({ state }) => <ToastProvider><Toasts state={state} /></ToastProvider>,
    },
    {
      id: "title",
      name: "AppHeader's title holds focus with no ring",
      intro: "The h1 takes tabIndex -1 and titleRef, so useRouteFocus and useFocusNet can land on it. Nothing operates it, so it draws no ring, as a dialog's title does.",
      decisions: ["Not a tab stop. The ring rule is restored behaviour: useRouteFocus has always said the title takes focus \"with no ring\".", NOT_REVIEWED],
      tryIt: ["Change the page in an app on Basalt: the title takes focus and nothing is drawn."],
      states: ["landed"],
      widths: [1440, 390],
      height: 240,
      demo: ({ state }) => <Title state={state} />,
    },
  ],
};
