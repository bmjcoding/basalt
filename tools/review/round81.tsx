// Round 81: cimip-gaps-3 topic t7, cut content fades, built from the council's decision as revised (cimip-gaps-3/t7/decision.md) and the owner's answers
// (DECISIONS 397: six cuts kept unfaded; DECISIONS 399: code, bodies and the contrast exception as Fable answered). Built by Opus; the implementation has not
// been reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Every shot has a "before" state: the same page with `data-fades="off"` on the root, which is the cut as it shipped (the switch the decision adds turns every
// mask off and nothing else). The ports are scrolled to the middle of their content so both sides that hide something show their band.

import * as React from "react";

import {
  Button,
  CodeBlock,
  CommandList,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Segment,
  SegmentedControl,
  Sheet,
  SheetActions,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tab,
  Tabs,
  TabsList,
  Terminal,
} from "../../packages/react/src/index";
import type { CommandGroup } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-6)", minWidth: 0 };
const NOT_REVIEWED = "Built from the council's t7 decision as revised (DECISIONS 397 to 399); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";

/** "before" (and any state that starts with it) is the shipped cut: every mask off at the root. Ports are scrolled once they have laid out. */
function useState81(state: string, scroll: () => void) {
  React.useLayoutEffect(() => {
    const before = state.startsWith("before") || state.endsWith("-before");
    if (before) document.documentElement.setAttribute("data-fades", "off");
    else document.documentElement.removeAttribute("data-fades");
    // Once laid out, and again once a popup has opened and placed itself (a menu positions after its first frame). The menu is 282 tall: 280 inside its rim, seven rows, so with its top edge through a row's middle its bottom edge runs through one too.
    const timers = [window.setTimeout(scroll, 120), window.setTimeout(scroll, 600)];
    return () => { timers.forEach((t) => window.clearTimeout(t)); document.documentElement.removeAttribute("data-fades"); };
  }, [state, scroll]);
}
const middle = (selector: string, axis: "x" | "y") => () => {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (axis === "x") el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2 * (getComputedStyle(el).direction === "rtl" ? -1 : 1);
    else el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  }
};

const NOTHING = () => {};
const SCROLL_1 = middle(".basalt-code-pre", "x");
/**
 * Scrolls each port so its top edge runs through the middle of a row (or of a paragraph's first line) near its middle: a row is actually cut at the top, and
 * the bottom edge, which lands wherever the port's height puts it, cuts one too. A row's offsetTop is read from the port, which every port here is the offset
 * parent of (or lines up with).
 */
const cut = (selector: string, rows: string) => () => {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const mid = (el.scrollHeight - el.clientHeight) / 2;
    const row = [...el.querySelectorAll<HTMLElement>(rows)].filter((r) => r.offsetTop <= mid).pop();
    if (!row) continue;
    // A paragraph is cut through a line; a row (one line of words in a taller box) through its middle.
    const line = row.matches("p") ? parseFloat(getComputedStyle(row).lineHeight) || row.offsetHeight : row.offsetHeight;
    const lines = Math.max(0, Math.min(Math.floor((mid - row.offsetTop) / line), Math.round(row.offsetHeight / line) - 1));
    el.scrollTop = row.offsetTop + lines * line + line / 2;
  }
};
const SCROLL_2 = cut(".basalt-menu-scroll, .basalt-command-list", ".basalt-menu-item, [cmdk-item]");
const SCROLL_3 = cut(".basalt-sheet-body, .basalt-sheet-scroll", "p");

// ---- Two unlike domains: a recipe box and a greenhouse ----

const RECIPES = ["Bread", "Soups", "Salads", "Pickles", "Preserves", "Pastry", "Noodles", "Curries", "Dumplings", "Grills", "Desserts", "Drinks"];
const BENCHES = ["North bench", "South bench", "Propagation", "Cold frame", "Seed trays", "Hanging baskets", "Potting shed", "Compost", "Water butts"];
const LOG = Array.from({ length: 18 }, (_, i) => `Bench ${i + 1}: misted the seedlings, read the humidity at ${60 + (i % 9) * 2}% and moved the ferns away from the vent before the night's cold.`);

function TabRows({ state }: { state: string }) {
  useState81(state, NOTHING);
  const [recipe, setRecipe] = React.useState("Pastry");
  const [bench, setBench] = React.useState("Cold frame");
  return (
    <div style={{ ...stack, maxWidth: 360 }}>
      <div>
        <p style={label}>A recipe box's sections, the chosen one in the middle of the row</p>
        <Tabs value={recipe} onValueChange={(v) => setRecipe(String(v))}><TabsList aria-label="Sections">{RECIPES.map((r) => <Tab key={r} value={r}>{r}</Tab>)}</TabsList></Tabs>
      </div>
      <div dir={state.includes("rtl") ? "rtl" : undefined}>
        <p style={label}>A greenhouse's benches{state.includes("rtl") ? ", right to left" : ""}</p>
        <Tabs value={bench} onValueChange={(v) => setBench(String(v))}><TabsList aria-label="Benches">{BENCHES.map((b) => <Tab key={b} value={b}>{b}</Tab>)}</TabsList></Tabs>
      </div>
    </div>
  );
}

