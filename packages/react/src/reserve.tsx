import * as React from "react";

import { join } from "./utils";

export interface ReserveProps extends Omit<React.ComponentPropsWithoutRef<"span">, "children"> {
  /** The key, in `alternatives`, of the wording that is seen. A key that is not there shows none and keeps the room. */
  show: string;
  /**
   * Every wording the text can take, by key. All of them are drawn in one grid cell and only the one `show` names is seen, so the cell
   * is as large as the largest and whatever sits beside it never moves. The caller lists them: nothing is worked out here.
   */
  alternatives: Record<string, React.ReactNode>;
  /** The wordings read the clock, so a server's and a client's may differ: each is marked `suppressHydrationWarning` (the one on the cell alone is one level deep). */
  live?: boolean;
  /** Classes for the alternatives, by the same keys, for styling or measuring one wording. */
  alternativeClassNames?: Record<string, string>;
}

/**
 * Room for words that change in place. Every wording stands in one grid cell, the ones not shown unseen: hidden from the
 * accessibility tree, not focusable, not selectable and not found by find-in-page. So the cell holds the size of its largest
 * wording and nothing beside it moves when the words do. The cell is an inline grid with its wordings at the start; `justify-items: end` on it (through `className`) puts a narrower one against the end.
 */
export function Reserve({ show, alternatives, alternativeClassNames, className, live, ...props }: ReserveProps) {
  return (
    <span {...props} className={join("basalt-reserve", className)}>
      {Object.entries(alternatives).map(([key, node]) => {
        const off = key !== show;
        return <span key={key} className={alternativeClassNames?.[key]} data-on={off ? undefined : ""} aria-hidden={off || undefined} inert={off || undefined} suppressHydrationWarning={live}>{node}</span>;
      })}
    </span>
  );
}
