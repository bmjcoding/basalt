# forms

`.field` (label, `.input`, `.hint`, `.error`), `.input` on `<input>`, `<textarea>` and `<select>` (a select is its own module: select), `aria-invalid="true"`.

`type=file` and `type=search` are styled bare. Date and time pickers stay native: Basalt has no design for them.

Required: end the label with `<span class="necessity" aria-hidden="true">Required</span>` and put `required` on the input. "Optional" likewise; neither shows nothing. Never an asterisk.

Two fields from unlike forms (an account, an order), each hint and error linked by `aria-describedby`:

```html
<div class="field"><label for="email">Email<span class="necessity" aria-hidden="true">Required</span></label>
  <input class="input" id="email" type="email" required aria-describedby="email-hint"><span class="hint" id="email-hint">Sign-in links go here.</span></div>
<div class="field"><label for="qty">Quantity</label>
  <input class="input" id="qty" inputmode="numeric" aria-invalid="true" aria-describedby="qty-error"><span class="error" id="qty-error">Order at least one.</span></div>
```
