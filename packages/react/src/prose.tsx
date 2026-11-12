import type * as React from "react";

import { join } from "./utils";

/**
 * A prose page's text column: `size-prose-width` (34rem, about 72 characters of Geist at 16/24, so it follows the reader's text
 * size). It sits on the row's start edge and is never centred, so its first letter lines up with the brand above it and with every
 * chart and table. It sets a measure and nothing else: a data page fills the row (`size-page-width`) instead.
 */
export function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return <div {...props} className={join("basalt-prose", className)} />;
}
