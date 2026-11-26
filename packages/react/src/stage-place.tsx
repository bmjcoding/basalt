import * as React from "react";

import { warnRun } from "./run-warn";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- "Stage 3 of 5" in a row (cimip-gaps-3 T2, 3b) ----
// Where a sequence is, by position only: a row of pills (aria-hidden) and words that always say it. Two to eight stages are pills size-track (4px) tall,
// full radius, space-0-5 apart: before the current 10px (space-2-5) of solid text-secondary, the current 14px (space-3-5) of solid text-primary (longer,
// so it is never ink alone), after it 10px with no fill and a 1px border-input edge. The mark's box is always `total` pills, their gaps and the long
// pill's extra space-1, so the words start at one x in every row of a column: not started (`current` 0) is every pill empty, finished (`done`) every
// pill passed, neither with a long pill, and the 4px is held at the mark's end. Past eight, one track space-12 long with a text-primary fill to
// current / total. No colour and no state: the row's badge or status word says how it went. An advance moves the long pill over duration-slow on
// ease-out; at once under reduced motion and the hold. Forced colours: solid pills CanvasText, the rest a CanvasText edge.

export interface StagePlaceProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The current stage, 1-based; 0 is "not started". */
  current: number;
  total: number;
  /** The current stage's name, after the marks ("Review"): one line, cut with an ellipsis. */
  label?: string;
  /** Every stage finished: every pill passed, none longer, and the count reads "5 of 5". */
  done?: boolean;
  /** The count's words in another language. Default "3 of 5". */
  formatCount?: (current: number, total: number) => string;
}

const defaultCount = (current: number, total: number) => `${current} of ${total}`;

/** A sequence's place in a row: the pills and the words. A plain inline `span`, valid in a cell, a link or a button. See the module note. */
export function StagePlace({ current, total, label, done = false, formatCount = defaultCount, className, style, ...props }: StagePlaceProps) {
  const valid = Number.isInteger(total) && total >= 2 && Number.isInteger(current) && current >= 0 && current <= total;
  if (process.env.NODE_ENV !== "production" && !valid) warnRun("StagePlace", `a place is 0 to \`total\` of 2 or more stages, not ${current} of ${total}; only the count is drawn.`);
  const at = done ? total : current;
  const count = formatCount(at, total);
  // The count's seat is as wide as "total of total", so a column of counts never moves.
  const countSeat = (
    <span className="basalt-stage-place-count">
      <span className="basalt-stage-place-count-widest" aria-hidden="true">{formatCount(total, total)}</span>
      <span className="basalt-stage-place-count-text">{count}</span>
    </span>
  );
  // Out of range: the count alone, without the label or the marks.
  if (!valid) return <span {...props} style={style} className={join("basalt-stage-place", className)}>{countSeat}</span>;
  const pills = total <= 8;
  const marks = pills ? (
    <span className="basalt-stage-place-pills" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const form = done || n < current ? "passed" : n === current ? "current" : "empty";
        return <span key={i} className="basalt-stage-place-pill" data-form={form} />;
      })}
    </span>
  ) : (
    <span className="basalt-stage-place-track" aria-hidden="true" style={{ "--_fill": at / total } as React.CSSProperties}><span className="basalt-stage-place-fill" /></span>
  );
  return (
    <span
      {...props}
      style={style}
      className={join("basalt-stage-place", className)}
      data-long={pills && !done && current > 0 ? "" : undefined}
    >
      {marks}
      {label ? <><span className="basalt-stage-place-label">{label}</span><span className="basalt-visually-hidden"> </span></> : null}
      {countSeat}
    </span>
  );
}
