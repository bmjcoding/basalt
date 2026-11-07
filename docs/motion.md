# Motion and primitives

The vocabulary is borrowed from the feel of the X and SpaceXSI sites, not from their brand.
No xAI type, colour, shimmer, border beam, or gradient text. Measured from production CSS
on 6 Nov 2026 and folded into Basalt's own tokens.

Sources, as inspiration:

- [grok.com](https://grok.com) motion tokens: durations 120 / 180 / 200 / 260 / 320ms, and the curves standard `(.2, 0, 0, 1)`, decelerate `(0, 0, 0, 1)`, accelerate `(.3, 0, 1, 1)`, settle `(.22, 1, .36, 1)`.
- [x.ai](https://x.ai) tooltip entry (scale .96, 2px, 150ms ease-out), menu entry (scale .95, 4px), and the idea of a dot-grid loader. Basalt's grid walks in its own snake, not that site's sequence.
- [benji.org/morphing-icons-with-claude](https://benji.org/morphing-icons-with-claude), [family values](https://benji.org/family-values), [liveline](https://benji.org/liveline) and [honkish](https://benji.org/honkish). The ideas are rebuilt here. Benji Taylor is head of design at X and SpaceXSI ([x.com/benjitaylor](https://x.com/benjitaylor)). The command menu uses [cmdk](https://www.npmjs.com/package/cmdk) (MIT). Live preview before save: [the note on X](https://x.com/benjitaylor/status/2116227521645588644).

Live demos are review round 8: `npm run review -- 8`.

## Durations

Interactive motion under `prefers-reduced-motion` collapses to 90ms, and transforms are removed. Looping indicators do not collapse to 90ms, or they flicker: the ring and the three dots fade on `duration-fade`, and the braille frame and the grid hold still.

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0 | Selection, an instant tooltip |
| `duration-press` | 80ms | Press in. Release uses `ease-settle` |
| `duration-fast` | 120ms | Small colour changes |
| `duration-pop` | 150ms | Tooltip and menu entry |
| `duration-base` | 180ms | Other entries |
| `duration-slow` | 200ms | Dialogs and a digit roll |
| `duration-plate` | 260ms | A larger surface |
| `duration-slower` | 320ms | Sheets |
| `duration-frame` | 530ms | One braille cycle, `step-end` |
| `duration-spin` | 640ms | One ring turn |
| `duration-grid` | 660ms | One dot-grid cycle |
| `duration-fade` | 1200ms | Reduced-motion spinner fade |
| `duration-caret` | 1250ms | Input caret. Solid for 70%, then a short fade |

## Curves

| Token | Curve | Use |
|---|---|---|
| `ease-standard` | `cubic-bezier(.2, 0, 0, 1)` | The press in |
| `ease-decelerate` | `cubic-bezier(0, 0, 0, 1)` | Tooltips and menus arriving |
| `ease-accelerate` | `cubic-bezier(.3, 0, 1, 1)` | Those same things leaving |
| `ease-settle` | `cubic-bezier(.22, 1, .36, 1)` | The press releasing |
| `ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Spinner loops only |

`ease-out`, `ease-in`, and `ease-in-out` stay at their previous values so older transitions do not jump.

## Spinners

| Variant | Use it |
|---|---|
| `ring` | The default arc, including inside a loading button. |
| `dots` | Three marks in a tight row. |
| `grid` | A 2×3 field. Dots fade in a snake down the left column and back up the right. |
| `braille` | Mono and CLI lines. Ten frames, one 530ms cycle, hard `step-end`. |

Pass `label` when the spinner is the status (`role="status"`). Omit it when a word beside it already says so.

## Press, copy, caret

A press darkens the primary fill and scales: .94 on an icon button, .98 on a button, .99 on a menu row. Put `basalt-press` on a card or a custom row for the same .99. Reduced motion keeps the colour step and drops the scale.

The code-block copy control swaps its Phosphor Copy icon for Check, instantly. The name changes from "Copy code" to "Copied".

## Rebuilt from benji.org

These follow the posts above. None of the post source is copied. The palette and type are still Basalt's.

| Piece | What it does | Reduced motion |
|---|---|---|
| `MorphIcon` | Three strokes. Unused strokes collapse to points. Arrows, chevrons, and plus/close rotate as a group. | Instant swap |
| `TextMorph` | Shared letters stay on their measured positions. Leaving letters fade and do not keep their width; the line width eases to the new word. One polite live region reads the whole string. | The letters change, with no motion |
| Tabs and `Slide` | The new panel enters from the direction you moved. | A short fade |
| `Stepper` | Back stays a left chevron. Next becomes a check on the last step. | Instant swap |
| `SharedElement` | A `layoutId` travels from its previous place instead of appearing twice. | It is simply in the new place |
| `Chart` | A flat line breathes while loading, then eases into the samples. An empty list is a quiet sentence. The range snaps outward. | The line is already the data, or the sentence |
| `NumberTicker glide` | The visible digits ease about 8% of the way each frame. The readable text is the target. | The target, immediately |
| `TravelSpinner` | After you accept work, the spinner moves to where that work now lives. | It fades in at the destination |
| Toast drain | A hairline along the bottom shrinks for the timeout. Hover or focus pauses it. No glow. | The line does not shrink |
| `CommandMenu` | The same props as before, with cmdk doing filter and keyboard selection. cmdk loads the first time the menu opens, so an app that never opens one does not download it. | No extra motion |
| `LivePreview` | The draft is shown before Save commits it. | The preview text changes in place |

`MorphIcon` includes menu, close, plus, minus, check, play, pause, four arrows, four chevrons, equals, asterisk and external.

Text inputs blink the caret on a 1.25s cycle, opaque for the first 70%. Reduced motion and forced colours leave the caret alone.

`NumberTicker` rolls tabular digits on `duration-slow`. `Text tabular` is the figures without the roll. `loading` on a button keeps the label's width and the variant colour.
