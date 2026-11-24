// Round 47: the second audit's decided design items (DECISIONS 167). The council voted the audit's design questions; this round shows each item that changes a pixel, before and
// after, in both themes at 1440 and 390, with forced colours for the skeleton and more contrast for the three field edges. The design panel has not reviewed this implementation.
//
// "Before" is not a screenshot from another build: the left column redraws the same Basalt parts with the rules they had on main put back by a style on its wrapper (an unlayered
// rule beats a layered one), as round 46 does. The skill's step draws two pages composed by compose.mjs, the second with the old rules put back (round47-skill.mjs). Every word is
// synthetic. Four questions went to the owner as deadlocks and are not here (Q1.4, Q1.5, Q1.7, Q2).

import * as React from "react";

import {
  Badge,
  Callout,
  CommandMenu,
  EventLine,
  EventLog,
  Icon,
  Listbox,
  ListboxOption,
  OptionChips,
  PeriodStepper,
  SearchResult,
  SearchResults,
  SearchTrigger,
  ShareBar,
  Skeleton,
  StatusBar,
  SwitchRow,
  SwitchRowGroup,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Checkbox,
  Tabs,
  TabsList,
  LinkTab,
  LinkTabs,
  Text,
  Prose,
  TimeChart,
  Button,
} from "../../packages/react/src/index";
import { ChevronRightGlyph } from "../../packages/react/src/glyphs/chevron-right";
import { lb, weightData } from "../../packages/react/test/fixtures/figure-data";
import type { Round } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;
type ReadyWindow = Window & { __BASALT_READY__?: Promise<void> };

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16 };
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12, lineHeight: "16px", whiteSpace: "pre-wrap" };
const frames = (n: number) => new Promise<void>((done) => { const step = (left: number) => (left <= 0 ? done() : requestAnimationFrame(() => step(left - 1))); step(n); });

/** Two columns of the same parts: the left with main's rules put back (`css`, written for `[data-look="before"]`), the right as this branch draws them. */
function Pair({ css, children, readout }: { css: string; children: (which: "before" | "after") => React.ReactNode; readout?: (root: HTMLElement) => string[] }) {
  return (
    <div data-round47="" style={col}>
      <style>{css}</style>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        {(["before", "after"] as const).map((which) => (
          <div key={which} data-look={which} style={{ ...col, flex: "1 1 320px", minWidth: 0, gap: 12 }}>
            <Text size="md" weight="medium">{which === "before" ? "Before (main)" : "After (this branch)"}</Text>
            {children(which)}
          </div>
        ))}
      </div>
      {readout ? <Readout read={readout} /> : null}
    </div>
  );
}

