# select

A native `<select class="input">` in a `.select` wrapper (it draws the caret where the browser has no styled list). Label it with a `.field` label and `for`.

```html
<div class="field"><label for="region">Region</label>
  <span class="select"><select class="input" id="region" name="region">
    <button><selectedcontent></selectedcontent></button>
    <option value="" disabled selected hidden>Select…</option>
    <option value="eu">Frankfurt<span class="option-description">eu-central, lowest latency</span></option>
    <option value="us">Ashburn</option>
  </select></span></div>
```

- The open list is styled in Chromium; other browsers open their own list (the closed select matches). Keys, typeahead and the value stay the browser's; one row is lit at a time, by whichever of the pointer and the keys moved last.
- `<button><selectedcontent>` first keeps a closed select to the label alone; leave it out when no option has a description, or the description runs on after the label.
- `.option-description` is a second line in an option, only when the label can't tell the choices apart. A placeholder is a `hidden` option with `value=""` (tertiary ink).
- `data-size` is `xs`, `sm`, `lg` or `xl`; `disabled` and `aria-invalid="true"` as for `.input`.
- `data-numeric` (a page size) holds its widest option's width, below the 160 minimum.
