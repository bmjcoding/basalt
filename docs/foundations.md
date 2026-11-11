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
  command menu is solid. Use the class once per viewport; translucent layers never stack.
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
  notification centre's entries: links or buttons, each painting its own plate on hover. Otherwise Basalt ships none:
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
  link in a cell is a block that carries its own). **The sort control is the whole header cell** (decision 84): a
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
  scrolled-edge divider** is the one vertical line Basalt allows: a 1px `border-divider` at the pinned edge, drawn only
  while the table is actually scrolled, structure and never a selection, sort or status mark; the owner's ruling against
  the vertical bar is about marks, and this is not one. **App guidance:** set `scrollbar-gutter: stable` on the page's
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
  spoken, the plain variant carries the same mark, and in forced colours it is a border in `CanvasText`. At most two badges
  sit on one object (`BadgePair`): the status first, right after the name, then one neutral fact, `space-2` apart and
  `space-2` after the name. Never two statuses; a third fact goes in words. When the name and the pair don't fit on one line
  the pair moves under the name as a unit, the name truncates only when it alone is wider than the row, and a badge never
  truncates. Spoken in DOM order.
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
  (activation is suppressed and keyboard focus stays on it), and it never hides and never moves focus. What is spoken
  is one polite, atomic result line outside the filter (`FilterResult`: "Showing 3 of 24 runs"), updated after the text
  has held still for 400ms, so three toggles are one announcement. In forced colours every part of a chip uses a system
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
  the dot's seat empty and the title in secondary ink, so "Mark all as read" moves nothing. The app owns the entries,
  their read state, persistence and the "View all" page; the component is presentational.
