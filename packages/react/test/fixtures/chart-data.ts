// Synthetic data for the chart's tests and its review round: a made-up person's sleep and training. Nothing here is real, and
// nothing is health data: the numbers come from a seeded generator. Days end on 10 November 2026.

import type { ChartPlan, ChartSeries } from "../../src/chart";

const DAY = 86_400_000;
const END = Date.UTC(2026, 10, 10);

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The last `count` days, oldest first, as ISO dates. */
export function lastDays(count: number, end = END) {
  return Array.from({ length: count }, (_, i) => isoDay(end - (count - 1 - i) * DAY));
}

const indexOf = (days: string[], month: number, day: number): number => days.indexOf(isoDay(Date.UTC(2026, month - 1, day)));

export const hm = (minutes: number) => {
  let h = Math.floor(minutes / 60);
  let m = Math.round(minutes - h * 60);
  if (m === 60) { h += 1; m = 0; }
  return m ? `${h} h ${m} m` : `${h} h`;
};
export const hmSpoken = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return `${h} ${h === 1 ? "hour" : "hours"}${m ? ` ${m} ${m === 1 ? "minute" : "minutes"}` : ""}`;
};
export const min = (v: number) => `${Math.round(v)} min`;
export const minSpoken = (v: number) => `${Math.round(v)} minutes`;

export interface SleepData { days: string[]; series: ChartSeries[]; plan: ChartPlan }

/** Two devices' sleep (minutes) against a plan band, with a one-device gap (the watch, travelling) and an every-device gap. */
export function sleepData(count = 28, { late = false, third = false }: { late?: boolean; third?: boolean } = {}): SleepData {
  const days = lastDays(count);
  const r = rng(11);
  const ring: Array<number | null> = [];
  const watch: Array<number | null> = [];
  const patch: Array<number | null> = [];
  const ringWhy: Array<string | null> = [];
  const watchWhy: Array<string | null> = [];
  const patchWhy: Array<string | null> = [];
  const band: Array<[number, number] | null> = [];
  const total = 90;
  const all = lastDays(total);
  for (let i = 0; i < total; i++) {
    let base = 442 + 26 * Math.sin(i / 4.3) + (r() - 0.5) * 64;
    if (new Date(all[i] as string).getUTCDay() === 6) base += 24;
    const v = Math.round(Math.max(318, Math.min(556, base)));
    ring.push(v); watch.push(Math.round(v - 9 + (r() - 0.5) * 26)); patch.push(Math.round(v + 6 + (r() - 0.5) * 22));
    ringWhy.push(null); watchWhy.push(null); patchWhy.push(null);
    band.push(i < all.indexOf("2026-11-01") ? [420, 540] : [450, 540]);
  }
  const miss = (values: Array<number | null>, why: Array<string | null>, from: [number, number], to: [number, number], reason: string) => {
    for (let k = indexOf(all, from[0], from[1]); k <= indexOf(all, to[0], to[1]); k++) { values[k] = null; why[k] = reason; }
  };
  miss(ring, ringWhy, [9, 15], [9, 16], "ring charging");
  miss(watch, watchWhy, [10, 26], [10, 28], "not worn, travel");
  miss(ring, ringWhy, [11, 3], [11, 3], "no device synced");
  miss(watch, watchWhy, [11, 3], [11, 3], "no device synced");
  miss(patch, patchWhy, [11, 3], [11, 3], "no device synced");
  if (late) {
    const k = indexOf(all, 11, 3);
    ring[k] = 408; watch[k] = 400; patch[k] = 412; ringWhy[k] = watchWhy[k] = patchWhy[k] = null;
  }
  const from = total - count;
  const series: ChartSeries[] = [
    { id: "ring", name: "Ring", values: ring.slice(from), reasons: ringWhy.slice(from) },
    { id: "watch", name: "Watch", values: watch.slice(from), reasons: watchWhy.slice(from) },
  ];
  if (third) series.push({ id: "patch", name: "Patch", values: patch.slice(from), reasons: patchWhy.slice(from) });
  return { days, series, plan: { kind: "band", values: band.slice(from) } };
}

export interface TrainingData { days: string[]; series: ChartSeries[]; plan: ChartPlan; partial: number }

/** Training minutes against a per-day plan, with a whole-slot gap, a rest day and a day that isn't final. */
export function trainingData(count = 28, { late = false }: { late?: boolean } = {}): TrainingData {
  const total = 90;
  const all = lastDays(total);
  const r = rng(5);
  const values: Array<number | null> = [];
  const why: Array<string | null> = [];
  const plan: Array<number | null> = [];
  const notes: Array<string | null> = [];
  for (let i = 0; i < total; i++) {
    const wd = new Date(all[i] as string).getUTCDay();
    const second = i >= all.indexOf("2026-11-02");
    const p = wd === 1 ? null : wd === 6 ? (second ? 100 : 90) : wd === 0 ? 45 : second ? 60 : 50;
    plan.push(p); why.push(null); notes.push(p == null ? "Rest day" : null);
    values.push(p == null ? (r() < 0.35 ? Math.round(15 + r() * 15) : 0) : Math.round(p * (0.78 + r() * 0.38)));
  }
  const gaps: Array<{ from: [number, number]; to: [number, number]; reason: string }> = [
    { from: [10, 26], to: [10, 28], reason: "watch not worn, travel" },
    { from: [11, 3], to: [11, 3], reason: "no device synced" },
  ];
  for (const { from: a, to: b, reason } of gaps) {
    for (let k = indexOf(all, a[0], a[1]); k <= indexOf(all, b[0], b[1]); k++) { values[k] = null; why[k] = reason; }
  }
  values[total - 1] = 34;
  if (late) values[indexOf(all, 11, 3)] = 142;
  const from = total - count;
  return {
    days: all.slice(from),
    series: [{ id: "training", name: "Training", values: values.slice(from), reasons: why.slice(from) }],
    plan: { kind: "value", values: plan.slice(from), notes: notes.slice(from) },
    partial: count - 1,
  };
}
