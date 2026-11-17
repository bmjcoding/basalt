import * as React from "react";

import { LoopsToggleButton } from "./loops-toggle-button";
import { LoopsToggleIcon, LOOPS_TOGGLE_NAME } from "./loops-toggle-icon";
import { LOOPS_TOGGLE_DESCRIPTION, LoopsToggleSwitch } from "./loops-toggle-switch";

// The control for the hold on every loop (DECISIONS 136 C3, 143): one component on `useLoops`, in the three forms the places need, with one fixed name. Nothing is announced
// when the hold changes: the control speaks its own state (`aria-pressed`, or the switch's `checked`). Each form is a module of its own (`LoopsToggleIcon`,
// `LoopsToggleButton`, `LoopsToggleSwitch`), so a page that draws only the icon, as a site's header does, loads none of the others.

export { LOOPS_TOGGLE_DESCRIPTION, LOOPS_TOGGLE_NAME };

interface Common {
  className?: string;
}

export type LoopsToggleProps =
  | (Common & {
      /**
       * `icon` (the default): an icon-only ghost toggle with the core `pause` glyph, for a site header's end cluster, before the theme toggle; its name is the fixed
       * "Pause animations", taken from its `title`, which is also the browser's own tooltip. Show it only on a page that has an ambient loop or a loop that can run past
       * five seconds. Import `LoopsToggleIcon` instead of `LoopsToggle` where only this form is drawn, so the page does not load the settings row's `Switch`.
       */
      form?: "icon";
    })
  | (Common & {
      /** A pressed-toggle `Button` labelled "Pause animations", for the head band of the view that shows running work. `SiteHeader` draws it as its narrow menu's first row. */
      form: "button";
    })
  | (Common & {
      /**
       * A `Switch` for a settings row: the label "Pause animations", the description "Moving art and spinners hold still. Your work keeps running.", and the switch at its
       * start (as `Switch` is). Pass `description` to change the words.
       */
      form: "switch";
      description?: string;
    });

/**
 * Holds or releases every loop Basalt draws (`<html data-loops="held">`, stored for this app's origin). It reads and writes the hold through `useLoops`, so any number
 * of these on a page, and the command that does the same, stay in step.
 */
export function LoopsToggle(props: LoopsToggleProps) {
  if (props.form === "button") return <LoopsToggleButton className={props.className} />;
  if (props.form === "switch") return <LoopsToggleSwitch className={props.className} description={props.description} />;
  return <LoopsToggleIcon className={props.className} />;
}
