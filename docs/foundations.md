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
  neutral rim. See [Elevation](#elevation).
- **No ornament that signals "generated":** no gradient borders, no glow, no bounce, and no
  scale on press beyond the .98 of Button and IconButton. Colour never carries meaning alone.
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
| `surface-chrome` | `#000` at 85% | `#fafafa` at 92% | The fill of a sticky header bar, the page colour with alpha. The only translucent surface; see [Chrome](#chrome-the-smoked-header) |

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
| `text-primary` | `#ededed` | `#171717` | 15.3:1 / 15.7:1 |
| `text-secondary` | `#a1a1a1` | `#4d4d4d` | 6.9:1 / 7.4:1 |
| `text-tertiary` | `#858585` | `#6b6b6b` | 4.86:1 / 4.68:1 |
| `text-disabled` | `#5c5c5c` | `#a3a3a3` | Exempt (disabled controls only) |

On a hover or selected wash, tertiary text becomes secondary; the wash would take it below
4.5:1. Four text levels were considered and rejected: Linear's fourth (`#62666d`) is 3.0 to
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
  in light, never brighter than the rim (the header bar's line is the one exception; see
  [Chrome](#chrome-the-smoked-header)).
- **Input boundary:** 38% white or 45% black, 3.4:1 or better on every surface (WCAG 1.4.11).
  Vercel's inputs measure 1.35:1, and Linear's borders 1.3:1; neither passes.
- **Focus:** a 2px outline with a 2px offset in the secondary text colour, 6.9:1 or better.
  A field flush with a clipping edge takes the focus outline inset (offset −2px) around its visible
  band. A modal palette whose input is its only focus stop shows none. Against the fills and rim
  composites it touches the inset ring is 6.0:1 or better in dark and 7.1:1 in light.
  Outlines survive Windows forced-colours mode; box-shadow rings don't.
  A focusable row (a link or button in a list, not a listbox option) takes the same control ring at +2, outside the
  row, and its list keeps at least `space-1-5` (6px) between a row and any clipping edge so the ring is never cut. A
  full-bleed band that holds its own control focuses that control. A band that is itself the link or button takes the
  flush-field −2 inset above. A sortable table header is exactly that band (see the still table below). Navigation
  items are focusable rows: their ring goes around the hugging pill (see [Navigation](#navigation)). So are the
  notification centre's entries: links or buttons, which join the hover glide on navigation's rules (below). Otherwise Basalt ships none:
  the rows of Menu, Select, Combobox and CommandMenu are options and show the plate, breadcrumbs and pagination are
  inline, and a settings or list row is the app's own markup. The accordion trigger is the one full-width band that is
  itself a button; it keeps the ring it was built with
  and is open for the panel.
- **Hover and selected:** washes of 6% and 9% white, or 4% and 7% black, so they work on any
  surface. A hovered control's hairline steps up to 24% white or 16% black (`border-hover`). A selected
  tab or segment is a raised pill with a hairline, not a wash: a wash alone is about 1.2:1, and a state
  that only a change of colour shows fails WCAG 1.4.1 (the change of a background inside a component is
  outside 1.4.11's scope, which is why the cue has to be a shape or a step in ink). The pill is
  `surface-top`; in dark it is `surface-top` plus the selected wash, as one solid fill (`#2c2c2c` on a
  `#111111` track, 1.35:1), so a 36px pill in a vertical track reads as a pill and not as a wash. In light it
  is white on the track. A hover wash is a row of a list, not a plate: it runs full bleed and never lifts ink.
- **The active row** (the row a keyboard or pointer is on, in Menu, Select, Combobox and CommandMenu) is a
  plate and a lift. The plate is a rounded rectangle (radius 8) in the selected wash, painted as one solid
  `background-color` per level and never a layered image (forced colours turns an image into a backplate):
  in dark the next level plus the wash, `#262626` on level 1 (1.31:1 against the panel) and `#2c2c2c` on level 2
  (1.35:1), and at the cap, which has no next level, the wash alone over `surface-3` (`#2c2c2c`, 1.28:1); in light
  the 7% wash (`#ededed` on white, 1.17:1). The lift is the ink: a rest row's label and glyph are secondary
  (7.66:1 on level 1 in dark, 8.45:1 in light) and the active row's go to primary (12.86:1 and 15.33:1 on the
  plate). A hint (a host, a region, a count) lifts from tertiary to secondary on the plate, because tertiary
  falls under 4.5:1 there; a shortcut chip lifts to primary. There is no weight change (a heavier label shifts
  its width), no bar, no inset outline and no ↵ chip: the owner ruled the vertical bar and the outline AI
  tells (9 Nov 2026), and the plate with the ink step is the cue that does not rest on colour (1.4.1) and says where
  focus is (2.4.7). A chosen value (a Select option, a checked item) is a check in primary ink at the row's start, in a
  16px slot every row reserves so labels align, with no extra weight; its label stays secondary until lit. Danger keeps its colour on the plate: 5.16:1 on level 1 and
  4.80:1 on levels 2 and 3 in dark, 5.43:1 in light. Group labels are tertiary, 12/16, weight 500 (4.86:1 or better).
  In forced colours the lit row is `Highlight` with `HighlightText` for its label, glyph, hint and chip text and border,
  `forced-color-adjust: none` on the row (Chromium otherwise paints a Canvas backplate behind forced text and the
  label renders as a black box), a solid plate, a danger row taking the same pairing, and the panel on `Canvas` with
  a real `CanvasText` border. With a fine pointer the plate is one shared element that glides between rows (see
  [Motion](#motion)); each row's own plate is the fallback.
- **Tabs and segments.** Horizontal tabs keep a 2px underline that slides under the active tab: it is horizontal, not the
  vertical line the owner ruled out. Vertical tabs are a column of 36px pills (radius 8) in a track (padding 4, radius
  12, `surface-sunken-strong`), the chosen one raised as the segmented control's pill is; there is no divider. The
  chosen tab's pill slides as the segmented control's does (see [Motion](#motion)). The segmented control keeps its
  horizontal size (28px segments in a track of padding 2 and radius 8) and takes the dark pill fill above.
- **Settings and list rows** are full-bleed bands, not plates: each row spans the card edge to edge, dividers run edge to
  edge, and a row you can act on takes the hover wash (the card clips the corners). A choose-one list inside a card uses
  the menu plate. There is no settings-row component; this is the pattern for an app's own markup.
- **Primary action:** the inverse of the page (near-white on dark, near-black on light),
  brightening to pure white or black on hover, and stepping to `action-primary-press` (the
  action colour 85% toward the page: about `#bfbfbf` in dark, `#333333` in light) while pressed.
  Its text is 11.4:1 or better on the pressed fill. Secondary, ghost and danger buttons press to
  the selected wash. A press is a colour step, and Button and IconButton also scale to .98 (see
  [Motion](#motion)).
- **Status:** danger, success and warning, each a dot beside a text label, never a coloured
  badge fill. Danger is also a text colour (4.77:1 or better, including on the hover and selected washes; light `#ba1d27`). There is no filled red button:
  a destructive action is red text on a red hairline, quieter than the primary action, with
  focus starting on Cancel. In tables a status is a plain dot and word, not a pill per row.
- **Disabled** keeps its control's shape with the disabled text colour and a fainter line.
- **Selected rows** (a table) are the selected wash as a band, edge to edge, with no bar and no edge mark, in
  forced colours too. The state is carried by the row's checked box and by a count in words, not by the wash
  (about 1.2:1): the first column is a checkbox column (a `Checkbox` per row, labelled "Select {name}", and a header
  box that is mixed while some rows are selected), and the count ("3 of 12 selected") is written in a polite live
  region by the app. Basalt ships no helper for the column or the count: the column is the app's own markup on
  `Table`, `TableCell` and `Checkbox`, given a first column `size-control-md` wide, and the row takes `selected`.
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
  Every sortable header reserves a 16px seat for the indicator, after the label and, on a numeric (end-aligned) column,
  before it, so the label's edge stays on the numbers' edge and the indicator arriving moves nothing. Hover and focus lift
  the label from secondary to primary and show a tertiary up-down caret in the seat (always, on touch); sorted, the
  direction arrow takes the seat in primary and the label stays primary. There is no weight change. `aria-sort` is on
  the `th`, only on the sorted column. A press cycles ascending then descending; a numeric column, or one with
  `firstSort="descending"` (a time), starts descending; there is no third, cleared state, and the table's default order
  is a sort on a named column. The header band is 32px, and 44 on touch. When no row matches, one row spans every
  column under the unchanged header with a sentence and a Clear action (`TableEmpty`); it is outside the sticky rules.
  **At 390** the table scrolls and `pinned` leaves the name sticking, and the select column and the name when there is
  one. A pinned cell is opaque at its level in every state (rest, hover, selected, forced colours: the row's wash is laid
  over the panel's fill as one cell background), and a focused header or action scrolls clear of the pinned columns
  (the container's `scroll-padding-inline-start`, finished on focus for a cell that is only half covered). **The
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
- **Selected is shown by shape or a step in ink, and a card and a toggle follow it** (council, DECISIONS 95; one state,
  one look). Wherever Basalt says on, selected or chosen it paints one solid selected fill, steps the ink to primary and
  adds a shape: a raised pill in a track (one of many), a check in a reserved seat or a filled choice box (any of many, and
  on), a closed glyph. The silhouette follows the furniture the state sits in; the fill, the ink step and the shape do not
  change, and the wash alone is never the cue.
- **The choice card** (`ChoiceCard`, in a `ChoiceCardGroup`) is a native radio (one of many) or checkbox (any of many)
  wearing a card: the whole card is the label and the input is visually hidden but focusable. Plain `Card` gets no selected
  prop, because paint without semantics ends up on a `div` nothing can operate. A real choice box (`size-choice`, the
  checked control's own look) sits in a seat reserved on every choice card, on its header line, inline-end of the title,
  empty at rest with the input boundary, so choosing moves no title. Selected is the selected wash as one solid fill at the
  card's own level (the active-row plate recipe: `--_plate-solid`, about `#262626` on level 1 in dark and `#ededed` on
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
  a same-tab link to another site gets nothing. It is the core `external` glyph after the label, `aria-hidden`, never
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
  track (`SegmentedControl`), any of many is a check with no track. Up to six values are independent chips: 32px, or 36
  inside a 44px target on touch, radius 6 (8 at 36), 13/18 at 500 (14 on touch), 8px apart. Off is a hairline and a
  tertiary plus in the chip's 16px seat; on is the selected wash, primary ink and the check in the same seat, so turning
  one on moves nothing, and it is never colour alone: the glyph changes shape. The swap is a 100ms crossfade
  (`duration-fast`), not a morph, and none under reduced motion. Hover brightens the label and the line a step; a press is
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
    or action. It names where the rest lives (`home`: the notification centre, the row in place, the app's own key, or
    "the page" when it only echoes a change the page already shows), and an action needs a home that is not the page.
    With no home it stays until it is dismissed, and the type does not let a `timeout` be set on it. The centre is the
    durable copy that lets a toast go. There is no ⌘Z chip on a toast's button: the app's key goes in
    `aria-keyshortcuts`.
  - **What a screen reader hears.** Only the result, once, from two live regions that hold only text and exist before the
    first toast: assertive for danger, polite for the rest. Running steps are never announced. The visible stack is a
    named region ("Notifications") that F6 reaches, and is not itself live, so nothing is read twice.
  - **The stack.** Three at most, bottom right at `space-4` from the edges, and the bottom edge, full width and above the
    safe area at phone widths. Cards behind peek at the shipped .05 scale and the frontmost toast's height, so they show
    even behind a taller toast. It expands on hover and focus. A toast that is the only copy, and a focused one, is never
    removed to make room: the newcomer waits in a queue and enters as room appears; a timed toast is closed instead,
    oldest first. Repeats group ("×3", on a `group` key) and errors never do. A drag of more than 40px dismisses it, by
    distance alone. The line and the clock pause together on hover, on focus, in a blurred window and in a hidden tab.
- **The notification centre** is the durable record the toasts point to: a bell IconButton (32px, a 6px ink dot while
  anything is unread, and the count in its accessible name and never drawn, so the button never changes width) that opens
  a popover at its opener's level plus one, with a header band (title, count, "Mark all as read") and a footer ("View
  all"). An entry is a link or a button with four seats: a 6px dot, the status mark (a 16px seat, always there so titles
  line up), the words and the time. Unread is the dot and primary ink, with no weight change; read is the same row with
  the dot's seat empty and the title in secondary ink, so "Mark all as read" moves nothing. The mark's seat stays even when no
  entry has a mark: it is a column, so marks line up to be scanned, and a status entry arriving while the centre is open has
  somewhere to go without moving every title. The app owns the entries,
  their read state, persistence and the "View all" page; the component is presentational. **The hover glide** is navigation's,
  in the same plumbing: one plate follows the pointer between entries (40 or 58 tall; 44 or 58 on touch); the first key hides it and the resting
  hover, so only the shipped rounded control ring at +2, outside the row, shows; the next pointer move brings the plate back.
  Off on touch, under reduced motion and in forced colours, where each entry paints its own.
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
    the viewport. The label is 13/18 at 400 in secondary ink on the value's baseline; the value is 14/20 at 400 in primary
    ink with tabular numerals, start-aligned. Mono is for identifiers only (a `mono` option), at 13px on the 20px line.
    Rows take `space-2-5` above and below, so a one-line row is 40px, with a `border-divider` between rows (drawn inside
    the row, as the table's is), never above the first or below the last; the first and last rows lose their outer
    padding. Several values in one row stack `space-1` apart. A missing value says "Not observed" in tertiary ink, with no
    mark, as a table cell does (decision 95). The gap between the label column and the value is `space-4`.
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
    dot (`aria-hidden`, with a visually hidden comma) and the source ("04:41 · Scale"). It is pinned to the foot of the
    stat's grid cell, so sources line up across a row even when one stat has no note. The time is always absolute, in a
    `time` element with a `datetime`, never "2 min ago": the clock alone for today, the date added for another day ("Nov
    7, 08:02"), the year only when it differs. With no source the slot is left out. A row of stats is one `dl`; each stat
    is a `div` whose label is the `dt` and whose figure, note and source are `dd`s.
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
    Long lines scroll sideways, as `CodeBlock`'s do. (Decision 98.) The gutter is one column for the whole block, `CodeBlock`'s
    too: the prompt's width plus 1ch, at least 24px, measured by the browser and never counted in characters, so `$` is exactly
    24px and a longer prompt ("PS>") or a wide glyph widens the column for every line and the text of every line starts on one
    edge. The terminal is the container for its own head: under 30rem of its own width (not the viewport's) the copy button is
    the icon alone (Copy, swapping to Check, announcing "Copied") and keeps its name "Copy commands", so a live head is two rows
    at 390. A finished run's head keeps the callout's marks in the 16px seat (CheckCircle in the success colour; XCircle with
    "Failed, exit 1" in danger ink) and "Done" in the head's secondary ink. A replay that hasn't started shows one sentence in the
    log's box, "Press Play to start", in tertiary ink, which leaves when the first line arrives; Play and Replay make the region a
    `log` first and show the first line one frame later, so a screen reader hears it and the box is never blank for an interval. A replay copies every command whatever the playhead, and a stream the app drives
    copies what has arrived; with nothing to copy the button is off and never says "Copied". The title row's hairline, in a
    terminal and a `CodeBlock`, is a real `CanvasText` border in forced colours.
- **Loading:** progress tracks are filled with the input-boundary colour (3:1); skeletons use
  `surface-placeholder` and a calm 2s pulse. Two spinners, one job each. The ring is for a wait: it
  is the default, and it turns in 640ms in a button, in the command menu's loading slot and wherever
  a spinner stands without a visible word. Braille is for a status: work that runs while a word
  beside it says so, in a table, a list row, a toast or a log line; never in a button, and never
  without its word. Braille is Basalt's own six-dot cell drawn in SVG, 6 by 10 with 2px dots on
  whole pixels, stepping through ten frames (⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏) in 800ms; unlit dots are not drawn. It
  takes the status dot's place and gap, in its word's colour. Spinners on a page share one clock.
  Under reduced motion the ring fades and braille holds its first frame.
  **A page can hold every loop.** `data-loops="held"` on `<html>` stops every loop Basalt draws,
  portals included: braille, the ring, a busy Button's ring, the indeterminate Progress bar,
  Sparkline's loading line and Skeleton's pulse, and the page's ambient loop (its marks hold at full opacity); under the hold nothing
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
  theme's, so a stored hold applies before the first frame. This is the mechanism WCAG 2.2.2
  (Pause, Stop, Hide, Level A) asks for beside content that runs for more than five seconds:
  reduced motion alone is OS-wide and leaves the ring fading, so it is not one.
  **The control is `LoopsToggle`, in the form the place needs, with the fixed name "Pause animations"** (it does not change when
  pressed; `aria-pressed` or the switch's state says it is on): on a site, an icon-only ghost toggle (`LoopsToggleIcon`, which loads no `Switch`) with the core `pause` glyph, named by its `title` alone (the browser's own tooltip on a fine pointer; no `aria-label` beside it, so a screen reader hears the name once; no `Tooltip`) in the
  site header's end cluster, before the theme toggle, on any page with an ambient loop or a loop that can run past five seconds;
  in an app, a pressed-toggle Button (secondary or ghost) in the head band of the view that shows running work, and a settings row (the
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
  size. The toast's 16px mark seat is unchanged. Status: decided by the council (DECISIONS 99); the
  implementation hasn't been reviewed. `LoopsToggle` and the ambient loop: decided by the council (DECISIONS 136) and approved by the
  owner (DECISIONS 139); the implementation hasn't been reviewed.

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
key, 2px apart, so the keys of a shortcut read as one object. Text is `text-secondary` (5.59:1 or
better in dark, 6.50:1 in light, on the chip over every surface), and `text-primary` on a hover or
selected wash. ⌘ ⌥ ⌃ have no glyph in Geist, so they are Phosphor's Command, Option and Control,
Bold at 12px in the text colour; "Esc" is the word; letters, ⇧ ↵ ⌫ ⇥ and the arrows stay in Geist
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

Geist Sans and Geist Mono (SIL OFL 1.1), variable fonts, at three weights: 400, 500, 600.
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
  steps 0.5, 1.5, 2.5 and 3.5 (2, 6, 10 and 14px) for control padding and optical spacing, and `space-32` (128px), the large section gap.
- **Component sizes are tokens too:** the tab underline (2), tracks (4), dots (6), choice boxes,
  the switch, kbd and badge heights, table rows, and the widths of dialogs, sheets, toasts,
  popovers, tooltips and the command menu, all under `size-*`. Component CSS has no raw
  lengths; Stylelint enforces it, with the screen-reader clip as the one exception.
- **Controls:** 24, 28, 32, 36 and 40px tall; 32 is the app default, and
  `data-density="compact"` moves controls down one step (24px is the floor) and uses 13px
  control text. Set it on `<html>` so portalled menus inherit it; a nested
  `data-density="default"` restores regular sizes. A popup row (Menu, Select, Combobox) is a 36px plate (`size-menu-row`, which is
  `size-control-lg`) in a 40px hit area, and a command menu row a 40px plate in a 44px hit area; compact steps the plates to 32
  and 36; on touch a hit area is at least 44px, and a combobox's text entry is 16px. All shared control targets stay at least 44px on
  touch regardless of density. A notification entry is at least 44 tall on touch, its line centred (a one-line entry is 40 otherwise
  and its plate stays 40; a two-line entry is 58 already). A `Link` on a line of its own has a 44px hit box on touch with no change
  to layout and no change to its look (its block margin takes back what the box adds, the underline stays and no wash is drawn); a link in a
  sentence (a paragraph, a list item, prose, a hint, an error, a callout's text) keeps its line, as WCAG 2.5.8 allows, because a taller
  box would lie over the lines above and below it, and no two targets overlap. **Status:** decided by the council (DECISIONS 138) and
  approved by the owner (DECISIONS 139); the implementation has not been reviewed. Choice labels provide their target without enlarging the
  glyph; a standalone choice must be placed inside a target of at least that size by its
  consumer. Text entry is 16px on touch to avoid iOS focus zoom.
- **Radius by role:** 4 (badges, checkboxes), 6 (controls up to 32px, inputs included), 8
  (controls 36px and up, code blocks and callouts), 12 (cards, menus, dialogs), 16 (bottom sheets, and the narrow menu's bottom corners; full-height side sheets are square), full (avatars, dots and the navigation hover pill). A
  nested radius is the outer radius minus the padding.

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

- **Tokens.** `surface-chrome` is the page colour with alpha: `#000` at 85% in dark, `#fafafa` at
  92% in light. `blur-chrome` is 12px. There is no `saturate()` and no brightness filter: on a
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
  holds secondary at 5.84:1 (tertiary falls to 4.09:1, below AA), and over a pure black plate the light
  bar holds it at 6.77:1 (tertiary 4.27:1); primary is 12.88:1 or better. The class sets primary ink and
  promotes tertiary text (`Text tone="tertiary"`, a Sparkline axis) to secondary inside it, and no Basalt
  part draws tertiary text on the bar without a fill of its own. An app does not put tertiary there.
- **A pressed ghost Button takes primary ink.** Inside the bar only, a ghost Button held down shows `text-primary`
  on the selected wash (secondary ink is 4.42:1 there on a touch device, where a press is the only state; primary is
  9.75:1 or better). The wash stays. The council decided this by majority (3-1); elsewhere a ghost keeps its ink.
- **No danger Button on the bar.** Destructive actions don't belong in global chrome (the owner's rule). Danger
  text on the bar's washes is below AA where the bar sits over a contrasting backdrop: hover 4.32:1 and pressed
  3.92:1 in dark over white, pressed 4.36:1 in light over black. On the bare bar it passes (5.17:1 and 5.09:1).
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
  or darker than it in light, so the weakest ink in the bar, `text-secondary` (links at rest), holds 4.5:1 on it (4.89:1 in dark, 4.60:1 in
  light), and the focus ring and the icons hold 3:1. `text-primary` holds on the selected and hover washes over the limit (8.14:1 and
  8.96:1 in dark, 8.42:1 and 8.97:1 in light, at worst). One tone further (tone 3) secondary falls to about 2:1, which is why the limit
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
  at rest with one row lit reads as a selection that isn't there. (The modal's plate is always lit: the modal exists only while it is used.)
- **The list holds its unfiltered height**, up to `size-popup-max-height` (360), and scrolls inside. Filtering never changes it, so
  what is below it never moves: the still table's rule, applied to a list.
- **A foot band** shows the count at the start ("9 commands", "3 of 9") and the key legend at the end (`data-kbd-hint`, hidden on touch). The
  count is shown at once and spoken once, through a polite, atomic live region after 400ms of stillness (`FilterResult`'s rule). No match
  is one centred sentence ("Nothing matches “zzz”.") and a ghost "Clear search", in the held area and outside the listbox, so the button is valid.
- **Until cmdk arrives** the rows are drawn as they will be and what is typed is kept, then becomes the first search. cmdk stays behind
  its dynamic import, loaded when the list first mounts.
- **⌘K belongs to one command surface per page.** A page with a modal `CommandMenu` gives ⌘K to the modal, and its list has no
  shortcut of its own. A page whose command surface is in the page gives ⌘K to that list (`bindShortcut`): focus the field, select its
  text and scroll it into view, and that page has no modal. The component offers the binding; the app chooses which surface owns it.
  A ⌥ plus letter chip on a row is ignored while typing, as in the modal, so it can't be used from inside the field.

#### List plus preview

A pattern on the in-page list (`detail`), not a new surface: the list, and a pane the app renders for the active command.

- **Two level-1 panels `space-4` apart**: the list a fixed `size-list-width` (320px), the pane the rest, equal in height, with no line
  between (Basalt allows one vertical line, at a scrolled pinned table edge; space groups these). The pane scrolls inside if it is taller.
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
  and secondary when lit (tertiary on the plate falls under 4.5:1), with no weight change; compact is 13/18 over 12/16. The 20 and 18
  line boxes touch, with no gap.
- **Where things sit.** The glyph, a check seat, a key chip and a time sit on the title line, centred on it; the description runs from the
  text's edge to the row's end, under the chip's column too. Both lines truncate with an ellipsis and never wrap, so a row's height is known.
- **Mixed lists.** One-line and two-line rows may share a list, each its own height, and the shared plate changes height as it glides.
  A row with no description is one line: it holds no empty second line.
- **Danger.** The title and the glyph take the danger ink; the description keeps its own.
- **Names.** An option's name is its content in reading order: title, description, hint. The key chip stays `aria-hidden`.
- **Search.** Descriptions are search keywords, ranked below title matches. There is no match highlighting: bold letters change widths as you type.
- **Where to use it.** Freely in the command menu and the list. In Menu and Select, describe a choice only when the label alone can't tell the
  choices apart (a visibility, a role, a plan, a model), never to explain an obvious action ("Copy link" stays one line). A described
  menu is as wide as its content, up to `size-popover-max` (320), and then descriptions truncate.

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
  light one, about 1.17:1), never the column's width. The label stays primary on it (15.3:1 in dark, 14.6:1 in light). **Pressed**
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

## Site structure

The site header, its narrow menu, the app shell and the phone tab bar (decision 96; the council voted 8.5, 8.5 and 8, a three-member
round; the owner's ordering of the build is in DECISIONS 93). The components are `SiteHeader`, `AppShell`, `AppHeader`, `TabBar`,
`TabBarItem` and `TabBarMore`, with `Sheet side="top"` and a `NavItem` without a glyph as the two additions to what shipped. The layout
lengths are tokens (see [Layout](#layout)), and the two breakpoints are written as numbers in range-syntax media queries, which cannot
read a custom property, each with a lint exception that names its token.

**Status:** decided by the council (DECISIONS 96); the implementation has not been reviewed.

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
- **The actions** are, in the end cluster, `LoopsToggle`'s icon form (only on a page with an ambient loop or a loop that can run past five seconds), the theme toggle (a ghost `IconButton`, at every width) and at most one primary Button. Never a danger Button. The loops toggle is before the theme toggle and stays in the bar at every width; the narrow menu has its own row for it (below).
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

Under 720 the links and the primary action leave the bar; the brand, the theme toggle and a Menu button stay. The bar's buttons are
44px whatever the pointer, radius 8.

- **The trigger** is a ghost icon button with the core Menu glyph at `IconButton`'s own 16px, named "Menu", with `aria-expanded`,
  `aria-controls` and `aria-haspopup="dialog"`. It morphs to Close over `duration-slow` (the drawn pair).
- **The menu** is `Sheet side="top"` on Base UI's Dialog, so it keeps the dialog contract: a real focus trap, an inert page, Escape,
  focus return. It has the scrim, level 1, `shadow-modal` and bottom corners of 16 (`radius-xl`). Its first row redraws the bar in
  place: the brand, the toggle and Close on the Menu button's exact box, with a divider under it. When the page has a loops toggle (the
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

### The app shell

One grid, and the document scrolls, never an inner pane. Pages set `scrollbar-gutter: stable` (the shell sets it on the document it
is in).

- **1024 and up:** a 256px sidebar on `surface-page`, edged by a 1px `border-divider`, sticky at `100dvh`, its list scrolling inside
  only when `Nav` overflows. Its brand band is the header's 56px, level with the header, and draws no line of its own. `Nav` with its
  groups, and account items (a second `Nav`) pinned to its foot.
- **720 to 1023:** the rail, 72px: `Nav`'s collapsed form (the 48px circle, 12px either side), the label as name and tooltip, counts
  spoken. There is no collapse toggle. The shell hands `Nav` the rail, so the app does not measure.
- **Under 720:** no sidebar and no rail: the phone tab bar.
- **The header** (`AppHeader`) spans the content column only, never the sidebar, and its line ends at the sidebar's edge. 56px,
  sticky, smoked by default. It holds the page title (the page's `h1`) at 18/26, 600, then the actions at its end. On a phone it spans
  the full width with the same geometry, still sticky, and the header's one primary Button leaves the bar under 720, as the site
  header's does (the app puts that action elsewhere). The page's main is capped at 72rem (the site header's row length) and
  start-aligned. Its **opaque form** is the same bar without the layer (`solid`): only one
  smoked surface per viewport, ever.
- **Safe areas:** the page's viewport meta needs `viewport-fit=cover` for `env(safe-area-inset-*)` to work; without it the insets
  read 0 on a phone. (The HTML skill's compose does not emit it yet; that is batch 7.)

### The phone tab bar

- **The surface** is solid `surface-page` for every product, a hairline on top, no shadow and no blur; `Canvas` with a `CanvasText`
  line in forced colours; not shown in print. The header is the one smoked surface, and nothing translucent sits under the thumb.
- **Height:** 56 with the hairline inside, plus `env(safe-area-inset-bottom)` below and the side insets in landscape. Content pads
  past it by the bar, the inset and `space-6`. At phone widths toasts sit above it. A cell's glyph circle sits 2px below the cell's top, with the label under it.
- **The cells:** three to five equal, each a link filling its cell, with `aria-current="page"` on the current one, in a `nav` named
  "Primary", never a `tablist`. Each is the glyph at 24 over a 12/16 label, always both; glyph and label are primary ink at rest, the
  label at 400. The current one is the selected glyph and the label at 600, with no wash, no pill and no bar.
- **Press and hover** are a 32px circle at the selected wash behind the glyph; the first key hides it. **Focus** is the control ring
  inset by its own width on the full cell (the flush-field rule: the cell is itself a link and meets the screen's edge).
- **A new-activity mark** is a 6px dot in the label's ink at the glyph's top end, its words in the link's name. Counts are spoken,
  not drawn.
- **More than five destinations:** four, then More, a button that opens the bottom `Sheet` with the rest as `Nav` rows. More takes the
  current look while one of its pages is current, and its name says which.

### Vertical lines

Basalt allows a short list of vertical lines. Each is structure, and none is a selection, sort, active or status mark (the owner's
ruling against the vertical bar is about marks): the 1px divider at a pinned table column's edge while the table is scrolled,
the app sidebar's 1px edge, and a meter's labelled target tick.

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
  lane of one choice a week on the plot's own axis, with the open week's plate behind both. A press on a day, or Enter on the focused day, opens its week; the days stay images
  with a roving tab stop, and there is no live region. The chosen call takes primary ink on the `state-selected` plate with no weight change, and the plate slides over
  `duration-slow` on `ease-out` (3 to 1; none under reduced motion; in forced colours it is a 1px `Highlight` outline). The lane's choices are 44px on touch. Where a week's
  slot is under 44px (twelve choices do not fit a phone), the lane is marks (a changed week's mark is larger) and previous and next controls step through the weeks, with the
  open week in words in a seat as tall as the tallest; a keyboard still reaches every mark. The headline frame's `text-4xl` and `text-5xl` figure is used, over N1's own 22px
  phase read (DECISIONS 157, consent row C6).
- **The share bar** (`ShareBar`, votes 12 and 13): N1's form without its gloss: 8px (a plan) or 12px (a tally, each part at least 12px long and as wide as its own words, taken from the other parts so the bar keeps its width) tall, a 4px gap, full radius,
  one ink for every part (`chart-observed`), each part's share and name under it in words. The shares are whole percents that add to 100. The bar is decoration; a part of
  nothing is left out, and a part that is more than nothing but rounds to 0 reads "<1%" (spoken "less than 1%", DECISIONS 157, Q4, 4 to 0; the implementation hasn't been reviewed); every other share is a whole number.
- **The coverage strip** (`CoverageStrip`, vote 14, consent rows 6 to 8): a cell a day, lit when recorded and Basalt's hatch when not (no dashed edge), 48px tall with a
  2px gap and a 2px corner (`radius-2xs`) as a strip of slivers (84 days is a quarter), or seven squares with a 4px gap and `radius-sm` for a week. The cells are hidden from
  assistive technology; the words ("78 of 84 days recorded. Not recorded: 31 Aug to 2 Sept (watch not worn).") are built from the cells.
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
| `size-breakpoint-container` | 480px | A component's own width: a description list stacks and a chart goes narrow |
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
  - `--basalt-bottom-offset`: `size-tab-bar` plus `env(safe-area-inset-bottom)` under 720 in an app with a tab bar, else 0. It is the
    page's bottom padding and where the toast stack sits.
- **Breakpoints in CSS** are range syntax with the number written and a lint exception that names the token, because a media or
  container query cannot read a custom property: `@media (width < 720px)`, `@container (width < 480px)`. Range syntax means there is no
  719/719.98 pair to keep in step and no gap on a fractional viewport. Components answer their **own** width (`@container`); pages
  answer the viewport.
- **For apps with PostCSS,** the tokens package generates `breakpoints.css` (`@custom-media --basalt-phone (width < 720px)`, `-md`,
  `-lg`, `-rail`). **In script,** `@srasyndicate/basalt-tokens/breakpoints` exports `breakpoint.md`, `.lg` and `.container`, so
  ``matchMedia(`(width >= ${breakpoint.md}px)`)`` never carries the number.
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
- **Layout changes at 720 and 1024 only,** on the viewport, and a component at 480 on its own width. The display roles, the lead, the section
  gap and the columns change at those two widths, so a page has three shapes to check. **No new breakpoint:** 900 and 1280 are not adopted
  (the row is already 672 to 975 wide at 900, and past 1152 nothing has room to change at 1280). A site's art may answer its own measures as a
  container query on the art.

## Art

Full-bleed art at the top of a page, and pictures in the flow (decision 104; the council voted 8.5, 8.5 and 8, a three-member round, DECISIONS
93). The components are `Stage` and `PairedArt` (the stage), `FramedArt` (a figure), and the headroom check, a test helper.

**Status:** decided by the council (DECISIONS 104); the implementation has not been reviewed.

### The stage

Full-bleed art at the top of a page, behind a clear [site header](#the-clear-bar-over-art). One per page, and the page's first content.

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

### The headroom check

A test helper for a product's own browser tests, and Basalt's, imported from `@srasyndicate/basalt/testing` (a module of its own; the root
export and the components never import it, so it is not in an app's bundle). `checkHeadroom(browser, { load })` renders the page at 390 and
1440, in each theme, at 1x and 2x, with the bar's ink and the stage's content hidden, reads every device pixel of the headroom and of each
`data-quiet` zone, and fails if any pixel crosses the limit, naming the worst one. Nothing samples at run time: a cross-origin image cannot be
read, and it would cost every page. The pixels come from a screenshot decoded on the page's own canvas, so the browser resolves every colour,
`oklab()` and `oklch()` included. Add the product's own art breakpoints to `widths`.

### Framed art

A picture in the flow is a distinct object, so a panel's geometry.

- **The rim** is a real 1px border outside the art (`border-rim`, lit on top in dark), never laid over its pixels. **Radius 12** on the page
  (`radius-lg`); inside a panel the nested-radius rule (a card's 12 less its 16 of padding is square). **No shadow:** it does not float.
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
  between the themes by itself. It never goes past `art-mark`, and gradients are only between neighbouring tones. No accent.
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
on `ease-out` while pressed, and back, on `:active` only, never when disabled or loading, and on nothing
else (no row, card, menu item, command row or the parts of a field; there is no `basalt-press` utility). A popup (Menu, Select,
Combobox, Popover, Tooltip) enters from opacity 0 and scale .98, from where it grew
(`--transform-origin`), with no offset, in `duration-base` on `ease-out`, and leaves at three
quarters of that on `ease-in`. The horizontal tab underline, and the panel that moves 8px with it, run on
`duration-slow` `ease-out`; the panel never remounts. Two kinds of thing loop, and nothing else: a mark that says work is running
(the ring, braille, a busy Button's ring, the indeterminate Progress bar, Sparkline's loading line and Skeleton's pulse), and a page's
one ambient loop, opacity only, in its art; `data-loops="held"` stops both.

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

**Travel.** A traveller that leaves a resting place and stops at another on screen, carrying something the reader follows, moves by
transform on `ease-in-out`: a leg is `duration-slower` up to 150px, 2ms a pixel above that, and `duration-figure` from 300px (so a
diagram puts a stop at least every 300px); it rests 200ms (`duration-slow`) at a stop while the stop takes its colour step, and a run
ends inside five seconds. Each trigger is its own traveller: a second leaves from the start while the first keeps its course, and with
two in flight a third lands the oldest at once, its outcome written. Under reduced motion the traveller appears at its destination
with a 100ms fade and the outcome is written at once. The hold does not stop a travel the reader started, and nothing sends itself
under it. The timing is `travelLeg`, `travelRun` and `createTravellers`, exported; a run ends inside five seconds for every plan it accepts (no leg is made shorter than 100ms, and a plan whose rests and shortest legs cannot fit, more than 17 legs, 16 stops, is refused with an error); `TravelSpinner` keeps its single `duration-slower`
leg, because it answers an accept in an app. Anything that answers a pointer or key in place (the pill, the plate), an entry or exit,
scroll and a loop is not a travel. Status: decided by the council (DECISIONS 136) and approved by the owner (DECISIONS 139); the implementation hasn't been reviewed.

**An ambient loop.** One a page, only in its art (a `Stage`'s art or a framed drawing), and never on text, a control, a data mark, a
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
a 100ms crossfade; the horizontal tab underline does not move; the segmented and vertical-tab pill and the hover glide do
not travel (each item shows its own pill or plate, fading over 100ms). Spinners fade or hold still, and a loop is
never cut to 100ms.

The components and what each does are in [Motion and primitives](motion.md).

## Icons

Basalt has a core set of its own, drawn by the design council (decisions 38 to 40, 54 and 55): the
core actions, navigation and Blacksand's product nouns. Each glyph is a module of
`@srasyndicate/basalt` (`HomeGlyph`), and the long tail is Phosphor (MIT), Bold at 16, 20 and 24.
A product's own logo is its own; the social marks are Phosphor's (below).

- **Which set draws a glyph.** Wherever a component draws check, close, the chevrons, copy, plus, minus or search, it draws the core
  set's glyph; Phosphor Bold draws what the core set lacks (the status marks, the sort caret, the pagination gap's dots, the social
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
  `slow` on `ease-out`, and reduced motion swaps at once.
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
  goes in the site header's bar, which ends with the theme toggle and at most one primary Button.
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

## Primitives

Components build on Base UI (the default base in shadcn/ui since July 2026, from the team
behind Radix), with shadcn/ui's variable names mapped onto Basalt's in `dist/css/shadcn.css`.

Forms retain native labels, grouped legends and validation. **A required field says so:** "Required" directly after the label
(not at the far end of its row), in `text-tertiary` at `text-xs` and 400, hidden from assistive technology (the input's own
`required` says it, so it is not said twice). "Optional" shows the same way, only where an author marks a field optional; a field
marked neither shows nothing, so existing fields do not all grow a word. Never an asterisk, a colour or a glyph alone. On the smoked
header the word lifts to secondary, as every tertiary caption does. **Status:** decided by the council (DECISIONS 138) and approved by
the owner (DECISIONS 139); the implementation has not been reviewed. Select is for a short known
list; Combobox searches a single known choice. NumberField enters an exact value in one bordered control sized to its content, steppers inside; Slider
adjusts a scalar or range, with distinct names for range thumbs. Confirmations use
AlertDialog with safe initial focus. Sheets use the dialog contract in a scrolling side, bottom or top panel, including safe-area padding and motion preferences.

TimeChart draws a series over time (see [Charts](#charts)), ChartGroup stacks charts on one gutter, and Prose sets a text column's measure (see [Layout](#layout)).
Stage and PairedArt put full-bleed art under a clear site header, and FramedArt frames a picture in the flow (see [Art](#art)).

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

## How these were decided

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
