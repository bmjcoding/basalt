# choice-card

A card you can choose: a `label.panel.choice-card` wrapping a native radio or checkbox, hidden but focusable. Cards of one choice sit in `.choice-card-group` (a grid) with `role="radiogroup"` (or `group` for checkboxes) and an `aria-label`.

```html
<div class="choice-card-group" role="radiogroup" aria-label="Plan">
  <label class="panel choice-card">
    <input class="choice-card-input" type="radio" name="plan" value="pro" aria-labelledby="pro-t" aria-describedby="pro-d">
    <span class="choice-card-head"><span class="choice-card-title" id="pro-t">Pro</span><span class="choice-card-box" aria-hidden="true"></span></span>
    <span class="choice-card-description" id="pro-d">For teams that deploy daily.</span></label>
</div>
```

- Words only: no link or control inside a card. Put a link that explains the options beside or under the group.
- Radio is one of many, checkbox any of many. Selected is the wash and the filled box with its mark; the rim and level don't change. The box seat is on every card, so choosing moves no title.
- `.choice-card-body` holds extra words under the description.
