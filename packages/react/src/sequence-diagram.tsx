import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { SequenceParticipant, SequenceStep } from "./diagram-core";

export type { DiagramLegend, DiagramLineKind, SequenceParticipant, SequenceStep } from "./diagram-core";

export interface SequenceDiagramProps extends DiagramFigureProps {
  /** The participants, start to end. `short` names one in the stacked list. */
  participants: SequenceParticipant[];
  /** The messages in order, numbered through; `{ band }` names a phase. A reply or a stream is `dashed`. */
  steps: SequenceStep[];
}

/** A sequence diagram (DECISIONS 269): a head and a lifeline a participant, a 56px row a message; stacked, a numbered list. */
export function SequenceDiagram({ participants, steps, title, heading, legend, ...props }: SequenceDiagramProps) {
  const spec = React.useMemo(() => ({ type: "sequence" as const, title, heading, legend, participants, steps }), [title, heading, legend, participants, steps]);
  return <DiagramFigure {...props} title={title} heading={heading} legend={legend} spec={spec} component="SequenceDiagram" />;
}
