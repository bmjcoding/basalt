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
| `duration-base` | 150ms | Tooltips, menus, popovers, text morph, the hover glide (popup rows and navigation) |
| `duration-slow` | 200ms | Dialogs, accordions, the tab indicator and panel, the segmented and vertical-tab pill, a digit roll, a value glide (`useGlide`), a morph |
| `duration-slower` | 300ms | Sheets, a travelling spinner |

Under `prefers-reduced-motion`, `duration-base`, `duration-slow` and `duration-slower` are 100ms and nothing moves, grows or travels: state changes become short fades.

Loops are grouped apart, because they are not entries: `duration-loop-ring` 640ms, `duration-loop-braille` 800ms, `duration-loop-fade` 1200ms. A loop is never cut to 100ms, or it flickers.

| Curve | Value | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Entries, and moves that answer input: popups, the tab indicator and panel, the sliding pill, the hover glide, a morph, a value glide |
| `ease-in` | `cubic-bezier(.4, 0, 1, 1)` | Exits, at 0.75 of the entry |
| `ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | A rest-to-rest travel the eye follows (TravelSpinner only), and loop pulses |
| `ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Spinner turns |

## Popups, press, copy

A popup (Menu, Select, Combobox, Popover, Tooltip) enters from opacity 0 and scale .98 at the point it grew from (`--transform-origin`), with no translate, over `duration-base` on `ease-out`; it leaves at 0.75 on `ease-in`. Because it scales from its origin it grows away from the trigger on every side. The CommandMenu has no open or close animation at all, its backdrop included.

A press is a colour step: the primary fill goes to `action-primary-press`; the other variants go to the selected wash. Button and IconButton (both are `.basalt-button`) also scale to .98 on `:active` over `duration-fast` on `ease-out`, and back when released. Under `prefers-reduced-motion` the scale is 1 and the colour step stays. It never applies to a disabled or loading button, a menu item, a row, a card, a command row or the parts of a field (the NumberField steppers and the Combobox trigger keep the colour step and never scale; the council decided this 4-0), and there is no `basalt-press` utility. A Button that opens a Menu doesn't press: Base UI opens the menu on pointer-down, the trigger loses `:active`, and the menu opening is the response.

The code-block copy control swaps its Phosphor Copy icon for Check, instantly. The name changes from "Copy code" to "Copied".

## Chips and sort indicators

A multi-select chip (`MultiSelect`) shows a plus when off and the check when on in one 16px seat. The two glyphs are stacked and swap by opacity over `duration-fast` on `ease-out` (a crossfade, not a `MorphIcon` morph: plus to check is not one of the allowed morphs); under reduced motion they change at once. A chip's colour changes ease over `duration-fast` too, hover-in is instant, and a press is a colour step with no scale.

A pressed toggle Button (`aria-pressed`; secondary and ghost) swaps its check the same way: the seat's glyph fades over `duration-fast` on `ease-out`, and the fill and ink step with it. It is a crossfade, not a `MorphIcon` morph, and the 100ms fade stays under reduced motion; the .98 press stays Button's momentary press (none under reduced motion). A choice card crossfades its fill, its hover wash and its box over `duration-fast` too, the same 100ms under reduced motion, and never scales.

The sort indicator of a sortable table header (the caret and the two arrows) swaps at once: it has no transition, and nothing in a still table moves.

## The sliding pill

`SegmentedControl` and a vertical `TabsList` each hold one pill element. When a segment or tab becomes chosen, the pill travels to it by `transform` and size (`width`, and `height` for the vertical list) on `duration-slow` and `ease-out`, whatever the distance. The move is a CSS transition, not a keyframe animation: a second change 60ms in turns the pill from where it has reached, without a queue or a snap back. The chosen label's ink changes at the press, over `duration-fast`, and does not wait for the pill.

The component measures the chosen item into four CSS variables on the control, and nothing else: no animation frame is ever in React state. It re-measures when the control or the item resizes, when fonts finish loading, and when the screen turns; those re-placements are not moves. Its observers are removed with the control.

The pill is an enhancement over each item painting its own pill, which is how the control looks with no script. The shared pill is drawn only once JS has measured the chosen item, and never under reduced motion or in forced colours. Under reduced motion each item paints its own pill and fades it over 100ms. In forced colours the chosen item is `Highlight` with `HighlightText` and no backplate box. Touch targets stay at least 44px, and a tap slides the pill too. A control where several items can be on has no single pill to move, and does not slide.

## The hover glide

