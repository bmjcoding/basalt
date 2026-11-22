import * as React from "react";

import { IconButton } from "./button";
import { LOOPS_TOGGLE_NAME } from "./constants";
import { PauseGlyph } from "./glyphs/pause";
import { useLoops } from "./loops";

// The icon form of `LoopsToggle`, in a module of its own so a site's header loads the icon button and the hold and nothing else (the settings row's `Switch` is in another module).

// `IconButton` names itself from its `label` (`aria-label`). This control is named by its `title` alone, so a screen reader hears the name once (a `title` beside an `aria-label`
// of the same words is also read as the description). The swap is made here, on the element it renders, so no other IconButton carries it.
function namedByTitle(props: React.HTMLAttributes<HTMLElement>) {
  return <button {...props} aria-label={undefined} title={LOOPS_TOGGLE_NAME} />;
}

export interface LoopsToggleIconProps {
  className?: string;
}

/**
 * An icon-only ghost toggle with the core `pause` glyph, for a site header's end cluster (first in it) or the head band of an app's view that shows running work: `LoopsToggle`'s icon form. Its name is the fixed
 * "Pause animations", taken from its `title` alone, which is also the browser's own tooltip on a fine pointer, so a screen reader hears it once. Show it only on a page
 * that has an ambient loop or a loop that can run past five seconds. `SiteHeader` draws the Button form of the same control in its narrow menu.
 */
export function LoopsToggleIcon({ className }: LoopsToggleIconProps) {
  const { held, setHeld } = useLoops();
  return <IconButton variant="ghost" icon={PauseGlyph} label={LOOPS_TOGGLE_NAME} render={namedByTitle} pressed={held} className={className} onClick={() => setHeld(!held)} />;
}
