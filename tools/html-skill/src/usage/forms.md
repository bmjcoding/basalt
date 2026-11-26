# forms

`.field` (label, `.input`, `.hint`, `.error`), `.input` on `<input>`, `<textarea>` and `<select>` (a select is its own module: select), `aria-invalid="true"`.

`type=file` and `type=search` are styled bare. Date and time pickers stay native: Basalt has no design for them.

Required: end the label with `<span class="necessity" aria-hidden="true">Required</span>` and put `required` on the input. "Optional" likewise; neither shows nothing. Never an asterisk.

Hint and error in one seat: wrap them in `<div class="field-message">`; `aria-invalid="true"` on the control shows the error in the hint's place. Swap `aria-describedby` with it. Neither holds a form field.

A file field: `<span class="file-field"><input type="file"></span>`; the script draws the box, the file line and Clear.
