# glyph

`<span data-glyph="home" data-size="24"></span>`: one of Basalt's own glyphs (the core set, not Phosphor), drawn from its name at 16 (the default), 20 or 24.

- The names: `home`, `search`, `notifications`, `messages`, `profile`, `settings`, `more-nav`, `calendar`, `trends`, `plan`, `sources`, `history`, `runs`, `sandboxes`, `routes`, `policy`, `records` (navigation), and `menu`, `close`, `plus`, `minus`, `check`, `more`, `copy`, `edit`, `trash`, `download`, `external`, `play`, `pause`, the arrows and the chevrons (actions).
- Inside an element with `aria-current` (or `data-current`), or with `data-selected` on the glyph, it is drawn selected: its opening closed, filled. Write it once; the page sets which link is current.
- Decorative: it is `aria-hidden`, so the link or button beside it carries the name.
- Never draw one by hand, and write the name exactly; an unknown name warns and draws nothing.
