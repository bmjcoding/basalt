import * as React from "react";

// Whether the document is at its top, for the site header's clear state (decision 104). One IntersectionObserver on a 1px sentinel at the
// document's top, so there is no scroll handler: the sentinel is fully in view only at scroll 0 or above it (the rubber band counts as the
// top), and the first pixel of scroll takes it out. Nothing runs when this module loads.

/** `top`: the document is at its top. `jump`: change at once, with no fade: the page left the top already past the headroom's slack, or it is opening at the top. */
export interface AtTop {
  top: boolean;
  jump: boolean;
}

const px = (value: string) => Number.parseFloat(value);

/**
 * The slack under the bar inside the headroom: `size-stage-headroom` less `size-header` (24px), read from the tokens so no number is
 * carried here. At a scroll of more than this, art past the headroom is already under the bar, so the change to smoked must not fade.
 * `0` if the tokens aren't loaded, which makes every departure from the top at once.
 */
function headroomSlack(): number {
  const style = getComputedStyle(document.documentElement);
  const slack = px(style.getPropertyValue("--basalt-size-stage-headroom")) - px(style.getPropertyValue("--basalt-size-header"));
  return Number.isFinite(slack) && slack > 0 ? slack : 0;
}

export function useAtTop(enabled: boolean): AtTop {
  const [state, setState] = React.useState<AtTop>({ top: false, jump: false });
  React.useLayoutEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      setState((now) => (now.top || now.jump ? { top: false, jump: false } : now));
      return undefined;
    }
    // At the document's top: absolute against the initial containing block, so a positioned body does not move it.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.setAttribute("data-basalt-top-sentinel", "");
    sentinel.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;visibility:hidden";
    document.documentElement.append(sentinel);
    const apply = (top: boolean, opening = false) => setState((now) => {
      // `jump` is "switch at once": a departure from the top first reported past the slack, and the page's opening state.
      const jump = top ? opening : window.scrollY > headroomSlack();
      return now.top === top && now.jump === jump ? now : { top, jump };
    });
    // Before paint, and at once, so a page that opens at the top is clear in its first frame: it does not fade in from the smoked bar
    // (anything that forces a style recalculation earlier in the commit would otherwise start that fade). The first observer report
    // or two frames later hands the next change back to the decided fade.
    apply(window.scrollY < 1, true);
    const settle = requestAnimationFrame(() => requestAnimationFrame(() => setState((now) => (now.top && now.jump ? { top: true, jump: false } : now))));
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) apply(entry.boundingClientRect.top >= 0);
    }, { threshold: [0, 1] });
    observer.observe(sentinel);
    return () => { cancelAnimationFrame(settle); observer.disconnect(); sentinel.remove(); };
  }, [enabled]);
  return state;
}
