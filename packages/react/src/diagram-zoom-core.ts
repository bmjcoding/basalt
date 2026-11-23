// The diagram viewer's stage (DECISIONS 301, part 9, as DECISIONS 310): zoom and pan for a figure laid out once at 100%, for React's viewer and the HTML
// skill's diagram-zoom module alike. Plain DOM and no React, so the two zoom, pan, pinch and speak the same way. Nothing here runs when the module loads.
//
// The layer holds the laid-out figure at its real CSS pixels; the zoom is one `transform: scale()` on it, inside a sizer as large as the zoomed drawing
// (plus the stage's padding) so the stage has something to scroll. A pan is a scroll. Nothing is animated: a step, the wheel and a pinch land at once.
// The engine never measures a zoomed figure: the viewer gives this the layer's size at 100% (`size`), read with the zoom taken off.

/** The ladder the buttons and keys step on (9.4): a browser's own, shortened. */
export const ZOOM_STEPS = [25, 33, 50, 67, 75, 100, 125, 150, 200, 300, 400];
const MAX = 4;
const FIT_CAP = 2;
/** The wheel (9.4): the zoom is multiplied by 2 to the power of minus a hundredth of the delta, one event's delta held to 25 either way. */
const WHEEL_STEP = 100;
const WHEEL_HOLD = 25;
const EPS = 0.0005;

export interface ZoomState {
  /** The zoom as a ratio (1 is 100%). */
  zoom: number;
  /** The level as whole per cent, as the foot writes it. */
  level: number;
  fit: number;
  min: number;
  max: number;
  atMin: boolean;
  atMax: boolean;
  atFit: boolean;
  /** "View as list" is open: the zoom controls are disabled and the stage scrolls as a page. */
  listOpen: boolean;
}

export interface ZoomHost {
  /** The scrolling box (role="group", tabindex 0). */
  stage: HTMLElement;
  /** Sized to the zoomed drawing; its padding is the stage's padding (space-6 from 720, space-4 under it). */
  sizer: HTMLElement;
  /** The laid-out figure's box: the transform is on it. */
  layer: HTMLElement;
  /** The one polite status line, visually hidden. */
  status: HTMLElement;
  /** `duration-slower` in ms: the status speaks once the level has rested this long. */
  rest: number;
  onChange: (state: ZoomState) => void;
}

