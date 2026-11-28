import * as React from "react";

import { isOverlayOpen } from "./overlay-open";
import { pageChanged } from "./page-change";

/** Where focus lands: a ref, or a function that finds the element when it is asked (it may not be there yet). */
export type FocusPlace = React.RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);

const resolve = (place: FocusPlace): HTMLElement | null => (typeof place === "function" ? place() ?? null : place.current);

/** How the app reached this page: a new entry, a replaced entry, or Back and Forward. Basalt's own type; map your router's action to it. */
export type RouteNavigation = "push" | "replace" | "pop";

export interface UseRouteFocusOptions {
  /**
   * Changes when the page changes (a path, a route id). The first value is the page the app opened on: nothing moves for it. The key is the page, not the
   * address: a change of query on one page (a filter, a page number, a sort, a mirrored tab) and a record opened over the page in a sheet or a dialog keep
   * the key, so nothing moves for them and focus stays on the control the reader used (WCAG 3.2.2).
   */
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
   * How the page was reached. Default "push". "replace" with a new key is a new page too, and behaves as a push. "pop" is Back or Forward: the hook never
   * scrolls (the browser, or `useScrollRestore`, puts the reader back), and takes focus only when nothing has it once any popup has gone, never from an
   * element that has it.
   */
  navigation?: RouteNavigation;
  /**
   * Scroll on a page change: to the element the address's fragment names when there is one, else to the top, at once in every mode. Default true. `false`:
   * the hook never scrolls (a page that keeps its own place, a stream that opens at its end). A "pop" never scrolls, whatever this says.
   */
  scroll?: boolean;
}

/** The element the address's fragment names, if it is there now. A malformed escape reads as no target. */
function hashTarget(): HTMLElement | null {
  const hash = window.location.hash;
  if (hash.length < 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return null;
  }
  return document.getElementById(id);
}

/**
 * After a client-side page change: scroll to the top (or to the fragment's target), set `document.title`, and move focus to the page's title (X10,
 * DECISIONS 162, B1). Back and Forward (`navigation="pop"`) never scroll and keep the focus the app gave back; with none, focus lands on the title (m7).
 * Basalt never sets `history.scrollRestoration`.
 * It takes no router and names no element by id: the app gives it a key that changes with the page and a ref to the title. Say the change
 * aloud through one `StatusLine`; this moves focus and the title only, and closes the toasts whose only home was the page that left. It skips the
 * first render.
 *
 * Route focus wins over a closing popup's. A page chosen in a dialog, a menu or the command menu is landed on once the popup has gone, so the focus a
 * closing popup hands back (to the button that opened it) never takes the reader off the new page: when a popup was open as the page changed, a focus
 * handed back to the page in the two frames after landing is put back on the landing place. Otherwise nothing is held, so the new page's own `.focus()`
 * stands. Waiting (for a popup to go, for a landing place that arrives with the page's data) ends when focus lands, when the reader presses a key or the
 * pointer, or when the page changes again; never by a deadline.
 */
export function useRouteFocus({ key, title, target, fromControl = false, navigation = "push", scroll = true }: UseRouteFocusOptions): void {
  // The key the page was last settled on. Only a different key is a page change: a target ref that is a new object on every render is not.
  const seen = React.useRef(key);
  const aim = React.useRef(target);
  aim.current = target;
  const control = React.useRef(fromControl);
  control.current = fromControl;
  const toTop = React.useRef(scroll);
  toTop.current = scroll;
  const how = React.useRef(navigation);
  how.current = navigation;
  const heading = React.useRef(title);
  heading.current = title;
  // Whether a page change has been handled: from then on the hook keeps `document.title` in step with `title`.
  const owns = React.useRef(false);
  // A popup open in the document as the page changes, read in the render that brings the new key (before its commit can remove the popup): its return
  // focus may still come after this page lands.
  const popup = React.useRef(false);
  if (!Object.is(seen.current, key) && typeof document !== "undefined") popup.current = isOverlayOpen(document);
  React.useEffect(() => {
    if (Object.is(seen.current, key)) return undefined;
    seen.current = key;
    owns.current = true;
    // What only echoed the page that left goes with it (a toast whose home is the page).
    pageChanged();
    const pop = how.current === "pop";
    if (toTop.current && !pop) {
      // A fragment's target beats the top (the root's scroll padding keeps it clear of the bar); one not there now is the top. Never smooth.
      const anchor = hashTarget();
      if (anchor) anchor.scrollIntoView({ behavior: "instant" });
      else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    document.title = heading.current;
    if (control.current) return undefined;
    return land(() => resolve(aim.current), () => { document.title = heading.current; }, popup.current || isOverlayOpen(document), pop);
  }, [key]);
  React.useEffect(() => {
    if (owns.current) document.title = title;
  }, [title]);
}

/**
 * Lands focus on `find()`'s element once no popup is drawn and the element is there, watching the document for either to change. With `hold` (a popup was
 * open as the page changed), a focus handed back to the page in the two frames after landing is put back. With `fallback` (Back or Forward), an element
 * that has focus once no popup is drawn keeps it and nothing moves. Ends on landing (after the hold), on the reader's key or press, or on the returned
 * cancel; never by a deadline.
 */
function land(find: () => HTMLElement | null, named: () => void, hold: boolean, fallback = false): () => void {
  const doc = document;
  let frame = 0;
  let done = false;
  const watch = new MutationObserver(() => attempt());
  const stop = () => {
    done = true;
    cancelAnimationFrame(frame);
    watch.disconnect();
    doc.removeEventListener("keydown", reader, true);
    doc.removeEventListener("pointerdown", reader, true);
  };
  // The reader's own move ends it: a key or a press before (or while) the page lands is theirs to keep.
  function reader(event: Event) {
    if (event instanceof KeyboardEvent && (event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta")) return;
    stop();
  }
  const focusIt = (element: HTMLElement) => element.focus({ preventScroll: true });
  // Two frames in which a popup's returned focus is put back on the landing place.
  const keep = (element: HTMLElement, frames: number) => {
    frame = requestAnimationFrame(() => {
      if (done) return;
      if (element.isConnected && doc.activeElement !== element && !isOverlayOpen(doc)) focusIt(element);
      if (frames > 1) keep(element, frames - 1);
      else stop();
    });
  };
  function attempt() {
    if (done) return;
    // A popup open or closing is waited for whatever has focus: focus inside a dialog that leaves with its page is not a place the reader keeps.
    if (isOverlayOpen(doc)) {
      hold = true;
      return;
    }
    // Back or Forward: focus the app gave back (the row the reader came from) stays; only nothing focused is landed.
    if (fallback) {
      const active = doc.activeElement;
      if (active && active.isConnected && active !== doc.body && active !== doc.documentElement) {
        stop();
        return;
      }
    }
    const element = find();
    if (!element) return;
    watch.disconnect();
    named();
    focusIt(element);
    if (hold) keep(element, 2);
    else stop();
  }
  doc.addEventListener("keydown", reader, true);
  doc.addEventListener("pointerdown", reader, true);
  // A popup leaving (removed, hidden, its closing ended) and a landing place arriving are both changes to the document.
  watch.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "inert", "data-closed", "data-ending-style", "style", "class"] });
  attempt();
  return stop;
}
