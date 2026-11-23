// Round 56: Basalt's diagrams (DECISIONS 269, revised by 270). A heavy council round decided on one draft (Draft A, Neon's; the second drafter sat out on a
// usage limit), checked by Astra and decided by Fable, who revised six objections after the final positions. Built by Opus from the decision; the
// implementation has not been reviewed. The content is CIMIP's five diagrams (the owner's prototype, with the decision's corrections). States: at rest
// (`default`), a node traced by the pointer (`hover`), the list open (`list`), forced colours and more contrast. Each is shot at 1440 (drawn), at 672 (a
// 640px figure: the stack, 480 wide), at 390 and at 360.

import * as React from "react";

import { ArchitectureDiagram, DataFlowDiagram, FlowchartDiagram, SchemaDiagram, SequenceDiagram } from "../../packages/react/src/index";
import data from "../../packages/react/test/fixtures/cimip-diagrams.json";
import type { Round } from "./rounds";

type Key = keyof typeof data;
const FOCAL: Record<Key, string> = { architecture: "svc", flowchart: "who", dataFlow: "row", sequence: "svc", schema: "incidents" };

function Diagram({ k, state }: { k: Key; state: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = host.current;
    if (!el) return;
    // The walkthrough's "hover" state rests a real pointer on the element marked data-wt-hover: here, a node the trace is worth seeing on.
    el.querySelector(`[data-node="${FOCAL[k]}"]`)?.setAttribute("data-wt-hover", "");
    if (state === "list") el.querySelector<HTMLButtonElement>(".basalt-diagram-toggle")?.click();
  }, [k, state]);
  const { type, ...props } = data[k] as (typeof data)[Key] & { type: string };
  void type;
  const figure = (() => {
    switch (k) {
      case "architecture": return <ArchitectureDiagram {...(props as React.ComponentProps<typeof ArchitectureDiagram>)} />;
      case "flowchart": return <FlowchartDiagram {...(props as React.ComponentProps<typeof FlowchartDiagram>)} />;
      case "dataFlow": return <DataFlowDiagram {...(props as React.ComponentProps<typeof DataFlowDiagram>)} />;
      case "sequence": return <SequenceDiagram {...(props as React.ComponentProps<typeof SequenceDiagram>)} />;
      default: return <SchemaDiagram {...(props as React.ComponentProps<typeof SchemaDiagram>)} />;
    }
  })();
  return <div ref={host} style={{ padding: "var(--basalt-space-6) var(--basalt-gutter)", maxWidth: 1104 + 48, boxSizing: "border-box" }}>{figure}</div>;
}

const STATES = ["hover@1440", "list", "forced-colours@1440", "forced-colours@390", "more-contrast@1440"];
const TRY_COMMON = [
  "Resize the window across the fit width: the drawing turns on only where everything fits, and below it the figure is the stacked drawing, at most 480 wide, on the start edge.",
  "Tab into the drawing: one stop. → ↓ the next part, ← ↑ the one before, Home and End the ends; the part's lines lift to primary ink and the rest dim. Esc clears the trace and keeps focus; Tab leaves.",
  "Hover a part with a mouse: the same trace. On a phone nothing traces and nothing is a target.",
  "Open \"View as list\": the same facts as real lists. Try forced colours (Windows High Contrast, or DevTools' emulation) under both saved themes.",
];
const COMMON = [
  "Decided by the council (DECISIONS 269, revised by 270, a handoff): the owner sees this PR before it merges. The implementation has not been reviewed.",
  "Monochrome: no colour, no accent, no status. One focal node in inverted ink, which the key names in the author's words. Three lines named by their look: main 2px primary with a filled head, plain 1px secondary, dashed 1px 6 on 4 off with an open head.",
  "The drawn layout is used only when it fits (1.11): the figure 640 wide, every track as wide as its widest word, every label on a clean seat, no line through a node. Otherwise stacked (1.13). Sides, slots, jogs, lanes, groups and foreign keys are derived; the author places nodes on a grid and names a side only to change it.",
  "The words are in the HTML before script; before script the grid is used only from the figure's least width (1.19).",
];

