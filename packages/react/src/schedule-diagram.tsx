import * as React from "react";

import type { DiagramPlacement } from "./diagram-core";
import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { scheduleType } from "./diagram-schedule";
import type { ScheduleLabels, ScheduleTask, ScheduleUnit } from "./diagram-schedule";

export type { ScheduleLabels, ScheduleTask, ScheduleUnit } from "./diagram-schedule";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface ScheduleDiagramProps extends DiagramFigureProps {
  /** The one unit every duration is in ("min", or `{ one: "day", other: "days" }`). */
  unit: ScheduleUnit;
  /** The tasks, in the author's order (the stack's, the keys' and the list's). Each is placed by its `col` and `row`, as an architecture card is. */
  tasks: ScheduleTask[];
  /** `"auto"`: placed as an architecture is (`placeDiagram`, or elkjs on demand), and no task needs `col` or `row`. */
  layout?: "authored" | "auto";
  direction?: "right" | "down";
  placement?: DiagramPlacement | DiagramPlacement[];
  /** The built-in words, for an app that writes another language. */
  labels?: ScheduleLabels;
}

/**
 * A schedule (DECISIONS 359): a network on the architecture router. Its numbers are computed (finish to start, no lag, no calendar). A task's contour is its
 * kind: 2px for a critical task, 1px for one with float, each with its word. A line is main only where its finish sets the next task's start on a critical
 * path. Stacked it is its cards in the author's order, each writing what it comes after. The implementation has not been reviewed.
 */
export function ScheduleDiagram({ unit, tasks, layout, direction, placement, labels, motion, entrance, title, heading, legend, ...props }: ScheduleDiagramProps) {
  const spec = React.useMemo(() => ({ type: "schedule" as const, ext: scheduleType(), title, heading, legend, unit, tasks, layout, direction, placement, labels, motion, entrance }), [title, heading, legend, unit, tasks, layout, direction, placement, labels, motion, entrance]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="ScheduleDiagram" />;
}
