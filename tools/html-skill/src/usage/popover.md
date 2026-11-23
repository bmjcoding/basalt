# popover

A native popup beside its opener: `<button class="btn" popovertarget="p1">` then, right after it in the markup, the popup.

```html
<button class="btn" popovertarget="p1">Details</button>
<div class="panel float popover" popover id="p1">
  <h2 class="popover-title">Region</h2>
  <p class="popover-description">Where it runs.</p>
  <button class="btn" popovertarget="p1" popovertargetaction="hide">Close</button>
</div>
```

- Put the popup where its opener sits, inside whatever holds the opener: its level is the opener's plus one. The browser opens, light-dismisses and closes it on Esc and returns focus; the script positions it (below, at the start; `data-side="top|left|right"` and `data-align="center|end"` on the popup), moves focus in and closes it when focus leaves.
- Name it with a `.popover-title`. No danger styling, no second blurred layer, and it is never modal: for a decision use `dialog`.
- `data-focus-self` on the popup: it takes focus itself when it opens, rather than its first control (Tab goes on into it).
