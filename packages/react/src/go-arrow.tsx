// The arrow at the end of a same-tab link, card or row, and before a back link (DECISIONS 152, vote 1): the core `arrow-right`
// and `arrow-left` glyphs. Up-right (`external`) is the new-tab cue and nothing else, so a link that opens a new tab draws that
// instead (see `new-tab.tsx`) and never both. It travels 2px in its own direction on hover and focus, over `duration-base` on
// `ease-out`, and not under reduced motion (vote 2): the movement is CSS, on `.basalt-go-arrow`.
import * as React from "react";

import { ArrowLeftGlyph } from "./glyphs/arrow-left";
import { ArrowRightGlyph } from "./glyphs/arrow-right";
import { Icon } from "./icon";
import type { IconSize } from "./icon";
import { NewTabGlyph, NewTabWords } from "./new-tab";
import { join } from "./utils";

/** The arrow's seat: after the words (`end`, pointing on) or before them (`start`, pointing back). */
export type GoArrowSide = "end" | "start";

export function GoArrow({ side = "end", size = 16, className }: { side?: GoArrowSide; size?: IconSize; className?: string }) {
  return (
    <span className={join("basalt-go-arrow", className)} data-side={side} aria-hidden="true">
      <Icon icon={side === "start" ? ArrowLeftGlyph : ArrowRightGlyph} size={size} />
    </span>
  );
}

/**
 * The cue at the end of a link-like block: the new-tab arrow and its spoken words when the link opens a new tab, the right arrow
 * when it goes on in the site. The two are never drawn together.
 */
export function EndCue({ newTab, size = 16, newTabLabel }: { newTab: boolean; size?: IconSize; newTabLabel?: string }) {
  return newTab ? (
    <>
      <NewTabGlyph size={size} />
      <NewTabWords label={newTabLabel} />
    </>
  ) : (
    <GoArrow size={size} />
  );
}
