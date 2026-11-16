import * as React from "react";

import { glideTiming } from "./motion";
import { join } from "./utils";

// Items that move to their places (DECISIONS 136 D; docs/motion.md, "Items that move to their places"). A list or a grid that is filtered or
// sorted (a table keeps the still-table rule and is not part of this): each item that stays moves by transform from where it is drawn
// to where it now belongs, over `duration-slow` on `ease-out`, whatever the distance; an arrival fades in place over `duration-slow`; a
// leaver is the same element, out of the flow where it stood, inert and painted under the movers, fading over 0.75 of `duration-fast` on
// `ease-in`; a second change starts every item from where it is drawn, opacity included; and the box's height glides on the same clock.
// No item is ever replaced: every item stays mounted, and an item that is not shown is `hidden`. Nothing here runs at import.

/** Past this many items that would move on screen, a change lands at once. A chosen limit, not a measured budget. */
export const REFLOW_BOUND = 48;

type Phase = "in" | "leaving" | "out";

interface Seat {
  register: (key: string, element: HTMLElement | null) => void;
  phase: (key: string) => Phase;
}
const SeatContext = React.createContext<Seat | null>(null);

export interface ReflowReport {
  /** The ids shown after the change, in the order drawn. */
  order: readonly string[];
  /** Items that stay and moved, items that arrived and items that left, as animated. */
  moved: number;
  faded: number;
  /** Items on screen that would move or fade (an item that stays where it was is not one): the number compared with `REFLOW_BOUND`. */
  onScreen: number;
  /** True when the change landed at once: reduced motion, or more than `REFLOW_BOUND` items. */
  atOnce: boolean;
  /** The element focus moved to, when focus was in an item that left. */
  focusMovedTo: HTMLElement | null;
}

export interface ReflowProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The ids of the items shown, in the order they are drawn. An item that is not here is `hidden` (after its exit). */
  order: readonly string[];
  /** The tag: `ul` or `ol` (with `ReflowItem as="li"`) for a list, `div` for a grid of cards. */
  as?: "div" | "ul" | "ol";
  /** `list` (rows that may cross, so they are opaque while they move) or `grid` (cards, which have their own surface). */
  layout?: "list" | "grid";
  /**
   * Where focus goes when it was in an item that left and no item that stays is drawn after or before it: the result line. It gets
   * `tabindex="-1"` when it is focused this way. Focus never scrolls the page.
   */
  fallbackFocus?: React.RefObject<HTMLElement | null>;
  /** Called after every change with what happened, for a page that reports it. */
  onReflow?: (report: ReflowReport) => void;
  /** `ReflowItem`s, in any order: `order` decides how they are drawn. */
  children: React.ReactNode;
}

export interface ReflowItemProps extends Omit<React.ComponentProps<"div">, "id"> {
  /** The item's id, as `Reflow`'s `order` names it. Keep it stable: an item is never replaced. */
  itemKey: string;
  /** The tag. `li` inside `Reflow as="ul"`. */
  as?: "div" | "li";
}

function firstFocusable(element: HTMLElement): HTMLElement | null {
  if (element.matches('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')) return element;
  return element.querySelector<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
}

const inView = (rect: DOMRect) => rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
const sameOrder = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((key, index) => key === b[index]);
const opacityOf = (element: Element) => Number.parseFloat(getComputedStyle(element).opacity);

interface Plan {
  first: Map<string, { rect: DOMRect; opacity: number }>;
  box: DOMRect;
  height: number;
  /** The order drawn before this change. */
  before: readonly string[];
  holder: string | null;
  active: HTMLElement | null;
}

/**
 * A list or a grid whose items move to their places when `order` changes (a filter, a sort). Render every item, always, as a
 * `ReflowItem`: an item that leaves is hidden and an item that returns is shown, and neither is ever created or destroyed. The first
 * render is at rest. Under reduced motion items and the box take their places at once and arrivals fade over 100ms.
 */
