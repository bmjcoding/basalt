import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { timelineType } from "./diagram-timeline";
import type { TimelineBreak, TimelineEvent, TimelineLabels } from "./diagram-timeline";

export type { TimelineBreak, TimelineEvent, TimelineLabels } from "./diagram-timeline";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface TimelineDiagramProps extends DiagramFigureProps {
  /** The events: points, each at an ISO 8601 instant with its offset. The engine sorts them by `at`; ties keep the author's order. */
  events: TimelineEvent[];
  /** The scale's two ends, used as written. Left out, the events' extent rounded out to ticks. */
  domain?: [string, string];
  /** An IANA zone every time is written in, 24-hour (default `"UTC"`). */
  timeZone?: string;
  /** Spans left out of the scale, the author's alone, each drawn as a gap with two slashes and its length. */
  breaks?: TimelineBreak[];
  /** The built-in words, for an app that writes another language. */
  labels?: TimelineLabels;
}

/**
 * A timeline (DECISIONS 359): points on one linear scale, never even gaps. A card flies from a straight stem at its time, two lanes a side; where an event
 * has no seat the figure is stacked, each card writing the gap since the one before. A span is a gantt's. The implementation has not been reviewed.
 */
export function TimelineDiagram({ events, domain, timeZone, breaks, labels, motion: _motion, entrance: _entrance, title, heading, legend, ...props }: TimelineDiagramProps) {
  const spec = React.useMemo(() => ({ type: "timeline" as const, ext: timelineType(), title, heading, legend, events, domain, timeZone, breaks, labels }), [title, heading, legend, events, domain, timeZone, breaks, labels]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="TimelineDiagram" />;
}
