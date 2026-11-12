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

export const DIFFERENCES = [
  { area: "tabs", pair: "focus ring", prop: "outlineOffset", react: "2px", skill: "-2px", reason: "The skill draws a tab's ring inset on purpose, because its tab row scrolls and a ring outside it would be clipped on three sides; React's row doesn't clip.", source: "RULED (council, DECISIONS 69, 2-2 so the tie keeps what is built): React keeps +2 and the skill's scrolling row keeps -2. Not a gap to close; stays listed so the test sees it." },
  { area: "sheet top, the band's close", pair: "close glyph, the morph's structure", prop: "pathCount", react: "2", skill: "1", reason: "The narrow menu draws Menu in its band's button and morphs it to Close (React's MorphIcon, over duration-slow on ease-out). The skill draws the same core glyphs (the Menu and Close of packages/react/glyphs/source.mjs, read at build time: same strokes, same 2.25 round stroke, same box) but carries no MorphIcon, which would put a morph engine on every page that has a sheet, so it swaps the glyph at once. MorphIcon draws each stroke as its own path so one can move into another; the skill draws a glyph as one path. Only the morph differs.", source: "RECORDED (council, DECISIONS 108, opus): the Menu-to-Close morph is a recorded parity difference, the skill swapping the glyph." },
];
