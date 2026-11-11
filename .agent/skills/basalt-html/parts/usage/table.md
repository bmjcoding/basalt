# table

`.table-wrap` (`role=region`, `aria-label`, `tabindex=0`) > `table`, `th[data-numeric]`, `td[data-numeric]`, `td[data-mono]`, `tr[aria-selected=true]` (the wash band).

- Name the region for what it is ("Services table"), and the section for the topic. Don't give a section and an inner `.table-wrap` region the same accessible name (axe `landmark-unique`).
- At 390 a table's name column and any status column come first and fit on screen; only numbers may scroll. Don't hide a column to make it fit.
- A `th scope="row"` in the body is the row's name (500, primary). No reading: `<td data-not-observed>Not observed</td>`, never `0` or blank. `data-row-density="compact"` on the region makes 32px rows.
- `<p class="table-hint" hidden></p>` after the region says "Scroll sideways to see all N columns" while it overflows. For a table that must not move: `--usage still-table`.
