// Round 83: cimip-gaps-3 topic t8, a search field whose value fills the box, built from the council's decision as revised (cimip-gaps-3/t8/decision.md,
// DECISIONS 407). Built by Opus; the implementation has not been reviewed; the browser tests are written and not run (DECISIONS 359).
//
// Every changed part leads with before and after. "Today" is main's SearchField (1b4749df) drawn again here from main's own markup and rules (one
// input that draws its own box, both seats as padding, the glyph and the × absolute), inside @layer basalt as the package's are; the search dialog's
// and the skill's "before" is the same page with data-fades="off", which is the plain cut as it shipped.

import * as React from "react";

import {
  Button,
  CloseGlyph,
  Icon,
  IconButton,
  SearchDialog,
  SearchField,
  SearchGlyph,
  SearchResult,
  SearchResults,
} from "../../packages/react/src/index";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const stack: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--basalt-space-6)", minWidth: 0 };
const NOT_REVIEWED = "Built from the council's t8 decision as revised (DECISIONS 407); the implementation has not been reviewed. The browser tests are written and not run (DECISIONS 359).";

// Main's SearchField rules (components.css at 1b4749df), under their own class names so this build's rules never reach them. Review scaffolding: the dashed
// line round a touch target shows where a press lands, and is never part of either field.
const TODAY_CSS = `@layer basalt {
  .r83-box { position: relative; display: flex; align-items: center; min-width: 0; margin: 0; }
  .r83-glyph { position: absolute; inset-inline-start: var(--basalt-space-2-5); color: var(--basalt-text-tertiary); pointer-events: none; }
  .basalt-input.r83-input { flex: 1; min-width: 0; padding-inline: calc(var(--basalt-space-2-5) + var(--basalt-size-icon-sm) + var(--basalt-space-2)) calc(var(--basalt-space-1) + var(--basalt-size-control-xs) + var(--basalt-space-1)); -webkit-appearance: none; appearance: none; }
  .r83-input::placeholder { color: var(--basalt-text-tertiary); opacity: 1; }
  .r83-input::-webkit-search-cancel-button, .r83-input::-webkit-search-decoration, .r83-input::-webkit-search-results-button { -webkit-appearance: none; appearance: none; display: none; }
  .r83-clear { position: absolute; inset-inline-end: var(--basalt-space-1); }
  .r83-pair { display: grid; gap: var(--basalt-space-6); grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 720px) { .r83-pair { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  .r83-w { width: 200px; }
  .r83-hits .basalt-search-box-clear::before, .r83-hits .r83-clear::after { outline: 1px dashed var(--basalt-text-tertiary); outline-offset: -1px; }
  .r83-hits .r83-clear::after { content: ""; position: absolute; inset: 0; }
}`;

/** The page's own switch: a state that starts with "before" is the plain cut as shipped (every mask off at the root). */
function useFades(state: string) {
  React.useLayoutEffect(() => {
    if (state.startsWith("before")) document.documentElement.setAttribute("data-fades", "off");
    else document.documentElement.removeAttribute("data-fades");
    return () => document.documentElement.removeAttribute("data-fades");
  }, [state]);
}

/** Main's SearchField, drawn again from its own markup: one input that draws its box, the glyph and the × absolute over its padding. */
function TodayField({ label: name, value, onValueChange, placeholder, disabled, force, inputProps }: { label: string; value: string; onValueChange: (v: string) => void; placeholder?: string; disabled?: boolean; force?: boolean; inputProps?: Record<string, unknown> }) {
  return (
    <form role="search" className="r83-box" onSubmit={(event) => event.preventDefault()}>
      <Icon icon={SearchGlyph} size={16} className="r83-glyph" />
      <input {...inputProps} type="search" className="basalt-input r83-input" data-size="md" aria-label={name} value={value} placeholder={placeholder} disabled={disabled} autoComplete="off" onChange={(event) => onValueChange(event.target.value)} data-wt-force={force ? "focus" : undefined} />
      {value ? <IconButton icon={CloseGlyph} label="Clear search" size="xs" disabled={disabled} className="r83-clear" onClick={() => onValueChange("")} /> : null}
    </form>
  );
}

