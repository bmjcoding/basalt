# topbar-nav

The site header's links, one action and narrow menu (React's `SiteHeader`). Add them to the bar (`--usage topbar`): `.brand`, the links, `.spacer`, the theme toggle, the action. The script builds the rest.

```html
<nav class="topbar-links" aria-label="Primary">
  <a href="/docs" aria-current="page">Docs</a>
  <a href="/pricing">Pricing</a>
</nav>
<span class="spacer"></span>
<button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button>
<a class="btn topbar-action" data-variant="primary" href="/start">Get started</a>
```

- Links are plain `<a>`s with words only, five at most: they must fit at 720 beside the brand and the actions; the rest go in the footer. `aria-current="page"` marks the current one (primary ink at 600, no background). Hover is a pill that glides from link to link.
- `.topbar-action` is the bar's one primary `.btn` (a link or a button), never danger. The bar ends with the theme toggle and at most that one action.
- Under 720 the links and the action leave the bar and a Menu button takes their place. It opens a top sheet that redraws the bar (brand, theme toggle, Close), then the links, then the action at the foot. Focus lands on Close; Esc and Close return it to the Menu button; a link closes it. Write none of it: the script builds it from the bar's markup.
- `data-menu-label` and `data-close-label` on `.topbar` name the Menu button ("Menu") and Close ("Close menu"), for translation.
- Give the theme toggle and the brand no `id`: the menu draws them again.
