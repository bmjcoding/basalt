# app-shell

An app's frame (React's `AppShell` and `AppHeader`): a sidebar at 1024 and up, the rail from 720 to 1023, the phone tab bar under 720, and one header over the content column. The document scrolls; the sidebar is sticky.

```html
<div class="app-shell" data-tabbar>
  <aside class="app-sidebar">
    <div class="app-brand"><a class="brand" href="/" aria-label="Workbench home"><span class="brand-full">…lockup…</span><span class="brand-rail">…mark…</span></a></div>
    <div class="app-nav"><nav class="nav" aria-label="Primary">…</nav></div>
    <div class="app-account"><nav class="nav" aria-label="Account">…</nav></div>
  </aside>
  <div class="app-column">
    <header class="app-header"><div class="app-bar"><h1 class="app-title">Overview</h1><span class="spacer"></span>
      <div class="app-actions"><button class="btn" data-variant="ghost" data-icon-only data-theme-menu popovertarget="theme-menu" aria-label="Theme: System"></button><a class="btn" data-variant="primary" href="/new">New</a></div></div></header>
    <main class="app-main" id="main">…</main>
  </div>
  <nav class="tab-bar" aria-label="Primary">…</nav>
</div>
```

- The `.nav`s (`--usage nav`) are the sidebar, and the rail from 720 to 1023: the script collapses them and gives each item a tooltip. Every item needs a glyph. Under 720 the sidebar is gone: add a `.tab-bar` (`--usage tab-bar`) and `data-tabbar` on the shell.
- `.app-header` is the page's one smoked surface (`--usage topbar`): a solid page has `data-solid` on it. The title is the page's `h1`, 18/26 at 600. Actions: ghost icon buttons and at most one primary `.btn`, which stays in the bar under 720 with its words (keep them short; the title is cut first). Facts under the title: wrap the `h1` and a `<p class="app-facts">` (short facts joined by `.dot-sep`, e.g. a reference, a plain status badge, a time) in a `div.app-heading`. The theme control is the icon button and menu of `--usage theme` (write its `.menu` beside the header).
- `.brand-full` is the lockup, `.brand-rail` the mark alone (the rail shows it). The sidebar's brand band draws no line.
- Don't use `.page` inside `.app-main`; it is already the page's width with the gutter. The shell needs `viewport-fit=cover` for the phone's safe areas: compose adds it.
- `data-capped` on the shell holds it to the sidebar plus 72rem, centred; the page then fills its column. A page with a pane beside it: `--usage pane`.
- The version this session runs: a `.version-link` in `div.app-version`, last in `.app-account`; the rail shows the number alone and the script gives it the whole line as a tooltip. No "What's new" item.
