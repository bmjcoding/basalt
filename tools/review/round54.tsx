// Round 54: three sort states, the arrow after the label, and column explainers (DECISIONS 257 and 261). The owner picked variant (b) of Opus's prototype
// (table-sort-3), with the arrow after the label in every column and an end-aligned label that moves aside smoothly as the arrow comes and goes. Built by
// Opus; the code review is Astra's and the pixels are the lead's. Synthetic models only. States: at rest (`default`), `sorted` (Input, highest first),
// `reversed`, `own-order` (Input pressed three times: the load order, nothing lit), `moving-opening` (Output pressed and its label's move held 60ms into its
// 150ms), and an explainer open by hover (`explain-hover`), keyboard focus (`explain-focus`) and a long press (`explain-touch`), which build.mjs drives with
// a real pointer, key or finger.

import * as React from "react";

import {
  Link,
  sortRows,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableHeadExplainer,
  TableRow,
  TableRowHead,
  Text,
} from "../../packages/react/src/index";
import type { SortDirection } from "../../packages/react/src/index";
import type { Round } from "./rounds";

type Model = [name: string, input: number, output: number, latency: number | null, released: string, retention: number, training: number];
const MODELS: Model[] = [
  ["lumen/atlas-3", 2, 8, 0.62, "2026-11-19", 1, 1],
  ["lumen/atlas-3-mini", 0.25, 1, 0.31, "2026-11-19", 1, 1],
  ["quill/sparrow-2", 1.2, 4.8, 0.48, "2026-11-12", 0, 1],
  ["quill/sparrow-2-long-context-extended", 3, 15, null, "2026-11-12", 0, 0],
  ["harbor/tern-8b", 0.05, 0.2, 0.18, "2026-10-30", 1, 0],
  ["harbor/tern-70b", 0.6, 0.9, 0.74, "2026-10-30", 1, 0],
  ["meridian/kestrel", 5, 25, 1.2, "2026-10-21", 0, 1],
  ["meridian/kestrel-fast", 6, 30, 0.55, "2026-10-21", 0, 1],
  ["basin/heron-1.5", 0.8, 3.2, null, "2026-09-28", 1, 1],
  ["basin/heron-1", 0.4, 1.6, 0.95, "2026-08-14", 0, 0],
];
const COLUMNS = [{}, { width: 104 }, { width: 104 }, { width: 120 }, { width: 140 }, { width: 192 }, { width: 168 }];
const HEADS: Array<{ label: string; numeric?: boolean; firstSort?: SortDirection; explain?: [string, string, string] }> = [
  { label: "Model" },
  { label: "Input", numeric: true },
  { label: "Output", numeric: true },
  { label: "Latency", numeric: true },
  { label: "Released", firstSort: "descending" },
  { label: "Zero retention", firstSort: "descending", explain: ["Zero retention", "At least one provider for this model says it keeps no prompts or outputs once it has answered. Providers report this themselves.", "How retention is reported"] },
  { label: "No training", firstSort: "descending", explain: ["No training", "No provider for this model trains on your prompts or outputs. Providers report this themselves.", "How training terms are read"] },
];
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const kindOf = (state: string) => state.replace(/-(reduced-motion|forced-colours)$/, "");

