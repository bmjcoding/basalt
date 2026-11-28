import { breakpoint } from "@srasyndicate/basalt-tokens/breakpoints";
import { Toast as BaseToast } from "@base-ui/react/toast";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import * as React from "react";

import { Button } from "./button";
import { WAIT_MIN_SHOWN_MS, WAIT_SHOW_AFTER_MS } from "./constants";
import { CloseGlyph } from "./glyphs/close";
import { Icon } from "./icon";
import { isApplePlatform } from "./platform";
import { onPageChange, pageChanged } from "./page-change";
import { useScreenKeyboardLayout } from "./screen-keyboard";
import { Spinner } from "./spinner";
import { useMediaQuery } from "./use-media";
import type { IconComponent } from "./types";
import { isThenable } from "./wait";

export type ToastStatus = "neutral" | "success" | "warning" | "danger";

/**
 * Where the same information, and any action, stays after the toast has gone. A toast may time out only when it is
 * not the only copy, so naming a home is how a toast earns its five seconds:
 *
 * - `"center"`: the app keeps an entry in the notification center for as long as the action is valid. (`"centre"` is the older spelling of the same value and stays as an alias.)
 * - `"row"`: the thing itself shows it in place (a deleted row's restore control, a saved field's "Saved").
 * - `"key"`: the app binds a key that does the action (pass it as `action.keys` too).
 * - `"page"`: the toast only echoes a change the page already shows ("Copied"). It cannot stand for an action. Its only home is the page, so it
 *   does not outlive it: when the page changes without a reload (`useRouteFocus`, or `useToast().pageChanged()`), it closes.
 */
export type ToastHome = "center" | "centre" | "row" | "key" | "page";

export interface ToastAction {
  /** What it does: "Undo", "Retry", "View". */
  label: string;
  /**
   * Called on a press. A promise back makes the button wait for it, as every Button does: further presses (and Enter or Space) call nothing, it is
   * `aria-busy` from the press, its ring shows after 300ms and stays at least 400ms, and its label and width hold. While it waits the toast's clock
   * and drain line pause and it is never closed to make room; Dismiss and a swipe still close it. For an Undo that asks the server.
   */
  onClick: () => unknown;
  /** The app's own key for it, written to `aria-keyshortcuts` ("Meta+Z"; "Mod+Z" is Meta on Apple's systems and Control elsewhere). No chip is drawn on the button. */
  keys?: string;
}

interface ToastContent {
  /** One line saying what happened: "Sandbox deleted". */
  title: string;
  /** Optional detail. */
  description?: string;
  /**
   * `success`, `warning` and `danger` draw their mark in the 16px seat (a check circle, a warning triangle, an X circle);
   * danger also takes its colour on the title and is announced assertively. Neutral has no mark and no empty seat. The title
   * still says it in words. A toast is never tinted and never takes a status rim.
   */
  status?: ToastStatus;
  /** A single follow-up action, e.g. "Undo". An action is only ever on a toast that stays, or one whose action also has a durable `home`. */
  action?: ToastAction;
  /**
   * Repeats of the same thing share one toast: a second `show` with the same `group` while the first is on screen becomes
   * "×2" and restarts the clock. Errors never group. For a batch, show one toast ("Deleted 3 sandboxes").
   */
  group?: string;
  /**
   * Work that is under way. Braille runs in the mark seat, the step text is never announced, and the toast stays until you
   * `update` it to its result. The seat is kept for the result, so the title never moves. Its clock starts at the result.
   */
  running?: boolean;
}

/**
 * How long a toast lives. A toast with no `home` stays until it is dismissed, because it is the only copy of what it says,
 * and `timeout` cannot be set on it. With a `home` it closes after 5000ms, or after `timeout`.
 */
type ToastLifetime =
  | { home: ToastHome | readonly ToastHome[]; timeout?: number }
  | { home?: undefined; timeout?: 0 };

export type ToastOptions = ToastContent & ToastLifetime;

/**
 * The next state of a toast. Updating ends `running` unless you pass `running: true`, and a result starts from a clean
 * toast: its description and action are only what you pass. Anything else you leave out stays.
 */
export type ToastUpdate = Partial<ToastContent> & { home?: ToastHome | readonly ToastHome[]; timeout?: number };

