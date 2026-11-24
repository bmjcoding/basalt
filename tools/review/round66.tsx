// Round 66: Basalt's diagrams, batch B (DECISIONS 301; the decision is 306, revised by 313, with part 9, the viewer, as 310). A heavy council round: two
// drafts and one check, decided by Fable, revised after the final positions. Part 9 (the viewer) is the owner's own addition and skipped three steps: no
// draft, no check and no seat's position; every value in it is the decider's alone. Built by Opus from the decision; the implementation has not been
// reviewed. The content is CIMIP's figures extended as each part needs (test/fixtures/cimip-diagrams-b.json), with automatic and text-art versions.

import * as React from "react";

import { ArchitectureDiagram, DataFlowDiagram, FlowchartDiagram, SchemaDiagram, SequenceDiagram } from "../../packages/react/src/index";
import data from "../../packages/react/test/fixtures/cimip-diagrams-b.json";
import type { Round } from "./rounds";
import { diagramToSvg } from "../../packages/react/src/diagram-export";
import { awsEcsService } from "../../packages/react/src/marks/aws-ecs-service";
import { awsEcsTask } from "../../packages/react/src/marks/aws-ecs-task";
import { awsS3Bucket } from "../../packages/react/src/marks/aws-s3-bucket";

// Marks on a sequence's participants (DECISIONS 306, 1.6): the service and the sandbox, and none on Marcus, who is a person.
const PARTICIPANT_MARKS: Record<string, unknown> = { svc: awsEcsService, agent: awsEcsTask };

type Key = keyof typeof data;
const isShot = () => new URLSearchParams(window.location.search).get("shot") === "1";
const frames = (n: number) => new Promise<void>((resolve) => { let k = 0; const step = () => (++k >= n ? resolve() : requestAnimationFrame(step)); requestAnimationFrame(step); });

/** A figure exported to SVG (diagram-export) and shown as the file, beside nothing else: what an app's own Download button would write. */
function Exported({ k }: { k: Key }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let ready: () => void = () => {};
    if (isShot()) (window as unknown as { __BASALT_READY__?: Promise<void> }).__BASALT_READY__ = new Promise<void>((resolve) => { ready = resolve; });
    (async () => {
      await frames(8);
      const fig = host.current?.querySelector<HTMLElement>("figure");
      if (!fig) return;
      // The theme shown (the default), read when the shot has set it.
      const blob = await diagramToSvg(fig);
      setUrl(URL.createObjectURL(blob));
      await frames(4);
      ready();
    })();
  }, []);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div ref={host} style={{ position: "absolute", left: -10000, width: 1104 }}><Diagram k={k} state="" /></div>
      {url ? <img src={url} alt="" style={{ maxWidth: "100%", border: "1px dashed var(--basalt-border-divider)" }} /> : null}
    </div>
  );
}

/** Figures the fixture does not hold, for the parts that had no picture (the pixel review's P5). */
type Inline = { type: "architecture" | "data-flow" | "schema" } & Record<string, unknown>;
const DATA_FLOW_PARTS: Inline = (() => {
  const d = structuredClone(data.dataFlow) as unknown as Inline & { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> };
  // A mark on a step (1.6): the sealed segment, in the S3 lane, carries S3's own mark; the lane's label says S3.
  for (const n of d.nodes) if (n.id === "seg") n.mark = awsS3Bucket;
  // A dashed flow (1.5): the batch line's own dashes march. Two more lines make two cards entered by several end lines (1.3), seen stacked.
  d.edges = [...d.edges.map((e) => (e.kind === "dashed" ? { ...e, flow: true } : e)), { from: "append", to: "seal", label: "window check" }, { from: "hear", to: "seg", label: "cursor sync" }];
  // Still, so the shot shows every line (an animated figure's lines wait until it comes into view); its flow marches where motion is asked for.
  return { ...d, title: "How one message reaches everyone in the room (extended)", summary: `${String(d.summary)} Two more lines show several end lines entering one card when it is stacked.` };
})();
const schemaTable = (name: string, row: number, refs: string[] = []) => ({ name, col: 1, row, columns: [{ name: "id", key: "PK" }, ...refs.map((r) => ({ name: `${r}_id`, key: "FK", references: `${r}.id` }))] });
const CALL_2: Inline = { type: "schema", title: "One column: turn-backs beside each other take lanes (section 4, call 2)", summary: "b references c and c references a; their turn-backs run beside each other down the column's end side, so each takes a lane.", legend: { plain: "A foreign key" }, tables: [schemaTable("a", 1), schemaTable("b", 2, ["c"]), schemaTable("c", 3, ["a"])] };
const CALL_3: Inline = { type: "architecture", title: "A card grows to hold its ports (section 4, call 3)", summary: "The coordinator's end side holds a straight line and two others, so it is 48 tall at every width.", legend: { main: "Request", plain: "Call" },
  nodes: [{ id: "a", name: "Incident response coordinator", col: 1, row: 2 }, { id: "b", name: "Queue", col: 2, row: 2 }, { id: "c", name: "Store", col: 2, row: 3 }, { id: "d", name: "Audit", col: 2, row: 4 }, { id: "e", name: "Search", col: 3, row: 2 }, { id: "f", name: "Mail", col: 4, row: 2 }],
  edges: [{ from: "a", to: "b", kind: "main" }, { from: "a", to: "c", toSide: "left" }, { from: "a", to: "d", toSide: "left" }, { from: "b", to: "e" }, { from: "e", to: "f" }] };
