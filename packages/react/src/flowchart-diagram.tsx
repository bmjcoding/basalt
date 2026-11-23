import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { DiagramEdge, DiagramShapeLabels, FlowchartNode, DiagramPlacement } from "./diagram-core";

export type { DiagramEdge, DiagramLegend, DiagramLineKind, DiagramShapeLabels, DiagramSide, FlowchartNode } from "./diagram-core";

export interface FlowchartDiagramProps extends DiagramFigureProps {
  /**
   * `"auto"` (DECISIONS 306, 1.8): elkjs gives each card a column and a row, and Basalt sizes, routes and seats the figure as it does an authored one; a
   * card's `col` and `row` are left out (and not read). Place at build time with `placeDiagram` from `@srasyndicate/basalt/diagram-layout` and pass
   * `placement`: then elkjs never loads in the browser. Without it the layout module loads on demand at 640 or wider.
   */
  layout?: "authored" | "auto";
  /** Under `"auto"`: the one direction tried. Left out, the type's own (right for an architecture and a schema, down for a flowchart), then the other. */
  direction?: "right" | "down";
  /** Under `"auto"`: `placeDiagram`'s answer for one direction or both. */
  placement?: DiagramPlacement | DiagramPlacement[];
  /** The steps in the author's order; the first is the start. A shape carries the type: a step (the default), a decision or a terminal. */
  nodes: FlowchartNode[];
  /** The lines, by node id. A branch's label is its condition; `main` is the usual path. */
  edges: DiagramEdge[];
  /** The key's words for the shapes (default "Start or end", "Step", "Decision"). */
  shapeLabels?: DiagramShapeLabels;
}

/** A flowchart (DECISIONS 281): shape carries type, so every shape has a 3:1 contour; a decision is a diamond behind its words. */
export function FlowchartDiagram({ nodes, edges, shapeLabels, motion, entrance, layout, direction, placement, title, heading, legend, ...props }: FlowchartDiagramProps) {
  const spec = React.useMemo(() => ({ type: "flowchart" as const, title, heading, legend, nodes, edges, shapeLabels, motion, entrance, layout, direction, placement }), [title, heading, legend, nodes, edges, shapeLabels, motion, entrance, layout, direction, placement]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="FlowchartDiagram" />;
}
