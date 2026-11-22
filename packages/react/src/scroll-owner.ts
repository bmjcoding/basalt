import type * as React from "react";

// What scrolls a list: the window, or an element of the app's own (a pane that scrolls by itself). `ListBand` and `BackToTop` read and move
// the one they are given, so the band's stickiness, the return to rest after a page change and Back to top all follow the same scroller.
// Plain functions: nothing runs when this module loads.

/**
 * What scrolls the list: leave it out (or `null`) for the window; give an element, or a ref to one, for a pane that scrolls on its own. The
 * element is the scrolling box itself (`overflow: auto` or `scroll`), an ancestor of the list.
 */
export type ScrollOwner = HTMLElement | React.RefObject<HTMLElement | null> | null | undefined;

/** The element that scrolls, or `null` for the window. A ref is read when it is called, so call it in an effect or a handler, never in render. */
export function scrollElement(owner: ScrollOwner): HTMLElement | null {
  if (!owner) return null;
  if (typeof HTMLElement !== "undefined" && owner instanceof HTMLElement) return owner;
  return (owner as React.RefObject<HTMLElement | null>).current ?? null;
}

/** Where the scroller's visible box begins, in the window's coordinates: 0 for the window, an element's top inside its border. */
export function viewTop(el: HTMLElement | null): number {
  return el ? el.getBoundingClientRect().top + el.clientTop : 0;
}

/** How tall the scroller's visible box is. */
export function viewHeight(el: HTMLElement | null): number {
  return el ? el.clientHeight : window.innerHeight;
}

/** How far it is scrolled, held between its two ends (so an overscroll's bounce reads as an end). */
export function scrolled(el: HTMLElement | null): number {
  const max = el ? Math.max(0, el.scrollHeight - el.clientHeight) : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(el ? el.scrollTop : window.scrollY, 0), max);
}

/** Take the scroller to `top`, at once. */
export function scrollOwnerTo(el: HTMLElement | null, top: number): void {
  const at = Math.max(0, top);
  if (el) el.scrollTo({ top: at, behavior: "instant" });
  else window.scrollTo({ top: at, behavior: "instant" });
}

/** Where `node`'s top is inside the scroller's content: the scroll position that would put it at the scroller's top edge. */
export function contentTop(node: HTMLElement, el: HTMLElement | null): number {
  return node.getBoundingClientRect().top - viewTop(el) + (el ? el.scrollTop : window.scrollY);
}

/** The target of a scroll listener for this scroller. */
export function scrollTarget(el: HTMLElement | null): HTMLElement | Window {
  return el ?? window;
}
