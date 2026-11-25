# diagram

```
<figure class="diagram">
  <script type="application/json" data-diagram>
  { "type": "architecture", "title": "How a request reaches the agent", "source": "docs/architecture.md",
    "summary": "…", "legend": { "main": "Request path", "plain": "Call", "dashed": "Async or one-way", "focal": "The service" },
    "groups": [{ "id": "aws", "label": "AWS · your account" }],
    "nodes": [{ "id": "alb", "kind": "Load balancer", "name": "ALB", "col": 2, "row": 2 },
              { "id": "svc", "kind": "ECS service", "name": "api service", "detail": "N tasks", "detailMono": true,
                "focal": true, "group": "aws", "col": 3, "row": 2 }],
    "edges": [{ "from": "alb", "to": "svc", "kind": "main", "label": "HTTP" }] }
  </script>
</figure>
```

Boxes and the lines between them. `compose.mjs` writes the figure's words into the page (it reads before script); the script draws the lines, the labels, the keys and "View as list". `Basalt.diagram(figure, spec)` draws one from script.

- **Five shapes of data** (`type`): `architecture` (`nodes` with `group`, `groups`, `edges`); `flowchart` (`nodes` with `shape`: `step`, `decision` or `terminal`, the first node the start; `edges`, a branch's `label` its condition); `data-flow` (`lanes`, `nodes` with `lane` and `col`, its step columns; `edges`); `sequence` (`participants` with `short`; `steps`: `{ from, to, label, note, kind }` or `{ band }`); `schema` (`tables`: `name`, `col`, `row` or `[first, last]`, `columns` with `key` `PK`/`FK` and `references: "table.column"`, `more`; `cardinality: { "from", "to" }` on every foreign key or none draws crow's feet: `from` is `one`, `zero-or-one`, `one-or-many` or `zero-or-many`, `to` is `one` or `zero-or-one`).
- **More shapes:** `state` (`nodes` with `initial`, `final`, `entry`, `exit` and `group`; `edges` with `event`, `guard`, `action` and no `label`: the engine writes it); `deployment` (`environment`, required; `nodes` with `replicas` and `artifacts`: rows a line may name); `schedule` (`unit`, `tasks` with `kind`, `duration`, `after`, `col`, `row`: its numbers and its main lines are computed). An architecture with `"dependents": { "one": "dependent", "other": "dependents" }` counts each card's dependents and dashes a cycle; a data flow's step may be `"shape": "decision"`. The others have modules of their own: gantt, timeline, kanban, journey, service blueprint, story map.
- **Order is one thing:** the array's order is the stacked order, the focus order, the list's, a data flow's step numbers and a sequence's message numbers.
- **Place, don't route:** `col` and `row` are whole tracks from 1. Sides, slots, jogs, lanes, the group's box and a foreign key's line are derived. Write `fromSide` or `toSide` (`top`, `right`, `bottom`, `left`) only to change the default. `branch: true` indents a node in the stacked drawing.
- **Lines:** `kind` is `main` (2px), `plain` (default) or `dashed` (a reply, a stream). One `label` each, at most 28 characters. `legend` gives each kind its words; `main`, `dashed` and a `focal` node must have words. One node at most is `focal`.
- **Required:** `title`, `summary` (what it shows, in a sentence). `source`, `heading` (2 to 6, default 3).
- Monochrome: nothing takes a colour but a card's service mark. The drawn layout is used only where it fits; otherwise the figure is stacked. One column is at most 480 wide, drawn or stacked, on the start edge (or its track's least width where more).
- **Motion:** `"motion": "animated"` (default still) draws each line once in view, every word at rest; it brings in `diagram-motion` (its usage says the rest). Motion never carries a fact alone.
- **Flow, pulse, packet:** `"flow": true` on an edge marches it (a dashed line's own dashes) (give it a label). `"pulse": ["a", "b", "c"]` runs a bead along a route; `"packet": { "path": [...], "repeat": true }` sends a dot. One of pulse and packet; never flow on the mover's route. Architecture and data flow only.
- **Run:** `"run": true` on a sequence adds "Play the run", a dot through every message.
- **Parts:** a group's `parent` (two levels); `href` (and `"target": "_blank"`) makes a card a link; a label's `"\n"` is its one break; a sequence's message `activate`/`deactivate` (a bar) and steps `{ "frame": "opt" | "loop", "label", "steps" }` or `{ "frame": "alt", "branches": [...] }`; `"variant": "text"` draws it as text art; `"layout": "auto"` places the cards for you (compose.mjs, at build time); `"entrance": "first-visit"` with an `id` plays the entrance once.
- **Mark:** `"mark": "aws-ecs-service"` on an architecture node, a data flow's step or a sequence's participant, 16px in the card's top end corner, the owner's file and colours; the card's words still name the service. Your own: `{ "onLight": "logo.svg", "onDark": "logo-dark.svg" }`, read into the page. A page drawing from script names its marks: `<!-- basalt:marks aws-s3-bucket temporal -->`.
- **Marks:** `aws-*`, `azure-*`, `gcp-*`, `kubernetes`, `temporal`, `sonarqube`, `github`, `coderabbit`, `greptile`, `blacksmith`, `jenkins`, `servicenow`, `blazemeter`. `node .agent/skills/basalt-html/compose.mjs --marks [aws azure gcp ...]` prints each id with the words its card must say and which are unofficial; a database card (Aurora, RDS) takes `aws-database`.
- **Export:** never hand-write `.drawio`, `.vsdx` or `.lucid`; author this diagram JSON and run `basalt-diagram-export <input.json|page.html> --to drawio,vsdx,lucid` (in-repo: `node packages/react/bin/basalt-diagram-export.mjs` after `npm run build`). `.lucid` is for Lucid's REST API only (`POST https://api.lucid.co/v1/documents` with a token, type `x-application/vnd.lucid.standardImport`); to import through Lucid's own screen, use `.vsdx`.
