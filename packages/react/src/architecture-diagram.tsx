import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { ArchitectureNode, DiagramEdge, DiagramGroup } from "./diagram-core";

export type { ArchitectureNode, DiagramEdge, DiagramGroup, DiagramLegend, DiagramLineKind, DiagramNode, DiagramSide } from "./diagram-core";
export type { DiagramFigureProps } from "./diagram-figure";

export interface ArchitectureDiagramProps extends DiagramFigureProps {
  /** The parts, in the author's order: the stacked order, the focus order and the list's. `col` and `row` place each in the drawn layout. */
  nodes: ArchitectureNode[];
  /** One level of grouping: `group: "aws"` on the members and `{ id, label }` here. The box is derived from its members. */
  groups?: DiagramGroup[];
  /** The lines, by node id. Sides are derived; name one only to change it. */
  edges: DiagramEdge[];
}

/** An architecture diagram (DECISIONS 269): nodes with a kind, a name and a detail, groups, and three kinds of line. */
export function ArchitectureDiagram({ nodes, groups, edges, title, heading, legend, ...props }: ArchitectureDiagramProps) {
  const spec = React.useMemo(() => ({ type: "architecture" as const, title, heading, legend, nodes, groups, edges }), [title, heading, legend, nodes, groups, edges]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="ArchitectureDiagram" />;
}
