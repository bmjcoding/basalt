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
import { BROKEN, DAY, NIGHT, PHOTO } from "./support-art.mjs";

const THEMES = ["dark", "light"];
const GEOMETRY = ["boxHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopLeftRadius"];
const TYPE = ["fontSize", "fontWeight", "lineHeight", "letterSpacing"];
const COLOUR = ["color", "backgroundColor", "borderTopColor", "borderTopWidth", "boxShadow"];
const BOX = [...GEOMETRY, ...TYPE, ...COLOUR];
// Every status a Badge can say, and what a status dot is drawn as (React's .basalt-badge-dot, the skill's ::before).
const STATUSES = ["neutral", "success", "warning", "danger", "accent", "pending"];
const DOT = ["boxWidth", "boxHeight", "backgroundColor", "borderTopLeftRadius", "borderTopWidth", "borderTopStyle", "borderTopColor", "boxSizing", "marginLeft", "marginRight"];
// The four sides of a border: its colour, width and style (a status callout's rim is one colour on every side).
const RIM = ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopStyle"];
const CALLOUTS = ["info", "success", "warning", "danger"].map((s, i) => `<div class="callout" data-status="${s}"><svg class="icon" width="16" height="16" viewBox="0 0 256 256"></svg><div><div class="callout-title">${["Note", "Done", "Slow", "Failed"][i]}</div><div class="callout-body">Body text</div></div></div>`).join("");
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
      // The chosen label is 600 and a resting one 400, each reserving its 600 width (decisions 138 and 139): the two draw the same width.
      ["selected tab label", ".basalt-tab[aria-selected=true] [data-label]", ".tab[aria-selected=true] [data-label]", ["fontWeight", "boxWidth"]],
      ["selected tab width", ".basalt-tab[aria-selected=true]", ".tab[aria-selected=true]", ["boxWidth", "fontWeight"]],
      ["other tab width", ".basalt-tab[aria-selected=false]", ".tab[aria-selected=false]", ["boxWidth", "fontWeight"]],
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
      ["pressed width", ".basalt-segment[aria-pressed=true]", ".segment button[aria-pressed=true]", ["boxWidth", "fontWeight"]],
      // The 600 is on the label, not on the item (decision 149): the two draw the same weight on their labels.
      ["pressed label", ".basalt-segment[aria-pressed=true] [data-label]", ".segment button[aria-pressed=true] [data-label]", ["fontWeight", "boxWidth"]],
      ["rest label", ".basalt-segment[aria-pressed=false] [data-label]", ".segment button[aria-pressed=false] [data-label]", ["fontWeight", "boxWidth"]],
      ["rest width", ".basalt-segment[aria-pressed=false]", ".segment button[aria-pressed=false]", ["boxWidth", "fontWeight"]],
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
    // Every status at the page's level, in a card (level 2) and in a card in a card (level 3): the status rim is the status colour at 45% mixed in sRGB over the callout's own
    // level, one solid colour on every side (DECISIONS 82); info keeps the neutral rim. The border colours are compared on every side.
    id: "callout",
    react: `<><div id="lv1"><Callout status="info" title="Note">Body text</Callout><Callout status="success" title="Done">Body text</Callout><Callout status="warning" title="Slow">Body text</Callout><Callout status="danger" title="Failed">Body text</Callout></div><div id="lv2"><Card><CardContent><Callout status="info" title="Note">Body text</Callout><Callout status="success" title="Done">Body text</Callout><Callout status="warning" title="Slow">Body text</Callout><Callout status="danger" title="Failed">Body text</Callout></CardContent></Card></div><div id="lv3"><Card><CardContent><Card><CardContent><Callout status="info" title="Note">Body text</Callout><Callout status="success" title="Done">Body text</Callout><Callout status="warning" title="Slow">Body text</Callout><Callout status="danger" title="Failed">Body text</Callout></CardContent></Card></CardContent></Card></div></>`,
    skill: `<div id="lv1">${CALLOUTS}</div><div id="lv2"><div class="card">${CALLOUTS}</div></div><div id="lv3"><div class="card"><div class="card">${CALLOUTS}</div></div></div>`,
    pairs: [
      ["panel", ".basalt-callout[data-status=info]", ".callout[data-status=info]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "borderTopColor", "borderTopWidth", "gap", "boxShadow"]],
      ["info icon", ".basalt-callout[data-status=info] > svg", ".callout[data-status=info] > svg", ["color", "boxWidth", "marginTop"]],
      ["danger icon", ".basalt-callout[data-status=danger] > svg", ".callout[data-status=danger] > svg", ["color"]],
      ["danger title", ".basalt-callout[data-status=danger] .basalt-callout-title", ".callout[data-status=danger] .callout-title", ["color", "fontWeight"]],
      ["title", ".basalt-callout[data-status=info] .basalt-callout-title", ".callout[data-status=info] .callout-title", ["color", "fontWeight", "fontSize"]],
      ["body text", ".basalt-callout[data-status=info] .basalt-callout-text", ".callout[data-status=info] .callout-body", ["color", "fontSize", "fontWeight", "marginTop"]],
      ...["lv1", "lv2", "lv3"].flatMap((level) => ["info", "success", "warning", "danger"].flatMap((status) => [
        [`${level} ${status} rim`, `#${level} .basalt-callout[data-status=${status}]`, `#${level} .callout[data-status=${status}]`, [...RIM, "backgroundColor"]],
        [`${level} ${status} icon`, `#${level} .basalt-callout[data-status=${status}] > svg`, `#${level} .callout[data-status=${status}] > svg`, ["color"]],
      ])),
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
  ["two-line row", ".basalt-menu-item[data-described]", ".row[data-described]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "boxHeight", "boxWidth", "display", "gridTemplateColumns", "gridTemplateRows", "rowGap", "columnGap"]],
  ["row description", ".basalt-menu-item-description", ".row-description", [...TYPE, "color", "boxHeight", "boxWidth", "overflowX", "textOverflow", "whiteSpace", "gridColumnStart", "gridRowStart"]],
  ["row description's label", ".basalt-menu-item[data-described] .basalt-menu-item-label", ".row[data-described] .row-label", ["boxHeight", "boxWidth", "gridColumnStart", "gridRowStart"]],
  ["footer", ".basalt-command-footer", ".palette-footer", [...TYPE, "color", "paddingTop", "paddingLeft", "gap", "borderTopWidth"]],
];

const PALETTE_REACT = `
const root = createRoot(document.getElementById("root"));
flushSync(() => root.render(<B.CommandMenu hints open onOpenChange={() => {}} groups={[{ label: "Group", commands: [{ id: "a", label: "First", shortcut: "⌘D", onSelect() {} }, { id: "b", label: "Second", onSelect() {} }, { id: "c", label: "Danger", danger: true, onSelect() {} }, { id: "d", label: "Described", description: "A second line", onSelect() {} }] }]} />));`;

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
      boxHeight: () => (ps ? (Number.isNaN(parseFloat(style.height)) ? style.height : px(parseFloat(style.height))) : px(rect.height)),
      boxWidth: () => (ps ? (Number.isNaN(parseFloat(style.width)) ? style.width : px(parseFloat(style.width))) : px(rect.width)),
      rectLeft: () => px(rect.left), rectTop: () => px(rect.top), rectRight: () => px(window.innerWidth - rect.right), rectBottom: () => px(window.innerHeight - rect.bottom),
      pathCount: () => `${el.querySelectorAll("path").length}`,
      attrX: () => el.getAttribute("x"), attrY: () => el.getAttribute("y"), attrW: () => el.getAttribute("width"), attrH: () => el.getAttribute("height"), attrD: () => el.getAttribute("d"), attrAnchor: () => el.getAttribute("text-anchor"),
      // Where the page lays two pages out differently, a position is read inside its own figure; a width off by a layout unit (1/64px) is read to the pixel; a paint server's id is its own.
      relTop: () => px(rect.top - el.closest("dl, .basalt-meter, .meter").getBoundingClientRect().top), roundWidth: () => `${Math.round(rect.width)}px`, roundMarginLeft: () => `${Math.round(parseFloat(style.marginLeft))}px`,
      paint: () => (/^url\(/.test(style.fill) ? "url(#pattern)" : style.fill),
      childCount: () => `${el.querySelectorAll("*").length}`, words: () => [...el.querySelectorAll("text")].map((t) => `${t.getAttribute("x")},${Math.round(+t.getAttribute("y") * 100) / 100}:${t.textContent}`).join(" | "),
      // The ink of a mark: a mask draws it as a background, an SVG as the text colour. Where a part sits in its parent (a box in its label, a thumb in its track).
      ink: () => (ps ? style.backgroundColor : style.color),
      inLeft: () => px(rect.left - el.parentElement.getBoundingClientRect().left), inTop: () => px(rect.top - el.parentElement.getBoundingClientRect().top),
      gapBelow: () => px(rect.top - trigger.bottom), gapAbove: () => px(trigger.top - rect.bottom), startOffset: () => px(rect.left - trigger.left), endOffset: () => px(rect.right - trigger.right),
      tabIndex: () => el.getAttribute("tabindex"), ariaLabel: () => el.getAttribute("aria-label"), role: () => el.getAttribute("role"), labelledByText: () => document.getElementById(el.getAttribute("aria-labelledby"))?.textContent.trim() ?? null, isActive: () => String(document.activeElement === el),
      dataPhase: () => el.getAttribute("data-phase"), ariaSort: () => el.getAttribute("aria-sort"), ariaHidden: () => el.getAttribute("aria-hidden"), ariaLive: () => el.getAttribute("aria-live"), ariaAtomic: () => el.getAttribute("aria-atomic"),
      text: () => el.textContent.trim(), ownText: () => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(), scrollHeight: () => px(el.scrollHeight),
      attrPoints: () => el.getAttribute("points"), attrViewBox: () => el.getAttribute("viewBox"), attrValue: () => el.getAttribute("aria-selected"), plainText: () => el.textContent.replace(/\s+/g, " ").trim(),
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
    // The styled list of a native select (Chromium's appearance: base-select), against React's Select popup. The popup is a pseudo-element of the select,
    // so its box is read as computed style; its rows are real options. Where the popup sits is not read (a pseudo-element has no rectangle).
    id: "select popup",
    uses: "Select",
    react: `flushSync(() => createRoot(document.getElementById("root")).render(<div style={{ padding: 16, width: 320 }}><Select aria-label="Region" defaultOpen defaultValue="us" options={[{ value: "eu", label: "Frankfurt", description: "eu-central, lowest latency" }, { value: "us", label: "Ashburn" }, { value: "ap", label: "Singapore" }]} /></div>));`,
    skill: `<div style="padding: 16px; width: 352px"><span class="select"><select class="input" id="r" aria-label="Region"><button><selectedcontent></selectedcontent></button><option value="eu">Frankfurt<span class="option-description">eu-central, lowest latency</span></option><option value="us" selected>Ashburn</option><option value="ap">Singapore</option></select></span></div>`,
    open: "0",
    ready: { react: ".basalt-select-popup", skill: "select#r" },
    after: {
      react: async (page) => { await page.locator(".basalt-select-item").nth(2).hover(); },
      skill: async (page) => { await page.locator("select#r").click(); await page.waitForFunction(() => document.querySelector("select#r").matches(":open")); await page.locator("select#r option[value=ap]").hover(); },
    },
    pairs: [
      ["popup", ".basalt-select-popup", "select#r", [...PANEL, ...PAD, "minWidth", ...ENTRY, "transformOrigin"], { skillPseudo: "::picker(select)" }],
      ["item", ".basalt-select-item[data-described]", "option[value=eu]", [...GEOMETRY, ...TYPE, "color", "boxHeight", "cursor"]],
      ["item plate", ".basalt-select-item[data-described]", "option[value=eu]", ["top", "bottom", "borderTopLeftRadius", "backgroundColor", "boxHeight"], { pseudo: "::before" }],
      ["selected item", ".basalt-select-item[data-selected]", "option[value=us]", [...GEOMETRY, ...TYPE, "color", "boxHeight"]],
      ["lit item", ".basalt-select-item[data-highlighted]", "option[value=ap]", [...GEOMETRY, ...TYPE, "color", "backgroundColor", "boxHeight"]],
      // React's rows keep a transparent plate while its shared glide plate is live, and the glide plate is what paints; the skill's native popup has no glide, so its row paints its own plate.
      // The row plate's own geometry is compared, and the look of the glide plate is compared with the skill's plate.
      ["lit plate", ".basalt-select-item[data-highlighted]", "option[value=ap]", ["top", "bottom", "borderTopLeftRadius", "backgroundColor", "boxHeight"], { pseudo: "::before" }],
      ["glide plate, against the row's plate", ".basalt-plate", "option[value=ap]", ["backgroundColor", "borderTopLeftRadius", "boxHeight"], { skillPseudo: "::before" }],
      ["described item", ".basalt-select-item[data-described]", "option[value=eu]", ["boxHeight", "gridTemplateRows"]],
      ["description", ".basalt-menu-item-description", ".option-description", [...TYPE, "color", "boxHeight", "whiteSpace", "textOverflow"]],
      ["check", ".basalt-select-item[data-selected] .basalt-select-check svg", "option[value=us]", ["boxWidth", "boxHeight", "ink"], { skillPseudo: "::checkmark" }],
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


// ---- Figures and charts (skill-parity-5): the description list, the meter, the stat's source line, the terminal and the time chart ----
const FIG_TEXT = [...TYPE, "color"];
const CHART_DAYS = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"];
const BAR = { values: [48, 52, null, 61, 33, 70, 0, 45, 58, 34], reasons: [null, null, "not worn", null, null, null, null, null, null, null] };
const RING = { values: [440, 450, 420, null, null, 470, 480, 430, 455, 460], reasons: [null, null, null, "ring charging", "ring charging", null, null, null, null, null] };
const WATCH = { values: [430, 445, 410, 400, 415, 460, 470, 425, null, null], reasons: [null, null, null, null, null, null, null, null, "not worn, travel", "not worn, travel"] };
const BAND = CHART_DAYS.map((_, i) => (i < 6 ? [420, 540] : [450, 540]));
const DAYS_JSON = JSON.stringify(CHART_DAYS);
const reactChart = (extra) => `<div style={{ width: 640 }}><TimeChart now={Date.UTC(2026, 10, 10, 12)} ${extra} /></div>`;
const barChartReact = reactChart(`title="Training" source="Watch" kind="bar" days={${DAYS_JSON}} series={[{ id: "t", name: "Training", values: ${JSON.stringify(BAR.values)}, reasons: ${JSON.stringify(BAR.reasons)} }]} plan={{ kind: "value", label: "Goal", values: [45, 45, 45, 45, 45, 45, 45, 45, 45, 45] }} partial={9} unit="min" format={(v) => Math.round(v) + " min"} spoken={(v) => Math.round(v) + " minutes"} summary="Training averaged 54 min a day."`);
const lineChartReact = reactChart(`title="Sleep" source="Ring and watch" kind="line" days={${DAYS_JSON}} series={[{ id: "ring", name: "Ring", values: ${JSON.stringify(RING.values)}, reasons: ${JSON.stringify(RING.reasons)} }, { id: "watch", name: "Watch", values: ${JSON.stringify(WATCH.values)}, reasons: ${JSON.stringify(WATCH.reasons)} }]} plan={{ kind: "band", values: ${JSON.stringify(BAND)} }} step={60} unit="h" formatTick={(v) => String(v / 60)} format={(m) => { const h = Math.floor(m / 60); const r = Math.round(m - h * 60); return r ? h + " h " + r + " m" : h + " h"; }} spoken={(m) => { const h = Math.floor(m / 60); const r = Math.round(m - h * 60); return h + (h === 1 ? " hour" : " hours") + (r ? " " + r + (r === 1 ? " minute" : " minutes") : ""); }} summary="Ring averaged 7 h 20 m."`);
const skillChart = (data) => `<div style="width: 640px"><figure class="chart"><script type="application/json" data-chart>${JSON.stringify({ now: "2026-11-10", days: CHART_DAYS, ...data })}</script></figure></div>`;
const barChartSkill = skillChart({ title: "Training", source: "Watch", kind: "bar", unit: "min", summary: "Training averaged 54 min a day.", partial: 9, series: [{ id: "t", name: "Training", ...BAR }], plan: { kind: "value", label: "Goal", values: BAR.values.map(() => 45) }, format: { suffix: " min", spoken: " minutes", maximumFractionDigits: 0 } });
const lineChartSkill = skillChart({ title: "Sleep", source: "Ring and watch", kind: "line", unit: "h", tickDivisor: 60, step: 60, summary: "Ring averaged 7 h 20 m.", series: [{ id: "ring", name: "Ring", ...RING }, { id: "watch", name: "Watch", ...WATCH }], plan: { kind: "band", values: BAND }, format: { duration: "minutes" } });
const chartPairs = (kind) => [
  ["figure", ".basalt-chart", ".chart", ["boxWidth", "boxHeight", "display", "flexDirection", "gap", "fontFamily"]],
  ["title", ".basalt-chart-title", ".chart-title", [...FIG_TEXT, "boxHeight", "marginTop"]],
  ["source", ".basalt-chart-source", ".chart-source", [...FIG_TEXT, "boxHeight", "fontVariantNumeric"]],
  ["date", ".basalt-chart-date", ".chart-date", [...FIG_TEXT, "boxWidth", "boxHeight", "whiteSpace"]],
  ["legend", ".basalt-chart-legend", ".chart-legend", ["display", "flexWrap", "rowGap", "columnGap", "boxHeight", "paddingLeft", "listStyleType"]],
  ["entry", ".basalt-chart-entry", ".chart-entry", ["display", "gap", "boxWidth", "boxHeight", "whiteSpace"]],
  ["swatch", ".basalt-chart-swatch", ".chart-swatch", ["boxWidth", "boxHeight", "overflowX", "childCount"]],
  ["name", ".basalt-chart-name", ".chart-name", [...FIG_TEXT, "boxWidth"]],
  ["value", ".basalt-chart-value", ".chart-value", [...FIG_TEXT, "boxWidth", "boxHeight", "display"]],
  ["plot", ".basalt-chart-plot", ".chart-plot", ["boxWidth", "boxHeight", "minHeight", "touchAction", "userSelect"]],
  ["svg", ".basalt-chart-svg", ".chart-svg", ["boxWidth", "boxHeight", "display", "childCount"]],
  ["svg words", ".basalt-chart-svg", ".chart-svg", ["words"]],
  ["grid", ".basalt-chart-grid", ".chart-grid", ["stroke", "strokeWidth", "attrX", "attrY"]],
  ["axis", ".basalt-chart-axis", ".chart-axis", ["fill", ...TYPE, "fontVariantNumeric", "attrX", "attrY", "attrAnchor", "dominantBaseline"]],
  ["lane", ".basalt-chart-lane", ".chart-lane", ["fill", ...TYPE, "attrX", "attrY"]],
  ["hatch", ".basalt-chart-hatch", ".chart-hatch", ["attrX", "attrY", "attrW", "attrH", "paint"]],
  ["hatch line", "pattern .basalt-chart-hatch-line", "pattern .chart-hatch-line", ["stroke", "strokeWidth"]],
  ["hatch tile", "pattern", "pattern", ["attrW", "attrH"]],
  ["day", ".basalt-chart-day", ".chart-day", ["boxWidth", "boxHeight", "borderTopLeftRadius", "position", "outlineStyle"]],
  ["days", ".basalt-chart-days", ".chart-days", ["position", "pointerEvents", "boxHeight"]],
  ["hint", ".basalt-chart-hint", ".chart-hint", [...FIG_TEXT, "display", "gap", "boxHeight"]],
  ["foot", ".basalt-chart-foot", ".chart-foot", ["display", "boxHeight", "order"]],
  ["table button", ".basalt-chart-toggle", ".chart-toggle", [...GEOMETRY, ...TYPE, ...COLOUR]],
  ["summary", ".basalt-chart-summary", ".chart-summary", [...FIG_TEXT, "boxWidth", "boxHeight", "maxWidth", "order"]],
  ["table region", ".basalt-chart-table", ".chart-table", ["order", "display"]],
  ["day focus ring", ".basalt-chart-day[tabindex='0']", ".chart-day[tabindex='0']", [...OUTLINE, "boxWidth", "boxHeight"], { focus: true }],
  ["table button focus ring", ".basalt-chart-toggle", ".chart-toggle", OUTLINE, { focus: true }],
  ...(kind === "bar" ? [
    ["bar", ".basalt-chart-bar:not([data-so-far])", ".chart-bar:not([data-so-far])", ["fill", "attrX", "attrY", "attrW", "attrH"]],
    ["so-far bar", "svg .basalt-chart-bar[data-so-far]", "svg .chart-bar[data-so-far]", ["fill", "stroke", "strokeWidth", "attrX", "attrY", "attrW", "attrH"]],
    ["plan", ".basalt-chart-plan:not(.basalt-chart-swatch *)", ".chart-plan:not(.chart-swatch *)", ["stroke", "strokeWidth", "strokeLinecap", "attrX", "attrY"]],
    ["cut", ".basalt-chart-cut", ".chart-cut", ["fill", "attrX", "attrY", "attrW", "attrH"]],
    ["baseline", ".basalt-chart-baseline", ".chart-baseline", ["stroke", "strokeWidth", "attrX", "attrY"]],
    ["legend bar swatch", ".basalt-chart-swatch .basalt-chart-bar", ".chart-swatch .chart-bar", ["fill", "attrX", "attrY", "attrW", "attrH"]],
  ] : [
    ["line", ".basalt-chart-series .basalt-chart-line", ".chart-series .chart-line", ["fill", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin", "strokeDasharray", "attrD"]],
    ["dashed line", ".basalt-chart-series[data-series=watch] .basalt-chart-line", ".chart-series[data-series=watch] .chart-line", ["stroke", "strokeDasharray", "strokeLinecap", "attrD"]],
    ["mark", ".basalt-chart-mark", ".chart-mark", ["fill", "attrX", "attrY", "attrW", "attrH"]],
    ["ring", ".basalt-chart-ring", ".chart-ring", ["fill"]],
    ["band", ".basalt-chart-band", ".chart-band", ["fill", "attrX", "attrY", "attrW", "attrH"]],
    ["band edge", ".basalt-chart-band-edge", ".chart-band-edge", ["stroke", "strokeWidth", "attrX", "attrY"]],
    ["direct label", ".basalt-chart-direct", ".chart-direct", ["fill", ...TYPE, "attrX", "attrY"]],
  ]),
];

// A replay starts idle with no lines, so the pairs that read a line are for the static transcript only (the replay's own lines are read in parity-5.test.mjs).
const LINE_PAIRS = new Set(["lines", "command line", "prompt gutter", "command text", "output line", "done mark", "warning mark", "error mark", "error text"]);
const FIGURES = [
  {
    id: "description list",
    react: `<div style={{ width: 640 }}><DescriptionList data-testid="list"><DescriptionItem term="ID" mono>sb_7f3a91c2e0</DescriptionItem><DescriptionItem term="Region">Ashburn (us-east)</DescriptionItem><DescriptionItem term="Allowed hosts" mono values={["api.example.test", "cdn.example.test"]} /><DescriptionItem term="Last seen" missing /></DescriptionList></div><div style={{ width: 360 }}><DescriptionList data-testid="narrow"><DescriptionItem term="Region">Ashburn (us-east)</DescriptionItem></DescriptionList></div>`,
    skill: `<div style="width: 640px"><dl class="dlist"><div><dt>ID</dt><dd data-mono>sb_7f3a91c2e0</dd></div><div><dt>Region</dt><dd>Ashburn (us-east)</dd></div><div><dt>Allowed hosts</dt><dd data-mono>api.example.test</dd><dd data-mono>cdn.example.test</dd></div><div><dt>Last seen</dt><dd data-missing>Not observed</dd></div></dl></div><div style="width: 360px"><dl class="dlist" data-narrow><div><dt>Region</dt><dd>Ashburn (us-east)</dd></div></dl></div>`,
    pairs: [
      ["list", "[data-testid=list]", ".dlist:not([data-narrow])", ["boxWidth", "boxHeight", "display", "fontFamily", "marginTop", "paddingTop", "containerType"]],
      ["row", ".basalt-description-item:nth-child(2)", ".dlist > div:nth-child(2)", ["boxHeight", "display", "gridTemplateColumns", "columnGap", "paddingTop", "paddingBottom", "boxShadow", "alignItems"]],
      ["first row", ".basalt-description-item:first-child", ".dlist > div:first-child", ["boxHeight", "paddingTop", "paddingBottom", "boxShadow"]],
      ["last row", ".basalt-description-item:last-child", ".dlist > div:last-child", ["boxHeight", "paddingTop", "paddingBottom", "boxShadow"]],
      ["term", ".basalt-description-item:nth-child(2) .basalt-description-term", ".dlist > div:nth-child(2) dt", [...FIG_TEXT, "boxWidth", "boxHeight", "marginTop"]],
      ["value", ".basalt-description-item:nth-child(2) .basalt-description-details", ".dlist > div:nth-child(2) dd", [...FIG_TEXT, "boxWidth", "boxHeight", "fontVariantNumeric", "marginTop", "fontFamily"]],
      ["mono value", ".basalt-description-details[data-mono]", ".dlist dd[data-mono]", [...FIG_TEXT, "fontFamily", "boxHeight"]],
      ["second value", ".basalt-description-item:nth-child(3) .basalt-description-details:nth-of-type(2)", ".dlist > div:nth-child(3) dd:nth-of-type(2)", ["gridColumnStart", "marginTop", "rectLeft"]],
      ["missing value", ".basalt-description-details[data-missing]", ".dlist dd[data-missing]", [...FIG_TEXT, "boxHeight"]],
      ["stacked row", "[data-testid=narrow] .basalt-description-item", ".dlist[data-narrow] > div", ["boxHeight", "gridTemplateColumns", "rowGap"]],
      ["stacked value", "[data-testid=narrow] .basalt-description-details", ".dlist[data-narrow] dd", ["relTop", "marginTop"]],
    ],
  },
  {
    id: "meter",
    react: `<div style={{ width: 640 }}><Meter label="Build minutes" value={2240} max={3000} target={2500} unit="min" /></div><div style={{ width: 640 }}><Meter data-over="" label="Bandwidth" value={124000} max={100000} unit="GB" /></div>`,
    skill: `<div style="width: 640px"><div class="meter" role="meter" aria-labelledby="m1" aria-valuemin="0" aria-valuemax="3000" aria-valuenow="2240" aria-valuetext="x" style="--value: 74.6667%; --target: 83.3333%"><div class="meter-head"><span class="meter-label" id="m1">Build minutes</span><span class="meter-reading"><span class="meter-value">2,240</span> of 3,000 min</span></div><div class="meter-track"><span class="meter-fill"></span><span class="meter-tick"></span></div><div class="meter-foot"><span class="meter-left">760 min left</span><span class="meter-target">Target 2,500 min</span></div></div></div><div style="width: 640px"><div class="meter" data-over role="meter" aria-labelledby="m2" aria-valuemin="0" aria-valuemax="100000" aria-valuenow="100000" aria-valuetext="x" style="--value: 124%"><div class="meter-head"><span class="meter-label" id="m2">Bandwidth</span><span class="meter-reading"><span class="meter-value">124,000</span> of 100,000 GB</span></div><div class="meter-track"><span class="meter-fill"></span></div><div class="meter-foot"><span class="meter-left" data-over>24,000 over</span></div></div></div>`,
    pairs: [
      ["meter", ".basalt-meter:not([data-over])", ".meter:not([data-over])", ["boxWidth", "boxHeight", "display", "gap", "fontSize", "fontWeight", "lineHeight", "fontFamily", "color"]],
      ["head", ".basalt-meter:not([data-over]) .basalt-meter-head", ".meter:not([data-over]) .meter-head", ["display", "justifyContent", "alignItems", "gap", "boxHeight"]],
      ["label", ".basalt-meter:not([data-over]) .basalt-meter-label", ".meter:not([data-over]) .meter-label", [...FIG_TEXT, "boxWidth", "boxHeight"]],
      ["reading", ".basalt-meter:not([data-over]) .basalt-meter-now", ".meter:not([data-over]) .meter-reading", [...FIG_TEXT, "roundWidth", "boxHeight", "fontVariantNumeric", "whiteSpace"]],
      ["reading value", ".basalt-meter:not([data-over]) .basalt-meter-now .basalt-meter-value", ".meter:not([data-over]) .meter-value", [...FIG_TEXT, "boxWidth"]],
      ["slot", ".basalt-meter:not([data-over]) .basalt-meter-track", ".meter:not([data-over]) .meter-track", ["boxWidth", "boxHeight", "paddingTop", "marginTop", "marginBottom", "borderTopLeftRadius", "borderTopColor", "borderTopWidth", "backgroundColor", "boxSizing"]],
      ["fill", ".basalt-meter:not([data-over]) .basalt-meter-fill", ".meter:not([data-over]) .meter-fill", ["boxWidth", "boxHeight", "backgroundColor", "borderTopLeftRadius", "position", "rectLeft", "relTop", "transitionProperty", "transitionDuration", "transitionTimingFunction"]],
      ["tick", ".basalt-meter:not([data-over]) .basalt-meter-tick", ".meter:not([data-over]) .meter-tick", ["boxWidth", "boxHeight", "backgroundColor", "backgroundClip", "borderLeftWidth", "borderLeftColor", "borderRightColor", "rectLeft", "relTop", "marginLeft"]],
      ["foot", ".basalt-meter:not([data-over]) .basalt-meter-foot", ".meter:not([data-over]) .meter-foot", [...FIG_TEXT, "display", "boxHeight", "minHeight", "alignItems", "fontVariantNumeric"]],
      ["left", ".basalt-meter:not([data-over]) .basalt-meter-left", ".meter:not([data-over]) .meter-left", [...FIG_TEXT, "boxWidth"]],
      ["target", ".basalt-meter:not([data-over]) .basalt-meter-target", ".meter:not([data-over]) .meter-target", [...FIG_TEXT, "roundWidth", "boxHeight", "display", "gap", "whiteSpace", "roundMarginLeft"]],
      ["target mark", ".basalt-meter:not([data-over]) .basalt-meter-target", ".meter:not([data-over]) .meter-target", ["boxWidth", "boxHeight", "backgroundColor"], { pseudo: "::before" }],
      ["over fill", ".basalt-meter[data-over] .basalt-meter-fill", ".meter[data-over] .meter-fill", ["boxWidth", "backgroundColor"]],
      ["over words", ".basalt-meter-left[data-over]", ".meter-left[data-over]", [...FIG_TEXT, "boxWidth"]],
    ],
  },
  {
    id: "stat",
    react: `<div style={{ width: 640 }}><Stats><Stat label="Weight" value="78.4 kg" note="−0.6 kg this week" source="Scale" time={Date.UTC(2026, 10, 10, 4, 41)} timeZone="UTC" now={Date.UTC(2026, 10, 10, 12)} /><Stat label="Sleep" value="7 h 20 m" source="Ring" /></Stats></div>`,
    skill: `<div style="width: 640px"><dl class="stats"><div class="stat"><dt class="stat-label">Weight</dt><dd class="stat-value">78.4 kg</dd><dd class="stat-note">−0.6 kg this week</dd><dd class="stat-source"><time datetime="2026-11-10T04:41">04:41</time> <span aria-hidden="true">·</span><span class="visually-hidden">, </span> Scale</dd></div><div class="stat"><dt class="stat-label">Sleep</dt><dd class="stat-value">7 h 20 m</dd><dd class="stat-source">Ring</dd></div></dl></div>`,
    pairs: [
      ["stats", ".basalt-stats", ".stats", ["boxWidth", "boxHeight", "display", "gridTemplateColumns", "gap", "marginTop", "paddingTop", "fontFamily"]],
      ["stat", ".basalt-stat:first-child", ".stat:first-child", ["boxWidth", "boxHeight", "display", "flexDirection", "gap", "marginTop", "paddingTop"]],
      ["label", ".basalt-stat-label", ".stat-label", [...FIG_TEXT, "boxHeight", "marginTop"]],
      ["value", ".basalt-stat-value", ".stat-value", [...FIG_TEXT, "boxHeight", "fontVariantNumeric", "marginTop"]],
      ["note", ".basalt-stat-note", ".stat-note", [...FIG_TEXT, "boxHeight", "marginTop"]],
      ["source", ".basalt-stat:first-child .basalt-stat-source", ".stat:first-child .stat-source", [...FIG_TEXT, "boxHeight", "relTop", "fontVariantNumeric", "marginTop"]],
      ["source, no note", ".basalt-stat:last-child .basalt-stat-source", ".stat:last-child .stat-source", ["relTop", "boxHeight", "marginTop"]],
    ],
  },
  ...[["terminal", ""], ["terminal replay", " replay"]].map(([id, replay]) => ({
    id,
    react: `<div style={{ width: 640 }}><Terminal title="Deploy preview"${replay} lines={[{ kind: "command", text: "npm run build" }, { kind: "output", text: "vite building" }, { kind: "done", text: "Built in 4.2 s" }, { kind: "warning", text: "Chunk is large" }, { kind: "error", text: "Failed to push" }]} /></div><div style={{ width: 400 }}><Terminal title="Narrow"${replay} lines={[{ kind: "command", text: "ls" }]} /></div>`,
    skill: `<div style="width: 640px"><figure class="code terminal"${replay ? " data-replay" : ""}><figcaption>Deploy preview</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="command">npm run build</span><span data-kind="output">vite building</span><span data-kind="done">Built in 4.2 s</span><span data-kind="warning">Chunk is large</span><span data-kind="error">Failed to push</span></code></pre></figure></div><div style="width: 400px"><figure class="code terminal" data-narrow${replay ? " data-replay" : ""}><figcaption>Narrow</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="command">ls</span></code></pre></figure></div>`,
    pairs: [
      ["well", ".basalt-terminal", ".terminal", ["boxWidth", "boxHeight", "backgroundColor", "borderTopLeftRadius", "borderTopColor", "borderTopWidth", "borderLeftColor", "borderBottomColor", "color", "boxShadow", "position"]],
      ["head", ".basalt-code-title", ".terminal .code-head", ["boxHeight", ...FIG_TEXT, "display", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "boxShadow", "borderBottomWidth", "justifyContent", "alignItems"]],
      ["title", ".basalt-terminal-title", ".terminal-title", [...FIG_TEXT, "boxWidth", "boxHeight"]],
      ["body", ".basalt-code-pre", ".terminal .code-body", ["boxHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontFamily", "fontSize", "lineHeight", "overflowX", "outlineStyle", "whiteSpace", ...(replay ? ["blockSize"] : [])]],
      ["body focus ring", ".basalt-code-pre", ".terminal .code-body", OUTLINE, { focus: true }],
      ["lines", ".basalt-code-lines", ".terminal-lines", ["display", "gridTemplateColumns", "boxWidth", "boxHeight"]],
      ["command line", ".basalt-code-line[data-kind=command]", ".terminal-line[data-kind=command]", [...FIG_TEXT, "boxHeight", "minHeight", "display"]],
      ["prompt gutter", ".basalt-code-line[data-kind=command] .basalt-code-gutter", ".terminal-line[data-kind=command] .terminal-gutter", [...FIG_TEXT, "boxWidth", "paddingRight", "userSelect"]],
      ["command text", ".basalt-code-line[data-kind=command] .basalt-code-text", ".terminal-line[data-kind=command] .terminal-text", [...FIG_TEXT, "boxWidth", "rectLeft"]],
      ["output line", ".basalt-code-line[data-kind=output]", ".terminal-line[data-kind=output]", [...FIG_TEXT, "boxHeight"]],
      ["done mark", ".basalt-code-line[data-kind=done] .basalt-terminal-mark", ".terminal-line[data-kind=done] .terminal-mark", ["color", "boxWidth", "boxHeight", "display", "marginTop", "marginBottom", "rectLeft"]],
      ["warning mark", ".basalt-code-line[data-kind=warning] .basalt-terminal-mark", ".terminal-line[data-kind=warning] .terminal-mark", ["color", "boxWidth", "boxHeight"]],
      ["error mark", ".basalt-code-line[data-kind=error] .basalt-terminal-mark", ".terminal-line[data-kind=error] .terminal-mark", ["color", "boxWidth", "boxHeight"]],
      ["error text", ".basalt-code-line[data-kind=error] .basalt-code-text", ".terminal-line[data-kind=error] .terminal-text", ["color"]],
      ["copy button", ".basalt-terminal:not(.x) .basalt-terminal-copy", ".terminal:not([data-narrow]) .terminal-copy", [...GEOMETRY, ...TYPE, ...COLOUR, "boxWidth", "display", "marginRight"]],
      ["compact copy, wide", ".basalt-terminal-copy-compact", ".terminal-copy-compact", ["display"]],
      ["actions", ".basalt-terminal-actions", ".terminal-actions", ["display", "boxHeight", "justifyContent", "gap", "marginLeft", "marginRight"]],
      // At 400px of its own width the wide copy button gives way to the icon alone (the container query, 480px).
      ["narrow wide copy", "div:nth-child(2) .basalt-terminal-copy", "div:nth-child(2) .terminal-copy", ["display"]],
      ["narrow compact copy", "div:nth-child(2) .basalt-terminal-copy-compact", "div:nth-child(2) .terminal-copy-compact", [...GEOMETRY, ...COLOUR, "display", "boxWidth", "boxHeight"]],
      ...(replay ? [
        ["state", ".basalt-terminal-state", ".terminal-state", [...FIG_TEXT, "boxWidth", "boxHeight", "display"]],
        ["control", ".basalt-terminal-actions > .basalt-button:not(.basalt-terminal-copy)", ".terminal-control", [...GEOMETRY, ...TYPE, ...COLOUR, "boxWidth"]],
        ["hint", ".basalt-terminal-hint", ".terminal-hint", [...FIG_TEXT, "marginLeft", "boxHeight", "gridColumnStart"]],
      ] : []),
    ].filter(([label]) => !replay || !LINE_PAIRS.has(label)),
  })),
  { id: "chart, bars", react: barChartReact, skill: barChartSkill, pairs: chartPairs("bar") },
  { id: "chart, lines", react: lineChartReact, skill: lineChartSkill, pairs: chartPairs("line") },
];
CASES.push(...FIGURES);

// ---- Forms and selection (skill-parity-6): checkbox, radio, switch, the select's trigger, the choice card, the pressed toggle, table selection ----
const BOXPROPS = ["boxWidth", "boxHeight", "borderTopLeftRadius", "backgroundColor", "boxShadow", "color", "opacity", "borderTopWidth", "cursor"];
const LABEL = [...TYPE, "color", "display", "alignItems", "gap", "boxHeight", "cursor"];
const CHOICES = [
  {
    id: "checkbox",
    react: `<><Checkbox aria-label="Off" /><Checkbox aria-label="On" defaultChecked /><Checkbox aria-label="Mixed" indeterminate /><Checkbox aria-label="Disabled on" defaultChecked disabled /><Checkbox aria-label="Disabled off" disabled /><Checkbox>Labelled</Checkbox><Checkbox disabled>Off label</Checkbox></>`,
    skill: `<input type="checkbox" aria-label="Off"><input type="checkbox" aria-label="On" checked><input type="checkbox" aria-label="Mixed"><script>document.querySelector("[aria-label=Mixed]").indeterminate = true</script><input type="checkbox" aria-label="Disabled on" checked disabled><input type="checkbox" aria-label="Disabled off" disabled><label class="choice"><input type="checkbox"> Labelled</label><label class="choice"><input type="checkbox" disabled> Off label</label>`,
    pairs: [
      ["off", ".basalt-checkbox[aria-label=Off]", "input[aria-label=Off]", BOXPROPS],
      ["on", ".basalt-checkbox[aria-label=On]", "input[aria-label=On]", BOXPROPS],
      ["mixed", ".basalt-checkbox[aria-label=Mixed]", "input[aria-label=Mixed]", BOXPROPS],
      ["disabled on", ".basalt-checkbox[aria-label='Disabled on']", "input[aria-label='Disabled on']", BOXPROPS],
      ["disabled off", ".basalt-checkbox[aria-label='Disabled off']", "input[aria-label='Disabled off']", BOXPROPS],
      ["check", ".basalt-checkbox[aria-label=On] .basalt-checkbox-indicator svg", "input[aria-label=On]", ["boxWidth", "boxHeight", "ink"], { skillPseudo: "::before" }],
      ["mixed mark", ".basalt-checkbox[aria-label=Mixed] .basalt-checkbox-indicator svg", "input[aria-label=Mixed]", ["boxWidth", "boxHeight", "ink"], { skillPseudo: "::before" }],
      ["focus ring", ".basalt-checkbox[aria-label=Off]", "input[aria-label=Off]", OUTLINE, { focus: true }],
      ["label", ".basalt-choice:not(:has([data-disabled]))", ".choice:not(:has(:disabled))", LABEL],
      ["box in label", ".basalt-choice:not(:has([data-disabled])) .basalt-checkbox", ".choice:not(:has(:disabled)) input", ["inLeft", "inTop"]],
      ["label, disabled", ".basalt-choice:has([data-disabled])", ".choice:has(:disabled)", LABEL],
    ],
  },
  {
    id: "radio",
    react: `<RadioGroup aria-label="Plan" defaultValue="a"><Radio value="a">A</Radio><Radio value="b">B</Radio><Radio value="c" disabled>C</Radio></RadioGroup>`,
    skill: `<div class="radio-group" role="radiogroup" aria-label="Plan"><label class="choice"><input type="radio" name="size" value="a" checked> A</label><label class="choice"><input type="radio" name="size" value="b"> B</label><label class="choice"><input type="radio" name="size" value="c" disabled> C</label></div>`,
    pairs: [
      ["group", ".basalt-radio-group", ".radio-group", ["display", "flexDirection", "gap", "boxHeight"]],
      ["on", ".basalt-radio[data-checked]", "input[type=radio]:checked", BOXPROPS],
      ["off", ".basalt-radio[data-unchecked]:not([data-disabled])", "input[type=radio]:not(:checked):not(:disabled)", BOXPROPS],
      ["disabled", ".basalt-radio[data-disabled]", "input[type=radio]:disabled", BOXPROPS],
      ["dot", ".basalt-radio[data-checked] .basalt-radio-indicator", "input[type=radio]:checked", ["boxWidth", "boxHeight", "borderTopLeftRadius", "ink"], { skillPseudo: "::before" }],
      ["focus ring", ".basalt-radio[data-checked]", "input[type=radio]:checked", OUTLINE, { focus: true }],
      ["label", ".basalt-choice:first-child", ".choice:first-child", LABEL],
      ["radio in label", ".basalt-choice:first-child .basalt-radio", ".choice:first-child input", ["inLeft", "inTop"]],
    ],
  },
  {
    id: "switch",
    react: `<><Switch aria-label="Off" /><Switch aria-label="On" defaultChecked /><Switch aria-label="Disabled" disabled defaultChecked /><Switch>Auto-deploy</Switch></>`,
    skill: `<input type="checkbox" role="switch" aria-label="Off"><input type="checkbox" role="switch" aria-label="On" checked><input type="checkbox" role="switch" aria-label="Disabled" disabled checked><label class="choice"><input type="checkbox" role="switch"> Auto-deploy</label>`,
    pairs: [
      ["off", ".basalt-switch[aria-label=Off]", "input[aria-label=Off]", [...BOXPROPS, "paddingLeft", "paddingRight"]],
      ["on", ".basalt-switch[aria-label=On]", "input[aria-label=On]", [...BOXPROPS, "paddingLeft"]],
      ["disabled", ".basalt-switch[aria-label=Disabled]", "input[aria-label=Disabled]", BOXPROPS],
      ["thumb off", ".basalt-switch[aria-label=Off] .basalt-switch-thumb", "input[aria-label=Off]", ["boxWidth", "boxHeight", "borderTopLeftRadius", "backgroundColor", "transform", "transitionProperty", "transitionDuration"], { skillPseudo: "::before" }],
      ["thumb on", ".basalt-switch[aria-label=On] .basalt-switch-thumb", "input[aria-label=On]", ["boxWidth", "boxHeight", "backgroundColor", "transform"], { skillPseudo: "::before" }],
      ["focus ring", ".basalt-switch[aria-label=Off]", "input[aria-label=Off]", OUTLINE, { focus: true }],
      ["label", ".basalt-choice", ".choice", LABEL],
      ["switch in label", ".basalt-choice .basalt-switch", ".choice input", ["inLeft", "inTop"]],
    ],
  },
  {
    id: "select",
    react: `<div style={{ width: 320 }}><Select aria-label="Empty" placeholder="Select…" options={[{ value: "eu", label: "Frankfurt" }, { value: "us", label: "Ashburn" }]} /></div><div style={{ width: 320 }}><Select aria-label="Chosen" defaultValue="eu" options={[{ value: "eu", label: "Frankfurt" }, { value: "us", label: "Ashburn" }]} /></div><div style={{ width: 320 }}><Select aria-label="Small" controlSize="sm" defaultValue="eu" options={[{ value: "eu", label: "Frankfurt" }]} /></div><div style={{ width: 320 }}><Select aria-label="Large" controlSize="lg" defaultValue="eu" options={[{ value: "eu", label: "Frankfurt" }]} /></div><div style={{ width: 320 }}><Select aria-label="Disabled" disabled defaultValue="eu" options={[{ value: "eu", label: "Frankfurt" }]} /></div>`,
    skill: `<div style="width: 320px"><span class="select"><select class="input" aria-label="Empty"><option value="" disabled selected hidden>Select…</option><option value="eu">Frankfurt</option><option value="us">Ashburn</option></select></span></div><div style="width: 320px"><span class="select"><select class="input" aria-label="Chosen"><option value="eu" selected>Frankfurt</option><option value="us">Ashburn</option></select></span></div><div style="width: 320px"><span class="select"><select class="input" data-size="sm" aria-label="Small"><option value="eu">Frankfurt</option></select></span></div><div style="width: 320px"><span class="select"><select class="input" data-size="lg" aria-label="Large"><option value="eu">Frankfurt</option></select></span></div><div style="width: 320px"><span class="select"><select class="input" aria-label="Disabled" disabled><option value="eu">Frankfurt</option></select></span></div>`,
    pairs: [
      ["trigger", ".basalt-select-trigger[aria-label=Chosen]", "select[aria-label=Chosen]", [...BOX, "boxWidth", "display", "alignItems", "justifyContent", "gap", "minWidth", "cursor", "textAlign"]],
      ["empty", ".basalt-select-trigger[aria-label=Empty]", "select[aria-label=Empty]", [...GEOMETRY, "boxWidth"]],
      ["empty value", ".basalt-select-trigger[aria-label=Empty] .basalt-select-value", "select[aria-label=Empty]", ["color"]],
      ["small", ".basalt-select-trigger[aria-label=Small]", "select[aria-label=Small]", [...GEOMETRY, "fontSize", "boxWidth"]],
      ["large", ".basalt-select-trigger[aria-label=Large]", "select[aria-label=Large]", [...GEOMETRY, "fontSize", "boxWidth"]],
      ["disabled", ".basalt-select-trigger[aria-label=Disabled]", "select[aria-label=Disabled]", [...COLOUR, "cursor"]],
      ["icon", ".basalt-select-trigger[aria-label=Chosen] .basalt-select-icon svg", "select[aria-label=Chosen]", ["boxWidth", "boxHeight", "ink"], { skillPseudo: "::picker-icon" }],
      ["focus ring", ".basalt-select-trigger[aria-label=Chosen]", "select[aria-label=Chosen]", [...OUTLINE, "boxShadow"], { focus: true }],
    ],
  },
  {
    id: "choice card",
    react: `<div style={{ width: 640 }}><ChoiceCardGroup aria-label="Plan"><ChoiceCard title="Pro" description="For teams that deploy daily." name="plan" value="pro" defaultChecked /><ChoiceCard title="Free" description="For trying it out." name="plan" value="free" /><ChoiceCard title="Off" description="Not available." name="plan" value="off" disabled /></ChoiceCardGroup></div><div style={{ width: 640 }}><ChoiceCardGroup multiple aria-label="Extras"><ChoiceCard multiple title="Logs" description="Keep ninety days." name="x" value="logs" defaultChecked /><ChoiceCard multiple title="Alerts" description="Page on failure." name="y" value="alerts" /></ChoiceCardGroup></div>`,
    skill: `<div style="width: 640px"><div class="choice-card-group" role="radiogroup" aria-label="Plan"><label class="panel choice-card"><input class="choice-card-input" type="radio" name="plan" value="pro" checked aria-labelledby="c1t" aria-describedby="c1d"><span class="choice-card-head"><span class="choice-card-title" id="c1t">Pro</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c1d">For teams that deploy daily.</span></label><label class="panel choice-card"><input class="choice-card-input" type="radio" name="plan" value="free" aria-labelledby="c2t" aria-describedby="c2d"><span class="choice-card-head"><span class="choice-card-title" id="c2t">Free</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c2d">For trying it out.</span></label><label class="panel choice-card"><input class="choice-card-input" type="radio" name="plan" value="off" disabled aria-labelledby="c3t" aria-describedby="c3d"><span class="choice-card-head"><span class="choice-card-title" id="c3t">Off</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c3d">Not available.</span></label></div></div><div style="width: 640px"><div class="choice-card-group" role="group" aria-label="Extras"><label class="panel choice-card"><input class="choice-card-input" type="checkbox" name="x" value="logs" checked aria-labelledby="c4t" aria-describedby="c4d"><span class="choice-card-head"><span class="choice-card-title" id="c4t">Logs</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c4d">Keep ninety days.</span></label><label class="panel choice-card"><input class="choice-card-input" type="checkbox" name="y" value="alerts" aria-labelledby="c5t" aria-describedby="c5d"><span class="choice-card-head"><span class="choice-card-title" id="c5t">Alerts</span><span class="choice-card-box" aria-hidden="true"></span></span><span class="choice-card-description" id="c5d">Page on failure.</span></label></div></div>`,
    pairs: [
      ["group", ".basalt-choice-card-group:first-child", ".choice-card-group[role=radiogroup]", ["display", "gridTemplateColumns", "gap", "boxWidth", "boxHeight"]],
      ["selected card", ".basalt-choice-card:has(input[value=pro])", ".choice-card:has(input[value=pro])", [...PANEL, "boxWidth", "boxHeight", "paddingBottom", "cursor", "borderTopLeftRadius"]],
      ["unselected card", ".basalt-choice-card:has(input[value=free])", ".choice-card:has(input[value=free])", [...PANEL, "boxWidth", "boxHeight", "cursor"]],
      ["disabled card", ".basalt-choice-card:has(input[value=off])", ".choice-card:has(input[value=off])", ["color", "cursor", "backgroundColor"]],
      ["head", ".basalt-choice-card:has(input[value=pro]) .basalt-choice-card-head", ".choice-card:has(input[value=pro]) .choice-card-head", [...PAD, "display", "alignItems", "gap", "boxHeight"]],
      ["title", ".basalt-choice-card:has(input[value=pro]) .basalt-choice-card-title", ".choice-card:has(input[value=pro]) .choice-card-title", [...TYPE, "color", "marginTop", "boxHeight", "boxWidth"]],
      ["description", ".basalt-choice-card:has(input[value=pro]) .basalt-choice-card-description", ".choice-card:has(input[value=pro]) .choice-card-description", [...TYPE, "color", "marginTop", "paddingLeft", "paddingRight", "boxHeight", "display"]],
      ["description, unselected", ".basalt-choice-card:has(input[value=free]) .basalt-choice-card-description", ".choice-card:has(input[value=free]) .choice-card-description", ["color"]],
      ["box on", ".basalt-choice-card:has(input[value=pro]) .basalt-choice-card-box", ".choice-card:has(input[value=pro]) .choice-card-box", [...BOXPROPS, "marginTop", "inLeft"]],
      ["box off", ".basalt-choice-card:has(input[value=free]) .basalt-choice-card-box", ".choice-card:has(input[value=free]) .choice-card-box", BOXPROPS],
      ["box disabled", ".basalt-choice-card:has(input[value=off]) .basalt-choice-card-box", ".choice-card:has(input[value=off]) .choice-card-box", ["opacity"]],
      ["dot", ".basalt-choice-card:has(input[value=pro]) .basalt-choice-card-dot", ".choice-card:has(input[value=pro]) .choice-card-box", ["boxWidth", "boxHeight", "borderTopLeftRadius", "ink", "opacity"], { skillPseudo: "::before" }],
      ["dot, unselected", ".basalt-choice-card:has(input[value=free]) .basalt-choice-card-dot", ".choice-card:has(input[value=free]) .choice-card-box", ["opacity"], { skillPseudo: "::before" }],
      ["checkbox box", ".basalt-choice-card:has(input[value=logs]) .basalt-choice-card-box", ".choice-card:has(input[value=logs]) .choice-card-box", [...BOXPROPS]],
      ["check", ".basalt-choice-card:has(input[value=logs]) .basalt-choice-card-mark", ".choice-card:has(input[value=logs]) .choice-card-box", ["boxWidth", "boxHeight", "ink", "opacity"], { skillPseudo: "::before" }],
      ["focus ring", ".basalt-choice-card:has(input[value=free])", ".choice-card:has(input[value=free])", OUTLINE, { focusIn: "input" }],
    ],
  },
  {
    id: "pressed toggle",
    react: `<><Button pressed>Pause animations</Button><Button pressed={false}>Pause animations</Button><Button variant="ghost" pressed>Ghost</Button><Button variant="ghost" pressed={false}>Ghost</Button></>`,
    skill: `<button class="btn" aria-pressed="true"><span class="btn-check" aria-hidden="true"></span>Pause animations</button><button class="btn" aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Pause animations</button><button class="btn" data-variant="ghost" aria-pressed="true"><span class="btn-check" aria-hidden="true"></span>Ghost</button><button class="btn" data-variant="ghost" aria-pressed="false"><span class="btn-check" aria-hidden="true"></span>Ghost</button>`,
    pairs: [
      ["secondary pressed", ".basalt-button[data-variant=secondary][aria-pressed=true]", ".btn:not([data-variant])[aria-pressed=true]", [...BOX, "boxWidth"]],
      ["secondary rest", ".basalt-button[data-variant=secondary][aria-pressed=false]", ".btn:not([data-variant])[aria-pressed=false]", [...BOX, "boxWidth"]],
      ["ghost pressed", ".basalt-button[data-variant=ghost][aria-pressed=true]", ".btn[data-variant=ghost][aria-pressed=true]", [...BOX, "boxWidth"]],
      ["ghost rest", ".basalt-button[data-variant=ghost][aria-pressed=false]", ".btn[data-variant=ghost][aria-pressed=false]", [...BOX, "boxWidth"]],
      ["seat", ".basalt-button[aria-pressed=true] .basalt-button-check", ".btn[aria-pressed=true] .btn-check", ["boxWidth", "boxHeight", "inLeft"]],
      ["check, pressed", ".basalt-button[data-variant=secondary][aria-pressed=true] .basalt-button-check .basalt-icon", ".btn:not([data-variant])[aria-pressed=true] .btn-check", ["opacity", "ink"], { skillPseudo: "::before" }],
      ["check, rest", ".basalt-button[data-variant=secondary][aria-pressed=false] .basalt-button-check .basalt-icon", ".btn:not([data-variant])[aria-pressed=false] .btn-check", ["opacity"], { skillPseudo: "::before" }],
      ["focus ring", ".basalt-button[data-variant=secondary][aria-pressed=true]", ".btn:not([data-variant])[aria-pressed=true]", OUTLINE, { focus: true }],
    ],
  },
  {
    id: "table selection",
    react: `<div style={{ width: 640 }}><TableContainer><Table><TableHeader><TableRow><TableHead style={{ width: 32, boxSizing: "border-box", paddingInline: 8 }}><Checkbox aria-label="Select all" indeterminate /></TableHead><TableHead>Run</TableHead></TableRow></TableHeader><TableBody><TableRow selected><TableCell style={{ width: 32, boxSizing: "border-box", paddingInline: 8 }}><Checkbox aria-label="Select one" defaultChecked /></TableCell><TableCell>run-0141</TableCell></TableRow><TableRow><TableCell style={{ width: 32, boxSizing: "border-box", paddingInline: 8 }}><Checkbox aria-label="Select two" /></TableCell><TableCell>run-0140</TableCell></TableRow></TableBody></Table></TableContainer></div>`,
    skill: `<div style="width: 640px"><div class="panel table-wrap"><table><thead><tr><th class="select-col"><input type="checkbox" data-select-all aria-label="Select all"></th><th>Run</th></tr></thead><tbody><tr><td class="select-col"><input type="checkbox" aria-label="Select one" checked></td><td>run-0141</td></tr><tr><td class="select-col"><input type="checkbox" aria-label="Select two"></td><td>run-0140</td></tr></tbody></table></div></div>`,
    pairs: [
      ["header cell", "th:first-child", "th:first-child", ["boxWidth", "boxHeight", ...PAD, "backgroundColor"]],
      ["body cell", "tbody tr:first-child td:first-child", "tbody tr:first-child td:first-child", ["boxWidth", "boxHeight", ...PAD]],
      ["name cell", "tbody tr:first-child td:nth-child(2)", "tbody tr:first-child td:nth-child(2)", ["inLeft", "paddingLeft"]],
      ["selected row", "tbody tr:first-child", "tbody tr:first-child", ["backgroundColor", "boxHeight"]],
      ["unselected row", "tbody tr:nth-child(2)", "tbody tr:nth-child(2)", ["backgroundColor", "boxHeight"]],
      ["row box", "tbody tr:first-child .basalt-checkbox", "tbody tr:first-child input", [...BOXPROPS, "inLeft", "inTop"]],
      ["header box", "thead .basalt-checkbox", "thead input", [...BOXPROPS, "inLeft", "inTop"]],
    ],
  },
];
CASES.push(...CHOICES);

// ---- Navigation and layout: the site header and its narrow menu, Nav, the app shell, its rail and the phone tab bar ----
// Each is rendered in React and in the skill at the same width, with the same words and the same mark, then settled, and the pairs read like the others. The skill
// builds the narrow menu from the bar's markup (topbar-nav), the rail from the sidebar's (app-shell); React does both itself.
const NAV_MARK = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`;
const SITE_LINKS = [["product", "Product"], ["docs", "Docs"], ["changelog", "Changelog"], ["pricing", "Pricing"], ["about", "About"]];
const siteReact = `document.body.style.margin = "0"; flushSync(() => createRoot(document.getElementById("root")).render(<div><SiteHeader brand={<>${NAV_MARK}<span>Acme</span></>} brandLabel="Acme home" links={[${SITE_LINKS.map(([id, label]) => `{ href: "#${id}", label: "${label}"${id === "docs" ? ", current: true" : ""} }`).join(", ")}]} themeToggle={<IconButton icon={SettingsGlyph} label="Switch theme" />} action={<Button variant="primary">Get started</Button>} /><main style={{ height: 1200, padding: 24 }}><p>Synthetic page.</p></main></div>));`;
const siteSkill = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#" aria-label="Acme home">${NAV_MARK}<span>Acme</span></a><nav class="topbar-links" aria-label="Primary">${SITE_LINKS.map(([id, label]) => `<a href="#${id}"${id === "docs" ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button><button class="btn topbar-action" data-variant="primary">Get started</button></div></header><main style="height: 1200px; padding: 24px"><p>Synthetic page.</p></main>`;
const HEADER_BAR = ["boxHeight", "boxWidth", "position", "top", "zIndex", "backgroundColor", "backdropFilter", "borderBottomWidth", "borderBottomStyle", "borderBottomColor", "color", "paddingTop", "boxSizing"];
const SITE_LINK = ["rectLeft", "rectTop", "boxWidth", "boxHeight", "color"];
const BOXRECT = ["rectLeft", "rectTop", "boxWidth", "boxHeight"];
const NAV_ROW = [...BOXRECT, "paddingTop", "paddingBottom"];
const NAV_PILL = [...BOXRECT, "paddingLeft", "paddingRight", "borderTopLeftRadius", "backgroundColor", "gap", "color"];
const NAV_LABEL = [...TYPE, "color", "whiteSpace"];
const APP_NAV = [["home", "Home", "HomeGlyph", "home"], ["search", "Search", "SearchGlyph", "search"], ["inbox", "Inbox", "NotificationsGlyph", "notifications"], ["messages", "Messages", "MessagesGlyph", "messages"]];
const appReact = (tabs) => `document.body.style.margin = "0"; flushSync(() => createRoot(document.getElementById("root")).render(<ToastProvider><AppShell brand={<>${NAV_MARK}<span>Workbench</span></>} brandMark={${NAV_MARK}} brandLabel="Workbench home"
  sidebar={<Nav aria-label="Primary">${APP_NAV.map(([id, label, glyph]) => `<NavItem href="#${id}" icon={${glyph}}${id === "home" ? " current" : ""}${id === "inbox" ? " count={12}" : ""}>${label}</NavItem>`).join("")}<NavGroup label="Workspace"><NavItem href="#plan" icon={PlanGlyph}>Plan</NavItem></NavGroup></Nav>}
  account={<Nav aria-label="Account"><NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem></Nav>}
  header={<AppHeader title="Overview" actions={<><IconButton icon={SettingsGlyph} label="Switch theme" /><Button variant="primary">New entry</Button></>} />}
  ${tabs ? `tabBar={<TabBar><TabBarItem href="#home" icon={HomeGlyph} current>Home</TabBarItem><TabBarItem href="#search" icon={SearchGlyph}>Search</TabBarItem><TabBarItem href="#inbox" icon={NotificationsGlyph} dot="New activity">Inbox</TabBarItem><TabBarMore><NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem></TabBarMore></TabBar>}` : ""}>
  <div style={{ height: 1600 }} /></AppShell></ToastProvider>));`;
const appSkill = (tabs) => `<div class="app-shell"${tabs ? " data-tabbar" : ""}><aside class="app-sidebar"><div class="app-brand"><a class="brand" href="#" aria-label="Workbench home"><span class="brand-full">${NAV_MARK}<span>Workbench</span></span><span class="brand-rail">${NAV_MARK}</span></a></div>
  <div class="app-nav"><nav class="nav" aria-label="Primary"><ul class="nav-list">${APP_NAV.map(([id, label, , glyph]) => `<li><a class="nav-item" href="#${id}"${id === "home" ? ' aria-current="page"' : ""}><span class="nav-pill"><span data-glyph="${glyph}" data-size="24"></span><span class="nav-label">${label}</span>${id === "inbox" ? '<span class="nav-count"><span class="visually-hidden">, </span>12</span>' : ""}</span></a></li>`).join("")}<li><span class="nav-group-label" id="ws">Workspace</span><ul class="nav-list" aria-labelledby="ws"><li><a class="nav-item" href="#plan"><span class="nav-pill"><span data-glyph="plan" data-size="24"></span><span class="nav-label">Plan</span></span></a></li></ul></li></ul></nav></div>
  <div class="app-account"><nav class="nav" aria-label="Account"><ul class="nav-list"><li><a class="nav-item" href="#settings"><span class="nav-pill"><span data-glyph="settings" data-size="24"></span><span class="nav-label">Settings</span></span></a></li></ul></nav></div></aside>
  <div class="app-column"><header class="app-header"><div class="app-bar"><h1 class="app-title">Overview</h1><span class="spacer"></span><div class="app-actions"><button class="btn" data-variant="ghost" data-icon-only aria-label="Switch theme"><span data-glyph="settings"></span></button><button class="btn" data-variant="primary">New entry</button></div></div></header>
  <main class="app-main"><div style="height: 1600px"></div></main></div>
  ${tabs ? `<nav class="tab-bar" aria-label="Primary"><ul class="tab-bar-list"><li><a class="tab-bar-item" href="#home" aria-current="page"><span class="tab-bar-glyph"><span data-glyph="home" data-size="24"></span></span><span class="tab-bar-label">Home</span></a></li><li><a class="tab-bar-item" href="#search"><span class="tab-bar-glyph"><span data-glyph="search" data-size="24"></span></span><span class="tab-bar-label">Search</span></a></li><li><a class="tab-bar-item" href="#inbox"><span class="tab-bar-glyph"><span data-glyph="notifications" data-size="24"></span><span class="tab-bar-dot" aria-hidden="true"></span></span><span class="tab-bar-label">Inbox</span><span class="visually-hidden">, New activity</span></a></li><li><button class="tab-bar-item" type="button" data-dialog-open="#more" aria-label="More"><span class="tab-bar-glyph"><span data-glyph="more-nav" data-size="24"></span></span><span class="tab-bar-label">More</span></button></li></ul></nav>
  <dialog class="panel float modal sheet" id="more" data-side="bottom"><div class="tab-bar-sheet-head"><h2 class="dialog-title">More</h2><button class="btn" data-variant="ghost" data-icon-only aria-label="Close more" data-dialog-close><span data-glyph="close"></span></button></div><nav class="nav" aria-label="More"><ul class="nav-list"><li><a class="nav-item" href="#settings"><span class="nav-pill"><span data-glyph="settings" data-size="24"></span><span class="nav-label">Settings</span></span></a></li></ul></nav></dialog>` : ""}</div>`;
const TABLE_IMPORTS = "TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableRowHead, TableCell, TableEmpty, TableScrollHint, Checkbox, Button, MultiSelect, FilterResult";
const NAV_IMPORTS = "SiteHeader, IconButton, Button, SettingsGlyph, ToastProvider, AppShell, AppHeader, Nav, NavItem, NavGroup, TabBar, TabBarItem, TabBarMore, HomeGlyph, SearchGlyph, NotificationsGlyph, MessagesGlyph, PlanGlyph, Sheet, SheetContent";
const NAVIGATION = [
  {
    id: "site header",
    width: 1440,
    react: siteReact,
    skill: siteSkill,
    ready: { react: ".basalt-site-header", skill: ".topbar" },
    pairs: [
      ["bar", ".basalt-site-header", ".topbar", HEADER_BAR],
      ["row", ".basalt-site-bar", ".topbar-inner", [...BOXRECT, "paddingTop", "paddingLeft", "paddingRight", "display", "alignItems"]],
      ["brand target", ".basalt-site-brand", ".brand", [...BOXRECT, "color", "display", "alignItems", "textDecorationLine"]],
      ["brand lockup", ".basalt-site-brand-mark", ".brand", [...TYPE, "gap", "whiteSpace", "color"]],
      ["brand word", ".basalt-site-brand-mark > span", ".brand > span", [...BOXRECT]],
      ["brand mark", ".basalt-site-brand-mark > svg", ".brand > svg", [...BOXRECT]],
      ["links", ".basalt-site-links", ".topbar-links", [...BOXRECT, "display"]],
      ["current link", ".basalt-site-link[aria-current=page]", ".topbar-links a[aria-current=page]", SITE_LINK],
      ["current link's words", ".basalt-site-link[aria-current=page] .basalt-site-label", ".topbar-links a[aria-current=page]", [...TYPE, "color"]],
      ["link at rest", ".basalt-site-link:not([aria-current])", ".topbar-links a:not([aria-current])", SITE_LINK],
      ["link's words at rest", ".basalt-site-link:not([aria-current]) .basalt-site-label", ".topbar-links a:not([aria-current])", [...TYPE, "color"]],
      ["last link", ".basalt-site-links li:last-child .basalt-site-link", ".topbar-links a:last-child", SITE_LINK],
      ["pill at rest", ".basalt-site-link:not([aria-current]) .basalt-site-pill", ".topbar-links a:not([aria-current])", ["boxHeight", "boxWidth", "backgroundColor", "borderTopLeftRadius"], { skillPseudo: "::before" }],
      ["link focus ring", ".basalt-site-link:not([aria-current]) .basalt-site-pill", ".topbar-links a:not([aria-current])", OUTLINE, { skillPseudo: "::before", focusOn: [".basalt-site-link:not([aria-current])", ".topbar-links a:not([aria-current])"] }],
      ["brand focus ring", ".basalt-site-brand-mark", ".brand", OUTLINE, { skillPseudo: "::after", focusOn: [".basalt-site-brand", ".brand"] }],
      ["action", ".basalt-site-action .basalt-button", ".topbar-action", [...BOX, ...BOXRECT]],
      ["theme toggle", ".basalt-bar-actions > .basalt-button[data-variant=ghost]", ".topbar-inner > .btn[data-variant=ghost]", [...BOX, ...BOXRECT]],
      ["menu button, hidden", ".basalt-site-menu-trigger", ".topbar-menu-trigger", ["display"]],
      ["hovered link", ".basalt-site-link:not([aria-current])", ".topbar-links a:not([aria-current])", ["color"], { hover: [".basalt-site-link:not([aria-current])", ".topbar-links a:not([aria-current])"] }],
      ["shared pill", ".basalt-site-links > .basalt-plate", ".topbar-links > .plate", ["display", "opacity", "backgroundColor", "borderTopLeftRadius", ...BOXRECT, "transitionProperty", "transitionDuration", "transitionTimingFunction"], { hover: [".basalt-site-link:not([aria-current])", ".topbar-links a:not([aria-current])"] }],
      ["pill under the shared one", ".basalt-site-link:not([aria-current]) .basalt-site-pill", ".topbar-links a:not([aria-current])", ["backgroundColor"], { skillPseudo: "::before", hover: [".basalt-site-link:not([aria-current])", ".topbar-links a:not([aria-current])"] }],
    ],
  },
  {
    id: "site header, narrow",
    width: 390,
    touch: true,
    react: siteReact,
    skill: siteSkill,
    ready: { react: ".basalt-site-header", skill: ".topbar" },
    pairs: [
      ["bar", ".basalt-site-header", ".topbar", HEADER_BAR],
      ["row", ".basalt-site-bar", ".topbar-inner", [...BOXRECT, "paddingTop", "paddingLeft", "paddingRight"]],
      ["brand target", ".basalt-site-brand", ".brand", BOXRECT],
      ["links, gone", ".basalt-site-links", ".topbar-links", ["display"]],
      ["action, gone", ".basalt-site-action", ".topbar-action", ["display"]],
      ["theme toggle", ".basalt-bar-actions > .basalt-button[data-variant=ghost]", ".topbar-inner > .btn[data-variant=ghost]", [...BOXRECT, "borderTopLeftRadius", "color", "backgroundColor"]],
      ["menu button", ".basalt-site-menu-trigger", ".topbar-menu-trigger", [...BOX, ...BOXRECT, "display"]],
    ],
  },
  {
    id: "site header, the narrow menu",
    width: 390,
    touch: true,
    react: siteReact,
    skill: siteSkill,
    ready: { react: ".basalt-site-menu", skill: "dialog.topbar-menu[open]" },
    open: { react: (p) => p.click(".basalt-site-menu-trigger"), skill: (p) => p.click(".topbar-menu-trigger") },
    pairs: [
      ["sheet", ".basalt-site-menu", "dialog.topbar-menu", [...PANEL, ...PAD, ...BOXRECT, "display", "flexDirection", "overflowY", "rectRight", "rectBottom", "clipPath", "transform", "opacity", "maxHeight"]],
      ["band", ".basalt-site-menu-band", ".sheet-band", [...BOXRECT, "display", "alignItems", "borderBottomWidth", "borderBottomColor", "paddingTop", "paddingRight", "paddingLeft"]],
      ["brand", ".basalt-site-menu-band .basalt-site-brand", ".sheet-band .brand", BOXRECT],
      ["brand word", ".basalt-site-menu-band .basalt-site-brand-mark > span", ".sheet-band .brand > span", BOXRECT],
      ["theme toggle", ".basalt-site-menu-band .basalt-bar-actions > .basalt-button:first-child", ".sheet-band [data-theme-toggle]", [...BOXRECT, "borderTopLeftRadius", "color"]],
      ["close, on the menu button's box", ".basalt-site-menu-close", ".sheet-band .btn[data-dialog-close]", [...BOX, ...BOXRECT]],
      ["close, first focus", ".basalt-site-menu-close", ".sheet-band .btn[data-dialog-close]", OUTLINE],
      ["close glyph", ".basalt-site-menu-close svg", ".sheet-band .btn[data-dialog-close] svg", ["boxWidth", "boxHeight", "color"]],
      ["links", ".basalt-site-menu-nav", ".topbar-menu .nav", [...BOXRECT, "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]],
      ["row", ".basalt-site-menu-nav .basalt-nav-item[aria-current=page]", ".topbar-menu .nav-item[aria-current=page]", NAV_ROW],
      ["row at rest", ".basalt-site-menu-nav .basalt-nav-item:not([aria-current])", ".topbar-menu .nav-item:not([aria-current])", NAV_ROW],
      ["pill", ".basalt-site-menu-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill", ".topbar-menu .nav-item:not([aria-current]) .nav-pill", NAV_PILL],
      ["label at rest", ".basalt-site-menu-nav .basalt-nav-item:not([aria-current]) .basalt-nav-label", ".topbar-menu .nav-item:not([aria-current]) .nav-label", NAV_LABEL],
      ["current label", ".basalt-site-menu-nav .basalt-nav-item[aria-current=page] .basalt-nav-label", ".topbar-menu .nav-item[aria-current=page] .nav-label", NAV_LABEL],
      ["foot", ".basalt-site-menu-foot", ".topbar-menu-foot", [...BOXRECT, "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]],
      ["action", ".basalt-site-menu-foot .basalt-button", ".topbar-menu-foot .btn", [...BOX, ...BOXRECT]],
      ["scrim", ".basalt-dialog-backdrop", "dialog.topbar-menu", ["backgroundColor", "opacity"], { skillPseudo: "::backdrop" }],
    ],
  },
  {
    id: "app shell",
    width: 1440,
    react: appReact(true),
    skill: appSkill(true),
    ready: { react: ".basalt-app-shell", skill: ".app-shell" },
    pairs: [
      ["shell", ".basalt-app-shell", ".app-shell", ["display", "gridTemplateColumns", "boxHeight", "boxWidth"]],
      ["sidebar", ".basalt-app-sidebar", ".app-sidebar", [...BOXRECT, "position", "top", "backgroundColor", "borderRightWidth", "borderRightStyle", "borderRightColor", "paddingLeft", "paddingRight", "overflowY", "display", "flexDirection", "color"]],
      ["brand band", ".basalt-app-brand", ".app-brand", [...BOXRECT, "paddingTop", "paddingLeft", "paddingRight", "display", "alignItems", "borderBottomWidth"]],
      ["brand target", ".basalt-app-brand .basalt-site-brand", ".app-brand .brand", [...BOXRECT, "color"]],
      ["brand lockup", ".basalt-app-brand-full", ".brand-full", [...BOXRECT, "display", "gap"]],
      ["brand mark, hidden", ".basalt-app-brand-rail", ".brand-rail", ["display"]],
      ["nav", ".basalt-app-nav .basalt-nav", ".app-nav .nav", [...BOXRECT, "paddingLeft", "paddingRight"]],
      ["current item", ".basalt-app-nav .basalt-nav-item[aria-current=page]", ".app-nav .nav-item[aria-current=page]", NAV_ROW],
      ["item at rest", ".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])", NAV_ROW],
      ["pill", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill", ".app-nav .nav-item:not([aria-current]) .nav-pill", NAV_PILL],
      ["current label", ".basalt-app-nav .basalt-nav-item[aria-current=page] .basalt-nav-label", ".app-nav .nav-item[aria-current=page] .nav-label", NAV_LABEL],
      ["label at rest", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-label", ".app-nav .nav-item:not([aria-current]) .nav-label", NAV_LABEL],
      ["glyph at rest", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill > svg", ".app-nav .nav-item:not([aria-current]) .nav-pill > svg", [...BOXRECT, "pathCount", "childCount", "color"]],
      ["glyph at rest, drawn", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill > svg path", ".app-nav .nav-item:not([aria-current]) .nav-pill > svg path", ["attrD", "strokeWidth", "strokeLinecap", "strokeLinejoin", "fill", "stroke"]],
      ["current glyph", ".basalt-app-nav .basalt-nav-item[aria-current=page] .basalt-nav-pill > svg", ".app-nav .nav-item[aria-current=page] .nav-pill > svg", [...BOXRECT, "pathCount", "childCount", "color"]],
      ["current glyph, drawn", ".basalt-app-nav .basalt-nav-item[aria-current=page] .basalt-nav-pill > svg path", ".app-nav .nav-item[aria-current=page] .nav-pill > svg path", ["attrD", "fill", "stroke"]],
      ["count", ".basalt-nav-count", ".nav-count", [...TYPE, "color", ...BOXRECT]],
      ["group label", ".basalt-nav-group-label", ".nav-group-label", [...TYPE, "color", "paddingTop", "paddingLeft", "paddingBottom", ...BOXRECT]],
      ["item ring", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill", ".app-nav .nav-item:not([aria-current]) .nav-pill", OUTLINE, { focusOn: [".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])"] }],
      ["account", ".basalt-app-account", ".app-account", [...BOXRECT, "paddingBottom"]],
      ["header", ".basalt-app-header", ".app-header", [...HEADER_BAR, "rectLeft"]],
      ["bar", ".basalt-app-bar", ".app-bar", [...BOXRECT, "paddingTop", "paddingLeft", "paddingRight", "display", "alignItems", "gap"]],
      ["title", ".basalt-app-title", ".app-title", [...TYPE, "color", ...BOXRECT, "overflowX", "whiteSpace"]],
      ["actions", ".basalt-app-bar .basalt-bar-actions", ".app-actions", [...BOXRECT, "display", "gap"]],
      ["primary action", ".basalt-app-bar .basalt-button[data-variant=primary]", ".app-actions .btn[data-variant=primary]", [...BOX, ...BOXRECT]],
      ["main", ".basalt-app-main", ".app-main", [...BOXRECT, "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "maxWidth"]],
      ["tab bar, hidden", ".basalt-tabbar", ".tab-bar", ["display"]],
      ["hovered item", ".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])", ["color"], { hover: [".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])"] }],
      ["shared pill", ".basalt-app-nav .basalt-plate", ".app-nav .plate", ["display", "opacity", "backgroundColor", "borderTopLeftRadius", ...BOXRECT, "transitionProperty", "transitionDuration", "transitionTimingFunction"], { hover: [".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])"] }],
      ["pill under the shared one", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill", ".app-nav .nav-item:not([aria-current]) .nav-pill", ["backgroundColor"], { hover: [".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])"] }],
    ],
  },
  {
    id: "app shell, the rail",
    width: 900,
    react: appReact(true),
    skill: appSkill(true),
    ready: { react: ".basalt-app-shell", skill: ".app-shell" },
    pairs: [
      ["shell", ".basalt-app-shell", ".app-shell", ["display", "gridTemplateColumns", "boxHeight"]],
      ["sidebar", ".basalt-app-sidebar", ".app-sidebar", [...BOXRECT, "paddingLeft", "paddingRight", "borderRightWidth"]],
      ["brand band", ".basalt-app-brand", ".app-brand", [...BOXRECT, "paddingLeft", "paddingRight", "justifyContent"]],
      ["brand lockup, hidden", ".basalt-app-brand-full", ".brand-full", ["display"]],
      ["brand mark", ".basalt-app-brand-rail", ".brand-rail", [...BOXRECT, "display"]],
      ["brand target", ".basalt-app-brand .basalt-site-brand", ".app-brand .brand", BOXRECT],
      ["item", ".basalt-app-nav .basalt-nav-item:not([aria-current])", ".app-nav .nav-item:not([aria-current])", [...NAV_ROW, "justifyContent"]],
      ["pill, a circle", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill", ".app-nav .nav-item:not([aria-current]) .nav-pill", [...NAV_PILL, "justifyContent"]],
      ["glyph", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-nav-pill > svg", ".app-nav .nav-item:not([aria-current]) .nav-pill > svg", BOXRECT],
      ["current glyph", ".basalt-app-nav .basalt-nav-item[aria-current=page] .basalt-nav-pill > svg", ".app-nav .nav-item[aria-current=page] .nav-pill > svg", BOXRECT],
      ["label, kept for the name", ".basalt-app-nav .basalt-nav-item:not([aria-current]) .basalt-visually-hidden", ".app-nav .nav-item:not([aria-current]) .nav-label", ["boxWidth", "boxHeight", "position", "overflowX", "whiteSpace"]],
      ["header", ".basalt-app-header", ".app-header", [...HEADER_BAR, "rectLeft"]],
      ["main", ".basalt-app-main", ".app-main", [...BOXRECT, "paddingLeft", "paddingRight"]],
    ],
  },
  {
    id: "app shell, the tab bar",
    width: 390,
    touch: true,
    react: appReact(true),
    skill: appSkill(true),
    ready: { react: ".basalt-app-shell", skill: ".app-shell" },
    pairs: [
      ["shell", ".basalt-app-shell", ".app-shell", ["display", "gridTemplateColumns"]],
      ["sidebar, gone", ".basalt-app-sidebar", ".app-sidebar", ["display"]],
      ["header", ".basalt-app-header", ".app-header", [...HEADER_BAR, "rectLeft"]],
      ["bar", ".basalt-app-bar", ".app-bar", [...BOXRECT, "paddingTop", "paddingLeft", "paddingRight", "gap"]],
      ["primary action, gone", ".basalt-app-bar .basalt-button[data-variant=primary]", ".app-actions .btn[data-variant=primary]", ["display"]],
      ["header button", ".basalt-app-bar .basalt-button[data-variant=ghost]", ".app-actions .btn[data-variant=ghost]", [...BOXRECT, "borderTopLeftRadius"]],
      ["main", ".basalt-app-main", ".app-main", [...BOXRECT, "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]],
      ["tab bar", ".basalt-tabbar", ".tab-bar", [...BOXRECT, "position", "bottom", "zIndex", "display", "backgroundColor", "borderTopWidth", "borderTopStyle", "borderTopColor", "paddingBottom", "paddingLeft", "paddingRight", "color", "backdropFilter", "boxShadow"]],
      ["list", ".basalt-tabbar-list", ".tab-bar-list", [...BOXRECT, "display", "gridAutoFlow"]],
      ["current item", ".basalt-tabbar-item[aria-current=page]", ".tab-bar-item[aria-current=page]", [...BOXRECT, "paddingTop", "paddingLeft", "paddingBottom", "gap", "color", "display", "flexDirection", "alignItems"]],
      ["item", ".basalt-tabbar-entry:nth-child(2) .basalt-tabbar-item", ".tab-bar-list > li:nth-child(2) .tab-bar-item", [...BOXRECT, "color"]],
      ["glyph circle", ".basalt-tabbar-item:not([aria-current]) .basalt-tabbar-glyph", ".tab-bar-item:not([aria-current]) .tab-bar-glyph", [...BOXRECT, "borderTopLeftRadius", "backgroundColor"]],
      ["glyph", ".basalt-tabbar-item:not([aria-current]) .basalt-tabbar-glyph > svg", ".tab-bar-item:not([aria-current]) .tab-bar-glyph > svg", [...BOXRECT, "pathCount", "childCount", "color"]],
      ["current glyph", ".basalt-tabbar-item[aria-current=page] .basalt-tabbar-glyph > svg", ".tab-bar-item[aria-current=page] .tab-bar-glyph > svg", [...BOXRECT, "pathCount", "childCount"]],
      ["label", ".basalt-tabbar-item:not([aria-current]) .basalt-tabbar-label", ".tab-bar-item:not([aria-current]) .tab-bar-label", [...TYPE, "color", ...BOXRECT]],
      ["current label", ".basalt-tabbar-item[aria-current=page] .basalt-tabbar-label", ".tab-bar-item[aria-current=page] .tab-bar-label", [...TYPE, "color", ...BOXRECT]],
      ["dot", ".basalt-tabbar-dot", ".tab-bar-dot", [...BOXRECT, "backgroundColor", "borderTopLeftRadius", "position"]],
      ["more", ".basalt-tabbar-more", ".tab-bar-list > li:last-child .tab-bar-item", [...BOXRECT, "color", "backgroundColor", "borderTopWidth", "cursor"]],
      ["item ring", ".basalt-tabbar-item[aria-current=page]", ".tab-bar-item[aria-current=page]", OUTLINE, { focus: true }],
      ["pressed circle", ".basalt-tabbar-item:not([aria-current]) .basalt-tabbar-glyph", ".tab-bar-item:not([aria-current]) .tab-bar-glyph", ["backgroundColor"], { press: [".basalt-tabbar-item:not([aria-current])", ".tab-bar-item:not([aria-current])"] }],
    ],
  },
  {
    id: "app shell, More",
    width: 390,
    touch: true,
    react: appReact(true),
    skill: appSkill(true),
    ready: { react: ".basalt-tabbar-sheet", skill: "dialog#more[open]" },
    open: { react: (p) => p.click(".basalt-tabbar-more"), skill: (p) => p.click(".tab-bar-list > li:last-child .tab-bar-item") },
    pairs: [
      ["sheet", ".basalt-tabbar-sheet", "dialog#more", [...PANEL, ...PAD, ...BOXRECT, "display", "flexDirection", "rectRight", "rectBottom", "maxHeight", "transform", "opacity"]],
      ["scrim", ".basalt-dialog-backdrop", "dialog#more", ["backgroundColor", "opacity"], { skillPseudo: "::backdrop" }],
      ["head", ".basalt-tabbar-sheet-head", ".tab-bar-sheet-head", [...BOXRECT, "display", "alignItems", "justifyContent", "gap", "marginBottom"]],
      ["title", ".basalt-tabbar-sheet .basalt-dialog-title", ".tab-bar-sheet-head .dialog-title", [...TYPE, "color", ...BOXRECT, "marginTop", "marginBottom"]],
      ["close", ".basalt-tabbar-sheet-head .basalt-button", ".tab-bar-sheet-head .btn", [...BOX, ...BOXRECT]],
      ["rows", ".basalt-tabbar-sheet .basalt-nav", ".tab-bar-sheet-head + .nav", [...BOXRECT, "paddingLeft", "paddingRight"]],
      ["row", ".basalt-tabbar-sheet .basalt-nav-item", "#more .nav-item", NAV_ROW],
      ["pill", ".basalt-tabbar-sheet .basalt-nav-pill", "#more .nav-pill", NAV_PILL],
      ["label", ".basalt-tabbar-sheet .basalt-nav-label", "#more .nav-label", NAV_LABEL],
      ["glyph", ".basalt-tabbar-sheet .basalt-nav-pill > svg", "#more .nav-pill > svg", [...BOXRECT, "pathCount"]],
    ],
  },
];


// ---- Tables and filters: the still table, the table additions, the multi-select and its result line (batch 7, step 6) ----
// Each is rendered in React and in the skill at the same width, in both themes, and read like the others. A state (hover, focus, scrolled, a popup open) is reached in both pages first.
const TBL_COLS = `columns={[{ width: 160 }, { width: 140 }, { width: 120 }, {}]} minWidth={560}`;
const stillReact = (extra = "") => `<div style={{ width: 720 }}><TableContainer><Table ${TBL_COLS}${extra}><TableHeader><TableRow><TableHead onSortChange={() => {}}>Name</TableHead><TableHead sort="ascending" onSortChange={() => {}}>Status</TableHead><TableHead numeric sort="descending" onSortChange={() => {}}>Duration</TableHead><TableHead>Commit</TableHead></TableRow></TableHeader><TableBody><TableRow><TableRowHead>build-0141</TableRowHead><TableCell>Passed</TableCell><TableCell numeric>312</TableCell><TableCell mono>a1b2c3</TableCell></TableRow><TableRow selected><TableRowHead>build-0140</TableRowHead><TableCell>Failed</TableCell><TableCell numeric notObserved /><TableCell mono>d4e5f6</TableCell></TableRow></TableBody></Table></TableContainer></div>`;
const stillSkill = (extra = "") => `<div style="width: 720px"><div class="panel table-wrap"><table data-fixed${extra} style="min-width: 560px"><colgroup><col style="width: 160px"><col style="width: 140px"><col style="width: 120px"><col></colgroup><thead><tr><th data-sortable>Name</th><th data-sortable aria-sort="ascending">Status</th><th data-sortable data-numeric aria-sort="descending">Duration</th><th scope="col">Commit</th></tr></thead><tbody><tr><th scope="row">build-0141</th><td>Passed</td><td data-numeric>312</td><td data-mono>a1b2c3</td></tr><tr aria-selected="true"><th scope="row">build-0140</th><td>Failed</td><td data-numeric data-not-observed>Not observed</td><td data-mono>d4e5f6</td></tr></tbody></table></div></div>`;
const SORT_BOX = [...BOXRECT, "paddingLeft", "paddingRight", "display", "flexDirection", "alignItems", "gap", "color", "backgroundColor", "borderTopWidth", "borderTopLeftRadius", "cursor", ...TYPE];
const OPTS4 = `[{ value: "passed", label: "Passed" }, { value: "failed", label: "Failed" }, { value: "running", label: "Running" }, { value: "queued", label: "Queued", disabled: true }]`;
const filterLabels = (list, checked = [], disabled = []) => list.map(([v, l]) => `<label><input type="checkbox" value="${v}"${checked.includes(v) ? " checked" : ""}${disabled.includes(v) ? " disabled" : ""}> ${l}</label>`).join("");
const FOUR = [["passed", "Passed"], ["failed", "Failed"], ["running", "Running"], ["queued", "Queued"]];
const NAMES = ["Alder", "Birch", "Cedar", "Dogwood", "Elm", "Fir", "Gingko", "Hazel", "Ironwood", "Juniper", "Katsura", "Larch"];
const optsOf = (n) => `[${NAMES.slice(0, n).map((x) => `{ value: "${x.toLowerCase()}", label: "${x}" }`).join(", ")}]`;
const labelsOf = (n, checked = []) => filterLabels(NAMES.slice(0, n).map((x) => [x.toLowerCase(), x]), checked);
const CHIP = [...BOXRECT, "paddingLeft", "paddingRight", "borderTopLeftRadius", "borderTopWidth", "borderTopColor", "backgroundColor", "color", "gap", "display", "alignItems", ...TYPE, "cursor"];
const CHIP_HOVER_BLUR = [["hover", ".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))"]];
const hoverOf = (react, skill) => ({ hover: [react, skill] });
const parkPointer = async (page) => { await page.mouse.move(0, 0); };
const markTrigger = { react: (p) => p.evaluate(() => document.querySelector(".basalt-filter-trigger")?.setAttribute("data-parity-trigger", "")), skill: (p) => p.evaluate(() => document.querySelector(".filter-trigger")?.setAttribute("data-parity-trigger", "")) };
const openTrigger = { react: async (p) => { await markTrigger.react(p); await p.locator(".basalt-filter-trigger").click(); await p.waitForSelector(".basalt-filter-popup"); await parkPointer(p); }, skill: async (p) => { await markTrigger.skill(p); await p.locator(".filter-trigger").click(); await p.waitForSelector(".filter-popup:popover-open"); await parkPointer(p); } };
const POPUP_BOX = ["backgroundColor", "borderTopLeftRadius", "borderTopColor", "borderTopWidth", "boxShadow", "boxWidth", "boxHeight", "paddingTop", "paddingLeft", "gapBelow", "startOffset"];
const ROW = [...BOXRECT, "paddingLeft", "paddingRight", "display", "alignItems", "gap", "color", "backgroundColor", ...TYPE];
const TABLES = [
  {
    id: "still table",
    width: 1440,
    react: stillReact(),
    skill: stillSkill(),
    ready: { react: ".basalt-table[data-fixed]", skill: "table[data-fixed] .sort" },
    pairs: [
      ["container", ".basalt-table-container", ".table-wrap", ["backgroundColor", "borderTopLeftRadius", "overflowX", "boxWidth"]],
      ["table", ".basalt-table", "table", ["tableLayout", "boxWidth", "minWidth", "borderCollapse", ...TYPE]],
      ["name header", "th:nth-child(1)", "th:nth-child(1)", [...BOXRECT, "paddingLeft", "paddingRight", "backgroundColor", "color", "textAlign", "whiteSpace", "overflowX", "ariaSort"]],
      ["status header, sorted", "th:nth-child(2)", "th:nth-child(2)", [...BOXRECT, "ariaSort", "color"]],
      ["duration header, numeric", "th:nth-child(3)", "th:nth-child(3)", [...BOXRECT, "textAlign", "ariaSort"]],
      ["commit header, plain", "th:nth-child(4)", "th:nth-child(4)", [...BOXRECT, "paddingLeft", "color", "backgroundColor"]],
      ["sort button", "th:nth-child(1) .basalt-sort", "th:nth-child(1) .sort", SORT_BOX],
      ["sort label", "th:nth-child(1) .basalt-sort-label", "th:nth-child(1) .sort-label", [...BOXRECT, ...TYPE, "color"]],
      ["sort seat", "th:nth-child(1) .basalt-sort-seat", "th:nth-child(1) .sort-seat", [...BOXRECT, "color"]],
      ["caret at rest", "th:nth-child(1) .basalt-sort-caret", "th:nth-child(1) .sort-caret", ["opacity", "boxWidth", "boxHeight"]],
      ["sorted button", "th:nth-child(2) .basalt-sort", "th:nth-child(2) .sort", SORT_BOX],
      ["sorted seat", "th:nth-child(2) .basalt-sort-seat", "th:nth-child(2) .sort-seat", [...BOXRECT, "color"]],
      ["ascending arrow", "th:nth-child(2) .basalt-sort-up", "th:nth-child(2) .sort-up", ["opacity", "boxWidth", "boxHeight"]],
      ["descending arrow, hidden", "th:nth-child(2) .basalt-sort-down", "th:nth-child(2) .sort-down", ["opacity"]],
      ["numeric button", "th:nth-child(3) .basalt-sort", "th:nth-child(3) .sort", SORT_BOX],
      ["numeric label", "th:nth-child(3) .basalt-sort-label", "th:nth-child(3) .sort-label", [...BOXRECT]],
      ["numeric seat", "th:nth-child(3) .basalt-sort-seat", "th:nth-child(3) .sort-seat", [...BOXRECT]],
      ["descending arrow", "th:nth-child(3) .basalt-sort-down", "th:nth-child(3) .sort-down", ["opacity"]],
      ["row header", "tbody tr:first-child th", "tbody tr:first-child th", [...BOXRECT, "paddingLeft", "backgroundColor", "color", "boxShadow", ...TYPE, "textAlign"]],
      ["body cell", "tbody tr:first-child td:nth-child(2)", "tbody tr:first-child td:nth-child(2)", [...BOXRECT, "color", "backgroundColor", ...TYPE]],
      ["numeric cell", "tbody tr:first-child td:nth-child(3)", "tbody tr:first-child td:nth-child(3)", [...BOXRECT, "textAlign", "fontVariantNumeric"]],
      ["not observed", "td[data-not-observed]", "td[data-not-observed]", [...BOXRECT, "color", "textAlign", "fontVariantNumeric"]],
      ["selected row", "tbody tr:nth-child(2)", "tbody tr:nth-child(2)", ["backgroundColor", "boxHeight"]],
      ["not observed, selected", "td[data-not-observed]", "td[data-not-observed]", ["color"], hoverOf("tbody tr:first-child td", "tbody tr:first-child td")],
      ["hovered header", "th:nth-child(1) .basalt-sort", "th:nth-child(1) .sort", ["color"], hoverOf("th:nth-child(1) .basalt-sort", "th:nth-child(1) .sort")],
      ["caret on hover", "th:nth-child(1) .basalt-sort-caret", "th:nth-child(1) .sort-caret", ["opacity", "color"], hoverOf("th:nth-child(1) .basalt-sort", "th:nth-child(1) .sort")],
      ["header focus ring", "th:nth-child(1) .basalt-sort", "th:nth-child(1) .sort", [...OUTLINE, "color"], { focus: true }],
      ["caret on focus", "th:nth-child(1) .basalt-sort-caret", "th:nth-child(1) .sort-caret", ["opacity"], { focusOn: ["th:nth-child(1) .basalt-sort", "th:nth-child(1) .sort"] }],
      ["row on hover", "tbody tr:first-child", "tbody tr:first-child", ["backgroundColor"], hoverOf("tbody tr:first-child td:nth-child(2)", "tbody tr:first-child td:nth-child(2)")],
      ["not observed on hover", "td[data-not-observed]", "td[data-not-observed]", ["color"], hoverOf("td[data-not-observed]", "td[data-not-observed]")],
    ],
  },
  {
    id: "still table, compact and the empty row",
    width: 1440,
    react: `<div style={{ width: 720 }}><TableContainer density="compact"><Table ${TBL_COLS}><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead numeric>Duration</TableHead><TableHead>Commit</TableHead></TableRow></TableHeader><TableBody><TableRow><TableRowHead>build-0141</TableRowHead><TableCell>Passed</TableCell><TableCell numeric>312</TableCell><TableCell mono>a1b2c3</TableCell></TableRow><TableEmpty colSpan={4} action={<Button size="sm" variant="ghost">Clear filters</Button>}>No runs match.</TableEmpty></TableBody></Table></TableContainer></div><div style={{ width: 360, marginTop: 16 }}><TableContainer><Table ${TBL_COLS}><TableBody><TableRow><TableRowHead>wide</TableRowHead><TableCell>x</TableCell><TableCell numeric>1</TableCell><TableCell>y</TableCell></TableRow></TableBody></Table></TableContainer><TableScrollHint /></div>`,
    skill: `<div style="width: 720px"><div class="panel table-wrap" data-row-density="compact"><table data-fixed style="min-width: 560px"><colgroup><col style="width: 160px"><col style="width: 140px"><col style="width: 120px"><col></colgroup><thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col" data-numeric>Duration</th><th scope="col">Commit</th></tr></thead><tbody><tr><th scope="row">build-0141</th><td>Passed</td><td data-numeric>312</td><td data-mono>a1b2c3</td></tr><tr data-empty><td colspan="4"><div class="table-empty"><span>No runs match.</span><button class="btn" type="button" data-variant="ghost" data-size="sm">Clear filters</button></div></td></tr></tbody></table></div></div><div style="width: 360px; margin-top: 16px"><div class="panel table-wrap"><table data-fixed style="min-width: 560px"><colgroup><col style="width: 160px"><col style="width: 140px"><col style="width: 120px"><col></colgroup><tbody><tr><th scope="row">wide</th><td>x</td><td data-numeric>1</td><td>y</td></tr></tbody></table></div><p class="table-hint" hidden></p></div>`,
    ready: { react: ".basalt-table-hint:not([hidden])", skill: ".table-hint:not([hidden])" },
    pairs: [
      ["compact cell", "tbody tr:first-child td:nth-child(2)", "tbody tr:first-child td:nth-child(2)", ["boxHeight", ...PAD]],
      ["compact row header", "tbody tr:first-child th", "tbody tr:first-child th", ["boxHeight", ...PAD]],
      ["header, compact", "thead th:first-child", "thead th:first-child", ["boxHeight"]],
      ["empty row", "tr[data-empty]", "tr[data-empty]", ["backgroundColor", "boxHeight"]],
      ["empty cell", "tr[data-empty] > td", "tr[data-empty] > td", [...PAD, "boxHeight", "color", "whiteSpace", "overflowX", "backgroundColor", "boxWidth"]],
      ["empty block", ".basalt-table-empty", ".table-empty", [...BOXRECT, "display", "flexDirection", "alignItems", "gap", "position", "maxWidth"]],
      ["empty action", ".basalt-table-empty .basalt-button", ".table-empty .btn", [...BOXRECT, "color", "backgroundColor"]],
      ["empty row on hover", "tr[data-empty]", "tr[data-empty]", ["backgroundColor"], hoverOf("tr[data-empty] > td", "tr[data-empty] > td")],
      ["scroll hint", ".basalt-table-hint", ".table-hint", [...BOXRECT, ...TYPE, "color", "marginTop", "display", "ariaHidden", "text"]],
    ],
  },
  {
    id: "still table, pinned at 390",
    width: 390,
    touch: true,
    react: `<div style={{ width: 358, margin: 16 }}><TableContainer><Table columns={[{ width: 40 }, { width: 160 }, { width: 140 }, { width: 120 }, {}]} minWidth={640} pinned={2}><TableHeader><TableRow><TableHead><Checkbox aria-label="Select all" /></TableHead><TableHead onSortChange={() => {}}>Name</TableHead><TableHead>Status</TableHead><TableHead numeric>Duration</TableHead><TableHead>Commit</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell><Checkbox aria-label="Select one" /></TableCell><TableRowHead>build-0141</TableRowHead><TableCell>Passed</TableCell><TableCell numeric>312</TableCell><TableCell mono>a1b2c3</TableCell></TableRow><TableRow selected><TableCell><Checkbox aria-label="Select two" defaultChecked /></TableCell><TableRowHead>build-0140</TableRowHead><TableCell>Failed</TableCell><TableCell numeric>45</TableCell><TableCell mono>d4e5f6</TableCell></TableRow></TableBody></Table></TableContainer></div>`,
    skill: `<div style="width: 358px; margin: 16px"><div class="panel table-wrap"><table data-fixed data-pinned="2" style="min-width: 640px"><colgroup><col style="width: 40px"><col style="width: 160px"><col style="width: 140px"><col style="width: 120px"><col></colgroup><thead><tr><th class="select-col"><input type="checkbox" aria-label="Select all"></th><th data-sortable>Name</th><th scope="col">Status</th><th scope="col" data-numeric>Duration</th><th scope="col">Commit</th></tr></thead><tbody><tr><td class="select-col"><input type="checkbox" aria-label="Select one"></td><th scope="row">build-0141</th><td>Passed</td><td data-numeric>312</td><td data-mono>a1b2c3</td></tr><tr aria-selected="true"><td class="select-col"><input type="checkbox" aria-label="Select two" checked></td><th scope="row">build-0140</th><td>Failed</td><td data-numeric>45</td><td data-mono>d4e5f6</td></tr></tbody></table></div></div>`,
    ready: { react: ".basalt-table[data-pinned]", skill: "table[data-pinned] .sort" },
    pairs: [
      ["header height on touch", "thead th:nth-child(3)", "thead th:nth-child(3)", [...BOXRECT, "paddingLeft"]],
      ["row height on touch", "tbody tr:first-child td:nth-child(3)", "tbody tr:first-child td:nth-child(3)", [...BOXRECT, "paddingLeft"]],
      ["sort button on touch", ".basalt-sort", ".sort", [...BOXRECT, "paddingLeft"]],
      ["caret on touch", ".basalt-sort-caret", ".sort-caret", ["opacity"]],
      ["pinned select cell", "tbody tr:first-child td:nth-child(1)", "tbody tr:first-child td:nth-child(1)", ["position", "left", "zIndex", "backgroundColor", ...BOXRECT]],
      ["pinned name cell", "tbody tr:first-child th", "tbody tr:first-child th", ["position", "left", "zIndex", "backgroundColor", ...BOXRECT]],
      ["pinned name cell, selected", "tbody tr:nth-child(2) th", "tbody tr:nth-child(2) th", ["backgroundColor"]],
      // The wash is on every cell of the row in both builds (decision 149): an unpinned cell of the selected row is the same colour as React's.
      ["unpinned cell, selected", "tbody tr:nth-child(2) td:nth-child(3)", "tbody tr:nth-child(2) td:nth-child(3)", ["backgroundColor"]],
      ["last cell, selected", "tbody tr:nth-child(2) td:nth-child(5)", "tbody tr:nth-child(2) td:nth-child(5)", ["backgroundColor"]],
      ["pinned header, name", "thead th:nth-child(2)", "thead th:nth-child(2)", ["position", "left", "zIndex", "backgroundColor", ...BOXRECT]],
      ["a scrolling cell", "tbody tr:first-child td:nth-child(3)", "tbody tr:first-child td:nth-child(3)", ["position"]],
      ["edge divider at rest", "tbody tr:first-child th", "tbody tr:first-child th", ["opacity", "boxWidth", "backgroundColor", "position", "content"], { pseudo: "::after" }],
      ["scroll padding", ".basalt-table-container", ".table-wrap", ["scrollPaddingLeft"]],
      ["scrolled: pinned name", "tbody tr:first-child th", "tbody tr:first-child th", ["rectLeft", "backgroundColor"], { scroll: 120 }],
      ["scrolled: divider", "tbody tr:first-child th", "tbody tr:first-child th", ["opacity", "backgroundColor", "boxWidth"], { pseudo: "::after", scroll: 120 }],
      ["scrolled: select cell", "tbody tr:first-child td:nth-child(1)", "tbody tr:first-child td:nth-child(1)", ["rectLeft", "backgroundColor"], { scroll: 120 }],
      ["scrolled: a scrolling cell", "tbody tr:first-child td:nth-child(3)", "tbody tr:first-child td:nth-child(3)", ["rectLeft"], { scroll: 120 }],
      // A hovered row's wash is on every cell in both builds (decision 149): the pointer rests on the first row and each cell is read, last because the pointer stays.
      ["hovered row: pinned name", "tbody tr:first-child th", "tbody tr:first-child th", ["backgroundColor"], { hover: ["tbody tr:first-child", "tbody tr:first-child"] }],
      ["hovered row: an unpinned cell", "tbody tr:first-child td:nth-child(3)", "tbody tr:first-child td:nth-child(3)", ["backgroundColor"], { hover: ["tbody tr:first-child", "tbody tr:first-child"] }],
      ["hovered row: the last cell", "tbody tr:first-child td:nth-child(5)", "tbody tr:first-child td:nth-child(5)", ["backgroundColor"], { hover: ["tbody tr:first-child", "tbody tr:first-child"] }],
    ],
  },
  {
    id: "chips",
    width: 1440,
    react: `<div style={{ width: 480 }}><MultiSelect label="Status" options={${OPTS4}} defaultValue={["failed"]} /></div><div style={{ width: 480, marginTop: 24 }} id="zero"><MultiSelect label="Status" options={${OPTS4}} /></div>`,
    skill: `<div style="width: 480px"><div class="filter" data-label="Status">${filterLabels(FOUR, ["failed"], ["queued"])}</div></div><div style="width: 480px; margin-top: 24px" id="zero"><div class="filter" data-label="Status">${filterLabels(FOUR, [], ["queued"])}</div></div>`,
    ready: { react: ".basalt-chip", skill: ".chip" },
    pairs: [
      ["filter", ".basalt-filter", ".filter", [...BOXRECT, "display", "flexDirection", "gap"]],
      ["head", ".basalt-filter-head", ".filter-head", [...BOXRECT, "display", "alignItems", "gap"]],
      ["label", ".basalt-filter-label", ".filter-label", [...BOXRECT, ...TYPE, "color"]],
      ["count", ".basalt-filter-count", ".filter-count", [...BOXRECT, ...TYPE, "color", "fontVariantNumeric", "display"]],
      ["count value", ".basalt-filter-count-value", ".filter-count-value", [...BOXRECT]],
      ["clear", ".basalt-filter-clear", ".filter-clear", [...BOX, ...BOXRECT]],
      ["chips", ".basalt-filter-chips", ".filter-chips", [...BOXRECT, "display", "flexWrap", "gap"]],
      ["chip, off", ".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))", CHIP],
      ["chip, on", ".basalt-chip[data-checked]", ".chip:has(input:checked)", CHIP],
      ["chip, disabled", ".basalt-chip[data-disabled]", ".chip:has(input:disabled)", [...CHIP, "opacity"]],
      ["chip's seat", ".basalt-chip[data-checked] .basalt-chip-seat", ".chip:has(input:checked) .chip-seat", [...BOXRECT, "color"]],
      ["chip's seat, off", ".basalt-chip:not([data-checked]):not([data-disabled]) .basalt-chip-seat", ".chip:not(:has(input:checked)):not(:has(input:disabled)) .chip-seat", [...BOXRECT, "color"]],
      ["plus, off", ".basalt-chip:not([data-checked]):not([data-disabled]) .basalt-chip-plus", ".chip:not(:has(input:checked)):not(:has(input:disabled)) .chip-plus", ["opacity", "boxWidth", "boxHeight", "transitionDuration", "transitionTimingFunction"]],
      ["check, off", ".basalt-chip:not([data-checked]):not([data-disabled]) .basalt-chip-check", ".chip:not(:has(input:checked)):not(:has(input:disabled)) .chip-check", ["opacity"]],
      ["plus, on", ".basalt-chip[data-checked] .basalt-chip-plus", ".chip:has(input:checked) .chip-plus", ["opacity"]],
      ["check, on", ".basalt-chip[data-checked] .basalt-chip-check", ".chip:has(input:checked) .chip-check", ["opacity", "transitionDuration"]],
      ["chip's label", ".basalt-chip[data-checked] .basalt-chip-label", ".chip:has(input:checked) .chip-label", [...BOXRECT, "color"]],
      ["chip, hovered", ".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))", ["color", "borderTopColor", "backgroundColor"], hoverOf(".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))")],
      ["chip's seat, hovered", ".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled]) .basalt-chip-seat", ".chip:not(:has(input:checked)):not(:has(input:disabled)) .chip-seat", ["color"], hoverOf(".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))")],
      ["chip, on, hovered", ".basalt-chip[data-checked]", ".chip:has(input:checked)", ["color", "borderTopColor", "backgroundColor"], hoverOf(".basalt-chip[data-checked]", ".chip:has(input:checked)")],
      ["chip, pressed", ".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))", ["backgroundColor"], { press: [".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))"] }],
      ["chip focus ring", ".basalt-chip[data-checked]", ".chip:has(input:checked)", OUTLINE, { focusOn: [".basalt-chip[data-checked]", ".chip:has(input:checked) input"] }],
      ["clear at zero", "#zero .basalt-filter-clear", "#zero .filter-clear", [...BOX, "cursor", "opacity"]],
      ["count at zero", "#zero .basalt-filter-count", "#zero .filter-count", [...BOXRECT, "color"]],
      ["count value at zero", "#zero .basalt-filter-count-value", "#zero .filter-count-value", [...BOXRECT]],
    ],
  },
  {
    id: "chips on touch",
    width: 390,
    touch: true,
    react: `<div style={{ width: 358, margin: 16 }}><MultiSelect label="Status" options={${OPTS4}} defaultValue={["failed"]} /></div>`,
    skill: `<div style="width: 358px; margin: 16px"><div class="filter" data-label="Status">${filterLabels(FOUR, ["failed"], ["queued"])}</div></div>`,
    ready: { react: ".basalt-chip", skill: ".chip" },
    pairs: [
      ["chip, off", ".basalt-chip[role=checkbox]:not([data-checked]):not([data-disabled])", ".chip:not(:has(input:checked)):not(:has(input:disabled))", CHIP],
      ["chip, on", ".basalt-chip[data-checked]", ".chip:has(input:checked)", CHIP],
      ["chip's tap target", ".basalt-chip[data-checked]", ".chip:has(input:checked)", [...BOXRECT, "content", "position", "top", "bottom"], { pseudo: "::before" }],
      ["chips", ".basalt-filter-chips", ".filter-chips", [...BOXRECT, "gap"]],
      ["clear", ".basalt-filter-clear", ".filter-clear", [...BOXRECT]],
    ],
  },
  {
    id: "checklist",
    width: 1440,
    react: `<div style={{ padding: 16 }}><MultiSelect label="Status" options={${optsOf(8)}} defaultValue={["cedar", "elm"]} /></div>`,
    skill: `<div style="padding: 16px"><div class="filter" data-label="Status">${labelsOf(8, ["cedar", "elm"])}</div></div>`,
    ready: { react: ".basalt-filter-popup .basalt-filter-row", skill: ".filter-popup:popover-open .filter-row" },
    open: openTrigger,
    pairs: [
      ["filter", ".basalt-filter", ".filter", [...BOXRECT, "display", "flexDirection", "alignItems"]],
      ["trigger", ".basalt-filter-trigger", ".filter-trigger", [...BOX, ...BOXRECT, "display", "gap"]],
      ["trigger's words", ".basalt-button-label", ".filter-trigger-label-wrap", [...BOXRECT, "gap", "display"]],
      ["trigger's label", ".basalt-filter-trigger-label", ".filter-trigger-label", [...BOXRECT, "color"]],
      ["trigger's value", ".basalt-filter-trigger-value", ".filter-trigger-value", [...BOXRECT, "color"]],
      ["trigger's caret", ".basalt-filter-trigger > svg", ".filter-trigger > svg", [...BOXRECT]],
      ["popup", ".basalt-filter-popup", ".filter-popup", POPUP_BOX],
      ["rows", ".basalt-filter-rows", ".filter-rows", [...BOXRECT, "maxHeight", "overflowY", "paddingLeft", "paddingRight", "marginLeft"]],
      ["row at rest", ".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked))", ROW],
      ["row, checked", ".basalt-filter-row[data-checked]", ".filter-row:has(input:checked)", ROW],
      ["row's box", ".basalt-filter-row[data-checked] .basalt-checkbox", ".filter-row:has(input:checked) input", [...BOXRECT, "backgroundColor"]],
      ["row's unchecked box", ".basalt-filter-row:not([data-checked]) .basalt-checkbox", ".filter-row:not(:has(input:checked)) input", [...BOXRECT, "backgroundColor", "boxShadow"]],
      ["row's label", ".basalt-filter-row:not([data-checked]) .basalt-menu-item-label", ".filter-row:not(:has(input:checked)) .filter-row-label", [...BOXRECT, "flexGrow"]],
      ["foot", ".basalt-filter-foot", ".filter-foot", [...BOXRECT, "paddingLeft", "paddingTop", "borderTopWidth", "borderTopColor", "marginLeft", "marginTop", "display", "justifyContent", "gap"]],
      ["foot count", ".basalt-filter-foot .basalt-filter-count", ".filter-foot .filter-count", [...BOXRECT, ...TYPE, "color"]],
      ["foot clear", ".basalt-filter-foot .basalt-filter-clear", ".filter-foot .filter-clear", [...BOX, ...BOXRECT]],
      ["lit row", ".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked))", ["color", "backgroundColor"], { focusOn: [".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked)) input"] }],
      ["shared plate", ".basalt-filter-popup > .basalt-plate", ".filter-popup > .plate", ["display", "opacity", "backgroundColor", "borderTopLeftRadius", ...BOXRECT, "transitionProperty", "transitionDuration", "transitionTimingFunction"], { hover: [".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked))"] }],
      ["row under the shared plate", ".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked))", ["backgroundColor", "color"], { pseudo: "::before", hover: [".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked))"] }],
      ["lit row's plate", ".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked))", ["backgroundColor"], { pseudo: "::before", focusOn: [".basalt-filter-row:not([data-checked])", ".filter-row:not(:has(input:checked)) input"] }],
    ],
  },
  {
    id: "checklist with a search band",
    width: 1440,
    react: `<div style={{ padding: 16 }}><MultiSelect label="Tree" options={${optsOf(12)}} /></div>`,
    skill: `<div style="padding: 16px"><div class="filter" data-label="Tree">${labelsOf(12)}</div></div>`,
    ready: { react: ".basalt-filter-band", skill: ".filter-band" },
    open: openTrigger,
    pairs: [
      ["trigger, none chosen", ".basalt-filter-trigger", ".filter-trigger", [...BOX, ...BOXRECT]],
      ["popup", ".basalt-filter-popup", ".filter-popup", POPUP_BOX],
      ["band", ".basalt-filter-band", ".filter-band", [...BOXRECT, "paddingLeft", "paddingRight", "gap", "backgroundColor", "borderBottomWidth", "borderBottomColor", "marginTop", "marginLeft", "marginBottom", "color", "display", "alignItems"]],
      ["band's glyph", ".basalt-filter-band > svg", ".filter-band > svg", [...BOXRECT, "color"]],
      ["band's input", ".basalt-filter-band-input", ".filter-band-input", [...BOXRECT, ...TYPE, "color", "backgroundColor", "outlineStyle"]],
      ["band's placeholder", ".basalt-filter-band-input", ".filter-band-input", ["color", "opacity"], { pseudo: "::placeholder" }],
      ["rows", ".basalt-filter-rows", ".filter-rows", [...BOXRECT, "maxHeight", "overflowY", "scrollHeight"]],
      ["first row", ".basalt-filter-row", ".filter-row", ROW],
      ["foot", ".basalt-filter-foot", ".filter-foot", [...BOXRECT]],
      ["band in focus", ".basalt-filter-band", ".filter-band", [...OUTLINE, "backgroundColor"], { focusOn: [".basalt-filter-band-input", ".filter-band-input"] }],
    ],
  },
  {
    id: "checklist on touch",
    width: 390,
    touch: true,
    react: `<div style={{ padding: 16 }}><MultiSelect label="Tree" options={${optsOf(12)}} defaultValue={["alder"]} /></div>`,
    skill: `<div style="padding: 16px"><div class="filter" data-label="Tree">${labelsOf(12, ["alder"])}</div></div>`,
    ready: { react: ".basalt-filter-band", skill: ".filter-band" },
    open: openTrigger,
    pairs: [
      ["trigger", ".basalt-filter-trigger", ".filter-trigger", [...BOXRECT]],
      ["popup", ".basalt-filter-popup", ".filter-popup", [...POPUP_BOX]],
      ["band", ".basalt-filter-band", ".filter-band", [...BOXRECT]],
      ["band's input", ".basalt-filter-band-input", ".filter-band-input", [...BOXRECT, "fontSize", "lineHeight"]],
      ["first row", ".basalt-filter-row", ".filter-row", [...BOXRECT, "paddingLeft", "gap"]],
      ["foot clear", ".basalt-filter-foot .basalt-filter-clear", ".filter-foot .filter-clear", [...BOXRECT]],
    ],
  },
  {
    id: "result line",
    width: 1440,
    react: `<FilterResult>Showing 3 of 24 runs</FilterResult>`,
    skill: `<p class="filter-result" data-noun="runs">Showing 3 of 24 runs</p>`,
    ready: { react: ".basalt-filter-result", skill: ".filter-result" },
    pairs: [
      ["line", ".basalt-filter-result", ".filter-result", [...BOXRECT, ...TYPE, "color", "marginTop", "marginBottom", "fontVariantNumeric"]],
      ["shown words", ".basalt-filter-result > span[aria-hidden]", ".filter-result > span[aria-hidden]", [...BOXRECT, "text"]],
      ["spoken words", ".basalt-filter-result > span[role=status]", ".filter-result > span[role=status]", ["text", "ariaLive", "ariaAtomic", "boxWidth", "boxHeight"]],
    ],
  },
];


// ---- The command list in the page, and list plus preview (step 7 of batch 7: DECISIONS 103) ----
// React's CommandList and the skill's .command-list built from the same synthetic commands, beside each other. Rows are marked by script (data-parity-row, by the command's id)
// because React's rows and the skill's share no attribute. The skill draws the field's trailing slot, the foot, the held height, the no-match state, the split and the push as React does.
const CMD_LONG = "A description that is far too long for one line of this list, so it has to be cut with an ellipsis and never wrap";
const CMD_GROUPS = [
  ["Sandbox", [
    { id: "new", label: "New sandbox", icon: "Plus", description: "Create a fresh environment", keys: ["⌘", "N"] },
    { id: "dup", label: "Duplicate", icon: "Copy", description: "Copy the current one" },
    { id: "rename", label: "Rename" },
    { id: "del", label: "Delete sandbox", icon: "Trash", danger: true, description: "Remove it for good" },
  ]],
  ["Account", [
    { id: "profile", label: "Profile" },
    { id: "keys", label: "API keys", description: CMD_LONG, keys: ["⌘", "J"] },
    { id: "billing", label: "Billing", description: "Plans and invoices" },
    { id: "team", label: "Team" },
  ]],
];
const CMD_IDS = CMD_GROUPS.flatMap(([, items]) => items.map((item) => item.id));
const CMD_IMPORTS = `import { CopyIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";\nconst { CommandList } = B;`;
const cmdReactGroups = `[${CMD_GROUPS.map(([label, items]) => `{ label: ${JSON.stringify(label)}, commands: [${items.map((c) => `{ id: ${JSON.stringify(c.id)}, label: ${JSON.stringify(c.label)}${c.icon ? `, icon: ${c.icon}Icon` : ""}${c.description ? `, description: ${JSON.stringify(c.description)}` : ""}${c.keys ? `, shortcut: ${JSON.stringify(c.keys.join(""))}` : ""}${c.danger ? ", danger: true" : ""}, onSelect() {} }`).join(", ")}] }`).join(", ")}]`;
const CMD_DETAIL_REACT = `detail={(c) => <div style={{ height: 96 }}><h3 style={{ margin: 0, font: "inherit" }}>{c.label}</h3><p style={{ margin: 0 }}>{c.description ?? "No description"}</p><div><button>Run {c.label}</button></div></div>}`;
const cmdSkillData = (preview) => `<script type="application/json" data-commands>${JSON.stringify({ groups: CMD_GROUPS.map(([label, items]) => ({ label, items })) })}</script>${preview ? CMD_IDS.map((id) => { const c = CMD_GROUPS.flatMap(([, items]) => items).find((x) => x.id === id); return `<template data-detail="${id}"><div style="height: 96px"><h3 style="margin: 0; font: inherit">${c.label}</h3><p style="margin: 0">${c.description ?? "No description"}</p><div><button>Run ${c.label}</button></div></div></template>`; }).join("") : ""}`;
const cmdReact = (width, preview = false) => `<div style={{ width: ${width} }}><CommandList label="Console" groups={${cmdReactGroups}} ${preview ? CMD_DETAIL_REACT : ""} /></div>`;
const cmdSkill = (width, preview = false) => `<div style="width: ${width}px"><div class="command-list" data-label="Console">${cmdSkillData(preview)}</div></div>`;
const markRows = {
  react: (p) => p.evaluate((ids) => [...document.querySelectorAll("[cmdk-item]")].forEach((el, i) => el.setAttribute("data-parity-row", ids[i])), CMD_IDS),
  skill: (p) => p.evaluate((ids) => [...document.querySelectorAll(".command-results .row")].forEach((el, i) => el.setAttribute("data-parity-row", ids[i])), CMD_IDS),
};
const cmdOpen = (more) => ({ react: async (p) => { await markRows.react(p); await more?.react?.(p); }, skill: async (p) => { await markRows.skill(p); await more?.skill?.(p); } });
const typeInto = (text) => ({ react: async (p) => { await p.locator(".basalt-command-input").focus(); await p.keyboard.type(text); }, skill: async (p) => { await p.locator(".input-row > input").focus(); await p.keyboard.type(text); } });
const keysInto = (...keys) => ({ react: async (p) => { await p.locator(".basalt-command-input").focus(); for (const k of keys) await p.keyboard.press(k); }, skill: async (p) => { await p.locator(".input-row > input").focus(); for (const k of keys) await p.keyboard.press(k); } });
const rowR = (id) => `[data-parity-row=${id}]`;
const CMD_PANEL = ["backgroundColor", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "borderTopWidth", "borderRightWidth", "boxShadow", "boxWidth", "boxHeight", "display", "flexDirection", "overflowX", "overflowY", "color"];
const CMD_ROW = [...BOXRECT, ...PAD, "display", "alignItems", "gridTemplateColumns", "gridTemplateRows", "columnGap", "rowGap", ...TYPE, "color", "backgroundColor", "cursor"];
const CMD_LIST_PAIRS = [
  ["panel", ".basalt-command-page", ".command-page", [...CMD_PANEL, "tabIndex"]],
  ["band", ".basalt-command-search", ".input-row", [...BOXRECT, ...PAD, "gap", "backgroundColor", "borderBottomWidth", "borderBottomColor", "color", "display", "alignItems"]],
  ["glass", ".basalt-command-search > svg", ".input-row > svg", [...BOXRECT, "color"]],
  ["field", ".basalt-command-input", ".input-row > input", [...BOXRECT, ...TYPE, "color", "backgroundColor", "borderTopWidth", "paddingLeft", "outlineStyle"]],
  ["placeholder", ".basalt-command-input", ".input-row > input", ["color", "opacity"], { pseudo: "::placeholder" }],
  ["slot", ".basalt-command-slot", ".command-slot", [...BOXRECT, "color", "display"]],
  ["body", ".basalt-command-body", ".command-body", [...BOXRECT, "position"]],
  ["list", ".basalt-command-list", ".command-results", [...BOXRECT, ...PAD, "overflowY", "overscrollBehaviorY", "scrollPaddingTop", "position"]],
  ["group heading", "[cmdk-group]:nth-child(2) [cmdk-group-heading]", ".command-sizer > :nth-child(1) .row-group", [...BOXRECT, ...TYPE, "color", "paddingTop", "paddingLeft", "paddingBottom"]],
  ["second group heading", "[cmdk-group]:nth-child(3) [cmdk-group-heading]", ".command-sizer > :nth-child(2) .row-group", [...BOXRECT, ...TYPE, "color"]],
  ["one-line row", rowR("rename"), rowR("rename"), CMD_ROW],
  ["two-line row", rowR("new"), rowR("new"), [...CMD_ROW, "minHeight"]],
  ["row glyph", `${rowR("new")} > svg`, `${rowR("new")} > svg`, [...BOXRECT, "color", "gridColumnStart", "gridRowStart", "marginRight"]],
  ["row label", `${rowR("new")} .basalt-menu-item-label`, `${rowR("new")} .row-label`, [...BOXRECT, ...TYPE, "color", "overflowX", "textOverflow", "whiteSpace", "gridColumnStart", "gridRowStart"]],
  ["row description", `${rowR("new")} .basalt-menu-item-description`, `${rowR("new")} .row-description`, [...BOXRECT, ...TYPE, "color", "overflowX", "textOverflow", "whiteSpace", "gridColumnStart", "gridColumnEnd", "gridRowStart"]],
  ["row chip", `${rowR("new")} kbd[data-shortcut]`, `${rowR("new")} .kbd-group`, [...BOXRECT, "marginLeft", "gridColumnStart", "gridRowStart"]],
  ["row chip key", `${rowR("new")} .basalt-kbd-key:last-child`, `${rowR("new")} .kbd:last-child`, [...BOXRECT, ...TYPE, "color", "backgroundColor", "fontFamily"]],
  ["row without a glyph", rowR("billing"), rowR("billing"), [...BOXRECT, "gridTemplateColumns"]],
  ["label without a glyph", `${rowR("billing")} .basalt-menu-item-label`, `${rowR("billing")} .row-label`, [...BOXRECT]],
  ["long description", `${rowR("keys")} .basalt-menu-item-description`, `${rowR("keys")} .row-description`, [...BOXRECT, "textOverflow", "overflowX"]],
  ["danger row", rowR("del"), rowR("del"), ["color", "boxHeight"]],
  ["danger description", `${rowR("del")} .basalt-menu-item-description`, `${rowR("del")} .row-description`, ["color"]],
  ["lit row at rest", rowR("new"), rowR("new"), ["color", "backgroundColor"]],
  ["lit row's description at rest", `${rowR("new")} .basalt-menu-item-description`, `${rowR("new")} .row-description`, ["color"]],
  ["lit row's plate at rest", rowR("new"), rowR("new"), ["backgroundColor", "borderTopLeftRadius", "boxHeight", "top", "bottom"], { pseudo: "::before" }],
  ["lit row's chip at rest", `${rowR("new")} .basalt-kbd-key`, `${rowR("new")} .kbd`, ["color", "backgroundColor"]],
  ["shared plate at rest", ".basalt-plate", ".command-results > .plate", ["opacity", "display", "backgroundColor", "borderTopLeftRadius"]],
  ["foot", ".basalt-command-foot", ".command-foot", [...BOXRECT, ...PAD, "borderTopWidth", "borderTopColor", "display", "flexWrap", "alignItems", "columnGap", "rowGap", "color"]],
  ["count", ".basalt-command-count", ".command-count", [...BOXRECT, ...TYPE, "color", "fontVariantNumeric", "marginTop", "marginBottom"]],
  ["shown count", ".basalt-command-count > span[aria-hidden]", ".command-count > span[aria-hidden]", ["text", "boxWidth"]],
  ["spoken count", ".basalt-command-count > span[role=status]", ".command-count > span[role=status]", ["text", "ariaLive", "ariaAtomic", "boxWidth", "boxHeight"]],
  ["hints", ".basalt-command-hints", ".command-hints", [...BOXRECT, ...TYPE, "columnGap", "marginLeft", "display", "color", "ariaHidden"]],
  ["hint", ".basalt-command-hints > span:nth-child(1)", ".command-hints > span:nth-child(1)", [...BOXRECT, "columnGap", "display", "alignItems"]],
  ["arrow keys", ".basalt-command-keys", ".command-hints .kbd-group", [...BOXRECT, "columnGap", "display"]],
  ["arrow key", ".basalt-command-keys .basalt-kbd-key", ".command-hints .kbd-group .kbd", [...BOXRECT, ...TYPE, "color", "backgroundColor", "borderTopLeftRadius"]],
  ["Enter key", ".basalt-command-hints > span:nth-child(2) .basalt-kbd-key", ".command-hints > span:nth-child(2) .kbd", [...BOXRECT, ...TYPE, "color", "backgroundColor"]],
  ["Esc hint", ".basalt-command-hints > span:nth-child(3)", ".command-hints > span:nth-child(3)", [...BOXRECT, "ownText"]],
  ["Esc key", ".basalt-command-hints > span:nth-child(3) .basalt-kbd-key", ".command-hints > span:nth-child(3) .kbd", [...BOXRECT, ...TYPE, "color", "backgroundColor"]],
];
const CMD_IN_USE = { focusOn: [".basalt-command-input", ".input-row > input"] };
const COMMANDS = [
  { id: "command list", width: 1440, react: cmdReact(640), skill: cmdSkill(640), ready: { react: "[cmdk-item]", skill: ".command-results .row" }, open: cmdOpen(), pairs: CMD_LIST_PAIRS },
  {
    id: "command list, in use",
    width: 1440,
    react: cmdReact(640),
    skill: cmdSkill(640),
    ready: { react: "[cmdk-item]", skill: ".command-results .row" },
    open: cmdOpen(),
    pairs: [
      ["field's ring", ".basalt-command-search", ".input-row", [...OUTLINE], CMD_IN_USE],
      ["lit row", rowR("new"), rowR("new"), ["color", "backgroundColor"], CMD_IN_USE],
      ["lit row's description", `${rowR("new")} .basalt-menu-item-description`, `${rowR("new")} .row-description`, ["color"], CMD_IN_USE],
      ["lit row's label", `${rowR("new")} .basalt-menu-item-label`, `${rowR("new")} .row-label`, ["color"], CMD_IN_USE],
      ["lit row's chip", `${rowR("new")} .basalt-kbd-key`, `${rowR("new")} .kbd`, ["color", "backgroundColor"], CMD_IN_USE],
      ["lit row's glyph", `${rowR("new")} > svg`, `${rowR("new")} > svg`, ["color"], CMD_IN_USE],
      ["shared plate on the two-line row", ".basalt-plate", ".command-results > .plate", ["opacity", "display", "backgroundColor", "borderTopLeftRadius", "boxWidth", "boxHeight", "transform", "transitionProperty", "transitionDuration", "transitionTimingFunction"], CMD_IN_USE],
      ["group heading", "[cmdk-group]:nth-child(2) [cmdk-group-heading]", ".command-sizer > :nth-child(1) .row-group", ["color"], CMD_IN_USE],
    ],
  },
  {
    id: "command list, the one-line row lit",
    width: 1440,
    react: cmdReact(640),
    skill: cmdSkill(640),
    ready: { react: "[cmdk-item]", skill: ".command-results .row" },
    open: cmdOpen(keysInto("ArrowDown", "ArrowDown")),
    pairs: [
      ["lit row", rowR("rename"), rowR("rename"), ["color", "backgroundColor"], CMD_IN_USE],
      ["shared plate on the one-line row", ".basalt-plate", ".command-results > .plate", ["opacity", "backgroundColor", "boxWidth", "boxHeight", "transform"], CMD_IN_USE],
      ["the row that was lit", rowR("new"), rowR("new"), ["color"], CMD_IN_USE],
      ["the lit row's plate (own)", rowR("rename"), rowR("rename"), ["backgroundColor", "boxHeight"], { ...CMD_IN_USE, pseudo: "::before" }],
    ],
  },
  {
    id: "command list, a danger row lit",
    width: 1440,
    react: cmdReact(640),
    skill: cmdSkill(640),
    ready: { react: "[cmdk-item]", skill: ".command-results .row" },
    open: cmdOpen(keysInto("ArrowDown", "ArrowDown", "ArrowDown")),
    pairs: [
      ["lit danger row", rowR("del"), rowR("del"), ["color", "backgroundColor"], CMD_IN_USE],
      ["lit danger description", `${rowR("del")} .basalt-menu-item-description`, `${rowR("del")} .row-description`, ["color"], CMD_IN_USE],
      ["lit danger glyph", `${rowR("del")} > svg`, `${rowR("del")} > svg`, ["color"], CMD_IN_USE],
      ["shared plate on the danger row", ".basalt-plate", ".command-results > .plate", ["opacity", "backgroundColor", "boxWidth", "boxHeight", "transform"], CMD_IN_USE],
    ],
  },
  {
    id: "command list, no match",
    width: 1440,
    react: cmdReact(640),
    skill: cmdSkill(640),
    ready: { react: "[cmdk-item]", skill: ".command-results .row" },
    open: cmdOpen(typeInto("zzz")),
    pairs: [
      ["panel", ".basalt-command-page", ".command-page", ["boxHeight", "boxWidth"]],
      ["held body", ".basalt-command-body", ".command-body", [...BOXRECT]],
      ["none", ".basalt-command-none", ".command-none", [...BOXRECT, ...PAD, "display", "flexDirection", "alignItems", "justifyContent", "rowGap", "textAlign", ...TYPE, "color", "position"]],
      ["sentence", ".basalt-command-none p", ".command-none p", [...BOXRECT, ...TYPE, "color", "text", "marginTop", "marginBottom"]],
      ["clear button", ".basalt-command-none button", ".command-none button", [...BOXRECT, ...TYPE, "color", "backgroundColor", "borderTopWidth", "borderTopLeftRadius", "text"]],
      ["count", ".basalt-command-count > span[aria-hidden]", ".command-count > span[aria-hidden]", ["text", "boxWidth"]],
      ["foot", ".basalt-command-foot", ".command-foot", [...BOXRECT]],
      ["list is empty", ".basalt-command-list", ".command-results", [...BOXRECT, "overflowY"]],
    ],
  },
  {
    id: "list plus preview, split",
    width: 1440,
    react: cmdReact(900, true),
    skill: cmdSkill(900, true),
    ready: { react: ".basalt-command-split[data-mode=split]", skill: ".command-split[data-mode=split]" },
    open: cmdOpen(),
    pairs: [
      ["split", ".basalt-command-split", ".command-split", [...BOXRECT, "display", "gridTemplateColumns", "columnGap", "alignItems"]],
      ["list panel", ".basalt-command-page", ".command-page", [...CMD_PANEL, ...BOXRECT]],
      ["pane panel", ".basalt-command-pane", ".command-pane", [...CMD_PANEL, ...BOXRECT, "contain"]],
      ["pane body", ".basalt-command-pane-body", ".command-pane-body", [...BOXRECT, ...PAD]],
      ["back band", ".basalt-command-back", ".command-back", ["display"]],
      ["chevron", `${rowR("new")} .basalt-menu-item-chevron`, `${rowR("new")} .row-chevron`, ["display"]],
      ["hints", ".basalt-command-hints > span:nth-child(2)", ".command-hints > span:nth-child(2)", ["ownText"]],
      ["panel", ".basalt-command-page", ".command-page", ["boxHeight"]],
      ["pane heading", ".basalt-command-pane-body h3", ".command-pane-body h3", ["text", "ariaHidden"]],
      ["row", rowR("new"), rowR("new"), [...BOXRECT]],
      ["hovered row's ink", rowR("dup"), rowR("dup"), ["color"], { hover: [rowR("dup"), rowR("dup")] }],
      ["hovered row's description", `${rowR("dup")} .basalt-menu-item-description`, `${rowR("dup")} .row-description`, ["color"], { hover: [rowR("dup"), rowR("dup")] }],
      ["hovered row keeps no plate", rowR("dup"), rowR("dup"), ["backgroundColor"], { pseudo: "::before", hover: [rowR("dup"), rowR("dup")] }],
    ],
  },
  {
    id: "list plus preview, just under the split",
    width: 1440,
    react: cmdReact(815, true),
    skill: cmdSkill(815, true),
    ready: { react: ".basalt-command-split[data-mode=push]", skill: ".command-split[data-mode=push]" },
    open: cmdOpen(),
    pairs: [
      ["split", ".basalt-command-split", ".command-split", [...BOXRECT, "display", "gridTemplateColumns"]],
      ["list panel", ".basalt-command-page", ".command-page", [...BOXRECT, "display"]],
      ["pane panel", ".basalt-command-pane", ".command-pane", ["display"]],
      ["chevron", `${rowR("new")} .basalt-menu-item-chevron`, `${rowR("new")} .row-chevron`, [...BOXRECT, "display", "color", "marginLeft", "gridColumnStart", "gridRowStart"]],
      ["chevron without a description", `${rowR("rename")} .basalt-menu-item-chevron`, `${rowR("rename")} .row-chevron`, [...BOXRECT, "display", "marginLeft"]],
      ["hints", ".basalt-command-hints > span:nth-child(2)", ".command-hints > span:nth-child(2)", ["ownText"]],
      ["one-line row", rowR("rename"), rowR("rename"), [...BOXRECT, "gridTemplateColumns", "columnGap"]],
      ["two-line row", rowR("new"), rowR("new"), [...BOXRECT, "gridTemplateColumns"]],
    ],
  },
  {
    id: "list plus preview, the push at 390",
    width: 390,
    touch: true,
    react: cmdReact(390, true),
    skill: cmdSkill(390, true),
    ready: { react: ".basalt-command-split[data-mode=push]", skill: ".command-split[data-mode=push]" },
    open: {
      react: async (p) => { await markRows.react(p); await p.locator(rowR("dup")).tap(); await p.waitForSelector(".basalt-command-split[data-view=detail]"); },
      skill: async (p) => { await markRows.skill(p); await p.locator(rowR("dup")).tap(); await p.waitForSelector(".command-split[data-view=detail]"); },
    },
    pairs: [
      ["split", ".basalt-command-split", ".command-split", [...BOXRECT, "display", "gridTemplateColumns"]],
      ["list panel", ".basalt-command-page", ".command-page", ["display"]],
      ["pane panel", ".basalt-command-pane", ".command-pane", [...CMD_PANEL, ...BOXRECT]],
      ["back band", ".basalt-command-back", ".command-back", [...BOXRECT, ...PAD, "display", "alignItems", "borderBottomWidth", "borderBottomColor"]],
      ["back button", ".basalt-command-back button", ".command-back button", [...BOXRECT, ...PAD, ...TYPE, "color", "backgroundColor", "gap", "borderTopLeftRadius", "ariaLabel"]],
      ["back glyph", ".basalt-command-back button svg", ".command-back button svg", [...BOXRECT, "color"]],
      ["pane body", ".basalt-command-pane-body", ".command-pane-body", [...BOXRECT, ...PAD]],
      ["pane heading", ".basalt-command-pane-body h3", ".command-pane-body h3", ["text"]],
      ["heading has focus", ".basalt-command-pane-body h3", ".command-pane-body h3", ["outlineStyle", "tabIndex", "isActive"]],
      ["region", ".basalt-command-pane", ".command-pane", ["role", "labelledByText"]],
    ],
  },
  {
    id: "list plus preview, the push at 390: the list",
    width: 390,
    touch: true,
    react: cmdReact(390, true),
    skill: cmdSkill(390, true),
    ready: { react: ".basalt-command-split[data-mode=push]", skill: ".command-split[data-mode=push]" },
    open: cmdOpen(),
    pairs: [
      ["split", ".basalt-command-split", ".command-split", [...BOXRECT, "display"]],
      ["list panel", ".basalt-command-page", ".command-page", [...CMD_PANEL, ...BOXRECT]],
      ["pane panel", ".basalt-command-pane", ".command-pane", ["display"]],
      ["two-line row", rowR("new"), rowR("new"), [...CMD_ROW, "minHeight"]],
      ["chevron", `${rowR("new")} .basalt-menu-item-chevron`, `${rowR("new")} .row-chevron`, [...BOXRECT, "display", "color"]],
      ["one-line row", rowR("rename"), rowR("rename"), CMD_ROW],
      ["chevron, one line", `${rowR("rename")} .basalt-menu-item-chevron`, `${rowR("rename")} .row-chevron`, [...BOXRECT, "display"]],
      ["hints are not drawn on touch", ".basalt-command-hints", ".command-hints", ["display"]],
      ["foot", ".basalt-command-foot", ".command-foot", [...BOXRECT, ...PAD]],
      ["count", ".basalt-command-count", ".command-count", [...BOXRECT, ...TYPE]],
      ["band", ".basalt-command-search", ".input-row", [...BOXRECT, ...PAD, "backgroundColor"]],
      ["field", ".basalt-command-input", ".input-row > input", [...BOXRECT, ...TYPE]],
      ["body", ".basalt-command-body", ".command-body", [...BOXRECT]],
    ],
  },
];

// ---- Art (step 8 of batch 7): the stage and paired art, and framed art ----
// The stage under the site header (the bar stays smoked: React's clears only over a stage that declared its headroom, which a page can't prove), paired art, and a frame in
// every aspect, with a caption and a credit, bare, in a card, failed and in its loading state. A frame's phase is read from data-phase; the loading state is forced on
// both pages (the behaviour tests hold a real load), because computed style is all this file reads.
const ART_IMPORTS = `const { SiteHeader, Stage, PairedArt, FramedArt, Card, CardContent } = B;`;
const ART_BAR = `<SiteHeader brand={<>${NAV_MARK}<span>Acme</span></>} brandLabel="Acme home" />`;
const ART_BAR_SKILL = `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#" aria-label="Acme home">${NAV_MARK}<span>Acme</span></a><span class="spacer"></span></div></header>`;
const stageReact = `<div>${ART_BAR}<Stage art={<PairedArt dark={"${NIGHT}"} light={"${DAY}"} loading="eager" width={1600} height={800} position="30% 50%" />}><div style={{ height: 360, padding: "0 24px" }}><h1 style={{ margin: 0 }}>A synthetic headline</h1></div></Stage><main style={{ height: 900 }} /></div>`;
const stageSkill = `${ART_BAR_SKILL}<section class="stage"><div class="stage-art" aria-hidden="true"><img class="paired-art" data-art="dark" src="${NIGHT}" alt="" width="1600" height="800" loading="eager" decoding="async" style="object-position: 30% 50%"><img class="paired-art" data-art="light" src="${DAY}" alt="" width="1600" height="800" loading="eager" decoding="async" style="object-position: 30% 50%"></div><div class="stage-content"><div style="height: 360px; padding: 0 24px"><h1 style="margin: 0">A synthetic headline</h1></div></div></section><main style="height: 900px"></main>`;
const STAGE_PAIRS = [
  ["stage", ".basalt-stage", ".stage", [...BOXRECT, "paddingTop", "paddingBottom", "marginTop", "backgroundColor", "backgroundImage", "color", "position", "boxSizing", "fontFamily", "borderTopWidth", "borderTopLeftRadius", "boxShadow", "overflow", "fontSize", "lineHeight"]],
  ["art layer", ".basalt-stage-art", ".stage-art", [...BOXRECT, "position", "overflow", "pointerEvents", "ariaHidden"]],
  ["dark picture", ".basalt-paired-art[data-art=dark]", ".paired-art[data-art=dark]", [...BOXRECT, "display", "position", "objectFit", "objectPosition", "filter", "mixBlendMode", "opacity"]],
  ["light picture", ".basalt-paired-art[data-art=light]", ".paired-art[data-art=light]", [...BOXRECT, "display", "position", "objectFit", "objectPosition", "filter", "mixBlendMode", "opacity"]],
  ["content", ".basalt-stage-content", ".stage-content", [...BOXRECT, "position"]],
  ["the bar over it", ".basalt-site-header", ".topbar", [...HEADER_BAR, "rectTop", "borderBottomColor"]],
];
const FRAME = [...BOXRECT, "aspectRatio", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "borderTopStyle", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomLeftRadius", "borderBottomRightRadius", "backgroundColor", "overflow", "boxShadow", "position", "boxSizing", "outlineStyle", "dataPhase"];
const FRAME_IMG = [...BOXRECT, "display", "objectFit", "opacity", "firstTransitionDuration", "firstTransitionTimingFunction", "boxShadow", "borderTopWidth"];
const FRAME_CAPTION = [...BOXRECT, "marginTop", "maxWidth", "textAlign", ...TYPE, "color", "fontFamily", "display", "boxSizing"];
const FRAME_CREDIT = [...BOXRECT, "display", ...TYPE, "color"];
const FRAME_ALT = [...BOXRECT, "position", "display", "alignItems", "justifyContent", ...PAD, ...TYPE, "color", "textAlign", "text"];
const framedReact = (id, aspect, { src = PHOTO, alt = "A synthetic dune", caption = "Dunes at the end of the day.", credit = "Synthetic art", width = 320 } = {}) => `<FramedArt id="${id}" ${aspect ? `aspect="${aspect}" ` : ""}src={"${src}"} alt={${JSON.stringify(alt)}} ${caption ? `caption={${JSON.stringify(caption)}} ` : ""}${credit ? `credit={${JSON.stringify(credit)}} ` : ""}loading="eager" style={{ width: ${width} }} />`;
const framedSkill = (id, aspect, { src = PHOTO, alt = "A synthetic dune", caption = "Dunes at the end of the day.", credit = "Synthetic art", width = 320 } = {}) => `<figure class="framed" id="${id}"${aspect ? ` data-aspect="${aspect}"` : ""} style="width: ${width}px"><div class="framed-frame"><img src="${src}" alt="${alt}" loading="eager" decoding="async"></div>${caption || credit ? `<figcaption>${caption ?? ""}${credit ? `<span class="framed-credit">${credit}</span>` : ""}</figcaption>` : ""}</figure>`;
const framedPairs = (id, { caption = true, credit = true, alt = true } = {}) => [
  [`${id} frame`, `#${id} .basalt-framed-frame`, `#${id} .framed-frame`, FRAME],
  [`${id} figure`, `#${id}`, `#${id}`, [...BOXRECT, "display", "maxWidth", "marginTop", "marginBottom", "marginLeft", "fontFamily"]],
  [`${id} picture`, `#${id} .basalt-framed-img`, `#${id} .framed-frame > img`, FRAME_IMG],
  ...(caption ? [[`${id} caption`, `#${id} figcaption`, `#${id} figcaption`, FRAME_CAPTION]] : []),
  ...(credit ? [[`${id} credit`, `#${id} .basalt-framed-credit`, `#${id} .framed-credit`, FRAME_CREDIT]] : []),
  ...(alt ? [[`${id} alt`, `#${id} .basalt-framed-alt`, `#${id} .framed-alt`, FRAME_ALT]] : []),
];
const phase = (name) => ({ react: `.basalt-framed-frame[data-phase=${name}]`, skill: `.framed-frame[data-phase=${name}]` });
const framedWrap = (inner) => `<div style={{ display: "grid", gap: 24, padding: 24, width: 640, justifyItems: "start" }}>${inner}</div>`;
const framedWrapSkill = (inner) => `<div style="display: grid; gap: 24px; padding: 24px; width: 640px; justify-items: start">${inner}</div>`;
const ART = [
  { id: "the stage, at 1440", width: 1440, react: stageReact, skill: stageSkill, ready: { react: ".basalt-stage", skill: ".stage" }, pairs: STAGE_PAIRS },
  { id: "the stage, at 390", width: 390, touch: true, react: stageReact, skill: stageSkill, ready: { react: ".basalt-stage", skill: ".stage" }, pairs: STAGE_PAIRS },
  {
    id: "framed art in every aspect",
    width: 1440,
    react: framedWrap(`${framedReact("f-photo", undefined, { width: 480 })}${framedReact("f-square", "square", { width: 200, credit: "" })}${framedReact("f-screen", "screen", { caption: "" })}${framedReact("f-wide", "wide", { alt: "", caption: "", credit: "" })}`),
    skill: framedWrapSkill(`${framedSkill("f-photo", undefined, { width: 480 })}${framedSkill("f-square", "square", { width: 200, credit: "" })}${framedSkill("f-screen", "screen", { caption: "" })}${framedSkill("f-wide", "wide", { alt: "", caption: "", credit: "" })}`),
    ready: phase("loaded"),
    pairs: [
      ...framedPairs("f-photo", { alt: false }),
      ...framedPairs("f-square", { credit: false, alt: false }),
      ...framedPairs("f-screen", { caption: false, alt: false }),
      ...framedPairs("f-wide", { caption: false, credit: false, alt: false }),
    ],
  },
  {
    id: "framed art in a card",
    width: 1440,
    react: `<div style={{ width: 400, padding: 24 }}><Card><CardContent>${framedReact("f-card", undefined, { width: 340 })}</CardContent></Card></div>`,
    skill: `<div style="box-sizing: content-box; width: 400px; padding: 24px"><div class="card">${framedSkill("f-card", undefined, { width: 340 })}</div></div>`,
    ready: phase("loaded"),
    pairs: [["card", ".basalt-card", ".card", [...BOXRECT, "borderTopLeftRadius"]], ["card's padding", ".basalt-card-content", ".card", PAD], ...framedPairs("f-card", { alt: false })],
  },
  {
    id: "framed art that failed",
    width: 1440,
    react: framedWrap(`${framedReact("f-fail", "wide", { src: BROKEN, alt: "A picture that did not load", width: 400 })}${framedReact("f-decor", "wide", { src: BROKEN, alt: "", caption: "", credit: "", width: 400 })}`),
    skill: framedWrapSkill(`${framedSkill("f-fail", "wide", { src: BROKEN, alt: "A picture that did not load", width: 400 })}${framedSkill("f-decor", "wide", { src: BROKEN, alt: "", caption: "", credit: "", width: 400 })}`),
    ready: phase("failed"),
    pairs: [
      ...framedPairs("f-fail"),
      ["f-fail frame's parts", "#f-fail .basalt-framed-frame", "#f-fail .framed-frame", ["childCount"]],
      ...framedPairs("f-decor", { caption: false, credit: false, alt: false }),
      ["f-decor frame's parts", "#f-decor .basalt-framed-frame", "#f-decor .framed-frame", ["childCount", "text"]],
    ],
  },
  {
    id: "framed art while it loads",
    width: 1440,
    react: framedWrap(framedReact("f-load", undefined, { width: 480 })),
    skill: framedWrapSkill(framedSkill("f-load", undefined, { width: 480 })),
    ready: phase("loaded"),
    open: {
      react: (p) => p.evaluate(() => document.querySelector(".basalt-framed-frame").setAttribute("data-phase", "loading")),
      skill: (p) => p.evaluate(() => document.querySelector(".framed-frame").setAttribute("data-phase", "loading")),
    },
    pairs: [["frame", "#f-load .basalt-framed-frame", "#f-load .framed-frame", FRAME], ["picture", "#f-load .basalt-framed-img", "#f-load .framed-frame > img", FRAME_IMG]],
  },
];

// ---- The rest of the overlays (step 9 of batch 7): the combobox and the sparkline ----
// The combobox is read closed (the field, its placeholder and caret), chosen (a value in it), in focus, open (the popup, the rows, the check, the two-line row, the lit row, the shared
// plate, the disabled row) and with no match (the empty sentence). The popup's place is read against the field, marked on both pages (the group has no props of its own in React). The
// sparkline is read with data, with one sample, empty and loading.
const REST_IMPORTS = `const { Combobox, Sparkline, SkipLink, Text, Heading, Lead, PageRow, PageSections, PageSection, SectionIntro, SectionActions, Columns, ColumnsItem, Button } = B;`;
const CB_OPTIONS = `[{ value: "eu", label: "Frankfurt", description: "eu-central, lowest latency" }, { value: "us", label: "Ashburn" }, { value: "ap", label: "Singapore" }, { value: "gone", label: "Sydney", disabled: true }]`;
const cbSkill = (inner = "", { chosen = true, attrs = "" } = {}) => `<div class="combobox" data-empty="No options match."><input class="input" aria-label="Region" placeholder="Search regions…"${attrs}><ul><li data-value="eu" data-description="eu-central, lowest latency">Frankfurt</li><li data-value="us"${chosen ? ' aria-selected="true"' : ""}>Ashburn</li><li data-value="ap">Singapore</li><li data-value="gone" aria-disabled="true">Sydney</li></ul></div>${inner}`;
const cbFrame = (inner) => `<div style={{ padding: 16, width: 320 }}>${inner}</div>`;
const cbFrameSkill = (inner) => `<div style="padding: 16px; width: 352px">${inner}</div>`;
const CB_FIELD = [...BOXRECT, "display", "position", "minWidth"];
const CB_INPUT = [...BOXRECT, ...GEOMETRY, "paddingRight", ...TYPE, "color", "backgroundColor", "boxShadow", "borderTopWidth", "outlineStyle", "fontFamily", "cursor"];
const CB_TRIGGER = [...BOXRECT, "position", "display", ...GEOMETRY, "color", "backgroundColor", "boxShadow", "cursor", "transform"];
const CB_ROW = [...GEOMETRY, ...TYPE, "color", "backgroundColor", "gap", "boxHeight", "boxWidth", "display", "cursor", "gridTemplateColumns", "gridTemplateRows"];
const CB_PLATE = ["top", "bottom", "borderTopLeftRadius", "backgroundColor", "boxHeight"];
const cbRow = (n) => `[role=listbox] > :nth-child(${n})`;
const cbMark = {
  react: (p) => p.evaluate(() => document.querySelector(".basalt-combobox").setAttribute("data-parity-trigger", "")),
  skill: (p) => p.evaluate(() => document.querySelector(".combobox").setAttribute("data-parity-trigger", "")),
};
const CB_FIELD_PAIRS = [
  ["field", ".basalt-combobox", ".combobox", CB_FIELD],
  ["input", ".basalt-combobox-input", ".combobox > .input", CB_INPUT],
  ["placeholder", ".basalt-combobox-input", ".combobox > .input", ["color", "opacity"], { pseudo: "::placeholder" }],
  ["caret button", ".basalt-combobox-trigger", ".combobox-trigger", CB_TRIGGER],
  ["caret", ".basalt-combobox-trigger svg", ".combobox-trigger svg", [...BOXRECT, "color", "fill"]],
];
const CB_OPEN_PAIRS = [
  ["popup", ".basalt-combobox-popup", ".combobox-popup", [...PANEL, ...PAD, "boxWidth", "boxHeight", "minWidth", "maxWidth", "gapBelow", "startOffset", "overflowY", ...ENTRY]],
  ["row", `.basalt-combobox-popup ${cbRow(2)}`, `.combobox-popup ${cbRow(2)}`, CB_ROW],
  ["row plate", `.basalt-combobox-popup ${cbRow(2)}`, `.combobox-popup ${cbRow(2)}`, CB_PLATE, { pseudo: "::before" }],
  ["chosen row's check", `.basalt-combobox-popup ${cbRow(2)} .basalt-menu-check`, `.combobox-popup ${cbRow(2)} .combobox-check`, ["boxWidth", "boxHeight", "color", "display"]],
  ["check mark", `.basalt-combobox-popup ${cbRow(2)} .basalt-menu-check svg`, `.combobox-popup ${cbRow(2)} .combobox-check svg`, ["boxWidth", "boxHeight", "color", "fill", "visibility"]],
  ["label", `.basalt-combobox-popup ${cbRow(3)} .basalt-menu-item-label`, `.combobox-popup ${cbRow(3)} .combobox-option-label`, [...BOXRECT, ...TYPE, "color", "flexGrow"]],
  ["unchosen row's seat", `.basalt-combobox-popup ${cbRow(3)} .basalt-menu-check`, `.combobox-popup ${cbRow(3)} .combobox-check`, ["boxWidth", "boxHeight", "display"]],
  ["lit row", `.basalt-combobox-popup ${cbRow(1)}`, `.combobox-popup ${cbRow(1)}`, CB_ROW],
  ["lit plate", `.basalt-combobox-popup ${cbRow(1)}`, `.combobox-popup ${cbRow(1)}`, CB_PLATE, { pseudo: "::before" }],
  ["glide plate", ".basalt-combobox-popup .basalt-plate", ".combobox-popup .plate", ["backgroundColor", "borderTopLeftRadius", "boxHeight", "boxWidth", "display", "opacity", "firstTransitionDuration", "firstTransitionTimingFunction"]],
  ["described row's description", `.basalt-combobox-popup ${cbRow(1)} .basalt-menu-item-description`, `.combobox-popup ${cbRow(1)} .combobox-option-description`, [...TYPE, "color", "boxHeight", "boxWidth", "whiteSpace", "textOverflow", "gridColumnStart", "gridRowStart"]],
  ["described row's label", `.basalt-combobox-popup ${cbRow(1)} .basalt-menu-item-label`, `.combobox-popup ${cbRow(1)} .combobox-option-label`, [...BOXRECT, "gridColumnStart", "gridRowStart", "overflowX", "textOverflow"]],
  ["disabled row", `.basalt-combobox-popup ${cbRow(4)}`, `.combobox-popup ${cbRow(4)}`, [...CB_ROW]],
  ["disabled row's ink", `.basalt-combobox-popup ${cbRow(4)}`, `.combobox-popup ${cbRow(4)}`, ["color"]],
  ["list", ".basalt-combobox-popup [role=listbox]", ".combobox-popup [role=listbox]", [...BOXRECT, "role"]],
  ["empty sentence", ".basalt-combobox-empty", ".combobox-empty", [...PAD, ...TYPE, "color", "display", "role", "ariaLive", "ariaAtomic"]],
];
const SPARK_DATA = "[12, 18, 9, 30, 24]";
const sparkReact = (label, props) => `<div style={{ width: 240 }}><Sparkline label="${label}" ${props} /></div>`;
const sparkSkill = (options) => `<div style="width: 240px"><div class="sparkline"><script type="application/json" data-sparkline>${JSON.stringify(options)}</script></div></div>`;
const SPARK_BOX = [...BOXRECT, "display", "flexDirection", "rowGap", "minWidth"];
const SPARK_PAIRS = [
  ["sparkline", ".basalt-sparkline", ".sparkline", SPARK_BOX],
  ["head", ".basalt-sparkline-head", ".sparkline-head", [...BOXRECT, "display", "justifyContent", "columnGap"]],
  ["label", ".basalt-sparkline-label", ".sparkline-label", [...BOXRECT, ...TYPE, "color", "fontFamily"]],
  ["value", ".basalt-ticker", ".sparkline-value", [...BOXRECT, "display", "alignItems", ...TYPE, "color", "fontVariantNumeric", "fontKerning"]],
  ["value, as spoken", ".basalt-ticker-text", ".sparkline-value > .sparkline-text", ["plainText", "position", "boxWidth", "boxHeight"]],
  ["value's digits", ".basalt-ticker-digit", ".sparkline-value [data-d]", ["rectLeft", "rectTop", "boxHeight", "display", "overflowX", "lineHeight"]],
  ["image", ".basalt-sparkline svg", ".sparkline svg", [...BOXRECT, "color", "ariaLabel", "role", "attrViewBox"]],
  ["line", ".basalt-sparkline-line", ".sparkline-line", ["attrPoints", "fill", "stroke", "strokeWidth", "strokeLinecap", "strokeLinejoin"]],
  ["axis", ".basalt-sparkline-axis", ".sparkline-axis", [...BOXRECT, "display", "justifyContent", "columnGap", "color", "fontSize", "lineHeight", "fontVariantNumeric"]],
  ["axis's zero", ".basalt-sparkline-axis > :first-child", ".sparkline-axis > :first-child", [...BOXRECT, "plainText"]],
  ["axis's peak", ".basalt-sparkline-axis > :last-child", ".sparkline-axis > :last-child", [...BOXRECT]],
  ["axis's peak, as spoken", ".basalt-sparkline-axis .basalt-visually-hidden", ".sparkline-axis > :last-child", ["plainText"]],
];
const SKIP = [...BOXRECT, "position", "transform", "left", "top", "zIndex", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopLeftRadius", "backgroundColor", "color", "display", "alignItems", "minHeight",
  "textDecorationLine", "textDecorationColor", "textUnderlineOffset", "boxSizing", ...TYPE, "fontFamily"];
const SKIP_REACT = `<><SkipLink target="main" /><main id="main" tabIndex={-1} style={{ height: 120, padding: 16 }}>Synthetic page.</main></>`;
const SKIP_SKILL = `<a class="skip-link" href="#main">Skip to content</a><main id="main" tabindex="-1" style="height: 120px; padding: 16px">Synthetic page.</main>`;
const REST = [
  {
    id: "skip link, unseen",
    width: 1440,
    react: SKIP_REACT,
    skill: SKIP_SKILL,
    ready: { react: ".basalt-skip-link", skill: ".skip-link" },
    pairs: [["the link at rest, above the page", ".basalt-skip-link", ".skip-link", SKIP]],
  },
  {
    id: "skip link, focused",
    width: 1440,
    react: SKIP_REACT,
    skill: SKIP_SKILL,
    ready: { react: ".basalt-skip-link", skill: ".skip-link" },
    pairs: [
      ["the link in focus, at the page's top start", ".basalt-skip-link", ".skip-link", SKIP, { focus: true }],
      ["its focus ring", ".basalt-skip-link", ".skip-link", [...OUTLINE, "boxShadow"], { focus: true }],
    ],
  },
  {
    id: "skip link, touch",
    width: 390,
    touch: true,
    react: SKIP_REACT,
    skill: SKIP_SKILL,
    ready: { react: ".basalt-skip-link", skill: ".skip-link" },
    pairs: [["the link in focus on a coarse pointer: 44px tall", ".basalt-skip-link", ".skip-link", SKIP, { focus: true }]],
  },
  {
    id: "combobox, closed",
    width: 1440,
    react: cbFrame(`<Combobox aria-label="Region" placeholder="Search regions…" options={${CB_OPTIONS}} />`),
    skill: cbFrameSkill(cbSkill("", { chosen: false })),
    ready: { react: ".basalt-combobox", skill: ".combobox-trigger" },
    pairs: [...CB_FIELD_PAIRS, ["focus ring", ".basalt-combobox-input", ".combobox > .input", [...OUTLINE, "boxShadow"], { focus: true }]],
  },
  {
    id: "combobox, with a chosen value",
    width: 1440,
    react: cbFrame(`<Combobox aria-label="Region" defaultValue="us" options={${CB_OPTIONS}} />`),
    skill: cbFrameSkill(cbSkill()),
    ready: { react: ".basalt-combobox", skill: ".combobox-trigger" },
    pairs: [["field", ".basalt-combobox", ".combobox", CB_FIELD], ["input", ".basalt-combobox-input", ".combobox > .input", [...CB_INPUT, "value"]], ["input's text", ".basalt-combobox-input", ".combobox > .input", ["color"]]],
  },
  {
    id: "combobox, open",
    width: 1440,
    react: cbFrame(`<Combobox aria-label="Region" defaultOpen defaultValue="us" options={${CB_OPTIONS}} />`),
    skill: cbFrameSkill(cbSkill()),
    ready: { react: ".basalt-combobox-popup", skill: ".combobox-trigger" },
    open: {
      react: async (p) => { await cbMark.react(p); await p.locator(".basalt-combobox-popup [role=listbox] > :nth-child(1)").hover(); },
      skill: async (p) => { await cbMark.skill(p); await p.locator(".combobox-trigger").click(); await p.waitForSelector(".combobox-popup:popover-open"); await p.locator(".combobox-popup [role=listbox] > :nth-child(1)").hover(); },
    },
    pairs: CB_OPEN_PAIRS.filter(([label]) => label !== "empty sentence"),
  },
  {
    id: "combobox, with no match",
    width: 1440,
    react: cbFrame(`<Combobox aria-label="Region" defaultOpen options={${CB_OPTIONS}} />`),
    skill: cbFrameSkill(cbSkill("", { chosen: false })),
    ready: { react: ".basalt-combobox-popup", skill: ".combobox-trigger" },
    open: {
      react: async (p) => { await cbMark.react(p); await p.locator("input.basalt-combobox-input").pressSequentially("zzz"); },
      skill: async (p) => { await cbMark.skill(p); await p.locator(".combobox > .input").pressSequentially("zzz"); await p.waitForSelector(".combobox-popup:popover-open"); },
    },
    pairs: [CB_OPEN_PAIRS[0], CB_OPEN_PAIRS.at(-1)],
  },
  {
    id: "combobox on touch",
    width: 390,
    touch: true,
    react: cbFrame(`<Combobox aria-label="Region" defaultOpen defaultValue="us" options={${CB_OPTIONS}} />`),
    skill: cbFrameSkill(cbSkill()),
    ready: { react: ".basalt-combobox-popup", skill: ".combobox-trigger" },
    // Both fields are in focus with the first row lit, by the keys (a tap would leave a hover on the caret in the skill's page only).
    open: {
      react: async (p) => { await cbMark.react(p); await p.locator("input.basalt-combobox-input").focus(); await p.keyboard.press("ArrowDown"); },
      skill: async (p) => { await cbMark.skill(p); await p.locator(".combobox > .input").focus(); await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowUp"); await p.waitForSelector(".combobox-popup:popover-open"); },
    },
    pairs: [
      ...CB_FIELD_PAIRS,
      ["popup", ".basalt-combobox-popup", ".combobox-popup", [...PANEL, ...PAD, "boxWidth", "boxHeight", "minWidth", "gapBelow", "startOffset"]],
      ["row", `.basalt-combobox-popup ${cbRow(2)}`, `.combobox-popup ${cbRow(2)}`, CB_ROW],
      ["described row", `.basalt-combobox-popup ${cbRow(1)}`, `.combobox-popup ${cbRow(1)}`, [...CB_ROW, "minHeight"]],
    ],
  },
  {
    id: "sparkline",
    width: 1440,
    react: sparkReact("Requests", `data={${SPARK_DATA}}`),
    skill: sparkSkill({ label: "Requests", data: [12, 18, 9, 30, 24] }),
    ready: { react: ".basalt-sparkline-line", skill: ".sparkline-line" },
    pairs: SPARK_PAIRS,
  },
  {
    id: "sparkline, a decimal and one sample",
    width: 1440,
    react: sparkReact("Load", `data={[1234.5]}`),
    skill: sparkSkill({ label: "Load", data: [1234.5] }),
    ready: { react: ".basalt-sparkline-line", skill: ".sparkline-line" },
    pairs: SPARK_PAIRS,
  },
  {
    id: "sparkline, empty",
    width: 1440,
    react: sparkReact("Requests", `data={[]}`),
    skill: sparkSkill({ label: "Requests", data: [] }),
    ready: { react: ".basalt-sparkline-empty", skill: ".sparkline-empty" },
    pairs: [...SPARK_PAIRS.filter(([label]) => ["sparkline", "head", "label"].includes(label)), ["sentence", ".basalt-sparkline-empty", ".sparkline-empty", [...BOXRECT, ...TYPE, "color", "marginTop", "marginBottom", "plainText"]], ["no image", ".basalt-sparkline", ".sparkline", ["childCount"]]],
  },
  {
    id: "sparkline, loading",
    width: 1440,
    react: sparkReact("Requests", `data={${SPARK_DATA}} loading`),
    skill: sparkSkill({ label: "Requests", data: [12, 18, 9, 30, 24], loading: true }),
    ready: { react: ".basalt-sparkline[data-loading]", skill: ".sparkline[data-loading]" },
    pairs: [...SPARK_PAIRS, ["breathing", ".basalt-sparkline-line", ".sparkline-line", ["animationDuration", "animationTimingFunction", "animationIterationCount", "animationDirection"]]],
  },
  {
    id: "sparkline, loading with nothing yet",
    width: 1440,
    react: sparkReact("Requests", `data={[]} loading`),
    skill: sparkSkill({ label: "Requests", data: [], loading: true }),
    ready: { react: ".basalt-sparkline[data-loading]", skill: ".sparkline[data-loading]" },
    pairs: [...SPARK_PAIRS.filter(([label]) => ["sparkline", "head", "image", "line"].includes(label)), ["no axis", ".basalt-sparkline", ".sparkline", ["childCount"]]],
  },
];

// Display type, the lead, the row, the sections and the columns (DECISIONS 137): React's parts and the skill's classes, read at the three shapes a page has (1440, 800 and 390).
const TL_TYPE = [...TYPE, "color", "fontFamily", "maxWidth", "textWrapStyle", "overflowWrap", "hyphens", "boxWidth", "boxHeight", "rectLeft", "rectTop"];
const TL_REACT = (layout = "3") => `<><PageSections><PageSection aria-labelledby="h"><SectionIntro><Heading id="h" level={1} size="hero">Every field note in one plain book.</Heading><Lead>Fieldbook keeps notes, tables and sketches side by side.</Lead><SectionActions><Button variant="primary" size="lg">Start a book</Button><Button size="lg">Read the guide</Button></SectionActions></SectionIntro></PageSection><PageSection aria-labelledby="k"><SectionIntro><Heading id="k" level={2} size="display"><span className="basalt-text-line">Three kinds of page.</span><span className="basalt-text-line">One book.</span></Heading></SectionIntro><Columns layout="${layout}"><div style={{ height: 40 }}>One</div><div style={{ height: 40 }}>Two</div><div style={{ height: 40 }}>Three</div><ColumnsItem span={12}>Own</ColumnsItem></Columns></PageSection><PageSection><Text as="div" size="6xl" id="t6">Plain</Text><Text as="div" size="7xl" id="t7">Plain</Text></PageSection></PageSections><PageRow as="footer">Footer</PageRow></>`;
const TL_SKILL = (layout = "3") => `<main class="page-sections"><section class="page-section" aria-labelledby="h"><div class="section-intro"><h1 class="text-hero" id="h">Every field note in one plain book.</h1><p class="text-lead">Fieldbook keeps notes, tables and sketches side by side.</p><div class="section-actions"><button class="btn" data-variant="primary" data-size="lg">Start a book</button><button class="btn" data-size="lg">Read the guide</button></div></div></section><section class="page-section" aria-labelledby="k"><div class="section-intro"><h2 class="text-display" id="k"><span class="text-line">Three kinds of page.</span><span class="text-line">One book.</span></h2></div><div class="columns" data-layout="${layout}"><div style="height: 40px">One</div><div style="height: 40px">Two</div><div style="height: 40px">Three</div><div style="--span: 12">Own</div></div></section><section class="page-section"><div class="text-6xl" id="t6">Plain</div><div class="text-7xl" id="t7">Plain</div></section></main><footer class="page-row">Footer</footer>`;
const TL_PAIRS = [
  ["sections", ".basalt-page-sections", ".page-sections", ["display", "paddingBottom", "boxWidth", "boxHeight"]],
  ["first section", ".basalt-page-section", ".page-section", ["paddingTop", "paddingLeft", "paddingRight", "maxWidth", "boxWidth", "marginLeft", "rectLeft", "rectTop"]],
  ["second section", ".basalt-page-section:nth-child(2)", ".page-section:nth-child(2)", ["paddingTop", "boxHeight", "rectTop"]],
  ["head", ".basalt-section-intro", ".section-intro", ["marginBottom", "boxHeight"]],
  ["hero", "#h", "#h", TL_TYPE],
  ["lead", ".basalt-lead", ".text-lead", [...TL_TYPE, "marginTop"]],
  ["actions", ".basalt-section-actions", ".section-actions", ["display", "flexWrap", "gap", "marginTop", "boxHeight"]],
  ["display", "#k", "#k", TL_TYPE],
  ["a line of a display", "#k .basalt-text-line", "#k .text-line", ["display", "boxHeight"]],
  ["columns", ".basalt-columns", ".columns", ["display", "gridTemplateColumns", "columnGap", "rowGap", "alignItems", "boxHeight"]],
  ["column one", ".basalt-columns > :nth-child(1)", ".columns > :nth-child(1)", ["boxWidth", "rectLeft", "rectTop", "minWidth"]],
  ["column three", ".basalt-columns > :nth-child(3)", ".columns > :nth-child(3)", ["boxWidth", "rectLeft", "rectTop"]],
  ["column with its own span", ".basalt-columns > :nth-child(4)", ".columns > :nth-child(4)", ["boxWidth", "rectLeft", "rectTop"]],
  ["fixed step 6xl (weight 600 through Text as through the class)", "#t6", "#t6", TL_TYPE],
  ["fixed step 7xl (weight 600 through Text as through the class)", "#t7", "#t7", TL_TYPE],
  ["footer row", ".basalt-page-row", ".page-row", ["paddingLeft", "paddingRight", "maxWidth", "boxWidth", "marginLeft", "rectLeft"]],
];
REST.push(
  ...[[1440, "3"], [800, "4"], [390, "7-5"]].map(([width, layout]) => ({
    id: `type and layout at ${width}, layout ${layout}`,
    width,
    react: TL_REACT(layout),
    skill: TL_SKILL(layout),
    touch: width === 390,
    ready: { react: ".basalt-page-sections", skill: ".page-sections" },
    pairs: TL_PAIRS,
  })),
);

const slug = (id) => id.replace(/\W+/g, "-");
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
    // The pointer rests on the element (the shared pill follows it), or presses it; the pages settle before they are read.
    for (const kind of ["hover", "press"]) {
      if (!options[kind]) continue;
      for (const [p, sel] of [[reactPage, options[kind][0]], [skillPage, options[kind][1]]]) {
        await p.locator(sel).first().hover();
        if (kind === "press") await p.mouse.down();
        await settle(p);
      }
    }
    if (options.scroll != null) {
      for (const [p, sel] of [[reactPage, ".basalt-table-container"], [skillPage, ".table-wrap"]]) { await p.evaluate(([frame, x]) => { document.querySelector(frame).scrollLeft = x; }, [sel, options.scroll]); await settle(p); }
    }
    if (options.focusOn) {
      await reactPage.locator(options.focusOn[0]).first().focus();
      await skillPage.locator(options.focusOn[1]).first().focus();
    }
    if (options.focus) {
      await reactPage.locator(scope(reactSel, "react")).first().focus();
      await skillPage.locator(scope(skillSel, "skill")).first().focus();
    }
    // A card's focus is its hidden input's: reach it from the keyboard, so :focus-visible matches.
    if (options.focusIn) {
      for (const [p, sel] of [[reactPage, scope(reactSel, "react")], [skillPage, scope(skillSel, "skill")]]) { await p.evaluate(() => document.activeElement?.blur()); await p.locator(sel).first().locator(options.focusIn).focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab"); }
    }
    // A focus ring and the ink beside it settle over duration-fast: both pages are read at rest, never part-way through it.
    if (options.focus || options.focusOn || options.focusIn) for (const p of [reactPage, skillPage]) await settle(p);
    const react = await read(reactPage, scope(reactSel, "react"), props, { pseudo: options.pseudo });
    const skill = await read(skillPage, scope(skillSel, "skill"), props, { pseudo: "skillPseudo" in options ? options.skillPseudo : options.pseudo });
    assert.ok(react, `${area}: React has no ${reactSel}`);
    assert.ok(skill, `${area}: the skill has no ${skillSel}`);
    if (options.focus || options.focusIn || options.focusOn) {
      await reactPage.evaluate(() => document.activeElement?.blur());
      await skillPage.evaluate(() => document.activeElement?.blur());
    }
    if (options.press) for (const p of [reactPage, skillPage]) await p.mouse.up();
    if (options.scroll != null) for (const [p, sel] of [[reactPage, ".basalt-table-container"], [skillPage, ".table-wrap"]]) await p.evaluate((frame) => { document.querySelector(frame).scrollLeft = 0; }, sel);
    if (options.hover || options.press) for (const p of [reactPage, skillPage]) { await p.mouse.move(0, 0); await settle(p); }
    for (const prop of props) if (react[prop] !== skill[prop]) found.push({ area, pair: label, prop, theme, react: react[prop], skill: skill[prop] });
  }
}

describe("each skill component renders as its React counterpart does, but for the differences listed", () => {
  for (const theme of THEMES) {
    test(`the components (${theme})`, async () => {
      const reactJsx = CASES.map((c) => `<section id="r-${slug(c.id)}" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start", margin: 16 }}>${c.react}</section>`).join("");
      const { page: reactPage, errors } = await fixturePage(reactBrowser, `
        const { Button, Field, Input, Textarea, Badge, Table, TableContainer, TableHeader, TableBody, TableRow, TableHead, TableCell, Tabs, TabsList, Tab, TabsPanel, SegmentedControl, Segment, Kbd, Callout, Spinner, Progress, NumberField, CodeBlock, DescriptionList, DescriptionItem, Meter, Stats, Stat, Terminal, TimeChart, Checkbox, Radio, RadioGroup, Switch, Select, ChoiceCard, ChoiceCardGroup, Card, CardContent } = B;
        flushSync(() => createRoot(document.getElementById("root")).render(<>${reactJsx}</>));`, { theme });
      await reactPage.addStyleTag({ content: APP_BODY });
      await settle(reactPage);
      const body = CASES.map((c) => `<section id="s-${slug(c.id)}" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; margin: 16px">${c.skill}</section>`).join("\n");
      const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>\n${body}`, { fonts: false }).html, { scheme: theme });
      // Loops are read at their first frame (a spinner's opacity at an arbitrary moment is not a difference), the same on both pages.
      for (const p of [reactPage, skillPage]) await p.evaluate(() => document.getAnimations().forEach((animation) => { animation.pause(); animation.currentTime = 0; }));
      for (const c of CASES) await compare(theme, c.id, reactPage, skillPage, c.pairs, { react: `#r-${slug(c.id)}`, skill: `#s-${slug(c.id)}` });
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
      await skillPage.evaluate(() => window.Basalt.openPalette({ groups: [{ label: "Group", items: [{ label: "First", keys: ["⌘", "D"] }, { label: "Second" }, { label: "Danger", danger: true }, { label: "Described", description: "A second line" }] }] }));
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

    for (const nav of NAVIGATION) {
      test(`${nav.id} (${theme})`, async () => {
        const touch = nav.touch ? { isMobile: true, hasTouch: true } : {};
        const { page: reactPage, errors } = await fixturePage(reactBrowser, `const { ${NAV_IMPORTS} } = B;\n${nav.react}`, { theme, viewport: { width: nav.width, height: nav.width === 390 ? 844 : 900 }, ...touch });
        await reactPage.addStyleTag({ content: APP_BODY });
        // The skill's page carries the viewport meta compose writes; a phone lays the React page out at 980 without it.
        if (nav.touch) await reactPage.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.appendChild(meta); });
        await reactPage.waitForSelector("#root > *", { state: "attached" });
        const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>${nav.skill}`, { fonts: false }).html, { scheme: theme, width: nav.width, touch: Boolean(nav.touch) });
        if (nav.open) { await nav.open.react(reactPage); await nav.open.skill(skillPage); }
        await skillPage.waitForSelector(nav.ready.skill, { state: "attached" });
        await reactPage.waitForSelector(nav.ready.react, { state: "attached" });
        for (const p of [reactPage, skillPage]) await settle(p);
        await compare(theme, nav.id, reactPage, skillPage, nav.pairs, null);
        assert.deepEqual([errors, skillErrors], [[], []]);
        await reactPage.close();
        await context.close();
      });
    }

    for (const table of TABLES) {
      test(`${table.id} (${theme})`, async () => {
        const touch = table.touch ? { isMobile: true, hasTouch: true } : {};
        const { page: reactPage, errors } = await fixturePage(reactBrowser, `const { ${TABLE_IMPORTS} } = B;\ndocument.body.style.margin = "0";\nflushSync(() => createRoot(document.getElementById("root")).render(<>${table.react}</>));`, { theme, viewport: { width: table.width, height: table.width === 390 ? 844 : 900 }, ...touch });
        await reactPage.addStyleTag({ content: APP_BODY });
        if (table.touch) await reactPage.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.appendChild(meta); });
        const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>${table.skill}`, { fonts: false }).html, { scheme: theme, width: table.width, touch: Boolean(table.touch) });
        if (table.open) { await table.open.react(reactPage); await table.open.skill(skillPage); }
        await skillPage.waitForSelector(table.ready.skill, { state: "attached" });
        await reactPage.waitForSelector(table.ready.react, { state: "attached" });
        for (const p of [reactPage, skillPage]) await settle(p);
        await compare(theme, table.id, reactPage, skillPage, table.pairs, null);
        assert.deepEqual([errors, skillErrors], [[], []]);
        await reactPage.close();
        await context.close();
      });
    }

    for (const command of COMMANDS) {
      test(`${command.id} (${theme})`, async () => {
        const touch = command.touch ? { isMobile: true, hasTouch: true } : {};
        const { page: reactPage, errors } = await fixturePage(reactBrowser, `${CMD_IMPORTS}\ndocument.body.style.margin = "0";\nflushSync(() => createRoot(document.getElementById("root")).render(<>${command.react}</>));`, { theme, viewport: { width: command.width, height: command.width === 390 ? 844 : 900 }, ...touch });
        await reactPage.addStyleTag({ content: APP_BODY });
        if (command.touch) await reactPage.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.appendChild(meta); });
        const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>${command.skill}`, { fonts: false }).html, { scheme: theme, width: command.width, touch: Boolean(command.touch) });
        await skillPage.waitForSelector(command.ready.skill, { state: "attached" });
        await reactPage.waitForSelector(command.ready.react, { state: "attached" });
        for (const p of [reactPage, skillPage]) await settle(p);
        if (command.open) { await command.open.react(reactPage); await command.open.skill(skillPage); for (const p of [reactPage, skillPage]) await settle(p); }
        await compare(theme, command.id, reactPage, skillPage, command.pairs, null);
        assert.deepEqual([errors, skillErrors], [[], []]);
        await reactPage.close();
        await context.close();
      });
    }

    for (const art of ART) {
      test(`${art.id} (${theme})`, async () => {
        const touch = art.touch ? { isMobile: true, hasTouch: true } : {};
        const { page: reactPage, errors } = await fixturePage(reactBrowser, `${ART_IMPORTS}\ndocument.body.style.margin = "0";\nflushSync(() => createRoot(document.getElementById("root")).render(<>${art.react}</>));`, { theme, viewport: { width: art.width, height: art.width === 390 ? 844 : 900 }, ...touch });
        await reactPage.addStyleTag({ content: APP_BODY });
        if (art.touch) await reactPage.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.appendChild(meta); });
        const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>${art.skill}`, { fonts: false }).html, { scheme: theme, width: art.width, touch: Boolean(art.touch) });
        await skillPage.waitForSelector(art.ready.skill, { state: "attached" });
        await reactPage.waitForSelector(art.ready.react, { state: "attached" });
        for (const p of [reactPage, skillPage]) await settle(p);
        if (art.open) { await art.open.react(reactPage); await art.open.skill(skillPage); for (const p of [reactPage, skillPage]) await settle(p); }
        await compare(theme, art.id, reactPage, skillPage, art.pairs, null);
        // A failed or broken data URI logs a console error; only a script error is a fault here.
        assert.deepEqual([errors.filter((e) => !/Failed to load resource|ERR_/.test(e)), skillErrors.filter((e) => !/Failed to load resource|ERR_/.test(e))], [[], []]);
        await reactPage.close();
        await context.close();
      });
    }

    for (const rest of REST) {
      test(`${rest.id} (${theme})`, async () => {
        const touch = rest.touch ? { isMobile: true, hasTouch: true } : {};
        const { page: reactPage, errors } = await fixturePage(reactBrowser, `${REST_IMPORTS}\ndocument.body.style.margin = "0";\nflushSync(() => createRoot(document.getElementById("root")).render(<>${rest.react}</>));`, { theme, viewport: { width: rest.width, height: rest.width === 390 ? 844 : 900 }, ...touch });
        await reactPage.addStyleTag({ content: APP_BODY });
        if (rest.touch) await reactPage.evaluate(() => { const meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1"; document.head.appendChild(meta); });
        const { page: skillPage, context, errors: skillErrors } = await openHtml(skillBrowser, compose(`<title>Parity</title>${rest.skill}`, { fonts: false }).html, { scheme: theme, width: rest.width, touch: Boolean(rest.touch) });
        await skillPage.waitForSelector(rest.ready.skill, { state: "attached" });
        await reactPage.waitForSelector(rest.ready.react, { state: "attached" });
        for (const p of [reactPage, skillPage]) await settle(p);
        if (rest.open) { await rest.open.react(reactPage); await rest.open.skill(skillPage); for (const p of [reactPage, skillPage]) await settle(p); }
        await compare(theme, rest.id, reactPage, skillPage, rest.pairs, null);
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
