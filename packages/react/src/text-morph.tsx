import * as React from "react";

import { useReducedMotion } from "./motion";
import { join } from "./utils";

/** Indexes in `next` that continue a character from `previous`, in order. */
function keptIndexes(previous: string, next: string) {
  const from = [...previous];
  const to = [...next];
  const cell = (row: number, column: number) => grid[row]?.[column] ?? 0;
  const glyph = (list: string[], index: number) => list[index] ?? "";
  const grid = Array.from({ length: from.length + 1 }, () => Array<number>(to.length + 1).fill(0));
  for (let i = from.length - 1; i >= 0; i--) {
    for (let j = to.length - 1; j >= 0; j--) {
      const row = grid[i];
      if (!row) continue;
      row[j] = glyph(from, i) === glyph(to, j) ? cell(i + 1, j + 1) + 1 : Math.max(cell(i + 1, j), cell(i, j + 1));
    }
  }
  const kept = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < from.length && j < to.length) {
    if (glyph(from, i) === glyph(to, j)) {
      kept.add(j);
      i += 1;
      j += 1;
    } else if (cell(i + 1, j) >= cell(i, j + 1)) i += 1;
    else j += 1;
  }
  return kept;
}

export interface TextMorphProps {
  /** The full string. Shared letters stay; only the changed glyphs animate. */
  text: string;
  className?: string;
}

/**
 * A label or counter that changes in place. The visual glyphs are hidden from
 * assistive technology. One polite live region carries the whole string, once.
 */
export function TextMorph({ text, className }: TextMorphProps) {
  const reduced = useReducedMotion();
  const previous = React.useRef(text);
  const kept = reduced ? new Set<number>() : keptIndexes(previous.current, text);
  React.useEffect(() => {
    previous.current = text;
  }, [text]);
  let ordinal = 0;
  return (
    <span className={join("basalt-text-morph", className)}>
      <span aria-hidden="true" inert={true}>
        {[...text].map((character, index) => {
          const stay = kept.has(index);
          const key = stay ? `keep-${ordinal++}` : `new-${index}-${character}`;
          return (
            <span key={key} className={stay || reduced ? undefined : "basalt-glyph-in"}>
              {character}
            </span>
          );
        })}
      </span>
      <span className="basalt-visually-hidden" aria-live="polite">
        {text}
      </span>
    </span>
  );
}
