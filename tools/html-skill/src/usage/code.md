# code

```
<div class="code">
  <div class="code-head">…</div>
  <pre class="code-body" tabindex="0"><code>…</code></pre>
</div>
```

`tabindex="0"` goes on `pre.code-body` (it scrolls), with `<code>` inside; not on the `<code>`.

Its Copy takes `data-edge="end"`.

Tokens, only inside the `<code>`: `.tok-k` keyword, `.tok-s` string, `.tok-n` number or constant, `.tok-f` function, `.tok-c` comment.

`data-line-numbers` on `.code` numbers every line (`data-start-line="40"` starts there): tertiary, end-aligned, never copied. A block whose code is wider than its box shows "Scroll sideways to see the long lines" under it while it is; nothing to write.
