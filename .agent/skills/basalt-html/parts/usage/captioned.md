# captioned

```html
<dl class="captioned" data-size="large" data-columns="3">
  <div><dt>A first claim</dt><dd>The sentence that says what follows from it.</dd></div>
  <div><dt>A second claim</dt><dd>Another sentence.</dd></div>
  <div><dt>A third claim</dt><dd>One more.</dd></div>
</dl>
```

`.captioned` (React's `CaptionedColumns`): a short head over a sentence, in columns. A `dl` of `div` items, one `dt` (the head, primary) and one `dd` (the sentence, secondary) in each.

- `data-size="large"` (the default look) is the home page's list: a divider on top of each item, `--basalt-space-6` above and below, the head `text-xl` at 600, `--basalt-space-3`, a `text-md` sentence. `data-size="small"` is a drawing's captions: one rule over the whole list, `--basalt-space-5` under it, `--basalt-space-6` between rows, the head `text-base` at 500, `--basalt-space-1`, a `text-base` sentence. Always write `data-size`.
- The count is the page's: `data-columns="1"` to `"4"` (default 1) sets `--columns`. The module has no breakpoints: for a count that changes with width, write your own rule on `--columns` (`@container (width >= 960px) { .captioned { --columns: 4; } }`). The gutter is `--basalt-size-gutter`.
- Not a card, a stat or a `.dlist`: it has no box and no label column.
