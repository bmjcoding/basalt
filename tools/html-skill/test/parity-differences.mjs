// Where the skill's components differ from their React counterparts, measured in Chromium by parity.test.mjs (both themes).
// This list may only shrink. A difference that is not here fails the test; an entry that no longer differs fails it too, so a
// fix removes its line in the same change. Every entry says why it differs and where the fix is tracked.
//
// Measured first against PR #26's tree, then re-measured on main after #25, #27 and #28 merged (their entries are the ones the second parity
// PR closed). `react` and `skill` are the computed values; `themes` is both when it is left out.
//
// What matched (no entry): height, padding and radius of button (all variants and sizes, disabled), input, badge, kbd chip, table
// cell and container, tab, segment, callout, progress track and fill; font size and weight everywhere; every fill, text and border
// colour but the ones below; the focus ring of button, input, tab (but its offset) and segment; the status dot (size, radius, colours);
// the palette's input band, list, group label, rows (height, padding, radius, colour, fill, gap), chips and footer geometry.
//
// Closed in the first parity PR (skill-parity-1): the textarea's minimum height (56px), the tab panel's top padding (0), the ring
// spinner (a fixed 16px in secondary ink), and every latent line height (input, tab, segment, the palette's input, row and footer: set
// to React's computed values; no rendered pixel moved, proven by comparing the pages before and after).
//
// Closed in the second parity PR (skill-parity-2), 31 entries: the palette's level (the dialog at level 1 and its input band at level 2, with the
// band's ink tertiary), its list padding (2 and 4), its group label (tertiary, React's padding), and its rows (a 44px row with a 40px plate in it,
// 14px, secondary ink at rest, 12px padding and gap, no radius on the row, the plate on its ::before); and the segment's dark pill (#27's one solid
// fill), now the shared sliding pill. Added to the comparison with no difference: the lit row's plate, the glide's shared plate, and the segment's
// shared pill (size and fill) and its pressed button (transparent while the pill is drawn).

// Recorded in the fourth parity PR (skill-parity-4, the overlay layer): the site header's Menu-to-Close morph, one entry. Every other part of the overlay layer
// (Dialog, AlertDialog, Sheet on every side, Popover, Menu with its radio and checkbox items and two-line rows, Tooltip, Toast and the notification centre) was
// added to the comparison with no difference.

// Fifth parity PR (skill-parity-5, the figures): the description list, the meter (in and over its cap), the stat with its source line, the terminal (static and replay, wide and
// narrow) and the time chart (bars and lines) were added to the comparison with no difference. Not compared by computed style: the meter's hidden width reserve (the skill's
// reading is not rewritten by a script), and the chart's glide on a change of data (the skill draws once; a new data set is a new call).

// Seventh parity PR (skill-parity-7, navigation and layout): the site header (the bar, its brand and ring, the links with their words, the pill, the shared pill and its glide, the action,
// the toggle and the Menu button), the narrow menu open (the top sheet, its band redrawn, Close on the Menu button's box and in focus, the rows with no glyph, the foot and the scrim), the app shell
// (the sidebar, its brand band, Nav's rows, glyphs at rest and selected, the count and the group label, the account, the header and its bar, the title, the actions and the main), the rail,
// and the phone tab bar with its More sheet were added to the comparison with no difference. It closed the one entry step 2 recorded, the narrow menu's Close drawn as one path where
// React's MorphIcon draws one for each stroke: the glyph module draws a core glyph from the same slots, one path for each. What stays a difference in words, because computed style cannot
// see it: the Menu-to-Close morph's motion. React morphs the button's glyph over duration-slow on ease-out as the menu opens; the skill swaps Menu for Close at once.

