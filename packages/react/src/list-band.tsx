import * as React from "react";

import { BackToTop } from "./back-to-top";
import { Select } from "./choice";
import { StatusLine } from "./filter-result";
import { Pagination } from "./navigation";
import { Reserve } from "./reserve";
import { join } from "./utils";

// The list's band (DECISIONS 222, the owner's pick of Opus's prototype): everything that pages a list, as one band above it. The count at the start, the pager in the centre,
// the page size at the end. Only the rows below change, so nothing in the band can be pushed. From 720 it sticks under the app's bar, opaque in the page colour, with a divider
// under it only while it is stuck. Nothing runs when this module loads.

const DEFAULT_SIZES = [10, 25, 50, 100] as const;

type Rest = false | true | "previous" | "next";
/** How long a press waits for the app to move the page before it is forgotten (an app may set it after an await). */
const PRESS_WAIT = 10_000;

export interface ListBandProps extends Omit<React.ComponentProps<"div">, "children" | "onChange"> {
  /** How many rows match now (after any search and filters). 0 blanks the count and hides the pager, keeping their room. */
  total: number;
  /**
   * The most rows the list can ever hold (its unfiltered count). The count's seat is as wide as its widest form ("888–888 of 888") and the pager's slots as wide as the
   * widest page number at the smallest size, so a filter that narrows the list moves nothing. Default `total`: give it whenever `total` can change.
   */
  maxTotal?: number;
  /** The current page, from 1. */
  page: number;
  /** Rows on a page. */
  pageSize: number;
  /** The page sizes the reader can choose from. Default 10, 25, 50 and 100. */
  pageSizes?: readonly number[];
  onPageChange?: (page: number) => void;
  /**
   * Called with the size the reader chose. The band then calls `onPageChange` with the page that holds the reader's first row (page 3 of 25 becomes page 6 of 10), so
   * set the size and take the page it gives; do not reset to page 1.
   */
  onPageSizeChange?: (pageSize: number) => void;
  /** What the rows are, plural and capitalised, in the app's words: "Incidents". It names the page-size select ("Incidents per page") and is said in the announcement. */
  noun: string;
  /** The words after the page-size select. Default "per page". The select's name is `noun` then these. */
  sizeLabel?: string;
  /** The pager's name. Default "Pagination". */
  pagerLabel?: string;
  /** Milliseconds the page or size must hold still before it is spoken. Default 400. */
  delay?: number;
  /**
   * The list itself (the rows' panel or the table): drawn after the band and its Back to top, and followed by the foot. All of them are one element, so the band and Back to top
   * stick within the list and not in the app's parent. The window is the scroller: the band's stickiness, the return to rest and Back to top all read and move the window's scroll, so
   * a list inside a scrolling element of its own is not supported.
   */
  children?: React.ReactNode;
  /**
   * The list's heading, as an id or a ref: Back to top focuses it (`preventScroll`) before it takes the window to the top. It is the start of what the reader came back for (the search, the
   * filters and the band follow it in the Tab order). Give it `tabIndex={-1}`; one without is given it. Without one, a press only moves the window.
   */
  heading?: string | React.RefObject<HTMLElement | null>;
  /** Draw Back to top (DECISIONS 227 and 228). Default `true`; it is a part of the list at every width. */
  backToTop?: boolean;
  /** The foot's name. Default "Pagination, end of list": say what is paged ("Incident pages, end of list"). */
  footLabel?: string;
  /**
   * Anything that changes when the search or a filter does (the app's own value, or a string of them). A change clears the band's spoken line even when the total stays the same: a filter that
   * resets the page to 1 leaves no stale "Page 2 of 9" behind. A change of `total` clears it too.
   */
  filterKey?: string | number;
}

const eights = (n: number) => String(Math.max(0, Math.floor(n))).replace(/\d/g, "8");

/**
 * The sentinel's top is where the band rests: the band is `offset` under the window's top (the bar and the top safe area, which the sentinel's `scroll-margin-top` reads as a length). Take the window
 * there, at once: a stuck band stays where it is and the new page starts under it; a band that does not stick (under 720) comes back under the bar.
 */
function returnToRest(sentinel: HTMLElement) {
  const offset = Number.parseFloat(getComputedStyle(sentinel).scrollMarginTop) || 0;
  window.scrollTo({ top: Math.max(0, sentinel.getBoundingClientRect().top + window.scrollY - offset), behavior: "instant" });
}

/**
 * The count, the pager and the page size of a list of rows or of a still table, above it, with Back to top and the list's foot. It holds the list as its children but not the rows or the page:
 * the app owns `page` and `pageSize`, filters and sorts, and returns to page 1 on a search, a filter or a sort. A page or size change is spoken once, after `delay` ms of stillness, by the band's own
 * polite status line; a change of `total` (a search or a filter) clears it, since the filter's result line speaks that. When the page or size changes while the band is stuck, the window returns
 * to where the band rests, so the new page's first row shows under the band and Next stays under the pointer. Under 640px of its own width the numbers go (Previous, the count and Next),
 * and under 340px the page size moves to the end of a second row. Under 720, with more than one page, the band's Previous, count and Next are drawn again, centred under the list (its foot):
 * a press there changes the page, returns the window to where the band rests and moves focus to the band's own arrow. Back to top sits in a dock of zero height after the band.
 */
