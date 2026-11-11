# sheet

A modal side panel on the dialog's rules (`--usage dialog`): `<dialog class="panel float modal sheet" data-side="right">`, `data-side` right (default), left, bottom or top. Same opener, title, actions and focus as a dialog; the scrim fades and the panel slides in.

- Right and left are `min(440px, 100%)` full height; bottom is 90dvh with 16px top corners. Put long content straight in; a `.dialog-actions` as the last child stays at the foot.
- **Top** is the site header's narrow menu: it covers the bar and redraws it as a first row `<div class="sheet-band">` (56px, a hairline below), then the list unrolls beneath. Step 5 (navigation) defines the header's band and fills it then; until that, the band is this empty row and what you put in it.
- **Menu and Close:** `<span data-glyph="menu"></span>` on the opener and `<span data-glyph="close"></span>` in a ghost icon-only `.btn data-dialog-close` in the band are the core set's glyphs. React morphs Menu into Close; the skill swaps them at once (a recorded difference).
