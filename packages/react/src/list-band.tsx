import * as React from "react";

import { BackToTop } from "./back-to-top";
import { Select } from "./choice";
import { StatusLine } from "./filter-result";
import { Pagination } from "./navigation";
import { Reserve } from "./reserve";
import { contentTop, scrollOwnerTo, useMarkScrollOwner, useScrollElement } from "./scroll-owner";
import type { ScrollOwner } from "./scroll-owner";
import { join } from "./utils";

// The list's band (DECISIONS 222, the owner's pick of Opus's prototype): everything that pages a list, as one band above it. The count at the start, the pager in the centre,
// the page size at the end. Only the rows below change, so nothing in the band can be pushed. From 720 it sticks under the app's bar, opaque in the page colour, with a divider
// under it only while it is stuck. Nothing runs when this module loads.

const DEFAULT_SIZES = [10, 25, 50, 100] as const;

/**
 * What a press asked of the app, kept until the app has moved to it: `what` is `true` for the band's own pager and page size (return a stuck band to rest), or the foot's
 * `previous` or `next` (return to rest wherever the scroller is and move focus to the band's own arrow of that name). `page` and `size` are what was asked for, `from` what
 * was there at the press.
 */
interface Asked {
  what: true | "previous" | "next";
  page: number;
  size: number;
  /** What the app's own page and size were at the press (the page as the app holds it, before the band clamps it). */
  from: { page: number; size: number };
}

export interface ListBandProps extends Omit<React.ComponentProps<"div">, "children" | "onChange"> {
  /** How many rows match now (after any search and filters). 0 blanks the count and hides the pager, keeping their room. */
  total: number;
  /**
   * The most rows the list can ever hold (its unfiltered count). The count's seat is as wide as its widest form ("888–888 of 888") and the pager's slots as wide as the
   * widest page number at the smallest size, so a filter that narrows the list moves nothing. Default `total`: give it whenever `total` can change.
   */
  maxTotal?: number;
  /**
   * The widest count the seats are drawn for before the list is read (G28): a list read from a server knows `maxTotal` only after its first answer, so its seats would grow
   * then. Give the widest count it will show (9999) and the count's seat and the pager's slots are drawn at that width from the first frame; only a list that passes it grows
   * them, once. The seats are as wide as the largest of `total`, `maxTotal` and this.
   */
  seatTotal?: number;
  /**
   * The range says the total: "1–25 of 704" (default). Set `false` for a list whose filter result already says the total (a `FilterResult` above it), and the range is
   * "1–25", in the band and in its foot (G89). The page change the band speaks still says the total.
   */
  rangeTotal?: boolean;
  /**
   * Under 720 the foot (Previous, the count and Next under the list) is drawn only with more than one page, so a list whose rows arrive after its first frame grows the
   * foot then, and what is under it moves. Set this to hold the foot's room from the first frame (G88): at one page or none the foot holds its room and draws nothing (its
   * arrows and its count hidden, no landmark), since the band above already says the range. Use it for a list whose rows arrive after the first frame and that expects more
   * than one page. Opt-in: left out or `false`, the foot is as shipped (DECISIONS 227 removed this empty room under every short list).
   */
  keepFootRoom?: boolean;
  /**
   * What the band shows at one page or none. `"band"` (the default): the range and the page size; in the narrow form (under 640 of its width) the pager is not drawn and the
   * range starts the row. `"size"`: the page size alone at the band's end (the range and the pager keep their seats unseen in the wide form, and are not drawn in the narrow one).
   * A smaller size that makes a second page fills the seats; the select never moves or remounts.
   */
  onePage?: "band" | "size";
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
  /** What the rows are, plural and capitalised, in the app's words ("Orders", "Builds"). It names the page-size select ("Orders per page") and is said in the announcement. */
  noun: string;
  /** The words after the page-size select. Default "per page". The select's name is `noun` then these. */
  sizeLabel?: string;
  /** The pager's name. Default "Pagination". */
  pagerLabel?: string;
  /** Milliseconds the page or size must hold still before it is spoken. Default 400. */
  delay?: number;
  /**
   * The list itself (the rows' panel or the table): drawn after the band and its Back to top, and followed by the foot. All of them are one element, so the band and Back to top
   * stick within the list and not in the app's parent.
   */
  children?: React.ReactNode;
  /**
   * What scrolls the list. Default: the window. Give the element (or a ref to it) when the list sits in a pane that scrolls on its own: the band sticks to that pane's top, a page
   * change returns that pane to where the band rests, and Back to top watches and moves that pane. Inside a scroller the band rests at its top edge (`--basalt-sticky-offset` is 0
   * there; an app with a sticky header of its own inside the pane sets the property on `.basalt-list-band-wrap` in its own CSS).
   */
  scroller?: ScrollOwner;
  /**
   * The list's heading, as an id or a ref: Back to top focuses it (`preventScroll`) before it takes the scroller to the top. It is the start of what the reader came back for (the search, the
   * filters and the band follow it in the Tab order). Give it `tabIndex={-1}`; one without is given it. Without one, a press only moves the scroller.
   */
  heading?: string | React.RefObject<HTMLElement | null>;
  /** Draw Back to top (DECISIONS 227 and 228). Default `true`; it is a part of the list at every width. */
  backToTop?: boolean;
  /** The foot's name. Default "Pagination, end of list": say what is paged ("Order pages, end of list"). */
  footLabel?: string;
  /**
   * Anything that changes when the search or a filter does (the app's own value, or a string of them). Its change is what tells a filter from a page change: it clears the band's
   * spoken line (the filter's own result line speaks that) and forgets a press still waiting for its page, so a filter that resets the page to 1 leaves no stale "Page 2 of 9" behind.
   * Given, a change of `total` alone is the list living (rows arriving or leaving) and clears nothing. Left out, a change of `total` is read as a filter, as before: give it whenever
   * the total can change by itself.
   */
  filterKey?: string | number;
}

