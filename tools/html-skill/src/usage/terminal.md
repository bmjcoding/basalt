# terminal

```
<figure class="code terminal" data-prompt="$" data-replay data-interval="600" data-exit-code="1">
  <figcaption>Deploy preview</figcaption>
  <pre class="code-body" tabindex="0"><code>
<span data-kind="command">npm run build</span>
<span data-kind="output">vite building for production</span>
<span data-kind="done">Built in 4.2 s</span></code></pre>
</figure>
```

A transcript of a terminal session on the code block's frame (it also needs `.code`; the script adds the gutter, the title row and the copy button). Each line is a `span[data-kind]`: `command` (primary ink, the prompt in the gutter), `output` (secondary), `done`, `warning` or `error` (a mark in the gutter; only an error's text is danger ink). No syntax colour.

- **Static by default:** a named `pre` and no live region. `tabindex="0"` goes on the `pre`. Copy copies the commands only.
- `data-replay` plays the lines back one at a time with Play, Pause, Resume and Replay; `data-interval` is the milliseconds between lines (600). The transcript is a fixed-height `role="log"` only while lines arrive. `data-exit-code` is said beside a failed result ("Failed, exit 1"); a replay that ends on an error is failed.
- `data-prompt` changes the prompt (`$`). Wire a terminal you add later with `Basalt.terminal(figure)`.
