# diagram-matrix

Added for you when a diagram's JSON says `"type": "kanban"`, `"journey"`, `"service-blueprint"` or `"story-map"`. Equal tracks, the fit measured on the
words; below it, one column. An empty cell says so in words.

- **kanban:** `columns` (`id`, `label`, `limit`, `more`: cards not drawn, counted, `note`) and `cards` (`id`, `column`, `name`, `kind`, `detail`, `blocked`: its reason, `focal`). A count of cards at one moment: read-only, nothing drags. The count is written for you ("3, max 2 · Over limit").
- **journey:** `actor` and `scenario` (both required), `scale`: five words lowest first, your own ("Blocked" … "Confident"), `stages` (`id`, `name`, `level` 1 to 5, `actions`, `quote`, `touchpoint`, `friction`, `opportunity`), `legend.line` (required: what the scale measures).
- **service-blueprint:** `stages` (`id`, `name`, `time`), `cells` (`stage`, `layer`: `evidence`, `customer`, `frontstage`, `backstage` or `support`, `name`, `detail`), `arrows` (optional, `main` or `plain`, never dashed: two cells of one stage, or neighbouring stages of one layer). The three rules are drawn for you.
- **story-map:** `persona`, `activities` (`id`, `name`, `steps`), `slices` (`id`, `label`, first to ship first), `stories` (`id`, `activity`, `slice`, `name`, `kind`), and one `cut`: `{ "after": "slice-id", "label": "…" }`.
- `labels` replaces any built-in word. One part at most is `focal`, with `legend.focal`.
