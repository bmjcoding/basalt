# combobox

A text input that filters a list of options as you type, and writes the chosen one back. Needs `forms` (the `.input`), and the popover and glide rules, which it builds itself (`--usage popover` is for a popup you write).

```html
<div class="field"><label for="region">Region</label>
  <div class="combobox" data-empty="No regions match.">
    <input class="input" id="region" name="region" placeholder="Search regions…">
    <ul>
      <li data-value="eu" data-description="eu-central, lowest latency">Frankfurt</li>
      <li data-value="us" aria-selected="true">Ashburn</li>
      <li data-value="ap" aria-disabled="true">Singapore</li>
    </ul>
  </div>
</div>
```

- Write only the `.combobox`, its `input.input` and a `ul` of `li`. The script replaces the list with the popup, adds the caret button, and moves the input's `name` to a hidden input that holds the chosen `data-value` (the text field shows the label). Label the input with a `.field` label and `for`, or `aria-label`.
- Each `li` is one option: its text is the label; `data-value` is the value (else the label); `data-description` is a second line, only when the label alone can't tell options apart (it is searched too); `aria-selected="true"` is the one chosen when the page loads; `aria-disabled="true"` can't be chosen.
- `data-empty` is the sentence shown when nothing matches (default "No options match."). Add `disabled` to the input to turn it off.
- Keys: Down and Up open the list and move the lit row (through none at either end); Enter chooses the lit row; Esc closes and puts the chosen label back, and Esc again clears the field. Typing filters; emptying the field clears the choice. Focus stays in the input.
- `comboboxchange` bubbles from the `.combobox` when the choice changes, with `detail.value` and `detail.label` (`''` for none); the form submits the hidden input. `Basalt.combobox(el)` wires one the page built at run time and returns `{ value(), set(value) }`.
- The input is 16px on touch and the rows 44px. It has one size.