const eights = (n: number) => String(Math.max(0, Math.floor(n))).replace(/\d/g, "8");

/**
 * The sentinel's top is where the band rests: the band is `offset` under the scroller's top (in the window, the bar and the top safe area, which the sentinel's `scroll-margin-top` reads as a
 * length; in a pane, 0 unless the app sets one). Take the scroller there, at once: a stuck band stays where it is and the new page starts under it; a band that does not stick (under 720)
 * comes back under the bar.
 */
function returnToRest(sentinel: HTMLElement, owner: HTMLElement | null) {
  const offset = Number.parseFloat(getComputedStyle(sentinel).scrollMarginTop) || 0;
  scrollOwnerTo(owner, contentTop(sentinel, owner) - offset);
}

/**
 * The count, the pager and the page size of a list of rows or of a still table, above it, with Back to top and the list's foot. It holds the list as its children but not the rows or the page:
 * the app owns `page` and `pageSize`, filters and sorts, and returns to page 1 on a search, a filter or a sort. A page or size change is spoken once, after `delay` ms of stillness, by the band's own
 * polite status line; a change of `filterKey` (a search or a filter) clears it, since the filter's result line speaks that. When the page or size the reader asked for arrives while the band is stuck, the scroller returns
 * to where the band rests, so the new page's first row shows under the band and Next stays under the pointer. Under 640px of its own width the numbers go (Previous, the count and Next),
 * and under 340px the page size moves to the end of a second row. Under 720, with more than one page, the band's Previous, count and Next are drawn again, centred under the list (its foot):
 * a press there changes the page, returns the scroller to where the band rests and moves focus to the band's own arrow (with `keepFootRoom`, its room is held at one page too,
 * drawing nothing). At one page or none the narrow band draws no pager: the range starts the row and the page size ends it (`onePage="size"` shows the page size alone). Back to top sits in a dock of zero height after the band.
 * The scroller is the window unless `scroller` names a pane.
 */
