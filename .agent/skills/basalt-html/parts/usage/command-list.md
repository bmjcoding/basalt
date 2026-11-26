# command-list

A search field over a list of commands, set in the page: a level-1 panel in the flow with no scrim and no shadow. The script builds it; don't write or style its markup, and don't put it inside a `.panel` or `.card` (it is one).

```
<div class="command-list" data-label="Console" data-noun="command">
  <script type="application/json" data-commands>{ "groups": [ { "label": "Sandbox", "items": [
    { "id": "new", "label": "New sandbox", "icon": "TerminalWindow", "description": "Create a fresh environment", "keys": ["⌘", "N"] },
    { "id": "rename", "label": "Rename", "href": "#rename" } ] } ] }</script>
</div>
```

Items are the palette's (`label`, `icon`, `keys`, `keywords`, `danger`, `href`, `onSelect`) plus `description`, the second line under the label, cut with an ellipsis and never wrapped. From script: `Basalt.commandList(el, { groups, onSelect(item), detail(item) })`; `label`, `noun` and `placeholder` are options or `data-` attributes.

**With a preview:** add `<template data-detail="ID">` for each item `id` (or `detail(item)` returning a string or a node). Start each with a heading: it names the pane and takes focus when the list pushes. The list is 320px and the pane the rest from 816px of the list's own width; under it the list pushes to the detail, with a Back band. Panels inside the pane sit one level in.

- `data-label` names the region and the Back button; `data-noun` is what the foot counts ("9 commands", "3 of 9", spoken once after 400ms); `data-count` replaces the line.
- An item's `unavailable` (a string, why it cannot run) works as in the palette: lit and reached by the keys, nothing on Enter or a press, the reason said; beside a preview the pane shows the reason and ↵ presses nothing.
- A `<template data-empty>` inside the list replaces "Nothing matches “…”." and Clear search; an element in it with `data-clear` clears the search.
- Focus stays in the field (a combobox): ↑ ↓ wrap, ↵ runs the row (in a split it runs the pane's first button), Esc clears the search and then does nothing, Tab leaves. Nothing is focused on load. The lit row shows only while the field has focus or the pointer is over the list.
- A search ranks title matches above description and keyword matches, each in the order given.
- The panel is as tall as its matches, up to 360px, then scrolls; on the open page its unfiltered height stays as page under it. In a panel, dialog or popover (or with `data-reserve="off"`) it holds no room. No match is one sentence and a Clear button.
- ⌘K focuses the field on a page with no palette; with a palette on the page, ⌘K is the palette's. One owner.
