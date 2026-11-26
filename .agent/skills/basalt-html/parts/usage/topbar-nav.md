# topbar-nav

The site header's links, one action and narrow menu (React's `SiteHeader`). Add them to the bar (`--usage topbar`): `.brand`, the links, `.spacer`, the loops toggle, up to two tools, the action. The bar has no theme control: the theme choice is the footer's (`--usage theme`). The script builds the rest.

```html
<nav class="topbar-links" aria-label="Primary">
  <a href="/docs" aria-current="page">Docs</a>
  <a href="/pricing">Pricing</a>
</nav>
<span class="spacer"></span>
<a class="btn topbar-action" data-variant="primary" href="/start">Get started</a>
```

- Links are plain `<a>`s with words only, five at most: they must fit at 720 beside the brand and the actions; the rest go in the footer. `aria-current="page"` marks the current one (primary ink at 600, no background). Hover is a pill that glides from link to link.
- `.topbar-action` is the bar's one primary `.btn` (a link or a button), never danger. The bar's end cluster is the loops toggle first, then up to two tools (ghost icon buttons marked `data-tool`, which stay at every width), then at most that one action.
- Under 720 the links and the action leave the bar and a Menu button takes their place. It opens a top sheet that redraws the bar (brand, the tools, Close), then, when the bar has a `data-loops-toggle` (`--usage loops`), a row with the pressed-toggle button "Pause animations" (so the hold can be reached while the menu is open), then the links, then the action at the foot. Focus lands on Close; Esc and Close return it to the Menu button; a link closes it. Write none of it: the script builds it from the bar's markup.
- `data-menu-label` and `data-close-label` on `.topbar` name the Menu button ("Menu") and Close ("Close menu"), for translation.
- Give the tools and the brand no `id`: the menu draws them again. A `data-theme-toggle` left in a bar is drawn again too, for one release (deprecated).
- An account control (one ghost `.btn` that opens a menu, named for the person): `span.topbar-account` after the action, last in the bar. Under 720 the menu draws it again as a row under the links; with no links and no action it stays in the bar. Give it no `id`.