export function Reflow({ order, as: Tag = "div", layout = "grid", fallbackFocus, onReflow, className, children, ...props }: ReflowProps) {
  const boxRef = React.useRef<HTMLElement | null>(null);
  const elements = React.useRef(new Map<string, HTMLElement>());
  const phases = React.useRef(new Map<string, Phase>());
  // What the app had inline on an item before a leaving item was pinned where it stood: put back when the item is not leaving, so an app's own sizes are never cleared.
  const own = React.useRef(new Map<string, [string, string, string, string]>());
  const committed = React.useRef<readonly string[]>(order);
  const plan = React.useRef<Plan | null>(null);
  const [, redraw] = React.useState(0);
  const latest = React.useRef({ fallbackFocus, onReflow });
  latest.current = { fallbackFocus, onReflow };

  // ---- Render: what is drawn now is still on the page, so this is where "first" is read (a pure read of layout) ----
  const items = React.Children.toArray(children).filter((child): child is React.ReactElement<ReflowItemProps> => React.isValidElement(child));
  const keys = items.map((item) => item.props.itemKey);
  const shown = new Set(order);
  // The phase of every item: shown ones are in; one that was drawn and is no longer is leaving until its exit ends; the rest are out.
  const drawnNow = new Map<string, Phase>();
  for (const key of keys) {
    const was = phases.current.get(key) ?? (committed.current.includes(key) ? "in" : "out");
    drawnNow.set(key, shown.has(key) ? "in" : was === "out" ? "out" : "leaving");
  }
  const changed = !sameOrder(order, committed.current);
  const box = boxRef.current;
  if (changed && box && typeof window !== "undefined") {
    const first = new Map<string, { rect: DOMRect; opacity: number }>();
    for (const [key, element] of elements.current) {
      if ((phases.current.get(key) ?? "in") === "out" || element.hidden) continue;
      first.set(key, { rect: element.getBoundingClientRect(), opacity: opacityOf(element) });
    }
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let holder: string | null = null;
    if (active) for (const [key, element] of elements.current) if (element.contains(active)) holder = key;
    plan.current = { first, box: box.getBoundingClientRect(), height: box.getBoundingClientRect().height, before: committed.current, holder, active };
  }
  for (const [key, phase] of drawnNow) phases.current.set(key, phase);

  const seat = React.useMemo<Seat>(() => ({
    register: (key, element) => { if (element) elements.current.set(key, element); else elements.current.delete(key); },
    phase: (key) => phases.current.get(key) ?? "in",
  }), []);

  // Shown items first, in the order drawn; then the rest, where they were.
  const index = new Map(order.map((key, position) => [key, position] as const));
  const sorted = items
    .map((item) => React.cloneElement(item, { key: item.props.itemKey }))
    .sort((a, b) => {
      const ia = index.get(a.props.itemKey);
      const ib = index.get(b.props.itemKey);
      if (ia !== undefined && ib !== undefined) return ia - ib;
      return ia !== undefined ? -1 : ib !== undefined ? 1 : 0;
    });

  // ---- Commit: the same elements, reordered. Now play ----
  const orderKey = order.join("\u0000");
  React.useLayoutEffect(() => {
    const current = plan.current;
    plan.current = null;
    const container = boxRef.current;
    const before = committed.current;
    committed.current = order;
    if (!current || !container) return undefined;
    return run(container, current, order, before);
  }, [orderKey]);

  // Gives a pinned item back what the app had inline: nothing is written to an item that was never pinned.
  function unpin(key: string, element: HTMLElement) {
    const saved = own.current.get(key);
    if (!saved) return;
    own.current.delete(key);
    [element.style.left, element.style.top, element.style.width, element.style.height] = saved;
  }

  function run(container: HTMLElement, current: Plan, next: readonly string[], before: readonly string[]) {
    const { duration, curve } = glideTiming();
    const style = getComputedStyle(document.documentElement);
    const fast = Number.parseFloat(style.getPropertyValue("--basalt-duration-fast")) || 100;
    const easeOut = `cubic-bezier(${curve.join(", ")})`;
    const easeIn = style.getPropertyValue("--basalt-ease-in").trim() || "cubic-bezier(0.4, 0, 1, 1)";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextSet = new Set(next);

    // Stop every move in flight: each item starts again from `first`, which includes its transform and its opacity.
    for (const element of elements.current.values()) for (const animation of element.getAnimations()) animation.cancel();
    for (const animation of container.getAnimations()) animation.cancel();
    container.removeAttribute("data-moving");

    // Leavers: out of the flow where they stood, inert, under the movers (the stylesheet does the painting).
    const leaving: string[] = [];
    for (const [key, element] of elements.current) {
      if (nextSet.has(key)) {
        unpin(key, element);
        continue;
      }
      const was = current.first.get(key);
      if (!was) { phases.current.set(key, "out"); continue; }
      if (!own.current.has(key)) own.current.set(key, [element.style.left, element.style.top, element.style.width, element.style.height]);
      element.style.left = `${was.rect.left - current.box.left - container.clientLeft}px`;
      element.style.top = `${was.rect.top - current.box.top - container.clientTop}px`;
      element.style.width = `${was.rect.width}px`;
      element.style.height = `${was.rect.height}px`;
      leaving.push(key);
    }

    // Focus: the active element lost its place if the browser moved its node; an item that leaves hands focus on.
    let focusMovedTo: HTMLElement | null = null;
    if (current.holder !== null) {
      if (nextSet.has(current.holder)) {
        if (current.active && current.active.isConnected && document.activeElement !== current.active) current.active.focus({ preventScroll: true });
      } else {
        const at = before.indexOf(current.holder);
        // The order the reader saw, not the order the items were made in.
        const after = before.slice(at + 1).find((key) => nextSet.has(key));
        const behind = before.slice(0, Math.max(at, 0)).reverse().find((key) => nextSet.has(key));
        const target = (after ?? behind) !== undefined ? firstFocusable(elements.current.get((after ?? behind) as string) as HTMLElement) : null;
        const fallback = latest.current.fallbackFocus?.current ?? null;
        if (target) { target.focus({ preventScroll: true }); focusMovedTo = target; }
        else if (fallback) {
          if (!fallback.hasAttribute("tabindex")) fallback.setAttribute("tabindex", "-1");
          fallback.focus({ preventScroll: true });
          focusMovedTo = fallback;
        }
      }
    }

    // Last: where each item now belongs; and how many are on screen before or after.
    const last = new Map<string, DOMRect>();
    for (const key of next) { const element = elements.current.get(key); if (element) last.set(key, element.getBoundingClientRect()); }
    const height = container.getBoundingClientRect().height;
    let onScreen = 0;
    // The bound counts what would move or fade on screen, not every item that is drawn there: an item that stays where it was is not one.
    for (const key of next) {
      const was = current.first.get(key);
      const to = last.get(key);
      if (!to || !((was && inView(was.rect)) || inView(to))) continue;
      if (!was || was.opacity < 1 || Math.abs(was.rect.left - to.left) > 0.5 || Math.abs(was.rect.top - to.top) > 0.5) onScreen++;
    }
    for (const key of leaving) if (inView((current.first.get(key) as { rect: DOMRect }).rect)) onScreen++;
    const atOnce = reduced || onScreen > REFLOW_BOUND;
    let moved = 0;
    let faded = 0;
    const animations: Animation[] = [];

    for (const key of next) {
      const element = elements.current.get(key);
      const to = last.get(key);
      if (!element || !to) continue;
      const was = current.first.get(key);
      const visible = (was && inView(was.rect)) || inView(to);
      if (was) {
        const dx = was.rect.left - to.left;
        const dy = was.rect.top - to.top;
        if (!reduced && !atOnce && visible && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
          animations.push(element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration, easing: easeOut }));
          moved++;
        }
        // A leaver asked back, or an item caught mid-fade, keeps the opacity it is drawn at.
        if (was.opacity < 1 && !atOnce && visible) animations.push(element.animate([{ opacity: was.opacity }, { opacity: 1 }], { duration, easing: easeOut }));
      } else if (visible && !(onScreen > REFLOW_BOUND)) {
        // An arrival fades in where it belongs. Under reduced motion `duration-slow` is 100ms and nothing else moves.
        animations.push(element.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: easeOut }));
        faded++;
      }
    }

    // An exit is shorter than an entry: 0.75 of duration-fast, so a leaver has gone before a mover crosses where it stood.
    const out = (key: string) => {
      phases.current.set(key, "out");
      const element = elements.current.get(key);
      if (element) unpin(key, element);
    };
    let pending = 0;
    for (const key of leaving) {
      const element = elements.current.get(key) as HTMLElement;
      const was = current.first.get(key) as { rect: DOMRect; opacity: number };
      if (reduced || atOnce || !inView(was.rect)) { out(key); pending++; continue; }
      const animation = element.animate([{ opacity: was.opacity }, { opacity: 0 }], { duration: fast * 0.75 * was.opacity, easing: easeIn, fill: "forwards" });
      animations.push(animation);
      faded++;
      animation.finished.then(() => {
        if (phases.current.get(key) !== "leaving") return;
        animation.cancel();
        out(key);
        redraw((n) => n + 1);
      }, () => { /* asked back, or a newer change took over */ });
    }
    if (pending) redraw((n) => n + 1);

    // The box: its height glides on the same clock, clipped at its edge with a space-1-5 margin so a +2 ring stays whole.
    if (!reduced && !atOnce && Math.abs(height - current.height) > 0.5) {
      container.setAttribute("data-moving", "");
      const glide = container.animate([{ height: `${current.height}px` }, { height: `${height}px` }], { duration, easing: easeOut });
      animations.push(glide);
      glide.finished.then(() => container.removeAttribute("data-moving"), () => { /* a newer change took over */ });
    }
    if (animations.length) {
      container.setAttribute("data-flowing", "");
      Promise.allSettled(animations.map((a) => a.finished)).then(() => {
        if (!container.getAnimations({ subtree: true }).some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity)) container.removeAttribute("data-flowing");
      });
    }
    latest.current.onReflow?.({ order: next, moved, faded, onScreen, atOnce, focusMovedTo });
    return undefined;
  }

  return (
    <SeatContext.Provider value={seat}>
      {React.createElement(Tag as string, {
        ...props,
        ref: boxRef,
        "data-layout": layout,
        className: join("basalt-reflow", className),
      }, sorted)}
    </SeatContext.Provider>
  );
}

/** One item of a `Reflow`: the same element for as long as the page lives. */
export function ReflowItem({ itemKey, as: Tag = "div", className, ...props }: ReflowItemProps) {
  const seat = React.useContext(SeatContext);
  const phase = seat?.phase(itemKey) ?? "in";
  const ref = React.useCallback((element: HTMLElement | null) => seat?.register(itemKey, element), [seat, itemKey]);
  return React.createElement(Tag as string, {
    ...props,
    ref,
    hidden: phase === "out" ? true : props.hidden,
    inert: phase === "leaving" ? true : undefined,
    "data-leaving": phase === "leaving" ? "" : undefined,
    className: join("basalt-reflow-item", className),
  });
}
