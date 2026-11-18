// The trend of a line as a plain function: no component, no hook, no import, and no `"use client"`, so a Server Component can compute it.

/**
 * The trailing mean of a run of readings (the trend of a line, DECISIONS 153, D7a): for each day, the mean of the readings in the `window` days ending on it.
 * A day has no trend until `min` readings (3, or the window if it is shorter) are in its window; one missing day between two readings keeps its trend, and two or
 * more in a row stop it. No readings, or one day, are fine: the result is `null`s, never NaN or Infinity.
 */
export function trailingMean(values: ReadonlyArray<number | null | undefined>, { window = 7, min = 3 }: { window?: number; min?: number } = {}): Array<number | null> {
  const span = Math.max(1, Math.floor(window));
  const need = Math.max(1, Math.min(Math.floor(min), span));
  const has = (i: number) => typeof values[i] === "number" && Number.isFinite(values[i]);
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let k = Math.max(0, i - span + 1); k <= i; k++) if (has(k)) { sum += values[k] as number; count++; }
    const alone = has(i) || (has(i - 1) && has(i + 1));
    return count >= need && alone ? sum / count : null;
  });
}
