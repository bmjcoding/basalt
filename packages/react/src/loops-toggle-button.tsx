import * as React from "react";

import { Button } from "./button";
import { useLoops } from "./loops";
import { LOOPS_TOGGLE_NAME } from "./constants";

export interface LoopsToggleButtonProps {
  className?: string;
  /** The Button's size: `md` (the default), or `sm` beside other small buttons, as in a diagram's foot. */
  size?: "sm" | "md";
}

/** `LoopsToggle`'s Button form: a pressed-toggle Button labelled "Pause animations". `SiteHeader`'s narrow menu draws it as its first row. */
export function LoopsToggleButton({ className, size = "md" }: LoopsToggleButtonProps) {
  const { held, setHeld } = useLoops();
  return <Button variant="secondary" size={size} pressed={held} className={className} onClick={() => setHeld(!held)}>{LOOPS_TOGGLE_NAME}</Button>;
}
