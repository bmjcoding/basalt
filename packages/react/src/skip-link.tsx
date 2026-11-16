import * as React from "react";

import { join } from "./utils";

export interface SkipLinkProps extends Omit<React.ComponentPropsWithoutRef<"a">, "href"> {
  /** The id of the element it skips to, with or without the `#`: the page's `main`, say. */
  target: string;
  /** The words. Default "Skip to content". */
  children?: React.ReactNode;
}

/** The bars a skip link hangs under: the site header, the app header, and an app's own bar marked `basalt-sticky-bar`. The first one in the document is read. */
const BAR = ".basalt-site-header, .basalt-app-header, .basalt-sticky-bar";

/**
 * A link that jumps past the page's bar and navigation to its content. Place it yourself as the first element of the page, so
 * it is the first tab stop; it is unseen until it has focus. With a bar (`SiteHeader`, `AppHeader`, or your own `.basalt-sticky-bar`)
 * it then hangs under it, `space-2` below its line, on the brand's start edge at every width, so it covers nothing in the bar and
 * nothing in the page moves. It floats like a tooltip: level 3, the rim, `shadow-overlay`, radius 8. Without a bar it sits at the
 * page's top start.
 *
 * **How it finds the bar:** when the link takes focus it reads the real bottom edge of the first element matching
 * `.basalt-site-header, .basalt-app-header, .basalt-sticky-bar` and sits `space-2` below it, and it reads it again on scroll and on
 * resize while it holds focus. So a bar that is not at the top of the viewport (a notice above it, which scrolls away and lets the
 * bar stick) is still cleared. With no script, or no bar found, the link is where the stylesheet puts it (under a bar at the
 * viewport's top). The target takes focus when it can (give a `main` `tabIndex={-1}`); otherwise the next Tab starts there. It is
 * not drawn in print. `AppShell` and `SiteHeader` do not render one.
 */
export function SkipLink({ target, children = "Skip to content", className, onFocus, onBlur, ...props }: SkipLinkProps) {
  const stop = React.useRef<(() => void) | null>(null);
  React.useEffect(() => () => stop.current?.(), []);
  const place = (link: HTMLElement) => {
    const bar = link.ownerDocument.querySelector(BAR);
    if (bar) link.style.top = `calc(${Math.max(0, bar.getBoundingClientRect().bottom)}px + var(--basalt-space-2))`;
    else link.style.removeProperty("top");
  };
  const handleFocus = (event: React.FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event);
    const link = event.currentTarget;
    const win = link.ownerDocument.defaultView;
    if (!win) return;
    stop.current?.();
    const again = () => place(link);
    place(link);
    win.addEventListener("scroll", again, { capture: true, passive: true });
    win.addEventListener("resize", again);
    stop.current = () => {
      win.removeEventListener("scroll", again, true);
      win.removeEventListener("resize", again);
      link.style.removeProperty("top");
      stop.current = null;
    };
  };
  const handleBlur = (event: React.FocusEvent<HTMLAnchorElement>) => {
    onBlur?.(event);
    stop.current?.();
  };
  return (
    <a {...props} data-level="3" className={join("basalt-skip-link", className)} href={`#${target.replace(/^#/, "")}`} onFocus={handleFocus} onBlur={handleBlur}>
      {children}
    </a>
  );
}
