import type * as React from "react";

import { join } from "./utils";

/**
 * Type and rhythm for the elements an app's renderer emits (Markdown, a forge's HTML), set on the elements inside it: body 14/20, blocks
 * `space-3` apart, lists, `strong` and `em`, inline `code` as `InlineCode`, `a` as `Link`, and a floor for headings, quotes, rules, `pre` and
 * images, so nothing falls to the browser's defaults. It sets no measure: put it in a `Prose` in a card, or bare in a stream's text column.
 *
 * Basalt ships no parser. Parse with what the other end renders, clean the result, pass every link target through `safeHref`, and hand over
 * elements, never a string of markup. Map anchors to `Link` (only `Link` draws the new-tab arrow) and `pre` to `CodeBlock`.
 */
export function RichText({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return <div {...props} className={join("basalt-rich-text", className)} />;
}
