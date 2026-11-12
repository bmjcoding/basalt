# dialog

A modal on a native `<dialog>`: `<button class="btn" data-dialog-open="#d">` opens it, `data-dialog-close` inside it closes it. `Basalt.openDialog("#d")` and `Basalt.closeDialog("#d")` do the same from script.

```html
<button class="btn" data-dialog-open="#d">Rename…</button>
<dialog class="panel float modal dialog" id="d">
  <h2 class="dialog-title">Rename sandbox</h2>
  <p class="dialog-description">The new name shows everywhere.</p>
  <div class="dialog-actions">
    <button class="btn" data-dialog-close>Cancel</button>
    <button class="btn" data-variant="primary" data-dialog-close>Save</button>
  </div>
</dialog>
```

- `.dialog-title` is required: it names the dialog. Cancel comes first, the primary action last.
- Focus moves in, wraps inside, and returns to the opener. Esc and a press on the scrim close it.
- **Alert dialog** (a decision): add `role="alertdialog"` and `data-cancel` on the safe button. Focus starts there, and the scrim never closes it. A destructive action is a `data-variant="danger"` button, never a red fill.
- What the dialog holds is level 2 (a `.panel` or `.code` in it looks right on its own). Use no `.float` outside a popup.
