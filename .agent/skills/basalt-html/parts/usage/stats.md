# stats

```
<div class="stats">
  <div class="stat">
    <span class="stat-label">Availability</span>
    <span class="stat-value">99.97%</span>
    <span class="stat-note">Target 99.95%</span>
    <span class="stat-source"><time datetime="2026-11-10T04:41">4:41&#160;AM</time><span class="dot-sep" data-spaced><span class="visually-hidden">, </span></span>Probe</span>
  </div>
</div>
```

`.stats` (`--min` sets the column width) > `.stat` (`.stat-label`, `.stat-value`, `.stat-note`, `.stat-source`), no panel, no border.

Put each part of a `.stat` on its own line: the layout draws no space, and a text scan reads "Availability 99.97% Target 99.95%", not "Availability99.97%Target 99.95%".

`.stat-source`: where the figure came from and when, tertiary, at the foot; the time is absolute in a `<time datetime>`, in the locale's hour, never "2 min ago". The dot is `.dot-sep` (`--usage core`): "4:41 AM, Probe" to a screen reader.

**A stat that links:** the whole cell is the target. Wrap the figure in `a.stat-link` inside `.stat-value`, named by the label and the figure: `<span class="stat-label"><span id="t-l">Tide height</span></span>` … `<span class="stat-value"><a class="stat-link" href="/tides" aria-labelledby="t-l t-f" aria-describedby="t-n"><span id="t-f">2.4 m</span></a></span>` … `<span class="stat-note" id="t-n">`. The script adds the arrow. With `target="_blank"` the new-tab words' id goes last in `aria-labelledby` (the script does it): "Tide height 2.4 m (opens in a new tab)". Nothing in the note or the source acts.

**Not observed:** `<span class="stat-value" data-missing>Not observed</span>` (or the app's words, "No reading yet"): never a dash, a blank or a zero.

**A hint:** after the label's words, `<button class="stat-hint" popovertarget="t-h" aria-label="About tide height"><i data-icon="Info"></i></button>`, then the `popover` module's panel (`.popover-title` the label).

A small `dl` of figures goes in `.stats.small.num`, one `<div><dt class="muted">…</dt><dd>…</dd></div>` for each.

**No row of stat tiles.** `.stats` > `.stat`: up to 3 figures that matter, on the page, never boxed; one headline figure when the page answers one number (put it before the form it answers).
