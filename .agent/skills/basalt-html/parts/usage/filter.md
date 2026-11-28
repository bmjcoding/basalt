# filter

A filter that takes any number of its values (React's MultiSelect), and the line that says what it did.

```html
<div class="filter" data-label="Status" data-for="runs" data-column="3">
  <label><input type="checkbox" value="passed"> Passed</label>
  <label><input type="checkbox" value="failed"> Failed</label>
  <label><input type="checkbox" value="skipped" disabled> Skipped</label>
</div>
<p class="filter-result" data-for="runs" data-noun="runs">Showing 24 of 24 runs</p>
```

- Write the labelled checkboxes only. The script builds the control: up to six values are chips (a plus off, a check on) under the label, then Clear, then a count ("Any", "2 of 4"); seven or more, or `data-toolbar`, are a trigger and a checklist, with a search field from ten values. The count, never the window, picks the form. `data-label` names the group.
- Clear stays in place and is `aria-disabled` at zero, so focus stays on it. Nothing chosen means no filter.
- `data-for` (a `table` or its `.table-wrap` by id) and `data-column` (from 1) hide the rows whose cell's `data-value`, else its words, matches no chosen value, and show the table's `tr[data-empty]` when none is left. Without them, listen for `filterchange` (`detail.values`) and filter yourself.
- `.filter-result` is the one thing spoken: shown at once, spoken once, 400ms after the text holds still. Put one by each filtered list, with `data-noun`. `Basalt.filterResult(el, text, delay, spoken)` sets one by hand (`spoken`, or `data-spoken`, is said in place of the words); `data-reserve="Showing 428 of 428 lots"` holds its widest form; `Basalt.refreshFilter(id)` filters again after you replace the rows.
- With `data-toolbar` the trigger holds its widest value's width ("Any", or the longest label with the largest "+N").
- `Basalt.setFilter(filter or id, values)` checks exactly the enabled inputs listed, narrows the table and speaks the result line, with no `filterchange`: a page that keeps its filters in the address puts them back with it on `popstate` (write the address yourself, by replace, on `filterchange`).
