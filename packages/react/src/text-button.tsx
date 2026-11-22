import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";

import { Icon } from "./icon";
import type { IconComponent, PartProps } from "./types";
import { withClass } from "./utils";
import { takeClick, useJoinedRef, useLoopClock, usePressWait } from "./wait";

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
  /**
   * Busy, in a TextButton's own look (DECISIONS 260): the words step down an ink (primary to secondary, the quiet form's secondary to tertiary) and
   * the underline turns dashed and breathes, so nothing moves and the button is never a box. Presses are ignored and it is `aria-busy`. The app's
   * own flag, shown at once; a press whose `onClick` returns a promise waits by itself (`waitForAnswer`), and `loading` wins over that wait.
   */
  loading?: boolean;
  /**
   * When `onClick` returns a promise, the button is busy until it settles: further presses are ignored and the handler is never called twice; it
   * keeps its focus and its words, and its busy look shows only once the wait has run 300ms, then stays at least 400ms. A rejection ends the wait
   * and is raised again, so say why in the app. On by default; `false` calls the handler on every press.
   */
  waitForAnswer?: boolean;
  children: React.ReactNode;
}

/**
 * A button that reads as running text (DECISIONS 154, D5d): no box and no control height, the surrounding text's own font, underlined
 * as a `Link` is. For an action that runs in place (a command in a line of output, "Show more", "Open"). It has no pressed state: a choice
 * between two things is a `SegmentedControl`. A button inside a sentence keeps its line; on a line of its own it has a 44px hit box on
 * touch that changes no layout. Not for a button with a box: that is `Button`. It keeps focus when it disables itself (DECISIONS 242). Its words may be a `Reserve`
 * (words that change in place, the button holding the width of the longest): the underline is drawn under the words that are shown. A press whose
 * `onClick` returns a promise waits for its answer, as every Basalt button does.
 */
export function TextButton({ quiet = false, iconEnd, className, children, focusableWhenDisabled = true, loading = false, waitForAnswer = true, onClick, render, ref, ...props }: TextButtonProps) {
  // A handler on the rendered element is taken into the press, so the wait guards it too.
  const [rendered, handler] = takeClick(render, onClick);
  const wait = usePressWait(handler, { loading, waitForAnswer, submits: props.type === "submit", form: props.form });
  useLoopClock(wait.ref, wait.shown);
  return (
    <BaseButton
      {...props}
      ref={useJoinedRef(ref, wait.ref)}
      focusableWhenDisabled={focusableWhenDisabled}
      render={rendered}
      aria-disabled={props.disabled || wait.busy ? true : props["aria-disabled"]}
      aria-busy={wait.busy ? true : props["aria-busy"]}
      data-busy={wait.busy || wait.shown ? "" : undefined}
      data-loading={wait.shown ? "" : undefined}
      data-quiet={quiet ? "" : undefined}
      className={withClass("basalt-text-button", className)}
      onClick={wait.press}
    >
      <span className="basalt-text-button-label">{children}</span>
      {iconEnd ? <Icon icon={iconEnd} size={16} /> : null}
    </BaseButton>
  );
}
