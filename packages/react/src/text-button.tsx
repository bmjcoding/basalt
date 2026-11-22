import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

import { Icon } from "./icon";
import type { IconComponent, PartProps } from "./types";
import { withClass } from "./utils";

export interface TextButtonProps extends Omit<PartProps<"button">, "children" | "aria-pressed"> {
  /** Set to false when `render` produces something other than a native `<button>`. */
  nativeButton?: boolean;
  /**
   * Stay focusable while disabled, so a keyboard user can still reach it and read why, and so a press that disables the button does not drop focus to the page. On by default
   * (DECISIONS 242); pass `false` for a button that should leave the Tab order while it is disabled.
   */
  focusableWhenDisabled?: boolean;
  /**
   * The quiet form, for a secondary action in a row of text: secondary ink at rest, primary on hover. The default is primary ink, as `Link`
   * is.
   */
  quiet?: boolean;
  /** An icon after the label, e.g. a chevron for a button that opens something in place. The words are underlined; the icon is not. */
  iconEnd?: IconComponent;
  children: React.ReactNode;
}

/**
 * A button that reads as running text (DECISIONS 154, D5d): no box and no control height, the surrounding text's own font, underlined
 * as a `Link` is. For an action that runs in place (a command in a line of output, "Show more", "Open"). It has no pressed state: a choice
 * between two things is a `SegmentedControl`. A button inside a sentence keeps its line; on a line of its own it has a 44px hit box on
 * touch that changes no layout. Not for a button with a box: that is `Button`. It keeps focus when it disables itself (DECISIONS 242). Its words may be a `Reserve`
 * (words that change in place, the button holding the width of the longest): the underline is drawn under the words that are shown.
 */
export function TextButton({ quiet = false, iconEnd, className, children, focusableWhenDisabled = true, ...props }: TextButtonProps) {
  return (
    <BaseButton {...props} focusableWhenDisabled={focusableWhenDisabled} data-quiet={quiet ? "" : undefined} className={withClass("basalt-text-button", className)}>
      <span className="basalt-text-button-label">{children}</span>
      {iconEnd ? <Icon icon={iconEnd} size={16} /> : null}
    </BaseButton>
  );
}
