import * as React from "react";

// A bar that arrives, or leaves and returns (DECISIONS 146 D). One header element in a slot that keeps the resting row's height; three phases a page reports from one
// IntersectionObserver on two 1px sentinels, and no scroll handler:
//
//   rest      the slot's bottom is still in the window: the header sits in its slot and scrolls with the page.
//   between   the slot has left the top of the window and the trigger (`after`) has not reached the bar's line: no bar is on screen, and the gap is short on purpose.
//   pinned    the trigger's bottom has passed the bar's line: the same element becomes `position: fixed` and drops in from above its own top edge.
//
// Where the page is decides the phase, never the direction it last moved: a direction needs a scroll handler, and a bar that comes and goes with every flick is motion
// nobody asked for. The root margin is long downward, so a sentinel that starts below the fold still counts as in the window, and a jump past it (an anchor, `scrollTo`,
// a restored scroll) is a change the observer reports. Nothing runs when this module loads.

export type SitePhase = "rest" | "between" | "pinned";
/** `row`: the header sits in its slot. `bar`: it is out of the flow, fixed to the window. A site's CSS restyles it by `data-form="row" | "bar"`. */
export type SiteForm = "row" | "bar";

export interface SitePhaseOptions {
  /**
   * The element whose leaving pins the bar: the first screen, the hero, the hero's mark. A ref or the element itself. With none, the slot is the trigger and the bar
   * comes as soon as the row starts to leave (there is no `between`).
   */
  after?: React.RefObject<Element | null> | Element | null;
  /** Called when the phase changes. */
  onPhase?: (phase: SitePhase, previous: SitePhase | null) => void;
}

export interface SitePhaseState {
  phase: SitePhase;
  form: SiteForm;
}

/** The observer's long downward margin: the window's bottom edge is far below the fold, so a sentinel that starts below it counts as in. */
const REACH = "1000000px";

const duration = (token: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 0;
  return value.endsWith("ms") ? number : number * 1000;
};

function sentinel(): HTMLElement {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("data-basalt-phase-sentinel", "");
  element.style.cssText = "position:absolute;inset-inline-start:0;width:1px;height:1px;pointer-events:none;visibility:hidden";
  return element;
}

/**
 * Reports where the page is for a bar that arrives, or leaves and returns, and drives it: `data-phase` (`rest`, `between`, `pinned`), `data-form` (`row`, `bar`) and
 * `data-motion` on the header, and `data-site-phase` on the root. The header is one element and a child of a slot (`SitePhaseSlot`, or any positioned element the
 * height of the resting row), never copied, so nothing is announced twice and focus is never handed between two bars.
 *
 * - **Enters** from above its own top edge over `duration-slower` on `ease-out`; **leaves** the same way at 0.75 on `ease-in`; under reduced motion it fades (opacity only).
 * - **At once:** the opening state, a departure first reported more than a bar's height past the line (an anchor, `scrollTo`, a restored scroll) and a return to rest
 *   straight from pinned switch with no travel. A turn mid-exit travels back from where the bar has reached.
 * - **Focus** inside the header holds the bar while the page is between, so a Tab never lands on a bar that is leaving; focus entering it shows it.
 * - **The line** is the bar's bottom edge, `--phase-line` on the header (the sticky offset by default), read through a probe.
 *
 * Returns the phase and the form for a site that draws something of its own by them. The sentinels are two 1px elements the hook adds and removes: one at the slot's
 * bottom and one `line` above the bottom of `after`, so `after` is made `position: relative` when it is static.
 */
