import * as React from "react";

import { join } from "./utils";

export interface FilterToolbarProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Names the group: "Filter and sort". */
  label: string;
  /** The kind `Select`, for a phone: it is shown under 720 and hidden from it (where the page has its own tabs for the kind). */
  kind?: React.ReactNode;
  /** The filter: a `MultiSelect` with `toolbar`. */
  filter?: React.ReactNode;
  /** The result: a `FilterResult`, which is spoken once and debounced. Never a bare `role="status"`. */
  result?: React.ReactNode;
  /**
   * The sort `Select`. Name it with an `aria-label` that contains `sortLabel` ("Sort"), so the visible word, which is hidden from assistive
   * technology, is in the control's name (WCAG 2.5.3).
   */
  sort?: React.ReactNode;
  /** The word beside the sort control, shown from 720. */
  sortLabel?: string;
}

/**
 * A row of the controls that narrow a list: the kind (phone only), the filter, a result count and the sort, with the word "Sort" beside it.
 * Two columns under 720, one wrapping row from 720 with the sort at the end. Selects are the built 44px. Layout only: it takes the controls.
 */
export function FilterToolbar({ label, kind, filter, result, sort, sortLabel = "Sort", className, ...props }: FilterToolbarProps) {
  return (
    <div {...props} role="group" aria-label={label} className={join("basalt-filter-toolbar", className)}>
      {kind ? <div className="basalt-filter-toolbar-kind">{kind}</div> : null}
      {filter ? <div className="basalt-filter-toolbar-filter">{filter}</div> : null}
      {result ? <div className="basalt-filter-toolbar-result">{result}</div> : null}
      {sort ? (
        <div className="basalt-filter-toolbar-sort">
          <span className="basalt-filter-toolbar-label" aria-hidden="true">{sortLabel}</span>
          {sort}
        </div>
      ) : null}
    </div>
  );
}
