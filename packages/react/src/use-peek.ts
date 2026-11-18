import * as React from "react";

import type { PeekController, PeekKind } from "./peek-plate";

// The plate that shows cut text whole (peek-plate.ts) is most of a dozen kilobytes that a part which is never hovered cut does not need, so it arrives
// on demand, as the command panel does: when the page is idle, and at once on the first hover, focus or touch of the part (replayed when it lands, so
// the wait for a plate is the tooltip's and not the network's).

type PeekModule = typeof import("./peek-plate");

let loading: Promise<PeekModule> | undefined;

function load() {
  // A rejected promise is never kept, so every attempt asks for the chunk again.
  loading ??= import("./peek-plate").catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}

/**
 * Opens the plate that shows cut text whole over a list's row (`listbox`, `open`) or above the status bar's message (`status`; its root is the message,
 * and `onCut` hears when the message becomes cut or whole, so it can be a focus stop only while it is cut). A part whose text is not cut opens nothing.
 */
export function usePeekPlate(root: React.RefObject<HTMLElement | null>, kind: PeekKind, options: { zIndex?: string; onCut?: (cut: boolean) => void } = {}) {
  const onCut = React.useRef(options.onCut);
  onCut.current = options.onCut;
  const { zIndex } = options;
  React.useEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    const win = element.ownerDocument.defaultView;
    if (!win) return undefined;
    let live = true;
    let started = false;
    let controller: PeekController | undefined;
    const start = () => {
      if (started) return;
      started = true;
      load().then((run) => {
        if (!live) return;
        controller = run.attachPeek(element, kind, zIndex, (cut) => onCut.current?.(cut));
        controller.sync();
      }, () => { started = false; });
    };
    // The status message must know early whether it is cut (it is a focus stop only then); a list needs the plate only when something is hovered or focused.
    // (Safari has no requestIdleCallback.)
    const hasIdle = typeof win.requestIdleCallback === "function";
    const idle = hasIdle ? win.requestIdleCallback(start, { timeout: 2000 }) : win.setTimeout(start, 200);
    for (const type of ["pointerover", "focusin", "pointerdown"]) element.addEventListener(type, start, { once: true, passive: true });
    return () => {
      live = false;
      if (hasIdle) win.cancelIdleCallback(idle); else win.clearTimeout(idle);
      for (const type of ["pointerover", "focusin", "pointerdown"]) element.removeEventListener(type, start);
      controller?.stop();
    };
  }, [root, kind, zIndex]);
}
