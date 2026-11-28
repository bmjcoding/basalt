import * as React from "react";

import type { GlyphName } from "./glyph-names";
import type { IconComponent } from "./types";

// Icon sets (cimip-gaps-3 T9, DECISIONS 403, section 8): one mechanism for a palette's icons and an app's own. `Icon`, `MorphIcon` and `ControlIcon` look
// up the core glyph they were passed by its name; a part that draws a system mark (a Phosphor one) passes its slot. With no entry, the glyph the part
// already has is drawn, so the fallback is never a blank seat. The nearest provider is the whole set: it replaces the one above it and never merges, so
// `icons={{}}` is Basalt's own drawings. This module imports no glyph and no engine; nothing here runs when it loads.

/** A system mark a part draws from the long tail, by its role. */
export type SystemIconSlot =
  | "select-caret"
  | "sort-caret"
  | "status-info"
  | "status-success"
  | "status-warning"
  | "status-danger"
  | "status-pending"
  | "status-idle"
  | "status-skipped"
  | "status-canceled"
  | "attachment"
  | "theme-light"
  | "theme-dark"
  | "email";

/**
 * Replacements, by core glyph name or system slot. A core glyph from `defineGlyph` is drawn by Basalt's renderer (2.25 on the 24 grid, an opening at rest
 * that selected closes) and morphs between its own rest and selected; any other component is drawn as given and swaps, and must draw in `currentColor`
 * in a square box at the size passed. Seats, sizes, ink and `aria-hidden` never change. The key glyphs ⌘ ⌥ ⌃ and service marks are never replaced.
 */
export type IconSet = Partial<Record<GlyphName | SystemIconSlot, IconComponent>>;

// One context for every copy of this module (a lazy part is built with Icon inlined), kept on a global symbol and made at the first read, never at import.
function iconSetContext(): React.Context<IconSet | null> {
  const store = globalThis as unknown as Record<symbol, React.Context<IconSet | null> | undefined>;
  return (store[Symbol.for("basalt.icon-set")] ??= React.createContext<IconSet | null>(null));
}

declare const process: { env: { NODE_ENV?: string } };

const STATUS_SLOTS: readonly SystemIconSlot[] = ["status-info", "status-success", "status-warning", "status-danger", "status-pending", "status-idle", "status-skipped", "status-canceled"];
let warned: WeakSet<IconSet> | undefined;

/** Two status slots that share a component would say two states with one shape: warned once per set, in development. */
function checkStatus(icons: IconSet) {
  if ((warned ??= new WeakSet()).has(icons)) return;
  warned.add(icons);
  const seen = new Map<IconComponent, SystemIconSlot>();
  for (const slot of STATUS_SLOTS) {
    const icon = icons[slot];
    if (!icon) continue;
    const other = seen.get(icon);
    if (other) console.warn(`IconProvider: ${other} and ${slot} share one component; each status keeps a shape of its own (danger stays a circled cross in meaning).`);
    else seen.set(icon, slot);
  }
}

export interface IconProviderProps {
  icons: IconSet;
  children?: React.ReactNode;
}

/** Replaces core glyphs and system marks for what it holds. The nearest provider is the whole set; `icons={{}}` is Basalt's own drawings. */
export function IconProvider({ icons, children }: IconProviderProps): React.JSX.Element {
  if (process.env.NODE_ENV !== "production") checkStatus(icons);
  const Context = iconSetContext();
  return <Context.Provider value={icons}>{children}</Context.Provider>;
}

/** The nearest icon set, or null under none. */
export function useIconSet(): IconSet | null {
  return React.useContext(iconSetContext());
}

/** What to draw for `icon`: the set's entry for `slot`, else for the core glyph's name, else `icon` itself. */
export function pickIcon(set: IconSet | null, icon: IconComponent, slot?: SystemIconSlot): IconComponent {
  if (!set) return icon;
  const name = (icon as { glyph?: { name: string } }).glyph?.name as GlyphName | undefined;
  return (slot && set[slot]) || (name && set[name]) || icon;
}

/** The icon a part should draw for `icon` (and its `slot`) under the nearest set. */
export function useIcon(icon: IconComponent, slot?: SystemIconSlot): IconComponent {
  return pickIcon(useIconSet(), icon, slot);
}
