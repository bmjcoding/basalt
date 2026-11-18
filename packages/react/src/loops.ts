import * as React from "react";

// A page can hold every loop Basalt draws (braille, the ring, a busy Button's ring, the indeterminate Progress bar,
// Sparkline's loading line, Skeleton's pulse and the page's one ambient loop) with one attribute on the root: `<html data-loops="held">`. The
// stylesheet does the holding (`animation: none`); this module keeps the state, the way keyboard.ts keeps the
// keyboard's. The hold is stored for this app's origin in this browser (`localStorage` is per origin) and a `storage`
// event carries it across the app's tabs. Nothing here runs at import: the listener is installed by the first
// component that calls `useLoops`, and the store is allocated then.

const KEY = "basalt-loops";
const HELD = "held";
// Allocated by the first subscription, never at import.
let subscribers: Set<() => void> | undefined;
let installed = false;

const isHeld = () => document.documentElement.getAttribute("data-loops") === HELD;

/**
 * Releasing a hold jumps to now: every Basalt loop rejoins the shared clock (its `startTime` goes back to the
 * timeline's origin), so spinners mounted at different moments tick in phase. Nothing resumes from where it stopped.
 * `getAnimations` flushes style first, so the loops are already running again when it returns them.
 */
function rejoinClock() {
  if (typeof document.getAnimations !== "function") return;
  for (const animation of document.getAnimations()) {
    const name = (animation as Animation & { animationName?: string }).animationName;
    if (name?.startsWith("basalt-") && animation.effect?.getComputedTiming().iterations === Infinity) animation.startTime = 0;
  }
}

function apply(held: boolean) {
  const root = document.documentElement;
  if (held) root.setAttribute("data-loops", HELD);
  else root.removeAttribute("data-loops");
  if (!held) rejoinClock();
  for (const notify of subscribers ?? []) notify();
}

function onStorage(event: StorageEvent) {
  // A null key is `localStorage.clear()`, which also releases the hold.
  if (event.key !== null && event.key !== KEY) return;
  const held = event.newValue === HELD;
  if (held !== isHeld()) apply(held);
}

function install() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  try {
    // A stored hold the bootstrap did not apply (an app without the head line) is applied here, once.
    if (localStorage.getItem(KEY) === HELD && !isHeld()) document.documentElement.setAttribute("data-loops", HELD);
  } catch { /* storage can be blocked; the hold then lasts for this page */ }
  window.addEventListener("storage", onStorage);
}

function subscribe(notify: () => void) {
  install();
  (subscribers ??= new Set()).add(notify);
  return () => { subscribers?.delete(notify); };
}

function setHeld(held: boolean) {
  if (typeof document === "undefined") return;
  try {
    if (held) localStorage.setItem(KEY, HELD);
    else localStorage.removeItem(KEY);
  } catch { /* storage can be blocked; the hold still applies to this page */ }
  if (held !== isHeld()) apply(held);
}

const snapshot = () => isHeld();

export interface LoopsState {
  /** Whether every Basalt loop is held. False on the server and until the first client render reads the page. */
  held: boolean;
  /** Holds or releases every loop, for this app in this browser. Releasing jumps every loop to now. */
  setHeld: (held: boolean) => void;
}

/**
 * The hold on every Basalt loop. `held` is true while `<html data-loops="held">` is set, which the stylesheet turns into
 * `animation: none` on braille, the ring, a busy Button's ring, the indeterminate Progress bar, Sparkline's loading line,
 * Skeleton's pulse and the ambient marks (held at full opacity), portals included. `LoopsToggle` is the control. It is independent of reduced motion, and it outranks it. The server renders
 * "running". Read `held` for text that rewrites itself (an elapsed time, a streaming count); nothing is announced when it
 * changes, because the control speaks its own state.
 */
export function useLoops(): LoopsState {
  const held = React.useSyncExternalStore(subscribe, snapshot, () => false);
  return React.useMemo(() => ({ held, setHeld }), [held]);
}
