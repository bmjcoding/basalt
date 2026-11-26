import * as React from "react";

import { LoadingShape, useShapePhase } from "./loading-shape";

// The notification list's first load (cimip-gaps-3 T3, 8e), loaded on demand by notifications.tsx only while a list is waiting for its first answer, so the
// bell and the page list that never wait carry none of LoadingShape's measuring. It is built on its own (build.mjs, as diagram-actions is), with LoadingShape,
// its measuring and its clock inlined; the list wraps its stand-ins in the package's own in-shape provider, so the context stays shared (see build.mjs).
// Nothing runs when the module loads.

export interface NotificationShapeProps {
  /** True before the first answer. */
  loading: boolean;
  /** Said once, politely, if bones are drawn. */
  label: string;
  className?: string;
  /** The stand-in entries. */
  shape: () => React.ReactNode;
  /** The shape has finished (its hold is over, or its bones were never drawn): the list takes its place. */
  onDone: () => void;
}

export function NotificationShape({ loading, label, className, shape, onDone }: NotificationShapeProps): React.JSX.Element {
  // The shape's own timing (the same show-after and hold as the LoadingShape it draws), read here so the list knows when to take its place.
  const done = useShapePhase(loading) === "content";
  React.useEffect(() => { if (done) onDone(); }, [done, onDone]);
  return <LoadingShape loading={loading} label={label} className={className} shape={shape}>{null}</LoadingShape>;
}