/** Runs `read` once the page has laid out and prints the lines it returns; the shot waits for them (round 41's Readout). */
function Readout({ read }: { read: (root: HTMLElement) => string[] }) {
  const ref = React.useRef<HTMLPreElement>(null);
  const [lines, setLines] = React.useState<string[]>([]);
  const ready = React.useRef<{ promise: Promise<void>; done: () => void } | null>(null);
  if (!ready.current) {
    let done = () => {};
    const promise = new Promise<void>((resolve) => { done = resolve; });
    ready.current = { promise, done };
  }
  React.useLayoutEffect(() => {
    const own = ready.current!;
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([own.promise, new Promise<void>((resolve) => window.setTimeout(resolve, 8000))]);
    return () => own.done();
  }, []);
  React.useEffect(() => {
    let live = true;
    const t = window.setTimeout(async () => {
      const root = ref.current?.closest("[data-round47]") as HTMLElement | null;
      let next: string[];
      try { next = root ? read(root) : ["(no page to measure)"]; } catch (error) { next = [`(the measurement failed: ${error instanceof Error ? error.message : String(error)})`]; }
      if (!live) return;
      setLines(next);
      await frames(3);
      if (live) ready.current?.done();
    }, 1200);
    return () => { live = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <pre ref={ref} style={mono}>{`Measured on this page\n${lines.join("\n")}`}</pre>;
}

const ELLIPSIS = "overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

// ---- 1. Wrapping (Q1.1, Q1.3, Q1.6) -----------------------------------------------------------------------------------------------------------------------------------
const WRAP_CSS = `
[data-look="before"] :is(.basalt-switch-row-name, .basalt-switch-row-kind, .basalt-search-title, .basalt-search-detail, .basalt-event-detail) { ${ELLIPSIS} }`;
const MEDIA = <span style={{ display: "block", width: "100%", height: "100%", background: "var(--basalt-surface-sunken-strong)" }} />;

function WrapDemo() {
  return (
    <Pair css={WRAP_CSS}>
      {(which) => (
        <>
          <SwitchRowGroup aria-label={`Sources ${which}`} defaultValue={["a"]}>
            <SwitchRow value="a" kind="A kind that is long enough to need a second and a third line at every width this page is drawn at, so the cut shows in the left column">A source with a name long enough that it has to wrap onto a second line at every width this page is drawn at, so the cut shows</SwitchRow>
            <SwitchRow value="b" kind="Kind B">Short name</SwitchRow>
          </SwitchRowGroup>
          <SearchResults>
            <SearchResult href="#long" media={MEDIA} detail="A detail long enough to need a second line in this column, however wide the column is drawn on this page" trailing="$39.99">A product title that is long enough to take a second line in this column, however wide the column is drawn on this page</SearchResult>
            <SearchResult href="#short" media={MEDIA} detail="2 lb" trailing="$39.99">Short title</SearchResult>
          </SearchResults>
          <EventLog label={`Activity ${which}`}>
            <EventLine href="#one" verb="opened" object="the pricing page" detail="A detail that is long enough that it has to go on a second and a third line in this column" time="09:39:11" />
            <EventLine href="#two" verb="read" object="the notes" detail="Short" time="09:38:00" />
          </EventLog>
        </>
      )}
    </Pair>
  );
}

// ---- 2. The skeleton in forced colours (Q4) ---------------------------------------------------------------------------------------------------------------------------
function SkeletonDemo() {
  return (
    <Pair css={`[data-look="before"] .basalt-skeleton { border: 0 !important; }`}>
      {() => (
        <div style={{ ...col, width: 280, gap: 8 }}>
          <Skeleton style={{ height: 16, width: 200 }} />
          <Skeleton style={{ height: 16, width: 240 }} />
          <Skeleton data-shape="block" style={{ height: 64, width: 280 }} />
        </div>
      )}
    </Pair>
  );
}

// ---- 3. Bold inside Basalt's parts (Q5) -------------------------------------------------------------------------------------------------------------------------------
function BoldDemo() {
  return (
    <Pair css={`[data-look="before"] :is(b, strong) { font-weight: 700; }`}>
      {() => (
        <>
          <Callout status="info" title="Note"><span>A callout with a <strong>strong phrase</strong> and a <b>bold one</b>.</span></Callout>
          <Text>A paragraph with a <strong>strong phrase</strong>, a <b>bold one</b> and a <span style={{ fontWeight: 600 }}>600 span</span> beside them.</Text>
          <Prose><p>A prose paragraph with a <b>bold phrase</b>.</p></Prose>
        </>
      )}
    </Pair>
  );
}

// ---- 4. The command menu's place (Q7c) --------------------------------------------------------------------------------------------------------------------------------
const GROUPS = [{ label: "Go", commands: Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, label: `Command ${i + 1}`, onSelect: () => {} })) }];
function PaletteDemo({ which }: { which: "before" | "after" }) {
  return (
    <div data-round47="">
      {which === "before" ? <style>{`.basalt-dialog.basalt-command { top: 20vh !important; max-height: none !important; }`}</style> : null}
      <Text size="sm" tone="secondary">{which === "before" ? "Before (main): the panel starts at 20% of the window." : "After (this branch): at 12% of the window, never under 16px, 480px tall at most."}</Text>
      <CommandMenu open onOpenChange={() => {}} groups={GROUPS} />
    </div>
  );
}

