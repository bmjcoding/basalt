import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { journeyType } from "./diagram-matrix";
import type { JourneyLabels, JourneyLevel, JourneyStage } from "./diagram-matrix";

export type { JourneyLabels, JourneyLevel, JourneyStage } from "./diagram-matrix";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface JourneyDiagramProps extends DiagramFigureProps {
  /** The one actor. */
  actor: string;
  /** The one scenario. */
  scenario: string;
  /** The scale's five steps, lowest first, in the author's own words ("Blocked" to "Confident"). */
  scale: [string, string, string, string, string];
  /** The stages in order, each at a level from 1 to 5 of the scale. */
  stages: JourneyStage[];
  /** `line` is required: what the scale measures. */
  legend: DiagramFigureProps["legend"] & { line: string };
  /** The built-in words, for an app that writes another language. */
  labels?: JourneyLabels;
}

/**
 * A journey (DECISIONS 359): one actor in one scenario, and a scale of five steps the author names. Each stage's head writes its level; the line is the
 * chart's (straight, 2px, one ink, an 8px disc a stage). Stacked it is a strip over the stage cards. Nothing traces. The implementation has not been reviewed.
 */
export function JourneyDiagram({ actor, scenario, scale, stages, labels, motion: _motion, entrance: _entrance, title, heading, legend, ...props }: JourneyDiagramProps) {
  const spec = React.useMemo(() => ({ type: "journey" as const, ext: journeyType(), title, heading, legend, actor, scenario, scale, stages, labels }), [title, heading, legend, actor, scenario, scale, stages, labels]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="JourneyDiagram" />;
}
