// Parity: each skill component rendered beside its React counterpart in Chromium, in both themes, and their key computed styles compared:
// height, padding, radius; font size, weight and line height; text, fill and border colours; the focus outline.
//
// Every difference that exists today is written down in parity-differences.mjs with its reason and its source. The list may only
// shrink: this test fails on a difference that is not in it (a new drift), and on an entry that no longer differs (delete it:
// the gap is closed). Run with PARITY_REPORT=1 to print the differences found, in the list's own format.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import { compose } from "../../../.agent/skills/basalt-html/compose.mjs";
import { fixturePage, launch as launchReact, settle } from "../../../packages/react/test/support.mjs";
import { DIFFERENCES } from "./parity-differences.mjs";
import { openHtml } from "./support.mjs";

const THEMES = ["dark", "light"];
const GEOMETRY = ["boxHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopLeftRadius"];
const TYPE = ["fontSize", "fontWeight", "lineHeight", "letterSpacing"];
const COLOUR = ["color", "backgroundColor", "borderTopColor", "borderTopWidth", "boxShadow"];
const BOX = [...GEOMETRY, ...TYPE, ...COLOUR];
// Every status a Badge can say, and what a status dot is drawn as (React's .basalt-badge-dot, the skill's ::before).
const STATUSES = ["neutral", "success", "warning", "danger", "accent", "pending"];
const DOT = ["boxWidth", "boxHeight", "backgroundColor", "borderTopLeftRadius", "borderTopWidth", "borderTopStyle", "borderTopColor", "boxSizing", "marginLeft", "marginRight"];
const OUTLINE = ["outlineStyle", "outlineWidth", "outlineColor", "outlineOffset"];

/**
 * The components. (React's Textarea draws four rows unless told otherwise; a bare <textarea> is two, so the React one is given rows={2} and
 * the two compare like for like: both are two lines plus 16px, 56px.) `react` is JSX and `skill` the matching markup, each in its own section; a pair names an element in each, by a selector
 * inside the section, and the properties to compare. `focus` focuses the element first (the focus ring). `pseudo` reads ::before and the like.
 */
