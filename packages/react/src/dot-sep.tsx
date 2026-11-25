import * as React from "react";

import { join } from "./utils";

// One way to draw a status as words joined by a middle dot (the wording audit's W8). The dot is drawn by the stylesheet (`::before`, with an empty alternative text, so
// it is not read) and the words are joined for assistive technology and for a plain-text scan by a ", " that is read and drawn at no size (`basalt-said`): the text and
// the accessible name both read "In design, Pilot planned", and the drawing is "In design · Pilot planned". The ", " is inline text, not an absolute box, so a text scan
// (`innerText`) and a name built from the content do not put a space before the comma ("In design , Pilot planned"). Nothing here runs when the module loads.

export interface DotSepProps extends Omit<React.ComponentProps<"span">, "children"> {
  /**
   * Draw a space on each side of the dot, as the words around it would carry (" · "), for a line whose words sit directly beside the separator in the text. Leave it out where the
   * line's own layout gives the gap (a flex gap, a margin).
   */
  spaced?: boolean;
}

/**
 * The separator between two words of a dot-separated line: a drawn dot that is not read, and a ", " that is read and not drawn. Put it where the dot goes, with no spaces
 * around it in the text. A spaced dot stays with the word before it: a line that wraps there starts with the next word, never with "·". After a fact drawn as an inline
 * block (a badge) the browser may break before the dot whatever the dot does; `DotLine` keeps those together.
 */
export function DotSep({ spaced = false, className, ...props }: DotSepProps) {
  return (
    <span {...props} className={join("basalt-dot-sep", className)} data-spaced={spaced ? "" : undefined}>
      <span className="basalt-said">, </span>
    </span>
  );
}

export interface DotLineProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The words of the line, in order. A child that is `null`, `undefined` or `false` is left out with its separator. */
  children?: React.ReactNode;
}

/**
 * A status line: its children, joined by a dot ("In design · Pilot planned"). Read, it is "In design, Pilot planned". Every dot-separated line Basalt draws is built from the same
 * `DotSep`, so it reads the same.
 *
 * Where the line wraps, a dot stays with the fact before it, a fact drawn as an inline block (a badge) included: each element fact and its dot are held in one span
 * (`basalt-dot-keep`) that does not wrap between them, while the fact itself wraps as the line does. A line that never wraps (one line cut with an ellipsis) sets
 * `--basalt-dot-line-wrap: nowrap` on itself or a parent, so its facts do not wrap either; `AppHeader`'s facts do.
 */
export function DotLine({ children, className, ...props }: DotLineProps) {
  const items = React.Children.toArray(children);
  const last = items.length - 1;
  return (
    <span {...props} className={join("basalt-dot-line", className)}>
      {items.map((item, index) => {
        const key = React.isValidElement(item) && item.key !== null ? item.key : index;
        // A keyed fragment around one fact (AppHeader's) is that fact.
        const fact = React.isValidElement<{ children?: React.ReactNode }>(item) && item.type === React.Fragment ? item.props.children : item;
        // Words (a string, a number) keep their dot by the dot's own spaces; an element may be an inline block, which only a parent that does not wrap holds.
        if (index < last && React.isValidElement(fact) && fact.type !== React.Fragment) return <span key={key} className="basalt-dot-keep">{fact}<DotSep spaced /></span>;
        return (
          <React.Fragment key={key}>
            {item}
            {index < last ? <DotSep spaced /> : null}
          </React.Fragment>
        );
      })}
    </span>
  );
}
