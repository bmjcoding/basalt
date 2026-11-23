import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { DiagramEdge, DiagramShapeLabels, FlowchartNode } from "./diagram-core";

export type { DiagramEdge, DiagramLegend, DiagramLineKind, DiagramShapeLabels, DiagramSide, FlowchartNode } from "./diagram-core";

export interface FlowchartDiagramProps extends DiagramFigureProps {
  /** The steps in the author's order; the first is the start. A shape carries the type: a step (the default), a decision or a terminal. */
  nodes: FlowchartNode[];
  /** The lines, by node id. A branch's label is its condition; `main` is the usual path. */
  edges: DiagramEdge[];
  /** The key's words for the shapes (default "Start or end", "Step", "Decision"). */
  shapeLabels?: DiagramShapeLabels;
}

/** A flowchart (DECISIONS 281): shape carries type, so every shape has a 3:1 contour; a decision is a diamond behind its words. */
export function FlowchartDiagram({ nodes, edges, shapeLabels, motion, entrance, title, heading, legend, ...props }: FlowchartDiagramProps) {
  const spec = React.useMemo(() => ({ type: "flowchart" as const, title, heading, legend, nodes, edges, shapeLabels, motion, entrance }), [title, heading, legend, nodes, edges, shapeLabels, motion, entrance]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="FlowchartDiagram" />;
}