const CASES = [
  {
    id: "button",
    react: `<><Button>Label</Button><Button variant="primary">Label</Button><Button variant="ghost">Label</Button><Button variant="danger">Label</Button><Button size="sm">Label</Button><Button size="lg">Label</Button><Button disabled>Label</Button><Button variant="primary" disabled>Label</Button></>`,
    skill: `<button class="btn">Label</button><button class="btn" data-variant="primary">Label</button><button class="btn" data-variant="ghost">Label</button><button class="btn" data-variant="danger">Label</button><button class="btn" data-size="sm">Label</button><button class="btn" data-size="lg">Label</button><button class="btn" disabled>Label</button><button class="btn" data-variant="primary" disabled>Label</button>`,
    pairs: [
      ["secondary", ".basalt-button[data-variant=secondary][data-size=md]", ".btn:not([data-variant]):not([data-size]):not([disabled])", BOX],
      ["primary", ".basalt-button[data-variant=primary]:not([disabled])", ".btn[data-variant=primary]:not([disabled])", BOX],
      ["ghost", ".basalt-button[data-variant=ghost]", ".btn[data-variant=ghost]", BOX],
      ["danger", ".basalt-button[data-variant=danger]", ".btn[data-variant=danger]", BOX],
      ["small", ".basalt-button[data-size=sm]", ".btn[data-size=sm]", BOX],
      ["large", ".basalt-button[data-size=lg]", ".btn[data-size=lg]", BOX],
      ["disabled", ".basalt-button[data-variant=secondary][disabled]", ".btn:not([data-variant])[disabled]", [...COLOUR, "opacity"]],
      ["primary disabled", ".basalt-button[data-variant=primary][disabled]", ".btn[data-variant=primary][disabled]", [...COLOUR, "opacity"]],
      ["focus ring", ".basalt-button[data-variant=secondary][data-size=md]", ".btn:not([data-variant]):not([data-size]):not([disabled])", OUTLINE, { focus: true }],
    ],
  },
  {
    id: "input",
    react: `<><Input aria-label="Name" defaultValue="Value" /><Input aria-label="Placeholder" placeholder="Type here" /><Field label="Invalid" invalid error="An error"><Input defaultValue="Bad" /></Field><Input aria-label="Disabled" disabled defaultValue="Off" /><Textarea aria-label="Notes" defaultValue="Some text" rows={2} /></>`,
    skill: `<input class="input" aria-label="Name" value="Value"><input class="input" aria-label="Placeholder" placeholder="Type here"><input class="input" aria-label="Invalid" aria-invalid="true" value="Bad"><input class="input" aria-label="Disabled" disabled value="Off"><textarea class="input" aria-label="Notes">Some text</textarea>`,
    pairs: [
      ["text", "input[aria-label=Name]", "input[aria-label=Name]", [...BOX, "outlineStyle"]],
      ["placeholder", "input[aria-label=Placeholder]", "input[aria-label=Placeholder]", ["color", "opacity"], { pseudo: "::placeholder" }],
      ["invalid", "input[data-invalid]", "input[aria-label=Invalid]", COLOUR],
      ["disabled", "input[aria-label=Disabled]", "input[aria-label=Disabled]", COLOUR],
      ["textarea", "textarea", "textarea", [...BOX, "minHeight"]],
      ["focus ring", "input[aria-label=Name]", "input[aria-label=Name]", [...OUTLINE, "boxShadow"], { focus: true }],
    ],
  },
  {
    // The outline badge in every status (a count with none, neutral asked for by name, the four colours of a dot, and pending's ring).
    id: "badge",
    react: `<><Badge>Plain</Badge><Badge status="neutral">Idle</Badge><Badge status="success">Healthy</Badge><Badge status="warning">Watching</Badge><Badge status="danger">Failing</Badge><Badge status="accent">Needs you</Badge><Badge status="pending">In review</Badge></>`,
    skill: `<span class="badge">Plain</span><span class="badge" data-status="neutral">Idle</span><span class="badge" data-status="success">Healthy</span><span class="badge" data-status="warning">Watching</span><span class="badge" data-status="danger">Failing</span><span class="badge" data-status="accent">Needs you</span><span class="badge" data-status="pending">In review</span>`,
    pairs: [
      ["plain", ".basalt-badge:not([data-status])", ".badge:not([data-status])", [...BOX, "gap", "whiteSpace", "boxSizing", "verticalAlign"]],
      ...STATUSES.flatMap((status) => [
        [`${status}`, `.basalt-badge[data-status=${status}]`, `.badge[data-status=${status}]`, [...BOX, "gap", "boxSizing", "boxWidth"]],
        [`${status} dot`, `.basalt-badge[data-status=${status}] .basalt-badge-dot`, `.badge[data-status=${status}]`, DOT, { skillPseudo: "::before" }],
      ]),
    ],
  },
  {
    // The skill's .status is the plain Badge: a dot or ring and the word, no box. React's plain Badge is the reference, in every status.
    id: "status",
    react: `<><Badge variant="plain">Count</Badge><Badge variant="plain" status="neutral">Idle</Badge><Badge variant="plain" status="success">Done</Badge><Badge variant="plain" status="warning">Slow</Badge><Badge variant="plain" status="danger">Down</Badge><Badge variant="plain" status="accent">Needs you</Badge><Badge variant="plain" status="pending">Queued</Badge><Badge variant="plain"><Spinner variant="braille" />Running</Badge></>`,
    skill: `<span class="status">Count</span><span class="status" data-status="neutral">Idle</span><span class="status" data-status="success">Done</span><span class="status" data-status="warning">Slow</span><span class="status" data-status="danger">Down</span><span class="status" data-status="accent">Needs you</span><span class="status" data-status="pending">Queued</span><span class="status"><braille-spinner></braille-spinner>Running</span>`,
    pairs: [
      ["count", ".basalt-badge:not([data-status]):not(:has(.basalt-spinner))", ".status:not([data-status]):not(:has(braille-spinner))", [...GEOMETRY, ...TYPE, ...COLOUR, "gap", "alignItems", "display", "whiteSpace", "verticalAlign"]],
      ["running", ".basalt-badge:has(.basalt-spinner)", ".status:has(braille-spinner)", [...GEOMETRY, ...TYPE, ...COLOUR, "gap", "alignItems", "display", "whiteSpace", "verticalAlign", "boxWidth"]],
      ...STATUSES.flatMap((status) => [
        [`${status}`, `.basalt-badge[data-status=${status}]`, `.status[data-status=${status}]`, [...GEOMETRY, ...TYPE, ...COLOUR, "gap", "alignItems", "display", "whiteSpace", "verticalAlign", "boxWidth"]],
        [`${status} dot`, `.basalt-badge[data-status=${status}] .basalt-badge-dot`, `.status[data-status=${status}]`, DOT, { skillPseudo: "::before" }],
      ]),
    ],
  },
  {
    id: "table",
    react: `<TableContainer><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead numeric>Count</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>First</TableCell><TableCell numeric>12</TableCell></TableRow><TableRow><TableCell>Second</TableCell><TableCell numeric>345</TableCell></TableRow></TableBody></Table></TableContainer>`,
    skill: `<div class="panel table-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col" data-numeric>Count</th></tr></thead><tbody><tr><td>First</td><td data-numeric>12</td></tr><tr><td>Second</td><td data-numeric>345</td></tr></tbody></table></div>`,
    pairs: [
      ["container", ".basalt-table-container", ".table-wrap", ["backgroundColor", "borderTopLeftRadius", "borderTopColor", "borderTopWidth", "borderLeftColor", "overflowX", "boxShadow"]],
      ["table", "table", "table", ["fontSize", "lineHeight", "fontWeight", "borderCollapse", "width"]],
      ["header cell", "th:first-child", "th:first-child", [...BOX, "textAlign", "whiteSpace"]],
      ["numeric header", "th[data-numeric]", "th[data-numeric]", ["textAlign", "fontVariantNumeric"]],
      ["body cell", "tbody td:first-child", "tbody td:first-child", [...BOX, "verticalAlign"]],
      ["numeric cell", "td[data-numeric]", "td[data-numeric]", ["textAlign", "fontVariantNumeric", "paddingRight"]],
      ["row", "tbody tr", "tbody tr", ["boxHeight", "backgroundColor"]],
    ],
  },
  {
    id: "tabs",
    react: `<Tabs defaultValue="a"><TabsList aria-label="Views"><Tab value="a">One</Tab><Tab value="b">Two</Tab></TabsList><TabsPanel value="a">Panel</TabsPanel></Tabs>`,
    skill: `<div data-tabs><div class="tabs" role="tablist" aria-label="Views"><button class="tab" role="tab" id="t1" aria-controls="p1" aria-selected="true">One</button><button class="tab" role="tab" id="t2" aria-controls="p2" aria-selected="false">Two</button></div><div class="tabpanel" id="p1" role="tabpanel" aria-labelledby="t1">Panel</div><div class="tabpanel" id="p2" role="tabpanel" aria-labelledby="t2" hidden>Other</div></div>`,
    pairs: [
      ["list", ".basalt-tabs-list", ".tabs", ["boxHeight", "gap", "boxShadow", "borderBottomWidth", "display"]],
      ["selected tab", ".basalt-tab[aria-selected=true]", ".tab[aria-selected=true]", BOX],
      ["other tab", ".basalt-tab[aria-selected=false]", ".tab[aria-selected=false]", BOX],
      ["panel", ".basalt-tabs-panel", ".tabpanel:not([hidden])", ["paddingTop", "paddingLeft"]],
      ["focus ring", ".basalt-tab[aria-selected=true]", ".tab[aria-selected=true]", OUTLINE, { focus: true }],
    ],
  },
  {
    id: "segment",
    react: `<SegmentedControl aria-label="Range" defaultValue="a"><Segment value="a">Day</Segment><Segment value="b">Week</Segment></SegmentedControl>`,
    skill: `<div class="segment" role="group" aria-label="Range"><button type="button" aria-pressed="true">Day</button><button type="button" aria-pressed="false">Week</button></div>`,
    pairs: [
      ["track", ".basalt-segmented", ".segment", ["boxHeight", "paddingTop", "paddingLeft", "borderTopLeftRadius", "backgroundColor", "gap", "display"]],
      // The pressed segment's own box, type and ink. Its fill is compared on its own below, because both paint it with the shared
      // sliding pill (.basalt-pill, .pill) wherever the pill is drawn, and on the button itself only where it is not (reduced motion,
      // forced colours, no script: tested in parity-2.test.mjs).
      ["pressed", ".basalt-segment[aria-pressed=true]", ".segment button[aria-pressed=true]", [...GEOMETRY, ...TYPE, "color", "borderTopColor", "borderTopWidth"]],
      ["pressed fill", ".basalt-segmented[data-slide] > .basalt-pill", ".segment[data-slide] > .pill", ["backgroundColor", "boxShadow", "borderTopLeftRadius", "boxHeight", "boxWidth"]],
      ["pressed, with the shared pill", ".basalt-segment[aria-pressed=true]", ".segment button[aria-pressed=true]", ["backgroundColor", "boxShadow"]],
      ["rest", ".basalt-segment[aria-pressed=false]", ".segment button[aria-pressed=false]", BOX],
      ["focus ring", ".basalt-segment[aria-pressed=true]", ".segment button[aria-pressed=true]", OUTLINE, { focus: true }],
    ],
  },
  {
    id: "kbd",
    react: `<><Kbd>K</Kbd><Kbd>Esc</Kbd></>`,
    skill: `<kbd class="kbd">K</kbd><kbd class="kbd">Esc</kbd>`,
    pairs: [
      ["chip", ".basalt-kbd-key", ".kbd", [...GEOMETRY, "boxWidth", ...TYPE, "color", "backgroundColor", "borderTopWidth", "boxShadow", "fontFamily"]],
    ],
  },
  {
    id: "callout",
    react: `<><Callout status="info" title="Note">Body text</Callout><Callout status="danger" title="Failed">Body text</Callout></>`,
    skill: `<div class="callout" data-status="info"><svg class="icon" width="16" height="16" viewBox="0 0 256 256"></svg><div><div class="callout-title">Note</div><div class="callout-body">Body text</div></div></div><div class="callout" data-status="danger"><svg class="icon" width="16" height="16" viewBox="0 0 256 256"></svg><div><div class="callout-title">Failed</div><div class="callout-body">Body text</div></div></div>`,
    pairs: [
      ["panel", ".basalt-callout[data-status=info]", ".callout[data-status=info]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "borderTopColor", "borderTopWidth", "gap", "boxShadow"]],
      ["info icon", ".basalt-callout[data-status=info] > svg", ".callout[data-status=info] > svg", ["color", "boxWidth", "marginTop"]],
      ["danger icon", ".basalt-callout[data-status=danger] > svg", ".callout[data-status=danger] > svg", ["color"]],
      ["danger title", ".basalt-callout[data-status=danger] .basalt-callout-title", ".callout[data-status=danger] .callout-title", ["color", "fontWeight"]],
      ["title", ".basalt-callout[data-status=info] .basalt-callout-title", ".callout[data-status=info] .callout-title", ["color", "fontWeight", "fontSize"]],
      ["body text", ".basalt-callout[data-status=info] .basalt-callout-text", ".callout[data-status=info] .callout-body", ["color", "fontSize", "fontWeight", "marginTop"]],
    ],
  },
  {
    id: "spinner",
    react: `<Spinner />`,
    skill: `<span class="spinner" role="status" aria-label="Loading"></span>`,
    pairs: [["ring", ".basalt-spinner", ".spinner", ["width", "height", "color"]]],
  },
  {
    // The number field: React's one bordered group, [-] value [+]. The skill's script adds the two steppers.
    id: "number",
    react: `<NumberField aria-label="Count" defaultValue={3} />`,
    skill: `<div><span class="number-field"><input class="input num" aria-label="Count" type="number" value="3"></span></div>`,
    pairs: [
      ["group", ".basalt-number-group", ".number-field", ["boxHeight", "boxWidth", "borderTopLeftRadius", "backgroundColor", "boxShadow", "display"]],
      ["value", ".basalt-number-input", ".number-field > .input", [...GEOMETRY, "boxWidth", ...TYPE, "color", "backgroundColor", "boxShadow", "textAlign", "fontVariantNumeric"]],
      ["decrease", ".basalt-number-group .basalt-button:first-child", ".number-field > .btn:first-child", [...GEOMETRY, "boxWidth", "color", "backgroundColor", "boxShadow", "borderTopLeftRadius"]],
      ["increase", ".basalt-number-group .basalt-button:last-child", ".number-field > .btn:last-child", ["boxWidth", "boxHeight", "color", "backgroundColor"]],
    ],
  },
  {
    // The accent dot, and the ink dot where no class is set; the word stays ink.
    id: "accent",
    react: `<div data-accent="cobalt"><Badge status="accent">Needs you</Badge></div><Badge status="accent">Needs you</Badge>`,
    skill: `<div data-accent="cobalt"><span class="status" data-status="accent">Needs you</span></div><span class="status" data-status="accent">Needs you</span>`,
    pairs: [
      ["cobalt dot", "[data-accent] .basalt-badge-dot", "[data-accent] .status", ["backgroundColor"], { skillPseudo: "::before" }],
      ["ink dot", "> .basalt-badge .basalt-badge-dot", "> .status", ["backgroundColor"], { skillPseudo: "::before" }],
    ],
  },
  {
    // Braille: React's six-dot cell, 6 by 10, 2px dots, 800ms stepped.
    id: "braille",
    react: `<Spinner variant="braille" />`,
    skill: `<braille-spinner></braille-spinner>`,
    pairs: [
      ["cell", ".basalt-spinner svg", "braille-spinner > svg", ["boxWidth", "boxHeight"]],
      ["dot", "circle[data-dot='1']", "circle[data-dot='1']", ["boxWidth", "boxHeight", "color", "animationDuration", "animationTimingFunction", "animationIterationCount"]],
      ["unlit dot", "circle[data-dot='3']", "circle[data-dot='3']", ["opacity"]],
      ["lit dot", "circle[data-dot='2']", "circle[data-dot='2']", ["opacity"]],
    ],
  },
  {
    id: "code",
    react: `<CodeBlock code="{}" title="a.json" />`,
    skill: `<div class="code"><div class="code-head"><span>a.json</span></div><pre class="code-body" tabindex="0"><code>{}</code></pre></div>`,
    pairs: [
      ["block", ".basalt-code", ".code", ["borderTopLeftRadius", "backgroundColor", "borderTopColor", "borderTopWidth"]],
    ],
  },
  {
    id: "progress",
    react: `<Progress value={61} label="Budget" />`,
    skill: `<div class="progress" role="progressbar" aria-label="Budget" aria-valuemin="0" aria-valuemax="100" aria-valuenow="61" style="--value: 61%"><span></span></div>`,
    pairs: [
      ["track", ".basalt-progress-track", ".progress", ["boxHeight", "borderTopLeftRadius", "backgroundColor", "overflowX"]],
      ["fill", ".basalt-progress-indicator", ".progress > span", ["backgroundColor", "borderTopLeftRadius", "boxHeight"]],
    ],
  },
];

// An app gives the React components their page: the body's type and colour. The skill's page does the same in its own reset, so the
// React page is given the same body, from the same tokens, or every text property would differ by what the bare page inherits.
const APP_BODY = "body { margin: 0; background: var(--basalt-surface-0); color: var(--basalt-text-primary); font: var(--basalt-font-weight-regular) var(--basalt-text-base-size) / var(--basalt-text-base-line-height) var(--basalt-font-family-sans); }";

const PALETTE_PAIRS = [
  ["dialog", ".basalt-command", ".palette", ["backgroundColor", "borderTopLeftRadius", "borderTopColor", "borderTopWidth", "boxShadow", "boxWidth"]],
  ["input band", ".basalt-command-search", ".input-row", ["boxHeight", "paddingLeft", "paddingRight", "gap", "backgroundColor", "borderBottomWidth", "borderBottomColor", "color"]],
  ["input", ".basalt-command-input", ".input-row > input", ["fontSize", "lineHeight", "fontWeight", "color", "outlineStyle"]],
  ["input placeholder", ".basalt-command-input", ".input-row > input", ["color"], { pseudo: "::placeholder" }],
  ["list", ".basalt-command-list", ".palette-list", ["paddingTop", "paddingLeft", "paddingRight", "paddingBottom"]],
  ["group label", "[cmdk-group-heading]", ".row-group", [...TYPE, "color", "paddingTop", "paddingLeft", "paddingBottom"]],
  ["row at rest", ".basalt-menu-item[data-selected=false]", ".row[aria-selected=false]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "gap"]],
  ["active row", ".basalt-menu-item[data-selected=true]", ".row[aria-selected=true]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "gap", "outlineStyle"]],
  ["danger row", ".basalt-menu-item[data-danger]", ".row[data-danger]", ["color"]],
  ["lit plate", ".basalt-menu-item[data-selected=true]", ".row[aria-selected=true]", ["backgroundColor", "borderTopLeftRadius", "boxHeight", "top", "bottom"], { pseudo: "::before" }],
  ["glide plate", ".basalt-plate", ".palette-list > .plate", ["backgroundColor", "borderTopLeftRadius", "boxHeight", "boxWidth", "display", "opacity", "transitionProperty", "transitionDuration", "transitionTimingFunction"]],
  ["row hit area", ".basalt-menu-item[data-selected=false]", ".row[aria-selected=false]", ["boxHeight", "marginTop", "marginBottom"]],
  ["shortcut chip", ".basalt-menu-item-shortcut .basalt-kbd-key", ".row .kbd", [...GEOMETRY, "color", "backgroundColor"]],
  ["footer", ".basalt-command-footer", ".palette-footer", [...TYPE, "color", "paddingTop", "paddingLeft", "gap", "borderTopWidth"]],
];

const PALETTE_REACT = `
const root = createRoot(document.getElementById("root"));
flushSync(() => root.render(<B.CommandMenu hints open onOpenChange={() => {}} groups={[{ label: "Group", commands: [{ id: "a", label: "First", shortcut: "⌘D", onSelect() {} }, { id: "b", label: "Second", onSelect() {} }, { id: "c", label: "Danger", danger: true, onSelect() {} }] }]} />));`;

/** What a pair reads from an element: computed style, plus the box (the rect has the height a column of text makes; a pseudo-element has no rect, so its computed size). */
async function read(page, selector, props, { pseudo = null } = {}) {
  return page.evaluate(({ selector: sel, props: names, pseudo: ps }) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = getComputedStyle(el, ps || undefined);
    const rect = el.getBoundingClientRect();
    // text-align: start and left are the same thing in a left-to-right page
    const plain = (n) => (n === "textAlign" ? { left: "start", right: "end" }[style.textAlign] ?? style.textAlign : style[n]);
    const px = (v) => `${Math.round(v * 100) / 100}px`;
    // Where a popup sits: against its trigger (the element marked data-parity-trigger), or against the window.
    const trigger = document.querySelector("[data-parity-trigger]")?.getBoundingClientRect();
    const special = {
      boxHeight: () => (ps ? style.height : px(rect.height)),
      boxWidth: () => (ps ? style.width : px(rect.width)),
      rectLeft: () => px(rect.left), rectTop: () => px(rect.top), rectRight: () => px(window.innerWidth - rect.right), rectBottom: () => px(window.innerHeight - rect.bottom),
      pathCount: () => `${el.querySelectorAll("path").length}`,
      gapBelow: () => px(rect.top - trigger.bottom), gapAbove: () => px(trigger.top - rect.bottom), startOffset: () => px(rect.left - trigger.left), endOffset: () => px(rect.right - trigger.right),
      firstTransitionDuration: () => style.transitionDuration.split(",")[0].trim(), firstTransitionTimingFunction: () => style.transitionTimingFunction.split(",")[0].trim(),
    };
    return Object.fromEntries(names.map((n) => [n, special[n] ? special[n]() : plain(n)]));
  }, { selector, props, pseudo });
}


// ---- The overlay layer: Dialog, AlertDialog, Sheet, Popover, Menu, Tooltip, Toast and the notification centre ----
// Each is opened in React (open by default) and in the skill (opened from script), then settled, and the pairs read like the others. A popup's place
// is read against its trigger (data-parity-trigger), so the two pages' layouts need not agree. Exit timing is read in the behaviour tests (parity-4).
const PANEL = ["backgroundColor", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius", "borderTopColor", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderRightColor", "borderBottomColor", "borderLeftColor", "boxShadow", "color"];
const PAD = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
const ENTRY = ["firstTransitionDuration", "firstTransitionTimingFunction"];
const SIDES = ["right", "left", "bottom", "top"];
const MENU_ROWS = {
  react: `import { CopyIcon, TrashIcon } from "@phosphor-icons/react";`,
  menuReact: `<MenuItem icon={CopyIcon} shortcut="⌘D">Duplicate</MenuItem><MenuSeparator /><MenuGroup><MenuGroupLabel>Sort by</MenuGroupLabel><MenuRadioGroup defaultValue="name"><MenuRadioItem value="name">Name</MenuRadioItem><MenuRadioItem value="date" description="Newest first">Date</MenuRadioItem></MenuRadioGroup></MenuGroup><MenuCheckboxItem defaultChecked>Show hidden</MenuCheckboxItem><MenuItem icon={TrashIcon} danger>Delete</MenuItem>`,
};
const NOTES = `[{ id: "a", title: "Deploy finished", description: "api, production", time: "2m ago", status: "success", unread: true }, { id: "b", title: "Build failed", time: "1h ago", status: "danger", unread: true }, { id: "c", title: "Invoice ready", time: "Yesterday" }]`;
const NOTES_SKILL = NOTES.replaceAll('status: "success"', "status: 'success'");

const OVERLAYS = [
  {
    id: "dialog",
    uses: "Dialog, DialogContent, DialogTitle, DialogDescription, DialogActions, Button",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<Dialog defaultOpen><DialogContent><DialogTitle>Rename sandbox</DialogTitle><DialogDescription>The new name shows everywhere.</DialogDescription><DialogActions><Button>Cancel</Button><Button variant="primary">Save</Button></DialogActions></DialogContent></Dialog>));`,
    skill: `<dialog class="panel float modal dialog" id="d"><h2 class="dialog-title">Rename sandbox</h2><p class="dialog-description">The new name shows everywhere.</p><div class="dialog-actions"><button class="btn" data-dialog-close>Cancel</button><button class="btn" data-variant="primary" data-dialog-close>Save</button></div></dialog>`,
    open: "Basalt.openDialog('#d')",
    ready: { react: ".basalt-dialog", skill: "dialog.dialog[open]" },
    pairs: [
      ["dialog", ".basalt-dialog", "dialog.dialog", [...PANEL, ...PAD, "boxWidth", "boxHeight", "fontFamily", "opacity", "maxHeight", "overflowY", "outlineStyle", ...ENTRY, "rectLeft", "rectTop"]],
      ["scrim", ".basalt-dialog-backdrop", "dialog.dialog", ["backgroundColor", "opacity", ...ENTRY], { skillPseudo: "::backdrop" }],
      ["title", ".basalt-dialog-title", ".dialog-title", [...TYPE, "color", "marginTop", "marginBottom", "boxHeight"]],
      ["description", ".basalt-dialog-description", ".dialog-description", [...TYPE, "color", "marginTop", "boxHeight"]],
      ["actions", ".basalt-dialog-actions", ".dialog-actions", ["display", "justifyContent", "gap", "marginTop", "boxHeight"]],
      ["primary action", ".basalt-button[data-variant=primary]", ".dialog-actions .btn[data-variant=primary]", [...GEOMETRY, ...COLOUR]],
    ],
  },
  {
    id: "alert dialog",
    uses: "AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogActions, AlertDialogCancel, AlertDialogAction, Button",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<AlertDialog defaultOpen><AlertDialogContent><AlertDialogTitle>Delete sandbox?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription><AlertDialogActions><AlertDialogCancel render={<Button>Cancel</Button>} /><AlertDialogAction render={<Button variant="danger">Delete</Button>} /></AlertDialogActions></AlertDialogContent></AlertDialog>));`,
    skill: `<dialog class="panel float modal dialog" id="d" role="alertdialog"><h2 class="dialog-title">Delete sandbox?</h2><p class="dialog-description">This cannot be undone.</p><div class="dialog-actions"><button class="btn" data-dialog-close data-cancel>Cancel</button><button class="btn" data-variant="danger" data-dialog-close>Delete</button></div></dialog>`,
    open: "Basalt.openDialog('#d')",
    ready: { react: ".basalt-dialog", skill: "dialog.dialog[open]" },
    pairs: [
      ["dialog", ".basalt-dialog", "dialog.dialog", [...PANEL, ...PAD, "boxWidth", "boxHeight", "rectLeft", "rectTop"]],
      ["safe action, first focus", "[data-basalt-cancel]", ".btn[data-cancel]", ["boxHeight", "outlineStyle"]],
      ["danger action", ".basalt-button[data-variant=danger]", ".btn[data-variant=danger]", [...GEOMETRY, ...COLOUR]],
    ],
  },
  ...SIDES.map((side) => ({
    id: `sheet ${side}`,
    uses: "Sheet, SheetContent, SheetTitle, SheetDescription, SheetActions, Button",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<Sheet defaultOpen><SheetContent side="${side}"><SheetTitle>Details</SheetTitle><SheetDescription>A side panel.</SheetDescription><SheetActions><Button>Close</Button></SheetActions></SheetContent></Sheet>));`,
    skill: `<dialog class="panel float modal sheet" id="s" data-side="${side}"><h2 class="dialog-title">Details</h2><p class="dialog-description">A side panel.</p><div class="dialog-actions"><button class="btn" data-dialog-close>Close</button></div></dialog>`,
    open: "Basalt.openDialog('#s')",
    ready: { react: ".basalt-sheet", skill: "dialog.sheet[open]" },
    pairs: [
      ["sheet", ".basalt-sheet", "dialog.sheet", [...PANEL, ...PAD, "boxWidth", "boxHeight", "display", "flexDirection", "overflowY", "rectLeft", "rectTop", "rectRight", "rectBottom", ...ENTRY, "clipPath", "transform", "opacity"]],
      ["scrim", ".basalt-dialog-backdrop", "dialog.sheet", ["backgroundColor", "opacity"], { skillPseudo: "::backdrop" }],
      ["actions", ".basalt-dialog-actions", ".dialog-actions", ["position", "bottom", "marginTop", "marginRight", "marginBottom", "marginLeft", ...PAD, "backgroundColor", "boxShadow", "boxHeight"]],
    ],
  })),
  {
    // The site header's narrow menu draws Menu in its band and morphs it to Close (React's MorphIcon). The skill carries no MorphIcon: it swaps the glyph at once
    // and draws the core Close glyph as one path where MorphIcon draws one path for each stroke (see parity-differences.mjs).
    id: "sheet top, the band's close",
    imports: `import { CloseGlyph } from "./dist/glyphs/close.js";`,
    uses: "Sheet, SheetContent, SheetTitle, SheetClose, MorphIcon",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<Sheet defaultOpen><SheetContent side="top"><SheetTitle className="basalt-visually-hidden">Menu</SheetTitle><div className="basalt-site-menu-band"><SheetClose aria-label="Close menu" className="basalt-button" data-variant="ghost" data-icon-only=""><MorphIcon glyph={CloseGlyph} /></SheetClose></div></SheetContent></Sheet>));`,
    skill: `<dialog class="panel float modal sheet" id="s" data-side="top" aria-label="Menu"><div class="sheet-band"><button class="btn" data-variant="ghost" data-icon-only aria-label="Close menu" data-dialog-close><span data-glyph="close"></span></button></div></dialog>`,
    open: "Basalt.openDialog('#s')",
    ready: { react: ".basalt-sheet", skill: "dialog.sheet[open]" },
    pairs: [
      ["band", ".basalt-site-menu-band", ".sheet-band", ["boxHeight", "display", "alignItems", "borderBottomWidth", "borderBottomColor", "paddingTop", "paddingRight", "paddingLeft"]],
      ["close glyph", ".basalt-morph", ".sheet-band .btn svg", ["boxWidth", "boxHeight"]],
      ["close glyph, drawn", ".basalt-morph path", ".sheet-band .btn svg path", ["strokeWidth", "strokeLinecap", "strokeLinejoin", "fill", "stroke"]],
      // MorphIcon draws each stroke of the glyph as its own path, so it can move one into another; the skill draws the same two strokes as one path.
      ["close glyph, the morph's structure", ".basalt-morph", ".sheet-band .btn svg", ["pathCount"]],
    ],
  },
  {
    id: "popover",
    uses: "Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription, Button",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><Popover defaultOpen><PopoverTrigger render={<Button data-parity-trigger>Details</Button>} /><PopoverContent><PopoverTitle>Region</PopoverTitle><PopoverDescription>Where it runs.</PopoverDescription></PopoverContent></Popover></div>));`,
    skill: `<div style="padding: 16px"><button class="btn" id="b" popovertarget="p" data-parity-trigger>Details</button><div class="panel float popover" popover id="p"><h2 class="popover-title">Region</h2><p class="popover-description">Where it runs.</p></div></div>`,
    open: "document.getElementById('p').showPopover({ source: document.getElementById('b') })",
    ready: { react: ".basalt-popover", skill: ".popover:popover-open" },
    pairs: [
      ["popover", ".basalt-popover", ".popover", [...PANEL, ...PAD, "boxWidth", "boxHeight", "fontSize", "lineHeight", "fontFamily", "maxWidth", "gapBelow", "startOffset", ...ENTRY]],
      ["title", ".basalt-popover-title", ".popover-title", [...TYPE, "color", "marginTop", "marginBottom"]],
      ["description", ".basalt-popover-description", ".popover-description", [...TYPE, "color", "marginTop"]],
    ],
  },
  {
    id: "menu",
    imports: MENU_ROWS.react,
    uses: "Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator, MenuGroup, MenuGroupLabel, MenuRadioGroup, MenuRadioItem, MenuCheckboxItem, Button",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><Menu defaultOpen><MenuTrigger render={<Button data-parity-trigger>Options</Button>} /><MenuContent>${MENU_ROWS.menuReact}</MenuContent></Menu></div>));`,
    skill: `<div style="padding: 16px"><button class="btn" id="b" popovertarget="m" data-parity-trigger>Options</button><div class="panel float menu" popover id="m">
      <button class="menu-item" role="menuitem"><i data-icon="Copy"></i><span class="menu-item-label">Duplicate</span><span data-kbd="⌘ D"></span></button><div class="menu-separator" role="separator"></div>
      <div role="group" aria-labelledby="g"><div class="menu-group-label" id="g">Sort by</div><button class="menu-item" role="menuitemradio" aria-checked="true"><span class="menu-item-label">Name</span></button><button class="menu-item" role="menuitemradio" aria-checked="false"><span class="menu-item-label">Date</span><span class="menu-item-description">Newest first</span></button></div>
      <button class="menu-item" role="menuitemcheckbox" aria-checked="true"><span class="menu-item-label">Show hidden</span></button><button class="menu-item" role="menuitem" data-danger><i data-icon="Trash"></i><span class="menu-item-label">Delete</span></button></div></div>`,
    open: "document.getElementById('m').showPopover({ source: document.getElementById('b') })",
    ready: { react: ".basalt-menu", skill: ".menu:popover-open" },
    // The pointer lights a row in both; the lit pair is read after it.
    after: {
      react: async (page) => { await page.locator(".basalt-menu-item").nth(0).hover(); },
      skill: async (page) => { await page.locator(".menu-item").nth(0).hover(); },
    },
    pairs: [
      ["menu", ".basalt-menu", ".menu", [...PANEL, ...PAD, "boxWidth", "boxHeight", "minWidth", "gapBelow", "startOffset", "overflowY", ...ENTRY]],
      ["item", ".basalt-menu-item:not([data-highlighted]):not([data-described]):not([data-danger])", ".menu-item[role=menuitemradio][aria-checked=true]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "gap", "boxHeight", "display", "cursor"]],
      ["item plate", ".basalt-menu-item:not([data-highlighted]):not([data-described]):not([data-danger])", ".menu-item[role=menuitemradio][aria-checked=true]", ["top", "bottom", "borderTopLeftRadius", "backgroundColor", "boxHeight"], { pseudo: "::before" }],
      ["lit item", ".basalt-menu-item[data-highlighted]", ".menu-item[data-highlighted]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "gap", "boxHeight"]],
      ["lit plate", ".basalt-menu-item[data-highlighted]", ".menu-item[data-highlighted]", ["top", "bottom", "borderTopLeftRadius", "backgroundColor", "boxHeight"], { pseudo: "::before" }],
      ["glide plate", ".basalt-plate", ".menu > .plate", ["backgroundColor", "borderTopLeftRadius", "boxHeight", "boxWidth", "display", "opacity", "firstTransitionDuration", "firstTransitionTimingFunction"]],
      ["glyph and shortcut item", ".basalt-menu-item:has(.basalt-menu-item-shortcut)", ".menu-item:has(.kbd-group)", [...GEOMETRY, "gap", "boxHeight"]],
      ["shortcut", ".basalt-menu-item-shortcut", ".menu-item .kbd-group", ["marginLeft", "gap", "display"]],
      ["described item", ".basalt-menu-item[data-described]", ".menu-item:has(.menu-item-description)", [...GEOMETRY, ...TYPE, "color", "gap", "boxHeight", "display", "gridTemplateColumns", "gridTemplateRows"]],
      ["description", ".basalt-menu-item-description", ".menu-item-description", [...TYPE, "color", "boxHeight", "whiteSpace", "textOverflow"]],
      ["check seat", ".basalt-menu-check", ".menu-check", ["boxWidth", "boxHeight", "color", "display"]],
      ["radio dot", ".basalt-menu-radio-dot", ".menu-radio-dot", ["boxWidth", "boxHeight", "borderTopLeftRadius", "backgroundColor"]],
      ["danger item", ".basalt-menu-item[data-danger]", ".menu-item[data-danger]", ["color", "boxHeight"]],
      ["separator", ".basalt-menu-separator", ".menu-separator", ["boxHeight", "backgroundColor", "marginTop", "marginBottom", "marginLeft", "marginRight"]],
      ["group label", ".basalt-menu-group-label", ".menu-group-label", [...TYPE, "color", "paddingTop", "paddingLeft", "paddingBottom", "boxHeight"]],
    ],
  },
  {
    id: "tooltip",
    uses: "Tooltip, TooltipProvider, Button",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<div style={{ padding: 48 }}><TooltipProvider><Tooltip content="Copy" defaultOpen><Button data-parity-trigger>Copy</Button></Tooltip></TooltipProvider></div>));`,
    skill: `<div style="padding: 48px"><button class="btn" data-parity-trigger data-tooltip="Copy">Copy</button></div>`,
    open: "void 0",
    after: { react: async () => {}, skill: async (page) => { await page.keyboard.press("Tab"); await page.waitForSelector(".tooltip:popover-open"); } },
    ready: { react: ".basalt-tooltip", skill: "body" },
    pairs: [
      ["tooltip", ".basalt-tooltip", ".tooltip", [...PANEL, ...PAD, ...TYPE, "boxHeight", "display", "alignItems", "maxWidth", "gapAbove", ...ENTRY]],
    ],
  },
  {
    id: "toast",
    uses: "ToastProvider, useToast, Button",
    react: `function Show() { const t = B.useToast(); React.useEffect(() => { t.show({ title: "Sandbox deleted", description: "api-preview", status: "success", home: "centre", action: { label: "Undo", onClick() {} } }); }, []); return null; }
      flushSync(() => createRoot(document.getElementById("root")).render(<ToastProvider><Show /></ToastProvider>));`,
    skill: `<!-- basalt:use toast --><p>page</p>`,
    open: "Basalt.toast({ title: 'Sandbox deleted', description: 'api-preview', status: 'success', home: 'centre', action: { label: 'Undo', onClick: function () {} } })",
    ready: { react: ".basalt-toast", skill: ".toast" },
    still: true,
    pairs: [
      ["viewport", ".basalt-toast-viewport", ".toast-viewport", ["position", "boxWidth", "rectRight", "rectBottom"]],
      ["toast", ".basalt-toast", ".toast", [...PANEL, "boxWidth", "boxHeight", "position", "fontFamily", "transform", "opacity", "zIndex"]],
      ["content", ".basalt-toast-content", ".toast-content", [...PAD, "gap", "alignItems", "display", "overflowX", "boxHeight"]],
      ["seat", ".basalt-toast-seat", ".toast-seat", ["boxWidth", "boxHeight", "marginTop", "color", "display"]],
      ["text", ".basalt-toast-text", ".toast-text", ["paddingTop", "boxHeight"]],
      ["title", ".basalt-toast-title", ".toast-title", [...TYPE, "color", "marginTop", "boxHeight"]],
      ["description", ".basalt-toast-description", ".toast-description", [...TYPE, "color", "marginTop", "boxHeight"]],
      ["action", ".basalt-toast-action", ".toast-action", [...GEOMETRY, ...TYPE, ...COLOUR]],
      ["dismiss", ".basalt-toast-close", ".toast-close", [...GEOMETRY, "color", "backgroundColor", "boxWidth"]],
      ["drain", ".basalt-toast-drain", ".toast-drain", ["boxHeight", "backgroundColor", "position", "left", "right", "bottom", "animationDuration", "animationTimingFunction", "animationFillMode", "transformOrigin"]],
    ],
  },
  {
    id: "notification centre",
    uses: "NotificationCentre",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<div style={{ padding: 16 }}><NotificationCentre defaultOpen entries={${NOTES}} /></div>));`,
    skill: `<!-- basalt:use notifications --><div style="padding: 16px"><span id="bell"></span></div>`,
    open: `window.centre = Basalt.notifications('#bell', { entries: ${NOTES_SKILL}, viewAllHref: '#all' }); window.centre.open();`,
    ready: { react: ".basalt-notifications", skill: ".notifications:popover-open" },
    after: {
      react: async (page) => { await page.evaluate(() => document.querySelector(".basalt-notifications-trigger").setAttribute("data-parity-trigger", "")); await page.locator(".basalt-notification").nth(1).hover(); },
      skill: async (page) => { await page.evaluate(() => document.querySelector("#bell > .btn").setAttribute("data-parity-trigger", "")); await page.locator(".notification").nth(1).hover(); },
    },
    pairs: [
      ["bell", ".basalt-notifications-trigger", "#bell > .btn", [...GEOMETRY, ...COLOUR, "boxWidth", "boxHeight", "position"]],
      ["bell dot", ".basalt-notifications-trigger", "#bell > .btn .notifications-dot", ["boxWidth", "boxHeight", "backgroundColor", "borderTopLeftRadius", "position", "top", "right"], { pseudo: "::after", skillPseudo: null }],
      ["popover", ".basalt-notifications", ".notifications", [...PANEL, ...PAD, "boxWidth", "boxHeight", "display", "flexDirection", "overflowX", "gapBelow", "endOffset"]],
      ["head", ".basalt-notifications-head", ".notifications-head", [...PAD, "gap", "display", "alignItems", "borderBottomWidth", "borderBottomColor", "boxHeight"]],
      ["title", ".basalt-notifications-title", ".notifications-title", [...TYPE, "color", "marginTop", "boxHeight"]],
      ["count", ".basalt-notifications-count", ".notifications-count", [...TYPE, "color", "fontVariantNumeric", "boxHeight"]],
      ["mark all", ".basalt-notifications-mark", ".notifications-mark", [...GEOMETRY, ...TYPE, ...COLOUR]],
      ["list", ".basalt-notifications-list", ".notifications-list", [...PAD, "listStyleType", "marginTop"]],
      ["entry", ".basalt-notification:not(:hover)", ".notification:not(:hover)", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "display", "gridTemplateColumns", "columnGap", "boxHeight", "cursor"]],
      ["entry plate", ".basalt-notification:not(:hover)", ".notification:not(:hover)", ["top", "bottom", "borderTopLeftRadius", "backgroundColor"], { pseudo: "::before" }],
      ["unread dot", ".basalt-notification[data-unread] .basalt-notification-dot", ".notification[data-unread] .notification-dot", ["boxWidth", "boxHeight", "backgroundColor", "borderTopLeftRadius", "marginTop"]],
      ["status mark", ".basalt-notification[data-status=success] .basalt-notification-mark", ".notification[data-status=success] .notification-mark", ["boxWidth", "boxHeight", "color", "marginTop"]],
      ["unread title", ".basalt-notification[data-unread] .basalt-notification-title", ".notification[data-unread] .notification-title", [...TYPE, "color", "boxHeight"]],
      ["read title", ".basalt-notification:not([data-unread]) .basalt-notification-title", ".notification:not([data-unread]) .notification-title", ["color"]],
      ["line", ".basalt-notification-line", ".notification-line", [...TYPE, "color", "boxHeight", "whiteSpace"]],
      ["time", ".basalt-notification-time", ".notification-time", [...TYPE, "color", "marginTop", "boxHeight", "fontVariantNumeric"]],
      ["hovered entry", ".basalt-notification:hover", ".notification:hover", ["color", "backgroundColor", "boxHeight"]],
      ["hovered entry's own plate (the glide hides it)", ".basalt-notification:hover", ".notification:hover", ["backgroundColor"], { pseudo: "::before" }],
      ["glide plate", ".basalt-notifications-scroll > .basalt-plate", ".notifications-scroll > .plate", ["backgroundColor", "borderTopLeftRadius", "boxHeight", "boxWidth", "display", "opacity"]],
      ["foot", ".basalt-notifications-foot", ".notifications-foot", [...PAD, "display", "justifyContent", "borderTopWidth", "borderTopColor", "boxHeight"]],
    ],
  },
];

