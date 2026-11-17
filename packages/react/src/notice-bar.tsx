import * as React from "react";

import { usePanelLevel } from "./layers";
import { PageRow } from "./page";
import { join } from "./utils";

export interface NoticeBarProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Required: names the region, so a screen reader can find the notice and say what it is ("Preview notice"). */
  label: string;
  /** The first words, in primary ink at 600: "Preview." The rest of the line is secondary. */
  title?: React.ReactNode;
}

/**
 * A full-width band at the top of a page: one short notice that applies to the whole page (a preview, a price that is to be
 * confirmed). It is a page's first block, above the site header, and it scrolls away. The fill is the level-1 panel fill, edge to
 * edge, with a `border-divider` under it; no rim, no radius, no icon. It is a named region and not a live region: it is in the page
 * on load, and nothing announces it. The line sits in the page's row, so it lines up with what is below, and wraps under 720.
 */
export function NoticeBar({ label, title, className, children, ...props }: NoticeBarProps) {
  const level = usePanelLevel();
  return (
    <div {...props} role="region" aria-label={label} data-level={level} className={join("basalt-notice-bar", className)}>
      <PageRow className="basalt-notice-bar-in">
        <p className="basalt-notice-bar-text">{title ? <><strong className="basalt-notice-bar-title">{title}</strong>{" "}</> : null}{children}</p>
      </PageRow>
    </div>
  );
}
