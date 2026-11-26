// A panel of rows (cimip-gaps-2, B6 item 1): one rimmed panel holding a list, each row a full-bleed band that is itself a link or a button.
// Not a variant of `DirectoryList`, which is a site's ruled list on the page with no rim, no wash and three fixed columns: this is an app's
// list of things to open, in one panel, where the band is the target, its hover is the row's wash and its focus is the flush −2 inset.
import * as React from "react";

import { inLevel, usePanelLevel } from "./layers";
import { useMergedRef } from "./merged-ref";
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
  const setRef = useMergedRef(node, ref);
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
  /**
   * More under the description, laid out by the app (a third line, a row of badges). In a row with `actions` or a static row a link inside a line of words
   * may sit here, with its own name; it sits above the row's target, so a tap on its words follows it. In a one-target row, words and badges only.
   */
  children?: React.ReactNode;
  /** The words a row that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". */
  newTabLabel?: string;
  /** Title and description wrap whole instead of one cut line each; the row grows. Default false. */
  wrap?: boolean;
  /**
   * One or two more controls in the row: a `Button`, an `IconButton`, a `Link`. Given, the row is no longer one anchor: the title holds the link or button
   * and its target still covers the band; the actions sit above it. Never nested in the row's target. Each says what and whom ("Call +1 912-555-0142", or
   * an `aria-label` that starts with its visible word). From 480 of the list's width they sit at the row's end on the title's line; under it, on a line of
   * their own under the words.
   */
  actions?: React.ReactNode;
}

export type PanelRowProps = PanelRowOwnProps &
  (
    | ({ href: string; interactive?: true } & Omit<React.ComponentProps<"a">, "title" | "children" | "href">)
    | ({ href?: undefined; interactive?: true } & Omit<React.ComponentProps<"button">, "title" | "children">)
    /** The band is not a target: a `div`, no wash, no press, no pointer. Its `actions` and the links in `children` are its targets. */
    | ({ href?: undefined; interactive: false } & Omit<React.ComponentProps<"div">, "title" | "children">)
  );

/**
 * One row of a `PanelList`, in one of three forms that look alike. With no `actions` it is a link (with `href`) or a button across the whole band. Hover is
 * the row's wash, full bleed, and lifts no ink; a press steps it once more; focus is the 2px ring drawn inside at −2, because the band is flush with the
 * panel's clipping edge (the first and last rows round it with the panel's inner corner). With `actions` the row is split: the title holds the link or
 * button, whose cover reaches across the band and shows the same −2 ring, and each action is its own control with its own ring at +2. With
 * `interactive={false}` the band is no target at all. A row that opens a new tab draws the new-tab arrow after its title and says so.
 */
export function PanelRow(props: PanelRowProps) {
  const { title, description, leading, trailing, children, newTabLabel, wrap, actions, interactive, className, style, ...rest } = props;
  const descriptionId = React.useId();
  const href = "href" in rest ? rest.href : undefined;
  const newTab = href !== undefined ? opensNewTab((rest as React.ComponentProps<"a">).target) : false;
  const split = actions !== undefined && actions !== null && actions !== false;
  const titled = (
    <>
      {title}
      {newTab ? (
        <>
          <NewTabGlyph />
          <NewTabWords label={newTabLabel} />
        </>
      ) : null}
    </>
  );
  const linkProps = (): React.ComponentProps<"a"> => {
    const { target, rel, ...link } = rest as React.ComponentProps<"a">;
    const safe = newTab ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;
    return { ...link, target, rel: safe, "data-new-tab": newTab ? "" : undefined } as React.ComponentProps<"a">;
  };
  const classes = join("basalt-panel-row", className);
  const wrapped = wrap ? "" : undefined;
  const words = (head: React.ReactNode) => (
    <>
      {leading !== undefined ? <span className="basalt-panel-row-lead">{leading}</span> : null}
      <span className="basalt-panel-row-words">
        <span className="basalt-panel-row-title">{head}</span>
        {description !== undefined ? <span id={split ? descriptionId : undefined} className="basalt-panel-row-description">{description}</span> : null}
        {children}
      </span>
      {trailing !== undefined ? <span className="basalt-panel-row-end">{trailing}</span> : null}
      {split ? <span className="basalt-panel-row-actions">{actions}</span> : null}
    </>
  );
  if (interactive === false) {
    return (
      <li className="basalt-panel-item">
        <div {...(rest as React.ComponentProps<"div">)} style={style} data-static="" data-wrap={wrapped} className={classes}>{words(titled)}</div>
      </li>
    );
  }
  if (split) {
    // The trigger is the row's one link or button; its cover (`::after`) reaches across the band. Every other native prop and the ref go to it.
    const described = description !== undefined ? descriptionId : undefined;
    const trigger = href !== undefined
      ? <a {...linkProps()} aria-describedby={join(described, (rest as React.ComponentProps<"a">)["aria-describedby"]) || undefined} className="basalt-panel-row-trigger">{titled}</a>
      : (() => {
          const { type = "button", ...button } = rest as React.ComponentProps<"button">;
          return <button {...button} type={type} aria-describedby={join(described, button["aria-describedby"]) || undefined} className="basalt-panel-row-trigger">{titled}</button>;
        })();
    return (
      <li className="basalt-panel-item">
        <div style={style} data-split="" data-wrap={wrapped} className={classes}>{words(trigger)}</div>
      </li>
    );
  }
  if (href !== undefined) {
    return (
      <li className="basalt-panel-item">
        <a {...linkProps()} style={style} data-wrap={wrapped} className={classes}>{words(titled)}</a>
      </li>
    );
  }
  const { type = "button", ...button } = rest as React.ComponentProps<"button">;
  return (
    <li className="basalt-panel-item">
      <button {...button} type={type} style={style} data-wrap={wrapped} className={classes}>{words(titled)}</button>
    </li>
  );
}
