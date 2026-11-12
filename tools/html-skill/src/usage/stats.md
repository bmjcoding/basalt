# stats

```
<div class="stats">
  <div class="stat"><span class="stat-label">Availability</span><span class="stat-value">99.97%</span><span class="stat-source"><time datetime="2026-11-10T04:41">04:41</time> <span aria-hidden="true">·</span><span class="visually-hidden">, </span> Probe</span></div>
</div>
```

`.stats` (`--min` sets the column width) > `.stat` (`.stat-label`, `.stat-value`, `.stat-note`, `.stat-source`), no panel, no border.

`.stat-source`: where the figure came from and when, tertiary, at the foot; the time is absolute in a `<time datetime>`, never "2 min ago".

A small `dl` of figures goes in `.stats.small.num`, one `<div><dt class="muted">…</dt><dd>…</dd></div>` for each.

**No row of stat tiles.** `.stats` > `.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number (put it before the form it answers).
