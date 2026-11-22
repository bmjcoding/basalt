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

// The reader's last press or key, on `performance.now()`'s clock. A region drawn after it (a tab switched to, a sheet opened, even 500ms into the page)
// answers that press: its show-after counts from its own drawing, not from the page's start. Listened for from the first call into this module, lazily.
let inputAt = -1;
let listening = false;
function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  // A press that came before anything here was loaded: the browser knows there was one, not when. Taken as now, so what is drawn next counts from itself.
  if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) inputAt = performance.now();
  const note = (): void => { inputAt = performance.now(); };
  window.addEventListener("pointerdown", note, { capture: true, passive: true });
  window.addEventListener("keydown", note, { capture: true, passive: true });
}

/**
 * Note that a new page has begun without a reload (a router's move between pages, back and forward included). Call it where the router starts the
 * move, before the new page is drawn: `LoadingShape`'s show-after and the entrance's first-screen window count from it. `markPageChange` is the same
 * call. An app that reports nothing is measured from the navigation.
 */
export function markPageStart(at: number = performance.now()): void {
  listen();
  markPageChange(at);
}

/** The moment the page on screen began, on `performance.now()`'s clock: 0 for the navigation, or the last `markPageStart`. */
export function pageStartedAt(): number {
  return pageChangeAt();
}

/**
 * Where a part drawn at `mountedAt` counts its waits from: its page's start while the first paint is held, or when it is drawn within a second of the
 * start with no press or key since; otherwise itself. A press that starts a move comes before the move's `markPageStart`, so the new page still counts from it.
 */
export function startOf(mountedAt: number): number {
  listen();
  const start = pageStartedAt();
  if (held) return start;
  return mountedAt - start < PAGE_WINDOW && !(inputAt > start) ? start : mountedAt;
}

/** The event a held first paint sends on the window as it is released. */
export const FIRST_PAINT = "basalt-first-paint";

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
  listen();
  // Held by opacity, not visibility: a shape drawn while it is held is laid out and measured as it will be seen (a hidden root hid every part from the
  // walk, so the release showed a shape with no bones and its stand-in pictures and controls drawn).
  const { opacity, pointerEvents } = root.style;
  root.style.opacity = "0";
  root.style.pointerEvents = "none";
  held = true;
  const check = (): void => {
    const ready = root.childElementCount > 0 && !root.querySelector(WAITING);
    if (ready || performance.now() >= max) {
      root.style.opacity = opacity;
      root.style.pointerEvents = pointerEvents;
      held = false;
      // Shapes measure again as the page is shown: while it was held nothing in it could be hit, so what covers what inside a shape is read now.
      window.dispatchEvent(new Event(FIRST_PAINT));
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}
