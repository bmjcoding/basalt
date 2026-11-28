// Round 86: palettes (cimip-gaps-3 T9, DECISIONS 403 and 422; decided by Fable in a heavy round under the handoffs of DECISIONS 385 and 403). The default
// beside itself (the proof: no pixel moved), then Beryl (shipped) and Ochre (a test fixture, an app's warm palette that sets every hook) in two unlike
// domains, a tide station's console and a bakery's order form, with synthetic data. Every palette here is a scope (PaletteScope), so the walkthrough page
// itself stays Basalt. Built by Opus; the implementation has not been reviewed; the tests are written and not run (DECISIONS 359).

import * as React from "react";
import { SealCheckIcon } from "@phosphor-icons/react/dist/csr/SealCheck";

import {
  Button, Callout, Checkbox, ChoiceCard, ChoiceCardGroup, CloseGlyph, Field, IconButton, IconProvider, Input, Link, LinkTab, LinkTabs, Menu, MenuContent,
  MenuTrigger, NumberField, OptionChips, Pagination, PaletteChoiceControl, PaletteMenuGroup, PaletteProvider, PaletteScope, Radio, RadioGroup, SearchField,
  Segment, SegmentedControl, Select, Switch, Tab, Tabs, TabsList, TabsPanel, TextButton, defineGlyph, definePalettes,
} from "../../packages/react/src/index";
import beryl from "../../packages/tokens/dist/js/beryl.js";
import { paletteCss } from "../../packages/tokens/dist/js/palettes.js";
import ochre from "../../packages/tokens/test/palettes/ochre.mjs";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const label: React.CSSProperties = { margin: "0 0 var(--basalt-space-2)", fontSize: "var(--basalt-text-xs-size)", lineHeight: "var(--basalt-text-xs-line-height)", color: "var(--basalt-text-secondary)" };
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--basalt-space-3)", alignItems: "center" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "var(--basalt-space-6)" };
const NOT_REVIEWED = "Decided by Fable's heavy round (DECISIONS 403, revised after the final positions and DECISIONS 422); the implementation has not been reviewed. The tests are written and not run (DECISIONS 359).";

// The two palettes' CSS, proved by the same verifier an app calls (paletteCss throws on a failing pair). Built once, when the round first draws.
let css: string | undefined;
const PaletteCss = () => <style>{(css ??= paletteCss([beryl, ochre]))}</style>;

/** A force for the shot: hover or focus held on the control (Chromium's forced pseudo-classes, review build). */
const force = (state: string) => (state === "held-hover" ? { "data-wt-force": "hover" } : state === "held-focus" ? { "data-wt-force": "focus" } : {});

// ---- One domain: a tide station's console ----

function Station({ state }: { state: string }) {
  const f = force(state);
  const [query, setQuery] = React.useState("harbour mouth");
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-5)", minWidth: 0 }}>
      <Tabs defaultValue="tides">
        <TabsList>
          <Tab value="tides">Tides</Tab>
          <Tab value="swell">Swell</Tab>
          <Tab value="wind">Wind</Tab>
        </TabsList>
      </Tabs>
      <div style={row}>
        <SegmentedControl defaultValue="24h" aria-label="Range">
          <Segment value="6h">6h</Segment>
          <Segment value="24h">24h</Segment>
          <Segment value="7d">7 days</Segment>
        </SegmentedControl>
        <Button variant="primary" {...f}>Log a reading</Button>
        <Button variant="secondary" {...f}>Export</Button>
        <Button variant="ghost" {...f}>Archive</Button>
        <Button variant="outline">Compare</Button>
      </div>
      <SearchField label="Search the stations" value={query} onValueChange={setQuery} inputProps={state === "held-focus" ? ({ "data-wt-force": "focus" } as React.ComponentProps<"input">) : undefined} />
      <div style={row}>
        <Switch defaultChecked>Alerts at high water</Switch>
        <Checkbox defaultChecked>Spring tides only</Checkbox>
      </div>
      <p style={{ margin: 0 }}>High water at the harbour mouth is 06:42; read the <Link href="#tables">tide tables</Link> or <TextButton>recalibrate the gauge</TextButton>.</p>
      <Pagination page={2} pageCount={6} onPageChange={() => {}} />
    </div>
  );
}

// ---- The other: a bakery's order form ----

