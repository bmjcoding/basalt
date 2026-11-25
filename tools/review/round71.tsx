// Round 71: cimip-gaps-3, batch E4 (engineering, from another app's log). The parts that draw anything: a PanelList holding DisclosureRows (G86), and
// ListBand's two new options (`rangeTotal`, G89; `keepFootRoom`, G88) beside the band as shipped. The rest of the batch draws nothing new: SegmentedControl's
// `radio` is shown beside the pressed group to prove the same pixels (G25), Avatar's `initials` beside the initials taken from the name (G31). Not reviewed;
// the browser tests are written and not run (DECISIONS 359). Synthetic data in two unlike domains: a shop's orders and a kitchen's recipes.

import * as React from "react";

import { Avatar, DisclosureRow, FilterResult, ListBand, PanelList, PanelRow, Segment, SegmentedControl } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const pair: React.CSSProperties = { display: "grid", gap: "var(--basalt-space-6)" };
const CSS = ".r71-pair { grid-template-columns: minmax(0, 1fr); } @media (min-width: 720px) { .r71-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }"
  // Today's PanelList (main): the full-row rule taken off, scoped to the left side, so the two differ only where the build does.
  + " .r71-today .basalt-panel-list > :not(.basalt-panel-item) { grid-column: auto !important; }";

const QUESTIONS = ["Where is my order?", "Can I change my address?", "How do returns work?", "Do you ship abroad?"];

function Panels({ today }: { today: boolean }) {
  return (
    <div className={today ? "r71-today" : undefined} style={{ minWidth: 0, display: "grid", gap: "var(--basalt-space-4)" }}>
      <p style={label}>{today ? "Today (main): the rows alternate columns" : "This build: each across the full row"}</p>
      <PanelList aria-label={today ? "Shipping questions, today" : "Shipping questions"}>
        {QUESTIONS.map((q) => <li key={q}><DisclosureRow title={q} defaultOpen={q === QUESTIONS[1]}>Synthetic answer to “{q}”</DisclosureRow></li>)}
      </PanelList>
      <PanelList aria-label={today ? "Recipes, today" : "Recipes"}>
        <PanelRow title="Sourdough" description="A two-day loaf" trailing="2 d" />
        <li><DisclosureRow title="Notes on the starter">Feed it at 1:1:1, twice a day.</DisclosureRow></li>
        <PanelRow title="Focaccia" description="A sheet-pan bread" trailing="5 h" />
      </PanelList>
    </div>
  );
}

function Band({ total, rangeTotal, keepFootRoom, title, noun }: { total: number; rangeTotal?: boolean; keepFootRoom?: boolean; title: string; noun: string }) {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(10);
  const shown = Array.from({ length: Math.max(0, Math.min(size, total - (page - 1) * size)) }, (_, i) => (page - 1) * size + i + 1);
  return (
    <div style={{ minWidth: 0 }}>
      <p style={label}>{title}</p>
      <FilterResult>{`Showing ${total} ${noun.toLowerCase()}`}</FilterResult>
      <ListBand total={total} maxTotal={total} seatTotal={999} rangeTotal={rangeTotal} keepFootRoom={keepFootRoom} page={page} pageSize={size} pageSizes={[10, 25]} onPageChange={setPage} onPageSizeChange={setSize} noun={noun} backToTop={false} footLabel={`${noun} pages, end of list`}>
        <div className="basalt-card" style={{ padding: 0 }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {shown.map((n) => <li key={n} style={{ padding: "var(--basalt-space-2) var(--basalt-space-4)", borderTop: n === shown[0] ? undefined : "var(--basalt-size-hairline) solid var(--basalt-border-divider)" }}>{noun.slice(0, -1)} {n}</li>)}
          </ul>
        </div>
      </ListBand>
      <p style={{ ...label, marginBlockStart: "var(--basalt-space-2)" }}>What follows the list</p>
    </div>
  );
}

function Bands({ state }: { state: string }) {
  const total = state === "one-page" ? 4 : 64;
  return (
    <div className="r71-pair" style={pair}>
      <Band title="As shipped: “1–10 of 64”; the foot only past one page" total={total} noun="Orders" />
      <Band title="rangeTotal={false}: “1–10”, in the band and the foot" total={total} rangeTotal={false} noun="Recipes" />
      <Band title="keepFootRoom: the foot's room held at one page too" total={total} keepFootRoom noun="Orders" />
    </div>
  );
}

function Same() {
  const [a, setA] = React.useState("open");
  const [b, setB] = React.useState("main");
  return (
    <div className="r71-pair" style={pair}>
      <div>
        <p style={label}>Pressed buttons (as shipped)</p>
        <SegmentedControl aria-label="Order view" value={a} onValueChange={setA}>
          <Segment value="open">Open</Segment><Segment value="shipped">Shipped</Segment><Segment value="returned">Returned</Segment>
        </SegmentedControl>
      </div>
      <div>
        <p style={label}>radio: a radiogroup of radios, the same pixels</p>
        <SegmentedControl radio aria-label="Recipe course" value={b} onValueChange={setB}>
          <Segment value="starter">Starter</Segment><Segment value="main">Main</Segment><Segment value="dessert">Dessert</Segment>
        </SegmentedControl>
      </div>
      <div>
        <p style={label}>Avatar: initials from the name (“Doe, Jane Q”), then initials=&quot;JD&quot;</p>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--basalt-space-2)" }}>
          <Avatar name="Doe, Jane Q" /><Avatar name="Doe, Jane Q" initials="JD" /><Avatar name="Okafor, Chidi" initials="CO" size={40} />
        </div>
      </div>
    </div>
  );
}

