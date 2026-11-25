// The link card and the tile (DECISIONS 152, D5a), ported from the SRA floor and Castle's product tile. Both are unboxed: a link round
// a picture and text, with no rim and no level, so neither is a `Card`. The rest of the page's panels are rimmed and levelled;
// these are links, and the ring lies on the page.
import * as React from "react";

import { EndCue } from "./go-arrow";
import { NewTabGlyph, NewTabWords, opensNewTab } from "./new-tab";
import { join } from "./utils";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

const heading = (level: HeadingLevel, className: string, children: React.ReactNode) => React.createElement(`h${level}`, { className }, children);

/** The `rel` a link that opens a new tab needs, added to any the app gave. */
const safeRel = (target: string | undefined, rel: string | undefined) =>
  opensNewTab(target) ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;

export interface LinkCardProps extends Omit<React.ComponentProps<"a">, "children" | "title" | "media"> {
  /** The card's name: a real heading inside the link. */
  title: React.ReactNode;
  /** The heading's level in the page outline, 3 by default; it never sets the size (`titleSize` does). */
  titleLevel?: HeadingLevel;
  /**
   * The title's size. `"display"` (the default) is the display role, for an editorial page. On an app page, `"md"` (16/24) or `"base"` (14/20), each
   * 600, with a 16px arrow at every width and the foot a step down; a compact card has a 44px hit area on touch, with no change to layout.
   */
  titleSize?: "display" | "md" | "base";
  /**
   * The picture or art above the words, in a window of the card's width. Its height is the app's: set `--_basalt-link-card-media-height`
   * on the card or a parent (the window is as tall as its content until you do). Give the picture its own `alt`.
   */
  media?: React.ReactNode;
  /** One sentence on what it is. Secondary ink, lifting to primary on hover and focus. */
  description?: React.ReactNode;
  /** Its state or year, on the sentence's baseline, end-aligned with tabular numerals. */
  state?: React.ReactNode;
  /** The words a card that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

/**
 * A link round a picture, a heading, a sentence and a state. The whole card is the link. Its arrow, at the heading's end, is the
 * core right arrow (24px, 20 under 720; 16 at every width for a compact `titleSize`), in secondary ink with the sentence, lifting to primary and
 * travelling 2px on hover and focus. A card with `target="_blank"` draws the new-tab arrow instead, and says so in its name.
 */
export function LinkCard({ title, titleLevel = 3, titleSize = "display", media, description, state, newTabLabel, className, target, rel, ...props }: LinkCardProps) {
  const newTab = opensNewTab(target);
  const compact = titleSize !== "display";
  return (
    <a {...props} target={target} rel={safeRel(target, rel)} data-new-tab={newTab ? "" : undefined} data-title-size={compact ? titleSize : undefined} className={join("basalt-link-card", className)}>
      {media ? <div className="basalt-link-card-media">{media}</div> : null}
      <div className="basalt-link-card-top">
        {heading(titleLevel, "basalt-link-card-title", title)}
        <EndCue newTab={newTab} size={compact ? 16 : 24} newTabLabel={newTabLabel} />
      </div>
      {description || state ? (
        <div className="basalt-link-card-foot">
          {description ? <span className="basalt-link-card-what">{description}</span> : null}
          {state ? <span className="basalt-link-card-state">{state}</span> : null}
        </div>
      ) : null}
    </a>
  );
}

export interface LinkTileProps extends Omit<React.ComponentProps<"a">, "children" | "title" | "className" | "media"> {
  /** The picture. Give it its own `alt`. */
  media?: React.ReactNode;
  /** A line above the name, such as a maker. Secondary ink. Left out, the name sits straight under the picture. */
  brand?: React.ReactNode;
  /** The tile's name: a real heading inside the link, underlined on hover. */
  title: React.ReactNode;
  /** The heading's level in the page outline, 3 by default. */
  titleLevel?: HeadingLevel;
  /** Details under the name. Tertiary ink. */
  details?: React.ReactNode;
  /**
   * A row under the link, outside it, because a link cannot hold a button: a price and an add control. The app's own; the
   * tile draws only the row.
   */
  foot?: React.ReactNode;
  /** Goes on the tile, which holds the link and the foot. The other props go on the link. */
  className?: string;
  /** The words a tile that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

/**
 * A product tile: a link round a picture, an optional brand line, a name and details, with a separate foot row. Its link is
 * radius 6 so the ring has a shape. Hover underlines the name (1px); nothing moves, and the picture does not lift.
 */
export function LinkTile({ media, brand, title, titleLevel = 3, details, foot, className, newTabLabel, target, rel, ...props }: LinkTileProps) {
  const newTab = opensNewTab(target);
  return (
    <div className={join("basalt-link-tile", className)}>
      <a {...props} target={target} rel={safeRel(target, rel)} data-new-tab={newTab ? "" : undefined} className="basalt-link-tile-link">
        {media ? <div className="basalt-link-tile-media">{media}</div> : null}
        {brand ? <span className="basalt-link-tile-brand">{brand}</span> : null}
        {heading(titleLevel, "basalt-link-tile-title", <>{title}{newTab ? <NewTabGlyph /> : null}</>)}
        {details ? <span className="basalt-link-tile-details">{details}</span> : null}
        {newTab ? <NewTabWords label={newTabLabel} /> : null}
      </a>
      {foot ? <div className="basalt-link-tile-foot">{foot}</div> : null}
    </div>
  );
}
