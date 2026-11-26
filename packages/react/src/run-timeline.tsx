import * as React from "react";

import { REFLOW_BOUND } from "./constants";
import { DotSep } from "./dot-sep";
import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { ChevronUpGlyph } from "./glyphs/chevron-up";
import { Icon } from "./icon";
import { useLoops } from "./loops";
import { useReducedMotion } from "./motion";
import { STAGE_WORDS } from "./run-format";
import type { Moment, RunTimeGrain, RunTimeScale, StageState } from "./run-format";
import { rendered, useFocusHome } from "./run-stage";
import { RunTimer, useRunTimeScale } from "./run-timer";
import { warnRun } from "./run-warn";
import { StageMark } from "./stage-mark";
import { TextButton } from "./text-button";
import type { IconComponent } from "./types";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- A run's own view (DECISIONS 316, 1.8): an append-only list of steps, a sentence each, and the counter ----
// The newest `keep` steps stay in full; a finished step older than those rolls into the tail above, a compact row whose ink recedes a step for each
// row older (the one named exception to 4.5:1: the toggle above the tail opens the whole record in full ink). A step that is running, retrying or
// waiting never rolls, and nothing after it does. The window is the list's scrolling box: its floor holds `keep` rows and two and a half tail rows
// from the first frame and only grows; it follows new steps only while the reader is at its end, holds still while a control in it has focus or the
// pointer, and starts at its end. A roll moves the rows inside the window by transform; past REFLOW_BOUND counted rows it lands at once. Its top
// edge fades the tail row it cuts, from the second step (DECISIONS 337). Nothing here speaks: the run's `RunAnnouncer` does.

export interface RunStepProps {
  /** The step's state; left out, the step is a finding (its own `mark`), and counts as finished. */
  state?: StageState;
  /** The app's own icon for a step with no state, at 16 in secondary ("a finding"). */
  mark?: IconComponent;
  /** The state's word when the app's differs ("Waiting for approval", "Retrying, 2 of 3"), or a finding's ("Finding"). It is drawn. */
  word?: string;
  /** The sentence: what the step did or is doing. `code` in it is Geist Mono at the row's own size. */
  children: React.ReactNode;
  /** The step's result, before its time in the meta ("84 lines", "High confidence"). */
  meta?: React.ReactNode;
  start?: Moment;
  end?: Moment;
  /** Writes the step's time, in a full step and a tail row (see `RunTimer`'s `format`): its seat's width follows it. */
  format?: (ms: number, grain: RunTimeGrain) => string;
  /** Says the step's time, when the drawn form is short for the ear (see `RunTimer`'s `spoken`). */
  spoken?: (ms: number, grain: RunTimeGrain) => string;
  /** What is drawn under a full step, never behind a disclosure: a command to approve, a reason. Hidden in the tail. */
  detail?: React.ReactNode;
  /** The step's action ("Approve"): a `Button` whose `onClick` returns the app's promise. */
  action?: React.ReactNode;
  className?: string;
}

export interface RunTimelineProps {
  /** Names the list ("INC-0042 agent steps"). */
  label: string;
  /** How many of the newest steps stay in full: a whole number of 1 or more, 3 when left out. `false` is no counter: the whole record in full. */
  keep?: number | false;
  /** The window's floor in rows, for steps the app knows are taller (left out, `keep`). */
  minRows?: number;
  /** One scale for every step's time (see `RunTimer`). */
  timeScale?: RunTimeScale;
  /** Whether the tail is open (the whole record in full form). Controlled with `onOpenChange`, or start from `defaultOpen`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The toggle's words. Left out: "Show 5 earlier steps", "Show 5 earlier steps, 1 failed, 1 warning", and open, "Hide earlier steps". `warned` counts the rolled steps that ended with a warning. */
  toggleLabel?: (earlier: number, failed: number, open: boolean, warned: number) => string;
  className?: string;
  /** `RunStep` rows, oldest first, append-only. */
  children: React.ReactNode;
}

/** Running, retrying, waiting (queued) and not started (idle) never roll, and nothing after them does. */
const unfinished = (state: StageState | undefined) => state === "idle" || state === "queued" || state === "running" || state === "retrying";
/** Drawn in a full step: every state's word but running's and passed's, and any word the app gives. */
const DRAWN_FULL: Record<StageState, boolean> = { idle: true, queued: true, running: false, success: false, failed: true, skipped: true, canceled: true, retrying: true, warning: true };
/** Drawn in a tail row: failed, skipped, canceled and warning (idle, queued, running and retrying never roll), and any word the app gives. */
const DRAWN_TAIL: Record<StageState, boolean> = { idle: false, queued: false, running: false, success: false, failed: true, skipped: true, canceled: true, retrying: false, warning: true };

