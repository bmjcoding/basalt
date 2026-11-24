import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { ArchitectureNode, DiagramFlowEdge, DiagramGroup, DiagramPacket, DiagramPlacement, DiagramUnplaced } from "./diagram-core";

export type { ArchitectureNode, DiagramEdge, DiagramFlowEdge, DiagramGroup, DiagramLegend, DiagramLineKind, DiagramMark, DiagramMotion, DiagramNode, DiagramPacket, DiagramPlacement, DiagramSide, DiagramUnplaced } from "./diagram-core";
export type { DiagramFigureProps } from "./diagram-figure";

interface ArchitectureDiagramBase extends DiagramFigureProps {
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

/**
 * Authored (the default): every card carries its `col` and `row`. Automatic (`layout: "auto"`, DECISIONS 306, 1.8): no card needs them, and none are read.
 */
export type ArchitectureDiagramProps = Omit<ArchitectureDiagramBase, "nodes"> & (
  | { layout?: "authored"; direction?: never; placement?: never; nodes: ArchitectureNode[] }
  | {
      /**
       * `"auto"` (DECISIONS 306, 1.8): elkjs gives each card a column and a row, and Basalt sizes, routes and seats the figure as it does an authored one; a
       * card's `col` and `row` are left out (and not read). Place at build time with `placeDiagram` from `@srasyndicate/basalt/diagram-layout` and pass
       * `placement`: then elkjs never loads in the browser. Without it the layout module loads on demand at 640 or wider.
       */
      layout: "auto";
      /** Under `"auto"`: the one direction tried. Left out, the type's own (right for an architecture and a schema, down for a flowchart), then the other. */
      direction?: "right" | "down";
      /** Under `"auto"`: `placeDiagram`'s answer for one direction or both. */
      placement?: DiagramPlacement | DiagramPlacement[];
      nodes: Array<DiagramUnplaced<ArchitectureNode>>;
    }
);

/** An architecture diagram (DECISIONS 281): nodes with a kind, a name and a detail, groups, and three kinds of line. */
export function ArchitectureDiagram({ nodes, groups, edges, pulse, packet, motion, entrance, layout, direction, placement, title, heading, legend, ...props }: ArchitectureDiagramProps) {
  const spec = React.useMemo(() => ({ type: "architecture" as const, title, heading, legend, nodes: nodes as ArchitectureNode[], groups, edges, motion, entrance, layout, direction, placement, pulse, packet }), [title, heading, legend, nodes, groups, edges, motion, entrance, layout, direction, placement, pulse, packet]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="ArchitectureDiagram" />;
}
