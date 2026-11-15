// Round 34: the audit's design answers, part A (DECISIONS 138, decided by the council as a proposal and approved by the owner in DECISIONS 139).
// "Chosen" on the segmented control, vertical tabs, horizontal tabs and pagination is the label at 600 in primary ink against 400 in
// secondary, every label reserving its 600 width, so nothing moves. The pill loses its drop shadow and keeps its hairline. In forced
// colours a chosen segment, vertical tab and current page are Highlight with HighlightText and nothing draws an outline as a state. More
// contrast steps lines, tertiary ink and a field's boundary through three aliases. A control drawn at 44 on touch is radius 8. A pinned cell's
// hover and selected washes are one colour from color-mix. The design panel has not reviewed the implementation. Every word is synthetic.
//
// The states are real. "forced-colours", "more-contrast" and "reduced-motion" are those emulations on the same page, "touch" is a coarse
// pointer. Hover and focus are forced on the parts that mark themselves data-wt-force (Chromium's forced pseudo-states, so no pointer is
// needed). The readouts are drawn by this review page only: Basalt draws none. The movement readout clicks every item of the control in turn
// and prints the largest distance any item's box moved, to the thousandth of a pixel.

import * as React from "react";

import { Button, Card, HomeGlyph, Icon, Pagination, Segment, SegmentedControl, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TableRowHead, Tabs, TabsList, TabsPanel, Text } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const wrap: React.CSSProperties = { display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" };
const caption = (text: string) => <Text size="sm" tone="secondary">{text}</Text>;
const readout: React.CSSProperties = { margin: 0, fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, color: "var(--basalt-text-secondary)", whiteSpace: "pre-wrap" };

const FIVE = ["Day", "Week", "Month", "Quarter", "Year"];

/** The four controls, one of each, in the state a row asks for. */
function Controls({ state, force, id }: { state: "rest" | "hover" | "focus" | "disabled"; force: boolean; id: string }) {
  const disabled = state === "disabled";
  const mark = (value: "hover" | "focus") => (state === value && force ? { "data-wt-force": value } : {});
  return (
    <div style={{ ...wrap, alignItems: "flex-start" }} data-wt-controls={id}>
      <SegmentedControl aria-label={`Range ${id}`} defaultValue="week" disabled={disabled}>
        <Segment value="day" {...mark("hover")}>Day</Segment>
        <Segment value="week" {...mark("focus")}>Week</Segment>
        <Segment value="month">Month</Segment>
      </SegmentedControl>
      <Tabs orientation="vertical" defaultValue="account">
        <TabsList aria-label={`Sections ${id}`}>
          <Tab value="account" {...mark("focus")}>Account</Tab>
          <Tab value="billing" disabled={disabled} {...mark("hover")}>Billing</Tab>
          <Tab value="keys">Access keys</Tab>
        </TabsList>
        <TabsPanel value="account" hidden />
      </Tabs>
      <Tabs defaultValue="overview">
        <TabsList aria-label={`Views ${id}`}>
          <Tab value="overview" {...mark("focus")}>Overview</Tab>
          <Tab value="activity" disabled={disabled} {...mark("hover")}>Activity</Tab>
          <Tab value="settings">Settings</Tab>
        </TabsList>
        <TabsPanel value="overview" hidden />
      </Tabs>
      <PagesWith state={state} force={force} id={id} />
    </div>
  );
}

function PagesWith({ state, force, id }: { state: string; force: boolean; id: string }) {
  const [page, setPage] = React.useState(state === "disabled" ? 1 : 3);
  const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!force || (state !== "hover" && state !== "focus")) return;
    const target = root.current?.querySelector<HTMLElement>(`[aria-label="Page ${state === "hover" ? 5 : 3}"]`);
    target?.setAttribute("data-wt-force", state);
  }, [state, force]);
  return <div ref={root}><Pagination aria-label={`Pages ${id}`} page={page} pageCount={7} onPageChange={setPage} /></div>;
}

const STATES = ["rest", "hover", "focus", "disabled"] as const;

function Block({ id, force }: { id: string; force: boolean }) {
  return (
    <div style={col}>
      {STATES.map((s) => (
        <div key={s} style={{ ...col, gap: 6 }}>
          {caption(`${s === "rest" ? "At rest" : s === "hover" ? "Hovered" : s === "focus" ? "Focused" : "Disabled"}`)}
          <Controls state={s} force={force} id={`${id}-${s}`} />
        </div>
      ))}
    </div>
  );
}