export interface ToastPromiseOptions<Value> {
  /** The running state: a title, or a full set of options. */
  running: string | Omit<ToastOptions, "running">;
  success: string | ToastUpdate | ((value: Value) => string | ToastUpdate);
  error: string | ToastUpdate | ((error: unknown) => string | ToastUpdate);
  /** How long the work may run before its running toast shows, in ms. Default 300 (`WAIT_SHOW_AFTER_MS`); 0 shows it at once. */
  showAfter?: number;
  /** Once the running toast is on screen, the least time before its result replaces it, in ms. Default 400 (`WAIT_MIN_SHOWN_MS`). */
  minShown?: number;
}

// Stated here rather than left to Base UI, because the drain line must last as long as the timer.
const DEFAULT_TIMEOUT = 5000;

const homesOf = (home: ToastOptions["home"]): readonly ToastHome[] => (home === undefined ? [] : typeof home === "string" ? [home] : home);

/**
 * A toast's lifetime in ms: 0 keeps it until it is dismissed. Only a toast that is not the only copy of its information or
 * action may time out: it needs a `home`, and an action needs a home other than the page. Running work never times out.
 */
function lifetimeOf(options: Pick<ToastOptions, "running" | "action" | "home" | "timeout">): number {
  if (options.running) return 0;
  const homes = homesOf(options.home);
  const kept = options.action ? homes.some((home) => home !== "page") : homes.length > 0;
  if (!kept) return 0;
  return options.timeout ?? DEFAULT_TIMEOUT;
}

const MARKS: Record<Exclude<ToastStatus, "neutral">, IconComponent> = { success: CheckCircleIcon, warning: WarningIcon, danger: XCircleIcon };

// ---- What each toast carries, and the controller that places them ----

/** Riding on Base UI's `data`, so the list that renders is the list that is announced and timed. */
interface ToastData {
  options: ToastOptions;
  /** The 16px mark seat: marked, or started running. Once a toast has it, it keeps it until it goes. */
  seat: boolean;
  count: number;
  /** Changes whenever the toast is shown again or updated, so its clock restarts. */
  stamp: number;
}

interface Entry {
  id: string;
  options: ToastOptions;
  seat: boolean;
  count: number;
  /** When it entered the stack (`performance.now()`); none while it waits in the queue. A running toast's result waits from here. */
  shownAt?: number;
}

interface Pending extends Entry {}

/** The parts of Base UI's manager the controller needs. They belong to its store, so they never change. */
interface Api {
  add: (options: Record<string, unknown>) => string;
  update: (id: string, updates: Record<string, unknown>) => void;
  close: (id?: string) => void;
}

interface Controller {
  api: Api | null;
  /** The toasts on screen, oldest first (Map order). Mirrors Base UI's, but is current within a single tick. */
  items: Map<string, Entry>;
  /** Toasts that found the stack full of toasts that must stay. They enter, in order, as room appears. */
  queue: Pending[];
  limit: number;
  seq: number;
  say: ((text: string, urgent: boolean) => void) | null;
  /** The sentence added to the announcement of a toast that has an action, from the action's label. */
  actionWords: (label: string) => string;
  /** Said before the announcer mounted (a toast shown on load). */
  early: Array<[string, boolean]>;
  /** The toast whose action was announced last: F6 takes the reader to that action, the one the words promised. */
  promised: string | null;
  /** The timers of `promise` that are still to run (the running toast's delay, its result's floor), cleared when the provider unmounts. */
  timers: Set<number>;
  /** The toasts whose action is waiting for its answer: never closed to make room. */
  busy: Set<string>;
  /** The provider has unmounted: a `promise` that settles now shows and updates nothing, and starts no timer. */
  disposed: boolean;
}

const ControllerContext = /* @__PURE__ */ React.createContext<Controller | null>(null);

const defaultActionWords = (label: string) => `${label} is available. Press F6 to reach it.`;

function createController(): Controller {
  return { api: null, items: new Map(), queue: [], limit: 3, seq: 0, say: null, actionWords: defaultActionWords, early: [], promised: null, timers: new Set(), busy: new Set(), disposed: false };
}

// The app's key as `aria-keyshortcuts` says it: "Mod+Z" is "Meta+Z" on Apple's systems and "Control+Z" elsewhere (DECISIONS 244); any other string is as written.
const ariaKeys = (keys: string) => keys.replace(/\bMod\b/g, isApplePlatform() ? "Meta" : "Control");

