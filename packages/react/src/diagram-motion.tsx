import * as React from "react";

import { Button } from "./button";
import { LoopsToggleButton } from "./loops-toggle-button";
import type { MotionController } from "./diagram-motion-core";

export { attachMotion, motionErrors } from "./diagram-motion-core";

// A diagram's motion, React's side (DECISIONS 292): the engine (diagram-motion-core.ts) and the two buttons it adds to the figure's foot. This module is
// loaded on demand by an animated figure (diagram-figure.tsx), never by a still one, so the buttons, the hold's state and the engine cost a still diagram
// nothing. It is not exported from the package.

const RUN_PLAY = "Play the run";
const RUN_STOP = "Stop the run";

/**
 * The foot's motion controls (1.9, 1.10), after "View as list": the run button, where the sequence names `run` and lines are drawn, and "Pause
 * animations", the page's hold (`LoopsToggle`'s button form at the small size), where the figure can loop. Each is a secondary small button, at least 44px on touch.
 */
export function MotionFoot({ controller }: { controller: MotionController }) {
  const state = React.useSyncExternalStore(controller.subscribe, controller.state, controller.state);
  return (
    <>
      {state.runShown ? (
        <Button variant="secondary" size="sm" className="basalt-diagram-play" onClick={() => controller.toggleRun()}>{state.running ? RUN_STOP : RUN_PLAY}</Button>
      ) : null}
      {state.canLoop ? (
        <LoopsToggleButton size="sm" className="basalt-diagram-pause" />
      ) : null}
    </>
  );
}
