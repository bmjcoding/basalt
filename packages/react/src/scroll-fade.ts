import { revealIn, scaleOf, type Sides } from "./scroll-reveal";

export type { Sides } from "./scroll-reveal";

/** Which axes a port fades on: `inline` (left and right), `block` (top and bottom) or `both`. */
export type ScrollFadeAxis = "inline" | "block" | "both";

export interface ScrollFadeOptions {
  /** The axes the port scrolls on. Default `block`. */
  axis?: ScrollFadeAxis;
  /**
   * The element whose box is the content, for a port whose hidden distance is read from rects rather than from its scroll (the tab row, whose port hangs
   * past its column). Without it the distance hidden past each side is read from `scrollLeft` and `scrollTop`.
   */
  content?: HTMLElement;
  /** Clip insets: a length at an edge outside what the reader should see (alpha 0 from the port's edge to the line; the ramp starts at the line). */
  insets?: () => Sides;
  /** Pinned strips: something opaque held inside the port at an edge (alpha 100% over it; the ramp starts at its inner line). A classic scrollbar is added. */
  pinned?: () => Sides;
  /** Sides that never fade, in logical terms on the port's axis (a live log following its end skips its end). */
  skip?: { start?: boolean; end?: boolean };
  /** The ring's room round a protected item: 4 for a +2 ring, 2 for a ring at 0, 0 where the ring or the plate is inside the item's box. */
  ring?: number;
}

export interface ScrollFade {
  /** Measures again and writes what changed: after rows filter, fields hide, or anything else the observers cannot see. */
  refresh(): void;
  /** The item the keys are on while focus stays elsewhere (an `aria-activedescendant` option): brought clear and never under a band. `null` clears it. */
  keep(item: Element | null): void;
  /** Stops watching and removes everything it wrote. */
  stop(): void;
}

const SIDES = ["top", "right", "bottom", "left"] as const;
type Side = (typeof SIDES)[number];
type Four = Record<Side, number>;
const VARS: Record<Side, string> = { top: "t", right: "r", bottom: "b", left: "l" };

/** A length a computed style gives in pixels ("auto", "none" and "normal" are 0). */
const px = (value: string) => parseFloat(value) || 0;
const four = (sides?: Sides): Four => ({ top: sides?.top ?? 0, right: sides?.right ?? 0, bottom: sides?.bottom ?? 0, left: sides?.left ?? 0 });

/** The element in `port` that is focused and shows its ring, if any. */
function focusedIn(port: HTMLElement): Element | null {
  const active = port.ownerDocument.activeElement;
  if (!active || active === port || !port.contains(active)) return null;
  try {
    return active.matches(":focus-visible") ? active : null;
  } catch {
    return null;
  }
}

/**
 * Fades a scrollport's content at each edge that hides more (cimip-gaps-3 t7, "Cut content fades"). The port gets `data-fade` (`inline`, `block` or `both`, the
 * axes on which something is hidden; removed while the content fits) and, per physical side, `--_fade-t/-r/-b/-l` (the band), `--_in-*` (a clip inset),
 * `--_pin-*` (an opaque strip held at the edge, a classic scrollbar included) and `--_reach-*` (the band before a protected item shortens it), which the
 * stylesheet turns into a mask. A side's band is `round(min(token, a quarter of the port, the distance hidden past it, the room before a protected item))`
 * while more than 1px is hidden past it, else 0, so it grows from nothing as the reader leaves an end and is gone on arrival. The token is
 * `--basalt-size-scroll-fade` on an inline edge and `--basalt-size-scroll-fade-block` on a block edge.
 *
 * A protected item is the focused element in the port that shows its ring, and the item last given to `keep()`. While any part of one is in view, a side's
 * band is never longer than the distance from its line to the item's nearest face, grown by `ring`: it shortens as the item nears the edge and is nothing
 * where the item touches or crosses it, at every offset, by key, wheel or touch. An item that takes focus in the port, and an item given to `keep()`, is
 * first brought clear (`revealIn`, measured from the port less its insets and strips).
 *
 * Driven by a passive scroll listener coalesced to one frame, a `ResizeObserver` on the port and its children, a `MutationObserver` on the port's subtree, and
 * `focusin` and `focusout` on the port. It writes only when the computed state changes, so scrolling through the middle writes nothing. No clock: no
 * transition or animation is involved. Nothing happens when the module loads.
 */
