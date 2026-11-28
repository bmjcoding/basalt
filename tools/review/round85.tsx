// Round 85: micro-details m6, themes and native chrome (DECISIONS 420; the handoff of DECISIONS 405 and 409, decided by Opus with Neon and Astra). H6:
// selected text is the selection wash with its ink lifted to primary (the inverse pair on an inverse fill), before and after, in React and the skill. H4: a
// theme switch changes colour at once, before and after, held 12ms into the switch. H2: the browser chrome's colour, which a screenshot cannot show, as the
// composed <head>. Built by Opus; the implementation has not been reviewed; the tests are written and not run (DECISIONS 359). Synthetic data in unlike
// domains: a harbour's tide notes, a library's loans, a bakery's orders and a garden plan.

import * as React from "react";

import {
  Badge, Button, Checkbox, CodeBlock, GanttDiagram, Input, KanbanDiagram, NumberTicker, Segment, SegmentedControl, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TableRowHead, themeBootstrap, themeColorMeta,
} from "../../packages/react/src/index";
import { withoutTransitions } from "../../packages/react/src/theme-switch";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-8)", minWidth: 0 };
const NOT_REVIEWED = "Decided by the council's light round (DECISIONS 420, under the handoff of DECISIONS 405 and 409); the implementation has not been reviewed. The tests are written and not run (DECISIONS 359).";

// The page base's selected-text rule, as base.css draws it: the review page does not load the opt-in base, so this round puts the rule in the basalt layer.
const BASE_SELECTION = "@layer basalt { ::selection { background: var(--basalt-selection-fill); color: var(--basalt-selection-ink); } @media (forced-colors: active) { ::selection { background: Highlight; color: HighlightText; } } }";
// "Before": the browser's own selection, as React drew none on main (an option layer, scoped to the wrapper that says so).
const BEFORE_SELECTION = "@layer review-options { .r85-before ::selection { background: revert; color: revert; } }";

/** Selects the specimen's whole contents once it has drawn, for a shot of a selected state. */
function useSelect(on: boolean, ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    if (!on) return;
    const timer = window.setTimeout(() => {
      const range = document.createRange();
      if (!ref.current) return;
      range.selectNodeContents(ref.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [on, ref]);
}

function useRootTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, read, () => "dark");
}

// ---- H6: selected text ----

const BOARD = {
  title: "Orders for Saturday", summary: "Three orders, the wedding cake in the oven.",
  columns: [{ id: "new", label: "New" }, { id: "baking", label: "Baking" }, { id: "ready", label: "Ready" }],
  cards: [
    { id: "o1", column: "new", kind: "Order 12", name: "Rye loaves" },
    { id: "o2", column: "baking", kind: "Order 9", name: "Wedding cake", focal: true },
    { id: "o3", column: "ready", kind: "Order 7", name: "Croissants" },
  ],
  legend: { focal: "In the oven" },
};
const PLAN = {
  title: "Spring beds", summary: "Two weeks from compost to onions.",
  tasks: [
    { id: "a", name: "Turn the compost", start: "2026-03-02", end: "2026-03-06" },
    { id: "b", name: "Plant the onions", start: "2026-03-09", end: "2026-03-16", after: ["a"], focal: true },
  ],
  legend: { focal: "This week" },
};

