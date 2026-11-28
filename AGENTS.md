# Working on Basalt

Rules for any coding agent (Claude, Codex or another) working in this repository. They
exist because work has gone wrong here before: design decisions made without review,
another system's colours copied, and 1 MB of dependencies shipped to every app. Read
`docs/foundations.md` before changing anything visual; it is the contract.

## Who decides what

Basalt has one owner (Bailey) and a design panel of two independent design reviewers.

- **Visual and design-token changes are decided before they are built.** That means:
  any colour, type, spacing, radius, motion or shadow; a new component or variant; a
  change to how a component looks or behaves; any edit to `docs/foundations.md` beyond
  fixing a fact. The order is: the panel reviews (each designer on their own first,
  then converged), then the owner approves the proposal with previews. If you can't
  reach the panel, stop and say so. Don't decide alone, and don't build on an
  undecided proposal.
- **The panel is two separate reviewer sessions.** The agent doing the work convenes them
  on the owner's behalf, but never plays either reviewer and never substitutes its own
  judgment, even when the owner has handed a decision to "the panel".
  Handing a decision to the panel means asking the panel, not deciding.
  Each reviewer gets the brief alone, never the other's answer, until the convergence
  round; otherwise the reviews aren't independent.
  Nothing counts as converged until both reviewers have answered in their own words, and
  the PR quotes each reviewer's final position as written, not merged into a summary.
- **The council.** When the owner asks for the council, read `.agent/skills/council/SKILL.md`: it names the seats
  (drafters, a checker and a decider), the light and heavy tiers, and how a round runs. On a council round the council replaces the two-reviewer
  panel above. When the owner hands a question or a stream of work to the council, its decision stands in for his approval
  before building; he sees only objections the council couldn't settle and failures, and sees each built PR before it
  merges. When he only asks what the council thinks, its result is a proposal he approves before anything is built.
- **The owner's word is in the conversation or on the PR.** A merge of a PR means
  approval to go ahead with what it described, nothing more.
- **Where the line falls.** A change that alters any rendered pixel is visual, even inside
  a refactor, and even when it only snaps a raw value to a token. A new token is design,
  even when its value already exists inline. A new variant, size or state is design. A new
  prop or API that changes no pixel is engineering, as is a rename with identical output.
  If `docs/foundations.md` doesn't cover a case, it's a design decision.
- **Engineering inside the agreed design** (refactors, tests, build, performance,
  bug fixes that restore documented behaviour) needs no panel. Say in the PR what you
  changed and why. "Fixing a fact" in foundations means making the text match shipped,
  approved behaviour.
- **Never mark your own work as reviewed.** If something skipped review, the PR says
  so in plain words.

## Design rules (from `docs/foundations.md`)

`docs/foundations.md` wins if this file and it disagree; fix this file.

- **Monochrome.** Colour appears only in named roles: a product's accent, status, syntax inside code, and a service's own mark on a
  diagram's card. Never decorative. Colour never carries meaning alone: pair it with
  a word, icon or shape. Syntax colours never carry status (diff colours are a deferred
  exception).
- **WCAG 2.2 AA everywhere:** 4.5:1 for text, 3:1 for boundaries, focus and icons, on every surface the pair can appear on, in both
  themes. One exception, by name: a `RunTimeline`'s tail recedes below 4.5:1 from its second row (`opacity-recede-2` to `-5`), because
  the control above it opens the whole record at full contrast (WCAG G174); its window's top edge fades only the tail row it cuts, from the second step; it never recedes under more contrast or in forced colours. Contrast tests prove it; add a
  pair to them when you add a token.
- **Borders build structure; shadows are only for things that float.** No gradient
  borders, glow or bounce, and no press scale beyond Button and IconButton's .98. Hover
  brightens text and border slightly.
- **Panels have one rim:** a 1px edge in two solid colours, at most 8% white on top and 6%
  on the other sides in dark, uniform in light. No gradient along or across an edge, no
  inner glow or sheen, no blur, no animation, no outer frame, no light falloff on the page.
  Never on controls or chips. A status callout's rim is the one coloured rim: its status colour
  at 45% mixed in sRGB over its own level, one solid colour on every side. Every other panel, a
  toast included, keeps the neutral rim. Under more contrast every side is the input boundary's value.
- **Cut content fades.** A scrollport's edge that hides more fades its content (a mask, never an overlay) over `size-scroll-fade` (20) inline and
  `size-scroll-fade-block` (16) on a block edge, at most a quarter of the port and never more than what is hidden; a port that fits has no mask. The mask is
  never on a box that draws a rim, a shadow, a fill or a ring (a host round the port draws them); a classic scrollbar and held actions stay solid; a focused
  item or the row the keys are on is never under a band. Off under more contrast, forced colours, reduced transparency, print and `data-fades="off"`. Not
  faded: an ellipsis or clamp, a table scrolled sideways, a field being typed in, a diagram's stage, the window's edge (DECISIONS 397).