// ---- 5. Smaller pixels (Q9a to Q9e) -----------------------------------------------------------------------------------------------------------------------------------
const GLYPH_ROW = (which: string) => (
  <div role="listbox" aria-label={`Mock ${which}`} className="basalt-listbox" style={{ width: 280 }}>
    <div className="basalt-listbox-scroll">
      <div className="basalt-listbox-option" role="option" aria-selected="true"><span className="basalt-listbox-gutter" aria-hidden="true"><Icon icon={ChevronRightGlyph} size={16} /></span><span className="basalt-listbox-name">Chosen (a chevron)</span></div>
      <div className="basalt-listbox-option" role="option" aria-selected="false"><span className="basalt-listbox-gutter" aria-hidden="true" /><span className="basalt-listbox-name">Not chosen</span></div>
    </div>
  </div>
);

const SMALL_CSS = `
[data-look="before"] .basalt-period-stepper { border-top-color: var(--basalt-border-hairline) !important; }
[data-look="before"] .basalt-status-bar .basalt-button[aria-expanded="true"] { background: var(--basalt-surface-raised); color: var(--basalt-text-primary); }
[data-look="before"] :is(.basalt-tab, .basalt-link-tab) { border-radius: var(--basalt-radius-sm) var(--basalt-radius-sm) 0 0 !important; }
[data-look="before"] .basalt-table :is(td, th) .basalt-checkbox { display: inline-flex; vertical-align: baseline; }`;

