// How core glyphs change into each other. The council allowed only these morphs (DECISIONS items 38, 54):
//   - rest <-> selected of one glyph, where the opening closes into the fill;
//   - a rotation group (the four arrows, the four chevrons, plus and close), which turns;
//   - the drawn pairs menu <-> close, play <-> pause, copy <-> check and chevron-down <-> download, both ways.
// Every other change swaps at once: there are no neighbour morphs.
//
// A morph in flight keeps its identity: the two settled drawings it runs between, its kind, and how far along it is.
// What is on screen is always `between(from, to, e)`, so an interruption is judged against the flight, not against the
// in-between drawing, and the allow-list cannot be got round:
//   - a request for the target it is heading to does nothing;
//   - a request for the drawing it left runs back along the same path (a turn turns back; it never deforms);
//   - a request for another member of the rotation group it is turning in turns on from the angle on screen;
//   - anything else swaps at once.
// Reduced motion swaps at once.

import { settle, turn } from "./glyph";
import type { Drawing, GlyphData, GlyphSlot } from "./glyph";

/** A drawing together with which glyph it is a drawing of. */
export interface Endpoint extends Drawing {
  readonly name: string;
  readonly group: string | null;
}

export function endpointOf(data: GlyphData, selected: boolean): Endpoint {
  return { ...settle(data, selected), name: data.name, group: data.group ?? null };
}

/** The identity of a settled state: the glyph and whether it is selected. */
export const keyOf = (data: GlyphData, selected: boolean) => `${data.name}${selected ? ":selected" : ""}`;

export type MorphKind = "same" | "group" | "pair";

interface Pair {
  /** For each slot of the first glyph, the slot of the second it travels to. Absent: slot to the same slot. */
  readonly map?: readonly number[];
}

/** The drawn pairs, written first glyph > second. Built when asked, so loading this module does nothing. */
function pairs(): Readonly<Record<string, Pair>> {
  return {
    "menu>close": { map: [0, 2, 1, 3, 4, 5, 6, 7] },
    "play>pause": {},
    "copy>check": {},
    "chevron-down>download": {},
  };
}

