import * as React from "react";

import { IconButton } from "./button";
import { StatusLine } from "./filter-result";
import { ChevronLeftGlyph } from "./glyphs/chevron-left";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { join } from "./utils";

// The period stepper (DECISIONS 162, votes 7 and consent rows 1 to 3; N1's week stepper, ported): two icon buttons round a label that says which
// stretch of time is shown. Pressing one changes the view's period; it is an explicit act, so WCAG 3.2.2 (On Input) is not engaged. It is not
// `Stepper` (back and next through a short flow) and not `Pagination` (numbered pages).

export interface PeriodStepperProps extends Omit<React.ComponentProps<"div">, "children" | "role"> {
  /** The group's name, which `aria-label` sets in the app's language. Default "Period". `aria-labelledby` of your own works too. */
  "aria-label"?: string;
  /** The stretch of time shown, in the app's words ("Sep 28 to Oct 4"). It is drawn at 500, tabular, on one line, in a seat of at least 128px (`space-32`). */
  label: string;
  /** Said before `label` and not drawn: "Week 6, build, ". It ends with the separator it needs. */
  spokenPrefix?: string;
  /** The first button's name ("The week before"). */
  previousLabel: string;
  /** The second button's name ("The week after"). */
  nextLabel: string;
  onPrevious?: () => void;
  onNext?: () => void;
  /** The first period: the previous button stops but stays focusable (`aria-disabled`), so a keyboard user is not dropped. */
  atStart?: boolean;
  /** The last period: the next button stops, the same way. */
  atEnd?: boolean;
  /**
   * The view has no periods (the whole span is shown): both buttons are `visibility: hidden` and keep their room, and `label` is the whole span, so
   * nothing moves when the view changes.
   */
  whole?: boolean;
  /** Milliseconds the label must hold still before it is spoken. Default 400: pressing the button six times in a second speaks once. */
  delay?: number;
}

/**
 * Previous, the period, next. The label is shown at once; a change made after the stepper mounts is spoken once (a polite status line after it has
 * held still for `delay`, with the prefix), and the period a page arrives on is read in place, never announced. The buttons are core chevrons. In a
 * container narrower than 640px the stepper takes its own row under the bar's tabs, if the bar wraps (`flex-wrap: wrap`): full width, buttons at the
 * ends, 52px tall with a hairline above, each button at least 44 by 44. The container is the app's (`container-type: inline-size` on the bar's parent).
 */
export function PeriodStepper({ label, spokenPrefix = "", previousLabel, nextLabel, onPrevious, onNext, atStart = false, atEnd = false, whole = false, delay, className, ...props }: PeriodStepperProps) {
  const said = `${spokenPrefix}${label}`;
  // The period the page arrived on is read, never spoken: it is the page's own content, in a plain hidden line, and the live line starts empty. Only a
  // change made after mount moves the words into the live line (and out of the plain one, so the period is read once), which then speaks it.
  const [first] = React.useState(said);
  const [changed, setChanged] = React.useState(false);
  if (!changed && said !== first) setChanged(true);
  return (
    <div aria-label={props["aria-labelledby"] ? undefined : "Period"} {...props} role="group" data-whole={whole ? "" : undefined} className={join("basalt-period-stepper", className)}>
      <IconButton icon={ChevronLeftGlyph} label={previousLabel} disabled={atStart} focusableWhenDisabled onClick={() => { if (!atStart) onPrevious?.(); }} />
      <p className="basalt-period-label">
        <span aria-hidden="true">{label}</span>
        <span className="basalt-visually-hidden">{changed ? "" : said}</span>
        <StatusLine delay={delay}>{changed ? said : ""}</StatusLine>
      </p>
      <IconButton icon={ChevronRightGlyph} label={nextLabel} disabled={atEnd} focusableWhenDisabled onClick={() => { if (!atEnd) onNext?.(); }} />
    </div>
  );
}
