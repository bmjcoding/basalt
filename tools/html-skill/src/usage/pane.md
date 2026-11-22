# pane

A page with a pane beside it (React's `PaneLayout`): a column at the page's end that stays in view, has a height of its own and scrolls inside.

```html
<div class="pane-layout"><div class="pane-grid">
  <div class="pane-page">…the page…</div>
  <section class="pane" aria-label="Details">…</section>
</div></div>
```

- The document still scrolls; the pane is 256 wide, sticky under the bar and at most the window's height, scrolling inside when it is taller (the script makes it a tab stop then).
- It sits beside the page from 920px of the layout's own width; narrower it follows the page. Keep the page first: it is the reading order. Supporting content only, never the page itself.
