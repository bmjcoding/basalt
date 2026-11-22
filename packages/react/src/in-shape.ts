import * as React from "react";

// Where a part is drawn, in a module of its own so a part that only asks (a stream entry that scrolls itself into view when it is the one a link
// opened) does not carry `LoadingShape` with it. `LoadingShape` provides it; nothing else does.

/** 0 outside a shape; 1 in a drawn shape; 2 in the unseen twin a prefill is compared with. */
export type InShape = 0 | 1 | 2;

export const InShapeContext = /* @__PURE__ */ React.createContext<InShape>(0);

/**
 * Where a part is drawn: 0 outside a shape (it is the content); 1 in a drawn shape, where a part that writes (saves a draft, marks something read)
 * does nothing; 2 in the unseen twin, where a part that draws outside itself (a portal into the header) draws nothing.
 */
export function useInShape(): InShape {
  return React.useContext(InShapeContext);
}
