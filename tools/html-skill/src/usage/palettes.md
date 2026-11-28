# palettes

A palette is a named set of colours for links, the chosen mark, checked controls, the primary button and a field's edge, chosen beside the theme. Compose writes it:
`compose.mjs page.body.html --palettes basalt,beryl` (the first is the default; `beryl` is Basalt's, a path such as `./own.mjs` is yours: a module whose default
export is a palette definition). Compose proves every pair and fails with the ones under their floor; `--palette-url off` stops `?palette=` opening one. Status
colours, danger, the focus ring and type are never a palette's.

The choice, for a footer or a settings row: the theme choice's markup with your own words (two to four palettes; more is a native select).

```html
<div class="palette-choice"><span class="palette-choice-label" id="pal-l">Palette</span>
  <div class="segment" role="radiogroup" aria-labelledby="pal-l" aria-describedby="pal-n">
    <button type="button" role="radio" data-value="basalt"><span data-label="Basalt">Basalt</span></button>
    <button type="button" role="radio" data-value="beryl"><span data-label="Beryl">Beryl</span></button>
  </div>
  <p class="palette-choice-note" id="pal-n" data-palette-note hidden>From the link you opened. Choose one to save it.</p></div>
```

In a menu, one group of radio rows that keeps the menu open: `<div role="group" data-palette-group aria-labelledby="pg-l" aria-describedby="pg-n">`, its label, the same note
as a `.menu-text` with `data-palette-note hidden`, then `<button class="menu-item" role="menuitemradio" data-palette-value="beryl">`. No colour dots: the word
and the change say it. `Basalt.paletteChoice()` and `Basalt.setPalette('beryl')` read and write it. Another product's content in view takes
`data-palette="<id>"` on its own element; a popup the script builds from inside it keeps it. Neither control is printed.
