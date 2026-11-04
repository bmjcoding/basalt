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
