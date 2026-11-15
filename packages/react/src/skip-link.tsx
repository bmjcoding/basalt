import * as React from "react";

import { join } from "./utils";

export interface SkipLinkProps extends Omit<React.ComponentPropsWithoutRef<"a">, "href"> {
  /** The id of the element it skips to, with or without the `#`: the page's `main`, say. */
  target: string;
  /** The words. Default "Skip to content". */
  children?: React.ReactNode;
}

/**
 * A link that jumps past the page's bar and navigation to its content. Place it yourself as the first element of the page, so
 * it is the first tab stop; it is unseen until it has focus, then shows at the page's top start, over everything. The target
 * takes focus when it can (give a `main` `tabIndex={-1}`); otherwise the next Tab starts there. It is not drawn in print.
 * `AppShell` and `SiteHeader` do not render one.
 */
export function SkipLink({ target, children = "Skip to content", className, ...props }: SkipLinkProps) {
  return (
    <a {...props} className={join("basalt-skip-link", className)} href={`#${target.replace(/^#/, "")}`}>
      {children}
    </a>
  );
}
