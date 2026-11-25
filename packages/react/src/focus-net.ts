import * as React from "react";

import { isOverlayOpen } from "./overlay-open";
import type { FocusPlace } from "./route-focus";

export interface UseFocusNetOptions {
  /** Whether the net is up. Default true. */
  enabled?: boolean;
}

/**
 * An opt-in focus net for the whole app. When the control that had focus is removed by the app's own state (a row decided, a form answered, a
 * callout dismissed, a dialog whose opener has gone) and focus falls to nothing (the document's body) with no dialog, sheet or menu open, focus lands
 * on the page's landing place: usually its title (`AppHeader`'s `titleRef`), the same place `useRouteFocus` lands on. A reader who clicks the
 * page's background, or a focus the app moves itself, is left alone: only a focus lost with its control, while the control held it, is caught (a control
 * left on purpose and removed later is not). Use it once, in the shell.
 */
export function useFocusNet(target: FocusPlace, { enabled = true }: UseFocusNetOptions = {}): void {
  const aim = React.useRef(target);
  aim.current = target;
  React.useEffect(() => {
    if (!enabled) return undefined;
    const doc = document;
    // The last element that had focus, and so the one whose removal drops it.
    let last: Element | null = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : null;
    let frame = 0;
    const track = (event: FocusEvent) => {
      if (event.target instanceof Element) last = event.target;
    };
    // Focus left the control for nothing: a press on the page's background. (A window losing focus keeps its active element, so it is not this.) Once the
    // events have settled, a control still in the document was left on purpose, and its later removal is not a lost focus: it is forgotten. A control
    // removed while it held focus is gone by then, and is kept for the catch.
    const left = (event: FocusEvent) => {
      const control = last;
      if (event.relatedTarget !== null || control === null || event.target !== control) return;
      queueMicrotask(() => {
        if (last === control && control.isConnected && doc.activeElement !== control) last = null;
      });
    };
    const lost = () => {
      const active = doc.activeElement;
      return (active === null || active === doc.body) && last !== null && !last.isConnected;
    };
    const catchIt = () => {
      frame = 0;
      // Checked again a frame on: a control that moves focus itself on removal (a dialog's own return) has done so by now.
      if (!lost() || isOverlayOpen(doc)) return;
      const place = typeof aim.current === "function" ? aim.current() ?? null : aim.current.current;
      if (!place || !place.isConnected) return;
      last = null;
      place.focus({ preventScroll: true });
    };
    const watch = new MutationObserver(() => {
      if (frame === 0 && lost()) frame = requestAnimationFrame(catchIt);
    });
    watch.observe(doc.body, { childList: true, subtree: true });
    doc.addEventListener("focusin", track, true);
    doc.addEventListener("focusout", left, true);
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      doc.removeEventListener("focusin", track, true);
      doc.removeEventListener("focusout", left, true);
    };
  }, [enabled]);
}