function InlineFigure({ spec }: { spec: Inline }) {
  const { type, ...props } = spec;
  const figure = type === "architecture" ? <ArchitectureDiagram {...(props as unknown as React.ComponentProps<typeof ArchitectureDiagram>)} />
    : type === "data-flow" ? <DataFlowDiagram {...(props as unknown as React.ComponentProps<typeof DataFlowDiagram>)} />
    : <SchemaDiagram {...(props as unknown as React.ComponentProps<typeof SchemaDiagram>)} />;
  return <div style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", maxWidth: 1104 + 48, boxSizing: "border-box" }}>{figure}</div>;
}

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
        for (let i = 0; i < 12 && level() < 200; i++) { document.querySelector<HTMLButtonElement>('dialog.basalt-diagram-viewer button[aria-label="Zoom in"]')?.click(); await frames(2); }
      }
      await frames(4);
      ready();
    })();
  }, [state]);
  const { type, ...props } = structuredClone(data[k]) as unknown as { type: string } & Record<string, unknown>;
  if (type === "sequence") for (const p of props.participants as Array<{ id: string; mark?: unknown }>) if (PARTICIPANT_MARKS[p.id]) p.mark = PARTICIPANT_MARKS[p.id];
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
  title: "Diagrams, batch B: the viewer, frames and activations, nested groups, link cards, two-line labels, spatial keys, text art, automatic layout, right to left and export (DECISIONS 306 and 310)",
  summary: "Batch B, whole. The viewer (part 9, the owner's addition) opens any figure's drawn layout in a dialog to zoom and pan; the sequence gains activation bars and opt, loop and alt frames, and a text-art form; groups nest two deep; a card may be a link; an edge label may hold its author's break; the arrow keys move by the cards' columns and rows; a schema states how many and draws keys two columns away; automatic layout places a figure for you. Also: a trace on touch, an entrance on a first visit, flow on a dashed line, marks on steps and participants, right to left, export and print, and section 4's three calls. Fixed after both reviews and the spacing sweep (DECISIONS 326).",
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
      tryIt: ["Press Expand, then + and - (or Ctrl and the wheel, or pinch): the point under the pointer holds still. Drag to pan. 0 is Fit. Esc closes and focus returns to Expand.", "On a phone: two fingers zoom about their midpoint, one finger pans.", "These shots open the viewer by script, so the stage shows its keyboard focus ring (2px, drawn inside at −2). A mouse click or a tap opens it with no ring; the keyboard shows the ring, as decided."],
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
      name: "Schema: cardinality, far keys and a link table",
      intro: "Every foreign key states how many rows each end allows, so its dot and head give way to crow's-foot marks in the line's ink. approvals references incidents and users two columns away: the first runs along the margin above the first row, the second along the gap between rows 2 and 3, which grows to 40. The incidents table is a link.",
      decisions: [
        ...COMMON,
        "Cardinality (1.1): bars at 4 and 8, a foot from a point at 7.5, a ring centred at 10.5, every mark inside the 14px zone; the column gap is 60 where marks are drawn, and a marked gutter's lanes keep 18 from the tables (three at most).",
        "Far keys (1.1): a corridor is a row gap clear of the tables between, or the margin above or below, the one nearest the middle of the two rows. A gap that carries one is space-10; a margin adds space-8. A line with no lane left is not drawn, and its row still writes the target.",
        "Builder's readings where the decision is silent: a bar's 1px ink is the pixel that ends at its distance (so 3 to 4 for \"a bar at 4\"); two far lines to one key share a corridor lane; an interior corridor's two lanes take the order that crosses least.",
      ],
      tryIt: ["Hover approvals: its three lines, marks included, take the main ink and the rest dim. Narrow to 390: the stack draws no lines, and the key keeps the foreign key's arrow. Open View as list: decided_by reads \"zero or many approvals to zero or one users\"."],
      widths: W,
      scales: [2],
      height: 1200,
      touch: true,
      demo: ({ state }) => <Diagram k="schema" state={state} />,
    },
    {
      id: "auto",
      name: "Automatic layout: elkjs places, Basalt draws",
      intro: "The CIMIP architecture, flowchart and schema with layout=\"auto\" and no col or row: elkjs gives each card a column and a row, and Basalt sizes, routes and seats the figure as it does an authored one.",
      decisions: [
        "elkjs (EPL-2.0 OR GPL-3.0-or-later, used under EPL-2.0) loads on demand here; an app that places at build time and passes placement ships none of it, and the HTML skill always places at build time.",
        "After the decider's ruling (DECISIONS 322): a main line that skips a layer keeps a way (a second elk run, its cells left empty), network simplex places the main path straight, a decision's point that a line leaves takes no other line, and a turn-back needs a gutter. At 1104 the architecture draws laid down (4 by 6, all 11 lines and 10 labels, one crossing, cut), the flowchart laid down (3 by 7) and the schema laid down (3 by 5), as the ruling's proof drew them.",
        "When neither direction draws, a development build says why, once, with each direction's reason. The viewer takes the placements the page loaded and the direction with the larger Fit in its stage.",
      ],
      tryIt: ["Narrow the window: under 640 nothing is loaded and the figure is stacked."],
      widths: W,
      scales: [2],
      height: 3000,
      touch: true,
      demo: ({ state }) => <><Diagram k="autoArchitecture" state={state} /><Diagram k="autoFlowchart" state={state} /><Diagram k="autoSchema" state={state} /></>,
    },
    {
      id: "text",
      name: "A sequence as text art",
      intro: "variant=\"text\": the same data as box-drawing characters, where its widest line fits; on a phone the transcript.",
      decisions: [...COMMON, "No line-by-line reveal and no caret (item 1 for the owner): under motion=\"animated\" it builds by ink, as the drawn sequence does."],
      tryIt: ["Select the art and copy it: the clipboard holds the art exactly."],
      widths: W,
      scales: [2],
      height: 2000,
      touch: true,
      demo: ({ state }) => <Diagram k="textSequence" state={state} />,
    },
    {
      id: "rtl",
      name: "Right to left",
      intro: "The architecture and the sequence in a right-to-left page: the figure mirrors, its words do not.",
      decisions: ["Column 1 is at the right and the first participant at the right; named sides swap; the arrow keys stay physical. The stack is not mirrored (its rail is laid out on the left): drawn, with every line."],
      tryIt: ["Tab into the architecture and press the arrows: they move where they point."],
      widths: W,
      scales: [2],
      height: 2600,
      touch: true,
      demo: ({ state }) => <div dir="rtl"><Diagram k="architecture" state={state} /><Diagram k="sequence" state={state} /></div>,
    },
    {
      id: "export",
      name: "Export: the file an app's Download button writes",
      intro: "diagramToSvg on the extended architecture, shown as the SVG file it wrote: native SVG, words as text, the faces embedded, at rest.",
      decisions: ["@srasyndicate/basalt/diagram-export is a module the app loads on demand and wires to its own button; a figure grows no control. The HTML skill's \"export\": true adds the two buttons."],
      tryIt: ["Open the image in a new tab: it is an SVG whose words select as text."],
      widths: [1440],
      scales: [2],
      height: 1100,
      demo: () => <Exported k="architecture" />,
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
    {
      id: "data-flow",
      name: "Data flow: a step's mark, a dashed flow, and several end lines into one card",
      intro: "The CIMIP data flow with two more lines. The sealed segment, in the S3 lane, carries S3's mark. The batch line is dashed and flows: its own dashes march. Stacked, two cards are each entered by two end lines, which nest.",
      decisions: [
        ...COMMON,
        "A step's mark (1.6) is 16px in its top end corner; the lane's label counts as the step's words, so \"S3\" says what the mark stands for.",
        "A dashed flow (1.5): one period every 625ms, the dashes where the key draws them whenever they rest. The figure here is still, so its lines show in the shot: with motion=\"animated\" the batch line's dashes march.",
        "Several end lines into one card (1.3): the outermost lane's line turns lowest and enters nearest the end edge; each further in turns space-5 higher and enters space-3 further in; their labels sit space-2-5 clear of the innermost entry, each on its own turn's height.",
      ],
      tryIt: ["Narrow to 390: the two cards entered by two end lines show the nesting and the labels' seats."],
      widths: W,
      scales: [2],
      height: 1700,
      touch: true,
      demo: () => <InlineFigure spec={DATA_FLOW_PARTS} />,
    },
    {
      id: "calls",
      name: "Section 4's calls 2 and 3: a one-column schema's lanes, and a card grown to hold its ports",
      intro: "A one-column schema whose two turn-backs run beside each other takes two lanes in its end padding. A card whose side holds a straight line and two others grows to 48, so each port is on the flat part and 8 from the next, at every width.",
      decisions: [...COMMON, "Call 2: lanes space-3 apart, nested, the padding space-5 then space-5 plus space-3. Call 3: the card is never shorter than its ports need, so a side never stacks the figure."],
      tryIt: ["Narrow the window from 1440: the coordinator keeps its 48 while its name wraps and unwraps."],
      widths: W,
      scales: [2],
      height: 900,
      demo: () => <><InlineFigure spec={CALL_2} /><InlineFigure spec={CALL_3} /></>,
    },
  ],
};
