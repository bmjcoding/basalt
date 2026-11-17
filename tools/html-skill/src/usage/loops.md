# loops

A page that spins past five seconds, or has an ambient loop, gives a way to hold every loop (WCAG 2.2.2). `<html data-loops="held">` stops the ring, a busy button's ring and braille at their first frame, and the ambient marks at full opacity. Add a control with `data-loops-toggle`, named "Pause animations" in every form:

```html
<button class="btn" data-loops-toggle aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Pause animations</button>
<button class="btn" data-variant="ghost" data-icon-only data-loops-toggle aria-pressed="false" title="Pause animations"><span data-glyph="pause"></span></button>
```

- The first is a pressed-toggle button for a view that shows running work. The second, icon-only, is for the site header's end cluster, first in the end cluster, before any tools and the action, on a page with an ambient loop or a loop that can run past five seconds; it draws the core `pause` glyph, selected while held, and is named by its `title` alone (the browser's tooltip; no `aria-label`). A `topbar-nav` menu gets the Button form as its first row, built for you.
- It sets `aria-pressed` itself (or `checked` on a `role="switch"` checkbox: the settings row, "Pause animations" with "Moving art and spinners hold still. Your work keeps running."). Keep the name fixed; nothing is announced.
- The hold is remembered for this page's origin (`basalt-loops`) and follows its other tabs. Releasing jumps every loop to now. A stored hold applies before the first paint.
- `Basalt.loops.held()`, `.set(true)` and `.toggle()`; `document` fires `basalt:loops` (`detail.held`). While held, show when work started ("Started 3:47 PM") instead of an elapsed time, and hide a streaming count (`visibility: hidden`); write the current text on release.
