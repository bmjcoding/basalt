# explainer

What a column means, opened from its sortable header: hover (600ms), keyboard focus, or a long press on touch. A press still sorts.

```html
<th data-sortable data-first-sort="descending">Zero retention
  <div class="explainer"><p class="explainer-title">Zero retention</p><p>At least one provider says it keeps no prompts or outputs.</p><p><a href="#retention">How retention is reported</a></p></div>
</th>
```

- Only for a column a reader could misread: a term of art, a coined name, a measurement whose method changes the reading. Never on a plain name.
- One to three sentences and at most one link; never a control. If most headers need one, write a better caption.
- It opens above the header, else beside it, never over its column. Size the column for its label under WCAG 1.4.12.
