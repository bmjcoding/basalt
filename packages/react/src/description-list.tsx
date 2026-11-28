import * as React from "react";

import { join } from "./utils";

/**
 * The default words for a fact with no value: a reading that could have been taken and was not. Batch 2's table cell says the same words in
 * the same ink; see `docs/foundations.md`. Any other absence says what is absent in the app's own words ("No ticket", "None yet").
 */
export const NOT_OBSERVED = "Not observed";

export interface DescriptionListProps extends React.ComponentProps<"dl"> {
  /**
   * `rows` (the default) is a label column and a value, divided. `stacked` is a title over its text, with no divider: a list of what each
   * thing is (DECISIONS 162, D15; R9, R10). `three` is a term, a thing and a detail: the thing's column is as wide as the widest thing in
   * the list, and the detail takes the rest.
   */
  form?: "rows" | "stacked" | "three";
  /**
   * How a `rows` list lays out under 480px of its own width. `stack` (the default) puts each label over its value. `line` keeps the label and the value
   * on one row, the label column narrowing to `size-field-label-inline` (80px, the inline field label's), so a list in a narrow column (a sidebar, a
   * card beside the page) is no taller than its values. A long label wraps inside the column; several values stack in the value column.
   */
  narrow?: "stack" | "line";
}

/**
 * Facts about one thing: a label, then its value, row after row. A `dl` of `div` rows, on the page, with no rim and no level of its
 * own; it goes in a card only when the card is the object. The label column is a fixed width (`size-description-label`), and the
 * list stacks (label over value) when its own width, not the viewport's, is under 480px.
 */
export function DescriptionList({ form = "rows", narrow = "stack", className, ...props }: DescriptionListProps) {
  return <dl {...props} data-form={form === "rows" ? undefined : form} data-narrow={form === "rows" && narrow === "line" ? "line" : undefined} className={join("basalt-description-list", className)} />;
}

export interface DescriptionColumnsProps extends React.ComponentProps<"div"> {}

/**
 * Whole `DescriptionList`s laid out in as many columns as fit, each at least `size-breakpoint-container` (480px) wide so none stacks:
 * two across at the page's 1152. Under 480px of its own width there is one column (the lists then stack as they do anywhere). The label
 * column inside each list stays 160px, so the lists keep one value edge.
 */
export function DescriptionColumns({ className, ...props }: DescriptionColumnsProps) {
  return <div {...props} className={join("basalt-description-columns", className)} />;
}

export interface DescriptionItemProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** The label. It wraps inside its column and never moves the values. */
  term: React.ReactNode;
  /** The value. For several, pass `values`. */
  children?: React.ReactNode;
  /** Several values for one label: each is its own `dd`, stacked `space-1` apart. */
  values?: React.ReactNode[];
  /** Identifiers (IDs, hosts, images, addresses) are mono, at 13px on the value's 20px line. Prose and numbers are not. */
  mono?: boolean;
  /**
   * The fact has no value: the row keeps its label and says so in tertiary ink, with no mark. With no children it says "Not observed", the words for a
   * reading that could have been taken and was not. Anything else that is absent says what is absent in the app's words, given as the children
   * ("No ticket", "No email", "None yet"), or as `values` when the absence takes more than one line: a missing value is never blank, a dash or zero.
   * "Not observed" is only the default; whatever the caller supplies is what the row says.
   */
  missing?: boolean;
  /** A third column, in a list whose `form` is `three`: what the thing is. It starts after the value and takes the rest of the row. */
  detail?: React.ReactNode;
}

/** One row: a `div` holding one `dt` and one or more `dd`. */
export function DescriptionItem({ term, children, values, mono, missing, detail, className, ...props }: DescriptionItemProps) {
  // Missing or not, the caller's own words win; "Not observed" is only what a missing row says when it is given none (no children, and no or empty `values`).
  const details = missing ? (values?.length ? values : [children ?? NOT_OBSERVED]) : values ?? [children];
  return (
    <div {...props} className={join("basalt-description-item", className)}>
      <dt className="basalt-description-term">{term}</dt>
      {details.map((value, i) => (
        <dd key={i} className="basalt-description-details" translate={mono && !missing ? "no" : undefined} data-mono={mono && !missing ? "" : undefined} data-missing={missing ? "" : undefined}>{value}</dd>
      ))}
      {detail !== undefined ? <dd className="basalt-description-more">{detail}</dd> : null}
    </div>
  );
}
