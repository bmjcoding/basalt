import * as React from "react";

import { Switch } from "./choice";
import { LOOPS_TOGGLE_DESCRIPTION, LOOPS_TOGGLE_NAME } from "./constants";
import { useLoops } from "./loops";
import { join } from "./utils";

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
