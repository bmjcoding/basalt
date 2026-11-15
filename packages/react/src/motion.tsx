import * as React from "react";

import { Spinner } from "./spinner";

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

// ---- Glide ----

/** [x1, y1, x2, y2] of a cubic-bezier timing curve. */
export type Curve = readonly [number, number, number, number];
const EASE_OUT: Curve = [0.16, 1, 0.3, 1];
const SLOW_MS = 200;

/** The duration and curve a glide runs on are the stylesheet's `slow` and `ease-out`; these are only the fallback. */
export function glideTiming(): { duration: number; curve: Curve } {
  const style = getComputedStyle(document.documentElement);
  const time = /^\s*([\d.]+)(ms|s)\s*$/.exec(style.getPropertyValue("--basalt-duration-slow"));
  const bezier = /cubic-bezier\(([^)]+)\)/.exec(style.getPropertyValue("--basalt-ease-out"));
  const numbers = bezier?.[1]?.split(",").map(Number);
  return {
    duration: time ? Number(time[1]) * (time[2] === "s" ? 1000 : 1) : SLOW_MS,
    curve: numbers?.length === 4 && numbers.every(Number.isFinite) ? (numbers as unknown as Curve) : EASE_OUT,
  };
}

/** Progress (0 to 1) along a cubic-bezier curve at time `t` (0 to 1). */
export function bezier([x1, y1, x2, y2]: Curve, t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const at = (a: number, b: number, s: number) => 3 * a * (1 - s) * (1 - s) * s + 3 * b * (1 - s) * s * s + s * s * s;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (at(x1, x2, mid) < t) low = mid;
    else high = mid;
  }
  return at(y1, y2, (low + high) / 2);
}

export interface EasedOptions {
  /** A move away from what is drawn that grows (a new peak) can `snap` instead of easing, so it is never clipped. */
  growth?: "ease" | "snap";
  /** Hold what is drawn. Resuming eases on from where it stopped. */
  paused?: boolean;
}

/**
 * The glide, with its options. Time-based on the stylesheet's `slow` and `ease-out`, so it takes as long
 * on a 60Hz and a 120Hz screen, and a new target restarts from what is on screen. Reduced motion snaps.
 * Internal: `useGlide` and Sparkline are what the package exports.
 */
export function useEased(target: number, { growth = "ease", paused = false }: EasedOptions = {}) {
  const reduced = useReducedMotion();
  const [value, setValue] = React.useState(target);
  const shown = React.useRef(target);
  React.useEffect(() => {
    const snap = reduced || (growth === "snap" && target >= shown.current);
    if (snap || shown.current === target) {
      // Paused only holds an ease: a snap still lands, so what is drawn is never stale or clipped.
      shown.current = target;
      setValue(target);
      return;
    }
    if (paused) return;
    const from = shown.current;
    const { duration, curve } = glideTiming();
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      shown.current = t >= 1 ? target : from + (target - from) * bezier(curve, t);
      setValue(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, growth, paused]);
  return reduced ? target : value;
}

/**
 * The same glide for a list of samples (Sparkline's line): each sample that had a place travels to its new value; one with no previous
 * place is simply there. `paused` holds what is drawn, and resuming continues from it. `snap` lands the new samples at once, for a
 * change something else is already easing (the line rising out of its loading state). Equivalent samples in a fresh array change
 * nothing, so a parent that rebuilds its data while the line travels does not restart or stall it. Reduced motion snaps.
 */
export function useEasedSamples(target: readonly number[], { paused = false, snap = false }: { paused?: boolean; snap?: boolean } = {}) {
  const reduced = useReducedMotion();
  const key = target.join(",");
  const [value, setValue] = React.useState<readonly number[]>(target);
  const shown = React.useRef<readonly number[]>(target);
  const latest = React.useRef({ target, snap });
  latest.current = { target, snap };
  React.useEffect(() => {
    const goal = latest.current.target;
    const land = () => { shown.current = goal; setValue(goal); };
    if (shown.current.join(",") === key) return undefined;
    if (paused) return undefined;
    if (reduced || latest.current.snap) { land(); return undefined; }
    const from = shown.current;
    const { duration, curve } = glideTiming();
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) { land(); return; }
      const eased = bezier(curve, t);
      shown.current = goal.map((v, i) => (from[i] === undefined ? v : from[i] + (v - from[i]) * eased));
      setValue(shown.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, paused, reduced]);
  return reduced ? target : value;
}

/**
 * Eases toward `target` over `slow` on `ease-out`, the same motion as everything else that answers a
 * change. Reduced motion snaps. Give screen readers `target`, not this in-between value.
 */
export function useGlide(target: number) {
  return useEased(target);
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

/**
 * Wraps a tab or segment panel so a change can slide it in or, under reduced motion, fade it.
 * The wrapper is never re-keyed: it is the same node before and after, so a field inside keeps
 * its value and focus. The change replays the animation on that node.
 */
export function Slide({ direction, changeKey, children }: { direction: "" | "forward" | "back"; changeKey: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const shown = React.useRef(changeKey);
  React.useLayoutEffect(() => {
    if (shown.current === changeKey) return;
    shown.current = changeKey;
    const element = ref.current;
    if (!element) return;
    // Drop the animation, flush style, and restore it: the same node starts again from the top.
    element.style.animation = "none";
    void element.offsetWidth;
    element.style.animation = "";
  }, [changeKey]);
  return (
    <div ref={ref} className="basalt-slide" data-direction={direction || undefined}>
      {children}
    </div>
  );
}

/**
 * Moves a spinner from one anchor to another. Opt in, and use it only when work is accepted and the
 * pending item now lives somewhere else: it is the one move between two resting places that the eye has
 * to follow. It travels by transform on `slower` and `ease-in-out`. Under reduced motion it does not
 * travel: it appears at the destination with a short fade.
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
  React.useLayoutEffect(() => {
    const element = ref.current;
    const from = fromRef.current?.getBoundingClientRect();
    const to = toRef.current?.getBoundingClientRect();
    if (!active || !element || !from || !to) return;
    // The stylesheet runs the move (and the reduced-motion fade); this only says where from and to are.
    element.style.setProperty("--_from-x", `${from.left + from.width / 2}px`);
    element.style.setProperty("--_from-y", `${from.top + from.height / 2}px`);
    element.style.setProperty("--_to-x", `${to.left + to.width / 2}px`);
    element.style.setProperty("--_to-y", `${to.top + to.height / 2}px`);
  }, [active, fromRef, toRef]);
  if (!active) return null;
  return (
    <span ref={ref} className="basalt-travel">
      <Spinner label={label} />
    </span>
  );
}
