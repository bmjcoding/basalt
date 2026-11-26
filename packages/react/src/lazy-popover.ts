import * as React from "react";

import type { AnchoredPopoverProps } from "./anchored-popover";

// The anchored popover, made lazily on first use (never when a module loads): `Stat`'s hint and a rail stage's detail load Base UI's popover only when one opens.
let lazy: React.LazyExoticComponent<React.ComponentType<AnchoredPopoverProps>> | undefined;

export function lazyAnchoredPopover() {
  lazy ??= React.lazy(() => import("./anchored-popover"));
  return lazy;
}
