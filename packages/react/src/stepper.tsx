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
  /**
   * Hold Next (Done on the last step), cimip-gaps-3 t4, item 8: the disabled look, `aria-disabled` with focus kept, and a press (click, Enter, Space) does
   * nothing. The app keeps how far a flow has reached and sets this.
   */
  nextDisabled?: boolean;
  /**
   * Why Next is held: a sentence under the row at its start edge, describing Next while it is held. It keeps its own wrapped height whenever it is given, unseen while
   * Next is live, so holding and freeing Next moves nothing. Not live: the step name's polite line stays the stepper's one voice.
   */
  nextReason?: string;
  /**
   * The last step's Done. A returned promise is the button's wait, so a second press during it does nothing. Without it, Done is held. Focus outside the stepper is
   * the app's: an action in a step that advances the flow hands focus to the new step.
   */
  onDone?: () => void | Promise<void>;
  /** For translation. Default "Back". */
  backLabel?: string;
  /** For translation. Default "Next". */
  nextLabel?: string;
  /** For translation. Default "Done". */
  doneLabel?: string;
}

const defaultPosition = (step: number, total: number) => `Step ${step} of ${total}`;

/**
 * Back and next for a short flow. The forward icon is a chevron until the last
 * step, where it becomes a check. The step name and the action label morph.
 *
 * The wrapper is a named `group` (WAI-ARIA 1.2, role group: a set of related controls named by `aria-label`). A flow has no
 * APG widget, so the position follows WAI's multi-page forms guidance: "Step 2 of 3" with the step's name. It rides in the
 * name's own polite live region, so a change is spoken once as "Step 2 of 3: Details" and is never a second region.
 *
 * Next can be held (`nextDisabled`, with `nextReason` under the row), and Done calls `onDone` (held without it). A held button, and Back on the first step, keep focus.
 */
export function Stepper({ steps, value, onValueChange, label = "Steps", positionLabel = defaultPosition, nextDisabled = false, nextReason, onDone, backLabel = "Back", nextLabel = "Next", doneLabel = "Done" }: StepperProps) {
  const index = Math.max(0, steps.findIndex((step) => step.id === value));
  const last = index >= steps.length - 1;
  const held = nextDisabled || (last && !onDone);
  const reasonId = React.useId();
  const row = (
    <div role="group" aria-label={label} className="basalt-stepper">
      <Button disabled={index === 0} focusableWhenDisabled onClick={() => { if (index > 0) onValueChange(steps[index - 1]!.id); }}>
        <MorphIcon glyph={ChevronLeftGlyph} />
        {backLabel}
      </Button>
      <TextMorph text={steps[index]?.label ?? ""} label={steps.length ? `${positionLabel(index + 1, steps.length)}: ${steps[index]!.label}` : undefined} />
      <Button
        variant="primary"
        disabled={held}
        focusableWhenDisabled
        aria-describedby={held && nextReason ? reasonId : undefined}
        onClick={() => {
          if (held) return undefined;
          if (last) return onDone?.();
          onValueChange(steps[index + 1]!.id);
          return undefined;
        }}
      >
        <TextMorph text={last ? doneLabel : nextLabel} />
        <MorphIcon glyph={last ? CheckGlyph : ChevronRightGlyph} />
      </Button>
    </div>
  );
  // The reason is the row's sibling, never a wrapper round it: giving or taking away `nextReason` must not re-parent the buttons, which would drop focus.
  return (
    <>
      {row}
      {nextReason !== undefined ? <p id={reasonId} className="basalt-stepper-reason" data-held={held ? "" : undefined} aria-hidden={held ? undefined : true}>{nextReason}</p> : null}
    </>
  );
}