const statusOf = (options: Pick<ToastOptions, "status">): ToastStatus => options.status ?? "neutral";

function announce(c: Controller, id: string, options: ToastOptions, suffix = "") {
  if (options.action) c.promised = id;
  const said = `${options.title}${suffix}${options.description ? `. ${options.description}` : ""}`;
  // The action's sentence is its own: after a full stop it follows on, after a bare phrase it gets one.
  const text = options.action ? `${said}${/[.!?]$/.test(said) ? " " : ". "}${c.actionWords(options.action.label)}` : said;
  say(c, text, statusOf(options) === "danger");
}

function say(c: Controller, text: string, urgent: boolean) {
  if (c.say) c.say(text, urgent);
  else c.early.push([text, urgent]);
}

function toBase(c: Controller, entry: Entry, stamp: number) {
  const { options } = entry;
  const data: ToastData = { options, seat: entry.seat, count: entry.count, stamp };
  return {
    id: entry.id,
    title: options.title,
    description: options.description,
    type: statusOf(options),
    // Base UI's own clock is never used: the toast times itself, so that a hidden tab and a queue are covered.
    timeout: 0,
    // Only the key goes to Base UI: it merges these props last, so a handler here would run past the action Button's wait. The label and the press
    // are the Button's own (`ToastItem`).
    actionProps: options.action ? (options.action.keys ? { "aria-keyshortcuts": ariaKeys(options.action.keys) } : {}) : undefined,
    data,
    onClose: () => {
      c.items.delete(entry.id);
      if (c.promised === entry.id) c.promised = null;
      drain(c);
    },
  };
}

function isFocused(id: string): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  return !!active && active.closest(`[data-toast-id="${id}"]`) !== null;
}

function enter(c: Controller, entry: Entry) {
  entry.shownAt = performance.now();
  c.items.set(entry.id, entry);
  c.api?.add(toBase(c, entry, ++c.seq));
  // Running work is not announced, step by step or at all: only its result is (see `update`).
  if (!entry.options.running) announce(c, entry.id, entry.options, entry.count > 1 ? `, ${entry.count} times` : "");
}

/** Room for one more: below the limit, or by closing the oldest toast that is not the only copy, is not focused and is not waiting on its action. */
function makeRoom(c: Controller): boolean {
  if (c.items.size < c.limit) return true;
  for (const [id, entry] of c.items) {
    if (lifetimeOf(entry.options) > 0 && !isFocused(id) && !c.busy.has(id)) {
      c.api?.close(id);
      return c.items.size < c.limit;
    }
  }
  return false;
}

function drain(c: Controller) {
  while (c.queue.length > 0 && c.items.size < c.limit) enter(c, c.queue.shift() as Pending);
}

function show(c: Controller, options: ToastOptions): string {
  const status = statusOf(options);
  if (options.group && status !== "danger" && !options.running) {
    const same = (entry: Entry) => entry.options.group === options.group && !entry.options.running && statusOf(entry.options) === status;
    const live = [...c.items.values()].find(same);
    const waiting = c.queue.find(same);
    const found = live ?? waiting;
    if (found) {
      const prev = found.options;
      found.count += 1;
      found.options = options;
      if (live) {
        replace(c, live, prev);
        announce(c, live.id, options, `, ${live.count} times`);
      }
      return found.id;
    }
  }
  const entry: Entry = { id: `basalt-toast-${++c.seq}`, options, seat: !!options.running || status !== "neutral", count: 1 };
  if (makeRoom(c)) enter(c, entry);
  else c.queue.push(entry);
  return entry.id;
}

/** A result is a new statement: it starts from the running toast's title, group and lifetime, not from its action. Every path to a result uses it. */
function resultOf(running: ToastOptions, patch: ToastUpdate): ToastOptions {
  return { title: running.title, group: running.group, home: running.home, timeout: running.timeout, ...patch, running: false } as ToastOptions;
}

/**
 * Hands a toast on screen its next state. An update that takes away the action holding focus moves focus to the toast first, inside the stack, so it
 * never falls to the page and F6's way back is kept. After the commit would be too late: the removed button has blurred by then. Every replacement of a
 * toast on screen comes through here (an update, and a repeat that joins its group).
 */
