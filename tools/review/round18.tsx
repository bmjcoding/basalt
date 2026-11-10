// Round 18: callouts, toasts and the notification centre. The council voted (decision 82, all four members) and the owner settled
// the open points (decision 83: the toast on the near-black level 1, the centre as a component). This is that design built as
// decided. The design panel has not reviewed this implementation.
//
// The states are real. "reduced-motion" and "forced-colours" are emulations that build.mjs sets before the page loads, and a state
// that ends in either takes the same emulation. "-lit" hovers the second row of the first popup (here, the second entry of the
// centre). The toast states show toasts as they are on a page, at the bottom of the screenshot: at 390 wide each stack is the bottom
// edge, full width, above the safe area.

import * as React from "react";

import {
  Button,
  Callout,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  NotificationCentre,
  useToast,
} from "../../packages/react/src/index";
import type { NotificationEntry } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

// ---- 1. callouts

const STATUSES = ["info", "success", "warning", "danger"] as const;
const COPY = {
  info: ["Records are kept for 30 days", "Older runs are archived and can be restored on request."],
  success: ["Sandbox is ready", "Its routes were published to iad1."],
  warning: ["Near the quota", "You have used 90% of this month's minutes."],
  danger: ["Build failed", "The run exited with code 1. The log has the last 200 lines."],
} as const;

