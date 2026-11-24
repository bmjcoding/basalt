import * as React from "react";

import { WAIT_MIN_SHOWN_MS, WAIT_SHOW_AFTER_MS } from "./constants";

// A control that asks the server is busy until the answer, and never sends twice (DECISIONS 255, 260). A press whose handler returns a promise
// waits for it: further presses are ignored, the control is `aria-busy` and keeps its focus, label and width, and its mark (the ring, or a
// TextButton's breathing underline) shows only once the wait has run WAIT_SHOW_AFTER_MS, then stays at least WAIT_MIN_SHOWN_MS. Nothing here runs at
// import: every part is a hook or a function.

/** Whether a value is a promise, or anything with a `then` that behaves as one. */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as { then?: unknown } | null | undefined)?.then === "function";
}

/**
 * Whether a wait's mark shows: not until the wait has run `showAfter` (300ms, so a quick answer shows nothing), and once shown, for at
 * least `minShown` (400ms, so it never blinks), the shaped skeleton's timings (DECISIONS 247, 248). A wait that starts again while its mark is
 * still up keeps it up. For an app that draws a wait of its own, so it keeps the same rule.
 */
export function useWaitMark(waiting: boolean, showAfter: number = WAIT_SHOW_AFTER_MS, minShown: number = WAIT_MIN_SHOWN_MS): boolean {
  const [shown, setShown] = React.useState(false);
  const since = React.useRef(0);
  React.useEffect(() => {
    if (waiting === shown) return undefined;
    // One timer either way: the mark comes after `showAfter`, and goes once it has been up `minShown`.
    const timer = window.setTimeout(() => {
      since.current = performance.now();
      setShown(waiting);
    }, waiting ? showAfter : minShown - (performance.now() - since.current));
    return () => window.clearTimeout(timer);
  }, [waiting, shown, showAfter, minShown]);
  return shown;
}

/** Wait for a promise: count it in, and out when it settles. A rejection is passed on, never swallowed, so an app that did not catch it still hears it as unhandled. */
export function waitFor(result: PromiseLike<unknown>, count: (step: number) => void) {
  count(1);
  void Promise.resolve(result).finally(() => count(-1));
}

/**
 * Start a loop on the page's one clock: a mark that breathes (a written field's fill, a busy TextButton's underline) starts at the document
 * timeline's origin, as the spinners do, so two of them on a page are in step. Only CSS animations are moved; a transition is left to run.
 */
export function useLoopClock(ref: React.RefObject<Element | null>, running: boolean) {
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!running || !element || typeof element.getAnimations !== "function") return;
    for (const animation of element.getAnimations({ subtree: true })) {
      const name = (animation as Animation & { animationName?: string }).animationName;
      if (name?.startsWith("basalt-") && animation.effect?.getComputedTiming().iterations === Infinity) animation.startTime = 0;
    }
  }, [ref, running]);
}

/**
 * A wait held for a control by the part it belongs to: a `MenuTrigger` while an item of its menu waits, so the trigger is busy and the menu
 * does not open again until the answer. `false` outside one.
 */
export const WaitContext: React.Context<boolean> = /* @__PURE__ */ React.createContext(false);

/** The event a `Form` sends on its own element when it starts or stops waiting, so a submit button outside it (`form="…"`) hears it too. */
export const FORM_WAIT_EVENT = "basalt-form-wait";

/**
 * Whether the form a submit button submits is waiting for its answer. Read from the element's own `form` (the one it sits in, or the one its
 * `form` attribute names) each time any form says its wait changed, so it holds for a button in a dialog's foot as well as one inside the form,
 * and for a form that is replaced (a keyed `Form` remounted mid-wait): the button reads whichever form it now belongs to. Only a submit button
 * listens.
 */
function useFormWait(element: React.RefObject<HTMLButtonElement | null>, submits: boolean, formId: string | undefined) {
  const [waiting, setWaiting] = React.useState(false);
  React.useEffect(() => {
    if (!submits) return undefined;
    const read = () => setWaiting(Boolean(element.current?.form?.hasAttribute("data-waiting")));
    read();
    document.addEventListener(FORM_WAIT_EVENT, read);
    return () => {
      document.removeEventListener(FORM_WAIT_EVENT, read);
      setWaiting(false);
    };
  }, [element, submits, formId]);
  return waiting;
}

/** Tell every submit button on the page that a form's wait changed (it started, ended, or the form came or went). */
export function formWaitChanged() {
  document.dispatchEvent(new Event(FORM_WAIT_EVENT));
}

type Press<E> = (event: E) => unknown;

/**
 * The press handler of an element given as `render` (`<Button render={<button onClick={save} />}>`) is taken into the button's own press, so the
 * wait guards it too: Base UI would otherwise call it before the button's guard. Both are called, the element's first (the order Base UI kept), and
 * the press waits for whichever returns a promise (for both, when both do: until both have settled, so one failing never frees a press while the other
 * is still being answered; the first failure is then raised).
 */
