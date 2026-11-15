# segment

`.segment` (`role="group"`) of `button[aria-pressed]`, one pressed.

Clicking doesn't switch it. Your script sets `aria-pressed="true"` on the chosen button and `"false"` on the rest, and the pill follows.

The pressed label is 600, the rest 400; the script reserves the width of text and of plain elements (a `span`), and not of a button that holds a frame, media or a form. A core glyph (`data-glyph`) in a button follows the choice by itself: write nothing on it.
