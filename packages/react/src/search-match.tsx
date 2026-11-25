// A matched word, and a passage with its matches marked from a server's ranges. A module of its own, so the command row (part of
// the package's main graph) marks its matches without loading the search dialog. `search.tsx` re-exports both.
import type * as React from "react";

import { join } from "./utils";

/** A match in a passage: from `start` up to (not including) `end`, in UTF-16 code units, as a server's highlighter reports them. */
export type MatchRange = readonly [start: number, end: number];

export type SearchMatchProps = React.ComponentProps<"mark">;

/** A matched word in a passage: a `mark` in primary ink at 600 on the passage's secondary ink. No fill and no colour: the weight and the ink are the mark. */
export function SearchMatch({ className, ...props }: SearchMatchProps) {
  return <mark {...props} className={join("basalt-search-match", className)} />;
}

/**
 * A passage with its matches marked, from the ranges a server sends: overlapping and touching ranges are joined, ranges outside the text are cut
 * to it, a boundary inside a code point widens to the whole of it, and the order they come in does not matter. Plain text in, nodes out: nothing is parsed as HTML.
 */
export function markMatches(text: string, ranges: readonly MatchRange[]): React.ReactNode[] {
  // A boundary inside a code point (between the two halves of a surrogate pair, an emoji) widens to take the whole code point.
  const inside = (at: number) => at > 0 && at < text.length && /[\uDC00-\uDFFF]/.test(text[at]!) && /[\uD800-\uDBFF]/.test(text[at - 1]!);
  const sorted = ranges
    .map(([start, end]) => [Math.max(0, Math.min(start, end)), Math.min(text.length, Math.max(start, end))] as const)
    .map(([start, end]) => [inside(start) ? start - 1 : start, inside(end) ? end + 1 : end] as const)
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  const joined: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const last = joined[joined.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else joined.push([start, end]);
  }
  const out: React.ReactNode[] = [];
  let at = 0;
  for (const [start, end] of joined) {
    if (start > at) out.push(text.slice(at, start));
    out.push(<SearchMatch key={start}>{text.slice(start, end)}</SearchMatch>);
    at = end;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
