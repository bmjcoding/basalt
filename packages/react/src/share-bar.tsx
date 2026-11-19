import * as React from "react";

import { shareOf } from "./share-of";
import { join } from "./utils";

// A share bar (DECISIONS 153, votes 12 and 13): parts of a whole as one bar, N1's form without its gloss. Every part is one ink and a gap apart, the parts are told
// apart by length, order and words (each part's share and name under it), never by a lighter ink. Nothing here runs when the module loads.

/** One part of the whole. `value` is any positive number; the shares come from the values, so they add to 100. */
export interface SharePart {
  /** A stable key. Defaults to the name. */
  id?: string;
  name: string;
  value: number;
}

export interface ShareBarProps extends Omit<React.ComponentProps<"ul">, "children"> {
  parts: SharePart[];
  /** 8px (`space-2`, a plan) or 12px (`space-3`, a tally, where a part is at least 12px long and as wide as its words, taken from the other parts). */
  size?: "sm" | "md";
  /** How a part's share is written, from the share in whole percent. Default "40%". */
  format?: (share: number, part: SharePart) => string;
}

/**
 * Parts of a whole as one bar: a part is as long as its share, in one ink with a gap between parts, with its share and its name under it. The bar is decoration and
 * the words are the content, so a screen reader reads each part once ("40%, Protein"). A part of nothing draws no bar and is left out; a part that is more than nothing and rounds to 0 reads "<1%" to the eye and "less than 1%" to assistive technology (DECISIONS 157, Q4); a part that rounds to 100 beside a part that is not empty reads ">99%" and is spoken "more than 99 percent" (DECISIONS 167, Q11b), since "100%" would say the rest is nothing; every other share is a whole number.
 */
export function ShareBar({ parts, size = "sm", format, className, ...props }: ShareBarProps) {
  const kept = parts.filter((part) => Number.isFinite(part.value) && part.value > 0);
  const shares = shareOf(kept.map((part) => part.value));
  const total = kept.reduce((sum, part) => sum + part.value, 0);
  return (
    <ul {...props} role="list" className={join("basalt-share", className)} data-size={size}>
      {kept.map((part, index) => (
        <li key={part.id ?? part.name} className="basalt-share-part" style={{ "--_share": (part.value / total) * 100 } as React.CSSProperties}>
          <span className="basalt-share-bar" aria-hidden="true" />
          <b className="basalt-share-value">{format ? format(shares[index]!, part) : shares[index] === 0 ? <><span aria-hidden="true">&lt;1%</span><span className="basalt-visually-hidden">less than 1%</span></> : shares[index] === 100 && kept.length > 1 ? <><span aria-hidden="true">&gt;99%</span><span className="basalt-visually-hidden">more than 99 percent</span></> : `${shares[index]}%`}</b>
          <span className="basalt-visually-hidden"> </span>
          <span className="basalt-share-name">{part.name}</span>
        </li>
      ))}
    </ul>
  );
}