export function useSitePhase(header: React.RefObject<HTMLElement | null>, options: SitePhaseOptions = {}): SitePhaseState {
  const [state, setState] = React.useState<SitePhaseState>({ phase: "rest", form: "row" });
  const after = options.after;
  const onPhase = React.useRef(options.onPhase);
  onPhase.current = options.onPhase;
  React.useEffect(() => {
    const head = header.current;
    const slot = head?.parentElement;
    if (!head || !slot || typeof IntersectionObserver === "undefined") return undefined;
    const trigger = (after && "current" in after ? after.current : after) ?? slot;
    const doc = head.ownerDocument;
    const root = doc.documentElement;
    // Where the bar's bottom will be, read from `--phase-line` through a probe (a token sum, never a number in script).
    const probe = doc.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:0;height:var(--phase-line, var(--basalt-sticky-offset))";
    head.append(probe);
    const line = probe.getBoundingClientRect().height || 0;
    probe.remove();

    const placed: Array<() => void> = [];
    const mark = (host: Element) => {
      if (getComputedStyle(host).position !== "static") return;
      (host as HTMLElement).style.position = "relative";
      placed.push(() => { (host as HTMLElement).style.removeProperty("position"); });
    };
    mark(slot);
    if (trigger !== slot) mark(trigger);
    const rowEnd = sentinel();
    rowEnd.style.top = "calc(100% - 1px)";
    const triggerLine = sentinel();
    triggerLine.style.bottom = `${line}px`;
    slot.append(rowEnd);
    trigger.append(triggerLine);

    let phase: SitePhase | "" = "";
    let form: SiteForm = "row";
    head.setAttribute("data-form", form);
    let held = false;
    let settled = false;
    let rowGone = false;
    let triggerGone = false;
    let jump = false;
    let leaving: ReturnType<typeof setTimeout> | undefined;

    const set = (nextForm: SiteForm, motion: string) => {
      form = nextForm;
      head.setAttribute("data-form", nextForm);
      head.setAttribute("data-motion", motion);
      setState((now) => (now.form === nextForm ? now : { ...now, form: nextForm }));
    };
    const want = (): SiteForm => (phase === "pinned" || (held && phase === "between") ? "bar" : "row");
    const enter = (now: boolean) => {
      clearTimeout(leaving);
      leaving = undefined;
      if (now) {
        set("bar", "none");
        return;
      }
      // A turn mid-exit travels back from where the bar has reached.
      if (form === "bar") {
        head.setAttribute("data-motion", "in");
        return;
      }
      set("bar", "from");
      void head.offsetWidth;
      head.setAttribute("data-motion", "in");
    };
    const leave = (now: boolean) => {
      if (form !== "bar") return;
      clearTimeout(leaving);
      if (now) {
        leaving = undefined;
        set("row", "none");
        return;
      }
      head.setAttribute("data-motion", "out");
      // The exit ends when its transition has: 0.75 of `duration-slower`, and a frame of slack.
      leaving = setTimeout(() => {
        leaving = undefined;
        if (want() === "row") set("row", "none");
      }, duration("--basalt-duration-slower") * 0.75 + 34);
    };
    const apply = (now: boolean) => {
      if (want() === "bar") enter(now);
      else leave(now || phase === "rest");
    };
    const update = () => {
      const next: SitePhase = triggerGone ? "pinned" : rowGone ? "between" : "rest";
      if (next === phase) return;
      const previous = phase || null;
      phase = next;
      head.setAttribute("data-phase", next);
      root.setAttribute("data-site-phase", next);
      setState((now) => (now.phase === next ? now : { ...now, phase: next }));
      apply(!settled || (next === "pinned" && jump));
      onPhase.current?.(next, previous);
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const top = entry.rootBounds?.top ?? 0;
        const gone = !entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1;
        if (entry.target === rowEnd) rowGone = gone;
        else {
          triggerGone = gone;
          // A departure first reported more than a bar's height past the line: an anchor, a scrollTo, a restored scroll. It switches at once.
          jump = gone && top - entry.boundingClientRect.bottom > line;
        }
      }
      update();
      if (!settled) requestAnimationFrame(() => requestAnimationFrame(() => { settled = true; }));
    }, { root: doc, rootMargin: `0px 0px ${REACH} 0px`, threshold: [0] });
    observer.observe(rowEnd);
    observer.observe(triggerLine);

    const hold = () => {
      if (held) return;
      held = true;
      if (phase === "between") apply(false);
    };
    const release = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && head.contains(event.relatedTarget)) return;
      held = false;
      apply(false);
    };
    head.addEventListener("focusin", hold);
    head.addEventListener("focusout", release);
    return () => {
      clearTimeout(leaving);
      observer.disconnect();
      head.removeEventListener("focusin", hold);
      head.removeEventListener("focusout", release);
      rowEnd.remove();
      triggerLine.remove();
      for (const undo of placed) undo();
      head.removeAttribute("data-phase");
      head.removeAttribute("data-form");
      head.removeAttribute("data-motion");
      root.removeAttribute("data-site-phase");
    };
  }, [header, after]);
  return state;
}
