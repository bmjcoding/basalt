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
  /**
   * The alternatives are blocks (a `Callout`, a panel), cimip-gaps-3 t4, item 9: the cell and its alternatives are `div`s, a full-width cell as tall as the tallest,
   * each block at its own height from the top. The spare room under a shorter block is the page; nothing is painted to hold it. The swap is at once. The unseen
   * blocks are sizing copies and hold nothing live: no form field (an inert field still submits, and a required one still blocks) and no `id`; buttons and links
   * are fine. A `Callout` here takes no `live`: say the change through the page's one `StatusLine`. Development warns on a form field or a live role.
   */
  block?: boolean;
}

declare const process: { env: { NODE_ENV?: string } };
let warnedLive = false;

/**
 * Room for words that change in place. Every wording stands in one grid cell, the ones not shown unseen: hidden from the
 * accessibility tree, not focusable, not selectable and not found by find-in-page. So the cell holds the size of its largest
 * wording and nothing beside it moves when the words do. The cell is an inline grid with its wordings at the start; `justify-items: end` on it (through `className`) puts a narrower one against the end.
 */
export function Reserve({ show, alternatives, alternativeClassNames, className, live, block = false, ...props }: ReserveProps) {
  const cell = React.useRef<HTMLElement | null>(null);
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || !block || warnedLive || !cell.current) return;
    if (cell.current.querySelector("input, select, textarea, [role=status], [role=alert], [role=log], [aria-live]:not([aria-live=off])")) {
      warnedLive = true;
      console.warn("Basalt Reserve: a `block` alternative holds a form field or a live region; its unseen copies would still submit, block a submit or speak. Say the change through one StatusLine");
    }
  });
  const Tag = block ? "div" : "span";
  return (
    <Tag {...(props as React.HTMLAttributes<HTMLElement>)} ref={block ? (cell as React.Ref<HTMLDivElement>) : undefined} data-block={block ? "" : undefined} className={join("basalt-reserve", className)}>
      {Object.entries(alternatives).map(([key, node]) => {
        const off = key !== show;
        return <Tag key={key} className={alternativeClassNames?.[key]} data-on={off ? undefined : ""} aria-hidden={off || undefined} inert={off || undefined} suppressHydrationWarning={live}>{node}</Tag>;
      })}
    </Tag>
  );
}
