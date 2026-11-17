import * as React from "react";

export interface UseRouteFocusOptions {
  /** Changes when the page changes (a path, a route id). The first value is the page the app opened on: nothing moves for it. */
  key: string | number;
  /** The new page's title: `document.title` becomes it. */
  title: string;
  /** The page's title element. It takes `tabIndex={-1}` from the app and focus from here, with no ring: nothing operates it. */
  target: React.RefObject<HTMLElement | null>;
  /**
   * Set when the change came from a control's own value changing (a `Select` or a tab that changes the route). Focus then stays on the
   * control (WCAG 3.2.2, DECISIONS 158); the page still scrolls to the top and takes its title.
   */
  fromControl?: boolean;
}

/**
 * After a client-side page change: scroll to the top, set `document.title`, and move focus to the page's title (X10, DECISIONS 162, B1).
 * It takes no router and names no element by id: the app gives it a key that changes with the page and a ref to the title. Say the change
 * aloud through one `StatusLine`; this moves focus and the title only. It skips the first render.
 */
export function useRouteFocus({ key, title, target, fromControl = false }: UseRouteFocusOptions): void {
  const first = React.useRef(true);
  const control = React.useRef(fromControl);
  control.current = fromControl;
  const heading = React.useRef(title);
  heading.current = title;
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.scrollTo(0, 0);
    document.title = heading.current;
    if (!control.current) target.current?.focus({ preventScroll: true });
  }, [key, target]);
}
