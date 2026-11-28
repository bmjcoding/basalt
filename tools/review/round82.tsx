// Round 82: cimip-gaps-3 E6 (engineering, DECISIONS 402): the narrow ListBand that holds its pager's seat (G144), VersionLink's `place` and the rail's
// tooltip outside AppShell (G160), and IconButton's `icon` as a node (G161). Built by Opus; not reviewed; the browser tests are written and not run
// (DECISIONS 359). Only G144 changes a pixel, and only in an opt-in state (keepFootRoom, or a total of null) under the width where the pager and the page
// size share a row. Synthetic data in unlike domains: a library's loans and a greenhouse's sensors; a studio's bookings for the bar.

import * as React from "react";

import { Avatar, IconButton, ListBand, PanelList, PanelRow, RailTooltipContext, SearchGlyph, Tooltip, VersionLink } from "../../packages/react/src/index";
import type { TooltipProps } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-8)", minWidth: 0 };
const NOT_REVIEWED = "Engineering under DECISIONS 402 (the stream's handoff, DECISIONS 385); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";

// ---- G144 ----

/** A list whose total is set by the state: "unknown" is null, "three" is three pages, anything else one page. "before" draws the band without the hold. */
function Band({ state, noun, rows }: { state: string; noun: string; rows: string[] }) {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(10);
  const before = state === "before";
  const total = state === "unknown" ? null : state === "three" ? rows.length : 4;
  const shown = total === null ? [] : rows.slice((page - 1) * size, Math.min(page * size, total));
  return (
    <div>
      <p style={label}>{before ? "Without the hold (as shipped): one row at one page" : state === "unknown" ? "total={null}: the seat held while the total is not known" : state === "three" ? "Three pages" : "keepFootRoom at one page: the seat held"}</p>
      <ListBand total={total} seatTotal={999} rangeTotal={false} keepFootRoom={!before} page={page} pageSize={size} pageSizes={[10, 25, 50]} onPageChange={setPage} onPageSizeChange={setSize} noun={noun} backToTop={false}>
        <PanelList aria-label={noun}>{shown.map((row) => <PanelRow key={row} href={`#${row}`} title={row} />)}</PanelList>
      </ListBand>
    </div>
  );
}

const LOANS = Array.from({ length: 27 }, (_, i) => `Loan ${String(i + 101)}: ${["Atlas of tides", "Field guide to mosses", "Letters from the coast", "A short history of maps"][i % 4]}`);
const SENSORS = Array.from({ length: 27 }, (_, i) => `Sensor ${i + 1}, ${["north bench", "south bench", "cold frame"][i % 3]}`);

function Bands({ state }: { state: string }) {
  return (
    <div style={stack}>
      <Band state={state} noun="Loans" rows={LOANS} />
      <Band state={state} noun="Sensors" rows={SENSORS} />
    </div>
  );
}

// ---- G161 ----

function Bar({ state }: { state: string }) {
  const busy = state === "busy";
  return (
    <div style={stack}>
      <div>
        <p style={label}>A studio's bar: a glyph, then an account control (an Avatar at 24 in the 32 square)</p>
        <div style={{ display: "flex", gap: "var(--basalt-space-1)", alignItems: "center", paddingBlock: "var(--basalt-space-2)" }}>
          <IconButton variant="ghost" icon={SearchGlyph} label="Search bookings" />
          <IconButton variant="ghost" icon={<Avatar size={24} name="Rui Okafor" />} label="Account: Rui Okafor" loading={busy} />
        </div>
      </div>
      <div>
        <p style={label}>A greenhouse's panel head: secondary at 28, an element of the app's own</p>
        <div style={{ display: "flex", gap: "var(--basalt-space-2)", alignItems: "center" }}>
          <IconButton variant="secondary" size="sm" icon={<span style={{ display: "block", width: 10, height: 10, borderRadius: "var(--basalt-radius-full)", background: "currentColor" }} />} label="Sensor 4" />
          <IconButton variant="secondary" size="sm" icon={<Avatar size={24} name="Mina Sørensen" />} label="Grower: Mina Sørensen" />
        </div>
      </div>
    </div>
  );
}

