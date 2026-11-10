import * as React from "react";

import { join } from "./utils";

/** The words for a fact with no value. Batch 2's table cell says the same words in the same ink; see `docs/foundations.md`. */
export const NOT_OBSERVED = "Not observed";

export interface DescriptionListProps extends React.ComponentProps<"dl"> {}

/**
 * Facts about one thing: a label, then its value, row after row. A `dl` of `div` rows, on the page, with no rim and no level of its
 * own; it goes in a card only when the card is the object. The label column is a fixed width (`size-description-label`), and the
 * list stacks (label over value) when its own width, not the viewport's, is under 480px.
 */
export function DescriptionList({ className, ...props }: DescriptionListProps) {
  return <dl {...props} className={join("basalt-description-list", className)} />;
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
}

/** One row: a `div` holding one `dt` and one or more `dd`. */
export function DescriptionItem({ term, children, values, mono, missing, className, ...props }: DescriptionItemProps) {
  const details = missing ? [NOT_OBSERVED] : values ?? [children];
  return (
    <div {...props} className={join("basalt-description-item", className)}>
      <dt className="basalt-description-term">{term}</dt>
      {details.map((value, i) => (
        <dd key={i} className="basalt-description-details" data-mono={mono && !missing ? "" : undefined} data-missing={missing ? "" : undefined}>{value}</dd>
      ))}
    </div>
  );
}
