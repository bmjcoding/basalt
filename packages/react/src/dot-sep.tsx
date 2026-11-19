import * as React from "react";

import { join } from "./utils";

// One way to draw a status as words joined by a middle dot (the wording audit's W8). The dot is drawn by the stylesheet (`::before`, with an empty alternative text, so
// it is not read) and the words are joined for assistive technology and for a plain-text scan by a visually hidden ", ": the text and the accessible name both read
// "In design, Pilot planned", and the drawing is "In design · Pilot planned". The old pair (an `aria-hidden` dot and a hidden comma) left both in a text scan: "In design · , Pilot planned".
// Nothing here runs when the module loads.

export interface DotSepProps extends Omit<React.ComponentProps<"span">, "children"> {
  /**
   * Draw a space on each side of the dot, as the words around it would carry (" · "), for a line whose words sit directly beside the separator in the text. Leave it out where the
   * line's own layout gives the gap (a flex gap, a margin).
   */
  spaced?: boolean;
}

/** The separator between two words of a dot-separated line: a drawn dot that is not read, and a ", " that is read and not drawn. Put it where the dot goes, with no spaces around it in the text. */
export function DotSep({ spaced = false, className, ...props }: DotSepProps) {
  return (
    <span {...props} className={join("basalt-dot-sep", className)} data-spaced={spaced ? "" : undefined}>
      <span className="basalt-visually-hidden">, </span>
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
 */
export function DotLine({ children, className, ...props }: DotLineProps) {
  const items = React.Children.toArray(children);
  return (
    <span {...props} className={join("basalt-dot-line", className)}>
      {items.map((item, index) => (
        <React.Fragment key={React.isValidElement(item) && item.key !== null ? item.key : index}>
          {index > 0 ? <DotSep spaced /> : null}
          {item}
        </React.Fragment>
      ))}
    </span>
  );
}
