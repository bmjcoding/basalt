# diagram-schedule

Added for you when a diagram's JSON says `"type": "schedule"`: `unit` (one for every duration, `"min"` or `{ "one": "day", "other": "days" }`), and `tasks` with
`id`, `name`, `kind` ("T3"), `duration`, `after` (ids), and `col` and `row` as an architecture card's, or `"layout": "auto"`. Never write a number: early and late
starts and finishes, float, the critical paths and which line is main are computed. The focal task's words never say "critical".
