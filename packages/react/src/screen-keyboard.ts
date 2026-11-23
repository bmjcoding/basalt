import * as React from "react";

// The on-screen keyboard. On an iPhone or an iPad, and in Chrome and Edge on Android (from 108), a keyboard does not resize the layout
// viewport: it covers the layout viewport's bottom, and only the visual viewport (`window.visualViewport`) shrinks. Everything fixed to the
// window (the tab bar, a sheet, a dialog, the command menu, the toasts) and everything sized by `100dvh` would go under it. So while a keyboard
// is up its geometry is written to the root, and the stylesheet lays those parts out on what is still seen:
//
//   <html data-screen-keyboard>                 while a keyboard covers part of the window
//   --basalt-keyboard-inset                     the height it covers at the window's bottom
//   --basalt-viewport-top                       how far the visual viewport sits below the window's top (a phone can pan it inside the window)
//   --basalt-viewport-height                    the height that is still seen
//
// When the scroller is an element (a pane, an app that scrolls a column), it is a scroll owner: an element marked `data-scroll-owner`, or one that
// measures its own pinned parts (`data-pinned-measured`, written by usePinnedEdges). The same three properties are written on it, as its own: what
// the keyboard covers of its box at the bottom, what is hidden above it, and how much of it is still seen. Custom properties inherit, so whatever
// sits inside a scroll owner (a sticky foot, its scroll padding) reads that owner's values, and the stylesheet pads it as it pads the root.
//
// With no keyboard nothing is written and nothing changes. A page laid out with `interactive-widget=resizes-content` never sees one: the
// window itself shrinks. `data-keyboard="hardware"` (keyboard.ts) is another thing: a physical keyboard was used, so shortcut chips show.
//
// Nothing runs at import. The first part that needs it (a modal, the app shell, the tab bar, the toast stack, or an app's own call)
// installs one listener on the visual viewport and one `focusin`; the last to go removes them.

/**
 * A keyboard covers more than anything else that makes the visual viewport shorter than the window: a phone browser's own bars move the
 * window with them, and the shortcut strip an iPad shows over a hardware keyboard is about 55px. Not a value from any app's data.
 */
const KEYBOARD_MIN = 120;

export interface ScreenKeyboardState {
  /** Whether an on-screen keyboard is up. */
  open: boolean;
  /** The height it covers at the window's bottom, in px (0 when it is down, or when the visual viewport has been panned to the window's bottom). */
  inset: number;
  /** How far the seen part of the page sits below the window's top, in px. */
  top: number;
  /** The height still seen, in px, while a keyboard is up; 0 when none is (read the window's own height then). */
  height: number;
}

const CLOSED: ScreenKeyboardState = { open: false, inset: 0, top: 0, height: 0 };

// Allocated by the first user, never at import.
let users = 0;
let state: ScreenKeyboardState = CLOSED;
let subscribers: Set<() => void> | undefined;
let teardown: (() => void) | undefined;

const NAMES = ["--basalt-keyboard-inset", "--basalt-viewport-top", "--basalt-viewport-height"];
/** A field that raises the keyboard: a text area, something editable, or an input that takes typing (not a button, a box, a file or a range). */
const TEXT_ENTRY = "textarea, [contenteditable]:not([contenteditable=false]), input";
const NOT_TYPED = /button|checkbox|radio|submit|reset|file|image|range|color|hidden/;
/** A scroll owner: an element that scrolls (marked, or measuring its own pinned parts), not the window. */
const OWNERS = "[data-scroll-owner], [data-pinned-measured]:not(html)";
const px = Math.round;
const key = (s: ScreenKeyboardState) => `${s.inset} ${s.top} ${s.height}`;

/** What the visual viewport says now: a keyboard, or nothing. A pinch shrinks the visual viewport too, and is not a keyboard. */
function read(viewport: VisualViewport): ScreenKeyboardState {
  if (Math.abs(viewport.scale - 1) > 0.01 || innerHeight - viewport.height < KEYBOARD_MIN) return CLOSED;
  const top = Math.max(0, px(viewport.offsetTop));
  const height = px(viewport.height);
  return { open: true, top, height, inset: Math.max(0, px(innerHeight - height - top)) };
}

// The scroll owners last written to, so one that leaves, or the keyboard going, cleans them.
let owned: HTMLElement[] = [];
// While installed: watches an owner's size (set by install).
let watch: ((owner: HTMLElement) => void) | undefined;
const put = (element: HTMLElement, values?: number[]) => NAMES.forEach((name, i) => (values ? element.style.setProperty(name, `${values[i]}px`) : element.style.removeProperty(name)));

