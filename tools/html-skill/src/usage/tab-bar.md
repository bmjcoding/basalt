# tab-bar

The phone tab bar (React's `TabBar`): an app's destinations under 720, glyph over label, fixed to the bottom. From 720 up and in print it is not shown. It is navigation: a `nav` of links, not a tablist.

```html
<nav class="tab-bar" aria-label="Primary">
  <ul class="tab-bar-list">
    <li><a class="tab-bar-item" href="/" aria-current="page"><span class="tab-bar-glyph"><span data-glyph="home" data-size="24"></span></span><span class="tab-bar-label">Home</span></a></li>
    <li><a class="tab-bar-item" href="/inbox"><span class="tab-bar-glyph"><span data-glyph="notifications" data-size="24"></span><span class="tab-bar-dot" aria-hidden="true"></span></span><span class="tab-bar-label">Inbox</span><span class="visually-hidden">, New activity</span></a></li>
    <li><button class="tab-bar-item" type="button" data-dialog-open="#more" aria-label="More"><span class="tab-bar-glyph"><span data-glyph="more-nav" data-size="24"></span></span><span class="tab-bar-label">More</span></button></li>
  </ul>
</nav>
```

- Three to five items. With more than five destinations, four links and then More (above), which opens a bottom sheet of `.nav` rows:
  `<dialog class="panel float modal sheet" id="more" data-side="bottom"><div class="tab-bar-sheet-head"><h2 class="dialog-title">More</h2><button class="btn" data-variant="ghost" data-icon-only aria-label="Close more" data-dialog-close><span data-glyph="close"></span></button></div><nav class="nav" aria-label="More">…</nav></dialog>`
- Every item has a glyph and a label, one word where it can be, both primary ink; the label is 12/16. The current page: `aria-current="page"`, its glyph selected and its label 600, no pill or bar. If it is under More, put `data-current` on the More button and say so in its `aria-label` ("More, Settings, current page").
- `.tab-bar-dot` says something is new; its words follow, visually hidden. Counts are spoken, never drawn.
- Inside `.app-shell` give the shell `data-tabbar`: its content pads past the bar and the toasts sit above it. On its own, pad your content's bottom by `calc(var(--basalt-bottom-offset) + var(--basalt-space-6))`, as the shell does (the bar, the inset and space-6: a link's 44px box at the page's end then clears the bar). compose adds `viewport-fit=cover` for the safe area.
