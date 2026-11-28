import * as React from "react";

// The hover glide. A popup's rows (Menu, Select, Combobox, and the CommandMenu's list) each paint their own plate
// when lit; that stays the fallback and the whole story with no JS, on touch, under reduced motion and in forced
// colours. Where it can, the popup also draws ONE plate that follows the active row. The primitive stays the authority
// on which row is active (Base UI's `data-highlighted`, cmdk's `data-selected="true"`); this only paints it.
//
//   the pointer moves the highlight   the plate travels (CSS transitions on `transform`, `width`, `height`)
//   a key moves it                    the plate is there at once: in a popup it is the keyboard position
//   it appears from nowhere           it appears in place, with no flight from a stale row
//   the highlight clears (leaving)    a move in flight freezes where it is, and the plate fades in place;
//                                     a return during the fade travels from there, after it the plate appears in place
//
// The geometry is four CSS variables on the plate, written from the DOM. No React state, no animation frames.
//
// A popup list can also go idle (the in-page command list, which sits in the page and is lit only while it is in use): the host
// carries `data-idle`, which counts as no active row, so the plate fades where it is and comes back when the list is used.
//
// Navigation is the second place the glide lives. A navigation list has no highlight of its own, so the glide marks the
// item under the pointer `data-hovered` (an attribute, not state) and follows that; it hugs the item's pill, not its
// row; and the first key hides it instead of moving it (the focus ring shows), until the next pointer move. The notification
// center's list is the third: its entries are links and buttons, so it follows the pointer the same way, with the entry's own
// plate as its shape (40 or 58 tall, whatever the entry holds).
//
// The touch mark (m1, P8). A still finger sets no :active on a row (two council seats measured it in Chromium), so a popup's row and a
// notification entry under a finger would show nothing until release. The glide marks the row `data-pressing` from a touch pointerdown,
// at once, until pointerup, pointercancel, a scroll of the list, or 8px of travel, one row at a time, and the stylesheet paints it as the
// lit row. It moves no highlight, calls no preventDefault and leaves activation to the click; its listeners are passive and it reaches no
// assistive technology. It works whatever the media state, so exactly where the glide is off. Navigation has no mark: its press is :active.

/** What a glide follows: the host that holds the rows, which row is lit, and the shape to hug. */
interface Kind {
  host: string;
  active: string;
  attributes: string[];
  /** The row the pointer is on, for a host with no highlight of its own. */
  item?: string;
  /** The first key hides the glide (navigation) instead of moving it (a popup). */
  hideOnKey?: boolean;
  /** The box to hug, if not the row's own plate (its ::before). */
  shape?: string;
  /** The rows a still finger marks `data-pressing`. */
  press?: string;
}

const POPUP: Kind = {
  // The nearest wins: a popup's port (cimip-gaps-3 t7) before the popup.
  host: ".basalt-menu-scroll, .basalt-menu, .basalt-command-list",
  active: ".basalt-menu-item[data-highlighted], .basalt-menu-item[data-selected='true']",
  attributes: ["data-highlighted", "data-selected", "data-idle"],
  press: ".basalt-menu-item",
};
// The site header's row of links is the same glide laid on its side: its own host, links and pills, the same rules.
const NAVIGATION: Kind = {
  host: ".basalt-nav, .basalt-site-links",
  active: ".basalt-nav-item[data-hovered], .basalt-site-link[data-hovered]",
  attributes: ["data-hovered"],
  item: ".basalt-nav-item, .basalt-site-link",
  hideOnKey: true,
  shape: ".basalt-nav-pill, .basalt-site-pill",
};
const NOTIFICATIONS: Kind = {
  host: ".basalt-notifications-scroll",
  active: ".basalt-notification[data-hovered]",
  attributes: ["data-hovered"],
  item: ".basalt-notification",
  hideOnKey: true,
  press: ".basalt-notification",
};
/** No shared plate: the hand can't hover (touch), or motion or colour is the user's. The stylesheet repeats this. */
const OFF = "(prefers-reduced-motion: reduce), (forced-colors: active), (hover: none), (pointer: coarse)";

type Modality = "pointer" | "keyboard" | "touch";

/** A row that can't run takes no press: disabled (cmdk writes data-disabled="false" on a live row) or unavailable. */
const UNPRESSABLE = '[disabled], [aria-disabled="true"], [data-disabled]:not([data-disabled="false"]), [data-unavailable]';
/** The travel that ends a press: the finger is scrolling or dragging, not pressing (space-2's 8px; script can't read the token). */
const PRESS_SLOP = 8;

