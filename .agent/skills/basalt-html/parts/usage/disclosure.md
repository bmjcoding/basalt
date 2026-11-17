# disclosure

`<button class="disclosure" data-disclosure aria-expanded="false" aria-controls="id">…</button>` and the element with that `id` and `hidden`.

`<details><summary>` is styled bare.

**Show all** (the rest of a long list opens in place): `<button class="btn" data-variant="secondary" data-size="lg" data-disclosure data-reveal aria-expanded="false" aria-controls="ROOT" data-open-label="Show fewer">Show all 30</button>` inside `<div class="reveal-foot">` under the list; `ROOT` is the element that holds the list and the foot. Each hidden item is `.reveal` (a `li` in a list) holding `div.reveal-clip` holding the content. The rows grow 0fr to 1fr over `duration-slow`; nothing clips once open. A keyboard open (Enter, Space) puts focus on the first new item when the opening has ended; a pointer open leaves it on the button. For a directory's rows: `--usage link-rows`.
