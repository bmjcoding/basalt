# diagram

```
<figure class="diagram">
  <script type="application/json" data-diagram>
  { "type": "architecture", "title": "How a request reaches the agent", "source": "docs/architecture.md",
    "summary": "…", "legend": { "main": "Request path", "plain": "Call", "dashed": "Async or one-way", "focal": "The service" },
    "groups": [{ "id": "aws", "label": "AWS · your account" }],
    "nodes": [{ "id": "svc", "kind": "ECS service", "name": "cimip service", "detail": "N tasks", "detailMono": true,
                "focal": true, "group": "aws", "col": 3, "row": 2 }],
    "edges": [{ "from": "alb", "to": "svc", "kind": "main", "label": "HTTP" }] }
  </script>
</figure>
```

Boxes and the lines between them. `compose.mjs` writes the figure's words into the page (it reads before script); the script draws the lines, the labels, the keys and "View as list". `Basalt.diagram(figure, spec)` draws one from script.

- **Five shapes of data** (`type`): `architecture` (`nodes` with `group`, `groups`, `edges`); `flowchart` (`nodes` with `shape`: `step`, `decision` or `terminal`, the first node the start; `edges`, a branch's `label` its condition); `data-flow` (`lanes`, `nodes` with `lane` and `col`, its step columns; `edges`); `sequence` (`participants` with `short`; `steps`: `{ from, to, label, note, kind }` or `{ band }`); `schema` (`tables`: `name`, `col`, `row` or `[first, last]`, `columns` with `key` `PK`/`FK` and `references: "table.column"`, `more`).
- **Order is one thing:** the array's order is the stacked order, the focus order, the list's, a data flow's step numbers and a sequence's message numbers.
- **Place, don't route:** `col` and `row` are whole tracks from 1. Sides, slots, jogs, lanes, the group's box and a foreign key's line are derived. Write `fromSide` or `toSide` (`top`, `right`, `bottom`, `left`) only to change the default. `branch: true` indents a node in the stacked drawing.
- **Lines:** `kind` is `main` (2px), `plain` (default) or `dashed` (a reply, a stream). One `label` each, at most 28 characters. `legend` gives each kind its words; `main`, `dashed` and a `focal` node must have words. One node at most is `focal`.
- **Required:** `title`, `summary` (what it shows, in a sentence). `source`, `heading` (2 to 6, default 3).
- Monochrome: nothing takes a colour. The drawn layout is used only where it fits; otherwise the figure is stacked, one column at most 480 wide.