/** The glyph names that morph into each other, in either direction: the drawn pairs, as [a, b]. */
export function drawnPairs(): ReadonlyArray<readonly [string, string]> {
  return Object.keys(pairs()).map((key) => key.split(">") as unknown as [string, string]);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpSlot = (a: GlyphSlot, b: GlyphSlot, t: number) => a.map((v, i) => lerp(v, b[i] as number, t)) as unknown as GlyphSlot;
const middle = (s: GlyphSlot): GlyphSlot => {
  const x = (s[0] + s[6]) / 2;
  const y = (s[1] + s[7]) / 2;
  return [x, y, x, y, x, y, x, y, 0];
};
const reversed = (s: GlyphSlot): GlyphSlot => [s[6], s[7], s[4], s[5], s[2], s[3], s[0], s[1], s[8]];

/** The slots of two different drawings, paired and eased to `e`: through the pair's map, nearer ends first, arrivals and departures from their middles. */
function pairUp(from: readonly GlyphSlot[], to: readonly GlyphSlot[], map: readonly number[] | undefined, e: number) {
  return from.map((p, i) => {
    let q = (map ? to[map[i] as number] : to[i]) as GlyphSlot;
    if (p[8] > 0 && q[8] > 0) {
      const d1 = Math.hypot(p[0] - q[0], p[1] - q[1]) + Math.hypot(p[6] - q[6], p[7] - q[7]);
      const d2 = Math.hypot(p[0] - q[6], p[1] - q[7]) + Math.hypot(p[6] - q[0], p[7] - q[1]);
      if (d2 < d1 - 1e-6) q = reversed(q);
    } else if (p[8] > 0) q = middle(p);
    else if (q[8] > 0) p = middle(q);
    return lerpSlot(p, q, e);
  });
}

/** The drawing between two endpoints at eased progress `e` (0 to 1). */
export function between(a: Endpoint, b: Endpoint, e: number, pair: Pair | null): Drawing {
  const f = lerp(a.f, b.f, e);
  const { loops, knock, cut, evenodd } = b;
  if (a.name === b.name) return { slots: a.slots.map((s, i) => lerpSlot(s, b.slots[i] as GlyphSlot, e)), angle: b.angle, f, loops, knock, cut, evenodd };
  // the shortest way round
  if (a.group && a.group === b.group) return { slots: b.slots, angle: a.angle + (((b.angle - a.angle + 540) % 360) - 180) * e, f, loops, knock, cut, evenodd };
  return { slots: pairUp(a.slots.map((s) => turn(s, a.angle)), b.slots.map((s) => turn(s, b.angle)), pair?.map, e), angle: 0, f, loops: [], knock: [] };
}

/** Set up a morph: how it runs from `from` to `target`. A pair drawn one way runs the other way by permuting the source. */
export function prepare(from: Endpoint, target: Endpoint): { kind: MorphKind | null; from: Endpoint; pair: Pair | null } {
  if (from.name === target.name) return { kind: "same", from, pair: null };
  if (from.group && from.group === target.group) return { kind: "group", from, pair: null };
  const table = pairs();
  const forward = table[`${from.name}>${target.name}`];
  const back = table[`${target.name}>${from.name}`];
  if (forward) return { kind: "pair", from, pair: forward };
  if (!back) return { kind: null, from, pair: null };
  const turned = from.slots.map((s) => turn(s, from.angle));
  const permuted = back.map ? back.map.map((j) => turned[j] as GlyphSlot) : turned;
  return { kind: "pair", from: { slots: permuted, angle: 0, f: from.f, loops: [], knock: [], group: null, name: from.name }, pair: null };
}

export interface MorphClock {
  now(): number;
  raf(fn: (now: number) => void): number;
  caf(id: number): void;
}

interface Flight {
  readonly kind: MorphKind;
  readonly from: Endpoint;
  readonly to: Endpoint;
  readonly pair: Pair | null;
  /** Keys of the two settled states the flight runs between. `fromKey` is null for a turn begun mid-flight. */
  readonly fromKey: string | null;
  readonly toKey: string;
  readonly fromSettled: Endpoint | null;
  /** Eased progress, 0 (at `from`) to 1 (at `to`). */
  e: number;
  /** Where it is heading now: 1 for `to`, 0 for `from`. */
  heading: 0 | 1;
}

export interface MorphStatus {
  readonly key: string;
  readonly moving: boolean;
  readonly kind: MorphKind | null;
  readonly e: number | null;
}

export interface MorphController {
  /** Show a glyph, selected or not, morphing from what is on screen if the council allowed that morph. */
  go(data: GlyphData, selected: boolean, options: { duration: number; ease(t: number): number; reduced: boolean }): void;
  status(): MorphStatus;
  /** Stop any frame. */
  stop(): void;
}

/**
 * A morph's state machine. `draw` is called with each drawing to show; `clock` is the page's, or a virtual one in tests.
 * `start` is what is on screen first.
 */
export function createMorph(start: Endpoint, startKey: string, draw: (drawing: Drawing) => void, clock: MorphClock): MorphController {
  let current = start;
  let key = startKey;
  let flight: Flight | null = null;
  let frame = 0;

  const stop = () => {
    if (frame) clock.caf(frame);
    frame = 0;
  };
  const arrive = (endpoint: Endpoint, k: string) => {
    flight = null;
    current = endpoint;
    key = k;
    draw(endpoint);
  };

  /** Run a flight from its progress to `end` (1 forward, 0 back), over the share of the duration left. */
  const run = (f: Flight, end: 0 | 1, duration: number, ease: (t: number) => number) => {
    flight = f;
    f.heading = end;
    const e0 = f.e;
    const span = Math.abs(end - e0);
    const total = duration * span;
    const began = clock.now();
    const done = () => (end === 1 ? arrive(f.to, f.toKey) : arrive(f.fromSettled as Endpoint, f.fromKey as string));
    if (span < 1e-6) return done();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / total);
      f.e = e0 + (end - e0) * ease(t);
      if (t < 1) {
        draw(between(f.from, f.to, f.e, f.pair));
        frame = clock.raf(step);
      } else {
        frame = 0;
        done();
      }
    };
    frame = clock.raf(step);
  };

  return {
    go(data, selected, { duration, ease, reduced }) {
      const target = endpointOf(data, selected);
      const targetKey = keyOf(data, selected);
      const fl = flight;
      // A request for where it is already heading changes nothing: the ease-out is not restarted.
      if (fl && !reduced && duration > 0 && targetKey === (fl.heading === 1 ? fl.toKey : fl.fromKey)) return;
      stop();
      if (reduced || !duration) return arrive(target, targetKey);
      if (fl) {
        if (targetKey === fl.toKey) return run(fl, 1, duration, ease);
        if (targetKey === fl.fromKey) return run(fl, 0, duration, ease);
        if (fl.kind === "group" && target.group && target.group === fl.to.group) {
          const d = between(fl.from, fl.to, fl.e, fl.pair);
          const here: Endpoint = { ...d, slots: fl.to.slots, group: fl.to.group, name: `~${fl.to.name}` };
          return run({ kind: "group", from: here, to: target, pair: null, fromKey: null, toKey: targetKey, fromSettled: null, e: 0, heading: 1 }, 1, duration, ease);
        }
        return arrive(target, targetKey);
      }
      if (targetKey === key) return arrive(target, targetKey);
      const prep = prepare(current, target);
      if (!prep.kind) return arrive(target, targetKey);
      run({ kind: prep.kind, from: prep.from, to: target, pair: prep.pair, fromKey: key, toKey: targetKey, fromSettled: current, e: 0, heading: 1 }, 1, duration, ease);
    },
    status: () => ({ key, moving: !!flight, kind: flight ? flight.kind : null, e: flight ? flight.e : null }),
    stop,
  };
}