function replace(c: Controller, entry: Entry, prev: ToastOptions) {
  if (prev.action && !entry.options.action && typeof document !== "undefined") {
    const root = document.querySelector<HTMLElement>(`.basalt-toast[data-toast-id="${CSS.escape(entry.id)}"]`);
    if (root && root.querySelector(".basalt-toast-action")?.contains(document.activeElement)) root.focus({ preventScroll: true });
  }
  c.api?.update(entry.id, toBase(c, entry, ++c.seq));
}

function update(c: Controller, id: string, patch: ToastUpdate) {
  const entry = c.items.get(id) ?? c.queue.find((pending) => pending.id === id);
  if (!entry) return;
  const prev = entry.options;
  const ends = !!prev.running && !patch.running;
  const next = ends ? resultOf(prev, patch) : ({ ...prev, ...patch, running: patch.running ?? false } as ToastOptions);
  entry.options = next;
  const onScreen = c.items.has(id);
  // On screen the seat is latched, so the text does not move when the mark goes; a toast still queued enters as what it now is (a neutral result, no seat).
  entry.seat = onScreen ? entry.seat || statusOf(next) !== "neutral" : !!next.running || statusOf(next) !== "neutral";
  if (!onScreen) return;
  replace(c, entry, prev);
  const settled = !next.running;
  // A changed result is said whole, with its action's sentence if it has one. An action that appears, or whose label changes, with the
  // result as it was, is said alone: the listener has the result already. An action that goes says nothing.
  const actionNews = !!next.action && next.action.label !== prev.action?.label;
  if (settled && (ends || prev.title !== next.title || prev.description !== next.description)) announce(c, id, next);
  else if (settled && actionNews) {
    c.promised = id;
    say(c, c.actionWords(next.action!.label), statusOf(next) === "danger");
  }
}

/** Only the page it echoed showed this toast's news: it has no other home, and it is not work under way. */
const echoesPage = (options: ToastOptions) => !options.running && homesOf(options.home).length > 0 && homesOf(options.home).every((home) => home === "page");

/**
 * The page changed without a reload. A toast whose only home was the page that left echoes something no longer on screen (and over the new
 * page's controls it only takes taps), so it closes, on screen or still waiting. A toast that is the only copy, or whose home outlives the page
 * (the notification center, the row, a key), stays: it goes when its own clock or the reader says.
 */
function leavePage(c: Controller) {
  c.queue = c.queue.filter((pending) => !echoesPage(pending.options));
  for (const [id, entry] of c.items) if (echoesPage(entry.options)) c.api?.close(id);
}

function close(c: Controller, id: string) {
  if (c.items.has(id)) c.api?.close(id);
  else c.queue = c.queue.filter((pending) => pending.id !== id);
}

/** A timer of `promise`'s, kept in the controller so the provider's unmount clears it. */
function later(c: Controller, ms: number, run: () => void): number {
  const timer = window.setTimeout(() => {
    c.timers.delete(timer);
    run();
  }, ms);
  c.timers.add(timer);
  return timer;
}

/**
 * Running work, then its result, on the wait's two timings (DECISIONS 247, 248): no running toast for work under `showAfter`, and once one is on
 * screen it stays `minShown` before its result, whether the work succeeded or failed. The work itself is returned at once and never delayed.
 */
function promise<Value>(c: Controller, work: Promise<Value>, o: ToastPromiseOptions<Value>): Promise<Value> {
  const base = typeof o.running === "string" ? { title: o.running } : o.running;
  const running = { ...base, running: true } as ToastOptions;
  const showAfter = o.showAfter ?? WAIT_SHOW_AFTER_MS;
  const minShown = o.minShown ?? WAIT_MIN_SHOWN_MS;
  let id: string | null = null;
  let timer = 0;
  // At 0 the running toast shows in the call, before the work's answer is listened for: an answer already in hand must not skip it.
  if (showAfter <= 0) id = show(c, running);
  else timer = later(c, showAfter, () => { id = show(c, running); });
  const patch = (given: string | ToastUpdate): ToastUpdate => (typeof given === "string" ? { title: given } : given);
  const settle = (result: ToastUpdate) => {
    // The provider has gone: no result, and no timer for one.
    if (c.disposed) return;
    if (id === null) {
      // The provider went before the running toast was due: nothing shows.
      if (!c.timers.has(timer)) return;
      window.clearTimeout(timer);
      c.timers.delete(timer);
      // Quicker than the delay: the result alone, built as a slow one is, so both have the same title, group, home and lifetime.
      show(c, resultOf(running, result));
      return;
    }
    const shownAt = c.items.get(id)?.shownAt;
    // Still queued (it enters as its result, announced once) or closed by the reader (a no-op): at once.
    const wait = shownAt === undefined ? 0 : Math.max(0, minShown - (performance.now() - shownAt));
    const target = id;
    if (wait === 0) update(c, target, result);
    else later(c, wait, () => { if (!c.disposed) update(c, target, result); });
  };
  work.then(
    (value) => settle(patch(typeof o.success === "function" ? o.success(value) : o.success)),
    (error) => settle({ status: "danger", ...patch(typeof o.error === "function" ? o.error(error) : o.error) }),
  );
  return work;
}

