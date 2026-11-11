# tooltip

`<button class="btn" data-variant="ghost" data-icon-only aria-label="Save" data-tooltip="Save">`. Hover shows it after a wait, keyboard focus at once; Esc, leaving or pressing dismisses it. Not on touch.

- It supplements a name; the control keeps its own `aria-label` or text.
- `data-tooltip-side="bottom|left|right"` (default top). `data-tooltip-keys="⌘ S"` draws a real shortcut the page binds, as chips.
- Plain text only. It is the deepest surface (level 3).