// ---- G160 ----

const OpenTooltip = (props: TooltipProps) => <Tooltip {...props} defaultOpen />;

function Rail({ state }: { state: string }) {
  const tip = state === "tooltip";
  const link = <VersionLink place="rail" version="3.2.0" date="2026-10-02" href="#v3.2.0" />;
  return (
    <div style={stack}>
      <div>
        <p style={label}>An app's own 64px rail, place="rail"</p>
        <div style={{ width: 64, paddingBlock: "var(--basalt-space-3)" }}>
          {tip ? <RailTooltipContext.Provider value={OpenTooltip}>{link}</RailTooltipContext.Provider> : link}
        </div>
      </div>
      <div>
        <p style={label}>The same link with no place: the plain line</p>
        <VersionLink version="3.2.0" date="2026-10-02" href="#v3.2.0" />
      </div>
    </div>
  );
}

export const ROUND_82: Round = {
  id: "82",
  title: "cimip-gaps-3 E6: the held pager seat, VersionLink's place, an avatar as a bar control",
  reviewed: false,
  summary:
    "Engineering (DECISIONS 402). G144: with keepFootRoom, or while the total is null, the narrow ListBand keeps its pager's seat at one page, unseen and inert, so a late total never moves or grows the band; under the width where the pager and the page size share a row that is a second row at one page too. G160: VersionLink's place prop and the rail's tooltip context, outside AppShell. G161: IconButton's icon as an element. Only G144's held state under the wrap width changes a pixel.",
  steps: [
    {
      id: "band",
      name: "The narrow band holds its pager's seat (G144)",
      intro: "At one page or none the band keeps the pager in the row, unseen, with the range over the start of its seat. Over the wrap width (390) it draws what the unheld band does; under it (320, a 288 band) one page is two rows, as three pages are, so the total's arrival moves nothing.",
      decisions: [
        "This is the one pixel change: T3 (item 9) and foundations' stated limit said the seat is not held under about 340. The hold is opt-in (keepFootRoom, or total={null}); the default is unchanged.",
        "The wrap width is not a number in the stylesheet: the held seat is the same box as the drawn pager, so it wraps where the pager does.",
        NOT_REVIEWED,
      ],
      tryIt: ["Compare 'keepFootRoom at one page' with 'Three pages' at 320: the page size is in the same place."],
      states: ["before", "unknown", "three"],
      widths: [390, 320],
      touch: true,
      height: 720,
      demo: ({ state }) => <Bands state={state} />,
    },
    {
      id: "bar",
      name: "IconButton with an element (G161)",
      intro: "The element is drawn at its own size in the glyph's place, centred in the square, hidden from assistive technology (the label is the name), with the plate, ring, press and hit area of the glyph form.",
      decisions: ["No pixel of the component form changes.", NOT_REVIEWED],
      tryIt: ["Tab to the account control: the same ring as the glyph beside it. Press and hold it: the same .98."],
      states: ["busy"],
      widths: [1440, 390],
      touch: true,
      height: 320,
      demo: ({ state }) => <Bar state={state} />,
    },
    {
      id: "rail",
      name: "VersionLink in an app's own rail (G160)",
      intro: "place=\"rail\" draws the rail's form outside AppShell; RailTooltipContext hands down Basalt's Tooltip. Without one, the number stands alone with its whole line in its name.",
      decisions: ["The rail's form is as AppShell draws it; nothing in AppShell changed.", NOT_REVIEWED],
      tryIt: ["Hover the number: the tooltip says the whole line."],
      states: ["tooltip"],
      widths: [960],
      height: 320,
      demo: ({ state }) => <Rail state={state} />,
    },
  ],
};