// ---- The provider ----

export interface ToastProviderProps {
  children: React.ReactNode;
  /** How many toasts show at once. Default 3. */
  limit?: number;
  /**
   * For a toast with an action, the sentence its announcement ends with, from the action's label. It says the action exists and
   * how to reach it. For translation. Default: "Undo is available. Press F6 to reach it." A toast with no action says nothing extra.
   */
  actionWords?: (label: string) => string;
  /**
   * The column the toasts belong to, for an app whose window holds more than one (a conversation beside a panel): the stack's right edge keeps space-4
   * inside this element's right edge, as it does inside the window's without one. Read again after each render of the stack and once a frame while a
   * toast is shown, so a column that mounts later, is replaced or moves is followed. The stylesheet's
   * `--basalt-toast-right` says the same without a measure (the distance from the window's right edge). Under 720 the stack hangs full width from the
   * bar, and neither is read.
   */
  column?: React.RefObject<HTMLElement | null>;
}

/**
 * Place once near the root of the app. Toasts appear bottom-right (under 720, full width and hanging from the bar, space-2 under it), stack three
 * deep with the ones behind peeking, expand on hover or focus, and pause their clocks while hovered, focused, in a blurred window
 * or in a hidden tab. Results are announced from text-only live regions: danger assertively, the rest politely, once each.
 * The stack itself stays a named region (F6 reaches it).
 */
export function ToastProvider({ children, limit = 3, actionWords = defaultActionWords, column }: ToastProviderProps) {
  const controller = React.useRef<Controller | null>(null);
  if (!controller.current) controller.current = createController();
  controller.current.limit = limit;
  controller.current.actionWords = actionWords;
  const current = controller.current;
  React.useEffect(() => onPageChange(() => leavePage(current)), [current]);
  // A `promise` still waiting to show its running toast, or its result, shows nothing once the provider has gone.
  React.useEffect(() => {
    current.disposed = false;
    return () => {
      current.disposed = true;
      for (const timer of current.timers) window.clearTimeout(timer);
      current.timers.clear();
    };
  }, [current]);
  return (
    <ControllerContext.Provider value={controller.current}>
      <BaseToast.Provider limit={limit} timeout={0}>
        <ToastBridge controller={controller.current} />
        {children}
        <ToastAnnouncer controller={controller.current} />
        <BaseToast.Portal>
          <ToastStack column={column} />
        </BaseToast.Portal>
      </BaseToast.Provider>
    </ControllerContext.Provider>
  );
}

/** Hands Base UI's manager to the controller. Its methods are the store's own, so one handover is enough. */
function ToastBridge({ controller }: { controller: Controller }) {
  const { add, update, close } = BaseToast.useToastManager();
  controller.api ??= { add, update, close } as Api;
  return null;
}

/**
 * Two live regions that hold only text, so a screen reader reads the result and never a button inside a status: polite for
 * everything and assertive for danger. They exist, empty, before the first toast. The visible stack is not live, or each
 * toast would be read twice.
 */
