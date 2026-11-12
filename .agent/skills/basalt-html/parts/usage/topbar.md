# topbar

`.topbar` > `.topbar-inner`: the site header, 56px (React's `SiteHeader`).

The page's one blurred (smoked) surface; it falls back to opaque on its own.

```html
<header class="topbar"><div class="topbar-inner">
  <a class="brand" href="/" aria-label="Orbit home">…32px lockup…</a>
  <span class="spacer"></span>
  <button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button>
</div></header>
```

- Once per page.
- `.brand` is the link home, a 44 by 44 target; a mark alone needs `aria-label`. Links and an action: `--usage topbar-nav`.
- Only primary and secondary text goes on it; no danger button.
- Don't restyle it, and don't put a second blurred layer on the page.
- `data-solid` is its opaque form.
