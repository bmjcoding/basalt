// Round 69: reserved room across every component (DECISIONS 328, 329, 336). A heavy council round: two audits (React and the HTML skill), Astra's
// check, Fable's decision and its answers to Astra's final position, built by Opus; the implementation has not been reviewed. "After" is this branch,
// live. "Before" is main (e396decf) drawn by the same steps: tools/review/round69-pairs.mjs reads the screenshots of this round built on main and
// writes them as pictures under assets/round-69, so each "-before" state shows main's picture of the state it names. The owner's-eye items come first.
// Synthetic content only.

import * as React from "react";

import {
  AppHeader,
  Button,
  Card,
  CardContent,
  Checkbox,
  CodeBlock,
  CommandList,
  Composer,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuTrigger,
  MultiSelect,
  NotificationCenter,
  OptionChips,
  Pagination,
  SearchDialog,
  SearchGlyph,
  SearchResult,
  SearchResults,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SiteHeader,
  SocialLink,
  SocialLinks,
  StatusBar,
  SwitchRow,
  SwitchRowGroup,
  TabBar,
  TabBarItem,
  TabBarMore,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHead,
  Terminal,
  TimeChart,
  Drawer,
  ReleaseNotes,
  useToast,
  HomeGlyph,
  NavItem,
  SettingsGlyph,
  PlusGlyph,
  TrashGlyph,
} from "../../packages/react/src/index";
import type { CommandGroup, ReleaseRecord } from "../../packages/react/src/index";
import harborData from "../changelog/fixtures/harbor/releases.json";
import { lb, weightData } from "../../packages/react/test/fixtures/figure-data";
import { BEFORE } from "./assets/round-69/index";
import { Slate } from "./round68";
import type { Round, Step } from "./rounds";

declare const __SKILL_PAGES__: Record<string, string>;

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 };
const note: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "18px", color: "var(--basalt-text-secondary)" };

function useTheme() {
  const read = () => (typeof document === "undefined" ? "dark" : document.documentElement.getAttribute("data-theme") === "light" ? "light" : document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  return React.useSyncExternalStore((change) => { const watch = new MutationObserver(change); watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] }); return () => watch.disconnect(); }, read, () => "dark");
}

/** After the page has drawn, press what a state opens. */
function usePress(selectors: string[], delay = 150) {
  React.useEffect(() => {
    const timer = window.setTimeout(() => { for (const s of selectors) document.querySelector<HTMLElement>(s)?.click(); }, delay);
    return () => window.clearTimeout(timer);
  }, [selectors.join("|"), delay]);
}

