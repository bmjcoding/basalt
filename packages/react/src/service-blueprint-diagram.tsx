import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import { serviceBlueprintType } from "./diagram-matrix";
import type { BlueprintArrow, BlueprintCell, BlueprintLabels, BlueprintLayer, BlueprintRuleLabels, BlueprintStage } from "./diagram-matrix";

export type { BlueprintArrow, BlueprintCell, BlueprintLabels, BlueprintLayer, BlueprintRuleLabels, BlueprintStage } from "./diagram-matrix";
export type { DiagramAction, DiagramActionContext, DiagramFigureProps, DiagramLayoutInfo } from "./diagram-figure";

export interface ServiceBlueprintDiagramProps extends DiagramFigureProps {
  /** The stages, left to right. `time` is the author's ("0–2 s"). */
  stages: BlueprintStage[];
  /** A cell a stage and layer. Customer, frontstage and backstage are always drawn; evidence and support where a cell names them. A cell left out says "None". */
  cells: BlueprintCell[];
  /** Optional, main or plain: two cells of one stage, or neighbouring stages of one layer. */
  arrows?: BlueprintArrow[];
  layerLabels?: Partial<Record<BlueprintLayer, string>>;
  ruleLabels?: BlueprintRuleLabels;
  /** The built-in words, for an app that writes another language. */
  labels?: BlueprintLabels;
}

/**
 * A service blueprint (DECISIONS 359): stages across, layers down, and three rules in fixed gaps, each named on the rule. An empty cell is the word "None"
 * with no box. Stacked, all three rules are inside every stage. The implementation has not been reviewed.
 */
export function ServiceBlueprintDiagram({ stages, cells, arrows, layerLabels, ruleLabels, labels, motion: _motion, entrance: _entrance, title, heading, legend, ...props }: ServiceBlueprintDiagramProps) {
  const spec = React.useMemo(() => ({ type: "service-blueprint" as const, ext: serviceBlueprintType(), title, heading, legend, stages, cells, arrows, layerLabels, ruleLabels, labels }), [title, heading, legend, stages, cells, arrows, layerLabels, ruleLabels, labels]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="ServiceBlueprintDiagram" />;
}