function Segments({ state }: { state: string }) {
  useState81(state, NOTHING);
  const [recipe, setRecipe] = React.useState("Pickles");
  const [bench, setBench] = React.useState("Seed trays");
  return (
    <div style={{ ...stack, maxWidth: 300 }}>
      <div>
        <p style={label}>Wider than its column: the track keeps its fill and corners, the port fades</p>
        <SegmentedControl aria-label="Sections" value={recipe} onValueChange={setRecipe}>{RECIPES.slice(0, 8).map((r) => <Segment key={r} value={r}>{r}</Segment>)}</SegmentedControl>
      </div>
      <div>
        <p style={label}>A greenhouse's benches</p>
        <SegmentedControl aria-label="Benches" value={bench} onValueChange={setBench}>{BENCHES.map((b) => <Segment key={b} value={b}>{b}</Segment>)}</SegmentedControl>
      </div>
      <div>
        <p style={label}>One that fits: no mask, the same size and place as before</p>
        <SegmentedControl aria-label="Range" defaultValue="Week"><Segment value="Day">Day</Segment><Segment value="Week">Week</Segment><Segment value="Month">Month</Segment></SegmentedControl>
      </div>
    </div>
  );
}

const SCRIPT = [
  "mist --bench north --humidity 72",
  "for (const bench of benches) { schedule(bench, { misting: \"every 40 minutes\", vents: \"closed after dusk\", lights: \"sixteen hours\" }); }",
  "vent --close --after dusk",
  "log --bench north --note \"ferns moved away from the vent\" --by grower",
].join("\n");
const RECIPE = [
  "const dough = mix({ flour: \"500 g\", water: \"350 g\", salt: \"10 g\", starter: \"100 g\", rest: \"30 minutes before the first fold\" });",
  "bake(dough, { oven: 240, steam: true, minutes: 40 });",
].join("\n");

function Code({ state }: { state: string }) {
  useState81(state, SCROLL_1);
  return (
    <div style={{ ...stack, maxWidth: 520 }}>
      <div><p style={label}>Untitled: the Copy rows end at the button's start edge; the rows below fade at the edge</p><CodeBlock code={SCRIPT} language="bash" /></div>
      <div><p style={label}>Titled: the ring is the whole block's; the line of words stays</p><CodeBlock title="bread.ts" code={RECIPE} language="ts" /></div>
      <div><p style={label}>A transcript: no line of words; it fades on both axes while lines arrive</p>
        <Terminal title="Greenhouse run" lines={LOG.slice(0, 4).map((text, i) => (i === 0 ? { kind: "command" as const, text: "water --all-benches --verbose --log /var/log/greenhouse/watering-schedule.txt" } : { kind: "output" as const, text }))} />
      </div>
    </div>
  );
}

const PANTRY: CommandGroup[] = [
  { label: "Recipes", commands: RECIPES.map((r) => ({ id: r, label: r, description: `${r} from the recipe box`, onSelect: () => {} })) },
  { label: "Benches", commands: BENCHES.map((b) => ({ id: b, label: b, onSelect: () => {} })) },
];