Menu, Select, Combobox and CommandMenu draw one plate per popup, and navigation draws one pill per list, which follows the pointer between rows on `duration-base` and `ease-out`, whatever the distance. Each row's own plate is the fallback and stays correct with no script. Base UI's `data-highlighted` (and cmdk's `data-selected`) stays the authority for which row is active; the glide only paints it, and an input-modality check decides whether the plate travels (pointer) or snaps (keyboard).

| Moment | What the plate does |
|---|---|
| The pointer enters a row from outside | Appears in that row, in place, at once |
| The pointer moves to another row | Travels on `duration-base`, `ease-out`, constant |
| The pointer leaves while a move is in progress | Freezes where it is, then fades in place over `duration-fast` on `ease-in` |
| The pointer reaches a row during that fade (the grace) | Travels from where it is and returns to full opacity |
| The pointer reaches a row after the fade | Appears in place |
| An arrow key, Home or End | Moves at once, with no travel: in a popup the plate is the keyboard position |
| The pointer leaves the command menu | Nothing: cmdk keeps its selected row, so the plate stays |

The plate is off on touch (`(hover: none)`, a coarse pointer, or a touch `pointerType`), where the row under the finger shows its own plate on press; under reduced motion, where each row lights on its own, in at once and out with a 100ms fade, with no travel; and in forced colours, where each row is `Highlight` with `HighlightText`. It is pointer-inert and hidden from assistive technology. As with the pill, the plate position is CSS variables written from the DOM and the browser eases them, so there is no render per frame.

**In navigation** (`Nav`) the same plumbing (`plate.tsx`) marks the item under the pointer `data-hovered` (an attribute, not state) and the pill hugs that item's own pill, not its row, changing width as it goes: a 48px round pill at the selected wash, or the 48px circle in the rail. The rows are the same table with two differences. The first key hides the glide at once (not faded) and the focus ring shows, the control ring at +2 around the hugging pill; the pointer resting on an item hides its hover too while the keyboard is in use, and the next pointer move brings the glide back in place. The pill never touches the column's width. Off on touch, under reduced motion and in forced colours, where the hovered item is `Highlight` with `HighlightText` with no backplate; each item paints its own pill, in at once and out over `duration-fast`, and with no script that is the whole story.

<<<<<<< HEAD
## The meter's glide and the live transcript

The `Meter`'s fill glides over `duration-slow` on `ease-out` when its value changes (a CSS transition on the fill's width, so a second change turns from where it has reached). Under reduced motion it jumps. The slot, the target tick and every word hold still: the fill is the only thing a new value moves, and over the cap it stops at the slot's end. A stat's source line, a description list and the stat's figures have no motion.

A live `Terminal` (decision 94) is `role="log"` only while lines arrive, never while idle, paused or finished. A line appears when it arrives: it has no entry animation, so reduced motion changes nothing. The log has a fixed height that scrolls inside, so arriving lines never move the page, and it follows the end only while the reader is at it; scrolling up stops it, and scrolling back to the end resumes it. Pressing Play or Replay makes the region a `log` first and shows the first line one frame later (so a screen reader hears it), so a replay's box is never blank for an interval. A replay has a pause control (WCAG 2.2.2), and every word that changes in place in the head ("Not started", "Running", "Paused", "Done", "Failed, exit 1"; "Play", "Pause", "Resume", "Replay"; "Copy commands", "Copied") stands in one cell with the others hidden, so the head never moves. Braille beside "Running" holds its first frame under reduced motion.
=======
## The narrow menu

The site header's menu under 720 is `Sheet side="top"` (decision 96). It does not slide: the bar's own band, redrawn in the sheet's first
row, is there at once, and the list unrolls beneath it from the band's edge. The unroll is a `clip-path` transition, not a transform, so
nothing moves that was already on screen (the brand, the toggle and Close stay where the bar had them).

| Moment | What moves |
|---|---|
| Open | The sheet's clip opens from the band's bottom edge to the sheet's full height over `duration-slower` on `ease-out`, while the scrim fades in. |
| The Menu button | The glyph morphs to Close over `duration-slow` (the drawn pair, `MorphIcon`); it morphs back as the menu leaves. |
| Close (Escape, the scrim, Close, a link) | The clip closes back to the band at 0.75 of the entry on `ease-in`, the scrim fading with it; focus goes back to Menu. |
| Reduced motion | Opacity only, over 100ms: no clip, no morph (the glyph swaps at once). |

The scrim is unblurred and the sheet is solid: the bar under it stays the one filtered surface, and nothing translucent stacks on it.

## The phone tab bar

A press or hover is a colour step on a 32px circle behind the glyph (`duration-fast`, in at once); the first key hides it. Nothing in the
tab bar moves, resizes or glides, and no cell scales. The bar has no shared pill, because it exists only under 720, where the glide is
off on touch anyway.
>>>>>>> origin/main

## Spinners

| Variant | Use it |
|---|---|
| `ring` | A wait: the default arc, in a loading button, the command menu's loading slot, and wherever a spinner stands without a visible word. One turn in 640ms. Under reduced motion it fades on `duration-loop-fade`. |
| `braille` | A status: work that runs beside a word that says so, in a table, a list row, a toast or a log line. Never in a button, never without its word. Basalt's own six-dot cell drawn in SVG, 6 by 10 with 2px dots on whole pixels (9 by 15 at size 20, 12 by 20 at 24), ten frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏), one 800ms cycle (80ms a frame), hard `step-end`; unlit dots are not drawn. It takes the status dot's place and gap, in its word's colour. It holds its first frame under reduced motion. |

Spinners on a page share one clock: each animation starts at the document timeline's origin, so spinners mounted at different moments tick in phase, each variant on its own period.

