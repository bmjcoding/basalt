import * as React from "react";

import { Switch } from "./choice";
import { useLoops } from "./loops";
import { LOOPS_TOGGLE_NAME } from "./loops-toggle-icon";
import { join } from "./utils";

/** The settings row's description. */
export const LOOPS_TOGGLE_DESCRIPTION = "Moving art and spinners hold still. Your work keeps running.";

export interface LoopsToggleSwitchProps {
  className?: string;
  description?: string;
}

/** `LoopsToggle`'s Switch form: the label "Pause animations", the description, and a `Switch`. */
export function LoopsToggleSwitch({ className, description }: LoopsToggleSwitchProps) {
  const { held, setHeld } = useLoops();
  const id = React.useId();
  const described = `${id}-description`;
  return (
    <div className={join("basalt-loops-switch", className)}>
      <Switch checked={held} onCheckedChange={(next) => setHeld(next)} aria-describedby={described}>{LOOPS_TOGGLE_NAME}</Switch>
      <p id={described} className="basalt-loops-description">{description ?? LOOPS_TOGGLE_DESCRIPTION}</p>
    </div>
  );
}