export function takeClick<R, E>(render: R, onClick: Press<E> | undefined): [R, Press<E> | undefined] {
  const own = React.isValidElement(render) ? (render.props as { onClick?: Press<E> }).onClick : undefined;
  if (!own) return [render, onClick];
  return [React.cloneElement(render as React.ReactElement<{ onClick?: unknown }>, { onClick: undefined }) as R, (event) => {
    const first = own(event);
    const second = onClick?.(event);
    if (!isThenable(first)) return second;
    if (!isThenable(second)) return first;
    return Promise.allSettled([first, second]).then((settled) => {
      const failed = settled.find((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failed) throw failed.reason;
      return settled.map((result) => (result as PromiseFulfilledResult<unknown>).value);
    });
  }];
}

/** Join an app's ref to the part's own. */
export function useJoinedRef<T>(outer: React.Ref<T> | undefined, inner: React.RefObject<T | null>): React.RefCallback<T> {
  return React.useCallback((node: T | null) => {
    inner.current = node;
    if (typeof outer === "function") return outer(node);
    if (outer) (outer as React.RefObject<T | null>).current = node;
    return undefined;
  }, [outer, inner]);
}

export interface PressWaitOptions {
  /** The app's own busy flag: shown at once, with no delay, and it wins. */
  loading: boolean;
  /** Off: a promise from the handler is not waited for (each press calls it). */
  waitForAnswer: boolean;
  /** The button submits its form, so the form's own wait is its wait. */
  submits: boolean;
  /** The `form` attribute, when the button submits a form it is not inside. */
  form: string | undefined;
}

export interface PressWait<E> {
  /** Presses are ignored and the control is `aria-busy` and `aria-disabled`: from the press, before the mark shows, until the answer (not the mark's tail). */
  busy: boolean;
  /** The mark shows (`data-loading`): at once for `loading`, after the wait has run 300ms otherwise, and for at least 400ms once shown. Look only. */
  shown: boolean;
  /** The handler to give the element: it ignores a press while busy (stopping a submit or a link too) and waits for a promise it gets back. */
  press: (event: E) => void;
  /** Give the element this ref, so a submit button finds its form. */
  ref: React.RefObject<HTMLButtonElement | null>;
}

/** A press that waits by itself: the rule every button keeps (`Button`, `IconButton`, `TextButton`). */
export function usePressWait<E extends { preventDefault(): void }>(onClick: Press<E> | undefined, { loading, waitForAnswer, submits, form }: PressWaitOptions): PressWait<E> {
  const ref = React.useRef<HTMLButtonElement | null>(null);
  const [pending, setPending] = React.useState(0);
  const outer = React.useContext(WaitContext);
  const formWaiting = useFormWait(ref, submits && waitForAnswer, form);
  const waiting = pending > 0 || outer || formWaiting;
  const mark = useWaitMark(waiting);
  // The mark keeps its 400ms (a look), but presses, aria-busy and aria-disabled end with the answer: a Retry pressed while the ring finishes goes through.
  const busy = loading || waiting;
  // The press reads the latest busy, and a press that starts a wait marks it at once: five presses in one task call the handler once.
  const busyNow = React.useRef(busy);
  busyNow.current = busy;
  const press = (event: E) => {
    if (busyNow.current) {
      // Busy is not activation: stop a form submit or a link's navigation as well as the handler.
      event.preventDefault();
      return;
    }
    const result = onClick?.(event);
    if (!waitForAnswer || !isThenable(result)) return;
    busyNow.current = true;
    waitFor(result, (step) => setPending((n) => n + step));
  };
  return { busy, shown: loading || mark, press, ref };
}

/**
 * What an empty `value` shows while a field is written into: `keep` (the default) keeps the text that was there until the next text arrives, so the field never blanks between
 * two drafts; `clear` shows it empty, for an app that clears the field on purpose while the busy look stays.
 */
export type WritingEmpty = "keep" | "clear";

/**
 * A field being written into by something else (an agent's draft, a summary written again): `busy` while it is written (read-only and `aria-busy`,
 * ending with the writing, so a keystroke in the look's tail is typed), `shown` once the writing has run 300ms and for at least 400ms (the look,
 * `data-writing`), and the text to show. Text
 * replaces text: while it is written, an empty value keeps the text that was there until the next text arrives, so the field is never blanked
 * between two drafts, and each update is painted as it comes, in the same ink, with no fade (a fade on every update is the flashing this stops).
 * With `empty` "clear", an empty value while it is written is shown empty: the busy look stays, and the field is cleared.
 */
export function useWriting<V>(writing: boolean, value: V, element: React.RefObject<Element | null>, empty?: WritingEmpty): { busy: boolean; shown: boolean; value: V } {
  const shown = useWaitMark(writing);
  const kept = React.useRef(value);
  const text = writing && empty !== "clear" && value === "" ? kept.current : value;
  React.useEffect(() => {
    kept.current = text;
  });
  useLoopClock(element, shown);
  return { busy: writing, shown, value: text };
}
