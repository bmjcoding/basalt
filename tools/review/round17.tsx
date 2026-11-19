// Round 17: the still table and the multi-select filter. The council voted (decision 82), and the owner settled the open points
// (decisions 83 and 84: Clear stays in place, the whole header cell is the sort control); this is that design built as decided.
// The design panel has not reviewed this implementation.
//
// The states are real. "reduced-motion", "forced-colours" and "forced-mixed" are emulations that build.mjs sets before the page
// loads, and a state that ends in either takes the same emulation. "hover" is a real pointer on the Region header (build.mjs
// moves it there); "focus" is real keyboard focus on a header; "checklist" opens the Region popup; "clear-focus" puts keyboard
// focus on Clear while it is at zero; "scrolled" scrolls the table sideways, which is what the 390px screenshots show.

import * as React from "react";

import {
  Button,
  Checkbox,
  FilterResult,
  MultiSelect,
  Segment,
  SegmentedControl,
  TableBody,
  TableCell,
  TableContainer,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Table,
  Skeleton,
} from "../../packages/react/src/index";
import type { SortDirection } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", width: "100%" };
const row: React.CSSProperties = { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" };

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="wt-caption">{children}</div>;
}

const NAMES = ["billing-worker", "edge-router", "ingest-batch", "mailer", "search-index", "thumbnailer", "auth-proxy", "report-builder"];
const REGIONS = ["us-east", "us-west", "eu-central", "eu-west", "ap-south", "ap-northeast", "sa-east", "af-south"];
const STATUS = ["Succeeded", "Failed", "Running", "Queued"];
interface Run { id: number; name: string; status: string; region: string; duration: number; started: number; cost: number }
const RUNS: Run[] = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  name: `${NAMES[i % 8]}-${100 + i}${i % 5 === 0 ? "-with-a-long-suffix-that-has-to-truncate-in-its-column" : ""}`,
  status: STATUS[i % 4]!,
  region: REGIONS[(i * 3) % 8]!,
  duration: ((i * 37) % 500) + 3,
  started: 1700000000 - i * 18000,
  cost: ((i * 13) % 90) / 10,
}));
// Select, name (the one column that takes the rest), status, region, duration, started, cost. At 390 the select column and the
// name are pinned: the name is 140 at the minimum width, so 174px of data scrolls beside 184 of pinned columns.
const COLUMNS = [{ width: 44 }, {}, { width: 120 }, { width: 112 }, { width: 112 }, { width: 144 }, { width: 88 }];
const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

type Key = "name" | "status" | "region" | "duration" | "started" | "cost";

