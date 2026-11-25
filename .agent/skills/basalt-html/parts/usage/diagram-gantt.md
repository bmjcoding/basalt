# diagram-gantt

Added for you when a diagram's JSON says `"type": "gantt"`.

```
{ "type": "gantt", "title": "…", "summary": "…", "today": "2026-11-24", "legend": { "focal": "The release" },
  "phases": [{ "id": "build", "label": "Build" }],
  "tasks": [{ "id": "a", "name": "Sandbox images", "start": "2026-11-02", "end": "2026-11-09", "phase": "build" },
            { "id": "b", "name": "Cut-over", "start": "2026-11-20", "milestone": true, "after": ["a"], "focal": true }] }
```

- A row a task on one time scale. `start` and `end` are days (`YYYY-MM-DD`, the end inclusive) or numbers with a `unit` (`"min"`, or `{ "one": "week", "other": "weeks" }`). A milestone has a `start` and no `end`.
- No dependency line is drawn: `after` is written in the row ("After: …"). Never write a count or a length by hand; the engine writes "8 days".
- A bar is never widened: where the shortest bar would be under 8px the bars go and the words stay (a 1-day task in a 90-day plan on a phone). More than 512 times the shortest bar is never drawn: make the short task a milestone or split the chart.
- `today` is drawn only inside the plan. `todayLabel` and `labels` replace the built-in words.