export const ROUND_56: Round = {
  id: "56",
  title: "Diagrams: architecture, flowchart, data flow, sequence and schema (DECISIONS 269, 270)",
  reviewed: false,
  summary:
    "Five diagram components and the HTML skill's diagram module, built from the council's decision (DECISIONS 269, revised by 270 after the final positions): Draft A's grammar with a measured fit rule, derived routes, a 3:1 contour on flowchart shapes, cut crossings, tracing by ink only, and the words in the page before script. CIMIP's five diagrams are the content. Built by Opus; the implementation has not been reviewed, and the tests were written but not run (DECISIONS 271 paused test runs). Shot at 1440, at a 640px figure, at 390 and at 360, in both themes, with a trace, the list, forced colours and more contrast.",
  steps: [
    {
      id: "architecture",
      name: "Architecture",
      intro: "How a request reaches the agent: nodes with a kind, a name and a detail, a group, and all three kinds of line.",
      decisions: [
        ...COMMON,
        "A group is a transparent box with a 1px dashed structure edge, radius 12, its label at the top start; its box is its members'. Stacked, the box wraps its members.",
        "Stacked: a spine and indented branches; the rail at space-3 and the trunk at space-8 from the spine's start edge; ECS's \"starts\" runs in the end lane inside the cards because it leaves a branch and passes only a branch. One thing to look at on purpose (decision, section 2): the rail is a 2px vertical line down the start edge, the part nearest the vertical bar the owner ruled out as a mark.",
        "Corrected from the owner's prototype: the summary says what the lines say (\"puts sealed segments in S3, calls Bedrock for the scribe\"), and the key says \"The service\" where the prototype said \"Focal\".",
      ],
      tryIt: TRY_COMMON,
      states: [...STATES],
      widths: [1440, 672, 390, 360],
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram k="architecture" state={state} />,
    },
    {
      id: "flowchart",
      name: "Flowchart",
      intro: "Who may decide what the agent asks to run: shape carries type, so every shape has a 3:1 contour.",
      decisions: [
        ...COMMON,
        "A step is the box, a start or end a capsule, a decision a diamond behind its words (the name at 500, wrapping at 62% of the track). A decision is at least space-16 tall and never flatter than 5:1, drawn or stacked.",
        "Built differently from the decision's estimate: the decision measured the flowchart drawing from 880 on Draft A's geometry; here it draws from 946. At a 177px track \"Risk medium or lower?\" wraps to two lines, its diamond (sized exactly as 1.12 says) is 109 tall, and its slope reaches 0.6px into the clean seat of \"responder\", so by \"no seat, no drawn layout\" the stack holds until 946. The options are in the PR's notes; nothing was changed to move it.",
      ],
      tryIt: TRY_COMMON,
      states: [...STATES],
      widths: [1440, 672, 390, 360],
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram k="flowchart" state={state} />,
    },
    {
      id: "data-flow",
      name: "Data flow",
      intro: "How one message reaches everyone in the room: lanes as bands, steps numbered in order.",
      decisions: [
        ...COMMON,
        "Lanes are bands ruled apart with the divider, centred in the row gap, named at the start; a node's kind line is its step number. Stacked, a step says its lane: \"Step 3 · Aurora\".",
        "Stacked, the two bypasses from step 3 run in the end gutter outside the cards and nest (1.7 rule 3): the one that travels farther leaves higher and takes the outer lane, so they never cross.",
        "Drawn only from 1,080: below it the five step columns cannot each be 144 wide.",
      ],
      tryIt: TRY_COMMON,
      states: [...STATES],
      widths: [1440, 672, 390, 360],
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram k="dataFlow" state={state} />,
    },
    {
      id: "sequence",
      name: "Sequence",
      intro: "An @agent run, from the mention to the approved action: a head and a lifeline a participant, a 56px row a message.",
      decisions: [
        ...COMMON,
        "Lifelines are 1px structure ink dashed 4 on 4 off; a message's number and label sit above its line and its note below, on plates that mask the lifelines; a self-call is a small loop; a reply or a stream is dashed; a band is a ruled line of words, never a frame. No emphasis weight (Draft A made message 9 heavier; cut).",
        "Stacked: a strip of participant chips and a numbered list that names each message's sender, an inline arrow drawn like its kind, its receiver and the kind's word. The list has no stops and no key hint.",
        "Not cut: where a message passes over another participant's lifeline the lifeline is not broken (the decision's cuts are for lines crossing lines). Noted for the owner.",
      ],
      tryIt: TRY_COMMON,
      states: [...STATES],
      widths: [1440, 672, 390, 360],
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram k="sequence" state={state} />,
    },
    {
      id: "schema",
      name: "Database schema",
      intro: "The tables an incident and its runs live in: table cards, and a line from each foreign key to the key it references.",
      decisions: [
        ...COMMON,
        "A foreign key is one record (`references: \"incidents.id\"`): the row's \"→ incidents\", the line, the sentence and the list come from it. Lines to one key share a bus; tables in one column use a turn-back.",
        "The decision's placement (memberships beside users, agent_runs above sandboxes) draws with no crossing. Stacked, the cards sit in an auto-fit grid with no lines, because every foreign-key row writes its target; the key says so.",
        "The focal table is inverted, its keys, types and \"+ n more\" at opacity-amount, its header rule diagram-focal-rule.",
      ],
      tryIt: TRY_COMMON,
      states: [...STATES],
      widths: [1440, 672, 390, 360],
      scales: [2],
      height: 2400,
      touch: true,
      demo: ({ state }) => <Diagram k="schema" state={state} />,
    },
  ],
};