/** One field, today's or this build's, at 200px (the console's runs page), holding `initial`. */
function Field({ today, name, initial, placeholder, force, dir, disabled, inputProps, scroll }: { today: boolean; name: string; initial: string; placeholder?: string; force?: boolean; dir?: "rtl"; disabled?: boolean; inputProps?: Record<string, unknown>; scroll?: "end" | "middle" }) {
  const [value, setValue] = React.useState(initial);
  const box = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!scroll) return undefined;
    // The engine's own scroll, as after typing past the end and leaving: set once laid out, and never reset.
    const timer = window.setTimeout(() => {
      const input = box.current?.querySelector("input");
      if (!input) return;
      const max = input.scrollWidth - input.clientWidth;
      const at = scroll === "end" ? max : Math.round(max / 2);
      input.scrollLeft = getComputedStyle(input).direction === "rtl" ? -at : at;
    }, 120);
    return () => window.clearTimeout(timer);
  }, [scroll]);
  const props = { ...inputProps, ...(force && !today ? { "data-wt-force": "focus" } : {}) };
  return (
    <div ref={box} dir={dir} className="r83-w">
      {today
        ? <TodayField label={name} value={value} onValueChange={setValue} placeholder={placeholder} force={force} disabled={disabled} inputProps={inputProps} />
        : <SearchField label={name} value={value} onValueChange={setValue} placeholder={placeholder} disabled={disabled} inputProps={data(props)} />}
    </div>
  );
}

/** Data attributes for the input (a state an app sets, the review's held focus): typed as the input's props. */
const data = (attributes: Record<string, unknown>) => attributes as React.ComponentProps<"input">;

const SEEDS = "Cherokee Purple heirloom tomato, open-pollinated, 25 seeds";
const FERRY = "Harbour Quay to North Island, weekday sailings after six";

function Pair({ children }: { children: (today: boolean) => React.ReactNode }) {
  return (
    <div className="r83-pair">
      <style>{TODAY_CSS}</style>
      <div style={stack}><p style={{ ...label, margin: 0 }}>Today (main)</p>{children(true)}</div>
      <div style={stack}><p style={{ ...label, margin: 0 }}>This build</p>{children(false)}</div>
    </div>
  );
}

// ---- 1. An empty field gives its seat to the placeholder ----

function Empty() {
  return (
    <Pair>
      {(today) => (
        <>
          <div><p style={label}>A seed catalogue: a placeholder near the field's width</p><Field today={today} name="Search the seed catalogue" initial="" placeholder="Search seeds and growers" /></div>
          <div><p style={label}>A ferry timetable: a placeholder wider than either</p><Field today={today} name="Search the timetable" initial="" placeholder="Search sailings, piers and operators" /></div>
          <div><p style={label}>Focused and empty: the caret at 34, the room to the end</p><Field today={today} name="Search the archive" initial="" placeholder="Search the archive" force /></div>
        </>
      )}
    </Pair>
  );
}

// ---- 2. Words wider than the field, at rest and focused ----

function Filled({ state }: { state: string }) {
  useFades(state);
  const focus = state === "focus";
  const scroll = state === "scrolled-end" ? "end" : state === "scrolled-middle" ? "middle" : undefined;
  const dir = state === "rtl" ? "rtl" as const : undefined;
  return (
    <Pair>
      {(today) => (
        <>
          <div><p style={label}>A seed catalogue{focus ? ", focused" : scroll ? `, scrolled to the ${scroll}` : ", at rest"}</p><Field today={today} name="Search the seed catalogue" initial={dir ? "עגבנייה שרוקי סגולה, זרעים פתוחי האבקה, 25 זרעים" : SEEDS} force={focus} scroll={scroll} dir={dir} /></div>
          <div><p style={label}>A ferry timetable{focus ? ", focused" : scroll ? `, scrolled to the ${scroll}` : ", at rest"}</p><Field today={today} name="Search the timetable" initial={dir ? "מעבורת מרציף הנמל לאי הצפוני, הפלגות בימי חול" : FERRY} force={focus} scroll={scroll} dir={dir} /></div>
          <div><p style={label}>Words that fit: no mask</p><Field today={today} name="Search the archive" initial="Basil" /></div>
        </>
      )}
    </Pair>
  );
}

// ---- 3. A field sized by its content, beside a button ----

