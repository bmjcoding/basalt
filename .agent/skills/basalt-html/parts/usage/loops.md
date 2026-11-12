# loops

A page that spins for more than five seconds gives a way to hold every loop (WCAG 2.2.2). `<html data-loops="held">` stops the ring, a busy button's ring and braille (a status's, a toast's, the terminal's), at their first frame. Add a control with `data-loops-toggle`:

```html
<button class="btn" data-loops-toggle aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Pause animations</button>
```

- It sets `aria-pressed` itself (or `checked` on a `role="switch"` checkbox: the same words as a settings row, "Pause animations" with "Spinners hold still and timers show when work started. Your work keeps running."). Keep the name fixed; nothing is announced.
- The hold is remembered for this page's origin in this browser (`basalt-loops`) and follows its other tabs. Releasing jumps every loop to now. A stored hold is applied before the first paint, so its controls don't fade in.
- `Basalt.loops.held()`, `.set(true)` and `.toggle()`; `document` fires `basalt:loops` (`detail.held`). While held, show when work started ("Started 3:47 PM") instead of an elapsed time, and hide a streaming count (`visibility: hidden` keeps its space); write the current text on release. A result lands as usual.