function SmallDemo() {
  return (
    <Pair
      css={SMALL_CSS}
      readout={(root) => {
        const offset = (which: string) => {
          const box = root.querySelector(`[data-look="${which}"] .basalt-table tbody .basalt-checkbox`) as HTMLElement | null;
          const row = box?.closest("tr");
          if (!box || !row) return "no checkbox";
          const b = box.getBoundingClientRect();
          const r = row.getBoundingClientRect();
          return `${(b.top + b.height / 2 - (r.top + r.height / 2)).toFixed(1)}px`;
        };
        return [`the table checkbox's centre against its row's centre: before ${offset("before")}, after ${offset("after")}`, "(the two listboxes below are drawn from the listbox's own classes: before with a chevron mark, after with the core check)"];
      }}
    >
      {(which) => (
        <>
          <div style={{ width: 358, containerType: "inline-size" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", minHeight: 56 }}>
              <PeriodStepper label="28 Sept to 4 Oct" previousLabel="The week before" nextLabel="The week after" />
            </div>
          </div>
          <StatusBar start={<a href="#run">run 4f2a, 3 allowed</a>} sources={<Button variant="ghost" size="sm" aria-expanded aria-controls="drawer">1 of 2 sources</Button>} end={<span>theme</span>} />
          <Tabs defaultValue="a"><TabsList aria-label={`Views ${which}`}><Tab value="a" data-wt-force="focus">One</Tab><Tab value="b">Two</Tab></TabsList></Tabs>
          <LinkTabs aria-label={`Pages ${which}`}><LinkTab href="#a" current>One</LinkTab><LinkTab href="#b">Two</LinkTab></LinkTabs>
          {which === "before" ? GLYPH_ROW(which) : (
            <Listbox label={`Items ${which}`} defaultValue="a" style={{ width: 280 }}>
              <ListboxOption value="a">Chosen (the core check)</ListboxOption>
              <ListboxOption value="b">Not chosen</ListboxOption>
            </Listbox>
          )}
          <TableContainer label={`Runs ${which}`}>
            <Table columns={[{ width: 60 }, { width: 120 }, {}]} minWidth={300}>
              <TableHeader><TableRow><TableHead>Pick</TableHead><TableHead>Run</TableHead><TableHead>Name</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell><Checkbox aria-label={`Select run-1 ${which}`} /></TableCell><TableRowHead>run-1</TableRowHead><TableCell>Alpha</TableCell></TableRow>
                <TableRow><TableCell><Checkbox aria-label={`Select run-2 ${which}`} defaultChecked /></TableCell><TableRowHead>run-2</TableRowHead><TableCell>Beta</TableCell></TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Pair>
  );
}

// ---- 6. Under more contrast (Q9f) -------------------------------------------------------------------------------------------------------------------------------------
function ContrastDemo() {
  return (
    <Pair css={`[data-look="before"] :is(.basalt-option-chip:not([data-checked]), .basalt-switch-row, .basalt-search-trigger) { border-color: var(--basalt-border-input); }`}>
      {(which) => (
        <>
          <OptionChips legend={`Flavour ${which}`} options={[{ value: "v", label: "Vanilla" }, { value: "c", label: "Chocolate" }, { value: "b", label: "Berry" }]} defaultValue="v" />
          <SwitchRowGroup aria-label={`Sources ${which}`} defaultValue={["a"]}>
            <SwitchRow value="a" kind="Kind A">Source one</SwitchRow>
            <SwitchRow value="b" kind="Kind B">Source two</SwitchRow>
          </SwitchRowGroup>
          <SearchTrigger />
        </>
      )}
    </Pair>
  );
}

// ---- 7. The light warning mark (Q9g) ----------------------------------------------------------------------------------------------------------------------------------
function WarningDemo() {
  return (
    <Pair css={`[data-look="before"] { --basalt-status-warning: oklch(0.62 0.142 62); }`} readout={(root) => {
      const read = (which: string) => { const probe = document.createElement("i"); probe.style.color = "var(--basalt-status-warning)"; root.querySelector(`[data-look="${which}"]`)!.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; };
      return [`status-warning on this theme: before ${read("before")}, after ${read("after")}`, "(light only: dark is unchanged; the two light pairs measure 2.98:1 and 2.85:1 before, 3.22:1 and 3.08:1 after)"];
    }}>
      {() => (
        <>
          <Callout status="warning" title="Heads up"><span>A warning callout: its icon and rim take the status colour.</span></Callout>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--basalt-surface-sunken)" }}>
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "var(--basalt-state-selected)" }}><Badge status="warning">Building</Badge> a selected row on a sunken area</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--basalt-surface-sunken-strong)" }}>
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "var(--basalt-state-selected)" }}><Badge status="warning">Queued</Badge> and on the stronger sunken one</div>
          </div>
        </>
      )}
    </Pair>
  );
}

// ---- 8. The headline chart's key and the share bar's >99% (Q11) -------------------------------------------------------------------------------------------------------
function ChartDemo() {
  const w = React.useMemo(() => weightData(28), []);
  return (
    <Pair css={`[data-look="before"] [data-gap-key] { display: none; }`}>
      {(which) => (
        <>
          <TimeChart
            title={`Weight, 7-day trend ${which}`} kind="line" headline trend days={w.days} series={[{ id: "w", name: "Weight", values: w.values, reasons: w.reasons }]}
            unit="lb" format={lb} summary="Weight trended down over twenty-eight days." now={Date.UTC(2026, 10, 10, 12)}
          />
          <ShareBar aria-label={`Plan ${which}`} parts={[{ name: "Protein", value: 996 }, { name: "Carbs", value: 4 }]} format={which === "before" ? (share) => (share === 0 ? "<1%" : `${share}%`) : undefined} />
        </>
      )}
    </Pair>
  );
}

