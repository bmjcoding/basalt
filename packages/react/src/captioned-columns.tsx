import * as React from "react";

import { join } from "./utils";

// Captioned columns (DECISIONS 162, vote 4; Blacksand's home page's "what follows" list and its drawing's captions, ported): a short head over a
// sentence, in columns. One part in two sizes, each with the approved values. The count of columns is the app's: the part sets none of its own
// breakpoints, so the app picks the count for its container and passes it.

export type CaptionedColumnsSize = "large" | "small";

export interface CaptionedColumnsProps extends Omit<React.ComponentProps<"dl">, "children"> {
  /**
   * `large` is the home page's list: each item has a `border-divider` rule on top and `space-6` of padding above and below, the head `text-xl` at 600
   * in primary, `space-3` above a `text-md` sentence in secondary at 400. `small` is the captions' list: one `size-hairline` rule over the whole list
   * and `space-5` of padding under it, `space-6` between rows, the head `text-base` at 500 in primary, `space-1` above a `text-base` sentence in
   * secondary at 400. Default `large`.
   */
  size?: CaptionedColumnsSize;
  /** How many columns, 1 to 4, from the app's own container (the approved pages use 3 from 900px for large, and 2 from 480 and 4 from 960 for small). Default 1. The gutter is `size-gutter` in both. */
  columns?: 1 | 2 | 3 | 4;
  /** The items: `CaptionedColumn`s. */
  children: React.ReactNode;
}

/** A list of captioned columns: a description list, one `dt` (the head) and one `dd` (the sentence) in each item. */
export function CaptionedColumns({ size = "large", columns = 1, className, children, ...props }: CaptionedColumnsProps) {
  return <dl {...props} data-size={size} data-columns={columns} className={join("basalt-captioned", className)}>{children}</dl>;
}

export interface CaptionedColumnProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The head: a few words, in primary. */
  head: React.ReactNode;
  /** The sentence under it, in secondary. */
  children: React.ReactNode;
}

/** One item: a head over a sentence. */
export function CaptionedColumn({ head, className, children, ...props }: CaptionedColumnProps) {
  return (
    <div {...props} className={join("basalt-captioned-item", className)}>
      <dt className="basalt-captioned-head">{head}</dt>
      <dd className="basalt-captioned-body">{children}</dd>
    </div>
  );
}
