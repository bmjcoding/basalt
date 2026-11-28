// Round 87: micro-details m1, pointer feedback and control geometry, built from the council's decision as revised (micro-details/m1/decision.md,
// DECISIONS 405 and 409). Built by Opus; the implementation has not been reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Before and after for every press that changes a shipped part's pixels. "Pressed" is the real :active: the review build holds it on each part marked
// `data-wt-force="active"` with Chromium's forced pseudo-classes, so one page shows every press at once. "Before" is the same part, unpressed: on main
// none of these parts had a press of its own, so a finger saw its rest look (a mouse also saw its hover). For the parts whose rest changes (a wrapped
// choice, the small Nav, the skill's plain chevron), "before" puts main's values back with a wrapper (`.r87-before`, unlayered review scaffolding, so it
// beats @layer basalt). Synthetic content in two unlike domains: a seed library and a ferry timetable.

import * as React from "react";

import {
  Accordion,
  Button,
  AccordionItem,
  Checkbox,
  ChoiceCard,
  ChoiceCardGroup,
  DisclosureRow,
  Field,
  FileInput,
  HomeGlyph,
  Link,
  LinkTab,
  LinkTabs,
  Listbox,
  ListboxOption,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Nav,
  NavItem,
  Pagination,
  PanelList,
  Radio,
  RadioGroup,
  SearchTrigger,
  Segment,
  SegmentedControl,
  Select,
  Switch,
  Tab,
  Tabs,
  TabsList,
  TextButton,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const NOT_REVIEWED = "Built from the council's m1 decision as revised (DECISIONS 405, 409); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";
const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-4)", minWidth: 0 };
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--basalt-space-4)" };

// Main's values for what this round changes at rest, inside `.r87-before`. Unlayered, so it wins over @layer basalt; review scaffolding only.
const BEFORE_CSS = `
.r87-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); }
@media (min-width: 720px) { .r87-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
.r87-before .basalt-choice { display: inline-flex; align-items: center; gap: var(--basalt-space-2); }
.r87-before .basalt-choice > :is(.basalt-checkbox, .basalt-radio, .basalt-switch) { margin-block: 0; }
.r87-before .basalt-nav[data-size="sm"] .basalt-nav-pill { padding-inline: var(--basalt-space-2) var(--basalt-space-3); }
.r87-before .basalt-nav[data-size="sm"] .basalt-nav-item[data-glyphless] .basalt-nav-pill { padding-inline: var(--basalt-space-3); }
.r87-tall .basalt-choice { line-height: 32px; }
.r87-spaced, .r87-spaced * { line-height: 1.5 !important; }
.r87-col { width: 300px; max-width: 100%; }
.r87-line { box-shadow: inset 0 calc(-1 * var(--basalt-size-hairline)) 0 var(--basalt-border-hairline); }
.r87-readout { font: var(--basalt-font-weight-regular) var(--basalt-text-xs-size) / var(--basalt-text-xs-line-height) var(--basalt-font-family-mono); color: var(--basalt-text-secondary); white-space: pre-wrap; margin: 0; }
`;

function Css() {
  return <style>{BEFORE_CSS}</style>;
}

function Pair({ before, after, names = ["Before (main: no press of its own)", "After, pressed (this build)"] }: { before: React.ReactNode; after: React.ReactNode; names?: [string, string] }) {
  return (
    <div className="r87-pair">
      <Css />
      <div className="r87-before" style={stack}><p style={label}>{names[0]}</p>{before}</div>
      <div style={stack}><p style={label}>{names[1]}</p>{after}</div>
    </div>
  );
}

/** Marks what `target` matches inside it `data-wt-force="active"`, so the review build holds a real press on it. */
function Press({ target, hovered, children }: { target: string; hovered?: string; children: React.ReactNode }) {
  const box = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    for (const el of box.current?.querySelectorAll(target) ?? []) el.setAttribute("data-wt-force", "active");
    // A mouse press is hovered too: `hovered` holds both, so the shot shows which paint wins.
    if (hovered) for (const el of box.current?.querySelectorAll(hovered) ?? []) el.setAttribute("data-wt-force", "hover active");
  });
  return <div ref={box} style={{ display: "contents" }}>{children}</div>;
}

// ---- 1. The choices ----

