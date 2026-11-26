import * as React from "react";

import { ControlIcon, loadFlight } from "./control-icon";
import { ChevronDownGlyph } from "./glyphs/chevron-down";
import { ChevronRightGlyph } from "./glyphs/chevron-right";
import { inLevel, useFloatingLayer, usePopupLevel } from "./layers";
import { lazyAnchoredPopover } from "./lazy-popover";
import { Reserve } from "./reserve";
import { STAGE_WORDS } from "./run-format";
import type { Moment, RunTimeGrain, StageState } from "./run-format";
import { RunTimer } from "./run-timer";
import { warnRun } from "./run-warn";
import { StageMark } from "./stage-mark";
import { formatClock, formatStatTime } from "./time-format";
import { join } from "./utils";

declare const process: { env: { NODE_ENV?: string } };

// ---- A stage of a run (DECISIONS 316, 1.4 and 1.5) ----
// One row of a `StageList` or one node of a `StageRail`, from the same data. Which state's word is drawn and which is only said is foundations' table
// ("Stages and runs"): in a list every word but a passed stage's is drawn after the name; on a rail a failed, skipped, canceled or retrying node draws its
// word in the status seat, where a running or passed node's time stands. A detail (a failure's reason and Retry, what waits and Approve) opens under a
// list's stage. Focus is never dropped: when a detail closes or its action leaves while focus is inside it, focus goes to the stage's name.

/** Where a `RunStage` is drawn: set by `StageList` and `StageRail`. */
export const RunStagesContext = React.createContext<"list" | "rail" | null>(null);
/** On a rail, the state of the next node: the link before a stage that has not started (idle) stays empty, even after a passed stage. */
export const RailNextContext = React.createContext<StageState | undefined>(undefined);

/**
 * What a list or a rail tells its stages beyond where they are (cimip-gaps-3 T2, 3a and 3d): whether the seat shows a clock, in which locale and zone, what
 * counts as today, whether a list's clock seat must hold a date (a stage started on another day, or another year), whether any stage in a list folds (so
 * every row keeps the chevron's seat), and whether a rail of five or six is drawn as the list (its detail then opens in place).
 */
export interface RunStagesOptions {
  time: "duration" | "clock";
  locale?: string;
  timeZone?: string;
  now?: Moment;
  dated?: "day" | "year";
  chevron?: boolean;
  asList?: boolean;
}
export const RunStagesOptionsContext = React.createContext<RunStagesOptions>({ time: "duration" });

/** The widest clocks a locale writes (a two-digit hour, morning and evening), for the seat: tabular figures, so any digits stand for all. */
function clockSamples(locale: string | undefined, dated?: "day" | "year") {
  const out: Record<string, string> = {};
  for (const hour of [10, 22]) out[`c${hour}`] = formatClock(Date.UTC(2026, 0, 1, hour, 59), { timeZone: "UTC", locale }).text;
  // A list whose clock seat holds a date holds every month's name (their widths differ), with the year when one stage is in another year.
  if (dated) for (let month = 0; month < 12; month += 1) out[`d${month}`] = formatStatTime(Date.UTC(2026, month, 28, 22, 59), { now: dated === "year" ? Date.UTC(2027, 0, 1) : Date.UTC(2026, month, 1), timeZone: "UTC", locale }).text;
  return out;
}

/** Whether a moment falls on another day (or another year) than `now`, in the zone given. */
export function dayApart(time: Moment, now: Moment, timeZone?: string): "day" | "year" | undefined {
  const day = (t: Moment) => formatStatTime(t, { now: t, timeZone, locale: "en-US" }).dateTime.slice(0, 10);
  const [a, b] = [day(time), day(now)];
  if (a === b) return undefined;
  return a.slice(0, 4) === b.slice(0, 4) ? "day" : "year";
}

