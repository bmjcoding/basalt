# search

A search dialog on the dialog's rules (`--usage dialog`): `<dialog class="panel float modal dialog search" id="s">`. Open it with a `data-dialog-open="#s"` button (a field-shaped trigger is React's; here a `.btn`). Rows are **links**, each a tab stop; Enter in the field sends the query (your script), and never follows a row.

```html
<dialog class="panel float modal dialog search" id="s">
  <h2 class="dialog-title visually-hidden" tabindex="-1">Search the shop</h2>
  <form class="search-form" role="search">
    <label class="search-field"><span data-glyph="search"></span><span class="visually-hidden">Search products</span>
      <input class="search-input" type="search" placeholder="A brand, whey" autocomplete="off" enterkeyhint="search"></label>
    <button type="button" class="btn search-close" data-variant="ghost" data-icon-only data-edge="end" aria-label="Close search" data-dialog-close><span data-glyph="close"></span></button>
  </form>
  <p class="search-count" role="status">2 products</p>
  <ul class="search-results">
    <li><a class="search-result" href="#a"><span class="search-media"><img src="a.png" alt=""></span><span class="search-name"><span class="search-title">Whey</span><span class="search-detail">Brand · 2 lb</span></span><span class="search-trailing">$39</span></a></li>
  </ul>
</dialog>
```

- `.search-results` has a fixed height, a full result's, so the field and the count never move; it scrolls inside. The counts are presets (a shop's: 3 logo rows, 5 picture rows, a "See all" row); set yours: `style="--_logos: 0; --_packs: 6; --_alls: 0"`.
- A row is as tall as its `.search-media` plus 6px each side: 72 for a pack (the default, 48 by 60), 60 for a logo (`data-shape="logo"`, 96 by 48), 48 at least with none. A row of its own words, centred: `data-centered` on the link.
- The count is one `role="status"` line you rewrite after a pause, not per keystroke; change only its text.
- One close button: the browser's clear × is hidden. The title is read on opening and never drawn.