function ChoiceSet({ pressed }: { pressed: boolean }) {
  const set = (
    <div style={stack}>
      <div style={row}>
        <Checkbox>Heirloom only</Checkbox>
        <Checkbox defaultChecked>Organic seed</Checkbox>
        <Switch>Sowing reminders</Switch>
        <Switch defaultChecked>Ferry alerts</Switch>
      </div>
      <RadioGroup aria-label="Sailing" defaultValue="0740">
        <Radio value="0740">07:40 from the north pier</Radio>
        <Radio value="0915">09:15 from the south pier</Radio>
      </RadioGroup>
      <ChoiceCardGroup aria-label="Ticket">
        <ChoiceCard name={pressed ? "t-after" : "t-before"} value="day" title="Day return" description="Leaves 07:40, back by 19:10" />
        <ChoiceCard name={pressed ? "t-after" : "t-before"} value="week" title="Week pass" description="Any sailing, seven days" defaultChecked />
      </ChoiceCardGroup>
      <ChoiceCardGroup multiple aria-label="Packets">
        <ChoiceCard multiple title="Runner bean" description="25 seeds, sow in May" defaultChecked />
      </ChoiceCardGroup>
    </div>
  );
  return pressed ? <Press target=".basalt-checkbox, .basalt-switch, .basalt-radio, .basalt-choice-card">{set}</Press> : set;
}

// ---- 2. The controls ----

function ControlSet({ pressed }: { pressed: boolean }) {
  const set = (
    <div style={{ ...stack, maxWidth: 520 }}>
      <Tabs defaultValue="packets"><TabsList aria-label="Seed views"><Tab value="packets">Packets</Tab><Tab value="bulk">Bulk</Tab></TabsList></Tabs>
      <LinkTabs aria-label="Timetable pages"><LinkTab href="#summer" current>Summer</LinkTab><LinkTab href="#winter">Winter</LinkTab></LinkTabs>
      <SegmentedControl aria-label="Crossing" defaultValue="am"><Segment value="am">Morning</Segment><Segment value="pm">Evening</Segment></SegmentedControl>
      <div style={row}>
        <TextButton quiet>Show the fares</TextButton>
        <Link href="#guide">Read the sowing guide</Link>
      </div>
      <Pagination aria-label="Timetable pages" page={2} pageCount={5} hrefForPage={(n) => `#page-${n}`} />
      <Field label="Pier"><Select aria-label="Pier" placeholder="Choose a pier" options={[{ value: "north", label: "North pier" }, { value: "south", label: "South pier" }]} /></Field>
      <Field label="Seed packet photo"><FileInput name="photo" /></Field>
      <SearchTrigger />
      <Accordion><AccordionItem value="rules" title="Luggage on the ferry">One bag and a bicycle.</AccordionItem></Accordion>
      <PanelList aria-label="Questions"><li><DisclosureRow title="When do potatoes ship?">In March, chitted.</DisclosureRow></li></PanelList>
      <div style={{ maxWidth: 320 }}>
        <Listbox label="Packets" defaultValue="bean">
          <ListboxOption value="bean">Runner bean</ListboxOption>
          <ListboxOption value="pea" trailing="12 g">Sweet pea</ListboxOption>
        </Listbox>
      </div>
    </div>
  );
  if (!pressed) return set;
  return (
    <Press target=".basalt-tab:not([data-active]), .basalt-link-tab:not([aria-current]), .basalt-segment:not([data-pressed]), .basalt-text-button, .basalt-link:not(.basalt-page-link), .basalt-page-link:not([aria-current]), .basalt-select-trigger, .basalt-file-input-native, .basalt-search-trigger, .basalt-accordion-trigger, .basalt-disclosure-row" hovered=".basalt-listbox-option:not([aria-selected='true'])">
      {set}
    </Press>
  );
}

// ---- 3. A still finger on a menu row ----