let reactBrowser;
let skillBrowser;
before(async () => {
  reactBrowser = await launchReact();
  skillBrowser = await launchReact();
});
after(async () => {
  await reactBrowser?.close();
  await skillBrowser?.close();
});

const found = []; // every difference this run saw, in the list's own shape

/** Compares a set of pairs between a React page and a skill page, recording every difference. */
async function compare(theme, area, reactPage, skillPage, pairs, scopes) {
  for (const [label, reactSel, skillSel, props, options = {}] of pairs) {
    const scope = (sel, side) => (scopes ? `${scopes[side]} ${sel}` : sel);
    if (options.focus) {
      await reactPage.locator(scope(reactSel, "react")).first().focus();
      await skillPage.locator(scope(skillSel, "skill")).first().focus();
    }
    const react = await read(reactPage, scope(reactSel, "react"), props, { pseudo: options.pseudo });
    const skill = await read(skillPage, scope(skillSel, "skill"), props, { pseudo: "skillPseudo" in options ? options.skillPseudo : options.pseudo });
    assert.ok(react, `${area}: React has no ${reactSel}`);
    assert.ok(skill, `${area}: the skill has no ${skillSel}`);
    if (options.focus) {
      await reactPage.evaluate(() => document.activeElement?.blur());
      await skillPage.evaluate(() => document.activeElement?.blur());
    }
    for (const prop of props) if (react[prop] !== skill[prop]) found.push({ area, pair: label, prop, theme, react: react[prop], skill: skill[prop] });
  }
}

