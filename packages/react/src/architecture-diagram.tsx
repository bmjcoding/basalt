import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { ArchitectureNode, DiagramFlowEdge, DiagramGroup, DiagramPacket } from "./diagram-core";

export type { ArchitectureNode, DiagramEdge, DiagramFlowEdge, DiagramGroup, DiagramLegend, DiagramLineKind, DiagramMark, DiagramMotion, DiagramNode, DiagramPacket, DiagramSide } from "./diagram-core";
export type { DiagramFigureProps } from "./diagram-figure";

export interface ArchitectureDiagramProps extends DiagramFigureProps {
  /** The parts, in the author's order: the stacked order, the focus order and the list's. `col` and `row` place each in the drawn layout. */
  nodes: ArchitectureNode[];
  /** One level of grouping: `group: "aws"` on the members and `{ id, label }` here. The box is derived from its members. */
  groups?: DiagramGroup[];
  /** The lines, by node id. Sides are derived; name one only to change it. `flow` marks a live stream (main or plain), which an animated figure marches. */
  edges: DiagramFlowEdge[];
  /** Animated only: a bead runs this route of node ids (each pair joined by a line in that direction), resting at each card. One of pulse and packet. */
  pulse?: string[];
  /** Animated only: a dot carries one message along `path`, sending itself (`repeat`) or once for each new `send` value. One of pulse and packet. */
  packet?: DiagramPacket;
}

/** An architecture diagram (DECISIONS 281): nodes with a kind, a name and a detail, groups, and three kinds of line. */
export function ArchitectureDiagram({ nodes, groups, edges, pulse, packet, motion, title, heading, legend, ...props }: ArchitectureDiagramProps) {
  const spec = React.useMemo(() => ({ type: "architecture" as const, title, heading, legend, nodes, groups, edges, motion, pulse, packet }), [title, heading, legend, nodes, groups, edges, motion, pulse, packet]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="ArchitectureDiagram" />;
}
