# kbd

`<span data-kbd="⌘ K"></span>` (one chip per key), `.kbd`, `.kbd-group`, `[data-kbd-hint]` for words that only make sense with chips.

- A chip is only for a real shortcut the page binds, one per row, and never on the primary fill.
- For keys named in running text, add `data-doc` so they stay on touch: `<kbd class="kbd" data-doc>Esc</kbd>`.
- A palette item's `keys` is an array, not this string (see the palette's usage).
- `Mod` is the platform's key: `data-kbd="Mod Enter"` is ⌘↵ on Apple, Ctrl Enter elsewhere.
