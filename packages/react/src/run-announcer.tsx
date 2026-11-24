import * as React from "react";

// ---- A run's one voice (DECISIONS 316, 1.10) ----
// A visually hidden `role="log"` (polite, additions only). Every event is its own appended element, so a screen reader keeps the order and the queue:
// each event is said once, in the order it happened, and none replaces another. An `id` already taken is ignored, so an event delivered twice is quiet.
// Events already in the list when it mounts are not said. Never `role="alert"`, and it draws nothing. `StatusLine` keeps its own rule (the last of
// several sends within 400ms), which is right for a filter's count and wrong for a run, where three events can land inside 300ms.

export interface RunEvent {
  /** Unique within the run: an event whose `id` was already said is not said again. */
  id: string;
  /** What is said: the run's start, a failure with its reason, a retry when it starts, an approval needed or given, a cancel, the end with its time. */
  text: string;
}

export interface RunAnnouncerProps {
  /** Names the region ("Deploy 812 updates"). */
  label: string;
  /** Append-only. Never a timer, a spinner's frame, a log line, a stage that passed, a roll, the hold, or the reader's own press. */
  events: readonly RunEvent[];
}

/** The run's live region. One a run; an app that uses it does not also send the run's result to a toast. */
export function RunAnnouncer({ label, events }: RunAnnouncerProps) {
  // The ids present at mount are taken without being said; every later id is said once, in arrival order (its first delivery).
  const [atMount] = React.useState(() => new Set(events.map((event) => event.id)));
  const seen = new Set<string>();
  const said = events.filter((event) => {
    if (atMount.has(event.id) || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
  return (
    <div role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false" aria-label={label} className="basalt-visually-hidden basalt-run-announcer">
      {said.map((event) => <p key={event.id}>{event.text}</p>)}
    </div>
  );
}
