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

- Every `<col>` has a width but one, which takes the rest; `min-width` on the table exceeds their sum, so the region scrolls.
- `th[data-sortable]`: write the words only; the script adds the button and a 16px seat after them. A press sorts ascending, then descending (`data-numeric`, or `data-first-sort="descending"` for a time, starts descending), then back to the load order with nothing lit. `aria-sort` on the `th` is its state. Rows sort from the load order by `data-value`, else the words; an empty or `data-not-observed` cell goes last both ways. To sort yourself, `preventDefault()` the `th`'s `sortchange` (`direction` null at the third press).
- `data-pinned="1|2|3"` keeps that many leading columns put as a narrow screen scrolls (select, then name); a name is a `th scope="row"`.
- `tr[data-empty]` is the one row for no match, `hidden` until a filter empties the table. Its action names what hid the rows: "Clear filters" (it clears a search too), or for a search alone `No runs match “zzq”.` and "Clear search". Change rows by replacing only `tbody`'s rows.
- A cut cell is a focus stop and shows its whole value on hover or focus; Esc closes it. Size a fixed-form column (a time, a status) and every header label for WCAG 1.4.12 spacing, so only free text is cut; a cut sortable header has no plate.
- `data-wrap` on every `td` (or body `th scope="row"`) of a column of sentences, rules or paths: the cell wraps whole and the row grows from its 40px (one line is still 40); it is never cut. Give that column the remainder or at least 160px; a number, date, time or status column never wraps.