// ---- 9. The HTML skill (Q6, Q7a, Q9d) ---------------------------------------------------------------------------------------------------------------------------------
function SkillFrame({ page, label }: { page: string; label: string }) {
  const [theme, setTheme] = React.useState<string | null>(null);
  React.useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    read();
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  const source = React.useMemo(() => (theme ? (__SKILL_PAGES__[page] ?? "").replace("__THEME__", theme) : ""), [page, theme]);
  return (
    <div style={{ ...col, flex: "1 1 320px", minWidth: 0, gap: 12 }}>
      <Text size="md" weight="medium">{label}</Text>
      {/* sink: a page compose.mjs built at review-build time from this round's synthetic body; the frame runs the page's own script, which posts only when its still is ready */}
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script */}
      <iframe title={label} srcDoc={source} style={{ width: "100%", height: 560, border: "1px solid var(--basalt-border-input)", borderRadius: 8, background: "transparent" }} />
    </div>
  );
}

function SkillDemo() {
  React.useEffect(() => {
    let resolve: () => void = () => {};
    const ready = new Promise<void>((r) => { resolve = r; });
    let left = 2;
    const listen = (event: MessageEvent) => { if ((event.data as { basaltSkill?: string } | null)?.basaltSkill === "ready" && --left <= 0) resolve(); };
    window.addEventListener("message", listen);
    (window as ReadyWindow).__BASALT_READY__ = Promise.race([ready, new Promise<void>((r) => setTimeout(r, 8000))]);
    return () => window.removeEventListener("message", listen);
  }, []);
  return (
    <div data-round47="" style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
      <SkillFrame page="47-before" label="Before (main)" />
      <SkillFrame page="47-after" label="After (this branch)" />
    </div>
  );
}

const COMMON = { widths: [1440, 390], scales: [2], height: 1100 };

