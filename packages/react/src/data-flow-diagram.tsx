import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { DataFlowLane, DataFlowNode, DiagramFlowEdge, DiagramPacket } from "./diagram-core";

export type { DataFlowLane, DataFlowNode, DiagramEdge, DiagramLegend, DiagramLineKind, DiagramSide } from "./diagram-core";

export interface DataFlowDiagramProps extends DiagramFigureProps {
  /** The lanes, top to bottom: a node's row is its lane's place here. */
  lanes: DataFlowLane[];
  /** The steps in order: a node's place here is its step number. `col` counts the step columns. */
  nodes: DataFlowNode[];
  /** `flow` marks a live stream (main or plain), which an animated figure marches. */
  edges: DiagramFlowEdge[];
  /** How a step's number is written (default "Step 3"). */
  stepLabel?: (n: number) => string;
  /** Animated only: a bead runs this route of node ids, resting at each card. One of pulse and packet. */
  pulse?: string[];
  /** Animated only: a dot carries one message along `path` (`repeat`, or once for each new `send` value). One of pulse and packet. */
  packet?: DiagramPacket;
}

/** A data flow (DECISIONS 281): lanes as bands, steps numbered in order; stacked, a step says its lane. */
export function DataFlowDiagram({ lanes, nodes, edges, stepLabel, pulse, packet, motion, entrance, title, heading, legend, ...props }: DataFlowDiagramProps) {
  const spec = React.useMemo(() => ({ type: "data-flow" as const, title, heading, legend, lanes, nodes, edges, stepLabel, motion, entrance, pulse, packet }), [title, heading, legend, lanes, nodes, edges, stepLabel, motion, entrance, pulse, packet]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="DataFlowDiagram" />;
}