function Finger() {
  return (
    <div style={{ minHeight: 320 }}>
      <Menu defaultOpen modal={false}>
        <MenuTrigger render={<Button variant="secondary">Seed packet</Button>} />
        <MenuContent>
          <MenuItem data-wt-finger="" description="Ships in a paper envelope, Fridays">Order a packet</MenuItem>
          <MenuItem description="The 07:40 from the north pier">Book the ferry</MenuItem>
          <MenuItem>Rename</MenuItem>
          <MenuItem danger>Remove from the library</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

// ---- 4. A wrapped choice ----

const LONG = "Send me the spring sowing calendar, the frost dates for my district and a note when the seed potatoes ship";
const FERRY = "Tell me when the 07:40 is held for the tide, and when the winter timetable starts";

function Wrapped({ spacing }: { spacing: "" | "r87-tall" | "r87-spaced" }) {
  const set = (
    <div className={`r87-col ${spacing}`} style={stack}>
      <Checkbox>{LONG}</Checkbox>
      <Switch>{FERRY}</Switch>
      <Checkbox>Organic seed</Checkbox>
      <Switch defaultChecked>Ferry alerts</Switch>
    </div>
  );
  return <Pair before={set} after={set} names={["Before (main: the mark centred on the whole label)", "After (this build: the mark on the first line)"]} />;
}

// ---- 5. The small Nav ----

function SmallNav() {
  // Every item is held pressed on both sides, so its pill (the selected wash) shows the cap the glyph sits in.
  const nav = (
    <Press target=".basalt-nav-item">
    <div style={{ width: 280, maxWidth: "100%" }}>
      <Nav aria-label="Saved" size="sm">
        <NavItem href="#timetable" icon={HomeGlyph}>Ferry timetable</NavItem>
        <NavItem href="#packets" icon={HomeGlyph} current>Seed packets</NavItem>
        <NavItem href="#words">Words only</NavItem>
      </Nav>
    </div>
    </Press>
  );
  return (
    <div style={stack}>
      <Pair before={nav} after={nav} names={["Before (main: 8 before the glyph at every height; each pill held pressed)", "After (this build: the glyph centred on the cap)"]} />
      <div data-density="compact"><Pair before={nav} after={nav} names={["Compact, before", "Compact, after (6 at 28; 14 on touch and under 720)"]} /></div>
    </div>
  );
}

// ---- 6. What changes no pixel ----

const PROBES: [string, string][] = [
  ["Button", ".r87-probe .basalt-button"],
  ["Tab", ".r87-probe .basalt-tab"],
  ["Choice label", ".r87-probe .basalt-choice"],
  ["Choice card description", ".r87-probe .basalt-choice-card-description"],
  ["Listbox option", ".r87-probe .basalt-listbox-option"],
  ["Disabled segment", ".r87-probe .basalt-segment[data-disabled]"],
  ["Link", ".r87-probe .basalt-link"],
  ["Field", ".r87-probe .basalt-input"],
];

function Readout() {
  const [text, setText] = React.useState("measuring");
  React.useEffect(() => {
    const lines = PROBES.map(([name, selector]) => {
      const el = document.querySelector(selector);
      if (!el) return `${name}: not found`;
      const cs = getComputedStyle(el);
      return `${name.padEnd(24)} user-select ${cs.userSelect.padEnd(6)} touch-action ${cs.touchAction.padEnd(12)} cursor ${cs.cursor}`;
    });
    setText(lines.join("\n"));
  }, []);
  return (
    <div style={stack}>
      <div className="r87-probe" style={stack}>
        <div style={row}>
          <button type="button" className="basalt-button" data-variant="secondary">Order seeds</button>
          <Tabs defaultValue="a"><TabsList aria-label="Views"><Tab value="a">Packets</Tab></TabsList></Tabs>
          <Checkbox>Heirloom only</Checkbox>
          <SegmentedControl aria-label="Crossing" defaultValue="am"><Segment value="am">Morning</Segment><Segment value="pm" disabled>Night</Segment></SegmentedControl>
        </div>
        <ChoiceCardGroup aria-label="Ticket"><ChoiceCard name="probe" value="day" title="Day return" description="Leaves 07:40, back by 19:10" /></ChoiceCardGroup>
        <div style={{ maxWidth: 320 }}><Listbox label="Packets"><ListboxOption value="bean">Runner bean</ListboxOption></Listbox></div>
        <Link href="#guide">Read the sowing guide</Link>
        <Field label="Notes"><input className="basalt-input" /></Field>
      </div>
      <pre className="r87-readout">{text}</pre>
    </div>
  );
}

// ---- 7. The skill ----

function useTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, read, () => "dark");
}

function SkillFrame({ which }: { which: "before" | "after" }) {
  const theme = useTheme();
  const source = React.useMemo(() => (__SKILL_PAGES__[`87-${which}`] ?? "").replace("__THEME__", theme), [which, theme]);
  return (
    // sink: a page compose.mjs built at review-build time from this round's synthetic body (round87-skill.mjs); the frame runs the page's own script
    // oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script
    <iframe title={`The HTML skill, ${which}`} srcDoc={source} style={{ width: "100%", height: 1240, border: 0, display: "block" }} />
  );
}

