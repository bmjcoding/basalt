import * as React from "react";

import { isOverlayOpen } from "./overlay-open";
import { pageChanged } from "./page-change";

/** Where focus lands: a ref, or a function that finds the element when it is asked (it may not be there yet). */
export type FocusPlace = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

const resolve = (place: FocusPlace): HTMLElement | null => (typeof place === "function" ? place() ?? null : place.current);

export interface UseRouteFocusOptions {
  /** Changes when the page changes (a path, a route id). The first value is the page the app opened on: nothing moves for it. */
  key: string | number;
  /**
   * The new page's title: `document.title` becomes it. It is read when focus lands, not when the key changed, and a later change while the page is the same
   * (the page names itself once its data is there) is written too.
   */
  title: string;
  /**
   * The page's landing place, usually its title (`AppHeader`'s `titleRef`, or an element with `tabIndex={-1}`). It takes focus from here, with no ring: nothing
   * operates it. A ref, or a function that finds it. If it is not there yet (it arrives with the page's data), focus lands when it arrives, unless the reader
   * has pressed a key or the pointer first.
   */
  target: FocusPlace;
  /**
   * Set when the change came from a control's own value changing (a `Select` or a tab that changes the route). Focus then stays on the
   * control (WCAG 3.2.2, DECISIONS 158); the page still scrolls to the top and takes its title.
   */
  fromControl?: boolean;
  /**
   * Scroll to the top. Default true. `false` for a page that keeps its own place: one that opens at its end (a stream), or one reached by Back that restores
   * where the reader was.
   */
  scroll?: boolean;
}

// How long a landing place that has not arrived is waited for, and how long a popup that is closing may hold the landing.
const ARRIVAL_WAIT = 10_000;
const OVERLAY_WAIT = 2_000;

/**
 * After a client-side page change: scroll to the top, set `document.title`, and move focus to the page's title (X10, DECISIONS 162, B1).
 * It takes no router and names no element by id: the app gives it a key that changes with the page and a ref to the title. Say the change
 * aloud through one `StatusLine`; this moves focus and the title only, and closes the toasts whose only home was the page that left. It skips the
 * first render.
 *
 * Route focus wins over a closing popup's. A page chosen in a dialog, a menu or the command menu is landed on once the popup has gone, so the focus a
 * closing popup hands back (to the button that opened it) never takes the reader off the new page; for two frames after landing, a focus handed back to
 * the page is put back on the landing place. A popup still open after two seconds is the new page's own, and keeps focus.
 */
export function useRouteFocus({ key, title, target, fromControl = false, scroll = true }: UseRouteFocusOptions): void {
  // The key the page was last settled on. Only a different key is a page change: a target ref that is a new object on every render is not.
  const seen = React.useRef(key);
  const aim = React.useRef(target);
  aim.current = target;
  const control = React.useRef(fromControl);
  control.current = fromControl;
  const toTop = React.useRef(scroll);
  toTop.current = scroll;
  const heading = React.useRef(title);
  heading.current = title;
  // Whether a page change has been handled: from then on the hook keeps `document.title` in step with `title`.
  const owns = React.useRef(false);
  React.useEffect(() => {
    if (Object.is(seen.current, key)) return undefined;
    seen.current = key;
    owns.current = true;
    // What only echoed the page that left goes with it (a toast whose home is the page).
    pageChanged();
    if (toTop.current) window.scrollTo(0, 0);
    document.title = heading.current;
    if (control.current) return undefined;
    return land(() => resolve(aim.current), () => { document.title = heading.current; });
  }, [key]);
  React.useEffect(() => {
    if (owns.current) document.title = title;
  }, [title]);
}

/**
 * Lands focus on `find()`'s element once no popup is open and the element is there, then holds it for two frames against a closing popup's return.
 * Gives up when the reader presses a key or the pointer first. Returns the cancel.
 */
function land(find: () => HTMLElement | null, named: () => void): () => void {
  const doc = document;
  const started = performance.now();
  let frame = 0;
  let held: HTMLElement | null = null;
  let holding = 0;
  const cleanups: Array<() => void> = [];
  const stop = () => {
    cancelAnimationFrame(frame);
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
  // The reader's own move ends it: a key or a press before (or while) the page lands is theirs to keep.
  const reader = (event: Event) => {
    if (event instanceof KeyboardEvent && (event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta")) return;
    stop();
  };
  doc.addEventListener("keydown", reader, true);
  doc.addEventListener("pointerdown", reader, true);
  cleanups.push(() => {
    doc.removeEventListener("keydown", reader, true);
    doc.removeEventListener("pointerdown", reader, true);
  });
  const focusIt = (element: HTMLElement) => element.focus({ preventScroll: true });
  const tick = () => {
    const waited = performance.now() - started;
    if (held) {
      // Holding: a focus handed to the page (not into a popup) since landing is put back.
      if (held.isConnected && doc.activeElement !== held && !isOverlayOpen(doc)) focusIt(held);
      if (++holding >= 2) return stop();
    } else if (isOverlayOpen(doc)) {
      // A popup is closing (or open): the landing waits for it, up to a point; one still open after that is the new page's own.
      if (waited > OVERLAY_WAIT) return stop();
    } else {
      const element = find();
      if (element) {
        named();
        focusIt(element);
        held = element;
      } else if (waited > ARRIVAL_WAIT) return stop();
    }
    frame = requestAnimationFrame(tick);
  };
  // Land now when nothing is in the way, so the common case moves focus within the effect, as before.
  if (!isOverlayOpen(doc)) {
    const element = find();
    if (element) {
      focusIt(element);
      held = element;
    }
  }
  frame = requestAnimationFrame(tick);
  return stop;
}
