# choice

Native inputs, styled bare: `input[type=checkbox]`, `input[type=radio]` and a switch, `input[type=checkbox][role=switch]`. Wrap each with its words in `<label class="choice">`; the label is the 44px touch target. A radio group is `.radio-group` with `role="radiogroup"` and an `aria-label`; radios share a `name`.

```html
<label class="choice"><input type="checkbox" name="notify"> Email me about builds</label>
<div class="radio-group" role="radiogroup" aria-label="Plan">
  <label class="choice"><input type="radio" name="plan" value="free" checked> Free</label>
  <label class="choice"><input type="radio" name="plan" value="pro"> Pro</label></div>
<label class="choice"><input type="checkbox" role="switch" name="auto"> Auto-deploy</label>
```

- A checkbox is any number of independent options. A radio group is one of a few, all visible (for more than five use a select). A switch takes effect at once: name the setting ("Auto-deploy"), not the action.
- A mixed box is the page's script setting `input.indeterminate = true`. A checkbox with no visible label needs `aria-label` (a table row's: "Select NAME").
- `disabled` greys the label and the box. Selected is the filled box with its mark; a switch also moves its thumb.
