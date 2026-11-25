import * as React from "react";

import type { DiagramGroup, DiagramPlacement, StateNode, StateTransition } from "./diagram-core";
import { DiagramFigure } from "./diagram-figure";
import { stateType } from "./diagram-state";
import type { DiagramFigureProps } from "./diagram-figure";

export type { DiagramGroup, DiagramLegend, DiagramLineKind, DiagramPlacement, DiagramSide, StateNode, StateTransition } from "./diagram-core";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface StateDiagramProps extends DiagramFigureProps {
  /** The states, in the author's order. `initial` takes the start mark (one outside the groups, one in each group, at most); `final` the end mark. */
  nodes: StateNode[];
  /** Composite states: two levels, as an architecture's groups. */
  groups?: DiagramGroup[];
  /** The transitions. The engine writes each label from `event`, `guard` and `action`; there is no `label`. */
  edges: StateTransition[];
  layout?: "authored" | "auto";
  direction?: "right" | "down";
  placement?: DiagramPlacement | DiagramPlacement[];
}

/**
 * A state diagram (DECISIONS 359): a state is the node and a composite state a group. A transition's label is its event, then `[guard] / action` on a
 * second line, written by the engine; transitions that leave one state on one event are numbered in the order they are tried. The start is a dot and a
 * line before the initial state; a final state carries a ring. No mover: a state figure does not know the current state. The implementation has not been reviewed.
 */
export function StateDiagram({ nodes, groups, edges, layout, direction, placement, motion, entrance, title, heading, legend, ...props }: StateDiagramProps) {
  const spec = React.useMemo(() => ({ type: "state" as const, ext: stateType(), title, heading, legend, nodes, groups, edges, layout, direction, placement, motion, entrance }), [title, heading, legend, nodes, groups, edges, layout, direction, placement, motion, entrance]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="StateDiagram" />;
}
