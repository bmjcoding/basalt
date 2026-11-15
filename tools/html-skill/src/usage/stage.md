# stage

`.stage`: full-bleed art at the top of a page, under the site header (React's `Stage` and `PairedArt`). One per page, directly after `.topbar` and outside `.page`.

```html
<header class="topbar">…</header>
<section class="stage">
  <div class="stage-content">…the hero's words and panels…</div>
  <div class="stage-art" aria-hidden="true">
    <img class="paired-art" data-art="dark" src="night.webp" alt="" width="2400" height="1200" loading="lazy" decoding="async">
    <img class="paired-art" data-art="light" src="day.webp" alt="" width="2400" height="1200" loading="lazy" decoding="async">
  </div>
</section>
```

- `.stage-art` comes after `.stage-content`: it is behind the words by z-index, and on a slow link the words arrive before the art.

- The art is decoration: `aria-hidden` and `alt=""`; it is not drawn in forced colours and does not print. Never filter, dim, tint or blend it.
- `.paired-art` shows the picture for the page's theme, the toggle's too: write both. A `loading="lazy"` pair downloads only the one shown. `object-position` sets the crop.
- Art you draw (`svg`, `canvas`) goes straight in `.stage-art` with `--basalt-art-tone-1` to `-4`; it swaps with the theme by itself. A photograph with one version is not a stage: put it in a frame (`--usage framed-art`).
- Level 0: no rim, radius or shadow where it ends, and its height is the content's. The content starts below the headroom (`--basalt-stage-headroom`, 80px and the safe area). A panel on it is solid.
- Ink goes only where the art is quiet, nothing past `--basalt-art-quiet-limit` there. The bar stays smoked over a stage, from the top, because the skill can't run the headroom check React's bar clears on.