/** Clicks every item of every control marked data-wt-measure in turn, and writes the largest move of any item's box. */
function useMovement(root: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    let live = true;
    const run = async () => {
      await new Promise((r) => window.setTimeout(r, 350));
      const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      for (const holder of Array.from(root.current?.querySelectorAll<HTMLElement>("[data-wt-measure]") ?? [])) {
        const items = () => Array.from(holder.querySelectorAll<HTMLElement>(holder.getAttribute("data-wt-measure") ?? ""));
        const boxes = () => items().map((el) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
        const first = items();
        const start = first.findIndex((el) => el.matches("[data-pressed],[data-active],[aria-current='page']"));
        const base = boxes();
        let worst = 0;
        for (let i = 0; i < first.length; i += 1) {
          first[i]?.click();
          await frame();
          boxes().forEach((b, k) => b.forEach((v, m) => { worst = Math.max(worst, Math.abs(v - (base[k]?.[m] ?? v))); }));
        }
        if (start >= 0) { first[start]?.click(); await frame(); }
        const out = holder.querySelector<HTMLElement>("[data-wt-movement]");
        if (live && out) out.textContent = `Every item chosen in turn: the largest move of any item's box is ${worst.toFixed(3)}px (${first.length} items).`;
      }
    };
    void run();
    return () => { live = false; };
  }, [root]);
}

// ---- 1. The four controls, on four surfaces ----

function SurfaceDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  useMovement(root);
  return (
    <div ref={root} style={col}>
      {caption("The segmented control, vertical tabs, horizontal tabs and pagination. The chosen label is 600 in primary ink and a resting one 400 in secondary; the pill, the underline and the plate are support. A disabled tab is drawn in the disabled ink; a disabled segment keeps its ink, because Basalt has no rule for it (older than this build, on the backlog), and Previous, a disabled page button, is the Button\u0027s.")}
      <div style={col}>
        {caption("On the page")}
        <Block id="page" force />
        {caption("In a card")}
        <Card style={{ padding: 16 }}><Block id="card" force /></Card>
        {caption("In a dialog (a card with the modal's shadow)")}
        <Card style={{ padding: 16, boxShadow: "var(--basalt-shadow-modal)" }}><Block id="dialog" force /></Card>
        {caption("In a card in a dialog")}
        <Card style={{ padding: 16, boxShadow: "var(--basalt-shadow-modal)" }}><Card style={{ padding: 16 }}><Block id="inner" force /></Card></Card>
      </div>
      <div style={{ ...col, maxWidth: 358 }} data-wt-measure=".basalt-segment" data-state={state}>
        {caption("Five short labels, in a 358px column (at 390)")}
        <SegmentedControl aria-label="Five labels" defaultValue="week">{FIVE.map((l) => <Segment key={l} value={l.toLowerCase()}>{l}</Segment>)}</SegmentedControl>
        <p style={readout} data-wt-movement>measuring</p>
      </div>
      <div style={col} data-wt-measure=".basalt-tabs-list[data-orientation='vertical'] .basalt-tab">
        <Tabs orientation="vertical" defaultValue="account"><TabsList aria-label="Measured sections"><Tab value="account">Account</Tab><Tab value="billing">Billing</Tab><Tab value="keys">Access keys</Tab><Tab value="alerts">Notifications</Tab></TabsList><TabsPanel value="account" hidden /></Tabs>
        <p style={readout} data-wt-movement>measuring</p>
      </div>
      <div style={col} data-wt-measure=".basalt-tabs-list:not([data-orientation='vertical']) .basalt-tab">
        <Tabs defaultValue="overview"><TabsList aria-label="Measured views"><Tab value="overview">Overview</Tab><Tab value="activity">Activity</Tab><Tab value="settings">Settings</Tab></TabsList><TabsPanel value="overview" hidden /></Tabs>
        <p style={readout} data-wt-movement>measuring</p>
      </div>
      <div style={col} data-wt-measure=".basalt-pagination .basalt-button[aria-label^='Page ']">
        <MeasuredPages />
        <p style={readout} data-wt-movement>measuring</p>
      </div>
      <ExtraSpecimens />
    </div>
  );
}