function Specimen({ selected }: { selected: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useSelect(selected, ref);
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "var(--basalt-space-6)", minWidth: 0 }}>
      <p style={{ margin: 0 }}>
        High water at the harbour is <strong>06:42</strong>, <span style={{ color: "var(--basalt-text-secondary)" }}>a spring tide after the new moon</span>,{" "}
        <span style={{ color: "var(--basalt-text-tertiary)" }}>read at dawn</span> from <code>tides --port harbour</code>. Visitors this week: <NumberTicker value={1284} />.
      </p>
      <div style={{ display: "flex", gap: "var(--basalt-space-2)", flexWrap: "wrap" }}>
        <Button variant="primary">Publish the notes</Button>
        <Button variant="primary" disabled>Publish the notes</Button>
        <Button variant="secondary">Save a draft</Button>
      </div>
      <TableContainer label="Loans">
        <Table columns={[{}, { width: 96 }, { width: 96 }]} minWidth={320}>
          <TableHeader><TableRow><TableHead>Loan</TableHead><TableHead>Due</TableHead><TableHead>State</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableRowHead>Atlas of tides</TableRowHead><TableCell>12 Dec</TableCell><TableCell><Badge status="neutral">Out</Badge></TableCell></TableRow>
            <TableRow selected><TableRowHead>Field guide to mosses</TableRowHead><TableCell>15 Dec</TableCell><TableCell><Badge status="warning">Late</Badge></TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <KanbanDiagram {...BOARD} />
      <GanttDiagram {...PLAN} />
    </div>
  );
}

function Selection({ state }: { state: string }) {
  const selected = state.includes("selected");
  const before = state.startsWith("before");
  return (
    <div style={stack} className={before ? "r85-before" : undefined}>
      <style>{BASE_SELECTION}</style>
      {before ? <style>{BEFORE_SELECTION}</style> : null}
      <p style={label}>{before ? "Before (main): React's page base drew no selection, so it is the browser's own" : "This build: the selection wash (white at 24% in dark, black at 24% in light) with primary ink; on the primary button and the focal card the inverse wash and the surface's own ink; the disabled button and the focal Gantt row's words take the page's"}</p>
      <Specimen selected={selected} />
    </div>
  );
}

function SkillSelection({ state }: { state: string }) {
  const theme = useRootTheme();
  const before = state.startsWith("before");
  const source = React.useMemo(() => (__SKILL_PAGES__[before ? "85-before" : "85-after"] ?? "").replace("__THEME__", theme).replace("__SELECT__", state.includes("selected") ? "yes" : "no"), [before, state, theme]);
  return (
    <div>
      <p style={label}>{before ? "Before (main): the skill's core drew the selected wash (white at 9%, black at 7%) and left the ink alone" : "This build: the same pair as React's page base, from the core"}</p>
      {/* sink: a page compose.mjs built at review-build time from this round's synthetic body (round85-skill.mjs); the frame runs the page's own script */}
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script */}
      <iframe title="The HTML skill's selected text" srcDoc={source} style={{ width: "100%", height: 360, border: 0, display: "block" }} />
    </div>
  );
}

// ---- H4: a theme switch ----

/**
 * A nested theme root of controls that transition their colours. "switch-before-fade" flips it as main did (a plain attribute write: every colour eases over
 * duration-fast) and "switch-after-fade" through the shipped window; either way the running transitions are then held 12ms in, so the shot is the frame a
 * reader sees just after the switch. The buttons do it live.
 */
