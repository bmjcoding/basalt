import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { ganttType } from "./diagram-gantt";
import type { GanttLabels, GanttPhase, GanttTask, GanttUnit } from "./diagram-gantt";

export type { GanttLabels, GanttPhase, GanttTask, GanttUnit } from "./diagram-gantt";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface GanttDiagramProps extends DiagramFigureProps {
  /** The tasks, in the order their rows are drawn (under their phases). A task's `start` and `end` are days (`YYYY-MM-DD`, the end inclusive) or numbers. */
  tasks: GanttTask[];
  /** Phases, in order: a task's `phase` names one, and its rows sit under the phase's head. */
  phases?: GanttPhase[];
  /** A numeric scale's unit ("min", or `{ one: "week", other: "weeks" }`). Days need none. */
  unit?: GanttUnit;
  /** Today: a day or a number. Drawn as the dashed today line only where it is inside the plan. */
  today?: string | number;
  /** The today line's label (default "Today"). */
  todayLabel?: string;
  /** The built-in words, for an app that writes another language. */
  labels?: GanttLabels;
}

/**
 * A gantt (DECISIONS 359): a row a task on one time scale. A bar's ends are its dates and it is never widened: where the shortest bar would be under 8px
 * the bars go and the words stay. No dependency line is drawn; a row writes what it comes after. The implementation has not been reviewed.
 */
export function GanttDiagram({ tasks, phases, unit, today, todayLabel, labels, motion: _motion, entrance: _entrance, title, heading, legend, ...props }: GanttDiagramProps) {
  const spec = React.useMemo(() => ({ type: "gantt" as const, ext: ganttType(), title, heading, legend, tasks, phases, unit, today, todayLabel, labels }), [title, heading, legend, tasks, phases, unit, today, todayLabel, labels]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="GanttDiagram" />;
}
