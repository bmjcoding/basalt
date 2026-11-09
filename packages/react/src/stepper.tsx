import * as React from "react";

import { Button } from "./button";
import { CheckGlyph } from "./glyphs/check";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { MorphIcon } from "./morph-icon";
import { TextMorph } from "./text-morph";

export interface Step {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: readonly Step[];
  value: string;
  onValueChange: (id: string) => void;
}

/**
 * Back and next for a short flow. The forward icon is a chevron until the last
 * step, where it becomes a check. The step name and the action label morph.
 */
export function Stepper({ steps, value, onValueChange }: StepperProps) {
  const index = Math.max(0, steps.findIndex((step) => step.id === value));
  const last = index >= steps.length - 1;
  return (
    <div className="basalt-stepper">
      <Button disabled={index === 0} onClick={() => onValueChange(steps[index - 1]!.id)}>
        <MorphIcon glyph={ChevronLeftGlyph} />
        Back
      </Button>
      <TextMorph text={steps[index]?.label ?? ""} />
      <Button variant="primary" onClick={() => { if (!last) onValueChange(steps[index + 1]!.id); }}>
        <TextMorph text={last ? "Done" : "Next"} />
        <MorphIcon glyph={last ? CheckGlyph : ChevronRightGlyph} />
      </Button>
    </div>
  );
}
