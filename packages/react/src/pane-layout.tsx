import * as React from "react";

import { useScrollFade } from "./fade-port";

import { join } from "./utils";
import { useJoinedRef } from "./wait";

// A page with a pane: the page, and beside it a column that stays in view (sticky under the bar, as the app sidebar is), has a
// height of its own (the window less the bar and a gap above and below) and scrolls inside only when what it holds is taller. The
// document is still the scroller: the page itself never moves into a pane. Beside the page from size-sidebar-width +
// size-gutter + size-breakpoint-container-lg (920px) of its own width, so the page beside it is never under 640; narrower, the
// pane follows the page in the flow, with no height of its own. Nothing here runs when the module loads.

/**
 * The pane's scroller, for what is inside it: the pane's element while it is its own scroller (beside the page, sticky, with its own
 * height), and `null` while it follows the page in the flow, when the window scrolls it. Read with `usePaneScroller`.
 */
const PaneScrollerContext = /* @__PURE__ */ React.createContext<HTMLElement | null>(null);

/**
 * The element that scrolls what you are inside, when that is a `PaneLayout`'s pane: the pane while it sits beside the page and scrolls
 * inside, else `null` (the window scrolls it, as it does outside any pane). A part that follows its scroll position (a list's band, a
 * back-to-top control) passes this as its scroll owner; it changes when the pane moves between beside and under the page.
 */
export function usePaneScroller(): HTMLElement | null {
  return React.useContext(PaneScrollerContext);
}

export interface PaneLayoutProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The page: what the document scrolls. */
  children?: React.ReactNode;
  /** What the pane holds: a summary, details, a checklist, an outline. Supporting the page, never the page itself. */
  pane: React.ReactNode;
  /** The pane's name: it is a region, named by this ("Details", "Outline"). */
  paneLabel: string;
  /** Props for the pane's element; its `ref` is the pane, which is the scroller only while it sits beside the page (`data-scroller`). */
  paneProps?: Omit<React.ComponentProps<"section">, "children" | "aria-label">;
}

/**
 * The page and a pane beside it, `size-sidebar-width` (256px) wide at its end, the gutter between. The pane sticks `space-6`
 * under the bar, is at most the window's height less the bar and `space-6` above and below, and scrolls inside when it is taller
 * (`overscroll-behavior: contain`); while it overflows it is a tab stop, so the keys can scroll it. It keeps `space-1-5` round what it
 * holds so a focus ring never clips. Under 920px of its own width it follows the page in the flow. In print it is in the flow.
 */
export function PaneLayout({ pane, paneLabel, paneProps, className, children, ...props }: PaneLayoutProps) {
  const ref = React.useRef<HTMLElement>(null);
  const joined = useJoinedRef(paneProps?.ref, ref);
  const [overflows, setOverflows] = React.useState(false);
  useScrollFade(ref, { axis: "block", ring: 4 });
  // The pane is its own scroller only beside the page (its container query gives it overflow); under the page the window scrolls it.
  const [scroller, setScroller] = React.useState<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const check = () => {
      const own = getComputedStyle(el).overflowY !== "visible";
      setScroller(own ? el : null);
      setOverflows(own && el.scrollHeight > el.clientHeight + 1);
    };
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    const watch = new MutationObserver(() => {
      observer.disconnect();
      observer.observe(el);
      for (const child of Array.from(el.children)) observer.observe(child);
      check();
    });
    watch.observe(el, { childList: true });
    check();
    return () => { observer.disconnect(); watch.disconnect(); };
  }, []);
  return (
    <div {...props} className={join("basalt-pane-layout", className)}>
      <div className="basalt-pane-grid">
        <div className="basalt-pane-page">{children}</div>
        {/* The host (cimip-gaps-3 t7) sticks and holds the pane's height and its ring; the pane stays the port, scrolls and fades at each edge that hides more. */}
        <div className="basalt-pane-host">
        <section
          {...paneProps}
          ref={joined}
          aria-label={paneLabel}
          tabIndex={overflows ? 0 : paneProps?.tabIndex}
          data-overflows={overflows ? "" : undefined}
          data-scroller={scroller ? "" : undefined}
          className={join("basalt-pane", paneProps?.className)}
        >
          <PaneScrollerContext.Provider value={scroller}>{pane}</PaneScrollerContext.Provider>
        </section>
        </div>
      </div>
    </div>
  );
}
