# ambient

A page's one ambient loop, in its art: `<span class="ambient-mark" data-ambient style="left: 40px; top: 12px"></span>` inside `.stage-art` or a frame (`.framed-frame`). Opacity only, from 1 to 0.2 and back.

- One loop a page, in art only: never on text, a control, a chart or anything that carries information. A page that has one shows the icon `data-loops-toggle` in its bar (`--usage loops`).
- The script gives each mark its own period (0.6 to 1.4 times 6s) and phase, in document order; only the first 24 loop. A mark is `--basalt-size-dot` wide at most. Position it with `left` and `top` in its art.
- It holds at full opacity under `data-loops="held"`, and is still under reduced motion, in forced colours and in print.