function CalloutsDemo() {
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      <Caption>On the page (level 1)</Caption>
      {STATUSES.map((status) => <Callout key={status} status={status} title={COPY[status][0]}>{COPY[status][1]}</Callout>)}
      <Caption>In a card (level 2)</Caption>
      <Card style={{ width: "100%" }}>
        <CardHeader><CardTitle>Deploy</CardTitle></CardHeader>
        <CardContent>
          <div style={col}>
            {STATUSES.map((status) => <Callout key={status} status={status} title={COPY[status][0]}>{COPY[status][1]}</Callout>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 2. toasts

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function ToastsDemo({ state }: { state: string }) {
  const toast = useToast();
  const mode = state.replace(/-(forced-colours|reduced-motion)$/, "");
  React.useEffect(() => {
    if (mode === "default") return;
    // A toast that names a home times out, and so has its drain line; one that does not stays.
    if (mode === "neutral") toast.show({ title: "Settings saved", description: "Changes apply to new runs.", home: "page", timeout: 600_000 });
    if (mode === "success" || mode === "menu" || mode === "dialog") toast.show({ title: "Sandbox deployed", description: "blacksand-api is live in iad1.", status: "success", home: "centre", timeout: 600_000 });
    if (mode === "warning") toast.show({ title: "Route refused", description: "api.example.com isn't allowed for this run.", status: "warning", home: "centre", timeout: 600_000 });
    if (mode === "danger") toast.show({ title: "Run failed", description: "run-0143 exited with code 1.", status: "danger", action: { label: "Retry", onClick: () => {} }, home: "centre", timeout: 600_000 });
    if (mode === "running") toast.show({ title: "Publishing sandbox", description: "Uploading assets, step 2 of 4", running: true, home: "centre", timeout: 600_000 });
    if (mode === "resolved") {
      const id = toast.show({ title: "Publishing sandbox", description: "Uploading assets, step 2 of 4", running: true, home: "centre", timeout: 600_000 });
      void wait(250).then(() => toast.update(id, { title: "Sandbox published", description: "blacksand-api is live in iad1.", status: "success" }));
    }
    if (mode === "stack") {
      toast.show({ title: "Route saved", home: "page", timeout: 600_000 });
      toast.show({ title: "Key rotated", status: "success", home: "centre", timeout: 600_000 });
      toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed. Undo puts them back, with their keys and the last 30 days of runs.", action: { label: "Undo", onClick: () => {} } });
    }
    if (mode === "grouped") for (let i = 0; i < 3; i++) toast.show({ title: "Draft saved", group: "draft", status: "success", home: "row", timeout: 600_000 });
  }, [mode, toast]);

  const live = (
    <div style={col}>
      <Caption>Try each. A toast with no home stays until it is dismissed; one that names a home closes after five seconds, with its line.</Caption>
      <div style={row}>
        <Button onClick={() => toast.show({ title: "Settings saved", description: "Changes apply to new runs.", home: "page" })}>Neutral</Button>
        <Button onClick={() => toast.show({ title: "Sandbox deployed", description: "blacksand-api is live in iad1.", status: "success", home: "centre" })}>Success</Button>
        <Button onClick={() => toast.show({ title: "Route refused", description: "api.example.com isn't allowed for this run.", status: "warning", home: "centre" })}>Warning</Button>
        <Button onClick={() => toast.show({ title: "Run failed", description: "run-0143 exited with code 1.", status: "danger", action: { label: "Retry", onClick: () => {} }, home: "centre" })}>Danger</Button>
      </div>
      <div style={row}>
        <Button onClick={() => void toast.promise(wait(2500), { running: "Publishing sandbox", success: { title: "Sandbox published", status: "success", home: "centre" }, error: "Could not publish" })}>Running, then its result</Button>
        <Button onClick={() => { for (let i = 0; i < 3; i++) toast.show({ title: "Draft saved", group: "draft", status: "success", home: "row" }); }}>Same thing three times</Button>
        <Button onClick={() => toast.show({ title: "Sandbox deleted", description: "blacksand-api and its routes were removed.", action: { label: "Undo", onClick: () => {}, keys: "Meta+Z" } })}>Delete (Undo stays)</Button>
        <Button onClick={() => { for (const title of ["One", "Two", "Three", "Four", "Five"]) toast.show({ title, home: "page" }); }}>Five at once (the limit is three)</Button>
      </div>
    </div>
  );

  if (mode === "menu") {
    return <div style={col}><Menu defaultOpen modal={false}><MenuTrigger render={<Button>Actions</Button>} /><MenuContent><MenuItem>Duplicate</MenuItem><MenuItem>Rename</MenuItem><MenuItem danger>Delete</MenuItem></MenuContent></Menu></div>;
  }
  if (mode === "dialog") {
    return <Dialog defaultOpen><DialogContent><DialogTitle>Publish sandbox</DialogTitle><DialogDescription>The toast is above the dialog and does not take its level from it.</DialogDescription></DialogContent></Dialog>;
  }
  return live;
}

// ---- 3. the notification centre

const ENTRIES: NotificationEntry[] = [
  { id: "1", title: "Deploy finished", description: "blacksand-api, production", time: "2m ago", status: "success", unread: true },
  { id: "2", title: "Run failed", description: "run-0143 exited with code 1", time: "1h ago", status: "danger", unread: true },
  { id: "3", title: "Route refused for api.example.com, which this run may not reach", description: "Blocked by the egress policy for this sandbox", time: "Yesterday", status: "warning", unread: true },
  { id: "4", title: "Invite sent", description: "dana@example.com", time: "Mon" },
  { id: "5", title: "Key rotated", description: "agent-tools, 3 sandboxes updated", time: "Sun", status: "success" },
];

function CentreDemo({ state }: { state: string }) {
  const [entries, setEntries] = React.useState(ENTRIES);
  const open = state !== "default";
  React.useEffect(() => {
    if (!state.startsWith("open-focus")) return;
    const timer = window.setTimeout(() => document.querySelectorAll<HTMLElement>(".basalt-notification")[1]?.focus(), 400);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div style={{ ...col, minHeight: open ? 560 : undefined }}>
      <Caption>{open ? "The centre open: three unread (a dot, primary ink) and two read (the dot's seat empty, secondary ink)" : "Closed, with a dot because something is unread. The count is in the button's name."}</Caption>
      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
        <NotificationCentre
          entries={entries}
          defaultOpen={open}
          onMarkAllRead={() => setEntries((all) => all.map((entry) => ({ ...entry, unread: false })))}
        />
      </div>
      {open ? null : (
        <div style={row}>
          <Button variant="secondary" onClick={() => setEntries(ENTRIES)}>Reset</Button>
          <Caption>Open it and press Mark all as read: every row stays exactly where it is.</Caption>
        </div>
      )}
    </div>
  );
}

export const ROUND_18: Round = {
  id: "18",
  title: "Callouts, toasts and the notification centre",
  reviewed: false,
  summary:
    "The council voted (decision 82, all four members) and the owner settled the open points (decision 83: the toast on the near-black level 1, and the centre as a component). Callouts draw a 45% status rim with no tint. Toasts are level 1, take marks in a 16px seat, update in place, time out only when they are not the only copy, and announce only their result. The notification centre is the durable copy that lets a toast go. This is the decided design built; the design panel has not reviewed this implementation. The multi-select and the table are a separate build.",
  steps: [
    {
      id: "callouts",
      name: "Callouts: a 45% status rim, no tint",
      intro: "Success, warning and danger draw the rim in their status colour, mixed in sRGB at 45% over the callout's own level. The fill stays neutral. Info keeps the neutral rim.",
      decisions: [
        "Decided 4 to 0 (decision 82): a 45% status rim and no tint. Muse held it; Sol, Grok and Opus moved to it from the 10% tint. The owner's preference for the hairline was one input among four.",
        "The rim is one solid colour on every side, the danger Button's hairline recipe, in both themes. It is decorative (about 1.7 to 2.8:1, pinned in the contrast tests): the icon (3:1) and the words (4.5:1) carry the status, and those pairs are proved on every level a callout can sit on.",
        "The icon takes the status colour. Only danger's title does, and the body stays secondary. Info and a plain note keep the neutral rim and a secondary icon. No fill is tinted.",
        "\"Danger is text plus a hairline in the danger colour, never a red fill\" stands word for word, and the panel rim rule gains one sentence for the status rim. A toast takes neither the rim nor a tint.",
        "Forced colours: the rim and the icon are CanvasText, so the status is the icon's shape and the words.",
      ],
      tryIt: ["Switch the theme: the light rim is the faintest, and the icon and the words still carry the status.", "Compare the page and the card: the rim is mixed over each callout's own level."],
      states: ["forced-colours"],
      demo: () => <CalloutsDemo />,
    },
    {
      id: "toasts",
      name: "Toasts",
      intro: "Level 1 and fixed, never tinted. A mark in a 16px seat says the status beside the words. Running work updates in place. A toast that is the only copy of what it says stays.",
      decisions: [
        "The surface is level 1 (#0a0a0a in dark), fixed, with its rim and shadow-overlay: \"Near-black, like menus\" (the owner, decision 83, overruling the no-majority default of level 3). It is portalled and does not sense what is under it, so over a level-2 menu it is a step darker than what it covers; the rim answers that. Light is unchanged.",
        "Marks (4 to 0): CheckCircle for success, Warning for warning, XCircle for danger, in a 16px seat; danger's title is danger ink; neutral has no mark and no empty seat. The marks are icons, so they keep their shapes in forced colours (the prototype's dots vanished).",
        "Running (4 to 0): braille sits in the seat and the step text is not announced; the same toast updates to its result and the title does not move (a test measures its x at 0px through to the result); the seat is kept even for an unmarked result; its clock starts at the result.",
        "How long it lives (4 to 0): five seconds only when the toast is not the only copy. The API makes the safe default hard to get wrong: with no `home` a toast stays and cannot be given a timeout (a type error, and ignored at run time); a `home` (the centre, the row in place, the app's key, or the page) is what earns the five seconds; and an action needs a home that is not the page. There is no ⌘Z chip: the app's key goes in aria-keyshortcuts.",
        "What is announced (danger assertive 3 to 1, the rest polite): only the result, once, from two text-only live regions that exist before the first toast. The visible stack is a named region (F6) and is not live, so nothing is read twice.",
        "The stack (limit 3, 4 to 0): the cards behind peek at the shipped .05 scale and the frontmost toast's height, so they show even behind a taller one. A visibility limit never removes a focused toast or the only copy: the newcomer waits in a queue and enters as room appears; a timed toast is closed instead, oldest first. Repeats group (\"×3\") and errors never do.",
        "Placement: bottom right at space-4; at 390 the bottom edge, full width, above the safe area. Swipe: Base UI's 40px, by distance alone, no spring. The drain pauses on hover, on focus, in a blurred window and in a hidden tab, and is not drawn under reduced motion. Enter on duration-slow with ease-out, leave at 0.75 with ease-in, opacity only under reduced motion.",
        "Open for the owner: a queued toast is announced when it enters the stack, not when it is queued; repeats group on an explicit `group` key rather than by matching titles (identical titles alone are not a safe key, Sol); and the running toast is not announced at its start, only at its result, as decided.",
      ],
      tryIt: [
        "Press Running, then its result: the title stays where it is while braille becomes a check.",
        "Press Five at once: three show and the rest are closed (they are timed, so nothing is lost).",
        "Press Delete (Undo stays): it has no home, so it stays and has no line. Hover the stack to expand it.",
        "Drag a toast sideways: under 40px it returns, over it goes.",
      ],
      states: ["neutral", "success", "warning", "danger", "running", "resolved", "stack", "grouped", "menu", "dialog", "success-forced-colours", "stack-forced-colours", "running-reduced-motion", "stack-reduced-motion"],
      demo: ({ state }) => <ToastsDemo state={state} />,
    },
    {
      id: "centre",
      name: "The notification centre",
      intro: "A bell with a dot opens the durable record: unread and read entries, \"Mark all as read\" and \"View all\". It is what lets a toast time out.",
      decisions: [
        "A component (the owner, decision 83; the vote was 2 to 2). The button is a 32px IconButton with a bell and a 6px ink dot when anything is unread. The count is in its accessible name (\"Notifications, 3 unread\") and never drawn, so the button never changes width.",
        "The popup is a Popover at its opener's level plus one: a header band (the title, the count, \"Mark all as read\"), the entries, and a footer (\"View all\"). The app owns the data, persistence and the \"View all\" page; the component is presentational, with callbacks.",
        "An entry has four seats: a 6px dot, the status mark (the toast's marks, always reserved so titles line up), the words and the time. Unread is the dot and primary ink with no weight change; read is the same row with the dot's seat empty and the title in secondary ink, so \"Mark all as read\" moves nothing (a test measures every row and part at 0px).",
        "Rows use #27's popup-row geometry and plate. They are links or buttons, not options, so keyboard focus is foundations' focusable-row rule: the ring at +2 from the plate, and the list keeps at least space-1-5 from its edge. \"Mark all as read\" stays in place and keeps focus when nothing is left.",
        "Open for the owner: the hover glide is not decided for this list, so each row paints its own plate. And the status mark seat is reserved on every row (so titles line up whether or not a row has a mark), which leaves an empty 16px seat on neutral entries.",
        "The centre is the durable copy: a toast may time out when the same information, and any action, also lives here (`home: \"centre\"`), for as long as the action is valid.",
      ],
      tryIt: [
        "Open the centre and press Mark all as read: the dot goes and nothing moves.",
        "Tab through it: the bell, Mark all as read, each entry, View all. Esc closes and returns focus to the bell.",
        "Hover a row: its own plate. The long title is cut with an ellipsis.",
      ],
      states: ["open", "open-lit", "open-focus", "open-forced-colours-lit", "open-reduced-motion"],
      demo: ({ state }) => <CentreDemo state={state} />,
    },
  ],
};