- **Callouts** keep a neutral fill at their own level, with no tint. Status is the icon and the words, and success,
  warning and danger also draw the rim in their status colour, mixed in sRGB at 45% over the callout's own level (the
  danger Button's hairline recipe, but one solid colour on every side, in both themes). The icon takes the status
  colour and only danger's title does; the body stays secondary. Info and a plain note keep the neutral rim and a
  secondary icon. The rim is decorative (about 1.7 to 2.8:1): the icon (3:1) and the words (4.5:1) carry the status, so
  those are the pairs the tests prove on every level. In forced colours the rim and the icon are `CanvasText`: the
  status is the icon's shape and the words. "Danger is text plus a hairline in the danger colour, never a red fill"
  stands, and the danger callout is an instance of it: a hairline on a panel.
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
  Sparkline's loading line and Skeleton's pulse. There is no per-spinner prop, and the attribute
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
  **The control is the app's part, built from shipped parts, with no new component:** a
  pressed-toggle Button (secondary or ghost) in the head band of the view that shows running work,
  labelled "Pause animations" with a fixed name and `aria-pressed`; the same words as a settings
  row (the label, the description "Spinners hold still and timers show when work started. Your work
  keeps running.", and a `Switch` at its end); and a command, "Pause animations", reading "Resume
  animations" while held. Nothing is announced when the hold changes: the control speaks its own
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
  implementation hasn't been reviewed.

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
| `text-5xl` | 56 / 60 | −0.035em | Display |
| `text-4xl` | 40 / 44 | −0.03em | Page hero |
| `text-3xl` | 30 / 36 | −0.025em | Page title |
| `text-2xl` | 24 / 30 | −0.02em | Section |
| `text-xl` | 20 / 28 | −0.015em | Card title |
| `text-lg` | 18 / 26 | −0.01em | Lead |
| `text-md` | 16 / 24 | −0.005em | Body in docs and marketing |
| `text-base` | 14 / 20 | 0 | Body and controls in apps; the rows of every popup (13 / 18 in compact) |
| `text-sm` | 13 / 18 | 0 | Tables, sidebars, and popup rows in compact density |
| `text-xs` | 12 / 16 | 0.01em | Labels, captions, a field's helper text |

Tabular numerals for tables, metrics and timestamps; Mono for identifiers, code and keys.

## Space, size, radius

- **Space:** a 4px base, with Tailwind-compatible names (`space-4` is 16px), plus the half
  steps 0.5, 1.5, 2.5 and 3.5 (2, 6, 10 and 14px) for control padding and optical spacing.
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
  touch regardless of density. Choice labels provide their target without enlarging the
  glyph; a standalone choice must be placed inside a target of at least that size by its
  consumer. Text entry is 16px on touch to avoid iOS focus zoom.
- **Radius by role:** 4 (badges, checkboxes), 6 (controls up to 32px, inputs included), 8
  (controls 36px and up, code blocks and callouts), 12 (cards, menus, dialogs), 16 (bottom sheets; full-height side sheets are square), full (avatars, dots and the navigation hover pill). A
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
  the same bar without the layer.

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

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0 | Hover-in colour, selection |
| `duration-fast` | 100ms | Hover-out, toggles, colour changes |
| `duration-base` | 150ms | Tooltips, menus, popovers, the hover glide in popup rows and in navigation |
| `duration-slow` | 200ms | Dialogs, accordions, tab indicator and panel, the segmented and vertical-tab pill, a value glide (`useGlide`) |
| `duration-slower` | 300ms | Sheets and drawers, a travelling spinner |

Loops are not on this scale: they repeat while work is happening. `duration-loop-ring` is 640ms,
`duration-loop-braille` 800ms and `duration-loop-fade` 1200ms.

| Curve | Value | For |
|---|---|---|
| `ease-out` | `cubic-bezier(.16, 1, .3, 1)` | Entries, and every move that answers input |
| `ease-in` | `cubic-bezier(.4, 0, 1, 1)` | Exits, at three quarters of the entry |
| `ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` | A rest-to-rest travel the eye follows (TravelSpinner only), and loop pulses |
| `ease-linear` | `cubic-bezier(0, 0, 1, 1)` | Spinners |

Nothing overshoots: Vercel's overlays overshoot by 10% (`cubic-bezier(.175, .885, .32, 1.1)`);
Basalt's settle. A press is a colour step; Button and IconButton also scale to .98 over `duration-fast`
on `ease-out` while pressed, and back, on `:active` only, never when disabled or loading, and on nothing
else (no row, card, menu item, command row or the parts of a field; there is no `basalt-press` utility). A popup (Menu, Select,
Combobox, Popover, Tooltip) enters from opacity 0 and scale .98, from where it grew
(`--transform-origin`), with no offset, in `duration-base` on `ease-out`, and leaves at three
quarters of that on `ease-in`. The horizontal tab underline, and the panel that moves 8px with it, run on
`duration-slow` `ease-out`; the panel never remounts. Nothing loops except spinners and the line of a
loading Sparkline.

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
  fades, and the pointer moves it from that row to the next.
- **Off** on touch (`(hover: none)`, a coarse pointer or a touch `pointerType`), where the row under the finger shows
  its own plate on press; under reduced motion, where each row lights on its own, in at once and out with a 100ms fade, with
  no travel; and in forced colours, where each row is `Highlight` with `HighlightText`.
- The shared plate is pointer-inert and hidden from assistive technology, and the page is correct without script.

**What persists, stays.** A control or word that is in both states does not remount. Only the
part that changed moves: shared letters stay put, and a change to a panel moves the panel, not the
page.

Under `prefers-reduced-motion`: no transform, no size and no position animates (a press keeps its
colour step and its scale is 1). `duration-base`,
`duration-slow` and `duration-slower` are 100ms, so state changes become short fades; the toast
stack sits at its final offsets and only fades; Progress width jumps; NumberTicker is plain
tabular text at the same width and baseline; the toast drain is not drawn; Sparkline snaps its
scale and labels; a travelling spinner appears at its destination with the same fade; a tab change is
a 100ms crossfade; the horizontal tab underline does not move; the segmented and vertical-tab pill and the hover glide do
not travel (each item shows its own pill or plate, fading over 100ms). Spinners fade or hold still, and a loop is
never cut to 100ms.

The components and what each does are in [Motion and primitives](motion.md).

## Icons

Basalt has a core set of its own, drawn by the design council (decisions 38 to 40, 54 and 55): the
core actions, navigation and Blacksand's product nouns. Each glyph is a module of
`@srasyndicate/basalt` (`HomeGlyph`), and the long tail is Phosphor (MIT), Bold at 16, 20 and 24.
Brand marks are each brand's own.

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

Icons take `currentColor`, default to the secondary text colour, and turn primary when active.
Navigation glyphs in a sidebar or rail are primary at rest, like their labels. On iOS, system
concepts (back, share, settings) use SF Symbols.

## Primitives

Components build on Base UI (the default base in shadcn/ui since July 2026, from the team
behind Radix), with shadcn/ui's variable names mapped onto Basalt's in `dist/css/shadcn.css`.

Forms retain native labels, grouped legends and validation. Select is for a short known
list; Combobox searches a single known choice. NumberField enters an exact value in one bordered control sized to its content, steppers inside; Slider
adjusts a scalar or range, with distinct names for range thumbs. Confirmations use
AlertDialog with safe initial focus. Sheets use the dialog contract in a scrolling side or
bottom panel, including safe-area padding and motion preferences.

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

Navigation (the sidebar and the rail, with their glide) was decided by the council and the owner in decisions 42, 45, 48,
49, 55, 69 and 70 (the drawing is `.review/council/menus-final/`, section 1). Its implementation has not been reviewed by the
panel.

The still table and the multi-select filter were decided by the council in a four-member vote and settled by the owner on
9 Nov 2026 (decisions 71 and 82 to 84): the fixed layout and reserved seat, the whole header cell as the sort control, the
chips and their switch to a checklist at seven values, Clear held in place, and the divider at a scrolled pinned edge.
Their implementation has not been reviewed by the panel.

Display states (the new-tab cue on links and Buttons, row headers, "Not observed", the scroll hint, the choice card, the
pressed toggle, the pending ring and two badges) were decided by the council in a three-member round the owner ordered
(DECISIONS 95; two of three deciding). The implementation has not been reviewed.

The press scale and the smoked header were decided by the owner (7 Nov 2026) after two council rounds
between the design reviewers; the owner's decisions are in this page's Motion and Chrome sections. Their
implementation has not been reviewed by the panel.

Callouts, toasts and the notification centre were decided by the council in a four-member vote (items 82 and 83: a 45%
status rim and no tint, 4 to 0; the marks, running in place, the timeout rule, assertive danger, the stack, the 40px swipe
and the centre) and by the owner, who set the toast's surface at level 1 and asked for the centre as a component. Their
implementation has not been reviewed by the panel.

The menus redesign (the depth floor and modal reset, the plate and lift on every popup row, the 36 and 40 rows, the
bar's removal everywhere, selected table rows, vertical tabs and the segmented pill, the forced-colours fix) was
decided by the council in four rounds (their votes are in `.review/council/menus-r2/`, the drawing in
`.review/council/menus-final/`) and approved by the owner on 9 Nov 2026 as drawn, with a menu from a table row at level 2.
