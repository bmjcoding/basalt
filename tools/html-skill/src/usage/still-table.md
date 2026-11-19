# still-table

A table whose header positions, column widths and alignment never move through a sort, a filter, a page or a load.

```html
<div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0">
<table id="runs" data-fixed data-pinned="1" style="min-width: 640px">
  <colgroup><col><col style="width: 96px"><col style="width: 140px"></colgroup>
  <thead><tr><th data-sortable>Name</th><th data-sortable data-numeric>Duration</th><th data-sortable data-first-sort="descending">Started</th></tr></thead>
  <tbody>
    <tr><th scope="row">build-0141</th><td data-numeric data-value="312">5m 12s</td><td data-value="2026-11-09T10:00">Nov 9, 10:00</td></tr>
    <tr data-empty hidden><td colspan="3"><div class="table-empty"><span>No runs match.</span><button class="btn" type="button">Clear filters</button></div></td></tr>
  </tbody>
</table></div>
```

- Every `<col>` has a width except one, which takes the rest; `min-width` on the table is more than they add up to, so the region scrolls instead of squeezing. Never size a column from its content.
- `th[data-sortable]`: write the words only, the script adds the button and the 16px seat. A press sorts ascending, then descending (a `data-numeric` column, or `data-first-sort="descending"` for a time, starts descending); there is no cleared state. `aria-sort` on the `th` is the state. Rows order by the cell's `data-value`, else its words; an empty or `data-not-observed` cell goes last both ways. To sort yourself, `preventDefault()` the `sortchange` event on the `th`.
- `data-pinned="1|2|3"` keeps that many leading columns put while a narrow screen scrolls (the name, after a select column); a name is a `th scope="row"`.
- `tr[data-empty]` is the one row for no match, `hidden` until a filter empties the table. To change rows, replace only `tbody`'s rows.
- A cut cell is a focus stop (the script sets `data-cut` and `tabindex`) and opens its whole value in place on hover or focus; Esc closes it. Size a fixed-form column (a time, a status) and every header label under WCAG 1.4.12 spacing, so only free text is cut; a cut sortable header opens no plate.
