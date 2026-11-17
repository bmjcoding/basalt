import * as React from "react";

import { GoArrow } from "./go-arrow";
import { join } from "./utils";

export interface BackLinkProps extends Omit<React.ComponentProps<"a">, "children" | "className"> {
  /** The parent's name: "Brands". */
  children: React.ReactNode;
  /** The `nav`'s name, for translation. Default "Back". */
  navLabel?: string;
  /** Goes on the `nav`. */
  className?: string;
}

/**
 * One line above a title: the left arrow and the parent's name (DECISIONS 152, D5c). A `nav` with one link in it, 14/20, secondary ink
 * lifting to primary on hover with no underline, a 44px target. It is not a trail: use `Breadcrumbs` for more than the parent.
 */
export function BackLink({ children, navLabel = "Back", className, ...props }: BackLinkProps) {
  return (
    <nav aria-label={navLabel} className={join("basalt-back-link", className)}>
      <a {...props}>
        <GoArrow side="start" />
        <span>{children}</span>
      </a>
    </nav>
  );
}