function Models({ state }: { state: string }) {
  const kind = kindOf(state);
  const [sort, setSort] = React.useState<{ index: number; dir: SortDirection | undefined }>(kind === "sorted" ? { index: 1, dir: "descending" } : kind === "reversed" ? { index: 1, dir: "ascending" } : { index: -1, dir: undefined });
  const table = React.useRef<HTMLTableElement>(null);
  React.useEffect(() => {
    const t = table.current;
    if (!t) return undefined;
    const press = (i: number) => t.querySelectorAll<HTMLButtonElement>("thead th .basalt-sort")[i]?.click();
    // Three real presses on Input: highest first, lowest first, then the table's own order with nothing lit.
    if (kind === "own-order") {
      const timers = [60, 160, 260].map((ms) => window.setTimeout(() => press(1), ms));
      return () => timers.forEach(window.clearTimeout);
    }
    // One press on Output, its label's move held part-way (60ms of 150): the label alone has moved, the arrow has not yet come.
    if (kind === "moving-opening") {
      const timer = window.setTimeout(() => {
        press(2);
        // React draws the sorted header on its next commit; the transitions start at the style change after it. Every transition in the header (the
        // label's move and the arrow's wait) is held at the same instant.
        frame = requestAnimationFrame(() => requestAnimationFrame(() => {
          const th = t.querySelectorAll<HTMLElement>("thead th")[2];
          for (const a of th?.getAnimations({ subtree: true }) ?? []) { a.pause(); a.currentTime = 60; }
        }));
      }, 120);
      let frame = 0;
      return () => { window.clearTimeout(timer); cancelAnimationFrame(frame); };
    }
    return undefined;
  }, [kind]);
  const rows = sortRows(MODELS, (m) => m[sort.index] as string | number | null, sort.dir);
  return (
    <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", paddingTop: 220 }}>
      <Text size="sm" tone="secondary" style={{ marginBottom: "var(--basalt-space-3)" }}>A synthetic models table. Zero retention and No training explain themselves.</Text>
      <TableContainer label="Models">
        <Table ref={table} columns={COLUMNS} minWidth={1008} pinned={1} aria-label="Models">
          <TableHeader>
            <TableRow>
              {HEADS.map((h, i) => (
                <TableHead
                  key={h.label}
                  numeric={h.numeric}
                  firstSort={h.firstSort}
                  sort={sort.index === i ? sort.dir : undefined}
                  onSortChange={(dir) => setSort({ index: dir ? i : -1, dir })}
                  data-wt-explain={h.label === "Zero retention" ? "" : undefined}
                  data-wt-before={h.label === "Released" ? "" : undefined}
                  explainer={h.explain ? <TableHeadExplainer title={h.explain[0]}><p>{h.explain[1]}</p><p><Link href={`#${h.label.split(" ")[0]!.toLowerCase()}`}>{h.explain[2]}</Link></p></TableHeadExplainer> : undefined}
                >
                  {h.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m[0]}>
                <TableRowHead>{m[0]}</TableRowHead>
                <TableCell numeric>{`$${m[1].toFixed(2)}`}</TableCell>
                <TableCell numeric>{`$${m[2].toFixed(2)}`}</TableCell>
                {m[3] === null ? <TableCell numeric notObserved /> : <TableCell numeric>{`${m[3].toFixed(2)} s`}</TableCell>}
                <TableCell>{date.format(new Date(m[4]))}</TableCell>
                <TableCell>{m[5] ? "Yes" : "No"}</TableCell>
                <TableCell>{m[6] ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

const STATES = [
  "sorted",
  "reversed",
  "own-order",
  "moving-opening@1440",
  "explain-hover@1440",
  "explain-focus",
  "explain-touch@390",
  "sorted-forced-colours",
  "explain-focus-forced-colours",
  "sorted-reduced-motion",
  "explain-focus-reduced-motion",
];

export const ROUND_54: Round = {
  id: "54",
  title: "Three sort states, the arrow after the label, and column explainers (DECISIONS 257, 261)",
  reviewed: false,
  summary:
    "The owner's pick from Opus's prototype (table-sort-3, variant b; DECISIONS 261): a header press sorts, reverses, then returns the table to its own order with no column lit; the arrow sits after the label in every column, and an end-aligned label moves aside smoothly as it comes and goes; a column a reader could misread has an explainer that opens from the header itself. Built by Opus; the code review is Astra's and has not happened yet, and the design panel did not review it (the owner picked it from pictures). Synthetic models only, at 1440 and at 390 on touch, in both themes, with forced colours and reduced motion.",
  steps: [
    {
      id: "models",
      name: "The models table",
      intro: "A still table of synthetic models: a pinned name, two prices and a latency (end-aligned), a release date, and two yes/no columns with explainers.",
      decisions: [
        "Picked by the owner (DECISIONS 261): a press cycles the column's first direction, the reverse, then the table's own order with no column lit and no aria-sort anywhere. Numbers and times start descending.",
        "Every sort runs from the table's own order, so ties keep it and the third press gives the load order back row for row (`sortRows`; the HTML skill sorts the same way).",
        "Picked by the owner: the arrow sits after the label in every column. A start-aligned label never moves. An end-aligned label rests on the numbers' edge and moves aside by a transform as the arrow comes (duration-base, ease-out) and goes (0.75x, ease-in); the arrow waits for it on a fine pointer. Under reduced motion and on touch the label stays beside its seat. Column widths, the header's height and every other column never move.",
        "The explainer is `TableHeadExplainer`, given to a sortable `TableHead` as `explainer`: a popover (not a Tooltip), its opener's level plus one, the neutral rim, radius 12 and shadow-overlay, above the header (else beside it), never over its column. It opens on hover after 600ms, on keyboard focus, and on a long press on touch; a press before the wait sorts and cancels it. Esc closes it, the pointer can move onto it, and it stays until hover and focus have left (WCAG 1.4.13).",
        "Engineering (kept from the prototype's findings): the pinned column's scroll-on-focus runs for keyboard focus only, so a tap on a half-covered header is never carried away from under the finger.",
        "Not reviewed: the implementation has not been reviewed by Astra or the design panel yet. The held-still end-aligned label under reduced motion (it keeps its place beside the seat instead of jumping) and the arrow's short wait on a fine pointer are the builder's readings of the pick.",
      ],
      tryIt: [
        "Press Input three times: highest first, lowest first, then the models in their own order with nothing lit. The label slides aside as the arrow comes and back as it goes.",
        "Press Released, then Input, then Released: the two models released on each day stay in their own order.",
        "Hover Zero retention and wait: the explainer opens above the header. Press before it opens: the column sorts and nothing opens.",
        "Tab to No training: its explainer opens at once; Tab goes into its link, Esc closes it. On a phone, hold a finger on the header.",
      ],
      states: [...STATES],
      widths: [1440, 390],
      scales: [2],
      height: 720,
      touch: true,
      demo: ({ state }) => <Models state={state} />,
    },
  ],
};
