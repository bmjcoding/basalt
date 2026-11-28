import * as React from "react";

import { watchScrollFade, type ScrollFade, type ScrollFadeOptions, type Sides } from "./scroll-fade";
import { useScrollStop } from "./scroll-stop";

/**
 * Set by a popup whose content already has its own port (a search dialog's results, `CountNames`, the notification centre): the popup draws no second one
 * (cimip-gaps-3 t7, "composed dialogs and popovers get no second port"). Internal: not exported from the package.
 */
export const Portless = /* @__PURE__ */ React.createContext(false);

/**
 * Runs the fade on a port for as long as it is mounted (cimip-gaps-3 t7). `options` is read when the port mounts; its functions are called on every
 * measure, so they may read the live DOM. Returns the watcher (null until mounted) for a component that calls `refresh()` or `keep()`.
 */
export function useScrollFade(port: React.RefObject<HTMLElement | null>, options: ScrollFadeOptions = {}, deps: React.DependencyList = []): React.RefObject<ScrollFade | null> {
  const fade = React.useRef<ScrollFade | null>(null);
  const held = React.useRef(options);
  held.current = options;
  React.useLayoutEffect(() => {
    const box = port.current;
    if (!box) return undefined;
    const now = held.current;
    const watcher = watchScrollFade(box, {
      ...now,
      insets: now.insets ? () => held.current.insets?.() ?? {} : undefined,
      pinned: now.pinned ? () => held.current.pinned?.() ?? {} : undefined,
    });
    fade.current = watcher;
    return () => {
      watcher.stop();
      fade.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return fade;
}

export interface FadePortProps extends React.ComponentProps<"div"> {
  /** Opaque strips held inside the port at an edge (a sheet's held actions), measured from the port on every refresh. */
  pinned?: (port: HTMLElement) => Sides;
  /** The id that names the port while it is a keyboard stop of its own (it overflows and holds nothing focusable), or a function of the port. */
  labelledBy?: string | ((box: HTMLElement) => string | undefined);
}

/**
 * The scrolling part of a popup or a panel whose host draws the rim, the fill, the shadow and the ring (cimip-gaps-3 t7): it holds the padding and the
 * children, scrolls on the block axis and fades at each edge that hides more. While it overflows and holds nothing focusable it is a keyboard stop with a
 * role and a name (`useScrollStop`); its ring is the host's. A focused item inside it and its +2 ring are brought clear and never under a band.
 */
export function FadePort({ pinned, labelledBy, className, ref, ...props }: FadePortProps) {
  const named = Boolean(props["aria-label"] || props["aria-labelledby"]);
  const box = React.useRef<HTMLDivElement | null>(null);
  const keep = React.useCallback((node: HTMLDivElement | null) => {
    box.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [ref]);
  const stop = useScrollStop<HTMLDivElement>({ named, labelledBy }, keep);
  useScrollFade(box, { axis: "block", ring: 4, pinned: pinned ? () => (box.current ? pinned(box.current) : {}) : undefined });
  return <div {...stop.attributes} {...props} ref={stop.ref} className={className} />;
}

/**
 * Gives the fade the row the keys are on in a list whose focus stays in its field (a combobox, the command menu and list): whenever `attributes` change under
 * the port, the row matching `active` is passed to `keep()` while a key was the last input, and `null` after a pointer moved, so a hovered row is never
 * scrolled to. On unmount nothing is kept.
 */
export function useKeptRow(port: React.RefObject<HTMLElement | null>, fade: React.RefObject<ScrollFade | null>, active: string, attributes: string[]) {
  React.useLayoutEffect(() => {
    const box = port.current;
    if (!box) return undefined;
    const doc = box.ownerDocument;
    let keys = false;
    const update = () => fade.current?.keep(keys ? box.querySelector(active) : null);
    const onKey = () => { keys = true; };
    const onPointer = () => { keys = false; };
    const rows = new MutationObserver(update);
    rows.observe(box, { subtree: true, attributes: true, attributeFilter: attributes });
    doc.addEventListener("keydown", onKey, true);
    doc.addEventListener("pointermove", onPointer, true);
    return () => {
      rows.disconnect();
      doc.removeEventListener("keydown", onKey, true);
      doc.removeEventListener("pointermove", onPointer, true);
      fade.current?.keep(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** The highlighted row of a Base UI popup or of the command list. */
const ACTIVE_ROW = ".basalt-menu-item[data-highlighted], .basalt-menu-item[data-selected='true']";

export interface MenuPortProps extends React.ComponentProps<"div"> {
  /** Focus stays in a field while the keys move the active row (a combobox): the row is kept clear of the band. */
  field?: boolean;
}

/**
 * The scrolling part of a Menu, Select, Combobox or MentionPicker popup (cimip-gaps-3 t7): the popup (`.basalt-menu`) keeps its rim, radius, fill and shadow
 * and clips; this holds the padding, the rows and the glide plate, scrolls and fades at each edge that hides more. The active row's plate is inside the row
 * (no ring room), and its `scroll-padding-block` keeps the fade and space-0-5 clear.
 */
export function MenuPort({ field = false, className, ref, ...props }: MenuPortProps) {
  const box = React.useRef<HTMLDivElement | null>(null);
  const keep = React.useCallback((node: HTMLDivElement | null) => {
    box.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [ref]);
  const fade = useScrollFade(box, { axis: "block" });
  useKeptRow(field ? box : NONE, fade, ACTIVE_ROW, ["data-highlighted", "data-selected"]);
  return <div {...props} ref={keep} className={className ? `basalt-menu-scroll ${className}` : "basalt-menu-scroll"} />;
}

/** A ref that holds nothing, for a hook that runs only when given a real one. */
const NONE: React.RefObject<HTMLElement | null> = { current: null };

/** A list of rows whose focus stays in its field (the command menu and the command list): the fade, with the active row kept while the keys drive it. */
export function useRowsFade(port: React.RefObject<HTMLElement | null>) {
  const fade = useScrollFade(port, { axis: "block" });
  useKeptRow(port, fade, ACTIVE_ROW, ["data-highlighted", "data-selected"]);
  return fade;
}

/**
 * A ref that runs the fade on whatever element it is given, for a port that mounts and unmounts with its own condition (a list that shows only with rows):
 * the watcher starts when the element attaches and stops when it detaches. `outer` is given the element too.
 */
export function useFadeRef<T extends HTMLElement>(options: ScrollFadeOptions = {}, outer?: React.Ref<T>): (node: T | null) => void {
  const watcher = React.useRef<ScrollFade | null>(null);
  const held = React.useRef(options);
  held.current = options;
  return React.useCallback((node: T | null) => {
    watcher.current?.stop();
    watcher.current = node ? watchScrollFade(node, held.current) : null;
    if (typeof outer === "function") outer(node);
    else if (outer) (outer as React.MutableRefObject<T | null>).current = node;
  }, [outer]);
}

/**
 * The name of a popover's port while it is a keyboard stop of its own: the popup's title (the id Base UI names the popup by), or else its trigger, which is
 * given an id for it when it has none. Undefined when neither is there: the stop is then a stop with no role, as a box with no name must be.
 */
export function popupName(box: HTMLElement): string | undefined {
  const popup = box.closest<HTMLElement>('[role="dialog"], .basalt-popover');
  if (!popup) return undefined;
  const title = popup.getAttribute("aria-labelledby");
  if (title) return title;
  if (!popup.id) return undefined;
  const trigger = [...box.ownerDocument.querySelectorAll<HTMLElement>("[aria-controls]")].find((el) => el.getAttribute("aria-controls")?.split(/\s+/).includes(popup.id));
  if (!trigger) return undefined;
  trigger.id ||= `${popup.id}-trigger`;
  return trigger.id;
}
