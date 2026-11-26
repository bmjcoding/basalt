import * as React from "react";

import { useFloatingLayer } from "./layers";
import { useMergedRef } from "./merged-ref";
import { usePeekPlate } from "./use-peek";

/**
 * The element a cut `Text` renders when it can be read whole (`lines` with `peek`): the plate is attached to it on demand (use-peek.ts loads it when the
 * page is idle, or on the first hover, focus or touch). A `Text` without `lines`, or with `peek={false}`, never renders this, so it runs no hook.
 */
export function PeekText({ as, props }: { as: "p" | "span" | "div"; props: Record<string, unknown> & { ref?: React.Ref<HTMLElement> } }): React.JSX.Element {
  const { ref, ...rest } = props;
  const node = React.useRef<HTMLElement | null>(null);
  // The caller's ref keeps React 19's cleanup: a callback ref that returns a function has it called on detach.
  const setRef = useMergedRef(node, ref);
  usePeekPlate(node, "text", { zIndex: useFloatingLayer()?.zIndex });
  return React.createElement(as, { ...rest, ref: setRef });
}
