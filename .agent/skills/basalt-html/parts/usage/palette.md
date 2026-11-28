# palette

`<button class="btn" data-open-palette>` opens it; Cmd or Ctrl+K does too. The script builds the palette; don't write or style its markup.

Items come from `Basalt.init({ palette: { groups: [{ label, items: [...] }] } })` (or a function returning that), or, when no item runs code, from `<script type="application/json" data-palette>{ "groups": [...] }</script>`. `Basalt.openPalette(options)` opens it from script.

One item:

```
{ label: 'Save', icon: 'Download', keys: ['⌘', 'S'], hint: 'Writes the draft', keywords: ['store', 'write'], onSelect: function () { save(); } }
```

Also `description` (a second line under the label, never wrapped), `danger: true` and `href`. `keywords` is an array of strings, `['store', 'write']`; a string stops the palette's search from filtering.

`unavailable: 'Why it cannot run now'` keeps an item in its place, lit and reached by the keys like any row, but Enter or a press runs nothing, closes nothing and says the reason (again on every press). Its title and glyph are disabled ink; the reason is its second line and wraps. It draws no key chip and its `keys` bind nothing.

The foot counts the rows ("7 commands", "2 of 7"), spoken once after 400ms and never on opening. `noun` (singular) and `count` (the page's own line) are options, or `data-noun` and `data-count` on the trigger or the `script[data-palette]`. With no row shown the palette says `Nothing matches “…”.` with a Clear search button (or "Nothing to show."); a `<template data-empty>` in the body, outside any command list, replaces both, and an element in it with `data-clear` clears the search. Match marks are not drawn here.

- `keys` is an array of single keys, as the chips draw them: `['⌘', 'S']`, `['⌘', '⇧', 'C']`, or `['Mod', 'S']` for the platform's modifier (⌘ on Apple's systems, Ctrl elsewhere), drawn and bound alike. Never a string such as `'⌘ S'` (that warns and draws no chip).
- It needs ⌘, ⌃ or ⌥ and one other key; ⇧ may join them. ⌘ answers to Meta or Ctrl, and an ⌥-only combination is ignored while typing in a field.
- ⌘K and ⌃K open the palette, so no item can take them.
- Anything else warns and draws no chip. Each item's `keys` runs it from anywhere on the page.
