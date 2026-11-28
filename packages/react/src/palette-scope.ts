import * as React from "react";

// A palette scope's context (cimip-gaps-3 T9, DECISIONS 403), in a module of its own so a part that portals reads it without carrying the palette's
// runtime. `PaletteScope` provides its palette and its theme; every Basalt part that portals writes both on its portalled root when it opens from inside
// a scope, so a popup from a light `beryl` card on a dark page is light `beryl`. With no scope above it a part writes nothing, as before.

export interface PaletteScopeValue {
  readonly palette: string;
  readonly theme?: "light" | "dark";
}

// One context for every copy of this module: a lazy popup is built with what it needs inlined (anchored-popover, the diagram viewer), and a second
// context there would never see the scope. So the context is kept on a global symbol, made at the first read, never at import.
export function paletteScopeContext(): React.Context<PaletteScopeValue | null> {
  const store = globalThis as unknown as Record<symbol, React.Context<PaletteScopeValue | null> | undefined>;
  return (store[Symbol.for("basalt.palette-scope")] ??= React.createContext<PaletteScopeValue | null>(null));
}

/** What a portalled root writes: the nearest scope's `data-palette` and `data-theme`, or nothing outside a scope. Spread it on the portal. */
export function usePortalScope(): { "data-palette"?: string; "data-theme"?: string } | undefined {
  const scope = React.useContext(paletteScopeContext());
  return React.useMemo(() => (scope ? { "data-palette": scope.palette, "data-theme": scope.theme } : undefined), [scope]);
}
