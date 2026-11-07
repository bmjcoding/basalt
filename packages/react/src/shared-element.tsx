// Internal. SharedElement was withdrawn from the public API by the design panel: nothing in Basalt
// needs an element to keep its identity across places, and it is not exported from index.ts. It stays
// here, tested, in case a component does.
import * as React from "react";

import { useReducedMotion } from "./motion";
import { join } from "./utils";

interface SharedPlacement {
  left: number;
  top: number;
}

// Where each `layoutId` was last drawn. Made on first use and dropped when the last element
// leaves, so an app that never moves one holds nothing, and nothing outlives its element.
let sharedPositions: Map<string, SharedPlacement> | undefined;

function sharedStore() {
  sharedPositions ??= new Map();
  return sharedPositions;
}

function forgetShared(layoutId: string, placement: SharedPlacement | undefined) {
  if (!placement || sharedPositions?.get(layoutId) !== placement) return; // another element took over
  sharedPositions.delete(layoutId);
  if (sharedPositions.size === 0) sharedPositions = undefined;
}

/**
 * An element that keeps its identity across states. When `layoutId` appears in a new
 * place, it travels from the old one. Reduced motion leaves it where it is.
 */
export function SharedElement({ layoutId, className, children }: { layoutId: string; className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  // Runs after every render, to read where the element is now. Each run owns the placement it stored under
  // the id it stored it for, and its cleanup forgets exactly that: a changed id leaves nothing behind under
  // the old one, and a successor that took the place over (in the same commit) is left alone.
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const next = element.getBoundingClientRect();
    const store = sharedStore();
    const previous = store.get(layoutId);
    const mine = { left: next.left, top: next.top };
    store.set(layoutId, mine);
    const forget = () => {
      // Its successor, mounted in the same commit, has already read this place; forget it after.
      window.setTimeout(() => forgetShared(layoutId, mine), 0);
    };
    if (!previous || reduced) return forget;
    const dx = previous.left - next.left;
    const dy = previous.top - next.top;
    if (Math.abs(dx) >= 0.5 || Math.abs(dy) >= 0.5) {
      element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        { duration: 200, easing: "cubic-bezier(0.16, 1, 0.3, 1)" } // slow, ease-out,
      );
    }
    return forget;
  });
  return (
    <span ref={ref} className={join("basalt-shared", className)} data-layout={layoutId}>
      {children}
    </span>
  );
}

