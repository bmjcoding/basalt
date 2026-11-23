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

- **Five shapes of data** (`type`): `architecture` (`nodes` with `group`, `groups`, `edges`); `flowchart` (`nodes` with `shape`: `step`, `decision` or `terminal`, the first node the start; `edges`, a branch's `label` its condition); `data-flow` (`lanes`, `nodes` with `lane` and `col`, its step columns; `edges`); `sequence` (`participants` with `short`; `steps`: `{ from, to, label, note, kind }` or `{ band }`); `schema` (`tables`: `name`, `col`, `row` or `[first, last]`, `columns` with `key` `PK`/`FK` and `references: "table.column"`, `more`).
- **Order is one thing:** the array's order is the stacked order, the focus order, the list's, a data flow's step numbers and a sequence's message numbers.
- **Place, don't route:** `col` and `row` are whole tracks from 1. Sides, slots, jogs, lanes, the group's box and a foreign key's line are derived. Write `fromSide` or `toSide` (`top`, `right`, `bottom`, `left`) only to change the default. `branch: true` indents a node in the stacked drawing.
- **Lines:** `kind` is `main` (2px), `plain` (default) or `dashed` (a reply, a stream). One `label` each, at most 28 characters. `legend` gives each kind its words; `main`, `dashed` and a `focal` node must have words. One node at most is `focal`.
- **Required:** `title`, `summary` (what it shows, in a sentence). `source`, `heading` (2 to 6, default 3).
- Monochrome: nothing takes a colour but a card's service mark. The drawn layout is used only where it fits; otherwise the figure is stacked, one column at most 480 wide.
- **Motion:** `"motion": "animated"` (default still) draws each line once in view, every word at rest; it brings in `diagram-motion` (its usage says the rest). Motion never carries a fact alone.
- **Flow, pulse, packet:** `"flow": true` on a `main` or `plain` edge marches it (give it a label). `"pulse": ["a", "b", "c"]` runs a bead along a route; `"packet": { "path": [...], "repeat": true }` sends a dot. One of pulse and packet; never flow on the mover's route. Architecture and data flow only.
- **Run:** `"run": true` on a sequence adds "Play the run", a dot through every message.
- **Mark:** `"mark": "aws-ecs-service"` on an architecture node, 16px in the card's top end corner, the owner's file and colours; the card's words still name the service. Your own: `{ "onLight": "logo.svg", "onDark": "logo-dark.svg" }`, read into the page. A page drawing from script names its marks: `<!-- basalt:marks aws-s3-bucket temporal -->`.
- **Marks:** aws-application-load-balancer, aws-network-load-balancer, aws-cloudfront-distribution, aws-route-53-hosted-zone, aws-api-gateway-endpoint, aws-internet-gateway, aws-nat-gateway, aws-ecs-service, aws-ecs-task, aws-ecr-registry, aws-ec2-instance, aws-lambda-function, aws-s3-bucket, aws-dynamodb-table, aws-sqs-queue, aws-eventbridge-event-bus, aws-cloudwatch-logs, aws-cloudwatch-alarm, aws-parameter-store, aws-iam-role, aws-sagemaker-model, aws-bedrock, aws-client, aws-mobile-client, aws-user, aws-users, aws-internet, aws-server, aws-database, aws-application, aws-git-repository, aws-email, temporal, sonarqube, github, coderabbit, greptile, blacksmith, jenkins, servicenow, blazemeter. `aws-database` is the card for Aurora and RDS. aws-bedrock, jenkins, servicenow and blazemeter are unofficial.
