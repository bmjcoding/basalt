import * as React from "react";

// The sliding pill. A one-of-many control (SegmentedControl, vertical Tabs) draws one pill that travels to the chosen
// item, as an enhancement over each item painting its own pill. The measuring is DOM work in effects, never React state:
// the pill's position is four CSS variables on the control, and the browser eases `transform`, `width` and `height`
// between their values as transitions, so a second change retargets the move from wherever it has reached.

/** The chosen item inside a control: a segment is `data-pressed`, a tab is `data-active`. */
const CHOSEN = "[data-pressed], [data-active]";

/** The scale a transformed ancestor (a dialog entering at .98) puts on a box, so measuring stays in layout pixels. */
function scaleOf(box: HTMLElement, rect: DOMRect) {
  const ratio = box.offsetWidth > 0 ? rect.width / box.offsetWidth : 1;
  return Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
}

/**
 * Measures the chosen item of `root` into `--_pill-x`, `--_pill-y`, `--_pill-w` and `--_pill-h`, and marks the root
 * `data-slide` once it has. Re-measures when the chosen item changes (an attribute the primitive sets), when the
 * control or the item resizes, when fonts finish loading and when the screen turns; those re-measures snap, because
 * only a new choice travels. Everything is cleaned up with the component.
 */
function attachPill(root: HTMLElement, pill: HTMLElement): () => void {
  let chosen: HTMLElement | null = null;
  let resizes: ResizeObserver | undefined;
  // Where the pill was last sent. Observing a new item reports its size at once; unless something moved, that is nothing.
  let sent = "";

  const measure = (travel: boolean) => {
    const item = root.querySelector<HTMLElement>(CHOSEN);
    if (item !== chosen) {
      if (chosen) resizes?.unobserve(chosen);
      if (item) resizes?.observe(item);
      chosen = item;
    }
    if (!item) {
      root.removeAttribute("data-slide");
      return;
    }
    const box = root.getBoundingClientRect();
    const at = item.getBoundingClientRect();
    const scale = scaleOf(root, box);
    const style = root.style;
    const key = `${at.left - box.left} ${at.top - box.top} ${at.width} ${at.height} ${scale}`;
    if (key === sent && root.hasAttribute("data-slide")) return;
    sent = key;
    const write = () => {
      style.setProperty("--_pill-x", `${(at.left - box.left) / scale - root.clientLeft + root.scrollLeft}px`);
      style.setProperty("--_pill-y", `${(at.top - box.top) / scale - root.clientTop + root.scrollTop}px`);
      style.setProperty("--_pill-w", `${at.width / scale}px`);
      style.setProperty("--_pill-h", `${at.height / scale}px`);
    };
    if (travel && root.hasAttribute("data-slide")) {
      write();
      return;
    }
    // The first measurement, a resize, a font arriving: the pill goes to its place without a move.
    root.setAttribute("data-snap", "");
    write();
    root.setAttribute("data-slide", "");
    void pill.offsetWidth;
    root.removeAttribute("data-snap");
  };

  measure(false);
  resizes = new ResizeObserver(() => measure(false));
  resizes.observe(root);
  if (chosen) resizes.observe(chosen);
  // A new choice (an attribute) travels. Items added or removed only re-place the pill.
  const changes = new MutationObserver((records) => measure(records.some((record) => record.type === "attributes")));
  changes.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-pressed", "data-active"] });
  const turn = window.matchMedia("(orientation: portrait)");
  const remeasure = () => measure(false);
  turn.addEventListener("change", remeasure);
  window.addEventListener("resize", remeasure);
  let live = true;
  document.fonts?.ready.then(() => { if (live) measure(false); });
  return () => {
    live = false;
    resizes?.disconnect();
    changes.disconnect();
    turn.removeEventListener("change", remeasure);
    window.removeEventListener("resize", remeasure);
  };
}

/**
 * The shared pill of a one-of-many control. Render it as the first child of the control (the items are positioned and
 * paint over it). It is decoration: hidden from assistive technology, never hit by the pointer, and drawn only when
 * the stylesheet lets it (no reduced motion, no forced colours). Pass `enabled={false}` for a control that has none.
 */
export function Pill({ enabled = true }: { enabled?: boolean }) {
  const pill = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const root = pill.current?.parentElement;
    if (!enabled || !root || !pill.current) return;
    return attachPill(root, pill.current);
  }, [enabled]);
  return enabled ? <span ref={pill} aria-hidden="true" className="basalt-pill" /> : null;
}
