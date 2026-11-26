import * as React from "react";

import { join } from "./utils";

export interface SkipLinkProps extends Omit<React.ComponentPropsWithoutRef<"a">, "href" | "target"> {
  /**
   * Where it skips to: the element's id, with or without the `#` (the page's `main`, say), or a function that finds the element when the link is pressed
   * (the first thing waiting, which has no id of its own). A function is handled in place, as `onSkip` is.
   */
  target: string | (() => HTMLElement | null | undefined);
  /**
   * The press is handled in place, for an app whose router makes a same-origin link a history entry (where a fragment link would add an entry and move no
   * focus): the navigation is prevented, the target takes focus (and `tabIndex={-1}` if it cannot otherwise), and then this is told which element it was
   * (`null` when there was none). Without it, and with an id, the link is a plain fragment link.
   */
  onSkip?: (target: HTMLElement | null) => void;
  /** The words. Default "Skip to content". */
  children?: React.ReactNode;
}

/** Focus on `element`, making it able to take focus from script if it cannot: the next Tab then starts there. */
function skipTo(element: HTMLElement) {
  element.focus();
  if (element.ownerDocument.activeElement === element) return;
  element.setAttribute("tabindex", "-1");
  element.focus();
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
 *
 * **In an app with a router:** give `onSkip` (or a function for `target`) and the press is handled in place: no history entry, and focus moves to the
 * target. Enter on the focused link is a press too.
 */
export function SkipLink({ target, onSkip, children = "Skip to content", className, onFocus, onBlur, onClick, ...props }: SkipLinkProps) {
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
  const id = typeof target === "string" ? target.replace(/^#/, "") : null;
  const inPlace = id === null || onSkip !== undefined;
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !inPlace) return;
    event.preventDefault();
    const doc = event.currentTarget.ownerDocument;
    const element = (id === null ? (target as () => HTMLElement | null | undefined)() : doc.getElementById(id)) ?? null;
    if (element) skipTo(element);
    onSkip?.(element);
  };
  return (
    // With a function for a target there is no fragment to name: the link's href is the page itself, and the press is handled in place.
    <a {...props} data-level="3" className={join("basalt-skip-link", className)} href={id === null ? "#" : `#${id}`} onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick}>
      {children}
    </a>
  );
}
