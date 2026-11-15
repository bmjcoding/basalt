# segment

`.segment` (`role="group"`) of `button[aria-pressed]`, one pressed.

Clicking doesn't switch it. Your script sets `aria-pressed="true"` on the chosen button and `"false"` on the rest, and the pill follows.

The pressed label is 600, the rest 400; the script reserves the width, so keep a button to text (a glyph alone: `data-selected` on the pressed one's).
