import * as React from "react";

import { Button } from "./button";
import { useLoops } from "./loops";
import { LOOPS_TOGGLE_NAME } from "./constants";
import { PauseGlyph } from "./glyphs/pause";

export interface LoopsToggleButtonProps {
  className?: string;
  /** The Button's size: `md` (the default), or `sm` beside other small buttons, as in a diagram's foot. */
  size?: "sm" | "md";
  /** The button's id. */
  id?: string;
  /** Names the button by these ids in place of its words alone (a diagram's foot: the button itself, then the figure's title). */
  labelledBy?: string;
}

/** `LoopsToggle`'s Button form: a pressed-toggle Button labelled "Pause animations", its pause glyph at rest and the bars filled while held. `SiteHeader`'s narrow menu draws it as its first row. */
export function LoopsToggleButton({ className, size = "md", id, labelledBy }: LoopsToggleButtonProps) {
  const { held, setHeld } = useLoops();
  return <Button variant="secondary" size={size} icon={PauseGlyph} pressed={held} className={className} id={id} aria-labelledby={labelledBy} onClick={() => setHeld(!held)}>{LOOPS_TOGGLE_NAME}</Button>;
}
