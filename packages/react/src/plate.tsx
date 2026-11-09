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

/** Rows the plate follows, and the host that scrolls them. */
const ACTIVE = ".basalt-menu-item[data-highlighted], .basalt-menu-item[data-selected='true']";
const HOST = ".basalt-menu, .basalt-command-list";
/** No shared plate: the hand can't hover (touch), or motion or colour is the user's. The stylesheet repeats this. */
const OFF = "(prefers-reduced-motion: reduce), (forced-colors: active), (hover: none), (pointer: coarse)";

type Modality = "pointer" | "keyboard" | "touch";

function attachPlate(plate: HTMLElement): (() => void) | undefined {
  const host = plate.closest<HTMLElement>(HOST);
  if (!host) return undefined;
  const off = window.matchMedia(OFF);
  let modality: Modality = "keyboard";
  let last: HTMLElement | null = null;
  let target = "";
  let snapNext = false;
  let leaving: number | undefined;

  const on = () => !off.matches && modality !== "touch";
  const lit = () => plate.dataset.state === "on";
  // The row's own plate (its ::before) is the shape to follow, so the shared one matches the fallback to the pixel.
  const geometry = (row: HTMLElement) => {
    const box = host.getBoundingClientRect();
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
    window.clearTimeout(leaving);
    leaving = undefined;
    host.toggleAttribute("data-glide", on());
    if (!on()) {
      plate.dataset.state = "off";
      return;
    }
    const row = host.querySelector<HTMLElement>(ACTIVE);
    if (!row) {
      // Base UI clears the highlight on one row just before it sets the next, so a clear only counts if it is still
      // clear a task later. cmdk never clears: its plate stays when the pointer leaves, as it always has.
      leaving = window.setTimeout(() => {
        if (!host.querySelector(ACTIVE)) leave();
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
    // transition, so what is written here is what stays.
    const style = getComputedStyle(plate);
    const m = new DOMMatrixReadOnly(style.transform);
    write({ x: m.m41, y: m.m42, w: Number.parseFloat(style.width), h: Number.parseFloat(style.height) });
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
    if (on() !== wasOn) settle();
  };

  plate.dataset.state = "off";
  settle();
  const changes = new MutationObserver(settle);
  changes.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-highlighted", "data-selected"] });
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
  return () => {
    window.clearTimeout(leaving);
    changes.disconnect();
    resizes.disconnect();
    off.removeEventListener("change", settle);
    for (const type of ["pointermove", "pointerdown", "keydown"]) doc.removeEventListener(type, input, { capture: true });
    host.removeAttribute("data-glide");
  };
}

/**
 * The shared plate of a popup's rows. Render it inside the popup (Menu, Select, Combobox) or the command list, before
 * the rows. It is decoration: hidden from assistive technology, never hit by the pointer, and drawn only when the
 * stylesheet and the input allow it.
 */
export function GlidePlate() {
  const plate = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => (plate.current ? attachPlate(plate.current) : undefined), []);
  return <span ref={plate} aria-hidden="true" className="basalt-plate" data-state="off" />;
}
