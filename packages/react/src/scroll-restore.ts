import * as React from "react";

import type { RouteNavigation } from "./route-focus";

declare const process: { env: { NODE_ENV?: string } };

// Back and Forward put a scroller back where the reader left it, for what the browser cannot restore: a pane that is mounted again, and a window whose
// content arrives after the browser has tried (m7, S4). A position belongs to a history entry and a scroller. The store lives in memory only, is made on
// first use and holds at most 200 positions. Nothing runs when this module loads, and it never sets `history.scrollRestoration`.

/** The window, an element, or a ref to one. `null` and an empty ref mean "not there now", never the window. */
export type RestoreScroller = "window" | HTMLElement | React.RefObject<HTMLElement | null> | null;

export interface UseScrollRestoreOptions {
  /**
   * The history entry's own key, from the router: different for two visits to one address, the same when the reader comes back to an
   * entry (React Router's `location.key`, the Navigation API's `currentEntry.key`, or a key the app stamps into `history.state`).
   * Never the page key you give `useRouteFocus`, and never the address.
   */
  entry: string;
  /** How the app reached this entry. Only "pop" restores. */
  navigation: RouteNavigation;
  /**
   * What scrolls. Leave it out (or give "window") for the window. A pane: `usePaneScroller()` as it is, the value you give a
   * `ListBand`'s `scroller`, an element or a ref. `null`, or a ref with no element, is a scroller that is not there now: the hook
   * waits for it and never uses the window in its place.
   */
  scroller?: RestoreScroller;
  /** Names this scroller among the scrollers of one entry. Default "window". Give one with every element or ref. */
  id?: string;
  /** `false` while what gives the scroller its height is still on its way. Default true. */
  ready?: boolean;
  /** `false` to stand down, with no conditional hook. A pane that follows the page needs none: its scroller is `null`. Default true. */
  enabled?: boolean;
}

interface Position {
  top: number;
  left: number;
}

const LIMIT = 200;
let store: Map<string, Position> | undefined;
let warned = false;

function positions(): Map<string, Position> {
  if (!store) store = new Map();
  return store;
}

// A newer write moves a position to the end, so the one dropped past the limit is the oldest written.
function save(key: string, position: Position): void {
  const map = positions();
  map.delete(key);
  map.set(key, position);
  while (map.size > LIMIT) {
    const oldest = map.keys().next();
    if (oldest.done) break;
    map.delete(oldest.value);
  }
}

type Target = HTMLElement | "window";

// What the option names now. A ref is read when this is called, so it is called in an effect or a frame, never in render.
function resolveScroller(scroller: RestoreScroller | undefined): Target | null {
  if (scroller === undefined || scroller === "window") return "window";
  if (scroller === null) return null;
  if (typeof HTMLElement !== "undefined" && scroller instanceof HTMLElement) return scroller;
  return (scroller as React.RefObject<HTMLElement | null>).current ?? null;
}

function where(target: Target): Position {
  return target === "window" ? { top: window.scrollY, left: window.scrollX } : { top: target.scrollTop, left: target.scrollLeft };
}

function scrollAt(target: Target, position: Position): void {
  const to: ScrollToOptions = { top: position.top, left: position.left, behavior: "instant" };
  if (target === "window") window.scrollTo(to);
  else target.scrollTo(to);
}

const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock", "Fn", "FnLock", "Hyper", "Super", "OS"]);

/**
 * Puts a scroller back where the reader left it on Back and Forward, for a pane the app mounts again and a window whose rows arrive after the browser's
 * own restore. Every entry the hook has shown has a position (zero included), kept current by the scroller's scroll; only a "pop" restores, once the
 * scroller is there and `ready`, at once, and the reader's own wheel, touch, press or key ends a restore still waiting. A replaced entry keeps its
 * position. A document whose content is there at once needs none of this: the browser restores it.
 */