const NOT_REVIEWED = "Engineering from another app's log (cimip-gaps-3, batch E4); not reviewed by the panel. Browser tests written and not run (DECISIONS 359).";

export const ROUND_71: Round = {
  id: "71",
  title: "Lists in a panel and the band's options (cimip-gaps-3, E4)",
  reviewed: false,
  summary:
    "Batch E4 of the third CIMIP gaps pass: engineering only. A PanelList now lays a child that is not a PanelRow (an app's own li holding a DisclosureRow) across the full row; ListBand takes seatTotal, rangeTotal and keepFootRoom (the last two off by default, so the band is as shipped unless an app sets them); SegmentedControl takes radio, with the same pixels; Avatar takes the app's own initials. A static menu line (MenuText) is not built: its look needs a decision. Not reviewed; the browser tests are written and not run.",
  steps: [
    {
      id: "panel-list",
      name: "DisclosureRows in a PanelList (G86)",
      intro: "Today's on the left (above on a phone): auto-placed in PanelRow's two columns, the rows alternate, and under 720 every other one is 0px wide. This build's on the right: each across the full row. The divider between them, their padding and their focus ring inside the panel's clip are not decided (see the report).",
      decisions: [NOT_REVIEWED, "A child that is not a PanelRow's item takes grid-column 1 / -1. A child that is not an li is reported once in development: a list holds only items."],
      tryIt: ["Open and close a row on each side.", "Narrow the window under 720: today's every other row goes to nothing."],
      widths: [1440, 390],
      height: 900,
      demo: () => (
        <div className="r71-pair" style={pair}>
          <style>{CSS}</style>
          <Panels today />
          <Panels today={false} />
        </div>
      ),
    },
    {
      id: "list-band",
      name: "ListBand: rangeTotal and keepFootRoom (G89, G88)",
      intro: "Three bands at once: as shipped, with rangeTotal={false} and with keepFootRoom. Each reserves seats for 999 (seatTotal, G28). The one-page state shows the held foot; the foot is drawn only under 720.",
      decisions: [NOT_REVIEWED, "Both options are off by default, so a band nobody changes draws what it drew. Whether the held foot should be the default is the owner's (DECISIONS 227 removed an empty seat under the list)."],
      tryIt: ["Page through each band at 390.", "Compare the one-page state: only the third band keeps the foot's room."],
      states: ["one-page"],
      widths: [1440, 390],
      height: 1500,
      demo: ({ state }) => (<><style>{CSS}</style><Bands state={state} /></>),
    },
    {
      id: "same-pixels",
      name: "SegmentedControl radio and Avatar initials (G25, G31)",
      intro: "The radio group beside the pressed one: the same pixels, other semantics (a radiogroup of radios with aria-checked; the arrows move and check). Avatar's own initials beside the ones it takes from the name.",
      decisions: [NOT_REVIEWED],
      tryIt: ["Tab to the radio group and press the arrows: each press checks the segment it reaches.", "Tab to the pressed group: the arrows only move focus."],
      widths: [960, 390],
      demo: () => (<><style>{CSS}</style><Same /></>),
    },
  ],
};