function Runs({ state }: { state: string }) {
  const [sort, setSort] = React.useState<{ key: Key; dir: SortDirection }>(state.startsWith("sorted-asc") ? { key: "name", dir: "ascending" } : { key: "started", dir: "descending" });
  const [status, setStatus] = React.useState<string[]>(state === "chips-on" ? ["Failed", "Running"] : []);
  const [region, setRegion] = React.useState<string[]>([]);
  const [range, setRange] = React.useState("30d");
  const [picked, setPicked] = React.useState<number[]>(state === "scrolled" ? [1] : []);
  const [query, setQuery] = React.useState(state === "one-row" ? "report-builder-107" : state === "empty" ? "zzz" : "");
  const [loading, setLoading] = React.useState(false);
  const stage = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const node = stage.current;
    if (!node) return undefined;
    const timer = window.setTimeout(() => {
      if (state === "focus") node.querySelector<HTMLElement>("thead th:nth-child(3) button")?.focus({ focusVisible: true } as FocusOptions);
      if (state.startsWith("checklist")) node.querySelector<HTMLElement>(".basalt-filter-trigger")?.click();
      if (state === "clear-focus") node.querySelector<HTMLElement>(".basalt-filter-clear")?.focus({ focusVisible: true } as FocusOptions);
      if (state === "scrolled") node.querySelector<HTMLElement>(".basalt-table-container")!.scrollLeft = 200;
    }, 50);
    return () => window.clearTimeout(timer);
  }, [state]);
  const shown = RUNS.filter((r) => (status.length ? status.includes(r.status) : true) && (region.length ? region.includes(r.region) : true) && r.name.includes(query)).sort((a, b) => {
    const d = typeof a[sort.key] === "string" ? String(a[sort.key]).localeCompare(String(b[sort.key])) : Number(a[sort.key]) - Number(b[sort.key]);
    return (sort.dir === "ascending" ? d : -d) || a.id - b.id;
  });
  const rows = shown.slice(0, 10);
  const head = (key: Key, label: string, extra: { numeric?: boolean; firstSort?: SortDirection } = {}) => (
    <TableHead sort={sort.key === key ? sort.dir : undefined} onSortChange={(dir) => setSort({ key, dir })} data-wt-hover={key === "region" ? "" : undefined} {...extra}>{label}</TableHead>
  );
  return (
    <div style={col} ref={stage}>
      <Caption>A runs table with its filter row. Sort by pressing anywhere in a header; filter by the chips and the Region checklist.</Caption>
      <div style={row}>
        <div style={col}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Window</div>
          <SegmentedControl aria-label="Window" value={range} onValueChange={setRange}>
            <Segment value="24h">24h</Segment>
            <Segment value="7d">7d</Segment>
            <Segment value="30d">30d</Segment>
          </SegmentedControl>
        </div>
        <MultiSelect label="Status" options={STATUS.map((s) => ({ value: s, label: s }))} value={status} onValueChange={setStatus} />
        <MultiSelect label="Region" toolbar options={REGIONS.map((s) => ({ value: s, label: s }))} value={region} onValueChange={setRegion} />
      </div>
      <FilterResult>{`Showing ${shown.length} of ${RUNS.length} runs`}</FilterResult>
      <TableContainer style={{ width: "100%" }}>
        <Table columns={COLUMNS} minWidth={760} pinned={2} aria-label="Runs" aria-busy={loading || undefined}>
          <TableHeader>
            <TableRow>
              <TableHead aria-label="Select"><Checkbox aria-label="Select all" /></TableHead>
              {head("name", "Name")}
              {head("status", "Status")}
              {head("region", "Region")}
              {head("duration", "Duration", { numeric: true })}
              {head("started", "Started", { firstSort: "descending" })}
              {head("cost", "Cost", { numeric: true })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>{COLUMNS.map((_c, j) => <TableCell key={j}><Skeleton style={{ width: j === 1 ? "60%" : 48, height: 12 }} /></TableCell>)}</TableRow>
              ))
            ) : rows.length === 0 ? (
              status.length || region.length
                ? <TableEmpty colSpan={7} action={<Button size="sm" variant="secondary" onClick={() => { setStatus([]); setRegion([]); setQuery(""); }}>Clear filters</Button>}>No runs match these filters.</TableEmpty>
                : <TableEmpty colSpan={7} action={<Button size="sm" variant="secondary" onClick={() => setQuery("")}>Clear search</Button>}>{`No runs match “${query}”.`}</TableEmpty>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} selected={picked.includes(r.id)}>
                  <TableCell><Checkbox aria-label={`Select ${r.name}`} checked={picked.includes(r.id)} onCheckedChange={(on) => setPicked((p) => (on ? [...p, r.id] : p.filter((x) => x !== r.id)))} /></TableCell>
                  <TableCell><a href="#runs" style={{ color: "inherit" }}>{r.name}</a></TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell mono>{r.region}</TableCell>
                  <TableCell numeric>{`${r.duration}s`}</TableCell>
                  <TableCell>{fmt.format(new Date(r.started * 1000))}</TableCell>
                  <TableCell numeric>{`$${r.cost.toFixed(2)}`}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <div style={row}>
        <Button size="sm" variant="ghost" onClick={() => setLoading((v) => !v)}>{loading ? "Finish loading" : "Show loading rows"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setQuery((q) => (q ? "" : "report-builder-107"))}>{query ? "Show every row" : "Filter to one row"}</Button>
      </div>
    </div>
  );
}

// ---- the chip, in every state

function Specimens() {
  const options = ["us-east", "eu-west", "ap-south"].map((v) => ({ value: v, label: v }));
  return (
    <div style={col}>
      <Caption>Off, some on (two of three), and everything on a toolbar: a trigger and a checklist</Caption>
      <div style={row}>
        <MultiSelect label="Region" options={options} />
        <MultiSelect label="Region" options={options} defaultValue={["us-east", "eu-west"]} />
      </div>
      <Caption>A disabled value</Caption>
      <MultiSelect label="Region" options={[{ value: "a", label: "us-east" }, { value: "b", label: "af-south", disabled: true }, { value: "c", label: "ap-south" }]} defaultValue={["a"]} />
      <Caption>Beside a Segmented, which stays one-of-many: a track and one raised pill</Caption>
      <div style={row}>
        <SegmentedControl aria-label="Window" defaultValue="7d">
          <Segment value="24h">24h</Segment>
          <Segment value="7d">7d</Segment>
          <Segment value="30d">30d</Segment>
        </SegmentedControl>
        <MultiSelect label="Status" options={STATUS.map((s) => ({ value: s, label: s }))} defaultValue={["Failed"]} />
      </div>
    </div>
  );
}

