import * as React from "react";

// React context crosses portals. Each modal reserves space for its backdrop, content and
// floating children; a nested modal then covers the entire preceding level.
export const ModalDepth = React.createContext(0);

export function useModalLayer() {
  const parent = React.useContext(ModalDepth);
  return {
    depth: parent + 1,
    popup: `calc(var(--basalt-layer-dialog) + ${parent * 4})`,
    backdrop: parent ? `calc(var(--basalt-layer-dialog) + ${parent * 4 - 1})` : "var(--basalt-layer-overlay)",
  };
}

export function useFloatingLayer() {
  const depth = React.useContext(ModalDepth);
  return depth ? { zIndex: `calc(var(--basalt-layer-dialog) + ${(depth - 1) * 4 + 2})` } : undefined;
}

// ---- Surface levels ----
//
// Depth is one of four levels: 0 is the page, 1 to 3 are panels, and 3 is the cap. A level is private:
// no prop sets it, and nothing outside the package reads it. Each panel renders its level as
// `data-level`, which the stylesheet turns into its fill; the context carries it to what the panel holds,
// across portals, as the modal depth does.
//
//   an in-flow panel (Card, TableContainer, CodeBlock, Callout, the preview card)   parent + 1
//   a non-modal popup (Menu, Select, Combobox, Popover)                             max(2, opener + 1)
//   a modal (Dialog, AlertDialog, Sheet, CommandMenu)                               2, above its scrim
//   a Tooltip or a Toast                                                            3

export type SurfaceLevel = 0 | 1 | 2 | 3;
export const SurfaceLevelContext = React.createContext<SurfaceLevel>(0);

const cap = (level: number): SurfaceLevel => Math.min(level, 3) as SurfaceLevel;

/** The level of an in-flow panel: one above whatever it sits in. */
export function usePanelLevel(): SurfaceLevel {
  return cap(React.useContext(SurfaceLevelContext) + 1);
}

/** The level of a non-modal popup: one above its opener, and never below 2. */
export function usePopupLevel(): SurfaceLevel {
  return cap(Math.max(2, React.useContext(SurfaceLevelContext) + 1));
}

/** Hands a panel's level to what it holds. */
export function inLevel(level: SurfaceLevel, children: React.ReactNode) {
  return React.createElement(SurfaceLevelContext.Provider, { value: level }, children);
}
