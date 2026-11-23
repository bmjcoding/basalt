// Round 66: Basalt's diagrams, batch B (DECISIONS 301; the decision is 306, revised by 313, with part 9, the viewer, as 310). A heavy council round: two
// drafts and one check, decided by Fable, revised after the final positions. Part 9 (the viewer) is the owner's own addition and skipped three steps: no
// draft, no check and no seat's position; every value in it is the decider's alone. Built by Opus from the decision; the implementation has not been
// reviewed. The content is CIMIP's figures extended as each part needs (test/fixtures/cimip-diagrams-b.json). Only the parts built so far are shown:
// cardinality and far keys, the text art, the touch trace, the first visit, dashed flow, marks on steps and participants, right to left, export and
// automatic layout are not built yet, so this round has no automatically placed figure.

import * as React from "react";

import { ArchitectureDiagram, DataFlowDiagram, FlowchartDiagram, SchemaDiagram, SequenceDiagram } from "../../packages/react/src/index";
import data from "../../packages/react/test/fixtures/cimip-diagrams-b.json";
import type { Round } from "./rounds";

type Key = keyof typeof data;
const isShot = () => new URLSearchParams(window.location.search).get("shot") === "1";
const frames = (n: number) => new Promise<void>((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); });

/** A figure from the extended fixture. A "viewer" state opens its viewer (and "viewer-200" zooms to 200%) once it is drawn, for the shot. */
function Diagram({ k, state }: { k: Key; state: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!isShot() || !state.startsWith("viewer")) return;
    let ready: () => void = () => {};
    (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = new Promise<void>((resolve) => { ready = resolve; });
    (async () => {
      await frames(6);
      host.current?.querySelector<HTMLButtonElement>(".basalt-diagram-expand")?.click();
      for (let t = 0; t < 60 && !document.querySelector("dialog.basalt-diagram-viewer .basalt-diagram[data-layout]"); t++) await frames(2);
      await new Promise((r) => setTimeout(r, 400));
      if (state === "viewer-200") {
        const level = () => Number(document.querySelector(".basalt-diagram-level > span")?.textContent?.replace("%", "") ?? 0);
        for (let i = 0; i < 12 && level() < 200; i++) document.querySelector<HTMLButtonElement>('dialog.basalt-diagram-viewer button[aria-label="Zoom in"]')?.click();
      }
      await frames(4);
      ready();
    })();
  }, [state]);
  const { type, ...props } = data[k] as unknown as { type: string } & Record<string, unknown>;
  const figure = (() => {
    switch (type) {
      case "architecture": return <ArchitectureDiagram {...(props as unknown as React.ComponentProps<typeof ArchitectureDiagram>)} />;
      case "flowchart": return <FlowchartDiagram {...(props as unknown as React.ComponentProps<typeof FlowchartDiagram>)} />;
      case "data-flow": return <DataFlowDiagram {...(props as unknown as React.ComponentProps<typeof DataFlowDiagram>)} />;
      case "sequence": return <SequenceDiagram {...(props as unknown as React.ComponentProps<typeof SequenceDiagram>)} />;
      default: return <SchemaDiagram {...(props as unknown as React.ComponentProps<typeof SchemaDiagram>)} />;
    }
  })();
  return <div ref={host} style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", maxWidth: 1104 + 48, boxSizing: "border-box" }}>{figure}</div>;
}

const COMMON = [
  "Decided by the council (DECISIONS 306, revised by 313): the owner sees this PR before it merges. Built by Opus; the implementation has not been reviewed.",
  "A figure that uses none of the new keys draws what it drew before, except the flowchart: a decision taller than wide is now a fit failure (section 4, call 1), so CIMIP's flowchart is stacked through 975 and drawn from 976.",
];
const W = [1440, 390];