- **One smoked surface: the sticky header.** `basalt-chrome` (`surface-chrome`: `#000` at 92.5%
  in dark, `#fafafa` at 96% in light; `blur-chrome`, 12px, no saturate) is the only translucent,
  blurred surface. Dialogs, sheets, menus, popovers, toasts and the command menu stay solid. The
  theme control is in the site footer, never in the bar. Use the class once per viewport;
  translucent layers never stack. Only primary and secondary text sits on it, and it falls
  back to opaque `surface-page` without `backdrop-filter`, under reduced transparency, under more contrast, in
  print, and in forced colours (`Canvas`).
- **Level is position, not importance.** An in-flow surface is its parent plus one, whatever
  its role (a hero or console on the page is level 1, its input band and inner panels level
  2); only a surface that leaves the flow (menu, popover, dialog, sheet, toast, tooltip) is
  level 2 or above and carries a shadow. Never promote a panel with `float` or an explicit
  level; use space, type and content.
- **Depth is four levels, and the level is not a prop.** A panel is one level above what
  it sits in (3 is the cap), a popup is its opener plus one (a floor of 1, a cap of 3), a
  modal (dialog, alert dialog, sheet, command menu) resets to 1 and what it holds starts at 2,
  a tooltip is 3 and a toast is 1 (fixed). In light, levels 1 to 3 are one white: nesting shows by
  the rim, never by a darker fill. Group with space or a divider first; a panel is for a
  distinct object, at most one deeper inside any panel; bands (the command menu's input row,
  a table header) are not boxes.
