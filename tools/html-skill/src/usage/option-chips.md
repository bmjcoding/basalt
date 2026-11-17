# option-chips

One of many, eight at most, as wrapping chips with no track (React's OptionChips). Above eight values use a select.

```html
<fieldset class="option-chips">
  <legend class="option-chips-legend">Flavour<span class="option-chips-count" aria-hidden="true">3</span></legend>
  <div class="option-chips-list">
    <label class="option-chip"><input class="option-chip-input" type="radio" name="flavour" value="v" checked><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Vanilla</span></label>
    <label class="option-chip"><input class="option-chip-input" type="radio" name="flavour" value="b" aria-disabled="true"><span class="option-chip-seat" aria-hidden="true"><span data-glyph="check"></span></span><span>Berry</span><span class="option-chip-note"><span aria-hidden="true"> · </span><span class="visually-hidden">, </span>sold out at the brand</span></label>
  </div>
</fieldset>
```

- A value that cannot be chosen has `aria-disabled="true"` on its input (not `disabled`) and its reason in `.option-chip-note`: it stays reachable, the arrow keys land on it, and nothing chooses it. A `disabled` input is skipped.
- The chosen chip is the selected wash; its edge does not change. Every chip reserves the round seat, so choosing moves nothing.