function write(next: ScreenKeyboardState) {
  const root = document.documentElement;
  owned.forEach((owner) => put(owner));
  owned = [];
  root.toggleAttribute("data-screen-keyboard", next.open);
  if (!next.open) return put(root);
  put(root, [next.inset, next.top, next.height]);
  // Each element scroller's own share: what of its box is under the keyboard, what is hidden above what is seen, and what is still seen.
  const bottom = next.top + next.height;
  for (const owner of document.querySelectorAll<HTMLElement>(OWNERS)) {
    watch?.(owner);
    const box = owner.getBoundingClientRect();
    put(owner, [box.bottom - bottom, next.top - box.top, Math.min(box.bottom, bottom) - Math.max(box.top, next.top)].map((n) => Math.max(0, px(n))));
    owned.push(owner);
  }
}

/**
 * The field being typed in is never under the keyboard or under what is pinned over the page: the scroll padding says how far to keep it. A field
 * inside something pinned (a foot, a sheet's foot) rides with it and is left alone.
 */
function reveal() {
  const active = document.activeElement;
  if (state.open && active?.matches(TEXT_ENTRY) && !NOT_TYPED.test((active as HTMLInputElement).type) && !active.closest("[data-pinned-edge]")) active.scrollIntoView({ block: "nearest", behavior: "instant" });
}

function install(): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  const page = document.scrollingElement ?? document.documentElement;
  let frame = 0;
  const apply = () => {
    frame = 0;
    const next = read(viewport);
    const rising = next.open && !state.open;
    // The keyboard is where it was: only an element scroller may have moved under it (the page scrolled), so its share is written again.
    if (next.open === state.open && key(next) === key(state)) return next.open && write(next);
    // A page scrolled to its end stays at its end (a conversation's newest line, a form's last action).
    const keep = rising && page.scrollHeight > page.clientHeight && page.scrollTop + page.clientHeight >= page.scrollHeight - 2;
    state = next;
    write(next);
    if (keep) scrollTo({ top: page.scrollHeight, behavior: "instant" });
    if (rising) reveal();
    subscribers?.forEach((notify) => notify());
  };
  // Read at once, then at most once a frame: a panned viewport sends a scroll event for every frame it moves.
  const schedule = () => { frame ||= requestAnimationFrame(apply); };
  // Any scroll in the document moves a scroll owner under the keyboard (a pane inside a scroller that scrolls, the page itself): the capture phase
  // hears an element's scroll, which does not bubble. Only while a keyboard is up does a scroll write anything (apply returns early otherwise).
  const targets: Array<[EventTarget, string, () => void]> = [[viewport, "resize", schedule], [viewport, "scroll", schedule], [document, "scroll", schedule], [document, "focusin", reveal]];
  // A scroll owner that mounts, or changes size, while a keyboard is up gets its share at once.
  // Each owner is observed once: observing an element again makes it report again, and that report would write again, every frame.
  const owners = new ResizeObserver(() => state.open && schedule());
  const seen = new WeakSet<Element>();
  const mounts = new MutationObserver(() => state.open && schedule());
  watch = (owner) => { if (!seen.has(owner)) { seen.add(owner); owners.observe(owner); } };
  apply();
  for (const [target, type, listener] of targets) target.addEventListener(type, listener, { passive: true, capture: true });
  mounts.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-scroll-owner", "data-pinned-measured"] });
  return () => {
    cancelAnimationFrame(frame);
    watch = undefined;
    owners.disconnect();
    mounts.disconnect();
    for (const [target, type, listener] of targets) target.removeEventListener(type, listener, true);
    state = CLOSED;
    write(CLOSED);
  };
}

function join() {
  users += 1;
  if (users === 1) teardown = install();
}
function leave() {
  users -= 1;
  if (users > 0) return;
  teardown?.();
  teardown = undefined;
}

/**
 * Lays Basalt's fixed parts out above an on-screen keyboard while one is up (see the module's note). Basalt's modals, `AppShell`, `TabBar`
 * and `ToastProvider` call it for themselves; call it in an app whose own fixed parts need the root's `--basalt-keyboard-inset`,
 * `--basalt-viewport-top` and `--basalt-viewport-height`. It renders nothing and returns nothing.
 */
export function useScreenKeyboardLayout(): void {
  React.useEffect(() => {
    join();
    return leave;
  }, []);
}

function subscribe(notify: () => void) {
  join();
  (subscribers ??= new Set()).add(notify);
  return () => {
    subscribers?.delete(notify);
    leave();
  };
}
const snapshot = () => state;
const serverSnapshot = () => CLOSED;

/**
 * Whether an on-screen keyboard is up, and its geometry in px, live. Closed on the server and in the first client render. Using it also lays
 * Basalt's parts out above the keyboard, as `useScreenKeyboardLayout` does.
 */
export function useScreenKeyboard(): ScreenKeyboardState {
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
