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

export const DIFFERENCES = [
  { area: "tabs", pair: "focus ring", prop: "outlineOffset", react: "2px", skill: "-2px", reason: "The skill draws a tab's ring inset on purpose, because its tab row scrolls and a ring outside it would be clipped on three sides; React's row doesn't clip.", source: "RULED (council, DECISIONS 69, 2-2 so the tie keeps what is built): React keeps +2 and the skill's scrolling row keeps -2. Not a gap to close; stays listed so the test sees it." },
];
