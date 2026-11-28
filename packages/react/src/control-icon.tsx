import * as React from "react";

import { changes, glyphOf } from "./control-seat";
import type { ControlIconProps, Shown } from "./control-seat";
import { IconDrawing } from "./icon";
import { useIcon } from "./icon-set";

// How a control draws its glyph when the glyph can change (engineering that restores DECISIONS 38 and 55: the core glyphs morph where the
// council allowed it). A long-tail icon is `Icon`, with no hook. A core glyph is `Icon` too, byte for byte, until its drawing changes: then, with
// the engine loaded, the change runs through the engine's allow-list; without it, the change swaps and the engine loads, so the next one morphs.
// The engine is one shared module, loaded on demand (`glyph-flight`): at mount for a control whose drawing can change (a toggle, a current item, a
// done seat, a copy button) and at the first change of drawing for any other. Frame state exists only on a control whose drawing has changed
// with the engine in hand. This file is the part every control carries, and is kept small for that reason.

// The engine, once loaded. Assigned only by `loadFlight`, so loading this module does nothing.
type Flight = typeof import("./glyph-flight");
let flight: Flight | undefined;
let loading: Promise<Flight | void> | undefined;

/** Load the engine (once). A failed load is not kept, so the next ask tries again; a control that couldn't load it keeps swapping. */
export function loadFlight() {
  loading ??= import("./glyph-flight").then(
    (module) => (flight = module),
    () => { loading = undefined; },
  );
  return loading;
}

/** Whether a change from one shown glyph to another is a change of drawing the engine may run: both core, and not an action glyph selected. */
const moves = (was: Shown, now: Shown) => {
  const b = glyphOf(now.icon);
  return Boolean(b && glyphOf(was.icon) && (was.icon !== now.icon || changes(b)));
};

interface Slot {
  /** What the seat showed at the last change (or at mount). */
  was: Shown;
  /** Set once, at the change that hands the seat to the engine: what the seat showed just before it. The engine's component takes it at its mount and never again. */
  from?: Shown;
  /** A change of drawing came while the engine was not in hand: it swapped, and the engine is wanted. */
  late?: boolean;
}

/**
 * The state a seat keeps: a state and one effect. It sees a change of what is shown while it renders (so no frame of the new glyph is committed first),
 * and answers with the engine's component once the seat should draw through it: the engine is loaded and the drawing has changed. `preload` asks for
 * the engine at mount (and whenever it becomes true), for a seat whose drawing will change.
 */
export function useGlyphSlot(now: Shown, preload: boolean) {
  const [slot, setSlot] = React.useState<Slot>({ was: now });
  let at = slot;
  // Once the engine's component is mounted it follows the seat itself; before that, a change of what is shown is seen here.
  if (!slot.from && (slot.was.icon !== now.icon || slot.was.selected !== now.selected)) {
    const run = moves(slot.was, now);
    setSlot((at = { was: now, from: run && flight ? slot.was : undefined, late: run && !flight }));
  }
  const late = at.late;
  React.useEffect(() => {
    if (!flight && (late || preload)) loadFlight();
  }, [late, preload]);
  return [at.from && flight ? flight.Morphing : null, at.from] as const;
}

/**
 * A control's glyph: `Icon`, byte for byte, until its drawing changes with the engine in hand. Nothing here changes the glyph's size or seat.
 */
export function ControlIcon({ slot, ...given }: ControlIconProps) {
  // The icon set's entry for this glyph (or slot) is what the seat shows, and what a change is measured against (cimip-gaps-3 T9).
  const icon = useIcon(given.icon, slot);
  const props = { ...given, icon };
  const { selected = false, eager } = props;
  const data = glyphOf(icon);
  const [Morph, from] = useGlyphSlot({ icon, selected }, Boolean(eager && data && changes(data)));
  return Morph ? <Morph {...props} from={from} /> : <IconDrawing icon={icon} size={props.size} selected={selected} fillSafe={props.fillSafe} />;
}