interface StepPlace { tail: boolean; depth: number }
const StepPlaceContext = React.createContext<StepPlace>({ tail: false, depth: 0 });

const defaultToggle = (earlier: number, failed: number, open: boolean, warned: number) =>
  open ? "Hide earlier steps" : `Show ${earlier} earlier ${earlier === 1 ? "step" : "steps"}${failed ? `, ${failed} failed` : ""}${warned ? `, ${warned} ${warned === 1 ? "warning" : "warnings"}` : ""}`;

/** One step of a run. See `RunTimeline`. */
export function RunStep({ state, mark, word, children, meta, start, end, format, spoken, detail, action, className }: RunStepProps) {
  const { tail, depth } = React.useContext(StepPlaceContext);
  const said = word ?? (state ? STAGE_WORDS[state] : undefined);
  const drawn = word !== undefined || (state !== undefined && (tail ? DRAWN_TAIL : DRAWN_FULL)[state]);
  const sentence = React.useRef<HTMLSpanElement>(null);
  const hasAction = rendered(action);
  const hasDetail = rendered(detail) || hasAction;
  const track = useFocusHome(hasDetail ? (hasAction ? 2 : 1) : 0, sentence);
  return (
    <li className={join("basalt-run-step", className)} data-state={state} data-tail={tail ? "" : undefined} data-depth={tail ? Math.min(depth, 5) : undefined} data-word={drawn ? "" : undefined}>
      <div className="basalt-run-step-line">
        <span className="basalt-run-step-mark">{state ? <StageMark state={state} /> : mark ? <Icon icon={mark} size={16} /> : null}</span>
        <span className="basalt-run-step-sentence" ref={sentence} tabIndex={-1}>
          {drawn ? <><span className="basalt-run-step-word">{said}</span>{" "}</> : said ? <span className="basalt-visually-hidden">{said}: </span> : null}
          {children}
        </span>
        {meta !== undefined || state !== undefined ? (
          <span className="basalt-run-step-meta">
            {meta !== undefined ? <span className="basalt-run-step-result">{meta}</span> : null}
            {meta !== undefined && state !== undefined ? <DotSep spaced className="basalt-run-step-dot" /> : null}
            {state !== undefined ? <RunTimer start={start} end={end} format={format} spoken={spoken} whenHeld="hidden" /> : null}
          </span>
        ) : null}
      </div>
      {hasDetail ? (
        <div className="basalt-run-step-detail" hidden={tail || undefined} data-focus-home="" {...track}>
          {detail}
          {hasAction ? <div className="basalt-run-step-action">{action}</div> : null}
        </div>
      ) : null}
    </li>
  );
}

/** Reads a duration token off an element, in milliseconds (the script never writes its own number). */
const tokenMs = (el: Element, name: string) => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000;
};

/**
 * A run's steps, a sentence each, with the counter (DECISIONS 316, 1.8). See the module note. Open (the toggle, `open`, or `keep={false}`), it is the
 * whole record in full form: no floor, no window, no tail.
 */
