import * as React from "react";

import { changes, glyphOf } from "./control-seat";
import type { ControlIconProps, Shown } from "./control-seat";
import { CrossfadeSvg, DrawingSvg, settle } from "./glyph";
import type { Drawing } from "./glyph";
import { createMorph, endpointOf, keyOf } from "./glyph-motion";
import type { MorphController } from "./glyph-motion";
import { Icon } from "./icon";
import { glideTiming, bezier } from "./motion-timing";

// The engine a control's glyph change runs on, loaded on demand by control-icon.tsx (`loadFlight`): the council's morphs (glyph-motion.ts, the one
// engine `MorphIcon` runs too, shared and never copied), the drawing of a frame in flight, and the reduced-motion form. Nothing here runs when the
// module loads.

// Reduced motion (DECISIONS 221, 55 and 138 C10): an allowed change in a control swaps at once, as `MorphIcon` does (a toggle's seat crossfades instead: `Morphing`).
// `IconButton`'s `done` seat is not governed by this: it keeps its own 100ms crossfade (stylesheet) for any pair, and draws nothing here.
//
// A toggle's seat (`crossfade`, DECISIONS 361): a pressed toggle's glyph change that ends without a flight (reduced motion, a pair the engine refuses such as
// held pause and play, or the swap after an interruption) is the 100ms crossfade foundations names for the pressed toggle, from the drawing on screen to
// the one arriving. The fade is opacity only, so it runs under reduced motion; when it ends the seat is `Icon` again.

const reducedQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");

const clock = { now: () => performance.now(), raf: (fn: (now: number) => void) => requestAnimationFrame(fn), caf: (id: number) => cancelAnimationFrame(id) };

interface Live {
  /** What the seat showed after the last change: where the engine is heading. */
  was: Shown;
  ctl: MorphController | null;
  alive: boolean;
  /** The engine's frame on screen, while it is in flight. */
  frame: Drawing | null;
  /** The drawing a running crossfade is arriving at. */
  fading: Drawing | null;
}

/** A crossfade on a toggle's seat: the two settled drawings, and a number that remounts the tile so each fade starts from its first frame. */
interface Fade {
  readonly from: Drawing;
  readonly to: Drawing;
  readonly n: number;
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
 * `ease-out`, or a swap at once, as `MorphIcon`), so an interrupted morph keeps its identity. Under reduced motion every change swaps at once (a toggle's
 * seat crossfades instead), and a morph that is running when the preference turns on settles at its next frame. On a toggle's seat (`crossfade`) a change
 * that ends without a flight is the `duration-fast` crossfade between two settled drawings (`CrossfadeSvg`), never a swap.
 */
export function Morphing({ icon, selected = false, size, fillSafe, from, overlay, crossfade }: MorphingProps) {
  const now: Shown = { icon, selected };
  const data = glyphOf(icon);
  const [frame, setFrame] = React.useState<Drawing | null>(null);
  const [fade, setFade] = React.useState<Fade | null>(null);
  const live = React.useRef<Live | null>(null);
  live.current ??= { was: from ?? now, ctl: null, alive: true, frame: null, fading: null };

  React.useLayoutEffect(() => {
    const L = live.current as Live;
    const was = L.was;
    L.was = now;
    if (was.icon === now.icon && was.selected === now.selected) return;
    const drop = () => {
      L.ctl?.stop();
      L.ctl = null;
      L.frame = null;
      L.fading = null;
      setFrame(null);
      setFade(null);
    };
    const a = glyphOf(was.icon);
    // a long-tail icon, an action glyph selected, or a change the engine does not know: it is a swap
    if (!a || !data || (a.name === data.name && !changes(data))) return drop();
    // What is on screen now: the drawing a running fade is arriving at, the engine's frame in flight, or the glyph as it was.
    const shown = L.fading ?? L.frame ?? settle(a, was.selected);
    const arriving = settle(data, selected);
    // A toggle's seat (not a done seat): a change that ends without a flight crossfades from what is on screen. A change during a fade starts a new one.
    const fades = Boolean(crossfade && !overlay);
    const fadeTo = () => {
      L.frame = null;
      L.fading = arriving;
      setFrame(null);
      setFade((f) => ({ from: shown, to: arriving, n: (f?.n ?? 0) + 1 }));
    };
    // Under reduced motion the change swaps at once, or crossfades on a toggle's seat; the `done` seat's own crossfade (stylesheet) is all it shows.
    const query = reducedQuery();
    if (query.matches) {
      if (!fades) return drop();
      L.ctl?.stop();
      L.ctl = null;
      return fadeTo();
    }
    // A morph that is running when the preference turns on settles where it is going, at its next frame. (The preference is read here, a frame at a time, and not through a
    // listener on the query: registering one made the browser re-resolve styles without starting the seat's transitions.)
    const draw = (drawing: Drawing) => {
      const to = glyphOf(L.was.icon);
      if (ctl.status().moving && query.matches && to) ctl.go(to, L.was.selected, { duration: 0, ease: (t) => t, reduced: true });
      else {
        L.frame = ctl.status().moving ? drawing : null;
        setFrame(L.frame);
      }
    };
    const ctl = (L.ctl ??= createMorph(endpointOf(a, was.selected), keyOf(a, was.selected), draw, clock));
    const { duration, curve } = glideTiming(); // slow, ease-out
    ctl.go(data, selected, { duration, ease: (t) => bezier(curve, t), reduced: false });
    if (ctl.status().moving) {
      // A morph runs from the drawing on screen: a fade it interrupts gives way to it.
      L.fading = null;
      setFade(null);
      // The change was painted as the new glyph; put the old one back for the first frame, so a morph begins where it was.
      L.frame ??= shown;
      setFrame((f) => f ?? shown);
    } else if (fades) fadeTo();
    else setFade(null);
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
  if (fade) {
    // The arriving group's fade ends the crossfade: the seat is `Icon` again.
    const end = (event: React.AnimationEvent<SVGSVGElement>) => {
      if ((event.target as Element).getAttribute("data-fade") !== "in") return;
      (live.current as Live).fading = null;
      setFade((f) => (f && f.n === fade.n ? null : f));
    };
    return <CrossfadeSvg key={fade.n} from={fade.from} to={fade.to} size={size} className="basalt-icon" focusable="false" aria-hidden="true" data-glyph={data?.name ?? ""} onAnimationEnd={end} />;
  }
  return <Icon icon={icon} size={size} selected={selected} fillSafe={fillSafe} />;
}