export function ListBand({ total, maxTotal, page, pageSize, pageSizes = DEFAULT_SIZES, onPageChange, onPageSizeChange, noun, sizeLabel = "per page", pagerLabel, delay, heading, backToTop = true, footLabel = "Pagination, end of list", filterKey, children, className, ...props }: ListBandProps) {
  const count = Math.max(0, Math.floor(total) || 0);
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pages = Math.max(1, Math.ceil(count / size));
  const current = Math.max(1, Math.min(pages, Math.floor(page) || 1));
  const from = count ? (current - 1) * size + 1 : 0;
  const to = Math.min(current * size, count);
  const reach = Math.max(count, Math.floor(maxTotal ?? 0) || 0);
  const selectId = React.useId();
  const smallest = Math.max(1, Math.min(...pageSizes));
  const band = React.useRef<HTMLDivElement>(null);
  const sentinel = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  // What the last press asks of the window once the app has moved the page: `true` returns a stuck band to rest; the foot's `previous` or `next` returns the window to the band's rest
  // wherever it is and moves focus to the band's own arrow of that name.
  const rest = React.useRef<Rest>(false);
  const restTimer = React.useRef<number | undefined>(undefined);
  const ask = (what: Rest) => { rest.current = what; window.clearTimeout(restTimer.current); restTimer.current = window.setTimeout(() => { rest.current = false; }, PRESS_WAIT); };
  React.useEffect(() => () => window.clearTimeout(restTimer.current), []);

  // From 720 the band is `position: sticky`: a sentinel just above it says when it is stuck. A hidden sentinel, or a band that does not stick (under 720), is never stuck.
  React.useEffect(() => {
    const mark = band.current;
    const above = sentinel.current;
    if (!mark || !above || typeof IntersectionObserver === "undefined") return undefined;
    let observer: IntersectionObserver | undefined;
    const watch = () => {
      observer?.disconnect();
      const top = Number.parseFloat(getComputedStyle(mark).top);
      if (getComputedStyle(mark).position !== "sticky" || !Number.isFinite(top)) { setStuck(false); return; }
      observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + 1);
      }, { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 });
      observer.observe(above);
    };
    watch();
    const wide = window.matchMedia("(width >= 720px)");
    wide.addEventListener("change", watch);
    return () => { observer?.disconnect(); wide.removeEventListener("change", watch); };
  }, []);

  // What the band says: a page or size change, once. A change of `total` is a filter or a search and clears what was said (FilterResult speaks that).
  const last = React.useRef({ total: count, page: current, size, filterKey });
  const [said, setSaid] = React.useState({ text: "", id: 0 });
  React.useLayoutEffect(() => {
    const before = last.current;
    last.current = { total: count, page: current, size, filterKey };
    if (before.total !== count || before.filterKey !== filterKey) setSaid((now) => (now.text ? { text: "", id: now.id + 1 } : now));
    else if (before.page !== current || before.size !== size) setSaid((now) => ({ text: `Page ${current} of ${pages}. ${noun} ${from} to ${to} of ${count}.`, id: now.id + 1 }));
    // A press is remembered until the page or size really changes (an app may set it after an await, and a `stuck` flip in between must not forget it).
    const asked = rest.current;
    if ((before.page !== current || before.size !== size) && asked && sentinel.current) {
      if (stuck || asked !== true) returnToRest(sentinel.current);
      if (asked !== true) {
        const arrows = band.current?.querySelectorAll<HTMLElement>(".basalt-pagination > .basalt-button");
        arrows?.[asked === "previous" ? 0 : arrows.length - 1]?.focus({ preventScroll: true });
      }
      rest.current = false;
    }
  }, [count, current, size, pages, noun, from, to, stuck, filterKey]);

  const widest = eights(reach);
  const range = (
    <Reserve
      show={count ? "now" : "none"}
      alternatives={{ now: `${from}–${to} of ${count}`, none: "", seat: `${widest}–${widest} of ${widest}` }}
      className="basalt-list-band-range-seat"
    />
  );
  const maxPages = Math.ceil(reach / smallest);
  return (
    <div className="basalt-list-band-wrap">
      <div ref={sentinel} className="basalt-list-band-sentinel" aria-hidden="true" />
      <div {...props} ref={band} data-stuck={stuck ? "" : undefined} className={join("basalt-list-band", className)}>
        <div className="basalt-list-band-row">
          <p className="basalt-list-band-range">{range}</p>
          <Pagination
            aria-label={pagerLabel}
            page={current}
            pageCount={count ? pages : 0}
            maxPages={maxPages}
            summary={range}
            keepRoom
            onPageChange={(next) => { ask(true); onPageChange?.(next); }}
          />
          <div className="basalt-list-band-size">
            <Select
              numeric
              id={selectId}
              controlSize="sm"
              aria-label={`${noun} ${sizeLabel}`}
              options={pageSizes.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(size)}
              onValueChange={(value) => {
                const next = Number(value);
                if (!value || !Number.isFinite(next) || next === size) return;
                ask(true);
                // The reader's first row stays in view: the page that holds it at the new size.
                const first = (current - 1) * size;
                onPageSizeChange?.(next);
                onPageChange?.(Math.floor(first / next) + 1);
              }}
            />
            <label className="basalt-list-band-size-label" htmlFor={selectId}>{sizeLabel}</label>
          </div>
        </div>
        <StatusLine delay={delay} sendId={said.id}>{said.text}</StatusLine>
      </div>
      {backToTop ? <BackToTop list={sentinel} band={band} heading={heading} /> : null}
      {children}
      <div className="basalt-list-band-foot" hidden={count === 0 || pages <= 1}>
        <Pagination
          compact
          aria-label={footLabel}
          page={current}
          pageCount={count ? pages : 0}
          maxPages={maxPages}
          summary={range}
          onPageChange={(next) => { ask(next < current ? "previous" : "next"); onPageChange?.(next); }}
        />
      </div>
    </div>
  );
}