export function watchScrollFade(port: HTMLElement, options: ScrollFadeOptions = {}): ScrollFade {
  const axis = options.axis ?? "block";
  const inline = axis !== "block";
  const block = axis !== "inline";
  const ring = options.ring ?? 0;
  const view = port.ownerDocument.defaultView ?? window;
  let kept: Element | null = null;
  let frame = 0;
  let last = "";
  let live = true;
  let watched: Element[] = [];

  /** The opaque strips at each edge: a classic scrollbar (and the border outside it), plus what the component pins. */
  const strips = (style: CSSStyleDeclaration): Four => {
    const left = px(style.borderLeftWidth);
    const right = px(style.borderRightWidth);
    const top = px(style.borderTopWidth);
    const bottom = px(style.borderBottomWidth);
    const vertical = Math.max(0, port.offsetWidth - port.clientWidth - left - right);
    const horizontal = Math.max(0, port.offsetHeight - port.clientHeight - top - bottom);
    // A vertical bar is on the left in right to left: the port's client box starts past it.
    const barLeft = vertical > 0 && port.clientLeft > left + 0.5;
    const own = four(options.pinned?.());
    return {
      top: own.top,
      right: own.right + (vertical > 0 && !barLeft ? right + vertical : 0),
      bottom: own.bottom + (horizontal > 0 ? bottom + horizontal : 0),
      left: own.left + (barLeft ? left + vertical : 0),
    };
  };

  /** The distance hidden past each side. */
  const hidden = (style: CSSStyleDeclaration): Four => {
    const out = four();
    if (inline) {
      if (options.content) {
        const box = port.getBoundingClientRect();
        const scale = scaleOf(port, box);
        const at = options.content.getBoundingClientRect();
        const start = box.left + (port.clientLeft + px(style.paddingLeft)) * scale;
        const end = box.left + (port.clientLeft + port.clientWidth - px(style.paddingRight)) * scale;
        out.left = Math.max(0, (start - at.left) / scale);
        out.right = Math.max(0, (at.right - end) / scale);
      } else {
        const max = port.scrollWidth - port.clientWidth;
        if (max > 1) {
          // In right to left the scroll runs from 0 at the start (the right) to minus the range; the sign is read, never assumed.
          const from = style.direction === "rtl" ? Math.min(max, Math.abs(Math.min(0, port.scrollLeft))) : Math.min(max, Math.max(0, port.scrollLeft));
          out[style.direction === "rtl" ? "right" : "left"] = from;
          out[style.direction === "rtl" ? "left" : "right"] = max - from;
        }
      }
    }
    if (block) {
      const max = port.scrollHeight - port.clientHeight;
      if (max > 1) {
        out.top = Math.min(max, Math.max(0, port.scrollTop));
        out.bottom = max - out.top;
      }
    }
    return out;
  };

  const compute = () => {
    const style = getComputedStyle(port);
    const rtl = style.direction === "rtl";
    const gone = hidden(style);
    const pin = strips(style);
    const inset = four(options.insets?.());
    const tokenInline = px(style.getPropertyValue("--basalt-size-scroll-fade"));
    const tokenBlock = px(style.getPropertyValue("--basalt-size-scroll-fade-block"));
    const skipped = (side: Side) => {
      if (side === "top") return block && options.skip?.start;
      if (side === "bottom") return block && options.skip?.end;
      const start = rtl ? "right" : "left";
      return axis === "inline" && (side === start ? options.skip?.start : options.skip?.end);
    };
    // The room before each protected item that is in view, from each side's band line.
    const room: Four = { top: Infinity, right: Infinity, bottom: Infinity, left: Infinity };
    const box = port.getBoundingClientRect();
    const scale = scaleOf(port, box);
    // Each side's band line, from the port's border box (where the mask is drawn): past the clip inset and the opaque strip.
    const lines = {
      top: box.top + (inset.top + pin.top) * scale,
      bottom: box.bottom - (inset.bottom + pin.bottom) * scale,
      left: box.left + (inset.left + pin.left) * scale,
      right: box.right - (inset.right + pin.right) * scale,
    };
    for (const item of [focusedIn(port), kept]) {
      if (!item || !item.isConnected || !port.contains(item)) continue;
      const at = item.getBoundingClientRect();
      const inView = at.bottom > box.top && at.top < box.bottom && at.right > box.left && at.left < box.right && (at.width > 0 || at.height > 0);
      if (!inView) continue;
      // An item wholly inside an opaque strip (a held action) is never under a band: the strip keeps full paint.
      if (at.top >= lines.bottom || at.bottom <= lines.top || at.left >= lines.right || at.right <= lines.left) continue;
      const grow = ring * scale;
      room.top = Math.min(room.top, Math.max(0, (at.top - grow - lines.top) / scale));
      room.bottom = Math.min(room.bottom, Math.max(0, (lines.bottom - at.bottom - grow) / scale));
      room.left = Math.min(room.left, Math.max(0, (at.left - grow - lines.left) / scale));
      room.right = Math.min(room.right, Math.max(0, (lines.right - at.right - grow) / scale));
    }
    const band = four();
    const reach = four();
    for (const side of SIDES) {
      const across = side === "left" || side === "right";
      if (across ? !inline : !block) continue;
      if (gone[side] <= 1 || skipped(side)) continue;
      const token = across ? tokenInline : tokenBlock;
      const span = across ? port.clientWidth : port.clientHeight;
      reach[side] = Math.round(Math.min(token, span / 4, gone[side]));
      band[side] = Math.round(Math.min(token, span / 4, gone[side], room[side]));
    }
    const across = gone.left > 1 || gone.right > 1;
    const down = gone.top > 1 || gone.bottom > 1;
    const mode = across && down ? "both" : across ? "inline" : down ? "block" : "";
    return { mode, band, reach, pin, inset };
  };

  const write = () => {
    if (!live) return;
    const { mode, band, reach, pin, inset } = compute();
    const key = mode ? `${mode}|${SIDES.map((s) => `${band[s]},${reach[s]},${pin[s]},${inset[s]}`).join("|")}` : "";
    if (key === last) return;
    last = key;
    const style = port.style;
    if (!mode) {
      port.removeAttribute("data-fade");
      port.removeAttribute("data-fade-pin");
      for (const side of SIDES) for (const name of ["fade", "reach", "pin", "in"]) style.removeProperty(`--_${name}-${VARS[side]}`);
      return;
    }
    for (const side of SIDES) {
      const v = VARS[side];
      style.setProperty(`--_fade-${v}`, `${band[side]}px`);
      style.setProperty(`--_reach-${v}`, `${reach[side]}px`);
      style.setProperty(`--_pin-${v}`, `${pin[side]}px`);
      style.setProperty(`--_in-${v}`, `${inset[side]}px`);
    }
    if (SIDES.some((s) => pin[s] > 0)) port.setAttribute("data-fade-pin", "");
    else port.removeAttribute("data-fade-pin");
    if (port.getAttribute("data-fade") !== mode) port.setAttribute("data-fade", mode);
  };

  const run = () => {
    frame = 0;
    write();
  };
  const schedule = () => {
    if (!frame && live) frame = view.requestAnimationFrame(run);
  };
  // revealIn measures from the client box, which already stops at a classic scrollbar: only what is clipped or pinned inside it is passed.
  const edges = (): Sides => {
    const inset = four(options.insets?.());
    const own = four(options.pinned?.());
    return { top: inset.top + own.top, right: inset.right + own.right, bottom: inset.bottom + own.bottom, left: inset.left + own.left };
  };

  const sizes = new ResizeObserver(schedule);
  const watchChildren = () => {
    const children = Array.from(port.children);
    for (const el of watched) if (!children.includes(el)) sizes.unobserve(el);
    for (const el of children) if (!watched.includes(el)) sizes.observe(el);
    watched = children;
  };
  sizes.observe(port);
  if (options.content && options.content !== port) sizes.observe(options.content);
  watchChildren();
  const changes = new MutationObserver(() => {
    watchChildren();
    schedule();
  });
  changes.observe(port, { childList: true, subtree: true });
  const onFocusIn = (event: FocusEvent) => {
    const target = event.target as Element | null;
    if (target && target !== port && port.contains(target) && focusedIn(port) === target) revealIn(port, target, edges());
    write();
  };
  // Focus leaving changes nothing until the next frame: a focus moving to the next row is one change.
  const onFocusOut = () => schedule();
  port.addEventListener("scroll", schedule, { passive: true });
  port.addEventListener("focusin", onFocusIn);
  port.addEventListener("focusout", onFocusOut);
  write();

  return {
    refresh: write,
    keep(item) {
      kept = item;
      if (item) revealIn(port, item, edges());
      write();
    },
    stop() {
      live = false;
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      sizes.disconnect();
      changes.disconnect();
      port.removeEventListener("scroll", schedule);
      port.removeEventListener("focusin", onFocusIn);
      port.removeEventListener("focusout", onFocusOut);
      port.removeAttribute("data-fade");
      port.removeAttribute("data-fade-pin");
      for (const side of SIDES) for (const name of ["fade", "reach", "pin", "in"]) port.style.removeProperty(`--_${name}-${VARS[side]}`);
      last = "";
    },
  };
}