/** The host's width and the button's start, measured once the row has laid out, so a still row reads the same on every line. */
function Readout({ row }: { row: React.RefObject<HTMLDivElement | null> }) {
  const [text, setText] = React.useState("measuring");
  React.useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const form = el.querySelector("form")?.getBoundingClientRect();
    const button = el.querySelector("button:not([aria-label='Clear search'])")?.getBoundingClientRect();
    const start = el.getBoundingClientRect().left;
    if (form && button) setText(`field ${Math.round(form.width)}px wide · button at ${Math.round(button.left - start)}px`);
  });
  return <p style={{ ...label, margin: "var(--basalt-space-1) 0 0", fontVariantNumeric: "tabular-nums" }}>{text}</p>;
}

function SizedRow({ today, value, name }: { today: boolean; value: string; name: string }) {
  const [q, setQ] = React.useState(value);
  const row = React.useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <div ref={row} style={{ display: "flex", gap: "var(--basalt-space-2)", alignItems: "center" }}>
        {today ? <TodayField label={name} value={q} onValueChange={setQ} placeholder="Search" /> : <SearchField label={name} value={q} onValueChange={setQ} placeholder="Search" />}
        <Button>Find</Button>
      </div>
      <Readout row={row} />
    </div>
  );
}

function Sized() {
  return (
    <Pair>
      {(today) => (
        <>
          <div><p style={label}>Sailings: empty</p><SizedRow today={today} value="" name="Search sailings" /></div>
          <div><p style={label}>Sailings: after the first key</p><SizedRow today={today} value="N" name="Search sailings" /></div>
          <div><p style={label}>Seeds: with a word</p><SizedRow today={today} value="Kale" name="Search seeds" /></div>
        </>
      )}
    </Pair>
  );
}

// ---- 4. Clear on touch ----

function TouchClear() {
  return (
    <div className="r83-hits">
      <Pair>
        {(today) => (
          <>
            <div><p style={label}>{today ? "On touch the × grows to 44 and runs 16px into the words" : "Drawn at 24, a 44 × 44 target (dashed, review only) inside the field"}</p><Field today={today} name="Search the seed catalogue" initial={SEEDS} /></div>
            <div><p style={label}>A short query</p><Field today={today} name="Search the timetable" initial="Pier 4" /></div>
          </>
        )}
      </Pair>
    </div>
  );
}

// ---- 5. The states, each painted where it paints ----

