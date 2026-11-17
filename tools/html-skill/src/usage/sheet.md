# sheet

A modal side panel on the dialog's rules (`--usage dialog`): `<dialog class="panel float modal sheet" data-side="right">`, `data-side` right (default), left, bottom or top. Same opener, title, actions and focus as a dialog; the scrim fades and the panel slides in.

- Right and left are `min(440px, 100%)` full height; bottom is 90dvh with 16px top corners. Put long content straight in; a `.dialog-actions` as the last child stays at the foot.
- **Top** is the site header's narrow menu, which `topbar-nav` builds for you (`--usage topbar-nav`). By hand: it covers the bar and redraws it as a first row `<div class="sheet-band">` (56px, a hairline below, the gutter either side), then the list unrolls beneath.
- **Menu and Close:** `<span data-glyph="menu"></span>` and `<span data-glyph="close"></span>` are the core set's glyphs (`--usage glyph`). React morphs Menu into Close; the skill swaps them at once (a recorded difference).
- **Head, body, foot:** `header.sheet-head` > `.sheet-head-text` (a `.dialog-title` with `tabindex="-1"`, a `.dialog-description` count) and a ghost icon-only `.btn.sheet-close` with `data-dialog-close`; then `.sheet-body` (scrolls, `tabindex="0"`) and `footer.sheet-foot`. No sheet padding.
- **Steps:** swap the body and foot, then `title.focus()` on this sheet's title, so the new one is read.