- **The still table:** header positions, column widths and alignment never move (the owner's rule). Fixed layout from a
  `colgroup`, one remainder column, a minimum width; every sortable header reserves the indicator's 16px seat after its label, in every column; a
  start-aligned label never moves, and a numeric one rests on the numbers' edge and moves aside by a transform while the indicator
  shows (`duration-base`, `ease-out`; still under reduced motion and on touch); the whole header cell is the sort button (−2 inset
  focus, hover lifts the label and shows the caret, no wash, no weight change); the first direction, the reverse, then the table's
  own order with nothing lit (numbers and times first descending; rows always sort from the own order, so ties come back row for
  row); `aria-sort` on the `th`, none at the third. A column explainer (`TableHeadExplainer`) is a popover from the header itself
  (hover after 600ms, keyboard focus, a long press on touch; a press sorts and cancels it), opener+1, the rim, radius 12,
  `shadow-overlay`, above the header else beside it, never over its column, WCAG 1.4.13, only for a column a reader could misread
  (DECISIONS 257, 261). At 390 the name (and the select column) is pinned, opaque in every state, and a cell focused
  from the keyboard is never covered (a tap never scrolls the table); a column is never dropped or folded as the table narrows (facts a reader
  does not compare go in the name cell's `TableCall`, padded `space-2` in every table). Pages set `scrollbar-gutter: stable`. A row is at least
  40px (32 compact, 44 comfortable and on touch): a `wrap` cell (a column of sentences, every cell or none, never a fixed form or a number) has the
  one-line row's padding round its line and is never cut. A `TableRow linked` hands a plain primary press to its link, which stays the one
  control; modified and middle clicks, drags, selections, controls and cut cells keep theirs. A cut cell keeps its ellipsis and the row and can always be read: while
  it is cut it is a focus stop, and on hover or focus its whole value opens in place on a level-3 plate (WCAG 1.4.13: Esc, hoverable,
  persistent; never past the viewport); after Esc the cell shows its own −2 ring. A column of one fixed form (a date, a time, a status)
  is sized for its longest form under WCAG 1.4.12 spacing, and so is a header's label for its column (a sortable header is its own
  button and opens no plate).
- **The multi-select filter:** any-of-many is chips with no track (a check on, a plus off, a 100ms crossfade, kept under reduced motion), checkboxes
  in a labelled group; seven or more values, or a toolbar, are a trigger and a checklist, by count and never viewport.
  Clear stays mounted and `aria-disabled` at zero, keeping focus. One debounced polite result line is what is spoken.
- **The skip link and the required mark:** a focused skip link hangs under a sticky bar, `space-2` below its line, on the brand's start
  edge, floating (level 3, the rim, `shadow-overlay`, radius 8). A required field shows "Required" directly after its label in tertiary
  at `text-xs`, hidden from assistive technology; "Optional" only where an author marks it; never an asterisk.
- **A `NumberTicker`** draws its digits and never selects them; the number is in the sentence's flow under them, transparent, and is
  what a selection paints and copies, once, on the sentence's line. Under reduced motion and in forced colours the digits do not roll: the number is plain text.
- **Danger is text plus a hairline in the danger colour,** never a red fill.
- **A control that asks the server is busy until the answer, and never sends twice:** a `Button`, `IconButton` or `TextButton` whose `onClick`
  returns a promise ignores presses until it settles (`aria-busy`, focus, label and width kept, its own `disabled` untouched), a `Form`'s promise
  does the same for its submits and a `MenuItem`'s for its menu's trigger; the mark shows after 300ms and stays at least 400ms (the shaped
  skeleton's timings, a look only: presses and `aria-busy` end with the answer); a rejection ends it and is raised again; `loading` wins and shows at once; `waitForAnswer={false}` opts out. A TextButton's
  mark is a step down in ink and a dashed underline that breathes; a field being written (`writing`) is read-only, its words in secondary ink and its boundary dashed on a
  skeleton's pulsing fill, never the disabled look, and an empty value while writing keeps the text shown.
- **Selected is shown by shape or weight, never by colour alone:** one of many (a segment, a vertical or horizontal tab,
  the current page) is its label at 600 (from 400), its width reserved so nothing moves (the live words and icon keep their start edges in segments and tabs; a component is reserved too, but native or component labels holding a control, even a hidden input, a frame, media, canvas, script, style, dialog, template or slot, and words Basalt never sees, keep 400 and are not reserved), an icon in it taking its selected form, on the raised pill, the underline or
  the current page's plate; any of many, and on, is a check or a checked box. One state, one look, across components (tabs,
  segments, pagination, table rows, choice cards and pressed toggle buttons). The pill's edge is its hairline and casts no
  shadow. In forced colours the chosen segment, vertical tab and current page are `Highlight` with `HighlightText`, and the
  horizontal tab keeps its `Highlight` underline. **No state is ever marked by an outline** (selected, active, current and
  pressed never draw one), and **there is no vertical bar anywhere.** Focus is a 2px ring at +2 outside the control, drawn
  inside at −2 only where +2 would be cut or would cross a neighbour: a field or band flush with a clipping edge,
  a sortable header cell (a header band that is itself a button), a phone tab bar cell, a ghost control hung at an edge with less than 4 of room left, a segment of a track while it scrolls (a track that fits keeps +2), and a cut cell of a still table (a focus stop, which shows its own ring after Esc has closed its plate). These structural
  vertical lines are allowed, each named and never a selection, sort, active or status mark: the 1px divider at a pinned table
  column's edge while the table is scrolled, the app sidebar's 1px edge, a meter's labelled target tick, a time scale's tick lines and its labelled today line, the vertical
  `Separator` between groups of controls, the edges between a `NumberField`'s value and its steppers, a diagram's connector, a sequence diagram's lifeline with its activation bar, a frame's sides, and a stage list's or run timeline's connector (1px between two marks, never
  filled and never a state). The active row in a menu, select, combobox or command menu is a rounded plate
  (radius 8, one solid fill per level) plus a lift from secondary ink to primary, with no
  weight change: it is the row the keyboard is on, and it changes with every arrow key (WCAG 1.4.1). A selected table row is the wash band, and its checked box
  carries the state. A wash over an opaque fill (a pinned cell) is one colour from `color-mix`, never a gradient, an image or a
  pseudo-element layer, and a hovered or selected row's wash is on every cell of the row, pinned or not, in React and the skill. Horizontal tabs keep their underline: it is horizontal. It is as wide as the tab's content, and the row hangs its first label on the line (DECISIONS 358). In a segmented
  control and in vertical tabs one pill slides to the chosen item (`duration-slow`, `ease-out`);
  under reduced motion and in forced colours each item paints its own.
- **Reserved room is page, not paint:** a box hugs what it shows; a seat's spare room lies outside it, on the open side; a seat
  inside a control is never empty (a glyph at rest, its selected form or the check when on).
- **A ghost control at an edge** puts its glyph or its words on the box's content line and hangs its own box into the padding by its
  inset (its inline padding; half the size it is drawn at, less its glyph, when icon-only: 8 at 32, 14 at the 44 it is on touch). The
  head's padding is the same on both sides, and the head says how much of it is room (`--basalt-edge-room`: its padding less any
  safe-area inset); the control never hangs by more, and with no room it does not hang. Use `edge` (`data-edge` in the skill), never a
  margin written by hand. Its ring is at +2 where the hung box keeps 4 from the edge of its room and inside at −2 where it does not.
  A drawn control sits on the line with its edge.
- **The last thing in a box** has no padding of its own toward the box's edge; a 44px tap box there reaches into the box's padding.
- **A height is room too:** a box is as tall as what it shows, and room held so that what follows does not move is open page under it.
- **Reservation limits:** native-element width copies are cleaned in props without an observer; opaque components need DOM cleanup and a second live instance, so server HTML can duplicate ids and controls until hydration (permanently without scripts), and an unsafe component can narrow when hydration declines it. The HTML skill still widens resting items once on initialization; build-time reservation and glyphs are a later batch (DECISIONS 150).
- **A focusable row** (a link or button in a list, not a listbox option) takes the control ring
  at +2, outside the row, and its list keeps at least `space-1-5` from any clipping edge. A
  full-bleed band holding its own control focuses that control; a band that is itself the link
  or button takes the flush-field −2 inset. A split `PanelRow` (with `actions`) is the band too: its trigger shows the band's −2 inset on
  its cover, and each action its own ring at +2.
