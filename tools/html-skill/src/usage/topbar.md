# topbar

`.topbar` > `.topbar-inner`: the site header, 56px (React's `SiteHeader`).

The page's one blurred (smoked) surface; it falls back to opaque on its own.

```html
<header class="topbar"><div class="topbar-inner">
  <a class="brand" href="/" aria-label="Orbit home">…32px lockup…</a>
  <span class="spacer"></span>
</div></header>
```

- Once per page.
- `.brand` is the link home, a 44 by 44 target; a mark alone needs `aria-label`. Links and an action: `--usage topbar-nav`.
- Only primary and secondary text goes on it; no danger button.
- Don't restyle it, and don't put a second blurred layer on the page.
- `data-solid` is its opaque form.
- The skip link finds the first `.topbar` or `.app-header` when it takes focus, and again on scroll, and sits 8px under its real bottom edge (a notice above the bar is cleared).
- A lockup by pixel density: a `.lockup-sprite` svg holds one `<symbol>` for each brand drawing (`brand/`'s `lockup-header-1x` and `-2x`), and `.brand` draws both with `<svg class="lockup lockup-1x" viewBox width height aria-hidden="true"><use href="#x1"/></svg>` and a `lockup-2x`. Only the one fitted to the screen shows (2x from 2dppx). No `<img>`, no `<title>`.
- A bar that arrives, or leaves and returns: put it in `<div class="site-slot">` and give it `data-phase-after="#hero"` (the first screen, the hero, its mark). It writes `data-phase` (rest, between, pinned) and `data-form` (row, bar) on the bar for your CSS; the slot keeps the row's height. It never returns on scrolling up.
- `data-tool` on up to two ghost icon buttons that stay at every width (a search trigger): the narrow menu draws them again.

`.site-footer` ends every site page, on the page, once. Wrap the page in `.site-page` (a column at least `100svh`) so a short page keeps it at the foot.

```html
<footer class="site-footer"><div class="site-footer-body">
  <div class="site-footer-top">
    <div class="site-footer-id"><a class="brand" href="/" aria-label="Orbit home">…</a><p class="site-footer-note">A plain sentence.</p></div>
    <nav class="site-footer-links" aria-label="Footer"><div class="site-footer-groups">
      <div class="site-footer-group"><h2 class="site-footer-label">Product</h2><ul><li><a href="/docs">Docs</a></li></ul></div>
    </div></nav>
  </div>
  <div class="site-footer-base"><p class="site-footer-legal">Orbit Ltd.</p>…theme choice (--usage theme)…</div>
</div></footer>
```

- Groups are labelled `h2`s in sentence case; up to six links with no label and no `.site-footer-groups` is the line form (`data-form="line"` on the footer). The legal line and the theme choice are required. One `nav`.
- The script makes each link a pill, and under 720 each group a disclosure (closed unless it holds `aria-current="page"`). Write none of it.
- The version (`.version-link`, written by `skill-body.mjs`'s `versionLink`) follows the legal line: wrap both in `div.site-footer-legal-row`, the label the product ("Basalt 0.2.0 · Nov 23, 2026"). Nothing marks a release as new.