function Bakery({ state }: { state: string }) {
  const f = force(state);
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-5)", minWidth: 0 }}>
      <LinkTabs aria-label="Orders">
        <LinkTab href="#today" current>Today</LinkTab>
        <LinkTab href="#week">This week</LinkTab>
      </LinkTabs>
      <Field label="Customer"><Input defaultValue="Marisol at the corner café" {...f} /></Field>
      <div style={row}>
        <Field label="Loaves"><NumberField defaultValue={12} /></Field>
        <Field label="Bake"><Select options={[{ value: "rye", label: "Rye" }, { value: "spelt", label: "Spelt" }]} defaultValue="rye" /></Field>
      </div>
      <OptionChips legend="Slicing" options={[{ value: "whole", label: "Whole" }, { value: "sliced", label: "Sliced" }, { value: "thick", label: "Thick", unavailable: "The slicer is out" }]} defaultValue="sliced" />
      <RadioGroup defaultValue="pickup" aria-label="Handover">
        <Radio value="pickup">Pick up</Radio>
        <Radio value="deliver">Deliver</Radio>
      </RadioGroup>
      <ChoiceCardGroup>
        <ChoiceCard name="box" value="paper" title="Paper bag" description="No charge" defaultChecked />
        <ChoiceCard name="box" value="crate" title="Wooden crate" description="Returned next visit" />
      </ChoiceCardGroup>
      <div style={row}>
        <Button variant="primary" note="Ready at 7:30" {...f}>Place the order</Button>
        <Button variant="primary" count={3}>Basket</Button>
        <Button variant="primary" count={0}>Saved</Button>
        <Button variant="primary" disabled>Closed today</Button>
      </div>
      <Callout status="warning" title="The oven is at capacity">Orders after noon bake tomorrow.</Callout>
    </div>
  );
}

function InPalette({ palette, state, children }: { palette: string; state: string; children: React.ReactNode }) {
  if (palette === "none") return <div style={{ minWidth: 0 }}><p style={label}>No palette attribute (Basalt)</p>{children}</div>;
  return (
    <PaletteScope palette={palette} style={{ minWidth: 0 }}>
      <p style={label}>{palette === "basalt" ? "Basalt (no palette)" : palette === "beryl" ? "Beryl (shipped)" : "Ochre (a test fixture: an app's palette that sets every hook)"}{state === "default" ? "" : `, ${state}`}</p>
      {children}
    </PaletteScope>
  );
}

function Palettes({ palette, state }: { palette: string; state: string }) {
  return (
    <div style={grid}>
      <PaletteCss />
      <InPalette palette={palette} state={state}><Station state={state} /></InPalette>
      <InPalette palette={palette} state={state}><Bakery state={state} /></InPalette>
    </div>
  );
}

// ---- The primary Button's note and count, in each palette ----

function NoteAndCount() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-6)" }}>
      <PaletteCss />
      {["basalt", "beryl", "ochre"].map((id) => (
        <InPalette key={id} palette={id} state="default">
          <div style={row}>
            <Button variant="primary" note="Ships in two days">Standard delivery</Button>
            <Button variant="primary" count={4}>Basket</Button>
            <Button variant="primary" count={0}>Saved</Button>
            <Button variant="primary" amount="$18.50">Pay</Button>
          </div>
        </InPalette>
      ))}
    </div>
  );
}

// ---- The controls ----

const CONFIG = definePalettes({ palettes: [{ id: "basalt", label: "Basalt" }, { id: "beryl", label: "Beryl" }, { id: "ochre", label: "Ochre" }], default: "basalt" });
const MANY = definePalettes({ palettes: ["basalt", "beryl", "ochre", "harbour", "slate"].map((id) => ({ id, label: id[0]!.toUpperCase() + id.slice(1) })), default: "basalt" });