export interface RunStageProps {
  /** The stage's name: "Test". It never wraps. */
  name: string;
  state: StageState;
  /** The state's word, when the app's differs: "Blocked by Test", "Retrying, 2 of 3", "Waiting for approval". */
  word?: string;
  /** A short fact in tertiary at `text-xs` ("412 packages"); a list hides it under 480px of its own width. A rail draws none. */
  meta?: React.ReactNode;
  /** When this attempt started, and ended: the stage's own time. */
  start?: Moment;
  end?: Moment;
  /** Writes the stage's time, in a list and on a rail (see `RunTimer`'s `format`): its seat's width follows it. */
  format?: (ms: number, grain: RunTimeGrain) => string;
  /** Says the stage's time, when the drawn form is short for the ear (see `RunTimer`'s `spoken`). */
  spoken?: (ms: number, grain: RunTimeGrain) => string;
  /** What opens under a list's stage: a failure's reason, what waits. A `p` is the reason, a `strong` its loud words, a `small` its fact. A rail ignores it. */
  detail?: React.ReactNode;
  /** The detail's one action: a `Button` whose `onClick` returns the app's promise ("Retry", "Approve"). A rail ignores it. */
  action?: React.ReactNode;
  /**
   * The stage folds (cimip-gaps-3 T2, 3d): in a list its line is a button that opens and closes the detail in place (the core chevron at its end, right
   * to down); on a rail its node (mark, name and seat) is a button that opens the detail in a popover below it, and in place when the rail is drawn as
   * the list. Uncontrolled, a stage that turns failed or warning, or gains an `action`, opens once by itself where the detail opens in place, never as a
   * popover. Without it a stage behaves as before: a list's detail opens whenever there is one, and a rail shows none.
   */
  collapsible?: boolean;
  /** Whether a collapsible stage's detail is open. Controlled with `onOpenChange`, or start from `defaultOpen`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const DRAWN: Record<"list" | "rail", Record<StageState, boolean>> = {
  list: { idle: true, queued: true, running: true, success: false, failed: true, skipped: true, canceled: true, retrying: true, warning: true },
  rail: { idle: false, queued: false, running: false, success: false, failed: true, skipped: true, canceled: true, retrying: true, warning: true },
};

/** Whether a slot holds something drawn: `null`, `false`, `true` and "" (what `cond && <Button />` leaves) are nothing, as React draws them. */
export const rendered = (node: React.ReactNode) => node !== undefined && node !== null && typeof node !== "boolean" && node !== "";

/**
 * Focus that was inside a part that has closed or lost its action goes to `home` (a name with `tabindex="-1"`, `preventScroll`), never to the body,
 * whoever closed it: the reader's press, or the app (someone else approved, the retry started from elsewhere). `present` counts what the part holds (0
 * closed, 1 open, 2 open with its action); a fall is a leave.
 */
export function useFocusHome(present: number, home: React.RefObject<HTMLElement | null>) {
  const inside = React.useRef(false);
  const was = React.useRef(present);
  const track = React.useMemo(() => ({
    onFocus: () => { inside.current = true; },
    // Focus moved by the reader to somewhere else is theirs; focus that went nowhere (its element left, or turned inert) is ours to place.
    onBlur: (event: React.FocusEvent) => { if (event.relatedTarget) inside.current = false; },
  }), []);
  React.useLayoutEffect(() => {
    const fell = present < was.current;
    was.current = present;
    if (!fell || !inside.current) return;
    inside.current = false;
    const active = document.activeElement;
    const part = home.current?.closest("li")?.querySelector("[data-focus-home]");
    if (active && active !== document.body && !part?.contains(active)) return;
    home.current?.focus({ preventScroll: true });
  });
  return track;
}

/** The words a rail node draws by default, each held in its status seat. */
const RAIL_WORDS = { failed: STAGE_WORDS.failed, skipped: STAGE_WORDS.skipped, canceled: STAGE_WORDS.canceled, retrying: STAGE_WORDS.retrying, warning: STAGE_WORDS.warning };

/** A stage's start as a clock in its seat (3a): the clock alone, the date added in a list on another day, said in full when it is another day. */
function StageClock({ start, list, options }: { start: Moment | undefined; list: boolean; options: RunStagesOptions }) {
  const { locale, timeZone, now, dated } = options;
  const samples = clockSamples(locale, list ? dated : undefined);
  let shown: React.ReactNode = "";
  if (start !== undefined) {
    const today = now ?? Date.now();
    const other = dayApart(start, today, timeZone);
    const full = formatStatTime(start, { now: today, timeZone, locale });
    const clock = formatClock(start, { timeZone, locale });
    const text = list ? full.text : clock.text;
    shown = (
      <time dateTime={full.dateTime} suppressHydrationWarning={now === undefined || undefined}>
        {other && !list ? <><span aria-hidden="true">{text}</span><span className="basalt-visually-hidden">{full.text}</span></> : text}
      </time>
    );
  }
  return <span className="basalt-run-clock"><Reserve show="time" alternatives={{ ...samples, time: shown }} /></span>;
}

/** One stage. In a `StageList` a row; in a `StageRail` a node. */
export function RunStage({ name, state, word, meta, start, end, format, spoken, detail, action, collapsible = false, open: openProp, defaultOpen, onOpenChange, className }: RunStageProps) {
  const kind = React.useContext(RunStagesContext) ?? "list";
  const options = React.useContext(RunStagesOptionsContext);
  const clock = options.time === "clock";
  const next = React.useContext(RailNextContext);
  const said = word ?? STAGE_WORDS[state];
  const drawn = DRAWN[kind][state];
  const nameRef = React.useRef<HTMLSpanElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const detailId = React.useId();
  const popId = React.useId();
  const popLevel = usePopupLevel();
  const popLayer = useFloatingLayer();
  // Mounted once first opened, so its close plays; never before, so a rail that never opens one loads no popover.
  const [everOpened, setEverOpened] = React.useState(false);
  const timer = clock ? <StageClock start={start} list={kind === "list"} options={options} /> : <RunTimer start={start} end={end} format={format} spoken={spoken} whenHeld="hidden" />;

  // ---- the stage's own disclosure (3d)
  const inPlace = kind === "list" || options.asList === true;
  const [inner, setInner] = React.useState(defaultOpen ?? false);
  const [auto, setAuto] = React.useState(false);
  const isOpen = collapsible ? (openProp ?? inner) : false;
  const setOpen = (next: boolean) => { setAuto(false); if (openProp === undefined) setInner(next); onOpenChange?.(next); };
  const hasAction = rendered(action);
  const ending = state === "failed" || state === "warning";
  // Uncontrolled, a stage that turns failed or warning, or gains an action, opens once by itself, only where its detail opens in place.
  const [last, setLast] = React.useState({ ending: false, action: false });
  if (collapsible && (ending !== last.ending || hasAction !== last.action)) {
    setLast({ ending, action: hasAction });
    if (openProp === undefined && inPlace && ((ending && !last.ending) || (hasAction && !last.action)) && !inner) { setInner(true); setAuto(true); }
  }
  // A detail that opened by itself closes when the rail leaves the list form: widening a window never raises a popover nobody asked for.
  const [wasInPlace, setWasInPlace] = React.useState(inPlace);
  if (wasInPlace !== inPlace) {
    setWasInPlace(inPlace);
    if (!inPlace && auto) { setAuto(false); if (openProp === undefined) setInner(false); }
  }

  // The detail keeps what it last held while it closes, so it closes over its own content and never over nothing.
  const hasContent = rendered(detail) || hasAction;
  const open = inPlace && hasContent && (collapsible ? isOpen : kind === "list");
  const kept = React.useRef<{ detail: React.ReactNode; action: React.ReactNode }>({ detail: null, action: null });
  if (open) kept.current = { detail, action };
  const track = useFocusHome(open ? (hasAction ? 2 : 1) : 0, collapsible ? triggerRef : nameRef);

  // Development: a rail's word is one or two short words, and one that its column cuts warns.
  const wordRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production" || kind !== "rail" || !drawn) return;
    const el = wordRef.current;
    if (el && el.scrollWidth > el.clientWidth + 0.5) warnRun("StageRail", `"${said}" is cut by its column; a rail's word is one or two short words.`);
  });

  const detailNode = (
    // Always in the row, closed until a stage has something to show, so its first opening runs from closed like every other.
    <div id={detailId} className="basalt-run-stage-detail" data-open={open ? "" : undefined} inert={!open || undefined} data-focus-home="" {...track}>
      <div className="basalt-run-stage-detail-clip">
        <div className="basalt-run-stage-detail-body">
          {open ? detail : kept.current.detail}
          {rendered(open ? action : kept.current.action) ? <div className="basalt-run-stage-action">{open ? action : kept.current.action}</div> : null}
        </div>
      </div>
    </div>
  );

  if (kind === "rail") {
    // Only a pass fills the link, and never the one before a stage that has not started (idle, cimip-gaps-3 T1).
    const link = <span className="basalt-run-stage-link" data-filled={state === "success" && next !== "idle" ? "" : undefined} aria-hidden="true"><span className="basalt-run-stage-fill" /></span>;
    const status = (
      <span className="basalt-run-stage-status">
        {/* One cell for the time and every word a node can draw, so a node that turns from its time to "Failed" or "Retrying" moves nothing. */}
        <Reserve show={drawn ? "word" : "time"} alternatives={{ time: timer, ...RAIL_WORDS, word: <span ref={wordRef} className="basalt-run-stage-word">{said}</span> }} />
      </span>
    );
    if (!collapsible) {
      return (
        <li className={join("basalt-run-stage", className)} data-state={state}>
          <span className="basalt-run-stage-markrow">
            <StageMark state={state} />
            {link}
          </span>
          <span className="basalt-run-stage-name" ref={nameRef} tabIndex={-1}>
            {name}
            {drawn ? null : <span className="basalt-visually-hidden"> {said}</span>}
          </span>
          {status}
        </li>
      );
    }
    // The node is one button in both forms (a popover on the rail, the detail in place when the rail is drawn as the list), so crossing 480 keeps focus on it.
    const popoverOpen = isOpen && !inPlace && hasContent;
    if (popoverOpen && !everOpened) setEverOpened(true);
    const RailPopover = lazyAnchoredPopover();
    return (
      <li className={join("basalt-run-stage", className)} data-state={state} data-collapsible="">
        {link}
        <button
          ref={triggerRef}
          type="button"
          className="basalt-run-stage-node"
          aria-expanded={hasContent ? isOpen : undefined}
          aria-controls={hasContent ? (inPlace ? detailId : popoverOpen ? popId : undefined) : undefined}
          aria-haspopup={hasContent && !inPlace ? "dialog" : undefined}
          onClick={() => { if (hasContent) setOpen(!isOpen); }}
          onPointerEnter={() => void loadFlight()}
          onFocus={() => void loadFlight()}
        >
          <span className="basalt-run-stage-markrow"><StageMark state={state} /></span>
          <span className="basalt-run-stage-name">
            <span className="basalt-run-stage-label">{name}</span>
            {drawn ? null : <span className="basalt-visually-hidden"> {said}</span>}
          </span>
          {status}
        </button>
        {inPlace ? detailNode : null}
        {hasContent && !inPlace && (popoverOpen || everOpened) ? (
          // The rail's popover is loaded when a node first opens one, so a rail that never does carries no popover.
          <React.Suspense fallback={null}>
            <RailPopover open={popoverOpen} onOpenChange={(next) => { if (next !== isOpen) setOpen(next); }} anchor={triggerRef} align="center" level={popLevel} layer={popLayer} wrap={(node) => inLevel(popLevel, node)} id={popId} className="basalt-run-stage-pop" state={state} title={name}>
              <p className="basalt-run-stage-pop-state">
                <span className="basalt-run-stage-word">{said}</span>
                {start !== undefined ? <>{" "}{timer}</> : null}
              </p>
              <div className="basalt-run-stage-detail-body">
                {detail}
                {hasAction ? <div className="basalt-run-stage-action">{action}</div> : null}
              </div>
            </RailPopover>
          </React.Suspense>
        ) : null}
      </li>
    );
  }

  const chevronSeat = options.chevron ? (
    <span className="basalt-run-stage-chevron" aria-hidden="true">{collapsible ? <ControlIcon icon={isOpen ? ChevronDownGlyph : ChevronRightGlyph} size={16} /> : null}</span>
  ) : null;
  const lineContent = (
    <>
      <StageMark state={state} />
      <span className="basalt-run-stage-name" ref={nameRef} tabIndex={collapsible ? undefined : -1}>
        <span className="basalt-run-stage-label">{name}</span>
        {/* A flex item is its own run of text, so the name and the word are read apart, with no comma. */}
        {drawn ? <>{" "}<span className="basalt-run-stage-word">{said}</span></> : <span className="basalt-visually-hidden">{said}</span>}
      </span>
      <span className="basalt-run-stage-meta">{meta}</span>
      {chevronSeat ? <span className="basalt-run-stage-end">{timer}{chevronSeat}</span> : timer}
    </>
  );
  return (
    <li className={join("basalt-run-stage", className)} data-state={state} data-collapsible={collapsible ? "" : undefined}>
      {collapsible ? (
        <button
          ref={triggerRef}
          type="button"
          className="basalt-run-stage-line"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={() => setOpen(!isOpen)}
          onPointerEnter={() => void loadFlight()}
          onFocus={() => void loadFlight()}
        >
          {lineContent}
        </button>
      ) : <div className="basalt-run-stage-line">{lineContent}</div>}
      {detailNode}
    </li>
  );
}

/** How many stages a list or rail holds; in development, a child that is not a `RunStage` warns. */
export function countStages(component: string, children: React.ReactNode) {
  const rows = React.Children.toArray(children).filter(React.isValidElement);
  if (process.env.NODE_ENV !== "production" && rows.some((child) => child.type !== RunStage)) warnRun(component, "a child is not a RunStage; a stage list's and a rail's rows are RunStage.");
  return rows.length;
}
