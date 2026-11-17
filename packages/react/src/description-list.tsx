import * as React from "react";

import { join } from "./utils";

/** The words for a fact with no value. Batch 2's table cell says the same words in the same ink; see `docs/foundations.md`. */
export const NOT_OBSERVED = "Not observed";

export interface DescriptionListProps extends React.ComponentProps<"dl"> {
  /**
   * `rows` (the default) is a label column and a value, divided. `stacked` is a title over its text, with no divider: a list of what each
   * thing is (DECISIONS 162, D15; R9, R10). `three` is a term, a thing and a detail: the thing's column is as wide as the widest thing in
   * the list, and the detail takes the rest.
   */
  form?: "rows" | "stacked" | "three";
}

/**
 * Facts about one thing: a label, then its value, row after row. A `dl` of `div` rows, on the page, with no rim and no level of its
 * own; it goes in a card only when the card is the object. The label column is a fixed width (`size-description-label`), and the
 * list stacks (label over value) when its own width, not the viewport's, is under 480px.
 */
export function DescriptionList({ form = "rows", className, ...props }: DescriptionListProps) {
  return <dl {...props} data-form={form === "rows" ? undefined : form} className={join("basalt-description-list", className)} />;
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
  /** The fact has no value: the row keeps its label and says "Not observed" in tertiary ink, with no mark. */
  missing?: boolean;
  /** A third column, in a list whose `form` is `three`: what the thing is. It starts after the value and takes the rest of the row. */
  detail?: React.ReactNode;
}

/** One row: a `div` holding one `dt` and one or more `dd`. */
export function DescriptionItem({ term, children, values, mono, missing, detail, className, ...props }: DescriptionItemProps) {
  const details = missing ? [NOT_OBSERVED] : values ?? [children];
  return (
    <div {...props} className={join("basalt-description-item", className)}>
      <dt className="basalt-description-term">{term}</dt>
      {details.map((value, i) => (
        <dd key={i} className="basalt-description-details" data-mono={mono && !missing ? "" : undefined} data-missing={missing ? "" : undefined}>{value}</dd>
      ))}
      {detail !== undefined ? <dd className="basalt-description-more">{detail}</dd> : null}
    </div>
  );
}
