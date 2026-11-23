import * as React from "react";

import { useInShape } from "./in-shape";

// The entry a link, a search result or a notice opened (DECISIONS 266, and 320 for the release notes): scrolled to, focused with no ring (it is a
// place, not a control), and marked until the reader acts (a press, or a key that is not one that reads around it). Shared by the stream's entries
// and the release notes' releases and entries; each draws its own mark (the plate and the word "Linked"). Nothing runs when the module loads.

/** Keys that read around the entry rather than act: they leave the mark where it is. A pattern, not a set, so loading the module builds nothing. */
const reading = (key: string) => /^(Arrow(Up|Down|Left|Right)|Page(Up|Down)|Home|End| |Shift|Control|Alt|Meta|CapsLock)$/.test(key);

export interface ArrivalProps {
  /** This is the entry a link, a search result or a notice opened: it is scrolled to, focused and marked until the reader acts. */
  arrived?: boolean;
  /** The word that says so, in the entry's head. Default "Linked"; an app says why in its own words ("Search result", "From your notice"). */
  arrivedLabel?: string;
  /** The reader has acted, so the mark is going. Without it the part ends the mark itself; with it, the app may also clear `arrived`. */
  onArrivedEnd?: () => void;
}

// One entry arrives at a time. The one placed last is the one the reader is at: placing another ends the one before (its `onArrivedEnd` is
// called). Assigned only while an entry is arrived, so loading this module does nothing.
let current: { end: () => void } | undefined;

/** Whether the element has a box the reader can see: not under `display: none` (nor `content-visibility: hidden`). */
const shown = (el: HTMLElement) => el.getClientRects().length > 0 && (typeof el.checkVisibility !== "function" || el.checkVisibility());

/** The nearest ancestor that scrolls the entry on the block axis, or null when it is the page. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let at = el.parentElement; at && at !== document.body && at !== document.documentElement; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if ((overflowY === "auto" || overflowY === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }
  return null;
}

/**
 * The arrival's state: shown while `arrived` and the reader has not acted yet. Once the entry has a box (a pane it sits in may be hidden when it
 * mounts) it is scrolled to and focused, once each time it turns on, and from then the reader's first act ends it.
 */
export function useArrival<T extends HTMLElement>({ arrived = false, onArrivedEnd }: ArrivalProps) {
  const inShape = useInShape();
  const ref = React.useRef<T>(null);
  const [ended, setEnded] = React.useState(false);
  const [ever, setEver] = React.useState(false);
  const [placed, setPlaced] = React.useState(false);
  const end = React.useRef(onArrivedEnd);
  end.current = onArrivedEnd;
  React.useEffect(() => { if (arrived) setEnded(false); }, [arrived]);
  const on = arrived && !ended && inShape === 0;
  React.useEffect(() => { if (!on) setPlaced(false); }, [on]);
  React.useLayoutEffect(() => {
    if (!on || placed) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const place = () => {
      // A short entry is brought to the middle of what scrolls it; one taller than most of that (the pane's visible height, or the window's), to its top.
      const scroller = scrollerOf(el);
      const room = scroller ? scroller.clientHeight : window.innerHeight;
      el.scrollIntoView({ block: el.getBoundingClientRect().height > room * 0.6 ? "start" : "center", inline: "nearest" });
      el.focus({ preventScroll: true });
      setEver(true);
      setPlaced(true);
    };
    if (shown(el)) { place(); return undefined; }
    // Not laid out yet (a hidden tab or pane): wait until it has a box, then place it once.
    const watch = new ResizeObserver(() => { if (shown(el)) { watch.disconnect(); place(); } });
    watch.observe(el);
    return () => watch.disconnect();
  }, [on, placed]);
  React.useEffect(() => {
    if (!on || !placed) return undefined;
    const finish = () => { setEnded(true); end.current?.(); };
    const self = { end: finish };
    if (current && current !== self) current.end();
    current = self;
    const act = (event: Event) => {
      if (event.type === "keydown") {
        const key = (event as KeyboardEvent).key;
        const inField = (event.target as Element | null)?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']");
        if (reading(key) && !(key === " " && inField)) return;
      }
      finish();
    };
    // From the next frame, so the press or key that opened the entry does not end its mark.
    const frame = requestAnimationFrame(() => {
      document.addEventListener("pointerdown", act, true);
      document.addEventListener("keydown", act, true);
    });
    return () => {
      if (current === self) current = undefined;
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", act, true);
      document.removeEventListener("keydown", act, true);
    };
  }, [on, placed]);
  // Once it has arrived the entry stays a focus target, so taking the mark away never drops the reader's focus.
  const attrs = { ref, tabIndex: ever || on ? -1 : undefined, "data-arrival": ever || on ? "" : undefined, "data-arrived": on ? "" : undefined };
  return { on, ever: ever || on, attrs };
}