- **Cut text** (`Text lines`): one line or a clamp of n (capped at n of the reader's own `1lh`), read whole on the level-3 plate on hover,
  keyboard focus or a touch and hold, Esc closing it (WCAG 1.4.13). Outside a control it is its own stop (the +2 ring, radius 6, or 8 for a
  clamp); inside a link, button, `summary`, `label` or widget role the control is the stop, the plate opens from its hover and focus, and
  without hover the text is whole at rest. `peek={false}` only where a press shows the whole text. Never a `title` or a `Tooltip`.
- **Keyboard keys are chips:** a fill with no border, 20px tall (`size-kbd`), one per key, 2px apart; ⌘ ⌥ ⌃ are
  Phosphor icons at 12 inside the chip. Only real shortcuts, one per row, never on the primary fill; the chip is
  `aria-hidden` and the item carries `aria-keyshortcuts`. Shortcut chips (`data-shortcut`) and hint legends
  (`data-kbd-hint`) hide on touch until a hardware key is pressed; a bare `Kbd` in text stays. **One modifier across platforms** (DECISIONS 244): write
  a shortcut with `Mod` ("Mod+Enter"), Command on Apple's systems (⌘, `Meta` in `aria-keyshortcuts`) and Control on Windows, Linux and ChromeOS ("Ctrl", `Control`); bind it with
  `isModKey(event)`, from the same `isApplePlatform()`, so the hint and the binding agree. A client render is right on its first frame; a server-rendered page's `Mod` chips settle at hydration (the server's answer is Control).
- **Radius by role,** by the size a box is drawn at (a 32px control drawn at 44 on touch is 8; a `NumberField` group drawn at
  40 is 8): 2 (a coverage strip's cells), 4 (badges, checkboxes), 6 (controls up to 32px), 8 (36px and up, code blocks and callouts), 12 (cards, menus,
  dialogs), 16 (bottom sheets), full (avatars, dots, the navigation hover pill, the switch, the radio, the slider's track and
  thumb, progress, meter, and the tab bar's circle); an app tile is a superellipse of exponent 5 and takes no radius. A nested radius is the outer radius minus the padding.
- **More contrast** (`prefers-contrast: more`; Increase Contrast on Apple platforms): three aliases and no new colour. Lines
  (the hairline, the divider, the rim, the pill's hairline) step to `border-input`, tertiary ink to `text-secondary`, a
  hovered edge (`border-hover`) to `text-secondary`, and a field's boundary (`border-field`, equal to `border-input` outside the
  mode) to `text-secondary`, and a diagram card's arrival rim (`diagram-hit`) to `text-primary`; the input boundary itself, and so a progress or slider track and a link's underline, does not step. It works in both themes and under a theme chosen with the toggle, and the contrast
  tests prove every text pair at 4.5:1 and every boundary at 3:1 in the mode.
- **Motion** comes from the duration and easing tokens. Entries ease out; exits run at
  0.75× with ease-in. A press is a colour step, and Button and IconButton also scale to .98
  (100ms, ease-out; none under reduced motion, never on rows, cards, menu items, command rows,
  the parts of a field or a disabled, loading or busy button). In popup rows (Menu, Select, Combobox,
  command menu) one plate glides between rows (`duration-base`, `ease-out`): it appears in place
  on entry, freezes and fades on leave, keys move it at once, and it is off on touch, under
  reduced motion and in forced colours. Nothing overshoots. Four kinds of thing loop, and nothing else: a mark that says work is running
  (the ring, braille, a busy Button's ring, a busy TextButton's underline, the indeterminate Progress bar, Sparkline's loading line, Skeleton's pulse and a written field's fill), a
  queued stage's mark (`StageMark`, opacity 0.65 to 1 on `duration-loop-fade`, never under 3:1, never a badge's ring), a page's one ambient loop, opacity only, in its art, and
  an animated diagram's live lines; `data-loops="held"` stops all four. One figure on a page's first screen may draw its marks once
  at load on a first visit (`duration-figure` 600ms, `duration-stagger` 22ms, at rest on a second visit and under reduced motion); a
  traveller between two resting places on screen uses `ease-in-out` (a leg of 300ms up to 150px, 2ms a pixel above, 600ms from 300px); a
  filtered or sorted list or grid moves what stays by transform and never replaces an item (past 48 items that would move, it lands at once); a number beside a figure never counts up. The hold or printing settles a running entrance at once, and a page change without a reload counts as a load.
  Under reduced motion, opacity only, and no loop runs. See `docs/motion.md`.
- **Versions and release notes:** a version is SemVer shown with its ship date ("Version 1.4.0 · Nov 23, 2026"), one link to the
  release notes (`VersionLink`): at the sidebar's foot under the account items, the number alone in the rail, the last row of More's
  sheet on a phone, after the legal line in a site's footer. Nothing marks a release as new, and there is no "What's new" item. A
  release is its number and date in one heading, a summary, "Action needed" (a warning callout, never folded), a paragraph for each
  audience it changes something for, then one line a change under Security, Deprecated, Removed, Added, Changed and Fixed, with counts
  computed from the list. A product's list is one fold holding its summary, "All changes", or "Other changes" when action entries
  stand above it, counted by what it opens; a package's is open, and only Fixed folds (past 3, in a release of more than 10). An
  entry's source line is the pull request and at most two tickets, a quiet text button that opens "Sources" (pull request, tickets,
  commit, and the author when the entry has one): beside the words from 640 of the release's own width, under them below it. On
  touch no 44px box reaches another target's box or crosses a rim, a divider or a clipping edge: an entry is `space-3` above and
  below, and a link with a source line under it stands `space-6` above it. The last change in Action needed or in a release has no
  padding under it, and its box reaches into the callout's or the release's own padding. A release's last line is `space-10` above
  its divider, whatever ends it. A change that has arrived keeps its padding. A release is `#v1.4.0`; an entry's id is permanent
  and holds no version. The entry or release a link opens is the stream's arrival (the plate and "Linked"). Build details is on
  the running release alone, from the running build. No area filter.
