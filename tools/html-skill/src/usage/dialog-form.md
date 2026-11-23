# dialog-form

A form or task in the center (React's `DialogContent form`): a dialog with the sheet's head, body and foot (`--usage dialog sheet`). Add `data-form`.

```html
<dialog class="panel float modal dialog" data-form id="d">
  <header class="sheet-head"><div class="sheet-head-text"><h2 class="dialog-title" tabindex="-1">Invite a teammate</h2></div>
    <button class="btn sheet-close" data-variant="ghost" data-dialog-close aria-label="Close"><span data-glyph="close"></span></button></header>
  <div class="sheet-body"><p class="dialog-description">They get a link to join.</p>…fields…</div>
  <footer class="sheet-foot"><div class="dialog-actions"><button class="btn" data-dialog-close>Cancel</button><button class="btn" data-variant="primary">Send invite</button></div></footer>
</dialog>
```

- Any task: an invite, a booking. 480 wide, head and foot held, the body scrolls and opens with the description. At most the window less 16px above and below; its top is held where it opened.
- First focus: the first field for a key or a mouse, the title for a touch. Under 720 it is a full-screen modal, the foot's two actions equal 44px buttons.
- React's alone: the top re-measured on a resize, and a scrim press that closes only while nothing is entered. Here the scrim closes it.
