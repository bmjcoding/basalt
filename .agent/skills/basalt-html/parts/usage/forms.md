# forms

`.field` (label, `.input`, `.hint`, `.error`), `.input` on `<input>`, `<textarea>` and `<select>` (a select is its own module: select), `aria-invalid="true"`.

`type=file` and `type=search` are styled bare. Date and time pickers stay native: Basalt has no design for them.

Required: end the label with `<span class="necessity" aria-hidden="true">Required</span>` and put `required` on the input. "Optional" likewise; neither shows nothing. Never an asterisk.
