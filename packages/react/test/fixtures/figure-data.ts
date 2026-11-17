// Synthetic data for the lit figures, the phase chart and N1's figures: made-up weights, steps, nights, sessions and calls. Nothing here is real, and
// nothing is health data: the numbers come from a seeded generator. Days end on 10 November 2026.

import type { CoverageDay } from "../../src/coverage-strip";
import type { PhaseCall } from "../../src/phase-chart";
import { isoDay, lastDays } from "./chart-data";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lb = (value: number) => `${value.toFixed(1)} lb`;

export interface WeightData { days: string[]; values: Array<number | null>; reasons: Array<string | null> }

/**
 * Daily readings that drift down with noise, with gaps: one day alone (it keeps its trend), two in a row (the trend stops there), and a run of three. `count` is a
 * whole number of weeks for the phase chart (84 is twelve).
 */
export function weightData(count = 84, { gaps = true }: { gaps?: boolean } = {}): WeightData {
  const days = lastDays(count);
  const r = rng(7);
  const values: Array<number | null> = [];
  const reasons: Array<string | null> = [];
  for (let i = 0; i < count; i++) {
    const level = 82 - (i / count) * 3.4 + (r() - 0.5) * 1.1;
    values.push(Math.round(level * 10) / 10);
    reasons.push(null);
  }
  if (gaps) {
    const lose = (from: number, length: number, why: string) => { for (let k = from; k < from + length && k < count; k++) { values[k] = null; reasons[k] = why; } };
    lose(Math.floor(count * 0.25), 1, "scale not used");
    lose(Math.floor(count * 0.5), 2, "travel");
    lose(Math.floor(count * 0.75), 3, "scale not used");
  }
  return { days, values, reasons };
}

/** Twelve weeks of choices: most hold, some change the plan. */
export function calls(count = 12): PhaseCall[] {
  const words = ["Hold", "Hold", "Raise", "Hold", "Hold", "Lower", "Hold", "Hold", "Raise", "Hold", "Hold", "Hold"];
  return Array.from({ length: count }, (_, i) => {
    const word = words[i % words.length] as string;
    return { word, changed: word !== "Hold", text: word === "Hold" ? "No change to the plan this week." : `${word === "Raise" ? "Raised" : "Lowered"} the daily target by one step.` };
  });
}

/** A run of daily readings for a marks row, with a rest day and a day nobody recorded. */
export function marksData(kind: "columns" | "pills" | "blocks", count = 7): Array<number | null> {
  const r = rng(kind === "columns" ? 3 : kind === "pills" ? 5 : 9);
  const cap = kind === "columns" ? 12000 : kind === "pills" ? 540 : 90;
  return Array.from({ length: count }, (_, i) => {
    if (i === 2) return null;
    if (i === 4) return 0;
    return Math.round(cap * (0.35 + 0.6 * r()));
  });
}
export const MARKS_CAP = { columns: 12000, pills: 540, blocks: 90 } as const;

/** A coverage strip's days: every day recorded but a short run and one more. */
export function coverageDays(count = 84, missing: number[] = [12, 13, 14, 40, 70, 71]): CoverageDay[] {
  return lastDays(count).map((date, i) => ({ date, recorded: !missing.includes(i), why: missing.includes(i) ? (i < 20 ? "watch not worn" : "no reading") : null }));
}

export const ISO_END = isoDay(Date.UTC(2026, 10, 10));
