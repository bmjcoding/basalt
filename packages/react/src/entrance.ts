import { glideTiming } from "./motion-timing";

// The entrance (DECISIONS 136 A; docs/motion.md, "The entrance"). One figure on a page's first screen may draw its marks once, at load,
// on a first visit: each mark over `duration-figure` on `ease-out`, `duration-stagger` apart, the step shrunk so every start falls within
// `duration-slow` of the first. A bar scales from its baseline, a line draws along its length, a mark fades in; nothing translates,
// clips or blurs. This module is the rule: when it applies, what is stored, the timing, and the animations of a figure's marks. The
// words, the numbers, the frame and every control are never part of it. Nothing here runs at import.

const STORAGE_PREFIX = "basalt-entrance:";
const SEEN = "seen";
/** A page whose script has not started within this many milliseconds of navigation draws the figure at rest. */
export const ENTRANCE_LATE_MS = 1000;

/** Why a figure is drawn at rest instead of entering. `"play"` means it enters. */
export type EntranceVerdict = "play" | "seen" | "reduced" | "held" | "hidden" | "below" | "late" | "print" | "off";

// The moment the page last changed without a reload, as `performance.now()` read it. Declared here, assigned by `markPageChange`, never at import.
let pageChangedAt: number | undefined;

/**
 * Tells the entrance that a page change began without a reload (a router's navigation). The same gates apply from then as for a loaded page:
 * a first visit to the path, on its first screen, within `ENTRANCE_LATE_MS` of the change. Call it where the router starts the change, before the new page's chart
 * mounts: `markPageChange()` for now, or the time `performance.now()` gave when the change began. An app that reports nothing is measured from the document's own start.
 * A path reached this way is stored as seen when its entrance finishes or gives way, as a loaded page's is.
 */
export function markPageChange(startedAt: number = performance.now()): void {
  pageChangedAt = startedAt;
}

/** The page's key in `localStorage`: `basalt-entrance:<path>`. */
export const entranceKey = (path?: string) => STORAGE_PREFIX + (path ?? (typeof location === "undefined" ? "/" : location.pathname));

/** Whether this page's entrance has been seen in this browser. Storage that is blocked reads as not seen. */
export function entranceSeen(path?: string): boolean {
  try { return localStorage.getItem(entranceKey(path)) === SEEN; } catch { return false; }
}

/** Stores the page as seen. The entrance calls it when it finishes or gives way, never before it plays. */
export function markEntranceSeen(path?: string): void {
  try { localStorage.setItem(entranceKey(path), SEEN); } catch { /* storage blocked: the next visit plays it again */ }
}

/** Forgets the page, so the next load plays the entrance again (the review pages' replay; an app never needs it). */
export function forgetEntrance(path?: string): void {
  try { localStorage.removeItem(entranceKey(path)); } catch { /* storage blocked */ }
}

/**
 * Whether the figure `element` may enter now. Everything that draws it at rest is here: a second visit, reduced motion, the root hold,
 * a hidden tab, a page opened below its first screen, a script that started late (measured from the page's start: the document's, or the change `markPageChange` reported), and print. (No script never gets here: the figure is
 * drawn at rest and nothing arms it.) `path` is the page's path, `location.pathname` by default.
 */
export function entranceVerdict(element: Element, path?: string, replay = false): EntranceVerdict {
  if (typeof window === "undefined") return "off";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
  if (window.matchMedia("print").matches) return "print";
  if (document.documentElement.getAttribute("data-loops") === "held") return "held";
  if (document.visibilityState === "hidden") return "hidden";
  // A replay (a review page's button) plays again whatever the page has seen and however late it is: it is never an app's first visit.
  if (replay) return "play";
  if (entranceSeen(path)) return "seen";
  if (performance.now() - (pageChangedAt ?? 0) > ENTRANCE_LATE_MS) return "late";
  const box = element.getBoundingClientRect();
  if (box.bottom <= 0 || box.top >= window.innerHeight) return "below";
  return "play";
}

