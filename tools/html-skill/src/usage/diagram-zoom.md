# diagram-zoom

Added for you on a page with a diagram (with `dialog`, `dialog-form` and `sheet`), unless every figure's JSON says `"zoom": false`.

- **Expand:** in the figure's foot after "View as list", once script runs. It opens the viewer: the drawn layout in a dialog (the window less 16px from 720, the whole window under it), even where the page shows the stack.
- **Zoom:** it opens at Fit (the whole drawing, 200% at most). "Zoom out", "Zoom in" and "Fit" in the foot; `+`, `-` and `0` with focus in the stage; Ctrl or Command with the wheel, a trackpad pinch and two fingers zoom about the pointer. From Fit or 100% to 400%.
- **Pan:** the stage scrolls both ways; a drag, one finger, the wheel or the arrow keys. A trace works; nothing animates. Esc closes it.
- Don't build a viewer of your own, and don't scale a figure on the page.