// Sixth parity PR (skill-parity-6, forms and selection): the checkbox (off, on, mixed, disabled, with its label, in focus), the radio and its group, the switch (track,
// thumb, travel), the select's closed trigger (every size, the placeholder, disabled), the choice card (radio and checkbox, selected, disabled, in focus), the pressed
// toggle (secondary and ghost, with its check seat) and the table's checkbox column and selected row were added to the comparison with no difference. The select's open
// list (Chromium's styled popup: its box, its rows and their plate, the two-line row, the check seat) is compared too, with one recorded difference below. Not measurable here,
// so recorded in words: outside Chromium (where `appearance: base-select` is not shipped) the browser opens its own list and a described option reads as its label and
// description run together; the closed select still matches. Not compared: the popup's place (a pseudo-element has no rectangle) and the density steps (the skill has none).

// Eighth parity PR (skill-parity-8, tables and filters): the still table (its header cells, the sort button, seat and arrows in every state, row headers, "Not observed", the selected row, the empty row, compact
// density and the scroll hint), the pinned columns at 390 (position, fill, the divider, the scroll padding, with the table scrolled), the multi-select filter (the head, the count that reserves its widest form, Clear
// at zero, a chip off, on, disabled, hovered, pressed and in focus, the plus and the check, on desktop and touch), the checklist (the trigger, the popup, its rows, the box, the foot, the lit row and the shared plate;
// with the search band from ten values, on desktop and touch) and the result line were added to the comparison with no difference. Not compared by computed style: the pinned cell's wash, which React draws as a flat
// gradient image on the cell and the skill as the cell's ::before (a source stylesheet draws no gradient): parity-8.test.mjs reads the pixels of both and allows one level of 255 in rounding.

// Ninth parity PR (skill-parity-9, commands): the command list in the page (the panel, the 48px band with its trailing slot, the held list, the group headings, one- and two-line rows with their glyph, label, description and chip, the lit row
// and the shared plate in use, the foot with the count and the key legend, the no-match state), list plus preview (the split at 1440, a push just under it, the push at 390 with its Back band and the pane after a press) and the palette's
// two-line row were added to the comparison with no difference. Not compared by computed style: the pane's own content (the app's), the hidden words React's Kbd adds for a screen reader inside an aria-hidden legend, and cmdk's ranking of
// matches (the skill filters and keeps the order; see the PR).

// Tenth parity PR (skill-parity-10, art): the stage (the pull-up, the headroom, the art layer, paired art in both themes, the bar over it), a frame in every aspect (its rim on every side, radius, box, the picture, the caption, the credit),
// a frame in a card, a failed frame (the alt text, the decorative frame with nothing) and a frame while it loads were added to the comparison with no difference; the callout's parity case gained success, warning and danger, with every border
// side compared at the page's level, in a card and in a card in a card (DECISIONS 82's status rim), again with no difference. What stays a difference in words, because it is left unbuilt and not a computed value the skill draws differently:
// React's site header clears (no fill, no blur, a transparent line) at the top of the page over a stage that declared its headroom passed (`headroom`, proven by checkHeadroom, a test helper); the skill has no run to prove it and
// declares none, so its bar is the smoked bar from the first pixel over every stage (DECISIONS 108's note). The cases above compare React's stage without the declaration, the state the skill has.

// Eleventh parity PR (skill-parity-11, the rest of the overlays): the combobox (the field, its placeholder, the caret button, a chosen value, the focus ring; the open popup with its box, rows, check seat, the chosen row's check,
// the two-line row and its description, the lit row, the shared plate, the disabled row and the empty sentence; and the same on touch) and the sparkline (the head, label and value with its box for each character, the image, the line's
// points and stroke, the axis, the empty sentence, the loading line and its breathing) were added to the comparison with no difference. Not compared by computed style: React's popup is the Positioner's child and the skill's popup is
// the fixed element itself (so `position` is not read, as the menu's is not); the sparkline's digits ease and roll in React when the data changes (the skill draws once, and again on a new call); and React's value strip of ten
// digits behind each digit box (the skill draws the digit that shows).

