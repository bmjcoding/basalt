# Basalt foundations

The decisions under every Basalt component, and why each was made. The values live in
`packages/tokens/tokens/*.tokens.json`; this page explains them. Change a value there,
and change the reason here.

Basalt is one system for every SRA Syndicate product: Blacksand, srasyndicate.io,
baileymjones.com, N1 and what comes after. It's monochrome. A product adds colour through one
of Basalt's accent classes, in its named roles, and nowhere else.

## Principles

- **Meet WCAG 2.2 AA by construction.** Every text, boundary and focus pair is tested on
  every surface it can appear on (`packages/tokens/test/contrast.test.mjs`). A token change
  that breaks a pair fails the build.
- **The page is the darkest layer, in both themes.** Anything closer to you is lighter.
  Light mode never puts a full white page in front of you.
- **Borders build structure; shadows exist only for things that float.**
- **Panels have one rim:** a 1px edge in two solid colours, at most 8% white on top and 6%
  on the other sides in dark, uniform in light. No gradient along or across an edge, no inner
  glow or sheen, no blur, no animation, no outer frame, no light falloff on the page. Never
  on controls or chips. One panel draws its rim in a colour: a status callout, in its status colour at 45%, still one
  solid colour on every side (see [Callouts](#lines-states-and-actions)); every other panel, a toast included, keeps the
  neutral rim. Under more contrast every side is the input boundary's value, one solid colour (see [More contrast](#more-contrast)). See [Elevation](#elevation).
- **No ornament that signals "generated":** no gradient borders, no glow, no bounce, and no
  scale on press beyond the .98 of Button and IconButton. Colour never carries meaning alone.
- **Default words follow the owner's rules for words.** A string a component ships (a label, a status, an empty state, an announcement, a key hint) is written in US English, in
  sentence case, as a plain fact with no slogan, and a status names the step it is in. `.agent/skills/site-words/SKILL.md` has the rules and how a rewrite is approved. A word that
  belongs to one product's rhythm or subject (such as a week, a check-in or a run) is not a default: the product sets it.
- **One smoked surface.** The only translucent, blurred surface is an app's sticky header
  bar ([Chrome](#chrome-the-smoked-header)). Every dialog, sheet, menu, popover, toast and the
  command menu is solid. Use the class once per viewport; translucent layers never stack. Over art
  at the top of a site's page the same bar may be clear, with no fill and no blur
  ([The clear bar](#the-clear-bar-over-art)).
- **Native is first-class.** Tokens are platform-neutral and generate CSS, TypeScript and
  Swift (Kotlin when an Android app needs it). Components are native per platform; tokens, icons and type are shared.

## Colour

All colours are OKLCH and inside sRGB, so every display shows the same colour. The neutrals
are achromatic (no tint) and named by HSL lightness: `neutral-4` is `#0a0a0a`.

### Surfaces

Depth is four levels, `surface-0` to `surface-3`. A role token is one of them, so naming the
levels changed no pixel.

| Level | Dark | Light | Roles that use it |
|---|---|---|---|
| `surface-0` | `#000` | `#fafafa` | `surface-page`: the page, and app sidebars |
| `surface-1` | `#0a0a0a` | `#fff` | `surface-raised`: a panel on the page (cards, tables, code blocks); inputs and secondary buttons; a menu, select or popover opened from the page or a sidebar; a dialog, sheet or command menu (a modal resets to level 1); and a toast (always level 1) |
| `surface-2` | `#111111` | `#fff` | `surface-overlay`: a panel in a panel, a popup opened from a card or a modal (a menu from a table row, or from a dialog), the command menu's input band, a modal's inner panels |
| `surface-3` | `#171717` | `#fff` | `surface-top`: the deepest panel, a popup opened from a level-2 panel (the cap), tooltips; under the selected pill in a segmented control and in vertical tabs (dark adds the selected wash) |

| Role | Dark | Light | Use |
|---|---|---|---|
| `surface-sunken` | `#0a0a0a` | `#f5f5f5` | Wells and code blocks on the page |
| `surface-well-2`, `surface-well-3` | `#111111`, `#171717` | `#f5f5f5` | A well one or two levels deeper (see below) |
| `surface-sunken-strong` | `#111111` | `#f0f0f0` | Table headers, segmented-control tracks (bands, not boxes) |
| `surface-chrome` | `#000` at 92.5% | `#fafafa` at 96% | The fill of a sticky header bar, the page colour with alpha. The only translucent surface; see [Chrome](#chrome-the-smoked-header) |

Dark steps up from true black in small increments, as Linear does. Nothing above the page
is pure black, so large moving surfaces never smear on OLED (pixels at `#000` switch fully
off and lag when they turn back on). Light sits the page just below white, as Vercel does,
so white cards lift without a shadow.

**Depth is by level, and the level is not a prop.** It is a private context, rendered as
`data-level`, that crosses portals as the modal depth does:

- an in-flow panel (Card, TableContainer, CodeBlock, Callout, the preview card) is its parent's
  level plus one, with level 3 the cap;
- a non-modal popup (Menu, Select, Combobox, Popover) is its opener's level plus one, with a
  floor of 1 and a cap of 3. A menu opened from the page or a sidebar is level 1 (`#0a0a0a`, 1.06:1
  on the page, its rim 1.19:1 on the page); from a card, a table row or a modal, level 2
  (`#111111`); from a level-2 panel, level 3 (`#171717`). The floor is 1 in both themes: in light,
  levels 1 to 3 are one white, so it changes no pixel there;
- a modal (Dialog, AlertDialog, Sheet, CommandMenu) resets to level 1 above its scrim, so what it
  holds starts at 2: a card, a code block or a menu opened inside a dialog is `#111111`. The modal
  depth that stacks z-index is a separate context and is unchanged;
- a Tooltip is 3. A Toast is 1, whatever it was shown from: it is portalled and does not sense what is under it, and
  its rim and `shadow-overlay` separate it from a menu or a dialog of the same level. Over a level-2 menu it is a step
  darker than what it covers, which is rare and which the rim answers. In light nothing changes, because levels 1 to 3
  are one white (the owner, 9 Nov 2026: "Near-black, like menus", overruling the council's no-majority default of level 3,
  which was the grey he had objected to before).

A grey menu on the black page was the complaint that moved the floor from 2 to 1 (the owner, 9 Nov
2026, with the council: 4–0 on `#0a0a0a`, 3–1 on opener plus one). The page is `#000` and the rim carries
the edge, so a level-1 popup is near black without being OLED-smeared.

In light, levels 1 to 3 are one white. Nesting shows by the rim (and a shadow when the panel
floats), never by a darker fill: a darker panel on a lighter one would read as sunken, the
opposite of raised. Wells follow the same rule in dark (a code block in a card is level 2,
`#111111`; in a dialog, which is level 1, a code block is level 2 as well) and stay `#f5f5f5` in light. Inputs keep their fill and their 3:1
border at every level.

**The nesting guard.** Most grouping is not a panel:

1. Group with space or a divider first.
2. A panel is for a distinct object: a code block, a table, a preview, a callout.
3. Go at most one panel deeper inside any in-flow panel (a card holding a preview that holds a
   code block is three rimmed boxes whose fills step about 1.05:1 each: nested boxes).
4. Level 3 is the cap; beyond it, use a divider.
5. Bands (the command menu's input row, a table header, a settings row) are not boxes.
6. Floating surfaces are a layer, not nesting: they follow the popup and modal rules above.

### Text

| Role | Dark | Light | Worst case on any surface |
|---|---|---|---|
| `text-primary` | `#f4f4f4` | `#171717` | 16.2:1 / 15.7:1 |
| `text-secondary` | `#bababa` | `#4d4d4d` | 9.27:1 / 7.4:1 |
| `text-tertiary` | `#979797` | `#6b6b6b` | 6.11:1 / 4.68:1 |
| `text-disabled` | `#6c6c6c` | `#a3a3a3` | Exempt (disabled controls only) |

On a hover or selected wash, tertiary text becomes secondary. In light the wash takes tertiary
below 4.5:1 (4.01:1 at worst); in dark the lifted tertiary holds 4.76:1 or better on a wash, and the step is
kept as a rule so both themes behave alike (DECISIONS 166). Four text levels were considered and rejected: Linear's fourth (`#62666d`) is 3.0 to
3.45:1, which fails AA.

### Lines, states and actions

- **Hairline:** `0 0 0 1px` at 14.5% white (dark) or 8% black (light), with a second 1px
  ring in the page colour behind it, so the translucent line mixes against the same colour
  on any background (Vercel's technique). Controls, badges and avatars keep it. Decorative; it
  carries no required information.
- **Rim:** a panel's edge, and the only edge a panel has. A real 1px `border` (so forced colours
  keep it), 6% white on the sides and bottom and 8% white on top in dark (`border-rim` and
  `border-rim-top`), and 8% black on every side in light, where a lit top on a white panel would
  not show. On Card, TableContainer, CodeBlock, Callout, the preview card, Popover, Menu, Select
  and Combobox popups, Dialog, AlertDialog, CommandMenu, Sheet (its inner edge), Toast and
  Tooltip. Never on a control, chip, badge or pill.
- **Divider:** rules between table rows, menu groups and card sections: 6% white in dark, 8% black
  in light, never brighter than the rim (the header bar's line and the phone tab bar's top hairline are the exceptions; see
  [Chrome](#chrome-the-smoked-header)).
- **Input boundary:** 38% white or 45% black, 3.4:1 or better on every surface (WCAG 1.4.11).
  Vercel's inputs measure 1.35:1, and Linear's borders 1.3:1; neither passes.
- **Focus:** a 2px outline with a 2px offset in the secondary text colour, 7.4:1 or better.
  A field flush with a clipping edge takes the focus outline inset (offset −2px) around its visible
  band. A modal palette whose input is its only focus stop shows none. Against the fills and rim
  composites it touches the inset ring is 8.0:1 or better in dark and 7.1:1 in light.
  Outlines survive Windows forced-colours mode; box-shadow rings don't. **No state is ever marked by an outline:**
  selected, active, current and pressed never draw one. Focus is a 2px ring at +2 outside the control, drawn inside at −2
  only where +2 would be cut or would cross a neighbour: a field or band flush with a clipping edge (the search dialog's
  band, a flush listbox, an inline-label row), a row of tabs that scrolls, a sortable header cell, a phone tab bar cell, and a cut cell of a
  still table (a focus stop, which shows its own ring after Esc has closed its plate).
  A focusable row (a link or button in a list, not a listbox option) takes the same control ring at +2, outside the
  row, and its list keeps at least `space-1-5` (6px) between a row and any clipping edge so the ring is never cut. A
  full-bleed band that holds its own control focuses that control. A band that is itself the link or button takes the
  flush-field −2 inset above. A sortable table header is exactly that band (see the still table below). Navigation
  items are focusable rows: their ring goes around the hugging pill (see [Navigation](#navigation)). So are the
  notification centre's entries: links or buttons, which join the hover glide on navigation's rules (below), and the disclosure row (see [The conversation stream](#the-conversation-stream)). Otherwise Basalt ships none:
  the rows of Menu, Select, Combobox and CommandMenu are options and show the plate, breadcrumbs and pagination are
  inline, a `PanelList` row is a band that is itself the link or button (the flush −2 inset; see [Lists and facts](#lists-and-facts)), and any other settings or list row is the app's own markup. The accordion trigger is the one full-width band that is
  itself a button; it keeps the ring it was built with
  and is open for the panel.
- **Hover and selected:** washes of 6% and 9% white, or 4% and 7% black, so they work on any
  surface. A hovered control's hairline steps up to 24% white or 16% black (`border-hover`; `text-secondary` under [more contrast](#more-contrast)). A hover wash is a row of a
  list, not a plate: it runs full bleed and never lifts ink.
- **Chosen, one of many** (a segment, a tab, the current page, a navigation item) is the label at 600 in primary ink,
  against 400 in secondary at rest, on the furniture's own shape: a raised pill in a track, the underline under a
  horizontal tab, the plate under the current page. Every label reserves its 600 width (as navigation's label does), so
  choosing moves nothing: every other item's box is exactly where it was. The weight is the cue that does not rest on
  colour (WCAG 1.4.1, technique G182): a wash alone is about 1.2:1, and the pill (1.14:1 in light, 1.35:1 in dark
  against its track) and the ink step (1.75:1 in dark, 2.12:1 in light) support it without carrying it. The information that must reach
  3:1 (1.4.11) is the label, which is text and holds 4.5:1 on its fill at every level. An icon in a chosen
  item draws its selected form (closed and filled), with a label beside it or without one, in the same box, so it moves nothing
  (decision 145), a 16 by 16 box at size 16, one centre line with the words, 6px apart, wherever the words sit (beside them, in a span, or with the icon inside
  that span). In a segment or tab the live words and icon keep their start edges inside the reserved width, including a plain label; the spare width sits at the end, so a resting label sits a little before the centre of its item and nothing inside the item moves when it is chosen (DECISIONS 150 for a label with an icon; DECISIONS 156, 3 to 1, for a plain label). The 600 is on the label, not on the item (decision 149), and every label Basalt can draw twice reserves its width and is 600 when chosen: plain text,
  text with plain elements, icons and components (a Phosphor icon beside words, an app's own small component, words in a span, a tab an
  app draws as a link whose children are its words). The second copy of such a label is there for its width only: it holds no `id`, no
  `name`, no reference and no control, in the committed DOM after mount and after every update; native-element copies are cleaned in props and need no observer, while opaque component copies are checked and observed in the DOM. The narrow case that is not
  reserved keeps its weight and moves nothing, and still reads as chosen by its pill, underline or plate and its primary ink: words
  Basalt never sees (an app's own `render` that supplies them), and a label that holds a control (an `input`, including a hidden one, `select`, `textarea`, `button` or form), a frame (`iframe`, `object` or `embed`), media (`video`, `audio` or `canvas`), a script, a style, a dialog, a template or a slot, including one a component renders, which cannot be drawn twice safely; React and the HTML skill share this decline set. In the HTML skill a chosen
  segment or tab is 600 itself until the script has drawn its label (and with the script off), then the weight sits on the label; a declined label is marked `data-bare` and keeps 400. Its script still widens resting items once on initialization (possibly after a painted frame); the composer reserving labels and drawing glyphs before the first frame is a later batch (decision 150). The pill is `surface-top`; in dark it is
  `surface-top` plus the selected wash, as one solid fill (`#2c2c2c` on a `#111111` track), so a 36px pill in a vertical
  track reads as a pill and not as a wash; in light it is white on the track. **The pill's edge is its hairline and
  nothing else** (`border-hairline`, 1px, no offset and no blur): it sits in the flow, so it casts no shadow. Pagination
  is the weak case of the cue: a numeral at 600 against 400, and in dark the hover wash (`#0f0f0f`) is lighter than the
  current page's plate (`#0a0a0a` on `#000`). **In forced colours** the chosen segment, the chosen vertical tab and the
  current page are `Highlight` with `HighlightText`, the horizontal tab keeps its `Highlight` underline, and each keeps
  its 600; none draws an outline, so the focus ring shows on the chosen item as on any other, and the current page's box
  shadow is cleared. Status: decided by the council and approved by the owner (DECISIONS 138 and 139); the implementation hasn't been reviewed.
- **Server-rendered component labels (current limit):** opaque components render a second live instance for width, so hard-coded ids and controls can be duplicated in server HTML until hydration (permanently without scripts), and declining an unsafe component at hydration can change 600 to 400 and shift layout; a complete fix needs a larger server-safe reservation contract. The copied component is a second live instance on the client too, so its effects run twice.
- **A wash over an opaque fill** (a pinned table's hover and selected washes) is one colour: the wash's colour at its
  own alpha mixed over the fill with `color-mix`, in sRGB, as a browser composites it. It is never a gradient, an image or
  a pseudo-element layer. In a still table a hovered or selected row's wash is on every cell of the row, pinned or not, in React
  and in the skill alike (decision 149): each cell is that one colour, a pinned cell stays opaque in every state, and no column,
  header or row height moves. Status: decided by the council and approved by the owner (DECISIONS 138, 139 and 149); the implementation hasn't been reviewed.
- **The active row** (the row a keyboard or pointer is on, in Menu, Select, Combobox and CommandMenu) is a
  plate and a lift. The plate is a rounded rectangle (radius 8) in the selected wash, painted as one solid
  `background-color` per level and never a layered image (forced colours turns an image into a backplate):
  in dark the next level plus the wash, `#262626` on level 1 (1.31:1 against the panel) and `#2c2c2c` on level 2
  (1.35:1), and at the cap, which has no next level, the wash alone over `surface-3` (`#2c2c2c`, 1.28:1); in light
  the 7% wash (`#ededed` on white, 1.17:1). The lift is the ink: a rest row's label and glyph are secondary
  (10.24:1 on level 1 in dark, 8.45:1 in light) and the active row's go to primary (13.64:1 and 15.33:1 on the
  plate). A hint (a host, a region, a count) lifts from tertiary to secondary on the plate (in light tertiary
  falls under 4.5:1 there; in dark it holds 4.76:1 or better, and the step is kept as a rule, DECISIONS 166); a shortcut chip lifts to primary. There is no weight change: the active row is where the
  keyboard is, not a choice, and a weight that followed the arrow keys would flicker (a chosen item, whose 600 width is
  reserved, is a different state and does take weight); the chosen value is the check. There is no bar, no inset outline and no ↵ chip, except the opening list's cursor row, which keeps one (DECISIONS 155, V6): the owner ruled the vertical bar and the outline AI
  tells (9 Nov 2026), and the plate with the ink step is the cue that does not rest on colour (1.4.1) and says where
  focus is (2.4.7). A chosen value (a Select option, a checked item) is a check in primary ink at the row's start, in a
  16px slot every row reserves so labels align, with no extra weight; its label stays secondary until lit. Danger keeps its colour on the plate: 5.16:1 on level 1 and
  4.80:1 on levels 2 and 3 in dark, 5.43:1 in light. Group labels are tertiary, 12/16, weight 500 (5.33:1 or better).
  In forced colours the lit row is `Highlight` with `HighlightText` for its label, glyph, hint and chip text and border,
  `forced-color-adjust: none` on the row (Chromium otherwise paints a Canvas backplate behind forced text and the
  label renders as a black box), a solid plate, a danger row taking the same pairing, and the panel on `Canvas` with
  a real `CanvasText` border. With a fine pointer the plate is one shared element that glides between rows (see
  [Motion](#motion)); each row's own plate is the fallback.
- **Tabs and segments.** Horizontal tabs keep a 2px underline that slides under the active tab: it is horizontal, not the
  vertical line the owner ruled out. A horizontal tab (and a link tab) is radius 8 on its top corners from 36px, as a 36px control is; compact (32) keeps 6 (DECISIONS 167). Vertical tabs are a column of 36px pills (radius 8) in a track (padding 4, radius
  12, `surface-sunken-strong`), the chosen one raised as the segmented control's pill is; there is no divider. The
  chosen tab's pill slides as the segmented control's does (see [Motion](#motion)). The segmented control keeps its
  horizontal size (28px segments in a track of padding 2 and radius 8) and takes the dark pill fill above. In all four
  (and in pagination) the chosen label is 600 against 400, each reserving its 600 width, as above. On touch every
  item stays at least 44px, and a segment keeps its radius of 6: it is nested in a track of 8 with 2 of padding.
- **Settings and list rows** are full-bleed bands, not plates: each row spans the card edge to edge, dividers run edge to
  edge, and a row you can act on takes the hover wash (the card clips the corners). A choose-one list inside a card uses
  the menu plate. There is no settings-row component; this is the pattern for an app's own markup.
  A ruled list on the page (a directory, the big link rows) is not a settings row: it takes the ink lift and no hover wash
  (DECISIONS 152).
- **Primary action:** the inverse of the page (near-white on dark, near-black on light),
  brightening to pure white or black on hover, and stepping to `action-primary-press` (the
  action colour 85% toward the page: about `#bfbfbf` in dark, `#333333` in light) while pressed.
  Its text is 11.4:1 or better on the pressed fill. Secondary, ghost and danger buttons press to
  the selected wash. A press is a colour step, and Button and IconButton also scale to .98 (see
  [Motion](#motion)).
- **Status:** danger, success and warning, each a dot beside a text label, never a coloured
  badge fill. Danger is also a text colour (4.77:1 or better, including on the hover and selected washes; light `#ba1d27`). There is no filled red button:
  a destructive action is red text on a red hairline, quieter than the primary action, with
  focus starting on Cancel. In tables a status is a plain dot and word, not a pill per row. Light warning is `oklch(0.60 0.137 62)` (DECISIONS 167, Q9g): 3.22:1 and 3.08:1 on a selected row over `surface-sunken` and `surface-sunken-strong`, where the old 0.62 measured 2.98:1 and 2.85:1. The council named the same chroma, 0.142, which is outside sRGB at that lightness, so the chroma is the largest the gamut holds (0.138, taken down to 0.137 for a margin); hue is unchanged.
- **Disabled** keeps its control's shape with the disabled text colour and a fainter line.
- **Selected rows** (a table) are the selected wash as a band, edge to edge (on every cell of the row, pinned columns included), with no bar and no edge mark, in
  forced colours too. The state is carried by the row's checked box and by a count in words, not by the wash
  (about 1.2:1): the first column is a checkbox column (a `Checkbox` per row, labelled "Select {name}", and a header
  box that is mixed while some rows are selected), and the count ("3 of 12 selected") is written in a polite live
  region by the app. Basalt ships no helper for the column or the count: the column is the app's own markup on
  `Table`, `TableCell` and `Checkbox`, given a first column `size-control-md` wide, and the row takes `selected`.
  Outside a table the same selection is `SelectableList` (see [Lists and facts](#lists-and-facts)), which draws the boxes, the all box and the count.
  Do not mark selection with a vertical line.
- **The still table** (the owner's rule, decision 71: header positions, column widths and alignment never move, through
  sort, filter, paging or loading). `Table` takes `columns` and is then `table-layout: fixed` from a `colgroup`: every
  column has a width except one, which takes the rest, and `minWidth` is where the container scrolls sideways instead of
  squeezing the columns. Widths are never measured from content. A cell truncates with an ellipsis, never a hard clip (a
  link in a cell is a block that carries its own), and **a cut cell can always be read**. While a cell is cut it is a focus stop (a cell
  that is whole is not, and opens nothing), and on hover (after the tooltip's wait) or focus its whole value opens in place over it:
  a level-3 plate with the rim and `shadow-overlay`, radius 8, its text starting exactly where the cell's does and wrapping at the
  container's end edge, never past the viewport (a cell scrolled half out of view brings the plate in). Esc closes it without moving
  the pointer or focus, the pointer can move onto it, and it stays until hover and focus have both left (WCAG 1.4.13); it is
  `aria-hidden`, because the cell already holds the value. Opened by the keyboard, the control ring at +2 goes round the plate; after
  Esc, and for any cut cell in focus, the cell shows its own ring, the flush-field −2 inset. The row stays 40px and no column moves.
  Each cut cell is one added tab stop, and the count is measured in the review round. A column of one fixed form (a date, a time,
  a status word) is sized for its longest form under WCAG 1.4.12 spacing, about 1.3 times its width at rest, so only free text is ever
  cut. A header's label is sized to fit its column under WCAG 1.4.12 text spacing, as a fixed-form column is: a sortable header is
  the whole cell as a button, and a plate over it would take its pointer and cover its indicator, so a cut sortable label opens no plate
  (its accessible name already holds the whole label); a plain header keeps the plate (DECISIONS 142). The plate fades in over `duration-base` on `ease-out` and out at 0.75× on `ease-in`, and never scales, because a scale would
  move the text; under reduced motion it still only fades. In forced colours it is `Canvas` with a `CanvasText` border.
  **Status:** decided by the council (DECISIONS 138) and approved by the owner (DECISIONS 139); the implementation has not been
  reviewed. **The sort control is the whole header cell** (decision 84): a
  press anywhere in it sorts, and the cell is the button, so it takes the flush-field −2 inset focus ring and has no wash.
  Every sortable header reserves a 16px seat for the indicator **after the label, in every column** (DECISIONS 261), so the
  indicator arriving moves no column. A start-aligned label never moves. In a numeric (end-aligned) column the label rests on the
  numbers' edge, over the empty seat, and moves aside to make room while the indicator shows (hover, keyboard focus, sorted, and
  always on touch, where the caret always shows): a transform on the label alone, over `duration-base` on `ease-out` and back at
  0.75× on `ease-in`, and on a fine pointer the indicator fades in over `duration-fast` once the label has cleared its seat. Under
  reduced motion the label does not move: it keeps its place beside the seat, as on touch. Column widths, alignment, the header's
  height and every other column never move. Hover and focus lift the label from secondary to primary and show a tertiary up-down
  caret in the seat (always, on touch); sorted, the direction arrow takes the seat in primary and the label stays primary. There is
  no weight change. `aria-sort` is on the `th`, only on the sorted column. **A press cycles three states:** the column's first
  direction, then the reverse, then the table's own order (the order it loaded in) with no column lit and no `aria-sort` anywhere.
  Text starts ascending; a numeric column, or one with `firstSort="descending"` (a time), starts descending. Rows always sort from
  the table's own order, never from the order on screen, so ties keep it and the third press gives it back row for row (`sortRows`,
  and the HTML skill's own sort). An app may load the table sorted on a named column; the third press still returns its own order.
  The header band is 32px, and 44 on touch. **A column explainer** (`TableHeadExplainer`, given to a `TableHead` as
  `explainer`; the HTML skill's `.explainer` inside a sortable `th`) says what a column means. It is only for a column a reader could
  misread without it (a term of art, a coined name, a measurement whose method changes the reading), never a plain name; one to
  three sentences and at most one link, never a control; if most headers need one, the table needs a better caption. It is a
  popover, not a Tooltip (it can hold a link): the opener's level plus one, the neutral rim, radius 12, `shadow-overlay`,
  `space-4` inside and at most `size-popover-max` wide, growing from .98 over `duration-base` on `ease-out` and leaving at 0.75× on
  `ease-in` (a fade only, under reduced motion). It opens from the header itself, on hover after the tooltip's wait (600ms, at once
  within 400ms of another closing), at once on keyboard focus, and on a long press (500ms) on touch, where the header raises no text
  selection or callout; a tap sorts. A press before the wait sorts and cancels it, and a sort press closes an open one, which stays
  shut until the pointer and focus have left. It sits above the header, on the column's start edge (its end edge on a numeric
  column) and kept inside the window, else beside the header (the end side, then the start side), never below, so never over its
  own column; with no room it opens nothing (a long press first scrolls the page up to make room), and it closes, focus or not, when its
  header leaves the view or the room goes. WCAG 1.4.13 applies: Esc dismisses it without moving the pointer or focus, the pointer can
  move onto it (a pause in the gap between header and card keeps it), and it stays until hover and focus have both left. Inside a modal
  it is written into the modal's own layer, so its link stays reachable.
  Its words are the sort button's description; the button's name stays the label and it is never a popup trigger. Tab from an open
  header goes into its link, then on. **On a header that does not sort** the opener is the header cell itself: it becomes a focus stop
  (`tabindex="0"`) described by the card's words, with the −2 inset ring of the still table's other stops, and opens the same way
  (hover after the wait, keyboard focus, a long press); a press there does nothing else. The cell keeps its role and its name, the
  column header, so a screen reader hears the column and then what it means, and nothing new is drawn in the header (a small trigger
  would need a seat that every header of its kind then reserves, and a second stop in a sortable header). The HTML skill's explainer
  stays on sortable headers; this form is React's alone. A header with one is sized for its label under WCAG 1.4.12, as every header is. A table
  without explainers loads none of its code. **Status:** the three states, the arrow after the label and the explainer were picked
  by the owner (DECISIONS 257, 261), built by Opus, reviewed by Astra. When no row matches, one row spans every
  column under the unchanged header with a sentence and an action that names what hid the rows (`TableEmpty`; DECISIONS 207): a search alone gets a sentence that names the term
  (`No runs match “zzq”.`) and "Clear search"; a chosen filter gets "Clear filters", which in the mixed case clears the search too. It is outside the sticky rules.
  **At 390** the table scrolls and `pinned` leaves the name sticking, and the select column and the name when there is
  one. A pinned cell is opaque at its level in every state (rest, hover, selected, forced colours: the row's wash is laid
  over the panel's fill as one cell background), and a header or action focused from the keyboard scrolls clear of the pinned
  columns (the container's `scroll-padding-inline-start`, finished on keyboard focus for a cell that is only half covered). A tap
  never scrolls the table: it focuses before it clicks, and a scroll then would carry what was under the finger away (DECISIONS 261). **The
  scrolled-edge divider** is one of the few vertical lines Basalt allows, and a **meter's target tick** is another (see
  [Vertical lines](#vertical-lines)): each is structure (a 1px `border-divider` at the pinned edge, drawn only while the
  table is actually scrolled; a labelled scale tick on a meter's slot) and never a selection, sort, active or status
  mark. The owner's ruling against the vertical bar is about marks, and these are not marks. Another structural edge is
  added to this list by name, with its reason, never by a general exception. **App guidance:** set `scrollbar-gutter: stable` on the page's
  scroller. A filter that shortens the page removes a classic scrollbar, which widens the page and so the one remainder
  column, and every header after it moves; reserving the gutter prevents it. Fixed layout alone cannot (an overlay
  scrollbar never shows the problem, which is why a test on a Mac cannot either).
- **Table additions** (council, DECISIONS 95). **A row header** is a `th scope="row"` in the body (`TableRowHead`): 13/18 at
  500 in primary, start-aligned, with the cell's height, padding and divider, on the row's own fill, so the hover and
  selected washes run through it, and with no band fill (the 12px secondary band names columns across the top; a row
  header names one row, inside it). Data cells stay 400; the step is structure, not state. A row header never sorts. When a
  table is pinned the row header is the pinned name column, opaque at its level in every state as any pinned cell is.
  **A not-observed cell** (`TableCell notObserved`) says "Not observed" in `text-tertiary` (4.5:1 or better on every level, proved),
  lifting to `text-secondary` on the hover and selected washes, where tertiary alone fails. It has no
  mark, no swatch and no dash (the dash already means a range, and "none", and is the ordinary em dash the owner
  disliked). In a numeric column the words end on the numbers' edge. It is spoken as the words, with the headers around
  it. Missing is not zero: `0` stays a digit in primary, and an empty string stays blank, which says nothing. A column
  that can hold the words is wide enough for them at 13px inside its padding (112px). **Sorting** (app guidance: `Table`
  does not sort data itself) puts a not-observed value after every observed value in both directions, and an empty string
  after the observed values too; a total or mean says what it skipped. Every example and review round that sorts follows
  it. **Narrow tables** stay the still table: pin the row header and scroll, never cards, never a hidden column. **The
  scroll hint** (`TableScrollHint`, directly under the container) is one line, "Scroll sideways to see all 6 columns" (the
  count is the table's), `text-tertiary`, 12/16, `aria-hidden`, shown only while the table overflows its container and
  never changed while it scrolls, so nothing in the table moves; a column cut by the edge is not a cue when the next
  column is numeric, because an end-aligned column shows only its empty start.
- **The flat table and the two-line cell** (DECISIONS 162, D18b). A `TableContainer` with `flat` draws no border, radius, fill or shadow and adds no level, so a
  panel that holds the table (a `Card`) has one box and not two: what it holds keeps the card's level, and the card's own `space-4` padding is the table's
  inset (the slab's 20 to 32px went with the slab, D18a). The header band keeps its fill (`surface-sunken-strong`); how a square band reads inside a rounded
  card the owner has seen and approved (DECISIONS 163: "yep these are fine"). A flat table's cells are padded `space-2` above and below. `TableCall` is a two-line cell's content: a call in primary at
  500 over what it changes in secondary at 400, `space-0-5` (2px) apart, wrapping inside its column, so the row grows and no column moves. The panel's head
  (a title and a count on one line, `gap` `space-1` by `space-4`, `space-5` below) and its note (`text-sm` tertiary, `space-4` above) are the app's markup; the
  count's dot is the accent `Badge` dot, `size-dot`, never an 8px brass fill (consent row 4). Line heights are each size's token (consent row 3). Status: the
  implementation hasn't been reviewed.
- **Selected is shown by shape or weight, never by colour alone** (council, DECISIONS 95 and 138; one state, one look).
  Wherever Basalt says on, selected or chosen it adds a cue that is not colour: one of many is its label at 600 on its pill,
  underline or plate; any of many, and on, is a check in a reserved seat or a filled choice box; a glyph closes and fills.
  The ink steps to primary with it. The wash alone, and the ink step alone, are never the cue. The silhouette follows the
  furniture the state sits in; the weight, the ink step and the shape do not change.
- **The choice card** (`ChoiceCard`, in a `ChoiceCardGroup`) is a native radio (one of many) or checkbox (any of many)
  wearing a card: the whole card is the label and the input is visually hidden but focusable. Plain `Card` gets no selected
  prop, because paint without semantics ends up on a `div` nothing can operate. A real choice box (`size-choice`, the
  checked control's own look) sits in a seat reserved on every choice card, on its header line, inline-end of the title,
  empty at rest with the input boundary, so choosing moves no title. Selected is the selected wash as one solid fill at the
  card's own level (the active-row plate, `--basalt-plate`, the token `plate-1` on level 1: about `#262626` on level 1 in dark and `#ededed` on
  white), with the rim and the level unchanged: level is position, and a chosen card is not nested deeper. The title stays
  primary with no weight change; tertiary content steps to secondary on the fill. Hover on an unselected card is the
  hover wash alone, with no further step on a selected one; there is no press scale; focus is the control ring at +2
  outside the card, so the grid keeps at least `space-1-5` to any clipping edge (the group's `space-4` gap does); state
  changes crossfade over `duration-fast`, the same 100ms under reduced motion. In forced colours the wash drops, the card
  keeps `Canvas` with a `CanvasText` edge, and the checked box is `Highlight` with `HighlightText`. Not used: a coloured
  or ink ring round the chosen card (it reads as focus and breaks the one neutral rim), a darker or lighter card fill (it
  vanishes in light and reads as a level in dark), and the wash alone. **A choice card holds words only:
  choose, don't hold controls.** A link that explains the options goes beside or under the group; a field for the chosen
  option goes under the group. (A link or button inside the label lights the card under it, makes near-misses choose, overlaps
  touch targets, and is invalid HTML.) `ChoiceCard` still accepts any children, and the rule is the app's; it warns at no time.
- **The pressed toggle** (`pressed` on a secondary or ghost `Button`, and on `IconButton`; it writes `aria-pressed`). Never
  primary (a latched primary reads as the action) and never danger (a latched red reads as an error). Pressed is the
  selected plate as one solid fill per level (never a layered wash, so forced colours can replace it; on the page itself, with no level, it is the wash over `surface-page` in light, about `#e8e8e8`, and the next level plus the wash in dark), the label steps to
  `text-primary` with no weight change, a secondary's hairline steps to `border-hover`, a ghost gains its rectangle, and the
  radius does not change. A text toggle holds a 16px seat at the label's inline start that shows the core `check` while
  pressed and is empty while not, so a pressed and an unpressed toggle of one label are the same width; the check swaps,
  it does not morph. An icon toggle, and every IconButton toggle, carries no check: the plate, the ink step and the glyph's
  selected form (a core glyph closes and fills; a `fillSafe` Phosphor glyph fills) say it. The momentary .98 press stays
  Button's. In forced colours it is `Highlight` with `HighlightText` for the fill, the label and the check, at rest,
  hovered, pressed and focused. Reduced motion is the 100ms crossfade. A text-only on/off with no glyph to fill is a
  `Switch`; exactly one of many is a segmented control, never toggle buttons.
- **External links** (`Link`, and a `Button` or `IconButton` rendered as an anchor; council, DECISIONS 95). The arrow means
  "opens in a new tab" and nothing else, so it comes automatically from `target="_blank"`, with no prop and no opt-out;
  a same-tab link to another site gets no new-tab arrow (DECISIONS 152: the right arrow means going on in the site and the left arrow back; see [Links and rows](#links-and-rows)). It is the core `external` glyph after the label, `aria-hidden`, never
  underlined, 16px beside 12 to 16px text and in Buttons xs to lg, 20px beside text of 20px and up (`Text` and `Heading` at xl or larger set a private size for what they hold) and in an xl Button, where it takes the trailing-icon
  slot at the button's own gap (a new-tab Button has no other trailing icon). In running text it adds no space: the glyph's
  own side bearing, a word joiner (U+2060) before it and `nowrap` keep it with the last word, so it never starts a line.
  In a still-table cell the label truncates and the arrow stays whole. Ink: `text-secondary` at rest, lifting to the
  link's own ink on hover and focus with the underline; a Button's own ink; `LinkText` or `ButtonText` in forced colours
  through `currentColor`. Spoken: a visually hidden " (opens in a new tab)" inside the link or button, after the label, one
  translatable string (`newTabLabel`); an IconButton gets it in its label and no second glyph; a link that holds only a
  logo skips the glyph and keeps the phrase. Open a new tab only where leaving would lose the user's place.
- **Badges, pending and pairs** (council, DECISIONS 95). `pending` (waiting, in review, queued) is a hollow 6px ring, a 1px
  border in the badge word's own ink (`text-secondary` in `Badge`, `currentColor`), in the status dot's seat, with the app's
  word ("Pending", "In review", "Queued"). No colour: waiting is not a warning. The ring is `aria-hidden`, the word is
  spoken, the plain variant carries the same mark, and in forced colours it is a border in the word's own ink (see **Status in forced
  colours**). With no `status` a badge is the word alone (a count, a fact); `neutral` asked for by name (Idle, Draft) draws the
  tertiary dot; a running badge (a braille `Spinner` first) draws no dot, the cell taking its seat. At most two badges
  sit on one object (`BadgePair`): the status first, right after the name, then one neutral fact, `space-2` apart and
  `space-2` after the name. Never two statuses; a third fact goes in words. When the name and the pair don't fit on one line
  the pair moves under the name as a unit, the name truncates only when it alone is wider than the row, and a badge never
  truncates. Spoken in DOM order.
- **Status in forced colours** (council, DECISIONS 106). A filled dot is a fill, which forced colours drop, so every status dot
  (success, warning, danger, neutral, accent) is drawn as its own border (`box-sizing: border-box`, a border of half `size-dot`,
  no background) with forced colours left on: the browser paints it in the system colour of where it sits (`CanvasText` on
  Canvas, `HighlightText` on a lit row, `LinkText` in a link). Every settled status is the same disc there; the word says
  which. The pending ring is a 1px border in `currentColor`, braille is `currentColor` and left to the browser, and an
  outline badge's edge is a real 1px border in the word's own ink. **No dot, ring or edge names a system colour**: a named one
  fails on a lit row (measured on a lit row: a `CanvasText` fill 2.31:1 in dark and 1.86:1 in light against Chromium's Highlight
  plate; the border disc 9.10:1 and 11.31:1). A lit row names its status word and badge among its `HighlightText` parts, so the dot
  follows. The nav dot, the checked radio's dot and the notification centre's dots are drawn the same way. The badge keeps
  its box: border-box, its inline padding reduced by the hairline, so the border changes nothing.
- **The multi-select filter** (`MultiSelect`; decisions 82 and 83). One rule picks the control: one of many is a pill in a
  track (`SegmentedControl`), except one of many that wraps, with eight values or fewer, which is chips with radio semantics and no track
  (`OptionChips`, below; DECISIONS 154, A4); any of many is a check with no track. Up to six values are independent chips: 32px, or 36
  inside a 44px target on touch, radius 6 (8 at 36), 13/18 at 500 (14 on touch), 8px apart. Off is a hairline and a
  tertiary plus in the chip's 16px seat; on is the selected wash, primary ink and the check in the same seat, so turning
  one on moves nothing, and it is never colour alone: the glyph changes shape. The swap is a 100ms crossfade
  (`duration-fast`), not a morph, with or without reduced motion: it is opacity only, which reduced motion keeps. Hover brightens the label and the line a step; a press is
  a colour step and never a scale (only Button and IconButton scale). The semantics are checkboxes in a labelled group:
  Tab reaches each chip and Space toggles it, and the visible "2 of 4" (or "Any") is the group's description, not live.
  **Seven or more values, or any use in a toolbar, are a trigger and a checklist**: a non-modal popup of popup rows, with
  the same checkbox group, a count and Clear in its footer. The switch depends on the count and the `toolbar` prop, never
  the viewport. **Clear** is always mounted, in place, with the same label; at zero it is `aria-disabled`, not `disabled`
  (activation is suppressed and keyboard focus stays on it), and it never hides and never moves focus. In the chips' head it
  sits right after the count, `space-2` apart ("Status · 2 of 4 · Clear"), and the count reserves the width of its widest form
  ("Any" and "N of N" share one grid cell, tabular figures), so Clear never moves as the count changes; the checklist's footer
  (count at the start, Clear at the end) is as it was. What is spoken
  is one polite, atomic result line outside the filter (`FilterResult`: "Showing 3 of 24 runs"), updated after the text
  has held still for 400ms, so three toggles are one announcement. **The checklist's rows scroll inside `size-popup-max-height`
  (360), with the search band and the foot outside them**: nine 40px rows show whole and the tenth is the first to scroll. **From
  ten values it has a search band**: 40px (`size-control-xl`), 14/20 text (16 on touch), the next level's fill, a divider below and
  the −2 inset ring, because the popup has other stops. Focus opens in the band with a hardware keyboard; on touch the checklist
  opens without focusing it, so no keyboard rises over the list. ↓ goes from the band to the first row, ↑ from the first row comes
  back, and typing on a row goes to the band. Esc clears the text first, and only the next one closes. The count still counts every
  value, and no match is one line ("No service matches.", from the filter's own label). In forced colours every part of a chip uses a system
  pair: off is `ButtonText` on a real border; on is `Highlight` with `HighlightText` for the label and the check, and it
  stays that way on hover.
- **Checked controls** (checkbox, radio, switch) fill with the primary action colour; a switch
  also moves its thumb. Off is quiet: a tertiary thumb on an input-bordered track.
- **Toasts** are level 1, fixed, never tinted and never given a status rim. Status is a mark in a 16px seat, and the
  title says it in words: success is CheckCircle, warning is Warning and danger is XCircle (the same icons as a
  callout), and danger's title is in the danger ink. A neutral toast has no mark and no empty seat. Work that is running
  puts braille in that seat and updates the same toast in place to its result, so the title never moves; the seat is
  kept for the result, even an unmarked one, and the clock starts at the result. In forced colours the marks keep their
  shapes (an icon, not a fill) in the system foreground.
  - **How long it lives.** A toast times out (5000ms, with the line) only when it is not the only copy of its information
    or action. It names where the rest lives (`home`: `"center"`, the notification center (`"centre"` is the older spelling and still works), `"row"`, the row in place, the app's own key, or
    "the page" when it only echoes a change the page already shows), and an action needs a home that is not the page.
    With no home it stays until it is dismissed, and the type does not let a `timeout` be set on it. The centre is the
    durable copy that lets a toast go. **A toast does not outlive the page it echoed:** one whose only home is the page closes when the page
    changes without a reload (`useRouteFocus` says so; an app with its own router calls `pageChanged()`), on screen or still queued; the only
    copy, running work and a toast with a lasting home (the centre, the row, a key) stay. Over the next page's controls an echo of the last
    one would only take taps (found by CoachStakk's takes). Status: decided on the no-council path (DECISIONS 265, batch B5); not yet reviewed. There is no ⌘Z chip on a toast's button: the app's key goes in
    `aria-keyshortcuts`.
  - **What a screen reader hears.** Only the result, once, from two live regions that hold only text and exist before the
    first toast: assertive for danger, polite for the rest. Running steps are never announced. The visible stack is a
    named region ("Notifications") that F6 reaches, and is not itself live, so nothing is read twice.
    While the region itself holds focus, its box draws nothing and the control ring follows the front toast's box at +2, so the next Tab moves the ring 0px, including in forced colours (DECISIONS 156).
  - **The stack.** Three at most, bottom right at `space-4` from the edges; from 720 it stands above what is pinned at the bottom (an app's
    foot, and an on-screen keyboard). **Under 720 it hangs from the bar** (DECISIONS 274, the owner's pick of option B; found by CoachStakk's
    CS19, where a stack at the bottom took the tap meant for a form's last action): full width, `space-2` below the bar's line, or `space-4`
    from the top edge and its safe area with no bar. What covers the top moves it down: a band stuck under the bar when the page measures what
    is pinned, and the part of the page an on-screen keyboard's view has panned past, so it stays under the bar while a keyboard is up. The front
    toast is at the top and the ones behind peek below it; a toast enters from the top edge it hangs from and leaves to it (opacity only under
    reduced motion), and a swipe up or to the side dismisses it. The bottom (the tab bar, a foot, a form's last action) is never under it. Cards behind peek at the shipped .05 scale and the frontmost toast's height, so they show
    even behind a taller toast. It expands on hover and focus. A toast that is the only copy, and a focused one, is never
    removed to make room: the newcomer waits in a queue and enters as room appears; a timed toast is closed instead,
    oldest first. Repeats group ("×3", on a `group` key) and errors never do. A drag of more than 40px dismisses it, by
    distance alone. The line and the clock pause together on hover, on focus, in a blurred window and in a hidden tab.
- **The notification centre** is the durable record the toasts point to: a bell IconButton (32px, a 6px ink dot while
  anything is unread, and the count in its accessible name and never drawn, so the button never changes width) that opens
  a popover at its opener's level plus one, below the bell with its end edge on the bell's, with a header band (title, count, "Mark all as read") and a footer ("View
  all" at its end and, when the app offers it, "Clear all" at its start, disabled in place once nothing is left; DECISIONS 269). An entry is a link or a button with four seats: a 6px dot, the status mark (a 16px seat, always there so titles
  line up), the words and the time. Unread is the dot and primary ink, with no weight change; read is the same row with
  the dot's seat empty and the title in secondary ink, so "Mark all as read" moves nothing. The mark's seat stays even when no
  entry has a mark: it is a column, so marks line up to be scanned, and a status entry arriving while the centre is open has
  somewhere to go without moving every title. The app owns the entries,
  their read state, persistence and the "View all" page; the component is presentational. **The hover glide** is navigation's,
  in the same plumbing: one plate follows the pointer between entries (40 or 58 tall; 44 or 58 on touch); the first key hides it and the resting
  hover, so only the shipped rounded control ring at +2, outside the row, shows; the next pointer move brings the plate back.
  Off on touch, under reduced motion and in forced colours, where each entry paints its own. Its US name is `NotificationCenter`
  (`NotificationCenterProps`); `NotificationCentre` and `NotificationCentreProps` stay as aliases.
  - **Pending** (waiting on the reader, in review, queued) is the toast's ring with nothing in it: Phosphor's Circle at 16 in the mark's
    seat, the same drawing as CheckCircle and XCircle, in secondary ink and no colour, because waiting is not a warning. Badge's 6px ring is
    pending's mark in a badge; in the entry's 16px seat it would sit beside the 6px unread dot as a second, hollow dot and read as a read
    state, so the entry draws the ring at the size of its own marks. Like every mark it is `aria-hidden`, and the title says it in words
    ("Waiting on you: approve release 4.2"). In forced colours it is `CanvasText`, as the other marks are.
  - **Grouped repeats.** The app groups (an entry's `entries`, one level deep) and writes the group's title, naming who and what ("Sam, Priya
    and Marcus mentioned you"); the row draws the four seats, then after the title the toast's count ("×3", `aria-hidden`, spoken ", 3 times")
    and the core chevron on the disclosure's convention (`DisclosureRow`'s: to the end while closed, mirrored right to left, and down while open).
    The title is cut first; the count and the chevron always show, and the time keeps the column every time ends on. `count` stands for more
    than the entries listed, and is the app's only as a whole number above 0 (else the entries are counted). A group's row is a button with `aria-expanded`; its entries open in place under it on
    the reveal's track (0fr to 1fr over `duration-slow` on `ease-out`, back at 0.75× on `ease-in`, at once under reduced motion; `inert`
    while closed), indented by the dot's and the mark's seats and their gaps, so their seats sit under the group's words. Focus stays on the row (the entries are the next tab stops) and choosing the row never leaves the center. One unread rule serves
    the row, the dot, the count and "Mark all as read": a group is unread while any of its entries is, and its own `unread` is ignored; the
    unread count counts entries, not groups. Errors are never grouped, as the toast never groups them: a `danger` entry inside a group is
    drawn at the top level right after it, and a group left with none is not drawn. A `current` group is `aria-current` too. In the HTML skill
    the list drawn again (`setEntries`) keeps each group open or closed, by id, and gives focus back to the entry that held it.
  - **The page form** (`NotificationList`) is the same rows in the page: the app's own notifications page ("View all" opens it), and on a
    phone the tab bar's destination, because a bell does not fit a phone's header beside the page's buttons. A tab bar's cells are links to
    pages, so the phone form is a page, never a sheet: the app's `TabBarItem` with `NotificationsGlyph` links to it and carries the
    new-activity `dot` ("3 unread", spoken; counts are never drawn), and from 720 the app shows the bell in its header instead. It has no
    popover, no title (the page's heading names the list, `aria-labelledby`), no rim and no glide: each entry paints its own plate, the
    page's solid plate where it has no level. Its head band holds the count and "Mark all as read", its count lined up with the entries'
    dots; `head={false}` drops it, for a list of entries in a sidebar or a page column. With `onClearAll` a foot holds "Clear all" at its start, as the
    center's does (no "View all": this is that page). Paging is the app's (`ListBand` under it).
  - **The current entry** (`current`, in a list of entries beside the page they open) is `aria-current` and its title at 600 from 400, the
    selected rule's one of many; the title is one cut line, so nothing moves.
- **A popup opens below its opener, never beside it** (the owner's word, DECISIONS 268). A popover, a menu, a select, a combobox and
  a filter's checklist open under the control (above it only when that side has more room) and never jump to its side when they are
  taller than the room; they fit the room they have and scroll inside. A submenu opens beside its row, and a tooltip and an app's
  own `side` keep theirs.
- **Callouts** keep a neutral fill at their own level, with no tint. Status is the icon and the words, and success,
  warning and danger also draw the rim in their status colour, mixed in sRGB at 45% over the callout's own level (the
  danger Button's hairline recipe, but one solid colour on every side, in both themes). The icon takes the status
  colour and only danger's title does; the body stays secondary. Info and a plain note keep the neutral rim and a
  secondary icon. The rim is decorative (about 1.7 to 2.8:1): the icon (3:1) and the words (4.5:1) carry the status, so
  those are the pairs the tests prove on every level. In forced colours the rim and the icon are `CanvasText`: the
  status is the icon's shape and the words. "Danger is text plus a hairline in the danger colour, never a red fill"
  stands, and the danger callout is an instance of it: a hairline on a panel.
- **Figures and transcripts** (decision 94; the council voted, the implementation has not been reviewed by the panel).
  - **Description list** (`DescriptionList`, `DescriptionItem`). Facts about one thing: a `dl` of `div` rows, each one `dt`
    and one or more `dd`, on the page with no rim and no level of its own; inside a card only when the card is the object
    (its dividers then stay inside the card's padding). The label column is a fixed 160px (`size-description-label`), never
    sized to its longest label, so every list on a page shares one value edge; a long label wraps inside it. The list is
    its own container and stacks, label over value `space-0-5` apart, when its own width is under 480px (30rem), whatever
    the viewport; with `narrow="line"` it keeps each label and value on one row there instead, the label column at 80px (see
    [Lists and facts](#lists-and-facts)). The label is 13/18 at 400 in secondary ink on the value's baseline; the value is 14/20 at 400 in primary
    ink with tabular numerals, start-aligned. Mono is for identifiers only (a `mono` option), at 13px on the 20px line.
    Rows take `space-2-5` above and below, so a one-line row is 40px, with a `border-divider` between rows (drawn inside
    the row, as the table's is), never above the first or below the last; the first and last rows lose their outer
    padding. Several values in one row stack `space-1` apart. A missing value says "Not observed" in tertiary ink, with no
    mark, as a table cell does (decision 95); a value that is absent rather than unmeasured says so in the app's words, in the
    same ink (see [Lists and facts](#lists-and-facts)). The gap between the label column and the value is `space-4`.
  - **Meter** (`Meter`, on Base UI's Meter): how much of a cap is used, and not `Progress` (a task finishing). The head has
    the label at the start (13/18 at 500, primary) and the reading at the end: the value in primary at 500 with tabular
    numerals, then "of" with the cap and its unit in secondary ("1,240 of 2,000 min"), reserving the width of the cap
    written as the value, so a new value never moves the label. The track is an outlined slot, `space-2` (8px) tall,
    `radius-full`, a 1px `border-input` edge, transparent inside; the fill is `text-primary` from the start edge, inside
    the border, and stops at the slot's end over the cap. The slot is the cap and never rescales. No red fill, no hatch,
    no zones, no indeterminate state. The foot is always there (12/16, secondary, tabular numerals), so a change of state
    never adds a line: at the start what is left ("760 min left") or, over the cap, the overage in words ("24,000 over")
    in primary ink with no status colour and no dot; at the end the target's words with a 2px legend line drawn like the
    tick. The target tick is 2px (`size-indicator`) in secondary ink, reaching 4px past the slot on each side (16px on the
    8px slot), with a 2px cut on each side in the colour of the level it sits on, drawn as a border and not a shadow, so
    forced colours keep it. It is `aria-hidden`; its words are in the foot and in `aria-valuetext`. The fill glides over
    `duration-slow` on `ease-out` when the value changes, and jumps under reduced motion. `role="meter"` named by its
    label; `aria-valuenow` is clamped to the cap, and the true value, the overage and the target are in `aria-valuetext`
    ("124,000 of 100,000 requests, 24,000 requests over the cap"). Not focusable, not live. In forced colours the slot is
    `Canvas` with a `CanvasText` edge, the fill `CanvasText`, and the tick `CanvasText` with its cut in `Canvas`.
  - **Stat with provenance** (`Stats`, `Stat`). The skill's `.stat` look is unchanged (label 13/18 at 500 secondary, figure
    24/30 at 600 with tabular numerals, note 12/16 secondary, `space-1` between, on the page and never boxed), with one
    more slot after the note: the source line, sans 12/16 at 400 in tertiary ink with tabular numerals, the time, a middle
    dot and the source ("4:41 AM · Scale", read and scanned as "4:41 AM, Scale": the dot is `DotSep`, below). It is pinned to the foot of the
    stat's grid cell, so sources line up across a row even when one stat has no note. The time is always absolute, in a
    `time` element with a `datetime`, never "2 min ago": the clock alone for today, the date added for another day ("Nov
    7, 8:02 AM"), the year only when it differs. A clock a person reads follows the locale (12-hour in `en-US`, with a numeric hour, never "08:02 AM"; `locale` defaults to `en-US`
    on every part that writes a time, so a server's render and the browser's agree). With no source the slot is left out. A row of stats is one `dl`; each stat
    is a `div` whose label is the `dt` and whose figure, note and source are `dd`s.
  - **Words joined by a dot** (`DotSep`, `DotLine`; the skill's `.dot-sep`; the wording audit's W8). A status line is words with a middle dot between them ("In design · Pilot planned"). The dot is
    drawn by the stylesheet (`::before`, with an empty alternative text, so it is not read; a plain `content` first for a browser that does not take the alternative), and the words are joined for a
    screen reader and a text scan by a visually hidden ", " in the same element, so the text and the accessible name both read "In design, Pilot planned" and never "In design · , Pilot planned". The
    drawing is as it was (the dot, and a space each side where `spaced` is set); `Stat`'s source line, `DateAge`'s age and `OptionChips`' unavailable note are built from the same `DotSep`.
  - **A value, its unit and its label are words apart.** Where a number and its unit (or a label and its figure) are separate elements with no space between them, a visually hidden space ends the first, so the
    text and the accessible name read "9,586 a day" and not "9,586a day": the `TimeChart`'s headline and its legend rows, `Stat`'s label, figure and note, a `Meter`'s unseen wording and a share bar's figure.
    The hidden space takes no room, so nothing moves; in the skill a value and its unit have a space in the markup or a `.visually-hidden` one.
  - **Terminal transcript** (`Terminal`, and `CodeBlock`'s `prompt`). A sibling of `CodeBlock` on the same frame (well,
    level, radius 8, title row, copy button). Lines are Geist Mono 13/20. A command is primary with its prompt in the
    gutter in tertiary; output is secondary with an empty gutter; a result line carries the callout's mark in the gutter
    (CheckCircle in the success colour, Warning in the warning colour, XCircle in the danger colour, each `role="img"` and
    named "Done", "Warning" or "Error"), and only an error's text takes danger ink. No syntax colour. The gutter is shared
    with `CodeBlock`: 16px plus `space-2` at the start of every line; the prompt is a real span, `aria-hidden` and
    `user-select: none`, so a selection and a screen reader take neither it nor a mark (generated content is read aloud as
    "$" in Chromium). `CodeBlock`'s optional `prompt` puts every line in the gutter, and a line after a trailing `\` gets an
    empty one; copy still takes `code` exactly as given. The terminal's copy button says "Copy commands" and copies the
    commands only, one per line. Static by default: a `figure` with a named `pre` (`tabindex="0"`) and no live region. A
    live transcript is `role="log"` only while lines arrive, never idle, paused or finished; it has a fixed height of nine
    lines that scrolls inside, so arriving lines never move the page, and follows new lines only while the reader is at
    the end. A replay has a pause control, and every word that changes in place in the head reserves its widest form.
    Long lines scroll sideways, as `CodeBlock`'s do unless it is given `wrap` (see [Lists and facts](#lists-and-facts)). (Decision 98.) The gutter is one column for the whole block, `CodeBlock`'s
    too: the prompt's width plus 1ch, at least 24px, measured by the browser and never counted in characters, so `$` is exactly
    24px and a longer prompt ("PS>") or a wide glyph widens the column for every line and the text of every line starts on one
    edge. The terminal is the container for its own head: under 30rem of its own width (not the viewport's) the copy button is
    the icon alone (Copy, morphing to Check as drawn, announcing "Copied") and keeps its name "Copy commands", so a live head is two rows
    at 390. A finished run's head keeps the callout's marks in the 16px seat (CheckCircle in the success colour; XCircle with
    "Failed, exit 1" in danger ink) and "Done" in the head's secondary ink. A replay that hasn't started shows one sentence in the
    log's box, "Press Play to start", in tertiary ink, which leaves when the first line arrives; Play and Replay make the region a
    `log` first and show the first line one frame later, so a screen reader hears it and the box is never blank for an interval. A replay copies every command whatever the playhead, and a stream the app drives
    copies what has arrived; with nothing to copy the button is off and never says "Copied". The title row's hairline, in a
    terminal and a `CodeBlock`, is a real `CanvasText` border in forced colours.
- **Loading:** progress tracks are filled with the input-boundary colour (3:1); skeletons use
  `surface-placeholder` and a calm 2s pulse; in forced colours a skeleton is a 1px `ButtonBorder` edge inside its own box and no fill (DECISIONS 167). Two spinners, one job each. The ring is for a wait: it
  is the default, and it turns in 640ms in a button, in the command menu's loading slot and wherever
  a spinner stands without a visible word. Braille is for a status: work that runs while a word
  beside it says so, in a table, a list row, a toast or a log line; never in a button, and never
  without its word. Braille is Basalt's own six-dot cell drawn in SVG, 6 by 10 with 2px dots on
  whole pixels, stepping through ten frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏) in 800ms; unlit dots are not drawn. It
  takes the status dot's place and gap, in its word's colour. Spinners on a page share one clock.
  Under reduced motion the ring fades and braille holds its first frame.
  **A page can hold every loop.** `data-loops="held"` on `<html>` stops every loop Basalt draws,
  portals included: braille, the ring, a busy Button's ring, a busy TextButton's underline, the indeterminate Progress bar,
  Sparkline's loading line, Skeleton's pulse and a written field's fill, and the page's ambient loop (its marks hold at full opacity); under the hold nothing
  starts by itself: an entrance is drawn at rest and a demonstration does not send itself. There is no per-spinner prop, and the attribute
  can't be set on a subtree. Braille holds its first frame and the ring stands still at its
  drawing, at full opacity; nothing is hidden, swapped for another glyph or announced, and the
  words still say the work is running. Skeleton and the loading line hold at their reduced-motion
  look. The indeterminate Progress bar holds as the track only, with the indicator hidden, with or
  without reduced motion: a still bar reads as a value (30% done, or a full-width bar that reads as
  done), so none is drawn. Its label still says the work is running and it keeps its indeterminate
  semantics (no `aria-valuenow`). Held is one look whatever the OS says: it outranks
  reduced motion and stops the ring's fade too, and reduced motion never turns it on. Releasing
  jumps to now: every loop rejoins the shared clock, and nothing resumes from where it stopped.
  `useLoops()` keeps the state (lazy, no module-scope side effects), stored in `localStorage`
  (`basalt-loops`) for this app's origin in this browser and carried across the app's tabs by the
  `storage` event; the server renders "running". `loopsBootstrap` is a line for the head, beside the
  theme's, so a stored hold applies before the first frame; under a policy that forbids inline scripts it is the same line as a file
  (`head/loops.js`, as the theme's is `head/theme.js`), loaded with a plain `<script src>` in the head. This is the mechanism WCAG 2.2.2
  (Pause, Stop, Hide, Level A) asks for beside content that runs for more than five seconds:
  reduced motion alone is OS-wide and leaves the ring fading, so it is not one.
  **The control is `LoopsToggle`, in the form the place needs, with the fixed name "Pause animations"** (it does not change when
  pressed; `aria-pressed` or the switch's state says it is on): on a site, an icon-only ghost toggle (`LoopsToggleIcon`, which loads no `Switch`) with the core `pause` glyph, named by its `title` alone (the browser's own tooltip on a fine pointer; no `aria-label` beside it, so a screen reader hears the name once; no `Tooltip`) in the
  site header's end cluster, first in it (before any tools and the primary Button), on any page with an ambient loop or a loop that can run past five seconds;
  in an app, a pressed toggle in the head band of the view that shows running work, in either of two forms: the Button form (`form="button"`,
  secondary or ghost, labelled "Pause animations", `size` `md` or `sm`) or the icon form (`LoopsToggleIcon`, the same ghost icon toggle as a site's), and a settings row (the
  label, the description "Moving art and spinners hold still. Your work keeps running.", and a `Switch`); and a command, "Pause
  animations", reading "Resume animations" while held. Nothing is announced when the hold changes: the control speaks its own
  state. **The app's own text is its part too:** while held, an elapsed time shows when the work
  started ("Started 3:47 PM", with the date for another day) and a streaming count or step line
  hides while the status word stays; on release the current text is written. A result lands as
  usual: the word turns to Passed or Failed and a toast speaks once. A column that holds an
  elapsed time is wide enough for the held form. A step line under a name (a two-line cell) hides
  with `visibility: hidden` while held, which keeps its box and takes it out of the accessibility
  tree; on release the current text is written into the same box, so neither the hold nor its
  release moves a row. (A step line in a column of its own just empties.) A Select's placeholder
  is `GrayText` in forced colours, as Input's and the Combobox's are, so it never looks like a
  chosen value. **Braille's size follows its word's cap height:**
  16 beside 12 to 16px text, 20 beside 18 to 24px, 24 beside 30px and up. In a status the seat is
  the braille cell's width and the gap equals it (6, 9 and 12px, `size-dot` times 1, 1.5 and 2), so
  words start at 12, 18 and 24 whichever mark is in the seat; the 6px dot stays 6px and centres in
  the wider seat on whole pixels (1 + 6 + 2 at 20, 3 + 6 + 3 at 24). The 20 cell (9 by 15) sits in a
  9 by 16 box, one hairline below, so it lands on whole pixels in any even line. A plain `Badge`
  takes the size and sets the seat and the gap, and a braille `Spinner` inside it takes the same
  size. A plain `Badge` sets no font size of its own: it is a word in its line (a cell, a row, a heading) and takes that line's size, which is what lets
  its `size` follow the word's cap height. So an app sets its base type on its root (`font: text-base` on `body`), as it sets the page's colour, and a
  plain badge outside a component is never the browser's 16px (cimip-gaps-2, B6: kept by design). The toast's 16px mark seat is unchanged. Status: decided by the council (DECISIONS 99); the
  implementation hasn't been reviewed. `LoopsToggle` and the ambient loop: decided by the council (DECISIONS 136) and approved by the
  owner (DECISIONS 139); the implementation hasn't been reviewed.
- **A control that asks the server is busy until the answer, and never sends twice** (DECISIONS 255, 260). Every button waits for its own
  press: when the `onClick` of a `Button`, `IconButton` or `TextButton` returns a promise, the control is busy until it settles. A press while
  it is busy is ignored (the handler is never called twice, and a submit or a link is stopped too), and the control is `aria-busy` and
  `aria-disabled`, keeps its focus, its label and its width, and keeps its own `disabled` untouched. Its mark shows only once the wait has run
  300ms (`WAIT_SHOW_AFTER_MS`), so an answer inside that shows nothing and never flashes, and once shown it stays at least 400ms
  (`WAIT_MIN_SHOWN_MS`), so it never blinks: the shaped skeleton's two timings (DECISIONS 247, 248), one rule for every wait. The minimum is
  the mark's alone: presses, `aria-busy` and `aria-disabled` end with the answer, so a Retry pressed while the mark finishes goes through. A
  handler on the element given as `render` is guarded the same way. The cursor is `progress` from the press. A rejection ends the wait at once and is raised again, never swallowed: the app says why (a `StatusLine`, a
  toast, the field's error). The app's own `loading` still works and wins: it shows the mark at once. A `Form` whose `onSubmit` or
  `onFormSubmit` returns a promise waits the same way: the page's own submit is cancelled (the app's handler is the submit), a second submit, by a
  button or by Enter, is ignored, and its submit buttons (inside it, or outside it with `form`, which follow the form they belong to even
  when it is replaced) are busy. A `MenuItem` whose `onClick` returns a promise closes its menu as any item does, and the menu waits:
  its trigger is busy and unavailable (`aria-disabled`, never disabled, so focus stays where it returned) and the menu does not open
  again, by pointer or key, until the answer. `waitForAnswer={false}` turns the wait off
  for a press meant to repeat ("Add another"); `useWaitMark` gives an app's own wait the same two timings. **A Button's and IconButton's mark** is the ring over the kept
  label, as `loading` draws it. **A TextButton's own mark** has no box and no seat, so nothing moves in its line: the words step down an ink
  (primary to secondary; the quiet form's secondary to tertiary, both 4.5:1; in the smoked bar, where tertiary never sits, the quiet form stays secondary and the dashed underline carries the state) and the underline, its affordance, turns dashed (a shape, so the
  state is never colour alone) in the ink and breathes from 35% to full on `duration-loop-fade`, as Sparkline's loading line does. Under
  reduced motion it keeps breathing (a colour step, as the ring keeps its fade); held, it stands still, dashed and full; in forced colours it
  is dashed in the system's ink. Braille is not used: it is never in a button. **A field being written into** by something else (an
  agent's draft, a summary written again) is `writing` on `Textarea` or `Input`: read-only and `aria-busy` at once and until the writing ends (a key typed in the look's tail is
  typed, at the end of the new text, where the caret is left), and after the same 300ms,
  for at least 400ms, its words dim to secondary ink, its boundary turns dashed (the shape of a wait, as TextButton's underline is, drawn as an inset outline so nothing moves; a focused field keeps its solid boundary under the ring) and its fill is a skeleton's, `surface-placeholder` with the skeleton's calm 2s pulse,
  on the fill alone so the words and the boundary hold still. It is not the disabled look, even with its pulse still: the boundary is dashed, the ink is not
  `text-disabled`, and the radius, size and focus ring stay, so nothing moves when it starts or ends. Empty, the pulse alone (the
  placeholder hides). Text replaces text: each new value is painted as it comes, in the same ink, with no fade (a fade on every update is a
  flash), and an empty value while writing keeps the text shown until the next text arrives, so the field is never blanked between drafts;
  it never remounts. Under reduced motion and the hold the fill stands still at `surface-placeholder`, as a skeleton does; in forced colours
  its boundary is dashed in `ButtonText`, never `GrayText`. The state belongs to the control and not to `Field`, which also holds controls
  nothing writes into (a segmented control, a select). The HTML skill's `.btn` already has `aria-busy`; the wait for a promise, TextButton's
  mark and the written field are React's alone, because a skill page runs no app handlers and has no text button. Status: decided by Opus
  under the no-council path (DECISIONS 226, 260), with the owner's direction (DECISIONS 255); the implementation is reviewed by Astra.

### More contrast

When a person asks for more contrast (`prefers-contrast: more` on the web; Increase Contrast on Apple platforms, which SwiftUI reads
as `colorSchemeContrast == .increased`), Basalt answers with three aliases and no new colour, and one role token that carries a
field's. **Lines** (the hairline, the divider, the rim and its top edge, and the pill's hairline) are drawn as `border-input`
(`line-contrast`): 3:1 or better on every surface, and on every side one solid colour. **Tertiary ink** is drawn as `text-secondary`
(`ink-contrast`). **A field's boundary** (an input, a select, a number field, a choice box, a switch, a choice card's box, an option chip's edge, a switch row's edge and the search trigger's) is
`border-field`, which equals `border-input` outside the mode and is drawn as `text-secondary` (`field-contrast`) inside it, 7.4:1 or better on every surface,
so a field keeps the strongest line; it is a role token of its own so that `border-input` itself does not step, and the progress and
slider tracks, a link's underline and a chart's baseline stay on it (stepping it would take a progress indicator against its track from
5.3:1 to 2.2:1). **A hovered edge** (`border-hover`) is drawn as `text-secondary`, so a hovered edge is never fainter than the edge at
rest (a secondary Button, a chip, a pressed toggle). Surfaces, primary and secondary ink, focus, actions, status, the hover and
selected washes and the smoked header do not change: the washes stay at their values so danger text keeps 4.5:1 on them (doubling the
selected wash put it at 3.5:1). The aliases are declared on every selector that sets a theme, after all of them, so the mode works
in both themes and under a theme chosen with `data-theme`; each alias reads the theme of the element it is on. The contrast tests
prove every text pair at 4.5:1 and every boundary at 3:1 in the mode too. A diagram's focal node draws its quiet ink at full strength, and its structure lines (`diagram-structure`) stay on the input boundary
as a chart's baseline does (DECISIONS 281). A service mark does not change in the mode. A diagram card's arrival rim (`diagram-hit`) is drawn as `text-primary`: the rim it
replaces is the input boundary's value in the mode, and secondary ink is under 3:1 against that (DECISIONS 292). Status: decided by the council and approved by the owner
(DECISIONS 138, 139 and 145); the implementation hasn't been reviewed.

### Accent classes

A product adds colour through one of Basalt's accent classes, in its named roles, and nowhere else.
Basalt ships one class today, **cobalt**: `accent.cobalt` is `oklch(0.72 0.14 264)` in dark and
`oklch(0.47 0.17 264)` in light, inside sRGB, 8.36:1 and 6.78:1 on the page.

- **A product sets one class, or none.** It writes `data-accent="cobalt"` on its root, or
  `data-accent="none"` (or nothing). A class is one ink per theme and sets one custom property,
  `--basalt-accent-ink`, as a `light-dark()` pair, so a theme nested inside an accent root still gets its own value.
  `none` and any name Basalt doesn't know reset it, and the reader falls back to `--basalt-text-primary`: a typo
  is monochrome, never another product's colour. The property is unregistered. A browser without `light-dark()`
  never gets the variable and shows the ink dot. shadcn's `--accent` is unrelated: it stays a neutral hover wash.
- **A subtree changes the class only** to show another product's own content where no other accent is in view
  (N1's demo on a monochrome site), or to `none` for shared or exported output. A portal that leaves such a
  subtree carries the attribute to its destination.
- **The accent paints only a product's council-approved role** (N1: "needs you"), as a dot or icon beside ink
  words. The word stays ink. Today `Badge` is the one reader (`status="accent"`): the dot reads
  `var(--basalt-accent-ink, var(--basalt-text-primary))`, with no accent hairline and no fill, and in forced
  colours it is `CanvasText`.
- **It is never** a fill, wash, border, link, focus ring, selection, checked control, the header or a mark, and never
  code styling, a status or the primary Button. On a chart it is only the one labelled mark that is that role, with a
  cue that isn't colour.
- **Every class passes the same tests** (`packages/tokens/test/accents.test.mjs`): 4.5:1 on every surface level and
  on the hover and selected washes over each, in both themes, on the serialized values; unclamped sRGB; at least as
  far (ΔEok, on the serialized hex) from every status colour as danger is from warning in that theme, which keeps
  an accent from reading as a status; and confinement: no read of the variable from chrome, code, focus, selection,
  links, the primary Button, checked controls or status colours, aliases included. Syntax-keyword blue is at hue 255,
  nine degrees from cobalt, so the confinement test is what keeps the two apart. A class is added as one token entry
  plus its tests, after the council approves it and a product's role for it.
- The council converged on the mechanism (8 Nov 2026) and the owner approved cobalt only for now.

### Keyboard keys

A key is a chip: a fill (`surface-kbd`, 8% white or 6% black) with no border, 20px tall and at
least 20 wide, 4px of padding either side, radius 4, in Geist Mono 400 at 12/16. One chip per
key, 2px apart, so the keys of a shortcut read as one object. Text is `text-secondary` (7.47:1 or
better in dark, 6.50:1 in light, on the chip over every surface), and `text-primary` on a hover or
selected wash. ⌘ ⌥ ⌃ have no glyph in Geist, so they are Phosphor's Command, Option and Control,
Bold at 12px in the text colour (a mark inside the chip, which is 20px tall, `size-kbd`; the choice box's check and dash are the other 12px mark); "Esc" is the word; letters, ⇧ ↵ ⌫ ⇥ and the arrows stay in Geist
Mono.

Show a chip only for a real shortcut the app binds, at most one shortcut per row, at the row's end
in Menu and CommandMenu, in the CommandMenu footer and in tooltips; never on the primary fill (the
chip is 2.23:1 there). The chip is `aria-hidden`. The item carries `aria-keyshortcuts` ("Meta+K")
and an `aria-describedby` that says it in words ("Command K"), so the name stays "Copy" and not
"Copy C".

On a touch device with no keyboard a shortcut chip has nothing to show, so it hides. A chip that
stands for a key the app binds (`data-shortcut`: Menu and CommandMenu rows, the CommandMenu footer,
tooltip shortcuts, a trigger's chip) and any words that only make sense beside one (`data-kbd-hint`:
a legend, the footer whole, its divider included) are `display: none` on `(hover: none) and
(pointer: coarse)` until a hardware key is pressed. The first Tab or Escape, or any key with
Command, Control or Alt held (never Shift alone, an arrow or "Unidentified"), sets
`<html data-keyboard="hardware">` and remembers it in `sessionStorage` for the tab. Nothing replaces
a hidden chip: the row keeps its word, and a trigger is [icon][word][chip] on a fine pointer and
[icon][word] on touch, at least 44px. A bare `Kbd` in running text is documentation and shows on
every device. The CommandMenu input carries `aria-describedby` for its footer only while the chips
show; `aria-keyshortcuts` always stays. A hybrid device shows chips after its first hardware key.

**One modifier across platforms.** **Status:** decided by the owner (DECISIONS 244: "we just need to add device detection and account for windows machines vs. macos (and I guess linux too lol)
wth the keybindings like this"; found by the first app's ⌘↵ chips in a form dialog's foot) and taken into Basalt without a vote; the implementation hasn't been reviewed. A shortcut is written once with `Mod`
(`"Mod+Enter"`, `"Mod K"`): the platform's modifier, **Command on Apple's systems** (macOS, and iPadOS or iOS with a keyboard) and **Control on Windows, Linux and ChromeOS**. `Kbd`,
`ActionShortcut`, `Menu` and `CommandMenu` rows, `Tooltip` and `useShortcuts` take it. The chips are ⌘ on Apple's systems and the word "Ctrl" elsewhere; beside `Mod`, Enter is ↵ on Apple's systems and "Enter"
elsewhere ("Mod+Enter" is ⌘↵ or Ctrl Enter). `aria-keyshortcuts` is `Meta+Enter` or `Control+Enter`, and the words a screen reader says are "Command" or "Control" ("Command Return", "Control Enter").
A string written the old way ("⌘K", "Ctrl Enter") reads exactly as before on every machine. The rule is one exported function, `isApplePlatform()`, which reads `navigator.userAgentData.platform`,
else `navigator.platform`, else the user agent, and the key-event check that goes with it, `isModKey(event)`: the `Mod` key alone, with no stray Control or Meta (test Shift, Alt and the key yourself). An app
binds with `isModKey` and writes the same shortcut as `Mod`, so the hint and the binding cannot disagree; `CommandList`'s `bindShortcut` is bound this way (⌘K on Apple's systems, Ctrl K elsewhere, and
each is left alone on the other). `useApplePlatform()` is the same answer as a hook.

A `Mod` chip is one form, the machine's, at its natural width: "Mod+Enter" on a Mac draws exactly like a hand-written "⌘↵". The platform is read at the first client render (it never changes, so
nothing subscribes to it): an app that renders on the client (`createRoot`) is right on its first frame. A server-rendered page has no machine to ask, so its server HTML and the hydrating render use one fixed
answer, Control, and its `Mod` chips settle once at hydration, with no mismatch warning; the chip's width can change then on a Mac (Ctrl is wider than ⌘), and a page without scripts keeps Control. A string
with no `Mod` is untouched. A toast's `action.keys` takes `Mod` too ("Mod+Z" is `Meta+Z` or `Control+Z`). The HTML skill's `kbd` module takes the same `Mod` (`data-kbd="Mod Enter"`, the same sources in
the same order); its chips are drawn after load.

## Type

### Code syntax

`CodeBlock` uses Shiki's TextMate grammars, the same grammar format used by editors, with a
small Basalt theme. The interface stays monochrome; syntax is a functional exception confined
to code. Four hues, as in most editor themes: keywords and markup tags blue, strings green,
constants amber, functions, types and classes purple. Comments are tertiary grey; operators and
punctuation are secondary grey; identifiers stay in the text colour. Each hue has one
lightness and chroma per theme (dark L 0.80 C 0.09, light L 0.50 C 0.12), so no role shouts
and light mode is no louder than dark. The colours are separate from status and product
accents. Every syntax colour, including comments, meets 4.5:1 on every surface in both
themes and stays inside sRGB.

Planned exception: a future diff view may show added and removed lines in the status success
and danger colours, because there they are status. It needs +/− markers and line
backgrounds as well, so it waits for that component; CodeBlock doesn't colour diffs. The source is the `color.syntax` group, generated into CSS, TypeScript and Swift.

Pass the language explicitly; a title is a display label, not a language detector. Twelve
grammars ship with the package: shell, CSS, HTML, JavaScript, JSON, JSX, Python, SQL, Swift,
TSX, TypeScript and YAML, including their common aliases. Plain text, unsupported languages
and logs over 100,000 UTF-16 code units stay plain. Each grammar is its own chunk in the app's
bundle, loaded the first time a block in that language renders; nothing comes from a CDN.
Until then the code shows as plain text, and colour arrives without moving the layout. An app
that wants highlighted HTML from the server awaits `preloadCodeLanguages([...])` before
rendering. CSS variables switch colours with the theme.
Source is rendered as React text, with its whitespace preserved; copying always uses the
original source. Comments stay upright, by choice.

### Interface type

Geist Sans and Geist Mono (SIL OFL 1.1), variable fonts, at three weights: 400, 500, 600. A `b` or `strong` inside a Basalt part (`Text`, `Prose`, a callout, the header and the rest that hold an app's words) is 600, as the HTML skill's core draws it (DECISIONS 167).
In-between weights such as 510 or 590 were considered: SwiftUI and Compose map only whole
steps, so they'd render differently on native.

| Token | Size / line | Tracking | Use |
|---|---|---|---|
| `text-7xl` | 96 / 96 | −0.045em | The hero, from 1024 |
| `text-6xl` | 72 / 76 | −0.04em | Display from 1024; the hero from 720 to 1023 |
| `text-5xl` | 56 / 60 | −0.035em | The display role from 720 to 1023, and the most a display headline takes in a column narrower than 7 of 12 |
| `text-4xl` | 40 / 44 | −0.03em | A large title in an app; not a site's hero (that is the hero role) |
| `text-3xl` | 30 / 36 | −0.025em | Page title |
| `text-2xl` | 24 / 30 | −0.02em | Section |
| `text-xl` | 20 / 28 | −0.015em | Card title; the lead from 720 |
| `text-lg` | 18 / 26 | −0.01em | The lead under 720, and an app's lead |
| `text-md` | 16 / 24 | −0.005em | Body in docs and marketing |
| `text-base` | 14 / 20 | 0 | Body and controls in apps; the rows of every popup (13 / 18 in compact) |
| `text-sm` | 13 / 18 | 0 | Tables, sidebars, and popup rows in compact density |
| `text-xs` | 12 / 16 | 0.01em | Labels, captions, a field's helper text |

Tabular numerals for tables, metrics and timestamps; Mono for identifiers, code and keys.

`text-6xl` and `text-7xl` are px, as the ten steps before them are, and the ten do not change; whether the whole scale moves to rem
so a reader's text-size setting reaches the type is a round of its own (the council split 2 to 1, and sol would have rem for every
new display value). Under the type the sans family is `Geist, "Geist Fallback", ui-sans-serif, system-ui, sans-serif`:

- **Geist Fallback** is a local face that stands in for Geist until it arrives, so the swap moves a page as little as it can.
  `fonts.css` keeps `font-display: swap` and adds one face per weight (400, 500 and 600), each from the local Arial (the 600 from Arial
  Bold), because Arial has a regular and a bold and Geist's three weights differ in width. Each has the `size-adjust` that is Geist's width
  over that Arial's, measured on the Geist file Basalt ships (102.4%, 104.7% and 99.5%, on 3,100 characters of English), and an
  `ascent-override` and `descent-override` that are Geist's own ascent (1.005em) and descent (0.295em) divided by it, with the line gap 0, so
  a baseline sits where Geist's will. Line heights are explicit in every step, so the swap never changes a line box's height.
- **It reduces the shift and does not promise the same wrap at every width.** A line within a percent of Geist's width can still break
  elsewhere: at 376 and 380 wide the sample hero is two lines in Geist and three in the fallback. Where Arial is not installed
  (a `local()` face matches a font's own name, not a system's alias for it) the next family answers. Apps preload the one Geist file
  (`<link rel="preload" as="font" type="font/woff2" crossorigin>`); it covers all three weights. The HTML skill inlines Geist, so its pages
  show the fallback only if the font fails.

### Display type

A page's large headlines and its lead (the council voted DECISIONS 137; the owner approved it in DECISIONS 139).

**Status:** decided by the council and approved by the owner (DECISIONS 137 and 139); the implementation has not been reviewed.

Two roles, hero and display, set a page's large headlines. Each is one name with three sizes, and it takes the one for the band the window
is in. A role steps at the breakpoints, on the viewport, and never with the window's width: no `clamp`, no viewport or container units in
type. `Heading size` takes `"6xl"`, `"7xl"`, `"hero"` and `"display"`; the roles are for headings, and `Text size` takes the fixed steps.

| Role | 1024 and up | 720 to 1023 | Under 720 |
|---|---|---|---|
| Hero | `text-7xl` 96 / 96, −0.045em | `text-6xl` 72 / 76, −0.04em | `text-hero-narrow` 44 / 48, −0.03em |
| Display | `text-6xl` 72 / 76, −0.04em | `text-5xl` 56 / 60, −0.035em | `text-display-narrow` 36 / 40, −0.025em |
| Lead | `text-xl` 20 / 28 | `text-xl` 20 / 28 | `text-lg` 18 / 26 |

- **The hero** is a page's one `h1` when its first screen is type. A first screen that shares the window with art or a figure sets its
  `h1` at display. One hero per page. **Display** is a section's headline on a page set at display size, and an inner page's `h1`.
- **All display type** is 600 in primary ink, `text-wrap: balance`, at most `size-display-measure` (13em, about 28 characters of Geist at
  600) wide, in the full row or a span of seven columns or more; anything narrower takes `text-5xl` at most.
- **Breaks:** never a `<br>`. A break that is right at 1440 is wrong at 390. Two sentences meant as two lines are two block spans
  (`.basalt-text-line`), each balanced on its own.
- **The phone size is a row width.** The narrow sizes are for the 288px row at 320 (WCAG 1.4.10): at 44px and −0.03em most words fit it
  (Geist 600 sets "Responsibility" in 279px), and a word that does not fit breaks. `overflow-wrap: break-word` is the net, never the plan:
  a headline that needs it has a word too long for its size, and a page's own check lists the words it broke, since an overflow check
  cannot see them. Docs and examples show the roles on a phone and never a fixed `6xl` or `7xl` there: a fixed 96px breaks "Plain" at
  320 under text spacing.
- **Line height 1.0 at 96.** Geist's accented capitals are 0.952em tall and its descenders 0.162em: at 96/96 only an accented capital over
  a descender can touch, as in any display setting near 1. Lines under 1 were not adopted.
- **The lead** is the paragraph under a display headline: weight 400, secondary ink, `size-prose-width` on the row's start edge,
  `text-wrap: pretty`, `space-6` under the headline (`space-4` under 720), with the actions `space-8` below it (`space-6`). The part is
  `Lead`. The HTML skill's `.lead` (16/24, under a report's `h1`) stays as it is; its `.text-lead` is this one.
- **Why steps:** a viewport term takes back part of a reader's zoom, wraps a headline differently at every width, and has no equivalent
  on native. Steps keep one stated size, three shapes to review, and the same values in Swift. At 200% page zoom the window moves down a
  band: a 1440 window's hero is 72 CSS px, 144 device px.
- **On Apple platforms** a role takes its large values in a regular width and its narrow values in a compact one, scaled with Dynamic Type
  relative to `.largeTitle`; `size-display-measure` is generated as a number of ems (13).
- A site's own display weight and case (the personal site's 300, Castle's 800 capitals) and its own grid are the site's and not Basalt's.

## Space, size, radius

- **Space:** a 4px base, with Tailwind-compatible names (`space-4` is 16px), plus the half
  steps 0.5, 1.5, 2.5 and 3.5 (2, 6, 10 and 14px) for control padding and optical spacing, and `space-32` (128px), the large section gap. There is no step above it: a larger length is a size with a role (a label column is `size-description-label`, 160), not a gap.
- **Component sizes are tokens too:** the tab underline (2), tracks (4), dots (6), choice boxes,
  the switch, kbd and badge heights, table rows, and the widths of dialogs, sheets, toasts,
  popovers, tooltips and the command menu, all under `size-*`. Component CSS has no raw
  lengths; Stylelint enforces it. Where a raw value is right (a breakpoint in a container query, which cannot read a token; a size that follows the window or
  the text, in a viewport or font-relative unit; the screen-reader clip) it carries a lint exception on the line before, with its reason.
- **Controls:** 24, 28, 32, 36 and 40px tall, and from DECISIONS 154 44, 48, 52 and 56 (`size-control-2xl` to `-5xl`; 64, `-6xl`, is the least height of a
  two-line button); 32 is the app default, and
  `data-density="compact"` moves controls down one step (24px is the floor; 56 to 52, 52 to 48, 48 to 44, 44 to 40) and uses 13px
  control text. Set it on `<html>` so portalled menus inherit it; a nested
  `data-density="default"` restores regular sizes. A popup row (Menu, Select, Combobox) is a 36px plate (`size-menu-row`, which is
  `size-control-lg`) in a 40px hit area, and a command menu row a 40px plate in a 44px hit area; compact steps the plates to 32
  and 36; on touch a hit area is at least 44px, and a combobox's text entry is 16px. All shared control targets stay at least 44px on
  touch, and in any window under 720 whatever the pointer (the phone's layout is the touch layout: a phone-width window with a mouse draws the same 44px
  controls, rows and link boxes; text entry alone stays 16px only on a coarse pointer, since it is there to stop iOS zooming), regardless of density, except a chart's day, which is reached by drag and by the keys (a press lands on the nearest day, the keys reach every day, and "View as table" holds every value, so the day is not a target of its own); the phase lane's marks keep 44px. A notification entry is at least 44 tall on touch, its line centred (a one-line entry is 40 otherwise
  and its plate stays 40; a two-line entry is 58 already). A `Link` on a line of its own has a 44px hit box on touch with no change
  to layout and no change to its look (its block margin takes back what the box adds, the underline stays and no wash is drawn); a link in a
  sentence (a paragraph, a list item, prose, a hint, an error, a callout's text) keeps its line, as WCAG 2.5.8 allows, because a taller
  box would lie over the lines above and below it, and no two targets overlap. Links stacked one per line keep their lines too: each link's words
  are a label painted over every neighbour's box, so a box only takes room that no words are in and a tap on a link's own words is always that link's
  (the same for a link in a description value and a `TextButton`). The HTML skill's bare anchors have no label to raise: links stacked in a
  column (`.stack`) each give up the side of their box that meets a neighbour, so their boxes meet and never overlap; a row of links keeps whole boxes. Status of the width rule and the stacked links: decided on the no-council path
  (DECISIONS 265, batch B5); not yet reviewed. **Status:** decided by the council (DECISIONS 138) and
  approved by the owner (DECISIONS 139); the implementation has not been reviewed. Choice labels provide their target without enlarging the
  glyph; a standalone choice must be placed inside a target of at least that size by its
  consumer. Text entry is 16px on touch to avoid iOS focus zoom.
- **Radius by role,** by the size a box is drawn at (so a 32px control drawn at 44 on touch is 8, and a `NumberField`
  group drawn at 40 is 8): 2 (a coverage strip's cells, `radius-2xs`), 4 (badges, checkboxes), 6 (controls up to 32px, inputs included), 8 (controls 36px and up, code
  blocks and callouts), 12 (cards, menus, dialogs), 16 (bottom sheets, and the narrow menu's bottom corners; full-height
  side sheets are square), full (whatever is a circle or a capsule by meaning: avatars, dots, the navigation hover pill, the
  switch, the radio, the slider's track and thumb, progress, meter, and the tab bar's circle). A nested radius is the outer
  radius minus the padding: a segmented control on touch is a track of 8 holding 44px segments of 6. 8 also takes a diagram's node and
  table card; 12 a diagram's group; full a flowchart's start or end (DECISIONS 281). **An app tile is a superellipse of exponent 5 at every size and takes no radius** (DECISIONS 162, vote 6; the shape is drawn by the tile's clip, and its hairline follows it). Status: decided by the council and approved by the owner (DECISIONS 138 and 139; the tile, DECISIONS 162); the implementation hasn't been reviewed.

## Elevation

Depth is [levels](#surfaces), and a panel's edge is its rim. Page-level panels have a rim and
nothing else; shadows start at things that float. Menus and popovers use `shadow-overlay`,
dialogs and sheets `shadow-modal` over a scrim, and both are the drop shadow alone: no 1px ring
layer and no page-coloured backing ring, because the rim is the edge. Tables run 40px rows by
default, 32px for logs (`density="compact"`) and 44px for touch.

The rim is one thing, kept to one rule: two solid colours, no gradient along or across the edge, no
inner glow or sheen, no blur, no animation, no outer frame, and no light falloff on the page. The
top is lit by 2 points in dark (8% against 6% white), capped at 8% so it reads as an edge and
not as a highlight. In light every side is the same. Blur belongs only to the header chrome material
(below), never to a panel or its rim.

The Toast's drain line is drawn on the straight part of its bottom rim, 1px, in `text-tertiary`. A status callout's rim is
the one coloured rim: the status colour at 45% over the callout's own level, one solid colour on every side, so it is
never the sole cue and no gradient or glow comes with it.

### Chrome: the smoked header

An app's own sticky header bar is the one smoked surface in Basalt. Dialogs, sheets, menus, popovers,
toasts, tooltips and the command menu stay solid, as they are: an opaque panel on a scrim is the
overlay, and a translucent layer on a translucent layer is the failure mode.

- **Tokens.** `surface-chrome` is the page colour with alpha: `#000` at 92.5% in dark, `#fafafa` at 96% in light (the owner's midpoint between the first smoke, 85% and 92%, and solid; DECISIONS 146 E). Over a white picture the dark bar is `#131313`, a shadow of what passes under, not a window onto it. `blur-chrome` is 12px. There is no `saturate()` and no brightness filter: on a
  monochrome page they tint noise or do nothing.
- **The class.** Put `basalt-chrome` on the app's `<header>`. It is a plain class (no component: a header
  is the app's own layout) that sets `position: sticky; top: 0` on the sticky layer, the fill,
  `backdrop-filter: blur(var(--basalt-blur-chrome))` with the `-webkit-` prefix, a 1px bottom
  `border-hairline` line, and primary ink. The bar's line is the exception to "a divider is never brighter than the
  rim" (see Lines): the bar sits on level 0, is not a panel and has no rim, so in dark its line is the hairline
  (14.5% white) where a divider is 6%. In light it is black 8% either way. The council decided this by majority (3-1).
- **Fallbacks, all to opaque.** Without `backdrop-filter` (`@supports not`), under
  `prefers-reduced-transparency: reduce`, and in print, the fill is opaque `surface-page` and there is
  no filter. In forced colours it is `Canvas` and `CanvasText` with a real bottom border and no filter.
- **Ink.** Only `text-primary` and `text-secondary` may sit on it. Over a pure white plate the dark bar
  holds secondary at 9.60:1 (tertiary 6.32:1), and over a pure black plate the light
  bar holds it at 7.42:1 (tertiary 4.68:1); primary is 15.73:1 or better. Tertiary passes on the bare bar, and in dark it now passes on the selected wash too (5.00:1 over white; it was 4.0:1 before DECISIONS 166), but in light it still falls to 4.01:1 there, so the rule keeps it off the bar in both themes. The class sets primary ink and
  promotes tertiary text (`Text tone="tertiary"`, a Sparkline axis) to secondary inside it, and no Basalt
  part draws tertiary text on the bar without a fill of its own. An app does not put tertiary there.
- **A pressed ghost Button takes primary ink.** Inside the bar only, a ghost Button held down shows `text-primary`
  on the selected wash (secondary ink is 7.59:1 there in dark, 6.34:1 in light; it was 4.40:1 at 85%, before the midpoint; primary is 13.2:1 or better). The wash stays. The council decided this by majority (3-1); elsewhere a ghost keeps its ink.
- **No danger Button on the bar.** Destructive actions don't belong in global chrome (the owner's rule). Danger
  text would now pass on the bar's washes at the midpoint (5.05:1 pressed in dark over white, 4.79:1 in light over black); the rule is the owner's.
- **Under a dialog's scrim the bar stays filtered.** It is the one blurred surface and the scrim over it is
  unblurred, so the two never stack blur (the council decided this 4-0, and it is what is built).
- **Use it once per viewport.** This is a usage rule, not a guarantee. Basalt ships one filtered class and
  no filtered overlay, and a browser test opens the dialogs, sheet, command menu, menus, popovers, tooltip
  and toast together to prove that, but an app can put `basalt-chrome` on a second element. Don't:
  translucent layers never stack, so no smoked dialog under, over or inside the header, and no blur on a
  scrim (80% in dark, 40% in light, unblurred).
- **Where it can go.** The bar sticks to its scroller, so an `overflow` ancestor between the bar and the
  scroller (anything but the scroller itself) stops it sticking. `backdrop-filter` also makes the bar the
  containing block for any `position: fixed` descendant, so a fixed element inside the `<header>` is
  clipped to the bar: portal it out. Basalt's own overlays already portal.
- **Use it where something scrolls under the bar.** If nothing does, an opaque `surface-page` bar is
  the same bar without the layer (`solid` on `SiteHeader` and `AppHeader`).

#### The clear bar over art

A site's header may be clear, with no fill and no blur, over full-bleed art at the top of its page, and only there (decision 104; the
council voted 8.5, 8.5 and 8, a three-member round, DECISIONS 93).

**Status:** decided by the council (DECISIONS 104); the implementation has not been reviewed.

- **When it may be clear.** `SiteHeader` only (never `AppHeader`, never the opaque form `solid`), over a [stage](#art) that has declared its
  headroom passed, at the very top of the page, while the page is at scroll 0. Smoked is the default and the fallback: no stage, a stage
  that has not declared its headroom, no script, reduced transparency, forced colours and print all keep the smoked bar. Clear is an
  enhancement the art earns.
- **What clear is.** No fill, no blur and a transparent hairline: the line is a transparent border, so the bar is 56px in both states and
  nothing moves when it arrives. The bar sits on the art with no scrim, gradient, text-shadow or blend. The ink is always the theme's own
  and never changes (art that does not fit the theme gets the smoked bar from the top, not a second ink). The focus ring is the standard
  ring.
- **Why this holds AA without a scrim.** The art keeps the [headroom](#art) quiet: no pixel of it is lighter than `art-quiet-limit` in dark
  or darker than it in light, so the weakest ink in the bar, `text-secondary` (links at rest), holds 4.5:1 on it (6.53:1 in dark, 4.60:1 in
  light), and the focus ring and the icons hold 3:1. `text-primary` holds on the selected and hover washes over the limit (8.64:1 and
  9.51:1 in dark, 8.42:1 and 8.97:1 in light, at worst). One tone further (tone 3) secondary falls to about 2.7:1, which is why the limit
  stops at tone 2. The contrast tests carry these pairs.
- **The change.** From the first pixel of scroll the bar is the smoked bar again. One `IntersectionObserver` on a 1px sentinel at the
  document's top reports where the page is (there is no scroll handler, and the rubber band above the top counts as the top). The fill
  (`surface-chrome`) and the line (`border-hairline`) fade in over `duration-base` on `ease-out`, and back to clear at 0.75 of that on
  `ease-in`. The blur (`blur-chrome`) switches at once, in both directions, and the ink does not change. Under reduced motion it is the
  duration tokens' 100ms fade. A departure from the top that the observer first reports past the headroom's slack (24px: `size-stage-headroom` less
  `size-header`) switches all of it at once, because art past the headroom is already under the bar and there is no fade for it to show
  through. That is what the build catches: an instant anchor, a `scrollTo`, a restored scroll position, a scroll the browser does not
  animate. A scroll the browser animates (Page Down, Space, or an anchor with smooth scrolling on) is first reported inside the slack, so
  it gets the decided fade. A page that opens at the top is clear in its first frame when script runs, with no fade from smoked; without
  script it stays smoked.
- **The menu from a clear bar** is the narrow menu, unchanged: a solid top sheet on Base UI's Dialog, its first row drawing the bar in
  place, focus on Close. Closing returns the bar to the state it was in.
- **Fallbacks.** Reduced transparency: opaque `surface-page` with its hairline, from the first frame. Forced colours: `Canvas` and
  `CanvasText` with a real line. Print: the bar is static and opaque, decorative stage art does not print and the stage takes its place in
  the flow. Without `backdrop-filter`: clear still works at the top, since it uses no filter, and the scrolled state is the smoked bar's
  opaque fallback, `surface-page` with its hairline. (The HTML skill's top bar prints the same way: static and opaque.)
- **Translucent layers never stack.** A clear bar has no fill, so it is not a layer. Nothing translucent goes on a stage, and a panel on a
  stage is solid, at level 1, with its rim.

Portals inherit a shared modal-depth context. A menu, select, combobox or popover opened
inside a modal sits above its parent. A necessary nested confirmation has a backdrop above
the previous popup. Tooltips use their intended layer, a tooltip role and an explicit
trigger description while open, preserving any existing description. Keep one focused task at a
time; layering support is not a reason to stack unrelated tasks.

**Level is position, not importance.** A surface in the page's flow is its parent plus one, whatever its
role: a hero, a console or a featured card on the page is level 1, and its input band and the panels
inside it are level 2. Only a surface that leaves the flow (opened above the page, out of the flow,
overlapping other content: a menu, popover, dialog, sheet, toast or tooltip) carries a shadow, and its level
follows the popup and modal rules above: a popup is its opener plus one (a floor of 1), a modal is 1, a toast is 1. Don't use `float` or an explicit level to make an in-flow panel look more important;
use space, type and the content. A static picture of a floating surface in documentation is drawn as
that surface. `data-level` is written only to re-base a subtree (a page, a portal, a specimen frame),
never to promote a panel.

The command menu is a modal panel at level 1 (`#0a0a0a` in dark). Its input row is a full-bleed band one level above
the panel (level 2, `#111111`, in dark; white in light, set by the band's own `data-level`, not a fixed surface),
48px, with a divider below and no rim or radius of its own. Its rows are popup rows with a taller plate: 40px (36 when
compact) in a 44px hit area, radius 8, 4px in from each side of the list, 12px between the glyph and the label; the plate stays
lit when the pointer leaves a row, as cmdk does everywhere. Menu, Select and Combobox clear it, as Base UI does, but their rows
touch (the 4px gap between plates is drawn inside the rows, 2px above and below each plate), so a pointer crossing the gap never
leaves one. A panel's padding is 4px inline and 2px block, so a plate is 4px from the rim on every side. It is summoned from the
keyboard many times a day, so it neither opens nor closes with motion, its backdrop included.

**Status:** decided by the council (DECISIONS 103); the implementation has not been reviewed. A three-member round (DECISIONS 93).

### The command list in the page

`CommandList` is the command panel set in the page, not a new surface: the same cmdk body, band, rows and plate, in a level-1 panel
in the flow (its parent plus one) with its rim and no scrim or shadow. The band is the modal's: 48px (`size-command-input`), a divider
below, one level up, no rim or radius of its own.

- **Focus lives in the field**: a combobox with `aria-activedescendant` on a `listbox` of `option`s in labelled groups. ↑ and ↓ move
  with wrap and snap the plate; ↵ runs the row; Tab leaves (the list is one stop in the page's order); Esc clears the query and does
  nothing when it is empty, and never blurs or closes anything. **No autofocus on load**: it would steal a screen reader's start and
  raise a phone's keyboard.
- **The field takes the flush-field −2 ring**, because in the page it is one stop among many. The modal's field is its only stop and
  stays ringless.
- **The plate shows only while the list is in use**: while the field has focus or the pointer is over the list. It fades, as Menu's
  does, when neither is true, and while the field has focus it stays when the pointer leaves, because it marks what ↵ will run. A page
  at rest with one row lit reads as a selection that isn't there, except the opening list, whose cursor row is lit at rest because the cursor is its state. (The modal's plate is always lit: the modal exists only while it is used.)
- **The list holds its unfiltered height**, up to `size-popup-max-height` (360), and scrolls inside. Filtering never changes it, so
  what is below it never moves: the still table's rule, applied to a list.
- **A foot band** shows the count at the start ("9 commands", "3 of 9") and the key legend at the end (`data-kbd-hint`, hidden on touch). The
  count is shown at once and spoken once, through a polite, atomic live region after 400ms of stillness (`FilterResult`'s rule). No match
  is one centred sentence ("Nothing matches “zzz”.") and a ghost "Clear search", in the held area and outside the listbox, so the button is valid.
- **Until cmdk arrives** the rows are drawn as they will be and what is typed is kept, then becomes the first search. cmdk stays behind
  its dynamic import, loaded when the list first mounts.
- **Where the modal command menu sits** (DECISIONS 167, Q7c): its top is `max(16px, 12vh)` and its height is capped at 480px or what the window leaves under it, as the skill's palette is.
- **⌘K belongs to one command surface per page.** A page with a modal `CommandMenu` gives ⌘K to the modal, and its list has no
  shortcut of its own. A page whose command surface is in the page gives ⌘K to that list (`bindShortcut`): focus the field, select its
  text and scroll it into view, and that page has no modal. The component offers the binding; the app chooses which surface owns it.
  A ⌥ plus letter chip on a row is ignored while typing, as in the modal, so it can't be used from inside the field.

#### List plus preview

A pattern on the in-page list (`detail`), not a new surface: the list, and a pane the app renders for the active command.

- **Two level-1 panels `space-4` apart**: the list a fixed `size-list-width` (320px), the pane the rest, equal in height, with no line
  between (Basalt allows only the vertical lines it names under [Vertical lines](#vertical-lines); space groups these). The pane scrolls inside if it is taller.
- **It answers its own width, not the viewport's**: side by side from `size-list-width` + `space-4` + `size-breakpoint-container`
  = 816px of its container's content width, so the pane is never narrow beside the list (and what is in it, a description list or a
  chart, never goes to its narrow form); below that, the push. The container query writes the number, because it can't read a token,
  and names all three.
- **Hover lifts a row's ink only.** The plate, which marks what the pane shows, moves only by ↑ ↓ in the field or by a press (a press
  glides it, a key snaps it), and it stays lit when focus leaves. A pointer crossing other rows to reach the pane would otherwise repaint
  half the component.
- **↵ runs the pane's primary action**: its first button, so ↵ is never a surprise. Tab goes into the pane's controls in order. The pane
  is a `region` named by its heading and isn't live: the option's name already says the row on each arrow.
- **The push, under 816**: the list alone, a chevron at each row's end on the title line. A tap or ↵ replaces it with the detail, the
  same panel with a Back band at its top (a ghost `sm` button, a chevron-left and the list's name, labelled "Back to …"). It enters
  from 8px along the reading direction with a fade over `duration-slow` on `ease-out` (a fade alone under reduced motion; the travel
  flips under `:dir(rtl)`). Focus moves to the detail's heading (`tabindex="-1"`, no ring, since nothing operates it). Back keeps the
  query, the scroll and the active row, and returns focus to the field with a hardware keyboard, or to the list's region on touch, so a
  phone's keyboard doesn't spring up. It isn't the pane below (the pane would sit below the fold, and a tap would change something you
  can't see) and isn't a sheet (a modal on a page that has none, hiding the list you came from).

### Two-line rows

A row may carry a `description` (`CommandItem`, `MenuItem`, `MenuRadioItem`, `MenuCheckboxItem`, and Select's and Combobox's options).
The padding is the one-line row's, so a two-line plate is the one-line plate plus `text-sm`'s line height:

| | one line: row / plate | two lines: row / plate |
|---|---|---|
| Menu, Select, Combobox | 40 / 36 | 58 / 54 |
| Command menu and list | 44 / 40 | 62 / 58 |
| Menu, compact | 36 / 32 | 52 / 48 |
| Command, compact | 40 / 36 | 56 / 52 |

- **Type and ink.** The title is 14/20 at 400, secondary at rest and primary when lit. The description is 13/18 at 400, tertiary at rest
  and secondary when lit (in light tertiary on the plate falls under 4.5:1; in dark the step is kept as a rule, DECISIONS 166), with no weight change; compact is 13/18 over 12/16. The 20 and 18
  line boxes touch, with no gap.
- **Where things sit.** The glyph, a check seat, a key chip and a time sit on the title line, centred on it; the description runs from the
  text's edge to the row's end, under the chip's column too. The title is one line and truncates with an ellipsis. In Select, Combobox and the command menu
  and list the description truncates too and never wraps, so a row's height is known. **In a Menu the description wraps** (DECISIONS 275, the owner's option B, from
  the pictures in round 56): the menu stays at most `size-popover-max` (320) wide, a description longer than that wraps inside it, and the row grows by the
  description's line (18) for each line it takes. The row's own plate covers the whole taller row, the shared plate takes each row's own height as it glides
  (as between a one-line and a two-line row), and the title line keeps its glyph, check and chip.
- **Mixed lists.** One-line and two-line rows may share a list, each its own height, and the shared plate changes height as it glides.
  A row with no description is one line: it holds no empty second line.
- **Danger.** The title and the glyph take the danger ink; the description keeps its own.
- **Names.** An option's name is its content in reading order: title, description, hint. The key chip stays `aria-hidden`.
- **Search.** Descriptions are search keywords, ranked below title matches. There is no match highlighting: bold letters change widths as you type.
- **Where to use it.** Freely in the command menu and the list. In Menu and Select, describe a choice only when the label alone can't tell the
  choices apart (a visibility, a role, a plan, a model), never to explain an obvious action ("Copy link" stays one line). A described
  menu is as wide as its content, up to `size-popover-max` (320), and then a Menu's descriptions wrap (Select's and Combobox's truncate).

### Overlays and search

Ported from the approved sites and decided by the council in DECISIONS 155 (a four-member vote; the owner's "port what is approved" in DECISIONS 151). The
implementation hasn't been reviewed.

- **The popover stays 320.** All four refused a wider size: N1's popover drew at `size-popover-max`, so none is built. A **wide dialog** (`size="wide"`) is
  `size-dialog-width-wide`, 992px, decided in DECISIONS 158 (Q1; 3 to 1; DECISIONS 155's `118ch` was withdrawn, because on Basalt's dialog it draws 1,251.7px): 118 characters of Geist Mono at 14px (991.17px) rounded up, kept in px because the dialog's own face is not mono and Basalt's type sizes are px; capped by the viewport less 2 × `space-4`, with the dialog's own padding and scroll. Its first focus is
  its title (`tabindex="-1"`, no ring), so Enter on opening runs nothing. A wide `form` is not a reading dialog: it keeps a form's first focus, on its first field (the title when a touch opened it), so Enter on opening is a field's own (DECISIONS 242).
- **Scrim.** Dialogs and sheets keep Basalt's `scrim` (black at 80% in dark, 40% in light); a product may re-point the token (4 to 0).
- **A sheet's anatomy.** A head band (the title at `text-xl` 20/28, a count at `text-sm` in tertiary, a 44px close), a scrolling body and a foot, edge to edge with
  no padding of the sheet's own; a `border-divider` under the head and above the foot; the head and the foot keep the safe areas. Motion is the sheet's own (300ms in,
  225ms out). A sheet that swaps its body in place (`step`) moves focus to its own title and scrolls the body to the top, so the new title is read out. A focused control's ring is never cut by the sheet: the scrolling body keeps `space-1-5` at each end, and a sheet's held actions keep
  `space-1-5` of clear room above their divider (B5 fix pass 1).
- **The drawer** is a region in the flow with two titled halves: no portal, scrim, level reset, sheet motion, shadow, fill, rim or corner radius. Its top is a
  `border-divider` and nothing else (4 to 0; the prototype's brighter line broke the divider rule). Its height is the app's, in 24px rows. Under 720 it is a page that
  replaces the record, with a Back button, its halves stacked on a divider.
- **Search.** The trigger is a button shaped like a field from 720 (`size-search-trigger` 200 by 44, a 1px `border-field` edge, radius 8, the word `aria-hidden`) and a
  44px icon button under it. The dialog is centred at `size-command-width` (560) and its results area is a fixed height, a full result's, that scrolls inside, so the
  field and the count never move (4 to 0). A result is a link sized to its picture with 6px above and below: 72 for a 48 by 60 pack, 60 for a 96 by 48 logo, 48 at
  least (the 48 is a floor, not a size). Results are links and tab stops, each with the control ring at +2, 8px from the panel's edge, and a hover wash that runs
  full bleed and lifts no ink (the name and the detail both keep their ink: tertiary passes 4.5:1 on the wash over the dialog's level, 6.00:1 in dark and 4.88:1 in light, secondary 9.12:1 and 7.74:1, so no step is needed); there is no active row (3 to 1; one member wanted options in a listbox with arrow keys). The field's mark is a real 2px outline at −2
  round its band (no majority, the vote's first option stands). The browser's own clear × is hidden: the band has one ×. The count is `FilterResult`'s debounced line.
- **The listbox and the opening list.** A listbox is a single choice that stays in the page, with one tab stop, `aria-activedescendant`, and a choice that follows
  the arrow keys; the chosen option has the core check in its gutter (the open list keeps its cursor chevron; DECISIONS 167) and primary ink, and its weight does not change. Rows that open have the name as a button stretched
  over the row, one cursor row with the one tab stop, a `↵` chip on it only (`aria-hidden`, hidden on touch, 4 to 0), and a filter that leaves every row in place: a
  non-match steps to tertiary ink, hides its cells, and the cursor skips it (4 to 0; no match mark). Rows are 24 (radius 6), two lines 48 and a coarse pointer's 44
  (radius 8), by the drawn-box rule. Focus is the control ring on the listbox's own box: 2px at +2 with corners of radius 8 (DECISIONS 159, the owner, on a 2 to 2 deadlock in DECISIONS 157, Q2; not square), the list 6px from a clipping edge, or the same ring inside at −2 where the list is flush (its outer curve is the box's corner, 8, its inner 6). The list has no fill or border, so the radius draws nothing at rest, and the rows scroll in a box inside it, so the rounded corners clip no row.
  **Cut text is read whole on a plate (DECISIONS 168 and 170; `peek-plate.ts`).** A listbox option or an open-list row whose name or second line is cut shows it whole on the row
  itself, raised to level 3: the rim, `shadow-overlay`, radius 8, the row's own inline edges. Every word that was showing stays on its pixel (the check or chevron, the name's first line,
  the trailing word or the cells, the `↵` chip), and only the cut text carries on: the name runs on under the cells across the row's width, then the detail whole. It grows downward, and its foot
  never ends inside a line of text (where it would, it runs on to the end of that line, at most one). It keeps the row's state: the chosen option, or the cursor row while the list holds focus,
  keeps its chosen fill. It is the still table's cut cell in behaviour: it opens on hover after the tooltip's wait (600ms, then at once within 400ms of another) or at once on keyboard focus,
  Esc closes it and moves neither the pointer nor focus, it stays while the pointer is on it or focus stays (WCAG 1.4.13), it fades over `duration-base` and never scales (opacity only under
  reduced motion), and it is `aria-hidden` because the row holds the words. A press on it is a press on its row (it chooses the option, or opens the row), and the listbox takes focus
  without the keyboard ring, as a press on an option does. Opened by the keyboard on the open list it carries the control ring at +2 round the plate and the row's own ring gives way; the
  listbox keeps its ring on the list. A part whose text is not cut opens nothing. The open list keeps its "…" at rest. On touch the listbox has no hover, so its options wrap at rest (the
  name and detail wrap, the mark and the trailing word sit on the first line; the 44px floor holds) and none is cut, and the open list opens its plate on a 500ms long press: the release opens
  nothing, and a touch elsewhere closes it. Right to left mirrors the plate's edges and seats, and in forced colours it is `Canvas` with a `CanvasText` rim.
- **Search in a page or a panel, with results from a server** (`SearchField`, `SearchPassages`, `SearchPassage`, `SearchMatch`, `markMatches`). A search
  over one place (a document, a channel's history, a project's records) that runs on the app's server and returns passages, drawn in the page or a
  panel, never the site search dialog (whose results are a fixed-height area of picture rows). `SearchField` is an `Input` in a `role="search"` form
  with the core search glyph 10px inside its start in tertiary, and while there are words a 24px clear button (the core ×, "Clear search") 4px inside
  its end; both seats are padding, kept whether the button shows or not, so the words never move, and the browser's own × is hidden. The first Esc
  empties the words and goes no further; the next is the app's (`onEscape`: it closes its search, and nothing round the field closes with it); an
  Esc that cancels an input method's composition is the input method's. A `disabled` or `readOnly` field cannot be cleared: its × is disabled and
  Esc leaves the words. The count line is the app's `FilterResult` (drawn at once in
  tertiary, spoken once it holds still). `SearchPassages` is an ordered list in the server's ranking that keeps `space-1-5` from its edges; a `SearchPassage`
  is a link (`href`) or a button with the notification entry's row geometry (a plate inset 2px, radius 8, 12px to the words, the control ring at +2):
  a head line of the source (who said it, or the section it is in) in primary at 400, cut, and the meta at its end (`text-sm`, tertiary, tabular,
  lifting to secondary on the plate), then the passage in secondary at `text-base`, wrapping (its length is the server's). A **match** is a `mark` in
  primary ink at 600 with no fill: monochrome, so the ink and the weight are the mark, never a highlighter colour; in forced colours it keeps its
  weight in `CanvasText`. `markMatches(text, ranges)` draws a server's ranges (UTF-16 offsets, joined where they overlap or touch, clamped, a boundary
  inside a code point widened to the whole of it, in any order) and never parses HTML. `current` is the passage shown beside the results: `aria-current` and the source at 600. **A results budget** is the caller's: `rows` (and `lines`, two by default) make the list as tall as that many passages, scrolling inside, so the field and the count never move; unset, the list grows with its page. The query, its paging and any grouping are the app's. The site search's `SearchResults` keeps its counts (three logo rows, five picture rows and "See all") as a shop's presets that any app sets (`logoRows`, `rows`, `all`; the skill's `--_logos`, `--_packs`, `--_alls`), found by the agnosticism audit (cimip-gaps-2, F7). **Loading:** the first
  results are a `LoadingShape` of stand-in passages (bones in the list's own shape); a changed query keeps the last results on screen
  (`refreshing`) and shows `Refreshing` ("Searching") only after a second; no results is the app's sentence in the list's place. React's alone (the
  HTML skill has no search over a server).
- **The notice bar** is a full-width band above the header, in the level-1 fill with a `border-divider` under it (no majority, the first option stands), `text-sm`
  secondary with its first words primary at 600; it is a named region, not a live region, and under 720 it keeps 6px more above its line.

## Navigation

`Nav`, `NavGroup` and `NavItem` are an app's sidebar and its collapsed rail, drawn X's way (decisions 42, 45, 48 and 49, the
glyph ink in 55 and the glide in 69 and 70). Their markup is a `nav` landmark with a name, lists of links, optional group
labels, and `aria-current="page"` on the current link.

- **The item** is a link whose row is the column, so the target is the whole row, and a pill inside it that hugs its
  content. The pill is 48 tall and fully round, 12 before the glyph and 20 after the label, with the glyph at 24 and the
  label at 20/28 (`text-xl`), 16 between them. Glyph and label are both primary ink at rest. Each row carries 2px above and
  below its pill, so neighbouring rows touch and a pointer crossing between them never leaves a row. The column keeps at
  least `space-1-5` of inline padding so the focus ring never clips.
- **Hover** is the hugging pill at the selected wash (9% white, 7% black; `#171717` over the dark page and `#e8e8e8` over the
  light one, about 1.17:1), never the column's width. The label stays primary on it (16.2:1 in dark, 14.6:1 in light). **Pressed**
  is the same pill: hover already sits at the wash, so there is no further step, and on touch the pill is the press. Nothing
  scales.
- **Current page** is the glyph's selected form and the label at 600, with no background, no bar and no outline. The label
  reserves its 600 width, so becoming current moves nothing. A current item that is hovered has both.
- **The rail** is a 48px circle around the glyph. The label is the item's accessible name, and a tooltip shows it on hover
  and on focus. Group labels stay as the group's accessible name. Counts and dots are spoken with the name and are not drawn
  in the rail.
- **Count and dot.** A count is a number in secondary ink after the label, and a dot is a 6px dot in the label's own ink;
  its words ("New activity") are spoken with the name. Never a coloured disc.
- **The glide** is the hover glide above, in navigation. One shared pill per list travels between items on `duration-base`
  and `ease-out`, constant, and changes its width to hug each item. Entering from outside it appears in place at once.
  Leaving, a move in progress freezes and the pill fades in place over `duration-fast` on `ease-in`; a return during that
  fade (the grace) travels from there. **The first key hides it at once** and the focus ring shows: the control ring at +2
  around the hugging pill, and a hover resting under the pointer is hidden too, so only the ring shows; the next pointer move
  brings the glide back in place. It is off on touch, under reduced motion and in forced colours. Each item paints its own
  pill otherwise, which is also how it looks with no script: in at once, out over `duration-fast`. In forced colours the
  hovered item is `Highlight` with `HighlightText` and no backplate.
- **Touch and density.** A row is at least 48 tall on touch. Compact steps the pill down to 40 (a 40px rail circle), with a
  floor of 44 on touch, so a row is still 48.
- **The second size** (`Nav size="sm"`): a quieter list under the main one, such as recent items, saved views or a workspace's
  projects. The same item, hover, glide, current page, ring and rail, a step smaller: a 32px pill (`size-control-md`), the label at
  13/18 (`text-sm`), the glyph at 16, 8 before the glyph and 12 after the label (12 either side with no glyph), 8 between, and a count
  at 12/16. Each row still carries 2px above and below its pill (a 36px row). Under the main list it starts `space-4` below it. Compact steps it to 28, and on touch it is 44. In the rail
  it is a 32px circle on the same centre line. It is the main list's size that marks the main list: never two main lists, and never the
  small size for the app's own destinations.

### Links and rows

The link card and tile, the directory, the big link rows, the arrow link, the back link, show all and the copy button with words (DECISIONS 152: the council
voted, four members, 3 of 4 deciding, on the owner's handoff, from his approved site prototypes; the implementation hasn't been reviewed by the panel). Candidates D5a, D5b, D5c, D6 and X8.

- **The arrow.** After a link, card or row that goes on in the site: the core `arrow-right` (16px; 24 on a card, 20 under 720). Before a
  back link: `arrow-left`. Up-right (`external`) is the new-tab cue and nothing else, so a link, card or row that opens a new tab draws
  that in the arrow's place, never both. Secondary ink at rest, primary on hover and focus; it travels 2px (`space-0-5`) in its own direction
  over `duration-base` on `ease-out`, not under reduced motion (vote 2, no majority: the prototype's picture lift on a tile is dropped, a 2-2 tie
  that kept the option with less change). In a right-to-left page it turns and travels the other way.
- **The link card** (`LinkCard`) is one link round a media window, a heading, a sentence and a state; no rim, no level (not a `Card`). The
  heading is the display role; the sentence and the state sit on one baseline `space-8` apart and stack under 720. **The tile** (`LinkTile`)
  is a link round a picture, a brand line, a name (`text-md`, 500, a real heading, underlined on hover) and details, with a foot row outside
  the link, because a link cannot hold a button. Link radius 6 so the ring has a shape.
- **The directory** (`DirectoryList`, `DirectoryRow`): a head, then rows ruled by `border-divider`, each one link of three fixed columns:
  the name (600) and the state (end-aligned, tabular) at 160px (`size-description-label`'s value) and the sentence the rest; one column
  under 720 with the state starting. A row is `size-row` (56px, a new token) at least. **One list with one name, always.** Text is `text-md`
  (DECISIONS 152, consent row 1: the prototypes' 15px). **The big link rows** (`BigLinkList`, `BigLinkRow`): one line, 600, `text-2xl`
  and `text-3xl` from 1024 (the prototype's fluid 22 to 36 is gone: no clamp), two columns from 720 to 1023.
- **The arrow link** is `Link` with `arrow="end"` or `"start"`: no underline, 500, `text-md`, a 44px target, the arrow its cue (WCAG 1.4.1). **The back
  link** (`BackLink`) is a `nav` with one link: `text-base`, secondary lifting to primary with no underline, a 44px target.
- **Show all** (`Reveal`, and `DirectoryList`'s `shown`): a secondary large button under a rule; `aria-expanded` and `aria-controls`; the
  rest is `inert` and hidden while closed. It opens as a grid row going `0fr` to `1fr` over `duration-slow` on `ease-out` and closes at 0.75× on `ease-in`;
  under reduced motion it is simply there. The clip keeps `space-2` beside the rows so a ring is whole and lets go at the transition's own end. A
  keyboard open puts focus on the first new row only once the clip has let go (vote 5, no majority); a pointer open leaves it on the button.
- **The copy button** (`CopyButton`): a `Button` of any variant and size that copies a string, says its words, then "Copied" for 1500ms
  (as `CodeBlock` and `Terminal`), with both in one `Reserve` cell so its width never changes and a visually hidden `role="status"`. It says
  Copied only after the write succeeded; a refused or missing clipboard leaves the button as it was.
- **A cut table cell that holds a link** is unchanged (vote 7: no majority, so DECISIONS 142 stands: no plate).
- **Values the builder chose where the ballot gave none, and the council left standing** (DECISIONS 157: no member objected): the link card's spacing (`space-10` above the heading, `space-5`
  before the foot) and heading size (the `display` role), the directory's column gap (`space-6`) and head spacing (`space-3`), the show-all rule's padding (`space-4`),
  the tile's foot gap (`space-1-5`); the prototypes set these on the site's own unit grid, which is not ported.

## Site structure

The site header, its narrow menu, the app shell and the phone tab bar (decision 96; the council voted 8.5, 8.5 and 8, a three-member
round; the owner's ordering of the build is in DECISIONS 93). The components are `SiteHeader`, `AppShell`, `AppHeader`, `TabBar`,
`TabBarItem` and `TabBarMore`, with `Sheet side="top"` and a `NavItem` without a glyph as the two additions to what shipped. The layout
lengths are tokens (see [Layout](#layout)), and the two breakpoints are written as numbers in range-syntax media queries, which cannot
read a custom property, each with a lint exception that names its token.

**Status:** decided by the council (DECISIONS 96); the implementation has not been reviewed. The capped shell, the pane, `Nav`'s second
size, the primary kept under 720 and the facts under the title were decided by Opus on the no-council path (DECISIONS 226 and 265; found
by CIMIP, cimip-gaps-2 batch B4); the code review is Astra's and the owner sees the pictures before merge.

### The site header

The one smoked bar of a marketing or docs site: the shipped `basalt-chrome`, with its opaque fallback, and used once per viewport.

- **The bar** is 56px, border box, its 1px hairline inside, at every width and every density (compact shrinks what sits in the bar,
  not the bar). The top safe area is padding above it, so the bar's sticky offset and the page's `scroll-padding-top` are 56 plus the
  inset (`scroll-padding-top` also adds a step, `space-4`). Its inline padding is the gutter (`space-6`, `space-4` under 720) or
  `env(safe-area-inset-left/right)`, whichever is larger, and the inner row is 72rem wide.
- **The order:** the brand, the links beside it (start-aligned, never centred), a spacer, then the actions.
- **The brand** is the 32px header lockup an app passes in (`brand/` ships them), a link home in a target at least 44 by 44 (a mark with no word keeps the 44 width,
  the mark at its start), with no wash; its ring is the control ring at +2 round the lockup, radius 6.
- **The links** are `text-base` (14/20) at 400 in `text-secondary`, each on a 32px hugging pill (`radius-full`, `space-3` either
  side). Each link's hit area is 44px tall at every pointer, with 2px either side of the pill, so pills are 4px apart and
  neighbouring hit areas touch and a pointer crossing between them never leaves a link.
- **Hover** is the pill at the selected wash with the ink to primary. One shared pill glides between links with `Nav`'s rules
  unchanged (in place on entry, frozen and faded on leave, hidden by the first key, off on touch, under reduced motion and in
  forced colours, where each link paints its own).
- **The current page** is primary ink at 600 with its 600 width reserved, no background, no underline, no bar, and
  `aria-current="page"`. **Focus** is the control ring, 2 at +2, round the pill. **Forced colours** are `Nav`'s rule: the current
  page keeps its 600, and hover is `Highlight` with `HighlightText`.
- **The end cluster** is, in order: `LoopsToggle`'s icon form (only on a page with an ambient loop or a loop that can run past five seconds), up to two tools (ghost icon controls that stay at every width: a search trigger, a basket; `SiteHeader`'s `tools` slot), and at most one primary Button. Never a danger Button. The loops toggle is first and stays in the bar at every width; the narrow menu has its own row for it (below). The theme choice is in [the site footer](#the-site-footer), not the bar: the header has no theme control (`themeToggle` is deprecated and kept for one release). A count beside a tool is not decided here (D11d, in the Controls batch). **Status:** decided by the council (DECISIONS 146, 3 to 0, the loops toggle's place 2 to 1); the implementation hasn't been reviewed.
- **How many links:** they must fit at 720 beside the brand and the actions, five at most; the rest go in the footer. This is a rule
  for the site, not something the component measures.
- **The skip link** is the page's first stop, unseen until it has focus. With a sticky bar it then hangs under the bar, `space-2` below
  the bar's line, on the brand's start edge at every width, so it covers nothing the bar holds and the bar never moves; without a bar it
  sits at the page's top start. It reads the bar's real bottom edge from script when it takes focus, and again on scroll and resize while it holds focus, so a bar that is not at the top of the viewport (a notice above it) is still cleared; with no script or no bar it is where the stylesheet puts it (DECISIONS 142). It leaves the flow, so it floats as a tooltip does: level 3, the rim, `shadow-overlay`, radius 8, and its
  ring (+2) stays under the bar's line. Otherwise it looks like a link: primary ink, the input-boundary underline brightening on hover.
  **Status:** decided by the council (DECISIONS 138) and approved by the owner (DECISIONS 139); the implementation has not been reviewed.
- **The opaque form** is the same bar on `surface-page` with no `backdrop-filter` (`solid`), for a product whose content does not
  scroll under it (N1's chrome is solid, DECISIONS 1; whether that covers N1's sticky header is the owner's open question, so until
  he answers N1's header is solid).

### The narrow menu

Under 720 the links and the primary action leave the bar; the brand, `LoopsToggle` and the tools (when the page has them) and a Menu button stay. The trigger is the icon only (DECISIONS 146 C, 2 to 1). The bar's buttons are
44px whatever the pointer, radius 8.

- **The trigger** is a ghost icon button with the core Menu glyph at `IconButton`'s own 16px, named "Menu", with `aria-expanded`,
  `aria-controls` and `aria-haspopup="dialog"`. It morphs to Close over `duration-slow` (the drawn pair).
- **The menu** is `Sheet side="top"` on Base UI's Dialog, so it keeps the dialog contract: a real focus trap, an inert page, Escape,
  focus return. It has the scrim, level 1, `shadow-modal` and bottom corners of 16 (`radius-xl`). Its first row redraws the bar in
  place: the brand, the tools if the bar has them and Close on the Menu button's exact box, with a divider under it. When the page has a loops toggle (the
  site header's `loopsToggle`, passed once), the next row, below the band and before the links, is `LoopsToggle`'s Button form, the pressed
  toggle "Pause animations" at the band's own gutter and 44 tall: the open menu covers the bar, so this is how the hold is reached while it is
  open, and it is the same control, so it and the bar's icon always show one state. The icon is not added to the band. A page with no
  loops toggle has no such row, and nothing else in the menu moves. The HTML skill's narrow menu has the same row (DECISIONS 148): when its bar has a `[data-loops-toggle]`, the first row after the band is the pressed-toggle button "Pause animations". (Decided by the council, DECISIONS 143, 2 to 1; the implementation hasn't been reviewed.) The list unrolls beneath from the
  band's edge. It is as tall as its content and scrolls inside at the viewport's height (`overscroll-behavior: contain`); the page
  under it does not scroll.
- **Its rows** are `Nav` rows without a glyph (`NavItem` takes `icon` optionally): the 48px pill at 20/28, primary at rest, the
  current row at 600, each row at least `space-1-5` from the sheet's edge so a ring never clips. The bar's one action sits at the
  foot, full width, 44px.
- **Focus:** on open, focus lands on Close. Escape, the scrim, Close or a link closes it, and focus goes back to Menu. Widening past
  720 closes it and focuses the current link in the bar.

### The site footer

The end of every site page (`SiteFooter` and `SitePage`; the HTML skill's `.site-footer` and `.site-page`, in its `topbar` module). **Status:** decided by the council (DECISIONS 146 A, a three-member round); the implementation hasn't been reviewed.

- **It sits on the page at level 0:** no fill, no rim, no shadow. One 1px `border-divider` runs the width of the row, never full-bleed, with half a section gap above it (64 from 1024, 48 from 720, 32 under) and `space-8` inside.
- **The order:** the brand, an optional sentence (at most `size-prose-width`) and `SocialLinks`; the links; then the base, the legal line and the theme choice. The legal line (tertiary, 13/18) and the theme choice are required.
- **The links** are a line (one unlabelled list of up to six, beside the brand, start-aligned as in the bar) or labelled groups. Each is the pill link at `sm`: a 28px pill in a 32px hit area on a fine pointer, 44 on touch, at 13/18, hung so the words start on the group label's edge (never closer than `space-1-5` to the gutter's edge). A group label is an `h2`, 13/18 at 500 in primary, in sentence case, never uppercase or mono. All the links are one `nav` named "Footer".
- **From 1024** the brand takes tracks 1 to 4 and the groups tracks 5 to 12, four a row (2 to 1: opus had tracks 1 to 3 and three a row); from 720 the brand takes the row and the groups sit under it, four a row. **Under 720** a labelled group is a disclosure: a 44px row with the label and the core chevron, a divider between, closed unless the group holds the current page; without script every group is open, two a row. Eight closed groups are one phone screen.
- **On a short page** the footer sits at the window's foot (the page is a column at least `100svh` tall, `SitePage`); on a long page it ends the page.
- **The site's own:** its words, which groups and links, the note, the brand, the legal text, and what the footer sits on.

### The theme choice

Three states, System, Light and Dark, where System is nothing stored (DECISIONS 146 B; **Status:** decided by the council; the implementation hasn't been reviewed). In the site footer it is a radio group in the segmented control's drawing, labelled "Theme" (`ThemeChoiceControl`; the skill's `.theme-choice`): one tab stop, the arrows move and choose, Home and End go to the ends; the chosen word is 600 in primary on the raised pill with its 600 width reserved. The head script also writes `data-theme-choice` on the root, and CSS draws the chosen word from it before any script, so the right word is chosen in the first frame. In an app with no footer it is a ghost `IconButton` showing the theme in use (a sun or a moon), named for the choice ("Theme: System"), opening a menu of three radio rows (`ThemeMenu`); in a settings row it is the same three-word control. The site header has no theme control. The HTML skill has both forms: `.theme-choice` in the footer, and `data-theme-menu` (a ghost icon button that shows the theme in use, is named "Theme: System" and opens the page's own `.menu` of three radio rows) for a report's bar or an app header; its old two-state `data-theme-toggle` is deprecated and works for one release, as React's `themeToggle` does.

### Parts for a site's own bar

`SiteBrand` (the brand link), `SiteNav` and `SiteNavList` (the pill link list, `md` in a bar, `sm` in a footer, a row or a column, optionally hung), `SiteMenu` (the narrow menu's trigger and sheet) and `useSitePhase` are exported, with `basalt-chrome` for the smoke, so a site that draws its own bar keeps the behaviour (the glide, the 44px hit area, the current page, the first key, the narrow menu's focus) and builds the shape itself. No site's shape comes into Basalt. `SiteHeader` has the slots `brand`, `links`, `tools` and `action`, and never centres. (DECISIONS 146 C, 3 to 0; the implementation hasn't been reviewed.)

### A bar that arrives, or leaves and returns

`useSitePhase` (and `SiteHeader`'s `phase`, the skill's `data-phase-after`): three phases from one `IntersectionObserver` on two 1px sentinels, no scroll handler. **Rest:** the row's slot is in the window. **Between:** the slot has left and the trigger (`after`: the first screen, the hero, its mark) has not reached the bar's line. **Pinned:** the trigger's bottom has passed the line. Where the page is decides the phase, never the direction of the scroll. The header is one element in a slot that keeps the resting row's height; pinned, the same element is `position: fixed` and drops in from above its own top edge over `duration-slower` on `ease-out`, leaves at 0.75 on `ease-in`, and fades under reduced motion (opacity only). The observer's root margin is long downward, so a jump past a sentinel that starts below the fold still counts; a jump past the line (an anchor, `scrollTo`, a restored scroll), the opening state and a return to rest straight from pinned switch at once; a turn mid-exit travels back from where the bar has reached. Focus inside the bar holds it while the page is between. The focused skip link is `space-2` from the window's top while the page is between. An anchor lands at the bar's line plus `space-4` in every phase (`scroll-padding-top` on the root). The site's CSS restyles the row and the bar by `data-form="row" | "bar"`. (DECISIONS 146 D; the implementation hasn't been reviewed.)

### The brand's lockup

`lockup={{ x1, x2 }}` on `SiteBrand` (and on `SiteHeader`) takes the two header drawings `brand/` ships (`lockup-header-1x` and `-2x`), each a `viewBox` and one path (`lockupDrawing(file)` reads them from the file's text; its `title` build note is never read into the page), each defined once as a `symbol` and drawn with `use`; the stylesheet shows the 1x drawing and swaps to the 2x drawing from `min-resolution: 2dppx`, so only one is rendered, no file or `id` repeats and no title makes a tooltip. It draws in the text colour, so it stays in forced colours. **A brand file has one way in** (the wording audit's W1): every file in `brand/` carries a `<title>` build note, which a browser shows as a tooltip inside a link and can announce, and the files are never edited. In React a file's text goes in as `<BrandSvg source={file} />` (or through `lockupDrawing(file)` for a lockup, above): its title is dropped when the text is read, and the drawing is `aria-hidden`, `focusable="false"` and `pointer-events: none`. In the HTML skill an `<svg data-brand>` is finished by `compose.mjs` the same way, and `sites/build.mjs` does it for every `brand/` svg it includes (`brandSvg`): the root takes `aria-hidden="true" focusable="false" data-brand` and the title is removed, and nothing else of the drawing changes. The link round it carries the name (`aria-label`). The quiet zone round a lockup on art is the headroom check's: it reads each `data-quiet` box grown by `space-1-5` on every side, so a zone needs no CSS. (DECISIONS 146 F; the implementation hasn't been reviewed.)

### The app shell

One grid, and the document scrolls: the page is never moved into an inner pane of its own. Pages set `scrollbar-gutter: stable` (the
shell sets it on the document it is in). A page's own pane beside it (`PaneLayout`, below) is the sidebar's pattern, sticky and scrolling
only what overflows it, and the document still scrolls the page.

- **1024 and up:** a 256px sidebar on `surface-page`, edged by a 1px `border-divider`, sticky at `100dvh`, its list scrolling inside
  only when `Nav` overflows. Its brand band is the header's 56px, level with the header, and draws no line of its own. `Nav` with its
  groups, and account items (a second `Nav`) pinned to its foot.
- **720 to 1023:** the rail, 72px: `Nav`'s collapsed form (the 48px circle, 12px either side), the label as name and tooltip, counts
  spoken. There is no collapse toggle. The shell hands `Nav` the rail, so the app does not measure.
- **Under 720:** no sidebar and no rail: the phone tab bar.
- **The header** (`AppHeader`) spans the content column only, never the sidebar, and its line ends at the sidebar's edge. 56px,
  sticky, smoked by default. It holds the page title (the page's `h1`) at 18/26, 600, then the actions at its end. On a phone it spans
  the full width with the same geometry, still sticky. The page's main is capped at 72rem (the site header's row length) and
  start-aligned. Its **opaque form** is the same bar without the layer (`solid`): only one
  smoked surface per viewport, ever.
- **The primary under 720** stays in the bar with its words, 44 tall and radius 8 like the bar's other buttons; the title gives way to it
  (the title is cut first, never the action). An app keeps the primary's words short. It does not go into the tab bar, which is
  navigation, or a sheet, which would hide the page's main action behind a second press; the site header's moves into its narrow menu
  because that menu exists, and an app's bar has none.
- **Facts under the title** (`facts`): one line under the `h1` of what the page is about at a glance, such as a reference, a status (a
  plain `Badge` with its `status`, so a word says it) and a time. 13/18 (`text-sm`) at 400 in secondary ink, joined by dots (`DotLine`:
  drawn as dots, read as commas), cut with an ellipsis from its end, never wrapped, so an app keeps them short and puts them in order of
  importance (on a phone the line has about half the bar). The title (26) and the line (18) are 44 together, centred in the
  56px bar at every width, so the bar never grows. Only primary and secondary ink sit on the smoked bar. The facts are not in the heading.
- **The capped form** (`capped`): the whole shell, sidebar and page together, at most `--basalt-shell-width` and centred in the window,
  so on a wide display the navigation and the page stay together and the space is shared by both sides. The width is
  `size-sidebar-width` plus `size-page-width` (1408px at 16px text): **at the cap the page is exactly its own 72rem cap**, and under the
  cap nothing differs from the uncapped shell. In the capped form the page fills its column, so an app that sets `--basalt-shell-width`
  on the root for another cap widens the page with it. The header spans the content column as always and so ends at the shell's end;
  the margins either side are the page. The skip link moves in with the brand: in any app shell it starts on the brand link's start edge
  (the sidebar's `space-3` and the band's `space-1-5` + `space-3` in from the shell's start from 1024; the 44px link centred in the rail from
  720; the gutter under 720, where the bar has no brand), as it does under a site header. Under 1024 the window is narrower than any cap.
- **A page with a pane** (`PaneLayout`): a column of `size-sidebar-width` at the page's end, the gutter between, that stays in view. It
  is sticky `space-6` under the bar, at most the window less the bar, `space-6` above and `space-16` below (the main's own foot, so read
  to the page's end it never slides under the bar), and scrolls inside only when what
  it holds is taller (`overscroll-behavior: contain`), as the sidebar does; while it overflows it is a tab stop so the keys can scroll it.
  It keeps `space-1-5` round its content so a ring never clips, and it is positioned, so a visually hidden label inside cannot stretch
  the page. It is a `region` named by the app (`paneLabel`), at level 0 with no fill or rim of its own: what it holds groups by space and
  dividers. It answers its own width: beside the page from `size-sidebar-width` + `size-gutter` + `size-breakpoint-container-lg` =
  920px, so the page beside it is never under 640; narrower, it follows the page in the flow with no height of its own. The page comes
  first in the source, which is the reading order at every width. In print it is in the flow. **What scrolls a part inside it** is the
  pane while it sits beside the page and the window while it follows the page: `usePaneScroller()` returns the pane's element or `null`
  (the skill's pane carries `data-scroller` while it scrolls), so a part that follows scrolling, such as a list's band or a back-to-top
  control, names its scroll owner from it and never assumes the window. It holds supporting content (a summary,
  details, a checklist, an outline), never the page itself.
- **The foot** (`foot`): a band pinned to the content column's bottom that holds still (a message field, an action bar). See
  [The keyboard and what is pinned](#the-keyboard-and-what-is-pinned).
- **Safe areas:** the page's viewport meta needs `viewport-fit=cover` for `env(safe-area-inset-*)` to work; without it the insets
  read 0 on a phone. (The HTML skill's compose writes `viewport-fit=cover` into the page's viewport meta whenever the page uses a module that needs the insets, such as the phone tab bar.)

### The phone tab bar

- **The surface** is solid `surface-page` for every product, a hairline on top, no shadow and no blur; `Canvas` with a `CanvasText`
  line in forced colours; not shown in print. The header is the one smoked surface, and nothing translucent sits under the thumb.
- **Height:** 56 with the hairline inside, plus `env(safe-area-inset-bottom)` below and the side insets in landscape. Content pads
  past it by the bar, the inset and `space-6`. At phone widths the toasts hang from the header, never over it (DECISIONS 274). A cell's glyph circle sits 2px below the cell's top, with the label under it.
- **The cells:** three to five equal, each a link filling its cell, with `aria-current="page"` on the current one, in a `nav` named
  "Primary", never a `tablist`. Each is the glyph at 24 over a 12/16 label, always both; glyph and label are primary ink at rest, the
  label at 400. The current one is the selected glyph and the label at 600, with no wash, no pill and no bar.
- **Press and hover** are a 32px circle at the selected wash behind the glyph; the first key hides it. **Focus** is the control ring
  inset by its own width on the full cell (the flush-field rule: the cell is itself a link and meets the screen's edge).
- **A new-activity mark** is a 6px dot in the label's ink at the glyph's top end, its words in the link's name. Counts are spoken,
  not drawn.
- **More than five destinations:** four, then More, a button that opens the bottom `Sheet` with the rest as `Nav` rows. More takes the
  current look while one of its pages is current, and its name says which.

### The keyboard and what is pinned

What covers the window's edges, so that nothing a reader needs is under it. Status: decided on the no-council path (DECISIONS 226 and 265,
cimip-gaps-2 batch B5); not yet reviewed. Found by CIMIP and CoachStakk.

- **An on-screen keyboard.** On iOS and iPadOS, and in Chrome and Edge on Android, a keyboard covers the window's bottom and only the visual
  viewport shrinks; `100dvh` does not. While one is up (the visual viewport is at least 120px shorter than the window, at a scale of 1, so a
  pinch or a browser's own bars are not one) the root carries `data-screen-keyboard`, `--basalt-keyboard-inset`, `--basalt-viewport-top` and
  `--basalt-viewport-height`, and what is fixed to the window is laid out on what is seen. **Chrome is covered:** the tab bar and the phone's
  status bar are not drawn, as a platform's own bars are covered, and `--basalt-bottom-offset` is 0. **The task rides above it:** the foot stands on
  the keyboard (from 720 the toasts do too; under 720 they hang from the bar); a bottom sheet stands on it at 90% of what is seen; a side sheet, a full-screen form and the sidebar are what is
  seen; a dialog is centred in it; a held form keeps its top while it is seen; the command menu hangs from the top of what is seen; the header and a
  band stuck under it stay at the top of what is seen; the safe area the keyboard covers is not padded. The root's scroll padding adds what the
  keyboard covers, the field that raised it is brought out from under what is pinned, and a page scrolled to its end stays at its end. Popups
  anchored to a field (a select, a combobox, a menu) are Base UI's, whose placement reads the visual viewport: they flip or shrink above the keyboard.
  A page with `interactive-widget=resizes-content` never has one (the window itself shrinks). Nothing is written while no keyboard is up.
- **Measured pinned sizes.** `--basalt-sticky-offset` and `--basalt-bottom-offset` are fixed values. A page that pins more (a strip under the bar,
  a list's band from 720, a foot) opts into the measured form (`usePinnedEdges`; `AppShell` does when it has a foot): every element marked
  `data-pinned-edge="top"` or `"bottom"` that is sticky or fixed and drawn now is counted, and the root carries `data-pinned-measured`,
  `--basalt-pinned-top` and `--basalt-pinned-bottom`. They take the fixed values' place in the root's scroll padding (plus `space-4`, as before), so a
  control that focus brings into view is never under them (WCAG 2.4.11), and the toast stack stands above what is at the bottom. Basalt's bars,
  `ListBand`, the tab bar, the status bar and the foot carry the mark (a page's own `.basalt-sticky-bar` counts as a top part without it); an app
  marks its own. A part that carries something outside its own box marks it `data-pinned-extent` (the status bar's message band, stacked above it
  under 720), and the cover is the union. A part that becomes pinned or stops (a class, a style or `hidden`, with no change of size) is measured
  again.
- **A scroller that is an element** (a pane, a column an app scrolls, a sheet's body) is a scroll owner, and reads the same properties as its own.
  A sticky part is pinned to the box it sticks in (its nearest ancestor that clips overflow), so the measured form writes `data-pinned-measured`,
  `--basalt-pinned-top` and `--basalt-pinned-bottom` on that box, and the stylesheet pads it as it pads the root; a fixed part counts for the
  window. While a keyboard is up, every scroll owner (one that measures its own parts, or any element marked `data-scroll-owner`) also carries
  `--basalt-keyboard-inset`, `--basalt-viewport-top` and `--basalt-viewport-height` as its own share: what of its box the keyboard covers, what is
  hidden above what is seen, and how much of it is still seen, and is padded by them. Its share is written again when the page or any
  scroller scrolls, and when a scroll owner mounts or changes size while the keyboard is up. Custom properties inherit, so a part inside a scroll owner
  (a sticky foot, a band) reads that owner's values and needs no other source.
- **The foot** (`AppShell`'s `foot`) holds still: the content column is at least the window's height and the page takes the room between, so on a
  short page the foot rests at the window's bottom and on a long page it sticks in the same place. Under 720 it sits on the tab bar, and on the
  keyboard while one is up; at the page's end the page's last line is above it, never under it. It is a band, not a box: solid `surface-page` with a
  `border-divider` on top (the header is the one smoked surface), no shadow, its contents on the page's width and edges, the home indicator's safe
  area kept where no tab bar holds it. It is never taller than the window less what covers the top and one 44px row; past that it scrolls inside,
  and a tray in it gives way first.
- **The tray** (`Tray`, `TrayRow`) is the rows that wait on the reader (someone asking to join, a change to approve, a reply that is due), docked
  where they work: above a field in a foot, or at a page's head. From 720 it is one level-1 panel (the rim, radius 12), a row each on a divider:
  a mark at the start (a pending `Badge`, an avatar), the words (14/20, primary; they wrap and are never cut) and the row's `sm` actions at the end,
  on the first line's baseline, at least 40 tall (44 on touch and under 720). Under 720 the rows that wait are one band, the panel's whole width: a
  button (`aria-haspopup="dialog"`) that says how many in the app's words at 500 and "Show" in secondary, with the hover wash and the flush −2 ring,
  which opens them in a bottom sheet titled with the tray's name; a row that only reports (work under way, a connection) stays a row of the tray.
  Focus is never lost to a row that leaves: the row now at its place takes it (or the one before); after the last the sheet closes by itself and
  focus goes to the app's field (an ordinary close, Esc or Close, returns it to the band). The handoff remembers the focused row itself, not a blur
  event, so it holds where a browser drops a removed element's focus without one. The tray is a named region, not a live region: the app says a new row through its one `StatusLine`.
- **The HTML skill** draws none of these: the keyboard's layout, the measured sizes, the foot and the tray are React's alone (they need a script that
  watches the page, and the skill's pages have no app foot). The skill does take the 44px targets under 720 whatever the pointer.

### Vertical lines

Basalt allows a short list of vertical lines. Each is structure, and none is a selection, sort, active or status mark (the owner's
ruling against the vertical bar is about marks): the 1px divider at a pinned table column's edge while the table is scrolled,
the app sidebar's 1px edge, a meter's labelled target tick, the vertical `Separator` between groups of controls (1px
`border-divider`, as tall as the controls), the edges between a `NumberField`'s value and its steppers (part of the
field's own boundary), a diagram's connector (a line that joins two nodes and ends in a head, with its stems, rails and buses) and a
sequence diagram's lifeline. A connector is never drawn without both its nodes and its head, and neither is ever a mark of state.
Status: decided by the council and approved by the owner (DECISIONS 138 and 139); the diagram's connector and lifeline decided by the
council (DECISIONS 281, a handoff); the implementation hasn't been reviewed.

## Charts

A series over time, as lines or as bars (decision 101; the council voted 8.5, 8.5 and 8, a three-member round, DECISIONS 93). The
components are `TimeChart` and `ChartGroup` (the name `Chart` stays unexported: it was renamed `Sparkline`, and a test guards it). This page holds every rule the build follows; the colours and lengths are tokens.

**Status:** decided by the council (DECISIONS 101); the implementation has not been reviewed.

**The idea: ink is the kind of value, and shape is which series.** Primary ink means something was observed. Secondary ink means it
was planned. The input-boundary hatch means it is missing. Divider ink is structure and tertiary ink is a label. So no series ever
takes a colour, a lighter ink or the accent: series are told apart by dash, marker and name.

### Text and size

- **Text** is `text-xs` (12/16) everywhere in the chart: the axes, the lane's words, the direct labels and the legend. Axis labels are
  tertiary and every number is tabular. Nothing is under 12px at any width.
- **The chart is laid out in real CSS pixels** at its measured width (a `ResizeObserver`), and never scales text through a `viewBox`.
  It is narrow by its **own** width (under `size-breakpoint-container`, 480px), whatever the viewport.
- **The plot is 240px tall at every width** (`size-chart-plot`). Nothing scrolls sideways.

### Axes

- A line's scale needn't start at zero. A bar chart always does. The 1px `chart-baseline` (`border-input`) is drawn only where the
  scale reaches zero, after the hatch.
- **3 to 6 gridlines** on round steps (1, 2, 2.5, 5 times a power of ten), horizontal only, 1px `chart-grid` (`border-divider`). They
  are decorative: they drop in forced colours, so the plan's `GrayText` is never mistaken for one. There are no vertical gridlines.
- **The unit is written once, on the top tick.** There are no x tick marks.
- **The y gutter** is as wide as the widest label plus `space-2`. Charts stacked in one figure (`ChartGroup`) share one gutter and one
  right margin, so their plots start and end at one x.
- **X labels** are at least 56px apart: every day when there is room (the weekday too when a day is 80px or wider), every k days back
  from the latest for two weeks or less, otherwise Mondays, weekly or every few weeks. The picked day's label lifts to primary and a
  neighbour it would touch steps aside.
- **Two lanes are always reserved, so the plot never moves:** above the plot, the gap's words (one 16px line, two when narrow), and
  below it, the axis.

### Marks

- **A line** is 2px (`size-chart-line`), `chart-observed`, round joins and caps, joined straight, with no area fill.
- **Markers** are 8px (`size-chart-mark`): a disc, a square and a diamond **of equal area**, each ringed 2px (`size-cut`) in the
  panel's own colour, so the ring cuts the marker out of the plan, the grid, the hatch and the other series behind it, but never out
  of its own line. They show when a day is at least 16px wide (two markers); otherwise only the active day, the latest day, the days
  beside a gap and an isolated point keep theirs.
- **A bar** is 60% of its day, from 2 to 24px (`size-chart-bar-min`, `-max`), square at both ends (the end is the value, and a rounded
  end would move where it seems to be). **One series per bar chart:** a second becomes a line over the bars, or a second chart.
- **A day that isn't final** is the same mark, hollow: a 2px outline in observed ink on the surface, with "Today so far" in the legend
  and values written "34 min so far". Hollow means "not final" here as the pending badge's ring does.
- **Zero is a value.** A rest day's 0 draws no bar and reads "0 min". Missing is never drawn as zero.

### Ink and series

- **Every observed series is primary.** Secondary is the plan's alone. Missing is the hatch.
- **Series are told apart by dash, marker and name:** series 1 solid with a disc; series 2 dashed 6 on 4 off (`size-chart-dash`, `-gap`)
  with butt caps and a square; series 3 a round dot every 6px and a diamond. Three observed series at most; past that, small multiples
  on one scale.
- **Direct labels:** each line's name (and the plan's) at its last observed point, in a reserved right margin, 12/16 secondary, only
  when the chart is at least 480px wide and has two or more series. The legend names every series, so they drop when narrow.
- **The accent** paints only the product's one labelled role (DECISIONS 37), with a word, never a series, a bar or a line.

### The plan

The plan is secondary ink, never a series, and never carries a marker: a marker means a measurement happened.

- **A value plan** is a 2px `chart-plan` stroke across each day's whole slot (the meter's tick laid across a day). Equal neighbours
  join. There are no risers: a change is a gap in the line, so a daily plan reads as targets and not as a second skyline.
- **On bars** the stroke is in front of the bar and cut 2px out of it in the surface colour (the meter's tick and its cut, one
  `size-cut`). A cut never hides where a bar ends: above the plan it is drawn only if at least 2px of bar stays above it; below the
  plan, only if the bar reaches through the line.
- **Behind an observed line.** A line hides nothing, and a cut in an observed line would read as a break, which only missing data
  may draw.
- **A band** is two 1px `chart-plan` edges that step with no risers, with the `chart-band` (hover wash) fill between: the fill is
  decorative, the edges carry it. In forced colours the fill drops and the edges stay.
- **Order of drawing:** gridlines, the picked day's plate, the band, the hatch, the baseline, bars, cuts, the plan, the lines (last
  series first), the lane's words, the axes, the direct labels.

### Missing data

- **The hatch** is 1px lines at 45 degrees on a 4px pitch (`size-hatch-pitch`) in `chart-missing` (`border-input`), over the plot's
  full height. In a bar chart it fills the whole missing slot and no bar is drawn.
- **A line breaks** and never joins a gap. No zero is plotted. A known plan still shows across the gap.
- **When one series of several is missing,** the hatch still marks the days, its words name the series ("Watch not observed"), and the
  observed series draws over it, its markers ringed.
- **The reason in words** goes in the reserved lane above the plot, 12/16 tertiary, from where the gap starts: the full words if they
  fit ("Watch not observed · not worn, travel"), then "Watch not observed", then "Not observed". Only the last gap may step back to
  fit, and never over an earlier one. The reason is always also in the summary, the readout and the table.
  **The headline chart** has no legend rows, so whenever it has a gap it shows a "Not observed" key above the plot, the hatch swatch and the words, as the series charts' legend does (DECISIONS 167, Q11a, 4 to 0); a gap whose lane words do not fit is then never a hatch with no word.
- **The table** says "Not observed" in tertiary with no mark (DECISIONS 95), and the reason in its Note column.

### The legend is the readout

- It sits above the plot, under the title and the source line: a date line, then each key. A key is a 16px swatch (`size-icon-sm`)
  drawn like its mark, the name, and its value for the picked day.
- **Nothing moves.** Every value reserves the widest of its forms ("10 h 59 m", "Not observed", "140 min so far") and so does the date
  line: picking a day changes words, never positions.
- **It returns to the latest day** when the pointer leaves, but **never while keyboard focus is inside the chart**: then the focused
  day is the one shown, whatever the pointer does.
- **The picked day** is a full-height `state-selected` plate behind the marks, its axis date lifting from tertiary to primary, and its
  markers showing even where density hid them. Keyboard focus adds the control ring round the day at +2.
- **Hover, a tap and a key** all pick a day. A tap holds until a tap outside; a sideways drag scrubs; `touch-action: pan-y` keeps
  vertical scrolling. There is no tooltip: a floating box would be a level-3 surface with a shadow over the data it describes.

### Keyboard and screen readers

- **The plot is one tab stop:** a `role="group"` with `aria-roledescription="chart"`, named by the title and described by the summary
  and a sentence about the keys. Inside it each day is a focusable `role="img"` with a roving `tabindex`, named by its full sentence:
  the day, each series' value or "not observed" and its reason, the plan, and where the value sits against it.
- **Keys:** ← → a day, Page Up and Page Down a week (Page Up is earlier), Home and End the ends. Tab leaves; nothing is trapped.
- **No live region.** Moving focus is the announcement, so a hover never talks and nothing is read twice. The SVG is `aria-hidden`.
- **The key hint** is a legend with `data-kbd-hint`: hidden on touch until a hardware key is pressed.
- **The table** is disclosed in the same figure ("View as table", `aria-expanded`): a still table (fixed layout, the date a pinned row
  header, newest first, numbers end-aligned) with a scroll hint when it overflows.
- **The summary** is a required `figcaption` the app writes: the direction, the extremes, the plan, and each gap with its reason.

### Motion

See [motion](motion.md#charts). A value that changes in place glides with the marks, the scale, its gridlines and labels over
`duration-slow` on `ease-out`; a new peak widens the scale at once and it eases back when it shrinks. The first paint is at rest, unless the
chart is its page's one entrance (see [Motion](#motion)).

### Forced colours

Observed is `CanvasText`. The plan, the band's edges and the hatch are `GrayText`. The band fill and the plate drop. Cuts and rings are
`Canvas`. The baseline is `CanvasText`. The active day is a 2px `Highlight` outline. Line paths keep `fill: none`.

### Chart tokens

| Token | Value | Use |
|---|---|---|
| `chart-observed` | `text-primary` | Lines, markers, bars, the "so far" outline |
| `chart-plan` | `text-secondary` | The plan stroke and the band's edges |
| `chart-band` | `state-hover` | The band's fill (decorative) |
| `chart-missing` | `border-input` | The hatch |
| `chart-grid` | `border-divider` | Gridlines (decorative) |
| `chart-baseline` | `border-input` | The zero line, only at zero |
| `chart-axis` | `text-tertiary` | Axis labels and the gap's words |
| `size-chart-line` | 2px | Observed lines and the plan stroke |
| `size-chart-mark` | 8px | A marker's diameter (the square and diamond have the same area) |
| `size-cut` | 2px | The surface cut: a marker's ring, the plan's cut out of a bar, and the meter's tick |
| `size-hatch-pitch` | 4px | The hatch's pitch (the line is `size-hairline`, the angle 45 degrees) |
| `size-chart-bar-max`, `-min` | 24px, 2px | A bar is 60% of its day, between these |
| `size-chart-dash`, `-dash-gap` | 6px, 4px | Series 2's dash; series 3's dot pitch; series 2's gap |
| `size-chart-plot` | 240px | The plot's height at every width |

**Not tokens, by choice:** the plate (`state-selected`), the legend swatch (`size-icon-sm`), the focus ring, the lane heights (the text
line plus `space-1`), the 60% bar share and the 56px label spacing are rules, not lengths.

The colour roles are aliases, so they cost no new colour, but each joins the contrast tests on every level, on the band and on the
plate, in both themes. The tightest pair is the hatch on the light plate, at 3.27:1.

### The lit figure, the headline frame and N1's figures

**Status:** decided by the council (DECISIONS 153, in the stream `components-nov14`; ported from the owner's approved site prototypes with the council's
changes); the implementation hasn't been reviewed. The votes that had no majority left what is already decided standing, as the notes say. The small bar plot
(vote 10, a four-way split) was held for the owner, who chose option (a): a short `TimeChart kind="bar"` (DECISIONS 160), below.

- **Lit marks** (`TimeChart`'s `lit`, vote 1, 3 to 1): each solid mark (a bar, a marker) takes one vertical gradient in plot coordinates, lightest at the top
  of the plot, so a taller mark reaches brighter ink. Three neutral stops, `chart-lit-top`, `-mid` (at 55%) and `-base`, each 3:1 on levels 0 to 3 and on the picked
  day's plate, in both themes. A line is one stroke in the top stop. No series takes a colour: they are the same neutral ink, told apart by dash, marker and name. The
  default chart is flat `chart-observed`, as before.
- **The trend** (`TimeChart`'s `trend`, votes 2 to 5): one series' readings as small dots (`size-track`, 4px, tertiary ink at full strength) and their trailing mean
  (`trailingMean`: a 7-day window, at least 3 readings; one missing day between two readings keeps its trend, two in a row stop it) as one straight 2px line that
  breaks at a gap and never bridges it. No area under the line (4 to 0 on the dots, 3 to 1 on the area). The picked day is one head dot on the line (`size-chart-mark`
  ringed `size-cut`), with no cursor, halo or plate. How the line curves (vote 3) and the kit's two reference lines (vote 6) had no majority, so the line is joined
  straight and the guides are Basalt's gridlines, gutter and baseline rule: for the owner's review page, where three of four members wanted the kit's two labelled guides.
- **The headline frame** (`TimeChart`'s `headline`, votes 7 to 9): a 14/20, 500, secondary title and "View as table" in one 28px row; the picked day's number as the
  headline (`text-4xl` under 720px, `text-5xl` from it, in a seat as wide as its widest form, tabular); the unit beside it (the one place a headline carries the unit, a
  written exception to "the unit is written once, on the top tick": the top tick keeps it too); one context line as tall as its tallest form. There is no live region
  and no hand-built toggle; the table opens in the same figure as the still table; the key hint stays a legend; the `figcaption` is required. The number glides over
  `duration-slow` when a day is picked (vote 9 had no majority; the glide, with the readable text the target, is the vote's option that stands), and its real value is in the
  text from the first frame. It takes one series, and the legend rows of a chart that does not set it are unchanged, with their reserved widths.
- **The phase chart** (`PhaseChart`, votes 11, 16 and 17): a `TimeChart` with a trend, the one second plot height (`size-chart-plot-sm`, 96px, fixed at every width), and a
  lane of one choice a week (seven days a choice; lanes of other lengths are in the backlog) on the plot's own axis, with the open week's plate behind both. The chart ships no word for the period (DECISIONS 207):
  the lane's name, the previous and next buttons, the numbered name (a function of the index), the status line and the Enter hint are required props, each a whole string the product writes, as `PeriodStepper`'s `previousLabel` and `nextLabel` are. A press on a day, or Enter on the focused day, opens its week; the days stay images
  with a roving tab stop, and there is no live region. The chosen call takes primary ink on the `state-selected` plate with no weight change, and the plate slides over
  `duration-slow` on `ease-out` (3 to 1; none under reduced motion; in forced colours it is a 1px `Highlight` outline). The lane's choices are 44px on touch. Where a week's
  slot is under 44px (twelve choices do not fit a phone), the lane is marks (a changed week's mark is larger) and previous and next controls step through the weeks, with the
  open week in words in a seat as tall as the tallest; a keyboard still reaches every mark. The headline frame's `text-4xl` and `text-5xl` figure is used, over N1's own 22px
  phase read (DECISIONS 157, consent row C6).
- **The share bar** (`ShareBar`, votes 12 and 13): N1's form without its gloss: 8px (a plan) or 12px (a tally, each part at least 12px long and as wide as its own words, taken from the other parts so the bar keeps its width) tall, a 4px gap, full radius,
  one ink for every part (`chart-observed`), each part's share and name under it in words. The shares are whole percents that add to 100. The bar is decoration; a part of
  nothing is left out, and a part that is more than nothing but rounds to 0 reads "<1%" (spoken "less than 1%", DECISIONS 157, Q4, 4 to 0; the implementation hasn't been reviewed), and a part that rounds to 100 beside a part that is not empty reads ">99%" (spoken "more than 99 percent", DECISIONS 167, Q11b, 4 to 0), because "100%" would say the rest is nothing; every other share is a whole number.
- **The coverage strip** (`CoverageStrip`, vote 14, consent rows 6 to 8): a cell a day, lit when recorded and Basalt's hatch when not (no dashed edge), 48px tall with a
  2px gap and a 2px corner (`radius-2xs`) as a strip of slivers (84 days is a quarter), or seven squares with a 4px gap and `radius-sm` for a week. The cells are hidden from
  assistive technology; the words ("78 of 84 days recorded. Not recorded: Aug 31 to Sep 2 (watch not worn), Oct 28 to 29.") are built from the cells; a range of days writes the month once when both ends share it, in the locale's order ("Oct 20 to 21", "20 to 21 Oct" in `en-GB`).
- **The marks row** (`MarksRow`, vote 15, consent rows 9 to 11): one kind of reading across a run of days in the form of the thing measured: columns standing on the row's floor with
  8px top corners, pills, and blocks with 8px corners; a rest day is a 6px dot (`size-dot`), a missing day the hatch. It is 56px tall (`size-chart-row`, a default the app can
  set). **A written exception to "a bar is square at both ends"** (3 to 1). The marks glide to a new height over `duration-slow`.
- **The range meter** (`RangeMeter`, vote 18, consent rows 14 and 15): `Meter`'s slot (8px, a 1px input boundary, nothing inside) with its own target tick drawn twice, at the
  plan's two ends, and the reading a dot (`size-meter-marker`, 12px) ringed `size-cut`. `role="meter"`, with the plan in `aria-valuetext`. The ticks and the marker come from one
  scale. No band, no fill.
- **The short bar plot** (`TimeChart`'s `compact`, vote 10 option (a), chosen by the owner, DECISIONS 160; the implementation hasn't been reviewed): a `kind="bar"` chart at
  `plotSize="sm"` (96px) that draws no gridlines, no y labels and no gutter for them, so the plot takes the figure's width. Everything else is `TimeChart` as it ships: one series,
  square-ended bars at the 60%-of-the-day rule, zero draws no bar, a day not observed is the hatch with its reason in words, the baseline at zero, the x labels, the legend that is the
  readout, the key hint, "View as table" and the required `figcaption`. The values are in the legend, each day's sentence and the table, so the plot needs no scale of its own. Use it
  where a `Sparkline` (a line and one number) is too little and a full chart too much: counts a day with exact values, keys and a table. It is ignored for a line chart, for the 240px
  plot and past the first series: no look was decided for those. It gives up the personal site's quantised 3px marks and its Monday ruler, which were not chosen.
- **Motion:** the share bar, coverage strip, marks row and range meter draw at rest and are never a page's one entrance. A lit trend or bar `TimeChart` can be the one (the
  line draws, a bar scales from its baseline, the readings and the head dot fade; the headline's number is the real value throughout).
- **Neutral:** every colour here is neutral. N1's verdigris and brass and the kit's own colours stay with the sites; a product colour over these is D17.

| Token | Value | Use |
|---|---|---|
| `chart-lit-top`, `-mid`, `-base` | `neutral-100`, `-64`, `-52` in dark; `neutral-9`, `-30`, `-52` in light | The lit gradient's three stops; the top is a lit line's stroke |
| `size-chart-plot-sm` | 96px | The phase chart's plot |
| `size-chart-row` | 56px | A marks row's default height |
| `size-meter-marker` | 12px | A range meter's marker, inside its `size-cut` ring |
| `radius-2xs` | 2px | A coverage strip's cell (Swift: `Radius.xs2`) |

Widths the prototype set by hand are derived from tokens, with no new one: a marks column is `min(44%, 28px)` (`space-6` + `space-1`), a pill `min(26%, space-3)`, a block
`min(64%, 44px)` (`space-10` + `space-1`), a missing seat `min(72%, 52px)`, a seven-day strip at most 240px.

## Diagrams

Boxes and the lines between them, in five types: architecture, flowchart, data flow, sequence and database schema (DECISIONS 281; the
owner's prototype, one draft, a check and a decision, revised after the final positions by DECISIONS 282). The components are
`ArchitectureDiagram`, `FlowchartDiagram`, `DataFlowDiagram`, `SequenceDiagram` and `SchemaDiagram`, and the HTML skill's `diagram` module.

**Status:** decided by the council (DECISIONS 281, a handoff); the implementation has not been reviewed.

**The idea: the words are in the boxes, the lines say how they connect, and the key says what each line means.** A diagram is
monochrome. Nothing takes a colour, the accent or a status, with one exception: a service's own mark on an architecture
card keeps its owner's colours ([Service marks](#service-marks)). One node may be focal, and it is inverted ink.

### The figure

- Its order is the chart's: the title and source, the drawing, the key, the key hint, the summary (a required `figcaption`), then
  "View as list" and the list.
- Text is `text-xs` or `text-sm`. Nothing is under 12px. The drawing is laid out in real CSS pixels at its own measured width, never
  scaled through a `viewBox`, and nothing scrolls sideways.
- A node is a panel one level above what the figure sits in: the rim, no shadow, radius 8, `space-2-5` by `space-3`. Its lines are a
  kind (`text-xs` Mono, tertiary), a name (`text-sm` 600) and a detail (`text-xs` secondary, Mono only for an identifier). A Mono
  detail breaks only at its spaces, never at a hyphen, and keeps the ordinary hyphen so a copy is exact (the decider's answers, review round 64).
- **The focal node** is inverted: `diagram-focal` under `diagram-focal-ink`, its quiet lines at `opacity-amount`. One at most. The key
  says what it marks.

### Lines

- Three kinds, named by their look; the key gives each its meaning. **Main:** 2px, primary ink, a filled head. **Plain:** 1px,
  secondary ink, a filled head. **Dashed:** 1px, secondary ink, 6 on 4 off, an open head.
- Lines are orthogonal, with elbows of 8 or half the shorter leg. One head, `size-diagram-head`, at the far end. A line ends on the
  shape drawn, not on its box. A 1px line sits on half pixels, a 2px line on whole ones, and a head snaps with its line.
- **Ports are derived.** Nodes in a row or a column face each other; otherwise a line leaves sideways and enters from above or below.
  A side's one line is at its middle; a straight line keeps the middle and others take the quarter points. An author names a side only
  to change that.
- **Crossings:** place to avoid them; lines to one port share one lane and join; of two bypasses from one side, the farther-going
  leaves higher and takes the outer lane. A crossing that is left is cut: the line underneath breaks `size-cut` each side of the one
  on top. The horizontal run is on top, and a traced line is on top of an untraced one.
- **A label** is `text-xs` Mono in secondary ink, one line, never cut. On its own line it has a ground-colour plate; beside its line
  it is `space-2` clear of the stroke. Seats are taken along the run's clear shaft (the run without its head). A seat is taken only if
  the label, grown `space-1`, overlaps no node as drawn (the diamond or the capsule, not its box), label, head, boundary, rule or other
  line. A seat is measured from its line's place before the half-pixel snap, so whether it fits never turns on which way a half pixel
  fell, and from the first width a diagram draws at, it draws at every wider one (the decider's answers, review round 64).

### Fit

- **The drawn layout is used only when it fits:** the figure is at least 640 wide (`size-breakpoint-container-lg`), every track is at
  least `size-diagram-node` (a table `size-diagram-table`) and as wide as its widest unbreakable content, every label has a clean seat
  and no line passes through a node. Otherwise the figure is stacked. This is a measured fit, not a breakpoint.
- **Stacked** is one column in the author's order, at most 480 wide (`size-breakpoint-container`) on the start edge. Architecture and
  flowchart are a spine with indented branches: a rail and a trunk at the start, one lane at the end, every route taken from the order.
  A line that leaves or passes a spine card runs in an end gutter outside the cards (`space-10`, two lanes at most), down into a card's
  top or up into its bottom. A data flow is its steps in order with bypasses in that gutter. A sequence is a strip of participants and a numbered list that names each message's sender,
  receiver and kind. A schema is its cards in an auto-fit grid with no lines, because every foreign-key row writes its target.
- **A stack that would still overlap draws no lines** (the decider's answers, review round 64): a drawing known to overlap is never drawn, and all its lines go,
  not some. It is dressed as where scripting is off: no line in the key, no key hint, no roving stops, and the list open (the toggle
  stays and reads "Hide the list"). This is the one exception to every edge and label being present at every width; a development
  build says so.
- A name or a label is never cut at any width.

### The types

- **Architecture:** a group is a transparent box with a 1px dashed `diagram-structure` edge, radius 12, its label at the top start. Its
  extent is its members'. One level of grouping.
- **Flowchart:** shape carries type: a step is the box, a start or end a capsule, a decision a diamond behind its words. **Every
  flowchart shape has a 1px `diagram-structure` contour** in place of the rim, because the shape has to be seen at 3:1. A decision is
  at least `space-16` tall and never flatter than 5:1.
- **Data flow:** lanes are bands ruled apart with the divider, named at the start. A node's kind line is its step number.
- **Sequence:** a head per participant; a lifeline is 1px `diagram-structure`, dashed 4 on 4 off; a message is a 56px row with its
  number and label above the line and a note below, on plates that mask the lifelines; a self-call is a small loop; a reply is dashed;
  a band is a ruled line of words, never a frame.
- **Schema:** a table is a card with a header band and 28px rows (a key seat, the name, the type or "→ table"). A foreign key is a
  plain line from a dot on its row to a head on the referenced row. It comes from the column's own record.

### The key, the summary and the list

- The key is under the drawing and is built from the marks actually drawn, each swatch drawn like its mark. The author writes the
  words. Main, dashed and the focal node must have them. A schema's key starts with the key seats it uses, the letters set as the
  seat sets them, then "Primary key" and "Foreign key" (built in; the decider's answers, review round 64).
- The summary is required. "View as list" opens the same facts as real lists in the same figure: the parts and connections, a
  flowchart's steps with each exit written once, a data flow's steps, a sequence's messages, a schema's tables.
- The figure's words are in the HTML before script runs, and where scripting is off the list is open. Before script the figure is
  stacked unless it is at least its least width (the track minimums and gaps summed, never under 640); a figure of more than six
  columns is stacked until script.

### Keyboard, tracing and motion

- Where lines are drawn the drawing is one tab stop: a `role="group"` with `aria-roledescription="diagram"`, named by the title and
  described by the summary and a sentence about the keys. Each node is a focusable `role="img"` named by a sentence that says what it
  is, where it sits, and what it connects from and to. → ↓ the next, ← ↑ the one before, Home and End the ends, Esc clears. No live
  region. The SVG is `aria-hidden`. A layout change keeps focus on the same node, and never moves it, even into a stack with no stops.
- **Tracing** a node (hover, or keyboard focus) lifts its lines to primary ink and dims the rest to `diagram-edge-dim`. It changes ink
  and never weight, dash or head, so the key stays true. There is no trace on touch, and a node is not a target.
- A diagram is still unless its author asks for motion (`motion="animated"`); see [Motion in a diagram](#motion-in-a-diagram). A
  trace's ink changes over `duration-fast`, at once under reduced motion.

### Motion in a diagram

Decided by the council for the owner's handoff (DECISIONS 287 to 291 and 292). **Status:** the implementation has not been reviewed.

Still is the default and is the drawing above, unchanged. Animated adds an entrance and, where the data names them, a flow line, a pulse
or a packet. Motion never carries a fact alone, and it runs only where lines are drawn.

- **The entrance plays when the figure comes into view** (two fifths of the drawing, or of the window for a taller one), once a figure
  a page load, on every figure that asks for it. It is not the page's one entrance and is not stored between visits.
- **Trace:** each line draws along its length at `speed-diagram-trace`, between `duration-diagram-line-min` and `-line-max`, on
  `ease-in-out`, in the author's order (a schema's by where each starts), `duration-diagram-stagger` apart. A head fades in over
  `duration-slow` as its line is 85% drawn. Each line is revealed on its own.
- **A sequence:** its messages go in order, `duration-diagram-step` apart. A message's label lifts from secondary to primary ink over
  `duration-slower`, then its arrow draws over `duration-diagram-arrow`.
- **Every word is at rest in the first frame,** edge labels included. An entrance ends inside `duration-diagram-limit` (five seconds):
  the stagger or the step shrinks to fit.
- **It never plays** when the figure is still, under reduced motion, in forced colours, under the hold or in print. **It settles at
  once** when a node is hovered or focused, a key is pressed in the drawing, one of the figure's controls is used, the hold is set, the
  page prints or the figure's data changes.
- **Measured again** (the faces arriving, a change of width, a parent's render), a figure whose lines are the same is not written to; a
  pending figure stays pending on its new lines; a running entrance carries on, on the new lines, from the clock it started on, with
  every line that was whole still whole; a layout with no lines is at rest. A loop starts again on the new lines.
- **Flow** (`flow` on a main or plain edge): cuts of `size-cut` in the ground colour every `size-diagram-flow` march toward the head at
  `speed-diagram-flow`. Cuts exist only while they move: held, traced, still and printed, the line is solid, so the key stays true. A line
  with under 48px showing does not flow.
- **Pulse** (`pulse`, a route of nodes): a solid bead of `size-diagram-bead`, at most two fifths of the line showing, one hairline proud
  of its line on each side, at `speed-diagram-pulse`. It leaves from a card's edge and is taken in at the line's end, rests
  `duration-diagram-rest` at each card, and starts again `duration-diagram-pause` after the route.
- **Packet** (`packet`, a route of nodes): a `size-dot` dot with a hairline ring in the ground colour. A leg runs at
  `speed-diagram-packet`, between `duration-diagram-leg-min` and `-leg-max`, on `ease-in-out`; the dot stops `space-1` short of the line's
  end, is taken in over `duration-base`, and rests `duration-diagram-rest`. It sends itself every `duration-diagram-repeat` (`repeat`), or
  once for each new `send` value.
- **A card a mover rests on** takes its arrival step: its rim `diagram-hit`; the focal card's fill and edge `diagram-focal-hit`.
- **One mover a figure:** a pulse or a packet, never both. A second message waits for the first, and one may wait. Flow is a state of a
  line and never runs on an edge the mover travels.
- **The loops** (flow, a pulse, a packet that repeats) run only while the figure is in view, the tab is showing and no node is traced.
  `data-loops="held"` clears them to rest. A figure that can loop draws "Pause animations", the hold's own button (`LoopsToggle`'s
  Button form at `size="sm"`), in its foot after "View as list" (WCAG 2.2.2). A trace stops them; they start again
  `duration-diagram-pause` after it ends. Neither motion button prints.
- **A sequence's run** (`run`): "Play the run" sends one packet through every message in order. It may pass five seconds; while it
  runs the button reads "Stop the run" and stops it. The hold does not stop it.
- **Reduced motion:** the figure is still; a run steps through its messages by colour alone. **Forced colours:** the figure is still; a
  run's dot is `Highlight` with a `Canvas` ring. **More contrast:** a card's arrival rim is `text-primary`. **Print:** at rest, every
  line whole.

### Service marks

Decided by the council for the owner's handoff (DECISIONS 287 to 291 and 292). **Status:** the implementation has not been reviewed.

An architecture card may carry its service's own mark: 16px (`size-icon-sm`), in the top end corner inside the padding, with nothing
behind it. The card's first line keeps `space-6` clear of it.

- **A mark is its owner's file and Basalt never recolours it.** It has a form for light grounds and a form for dark grounds; a card takes
  the form for its ground, and the focal card the other theme's. A one-colour mark with one published file and no rule against it gets its
  second form by swapping its one fill for white or black. Nothing else is done to a file but stripping what does not draw and fitting
  the view box to the artwork.
- **A mark is decoration.** It is hidden from assistive technology and not drawn in forced colours, and it never carries a fact alone:
  the card's words name the service. It is not a control or a status and does not change on hover, trace or arrival.
- **A mark is in Basalt's set only if** it is the owner's own file, has both forms, reads at 16px on every ground, holds no lettering,
  and its ink is 3:1 on levels 1 to 3 in both themes. A service without one is its name alone, never a stand-in. On the dark theme's
  focal card AWS's orange, green and teal and CodeRabbit's orange are 2.57 to 2.71:1; that is recorded and accepted, and the test names
  them.
- **Each mark is recorded** in `packages/react/marks/manifest.json`: its source, the date fetched, its terms, its forms and what was done
  to the file. Each is one module (`@srasyndicate/basalt/marks/<id>`), outside the package's index, and the HTML skill writes into a page
  only the marks it names. The owner decided to bundle them and may remove any (DECISIONS 291).
- An app's own mark is `{ onLight, onDark }`, two URLs it has the right to show, drawn in the same seat.
- **In print** a mark prints (`print-color-adjust: exact`, with the `-webkit-` form), in the form of the theme the page prints in.

### Forced colours and more contrast

- Forced colours: lines `CanvasText`, a dimmed line `GrayText`, a traced line `Highlight`; contours `CanvasText`; boundaries, lifelines
  and rules `GrayText`; plates and cuts `Canvas`; the focal node `CanvasText` under `Canvas` ink, with `forced-color-adjust: none` on
  it and every colour inside set by hand (Chromium otherwise paints a `Canvas` backplate under its words); the focus ring `Highlight`.
- More contrast: the aliases apply. The focal node's quiet ink goes to full strength. `diagram-structure` and `diagram-edge-dim` are
  the input boundary and do not step.
- Print: the lines, the key's swatches, a card's mark and the fill of a focal node that carries a mark print whatever the reader's
  "Background graphics" setting (`print-color-adjust: exact`, with the `-webkit-` form).

### Diagram tokens

| Token | Value | Dark | Light | Use |
|---|---|---|---|---|
| `diagram-edge-main` | `text-primary` | `#f4f4f4` | `#171717` | The main line and its head; a traced line |
| `diagram-edge` | `text-secondary` | `#bababa` | `#4d4d4d` | Plain and dashed lines, their heads, a foreign key's line and dot |
| `diagram-edge-dim` | `border-input` | white 38% | black 45% | Every other line while one node is traced |
| `diagram-structure` | `border-input` | white 38% | black 45% | A group's boundary, a lifeline, a flowchart shape's contour |
| `diagram-focal` | `action-primary` | `#ededed` | `#171717` | The focal node's fill and edge |
| `diagram-focal-ink` | `action-primary-text` | `#000` | `#fff` | Ink on the focal node |
| `diagram-focal-rule` | `black-8` in dark, `white-6` in light | black 8% | white 6% | The focal table's header rule (decorative: it is the other theme's divider, because the focal fill is the other theme's ground) |

| Token | Value | Use |
|---|---|---|
| `size-diagram-node` | 144px | The least width of a node's track in a drawn layout |
| `size-diagram-table` | 224px | The least width of a schema table |
| `size-diagram-lane` | 120px | A data flow's lane-name column |
| `size-diagram-step` | 56px | A sequence's message row |
| `size-diagram-head` | 8px | An arrowhead's length and its width |
| `size-diagram-guide-dash` | 4px | A lifeline's dash, on and off |

The motion tokens (DECISIONS 292). The motion tokens do not collapse under reduced motion: nothing they time runs there.

| Token | Value | Use |
|---|---|---|
| `duration-diagram-line-min` | 400ms | The shortest a traced line takes to draw |
| `duration-diagram-line-max` | 900ms | The longest |
| `duration-diagram-stagger` | 220ms | Between one traced line's start and the next |
| `duration-diagram-step` | 320ms | Between one sequence message's start and the next |
| `duration-diagram-arrow` | 500ms | A sequence message's arrow drawing |
| `duration-diagram-limit` | 5000ms | An entrance ends inside it; the stagger or the step shrinks to fit |
| `duration-diagram-leg-min` | 500ms | The shortest leg of a packet |
| `duration-diagram-leg-max` | 1100ms | The longest |
| `duration-diagram-rest` | 400ms | A mover's rest at a stop, while the stop holds its arrival step |
| `duration-diagram-pause` | 1200ms | Between two runs of a pulse; and before loops resume after a trace |
| `duration-diagram-repeat` | 4000ms | Between a repeating packet landing and its next start |
| `speed-diagram-trace` | 300 | A traced line, in pixels a second, clamped by the two line durations |
| `speed-diagram-packet` | 250 | A packet's leg (4ms a pixel), clamped by the two leg durations |
| `speed-diagram-pulse` | 120 | A pulse's bead |
| `speed-diagram-flow` | 16 | A flow line's march |
| `size-diagram-bead` | 24px | A pulse's bead, along the line |
| `size-diagram-flow` | 12px | From one flow cut to the next (a cut is `size-cut`, so 10 on, 2 off) |
| `diagram-hit` | `text-secondary`; `text-primary` under more contrast | A card's rim while a mover rests on it |
| `diagram-focal-hit` | `action-primary-hover` (`#fff` dark, `#000` light) | The focal card's fill and edge while a mover rests on it |

Under more contrast `diagram-focal-rule` is drawn as `diagram-focal-rule-contrast` (`black-45` in dark, `white-38` in light: the other
theme's input boundary, 1.18), the way the other aliases of that mode are declared.

**Not tokens, by choice:** the gaps, the rail (`space-3`), the trunk (`space-8`), the branch indent (`space-12`), the entry inset
(`space-6`), the end gutter (`space-10`, lanes at `space-3-5`) and the quarter-point slots are rules made of the space scale.

## Layout

The layout lengths and breakpoints (decision 101). Each is a token under `size`, emitted to CSS, JavaScript and Swift.

**Status:** decided by the council (DECISIONS 101); the implementation has not been reviewed. The names were counted one by one,
because no whole set had two of three votes; the owner is asked to look at them as a close call.

| Token | Value | What it is |
|---|---|---|
| `size-header` | 56px | The sticky bar: its border box, its hairline inside. The top safe area is padding above it |
| `size-tab-bar` | 56px | The phone tab bar, its hairline inside, before the bottom safe area |
| `size-sidebar-width` | 256px | The app sidebar from the large breakpoint; also a page's own aside |
| `size-rail-width` | 72px | The rail, from the medium breakpoint to the large |
| `size-page-width` | 72rem | The inner row, gutters inside: the header's row and a data page |
| `size-prose-width` | 34rem | A prose page's text column |
| `size-gutter` | `space-6` (24px) | The row's inline padding |
| `size-gutter-narrow` | `space-4` (16px) | The same, under the medium breakpoint |
| `size-section-gap` | `space-32` (128px) | The space between a page's sections, from the large breakpoint |
| `size-section-gap-md` | `space-24` (96px) | The same, from the medium breakpoint to the large |
| `size-section-gap-narrow` | `space-16` (64px) | The same, under the medium breakpoint |
| `size-display-measure` | 13em | The widest line of display type, in the headline's own em |
| `size-breakpoint-md` | 720px | Below it: the phone (tab bar, the menu sheet, the narrow gutter) |
| `size-breakpoint-lg` | 1024px | From it, the sidebar; below it, down to md, the rail |
| `size-breakpoint-container-sm` | 340px | A component's own width: from it up to `size-breakpoint-container` a two-line `Button`'s note shares the label's line |
| `size-breakpoint-container` | 480px | A component's own width: a description list stacks and a chart goes narrow |
| `size-breakpoint-container-lg` | 640px | A component's own width: under it the 56px tabs step to 48, stacked panels turn off and the period stepper takes its own row |
| `size-description-label` | 160px | The description list's label column |
| `size-list-width` | 320px | The list column of a list with a preview pane; the pane is pushed instead below this + `space-4` + `size-breakpoint-container` (816px) |

- **A rem token** stays a rem in CSS and JavaScript, so the measure follows the reader's text size. In Swift the generator resolves it
  to points at 16 to the rem (72rem is 1152, 34rem is 544), and the generated doc comment says so.
- **Derived properties** are set by Basalt's layout CSS and are not tokens, because each adds what only the device knows:
  - `--basalt-gutter`: `size-gutter`, or `size-gutter-narrow` under 720. Apps use this one.
  - `--basalt-section-gap`: `size-section-gap`, `size-section-gap-md` from 720 to 1023, or `size-section-gap-narrow` under 720.
  - `--basalt-hero-size`, `-line-height` and `-tracking`, and the same for `--basalt-display-*` and `--basalt-lead-*`: what a role resolves to in the
    window's band (see [Display type](#display-type)).
  - `--basalt-sticky-offset`: `size-header` plus `env(safe-area-inset-top)`. It is the `top` of anything sticky under the bar; with
    `space-4` added it is the page's `scroll-padding-top`, so an anchor lands below the bar.
  - `--basalt-bottom-offset`: `size-tab-bar` plus `env(safe-area-inset-bottom)` under 720 in an app with a tab bar, else 0 (and 0 while an
    on-screen keyboard is up: the bar is covered). It is the page's bottom padding, and from 720 where the toast stack sits.
  - `--basalt-pinned-top` and `--basalt-pinned-bottom`: the measured form (see [The keyboard and what is pinned](#the-keyboard-and-what-is-pinned)),
    what really covers each edge, while a page opts in.
  - `--basalt-keyboard-inset`, `--basalt-viewport-top` and `--basalt-viewport-height`: while an on-screen keyboard is up, what it covers at the
    bottom, where what is seen starts, and how tall it is.
  - `--basalt-shell-width`: `size-sidebar-width` plus `size-page-width`, the capped app shell's width. An app sets it on the root for
    another cap.
- **Breakpoints in CSS** are range syntax with the number written and a lint exception that names the token, because a media or
  container query cannot read a custom property: `@media (width < 720px)`, `@container (width < 480px)`. Range syntax means there is no
  719/719.98 pair to keep in step and no gap on a fractional viewport. Components answer their **own** width (`@container`); pages
  answer the viewport.
- **For apps with PostCSS,** the tokens package generates `breakpoints.css` (`@custom-media --basalt-phone (width < 720px)`, `-md`,
  `-lg`, `-rail`). **In script,** `@srasyndicate/basalt-tokens/breakpoints` exports `breakpoint.md`, `.lg`, `.container`, `.containerSm` and `.containerLg`, so
  ``matchMedia(`(width >= ${breakpoint.md}px)`)`` never carries the number, and `@srasyndicate/basalt-tokens/durations` exports `duration` (every
  named duration in milliseconds: `duration.confirm`), so a timer never carries one either. The HTML skill reads both at build time
  (`%bp-container-lg%`, `%duration-confirm%`), and `packages/tokens/test/repeated-numbers.test.mjs` holds every number written in a query to its token.
- **A prose page** (`Prose`) has a column of `size-prose-width` on the row's **start edge**, never centred: its first letter lines up
  with the brand above it and with every chart and table. A data page fills the row.
- **On Apple platforms** the sidebar width is `navigationSplitViewColumnWidth(Basalt.Size.sidebarWidth)`, the system's bars stay native,
  the compact size class is the phone, and measures are `@ScaledMetric` so a prose column grows with Dynamic Type.
- **The HTML skill's build** substitutes these values instead of hand-writing 720 (DECISIONS 91, batch 7): its sources write `%bp-md%`,
  `%bp-lg%` and `%bp-container%` in range syntax, and the build reads them from the generated tokens.

### The page: the row, the sections and the columns

**Status:** decided by the council and approved by the owner (DECISIONS 137 and 139); the implementation has not been reviewed.

- **The page row** (`PageRow`) is `size-page-width` with `--basalt-gutter` inside, the site header's row exactly, so every headline, lead, table
  and chart starts under the brand. It is the row of the first screen too: art that wants more is full-bleed in a `Stage`, never a wider
  row. The side safe area replaces the gutter where it is larger, as the header's padding does.
- **Sections** (`PageSections` holds `PageSection`s, each with a `SectionIntro` for its headline, lead and `SectionActions`) are one section
  gap apart (`--basalt-section-gap`: 128, 96, 64). A page's first section starts half a gap below the bar; a section's head is half a gap
  above its body; the page ends one gap above its footer.
- **No screens of empty page.** The widest empty band on a page is one section gap, art excepted. A first screen is as tall as what it holds:
  no section is sized from the viewport (`vh`, `svh`), and none is made tall to be scrolled through. A page is also tested, not only
  styled: the first line of the next section's headline shows on the first screen at 1440×900, 1280×720 and 390×844. That test yields when a
  reader enlarges text or spacing, and it is never met by shrinking type, clipping, or fixing a height.
- **Columns** (`Columns`, with `ColumnsItem span` for an item's own) are twelve tracks on the row, the gutter as the column gap and
  `space-8` as the row gap: layouts `2`, `3`, `4`, `7-5`, `5-7`, `8-4` and `4-8`, or an item's own span. From 720 to 1023 `2` and `3` hold,
  `4` becomes two rows of two and everything else stacks; under 720 every item takes the full row, in source order. **An item's own span holds
  from 1024 only** (DECISIONS 144): from 720 to 1023 the layout's rule decides, so an unnamed layout's items, and an item that sets its own span,
  are a full row there, and a hand-written 7 + 5 cannot escape the stacking of a named `7-5`. A display headline never sits in a span under 7:
  `ColumnsItem` warns in development when it holds a display or hero heading in a `span` under 7, and `Columns` does the same for the items a named
  layout makes under 7 tracks from 1024 (every item of `2`, `3` and `4`, the 5 of `7-5` and `5-7`, the 4 of `8-4` and `4-8`); the heading is drawn as written
  and the warning costs a production build nothing. Columns are a page's: a component lays out its own items by its own width (the auto-fit grid).
- **Layout changes at 720 and 1024 only,** on the viewport, and a component answers its own container at 340, 480 and 640 (`size-breakpoint-container-sm`, `size-breakpoint-container` and `size-breakpoint-container-lg`). The display roles, the lead, the section
  gap and the columns change at those two widths, so a page has three shapes to check. **No new breakpoint:** 900 and 1280 are not adopted
  (the row is already 672 to 975 wide at 900, and past 1152 nothing has room to change at 1280). A site's art may answer its own measures as a
  container query on the art.

## Art

Full-bleed art at the top of a page, and pictures in the flow (decision 104; the council voted 8.5, 8.5 and 8, a three-member round, DECISIONS
93). The components are `Stage` and `PairedArt` (the stage), `FramedArt` (a figure), and the headroom check, a test helper.

**Status:** decided by the council (DECISIONS 104); the implementation has not been reviewed.

### The stage

Full-bleed art at the top of a page, behind a clear [site header](#the-clear-bar-over-art). One stage at the top, which is the page's first content, and at most one [closing block](#the-closing-block) at the end (DECISIONS 162, vote 2).

- **Level 0.** It is the page painted with art: no rim, radius, shadow, line or fade is added where it ends. It ends on `art-field`, the page
  colour, so there is no seam. A soft end is the art's own pixels.
- **It starts at y = 0 under the bar,** pulled up by `size-header` plus the top safe area (the sticky offset), and its content starts below
  the headroom. Its height is the hero's, not the stage's. While its art loads it shows `art-field`.
- **Paired art.** The stage takes a dark and a light version and shows the one for the page's theme, including a theme chosen with the toggle
  (the theme roots choose, as the tokens do, so `prefers-color-scheme` alone is not enough). Art drawn with the art tokens swaps by itself.
  It is never dimmed, inverted, tinted, filtered or blended. A picture with one version is not a stage: it goes in a frame.
- **Decorative.** Stage art is hidden from assistive technology. In forced colours it is not drawn (the stage is `Canvas`), and in print it
  does not print.
- **What is on it** is ink in quiet zones and solid level-1 panels with their rim: never glass, a scrim or a translucent card. A credit goes
  under the stage in the flow, never on the art.
- **The headroom** is the top `size-stage-headroom` (80px: the bar's 56 plus `space-6`) plus the top safe area, across the full width. It
  holds no pixel past `art-quiet-limit`: nothing lighter in dark, nothing darker in light. The stage declares that its headroom passed (the
  `headroom` prop), and `SiteHeader` clears only over a stage that declares it. The same limit holds for any ink the stage's content puts on
  the art: its zone is marked `data-quiet`, and the drawn art keeps detail out of it. How the art leaves room is the art's; a quiet zone need
  not be a box. The top safe area is unverified on a real notch.

### The closing block

A second form of `Stage` (`closing`), at the page's end (DECISIONS 162, vote 2, 4 to 0; Blacksand's "The way in"). **Level 0 on `art-field`,** as the stage is.
**No headroom and no pull-up:** there is no bar above it, so it has no headroom marker and declares none (`headroom` has no effect), and the bar is not
changed by it. The air above it and its top padding are `--basalt-section-gap` (128, 96 or 64 by width: consent rows 5 and 6, the prototype's slopes
snapped to the page's own steps, the ends equal); its bottom padding is the art's room to the floor, `--basalt-stage-room`, which the app sets. Its art
layer is the stage's (absolute, `inset: 0`, clipped, `pointer-events: none`, hidden from assistive technology), and its words and actions sit in `data-quiet`
zones, which `checkHeadroom` reads grown by `space-1-5` (`stage: ".basalt-stage[data-closing]"`: a closing block has no headroom marker, so only its zones are read, and it must have one). **Its marks keep out of those zones at every width:** place them in pixels inside the top padding, never by a percentage of the block's height, which lands on the words when they wrap taller on a phone (round 45 drew stars on its headline at 390 that way). **Its art is held still:** a mark that carries `data-ambient` is drawn at full opacity and does not
loop, because a page has one ambient loop and it is the top stage's (the 24-mark cap and the one hold stand). In forced colours and print the art is not
drawn, the block is `Canvas` and its bottom padding is `space-16`. The sky, the dunes and the grain are the site's own. **A drawing with labels set on it
is not ported** (vote 3, 3 to 1): it recomposes for its box, which foundations already calls the site's own (DECISIONS 146 F). Status: the implementation
hasn't been reviewed.

### The headroom check

A test helper for a product's own browser tests, and Basalt's, imported from `@srasyndicate/basalt/testing` (a module of its own; the root
export and the components never import it, so it is not in an app's bundle). `checkHeadroom(browser, { load })` renders the page at 390 and
1440, in each theme, at 1x and 2x, with the bar's ink and the stage's content hidden, reads every device pixel of the headroom and of each
`data-quiet` zone, and fails if any pixel crosses the limit, naming the worst one. Nothing samples at run time: a cross-origin image cannot be
read, and it would cost every page. The pixels come from a screenshot decoded on the page's own canvas, so the browser resolves every colour,
`oklab()` and `oklch()` included. Each `data-quiet` box is read grown by `space-1-5` on every side, so a zone needs no CSS (DECISIONS 146 F). Add the product's own art breakpoints to `widths`.

### Framed art

A picture in the flow is a distinct object, so a panel's geometry.

- **The rim** is a real 1px border outside the art (`border-rim`, lit on top in dark), never laid over its pixels. **Radius 12** on the page
  (`radius-lg`); inside a panel the nested-radius rule (a card's 12 less its 16 of padding is square). **No shadow:** it does not float.
- **Drawn art** goes in the same frame (`art` in place of `src`, an inline `svg` or `canvas`): it keeps its proportions and fills the box (`fit="slice"`, the default; `meet` shows all of it on `art-field`), held at its `anchor` (`end floor` is `xMaxYMax`), and its lines do not scale (`vector-effect: non-scaling-stroke`). `Stage` takes the same `fit` and `anchor`, `slice` by default too; a drawing's own `preserveAspectRatio` stands unless a `fit` or an `anchor` is passed. A drawing that must recompose for its box is the site's own, and so is one with labels set on it (DECISIONS 146 F and 162, vote 3).
- **An aspect ratio is always set,** from the four tokens (`aspect-photo`, 3:2, is the default), so the frame reserves its box before the art
  loads and nothing shifts. The art fills it with `object-fit: cover`.
- **While it loads,** and if it fails, the frame shows `surface-placeholder` and nothing else: no shimmer (a placeholder is not running work, so it does not loop), no spinner, no
  blurred preview (blur belongs to the chrome). Once decoded the art fades in over `duration-base` on `ease-out` (100ms, opacity only, under
  reduced motion). If it fails, meaningful art shows its alt text in secondary at 13/18, centred; decorative art shows nothing.
- **Caption and credit** are a `figcaption` under the frame, `space-2` below it, start-aligned, at most `size-prose-width`: the caption is
  `text-sm` in secondary and the credit a line of its own at `text-xs` in tertiary. Never over the art.
- **Print and forced colours:** framed art is content, so it prints and keeps its pixels, and its rim is `CanvasText`.

### Art tokens

| Token | Dark | Light | Use |
|---|---|---|---|
| `art-field` (`color.art.field`) | `neutral-0` | `neutral-98` | The ground of drawn art and of a stage: the page colour |
| `art-tone-1` | `neutral-7` | `neutral-94` | The first step off the field: a horizon, a far ridge, a shadow |
| `art-tone-2` | `neutral-20` | `neutral-75` | Middle forms, and the last tone a quiet zone may hold |
| `art-tone-3` | `neutral-42` | `neutral-52` | Detail starts here: lit edges, lines, stars. Never in a quiet zone |
| `art-tone-4` | `neutral-75` | `neutral-30` | Strong forms and highlights |
| `art-mark` | `text-primary` | `text-primary` | The strongest point art may reach |
| `art-quiet-limit` | `art-tone-2` | `art-tone-2` | No pixel past it in the headroom or a quiet zone: `#333333` in dark, `#bfbfbf` in light |
| `size-stage-headroom` | 80px | 80px | `size-header` plus `space-6`; the safe area is added by the layout CSS (`--basalt-stage-headroom`) |
| `aspect-square`, `-photo`, `-screen`, `-wide` | 1, 1.5, 1.6, 1.7778 | | 1:1, 3:2 (the default), 16:10, 16:9 |

- **Drawn art is monochrome:** greys from the tones, named by their distance from the field and not by light or dark, so one drawing swaps
  between the themes by itself. It never goes past `art-mark`, and gradients are only between neighbouring tones. No accent. **A text ink is not an art tone** (DECISIONS
  162, vote 1, 3 to 1): a drawing's lines take the tone nearest the ink they were drawn in, `text-primary` to `art-mark` (the same colour), `text-secondary` to
  `art-tone-4`, `text-tertiary` to `art-tone-3` and primary at 30% to `art-tone-2`; stroke widths are the drawing's own, and text drawn in the SVG stays a text
  ink. SRA's windows and curve are the first drawings to take them (in dark the mid lines get a little lighter and the fine lines a little darker).
- **Photographs are content:** they keep their own colour, in a frame, as they are.
- Every colour is an existing neutral, so no primitive is new. The contrast tests carry `text-primary`, `text-secondary` and `border-focus` on
  `art-quiet-limit`, and `text-primary` on `state-selected` and `state-hover` over it, in both themes.
- **On Apple platforms** the system bar is transparent at the scroll edge and a material once content scrolls under it, so it does this
  itself; the art tokens generate to Swift like every colour (`Basalt.Colors.artField`, `Basalt.Aspect.photo`).

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0 | Hover-in colour, selection |
| `duration-fast` | 100ms | Hover-out, toggles, colour changes |
| `duration-base` | 150ms | Tooltips, menus, popovers, the hover glide in popup rows and in navigation |
| `duration-slow` | 200ms | Dialogs, accordions, tab indicator and panel, the segmented and vertical-tab pill, a value glide (`useGlide`) |
| `duration-slower` | 300ms | Sheets and drawers, a travelling spinner, a travel's leg of up to 150px |
| `duration-figure` | 600ms | A figure's own motion: each mark of a page's one entrance, and the longest leg of a travel the eye follows. Never a control, popup, panel, page or block |

`duration-stagger` is 22ms: the step between the marks of one figure entering, shrunk so every start falls within `duration-slow`
of the first. Under reduced motion `duration-figure` is 100ms and `duration-stagger` is 0.
A diagram's own durations and speeds (`duration-diagram-*`, `speed-diagram-*`) are in [Motion in a diagram](#motion-in-a-diagram);
they time nothing but a diagram.

Loops are not on this scale: they repeat while work is happening. `duration-loop-ring` is 640ms,
`duration-loop-braille` 800ms, `duration-loop-fade` 1200ms and `duration-loop-ambient` 6000ms, the middle period of a page's
one ambient loop (each mark runs 0.6 to 1.4 times it).

| Curve | Value | For |
|---|---|---|
| `ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Entries, and every move that answers input |
| `ease-in` | `cubic-bezier(.4, 0, 1, 1)` | Exits, at three quarters of the entry |
| `ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | A rest-to-rest travel the eye follows: TravelSpinner, and a traveller crossing a figure (see Travel), and loop pulses |
| `ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Spinners |

Nothing overshoots: Vercel's overlays overshoot by 10% (`cubic-bezier(.175, .885, .32, 1.1)`);
Basalt's settle. A press is a colour step; Button and IconButton also scale to .98 over `duration-fast`
on `ease-out` while pressed, and back, on `:active` only, never when disabled, loading or busy, and on nothing
else (no row, card, menu item, command row or the parts of a field; there is no `basalt-press` utility). A popup (Menu, Select,
Combobox, Popover, Tooltip) enters from opacity 0 and scale .98, from where it grew
(`--transform-origin`), with no offset, in `duration-base` on `ease-out`, and leaves at three
quarters of that on `ease-in`. A Dialog enters the same way from its own centre (it grows from no opener), in `duration-slow`, and leaves at three quarters of that on `ease-in`. The horizontal tab underline, and the panel that moves 8px with it, run on
`duration-slow` `ease-out`; the panel never remounts. Three kinds of thing loop, and nothing else: a mark that says work is running
(the ring, braille, a busy Button's ring, a busy TextButton's underline, the indeterminate Progress bar, Sparkline's loading line, Skeleton's pulse and a written field's fill), a
page's one ambient loop, opacity only, in its art, and an animated diagram's live lines (a flow line, a pulse, a packet that repeats);
`data-loops="held"` stops all three.

**The sliding pill.** A one-of-many control, the segmented control and vertical tabs, holds one pill, and it slides to
the chosen item by `transform` and size (`width`, and `height` for the vertical list) on `duration-slow` and `ease-out`,
constant whatever the distance. It is a transition, so a second change turns it from wherever it has reached. The
chosen label's ink changes at the press, over `duration-fast`; it does not wait for the pill. The shared pill is an
enhancement over each item painting its own pill: it is drawn only once the chosen item has been measured, and never
under reduced motion or in forced colours. Under reduced motion each item paints its own pill and fades it over 100ms;
in forced colours the chosen item is `Highlight` with `HighlightText`, with no backplate box. A tap on touch is a
choice, so it slides there too, and a target stays at least 44px. The horizontal underline already slides and is
unchanged. A control where several items can be on has no single pill to move, and does not slide.

**The hover glide.** In the popup rows of Menu, Select, Combobox and CommandMenu, and in navigation, one plate per popup or list follows the
pointer between rows on `duration-base` and `ease-out`, constant whatever the distance; each row's own plate is the
fallback underneath. The primitive stays the authority on which row is active (Base UI's highlight, cmdk's selection);
the glide only paints it.

- **Entering from outside**, the plate appears on that row in place, at once, with no flight from a stale row.
- **Leaving**, a move in progress freezes where it is, and the plate fades in place over `duration-fast` on `ease-in`.
  This is the grace: if the pointer reaches a row while the fade runs, the plate travels from where it is and returns to
  full opacity. Once the fade is done, it appears in place again.
- **The keyboard** moves the highlight at once, with no travel, because in a popup the plate is the keyboard position:
  arrows, Home and End snap it. The last input decides: a pointer glides, a key snaps. In navigation the first key hides the
  glide and the focus ring shows instead (see [Navigation](#navigation)).
- **The command menu** keeps its plate when the pointer leaves, as it always has: it is the selected row, so it never
  fades, and the pointer moves it from that row to the next. **The command list in the page** shows its plate only while the field has
  focus or the pointer is over the list, and fades it, as Menu's does, when neither is true; with a preview pane the plate marks what the
  pane shows, so it stays lit and moves only by the arrows or a press.
- **The notification centre** is the third kind: its entries are links and buttons, so the glide follows the pointer on navigation's rules, one
  plate between entries of 40 and 58 tall, hidden by the first key (with the resting hover), back on the next pointer move.
- **Off** on touch (`(hover: none)`, a coarse pointer or a touch `pointerType`), where the row under the finger shows
  its own plate on press; under reduced motion, where each row lights on its own, in at once and out with a 100ms fade, with
  no travel; and in forced colours, where each row is `Highlight` with `HighlightText`.
- The shared plate is pointer-inert and hidden from assistive technology, and the page is correct without script.

**What persists, stays.** A control or word that is in both states does not remount. Only the
part that changed moves: shared letters stay put, and a change to a panel moves the panel, not the
page.

**What persists, stays** has one more line: a filtered or sorted list moves what stays to its place and never replaces it (see
[Items that move to their places](#items-that-move-to-their-places) and [motion](motion.md)).

**The entrance.** One figure on a page's first screen may draw its marks once, at load, on a first visit: each mark over
`duration-figure` on `ease-out`, `duration-stagger` apart, the step shrunk so every start falls within `duration-slow` of the first.
A bar scales from its baseline, a line draws along its length, a mark fades in; nothing translates, clips or blurs. An entrance draws
one figure's marks inside a frame that is already there. Words, numbers, controls, cards, panels, images and sections never enter;
they are at rest in the first frame, and nothing enters on scroll. A control used mid-entrance takes over: every mark glides from where
it is drawn over `duration-slow`, and the visit counts as seen. The page's path is stored as seen in `localStorage`
(`basalt-entrance:<path>`) when the entrance finishes or gives way, never before it plays. A second visit, reduced motion, the root
hold, a hidden tab, a page opened below its first screen, a script that starts more than a second after navigation, print and no
script all draw the figure at rest, and the hold or printing that arrives while it runs settles it at once, with no new animation (printing is the print media query changing, or the browser's own `beforeprint`, which a real print fires without a media change). A page
change without a reload counts as a load (DECISIONS 143): the app tells the entrance when the change began (`markPageChange()`, the skill's
`Basalt.pageChange()`), and the same gates apply from then: a first visit to that path, on its first screen, within a second of the change;
with nothing reported, the document's own clock is used. A path reached that way is stored as seen when its entrance finishes or gives way.
The skill's chart glides every mark from where it is drawn when a new data set arrives mid-entrance, as React's does. One a page, and only for a figure whose marks carry the page's point: a `Chart` with `entrance`.
A brand mark's own entrance is the brand player's rule and is not counted here. Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.
A diagram's entrance is a rule of its own and is not this one: it plays when its figure comes into view, on every figure that asks for
it ([Motion in a diagram](#motion-in-a-diagram)).

**Travel.** A traveller that leaves a resting place and stops at another on screen, carrying something the reader follows, moves by
transform on `ease-in-out`: a leg is `duration-slower` up to 150px, 2ms a pixel above that, and `duration-figure` from 300px (so a
diagram puts a stop at least every 300px); it rests 200ms (`duration-slow`) at a stop while the stop takes its colour step, and a run
ends inside five seconds. Each trigger is its own traveller: a second leaves from the start while the first keeps its course, and with
two in flight a third lands the oldest at once, its outcome written. Under reduced motion the traveller appears at its destination
with a 100ms fade and the outcome is written at once. The hold does not stop a travel the reader started, and nothing sends itself
under it. The timing is `travelLeg`, `travelRun` and `createTravellers`, exported; a run ends inside five seconds for every plan it accepts (no leg is made shorter than 100ms, and a plan whose rests and shortest legs cannot fit, more than 17 legs, 16 stops, is refused with an error); `TravelSpinner` keeps its single `duration-slower`
leg, because it answers an accept in an app. Anything that answers a pointer or key in place (the pill, the plate), an entry or exit,
scroll and a loop is not a travel. Basalt's own diagrams move their packet on slower legs of their own, hold one mover at a time and let a run the reader starts pass five
seconds with a button that stops it ([Motion in a diagram](#motion-in-a-diagram)). The hold still never stops what the reader started. Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.

**An ambient loop.** One a page, only in its art (a `Stage`'s art or a framed drawing; a closing block's art is held still, DECISIONS 162), and never on text, a control, a data mark, a
panel, a rim, a block or anything that carries information. Opacity only, from 1 to 0.2 and back on `ease-in-out`: no translate,
scale, rotate, blur, glow or colour change. Each mark's period is 0.6 to 1.4 times `duration-loop-ambient` (6000ms), with its own
phase, so no two are in step; a looping mark is no wider than `size-dot` (6px), and a page has at most 24. It joins the root hold
(`data-loops="held"` holds every mark at full opacity, and releasing rejoins the shared clock), and it is still under reduced motion,
in forced colours and in print. `ambient(index)` and `AmbientMark` are the React parts. A page with an ambient loop shows
`LoopsToggle` in its header's end cluster (WCAG 2.2.2). Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.

**Items that move to their places.** When a filter or a sort changes a list or a grid, each item that stays moves by transform from
where it is drawn to its new place over `duration-slow` on `ease-out`, whatever the distance; an arrival fades in place over
`duration-slow`; a leaver is the same element, out of the flow where it stood, inert and painted under the movers, fading over 0.75 of
`duration-fast` on `ease-in`. A second change starts every item from where it is drawn, opacity included. If focus is in an item that
leaves, it goes to the next item that stays in the order drawn, else the one before, else the result line (`tabindex="-1"`), without
scrolling. The box's height glides on the same clock, clipped at its edge with a `space-1-5` margin so a +2 ring stays whole; nothing
above or beside it moves, and what follows it moves once, with it. Only items on screen move, and past 48 that would move the change
lands at once (a chosen limit, not a measured budget): an item that stays where it was is not one, so swapping two of 49 animates. Under reduced motion items and the box take their places at once, arrivals
fade over 100ms and leavers go at once. No item is ever replaced. A table keeps the still-table rule and is not part of this.
`Reflow` and `ReflowItem` are the React parts. Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.

**A number beside a figure** is its real value in the first frame, the entrance included, and never counts up. A later change in place
glides with the marks over `duration-slow` (`NumberTicker glide`, with the readable text the target). Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.

Under `prefers-reduced-motion`: no transform, no size and no position animates (a press keeps its
colour step and its scale is 1). `duration-base`,
`duration-slow`, `duration-slower` and `duration-figure` are 100ms and `duration-stagger` is 0, so state changes become short fades; the toast
stack sits at its final offsets and only fades; Progress width jumps; NumberTicker is plain
tabular text at the same width and baseline (in the sentence's own line, and the same in forced colours, where it does not roll); the toast drain is not drawn; Sparkline snaps its
scale and labels; a travelling spinner appears at its destination with the same fade; an entrance is not played and a list's items take their places at once; an ambient loop is still; a tab change is
a 100ms crossfade; a glyph that swaps (a plus to a check, an empty seat to a check) crossfades over `duration-fast` all the same, because it is opacity only; the horizontal tab underline does not move; the segmented and vertical-tab pill and the hover glide do
not travel (each item shows its own pill or plate, fading over 100ms). Spinners fade or hold still, and a loop is
never cut to 100ms.

The components and what each does are in [Motion and primitives](motion.md).

## Icons

Basalt has a core set of its own, drawn by the design council (decisions 38 to 40, 54 and 55): the
core actions, navigation and Blacksand's product nouns. Each glyph is a module of
`@srasyndicate/basalt` (`HomeGlyph`), and the long tail is Phosphor (MIT), Bold at 16, 20 and 24.
A product's own logo is its own; the social marks are Phosphor's (below). A diagram's service marks are not icons: they are their owners' files, in their owners' colours, with rules of their own
([Service marks](#service-marks)).

- **Which set draws a glyph.** Wherever a component draws check, close, the chevrons, copy, plus, minus or search, it draws the core
  set's glyph; Phosphor Bold draws what the core set lacks (the status marks, the sort caret, the social
  marks), and the key glyphs ⌘ ⌥ ⌃ stay Phosphor's. A component never draws Phosphor's version of a core glyph. **Status:** decided by the
  council (DECISIONS 138) and approved by the owner (DECISIONS 139); the implementation has not been reviewed.
- **Drawing.** Actions are exactly three straight lines (copy, edit, trash and download are the
  agreed exceptions, drawn richer). Every other glyph is eight cubic slots on the 24 grid, and an
  unused slot is an invisible point. The stroke is a constant 2.25 units on 24 (1.5px at 16,
  1.875 at 20, 2.25 at 24), with round caps and joins, and a point is drawn 1.5 times the stroke.
  Colour is `currentColor`.
- **Rest and selected come from one drawing.** Most navigation and product glyphs have one
  intentional opening at the object's own joint, 2 units of air between the caps. Selected closes
  it, fills every closed loop and turns the strokes inside a loop into holes. Actions keep their
  drawing.
- **Morphs.** Only rest and selected, a rotation group (the four arrows, the four chevrons, plus
  and close), and the drawn pairs menu and close, play and pause, copy and check, chevron-down and
  download, both ways. Every other change swaps at once. A morph in flight keeps its identity: a
  request for where it is going does nothing, a request for where it came from runs it back, and a
  request for another member of its group turns on; anything else swaps at once. They run at
  `slow` on `ease-out`, and reduced motion swaps at once. Status: Basalt's controls draw their core glyphs through the morph (engineering restoring DECISIONS 38 and 55); the implementation hasn't been reviewed.
- **Sizes.** Glyphs are drawn at 16, 20 and 24, and at 12 only as a mark inside a box: a choice box's check or dash (the core's) and a key chip's ⌘ ⌥ ⌃ (Phosphor Bold's, which the core does not draw), the chip drawn at its real height, `size-kbd`. Status: decided by the council and approved by the owner (DECISIONS 138 and 139); the implementation hasn't been reviewed.
- **The long tail** is Phosphor Bold at 20 and up, as at 16, so its line is the core's. Fill only
  for selected navigation and object identities whose drawing keeps its silhouette (`fillSafe`).
  Danger is the XCircle, everywhere.

- **Site icons** (council, DECISIONS 106 and 107). The set for a site's links is Phosphor Bold's own logos, at 16, 20 and 24:
  GithubLogo, XLogo, LinkedinLogo, InstagramLogo, YoutubeLogo, and EnvelopeSimple for email, with TerminalWindow for a palette
  or panel glyph (not a social link). Substack, Bluesky, Threads, TikTok, Medium and RSS have no mark here: a service
  without one is its name alone, never a stand-in glyph and never a brand's own file (Bluesky's and Substack's guidelines forbid
  the recolouring and redrawing Basalt's icons need, and a solid mark among Bold lines reads heavier). The new-tab arrow is the
  core `external` glyph, not Phosphor's ArrowUpRight.
- **A social link** is a glyph and the service's name, one pattern for a footer and a profile (`SocialLink` in `SocialLinks`;
  the skill's `.links`). The glyph is before the name, `space-1-5` apart. The name is underlined in `border-input` at rest,
  brightening to `currentColor` on hover, and the glyph is never underlined. Glyph and name are secondary at rest and primary on
  hover and on focus, with the control ring at +2: no wash, no weight change, no press scale (it is a link, not a Button). A link
  takes its container's text size (13/18 in a footer, 14/20 in a profile row), and the glyph is 16 beside 12 to 16px text and 20
  beside 18 to 24px (the status seat's rule). It opens in the same tab by default, and the visible name is its accessible name;
  `target="_blank"` draws the core arrow after the name and adds the phrase (none on `mailto:`). In forced colours it is
  `LinkText`, glyph and arrow included.
- **A row of social links.** Links are `space-4` apart and wrap. On touch each link is at least 44 by 44 as real layout, and the
  16px gap becomes 8px of hit area on either side, so neighbours touch and a wrapped line never overlaps the next. A row never
  goes in the site header's bar.
- **Icon only** is allowed only for a row made entirely of marks (an author card): ghost IconButtons rendered as links, 32px
  (44 on touch), `space-1` apart, each named for its service, keeping IconButton's .98 press. A new-tab mark has no arrow and
  keeps the phrase in its name. A row that needs Email or a service without a mark is the labelled row.
- **The long form** is a profile list (`ProfileLinks`; the skill's `.rows` with `.profile-links`): a row per service, the
  glyph in the row's seat and the handle as the hint. A service without a mark keeps an empty seat (the glyph's 16px and the
  row's `space-3` gap, on the start side) only when another row in the list has a glyph, so every name starts at one x, as the
  notification centre's mark seat does. The seat is padding, not an element, and it belongs to this list: it never re-indents
  a menu or palette row without an icon (whether Menu's rows should line up the same way is a separate question).
- **The skill draws Phosphor Bold at every size,** as above; it has no Regular weight.

Icons take `currentColor`, default to the secondary text colour, and turn primary when active.
Navigation glyphs in a sidebar or rail are primary at rest, like their labels. On iOS, system
concepts (back, share, settings) use SF Symbols.

## Controls of DECISIONS 154

Decided by the council on 15 Nov 2026 (DECISIONS 154, a vote of four on the ports from the owner's approved prototypes). **Status:** the
implementation hasn't been reviewed. Each part below is ported from a site the owner approved (DECISIONS 151); the council changed only what
broke a rule, and each change is named.

- **Sizes (D11a).** Controls take four rungs above 40: 44 (`size-control-2xl`), 48 (`3xl`), 52 (`4xl`) and 56 (`5xl`), radius 8 at every one (the
  drawn-box rule), 16px text. `Button`, `IconButton`, `Input`, `Select`, `Combobox`, `NumberField` and `MultiSelect` (`controlSize`) take them, and
  the prop sets the pixels. Button text is 600 at 44 and up and 500 at the shipped sizes (A6). The prototype's 15px text is 16 (`text-md`). Compact
  steps every rung down one, and a touch target stays 44.
- **Outline (A7).** `Button` variant `outline`: transparent, a 1px `border-input` edge drawn inside the box, primary ink; hover takes the edge to
  primary ink; a press is the selected wash. It never toggles.
- **The amount (D11b, A8).** `amount` after the label, in tabular figures, in a seat as wide as the widest amount named in `amountReserve`, so the
  label and the button never move. Its ink is the label's at `opacity-amount` (0.72) on primary, secondary and outline, where that holds 4.5:1 on every
  fill and surface (the contrast test proves it), and the label's full ink on ghost and danger, where it would not in light (the council's consent row 11,
  by the AA rule and not by vote; in dark the lifted secondary would hold, and the rule is kept, DECISIONS 166). Full ink in forced colours.
- **The count pill (D11d, A11, A12).** `count` on a `Button`: an outlined pill 24 tall in `border-input`, the number 600, secondary at zero and
  primary above, never a fill and never a colour. It holds two tabular digits (0 to 99 never moves the button; no majority: reserve two digits stands,
  and a third digit widens it). It is `aria-hidden`; the button's name carries the count.
- **Two lines (D11b).** `note` on a `Button`: the label (14/20, a `<code>` in it is mono) over a note (13/18, secondary), start-aligned, at least 64
  (`size-control-6xl`); in a container 340 to 480 wide they share one line at 48, 12px apart. A disabled one keeps the label's ink on the note.
- **Done (D11c, A9, A10).** `IconButton` `done`: the plus becomes the core check in the button's own ink, in one shared seat, with a 100ms crossfade
  that stays under reduced motion (DECISIONS 138, C10). No fill, no selected plate, and the name does not change: a `StatusLine` outside says what
  happened. `useConfirm` holds it for `CONFIRM_MS`, the `duration-confirm` token (1500ms, which the copy buttons now share).
- **Full width (X12).** `Button` `fullWidth`: as wide as its space, label centred, nothing else changes.
- **The text button (D5d, A1).** `TextButton`: no box and no control height, the surrounding text's font, primary ink, a 1px `border-input` underline
  3px off that goes to the ink on hover, radius 4 for the focus ring, an optional `iconEnd` that is not underlined, a quiet form in secondary ink. It
  has no pressed state: a choice between two is a `SegmentedControl`. On touch one on a line of its own has a 44px hit box that changes no layout; one
  in a sentence keeps its line. It takes no `Button` box and no .98 press.
- **The switch row (D9a, A2, A3).** `SwitchRow` in a `SwitchRowGroup`: one checkbox drawn as a row, an optional tile, a name and a kind, and a 16px
  seat where a plus and a check cross over in 100ms (kept under reduced motion). The edge is `border-field` at rest and checked (`border-input` outside more contrast); hover lifts the ink to
  primary and the edge to `text-secondary` (not `border-hover`, which is fainter than the boundary and would drop it under 3:1). On is the selected
  wash and primary ink. It is 52 tall from 720 wide with a 36px tile and a 14/20 name, and 48 under 720 with a 32px tile and a 13/18 name: the
  council could not draw the ballot's 48 (a 36px tile, 12px of padding and two edges make 50) and kept the approved prototype's values. The row is not
  a filter: no count, no Clear and no seven-or-more rule; what it does to the page is said once by a `FilterResult` (400ms). In forced colours on
  is `Highlight` with `HighlightText` and no outline.
- **Option chips (D9b, A4, A5).** `OptionChips`: one of many, eight at most, as chips that wrap with no track: a fieldset with a legend and a small
  count; a chip 44 tall, radius 8, padding 10 before and 14 after, 16px, 8px apart, with a round 16px seat every chip reserves (a ring at rest, filled
  with a 12px check when chosen). The chosen chip is the selected wash and primary ink and its edge does not change. A value that cannot be chosen
  takes `unavailable` (the words): the disabled look, its words kept, `aria-disabled` and reachable, never chosen by a click, Space or an arrow key
  landing on it.
- **Link tabs (D12, A13, A14, A15).** `LinkTabs` and `LinkTab`: a `nav` of links on a hairline, the current one `aria-current="page"` with a real 2px
  underline element (`Highlight` in forced colours) that does not slide, the control ring at +2 outside (never an inset outline), 36, 48 or 56 tall
  (56 steps to 48 in a container under 640), 24px between two labels, the first with no start padding. **Under 720 wide the row is replaced by a `Select` of the
  same links** (A15, 3 to 1, Castle's form; Grok's write-in, the row at every width with the `Select` left to the app, lost): both are in the server's markup and CSS alone
  chooses at `size-breakpoint-md`, so nothing moves or flashes on load, and the one not shown is `display: none`, out of the accessibility tree and the Tab order. The
  `Select` is Basalt's own, drawn at Castle's 44 for Castle's 48 row (36 for the 36 row in a container under 640 on a wide window, 48 for the 56 row, the bar's narrow height; a 36 Select is 44 on a coarse pointer and in any window under 720, as Basalt's is (B5); what is below moves across 720 by the row's height less the Select's: −8, 4 and 8px), and its value is the current link's `href`, always the row's `aria-current`. **It navigates at once and says so first** (DECISIONS 158, Q2, 3 to 1: WCAG 3.2.2's own exception for a change of context the user has been advised of): a "Go to" label (`goToLabel`; in the skill, the text of `.link-tabs-select-label`) is drawn before the current page's name inside the trigger, in secondary ink on the Select's one line (the multi-select trigger's form, a label then its value, so the height does not change and nothing moves at 390), and its words start the Select's accessible name ("Go to Everything"; WCAG 2.5.3, Label in Name), so the nav's name alone is not enough. **Only a real choice navigates:** a choice from the open list (a click, or Enter on the highlighted option). No key on the closed `Select` does: a typed letter changes the value and fires `change` on a native select and calls Base UI's `onValueChange` (reason `none`) on the closed trigger, and both are held, so the value stays the current page's; the arrow keys open the list in React and navigate nowhere. Navigating is `onNavigate(href)` for an app's router, else `window.location.assign`. With `onNavigate` (or the skill's cancelled `linktabsnavigate`) routing in place, focus stays on the `Select`; on the default a new page loads and focus starts over there. The prototype's route effect that moved focus to the page's heading is X10 and is not ported. `Tabs` takes the same `size`. A link tab takes the selected state a `Tab` takes (DECISIONS 138
  A, 145, 149; the ballot's D12 row): the current link's label is 600 in primary ink and a resting one 400 in secondary, every label reserves its 600 width and
  starts at the same edge, so choosing a page moves no link and no word (`LinkTab`'s label takes `ChosenLabel`; the skill's link tabs draw the label before the
  underline through `reserve()`). Castle's own row is 500 at rest; Basalt's rule wins where the two differ. Status: built; the owner approved it (DECISIONS 161: "a link tab is 400 at rest and 600 when current").
- **Panels that share one seat (X6).** `TabsPanels stacked`: every panel stays mounted in one grid cell, so the view is as tall as its tallest panel and
  a change of tab moves nothing under it; the panels not shown are `visibility: hidden` and inert. It turns off under 640 (its own width), and it is off
  by default.

## Parts of DECISIONS 162

Decided by the council on 17 Nov 2026 (DECISIONS 162, a vote of four on the last port batches from the owner's approved prototypes). **Status:** the implementation
hasn't been reviewed. D17 (an accent as a fill, and a product's palette) was not voted: it waits for a research round on colour and contrast. The flat table and
the closing block are described with [the table](#lines-states-and-actions) and [the stage](#the-closing-block).

### Captioned columns

`CaptionedColumns` is a short head over a sentence, in columns (vote 4, 4 to 0; Blacksand's "what follows" list and its drawing's captions): one part in two sizes, each
with the approved values, and a description list (`dl` of items, a `dt` and a `dd` in each). **Large:** each item has a `border-divider` rule on top and `space-6` of
padding above and below, the head `text-xl` at 600 in primary (tracking from the token), `space-3` above a `text-md` 400 sentence in secondary. **Small:** one `size-hairline`
rule over the whole list and `space-5` under it, `space-6` between rows, the head `text-base` at 500 in primary, `space-1` above a `text-base` 400 sentence in secondary.
The gutter is `size-gutter` in both. **The count is the app's** (`columns`, 1 to 4): the part has no breakpoints, because the approved pages differ (3 from 900px
for large; 2 from 480 and 4 from 960 of the container for small) and the breakpoints are the app's container. Neither `Card`, `Stat` nor `DescriptionList` is this shape.

### The app tile

`AppTile` draws the picture an app gives it, clipped to the icon shape, with a 1px hairline round it (votes 5 and 6, 4 to 0; N1's integrations). **The shape is a
superellipse of exponent 5 at every size and takes no radius**; the hairline follows it, drawn over the picture and half a pixel outside it, `border-hairline`,
non-scaling. It is flat: a tile in the flow does not float, so no shadow. Nothing is drawn over the picture, and none is recoloured, dimmed, cropped, turned or
animated. Sizes: 20, 32, 36, 40, 44, 48 and 52 (or the parent's, square). It is decorative (`aria-hidden`), **always beside the company's name,** and not drawn in
forced colours. Each tile carries its own clip, so none can be left unclipped by a page that forgot a definition. **Basalt ships no company's picture for a tile,** in the
package, the reference or the skill: the tile shows what a product has the right to show, and the tests and the round use a neutral stand-in. There is no
fallback when the picture is missing. The one set of company files Basalt ships is a diagram's service marks, by the owner's decision ([Service marks](#service-marks)).

### The period stepper

`PeriodStepper` is two icon buttons round a label that says which stretch of time is shown (consent rows 1 to 3 and vote 7, 4 to 0; N1's week stepper). It is not
`Stepper` (back and next through a short flow) and not `Pagination`. The buttons are `IconButton`s, ghost, 32px, the core `chevron-left` and `chevron-right`
(`Pagination`'s), `space-1` from the label. The label is `text-base` at 500 in primary, centred, tabular, on one line, in a seat of at least `space-32` (128px).
**At the first or last period the button stops but keeps focus** (`aria-disabled`, `focusableWhenDisabled`), so a keyboard user is not dropped. **With no periods** (the
whole span shown) both buttons are `visibility: hidden` and keep their room, so nothing moves. **It is spoken once:** the label is shown at once and a polite
status line says its words, with a hidden prefix ("Week 8, build, "), after it has held still for 400ms, so six presses in a second speak once. **Under 640px of
the app's container** it takes its own row under the tabs: full width, the buttons at the ends, 52px tall, `space-2` of inline padding, a `border-divider` line above (DECISIONS 167), each button at
least 44 by 44. The buttons are a press, an explicit act, so WCAG 3.2.2 is not engaged.

## Lists and modals

**Status.** Picked by the owner from Opus's prototype (DECISIONS 224, 226), with no council vote. The implementation has not been reviewed. Three of the prototype's defects, found
in Sol's ballot, are not copied (see "Defects" below). `Pagination` is fixed in place, `ListBand` and the form `Dialog` are new in this round, and a numeric `Select`, a toolbar
`MultiSelect` that holds its width, and a `FilterToolbar` with a search are the parts of a filtered, paged list. Back to top (DECISIONS 225) was prototyped separately and is
built here after the owner's word on Opus's second prototype (DECISIONS 227 and 228): Back to top and the list's foot, below. Their implementation has not been reviewed either.

**The rule: tasks open in the center; columns open at their side.** A task, meaning anything with an end (a form, a confirmation, a choice that is applied), opens as a centered
`Dialog` over the scrim from 720. Under 720 a task that holds text entry is a full-screen modal, and a decision stays a centered `AlertDialog`. A side `Sheet` is only the narrow
form of a column the page docks when it is wide enough, and it opens from the side where the column docks. Under 720 that column is a bottom `Sheet`, as is a short list opened
from the bottom of the screen. The top `Sheet` stays the site's narrow menu. (The owner's DECISIONS 222: lists are paginated with a choice of how many to show, and can be filtered;
a form or task opens as a centered modal over a darkened page, not a side panel.)

### Everything that changes a list sits above it

The filters come first (`FilterToolbar`), then one band (`ListBand`) with the count, the pager and the page size. Only the rows below change, so nothing above can be pushed. A bar
under the list moves whenever the list's height does, drops rows away from the pointer when the reader picks a larger page, and leaves a keyboard's next Tab outside the new page
(found by: the first app's lists, where a bar under the rows moved 891px across their pages). It is for a list of rows in a rimmed panel and for a still table alike.

- **The band** is one row on the page's own fill, with no rim: the count at the start, the pager in the centre, the page size at the end (`size-select-min` is not for a number).
  From 720 it is `position: sticky` under the app's bar, opaque in the page colour (it is not the one smoked surface), at `layer-sticky`, with a `border-divider` line under it
  only while it is stuck (an observed sentinel says so; in forced colours the line is `CanvasText`). When the page or the size changes while it is stuck, the window returns to where
  the band rests (one helper in `ListBand`, not one per list), so the new page's first row shows under the band and Next, Next, Next is one place on screen. Under 720 it does not
  stick: the bar and the tab bar already take 112 of a phone's height. It is `container-type: inline-size`; in print it is static.
- **The scroller** is the window unless the app names one (`scroller`, an element or a ref): a list in a pane that scrolls on its own sticks to that pane's top, returns that pane to
  where the band rests after a page change, and its Back to top watches and moves that pane. In a pane the band rests at the pane's top edge (`--basalt-sticky-offset` is 0 there;
  an app with a sticky header of its own inside the pane sets the property in its own CSS). The return waits for the page or size the press asked for, however long the app takes to
  load it, and forgets the press when a filter changes or the app moves somewhere else.
- **The count** is "1–25 of 214", `text-sm`, secondary, tabular, in a seat as wide as its widest form for the unfiltered total ("888–888 of 888"), so a shorter count moves nothing.
  It is blank for no matches.
- **The page size** is a `Select` of the app's sizes (10, 25, 50 and 100 unless it gives others) followed by the words "per page", named by the app's noun and those words ("Orders
  per page"): the visible words are inside the name (WCAG 2.5.3), the noun is the app's. The size a list starts at is the app's too (the examples start at 25; it is not a default),
  and so is whether it remembers the reader's choice. A new size keeps the reader's first row in view (page 3 at 25 per page is page 6 at 10).
- **It is spoken once.** A page or size change is said by the band's own polite status line after 400ms of stillness ("Page 2 of 9. Orders 26 to 50 of 214."). A search or a filter
  (a change of the app's `filterKey`) clears the line, and only `FilterResult` speaks a filter ("Showing 37 of 214 orders"): two numbers with two jobs, each beside the control that
  drives it. A total that changes by itself (rows arriving in a live list) is neither, so it never swallows a page change said with it; without a `filterKey`, a change of the total is
  read as a filter.
- **Narrow.** Under `size-breakpoint-container-lg` (640) of the band's own width the numbers go (under `size-breakpoint-md`, 720, on a coarse pointer, where the wide form's three tracks cannot hold 44px targets and the page size covered Next from 640 to 690): Previous, the count and Next, with the page size after them. It is a row that wraps by what it measures, and both parts are reserved widths, so it never changes with its content: one row where they fit (a 193px pager and a 132px page size in 358), and where they do not (a 343 band on touch needs 340.1, and the 292px card) the page size is the end of a second row, so nothing overflows. The count is centred between the arrows (its seat holds the widest form and the text sits in the middle of it). The page size is a `sm` Select with a real `<label>` ("per page"); the band, Back to top and the list are one element, so the band sticks within the list.

### Back to top and the list's foot

**Back to top** (`BackToTop`, part of `ListBand`; DECISIONS 227 and 228, the owner's design: "someone is scrolling down and then the scroll back up to top appears at the top of the screen during
scrolling, and if someone physically scrolls up the scroll back up to top goes away"). It replaces a corner button and its position-only rule.

- **Where.** At the top of the screen, centred on the list, `space-2` under the bar, and from 720 `space-2` under the band where it is stuck. It sits in a dock of zero height right after the
  band (the dock is `position: sticky`; from 720 the band's measured height is added to its top), so it floats over the rows and takes no room: nothing moves when it appears or leaves. It is
  clear of the tab bar, the toasts and the bottom safe area (they are at the bottom), and of any other floating scroll control (one a view: a view that already floats a "go to the
  newest" control leaves Back to top out with `backToTop={false}`).
- **When.** It appears while the reader scrolls down, once the list's top is more than one window above the window's top (a page of 10 rows never reaches it), and it stays while they rest. It
  leaves when they scroll up. The direction turns only after `space-2` (8px) of travel back from the furthest point reached, and the scroll position is held between the page's two ends, so an
  overscroll's bounce is never a turn. It never leaves while it holds focus (it goes when focus leaves), and it is not drawn while a modal is open. One passive scroll listener, once a frame:
  the header's phases are decided by position and never by direction, and this control is about direction, by the owner's design.
- **Look.** A secondary `sm` Button with the core `arrow-up` and "Back to top", solid (the header is the one smoked surface), its own fill and hairline plus `shadow-overlay` because it floats,
  level 1 like a toast, at every width: 28 tall with radius 6 on a fine pointer, 44 with radius 8 on touch (radius by role); no full radius, which would be a new role for one control. It is not a
  second glass pill. In forced colours it is ButtonFace with a ButtonText border and no shadow.
- **Motion.** It fades and never slides: opacity over `duration-fast` on `ease-out` in, 0.75 of that on `ease-in` out, visibility going at the end of the fade so a hidden button is never a focus stop.
  Under reduced motion it is the same fade and `transform` leaves the transition list.
- **A press** goes to the top at once, with and without reduced motion (the distance is screens long, and a smooth scroll would only stream rows past; a large moving area is a vestibular trigger),
  and focuses the list's heading with `preventScroll` before the jump: the start of what the reader came back for, with the search, the filters and the band after it in the Tab order. Its name
  is "Back to top": it names the place, not a mechanism.

**The list's foot** (under 720, with more than one page). The band's Previous, count and Next again, centred under the rows, with no seat under it (the page's own bottom padding is all that follows;
DECISIONS 227: the empty seat and the off-centre pager were what the owner objected to). It holds no page size: that is a setting and stays at the top with the filters. It is a `nav` named by the app
("Order pages, end of list"). It is not drawn from 720 (the band is stuck there), nor with one page or none. A press changes the page, returns the window at once to where the band rests (the band
under the bar and the first row under it), moves focus to the band's own Previous or Next, and the band's status line says the page once; Back to top goes, since the window moved up.

**The ring fix.** The band's narrow form and the foot set an arrow, the count and the next arrow `space-1` apart, so an arrow's +2 focus ring (2px wide, ending 4px out) touched the count's text. The
count keeps `space-1` more on each side: 8px between an arrow and the count, the ring clearing it by 4px.

### Pagination: seven fixed slots

Past seven pages the pager is seven slots: `1 2 3 4 5 … N`, then `1 … p−1 p p+1 … N`, then `1 … N−4 N−3 N−2 N−1 N`. Every slot, the gap included, is as wide as the widest page
number the list can reach (its unfiltered count at the smallest size; `maxPages`), at 600 in tabular figures: a list that can reach 22 pages reserves "22" (a 36px slot), one of 49 pages "49". The
box reserves `min(7, maxPages)` slots in one cell, so with fewer pages the numbers sit centered between the arrows and nothing moves. Previous and Next are always there and stop at
an end without leaving focus (`aria-disabled`, as the period stepper's arrows do). At one page or none a bare pager renders nothing, as before; in the band (`keepRoom`) it is `visibility: hidden` and keeps its room with `role="none"`, never an empty `nav` landmark (the stepper's `whole`);
the count stays. It never wraps. The gap glyph is the core `more` (a component never draws Phosphor's version of a core glyph; engineering). A press on a number moves focus to the
button that holds the current page; Previous and Next keep focus. A bare `Pagination` is its own container and goes to Previous, "Page 3 of 22" and Next under 640 of its width. It
keeps the shipped look: ghost `sm` buttons, the numeral at 600 against 400 on the raised plate with its hairline, the hover wash of DECISIONS 145 item 3; the figures are tabular, and
a link-mode page takes the same 10px of inline padding as a button's. The shipped pager moved Next by 51.5px across 22 pages and 57.3px across 49 at 1440, and wrapped in a 292px card at 390.

### A number's select and a trigger that holds its width

- **A numeric select** (`Select numeric`) is as wide as its widest option, below `size-select-min`, and does not follow its value's width: every option is drawn in the trigger's one cell, unseen.
- **A `MultiSelect toolbar` trigger** reserves the width of its widest value ("Any", or the longest label with the largest "+N"), so choosing values moves nothing after it (found by: the
  first app's filters, which grew by up to 80px without it and pushed the result line). The cost is some empty room in "Status Any". A trigger in a narrow column fills it and cuts the value with an ellipsis.

### Filters over a list

`FilterToolbar` over rows: the `search` field first (the app's own, named for what it searches, "Search orders", `size-search-trigger` wide from 720, a row of its own under it), then
the filters (an array; each sits in its own column under 720), then `FilterResult` on a full row after them. There is no sort on a list that already has an order that matters (a list
ordered by urgency or by time). **A search or a filter returns to page 1.** The empty state follows DECISIONS 207, in the panel in place of the rows, one sentence and one button: a
search alone says "No orders match “zzq”." with **Clear search** (focus goes to the search field); a filter says "No orders match these filters." with **Clear filters**, which clears
a search too, and with a search the sentence names the term: "No orders match “zzq” with these filters." (focus goes to the first filter's trigger, since the button leaves with the
empty state). The band keeps its room: the count is blank, the pager hidden. The words are the app's.

### The form dialog

`DialogContent form` is the centered modal for a form or task, at 480 (`size-dialog-width`) over the `scrim`, level 1, the rim, radius 12, `shadow-modal`; what it holds starts at 2. Its parts are the
sheet's head, body and foot (DECISIONS 155) in the dialog's box, unchanged: a held head with the title (`text-xl` 20/28) and a 44px Close on a divider, a body that scrolls and opens with
the description (so the held head stays one line), and a held foot with Cancel, then the primary. A form that moves from a sheet to a dialog keeps its parts.

- **Height.** At most the window less `space-4` above and below, with the head and foot held and the body scrolling (528px at 1440 by 560).
- **Its top is held where it opened** (where a dialog of its height would sit, never nearer the window's edge than `space-4`), and it grows downward: an error under a field adds its height and the title does not move. It re-centres only on a window resize.
- **The scrim closes it only while nothing has been entered** (the owner, DECISIONS 233: "it makes sense to have the guard if there's information filled in, but if there's no info filled it can minimize/close"). Esc, Close and Cancel always close it. "Entered" is read at the press, by the fields' structure: every selected option of a select (one or many), whether a checkbox or radio is checked (a checked group included), the files a file input holds, and the text of the rest (a Select, a Switch, a Combobox: each keeps a hidden input), against what they held when the form opened, so a field typed into and emptied again counts as nothing entered. **The app's own answer wins** (`dirty`): for a custom control with no input, or defaults that load after the form opened, the app says whether anything is entered. The form's state lives only while it is open: opened by any means it starts with nothing entered and no remembered input, and closed by any means both go. **Drafts and discards are the app's:** Basalt keeps no draft, and an app that keeps one across a close holds the values in its own state. There is no "discard changes?" step: one task at a time.
- **Focus** on opening goes to the first field; when a touch opened it, to the title (`tabindex="-1"`, no ring), so no keyboard rises over a form before it is seen. The choice is by the input that
  opened it (a key press on the opener focuses the field even in touch emulation); a controlled dialog falls back to the primitive's reading. On closing, focus returns to the opener.
- **Under 720 it is a full-screen modal:** the whole window, square, no rim or shadow (no edge meets the page), level 1, rising from the bottom on the sheet's motion (300ms in, 225ms
  out), the head under the top safe area and the foot over the bottom one, the foot's two actions equal 44px buttons, Cancel first. A centered box at 390 is a 358px box inside 16px of scrim on a
  screen that is already short, and a bottom sheet leaves a strip of page at the top that invites a stray tap and promises a drag. An alert dialog (a decision) stays centered at every width.
- **Motion** is the dialog's own (a scale from .98 and a fade over `duration-slow`); under reduced motion it only fades.
- **Found by** the first app's tasks (a create form, a publish form and a people search) and its docked reading column; how that app applied the rule is in its own record
  (DECISIONS 222 and 224). A non-modal side panel is not proposed.

### Form gaps: columns, a choice in a field, and a label's action

**Status:** decided by the owner in the first app (DECISIONS 237, 239 to 241: a sliding pill for a required choice with nothing chosen at first, two columns on one grid, a text button on a
label's row) and taken into Basalt without a vote (DECISIONS 242, under DECISIONS 234); the implementation hasn't been reviewed. Found by that app's multi-column create form (Opus's prototype,
round 2). React's alone: the HTML skill's `forms`, `segment` and `dialog-form` modules draw none of it, and none is added.

- **The form grid** (`FormGrid`, `FormGridItem`, and `column`, `row` and `rows` on `Field`). Fields in columns that line up. Every cell takes four tracks a row: label, control, hint and error, and is a subgrid on them, so the cells beside
  each other share every track: a label, a control's top and bottom, a hint and an error on one row sit on the same pixel across the columns (measured 0px at 1440, 1024 and 720, with errors showing). The spaces are Basalt's and each is held by its
  track as a margin: the field gap (`space-1-5`) inside a field, the form gap (`space-4`) above a label that is not in the first row, `space-8` between columns. A ratio sets the columns (`columns="3-2"`). A field that spans rows keeps its label on the
  first row's label track and its hint and error on the last row's; its control (a `Textarea`) fills what is between, so its bottom is the bottom of the control beside it. Every control is `size-control-md` (32) tall: the input, the combobox, the
  segmented control (28 segments in a 2px track), and a `Switch`'s row (its 18px switch centred in the 32). Every edge is straight: a field's label, control and hint start at its column's edge, and a control ends at it. **It answers the
  width it is given, not the window:** it is the columns where its own width is at least `size-breakpoint-container-lg` (640) and the window at least `size-breakpoint-md` (720), and
  one column in the markup's order anywhere else (a phone, the 480 form dialog, a narrow pane on a wide screen), the field gap and the form gap as in any `Form`; the grid's frame is the
  container its width is read from. Not measured: a tablet from 720 with a touch pointer, where Basalt draws touch targets at 44 (a segmented control is then 48 and the
  fields beside it 44).
- **A segmented control in a form.** `fullWidth`: equal segments filling the container, the pill still sliding. In a `Field` the label names the group, with "Required" after it as on other fields; `required` says the word in the group's name, because a
  group of pressed buttons takes no `aria-required`; `invalid` sets `aria-invalid`, and the group is described by the line and, while invalid, by the field's error. **No invalid look is decided**, so it draws no danger hairline or colour of its own: the error line is
  what shows. It is one tab stop: Tab lands on the chosen value, or the first that can take focus while none is chosen, and the arrows move focus without choosing. With no value it shows no selection and draws no pill.
- **`TextButton`** keeps focus when it disables itself (`focusableWhenDisabled` is on by default), so a press that disables it does not drop focus to the page. Its underline reaches a `Reserve` child, under the words shown, so a button whose words change holds
  the width of the longest.
- **A `Switch` description.** A line under the switch's row in a field description's style (`text-xs`, secondary), at the column's start edge, not indented past the switch, linked by `aria-describedby`.
- **A field hint whose words change** (a `Reserve` in a `description` or an `error`) lays out as a block that wraps at the field's width, so the line holds its room and never moves the field.
- **`ActionShortcut` in a form dialog's foot under 720.** The foot's two actions stay equal 44px buttons: the button inside the shortcut's wrapper takes the rule.
- **`Field`'s `labelAction`** (DECISIONS 241: a text button on a label's row, such as "Suggest a name"). A node at the end of the label's row, on the label track: the row (`basalt-field-label-row`) holds the `<label>` and the
  action, the action's end on the column's end and its baseline on the label's. The action is not inside the `<label>`, so a press on it never focuses the control, and the label stays as wide as its words and "Required"
  (DECISIONS 233: a press on the empty space between them does nothing). In a `FormGrid` the row is the label track, so it lines up with the fields beside it, 0px; a field with no `labelAction` draws no row. React's
  alone. The implementation hasn't been reviewed.
- **Open.** A status callout on a segmented control is not decided.

### Defects not copied

The prototype's band kept saying "Page 2 of 9" after a filter narrowed the list to one match; the band's line is now cleared when the filter changes (`filterKey`, or the total
where the app gives none). Its first focus followed the pointer
type, so Enter in touch emulation still focused the title; it now follows the input that opened the dialog. Its compact form needed 340px, overflowing the 292px card; the page size now
moves to a second row under 340.

### Measured

Across a paged list of 214 rows (every size, Next to the end and back at each size, every page number, every value of both filters, the empty state and searches) and a still table
(every size, every page, every sort), and a second, unlike list in a pane that scrolls on its own (`packages/react/test/agnostic.test.mjs`), the band, Previous, Next, the count's seat, the page size, each page slot, the search and both filter triggers and the table's columns moved 0px at 1440, 1024, 720 and 390
(`packages/react/test/lists-modals.test.mjs`). Not checked: a real phone (on iOS the held foot sits under the keyboard while typing, as in any web form), WebKit, Firefox, a screen reader and a
Windows contrast theme.

## Lists and facts

**Status.** Gaps found by building CIMIP on Basalt (cimip-gaps-2, batch B6), decided and built by Opus on the no-council path (DECISIONS 226 and 265); Astra reviews the
code and the lead checks the pixels (both done; the menu rows' wrap is the owner's pick, DECISIONS 275). Every part is general and is shown in the review round (62) in at least two unlike
domains. React's alone (see [What the HTML skill does not draw](#what-the-html-skill-does-not-draw)).

- **A panel of rows** (`PanelList`, `PanelRow`). Rows of one list in one panel: the panel's level (one above what it sits in, 3 at most), its one rim, radius 12 (a card's),
  and a `border-divider` between rows, never above the first or below the last. Each row is a link (with `href`) or a button across the whole band. It is not a form of
  `DirectoryList`: the directory is a site's ruled list on the page, rimless, with no wash, three fixed columns and an arrow; a panel of rows is an app's list of things to
  open, where the band is the target. A row is a title (primary, 500, `text-base`), an optional description (secondary, `text-sm`), a leading seat centred on the title's line
  (a plain `Badge`, an `Avatar`, an icon), a trailing value on the title's line (secondary, `text-sm`, tabular, never cut) and anything the app adds under the description.
  The title and the description are one line each, cut with an ellipsis, so a row's height is known; the whole text is still read. Padding `space-3` by `space-4`; at least
  44 tall on a coarse pointer. **Hover** is the hover wash, full bleed, and lifts no ink; a **press** steps to the selected wash; **focus** is the 2px ring inside at −2, because
  the band is flush with the panel's clipping edge, and the first and last rows take the panel's inner corner (12 less the rim, 11) so the ring follows it. A row that opens a
  new tab draws the new-tab arrow after its title and says so. Name the list (`aria-label`, or `aria-labelledby` on its heading).
- **A list to choose several from, outside a table** (`SelectableList`, `SelectableItem`, `SelectionBar`). The table's selection (see Selected rows), for a list: a chosen
  row is the selected wash as a band and its checked box carries the state, and rows are divided by `border-divider` as a table's are. The row is its checkbox's label, so a
  press anywhere on it chooses it; focus is the box's own ring at +2, inside the row's padding (`space-2-5` by `space-3`), as a band that holds its own control focuses that
  control. The **bar** holds the all box (checked when every row is chosen, mixed while some are, disabled when none can be; its words are the app's, "Select all" by
  default), the count in words in a polite `role="status"` line ("2 of 8 selected" by default, or the app's own noun) whose room is held for the widest of its wordings for none, one, all but one and all (or the app's `widest`), and the actions
  at the end, which stay mounted and are `aria-disabled` at zero so focus stays. It sticks to its edge of the scroller (`barSide`: above the rows, or under them for a list at
  a sheet's foot), opaque in its surface's colour on a `border-divider` (it is not the smoked surface), and is static in print. The app owns the data: `values` lists what can
  be chosen now, and a row whose value has left it (one dealt with) keeps its place and its box with an empty check seat, so nothing moves under a pointer, and it is no longer
  counted. A row that leaves, or is dealt with, while its box holds focus hands focus to the next row that can still be chosen (else the one before, else the all box),
  so focus is never lost to the page. A chosen row keeps the selected wash under the pointer: hover is for rows that are not chosen. The value is always in the list's order.
- **Entries outside the notification centre** are B7's `NotificationList` (the centre's rows in the page, with no head, a current entry and a name), not a part of this batch.
- **One-line facts in a narrow column** (`DescriptionList narrow="line"`). Under 480 of its own width a list stacks by default, which doubles a narrow column's height. With
  `narrow="line"` each label and value stay on one row there, and the label column narrows to `size-field-label-inline` (80px, the inline field label's width, so no token is
  made); the gap stays `space-4`, a long label wraps inside its column, and several values (`values`, a name then a line then an action) stack in the value column `space-1`
  apart, as from 480. From 480 it is the list as it ships. The default stays `stack`, so no shipped list changes.
- **Missing-value words.** "Not observed" is for a reading that could have been taken and was not (a measurement, a sensor, a coverage figure): it stays the default of
  `DescriptionItem missing` and `TableCell notObserved`. Anything else that has no value says what is absent, in the app's words, as the children of the same prop (or a `DescriptionItem`'s `values`; whatever the caller supplies is what the row says, and "Not observed" is only the default): "None yet",
  "No one", "No email", "No issue linked", in sentence case, naming the thing where the label does not. It is the same tertiary ink with no mark, and never blank, a dash or a
  zero (a zero is a value). The words belong to the product: Basalt has no second default.
- **Code that wraps** (`CodeBlock wrap`). An opt-in for a command that must be read whole in a narrow column (one a reader is asked to approve). Each run of characters
  between spaces is drawn as one word that never breaks inside, and the spaces stand between the words, so a line breaks at a space and nowhere else: never after a hyphen, a
  slash or a dot, where a browser's own wrap would break a flag or a path. A word longer than the line is not broken: the block scrolls sideways for it, as an unwrapped block
  does. With no prompt each source line is a row whose continuation is indented 2ch (an empty line keeps its 20px), so a wrapped line never reads as a new one; beside a
  prompt the gutter already marks where a line starts and the continuation starts at the text's edge. Copy takes the code as given. The default still scrolls.
- **A select at its own width** (`Select toolbar`). In a toolbar row a `Select` is as wide as its widest label, not its container's width: every option and the placeholder
  stand unseen in the value's one cell (as `MultiSelect toolbar` does), so a choice moves nothing after it, and two selects and a search share a row. With a `valuePrefix` the label leads and the seat follows it, holding the
  same width. In a column narrower than that it fills the column and cuts the value with an ellipsis; in `FilterToolbar` under 720 it fills its column, as the filters' triggers do. `numeric` stays the form for numbers.
- **What sits between a form dialog's description and its first field.** A spacing rule, not a slot: the body's blocks after the description are one stack at the form gap
  (`space-4`), so a block between the description and the first field (a row of ready answers, a callout, a sentence) sits `space-4` above the field's label, as one field
  sits above the next, and the description keeps its own `space-5` under it (the two margins collapse). The body already takes any children; a slot would only fix their order.
  A group of ready answers is named by the app.
- **Described menu rows longer than 320** wrap (DECISIONS 275: the owner picked option B of three pictured in round 56). A Menu stays at most `size-popover-max` (320)
  wide; a described row's description wraps and the row grows; the title stays one line. Menus only: Select, Combobox and the command menu keep the cut. React and the
  HTML skill's `menu` module both draw it; see [Two-line rows](#two-line-rows).
- **A plain `Badge`'s size** is kept by design (see the status marks under [Lines, states and actions](#lines-states-and-actions)).

## The conversation stream

**Status.** Decided and built by Opus on the no-council path (DECISIONS 226 and 265); the implementation is reviewed by Astra and the pixels by the
lead, and the owner sees the pictures (review round 56) before merge. Found by the first app built on Basalt (the second gaps batch, B2). React's
alone: the HTML skill has no stream module (a follow-up batch).

A stream is one column of entries, oldest first: a support thread, a team chat, a document's comments, an assistant's answer, a build's history
(`Stream`, an ordered list). It is not a live region and does not follow its end: an app that adds entries follows the end only while the reader is
at it, as a `Terminal` does, and says what must be heard through `StatusLine`. Basalt draws; what joins, the words and the data are the app's.

- **A message** (`StreamMessage`): the avatar's 32px gutter, `space-3`, then the text column. The head is the name at `text-base` and 500 in primary
  and the time at `text-xs` in tertiary, tabular, on one baseline; meta (a `Presence`, a badge) follows the time, and controls sit at the head's end. The
  words are `text-base` (14/20) in primary and wrap anywhere; they are in block flow, so a link or a badge stays in its sentence, and blocks inside
  (a paragraph, a list, a quote, a disclosure row) stand `space-2` apart. The avatar is decoration (the name beside it is read). **Consecutive messages join** when
  the app says so (`joined`: the author, the minutes between and an edit are the app's rules, never a number in Basalt): no avatar and no head are
  drawn, and the name and time are said before the words. A new author starts `space-4` below the last entry, a joined message `space-1`.
- **A note** (`StreamNote`, "Lee joined", "Status set to Open") is a quieter row: a sentence at `text-sm` in secondary in the text column, its time
  after it, and an optional icon at 16 centred in the gutter. Two notes stand `space-2` apart. A day is `EventLogRule`.
- **The other side of an exchange** (`StreamQuote`: what a person said to an assistant or a bot, the message a reply answers) is a fill one step from
  its ground, radius 8, `space-2` by `space-3` inside, and **no rim**: the turn it sits in keeps the only frame. In dark the step is the level above
  what it sits in (it is a well, with its own `data-level`); in light it is `surface-sunken-strong`, because light's levels 1 to 3 are one white. No
  bar and no indent rule mark it. The words above it say whose it is ("Dana asked", "Replying to Sam", the app's), tertiary at 12 with the time, so the
  fill never carries that alone; it is a `figure` with a `figcaption` and a `blockquote`.
- **The entry you came to** (`arrived` on a message, a note, an entry or a block). The entry a link, a search result or a notice opened is scrolled to
  (to the middle of what scrolls it; one taller than most of that, a pane's visible height or the window's, to its top) and focused with no ring, as a page's title is after a route change: it is a place,
  not a control (it is `tabindex="-1"` from then on, so the mark's going never drops focus). It is marked by the selected wash on its own ground and by
  a word. A message, a note or a block that is not a panel takes a **plate**: one solid fill per level (the choice card's recipe), radius 8, reaching
  `space-2` past the entry at the sides and `space-1` above and below, behind its content, so nothing in it moves. **A panel is never framed from
  outside** (no outer frame, no outline, no bar): its own fill takes the wash, inside its one rim. The word ("Linked" by default; the app says why:
  "From your notice", "Search result") is secondary at 12 at the end of the head; a panel entry's app puts it in the panel's head
  (`StreamArrivedWord`); a block's message says it in its head, in the block's own words, and a block in a joined message (no head) draws it above
  itself, so the word is always seen while the mark is on. Tertiary words on the wash step up to secondary. A joined message that arrives draws
  its head, and keeps it. **It lasts until the reader acts**: a press anywhere, or a key that does not scroll (the arrows, Page Up and Down, Home, End
  and Space outside a field read around it and leave it); then it goes over 0.75 of `duration-slow` on `ease-in`, and the word's room stays, so
  nothing moves. It comes at once. An entry that has no box yet (in a hidden tab or pane) is not spent: it is scrolled to, focused and armed once it is
  shown. One entry arrives at a time: placing another ends the one before (its `onArrivedEnd` is called). In forced colours the fill drops and the word stays; under reduced motion the fade is
  the same, being colour and opacity. In a `LoadingShape` (and its twin) it does nothing.
- **A disclosure row** (`DisclosureRow`): one line that opens to its detail (a tool call, a thought, a folded stretch, a step's log). Lighter than
  `Accordion`, which is for a page's sections: no heading, no divider, no wash. A button (`aria-expanded`, `aria-controls`) on Base UI's Collapsible: an
  optional mark in a 16px seat, the line at `text-sm` in secondary, an optional meta in tertiary, and the core chevron at the end, which morphs from right
  to down (a rotation group; under right-to-left it points left while closed). Closed, the line is cut with an ellipsis; open, it wraps, so it is read
  whole in place (`wrap` keeps it wrapped while closed). Hover lifts the ink to primary and the meta to secondary, with no wash, as on a ruled list on
  the page. It is a focusable row: the control ring at +2, radius 6. 28 tall, 44 on touch. The detail opens by height over `duration-slow` on
  `ease-out` and closes at 0.75 on `ease-in`, at once under reduced motion; its clip reaches `space-1-5` past the detail, so a ring inside is whole.
- **An activity list** (`ActivityList`, `ActivityStep`): steps that run and report, a sentence each at `text-sm`, wrapping at any width. It is not
  `Stepper` (a known sequence), not `EventLog` (links in mono with a time column and one tab stop) and not `LogLine` (a log's mono fields). Each step has
  the plain badge's status seat (6, and a gap as wide): braille while it runs, the tertiary dot once done, the danger dot when it failed, the hollow ring
  while it waits. A failed or waiting step draws its word ("Failed", "Waiting", or the app's) at 500 in primary before its sentence, as a refused
  command's word is; a running or done step's word is said and not drawn, unless the app gives one ("Skipped"). The running, failed and waiting sentences
  are primary and done ones secondary: ink marks where the work is, and colour is only the danger dot beside its word. A step with detail is a
  disclosure row; when any step has detail, every step keeps the chevron's seat, so the metas line up. It is not a live region.
- **Presence with a duration** (`Presence`): a `Badge`, plain beside a name or in its outline: the success dot while active, the hollow ring while
  away, the tertiary dot while offline, and always the state's word ("Active", "Away", "Offline", or the app's). With `since`, how long it has lasted
  follows the word in its ink ("Away 6 min"): nothing under a minute (the element is there, empty and hidden, so a server's render and the
  client's hydration agree), nothing for an invalid date, then "6 min", "1 hr 5 min", "3 days" (`formatElapsed`, US English; an app writing
  another language passes `format`). **This is a duration, not a relative age:** it says how long something still true has been true, as a countdown
  says the time left, so it stands without a date (a relative age, "11 days ago", is still written only beside its date). It is a `time` with an ISO
  duration, ticks by the minute on the one shared timer, holds under `data-loops="held"`, is no live region and is not stopped by reduced motion.
  `Elapsed` is the length alone, after any state's word ("Running 12 min").
- **Loading.** The stream's parts are drawn by `LoadingShape` like any others: an avatar is a bone in its disc, the name, time and words are bars as
  long as their words, a mark is a bone in its box. Nothing in them is sized by hand for loading.

## Loading in the page's own shape

**Status.** Decided by Opus and approved by the owner (DECISIONS 247, 248, 249b and 258: the shape of what it stands for, known words kept and icons hidden,
the ring as the page-level wait, what is known shown at once, a last copy shown on a return visit, a page that fills in by parts, and the reload rule). The
implementation is reviewed by Astra. React's alone: the HTML skill has no loading shape (a follow-up batch, with the walk and the comparison in its script).

**A view's loading state is the view itself** (`LoadingShape`): the same components, drawn with stand-in data, painted as bones measured from the drawing,
never hand-sized. A line of words is one rounded bar per line (`radius-sm`), as long as its words, 0.75 of the text's size and centred on the line; runs
on one line are one bar. A control with a fill or a border is one bone in its own box and radius; one with neither (a ghost button, a tab, a link) is its
words. A painted mark (an avatar's disc, a status dot) is a bone in its box; an icon of 24px or less is hidden and its seat kept. Structure is drawn as it
is (a panel's fill and rim, a divider, a field's frame, a table's header band); a state is not (a chosen tab's underline, the navigation's pill). Known
words stay words (`KEEP`: a table's column heads, the names of tabs, and what an app marks `data-bone="keep"`). Bones use `surface-placeholder` and
breathe together on Skeleton's 2s pulse, one animation for the region.

**What is known shows at once, field by field** (`prefill`). The region is drawn twice, from `fillIn(known, standIns(variant))` with two different fillings
of what is unknown: variant 0 on the page and variant 1 in an unseen twin at the same width. A word, mark or control that comes out the same in both, in
its words, its painted box and its drawing (fill, edge, ink, transform, and a painted pseudo-element), depends only on what is known and keeps its ink; whatever differs is a bone, and an element whose own attributes differ is a bone
with all it holds. A value drawn by CSS (a meter's fill, a status dot) that differs is one bone in its box. A line is never part ink, part bone. `shape` is the form for a region where nothing is known.

**The stand-in contract.** An app's stand-ins (`standIn(seed, length, variant)` for words) take values from a different set in each variant (other words,
another status, the other role, a different hour), so no guess can match in both however the view sorts; they keep the same rows and branches, except
where a branch is itself unknown (it is then a bone as a whole, the safe failure); a list's variant 1 has one more row, so every count differs; and nothing
is assumed about content (who said what, and when, is a bone until it arrives). The unseen variant's words are half again as long and a dozen letters more,
so what sits under text of unknown length is at another place and is a bone. Rows: the count the list had last time (`rememberCount` keeps the count and
nothing else, where the app says: a `CountStore` it passes, scoped to whoever the list belongs to; with none, only for the page's life in a browser and not at all on a server), else what fits the window, never more than
a page. **Known-empty is not unknown:** `fillIn` merges plain records only (an array, a `Date` and every atomic value are taken as given), a field left out or `undefined` is unknown and
stood in, and a field set to `null` is known to be empty and is drawn empty; a known value of another kind than its stand-in keeps the stand-in.

**The six rules** (DECISIONS 249b):

1. **No stand-in words, anywhere.** No app name in place of a page's title, no reference in place of a title, no "Loading…". What isn't known keeps its seat
   empty or is a bone; a known word shows only if its text and its place are final.
2. **A status word for a wait waits too.** "Connecting" waits a second, as a bone waits 300ms.
3. **A reload paints once if its data is quick.** `holdFirstPaint` holds a client-rendered app's first paint (by opacity, so its shapes are measured while held) until nothing is loading, at most 250ms from the
   navigation; after that the page shows with its bones drawn together, never its structure and then bones a moment later.
4. **A move never blanks.** The next page's code is preloaded (how and when is the app's router's choice); if it isn't here yet the page on screen stays until it is (the router's gate, never a lazy
   fallback in its place), the router calls `markPageStart`, and the new page answers at once with what is known and fills in once. `PageWait` (nothing for
   300ms, then the 20px ring where the page's first line goes, its label said once, never a box) is for a reload whose page code is late. **A tab switch is
   a move of its own panel:** the panel left goes at once and the new panel is in its place from the switch's first frame, its known words (a description)
   in that paint and what it doesn't know yet as bones in their seats; a region in the panel counts its 300ms from the switch. A switch is not a new page and
   calls no `markPageStart`. The panel's 8px slide and fade stay: they are motion by transform, and move no layout.
5. **A page keeps one structure, loading and loaded.** A part that has landed stays in its region; CSS that reaches into a region with a child combinator
   reaches its twin too.
6. **What changes after the page has settled is the page living** (presence, a running agent, a last copy refreshed), and is not loading.

**Timing.** Waiting (the structure and what is known, no bones) → shown → content. Bones appear 300ms after the page's start (`showAfter`: the navigation,
or the last `markPageStart`; a region drawn more than a second after its page began, or after a press or key since it began, such as a tab switched to or a sheet the reader opens, counts from itself), and once shown
stay at least 400ms (`minShown`). The content takes the shape's place at once and the last bones fade out over it: an exit, 0.75 of `duration-base` on
`ease-in`, opacity only. Content never goes back to bones. Under reduced motion and `data-loops="held"` the bones stand still at full strength.

**Phases** (`useStaged`). Each region is its own `LoadingShape`, loading until every part it reads has arrived. Until 250ms from the page's start parts land
only all at once, so a fast page fills in once; after it a part waits 120ms for any other arriving with it; once all are here they land at once. A region
never lands above one still loading whose height it can't know (top-down), so landing only fills in and never pushes. At most three phases after the known
paint, in reading order.

**A last copy** (`refreshing`). A return visit shows the last copy at once (how long the app's data layer keeps it, and that it forgets it at sign-out, are the app's
integration choices; Basalt keeps no data); it
stays content and the region carries `data-refreshing`. `useRefreshing` is true only once a refresh has taken more than a second, and `Refreshing` is the mark:
braille and "Updating" in tertiary ink, in a seat kept whether it shows or not; on a phone the ring alone, the word visually hidden as plain text. It is not
a live region. There is no "last updated" stamp.

**Accessibility.** The region is `aria-busy` while its shape is up; the shape is `aria-hidden` and `inert` (nothing in it can be focused or pressed), known
words included, because a stand-in word read aloud would be wrong. "Loading" (the region's `label`) is said once for the page by one polite status line made
on first need, by the first region to show bones; nothing is said per phase, when the page completes, or for a load under 300ms. In forced colours the
unknown drawing is hidden by `visibility` (a transparent fill comes back in `CanvasText`), what is known is drawn as itself, and each bone is Skeleton's 1px
`ButtonBorder` edge in its place; the space is held. A `PageWait` and the shapes of the page it hands over to share the one announcement.

**Engineering.** `useInShape()` is 0 outside a shape, 1 in a drawn shape (a part that writes does nothing there) and 2 in the twin (a part that draws
outside itself, a portal, draws nothing); a shape renders parts, not effects. `data-bone="keep"` draws an element as it is, `"none"` skips it, `"box"` makes it
one bone in its box, painted or not. Bones are cut to the boxes that clip them; a shape measures again on a scroll inside it, and on a scroll of
the page only when it holds a sticky or fixed part. `Bones` is the painting alone, for a place a region can't wrap. Bones are measured in the browser: a server-rendered shape is its structure with no
bones until hydration. A prefilled region is drawn twice while it loads (the twin is laid out, never painted). Stand-ins that break the contract show a guess
as if it were known, which Basalt can't detect.

## What the HTML skill does not draw

The log slots, the status bar, the command block, the event log, the source stamp, the inline-label rows, the filter toolbar, the notice bar, the listbox, the open list, the drawer and `Reflow` are React's alone: the HTML skill has no module for them (DECISIONS 167, Q8). So are `Pagination` and `ListBand` (DECISIONS 222: the skill has no pagination module and none is added). The skill's modules draw the rest (DECISIONS 230, the owner approved the caps): `select` has `data-numeric` (the width of its widest option, measured once fonts are ready; cap 9,000), `filter` has a toolbar trigger that holds its widest value (cap 17,450), and the form dialog is a module of its own, `dialog-form` (`data-form`: the 480 box, the held head and foot, the scrolling body, full screen under 720, the top held as it opens and first focus by the input that opened it; cap 2,200), so the plain and alert dialog keep `dialog`'s 5,150. React's alone: `FormGrid` and the rest of the form gaps (DECISIONS 242: the form grid, a segmented control's `fullWidth`, `required`, `invalid` and its tab stop on the chosen value, a `Switch` description, `TextButton` keeping focus and underlining a `Reserve`), the held top's re-measure on a window resize, and the scrim closing a form only while nothing has been entered (the skill's scrim closes it), a list's `scroller`, and an explainer on a header that does not sort. React's alone too: `LoadingShape` and its parts (DECISIONS 258; the skill's loading shape is a follow-up batch). React's alone too: `Composer`, `Mention` and `MentionPicker` (cimip-gaps-2, B3; see [Writing to someone](#writing-to-someone-the-composer-the-mention-and-the-picker)). So are the conversation stream's parts (`Stream` and its entries, `StreamQuote`, the arrived mark, `DisclosureRow`, `ActivityList` and `Presence`; round 56, a follow-up batch). React's alone as well: `NotificationList` (the center's page form), a group's reveal track (the skill's group opens at once), and the search over a server (`SearchField`, `SearchPassages`, `SearchPassage`, `markMatches`); the skill's `notifications` module draws the pending ring and groups (cimip-gaps-2, B7). The app shell's gaps (cimip-gaps-2, B4) are in the skill: `data-capped` on `.app-shell` (the `app-shell` module, cap 4,300 from 3,250, the skip link on the brand's start edge included), `.app-heading` and `.app-facts` under the title, the primary kept under 720, `data-size="sm"` on a `.nav` (the `nav` module, cap 5,350 from 4,800), and the `pane` module (`.pane-layout`, cap 1,700), whose script makes an overflowing pane a tab stop, including when its content arrives or grows after the page. React's alone too: the parts of [Lists and facts](#lists-and-facts) (`PanelList`, `SelectableList`, `DescriptionList narrow`, `CodeBlock wrap`, `Select toolbar` and the form dialog body's stack); a later batch may bring them to the skill. Whether the skill gets the links and the charts is not decided.

## Logs, status and forms

Scrollback blocks, an event log, a log in fixed slots, the status bar, the source stamp, description-list forms, inline-label rows, route focus, single-key
shortcuts and time parts (DECISIONS 162: the council voted, four members, 3 of 4 deciding, on the owner's handoff, from his approved site prototypes; the
implementation hasn't been reviewed by the panel). Candidates D14a, D14b, D15, X10 and X11; X3 is `Reserve`, already built.

- **A log line's fields** (V1, V2; `LogFields`, `LogLine`, `Terminal`'s `fields`). The fields that say what happened are primary ink at 400 and the rest secondary at
  400. Nothing steps back with age. A refused field stays primary and its own word ("denied") says it: no colour. A refused command's status word is
  primary at 500 beside `exit N`. A line may be a node; copy still takes the plain text.
- **The command block** (`CommandBlock`; R1 to R3): a sticky head, opaque in the page colour, over the output. The core chevron, the command at 500 in primary ink, then
  the status, `exit N` and the time in tertiary; 16 on 24; 20 above and 16 below the head; 28 between the command and its meta; a hairline between blocks and `space-16`
  under each. The prompt is the app's.
- **A log in fixed slots** (`LogSlots`, `LogSummary`): the last three lines in three slots, 13 on 20, `space-1` of padding, no frame, title row or copy button. Each slot stands
  on `Reserve`, holding the room of the widest line the caller lists. The newest line fades in over `duration-base` (opacity only; at once under reduced motion).
- **The event log** (`EventLog`, `EventLine`, `EventLogRule`, `EventTime`, `EventText`, and `ListboxOption`'s `leading`; V3, V4, R5). Lines are links or buttons with one tab stop. The
  ring is the control ring at +2 outside each line, the list keeps `space-1-5` from its edge, the hover wash is full bleed, and focus adds no wash. A new line is
  a 6px dot in a seat every line keeps, with primary ink and a hidden "New: ": no weight change, no colour flash. Each time column is as wide as the widest stamp it can show,
  measured in the line's own font and following what the column holds (the session log, to the second and 24-hour: "00:00:00"; the activity list, a day and a clock in the locale's hour:
  "Mmm 00 00:00 PM" in `en-US`).
- **The source stamp** (`SourceStamp`; V5, V6, R8): four 8px shapes as drawn (filled, half-filled, hollow, a cross) and Basalt's braille for "asking", all in one 8 by 10 seat, with a word
  always; the "just landed" flash is dropped. Source first, time to the second and 24-hour, no middle dot ("github 18:52:07"); `Stat` is unchanged. V5 had no majority, so option (a) stands.
  **Waiting and unreachable** (`SourceStateWords`): words only, both sentences in one `Reserve` cell, the failure said once through `StatusLine`, "Ask again" a `TextButton`.
- **The status bar** (`StatusBar`; V7, R6, R7). A 44px foot from 720, fixed under it (56 plus the safe area). A message the app has also logged goes after 5000ms; any other stays until
  replaced or cleared with Esc. An error carries XCircle in a 16px seat and danger ink and is said through an assertive region that is in the page before the text. The slot reserves its
  line. **A page has one foot**: the status bar and a phone tab bar do not share it; a product that needs both is a later vote.
  **A cut message is read whole on a plate lifted clear of the bar (DECISIONS 168 and 170, from 720).** The bar keeps its one truncated line and its 44px. The plate is level 3 (the rim,
  `shadow-overlay`, radius 8), the slot's width, its foot `space-2` above the bar's top border, in the page above the bar and over none of its controls; an error's XCircle sits before its first
  line, in the danger ink. It opens on hover after the tooltip's wait or at once on focus, closes on Esc (the first Esc closes the plate and the second clears the message), stays while the
  pointer is on it or focus stays, fades and never scales, and is `aria-hidden`. The message is a focus stop only while it is cut (`role="note"`, named by its words, its ring the control ring at
  +2, which gives way to the plate's); the visible words are hidden from assistive technology as before, and once the live regions have said the words they let go of them, so a screen reader meets
  them in one place. Under 720 the message is the band above the bar, wrapped, so nothing is cut and nothing opens.
- **Description-list forms** (V8, V9, R9 to R11): the list as it ships (160px label, 40px rows, dividers between rows only; the page's record keeps its own rule round it). `form="stacked"`
  is a title (18/26 at 600) over its text (16/24 secondary, 2px under), 20px between entries, no divider. `form="three"` is term, thing, detail. `DescriptionColumns` lays whole lists out in
  columns of at least 480px. The facts' column gap is 32 (the prototype's 4ch is about 34).
- **Inline-label rows** (`InlineFields`, `InlineField`; V10, R12): V10 had no majority, so option (a) stands. A label in `size-field-label-inline` (80), then a bare field; each row's bottom line is
  `border-field` (equal to `border-input` outside more contrast, so a field's boundary steps with the others); on focus a real 2px outline at −2 inset round the row; at least 44 tall, a textarea grows its row; 16px on touch.
- **The Send hint** (`ActionShortcut`; V11): Send stays primary with `aria-keyshortcuts="Meta+Enter"`; the two chips stand beside it as a hint, hidden on touch until a hardware key.
- **Single-key shortcuts** (`useShortcuts`, `useSingleKeys`, `SingleKeysSwitch`, `ShortcutList`; V12): an app-level hook that ignores keys with a modifier, keys typed in a field and anything inside
  `[data-own-keys]`, plus a "Single-key shortcuts" Switch in the help dialog (default on, stored lazily as `basalt-keys`; off takes every key, `?` included). The help dialog also has a visible opener that is not a single key.
- **Route focus** (`useRouteFocus`; X10): after a client-side page change, scroll to the top, set `document.title` and focus the page's title with no ring; a change that came from a control's own
  value leaves focus on the control (WCAG 3.2.2). The announcement is `StatusLine`.
- **Time parts** (`formatStamp`, `formatClock`, `formatDay`, `formatCountdown`, `formatAge`, `Clock`, `Countdown`, `DateAge`; V13, V14; DECISIONS 207): a clock a person reads (`Clock`, `formatClock`, a `Stat`'s time, a day and a clock) follows the locale, so
  12-hour in `en-US` ("6:42 PM", "Nov 7, 8:02 AM"), with a numeric hour; a stamp to the second (`formatStamp`, the session log, `SourceStamp`, `CommandBlock`'s time) is a log's and stays 24-hour ("18:42:07"). Every
  formatter and part that writes a time takes `locale`, default `en-US`, so a server's render and the browser's agree on the hour; `dateTime` attributes stay ISO. A countdown is a length of time, not a clock. A relative age is written only beside its absolute date, never alone and never in a
  `Stat`'s source line. A countdown ticks by the second and a clock by the minute on one shared timer; `data-loops="held"` freezes both and releasing writes the current value; no live region; reduced motion does not stop them.
- **Filter toolbar** (`FilterToolbar`): the kind select (phone only), the filter, `FilterResult` and the sort with the word "Sort" beside it (`aria-hidden`, and in the select's `aria-label`).

## Writing to someone: the composer, the mention and the picker

Found by an app's message stream (cimip-gaps-2, batch B3; the no-council path, DECISIONS 226 and 265: decided and built by Opus, the code reviewed by Astra and the pixels checked by
the lead; the owner sees the pictures before merge). Every part serves any app where people write to each other: a support inbox, a build's comments, a team chat, a shared document.

- **The composer** (`Composer`). The field is Basalt's `Textarea` with an accessible name (`label`) and no visible label; the placeholder says where the message goes too. Under it a row:
  the app's own actions at its start (ghost `sm` buttons: attach, a format toggle) and Send, a primary Button, always the row's last, at its end. Under that one status line, `text-xs` in
  tertiary ink, one line tall even when empty and never more (a long list of names is cut with an ellipsis; the live region holds the whole text), a polite live region: who is typing (`typingStatus`: "Ana is typing", "Ana and Ben are typing", "Ana, Ben, and Cy are typing", "4 people
  are typing") or anything the app says there. Nothing moves when it fills. The field starts at `rows` lines (default 2, the textarea's own least) and grows with its text a line at a time
  to `maxRows` (default 8), then scrolls; it has no resize handle, since its height is its text's. Where the browser cannot size a field to its content (`field-sizing`), it is measured, within
  the same bounds.
- **Sending.** Enter sends and Shift+Enter is a new line (the soft keyboard's key says Send), or with `sendKey="Mod+Enter"` Enter is a new line and the platform's modifier with Enter sends,
  shown as chips beside Send (`ActionShortcut`). A key never sends, and never picks a name, while an input method is composing (`isComposing`, or the key code 229 some engines send instead). The key presses Send, so a key and a press are one send and the button's own wait
  (`waitForAnswer`) guards both: a second Enter while a message is out sends nothing. On success the field is cleared, unless its text changed while the send was out; a refusal (a
  rejection, or `false`) keeps the words. A press on Send keeps focus, and a phone's keyboard, in the field; after a keyboard press on Send, focus goes back to the field.
- **A mention** (`Mention`) is the trigger and the name, "@Ana Ruiz", at 500 in primary ink: a glyph and a weight mark it, never a colour, and it wraps with its text. The trigger is a prop
  ("#billing"). A mention that calls on the reader (`you`) also sits on its level's plate (`--basalt-plate`), radius 4, 2px each side of its own (given back by a margin, the plate ate half the space before it), drawn on
  every line it wraps to; in forced colours it is `Mark` with `MarkText`, and in print the plate is dropped.
- **The mention picker** (`MentionPicker`; `Composer`'s `mentions` renders it for the composer's field, and the app imports it, so a composer without names never carries it) is Combobox's popup and rows, reused: the popup's level (its opener's plus one), rim, `shadow-overlay`, radius 12,
  one-line and two-line rows (40 and 58), group labels ("People", "Teams", "Roles", the app's words), the plate, its glide and the lift. `Listbox` is a list in the page that holds its own
  focus, so it is not the picker. Focus stays in the field, which carries `aria-autocomplete="list"` and `aria-haspopup="listbox"`, and while the picker is open `aria-controls` and
  `aria-activedescendant` to the active row (whose `aria-selected` is true). A trigger at the start of the text, or after a space or an opening bracket, opens it; one inside a word (an address)
  does not. ↑ and ↓ move the plate, passing over a row that cannot be picked; Enter or Tab writes the trigger, the name and a space (the browser's own undo takes it back); a press on a row picks
  it; Esc closes it until another trigger is typed, and a dialog round the field stays open. A name may hold a space while something matches it; once nothing does, the picker closes, so a
  sentence is never held, and a query that matches nothing opens nothing (the app still hears it, `onQueryChange`, to look names up). The default match is each word typed starting a word of
  the label or the description. It sits 6px under the trigger's line, or above it when there is more room there, inside what can be seen, 8px from its edges, at every width: the room is the visual viewport's where there is one, so a phone's keyboard (which shrinks it and not WebKit's `innerHeight`) counts. It never writes into a field that is read-only or disabled (it does not open there, and checks again as it writes), nor into a mention the field no longer holds: a value the app set while it was open closes it, and an Enter or Tab meant for its rows then writes and sends nothing. The field's own `aria-controls`, `aria-activedescendant`, `aria-autocomplete` and `aria-haspopup` are kept and put back when it closes or lets go. Rows are cut and never
  wrap, as every popup row is (whether a described row may wrap is open). It enters and leaves as a popup does.
- **The plate is public.** The lit row's plate as one opaque colour per level is the tokens `plate-0` to `plate-3` (the selected wash composited over the level, or in dark over the next
  level; a test holds each to that recipe), in both themes and in Swift, and `--basalt-plate`, which follows the level a part sits in (`data-level`; the page and a nested theme root start
  at `plate-0`). An app's own list draws its active row with it as Basalt's do (and gives that row a forced-colours form of its own, `Highlight` with `HighlightText`, since a fill is dropped there); Basalt's pressed toggle, chosen card and chosen peek read it, painting the pixel the private recipe did.
- **No space step above `space-32`.** The 160 an app asked for was a label column, which `size-description-label` names. A space step is a gap; past 64 the scale holds only the section gaps
  (96 and 128, `size-section-gap-md` and `size-section-gap`), and a larger gap than those has no role.
- **The HTML skill** draws none of these: they are React's alone. A page the skill writes is read, not written into, so a composer and a picker have no use there; a quoted mention is words.

## Primitives

Components build on Base UI (the default base in shadcn/ui since July 2026, from the team
behind Radix), with shadcn/ui's variable names mapped onto Basalt's in `dist/css/shadcn.css`.

Forms retain native labels, grouped legends and validation. **A field's label is as wide as its words** (with its "Required" or "Optional"), never the row: a press on the words focuses the control, a press on the empty space beside them does nothing (DECISIONS 233). **A required field says so:** "Required" directly after the label
(not at the far end of its row), in `text-tertiary` at `text-xs` and 400, hidden from assistive technology (the input's own
`required` says it, so it is not said twice). "Optional" shows the same way, only where an author marks a field optional; a field
marked neither shows nothing, so existing fields do not all grow a word. Never an asterisk, a colour or a glyph alone. On the smoked
header the word lifts to secondary, as every tertiary caption does. **Status:** decided by the council (DECISIONS 138) and approved by
the owner (DECISIONS 139); the implementation has not been reviewed. Select is for a short known
list; Combobox searches a single known choice. NumberField enters an exact value in one bordered control sized to its content, steppers inside; Slider
adjusts a scalar or range, with distinct names for range thumbs. Confirmations use
AlertDialog with safe initial focus. Sheets use the dialog contract in a scrolling side, bottom or top panel, including safe-area padding and motion preferences.

TimeChart draws a series over time (see [Charts](#charts)), ChartGroup stacks charts on one gutter, and Prose sets a text column's measure (see [Layout](#layout)).
Stage and PairedArt put full-bleed art under a clear site header (a stage may also close a page), and FramedArt frames a picture in the flow (see [Art](#art)). CaptionedColumns, AppTile and PeriodStepper are in [Parts of DECISIONS 162](#parts-of-decisions-162).

Text and Heading consume the shared type scale; structural heading level is independent
of visual size. Breadcrumbs mark the current location, Pagination renders a bounded page
window, and Link retains native navigation, underlined in the input-boundary colour (3:1) that brightens to the text on hover, and draws the new-tab arrow when it opens one. Avatar, Separator and EmptyState provide
neutral composition without replacing meaningful words with imagery.

Forced-colours mode uses real borders and system colour keywords for boundaries, focus
and selection. The web tests inspect these structural cues in addition to the themed
contrast checks. Automated checks cover supported states; they are not a substitute for
assistive-technology review in a consuming product.

The SwiftPM `BasaltUI` product implements a core native layer over `BasaltTokens`, including
native entry controls and reusable button/toggle/progress styles. Desktop keeps the token
size scale; iOS and visionOS controls use a 44-point target floor. macOS appearance renders
are verified; runtime checks on other Apple platforms remain app integration work.

## Browser support

The floor, decided by the owner (DECISIONS 140, "browsers are fine"): **Chrome 123, Safari 17.5 and Firefox 121** for the React package and
the tokens (the stylesheets they ship). The HTML skill's floor is Chrome 123, Safari 17.5 and **Firefox 125**, because its menu, toast,
tooltip, combobox, notification list, command palette, theme menu, column explainer and `popover` module call the Popover API (`showPopover`,
`hidePopover`, `:popover-open`) with no feature test; below those versions they throw instead of opening. Browsers older than the floor are not supported.

The version that sets each number, as the built CSS uses the feature:

| Number | Feature that sets it |
|---|---|
| Chrome 123 | `light-dark()`, which the stylesheet uses for its theme-dependent colours (a few plates also carry an `@supports not` fallback) |
| Safari 17.5 | `light-dark()` and `text-wrap: balance` |
| Firefox 121 | `:has()` (choice cards, the headroom header and field states) |

Other features the CSS relies on sit below those numbers: `oklch()` and `color-mix()` (Chrome 111, Safari 16.2, Firefox 113), `@layer`
(99, 15.4, 97), container queries (106, 16.0, 110), range media queries, `subgrid`, the `lh` unit and the viewport units `dvh` and `svh`.
`packages/react/test/browser-floor.test.mjs` reads the built CSS and fails when it uses a feature a browser of the floor gained later.

Three uses above the floor are known and listed in that test with their reasons: `scrollbar-gutter` (Safari before 18.2 has overlay
scrollbars, which take no room), `text-wrap: pretty` (a hint; the browser wraps as it always did) and the `round()` function in the plain
badge's dot margin (Chrome 123 and 124 drop that one declaration, so the dot sits in its seat to the half pixel and not on whole pixels).

The same test reads the HTML skill's stylesheet parts (`.agent/skills/basalt-html/parts`) against the skill's floor. It lists the same
`scrollbar-gutter`, `prefers-reduced-transparency` and `text-wrap: pretty` uses and two more that are the skill's alone: `@starting-style`
and `transition-behavior: allow-discrete` (Firefox 129), which the dialog, the sheet, the popover and the select's list use for their
opening and closing motion. Below Firefox 129 those four open and close with no animation, and still open and close.

**Reduced transparency.** "Falls back to opaque `surface-page` under reduced transparency" holds in the browsers that evaluate
`prefers-reduced-transparency`: Chromium from 118. Safari and Firefox do not evaluate it (Firefox only behind a flag), so there the sticky header
stays smoked with the setting on. It is a comfort and not a legibility matter: text on the bar holds 4.5:1 over any backdrop. The audit (A5-16a)
read this from compatibility data and did not check it in Safari with the setting on.

## How these were decided

The conversation stream (messages, notes, quotes, the entry you came to, the disclosure row, the activity list and presence) was decided and built by Opus on the
no-council path (DECISIONS 226 and 265), with no council vote; its implementation is reviewed by Astra, and the owner sees round 56's pictures before merge.

Loading in the page's own shape (`LoadingShape` and its parts) was decided by Opus and approved by the owner (DECISIONS 247, 248, 249b and 258), with no
council vote; its implementation is reviewed by Astra.

Two design reviewers proposed the original foundations independently and converged on the
initial rounds. Rounds 5–7 and the syntax palette were built without them and reviewed
afterwards: the panel's changes (a four-hue syntax set replacing copied GitHub Primer values,
neutral operators, square side sheets, a grouped NumberField and others) are applied, and the
owner's review is still to come. Vercel's and Linear's values were measured from their live CSS (Vercel's dashboard
and Geist pages; Linear's public site and login screen), not recalled, and used only as
reference: none of their CSS, icons or assets is in this repository.

Motion and primitives (PR #12, #13) were built without the panel and reviewed afterwards; the
surface rules (levels, the rim, the nesting guard, kbd chips, the pressed
primary colour) and the motion rulings were reviewed by the panel in three rounds. The owner has not
approved either yet.

The sliding pill, the hover glide in popups and the focus rule for a focusable row were decided by the council in a
four-member vote and approved by the owner on 9 Nov 2026. Their implementation has not been reviewed by the panel.

The site header, the narrow menu, the app shell and the phone tab bar were decided by the council in a three-member round (DECISIONS
96, scores 8.5, 8.5 and 8; the sidebar's 256px, the links' 44px hit area, the one shared glide, the 18/26 title and the tab bar's
circle and inset focus were each 2 to 1). Their implementation has not been reviewed by the panel.

The clear bar over art, the stage, paired art, framed art and the art tokens were decided by the council in a three-member vote (decision
104: opus, sol and grok, 2 of 3 deciding, with Muse out until 16 Nov 2026; the fade into smoked was 2 to 1, sol wanting every change at
once, and print 2 to 1, grok wanting a site bar hidden). Their implementation has not been reviewed by the panel.

Navigation (the sidebar and the rail, with their glide) was decided by the council and the owner in decisions 42, 45, 48,
49, 55, 69 and 70 (the drawing is `.review/council/menus-final/`, section 1). Its implementation has not been reviewed by the
panel.

The still table and the multi-select filter were decided by the council in a four-member vote and settled by the owner on
9 Nov 2026 (decisions 71 and 82 to 84): the fixed layout and reserved seat, the whole header cell as the sort control, the
chips and their switch to a checklist at seven values, Clear held in place, and the divider at a scrolled pinned edge.
Their implementation has not been reviewed by the panel.

The flat table, the closing block, the art tones for drawn lines, captioned columns, the app tile and the period stepper were decided by the council in a four-member
vote (DECISIONS 162: opus, muse, sol and grok, 3 of 4 deciding; votes 1 and 3 were each 3 to 1, and the rest 4 to 0). Their implementation has not been
reviewed.

The site icons, the social link, the long form and status dots in forced colours were decided by the council in a three-member vote
(DECISIONS 106 and 107: opus, sol and grok, with Muse out until 16 Nov 2026). The implementation hasn't been reviewed.

The in-page command list, list plus preview and its push, two-line rows, the chips' Clear, the checklist's search band and the
notification centre's glide were decided by the council in a three-member vote (DECISIONS 103: opus, sol and grok, 2 of 3
deciding; Muse out). Their implementation has not been reviewed.
Display states (the new-tab cue on links and Buttons, row headers, "Not observed", the scroll hint, the choice card, the
pressed toggle, the pending ring and two badges) were decided by the council in a three-member round the owner ordered
(DECISIONS 95; two of three deciding). The implementation has not been reviewed.

Display type, the lead, the page row, the section rhythm, the columns and the fallback face were decided by the council in a three-member
vote (DECISIONS 137: opus, sol and grok, 2 of 3 deciding; the scale and the sections' gap were each 2 to 1) and approved by the owner
(DECISIONS 139). Their implementation has not been reviewed by the panel.

The press scale and the smoked header were decided by the owner (7 Nov 2026) after two council rounds
between the design reviewers; the owner's decisions are in this page's Motion and Chrome sections. Their
implementation has not been reviewed by the panel.

The description list, the meter, the stat's source line, the terminal transcript and CodeBlock's prompt were decided by the
council in a three-member vote the owner ordered (decisions 93 and 94: opus, sol and grok, 2 of 3 deciding) and handed over
for building. Their implementation has not been reviewed by the panel.

Callouts, toasts and the notification centre were decided by the council in a four-member vote (items 82 and 83: a 45%
status rim and no tint, 4 to 0; the marks, running in place, the timeout rule, assertive danger, the stack, the 40px swipe
and the centre) and by the owner, who set the toast's surface at level 1 and asked for the centre as a component. Their
implementation has not been reviewed by the panel.

The menus redesign (the depth floor and modal reset, the plate and lift on every popup row, the 36 and 40 rows, the
bar's removal everywhere, selected table rows, vertical tabs and the segmented pill, the forced-colours fix) was
decided by the council in four rounds (their votes are in `.review/council/menus-r2/`, the drawing in
`.review/council/menus-final/`) and approved by the owner on 9 Nov 2026 as drawn, with a menu from a table row at level 2.
