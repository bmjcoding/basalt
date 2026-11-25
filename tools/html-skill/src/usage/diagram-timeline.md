# diagram-timeline

Added for you when a diagram's JSON says `"type": "timeline"`.

- `events`: `id`, `at` (an ISO 8601 instant with its offset, `"2026-11-24T14:03:00Z"`), `name`, `kind`, `detail`, `focal`. Points only: a span is a gantt's bar.
- `timeZone` (an IANA name, default `"UTC"`): every time is written in it, 24-hour, by the engine. Never write a time or a gap by hand.
- `domain`: `["from", "to"]`, used as written; left out, the events' extent rounded out to ticks.
- `breaks`: `[{ "from", "to", "label" }]`, your own and never the engine's: a gap in the scale, its length written for you ("31 min · soak").
- A card is at its time or the figure is stacked (each card then writes the gap since the one before).