export function useScrollRestore({ entry, navigation, scroller, id, ready = true, enabled = true }: UseScrollRestoreOptions): void {
  if (process.env.NODE_ENV !== "production" && !warned && scroller !== undefined && scroller !== "window" && id === undefined) {
    warned = true;
    console.warn("Basalt useScrollRestore: give `id` with `scroller`, or two scrollers of one entry share a position");
  }
  const [machine] = React.useState(restorer);
  const options = machine.options;
  options.navigation = navigation;
  options.enabled = enabled;
  options.ready = ready;
  options.scroller = scroller;
  options.id = id ?? "window";

  // A change of entry: carry a replaced entry's position, end a restore that belonged to the entry that left, and wait to restore this one on a pop.
  React.useLayoutEffect(() => {
    machine.arrive(entry);
    return machine.stop;
  }, [machine, entry]);

  React.useLayoutEffect(() => {
    machine.settle();
    if (!machine.needsSecondLook()) return undefined;
    // A ref that is still empty after this commit (its element mounts later in the same frame, or in a portal): look once more, and use it at once.
    const again = requestAnimationFrame(machine.settle);
    return () => cancelAnimationFrame(again);
  });

  React.useEffect(() => () => machine.listen(null), [machine]);
}

interface Restorer {
  options: { navigation: RouteNavigation; enabled: boolean; ready: boolean; scroller: RestoreScroller | undefined; id: string };
  arrive(entry: string): void;
  settle(): void;
  stop(): void;
  listen(target: Target | null): void;
  needsSecondLook(): boolean;
}

// One per hook, made in its first render; its handlers are the same functions for the hook's life, so they are added and removed as one.
function restorer(): Restorer {
  const options: Restorer["options"] = { navigation: "push", enabled: true, ready: true, scroller: undefined, id: "window" };
  // The entry that is current (the scroll listener files under it) and the entry before it (a replace carries its position).
  let current: string | undefined;
  // A restore waiting for its scroller and `ready`.
  let pending: Position | null = null;
  let frame = 0;
  let listening: Target | null = null;
  const keyOf = (forEntry: string) => `${forEntry}\n${options.id}`;
  const listenOptions: AddEventListenerOptions = { capture: true, passive: true };
  const kinds = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

  // The reader's own move ends a restore that is still waiting: theirs to keep.
  function reader(event: Event) {
    if (event instanceof KeyboardEvent && MODIFIERS.has(event.key)) return;
    stop();
  }
  function stop() {
    pending = null;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const type of kinds) document.removeEventListener(type, reader, listenOptions);
  }
  function begin(position: Position) {
    stop();
    pending = position;
    for (const type of kinds) document.addEventListener(type, reader, listenOptions);
  }
  function onScroll() {
    if (!listening || current === undefined || !options.enabled || pending) return;
    save(keyOf(current), where(listening));
  }
  function listen(target: Target | null) {
    if (listening === target) return;
    if (listening) (listening === "window" ? window : listening).removeEventListener("scroll", onScroll);
    listening = target;
    if (target) (target === "window" ? window : target).addEventListener("scroll", onScroll, { passive: true });
  }
  function arrive(entry: string) {
    const left = current;
    current = entry;
    const map = positions();
    if (left !== undefined && left !== entry && options.navigation === "replace") {
      const kept = map.get(keyOf(left));
      if (kept) save(keyOf(entry), kept);
    }
    stop();
    const saved = map.get(keyOf(entry));
    if (options.navigation === "pop" && options.enabled && saved) begin(saved);
  }
  // After every commit (and once more on the next frame for a ref that is still empty): restore what waits, follow the scroller, give the entry its
  // first position. Nothing is read or written while the scroller is not there.
  function settle() {
    if (!options.enabled) {
      if (pending) stop();
      listen(null);
      return;
    }
    const target = resolveScroller(options.scroller);
    listen(target);
    if (!target || current === undefined) return;
    const waiting = pending;
    if (waiting) {
      if (!options.ready) return;
      scrollAt(target, waiting);
      // A scroller that cannot reach the recorded top on this commit gets one more try on the next frame, and then it is over, wherever it reached.
      if (Math.abs(where(target).top - waiting.top) > 1) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (pending !== waiting) return;
          scrollAt(target, waiting);
          stop();
        });
      } else stop();
      return;
    }
    // The first position: where the scroller is now, for an entry that has none. It never replaces one, and does not wait for `ready`.
    const key = keyOf(current);
    if (!positions().has(key)) save(key, where(target));
  }
  function needsSecondLook() {
    const scroller = options.scroller;
    return options.enabled && !listening && scroller !== null && scroller !== undefined && scroller !== "window";
  }
  return { options, arrive, settle, stop, listen, needsSecondLook };
}
