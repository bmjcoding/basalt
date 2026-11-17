import * as React from "react";

import { LogFields } from "./log-fields";
import type { LogFieldsInput } from "./log-fields";
import { Reserve } from "./reserve";
import { join } from "./utils";

// ---- A log in fixed slots, and a four-line summary (DECISIONS 162, D14a, B29 and B6) ----
// No frame, no title row, no copy button. Each slot stands on `Reserve`: it holds the room of the widest line the caller says the log can
// hold, at the width it has, so a line that wraps further or a figure that gains a digit moves nothing.

/** A line the slots show. `id` keeps a line's identity as it moves up a slot. */
export interface LogSlotLine {
  id: string | number;
  fields: LogFieldsInput;
}

export interface LogSlotsProps extends Omit<React.ComponentProps<"div">, "children" | "role"> {
  /** Names the log. */
  label: string;
  /** Every line so far, oldest first. The last `slots` are shown. */
  lines: readonly LogSlotLine[];
  /** How many slots. Default 3. */
  slots?: number;
  /** What slot one says while the log is empty. Default "Nothing sent yet.". */
  empty?: string;
  /** The widest lines the log can hold (a third figure, a longer word): each slot reserves the room of the largest, wrapped at its own width. */
  widest?: readonly LogFieldsInput[];
  /** A `role="log"` while lines arrive (the default); false for a finished record, which is a named group. */
  live?: boolean;
}

/**
 * The last few lines of a log in a few fixed slots. In each line the fields that say what happened are primary and the rest secondary; the
 * newest fades in over `duration-base` (opacity only; reduced motion shows it at once), and no older line steps back. Empty slots keep their
 * room and are in the tree, so nothing is hidden from a reader.
 */
export function LogSlots({ label, lines, slots = 3, empty = "Nothing sent yet.", widest = [], live = true, className, ...props }: LogSlotsProps) {
  const shown = lines.slice(-slots);
  const newest = lines.at(-1)?.id;
  const seen = React.useRef(newest);
  React.useEffect(() => { seen.current = newest; });
  const fresh = newest !== seen.current ? newest : undefined;
  const room = Object.fromEntries(widest.map((fields, i) => [`room-${i}`, <LogFields key={i} fields={fields} />]));
  return (
    <div {...props} role={live ? "log" : "group"} aria-label={label} className={join("basalt-log-slots", className)}>
      {Array.from({ length: slots }, (_, i) => {
        const line = shown[i];
        const content = line ? <LogFields fields={line.fields} /> : i === 0 && shown.length === 0 ? empty : null;
        return (
          <div key={line ? `line-${line.id}` : `slot-${i}`} className="basalt-log-slot" data-new={line && line.id === fresh ? "" : undefined}>
            <Reserve className="basalt-log-slot-room" show="now" alternatives={{ now: content, ...room }} />
          </div>
        );
      })}
    </div>
  );
}

/** One line of a summary: a keyword and its value. */
export interface LogSummaryItem {
  keyword: string;
  value: React.ReactNode;
}

export interface LogSummaryProps extends Omit<React.ComponentProps<"pre">, "children"> {
  items: readonly LogSummaryItem[];
  /** Other forms the summary can take (a longer value, a figure with another digit): the room is the largest. */
  widest?: readonly (readonly LogSummaryItem[])[];
}

const summary = (items: readonly LogSummaryItem[]) => items.map((item) => (
  <span key={item.keyword} className="basalt-log-summary-line"><span className="basalt-log-summary-keyword">{item.keyword}</span>{" "}<b className="basalt-log-field">{item.value}</b></span>
));

/** A summary of a few lines in a `pre`: the keywords secondary and the values primary, each line 22px. Neither frame nor copy button. */
export function LogSummary({ items, widest = [], className, ...props }: LogSummaryProps) {
  const room = Object.fromEntries(widest.map((other, i) => [`room-${i}`, summary(other)]));
  return (
    <pre {...props} className={join("basalt-log-summary", className)}>
      <Reserve className="basalt-log-summary-room" show="now" alternatives={{ now: summary(items), ...room }} />
    </pre>
  );
}
