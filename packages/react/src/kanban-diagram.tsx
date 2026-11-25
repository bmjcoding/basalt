import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { kanbanType } from "./diagram-matrix";
import type { KanbanCard, KanbanColumn, KanbanLabels } from "./diagram-matrix";

export type { KanbanCard, KanbanColumn, KanbanLabels } from "./diagram-matrix";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface KanbanDiagramProps extends DiagramFigureProps {
  /** The columns in workflow order. `limit` is the column's most; `more` counts cards not drawn (they are in its count). */
  columns: KanbanColumn[];
  /** The cards, each in its column, in the order drawn. A blocked card carries its reason. */
  cards: KanbanCard[];
  /** The built-in words, for an app that writes another language. */
  labels?: KanbanLabels;
}

/**
 * A kanban (DECISIONS 359): a count of cards in states at one moment. It is read-only: nothing drags and there is no move key. A head is its title and its
 * count in words ("3, max 2 · Over limit"), every card counted; over its limit a column's count is 600 and its rule 2px. The implementation has not been reviewed.
 */
export function KanbanDiagram({ columns, cards, labels, motion: _motion, entrance: _entrance, title, heading, legend, ...props }: KanbanDiagramProps) {
  const spec = React.useMemo(() => ({ type: "kanban" as const, ext: kanbanType(), title, heading, legend, columns, cards, labels }), [title, heading, legend, columns, cards, labels]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="KanbanDiagram" />;
}
