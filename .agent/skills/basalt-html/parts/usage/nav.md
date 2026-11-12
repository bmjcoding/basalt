# nav

A column of links with a glyph and a label (React's `Nav`): the sidebar, the narrow menu's rows and More's sheet.

```html
<nav class="nav" aria-label="Primary">
  <ul class="nav-list">
    <li><a class="nav-item" href="/" aria-current="page"><span class="nav-pill"><span data-glyph="home" data-size="24"></span><span class="nav-label">Home</span></span></a></li>
    <li><a class="nav-item" href="/inbox"><span class="nav-pill"><span data-glyph="notifications" data-size="24"></span><span class="nav-label">Inbox</span><span class="nav-count"><span class="visually-hidden">, </span>12</span></span></a></li>
  </ul>
</nav>
```

- `aria-label` is required, as an app may have several. A group is an `li` holding a `span.nav-group-label` (with an `id`) and a `ul.nav-list` with `aria-labelledby` that id.
- The current page has `aria-current="page"`: its glyph is drawn selected and its label is 600. No background, no bar.
- Hover is a pill that hugs the glyph and label, never the column's width; one shared pill glides between items, and each item paints its own on touch, under reduced motion and in forced colours. Never write a pill yourself.
- Leave out the glyph for a row of words alone (the narrow menu's). The rail (`data-collapsed` on the `.nav`, set by the app shell) shows only the glyph and keeps the label as the name, so a list that collapses gives every item a glyph.
- `.nav-count` is a number in secondary ink; `<span class="nav-dot" aria-hidden="true"></span>` with `<span class="visually-hidden">, New activity</span>` says something is new. Counts are spoken with the name.
