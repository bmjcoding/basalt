import * as React from "react";

import { Button } from "./button";
import type { DiagramAction, DiagramActionContext } from "./diagram-figure";

// An app's own actions in a diagram's foot (the foot decision, diagrams-cimip): Basalt's Button, secondary and small, words only, in the order given,
// after Basalt's own controls and before "Clear highlight", and again in the viewer's foot after "View as list". A module of its own, not exported from
// the package: a figure imports it on demand, only when `actions` has an entry, and hands it to the viewer as a prop, so neither the figure's chunk nor
// the viewer's grows for a figure with none. Each button is busy on its own (Button's server rule); Basalt announces nothing on a press.

declare const process: { env: { NODE_ENV?: string } };

export interface DiagramActionsProps {
  actions: readonly DiagramAction[];
  /** Where they are drawn: the page's foot (false), or the viewer's, which leaves out an action with `inViewer: false`. */
  viewer: boolean;
  /** What a press is handed, read at the press. */
  context: () => DiagramActionContext;
  /** Called before `onSelect`: the page's figure settles a running entrance, as for any of its controls. */
  onPress?: () => void;
  /** The diagram's name, for the development warnings. */
  component: string;
  /** The page's figure's title: each button is described by it, so an action names its figure on a page of several (its name is its words). */
  describedBy?: string;
}

let warned: Set<string> | undefined;
function warnOnce(message: string, error?: boolean) {
  warned ??= new Set();
  if (warned.has(message)) return;
  warned.add(message);
  if (error) console.error(message);
  else console.warn(message);
}

export function DiagramActions({ actions, viewer, context, onPress, component, describedBy }: DiagramActionsProps) {
  const seen = new Set<string>();
  // Development only, and once: the page's foot says it, so the viewer's copy of the same list is not a second warning.
  if (process.env.NODE_ENV !== "production" && !viewer) {
    if (actions.length > 3) warnOnce(`Basalt ${component}: ${actions.length} actions in the foot; three at most, by intent (a foot is not a toolbar). They are drawn as written`);
    for (const a of actions) {
      if (!a.label) warnOnce(`Basalt ${component}: an action has no label, so it is not drawn`, true);
      else if (a.label.length > 24) warnOnce(`Basalt ${component}: the action "${a.label}" is past 24 characters; a label in the foot is short. It is drawn as written`);
    }
  }
  return (
    <>
      {actions.map((action, at) => {
        if (!action.label || (viewer && action.inViewer === false)) return null;
        let key = action.id ?? action.label;
        if (seen.has(key)) {
          if (process.env.NODE_ENV !== "production" && !viewer) warnOnce(`Basalt ${component}: two actions are keyed "${key}"; give each its own id. The later one is keyed by its place`);
          key = `${key}\u0000${at}`;
        }
        seen.add(key);
        return (
          <Button
            key={key}
            variant="secondary"
            size="sm"
            className="basalt-diagram-action"
            disabled={action.disabled}
            focusableWhenDisabled
            aria-describedby={describedBy}
            onClick={() => {
              if (action.disabled) return undefined;
              onPress?.();
              return action.onSelect(context());
            }}
          >
            {action.label}
          </Button>
        );
      })}
    </>
  );
}
