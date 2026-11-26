# table

`.table-wrap` (`role=region`, `aria-label`, `tabindex=0`) > `table`, `th[data-numeric]`, `td[data-numeric]`, `td[data-mono]`, `tr[aria-selected=true]` (the wash band).

- Name the region for what it is ("Services table"), and the section for the topic. Don't give a section and an inner `.table-wrap` region the same accessible name (axe `landmark-unique`).
- At 390 a table's name column and any status column come first and fit on screen; only numbers may scroll. Don't hide a column to make it fit.
- A `th scope="row"` in the body is the row's name (500, primary). No reading: `<td data-not-observed>Not observed</td>`, never `0` or blank. `data-row-density="compact"` on the region makes 32px rows.
- `<p class="table-hint" hidden></p>` after the region says "Scroll sideways to see all N columns" while it overflows. For a table that must not move: `--usage still-table`.
- **Flat, in a card** (React's `TableContainer flat`): `data-flat` on the region, inside a `.card` and without `.panel` on it, so the card is the one box: the region draws no border, radius or fill, the header band keeps its fill, and the cells are padded `--basalt-space-2` above and below. A two-line cell is `<span class="table-call"><span class="table-call-main">The call</span><span class="table-call-detail">What it changes</span></span>`: 500 in primary over 400 in secondary, 2px apart, wrapping in its column, its cell padded `--basalt-space-2` above and below in any table. Facts a reader does not compare go there, never in a column dropped as the table narrows.
- **A row that opens what it names**: `<tr data-linked>`. A plain press on the row follows its link (`data-row-opener` on it, else the first link in the row's `th`, else its first link); the link stays the one control. A modified or middle click, a drag, a selection and a press on another control or a cut cell are their own.
