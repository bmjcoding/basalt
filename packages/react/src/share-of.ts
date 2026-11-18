// The shares of a `ShareBar` as a plain function: no component, no hook, no import, and no `"use client"`, so a Server Component can compute them.

/** Whole-percent shares that add to exactly 100 (the largest remainders take the rounding). A part of nothing is 0, and no parts at all is no shares. */
export function shareOf(values: ReadonlyArray<number>): number[] {
  const positive = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return positive.map(() => 0);
  const exact = positive.map((value) => (value / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) { if (left <= 0) break; if (positive[index]! > 0) { floors[index]! += 1; left -= 1; } }
  return floors;
}