export const ROUND_17: Round = {
  id: "17",
  title: "The still table and the multi-select",
  reviewed: false,
  summary:
    "The council voted (decision 82) and the owner settled the open points (decisions 83 and 84): the sort control is the whole header cell, and Clear stays in place, disabled at zero, with keyboard focus kept. This is that design built as decided, with the still table (fixed layout, a reserved indicator seat, a spanning empty row, pinned columns at 390 with the divider only while scrolled) and the multi-select (chips for up to six values, a trigger and a checklist from seven or in a toolbar, one debounced result line). It is not in this round: toasts, the notification centre and callouts. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "table",
      name: "The still table",
      intro: "Header positions, column widths and alignment never move: not through a sort, a filter down to one row or to none, paging, loading, or the sort indicator appearing on hover, focus and touch.",
      decisions: [
        "Decided (71, 82, 84): fixed layout from a colgroup, with one column that takes the rest and a minimum width below which the container scrolls. Cells truncate with an ellipsis. Every sortable header reserves a 16px seat; on a numeric column it is on the start side, so the label's edge stays on the numbers' edge. No weight change on the sorted header.",
        "Decided (84, the owner): the whole header cell is the button. Hover lifts the label from secondary to primary and shows a tertiary caret in the seat, with no wash on the cell. Focus is the flush-field −2 inset. The caret also shows on focus and always on touch. Sorted, the arrow sits in the seat in primary ink (the votes agree: Opus's prototype and Sol's vote say primary).",
        "Decided: ascending, then descending; numbers and times start descending; no third state. aria-sort is on the th. The header band is 32px, 44 on touch.",
        "Decided: empty is one row spanning every column under the unchanged header, with a sentence and a Clear action. It is outside the sticky rules.",
        "Decided (3 to 1): at 390 the name sticks, and the select column with it when there is one. Pinned cells are opaque in every state, and the 1px divider at the pinned edge shows only while the table is actually scrolled: structure, never a mark. A focused header is never covered by the pinned columns (82's defect, tested).",
        "Decided: the page sets scrollbar-gutter: stable, so a filter that shortens the page cannot widen the remainder column. Written into foundations as app guidance.",
        "Engineering choices, for the panel: the table takes `columns`, `minWidth` and `pinned`, a sortable `TableHead` takes `sort`, `onSortChange` and `firstSort`, and the empty row is `TableEmpty`. The sort arrows are the core ArrowUp and ArrowDown glyphs and the caret is Phosphor's up-down, all at the 16px seat. The prototypes drew them at 12px inside the seat; foundations only allows 16, 20 and 24, so 16 is what is built (open for the panel).",
      ],
      tryIt: [
        "Press anywhere in a header, its corner or the empty end, and again: ascending then descending (Duration, Cost and Started start descending).",
        "Hover a header, then Tab through them: the label lifts and the caret appears, and no header moves by a pixel.",
        "Use 'Filter to one row', then the empty state, then 'Show loading rows': the header stays exactly where it was.",
        "At 390 (or a narrow window), scroll sideways: the select column and the name stay, the divider appears only once scrolled, and Tab to Cost brings it clear of them.",
      ],
      states: ["hover", "focus", "sorted-asc", "one-row", "empty", "scrolled", "reduced-motion", "forced-colours"],
      demo: ({ state }) => <Runs state={state} />,
    },
    {
      id: "multiselect",
      name: "The multi-select filter",
      intro: "A filter that takes any number of its values: independent chips with no track, so it can't be mistaken for the one-of-many Segmented control beside it.",
      decisions: [
        "Decided (82, 4 to 0): chips of 32px (36 inside a 44px target on touch), radius 6 (8 at 36). Off is a tertiary plus in a 16px seat; on is the selected wash, primary ink and a check in the same seat, so turning one on moves nothing, and it is never colour alone.",
        "Decided (3 to 1): the plus and the check cross-fade over duration-fast (100ms); it is not a morph, and there is none under reduced motion.",
        "Decided (3 to 1): checkboxes in a labelled group; the visible '2 of 4' is the group's description and is not live. Tab reaches each chip and Space toggles it.",
        "Decided (4 to 0): seven or more values, or any use in a toolbar, are a trigger and a checklist (a non-modal popup of popup rows, with the same checkbox group). The switch depends on the count, never the viewport.",
        "Decided (83, the owner): Clear stays mounted, in place, with the same label. At zero it is aria-disabled, not disabled, and keyboard focus stays on it; it never hides and never moves focus.",
        "Decided (4 to 0): one debounced, polite, atomic result line outside the filter ('Showing 3 of 24 runs', after 400ms of stillness). It is the only live region.",
        "Forced colours: every part of a chip is a system pair. An on chip is Highlight with HighlightText on its label and check, and stays so on hover (82's defect, tested).",
        "Not built here, for the panel: the checklist has no search band at eight values or more (Opus drew one); the popup is the group and its footer. Each row keeps its own tab stop and also answers the arrow keys.",
      ],
      tryIt: [
        "Toggle chips with the mouse and with Space, and watch the result line: three quick toggles are one announcement.",
        "Open the Region checklist, check two regions, and press Escape: focus returns to the trigger.",
        "Press Clear with the keyboard: it clears and keeps focus. At zero it is dimmed and still reachable.",
      ],
      states: ["chips-on", "checklist", "clear-focus", "checklist-forced-colours", "forced-colours", "reduced-motion"],
      demo: ({ state }) => (state === "default" ? <Specimens /> : <Runs state={state} />),
    },
  ],
};