function Lists({ state }: { state: string }) {
  useState81(state, SCROLL_2);
  return (
    <div style={{ display: "flex", gap: "var(--basalt-space-6)", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div style={{ width: 320 }}><p style={label}>The command list, scrolled down</p><CommandList label="Pantry" groups={PANTRY} /></div>
      <div><p style={label}>A menu held open: its rim is the popup's, the rows fade</p>
        <Menu open modal={false}><MenuTrigger render={<Button>Benches</Button>} /><MenuContent side="bottom" style={{ maxHeight: 282 }}>{[...BENCHES, ...RECIPES].map((b) => <MenuItem key={b}>{b}</MenuItem>)}</MenuContent></Menu>
      </div>
    </div>
  );
}

function Sheets({ state }: { state: string }) {
  useState81(state, SCROLL_3);
  const held = state.startsWith("held");
  return (
    <Sheet open modal={false}>
      {held ? (
        <SheetContent side="right">
          <SheetTitle>Bench notes</SheetTitle>
          {[0, 6, 12].map((at) => <p key={at}>{LOG.slice(at, at + 6).join(" ")}</p>)}
          <SheetActions><Button variant="secondary">Cancel</Button><Button>Save notes</Button></SheetActions>
        </SheetContent>
      ) : (
        <SheetContent side="right">
          <SheetHeader closeLabel="Close"><SheetTitle>Pastry</SheetTitle></SheetHeader>
          <SheetBody>{[0, 6, 12].map((at) => <p key={at}>{LOG.slice(at, at + 6).map((line) => line.replace("Bench", "Step")).join(" ")}</p>)}</SheetBody>
        </SheetContent>
      )}
    </Sheet>
  );
}

export const ROUND_81: Round = {
  id: "81",
  title: "cimip-gaps-3 t7: cut content fades",
  reviewed: false,
  summary:
    "The council's t7 decision, built in React and the HTML skill: every scrollport Basalt draws fades its content at an edge that hides more (20px inline, 16px on a block edge, never more than a quarter of the port or than what is hidden), as a mask on the content that paints no colour; rims, fills, shadows, rings, a classic scrollbar and held actions stay solid on a host round the port. Each step has a before (the cut as shipped).",
  steps: [
    {
      id: "tabs",
      name: "The tab row (the one the owner circled)",
      intro: "Each side that hides tabs fades inside its clip line; the clip stays the bound and the hit-test edge. A tab brought into view keeps the fade and the ring's room (24px) clear of the column's edge, measured from the column.",
      decisions: [
        "No edge buttons. The band grows from nothing as the row leaves an end and is gone when it reaches one; a row that fits has no mask.",
        "Under more contrast and in forced colours the edge is a plain cut, and the clip stays.",
        "Text inside a band is below 4.5:1 on purpose: a second named exception to AA everywhere, held by behaviour (every word a scroll away, focus never under a band); data-fades=\"off\" on the root is the switch for a strict audit.",
        NOT_REVIEWED,
      ],
      tryIt: ["Tab into the row and press the arrows: the focused tab and its ring always land clear of the band."],
      states: ["before", "rtl", "forced-colours", "more-contrast"],
      widths: [1440, 390],
      height: 320,
      demo: ({ state }) => <TabRows state={state} />,
    },
    {
      id: "segments",
      name: "A segmented control wider than its column",
      intro: "The control is a host and a port: the host keeps the track's fill and radius and clips to it while it overflows; the port holds the pill, the padding and the segments, scrolls and fades. The track is never masked; a control that fits is unchanged.",
      decisions: ["A segment brought into view keeps 24px clear; its ring stays at −2 while it overflows.", NOT_REVIEWED],
      tryIt: ["Tab into a control and press the arrows: the pill and the focused segment stay clear of the band."],
      states: ["before"],
      widths: [1440, 390],
      height: 360,
      demo: ({ state }) => <Segments state={state} />,
    },
    {
      id: "code",
      name: "CodeBlock and Terminal (T6's “no fade” reversed)",
      intro: "Each side that hides code fades; the line of words stays on CodeBlock, and Terminal takes the fade and no line. The ring moves to the whole block. An untitled block's Copy button hangs over the corner: the whole rows its box touches end their band at its start edge, with nothing under the button, and the end padding grows from 48 to 54px (70 on touch) so a line that fits is never under the ramp.",
      decisions: ["The owner took Fable's answer on code (DECISIONS 399): one or two characters at the edge of a line longer than its block are under 4.5:1 until the reader scrolls.", NOT_REVIEWED],
      tryIt: ["Tab to a block and press the right arrow: it scrolls, and the ring goes round the whole block."],
      states: ["before"],
      widths: [1440, 390],
      height: 640,
      demo: ({ state }) => <Code state={state} />,
    },
    {
      id: "lists",
      name: "A menu and the command list",
      intro: "A menu's rows, its glide plate and its padding move into a port; the popup keeps its rim, radius, fill and shadow. The command list is its own port. A row brought into view keeps the fade and space-0-5 clear (18px), and the row the keys are on is never under a band.",
      decisions: [NOT_REVIEWED],
      tryIt: ["Arrow down the command list: the lit row never sits under the band."],
      states: ["before"],
      widths: [1440, 390],
      height: 640,
      demo: ({ state }) => <Lists state={state} />,
    },
    {
      id: "sheets",
      name: "A sheet body, and a sheet with held actions",
      intro: "SheetBody stays the port (its class, ref and stop) inside a new host that draws its −2 ring. A Sheet with no SheetBody scrolls in a port round its children: its sticky actions are an opaque strip, so the bottom band ends on their divider and the actions keep full paint.",
      decisions: ["The owner took Fable's answer on bodies (DECISIONS 399).", NOT_REVIEWED],
      tryIt: ["Scroll the held-actions sheet: the actions never fade, and the text fades just above their divider."],
      states: ["before", "held", "held-before"],
      widths: [1440, 390],
      height: 720,
      demo: ({ state }) => <Sheets state={state} />,
    },
  ],
};
