import * as React from "react";

// A box that scrolls and holds nothing focusable must be a keyboard stop of its own (WCAG 2.1.1): Safari adds none, and Chromium's has no name and its
// own ring. `TableContainer` does it for a table that overflows sideways; this is the same for a body that overflows downward (`DrawerSection`,
// `SheetBody`). Measured from the box and what is in it, so a resize, a new line or a control that arrives counts; nothing changes while it fits.

const FOCUSABLE = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';

function holdsFocusable(box: HTMLElement): boolean {
  for (const element of box.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (element.matches(":disabled") || element.closest("[inert]") || element.tabIndex < 0) continue;
    return true;
  }
  return false;
}

export interface ScrollStopOptions {
  /** The id of the element that names the box. A function is given the box and read when it is measured (a sheet's title lives in its dialog). */
  labelledBy?: string | ((box: HTMLElement) => string | undefined);
  /** The app has named the box itself (`aria-label` or `aria-labelledby`). */
  named?: boolean;
}

/**
 * While the box overflows and holds nothing focusable, the attributes that make it a stop with a role and a name. Spread them before the
 * caller's own props. Returns the ref to put on the box too, which also hands the element to the caller's ref.
 */
export function useScrollStop<T extends HTMLElement>(options: ScrollStopOptions, outerRef?: React.Ref<T>) {
  const node = React.useRef<T | null>(null);
  const [stop, setStop] = React.useState<{ labelledBy?: string } | null>(null);
  const read = React.useRef(options.labelledBy);
  read.current = options.labelledBy;
  React.useLayoutEffect(() => {
    const box = node.current;
    if (!box) return undefined;
    const measure = () => {
      const on = box.scrollHeight > box.clientHeight && !holdsFocusable(box);
      const labelledBy = typeof read.current === "function" ? read.current(box) : read.current;
      setStop((now) => (on ? (now && now.labelledBy === labelledBy ? now : { labelledBy }) : now ? null : now));
    };
    const resize = new ResizeObserver(measure);
    const watch = () => { resize.disconnect(); resize.observe(box); for (const child of box.children) resize.observe(child); };
    const mutation = new MutationObserver(() => { watch(); measure(); });
    watch();
    measure();
    // A name that lives elsewhere (a sheet's title registers with its dialog after this effect) is read once more when the frame is drawn.
    const frame = requestAnimationFrame(measure);
    mutation.observe(box, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["tabindex", "disabled", "href", "inert", "hidden"] });
    return () => { cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); };
  }, []);
  const ref = React.useCallback((element: T | null) => {
    node.current = element;
    if (typeof outerRef === "function") outerRef(element);
    else if (outerRef) (outerRef as React.MutableRefObject<T | null>).current = element;
  }, [outerRef]);
  const attributes = stop
    ? { tabIndex: 0, ...(options.named || stop.labelledBy ? { role: "region" as const } : null), ...(!options.named && stop.labelledBy ? { "aria-labelledby": stop.labelledBy } : null) }
    : {};
  return { ref, attributes, stop: Boolean(stop) };
}