function Controls({ state }: { state: string }) {
  // "from-link" is a palette a link opened for this tab: the line under each control says so, and choosing one saves it.
  if (state === "from-link" && typeof sessionStorage !== "undefined") sessionStorage.setItem("basalt-palette-url", "beryl");
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-6)" }}>
      <PaletteCss />
      <PaletteProvider config={CONFIG}>
        <div><p style={label}>PaletteChoiceControl: two to four palettes are words in the segmented control's drawing</p><PaletteChoiceControl /></div>
      </PaletteProvider>
      <PaletteProvider config={MANY}>
        <div><p style={label}>Five or more: a Select labelled "Palette", by count and never by viewport</p><PaletteChoiceControl /></div>
      </PaletteProvider>
      <PaletteProvider config={CONFIG}>
        <div>
          <p style={label}>PaletteMenuGroup inside an app's own menu (it stays open on a choice)</p>
          <Menu defaultOpen={state === "menu" || state === "from-link"}>
            <MenuTrigger render={<Button variant="secondary">Appearance</Button>} />
            <MenuContent><PaletteMenuGroup /></MenuContent>
          </Menu>
        </div>
      </PaletteProvider>
    </div>
  );
}

// ---- Scopes ----

function Scopes() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-4)" }}>
      <PaletteCss />
      <PaletteScope palette="ochre" theme="dark" style={{ padding: "var(--basalt-space-5)", background: "var(--basalt-surface-page)", color: "var(--basalt-text-primary)", display: "grid", gap: "var(--basalt-space-4)" }}>
        <p style={label}>A dark Ochre page</p>
        <div style={row}><Button variant="primary">Place the order</Button><Checkbox defaultChecked>Sliced</Checkbox></div>
        <PaletteScope palette="beryl" theme="light" style={{ padding: "var(--basalt-space-4)", background: "var(--basalt-surface-raised)", color: "var(--basalt-text-primary)", borderRadius: "var(--basalt-radius-lg)", display: "grid", gap: "var(--basalt-space-3)" }}>
          <p style={label}>A light Beryl card inside it: whole, with its own theme; a menu opened here keeps both</p>
          <div style={row}>
            <Button variant="primary">Log a reading</Button>
            <Checkbox defaultChecked>Spring tides only</Checkbox>
            <Menu><MenuTrigger render={<Button variant="secondary">More</Button>} /><MenuContent><PaletteMenuGroup /></MenuContent></Menu>
          </div>
        </PaletteScope>
        <PaletteScope palette="basalt" style={{ padding: "var(--basalt-space-4)", background: "var(--basalt-surface-raised)", borderRadius: "var(--basalt-radius-lg)" }}>
          <p style={label}>An explicit Basalt card inside Ochre: Basalt's pixels</p>
          <div style={row}><Button variant="primary">Place the order</Button><Checkbox defaultChecked>Sliced</Checkbox></div>
        </PaletteScope>
      </PaletteScope>
    </div>
  );
}

// ---- Icons ----

// A defined glyph in the core set's own drawing (eight cubic slots on 24, 2.25 stroke): a close drawn shorter, for a softer brand.
const SoftClose = defineGlyph({ name: "close", selected: [[8, 8, 16, 16], [16, 8, 8, 16]] });
const ICONS = { close: SoftClose, "status-success": SealCheckIcon };

function Icons() {
  return (
    <div style={{ display: "grid", gap: "var(--basalt-space-5)" }}>
      <div><p style={label}>Basalt's own drawings</p><div style={row}><IconButton icon={CloseGlyph} label="Close" variant="secondary" /><Callout status="success" title="Saved">The order is in.</Callout></div></div>
      <IconProvider icons={ICONS}>
        <div><p style={label}>An icon set: close replaced by a defined glyph, the success mark by a component; seats, sizes and ink unchanged</p><div style={row}><IconButton icon={CloseGlyph} label="Close" variant="secondary" /><Callout status="success" title="Saved">The order is in.</Callout></div></div>
      </IconProvider>
    </div>
  );
}

// ---- The HTML skill ----

function Skill({ palette }: { palette: string }) {
  const theme = React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => watch.disconnect(); }, () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"), () => "dark");
  const source = React.useMemo(() => (__SKILL_PAGES__["86"] ?? "").replace("__THEME__", theme).replace("__PALETTE__", palette), [theme, palette]);
  return (
    <div>
      <p style={label}>The HTML skill, composed with --palettes basalt,beryl,ochre: {palette}</p>
      {/* sink: a page compose.mjs built at review-build time from this round's synthetic body (round86-skill.mjs); the frame runs the page's own script */}
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script */}
      <iframe title="The HTML skill under a palette" srcDoc={source} style={{ width: "100%", height: 520, border: 0, display: "block" }} />
    </div>
  );
}

const MEDIA_STATES = ["held-hover", "held-focus", "more-contrast", "forced-colours"];

