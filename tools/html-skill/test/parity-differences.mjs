// Where the skill's components differ from their React counterparts, measured in Chromium by parity.test.mjs (both themes).
// This list may only shrink. A difference that is not here fails the test; an entry that no longer differs fails it too, so a
// fix removes its line in the same change. Every entry says why it differs and where the fix is tracked.
//
// Measured against: PR #26's tree (React and the skill as they are on the skill-v2 branch). A difference that #25, #27 or #28
// already changes in React is marked "pending", because those PRs move the React side and the entry is re-measured when they land.
// `react` and `skill` are the computed values; `themes` is both when it is left out.
//
// What matched (no entry): height, padding and radius of button (all variants and sizes, disabled), input, badge, kbd chip, table
// cell and container, tab, segment, callout, progress track and fill; font size and weight everywhere; every fill, text and border
// colour but the ones below; the focus ring of button, input, tab (but its offset) and segment; the status dot (size, radius, colours);
// the palette's input band, list, group label, rows (height, padding, radius, colour, fill, gap), chips and footer geometry.

const NO_PIXEL = "No pixel moves today (the control's height is fixed), so this is a latent difference: it shows as soon as a height is not fixed.";

export const DIFFERENCES = [
  { area: "input", pair: "text", prop: "lineHeight", react: "normal", skill: "20px", reason: `React's Input states no line height and inherits the control's default; the skill pins text-base's 20px. ${NO_PIXEL}`, source: "new finding (not in the audit); next: align when React states one" },
  { area: "input", pair: "textarea", prop: "minHeight", react: "56px", skill: "96px", reason: "React's Textarea is two lines plus 16px; the skill's is three controls tall.", source: "audit C4 (S1); decided, shipped in React" },
  { area: "tabs", pair: "selected tab", prop: "lineHeight", react: "normal", skill: "13px", reason: `React's Tab states no line height; the skill's tab pins it to 1. ${NO_PIXEL}`, source: "new finding (not in the audit)" },
  { area: "tabs", pair: "other tab", prop: "lineHeight", react: "normal", skill: "13px", reason: `As the selected tab. ${NO_PIXEL}`, source: "new finding (not in the audit)" },
  { area: "tabs", pair: "panel", prop: "paddingTop", react: "0px", skill: "16px", reason: "The skill's .tabpanel adds 16px above its content; React's TabsPanel adds none and leaves the space to the page.", source: "new finding; needs a ruling on which is right (design)" },
  { area: "tabs", pair: "focus ring", prop: "outlineOffset", react: "2px", skill: "-2px", reason: "The skill draws a tab's ring inset on purpose, because its tab row scrolls and a ring outside it would be clipped on three sides; React's row doesn't clip.", source: "new finding; related to audit B1's inset outline and question 4 (focus cue); needs a ruling" },
  { area: "segment", pair: "pressed", prop: "lineHeight", react: "normal", skill: "13px", reason: `React's Segment states no line height; the skill pins it to 1. ${NO_PIXEL}`, source: "new finding (not in the audit)" },
  { area: "segment", pair: "rest", prop: "lineHeight", react: "normal", skill: "13px", reason: `As the pressed segment. ${NO_PIXEL}`, source: "new finding (not in the audit)" },
  { area: "spinner", pair: "ring", prop: "width", react: "16px", skill: "14px", reason: "The skill's ring is 1em, so it is 14px at the base text size and follows the text it sits in; React's default is a fixed 16px.", source: "new finding (not in the audit); needs a ruling on the ring's size" },
  { area: "spinner", pair: "ring", prop: "height", react: "16px", skill: "14px", reason: "As the width.", source: "new finding (not in the audit)" },
  { area: "spinner", pair: "ring", prop: "color", themes: ["dark"], react: "oklch(0.709 0 0)", skill: "oklch(0.9461 0 0)", reason: "React's Spinner is text-secondary; the skill's ring takes the ink around it (currentColor), which is primary in a paragraph.", source: "new finding (not in the audit); needs a ruling" },
  { area: "spinner", pair: "ring", prop: "color", themes: ["light"], react: "oklch(0.4202 0 0)", skill: "oklch(0.2046 0 0)", reason: "As dark: secondary against the ink around it.", source: "new finding (not in the audit)" },
  { area: "palette", pair: "input band", prop: "gap", react: "8px", skill: "12px", reason: "The gap between the band's search icon and its text: 8px in React's command menu, 12px in the skill's palette.", source: "audit B7 (palette geometry follows the CommandMenu; S4, after #27); re-measure when #27 lands" },
  { area: "palette", pair: "input", prop: "lineHeight", react: "16px", skill: "24px", reason: `React's command input is one line at 16px; the skill's is text-md's 24px. ${NO_PIXEL}`, source: "new finding (not in the audit)" },
  { area: "palette", pair: "row at rest", prop: "lineHeight", react: "20px", skill: "18px", reason: `React's menu item states no line height and inherits the page's 20px; the skill's row pins text-sm's 18px. ${NO_PIXEL}`, source: "new finding (not in the audit); touched by audit B1 to B3 rows (S4, after #27)" },
  { area: "palette", pair: "active row", prop: "lineHeight", react: "20px", skill: "18px", reason: "As the row at rest.", source: "new finding (not in the audit); touched by audit B1 to B3 rows (S4, after #27)" },
  { area: "palette", pair: "footer", prop: "lineHeight", react: "20px", skill: "16px", reason: `React's footer inherits the page's 20px; the skill's pins text-xs's 16px. ${NO_PIXEL}`, source: "new finding (not in the audit)" },
];