/** Marks the row under a still finger `data-pressing` (see the header). Returns the teardown. */
function attachPress(host: HTMLElement, rows: string): () => void {
  let pressed: HTMLElement | null = null;
  let id = -1;
  let x = 0;
  let y = 0;
  const release = () => {
    pressed?.removeAttribute("data-pressing");
    pressed = null;
    id = -1;
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !event.isPrimary) return;
    release();
    const row = event.target instanceof Element ? event.target.closest<HTMLElement>(rows) : null;
    if (!row || !host.contains(row) || row.matches(UNPRESSABLE)) return;
    pressed = row;
    id = event.pointerId;
    x = event.clientX;
    y = event.clientY;
    row.setAttribute("data-pressing", "");
  };
  const move = (event: PointerEvent) => {
    if (pressed && event.pointerId === id && Math.hypot(event.clientX - x, event.clientY - y) >= PRESS_SLOP) release();
  };
  const end = (event: PointerEvent) => {
    if (event.pointerId === id) release();
  };
  const doc = host.ownerDocument;
  const pass = { capture: true, passive: true } as const;
  host.addEventListener("pointerdown", down, pass);
  doc.addEventListener("pointermove", move, pass);
  doc.addEventListener("pointerup", end, pass);
  doc.addEventListener("pointercancel", end, pass);
  // A scroll does not bubble; a capturing listener on the host hears its own and its ports'.
  host.addEventListener("scroll", release, pass);
  return () => {
    host.removeEventListener("pointerdown", down, pass);
    doc.removeEventListener("pointermove", move, pass);
    doc.removeEventListener("pointerup", end, pass);
    doc.removeEventListener("pointercancel", end, pass);
    host.removeEventListener("scroll", release, pass);
    release();
  };
}

