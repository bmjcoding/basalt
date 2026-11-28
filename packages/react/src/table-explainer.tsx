import * as React from "react";
import { createPortal } from "react-dom";

import { GRACE, LEAVE, WAIT } from "./cell-peek";
import { inLevel, useFloatingLayer, usePopupLevel } from "./layers";
import { join } from "./utils";
import { usePortalScope } from "./palette-scope";

// A column explainer (DECISIONS 257 and 261): a small popover that says what a column means, opened from the header itself. It is
// not a Tooltip, because it may hold a link, and it is not a Base UI Popover: on a sortable header its opener is the sort button, whose press
// must sort and never toggle anything, and whose name and role must stay the column's name and "button" (a popover trigger would add a popup
// and an expanded state to it). On a header that does not sort, the opener is the header cell itself, made a focus stop (`tabindex="0"`) and
// described by the card's words: the header keeps its role and name (a column header), as a cut cell of a still table is a focus stop of its
// own, and no new control is drawn in the header (a trigger there would need a seat that every header of the column's kind then reserves).
// The rules, in foundations ("The still table"):
//   - it opens on hover after the tooltip's wait (600ms, then at once within 400ms of another closing), at once on keyboard focus, and on a
//     long press (500ms) on touch; a press before the wait cancels it, and a sort press closes an open one, which then stays closed until
//     the pointer and focus have left;
//   - it is placed above the header, else beside it (the end side, then the start side), never below, so never over its own column, and
//     it closes, focus or not, when its header leaves the view or the room goes;
//   - WCAG 1.4.13: Esc dismisses it without moving the pointer or focus, the pointer can move onto it (a pause in the 6px gap between
//     header and card keeps it), and it stays until hover and focus have both left;
//   - inside a dialog, sheet or popup it is written into that modal's own portal, so the modal counts it as inside and its link stays reachable;
//   - it is the opener's level plus one, with the neutral rim, radius 12 and shadow-overlay (the popover's own look);
//   - its words are the opener's description, so they are heard with the header; Tab from an open header goes into its link, and on;
//   - on a header that does not sort, a press does nothing but what hover does: it never closes or pins the card, and a long press opens it.
// Nothing here runs when the module loads; a table without explainers never imports it.

/** How long a finger rests on a header before its explainer opens instead of the press sorting. */
const LONG_PRESS = 500;
/** How far a finger may move during a long press before it counts as a scroll. */
const SLOP = 10;
const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** When the last explainer on the page closed: the next one within the grace opens at once, as tooltips do. */
let lastClosed = -Infinity;

const tabbables = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter((el) => !el.closest("[hidden], [inert]") && el.getClientRects().length > 0);

/**
 * Where the card goes, or null when it fits nowhere it may go. Above the header, aligned to the column's start edge (its end edge on a
 * numeric column) and moved back inside the window; else beside the header, top-aligned with it, on the end side and then the start side,
 * where it covers neighbouring columns and never its own. Never below: below is the column it explains.
 */
function place(card: HTMLElement, th: HTMLElement): boolean {
  const root = document.documentElement;
  const gap = parseFloat(getComputedStyle(root).getPropertyValue("--basalt-space-1-5")) || 6;
  const vw = root.clientWidth;
  const vh = root.clientHeight;
  card.style.setProperty("--available-width", `${vw - 2 * gap}px`);
  const a = th.getBoundingClientRect();
  const rtl = getComputedStyle(th).direction === "rtl";
  const rightAligned = th.hasAttribute("data-numeric") !== rtl;
  const w = card.offsetWidth;
  const h = card.offsetHeight;
  let x: number;
  let y: number;
  let side: string;
  let origin: string;
  if (a.top - gap - h >= gap) {
    side = "top";
    y = a.top - gap - h;
    x = Math.max(gap, Math.min(rightAligned ? a.right - w : a.left, vw - gap - w));
    origin = `${rightAligned ? "right" : "left"} bottom`;
  } else {
    y = Math.max(gap, a.top);
    if (y + h > vh - gap) return false;
    const right = a.right + gap + w <= vw - gap;
    const left = a.left - gap - w >= gap;
    const toRight = rtl ? !left && right : right;
    if (!right && !left) return false;
    side = toRight === !rtl ? "end" : "start";
    x = toRight ? a.right + gap : a.left - gap - w;
    origin = toRight ? "left top" : "right top";
  }
  card.style.left = `${Math.round(x)}px`;
  card.style.top = `${Math.round(y)}px`;
  card.style.setProperty("--transform-origin", origin);
  card.setAttribute("data-side", side);
  return true;
}

