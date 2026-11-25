import * as React from "react";

import { useScreenKeyboardLayout } from "./screen-keyboard";

// React context crosses portals. Each modal reserves space for its backdrop, content and
// floating children; a nested modal then covers the entire preceding level.
export const ModalDepth = /* @__PURE__ */ React.createContext(0);

// The popup of the nearest Basalt modal (Dialog, AlertDialog, Sheet, CommandMenu), or null on the page. While a modal is open, what is outside its popup is
// inert (Base UI's marks, and useModalOutside's guard over anything added to the page later), so a native modal opened from inside one (the diagram viewer)
// is written into this popup rather than at the end of the body: inside, it stays operable, a press in it is not a press outside, and the focus trap holds it.
// A `showModal` dialog draws in the top layer wherever it sits. Context crosses portals, as the depth does.
export const ModalHost = /* @__PURE__ */ React.createContext<React.RefObject<HTMLElement | null> | null>(null);

export function useModalLayer() {
  const parent = React.useContext(ModalDepth);
  // A modal is fixed to the window: while an on-screen keyboard is up it is laid out on what is still seen.
  useScreenKeyboardLayout();
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
//   a non-modal popup (Menu, Select, Combobox, Popover)                             max(1, opener + 1), capped at 3
//   a modal (Dialog, AlertDialog, Sheet, CommandMenu)                               1, above its scrim; what it holds starts at 2
//   a Tooltip                                                                       3
//   a Toast (portalled; its rim and shadow part it from what it covers)             1
//
// The floor is 1 in both themes: in light, levels 1 to 3 are one white, so it changes no pixel there. A popup
// from the page or a sidebar is level 1 (`#0a0a0a` in dark); from a card or a modal it is 2. A modal's own
// panels sit one above it, so a menu opened from a dialog is level 2.

export type SurfaceLevel = 0 | 1 | 2 | 3;
export const SurfaceLevelContext = /* @__PURE__ */ React.createContext<SurfaceLevel>(0);

const cap = (level: number): SurfaceLevel => Math.min(level, 3) as SurfaceLevel;

/** The level of an in-flow panel: one above whatever it sits in. */
export function usePanelLevel(): SurfaceLevel {
  return cap(React.useContext(SurfaceLevelContext) + 1);
}

/** The level of a non-modal popup: one above its opener, with a floor of 1 and a cap of 3. */
export function usePopupLevel(): SurfaceLevel {
  return cap(Math.max(1, React.useContext(SurfaceLevelContext) + 1));
}

/** The level a modal (Dialog, AlertDialog, Sheet, CommandMenu) resets to above its scrim; its inner panels start at 2. */
export const MODAL_LEVEL: SurfaceLevel = 1;

/** The level of a band inside a modal (the command menu's input row): one above the modal, so 2. A band is not a box. */
export const BAND_LEVEL: SurfaceLevel = 2;

/** Hands a panel's level to what it holds. */
export function inLevel(level: SurfaceLevel, children: React.ReactNode) {
  return React.createElement(SurfaceLevelContext.Provider, { value: level }, children);
}