// Twelfth parity PR (the motion rules, DECISIONS 136 and 139): the loops toggle's icon form (rest, pressed and in focus), an ambient mark (its box, colour and loop timing) and the chart's entrance (the
// same marks, count, duration, delays and fill) were added to the comparison with no difference (parity-12.test.mjs). What stays a difference in words, because computed style cannot see it: (the skill's chart now glides every mark from where it is drawn when its data changes
// in the middle of its entrance, as React's does: DECISIONS 143, item 8, compared in parity-12.test.mjs; outside an entrance it still draws a new data set at once, as it never glided). The skill's narrow menu now has the pause row too (DECISIONS 148, item 2: its place, box, words and pressed state, compared in parity-12.test.mjs). And React's
// Reflow (items that move to their places), LoopsToggle's Button and Switch forms and its tooltip, and the travel helper have no counterpart in the skill: a skill page has no list that a filter or a sort
// rewrites except a table (which keeps the still-table rule), its Button form is the existing pressed toggle with `data-loops-toggle`, and travel is timing a page's own script writes.

export const DIFFERENCES = [
  { area: "select popup", pair: "popup", prop: "transformOrigin", react: "160px -6px", skill: "160px 72px", reason: "React's Select popup grows from .98 at the point on the trigger's edge it opened from (Base UI writes --transform-origin from the popup's placement, here the trigger's bottom edge, 6px above the popup). The skill's native popup is a pseudo-element of the select, and CSS can't read where the browser placed it against its anchor, so it scales from its own centre. Same scale, duration and easing (compared above); only the origin differs, which is visible as a slight drift over 200ms.", source: "RECORDED (the lead, on the build's open item 3): keep the centre origin and record why; CSS cannot follow the anchor's placement." },
  { area: "select popup", pair: "lit plate", prop: "backgroundColor", react: "rgba(0, 0, 0, 0)", skill: "color(srgb 0.150612 0.150647 0.150651)", themes: ["dark"], reason: "React's Select glides one shared plate between its rows (Base UI's highlight, the glide plate), so each row's own plate stays transparent while the glide plate paints; the skill's native popup cannot draw a shared plate, so each row paints its own, the menu's fallback. The look is the same: the glide plate's fill is compared with the skill row's plate in the line below the list, with no difference.", source: "RECORDED (council, DECISIONS 56, the native popup where base-select is shipped; DECISIONS 108): no glide in the select's list." },
  { area: "select popup", pair: "lit plate", prop: "backgroundColor", react: "rgba(0, 0, 0, 0)", skill: "oklch(0 0 0 / 0.07)", themes: ["light"], reason: "React's Select glides one shared plate between its rows (Base UI's highlight, the glide plate), so each row's own plate stays transparent while the glide plate paints; the skill's native popup cannot draw a shared plate, so each row paints its own, the menu's fallback. The look is the same: the glide plate's fill is compared with the skill row's plate in the line below the list, with no difference.", source: "RECORDED (council, DECISIONS 56, the native popup where base-select is shipped; DECISIONS 108): no glide in the select's list." },
  { area: "tabs", pair: "focus ring", prop: "outlineOffset", react: "2px", skill: "-2px", reason: "The skill draws a tab's ring inset on purpose, because its tab row scrolls and a ring outside it would be clipped on three sides; React's row doesn't clip.", source: "RULED (council, DECISIONS 69, 2-2 so the tie keeps what is built): React keeps +2 and the skill's scrolling row keeps -2. Not a gap to close; stays listed so the test sees it." },
];

// Thirteenth parity PR (the site parts, DECISIONS 146): the site footer (its box, divider, labels, links, pill, hang and base, at 1440, 900 and 390, with the disclosures), the theme choice
// (the track, the words and the chosen pill, system and chosen, with the head attribute alone drawing the word), the lockup by pixel density, a bar that arrives (the phases, the forms and
// the jumps) and drawn art's fit and anchor were added to the comparison with no difference. Recorded in words, because computed style cannot see them: React builds the footer's groups and
// the pill link from props and the skill from its markup and a script (so the pill is `a::before` in the skill and a span in React: the same rectangle); the disclosure's chevron rotates over
// duration-slow in both; the skill's shared glide on the footer's links needs the glide module, which `topbar-nav` brings (a page with a footer and no bar links has each link's own pill).