/**
 * Whether a point is in the gap between the header and its card (the space-1-5 between them, across the two boxes' joint extent), so a
 * pointer crossing slowly from one to the other keeps the card open (WCAG 1.4.13, hoverable).
 */
function inGap(x: number, y: number, th: HTMLElement, card: HTMLElement): boolean {
  const a = th.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const side = card.getAttribute("data-side");
  if (side === "top") return y >= c.bottom - 1 && y <= a.top + 1 && x >= Math.min(a.left, c.left) && x <= Math.max(a.right, c.right);
  const lo = Math.min(a.right, c.right) - 1;
  const hi = Math.max(a.left, c.left) + 1;
  return x >= Math.min(lo, hi) && x <= Math.max(lo, hi) && y >= Math.min(a.top, c.top) && y <= Math.max(a.bottom, c.bottom);
}

/** Whether any of the header is in view: in the window and in its table's scroll box. */
function inView(th: HTMLElement): boolean {
  const a = th.getBoundingClientRect();
  const frame = th.closest(".basalt-table-container")?.getBoundingClientRect();
  const root = document.documentElement;
  const box = frame ?? { left: 0, top: 0, right: root.clientWidth, bottom: root.clientHeight };
  return a.right > Math.max(0, box.left) && a.left < Math.min(root.clientWidth, box.right) && a.bottom > Math.max(0, box.top) && a.top < Math.min(root.clientHeight, box.bottom);
}

export interface TableHeadExplainerProps extends Omit<React.ComponentProps<"div">, "title" | "children"> {
  /** The card's title, 16/24 at 600: usually the column's name in full ("Zero retention"). */
  title?: React.ReactNode;
  /** One to three sentences that define the column, and at most one link. Never a control. */
  children: React.ReactNode;
}

/**
 * What a column means, for a header a reader could misread without it. Give it to a `TableHead` as `explainer`. It opens from
 * the header itself (hover after 600ms, keyboard focus, a long press on touch), above the header or beside it, never over its column,
 * and its words are the header's description. On a sortable header a press still sorts; a header that does not sort becomes a focus stop.
 */
