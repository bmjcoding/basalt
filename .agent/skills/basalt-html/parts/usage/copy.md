# copy

`<button class="btn" data-copy="#code-id">` or `data-copy-text="…"`; keep an icon and a `<span>` label inside.

`Basalt.copyText(text)` copies from script. Copy buttons are not printed.

**With words** (a copy button that reads "Copy address", then "Copied"): `<button class="btn" data-copy-text="…" data-copy-words="Copied"><span>Copy address</span></button>`, no icon. Both wordings stand in one cell, so the width never changes; "Copied" shows 1500ms and only after the write succeeded; a refused clipboard leaves it as it was. `data-copy-status="Address copied"` is what a screen reader hears (default "Copied to clipboard").
