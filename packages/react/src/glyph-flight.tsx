import * as React from "react";

import { changes, glyphOf } from "./control-seat";
import type { ControlIconProps, Shown } from "./control-seat";
import { DrawingSvg, settle } from "./glyph";
import type { Drawing } from "./glyph";
import { createMorph, endpointOf, keyOf } from "./glyph-motion";
import type { MorphController } from "./glyph-motion";
import { Icon } from "./icon";
import { glideTiming, bezier } from "./motion-timing";

// The engine a control's glyph change runs on, loaded on demand by control-icon.tsx (`loadFlight`): the council's morphs (glyph-motion.ts, the one
// engine `MorphIcon` runs too, shared and never copied), the drawing of a frame in flight, and the reduced-motion form. Nothing here runs when the
// module loads.

// Reduced motion (DECISIONS 221, 55 and 138 C10): an allowed change in a control swaps at once, as `MorphIcon` does. `IconButton`'s `done` seat is not governed by this: it keeps
// its own 100ms crossfade (stylesheet) for any pair, and draws nothing here.

const reducedQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");

const clock = { now: () => performance.now(), raf: (fn: (now: number) => void) => requestAnimationFrame(fn), caf: (id: number) => cancelAnimationFrame(id) };

interface Live {
  /** What the seat showed after the last change: where the engine is heading. */
  was: Shown;
  ctl: MorphController | null;
  alive: boolean;
}

export interface MorphingProps extends ControlIconProps {
  /** What the seat showed before the engine took it: it runs from here at mount. */
  from?: Shown;
  /** The seat is a `done` seat: its own two glyphs stay mounted (so its stylesheet crossfade works) and a frame is drawn over them, never in their place. */
  overlay?: boolean;
}

/** One frame in flight, in the seat's own terms: the same size, class and attributes as the glyph at rest, or (in a done seat) one cell over its glyphs. */
function Frame({ drawing, name, size, overlay }: { drawing: Drawing; name: string; size?: number; overlay?: boolean }) {
  return <DrawingSvg drawing={drawing} size={size} className={overlay ? "basalt-glyph-frame" : "basalt-icon"} focusable="false" aria-hidden="true" data-glyph={name} />;
}

/**
 * `ControlIcon`'s engine side. The glyph at rest is `Icon`; a change runs through `createMorph`, whose allow-list decides (a morph at `slow` on
 * `ease-out`, or a swap at once, as `MorphIcon`), so an interrupted morph keeps its identity. Under reduced motion every change swaps at once, and a morph
 * that is running when the preference turns on settles at its next frame.
 */
export function Morphing({ icon, selected = false, size, fillSafe, from, overlay }: MorphingProps) {
  const now: Shown = { icon, selected };
  const data = glyphOf(icon);
  const [frame, setFrame] = React.useState<Drawing | null>(null);
  const live = React.useRef<Live | null>(null);
  live.current ??= { was: from ?? now, ctl: null, alive: true };

  React.useLayoutEffect(() => {
    const L = live.current as Live;
    const was = L.was;
    L.was = now;
    if (was.icon === now.icon && was.selected === now.selected) return;
    const drop = () => {
      L.ctl?.stop();
      L.ctl = null;
      setFrame(null);
    };
    const a = glyphOf(was.icon);
    // a long-tail icon, an action glyph selected, or a change the engine does not know: it is a swap
    if (!a || !data || (a.name === data.name && !changes(data))) return drop();
    // Under reduced motion the change swaps at once; the `done` seat's own crossfade (stylesheet) is all it shows.
    const query = reducedQuery();
    if (query.matches) return drop();
    // A morph that is running when the preference turns on settles where it is going, at its next frame. (The preference is read here, a frame at a time, and not through a
    // listener on the query: registering one made the browser re-resolve styles without starting the seat's transitions.)
    const draw = (drawing: Drawing) => {
      const to = glyphOf(L.was.icon);
      if (ctl.status().moving && query.matches && to) ctl.go(to, L.was.selected, { duration: 0, ease: (t) => t, reduced: true });
      else setFrame(ctl.status().moving ? drawing : null);
    };
    const ctl = (L.ctl ??= createMorph(endpointOf(a, was.selected), keyOf(a, was.selected), draw, clock));
    const { duration, curve } = glideTiming(); // slow, ease-out
    ctl.go(data, selected, { duration, ease: (t) => bezier(curve, t), reduced: false });
    // The change was painted as the new glyph; put the old one back for the first frame, so a morph begins where it was.
    if (ctl.status().moving) setFrame((f) => f ?? settle(a, was.selected));
  }, [icon, selected]);

  React.useEffect(() => {
    const L = live.current as Live;
    L.alive = true;
    return () => {
      L.alive = false;
      // Stopped after a microtask, so a development double mount (cleanup, then setup again at once) does not stop a morph that is still wanted.
      queueMicrotask(() => { if (!L.alive) L.ctl?.stop(); });
    };
  }, []);

  if (frame) return <Frame drawing={frame} name={data?.name ?? ""} size={size} overlay={overlay} />;
  if (overlay) return null;
  return <Icon icon={icon} size={size} selected={selected} fillSafe={fillSafe} />;
}
