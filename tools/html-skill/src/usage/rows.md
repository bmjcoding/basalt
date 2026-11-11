# rows

`.rows` > `.row` (`data-active`, `data-danger`, `.row-label`, `.row-hint`), `.row-group`, `.input-row` (search band, first child of a panel).

`data-active` is the lit row's filled background, never a bar.

**A profile list (the long form of social links):** add `profile-links` to `.rows`, one `a.row` per service with its glyph, `.row-label` for the name and `.row-hint` for the handle. A row for a service without a mark has no glyph and keeps the glyph's seat, so every name starts at one x: never add an empty element for it.
