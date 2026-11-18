# menu

A popup of actions: the opener is a `popovertarget` button, the menu comes right after it. Needs the popover rules too (`--usage popover`).

```html
<button class="btn" popovertarget="m">Options</button>
<div class="panel float menu" popover id="m">
  <button class="menu-item" role="menuitem"><span data-glyph="copy"></span><span class="menu-item-label">Duplicate</span><span data-kbd="⌘ D"></span></button>
  <div class="menu-separator" role="separator"></div>
  <div role="group" aria-labelledby="g1">
    <div class="menu-group-label" id="g1">Sort by</div>
    <button class="menu-item" role="menuitemradio" aria-checked="true"><span class="menu-item-label">Name</span></button>
    <button class="menu-item" role="menuitemradio" aria-checked="false"><span class="menu-item-label">Date</span><span class="menu-item-description">Newest first</span></button>
  </div>
  <button class="menu-item" role="menuitemcheckbox" aria-checked="false"><span class="menu-item-label">Show hidden</span></button>
  <button class="menu-item" role="menuitem" data-danger><i data-icon="Trash"></i><span class="menu-item-label">Delete</span></button>
</div>
```

- Every row is a `button.menu-item` with its role (`menuitem`, `menuitemcheckbox`, `menuitemradio`); a radio sits in a `role="group"` with its siblings. The script adds the check seat; a click flips `aria-checked` (a radio picks one) and fires `menuchange` on the row, then leaves the menu open. A plain item closes the menu: listen for its `click`.
- Arrow keys, Home, End and typing a name move the lit row; opened by a key the first row is lit. Tab closes.
- `.menu-item-description` is a second line, only when the label alone can't tell choices apart; it makes the row two lines and the menu as wide as its text.
- A shortcut is a real one the page binds: `<span data-kbd="⌘ D"></span>` last in the row, and `aria-keyshortcuts="Meta+D"` on the row. At most one per row.
- `data-danger` is red text, never a fill.