**The hold.** `<html data-loops="held">` (set by `useLoops()`) stops every Basalt loop, portals included: braille stays on ⠋ and the ring stands still at its drawing, at full opacity; a busy Button's ring, Sparkline's loading line and Skeleton's pulse stop with them, and the indeterminate Progress bar holds as the empty track, its indicator hidden (a still bar reads as a value). Nothing is hidden, swapped or announced. It outranks reduced motion by specificity, so held is one look whatever the OS says and the ring's fade stops too; reduced motion never turns it on. The state is stored for this app's origin in this browser (`basalt-loops`, `localStorage`) and follows across the app's tabs. Releasing jumps to now: every Basalt loop's `startTime` goes back to the timeline's origin, so spinners mounted at different moments tick in phase, and nothing resumes from the held frame. The toast's drain is a countdown, not a loop, so the hold does not stop it. An app reads `held` for its own rewriting text (an elapsed time shows when the work started; a streaming count hides). This is the WCAG 2.2.2 mechanism; the control (a pressed-toggle Button in the view's head, a settings row with a Switch, a command) is the app's part. See [foundations](foundations.md#motion).

Beside a word, braille's size follows the word's cap height (16 beside 12 to 16px text, 20 beside 18 to 24px, 24 beside 30px and up), the seat is the cell's width and the gap equals it (6, 9 and 12px), so words start at 12, 18 and 24.

Pass `label` when the spinner is the status (`role="status"`). Omit it when a word beside it already says so. There is no blinking caret: an input keeps the native caret, which follows the system's blink rate and its setting to stop blinking.

## Components

| Piece | What it does | Reduced motion |
|---|---|---|
| `MorphIcon` | A core glyph (`glyph={CloseGlyph}`, any glyph by reference, so an app bundles only the ones it imports) that morphs at `slow` on `ease-out`, and only where the council allowed: rest and selected, a rotation group (four arrows, four chevrons, plus and close), and the drawn pairs menu/close, play/pause, copy/check and chevron-down/download, both ways. Every other change swaps at once. A morph in flight keeps its identity: asking for its target does nothing, asking for where it came from runs it back, asking for another member of its group turns on. The stroke is 2.25 on the 24 grid. | Instant swap |
| `TextMorph` | For short action labels only ("Save" to "Saved"). Shared letters stay on their measured positions; leaving letters fade; the width eases. One polite live region reads the whole string. | The letters change, with no motion |
| Tabs and `Slide` | The underline of a horizontal tab bar moves at `slow` on `ease-out`; the panel moves 8px and fades in at the same timing, without remounting. Vertical tabs are a column of pills in a track: the chosen tab's pill slides as the segmented control's does (see below), and their panel moves 8px down or up. | A 100ms crossfade; the underline does not move; each tab shows its own pill |
| `SegmentedControl` | One pill per control slides to the chosen segment at `slow` on `ease-out`. | Each segment shows its own pill, fading over 100ms |
| `Stepper` | Back stays a left chevron. Next becomes a check on the last step. | Instant swap |
| `Sparkline` | A monochrome line and its latest value: not a charting component. A flat line breathes while loading (the one loop here, held by `data-loops="held"`), then eases into the samples. When the range changes the line, the scale and the labels move together over `slow` on `ease-out`; a new peak widens the scale at once. An empty list is a quiet sentence. | Everything snaps |
| `NumberTicker` | Rolls tabular digits on `slow`. With `glide` the digits ease through the intermediate values, rounded to the display precision, over `slow` on `ease-out`. The readable text is always the target. | Plain tabular text at the same width and baseline |
| `TravelSpinner` | Opt in. After you accept work, the spinner moves to where that work now lives, by transform on `slower` and `ease-in-out`: the one move between two resting places that the eye has to follow. | It appears at the destination with a 100ms fade |
| Narrow menu (`SiteHeader`) | `Sheet side="top"`: the band is there at once and the list unrolls beneath it as a clip over `slower` on `ease-out`; leaves at 0.75 on `ease-in`; Menu morphs to Close over `slow`. | Opacity only, 100ms |
| Toast | Enters on `duration-slow` and `ease-out`, leaves at 0.75 on `ease-in`. Running work shows braille in the mark seat and updates the same toast in place to its result: the title never moves, because the seat is kept. Swipe is Base UI's 40px, by distance alone, with no spring. | Opacity only, at the resting offsets |
| Toast drain | A countdown, not a loop, so the hold does not stop it. A 1px line, drawn on the straight part of the bottom rim, shrinks for the timeout (only a toast that is not the only copy of what it says has one). Hover, focus, a blurred window and a hidden tab pause it and the toast's own clock together. No glow. | The line is not drawn |
| `CommandMenu` | cmdk filters and selects. It loads the first time the menu opens, so an app that never opens one does not download it. No open or close animation. | No extra motion |
| `LivePreview` | The draft is shown in a panel before Save commits it. | The preview text changes in place |

`SharedElement` was withdrawn from the public API by the panel: nothing in Basalt needs an element to keep its identity across places. It remains as an internal module.

`NumberTicker` rolls tabular digits on `duration-slow`. `Text tabular` is the figures without the roll. `loading` on a button keeps the label's width and the variant colour.
