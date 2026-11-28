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