export const ROUND_86: Round = {
  id: "86",
  title: "Palettes: a brand's colours for links, the chosen mark, checked controls, the primary button and a field's edge",
  reviewed: false,
  summary:
    "The council's T9 decision (DECISIONS 403, revised after the final positions; DECISIONS 422 for neutrals), built in React, the HTML skill and SwiftUI. A palette is a named set of values for a closed list of hooks (30 colours, 4 corners and the press), chosen beside the theme with data-palette. Each reader keeps today's declaration as its fallback, so with no palette nothing moves: the proof compared main with this branch, 0 differing pixels in every shot. paletteCss is the only emitter and it verifies every pair (4.5:1 text, 3:1 boundaries) on every surface Basalt draws. Beryl ships; Ochre is a test fixture. No neutral hooks yet: T10 adds them.",
  steps: [
    {
      id: "default",
      name: "The default, unchanged (the proof)",
      intro: "Basalt with no palette, and with data-palette=\"basalt\": the same pixels as main. The proof shot one fixture of every changed reader (Button in every variant, size, state, with a note, a count and an amount; both pagination forms; tabs, link tabs, segments, the theme choice; every checked control; every field, SearchField included; compact density; links and TextButtons) from main and from this branch.",
      decisions: [
        "Proof: 48 shots (no attribute and basalt; dark and light; 1440 and 390 at 2x; at rest, hovered, pressed, focused, under more contrast and in forced colours): 48 identical, 0 differing pixels. The whole demo page (8 shots): 8 identical. The skill's three examples (24 shots): 24 identical.",
        "Every paint Basalt does not draw today (a primary's edge, a checked edge, a field's hover and active edge, the current page's own hover and press, a primary's note and count in its ink) exists only under a palette and never in forced colours.",
        NOT_REVIEWED,
      ],
      tryIt: ["Hover and focus the controls: Basalt's own states."],
      states: ["basalt-attribute"],
      widths: [1440, 390],
      height: 1180,
      heights: { "default@390": 2000, "basalt-attribute@390": 2000 },
      demo: ({ state }) => <Palettes palette={state === "basalt-attribute" ? "basalt" : "none"} state="default" />,
    },
    {
      id: "beryl",
      name: "Beryl, in a tide station and a bakery",
      intro: "Basalt's shipped palette: a blue-green link and underline, the chosen line and ink, checked controls, the primary Button and a field's hover and active edge, on Basalt's neutral surfaces, with corners 4 and 6 and the .98 press. It sets no chosen fill, no outline ink and no secondary or ghost hook.",
      decisions: [
        "Worst pairs, light / dark: link and chosen ink 6.91 / 7.61; underline 4.44 / 3.69; the primary ink at 0.72 on its fills 5.89 / 5.08. The status distance (Basalt's own: a failure, not an advisory) holds: the underline 0.1603 from success in light (floor 0.1470), the fill and line 0.1801 in dark (floor 0.1747).",
        "A primary Button's note and count take the button's ink (the quiet parts at 0.72), so they read on the fill.",
        "Focus stays Basalt's neutral ring; status colours and danger never change.",
        NOT_REVIEWED,
      ],
      tryIt: ["Hover a field: its edge steps; focus it: the active edge.", "Press the primary button: .98."],
      states: MEDIA_STATES,
      widths: [1440, 390],
      height: 1180,
      heights: Object.fromEntries(["default", ...MEDIA_STATES].map((s) => [`${s}@390`, 2000])),
      demo: ({ state }) => <Palettes palette="beryl" state={state} />,
    },
    {
      id: "ochre",
      name: "Ochre (a fixture), in the same two domains",
      intro: "A warm palette that sets every hook: a chosen fill, secondary, outline and ghost inks and edges, a disabled pair, capsule Buttons, fields at 8 and 12, and no press scale. It proves the hooks an app can reach; it is never exported.",
      decisions: [
        "Its warm lines sit near warning: the status distance fires as an advisory (an app's palette) and it still passes every contrast pair. Worst: the field's resting edge 3.10:1 on the selected wash over the strong well, light.",
        "The decision lists no outline hover edge for Ochre; the fixture uses its secondary hover edge's pair (#865b1c / #deb45b).",
        "Under more contrast the chosen edge, the secondary edges and the field edges are Basalt's (they stand in for a line that steps).",
        NOT_REVIEWED,
      ],
      tryIt: ["Compare the current page in the pagination at rest, hovered and pressed: it keeps its fill."],
      states: MEDIA_STATES,
      widths: [1440, 390],
      height: 1180,
      heights: Object.fromEntries(["default", ...MEDIA_STATES].map((s) => [`${s}@390`, 2000])),
      demo: ({ state }) => <Palettes palette="ochre" state={state} />,
    },
    {
      id: "note",
      name: "A primary Button with a note and a count, in each palette",
      intro: "What a primary Button holds beside its label is drawn in the button's ink under a palette: a positive count's number and its pill's edge in the ink, the note and a zero count at 0.72. Basalt's own (top) is unchanged.",
      decisions: ["On main Basalt's own primary paints a count at 1.00:1 in light and a note at 2.12:1: a fault logged for the lead, not fixed here, because this round may not move a default pixel.", NOT_REVIEWED],
      tryIt: [],
      widths: [1440, 390],
      height: 420,
      heights: { "default@390": 700 },
      demo: () => <NoteAndCount />,
    },
    {
      id: "controls",
      name: "The palette choice and the menu group",
      intro: "PaletteChoiceControl is the theme choice's contract word for word (one tab stop, arrows, Home and End, 600 with its width reserved, the sliding pill, right in the first frame from data-palette). PaletteMenuGroup goes inside an app's own Menu. While a link opened the palette, a line says so and choosing one saves it.",
      decisions: ["No colour dots: the word and the live change say it.", "Five or more palettes are a Select named \"Palette\", by count, never by viewport.", "Choosing here changes this whole review page: the provider writes the root.", NOT_REVIEWED],
      tryIt: ["Choose Beryl: the page follows; choose Basalt to go back.", "Use the arrows in the segmented choice."],
      states: ["menu", "from-link"],
      widths: [1440, 390],
      height: 620,
      heights: { "default@390": 700, "menu@390": 700, "from-link@390": 700 },
      demo: ({ state }) => <Controls state={state} />,
    },
    {
      id: "scopes",
      name: "Scopes: a light Beryl card on a dark Ochre page, and Basalt inside a palette",
      intro: "PaletteScope writes data-palette (and data-theme) on its element. A scope is whole (every palette block declares every hook), so nothing leaks in from outside it, and a popup opened inside keeps its palette and theme.",
      decisions: ["An explicit basalt scope inside a palette paints Basalt's pixels in every state, with no transition Basalt does not run.", NOT_REVIEWED],
      tryIt: ["Open More in the Beryl card: the menu is light Beryl."],
      states: ["forced-colours"],
      widths: [1440, 390],
      height: 560,
      heights: { "default@390": 760, "forced-colours@390": 760 },
      demo: () => <Scopes />,
    },
    {
      id: "icons",
      name: "Icon sets",
      intro: "IconProvider replaces core glyphs by name and system marks by slot (the select caret, the sort caret, the eight status marks, the attachment, the two theme marks and email). The nearest provider is the whole set; with no entry the part's own glyph is drawn, never a blank seat.",
      decisions: ["A defined glyph is drawn by Basalt's renderer and morphs only between its own rest and selected; a change in one of the core set's drawn pairs swaps.", "The key glyphs and service marks are never replaced.", NOT_REVIEWED],
      tryIt: [],
      widths: [1440, 390],
      height: 360,
      heights: { "default@390": 520 },
      demo: () => <Icons />,
    },
    {
      id: "skill",
      name: "The HTML skill: compose --palettes",
      intro: "compose.mjs --palettes basalt,beryl,./ochre.mjs proves each palette and writes its CSS, the metas and the head line (React's paletteBootstrap, character for character). The skill's readers take the same hooks; the paints only a palette draws come in a sheet only a palette page carries.",
      decisions: ["A failing palette fails composition with its pairs.", "A popup the skill builds outside its opener (the tooltip, the diagram viewer) keeps the opener's palette.", NOT_REVIEWED],
      tryIt: [],
      states: ["ochre"],
      widths: [1440, 390],
      height: 620,
      heights: { "default@390": 700, "ochre@390": 700 },
      demo: ({ state }) => <Skill palette={state === "ochre" ? "ochre" : "beryl"} />,
    },
  ],
};
