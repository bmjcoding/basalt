import * as React from "react";

import { join } from "./utils";

// A marks row (DECISIONS 153, vote 15, consent rows 9 to 11): one kind of reading across a run of days, in the form of the thing measured. Steps are columns
// standing on the row's floor, nights are pills, sessions are blocks; a rest day is a dot, because rest is not a gap; a day nobody recorded is the hatch. The marks
// are boxes sized by a number, so a new week glides to its heights over `duration-slow`. It is drawn at rest, never a page's one entrance. This is a written
// exception to "a bar is square at both ends" (foundations: charts). Nothing here runs when the module loads.

export type MarksKind = "columns" | "pills" | "blocks";

export interface MarksRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  kind: MarksKind;
  /** One reading per day (or week), oldest first. `null` is a day nobody recorded; `0` is a rest day. */
  values: Array<number | null>;
  /** The reading that stands the full height of the row. A reading past it stands full. */
  cap: number;
  /** Says what the row shows, as an image. Leave it out when the words beside the row say it: the row is then hidden from assistive technology. */
  label?: string;
  /** The row's height in px; `size-chart-row` (56px) by default. */
  height?: number;
}

const finite = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);

/** A row of marks, one cell a day. */
export function MarksRow({ kind, values, cap, label, height, className, style, ...props }: MarksRowProps) {
  const size = (value: number) => Math.max(0, Math.min(1, cap > 0 ? value / cap : 0));
  return (
    <div
      {...props}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={join("basalt-marks", className)}
      data-kind={kind}
      style={{ ...style, "--_n": values.length, ...(height ? { "--_row": `${height}px` } : {}) } as React.CSSProperties}
    >
      {values.map((value, index) => (
        <i key={index} className="basalt-marks-cell">
          {!finite(value) ? <i className="basalt-marks-seat" /> : value === 0 ? <i className="basalt-marks-rest" /> : <i className="basalt-marks-mark" style={{ "--_v": size(value) } as React.CSSProperties} />}
        </i>
      ))}
    </div>
  );
}