export function ListBand({ total, maxTotal, seatTotal, rangeTotal = true, keepFootRoom = false, onePage = "band", page, pageSize, pageSizes = DEFAULT_SIZES, onPageChange, onPageSizeChange, noun, sizeLabel = "per page", pagerLabel, delay, heading, backToTop = true, footLabel = "Pagination, end of list", filterKey, scroller, children, className, ...props }: ListBandProps) {
  const count = Math.max(0, Math.floor(total) || 0);
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pages = Math.max(1, Math.ceil(count / size));
  // The app's own page, and the page shown: clamped to the pages there are. A size change the app commits before its page shows a clamped page for a render.
  const own = Math.max(1, Math.floor(page) || 1);
  const current = Math.min(pages, own);
  const from = count ? (current - 1) * size + 1 : 0;
  const to = Math.min(current * size, count);
  const reach = Math.max(count, Math.floor(maxTotal ?? 0) || 0, Math.floor(seatTotal ?? 0) || 0);
  const selectId = React.useId();
  const smallest = Math.max(1, Math.min(...pageSizes));
  const band = React.useRef<HTMLDivElement>(null);
  const sentinel = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  // What the last press asked for, until the app has moved to it (however long that takes: an app may set it after an await). It is forgotten when a filter changes, when another
  // press replaces it, or when the page or size moves somewhere that is neither what was there nor what was asked.
  const asked = React.useRef<Asked | null>(null);
  const ask = (what: Asked["what"], page: number, pageSize: number) => { asked.current = { what, page, size: pageSize, from: { page: own, size } }; };
  const owner = useScrollElement(scroller);
  useMarkScrollOwner(owner);

  // From 720 the band is `position: sticky`: a sentinel just above it says when it is stuck. A hidden sentinel, or a band that does not stick (under 720), is never stuck.
  React.useEffect(() => {
    const mark = band.current;
    const above = sentinel.current;
    if (!mark || !above || typeof IntersectionObserver === "undefined") return undefined;
    const root = owner;
    let observer: IntersectionObserver | undefined;
    const watch = () => {
      observer?.disconnect();
      const top = Number.parseFloat(getComputedStyle(mark).top);
      if (getComputedStyle(mark).position !== "sticky" || !Number.isFinite(top)) { setStuck(false); return; }
      observer = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0) + 1);
      }, { root, rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 });
      observer.observe(above);
    };
    watch();
    const wide = window.matchMedia("(width >= 720px)");
    wide.addEventListener("change", watch);
    return () => { observer?.disconnect(); wide.removeEventListener("change", watch); };
  }, [owner]);

  // What the band says: a page or size change, once. A filter or a search (a change of `filterKey`; without one, a change of `total`) clears what was said, since FilterResult speaks
  // that. With a `filterKey`, a total that changes by itself (rows arriving in a live list) is neither, so a page change that lands with it is still said.
  const last = React.useRef({ total: count, page: current, own, size, filterKey });
  const [said, setSaid] = React.useState({ text: "", id: 0 });
  React.useLayoutEffect(() => {
    const before = last.current;
    last.current = { total: count, page: current, own, size, filterKey };
    const filtered = filterKey === undefined ? before.total !== count : before.filterKey !== filterKey;
    const moved = before.page !== current || before.size !== size;
    const ownMoved = moved || before.own !== own;
    if (filtered) setSaid((now) => (now.text ? { text: "", id: now.id + 1 } : now));
    else if (moved) setSaid((now) => ({ text: `Page ${current} of ${pages}. ${noun} ${from} to ${to} of ${count}.`, id: now.id + 1 }));
    // A press is kept until the page and size it asked for arrive (a `stuck` flip in between must not forget it). A filter forgets it, and so does a move to a page or size that is
    // neither what was there nor what was asked (the app went elsewhere). A size change may land as two renders (the size, then the page): each half is on the way, read on the
    // app's own page, so the clamped page shown between them (page 8 of 10 at 50 a page shows page 3 of 3) does not cancel it.
    const press = asked.current;
    if (!press || (!filtered && !ownMoved)) return;
    const arrived = own === press.page && size === press.size;
    const onTheWay = (own === press.page || own === press.from.page) && (size === press.size || size === press.from.size);
    if (filtered || !onTheWay) { asked.current = null; return; }
    if (!arrived || !sentinel.current) return;
    asked.current = null;
    if (stuck || press.what !== true) returnToRest(sentinel.current, owner);
    if (press.what !== true) {
      const arrows = band.current?.querySelectorAll<HTMLElement>(".basalt-pagination > .basalt-button");
      arrows?.[press.what === "previous" ? 0 : arrows.length - 1]?.focus({ preventScroll: true });
    }
  }, [count, current, own, size, pages, noun, from, to, stuck, filterKey, owner]);

  const widest = eights(reach);
  const range = (
    <Reserve
      show={count ? "now" : "none"}
      alternatives={rangeTotal ? { now: `${from}–${to} of ${count}`, none: "", seat: `${widest}–${widest} of ${widest}` } : { now: `${from}–${to}`, none: "", seat: `${widest}–${widest}` }}
      className="basalt-list-band-range-seat"
    />
  );
  const maxPages = Math.ceil(reach / smallest);
  return (
    <div className="basalt-list-band-wrap" data-scroller={scroller ? "" : undefined}>
      <div ref={sentinel} className="basalt-list-band-sentinel" aria-hidden="true" />
      <div {...props} ref={band} data-stuck={stuck ? "" : undefined} data-whole={pages <= 1 ? "" : undefined} data-one-page={onePage === "size" ? "size" : undefined} data-pinned-edge="top" className={join("basalt-list-band", className)}>
        <div className="basalt-list-band-row">
          <p className="basalt-list-band-range">{range}</p>
          <Pagination
            aria-label={pagerLabel}
            page={current}
            pageCount={count ? pages : 0}
            maxPages={maxPages}
            summary={range}
            keepRoom
            onPageChange={(next) => { ask(true, next, size); onPageChange?.(next); }}
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
                // The reader's first row stays in view: the page that holds it at the new size.
                const first = (current - 1) * size;
                const target = Math.floor(first / next) + 1;
                ask(true, target, next);
                onPageSizeChange?.(next);
                onPageChange?.(target);
              }}
            />
            <label className="basalt-list-band-size-label" htmlFor={selectId}>{sizeLabel}</label>
          </div>
        </div>
        <StatusLine delay={delay} sendId={said.id}>{said.text}</StatusLine>
      </div>
      {backToTop ? <BackToTop list={sentinel} band={band} heading={heading} scroller={scroller} /> : null}
      {children}
      <div className="basalt-list-band-foot" hidden={!keepFootRoom && (count === 0 || pages <= 1)}>
        <Pagination
          compact
          keepRoom={keepFootRoom}
          aria-label={footLabel}
          page={current}
          pageCount={count ? pages : 0}
          maxPages={maxPages}
          summary={range}
          onPageChange={(next) => { ask(next < current ? "previous" : "next", next, size); onPageChange?.(next); }}
        />
      </div>
    </div>
  );
}