function ToastAnnouncer({ controller }: { controller: Controller }) {
  const [said, setSaid] = React.useState<Array<{ key: number; text: string; urgent: boolean }>>([]);
  React.useEffect(() => {
    let key = 0;
    const push = (text: string, urgent: boolean) => setSaid((all) => [...all, { key: ++key, text, urgent }]);
    controller.say = push;
    for (const [text, urgent] of controller.early.splice(0)) push(text, urgent);
    return () => { controller.say = null; };
  }, [controller]);
  React.useEffect(() => {
    if (said.length === 0) return;
    // The text has been read by now; clearing it is silent.
    const timer = window.setTimeout(() => setSaid([]), 4000);
    return () => window.clearTimeout(timer);
  }, [said]);
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="false" aria-relevant="additions text" className="basalt-visually-hidden">
        {said.filter((message) => !message.urgent).map((message) => <p key={message.key}>{message.text}</p>)}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false" aria-relevant="additions text" className="basalt-visually-hidden">
        {said.filter((message) => message.urgent).map((message) => <p key={message.key}>{message.text}</p>)}
      </div>
    </>
  );
}

/** Whether the stack is hovered or focused (Base UI's `expanded`), which holds every clock. */
const ExpandedContext = /* @__PURE__ */ React.createContext(false);

/**
 * How far the column's right edge is from the window's, in CSS pixels; undefined without a column (or while its ref holds nothing). The ref is read again
 * after every commit of the stack, and once a frame while a toast is shown, so a column mounted after the provider, a column replaced by another, and a
 * column that moves sideways at the same width are all followed. Nothing runs while no toast is shown: the next toast measures before it is drawn.
 */
