# diagram-state

Added for you when a diagram's JSON says `"type": "state"`: `nodes` (states, with `initial`, `final`, `entry`, `exit` and `group`), `groups` (composite
states), and `edges` with `event`, `guard` and `action`, never a `label`: the engine writes it, the event on the first line and `[guard] / action` on the
second, each line 28 characters at most. Transitions that leave one state on one event are numbered in the order tried. A line to a composite state is
not drawn yet.