/** The step between two marks starting: `duration-stagger`, shrunk so the last start falls within `duration-slow` of the first. */
export function entranceStep(count: number, stagger: number, spread: number): number {
  return count > 1 ? Math.min(stagger, spread / (count - 1)) : 0;
}

/** What an entrance animates. `bar` scales from its baseline, `line` draws along its length, `fade` fades in. */
export type EntranceKind = "bar" | "line" | "fade";

export interface EntranceMark {
  element: SVGElement | HTMLElement;
  kind: EntranceKind;
  /** A bar whose baseline is its top edge (a negative value) grows downward. */
  below?: boolean;
}

export interface EntranceRun {
  /** Settles when the last mark has finished (`true`) or the entrance gave way (`false`). */
  finished: Promise<boolean>;
  /** Settles when the entrance is over and every glide it handed over to has ended. */
  readonly settled: Promise<void>;
  /** The milliseconds from the first start to the last end, as authored (delay of the last plus its duration). */
  readonly span: number;
  /** The step actually used between starts, in ms. */
  readonly step: number;
  /** The figure's marks in the order they enter. */
  readonly marks: readonly EntranceMark[];
  /**
   * Input wins: a control used mid-entrance takes over. Every mark glides from where it is drawn to rest over `duration-slow` on
   * `ease-out`, and the visit counts as seen (`onDone` runs).
   */
  yield(): void;
  /** Settles everything at once, with no new animation: the entrance's own, and any glide `yield` started. The figure is at rest and the visit counts as seen (the root hold arrived, or printing began). */
  rest(): void;
  /** Cancels everything at once and leaves the figure at rest without storing the visit: the figure left the page before it had been seen. */
  cancel(): void;
}

interface Timing { figure: number; step: number; slow: number; curve: string; stagger: number }

function readTiming(): Timing {
  const style = getComputedStyle(document.documentElement);
  const ms = (name: string, fallback: number) => {
    const found = /^\s*([\d.]+)(ms|s)\s*$/.exec(style.getPropertyValue(name));
    return found ? Number(found[1]) * (found[2] === "s" ? 1000 : 1) : fallback;
  };
  const slow = glideTiming();
  return {
    figure: ms("--basalt-duration-figure", 600),
    stagger: ms("--basalt-duration-stagger", 22),
    slow: slow.duration,
    step: 0,
    curve: style.getPropertyValue("--basalt-ease-out").trim() || "cubic-bezier(0.16, 1, 0.3, 1)",
  };
}

const lengthOf = (path: SVGGeometryElement) => {
  try { return path.getTotalLength(); } catch { return 0; }
};

/**
 * Plays the entrance on `marks`, in order. Call it in the same frame the marks are first drawn (a layout effect), before paint: each
 * animation fills backwards, so the first frame already shows the first keyframe and nothing flashes at rest. It reads the tokens
 * itself, so reduced motion's collapse of `duration-figure` and `duration-stagger` reaches it.
 *
 * `onDone` runs once, when the entrance finished or gave way, and is where the page is stored as seen.
 */
