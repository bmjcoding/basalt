import * as React from "react";

import { join } from "./utils";

export interface FilterToolbarProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** Names the group: "Filter and sort". */
  label: string;
  /** The kind `Select`, for a phone: it is shown under 720 and hidden from it (where the page has its own tabs for the kind). */
  kind?: React.ReactNode;
  /**
   * A search field, first: the app's own (a text input with the core search glyph, named for what it searches: "Search orders"). From 720 it is `size-search-trigger` (200px) wide
   * and sits before the filters; under 720 it has a row of its own. A change in it, like a change in a filter, returns a paged list to its first page.
   */
  search?: React.ReactNode;
  /** The filter: a `MultiSelect` with `toolbar`. Pass an array for more than one (Priority, then Status): each sits in its own column under 720. */
  filter?: React.ReactNode;
  /** The result: a `FilterResult`, which is spoken once and debounced. Never a bare `role="status"`. */
  result?: React.ReactNode;
  /**
   * The sort `Select`. Name it with an `aria-label` that contains `sortLabel` ("Sort"), so the visible word, which is hidden from assistive
   * technology, is in the control's name (WCAG 2.5.3).
   */
  sort?: React.ReactNode;
  /**
   * The word beside the sort control, shown from 720. `false` (or `""`) draws no word and no empty span, for a `Select` that shows the word itself
   * (`valuePrefix="Sort"`). Each option names the field and the direction in words ("Newest first", "Title A to Z"); the list's own order is one of them.
   */
  sortLabel?: string | false;
}

/**
 * A row of the controls that narrow a list: the kind (phone only), the search, the filters, a result count and the sort, with the word "Sort" beside it.
 * Two columns under 720, one wrapping row from 720 with the sort at the end. Selects are the built 44px. Layout only: it takes the controls.
 */
export function FilterToolbar({ label, kind, search, filter, result, sort, sortLabel = "Sort", className, ...props }: FilterToolbarProps) {
  return (
    <div {...props} role="group" aria-label={label} className={join("basalt-filter-toolbar", className)}>
      {kind ? <div className="basalt-filter-toolbar-kind">{kind}</div> : null}
      {search ? <div className="basalt-filter-toolbar-search">{search}</div> : null}
      {([] as React.ReactNode[]).concat(filter ?? []).map((one, index) => <div key={index} className="basalt-filter-toolbar-filter">{one}</div>)}
      {result ? <div className="basalt-filter-toolbar-result">{result}</div> : null}
      {sort ? (
        <div className="basalt-filter-toolbar-sort">
          {sortLabel ? <span className="basalt-filter-toolbar-label" aria-hidden="true">{sortLabel}</span> : null}
          {sort}
        </div>
      ) : null}
    </div>
  );
}
