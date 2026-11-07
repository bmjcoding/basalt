import type * as React from "react";

import { join } from "./utils";

/** A key or shortcut, e.g. "⌘K". */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd {...props} className={join("basalt-kbd", className)} />;
}
