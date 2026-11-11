# status

`.status` (a dot or ring, then the word) and `.badge` (the same in a small outlined box); both are React's Badge. `data-status` is `neutral`, `success`, `warning`, `danger`, `accent` or `pending`, and each draws its mark before the word.

- **No `data-status`** is the word alone (a count, a fact). `neutral` is asked for by name (Idle, Draft) and draws the tertiary dot.
- The word keeps its ink in every status; only the dot carries colour (`accent` takes `data-accent="cobalt"` set on `<html>` or a section, else ink). `pending` is a hollow ring in the word's ink.
- **Running:** `<span class="status"><braille-spinner></braille-spinner>Running</span>`: the braille cell takes the dot's seat, so no `data-status`.
- A badge labels one object's status or count, always with a word; never decoration.
- In forced colours every dot is a disc in the system text colour, and the same on a lit row.
