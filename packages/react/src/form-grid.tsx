import * as React from "react";

import { ReserveErrorsContext } from "./field-reserve";
import { join } from "./utils";

/**
 * Where a cell of a `FormGrid` sits, in whole numbers from 1: the `column`, the `row` it begins on and how many rows it spans. A `Field` takes the
 * same three props. They mean nothing outside a `FormGrid`.
 */
export interface FormGridPlacement {
  /** The column, from 1. Default 1. */
  column?: number;
  /** The row the cell begins on, from 1. Give every cell one: a cell without a row is placed by the grid's own order and has no form gap above it. */
  row?: number;
  /** How many rows the cell spans. Default 1. A field that spans rows keeps its label on the first row's label track, its hint and error on the last row's, and its control fills what is between. */
  rows?: number;
}

/** The cell's place as the custom properties and attributes the stylesheet reads. Whole numbers only: anything else is left out. */
export function formGridPlacement({ column, row, rows }: FormGridPlacement): { style: React.CSSProperties | undefined; "data-column"?: ""; "data-row"?: ""; "data-span"?: "" } {
  const whole = (n: number | undefined) => (n !== undefined && Number.isInteger(n) && n >= 1 ? n : undefined);
  const [c, r, s] = [whole(column), whole(row), whole(rows)];
  if (c === undefined && r === undefined && s === undefined) return { style: undefined };
  return {
    style: { "--_fg-column": c, "--_fg-row": r, "--_fg-rows": s } as React.CSSProperties,
    "data-column": c === undefined ? undefined : "",
    "data-row": r === undefined ? undefined : "",
    "data-span": s !== undefined && s > 1 ? "" : undefined,
  };
}

export interface FormGridProps extends React.ComponentProps<"div"> {
  /**
   * The columns' widths as a ratio: `"1-1"` (the default, equal), `"3-2"`, `"2-1"`. Digits joined by hyphens, one per column; the columns are `minmax(0, Nfr)`
   * apart by `space-8`. Anything else is read as `"1-1"`.
   */
  columns?: string;
  /** The default `reserveError` of the fields inside (a `Form`'s, when this is not given). A field's own `reserveError` (`false` included) wins. */
  reserveErrors?: boolean;
}

/** `"3-2"` to `"minmax(0, 3fr) minmax(0, 2fr)"`; anything that is not digits and hyphens is `"1-1"`. */
function template(columns: string): string {
  const parts = /^[1-9]\d?(-[1-9]\d?)*$/.test(columns) ? columns.split("-") : ["1", "1"];
  return parts.map((n) => `minmax(0, ${n}fr)`).join(" ");
}

/**
 * A form's fields in columns that line up (DECISIONS 237, 239 to 242; the implementation hasn't been reviewed). Every `Field` (and `FormGridItem`) in it is
 * placed by `column`, `row` and `rows`, and takes four tracks a row: label, control, hint and error. The fields beside each other share those tracks (each field is a subgrid on
 * them), so a label, a control's top and bottom, a hint and an error on one row sit on the same lines across the columns. The spaces are Basalt's: the field gap (`space-1-5`)
 * inside a field, the form gap (`space-4`) between rows and `space-8` between columns, each held by its track. Every control is `size-control-md` tall.
 * It answers the room it is given, not the window: it is the columns where its own width is at least `size-breakpoint-container-lg` (640) and the window at least
 * `size-breakpoint-md` (720), and one column in the markup's order anywhere else (a phone, a 480 dialog, a narrow pane), as a `Form` is, so keep the markup in the order it is
 * to be read. The grid sits in a frame of its own (`basalt-form-grid-frame`), the container its width is read from; the props go to the grid.
 */
export function FormGrid({ columns = "1-1", reserveErrors, className, style, ...props }: FormGridProps) {
  const own = { "--_fg-columns": template(columns) } as React.CSSProperties;
  const grid = (
    <div className="basalt-form-grid-frame">
      <div {...props} style={{ ...own, ...style }} className={join("basalt-form-grid", className)} />
    </div>
  );
  return reserveErrors === undefined ? grid : <ReserveErrorsContext.Provider value={reserveErrors}>{grid}</ReserveErrorsContext.Provider>;
}

export interface FormGridItemProps extends React.ComponentProps<"div">, FormGridPlacement {}

/**
 * A cell of a `FormGrid` that is not a `Field`: a `Switch` with its `description`, say. Its first child takes the control track and a `.basalt-field-description` takes the
 * hint track, as in a `Field`.
 */
export function FormGridItem({ column, row, rows, className, style, ...props }: FormGridItemProps) {
  const place = formGridPlacement({ column, row, rows });
  return <div {...props} {...place} style={{ ...place.style, ...style }} className={join("basalt-form-grid-item", className)} />;
}