export function playEntrance(marks: readonly EntranceMark[], onDone: () => void): EntranceRun {
  const timing = readTiming();
  const step = entranceStep(marks.length, timing.stagger, timing.slow);
  const animations: Array<{ mark: EntranceMark; animation: Animation; read: () => number; rest: () => void }> = [];
  let over = false;
  const done = (value: boolean, resolve: (v: boolean) => void) => { if (over) return; over = true; onDone(); resolve(value); };
  let settle: (value: boolean) => void = () => {};
  let resolveQuiet: (value: boolean) => void = () => {};
  const finished = new Promise<boolean>((resolve) => { settle = (v) => done(v, resolve); resolveQuiet = resolve; });

  marks.forEach((mark, index) => {
    const delay = index * step;
    const options: KeyframeAnimationOptions = { duration: timing.figure, delay, easing: timing.curve, fill: "backwards" };
    const element = mark.element;
    if (mark.kind === "bar") {
      // From its baseline: the bar's own box, with the origin on the baseline edge.
      const style = (element as SVGElement).style;
      style.transformBox = "fill-box";
      style.transformOrigin = mark.below ? "50% 0%" : "50% 100%";
      const animation = element.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], options);
      animations.push({
        mark, animation,
        read: () => { const t = getComputedStyle(element).transform; return !t || t === "none" ? 1 : new DOMMatrixReadOnly(t).d; },
        rest: () => { style.transformBox = ""; style.transformOrigin = ""; },
      });
    } else if (mark.kind === "line") {
      const path = element as unknown as SVGGeometryElement;
      const length = lengthOf(path);
      const style = (element as SVGElement).style;
      if (length <= 0) {
        const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], options);
        animations.push({ mark, animation, read: () => Number(getComputedStyle(element).opacity), rest: () => {} });
        return;
      }
      // The dash is one line long and the gap two, so the offset shows the line from its start up to a length; the offset past the
      // round cap (one stroke width) keeps the unlit line, caps included, off the page at the first frame.
      const cap = Number.parseFloat(getComputedStyle(element).strokeWidth) || 2;
      const start = length + cap * 2;
      style.strokeDasharray = `${length} ${length * 2}`;
      const animation = element.animate([{ strokeDashoffset: `${start}` }, { strokeDashoffset: "0" }], options);
      animations.push({
        mark, animation,
        read: () => Number.parseFloat(getComputedStyle(element).strokeDashoffset) / start,
        rest: () => { style.strokeDasharray = ""; style.strokeDashoffset = ""; },
      });
    } else {
      const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], options);
      animations.push({ mark, animation, read: () => Number(getComputedStyle(element).opacity), rest: () => {} });
    }
  });

  const last = marks.length ? (marks.length - 1) * step + timing.figure : 0;
  const complete = () => { animations.forEach(({ rest }) => rest()); settle(true); };
  if (!animations.length) complete();
  else {
    Promise.all(animations.map(({ animation }) => animation.finished)).then(complete, () => { /* gave way */ });
  }

  // The glides `yield` hands the marks to, so a hold or printing that arrives while they run can settle them too.
  const glides: Animation[] = [];
  const settled = finished.then(() => Promise.allSettled(glides.map((g) => g.finished))).then(() => undefined);

  return {
    finished,
    settled,
    span: last,
    step,
    marks,
    yield() {
      if (over) return;
      const { duration } = glideTiming();
      for (const item of animations) {
        const state = item.read();
        item.animation.cancel();
        const element = item.mark.element;
        // Where it is drawn now, to rest, over duration-slow on ease-out.
        if (item.mark.kind === "bar") {
          const back = element.animate([{ transform: `scaleY(${state})` }, { transform: "scaleY(1)" }], { duration, easing: timing.curve });
          glides.push(back);
          back.finished.then(() => item.rest(), () => item.rest());
        } else if (item.mark.kind === "line" && (element as SVGElement).style.strokeDasharray) {
          const start = Number.parseFloat((element as SVGElement).style.strokeDasharray) + (Number.parseFloat(getComputedStyle(element).strokeWidth) || 2) * 2;
          const back = element.animate([{ strokeDashoffset: `${state * start}` }, { strokeDashoffset: "0" }], { duration, easing: timing.curve });
          glides.push(back);
          back.finished.then(() => item.rest(), () => item.rest());
        } else {
          glides.push(element.animate([{ opacity: state }, { opacity: 1 }], { duration, easing: timing.curve }));
        }
      }
      settle(false);
    },
    rest() {
      // With the entrance already over (a glide is running), only the glides are left to settle.
      for (const glide of glides) glide.cancel();
      for (const item of animations) { item.animation.cancel(); item.rest(); }
      settle(false);
    },
    cancel() {
      if (over) return;
      over = true;
      for (const item of animations) { item.animation.cancel(); item.rest(); }
      resolveQuiet(false);
    },
  };
}