describe("each skill component renders as its React counterpart does, but for the differences listed", () => {
  for (const theme of THEMES) {
    test(`the components (${theme})`, async () => {
      const reactJsx = CASES.map((c) => `<section id="r-${c.id}" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start", margin: 16 }}>${c.react}</section>`).join("");
      const { page: reactPage, errors } = await fixturePage(reactBrowser, `
        const { Button, Field, Input, Textarea, Badge, Table, TableContainer, TableHeader, TableBody, TableRow, TableHead, TableCell, Tabs, TabsList, Tab, TabsPanel, SegmentedControl, Segment, Kbd, Callout, Spinner, Progress, NumberField, CodeBlock } = B;
        flushSync(() => createRoot(document.getElementById("root")).render(<>${reactJsx}</>));`, { theme });
      await reactPage.addStyleTag({ content: APP_BODY });
      await settle(reactPage);
      const body = CASES.map((c) => `<section id="s-${c.id}" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; margin: 16px">${c.skill}</section>`).join("\n");
      const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>\n${body}`, { fonts: false }).html, { scheme: theme });
      // Loops are read at their first frame (a spinner's opacity at an arbitrary moment is not a difference), the same on both pages.
      for (const p of [reactPage, skillPage]) await p.evaluate(() => document.getAnimations().forEach((animation) => { animation.pause(); animation.currentTime = 0; }));
      for (const c of CASES) await compare(theme, c.id, reactPage, skillPage, c.pairs, { react: `#r-${c.id}`, skill: `#s-${c.id}` });
      assert.deepEqual([errors, skillErrors], [[], []]);
      await reactPage.close();
      await context.close();
    });

    test(`the palette (${theme})`, async () => {
      const { page: reactPage } = await fixturePage(reactBrowser, PALETTE_REACT, { theme });
      await reactPage.addStyleTag({ content: APP_BODY });
      await reactPage.waitForSelector(".basalt-menu-item");
      await settle(reactPage);
      const { page: skillPage, context } = await openHtml(skillBrowser, compose("<title>Parity</title><button class=\"btn\" data-open-palette>Open</button>", { fonts: false }).html, { scheme: theme });
      await skillPage.evaluate(() => window.Basalt.openPalette({ groups: [{ label: "Group", items: [{ label: "First", keys: ["⌘", "D"] }, { label: "Second" }, { label: "Danger", danger: true }] }] }));
      await skillPage.locator(".palette .row").first().waitFor();
      await compare(theme, "palette", reactPage, skillPage, PALETTE_PAIRS, null);
      await reactPage.close();
      await context.close();
    });

    for (const overlay of OVERLAYS) {
      test(`${overlay.id} (${theme})`, async () => {
        const { page: reactPage, errors } = await fixturePage(reactBrowser, `${overlay.imports ?? ""}\nconst { ${overlay.uses} } = B;\n${overlay.react}`, { theme, viewport: { width: 1440, height: 900 } });
        await reactPage.addStyleTag({ content: APP_BODY });
        await reactPage.waitForSelector(overlay.ready.react);
        const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>${overlay.skill}`, { fonts: false }).html, { scheme: theme });
        await skillPage.evaluate(overlay.open);
        await skillPage.waitForSelector(overlay.ready.skill);
        // A toast with a home runs its drain line for five seconds, so it is not settled (that would wait out the drain): its transitions are awaited instead, and it is read at rest.
        const quiet = async (p) => (overlay.still ? p.evaluate(async () => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {}))); }) : settle(p));
        for (const p of [reactPage, skillPage]) await quiet(p);
        if (overlay.after) { await overlay.after.react(reactPage); await overlay.after.skill(skillPage); for (const p of [reactPage, skillPage]) await quiet(p); }
        await compare(theme, overlay.id, reactPage, skillPage, overlay.pairs, null);
        assert.deepEqual([errors, skillErrors], [[], []]);
        await reactPage.close();
        await context.close();
      });
    }
  }

  test("the differences found are exactly the differences listed: nothing new, nothing fixed and left in the list", () => {
    const key = (d) => `${d.area} | ${d.pair} | ${d.prop} | ${d.theme}`;
    const expected = DIFFERENCES.flatMap((d) => (d.themes ?? THEMES).map((theme) => ({ ...d, theme })));
    if (process.env.PARITY_REPORT) console.log(JSON.stringify(found, null, 1));
    const actual = new Map(found.map((d) => [key(d), d]));
    const listed = new Map(expected.map((d) => [key(d), d]));
    const fresh = [...actual].filter(([k]) => !listed.has(k)).map(([, d]) => `NEW   ${key(d)}: React ${d.react}, skill ${d.skill}`);
    const fixed = [...listed].filter(([k]) => !actual.has(k)).map(([k]) => `FIXED ${k}: no longer differs; delete it from parity-differences.mjs`);
    const changed = [...listed].filter(([k, d]) => actual.has(k) && (actual.get(k).react !== d.react || actual.get(k).skill !== d.skill)).map(([k, d]) => `MOVED ${k}: listed as React ${d.react} / skill ${d.skill}, now React ${actual.get(k).react} / skill ${actual.get(k).skill}`);
    assert.deepEqual([...fresh, ...fixed, ...changed], []);
  });
});