function Skill() {
  return (
    <div style={stack}>
      {/* The review build holds the presses inside the frames; this mark tells it the page has some. */}
      <span data-wt-force="none" hidden />
      <Pair before={<SkillFrame which="before" />} after={<SkillFrame which="after" />} names={["Before (main: the plain chevron in the row's ink, no presses)", "After (this build: the chevron at secondary; the second column of each row pressed)"]} />
    </div>
  );
}

export const ROUND_87: Round = {
  id: "87",
  title: "Micro-details m1: pointer feedback and control geometry",
  reviewed: false,
  summary:
    "The council's m1 decision, built in React and the HTML skill: no text selection on a control (a choice card's description stays selectable); hover paint only where a pointer hovers, with a lint, basalt/hover-gate, that proves the sweep; one cursor convention (the hand on what presses, not-allowed when it can't, the arrow on an option row); touch-action: manipulation on what presses; a transparent tap highlight wherever a press is visible, and a press for every control that had none, including a still finger on a popup's row; a wrapped choice's mark on its first line; and the small Nav's glyph centred on its cap. Each changed part leads with before and after.",
  steps: [
    {
      id: "press-choices",
      name: "Before and after: a pressed choice",
      intro: "An unchecked box, a radio and the switch's track press as a secondary Button does, to the selected wash with its edge at secondary ink; a checked or mixed checkbox and a checked switch press as a primary Button does, to action-primary-press. An unselected choice card's wash steps to the selected one; a selected checkbox card's box steps to the press.",
      decisions: [
        "A checked radio and a selected radio card show no press: the second radio and the week pass look the same on both sides.",
        "The edge can only get stronger: secondary ink as a boundary is 7.4:1 or better on every surface. Colour only, in at once, out over duration-fast, kept under reduced motion; never a scale.",
        "In forced colours a checked choice stays Highlight with its HighlightText mark through the press, an unchecked one Canvas with its ButtonText edge.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press and hold each box with a finger or the mouse: the box steps before you let go; choosing still happens on release."],
      states: ["forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 640,
      heights: { "default@390": 1400, "forced-colours@390": 1400 },
      demo: () => <Pair before={<ChoiceSet pressed={false} />} after={<ChoiceSet pressed />} />,
    },
    {
      id: "press-controls",
      name: "Before and after: a pressed tab, segment, link, page link, field trigger and disclosure",
      intro: "A control with no wash rung presses to its hover step, so a finger sees what a pointer sees: a tab, a link tab and a segment lift to primary ink with no wash; TextButton's quiet words and a link's underline go to the ink; a page link takes primary on the selected wash. The select trigger and the file input press to the selected wash over their raised fill as one colour, with the placeholder and empty line at secondary; the search trigger to the selected wash under 720 and primary ink from 720; the accordion's caret lifts; a disclosure row lifts its ink; a listbox option steps its band. The listbox option is held hovered and pressed at once, as a mouse press is: the press wins.",
      decisions: [
        "No wash on a tab or segment: a filled tab is a look tabs don't have, and a wash in the track reads as a second pill.",
        "No step down on a link or TextButton: stepping down an ink is the busy sign.",
        "The file input presses from its native input only, so pressing Clear presses Clear.",
        NOT_REVIEWED,
      ],
      tryIt: ["Press and hold each control: the change shows while you hold."],
      states: ["forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 1100,
      heights: { "default@390": 1700, "forced-colours@390": 1700 },
      demo: () => <Pair before={<ControlSet pressed={false} />} after={<ControlSet pressed />} />,
    },
    {
      id: "finger",
      name: "A still finger on a menu row",
      intro: "A still finger sets no :active on a popup's row, so the row under it showed nothing until release. The glide now marks the row data-pressing from a touch pointerdown, at once, until release, cancel, a scroll of the list or 8px of travel, and it paints as the lit row: its own plate, primary ink, the description at secondary. The highlight does not move and activation is still the click.",
      decisions: ["The shot holds a real touch on the first row through the protocol, 250ms, never lifted.", "The cost is accepted: the row under a finger lights for a moment at the start of a scroll, until the scroll takes the touch.", NOT_REVIEWED],
      tryIt: ["On a phone, open the menu and rest a finger on Order a packet."],
      states: ["finger"],
      widths: [1440, 390],
      touch: true,
      height: 420,
      demo: () => <Finger />,
    },
    {
      id: "first-line",
      name: "Before and after: a wrapped choice's mark on its first line",
      intro: "A choice's box or switch was centred on its whole label, so on three lines at 390 it sat below the first line. It now sits on the first line, at the label's own line, with the line raised to 32px, and at a reader's 1.5 line spacing (WCAG 1.4.12). A one-line choice is where it was.",
      decisions: ["One grid row, centred in any spare height; the mark at the row's top with a margin of (1lh − its size) / 2, and the mark takes the label's font so 1lh is the label's line.", "SelectableItem and the choice card keep their own first-line margin.", NOT_REVIEWED],
      tryIt: ["Compare the first box on each side: on the right it is beside \"Send me the spring\"."],
      widths: [1440, 390],
      touch: true,
      height: 1200,
      heights: { "default@390": 2200 },
      demo: () => (
        <div style={stack}>
          <p style={label}>The label's own line (20px)</p><Wrapped spacing="" />
          <p style={label}>The label's line raised to 32px</p><Wrapped spacing="r87-tall" />
          <p style={label}>A reader's 1.5 line spacing</p><Wrapped spacing="r87-spaced" />
        </div>
      ),
    },
    {
      id: "small-nav",
      name: "Before and after: the small Nav's glyph centred on its cap",
      intro: "A pill that leads with a glyph centres the glyph's box on its round end: its start is half the height it is drawn at, less half the glyph. The small Nav is 8 at 32 (no change), 6 in compact and 14 on touch and under 720. The end, the gap, the glyphless item and the default Nav keep their padding.",
      decisions: ["The pill hugs its content inside a full-width row, so the glyph and label move together inside the pill and no column moves.", "The default Nav keeps space-3 at every density: its start is the 18px line the footnote, the version and the More sheet stand on.", NOT_REVIEWED],
      tryIt: ["At 390 compare the glyph to the pill's round end on each side."],
      widths: [1440, 390],
      touch: true,
      height: 520,
      heights: { "default@390": 880 },
      demo: () => <SmallNav />,
    },
    {
      id: "no-pixel",
      name: "What changes no pixel: selection, hover, cursors and double tap",
      intro: "Every control computes user-select: none (a choice card's description and body stay selectable), touch-action: manipulation (a second tap presses again instead of zooming) and a transparent tap highlight. Hover paint is under @media (hover: hover), so a finger never leaves a hover behind; the lint basalt/hover-gate fails any :hover outside it. The hand is on what presses, not-allowed on what can't, and an option row keeps the arrow. The readout is the live page's.",
      decisions: ["No -webkit-touch-callout is added: a link's long-press menu is the platform's.", "A link in a sentence is inline, which touch-action does not apply to: it keeps its wrap.", "On a mouse-primary laptop with a touch screen a finger can leave hover paint until the pointer next moves; it carries no state.", NOT_REVIEWED],
      tryIt: ["Double-click a button's label: no text is selected.", "Double-tap a stepper on a phone: it steps twice."],
      widths: [1440, 390],
      touch: true,
      height: 640,
      heights: { "default@390": 1100 },
      demo: () => <Readout />,
    },
    {
      id: "skill",
      name: "Before and after: the HTML skill",
      intro: "The same rules in the skill. The one resting pixel the revisions change: the plain disclosure's chevron rests at secondary ink, as every icon outside a sidebar does, so it has somewhere to lift on a press. The choice inputs, a tab, a segment, the select and the file field press as React's do; a wrapped choice keeps its box on its first line; the small nav centres its glyph.",
      decisions: ["\"Before\" is the same composed page with main's values put back (the chevron in currentColor, the flex choice, the 8px nav start) and no press held.", "In forced colours the plain chevron is CanvasText, pressed or not.", "The skill's budgets are soft: each module raised to its measured size, with the reason in modules.json.", NOT_REVIEWED],
      tryIt: ["Compare the Timetable row's chevron on each side: grey on the right, the row's ink on the left."],
      states: ["forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 1340,
      heights: { "default@390": 2700, "forced-colours@390": 2700 },
      demo: () => <Skill />,
    },
  ],
};