- **Density and touch:** compact moves controls one step down, with a floor of 24px. Touch
  targets stay at least 44px whatever the density, on touch and in any window under 720 whatever the pointer (16px text entry stays touch-only), except a chart's day, reached by drag and by the keys (the phase lane's marks keep 44px); a diagram's card that answers a tap is 44px tall. A toast's Dismiss and action keep their pointer size and take
  the 44px as hit area inside the toast's padding. A still table's selection column is 44 wide. Text entry is 16px on touch. A one-line notification entry is at least 44 tall on
  touch, and a `Link` on a line of its own has a 44px hit box with no change to layout, its words raised over a stacked neighbour's box; a link in a sentence keeps its line.
- **The phone and what is pinned:** while an on-screen keyboard is up (`data-screen-keyboard`) the tab bar and the phone's status bar are covered, and the
  foot, sheets, dialogs, the command menu and the toasts are laid out on what is seen. A page that pins more than the bar opts into measured sizes
  (`usePinnedEdges`, `data-pinned-edge`). `AppShell`'s `foot` holds still; a `Tray` docks the rows that wait on the reader (a sheet under 720). A toast whose
  only home is the page closes when the page changes; under 720 the toast stack hangs from the bar, `space-2` below it (DECISIONS 274).
- **Both themes, always.** Every visual change is previewed and contrast-tested in dark and
  light.
- **Styling comes from tokens.** No raw colours in component CSS. Lengths come from
  `--basalt-*` tokens; a raw length needs a lint exception that says why (see Checks).
- **Don't copy another system's values.** Vercel, Linear, GitHub Primer and the rest
  can be measured for reference and cited in the panel's reasoning. Their colours,
  sizes, CSS, icons and assets never land here as-is.
- **Icons:** the core set on the web (`@srasyndicate/basalt`, one module per glyph: 2.25 units
  on 24 at every size, an opening at rest that selected closes and fills (actions keep their drawing, except pause, whose bars fill
  when held), morphs only between rest
  and selected, within a rotation group, and the four drawn pairs), and Phosphor Bold at 16, 20
  and 24 for what the core set does not draw (a component never draws Phosphor's version of a core glyph: check, close, the
  chevrons, copy, plus, minus and search are the core's; the key glyphs ⌘ ⌥ ⌃ stay Phosphor's; glyphs are drawn at 16, 20 and 24,
  and at 12 only as a mark inside a box: a choice box's check or dash and a key chip's ⌘ ⌥ ⌃); Fill only on a selected glyph
  marked `fillSafe`. A glyph that swaps crossfades over `duration-fast`, with or without reduced motion. Danger is XCircle.
  Navigation glyphs in a sidebar or rail are primary at rest; every other icon is secondary at
  rest. Don't redraw a glyph in code: change `packages/react/glyphs/source.mjs` and run
  `node packages/react/glyphs/generate.mjs`. On Apple platforms, SF Symbols for system concepts
  (info, warning, error, success). Status icons pair with words. A stage's mark (`StageMark`) is seven shapes at 16, running the ring; its state's word is always said,
  and where it is drawn differs by part: foundations' table in "Stages and runs" is the rule.