function SwitchBox({ state }: { state: string }) {
  const box = React.useRef<HTMLDivElement>(null);
  const root = useRootTheme();
  const flip = React.useCallback((instant: boolean) => {
    const el = box.current;
    if (!el) return;
    const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (instant) withoutTransitions(() => el.setAttribute("data-theme", next));
    else el.setAttribute("data-theme", next);
  }, []);
  React.useLayoutEffect(() => { box.current?.setAttribute("data-theme", root); }, [root]);
  React.useEffect(() => {
    if (!state.startsWith("switch-")) return;
    const timer = window.setTimeout(() => {
      flip(state === "switch-after-fade");
      for (const a of box.current?.getAnimations({ subtree: true }) ?? []) { a.pause(); a.currentTime = 12; }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state, flip]);
  const before = state === "switch-before-fade";
  const after = state === "switch-after-fade";
  return (
    <div style={stack}>
      <p style={label}>{before ? "Before (main): 12ms after the switch, every control still easing from the old theme's colours while the ground has changed" : after ? "This build: 12ms after the switch, every colour already the new theme's" : "A theme root of its own: switch it either way"}</p>
      <div ref={box} style={{ background: "var(--basalt-surface-page)", color: "var(--basalt-text-primary)", padding: "var(--basalt-space-6)", borderRadius: "var(--basalt-radius-lg)", boxShadow: "var(--basalt-shadow-hairline)", display: "flex", flexDirection: "column", gap: "var(--basalt-space-4)" }}>
        <div style={{ display: "flex", gap: "var(--basalt-space-2)", flexWrap: "wrap" }}>
          <Button variant="primary">Book the table</Button>
          <Button variant="secondary">Change the time</Button>
          <Button variant="ghost">Cancel</Button>
        </div>
        <SegmentedControl defaultValue="dinner" aria-label="Sitting"><Segment value="lunch">Lunch</Segment><Segment value="dinner">Dinner</Segment><Segment value="late">Late</Segment></SegmentedControl>
        <div style={{ display: "flex", gap: "var(--basalt-space-6)", flexWrap: "wrap", alignItems: "center" }}>
          <Switch defaultChecked>Window seat</Switch>
          <Checkbox defaultChecked>Remind me</Checkbox>
        </div>
        <Input aria-label="Name for the booking" defaultValue="Aiko Tanaka" style={{ maxWidth: 280 }} />
      </div>
      {state === "default" ? (
        <div style={{ display: "flex", gap: "var(--basalt-space-2)", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => flip(true)}>Switch (this build)</Button>
          <Button variant="secondary" onClick={() => flip(false)}>Switch (as main)</Button>
        </div>
      ) : null}
    </div>
  );
}

// ---- H2: the browser chrome ----

const split = (script: string) => script.replace(/;(?=[a-z])/g, ";\n  ").replace(/\}(?=try)/, "}\n  ");
const REACT_HEAD = [
  "<!-- themeColorMeta, optional, before or after the head script -->",
  ...themeColorMeta.map((m) => `<meta name="${m.name}" media="${m.media}" content="${m.content}" data-basalt-theme-color="">`),
  "<!-- themeBootstrap: the theme, the choice, and the live tag, first among the theme-color tags -->",
  `<script>${split(themeBootstrap)}</script>`,
  "<!-- after it runs, in dark: <meta name=\"theme-color\" data-basalt-theme-color=\"live\" content=\"#000000\"> before the pair -->",
].join("\n");

function Chrome() {
  return (
    <div style={stack}>
      <div><p style={label}>React: what an app renders in its head</p><CodeBlock title="head" language="html" code={REACT_HEAD} /></div>
      <div><p style={label}>The HTML skill: the head compose writes (the pair right after the colour scheme, the snippet after the title)</p><CodeBlock title="head" language="html" code={__SKILL_PAGES__["85-head"] ?? ""} /></div>
    </div>
  );
}

export const ROUND_85: Round = {
  id: "85",
  title: "Micro-details m6: selected text, an instant theme switch, the browser chrome's colour",
  reviewed: false,
  summary:
    "The council's m6 decision (DECISIONS 420), built in React and the HTML skill. Selected text is a wash (selection-fill: white at 24% in dark, black at 24% in light) with its ink lifted to primary, drawn by the opt-in page base and the skill's core; an inverse fill (the primary button, a focal diagram card) takes the inverse wash and its own ink, and a fill taken away gives the page's pair back. A theme switch zeroes every transition's duration and delay for its one write (data-theme-switching), so colour changes at once and nothing else is touched. The browser chrome takes the page ground, from a static media-scoped pair and the head script's live tag. Each changed part leads with before and after.",
  steps: [
    {
      id: "selection",
      name: "Before and after: selected text in React",
      intro: "The specimen is selected in each shot. Every text lifts to primary ink on the wash, so secondary, tertiary, code, the table's wash band and the badges read at the ink's contrast (5.81:1 or better). The ticker's number stays transparent under its strips, so the band shows through and the digits draw over it.",
      decisions: [
        "On the primary button and the focal card the wash is the other theme's (selection-fill-inverse) and the ink the surface's own: with the page's pair a selected label would be about 1.05:1.",
        "The disabled primary button and the focal Gantt row take the fill away, so they give the page's pair back (inherit).",
        "In forced colours it is the system's Highlight and HighlightText. More contrast does not step it.",
        "\"Before\" reverts the selection to the browser's own: React's page base drew none on main.",
        NOT_REVIEWED,
      ],
      tryIt: ["Select across the paragraph, the buttons and the cards: one band, primary ink.", "Select the focal Gantt row's name, then the bar beside it."],
      states: ["before-selected", "selected", "selected-forced-colours", "selected-reduced-motion"],
      widths: [1440, 390],
      height: 1500,
      heights: { "before-selected@390": 2100, "selected@390": 2100, "selected-forced-colours@390": 2100, "selected-reduced-motion@390": 2100 },
      demo: ({ state }) => <Selection state={state} />,
    },
    {
      id: "skill",
      name: "Before and after: selected text in the HTML skill",
      intro: "The skill's core draws the same pair: the wash with primary ink, the inverse pair on a primary button, the page's on a disabled one. A selected table row keeps its wash band under the selection.",
      decisions: ["\"Before\" puts the core's old rule back over the new one: the selected wash (white at 9%, black at 7%) and no ink.", "The core's cap is 43,000 (from 40,900), measured at 42,985.", NOT_REVIEWED],
      tryIt: ["Select the frame's text."],
      states: ["before-selected", "selected"],
      widths: [1440, 390],
      height: 480,
      demo: ({ state }) => <SkillSelection state={state} />,
    },
    {
      id: "switch",
      name: "Before and after: a theme switch",
      intro: "For the one style change that applies a theme, every transition's duration and delay is zero, and transition-property stays as declared. A colour snaps; a movement already running (its property still listed, its end unchanged) finishes on its own time; no animation is touched, so the ring and braille keep their phase. The window opens and closes in the same call, so the theme choice's pill and a closing menu move as usual after it.",
      decisions: [
        "Not transition: none, which would cancel a running transform and jump it to its end (the check's 12.2px to 100px).",
        "The rule is static CSS in @layer basalt with !important, so it holds under a style-src 'self' policy and outranks an app's own colour transitions.",
        "Each shot is held 12ms after the switch: on main every control is still easing from the old colours.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press \"Switch (as main)\" and then \"Switch (this build)\" and watch the buttons and the switch."],
      states: ["switch-before-fade", "switch-after-fade"],
      widths: [1440, 390],
      height: 560,
      heights: { "switch-before-fade@390": 640, "switch-after-fade@390": 640, "default@390": 720 },
      demo: ({ state }) => <SwitchBox state={state} />,
    },
    {
      id: "chrome",
      name: "The browser chrome's colour (no picture: the head)",
      intro: "The chrome takes the page ground: #fafafa in light, #000000 in dark (a palette's own ground later). A static pair scoped by prefers-color-scheme serves a page before or without script; the head script keeps one live tag of its own first, for the theme shown, and every theme write syncs it. An app with its own theme-color renders no Basalt pair, and Basalt then writes none.",
      decisions: [
        "One owner per tag: no script ever writes the pair, so React 19's hydration (which matches a hoistable meta by its content) always finds the nodes it rendered; only Basalt's theme code writes or removes the live tag.",
        "The colours are literals held to tokens.json by a test; a palette sets data-light and data-dark on the live tag, and every later sync reads them.",
        "Never animated.",
        NOT_REVIEWED,
      ],
      tryIt: ["Open the page on a phone and switch the theme: the bar follows."],
      widths: [1440, 390],
      height: 900,
      demo: () => <Chrome />,
    },
  ],
};
