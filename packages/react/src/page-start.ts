// When the page on screen began, and the reload's held first paint (skeleton-shape round 3, DECISIONS 249b, approved in DECISIONS 258). Plain code,
// with no React, so a router or an app's entry can import it anywhere. Nothing here runs at import. The clock is the entrance's (entrance.ts), so a page
// change is one call, either name.
//
// A region's show-after (`LoadingShape`'s 300ms) counts from the page's start, not from when the region was drawn: the navigation for the first
// page (`performance.now()`'s own zero), and each move after it (`markPageStart`). Then a reload whose code arrives late draws its bones with its
// first paint, instead of a known screen and its bones a moment after. A region drawn more than a second after its page began (a sheet the reader
// opens) counts from its own drawing. The entrance (`markPageChange`) reads the same clock: a page change is one call, either name.

import { markPageChange, pageChangeAt } from "./entrance";

// While a reload's first paint is held, everything drawn belongs to the page that began with the navigation, however late its code came.
let held = false;

/** A region drawn within this long of its page's start counts its show-after from the page's start; a later one counts from itself. */
const PAGE_WINDOW = 1000;

/**
 * Note that a new page has begun without a reload (a router's move between pages, back and forward included). Call it where the router starts the
 * move, before the new page is drawn: `LoadingShape`'s show-after and the entrance's first-screen window count from it. `markPageChange` is the same
 * call. An app that reports nothing is measured from the navigation.
 */
export function markPageStart(at: number = performance.now()): void {
  markPageChange(at);
}

/** The moment the page on screen began, on `performance.now()`'s clock: 0 for the navigation, or the last `markPageStart`. */
export function pageStartedAt(): number {
  return pageChangeAt();
}

/** Where a part drawn at `mountedAt` counts its waits from: its page's start while the first paint is held or within a second of the start, else itself. */
export function startOf(mountedAt: number): number {
  const start = pageStartedAt();
  return held || mountedAt - start < PAGE_WINDOW ? start : mountedAt;
}

/** What a held first paint waits for: no region still loading (`aria-busy`), and no page whose code is still on its way (`PageWait`). */
const WAITING = '.basalt-loading-shape[aria-busy="true"], .basalt-page-wait';

/**
 * Hold a reload's first paint until the page is ready or `max` (250ms) has passed since the navigation began, so a fast load paints once: the page,
 * never its structure and then its content a moment after. Ready is: something drawn in `root`, and no region loading or page code waiting. Past
 * `max` the page shows as it is, its bones drawn at once (their show-after has counted from the navigation). Call it once, on the element a
 * client-rendered app draws into, before `createRoot(root).render(…)`. A server-rendered page has painted already and needs none.
 */
export function holdFirstPaint(root: HTMLElement, max = 250): void {
  if (typeof requestAnimationFrame !== "function") return;
  root.style.visibility = "hidden";
  held = true;
  const check = (): void => {
    const ready = root.childElementCount > 0 && !root.querySelector(WAITING);
    if (ready || performance.now() >= max) {
      root.style.visibility = "";
      held = false;
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