- **Diagrams:** monochrome; one focal node, inverted. Three lines named by look (main 2px, plain 1px, dashed), and the key says what
  each means; a line's state (failing, degraded) is words, in its label or the key, never a kind, a mark or a colour. A stacked line that
  would pass a card is replanned into the end gutter; a stack that still overlaps is bare, and one line where its key sits points to the list. The drawn layout is used only when it fits (640, the track minimums, a clean seat for every label); otherwise stacked, in
  the author's order, at most 480 wide. One column is at most 480 wide, drawn or stacked (or its track's least width where that is more), on the start edge. Nothing is cut and nothing overlaps at any width. Ports, routes, groups and foreign keys are derived from one
  record each. A flowchart's shapes have a 3:1 contour. Tracing changes ink, never weight. The words are in the HTML before script.
  Still by default; `motion="animated"` adds an entrance on view (each line draws once, every word at rest, inside five seconds) and,
  where the data names them, a flow line (cuts, only while they move), a pulse (a bead) or a packet (a dot): one mover a figure, loops
  only in view, and "Pause animations" in the figure's foot. A reduced-motion or forced-colours figure is still. Measuring a figure again
  (the faces arriving, a resize) never restarts, hides or cuts short an entrance. An architecture card may carry its service's own mark,
  16px in the top end corner: the owner's file, never recoloured, a form for each ground, decoration beside the name, recorded in
  `packages/react/marks/manifest.json`; a service without one is its name alone. In print a mark prints, and so does the fill of a
  focal node that carries one (`print-color-adjust: exact`). A schema may state how many (crow's foot in the line's ink, on every key or none) and
  draws far keys along a corridor. A sequence may show a participant working (a bar) and frame a run of messages
  (`opt`, `loop`, `alt`: structure, never a panel, every word plated), and may be written as text art, which never hides a line and has no caret.
  Groups nest two deep; four end lanes at most. A deployment nests three, and an artifact is a row of its host that a line may land on.
  A state's label is the engine's (the event, then `[guard] / action`), guards on one event are numbered in the order tried, a start is a
  dot and a final state carries a ring. A timeline is one true scale: a card flies from a straight stem at its time, two lanes a side, or
  the figure is stacked with each gap in words; a break in the scale is the author's, with its length written. A dependency figure is an
  architecture whose counts, cycle and ranks the engine derives; a swimlane is a data flow, and a decision in it is the diamond with its
  step number. Every string an author writes keeps its own order right to left. Six planning types (DECISIONS 359): a gantt (square bars
  on one time scale; a bar is never widened, so under `space-2` the bars go and the words stay; no dependency lines, a row writes what it
  comes after), a kanban (a read-only count at one moment; over the limit is words, weight and a 2px rule), a journey (one actor, five
  named steps, one chart line, every stage writing its level), a service blueprint (three named rules in fixed gaps), a story map (a
  backbone, slices, one cut) and a schedule (the architecture router; the numbers are computed; a line is main only where its finish sets
  the next start on a critical path). A matrix's fit is measured on its content. An empty cell holds its track and says so. Stacked, a
  planning figure keeps every mark that fits, says the rest in words, and its key lists only what is drawn. A contour may say what a part
  is (critical, blocked), with its word; it is never a state. A card may be a link (the card is the stop; the arrow is the cue). A label breaks only where its
  author breaks it (a state's, after its event). Arrow keys are spatial, on tracks. On touch a tap traces and "Clear highlight" clears. The foot's order is fixed ("View as list",
  "Expand", the run button, "Pause animations", an app's `actions`, "Clear highlight") and it does not print; an app's actions are words-only secondary
  buttons, never a menu, and follow the figure into the viewer. In print a figure is untraced and light.
  Right to left mirrors the figure, not the words. Automatic layout asks elkjs for a column and a row and nothing else; Basalt routes, and a figure
  is never scaled. elkjs loads on demand or not at all: place at build time. "Expand" opens the viewer: the drawn layout in a dialog (full screen under
  720), laid out at 100% and zoomed by the reader with one transform, from Fit or 100% to 400%, in steps that land at once; it pans by scrolling; it
  is never a picture, a `viewBox` or CSS `zoom`; it is still, and it does not print.
- **Type:** Geist and Geist Mono at 400, 500 and 600 only, and a `Geist Fallback` face (local Arial, one face per weight) that reduces the shift when Geist
  arrives; it does not promise the same wrap at every width.
- **Display type:** two roles a page writes, hero (96/96; 72/76 from 720 to 1023; 44/48 under 720) and display (72/76; 56/60; 36/40), made of the fixed
  steps `text-6xl` and `text-7xl` and a phone value each. They step at 720 and 1024 on the viewport and never fluidly: no `clamp`, no viewport or container
  unit in type. A display headline is 600, `text-wrap: balance`, at most `size-display-measure` (13em), never a `<br>` (two sentences meant as two lines are
  two block spans), in the full row or a span of seven columns or more (`Columns` and `ColumnsItem` warn in development, and draw it as written); `overflow-wrap: break-word` is the net, never the plan. Docs and examples show the
  roles on a phone and never a fixed `6xl` or `7xl` there. The lead is `text-xl` from 720 and `text-lg` under it, 400 in secondary ink, `text-wrap: pretty`.
- **The page:** one row (`size-page-width`, the gutter inside, the header's), for a first screen too; sections one `--basalt-section-gap` apart (128 from
  1024, 96 from 720, 64 under it), the first half a gap below the bar, a head half a gap above its body, a gap above the footer; no section is given the
  window's height. The first line of the next section's headline shows on the first screen; that test yields when a reader enlarges text or spacing and is
  never met by shrinking type, clipping or fixing a height. `Columns` are twelve tracks (`2`, `3`, `4`, `7-5`, `5-7`, `8-4`, `4-8`, or an item's own span):
  from 720 to 1023 `4` is two rows of two and everything else stacks, an item's own span included (it holds from 1024 only); under 720 one column. Layout changes at 720 and 1024 only (a component answers its own container at 340, 480 and 640:
  `size-breakpoint-container-sm`, `size-breakpoint-container` and `size-breakpoint-container-lg`); 900 and 1280 are not adopted.

## Engineering rules

- **Base UI underneath, our styling on top.** Components wrap Base UI primitives and
  keep their accessibility behaviour. Styles live in `@layer basalt` so an app's own
  CSS wins.
- **No module-scope side effects in `packages/react/src`.** `dist` is one module per
  source file, and bundlers drop modules nothing imports, but only if loading a module
  does nothing. Build registries, sets and caches lazily, inside functions.
- **Heavy dependencies load on demand.** A component that needs a large library
  imports it dynamically, the way `CodeBlock` loads Shiki and each grammar.
- **Data is drawn as text, and a destination is checked** (the safe-sinks rule: decided by the owner, Fable, Astra and Muse, 23 Nov 2026). A value this repo's
  source did not write (a prop, an option, an entry, a file's contents, a URL) reaches the page as text (React children, `textContent`, or the escape inside a
  reviewed HTML builder: `_.esc` in the skill, `escapeHtml` in the package, double-quoted attributes only), as an attribute picked from a fixed list
  (`_.pick`), or as a destination that passed `safeHref` (relative, `http`, `https`, `mailto`, `tel`; it returns the string or `null`) before it is
  rendered, navigated to or handed to an event or callback. Markup, attribute names, CSS and script are never built from it. The HTML sinks (`innerHTML`,
  `outerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`, `srcdoc`, `document.write`) and an unchecked navigation are exceptions: in
  `tools/html-skill/src` each file's count is in `sinks.allowed.json` with what it takes and why it is safe (a file that takes data is in the hostile-input
  probe); anywhere else the comment just above says `sink: <where the value comes from>; <why it is safe>; <the test that proves it>` (`tools/review` may
  leave out the test). No `eval`, `new Function` or string timer outside tests. `postMessage` names its origin, never `"*"`, and a receiver checks
  `origin`. A link that opens a new tab carries `rel="noopener"`. A build script that reads a path from input checks the real path stays in its folder.
  Work sized by input has a bound. A composed page's body is the author's own code and is not linted; compose lists a `javascript:` link in it.
- **No third-party types in the public API.** Declare our own types for exported
  signatures, so an app's type-check never compiles a dependency's declarations.
- **New runtime dependencies need the owner's approval.** Add the package to
  `dependencies.allowed.json` in the same PR, with the reason; the lint fails until you do.
- **Tokens are generated.** Edit `packages/tokens/tokens/*.tokens.json`, then
  `npm run build`. Commit the regenerated `Sources/BasaltTokens/Tokens.swift`; CI fails
  if it drifts.
- **Swift builds on a Mac.** Where Swift is installed (Xcode or the Swift toolchain),
  `swift build` and `swift test` are the macOS CI job, and `npm run ci:local` runs them.
  Elsewhere the macOS CI job is the only check: push and read it before you call Swift work
  done.

## Writing words

Any agent that writes, edits or reviews words a visitor will read (the sites, the products, Basalt's own UI strings) reads
`.agent/skills/site-words/SKILL.md` first: the owner's rules for copy, the research behind them, and how a rewrite is approved. A changelog entry,
a release's summary or release notes also follows `.agent/skills/release-words/SKILL.md` (DECISIONS 320).

## Generating HTML

Any agent (Claude, Codex or another) that writes a standalone HTML page, report, mockup or
dashboard for this project reads `.agent/skills/basalt-html/SKILL.md` first, then loads each module it uses with
`node .agent/skills/basalt-html/compose.mjs --usage core NAME` (`--usage` alone prints the index). It never reads `parts/`:
it is minified output and costs context for nothing. Write the page's body (the HTML inside `<body>`) to a file, then run
`node .agent/skills/basalt-html/compose.mjs <body.html>`. The script builds the page: it adds the core CSS and script and
only the modules the body uses, Geist inlined, no CDN or framework. `SKILL.md` holds the rules every page needs and one
line per module, so an agent pays for the modules its page uses and no more. The sources are in
`tools/html-skill/` (its README says how to add a module); edit those and run `npm run build`, never the files in the
skill folder.

`sites/` holds one Blacksand page built with the HTML skill: `sites/README.md` says how it is laid out and built. The single-file, no-network rule is the HTML skill's own
(explanations, reports, mockups); how the real sites are built is not decided.

## Checks

| Command | What it checks | When |
|---|---|---|
| `npm run lint` | Token-only CSS (Stylelint), type-aware JS/TS/JSX correctness (Oxlint, the sink rules among it), the dependency allowlist, the sink check (`scripts/check-sinks.mjs`, read from the syntax tree), and the public-surface vocabulary. Takes seconds. | Before every commit. The pre-commit hook runs it for you. |
| `npm test` | The tokens' tests (contrast and the generated outputs), the React package's typecheck, build and browser tests (behaviour, accessibility with axe in both themes, bundle size and the size table, the browser floor), then the HTML skill's, the brand's and the sites' tests | Before every push |
| `npm run check` | Everything CI runs on Linux but the generated-Swift drift check (it compares with the commit, so `ci:local` runs it): lint, tests, reference previews, packed-package consumer | Before opening a PR |
| `npm run ci:local` | Both CI jobs, from `ci.yml`'s own steps: the Linux job above plus the generated-Swift drift check, then `swift build` and `swift test` | Before every merge while CI can't run (GitHub Actions minutes run out), on the PR's exact head and again after resolving conflicts. Post the result on the PR. |
| `npm run ci:local -- --fresh` | The same steps, from a new `git worktree` of the head with `npm ci`, removed afterwards | When a stale `node_modules` or an ignored folder in your checkout could be deciding the result. It checks the commit, not uncommitted changes. |

`ci:local` refuses to run when `ci.yml` has a step it doesn't, so the two stay in step. Without
Swift, `npm run ci:local -- --web-only` checks the web job alone; say on the PR that the Swift
package went unchecked. It prints the Node version it runs on beside the one `ci.yml` pins and warns
when their major versions differ: run it on the pinned major before relying on the result. It runs on macOS, not CI's Ubuntu runner, so text measured in a
behaviour test uses different fallback fonts: keep a test's margins clear of a font's width.

**One heavy run per Mac.** Other agents share this machine, and two suites at once slow each other
and break timed tests: the fast `ci:local` runs were the ones that ran alone. Before `npm test`,
`npm run check`, `npm run ci:local` or a browser benchmark, run
`pgrep -fl '[n]ode --test|[c]hrome-headless-shell|[s]wift-build'` (the brackets stop it matching its
own shell). If it lists anything, wait for it to end rather than start beside it. A timing taken while another run was going is not a measurement:
say so if you report one.

`npm run lint`, `npm test`, `npm run check` and `npm run ci:local` run every step and fail at the end, ending in one line a step (passed or failed, and for a failed
test step the files that failed), so one failing file does not hide the steps after it. The steps print in order, each under its own header: the first failing section
of the log is the first failure, and the summary marks it. `ci.yml`'s own steps are unchanged. Renders and browser tests launch Chromium through
`scripts/chromium-launch.mjs` (overlay scrollbars and full raster), so a docked laptop and an undocked one draw the same pixels. Five
tests that look at classic scrollbars (`tools/html-skill/test/parity-4.test.mjs` and `parity-8.test.mjs`, and
`packages/react/test/table-filter.test.mjs`, `stage-transcript.test.mjs` and `run-timeline.test.mjs`) launch with the module's `ignoreDefaultArgs` removed on purpose. The brand test
(`brand/test/brand.test.mjs`) launches Chromium without the module: nothing in `brand/` is edited alongside the tooling, so it has not been moved
to the module, and should be the next time `brand/` is changed.

`npm install` points git at `.githooks/`, so the pre-commit hook runs `npm run lint` on
every commit. Don't bypass it with `--no-verify`. If a lint rule is wrong, change it in
a PR that says why.

A lint exception is a comment on the line before, with a reason:
`/* stylelint-disable-next-line unit-disallowed-list -- reason */`.
A disable without a reason, or one that disables nothing, fails the lint. The lint bans raw colours (a colour function in any case), and the units
`px`, `rem`, `em`, `ch`, the viewport units, the absolute units and `s` and `ms`; a length inside an `@container` query is the rule
`basalt/container-length` (the exception names the token the number repeats, because a query cannot read a custom property).

Never skip, weaken or delete a test to get green. Fix the cause.

## Every round ships

1. A branch and a draft PR. The description says what the panel and the owner decided,
   with links, and anything that skipped review.
2. Tests for new behaviour, and `npm run check` passing.
3. A walkthrough and screenshots for the owner: `npm run review -- <round>` writes
   `basalt-round-<n>-walkthrough.html` and the screenshots zip under `.review/`. Look at
   your own screenshots first, at 2x in both themes and at 390px wide. Make sure the review
   page's own CSS can't override `@layer basalt`: a stray unlayered rule there once made
   correct breadcrumbs look broken.
4. After merge: republish the hosted reference (`tools/artifact/README.md`), unless the owner has paused it. He paused it on
   9 Nov 2026 ("dont need the hosted reference I don't think").
