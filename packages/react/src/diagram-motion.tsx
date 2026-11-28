import * as React from "react";

import { Button } from "./button";
import { LoopsToggleButton } from "./loops-toggle-button";
import type { MotionController } from "./diagram-motion-core";

export { attachMotion, motionErrors } from "./diagram-motion-core";

// A diagram's motion, React's side (DECISIONS 292): the engine (diagram-motion-core.ts) and the buttons it adds to the figure's foot. This module is
// loaded on demand by an animated figure (diagram-figure.tsx), never by a still one, so the buttons, the hold's state and the engine cost a still diagram
// nothing. It is not exported from the package.

const RUN_PLAY = "Play the run";
const RUN_STOP = "Stop the run";
const REPLAY = "Draw again";

/**
 * The foot's motion controls (1.9, 1.10), after "View as list" and "Expand": the run button, where the sequence names `run` and lines are drawn; "Draw
 * again" (DECISIONS 405, G149), where the figure asks for `replay`, lines are drawn and neither reduced motion nor forced colours is on; and "Pause
 * animations", the page's hold (`LoopsToggle`'s button form at the small size), where the figure can loop. Each is a secondary small button, at least
 * 44px on touch. "Draw again" never changes its words or width and is never disabled: a press while a replay plays starts it over.
 */
export function MotionFoot({ controller, base, titleId }: { controller: MotionController; base: string; titleId: string }) {
  const state = React.useSyncExternalStore(controller.subscribe, controller.state, controller.state);
  // Each names its figure (G17 of cimip-gaps-3): its own words (the button itself, referenced), then the title.
  return (
    <>
      {state.runShown ? (
        <Button variant="secondary" size="sm" className="basalt-diagram-play" id={`${base}-play`} aria-labelledby={`${base}-play ${titleId}`} onClick={() => controller.toggleRun()}>{state.running ? RUN_STOP : RUN_PLAY}</Button>
      ) : null}
      {state.replayShown ? (
        <Button variant="secondary" size="sm" className="basalt-diagram-replay" id={`${base}-replay`} aria-labelledby={`${base}-replay ${titleId}`} onClick={() => { controller.replay(); }}>{REPLAY}</Button>
      ) : null}
      {state.canLoop ? (
        <LoopsToggleButton size="sm" className="basalt-diagram-pause" id={`${base}-pause`} labelledBy={`${base}-pause ${titleId}`} />
      ) : null}
    </>
  );
}
