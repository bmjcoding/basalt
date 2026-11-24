// Link rows (DECISIONS 152, D5b): the directory (a head, then rows ruled by hairlines, each one link with a name, a sentence and a
// state) and the big link rows (one line each, large, a rule under each). Both are drawn as the approved prototypes drew them; the
// names are not `rows`, which the HTML skill's popup and menu rows already mean.
import * as React from "react";

import { EndCue } from "./go-arrow";
import { opensNewTab } from "./new-tab";
import { RevealFoot, useReveal } from "./reveal";
import { join } from "./utils";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

const safeRel = (target: string | undefined, rel: string | undefined) =>
  opensNewTab(target) ? [...new Set([...(rel?.split(/\s+/).filter(Boolean) ?? []), "noopener", "noreferrer"])].join(" ") : rel;

/** Set by `DirectoryList` around the rows that open in place, so a row knows to draw its own clip, and whether the rest is open. */
const RestContext = /* @__PURE__ */ React.createContext<{ open: boolean } | null>(null);

export interface DirectoryRowProps extends Omit<React.ComponentProps<"a">, "children" | "title"> {
  /** The name, in the first column, in 600. The arrow follows it. */
  name: React.ReactNode;
  /** What it is, in the column that takes the rest. Secondary ink, lifting to primary on hover and focus. */
  description?: React.ReactNode;
  /** Its state or year, in the last column, end-aligned (start-aligned under 720) with tabular numerals. */
  state?: React.ReactNode;
  /** The words a row that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

/**
 * One row of a `DirectoryList`: one link with three fixed columns, so a row never moves another. Under 720 it is one column.
 * Its arrow is the core right arrow, 16px (or the new-tab arrow when the row opens a new tab). Hover and focus lift the sentence
 * and arrow to primary ink and the arrow travels 2px; there is no wash, because a ruled list on the page is not a settings row.
 */
export function DirectoryRow({ name, description, state, newTabLabel, className, target, rel, ...props }: DirectoryRowProps) {
  const rest = React.useContext(RestContext);
  const newTab = opensNewTab(target);
  const link = (
    <a {...props} target={target} rel={safeRel(target, rel)} data-new-tab={newTab ? "" : undefined} className={join("basalt-directory-row", className)}>
      <span className="basalt-directory-name">{name}<EndCue newTab={newTab} newTabLabel={newTabLabel} /></span>
      <span className="basalt-directory-what">{description}</span>
      <span className="basalt-directory-state">{state}</span>
    </a>
  );
  // A row that opens in place is a list item whose own track grows, so the rest stays in the one list. Its rule is drawn inside its clip.
  return rest ? (
    <li className="basalt-directory-item basalt-reveal-panel" data-rest="" inert={!rest.open}>
      <div className="basalt-reveal-clip" data-reveal-clip="" inert={!rest.open}>{link}</div>
    </li>
  ) : (
    <li className="basalt-directory-item">{link}</li>
  );
}

export interface DirectoryListProps extends Omit<React.ComponentProps<"div">, "title" | "children"> {
  /** The head: one line, secondary, 500. It names the list. */
  title: React.ReactNode;
  /** The head's level in the page outline, 3 by default. */
  titleLevel?: HeadingLevel;
  /** `DirectoryRow`s, as direct children. */
  children: React.ReactNode;
  /** How many rows show before "Show all". Every row shows when it is not set or the list is no longer. */
  shown?: number;
  /** The button's words while closed, in the app's language. Default "Show all" and the number of rows. */
  showAllLabel?: React.ReactNode;
  /** The button's words while open. Default "Show fewer". */
  showFewerLabel?: React.ReactNode;
  /** Controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A headed list of `DirectoryRow`s ruled by hairlines. It is one list with one name, the head. With `shown`, the rows after it open in
 * place from a "Show all" button under the list (the same opening as `Reveal`): they stay in the same list, so it is read as one.
 */
export function DirectoryList({ title, titleLevel = 3, children, shown, showAllLabel, showFewerLabel = "Show fewer", open: controlled, defaultOpen, onOpenChange, className, ...props }: DirectoryListProps) {
  const rows = React.Children.toArray(children);
  const cut = shown !== undefined && shown >= 0 && shown < rows.length ? shown : rows.length;
  const reveal = useReveal({ open: controlled, defaultOpen, onOpenChange });
  const heading = React.useId();
  const list = reveal.id;
  return (
    <div {...props} {...reveal.rootProps} ref={reveal.root} className={join("basalt-directory", className)}>
      {React.createElement(`h${titleLevel}`, { className: "basalt-directory-head", id: heading }, title)}
      <ul className="basalt-directory-list" id={list} aria-labelledby={heading}>
        {rows.slice(0, cut)}
        {rows.slice(cut).map((row, index) => (
          // Each row after the cut draws its own clip, inert while closed: unreachable by keyboard and unseen by a reader.
          <RestContext.Provider key={React.isValidElement(row) && row.key !== null ? row.key : index} value={{ open: reveal.open }}>{row}</RestContext.Provider>
        ))}
      </ul>
      {cut < rows.length ? (
        <RevealFoot open={reveal.open} controls={list} onToggle={reveal.toggle} showLabel={showAllLabel ?? `Show all ${rows.length}`} hideLabel={showFewerLabel} buttonRef={reveal.button} />
      ) : null}
    </div>
  );
}

export interface BigLinkRowProps extends Omit<React.ComponentProps<"a">, "children"> {
  /** The words. One line each; they are not cut. */
  children: React.ReactNode;
  /** The words a row that opens a new tab adds to its name, for translation. Default "(opens in a new tab)". */
  newTabLabel?: string;
}

/** One big link row: the words, then the arrow at the row's end. */
export function BigLinkRow({ children, newTabLabel, className, target, rel, ...props }: BigLinkRowProps) {
  const newTab = opensNewTab(target);
  return (
    <li className="basalt-big-link-item">
      <a {...props} target={target} rel={safeRel(target, rel)} data-new-tab={newTab ? "" : undefined} className={join("basalt-big-link", className)}>
        <span className="basalt-big-link-words">{children}</span>
        <EndCue newTab={newTab} newTabLabel={newTabLabel} />
      </a>
    </li>
  );
}

export type BigLinkListProps = React.ComponentProps<"ul">;

/**
 * Full-width links, one line each, in 600 at `text-2xl` (`text-3xl` from 1024), a rule under each. From 720 to 1023 they sit in two
 * columns. Give the list a name (`aria-label` or `aria-labelledby`): it is a list of links.
 */
export function BigLinkList({ className, ...props }: BigLinkListProps) {
  return <ul {...props} className={join("basalt-big-links", className)} />;
}
