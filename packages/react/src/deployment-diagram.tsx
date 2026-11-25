import * as React from "react";

import type { DeploymentNode, DiagramFlowEdge, DiagramGroup, DiagramPlacement } from "./diagram-core";
import { DiagramFigure } from "./diagram-figure";
import { deploymentType } from "./diagram-deployment";
import type { DiagramFigureProps } from "./diagram-figure";

export type { DeploymentArtifact, DeploymentNode, DiagramFlowEdge, DiagramGroup, DiagramLegend, DiagramLineKind, DiagramMark, DiagramPlacement, DiagramSide } from "./diagram-core";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface DeploymentDiagramProps extends DiagramFigureProps {
  /** The one environment the figure shows ("Production · us-east-1"): required, the first words of its source line. */
  environment: string;
  /** The hosts, in the author's order. `replicas` (2 or more) draws `× 3`; `artifacts` are its rows, which a line may name. */
  nodes: DeploymentNode[];
  /** The boundaries: accounts, networks, subnets. */
  groups?: DiagramGroup[];
  /** The lines, by host or artifact id. Every line has a label. */
  edges: DiagramFlowEdge[];
  layout?: "authored" | "auto";
  direction?: "right" | "down";
  placement?: DiagramPlacement | DiagramPlacement[];
}

/**
 * A deployment diagram (DECISIONS 359): one environment a figure. An artifact is a row of its host card, as a schema's column is of its table; `× 3` at
 * the end of a host's kind line says how many copies run. The implementation has not been reviewed.
 */
export function DeploymentDiagram({ environment, nodes, groups, edges, layout, direction, placement, motion, entrance, title, heading, legend, ...props }: DeploymentDiagramProps) {
  const spec = React.useMemo(() => ({ type: "deployment" as const, ext: deploymentType(), environment, title, heading, legend, nodes, groups, edges, layout, direction, placement, motion, entrance }), [environment, title, heading, legend, nodes, groups, edges, layout, direction, placement, motion, entrance]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="DeploymentDiagram" />;
}
