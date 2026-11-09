# Motion and primitives

The tokens and rules are in [foundations](foundations.md#motion); this page says what each motion
component does and why. The feel is Basalt's own. Another site's motion was measured for reference,
cited here by job, and nothing of its CSS, icons, loaders or assets is in this repository.

Measured for reference (production CSS and the designers' own posts, 6 Nov 2026):

- [grok.com](https://grok.com) and [x.ai](https://x.ai): their duration and curve sets, a tooltip and menu entry from a scale of about .95, and the idea of a dot-matrix loader. Basalt uses main's 0 / 100 / 150 / 200 / 300ms scale and its four curves, a popup scale of .98, and a loader drawn as its own SVG.
- [benji.org/morphing-icons-with-claude](https://benji.org/morphing-icons-with-claude), [family values](https://benji.org/family-values), [liveline](https://benji.org/liveline) and [honkish](https://benji.org/honkish): the ideas behind MorphIcon, TextMorph, Sparkline and the toast drain, rebuilt here. The command menu uses [cmdk](https://www.npmjs.com/package/cmdk) (MIT). Live preview before save: [the note on X](https://x.com/benjitaylor/status/2116227521645588644).

The panel's rulings on all of this, and the options it left to the owner, are review round 9: `npm run review -- 9`. The first version, round 8, was built before the panel saw it.

## Durations and curves

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0 | Hover-in colour, selection |
| `duration-fast` | 100ms | Hover-out, toggles, colour changes |
| `duration-base` | 150ms | Tooltips, menus, popovers, text morph |
| `duration-slow` | 200ms | Dialogs, accordions, the tab indicator and panel, a digit roll, the glide, a morph |
| `duration-slower` | 300ms | Sheets, a travelling spinner |

Under `prefers-reduced-motion`, `duration-base`, `duration-slow` and `duration-slower` are 100ms and nothing moves, grows or travels: state changes become short fades.

Loops are grouped apart, because they are not entries: `duration-loop-ring` 640ms, `duration-loop-braille` 530ms, `duration-loop-fade` 1200ms. A loop is never cut to 100ms, or it flickers.

| Curve | Value | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Entries, and moves that answer input: popups, the tab indicator and panel, a morph, the glide |
| `ease-in` | `cubic-bezier(.4, 0, 1, 1)` | Exits, at 0.75 of the entry |
| `ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | A rest-to-rest travel the eye follows (TravelSpinner only), and loop pulses |
| `ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Spinner turns |

## Popups, press, copy

A popup (Menu, Select, Combobox, Popover, Tooltip) enters from opacity 0 and scale .98 at the point it grew from (`--transform-origin`), with no translate, over `duration-base` on `ease-out`; it leaves at 0.75 on `ease-in`. Because it scales from its origin it grows away from the trigger on every side. The CommandMenu has no open or close animation at all, its backdrop included.

A press is a colour step: the primary fill goes to `action-primary-press`; the other variants go to the selected wash. Button and IconButton (both are `.basalt-button`) also scale to .98 on `:active` over `duration-fast` on `ease-out`, and back when released. Under `prefers-reduced-motion` the scale is 1 and the colour step stays. It never applies to a disabled or loading button, a menu item, a row, a card, a command row or the parts of a field (the NumberField steppers and the Combobox trigger keep the colour step and never scale; the council decided this 4-0), and there is no `basalt-press` utility. A Button that opens a Menu doesn't press: Base UI opens the menu on pointer-down, the trigger loses `:active`, and the menu opening is the response.

The code-block copy control swaps its Phosphor Copy icon for Check, instantly. The name changes from "Copy code" to "Copied".

## Spinners

| Variant | Use it |
|---|---|
| `ring` | The default arc, including inside a loading button. One turn in 640ms. |
| `braille` | Mono and CLI lines. Basalt's own 2 by 4 dot matrix drawn in SVG, ten frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏), one 530ms cycle, hard `step-end`. It holds its first frame under reduced motion. |

Pass `label` when the spinner is the status (`role="status"`). Omit it when a word beside it already says so. There is no blinking caret: an input keeps the native caret, which follows the system's blink rate and its setting to stop blinking.

## Components

| Piece | What it does | Reduced motion |
|---|---|---|
| `MorphIcon` | Three strokes (2.25 on the 24 grid) that morph at `slow` on `ease-out`. Only shapes Phosphor also draws: menu, close, plus, minus, check, four chevrons, four arrows, so one concept never has two drawings in a UI. Arrows, chevrons and plus/close rotate as a group. | Instant swap |
| `TextMorph` | For short action labels only ("Save" to "Saved"). Shared letters stay on their measured positions; leaving letters fade; the width eases. One polite live region reads the whole string. | The letters change, with no motion |
| Tabs and `Slide` | The underline of a horizontal tab bar moves at `slow` on `ease-out`; the panel moves 8px and fades in at the same timing, without remounting. Vertical tabs are a column of pills in a track and have no indicator to move; their panel still moves 8px down or up. | A 100ms crossfade; the underline does not move |
| `Stepper` | Back stays a left chevron. Next becomes a check on the last step. | Instant swap |
| `Sparkline` | A monochrome line and its latest value: not a charting component. A flat line breathes while loading (the one loop here), then eases into the samples. When the range changes the line, the scale and the labels move together over `slow` on `ease-out`; a new peak widens the scale at once. An empty list is a quiet sentence. | Everything snaps |
| `NumberTicker` | Rolls tabular digits on `slow`. With `glide` the digits ease through the intermediate values, rounded to the display precision, over `slow` on `ease-out`. The readable text is always the target. | Plain tabular text at the same width and baseline |
| `TravelSpinner` | Opt in. After you accept work, the spinner moves to where that work now lives, by transform on `slower` and `ease-in-out`: the one move between two resting places that the eye has to follow. | It appears at the destination with a 100ms fade |
| Toast drain | A 1px line, drawn on the straight part of the bottom rim, shrinks for the timeout. Hover, focus and a blurred window pause it with the timers. No glow. | The line is not drawn |
| `CommandMenu` | cmdk filters and selects. It loads the first time the menu opens, so an app that never opens one does not download it. No open or close animation. | No extra motion |
| `LivePreview` | The draft is shown in a panel before Save commits it. | The preview text changes in place |

`SharedElement` was withdrawn from the public API by the panel: nothing in Basalt needs an element to keep its identity across places. It remains as an internal module.

`NumberTicker` rolls tabular digits on `duration-slow`. `Text tabular` is the figures without the roll. `loading` on a button keeps the label's width and the variant colour.
