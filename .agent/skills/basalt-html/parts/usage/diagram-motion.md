# diagram-motion

Added for you when a diagram's JSON says `"motion": "animated"` (with `loops`); a page that draws one from script writes `<!-- basalt:use diagram-motion -->`.

- **Entrance:** in view (two fifths of it), each line draws once in the author's order, inside five seconds; a sequence's arrows go in message order and each label lifts from secondary to primary. Every word is at rest from the first frame. It never plays under reduced motion, in forced colours, under the hold or in print, and settles at once on a hover, a focus, a key or a control.
- **Loops:** a flow line's cuts, a pulse's bead, a repeating packet. They run only in view, never while a node is traced, and stop under the page's hold. The figure's foot then has "Pause animations" (the hold's own button, built for you) after "View as list". Don't add a second one for the diagram.
- **One mover a figure:** a pulse or a packet, never both. Flow is a state of a line and never runs on a line the mover travels.
- **First visit:** `"entrance": "first-visit"` with an `id` on the figure plays the entrance once; later visits are at rest. A text sequence builds by ink instead, in view.
- **Run:** "Play the run" sends one dot through a sequence's messages; it reads "Stop the run" while it runs. It works under the hold and under reduced motion (by colour alone).
- `Basalt.diagram(figure, spec)` with a new `packet.send` value sends one message.
