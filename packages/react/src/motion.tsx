import * as React from "react";

import { Spinner } from "./spinner";
import { join } from "./utils";

/** True after mount when the reader asked for reduced motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return reduced;
}

/**
 * Eases toward `target` by about 8% of the remaining distance each frame.
 * Reduced motion snaps. Screen readers should be given `target`, not this in-between value.
 */
export function useGlide(target: number, factor = 0.08) {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(target);
  const valueRef = React.useRef(target);
  React.useEffect(() => {
    if (reduced) {
      valueRef.current = target;
      setValue(target);
      return;
    }
    let frame = 0;
    const tick = () => {
      const current = valueRef.current;
      const next = current + (target - current) * factor;
      if (Math.abs(target - next) < Math.max(0.01, Math.abs(target) * 0.001)) {
        valueRef.current = target;
        setValue(target);
        return;
      }
      valueRef.current = next;
      setValue(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, factor, reduced]);
  return reduced ? target : value;
}

/** Which way a value moved through an ordered list. Empty until the first change. */
export function useSlideDirection(value: string | undefined, order: readonly string[]) {
  const previous = React.useRef(value);
  const [direction, setDirection] = React.useState<"" | "forward" | "back">("");
  React.useEffect(() => {
    const from = previous.current == null ? -1 : order.indexOf(previous.current);
    const to = value == null ? -1 : order.indexOf(value);
    if (from >= 0 && to >= 0 && from !== to) setDirection(to > from ? "forward" : "back");
    previous.current = value;
  }, [value, order]);
  return direction;
}

const sharedPositions = new Map<string, { left: number; top: number }>();

/**
 * An element that keeps its identity across states. When `layoutId` appears in a new
 * place, it travels from the old one. Reduced motion leaves it where it is.
 */
export function SharedElement({ layoutId, className, children }: { layoutId: string; className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const next = element.getBoundingClientRect();
    const previous = sharedPositions.get(layoutId);
    sharedPositions.set(layoutId, { left: next.left, top: next.top });
    if (!previous || reduced) return;
    const dx = previous.left - next.left;
    const dy = previous.top - next.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    element.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
      { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );
  });
  return (
    <span ref={ref} className={join("basalt-shared", className)} data-layout={layoutId}>
      {children}
    </span>
  );
}

/** Remounts its child so a tab or segment change can slide or, under reduced motion, fade. */
export function Slide({ direction, changeKey, children }: { direction: "" | "forward" | "back"; changeKey: string; children: React.ReactNode }) {
  return (
    <div key={changeKey} className="basalt-slide" data-direction={direction || undefined}>
      {children}
    </div>
  );
}

/**
 * Moves a spinner from one anchor to another. Call it when work is accepted and the
 * pending item now lives somewhere else. Reduced motion fades it in at the destination.
 */
export function TravelSpinner({
  active,
  fromRef,
  toRef,
  label = "Pending",
}: {
  active: boolean;
  fromRef: React.RefObject<HTMLElement | null>;
  toRef: React.RefObject<HTMLElement | null>;
  label?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  React.useLayoutEffect(() => {
    const element = ref.current;
    const from = fromRef.current?.getBoundingClientRect();
    const to = toRef.current?.getBoundingClientRect();
    if (!active || !element || !from || !to) return;
    const place = (box: DOMRect) => {
      element.style.left = `${box.left + box.width / 2}px`;
      element.style.top = `${box.top + box.height / 2}px`;
    };
    if (reduced) {
      place(to);
      return;
    }
    place(from);
    const animation = element.animate(
      [
        { left: `${from.left + from.width / 2}px`, top: `${from.top + from.height / 2}px`, opacity: 1 },
        { left: `${to.left + to.width / 2}px`, top: `${to.top + to.height / 2}px`, opacity: 1 },
      ],
      { duration: 320, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );
    return () => animation.cancel();
  }, [active, fromRef, toRef, reduced]);
  if (!active) return null;
  return (
    <span ref={ref} className="basalt-travel" data-reduced={reduced ? "" : undefined}>
      <Spinner label={label} />
    </span>
  );
}