function attachPlate(plate: HTMLElement, kind: Kind): (() => void) | undefined {
  const host = plate.closest<HTMLElement>(kind.host);
  if (!host) return undefined;
  const ACTIVE = kind.active;
  const off = window.matchMedia(OFF);
  // A popup opens on a key as often as not, and starts on the keyboard's side. Navigation is lit only by a pointer, and
  // hidden by the first key, so it starts on the pointer's.
  let modality: Modality = kind.hideOnKey ? "pointer" : "keyboard";
  let last: HTMLElement | null = null;
  let target = "";
  let snapNext = false;
  let leaving: number | undefined;

  const on = () => !off.matches && (kind.hideOnKey ? modality === "pointer" : modality !== "touch");
  const lit = () => plate.dataset.state === "on";
  // The active row, or none while the host says it is idle (a list in the page that is not being used).
  const activeRow = () => (host.hasAttribute("data-idle") ? null : host.querySelector<HTMLElement>(ACTIVE));
  // The row's own plate (its ::before), or the item's pill, is the shape to follow, so the shared one matches the
  // fallback to the pixel.
  const geometry = (row: HTMLElement) => {
    const box = host.getBoundingClientRect();
    const shape = kind.shape ? row.querySelector<HTMLElement>(kind.shape) : null;
    if (shape) {
      const ratio = host.offsetWidth > 0 ? box.width / host.offsetWidth : 1;
      const scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
      const hug = shape.getBoundingClientRect();
      return {
        x: (hug.left - box.left) / scale - host.clientLeft + host.scrollLeft,
        y: (hug.top - box.top) / scale - host.clientTop + host.scrollTop,
        w: hug.width / scale,
        h: hug.height / scale,
      };
    }
    const at = row.getBoundingClientRect();
    const own = getComputedStyle(row, "::before");
    const ratio = host.offsetWidth > 0 ? box.width / host.offsetWidth : 1;
    const scale = Math.abs(ratio - 1) < 0.01 ? 1 : ratio;
    return {
      x: (at.left - box.left) / scale - host.clientLeft + host.scrollLeft + (Number.parseFloat(own.left) || 0),
      y: (at.top - box.top) / scale - host.clientTop + host.scrollTop + (Number.parseFloat(own.top) || 0),
      w: Number.parseFloat(own.width) || at.width / scale,
      h: Number.parseFloat(own.height) || at.height / scale,
    };
  };
  const write = (g: { x: number; y: number; w: number; h: number }) => {
    plate.style.setProperty("--_plate-x", `${g.x}px`);
    plate.style.setProperty("--_plate-y", `${g.y}px`);
    plate.style.setProperty("--_plate-w", `${g.w}px`);
    plate.style.setProperty("--_plate-h", `${g.h}px`);
  };
  // Runs `change` with the plate's transitions off and commits it, so it takes effect in place.
  const inPlace = (change: () => void) => {
    plate.setAttribute("data-snap", "");
    change();
    void plate.offsetWidth;
    plate.removeAttribute("data-snap");
  };

  const settle = () => {
    clearTimeout(leaving);
    leaving = undefined;
    host.toggleAttribute("data-glide", on());
    if (!on()) {
      // Hidden at once, not faded: a key, touch or a media query took the glide away, and a pointer that comes back
      // must not fly from where it was.
      if (plate.dataset.state !== "off" || last) inPlace(() => { plate.dataset.state = "off"; });
      last = null;
      target = "";
      return;
    }
    const row = activeRow();
    if (!row) {
      // Base UI clears the highlight on one row just before it sets the next, so a clear only counts if it is still
      // clear a task later. cmdk never clears: its plate stays when the pointer leaves, as it always has.
      leaving = setTimeout(() => {
        if (!activeRow()) leave();
      }, 0);
      return;
    }
    const g = geometry(row);
    const key = `${g.x} ${g.y} ${g.w} ${g.h}`;
    // Nothing changed (an unrelated mutation mid-glide): leave the move in flight alone.
    if (row === last && lit() && key === target) return;
    target = key;
    const moved = row !== last;
    // How much of the plate is still showing: 0 once a fade has finished, so the plate appears in place.
    const shown = lit() ? 1 : Number.parseFloat(getComputedStyle(plate).opacity) || 0;
    const travel = !snapNext && moved && modality === "pointer" && shown > 0.01;
    snapNext = false;
    if (travel) {
      write(g);
      plate.dataset.state = "on";
    } else {
      inPlace(() => {
        write(g);
        plate.dataset.state = "on";
      });
    }
    last = row;
  };

  const leave = () => {
    if (!lit()) return;
    // Freeze a move in progress where it has reached, then fade there. The plate's off state has no transform
    // transition, so what is written here is what stays. A row a filter removed leaves nothing to fade over: unplace it (A2-13).
    const style = getComputedStyle(plate);
    const m = new DOMMatrixReadOnly(style.transform);
    // (`last` is set whenever the plate is lit.)
    if (!last!.isConnected) plate.removeAttribute("style");
    else write({ x: m.m41, y: m.m42, w: Number.parseFloat(style.width), h: Number.parseFloat(style.height) });
    plate.dataset.state = "off";
    last = null;
    target = "";
  };

  const input = (event: Event) => {
    let next: Modality = modality;
    if (event.type === "keydown") {
      const key = (event as KeyboardEvent).key;
      if (key !== "Shift" && key !== "Control" && key !== "Alt" && key !== "Meta") next = "keyboard";
    } else {
      next = (event as PointerEvent).pointerType === "touch" ? "touch" : "pointer";
    }
    if (next === modality) return;
    const wasOn = on();
    modality = next;
    if (kind.hideOnKey) host.toggleAttribute("data-keys", modality === "keyboard");
    if (on() !== wasOn) settle();
  };

  // A host with no highlight of its own: the item under a mouse or pen is the lit one. Touch never lights it.
  const hover = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const item = (event.target as Element).closest<HTMLElement>(kind.item!);
    const now = host.querySelector<HTMLElement>(ACTIVE);
    if (item === now) return;
    now?.removeAttribute("data-hovered");
    item?.setAttribute("data-hovered", "");
  };
  const leaveHost = () => host.querySelector(ACTIVE)?.removeAttribute("data-hovered");
  if (kind.item) {
    host.addEventListener("pointerover", hover);
    host.addEventListener("pointerleave", leaveHost);
  }

  plate.dataset.state = "off";
  settle();
  const changes = new MutationObserver(settle);
  changes.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: kind.attributes });
  const resizes = new ResizeObserver(() => {
    // A row that moved under a still highlight (a filter, a font, a resize) is re-placed in place.
    snapNext = true;
    target = "";
    settle();
  });
  resizes.observe(host);
  off.addEventListener("change", settle);
  const doc = host.ownerDocument;
  for (const type of ["pointermove", "pointerdown", "keydown"]) doc.addEventListener(type, input, { capture: true, passive: true });
  const unpress = kind.press ? attachPress(host, kind.press) : undefined;
  return () => {
    unpress?.();
    clearTimeout(leaving);
    changes.disconnect();
    resizes.disconnect();
    off.removeEventListener("change", settle);
    for (const type of ["pointermove", "pointerdown", "keydown"]) doc.removeEventListener(type, input, { capture: true });
    if (kind.item) {
      host.removeEventListener("pointerover", hover);
      host.removeEventListener("pointerleave", leaveHost);
      leaveHost();
    }
    host.removeAttribute("data-glide");
    host.removeAttribute("data-keys");
  };
}

export interface GlidePlateProps {
  /** Lay the glide on a navigation list (`.basalt-nav`, `.basalt-site-links`): it follows the item under the pointer and hides on the first key. */
  navigation?: boolean;
  /** Lay the glide on the notification center's list (`.basalt-notifications-scroll`). */
  notifications?: boolean;
}

/**
 * The shared plate of a popup's rows. Render it inside the popup (Menu, Select, Combobox) or the command list, before
 * the rows; with `navigation`, render it as the first child of a navigation list; with `notifications`, in the notification center's list. It is decoration: hidden from
 * assistive technology, never hit by the pointer, and drawn only when the stylesheet and the input allow it.
 */
export function GlidePlate({ navigation = false, notifications = false }: GlidePlateProps) {
  const plate = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => (plate.current ? attachPlate(plate.current, navigation ? NAVIGATION : notifications ? NOTIFICATIONS : POPUP) : undefined), [navigation, notifications]);
  return <span ref={plate} aria-hidden="true" className="basalt-plate" data-state="off" />;
}