function ExtraSpecimens() {
  return (
    <div style={col}>
      {caption("Link-mode pagination at its first and last page: Previous and Next are disabled links in the page link's box, so reaching either end moves nothing.")}
      {[1, 7].map((start) => (
        <div key={start} style={col} data-wt-measure=".basalt-page-link[aria-label^='Page ']">
          <LinkPages start={start} />
          <p style={readout} data-wt-movement>measuring</p>
        </div>
      ))}
      {caption("A segment and a tab with an icon and a label, chosen and at rest: the icon is drawn in both forms in one box, so it takes its selected form while chosen and nothing moves.")}
      <div style={wrap}>
        <SegmentedControl aria-label="Icons" defaultValue="home">
          <Segment value="home"><Icon icon={HomeGlyph} />Home</Segment>
          <Segment value="other"><Icon icon={HomeGlyph} />Other</Segment>
        </SegmentedControl>
        <Tabs defaultValue="home">
          <TabsList aria-label="Icon tabs"><Tab value="home"><Icon icon={HomeGlyph} />Home</Tab><Tab value="other"><Icon icon={HomeGlyph} />Other</Tab></TabsList>
          <TabsPanel value="home" hidden />
        </Tabs>
      </div>
      {caption("A label inside an element reserves its 600 width the same way (three segments, the middle one chosen).")}
      <div style={col} data-wt-measure=".basalt-segment">
        <SegmentedControl aria-label="Spans" defaultValue="notifications">
          <Segment value="billing"><span>Billing</span></Segment>
          <Segment value="notifications"><span>Notifications</span></Segment>
          <Segment value="keys"><span>Access keys</span></Segment>
        </SegmentedControl>
        <p style={readout} data-wt-movement>measuring</p>
      </div>
      {caption("A secondary Button hovered, then at rest: under more contrast its hovered edge is secondary ink and never fainter than its edge at rest.")}
      <div style={wrap}>
        <Button data-wt-force="hover">Hovered</Button>
        <Button>At rest</Button>
      </div>
    </div>
  );
}

function LinkPages({ start }: { start: number }) {
  const [page, setPage] = React.useState(start);
  return <div onClick={(e) => { const a = (e.target as HTMLElement).closest("a"); if (!a) return; e.preventDefault(); const n = Number(a.getAttribute("aria-label")?.replace("Page ", "")); if (n) setPage(n); }}><Pagination aria-label={`Links from ${start}`} page={page} pageCount={7} hrefForPage={(n) => `#${n}`} /></div>;
}

function MeasuredPages() {
  const [page, setPage] = React.useState(3);
  return <Pagination aria-label="Measured pages" page={page} pageCount={7} onPageChange={setPage} />;
}

// ---- 2. Pagination, the weak case ----

function PagesWeakDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState("measuring");
  const [page, setPage] = React.useState(3);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const hovered = root.current?.querySelector<HTMLElement>('[aria-label="Page 5"]');
      const current = root.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!hovered || !current) return;
      hovered.setAttribute("data-wt-force", "hover");
      const paint = (css: string, under: number[]) => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
        ctx.fillStyle = `rgb(${under.join(",")})`; ctx.fillRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      };
      const hex = (c: number[]) => `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      const surface = paint(getComputedStyle(root.current as HTMLElement).backgroundColor === "rgba(0, 0, 0, 0)" ? "rgb(0 0 0)" : getComputedStyle(root.current as HTMLElement).backgroundColor, [0, 0, 0]);
      const probe = document.createElement("i"); probe.style.cssText = "background: var(--basalt-state-hover)"; document.body.append(probe);
      const wash = paint(getComputedStyle(probe).backgroundColor, surface); probe.remove();
      const plate = paint(getComputedStyle(current).backgroundColor, surface);
      const lum = (c: number[]) => { const f = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0] ?? 0) + 0.7152 * f(c[1] ?? 0) + 0.0722 * f(c[2] ?? 0); };
      setText(`Page 5 hovered: its wash over the surface is ${hex(wash)}. The current page's plate is ${hex(plate)}.\n${lum(wash) > lum(plate) ? "The hover wash is lighter than the current page's plate." : "The hover wash is not lighter than the plate."} The two values are reported as they are; neither is changed.`);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <div ref={root} style={{ ...col, maxWidth: 358, background: "var(--basalt-surface-page)", padding: 12 }}>
      {caption("Pagination is the weak case of the weight cue: a numeral at 600 against 400, on a plate. Here page 5 is hovered while page 3 is current.")}
      <Pagination aria-label="Weak case" page={page} pageCount={7} onPageChange={setPage} />
      <p style={readout}>{text}</p>
    </div>
  );
}

// ---- 3. A pinned table cell, hovered and selected ----

