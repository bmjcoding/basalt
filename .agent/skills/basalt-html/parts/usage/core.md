# core: layout, type, panels, buttons

**Layout:** `.page` (`.narrow`), `.stack` and `.cluster` (`style="--gap: var(--basalt-space-3)"`), `.grid` (`--min: 220px`), `.split` (`.aside`: a 20rem sidebar), `.section` > `.section-head` (a section brings 48px of space above itself: put sections straight in `.page`, not in a gapped `.stack`), `.spacer`, `.hide-narrow`, `.divider`, `.divide-y`, `.footer`, `.tap`, `.skip-link`, `.visually-hidden`.
**Type:** `h1`–`h4`, `.display`, `.text-5xl` (56/60; give it room at 390), `.lead`, `.eyebrow`, `.muted`, `.faint`, `.small`, `.mono`, `.num`, `.prose`, inline `code`. `h2` is 24/30. `.lead` and `.prose` are 34rem on the row's start edge; `.page` is the 72rem row.
**Panels:** `.panel`, `.card`, `.panel-pad`, `.panel-head`, `.float` (+ `.modal`). `.float` is only for what leaves the flow; never to promote a panel. `.card.lg` and `.panel-pad.lg` take wider padding from 720px up.
**Buttons:** `.btn[data-variant=primary|ghost|danger]` (default secondary), `data-size=sm|lg`, `data-icon-only`, `aria-busy`.

- **Busy** is `aria-busy="true"` on the button (label in a `<span>`): the label hides and a ring sits over it, so the width holds.
- **Press:** a press is a colour step, and `.btn` also scales to .98 (100ms, ease-out) while pressed, never when disabled or busy and never under reduced motion; nothing else scales on press.
- **Links on touch:** a standalone link (a nav link, a footer link, a link on its own line) gets a 44px hit box on touch with no change to layout; a link inside running text (`p`, `li`, `.prose`, `.small`, `.hint`) stays inline. A link already 44px tall in its part (the bar, a nav row) needs nothing. Add `.tap` to a link the CSS can't tell is standalone.
- **Print:** the script prints in the light theme and goes back after; the skip link, theme toggle and copy buttons are not printed (the top bar is: static and opaque).
- **Script:** `Basalt.announce(text)` speaks to screen readers.
- **Icons:** `svg.icon` is what the script makes of an `<i data-icon>`; never write it yourself.