export const ROUND_47: Round = {
  id: "47",
  title: "The second audit's decided design items (DECISIONS 167)",
  reviewed: false,
  summary:
    "The council voted the second audit's design questions (DECISIONS 167). This round shows what changes a pixel, before and after, in both themes: a switch row, a search result and an event line wrap; a skeleton draws an edge in forced colours; b and strong are 600; the command menu sits at 12% of the window; the period stepper's narrow line, the status bar's sources button, the listbox's chosen mark, a tab's radius and the table checkbox's centre; the three field edges under more contrast; the light warning colour; the headline chart's key and the share bar's >99%; and the HTML skill's check, minus, close, disclosure chevron and tabs. The design panel has not reviewed this implementation.",
  steps: [
    {
      id: "wrap", name: "A switch row, a search result and an event line wrap", intro: "Q1.1, Q1.3 and Q1.6: the text is whole and the row grows with it. The price and the seat stay at the end.", ...COMMON,
      decisions: ["DECISIONS 167: the switch row (opus, sol, grok), the search result (4 to 0) and the event line (opus, sol, grok) wrap; the row's height is a minimum, not a fixed height. The link tabs' Select keeps its cut at rest (4 to 0, Q1.2: no change)."],
      tryIt: ["Compare the long row in each column: nothing ends in an ellipsis on the right, and the short row under it is the height it was."],
      demo: () => <WrapDemo />,
    },
    {
      id: "skeleton", name: "A skeleton in forced colours", intro: "Q4: in forced colours each skeleton box is a 1px ButtonBorder edge and no fill; the left column has no mark at all.", states: ["forced-colours"], ...COMMON,
      decisions: ["DECISIONS 167: option (b), 3 of 4 (muse, sol, grok): a 1px ButtonBorder edge, no fill. Outside forced colours the skeleton is as it was."],
      tryIt: ["Look at the forced-colours shot: the left column's boxes are not there."],
      demo: () => <SkeletonDemo />,
    },
    {
      id: "bold", name: "b and strong inside Basalt's parts are 600", intro: "Q5: a strong phrase in a callout, a paragraph and prose is 600, as the skill draws it, not the browser's 700.", ...COMMON,
      decisions: ["DECISIONS 167: option (b), 4 to 0."],
      tryIt: ["Compare the strong phrase with the 600 span beside it: they match after, and the strong phrase is heavier before."],
      demo: () => <BoldDemo />,
    },
    {
      id: "palette-before", name: "The command menu's place: before", intro: "Q7c, before: the panel starts at 20% of the window.", ...COMMON, height: 900,
      decisions: ["DECISIONS 167: React takes the skill's top and cap (c; muse, sol, grok)."], tryIt: ["Compare with the next step."],
      demo: () => <PaletteDemo which="before" />,
    },
    {
      id: "palette-after", name: "The command menu's place: after", intro: "Q7c, after: at 12% of the window, never under 16px, no taller than 480px.", ...COMMON, height: 900,
      decisions: ["DECISIONS 167: React takes the skill's top and cap (c; muse, sol, grok)."], tryIt: ["Compare with the step before."],
      demo: () => <PaletteDemo which="after" />,
    },
    {
      id: "small", name: "Smaller pixels: the stepper's line, the sources button, the listbox mark, a tab's corners and the table checkbox", intro: "Q9a, Q9b, Q9c, Q9d and Q9e. The status bar's sources button is shown open; the first tab holds focus so its ring follows the corners.", ...COMMON,
      decisions: ["DECISIONS 167: the stepper's narrow line is border-divider (4 to 0); the sources button has no open look (opus, sol, grok); the listbox's chosen option takes the core check and the open list keeps its chevron (muse, sol, grok); a tab is radius 8 from 36px (4 to 0); the table checkbox is centred (4 to 0)."],
      tryIt: ["The stepper's line is fainter in dark; the open sources button is the same as a closed one; the listbox draws a check; the focused tab's corners are rounder; the checkbox sits on its row's centre (the readout says by how much)."],
      demo: () => <SmallDemo />,
    },
    {
      id: "contrast", name: "Under more contrast: the chip's edge, the switch row's edge and the search trigger", intro: "Q9f: the three edges take border-field, the strongest line, under more contrast. Outside the mode nothing moves.", states: ["more-contrast"], ...COMMON,
      decisions: ["DECISIONS 167: option (b), muse, sol, opus."], tryIt: ["Look at the more-contrast shot: the right column's three edges are as strong as an input's."],
      demo: () => <ContrastDemo />,
    },
    {
      id: "warning", name: "The light warning colour", intro: "Q9g: light status-warning is oklch(0.60 0.137 62). The step is small and is meant to look small.", ...COMMON,
      decisions: ["DECISIONS 167: light warning to L 0.60 (4 to 0, by value). The chroma is 0.137, not the 0.142 the council named: that is outside sRGB at L 0.60, and the tokens test requires every colour inside it. Swift is regenerated."],
      tryIt: ["Compare the warning callout and the two selected rows in light; dark is unchanged."],
      demo: () => <WarningDemo />,
    },
    {
      id: "charts", name: "The headline chart's Not observed key and the share bar's >99%", intro: "Q11a and Q11b.", ...COMMON,
      decisions: ["DECISIONS 167: the key shows whenever the chart has a gap, as the series charts' legend does (4 to 0); a part that rounds to 100 beside a part that is not empty reads >99%, spoken \"more than 99 percent\" (4 to 0)."],
      tryIt: ["The key sits between the context line and the plot; the share bar reads >99% beside <1%."],
      demo: () => <ChartDemo />,
    },
    {
      id: "skill", name: "The HTML skill: the core check, minus and close, the disclosure chevron, the tabs", intro: "Q6, Q7a and Q9d in the skill's own pages: the ticked, mixed and empty boxes, the search clear mark, a closed and an open disclosure, and the tabs.", ...COMMON, height: 700,
      decisions: ["DECISIONS 167: the skill draws the core set's check, minus and close (4 to 0); its disclosure chevron is the core chevron at 16, turned 180 degrees when open (4 to 0); a tab is radius 8 from 36px (4 to 0)."],
      tryIt: ["Compare the two pages: the check and the dash are the core set's strokes, the chevron is the accordion's, the tabs' corners are rounder."],
      demo: () => <SkillDemo />,
    },
  ],
};
