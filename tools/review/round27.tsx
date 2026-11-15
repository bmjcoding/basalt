// Round 27: the engineering batch of the components stream (DECISIONS 133, components-eng-1): APIs the five site prototypes needed and Basalt
// already had underneath, opened up. No rendered pixel changes (the build's pixel comparison against main is in the PR), so there was no vote:
// AGENTS.md calls "a new prop or API that changes no pixel" engineering. Every demo here is built from what Basalt already draws; none is a new
// component. The design panel has not reviewed any of it, and nothing in it asks them to. Every word is synthetic.
//
// The states are real. "open" opens the popups in the demo; "open-forced-colours" and "open-reduced-motion" are the same page under those
// emulations (build.mjs sets them before the page loads). "sent" presses the status line's button twice. "choice-dark" and "choice-light" make
// the theme demo's choice before the shot; the default is `system`, which in the shots is the light scheme the browser starts in.

import * as React from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  Segment,
  SegmentedControl,
  StatusLine,
  Text,
  VisuallyHidden,
  createPopoverHandle,
  useTheme,
} from "../../packages/react/src/index";
import type { ThemeChoice } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const isOpen = (state: string) => state.startsWith("open");
// The menu has a state of its own, so a shot shows one popup at a time.

// ---- 1. A popover against something other than its trigger ----

function AnchoredDemo({ state }: { state: string }) {
  const figure = React.useRef<HTMLSpanElement>(null);
  const open = isOpen(state);
  // `state === "menu"`: the menu is the one open.
  return (
    <div style={{ ...col, minHeight: 420, maxWidth: 560 }}>
      {caption("The button opens it, but it sits against the figure: its start 24px along from the figure's start (alignOffset), and a gap of half the figure's height (a sideOffset function of the placement).")}
      <div style={{ ...row, justifyContent: "space-between", gap: 24, marginBottom: 120 }}>
        <Popover defaultOpen={open} modal={false}>
          <PopoverTrigger render={<Button variant="secondary">Explain the figure</Button>} />
          <PopoverContent anchor={figure} alignOffset={24} sideOffset={(data) => data.anchor.height / 2} style={{ width: 240 }}>
            <PopoverTitle>Median build time</PopoverTitle>
            <PopoverDescription>Across the last forty runs of the demo project, in minutes.</PopoverDescription>
          </PopoverContent>
        </Popover>
        <Text as="span" size="xl" weight="semibold" tabular><span ref={figure} style={{ display: "inline-block", padding: "4px 12px", border: "1px solid var(--basalt-border-input)", borderRadius: 8 }}>4m 12s</span></Text>
      </div>
      {caption("A menu takes the same props. This one is anchored to the figure too, 16px along, and opens from its own button.")}
      <div style={{ ...row, justifyContent: "space-between", gap: 24 }}>
        <Menu defaultOpen={state === "menu"}>
          <MenuTrigger render={<Button variant="secondary">Menu on the figure</Button>} />
          <MenuContent anchor={figure} alignOffset={16} sideOffset={() => 12}>
            <MenuItem>Copy value</MenuItem>
            <MenuItem>Show history</MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  );
}

// ---- 2. Collision rules ----