function States() {
  const [a, setA] = React.useState("Pier 4");
  const [b, setB] = React.useState(SEEDS);
  return (
    <div style={stack}>
      <div>
        <p style={label}>Disabled, before and after: main's raw disabled input drew as enabled; it is sunken, its words and glyph in disabled ink</p>
        <Pair>{(today) => <Field today={today} name="Search the archive" initial="1998 timetable" disabled />}</Pair>
      </div>
      <div style={{ display: "grid", gap: "var(--basalt-space-4)", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        <div><p style={label}>Invalid (data-invalid): the host's boundary</p><SearchField label="Search sailings" value={a} onValueChange={setA} inputProps={data({ "data-invalid": "" })} /></div>
        <div><p style={label}>Being written (data-writing): the host pulses, dashed</p><SearchField label="Search seeds" value="Cherokee" onValueChange={() => {}} readOnly inputProps={data({ "data-writing": "", "aria-busy": true })} /></div>
        <div><p style={label}>Read only, overflowing: it fades at rest</p><SearchField label="Search the catalogue" value={b} onValueChange={setB} readOnly /></div>
        <div><p style={label}>Focused, overflowing: plain</p><SearchField label="Search the timetable" value={FERRY} onValueChange={() => {}} inputProps={data({ "data-wt-force": "focus" })} /></div>
        <div><p style={label}>sm, md and lg</p><div style={{ display: "grid", gap: "var(--basalt-space-2)" }}><SearchField label="Small" controlSize="sm" value="Kale" onValueChange={() => {}} /><SearchField label="Medium" value="Kale" onValueChange={() => {}} /><SearchField label="Large" controlSize="lg" value="Kale" onValueChange={() => {}} /></div></div>
      </div>
    </div>
  );
}

// ---- 6. The search dialog's field ----

function Dialog83({ state }: { state: string }) {
  useFades(state);
  const empty = state === "placeholder";
  const [query, setQuery] = React.useState(empty ? "" : "Ferry from Harbour Quay to North Island, weekday sailings after six");
  const [open, setOpen] = React.useState(true);
  React.useEffect(() => {
    // At rest: focus moves to Close once the dialog has opened, so the query shows as it does when the reader has moved on.
    const timer = window.setTimeout(() => document.querySelector<HTMLElement>(".basalt-search-close")?.focus(), 300);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <SearchDialog open={open} onOpenChange={setOpen} title="Search the timetable" label="Search sailings and piers" placeholder="Sailings, piers, islands and the operators that run them" query={query} onQueryChange={setQuery} count={empty ? "Type a pier or an island" : "2 sailings"}>
      <SearchResults rows={2} logoRows={0} all={false}>
        {empty ? null : <><SearchResult href="#a" detail="Mon to Fri · 18:10">Harbour Quay to North Island</SearchResult><SearchResult href="#b" detail="Mon to Fri · 19:40">Harbour Quay to North Island, late</SearchResult></>}
      </SearchResults>
    </SearchDialog>
  );
}

// ---- 7. The HTML skill ----

function useTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, read, () => "dark");
}

function SkillFrame({ state }: { state: string }) {
  const theme = useTheme();
  const source = React.useMemo(() => (__SKILL_PAGES__[state.startsWith("before") ? "83-before" : "83-after"] ?? "").replace("__THEME__", theme), [state, theme]);
  return (
    // sink: a page compose.mjs built at review-build time from this round's synthetic body (round83-skill.mjs); the frame runs the page's own script
    // oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script
    <iframe title="The HTML skill's search" srcDoc={source} style={{ width: "100%", height: 600, border: 0, display: "block" }} />
  );
}

export const ROUND_83: Round = {
  id: "83",
  title: "cimip-gaps-3 t8: a search field whose value fills the box",
  reviewed: false,
  summary:
    "The council's t8 decision, built in React and the HTML skill: an empty SearchField gives the clear seat to its placeholder (156 of a 200px box, from 134) and a placeholder too wide ends in an ellipsis; words wider than the field fade at each side that hides more while it is not focused and are plain while it is; the words start 34px in, in every state, and the field's width never depends on the ×; on touch the × keeps its 24 with a 44 × 44 hit area and never scales; each state is painted where it paints, and a disabled field looks disabled. The search dialog's field and the skill's take the same fade and ellipsis. Each changed part leads with before and after.",
  steps: [
    {
      id: "empty",
      name: "Before and after: an empty field",
      intro: "With no words the × isn't there and its seat is given back: the end is 10px, as the start, so a 200px field has 156px for its placeholder (134 today, on desktop and on touch). A placeholder wider than that ends in an ellipsis, never a sliced letter. The words still start 34px in.",
      decisions: ["Nothing jumps on the first key: the seat comes back with the ×, at the end, and the words' start never moves.", NOT_REVIEWED],
      tryIt: ["Type one letter in a field on the right: the × appears, the words stay where they started."],
      states: ["forced-colours"],
      widths: [1440, 390],
      touch: true,
      height: 460,
      demo: () => <Empty />,
    },
    {
      id: "filled",
      name: "Before and after: words wider than the field, at rest and focused",
      intro: "At rest the words fade at each side that hides more (20px, never more than a quarter of the words' room, by T7's mask), so the last letter is never sliced against the ×. While the field has focus there's no mask: a plain cut, as a field being typed in keeps. The engine's own scroll is read on both sides and never reset.",
      decisions: [
        "The console's overlay (an ::after in the raised colour) is rejected: it paints a colour, fades a fixed end and fades words that fit.",
        "The rim, fill, ring, glyph and × are never under the mask: the form draws them, the input is a bare port.",
        "Off, a plain cut: more contrast, forced colours, reduced transparency, print and data-fades=\"off\". Reduced motion and the hold keep it.",
        NOT_REVIEWED,
      ],
      tryIt: ["Click into a long field on the right: the fade goes at once and nothing moves. Press End and click away: now the start fades."],
      states: ["focus", "scrolled-middle", "scrolled-end", "rtl", "forced-colours", "more-contrast"],
      widths: [1440, 390],
      touch: true,
      height: 420,
      // The named states are shot at the viewport's height (not the full page): at 390 the two columns stack.
      heights: { "scrolled-middle@390": 1360, "scrolled-end@390": 1360, "rtl@390": 1360 },
      demo: ({ state }) => <Filled state={state} />,
    },
    {
      id: "sized",
      name: "Before and after: a field sized by its content, beside a button",
      intro: "The field's width never depends on the ×: while it isn't there, a spacer of the seat less 10px counts in the field's own width and is shrunk to nothing once it is laid out. So a field with no width set, beside a button in a toolbar, neither grows on the first key nor shrinks on clearing; empty, its words have 22px more room (34 on touch).",
      decisions: ["Each row's readout is measured live: the field's width and the button's start are the same empty and with words.", NOT_REVIEWED],
      tryIt: ["Type into the empty row and clear it: the button never moves."],
      widths: [1440, 390],
      touch: true,
      height: 420,
      demo: () => <Sized />,
    },
    {
      id: "touch-clear",
      name: "Before and after: Clear on touch",
      intro: "On touch and under 720 the × stays drawn at 24 (radius 6), 10px inside the end, with a 44 × 44 hit area flush with the field's top, bottom and end, ending where the words' room ends. Today it grows to 44 and runs 16px into the words. In forced colours the hit area takes back the button's border, so it is still 44 × 44.",
      decisions: ["It's a part of a field, so it keeps the colour step and never scales on press, as the NumberField steppers and the Combobox trigger do.", "The dashed line is review scaffolding, drawn round each target so the shot shows where a press lands.", NOT_REVIEWED],
      tryIt: ["On a phone, press just inside the dashed edge: it clears."],
      states: ["forced-colours"],
      widths: [390, 1440],
      touch: true,
      height: 340,
      demo: () => <TouchClear />,
    },
    {
      id: "states",
      name: "The states, each painted where it paints",
      intro: "Invalid is the host's boundary; disabled is the host's sunken fill with the words and the glyph in disabled ink (today a disabled SearchField drew as enabled); being written is the host's pulse and dashed edge with the words in secondary ink; the ring is the host's, at +2. The input keeps basalt-input for its ink and its font (13px compact, 16px on touch).",
      decisions: ["aria-invalid alone gets no new look: main paints only data-invalid.", "More contrast: the boundary and the glyph step to secondary ink; the mask is off.", NOT_REVIEWED],
      tryIt: ["Tab to the invalid field: the ring goes round the whole box, at +2."],
      states: ["forced-colours", "more-contrast"],
      widths: [1440, 390],
      touch: true,
      height: 560,
      demo: () => <States />,
    },
    {
      id: "dialog",
      name: "Before and after: the search dialog's field",
      intro: "The site search dialog's query takes the same rule: it fades at each side that hides more while focus is elsewhere (here on Close), and is plain while the field has focus. With no query, a placeholder wider than the field ends in an ellipsis.",
      decisions: ["\"before\" is the same dialog with the mask off, the plain cut as it shipped.", NOT_REVIEWED],
      tryIt: ["Click into the query: the fade goes."],
      states: ["before", "placeholder"],
      widths: [1440, 390],
      touch: true,
      height: 640,
      heights: { "default@390": 700, "before@390": 700, "placeholder@390": 700 },
      demo: ({ state }) => <Dialog83 state={state} />,
    },
    {
      id: "skill",
      name: "Before and after: the HTML skill's search",
      intro: "The skill's search dialog fades its query at rest and is plain while focused (search.js watches the input only while it holds words); a bare search input in a form keeps its words' plain cut (one box that draws its own boundary) and its placeholder ends in an ellipsis, as the dialog's does.",
      decisions: ["\"before\" is the same page with the mask off; the ellipsis is new in both.", "The search module's cap is 6,442 (from 5,844) and the forms module's 10,349 (from 10,300), measured.", NOT_REVIEWED],
      tryIt: ["Focus the query in the frame: the fade goes."],
      states: ["before"],
      widths: [1440, 390],
      touch: true,
      height: 640,
      demo: ({ state }) => <SkillFrame state={state} />,
    },
  ],
};
