import * as React from "react";

// Two small hooks the site header, the app shell and the tab bar share. Neither runs anything when the module loads.

/**
 * Whether a media query matches, live. It is `false` for the server render and the first client render, so what is drawn
 * first is the same on both, and the real answer lands in the layout effect before paint.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback((notify: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener("change", notify);
    return () => list.removeEventListener("change", notify);
  }, [query]);
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/**
 * Marks `data-keys` on the element while the keyboard was the last input, the way `Nav`'s glide does: the first key (other
 * than a bare modifier) sets it and the next pointer move clears it. CSS hides a hover or a press circle under it, so only the
 * focus ring shows. The tab bar has no shared pill to carry this, so it uses this.
 */
export function useKeysMark(ref: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const doc = element.ownerDocument;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") return;
      element.setAttribute("data-keys", "");
    };
    const pointer = () => element.removeAttribute("data-keys");
    doc.addEventListener("keydown", key, { capture: true, passive: true });
    doc.addEventListener("pointermove", pointer, { capture: true, passive: true });
    doc.addEventListener("pointerdown", pointer, { capture: true, passive: true });
    return () => {
      doc.removeEventListener("keydown", key, { capture: true });
      doc.removeEventListener("pointermove", pointer, { capture: true });
      doc.removeEventListener("pointerdown", pointer, { capture: true });
      element.removeAttribute("data-keys");
    };
  }, [ref]);
}