export function RunTimeline({ label, keep: keepProp, minRows, timeScale = "seconds", open: openProp, defaultOpen = false, onOpenChange, toggleLabel = defaultToggle, className, children }: RunTimelineProps) {
  let keep: number | false = keepProp === undefined ? 3 : keepProp;
  if (keep !== false && !(Number.isInteger(keep) && keep >= 1)) {
    if (process.env.NODE_ENV !== "production") warnRun("RunTimeline", `\`keep\` is a whole number of 1 or more, or false; ${String(keepProp)} is read as 3.`);
    keep = 3;
  }
  const counter = keep !== false;
  const { provide } = useRunTimeScale(timeScale);
  const { held: loopsHeld } = useLoops();
  const reduced = useReducedMotion();
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => { if (openProp === undefined) setOpenState(next); onOpenChange?.(next); };

  const steps = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<RunStepProps>[];
  // The tail: the oldest steps, unbroken, each finished, older than the newest `keep`.
  let rolled = 0;
  if (counter) for (let i = 0; i < steps.length - (keep as number) && !unfinished(steps[i]!.props.state); i += 1) rolled = i + 1;
  const tailShown = counter && !open;
  // The floor's row count is the larger of `keep` and `minRows` (DECISIONS 316, ruling 11).
  const floorRows = counter ? Math.max(keep as number, minRows ?? 0, 1) : 0;

  const windowRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLOListElement>(null);
  const toggleId = React.useId();
  const listId = React.useId();

  // ---- following the end: read from the window's own geometry, never from a timer
  const following = React.useRef(true);
  // The control a reader is using (under the pointer, or focused): while there is one the window holds it still and does not follow.
  const hovered = React.useRef<Element | null>(null);
  const focused = React.useRef<Element | null>(null);
  const held = () => { const c = hovered.current ?? focused.current; return c?.isConnected ? c : null; };
  // While a control is in use nothing rolls (a roll would move it); what arrives lands below, and the roll comes when the reader leaves it.
  const [, release] = React.useReducer((n: number) => n + 1, 0);
  const lastRolled = React.useRef(0);
  if (held() && rolled > lastRolled.current) rolled = lastRolled.current;
  lastRolled.current = rolled;
  const failed = steps.slice(0, rolled).filter((step) => step.props.state === "failed").length;
  const warned = steps.slice(0, rolled).filter((step) => step.props.state === "warning").length;
  // Whether the reader is at the end is theirs to say: a scroll the window made itself (following, or keeping a control still) and a scroll
  // while a roll is in flight (its transforms are clipped, but its rows are still landing) never change it. A reader's scroll does, read
  // from geometry when it happens, and so does a scroll the reader made in the same task as an arrival (read just before the change).
  const lastSet = React.useRef<number | null>(null);
  const rolling = React.useRef(0);
  const atEnd = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight <= 2;
  const onScroll = () => {
    edge();
    const el = windowRef.current;
    if (!el || rolling.current > 0) return;
    if (lastSet.current !== null && Math.abs(el.scrollTop - lastSet.current) < 1) return;
    following.current = atEnd(el);
    lastSet.current = null;
  };
  const setTop = (el: HTMLElement, top: number) => { el.scrollTop = top; lastSet.current = el.scrollTop; };
  const toEnd = React.useCallback(() => {
    const el = windowRef.current;
    if (el && following.current && !held()) setTop(el, el.scrollHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- the top edge (DECISIONS 337): the one finished tail row at depth 2 or deeper that the window's top edge cuts through its words fades
  // over the part that shows. Read from layout (offsetTop ignores a roll's transforms): the row, `data-cut` and `--_cut` (its visible height) are
  // written on it and taken off the row that had them, or off every row. The stylesheet admits only such a row, outside a roll and outside more
  // contrast, forced colours and print; everything else keeps the hard edge.
  const marked = React.useRef<HTMLElement | undefined>(undefined);
  const pad = React.useRef(0);
  const edge = React.useCallback((focus: Element | null = document.activeElement) => {
    const el = windowRef.current;
    const list = listRef.current;
    let next: HTMLElement | undefined;
    let length = 0;
    if (el && list && tailShown) {
      // The row the edge is on: the first whose bottom is below it. It fades only when it is a tail row past the first step (data-depth 2 to 5),
      // holds no focus, and the edge crosses its words, not only its padding: more than space-0-5 above the edge and more than space-0-5 below it.
      pad.current ||= Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-space-0-5")) || 0;
      const y = el.scrollTop;
      next = ([...list.children] as HTMLElement[]).find((li) => li.offsetTop - list.offsetTop + li.offsetHeight > y);
      const top = next ? next.offsetTop - list.offsetTop : 0;
      length = top + (next?.offsetHeight ?? 0) - y;
      if (!next || (next.dataset.depth ?? "1") === "1" || next.contains(focus) || y <= top + pad.current || length <= pad.current) next = undefined;
    }
    const was = marked.current;
    if (was && was !== next) { was.removeAttribute("data-cut"); was.style.removeProperty("--_cut"); }
    if (next) { next.setAttribute("data-cut", ""); next.style.setProperty("--_cut", `${length}px`); }
    marked.current = next;
  }, [tailShown]);

  // ---- the floor that only grows: the newest `keep` full rows and two and a half tail rows, measured once a step is taller than a row
  const grown = React.useRef(0);
  const [overflows, setOverflows] = React.useState(false);
  const measure = React.useCallback(() => {
    const el = windowRef.current;
    const list = listRef.current;
    if (!el || !list || !tailShown) { edge(); return; }
    const full = [...list.children].filter((li) => !li.hasAttribute("data-tail")).slice(-(keep as number));
    const rows = full.reduce((sum, li) => sum + (li as HTMLElement).offsetHeight, 0);
    // The floor's own rows and a tail row from their tokens (a row: text-sm's line and space-2 twice, and a second line under 640px of the
    // timeline's width; a tail row: text-xs's line and space-0-5 twice), so a slot no step has filled yet keeps its room, and the floor counts
    // the tail before the first roll. An early tall step then grows the window once, by its own extra height, and later rows move nothing.
    const root = getComputedStyle(document.documentElement);
    const token = (name: string) => Number.parseFloat(root.getPropertyValue(name)) || 0;
    const narrow = (el.parentElement?.clientWidth ?? el.clientWidth) < token("--basalt-size-breakpoint-container-lg");
    const row = token("--basalt-text-sm-line-height") * (narrow ? 2 : 1) + 2 * token("--basalt-space-2");
    const tailRow = token("--basalt-text-xs-line-height") + 2 * token("--basalt-space-0-5");
    const slots = Math.max(0, floorRows - full.length);
    const want = Math.ceil(rows + slots * row + tailRow * 2.5);
    if (want > grown.current) { grown.current = want; el.style.setProperty("--_grown", `${want}px`); }
    setOverflows(el.scrollHeight > el.clientHeight + 1);
    toEnd();
    edge();
  }, [tailShown, keep, toEnd, floorRows, edge]);

  // ---- the roll: where each row was drawn before this change, read before React writes the DOM
  const shape = `${steps.length}:${rolled}:${open}`;
  const lastShape = React.useRef(shape);
  const before = React.useRef<Map<Element, number> | null>(null);
  const controlAt = React.useRef<[Element, number] | null>(null);
  if (listRef.current && before.current === null) {
    const win = windowRef.current;
    // A reader who scrolled away in this same task, before any scroll event could say so, is not followed.
    if (win && rolling.current === 0 && lastSet.current !== null && win.scrollTop < lastSet.current - 1 && !atEnd(win)) { following.current = false; lastSet.current = null; }
    const control = held();
    controlAt.current = control ? [control, control.getBoundingClientRect().top] : null;
    if (shape !== lastShape.current) {
      const map = new Map<Element, number>();
      for (const li of listRef.current.children) map.set(li, li.getBoundingClientRect().top);
      before.current = map;
    }
  }

  React.useLayoutEffect(() => {
    measure();
    // A control the reader is using stays where it was: the window scrolls by whatever moved it.
    const kept = controlAt.current;
    controlAt.current = null;
    if (kept && kept[0].isConnected && windowRef.current) setTop(windowRef.current, windowRef.current.scrollTop + kept[0].getBoundingClientRect().top - kept[1]);
    const from = before.current;
    before.current = null;
    const changed = shape !== lastShape.current;
    lastShape.current = shape;
    const el = windowRef.current;
    const list = listRef.current;
    if (!changed || !from || !list) return;
    const arrivals = [...list.children].filter((li) => !from.has(li)) as HTMLElement[];
    // An arrival fades in (100ms under reduced motion), whatever else happens; the hold lands it at once.
    if (!loopsHeld) for (const li of arrivals) track(li.animate([{ opacity: 0 }, { opacity: 1 }], { duration: tokenMs(li, reduced ? "--basalt-duration-fast" : "--basalt-duration-base"), easing: getComputedStyle(li).getPropertyValue("--basalt-ease-out").trim() || "ease-out" }), false);
    if (!el || open || !counter) return;
    // Only rows the window shows are moved; counted as Reflow counts them, and past its one bound the roll lands at once.
    const box = el.getBoundingClientRect();
    const moves: [HTMLElement, number][] = [];
    let counted = arrivals.filter((li) => { const r = li.getBoundingClientRect(); return r.bottom > box.top && r.top < box.bottom; }).length;
    for (const [li, was] of from) {
      if (!li.isConnected) continue;
      const now = li.getBoundingClientRect();
      const dy = was - now.top;
      if (Math.abs(dy) < 0.5) continue;
      if (now.bottom > box.top && now.top < box.bottom) { moves.push([li as HTMLElement, dy]); counted += 1; }
    }
    const atOnce = loopsHeld || reduced || counted > REFLOW_BOUND;
    el.dataset.rollCount = String(counted);
    el.toggleAttribute("data-landing", atOnce);
    if (atOnce) {
      requestAnimationFrame(() => requestAnimationFrame(() => el.removeAttribute("data-landing")));
      return;
    }
    for (const [li, dy] of moves) track(li.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration: tokenMs(li, "--basalt-duration-slow"), easing: getComputedStyle(li).getPropertyValue("--basalt-ease-out").trim() || "ease-out" }), true);
  });

  // ---- the animations in flight: a roll's rows are clipped to the list while they move (so their transforms never stretch the scrollable
  // box), and the hold or a change to reduced motion takes every one away at once, leaving each row where it rests.
  const flying = React.useRef(new Set<Animation>());
  function track(animation: Animation, roll: boolean) {
    flying.current.add(animation);
    const el = windowRef.current;
    if (roll) { rolling.current += 1; el?.setAttribute("data-rolling", ""); }
    const done = () => {
      if (!flying.current.delete(animation)) return;
      if (!roll) return;
      rolling.current -= 1;
      if (rolling.current === 0) { windowRef.current?.removeAttribute("data-rolling"); toEnd(); edge(); }
    };
    animation.addEventListener("finish", done);
    animation.addEventListener("cancel", done);
  }
  React.useEffect(() => {
    if (!loopsHeld && !reduced) return;
    for (const animation of [...flying.current]) animation.cancel();
  }, [loopsHeld, reduced]);

  // Every change of the content's height keeps the end while the reader is at it: a result or a time landing, a detail, a face loading, the width.
  React.useEffect(() => {
    const el = windowRef.current;
    const list = listRef.current;
    if (!el || !list || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  // The window holds still while a control in it has focus or the pointer is over one, so an action never moves under a press.
  const controlOf = (target: EventTarget | null) => (target instanceof Element ? target.closest("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1']):not(.basalt-run-steps-window)") : null);
  const holdFor = {
    onPointerOver: (event: React.PointerEvent) => { const was = held(); hovered.current = controlOf(event.target); if (was && !held()) { toEnd(); release(); } },
    onPointerLeave: () => { hovered.current = null; if (!held()) { toEnd(); release(); } },
    onFocus: (event: React.FocusEvent) => { focused.current = controlOf(event.target); edge(event.target as Element); },
    onBlur: (event: React.FocusEvent) => { focused.current = windowRef.current?.contains(event.relatedTarget as Node | null) ? controlOf(event.relatedTarget) : null; if (!held()) { toEnd(); release(); } edge(event.relatedTarget as Element | null); },
  };

  const items = steps.map((step, i) => (
    <StepPlaceContext.Provider key={step.key ?? i} value={{ tail: tailShown && i < rolled, depth: rolled - i }}>{step}</StepPlaceContext.Provider>
  ));
  const list = <ol ref={listRef} id={listId} className="basalt-run-steps" aria-label={label}>{provide(items)}</ol>;
  if (!counter) return <div className={join("basalt-run-steps-box", className)} data-open="">{list}</div>;

  return (
    <div className={join("basalt-run-steps-box", className)} data-open={open ? "" : undefined}>
      {/* The toggle's line is held from the first frame and empty until a step has rolled, so its arrival moves nothing. */}
      <div className="basalt-run-steps-toggle-line">
        {rolled > 0 || open ? (
          <TextButton quiet id={toggleId} className="basalt-run-steps-toggle" aria-expanded={open} aria-controls={listId} iconEnd={open ? ChevronUpGlyph : ChevronDownGlyph} onClick={() => setOpen(!open)}>
            {toggleLabel(rolled, failed, open, warned)}
          </TextButton>
        ) : null}
      </div>
      <div
        ref={windowRef}
        className="basalt-run-steps-window"
        style={{ "--_floor-rows": floorRows } as React.CSSProperties}
        onScroll={onScroll}
        tabIndex={overflows && !open ? 0 : undefined}
        role={overflows && !open ? "region" : undefined}
        aria-label={overflows && !open ? label : undefined}
        {...holdFor}
      >
        {list}
      </div>
    </div>
  );
}
