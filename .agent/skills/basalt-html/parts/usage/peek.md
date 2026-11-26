# peek

Cut text, read whole. `data-lines="1"` cuts an element to one line with an ellipsis; `data-lines="2"` (to `"4"`) clamps it to that many lines, its height capped at that many of the reader's own lines.

```html
<p class="muted" data-lines="2">A long description that may run past two lines at narrow widths, read whole on hover or focus.</p>
<a href="/files/42"><span data-lines="1">quarterly-results-final-v3-approved.pdf</span></a>
```

- While it is cut it is a focus stop of its own and its whole text opens over it on a level-3 plate on hover (after 600ms), on keyboard focus, or on a 500ms touch and hold; Esc closes it. Whole text is no stop.
- Inside a control (a link, a button, a `summary`, a `label`, a widget role) the control stays the one stop: the plate opens from its hover and focus, and a press on the plate is a press on the control. Without hover the text shows whole at rest.
- `data-peek="off"` only cuts: only where pressing the control shows the whole text (an excerpt on a card that links to it). In a long list of static lines, wrap instead of cutting.
- The still table's cut cells use the same plate.