/** Types into a field the way a reader does, so React and cmdk see it. */
function useTyped(selector: string, text: string | null, delay = 400) {
  React.useEffect(() => {
    if (text === null) return undefined;
    const timer = window.setTimeout(() => {
      const field = document.querySelector<HTMLInputElement>(selector);
      if (!field) return;
      field.focus();
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      set?.call(field, text);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [selector, text, delay]);
}

/** The clipboard answers yes (or no), so a copy state shows its glyph whatever the browser allows. */
function useClipboard(ok: boolean) {
  React.useLayoutEffect(() => {
    const clip = { writeText: () => (ok ? Promise.resolve() : Promise.reject(new Error("refused"))) };
    Object.defineProperty(navigator, "clipboard", { value: clip, configurable: true });
  }, [ok]);
}

// ---- Before: main's picture of the same state ----

/** Main's picture of a state, at the width and theme the page is shot at. On main itself there are none, and the part is drawn live. */
function Before({ step, state }: { step: string; state: string }) {
  const theme = useTheme();
  const width = typeof window === "undefined" ? 1440 : window.innerWidth < 720 ? 390 : window.innerWidth < 1000 ? 800 : 1440;
  const key = `${step}-${state}-${width}-${theme}`;
  const picture = BEFORE[key];
  if (!picture) return <p style={note}>No picture of main for {key} (it is drawn from this round built on main: tools/review/round69-pairs.mjs).</p>;
  return (
    <figure style={{ margin: 0, display: "grid", gap: 6 }}>
      <figcaption style={note}>Before: main (e396decf; items 11 and 14 re-shot on db0bc418), the same state.</figcaption>
      <img src={picture.src} width={picture.width} alt={`Main: ${step}, ${state}`} style={{ maxWidth: "100%", height: "auto", border: "1px dashed var(--basalt-border-hairline)" }} />
    </figure>
  );
}
const HAVE_BEFORE = Object.keys(BEFORE).length > 0;
/** Each state is shot as it is now, then (where main's pictures exist) as main had it. */
const withBefore = (states: string[]) => (HAVE_BEFORE ? [...states, ...states.map((s) => `before-${s}`)] : states);
const isBefore = (state: string) => state.startsWith("before-");
const beforeOf = (state: string) => state.replace(/^before-/, "");

// ---- the parts, each in the state the decision is about ----

const GROUPS: CommandGroup[] = [
  { label: "Sandbox", commands: [
    { id: "new", label: "New sandbox", icon: PlusGlyph, description: "Create a fresh environment from a template", onSelect: () => {} },
    { id: "rename", label: "Rename", onSelect: () => {} },
    { id: "export", label: "Export logs", onSelect: () => {} },
    { id: "delete", label: "Delete sandbox", icon: TrashGlyph, danger: true, onSelect: () => {} },
  ] },
  { label: "Go to", commands: [
    { id: "runs", label: "Runs", onSelect: () => {} },
    { id: "settings", label: "Settings", icon: SettingsGlyph, onSelect: () => {} },
  ] },
];

const RESULTS = (n: number) => Array.from({ length: n }, (_, i) => <SearchResult key={i} href={`#r${i}`} detail={`Brand · ${i + 1} lb`} media={<span style={{ display: "block", width: 48, height: 60, background: "var(--basalt-surface-2)" }} />}>Result {i + 1}</SearchResult>);

function SearchPart({ state }: { state: string }) {
  const n = state === "none" ? 0 : state === "two" ? 2 : 9;
  return (
    <SearchDialog open onOpenChange={() => {}} title="Search the shop" label="Search products and brands" query={state === "none" ? "zzz" : "whey"} onQueryChange={() => {}} count={n === 0 ? "Nothing found for “zzz”" : `${n} products`}>
      <SearchResults logoRows={0} rows={5}>{RESULTS(n)}</SearchResults>
    </SearchDialog>
  );
}

const STATUS = [{ value: "ready", label: "Ready" }, { value: "building", label: "Building" }, { value: "error", label: "Error" }, { value: "queued", label: "Queued" }];
const MANY = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"].map((l) => ({ value: l.toLowerCase(), label: l }));
function FilterPart({ state }: { state: string }) {
  usePress(state === "checklist" ? [".basalt-filter-trigger"] : []);
  if (state === "checklist") return <div style={{ minHeight: 520 }}><MultiSelect label="Region" options={MANY} defaultValue={["beta", "eta"]} /></div>;
  return (
    <div style={col}>
      <MultiSelect label="Status" options={STATUS} />
      <MultiSelect label="Status" options={STATUS} defaultValue={["ready", "error"]} />
      <MultiSelect label="Status" options={STATUS} defaultValue={STATUS.map((s) => s.value)} />
    </div>
  );
}

function ChartPart({ state }: { state: string }) {
  const w = React.useMemo(() => weightData(28), []);
  return (
    <div data-wt-chart="" style={{ maxWidth: 720, display: "grid", gap: 32 }}>
      {/* Owner's eye 3: four series and the hatch's key, so a gap day shows that no key moves (the pixel review's polish); hovered first, as the build hovers the first gap. */}
      {state === "legend" ? (
        <TimeChart title="Four readings" kind="line" days={w.days} unit="lb" format={lb} summary="Four readings over twenty-eight days, with the scale's gaps." now={Date.UTC(2026, 10, 10, 12)} series={[
          { id: "w", name: "Weight", values: w.values, reasons: w.reasons },
          { id: "a", name: "Morning", values: w.values.map((v) => (v == null ? null : v + 0.6)), reasons: w.reasons },
          { id: "b", name: "Evening", values: w.values.map((v) => (v == null ? null : v + 1.1)), reasons: w.reasons },
          { id: "c", name: "Week average", values: w.values.map((v) => (v == null ? null : v - 0.4)), reasons: w.reasons },
        ]} />
      ) : null}
      <TimeChart title="Weight" kind="line" headline={state === "headline"} days={w.days} series={[{ id: "w", name: "Weight", values: w.values, reasons: w.reasons }]} unit="lb" format={lb} summary="Weight trended down over twenty-eight days, with a gap while the scale was away." now={Date.UTC(2026, 10, 10, 12)} />
    </div>
  );
}

function ComposerPart({ state }: { state: string }) {
  const typing = state === "typing" || state === "narrow";
  return (
    <div style={{ width: state === "narrow" ? 290 : 520, maxWidth: "100%" }}>
      {/* In a card, which says its room, so the first action hangs as the open items' ruling has it (the pixel review's polish). */}
      <Card><CardContent>
        <Composer label="Message" defaultValue="" onSend={() => {}} actions={<><IconButton icon={PlusGlyph} label="Attach" size="sm" edge="start" /><IconButton icon={SearchGlyph} label="Find" size="sm" /></>} status={typing ? (state === "narrow" ? "Ana, Ben, and Cy are typing" : "Ana is typing") : undefined} />
      </CardContent></Card>
      <p style={{ ...note, marginTop: 8 }}>What follows the composer.</p>
    </div>
  );
}

/** The open items' ruling: a drawer, release notes and a composer have no padding of their own and hang into the room of the box they sit in. */
function OpenItemsPart({ state }: { state: string }) {
  const actions = <><IconButton icon={PlusGlyph} label="Attach" size="sm" edge="start" /><IconButton icon={SearchGlyph} label="Find" size="sm" /></>;
  if (state === "drawer") return <div className="basalt-app-main" style={{ maxWidth: "none" }}><Drawer label="Run 4f2a" onBack={() => {}}><div><p style={note}>The record's first half.</p></div><div><p style={note}>Its second half.</p></div></Drawer></div>;
  if (state === "drawer-bare") return <div style={{ marginInline: "calc(-1 * var(--basalt-space-6))" }}><Drawer label="Run 4f2a" onBack={() => {}}><div><p style={note}>A page with no padding: Back stands on the line.</p></div><div /></Drawer></div>;
  if (state === "release") return <div className="basalt-app-main" style={{ maxWidth: "none" }}><ReleaseNotes releases={(harborData as unknown as ReleaseRecord[]).slice(0, 1)} form="notes" product="Harbor" baseHref="https://harbor.example/release-notes" /></div>;
  if (state === "composer-foot") return <div className="basalt-app-foot" style={{ position: "static" }}><Composer label="Message" onSend={() => {}} actions={actions} /></div>;
  return <div style={{ maxWidth: 520 }}><Card><CardContent><Composer label="Message" onSend={() => {}} actions={actions} /></CardContent></Card></div>;
}

function CopyPart({ state }: { state: string }) {
  useClipboard(state !== "refused");
  usePress(state === "rest" ? [] : [".basalt-terminal-copy", ".basalt-code-copy .basalt-button"], 300);
  return (
    <div style={{ ...col, maxWidth: 640 }}>
      <Terminal title="Deploy preview" lines={[{ kind: "command", text: "npm run build" }, { kind: "output", text: "vite building for production" }, { kind: "done", text: "Built in 4.2 s" }]} />
      <CodeBlock title="config.json" language="json" code={'{ "host": "api.example.com", "limit": 42 }'} />
    </div>
  );
}

function CommandPart({ state }: { state: string }) {
  useTyped(".basalt-command-input", state === "rest" ? null : "zzz", 700);
  const list = <CommandList label="Console" groups={GROUPS} />;
  return state === "card" || state === "card-rest" ? (
    <div style={{ maxWidth: 560 }}><Card><CardContent><p style={{ ...note, marginBottom: 12 }}>A list inside a card.</p>{list}<p style={{ ...note, marginTop: 12 }}>What follows inside the card.</p></CardContent></Card><p style={{ ...note, marginTop: 12 }}>What follows the card.</p></div>
  ) : (
    <div style={{ maxWidth: 560 }}>{list}<p style={{ ...note, marginTop: 12 }}>What follows the list on the page.</p></div>
  );
}

const TILE = () => <span style={{ display: "block", width: "100%", height: "100%", borderRadius: 6, background: "var(--basalt-surface-2)" }} />;
function ChipsPart() {
  const [size, setSize] = React.useState<string | null>("m");
  return (
    <div style={{ ...col, maxWidth: 420 }}>
      <OptionChips legend="Size" value={size} onValueChange={setSize} options={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" }]} />
      <SwitchRowGroup aria-label="Sources" defaultValue={["watch"]}>
        <SwitchRow value="watch" tile={TILE()} kind="Wearable">Watch</SwitchRow>
        <SwitchRow value="scale">Scale, no tile</SwitchRow>
      </SwitchRowGroup>
      <MultiSelect label="Status" options={STATUS.slice(0, 3)} defaultValue={["ready"]} />
    </div>
  );
}

function CountPart() {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{[0, 1, 10, 99, 100].map((n) => <Button key={n} count={n}>Cart</Button>)}</div>;
}

function ToastPart({ state }: { state: string }) {
  const toast = useToast();
  React.useEffect(() => {
    toast.show({ title: "Saved", timeout: 0 });
    toast.show({ title: "Draft moved", description: "It is in Archive now.", action: { label: state === "go" ? "Go" : "Undo", onClick: () => {} }, timeout: 0 });
  }, [state, toast]);
  return <p style={note}>Two toasts: a title alone, and one with a line and an action.</p>;
}

function SelectColumnPart() {
  return (
    <div style={{ maxWidth: 420 }}>
      <TableContainer label="Runs">
        <Table columns={[{ width: "var(--basalt-select-column, var(--basalt-size-control-md))" }, { width: 140 }, {}]} minWidth={360} pinned={2}>
          <TableHeader><TableRow><TableHead><Checkbox aria-label="Select all runs" /></TableHead><TableHead onSortChange={() => {}}>Run</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {["run-0142", "run-0141", "run-0140"].map((id, i) => <TableRow key={id} selected={i === 1}><TableCell><Checkbox aria-label={`Select ${id}`} defaultChecked={i === 1} /></TableCell><TableRowHead>{id}</TableRowHead><TableCell>{["Ready", "Building", "Error"][i]}</TableCell></TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

function StatusBarPart({ state }: { state: string }) {
  const go = state === "go" || state.startsWith("touch");
  const focus = state === "focus" || state === "touch-focus";
  return (
    <div style={{ marginInline: "calc(-1 * var(--basalt-space-6))" }}>
      <StatusBar
        start={<Button variant="ghost" size={go ? "xs" : "sm"} data-wt-force={focus ? "focus" : undefined}>{go ? "Go" : "run 4f2a"}</Button>}
        sources={<Button variant="ghost" size="sm">2 sources</Button>}
        end={<Button variant="ghost" size="sm" data-wt-force={focus ? "focus" : undefined}>Theme</Button>}
      />
    </div>
  );
}

function SheetPart() {
  return (
    <Sheet open>
      <SheetContent side="right">
        <SheetHeader closeLabel="Close cart"><SheetTitle>Your cart</SheetTitle></SheetHeader>
        <SheetBody><p style={{ margin: 0 }}>Two lines in the cart.</p></SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function SiteBarPart({ state }: { state: string }) {
  usePress(state === "menu" ? [".basalt-site-menu-trigger"] : []);
  return <SiteHeader brand={<span style={{ fontWeight: 600 }}>Orbit</span>} brandLabel="Orbit home" links={[{ href: "#a", label: "Product", current: true }, { href: "#b", label: "Pricing" }]} action={<Button variant="primary" size="sm">Start</Button>} solid />;
}

function AppHeaderPart({ state }: { state: string }) {
  return <AppHeader title="Runs" solid actions={<><IconButton icon={SearchGlyph} label="Search" /><IconButton icon={SettingsGlyph} label="Settings" edge="end" data-wt-force={state === "focus" ? "focus" : undefined} /></>} />;
}

function CodePart({ state }: { state: string }) {
  return (
    <div style={{ ...col, width: state === "narrow" ? 360 : 640, maxWidth: "100%" }}>
      <CodeBlock title="config.json" language="json" code={'{ "host": "api.example.com" }'} />
      <Terminal title="Deploy" replay lines={[{ kind: "command", text: "npm run build" }, { kind: "done", text: "Built in 4.2 s" }]} />
      <Terminal title="Install" lines={[{ kind: "command", text: "npm ci" }]} />
    </div>
  );
}

function MoreSheetPart() {
  usePress([".basalt-tabbar-more"]);
  return (
    <div style={{ minHeight: 600 }}>
      <TabBar>
        <TabBarItem href="#home" icon={HomeGlyph} current>Home</TabBarItem>
        <TabBarItem href="#runs" icon={SearchGlyph}>Runs</TabBarItem>
        <TabBarMore><NavItem href="#settings" icon={SettingsGlyph}>Settings</NavItem></TabBarMore>
      </TabBar>
    </div>
  );
}

function NotificationsPart() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", minHeight: 520 }}>
      <NotificationCenter open onOpenChange={() => {}} onClearAll={() => {}} onMarkAllRead={() => {}} onViewAll={() => {}} entries={[
        { id: "1", title: "Deploy finished", description: "api, production", time: "2m ago", status: "success" },
        { id: "2", title: "Waiting on you: approve the release", time: "1h ago", status: "warning", unread: true },
      ]} />
    </div>
  );
}

function IconLinksPart() {
  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ width: 280 }}>
        <Card><CardContent><p style={{ margin: "0 0 12px", fontWeight: 600 }}>Ada Byron</p><p style={{ ...note, marginBottom: 12 }}>Writes about engines.</p>
          <SocialLinks iconOnly aria-label="Elsewhere"><SocialLink service="github" href="#g">GitHub</SocialLink><SocialLink service="x" href="#x">X</SocialLink><SocialLink service="linkedin" href="#l">LinkedIn</SocialLink></SocialLinks>
        </CardContent></Card>
      </div>
      <div><p style={{ ...note, marginBottom: 8 }}>A row with nothing round it: nothing hangs.</p><SocialLinks iconOnly aria-label="Elsewhere, bare"><SocialLink service="github" href="#g2">GitHub</SocialLink><SocialLink service="youtube" href="#y">YouTube</SocialLink></SocialLinks></div>
    </div>
  );
}

function MenuPart() {
  return (
    <div style={{ minHeight: 420 }}>
      <Menu open>
        <MenuTrigger render={<Button>Options</Button>} />
        <MenuContent>
          <MenuItem icon={PlusGlyph}>Duplicate</MenuItem>
          <MenuItem>No glyph</MenuItem>
          <MenuCheckboxItem defaultChecked>Show archived</MenuCheckboxItem>
          <MenuItem disabled>Disabled</MenuItem>
          <MenuItem icon={TrashGlyph} danger>Delete</MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

function PagerPart() {
  return <div style={{ maxWidth: 360 }}><Pagination aria-label="Pages" page={2} pageCount={20} onPageChange={() => {}} compact /></div>;
}

function RtlPart() {
  const toast = useToast();
  React.useEffect(() => { toast.show({ title: "נשמר", description: "הטיוטה הועברה.", action: { label: "בטל", onClick: () => {} }, timeout: 0 }); }, [toast]);
  return (
    <div dir="rtl" style={{ ...col, maxWidth: 420 }}>
      <MultiSelect label="מצב" options={STATUS.slice(0, 3)} defaultValue={["ready"]} />
      <OptionChips legend="גודל" defaultValue="m" options={[{ value: "s", label: "קטן" }, { value: "m", label: "בינוני" }]} />
      <CodeBlock title="config.json" code={'{ "a": 1 }'} />
    </div>
  );
}

// ---- the HTML skill: one page of every part the decision touches, composed by the skill (main's skill on main) ----

function SkillFrame({ page }: { page: string }) {
  const theme = useTheme();
  const source = React.useMemo(() => (__SKILL_PAGES__[page] ?? "").replace("__THEME__", theme), [page, theme]);
  const [height, setHeight] = React.useState(900);
  // The frame is this page's own (a srcdoc frame shares its origin), so its height is read from it directly, bounded, and no message is listened for
  // (the code review's finding 8).
  const measure = (frame: HTMLIFrameElement) => {
    window.setTimeout(() => {
      const tall = frame.contentDocument?.documentElement.scrollHeight ?? 0;
      setHeight(Math.min(Math.max(Number.isFinite(tall) ? tall : 0, 640), 4000));
    }, 500);
  };
  return (
    // sink: a page compose.mjs built at review-build time from this round's synthetic body (round69-skill.mjs); the frame runs the page's own script, and only its height is read back
    // oxlint-disable-next-line react/iframe-missing-sandbox -- a page compose.mjs built at review-build time from a synthetic body; the frame runs the page's own script
    <iframe title={`The HTML skill: ${page}`} srcDoc={source} onLoad={(event) => measure(event.currentTarget)} style={{ width: "100%", height, border: 0, display: "block" }} />
  );
}

// ---- the steps ----

const COMMON = [
  "Built by Opus from Fable's decision (DECISIONS 336), revised after Astra's final position; the implementation has not been reviewed. Browser tests did not run (DECISIONS 330).",
  "\"before-\" states (the owner's eye) are main (e396decf): this round built on main and shot by the same tool. Every step's main shots are in the screenshots zip under before/. Everything else is this branch, live.",
];

type Part = (props: { state: string }) => React.ReactNode;
const live = (step: string, Part: Part) => ({ state }: { state: string }) => (isBefore(state) ? <Before step={step} state={beforeOf(state.replace(/@\d+$/, ""))} /> : <Part state={state.replace(/@\d+$/, "")} />);

interface Spec { id: string; name: string; intro: string; decisions: string[]; tryIt?: string[]; states: string[]; widths?: number[]; height?: number; touch?: boolean; part: Part }
const step = (s: Spec, before = false): Step => ({
  id: s.id,
  name: s.name,
  intro: s.intro,
  decisions: [...COMMON, ...s.decisions],
  tryIt: s.tryIt ?? [],
  states: before ? withBefore(s.states) : s.states,
  widths: s.widths ?? [1440, 390],
  scales: [2],
  height: s.height ?? 900,
  touch: s.touch ?? true,
  demo: live(s.id, s.part),
});

/** The owner's eye (section 6), first, in the pixel review's order: each item's state, with main's picture of it beside this branch's. */
const OWNERS: Spec[] = [
  { id: "eye-03-legend", name: "Owner's eye 3: the legend no longer carries a gap's reason", intro: "Was 101: the reason in the readout. On a gap day the date line says the reason (\"Wed, Oct 21 · scale not used\"), as do the summary, the table and the day's description.", decisions: ["Each value reserves every form it can show, \"Not observed\" included, so no key moves on a gap day."], states: ["chart-gap"], part: ({ state }) => <ChartPart state={state === "chart-gap" ? "legend" : state} /> },
  { id: "x-round68-changelog", name: "Round 68's package changelog: Copy link is back on the head's line", intro: "Not on the owner's list (the pixel review's blocking finding 2). PaneLayout's page column now says its room, and the Slate page says its gutter on its main, so each release's Copy link hangs to the head's line, where main's hand-written hang had it.", decisions: ["A drawer's Back directly in a PaneLayout's page column takes the same room."], states: ["default"], part: () => <Slate state="default" /> },
  { id: "eye-13-select", name: "Owner's eye 13: on touch a still table's selection column is 44 wide", intro: "Was foundations' selection pattern: a first column size-control-md wide. The checkbox's whole target is in its own column.", decisions: ["The app gives the column var(--basalt-select-column); this table does."], states: ["default"], part: SelectColumnPart },
  { id: "eye-09-toast", name: "Owner's eye 9: on touch a toast's Dismiss is drawn at 24, with a 44px hit area", intro: "Was the touch rule: a control drawn at 44. A toast is one height on every pointer.", decisions: ["Hit areas are 46 (45.08 pressed); a short action's missing width is on its start side."], states: ["undo@390", "go@390"], part: ToastPart },
  { id: "eye-14-go", name: "Owner's eye 14: on touch a hung control with a short word is as wide as its word", intro: "Was the touch rule: a control is drawn at 44. \"Go\" is drawn 33 wide on the bar's line, with a 46px hit area.", decisions: ["At 800 on touch (a coarse pointer, emulated) the status bar's gutter is 24."], states: ["touch@800", "touch-focus@800"], widths: [800], part: StatusBarPart },
  { id: "eye-01-search", name: "Owner's eye 1: the search dialog ends under its results", intro: "Its top is held where a full result has it; the box ends under what it shows. Was 155, V3: a fixed height.", decisions: ["The field and the count keep their y with nothing found, two results and a full result."], states: ["none", "two", "full"], part: SearchPart },
  { id: "eye-06-command", name: "Owner's eye 6: the command list's panel shrinks to its matches", intro: "Was 103: the panel holds its unfiltered height. On the open page what follows does not move; inside a card the card shrinks with it.", decisions: ["Nothing matching: the panel hugs; the room under it is page, and only on the page."], states: ["rest", "empty", "card"], part: CommandPart },
  { id: "eye-04-composer", name: "Owner's eye 4: the composer holds no status line", intro: "Was 272 (B3): one line tall even when empty. The status is in the actions row, and on a row of its own when it does not fit.", decisions: ["Send stays on the first row; the live region is always mounted."], states: ["empty", "typing", "narrow@390"], part: ComposerPart },
  { id: "eye-05-copy", name: "Owner's eye 5: a copy with a glyph keeps its words", intro: "Was 152, item 6: the words change to \"Copied\". The glyph is the check for 1500ms (the close for a refused write).", decisions: ["Copy and check morph as the icon-only copy does; copy and close crossfade."], states: ["rest", "copied", "refused"], part: CopyPart },
  { id: "eye-02-filter", name: "Owner's eye 2: the filter's head reads label, Clear, count", intro: "Was 103, T1: label, count, Clear.", decisions: ["Clear keeps its x at zero, some and all chosen; the count's spare room is the row's open end."], states: ["default"], part: FilterPart },
  { id: "eye-07-chips", name: "Owner's eye 7: an option chip is 12 and 12; a switch row with no tile is space-3", intro: "Was 154, A4 and A5: 10 and 14; 8 and 12.", decisions: ["The filter chip keeps 8 and 12: its mark is drawn 2.6 inside its seat."], states: ["default"], part: ChipsPart },
  { id: "eye-08-count", name: "Owner's eye 8: a one-figure count is a 24px circle", intro: "Was 154, A12: the pill holds two figures.", decisions: ["The button holds a two-figure seat round the pill, so 0 to 99 never moves it."], states: ["default"], widths: [1440], part: CountPart },
  { id: "eye-11-headline", name: "Not a reversal, for the owner: the chart headline on a day with no reading", intro: "The unit holds still and the dash sits by it, space-2 from the unit; the other way put the dash on the line and moved the unit.", decisions: ["DECISIONS 153's \"the unit never moves\" stands."], states: ["chart-gap"], part: ({ state }) => <ChartPart state={state === "chart-gap" ? "headline" : state} /> },
];

const FIXES: Spec[] = [
  { id: "sheet", name: "The sheet's head (R-4, S2)", intro: "space-5 on both sides; Close hung at the end, its glyph on the line the title starts on.", decisions: ["Close's ring is at +2: 6 of room is left."], states: ["open"], part: SheetPart },
  { id: "site-bar", name: "The site bar's Menu and the open menu's Close (R-6, S8)", intro: "The last displayed ghost control hangs into the bar's end padding, less any side inset.", decisions: ["Under 720 Menu is 44 on a 16px line: it hangs 14 and its ring is inside."], states: ["bar@390", "menu@390"], part: SiteBarPart },
  { id: "app-header", name: "The app header's last ghost icon (R-6)", intro: "An app hangs its own last ghost action with edge=\"end\".", decisions: ["8 at 1440 (ring +2), 14 at 390 (ring inside)."], states: ["focus"], part: AppHeaderPart },
  { id: "status-bar", name: "The status bar's first and last ghost buttons (R-7)", intro: "A ghost first in start and last in end hang by their own padding.", decisions: ["14 or 16 clear, so the ring is at +2."], states: ["focus"], part: StatusBarPart },
  { id: "code", name: "Code block and terminal heads (R-1, R-3, S1, S6, S13)", intro: "Each copy hangs by its own inset; the replay's words are centred; the terminal's hand-written hangs are gone.", decisions: ["A 360px terminal on a mouse hangs its compact copy by 6."], states: ["wide", "narrow"], part: CodePart },
  { id: "more", name: "The More sheet's Close (S4)", intro: "Hung at the head's end, its glyph on the sheet's line.", decisions: ["14 hang, 10 clear: the ring is at +2."], states: ["open@390"], widths: [390], part: MoreSheetPart },
  { id: "notifications", name: "The notification popup's head and foot (S5)", intro: "space-4 on both sides; Mark all as read and View all hung at the end, Clear all at the start.", decisions: ["The in-page list keeps its own padding."], states: ["open"], part: NotificationsPart },
  { id: "checklist", name: "The checklist's foot (S12, M-3)", intro: "The count at its start and Clear at its end, both on the popup's line, space-4 in, Clear hung by its padding.", decisions: ["Clear is 6 inside the popup's inner edge, so its ring is whole."], states: ["checklist"], part: FilterPart },
  { id: "icon-links", name: "Icon links in a card (S9)", intro: "The first mark's glyph on the card's line; a row that ends a card hangs its spare half into the card's padding. A row with nothing round it does not hang.", decisions: ["Two rows keep their full 44 each."], states: ["default"], part: IconLinksPart },
  { id: "menu", name: "The menu's column (M-2)", intro: "Every row keeps the check's and glyph's column when any row has one.", decisions: ["Words start at one x on every row."], states: ["open"], part: MenuPart },
  { id: "pager", name: "The pager's count (R-9)", intro: "Centred between its arrows.", decisions: ["11.9 / 11.9."], states: ["default"], part: PagerPart },
  { id: "rtl", name: "Right to left mirrors (R-11)", intro: "Ten rules named left and right; each is now start and end. The untitled block's copy is at inline-end.", decisions: ["Pixels change only right to left."], states: ["default"], part: RtlPart },
  { id: "open-items", name: "The open items: a drawer, a release and a composer hang into their box's room; a refused icon-only copy shows the close", intro: "Fable's ruling on the four open items: a part with no padding of its own is not a head; its edge control hangs into the room of the box it sits in, where that box says so.", decisions: ["Back takes edge=\"start\" and the Copy link edge=\"end\"; their hand-written margins are gone. The composer says no room; AppShell's foot and a card's content say theirs, and the app hangs its first ghost action. The refused icon-only copy is in eye-05's refused state."], states: ["drawer@390", "drawer-bare@390", "release", "composer-foot", "composer-card"], part: OpenItemsPart },
  { id: "skill", name: "The HTML skill: every part the decision touches", intro: "One page composed by the skill: the sheet, search, code head and terminal, the site bar, a panel head and a page's section head, the notification centre, the checklist, icon links in a card, the toast, the selection table, chips and the menu.", decisions: ["Main's page is main's own skill, composed on main."], states: ["heads", "sheet", "search-none", "search-two", "checklist", "topbar@390", "notifications", "toast@390"], height: 1100, part: ({ state }) => <SkillFrame page={`69-${state}`} /> },
];

export const ROUND_69: Round = {
  id: "69",
  title: "Reserved room across every component",
  summary:
    "DECISIONS 328, 329 and 336: a ghost control at an edge puts what it shows on the head's line and hangs into the room its head declares; a box is as tall as what it shows; " +
    "the side insets follow start and end. Twenty-four fixes, six missed items, ten answered questions, in React and the HTML skill. The owner's-eye items come first; each state has " +
    "a \"before-\" twin drawn from main. Built by Opus; not reviewed; browser tests did not run.",
  steps: [...OWNERS.map((s) => step(s, true)), ...FIXES.map((s) => step(s))],
};
