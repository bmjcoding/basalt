// The glide's timing as plain functions: what a glide runs on (read from the stylesheet's `slow` and `ease-out`) and a cubic-bezier's progress. No component and no hook,
// so the modules that only need the numbers (the entrance's player, a server-safe formatter) do not pull in React with them.

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