function useColumnRight(column: React.RefObject<HTMLElement | null> | undefined, shown: boolean) {
  const [right, setRight] = React.useState<number | undefined>(undefined);
  const update = React.useCallback(() => {
    const element = column?.current;
    // The fixed stack's right is measured from the viewport's edge, which is the root's client width (a classic scrollbar is outside it).
    const next = element?.isConnected ? Math.max(0, Math.round(element.ownerDocument.documentElement.clientWidth - element.getBoundingClientRect().right)) : undefined;
    setRight((was) => (was === next ? was : next));
  }, [column]);
  React.useLayoutEffect(update);
  React.useEffect(() => {
    if (!shown || !column) return undefined;
    let frame = window.requestAnimationFrame(function follow() {
      update();
      frame = window.requestAnimationFrame(follow);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [shown, column, update]);
  return right;
}

/** A toast's action that can take focus: not on a toast that is leaving or held back by the limit. */
const ACTION = ":not([data-ending-style]):not([inert]) .basalt-toast-action";

/**
 * F6 lands on the action the spoken hint promised ("Retry is available. Press F6 to reach it."): the action of the toast whose action was announced last,
 * else the newest toast's action (the stack is newest first). Base UI's F6 focuses the stack's region, the one way a key reaches it (it is not a tab stop);
 * a press on its background is not a key, and is not focus-visible, so it moves nothing. With no action to reach, focus stays on the region, as before.
 * Tab, Shift+Tab and the way back to the page are Base UI's.
 */
function toAction(c: Controller | null, event: React.FocusEvent<HTMLDivElement>) {
  const region = event.currentTarget;
  if (event.target !== region || !region.matches(":focus-visible")) return;
  const promised = c?.promised ? region.querySelector<HTMLElement>(`.basalt-toast[data-toast-id="${CSS.escape(c.promised)}"]${ACTION}`) : null;
  (promised ?? region.querySelector<HTMLElement>(`.basalt-toast${ACTION}`))?.focus({ preventScroll: true });
}

function ToastStack({ column }: { column?: React.RefObject<HTMLElement | null> }) {
  const controller = React.useContext(ControllerContext);
  const away = useAway();
  // The stack is fixed to the window's bottom: while an on-screen keyboard is up it sits above the keyboard.
  useScreenKeyboardLayout();
  const { toasts } = BaseToast.useToastManager();
  const right = useColumnRight(column, toasts.length > 0);
  return (
    <BaseToast.Viewport
      className="basalt-toast-viewport"
      style={right === undefined ? undefined : ({ "--basalt-toast-right": `${right}px` } as React.CSSProperties)}
      data-away={away ? "" : undefined}
      // The stack is a named region for F6, but not a live one: the text-only regions above announce the results.
      aria-live="off"
      onFocus={(event) => toAction(controller, event)}
      render={(props, state) => (
        <ExpandedContext.Provider value={state.expanded}>
          <div {...props} />
        </ExpandedContext.Provider>
      )}
    >
      <AwayContext.Provider value={away}>
        <ToastList />
      </AwayContext.Provider>
    </BaseToast.Viewport>
  );
}

const AwayContext = /* @__PURE__ */ React.createContext(false);

/**
 * Whether nobody can be looking: the window is not focused, or the tab is hidden. Base UI holds its own clocks for a blurred
 * window; Basalt's clocks hold for both, so the drain line and the timer stay in step.
 *
 * It watches for as long as the stack is mounted, not only while a toast is on screen: a blur that came before the first toast
 * is still a blur when it arrives, so that toast starts with a paused line and a paused clock, never one without the other. The
 * tab's visibility is read afresh when the watch starts.
 */
function useAway() {
  const [blurred, setBlurred] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    let refocus = 0;
    const blur = (event: Event) => {
      if (event.target !== window) return;
      window.clearTimeout(refocus);
      setBlurred(true);
    };
    const focus = (event: FocusEvent) => {
      if (event.relatedTarget) return;
      // After focus events have settled.
      refocus = window.setTimeout(() => setBlurred(false), 0);
    };
    const visibility = () => setHidden(document.visibilityState === "hidden");
    visibility();
    window.addEventListener("blur", blur, true);
    window.addEventListener("focus", focus, true);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(refocus);
      window.removeEventListener("blur", blur, true);
      window.removeEventListener("focus", focus, true);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return blurred || hidden;
}

/**
 * A toast's own clock. It runs for `ms` (0 keeps the toast) and restarts when `restart` changes. It stops while `paused` and
 * resumes with what was left, so repeated pauses never hand a toast extra time.
 */
function useToastTimer(ms: number, restart: number, paused: boolean, done: () => void) {
  const remaining = React.useRef(ms);
  const sequence = React.useRef("");
  const finish = React.useRef(done);
  finish.current = done;
  React.useEffect(() => {
    const lap = `${ms}:${restart}`;
    if (sequence.current !== lap) {
      sequence.current = lap;
      remaining.current = ms;
    }
    if (ms <= 0 || paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => finish.current(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [ms, restart, paused]);
}

// Under 720 the stack hangs from the bar (DECISIONS 274), so a toast is swiped away upward, toward the edge it came from; from 720, downward.
const SWIPE_PHONE = ["up", "right"] as const;
const SWIPE_WIDE = ["down", "right"] as const;

function ToastList() {
  const { toasts } = BaseToast.useToastManager<ToastData>();
  const phone = useMediaQuery(`(width < ${breakpoint.md}px)`);
  const front = toasts.find((toast) => toast.transitionStatus !== "ending");
  return toasts.map((toast) => <ToastItem key={toast.id} toast={toast} front={toast === front} swipe={phone ? SWIPE_PHONE : SWIPE_WIDE} />);
}

/**
 * Whether the toast's action is waiting for its answer: from a press whose handler returned a promise until it settles, either way (the `busy` of the
 * Button's wait, not its ring's tail). While it is, the controller does not close the toast to make room.
 */
function useActionBusy(c: Controller | null, id: string, onClick: ToastAction["onClick"] | undefined) {
  const [pending, setPending] = React.useState(0);
  // The count the controller reads: written in the press itself, so a toast shown in the same task as the press already finds this one waiting.
  const waiting = React.useRef(0);
  React.useEffect(() => () => { c?.busy.delete(id); }, [c, id]);
  // The Button calls this only when it is not already waiting, so each accepted press is counted once.
  const press = onClick
    ? () => {
        const result = onClick();
        if (isThenable(result)) {
          waiting.current += 1;
          c?.busy.add(id);
          setPending((n) => n + 1);
          const done = () => {
            waiting.current -= 1;
            if (waiting.current === 0) c?.busy.delete(id);
            setPending((n) => n - 1);
          };
          // Counted out either way; the Button's own wait passes a rejection on, so it is not swallowed.
          result.then(done, done);
        }
        return result;
      }
    : undefined;
  return { busy: pending > 0, press };
}

function ToastItem({ toast, front, swipe }: { toast: ReturnType<typeof BaseToast.useToastManager<ToastData>>["toasts"][number]; front: boolean; swipe: readonly ("up" | "down" | "right")[] }) {
  const { close: closeToast } = BaseToast.useToastManager();
  const controller = React.useContext(ControllerContext);
  const expanded = React.useContext(ExpandedContext);
  const away = React.useContext(AwayContext);
  const data = toast.data as ToastData;
  const status = statusOf(data.options);
  const running = !!data.options.running;
  const lifetime = lifetimeOf(data.options);
  const action = data.options.action;
  const actionWait = useActionBusy(controller, toast.id, action?.onClick);
  // The line stays while the toast leaves (it has run out by then); the clock does not. Both pause while the action waits, and resume with what was left.
  useToastTimer(toast.transitionStatus === "ending" ? 0 : lifetime, data.stamp, expanded || away || actionWait.busy, () => closeToast(toast.id));
  const Mark = status === "neutral" ? null : MARKS[status];
  return (
    <BaseToast.Root
      toast={toast}
      // A toast is a named group, not a dialog: Base UI's root says `dialog` (`alertdialog` when urgent) without being modal, and an app asking
      // "is a dialog open" would count every toast. It keeps its name, its description and its place in the tab order.
      role="group"
      aria-modal={undefined}
      swipeDirection={[...swipe]}
      data-level={1}
      data-toast-id={toast.id}
      data-front={front ? "" : undefined}
      data-status={status}
      data-running={running ? "" : undefined}
      data-action-busy={actionWait.busy ? "" : undefined}
      className="basalt-toast"
    >
      {lifetime > 0 ? <span key={data.stamp} className="basalt-toast-drain" style={{ animationDuration: `${lifetime}ms` }} /> : null}
      <BaseToast.Content className="basalt-toast-content">
        {/* The mark seat: 16px, kept from running to the result so the title never moves. Neutral has none unless it ran. */}
        {data.seat ? (
          <span className="basalt-toast-seat" aria-hidden="true">
            {running ? <Spinner variant="braille" size={16} /> : Mark ? <Icon icon={Mark} size={16} /> : null}
          </span>
        ) : null}
        <div className="basalt-toast-text">
          <BaseToast.Title className="basalt-toast-title">
            {toast.title}
            {data.count > 1 ? (
              <>
                <span className="basalt-toast-count" aria-hidden="true">×{data.count}</span>
                {/* Read in place and drawn at no size, so the title's text reads "Saved, 2 times" and not "Saved , 2 times". */}
                <span className="basalt-said">, {data.count} times</span>
              </>
            ) : null}
          </BaseToast.Title>
          <BaseToast.Description className="basalt-toast-description" />
        </div>
        {/* The action is a Basalt Button (secondary, xs), so it waits for a promise as every Button does. It keeps its element while an action is
            there before and after an update, its label rewritten, so focus on it survives the update. */}
        {action ? (
          <BaseToast.Action
            className="basalt-toast-action"
            render={(props) => (
              <Button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: React.Ref<HTMLButtonElement> })} variant="secondary" size="xs" onClick={actionWait.press}>
                {action.label}
              </Button>
            )}
          >
            {action.label}
          </BaseToast.Action>
        ) : null}
        <BaseToast.Close className="basalt-button basalt-toast-close" data-variant="ghost" data-size="xs" data-icon-only="" aria-label="Dismiss">
          <Icon icon={CloseGlyph} size={16} />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  );
}

export interface ToastApi {
  /** Show a toast. Returns its id (also for a toast waiting for room), for `update` and `close`. */
  show: (options: ToastOptions) => string;
  /** Move a toast to its next state, in place. This is how running work reaches its result. */
  update: (id: string, patch: ToastUpdate) => void;
  close: (id: string) => void;
  /** Running work, then its result, as one toast. */
  promise: <Value>(work: Promise<Value>, options: ToastPromiseOptions<Value>) => Promise<Value>;
  /**
   * Say that the page changed without a reload, for an app whose router does not use `useRouteFocus` (which says it already). Toasts whose only
   * home was the page close; every other toast stays.
   */
  pageChanged: () => void;
}

/**
 * Show a toast from anywhere inside `ToastProvider`. The returned object is stable across renders, so it is safe in effect
 * dependencies.
 */
export function useToast(): ToastApi {
  const controller = React.useContext(ControllerContext);
  if (!controller) throw new Error("useToast needs a ToastProvider above it.");
  return React.useMemo<ToastApi>(
    () => ({
      show: (options) => show(controller, options),
      update: (id, patch) => update(controller, id, patch),
      close: (id) => close(controller, id),
      promise: (work, options) => promise(controller, work, options),
      pageChanged,
    }),
    [controller],
  );
}