export const ROUND_66: Round = {
  id: "66",
  title: "Diagrams, batch B: the viewer, frames and activations, nested groups, link cards, two-line labels and spatial keys (DECISIONS 306 and 310)",
  summary: "The first half of batch B. The viewer (part 9, the owner's addition) opens any figure's drawn layout in a dialog to zoom and pan; the sequence gains activation bars and opt, loop and alt frames; groups nest two deep; a card may be a link; an edge label may hold its author's break; the arrow keys move by the cards' columns and rows. Not built yet: cardinality and far keys, the text art, the touch trace, the first visit, dashed flow, marks on steps and participants, right to left, export and automatic layout (elkjs).",
  reviewed: false,
  steps: [
    {
      id: "viewer",
      name: "The viewer: Expand, Fit, zoom and pan",
      intro: "\"Expand\" in every figure's foot opens the drawn layout in a dialog: the window less 16px from 720, the whole window under it. It opens at Fit; a phone gets the drawing its page cannot show.",
      decisions: [
        "Part 9 skipped three steps: no draft, no check and no seat's position. Every value is the decider's alone (DECISIONS 310).",
        "Laid out once at 100% in real CSS pixels and zoomed with one transform: never a viewBox, CSS zoom, a canvas or a picture. Fit is the whole drawing in the stage, 200% at most; the limits are Fit or 100% and 400%; steps 25 to 400 land at once.",
        "Two deviations, for the owner: \"Expand\" is words only (Phosphor's ArrowsOutSimple cost every still figure 2.2 KB in six weights, and the core set draws no expand glyph), and the dialog is the form dialog's box on a native modal <dialog>, as the HTML skill's is (Base UI's dialog in the viewer's chunk widened the Base UI chunk every component shares).",
        "Under 100% the words are under 12px: an overview, with no size or contrast claim. Nothing moves in the viewer but a trace.",
      ],
      tryIt: ["Press Expand, then + and - (or Ctrl and the wheel, or pinch): the point under the pointer holds still. Drag to pan. 0 is Fit. Esc closes and focus returns to Expand.", "On a phone: two fingers zoom about their midpoint, one finger pans."],
      states: ["viewer", "viewer-200"],
      widths: W,
      scales: [2],
      height: 900,
      touch: true,
      demo: ({ state }) => <Diagram k="schema" state={state} />,
    },
    {
      id: "architecture",
      name: "Architecture: nested groups, a link card and two-line labels",
      intro: "\"Data & logs\" sits inside AWS: 16px inside it at the sides and 32 below its top, radius 8. The cimip service card is a link, with the arrow after its name. Two labels carry their author's break.",
      decisions: [...COMMON, "A stacked group's label sits on a ground plate over the lines (1.3). Where a turn into the inner group's first card runs at the label's height, the line runs behind the plate: a visual question for the owner."],
      tryIt: ["Hover the cimip service card: its name underlines and the arrow lifts. Tab to the figure and press the arrows: they move by the cards' columns and rows. Enter on the service follows its link."],
      states: ["viewer"],
      widths: W,
      scales: [2],
      height: 1600,
      touch: true,
      demo: ({ state }) => <Diagram k="architecture" state={state} />,
    },
    {
      id: "sequence",
      name: "Sequence: activations and frames",
      intro: "The service works from the mention to the end, the sandbox from its run to \"done\". An opt holds a loop, and an alt has two branches.",
      decisions: [...COMMON, "A frame is structure, never a panel: no fill, no rim, no level; every word of it sits on a ground plate, so a lifeline or a bar stops either side of it. An activation bar is the vertical bar nearest the one the owner ruled out (item 8 of the decision)."],
      tryIt: ["Open View as list: the frames are sub-headings (\"Only if: ...\", \"Otherwise: ...\") and messages keep their numbers."],
      widths: W,
      scales: [2],
      height: 1800,
      touch: true,
      demo: ({ state }) => <Diagram k="sequence" state={state} />,
    },
    {
      id: "schema",
      name: "Schema: a link table",
      intro: "The incidents table is a link. Cardinality and far keys are not built yet.",
      decisions: [...COMMON],
      tryIt: ["Tab to the schema: the link table is the figure's roving stop."],
      widths: W,
      scales: [2],
      height: 1200,
      touch: true,
      demo: ({ state }) => <Diagram k="schema" state={state} />,
    },
    {
      id: "print",
      name: "Print: light and untraced",
      intro: "The token CSS ends with a print block: any page printed from the dark theme prints in the light one, and a figure prints in its resting ink.",
      decisions: ["The print theme is the whole package's, not the diagrams' alone (item 5 of the decision). An app that prints dark on purpose overrides it."],
      tryIt: ["Print this page from the dark theme."],
      states: ["print@1440"],
      widths: [1440],
      scales: [2],
      height: 1200,
      demo: ({ state }) => <Diagram k="sequence" state={state} />,
    },
  ],
};
