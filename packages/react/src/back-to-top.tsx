import * as React from "react";

import { Button } from "./button";
import { ArrowUpGlyph } from "./glyphs/arrow-up";
import { scrolled, scrollOwnerTo, scrollTarget, useScrollElement, viewHeight, viewTop } from "./scroll-owner";
import type { ScrollOwner } from "./scroll-owner";
import { join } from "./utils";

// Back to top (DECISIONS 227 and 228, the owner's design drawn by Opus): at the top of the screen, centred on the list, under the bar (and under the band where it is stuck from 720). It appears
// while the reader scrolls down a long list and leaves when they scroll up. It lives in a dock of zero height right after the band, so it takes no room. Nothing runs when this module loads.

export interface BackToTopProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The list's top: an element above the rows (`ListBand`'s sentinel). The button is drawn once this is more than one screen of the scroller above the scroller's top. */
  list: React.RefObject<HTMLElement | null>;
  /** The band the dock sits under from 720, where the band is stuck under the bar: its height is added to the dock's top. */
  band?: React.RefObject<HTMLElement | null>;
  /** The list's heading, as an id or a ref: a press focuses it (`preventScroll`). It is the start of what the reader came back for. Give it `tabIndex={-1}`; one without is given it. */
  heading?: string | React.RefObject<HTMLElement | null>;
  /** The button's words and name. Default "Back to top". */
  label?: string;
  /** What scrolls the list: the window (the default), or a pane's element or a ref to it. The button watches that scroller and takes it to its top. `ListBand` passes its own. */
  scroller?: ScrollOwner;
}

/** Travel back, in px, from the furthest point reached before the direction turns: `space-2`. A tremor of a few pixels never flips it. */
const TURN = 8;

/**
 * A button that takes the scroller (the window, or the pane given as `scroller`) back to the top of a long list. It is drawn while the reader scrolls down once the list's top is more than one screen of the scroller above, and it leaves when they scroll
 * up by 8px (the scroll position is held between the page's two ends, so an overscroll's bounce is never a turn). It never leaves while it holds focus, and it is not drawn while a modal is
 * open over the page. It fades over `duration-fast` and never slides (0.75 of it out). A press goes to the top at once, with or without reduced motion (the distance is screens long, and
 * a scroll would only stream rows past), and focuses the list's heading. A secondary `sm` Button with the core up arrow and its words, solid, with `shadow-overlay`, at every width.
 */
export function BackToTop({ list, band, heading, label = "Back to top", scroller, className, ...props }: BackToTopProps) {
  const owner = useScrollElement(scroller);
  const dock = React.useRef<HTMLDivElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);
  const [shown, setShown] = React.useState(false);
  const state = React.useRef({ down: true, peak: 0, trough: 0, modal: false });

  const evaluate = React.useCallback((): boolean => {
    const top = list.current;
    return state.current.down && !state.current.modal && Boolean(top && top.getClientRects().length && top.getBoundingClientRect().top - viewTop(owner) < -viewHeight(owner));
  }, [list, owner]);
  const sync = React.useCallback(() => {
    const show = evaluate();
    // It never leaves while it holds focus: the reader would lose their place. It goes when focus leaves it.
    if (!show && document.activeElement === button.current) return;
    setShown(show);
  }, [evaluate]);

  React.useEffect(() => {
    const s = state.current;
    s.peak = s.trough = scrolled(owner);
    let frame = 0;
    // The direction turns only after 8px of travel back from the furthest point, and the position is held between the page's two ends.
    const read = () => {
      const y = scrolled(owner);
      if (s.down) {
        if (y > s.peak) s.peak = y;
        else if (s.peak - y >= TURN) { s.down = false; s.trough = y; }
      } else if (y < s.trough) s.trough = y;
      else if (y - s.trough >= TURN) { s.down = true; s.peak = y; }
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; read(); sync(); });
    };
    const target = scrollTarget(owner);
    target.addEventListener("scroll", onScroll, { passive: true });
    // A modal over the page makes the button inert (or hides its ancestors): it is not drawn then.
    const watch = () => {
      const el = button.current;
      const modal = Boolean(el && el.closest("[inert], [aria-hidden='true']"));
      // Only a flip is worth a look: these attributes change all over the page, and `sync` reads layout.
      if (modal === s.modal) return;
      s.modal = modal;
      sync();
    };
    const observer = new MutationObserver(watch);
    observer.observe(document.body, { attributes: true, attributeFilter: ["inert", "aria-hidden"], subtree: true });
    sync();
    return () => { target.removeEventListener("scroll", onScroll); observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [sync, owner]);

  // From 720 the dock sticks under the stuck band, so the band's height is written beside it (a measured length).
  React.useEffect(() => {
    const el = band?.current;
    const at = dock.current;
    if (!el || !at || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => at.style.setProperty("--_band-height", `${el.getBoundingClientRect().height}px`));
    observer.observe(el);
    return () => observer.disconnect();
  }, [band]);

  return (
    <div {...props} ref={dock} data-scroller={scroller ? "" : undefined} className={join("basalt-back-to-top-dock", className)}>
      <Button
        ref={button}
        size="sm"
        variant="secondary"
        icon={ArrowUpGlyph}
        className="basalt-back-to-top"
        data-shown={shown ? "" : undefined}
        tabIndex={shown ? undefined : -1}
        onBlur={sync}
        onClick={() => {
          const target = typeof heading === "string" ? document.getElementById(heading) : heading?.current;
          if (target) {
            if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
          scrollOwnerTo(owner, 0);
          sync();
        }}
      >
        {label}
      </Button>
    </div>
  );
}
