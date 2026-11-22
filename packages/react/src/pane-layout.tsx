import * as React from "react";

import { join } from "./utils";

// A page with a pane: the page, and beside it a column that stays in view (sticky under the bar, as the app sidebar is), has a
// height of its own (the window less the bar and a gap above and below) and scrolls inside only when what it holds is taller. The
// document is still the scroller: the page itself never moves into a pane. Beside the page from size-sidebar-width +
// size-gutter + size-breakpoint-container-lg (920px) of its own width, so the page beside it is never under 640; narrower, the
// pane follows the page in the flow, with no height of its own. Nothing here runs when the module loads.

export interface PaneLayoutProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The page: what the document scrolls. */
  children?: React.ReactNode;
  /** What the pane holds: a summary, details, a checklist, an outline. Supporting the page, never the page itself. */
  pane: React.ReactNode;
  /** The pane's name: it is a region, named by this ("Details", "Outline"). */
  paneLabel: string;
  /** Props for the pane's element. */
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
  const [overflows, setOverflows] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
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
        <section
          {...paneProps}
          ref={ref}
          aria-label={paneLabel}
          tabIndex={overflows ? 0 : paneProps?.tabIndex}
          data-overflows={overflows ? "" : undefined}
          className={join("basalt-pane", paneProps?.className)}
        >
          {pane}
        </section>
      </div>
    </div>
  );
}
