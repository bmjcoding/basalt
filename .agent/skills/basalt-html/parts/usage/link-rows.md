# link-rows

A directory (a head, then ruled rows, each one link) and big link rows. One `ul` each, named; a row is one link, never a menu or palette row.

```html
<div class="dir" id="work">
  <h3 class="dir-head" id="work-head">Client work and other projects</h3>
  <ul class="dir-list" aria-labelledby="work-head">
    <li><a class="dir-row" href="/a"><span class="dir-name">Alpha</span><span class="dir-what">What it is.</span><span class="dir-state">2026</span></a></li>
  </ul>
</div>
<ul class="big-links" aria-label="Shop by category"><li><a class="big-link" href="/a">Alpha goods</a></li></ul>
```

- **Directory:** columns are the name (600), the sentence (the rest, secondary) and the state (end-aligned, tabular); 160px for the name and the state, one column under 720. Rows are at least 56px. The arrow after the name is drawn for you, never written. Hover and focus lift the sentence and arrow to primary ink and move the arrow 2px; there is no wash.
- **Show all:** the rows after the first few are `li.reveal` holding `div.reveal-clip` (the script makes it inert while closed) holding the row, in the same `ul`. The `button` is in `div.reveal-foot` under the list; its `aria-controls` is the `div.dir`. See `--usage disclosure`. Never a second list.
- **Big rows:** 600 at `text-2xl`, `text-3xl` from 1024; two columns from 720 to 1023. One line each; the arrow follows the words.
- A `target="_blank"` row gets the new-tab arrow in the go arrow's place (`--usage links`).