export interface ZoomController {
  /** The layer's laid-out size at 100%, in CSS pixels, after every layout. */
  size: (width: number, height: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  state: () => ZoomState;
  /** The list is in the stage in place of the drawing (9.9): gestures stop; closing it brings the drawing back at its zoom and place. */
  list: (open: boolean) => void;
  /** Whether the press that has just ended travelled: a travelled press is a pan, never a click. */
  travelled: () => boolean;
  destroy: () => void;
}

interface Pt { x: number; y: number }

export function attachZoom(host: ZoomHost): ZoomController {
  const { stage, sizer, layer, status } = host;
  let W = 0, H = 0;
  let zoom = 1, fitZoom = 1;
  // The reader has zoomed: a resize keeps their zoom (inside the new limits) and the point at the middle; untouched, it stays at Fit.
  let touched = false;
  let listOpen = false;
  let saved: { left: number; top: number } | null = null;
  let spoken = "";
  let speakTimer = 0;

  const pad = () => Number.parseFloat(getComputedStyle(sizer).paddingTop) || 0;
  const minOf = () => Math.min(fitZoom, 1);
  const clamp = (z: number) => Math.min(MAX, Math.max(minOf(), z));

  function computeFit() {
    if (!W || !H) return 1;
    const p = pad();
    const cw = stage.clientWidth - 2 * p, ch = stage.clientHeight - 2 * p;
    if (cw <= 0 || ch <= 0) return Math.min(1, FIT_CAP);
    // The largest whole per cent at which the whole drawing shows inside the padding, 200% at most.
    const raw = Math.min(cw / W, ch / H);
    return Math.min(FIT_CAP, Math.floor(raw * 100 + 1e-6) / 100);
  }

  function state(): ZoomState {
    const min = minOf();
    return {
      zoom, level: Math.round(zoom * 100), fit: fitZoom, min, max: MAX,
      atMin: zoom <= min + EPS, atMax: zoom >= MAX - EPS, atFit: Math.abs(zoom - fitZoom) < EPS, listOpen,
    };
  }
  function changed() {
    host.onChange(state());
    stage.toggleAttribute("data-pannable", W * zoom > stage.clientWidth - 2 * pad() + 0.5 || H * zoom > stage.clientHeight - 2 * pad() + 0.5);
  }
  function speak() {
    clearTimeout(speakTimer);
    const words = `Zoom ${Math.round(zoom * 100)}%`;
    // Once the level has not changed for duration-slower, so a pinch is spoken once.
    speakTimer = window.setTimeout(() => { if (words !== spoken) { spoken = words; status.textContent = words; } }, host.rest);
  }

  /** Writes the zoom: the sizer takes the zoomed drawing's size and the layer its scale. No transition: a zoom lands at once. */
  function paint() {
    sizer.style.width = `${W * zoom}px`;
    sizer.style.height = `${H * zoom}px`;
    layer.style.transform = `scale(${zoom})`;
  }

  /** The drawing's point (at 100%) under a point of the window. */
  function contentAt(p: Pt): Pt {
    const r = layer.getBoundingClientRect();
    return { x: (p.x - r.left) / zoom, y: (p.y - r.top) / zoom };
  }
  /** Scrolls so the drawing's point `c` is under the window's point `p`. */
  function holdAt(c: Pt, p: Pt) {
    const r = layer.getBoundingClientRect();
    stage.scrollLeft += r.left + c.x * zoom - p.x;
    stage.scrollTop += r.top + c.y * zoom - p.y;
  }
  const middle = (): Pt => { const r = stage.getBoundingClientRect(); return { x: r.left + stage.clientWidth / 2, y: r.top + stage.clientHeight / 2 }; };

  function zoomTo(next: number, anchor: Pt = middle(), held?: Pt) {
    if (listOpen) return;
    const z = clamp(next);
    if (Math.abs(z - zoom) < 1e-6) { changed(); return; }
    const c = held ?? contentAt(anchor);
    zoom = z;
    paint();
    holdAt(c, anchor);
    changed();
    speak();
  }

  function step(up: boolean) {
    touched = true;
    const at = zoom * 100;
    const next = up ? ZOOM_STEPS.find((s) => s > at + 0.5) : [...ZOOM_STEPS].reverse().find((s) => s < at - 0.5);
    zoomTo(next === undefined ? (up ? MAX : minOf()) : next / 100);
  }

  function toFit() {
    if (listOpen) return;
    touched = false;
    zoom = fitZoom;
    paint();
    // At Fit the whole drawing shows: centred where it is smaller than the stage (the sizer's auto margins), from its top start corner otherwise.
    stage.scrollTop = 0;
    stage.scrollLeft = getComputedStyle(stage).direction === "rtl" ? stage.scrollWidth : 0;
    changed();
    speak();
  }

  function size(width: number, height: number) {
    const keep = touched && W && H ? contentAt(middle()) : null;
    W = width;
    H = height;
    fitZoom = computeFit();
    if (!touched) {
      zoom = fitZoom;
      paint();
      stage.scrollTop = 0;
      stage.scrollLeft = getComputedStyle(stage).direction === "rtl" ? stage.scrollWidth : 0;
    } else {
      zoom = clamp(zoom);
      paint();
      if (keep) holdAt(keep, middle());
    }
    changed();
  }

  // ---- The wheel: a plain wheel scrolls; with Ctrl or Command (and a trackpad pinch, sent as a wheel with Ctrl) it zooms about the pointer ----
  function onWheel(event: WheelEvent) {
    if (listOpen || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    const delta = Math.max(-WHEEL_HOLD, Math.min(WHEEL_HOLD, event.deltaY * unit));
    touched = true;
    zoomTo(zoom * 2 ** (-delta / WHEEL_STEP), { x: event.clientX, y: event.clientY });
  }

  // ---- Keys, only while focus is in the stage (WCAG 2.1.4): + or = in, - out, 0 Fit. The browser's own Ctrl and Command zoom keys are left alone ----
  function onKey(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || listOpen) return;
    if (event.key === "+" || event.key === "=") { event.preventDefault(); step(true); } else if (event.key === "-" || event.key === "−") { event.preventDefault(); step(false); } else if (event.key === "0") { event.preventDefault(); toFit(); }
  }

  // ---- Pan and pinch: a press that travels more than space-1 is a drag, one for one; two fingers pinch about their midpoint ----
  const pointers = new Map<number, Pt>();
  let start: Pt | null = null;
  let last: Pt | null = null;
  let dragging = false;
  let moved = false;
  let pinch: { d0: number; z0: number; c: Pt } | null = null;
  const travel = () => Number.parseFloat(getComputedStyle(stage).getPropertyValue("--_travel")) || 4;
  const mid = (): Pt => { const [a, b] = [...pointers.values()]; return { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }; };
  const spread = (): number => { const [a, b] = [...pointers.values()]; return Math.hypot(a!.x - b!.x, a!.y - b!.y); };

  function onDown(event: PointerEvent) {
    if (listOpen) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) { start = { x: event.clientX, y: event.clientY }; last = start; dragging = false; moved = false; }
    if (pointers.size === 2 && event.pointerType === "touch") {
      const m = mid();
      pinch = { d0: spread() || 1, z0: zoom, c: contentAt(m) };
      moved = true;
      dragging = false;
      try { stage.setPointerCapture(event.pointerId); } catch { /* the pointer has gone */ }
    }
  }
  function onMove(event: PointerEvent) {
    if (!pointers.has(event.pointerId) || listOpen) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size >= 2) {
      touched = true;
      const z = clamp(pinch.z0 * (spread() / pinch.d0));
      const m = mid();
      if (Math.abs(z - zoom) > 1e-6) { zoom = z; paint(); changed(); speak(); }
      holdAt(pinch.c, m);
      return;
    }
    if (pointers.size !== 1 || !start || !last) return;
    const p = { x: event.clientX, y: event.clientY };
    if (!dragging) {
      if (Math.hypot(p.x - start.x, p.y - start.y) <= travel()) return;
      dragging = true;
      moved = true;
      stage.setAttribute("data-dragging", "");
      try { stage.setPointerCapture(event.pointerId); } catch { /* the pointer has gone */ }
    }
    stage.scrollLeft -= p.x - last.x;
    stage.scrollTop -= p.y - last.y;
    last = p;
    event.preventDefault();
  }
  function onUp(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 1) {
      // A pinch that leaves one finger down pans from where that finger is: no jump.
      const [p] = [...pointers.values()];
      last = p!;
      start = p!;
      dragging = true;
      return;
    }
    if (pointers.size === 0) {
      dragging = false;
      stage.removeAttribute("data-dragging");
      start = last = null;
      // No momentum and no rubber band: lifted, it stops.
    }
  }
  // A press that travelled is a pan: the click it ends in does nothing (a link is not followed, a card is not traced).
  function onClick(event: MouseEvent) {
    if (!moved) return;
    moved = false;
    event.preventDefault();
    event.stopPropagation();
  }

  const resize = new ResizeObserver(() => {
    if (!W || !H) return;
    const keep = touched ? contentAt(middle()) : null;
    fitZoom = computeFit();
    if (!touched) { zoom = fitZoom; paint(); } else { zoom = clamp(zoom); paint(); if (keep) holdAt(keep, middle()); }
    changed();
  });
  resize.observe(stage);

  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("keydown", onKey);
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onUp);
  stage.addEventListener("click", onClick, true);

  return {
    size,
    zoomIn: () => step(true),
    zoomOut: () => step(false),
    fit: toFit,
    state,
    list(open: boolean) {
      if (open === listOpen) return;
      if (open) { saved = { left: stage.scrollLeft, top: stage.scrollTop }; listOpen = true; stage.setAttribute("data-list", ""); stage.scrollTop = 0; } else {
        listOpen = false;
        stage.removeAttribute("data-list");
        paint();
        if (saved) { stage.scrollLeft = saved.left; stage.scrollTop = saved.top; }
        saved = null;
      }
      changed();
    },
    travelled: () => moved,
    destroy() {
      clearTimeout(speakTimer);
      resize.disconnect();
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("keydown", onKey);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("click", onClick, true);
    },
  };
}

/** Brings a focused card into the stage's view by the least distance, `margin` clear of its edges (9.5). */
export function revealIn(stage: HTMLElement, el: Element, margin: number): void {
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const left = s.left + margin, right = s.left + stage.clientWidth - margin, top = s.top + margin, bottom = s.top + stage.clientHeight - margin;
  if (r.left < left) stage.scrollLeft -= left - r.left; else if (r.right > right) stage.scrollLeft += Math.min(r.right - right, r.left - left);
  if (r.top < top) stage.scrollTop -= top - r.top; else if (r.bottom > bottom) stage.scrollTop += Math.min(r.bottom - bottom, r.top - top);
}
