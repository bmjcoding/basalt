# code

```
<div class="code">
  <div class="code-head">…</div>
  <pre class="code-body" tabindex="0"><code>…</code></pre>
</div>
```

`tabindex="0"` goes on `pre.code-body` (it scrolls), with `<code>` inside; not on the `<code>`.

Tokens, only inside the `<code>`: `.tok-k` keyword, `.tok-s` string, `.tok-n` number or constant, `.tok-f` function, `.tok-c` comment.