function CollisionDemo({ state }: { state: string }) {
  const [frame, setFrame] = React.useState<HTMLDivElement | null>(null);
  const chip = React.useRef<HTMLSpanElement>(null);
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption("The popover is 240px wide and its anchor is the chip at the end of a 320px frame. collisionBoundary is the frame, collisionPadding is 8, so it flips to end-aligned and stays inside the frame, not the window.")}
      <div ref={setFrame} style={{ position: "relative", boxSizing: "border-box", width: 320, height: 200, border: "1px solid var(--basalt-border-input)", borderRadius: 12, display: "flex", justifyContent: "flex-end", padding: 16 }}>
        <span ref={chip} style={{ alignSelf: "flex-start" }}><Badge>Edge case</Badge></span>
        {frame ? (
          <Popover defaultOpen={isOpen(state)} modal={false}>
            <PopoverTrigger render={<Button variant="secondary" size="sm" style={{ alignSelf: "flex-end" }}>Open note</Button>} />
            <PopoverContent anchor={chip} collisionBoundary={frame} collisionPadding={8} style={{ width: 240 }}>
              <PopoverTitle>Kept in the frame</PopoverTitle>
              <PopoverDescription>Its end meets the chip's end, so it stays in the frame.</PopoverDescription>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}

// ---- 3. One popover, three triggers ----

const NOTES = [
  { id: "t-north", label: "North", title: "North region", note: "Three runs waiting, none failing." },
  { id: "t-east", label: "East", title: "East region", note: "One run failing; the retry is queued." },
  { id: "t-west", label: "West", title: "West region", note: "Idle since the last deploy." },
];

function OneForManyDemo({ state }: { state: string }) {
  const [handle] = React.useState(() => createPopoverHandle<{ title: string; note: string }>());
  React.useEffect(() => {
    if (isOpen(state)) handle.open("t-east");
  }, [handle, state]);
  return (
    <div style={{ ...col, minHeight: 280, maxWidth: 560 }}>
      {caption("Three triggers, one Popover and one popup. Each trigger carries a payload; the content is a function of it. Open one, then another, and the popup moves to it. Esc returns focus to the trigger that opened it.")}
      <div style={row}>
        {NOTES.map((n) => <PopoverTrigger key={n.id} id={n.id} handle={handle} payload={{ title: n.title, note: n.note }} render={<Button variant="secondary">{n.label}</Button>} />)}
      </div>
      <Popover handle={handle} modal={false}>
        {({ payload }) => (
          <PopoverContent style={{ width: 260 }}>
            <PopoverTitle>{payload?.title}</PopoverTitle>
            <PopoverDescription>{payload?.note}</PopoverDescription>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}

// ---- 4. The polite status line ----

function StatusDemo({ state }: { state: string }) {
  const [message, setMessage] = React.useState("");
  const [sendId, setSendId] = React.useState(0);
  const [heard, setHeard] = React.useState<string[]>([]);
  const line = React.useRef<HTMLSpanElement>(null);
  const send = React.useCallback((text: string) => { setMessage(text); setSendId((n) => n + 1); }, []);
  React.useEffect(() => {
    const el = line.current;
    if (!el) return undefined;
    const observer = new MutationObserver(() => setHeard((all) => [...all, el.textContent ? `says “${el.textContent}”` : "is emptied"].slice(-6)));
    observer.observe(el, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    if (!state.startsWith("sent")) return undefined;
    const timers = [window.setTimeout(() => send("Draft saved"), 0), window.setTimeout(() => send("Draft saved"), 300)];
    return () => timers.forEach(window.clearTimeout);
  }, [state, send]);
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption("The button sends the same message each time. The line is hidden from the eye; the log below it shows what a screen reader's live region does: the same text sent again empties the line first, so it changes and is said again. (120 ms here; 400 by default.)")}
      <div style={row}>
        <Button variant="secondary" onClick={() => send("Draft saved")}>Save draft</Button>
        <Button variant="secondary" onClick={() => send("Draft archived")}>Archive draft</Button>
        <Text as="span" size="sm" tone="secondary">Sent {sendId} {sendId === 1 ? "time" : "times"}</Text>
      </div>
      <StatusLine ref={line} delay={120} sendId={sendId}>{message}</StatusLine>
      <Card>
        <CardHeader><CardTitle>The status line</CardTitle></CardHeader>
        <CardContent>
          {heard.length === 0 ? <Text size="sm" tone="secondary">Nothing yet. Press Save draft twice.</Text> : (
            <ol style={{ margin: 0, paddingInlineStart: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              {heard.map((entry, i) => <li key={`${i}-${entry}`}><Text as="span" size="sm">The line {entry}</Text></li>)}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- 5. Hidden text ----

function HiddenDemo() {
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption("The dash is for the eye and the word is for the ear: a screen reader says “Open 9:00 to 17:00”, and the line looks like “Open 9:00 – 17:00”.")}
      <Card>
        <CardContent>
          <Text>Open 9:00<VisuallyHidden> to </VisuallyHidden><span aria-hidden="true"> – </span>17:00</Text>
        </CardContent>
      </Card>
      {caption("The hidden words take no room: the line is as wide with them as without.")}
    </div>
  );
}

// ---- 6. The theme ----

function ThemeDemo({ state }: { state: string }) {
  // This page has its own theme control, which owns `<html data-theme>`. The hook writes that attribute too, so the demo reads what it wrote
  // and puts the page's own value back, and the framed specimen takes the hook's result.
  const page = React.useRef<string | null>(document.documentElement.getAttribute("data-theme"));
  const { theme, choice, setChoice, ready } = useTheme();
  const [written, setWritten] = React.useState<string | null>(null);
  const pin = React.useCallback(() => {
    setWritten(document.documentElement.getAttribute("data-theme"));
    const own = document.documentElement.dataset.theme;
    if (page.current && own !== page.current) document.documentElement.setAttribute("data-theme", page.current);
  }, []);
  React.useEffect(() => { pin(); });
  const choose = React.useCallback((next: ThemeChoice) => { setChoice(next); pin(); }, [setChoice, pin]);
  React.useEffect(() => {
    if (state === "choice-dark") choose("dark");
    if (state === "choice-light") choose("light");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <div style={{ ...col, maxWidth: 560 }}>
      {caption("Three choices drive one attribute. In an app the hook writes data-theme on the page's root; here the review page keeps its own theme, so the specimen takes the hook's result.")}
      <SegmentedControl aria-label="Theme choice" value={choice} onValueChange={(next) => choose(next as ThemeChoice)}>
        <Segment value="light">Light</Segment>
        <Segment value="dark">Dark</Segment>
        <Segment value="system">System</Segment>
      </SegmentedControl>
      <div data-theme={theme} style={{ background: "var(--basalt-surface-page)", color: "var(--basalt-text-primary)", border: "1px solid var(--basalt-border-input)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 12, colorScheme: theme }}>
        <Text weight="semibold">A specimen in the {theme} theme</Text>
        <div style={row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Badge status="success">Ready</Badge>
        </div>
      </div>
      <Text size="sm" tone="secondary" mono>useTheme(): theme {theme}, choice {choice}, ready {String(ready)}. Written to the root: data-theme="{written}".</Text>
    </div>
  );
}

export const ROUND_27: Round = {
  id: "27",
  title: "Placement, one popover for many triggers, the status line, hidden text and the theme",
  reviewed: false,
  summary:
    "The engineering batch of the components stream (DECISIONS 133): APIs the five site prototypes needed and Basalt already had underneath, opened up. Placement props on PopoverContent and MenuContent; one Popover for many triggers; VisuallyHidden; a general polite StatusLine; GlidePlate and useMediaQuery exported; and a theme hook with a head script. Nothing changes how anything is drawn: the pixel comparison against main is in the PR. There was no vote (a new prop or API that changes no pixel is engineering), and the design panel has not reviewed this. Every demo is built from what Basalt already draws. All words are synthetic.",
  steps: [
    {
      id: "placement-anchor",
      name: "A popover against something other than its trigger",
      intro: "anchor, alignOffset and sideOffset on PopoverContent and MenuContent. Left out, a popup sits against its trigger as it always has.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote: Base UI's positioner already took all of these. anchor is an element, a ref, a virtual element or a function; alignOffset and sideOffset are a number or a function of the placement. sideOffset is still 6 when left out.",
        "No leader line and no arrow: where the popup sits is all that changes.",
      ],
      tryIt: ["Press the button: the popover opens against the figure, not the button.", "Open the menu: it hangs from the figure too."],
      states: ["open", "menu", "open-forced-colours", "open-reduced-motion"],
      demo: ({ state }) => <AnchoredDemo state={state} />,
    },
    {
      id: "placement-collision",
      name: "Collision rules",
      intro: "collisionBoundary, collisionPadding, collisionAvoidance and sticky, passed to the positioner.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: ["Engineering, no vote. Base UI's own defaults stay: clipping ancestors, 5px of padding, flip then shift."],
      tryIt: ["Open the note: it stays inside the frame."],
      states: ["open", "open-forced-colours", "open-reduced-motion"],
      demo: ({ state }) => <CollisionDemo state={state} />,
    },
    {
      id: "one-popover",
      name: "One popover, three triggers",
      intro: "createPopoverHandle, and handle and payload on the triggers. One popup and one set of content, whichever trigger opened it.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: ["Engineering, no vote. triggerId and defaultTriggerId still work for triggers inside the Popover."],
      tryIt: ["Open North, then East: the popup moves.", "Press Esc: focus is back on the trigger that opened it."],
      states: ["open", "open-forced-colours", "open-reduced-motion"],
      demo: ({ state }) => <OneForManyDemo state={state} />,
    },
    {
      id: "status-line",
      name: "A polite status line that says a repeated message again",
      intro: "StatusLine: the live half of FilterResult for other uses. FilterResult renders the same DOM it did.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: ["Engineering, no vote. A screen reader announces only when the DOM changes, so a send of the same text empties the line for the delay and then fills it."],
      tryIt: ["Press Save draft twice: the log shows the line saying it, being emptied, and saying it again.", "Press Archive draft: a different message is just said."],
      states: ["sent", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <StatusDemo state={state} />,
    },
    {
      id: "visually-hidden",
      name: "Hidden text",
      intro: "VisuallyHidden: text for assistive technology that takes no room on screen.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 400,
      decisions: ["Engineering, no vote. It is the existing .basalt-visually-hidden class with a component and a README entry; the class's CSS is unchanged."],
      tryIt: ["Select across the line: the hidden word is not highlighted."],
      states: ["forced-colours", "reduced-motion"],
      demo: () => <HiddenDemo />,
    },
    {
      id: "theme",
      name: "The theme, as React state",
      intro: "useTheme and themeBootstrap, on the pattern of useLoops. The storage key and values are the HTML skill's.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 640,
      decisions: [
        "Engineering, no vote. No toggle component and no three-way control: those are with the council. The segmented control here is the demo's own.",
        "Before the client knows the theme (a server render and the first render of a hydrating page) the hook returns light, system, not ready.",
      ],
      tryIt: ["Choose Dark, then System: the specimen follows, and the readout says what the hook wrote to the root."],
      states: ["choice-dark", "choice-light", "forced-colours", "reduced-motion"],
      demo: ({ state }) => <ThemeDemo state={state} />,
    },
  ],
};
