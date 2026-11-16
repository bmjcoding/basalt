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
  /** The group's accessible name. Default "Steps". */
  label?: string;
  /**
   * What a screen reader hears for where the user is, with the step's name after it: "Step 2 of 3". Both numbers count from 1.
   * For translation; nothing is drawn.
   */
  positionLabel?: (step: number, total: number) => string;
}

const defaultPosition = (step: number, total: number) => `Step ${step} of ${total}`;

/**
 * Back and next for a short flow. The forward icon is a chevron until the last
 * step, where it becomes a check. The step name and the action label morph.
 *
 * The wrapper is a named `group` (WAI-ARIA 1.2, role group: a set of related controls named by `aria-label`). A flow has no
 * APG widget, so the position follows WAI's multi-page forms guidance: "Step 2 of 3" with the step's name. It rides in the
 * name's own polite live region, so a change is spoken once as "Step 2 of 3: Details" and is never a second region.
 */
export function Stepper({ steps, value, onValueChange, label = "Steps", positionLabel = defaultPosition }: StepperProps) {
  const index = Math.max(0, steps.findIndex((step) => step.id === value));
  const last = index >= steps.length - 1;
  return (
    <div role="group" aria-label={label} className="basalt-stepper">
      <Button disabled={index === 0} onClick={() => onValueChange(steps[index - 1]!.id)}>
        <MorphIcon glyph={ChevronLeftGlyph} />
        Back
      </Button>
      <TextMorph text={steps[index]?.label ?? ""} label={steps.length ? `${positionLabel(index + 1, steps.length)}: ${steps[index]!.label}` : undefined} />
      <Button variant="primary" onClick={() => { if (!last) onValueChange(steps[index + 1]!.id); }}>
        <TextMorph text={last ? "Done" : "Next"} />
        <MorphIcon glyph={last ? CheckGlyph : ChevronRightGlyph} />
      </Button>
    </div>
  );
}