export function TableHeadExplainer({ title, className, style, children, id, ...props }: TableHeadExplainerProps) {
  const portalScope = usePortalScope();
  const level = usePopupLevel();
  const layer = useFloatingLayer();
  const own = React.useId();
  const cardId = id ?? `${own}-explainer`;
  const bodyId = `${own}-explainer-body`;
  const anchor = React.useRef<HTMLSpanElement | null>(null);
  const card = React.useRef<HTMLDivElement | null>(null);
  // The card is written after the first render (a portal cannot be drawn on a server), into the page's body, or into the portal of the
  // dialog, sheet or popup the table sits in: a modal makes everything outside its own portal inert and hidden, which would leave the
  // card's link out of reach. Marked as a portal of its own, so the modal counts it as inside.
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setContainer(anchor.current?.closest<HTMLElement>("[data-base-ui-portal]") ?? document.body), []);
  const mounted = container !== null;

  React.useEffect(() => {
    const th = anchor.current?.closest("th");
    const sorts = th?.querySelector<HTMLButtonElement>(":scope > .basalt-sort") ?? null;
    // The opener: the sort button, or the header cell itself when the column does not sort (a focus stop of its own while it has an explainer).
    const button: HTMLElement | null | undefined = sorts ?? th;
    const box = card.current;
    if (!mounted || !th || !button || !box) return undefined;
    const ownStop = !sorts && !th.hasAttribute("tabindex");
    if (ownStop) th.tabIndex = 0;
    let open = false;
    // Held shut after Esc or a sort press, until the pointer and focus have left the header.
    let held = false;
    // Opened by a long press: it stays until a press elsewhere, Esc, or a tap that sorts.
    let pinned = false;
    let overButton = false;
    let overCard = false;
    let pointer: [number, number] | null = null;
    let wait = 0;
    let leave = 0;
    let ending = 0;
    let press = 0;
    let start: [number, number] | null = null;
    let longPressed = false;
    const ids = (button.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
    button.setAttribute("aria-describedby", [...ids.filter((x) => x !== bodyId), bodyId].join(" "));
    th.setAttribute("data-explained", "");

    const focusInside = () => {
      const active = document.activeElement;
      return active === button || (active !== null && box.contains(active));
    };
    const reposition = () => {
      if (!open) return;
      // Its header scrolled out of view, or there is no room left for it: it closes, focus or not (focus in it goes back to the header).
      if (!inView(th) || !place(box, th)) hide();
    };
    const show = (how: "hover" | "focus" | "touch") => {
      window.clearTimeout(wait);
      window.clearTimeout(leave);
      if (held && how !== "touch") return;
      if (how === "touch") pinned = true;
      if (open) {
        reposition();
        return;
      }
      window.clearTimeout(ending);
      box.removeAttribute("data-ending-style");
      box.hidden = false;
      if (!inView(th) || !place(box, th)) {
        // No room above or beside. A long press scrolls the page up just far enough to open it above; hover and focus open nothing.
        const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--basalt-space-1-5")) || 6;
        const short = box.offsetHeight + 2 * gap - th.getBoundingClientRect().top;
        if (how === "touch" && window.scrollY >= short) window.scrollBy(0, -short);
        if (how !== "touch" || !place(box, th)) {
          box.hidden = true;
          pinned = false;
          return;
        }
      }
      open = true;
      box.setAttribute("data-open", "");
      box.setAttribute("data-starting-style", "");
      // One layout with the starting style, so the entry transitions from it.
      void box.offsetWidth;
      requestAnimationFrame(() => box.removeAttribute("data-starting-style"));
      window.addEventListener("scroll", reposition, true);
      window.addEventListener("resize", reposition);
      window.addEventListener("keydown", onEscape, true);
      document.addEventListener("pointermove", onTrack, true);
      document.addEventListener("pointerdown", onOutside, true);
    };
    const hide = () => {
      window.clearTimeout(wait);
      window.clearTimeout(leave);
      pinned = false;
      if (!open) return;
      open = false;
      lastClosed = performance.now();
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("keydown", onEscape, true);
      document.removeEventListener("pointermove", onTrack, true);
      document.removeEventListener("pointerdown", onOutside, true);
      pointer = null;
      // Focus that was in the card goes back to the header, never to the page.
      if (box.contains(document.activeElement)) button.focus({ preventScroll: true });
      box.removeAttribute("data-open");
      box.removeAttribute("data-starting-style");
      box.setAttribute("data-ending-style", "");
      const done = () => {
        if (open) return;
        box.removeAttribute("data-ending-style");
        box.hidden = true;
      };
      const running = box.getAnimations();
      if (running.length) Promise.all(running.map((a) => a.finished)).then(done, done);
      else done();
      ending = window.setTimeout(done, 400);
    };
    // It stays while the pointer is on the header or the card, or in the gap between them, or focus is on either, or a long press opened it.
    const settle = () => {
      window.clearTimeout(leave);
      leave = window.setTimeout(function check() {
        if (pinned || overButton || overCard || focusInside()) return;
        if (open && pointer && inGap(pointer[0], pointer[1], th, box)) {
          leave = window.setTimeout(check, LEAVE);
          return;
        }
        hide();
      }, LEAVE);
    };
    const onTrack = (e: PointerEvent) => { if (e.pointerType !== "touch") pointer = [e.clientX, e.clientY]; };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      overButton = true;
      window.clearTimeout(leave);
      if (open || held) return;
      wait = window.setTimeout(() => show("hover"), performance.now() - lastClosed < GRACE ? 0 : WAIT);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      overButton = false;
      pointer = [e.clientX, e.clientY];
      window.clearTimeout(wait);
      // A dismissed card stays shut until the pointer and focus have both left the header.
      if (!focusInside()) held = false;
      settle();
    };
    const onCardEnter = () => { overCard = true; window.clearTimeout(leave); };
    const onCardLeave = (e: PointerEvent) => { overCard = false; pointer = [e.clientX, e.clientY]; settle(); };
    const onFocus = () => { if (button.matches(":focus-visible")) show("focus"); };
    const onFocusOut = (e: FocusEvent) => {
      const to = e.relatedTarget as Node | null;
      if (to && (to === button || box.contains(to))) return;
      if (!overButton) held = false;
      settle();
    };
    const onPointerDown = (e: PointerEvent) => {
      window.clearTimeout(wait);
      if (e.pointerType === "touch") {
        start = [e.clientX, e.clientY];
        longPressed = false;
        press = window.setTimeout(() => { longPressed = true; show("touch"); }, LONG_PRESS);
        return;
      }
      // A press before the wait cancels it, on a header that sorts (the press is a sort).
      longPressed = false;
      if (sorts) held = true;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > SLOP) { window.clearTimeout(press); start = null; }
    };
    const onPointerEnd = () => { window.clearTimeout(press); start = null; };
    // The press that ended a long press does not sort. Any other press sorts (React's own handler) and closes the card. A header that does not sort has
    // nothing for a press to do, so a press there leaves the card as it is.
    const onClick = (e: MouseEvent) => {
      if (longPressed) {
        longPressed = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (!sorts) return;
      held = true;
      hide();
    };
    const onContextMenu = (e: Event) => { if (start || longPressed) e.preventDefault(); };
    // Esc closes it wherever focus is (it may be open under a resting pointer), and nothing else: captured and stopped, so a dialog round
    // the table stays open. The pointer and focus stay where they are.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !open) return;
      e.preventDefault();
      e.stopPropagation();
      // Shut until the pointer leaves the header, or focus leaves; a pointer resting on the card has already moved away from the header.
      held = overButton || focusInside();
      hide();
    };
    const onKey = (e: KeyboardEvent) => {
      longPressed = false;
      if (e.key !== "Tab" || !open || e.altKey || e.ctrlKey || e.metaKey) return;
      // The card is written at the end of the page, so Tab is carried through it: from the header into its link, from its link to
      // whatever follows the header, and back.
      const inside = tabbables(box);
      if (!inside.length) return;
      const target = e.target as HTMLElement;
      let to: HTMLElement | undefined;
      if (target === button && !e.shiftKey) to = inside[0];
      else if (box.contains(target) && e.shiftKey && target === inside[0]) to = button;
      else if (box.contains(target) && !e.shiftKey && target === inside[inside.length - 1]) {
        const order = tabbables(document).filter((el) => !box.contains(el));
        to = order[order.indexOf(button) + 1];
        if (!to) return;
      }
      if (!to) return;
      e.preventDefault();
      to.focus();
    };
    // A press anywhere else closes one that is open.
    const onOutside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (open && !th.contains(t) && !box.contains(t)) hide();
    };

    button.addEventListener("pointerenter", onEnter);
    button.addEventListener("pointerleave", onLeave);
    button.addEventListener("focus", onFocus);
    button.addEventListener("focusout", onFocusOut);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", onPointerEnd);
    button.addEventListener("pointercancel", onPointerEnd);
    button.addEventListener("click", onClick);
    button.addEventListener("contextmenu", onContextMenu);
    button.addEventListener("keydown", onKey);
    box.addEventListener("pointerenter", onCardEnter);
    box.addEventListener("pointerleave", onCardLeave);
    box.addEventListener("focusout", onFocusOut);
    box.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(wait);
      window.clearTimeout(leave);
      window.clearTimeout(ending);
      window.clearTimeout(press);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("keydown", onEscape, true);
      document.removeEventListener("pointermove", onTrack, true);
      document.removeEventListener("pointerdown", onOutside, true);
      button.removeEventListener("pointerenter", onEnter);
      button.removeEventListener("pointerleave", onLeave);
      button.removeEventListener("focus", onFocus);
      button.removeEventListener("focusout", onFocusOut);
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerup", onPointerEnd);
      button.removeEventListener("pointercancel", onPointerEnd);
      button.removeEventListener("click", onClick);
      button.removeEventListener("contextmenu", onContextMenu);
      button.removeEventListener("keydown", onKey);
      box.removeEventListener("pointerenter", onCardEnter);
      box.removeEventListener("pointerleave", onCardLeave);
      box.removeEventListener("focusout", onFocusOut);
      box.removeEventListener("keydown", onKey);
      const left = (button.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((x) => x && x !== bodyId);
      if (left.length) button.setAttribute("aria-describedby", left.join(" "));
      else button.removeAttribute("aria-describedby");
      th.removeAttribute("data-explained");
      if (ownStop) th.removeAttribute("tabindex");
    };
  }, [mounted, bodyId]);

  return (
    <>
      <span ref={anchor} hidden />
      {container
        ? createPortal(
            <div
              {...portalScope}
              {...props}
              ref={card}
              id={cardId}
              hidden
              data-level={level}
              data-base-ui-portal=""
              className={join("basalt-popover basalt-explainer", className)}
              style={{ zIndex: layer?.zIndex ?? "var(--basalt-layer-popover)", ...style }}
            >
              {inLevel(
                level,
                <>
                  {title ? <p className="basalt-popover-title basalt-explainer-title">{title}</p> : null}
                  <div id={bodyId} className="basalt-popover-description basalt-explainer-body">{children}</div>
                </>,
              )}
            </div>,
            container,
          )
        : null}
    </>
  );
}
