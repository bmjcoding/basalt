import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import * as React from "react";

import { Button } from "./button";
import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { useMediaQuery } from "./use-media";
import { join } from "./utils";

/** What `FilterToolbar`'s `actionsRef` holds. */
export interface FilterToolbarActions {
  /** Focuses the first filter control, or the Filters trigger while the fold is closed (a phone with `narrow="fold"`). An empty state's Clear filters calls it. */
  focusFilters(): void;
}

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
  /** The word beside the sort control, shown from 720. */
  sortLabel?: string;
  /**
   * Under 720 (cimip-gaps-3 t4, item 2): `"rows"` (the default, as shipped) or `"fold"`: the filters and the sort open under one trigger, after the search and the
   * result, which never moves. From 720 the two are the same row, pixel for pixel, and the controls are the same instances at every width.
   */
  narrow?: "rows" | "fold";
  /** The trigger's word. Default "Filters". */
  foldLabel?: string;
  /** How many filters are narrowing the list: the trigger's count pill and its name. Omit for no pill. */
  activeCount?: number;
  /** The count in the trigger's name. Default (n) => `${n} active`. */
  activeCountLabel?: (count: number) => string;
  /** Whether the fold is open (controlled). */
  foldOpen?: boolean;
  /** Whether the fold starts open. Default false. */
  defaultFoldOpen?: boolean;
  /** Called when the fold asks to open or close: a press on the trigger, or the window crossing under 720 while focus is in a filter. */
  onFoldOpenChange?: (open: boolean) => void;
  /** `focusFilters()` focuses the first filter control, or the trigger while the fold is closed. */
  actionsRef?: React.RefObject<FilterToolbarActions | null>;
}

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])";
const defaultActive = (count: number) => `${count} active`;

/**
 * A row of the controls that narrow a list: the kind (phone only), the search, the filters, a result count and the sort, with the word "Sort" beside it.
 * Two columns under 720, one wrapping row from 720 with the sort at the end. Selects are the built 44px. Layout only: it takes the controls.
 *
 * With `narrow="fold"` a phone shows the search and a Filters trigger on one row, the result under them, and the filters and the sort in a fold under the result
 * (`aria-expanded` on the trigger; the fold takes no role). Opening leaves focus on the trigger; closing with focus inside sends it to the trigger; focus is never
 * left in a closed fold.
 */
export function FilterToolbar({
  label, kind, search, filter, result, sort, sortLabel = "Sort",
  narrow: narrowForm = "rows", foldLabel = "Filters", activeCount, activeCountLabel = defaultActive, foldOpen, defaultFoldOpen = false, onFoldOpenChange, actionsRef,
  className, ...props
}: FilterToolbarProps) {
  const folding = narrowForm === "fold";
  const phone = useMediaQuery(`(width < ${breakpoint.md}px)`);
  const narrow = folding && phone;
  const [innerOpen, setInnerOpen] = React.useState(defaultFoldOpen);
  // While the window crosses under 720 with focus in a filter, the fold is held open until the app has answered `onFoldOpenChange(true)`.
  const [holding, setHolding] = React.useState(false);
  const open = (foldOpen ?? innerOpen) || holding;
  const [mounted, setMounted] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement | null>(null);
  const fold = React.useRef<HTMLDivElement | null>(null);
  const wasNarrow = React.useRef(narrow);
  const foldId = React.useId();
  const setOpen = (next: boolean) => {
    if (foldOpen === undefined) setInnerOpen(next);
    onFoldOpenChange?.(next);
  };
  React.useLayoutEffect(() => setMounted(true), []);
  // The closed fold is shut (unseen, inert) only once focus has left it: what the stylesheet hides, the browser would blur to the page.
  React.useLayoutEffect(() => {
    const element = fold.current;
    if (!element || !folding) return;
    const crossed = narrow && !wasNarrow.current;
    wasNarrow.current = narrow;
    const shut = narrow && !open;
    if (shut && element.contains(element.ownerDocument.activeElement)) {
      if (crossed) {
        setHolding(true);
        setOpen(true);
        return;
      }
      trigger.current?.focus();
    }
    element.inert = shut;
    if (shut) element.setAttribute("data-shut", "");
    else element.removeAttribute("data-shut");
  });
  // The hold ends once the app has had its turn: open if it agreed, or shut (focus to the trigger first) if it kept the fold closed.
  React.useEffect(() => {
    if (!holding) return undefined;
    const timer = window.setTimeout(() => setHolding(false));
    return () => window.clearTimeout(timer);
  }, [holding]);
  // Settled open, the fold clips nothing, so a focus ring at +2 shows whole. While it moves, its body is clipped to the moving height.
  React.useEffect(() => {
    const element = fold.current;
    if (!element || !narrow) return undefined;
    if (!open) {
      element.removeAttribute("data-settled");
      return undefined;
    }
    const settle = () => element.setAttribute("data-settled", "");
    if (parseFloat(getComputedStyle(element).transitionDuration) === 0) {
      settle();
      return undefined;
    }
    const onEnd = (event: TransitionEvent) => { if (event.target === element) settle(); };
    element.addEventListener("transitionend", onEnd);
    return () => element.removeEventListener("transitionend", onEnd);
  }, [narrow, open]);
  React.useImperativeHandle(actionsRef, () => ({
    focusFilters() {
      if (narrow && !open) {
        trigger.current?.focus();
        return;
      }
      fold.current?.querySelector<HTMLElement>(`.basalt-filter-toolbar-filter :is(${FOCUSABLE})`)?.focus()
        ?? fold.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    },
  }), [narrow, open]);
  const filters = ([] as React.ReactNode[]).concat(filter ?? []).map((one, index) => <div key={index} className="basalt-filter-toolbar-filter">{one}</div>);
  const sortCell = sort ? (
    <div className="basalt-filter-toolbar-sort">
      <span className="basalt-filter-toolbar-label" aria-hidden="true">{sortLabel}</span>
      {sort}
    </div>
  ) : null;
  const resultCell = result ? <div className="basalt-filter-toolbar-result">{result}</div> : null;
  if (!folding) {
    return (
      <div {...props} role="group" aria-label={label} className={join("basalt-filter-toolbar", className)}>
        {kind ? <div className="basalt-filter-toolbar-kind">{kind}</div> : null}
        {search ? <div className="basalt-filter-toolbar-search">{search}</div> : null}
        {filters}
        {resultCell}
        {sortCell}
      </div>
    );
  }
  return (
    <div {...props} role="group" aria-label={label} data-narrow="fold" className={join("basalt-filter-toolbar", className)}>
      {kind ? <div className="basalt-filter-toolbar-kind">{kind}</div> : null}
      {search ? <div className="basalt-filter-toolbar-search">{search}</div> : null}
      <Button
        ref={trigger}
        className="basalt-filter-toolbar-fold-trigger"
        iconEnd={ChevronDownGlyph}
        count={activeCount}
        aria-expanded={open}
        aria-controls={foldId}
        aria-label={activeCount ? `${foldLabel}, ${activeCountLabel(activeCount)}` : undefined}
        onClick={() => setOpen(!open)}
      >
        {foldLabel}
      </Button>
      {resultCell}
      <div ref={fold} id={foldId} className="basalt-filter-toolbar-fold" data-open={open ? "" : undefined} data-shut={!mounted && !open ? "" : undefined}>
        <div className="basalt-filter-toolbar-fold-clip">
          <div className="basalt-filter-toolbar-fold-body">
            {filters}
            {sortCell}
          </div>
        </div>
      </div>
    </div>
  );
}
