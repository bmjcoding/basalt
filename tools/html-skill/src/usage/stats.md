# stats

```
<div class="stats">
  <div class="stat"><span class="stat-label">Availability</span><span class="stat-value">99.97%</span><span class="stat-note">Target 99.95%</span></div>
</div>
```

`.stats` (`--min` sets the column width) > `.stat` (`.stat-label`, `.stat-value`, `.stat-note`), no panel, no border. One lone `.stat` is fine for a headline figure.

A small `dl` of figures goes in `.stats.small.num`, one `<div><dt class="muted">…</dt><dd>…</dd></div>` for each.

**No row of stat tiles.** `.stats` > `.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number (put it before the form it answers).