function PinnedDemo({ state }: { state: string }) {
  const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const frame = root.current?.querySelector<HTMLElement>(".basalt-table-container");
    window.setTimeout(() => { if (frame) frame.scrollLeft = 120; root.current?.querySelector("#hovered-row")?.setAttribute("data-wt-force", "hover"); }, 150);
  }, [state]);
  return (
    <div ref={root} style={{ ...col, maxWidth: 358 }}>
      {caption("Pinned at 390: the name sticks and is opaque in every state. The second row is hovered (the row, as a pointer would), the third is selected. The wash is mixed into the cell's one background colour: the colours are the ones the gradient painted.")}
      <TableContainer label="Runs">
        <Table columns={[{ width: 130 }, { width: 120 }, { width: 120 }, {}]} minWidth={560} pinned={1}>
          <TableHeader><TableRow><TableHead>Run</TableHead><TableHead>Status</TableHead><TableHead>Region</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableRowHead>run-0142</TableRowHead><TableCell>Ready</TableCell><TableCell>Frankfurt</TableCell><TableCell>4m 12s</TableCell></TableRow>
            <TableRow id="hovered-row"><TableRowHead>run-0141</TableRowHead><TableCell>Building</TableCell><TableCell>Ashburn</TableCell><TableCell>2m 50s</TableCell></TableRow>
            <TableRow selected><TableRowHead>run-0140</TableRowHead><TableCell>Error</TableCell><TableCell>Sydney</TableCell><TableCell>11m 03s</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export const ROUND_34: Round = {
  id: "34",
  title: "The audit's design answers, part A: chosen is a weight, forced colours, the pill's edge, more contrast, radius on touch and a wash in one colour",
  reviewed: false,
  summary:
    "DECISIONS 138 (the council's vote, three members, two of three deciding) and 139 (the owner's approval). Chosen is the label at 600 in primary ink against 400 in secondary on the segmented control, vertical tabs, horizontal tabs and pagination, every label reserving its 600 width so no item moves; the pill keeps its hairline and loses its drop shadow; in forced colours the chosen item is Highlight with HighlightText and nothing draws an outline as a state; more contrast answers prefers-contrast: more with three aliases and no new colour; a control drawn at 44 on touch is radius 8; and a pinned cell's wash is one colour from color-mix. The design panel has not reviewed the implementation.",
  steps: [
    {
      id: "chosen",
      name: "Chosen is the label at 600 against 400, on four surfaces",
      intro: "The four controls at rest, hovered, focused and disabled, on the page, in a card, in a dialog and in a card in a dialog, with the measured movement printed under each control that was clicked through.",
      widths: [1440, 390],
      scales: [1, 2],
      height: 2600,
      decisions: [
        "Decided by the council (DECISIONS 138, A, 3 to 0) and approved by the owner (139). Weight is the cue; the pill, the underline and the ink step are support. An item with no label uses its glyph's selected form.",
        "Every label reserves its 600 width: its text carries a copy of itself in data-label, laid out at 600 and unseen, as navigation's label does. The movement readouts print 0.000px.",
        "The component keeps every existing touch size: 44px on a coarse pointer.",
      ],
      tryIt: ["Choose each item of a control in turn: nothing beside it moves.", "Tab to the chosen item: the ring is the ordinary +2 ring."],
      states: ["forced-colours", "more-contrast", "reduced-motion", "touch"],
      demo: ({ state }) => <SurfaceDemo state={state} />,
    },
    {
      id: "pagination-weak",
      name: "Pagination, the weak case of the weight cue",
      intro: "A numeral at 600 against 400, and in dark the hover wash is lighter than the current page's plate. The frame is shown as built and the two values are reported.",
      widths: [390],
      scales: [1, 2],
      height: 280,
      decisions: ["DECISIONS 138 asks that the owner see this frame. The values are reported and not changed; any change is a design decision for the council."],
      tryIt: ["Hover a page that is not current, in dark."],
      states: ["forced-colours", "more-contrast"],
      demo: ({ state }) => <PagesWeakDemo state={state} />,
    },
    {
      id: "pinned-cell",
      name: "A pinned cell, hovered and selected, in one colour",
      intro: "The wash over the pinned cell's opaque fill is one background colour from color-mix, in React and in the HTML skill, painting the colours the gradient and the ::before painted.",
      widths: [390, 1440],
      scales: [1, 2],
      height: 360,
      decisions: ["Decided by the council (DECISIONS 138, C11, 3 to 0) and approved by the owner (139). The pixel proof against the base lists any difference."],
      tryIt: ["Scroll the table sideways: the name stays opaque under the hover and the selected wash."],
      states: ["forced-colours", "reduced-motion"],
      demo: ({ state }) => <PinnedDemo state={state} />,
    },
  ],
};
