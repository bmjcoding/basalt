import * as React from "react";

import { DiagramFigure } from "./diagram-figure";
import type { DiagramFigureProps } from "./diagram-figure";
import type { SequenceParticipant, SequenceStep, DiagramFrameLabels } from "./diagram-core";

export type { DiagramFrameLabels, DiagramLegend, DiagramLineKind, SequenceMessage, SequenceParticipant, SequenceStep } from "./diagram-core";
export type { DiagramAction, DiagramActionContext } from "./diagram-figure";

export interface SequenceDiagramProps extends DiagramFigureProps {
  /** The participants, start to end. `short` names one in the stacked list. */
  participants: SequenceParticipant[];
  /** The messages in order, numbered through; `{ band }` names a phase. A reply or a stream is `dashed`. */
  steps: SequenceStep[];
  /** Animated only: "Play the run" in the foot sends one packet through every message in order; while it runs it reads "Stop the run". */
  run?: boolean;
  /** The words for each frame operator and an alt's later branches (DECISIONS 306, 1.2): "Only if", "Repeats", "One of these", "Otherwise". */
  frameLabels?: DiagramFrameLabels;
  /** `"text"` draws the same data as box-drawing characters in a code block, and a transcript where the art does not fit (1.2). Default `"drawn"`. */
  variant?: "drawn" | "text";
}

/** A sequence diagram (DECISIONS 281): a head and a lifeline a participant, a 56px row a message; stacked, a numbered list. */
export function SequenceDiagram({ participants, steps, run, frameLabels, variant, motion, entrance, title, heading, legend, ...props }: SequenceDiagramProps) {
  const spec = React.useMemo(() => ({ type: "sequence" as const, title, heading, legend, participants, steps, motion, entrance, run, frameLabels, variant }), [title, heading, legend, participants, steps, motion, entrance, run, frameLabels, variant]);
  return <DiagramFigure {...props} entrance={entrance} title={title} heading={heading} legend={legend} spec={spec} component="SequenceDiagram" />;
}
