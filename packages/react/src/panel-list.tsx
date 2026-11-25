// A panel of rows (cimip-gaps-2, B6 item 1): one rimmed panel holding a list, each row a full-bleed band that is itself a link or a button.
// Not a variant of `DirectoryList`, which is a site's ruled list on the page with no rim, no wash and three fixed columns: this is an app's
// list of things to open, in one panel, where the band is the target, its hover is the row's wash and its focus is the flush −2 inset.
import * as React from "react";

import { inLevel, usePanelLevel } from "./layers";
import { NewTabGlyph, NewTabWords, opensNewTab } from "./new-tab";
import { join } from "./utils";

export interface PanelListProps extends React.ComponentProps<"ul"> {
  /**
   * `PanelRow`s, as direct children. Name the list with `aria-label` or `aria-labelledby` (its heading). Anything else is an `li` of the app's own
   * (`<li><DisclosureRow … /></li>`), laid across the full row: the columns are `PanelRow`'s, and no other child takes them.
   */
  children: React.ReactNode;
}

declare const process: { env: { NODE_ENV?: string } };
let warnedChild = false;

/**
 * Rows of one list in one panel: the panel's level (one above what it sits in, 3 at most), its one rim and radius 12, and a `border-divider`
 * between rows (never above the first or below the last). Each row is a `PanelRow`; a child that is not one is laid across the full row (G86), and
 * in development a child that is not an `li` is reported once, since a list holds only items.
 */
export function PanelList({ className, children, ref, ...props }: PanelListProps) {
  const level = usePanelLevel();
  const node = React.useRef<HTMLUListElement | null>(null);
  const setRef = React.useCallback(
    (element: HTMLUListElement | null) => {
      node.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref) (ref as React.MutableRefObject<HTMLUListElement | null>).current = element;
    },
    [ref],
  );
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production" || warnedChild || !node.current) return;
    const stray = Array.from(node.current.children).find((child) => child.tagName !== "LI");
    if (!stray) return;
    warnedChild = true;
    console.warn(`Basalt PanelList: a <${stray.tagName.toLowerCase()}> is a direct child of the list, which holds only items. Give PanelList PanelRows, or put anything else in an <li> of its own; it is laid across the full row`);
  });
  return (
    <ul {...props} ref={setRef} data-level={level} className={join("basalt-panel-list", className)}>
      {inLevel(level, children)}
    </ul>
  );
}

interface PanelRowOwnProps {
  /** What the row is, on its first line: primary ink at 500, one line, cut with an ellipsis (the whole text is still read). */
  title: React.ReactNode;
  /** A second line: secondary ink at `text-sm`, one line, cut with an ellipsis. */
  description?: React.ReactNode;
  /** A seat before the words, centred on the title's line: a status `Badge`, an `Avatar`, an icon. */
  leading?: React.ReactNode;
  /** At the row's end on the title's line: a time, a count, a short state. Secondary ink, `text-sm`, tabular numerals, never cut. */
  trailing?: React.ReactNode;
  /** More under the description, laid out by the app (a third line, a row of badges). */
  children?: React.ReactNode;
  /** The words a row that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

export type PanelRowProps = PanelRowOwnProps &
  (
    | ({ href: string } & Omit<React.ComponentProps<"a">, "title" | "children" | "href">)
    | ({ href?: undefined } & Omit<React.ComponentProps<"button">, "title" | "children">)
  );

/**
 * One row of a `PanelList`: a link (with `href`) or a button across the whole band. Hover is the row's wash, full bleed, and lifts no ink; a
 * press steps it once more; focus is the 2px ring drawn inside at −2, because the band is flush with the panel's clipping edge (the first and
 * last rows round it with the panel's inner corner). A row that opens a new tab draws the new-tab arrow after its title and says so.
 */
export function PanelRow(props: PanelRowProps) {
  const { title, description, leading, trailing, children, newTabLabel, className, ...rest } = props;
  const newTab = "href" in rest && rest.href !== undefined ? opensNewTab((rest as React.ComponentProps<"a">).target) : false;
  const body = (
    <>
      {leading !== undefined ? <span className="basalt-panel-row-lead">{leading}</span> : null}
      <span className="basalt-panel-row-words">
        <span className="basalt-panel-row-title">
          {title}
          {newTab ? (
            <>
              <NewTabGlyph />
              <NewTabWords label={newTabLabel} />
            </>
          ) : null}
        </span>
        {description !== undefined ? <span className="basalt-panel-row-description">{description}</span> : null}
        {children}
      </span>
      {trailing !== undefined ? <span className="basalt-panel-row-end">{trailing}</span> : null}
    </>
  );
  const classes = join("basalt-panel-row", className);
  if ("href" in rest && rest.href !== undefined) {
    const { target, rel, ...link } = rest as React.ComponentProps<"a">;
    const safe = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
    return (
      <li className="basalt-panel-item">
        <a {...link} target={target} rel={safe} data-new-tab={newTab ? "" : undefined} className={classes}>{body}</a>
      </li>
    );
  }
  const { type = "button", ...button } = rest as React.ComponentProps<"button">;
  return (
    <li className="basalt-panel-item">
      <button {...button} type={type} className={classes}>{body}</button>
    </li>
  );
}
