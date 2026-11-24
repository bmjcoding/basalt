# selection

A table with a checkbox column. The header box is `data-select-all`; every cell of the column is `td.select-col` (`th.select-col` in the head) holding a `type=checkbox` labelled "Select NAME". The script sets `aria-selected` on each row (the wash band), keeps the header box checked, mixed or clear, and says the count.

```html
<p role="status" data-select-count></p>
<div class="panel table-wrap" role="region" aria-label="Runs table" tabindex="0"><table>
  <thead><tr><th class="select-col"><input type="checkbox" data-select-all aria-label="Select all runs"></th><th>Run</th></tr></thead>
  <tbody><tr><td class="select-col"><input type="checkbox" aria-label="Select run-0141"></td><td>run-0141</td></tr></tbody></table></div>
```

- The state is the row's checked box and the count in words ("3 of 12 selected", "None selected"), not the wash (about 1.2:1). There is no bar and no edge mark.
- The column is 32 on a pointer and 44 on touch (`--basalt-select-column`); a `<col>` may make it wider. The box is centred in it, so selecting moves no header or column. Set `checked` on a row's box to start it selected; the mixed header box and the count paint at once on load.
