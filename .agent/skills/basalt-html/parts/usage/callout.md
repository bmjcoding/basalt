# callout

```
<div class="callout" data-status="warning">
  <i data-icon="Warning"></i>
  <div>
    <div class="callout-title">Title</div>
    <div class="callout-body">One or two sentences.</div>
  </div>
</div>
```

`data-status` is `info`, `success`, `warning` or `danger`, and the icon is the status's: `Info`, `CheckCircle`, `Warning`, `XCircle`.

The icon, then one `<div>` holding the title and body; without it they sit side by side.

A callout there on load has no role. One that appears after load takes `role="status"` if it can wait, `role="alert"` if it needs attention now.

A fact beside the title (a presence, a badge, a time): wrap the title in `div.callout-head` with a `span.callout-meta` after it. It moves to its own line when the two do not fit. The icon stays the status's.
